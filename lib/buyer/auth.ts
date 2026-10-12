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
// Trades a one-time connection token for a new session token, which replaces
// any earlier session. The database does both in one statement (see the
// track_c_agent_sessions migration). With currentBuyerId set, only a token
// for that same account is accepted.
export async function redeemConnectionToken(
  token: string,
  currentBuyerId?: string,
): Promise<{ token: string; expiresAt: string } | null> {
  if (!validAgentToken(token) || !agentLinksConfigured()) return null;
  const session = newAgentToken();
  const { data, error } = await supabaseAdmin()
    .rpc("track_c_redeem_agent_token", {
      p_token_hash: hashAgentToken(token),
      p_session_hash: hashAgentToken(session),
      p_connect_seconds: AGENT_CONNECT_SECONDS,
      p_session_seconds: AGENT_SESSION_SECONDS,
      p_current_buyer: currentBuyerId ?? null,
    })
    .maybeSingle<{ session_buyer_id: string; session_expires_at: string }>();
  if (error || !data) return null;
  return { token: session, expiresAt: data.session_expires_at };
}
// Lets an agent end its own session when it signs out.
export async function endAgentSession(token: string) {
  if (!validAgentToken(token) || !agentLinksConfigured()) return;
  await supabaseAdmin()
    .from("track_c_agent_sessions")
    .delete()
    .eq("session_hash", hashAgentToken(token));
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
