import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

export async function verifyPetAuthorityUpgrade(root, setup, migrations) {
  const db = new PGlite({ extensions: { pgcrypto } })
  const original = migrations.indexOf('20261102010000_pets_and_wildlife.sql')
  try {
    await db.exec(setup)
    for (const file of migrations.slice(0, original)) await db.exec(await readFile(resolve(root, 'supabase/migrations', file), 'utf8'))
    await db.exec(`insert into auth.users(id,email,email_confirmed_at) values
      ('61000000-0000-4000-8000-000000000001','legacy-pet-admin@example.invalid',now()),
      ('62000000-0000-4000-8000-000000000002','legacy-pet-spoof@example.invalid',now());
      update realm_private.accounts set state='active';
      insert into realm_private.platform_admins(user_id) values('61000000-0000-4000-8000-000000000001');
      update public.profiles set display_name='stxic' where id='62000000-0000-4000-8000-000000000002';`)
    await db.exec(await readFile(resolve(root, 'supabase/migrations', migrations[original]), 'utf8'))
    assert.equal((await db.query("select count(*)::int n from public.user_pets where species_id='triarch'")).rows[0].n, 2, 'fixture must reproduce old automatic grants')
    for (const file of migrations.slice(original + 1)) await db.exec(await readFile(resolve(root, 'supabase/migrations', file), 'utf8'))
    assert.equal((await db.query("select count(*)::int n from realm_private.founder_accounts where verified_at is not null")).rows[0].n, 0)
    assert.equal((await db.query("select count(*)::int n from public.user_pets where species_id='triarch'")).rows[0].n, 2, 'quarantine preserves audit records')
    assert.equal((await db.query('select count(*)::int n from public.user_pet_equipment where banner_pet_id is not null or cardinality(house_pet_ids)>0')).rows[0].n, 0)
    await db.exec("set role authenticated;select set_config('request.jwt.claim.sub','62000000-0000-4000-8000-000000000002',false)")
    const snapshot = (await db.query('select public.get_user_pets() data')).rows[0].data
    assert.equal(snapshot.is_founder, false)
    assert.deepEqual(snapshot.owned, [])
    await assert.rejects(db.query('select public.grant_founder_pet()'), /reserved exclusively/)
    // A trusted operator can explicitly re-verify the actual creator and restore their equipment.
    await db.exec("reset role;update realm_private.founder_accounts set verified_at=now() where user_id='61000000-0000-4000-8000-000000000001';set role authenticated;select set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000001',false);select public.grant_founder_pet()")
    const restored = (await db.query('select public.get_user_pets() data')).rows[0].data
    assert.equal(restored.is_founder, true)
    assert.equal(restored.equipment.banner_pet.species_id, 'triarch')
    assert.equal(restored.equipment.house_pets[0].species_id, 'triarch')
    console.log('PASS pet authority upgrade, legacy quarantine and explicit creator restoration')
  } finally { await db.close() }
}
