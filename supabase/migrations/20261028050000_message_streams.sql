-- A row lock serializes journal allocation until commit. Events contain IDs, never old bodies.
create table realm_private.streams (
 kind text not null check(kind in ('channel','direct')),id uuid not null,
 revision bigint not null default 0, floor bigint not null default 0,primary key(kind,id)
);
create table realm_private.message_events (
 kind text not null,stream_id uuid not null,revision bigint not null,message_id uuid not null,
 operation text not null check(operation in ('create','edit','remove')),created_at timestamptz not null default clock_timestamp(),
 primary key(kind,stream_id,revision),foreign key(kind,stream_id) references realm_private.streams(kind,id) on delete cascade
);
create table realm_private.read_positions (
 user_id uuid not null references auth.users(id) on delete cascade,kind text not null,stream_id uuid not null,
 position bigint not null default 0,primary key(user_id,kind,stream_id),foreign key(kind,stream_id) references realm_private.streams(kind,id) on delete cascade
);
alter table public.messages add column revision bigint not null default 0,add column created_revision bigint not null default 0,add column edited_at timestamptz,add column removed_at timestamptz;
alter table public.direct_messages add column revision bigint not null default 0,add column created_revision bigint not null default 0,add column edited_at timestamptz,add column removed_at timestamptz;
alter table public.messages drop constraint messages_body_check;
alter table public.messages add constraint messages_body_check check((removed_at is null and length(trim(body)) between 1 and 4000) or (removed_at is not null and body=''));
alter table public.direct_messages drop constraint direct_messages_body_check;
alter table public.direct_messages add constraint direct_messages_body_check check((removed_at is null and length(trim(body)) between 1 and 4000) or (removed_at is not null and body=''));
insert into realm_private.streams(kind,id) select 'channel',id from public.channels union all select 'direct',id from public.direct_conversations;
-- Baseline positions are deterministic even when timestamps are equal.
with ordered as(select id,row_number() over(partition by channel_id order by created_at,id) r from public.messages)
update public.messages m set revision=o.r,created_revision=o.r from ordered o where m.id=o.id;
with ordered as(select id,row_number() over(partition by conversation_id order by created_at,id) r from public.direct_messages)
update public.direct_messages m set revision=o.r,created_revision=o.r from ordered o where m.id=o.id;
update realm_private.streams s set revision=case when kind='channel' then coalesce((select max(revision) from public.messages where channel_id=s.id),0) else coalesce((select max(revision) from public.direct_messages where conversation_id=s.id),0) end;
update realm_private.streams set floor=revision;
insert into realm_private.read_positions(user_id,kind,stream_id,position)
select m.user_id,'channel',c.id,s.revision from public.space_members m join public.channels c on c.space_id=m.space_id join realm_private.streams s on s.kind='channel' and s.id=c.id;
insert into realm_private.read_positions(user_id,kind,stream_id,position)
select u,'direct',c.id,s.revision from public.direct_conversations c join realm_private.streams s on s.kind='direct' and s.id=c.id cross join lateral unnest(array[c.user_a,c.user_b]) u;
create function realm_private.stream_created() returns trigger language plpgsql security definer set search_path='' as $$
declare k text;begin
 k:=case when tg_table_name='channels' then 'channel' else 'direct' end;
 insert into realm_private.streams(kind,id) values(k,new.id);
 if k='channel' then insert into realm_private.read_positions(user_id,kind,stream_id) select user_id,k,new.id from public.space_members where space_id=new.space_id;
 else insert into realm_private.read_positions(user_id,kind,stream_id) values(new.user_a,k,new.id),(new.user_b,k,new.id);end if;
 return new;
end $$;
create trigger channel_stream after insert on public.channels for each row execute function realm_private.stream_created();
create trigger direct_stream after insert on public.direct_conversations for each row execute function realm_private.stream_created();
create function realm_private.member_read_start() returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- Also serializes a join against concurrent sends in the space.
 perform 1 from realm_private.streams s join public.channels c on c.id=s.id and s.kind='channel' where c.space_id=new.space_id order by s.id for update of s;
 insert into realm_private.read_positions(user_id,kind,stream_id,position)
 select new.user_id,'channel',c.id,s.revision from public.channels c join realm_private.streams s on s.kind='channel' and s.id=c.id where c.space_id=new.space_id
 on conflict(user_id,kind,stream_id) do update set position=excluded.position;
 return new;
end $$;
create trigger member_stream_start after insert on public.space_members for each row execute function realm_private.member_read_start();
create function realm_private.record_message_event() returns trigger language plpgsql security definer set search_path='' as $$
declare k text;s uuid;r bigint;begin
 k:=case when tg_table_name='messages' then 'channel' else 'direct' end;
 s:=coalesce(to_jsonb(new)->>'channel_id',to_jsonb(new)->>'conversation_id')::uuid;
 update realm_private.streams set revision=revision+1 where kind=k and id=s returning revision into r;
 if r is null then raise exception 'Missing message stream.';end if;
 new.revision:=r;
 if tg_op='INSERT' then new.created_revision:=r;
 elsif new.removed_at is not null then new.body:='';
 else new.edited_at:=clock_timestamp();end if;
 insert into realm_private.message_events(kind,stream_id,revision,message_id,operation)
 values(k,s,r,new.id,case when tg_op='INSERT' then 'create' when new.removed_at is not null then 'remove' else 'edit' end);
 return new;
