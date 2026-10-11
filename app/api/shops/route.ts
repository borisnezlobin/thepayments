import { NextResponse, connection } from "next/server";
import { handle } from "@/lib/http";
import { listLiveShops } from "@/lib/shops/repository";

export async function GET() {
  await connection();
  return handle(async () => NextResponse.json(await listLiveShops()));
}
