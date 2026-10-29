-- Shared halls are separate from the browser-only personal cross-server hub.
create function realm_private.starter_hall() returns jsonb language sql immutable set search_path='' as $$
 select '{"version":1,"theme":"cozy","doors":["oak","stone","oak"],"rug":true,"greenery":true,"pieces":[{"id":"library-west","kind":"bookshelf","x":2,"y":7},{"id":"library-east","kind":"bookshelf","x":20,"y":7},{"id":"hearth-east","kind":"hearth","x":18,"y":11},{"id":"gathering-west","kind":"round-table","x":4,"y":11},{"id":"reading-west","kind":"sofa","x":2,"y":9},{"id":"fern-west","kind":"plant","x":2,"y":13},{"id":"fern-east","kind":"plant","x":21,"y":13},{"id":"lantern-west","kind":"lantern","x":8,"y":10},{"id":"lantern-east","kind":"lantern","x":16,"y":10}]}'::jsonb
$$;
create function realm_private.valid_hall(v jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare p jsonb;w integer;h integer;x integer;y integer;cx integer;cy integer;cell text;ids text[]:='{}';cells text[]:='{}';begin
 if v is null or jsonb_typeof(v)<>'object' or octet_length(v::text)>16000 or (select count(*) from jsonb_object_keys(v))<>6
 or v->'version' is distinct from '1'::jsonb or v->>'theme' not in ('cozy','medieval','tech') or jsonb_typeof(v->'theme') is distinct from 'string'
 or jsonb_typeof(v->'doors') is distinct from 'array' or jsonb_typeof(v->'pieces') is distinct from 'array'
 or jsonb_typeof(v->'rug') is distinct from 'boolean' or jsonb_typeof(v->'greenery') is distinct from 'boolean' then return false;end if;
 if jsonb_array_length(v->'doors')<>3 or exists(select 1 from jsonb_array_elements(v->'doors') d where d not in ('"oak"'::jsonb,'"stone"'::jsonb,'"portal"'::jsonb)) or jsonb_array_length(v->'pieces')>32 then return false;end if;
 for p in select * from jsonb_array_elements(v->'pieces') loop
  if jsonb_typeof(p)<>'object' or (select count(*) from jsonb_object_keys(p))<>4 or jsonb_typeof(p->'id') is distinct from 'string' or (p->>'id')!~'^[a-zA-Z0-9-]{1,80}$' or p->>'id'=any(ids)
   or jsonb_typeof(p->'x') is distinct from 'number' or jsonb_typeof(p->'y') is distinct from 'number' or (p->>'x')!~'^\d{1,2}$' or (p->>'y')!~'^\d{1,2}$' then return false;end if;
  w:=case p->>'kind' when 'round-table' then 3 when 'hearth' then 3 when 'bookshelf' then 2 when 'sofa' then 3 when 'desk' then 3 when 'plant' then 1 when 'lantern' then 1 when 'banner' then 1 when 'console' then 1 when 'floor-lamp' then 1 else null end;
  h:=case p->>'kind' when 'hearth' then 3 when 'round-table' then 2 when 'bookshelf' then 2 when 'sofa' then 2 when 'desk' then 2 else 1 end;
  if w is null then return false;end if;
  x:=(p->>'x')::integer;y:=(p->>'y')::integer;
  if x<1 or y<7 or x+w>23 or y+h>15 then return false;end if;
  for cx in x..x+w-1 loop for cy in y..y+h-1 loop
   cell:=cx||','||cy;
   if cell=any(cells) or cx between 10 and 13 or (cy<=8 and cx in (5,6,11,12,17,18)) then return false;end if;
   cells:=array_append(cells,cell);
  end loop;end loop;ids:=array_append(ids,p->>'id');
 end loop;return true;
exception when others then return false;end $$;
create table public.server_halls (
 space_id uuid primary key references public.spaces(id) on delete cascade,enabled boolean not null default false,
 layout jsonb not null default realm_private.starter_hall() check(realm_private.valid_hall(layout)),
 portals jsonb not null default '[null,null,null]',revision integer not null default 0,updated_at timestamptz not null default clock_timestamp()
);
create table public.hall_decorators (
 space_id uuid not null references public.spaces(id) on delete cascade,user_id uuid not null,
 primary key(space_id,user_id),foreign key(space_id,user_id) references public.space_members(space_id,user_id) on delete cascade
);
create table public.hall_announcements (
 id uuid primary key default gen_random_uuid(),space_id uuid not null references public.spaces(id) on delete cascade,
 author_id uuid references auth.users(id) on delete set null,client_id uuid not null,
 body text not null check(length(trim(body)) between 1 and 2000),revision integer not null default 0,
 created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),unique(space_id,author_id,client_id)
);
create index hall_board_space on public.hall_announcements(space_id,created_at desc,id desc);
create function realm_private.can_edit_hall(p_space uuid) returns boolean language sql stable security definer set search_path='' as $$
 select realm_private.active_account() and realm_private.space_role(p_space) is not null and (realm_private.space_role(p_space)='owner' or exists(select 1 from public.hall_decorators where space_id=p_space and user_id=auth.uid()))
