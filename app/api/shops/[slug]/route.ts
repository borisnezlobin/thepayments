import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/http";
import { requireShopOwner } from "@/lib/shops/auth";
import { listProducts, publishShop, saveProductEdits, updateShopDetails } from "@/lib/shops/repository";

const productEditSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, "Every item needs a name.").max(120),
  // Imported descriptions are stored in full; saving must accept the same text.
  description: z.string().trim().nullable(),
  priceCents: z.number().int().min(0).max(100000),
  available: z.boolean(),
  baseName: z.string().trim().min(1).max(120).nullable().optional(),
  sizeLabel: z.string().trim().min(1).max(40).nullable().optional(),
});

const updateSchema = z.object({
  name: z.string().trim().min(1, "Your shop needs a name.").max(80).optional(),
  agentDiscountPct: z.number().int().min(0).max(50).optional(),
  publish: z.boolean().optional(),
  products: z.array(productEditSchema).max(300).optional(),
});

export function PATCH(request: Request, context: RouteContext<"/api/shops/[slug]">) {
  return handle(async () => {
    const owner = await requireShopOwner(request, (await context.params).slug);
    const changes = await readJson(request, updateSchema);
    if (changes.products) await saveProductEdits(owner.id, changes.products);
    let shop = await updateShopDetails(owner, changes);
    if (changes.publish) shop = await publishShop(shop);
    return NextResponse.json({ shop, products: await listProducts(shop.id) });
  });
}
