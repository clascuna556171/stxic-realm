begin;
-- Transactional multi-identity acceptance tests. Run inside BEGIN ... ROLLBACK, never retain these fixtures.
create function pg_temp.assert_ok(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'TEST FAILED: %',label;end if;end$$;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000001','realm-sql-test-1@example.invalid'),
 ('20000000-0000-4000-8000-000000000002','realm-sql-test-2@example.invalid'),
 ('30000000-0000-4000-8000-000000000003','realm-sql-test-3@example.invalid');
-- Explicitly reviewed test fixtures, never blanket admission of real Auth users.
update realm_private.accounts set state='active' where user_id in ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003');
update public.profiles set username='realm_test_alice' where id='10000000-0000-4000-8000-000000000001';
update public.profiles set username='realm_test_bob' where id='20000000-0000-4000-8000-000000000002';
update public.profiles set username='realm_test_eve' where id='30000000-0000-4000-8000-000000000003';
select pg_temp.assert_ok((select count(*)=3 from public.profiles where username like 'realm_test_%'),'automatic profile bootstrap');
select pg_temp.assert_ok(not has_table_privilege('authenticated','public.profiles','UPDATE'),'no direct profile update');
select pg_temp.assert_ok(not has_function_privilege('anon','public.get_identity()','EXECUTE'),'anonymous identity RPC denied');
select pg_temp.assert_ok(not has_function_privilege('anon','public.enter_home(uuid,uuid)','EXECUTE'),'anonymous home RPC denied');
select pg_temp.assert_ok(realm_private.valid_layout(realm_private.starter_layout()),'starter layout valid');
select pg_temp.assert_ok(not realm_private.valid_layout(jsonb_set(realm_private.starter_layout(),'{schemaVersion}','"1"')),'string schema version rejected');
select pg_temp.assert_ok(not realm_private.valid_layout(jsonb_set(realm_private.starter_layout(),'{objects,0,x}','7')),'overlap rejected');

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_ok((select count(*)=1 from public.user_themes),'private theme only visible to owner');
select pg_temp.assert_ok((select count(*)=1 from public.homes),'nonfriend home hidden');
do $$begin
 begin perform public.save_identity('realm_test_alice','Alice','',jsonb_set(public.get_identity()->'character','{skin}','"red"'),' {"accent":"sage","logo":"mist"}'::jsonb,'cozy',0);raise exception 'TEST FAILED invalid character';exception when invalid_parameter_value then null;end;
 begin insert into public.profile_appearances(user_id,character) values('20000000-0000-4000-8000-000000000002',public.get_identity()->'character');raise exception 'TEST FAILED direct impersonation';exception when insufficient_privilege then null;end;
end$$;
select public.save_identity('realm_test_alice','Alice','Hello',(public.get_identity()->'character'),'{"accent":"violet","logo":"mist"}', 'cozy',0);
select pg_temp.assert_ok(public.get_identity()->'profile'->>'display_name'='Alice','identity saved');
do $$begin
 begin perform public.save_identity('realm_test_alice','Bad','',public.get_identity()->'character','{"accent":"sage","logo":"mist"}','cozy',0);raise exception 'TEST FAILED stale profile accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.enter_home('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000011');raise exception 'TEST FAILED nonfriend entered';exception when insufficient_privilege then null;end;
end$$;
select public.request_friend('realm_test_bob');
do $$declare f uuid;begin
 select id into f from public.friendships where requester=auth.uid();
 begin perform public.respond_friend(f,'accept');raise exception 'TEST FAILED sender accepted own request';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000003',true);
select pg_temp.assert_ok((select count(*)=0 from public.friendships),'requests hidden from outsider');
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
select public.respond_friend((select id from public.friendships where addressee=auth.uid()),'accept');
select pg_temp.assert_ok((select count(*)=2 from public.homes),'friend home visible');
select pg_temp.assert_ok((select count(*)=1 from public.user_themes),'friend private theme still hidden');
select set_config('realm.test.cid',public.open_direct('10000000-0000-4000-8000-000000000001')::text,true);
select public.send_direct((select id from public.direct_conversations limit 1),'Hello Alice','20000000-0000-4000-8000-000000000022');
select public.send_direct((select id from public.direct_conversations limit 1),'Hello Alice','20000000-0000-4000-8000-000000000022');
select pg_temp.assert_ok((select count(*)=1 from public.direct_messages),'DM retry idempotent');
select public.enter_home('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000033');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.enter_home('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000044');
select pg_temp.assert_ok(jsonb_array_length(public.room_state('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000044')->'visitors')=2,'two visitors share room');
select pg_sleep(.16);
select public.move_home('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000044',8,8);
do $$begin
 begin perform public.move_home('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000044',1,1);raise exception 'TEST FAILED teleport accepted';exception when invalid_parameter_value then null;end;
 begin perform public.move_home('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000044',8,7);raise exception 'TEST FAILED speed accepted';exception when invalid_parameter_value then null;end;
end$$;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000003',true);
select pg_temp.assert_ok((select count(*)=0 from public.direct_messages),'outsider DM hidden');
select pg_temp.assert_ok((select count(*)=0 from public.home_visits),'outsider visitors hidden');
do $$begin
 begin perform public.send_direct(current_setting('realm.test.cid')::uuid,'Outsider intrusion','30000000-0000-4000-8000-000000000099');raise exception 'TEST FAILED outsider sent DM';exception when insufficient_privilege then null;end;
 begin perform public.open_direct('10000000-0000-4000-8000-000000000001');raise exception 'TEST FAILED outsider DM';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.save_home((select layout from public.homes where owner_id=auth.uid()),'private',0);
do $$begin
 begin perform public.save_home((select layout from public.homes where owner_id=auth.uid()),'friends',0);raise exception 'TEST FAILED stale home accepted';exception when sqlstate 'PT409' then null;end;
end$$;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
select pg_temp.assert_ok((select count(*)=1 from public.homes),'private home hidden from friend');
do $$begin
 begin perform public.move_home('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000033',8,8);raise exception 'TEST FAILED revoked home movement';exception when insufficient_privilege then null;end;
end$$;
select public.set_block('10000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_ok((select count(*)=0 from public.direct_messages),'block revokes DM access');
select pg_temp.assert_ok((select count(*)=0 from public.friendships),'block removes friendship');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$begin
 begin perform public.request_friend('realm_test_bob');raise exception 'TEST FAILED blocked friend request';exception when invalid_parameter_value then null;end;
end$$;
reset role;
select 'ALL SOCIAL/HOME SQL ACCEPTANCE TESTS PASSED' as result;

rollback;
