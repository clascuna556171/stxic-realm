-- Ephemeral activity is read through permission-checked RPCs, never public broadcast payloads.
create table realm_private.world_activity (
 kind text not null check(kind in ('home','channel')),scope uuid not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 typing_until timestamptz,focus_target text,focus_until timestamptz,seen_at timestamptz not null default clock_timestamp(),
 primary key(kind,scope,user_id)
);
create table realm_private.room_speech (
 id uuid primary key,owner_id uuid not null references public.homes(owner_id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(length(trim(body)) between 1 and 120),created_at timestamptz not null default clock_timestamp()
);
create index room_speech_recent on realm_private.room_speech(owner_id,created_at desc);
create function realm_private.speech_clears_typing() returns trigger language plpgsql security definer set search_path='' as $$
begin update realm_private.world_activity set typing_until=null where kind='channel' and scope=new.channel_id and user_id=new.author_id;return new;end $$;
create trigger speech_clears_typing after insert on public.messages for each row execute function realm_private.speech_clears_typing();
revoke all on function realm_private.speech_clears_typing() from public,anon,authenticated;
create function realm_private.require_world(p_kind text,p_scope uuid,p_write boolean default false) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_kind='channel' then perform realm_private.require_stream('channel',p_scope,p_write);
 elsif p_kind='home' then
  perform realm_private.require_active();
  if not realm_private.can_visit(p_scope) or not exists(select 1 from public.home_visits where home_owner=p_scope and user_id=auth.uid() and last_seen>clock_timestamp()-interval '45 seconds') then
   raise exception 'Enter this home before joining its conversation.' using errcode='42501';
  end if;
 else raise exception 'Invalid world scope.' using errcode='22023';end if;
end $$;
create function realm_private.world_activity_update(p_kind text,p_scope uuid,p_typing boolean default null,p_focus boolean default false,p_focus_target text default null,p_focus_until timestamptz default null) returns void language plpgsql security definer set search_path='' as $$
begin
 perform realm_private.require_world(p_kind,p_scope,coalesce(p_typing,false) or (p_focus and p_focus_until is not null));
 if p_focus_until is not null and (p_focus_target is null or length(p_focus_target)>100 or p_focus_until>clock_timestamp()+interval '25 minutes 5 seconds') then raise exception 'Invalid focus session.' using errcode='22023';end if;
 -- Per-user scope cardinality stays bounded, including old channels and expired visits.
 delete from realm_private.world_activity where user_id=auth.uid() and seen_at<clock_timestamp()-interval '1 minute';
 insert into realm_private.world_activity(kind,scope,user_id) values(p_kind,p_scope,auth.uid()) on conflict do nothing;
 update realm_private.world_activity set
  typing_until=case when p_typing is null then typing_until when p_typing then clock_timestamp()+interval '5 seconds' else null end,
  focus_target=case when p_focus then p_focus_target else focus_target end,
  focus_until=case when p_focus then p_focus_until else focus_until end,seen_at=clock_timestamp()
 where kind=p_kind and scope=p_scope and user_id=auth.uid();
end $$;
create function realm_private.room_say(p_owner uuid,p_body text,p_client uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare existing realm_private.room_speech;begin
 perform realm_private.require_world('home',p_owner,true);
 perform 1 from realm_private.accounts where user_id=auth.uid() for update;
 select * into existing from realm_private.room_speech where id=p_client;
 if found then
  if existing.author_id=auth.uid() and existing.owner_id=p_owner and existing.body=trim(p_body) then return existing.id;end if;
  raise sqlstate 'PT409' using message='Retry identifier belongs to different content.';
 end if;
 perform realm_private.charge('room_speech',60,60);
 insert into realm_private.room_speech(id,owner_id,author_id,body) values(p_client,p_owner,auth.uid(),trim(p_body));
 delete from realm_private.room_speech where owner_id=p_owner and id not in(select id from realm_private.room_speech where owner_id=p_owner and created_at>clock_timestamp()-interval '1 day' order by created_at desc,id desc limit 50);
 perform realm_private.world_activity_update('home',p_owner,false);
 return p_client;
end $$;
create function realm_private.world_activity_snapshot(p_kind text,p_scope uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare activity jsonb;messages jsonb;begin
 perform realm_private.require_world(p_kind,p_scope);
 select coalesce(jsonb_agg(jsonb_build_object('user_id',a.user_id,'typing_until',a.typing_until,'focus_target',case when a.seen_at>clock_timestamp()-interval '10 seconds' then a.focus_target end,'focus_until',case when a.seen_at>clock_timestamp()-interval '10 seconds' then a.focus_until end)),'[]') into activity
 from realm_private.world_activity a where a.kind=p_kind and a.scope=p_scope and a.seen_at>clock_timestamp()-interval '10 seconds'
 and realm_private.active_account(a.user_id) and not realm_private.blocked_pair(auth.uid(),a.user_id)
 and (p_kind<>'home' or exists(select 1 from public.home_visits v where v.home_owner=p_scope and v.user_id=a.user_id and v.last_seen>clock_timestamp()-interval '45 seconds'));
 if p_kind='home' then
  select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at,q.id),'[]') into messages from (
   select id,author_id,body,created_at from realm_private.room_speech where owner_id=p_scope and created_at>clock_timestamp()-interval '1 day' and realm_private.active_account(author_id) and not realm_private.blocked_pair(auth.uid(),author_id) order by created_at desc,id desc limit 50
  ) q;
 else
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'author_id',m.author_id,'body',m.body,'created_at',m.created_at) order by m.created_at,m.id),'[]') into messages
  from public.messages m where m.channel_id=p_scope and m.created_at>clock_timestamp()-interval '5 seconds' and m.removed_at is null and m.author_id is not null and not realm_private.blocked_pair(auth.uid(),m.author_id);
 end if;
 return jsonb_build_object('messages',messages,'activity',activity);
