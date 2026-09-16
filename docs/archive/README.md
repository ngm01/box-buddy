# Archived task docs — historical only

**Note to self (and to Claude): ignore everything in this directory when
looking for work to do.** These are finished or superseded planning docs, kept
only for the rationale they record. Their checkboxes were never kept up to
date — unticked items in here are almost always shipped work, not a backlog.

Archived 2026-09-16.

**Live task docs are:**

| File                              | Purpose                                        |
| --------------------------------- | ---------------------------------------------- |
| `TASKS.md` (repo root)            | MVP blockers, gaps, cleanup                    |
| `docs/payments-todo.md`           | Payments checklist (T1–T36)                    |
| `docs/payments-flow.md`           | Reference: how the purchase flows fit together |
| `docs/deploy-dev-environment.md`  | What's deployed on `dev.boxbuddy.io`           |
| `docs/deep-links-todo.md`         | Deep linking — still open                      |

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

These files stay gitignored — the root `.gitignore` matches `TASK*.md` at any
depth, so moving them here kept them out of version control.
