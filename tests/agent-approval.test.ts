import { beforeEach, describe, expect, it, vi } from "vitest";
const calls = vi.hoisted(() => ({
  approvals: [] as unknown[][],
  payments: [] as unknown[][],
}));
vi.mock("@/lib/config", () => ({ appOrigin: () => "http://localhost:3000" }));
vi.mock("@/lib/payments/buyer", () => ({
  browserCheckoutEnabled: () => true,
  validateBrowserLimit: () => undefined,
  checkoutBuyer: async (...args: unknown[]) => {
    calls.payments.push(args);
    return { id: "order-1", status: "paid" };
  },
}));
vi.mock("@/lib/buyer/approvals", () => ({
  getRequest: async () => null,
  requestApproval: async (...args: unknown[]) => {
    calls.approvals.push(args);
    return { id: "request-1", status: "pending", totalCents: 475 };
  },
}));
import { placeBuyerOrder } from "@/lib/buyer/checkout";
const order = {
  shopSlug: "test-cafe",
  items: [{ productId: "latte", qty: 1 }],
  pickupName: "Lee",
  expectedTotalCents: 475,
  idempotencyKey: "be7c4218-e4f5-4176-87c5-6cb82fcaea64",
};
beforeEach(() => {
  calls.approvals = [];
  calls.payments = [];
});
describe("owner approval", () => {
  it("holds every agent order for approval even with checkout turned on", async () => {
    const result = await placeBuyerOrder(
      { buyerId: "buyer-1", kind: "agent" },
      order,
      "mcp",
    );
    expect(result).toMatchObject({
      status: "awaiting_approval",
      request: { id: "request-1" },
    });
    expect(calls.approvals).toEqual([["buyer-1", order, "mcp"]]);
    expect(calls.payments).toEqual([]);
  });
  it("lets only the owner's own checkout reach the wallet", async () => {
    await placeBuyerOrder(
      { buyerId: "buyer-1", kind: "owner", email: "owner@example.com" },
      order,
    );
    expect(calls.payments).toHaveLength(1);
    expect(calls.approvals).toEqual([]);
  });
});
