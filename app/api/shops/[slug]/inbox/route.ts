import { NextResponse, connection } from "next/server";
import { handle } from "@/lib/http";
import { requireShopOwner } from "@/lib/shops/auth";
import { loadInbox } from "@/lib/shops/dashboard";

export async function GET(request: Request, context: RouteContext<"/api/shops/[slug]/inbox">) {
  await connection();
  return handle(async () => {
    const shop = await requireShopOwner(request, (await context.params).slug);
    return NextResponse.json(await loadInbox(shop.id));
  });
}
