begin;
create function pg_temp.item_assert(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'ITEM TEST FAILED: %',label;end if;end$$;
create function pg_temp.item_denied(statement text,expected text default '42501') returns void language plpgsql as $$begin
 begin execute statement;exception when others then if sqlstate=expected then return;end if;raise;end;raise exception 'Unexpected permission: %',statement;end$$;
insert into auth.users(id,email,email_confirmed_at) values
 ('10000000-0000-4000-8000-000000000001','item-owner@example.invalid',now()),
 ('20000000-0000-4000-8000-000000000002','item-friend@example.invalid',now()),
 ('30000000-0000-4000-8000-000000000003','item-other@example.invalid',now());
update realm_private.accounts set state='active';
update public.homes set privacy='friends';
insert into public.friendships(requester,addressee,status) values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','accepted');
select pg_temp.item_assert(not realm_private.valid_home_memos((select jsonb_agg(jsonb_build_object('id',lpad(n::text,8,'0')||'-0000-4000-8000-000000000000','body','Note','pinned',false,'created_at','2026-10-31T00:00:00Z','updated_at','2026-10-31T00:00:00Z')) from generate_series(1,31) n)),'31 notes rejected');
select pg_temp.item_assert(not realm_private.valid_home_memos('[{"id":"00000000-0000-4000-8000-000000000010","body":"Note","pinned":false,"created_at":"invalid","updated_at":"2026-10-31T00:00:00Z"}]'),'invalid timestamps rejected');
select pg_temp.item_assert(not has_function_privilege('anon','public.home_item_content(uuid)','execute'),'anonymous RPC denied');
select pg_temp.item_assert(not has_table_privilege('authenticated','public.home_item_content','UPDATE'),'no direct writes');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select pg_temp.item_assert((public.home_item_content(auth.uid())->>'revision')::integer=0,'default content');
select public.save_home_item_content(0,'[{"id":"00000000-0000-4000-8000-000000000010","body":"Owner sticky","pinned":true,"created_at":"2026-10-31T00:00:00Z","updated_at":"2026-10-31T00:00:00Z"}]','[{"title":"Guide","url":"https://example.com/guide"}]');
select pg_temp.item_denied($q$select public.save_home_item_content(0,'[]','[]')$q$,'PT409');
select pg_temp.item_denied($q$select public.save_home_item_content(1,'[{"id":"bad"}]','[]')$q$,'22023');
select pg_temp.item_denied($q$select public.save_home_item_content(1,'[]','[{"title":"Unsafe","url":"javascript:alert(1)"}]')$q$,'22023');
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
select pg_temp.item_assert(public.home_item_content('10000000-0000-4000-8000-000000000001')->'notes'->0->>'body'='Owner sticky','friend sees owner sticky');
select public.save_home_item_content(0,'[]','[]');
select pg_temp.item_assert(public.home_item_content('10000000-0000-4000-8000-000000000001')->'notes'->0->>'body'='Owner sticky','friend writes only own home');
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000003',true);
select pg_temp.item_denied($q$select public.home_item_content('10000000-0000-4000-8000-000000000001')$q$);
select pg_temp.item_assert((select count(*) from public.home_item_content)=0,'RLS hides outsider content');
reset role;
update public.homes set privacy='private' where owner_id='10000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
select pg_temp.item_denied($q$select public.home_item_content('10000000-0000-4000-8000-000000000001')$q$);
rollback;
