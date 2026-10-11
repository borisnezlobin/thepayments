import "server-only";
import { z } from "zod";
import { HttpError } from "../http";
import { extractedMenuSchema, extractionInstructions, type ExtractedMenu } from "./menuExtraction";

const SCRAPE_URL = "https://api.context.dev/v1/web/scrape";

const scrapeResponseSchema = z.object({
  json: z
    .object({
      success: z.boolean().nullable(),
      data: z.unknown(),
      message: z.string().optional(),
    })
    .optional(),
  metadata: z.object({ title: z.string().nullish() }).partial().nullish(),
});

export interface ScrapedMenu {
  menu: ExtractedMenu;
  pageTitle: string | null;
}

const FAILURE_MESSAGES: Record<number, string> = {
  400: "That address doesn't look like a public web page.",
  401: "Our menu reader isn't set up yet. Add a Context.dev API key to the server.",
  408: "Your site took too long to load. Try again, or paste the menu page directly.",
  429: "We're reading too many menus at once. Try again in a minute.",
};

function apiKey() {
  const key = process.env.CONTEXT_DEV_API_KEY;
  if (!key) throw new HttpError(503, FAILURE_MESSAGES[401]);
  return key;
}

export async function scrapeMenu(url: string): Promise<ScrapedMenu> {
  const response = await fetch(SCRAPE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      formats: { json: true },
      jsonParams: { schema: z.toJSONSchema(extractedMenuSchema), instructions: extractionInstructions },
      sharedParams: { waitFor: 1500, dismissCookies: true, dismissPopups: true },
      timeoutOpts: { milliseconds: 60000, behavior: "fail" },
    }),
  });
  if (!response.ok) throw new HttpError(502, FAILURE_MESSAGES[response.status] ?? "We couldn't read that page. Check the address and try again.");
  return readScrape(await response.json());
}

function readScrape(body: unknown): ScrapedMenu {
  const parsed = scrapeResponseSchema.safeParse(body);
  if (!parsed.success || !parsed.data.json?.success) throw new HttpError(502, "We reached your site but couldn't find a menu on it. Try the link to your menu page itself.");
  const menu = extractedMenuSchema.safeParse(parsed.data.json.data);
  if (!menu.success) throw new HttpError(502, "We reached your site but couldn't make sense of the menu. Try the link to your menu page itself.");
  return { menu: menu.data, pageTitle: parsed.data.metadata?.title ?? null };
}
