-- Account cosmetics extend the account card, never the world character record.
-- Keep the existing complete style validator as the base for its twelve fields.
do $$declare definition text;begin
 definition:=pg_get_functiondef('realm_private.valid_profile_style(jsonb)'::regprocedure);
 definition:=replace(definition,'realm_private.valid_profile_style(', 'realm_private.valid_profile_style_base(');
 execute definition;
end $$;
create or replace function realm_private.valid_profile_style(v jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(
  realm_private.valid_profile_style_base(v-'frame_id'-'frame_effects')
  and (not v?'frame_id' or (jsonb_typeof(v->'frame_id')='string' and v->>'frame_id' in ('none','dark-realm','royal-legend','nature-spirit','cyber-core','minimal-mono','cozy-friends')))
  and (not v?'frame_effects' or jsonb_typeof(v->'frame_effects')='boolean'),false)
$$;
create or replace function realm_private.default_profile_style() returns jsonb language sql immutable set search_path='' as $$
 select '{"surface":"#202127","text":"#ececf1","accent":"#b3cdbd","font":"sans","avatar_shape":"circle","avatar_x":50,"avatar_y":50,"banner_x":50,"banner_y":50,"banner_height":180,"sections":["about","details","connections","photos","member"],"hidden":[],"frame_id":"none","frame_effects":true}'::jsonb
$$;
-- Existing cards remain valid. Do not bump revisions merely for additive defaults.
update public.profile_cards set style='{"frame_id":"none","frame_effects":true}'::jsonb||style;

-- Older clients that send twelve fields must retain equipped cosmetics.
-- This changes only the style assignment; all current authorization, locks and
-- identity/card revision checks remain owned by the original save implementation.
do $$declare definition text;begin
 definition:=pg_get_functiondef('realm_private.save_profile_card(jsonb,jsonb,integer,integer)'::regprocedure);
 if position('style=p_card->''style''' in definition)=0 then raise exception 'Profile save implementation changed; review frame migration.';end if;
 definition:=replace(definition,'style=p_card->''style''','style=jsonb_build_object(''frame_id'',coalesce(c.style->>''frame_id'',''none''),''frame_effects'',coalesce((c.style->>''frame_effects'')::boolean,true))||(p_card->''style'')');
 execute definition;
end $$;

-- Narrow authorized projection, including framed initials without an upload.
create or replace view public.account_portraits as
 select c.user_id,m.object_path,c.style->>'avatar_shape' as shape,c.style->>'avatar_x' as x,c.style->>'avatar_y' as y,
 coalesce(c.style->>'frame_id','none') as frame_id,coalesce((c.style->>'frame_effects')::boolean,true) as frame_effects
 from public.profile_cards c left join public.profile_media m on m.id=c.avatar_id and m.state='ready'
 where (m.id is not null or coalesce(c.style->>'frame_id','none')<>'none') and realm_private.profile_visible(c.user_id);
revoke all on public.account_portraits from public,anon;
grant select on public.account_portraits to authenticated;
do $$declare definition text;begin
 definition:=pg_get_functiondef('realm_private.get_identity()'::regprocedure);
 if position('''avatar_y'', a.y' in definition)>0 then
  definition:=replace(definition,'''avatar_y'', a.y','''avatar_y'', a.y, ''frame_id'', a.frame_id, ''frame_effects'', a.frame_effects');
 elsif position('''avatar_y'',a.y' in definition)>0 then
  definition:=replace(definition,'''avatar_y'',a.y','''avatar_y'',a.y,''frame_id'',a.frame_id,''frame_effects'',a.frame_effects');
 else raise exception 'Identity portrait projection changed; review frame migration.';
 end if;
 execute definition;
end $$;
revoke all on function realm_private.valid_profile_style_base(jsonb),realm_private.valid_profile_style(jsonb),realm_private.default_profile_style() from public,anon,authenticated;
