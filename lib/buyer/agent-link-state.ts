import "server-only";
import { cookies } from "next/headers";
import { appOrigin, agentLinksConfigured } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";
import { hashAgentToken, isActiveGrant } from "./tokens";
export async function agentLinkState(buyerId: string) {
  if (!agentLinksConfigured())
    return { available: false, active: false, expiresAt: null, newLink: null };
  const { data, error } = await (await supabaseServer())
    .from("track_c_agent_links")
    .select("token_hash,expires_at")
    .eq("buyer_id", buyerId)
    .maybeSingle();
  const active = isActiveGrant(data);
  const token = (await cookies()).get("payments-new-agent-link")?.value;
  const newLink =
    token && active && data?.token_hash === hashAgentToken(token)
      ? `${appOrigin()}/agent/${token}`
      : null;
  return {
    available: !error,
    active,
    expiresAt: data?.expires_at ?? null,
    newLink,
  };
}
