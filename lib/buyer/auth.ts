import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authConfigured, agentLinksConfigured } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  AGENT_COOKIE,
  hashAgentToken,
  isActiveGrant,
  validAgentToken,
} from "./tokens";
export type Principal =
  | { buyerId: string; kind: "owner"; email: string }
  | { buyerId: string; kind: "agent" };
export async function resolveAgent(token: string): Promise<Principal | null> {
  if (!validAgentToken(token) || !agentLinksConfigured()) return null;
  const { data, error } = await supabaseAdmin()
    .from("track_c_agent_links")
    .select("buyer_id,expires_at")
    .eq("token_hash", hashAgentToken(token))
    .maybeSingle();
  if (error || !isActiveGrant(data)) return null;
  return { buyerId: data!.buyer_id, kind: "agent" };
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