end $$;
-- Alphabetical ordering: quota/authorization guard runs before journal allocation.
create trigger journal_channel before insert or update of body,removed_at on public.messages for each row execute function realm_private.record_message_event();
create trigger journal_direct before insert or update of body,removed_at on public.direct_messages for each row execute function realm_private.record_message_event();
create function realm_private.require_stream(p_kind text,p_stream uuid,p_write boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare c public.channels;begin
 perform realm_private.require_active();
 if p_kind='channel' then
 select * into c from public.channels where id=p_stream;
 if not found then raise exception 'Channel unavailable.' using errcode='42501';end if;
 perform realm_private.require_space(c.space_id,1,p_write);
 -- Channel administration holds the space write lock. Refresh after waiting for that lock.
 select * into c from public.channels where id=p_stream;
 if p_write and (c.archived_at is not null or exists(select 1 from realm_private.restrictions where user_id=auth.uid() and space_id=c.space_id and (channel_id is null or channel_id=c.id) and kind='mute' and revoked_at is null and expires_at>now())) then raise exception 'This channel is read-only or you are muted.' using errcode='42501';end if;
 elsif p_kind='direct' then
 if not realm_private.can_dm(p_stream) then raise exception 'Conversation unavailable. Friendship or account access changed.' using errcode='42501';end if;
 else raise exception 'Invalid stream type.' using errcode='22023';end if;
 if p_write then perform 1 from realm_private.streams where kind=p_kind and id=p_stream for update;
 else perform 1 from realm_private.streams where kind=p_kind and id=p_stream for share;end if;
end $$;
create function realm_private.message_projection(p_kind text,p_stream uuid,p_ids uuid[] default null,p_before_time timestamptz default null,p_before_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 if p_kind='channel' then
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at,q.id),'[]') into result from (
 select m.* from public.messages m where channel_id=p_stream and not realm_private.blocked_pair(auth.uid(),author_id)
 and (p_ids is null or id=any(p_ids)) and (p_before_time is null or (created_at,id)<(p_before_time,p_before_id)) order by created_at desc,id desc limit 50) q;
 else
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at,q.id),'[]') into result from (
 select m.* from public.direct_messages m where conversation_id=p_stream and (p_ids is null or id=any(p_ids))
 and (p_before_time is null or (created_at,id)<(p_before_time,p_before_id)) order by created_at desc,id desc limit 50) q;
 end if;
 return result;
end $$;
create function realm_private.message_history(p_kind text,p_stream uuid,p_before_time timestamptz default null,p_before_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform realm_private.require_stream(p_kind,p_stream);
 if (p_before_time is null)<>(p_before_id is null) then raise exception 'Both cursor values are required.' using errcode='22023';end if;
 return jsonb_build_object('messages',realm_private.message_projection(p_kind,p_stream,null,p_before_time,p_before_id),'visibility',(select md5(coalesce(string_agg(blocker::text||blocked::text,',' order by blocker,blocked),'')) from public.user_blocks where auth.uid() in (blocker,blocked)),'watermark',(select revision from realm_private.streams where kind=p_kind and id=p_stream));
end $$;
create function realm_private.message_recover(p_kind text,p_stream uuid,p_after bigint,p_through bigint default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare s realm_private.streams;events jsonb;ids uuid[];next_revision bigint;high bigint;begin
 perform realm_private.require_stream(p_kind,p_stream);
 select * into s from realm_private.streams where kind=p_kind and id=p_stream;
 high:=least(coalesce(p_through,s.revision),s.revision);
 if p_after is null or p_after<s.floor or p_after>s.revision then return jsonb_build_object('reset',true,'watermark',s.revision);end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.revision),'[]'),array_agg(q.message_id),max(q.revision) into events,ids,next_revision
 from (select revision,message_id,operation from realm_private.message_events where kind=p_kind and stream_id=p_stream and revision>p_after and revision<=high order by revision limit 50) q;
 return jsonb_build_object('reset',false,'visibility',(select md5(coalesce(string_agg(blocker::text||blocked::text,',' order by blocker,blocked),'')) from public.user_blocks where auth.uid() in (blocker,blocked)),'events',events,'messages',case when ids is null then '[]'::jsonb else realm_private.message_projection(p_kind,p_stream,ids) end,'next',coalesce(next_revision,p_after),'watermark',high);
