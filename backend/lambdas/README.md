# Payment Lambdas (manual AWS deploy)

Deliverable source for the `api.boxbuddy.io` payment routes. Like the SQL in
`../Supabase/migrations/`, these are deployed **manually** (AWS Console), not
by CI. Each function is standalone — the small credit-grant RPC call is
inlined in both webhooks rather than shared, so each `index.mjs` can be
pasted/zipped into its Lambda without extra files.

## Functions & routes

| Directory            | API Gateway route          | Purpose                                             |
| -------------------- | -------------------------- | --------------------------------------------------- |
| `payments-checkout/` | `POST /payments/checkout`  | Replaces the stub — creates Stripe Checkout Session |
| `webhook-stripe/`    | `POST /webhooks/stripe`    | **New route** — grants credits on paid checkout     |
| `webhook-revenuecat/`| `POST /webhooks/revenuecat`| **New route** — grants credits on native IAP        |

Runtime: Node.js 20.x. Dependencies per function (install & zip, or use a layer):

- `payments-checkout`: `stripe`, `@supabase/supabase-js`
- `webhook-stripe`: `stripe`, `@supabase/supabase-js`
- `webhook-revenuecat`: `@supabase/supabase-js`

## Prerequisite

Apply `../Supabase/migrations/202607050001_purchase_credit_grant.sql` in the
Supabase SQL Editor **before** deploying the webhooks — they call
`grant_purchased_credits()` (service-role only). Deploy the webhooks before
any end-to-end purchase test, or purchases will "succeed" with no credits
appearing.

## Env vars

Each `index.mjs` header lists its exact env vars. Summary:

- All three: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (never expose this key to the frontend)
- `payments-checkout`: `STRIPE_SECRET_KEY`, `WEB_APP_URL`, `STRIPE_PRICE_CREDITS_50/200/600`
- `webhook-stripe`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `webhook-revenuecat`: `REVENUECAT_WEBHOOK_AUTH_TOKEN`

## Gotchas

- **Stripe signature verification requires the raw request body.** The
  handlers decode `isBase64Encoded` payloads; do not add any API Gateway
  mapping template that parses/re-serializes the body.
- Webhooks return **200 for anything that will never succeed on retry**
  (unknown event type, bad metadata, unknown product, anonymous RevenueCat
  user) and **5xx only for real failures** (DB errors), so the stores retry
  exactly when retrying helps.
- Product ids (`credits_50`, `credits_200`, `credits_600`) must stay in sync
  across `src/constants/credits.js`, App Store Connect, RevenueCat, the
  Stripe Prices, and the maps in these handlers.

## Dashboard setup checklist (human-only)

**Stripe** (test mode first): 3 one-time Products/Prices at $4.99 / $14.99 /
$34.99 → price ids into `payments-checkout` env; webhook endpoint
`https://api.boxbuddy.io/webhooks/stripe` subscribed to
`checkout.session.completed` + `checkout.session.async_payment_succeeded` →
signing secret into `webhook-stripe` env.

**RevenueCat**: project + Apple app config; add the 3 products; public Apple
API key → frontend `.env.local` as `REVENUECAT_APPLE_API_KEY`; webhook URL
`https://api.boxbuddy.io/webhooks/revenuecat` with an Authorization header
value (e.g. `Bearer <long random string>`) → `webhook-revenuecat` env as
`REVENUECAT_WEBHOOK_AUTH_TOKEN` (exact string match).

**App Store Connect**: Paid Apps agreement + banking/tax complete (sandbox
products won't load otherwise); 3 **Consumable** IAPs with ids exactly
matching the product ids above, to "Ready to Submit"; sandbox tester signed
in on a real device (simulator IAP is unreliable).
