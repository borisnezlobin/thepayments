import { beforeEach, describe, expect, it, vi } from "vitest";
const operations = vi.hoisted(() => ({
  getRequest: vi.fn(),
  checkoutBuyer: vi.fn(),
}));
vi.mock("@/lib/buyer/approvals", () => ({ getRequest: operations.getRequest }));
vi.mock("@/lib/payments/buyer", () => ({
  browserCheckoutEnabled: () => true,
  checkoutBuyer: operations.checkoutBuyer,
}));
vi.mock("@/lib/config", () => ({
  appOrigin: () => "https://thepayments.vercel.app",
}));
import { payApprovedRequest } from "@/lib/buyer/payment";
const request = {
  id: "request-id",
  status: "approved",
  shopSlug: "coffee",
  items: [{ productId: "product", qty: 1 }],
  pickupName: "Buyer",
  totalCents: 500,
  idempotencyKey: "purchase-key",
} as unknown as Parameters<typeof payApprovedRequest>[1];
beforeEach(() => {
  vi.clearAllMocks();
  operations.getRequest.mockResolvedValue(request);
});
describe("owner-approved payment boundary", () => {
  it.each([
    null,
    { ...request, status: "pending" },
    { ...request, status: "declined" },
  ])("does not sign an unapproved request", async (stored) => {
    operations.getRequest.mockResolvedValue(stored);
    await expect(payApprovedRequest("verified-buyer", request)).rejects.toThrow(
      "not approved",
    );
    expect(operations.checkoutBuyer).not.toHaveBeenCalled();
  });
  it("uses owner-scoped canonical approval and the original key instead of supplied amounts", async () => {
    await payApprovedRequest("verified-buyer", { ...request, totalCents: 1 });
    expect(operations.getRequest).toHaveBeenCalledWith(
      "verified-buyer",
      request.id,
    );
    expect(operations.checkoutBuyer).toHaveBeenCalledWith(
      "verified-buyer",
      {
        shopSlug: "coffee",
        items: [{ productId: "product", qty: 1 }],
        pickupName: "Buyer",
        expectedTotalCents: 500,
        idempotencyKey: "purchase-key",
      },
      "https://thepayments.vercel.app",
      { preFundedOnly: true },
    );
  });
});
