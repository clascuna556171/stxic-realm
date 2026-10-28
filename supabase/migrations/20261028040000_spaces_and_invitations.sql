create table realm_private.membership_invites (
 id uuid primary key default gen_random_uuid(),space_id uuid not null references public.spaces(id) on delete cascade,
 target uuid not null references auth.users(id) on delete cascade,issuer uuid not null,email_hash text not null,
 token_hash text not null unique, expires_at timestamptz not null default now()+interval '7 days',
 accepted_at timestamptz,revoked_at timestamptz,created_at timestamptz not null default clock_timestamp()
);
create table realm_private.account_invites (
 id uuid primary key default gen_random_uuid(),email text not null,issuer uuid not null,
 user_id uuid references auth.users(id) on delete set null,token_hash text not null unique,
 expires_at timestamptz not null default now()+interval '7 days',accepted_at timestamptz,revoked_at timestamptz,
 delivery text not null default 'pending' check(delivery in ('pending','sent','failed')),created_at timestamptz not null default clock_timestamp()
);
create index member_invites_pending on realm_private.membership_invites(space_id,expires_at) where accepted_at is null and revoked_at is null;
-- Exact ownership is a deferred invariant so a transactional transfer has no ownerless commit.
create function realm_private.owner_invariant() returns trigger language plpgsql security definer set search_path='' as $$
declare s uuid;begin
 s:=coalesce(to_jsonb(new)->>'space_id',to_jsonb(old)->>'space_id',to_jsonb(new)->>'id',to_jsonb(old)->>'id')::uuid;
 if exists(select 1 from public.spaces where id=s) and (select count(*) from public.space_members where space_id=s and role='owner')<>1 then
 raise exception 'A space must have exactly one owner.' using errcode='23514';end if;
 return null;
end $$;
create constraint trigger keep_space_owner after insert or update or delete on public.space_members deferrable initially deferred for each row execute function realm_private.owner_invariant();
create constraint trigger create_space_owner after insert on public.spaces deferrable initially deferred for each row execute function realm_private.owner_invariant();

create function realm_private.manage_space(p_action text,p_space uuid default null,p_target uuid default null,p_name text default null,p_role text default null,p_revision integer default null) returns uuid language plpgsql security definer set search_path='' as $$
declare r text;target_role text;result uuid;current_revision integer;begin
 perform realm_private.require_active();perform realm_private.feature('administration');
 if p_action='create' then
 perform 1 from realm_private.accounts where user_id=auth.uid() for update;
 if (select count(*) from public.space_members where user_id=auth.uid() and role='owner')>=realm_private.setting('owned_spaces') then raise sqlstate 'PT429' using message='Owned space limit reached.';end if;
 insert into public.spaces(name) values(trim(p_name)) returning id into result;
 insert into public.space_members(space_id,user_id,role) values(result,auth.uid(),'owner');
 insert into public.channels(space_id,name) values(result,'general');
 else
 select revision into current_revision from public.spaces where id=p_space for update;
 r:=realm_private.require_space(p_space,1,false);result:=p_space;
 if p_action='leave' then
 if r='owner' then raise exception 'Transfer ownership before leaving.' using errcode='42501';end if;
 delete from public.space_members where space_id=p_space and user_id=auth.uid();
 update realm_private.membership_invites set revoked_at=clock_timestamp() where space_id=p_space and issuer=auth.uid() and accepted_at is null;
 else
 if realm_private.role_rank(r)<3 then raise exception 'Space administration required.' using errcode='42501';end if;
 if current_revision is distinct from p_revision then raise sqlstate 'PT409' using message='Space changed. Reload before managing it.';end if;
 if p_action='rename' then update public.spaces set name=trim(p_name) where id=p_space;
 elsif p_action in ('archive','restore') then
 if r<>'owner' then raise exception 'Only the owner can archive a space.' using errcode='42501';end if;
 update public.spaces set archived_at=case when p_action='archive' then clock_timestamp() else null end where id=p_space;
 elsif p_action in ('role','remove','transfer') then
 perform realm_private.require_space(p_space,3,true);
 select role into target_role from public.space_members where space_id=p_space and user_id=p_target;
 if p_target=auth.uid() or target_role is null or realm_private.role_rank(target_role)>=realm_private.role_rank(r) then raise exception 'Cannot manage this member.' using errcode='42501';end if;
 if p_action='transfer' then
 if r<>'owner' or not realm_private.active_account(p_target) then raise exception 'Only the owner can transfer to an active member.' using errcode='42501';end if;
 if (select count(*) from public.space_members where user_id=p_target and role='owner')>=realm_private.setting('owned_spaces') then raise sqlstate 'PT429' using message='Recipient owned-space limit reached.';end if;
 update public.space_members set role='admin' where space_id=p_space and user_id=auth.uid();
 update public.space_members set role='owner' where space_id=p_space and user_id=p_target;
 elsif p_action='remove' then
 delete from public.space_members where space_id=p_space and user_id=p_target;
 update realm_private.membership_invites set revoked_at=clock_timestamp() where space_id=p_space and (target=p_target or issuer=p_target) and accepted_at is null;
 else
 if p_role is null or p_role not in ('member','moderator','admin') or (p_role='admin' and r<>'owner') then raise exception 'Invalid role assignment.' using errcode='42501';end if;
 update public.space_members set role=p_role where space_id=p_space and user_id=p_target;
 if realm_private.role_rank(p_role)<3 then update realm_private.membership_invites set revoked_at=clock_timestamp() where space_id=p_space and issuer=p_target and accepted_at is null;end if;
 end if;
 else raise exception 'Unknown space action.' using errcode='22023';end if;
 update public.spaces set revision=revision+1 where id=p_space;
 end if;
 end if;
 perform realm_private.log('space.'||p_action,p_target,result);return result;
