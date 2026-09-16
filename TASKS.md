# MVP TODO

_Status verified against the code and AWS on 2026-09-16. Items are ticked only
where they were checked in the source, not because a doc claimed them._

## Blockers — can't ship without these

### Credits purchase (web / Stripe) — ✅ working end to end in test mode

- [x] Wire Stripe into credits purchase Lambda — real code is deployed as
      `boxBuddyPaymentsCheckout` and `POST /payments/checkout` routes to it.
- [x] Checkout Lambda timeout/memory raised — it was timing out at 3s on 128MB
      and returning 500 on every purchase.
- [x] Stripe webhook confirmed on `https://api.boxbuddy.io/payments/webhook`;
      sandbox purchase grants credits.
- [ ] T23 only: buy a second pack and confirm **two** distinct `purchase` rows
      in `credit_transactions` (idempotency sanity check).

### Usage counts / plan limits

- [ ] Call `setUsageCounts()` after fetching boxes/items — never called, so
      `boxCount`/`itemCountTotal` stay 0 and frontend plan limits are never
      enforced (only the backend 402 saves you). Note
      `src/composables/useSubscription.js:21` is a second no-op stub shadowing
      the real store action in `subscription.store.js:82`.

> **Subscriptions are deliberately out of scope.** `fetchSubscription()`
> (`subscription.store.js:80`) is an empty function and the `/billing/*` routes
> don't exist in API Gateway, so the paywall's upgrade button and the billing
> portal 404. That's the documented decision in
> `docs/archive/TASKS_payments_plan.md`: credit packs only, subscriptions stay
> stubbed. Either hide those entry points for MVP or accept dead buttons —
> but it isn't a bug to fix.

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
- [ ] Carried over from the add-items refactor: focus management when the add
      item modal opens, and keyboard nav through its form fields.

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
