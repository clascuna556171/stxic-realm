-- Account profile media is independent of profile_appearances (the world character).
create table public.profile_media (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 client_id uuid not null,kind text not null check(kind in ('avatar','banner','photo')),
 object_path text not null unique,mime text not null check(mime in ('image/png','image/jpeg','image/webp','image/gif')),
 bytes integer not null check(bytes between 1 and 8388608),width integer not null check(width between 1 and 8192),height integer not null check(height between 1 and 8192),
 state text not null default 'pending' check(state in ('pending','ready','deleting')),created_at timestamptz not null default clock_timestamp(),unique(user_id,client_id),check(width::bigint*height<=16777216)
);
create function realm_private.default_profile_style() returns jsonb language sql immutable set search_path='' as $$
 select '{"surface":"#202127","text":"#ececf1","accent":"#b3cdbd","font":"sans","avatar_shape":"circle","avatar_x":50,"avatar_y":50,"banner_x":50,"banner_y":50,"banner_height":180,"sections":["about","details","connections","photos","member"],"hidden":[]}'::jsonb
$$;
create function realm_private.valid_profile_style(v jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare key text;part jsonb;begin
 if v is null or jsonb_typeof(v)<>'object' or (select count(*) from jsonb_object_keys(v))<>12 then return false;end if;
 foreach key in array array['surface','text','accent'] loop if jsonb_typeof(v->key) is distinct from 'string' or v->>key !~ '^#[0-9a-fA-F]{6}$' then return false;end if;end loop;
 if jsonb_typeof(v->'font') is distinct from 'string' or jsonb_typeof(v->'avatar_shape') is distinct from 'string' or v->>'font' not in ('sans','serif','mono') or v->>'avatar_shape' not in ('circle','rounded','square') then return false;end if;
 foreach key in array array['avatar_x','avatar_y','banner_x','banner_y','banner_height'] loop
  if jsonb_typeof(v->key) is distinct from 'number' or (v->>key)!~'^\d{1,3}$' then return false;end if;
  if key='banner_height' then if (v->>key)::int not between 120 and 320 then return false;end if;
  elsif (v->>key)::int not between 0 and 100 then return false;end if;
 end loop;
 if jsonb_typeof(v->'sections') is distinct from 'array' or jsonb_array_length(v->'sections')<>5 or (select count(distinct s) from jsonb_array_elements_text(v->'sections') s)<>5
 or jsonb_typeof(v->'hidden') is distinct from 'array' or jsonb_array_length(v->'hidden')>5 then return false;end if;
 for part in select * from jsonb_array_elements((v->'sections')||(v->'hidden')) loop if part not in ('"about"'::jsonb,'"details"'::jsonb,'"connections"'::jsonb,'"photos"'::jsonb,'"member"'::jsonb) then return false;end if;end loop;
 return true;
exception when others then return false;end $$;
create table public.profile_cards (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 pronouns text not null default '' check(length(pronouns)<=60),status text not null default '' check(length(status)<=100),about text not null default '' check(length(about)<=2000),
 avatar_id uuid references public.profile_media(id),banner_id uuid references public.profile_media(id),gallery uuid[] not null default '{}',
 connections jsonb not null default '[]',details jsonb not null default '[]',style jsonb not null default realm_private.default_profile_style() check(realm_private.valid_profile_style(style)),
 revision integer not null default 0,joined_at timestamptz default now()
);
insert into public.profile_cards(user_id,about,joined_at) select p.id,p.bio,(to_jsonb(u)->>'created_at')::timestamptz from public.profiles p join auth.users u on u.id=p.id on conflict (user_id) do nothing;
create function realm_private.new_profile_card() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.profile_cards(user_id) values(new.id);return new;end $$;
create trigger new_profile_card after insert on public.profiles for each row execute function realm_private.new_profile_card();
create table public.profile_notes (
 viewer uuid not null references public.profiles(id) on delete cascade,target uuid not null references public.profiles(id) on delete cascade,
 note text not null check(length(note)<=1000),revision integer not null default 0,primary key(viewer,target)
);
create function realm_private.profile_media_visible(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select realm_private.active_account() and exists(select 1 from public.profile_media m where m.id=p_id and
 (m.user_id=auth.uid() or (m.state='ready' and realm_private.profile_visible(m.user_id) and exists(select 1 from public.profile_cards c where c.user_id=m.user_id and (c.avatar_id=m.id or c.banner_id=m.id or (m.id=any(c.gallery) and not c.style->'hidden' @> '["photos"]'::jsonb))))))
$$;
create function realm_private.can_read_profile_object(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profile_media m where m.object_path=p_path and m.state='ready' and realm_private.profile_media_visible(m.id))
$$;
alter table public.profile_cards enable row level security;alter table public.profile_media enable row level security;alter table public.profile_notes enable row level security;
revoke all on public.profile_cards,public.profile_media,public.profile_notes from public,anon,authenticated;
grant select on public.profile_cards,public.profile_media,public.profile_notes to authenticated;
create policy own_profile_card on public.profile_cards for select to authenticated using(user_id=auth.uid() and realm_private.active_account());
create policy profile_media_visible on public.profile_media for select to authenticated using(realm_private.profile_media_visible(id));
create policy own_profile_notes on public.profile_notes for select to authenticated using(viewer=auth.uid() and realm_private.active_account());
-- Narrow public projection with its own explicit current-access check; no hidden card fields.
create view public.account_portraits as select c.user_id,m.object_path,c.style->>'avatar_shape' as shape,c.style->>'avatar_x' as x,c.style->>'avatar_y' as y from public.profile_cards c join public.profile_media m on m.id=c.avatar_id and m.state='ready' where realm_private.profile_visible(c.user_id);
revoke all on public.account_portraits from public,anon;grant select on public.account_portraits to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('realm-profiles','realm-profiles',false,8388608,array['image/png','image/jpeg','image/webp','image/gif']) on conflict (id) do nothing;
create policy realm_profile_objects_read on storage.objects for select to authenticated using(bucket_id='realm-profiles' and realm_private.can_read_profile_object(name));
create policy realm_profile_read_guard on storage.objects as restrictive for select to authenticated using(bucket_id<>'realm-profiles' or realm_private.can_read_profile_object(name));
create policy realm_profile_no_anon_read on storage.objects as restrictive for select to anon using(bucket_id<>'realm-profiles');
-- Even a generic future Storage write policy cannot bypass the authenticated upload handler.
create policy realm_profile_no_raw_insert on storage.objects as restrictive for insert to anon,authenticated with check(bucket_id<>'realm-profiles');
create policy realm_profile_no_raw_update on storage.objects as restrictive for update to anon,authenticated using(bucket_id<>'realm-profiles') with check(bucket_id<>'realm-profiles');
create policy realm_profile_no_raw_delete on storage.objects as restrictive for delete to anon,authenticated using(bucket_id<>'realm-profiles');

create function realm_private.get_profile_card(p_user uuid default auth.uid(),p_space uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.profile_cards;visible_card jsonb;begin
 perform realm_private.require_active();
 if not realm_private.profile_visible(p_user) then raise exception 'Profile unavailable.' using errcode='42501';end if;
 select * into c from public.profile_cards where user_id=p_user;
 visible_card:=to_jsonb(c);
 if p_user<>auth.uid() then
  if c.style->'hidden' @> '["about"]'::jsonb then visible_card:=visible_card||'{"about":""}';end if;
  if c.style->'hidden' @> '["details"]'::jsonb then visible_card:=visible_card||'{"details":[]}';end if;
  if c.style->'hidden' @> '["connections"]'::jsonb then visible_card:=visible_card||'{"connections":[]}';end if;
  if c.style->'hidden' @> '["photos"]'::jsonb then visible_card:=visible_card||'{"gallery":[]}';end if;
  if c.style->'hidden' @> '["member"]'::jsonb then visible_card:=visible_card||'{"joined_at":null}';end if;
 end if;
 return jsonb_build_object('profile',(select to_jsonb(p) from public.profiles p where id=p_user),'card',visible_card,
 'media',(select coalesce(jsonb_agg(to_jsonb(m)-'client_id'),'[]') from public.profile_media m where m.user_id=p_user and realm_private.profile_media_visible(m.id)),
 'own',p_user=auth.uid(),'friends',realm_private.are_friends(auth.uid(),p_user),
 'roles',case when p_space is not null and realm_private.space_role(p_space) is not null and realm_private.space_role(p_space,p_user) is not null then jsonb_build_array(realm_private.space_role(p_space,p_user)) else '[]'::jsonb end,
 'note',coalesce((select to_jsonb(n)-'viewer'-'target' from public.profile_notes n where viewer=auth.uid() and target=p_user),'{"note":"","revision":0}'::jsonb));
end $$;
create function realm_private.save_profile_card(p_profile jsonb,p_card jsonb,p_revision integer,p_identity_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.profile_cards;p public.profiles;link jsonb;field jsonb;media_id uuid;gallery_ids uuid[];begin
 perform realm_private.require_active();
 select * into p from public.profiles where id=auth.uid() for update;
 select * into c from public.profile_cards where user_id=auth.uid() for update;
 if p.revision is distinct from p_identity_revision or c.revision is distinct from p_revision then raise sqlstate 'PT409' using message='Profile changed on another device. Reload before saving.';end if;
 if p_card is null or jsonb_typeof(p_card)<>'object' or octet_length(p_card::text)>20000 or not realm_private.valid_profile_style(p_card->'style')
 or jsonb_typeof(p_card->'connections') is distinct from 'array' or jsonb_array_length(p_card->'connections')>8
 or jsonb_typeof(p_card->'details') is distinct from 'array' or jsonb_array_length(p_card->'details')>8
 or jsonb_typeof(p_card->'gallery') is distinct from 'array' or jsonb_array_length(p_card->'gallery')>6 then raise exception 'Invalid profile settings or section limits.' using errcode='22023';end if;
 for link in select * from jsonb_array_elements(p_card->'connections') loop
  if not realm_private.valid_project_links(jsonb_build_array(link)) then raise exception 'Use titled HTTPS connections.' using errcode='22023';end if;
 end loop;
 for field in select * from jsonb_array_elements(p_card->'details') loop
  if jsonb_typeof(field)<>'object' or jsonb_typeof(field->'label') is distinct from 'string' or length(trim(field->>'label')) not between 1 and 40 or jsonb_typeof(field->'value') is distinct from 'string' or length(field->>'value')>200 then raise exception 'Custom details need a label (40 characters) and text (200 characters).' using errcode='22023';end if;
 end loop;
 begin select coalesce(array_agg(value::uuid),'{}'::uuid[]) into gallery_ids from jsonb_array_elements_text(p_card->'gallery');exception when others then raise exception 'Invalid photo selection.' using errcode='22023';end;
 if cardinality(gallery_ids)<>(select count(distinct x) from unnest(gallery_ids) x) then raise exception 'Choose each photo once.' using errcode='22023';end if;
 -- Owner lock also serializes service upload/deletion and profile saves.
 foreach media_id in array array[(p_card->>'avatar_id')::uuid,(p_card->>'banner_id')::uuid]||gallery_ids loop
  if media_id is not null and not exists(select 1 from public.profile_media m where m.id=media_id and m.user_id=auth.uid() and m.state='ready') then raise exception 'Choose your own completed uploads.' using errcode='42501';end if;
 end loop;
 if exists(select 1 from public.profile_media m where (m.id=(p_card->>'avatar_id')::uuid and m.kind<>'avatar') or (m.id=(p_card->>'banner_id')::uuid and m.kind<>'banner') or (m.id=any(gallery_ids) and m.kind<>'photo')) then raise exception 'Choose an image uploaded for the matching profile slot.' using errcode='22023';end if;
 update public.profiles set username=lower(trim(p_profile->>'username')),display_name=trim(p_profile->>'display_name'),bio=coalesce(p_profile->>'bio',''),revision=revision+1,updated_at=clock_timestamp() where id=auth.uid();
 update public.profile_cards set pronouns=coalesce(p_card->>'pronouns',''),status=coalesce(p_card->>'status',''),about=coalesce(p_card->>'about',''),avatar_id=(p_card->>'avatar_id')::uuid,banner_id=(p_card->>'banner_id')::uuid,
 gallery=gallery_ids,connections=p_card->'connections',details=p_card->'details',style=p_card->'style',revision=revision+1 where user_id=auth.uid();
 return realm_private.get_profile_card();
end $$;
create function realm_private.save_profile_note(p_user uuid,p_note text,p_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare n public.profile_notes;begin
 perform realm_private.require_active();if not realm_private.profile_visible(p_user) then raise exception 'Profile unavailable.' using errcode='42501';end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 insert into public.profile_notes(viewer,target,note) values(auth.uid(),p_user,'') on conflict do nothing;
 select * into n from public.profile_notes where viewer=auth.uid() and target=p_user for update;
 if n.revision is distinct from p_revision then raise sqlstate 'PT409' using message='Your private note changed. Reload before saving.';end if;
 update public.profile_notes set note=p_note,revision=revision+1 where viewer=auth.uid() and target=p_user;
 return jsonb_build_object('note',p_note,'revision',n.revision+1);
end $$;

-- Service-only media lifecycle. Edge verifies Auth.getUser and the binary file first.
create function realm_private.profile_media_operation(p_actor uuid,p_action text,p_id uuid default null,p_client uuid default null,p_kind text default null,p_mime text default null,p_bytes integer default null,p_width integer default null,p_height integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.profile_media;begin
 perform set_config('request.jwt.claim.sub',p_actor::text,true);perform realm_private.require_active();
 perform 1 from public.profiles where id=p_actor for update;
 if p_action='reserve' then
  select * into m from public.profile_media where user_id=p_actor and client_id=p_client;
  if found then
   if m.kind is distinct from p_kind or m.bytes is distinct from p_bytes or m.mime is distinct from p_mime or m.width is distinct from p_width or m.height is distinct from p_height then raise sqlstate 'PT409' using message='Upload retry differs. Select the file again.';end if;return to_jsonb(m);
  end if;
  if (select count(*) from public.profile_media where user_id=p_actor)>=30 or (select coalesce(sum(bytes),0) from public.profile_media where user_id=p_actor)+p_bytes>62914560 then raise sqlstate 'PT429' using message='Profile upload library is full (30 files / 60 MiB). Remove unused uploads.';end if;
  perform realm_private.charge('profile_upload',15,3600);
  p_id:=gen_random_uuid();
  insert into public.profile_media(id,user_id,client_id,kind,object_path,mime,bytes,width,height) values(p_id,p_actor,p_client,p_kind,p_actor||'/'||p_id||case p_mime when 'image/png' then '.png' when 'image/jpeg' then '.jpg' when 'image/gif' then '.gif' else '.webp' end,p_mime,p_bytes,p_width,p_height) returning * into m;
 elsif p_action='cleanup' then
  -- No referenced media is removed. May run for a pending upload left by a failed Storage call.
  select * into m from public.profile_media where id=p_id and user_id=p_actor;
  if not found then raise exception 'Upload unavailable.' using errcode='42501';end if;
  if exists(select 1 from public.profile_cards c where c.user_id=p_actor and (avatar_id=m.id or banner_id=m.id or m.id=any(gallery))) then raise sqlstate 'PT409' using message='Remove this image from your saved profile before deleting it.';end if;
  update public.profile_media set state='deleting' where id=m.id returning * into m;
 elsif p_action='finish' then
  update public.profile_media set state='ready' where id=p_id and user_id=p_actor and state in ('pending','ready') returning * into m;
  if not found then raise exception 'Upload unavailable.' using errcode='42501';end if;
 elsif p_action='removed' then
  delete from public.profile_media where id=p_id and user_id=p_actor and state='deleting' returning * into m;
 else raise exception 'Unknown media operation.' using errcode='22023';end if;
 return to_jsonb(m);
end $$;
-- Storage objects are queued separately: SQL cannot synchronously remove Storage blobs.
create table realm_private.profile_object_gc(object_path text primary key,created_at timestamptz not null default clock_timestamp());
create function realm_private.queue_profile_objects() returns trigger language plpgsql security definer set search_path='' as $$begin insert into realm_private.profile_object_gc(object_path) select object_path from public.profile_media where user_id=old.id on conflict do nothing;return old;end $$;
create trigger queue_profile_objects before delete on public.profiles for each row execute function realm_private.queue_profile_objects();
create function realm_private.profile_media_gc(p_path text default null) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if p_path is not null then delete from realm_private.profile_object_gc where object_path=p_path;end if;
 return (select coalesce(jsonb_agg(object_path),'[]') from (select object_path from realm_private.profile_object_gc order by created_at limit 30) q);end $$;
do $$declare definition text;begin
 definition:=pg_get_functiondef('realm_private.get_identity()'::regprocedure);
 definition:=replace(definition,'''profile'',to_jsonb(p),','''profile'',to_jsonb(p)||coalesce((select jsonb_build_object(''avatar_path'',a.object_path,''avatar_shape'',a.shape,''avatar_x'',a.x,''avatar_y'',a.y) from public.account_portraits a where a.user_id=p.id),''{}''::jsonb),');execute definition;
 definition:=pg_get_functiondef('realm_private.own_export(uuid)'::regprocedure);
 definition:=replace(definition,'''home'',','''account_profile'',(select to_jsonb(c) from public.profile_cards c where user_id=p_user),''profile_uploads'',(select coalesce(jsonb_agg(to_jsonb(m)-''client_id''),''[]'') from public.profile_media m where user_id=p_user),''private_profile_notes'',(select coalesce(jsonb_agg(to_jsonb(n)),''[]'') from public.profile_notes n where viewer=p_user),''home'',');execute definition;
 definition:=pg_get_functiondef('realm_private.process_privacy_jobs()'::regprocedure);
 definition:=replace(definition,'if (select count(*) from public.home_guestbook where author_id=j.user_id)',
 'if (select count(*) from public.profile_notes where viewer=j.user_id)+(select count(*) from public.profile_media where user_id=j.user_id)+(select count(*) from public.home_guestbook where author_id=j.user_id)');execute definition;
end $$;
do $$declare f record;role_name text;begin
 for f in select p.oid::regprocedure signature,p.proname,pg_get_function_identity_arguments(p.oid) args,pg_get_function_arguments(p.oid) full_args,pg_get_function_result(p.oid) result from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='realm_private' and p.proname in ('get_profile_card','save_profile_card','save_profile_note','profile_media_operation','profile_media_gc') loop
 role_name:=case when f.proname in ('profile_media_operation','profile_media_gc') then 'service_role' else 'authenticated' end;
 execute format('create function public.%I(%s) returns %s language sql security invoker set search_path='''' as $body$ select realm_private.%I(%s) $body$',f.proname,f.full_args,f.result,f.proname,(select string_agg(split_part(trim(a),' ',1),',') from unnest(string_to_array(f.args,',')) a));
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);execute format('grant execute on function %s to %I',f.signature,role_name);
 execute format('revoke all on function public.%I(%s) from public,anon,authenticated',f.proname,f.args);execute format('grant execute on function public.%I(%s) to %I',f.proname,f.args,role_name);
 end loop;
end $$;
revoke all on function realm_private.default_profile_style(),realm_private.valid_profile_style(jsonb),realm_private.new_profile_card(),realm_private.profile_media_visible(uuid),realm_private.can_read_profile_object(text),realm_private.queue_profile_objects() from public,anon,authenticated;
grant execute on function realm_private.profile_media_visible(uuid),realm_private.can_read_profile_object(text) to authenticated;
revoke all on realm_private.profile_object_gc from public,anon,authenticated;
