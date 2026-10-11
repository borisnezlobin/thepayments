import { hashAgentToken } from "@/lib/buyer/tokens";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  grants: new Map<
    string,
    { buyer_id: string; expires_at: string; created_at: string }
  >(),
  set: [] as Array<{
    name: string;
    value: string;
    options: Record<string, unknown>;
  }>,
  cookie: "",
  userCalls: 0,
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (state.cookie ? { value: state.cookie } : undefined),
    set: (name: string, value: string, options: Record<string, unknown>) =>
      state.set.push({ name, value, options }),
    delete: () => undefined,
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("@/lib/config", () => ({
  appOrigin: () => "http://localhost:3000",
  authConfigured: () => true,
  agentLinksConfigured: () => true,
}));
vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: async () => ({
    auth: {
      getUser: async () => {
        state.userCalls++;
        return { data: { user: { id: "owner" } }, error: null };
      },
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: (_column: string, hash: string) => ({
          maybeSingle: async () => ({
            data: state.grants.get(hash) ?? null,
            error: null,
          }),
        }),
      }),
    }),
  }),
}));
import { connectAgentWithToken } from "@/app/actions";
import { getPrincipal, requireOwner } from "@/lib/buyer/auth";

const day = 86400000;
const valid = "V".repeat(42) + "1";
const expired = "E".repeat(42) + "2";
const revoked = "R".repeat(42) + "3";
function grant(token: string, expiresInMs: number) {
  state.grants.set(hashAgentToken(token), {
    buyer_id: "buyer-1",
    expires_at: new Date(Date.now() + expiresInMs).toISOString(),
    created_at: new Date(Date.now() - day).toISOString(),
  });
}
async function submit(token: string) {
  const form = new FormData();
  form.set("token", token);
  return connectAgentWithToken(form).then(
    () => "",
    (error: Error) => error.message,
  );
}
let logs: ReturnType<typeof vi.spyOn>[] = [];
beforeEach(() => {
  state.grants.clear();
  state.set = [];
  state.cookie = "";
  state.userCalls = 0;
  grant(valid, 30 * day);
  grant(expired, -1000);
  logs = (["log", "info", "warn", "error", "debug"] as const).map((level) =>
    vi.spyOn(console, level).mockImplementation(() => undefined),
  );
});
afterEach(() => {
  for (const tokenValue of [valid, expired, revoked])
    for (const spy of logs)
      expect(JSON.stringify(spy.mock.calls)).not.toContain(tokenValue);
  vi.restoreAllMocks();
});

describe("/agents/connect token form", () => {
  it.each([
    ["malformed", "not a token"],
    ["unknown", "U".repeat(43)],
    ["expired", expired],
    ["revoked", revoked],
    ["empty", ""],
  ])("rejects a %s token without setting a session", async (_, token) => {
    const result = await submit(token);
    expect(result).toBe("redirect:/agents/connect?error=invalid");
    expect(state.set).toEqual([]);
  });

  it("rejects a token after the owner revokes it", async () => {
    grant(revoked, 30 * day);
    state.grants.delete(hashAgentToken(revoked));
    expect(await submit(revoked)).toBe(
      "redirect:/agents/connect?error=invalid",
    );
    expect(state.set).toEqual([]);
  });

  it("starts the restricted agent session for a valid token", async () => {
    expect(await submit(`  ${valid}\n`)).toBe(
      "redirect:/shops?notice=connected",
    );
    expect(state.set).toHaveLength(1);
    const [cookie] = state.set;
    expect(cookie.name).toBe("payments-agent");
    expect(cookie.value).toBe(valid);
    expect(cookie.options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  });

  it("gives the connected agent agent access only", async () => {
    await submit(valid);
    state.cookie = state.set[0].value;
    expect(await getPrincipal()).toEqual({ buyerId: "buyer-1", kind: "agent" });
    await expect(requireOwner()).rejects.toThrow(
      "redirect:/shops?notice=agent",
    );
    expect(state.userCalls).toBe(0);
  });

  it("never puts the token in a redirect URL", async () => {
    for (const token of [valid, expired, revoked, "U".repeat(43)])
      expect(await submit(token)).not.toContain(token);
  });
});
