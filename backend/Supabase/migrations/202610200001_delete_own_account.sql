-- Self-service account deletion, called from the Account page via
-- supabase.rpc('delete_own_account'). Apply manually via the Supabase SQL Editor.
--
-- Deleting from auth.users needs elevated rights, so this runs as security
-- definer but only ever touches the caller's own rows (auth.uid()). Rows are
-- deleted explicitly rather than relying on foreign-key cascades, because
-- boxes/items/credit tables were created outside these migrations.
--
-- The profiles row (202610210001_signup_display_name.sql) goes via
-- on delete cascade when the auth user is deleted.
--
-- Not covered: QR images in the `qr-codes` storage bucket and item photos in
-- S3. Supabase blocks deleting storage objects from SQL.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'delete_own_account: not authenticated';
  end if;

  delete from public.items
    where box_id in (select id from public.boxes where user_id = v_user_id);
  delete from public.box_access_grants
    where grantee_user_id = v_user_id
       or granted_by_user_id = v_user_id
       or box_id in (select id from public.boxes where user_id = v_user_id);
  delete from public.boxes where user_id = v_user_id;
  delete from public.credit_transactions where user_id = v_user_id;
  delete from public.user_credits where user_id = v_user_id;

  delete from auth.users where id = v_user_id;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
