import { NextResponse, connection } from "next/server";
import { handle } from "@/lib/http";
import { getBalance } from "@/lib/payments";
import { requireShopOwner } from "@/lib/shops/auth";

export async function GET(request: Request, context: RouteContext<"/api/shops/[slug]/balance">) {
  await connection();
  return handle(async () => {
    const shop = await requireShopOwner(request, (await context.params).slug);
    return NextResponse.json({ balanceCents: await getBalance(shop) });
  });
}
