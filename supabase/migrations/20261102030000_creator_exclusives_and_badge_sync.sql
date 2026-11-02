-- Migration: 20261102030000_creator_exclusives_and_badge_sync.sql
-- Enforces that Creator Exclusives (realm-creator frame, Triarch pet, and realm-creator hallmark)
-- are strictly reserved for the verified STXIC Realm founder/creator account.
-- Non-founder team members receive a curated set of team hallmarks and can never equip creator exclusives.
-- Also persists and synchronizes badge state on profile cards so visitors ("stalkers") can see
-- unlocked hallmarks and equipped companions when inspecting member profiles.

-- 1. Founder authority is exclusively the operator-verified UUID registry.
-- Never infer verification from email, editable names, or platform-admin status.
-- The previous hardening migration preserves unverified legacy grants for audit.

-- 2. Restrict realm-creator frame strictly to verified founder (not generic platform_admin)
do $$declare definition text;begin
 definition:=pg_get_functiondef('realm_private.save_profile_card(jsonb,jsonb,integer,integer)'::regprocedure);
 if position('and not realm_private.platform_admin()' in definition) > 0 then
  definition:=replace(definition,
   'and not realm_private.platform_admin()',
   'and not realm_private.is_founder(auth.uid())'
  );
  execute definition;
 end if;
end $$;

-- Strip realm-creator frame from any non-founder profiles
update public.profile_cards
set style = jsonb_set(style, '{frame_id}', '"none"'::jsonb), revision = revision + 1
where style->>'frame_id' = 'realm-creator'
  and not realm_private.is_founder(user_id);

-- 3. Add badge_state column to profile_cards for server synchronization
alter table public.profile_cards add column if not exists badge_state jsonb not null default '{"unlocked":{},"featured":[]}'::jsonb;

-- Helper returning all 32 hallmarks unlocked for verified founder
create or replace function realm_private.founder_all_badges() returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object(
  'realm-creator', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'early-pioneer', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'realm-explorer', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'pathfinder', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'house-founder', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'realm-duelist', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'builder', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'contributor', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'collector', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'treasure-hunter', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'event-champion', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'daily-devotee', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'loyal-resident', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'community-member', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'feedback-giver', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'bug-hunter', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'code-contributor', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'design-contributor', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'system-tinkerer', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'lore-reader', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'storyteller', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'chronicle-keeper', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'milestone-explorer', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'progress-seeker', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'discord-ally', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'house-leader', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'guardian', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'supporter', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'realm-patron', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'seasonal-veteran', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'event-participant', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access'),
  'realm-legend', jsonb_build_object('unlockedAt', '2026-10-28T00:00:00.000Z', 'grantedBy', 'Founder Sovereign Access')
 );
$$;

-- Explicit grants are written only by a trusted operator. Browser milestones are
-- local progress hints, never evidence for public honors or role grants.
create table realm_private.badge_grants (
 user_id uuid not null references auth.users(id) on delete cascade,
 badge_id text not null check (realm_private.founder_all_badges() ? badge_id and badge_id <> 'realm-creator'),
 unlocked_at timestamptz not null default now(),
 granted_by text not null,
 primary key (user_id,badge_id)
);
revoke all on realm_private.badge_grants from public,anon,authenticated;

