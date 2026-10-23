-- Unique display names for signup. Replaces the never-applied
-- supabase/migrations/202602240001_signup_profile_backend.sql, which assumed a
-- profiles table that didn't exist and reused the trigger name
-- on_auth_user_created, silently replacing the signup-credits trigger.
-- Apply manually via the Supabase SQL Editor.
--
-- Display names appear in box URLs (/boxes/:displayName/:boxName), so two
-- users with the same name would collide. Names stay in user metadata too;
-- profiles exists to enforce uniqueness.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null unique,
  email text,
  created_at timestamptz not null default now()
);

-- Only security definer functions read it; no client access.
alter table public.profiles enable row level security;

-- Backfill existing users. A name already taken keeps its first owner;
-- the duplicate is skipped rather than failing the migration.
insert into public.profiles (id, display_name, email)
select u.id, trim(u.raw_user_meta_data ->> 'display_name'), u.email
from auth.users u
where coalesce(trim(u.raw_user_meta_data ->> 'display_name'), '') <> ''
order by u.created_at
on conflict do nothing;

create or replace function public.validate_signup_display_name(p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text := trim(coalesce(p_display_name, ''));
begin
  if normalized_name = '' then
    return jsonb_build_object('ok', false, 'code', 'display_name_required',
      'message', 'Display name is required.');
  end if;

  if char_length(normalized_name) < 3 then
    return jsonb_build_object('ok', false, 'code', 'display_name_too_short',
      'message', 'Display name must be at least 3 characters.');
  end if;

  if exists (select 1 from public.profiles where display_name = normalized_name) then
    return jsonb_build_object('ok', false, 'code', 'display_name_taken',
      'message', 'That display name is already taken.');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.validate_signup_display_name(text) to anon, authenticated;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_display_name text := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
begin
  if char_length(profile_display_name) < 3 then
    raise exception 'display_name_too_short';
  end if;

  insert into public.profiles (id, display_name, email)
  values (new.id, profile_display_name, new.email);

  return new;
exception
  when unique_violation then
    raise exception 'display_name_taken';
end;
$$;

-- Distinct name so on_auth_user_created (signup credits) keeps working.
drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();
