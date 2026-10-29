begin;
create function pg_temp.frame_assert(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FRAME TEST FAILED: %',label;end if;end $$;
create function pg_temp.frame_denied(statement text,expected text default '42501') returns void language plpgsql as $$begin
 begin execute statement;exception when others then if sqlstate=expected then return;end if;raise exception 'Expected %, got % (%)',expected,sqlstate,sqlerrm;end;raise exception 'FRAME TEST FAILED: permitted %',statement;
end $$;
insert into auth.users(id,email,email_confirmed_at) values('10000000-0000-4000-8000-000000000001','frame-alice@example.invalid',now()),('20000000-0000-4000-8000-000000000002','frame-bob@example.invalid',now());
update realm_private.accounts set state='active';
select pg_temp.frame_assert(realm_private.valid_profile_style(realm_private.default_profile_style()),'new defaults valid');
select pg_temp.frame_assert(realm_private.valid_profile_style(realm_private.default_profile_style()-'frame_id'-'frame_effects'),'legacy style valid');
select pg_temp.frame_assert(not realm_private.valid_profile_style(jsonb_set(realm_private.default_profile_style(),'{frame_id}','"retired"')),'unknown ID rejected');
select pg_temp.frame_assert(not realm_private.valid_profile_style(jsonb_set(realm_private.default_profile_style(),'{frame_id}','null')),'null ID rejected');
select pg_temp.frame_assert(not realm_private.valid_profile_style(jsonb_set(realm_private.default_profile_style(),'{frame_effects}','"true"')),'string effects rejected');
select pg_temp.frame_assert(not realm_private.valid_profile_style(jsonb_set(realm_private.default_profile_style(),'{avatar_shape}','"triangle"')),'invalid shape rejected');
select pg_temp.frame_assert(not realm_private.valid_profile_style(realm_private.default_profile_style()||'{"arbitrary":"style"}'),'unrelated keys rejected');
select pg_temp.frame_assert(not has_function_privilege('anon','public.save_profile_card(jsonb,jsonb,integer,integer)','EXECUTE'),'anonymous saves denied');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.save_profile_card(public.get_profile_card()->'profile',jsonb_set(jsonb_set(public.get_profile_card()->'card','{style,frame_id}','"dark-realm"'),'{status}','"Keep my profile fields"'),0,0);
select pg_temp.frame_assert(public.get_profile_card()->'card'->'style'->>'frame_id'='dark-realm','equipped and reload');
select pg_temp.frame_assert(public.get_profile_card()->'card'->>'status'='Keep my profile fields','unrelated status retained');
select pg_temp.frame_assert(public.get_identity()->'profile'->>'frame_id'='dark-realm','own identity frame projection');
select pg_temp.frame_assert((select object_path is null and frame_id='dark-realm' from public.account_portraits where user_id=auth.uid()),'initials get frame without upload');
select pg_temp.frame_denied($q$select public.save_profile_card(public.get_profile_card()->'profile',public.get_profile_card()->'card',0,0)$q$,'PT409');
select pg_temp.frame_denied($q$select public.save_profile_card(public.get_profile_card()->'profile',jsonb_set(public.get_profile_card()->'card','{style,frame_id}','"invalid"'),1,1)$q$,'22023');
-- Legacy full-card saves preserve the equipped ID and effects preference.
select public.save_profile_card(public.get_profile_card()->'profile',jsonb_set(public.get_profile_card()->'card','{style}',(public.get_profile_card()->'card'->'style')-'frame_id'-'frame_effects'),1,1);
select pg_temp.frame_assert(public.get_profile_card()->'card'->'style'->>'frame_id'='dark-realm','legacy save retains frame');
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
select pg_temp.frame_assert((select frame_id='dark-realm' from public.account_portraits where user_id='10000000-0000-4000-8000-000000000001'),'other member sees frame');
select pg_temp.frame_denied($q$update public.profile_cards set style=jsonb_set(style,'{frame_id}','"none"') where user_id='10000000-0000-4000-8000-000000000001'$q$);
-- Forged card owner IDs are ignored: the RPC always saves auth.uid().
select public.save_profile_card(public.get_profile_card()->'profile',jsonb_set(jsonb_set(public.get_profile_card()->'card','{user_id}','"10000000-0000-4000-8000-000000000001"'),'{style,frame_id}','"cozy-friends"'),0,0);
select pg_temp.frame_assert(public.get_profile_card()->'card'->'style'->>'frame_id'='cozy-friends','RPC targets caller only');
select pg_temp.frame_assert((select frame_id='dark-realm' from public.account_portraits where user_id='10000000-0000-4000-8000-000000000001'),'forged owner cannot change Alice');
select public.set_block('10000000-0000-4000-8000-000000000001',true);
select pg_temp.frame_assert(not exists(select 1 from public.account_portraits where user_id='10000000-0000-4000-8000-000000000001'),'block hides cosmetics');
reset role;
rollback;
