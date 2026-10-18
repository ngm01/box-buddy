# Archived task docs — historical only

**Note to self (and to Claude): ignore everything in this directory when
looking for work to do.** These are finished or superseded planning docs, kept
only for the rationale they record. Their checkboxes were never kept up to
date — unticked items in here are almost always shipped work, not a backlog.

Archived 2026-09-16, with a second batch on 2026-10-17.

**The only live task list is `TODO.md` at the repo root.** Reference docs
(not task lists): `docs/payments-flow.md`, `docs/deploy-dev-environment.md`.

---

## What's in here and why it's dead

| File                          | Why archived                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `TASKS_credits_and_batch.md`  | Credit store + batch identify shipped. Its premise ("`/payments/checkout` is a stub that immediately credits the user") stopped being true when real Stripe checkout deployed. |
| `TASKS_credits_supplement.md` | The `fetchBalance`/`fetchHistory` switch to direct Supabase calls — merged via `fix/credit-store-supabase-direct-2`. |
| `TASKS_payments_handoff.md`   | Pre-implementation handoff notes. Superseded by `docs/payments-flow.md`.     |
| `TASKS_payments_plan.md`      | The architecture plan. Superseded by `docs/payments-todo.md`, but still the record of **why** subscriptions stay stubbed and credits are the only paid path. |
| `TASKS_qr_refactor.md`        | Complete — 26 of 26 done.                                                    |
| `TASKS_refactor_add_items.md` | 33 of 35 done. The two leftovers (focus management on modal open, unit tests) were carried into `TASKS.md`. |
| `TASK_fix_uploads_presign.md` | A debugging checklist for a presign bug that is long fixed; uploads work.     |
| `TASKS_mvp.md`                | Was the root `TASKS.md`. Open items moved to `TODO.md` on 2026-10-17.        |
| `payments-todo.md`            | Payments checklist T1–T36. T1–T21 are done; the open ones moved to `TODO.md`. Still the record of setup details (env var names, route table). |
| `deep-links-todo.md`          | DL1–DL7. DL5 (dead `boxbuddy://` branch) and DL6 (root `ios/`) are resolved; the rest moved to `TODO.md`. |
| `handoff_2026-09-18.md`       | Session handoff for the dev-environment and Stripe work. Its next steps moved to `TODO.md`. |

Most of these are gitignored: the root `.gitignore` matches `TASK*.md` at any
depth. The exceptions are `TASKS_mvp.md`, `payments-todo.md` and
`handoff_2026-09-18.md`, which were already tracked and stay tracked.
