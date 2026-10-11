import "server-only";
import { cookies } from "next/headers";
import { appOrigin, agentLinksConfigured } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";
import { AGENT_CONNECT_SECONDS, hashAgentToken, isActiveGrant } from "./tokens";
// What the account page shows about the owner's agent: whether a session is
// active, and the connection token they just made while it's still usable.
export async function agentLinkState(buyerId: string) {
  if (!agentLinksConfigured())
    return {
      available: false,
      active: false,
      expiresAt: null,
      newLink: null,
      newToken: null,
      newTokenExpiresAt: null,
    };
  const supabase = await supabaseServer();
  const [session, link] = await Promise.all([
    supabase
      .from("track_c_agent_sessions")
      .select("expires_at,created_at")
      .eq("buyer_id", buyerId)
      .maybeSingle(),
    supabase
      .from("track_c_agent_links")
      .select("token_hash,expires_at,created_at")
      .eq("buyer_id", buyerId)
      .maybeSingle(),
  ]);
  const active = isActiveGrant(session.data);
  const token = (await cookies()).get("payments-new-agent-link")?.value;
  const newToken =
    token &&
    isActiveGrant(link.data, Date.now(), AGENT_CONNECT_SECONDS) &&
    link.data?.token_hash === hashAgentToken(token)
      ? token
      : null;
  const newLink = newToken ? `${appOrigin()}/agent/${newToken}` : null;
  return {
    available: !session.error && !link.error,
    active,
    expiresAt: active ? (session.data?.expires_at ?? null) : null,
    newLink,
    newToken,
    newTokenExpiresAt: newToken ? (link.data?.expires_at ?? null) : null,
  };
}
