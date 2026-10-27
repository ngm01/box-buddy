# Box Buddy TODO

_The single live task list. Verified against the code, git, AWS and the live
endpoints on 2026-10-17; updated 2026-10-20. It replaces `TASKS.md`, `docs/payments-todo.md`,
`docs/deep-links-todo.md` and `docs/handoff.md`, which are now in
`docs/archive/`._

Task IDs `T…` (payments) and `DL…` (deep links) carry over from the old docs,
so archived rationale still lines up. Owner tags: **[Claude]** = code or
terminal work; **[You: …]** = dashboard or device work only you can do.

**Monetization is credits only.** Credits are bought as packs (Stripe on
web, Apple IAP via RevenueCat on iOS) and spent on AI identify scans; running
out returns HTTP 402 and shows `OutOfCreditsCard`. There are no subscriptions
or plans, and nothing else is paywalled.

Reference docs (not task lists): `docs/payments-flow.md`,
`docs/deploy-dev-environment.md`.

---

## To review — decisions to think through

Not tasks yet. Each needs a decision before it becomes work.

- [ ] **Normalize QR code URLs.** Scanning a QR code with the phone's Camera
      app tries to open `localhost:9000`, so codes generated in dev encode the
      dev origin. Decide which base URL every code should carry (see
      `src/config/app.config.js` and `WEB_BASE_URL`), and what happens to
      labels already printed.
- [ ] **QR code and label sizing.** Currently fixed: QR alone 40×40mm, full
      label 63.5×38.1mm. Should users be able to pick bigger sizes?
- [ ] **Regularize button styles** across the app.
- [ ] **Clean up the QR code page** (`QRCodeDialog.vue`).
- [ ] **Saving photos.** Decide whether and where item photos are kept.
- [ ] **Group boxes by location** (garage, basement, storage locker, etc.).
- [ ] **Long box lists.** With many boxes, "Create new box" sits at the
      bottom of `BoxListPage.vue`, so users have to scroll to reach it.
      Options: move it to the top, a floating action button (`q-page-sticky`),
      a header action, and/or pagination or collapsing (ties in with
      grouping by location above).
- [ ] **Allow username changes?** Usernames (display names) are in every box
      URL and printed QR label (`/boxes/:displayName/:boxName`), so a rename
      breaks existing labels. Options: no renames; renames with a redirect
      from the old name (needs a `previous_display_names` table); or move QR
      URLs to a stable box id first (ties in with "Normalize QR code URLs").
- [ ] **Avatars.** Worth it? Needs storage (Supabase bucket or S3), upload
      and crop UI, and a fallback (initials).
- [ ] **No spaces in box URLs.** Today `Office bookshelf` becomes
      `/boxes/ngm01/Office%20bookshelf`. Options: disallow spaces at box
      creation (unfriendly for non-technical users), or keep the name as typed
      and use a URL form with spaces → underscores (or hyphens). Either way:
      already-printed QR labels with `%20` must keep resolving, two names that
      map to the same URL (`a b` vs `a_b`) must be caught as duplicates, and
      `get_box_access_status` / box lookup must accept the new form. Ties in
      with "Normalize QR code URLs" and "Allow username changes?".

## 1. MVP gaps in the app

- [ ] **[You: Supabase/email provider] + [Claude]** Send auth emails
      (confirm signup, reset password, change email) from Box Buddy, not
      Supabase. Set up custom SMTP (e.g. Amazon SES, Resend, Postmark) with a
      `boxbuddy.io` sender plus SPF/DKIM DNS records, then brand the templates
      under Auth → Email Templates. Also lifts Supabase's built-in email rate
      limit.
      Then turn **Secure email change** back on (Auth → Sign In / Providers
      → Email). It was turned off on 2026-10-27 because the built-in sender
      never delivered the old-address confirmation, leaving changes stuck.
- [ ] **[Claude]** Username as the primary identity in the UI. Show the
      display name (not email) as "Logged in as" on `/account`, with the
      email as a secondary detail.
- [ ] **[Claude]** Standard app header: "Hello, [username]" and an account
      dropdown (Account, Credits, Log out) replacing the bare logout icon.
      Avatar slot if avatars go ahead (see "To review").
- [ ] **[You: Supabase]** Check for duplicate display names among users
      created before `profiles` existed. The backfill skipped duplicates, so
      any user listed here has no `profiles` row:
      ```sql
      select u.id, u.email, u.raw_user_meta_data->>'display_name' as name
      from auth.users u left join public.profiles p on p.id = u.id
      where p.id is null;
      ```
      New signups are already unique (`profiles.display_name` is `unique`).
