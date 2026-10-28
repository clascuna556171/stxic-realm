-- Only the server can attest that an invitation's initial password update succeeded.
create function realm_private.complete_account_invite(p_user uuid,p_token text,p_finish boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare i realm_private.account_invites;u auth.users;begin
 perform set_config('request.jwt.claim.sub',p_user::text,true);
 perform realm_private.feature('account_invitations');
 select * into u from auth.users where id=p_user;
 select * into i from realm_private.account_invites where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
 if i.id is null or i.revoked_at is not null or i.accepted_at is not null or i.expires_at<=now() or u.id is null or u.email_confirmed_at is null or lower(u.email)<>lower(i.email) or i.user_id is distinct from u.id
 or not realm_private.active_account(i.issuer) or not exists(select 1 from realm_private.platform_admins where user_id=i.issuer)
 or not exists(select 1 from realm_private.accounts where user_id=u.id and state='invited') then raise exception 'Invitation unavailable. Contact your administrator.' using errcode='42501';end if;
 if p_finish then perform realm_private.accept_account(p_token);end if;
end $$;
create function public.complete_account_invite(p_user uuid,p_token text,p_finish boolean default false) returns void language sql security invoker set search_path='' as $$ select realm_private.complete_account_invite(p_user,p_token,p_finish) $$;

create function realm_private.server_invitation(p_actor uuid,p_action text,p_email text default null,p_invite uuid default null,p_user uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare token text;i realm_private.account_invites;begin
 -- Only service_role can call this. The Edge handler verifies the human with Auth.getUser.
 perform set_config('request.jwt.claim.sub',p_actor::text,true);
 if not realm_private.platform_admin() then raise exception 'Platform administrator required.' using errcode='42501';end if;
 perform realm_private.feature('account_invitations');
 perform pg_advisory_xact_lock(712804);
 if p_action='list' then return (select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]') from (select id,email,expires_at,accepted_at,revoked_at,delivery,created_at from realm_private.account_invites order by created_at desc limit 100) q);end if;
 if p_action='create' then
 if p_email is null or length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email.' using errcode='22023';end if;
 if exists(select 1 from auth.users u join realm_private.accounts a on a.user_id=u.id where lower(u.email)=lower(trim(p_email)) and a.state<>'invited') then raise exception 'This address cannot receive a new invitation.' using errcode='42501';end if;
 if exists(select 1 from realm_private.account_invites where lower(email)=lower(trim(p_email)) and created_at>clock_timestamp()-interval '60 seconds') then raise sqlstate 'PT429' using message='Wait a minute before replacing this account invitation.';end if;
 perform realm_private.charge('account_invite',realm_private.setting('account_invite_day'),86400);
 update realm_private.account_invites set revoked_at=clock_timestamp() where lower(email)=lower(trim(p_email)) and accepted_at is null and revoked_at is null;
 if (select count(*) from realm_private.accounts where state in ('active','suspended','deleting'))+(select count(*) from realm_private.account_invites where accepted_at is null and revoked_at is null and expires_at>now())>=realm_private.setting('pilot_accounts') then raise sqlstate 'PT429' using message='Pilot admission budget reached.';end if;
 token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into realm_private.account_invites(email,issuer,token_hash) values(lower(trim(p_email)),p_actor,encode(extensions.digest(token,'sha256'),'hex')) returning * into i;
 perform realm_private.log('account.invite',i.id);return jsonb_build_object('id',i.id,'token',token);
 end if;
 select * into i from realm_private.account_invites where id=p_invite for update;
 if not found then raise exception 'Invitation unavailable.' using errcode='42501';end if;
 if p_action='revoke' then update realm_private.account_invites set revoked_at=clock_timestamp() where id=i.id and accepted_at is null;
 elsif p_action in ('sent','failed') then
 if i.revoked_at is not null then raise exception 'Invitation was revoked.' using errcode='PT409';end if;
 update realm_private.account_invites set delivery=p_action,user_id=coalesce(p_user,user_id) where id=i.id;
 else raise exception 'Unknown invitation operation.' using errcode='22023';end if;
 perform realm_private.log('account.invite.'||p_action,i.id);return '{}';
end $$;
create function realm_private.own_export(p_user uuid) returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('version',1,'created_at',clock_timestamp(),
 'profile',(select to_jsonb(p) from public.profiles p where id=p_user),
 'character',(select character from public.profile_appearances where user_id=p_user),
 'theme',(select theme from public.user_themes where user_id=p_user),
 'home',(select to_jsonb(h) from public.homes h where owner_id=p_user),
 'friendships',(select coalesce(jsonb_agg(to_jsonb(f)),'[]') from public.friendships f where p_user in (requester,addressee)),
 'blocks',(select coalesce(jsonb_agg(blocked),'[]') from public.user_blocks where blocker=p_user),
 'channel_messages',(select coalesce(jsonb_agg(to_jsonb(m) order by created_at,id),'[]') from public.messages m where author_id=p_user),
 'authored_direct_messages',(select coalesce(jsonb_agg(to_jsonb(m) order by created_at,id),'[]') from public.direct_messages m where author_id=p_user),
 'deleted_peer_conversations',(select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at,m.id),'[]') from public.direct_messages m join public.direct_conversations c on c.id=m.conversation_id where (c.user_a=p_user and c.user_b is null) or (c.user_b=p_user and c.user_a is null)))
