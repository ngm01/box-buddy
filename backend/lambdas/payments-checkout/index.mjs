// POST /payments/checkout — replaces the stub.
// Creates a Stripe Checkout Session (hosted redirect) for a credit pack.
// Web only; native platforms purchase through RevenueCat instead.
//
// Env vars:
//   STRIPE_SECRET_KEY          sk_... (test or live)
//   SUPABASE_URL               https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  service role key (JWT verification only here)
//   WEB_APP_URL                e.g. https://boxbuddy.io (success/cancel redirect target)
//   STRIPE_PRICE_CREDITS_50    price_... for the $4.99 pack
//   STRIPE_PRICE_CREDITS_200   price_... for the $14.99 pack
//   STRIPE_PRICE_CREDITS_600   price_... for the $34.99 pack

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// Pack ids must match src/constants/credits.js and the store product ids.
const PACKS = {
  credits_50: { credits: 50, priceId: process.env.STRIPE_PRICE_CREDITS_50 },
  credits_200: { credits: 200, priceId: process.env.STRIPE_PRICE_CREDITS_200 },
  credits_600: { credits: 600, priceId: process.env.STRIPE_PRICE_CREDITS_600 },
}

const response = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const handler = async (event) => {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return response(401, { error: 'Missing bearer token' })

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) return response(401, { error: 'Invalid token' })
  const userId = data.user.id

  let packId
  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body
    packId = JSON.parse(rawBody || '{}').packId
  } catch {
    return response(400, { error: 'Invalid JSON body' })
  }

  const pack = PACKS[packId]
  if (!pack || !pack.priceId) return response(400, { error: `Unknown pack: ${packId}` })

  const webAppUrl = (process.env.WEB_APP_URL || 'https://boxbuddy.io').replace(/\/$/, '')

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: pack.priceId, quantity: 1 }],
      client_reference_id: userId,
      // Consumed by the Stripe webhook to grant credits — keep in sync there.
      metadata: { user_id: userId, product_id: packId, credits: String(pack.credits) },
      // The web app uses vue-router hash mode, so routes live behind '#'.
      success_url: `${webAppUrl}/#/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${webAppUrl}/#/purchase/cancel`,
    })

    return response(200, { url: session.url })
  } catch (err) {
    console.error('Failed to create checkout session:', err)
    return response(500, { error: 'Failed to create checkout session' })
  }
}
