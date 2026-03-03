-- QR access hardening for boxes + items.
-- Explicit model:
--   1) owner access
--   2) public boxes (access_level='public')
--   3) explicit shared access via box_access_grants
--   4) deny all else (enforced by RLS default deny)

alter table public.boxes enable row level security;
alter table public.items enable row level security;

-- Shared-access lookup table. Keep this migration idempotent for existing DBs.
create table if not exists public.box_access_grants (
  box_id uuid not null references public.boxes(id) on delete cascade,
  grantee_user_id uuid not null references auth.users(id) on delete cascade,
  granted_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (box_id, grantee_user_id)
);

alter table public.box_access_grants enable row level security;

-- Helper to centralize read checks across policies.
create or replace function public.can_read_box(target_box_id uuid)
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
      and (
        b.user_id = auth.uid()
        or b.access_level = 'public'
        or exists (
          select 1
          from public.box_access_grants g
          where g.box_id = b.id
            and g.grantee_user_id = auth.uid()
        )
      )
  );
$$;

grant execute on function public.can_read_box(uuid) to anon, authenticated;

-- RPC for frontend 403 vs 404 UX resolution.
create or replace function public.get_box_access_status(p_display_name text, p_box_name text)
returns table(status_code int, reason text, box_id uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  found_box public.boxes%rowtype;
begin
  select * into found_box
  from public.boxes
  where display_name = p_display_name and name = p_box_name
  limit 1;

  if not found then
    return query select 404, 'not_found', null::uuid;
    return;
  end if;

  if found_box.user_id = auth.uid()
     or found_box.access_level = 'public'
     or exists (
       select 1 from public.box_access_grants g
       where g.box_id = found_box.id and g.grantee_user_id = auth.uid()
     ) then
    return query select 200, 'ok', found_box.id;
  else
    return query select 403, 'forbidden', found_box.id;
  end if;
end;
$$;

grant execute on function public.get_box_access_status(text, text) to anon, authenticated;

-- Remove broad/implicit policies before recreating explicit ones.
drop policy if exists "boxes_select_owner_or_public_or_shared" on public.boxes;
drop policy if exists "boxes_insert_owner_only" on public.boxes;
drop policy if exists "boxes_update_owner_only" on public.boxes;
drop policy if exists "boxes_delete_owner_only" on public.boxes;
drop policy if exists "items_select_if_box_readable" on public.items;
drop policy if exists "items_write_owner_or_shared" on public.items;
drop policy if exists "box_access_grants_select_participants" on public.box_access_grants;
drop policy if exists "box_access_grants_insert_box_owner_only" on public.box_access_grants;
drop policy if exists "box_access_grants_delete_box_owner_only" on public.box_access_grants;

create policy "boxes_select_owner_or_public_or_shared"
on public.boxes
for select
using (
  user_id = auth.uid()
  or access_level = 'public'
  or exists (
    select 1
    from public.box_access_grants g
    where g.box_id = id
      and g.grantee_user_id = auth.uid()
  )
);

create policy "boxes_insert_owner_only"
on public.boxes
for insert
to authenticated
with check (user_id = auth.uid());

create policy "boxes_update_owner_only"
on public.boxes
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "boxes_delete_owner_only"
on public.boxes
for delete
to authenticated
using (user_id = auth.uid());

create policy "items_select_if_box_readable"
on public.items
for select
using (public.can_read_box(box_id));

create policy "items_write_owner_or_shared"
on public.items
for all
to authenticated
using (public.can_read_box(box_id))
with check (public.can_read_box(box_id));

create policy "box_access_grants_select_participants"
on public.box_access_grants
for select
to authenticated
using (
  grantee_user_id = auth.uid()
  or exists (
    select 1 from public.boxes b
    where b.id = box_id and b.user_id = auth.uid()
  )
);

create policy "box_access_grants_insert_box_owner_only"
on public.box_access_grants
for insert
to authenticated
with check (
  exists (
    select 1 from public.boxes b
    where b.id = box_id and b.user_id = auth.uid()
  )
  and granted_by_user_id = auth.uid()
);

create policy "box_access_grants_delete_box_owner_only"
on public.box_access_grants
for delete
to authenticated
using (
  exists (
    select 1 from public.boxes b
    where b.id = box_id and b.user_id = auth.uid()
  )
);
