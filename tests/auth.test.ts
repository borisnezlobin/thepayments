import { isActiveGrant } from "@/lib/buyer/tokens";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  token: "",
  grant: null as null | { buyer_id: string; expires_at: string },
  userCalls: 0,
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (state.token ? { value: state.token } : undefined),
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("@/lib/config", () => ({
  authConfigured: () => true,
  agentLinksConfigured: () => true,
}));
vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: async () => ({
    auth: {
      getUser: async () => {
        state.userCalls++;
        return {
          data: { user: { id: "owner", email: "owner@example.com" } },
          error: null,
        };
      },
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: state.grant, error: null }),
        }),
      }),
    }),
  }),
}));
import { getPrincipal, requireOwner } from "@/lib/buyer/auth";
beforeEach(() => {
  state.token = "";
  state.grant = null;
  state.userCalls = 0;
});
describe("agent privilege boundary", () => {
  it("uses a verified account identity for owners", async () =>
    expect(await getPrincipal()).toMatchObject({
      buyerId: "owner",
      kind: "owner",
    }));
  it("cannot fall back to owner access when its token is invalid or revoked", async () => {
    state.token = "a".repeat(43);
    expect(await getPrincipal()).toBeNull();
    expect(state.userCalls).toBe(0);
  });
  it("prevents an active agent from reaching owner-only actions", async () => {
    state.token = "a".repeat(43);
    state.grant = { buyer_id: "buyer", expires_at: "2099-01-01T00:00:00Z" };
    expect(await getPrincipal()).toEqual({ buyerId: "buyer", kind: "agent" });
    await expect(requireOwner()).rejects.toThrow(
      "redirect:/shops?notice=agent",
    );
    expect(state.userCalls).toBe(0);
  });
});

it("caps agent grants at one hour even for legacy long-lived rows", () => {
  const now = Date.now();
  expect(
    isActiveGrant(
      {
        expires_at: new Date(now + 86400000).toISOString(),
        created_at: new Date(now - 3600001).toISOString(),
      },
      now,
    ),
  ).toBe(false);
});
