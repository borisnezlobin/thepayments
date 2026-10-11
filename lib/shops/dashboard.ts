import "server-only";
import { notFound } from "next/navigation";
import { getBalance } from "../payments";
import {
  findShopByToken,
  listInboxOrders,
  listProducts,
  listWithdrawals,
} from "./repository";
import { summarizeSales, type InboxResponse } from "./summary";

export async function loadDashboardShop(token: string) {
  const shop = await findShopByToken(token);
  if (!shop) notFound();
  return shop;
}

export async function loadMenuEditor(token: string) {
  const shop = await loadDashboardShop(token);
  return { shop, products: await listProducts(shop.id) };
}

export async function loadInbox(shopId: string): Promise<InboxResponse> {
  const [orders, balanceCents, withdrawals] = await Promise.all([
    listInboxOrders(shopId),
    getBalance({ id: shopId }).catch(() => null),
    listWithdrawals(shopId),
  ]);
  return { orders, summary: summarizeSales(orders), balanceCents, withdrawals };
}
