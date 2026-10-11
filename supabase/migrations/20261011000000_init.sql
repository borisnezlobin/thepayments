create extension if not exists pgcrypto;

create table shops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  source_url text not null,
  wallet_address text,
  agent_discount_pct integer not null default 5 check (agent_discount_pct between 0 and 50),
  status text not null default 'draft' check (status in ('draft', 'live')),
  created_at timestamptz not null default now()
);

create table shop_secrets (
  shop_id uuid primary key references shops (id) on delete cascade,
  admin_token text not null unique
);

create table products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  image_url text,
  category text,
  available boolean not null default true,
  position integer not null default 0
);

create index products_shop_position on products (shop_id, position);

create table buyers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  wallet_address text,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id) on delete cascade,
  buyer_id uuid references buyers (id),
  pickup_name text not null,
  items jsonb not null,
  subtotal_cents integer not null,
  discount_cents integer not null,
  total_cents integer not null,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'paid', 'ready', 'picked_up')),
  chain text not null default 'base-sepolia' check (chain in ('base-sepolia', 'xrpl-testnet')),
  tx_hash text,
  payment_nonce text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index orders_shop_created on orders (shop_id, created_at desc);

create table withdrawals (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  tx_hash text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now()
);

alter table shops enable row level security;
alter table shop_secrets enable row level security;
alter table products enable row level security;
alter table buyers enable row level security;
alter table orders enable row level security;
alter table withdrawals enable row level security;
