-- Purchase credit grant: idempotent, service-role-only credit granting for
-- store payment webhooks (RevenueCat native IAP, Stripe web checkout).
-- Apply manually via the Supabase SQL Editor.
--
-- Assumes public.user_credits (user_id, balance) and public.credit_transactions
-- (user_id, amount, reason, created_at) already exist (see
-- 202606070001_signup_bonus_credits.sql). The column guards below are no-ops
-- on databases where the columns are already present.

alter table public.credit_transactions add column if not exists reference_id text;
alter table public.credit_transactions add column if not exists balance_after integer;
alter table public.credit_transactions add column if not exists metadata jsonb;

-- Idempotency: at most one grant per store transaction. Partial on
-- reason = 'purchase' so scan-related reference_ids (identify / retry_refund
-- rows can reuse a scan id) can never collide with purchase grants.
create unique index if not exists credit_transactions_purchase_ref_uniq
  on public.credit_transactions (reference_id)
  where reason = 'purchase' and reference_id is not null;

-- Grants p_credits to p_user_id exactly once per p_reference_id.
-- Reference id convention: 'rc:<transaction_id>' (RevenueCat) or
-- 'stripe:<payment_intent_id>' (Stripe).
-- Returns (granted, new_balance); granted = false means the reference was
-- already processed (duplicate webhook delivery) and nothing changed.
create or replace function public.grant_purchased_credits(
  p_user_id uuid,
  p_credits integer,
  p_reference_id text,
  p_metadata jsonb default '{}'::jsonb
) returns table (granted boolean, new_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_user_id is null or p_reference_id is null or coalesce(p_credits, 0) <= 0 then
    raise exception 'grant_purchased_credits: invalid arguments';
  end if;

  -- Row lock serializes concurrent grants for the same user, keeping
  -- balance_after consistent with the running balance.
  select balance into v_balance
    from public.user_credits
    where user_id = p_user_id
    for update;

  if not found then
    insert into public.user_credits (user_id, balance)
      values (p_user_id, 0)
      on conflict (user_id) do nothing;

    select balance into v_balance
      from public.user_credits
      where user_id = p_user_id
      for update;
  end if;

  begin
    insert into public.credit_transactions
      (user_id, amount, reason, reference_id, balance_after, metadata)
    values
      (p_user_id, p_credits, 'purchase', p_reference_id, v_balance + p_credits, p_metadata);
  exception when unique_violation then
    -- Duplicate webhook delivery for a transaction we already granted: no-op.
    return query select false, v_balance;
    return;
  end;

  update public.user_credits
    set balance = v_balance + p_credits
    where user_id = p_user_id;

  return query select true, v_balance + p_credits;
end;
$$;

-- The frontend must never be able to grant credits: callable only by backend
-- Lambdas through the service role. (create function grants execute to
-- public by default, so the revokes are required.)
revoke execute on function public.grant_purchased_credits(uuid, integer, text, jsonb) from public;
revoke execute on function public.grant_purchased_credits(uuid, integer, text, jsonb) from anon;
revoke execute on function public.grant_purchased_credits(uuid, integer, text, jsonb) from authenticated;
grant execute on function public.grant_purchased_credits(uuid, integer, text, jsonb) to service_role;
