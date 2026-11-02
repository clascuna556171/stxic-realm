-- Preserve creator rewards and curated team honors through trusted UUID authority.
-- Deliberately does not activate accounts, grant admin, or verify identities by email.
-- An operator must verify the actual creator UUID as documented in PETS_AND_WILDLIFE_SYSTEM.md.

-- Enforce explicit 42501 error when non-founder attempts to equip realm-creator frame
do $$declare definition text;begin
 definition:=pg_get_functiondef('realm_private.save_profile_card(jsonb,jsonb,integer,integer)'::regprocedure);
 if position('or (p_card->''style''->>''frame_id'' = ''realm-creator''' in definition) > 0 then
  definition:=replace(definition,
   'or (p_card->''style''->>''frame_id'' = ''realm-creator'' and not realm_private.is_founder(auth.uid()))',
   ''
  );
  definition:=replace(definition,
   'or (p_card->''style''->>''frame_id'' = ''realm-creator'' and not realm_private.platform_admin())',
   ''
  );
 end if;
 if position('if p_card->''style''->>''frame_id'' = ''realm-creator''' in definition) = 0 then
  definition:=replace(definition,
   'perform realm_private.require_active();',
   'perform realm_private.require_active(); if p_card->''style''->>''frame_id'' = ''realm-creator'' and not realm_private.is_founder(auth.uid()) then raise exception ''The Realm Creator frame is reserved exclusively for the verified founder.'' using errcode = ''42501''; end if;'
  );
 end if;
 execute definition;
end $$;


-- Restore the preserved companion only for already-verified, active founders.
-- get_user_badges projects all founder honors and the curated platform-admin set.
do $$declare creator record;begin
 for creator in select user_id from realm_private.founder_accounts where realm_private.is_founder(user_id) loop
  perform realm_private.grant_founder_pet(creator.user_id);
 end loop;
end $$;
notify pgrst,'reload schema';
