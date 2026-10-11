import { z } from "zod";

export const extractedMenuSchema = z.object({
  shopName: z.string().describe("The business's name as shown on the page"),
  items: z
    .array(
      z.object({
        name: z.string().describe("Item name exactly as listed"),
        description: z.string().nullable().describe("Short description from the page, or null"),
        price: z.number().nullable().describe("Price in US dollars as a number, such as 4.75. When the page shows a range like \"$11.90 - $13.95\", use the lowest number. Null only when the page shows no price at all"),
        maxPrice: z.number().nullable().describe("The highest price when the page shows a price range for this item, otherwise null"),
        category: z.string().nullable().describe("The menu section the item sits in, such as Coffee or Pastries, or null"),
        imageUrl: z.string().nullable().describe("Absolute URL of the item's photo, or null"),
      }),
    )
    .describe("Every item the business sells on this page"),
});

export type ExtractedMenu = z.infer<typeof extractedMenuSchema>;

export const extractionInstructions =
  "Extract every menu item or product this business sells, with its price exactly as listed. Use only facts stated on the page. Never invent prices.";

export interface DraftProduct {
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  category: string | null;
  available: boolean;
}

export interface ParsedMenu {
  shopName: string;
  products: DraftProduct[];
  warnings: string[];
}

function toCents(price: number | null) {
  if (price === null || !Number.isFinite(price) || price < 0) return null;
  return Math.round(price * 100);
}

function absoluteHttpUrl(value: string | null, base: string) {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function cleanText(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function parseExtractedMenu(menu: ExtractedMenu, sourceUrl: string, fallbackName: string): ParsedMenu {
  const seen = new Set<string>();
  const products: DraftProduct[] = [];
  let missingPrices = 0;
  let sizedItems = 0;
  for (const item of menu.items) {
    const name = cleanText(item.name);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const priceCents = toCents(item.price);
    if (priceCents === null) missingPrices += 1;
    const sized = hasSizes(item.price, item.maxPrice);
    if (sized) sizedItems += 1;
    products.push({
      name: sized ? `${name} (smallest size)` : name,
      description: cleanText(item.description),
      priceCents: priceCents ?? 0,
      imageUrl: absoluteHttpUrl(item.imageUrl, sourceUrl),
      category: cleanText(item.category),
      available: priceCents !== null,
    });
  }
  return { shopName: cleanText(menu.shopName) ?? fallbackName, products, warnings: menuWarnings(products.length, missingPrices, sizedItems) };
}

function hasSizes(price: number | null, maxPrice: number | null) {
  return price !== null && maxPrice !== null && maxPrice > price;
}

function menuWarnings(itemCount: number, missingPrices: number, sizedItems: number) {
  const warnings: string[] = [];
  if (itemCount === 0) warnings.push("We couldn't find any menu items on that page. Try the link to your menu page itself.");
  if (missingPrices === 1) warnings.push("One item had no price on your site. It's hidden until you add a price.");
  if (missingPrices > 1) warnings.push(`${missingPrices} items had no price on your site. They're hidden until you add prices.`);
  if (sizedItems === 1) warnings.push("One item comes in several sizes. We listed its smallest size at that price.");
  if (sizedItems > 1) warnings.push(`${sizedItems} items come in several sizes. We listed each at its smallest size and price.`);
  return warnings;
}
