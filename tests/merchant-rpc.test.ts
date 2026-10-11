import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/payments", () => ({
  getBalance: async () => {
    throw new Error("RPC offline");
  },
}));
vi.mock("@/lib/shops/repository", () => ({
  findShopByToken: vi.fn(),
  listProducts: vi.fn(),
  listInboxOrders: async () => [
    {
      id: "confirmed-order",
      status: "paid",
      totalCents: 500,
      subtotalCents: 500,
      discountCents: 0,
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ],
  listWithdrawals: async () => [],
}));
import { loadInbox } from "@/lib/shops/dashboard";
describe("merchant inbox RPC isolation", () => {
  it("keeps paid orders available without inventing a zero balance", async () => {
    const inbox = await loadInbox("merchant");
    expect(inbox.orders[0].id).toBe("confirmed-order");
    expect(inbox.balanceCents).toBeNull();
    expect(inbox.summary.orderCount).toBe(1);
  });
});
