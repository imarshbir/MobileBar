// supabase/functions/create-razorpay-order/index.ts
//
// Called by the logged-in customer's browser when they click "Pay Now".
// Re-validates their cart server-side (never trusts a client-supplied
// amount), asks Razorpay to open a payment session for the exact
// authoritative total, and records a lightweight payment_intents row.
//
// IMPORTANT: this does NOT create an order and does NOT touch stock.
// That only happens once payment is actually confirmed — see
// verify-razorpay-payment and razorpay-webhook.
//
// Deploy: supabase functions deploy create-razorpay-order
// Requires these secrets (supabase secrets set ...):
//   RAZORPAY_KEY_ID
//   RAZORPAY_KEY_SECRET
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are
// injected automatically by Supabase — you don't set those yourself.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    // This client carries the customer's own JWT, so every query it
    // makes runs under their RLS context — it can only ever see their
    // own cart/profile, never anyone else's.
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return json({ error: 'Not authenticated' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const couponCode: string | null = body?.coupon_code?.trim() || null;

    // compute_cart_total() is the same function finalize_paid_order()
    // uses after payment succeeds — quoting the amount from here
    // guarantees it can never drift from what actually gets recorded.
    const { data: totals, error: totalsError } = await userClient.rpc('compute_cart_total', {
      p_customer_id: user.id,
      p_coupon_code: couponCode,
    });
    if (totalsError) {
      return json({ error: totalsError.message }, 400);
    }
    const totalRow = totals?.[0];
    if (!totalRow || Number(totalRow.total) <= 0) {
      return json({ error: 'Your cart is empty' }, 400);
    }

    const amountPaise = Math.round(Number(totalRow.total) * 100);

    const keyId = Deno.env.get('RAZORPAY_KEY_ID')!;
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;
    const basicAuth = btoa(`${keyId}:${keySecret}`);

    const receipt = `mb-${user.id.slice(0, 8)}-${Date.now()}`;
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: { customer_id: user.id, coupon_code: couponCode ?? '' },
      }),
    });

    if (!rzpRes.ok) {
      const errBody = await rzpRes.text();
      console.error('Razorpay order creation failed:', errBody);
      return json({ error: 'Could not start payment. Please try again.' }, 502);
    }

    const rzpOrder = await rzpRes.json();

    // service_role client — bypasses RLS to write the intent row.
    // Customers have no write access to payment_intents themselves;
    // every row is created by this trusted server-side path only.
    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { error: insertError } = await serviceClient.from('payment_intents').insert({
      customer_id: user.id,
      razorpay_order_id: rzpOrder.id,
      amount: totalRow.total,
      coupon_code: couponCode,
      status: 'created',
    });
    if (insertError) {
      console.error('Could not record payment intent:', insertError);
      return json({ error: 'Could not start payment. Please try again.' }, 500);
    }

    return json({
      razorpay_order_id: rzpOrder.id,
      amount: amountPaise,
      currency: 'INR',
      key_id: keyId,
    });
  } catch (err) {
    console.error('create-razorpay-order error:', err);
    return json({ error: 'Unexpected error starting payment.' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
