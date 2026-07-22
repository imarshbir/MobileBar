// supabase/functions/razorpay-webhook/index.ts
//
// Public endpoint that Razorpay calls directly (not the customer's
// browser) — this is the safety net for when verify-razorpay-payment
// never fires, e.g. the customer closes the tab the instant payment
// succeeds, before their browser's success callback completes.
//
// finalize_paid_order() is idempotent (see schema.sql), so it's safe
// for this to run even when verify-razorpay-payment already handled
// the same payment — the second call just returns already_finalized.
//
// Deploy WITHOUT JWT verification — Razorpay's servers call this
// directly and carry no Supabase session:
//   supabase functions deploy razorpay-webhook --no-verify-jwt
//
// Requires: RAZORPAY_KEY_SECRET (payment signature secret, reused),
// RAZORPAY_WEBHOOK_SECRET (a SEPARATE secret you set when configuring
// the webhook in the Razorpay dashboard — see README).

import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!;

    if (!signature) {
      return new Response('Missing signature', { status: 400 });
    }

    // Webhook payloads are signed with a DIFFERENT secret than
    // individual payments — this is Razorpay's own webhook signing key,
    // configured separately in their dashboard. Verifying against the
    // raw request body (not a re-serialized JSON.stringify of it) is
    // required — any re-encoding could change whitespace/key order and
    // make a genuine webhook fail verification.
    const expected = await hmacSha256Hex(webhookSecret, rawBody);
    if (expected !== signature) {
      console.error('Webhook signature mismatch');
      return new Response('Invalid signature', { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    // Only payment.captured actually means money has landed — other
    // events (order.paid, payment.authorized, etc.) either fire before
    // capture or are redundant with this one; acknowledging them
    // without action avoids Razorpay retrying a webhook we don't need.
    if (event !== 'payment.captured') {
      return new Response('ok', { status: 200 });
    }

    const payment = payload.payload?.payment?.entity;
    const razorpayOrderId = payment?.order_id;
    const razorpayPaymentId = payment?.id;
    if (!razorpayOrderId || !razorpayPaymentId) {
      return new Response('Malformed payload', { status: 400 });
    }

    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { error } = await serviceClient.rpc('finalize_paid_order', {
      p_razorpay_order_id: razorpayOrderId,
      p_razorpay_payment_id: razorpayPaymentId,
    });

    if (error) {
      const outOfStock = /Out of stock/i.test(error.message);
      if (outOfStock) {
        const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;
        await refundPayment(razorpayPaymentId, keySecret);
        await serviceClient.from('payment_intents').update({ status: 'refunded' }).eq('razorpay_order_id', razorpayOrderId);
      } else {
        console.error('Webhook finalize_paid_order failed:', error);
      }
    }

    // Always 200 once we've processed (or safely no-op'd) the event —
    // Razorpay retries on non-2xx responses, and we don't want retries
    // for an event we've already handled or correctly rejected.
    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('razorpay-webhook error:', err);
    // Non-2xx here is intentional — a genuinely unexpected error should
    // cause Razorpay to retry this webhook rather than silently drop it.
    return new Response('error', { status: 500 });
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
    console.error('REFUND FAILED for payment', paymentId, await res.text());
  }
}
