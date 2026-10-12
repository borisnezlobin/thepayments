import type { Product, ProductEdit } from "@/lib/contract";
import { sizedName } from "@/lib/menuNames";

export interface DraftItem {
  originalName?: string;
  id: string;
  name: string;
  description: string;
  price: string;
  available: boolean;
  category: string | null;
  imageUrl: string | null;
  baseName: string | null;
  sizeLabel: string;
}

export interface Dish {
  key: string;
  sized: boolean;
  items: DraftItem[];
}

export interface MenuSection {
  category: string;
  dishes: Dish[];
}

export function toDraftItem(product: Product): DraftItem {
  return {
    originalName: product.name,
    id: product.id,
    name: product.baseName ?? product.name,
    description: product.description ?? "",
    price: product.priceCents > 0 ? (product.priceCents / 100).toFixed(2) : "",
    available: product.available,
    category: product.category,
    imageUrl: product.imageUrl,
    baseName: product.baseName,
    sizeLabel: product.sizeLabel ?? "",
  };
}

export function parsePriceCents(price: string): number | null {
  const cleaned = price.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

export const UNNAMED_SIZE_PROBLEM = "Name this size.";

export function itemProblem(item: DraftItem): string | null {
  if (!item.name.trim()) return "Add a name.";
  if (!item.available) return null;
  if (item.baseName && !item.sizeLabel.trim()) return UNNAMED_SIZE_PROBLEM;
  const cents = parsePriceCents(item.price);
  if (cents === null || cents === 0) return "Add a price, or hide it.";
  return null;
}

function dishKey(item: DraftItem) {
  return item.baseName ? `dish:${item.baseName}` : `item:${item.id}`;
}

export function groupMenu(items: DraftItem[]): MenuSection[] {
  const sections = new Map<string, Map<string, DraftItem[]>>();
  for (const item of items) {
    const category = item.category ?? "Menu";
    const dishes = sections.get(category) ?? new Map<string, DraftItem[]>();
    dishes.set(dishKey(item), [...(dishes.get(dishKey(item)) ?? []), item]);
    sections.set(category, dishes);
  }
  return [...sections.entries()].map(([category, dishes]) => ({
    category,
    dishes: [...dishes.entries()].map(([key, dishItems]) => ({ key, sized: dishItems[0].baseName !== null, items: dishItems })),
  }));
}

function editName(item: DraftItem, sizeIndex: number) {
  return item.baseName ? sizedName(item.name.trim(), item.sizeLabel.trim() || null, sizeIndex) : item.name.trim();
}

export function toProductEdits(items: DraftItem[], hideUnfinished = false): ProductEdit[] {
  return groupMenu(items).flatMap((section) =>
    section.dishes.flatMap((dish) =>
      dish.items.map((item, sizeIndex) => ({
        id: item.id,
        name: hideUnfinished && !item.name.trim() ? item.originalName ?? "" : editName(item, sizeIndex),
        description: item.description.trim() || null,
        priceCents: parsePriceCents(item.price) ?? 0,
        available: item.available && !(hideUnfinished && itemProblem(item)),
        baseName: item.baseName ? item.name.trim() || null : null,
        sizeLabel: item.baseName ? item.sizeLabel.trim() || null : null,
      })),
    ),
  );
}

export function unnamedSizeCount(section: MenuSection) {
  return Math.max(0, ...section.dishes.filter((dish) => dish.sized && dish.items.some((item) => !item.sizeLabel.trim())).map((dish) => dish.items.length));
}

export function nameSectionSizes(items: DraftItem[], category: string, labels: string[]): DraftItem[] {
  const sizeIndex = new Map<string, number>();
  for (const section of groupMenu(items).filter((entry) => entry.category === category)) {
    for (const dish of section.dishes.filter((entry) => entry.sized)) dish.items.forEach((item, index) => sizeIndex.set(item.id, index));
  }
  return items.map((item) => {
    const index = sizeIndex.get(item.id);
    const label = index === undefined ? undefined : labels[index]?.trim();
    return label && !item.sizeLabel.trim() ? { ...item, sizeLabel: label } : item;
  });
}

function countNote(count: number, one: string, many: (count: number) => string) {
  if (count === 0) return null;
  return count === 1 ? one : many(count);
}

export function menuNotes(items: DraftItem[]): string[] {
  const unpriced = items.filter((item) => !item.available && !parsePriceCents(item.price)).length;
  const unnamed = new Set(items.filter((item) => item.baseName && !item.sizeLabel.trim()).map((item) => item.baseName)).size;
  return [
    countNote(unpriced, "One item had no price on your site, so it's hidden.", (n) => `${n} items had no price on your site, so they're hidden.`),
    countNote(unnamed, "One dish comes in sizes your site doesn't name. Name them below.", (n) => `${n} dishes come in sizes your site doesn't name. Name them once per section below.`),
  ].filter((note): note is string => note !== null);
}
