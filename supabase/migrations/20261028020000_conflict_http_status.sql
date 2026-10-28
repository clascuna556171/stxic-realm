-- Logical revision conflicts are HTTP 409, not retryable transaction/server errors.
create or replace function realm_private.save_identity(p_username text,p_name text,p_bio text,p_character jsonb,p_theme jsonb,p_mood text,p_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare current_revision integer;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 select revision into current_revision from public.profiles where id=auth.uid() for update;
 if current_revision is distinct from p_revision then raise exception 'Profile changed elsewhere. Reload before saving.' using errcode='PT409';end if;
 if not realm_private.valid_character(p_character) or not realm_private.valid_theme(p_theme) or p_mood is null or p_mood not in ('cozy','medieval','tech') then raise exception 'Invalid appearance choices' using errcode='22023';end if;
 update public.profiles set username=lower(trim(p_username)),display_name=trim(p_name),bio=trim(p_bio),revision=revision+1,updated_at=now() where id=auth.uid();
 update public.profile_appearances set character=p_character where user_id=auth.uid();
 update public.user_themes set theme=p_theme where user_id=auth.uid();
 update public.homes set mood=p_mood,revision=revision+1,updated_at=now() where owner_id=auth.uid() and mood<>p_mood;
 return realm_private.get_identity();
end $$;

create or replace function realm_private.save_home(p_layout jsonb,p_privacy text,p_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare h public.homes;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 select * into h from public.homes where owner_id=auth.uid() for update;
 if h.revision is distinct from p_revision then raise exception 'Home changed elsewhere. Reload before saving.' using errcode='PT409';end if;
 if not realm_private.valid_layout(p_layout) or p_privacy is null or p_privacy not in ('private','friends') then raise exception 'Invalid home layout or privacy.' using errcode='22023';end if;
 update public.homes set layout=p_layout,privacy=p_privacy,revision=revision+1,updated_at=now() where owner_id=auth.uid() returning * into h;
 -- Force an authoritative rejoin after an edit; no visitor remains standing inside newly placed furniture.
 delete from public.home_visits where home_owner=auth.uid();
 return to_jsonb(h);
end $$;
