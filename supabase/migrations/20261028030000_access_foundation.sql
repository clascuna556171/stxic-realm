-- Admission is a database decision, including for already-issued JWTs.
-- No identity is automatically admitted. See docs/ACCESS_OPERATIONS.md for reviewed bootstrap.
create schema if not exists extensions;
alter extension pgcrypto set schema extensions;
create table realm_private.accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state text not null default 'invited' check(state in ('invited','active','suspended','deleting')),
 suspended_until timestamptz, updated_at timestamptz not null default now()
);
insert into realm_private.accounts(user_id) select id from auth.users;
create table realm_private.platform_admins(user_id uuid primary key references auth.users(id) on delete cascade);
create table realm_private.settings(key text primary key,value jsonb not null);
insert into realm_private.settings values
 ('administration','false'),('account_invitations','false'),('privacy_jobs','false'),
 ('pilot_accounts','5'),('send_burst','10'),('send_minute','120'),('friend_hour','30'),
 ('invite_hour','5'),('invite_pending','20'),('account_invite_day','10'),('report_hour','5'),
 ('owned_spaces','2'),('channels','10'),('export_bytes','5242880'),('export_rows','10000');
create table realm_private.audit (
 id uuid primary key default gen_random_uuid(), actor uuid, action text not null, target uuid,
 scope uuid, created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default clock_timestamp()+interval '90 days'
);
create table realm_private.usage_events(actor uuid not null,operation text not null,created_at timestamptz not null default clock_timestamp());
create index usage_actor_time on realm_private.usage_events(actor,operation,created_at);
create table realm_private.restrictions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 space_id uuid not null references public.spaces(id) on delete cascade,
 channel_id uuid references public.channels(id) on delete cascade,
 kind text not null check(kind in ('mute','ban')), reason text not null check(length(trim(reason)) between 1 and 500),
 issuer uuid, expires_at timestamptz not null, revoked_at timestamptz,
 created_at timestamptz not null default clock_timestamp(),retained_until timestamptz not null default clock_timestamp()+interval '90 days'
);
create function realm_private.active_account(p_user uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from realm_private.accounts where user_id=p_user and
 (state='active' or (state='suspended' and suspended_until<=now())))
$$;
create function realm_private.require_active() returns void language plpgsql security definer set search_path='' as $$
begin
 if not realm_private.active_account() then raise exception 'Account access is unavailable. You can still request recovery or manage your data.' using errcode='42501';end if;
end $$;
create function realm_private.platform_admin() returns boolean language sql stable security definer set search_path='' as $$
 select realm_private.active_account() and exists(select 1 from realm_private.platform_admins where user_id=auth.uid())
$$;
create function realm_private.setting(p_key text) returns integer language plpgsql stable security definer set search_path='' as $$
declare result integer;begin
 select (value::text)::integer into result from realm_private.settings where key=p_key;
 if result is null or result<=0 then raise exception 'Server limit configuration is unavailable.' using errcode='42501';end if;
 return result;
end
$$;
create function realm_private.feature(p_key text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from realm_private.settings where key=p_key and value='true') then raise exception 'This feature is awaiting operator setup and verification.' using errcode='42501';end if;
end $$;
create function realm_private.log(p_action text,p_target uuid default null,p_scope uuid default null) returns void language sql security definer set search_path='' as $$
 insert into realm_private.audit(actor,action,target,scope) values(auth.uid(),p_action,p_target,p_scope)
$$;
create function realm_private.charge(p_operation text,p_limit integer,p_seconds integer) returns void language plpgsql security definer set search_path='' as $$
declare retry integer;
begin
 -- One account lock serializes all its quota checks across channels and DMs.
 perform 1 from realm_private.accounts where user_id=auth.uid() for update;
 delete from realm_private.usage_events where actor=auth.uid() and operation=p_operation and created_at<=clock_timestamp()-make_interval(secs=>p_seconds);
 if (select count(*) from realm_private.usage_events where actor=auth.uid() and operation=p_operation and created_at>clock_timestamp()-make_interval(secs=>p_seconds))>=p_limit then
 select greatest(1,ceil(extract(epoch from min(created_at)+make_interval(secs=>p_seconds)-clock_timestamp()))::integer) into retry
 from realm_private.usage_events where actor=auth.uid() and operation=p_operation and created_at>clock_timestamp()-make_interval(secs=>p_seconds);
 raise sqlstate 'PT429' using message='Limit reached. Please try again later.',detail=json_build_object('retry_after',retry)::text;
 end if;
 insert into realm_private.usage_events(actor,operation) values(auth.uid(),p_operation);
