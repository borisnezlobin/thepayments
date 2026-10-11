import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authConfigured, agentLinksConfigured } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  AGENT_CONNECT_SECONDS,
  AGENT_COOKIE,
  AGENT_SESSION_SECONDS,
  hashAgentToken,
  isActiveGrant,
  newAgentToken,
  validAgentToken,
} from "./tokens";
export type Principal =
  | { buyerId: string; kind: "owner"; email: string }
  | { buyerId: string; kind: "agent" };
// Resolves a connected agent's session token, from its cookie or a Bearer header.
export async function resolveAgent(token: string): Promise<Principal | null> {
  if (!validAgentToken(token) || !agentLinksConfigured()) return null;
  const { data, error } = await supabaseAdmin()
    .from("track_c_agent_sessions")
    .select("buyer_id,expires_at,created_at")
    .eq("session_hash", hashAgentToken(token))
    .maybeSingle();
  if (error || !isActiveGrant(data)) return null;
  return { buyerId: data!.buyer_id, kind: "agent" };
}
// Read-only check for the link page. Opening a link (or a chat app previewing
// it) must not use up the token, so only redeemConnectionToken consumes it.
export async function connectionTokenUsable(token: string) {
  if (!validAgentToken(token) || !agentLinksConfigured()) return false;
  const { data, error } = await supabaseAdmin()
    .from("track_c_agent_links")
    .select("expires_at,created_at")
    .eq("token_hash", hashAgentToken(token))
    .maybeSingle();
  return !error && isActiveGrant(data, Date.now(), AGENT_CONNECT_SECONDS);
}
// Trades a one-time connection token for a new session token. Deleting the
// token's row is what makes it single-use: when two requests race, only one
// of them gets the row back. The new session replaces any earlier one.
export async function redeemConnectionToken(
  token: string,
): Promise<{ token: string; expiresAt: string } | null> {
  if (!validAgentToken(token) || !agentLinksConfigured()) return null;
  const now = Date.now();
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("track_c_agent_links")
    .delete()
    .eq("token_hash", hashAgentToken(token))
    .gt("expires_at", new Date(now).toISOString())
    .gt(
      "created_at",
      new Date(now - AGENT_CONNECT_SECONDS * 1000).toISOString(),
    )
    .select("buyer_id")
    .maybeSingle();
  if (error || !data) return null;
  const session = newAgentToken();
  const expiresAt = new Date(now + AGENT_SESSION_SECONDS * 1000).toISOString();
  const { error: sessionError } = await admin
    .from("track_c_agent_sessions")
    .upsert(
      {
        buyer_id: data.buyer_id,
        session_hash: hashAgentToken(session),
        expires_at: expiresAt,
        created_at: new Date(now).toISOString(),
      },
      { onConflict: "buyer_id" },
    );
  return sessionError ? null : { token: session, expiresAt };
}
export async function getPrincipal(): Promise<Principal | null> {
  const token = (await cookies()).get(AGENT_COOKIE)?.value;
  // An agent cookie NEVER falls back to a possibly signed-in owner's privileges.
  if (token) return resolveAgent(token);
  if (!authConfigured()) return null;
  const supabase = await supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return error || !user
    ? null
    : { buyerId: user.id, kind: "owner", email: user.email ?? "" };
}
export async function requireOwner() {
  const principal = await getPrincipal();
  if (principal?.kind === "agent") redirect("/shops?notice=agent");
  if (!principal) redirect("/login?next=/account");
  return principal;
}
