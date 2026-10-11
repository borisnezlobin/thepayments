-- Track C only: orders an agent asks to place, held until the buyer approves.
-- An agent session can create a request. Only the signed-in owner can decide it.
-- The server writes with the secret key after checking who is asking.
create table if not exists public.track_c_order_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.buyers(id) on delete cascade,
  idempotency_key uuid not null,
  source text not null check (source in ('web', 'mcp')),
  shop_slug text not null,
  shop_name text not null,
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  pickup_name text not null check (char_length(pickup_name) between 1 and 80),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  total_cents integer not null check (total_cents > 0 and total_cents <= subtotal_cents),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined', 'paid', 'failed')),
  order_id uuid references public.orders(id),
  expires_at timestamptz not null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (buyer_id, idempotency_key)
);
create index if not exists track_c_order_requests_pending
  on public.track_c_order_requests (buyer_id, created_at desc)
  where status = 'pending';
alter table public.track_c_order_requests enable row level security;
revoke all on public.track_c_order_requests from anon, authenticated;
grant select on public.track_c_order_requests to authenticated;
grant all on public.track_c_order_requests to service_role;
create policy "Buyers read their own order requests" on public.track_c_order_requests
  for select to authenticated using ((select auth.uid()) = buyer_id);
