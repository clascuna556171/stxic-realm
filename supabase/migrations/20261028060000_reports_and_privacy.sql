create table realm_private.reports (
 id uuid primary key default gen_random_uuid(), reporter uuid not null,target_user uuid not null,
 kind text not null check(kind in ('channel','direct','user')),stream_id uuid,message_id uuid,space_id uuid,
 reason text not null check(reason in ('harassment','spam','threat','other')),note text not null default '' check(length(note)<=500),
 evidence text not null default '' check(length(evidence)<=4000),
 status text not null default 'open' check(status in ('open','reviewing','actioned','dismissed')),
 revision integer not null default 0,reviewer uuid,review_reason text check(length(review_reason)<=500),created_at timestamptz not null default clock_timestamp(),
 closed_at timestamptz,expires_at timestamptz not null default clock_timestamp()+interval '90 days'
);
create unique index open_report_dedupe on realm_private.reports(reporter,kind,coalesce(message_id,target_user)) where status in ('open','reviewing');
create table realm_private.privacy_jobs (
 id uuid primary key default gen_random_uuid(),user_id uuid not null,
 kind text not null check(kind in ('export','delete')),status text not null default 'pending' check(status in ('pending','processing','ready','completed','cancelled','failed','expired')),
 created_at timestamptz not null default clock_timestamp(),not_before timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default clock_timestamp()+interval '7 days',attempts integer not null default 0,
 close_spaces boolean not null default false,error text
);
create unique index one_pending_privacy_job on realm_private.privacy_jobs(user_id,kind) where status in ('pending','processing','ready');
create table realm_private.export_artifacts (
 job_id uuid primary key references realm_private.privacy_jobs(id) on delete cascade,user_id uuid not null,
 content jsonb not null,expires_at timestamptz not null default clock_timestamp()+interval '15 minutes'
);
-- Preserve peer messages and shared stream tombstones before exposing account deletion.
alter table public.messages alter column author_id drop not null;
alter table public.messages drop constraint messages_author_id_fkey;
alter table public.messages add foreign key(author_id) references auth.users(id) on delete set null;
alter table public.direct_messages alter column author_id drop not null;
alter table public.direct_messages drop constraint direct_messages_author_id_fkey;
alter table public.direct_messages add foreign key(author_id) references public.profiles(id) on delete set null;
alter table public.direct_conversations alter column user_a drop not null,alter column user_b drop not null;
alter table public.direct_conversations drop constraint direct_conversations_user_a_fkey,drop constraint direct_conversations_user_b_fkey;
alter table public.direct_conversations add foreign key(user_a) references public.profiles(id) on delete set null,add foreign key(user_b) references public.profiles(id) on delete set null;
alter table public.spaces add column closed_at timestamptz;
create or replace function realm_private.owner_invariant() returns trigger language plpgsql security definer set search_path='' as $$
declare s uuid;begin
 s:=coalesce(to_jsonb(new)->>'space_id',to_jsonb(old)->>'space_id',to_jsonb(new)->>'id',to_jsonb(old)->>'id')::uuid;
 if exists(select 1 from public.spaces where id=s and closed_at is null) and (select count(*) from public.space_members where space_id=s and role='owner')<>1 then raise exception 'A space must have exactly one owner.' using errcode='23514';end if;
 return null;
end $$;
-- Closed spaces cannot be restored, renamed or administered, but members retain authorized history.
do $$declare d text;begin
 d:=pg_get_functiondef('realm_private.manage_space(text,uuid,uuid,text,text,integer)'::regprocedure);
 execute replace(d,'r:=realm_private.require_space(p_space,1,false);result:=p_space;',
 'r:=realm_private.require_space(p_space,1,false);result:=p_space; if p_action<>''leave'' and exists(select 1 from public.spaces where id=p_space and closed_at is not null) then raise exception ''This space is permanently closed.'' using errcode=''42501'';end if;');
