import { NextResponse } from "next/server";
import { handle, HttpError } from "@/lib/http";
import { withdrawAll } from "@/lib/payments";
import { requireShopOwner } from "@/lib/shops/auth";

export function POST(
  request: Request,
  context: RouteContext<"/api/shops/[slug]/withdraw">,
) {
  return handle(async () => {
    const shop = await requireShopOwner(request, (await context.params).slug);
    const key = request.headers.get("Idempotency-Key");
    if (!key || !/^[a-zA-Z0-9_-]{8,128}$/.test(key))
      throw new HttpError(
        400,
        "Send the same Idempotency-Key on withdrawal retries.",
      );
    return NextResponse.json(await withdrawAll(shop, key), { status: 201 });
  });
}
