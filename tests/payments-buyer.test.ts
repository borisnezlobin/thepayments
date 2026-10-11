import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  address: "0x1111111111111111111111111111111111111111" as string | null,
  profileError: false,
  prior: false,
}));
const operations = vi.hoisted(() => ({
  quote: vi.fn(),
  createWallet: vi.fn(),
  getBalance: vi.fn(),
  findWallet: vi.fn(),
  getClientPayment: vi.fn(),
  fundBuyer: vi.fn(),
  payX402: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/lib/db/client", () => ({
  db: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { wallet_address: state.address },
            error: state.profileError ? { code: "missing" } : null,
          }),
        }),
      }),
    }),
    rpc: operations.rpc,
  }),
}));
vi.mock("@/lib/payments/runtime", () => ({
  paymentRuntime: () => ({
    payments: {
      quote: operations.quote,
      createWallet: operations.createWallet,
      getBalance: operations.getBalance,
    },
    repository: {
      findWallet: operations.findWallet,
      getClientPayment: operations.getClientPayment,
    },
  }),
}));
vi.mock("@/lib/payments/index", () => ({
  fundBuyer: operations.fundBuyer,
  payX402: operations.payX402,
}));
import { checkoutBuyer } from "@/lib/payments/buyer";
const input = {
  shopSlug: "demo",
  items: [{ productId: "11111111-1111-4111-8111-111111111111", qty: 1 }],
  pickupName: "Buyer",
  expectedTotalCents: 500,
  idempotencyKey: "22222222-2222-4222-8222-222222222222",
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("PAYMENTS_AUTO_FUND_BUYERS", "false");
  vi.stubEnv("PAYMENTS_BROWSER_MAX_ORDER_CENTS", "2500");
  state.address = "0x1111111111111111111111111111111111111111";
  state.profileError = false;
  state.prior = false;
  operations.quote.mockResolvedValue({ totalCents: 500 });
  operations.createWallet.mockResolvedValue({
    id: "candidate",
    walletAddress: "0x2222222222222222222222222222222222222222",
  });
  operations.findWallet.mockImplementation(async (address: string) => ({
    id: "stored-wallet",
    walletAddress: address,
  }));
  operations.getClientPayment.mockImplementation(async () =>
    state.prior ? { accepted: { amount: "5000000" } } : null,
  );
  operations.getBalance.mockResolvedValue({ units: "10000000" });
  operations.payX402.mockResolvedValue({ order: { id: "verified-order" } });
  operations.rpc.mockResolvedValue({
    data: "0x3333333333333333333333333333333333333333",
    error: null,
  });
});
describe("authenticated buyer payment boundary", () => {
  it("rejects excessive purchases before provisioning, funding or signing", async () => {
    await expect(
      checkoutBuyer(
        "buyer",
        { ...input, expectedTotalCents: 2501 },
        "https://our.test",
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(operations.quote).not.toHaveBeenCalled();
    expect(operations.createWallet).not.toHaveBeenCalled();
    expect(operations.fundBuyer).not.toHaveBeenCalled();
    expect(operations.payX402).not.toHaveBeenCalled();
  });
  it("fails closed on invalid spending configuration", async () => {
    vi.stubEnv("PAYMENTS_BROWSER_MAX_ORDER_CENTS", "10001");
    await expect(
      checkoutBuyer("buyer", input, "https://our.test"),
    ).rejects.toMatchObject({ status: 503 });
    expect(operations.payX402).not.toHaveBeenCalled();
  });
  it("agent sessions cannot create or treasury-fund wallets", async () => {
    vi.stubEnv("PAYMENTS_AUTO_FUND_BUYERS", "true");
    await checkoutBuyer("buyer", input, "https://our.test", {
      preFundedOnly: true,
    });
    expect(operations.fundBuyer).not.toHaveBeenCalled();
    state.address = null;
    await expect(
      checkoutBuyer("buyer", input, "https://our.test", {
        preFundedOnly: true,
      }),
    ).rejects.toMatchObject({ status: 402 });
    expect(operations.createWallet).not.toHaveBeenCalled();
  });
  it("rejects a changed displayed price before wallet creation, funding or payment", async () => {
    await expect(
      checkoutBuyer(
        "buyer",
        { ...input, expectedTotalCents: 1 },
        "https://our.test",
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(operations.createWallet).not.toHaveBeenCalled();
    expect(operations.fundBuyer).not.toHaveBeenCalled();
    expect(operations.payX402).not.toHaveBeenCalled();
  });
  it("rejects a missing buyer profile", async () => {
    state.profileError = true;
    await expect(
      checkoutBuyer("buyer", input, "https://our.test"),
    ).rejects.toMatchObject({ status: 403 });
    expect(operations.payX402).not.toHaveBeenCalled();
  });
  it("uses authenticated buyer identity, trusted origin and original checkout key", async () => {
    await checkoutBuyer("verified-auth-id", input, "https://our.test");
    expect(operations.payX402).toHaveBeenCalledWith(
      { id: "stored-wallet", address: state.address },
      "https://our.test/api/shops/demo/orders",
      { buyerId: "verified-auth-id", pickupName: "Buyer", items: input.items },
      { idempotencyKey: input.idempotencyKey },
    );
  });
  it("uses the wallet selected by the atomic database RPC, not an unused concurrent candidate", async () => {
    state.address = null;
    await checkoutBuyer("buyer", input, "https://our.test");
    expect(operations.rpc).toHaveBeenCalledWith("track_b_assign_buyer_wallet", {
      p_buyer: "buyer",
      p_wallet: "candidate",
    });
    expect(operations.payX402.mock.calls[0][0].address).toBe(
      "0x3333333333333333333333333333333333333333",
    );
  });
  it("does not pay when the real wallet lacks funds", async () => {
    operations.getBalance.mockResolvedValue({ units: "4999999" });
    await expect(
      checkoutBuyer("buyer", input, "https://our.test"),
    ).rejects.toMatchObject({ status: 402 });
    expect(operations.payX402).not.toHaveBeenCalled();
  });
  it("recovers a persisted checkout even after menu removal or wallet debit", async () => {
    state.prior = true;
    operations.quote.mockRejectedValue(new Error("Product removed"));
    operations.getBalance.mockResolvedValue({ units: "0" });
    expect(await checkoutBuyer("buyer", input, "https://our.test")).toEqual({
      id: "verified-order",
    });
    expect(operations.quote).not.toHaveBeenCalled();
    expect(operations.getBalance).not.toHaveBeenCalled();
  });
  it("rejects changing the amount of a persisted checkout", async () => {
    state.prior = true;
    await expect(
      checkoutBuyer(
        "buyer",
        { ...input, expectedTotalCents: 501 },
        "https://our.test",
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(operations.payX402).not.toHaveBeenCalled();
  });
  it("funds only when explicitly enabled, with a stable per-buyer funding key", async () => {
    vi.stubEnv("PAYMENTS_AUTO_FUND_BUYERS", "true");
    await checkoutBuyer("buyer", input, "https://our.test");
    expect(operations.fundBuyer).toHaveBeenCalledWith(
      { id: "stored-wallet", address: state.address },
      1000,
      "initial-buyer-funding-buyer",
    );
  });
});
