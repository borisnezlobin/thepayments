import type { ShopMenu } from "@/lib/contract";
import { formatCents } from "@/lib/pricing";
import { InvalidOrder } from "./errors";
export const money = formatCents;
export function quote(
  menu: ShopMenu,
  items: { productId: string; qty: number }[],
) {
  if (items.length < 1 || items.length > 50)
    throw new InvalidOrder("Choose at least one available item.");
  const ids = new Set<string>();
  let subtotalCents = 0,
    totalCents = 0;
  for (const item of items) {
    if (ids.has(item.productId))
      throw new InvalidOrder("Each product must appear only once.");
    ids.add(item.productId);
    const product = menu.items.find((p) => p.productId === item.productId);
    if (
      !product ||
      !Number.isInteger(item.qty) ||
      item.qty < 1 ||
      item.qty > 20
    )
      throw new InvalidOrder("An item or quantity is no longer available.");
    if (product.agentPriceCents > product.priceCents)
      throw new InvalidOrder("The shop has an invalid agent price.");
    subtotalCents += product.priceCents * item.qty;
    totalCents += product.agentPriceCents * item.qty;
  }
  if (!Number.isSafeInteger(totalCents) || totalCents > 100_000_000)
    throw new InvalidOrder("This order is too large.");
  return {
    subtotalCents,
    discountCents: subtotalCents - totalCents,
    totalCents,
  };
}