$$;
create function realm_private.maintenance() returns void language plpgsql security definer set search_path='' as $$
begin
 -- Absolute original-capture cap is enforced even if no deletion job succeeds.
 delete from realm_private.reports where expires_at<=clock_timestamp() or created_at<=clock_timestamp()-interval '90 days' or closed_at<=clock_timestamp()-interval '30 days';
 delete from realm_private.audit where expires_at<=clock_timestamp() or created_at<=clock_timestamp()-interval '90 days';
 delete from realm_private.export_artifacts where expires_at<=clock_timestamp();
 update realm_private.privacy_jobs j set status='expired' where kind='export' and status='ready' and not exists(select 1 from realm_private.export_artifacts a where a.job_id=j.id);
 delete from realm_private.privacy_jobs where expires_at<=clock_timestamp() and status in ('completed','cancelled','failed','expired');
 delete from realm_private.usage_events where created_at<clock_timestamp()-interval '1 day';
 delete from realm_private.membership_invites where expires_at<clock_timestamp()-interval '7 days';
 delete from realm_private.account_invites where expires_at<clock_timestamp()-interval '7 days';
 delete from realm_private.restrictions where retained_until<=clock_timestamp() or created_at<clock_timestamp()-interval '90 days';
 delete from public.direct_conversations where user_a is null and user_b is null;
 delete from realm_private.streams s where (kind='channel' and not exists(select 1 from public.channels c where c.id=s.id)) or (kind='direct' and not exists(select 1 from public.direct_conversations c where c.id=s.id));
 -- Pruning and the floor advance share a stream lock with writers/recovery.
 perform 1 from realm_private.streams where exists(select 1 from realm_private.message_events e where e.kind=streams.kind and e.stream_id=streams.id and e.created_at<clock_timestamp()-interval '7 days') order by kind,id for update;
 update realm_private.streams s set floor=greatest(floor,coalesce((select max(revision) from realm_private.message_events e where e.kind=s.kind and e.stream_id=s.id and e.created_at<clock_timestamp()-interval '7 days'),floor)) where s.id is not null;
 delete from realm_private.message_events e using realm_private.streams s where e.kind=s.kind and e.stream_id=s.id and e.revision<=s.floor;
end $$;
create function realm_private.process_privacy_jobs() returns jsonb language plpgsql security definer set search_path='' as $$
declare j realm_private.privacy_jobs;content jsonb;deletions jsonb:='[]';begin
 perform realm_private.maintenance();
 perform realm_private.feature('privacy_jobs');
 for j in select * from realm_private.privacy_jobs where (status='pending' or (kind='delete' and status='processing')) and not_before<=clock_timestamp() order by created_at limit 5 for update skip locked loop
 begin
 if j.kind='export' then
 if (select count(*) from public.messages where author_id=j.user_id)+(select count(*) from public.direct_messages where author_id=j.user_id or conversation_id in(select id from public.direct_conversations where (user_a=j.user_id and user_b is null) or (user_b=j.user_id and user_a is null)))>realm_private.setting('export_rows') then raise exception 'Export row budget exceeded. Operator review is required.';end if;
 content:=realm_private.own_export(j.user_id);
 if octet_length(content::text)>realm_private.setting('export_bytes') then raise exception 'Export exceeds the configured pilot size. Contact the operator.';end if;
 insert into realm_private.export_artifacts(job_id,user_id,content) values(j.id,j.user_id,content) on conflict(job_id) do nothing;
 update realm_private.privacy_jobs set status='ready',attempts=attempts+1,error=null where id=j.id;
 else
 if exists(select 1 from public.space_members m join public.spaces s on s.id=m.space_id where m.user_id=j.user_id and m.role='owner' and s.closed_at is null) then
 if not j.close_spaces then raise exception 'Transfer spaces before processing deletion.';end if;
 perform 1 from public.spaces s join public.space_members m on m.space_id=s.id where m.user_id=j.user_id and m.role='owner' order by s.id for update of s;
 update public.spaces s set archived_at=clock_timestamp(),closed_at=clock_timestamp(),revision=revision+1 from public.space_members m where m.space_id=s.id and m.user_id=j.user_id and m.role='owner';
 end if;
 update realm_private.accounts set state='deleting',updated_at=clock_timestamp() where user_id=j.user_id;
 delete from public.home_visits where user_id=j.user_id or home_owner=j.user_id;
 update realm_private.privacy_jobs set status='processing',not_before=clock_timestamp()+interval '5 minutes',attempts=attempts+1,error=null where id=j.id;
 deletions:=deletions||jsonb_build_object('id',j.id,'user_id',j.user_id);
 end if;
 insert into realm_private.audit(action,target) values('privacy.'||j.kind||'.process',j.id);
 exception when others then
 update realm_private.privacy_jobs set status=case when attempts>=4 then 'failed' else 'pending' end,attempts=attempts+1,not_before=clock_timestamp()+interval '5 minutes',error='Processing needs a retry or operator review.' where id=j.id;
 end;
 end loop;
 return deletions;
