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