end $$;
create function public.world_activity_update(p_kind text,p_scope uuid,p_typing boolean default null,p_focus boolean default false,p_focus_target text default null,p_focus_until timestamptz default null) returns void language sql security invoker set search_path='' as $$select realm_private.world_activity_update(p_kind,p_scope,p_typing,p_focus,p_focus_target,p_focus_until)$$;
create function public.world_activity_snapshot(p_kind text,p_scope uuid) returns jsonb language sql security invoker set search_path='' as $$select realm_private.world_activity_snapshot(p_kind,p_scope)$$;
create function public.room_say(p_owner uuid,p_body text,p_client uuid) returns uuid language sql security invoker set search_path='' as $$select realm_private.room_say(p_owner,p_body,p_client)$$;
revoke all on function realm_private.require_world(text,uuid,boolean) from public,anon,authenticated;
revoke all on function realm_private.world_activity_update(text,uuid,boolean,boolean,text,timestamptz),realm_private.world_activity_snapshot(text,uuid),realm_private.room_say(uuid,text,uuid),public.world_activity_update(text,uuid,boolean,boolean,text,timestamptz),public.world_activity_snapshot(text,uuid),public.room_say(uuid,text,uuid) from public,anon;
grant execute on function realm_private.world_activity_update(text,uuid,boolean,boolean,text,timestamptz),realm_private.world_activity_snapshot(text,uuid),realm_private.room_say(uuid,text,uuid),public.world_activity_update(text,uuid,boolean,boolean,text,timestamptz),public.world_activity_snapshot(text,uuid),public.room_say(uuid,text,uuid) to authenticated;

-- Include authored room speech in existing private exports and service-role cleanup.
do $$declare definition text;begin
 definition:=pg_get_functiondef('realm_private.own_export(uuid)'::regprocedure);
 definition:=replace(definition,'''home'',','''room_speech'',(select coalesce(jsonb_agg(to_jsonb(s)),''[]''::jsonb) from realm_private.room_speech s where author_id=p_user),''home'',');
 execute definition;
 definition:=pg_get_functiondef('realm_private.maintenance()'::regprocedure);
 definition:=replace(definition,'-- Absolute original-capture cap',E'delete from realm_private.room_speech where created_at<clock_timestamp()-interval ''1 day'';\n delete from realm_private.world_activity where seen_at<clock_timestamp()-interval ''1 minute'';\n -- Absolute original-capture cap');
 execute definition;
end $$;
