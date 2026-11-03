-- Local additive rollout. Private storage; all access is through checked projections.
create table realm_private.hall_visits (
 user_id uuid primary key references auth.users(id) on delete cascade,
 space_id uuid not null references public.spaces(id) on delete cascade, token uuid not null,
 visible boolean not null default false, intent text check(intent in ('chat','focus','group')),
 x integer not null default 12,y integer not null default 13,
 last_seen timestamptz not null default clock_timestamp(),layout_revision integer not null
);
create index hall_visits_space on realm_private.hall_visits(space_id,last_seen);
create table realm_private.hall_focus (
 id uuid primary key,space_id uuid not null references public.spaces(id) on delete cascade,
 host uuid references auth.users(id) on delete set null,title text not null check(length(trim(title)) between 1 and 100),
 started_at timestamptz not null default clock_timestamp(),ends_at timestamptz not null,ended_at timestamptz
);
create index hall_focus_space on realm_private.hall_focus(space_id,started_at desc);
create table realm_private.hall_focus_members (
 session_id uuid not null references realm_private.hall_focus(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,token uuid not null,
 visible boolean not null default false,primary key(session_id,user_id)
);
create table realm_private.community_projects (
 id uuid primary key,space_id uuid not null references public.spaces(id) on delete cascade,
 author uuid references auth.users(id) on delete set null,goal text not null check(length(trim(goal)) between 1 and 120),
 description text not null check(length(trim(description)) between 1 and 2000),milestones jsonb not null,
 revision integer not null default 0,created_at timestamptz not null default clock_timestamp(),completed_at timestamptz
);
create table realm_private.project_contributions (
 id uuid primary key,project_id uuid not null references realm_private.community_projects(id) on delete cascade,
 author uuid not null references auth.users(id) on delete cascade,milestone integer not null,
 body text not null check(length(trim(body)) between 1 and 1500),status text not null default 'pending' check(status in ('pending','accepted','rejected')),
 reviewer uuid references auth.users(id) on delete set null,revision integer not null default 0,created_at timestamptz not null default clock_timestamp()
);
create table realm_private.community_notices (
 id uuid primary key,space_id uuid not null references public.spaces(id) on delete cascade,
 author uuid not null references auth.users(id) on delete cascade,body text not null check(length(trim(body)) between 1 and 1000),
 resolved boolean not null default false,revision integer not null default 0,created_at timestamptz not null default clock_timestamp()
);
create table realm_private.community_memories (
 id uuid primary key,space_id uuid not null references public.spaces(id) on delete cascade,
 author uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('project','event','milestone','conversation')),
 title text not null check(length(trim(title)) between 1 and 120),body text not null default '' check(length(body)<=2000),
 project_id uuid references realm_private.community_projects(id) on delete cascade,
 message_id uuid references public.messages(id) on delete cascade,
 displayed boolean not null default false,revision integer not null default 0,
 created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),
 check((kind='project' and project_id is not null and message_id is null) or
 (kind='conversation' and message_id is not null and project_id is null and body='') or
 (kind in ('event','milestone') and project_id is null and message_id is null))
);
create index community_projects_space on realm_private.community_projects(space_id,created_at desc);
create index community_notices_space on realm_private.community_notices(space_id,created_at desc);
create index community_memories_space on realm_private.community_memories(space_id,created_at desc);
-- Erasure or moderation can remove accepted work. A completed project must remain truthful.
create function realm_private.recheck_project_completion() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update realm_private.community_projects p set completed_at=null,revision=p.revision+1 where p.id=old.project_id and p.completed_at is not null
 and (select count(distinct c.milestone) from realm_private.project_contributions c where c.project_id=p.id and c.status='accepted')<>jsonb_array_length(p.milestones);
 return old;
end $$;
create trigger project_completion_after_erasure after delete on realm_private.project_contributions for each row execute function realm_private.recheck_project_completion();
revoke all on function realm_private.recheck_project_completion() from public,anon,authenticated;

