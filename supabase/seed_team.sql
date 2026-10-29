-- Seed script for STXIC Realm team test accounts
-- Users:
--   1. lee@stxic.test     / Password1234!
--   2. melchor@stxic.test / Password1234!
--   3. jk@stxic.test      / Password1234!
--   4. albert@stxic.test  / Password1234!

do $$
declare
  dev_users record;
  dev_list jsonb := '[
    {"id": "10000000-0000-4000-8000-000000000001", "email": "lee@stxic.test", "name": "Lee", "user": "lee"},
    {"id": "10000000-0000-4000-8000-000000000002", "email": "melchor@stxic.test", "name": "Melchor", "user": "melchor"},
    {"id": "10000000-0000-4000-8000-000000000003", "email": "jk@stxic.test", "name": "JK", "user": "jk"},
    {"id": "10000000-0000-4000-8000-000000000004", "email": "albert@stxic.test", "name": "Albert", "user": "albert"}
  ]'::jsonb;
  pw_hash text;
  u_id uuid;
  u_email text;
  u_name text;
  u_user text;
begin
  pw_hash := extensions.crypt('Password1234!', extensions.gen_salt('bf', 10));

  for dev_users in select * from jsonb_to_recordset(dev_list) as x(id uuid, email text, name text, "user" text) loop
    u_id := dev_users.id;
    u_email := dev_users.email;
    u_name := dev_users.name;
    u_user := dev_users."user";

    -- 1. Create or update auth.users (confirmed_at is generated automatically)
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      u_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      u_email,
      pw_hash,
      now(),
      '',
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', u_name, 'email_verified', true),
      now(),
      now()
    ) on conflict (id) do update set
      encrypted_password = pw_hash,
      email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
      confirmation_token = '',
      recovery_token = '',
      email_change_token_new = '',
      email_change = '';

    -- 2. Create auth.identities
    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      u_id,
      jsonb_build_object('sub', u_id, 'email', u_email, 'email_verified', false, 'phone_verified', false),
      'email',
      u_id::text,
      now(),
      now(),
      now()
    ) on conflict (provider, provider_id) do nothing;

    -- 3. Activate account in realm_private.accounts
    insert into realm_private.accounts (user_id, state, updated_at)
      values (u_id, 'active', now())
      on conflict (user_id) do update set state = 'active', suspended_until = null;

    -- 4. Update profile details
    update public.profiles
      set display_name = u_name,
          username = 'realm_' || u_user
      where id = u_id;

    -- 5. Add to Alpha Testing Grounds space as member
    insert into public.space_members (space_id, user_id, role)
      select '31c38528-4fb7-44d7-8326-ff8ba1b43e67', u_id, 'member'
      where exists(select 1 from public.spaces where id = '31c38528-4fb7-44d7-8326-ff8ba1b43e67')
      on conflict (space_id, user_id) do nothing;

    -- 6. Add default starter home
    insert into public.homes (owner_id, privacy, mood, layout, revision, updated_at)
      select u_id, 'friends', 'cozy', layout, 1, now()
      from public.homes where owner_id = '4cf96076-72de-43d4-ae55-edbfa55dd7cb'
      on conflict (owner_id) do nothing;

  end loop;
end $$;
