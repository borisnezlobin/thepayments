import { NextResponse, connection } from "next/server";
import { handle, HttpError } from "@/lib/http";
import { getLiveMenu } from "@/lib/shops/repository";

export async function GET(_request: Request, context: RouteContext<"/api/shops/[slug]/menu">) {
  await connection();
  return handle(async () => {
    const menu = await getLiveMenu((await context.params).slug);
    if (!menu) throw new HttpError(404, "There's no live shop at that address.");
    return NextResponse.json(menu);
  });
}
