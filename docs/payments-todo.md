# Payments Implementation TODO

Ordered end-to-end checklist. Do the phases in order — each phase depends on
the one before it. Every task has an ID (T1, T2, …) so tasks can be assigned
("Claude, do T3"). Owner tags: **[Claude]** = code/terminal work Claude can do;
**[You: Stripe]**, **[You: AWS]**, **[You: Supabase]**, **[You: RC]** (RevenueCat),
**[You: ASC]** (App Store Connect) = dashboard work only you can do.

Background reading: `docs/payments-flow.md` (what talks to what and why).

---

## Phase 0 — Code readiness

- [x] **T1 [Claude]** Payment code written: `payments-checkout`,
      `webhook-stripe`, `webhook-revenuecat` Lambdas, frontend purchase flow
      (commit `dfc9106`).
- [x] **T2 [Claude]** `payments-checkout` switched from service role key to
      anon key (least privilege). _Done in working tree — needs commit._
- [x] **T3 [Claude]** Commit the working-tree changes (anon-key switch, README,
      docs) to `feat/payments-architecture` and open/update the PR to `main`.
      _PR #33._
- [x] **T4 [Claude]** Build the three Lambda deploy zips: in each
      `backend/lambdas/<fn>/` folder, `npm install` its deps
      (`stripe` + `@supabase/supabase-js` for the two Stripe ones,
      `@supabase/supabase-js` only for `webhook-revenuecat`), then zip
      `index.mjs` + `node_modules/` + `package.json`. Output one zip per
      function, ready for console upload.
      _Zips at `backend/lambdas/<fn>.zip` (gitignored) — rebuild with
      `npm install --omit=dev && zip -r ../<fn>.zip index.mjs package.json
package-lock.json node_modules` from inside each folder._

## Phase 1 — Supabase (shared by dev and prod — there is only one database)

- [x] **T5 [You: Supabase]** Apply the grant migration: Supabase Dashboard →
      your project → **SQL Editor** → paste the full contents of
      `backend/Supabase/migrations/202607050001_purchase_credit_grant.sql` →
      **Run**. Expect "Success. No rows returned".
- [x] **T6 [You: Supabase]** Verify it took: in SQL Editor run
      `select proname from pg_proc where proname = 'grant_purchased_credits';`
      → should return one row.
- [x] **T7 [You: Supabase]** Collect three values for later (Project Settings →
      **API**): the **Project URL** (`https://<ref>.supabase.co`), the
      **anon/publishable key**, and the **service_role key**. Keep the
      service_role one out of any file that gets committed.

## Phase 2 — Stripe, test mode

- [x] **T8 [You: Stripe]** Make sure the dashboard is in the **test**
      environment: either the "Test mode" toggle (top-right) is ON, or you're
      inside a Sandbox. Your visible secret key must start with `sk_test_`.
- [x] **T9 [You: Stripe]** Copy the test **Secret key**: **Developers → API
      keys → Secret key → Reveal**. (One key — you do not create any.)
- [x] **T10 [You: Stripe]** Create the three products (**Product catalog → + Add product**), each with a **One-off** price in USD: - "50 Credits" — $4.99 - "200 Credits" — $14.99 - "600 Credits" — $34.99
      Names are cosmetic; do NOT try to enter `credits_50` anywhere.
- [x] **T11 [You: Stripe]** For each product, open it and copy the generated
      **Price ID** (`price_...` — the API ID next to the price, not the
      `prod_...` one). Note which is which: 50 / 200 / 600.
- [x] **T12 [You: Stripe]** Create the webhook endpoint: **Developers →
      Webhooks → + Add endpoint** → URL `https://api.boxbuddy.io/webhooks/stripe`
      → "Select events" → tick exactly `checkout.session.completed` and
      `checkout.session.async_payment_succeeded` → Add endpoint. Then click the
      endpoint and **Reveal** the **Signing secret** (`whsec_...`) — copy it.

## Phase 3 — AWS: deploy Lambdas + routes (with test-mode values)

- [x] **T13 [You: AWS]** Create/update Lambda `payments-checkout`: Lambda
      console → Create function (or open existing stub) → Node.js 20.x →
      upload the T4 zip. Handler `index.handler`.
- [x] **T14 [You: AWS]** Set `payments-checkout` env vars (Configuration →
      Environment variables): - `STRIPE_SECRET_KEY` = `sk_test_...` (T9) - `STRIPE_PRICE_CREDITS_50` / `_200` / `_600` = the three `price_...` (T11) - `SUPABASE_URL` = project URL (T7) - `SUPABASE_ANON_KEY` = anon key (T7) - `WEB_APP_URL` = `https://boxbuddy.io`
      If the old stub had `SUPABASE_SERVICE_ROLE_KEY` set, **delete it** —
      the function no longer uses it and it shouldn't hold it.
- [x] **T15 [You: AWS]** Create Lambda `webhook-stripe` (Node.js 20.x, T4 zip)
      with env vars: - `STRIPE_SECRET_KEY` = `sk_test_...` (T9) - `STRIPE_WEBHOOK_SECRET` = `whsec_...` (T12) - `SUPABASE_URL` (T7) - `SUPABASE_SERVICE_ROLE_KEY` (T7)
- [x] **T16 [You: AWS]** Create Lambda `webhook-revenuecat` (Node.js 20.x, T4
      zip). Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (T7), and
      `REVENUECAT_WEBHOOK_AUTH_TOKEN` = invent a long random string now, in the
      form `Bearer <40+ random chars>` (e.g. from `openssl rand -hex 32`).
      Save that exact string — RevenueCat gets it in T27.