- [ ] **[Claude]** Keyboard navigation through the add-items form fields.
      (Focus-on-open is done: the name input autofocuses in
      `AddItemsDesktopDialog.vue`.)

## 2. Unverified, needs a database check

- [ ] **[You: Supabase]** Confirm `202606070001_signup_bonus_credits.sql` is
      applied (new users get 20 credits). Without it, new users start at 0
      and can't scan.
- [ ] **T23 [You]** Two ledger checks on `credit_transactions`:
      - Resend a delivered `checkout.session.completed` from Stripe → Webhooks.
        Expect `"granted": false` and still one `purchase` row.
      - Buy a second pack. Expect two `purchase` rows with different
        `reference_id`s.

## 3. Coming-soon page (PR #34, open)

- [ ] **[You]** Preview it locally, then merge PR #34:
      `cd landing && python3 -m http.server 8777 --bind 127.0.0.1`, open
      `http://127.0.0.1:8777/preview.html`. (Check out `feat/coming-soon-landing`
      first. On `dev`, `landing/` contains only an untracked `preview.html`.)
- [ ] **[You: Supabase]** Apply `backend/Supabase/migrations/202609160001_waitlist.sql`.
      **Confirmed not applied:** `/rest/v1/waitlist` returns 404.
- [ ] **[You: AWS]** Deploy it as its own Amplify app (steps are in the PR
      description). Paste `landing/amplify.yml` into that app's build settings,
      or it builds the whole SPA from the root `amplify.yml`. No such app
      exists yet.

## 4. iOS payments (RevenueCat, sandbox)

Start T24/T25 early because they wait on Apple.

- [ ] **T24 [You: ASC]** Sign the Paid Apps agreement and complete
      banking/tax.
- [ ] **T25 [You: ASC]** Create 3 consumable IAPs: `credits_50`, `credits_200`,
      `credits_600` at $4.99 / $14.99 / $34.99. Get each to "Ready to Submit".
- [ ] **T26 [You: RC]** Create the RevenueCat project and iOS app, add the 3
      products, and copy the public Apple key (`appl_...`).
- [ ] **T27 [You: RC]** Set the webhook URL to
      `https://api.boxbuddy.io/webhooks/revenuecat`, with the Authorization
      string from T16.
- [ ] **T28 [Claude]** Add `REVENUECAT_APPLE_API_KEY=appl_...` to `.env.local`
      and rebuild iOS. **This is the cause of the
      `Missing RevenueCat API key for platform: ios` error.** `.env.local`
      doesn't have the key. No config change is needed: Quasar inlines every
      `.env.local` key.
- [ ] **[Claude]** `POST /webhooks/revenuecat` returns **500** on an empty
      unauthenticated request. It should return 401. Check the
      `webhook-revenuecat` logs before T30.
- [ ] **T29 [You: ASC]** Create a sandbox tester and sign in on a real device.
- [ ] **T30 [You]** Buy a pack on the device and confirm the credits arrive.

## 5. Production go-live

- [ ] **T31 [You: Stripe]** Activate the account for live payments. **Start
      early, because it has a waiting period.**
- [ ] **T32 [You: Stripe]** In live mode, repeat the products, prices and
      webhook (`/payments/webhook`). Collect `sk_live_`, 3 live `price_` ids
      and the live `whsec_`.
- [ ] **T33 [You: AWS]** Swap the env values on `boxBuddyPaymentsCheckout`
      (secret key + 3 price ids) and `webhookStripe` (secret key + webhook
      secret).
- [ ] **[You: AWS]** Reset `WEB_APP_URL` on `boxBuddyPaymentsCheckout`. It's
      currently `https://dev.boxbuddy.io`. Better option **[Claude]**: switch
      the Lambda to an origin allowlist.
- [ ] **[Claude]** Reconcile `ALLOWED_PROD_BASE_URLS` in
      `src/config/app.config.js`. `main` still lists `test.boxbuddy.io`, while
      `dev` lists `dev.boxbuddy.io`. If they aren't reconciled, production QR
      codes silently fall back to the canonical URL.
- [ ] **[You: AWS]** Point the apex at `main` in Amplify. Don't print QR
      labels until the app owns the apex.
- [ ] **[You: AWS]** Add `capacitor://localhost` to the **prod** uploads
      bucket's CORS, the same fix that was applied to `boxbuddy-uploads-dev`
      on 2026-10-17.