$$;
create function realm_private.hall_visible(p_space uuid) returns boolean language sql stable security definer set search_path='' as $$
 select realm_private.active_account() and realm_private.space_role(p_space) is not null and exists(select 1 from public.spaces where id=p_space and closed_at is null)
 and (realm_private.can_edit_hall(p_space) or exists(select 1 from public.server_halls where space_id=p_space and enabled))
$$;
alter table public.server_halls enable row level security;
alter table public.hall_decorators enable row level security;
alter table public.hall_announcements enable row level security;
revoke all on public.server_halls,public.hall_decorators,public.hall_announcements from public,anon,authenticated;
grant select on public.server_halls,public.hall_decorators,public.hall_announcements to authenticated;
create policy shared_hall_visible on public.server_halls for select to authenticated using(realm_private.hall_visible(space_id));
create policy hall_grants_visible on public.hall_decorators for select to authenticated using(realm_private.hall_visible(space_id));
create policy hall_board_visible on public.hall_announcements for select to authenticated using(realm_private.hall_visible(space_id) and (author_id is null or not realm_private.blocked_pair(auth.uid(),author_id)));

create function realm_private.get_server_hall(p_space uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare h public.server_halls;s public.spaces;role text;editable boolean;begin
 role:=realm_private.require_space(p_space,1);
 select * into s from public.spaces where id=p_space;
 if s.closed_at is not null then raise exception 'This server is closed.' using errcode='42501';end if;
 select * into h from public.server_halls where space_id=p_space;
 editable:=realm_private.can_edit_hall(p_space);
 return jsonb_build_object('space_id',p_space,'name',s.name,'enabled',coalesce(h.enabled,false),'revision',coalesce(h.revision,0),
 'layout',case when coalesce(h.enabled,false) or editable then coalesce(h.layout,realm_private.starter_hall()) else null end,
 'portals',case when coalesce(h.enabled,false) or editable then coalesce(h.portals,'[null,null,null]') else '[null,null,null]'::jsonb end,
 'portal_names',case when coalesce(h.enabled,false) or editable then (select jsonb_agg((select c.name from public.channels c where c.id::text=p.destination#>>'{}' and c.space_id=p_space and c.archived_at is null) order by p.position) from jsonb_array_elements(coalesce(h.portals,'[null,null,null]')) with ordinality p(destination,position)) else '[null,null,null]'::jsonb end,
 'owner',role='owner','can_edit',editable and s.archived_at is null,'can_announce',realm_private.role_rank(role)>=2 and s.archived_at is null,
 'decorators',case when role='owner' then (select coalesce(jsonb_agg(user_id),'[]') from public.hall_decorators where space_id=p_space) else '[]'::jsonb end,
 'announcements',case when coalesce(h.enabled,false) then (select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id desc),'[]') from
 (select id,author_id,body,revision,created_at,updated_at from public.hall_announcements where space_id=p_space and (author_id is null or not realm_private.blocked_pair(auth.uid(),author_id)) order by created_at desc,id desc limit 20) q) else '[]'::jsonb end);
end $$;
create function realm_private.manage_server_hall(p_space uuid,p_action text,p_revision integer,p_layout jsonb default null,p_enabled boolean default null,p_target uuid default null,p_portals jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare h public.server_halls;role text;destination jsonb;begin
 -- Same space lock as membership/role/channel mutations: revoked grants cannot race a save.
 perform 1 from public.spaces where id=p_space for update;
 role:=realm_private.require_space(p_space,1,true);
 if (p_action='save' and not realm_private.can_edit_hall(p_space)) or (p_action is distinct from 'save' and role<>'owner') then raise exception 'Hall editing permission required.' using errcode='42501';end if;
 insert into public.server_halls(space_id) values(p_space) on conflict do nothing;
 select * into h from public.server_halls where space_id=p_space for update;
 if h.revision is distinct from p_revision then raise sqlstate 'PT409' using message='The shared hall changed. Reload before saving.';end if;
 if p_action='save' then
  if not realm_private.valid_hall(p_layout) then raise exception 'Invalid hall layout or protected landing.' using errcode='22023';end if;
  update public.server_halls set layout=p_layout where space_id=p_space;
 elsif p_action='enabled' then
  if p_enabled is null then raise exception 'Choose enabled or disabled.' using errcode='22023';end if;
  update public.server_halls set enabled=p_enabled where space_id=p_space;
 elsif p_action in ('grant','revoke') then
  if p_action='grant' then
   if realm_private.space_role(p_space,p_target) is null then raise exception 'Choose a current active member.' using errcode='42501';end if;
   insert into public.hall_decorators(space_id,user_id) values(p_space,p_target) on conflict do nothing;
  else delete from public.hall_decorators where space_id=p_space and user_id=p_target;end if;
 elsif p_action='portals' then
  if p_portals is null or jsonb_typeof(p_portals)<>'array' or jsonb_array_length(p_portals)<>3 then raise exception 'Choose three channel destinations.' using errcode='22023';end if;
  for destination in select * from jsonb_array_elements(p_portals) loop
   if destination<>'null'::jsonb and (jsonb_typeof(destination)<>'string' or not exists(select 1 from public.channels where id::text=destination#>>'{}' and space_id=p_space and archived_at is null)) then raise exception 'Portal channel unavailable in this server.' using errcode='42501';end if;
  end loop;
  update public.server_halls set portals=p_portals where space_id=p_space;
 else raise exception 'Unknown hall operation.' using errcode='22023';end if;
 update public.server_halls set revision=revision+1,updated_at=clock_timestamp() where space_id=p_space;
 perform realm_private.log('hall.'||p_action,p_target,p_space);
 return realm_private.get_server_hall(p_space);
end $$;
create function realm_private.enter_hall_portal(p_space uuid,p_slot integer) returns uuid language plpgsql security definer set search_path='' as $$
declare destination uuid;begin
 perform realm_private.require_space(p_space,1);
 if p_slot is null or p_slot not between 0 and 2 or not exists(select 1 from public.server_halls where space_id=p_space and enabled) then raise exception 'Portal unavailable.' using errcode='42501';end if;
 select (portals->>p_slot)::uuid into destination from public.server_halls where space_id=p_space;
 if not exists(select 1 from public.channels c join public.spaces s on s.id=c.space_id where c.id=destination and c.space_id=p_space and c.archived_at is null and s.archived_at is null and s.closed_at is null) then raise exception 'Channel access changed. Return to chat to choose a channel.' using errcode='42501';end if;
 return destination;
end $$;
create function realm_private.change_hall_announcement(p_space uuid,p_client uuid,p_body text default null,p_entry uuid default null,p_revision integer default null,p_remove boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare a public.hall_announcements;result uuid;begin
 perform realm_private.require_active();
 perform 1 from realm_private.accounts where user_id=auth.uid() for update;
 perform 1 from public.spaces where id=p_space for update;
 perform realm_private.require_space(p_space,2,true);
 if not exists(select 1 from public.server_halls where space_id=p_space and enabled) then raise exception 'The hall is disabled.' using errcode='42501';end if;
 if not coalesce(p_remove,false) and exists(select 1 from realm_private.restrictions where user_id=auth.uid() and space_id=p_space and channel_id is null and kind='mute' and revoked_at is null and expires_at>now()) then raise exception 'Announcement posting is muted.' using errcode='42501';end if;
 if p_entry is not null then
  select * into a from public.hall_announcements where id=p_entry and space_id=p_space for update;
  if not found then raise exception 'Announcement unavailable.' using errcode='42501';end if;
  if a.revision is distinct from p_revision then raise sqlstate 'PT409' using message='Announcement changed. Reload before editing.';end if;
  if p_remove then delete from public.hall_announcements where id=a.id;perform realm_private.log('hall.announcement.remove',a.id,p_space);return a.id;end if;
 else
  select id into result from public.hall_announcements where space_id=p_space and author_id=auth.uid() and client_id=p_client;
  if result is not null then return result;end if;
  if p_client is null then raise exception 'A retry identifier is required.' using errcode='22023';end if;
 end if;
 if p_body is null or length(trim(p_body)) not between 1 and 2000 then raise exception 'Write 1–2000 characters.' using errcode='22023';end if;
 perform realm_private.charge('hall_board',20,3600);
 if p_entry is null then
  if (select count(*) from public.hall_announcements where space_id=p_space)>=20 then raise sqlstate 'PT429' using message='Announcement board is full. Remove an old announcement.';end if;
  insert into public.hall_announcements(space_id,author_id,client_id,body) values(p_space,auth.uid(),p_client,trim(p_body)) returning id into result;
 else
  update public.hall_announcements set body=trim(p_body),revision=revision+1,updated_at=clock_timestamp() where id=a.id;result:=a.id;
 end if;return result;
end $$;
-- Account erasure removes authored board content while retaining other members' contributions.
create function realm_private.scrub_hall_author() returns trigger language plpgsql security definer set search_path='' as $$
begin delete from public.hall_announcements where author_id=old.id;return old;end $$;
create trigger scrub_hall_author before delete on auth.users for each row execute function realm_private.scrub_hall_author();
do $$declare definition text;begin
 definition:=pg_get_functiondef('realm_private.own_export(uuid)'::regprocedure);
 definition:=replace(definition,'''home'',','''authored_hall_announcements'',(select coalesce(jsonb_agg(to_jsonb(a)),''[]'') from public.hall_announcements a where author_id=p_user),''home'',');execute definition;
 definition:=pg_get_functiondef('realm_private.process_privacy_jobs()'::regprocedure);
 definition:=replace(definition,'if (select count(*) from public.messages where author_id=j.user_id)',
 'if (select count(*) from public.home_guestbook where author_id=j.user_id)+(select count(*) from public.hall_announcements where author_id=j.user_id)+(select count(*) from public.messages where author_id=j.user_id)');execute definition;
end $$;
do $$declare f record;begin
 for f in select p.oid::regprocedure signature,p.proname,pg_get_function_identity_arguments(p.oid) args,pg_get_function_arguments(p.oid) full_args,pg_get_function_result(p.oid) result
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='realm_private' and p.proname in ('get_server_hall','manage_server_hall','enter_hall_portal','change_hall_announcement') loop
 execute format('create function public.%I(%s) returns %s language sql security invoker set search_path='''' as $body$ select realm_private.%I(%s) $body$',f.proname,f.full_args,f.result,f.proname,(select string_agg(split_part(trim(a),' ',1),',') from unnest(string_to_array(f.args,',')) a));
 execute format('revoke all on function %s from public,anon',f.signature);execute format('grant execute on function %s to authenticated',f.signature);
 execute format('revoke all on function public.%I(%s) from public,anon',f.proname,f.args);execute format('grant execute on function public.%I(%s) to authenticated',f.proname,f.args);
 end loop;
end $$;
revoke all on function realm_private.starter_hall(),realm_private.valid_hall(jsonb),realm_private.can_edit_hall(uuid),realm_private.hall_visible(uuid),realm_private.scrub_hall_author() from public,anon,authenticated;
grant execute on function realm_private.can_edit_hall(uuid),realm_private.hall_visible(uuid) to authenticated;
