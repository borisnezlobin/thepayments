import { connection, NextResponse } from "next/server";
import { mcpHandler } from "@/lib/mcp";
import { appOrigin } from "@/lib/config";
export async function GET(request: Request) {
  await connection();
  if (request.headers.get("accept")?.includes("text/html"))
    return NextResponse.redirect(`${appOrigin()}/agents#mcp`);
  return mcpHandler(request);
}
async function protocolRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== appOrigin())
    return Response.json({ error: "origin_not_allowed" }, { status: 403 });
  return mcpHandler(request);
}
export const POST = protocolRequest;
export const DELETE = protocolRequest;
