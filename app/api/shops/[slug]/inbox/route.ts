import { NextResponse, connection } from "next/server";
import { handle } from "@/lib/http";
import { getBalance } from "@/lib/payments";
import { requireShopOwner } from "@/lib/shops/auth";
import { listInboxOrders } from "@/lib/shops/repository";
import { summarizeSales } from "@/lib/shops/summary";

export async function GET(request: Request, context: RouteContext<"/api/shops/[slug]/inbox">) {
  await connection();
  return handle(async () => {
    const shop = await requireShopOwner(request, (await context.params).slug);
    const [orders, balanceCents] = await Promise.all([listInboxOrders(shop.id), getBalance(shop)]);
    return NextResponse.json({ orders, summary: summarizeSales(orders), balanceCents });
  });
}
