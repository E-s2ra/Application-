import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PLAN_RULES: Record<string, { durationDays: number; amountIQD: number }> = {
  vip_1_month: { durationDays: 30, amountIQD: 5000 },
  vip_3_months: { durationDays: 90, amountIQD: 13000 },
  vip_6_months: { durationDays: 180, amountIQD: 25000 },
  vip_1_year: { durationDays: 365, amountIQD: 50000 },
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
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
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid user session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Missing orderId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch payment record
    const { data: payment, error: pErr } = await adminClient
      .from('payments')
      .select('*')
      .eq('rasedi_order_id', orderId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (pErr || !payment) {
      return new Response(JSON.stringify({ error: 'Payment record not found for this user' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If already completed in DB, return current status
    if (payment.status === 'completed') {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('is_vip, vip_expires_at')
        .eq('id', user.id)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          status: 'completed',
          isVIP: profile?.is_vip ?? true,
          vipExpiresAt: profile?.vip_expires_at,
          alreadyActivated: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Server-to-server check with RASEDI API
    const rasediApiKey = Deno.env.get('RASEDI_API_KEY') || 'test_api_key';
    const rasediSecretKey = Deno.env.get('RASEDI_SECRET_KEY') || 'test_secret_key';
    const rasediBaseUrl = Deno.env.get('RASEDI_BASE_URL') || 'https://api.rasedi.com/v1';

    let isRasediVerified = false;
    let rasediTxId = orderId;
    let rasediRawStatus = 'PENDING';

    try {
      const checkRes = await fetch(`${rasediBaseUrl}/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${rasediApiKey}`,
          'X-Rasedi-Secret': rasediSecretKey,
        },
      });

      if (checkRes.ok) {
        const orderData = await checkRes.json();
        rasediRawStatus = (orderData.status || orderData.data?.status || '').toUpperCase();
        rasediTxId = orderData.transaction_id || orderData.id || orderId;
        if (
          rasediRawStatus === 'PAID' ||
          rasediRawStatus === 'COMPLETED' ||
          rasediRawStatus === 'SUCCESS'
        ) {
          isRasediVerified = true;
        }
      }
    } catch (checkErr) {
      console.warn('RASEDI server check notice:', checkErr);
    }

    if (!isRasediVerified) {
      return new Response(
        JSON.stringify({
          success: false,
          status: payment.status,
          rasediStatus: rasediRawStatus,
          message: 'Payment has not been confirmed as paid by RASEDI.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Trigger atomic idempotent activation
    const expectedPlan = PLAN_RULES[payment.plan_id];
    const { data: rpcResult, error: rpcErr } = await adminClient.rpc(
      'process_verified_rasedi_payment',
      {
        p_user_id: user.id,
        p_rasedi_order_id: orderId,
        p_rasedi_transaction_id: rasediTxId,
        p_plan_id: payment.plan_id,
        p_amount_iqd: expectedPlan.amountIQD,
        p_duration_days: expectedPlan.durationDays,
        p_metadata: {
          verified_via: 'rasedi_verify_endpoint',
          verified_at: new Date().toISOString(),
        },
      }
    );

    if (rpcErr || !rpcResult?.success) {
      return new Response(
        JSON.stringify({ error: rpcErr?.message || rpcResult?.error || 'Verification processing failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: 'completed',
        isVIP: true,
        vipExpiresAt: rpcResult.vip_expires_at,
        message: 'Payment verified and VIP subscription activated.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
