-- Additive home social state. No existing home/layout is rewritten.
-- Display copy is not furniture identity: accept old/new copy with the same assets and geometry.
do $$declare definition text;begin
 definition:=pg_get_functiondef('realm_private.valid_layout(jsonb)'::regprocedure);
 definition:=replace(definition,' or item->>''name'' is distinct from asset.name or item->>''description'' is distinct from asset.description','');
 execute definition;
end $$;

create function realm_private.canonical_home_layout(v jsonb) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('schemaVersion',1,'objects',coalesce(jsonb_agg(
 jsonb_build_object('id',c.id,'name',c.name,'description',c.description,'width',c.width,'height',c.height,'x',(p.item->>'x')::integer,'y',(p.item->>'y')::integer) order by p.position),'[]'::jsonb))
 from jsonb_array_elements(v->'objects') with ordinality p(item,position) join realm_private.furniture_catalog c on c.id=p.item->>'id'
$$;
do $$declare definition text;begin
 definition:=pg_get_functiondef('realm_private.save_home(jsonb,text,integer)'::regprocedure);
 definition:=replace(definition,'set layout=p_layout,','set layout=realm_private.canonical_home_layout(p_layout),');execute definition;
end $$;
revoke all on function realm_private.canonical_home_layout(jsonb) from public,anon,authenticated;

