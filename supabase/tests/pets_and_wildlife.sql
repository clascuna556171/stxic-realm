begin;
create function pg_temp.pet_assert(ok boolean, label text) returns void language plpgsql as $$
begin
 if ok is distinct from true then
  raise exception 'PET TEST FAILED: %', label;
 end if;
end $$;

create function pg_temp.pet_denied(statement text, expected text default '42501') returns void language plpgsql as $$
begin
 begin
  execute statement;
 exception when others then
  if sqlstate = expected then return; end if;
  raise exception 'Expected %, got % (%)', expected, sqlstate, sqlerrm;
 end;
 raise exception 'PET TEST FAILED: permitted %', statement;
end $$;

insert into auth.users(id, email, email_confirmed_at) values
 ('10000000-0000-4000-8000-000000000001', 'pet-founder@example.invalid', now()),
 ('20000000-0000-4000-8000-000000000002', 'pet-alice@example.invalid', now()),
 ('30000000-0000-4000-8000-000000000003', 'pet-bob@example.invalid', now());

update realm_private.accounts set state = 'active';
insert into realm_private.founder_accounts(user_id) values ('10000000-0000-4000-8000-000000000001');
insert into realm_private.platform_admins(user_id) values ('20000000-0000-4000-8000-000000000002');
insert into public.friendships(requester, addressee, status) values
 ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'accepted'),
 ('20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003', 'accepted');

-- 1. Anonymous users cannot call pet RPCs
select pg_temp.pet_assert(not has_function_privilege('anon', 'public.adopt_starter_pet(text,text)', 'EXECUTE'), 'anon cannot adopt starter');
select pg_temp.pet_assert(not has_function_privilege('anon', 'public.grant_founder_pet(uuid)', 'EXECUTE'), 'anon cannot grant founder pet');

-- 2. Switch to Alice (ordinary user + platform_admin, NOT founder)
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);

-- Direct client inserts into user_pets, pet_encounters, user_pet_equipment are denied
select pg_temp.pet_denied($q$insert into public.user_pets(user_id, species_id, personality) values (auth.uid(), 'cat', 'Sleepy')$q$, '42501');
select pg_temp.pet_denied($q$insert into public.pet_encounters(user_id, species_id) values (auth.uid(), 'fox')$q$, '42501');
select pg_temp.pet_denied($q$insert into public.user_pet_equipment(user_id) values (auth.uid())$q$, '42501');

-- Invalid starter choices rejected (wildlife or founder species)
select pg_temp.pet_denied($q$select public.adopt_starter_pet('fox', 'Mossy')$q$, '22023');
select pg_temp.pet_denied($q$select public.adopt_starter_pet('triarch', 'Wyrm')$q$, '22023');
select pg_temp.pet_denied($q$select public.adopt_starter_pet('cat', '<script>evil</script>')$q$, '22023');

-- Valid starter adoption
select public.adopt_starter_pet('cat', 'Miso');
select pg_temp.pet_assert(jsonb_array_length(public.get_user_pets()->'owned') = 1, 'Alice owns 1 starter pet');
select pg_temp.pet_assert(public.get_user_pets()->'owned'->0->>'species_id' = 'cat', 'Alice starter is Village Cat');
select pg_temp.pet_assert(public.get_user_pets()->'owned'->0->>'nickname' = 'Miso', 'Alice starter nickname saved');
select pg_temp.pet_assert(public.get_user_pets()->'equipment'->'banner_pet'->>'nickname' = 'Miso', 'starter auto-equipped to banner');
select pg_temp.pet_assert(jsonb_array_length(public.get_user_pets()->'equipment'->'house_pets') = 1, 'starter auto-equipped to house');
select pg_temp.pet_assert(public.get_profile_card()->'banner_pet'->>'nickname' = 'Miso', 'profile card includes banner pet');

-- Idempotent retry with same starter species succeeds, different starter rejected
select public.adopt_starter_pet('cat', 'Miso');
select pg_temp.pet_assert(jsonb_array_length(public.get_user_pets()->'owned') = 1, 'idempotent starter retry keeps 1 pet');
select pg_temp.pet_denied($q$select public.adopt_starter_pet('pup', 'Buddy')$q$, 'PT409');

-- Platform admin who is not in founder_accounts CANNOT grant Triarch
select pg_temp.pet_denied($q$select public.grant_founder_pet(auth.uid())$q$, '42501');
select pg_temp.pet_denied($q$select public.grant_founder_pet('10000000-0000-4000-8000-000000000001')$q$, '42501');

-- 3. Wildlife habitat discovery and persistent encounter
-- Starter home has plant + floor-lamp (2 Forest) + sofa/bed (Cozy), which qualifies for Moss Fox!
select public.evaluate_wildlife_encounter();
select pg_temp.pet_assert(public.get_user_pets()->'active_encounter'->>'species_id' = 'fox', 'Moss Fox visits qualifying starter habitat');
select set_config('pet.test.encounter1', public.get_user_pets()->'active_encounter'->>'id', true);

