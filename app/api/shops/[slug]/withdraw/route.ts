import { NextResponse } from "next/server";
import { handle, HttpError } from "@/lib/http";
import { getBalance, withdraw } from "@/lib/payments";
import { requireShopOwner } from "@/lib/shops/auth";

export function POST(request: Request, context: RouteContext<"/api/shops/[slug]/withdraw">) {
  return handle(async () => {
    const shop = await requireShopOwner(request, (await context.params).slug);
    const balanceCents = await getBalance(shop);
    if (balanceCents <= 0) throw new HttpError(409, "There's nothing to withdraw yet.");
    return NextResponse.json(await withdraw(shop, balanceCents), { status: 201 });
  });
}
