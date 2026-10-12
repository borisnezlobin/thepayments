-- Track C only: the lasting session an agent gets after it redeems a one-time
-- connection token from track_c_agent_links. Only the token's hash is stored.
-- The server creates sessions with the secret key. Buyers can see and end their own.
-- Every statement can run twice safely, in case it is pasted into the SQL editor first.
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
drop policy if exists "Buyers read their own agent session" on public.track_c_agent_sessions;
create policy "Buyers read their own agent session" on public.track_c_agent_sessions
  for select to authenticated using ((select auth.uid()) = buyer_id);
drop policy if exists "Buyers end their own agent session" on public.track_c_agent_sessions;
create policy "Buyers end their own agent session" on public.track_c_agent_sessions
  for delete to authenticated using ((select auth.uid()) = buyer_id);

-- Redeeming is one statement. Only one caller can delete the token row, and a
-- Disconnect that runs at the same moment can't leave a session behind.
-- p_current_buyer keeps a browser that is already connected on its own account.
create or replace function public.track_c_redeem_agent_token(
  p_token_hash text,
  p_session_hash text,
  p_connect_seconds integer,
  p_session_seconds integer,
  p_current_buyer uuid default null
) returns table (session_buyer_id uuid, session_expires_at timestamptz)
language sql
set search_path = ''
as $$
  with redeemed as (
    delete from public.track_c_agent_links as l
    where l.token_hash = p_token_hash
      and l.expires_at > now()
      and l.created_at > now() - make_interval(secs => p_connect_seconds)
      and (p_current_buyer is null or l.buyer_id = p_current_buyer)
    returning l.buyer_id
  )
  insert into public.track_c_agent_sessions as s (buyer_id, session_hash, expires_at, created_at)
  select r.buyer_id, p_session_hash, now() + make_interval(secs => p_session_seconds), now()
  from redeemed as r
  on conflict (buyer_id) do update
    set session_hash = excluded.session_hash,
        expires_at = excluded.expires_at,
        created_at = excluded.created_at
  returning s.buyer_id, s.expires_at;
$$;
revoke all on function public.track_c_redeem_agent_token(text, text, integer, integer, uuid)
  from public, anon, authenticated;
grant execute on function public.track_c_redeem_agent_token(text, text, integer, integer, uuid)
  to service_role;