-- Encounter persists across calls
select pg_temp.pet_assert(public.evaluate_wildlife_encounter()->>'id' = current_setting('pet.test.encounter1'), 'encounter persists across sessions');

-- Bob cannot see or bond Alice's encounter
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', true);
select pg_temp.pet_assert((select count(*) = 0 from public.pet_encounters where user_id = '20000000-0000-4000-8000-000000000002'), 'encounters RLS owner only');
select pg_temp.pet_denied(format('select public.bond_wildlife_pet(%L, ''Stolen'')', current_setting('pet.test.encounter1')), '42501');

-- Alice bonds with the visiting Moss Fox
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
select public.bond_wildlife_pet(current_setting('pet.test.encounter1')::uuid, 'Bramble');
select pg_temp.pet_assert(jsonb_array_length(public.get_user_pets()->'owned') = 2, 'Alice now owns 2 pets after bonding');
select pg_temp.pet_assert(public.get_user_pets()->'active_encounter' is null or public.get_user_pets()->'active_encounter' = 'null'::jsonb, 'active encounter cleared after bonding');
select pg_temp.pet_assert(jsonb_array_length(public.get_user_pets()->'equipment'->'house_pets') = 2, 'bonded pet auto-added to house display');

-- Subsequent habitat evaluations unlock Crystal Wisp, Cave Bat, and Moon Owl
select public.evaluate_wildlife_encounter();
select pg_temp.pet_assert(public.get_user_pets()->'active_encounter'->>'species_id' = 'wisp', 'Crystal Wisp visits next');
select public.bond_wildlife_pet((public.get_user_pets()->'active_encounter'->>'id')::uuid, 'Lumen');

select public.evaluate_wildlife_encounter();
select pg_temp.pet_assert(public.get_user_pets()->'active_encounter'->>'species_id' = 'bat', 'Cave Bat visits next');
select public.bond_wildlife_pet((public.get_user_pets()->'active_encounter'->>'id')::uuid, 'Vesper');

-- House equipment stays capped at 3 even when 4th pet is bonded
select pg_temp.pet_assert(jsonb_array_length(public.get_user_pets()->'owned') = 4, 'Alice owns 4 pets');
select pg_temp.pet_assert(jsonb_array_length(public.get_user_pets()->'equipment'->'house_pets') = 3, 'house pets capped at 3');

-- Attempting to equip 4 house pets or 2 banner pets fails
select pg_temp.pet_denied($q$
 select public.equip_pet('house', array(select id from public.user_pets where user_id = auth.uid() limit 4))
$q$, '22023');
select pg_temp.pet_denied($q$
 select public.equip_pet('banner', array(select id from public.user_pets where user_id = auth.uid() limit 2))
$q$, '22023');

-- Renaming pet works for owner and rejects non-owner
select set_config('pet.test.alice_cat', (select id::text from public.user_pets where user_id = auth.uid() and species_id = 'cat'), true);
select public.update_pet_nickname(current_setting('pet.test.alice_cat')::uuid, 'Sir Whiskers');
select pg_temp.pet_assert((select nickname = 'Sir Whiskers' from public.user_pets where id = current_setting('pet.test.alice_cat')::uuid), 'nickname updated');

-- 4. Founder account grants and equips Triarch — The First Wyrm
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select public.grant_founder_pet();
-- Idempotent second grant
select public.grant_founder_pet();
select pg_temp.pet_assert((select count(*) = 1 from public.user_pets where user_id = auth.uid() and species_id = 'triarch'), 'founder granted single Triarch instance');
select pg_temp.pet_assert(public.get_profile_card()->'banner_pet'->>'species_id' = 'triarch', 'founder banner displays Triarch');

-- Alice can see Founder's Triarch on profile and in house, but cannot equip or claim it
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
select pg_temp.pet_assert(public.get_profile_card('10000000-0000-4000-8000-000000000001')->'banner_pet'->>'species_id' = 'triarch', 'visitors see Triarch on founder banner');
select public.enter_home('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000099');
select pg_temp.pet_assert(public.room_state('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000099')->'house_pets'->0->>'species_id' = 'triarch', 'visitors see Triarch roaming in founder home');

-- Alice can harmlessly pet Founder's Triarch while visiting
select set_config('pet.test.triarch_id', (select id::text from public.user_pets where user_id = '10000000-0000-4000-8000-000000000001' and species_id = 'triarch'), true);
select pg_temp.pet_assert((public.interact_with_pet(current_setting('pet.test.triarch_id')::uuid)->>'affection_level')::int = 1, 'guest can harmlessly pet displayed Triarch');

-- Alice cannot equip Founder's Triarch or rename it
select pg_temp.pet_denied(format('select public.equip_pet(''banner'', array[%L::uuid])', current_setting('pet.test.triarch_id')), '42501');
select pg_temp.pet_denied(format('select public.update_pet_nickname(%L::uuid, ''Hacked'')', current_setting('pet.test.triarch_id')), '42501');

reset role;
rollback;
