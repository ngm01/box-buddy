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
- [x] **T12 [You: Stripe]** Create the webhook endpoint: **Workbench →
      Webhooks → + Add endpoint** (older dashboards: Developers → Webhooks)
      → URL **`https://api.boxbuddy.io/payments/webhook`**
      → "Select events" → tick exactly `checkout.session.completed` and
      `checkout.session.async_payment_succeeded` → Add endpoint. Then click the
      endpoint and **Reveal** the **Signing secret** (`whsec_...`) — copy it.

      > **Corrected 2026-09-16.** This originally said
      > `/webhooks/stripe`. That route exists in API Gateway but has **no
      > integration** and returns 404 — the working route is
      > `POST /payments/webhook` → `webhookStripe`. Verify the endpoint URL in
      > Stripe matches, or events 404 and no credits are ever granted (T19b).

## Phase 3 — AWS: deploy Lambdas + routes (with test-mode values)

> **Deployed function names differ from this doc.** What actually exists:
>
> | This doc calls it   | Deployed as                 | Notes                                    |
> | ------------------- | --------------------------- | ---------------------------------------- |
> | `payments-checkout` | **`boxBuddyPaymentsCheckout`** | real code + all 7 env vars            |
> | `webhook-stripe`    | **`webhookStripe`**         | wired to `POST /payments/webhook`        |
> | `webhook-revenuecat`| `webhook-revenuecat`        | deployed, **route not integrated yet**   |
>
> A separate 295-byte `payments-checkout` stub also exists and is no longer
> routed anywhere — delete it (see `TASKS.md` cleanup).

- [x] **T13 [You: AWS]** Create/update the checkout Lambda: Lambda
      console → Create function (or open existing stub) → Node.js 20.x →
      upload the T4 zip. Handler `index.handler`.
      _Live as `boxBuddyPaymentsCheckout` (runtime nodejs24.x)._
- [x] **T14 [You: AWS]** Set the checkout Lambda's env vars (Configuration →
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
- [x] **T17 [You: AWS]** API Gateway (`BoxBuddyAPI`, id `en2q8yrcrg`) →
      **Routes**. On any webhook route: **no authorizer** (the Lambdas do their
      own auth) and **no body-transforming mapping template** — the Stripe
      signature check needs the raw body byte-for-byte.

      Actual state as of 2026-09-16:

      | Route                       | Integration              | Status                     |
      | --------------------------- | ------------------------ | -------------------------- |
      | `POST /payments/checkout`   | `boxBuddyPaymentsCheckout` | ✅ repointed 2026-09-15 (was the stub) |
      | `POST /payments/webhook`    | `webhookStripe`          | ✅ working (400 on unsigned) |
      | `POST /webhooks/stripe`     | **none**                 | ❌ 404 — dead route, delete or wire |
      | `POST /webhooks/revenuecat` | **none**                 | ❌ 404 — blocks T27/T30    |

      `webhook-revenuecat` also has **no Lambda invoke permission** for API
      Gateway; wiring the route via the console adds it automatically.
- [x] **T18 [You: AWS]** Deploy/publish the API stage if your API type
      requires it (REST APIs need an explicit "Deploy API"; HTTP APIs with
      auto-deploy don't).

## Phase 4 — End-to-end web test (still test mode)

- [x] **T19 [Claude/You]** Deploy the current frontend build (with the credit
      store UI from `dfc9106`). _Live at `https://dev.boxbuddy.io` (password
      gated) — see `docs/deploy-dev-environment.md`. The apex stays unpointed
      until the coming-soon page ships._
- [x] **T19a [You: AWS]** Raise
      `boxBuddyPaymentsCheckout` limits: Configuration → General configuration
      → **Timeout 15s** (currently 3s) and **Memory 512MB** (currently 128MB).
      CloudWatch shows `Status: timeout` at 3000ms with 117MB of 128MB used —
      Stripe SDK init plus two network round-trips can't finish in 3s, and
      Lambda CPU scales with memory, so the low memory is part of the slowness.
      This is what surfaces as `Failed to start checkout: 500`.
- [x] **T19b [You: Stripe]** Confirm the T12 endpoint URL is
      `https://api.boxbuddy.io/payments/webhook`, its events are the two
      listed, and its signing secret matches `STRIPE_WEBHOOK_SECRET` on
      `webhookStripe`. Check **recent deliveries** on the endpoint: a column of
      404s means the wrong URL, 400s mean a stale signing secret.
- [x] **T19c [You: AWS]** Set `WEB_APP_URL` on `boxBuddyPaymentsCheckout` to
      `https://dev.boxbuddy.io` (currently `https://boxbuddy.io`, which
      resolves nowhere) so the post-payment redirect lands somewhere real.
- [x] **T20 [You]** In the live web app, log in as yourself → buy the $4.99
      pack → on the Stripe page pay with card `4242 4242 4242 4242`, any
      future expiry, any CVC, any name/zip.
- [x] **T21 [You]** Confirm: redirected to the purchase-success page, and your
      credit balance goes up within a few seconds. _Confirmed 2026-09-16 —
      sandbox purchase grants credits._
- [ ] **T22 [You: Stripe/AWS]** If credits didn't appear, debug in this order
      (details in `docs/payments-flow.md` § Debugging): 1. Stripe → Developers → Webhooks → the endpoint → recent deliveries
      (was it sent? what HTTP status came back?) 2. CloudWatch → `/aws/lambda/webhook-stripe` logs 3. Supabase → Table Editor → `credit_transactions`
- [ ] **T23 [You]** Two checks on the ledger (`credit_transactions`), which
      test different things:
      - **Idempotency** — the same event delivered twice grants once. Stripe →
        Webhooks → the endpoint → a delivered `checkout.session.completed`
        event → **Resend**. Expect a 200 with `"granted": false` and still
        exactly one `purchase` row for that `reference_id`.
      - **No false deduplication** — two *different* purchases are not merged.
        Buy a second pack; expect two `purchase` rows with different
        `reference_id`s.

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
      _Wiring verified 2026-10-06: Quasar inlines every `.env.local` key into
      `process.env` (no `quasar.config.js` change needed) — only the key itself
      is missing. `POST /webhooks/revenuecat` still returns 404 as of the same
      date._
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

**Current status (2026-09-16):** **The web purchase flow works end to end in
test mode** — a sandbox card purchase on `dev.boxbuddy.io` redirects to the
success page and credits land in the balance. Phases 0–4 are effectively done;
only **T23** (resend a webhook event and buy a second pack, checking the
ledger after each) is left to close Phase 4.

Next up is a choice between two tracks:

- **Phase 5 (iOS)** — additionally blocked on `POST /webhooks/revenuecat`
  having no integration and `webhook-revenuecat` having no invoke permission
  (see T17). Start T24/T25 early regardless; they wait on Apple.
- **Phase 6 (go-live)** — T31 (Stripe account activation) is the only step
  with a waiting period, so it's worth starting even if the apex isn't ready.
  Note go-live also needs the apex pointed at `main` in Amplify and the
  coming-soon page decision resolved.
