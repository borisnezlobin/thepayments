import { connection } from "next/server";
import Link from "next/link";
import { findShops } from "@/lib/catalog";
import { CatalogError, IntegrationUnavailable } from "@/lib/errors";
import { ShopPhoto } from "./ShopPhoto";
import { ShopGalleryRail } from "./ShopGalleryRail";

export function ShopGalleryHeading() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-3">
        <h2 id="featured-shops-heading" className="text-display font-bold">
          Find your next favorite
        </h2>
        <p className="text-body text-ink-muted">
          Browse a menu. Order ahead for pickup.
        </p>
      </div>
      <Link
        href="/shops"
        className="inline-flex min-h-11 items-center font-semibold text-ink underline underline-offset-4"
      >
        View all shops
      </Link>
    </div>
  );
}

export async function FeaturedShops() {
  await connection();
  let shops;
  try {
    shops = await findShops();
  } catch (error) {
    if (
      !(
        error instanceof CatalogError || error instanceof IntegrationUnavailable
      )
    )
      throw error;
    return (
      <p className="text-body text-ink-muted">
        Browse all shops to see the latest menus.
      </p>
    );
  }
  if (shops.length === 0)
    return (
      <p className="text-body text-ink-muted">
        Published shops will appear here.
      </p>
    );
  return (
    <ShopGalleryRail>
      {shops.map((shop) => (
        <Link
          key={shop.slug}
          href={`/s/${shop.slug}`}
          className="group flex w-72 shrink-0 snap-start flex-col gap-4 text-ink no-underline sm:w-80"
        >
          <ShopPhoto
            slug={shop.slug}
            name={shop.name}
            className="aspect-video w-full rounded-card"
            sizes="(max-width: 640px) 288px, 320px"
          />
          <div className="flex items-start justify-between gap-4">
            <h3
              title={shop.name}
              className="line-clamp-2 text-title font-semibold group-hover:underline underline-offset-4"
            >
              {shop.name}
            </h3>
            <span className="shrink-0 rounded-pill bg-accent-wash px-3 py-1.5 text-body-sm font-semibold text-accent-ink">
              Save {shop.agentDiscountPct}%
            </span>
          </div>
          <span className="text-body-sm text-ink-muted">View menu</span>
        </Link>
      ))}
    </ShopGalleryRail>
  );
}
