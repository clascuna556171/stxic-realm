-- Run with trusted database tooling only, AFTER reviewing every identity below.
-- Replace both placeholders. This file intentionally fails without operator input.
begin;
do $$
declare
 reviewed_users uuid[]:=array[]::uuid[];
 platform_admin uuid:=null;
begin
 if cardinality(reviewed_users)=0 or platform_admin is null or not platform_admin=any(reviewed_users) then raise exception 'Supply reviewed verified user IDs and an administrator from that list.';end if;
 if exists(select 1 from unnest(reviewed_users) id where not exists(select 1 from auth.users u where u.id=id and u.email_confirmed_at is not null)) then raise exception 'Every reviewed account must exist and have a verified email.';end if;
 update realm_private.accounts set state='active',suspended_until=null,updated_at=clock_timestamp() where user_id=any(reviewed_users) and state='invited';
 insert into realm_private.platform_admins(user_id) values(platform_admin) on conflict do nothing;
 insert into realm_private.audit(action,target) select 'operator.admit',id from unnest(reviewed_users) id;
 insert into realm_private.audit(action,target) values('operator.platform_admin',platform_admin);
 -- Deliberately leave administration, account_invitations and privacy_jobs disabled.
end $$;
commit;
