-- Additive migration for profile banner atmospheric shrouds and vinyl anthems.
-- Extends profile_cards.style with banner_shroud and banner_anthem without breaking base style validation.

create or replace function realm_private.valid_profile_style(v jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(
  realm_private.valid_profile_style_base(v-'frame_id'-'frame_effects'-'banner_shroud'-'banner_anthem')
  and (not v?'frame_id' or (jsonb_typeof(v->'frame_id')='string' and v->>'frame_id' in ('none','dark-realm','royal-legend','nature-spirit','cyber-core','minimal-mono','cozy-friends','realm-creator')))
  and (not v?'frame_effects' or jsonb_typeof(v->'frame_effects')='boolean')
  and (not v?'banner_shroud' or (jsonb_typeof(v->'banner_shroud')='string' and v->>'banner_shroud' in ('none','crows','embers','mist','stardust')))
  and (not v?'banner_anthem' or (jsonb_typeof(v->'banner_anthem')='string' and v->>'banner_anthem' in ('none','midnight-vinyl','lofi-hearth','starlight-drift','obsidian-groove','rain-window','campfire','custom'))),false)
$$;

create or replace function realm_private.default_profile_style() returns jsonb language sql immutable set search_path='' as $$
 select '{"surface":"#202127","text":"#ececf1","accent":"#b3cdbd","font":"sans","avatar_shape":"circle","avatar_x":50,"avatar_y":50,"banner_x":50,"banner_y":50,"banner_height":180,"sections":["about","details","connections","photos","member"],"hidden":[],"frame_id":"none","frame_effects":true,"banner_shroud":"none","banner_anthem":"none"}'::jsonb
$$;

update public.profile_cards set style='{"banner_shroud":"none","banner_anthem":"none"}'::jsonb||style;

do $$declare definition text;begin
 definition:=pg_get_functiondef('realm_private.save_profile_card(jsonb,jsonb,integer,integer)'::regprocedure);
 if position('''frame_effects'',coalesce((c.style->>''frame_effects'')::boolean,true)' in definition)>0 then
  definition:=replace(definition,
   '''frame_effects'',coalesce((c.style->>''frame_effects'')::boolean,true)',
   '''frame_effects'',coalesce((c.style->>''frame_effects'')::boolean,true),''banner_shroud'',coalesce(c.style->>''banner_shroud'',''none''),''banner_anthem'',coalesce(c.style->>''banner_anthem'',''none'')');
  execute definition;
 end if;
end $$;

revoke all on function realm_private.valid_profile_style(jsonb),realm_private.default_profile_style() from public,anon,authenticated;
