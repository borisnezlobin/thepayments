import "server-only";
import { randomBytes } from "node:crypto";
import type { Order, OrderStatus, Product, ProductEdit, Shop, ShopMenu, ShopSummary, Withdrawal } from "../contract";
import { db } from "../db/client";
import { toOrder, toProduct, toShop, toWithdrawal, type OrderRow, type ProductRow, type ShopRow, type WithdrawalRow } from "../db/rows";
import { createWallet } from "../payments";
import { agentPriceCents } from "../pricing";
import type { DraftProduct } from "./menuExtraction";

const INBOX_LIMIT = 60;

function orThrow<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data as T;
}

export function slugify(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "shop";
}

async function availableSlug(name: string) {
  const base = slugify(name);
  const taken = orThrow(await db().from("shops").select("slug").like("slug", `${base}%`)) as { slug: string }[];
  const used = new Set(taken.map((row) => row.slug));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export async function createShopFromImport(input: { name: string; sourceUrl: string; products: DraftProduct[] }) {
  const slug = await availableSlug(input.name);
  const shopRow = orThrow(
    await db().from("shops").insert({ slug, name: input.name, source_url: input.sourceUrl }).select().single<ShopRow>(),
  );
  try {
    const adminToken = randomBytes(24).toString("base64url");
    orThrow(await db().from("shop_secrets").insert({ shop_id: shopRow.id, admin_token: adminToken }));
    const products = await insertProducts(shopRow.id, input.products);
    return { shop: toShop(shopRow), products, adminToken };
  } catch (error) {
    await db().from("shops").delete().eq("id", shopRow.id);
    throw error;
  }
}

async function insertProducts(shopId: string, drafts: DraftProduct[]): Promise<Product[]> {
  if (drafts.length === 0) return [];
  const rows = drafts.map((draft, position) => ({
    shop_id: shopId,
    name: draft.name,
    description: draft.description,
    price_cents: draft.priceCents,
    image_url: draft.imageUrl,
    category: draft.category,
    available: draft.available,
    position,
    base_name: draft.baseName,
    size_label: draft.sizeLabel,
  }));
  const inserted = orThrow(await db().from("products").insert(rows).select()) as ProductRow[];
  return inserted.map(toProduct).sort((a, b) => a.position - b.position);
}

export async function findShopByToken(token: string): Promise<Shop | null> {
  if (!token) return null;
  const secret = orThrow(await db().from("shop_secrets").select("shop_id").eq("admin_token", token).maybeSingle()) as { shop_id: string } | null;
  if (!secret) return null;
  const row = orThrow(await db().from("shops").select().eq("id", secret.shop_id).maybeSingle<ShopRow>());
  return row ? toShop(row) : null;
}

export async function findShopBySlug(slug: string): Promise<Shop | null> {
  const row = orThrow(await db().from("shops").select().eq("slug", slug).maybeSingle<ShopRow>());
  return row ? toShop(row) : null;
}

export async function listProducts(shopId: string): Promise<Product[]> {
  const rows = orThrow(await db().from("products").select().eq("shop_id", shopId).order("position")) as ProductRow[];
  return rows.map(toProduct);
}

export async function listLiveShops(): Promise<ShopSummary[]> {
  const shops = (orThrow(await db().from("shops").select().eq("status", "live").order("created_at", { ascending: false })) as ShopRow[]).map(toShop);
  if (shops.length === 0) return [];
  const products = orThrow(
    await db().from("products").select("shop_id").eq("available", true).in("shop_id", shops.map((shop) => shop.id)),
  ) as { shop_id: string }[];
  return shops.map((shop) => ({
    slug: shop.slug,
    name: shop.name,
    agentDiscountPct: shop.agentDiscountPct,
    itemCount: products.filter((row) => row.shop_id === shop.id).length,
  }));
}

export async function getLiveMenu(slug: string): Promise<ShopMenu | null> {
  const shop = await findShopBySlug(slug);
  if (!shop || shop.status !== "live") return null;
  const items = (await listProducts(shop.id))
    .filter((product) => product.available)
    .map((product) => ({
      productId: product.id,
      name: product.name,
      description: product.description,
      imageUrl: product.imageUrl,
      category: product.category,
      priceCents: product.priceCents,
      agentPriceCents: agentPriceCents(product.priceCents, shop.agentDiscountPct),
      baseName: product.baseName,
      sizeLabel: product.sizeLabel,
    }));
  return { shop: { slug: shop.slug, name: shop.name, agentDiscountPct: shop.agentDiscountPct }, items };
}

export async function updateShopDetails(shop: Shop, changes: { name?: string; agentDiscountPct?: number }) {
  const patch: Partial<ShopRow> = {};
  if (changes.name !== undefined) patch.name = changes.name;
  if (changes.agentDiscountPct !== undefined) patch.agent_discount_pct = changes.agentDiscountPct;
  if (Object.keys(patch).length === 0) return shop;
  return toShop(orThrow(await db().from("shops").update(patch).eq("id", shop.id).select().single<ShopRow>()));
}

function productEditRow(edit: ProductEdit) {
  const row: Partial<ProductRow> = { name: edit.name, description: edit.description, price_cents: edit.priceCents, available: edit.available };
  if (edit.baseName !== undefined) row.base_name = edit.baseName;
  if (edit.sizeLabel !== undefined) row.size_label = edit.sizeLabel;
  return row;
}

export async function saveProductEdits(shopId: string, edits: ProductEdit[]) {
  await Promise.all(
    edits.map(async (edit) =>
      orThrow(
        await db()
          .from("products")
          .update(productEditRow(edit))
          .eq("id", edit.id)
          .eq("shop_id", shopId),
      ),
    ),
  );
}

export async function publishShop(shop: Shop): Promise<Shop> {
  const walletAddress = shop.walletAddress ?? (await createWallet()).address;
  return toShop(
    orThrow(await db().from("shops").update({ status: "live", wallet_address: walletAddress }).eq("id", shop.id).select().single<ShopRow>()),
  );
}

export async function listInboxOrders(shopId: string): Promise<Order[]> {
  const rows = orThrow(
    await db().from("orders").select().eq("shop_id", shopId).neq("status", "awaiting_payment").order("created_at", { ascending: false }).limit(INBOX_LIMIT),
  ) as OrderRow[];
  return rows.map(toOrder);
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = { paid: "ready", ready: "picked_up" };

export async function advanceOrder(shopId: string, orderId: string): Promise<Order | null> {
  const row = orThrow(await db().from("orders").select().eq("id", orderId).eq("shop_id", shopId).maybeSingle<OrderRow>());
  const next = row ? NEXT_STATUS[row.status] : undefined;
  if (!row || !next) return null;
  const updated = orThrow(await db().from("orders").update({ status: next }).eq("id", orderId).eq("status", row.status).select().maybeSingle<OrderRow>());
  return updated ? toOrder(updated) : null;
}

export async function listWithdrawals(shopId: string): Promise<Withdrawal[]> {
  const rows = orThrow(await db().from("withdrawals").select().eq("shop_id", shopId).order("created_at", { ascending: false }).limit(20)) as WithdrawalRow[];
  return rows.map(toWithdrawal);
}
