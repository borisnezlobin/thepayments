import { NextResponse } from "next/server";
import { z } from "zod";
import type { ImportShopResponse } from "@/lib/contract";
import { handle, HttpError, readJson } from "@/lib/http";
import { scrapeMenu } from "@/lib/shops/contextDev";
import { parseExtractedMenu } from "@/lib/shops/menuExtraction";
import { createShopFromImport } from "@/lib/shops/repository";

const importSchema = z.object({ url: z.string().trim().min(1, "Paste a link to your shop's website.") });

function normalizeUrl(raw: string) {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    throw new HttpError(400, "That doesn't look like a web address. Try something like ladleandleaf.com/menu.");
  }
}

export function POST(request: Request) {
  return handle(async () => {
    const url = normalizeUrl((await readJson(request, importSchema)).url);
    const { menu, pageTitle } = await scrapeMenu(url);
    const parsed = parseExtractedMenu(menu, url, pageTitle ?? new URL(url).hostname);
    const { shop, products, adminToken } = await createShopFromImport({ name: parsed.shopName, sourceUrl: url, products: parsed.products });
    const body: ImportShopResponse = { shop, products, adminToken, warnings: parsed.warnings };
    return NextResponse.json(body, { status: 201 });
  });
}
