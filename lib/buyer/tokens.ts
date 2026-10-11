import { createHash, randomBytes } from "node:crypto";
export const AGENT_COOKIE = "payments-agent";
export const AGENT_LINK_SECONDS = 60 * 60 * 24 * 30;
export function newAgentToken() {
  return randomBytes(32).toString("base64url");
}
export function validAgentToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
export function hashAgentToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function isActiveGrant(
  grant: { expires_at: string; created_at?: string } | null,
  now = Date.now(),
) {
  return Boolean(
    grant &&
    Date.parse(grant.expires_at) > now &&
    (!grant.created_at ||
      Date.parse(grant.created_at) + AGENT_LINK_SECONDS * 1000 > now),
  );
}
export function safeNext(value: string | null | undefined) {
  return value && /^\/(?!\/)/.test(value) && !/[\\\r\n]/.test(value)
    ? value
    : "/account";
}
