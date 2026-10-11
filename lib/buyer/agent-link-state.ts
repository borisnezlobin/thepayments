import "server-only";
import { cookies } from "next/headers";
import { appOrigin, agentLinksConfigured } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";
import { hashAgentToken, isActiveGrant } from "./tokens";
export async function agentLinkState(buyerId: string) {
  if (!agentLinksConfigured())
    return {
      available: false,
      active: false,
      expiresAt: null,
      newLink: null,
      newToken: null,
    };
  const { data, error } = await (await supabaseServer())
    .from("track_c_agent_links")
    .select("token_hash,expires_at")
    .eq("buyer_id", buyerId)
    .maybeSingle();
  const active = isActiveGrant(data);
  const token = (await cookies()).get("payments-new-agent-link")?.value;
  const newToken =
    token && active && data?.token_hash === hashAgentToken(token)
      ? token
      : null;
  const newLink = newToken ? `${appOrigin()}/agent/${newToken}` : null;
  return {
    available: !error,
    active,
    expiresAt: data?.expires_at ?? null,
    newLink,
    newToken,
  };
}