create function realm_private.valid_project_links(v jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare link jsonb;url text;begin
 if v is null or jsonb_typeof(v)<>'array' or jsonb_array_length(v)>5 then return false;end if;
 for link in select * from jsonb_array_elements(v) loop
  url:=link->>'url';
  if jsonb_typeof(link)<>'object' or (select count(*) from jsonb_object_keys(link))<>2
   or jsonb_typeof(link->'title') is distinct from 'string' or length(trim(link->>'title')) not between 1 and 80
   or jsonb_typeof(link->'url') is distinct from 'string' or length(url)>2048
   or url !~ '^https://[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}(:443)?([/?#][^[:space:]<>\\]*)?$'
   or url ~ '[[:cntrl:]]' then return false;end if;
 end loop;return true;
exception when others then return false;end $$;
create table public.home_social_settings (
 owner_id uuid primary key references public.homes(owner_id) on delete cascade,
 posting text not null default 'friends' check(posting in ('friends','closed')),
 links jsonb not null default '[]' check(realm_private.valid_project_links(links)),
 revision integer not null default 0
);
create table public.home_guestbook (
 id uuid primary key default gen_random_uuid(),home_owner uuid not null references public.homes(owner_id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,client_id uuid not null,
 body text not null check(length(trim(body)) between 1 and 1000),created_at timestamptz not null default clock_timestamp(),
 unique(home_owner,author_id,client_id)
);
create index guestbook_home_time on public.home_guestbook(home_owner,created_at desc,id desc);
alter table public.home_social_settings enable row level security;
alter table public.home_guestbook enable row level security;
revoke all on public.home_social_settings,public.home_guestbook from public,anon,authenticated;
grant select on public.home_social_settings,public.home_guestbook to authenticated;
create policy home_social_visible on public.home_social_settings for select to authenticated using(realm_private.can_visit(owner_id));
create policy guestbook_visible on public.home_guestbook for select to authenticated using(
 realm_private.can_visit(home_owner) and (home_owner=auth.uid() or realm_private.profile_visible(author_id)));

create function realm_private.home_social(p_owner uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.home_social_settings;begin
 perform realm_private.require_active();
 -- A home lock serializes privacy changes with social operations.
 perform 1 from public.homes where owner_id=p_owner for share;
 if not realm_private.can_visit(p_owner) then raise exception 'Home access denied.' using errcode='42501';end if;
 select * into s from public.home_social_settings where owner_id=p_owner;
 return jsonb_build_object('posting',coalesce(s.posting,'friends'),'links',coalesce(s.links,'[]'),'revision',coalesce(s.revision,0),
  'can_post',coalesce(s.posting,'friends')='friends' or auth.uid()=p_owner,
  'can_moderate',auth.uid()=p_owner or realm_private.platform_admin(),
  'entries',(select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id desc),'[]') from
   (select g.id,g.author_id,g.body,g.created_at,case when realm_private.profile_visible(g.author_id) then p.display_name else 'Unavailable account' end display_name from public.home_guestbook g join public.profiles p on p.id=g.author_id
    where g.home_owner=p_owner and (auth.uid()=p_owner or realm_private.profile_visible(g.author_id)) order by g.created_at desc,g.id desc limit 100) q));
end $$;
create function realm_private.save_home_social(p_posting text,p_links jsonb,p_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.home_social_settings;begin
 perform realm_private.require_active();
 perform 1 from public.homes where owner_id=auth.uid() for update;
 if not found then raise exception 'Home unavailable.' using errcode='42501';end if;
 if p_posting is null or p_posting not in ('friends','closed') or not realm_private.valid_project_links(p_links) then raise exception 'Use up to five titled HTTPS project links and a valid posting setting.' using errcode='22023';end if;
 insert into public.home_social_settings(owner_id) values(auth.uid()) on conflict do nothing;
 select * into s from public.home_social_settings where owner_id=auth.uid() for update;
 if s.revision is distinct from p_revision then raise sqlstate 'PT409' using message='Home social settings changed. Reload before saving.';end if;
 update public.home_social_settings set posting=p_posting,links=p_links,revision=revision+1 where owner_id=auth.uid();
 return realm_private.home_social(auth.uid());
end $$;
create function realm_private.post_guestbook(p_owner uuid,p_body text,p_client uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;begin
 perform realm_private.require_active();
 -- Consistent account -> home lock order for bounded posting.
 perform 1 from realm_private.accounts where user_id=auth.uid() for update;
 perform 1 from public.homes where owner_id=p_owner for update;
 if not realm_private.can_visit(p_owner) or (auth.uid()<>p_owner and exists(select 1 from public.home_social_settings where owner_id=p_owner and posting='closed')) then raise exception 'Guestbook posting is unavailable.' using errcode='42501';end if;
 select id into result from public.home_guestbook where home_owner=p_owner and author_id=auth.uid() and client_id=p_client;
 if result is not null then return result;end if;
 if p_client is null or p_body is null or length(trim(p_body)) not between 1 and 1000 then raise exception 'Write 1–1000 characters.' using errcode='22023';end if;
 if (select count(*) from public.home_guestbook where home_owner=p_owner)>=100 then raise sqlstate 'PT429' using message='This guestbook is full. Its owner can remove entries.';end if;
 perform realm_private.charge('guestbook',5,3600);
 insert into public.home_guestbook(home_owner,author_id,client_id,body) values(p_owner,auth.uid(),p_client,trim(p_body)) returning id into result;
 return result;
end $$;
create function realm_private.remove_guestbook(p_entry uuid) returns void language plpgsql security definer set search_path='' as $$
declare g public.home_guestbook;begin
 perform realm_private.require_active();
 select * into g from public.home_guestbook where id=p_entry;
 if not found then raise exception 'Entry unavailable.' using errcode='42501';end if;
 perform 1 from public.homes where owner_id=g.home_owner for update;
 if not realm_private.platform_admin() and (not realm_private.can_visit(g.home_owner) or auth.uid() not in (g.home_owner,g.author_id)) then raise exception 'Guestbook removal denied.' using errcode='42501';end if;
 delete from public.home_guestbook where id=p_entry;
 perform realm_private.log('guestbook.remove',p_entry,g.home_owner);
end $$;

-- Include new authored/owned social records in the existing private export, with its budgets intact.
do $$declare definition text;begin
 definition:=pg_get_functiondef('realm_private.own_export(uuid)'::regprocedure);
 definition:=replace(definition,'''home'',','''home_social_settings'',(select to_jsonb(s) from public.home_social_settings s where owner_id=p_user),
 ''authored_guestbook_entries'',(select coalesce(jsonb_agg(to_jsonb(g)),''[]'') from public.home_guestbook g where author_id=p_user),
 ''home'',');
 execute definition;
end $$;

do $$declare f record;begin
 for f in select p.oid::regprocedure signature,p.proname,pg_get_function_identity_arguments(p.oid) args,pg_get_function_arguments(p.oid) full_args,pg_get_function_result(p.oid) result
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='realm_private' and p.proname in ('home_social','save_home_social','post_guestbook','remove_guestbook') loop
 execute format('create function public.%I(%s) returns %s language sql security invoker set search_path='''' as $body$ select realm_private.%I(%s) $body$',f.proname,f.full_args,f.result,f.proname,(select string_agg(split_part(trim(a),' ',1),',') from unnest(string_to_array(f.args,',')) a));
 execute format('revoke all on function %s from public,anon',f.signature);
 execute format('grant execute on function %s to authenticated',f.signature);
 execute format('revoke all on function public.%I(%s) from public,anon',f.proname,f.args);
 execute format('grant execute on function public.%I(%s) to authenticated',f.proname,f.args);
 end loop;
end $$;
revoke all on function realm_private.valid_project_links(jsonb) from public,anon,authenticated;
