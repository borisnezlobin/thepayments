-- Additive Track B payment journal and encrypted wallet storage.
-- Requires the team's initial shared schema.
-- This creates no shops/products/buyers tables and never changes their records.
begin;
create table public.track_b_wallets (
 id uuid primary key, wallet_address text not null unique, encrypted_key text not null
);
create unique index track_b_wallet_address_lower on public.track_b_wallets(lower(wallet_address));
create table public.track_b_intents (
 key text primary key, document jsonb not null,
 check (document->>'key'=key),
 check (document->>'state' in ('reserved','prepared','hosted','confirmed'))
);
create unique index track_b_checkout on public.track_b_intents((document->>'checkoutKey')) where document->>'checkoutKey' is not null;
create unique index track_b_intent_transaction on public.track_b_intents((document->>'txHash')) where document->>'txHash' is not null;
create table public.track_b_nonces (address text primary key, next_nonce bigint not null);
create table public.track_b_client_payments (key text primary key,payment jsonb not null);
alter table public.track_b_wallets enable row level security;
alter table public.track_b_intents enable row level security;
alter table public.track_b_nonces enable row level security;
alter table public.track_b_client_payments enable row level security;
revoke all on public.track_b_wallets,public.track_b_intents,public.track_b_nonces,public.track_b_client_payments from public,anon,authenticated;
grant select,insert,update on public.track_b_wallets,public.track_b_intents,public.track_b_nonces,public.track_b_client_payments to service_role;

create function public.track_b_claim(p_intent jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved jsonb; inserted boolean; o jsonb; w jsonb;
begin
 insert into public.track_b_intents(key,document) values(p_intent->>'key',p_intent) on conflict do nothing;
 inserted:=found;
 select document into strict saved from public.track_b_intents where key=p_intent->>'key' or (p_intent->>'checkoutKey' is not null and document->>'checkoutKey'=p_intent->>'checkoutKey');
 if inserted then
  o:=p_intent->'order'; w:=p_intent->'withdrawal';
  if o<>'null'::jsonb then
   insert into public.orders(id,shop_id,buyer_id,pickup_name,items,subtotal_cents,discount_cents,total_cents,status,chain,tx_hash,payment_nonce,created_at)
   values((o->>'id')::uuid,(o->>'shopId')::uuid,(o->>'buyerId')::uuid,o->>'pickupName',o->'items',(o->>'subtotalCents')::bigint,(o->>'discountCents')::bigint,(o->>'totalCents')::bigint,'awaiting_payment','base-sepolia',null,p_intent->>'key',(o->>'createdAt')::timestamptz);
  end if;
  if w<>'null'::jsonb then
   insert into public.withdrawals(id,shop_id,amount_cents,tx_hash,status,created_at)
   values((w->>'id')::uuid,(w->>'shopId')::uuid,(w->>'amountCents')::bigint,null,'pending',(w->>'createdAt')::timestamptz);
  end if;
 end if;
 return jsonb_build_object('created',inserted,'intent',saved);
end $$;
create function public.track_b_prepare(p_key text,p_raw text,p_hash text) returns void language plpgsql security invoker set search_path='' as $$
begin
 update public.track_b_intents set document=document||jsonb_build_object('rawTx',p_raw,'txHash',p_hash,'state','prepared') where key=p_key and document->>'state'='reserved';
 if not found then raise exception 'Invalid intent transition'; end if;
end $$;
create function public.track_b_complete(p_key text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved jsonb; o jsonb; w jsonb;
begin
 select document into strict saved from public.track_b_intents where key=p_key for update;
 if saved->>'state'='confirmed' then return saved; end if;
 if saved->>'state' not in ('prepared','hosted') or saved->>'txHash' is null then raise exception 'Payment not prepared'; end if;
 o:=saved->'order';w:=saved->'withdrawal';
 if o<>'null'::jsonb then
  update public.orders set status='paid',paid_at=now(),tx_hash=saved->>'txHash' where id=(o->>'id')::uuid and status='awaiting_payment';
  if not found then raise exception 'Invalid order transition'; end if;
  saved:=jsonb_set(saved,'{order}',o||jsonb_build_object('status','paid','paidAt',now(),'txHash',saved->>'txHash'));
 end if;
 if w<>'null'::jsonb then
  update public.withdrawals set status='sent',tx_hash=saved->>'txHash' where id=(w->>'id')::uuid and status='pending';
  if not found then raise exception 'Invalid withdrawal transition'; end if;
  saved:=jsonb_set(saved,'{withdrawal}',w||jsonb_build_object('status','sent','txHash',saved->>'txHash'));
 end if;
 saved:=saved||jsonb_build_object('state','confirmed');
 update public.track_b_intents set document=saved where key=p_key;
 return saved;
end $$;
create function public.track_b_allocate_nonce(p_address text,p_chain_nonce bigint) returns bigint language plpgsql security invoker set search_path='' as $$
declare result bigint;
begin
 insert into public.track_b_nonces(address,next_nonce) values(lower(p_address),p_chain_nonce+1)
 on conflict(address) do update set next_nonce=greatest(public.track_b_nonces.next_nonce,p_chain_nonce)+1
 returning next_nonce-1 into result;
 return result;
end $$;
create function public.track_b_client_payment(p_key text,p_payment jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 insert into public.track_b_client_payments(key,payment) values(p_key,p_payment) on conflict do nothing;
 select payment into strict result from public.track_b_client_payments where key=p_key;
 return result;
end $$;
create function public.track_b_start_hosted(p_key text,p_block text) returns void language plpgsql security invoker set search_path='' as $$
begin
 update public.track_b_intents set document=document||jsonb_build_object('state','hosted','startBlock',p_block) where key=p_key and document->>'state'='reserved';
 if not found then raise exception 'Invalid hosted transition'; end if;
end $$;
create function public.track_b_hosted_hash(p_key text,p_hash text) returns void language plpgsql security invoker set search_path='' as $$
begin
 update public.track_b_intents set document=document||jsonb_build_object('txHash',p_hash) where key=p_key and document->>'state'='hosted' and (document->>'txHash' is null or document->>'txHash'=p_hash);
 if not found then raise exception 'Invalid hosted hash'; end if;
end $$;
revoke all on function public.track_b_start_hosted(text,text),public.track_b_hosted_hash(text,text) from public,anon,authenticated;
grant execute on function public.track_b_start_hosted(text,text),public.track_b_hosted_hash(text,text) to service_role;
revoke all on function public.track_b_claim(jsonb),public.track_b_prepare(text,text,text),public.track_b_complete(text),public.track_b_allocate_nonce(text,bigint),public.track_b_client_payment(text,jsonb) from public,anon,authenticated;
grant execute on function public.track_b_claim(jsonb),public.track_b_prepare(text,text,text),public.track_b_complete(text),public.track_b_allocate_nonce(text,bigint),public.track_b_client_payment(text,jsonb) to service_role;
grant select on public.shops,public.products,public.buyers,public.shop_secrets to service_role;
grant select,insert,update on public.orders,public.withdrawals to service_role;
commit;
-- Team schema must separately grant service_role read on shops/products/buyers,
-- and select/insert/update on orders/withdrawals. Enable RLS on these shared tables.
-- Track A adds orders to supabase_realtime and supplies owner-scoped SELECT policies.