end $$;
create function realm_private.finish_deletion(p_job uuid,p_success boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 update realm_private.privacy_jobs set status=case when p_success then 'completed' else 'processing' end,
 not_before=clock_timestamp()+interval '5 minutes',error=case when p_success then null else 'Auth deletion needs a retry.' end where id=p_job and kind='delete' and status='processing';
 insert into realm_private.audit(action,target) values(case when p_success then 'privacy.delete.completed' else 'privacy.delete.retry' end,p_job);
end $$;
create function public.server_invitation(p_actor uuid,p_action text,p_email text default null,p_invite uuid default null,p_user uuid default null) returns jsonb language sql security invoker set search_path='' as $$ select realm_private.server_invitation(p_actor,p_action,p_email,p_invite,p_user) $$;
create function public.process_privacy_jobs() returns jsonb language sql security invoker set search_path='' as $$ select realm_private.process_privacy_jobs() $$;
create function public.finish_deletion(p_job uuid,p_success boolean) returns void language sql security invoker set search_path='' as $$ select realm_private.finish_deletion(p_job,p_success) $$;
create function public.run_maintenance() returns void language sql security invoker set search_path='' as $$ select realm_private.maintenance() $$;

-- Default PostgreSQL function EXECUTE is PUBLIC. Close every helper before granting endpoints.
revoke all on all tables in schema realm_private from public,anon,authenticated;
revoke all on all functions in schema realm_private from public,anon,authenticated;
grant usage on schema realm_private to service_role;
grant execute on function realm_private.server_invitation(uuid,text,text,uuid,uuid),realm_private.process_privacy_jobs(),realm_private.finish_deletion(uuid,boolean),realm_private.maintenance(),realm_private.complete_account_invite(uuid,text,boolean) to service_role;
revoke all on function public.complete_account_invite(uuid,text,boolean),public.accept_account(text) from public,anon,authenticated;
grant execute on function public.complete_account_invite(uuid,text,boolean) to service_role;
revoke all on function public.server_invitation(uuid,text,text,uuid,uuid),public.process_privacy_jobs(),public.finish_deletion(uuid,boolean),public.run_maintenance() from public,anon,authenticated;
grant execute on function public.server_invitation(uuid,text,text,uuid,uuid),public.process_privacy_jobs(),public.finish_deletion(uuid,boolean),public.run_maintenance() to service_role;
grant execute on function realm_private.active_account(uuid),realm_private.profile_visible(uuid),realm_private.can_visit(uuid),realm_private.can_dm(uuid),realm_private.space_role(uuid,uuid),realm_private.blocked_pair(uuid,uuid) to authenticated;
do $$declare f record;begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='realm_private' and p.proname in
 ('get_identity','save_identity','request_friend','respond_friend','set_block','open_direct','send_direct','save_home','room_state','enter_home','move_home','leave_home',
 'manage_space','manage_channel','space_admin_data','membership_invite','access_status','message_history','message_recover','message_send','message_change','message_read','message_unread',
 'submit_report','report_queue','review_report','lift_restriction','privacy_request') loop
 execute format('grant execute on function %s to authenticated',f.signature);end loop;
end $$;
-- New functions created later in this schema must also opt in explicitly.
alter default privileges in schema realm_private revoke execute on functions from public;
alter table realm_private.audit add column details jsonb not null default '{}';
create function realm_private.audit_operator_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='settings' then
 insert into realm_private.audit(actor,action,details) values(auth.uid(),'settings.changed',jsonb_build_object('key',coalesce(new.key,old.key),'previous',old.value,'value',new.value));
 elsif tg_table_name='accounts' then
 if new.state is distinct from old.state or new.suspended_until is distinct from old.suspended_until then insert into realm_private.audit(actor,action,target,details) values(auth.uid(),'account.state',new.user_id,jsonb_build_object('state',new.state,'until',new.suspended_until));end if;
 else insert into realm_private.audit(actor,action,target) values(auth.uid(),'platform_admin.'||lower(tg_op),coalesce(new.user_id,old.user_id));end if;
 return coalesce(new,old);
end $$;
create trigger audit_settings after insert or update or delete on realm_private.settings for each row execute function realm_private.audit_operator_change();
create trigger audit_account_state after update on realm_private.accounts for each row execute function realm_private.audit_operator_change();
create trigger audit_platform_grants after insert or delete on realm_private.platform_admins for each row execute function realm_private.audit_operator_change();
notify pgrst,'reload schema';
