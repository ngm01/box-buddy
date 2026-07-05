// POST /webhooks/revenuecat — grants credits after a native (iOS/Android)
// in-app purchase. RevenueCat sends one webhook per store event; consumable
// credit packs arrive as NON_RENEWING_PURCHASE. The grant is idempotent via
// grant_purchased_credits(), keyed on the store transaction id.
//
// Env vars:
//   REVENUECAT_WEBHOOK_AUTH_TOKEN  exact Authorization header value configured
//                                  in the RevenueCat dashboard (recommend
//                                  "Bearer <long random string>")
//   SUPABASE_URL                   https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY      service role key (required to call the grant RPC)

import { timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// Product ids must match src/constants/credits.js and the store products.
const PRODUCT_CREDITS = {
  credits_50: 50,
  credits_200: 200,
  credits_600: 600,
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a || ''))
  const bufB = Buffer.from(String(b || ''))
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

const response = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const handler = async (event) => {
  const authHeader = event.headers?.authorization || event.headers?.Authorization
  if (!process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN || !safeEqual(authHeader, process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN)) {
    return response(401, { error: 'Unauthorized' })
  }

  let body
  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body
    body = JSON.parse(rawBody || '{}')
  } catch {
    return response(400, { error: 'Invalid JSON body' })
  }

  const rcEvent = body.event
  // Consumable credit packs only — every other event type is acknowledged
  // and ignored so RevenueCat doesn't retry.
  if (!rcEvent || rcEvent.type !== 'NON_RENEWING_PURCHASE') {
    return response(200, { ignored: true })
  }

  const userId = rcEvent.app_user_id
  if (!UUID_RE.test(userId || '')) {
    // RevenueCat anonymous ids ($RCAnonymousID:...) can't map to a Supabase
    // user. Retrying won't fix it — acknowledge and log for investigation.
    console.error('Non-UUID app_user_id, cannot grant:', userId, rcEvent.id)
    return response(200, { ignored: true, reason: 'non-uuid app_user_id' })
  }

  const credits = PRODUCT_CREDITS[rcEvent.product_id]
  if (!credits) {
    console.error('Unknown product id, cannot grant:', rcEvent.product_id, rcEvent.id)
    return response(200, { ignored: true, reason: 'unknown product' })
  }

  // transaction_id is the store-level id (stable across event redeliveries
  // AND replayed store transactions); event id is the fallback.
  const referenceId = `rc:${rcEvent.transaction_id || rcEvent.id}`

  try {
    const { data, error } = await supabaseAdmin.rpc('grant_purchased_credits', {
      p_user_id: userId,
      p_credits: credits,
      p_reference_id: referenceId,
      p_metadata: {
        product_id: rcEvent.product_id,
        platform: rcEvent.store,
        price: rcEvent.price,
        currency: rcEvent.currency,
      },
    })
    if (error) throw error

    const result = Array.isArray(data) ? data[0] : data
    console.log('Grant result:', referenceId, JSON.stringify(result))
    // granted=false means a duplicate delivery we already processed — still 200.
    return response(200, { granted: result?.granted ?? false })
  } catch (err) {
    console.error('Credit grant failed:', referenceId, err)
    // 5xx so RevenueCat retries with backoff.
    return response(500, { error: 'Credit grant failed' })
  }
}
