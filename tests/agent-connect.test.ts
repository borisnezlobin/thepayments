import {
  AGENT_SESSION_SECONDS,
  hashAgentToken,
  validAgentToken,
} from "@/lib/buyer/tokens";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
type Row = Record<string, string>;
const state = vi.hoisted(() => ({
  tables: {
    track_c_agent_links: [] as Row[],
    track_c_agent_sessions: [] as Row[],
  } as Record<string, Row[]>,
  set: [] as Array<{
    name: string;
    value: string;
    options: Record<string, unknown>;
  }>,
  cookie: "",
  userCalls: 0,
}));
// A small in-memory stand-in for the Supabase query builder calls the agent
// auth code makes: select or delete with eq/gt filters, and upsert.
const fakeDb = vi.hoisted(() => (table: string) => {
  const filters: Array<(row: Row) => boolean> = [];
  let removing = false;
  const run = () => {
    const rows = state.tables[table].filter((row) =>
      filters.every((match) => match(row)),
    );
    if (removing)
      state.tables[table] = state.tables[table].filter(
        (row) => !rows.includes(row),
      );
    return rows;
  };
  const builder = {
    select: () => builder,
    delete: () => {
      removing = true;
      return builder;
    },
    eq: (column: string, value: string) => {
      filters.push((row) => row[column] === value);
      return builder;
    },
    gt: (column: string, value: string) => {
      filters.push((row) => Date.parse(row[column]) > Date.parse(value));
      return builder;
    },
    maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
    then: (resolve: (value: unknown) => void) =>
      resolve({ data: run(), error: null }),
    upsert: async (row: Row, { onConflict }: { onConflict: string }) => {
      state.tables[table] = [
        ...state.tables[table].filter(
          (existing) => existing[onConflict] !== row[onConflict],
        ),
        row,
      ];
      return { error: null };
    },
  };
  return builder;
});
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
    from: fakeDb,
    auth: {
      getUser: async () => {
        state.userCalls++;
        return { data: { user: { id: "buyer-1" } }, error: null };
      },
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({ from: fakeDb }),
}));
import {
  approveOrderRequest,
  connectAgent,
  connectAgentWithToken,
  revokeAgentLink,
} from "@/app/actions";
import { POST as exchange } from "@/app/api/buyer/agent-session/route";
import {
  connectionTokenUsable,
  getPrincipal,
  requireOwner,
} from "@/lib/buyer/auth";

const minute = 60000;
const valid = "V".repeat(42) + "1";
const expired = "E".repeat(42) + "2";
const legacy = "L".repeat(42) + "3";
const revoked = "R".repeat(42) + "4";
function link(token: string, createdAgoMs: number, expiresInMs: number) {
  state.tables.track_c_agent_links.push({
    buyer_id: "buyer-1",
    token_hash: hashAgentToken(token),
    created_at: new Date(Date.now() - createdAgoMs).toISOString(),
    expires_at: new Date(Date.now() + expiresInMs).toISOString(),
  });
}
const form = (token: string) => {
  const data = new FormData();
  data.set("token", token);
  return data;
};
const outcome = (action: Promise<unknown>) =>
  action.then(
    () => "",
    (error: Error) => error.message,
  );
async function connect(token: string) {
  const result = await outcome(connectAgentWithToken(form(token)));
  return { result, cookie: state.set.at(-1)?.value ?? "" };
}
let logs: ReturnType<typeof vi.spyOn>[] = [];
beforeEach(() => {
  state.tables.track_c_agent_links = [];
  state.tables.track_c_agent_sessions = [];
  state.set = [];
  state.cookie = "";
  state.userCalls = 0;
  link(valid, minute, 14 * minute);
  link(expired, 20 * minute, -minute);
  // A 30-day link made before connection tokens became short-lived.
  link(legacy, 20 * minute, 30 * 24 * 60 * minute);
  logs = (["log", "info", "warn", "error", "debug"] as const).map((level) =>
    vi.spyOn(console, level).mockImplementation(() => undefined),
  );
});
afterEach(() => {
  for (const spy of logs) {
    const logged = JSON.stringify(spy.mock.calls);
    for (const token of [valid, expired, legacy, revoked])
      expect(logged).not.toContain(token);
    for (const { value } of state.set) expect(logged).not.toContain(value);
  }
  vi.restoreAllMocks();
});

