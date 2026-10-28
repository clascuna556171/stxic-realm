-- Account identity, friendships, private DMs and server-authoritative homes.
-- Public RPCs are invoker wrappers; privileged implementations live outside the exposed schema.
create schema if not exists realm_private;
revoke all on schema realm_private from public, anon;
grant usage on schema realm_private to authenticated;

create table realm_private.furniture_catalog (
 id text primary key, name text not null, description text not null,
 width integer not null, height integer not null, x integer not null, y integer not null
);
insert into realm_private.furniture_catalog
select id,name,description,width,height,x,y from jsonb_to_recordset($catalog$[{"id": "desk", "name": "Project desk", "description": "A place for projects and links. Object actions will be connected later.", "x": 2, "y": 2, "width": 3, "height": 2}, {"id": "bookshelf", "name": "Bookshelf", "description": "A shelf for the things you want to share.", "x": 11, "y": 2, "width": 2, "height": 2}, {"id": "sofa", "name": "Sofa", "description": "A place to sit together. Sitting and visitors are not available yet.", "x": 3, "y": 6, "width": 3, "height": 2}, {"id": "lantern", "name": "Lantern", "description": "A warm medieval-inspired lantern.", "x": 7, "y": 3, "width": 1, "height": 1}, {"id": "banner", "name": "Banner", "description": "A decorative medieval-inspired banner.", "x": 9, "y": 3, "width": 1, "height": 1}, {"id": "console", "name": "Tech console", "description": "A compact tech-inspired display.", "x": 10, "y": 6, "width": 1, "height": 1}, {"id": "plant", "name": "Plant", "description": "A little greenery for the room.", "x": 12, "y": 7, "width": 1, "height": 1}, {"id": "bed", "name": "Linen bed", "description": "Layered linen and a soft quilt. A quiet corner to unwind.", "x": 12, "y": 4, "width": 2, "height": 3}, {"id": "coffee-table", "name": "Coffee table", "description": "An open notebook, a warm drink and a moment to yourself.", "x": 4, "y": 8, "width": 2, "height": 1}, {"id": "floor-lamp", "name": "Reading lamp", "description": "A paper shade and a little warm light for the reading corner.", "x": 2, "y": 5, "width": 1, "height": 1}]$catalog$::jsonb)
 as c(id text,name text,description text,width integer,height integer,x integer,y integer);

revoke all on realm_private.furniture_catalog from public,anon,authenticated;

create function realm_private.valid_character(v jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(v)='object' and (select count(*) from jsonb_object_keys(v))=7
 and v->>'skin' in ('#f3c9ae','#d9a27f','#b87954','#805039','#493022')
 and v->>'hair' in ('#282126','#584038','#a46a42','#d9bb7c','#d9d9d5')
 and v->>'hairStyle' in ('short','long','curly','swept') and v->>'outfit' in ('everyday','medieval','tech')
 and v->>'accessory' in ('none','glasses','headphones','crown') and v->>'eyes' in ('dark','brown','blue','green')
 and v->'version'='1'::jsonb,false)
$$;
create function realm_private.valid_theme(v jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(v)='object' and (select count(*) from jsonb_object_keys(v))=2
 and v->>'accent' in ('obsidian','sage','ocean','clay','violet','mist')
 and v->>'logo' in ('obsidian','sage','ocean','clay','violet','mist'),false)
