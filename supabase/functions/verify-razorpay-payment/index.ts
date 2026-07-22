// supabase/functions/verify-razorpay-payment/index.ts
//
// Called by the customer's browser immediately after Razorpay's
// Checkout.js reports a successful payment. This is the primary path
// that turns a payment into a real order — razorpay-webhook is the
// backup path in case this call never fires (browser closed too soon).
//
// Deploy: supabase functions deploy verify-razorpay-payment
// Requires: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (same as create-razorpay-order)

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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: 'Missing payment details' }, 400);
    }

    // This is the critical anti-tampering check: only Razorpay, who
    // holds the key secret, could have produced a signature that
    // matches this exact order_id + payment_id pair. Without a valid
    // signature, this request could be anyone claiming a payment
    // succeeded when it didn't — the order must never be finalized
    // without this check passing first.
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;
    const expectedSignature = await hmacSha256Hex(keySecret, `${razorpay_order_id}|${razorpay_payment_id}`);
    if (expectedSignature !== razorpay_signature) {
      console.error('Signature mismatch for order', razorpay_order_id);
      return json({ error: 'Payment could not be verified.' }, 400);
    }

    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Ownership check: this payment_intents row must belong to the
    // caller. Without this, a valid signature for someone ELSE's
    // already-paid order could be replayed by a different logged-in
    // user to view/trigger effects tied to that order.
    const { data: intent } = await serviceClient
      .from('payment_intents')
      .select('customer_id')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle();
    if (!intent || intent.customer_id !== user.id) {
      return json({ error: 'Payment does not belong to this account.' }, 403);
    }

    const { data, error } = await serviceClient.rpc('finalize_paid_order', {
      p_razorpay_order_id: razorpay_order_id,
      p_razorpay_payment_id: razorpay_payment_id,
    });

    if (error) {
      const outOfStock = /Out of stock/i.test(error.message);
      if (outOfStock) {
        await refundPayment(razorpay_payment_id, keySecret);
        await serviceClient
          .from('payment_intents')
          .update({ status: 'refunded' })
          .eq('razorpay_order_id', razorpay_order_id);
        return json(
          { error: `${error.message}. Your payment has been refunded and will reflect in 5-7 business days.` },
          409
        );
      }
      console.error('finalize_paid_order failed:', error);
      return json({ error: error.message }, 400);
    }

    const result = data?.[0];
    return json({ success: true, order_group_id: result?.order_group_id, already_finalized: result?.already_finalized });
  } catch (err) {
    console.error('verify-razorpay-payment error:', err);
    return json({ error: 'Unexpected error verifying payment.' }, 500);
  }
});

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function refundPayment(paymentId: string, keySecret: string) {
  const keyId = Deno.env.get('RAZORPAY_KEY_ID')!;
  const basicAuth = btoa(`${keyId}:${keySecret}`);
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ speed: 'optimum' }),
  });
  if (!res.ok) {
    // If the automatic refund call itself fails, this is logged for
    // manual follow-up — a failed refund attempt must never be
    // swallowed silently, since real money is involved.
    console.error('REFUND FAILED for payment', paymentId, await res.text());
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
