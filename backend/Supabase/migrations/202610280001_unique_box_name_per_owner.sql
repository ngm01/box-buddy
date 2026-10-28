-- One box per name per owner. Apply manually via the Supabase SQL Editor.
--
-- Box URLs are /boxes/:display_name/:box_name, and get_box_access_status
-- resolves them with `limit 1`. Two boxes with the same owner and name share
-- one URL, so one of them can never be opened from its link or printed label.
-- The app checks for a taken name before create and rename; this index is
-- the guarantee. The match is exact (case-sensitive), like the URL lookup.
--
-- If any duplicates already exist, this stops and lists them instead of
-- renaming boxes, since renaming one breaks its printed label. Rename or
-- delete one box in each pair in the app, then run this again.

do $$
declare
  duplicates text;
begin
  select string_agg(format('%s / %s (%s boxes)', display_name, name, n), E'\n')
  into duplicates
  from (
    select max(display_name) as display_name, name, count(*) as n
    from public.boxes
    group by user_id, name
    having count(*) > 1
  ) d;

  if duplicates is not null then
    raise exception E'Duplicate box names must be resolved first:\n%', duplicates;
  end if;
end;
$$;

create unique index if not exists boxes_user_id_name_key
  on public.boxes (user_id, name);