- [ ] **T34 [You]** Make one real $4.99 purchase and confirm the credits land.
- [ ] **T35 [You: ASC]** Submit the IAPs with the next app version.
- [ ] **T36 [You]** Make one real purchase in the App Store build.

## 6. Deep links (gated on the apex being live)

The apex doesn't respond yet, so none of these can run.

- [ ] **DL1 [You: Apple]** Confirm the team ID `6NP9J47X5Y` under Apple
      Developer → Membership. It's what the AASA uses.
- [ ] **DL2 [You: AWS]** Serve `/.well-known/apple-app-site-association` from
      the apex: 200, `application/json`, no auth, and not rewritten to
      `index.html`.
- [ ] **DL3 [You]** Reinstall the app after DL2. iOS caches the AASA at
      install time.
- [ ] **DL4 [You]** Scan a box QR code with the Camera app and confirm it
      opens the app, not Safari.

## 7. Cleanup

- [ ] **[You: AWS]** Delete the `payments-checkout` Lambda (a 295-byte stub
      that nothing routes to). Keep `boxBuddyPaymentsCheckout`.
- [ ] **[You: AWS]** Delete the `POST /webhooks/stripe` route. It has no
      integration and returns 404.
- [ ] **[Claude]** Delete `src/scraps/` (leftover Lambda code, gitignored).
- [ ] **[You]** Delete the 29 stale remote branches. They were verified merged
      on 2026-09-18:
      ```bash
      git push origin --delete codex-dev feat/batch-identify feat/credit-pill \
        feat/credit-store feat/out-of-credits feat/payments-architecture \
        fix/box-detail-incomplete-try fix/box-list-subscription-destructure \
        fix/credit-store-supabase-direct-2 fix/signup-page-variables \
        fix/store-missing-params-imports \
        $(git ls-remote --heads origin 'codex/*' | sed 's#.*refs/heads/##')
      ```
      Keep `feat/coming-soon-landing` until PR #34 merges.
- [ ] **[You: AWS]** Stop using the root account for the CLI. `aws login`
      currently signs in as `arn:aws:iam::792376172274:root`.

## 8. Later: Android

- [ ] **DL7 [Claude]** Replace `REPLACE_WITH_RELEASE_CERT_SHA256` in
      `public/.well-known/assetlinks.json` once a release keystore exists.

---

## Done

- [x] Friendly auth error messages (`src/utils/authErrors.js`) on login,
      signup, forgot/reset password, resend and account pages; field-level
      display-name errors; duplicate-email detection; resend-confirmation
      shortcut on login. Tested 2026-10-27.
- [x] Auth email links (signup, resend, reset password, change email) go
      through `getAuthRedirectUrl()` and land back in the app; iOS uses the
      web URL. Supabase Redirect URLs allow-list localhost:9000, dev and apex
      (Site URL stays `boxbuddy.io`). `/signup-success` now shows confirmed /
      expired-link states. Tested 2026-10-26.
- [x] Account management on `/account`: change password (re-checks the
      current one), delete account (`delete_own_account` RPC), change email
      (tested 2026-10-27; the page now shows the "confirm the other link" /
      error message from the link and re-reads the user). Signup display-name
      check fixed with a real `profiles` table. Both migrations applied;
      tested 2026-10-22.
- [x] Loading feedback on network actions: spinners, double-submit guards
      and success/failure notifications for box create/delete, box and item
      edit, item delete, searches and saving scanned items. 2026-10-20.
- [x] Removed the subscription/plan scaffolding (plans, subscription and
      paywall stores, `PaywallGate`/`PaywallModal`, `src/billing/`,
      `apiErrors.js`). Credits are the only paywall. 2026-10-20.
- [x] Mobile bottom nav with an in-app QR scanner (`/scan`) that opens the
      scanned box, plus an Account page. PR #35, merged 2026-10-20.
- [x] iOS printing of QR codes and full labels. Commit `7c9444c`, confirmed
      on device 2026-10-18.

## Notes that still matter

- **AWS sessions expire often.** Re-run `aws login`. Every profile uses
  account `792376172274`, and only `default` is us-east-2.
- **Don't trust ticks in old docs.** Payments tasks T13, T14 and T17 were
  ticked while the route pointed at a stub. Verify against AWS.
- **Quasar ignores shell/CI env vars.** `amplify.yml` writes them into
  `.env.local` during `preBuild`.
