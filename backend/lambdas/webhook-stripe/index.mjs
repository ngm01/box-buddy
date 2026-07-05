// POST /webhooks/stripe — grants credits after Stripe confirms payment.
// The client never grants credits; this webhook is the only web-purchase
// grant path, and it is idempotent via grant_purchased_credits().
//
// Env vars:
//   STRIPE_SECRET_KEY          sk_...
//   STRIPE_WEBHOOK_SECRET      whsec_... (from the Stripe webhook endpoint config)
//   SUPABASE_URL               https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  service role key (required to call the grant RPC)
//
// IMPORTANT: signature verification needs the RAW request body. The API
// Gateway integration must pass the body through unparsed (handled below via
// isBase64Encoded); do not attach any body-transforming mapping template.

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const HANDLED_EVENTS = ['checkout.session.completed', 'checkout.session.async_payment_succeeded']

const response = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const handler = async (event) => {
  const signature = event.headers?.['stripe-signature'] || event.headers?.['Stripe-Signature']
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body

  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe signature verification failed:', err.message)
    return response(400, { error: 'Invalid signature' })
  }

  if (!HANDLED_EVENTS.includes(stripeEvent.type)) {
    return response(200, { ignored: true })
  }

  const session = stripeEvent.data.object
  if (session.payment_status !== 'paid') {
    // completed event for a delayed payment method — the
    // async_payment_succeeded event will grant later.
    return response(200, { ignored: true, reason: 'not paid yet' })
  }

  const userId = session.metadata?.user_id
  const credits = Number(session.metadata?.credits)
  if (!userId || !Number.isFinite(credits) || credits <= 0) {
    // Malformed metadata will never succeed on retry — acknowledge and log.
    console.error('Missing or invalid metadata on session:', session.id, session.metadata)
    return response(200, { ignored: true, reason: 'bad metadata' })
  }

  const referenceId = `stripe:${session.payment_intent || session.id}`

  try {
    const { data, error } = await supabaseAdmin.rpc('grant_purchased_credits', {
      p_user_id: userId,
      p_credits: credits,
      p_reference_id: referenceId,
      p_metadata: {
        product_id: session.metadata?.product_id,
        platform: 'web',
        amount_total: session.amount_total,
        currency: session.currency,
      },
    })
    if (error) throw error

    const result = Array.isArray(data) ? data[0] : data
    console.log('Grant result:', referenceId, JSON.stringify(result))
    // granted=false means a duplicate delivery we already processed — still 200.
    return response(200, { granted: result?.granted ?? false })
  } catch (err) {
    console.error('Credit grant failed:', referenceId, err)
    // 5xx so Stripe retries with backoff.
    return response(500, { error: 'Credit grant failed' })
  }
}