end $$;
create function realm_private.new_account() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into realm_private.accounts(user_id) values(new.id);return new;end $$;
create trigger realm_admission after insert on auth.users for each row execute function realm_private.new_account();

-- Restrictive policies compose with existing permissive policies; no old REST path is exempt.
do $$declare t text;begin
 foreach t in array array['spaces','space_members','channels','messages','profiles','profile_appearances','user_themes','friendships','user_blocks','direct_conversations','direct_messages','homes','home_visits'] loop
 execute format('create policy admitted_accounts on public.%I as restrictive to authenticated using (realm_private.active_account()) with check (realm_private.active_account())',t);
 end loop;
end $$;
-- Guard the legacy SECURITY DEFINER entry points as well as direct table access.
do $$declare f record; definition text;begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='realm_private'
 and p.proname in ('get_identity','save_identity','request_friend','respond_friend','set_block','open_direct','save_home','room_state','enter_home','move_home') loop
 definition:=pg_get_functiondef(f.oid);
 definition:=regexp_replace(definition,'\mbegin\M','begin perform realm_private.require_active();','i');
 if f.oid='realm_private.request_friend(text)'::regprocedure then definition:=replace(definition,'target is null or target=auth.uid()','target is null or not realm_private.active_account(target) or target=auth.uid()');end if;
 if f.oid='realm_private.respond_friend(uuid,text)'::regprocedure then definition:=replace(definition,'and not realm_private.blocked_pair(f.requester,f.addressee) then','and realm_private.active_account(f.requester) and realm_private.active_account(f.addressee) and not realm_private.blocked_pair(f.requester,f.addressee) then');end if;
 execute definition;
 end loop;
