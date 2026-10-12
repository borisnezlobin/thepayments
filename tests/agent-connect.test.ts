import {
  AGENT_CONNECT_SECONDS,
  AGENT_COOKIE,
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
  // The cookies of whichever browser the test is acting in.
  jar: new Map<string, string>(),
  set: [] as Array<{
    name: string;
    value: string;
    options: Record<string, unknown>;
  }>,
  deleted: [] as string[],
  redeems: [] as Array<Record<string, unknown>>,
  userCalls: 0,
}));
// A small in-memory stand-in for the Supabase query builder calls the agent
// auth code makes: select or delete with an eq filter, and upsert.
const fakeDb = vi.hoisted(() => (table: string) => {
  const filters: Array<(row: Row) => boolean> = [];
  let removing = false;
  const run = () => {
    const rows = state.tables[table].filter((row) =>
      filters.every((match) => match(row)),
    );
    if (removing) {
      state.deleted.push(table);
      state.tables[table] = state.tables[table].filter(
        (row) => !rows.includes(row),
      );
    }
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
// Does what track_c_redeem_agent_token does in the database. The real function
// is tested on PostgreSQL in agent-sessions-db.test.ts.
const fakeRpc = vi.hoisted(
  () => (name: string, args: Record<string, unknown>) => ({
    maybeSingle: async () => {
      if (name !== "track_c_redeem_agent_token")
        return { data: null, error: { message: "unknown function" } };
      state.redeems.push(args);
      const now = Date.now();
      const links = state.tables.track_c_agent_links;
      const index = links.findIndex(
        (row) =>
          row.token_hash === args.p_token_hash &&
          Date.parse(row.expires_at) > now &&
          Date.parse(row.created_at) >
            now - Number(args.p_connect_seconds) * 1000 &&
          (args.p_current_buyer == null ||
            row.buyer_id === args.p_current_buyer),
      );
      if (index < 0) return { data: null, error: null };
      const [redeemed] = links.splice(index, 1);
      const expires = new Date(
        now + Number(args.p_session_seconds) * 1000,
      ).toISOString();
      state.tables.track_c_agent_sessions = [
        ...state.tables.track_c_agent_sessions.filter(
          (row) => row.buyer_id !== redeemed.buyer_id,
        ),
        {
          buyer_id: redeemed.buyer_id,
          session_hash: String(args.p_session_hash),
          expires_at: expires,
          created_at: new Date(now).toISOString(),
        },
      ];
      return {
        data: {
          session_buyer_id: redeemed.buyer_id,
          session_expires_at: expires,
        },
        error: null,
      };
    },
  }),
);
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      state.jar.has(name) ? { value: state.jar.get(name) } : undefined,
    set: (name: string, value: string, options: Record<string, unknown>) => {
      state.jar.set(name, value);
      state.set.push({ name, value, options });
    },
    delete: (cookie: string | { name: string }) =>
      state.jar.delete(typeof cookie === "string" ? cookie : cookie.name),
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
      signOut: async () => ({ error: null }),
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({ from: fakeDb, rpc: fakeRpc }),
}));
import {
  approveOrderRequest,
  connectAgentWithToken,
  createAgentLink,
  declineOrderRequest,
  revokeAgentLink,
  signOut,
} from "@/app/actions";
import { POST as exchange } from "@/app/api/buyer/agent-session/route";
import { getPrincipal, requireOwner } from "@/lib/buyer/auth";

const minute = 60000;
const invalid = "redirect:/agents/connect?error=invalid";
const agent = { buyerId: "buyer-1", kind: "agent" };
const valid = "V".repeat(42) + "1";
const expired = "E".repeat(42) + "2";
const legacy = "L".repeat(42) + "3";
const revoked = "R".repeat(42) + "4";
const second = "S".repeat(42) + "5";
const planted = "P".repeat(42) + "6";
function link(
  token: string,
  createdAgoMs: number,
  expiresInMs: number,
  buyerId = "buyer-1",
) {
  state.tables.track_c_agent_links.push({
    buyer_id: buyerId,
    token_hash: hashAgentToken(token),
    created_at: new Date(Date.now() - createdAgoMs).toISOString(),
    expires_at: new Date(Date.now() + expiresInMs).toISOString(),
  });
}
// Switches to another browser: the owner's (no agent cookie) or an agent's.
function useBrowser(agentSession?: string) {
  state.jar.clear();
  if (agentSession) state.jar.set(AGENT_COOKIE, agentSession);
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
  return { result, cookie: state.jar.get(AGENT_COOKIE) ?? "" };
}
const linkHashes = () =>
  state.tables.track_c_agent_links.map((row) => row.token_hash);
