import "server-only";
import { z } from "zod";
import { getLiveMenu, listLiveShops } from "@/lib/shops/repository";
import { menuSchema, shopSummarySchema, slugSchema } from "@/lib/buyer/schemas";
import { CatalogError, IntegrationUnavailable } from "./errors";
async function fetchCatalog(path: string) {
  const url = new URL(path, new URL(process.env.CATALOG_API_ORIGIN!).origin);
  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
  } catch {
    throw new CatalogError(
      "The shop directory is temporarily unavailable. Try again shortly.",
    );
  }
  if (response.status === 404) return null;
  if (!response.ok)
    throw new CatalogError(
      "The shop directory is temporarily unavailable. Try again shortly.",
    );
  try {
    return await response.json();
  } catch {
    throw new CatalogError(
      "The shop returned an unreadable menu. Try again later.",
    );
  }
}
async function catalogData(path: string, localRead: () => Promise<unknown>) {
  if (process.env.CATALOG_API_ORIGIN) return fetchCatalog(path);
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY)
    throw new IntegrationUnavailable("catalog");
  try {
    return await localRead();
  } catch {
    throw new CatalogError(
      "The shop directory is temporarily unavailable. Try again shortly.",
    );
  }
}
export async function findShops(query = "") {
  const data = await catalogData("/api/shops", listLiveShops);
  const parsed = z.array(shopSummarySchema).safeParse(data);
  if (!parsed.success)
    throw new CatalogError("The shop directory has an unexpected format.");
  return parsed.data.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()),
  );
}
export async function getMenu(slug: string) {
  if (!slugSchema.safeParse(slug).success) return null;
  const data = await catalogData(
    `/api/shops/${encodeURIComponent(slug)}/menu`,
    () => getLiveMenu(slug),
  );
  if (data === null) return null;
  const parsed = menuSchema.safeParse(data);
  if (!parsed.success)
    throw new CatalogError("The shop returned an invalid menu.");
  return parsed.data.shop.slug === slug ? parsed.data : null;
}
export function publicMenuUrl(slug: string) {
  const path = `/api/shops/${encodeURIComponent(slug)}/menu`;
  return process.env.CATALOG_API_ORIGIN
    ? new URL(path, new URL(process.env.CATALOG_API_ORIGIN).origin).href
    : path;
}
