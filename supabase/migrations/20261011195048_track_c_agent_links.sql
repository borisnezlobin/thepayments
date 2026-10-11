-- Track C only: account grants. Existing shared schema stays unchanged.
-- buyers.id is provisioned from a verified auth.users.id by Track C.
create table if not exists public.track_c_agent_links (
  buyer_id uuid primary key references public.buyers(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.track_c_agent_links enable row level security;
revoke all on public.track_c_agent_links from anon, authenticated;
grant select, insert, update, delete on public.track_c_agent_links to authenticated;
grant all on public.track_c_agent_links to service_role;
create policy "Buyers read their own agent grant" on public.track_c_agent_links
  for select to authenticated using ((select auth.uid()) = buyer_id);
create policy "Buyers create their own agent grant" on public.track_c_agent_links
  for insert to authenticated with check ((select auth.uid()) = buyer_id);
create policy "Buyers rotate their own agent grant" on public.track_c_agent_links
  for update to authenticated using ((select auth.uid()) = buyer_id) with check ((select auth.uid()) = buyer_id);
create policy "Buyers revoke their own agent grant" on public.track_c_agent_links
  for delete to authenticated using ((select auth.uid()) = buyer_id);