$$;
create function realm_private.starter_layout() returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('schemaVersion',1,'objects',jsonb_agg(to_jsonb(c) order by c.id)) from realm_private.furniture_catalog c
$$;
create function realm_private.valid_layout(v jsonb) returns boolean language plpgsql stable set search_path='' as $$
declare item jsonb; asset realm_private.furniture_catalog; ids text[]:='{}'; cells text[]:='{}'; px integer; py integer; cell text;
begin
 if v is null or jsonb_typeof(v)<>'object' or v->'schemaVersion' is distinct from '1'::jsonb
 or jsonb_typeof(v->'objects') is distinct from 'array' or octet_length(v::text)>16000
 or (select count(*) from jsonb_object_keys(v))<>2 then return false; end if;
 if jsonb_array_length(v->'objects')>10 then return false; end if;
 for item in select * from jsonb_array_elements(v->'objects') loop
  if jsonb_typeof(item)<>'object' or (select count(*) from jsonb_object_keys(item))<>7 then return false; end if;
  select * into asset from realm_private.furniture_catalog where id=item->>'id';
  if not found or asset.id=any(ids) or item->>'name' is distinct from asset.name or item->>'description' is distinct from asset.description
   or item->'width' is distinct from to_jsonb(asset.width) or item->'height' is distinct from to_jsonb(asset.height)
   or jsonb_typeof(item->'x') is distinct from 'number' or jsonb_typeof(item->'y') is distinct from 'number'
   or (item->>'x')!~'^\d{1,2}$' or (item->>'y')!~'^\d{1,2}$' then return false; end if;
  px:=(item->>'x')::integer;py:=(item->>'y')::integer;
  if px<1 or py<1 or px+asset.width>15 or py+asset.height>11 then return false; end if;
  for cx in px..px+asset.width-1 loop for cy in py..py+asset.height-1 loop
   cell:=cx||','||cy;
   if cell=any(cells) or (cx=8 and cy=9) then return false; end if;
   cells:=array_append(cells,cell);
  end loop; end loop;
  ids:=array_append(ids,asset.id);
 end loop;
 return true;
exception when others then return false;
end $$;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique check(username ~ '^[a-z0-9_]{3,24}$'),
 display_name text not null default 'Realm member' check(char_length(trim(display_name)) between 1 and 40),
 bio text not null default '' check(char_length(bio)<=160), revision integer not null default 0,
 updated_at timestamptz not null default now()
);
create table public.profile_appearances (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 character jsonb not null default '{"skin": "#d9a27f", "hair": "#282126", "outfit": "everyday", "hairStyle": "short", "accessory": "none", "eyes": "dark", "version": 1}'::jsonb check(realm_private.valid_character(character))
);
create table public.user_themes (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 theme jsonb not null default '{"accent": "obsidian", "logo": "mist"}'::jsonb check(realm_private.valid_theme(theme))
);
create table public.friendships (
 id uuid primary key default gen_random_uuid(), requester uuid not null references public.profiles(id) on delete cascade,
 addressee uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted')),
 created_at timestamptz not null default now(), check(requester<>addressee)
);
create unique index friendships_pair on public.friendships(least(requester,addressee),greatest(requester,addressee));
create index friendships_addressee on public.friendships(addressee);
create index friendships_requester on public.friendships(requester);
create table public.user_blocks (
 blocker uuid not null references public.profiles(id) on delete cascade,
 blocked uuid not null references public.profiles(id) on delete cascade,
 primary key(blocker,blocked),check(blocker<>blocked)
);
create table public.direct_conversations (
 id uuid primary key default gen_random_uuid(), user_a uuid not null references public.profiles(id) on delete cascade,
 user_b uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),unique(user_a,user_b),check(user_a<user_b)
);
create table public.direct_messages (
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
 author_id uuid not null references public.profiles(id) on delete cascade,client_id uuid not null,
 body text not null check(char_length(trim(body)) between 1 and 4000),created_at timestamptz not null default now(),unique(author_id,client_id)
);
create index direct_messages_order on public.direct_messages(conversation_id,created_at desc,id desc);
create table public.homes (
 owner_id uuid primary key references public.profiles(id) on delete cascade,
 privacy text not null default 'friends' check(privacy in ('private','friends')),
 mood text not null default 'cozy' check(mood in ('cozy','medieval','tech')),
 layout jsonb not null default realm_private.starter_layout(),revision integer not null default 0,
 updated_at timestamptz not null default now()
);
create table public.home_visits (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 home_owner uuid not null references public.homes(owner_id) on delete cascade,token uuid not null,
 x integer not null check(x between 1 and 14),y integer not null check(y between 1 and 10),
 sequence integer not null default 0,last_seen timestamptz not null default now(),last_move timestamptz not null default now()
);
create index home_visits_owner on public.home_visits(home_owner);

