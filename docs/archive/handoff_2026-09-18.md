# Session handoff — 2026-09-13 → 2026-09-18

What changed, what's live, and what to pick up next. Written at the end of the
session that stood up `dev.boxbuddy.io`, fixed the Stripe purchase flow, and
built the coming-soon page.

Companion docs: `docs/deploy-dev-environment.md` (what's deployed),
`docs/payments-todo.md` (the payments checklist), `TASKS.md` (MVP backlog).

---

## 1. Dev environment — live

`https://dev.boxbuddy.io` is up, password-gated, and auto-deploys on every push
to `dev`.

| Thing            | Value                                                     |
| ---------------- | --------------------------------------------------------- |
| Amplify app      | `box-buddy`, id `d2lqfcpdgpc70u`, **us-east-2**            |
| Branch           | `dev` (auto-build)                                        |
| Access           | Basic auth on the branch — 401 without credentials         |
| Apex             | **Still unpointed**, deliberately                          |
| Build spec       | `amplify.yml`, committed at the repo root                  |

**The one non-obvious thing:** Quasar does not read shell/CI environment
variables into the bundle. `@quasar/app-vite` v2 only reads `.env*` files on
disk, so `amplify.yml` writes Amplify's env vars into `.env.local` during
`preBuild`. Miss that and the build succeeds but the app dies on
`supabaseUrl is required` — which is exactly what happened mid-session.

Env vars: `SUPABASE_URL`, `SUPABASE_KEY`, `API_BASE` on the app;
`WEB_BASE_URL=https://dev.boxbuddy.io` on the **branch**, so dev QR codes encode
the dev origin.

### Branch hygiene

`dev` was cut from `main` (after an initial mistake of cutting it from a
feature branch). `main` is the production line; feature branches merge to `main`
via PR, then `main` merges into `dev`. PR #33 (`feat/payments-architecture`)
was merged along the way.

---

## 2. Payments — Stripe works end to end in test mode

A sandbox card purchase on dev now redirects to the success page and credits
land in the balance. Two real bugs were behind the failures:

**`POST /payments/checkout` pointed at the wrong Lambda.** Two functions
existed: `payments-checkout` (a 295-byte `'Hello from Lambda!'` stub) and
`boxBuddyPaymentsCheckout` (the real 3.8MB build, all 7 env vars set since
July). The route was wired to the stub, which returned HTTP 200 with no `url`
field — surfacing as `Checkout response missing redirect URL`. Repointing the
route to the real function fixed it.

> The deployed function names differ from the docs throughout. `payments-checkout`
> → **`boxBuddyPaymentsCheckout`**, `webhook-stripe` → **`webhookStripe`**.
> `docs/payments-todo.md` now records this; trust it over any older doc.

**The real Lambda then timed out.** CloudWatch showed `Status: timeout` at
3000ms with 117MB of 128MB used — a cold start plus two network round-trips
can't finish in 3s, and Lambda CPU scales with memory, so the low memory was
part of the slowness rather than just a ceiling. Raising timeout and memory
fixed it, surfacing until then as `Failed to start checkout: 500`.

**The Stripe webhook URL in the docs was wrong.** `POST /webhooks/stripe` exists
as a route but has **no integration** and returns 404. The working route is
`POST /payments/webhook` → `webhookStripe`. Had the Stripe dashboard pointed at
the documented URL, purchases would have succeeded while credits silently never
arrived.

Also done: `https://dev.boxbuddy.io` added to the API's CORS origins, and
`PATCH`/`DELETE` added to its allowed methods — `boxes.store.js` uses both for
edit and delete, so those were broken in the browser everywhere, localhost
included.

---

## 3. Docs — refreshed and archived

`TASKS.md` was re-verified item by item against the source rather than trusting
its ticks. Four items were already done; three were confirmed still open.

Seven finished or superseded planning docs moved to `docs/archive/`, with a
README flagging them as historical — their checkboxes were never maintained, so
unticked items in there are shipped work, not a backlog. The two genuinely open
items from `TASKS_refactor_add_items.md` were carried into `TASKS.md`.

One correction worth keeping: **the missing `/billing/*` routes are not a bug.**
`docs/archive/TASKS_payments_plan.md` records the decision — credit packs only,
subscriptions stay stubbed. The live consequence is that the paywall's upgrade
button and the billing portal 404, so either hide those entry points for MVP or
accept dead buttons.

---

## 4. Coming-soon page — built, **not deployed** (PR #34)

Implements the Design export as a static page for the apex. Open at
<https://github.com/ngm01/box-buddy/pull/34>, branch `feat/coming-soon-landing`.

It lives in `landing/` as plain HTML/CSS with no build step, deployed as its
**own small Amplify app**, so the apex never serves the SPA and the fonts never
reach app users. The design file embedded ~1.9MB of fonts; only the four faces
the page uses, basic-latin subset, are included — 166KB, self-hosted.

The email capture writes to a new `waitlist` table
(`backend/Supabase/migrations/202609160001_waitlist.sql`). anon gets `INSERT`
and there is **no `SELECT` policy**, so the list can't be read back with the
publishable key — export it in the SQL editor. A repeat signup returns 23505
and the page reports success rather than confirming whether an address is on
the list. No rate limiting; add Turnstile if it gets abused.

Copy changed from the design, both agreed in session: the stale
`Coming June 2026` badge became `Coming soon`, and the footer dropped the
unlinked Twitter and `hi@boxbuddy.app` (wrong TLD, and `boxbuddy.io` has no MX
records so mail would bounce).

**Nobody has looked at this in a browser yet.** No browser tools were available
in-session; structure, HTML validity and the build-time key substitution are
verified, the visual result is not. Preview locally:

```bash
cd landing && python3 -m http.server 8777 --bind 127.0.0.1
# then open http://127.0.0.1:8777/preview.html
```

---

## 5. Next steps

### Immediate

1. **Eyeball the landing page** (above), then merge PR #34.
2. **Deploy it** — the five steps are in the PR description. The one that bites:
   paste `landing/amplify.yml` into the new app's Build settings. Amplify reads
   `amplify.yml` from the repo **root**, and the root one builds the SPA, so
   without the override the new app would deploy the whole app to your apex.
3. **Apply the waitlist migration** in the Supabase SQL editor.
4. **Push `dev`** — it is 2 doc commits ahead of origin.

### Short-term

5. **T23** — buy a second credit pack, confirm two distinct `purchase` rows in
   `credit_transactions`. Closes Phase 4.
6. **T31 — Stripe account activation.** The only step with a waiting period, so
   worth starting even though the apex isn't live.
7. **Delete the 29 stale remote branches.** All verified merged into `main` (or,
   for `feat/credit-pill`, adding nothing to it). The local copies are gone; the
   remote ones need:

   ```bash
   git push origin --delete codex-dev feat/batch-identify feat/credit-pill \
     feat/credit-store feat/out-of-credits feat/payments-architecture \
     fix/box-detail-incomplete-try fix/box-list-subscription-destructure \
     fix/credit-store-supabase-direct-2 fix/signup-page-variables \
     fix/store-missing-params-imports \
     $(git ls-remote --heads origin 'codex/*' | sed 's#.*refs/heads/##')
   ```

### Before go-live

8. **`ALLOWED_PROD_BASE_URLS` is stale on `main`.** `src/config/app.config.js`
   on `main` still lists `https://test.boxbuddy.io`; the `dev.boxbuddy.io` fix
   exists only on `dev`. Reconcile before the apex serves the app, or production
   QR codes fall back to canonical silently.
9. **QR codes on the apex.** Once the coming-soon page is live, QR codes
   pointing at `boxbuddy.io/boxes/...` land on it rather than 404ing into
   nothing. Neither is useful — don't print labels until the app owns the apex.
10. **`WEB_APP_URL` on `boxBuddyPaymentsCheckout`** currently points at
    `dev.boxbuddy.io`. Reset it at go-live, or better, switch the Lambda to an
    origin allowlist so both domains work without env-var juggling.

### Blocked on wiring (iOS)

11. **`POST /webhooks/revenuecat` has no integration** and `webhook-revenuecat`
    has no invoke permission. Wire it via the console (which adds the permission
    automatically) before T27/T30.

### Cleanup

12. Delete the orphaned `payments-checkout` stub Lambda and the dead
    `POST /webhooks/stripe` route.
13. `TASKS.md` carries the rest: `setUsageCounts()` is never called,
    `PaywallGate` is missing around Add Item, no account settings page,
    `src/pages/TestHomePage.vue` and `src/scraps/` still on disk, stale
    `yarn.lock`.

---

## 6. Notes for whoever picks this up

**AWS sessions expire often.** `aws login` (not Claude Code's `/login`). Every
profile in `~/.aws/config` points at account `792376172274`; `default` is
us-east-2, the others need `--region us-east-2` passed explicitly.

**Several AWS writes were done by hand in the console** because the session's
permission rules blocked them: repointing the API integration, the CORS change,
and the Lambda timeout/memory and env-var edits. If you want those automated
next time, add Bash rules for `aws apigatewayv2 update-integration`,
`aws apigatewayv2 update-api` and `aws lambda update-function-configuration`.
Deleting remote git branches was blocked the same way.

**Don't trust checked boxes in old docs.** T13/T14/T17 were all ticked while the
route pointed at a stub and the real function was never wired. Verify against
AWS before concluding something is deployed.
