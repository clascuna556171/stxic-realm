-- Repair founder authorization without trusting legacy name/email/admin-derived registry entries.
-- Existing pet records remain quarantined for operator review; no ownership data is deleted.
alter table realm_private.founder_accounts add column verified_at timestamptz;
comment on column realm_private.founder_accounts.verified_at is
 'Set only by a trusted database operator after independently verifying the creator account UUID. Legacy automatic entries are unverified.';

create or replace function realm_private.is_founder(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path='' as $$
 select p_user is not null and realm_private.active_account(p_user)
 and exists(select 1 from realm_private.founder_accounts where user_id=p_user and verified_at is not null)
$$;

create or replace function realm_private.grant_founder_pet(p_user_id uuid default auth.uid()) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 target_id uuid := coalesce(p_user_id, auth.uid());
 triarch_pet public.user_pets;
begin
 if target_id is null then
  raise exception 'Target founder user ID is required.' using errcode = '22023';
 end if;

 -- Authenticated callers can only claim for their own verified founder account
 if coalesce(nullif(current_setting('role', true), 'none'), '') = 'authenticated' or auth.uid() is not null then
  perform realm_private.require_active();
  if auth.uid() is distinct from target_id or not realm_private.is_founder(auth.uid()) then
   raise exception 'Triarch is reserved exclusively for the verified STXIC Realm founder account.' using errcode = '42501';
  end if;
 end if;

 -- Only a trusted database operator may verify founder IDs. Never self-enroll callers.
 if not realm_private.is_founder(target_id) then
  raise exception 'Account is not a verified Realm founder.' using errcode = '42501';
 end if;

 insert into public.user_pets (user_id, species_id, nickname, personality, is_starter)
 values (target_id, 'triarch', 'Triarch', 'Loyal', false)
 on conflict (user_id, species_id) do update set
  personality = public.user_pets.personality
 returning * into triarch_pet;

 insert into public.user_pet_equipment (user_id, banner_pet_id, house_pet_ids)
 values (target_id, triarch_pet.id, array[triarch_pet.id])
 on conflict (user_id) do update set
  banner_pet_id = coalesce(public.user_pet_equipment.banner_pet_id, excluded.banner_pet_id),
  house_pet_ids = case
   when not (triarch_pet.id = any(public.user_pet_equipment.house_pet_ids)) and cardinality(public.user_pet_equipment.house_pet_ids) < 3
   then array_append(public.user_pet_equipment.house_pet_ids, triarch_pet.id)
   else public.user_pet_equipment.house_pet_ids
  end,
  updated_at = clock_timestamp();

 return to_jsonb(triarch_pet);
end $$;

create or replace function realm_private.get_user_pets(p_user uuid default auth.uid()) returns jsonb language plpgsql security definer set search_path='' as $$
declare target_user uuid := coalesce(p_user, auth.uid());
begin
 perform realm_private.require_active();
 if not realm_private.profile_visible(target_user) then
  raise exception 'Pet collection unavailable.' using errcode = '42501';
 end if;
 if target_user = auth.uid() and realm_private.is_founder(target_user) and not exists(select 1 from public.user_pets where user_id = target_user and species_id = 'triarch') then
  perform realm_private.grant_founder_pet(target_user);
 end if;
 return jsonb_build_object(
  'user_id', target_user,
  'own', target_user = auth.uid(),
  'is_founder', realm_private.is_founder(target_user),
  'species', (
   select coalesce(jsonb_agg(to_jsonb(ps) order by ps.sort_order), '[]'::jsonb)
   from public.pet_species ps
   where ps.id <> 'triarch'
      or realm_private.is_founder(target_user)
  ),
  'owned', (
   select coalesce(jsonb_agg(
    jsonb_build_object(
     'id', up.id,
     'user_id', up.user_id,
     'species_id', up.species_id,
     'name', ps.name,
     'title', ps.title,
     'type', ps.type,
     'rarity', ps.rarity,
     'description', ps.description,
     'discovery_origin', ps.discovery_origin,
     'sprite_key', ps.sprite_key,
     'nickname', up.nickname,
     'personality', up.personality,
     'acquired_at', up.acquired_at,
     'is_starter', up.is_starter,
     'affection_level', up.affection_level
    ) order by up.acquired_at asc
   ), '[]'::jsonb)
   from public.user_pets up
   join public.pet_species ps on ps.id = up.species_id
   where up.user_id = target_user
     and (ps.id <> 'triarch' or realm_private.is_founder(target_user))
  ),
  'equipment', jsonb_build_object(
   'banner_pet_id', realm_private.get_equipped_banner_pet(target_user)->'id',
   'house_pet_ids', (select coalesce(jsonb_agg(pet->'id'), '[]'::jsonb) from jsonb_array_elements(realm_private.get_equipped_house_pets(target_user)) pet),
   'banner_pet', realm_private.get_equipped_banner_pet(target_user),
   'house_pets', realm_private.get_equipped_house_pets(target_user)
  ),
  'active_encounter', case when target_user = auth.uid() then realm_private.get_active_wildlife_encounter(target_user) else null end
 );
end $$;

-- A quarantined grant must not leak through direct table reads, or allow pet interactions.
drop policy user_pets_visible on public.user_pets;
create policy user_pets_visible on public.user_pets for select to authenticated using (
 (user_id=auth.uid() or realm_private.profile_visible(user_id))
 and (species_id<>'triarch' or realm_private.is_founder(user_id))
);
-- Policies execute in the caller context; the predicate exposes only a boolean.
grant execute on function realm_private.is_founder(uuid) to authenticated;

-- Remove unverified Triarch references from active equipment, retaining the pet record for review.
update public.user_pet_equipment eq set
 banner_pet_id=case when exists(select 1 from public.user_pets p where p.id=eq.banner_pet_id and p.species_id='triarch') then null else eq.banner_pet_id end,
 house_pet_ids=array(select pid from unnest(eq.house_pet_ids) pid where not exists(select 1 from public.user_pets p where p.id=pid and p.species_id='triarch')),
 updated_at=clock_timestamp()
where not realm_private.is_founder(eq.user_id)
 and (exists(select 1 from public.user_pets p where p.id=eq.banner_pet_id and p.species_id='triarch')
 or exists(select 1 from public.user_pets p where p.id=any(eq.house_pet_ids) and p.species_id='triarch'));

create or replace function realm_private.interact_with_pet(p_pet_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 pet_row public.user_pets;
begin
 perform realm_private.require_active();
 select * into pet_row from public.user_pets where id = p_pet_id and (species_id <> 'triarch' or realm_private.is_founder(user_id)) for update;
 if not found then
  raise exception 'Pet not found.' using errcode = '22023';
 end if;

 if pet_row.user_id <> auth.uid() and not realm_private.can_visit(pet_row.user_id) then
  raise exception 'You cannot interact with pets in a private home.' using errcode = '42501';
 end if;

 update public.user_pets
 set affection_level = least(affection_level + 1, 999999)
 where id = p_pet_id
 returning * into pet_row;

 return jsonb_build_object(
  'id', pet_row.id,
  'species_id', pet_row.species_id,
  'nickname', pet_row.nickname,
  'affection_level', pet_row.affection_level
 );
end $$;

notify pgrst, 'reload schema';
