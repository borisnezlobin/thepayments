import { Coffee } from "@phosphor-icons/react/dist/ssr";
import { Button, buttonClasses } from "@/components/ui/Button";
import Link from "next/link";
import { findShops } from "@/lib/catalog";
import { CatalogError, IntegrationUnavailable } from "@/lib/errors";
import { StatusPanel } from "@/components/buyer/status-panel";
import type { ShopSummary } from "@/lib/contract";
import { ShopPhoto } from "@/components/buyer/ShopPhoto";
export const metadata = { title: "Find a shop" };
export default async function Shops({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; notice?: string }>;
}) {
  const { q = "", notice } = await searchParams;
  let shops: ShopSummary[] = [],
    state: "ready" | "pending" | "error" = "ready";
  try {
    shops = await findShops(q.slice(0, 100));
  } catch (error) {
    if (error instanceof IntegrationUnavailable) state = "pending";
    else if (error instanceof CatalogError) state = "error";
    else throw error;
  }
  return (
    <div className="page">
      <section className="directory-hero">
        <div>
          <h1>
            Your next coffee.
            <br />A better way to pay.
          </h1>
          <p className="lead">
            Find a local shop, pick your usual, and let your agent take it from
            there.
          </p>
          <Link className="inline-link" href="/agents">
            See how agent ordering works
          </Link>
        </div>
        <div className="coffee-art" aria-hidden="true">
          <Coffee size={144} weight="duotone" />
        </div>
      </section>
      {notice === "connected" && (
        <p className="notice" role="status">
          Agent connected. This session can browse shops and place orders when
          checkout opens.
        </p>
      )}
      {notice === "agent" && (
        <p className="notice" role="status">
          Agent access is limited to ordering. Sign out and sign in with email
          to manage the account.
        </p>
      )}
      <section aria-labelledby="shop-heading">
        <div className="section-heading">
          <h2 id="shop-heading">Find your spot</h2>
          <form className="search-form" action="/shops" method="get">
            <label className="sr-only" htmlFor="shop-search">
              Search shops
            </label>
            <input
              id="shop-search"
              name="q"
              placeholder="Search by shop name"
              defaultValue={q}
              maxLength={100}
            />
            <Button className={buttonClasses("quiet")}>Search</Button>
          </form>
        </div>
        {state === "pending" ? (
          <StatusPanel title="The first shops are on their way">
            <p>
              Our shop directory hasn’t opened yet. You can explore agent
              ordering while we get things ready.
            </p>
            <Link href="/agents">Explore agent ordering</Link>
          </StatusPanel>
        ) : state === "error" ? (
          <StatusPanel
            title="We couldn’t load the shops"
            href="/shops"
            action="Try again"
          >
            <p>
              The directory is temporarily unavailable. Please try again
              shortly.
            </p>
          </StatusPanel>
        ) : shops.length === 0 ? (
          <StatusPanel
            title={q ? "No shops match your search" : "No shops are open yet"}
            href={q ? "/shops" : undefined}
            action="Clear search"
          >
            <p>
              {q
                ? "Try a different name, or browse all shops."
                : "Check back soon for the first menus."}
            </p>
          </StatusPanel>
        ) : (
          <div className="shop-grid">
            {shops.map((shop) => (
              <Link
                className="shop-card"
                href={`/s/${shop.slug}`}
                key={shop.slug}
              >
                <ShopPhoto
                  slug={shop.slug}
                  name={shop.name}
                  className="h-40 w-full"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                />
                <div className="shop-card-body">
                  <span className="pill">Save {shop.agentDiscountPct}%</span>
                  <h3>{shop.name}</h3>
                  <p>Order ahead for pickup</p>
                  <span className="inline-link">View menu</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <section className="directory-note">
        <h2>
          A small saving.
          <br />A shared upside.
        </h2>
        <p>
          Participating shops offer agent prices on their menus. You pay less
          for your order, and more of the sale stays with the shop.
        </p>
      </section>
    </div>
  );
}
