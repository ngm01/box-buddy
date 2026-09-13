# Credit-Pack Payments: How the Pieces Fit Together

A map of every service involved in selling credit packs, what each one is
responsible for, and what information moves between them — in order. Companion
to `backend/lambdas/README.md` (which covers deploy mechanics and env vars).

## The one rule that explains everything

**Only the webhooks grant credits.** The app never grants credits, the
"purchase succeeded" screen never grants credits, and Stripe/Apple never touch
our database. Money is collected by a payment provider (Stripe on web, Apple
via RevenueCat on iOS); the provider then calls one of our webhook Lambdas;
the webhook calls a locked-down Supabase function that adds credits exactly
once. Everything else is plumbing around that.

## Cast of characters

| Service                          | Role                                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| Frontend (Vue/Quasar, web + iOS) | Shows packs, kicks off a purchase, polls the balance afterward                               |
| Stripe                           | Collects money on **web** (hosted checkout page)                                             |
| Apple / App Store                | Collects money on **iOS** (native in-app purchase sheet)                                     |
| RevenueCat                       | Middleman for Apple IAP: talks to StoreKit, then tells our backend about the sale            |
| AWS Lambda (`api.boxbuddy.io`)   | Three functions: start a Stripe checkout; receive Stripe webhook; receive RevenueCat webhook |
| Supabase                         | Auth (who is this user?) + the credits ledger (`user_credits`, `credit_transactions`)        |

## The identifiers, and where each one lives

| Identifier                      | Example                       | Who invents it | Where it must appear                                                                                                                                                                                        |
| ------------------------------- | ----------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pack id (= store product id)    | `credits_50`                  | Us             | `src/constants/credits.js`, `PACKS` map in `payments-checkout`, `PRODUCT_CREDITS` map in `webhook-revenuecat`, App Store Connect IAP ids (**exact match**), RevenueCat products. **Not entered in Stripe.** |
| Stripe Price ID                 | `price_1Px...`                | Stripe         | Lambda env vars `STRIPE_PRICE_CREDITS_50/200/600` only — this env var IS the packId→Stripe mapping                                                                                                          |
| Stripe secret key               | `sk_test_...` / `sk_live_...` | Stripe         | Env on `payments-checkout` and `webhook-stripe`. One key per Stripe environment (test vs live)                                                                                                              |
| Stripe webhook signing secret   | `whsec_...`                   | Stripe         | Env on `webhook-stripe` only. Proves a webhook call really came from Stripe                                                                                                                                 |
| Supabase anon (publishable) key | `eyJ...`                      | Supabase       | Frontend + `payments-checkout` (JWT verification only). Safe to expose                                                                                                                                      |
| Supabase service role key       | `eyJ...`                      | Supabase       | `webhook-stripe` and `webhook-revenuecat` **only**. Bypasses RLS — never in frontend, never on functions that don't need it                                                                                 |
| RevenueCat webhook auth token   | `Bearer <random string>`      | Us             | RevenueCat dashboard webhook config + env on `webhook-revenuecat` (exact string match)                                                                                                                      |
| RevenueCat Apple API key        | `appl_...`                    | RevenueCat     | Frontend `.env.local` as `REVENUECAT_APPLE_API_KEY`                                                                                                                                                         |
| Supabase user id (UUID)         | `9f3c...`                     | Supabase       | The join key everywhere: Stripe session metadata, RevenueCat `app_user_id`, the grant RPC                                                                                                                   |
| Reference id (idempotency)      | `stripe:pi_...` / `rc:...`    | Backend        | Built by the webhooks from the provider transaction id; unique index in `credit_transactions` makes grants once-only                                                                                        |

## Flow 1: Web purchase (Stripe)

