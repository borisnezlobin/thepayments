import "server-only";
import { HttpError } from "../http";
import { findMenuPage, scrapeMenu } from "./contextDev";
import { parseExtractedMenu, type ParsedMenu } from "./menuExtraction";

export interface ImportedMenu extends ParsedMenu {
  menuUrl: string;
}

async function readMenuAt(url: string): Promise<ImportedMenu | null> {
  const scraped = await scrapeMenu(url);
  if (!scraped) return null;
  return { ...parseExtractedMenu(scraped.menu, url, scraped.pageTitle ?? new URL(url).hostname), menuUrl: url };
}

export async function importMenu(url: string): Promise<ImportedMenu> {
  const direct = await readMenuAt(url);
  if (direct && direct.products.length > 0) return direct;
  const menuPage = await findMenuPage(url);
  const fromMenuPage = menuPage ? await readMenuAt(menuPage) : null;
  if (fromMenuPage && fromMenuPage.products.length > 0) return fromMenuPage;
  if (direct) return direct;
  throw new HttpError(502, "We reached your site but couldn't find a menu on it. Try the link to your menu page itself.");
}
