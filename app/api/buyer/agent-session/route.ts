import { redeemConnectionToken } from "@/lib/buyer/auth";
const noStore = { "Cache-Control": "no-store" };
// MCP and API clients can't keep a browser cookie. They trade the one-time
// connection token for a session token here, once, and send it as a Bearer token.
export async function POST(request: Request) {
  let token: unknown;
  try {
    token = ((await request.json()) as { token?: unknown } | null)?.token;
  } catch {
    return Response.json(
      { error: "invalid_request" },
      { status: 400, headers: noStore },
    );
  }
  const session =
    typeof token === "string"
      ? await redeemConnectionToken(token.trim())
      : null;
  if (!session)
    return Response.json(
      {
        error: "invalid_token",
        message:
          "That connection token is mistyped, expired, already used or revoked.",
      },
      { status: 401, headers: noStore },
    );
  return Response.json(
    { sessionToken: session.token, expiresAt: session.expiresAt },
    { headers: noStore },
  );
}
