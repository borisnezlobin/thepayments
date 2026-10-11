import type { Product, ProductEdit } from "@/lib/contract";

export interface DraftItem {
  id: string;
  name: string;
  description: string;
  price: string;
  available: boolean;
  category: string | null;
  imageUrl: string | null;
}

export function toDraftItem(product: Product): DraftItem {
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? "",
    price: product.priceCents > 0 ? (product.priceCents / 100).toFixed(2) : "",
    available: product.available,
    category: product.category,
    imageUrl: product.imageUrl,
  };
}

export function parsePriceCents(price: string): number | null {
  const cleaned = price.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

export function itemProblem(item: DraftItem): string | null {
  if (!item.name.trim()) return "Add a name.";
  if (!item.available) return null;
  const cents = parsePriceCents(item.price);
  if (cents === null || cents === 0) return "Add a price, or hide the item.";
  return null;
}

export function toProductEdits(items: DraftItem[]): ProductEdit[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name.trim(),
    description: item.description.trim() || null,
    priceCents: parsePriceCents(item.price) ?? 0,
    available: item.available,
  }));
}

export function groupByCategory(items: DraftItem[]) {
  const groups = new Map<string, DraftItem[]>();
  for (const item of items) {
    const key = item.category ?? "Menu";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()];
}

export const SMALLEST_SIZE_SUFFIX = "(smallest size)";

function countNote(count: number, one: string, many: (count: number) => string) {
  if (count === 0) return null;
  return count === 1 ? one : many(count);
}

export function menuNotes(items: DraftItem[]): string[] {
  const unpriced = items.filter((item) => !item.available && !parsePriceCents(item.price)).length;
  const sized = items.filter((item) => item.name.endsWith(SMALLEST_SIZE_SUFFIX)).length;
  return [
    countNote(unpriced, "One item had no price on your site. Add one and switch it on to sell it.", (n) => `${n} items had no price on your site. Add prices and switch them on to sell them.`),
    countNote(sized, "One item comes in several sizes. We listed its smallest size.", (n) => `${n} items come in several sizes. We listed each at its smallest size.`),
  ].filter((note): note is string => note !== null);
}
