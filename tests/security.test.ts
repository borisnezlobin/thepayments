import { describe, expect, it } from "vitest";
import {
  hashAgentToken,
  isActiveGrant,
  newAgentToken,
  safeNext,
  validAgentToken,
} from "@/lib/buyer/tokens";
describe("agent capabilities", () => {
  it("creates unpredictable 256-bit URL-safe credentials and stores only hashes", () => {
    const tokens = Array.from({ length: 100 }, newAgentToken);
    expect(new Set(tokens).size).toBe(100);
    tokens.forEach((token) => {
      expect(validAgentToken(token)).toBe(true);
      expect(hashAgentToken(token)).toMatch(/^[a-f0-9]{64}$/);
      expect(hashAgentToken(token)).not.toBe(token);
    });
    expect(validAgentToken("../invalid")).toBe(false);
  });
  it("fails closed for expired, revoked, and malformed grants", () => {
    expect(isActiveGrant(null)).toBe(false);
    expect(isActiveGrant({ expires_at: "invalid" })).toBe(false);
    expect(
      isActiveGrant(
        { expires_at: "2026-01-01T00:00:00Z" },
        Date.parse("2026-01-01T00:00:00Z"),
      ),
    ).toBe(false);
    expect(
      isActiveGrant(
        { expires_at: "2026-01-02T00:00:00Z" },
        Date.parse("2026-01-01T00:00:00Z"),
      ),
    ).toBe(true);
  });
  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\r\nevil",
  ])("rejects an unsafe redirect %s", (value) =>
    expect(safeNext(value)).toBe("/account"),
  );
  it("allows a local checkout destination", () =>
    expect(safeNext("/s/test-cafe")).toBe("/s/test-cafe"));
});
