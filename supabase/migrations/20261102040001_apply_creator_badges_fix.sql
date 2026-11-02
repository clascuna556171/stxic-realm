-- Idempotent authority reconciliation. No email/address pattern can confer
-- founder, active-account, or platform-admin privileges.
create or replace function realm_private.is_founder(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path='' as $$
 select p_user is not null and realm_private.active_account(p_user)
 and exists(select 1 from realm_private.founder_accounts where user_id=p_user and verified_at is not null)
$$;
revoke all on function realm_private.is_founder(uuid) from public,anon;
grant execute on function realm_private.is_founder(uuid) to authenticated;
notify pgrst,'reload schema';
