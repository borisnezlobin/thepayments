"use server";
import { PaymentError } from "@/lib/payments/validation";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { appOrigin, authConfigured, agentLinksConfigured } from "@/lib/config";
import { ensureBuyer } from "@/lib/buyer/profile";
import { redeemConnectionToken, requireOwner } from "@/lib/buyer/auth";
import { approveRequest, declineRequest } from "@/lib/buyer/approvals";
import { IntegrationUnavailable, InvalidOrder } from "@/lib/errors";
import {
  AGENT_CONNECT_SECONDS,
  AGENT_COOKIE,
  AGENT_SESSION_SECONDS,
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
// Logs why Supabase Auth refused a request so production failures show up in
// the Vercel function logs. Messages can contain the email, so only the code is kept.
function logAuthError(action: string, error: unknown) {
  const { name, status, code } = (error ?? {}) as Record<string, unknown>;
  console.error(`[auth] ${action} failed`, { name, status, code });
}
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
  if (error) logAuthError("signIn", error);
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
const SIGN_UP_ERRORS: Record<string, string> = {
  user_already_exists: "That email already has an account. Sign in instead.",
  email_exists: "That email already has an account. Sign in instead.",
  weak_password:
    "Choose a stronger password: at least 8 characters, mixing letters and numbers.",
  over_email_send_rate_limit:
    "Too many sign-ups from this project in the last hour. Try again later or sign in.",
  over_request_rate_limit: "Too many attempts. Wait a minute and try again.",
  signup_disabled: "New accounts are turned off right now.",
  email_address_invalid:
    "That email address can't receive mail. Try another one.",
};
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
  if (error) {
    console.error("signUp failed", {
      code: error.code,
      status: error.status,
      message: error.message,
    });
    fail(
      "/signup",
      SIGN_UP_ERRORS[error.code ?? ""] ??
        "Unable to create your account. Try again or sign in if you already have one.",
    );
  }
  (await cookies()).delete(AGENT_COOKIE);
  // Account creation is real. Wallet creation/funding wait for Track B.
  if (data.session) {
    try {
      await ensureBuyer(data.user!);
    } catch (profileError) {
      logAuthError("ensureBuyer after signUp", profileError);
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
        Date.now() + AGENT_CONNECT_SECONDS * 1000,
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
  // Shown only to the signed-in owner while it can still be used. Only its hash is stored in the DB.
  (await cookies()).set("payments-new-agent-link", token, {
    httpOnly: true,
    secure: secure(),
    sameSite: "strict",
    path: "/account",
    maxAge: AGENT_CONNECT_SECONDS,
  });
  redirect("/account#agent-link");
}
// Ends the agent's session and any connection token it hasn't used yet.
export async function revokeAgentLink() {
  const owner = await requireOwner();
  const supabase = await supabaseServer();
  const results = await Promise.all(
    ["track_c_agent_sessions", "track_c_agent_links"].map((table) =>
      supabase.from(table).delete().eq("buyer_id", owner.buyerId),
    ),
  );
  if (results.some(({ error }) => error))
    fail("/account", "Could not disconnect your agent. Please try again.");
  (await cookies()).delete({
    name: "payments-new-agent-link",
    path: "/account",
  });
  redirect("/account?notice=revoked#agent-link");
}
// Both connect paths use up the one-time connection token and give the agent's
// browser a separate session token. Neither token goes into a URL or a log.
async function startAgentSession(connectionToken: string) {
  const session = await redeemConnectionToken(connectionToken);
  if (!session) redirect("/agents/connect?error=invalid");
  (await cookies()).set(AGENT_COOKIE, session.token, {
    httpOnly: true,
    secure: secure(),
    sameSite: "lax",
    path: "/",
    maxAge: AGENT_SESSION_SECONDS,
  });
  redirect("/shops?notice=connected");
}
// The Connect button on an /agent/<token> link page.
export async function connectAgent(form: FormData) {
  await startAgentSession(String(form.get("token") || ""));
}
// Used by /agents/connect, where an agent pastes its access token into a form.
export async function connectAgentWithToken(form: FormData) {
  await startAgentSession(String(form.get("token") || "").trim());
}
const requestId = (form: FormData) => {
  const parsed = z.string().uuid().safeParse(form.get("requestId"));
  if (!parsed.success) fail("/account", "That order request was not found.");
  return parsed.data;
};
function decisionError(error: unknown): never {
  if (error instanceof PaymentError)
    fail(
      "/account",
      `${error.message} Use Check payment to reconcile the same purchase.`,
    );
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