- [x] **T17 [You: AWS]** API Gateway (the API serving `api.boxbuddy.io`) →
      **Routes**: confirm `POST /payments/checkout` exists and integrates with
      the `payments-checkout` Lambda; **create** `POST /webhooks/stripe` →
      `webhook-stripe` and `POST /webhooks/revenuecat` → `webhook-revenuecat`.
      On both webhook routes: **no authorizer** (the Lambdas do their own
      auth) and **no body-transforming mapping template** — the Stripe
      signature check needs the raw body byte-for-byte.
- [x] **T18 [You: AWS]** Deploy/publish the API stage if your API type
      requires it (REST APIs need an explicit "Deploy API"; HTTP APIs with
      auto-deploy don't).

## Phase 4 — End-to-end web test (still test mode)

- [ ] **T19 [Claude/You]** Deploy the current frontend build (with the credit
      store UI from `dfc9106`) to boxbuddy.io if it isn't live yet.
- [ ] **T20 [You]** In the live web app, log in as yourself → buy the $4.99
      pack → on the Stripe page pay with card `4242 4242 4242 4242`, any
      future expiry, any CVC, any name/zip.
- [ ] **T21 [You]** Confirm: redirected to the purchase-success page, and your
      credit balance goes up within a few seconds.
- [ ] **T22 [You: Stripe/AWS]** If credits didn't appear, debug in this order
      (details in `docs/payments-flow.md` § Debugging): 1. Stripe → Developers → Webhooks → the endpoint → recent deliveries
      (was it sent? what HTTP status came back?) 2. CloudWatch → `/aws/lambda/webhook-stripe` logs 3. Supabase → Table Editor → `credit_transactions`
- [ ] **T23 [You]** Buy a second pack and confirm the ledger shows two separate
      `purchase` rows in `credit_transactions` (idempotency sanity check: two
      purchases = two rows, not one).

## Phase 5 — iOS (RevenueCat + App Store Connect, sandbox)

Can run in parallel with Phases 2–4; blocks on Apple review times, so start
the ASC items early.

- [ ] **T24 [You: ASC]** Prerequisite: **Paid Apps agreement** signed and
      banking/tax complete in App Store Connect (Business section). Sandbox
      products won't load without it.
- [ ] **T25 [You: ASC]** Create 3 **Consumable** in-app purchases on the app,
      with Product IDs exactly `credits_50`, `credits_200`, `credits_600`
      (character-for-character — these are requested by id from the app).
      Prices $4.99 / $14.99 / $34.99. Fill in display name + review screenshot
      until each shows "Ready to Submit".
- [ ] **T26 [You: RC]** RevenueCat: create project + iOS app (bundle id must
      match Xcode). Add the 3 products by the same ids. Copy the **public
      Apple API key** (`appl_...`) from Project settings → API keys.
- [ ] **T27 [You: RC]** RevenueCat → Project settings → **Webhooks**: URL
      `https://api.boxbuddy.io/webhooks/revenuecat`, Authorization header =
      the exact string from T16.
- [ ] **T28 [Claude]** Add `REVENUECAT_APPLE_API_KEY=appl_...` to `.env.local`
      and confirm it's wired through the Quasar build config; rebuild the iOS
      app (`quasar build` + Capacitor sync).
- [ ] **T29 [You: ASC]** Create a **Sandbox tester** account (Users and Access
      → Sandbox) and sign into it on a **real device** (Settings → App Store →
      Sandbox Account). Simulator IAP is unreliable.
- [ ] **T30 [You]** On the device: buy a pack in the app → Apple sandbox
      payment sheet → confirm credits arrive (webhook path: RevenueCat →
      `webhook-revenuecat` → same debugging order as T22, but RevenueCat →
      Events for delivery status).

## Phase 6 — Production go-live (web / Stripe)

- [ ] **T31 [You: Stripe]** Activate the account for live payments (Stripe
      prompts for business details + bank account). **Start this early — it's
      the only step with a waiting period.**
- [ ] **T32 [You: Stripe]** Switch the dashboard to **live mode** and repeat
      T10–T12 there: same 3 products → 3 new live `price_...` ids; same
      webhook endpoint URL + events → new live `whsec_...`. Copy the live
      **Secret key** (`sk_live_...`).
- [ ] **T33 [You: AWS]** Swap exactly five env values (no code changes): - `payments-checkout`: `STRIPE_SECRET_KEY` → `sk_live_...`, three
      `STRIPE_PRICE_CREDITS_*` → live price ids - `webhook-stripe`: `STRIPE_SECRET_KEY` → `sk_live_...`,
      `STRIPE_WEBHOOK_SECRET` → live `whsec_...`
- [ ] **T34 [You]** Make one real purchase of the $4.99 pack with a real card.
      Confirm credits land and the payment shows in Stripe (live) → Payments.
      (Refund it to yourself from the Stripe dashboard if you like — the
      credits stay granted, which is fine for your own account.)

## Phase 7 — Production iOS

- [ ] **T35 [You: ASC]** Submit the IAPs with the next app version for App
      Review (first-time IAPs must ride along with an app binary review).
- [ ] **T36 [You]** After approval: install the App Store build, make one real
      purchase, confirm credits arrive. RevenueCat needs no test→live swap —
      the same keys/webhook serve sandbox and production.

---

**Current status:** Phase 0 complete. Next up: T5–T7 (Supabase), then Stripe
test mode. Nothing in Phases 1–3 is believed deployed yet — check off anything
already done as you find it.