```
Browser                Lambda: payments-checkout        Stripe              Lambda: webhook-stripe      Supabase
   │                            │                          │                         │                      │
   │ 1. POST /payments/checkout │                          │                         │                      │
   │    {packId} + user JWT     │                          │                         │                      │
   │ ──────────────────────────▶│ 2. verify JWT (anon key) │                         │                      │
   │                            │ ───────────────────────────────────────────────────────────────────────▶ │
   │                            │ 3. packId → price_... via env var                   │                      │
   │                            │ 4. create Checkout Session                          │                      │
   │                            │    metadata: {user_id, product_id, credits}         │                      │
   │                            │ ────────────────────────▶│                         │                      │
   │ 5. { url } ◀───────────────│                          │                         │                      │
   │ 6. redirect to Stripe ────────────────────────────────▶ user pays               │                      │
   │                            │                          │ 7. webhook: checkout.session.completed         │
   │                            │                          │ ───────────────────────▶│ 8. verify signature  │
   │                            │                          │                         │    (whsec_...)       │
   │                            │                          │                         │ 9. grant_purchased_  │
   │                            │                          │                         │    credits() RPC     │
   │                            │                          │                         │  (service role key)  │
   │                            │                          │                         │ ────────────────────▶│
   │ 10. redirect back to /purchase/success                │                         │                      │
   │ 11. app polls credit balance ────────────────────────────────────────────────────────────────────────▶│
```

Step by step, with the data that moves:

1. User picks a pack. Frontend (`src/services/payments.service.js`,
   `purchaseWithStripe`) POSTs `{ packId: "credits_50" }` to
   `/payments/checkout` with the user's Supabase JWT as a Bearer token.
2. `payments-checkout` verifies the JWT with Supabase Auth (anon key —
   authority comes from the token, not the key) and gets the user's UUID.
3. It looks up `packId` in its `PACKS` map → the `STRIPE_PRICE_CREDITS_50`
   env var → a Stripe `price_...` id.
4. It asks Stripe to create a Checkout Session, attaching
   `metadata: { user_id, product_id, credits }`. **This metadata is how the
   sale gets tied back to a Supabase user** — Stripe just carries it.
5. Stripe returns a hosted checkout URL; the Lambda returns it to the browser.
6. The browser navigates to Stripe's page; the user pays there. Card data
   never touches our code.
7. Stripe fires `checkout.session.completed` at `POST /webhooks/stripe`
   (configured in the Stripe dashboard). This happens server-to-server,
   independent of the user's browser.
8. `webhook-stripe` verifies the `Stripe-Signature` header against
   `STRIPE_WEBHOOK_SECRET` using the **raw** request body. Anyone can POST to
   the URL; only Stripe can sign.
9. It reads `user_id` and `credits` out of the session metadata and calls
   `grant_purchased_credits()` with the service role key, using
   `stripe:<payment_intent_id>` as the idempotency reference. Duplicate
   deliveries are no-ops.
10. Meanwhile Stripe redirects the browser to `/purchase/success` — a purely
    cosmetic page. Credits may land a second or two after it renders.
11. The app re-fetches the balance from Supabase and the new credits appear.

## Flow 2: iOS purchase (RevenueCat + Apple)

```
iOS App                    Apple (StoreKit)         RevenueCat          Lambda: webhook-revenuecat     Supabase
   │                             │                      │                          │                      │
   │ 0. on login: configure RC with appUserID = Supabase user UUID                 │                      │
   │ ─────────────────────────────────────────────────▶│                          │                      │
   │ 1. getProducts(['credits_50'])                     │                          │                      │
   │ ──────────────────────────▶│                       │                          │                      │
   │ 2. purchase sheet, user pays Apple                 │                          │                      │
   │ ──────────────────────────▶│ 3. receipt ──────────▶│                          │                      │
   │                             │                      │ 4. webhook: NON_RENEWING_PURCHASE               │
   │                             │                      │    {app_user_id, product_id, transaction_id}    │
   │                             │                      │ ────────────────────────▶│ 5. check auth token  │
   │                             │                      │                          │ 6. grant RPC         │
   │                             │                      │                          │ (service role key)   │
   │                             │                      │                          │ ────────────────────▶│
   │ 7. app polls credit balance ─────────────────────────────────────────────────────────────────────── ▶│
```

1. On login, `initPayments()` configures the RevenueCat SDK with
   `appUserID = <Supabase user UUID>`. **This is the iOS equivalent of the
   Stripe metadata** — it's how RevenueCat later tells us which account to
   credit. If this step is skipped, purchases arrive with an anonymous id and
   cannot be granted.