create function realm_private.require_community(p_space uuid,p_write boolean default false) returns text language plpgsql security definer set search_path='' as $$
declare r text;begin
 r:=realm_private.require_space(p_space,1,p_write);
 if not exists(select 1 from public.server_halls h join public.spaces s on s.id=h.space_id where h.space_id=p_space and h.enabled and s.closed_at is null) then
 raise exception 'Shared activities are unavailable. Chat is still available.' using errcode='42501';end if;
 if p_write and exists(select 1 from realm_private.restrictions where user_id=auth.uid() and space_id=p_space and channel_id is null and kind='mute' and revoked_at is null and expires_at>now()) then
 raise exception 'Community posting is muted.' using errcode='42501';end if;
 return r;
end $$;
create function realm_private.community_member(p_space uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select realm_private.space_role(p_space,p_user) is not null and not realm_private.blocked_pair(auth.uid(),p_user)
$$;
create function realm_private.hall_walkable(p_space uuid,p_x integer,p_y integer) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(p_x between 1 and 22 and p_y between 7 and 14 and not exists(
 select 1 from public.server_halls h cross join lateral jsonb_array_elements(h.layout->'pieces') p where h.space_id=p_space
 and p_x >= (p->>'x')::int and p_x < (p->>'x')::int+case p->>'kind' when 'round-table' then 3 when 'hearth' then 3 when 'bookshelf' then 2 when 'sofa' then 3 when 'desk' then 3 else 1 end
 and p_y >= (p->>'y')::int and p_y < (p->>'y')::int+case p->>'kind' when 'hearth' then 3 when 'round-table' then 2 when 'bookshelf' then 2 when 'sofa' then 2 when 'desk' then 2 else 1 end),false)
$$;

create function realm_private.community_state(p_space uuid,p_token uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare r text;f realm_private.hall_focus;begin
 r:=realm_private.require_community(p_space);
 select * into f from realm_private.hall_focus where space_id=p_space and ended_at is null and ends_at>clock_timestamp() order by started_at desc limit 1;
 return jsonb_build_object('server_now',clock_timestamp(),'can_manage',realm_private.role_rank(r)>=2,
 'occupants',(select coalesce(jsonb_agg(jsonb_build_object('id',v.user_id,'name',p.display_name,'intent',v.intent,'x',v.x,'y',v.y,'character',a.character,'expires_at',v.last_seen+interval '45 seconds') order by p.display_name,v.user_id),'[]')
 from realm_private.hall_visits v join public.profiles p on p.id=v.user_id join public.profile_appearances a on a.user_id=v.user_id
 where v.space_id=p_space and v.visible and v.last_seen>clock_timestamp()-interval '45 seconds' and v.layout_revision=(select revision from public.server_halls where space_id=p_space) and realm_private.community_member(p_space,v.user_id)),
 'session',case when f.id is null then null else (to_jsonb(f)-'host')||jsonb_build_object('host',case when f.host=auth.uid() then f.host else null end,
 'joined',exists(select 1 from realm_private.hall_focus_members m join realm_private.hall_visits v on v.user_id=m.user_id and v.token=m.token where m.session_id=f.id and m.user_id=auth.uid() and m.token=p_token and v.space_id=p_space and v.last_seen>clock_timestamp()-interval '45 seconds'),
 'participation_visible',coalesce((select m.visible from realm_private.hall_focus_members m join realm_private.hall_visits v on v.user_id=m.user_id and v.token=m.token where m.session_id=f.id and m.user_id=auth.uid() and m.token=p_token and v.space_id=p_space and v.last_seen>clock_timestamp()-interval '45 seconds'),false),
 'participants',(select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',p.display_name,'expires_at',v.last_seen+interval '45 seconds') order by p.display_name,m.user_id),'[]') from realm_private.hall_focus_members m join realm_private.hall_visits v on v.user_id=m.user_id and v.token=m.token join public.profiles p on p.id=m.user_id
 where m.session_id=f.id and m.visible and v.space_id=p_space and v.last_seen>clock_timestamp()-interval '45 seconds' and realm_private.community_member(p_space,m.user_id))) end,
 'projects',(select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]') from (
 select p.*,coalesce((select jsonb_agg(distinct c.milestone) from realm_private.project_contributions c where c.project_id=p.id and c.status='accepted'),'[]') accepted,
 coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('name',u.display_name) order by c.created_at desc) from realm_private.project_contributions c join public.profiles u on u.id=c.author where c.project_id=p.id and realm_private.community_member(p_space,c.author)),'[]') contributions
 from realm_private.community_projects p where p.space_id=p_space order by p.created_at desc limit 20) q),
 'notices',(select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]') from (select n.*,p.display_name name from realm_private.community_notices n join public.profiles p on p.id=n.author where n.space_id=p_space and realm_private.community_member(p_space,n.author) order by n.created_at desc limit 50) q),
 'memories',(select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]') from (
 select m.id,m.author,m.kind,m.title,m.displayed,m.revision,m.created_at,m.updated_at,p.display_name name,
 case when m.kind='conversation' then msg.body when m.kind='project' then pr.goal||E'\n'||pr.description else m.body end body,m.project_id,m.message_id,msg.channel_id
 from realm_private.community_memories m join public.profiles p on p.id=m.author left join public.messages msg on msg.id=m.message_id left join public.channels ch on ch.id=msg.channel_id left join realm_private.community_projects pr on pr.id=m.project_id
 where m.space_id=p_space and realm_private.community_member(p_space,m.author) and
 (m.kind in ('event','milestone') or (m.kind='project' and pr.space_id=p_space and pr.completed_at is not null) or
 (m.kind='conversation' and msg.removed_at is null and msg.author_id=m.author and ch.space_id=p_space and ch.archived_at is null and realm_private.community_member(p_space,msg.author_id)))
 order by m.created_at desc limit 50) q));
