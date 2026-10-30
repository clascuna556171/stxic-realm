-- Owner-curated stickies and bookmarks, independent of layout/social revisions.
create function realm_private.valid_home_memos(v jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare n jsonb;ids text[]:='{}';begin
 if v is null or jsonb_typeof(v)<>'array' or jsonb_array_length(v)>30 then return false;end if;
 for n in select * from jsonb_array_elements(v) loop
  if jsonb_typeof(n)<>'object' or (select count(*) from jsonb_object_keys(n))<>5
   or jsonb_typeof(n->'id') is distinct from 'string' or length(n->>'id')<>36
   or (n->>'id')=any(ids) or jsonb_typeof(n->'body') is distinct from 'string'
   or length(trim(n->>'body')) not between 1 and 1000
   or jsonb_typeof(n->'pinned') is distinct from 'boolean'
   or jsonb_typeof(n->'created_at') is distinct from 'string' or length(n->>'created_at')>40
   or jsonb_typeof(n->'updated_at') is distinct from 'string' or length(n->>'updated_at')>40 then return false;end if;
  perform (n->>'id')::uuid;
  if not isfinite((n->>'created_at')::timestamptz) or not isfinite((n->>'updated_at')::timestamptz) then return false;end if;
  ids:=array_append(ids,n->>'id');
 end loop;return true;
exception when others then return false;end $$;
create table public.home_item_content (
 owner_id uuid primary key references public.homes(owner_id) on delete cascade,
 notes jsonb not null default '[]' check(realm_private.valid_home_memos(notes)),
 reading jsonb not null default '[]' check(realm_private.valid_project_links(reading)),
 revision integer not null default 0
);
alter table public.home_item_content enable row level security;
revoke all on public.home_item_content from public,anon,authenticated;
grant select on public.home_item_content to authenticated;
create policy item_content_visible on public.home_item_content for select to authenticated using(realm_private.can_visit(owner_id));
create function realm_private.home_item_content(p_owner uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.home_item_content;begin
 perform realm_private.require_active();
 perform 1 from public.homes where owner_id=p_owner for share;
 if not realm_private.can_visit(p_owner) then raise exception 'Home access denied.' using errcode='42501';end if;
 select * into s from public.home_item_content where owner_id=p_owner;
 return jsonb_build_object('notes',coalesce(s.notes,'[]'),'reading',coalesce(s.reading,'[]'),'revision',coalesce(s.revision,0));
end $$;
create function realm_private.save_home_item_content(p_revision integer,p_notes jsonb,p_reading jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.home_item_content;begin
 perform realm_private.require_active();
 perform 1 from public.homes where owner_id=auth.uid() for update;
 if not found then raise exception 'Home unavailable.' using errcode='42501';end if;
 if not realm_private.valid_home_memos(p_notes) or not realm_private.valid_project_links(p_reading) then raise exception 'Use up to 30 short notes and five titled HTTPS bookmarks.' using errcode='22023';end if;
 insert into public.home_item_content(owner_id) values(auth.uid()) on conflict do nothing;
 select * into s from public.home_item_content where owner_id=auth.uid() for update;
 if s.revision is distinct from p_revision then raise sqlstate 'PT409' using message='Shared content changed. Reload before saving.';end if;
 update public.home_item_content set notes=p_notes,reading=p_reading,revision=revision+1 where owner_id=auth.uid();
 return realm_private.home_item_content(auth.uid());
end $$;
do $$declare definition text;begin
 definition:=pg_get_functiondef('realm_private.own_export(uuid)'::regprocedure);
 definition:=replace(definition,'''home'',','''home_item_content'',(select to_jsonb(s) from public.home_item_content s where owner_id=p_user), ''home'',');
 execute definition;
end $$;
create function public.home_item_content(p_owner uuid) returns jsonb language sql security invoker set search_path='' as $$select realm_private.home_item_content(p_owner)$$;
create function public.save_home_item_content(p_revision integer,p_notes jsonb,p_reading jsonb) returns jsonb language sql security invoker set search_path='' as $$select realm_private.save_home_item_content(p_revision,p_notes,p_reading)$$;
revoke all on function realm_private.valid_home_memos(jsonb) from public,anon,authenticated;
revoke all on function realm_private.home_item_content(uuid),realm_private.save_home_item_content(integer,jsonb,jsonb),public.home_item_content(uuid),public.save_home_item_content(integer,jsonb,jsonb) from public,anon;
grant execute on function realm_private.home_item_content(uuid),realm_private.save_home_item_content(integer,jsonb,jsonb),public.home_item_content(uuid),public.save_home_item_content(integer,jsonb,jsonb) to authenticated;
