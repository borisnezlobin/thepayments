import { NextResponse } from "next/server";
import { handle, HttpError } from "@/lib/http";
import { requireShopOwner } from "@/lib/shops/auth";
import { advanceOrder } from "@/lib/shops/repository";

export function POST(request: Request, context: RouteContext<"/api/shops/[slug]/inbox/[orderId]">) {
  return handle(async () => {
    const { slug, orderId } = await context.params;
    const shop = await requireShopOwner(request, slug);
    const order = await advanceOrder(shop.id, orderId);
    if (!order) throw new HttpError(409, "That order already moved on. Refresh to see where it is.");
    return NextResponse.json(order);
  });
}
