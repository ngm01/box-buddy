-- Fixes: 42P17 "infinite recursion detected in policy for relation boxes"
--
-- 202603020001 gave public.boxes a SELECT policy that reads box_access_grants,
-- and gave box_access_grants a SELECT policy that reads boxes. Evaluating
-- either policy re-enters the other, so Postgres aborts the cycle.
--
-- The break: every cross-table lookup goes through a security definer helper.
-- Those execute as the function owner, which owns both tables and is therefore
-- exempt from their RLS, so the inner read does not re-trigger policy checks.
-- Each helper touches exactly one table, so no cycle can form through them.
--
-- Access rules are unchanged: owner, public box, or explicit grant.

create or replace function public.user_has_box_grant(target_box_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.box_access_grants g
    where g.box_id = target_box_id
      and g.grantee_user_id = auth.uid()
  );
$$;

grant execute on function public.user_has_box_grant(uuid) to anon, authenticated;

create or replace function public.is_box_owner(target_box_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.boxes b
    where b.id = target_box_id
      and b.user_id = auth.uid()
  );
$$;

grant execute on function public.is_box_owner(uuid) to anon, authenticated;

-- The two cheap checks stay inline so the common owner case short-circuits
-- before any function call; only the grant lookup pays for one.
drop policy if exists "boxes_select_owner_or_public_or_shared" on public.boxes;

create policy "boxes_select_owner_or_public_or_shared"
on public.boxes
for select
using (
  user_id = auth.uid()
  or access_level = 'public'
  or public.user_has_box_grant(id)
);

drop policy if exists "box_access_grants_select_participants" on public.box_access_grants;
drop policy if exists "box_access_grants_insert_box_owner_only" on public.box_access_grants;
drop policy if exists "box_access_grants_delete_box_owner_only" on public.box_access_grants;

create policy "box_access_grants_select_participants"
on public.box_access_grants
for select
to authenticated
using (
  grantee_user_id = auth.uid()
  or public.is_box_owner(box_id)
);

create policy "box_access_grants_insert_box_owner_only"
on public.box_access_grants
for insert
to authenticated
with check (
  public.is_box_owner(box_id)
  and granted_by_user_id = auth.uid()
);

create policy "box_access_grants_delete_box_owner_only"
on public.box_access_grants
for delete
to authenticated
using (public.is_box_owner(box_id));

notify pgrst, 'reload schema';

-- Output check: shows every policy now live on these tables. If any name
-- appears that is not created by this file or by 202603020001, it is a
-- leftover from an earlier setup and may be widening access.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('boxes', 'items', 'box_access_grants')
order by tablename, policyname;
