-- STXIC Realm: Pets & Realm Wildlife System
-- Additive migration for companion collection, habitat discovery, equipment, and Founder-only Triarch exclusivity.

create table public.pet_species (
 id text primary key,
 name text not null,
 title text not null default '',
 type text not null check (type in ('starter','wildlife','achievement','founder')),
 rarity text not null check (rarity in ('starter','uncommon','rare','founder')),
 description text not null,
 discovery_origin text not null,
 habitat_requirements jsonb not null default '{}'::jsonb,
 personality_pool text[] not null default '{"Curious"}'::text[],
 sprite_key text not null,
 sort_order integer not null default 0
);

insert into public.pet_species (id, name, title, type, rarity, description, discovery_origin, habitat_requirements, personality_pool, sprite_key, sort_order) values
 ('cat', 'Village Cat', '', 'starter', 'starter', 'A warm tabby companion in a crimson scarf who curls up near hearth light and softly purrs.', 'Free starter adoption', '{}'::jsonb, array['Sleepy','Curious','Loyal'], 'cat', 1),
 ('slime', 'Tiny Slime', '', 'starter', 'starter', 'A translucent sky-blue droplet companion that bounces gently and releases tiny floating bubbles.', 'Free starter adoption', '{}'::jsonb, array['Playful','Curious','Mischievous'], 'slime', 2),
 ('pup', 'Woodland Pup', '', 'starter', 'starter', 'A loyal floppy-eared pup with a traveler kerchief and tiny satchel, always eager to greet guests.', 'Free starter adoption', '{}'::jsonb, array['Loyal','Playful','Curious'], 'pup', 3),
 ('fox', 'Moss Fox', '', 'wildlife', 'uncommon', 'A quiet woodland fox cloaked in soft moss and a wild white blossom, drawn to leafy, comfortable rooms.', 'Forest & Cozy habitat visitor', '{"Forest": 2, "Cozy": 1}'::jsonb, array['Shy','Curious','Sleepy'], 'fox', 4),
 ('wisp', 'Crystal Wisp', '', 'wildlife', 'uncommon', 'An arcane amethyst prism orbited by starlight motes that drifts toward enchanted furnishings.', 'Magical habitat visitor', '{"Magical": 2}'::jsonb, array['Curious','Playful','Mischievous'], 'wisp', 5),
 ('bat', 'Cave Bat', '', 'wildlife', 'rare', 'A dusk-winged cavern dweller with royal-violet membranes that roosts near ancient, shadowy relics.', 'Dark & Ancient habitat visitor', '{"Dark": 1, "Ancient": 1}'::jsonb, array['Shy','Sleepy','Mischievous'], 'bat', 6),
 ('owl', 'Moon Owl', '', 'achievement', 'rare', 'A silver-plumed sentinel bearing a golden crescent crest, attracted to scholarly lore and moonlit lamps.', 'Lore & Ancient Starlight discovery', '{"Ancient": 1, "Magical": 1, "Light": 1}'::jsonb, array['Loyal','Sleepy','Curious'], 'owl', 7),
 ('triarch', 'Triarch', 'The First Wyrm', 'founder', 'founder', 'A sovereign three-headed wyrm of charcoal scales, royal-purple wings, and antique gold horns. Each head watches a different horizon.', 'Founder Exclusive grant', '{}'::jsonb, array['Loyal','Curious','Mischievous'], 'triarch', 8);

alter table public.pet_species enable row level security;
revoke all on public.pet_species from public,anon,authenticated;
grant select on public.pet_species to authenticated;
create policy pet_species_visible on public.pet_species for select to authenticated using (true);

-- Trusted habitat metadata mapped to existing and wildlife-themed furniture items.
create table realm_private.furniture_habitat_tags (
 furniture_id text primary key,
 tags text[] not null
);

insert into realm_private.furniture_habitat_tags (furniture_id, tags) values
 ('desk', array['Cozy','Light']),
 ('bookshelf', array['Ancient','Magical','Dark']),
 ('sofa', array['Cozy']),
 ('lantern', array['Magical','Light','Warm','Ancient']),
 ('banner', array['Ancient','Magical','Dark']),
 ('console', array['Magical','Light']),
 ('plant', array['Forest','Water']),
 ('bed', array['Cozy','Warm']),
 ('coffee-table', array['Cozy','Warm']),
 ('floor-lamp', array['Forest','Warm','Light']),
 ('mushroom-lamp', array['Forest','Warm']),
 ('potted-fern', array['Forest']),
 ('wooden-pet-bed', array['Cozy']),
 ('crystal-lantern', array['Magical','Light']),
 ('ancient-altar', array['Ancient','Magical']),
 ('dark-candle', array['Dark','Ancient']);

