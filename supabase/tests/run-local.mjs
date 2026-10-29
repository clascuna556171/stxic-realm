// Real PostgreSQL (WASM) SQL/RLS checks. Auth/HTTP/realtime still require Supabase integration.
import {PGlite} from '@electric-sql/pglite'
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto'
import {readFile,readdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import assert from 'node:assert/strict'
const root=resolve(import.meta.dirname,'../..'),db=new PGlite({extensions:{pgcrypto}})
const setup=`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema extensions;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,encrypted_password text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 grant usage on schema auth to anon,authenticated,service_role;
 grant execute on all functions in schema auth to anon,authenticated,service_role;
 create schema storage;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema storage to authenticated,service_role;
 grant select,insert,update,delete on storage.objects to authenticated,service_role;
 create publication supabase_realtime;`
const migrations=(await readdir(resolve(root,'supabase/migrations'))).filter(f=>f.endsWith('.sql')).sort()
try{
 await db.exec(setup)
 for(const file of migrations){
  await db.exec(await readFile(resolve(root,'supabase/migrations',file),'utf8'));console.log('Applied',file)
 }
 for(const file of ['social_homes.sql','access_messaging.sql','access_boundaries.sql','world_social.sql','account_profiles.sql']){
  await db.exec(await readFile(resolve(root,'supabase/tests',file),'utf8'));console.log('PASS',file)
 }
 await db.exec(await readFile(resolve(root,'supabase/tests/integration_fixture_support.sql'),'utf8'))
 await db.exec(`begin;insert into auth.users(id,email,email_confirmed_at) values('10000000-0000-4000-8000-000000000001','fixture@example.invalid',now());select public.realm_test_fixture(array['10000000-0000-4000-8000-000000000001']::uuid[]);select public.realm_test_control('10000000-0000-4000-8000-000000000001','suspended');rollback;`)
 console.log('PASS dedicated integration fixture support')
 const upgrade=new PGlite({extensions:{pgcrypto}})
 try{
  await upgrade.exec(setup)
  for(const file of migrations.slice(0,3))await upgrade.exec(await readFile(resolve(root,'supabase/migrations',file),'utf8'))
  await upgrade.exec(`insert into auth.users(id,email,email_confirmed_at) values('10000000-0000-4000-8000-000000000001','old-owner@example.invalid',now()),('20000000-0000-4000-8000-000000000002','old-peer@example.invalid',now());
  insert into public.spaces(id,name) values('70000000-0000-4000-8000-000000000007','Legacy space'),('90000000-0000-4000-8000-000000000009','Ambiguous owner');
  insert into public.space_members(space_id,user_id,role) values('70000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000001','owner'),('70000000-0000-4000-8000-000000000007','20000000-0000-4000-8000-000000000002','member');
  insert into public.channels(id,space_id,name) values('80000000-0000-4000-8000-000000000008','70000000-0000-4000-8000-000000000007','general');
  insert into public.messages(channel_id,author_id,client_id,body) values('80000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000001',gen_random_uuid(),'Legacy message');
  insert into public.friendships(requester,addressee,status) values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','accepted');
  insert into public.direct_conversations(id,user_a,user_b) values('91000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002');
  insert into public.direct_messages(conversation_id,author_id,client_id,body) values('91000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000001',gen_random_uuid(),'Legacy own body'),('91000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000002',gen_random_uuid(),'Legacy peer body');`)
  const foundation=await readFile(resolve(root,'supabase/migrations',migrations[3]),'utf8')
  await assert.rejects(upgrade.exec(foundation),/Reconcile each existing space/)
  assert.equal((await upgrade.query("select to_regclass('realm_private.accounts') as table_name")).rows[0].table_name,null,'failed preflight rolls the whole migration back')
  await upgrade.exec("delete from public.spaces where id='90000000-0000-4000-8000-000000000009'")
  for(const file of migrations.slice(3))await upgrade.exec(await readFile(resolve(root,'supabase/migrations',file),'utf8'))
  assert.equal((await upgrade.query("select count(*)::int n from realm_private.accounts where state='invited'")).rows[0].n,2,'legacy identities require review')
  await upgrade.exec("update realm_private.accounts set state='active';update realm_private.settings set value='true' where key='administration';set role authenticated;select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false)")
  const history=(await upgrade.query("select public.message_history('channel','80000000-0000-4000-8000-000000000008') as page")).rows[0].page
  assert.equal(history.messages[0].body,'Legacy message');assert.equal(history.watermark,1)
  await upgrade.exec("select public.manage_space('transfer','70000000-0000-4000-8000-000000000007','20000000-0000-4000-8000-000000000002',p_revision=>0);reset role;delete from auth.users where id='10000000-0000-4000-8000-000000000001'")
  const bodies=(await upgrade.query('select author_id,body from public.direct_messages order by author_id nulls first')).rows
  assert.equal(bodies[0].author_id,null);assert.equal(bodies[0].body,'');assert.equal(bodies[1].body,'Legacy peer body')
  console.log('PASS legacy upgrade, atomic ownership preflight, reviewed admission, history backfill and peer-preserving deletion')
 }finally{await upgrade.close()}
}catch(e){console.error(e.message);if(e.where)console.error(e.where);if(e.position)console.error('Position',e.position);process.exitCode=1}finally{await db.close()}
