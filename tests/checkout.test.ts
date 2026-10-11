import { describe, expect, it } from "vitest";
import { checkoutSchema } from "@/lib/buyer/schemas";
import { money, quote } from "@/lib/money";
import { placeBuyerOrder } from "@/lib/buyer/checkout";
import { agentPriceCents } from "@/lib/pricing";
import { menu } from "./fixtures";
const order = {
  shopSlug: "test-cafe",
  items: [{ productId: "latte", qty: 1 }],
  pickupName: "Lee",
  expectedTotalCents: 475,
  idempotencyKey: "be7c4218-e4f5-4176-87c5-6cb82fcaea64",
};
describe("server-side quote", () => {
  it("keeps cents integer and discounts each unit", () => {
    expect(
      quote(menu, [
        { productId: "latte", qty: 2 },
        { productId: "tea", qty: 1 },
      ]),
    ).toEqual({ subtotalCents: 1350, totalCents: 1283, discountCents: 67 });
    expect(money(475)).toBe("$4.75");
  });
  it("matches the shared pricing helper", () =>
    expect(agentPriceCents(500, 5)).toBe(475));
  it.each([0, -1, 1.5, 21, NaN, Infinity])(
    "rejects invalid quantity %s",
    (qty) => expect(() => quote(menu, [{ productId: "latte", qty }])).toThrow(),
  );
  it.each(["missing", "sold-out"])(
    "rejects unavailable product %s",
    (productId) => expect(() => quote(menu, [{ productId, qty: 1 }])).toThrow(),
  );
  it("rejects duplicate lines, empty orders, and invalid merchant prices", () => {
    expect(() => quote(menu, [...order.items, ...order.items])).toThrow();
    expect(() => quote(menu, [])).toThrow();
    expect(() =>
      quote(
        { ...menu, items: [{ ...menu.items[0], agentPriceCents: 600 }] },
        order.items,
      ),
    ).toThrow();
  });
});
describe("checkout boundary", () => {
  it("accepts valid requests but rejects user-supplied buyer IDs or prices", () => {
    expect(checkoutSchema.safeParse(order).success).toBe(true);
    expect(
      checkoutSchema.safeParse({ ...order, buyerId: "someone-else" }).success,
    ).toBe(false);
    expect(
      checkoutSchema.safeParse({ ...order, expectedTotalCents: -1 }).success,
    ).toBe(false);
    expect(
      checkoutSchema.safeParse({ ...order, pickupName: "   " }).success,
    ).toBe(false);
  });
  it("never creates an order while Track B is disconnected", async () => {
    await expect(
      placeBuyerOrder(
        { buyerId: "buyer", email: "test@example.com", kind: "owner" },
        order,
      ),
    ).rejects.toMatchObject({ integration: "payments" });
    await expect(
      placeBuyerOrder({ buyerId: "buyer", kind: "agent" }, order),
    ).rejects.toMatchObject({ integration: "payments" });
  });
});
