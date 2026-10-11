import { afterEach, describe, expect, it, vi } from "vitest";
import { findShops, getMenu } from "@/lib/catalog";
import { menu, shop } from "./fixtures";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Track A consumer", () => {
  it("returns a configuration error instead of invented shops", async () => {
    vi.stubEnv("CATALOG_API_ORIGIN", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    await expect(findShops()).rejects.toMatchObject({ integration: "catalog" });
  });
  it("consumes ShopSummary[] and supports a case-insensitive search", async () => {
    vi.stubEnv("CATALOG_API_ORIGIN", "https://catalog.example");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([shop])));
    expect(await findShops("CAFÉ")).toEqual([shop]);
  });
  it("rejects a menu containing duplicate products", async () => {
    vi.stubEnv("CATALOG_API_ORIGIN", "https://catalog.example");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ ...menu, items: [menu.items[0], menu.items[0]] }),
        ),
    );
    await expect(getMenu(menu.shop.slug)).rejects.toThrow("invalid menu");
  });
  it("does not fetch invalid path segments", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await getMenu("../admin")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
