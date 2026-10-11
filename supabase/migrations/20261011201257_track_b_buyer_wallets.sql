-- Atomic provisioning of a testnet wallet for an authenticated Track C buyer.
begin;
create unique index buyers_unique_wallet on public.buyers(lower(wallet_address)) where wallet_address is not null;
create function public.track_b_assign_buyer_wallet(p_buyer uuid,p_wallet uuid) returns text
language plpgsql security invoker set search_path='' as $$
declare address text; candidate text;
begin
 select wallet_address into address from public.buyers where id=p_buyer for update;
 if not found then raise exception 'Buyer profile missing'; end if;
 if address is not null then return address; end if;
 select wallet_address into strict candidate from public.track_b_wallets where id=p_wallet;
 update public.buyers set wallet_address=candidate where id=p_buyer;
 return candidate;
end $$;
revoke all on function public.track_b_assign_buyer_wallet(uuid,uuid) from public,anon,authenticated;
grant execute on function public.track_b_assign_buyer_wallet(uuid,uuid) to service_role;
grant select,insert,update on public.buyers to service_role;
commit;
