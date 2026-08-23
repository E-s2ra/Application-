import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-rasedi-signature, x-webhook-secret',
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const rasediWebhookSecret = Deno.env.get('RASEDI_WEBHOOK_SECRET');

    // Optional webhook signature verification
    const receivedSecret = req.headers.get('x-webhook-secret') || req.headers.get('x-rasedi-signature');
    if (rasediWebhookSecret && receivedSecret && receivedSecret !== rasediWebhookSecret) {
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    console.log('Received RASEDI Webhook Payload:', JSON.stringify(payload));

    const orderId = payload.order_id || payload.orderId || payload.data?.order_id;
    const transactionId = payload.transaction_id || payload.transactionId || payload.id || payload.data?.transaction_id;
    const rawStatus = (payload.status || payload.event || payload.data?.status || '').toUpperCase();
    const amount = Number(payload.amount || payload.data?.amount);
    const currency = (payload.currency || payload.data?.currency || 'IQD').toUpperCase();

    // Verify payment status is confirmed by RASEDI
    const isPaid =
      rawStatus === 'PAID' ||
      rawStatus === 'COMPLETED' ||
      rawStatus === 'SUCCESS' ||
      rawStatus === 'PAYMENT.COMPLETED' ||
      rawStatus === 'CHARGE.SUCCESS';

    if (!isPaid) {
      return new Response(JSON.stringify({ message: `Ignoring status: ${rawStatus}` }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Missing order_id in webhook payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch the pending payment from DB to get the user and plan
    const { data: paymentRecord, error: fetchErr } = await adminClient
      .from('payments')
      .select('*')
      .eq('rasedi_order_id', orderId)
      .maybeSingle();

    if (fetchErr || !paymentRecord) {
      return new Response(
        JSON.stringify({ error: `Payment record not found for order ${orderId}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Strict verification of amount and currency
    const expectedPlan = PLAN_RULES[paymentRecord.plan_id];
    if (!expectedPlan) {
      return new Response(JSON.stringify({ error: 'Unknown plan on payment record' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (amount && amount !== expectedPlan.amountIQD) {
      return new Response(JSON.stringify({ error: 'Paid amount does not match plan price' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (currency !== 'IQD') {
      return new Response(JSON.stringify({ error: 'Invalid currency, expected IQD' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Atomically process verified payment and extend VIP
    const { data: rpcResult, error: rpcErr } = await adminClient.rpc(
      'process_verified_rasedi_payment',
      {
        p_user_id: paymentRecord.user_id,
        p_rasedi_order_id: orderId,
        p_rasedi_transaction_id: transactionId || orderId,
        p_plan_id: paymentRecord.plan_id,
        p_amount_iqd: expectedPlan.amountIQD,
        p_duration_days: expectedPlan.durationDays,
        p_metadata: {
          webhook_payload: payload,
          verified_at: new Date().toISOString(),
        },
      }
    );

    if (rpcErr || !rpcResult?.success) {
      console.error('Failed to process verified payment RPC:', rpcErr || rpcResult);
      return new Response(
        JSON.stringify({ error: rpcErr?.message || rpcResult?.error || 'Processing failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'VIP subscription activated successfully.',
        result: rpcResult,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Webhook unhandled error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
