import { beforeEach, expect, it, vi } from "vitest";
const operations = vi.hoisted(() => ({
  owner: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
  publish: vi.fn(),
  list: vi.fn(),
}));
vi.mock("@/lib/shops/auth", () => ({ requireShopOwner: operations.owner }));
vi.mock("@/lib/shops/repository", () => ({
  saveProductEdits: operations.save,
  updateShopDetails: operations.update,
  publishShop: operations.publish,
  listProducts: operations.list,
}));
import { PATCH } from "@/app/api/shops/[slug]/route";
const shop = { id: "existing-shop", slug: "mind-coffee", status: "draft" };
const products = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Japanese Soba Cha",
    description: "a".repeat(526),
    priceCents: 500,
    available: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Organic Ceremonial Matcha",
    description: "b".repeat(649),
    priceCents: 600,
    available: true,
  },
];
beforeEach(() => {
  vi.clearAllMocks();
  operations.owner.mockResolvedValue(shop);
  operations.update.mockResolvedValue(shop);
  operations.publish.mockResolvedValue({ ...shop, status: "live" });
  operations.list.mockResolvedValue(products);
});
function request(publish: boolean, edits = products) {
  return PATCH(
    new Request("https://thepayments.vercel.app/api/shops/mind-coffee", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Mind Coffee", products: edits, publish }),
    }),
    { params: Promise.resolve({ slug: "mind-coffee" }) },
  );
}
it.each([false, true])(
  "preserves imported descriptions when publish=%s",
  async (publish) => {
    const response = await request(publish);
    expect(response.status).toBe(200);
    expect(operations.save).toHaveBeenCalledWith(shop.id, products);
    expect(operations.publish).toHaveBeenCalledTimes(publish ? 1 : 0);
  },
);
it("still rejects invalid prices before changing or publishing a shop", async () => {
  const response = await request(true, [{ ...products[0], priceCents: -1 }]);
  expect(response.status).toBe(400);
  expect(operations.save).not.toHaveBeenCalled();
  expect(operations.publish).not.toHaveBeenCalled();
});
it("publishes working items while retaining unpriced and unnamed-size items as hidden", async () => {
  const unpriced = { ...products[1], priceCents: 0 };
  const unsized = {
    ...products[1],
    id: "33333333-3333-4333-8333-333333333333",
    baseName: "Matcha",
    sizeLabel: null,
  };
  operations.list.mockResolvedValue([products[0], unpriced, unsized]);
  const response = await request(true, [products[0], unpriced, unsized]);
  expect(response.status).toBe(200);
  expect(operations.save).toHaveBeenCalledWith(shop.id, [
    products[0],
    { ...unpriced, available: false },
    { ...unsized, available: false },
  ]);
  expect(operations.publish).toHaveBeenCalledTimes(1);
});
it("keeps a draft unpublished when no item is ready, without writing changes", async () => {
  const unpriced = { ...products[0], priceCents: 0 };
  operations.list.mockResolvedValue([unpriced]);
  expect((await request(true, [unpriced])).status).toBe(400);
  expect(operations.save).not.toHaveBeenCalled();
  expect(operations.publish).not.toHaveBeenCalled();
});