2. The app requests the product **by pack id** (`credits_50`) — which is why
   the App Store Connect IAP ids must match our pack ids exactly.
3. The user pays through Apple's native sheet. Apple takes its cut;
   RevenueCat validates the receipt.
4. RevenueCat fires a `NON_RENEWING_PURCHASE` webhook at
   `POST /webhooks/revenuecat` carrying `app_user_id` (the Supabase UUID),
   `product_id` (`credits_50`), and the store `transaction_id`.
5. `webhook-revenuecat` checks the `Authorization` header against
   `REVENUECAT_WEBHOOK_AUTH_TOKEN` (exact match, constant-time compare).
6. It maps `product_id` → credits via its own `PRODUCT_CREDITS` table and
   calls the same `grant_purchased_credits()` RPC, reference
   `rc:<transaction_id>`.
7. The app polls the balance until the credits show up.

## The grant itself (both flows converge here)

`grant_purchased_credits(p_user_id, p_credits, p_reference_id, p_metadata)`
in `backend/Supabase/migrations/202607050001_purchase_credit_grant.sql`:

- **Callable only via the service role key.** EXECUTE is revoked from `anon`
  and `authenticated`, so the frontend (or anyone holding the public anon key)
  can never grant themselves credits.
- **Idempotent.** A unique index on `reference_id` (for `reason = 'purchase'`)
  means a retried/duplicated webhook inserts nothing and returns
  `granted: false`. Both webhooks return 200 in that case so the provider
  stops retrying.
- Inserts a `credit_transactions` row and bumps `user_credits.balance`
  atomically, under a row lock.

## Webhook retry contract

Both webhooks follow the same rule: return **200 for anything a retry can't
fix** (unknown event type, malformed metadata, unknown product, anonymous
user) and **5xx only when retrying helps** (database errors). Stripe and
RevenueCat both retry on 5xx with backoff, so a transient Supabase outage
heals itself.

## Setup order (what to configure, where)

Test mode first — it exercises this entire document with fake cards against
the real production Supabase database (there is no separate "test database";
test purchases grant real credits to your own account, which is the point).

1. Supabase SQL Editor: apply `202607050001_purchase_credit_grant.sql`.
2. Stripe (test mode): create 3 one-time products → copy 3 `price_...` ids.
3. Deploy/configure `payments-checkout`: `sk_test_...`, the 3 price ids,
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `WEB_APP_URL`.
4. Stripe (test mode): add webhook endpoint
   `https://api.boxbuddy.io/webhooks/stripe` subscribed to
   `checkout.session.completed` + `checkout.session.async_payment_succeeded`
   → copy `whsec_...`.
5. Deploy/configure `webhook-stripe`: `sk_test_...`, `whsec_...`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
6. Web test purchase with card `4242 4242 4242 4242` → credits appear.
   (Failures show up in the webhook Lambda's CloudWatch logs.)
7. RevenueCat: project + iOS app + the 3 products; Apple public API key →
   frontend `.env.local`; webhook URL + invented auth token →
   `webhook-revenuecat` env.
8. App Store Connect: 3 **Consumable** IAPs with ids exactly `credits_50`,
   `credits_200`, `credits_600`; sandbox tester on a real device.
9. Go live: activate the Stripe account, recreate products + webhook endpoint
   in live mode, swap `sk_live_...`, 3 new price ids, new `whsec_...`. No
   code or Supabase changes.

## Debugging: where to look when credits don't appear

1. **Stripe dashboard → Events / Webhooks** (or RevenueCat → Events): did the
   provider send the webhook, and what did our endpoint respond?
2. **CloudWatch logs** for `webhook-stripe` / `webhook-revenuecat`: signature
   failures, `bad metadata`, `unknown product`, `non-uuid app_user_id`, or RPC
   errors are all logged explicitly.
3. **Supabase `credit_transactions`**: is there a row with the expected
   `reference_id`? If yes, the grant happened and the problem is frontend
   balance refresh.