end $$;
create function realm_private.submit_report(p_kind text,p_stream uuid default null,p_message uuid default null,p_user uuid default null,p_reason text default 'other',p_note text default '',p_block boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid;evidence text;scope uuid;r uuid;begin
 perform realm_private.require_active();
 perform realm_private.feature('administration');
 perform 1 from realm_private.accounts where user_id=auth.uid() for update;
 select id,target_user into r,target from realm_private.reports where reporter=auth.uid() and kind=p_kind and coalesce(message_id,target_user)=coalesce(p_message,p_user) and status in ('open','reviewing') and expires_at>now();
 if r is not null then if p_block and exists(select 1 from public.profiles where id=target) then perform realm_private.set_block(target,true);end if;return r;end if;
 if p_kind in ('channel','direct') then
 perform realm_private.require_stream(p_kind,p_stream);
 if p_kind='channel' then
 select m.author_id,m.body,c.space_id into target,evidence,scope from public.messages m join public.channels c on c.id=m.channel_id where m.id=p_message and m.channel_id=p_stream and m.removed_at is null and not realm_private.blocked_pair(auth.uid(),m.author_id);
 else select author_id,body into target,evidence from public.direct_messages where id=p_message and conversation_id=p_stream and removed_at is null;end if;
 elsif p_kind='user' then
 if not realm_private.profile_visible(p_user) then raise exception 'Account unavailable.' using errcode='42501';end if;
 target:=p_user;evidence:='';
 else raise exception 'Invalid report type.' using errcode='22023';end if;
 if target is null or target=auth.uid() then raise exception 'Report target is unavailable.' using errcode='42501';end if;
 -- Complaints about space staff are platform cases, never visible to that staff queue.
 if scope is not null and realm_private.role_rank(realm_private.space_role(scope,target))>=2 then scope:=null;end if;
 delete from realm_private.reports where reporter=auth.uid() and expires_at<=now();
 select id into r from realm_private.reports where reporter=auth.uid() and kind=p_kind and coalesce(message_id,target_user)=coalesce(p_message,target) and status in ('open','reviewing') and expires_at>now();
 if r is null then
 perform realm_private.charge('report',realm_private.setting('report_hour'),3600);
 insert into realm_private.reports(reporter,target_user,kind,stream_id,message_id,space_id,reason,note,evidence)
 values(auth.uid(),target,p_kind,p_stream,p_message,scope,p_reason,trim(p_note),coalesce(evidence,'')) returning id into r;
 perform realm_private.log('report.create',r,scope);
 end if;
 -- Capture authorized evidence BEFORE blocking revokes friendship/DM access.
 if p_block then perform realm_private.set_block(target,true);end if;
 return r;
end $$;
create function realm_private.report_queue(p_space uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform realm_private.require_active();
 perform realm_private.feature('administration');
 if p_space is null then if not realm_private.platform_admin() then raise exception 'Platform review required.' using errcode='42501';end if;
 else perform realm_private.require_space(p_space,2);end if;
 return (select coalesce(jsonb_agg(to_jsonb(q)||jsonb_build_object('space_id',case when p_space is null then null else q.space_id end) order by (q.status in ('open','reviewing')) desc,q.created_at),'[]') from (select r.* from realm_private.reports r where
 case when p_space is null then r.space_id is null or realm_private.role_rank(realm_private.space_role(r.space_id,r.target_user))>=2
 else r.space_id=p_space and realm_private.role_rank(realm_private.space_role(r.space_id,r.target_user))<2 end
 and expires_at>now() order by (r.status in ('open','reviewing')) desc,r.created_at limit 100) q);
end $$;
create function realm_private.review_report(p_report uuid,p_revision integer,p_action text,p_reason text,p_hours integer default 24,p_channel uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare r realm_private.reports;rank integer;target_rank integer;rerouted boolean:=false;begin
 perform realm_private.require_active();
 perform realm_private.feature('administration');
 select * into r from realm_private.reports where id=p_report and expires_at>now() for update;
 if not found then raise exception 'Report unavailable.' using errcode='42501';end if;
 if r.space_id is not null and realm_private.role_rank(realm_private.space_role(r.space_id,r.target_user))>=2 then r.space_id:=null;rerouted:=true;end if;
 if r.space_id is null then
 if not realm_private.platform_admin() then raise exception 'Platform review required.' using errcode='42501';end if;rank:=5;
 else
 perform 1 from public.spaces where id=r.space_id for update;
 rank:=realm_private.role_rank(realm_private.require_space(r.space_id,2));
 end if;
 if r.revision is distinct from p_revision or r.status in ('actioned','dismissed') or (r.reviewer is not null and r.reviewer<>auth.uid() and not rerouted) then raise sqlstate 'PT409' using message='Another reviewer changed or claimed this case.';end if;
 if length(trim(coalesce(p_reason,''))) not between 1 and 500 then raise exception 'Give a reason (1–500 characters).' using errcode='22023';end if;
 target_rank:=realm_private.role_rank(realm_private.space_role(r.space_id,r.target_user));
 if p_action not in ('claim','dismiss') and (r.target_user=auth.uid() or (r.space_id is not null and target_rank>=rank) or (r.space_id is null and exists(select 1 from realm_private.platform_admins where user_id=r.target_user))) then raise exception 'Cannot act against this administrative authority.' using errcode='42501';end if;
 if p_action='remove' then
 if r.message_id is null then raise exception 'This report has no message.' using errcode='22023';end if;
 perform 1 from realm_private.streams where kind=r.kind and id=r.stream_id for update;
 if r.kind='channel' then update public.messages set body='',removed_at=clock_timestamp() where id=r.message_id and removed_at is null;
 else update public.direct_messages set body='',removed_at=clock_timestamp() where id=r.message_id and removed_at is null;end if;
 elsif p_action in ('mute','ban') then
 if r.space_id is null or (p_action='ban' and rank<3) or p_hours is null or p_hours not between 1 and 168 then raise exception 'Invalid space restriction.' using errcode='42501';end if;
 if p_channel is not null and not exists(select 1 from public.channels where id=p_channel and space_id=r.space_id) then raise exception 'Invalid restriction channel.' using errcode='42501';end if;
 insert into realm_private.restrictions(user_id,space_id,channel_id,kind,reason,issuer,expires_at,retained_until)
 values(r.target_user,r.space_id,case when p_action='mute' then p_channel else null end,p_action,trim(p_reason),auth.uid(),clock_timestamp()+make_interval(hours=>p_hours),least(r.created_at+interval '90 days',clock_timestamp()+interval '30 days'));
 if p_action='ban' then
 delete from public.space_members where space_id=r.space_id and user_id=r.target_user;
 update realm_private.membership_invites set revoked_at=clock_timestamp() where space_id=r.space_id and target=r.target_user and accepted_at is null;
 end if;
 elsif p_action='suspend' then
 if not realm_private.platform_admin() or r.space_id is not null or p_hours is null or p_hours not between 1 and 168 then raise exception 'Platform suspension required.' using errcode='42501';end if;
 update realm_private.accounts set state='suspended',suspended_until=clock_timestamp()+make_interval(hours=>p_hours),updated_at=clock_timestamp() where user_id=r.target_user and state not in ('deleting','invited');
 delete from public.home_visits where user_id=r.target_user or home_owner=r.target_user;
 elsif p_action not in ('claim','dismiss') then raise exception 'Unknown review action.' using errcode='22023';end if;
 update realm_private.reports set space_id=r.space_id,status=case when p_action='claim' then 'reviewing' when p_action='dismiss' then 'dismissed' else 'actioned' end,
 reviewer=auth.uid(),review_reason=trim(p_reason),revision=revision+1,closed_at=case when p_action='claim' then null else clock_timestamp() end,
 expires_at=least(expires_at,case when p_action='claim' then created_at+interval '90 days' else clock_timestamp()+interval '30 days' end) where id=r.id;
 perform realm_private.log('report.'||p_action,r.id,r.space_id);
 update realm_private.audit set expires_at=least(expires_at,(select expires_at from realm_private.reports where id=r.id)) where target=r.id;
end $$;
create function realm_private.lift_restriction(p_restriction uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare r realm_private.restrictions;rank integer;begin
 perform realm_private.feature('administration');
 select * into r from realm_private.restrictions where id=p_restriction for update;
 if not found then raise exception 'Restriction unavailable.' using errcode='42501';end if;
 rank:=realm_private.role_rank(realm_private.require_space(r.space_id,case when r.kind='ban' then 3 else 2 end));
 if realm_private.role_rank(realm_private.space_role(r.space_id,r.user_id))>=rank or length(trim(coalesce(p_reason,''))) not between 1 and 500 then raise exception 'Invalid restriction action.' using errcode='42501';end if;
 update realm_private.restrictions set revoked_at=clock_timestamp() where id=r.id;
 perform realm_private.log('restriction.lift',r.id,r.space_id);
 update realm_private.audit set expires_at=least(expires_at,r.retained_until) where target=r.id;
end $$;
create function realm_private.recent_auth() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]')) a where a->>'method'='password' and (a->>'timestamp')::numeric>extract(epoch from clock_timestamp()-interval '5 minutes')) then
 raise exception 'Sign in with your password again before managing your data.' using errcode='42501';end if;
end $$;
create function realm_private.privacy_request(p_action text,p_job uuid default null,p_close_spaces boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare j realm_private.privacy_jobs;result jsonb;begin
 if auth.uid() is null or not exists(select 1 from realm_private.accounts where user_id=auth.uid()) then raise exception 'Sign in required.' using errcode='42501';end if;
 if p_action='list' then return (select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]') from (select id,kind,status,created_at,not_before,expires_at,error from realm_private.privacy_jobs where user_id=auth.uid() order by created_at desc limit 20) q);end if;
 perform realm_private.feature('privacy_jobs');perform realm_private.recent_auth();
 perform 1 from realm_private.accounts where user_id=auth.uid() for update;
 delete from realm_private.export_artifacts where user_id=auth.uid() and expires_at<=clock_timestamp();
 update realm_private.privacy_jobs jobs set status='expired' where user_id=auth.uid() and kind='export' and status='ready' and not exists(select 1 from realm_private.export_artifacts a where a.job_id=jobs.id);
 if p_action in ('export','delete') then
 if exists(select 1 from realm_private.accounts where user_id=auth.uid() and state='deleting') then raise exception 'Deletion processing has started.' using errcode='42501';end if;
 select * into j from realm_private.privacy_jobs where user_id=auth.uid() and kind=p_action and status in ('pending','processing','ready');
 if found then return to_jsonb(j)-'user_id';end if;
 if p_action='delete' and p_close_spaces is not true and exists(select 1 from public.space_members m join public.spaces s on s.id=m.space_id where user_id=auth.uid() and role='owner' and s.closed_at is null) then raise exception 'Transfer your spaces or explicitly confirm their permanent closure.' using errcode='PT409';end if;
 perform realm_private.charge('privacy',2,86400);
 insert into realm_private.privacy_jobs(user_id,kind,not_before,expires_at,close_spaces)
 values(auth.uid(),p_action,clock_timestamp()+case when p_action='delete' then interval '7 days' else interval '0' end,clock_timestamp()+interval '30 days',p_close_spaces) returning * into j;
 perform realm_private.log('privacy.'||p_action||'.request',j.id);return to_jsonb(j)-'user_id';
 end if;
 select * into j from realm_private.privacy_jobs where id=p_job and user_id=auth.uid() for update;
 if not found then raise exception 'Data request unavailable.' using errcode='42501';end if;
 if p_action='cancel' then
 if j.kind<>'delete' or j.status<>'pending' or j.not_before<=now() then raise sqlstate 'PT409' using message='Deletion can no longer be cancelled.';end if;
 update realm_private.privacy_jobs set status='cancelled' where id=j.id;
 elsif p_action='download' then
 select content into result from realm_private.export_artifacts where job_id=j.id and user_id=auth.uid() and expires_at>now();
 if result is null or j.status<>'ready' then raise exception 'Export unavailable or expired. Request another export.' using errcode='42501';end if;
 perform realm_private.log('privacy.export.download',j.id);return result;
 else raise exception 'Unknown privacy action.' using errcode='22023';end if;
 perform realm_private.log('privacy.'||p_action,j.id);return '{}';
end $$;
create function realm_private.scrub_deleted_account() returns trigger language plpgsql security definer set search_path='' as $$
declare handle text;display_name text;begin
 if exists(select 1 from public.space_members m join public.spaces s on s.id=m.space_id where m.user_id=old.id and m.role='owner' and s.closed_at is null) then raise exception 'Transfer or explicitly close owned spaces before deleting.';end if;
 select p.username,p.display_name into handle,display_name from public.profiles p where id=old.id;
 perform 1 from realm_private.streams where (kind='channel' and id in(select channel_id from public.messages where author_id=old.id)) or (kind='direct' and id in(select conversation_id from public.direct_messages where author_id=old.id)) order by kind,id for update;
 update public.messages set body='',removed_at=coalesce(removed_at,clock_timestamp()) where author_id=old.id;
 update public.direct_messages set body='',removed_at=coalesce(removed_at,clock_timestamp()) where author_id=old.id;
 update realm_private.reports set evidence=replace(replace(evidence,coalesce(old.email,''),'[removed]'),coalesce(handle,''),'[removed]'),note=replace(replace(note,coalesce(old.email,''),'[removed]'),coalesce(handle,''),'[removed]') where reporter=old.id or target_user=old.id;
 if length(display_name)>=3 then update realm_private.reports set evidence=replace(evidence,display_name,'[removed]'),note=replace(note,display_name,'[removed]'),review_reason=replace(review_reason,display_name,'[removed]') where reporter=old.id or target_user=old.id;end if;
 update realm_private.reports set review_reason=replace(replace(review_reason,coalesce(old.email,''),'[removed]'),coalesce(handle,''),'[removed]') where reporter=old.id or target_user=old.id;
 delete from realm_private.export_artifacts where user_id=old.id;
 update realm_private.privacy_jobs set status='cancelled' where user_id=old.id and kind='export' and status in ('pending','processing','ready');
 return old;
end $$;
create trigger preserve_peer_content before delete on auth.users for each row execute function realm_private.scrub_deleted_account();

do $$declare f record;call_args text;begin
 for f in select p.oid,p.proname,pg_get_function_identity_arguments(p.oid) identity_args,pg_get_function_arguments(p.oid) args,pg_get_function_result(p.oid) result from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='realm_private' and p.proname in ('submit_report','report_queue','review_report','lift_restriction','privacy_request') loop
 select string_agg(quote_ident(a),',') into call_args from unnest((select proargnames from pg_proc where oid=f.oid)) a;
 execute format('create function public.%I(%s) returns %s language sql security invoker set search_path='''' as $fn$ select realm_private.%I(%s) $fn$',f.proname,f.args,f.result,f.proname,call_args);
 execute format('revoke all on function public.%I(%s),realm_private.%I(%s) from public,anon',f.proname,f.identity_args,f.proname,f.identity_args);
 execute format('grant execute on function public.%I(%s),realm_private.%I(%s) to authenticated',f.proname,f.identity_args,f.proname,f.identity_args);
 end loop;
end $$;
