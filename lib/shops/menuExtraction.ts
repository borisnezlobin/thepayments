import { z } from "zod";
import { sizedName } from "../menuNames";

export const extractedMenuSchema = z.object({
  shopName: z.string().describe("The business's name as shown on the page"),
  items: z
    .array(
      z.object({
        name: z.string().describe("Item name exactly as listed, without any size"),
        description: z.string().nullable().describe("Short description from the page, or null"),
        category: z.string().nullable().describe("The menu section the item sits in, such as Coffee or Pastries, or null"),
        imageUrl: z.string().nullable().describe("Absolute URL of the item's photo, or null"),
        sizes: z
          .array(
            z.object({
              label: z.string().nullable().describe("The size's name as written on the page, such as Small, 12 oz, Cup or Bowl. Null when the page doesn't name it"),
              price: z.number().describe("Price in US dollars, such as 4.75"),
            }),
          )
          .describe(
            "Every price the item is sold at. One entry with a null label when the item has a single price. When the page names sizes, one entry per size with its label. When the page only shows a range like \"$11.90 - $13.95\", two entries with null labels: the lowest and the highest price. An empty array when no price is shown",
          ),
      }),
    )
    .describe("Every item the business sells on this page"),
});

export type ExtractedMenu = z.infer<typeof extractedMenuSchema>;
type ExtractedItem = ExtractedMenu["items"][number];

export const extractionInstructions =
  "Extract every menu item or product this business sells, with its prices exactly as listed. Leave out site navigation, footers, gift cards and badges such as \"Powered by Square\". Use only facts stated on the page. Never invent prices or size names.";

export interface DraftProduct {
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  category: string | null;
  available: boolean;
  baseName: string | null;
  sizeLabel: string | null;
}

export interface ParsedMenu {
  shopName: string;
  products: DraftProduct[];
  warnings: string[];
}

interface PricedSize {
  label: string | null;
  cents: number;
}

function toCents(price: number) {
  return Number.isFinite(price) && price >= 0 ? Math.round(price * 100) : null;
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

function pricedSizes(item: ExtractedItem): PricedSize[] {
  const sizes = item.sizes
    .map((size) => ({ label: cleanText(size.label), cents: toCents(size.price) }))
    .filter((size): size is PricedSize => size.cents !== null)
    .sort((a, b) => a.cents - b.cents);
  return sizes.filter((size, index) => index === 0 || size.cents !== sizes[index - 1].cents || size.label !== sizes[index - 1].label);
}

function itemProducts(item: ExtractedItem, name: string, sourceUrl: string): DraftProduct[] {
  const shared = { description: cleanText(item.description), imageUrl: absoluteHttpUrl(item.imageUrl, sourceUrl), category: cleanText(item.category) };
  const sizes = pricedSizes(item);
  if (sizes.length === 0) return [{ ...shared, name, priceCents: 0, available: false, baseName: null, sizeLabel: null }];
  if (sizes.length === 1) return [{ ...shared, name, priceCents: sizes[0].cents, available: true, baseName: null, sizeLabel: null }];
  return sizes.map((size, index) => ({
    ...shared,
    name: sizedName(name, size.label, index),
    priceCents: size.cents,
    available: true,
    baseName: name,
    sizeLabel: size.label,
  }));
}

export function parseExtractedMenu(menu: ExtractedMenu, sourceUrl: string, fallbackName: string): ParsedMenu {
  const seen = new Set<string>();
  const products: DraftProduct[] = [];
  for (const item of menu.items) {
    const name = cleanText(item.name);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    products.push(...itemProducts(item, name, sourceUrl));
  }
  return { shopName: cleanText(menu.shopName) ?? fallbackName, products, warnings: menuWarnings(products) };
}

function plural(count: number, one: string, many: string) {
  return count === 1 ? one : many.replace("{n}", String(count));
}

function menuWarnings(products: DraftProduct[]) {
  const warnings: string[] = [];
  const unpriced = products.filter((product) => !product.available).length;
  const unnamedDishes = new Set(products.filter((product) => product.baseName && !product.sizeLabel).map((product) => product.baseName)).size;
  if (products.length === 0) warnings.push("We couldn't find any menu items on that page. Try the link to your menu page itself.");
  if (unpriced > 0) warnings.push(plural(unpriced, "One item had no price on your site.", "{n} items had no price on your site."));
  if (unnamedDishes > 0) warnings.push(plural(unnamedDishes, "One dish comes in sizes your site doesn't name.", "{n} dishes come in sizes your site doesn't name."));
  return warnings;
}
