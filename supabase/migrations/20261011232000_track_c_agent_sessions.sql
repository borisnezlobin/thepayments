-- Track C only: the lasting session an agent gets after it redeems a one-time
-- connection token from track_c_agent_links. Only the token's hash is stored.
-- The server creates sessions with the secret key. Buyers can see and end their own.
create table if not exists public.track_c_agent_sessions (
  buyer_id uuid primary key references public.buyers(id) on delete cascade,
  session_hash text not null unique check (session_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.track_c_agent_sessions enable row level security;
revoke all on public.track_c_agent_sessions from anon, authenticated;
grant select, delete on public.track_c_agent_sessions to authenticated;
grant all on public.track_c_agent_sessions to service_role;
create policy "Buyers read their own agent session" on public.track_c_agent_sessions
  for select to authenticated using ((select auth.uid()) = buyer_id);
create policy "Buyers end their own agent session" on public.track_c_agent_sessions
  for delete to authenticated using ((select auth.uid()) = buyer_id);
