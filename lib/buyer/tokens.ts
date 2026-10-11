import { createHash, randomBytes } from "node:crypto";
export const AGENT_COOKIE = "payments-agent";
export const AGENT_LINK_SECONDS = 30 * 24 * 60 * 60;
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
  grant: { expires_at: string } | null,
  now = Date.now(),
) {
  return Boolean(grant && Date.parse(grant.expires_at) > now);
}
export function safeNext(value: string | null | undefined) {
  return value && /^\/(?!\/)/.test(value) && !/[\\\r\n]/.test(value)
    ? value
    : "/account";
}
