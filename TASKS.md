# MVP TODO

_Status verified against the code and AWS on 2026-09-16. Items are ticked only
where they were checked in the source, not because a doc claimed them._

## Blockers — can't ship without these

### Credits purchase (web / Stripe)

- [x] Wire Stripe into credits purchase Lambda — real code is deployed as
      `boxBuddyPaymentsCheckout` and `POST /payments/checkout` now routes to it.
- [ ] **Raise the checkout Lambda's timeout and memory** — it currently times
      out at 3s and peaks at 117MB of 128MB, so every purchase returns 500.
      See `docs/payments-todo.md` T19a.
- [ ] Confirm the Stripe webhook endpoint URL is
      `https://api.boxbuddy.io/payments/webhook` (T19b) — the `/webhooks/stripe`
      route the old docs referenced has no integration and returns 404.
- [ ] Run the end-to-end purchase test (`docs/payments-todo.md` T20–T23).

### Subscription plans (separate from credits — not started server-side)

- [ ] `/billing/checkout-session` and `/billing/billing-portal` **do not exist
      as API Gateway routes**. `src/billing/billing.service.js` calls them, so
      the paywall's upgrade button and the billing portal both 404 today.
      Decide whether plan upgrades are in MVP scope at all, given credits are
      the live monetization path.
- [ ] Implement `fetchSubscription()` in `subscription.store.js:80` — still an
      empty async function, so `plan` is always `'free'` and the billing page
      always shows wrong data.
- [ ] Call `setUsageCounts()` after fetching boxes/items — never called, so
      `boxCount`/`itemCountTotal` stay 0 and frontend plan limits are never
      enforced (only the backend 402 saves you). Note
      `src/composables/useSubscription.js:21` is a second no-op stub shadowing
      the real store action.

### Unverified

- [ ] Confirm migration `202606070001_signup_bonus_credits.sql` was applied —
      it grants 20 credits to every new user. Without it new users start at 0
      and can't scan. (`202607050001_purchase_credit_grant.sql` **is** applied.)

---

## Important gaps

- [ ] Add `<PaywallGate feature="items">` around the "Add Item" button in
      `BoxDetailPage` — box creation is gated but item creation isn't; the
      backend enforces via 402 but the UX is inconsistent.
- [ ] Account settings page — no way to change email/password or delete
      account. (`src/pages/settings/` currently holds only
      `BillingSettingsPage.vue`.)

---

## Cleanup

- [ ] Delete `src/pages/TestHomePage.vue` — unused placeholder, still present.
- [ ] Delete `src/scraps/` — leftover Lambda code, still on disk (gitignored).
- [ ] Delete the orphaned `payments-checkout` Lambda in AWS — a 295-byte
      "Hello from Lambda!" stub, no longer routed anywhere. Keep
      `boxBuddyPaymentsCheckout`.
- [ ] Delete the stale `yarn.lock` — the project uses npm, and having both
      confuses CI build-tool detection.

---

## Done since the last pass

- [x] `BoxDetailPage` distinguishes 403 from 404 via the
      `get_box_access_status` RPC; `pageState === 'forbidden'` is now set.
- [x] `BoxDetailPage` passes `:boxName` to `<AddItemDialog>`.
- [x] `LoginPage` no longer logs credentials to the console.
- [x] `BoxListPage` shows skeleton loaders while boxes fetch.
- [x] `dev.boxbuddy.io` is live, password-gated, and auto-deploys from the
      `dev` branch — see `docs/deploy-dev-environment.md`.