end $$;
create function realm_private.message_send(p_kind text,p_stream uuid,p_body text,p_client uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare existing_id uuid;existing_stream uuid;existing_body text;result uuid;begin
 perform 1 from realm_private.accounts where user_id=auth.uid() for update;
 perform realm_private.require_stream(p_kind,p_stream,true);
 if p_kind='channel' then select id,channel_id,body into existing_id,existing_stream,existing_body from public.messages where author_id=auth.uid() and client_id=p_client;
 else select id,conversation_id,body into existing_id,existing_stream,existing_body from public.direct_messages where author_id=auth.uid() and client_id=p_client;end if;
 if existing_id is not null then
 if existing_stream=p_stream and existing_body=trim(p_body) then return existing_id;end if;
 raise sqlstate 'PT409' using message='Retry identifier belongs to different content.';end if;
 if p_kind='channel' then insert into public.messages(channel_id,author_id,body,client_id) values(p_stream,auth.uid(),trim(p_body),p_client) returning id into result;
 else insert into public.direct_messages(conversation_id,author_id,body,client_id) values(p_stream,auth.uid(),trim(p_body),p_client) returning id into result;end if;
 return result;
end $$;
create or replace function realm_private.send_direct(p_conversation uuid,p_body text,p_client uuid) returns uuid language sql security definer set search_path='' as $$
 select realm_private.message_send('direct',p_conversation,p_body,p_client)
$$;
create function realm_private.message_change(p_kind text,p_stream uuid,p_message uuid,p_revision bigint,p_body text default null,p_remove boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare author uuid;r bigint;removed timestamptz;begin
 perform realm_private.require_stream(p_kind,p_stream,true);
 -- Acquire the stream's write lock before a message row (also used by moderation/deletion).
 perform 1 from realm_private.streams where kind=p_kind and id=p_stream for update;
 if p_kind='channel' then select author_id,revision,removed_at into author,r,removed from public.messages where id=p_message and channel_id=p_stream for update;
 else select author_id,revision,removed_at into author,r,removed from public.direct_messages where id=p_message and conversation_id=p_stream for update;end if;
 if author is distinct from auth.uid() or removed is not null then raise exception 'Only the author can change an available message.' using errcode='42501';end if;
 if r is distinct from p_revision then raise sqlstate 'PT409' using message='Message changed. Reload before editing.';end if;
 if p_remove is null then raise exception 'Invalid removal flag.' using errcode='22023';end if;
 if p_kind='channel' then update public.messages set body=case when p_remove then '' else trim(p_body) end,removed_at=case when p_remove then clock_timestamp() else null end where id=p_message;
 else update public.direct_messages set body=case when p_remove then '' else trim(p_body) end,removed_at=case when p_remove then clock_timestamp() else null end where id=p_message;end if;
end $$;
create function realm_private.message_read(p_kind text,p_stream uuid,p_message uuid) returns void language plpgsql security definer set search_path='' as $$
declare r bigint;begin
 perform realm_private.require_stream(p_kind,p_stream);
 if p_kind='channel' then select created_revision into r from public.messages where id=p_message and channel_id=p_stream and not realm_private.blocked_pair(auth.uid(),author_id);
 else select created_revision into r from public.direct_messages where id=p_message and conversation_id=p_stream;end if;
 if r is null then raise exception 'Read position is unavailable.' using errcode='42501';end if;
 insert into realm_private.read_positions(user_id,kind,stream_id,position) values(auth.uid(),p_kind,p_stream,r)
 on conflict(user_id,kind,stream_id) do update set position=greatest(realm_private.read_positions.position,excluded.position);
end $$;
create function realm_private.message_unread(p_kind text,p_stream uuid) returns bigint language plpgsql security definer set search_path='' as $$
declare position bigint;result bigint;begin
 perform realm_private.require_stream(p_kind,p_stream);
 select r.position into position from realm_private.read_positions r where user_id=auth.uid() and kind=p_kind and stream_id=p_stream;
 position:=coalesce(position,0);
 if p_kind='channel' then select count(*) into result from public.messages where channel_id=p_stream and created_revision>position and author_id<>auth.uid() and removed_at is null and not realm_private.blocked_pair(auth.uid(),author_id);
 else select count(*) into result from public.direct_messages where conversation_id=p_stream and created_revision>position and author_id<>auth.uid() and removed_at is null;end if;
 return result;
end $$;
-- Legacy clients now go through the same trigger checks. Obsolete direct mutations stay revoked.
revoke update,delete on public.messages,public.direct_messages from authenticated;
do $$declare f record;call_args text;begin
 for f in select p.oid,p.proname,pg_get_function_identity_arguments(p.oid) identity_args,pg_get_function_arguments(p.oid) args,pg_get_function_result(p.oid) result from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='realm_private' and p.proname in ('message_history','message_recover','message_send','message_change','message_read','message_unread') loop
 select string_agg(quote_ident(a),',') into call_args from unnest((select proargnames from pg_proc where oid=f.oid)) a;
 execute format('create function public.%I(%s) returns %s language sql security invoker set search_path='''' as $fn$ select realm_private.%I(%s) $fn$',f.proname,f.args,f.result,f.proname,call_args);
 execute format('revoke all on function public.%I(%s),realm_private.%I(%s) from public,anon',f.proname,f.identity_args,f.proname,f.identity_args);
 execute format('grant execute on function public.%I(%s),realm_private.%I(%s) to authenticated',f.proname,f.identity_args,f.proname,f.identity_args);
 end loop;
end $$;
