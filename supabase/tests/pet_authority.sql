begin;
create function pg_temp.pet_check(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'PET AUTHORITY FAILED: %', label; end if; end $$;
create function pg_temp.pet_forbidden(statement text) returns void language plpgsql as $$
begin
 begin execute statement;
 exception when insufficient_privilege then return;
 end;
 raise exception 'PET AUTHORITY FAILED: permitted %', statement;
end $$;

insert into auth.users(id,email,email_confirmed_at) values
 ('51000000-0000-4000-8000-000000000001','ordinary-pet-review@example.invalid',now()),
 ('52000000-0000-4000-8000-000000000002','attacker-clascuna-556171@example.invalid',now()),
 ('53000000-0000-4000-8000-000000000003','legacy-admin@example.invalid',now());
update realm_private.accounts set state='active';
insert into realm_private.platform_admins(user_id) values('53000000-0000-4000-8000-000000000003');
-- Simulate a previously auto-seeded admin and an illegitimate grant. Neither is verified.
insert into realm_private.founder_accounts(user_id) values('53000000-0000-4000-8000-000000000003');
insert into public.user_pets(id,user_id,species_id,personality) values
 ('54000000-0000-4000-8000-000000000004','53000000-0000-4000-8000-000000000003','triarch','Loyal');
insert into public.user_pet_equipment(user_id,banner_pet_id,house_pet_ids) values
 ('53000000-0000-4000-8000-000000000003','54000000-0000-4000-8000-000000000004',array['54000000-0000-4000-8000-000000000004']::uuid[]);

set local role authenticated;
select set_config('request.jwt.claim.sub','51000000-0000-4000-8000-000000000001',true);
select public.save_identity(p.username,'stxic',p.bio,a.character,t.theme,h.mood,p.revision)
from public.profiles p join public.profile_appearances a on a.user_id=p.id
join public.user_themes t on t.user_id=p.id join public.homes h on h.owner_id=p.id where p.id=auth.uid();
select pg_temp.pet_check((public.get_user_pets()->>'is_founder')::boolean=false,'editable display name is not founder evidence');
select pg_temp.pet_check(jsonb_array_length(public.get_user_pets()->'owned')=0,'no automatic Triarch for spoofed display name');
select pg_temp.pet_forbidden('select public.grant_founder_pet()');
select pg_temp.pet_forbidden('insert into realm_private.founder_accounts(user_id,verified_at) values(auth.uid(),now())');
select pg_temp.pet_forbidden('update realm_private.founder_accounts set verified_at=now()');

-- A real save, not just a direct evaluation call, must create a persistent visitor.
select public.save_home(layout,privacy,revision) from public.homes where owner_id=auth.uid();
select pg_temp.pet_check(public.get_user_pets()->'active_encounter'->>'species_id'='fox','save_home evaluates habitats');

select set_config('request.jwt.claim.sub','52000000-0000-4000-8000-000000000002',true);
select pg_temp.pet_check((public.get_user_pets()->>'is_founder')::boolean=false,'email substring is not founder evidence');
select pg_temp.pet_forbidden('select public.grant_founder_pet()');

select set_config('request.jwt.claim.sub','53000000-0000-4000-8000-000000000003',true);
select pg_temp.pet_check((public.get_user_pets()->>'is_founder')::boolean=false,'legacy admin entry requires verification');
select pg_temp.pet_check((select count(*)=0 from public.user_pets where species_id='triarch'),'direct reads hide quarantined Triarch');
select pg_temp.pet_check(jsonb_array_length(public.get_user_pets()->'owned')=0,'collection hides quarantined Triarch');
select pg_temp.pet_check(public.get_user_pets()->'equipment'->'banner_pet_id'='null'::jsonb,'banner ID hides quarantined Triarch');
select pg_temp.pet_check(public.get_user_pets()->'equipment'->'house_pet_ids'='[]'::jsonb,'house IDs hide quarantined Triarch');
select pg_temp.pet_forbidden('select public.grant_founder_pet()');
select pg_temp.pet_forbidden($q$select public.equip_pet('house',array['54000000-0000-4000-8000-000000000004']::uuid[])$q$);

reset role;
select pg_temp.pet_check((select count(*)=1 from public.user_pets where id='54000000-0000-4000-8000-000000000004'),'quarantined record retained for audit');
select pg_temp.pet_check(not exists(select 1 from realm_private.founder_accounts where user_id='51000000-0000-4000-8000-000000000001'),'spoof cannot self-enroll');
rollback;
