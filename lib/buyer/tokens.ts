import { createHash, randomBytes } from "node:crypto";
export const AGENT_COOKIE = "payments-agent";
// The owner hands an agent a connection token. It works once, within 15 minutes.
export const AGENT_CONNECT_SECONDS = 15 * 60;
// Redeeming it starts a session that lasts 90 days unless the owner ends it.
export const AGENT_SESSION_SECONDS = 60 * 60 * 24 * 90;
export function newAgentToken() {
  return randomBytes(32).toString("base64url");
}
export function validAgentToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
export function hashAgentToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
// maxSeconds caps rows by age too, so a row written with a longer expiry
// (such as a 30-day link from before sessions existed) can't outlive the rule.
export function isActiveGrant(
  grant: { expires_at: string; created_at?: string } | null,
  now = Date.now(),
  maxSeconds = AGENT_SESSION_SECONDS,
) {
  return Boolean(
    grant &&
    Date.parse(grant.expires_at) > now &&
    (!grant.created_at ||
      Date.parse(grant.created_at) + maxSeconds * 1000 > now),
  );
}
export function safeNext(value: string | null | undefined) {
  return value && /^\/(?!\/)/.test(value) && !/[\\\r\n]/.test(value)
    ? value
    : "/account";
}
