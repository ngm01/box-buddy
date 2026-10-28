# Box Buddy TODO

_The single live task list. Verified against the code, git, AWS and the live
endpoints on 2026-10-17; updated 2026-10-28. It replaces `TASKS.md`, `docs/payments-todo.md`,
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
`docs/deploy-dev-environment.md` (gitignored, so only on your machine).

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
      Note: the unique index from `202610280001` matches names exactly, the
      same way the URL lookup does, so `Garage` and `garage` can coexist.
      A normalized URL form would need the index on the normalized name.

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

### Code review fixes, 2026-10-28 (in progress)

All **[Claude]**, in priority order, one commit each on `dev`. Lambda changes
still need **[You: AWS]** to deploy, and migrations need **[You: Supabase]**
to apply.

- [ ] Box creation takes two requests (POST, then PATCH `qr_code_url`). Send
      the URL with the POST.
- [ ] Debounced box and item searches can show a stale query's results when
      responses arrive out of order. Ignore any response that isn't from the
      latest request.
- [ ] `/uploads/presign`, `/identify` and `/payments/checkout` use raw
      `fetch`, which skips `apiClient`'s 401 handling. An expired session
      mid-scan shows "Identify failed: 401" instead of going to login.
- [ ] Warn when renaming a box that labels already printed for it will stop
      working (see "Allow username changes?" and "Normalize QR code URLs").
- [ ] Vitest unit tests for the QR URL, search-escaping, auth-error and
      config utils and for the three Lambda handlers. Run them in CI.
- [ ] README: fix the "inventoru" typo, replace the yarn instructions,
      correct the description of how production picks its base URL, and list
      every `.env.local` variable.
- [ ] Remove duplicated helpers (`normalizeTags` ×4, `formatDate`,
      `errorText`, `API_BASE`) and the access-level picker that's copied
      into two pages.
- [ ] Button-style audit for the "Regularize button styles" review item.

## 2. Unverified, needs a database or AWS check

- [ ] **[You: Supabase]** Apply
      `backend/Supabase/migrations/202610280001_unique_box_name_per_owner.sql`.
      If any owner already has two boxes with the same name, it stops and
      lists them (`display_name / name (n boxes)`). Rename or delete one of
      each in the app, then run it again. Until it's applied, the app's
      own check is the only guard, and two tabs saving at once could still
      create a duplicate.

- [ ] **[You: Supabase]** Confirm `202606070001_signup_bonus_credits.sql` is
      applied (new users get 20 credits). Without it, new users start at 0
      and can't scan. The file is gitignored, so it's only on your machine.
- [ ] **[You: Supabase]** Check whether `items.box_id` has a foreign key to
      `boxes.id`:
      ```sql
      select conname from pg_constraint
      where conrelid = 'public.items'::regclass and contype = 'f';
      ```
      If it does, **[Claude]** switches the box list's item counts to one
      `boxes?select=id,items(count)` request. Today they're read 1,000 rows
      at a time, because PostgREST embedding needs that foreign key.
- [ ] **[You]** Check whether "Your boxes" lists other users' public boxes.
      `fetchBoxes()` doesn't filter by `user_id`, and RLS lets any signed-in
      user read public boxes. Unless the `/boxes/` API Gateway route adds a
      filter, those boxes show up. To test, make a public box as one user,
      then sign in as another. If it appears, **[Claude]** adds the filter.
- [ ] **[You: AWS]** Check that `/identify` enforces `freeRetry` on the
      server. The app sends `freeRetry: true` when retrying a failed photo. If
      the Lambda trusts that flag without checking that the photo was already
      charged, anyone can get free scans by sending it.
- [ ] **[You: Supabase + AWS]** Commit the backend source that only lives in
      the dashboards, so it can be reviewed and tested like the rest:
      - the base schema for `boxes`, `items`, `user_credits` and
        `credit_transactions` (`supabase db dump --schema-only`)
      - the `/identify` and `/uploads/presign` Lambdas
      - the API Gateway route config for `/boxes/`

      The two checks above can't be answered from the repo without these.
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
- [ ] **[Claude] + [You: AWS]** `POST /webhooks/revenuecat` returns **500**
      on an empty unauthenticated request. It should return 401. Likely
      cause: the handler creates its Supabase client when the module loads,
      so a missing `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`, or an
      unbundled `@supabase/supabase-js`, crashes the Lambda before the auth
      check runs. **[Claude]** will create the client on first use so
      unauthenticated requests always get 401. **[You: AWS]** Check the
      `webhook-revenuecat` CloudWatch logs to confirm the cause, then
      redeploy. Do this before T30.
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
- [ ] **[Claude] + [You]** Reconcile `ALLOWED_PROD_BASE_URLS` in
      `src/config/app.config.js`. `main` still lists `test.boxbuddy.io`, while
      `dev` lists `dev.boxbuddy.io`. If they aren't reconciled, production QR
      codes silently fall back to the canonical URL. Merging `dev` into
      `main` fixes this, but `main` is about 107 files behind. **[You]** Say
      when, and Claude will review the diff and open the `dev` → `main` PR.
      Merging it is yours.
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
- [ ] **[You]** Delete `src/scraps/` (leftover Lambda code). It's gitignored,
      so it only exists on your machine.
- [ ] **[You]** Delete the 30 stale remote branches. Re-checked on
      2026-10-28: all 30 are still on GitHub, and all are merged into `dev`
      or `main`. `feat/credit-pill`'s one extra commit is a merge with no
      changes. `feat/mobile-bottom-nav` (PR #35) is new to this list.
      ```bash
      git push origin --delete codex-dev feat/batch-identify feat/credit-pill \
        feat/credit-store feat/mobile-bottom-nav feat/out-of-credits \
        feat/payments-architecture \
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

- [x] Duplicate box names. `get_box_access_status` resolves a URL with
      `limit 1`, so a second box with the same name couldn't be opened.
      Create and rename now check for a taken name and show it under the
      name field. A Postgres unique violation (`23505`) shows the same
      message. Migration `202610280001` adds the unique index (applying it
      is in §2). Checked in Playwright against a fake backend, and the
      migration run against local Postgres. 2026-10-28.
- [x] Box list item counts were capped at 1,000 rows by PostgREST, so busy
      accounts showed too few items (and 0 for later boxes).
      `countItemsByBox()` now pages through with an exact count. Commit
      `291eeec`, checked in Playwright against a fake backend that caps
      responses at 1,000 rows. 2026-10-28.
- [x] Desktop header account menu ("Hello, [username]", initial avatar,
      Account / Buy credits / Log out); `/account` shows "Logged in as
      [username]". Keyboard navigation in the add-items form (roving-focus
      tag chips, ⌘/Ctrl+Enter to add). Display-name duplicate check: none;
      the one 2025 user without a display name was deleted. Tested
      2026-10-27.
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
