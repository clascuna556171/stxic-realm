-- Sovereign Realm Creator Profile Frame
-- Expands allowed cosmetics to include the exclusive realm-creator frame.
-- Enforces that equipping realm-creator is reserved exclusively for the Sovereign Architect (platform_admin).

create or replace function realm_private.valid_profile_style(v jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(
  realm_private.valid_profile_style_base(v-'frame_id'-'frame_effects')
  and (not v?'frame_id' or (jsonb_typeof(v->'frame_id')='string' and v->>'frame_id' in ('none','dark-realm','royal-legend','nature-spirit','cyber-core','minimal-mono','cozy-friends','realm-creator')))
  and (not v?'frame_effects' or jsonb_typeof(v->'frame_effects')='boolean'),false)
$$;

-- Enforce sovereign check in save_profile_card
do $$declare definition text;begin
 definition:=pg_get_functiondef('realm_private.save_profile_card(jsonb,jsonb,integer,integer)'::regprocedure);
 if position('not realm_private.valid_profile_style(p_card->''style'')' in definition)=0 then
  raise exception 'Profile save validation anchor missing; review frame migration.';
 end if;
 definition:=replace(definition,
  'not realm_private.valid_profile_style(p_card->''style'')',
  'not realm_private.valid_profile_style(p_card->''style'') or (p_card->''style''->>''frame_id'' = ''realm-creator'' and not realm_private.platform_admin())'
 );
 execute definition;
end $$;

revoke all on function realm_private.valid_profile_style(jsonb) from public,anon,authenticated;
notify pgrst,'reload schema';
