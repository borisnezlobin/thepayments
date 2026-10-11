import "server-only";
import { z } from "zod";
import { HttpError } from "../http";
import { extractedMenuSchema, extractionInstructions, type ExtractedMenu } from "./menuExtraction";

const API = "https://api.context.dev/v1";
const MAX_ATTEMPTS = 3;
const MAX_RETRY_WAIT_MS = 5000;

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

const mapResponseSchema = z.object({
  urls: z.array(z.object({ url: z.string(), title: z.string().optional() })),
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

function retryDelayMs(response: Response, attempt: number) {
  const retryAfterSeconds = Number(response.headers.get("retry-after"));
  const backoff = 500 * 2 ** attempt;
  return Math.min(Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : backoff, MAX_RETRY_WAIT_MS);
}

function isRetryable(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

async function contextFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(`${API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json", ...init.headers },
    });
    if (response.ok) return response.json();
    if (!isRetryable(response.status) || attempt === MAX_ATTEMPTS - 1) {
      throw new HttpError(502, FAILURE_MESSAGES[response.status] ?? "We couldn't read that page. Check the address and try again.");
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs(response, attempt)));
  }
  throw new HttpError(502, "We couldn't read that page. Check the address and try again.");
}

export async function scrapeMenu(url: string): Promise<ScrapedMenu | null> {
  const body = await contextFetch("/web/scrape", {
    method: "POST",
    body: JSON.stringify({
      url,
      formats: { json: true },
      jsonParams: { schema: z.toJSONSchema(extractedMenuSchema), instructions: extractionInstructions },
      sharedParams: { waitFor: 1500, dismissCookies: true, dismissPopups: true },
      timeoutOpts: { milliseconds: 60000, behavior: "fail" },
    }),
  });
  const parsed = scrapeResponseSchema.safeParse(body);
  if (!parsed.success || !parsed.data.json?.success) return null;
  const menu = extractedMenuSchema.safeParse(parsed.data.json.data);
  return menu.success ? { menu: menu.data, pageTitle: parsed.data.metadata?.title ?? null } : null;
}

export async function findMenuPage(url: string): Promise<string | null> {
  const params = new URLSearchParams({ domain: new URL(url).hostname, search: "menu, prices and online ordering", maxLinks: "5" });
  const parsed = mapResponseSchema.safeParse(await contextFetch(`/web/urls?${params}`));
  if (!parsed.success) return null;
  const tried = new URL(url).toString();
  return parsed.data.urls.map((entry) => entry.url).find((candidate) => candidate !== tried) ?? null;
}
