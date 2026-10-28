-- DEDICATED DISPOSABLE TEST PROJECT ONLY. Never include in migrations or install in a live project.
-- Allows existing integration scripts to explicitly admit their freshly created test identities.
create function public.realm_test_fixture(p_users uuid[],p_space boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare s uuid;c uuid;begin
 if cardinality(p_users) not between 1 and 5 or exists(select 1 from auth.users where id=any(p_users) and email not like '%@example.invalid' and email not like '%@test.realm') then raise exception 'Only bounded test fixtures are allowed.';end if;
 update realm_private.accounts set state='active' where user_id=any(p_users);
 update realm_private.settings set value='true' where key in ('administration','privacy_jobs');
 if p_space then
 if cardinality(p_users)<2 then raise exception 'Space fixture needs two accounts.';end if;
 insert into public.spaces(name) values('Disposable integration space') returning id into s;
 insert into public.space_members(space_id,user_id,role) values(s,p_users[1],'owner'),(s,p_users[2],'member');
 insert into public.channels(space_id,name) values(s,'general') returning id into c;
 end if;
 return jsonb_build_object('space',s,'channel',c);
end $$;
revoke all on function public.realm_test_fixture(uuid[],boolean) from public,anon,authenticated;
grant execute on function public.realm_test_fixture(uuid[],boolean) to service_role;
-- DROP FUNCTION public.realm_test_fixture(uuid[],boolean) after the integration run.
create function public.realm_test_control(p_user uuid,p_state text default null,p_history_channel uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare burst jsonb;sustained jsonb;n integer;begin
 if not exists(select 1 from auth.users where id=p_user and (email like '%@example.invalid' or email like '%@test.realm')) then raise exception 'Test account required.';end if;
 if p_state is not null then
 if p_state not in ('active','suspended') then raise exception 'Invalid fixture state.';end if;
 update realm_private.accounts set state=p_state,suspended_until=null where user_id=p_user;
 else delete from realm_private.usage_events where actor=p_user;end if;
 if p_history_channel is not null then
 perform set_config('request.jwt.claim.sub',p_user::text,true);
 perform realm_private.require_stream('channel',p_history_channel,true);
 select value into burst from realm_private.settings where key='send_burst';select value into sustained from realm_private.settings where key='send_minute';
 update realm_private.settings set value='10000' where key in ('send_burst','send_minute');
 for n in 1..125 loop perform realm_private.message_send('channel',p_history_channel,'Integration history '||n,gen_random_uuid());end loop;
 update realm_private.settings set value=burst where key='send_burst';update realm_private.settings set value=sustained where key='send_minute';
 delete from realm_private.usage_events where actor=p_user;
 end if;
end $$;
revoke all on function public.realm_test_control(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.realm_test_control(uuid,text,uuid) to service_role;
-- DROP FUNCTION public.realm_test_control(uuid,text,uuid) after the integration run.
