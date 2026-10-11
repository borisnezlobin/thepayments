// Local contract fixture used ONLY by Playwright. Not an app runtime or demo adapter.
import http from "node:http";
const shop = {
  slug: "test-cafe",
  name: "Test Café",
  agentDiscountPct: 5,
  itemCount: 4,
};
const items = [
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
  {
    productId: "salad-half",
    name: "Asian Chicken Salad (Half)",
    description: "Greens, chicken and sesame dressing.",
    priceCents: 900,
    agentPriceCents: 855,
    imageUrl: null,
    category: "Salads",
    baseName: "Asian Chicken Salad",
    sizeLabel: "Half",
  },
  {
    productId: "salad-full",
    name: "Asian Chicken Salad (Full)",
    description: "Greens, chicken and sesame dressing.",
    priceCents: 1400,
    agentPriceCents: 1330,
    imageUrl: null,
    category: "Salads",
    baseName: "Asian Chicken Salad",
    sizeLabel: "Full",
  },
];
http
  .createServer((request, response) => {
    response.setHeader("Content-Type", "application/json");
    if (request.url === "/api/shops") response.end(JSON.stringify([shop]));
    else if (request.url === "/api/shops/test-cafe/menu")
      response.end(
        JSON.stringify({
          shop: { slug: shop.slug, name: shop.name, agentDiscountPct: 5 },
          items,
        }),
      );
    else {
      response.statusCode = 404;
      response.end("{}");
    }
  })
  .listen(3101, "127.0.0.1");
