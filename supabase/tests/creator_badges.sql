begin;
create function pg_temp.badge_check(ok boolean,label text) returns void language plpgsql as $$begin
 if ok is distinct from true then raise exception 'BADGE AUTHORITY FAILED: %',label;end if;
end $$;
create function pg_temp.badge_denied(statement text,expected text) returns void language plpgsql as $$begin
 begin execute statement;exception when others then
  if sqlstate=expected then return;end if;raise exception 'Expected %, got % (%)',expected,sqlstate,sqlerrm;
 end;raise exception 'BADGE AUTHORITY FAILED: permitted %',statement;
end $$;
insert into auth.users(id,email,email_confirmed_at) values
 ('71000000-0000-4000-8000-000000000001','badge-resident@example.invalid',now()),
 ('72000000-0000-4000-8000-000000000002','badge-team@example.invalid',now()),
 ('73000000-0000-4000-8000-000000000003','badge-creator@example.invalid',now());
update realm_private.accounts set state='active';
insert into realm_private.platform_admins(user_id) values('72000000-0000-4000-8000-000000000002');
insert into realm_private.founder_accounts(user_id,verified_at) values('73000000-0000-4000-8000-000000000003',now());
insert into realm_private.badge_grants(user_id,badge_id,granted_by) values('71000000-0000-4000-8000-000000000001','event-champion','Test operator');
select pg_temp.badge_check(not has_function_privilege('anon','public.save_user_badges(jsonb)','EXECUTE'),'anon cannot save');
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',true);
select pg_temp.badge_check(public.get_profile_card()->'badge_state'->'unlocked' ? 'event-champion','operator grant projected');
select pg_temp.badge_denied($q$select public.save_user_badges('{"unlocked":{"realm-creator":{}},"featured":[]}')$q$,'42501');
select pg_temp.badge_denied($q$select public.save_user_badges('{"unlocked":{"guardian":{"grantedBy":"Core Team"}},"featured":[]}')$q$,'42501');
select pg_temp.badge_denied($q$select public.save_user_badges('{"unlocked":{"realm-explorer":{}},"featured":[]}')$q$,'42501');
select pg_temp.badge_denied($q$select public.save_user_badges('{"featured":["guardian"]}')$q$,'42501');
select pg_temp.badge_denied($q$select public.save_user_badges('{"featured":["unknown"]}')$q$,'22023');
select pg_temp.badge_denied($q$select public.save_user_badges('{"unlocked":{"unknown":{}},"featured":[]}')$q$,'22023');
select pg_temp.badge_denied($q$select public.save_user_badges('{"unlocked":[],"featured":[]}')$q$,'22023');
select pg_temp.badge_denied($q$select public.save_user_badges('{"featured":[null]}')$q$,'22023');
select pg_temp.badge_denied($q$select public.save_user_badges('{"featured":[{}]}')$q$,'22023');
select pg_temp.badge_denied($q$select public.save_user_badges('{"featured":"guardian"}')$q$,'22023');
select pg_temp.badge_denied($q$select public.save_user_badges('{"featured":["event-champion","event-champion"]}')$q$,'22023');
select pg_temp.badge_denied($q$insert into realm_private.badge_grants(user_id,badge_id,granted_by) values(auth.uid(),'guardian','Self')$q$,'42501');
select pg_temp.badge_denied($q$select public.save_profile_card(public.get_profile_card()->'profile',jsonb_set(public.get_profile_card()->'card','{style,frame_id}','"realm-creator"'),0,0)$q$,'42501');
select public.save_user_badges('{"featured":["event-champion"]}');
select pg_temp.badge_check((public.get_profile_card()->'card'->>'revision')::integer=0,'pins do not invalidate draft revision');
select public.save_profile_card(public.get_profile_card()->'profile',jsonb_set(public.get_profile_card()->'card','{status}','"Draft survived pinning"'),0,0);
select pg_temp.badge_check(public.get_profile_card()->'badge_state'->'featured'='["event-champion"]','content save preserves pins');
select pg_temp.badge_denied($q$select public.save_profile_card(public.get_profile_card()->'profile',public.get_profile_card()->'card',0,0)$q$,'PT409');
select public.save_user_badges('{"featured":[]}');
select pg_temp.badge_check(public.get_profile_card()->'badge_state'->'featured'='[]','empty pins authoritative');
select set_config('request.jwt.claim.sub','72000000-0000-4000-8000-000000000002',true);
select pg_temp.badge_check((select count(*)=8 from jsonb_object_keys(public.get_profile_card()->'badge_state'->'unlocked')),'curated eight team grants');
select pg_temp.badge_check(not (public.get_profile_card()->'badge_state'->'unlocked' ? 'realm-creator'),'team is not creator');
select pg_temp.badge_denied($q$select public.save_profile_card(public.get_profile_card()->'profile',jsonb_set(public.get_profile_card()->'card','{style,frame_id}','"realm-creator"'),0,0)$q$,'42501');
select pg_temp.badge_denied($q$select public.save_user_badges('{"featured":["realm-creator"]}')$q$,'42501');
select set_config('request.jwt.claim.sub','73000000-0000-4000-8000-000000000003',true);
select pg_temp.badge_check((select count(*)=32 from jsonb_object_keys(public.get_profile_card()->'badge_state'->'unlocked')),'verified founder has 32 honors');
select public.save_user_badges('{"featured":["realm-creator"]}');
select public.save_profile_card(public.get_profile_card()->'profile',jsonb_set(public.get_profile_card()->'card','{style,frame_id}','"realm-creator"'),0,0);
reset role;
delete from realm_private.badge_grants where user_id='71000000-0000-4000-8000-000000000001';
update public.profile_cards set badge_state='{"unlocked":{"guardian":{}},"featured":["guardian","unknown"],"pins_saved":true}' where user_id='71000000-0000-4000-8000-000000000001';
select pg_temp.badge_check(realm_private.get_user_badges('71000000-0000-4000-8000-000000000001')='{"unlocked":{},"featured":[]}','legacy forged state ignored');
rollback;