end $$;
create function realm_private.manage_channel(p_action text,p_space uuid,p_channel uuid default null,p_name text default null,p_revision integer default null) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;c public.channels;begin
 perform realm_private.feature('administration');
 perform 1 from public.spaces where id=p_space for update;
 perform realm_private.require_space(p_space,3,true);
 if p_action='create' then
 if (select count(*) from public.channels where space_id=p_space and archived_at is null)>=realm_private.setting('channels') then raise sqlstate 'PT429' using message='Active channel limit reached.';end if;
 insert into public.channels(space_id,name) values(p_space,trim(p_name)) returning id into result;
 else
 select * into c from public.channels where id=p_channel and space_id=p_space for update;
 if not found then raise exception 'Channel unavailable.' using errcode='42501';end if;
 if c.revision is distinct from p_revision then raise sqlstate 'PT409' using message='Channel changed. Reload before saving.';end if;
 if p_action='rename' then update public.channels set name=trim(p_name),revision=revision+1 where id=c.id;
 elsif p_action in ('archive','restore') then
 if p_action='restore' and (select count(*) from public.channels where space_id=p_space and archived_at is null)>=realm_private.setting('channels') then raise sqlstate 'PT429' using message='Active channel limit reached.';end if;
 update public.channels set archived_at=case when p_action='archive' then clock_timestamp() else null end,revision=revision+1 where id=c.id;
 else raise exception 'Unknown channel action.' using errcode='22023';end if;
 result:=c.id;
 end if;
 perform realm_private.log('channel.'||p_action,result,p_space);return result;
end $$;
create function realm_private.space_admin_data(p_space uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform realm_private.require_space(p_space,1);
 return jsonb_build_object('members',(select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'name',p.display_name,'username',p.username) order by m.created_at),'[]') from public.space_members m join public.profiles p on p.id=m.user_id where space_id=p_space),
 'invites',case when realm_private.role_rank(realm_private.space_role(p_space))>=3 then (select coalesce(jsonb_agg(jsonb_build_object('id',id,'target',target,'expires_at',expires_at,'accepted_at',accepted_at,'revoked_at',revoked_at)),'[]') from realm_private.membership_invites where space_id=p_space and created_at>now()-interval '7 days') else '[]'::jsonb end,
 'restrictions',case when realm_private.role_rank(realm_private.space_role(p_space))>=2 then (select coalesce(jsonb_agg(to_jsonb(r)),'[]') from realm_private.restrictions r where space_id=p_space and expires_at>now() and revoked_at is null) else '[]'::jsonb end);