let logs: ReturnType<typeof vi.spyOn>[] = [];
beforeEach(() => {
  state.tables.track_c_agent_links = [];
  state.tables.track_c_agent_sessions = [];
  state.jar.clear();
  state.set = [];
  state.deleted = [];
  state.redeems = [];
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
    for (const token of [valid, expired, legacy, revoked, second, planted])
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
    expect(await connect(token)).toEqual({ result: invalid, cookie: "" });
    expect(state.tables.track_c_agent_sessions).toEqual([]);
  });

  it("starts a separate 90-day session and uses up the token", async () => {
    const { result, cookie } = await connect(`  ${valid}\n`);
    expect(result).toBe("redirect:/shops?notice=connected");
    expect(validAgentToken(cookie)).toBe(true);
    expect(cookie).not.toBe(valid);
    expect(state.set).toEqual([
      {
        name: AGENT_COOKIE,
        value: cookie,
        options: expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: AGENT_SESSION_SECONDS,
        }),
      },
    ]);
    expect(state.redeems).toEqual([
      {
        p_token_hash: hashAgentToken(valid),
        p_session_hash: hashAgentToken(cookie),
        p_connect_seconds: AGENT_CONNECT_SECONDS,
        p_session_seconds: AGENT_SESSION_SECONDS,
        p_current_buyer: null,
      },
    ]);
    expect(linkHashes()).not.toContain(hashAgentToken(valid));
    expect(state.tables.track_c_agent_sessions).toEqual([
      expect.objectContaining({
        buyer_id: "buyer-1",
        session_hash: hashAgentToken(cookie),
      }),
    ]);
  });

  it("works only once, even from another browser", async () => {
    await connect(valid);
    useBrowser();
    expect(await connect(valid)).toEqual({ result: invalid, cookie: "" });
    expect(state.set).toHaveLength(1);
  });

  it("never puts a token in a redirect URL", async () => {
    for (const token of [valid, expired, legacy, revoked]) {
      const { result } = await connect(token);
      expect(result).not.toContain(token);
    }
  });

  it("can't move a connected agent to another account", async () => {
    const session = (await connect(valid)).cookie;
    link(planted, 0, 14 * minute, "buyer-2");
    expect(await connect(planted)).toEqual({
      result: invalid,
      cookie: session,
    });
    expect(state.redeems.at(-1)).toMatchObject({ p_current_buyer: "buyer-1" });
    expect(linkHashes()).toContain(hashAgentToken(planted));
    expect(state.tables.track_c_agent_sessions).toEqual([
      expect.objectContaining({
        buyer_id: "buyer-1",
        session_hash: hashAgentToken(session),
      }),
    ]);
    expect(await getPrincipal()).toEqual(agent);
  });
});

describe("agent sessions", () => {
  it("let a connected agent come back with only its cookie", async () => {
    useBrowser((await connect(valid)).cookie);
    expect(await getPrincipal()).toEqual(agent);
    expect(await getPrincipal()).toEqual(agent);
  });

  it("never reach owner pages or owner actions", async () => {
    await connect(valid);
    await expect(requireOwner()).rejects.toThrow(
      "redirect:/shops?notice=agent",
    );
    const request = new FormData();
    request.set("requestId", "be7c4218-e4f5-4176-87c5-6cb82fcaea64");
    for (const action of [
      () => approveOrderRequest(request),
      () => declineOrderRequest(request),
      createAgentLink,
      revokeAgentLink,
    ])
      expect(await outcome(action())).toBe("redirect:/shops?notice=agent");
    expect(state.userCalls).toBe(0);
    expect(state.tables.track_c_agent_sessions).toHaveLength(1);
  });

  it("can't be started by sending a connection token as the cookie", async () => {
    useBrowser(valid);
    expect(await getPrincipal()).toBeNull();
    expect(state.userCalls).toBe(0);
  });

  it("stop working when they expire", async () => {
    await connect(valid);
    state.tables.track_c_agent_sessions[0].expires_at = new Date(
      Date.now() - 1000,
    ).toISOString();
    expect(await getPrincipal()).toBeNull();
    expect(state.userCalls).toBe(0);
  });

  it("stop working as soon as the owner disconnects", async () => {
    const session = (await connect(valid)).cookie;
    link(revoked, 0, 14 * minute);
    useBrowser();
    expect(await outcome(revokeAgentLink())).toBe(
      "redirect:/account?notice=revoked#agent-link",
    );
    // The unused token goes first, so a redemption at the same moment can't
    // leave a session behind.
    expect(state.deleted).toEqual([
      "track_c_agent_links",
      "track_c_agent_sessions",
    ]);
    expect(state.tables.track_c_agent_sessions).toEqual([]);
    expect(await connect(revoked)).toEqual({ result: invalid, cookie: "" });
    useBrowser(session);
    expect(await getPrincipal()).toBeNull();
  });

  it("are replaced when the agent connects again", async () => {
    const first = (await connect(valid)).cookie;
    link(second, 0, 14 * minute);
    const next = (await connect(second)).cookie;
    expect(next).not.toBe(first);
    expect(state.redeems.at(-1)).toMatchObject({ p_current_buyer: "buyer-1" });
    useBrowser(first);
    expect(await getPrincipal()).toBeNull();
    useBrowser(next);
    expect(await getPrincipal()).toEqual(agent);
  });

  it("end for good when the agent signs out", async () => {
    const session = (await connect(valid)).cookie;
    expect(await outcome(signOut())).toBe("redirect:/shops");
    expect(state.jar.has(AGENT_COOKIE)).toBe(false);
    expect(state.tables.track_c_agent_sessions).toEqual([]);
    useBrowser(session);
    expect(await getPrincipal()).toBeNull();
  });

  it("survive the owner signing out of their own browser", async () => {
    const session = (await connect(valid)).cookie;
    useBrowser();
    expect(await outcome(signOut())).toBe("redirect:/shops");
    useBrowser(session);
    expect(await getPrincipal()).toEqual(agent);
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
    useBrowser(sessionToken);
    expect(await getPrincipal()).toEqual(agent);
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