create or replace function realm_private.get_user_badges(p_user uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 saved jsonb;
 unlocked jsonb := '{}'::jsonb;
 featured jsonb;
 team_ids text[] := array['early-pioneer','code-contributor','design-contributor','guardian','contributor','builder','feedback-giver','loyal-resident'];
 badge text;
begin
 select badge_state into saved from public.profile_cards where user_id=p_user;
 select coalesce(jsonb_object_agg(badge_id,jsonb_build_object('unlockedAt',unlocked_at,'grantedBy',granted_by)),'{}'::jsonb)
 into unlocked from realm_private.badge_grants where user_id=p_user;
 if realm_private.is_founder(p_user) then
  unlocked := realm_private.founder_all_badges();
  featured := '["realm-creator","early-pioneer","code-contributor","guardian","treasure-hunter"]'::jsonb;
 elsif exists(select 1 from realm_private.platform_admins where user_id=p_user) then
  foreach badge in array team_ids loop
   unlocked := unlocked || jsonb_build_object(badge,jsonb_build_object('unlockedAt','2026-10-28T00:00:00.000Z','grantedBy','Team Member Grant'));
  end loop;
  featured := '["early-pioneer","code-contributor","guardian","contributor","builder"]'::jsonb;
 else
  featured := '[]'::jsonb;
 end if;
 if saved->'pins_saved' = 'true'::jsonb then
  featured := saved->'featured';
 end if;
 -- Revoked grants and legacy malformed/forged pins disappear on every read.
 if jsonb_typeof(featured) <> 'array' then featured := '[]'::jsonb; end if;
 select coalesce(jsonb_agg(id order by ordinal),'[]'::jsonb) into featured from (
  select value #>> '{}' as id,min(ord) as ordinal
  from jsonb_array_elements(featured) with ordinality as pins(value,ord)
  where jsonb_typeof(value)='string' and unlocked ? (value #>> '{}')
  group by value order by min(ord) limit 5
 ) valid;
 return jsonb_build_object('unlocked',unlocked,'featured',featured);
end $$;

-- Pins are independent from profile content revisions. A profile save cannot
-- overwrite them, and pinning does not make an unrelated profile draft stale.
create or replace function public.save_user_badges(p_badge_state jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 target_id uuid := auth.uid();
 authoritative jsonb;
 pins jsonb;
 item jsonb;
begin
 perform realm_private.require_active();
 if target_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 if p_badge_state is null or jsonb_typeof(p_badge_state)<>'object' then
  raise exception 'Invalid badge state.' using errcode='22023';
 end if;
 if exists(select 1 from jsonb_object_keys(p_badge_state) k where k not in ('unlocked','featured')) then
  raise exception 'Unknown badge field.' using errcode='22023';
 end if;
 pins := p_badge_state->'featured';
 if pins is null or jsonb_typeof(pins)<>'array' then
  raise exception 'Featured badges must be an array.' using errcode='22023';
 end if;
 if jsonb_array_length(pins)>5 or exists(select 1 from jsonb_array_elements(pins) p where jsonb_typeof(p)<>'string') then
  raise exception 'Choose up to five badge IDs.' using errcode='22023';
 end if;
 if (select count(*)<>count(distinct value) from jsonb_array_elements_text(pins)) then
  raise exception 'Duplicate badge pins are not allowed.' using errcode='22023';
 end if;
 authoritative := realm_private.get_user_badges(target_id)->'unlocked';
 if p_badge_state ? 'unlocked' then
  if jsonb_typeof(p_badge_state->'unlocked')<>'object' then
   raise exception 'Invalid badge unlocks.' using errcode='22023';
  end if;
  for item in select jsonb_build_object('id',key,'record',value) from jsonb_each(p_badge_state->'unlocked') loop
   if not (realm_private.founder_all_badges() ? (item->>'id')) or jsonb_typeof(item->'record')<>'object' then
    raise exception 'Unknown or malformed badge unlock.' using errcode='22023';
   end if;
   if not (authoritative ? (item->>'id')) then
    raise exception 'Badge unlocks are server-owned.' using errcode='42501';
   end if;
  end loop;
 end if;
 for item in select value from jsonb_array_elements(pins) loop
  if not (realm_private.founder_all_badges() ? (item #>> '{}')) then
   raise exception 'Unknown badge ID.' using errcode='22023';
  end if;
  if not (authoritative ? (item #>> '{}')) then
   raise exception 'Only unlocked badges can be pinned.' using errcode='42501';
  end if;
 end loop;
 update public.profile_cards set badge_state=jsonb_build_object('featured',pins,'pins_saved',true) where user_id=target_id;
 return realm_private.get_user_badges(target_id);
end $$;
revoke all on function public.save_user_badges(jsonb) from public,anon;
grant execute on function public.save_user_badges(jsonb) to authenticated;

-- 4. Expose is_founder, badge_state, and house_pets in get_profile_card
create or replace function realm_private.get_profile_card(p_user uuid default auth.uid(),p_space uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
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
 return jsonb_build_object(
  'profile',(select to_jsonb(p) from public.profiles p where id=p_user),
  'card',visible_card,
  'media',(select coalesce(jsonb_agg(to_jsonb(m)-'client_id'),'[]') from public.profile_media m where m.user_id=p_user and realm_private.profile_media_visible(m.id)),
  'own',p_user=auth.uid(),
  'is_founder',realm_private.is_founder(p_user),
  'banner_pet',realm_private.get_equipped_banner_pet(p_user),
  'house_pets',realm_private.get_equipped_house_pets(p_user),
  'badge_state',realm_private.get_user_badges(p_user),
  'friends',realm_private.are_friends(auth.uid(),p_user),
  'roles',case when p_space is not null and realm_private.space_role(p_space) is not null and realm_private.space_role(p_space,p_user) is not null then jsonb_build_array(realm_private.space_role(p_space,p_user)) else '[]'::jsonb end,
  'note',coalesce((select to_jsonb(n)-'viewer'-'target' from public.profile_notes n where viewer=auth.uid() and target=p_user),'{"note":"","revision":0}'::jsonb)
 );
end $$;

-- 5. Expose is_founder in access_status
create or replace function realm_private.access_status() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required.' using errcode='42501';end if;
 return jsonb_build_object(
  'active',realm_private.active_account(),
  'state',(select state from realm_private.accounts where user_id=auth.uid()),
  'platform_admin',realm_private.platform_admin(),
  'is_founder',realm_private.is_founder(auth.uid()),
  'administration',(select value from realm_private.settings where key='administration'),
  'account_invitations',(select value from realm_private.settings where key='account_invitations'),
  'privacy_jobs',(select value from realm_private.settings where key='privacy_jobs')
 );
end $$;

revoke all on function realm_private.founder_all_badges() from public,anon,authenticated;
revoke all on function realm_private.get_user_badges(uuid) from public,anon,authenticated;
notify pgrst, 'reload schema';
