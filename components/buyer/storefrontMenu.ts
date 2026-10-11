import type { MenuItem, ShopMenu } from "@/lib/contract";
import { quote } from "@/lib/money";

export interface MenuDish {
  name: string;
  description: string | null;
  items: MenuItem[];
}

export interface MenuCategory {
  name: string;
  anchor: string;
  dishes: MenuDish[];
}

export interface OrderLine {
  productId: string;
  qty: number;
}

export interface OrderTotals {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}

export function groupDishes(items: MenuItem[]): MenuDish[] {
  const dishes: MenuDish[] = [];
  const byName = new Map<string, MenuDish>();
  for (const item of items) {
    const existing = item.baseName ? byName.get(item.baseName) : undefined;
    if (existing) {
      existing.items.push(item);
      continue;
    }
    const dish = { name: item.baseName ?? item.name, description: item.description, items: [item] };
    if (item.baseName) byName.set(item.baseName, dish);
    dishes.push(dish);
  }
  return dishes;
}

function anchorFor(name: string) {
  return `menu-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export function groupMenu(items: MenuItem[]): MenuCategory[] {
  const categories = new Map<string, MenuItem[]>();
  for (const item of items) {
    const name = item.category ?? "Menu";
    categories.set(name, [...(categories.get(name) ?? []), item]);
  }
  return [...categories.entries()].map(([name, categoryItems]) => ({ name, anchor: anchorFor(name), dishes: groupDishes(categoryItems) }));
}

export function orderLines(menu: ShopMenu, quantities: Record<string, number>): OrderLine[] {
  return menu.items.filter((item) => (quantities[item.productId] ?? 0) > 0).map((item) => ({ productId: item.productId, qty: quantities[item.productId] }));
}

export function orderTotals(menu: ShopMenu, lines: OrderLine[]): OrderTotals {
  return lines.length ? quote(menu, lines) : { subtotalCents: 0, discountCents: 0, totalCents: 0 };
}
