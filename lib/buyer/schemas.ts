import { z } from "zod";
import type { ShopMenu, ShopSummary } from "@/lib/contract";
export const slugSchema = z
  .string()
  // Older imports can end in a hyphen or contain doubled separator hyphens.
  // Preserve their URLs while restricting the entire slug to safe path characters.
  .regex(/^[a-z0-9][a-z0-9-]*$/)
  .max(100);
const cents = z.number().int().nonnegative().max(100_000_000);
export const shopSummarySchema: z.ZodType<ShopSummary> = z.object({
  slug: slugSchema,
  name: z.string().min(1),
  agentDiscountPct: z.number().min(0).max(50),
  itemCount: z.number().int().nonnegative(),
});
export const menuSchema: z.ZodType<ShopMenu> = z
  .object({
    shop: z.object({
      slug: slugSchema,
      name: z.string().min(1),
      agentDiscountPct: z.number().min(0).max(50),
    }),
    items: z.array(
      z.object({
        productId: z.string().min(1),
        name: z.string().min(1),
        description: z.string().nullable(),
        imageUrl: z.string().url().nullable(),
        category: z.string().nullable(),
        priceCents: cents,
        agentPriceCents: cents,
        // Optional sizes from Track A: "Salad (Half)" has baseName "Salad", sizeLabel "Half".
        baseName: z.string().min(1).nullable().optional(),
        sizeLabel: z.string().min(1).nullable().optional(),
      }),
    ),
  })
  .superRefine((menu, context) => {
    const ids = new Set<string>();
    for (const item of menu.items) {
      if (ids.has(item.productId) || item.agentPriceCents > item.priceCents)
        context.addIssue({ code: "custom", message: "Invalid merchant menu." });
      ids.add(item.productId);
    }
  });
export const checkoutSchema = z
  .object({
    shopSlug: slugSchema,
    items: z
      .array(
        z.object({
          productId: z.string().min(1).max(200),
          qty: z.number().int().min(1).max(20),
        }),
      )
      .min(1)
      .max(50),
    pickupName: z.string().trim().min(1).max(80),
    expectedTotalCents: cents.positive(),
    idempotencyKey: z.string().uuid(),
  })
  .strict();
export type CheckoutInput = z.infer<typeof checkoutSchema>;
