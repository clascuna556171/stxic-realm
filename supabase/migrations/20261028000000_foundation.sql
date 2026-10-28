-- Closed-alpha foundation. Create accounts and memberships through trusted admin tooling only.
create extension if not exists pgcrypto;
create table public.spaces (
  id uuid primary key default gen_random_uuid(), name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);
create table public.space_members (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(), primary key (space_id,user_id)
);
create index space_members_user_id_idx on public.space_members(user_id);
create table public.channels (
  id uuid primary key default gen_random_uuid(), space_id uuid not null references public.spaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80), created_at timestamptz not null default now(), unique(space_id,name)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), channel_id uuid not null references public.channels(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null, body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(), unique(author_id,client_id)
);
create index messages_channel_order_idx on public.messages(channel_id,created_at desc,id desc);

alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;
revoke all on public.spaces,public.space_members,public.channels,public.messages from anon, authenticated;
grant select on public.spaces,public.space_members,public.channels,public.messages to authenticated;
grant insert (channel_id,author_id,client_id,body) on public.messages to authenticated;
create policy members_read_self on public.space_members for select to authenticated using (user_id = (select auth.uid()));
create policy spaces_read_members on public.spaces for select to authenticated using (exists (select 1 from public.space_members m where m.space_id = spaces.id and m.user_id = (select auth.uid())));
create policy channels_read_members on public.channels for select to authenticated using (exists (select 1 from public.space_members m where m.space_id = channels.space_id and m.user_id = (select auth.uid())));
create policy messages_read_members on public.messages for select to authenticated using (exists (select 1 from public.channels c join public.space_members m on m.space_id = c.space_id where c.id = messages.channel_id and m.user_id = (select auth.uid())));
create policy messages_insert_members on public.messages for insert to authenticated with check (author_id = (select auth.uid()) and exists (select 1 from public.channels c join public.space_members m on m.space_id = c.space_id where c.id = messages.channel_id and m.user_id = (select auth.uid())));
-- Postgres Changes are filtered by RLS; subscriptions are hints, not authoritative history.
alter publication supabase_realtime add table public.messages;
