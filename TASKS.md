# MVP TODO

## Blockers — can't ship without these

### Monetization
- [ ] Wire Stripe into checkout Lambda (`/billing/checkout-session`) — stub only, no users can upgrade
- [ ] Wire Stripe into billing portal Lambda (`/billing/billing-portal`) — stub only
- [ ] Wire Stripe into credits purchase Lambda (`/payments/checkout`) — `purchasePack` hits this but it's a stub; AI scans can't be monetized
- [ ] Apply migration `202606070001_signup_bonus_credits.sql` — grants 20 credits (10 free scans) to every new user via DB trigger; new users currently start at 0 and can't scan anything

### Subscription state never loads
- [ ] Implement `fetchSubscription()` in `subscription.store.js` — currently an explicit no-op; `plan` is always `'free'`, billing page always shows wrong data
- [ ] Call `setUsageCounts()` after fetching boxes/items — `boxCount` and `itemCountTotal` are always 0 in the store, so frontend plan limits are never enforced (only the backend 402 saves you)

### Bugs
- [ ] `BoxDetailPage` — `pageState === 'forbidden'` is in the template but never set; use the `get_box_access_status` RPC (already in Supabase from the QR access migration) instead of a raw `.select().single()` to distinguish 403 from 404
- [ ] `BoxDetailPage` — `boxName` prop not passed to `<AddItemDialog>` (line 85); `ScanResults` uses it to display context, scan results show no box name
- [ ] `LoginPage` — remove `console.log('Attempting login with:', email.value)` (logs credentials to console)

---

## Important gaps

- [ ] Add `<PaywallGate feature="items">` around the "Add Item" button in `BoxDetailPage` — box creation is gated but item creation isn't; backend enforces via 402 but UX is inconsistent
- [ ] Account settings page — no way to change email/password or delete account
- [ ] `BoxListPage` — no loading indicator while boxes are fetching

---

## Cleanup

- [ ] Delete `src/pages/TestHomePage.vue` — unused placeholder
- [ ] Delete `src/scraps/` directory — leftover Lambda code (already gitignored, just needs to be removed from disk)