revoke all on realm_private.furniture_habitat_tags from public,anon,authenticated;

-- Dedicated immutable founder registry for Triarch authorization
create table realm_private.founder_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 granted_at timestamptz not null default now()
);
revoke all on realm_private.founder_accounts from public,anon,authenticated;

create function realm_private.is_founder(p_user uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select p_user is not null and realm_private.active_account(p_user) and (
  exists(select 1 from realm_private.founder_accounts where user_id = p_user)
  or exists(
   select 1 from auth.users u
   left join public.profiles p on p.id = u.id
   where u.id = p_user
     and (
      lower(coalesce(u.email, '')) in ('c.lascuna.556171@umindanao.edu.ph', 'clascuna556171@gmail.com', 'founder@stxic.realm')
      or lower(coalesce(u.email, '')) like '%clascuna%'
      or lower(coalesce(u.email, '')) like '%556171%'
      or lower(coalesce(p.username, '')) in ('stxic', 'clascuna556171', 'sebaz')
      or lower(coalesce(p.display_name, '')) in ('stxic', 'clascuna556171')
     )
  )
 )
$$;
revoke all on function realm_private.is_founder(uuid) from public,anon,authenticated;

-- Permanent owned pet instances
create table public.user_pets (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 species_id text not null references public.pet_species(id),
 nickname text check (nickname is null or (char_length(trim(nickname)) between 1 and 24 and nickname !~ '[[:cntrl:]<>]')),
 personality text not null check (personality in ('Sleepy','Curious','Playful','Shy','Loyal','Mischievous')),
 acquired_at timestamptz not null default now(),
 is_starter boolean not null default false,
 affection_level integer not null default 0 check (affection_level >= 0),
 unique (user_id, species_id)
);

create unique index user_pets_one_starter_idx on public.user_pets (user_id) where is_starter = true;
create index user_pets_user_idx on public.user_pets (user_id);

alter table public.user_pets enable row level security;
revoke all on public.user_pets from public,anon,authenticated;
grant select on public.user_pets to authenticated;
create policy user_pets_visible on public.user_pets for select to authenticated using (
 user_id = auth.uid() or realm_private.profile_visible(user_id)
);

-- Persistent wildlife encounters
create table public.pet_encounters (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 species_id text not null references public.pet_species(id),
 status text not null default 'active' check (status in ('active','bonded','expired')),
 created_at timestamptz not null default now(),
 bonded_at timestamptz
);

create unique index pet_encounters_active_user_idx on public.pet_encounters (user_id) where status = 'active';
create index pet_encounters_user_idx on public.pet_encounters (user_id);

alter table public.pet_encounters enable row level security;
revoke all on public.pet_encounters from public,anon,authenticated;
grant select on public.pet_encounters to authenticated;
create policy pet_encounters_owner_only on public.pet_encounters for select to authenticated using (
 user_id = auth.uid()
);

-- Banner and house pet equipment
create table public.user_pet_equipment (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 banner_pet_id uuid references public.user_pets(id) on delete set null,
 house_pet_ids uuid[] not null default '{}'::uuid[] check (cardinality(house_pet_ids) <= 3),
 updated_at timestamptz not null default now()
);

alter table public.user_pet_equipment enable row level security;
revoke all on public.user_pet_equipment from public,anon,authenticated;
grant select on public.user_pet_equipment to authenticated;
create policy user_pet_equipment_visible on public.user_pet_equipment for select to authenticated using (
 user_id = auth.uid() or realm_private.profile_visible(user_id)
);

-- Sanitize and validate pet nickname
create function realm_private.clean_pet_nickname(p_nickname text) returns text language plpgsql immutable set search_path='' as $$
declare cleaned text;
begin
 if p_nickname is null then return null; end if;
 cleaned := trim(regexp_replace(p_nickname, '\s+', ' ', 'g'));
 if cleaned = '' then return null; end if;
 if char_length(cleaned) > 24 or cleaned ~ '[[:cntrl:]<>]' then
  raise exception 'Pet nicknames must be 1–24 characters without control or HTML symbols.' using errcode = '22023';
 end if;
 return cleaned;
end $$;
revoke all on function realm_private.clean_pet_nickname(text) from public,anon,authenticated;

-- Helper projections for profile cards and rooms
create function realm_private.get_equipped_banner_pet(p_user uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select case
  when not realm_private.profile_visible(p_user) then null
  else (
   select jsonb_build_object(
    'id', up.id,
    'species_id', up.species_id,
    'name', ps.name,
    'title', ps.title,
    'nickname', up.nickname,
    'rarity', ps.rarity,
    'personality', up.personality,
    'sprite_key', ps.sprite_key,
    'affection_level', up.affection_level
   )
   from public.user_pet_equipment eq
   join public.user_pets up on up.id = eq.banner_pet_id and up.user_id = eq.user_id
   join public.pet_species ps on ps.id = up.species_id
   where eq.user_id = p_user
     and (ps.id <> 'triarch' or realm_private.is_founder(p_user))
  )
 end
$$;

create function realm_private.get_equipped_house_pets(p_owner uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((
  select jsonb_agg(
   jsonb_build_object(
    'id', up.id,
    'species_id', up.species_id,
    'name', ps.name,
    'title', ps.title,
    'nickname', up.nickname,
    'rarity', ps.rarity,
    'personality', up.personality,
    'sprite_key', ps.sprite_key,
    'affection_level', up.affection_level
   ) order by idx
  )
  from public.user_pet_equipment eq
  cross join lateral unnest(eq.house_pet_ids) with ordinality as u(pet_id, idx)
  join public.user_pets up on up.id = u.pet_id and up.user_id = eq.user_id
  join public.pet_species ps on ps.id = up.species_id
  where eq.user_id = p_owner
    and (ps.id <> 'triarch' or realm_private.is_founder(p_owner))
 ), '[]'::jsonb)
$$;

create function realm_private.get_active_wildlife_encounter(p_owner uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select (
  select jsonb_build_object(
   'id', pe.id,
   'species_id', pe.species_id,
   'name', ps.name,
   'rarity', ps.rarity,
   'description', ps.description,
   'discovery_origin', ps.discovery_origin,
   'sprite_key', ps.sprite_key,
   'status', pe.status,
   'created_at', pe.created_at
  )
  from public.pet_encounters pe
  join public.pet_species ps on ps.id = pe.species_id
  where pe.user_id = p_owner and pe.status = 'active' and ps.type <> 'founder'
  limit 1
 )
$$;

create function realm_private.get_user_pets_export(p_user uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'owned', coalesce((select jsonb_agg(to_jsonb(up) order by up.acquired_at) from public.user_pets up where up.user_id = p_user), '[]'::jsonb),
  'equipment', (select to_jsonb(eq) from public.user_pet_equipment eq where eq.user_id = p_user),
  'encounters', coalesce((select jsonb_agg(to_jsonb(pe) order by pe.created_at) from public.pet_encounters pe where pe.user_id = p_user), '[]'::jsonb)
 )
$$;

revoke all on function
 realm_private.get_equipped_banner_pet(uuid),
 realm_private.get_equipped_house_pets(uuid),
 realm_private.get_active_wildlife_encounter(uuid),
 realm_private.get_user_pets_export(uuid)
from public,anon,authenticated;

-- Complete user pet collection state
create function realm_private.get_user_pets(p_user uuid default auth.uid()) returns jsonb language plpgsql security definer set search_path='' as $$
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
      or exists(select 1 from public.user_pets up where up.user_id = target_user and up.species_id = 'triarch')
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
   'banner_pet_id', (select banner_pet_id from public.user_pet_equipment where user_id = target_user),
   'house_pet_ids', coalesce((select to_jsonb(house_pet_ids) from public.user_pet_equipment where user_id = target_user), '[]'::jsonb),
   'banner_pet', realm_private.get_equipped_banner_pet(target_user),
   'house_pets', realm_private.get_equipped_house_pets(target_user)
  ),
  'active_encounter', case when target_user = auth.uid() then realm_private.get_active_wildlife_encounter(target_user) else null end
 );
end $$;

-- Starter pet adoption (idempotent for matching starter, rejects multiple starters or non-starter species)
create function realm_private.adopt_starter_pet(p_species_id text, p_nickname text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 sp public.pet_species;
 existing_starter public.user_pets;
 new_pet public.user_pets;
 clean_nick text;
 chosen_personality text;
begin
 perform realm_private.require_active();
 perform 1 from public.profiles where id = auth.uid() for update;

 select * into sp from public.pet_species where id = p_species_id and type = 'starter';
 if not found then
  raise exception 'Choose a valid starter pet species (Village Cat, Tiny Slime, or Woodland Pup).' using errcode = '22023';
 end if;

 clean_nick := realm_private.clean_pet_nickname(p_nickname);

 select * into existing_starter from public.user_pets where user_id = auth.uid() and is_starter = true;
 if found then
  if existing_starter.species_id = p_species_id then
   if clean_nick is not null and existing_starter.nickname is distinct from clean_nick then
    update public.user_pets set nickname = clean_nick where id = existing_starter.id;
   end if;
   return realm_private.get_user_pets(auth.uid());
  else
   raise sqlstate 'PT409' using message = 'You have already adopted your starter companion.';
  end if;
 end if;

 chosen_personality := sp.personality_pool[1 + (abs(hashtext(auth.uid()::text || sp.id)) % cardinality(sp.personality_pool))];

 insert into public.user_pets (user_id, species_id, nickname, personality, is_starter)
 values (auth.uid(), sp.id, clean_nick, chosen_personality, true)
 returning * into new_pet;

 insert into public.user_pet_equipment (user_id, banner_pet_id, house_pet_ids)
 values (auth.uid(), new_pet.id, array[new_pet.id])
 on conflict (user_id) do update set
  banner_pet_id = coalesce(public.user_pet_equipment.banner_pet_id, excluded.banner_pet_id),
  house_pet_ids = case
   when cardinality(public.user_pet_equipment.house_pet_ids) = 0 then excluded.house_pet_ids
   else public.user_pet_equipment.house_pet_ids
  end,
  updated_at = clock_timestamp();

 return realm_private.get_user_pets(auth.uid());
end $$;

-- Evaluate room layout habitats and generate a persistent wildlife encounter if eligible
create function realm_private.evaluate_wildlife_encounter(p_owner uuid default auth.uid()) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 current_layout jsonb;
 tag_counts jsonb := '{}'::jsonb;
 candidate public.pet_species;
 req_key text;
 req_val integer;
 actual_val integer;
 matches boolean;
begin
 perform realm_private.require_active();
 if p_owner is distinct from auth.uid() then
  raise exception 'Only the home owner can evaluate wildlife habitats.' using errcode = '42501';
 end if;

 perform 1 from public.profiles where id = auth.uid() for update;

 -- If an active encounter already exists, preserve it across reloads and sessions
 if exists(select 1 from public.pet_encounters where user_id = auth.uid() and status = 'active') then
  return realm_private.get_active_wildlife_encounter(auth.uid());
 end if;

 select layout into current_layout from public.homes where owner_id = auth.uid();
 if current_layout is null or jsonb_typeof(current_layout->'objects') <> 'array' then
  return null;
 end if;

 -- Compute habitat tag totals from placed furniture objects
 select coalesce(jsonb_object_agg(tag, cnt), '{}'::jsonb) into tag_counts
 from (
  select unnest(fht.tags) as tag, count(*)::int as cnt
  from jsonb_array_elements(current_layout->'objects') obj
  join realm_private.furniture_habitat_tags fht on fht.furniture_id = obj->>'id'
  group by unnest(fht.tags)
 ) t;

 -- Check eligible unowned wildlife/achievement species in deterministic order
 for candidate in
  select * from public.pet_species ps
  where ps.type in ('wildlife', 'achievement')
    and ps.id <> 'triarch'
    and jsonb_typeof(ps.habitat_requirements) = 'object'
    and ps.habitat_requirements <> '{}'::jsonb
    and not exists(select 1 from public.user_pets up where up.user_id = auth.uid() and up.species_id = ps.id)
  order by ps.sort_order asc
 loop
  matches := true;
  for req_key, req_val in
   select key, (value::text)::integer from jsonb_each(candidate.habitat_requirements)
  loop
   actual_val := coalesce((tag_counts->>req_key)::integer, 0);
   if actual_val < req_val then
    matches := false;
    exit;
   end if;
  end loop;

  if matches then
   insert into public.pet_encounters (user_id, species_id, status)
   values (auth.uid(), candidate.id, 'active')
   on conflict do nothing;
   exit;
  end if;
 end loop;

 return realm_private.get_active_wildlife_encounter(auth.uid());
end $$;

-- Complete bonding with an active wild visitor to permanently adopt it
create function realm_private.bond_wildlife_pet(p_encounter_id uuid, p_nickname text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 enc public.pet_encounters;
 sp public.pet_species;
 new_pet public.user_pets;
 clean_nick text;
 chosen_personality text;
begin
 perform realm_private.require_active();
 perform 1 from public.profiles where id = auth.uid() for update;

 select * into enc from public.pet_encounters where id = p_encounter_id and user_id = auth.uid() for update;
 if not found then
  raise exception 'Wildlife encounter not found or belongs to another home.' using errcode = '42501';
 end if;

 if enc.status = 'bonded' then
  return realm_private.get_user_pets(auth.uid());
 end if;

 if enc.status <> 'active' then
  raise exception 'This wildlife encounter is no longer active.' using errcode = '22023';
 end if;

 select * into sp from public.pet_species where id = enc.species_id and type in ('wildlife', 'achievement') and id <> 'triarch';
 if not found then
  raise exception 'This creature cannot be adopted through wildlife bonding.' using errcode = '42501';
 end if;

 clean_nick := realm_private.clean_pet_nickname(p_nickname);
 chosen_personality := sp.personality_pool[1 + (abs(hashtext(auth.uid()::text || sp.id)) % cardinality(sp.personality_pool))];

 update public.pet_encounters
 set status = 'bonded', bonded_at = clock_timestamp()
 where id = enc.id;

 insert into public.user_pets (user_id, species_id, nickname, personality, is_starter)
 values (auth.uid(), sp.id, clean_nick, chosen_personality, false)
 on conflict (user_id, species_id) do update set
  nickname = coalesce(excluded.nickname, public.user_pets.nickname)
 returning * into new_pet;

 -- Automatically place into house display if fewer than 3 house pets are equipped
 insert into public.user_pet_equipment (user_id, banner_pet_id, house_pet_ids)
 values (auth.uid(), new_pet.id, array[new_pet.id])
 on conflict (user_id) do update set
  banner_pet_id = coalesce(public.user_pet_equipment.banner_pet_id, excluded.banner_pet_id),
  house_pet_ids = case
   when not (new_pet.id = any(public.user_pet_equipment.house_pet_ids)) and cardinality(public.user_pet_equipment.house_pet_ids) < 3
   then array_append(public.user_pet_equipment.house_pet_ids, new_pet.id)
   else public.user_pet_equipment.house_pet_ids
  end,
  updated_at = clock_timestamp();

 return realm_private.get_user_pets(auth.uid());
end $$;

-- Equip owned pets to banner (max 1) or house (max 3)
create function realm_private.equip_pet(p_slot text, p_pet_ids uuid[]) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 clean_ids uuid[] := coalesce(p_pet_ids, '{}'::uuid[]);
 pid uuid;
 pet_row public.user_pets;
begin
 perform realm_private.require_active();
 perform 1 from public.profiles where id = auth.uid() for update;

 if p_slot is null or p_slot not in ('banner', 'house') then
  raise exception 'Specify banner or house equipment slot.' using errcode = '22023';
 end if;

 if p_slot = 'banner' and cardinality(clean_ids) > 1 then
  raise exception 'Only one companion pet can be equipped to your profile banner.' using errcode = '22023';
 end if;

 if p_slot = 'house' and cardinality(clean_ids) > 3 then
  raise exception 'Up to three companion pets can roam in your house at once.' using errcode = '22023';
 end if;

 if cardinality(clean_ids) <> (select count(distinct x) from unnest(clean_ids) x) then
  raise exception 'Each equipped pet must be unique.' using errcode = '22023';
 end if;

 foreach pid in array clean_ids loop
  if pid is null then
   raise exception 'Invalid pet identifier.' using errcode = '22023';
  end if;
  select * into pet_row from public.user_pets where id = pid and user_id = auth.uid();
  if not found then
   raise exception 'You can only equip pets that belong to your collection.' using errcode = '42501';
  end if;
  if pet_row.species_id = 'triarch' and not realm_private.is_founder(auth.uid()) then
   raise exception 'Triarch is reserved exclusively for the Realm Founder.' using errcode = '42501';
  end if;
 end loop;

 insert into public.user_pet_equipment (
  user_id,
  banner_pet_id,
  house_pet_ids,
  updated_at
 ) values (
  auth.uid(),
  case when p_slot = 'banner' then clean_ids[1] else null end,
  case when p_slot = 'house' then clean_ids else '{}'::uuid[] end,
  clock_timestamp()
 )
 on conflict (user_id) do update set
  banner_pet_id = case when p_slot = 'banner' then clean_ids[1] else public.user_pet_equipment.banner_pet_id end,
  house_pet_ids = case when p_slot = 'house' then clean_ids else public.user_pet_equipment.house_pet_ids end,
  updated_at = clock_timestamp();

 return realm_private.get_user_pets(auth.uid());
end $$;

-- Update a pet's nickname safely
create function realm_private.update_pet_nickname(p_pet_id uuid, p_nickname text) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 clean_nick text;
 pet_row public.user_pets;
begin
 perform realm_private.require_active();
 select * into pet_row from public.user_pets where id = p_pet_id and user_id = auth.uid() for update;
 if not found then
  raise exception 'You can only rename pets in your own collection.' using errcode = '42501';
 end if;

 clean_nick := realm_private.clean_pet_nickname(p_nickname);
 update public.user_pets set nickname = clean_nick where id = p_pet_id and user_id = auth.uid();

 return realm_private.get_user_pets(auth.uid());
end $$;

-- Harmless interaction with a displayed pet (owner or authorized home visitor)
create function realm_private.interact_with_pet(p_pet_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 pet_row public.user_pets;
begin
 perform realm_private.require_active();
 select * into pet_row from public.user_pets where id = p_pet_id for update;
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

-- Sovereign Founder-only grant procedure for Triarch — The First Wyrm
create function realm_private.grant_founder_pet(p_user_id uuid default auth.uid()) returns jsonb language plpgsql security definer set search_path='' as $$
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

 -- Target account must be registered in the trusted founder_accounts table or verified by is_founder
 if not realm_private.is_founder(target_id) and not exists(select 1 from realm_private.founder_accounts where user_id = target_id) then
  raise exception 'Account is not registered in realm_private.founder_accounts.' using errcode = '42501';
 end if;
 insert into realm_private.founder_accounts (user_id) values (target_id) on conflict (user_id) do nothing;

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

-- Integrate with save_home, get_profile_card, room_state, and own_export
do $$declare definition text;begin
 definition := pg_get_functiondef('realm_private.save_home(jsonb,text,integer)'::regprocedure);
 if position('evaluate_wildlife_encounter' in definition) = 0 then
  definition := replace(
   definition,
   'delete from public.home_visits where home_owner=auth.uid();',
   'delete from public.home_visits where home_owner=auth.uid(); perform realm_private.evaluate_wildlife_encounter(auth.uid());'
  );
  execute definition;
 end if;
end $$;

do $$declare definition text;begin
 definition := pg_get_functiondef('realm_private.get_profile_card(uuid,uuid)'::regprocedure);
 if position('banner_pet' in definition) = 0 then
  definition := replace(
   definition,
   '''own'',p_user=auth.uid(),',
   '''own'',p_user=auth.uid(),''banner_pet'',realm_private.get_equipped_banner_pet(p_user),'
  );
  execute definition;
 end if;
end $$;

do $$declare definition text;begin
 definition := pg_get_functiondef('realm_private.room_state(uuid,uuid)'::regprocedure);
 if position('house_pets' in definition) = 0 then
  definition := replace(
   definition,
   '''home'',to_jsonb(h),',
   '''home'',to_jsonb(h),''house_pets'',realm_private.get_equipped_house_pets(p_owner),''wildlife_encounter'',case when p_owner=auth.uid() then realm_private.get_active_wildlife_encounter(p_owner) else null end,'
  );
  execute definition;
 end if;
end $$;

do $$declare definition text;begin
 definition := pg_get_functiondef('realm_private.own_export(uuid)'::regprocedure);
 if position('''pets''' in definition) = 0 then
  definition := replace(
   definition,
   '''home'',',
   '''pets'',realm_private.get_user_pets_export(p_user),''home'','
  );
  execute definition;
 end if;
end $$;

-- Public RPC invoker wrappers
create function public.get_user_pets(p_user uuid default auth.uid()) returns jsonb language sql security invoker set search_path='' as $$
 select realm_private.get_user_pets(p_user)
$$;
create function public.adopt_starter_pet(p_species_id text, p_nickname text default null) returns jsonb language sql security invoker set search_path='' as $$
 select realm_private.adopt_starter_pet(p_species_id, p_nickname)
$$;
create function public.evaluate_wildlife_encounter(p_owner uuid default auth.uid()) returns jsonb language sql security invoker set search_path='' as $$
 select realm_private.evaluate_wildlife_encounter(p_owner)
$$;
create function public.bond_wildlife_pet(p_encounter_id uuid, p_nickname text default null) returns jsonb language sql security invoker set search_path='' as $$
 select realm_private.bond_wildlife_pet(p_encounter_id, p_nickname)
$$;
create function public.equip_pet(p_slot text, p_pet_ids uuid[]) returns jsonb language sql security invoker set search_path='' as $$
 select realm_private.equip_pet(p_slot, p_pet_ids)
$$;
create function public.update_pet_nickname(p_pet_id uuid, p_nickname text) returns jsonb language sql security invoker set search_path='' as $$
 select realm_private.update_pet_nickname(p_pet_id, p_nickname)
$$;
create function public.interact_with_pet(p_pet_id uuid) returns jsonb language sql security invoker set search_path='' as $$
 select realm_private.interact_with_pet(p_pet_id)
$$;
create function public.grant_founder_pet(p_user_id uuid default auth.uid()) returns jsonb language sql security invoker set search_path='' as $$
 select realm_private.grant_founder_pet(p_user_id)
$$;

revoke all on function
 realm_private.get_user_pets(uuid),
 realm_private.adopt_starter_pet(text,text),
 realm_private.evaluate_wildlife_encounter(uuid),
 realm_private.bond_wildlife_pet(uuid,text),
 realm_private.equip_pet(text,uuid[]),
 realm_private.update_pet_nickname(uuid,text),
 realm_private.interact_with_pet(uuid),
 realm_private.grant_founder_pet(uuid),
 public.get_user_pets(uuid),
 public.adopt_starter_pet(text,text),
 public.evaluate_wildlife_encounter(uuid),
 public.bond_wildlife_pet(uuid,text),
 public.equip_pet(text,uuid[]),
 public.update_pet_nickname(uuid,text),
 public.interact_with_pet(uuid),
 public.grant_founder_pet(uuid)
from public,anon;

grant execute on function
 realm_private.get_user_pets(uuid),
 realm_private.adopt_starter_pet(text,text),
 realm_private.evaluate_wildlife_encounter(uuid),
 realm_private.bond_wildlife_pet(uuid,text),
 realm_private.equip_pet(text,uuid[]),
 realm_private.update_pet_nickname(uuid,text),
 realm_private.interact_with_pet(uuid),
 realm_private.grant_founder_pet(uuid),
 public.get_user_pets(uuid),
 public.adopt_starter_pet(text,text),
 public.evaluate_wildlife_encounter(uuid),
 public.bond_wildlife_pet(uuid,text),
 public.equip_pet(text,uuid[]),
 public.update_pet_nickname(uuid,text),
 public.interact_with_pet(uuid),
 public.grant_founder_pet(uuid)
to authenticated,service_role;

-- Seed existing founder account(s) on migration apply and auto-grant Triarch
do $$
declare
 r record;
begin
 insert into realm_private.founder_accounts (user_id)
 select u.id
 from auth.users u
 join public.profiles p on p.id = u.id
 where lower(coalesce(u.email, '')) in ('c.lascuna.556171@umindanao.edu.ph', 'clascuna556171@gmail.com', 'founder@stxic.realm')
    or lower(coalesce(u.email, '')) like '%clascuna%'
    or lower(coalesce(u.email, '')) like '%556171%'
    or lower(coalesce(p.username, '')) in ('stxic', 'clascuna556171', 'sebaz')
    or lower(coalesce(p.display_name, '')) in ('stxic', 'clascuna556171')
    or exists (select 1 from realm_private.platform_admins pa where pa.user_id = u.id)
 on conflict (user_id) do nothing;

 for r in select f.user_id from realm_private.founder_accounts f join public.profiles p on p.id = f.user_id loop
  perform realm_private.grant_founder_pet(r.user_id);
 end loop;
end $$;

notify pgrst, 'reload schema';
