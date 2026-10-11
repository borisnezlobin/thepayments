import type { ShopMenu, ShopSummary } from "@/lib/contract";
// Test fixtures only. Never imported by app/, components/, or lib/.
export const shop: ShopSummary = {
  slug: "test-cafe",
  name: "Test Café",
  agentDiscountPct: 5,
  itemCount: 2,
};
export const menu: ShopMenu = {
  shop: { slug: shop.slug, name: shop.name, agentDiscountPct: 5 },
  items: [
    {
      productId: "latte",
      name: "Oat latte",
      description: "Espresso and oat milk.",
      priceCents: 500,
      agentPriceCents: 475,
      imageUrl: null,
      category: "Drinks",
    },
    {
      productId: "tea",
      name: "Green tea",
      description: null,
      priceCents: 350,
      agentPriceCents: 333,
      imageUrl: null,
      category: null,
    },
  ],
};
