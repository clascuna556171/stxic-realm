-- Keep a durable cleanup record throughout an upload and after deletion starts.
-- A grace period allows an in-flight Storage upload to settle before collection.
create function realm_private.track_profile_object() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.state in ('pending','deleting') then
  insert into realm_private.profile_object_gc(object_path,created_at) values(new.object_path,clock_timestamp())
  on conflict (object_path) do update set created_at=excluded.created_at;
 elsif new.state='ready' then
  delete from realm_private.profile_object_gc where object_path=new.object_path;
 end if;
 return new;
end $$;
create trigger track_profile_object after insert or update of state on public.profile_media
 for each row execute function realm_private.track_profile_object();
revoke all on function realm_private.track_profile_object() from public,anon,authenticated;

-- Deleting an account must restart the grace period even for an old reservation.
create or replace function realm_private.queue_profile_objects() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into realm_private.profile_object_gc(object_path,created_at)
 select object_path,clock_timestamp() from public.profile_media where user_id=old.id
 on conflict (object_path) do update set created_at=excluded.created_at;
 return old;
end $$;

-- Include uploads already pending or being removed when upgrading.
insert into realm_private.profile_object_gc(object_path)
 select object_path from public.profile_media where state in ('pending','deleting')
 on conflict (object_path) do nothing;

create or replace function realm_private.profile_media_gc(p_path text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if p_path is not null then
  delete from realm_private.profile_object_gc g where g.object_path=p_path
   and not exists(select 1 from public.profile_media m where m.object_path=g.object_path and m.state in ('pending','ready'));
 end if;
 return (select coalesce(jsonb_agg(object_path),'[]') from (
  select g.object_path from realm_private.profile_object_gc g
  where g.created_at < clock_timestamp()-interval '1 hour'
   and not exists(select 1 from public.profile_media m where m.object_path=g.object_path and m.state in ('pending','ready'))
  order by g.created_at limit 30
 ) q);
end $$;
