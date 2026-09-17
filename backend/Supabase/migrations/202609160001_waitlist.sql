-- Waitlist for the coming-soon page at boxbuddy.io.
--
-- The landing page is static and calls PostgREST directly with the anon key,
-- so the only thing standing between the internet and this table is RLS.
-- Deliberate shape:
--   * anon may INSERT and nothing else.
--   * There is no SELECT policy for anon or authenticated, so nobody can read
--     the list back through the API — harvesting the signups with the
--     publishable key is impossible. Export it in the SQL editor (service role
--     bypasses RLS) when it's time to send the launch email.
--
-- Note: `with check (true)` allows unlimited inserts from anyone. There is no
-- rate limiting here. If the form gets abused, add a CAPTCHA/Turnstile check
-- in front of it rather than loosening or tightening this policy.

create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  created_at timestamptz not null default now(),
  source     text,

  constraint waitlist_email_format
    check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint waitlist_email_length
    check (char_length(email) between 3 and 254),
  constraint waitlist_source_length
    check (source is null or char_length(source) <= 64)
);

-- Case-insensitive dedupe: Foo@Bar.com and foo@bar.com are one signup.
-- A repeat signup surfaces as a 23505 unique violation, which the page
-- reports as success — the visitor is on the list either way.
create unique index if not exists waitlist_email_lower_idx
  on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

drop policy if exists "anon can join the waitlist" on public.waitlist;
create policy "anon can join the waitlist"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (true);

comment on table public.waitlist is
  'Coming-soon signups from boxbuddy.io. Insert-only via anon; read with the service role.';