end $$;
create or replace function realm_private.are_friends(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$
 select realm_private.active_account(a) and realm_private.active_account(b) and not realm_private.blocked_pair(a,b) and exists(
 select 1 from public.friendships where status='accepted' and least(requester,addressee)=least(a,b) and greatest(requester,addressee)=greatest(a,b))
$$;
create or replace function realm_private.profile_visible(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select realm_private.active_account() and realm_private.active_account(target) and not realm_private.blocked_pair(auth.uid(),target)
$$;
create or replace function realm_private.can_visit(owner_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select realm_private.active_account() and realm_private.active_account(owner_id) and exists(select 1 from public.homes h where h.owner_id=$1 and
 (h.owner_id=auth.uid() or (h.privacy='friends' and realm_private.are_friends(auth.uid(),h.owner_id))))
$$;
create or replace function realm_private.leave_home(p_token uuid) returns void language plpgsql security definer set search_path='' as $$
begin perform realm_private.require_active();delete from public.home_visits where user_id=auth.uid() and token=p_token;end $$;
-- Keep the original pending limit, with an atomic hourly creation budget.
do $$declare definition text;begin
 definition:=pg_get_functiondef('realm_private.request_friend(text)'::regprocedure);
 execute replace(definition,'insert into public.friendships(requester,addressee)',
 'perform realm_private.charge(''friend'',realm_private.setting(''friend_hour''),3600); insert into public.friendships(requester,addressee)');
end $$;

alter table public.spaces add column archived_at timestamptz,add column revision integer not null default 0;
alter table public.channels add column archived_at timestamptz,add column revision integer not null default 0;
alter table public.space_members drop constraint space_members_role_check;
alter table public.space_members add constraint space_members_role_check check(role in ('owner','admin','moderator','member'));
-- Do not arbitrarily select an owner in ambiguous existing data.
do $$begin
 if exists(select 1 from public.spaces s where (select count(*) from public.space_members m where m.space_id=s.id and m.role='owner')<>1) then
 raise exception 'Reconcile each existing space to exactly one reviewed owner before applying this migration.';
 end if;
end $$;
create unique index one_space_owner on public.space_members(space_id) where role='owner';
create function realm_private.role_rank(p_role text) returns integer language sql immutable set search_path='' as $$
 select case p_role when 'owner' then 4 when 'admin' then 3 when 'moderator' then 2 when 'member' then 1 else 0 end
$$;
create function realm_private.space_role(p_space uuid,p_user uuid default auth.uid()) returns text language sql stable security definer set search_path='' as $$
 select role from public.space_members where space_id=p_space and user_id=p_user and realm_private.active_account(p_user)
 and not exists(select 1 from realm_private.restrictions where space_id=p_space and user_id=p_user and kind='ban' and revoked_at is null and expires_at>now())
$$;
create function realm_private.require_space(p_space uuid,p_rank integer default 1,p_write boolean default false) returns text language plpgsql security definer set search_path='' as $$
declare r text;begin
 perform realm_private.require_active();
 perform 1 from public.spaces where id=p_space for share;
 r:=realm_private.space_role(p_space);
 if realm_private.role_rank(r)<p_rank or (p_write and exists(select 1 from public.spaces where id=p_space and archived_at is not null)) then
 raise exception 'Space unavailable or permission changed.' using errcode='42501';end if;
 return r;
end $$;
create policy space_access on public.spaces as restrictive for select to authenticated using(realm_private.space_role(id) is not null);
create policy channel_access on public.channels as restrictive for select to authenticated using(realm_private.space_role(space_id) is not null);
create policy channel_message_access on public.messages as restrictive for select to authenticated using(
 exists(select 1 from public.channels c where c.id=channel_id and realm_private.space_role(c.space_id) is not null) and not realm_private.blocked_pair(auth.uid(),author_id));

create function realm_private.guard_send() returns trigger language plpgsql security definer set search_path='' as $$
declare s uuid;begin
 if auth.uid() is null or new.author_id is distinct from auth.uid() then raise exception 'Message author must be the current account.' using errcode='42501';end if;
 perform 1 from realm_private.accounts where user_id=auth.uid() for update;
 perform realm_private.require_active();
 if tg_table_name='messages' then
 select space_id into s from public.channels where id=new.channel_id;
 perform realm_private.require_space(s,1,true);
 if exists(select 1 from public.channels where id=new.channel_id and archived_at is not null)
 or exists(select 1 from realm_private.restrictions where user_id=auth.uid() and space_id=s and (channel_id is null or channel_id=new.channel_id) and kind='mute' and revoked_at is null and expires_at>now()) then
 raise exception 'This channel is read-only or you are muted.' using errcode='42501';end if;
 else
 if not realm_private.can_dm(new.conversation_id) then raise exception 'Conversation unavailable.' using errcode='42501';end if;
 end if;
 perform realm_private.charge('send_burst',realm_private.setting('send_burst'),10);
 perform realm_private.charge('send_minute',realm_private.setting('send_minute'),60);
 new.body:=trim(new.body);return new;
end $$;
create trigger enforce_channel_send before insert on public.messages for each row execute function realm_private.guard_send();
create trigger enforce_direct_send before insert on public.direct_messages for each row execute function realm_private.guard_send();

-- All new private objects are inaccessible over REST; allow only specifically selected helpers.
revoke all on all tables in schema realm_private from public,anon,authenticated;
revoke all on all functions in schema realm_private from public,anon,authenticated;
grant execute on function realm_private.active_account(uuid),realm_private.profile_visible(uuid),realm_private.can_visit(uuid),realm_private.can_dm(uuid),realm_private.space_role(uuid,uuid),realm_private.blocked_pair(uuid,uuid) to authenticated;
-- Existing public invoker wrappers still need EXECUTE on their narrowly scoped implementations.
do $$declare f record;begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='realm_private'
 and p.proname in ('get_identity','save_identity','request_friend','respond_friend','set_block','open_direct','send_direct','save_home','room_state','enter_home','move_home','leave_home') loop
 execute format('grant execute on function %s to authenticated',f.signature);end loop;
end $$;