end $$;
create function realm_private.membership_invite(p_action text,p_space uuid default null,p_email text default null,p_token text default null,p_invite uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare target_id uuid;token text;i realm_private.membership_invites;begin
 perform realm_private.require_active();perform realm_private.feature('administration');
 if p_action='redeem' then
 select * into i from realm_private.membership_invites where token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
 if i.id is null then raise exception 'Invitation unavailable.' using errcode='42501';end if;
 perform 1 from public.spaces where id=i.space_id for update;
 select * into i from realm_private.membership_invites where id=i.id for update;
 if not found or i.target<>auth.uid() or i.accepted_at is not null or i.revoked_at is not null or i.expires_at<=now() then raise exception 'Invitation unavailable.' using errcode='42501';end if;
 if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null and encode(extensions.digest(lower(email),'sha256'),'hex')=i.email_hash) or realm_private.role_rank(realm_private.space_role(i.space_id,i.issuer))<3 or realm_private.blocked_pair(i.issuer,auth.uid())
 or exists(select 1 from public.spaces where id=i.space_id and archived_at is not null) or exists(select 1 from realm_private.restrictions where user_id=auth.uid() and space_id=i.space_id and kind='ban' and revoked_at is null and expires_at>now()) then raise exception 'Invitation unavailable.' using errcode='42501';end if;
 insert into public.space_members(space_id,user_id) values(i.space_id,auth.uid()) on conflict do nothing;
 update realm_private.membership_invites set accepted_at=clock_timestamp() where id=i.id;
 perform realm_private.log('membership.redeem',i.id,i.space_id);return jsonb_build_object('space_id',i.space_id);
 end if;
 perform 1 from realm_private.accounts where user_id=auth.uid() for update;
 perform 1 from public.spaces where id=p_space for update;
 perform realm_private.require_space(p_space,3,true);
 if p_action='revoke' then
 update realm_private.membership_invites set revoked_at=clock_timestamp() where id=p_invite and space_id=p_space and accepted_at is null;
 perform realm_private.log('membership.revoke',p_invite,p_space);return '{}';
 end if;
 if p_action<>'create' then raise exception 'Unknown invitation action.' using errcode='22023';end if;
 select id into target_id from auth.users where lower(email)=lower(trim(p_email)) and email_confirmed_at is not null;
 if target_id is null or not realm_private.active_account(target_id) or realm_private.blocked_pair(auth.uid(),target_id)
 or exists(select 1 from public.space_members where space_id=p_space and user_id=target_id)
 or exists(select 1 from realm_private.restrictions where user_id=target_id and space_id=p_space and kind='ban' and revoked_at is null and expires_at>now()) then raise exception 'This account cannot receive your invitation.' using errcode='42501';end if;
 perform realm_private.charge('membership_invite',realm_private.setting('invite_hour'),3600);
 if exists(select 1 from realm_private.membership_invites where issuer=auth.uid() and target=target_id and created_at>clock_timestamp()-interval '60 seconds') then raise sqlstate 'PT429' using message='Wait a minute before replacing this invitation.';end if;
 update realm_private.membership_invites set revoked_at=clock_timestamp() where space_id=p_space and target=target_id and accepted_at is null and revoked_at is null;
 if (select count(*) from realm_private.membership_invites where space_id=p_space and accepted_at is null and revoked_at is null and expires_at>now())>=realm_private.setting('invite_pending') then raise sqlstate 'PT429' using message='Space has too many pending invitations.';end if;
 token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into realm_private.membership_invites(space_id,target,issuer,email_hash,token_hash) values(p_space,target_id,auth.uid(),encode(extensions.digest(lower(trim(p_email)),'sha256'),'hex'),encode(extensions.digest(token,'sha256'),'hex')) returning * into i;
 perform realm_private.log('membership.create',i.id,p_space);
 return jsonb_build_object('id',i.id,'token',token,'expires_at',i.expires_at);
end $$;

-- One JSON command keeps the exposed API narrow. Sensitive Auth operations are service-only below.
create function realm_private.access_status() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required.' using errcode='42501';end if;
 return jsonb_build_object('active',realm_private.active_account(),'state',(select state from realm_private.accounts where user_id=auth.uid()),'platform_admin',realm_private.platform_admin(),
 'administration',(select value from realm_private.settings where key='administration'),'account_invitations',(select value from realm_private.settings where key='account_invitations'),'privacy_jobs',(select value from realm_private.settings where key='privacy_jobs'));
end $$;
create function realm_private.accept_account(p_token text) returns void language plpgsql security definer set search_path='' as $$
declare i realm_private.account_invites;u auth.users;begin
 perform realm_private.feature('account_invitations');
 select * into u from auth.users where id=auth.uid();
 select * into i from realm_private.account_invites where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
 if i.id is null or i.revoked_at is not null or i.accepted_at is not null or i.expires_at<=now() or u.id is null
 or u.email_confirmed_at is null or coalesce(u.encrypted_password,'')='' or lower(u.email)<>lower(i.email) or i.user_id is distinct from u.id
 or not realm_private.active_account(i.issuer) or not exists(select 1 from realm_private.platform_admins where user_id=i.issuer)
 or not exists(select 1 from realm_private.accounts where user_id=u.id and state='invited') then raise exception 'Invitation unavailable. Contact your administrator.' using errcode='42501';end if;
 update realm_private.accounts set state='active',updated_at=clock_timestamp() where user_id=u.id;
 update realm_private.account_invites set accepted_at=clock_timestamp() where id=i.id;
 perform realm_private.log('account.accept',i.id);
end $$;

do $$declare f record;args text;call_args text;begin
 for f in select p.oid,p.proname,pg_get_function_identity_arguments(p.oid) identity_args,pg_get_function_arguments(p.oid) args,pg_get_function_result(p.oid) result from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='realm_private' and p.proname in ('manage_space','manage_channel','space_admin_data','membership_invite','access_status','accept_account') loop
 select string_agg(quote_ident(a),',') into call_args from unnest((select proargnames from pg_proc where oid=f.oid)) a;
 execute format('create function public.%I(%s) returns %s language sql security invoker set search_path='''' as $fn$ select realm_private.%I(%s) $fn$',f.proname,f.args,f.result,f.proname,coalesce(call_args,''));
 execute format('revoke all on function public.%I(%s),realm_private.%I(%s) from public,anon',f.proname,f.identity_args,f.proname,f.identity_args);
 execute format('grant execute on function public.%I(%s),realm_private.%I(%s) to authenticated',f.proname,f.identity_args,f.proname,f.identity_args);
 end loop;
end $$;
revoke all on realm_private.membership_invites,realm_private.account_invites from public,anon,authenticated;
