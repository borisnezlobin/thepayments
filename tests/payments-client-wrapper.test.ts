import { beforeEach, expect, it, vi } from "vitest";
const calls = vi.hoisted(() => ({ getWallet: vi.fn(), payX402: vi.fn() }));
vi.mock("@/lib/payments/runtime", () => ({
  paymentRuntime: () => ({
    repository: { getWallet: calls.getWallet },
    payments: { payX402: calls.payX402 },
  }),
}));
import { payX402 } from "@/lib/payments";
beforeEach(() => {
  vi.clearAllMocks();
  calls.getWallet.mockResolvedValue({ id: "wallet", walletAddress: "0x1234" });
  calls.payX402.mockResolvedValue({ order: { id: "order" } });
});
it("public payment wrapper forwards the approved total and persistent checkout key to the signer", async () => {
  const body = {
    pickupName: "Buyer",
    items: [{ productId: "product", qty: 1 }],
  };
  await payX402(
    { id: "wallet", address: "0x1234" },
    "https://our.test/api/shops/shop/orders",
    body,
    { idempotencyKey: "same-checkout", expectedTotalCents: 500 },
  );
  expect(calls.payX402).toHaveBeenCalledWith(
    { id: "wallet", walletAddress: "0x1234" },
    "https://our.test/api/shops/shop/orders",
    body,
    { idempotencyKey: "same-checkout", expectedTotalCents: 500 },
  );
});
