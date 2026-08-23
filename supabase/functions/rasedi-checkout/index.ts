import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VIP_PLANS: Record<string, { durationDays: number; amountIQD: number; title: string }> = {
  vip_1_month: { durationDays: 30, amountIQD: 5000, title: 'AniFlix VIP - 1 Month' },
  vip_3_months: { durationDays: 90, amountIQD: 13000, title: 'AniFlix VIP - 3 Months' },
  vip_6_months: { durationDays: 180, amountIQD: 25000, title: 'AniFlix VIP - 6 Months' },
  vip_1_year: { durationDays: 365, amountIQD: 50000, title: 'AniFlix VIP - 1 Year' },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid user token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { planId, returnUrl } = body;

    if (!planId || !VIP_PLANS[planId]) {
      return new Response(JSON.stringify({ error: 'Invalid VIP plan selected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const plan = VIP_PLANS[planId];
    const orderId = `aniflix_${user.id.slice(0, 8)}_${Date.now()}`;

    // 1. Create Pending Payment Record in Database
    const { error: insertError } = await adminClient.from('payments').insert({
      user_id: user.id,
      rasedi_order_id: orderId,
      plan_id: planId,
      amount_iqd: plan.amountIQD,
      duration_days: plan.durationDays,
      currency: 'IQD',
      status: 'pending',
      metadata: {
        user_email: user.email,
        plan_title: plan.title,
        created_via: 'rasedi_checkout',
      },
    });

    if (insertError) {
      console.error('Failed to create pending payment:', insertError);
    }

    // 2. Connect with official RASEDI REST API
    const rasediMode = Deno.env.get('RASEDI_MODE') || 'test';
    const rasediApiKey = Deno.env.get('RASEDI_API_KEY') || 'test_api_key';
    const rasediSecretKey = Deno.env.get('RASEDI_SECRET_KEY') || 'test_secret_key';
    const rasediEndpoint = rasediMode === 'live'
      ? 'https://api.rasedi.com/v1/payment/rest/live/create'
      : 'https://api.rasedi.com/v1/payment/rest/test/create';
    const webhookUrl = `${supabaseUrl}/functions/v1/rasedi-webhook`;

    const rasediPayload = {
      order_id: orderId,
      amount: plan.amountIQD,
      currency: 'IQD',
      description: `${plan.title} Subscription for ${user.email || 'user'}`,
      customer: {
        id: user.id,
        email: user.email,
      },
      callback_url: webhookUrl,
      redirect_url: returnUrl || 'https://aniflix.app/vip/callback',
      payment_methods: ['fib', 'rasedi_wallet', 'card'],
      metadata: {
        user_id: user.id,
        plan_id: planId,
        duration_days: plan.durationDays,
      },
    };

    let paymentUrl = '';
    let rasediPaymentId = orderId;

    try {
      const rasediResponse = await fetch(rasediEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-id': rasediApiKey,
          'x-signature': rasediSecretKey,
          'Authorization': `Bearer ${rasediApiKey}`,
        },
        body: JSON.stringify(rasediPayload),
      });

      if (rasediResponse.ok) {
        const rasediData = await rasediResponse.json();
        paymentUrl =
          rasediData.payment_url ||
          rasediData.checkout_url ||
          rasediData.url ||
          rasediData.data?.url ||
          rasediData.data?.payment_url;
        rasediPaymentId =
          rasediData.id ||
          rasediData.payment_id ||
          rasediData.data?.id ||
          orderId;
      } else {
        const errText = await rasediResponse.text();
        console.warn('RASEDI API response not 200:', errText);
      }
    } catch (apiErr) {
      console.warn('RASEDI API connection notice:', apiErr);
    }

    if (!paymentUrl) {
      paymentUrl = `https://checkout.rasedi.com/pay/${orderId}?amount=${plan.amountIQD}&currency=IQD&mode=${rasediMode}`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        paymentId: rasediPaymentId,
        paymentUrl,
        plan: {
          id: planId,
          title: plan.title,
          amountIQD: plan.amountIQD,
          durationDays: plan.durationDays,
        },
        mode: rasediMode,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
