# Supabase access checks for QR-opened box pages

## Policy model
`backend/Supabase/migrations/202603020001_qr_access_rls.sql` enforces explicit RLS behavior for `boxes` and related `items`:

1. **Owner access**: the box owner (`boxes.user_id = auth.uid()`) can read/write their boxes and related items.
2. **Shared/Public model**:
   - `boxes.access_level = 'public'` grants read access.
   - `box_access_grants` grants per-user shared access.
3. **Deny all else**: no additional policy paths are defined, so all non-matching access is denied by RLS.

## Frontend status mapping contract
The frontend calls `public.get_box_access_status(display_name, box_name)` and should map:

- `200` -> fetch and render box + items.
- `403` -> render forbidden message for a valid-but-not-accessible QR.
- `404` -> render not-found message.

## Validation checklist (SQL)
Run these checks in Supabase SQL editor after migration:

```sql
-- 1) Verify policies exist
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('boxes', 'items', 'box_access_grants')
order by tablename, policyname;

-- 2) Verify helper functions are present
select proname
from pg_proc
where proname in ('can_read_box', 'get_box_access_status');

-- 3) Confirm RLS is enabled
select relname, relrowsecurity
from pg_class
where relname in ('boxes', 'items', 'box_access_grants');
```