create function realm_private.blocked_pair(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_blocks where (blocker=a and blocked=b) or (blocker=b and blocked=a))
$$;
create function realm_private.are_friends(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$
 select a is not null and b is not null and not realm_private.blocked_pair(a,b) and exists(
 select 1 from public.friendships where status='accepted' and least(requester,addressee)=least(a,b) and greatest(requester,addressee)=greatest(a,b))
$$;
create function realm_private.profile_visible(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not realm_private.blocked_pair(auth.uid(),target)
$$;
create function realm_private.can_visit(owner_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.homes h where h.owner_id=$1 and
 (h.owner_id=auth.uid() or (h.privacy='friends' and realm_private.are_friends(auth.uid(),h.owner_id))))
$$;
create function realm_private.can_dm(conversation uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.direct_conversations c where c.id=$1 and auth.uid() in (c.user_a,c.user_b)
 and realm_private.are_friends(c.user_a,c.user_b))
$$;

-- Bootstrap handles deliberately use 18 UUID characters, never an email address.
create or replace function realm_private.bootstrap_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,username) values(new.id,'realm_'||left(replace(new.id::text,'-',''),18)) on conflict(id) do nothing;
 return new;
end $$;
create function realm_private.bootstrap_identity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profile_appearances(user_id) values(new.id);
 insert into public.user_themes(user_id) values(new.id);
 insert into public.homes(owner_id) values(new.id);
 return new;
end $$;
create trigger realm_profile_children after insert on public.profiles for each row execute function realm_private.bootstrap_identity();
create trigger realm_auth_profile after insert on auth.users for each row execute function realm_private.bootstrap_profile();
insert into public.profiles(id,username) select id,'realm_'||left(replace(id::text,'-',''),18) from auth.users on conflict(id) do nothing;

-- Tables are read-only to clients. Every mutation below checks auth.uid() and allowed state transitions.
do $$ declare t text; begin
 foreach t in array array['profiles','profile_appearances','user_themes','friendships','user_blocks','direct_conversations','direct_messages','homes','home_visits'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
create policy profiles_visible on public.profiles for select to authenticated using(realm_private.profile_visible(id));
create policy character_visible on public.profile_appearances for select to authenticated using(realm_private.profile_visible(user_id));
create policy themes_private on public.user_themes for select to authenticated using(user_id=auth.uid());
create policy friendships_participants on public.friendships for select to authenticated using(auth.uid() in (requester,addressee));
create policy blocks_owner on public.user_blocks for select to authenticated using(blocker=auth.uid());
create policy direct_conversations_participants on public.direct_conversations for select to authenticated using(realm_private.can_dm(id));
create policy direct_messages_participants on public.direct_messages for select to authenticated using(realm_private.can_dm(conversation_id));
create policy homes_visitors on public.homes for select to authenticated using(realm_private.can_visit(owner_id));
create policy visits_authorized on public.home_visits for select to authenticated using(last_seen>now()-interval '45 seconds' and realm_private.can_visit(home_owner) and realm_private.profile_visible(user_id));

create function realm_private.get_identity() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 select jsonb_build_object('profile',to_jsonb(p),'character',a.character,'theme',t.theme,'mood',h.mood) into result
 from public.profiles p join public.profile_appearances a on a.user_id=p.id join public.user_themes t on t.user_id=p.id join public.homes h on h.owner_id=p.id where p.id=auth.uid();
 if result is null then raise exception 'Your profile is not available. Contact your administrator.';end if;
 return result;
end $$;
create function realm_private.save_identity(p_username text,p_name text,p_bio text,p_character jsonb,p_theme jsonb,p_mood text,p_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare current_revision integer;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 select revision into current_revision from public.profiles where id=auth.uid() for update;
 if current_revision is distinct from p_revision then raise exception 'Profile changed elsewhere. Reload before saving.' using errcode='40001';end if;
 if not realm_private.valid_character(p_character) or not realm_private.valid_theme(p_theme) or p_mood is null or p_mood not in ('cozy','medieval','tech') then raise exception 'Invalid appearance choices' using errcode='22023';end if;
 update public.profiles set username=lower(trim(p_username)),display_name=trim(p_name),bio=trim(p_bio),revision=revision+1,updated_at=now() where id=auth.uid();
 update public.profile_appearances set character=p_character where user_id=auth.uid();
 update public.user_themes set theme=p_theme where user_id=auth.uid();
 update public.homes set mood=p_mood,revision=revision+1,updated_at=now() where owner_id=auth.uid() and mood<>p_mood;
 return realm_private.get_identity();
end $$;

create function realm_private.request_friend(p_username text) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid; result uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 select id into target from public.profiles where username=lower(trim(p_username));
 if target is null or target=auth.uid() or realm_private.blocked_pair(auth.uid(),target) then raise exception 'This account cannot receive your request.' using errcode='22023';end if;
 if (select count(*) from public.friendships where requester=auth.uid() and status='pending')>=30 then raise exception 'Too many pending requests. Cancel a request first.';end if;
 insert into public.friendships(requester,addressee) values(auth.uid(),target) returning id into result;
 return result;
exception when unique_violation then raise exception 'A friendship or request already exists. Check your requests.' using errcode='23505';
end $$;
create function realm_private.respond_friend(p_request uuid,p_action text) returns void language plpgsql security definer set search_path='' as $$
declare f public.friendships;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 select * into f from public.friendships where id=p_request for update;
 if not found or auth.uid() not in (f.requester,f.addressee) then raise exception 'Request unavailable' using errcode='42501';end if;
 if p_action='accept' and f.status='pending' and auth.uid()=f.addressee and not realm_private.blocked_pair(f.requester,f.addressee) then
 update public.friendships set status='accepted' where id=f.id;
 elsif p_action='remove' then
 delete from public.friendships where id=f.id;
 delete from public.home_visits where (user_id=f.requester and home_owner=f.addressee) or (user_id=f.addressee and home_owner=f.requester);
 else raise exception 'Only the recipient can accept a pending request.' using errcode='42501';end if;
end $$;
create function realm_private.set_block(p_user uuid,p_block boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or p_user=auth.uid() or p_user is null then raise exception 'Invalid account' using errcode='42501';end if;
 if p_block then
 insert into public.user_blocks values(auth.uid(),p_user) on conflict do nothing;
 delete from public.friendships where least(requester,addressee)=least(auth.uid(),p_user) and greatest(requester,addressee)=greatest(auth.uid(),p_user);
 delete from public.home_visits where (user_id=auth.uid() and home_owner=p_user) or (user_id=p_user and home_owner=auth.uid());
 else delete from public.user_blocks where blocker=auth.uid() and blocked=p_user;end if;
end $$;
create function realm_private.open_direct(p_user uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not realm_private.are_friends(auth.uid(),p_user) then raise exception 'Direct messages are available to accepted friends.' using errcode='42501';end if;
 insert into public.direct_conversations(user_a,user_b) values(least(auth.uid(),p_user),greatest(auth.uid(),p_user))
 on conflict(user_a,user_b) do update set user_a=excluded.user_a returning id into result;
 return result;
end $$;
create function realm_private.send_direct(p_conversation uuid,p_body text,p_client uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare existing public.direct_messages; result uuid;
begin
 if not realm_private.can_dm(p_conversation) then raise exception 'Conversation unavailable' using errcode='42501';end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 select * into existing from public.direct_messages where author_id=auth.uid() and client_id=p_client;
 if found then
 if existing.conversation_id=p_conversation and existing.body=trim(p_body) then return existing.id;end if;
 raise exception 'Retry identifier belongs to another message' using errcode='23505';end if;
 if exists(select 1 from public.direct_messages where author_id=auth.uid() and created_at>clock_timestamp()-interval '250 milliseconds') then raise exception 'Please wait briefly before sending another message.' using errcode='P0001';end if;
 insert into public.direct_messages(conversation_id,author_id,client_id,body) values(p_conversation,auth.uid(),p_client,trim(p_body)) returning id into result;
 return result;
end $$;

create function realm_private.save_home(p_layout jsonb,p_privacy text,p_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare h public.homes;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 select * into h from public.homes where owner_id=auth.uid() for update;
 if h.revision is distinct from p_revision then raise exception 'Home changed elsewhere. Reload before saving.' using errcode='40001';end if;
 if not realm_private.valid_layout(p_layout) or p_privacy is null or p_privacy not in ('private','friends') then raise exception 'Invalid home layout or privacy.' using errcode='22023';end if;
 update public.homes set layout=p_layout,privacy=p_privacy,revision=revision+1,updated_at=now() where owner_id=auth.uid() returning * into h;
 -- Force an authoritative rejoin after an edit; no visitor remains standing inside newly placed furniture.
 delete from public.home_visits where home_owner=auth.uid();
 return to_jsonb(h);
end $$;
create function realm_private.room_state(p_owner uuid,p_token uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not realm_private.can_visit(p_owner) or not exists(select 1 from public.home_visits where user_id=auth.uid() and home_owner=p_owner and token=p_token and last_seen>clock_timestamp()-interval '45 seconds') then
 raise exception 'Visit ended or permission changed. Re-enter the home.' using errcode='42501';end if;
 update public.home_visits set last_seen=clock_timestamp() where user_id=auth.uid() and last_seen<clock_timestamp()-interval '10 seconds';
 select jsonb_build_object('home',to_jsonb(h),'owner',to_jsonb(p),'visitors',coalesce((select jsonb_agg(jsonb_build_object('id',v.user_id,'name',q.display_name,'x',v.x,'y',v.y,'sequence',v.sequence,'character',a.character))
 from public.home_visits v join public.profiles q on q.id=v.user_id join public.profile_appearances a on a.user_id=v.user_id
 where v.home_owner=p_owner and v.last_seen>clock_timestamp()-interval '45 seconds' and realm_private.profile_visible(v.user_id) and (v.user_id=p_owner or realm_private.are_friends(v.user_id,p_owner))),'[]'::jsonb)) into result
 from public.homes h join public.profiles p on p.id=h.owner_id where h.owner_id=p_owner;
 return result;
end $$;
create function realm_private.enter_home(p_owner uuid,p_token uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 -- The home row serializes joins, edits and movement against the same layout/privacy revision.
 perform 1 from public.homes where owner_id=p_owner for update;
 if not realm_private.can_visit(p_owner) then raise exception 'This home is private or unavailable.' using errcode='42501';end if;
 if p_token is null then raise exception 'Invalid visit' using errcode='22023';end if;
 delete from public.home_visits where last_seen<clock_timestamp()-interval '45 seconds';
 if (select count(*) from public.home_visits where home_owner=p_owner and user_id<>auth.uid())>=5 then raise exception 'This home is full. Try again later.';end if;
 insert into public.home_visits(user_id,home_owner,token,x,y) values(auth.uid(),p_owner,p_token,8,9)
 on conflict(user_id) do update set home_owner=p_owner,token=p_token,x=8,y=9,sequence=0,last_seen=clock_timestamp(),last_move=clock_timestamp()-interval '1 second';
 return realm_private.room_state(p_owner,p_token);
end $$;
create function realm_private.move_home(p_owner uuid,p_token uuid,p_x integer,p_y integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare h public.homes; v public.home_visits;
begin
 select * into h from public.homes where owner_id=p_owner for update;
 if not realm_private.can_visit(p_owner) then raise exception 'Home access denied' using errcode='42501';end if;
 select * into v from public.home_visits where user_id=auth.uid() and home_owner=p_owner and token=p_token for update;
 if not found or v.last_seen<clock_timestamp()-interval '45 seconds' then raise exception 'Visit expired. Re-enter the home.' using errcode='42501';end if;
 if p_x is null or p_y is null or p_x not between 1 and 14 or p_y not between 1 and 10 or abs(p_x-v.x)+abs(p_y-v.y)<>1 then raise exception 'Move one tile at a time inside the room.' using errcode='22023';end if;
 if clock_timestamp()-v.last_move<interval '150 milliseconds' then raise exception 'Moving too quickly. Try again.' using errcode='22023';end if;
 if exists(select 1 from jsonb_array_elements(h.layout->'objects') o where p_x >=(o->>'x')::integer and p_x<(o->>'x')::integer+(o->>'width')::integer and p_y>=(o->>'y')::integer and p_y<(o->>'y')::integer+(o->>'height')::integer) then raise exception 'Furniture blocks that tile.' using errcode='22023';end if;
 update public.home_visits set x=p_x,y=p_y,sequence=sequence+1,last_seen=clock_timestamp(),last_move=clock_timestamp() where user_id=auth.uid();
 return realm_private.room_state(p_owner,p_token);
end $$;
create function realm_private.leave_home(p_token uuid) returns void language sql security definer set search_path='' as $$
 delete from public.home_visits where user_id=auth.uid() and token=p_token
$$;

-- Narrow grants: helpers needed by RLS, and audited invoker RPC wrappers only.
revoke all on all functions in schema realm_private from public,anon,authenticated;
grant execute on function realm_private.profile_visible(uuid),realm_private.can_visit(uuid),realm_private.can_dm(uuid) to authenticated;
create function public.get_identity() returns jsonb language sql security invoker set search_path='' as $$ select realm_private.get_identity() $$;
revoke all on function public.get_identity() from public,anon;
grant execute on function public.get_identity(),realm_private.get_identity() to authenticated;
create function public.save_identity(p_username text,p_name text,p_bio text,p_character jsonb,p_theme jsonb,p_mood text,p_revision integer) returns jsonb language sql security invoker set search_path='' as $$ select realm_private.save_identity(p_username,p_name,p_bio,p_character,p_theme,p_mood,p_revision) $$;
revoke all on function public.save_identity(text,text,text,jsonb,jsonb,text,integer) from public,anon;
grant execute on function public.save_identity(text,text,text,jsonb,jsonb,text,integer),realm_private.save_identity(text,text,text,jsonb,jsonb,text,integer) to authenticated;
create function public.request_friend(p_username text) returns uuid language sql security invoker set search_path='' as $$ select realm_private.request_friend(p_username) $$;
revoke all on function public.request_friend(text) from public,anon;
grant execute on function public.request_friend(text),realm_private.request_friend(text) to authenticated;
create function public.respond_friend(p_request uuid,p_action text) returns void language sql security invoker set search_path='' as $$ select realm_private.respond_friend(p_request,p_action) $$;
revoke all on function public.respond_friend(uuid,text) from public,anon;
grant execute on function public.respond_friend(uuid,text),realm_private.respond_friend(uuid,text) to authenticated;
create function public.set_block(p_user uuid,p_block boolean) returns void language sql security invoker set search_path='' as $$ select realm_private.set_block(p_user,p_block) $$;
revoke all on function public.set_block(uuid,boolean) from public,anon;
grant execute on function public.set_block(uuid,boolean),realm_private.set_block(uuid,boolean) to authenticated;
create function public.open_direct(p_user uuid) returns uuid language sql security invoker set search_path='' as $$ select realm_private.open_direct(p_user) $$;
revoke all on function public.open_direct(uuid) from public,anon;
grant execute on function public.open_direct(uuid),realm_private.open_direct(uuid) to authenticated;
create function public.send_direct(p_conversation uuid,p_body text,p_client uuid) returns uuid language sql security invoker set search_path='' as $$ select realm_private.send_direct(p_conversation,p_body,p_client) $$;
revoke all on function public.send_direct(uuid,text,uuid) from public,anon;
grant execute on function public.send_direct(uuid,text,uuid),realm_private.send_direct(uuid,text,uuid) to authenticated;
create function public.save_home(p_layout jsonb,p_privacy text,p_revision integer) returns jsonb language sql security invoker set search_path='' as $$ select realm_private.save_home(p_layout,p_privacy,p_revision) $$;
revoke all on function public.save_home(jsonb,text,integer) from public,anon;
grant execute on function public.save_home(jsonb,text,integer),realm_private.save_home(jsonb,text,integer) to authenticated;
create function public.room_state(p_owner uuid,p_token uuid) returns jsonb language sql security invoker set search_path='' as $$ select realm_private.room_state(p_owner,p_token) $$;
revoke all on function public.room_state(uuid,uuid) from public,anon;
grant execute on function public.room_state(uuid,uuid),realm_private.room_state(uuid,uuid) to authenticated;
create function public.enter_home(p_owner uuid,p_token uuid) returns jsonb language sql security invoker set search_path='' as $$ select realm_private.enter_home(p_owner,p_token) $$;
revoke all on function public.enter_home(uuid,uuid) from public,anon;
grant execute on function public.enter_home(uuid,uuid),realm_private.enter_home(uuid,uuid) to authenticated;
create function public.move_home(p_owner uuid,p_token uuid,p_x integer,p_y integer) returns jsonb language sql security invoker set search_path='' as $$ select realm_private.move_home(p_owner,p_token,p_x,p_y) $$;
revoke all on function public.move_home(uuid,uuid,integer,integer) from public,anon;
grant execute on function public.move_home(uuid,uuid,integer,integer),realm_private.move_home(uuid,uuid,integer,integer) to authenticated;
create function public.leave_home(p_token uuid) returns void language sql security invoker set search_path='' as $$ select realm_private.leave_home(p_token) $$;
revoke all on function public.leave_home(uuid) from public,anon;
grant execute on function public.leave_home(uuid),realm_private.leave_home(uuid) to authenticated;
-- Database events are hints; permission-filtered reads/RPCs remain authoritative.
alter publication supabase_realtime add table public.direct_messages;
alter publication supabase_realtime add table public.friendships;