describe("connection tokens", () => {
  it.each([
    ["malformed", "not a token"],
    ["unknown", "U".repeat(43)],
    ["expired", expired],
    ["older than 15 minutes", legacy],
    ["revoked", revoked],
    ["empty", ""],
  ])("rejects a %s token without starting a session", async (_, token) => {
    expect(await connect(token)).toEqual({
      result: "redirect:/agents/connect?error=invalid",
      cookie: "",
    });
    expect(state.tables.track_c_agent_sessions).toEqual([]);
  });

  it("starts a separate 90-day session and uses up the token", async () => {
    const { result, cookie } = await connect(`  ${valid}\n`);
    expect(result).toBe("redirect:/shops?notice=connected");
    expect(validAgentToken(cookie)).toBe(true);
    expect(cookie).not.toBe(valid);
    expect(state.set[0]).toMatchObject({
      name: "payments-agent",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: AGENT_SESSION_SECONDS,
      },
    });
    expect(
      state.tables.track_c_agent_links.map((row) => row.token_hash),
    ).not.toContain(hashAgentToken(valid));
    expect(state.tables.track_c_agent_sessions).toEqual([
      expect.objectContaining({
        buyer_id: "buyer-1",
        session_hash: hashAgentToken(cookie),
      }),
    ]);
  });

  it("works only once", async () => {
    await connect(valid);
    expect(await connect(valid)).toMatchObject({
      result: "redirect:/agents/connect?error=invalid",
    });
    expect(state.set).toHaveLength(1);
  });

  it("is used up by the link page button too, and a page view does not use it", async () => {
    expect(await connectionTokenUsable(valid)).toBe(true);
    expect(await connectionTokenUsable(valid)).toBe(true);
    expect(await outcome(connectAgent(form(valid)))).toBe(
      "redirect:/shops?notice=connected",
    );
    expect(await connectionTokenUsable(valid)).toBe(false);
    expect(await outcome(connectAgent(form(valid)))).toBe(
      "redirect:/agents/connect?error=invalid",
    );
  });

  it("never puts a token in a redirect URL", async () => {
    for (const token of [valid, expired, legacy, revoked]) {
      const { result } = await connect(token);
      expect(result).not.toContain(token);
    }
  });
});

describe("agent sessions", () => {
  it("let a connected agent come back with only its cookie", async () => {
    state.cookie = (await connect(valid)).cookie;
    expect(await getPrincipal()).toEqual({ buyerId: "buyer-1", kind: "agent" });
    expect(await getPrincipal()).toEqual({ buyerId: "buyer-1", kind: "agent" });
  });

  it("never reach owner pages or owner actions", async () => {
    state.cookie = (await connect(valid)).cookie;
    await expect(requireOwner()).rejects.toThrow(
      "redirect:/shops?notice=agent",
    );
    const approval = new FormData();
    approval.set("requestId", "be7c4218-e4f5-4176-87c5-6cb82fcaea64");
    expect(await outcome(approveOrderRequest(approval))).toBe(
      "redirect:/shops?notice=agent",
    );
    expect(await outcome(revokeAgentLink())).toBe(
      "redirect:/shops?notice=agent",
    );
    expect(state.userCalls).toBe(0);
  });

  it("can't be started by sending a connection token as the cookie", async () => {
    state.cookie = valid;
    expect(await getPrincipal()).toBeNull();
    expect(state.userCalls).toBe(0);
  });

  it("stop working when they expire", async () => {
    state.cookie = (await connect(valid)).cookie;
    state.tables.track_c_agent_sessions[0].expires_at = new Date(
      Date.now() - 1000,
    ).toISOString();
    expect(await getPrincipal()).toBeNull();
    expect(state.userCalls).toBe(0);
  });

  it("stop working as soon as the owner disconnects", async () => {
    const session = (await connect(valid)).cookie;
    link(revoked, 0, 14 * minute);
    expect(await outcome(revokeAgentLink())).toBe(
      "redirect:/account?notice=revoked#agent-link",
    );
    expect(state.tables.track_c_agent_sessions).toEqual([]);
    expect(await connectionTokenUsable(revoked)).toBe(false);
    state.cookie = session;
    expect(await getPrincipal()).toBeNull();
  });

  it("are replaced when the agent connects again", async () => {
    const first = (await connect(valid)).cookie;
    const second = "S".repeat(42) + "5";
    link(second, 0, 14 * minute);
    const next = (await connect(second)).cookie;
    state.cookie = first;
    expect(await getPrincipal()).toBeNull();
    state.cookie = next;
    expect(await getPrincipal()).toEqual({ buyerId: "buyer-1", kind: "agent" });
  });
});

describe("session exchange for MCP clients", () => {
  const post = (body: string) =>
    exchange(
      new Request("http://localhost:3000/api/buyer/agent-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      }),
    );

  it("returns a session token once for a valid connection token", async () => {
    const response = await post(JSON.stringify({ token: valid }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const { sessionToken } = (await response.json()) as {
      sessionToken: string;
    };
    expect(sessionToken).not.toBe(valid);
    state.cookie = sessionToken;
    expect(await getPrincipal()).toEqual({ buyerId: "buyer-1", kind: "agent" });
    expect((await post(JSON.stringify({ token: valid }))).status).toBe(401);
  });

  it.each([
    ["expired", JSON.stringify({ token: expired }), 401],
    ["missing", JSON.stringify({}), 401],
    ["unreadable", "{", 400],
  ])("rejects a %s token", async (_, body, status) => {
    const response = await post(body);
    expect(response.status).toBe(status);
    expect(await response.text()).not.toContain(expired);
    expect(state.tables.track_c_agent_sessions).toEqual([]);
  });
});