end $$;

create function realm_private.hall_presence(p_space uuid,p_token uuid,p_action text,p_visible boolean default false,p_intent text default null,p_x integer default null,p_y integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare v realm_private.hall_visits;h public.server_halls;begin
 perform realm_private.require_active();
 if p_action='leave' then delete from realm_private.hall_focus_members where user_id=auth.uid() and token=p_token;delete from realm_private.hall_visits where user_id=auth.uid() and token=p_token;return null;end if;
 if p_action='enter' then perform 1 from public.spaces where id=p_space for update;else perform 1 from public.spaces where id=p_space for share;end if;
 perform realm_private.require_community(p_space);
 select * into h from public.server_halls where space_id=p_space;
 if p_token is null or p_action is null or p_action not in ('enter','heartbeat','move','preferences') or (p_intent is not null and p_intent not in ('chat','focus','group')) or p_visible is null then raise exception 'Invalid presence preferences.' using errcode='22023';end if;
 if p_action='enter' then
  delete from realm_private.hall_visits where space_id=p_space and last_seen<=clock_timestamp()-interval '45 seconds';
  if (select count(*) from realm_private.hall_visits where space_id=p_space and user_id<>auth.uid())>=64 then raise exception 'Hall participation is full. You can still browse and chat.' using errcode='22023';end if;
  -- Token replacement is deliberate. Retries of a live enter do not reset position.
  insert into realm_private.hall_visits(user_id,space_id,token,visible,intent,layout_revision) values(auth.uid(),p_space,p_token,p_visible,p_intent,h.revision)
  on conflict(user_id) do update set space_id=excluded.space_id,token=excluded.token,visible=excluded.visible,intent=excluded.intent,x=case when hall_visits.token=excluded.token then hall_visits.x else 12 end,y=case when hall_visits.token=excluded.token then hall_visits.y else 13 end,last_seen=clock_timestamp(),layout_revision=h.revision;
  delete from realm_private.hall_focus_members where user_id=auth.uid() and token<>p_token;
 else
  select * into v from realm_private.hall_visits where user_id=auth.uid() for update;
  if not found or v.space_id<>p_space or v.token<>p_token or v.last_seen<=clock_timestamp()-interval '45 seconds' then raise exception 'Your hall connection expired. Rejoin to appear or participate.' using errcode='42501';end if;
  if v.layout_revision<>h.revision then raise sqlstate 'PT409' using message='The hall arrangement changed. Rejoin before participating.';end if;
  if p_action='move' then
   if p_x is null or p_y is null or abs(p_x-v.x)+abs(p_y-v.y)<>1 or not realm_private.hall_walkable(p_space,p_x,p_y) then raise exception 'Choose an adjacent clear hall tile.' using errcode='22023';end if;
   update realm_private.hall_visits set x=p_x,y=p_y where user_id=auth.uid();
  elsif p_action='preferences' then update realm_private.hall_visits set visible=p_visible,intent=p_intent where user_id=auth.uid();end if;
  update realm_private.hall_visits set last_seen=clock_timestamp() where user_id=auth.uid();
 end if;
 return (select jsonb_build_object('x',x,'y',y,'visible',visible,'intent',intent) from realm_private.hall_visits where user_id=auth.uid());
end $$;

-- Community evidence uses the established report queue and authority/escalation rules.
alter table realm_private.reports add column community_kind text,add column community_entry uuid;
drop index realm_private.open_report_dedupe;
create unique index open_report_dedupe on realm_private.reports(reporter,kind,coalesce(message_id,community_entry,target_user)) where status in ('open','reviewing');
create function realm_private.report_community_entry(p_kind text,p_entry uuid,p_reason text default 'other',p_note text default '') returns uuid language plpgsql security definer set search_path='' as $$
declare s uuid;target uuid;evidence text;r uuid;state jsonb;begin
 perform realm_private.require_active();perform realm_private.feature('administration');
 perform 1 from realm_private.accounts where user_id=auth.uid() for update;
 if p_kind='memory' then select space_id,author,title||E'\n'||body into s,target,evidence from realm_private.community_memories where id=p_entry;
 elsif p_kind='notice' then select space_id,author,body into s,target,evidence from realm_private.community_notices where id=p_entry;
 elsif p_kind='contribution' then select p.space_id,c.author,c.body into s,target,evidence from realm_private.project_contributions c join realm_private.community_projects p on p.id=c.project_id where c.id=p_entry;
 else raise exception 'Unknown community report type.' using errcode='22023';end if;
 if s is null or target=auth.uid() or not realm_private.community_member(s,target) then raise exception 'Reported entry unavailable.' using errcode='42501';end if;
 state:=realm_private.community_state(s);
 if p_kind='memory' then
  select item->>'body' into evidence from jsonb_array_elements(state->'memories') item where item->>'id'=p_entry::text;
  if evidence is null then raise exception 'Source entry unavailable.' using errcode='42501';end if;
 end if;
 if p_reason is null or p_reason not in ('harassment','spam','threat','other') or p_note is null or length(p_note)>500 then raise exception 'Choose a reason and up to 500 characters of context.' using errcode='22023';end if;
 select id into r from realm_private.reports where reporter=auth.uid() and community_entry=p_entry and community_kind=p_kind and status in ('open','reviewing') and expires_at>now();
 if r is not null then return r;end if;
 delete from realm_private.reports where reporter=auth.uid() and expires_at<=now();
 perform realm_private.charge('report',realm_private.setting('report_hour'),3600);
 insert into realm_private.reports(reporter,target_user,kind,space_id,reason,note,evidence,community_kind,community_entry)
 values(auth.uid(),target,'user',case when realm_private.role_rank(realm_private.space_role(s,target))>=2 then null else s end,p_reason,trim(p_note),left(evidence,4000),p_kind,p_entry) returning id into r;
 perform realm_private.log('report.create',r,s);return r;
end $$;
do $$declare d text;begin
 d:=pg_get_functiondef('realm_private.review_report(uuid,integer,text,text,integer,uuid)'::regprocedure);
 d:=replace(d,'if r.message_id is null then raise exception',
 'if r.community_entry is not null then
 if r.community_kind=''memory'' then delete from realm_private.community_memories where id=r.community_entry;
 elsif r.community_kind=''notice'' then delete from realm_private.community_notices where id=r.community_entry;
 elsif r.community_kind=''contribution'' then
 update realm_private.community_projects p set completed_at=null,revision=p.revision+1 where p.id=(select project_id from realm_private.project_contributions where id=r.community_entry);
 delete from realm_private.project_contributions where id=r.community_entry;
 end if;
 else
 if r.message_id is null then raise exception');
 d:=replace(d,'elsif p_action in (''mute'',''ban'') then','end if; elsif p_action in (''mute'',''ban'') then');
 execute d;
end $$;

create function realm_private.community_change(p_space uuid,p_action text,p_id uuid,p_data jsonb default '{}',p_revision integer default null,p_token uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare r text;manager boolean;f realm_private.hall_focus;p realm_private.community_projects;c realm_private.project_contributions;m realm_private.community_memories;n realm_private.community_notices;v realm_private.hall_visits;msg public.messages;body text;title text;kind text;ms jsonb;begin
 perform 1 from public.spaces where id=p_space for update;
 r:=realm_private.require_community(p_space,true);manager:=realm_private.role_rank(r)>=2;
 if p_id is null or p_action is null or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>16000 then raise exception 'Invalid community operation.' using errcode='22023';end if;
 body:=trim(p_data->>'body');title:=trim(p_data->>'title');
 if p_action like 'focus_%' then
  select * into f from realm_private.hall_focus where space_id=p_space and ended_at is null and ends_at>clock_timestamp() order by started_at desc limit 1;
  if p_action='focus_start' then
   if f.id=p_id then return realm_private.community_state(p_space,p_token);end if;
   if f.id is not null then raise sqlstate 'PT409' using message='A focus session already started. Join it below.';end if;
   if title is null or length(title) not between 1 and 100 or coalesce(p_data->>'minutes','')!~'^[0-9]{1,3}$' or (p_data->>'minutes')::int not between 5 and 120 then raise exception 'Choose a title and 5–120 minutes.' using errcode='22023';end if;
   perform realm_private.charge('community_focus',10,3600);
   delete from realm_private.hall_focus where space_id=p_space and (ended_at is not null or ends_at<=clock_timestamp());
   insert into realm_private.hall_focus(id,space_id,host,title,ends_at) values(p_id,p_space,auth.uid(),title,clock_timestamp()+make_interval(mins=>(p_data->>'minutes')::int));
  elsif p_action='focus_end' then
   if f.id is distinct from p_id or (f.host is distinct from auth.uid() and not manager) then raise exception 'Only the session host or staff can end this session.' using errcode='42501';end if;
   update realm_private.hall_focus set ended_at=clock_timestamp() where id=f.id;
   delete from realm_private.hall_focus_members where session_id=f.id;
  elsif p_action='focus_join' then
   if f.id is distinct from p_id then raise exception 'This focus session ended. Refresh activities.' using errcode='42501';end if;
   select * into v from realm_private.hall_visits where user_id=auth.uid() and space_id=p_space and token=p_token and last_seen>clock_timestamp()-interval '45 seconds';
   if not found then raise exception 'Reconnect to the hall before joining.' using errcode='42501';end if;
   if jsonb_typeof(p_data->'visible') is distinct from 'boolean' then raise exception 'Choose participant visibility.' using errcode='22023';end if;
   insert into realm_private.hall_focus_members(session_id,user_id,token,visible) values(f.id,auth.uid(),p_token,(p_data->>'visible')::boolean) on conflict(session_id,user_id) do update set token=excluded.token,visible=excluded.visible;
  elsif p_action='focus_leave' then delete from realm_private.hall_focus_members where session_id=p_id and user_id=auth.uid() and token=p_token;
  else raise exception 'Unknown focus operation.' using errcode='22023';end if;
 elsif p_action='project_create' then
  if not manager then raise exception 'Staff starts community projects.' using errcode='42501';end if;
  if exists(select 1 from realm_private.community_projects where id=p_id and space_id=p_space and author=auth.uid()) then return realm_private.community_state(p_space,p_token);end if;
  ms:=p_data->'milestones';
  if title is null or length(title) not between 1 and 120 or body is null or length(body) not between 1 and 2000 or ms is null or jsonb_typeof(ms)<>'array' then raise exception 'Add a goal, description and milestones.' using errcode='22023';end if;
  if jsonb_array_length(ms) not between 1 and 8 or exists(select 1 from jsonb_array_elements(ms) item where jsonb_typeof(item)<>'string' or length(trim(item#>>'{}')) not between 1 and 120) then raise exception 'Use 1–8 milestones, up to 120 characters each.' using errcode='22023';end if;
  if (select count(*) from realm_private.community_projects where space_id=p_space)>=20 then raise exception 'This server has reached its 20-project limit.' using errcode='22023';end if;
  insert into realm_private.community_projects(id,space_id,author,goal,description,milestones) values(p_id,p_space,auth.uid(),title,body,ms);
 elsif p_action in ('project_complete','project_remove','project_edit','contribute','review') then
  if p_action='review' then
   select * into c from realm_private.project_contributions where id=p_id;
   select * into p from realm_private.community_projects where id=c.project_id and space_id=p_space;
  else select * into p from realm_private.community_projects where id=case when p_action='contribute' then (p_data->>'project')::uuid else p_id end and space_id=p_space;end if;
  if p.id is null then raise exception 'Project unavailable.' using errcode='42501';end if;
  if p_action='contribute' then
   if p.completed_at is not null or body is null or length(body) not between 1 and 1500 or coalesce(p_data->>'milestone','')!~'^[0-7]$' or (p_data->>'milestone')::int>=jsonb_array_length(p.milestones) then raise exception 'Choose an open milestone and describe your contribution.' using errcode='22023';end if;
   if exists(select 1 from realm_private.project_contributions where id=p_id and project_id=p.id and author=auth.uid()) then return realm_private.community_state(p_space,p_token);end if;
   if (select count(*) from realm_private.project_contributions where project_id=p.id)>=100 then raise exception 'This project has reached its contribution limit.' using errcode='22023';end if;
   perform realm_private.charge('project_contribution',20,3600);
   insert into realm_private.project_contributions(id,project_id,author,milestone,body) values(p_id,p.id,auth.uid(),(p_data->>'milestone')::int,body);
  else
   if not manager then raise exception 'Staff review permission required.' using errcode='42501';end if;
   if p_action='review' then
    if p.completed_at is not null or not realm_private.community_member(p_space,c.author) then raise exception 'Contribution review unavailable.' using errcode='42501';end if;
    if c.revision is distinct from p_revision then raise sqlstate 'PT409' using message='This contribution changed. Refresh before reviewing.';end if;
    if p_data->>'status' is null or p_data->>'status' not in ('accepted','rejected') then raise exception 'Accept or reject this contribution.' using errcode='22023';end if;
    update realm_private.project_contributions set status=p_data->>'status',reviewer=auth.uid(),revision=revision+1 where id=c.id;
   else
    if p.revision is distinct from p_revision then raise sqlstate 'PT409' using message='This project changed. Refresh before saving.';end if;
    if p_action='project_complete' then
     if (select count(distinct milestone) from realm_private.project_contributions where project_id=p.id and status='accepted')<>jsonb_array_length(p.milestones) then raise exception 'Every milestone needs an accepted contribution first.' using errcode='22023';end if;
     update realm_private.community_projects set completed_at=coalesce(completed_at,clock_timestamp()),revision=revision+1 where id=p.id;
    elsif p_action='project_remove' then delete from realm_private.community_projects where id=p.id;
    else
     if title is null or length(title) not between 1 and 120 or body is null or length(body) not between 1 and 2000 then raise exception 'Add a goal and description.' using errcode='22023';end if;
     update realm_private.community_projects set goal=title,description=body,revision=revision+1 where id=p.id;
    end if;
   end if;
  end if;
 elsif p_action like 'notice_%' then
  select * into n from realm_private.community_notices where id=p_id and space_id=p_space;
  if p_action='notice_create' then
   if n.id is not null then return realm_private.community_state(p_space,p_token);end if;
   if (select count(*) from realm_private.community_notices where space_id=p_space)>=50 then raise exception 'Noticeboard full. Resolve and remove an old request.' using errcode='22023';end if;
   if body is null or length(body) not between 1 and 1000 then raise exception 'Write 1–1000 characters.' using errcode='22023';end if;
   perform realm_private.charge('community_notice',10,3600);
   insert into realm_private.community_notices(id,space_id,author,body) values(p_id,p_space,auth.uid(),body);
  else
   if n.id is null or (n.author<>auth.uid() and not manager) then raise exception 'Notice editing permission required.' using errcode='42501';end if;
   if n.revision is distinct from p_revision then raise sqlstate 'PT409' using message='This request changed. Refresh before saving.';end if;
   if p_action='notice_remove' then delete from realm_private.community_notices where id=n.id;
   elsif p_action='notice_resolve' then update realm_private.community_notices set resolved=true,revision=revision+1 where id=n.id;
   elsif p_action='notice_edit' then
    if body is null or length(body) not between 1 and 1000 then raise exception 'Write 1–1000 characters.' using errcode='22023';end if;
    update realm_private.community_notices set body=body,revision=revision+1 where id=n.id;
   else raise exception 'Unknown notice operation.' using errcode='22023';end if;
  end if;
 elsif p_action like 'memory_%' then
  select * into m from realm_private.community_memories where id=p_id and space_id=p_space;
  if p_action='memory_create' then
   if m.id is not null then return realm_private.community_state(p_space,p_token);end if;
   kind:=p_data->>'kind';
   if kind is null or kind not in ('project','event','milestone','conversation') or title is null or length(title) not between 1 and 120 or length(coalesce(body,''))>2000 then raise exception 'Choose a memory type and title.' using errcode='22023';end if;
   if kind='conversation' then
    select * into msg from public.messages where id=(p_data->>'source')::uuid and author_id=auth.uid() and removed_at is null;
    if msg.id is null or not exists(select 1 from public.channels where id=msg.channel_id and space_id=p_space and archived_at is null) then raise exception 'Only your own available message in this server may be preserved.' using errcode='42501';end if;
   else
    if not manager then raise exception 'Staff curates community memories.' using errcode='42501';end if;
    if kind='project' then
     select * into p from realm_private.community_projects where id=(p_data->>'source')::uuid and space_id=p_space and completed_at is not null;
     if p.id is null then raise exception 'Choose a completed community project.' using errcode='42501';end if;
    elsif body is null or length(body)=0 then raise exception 'Write a recap or milestone description.' using errcode='22023';end if;
   end if;
   if (select count(*) from realm_private.community_memories where space_id=p_space)>=50 then raise exception 'Memory wall full. Remove an entry first.' using errcode='22023';end if;
   perform realm_private.charge('community_memory',20,3600);
   insert into realm_private.community_memories(id,space_id,author,kind,title,body,project_id,message_id,displayed) values(p_id,p_space,auth.uid(),kind,title,case when kind in ('project','conversation') then '' else body end,case when kind='project' then p.id end,case when kind='conversation' then msg.id end,manager and coalesce((p_data->>'displayed')::boolean,false));
  else
   if m.id is null or (m.author<>auth.uid() and not manager) then raise exception 'Memory editing permission required.' using errcode='42501';end if;
   if m.revision is distinct from p_revision then raise sqlstate 'PT409' using message='This memory changed. Refresh before saving.';end if;
   if p_action='memory_remove' then delete from realm_private.community_memories where id=m.id;
   elsif p_action='memory_display' then
    if not manager then raise exception 'Staff chooses hall displays.' using errcode='42501';end if;
    update realm_private.community_memories set displayed=not displayed,revision=revision+1,updated_at=clock_timestamp() where id=m.id;
   elsif p_action='memory_edit' then
    if title is null or length(title) not between 1 and 120 or length(coalesce(body,''))>2000 or (m.kind in ('event','milestone') and coalesce(body,'')='') then raise exception 'Add a title and description.' using errcode='22023';end if;
    update realm_private.community_memories set title=title,body=case when m.kind in ('event','milestone') then body else '' end,revision=revision+1,updated_at=clock_timestamp() where id=m.id;
   else raise exception 'Unknown memory operation.' using errcode='22023';end if;
  end if;
 else raise exception 'Unknown community operation.' using errcode='22023';end if;
 perform realm_private.log('community.'||p_action,p_id,p_space);
 return realm_private.community_state(p_space,p_token);
end $$;

-- All private tables deny direct access, including authenticated writes.
revoke all on realm_private.hall_visits,realm_private.hall_focus,realm_private.hall_focus_members,realm_private.community_projects,realm_private.project_contributions,realm_private.community_notices,realm_private.community_memories from public,anon,authenticated;
do $$declare f record;begin
 for f in select p.oid::regprocedure signature,p.proname,pg_get_function_identity_arguments(p.oid) args,pg_get_function_arguments(p.oid) full_args,pg_get_function_result(p.oid) result from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='realm_private' and p.proname in ('community_state','community_change','hall_presence','report_community_entry') loop
 execute format('create function public.%I(%s) returns %s language sql security invoker set search_path='''' as $body$ select realm_private.%I(%s) $body$',f.proname,f.full_args,f.result,f.proname,(select string_agg(split_part(trim(a),' ',1),',') from unnest(string_to_array(f.args,',')) a));
 execute format('revoke all on function %s from public,anon',f.signature);execute format('grant execute on function %s to authenticated',f.signature);
 execute format('revoke all on function public.%I(%s) from public,anon',f.proname,f.args);execute format('grant execute on function public.%I(%s) to authenticated',f.proname,f.args);
 end loop;
end $$;
revoke all on function realm_private.require_community(uuid,boolean),realm_private.community_member(uuid,uuid),realm_private.hall_walkable(uuid,integer,integer) from public,anon,authenticated;

-- Authored content is included in the existing private export. FK cascades scrub erasure.
do $$declare d text;begin
 d:=pg_get_functiondef('realm_private.own_export(uuid)'::regprocedure);
 d:=replace(d,'''home'',','''authored_community_projects'',(select coalesce(jsonb_agg(to_jsonb(c)),''[]'') from realm_private.community_projects c where author=p_user),''community_contributions'',(select coalesce(jsonb_agg(to_jsonb(c)),''[]'') from realm_private.project_contributions c where author=p_user),''community_notices'',(select coalesce(jsonb_agg(to_jsonb(c)),''[]'') from realm_private.community_notices c where author=p_user),''community_memories'',(select coalesce(jsonb_agg(to_jsonb(c)),''[]'') from realm_private.community_memories c where author=p_user),''home'',');execute d;
 d:=pg_get_functiondef('realm_private.process_privacy_jobs()'::regprocedure);
 d:=replace(d,'(select count(*) from public.messages where author_id=j.user_id)','(select count(*) from realm_private.community_projects where author=j.user_id)+(select count(*) from realm_private.project_contributions where author=j.user_id)+(select count(*) from realm_private.community_notices where author=j.user_id)+(select count(*) from realm_private.community_memories where author=j.user_id)+(select count(*) from public.messages where author_id=j.user_id)');execute d;
 d:=pg_get_functiondef('realm_private.maintenance()'::regprocedure);
 d:=replace(d,'-- Absolute original-capture cap',
 'delete from realm_private.hall_visits where last_seen<=clock_timestamp()-interval ''45 seconds'';
 delete from realm_private.hall_focus where ended_at is not null or ends_at<=clock_timestamp();
 delete from realm_private.hall_focus_members m where not exists(select 1 from realm_private.hall_visits v where v.user_id=m.user_id and v.token=m.token);
 -- Absolute original-capture cap');execute d;
end $$;
