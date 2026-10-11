import { describe, expect, it } from "vitest";
import { menuSchema } from "@/lib/buyer/schemas";
import { groupDishes } from "@/components/buyer/storefront";
import { menu } from "./fixtures";
const half = {
  ...menu.items[0],
  productId: "salad-half",
  name: "Salad (Half)",
  baseName: "Salad",
  sizeLabel: "Half",
};
const full = {
  ...half,
  productId: "salad-full",
  name: "Salad (Full)",
  sizeLabel: "Full",
};
describe("menu sizes", () => {
  it("keeps baseName and sizeLabel so agents can choose a size", () => {
    const parsed = menuSchema.parse({ ...menu, items: [half, full] });
    expect(parsed.items[1]).toMatchObject({
      baseName: "Salad",
      sizeLabel: "Full",
    });
  });
  it("still accepts single-price items without size fields", () =>
    expect(menuSchema.safeParse(menu).success).toBe(true));
  it("groups sizes of one dish in menu order", () => {
    const groups = groupDishes([half, menu.items[0], full, menu.items[1]]);
    expect(groups.map((g) => [g.name, g.items.length])).toEqual([
      ["Salad", 2],
      ["Oat latte", 1],
      ["Green tea", 1],
    ]);
  });
});
