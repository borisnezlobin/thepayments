"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { appOrigin, authConfigured, agentLinksConfigured } from "@/lib/config";
import { ensureBuyer } from "@/lib/buyer/profile";
import { requireOwner, resolveAgent } from "@/lib/buyer/auth";
import { approveRequest, declineRequest } from "@/lib/buyer/approvals";
import { IntegrationUnavailable, InvalidOrder } from "@/lib/errors";
import {
  AGENT_COOKIE,
  AGENT_LINK_SECONDS,
  hashAgentToken,
  newAgentToken,
  safeNext,
} from "@/lib/buyer/tokens";

const credentials = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});
function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
const secure = () => process.env.NODE_ENV === "production";
export async function signIn(form: FormData) {
  if (!authConfigured())
    fail("/login", "Account sign-in is not configured yet.");
  const parsed = credentials.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    fail(
      "/login",
      "Enter a valid email and a password of at least 8 characters.",
    );
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error)
    fail(
      "/login",
      "Unable to sign in. Check your email, password, and email confirmation.",
    );
  try {
    await ensureBuyer(data.user!);
  } catch {
    fail("/login", "Buyer profile setup failed. Please try signing in again.");
  }
  (await cookies()).delete(AGENT_COOKIE);
  redirect(safeNext(String(form.get("next") || "")));
}
export async function signUp(form: FormData) {
  if (!authConfigured())
    fail("/signup", "Account sign-up is not configured yet.");
  const parsed = credentials.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    fail(
      "/signup",
      "Enter a valid email and a password of at least 8 characters.",
    );
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${appOrigin()}/auth/callback` },
  });
  if (error)
    fail(
      "/signup",
      "Unable to create your account. Try again or sign in if you already have one.",
    );
  (await cookies()).delete(AGENT_COOKIE);
  // Account creation is real. Wallet creation/funding wait for Track B.
  if (data.session) {
    try {
      await ensureBuyer(data.user!);
    } catch {
      fail(
        "/login",
        "Your account exists. Sign in again to finish buyer profile setup.",
      );
    }
    redirect("/account");
  }
  redirect("/login?notice=confirm");
}
export async function signOut() {
  const jar = await cookies();
  jar.delete(AGENT_COOKIE);
  jar.delete({ name: "payments-new-agent-link", path: "/account" });
  if (authConfigured()) await (await supabaseServer()).auth.signOut();
  redirect("/shops");
}
export async function createAgentLink() {
  const owner = await requireOwner();
  if (!agentLinksConfigured())
    fail("/account", "Agent links are not configured yet.");
  const token = newAgentToken();
  const supabase = await supabaseServer();
  const { error } = await supabase.from("track_c_agent_links").upsert(
    {
      buyer_id: owner.buyerId,
      token_hash: hashAgentToken(token),
      expires_at: new Date(
        Date.now() + AGENT_LINK_SECONDS * 1000,
      ).toISOString(),
      created_at: new Date().toISOString(),
    },
    { onConflict: "buyer_id" },
  );
  if (error)
    fail(
      "/account",
      "Could not create the agent link. Check that the Track C database setup is complete.",
    );
  // Shown briefly only to the signed-in owner. Only its hash is stored in the DB.
  (await cookies()).set("payments-new-agent-link", token, {
    httpOnly: true,
    secure: secure(),
    sameSite: "strict",
    path: "/account",
    maxAge: 120,
  });
  redirect("/account#agent-link");
}
export async function revokeAgentLink() {
  const owner = await requireOwner();
  const { error } = await (await supabaseServer())
    .from("track_c_agent_links")
    .delete()
    .eq("buyer_id", owner.buyerId);
  if (error)
    fail("/account", "Could not revoke the agent link. Please try again.");
  (await cookies()).delete({
    name: "payments-new-agent-link",
    path: "/account",
  });
  redirect("/account?notice=revoked#agent-link");
}
export async function connectAgent(form: FormData) {
  const token = String(form.get("token") || "");
  if (!(await resolveAgent(token))) redirect("/agents?error=expired");
  (await cookies()).set(AGENT_COOKIE, token, {
    httpOnly: true,
    secure: secure(),
    sameSite: "lax",
    path: "/",
    maxAge: AGENT_LINK_SECONDS,
  });
  redirect("/shops?notice=connected");
}
const requestId = (form: FormData) => {
  const parsed = z.string().uuid().safeParse(form.get("requestId"));
  if (!parsed.success) fail("/account", "That order request was not found.");
  return parsed.data;
};
function decisionError(error: unknown): never {
  if (error instanceof InvalidOrder) fail("/account", error.message);
  if (error instanceof IntegrationUnavailable)
    fail(
      "/account",
      "Wallet checkout is not connected yet. The order is still waiting for you. Nothing was charged.",
    );
  throw error;
}
export async function approveOrderRequest(form: FormData) {
  const owner = await requireOwner();
  const id = requestId(form);
  try {
    await approveRequest(owner.buyerId, id);
  } catch (error) {
    decisionError(error);
  }
  redirect(`/account?notice=approved#approvals`);
}
export async function declineOrderRequest(form: FormData) {
  const owner = await requireOwner();
  const id = requestId(form);
  try {
    await declineRequest(owner.buyerId, id);
  } catch (error) {
    decisionError(error);
  }
  redirect(`/account?notice=declined#approvals`);
}
