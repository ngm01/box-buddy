-- Validate display names through a trusted backend path.
create or replace function public.validate_signup_display_name(p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text;
begin
  normalized_name := trim(coalesce(p_display_name, ''));

  if normalized_name = '' then
    return jsonb_build_object(
      'ok', false,
      'code', 'display_name_required',
      'message', 'Display name is required.'
    );
  end if;

  if char_length(normalized_name) < 3 then
    return jsonb_build_object(
      'ok', false,
      'code', 'display_name_too_short',
      'message', 'Display name must be at least 3 characters.'
    );
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.display_name = normalized_name
  ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'display_name_taken',
      'message', 'Display name is already taken.'
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- Always create profiles server-side when an auth user is created.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_display_name text;
begin
  profile_display_name := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));

  if profile_display_name = '' then
    raise exception 'display_name_required';
  end if;

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

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();
