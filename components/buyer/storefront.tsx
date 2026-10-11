import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ShopMenu } from "@/lib/contract";
import type { Principal } from "@/lib/buyer/auth";
import { checkoutEnabled } from "@/lib/buyer/payment";
import { StorefrontOrder } from "./StorefrontOrder";

export { groupDishes } from "./storefrontMenu";

const DEMO_SHOP_PATTERN = /ladle\s*(?:&|and)\s*leaf/i;

export function Storefront({
  menu,
  quantities,
  principal,
  requestId,
  menuUrl,
}: {
  menu: ShopMenu;
  quantities: Record<string, number>;
  principal: Principal | null;
  requestId: string;
  menuUrl: string | null;
}) {
  const { shop } = menu;
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-4">
        <Link href="/shops" className="inline-flex items-center gap-1.5 self-start text-body-sm font-semibold text-ink-muted no-underline hover:text-ink">
          <ArrowLeft size={16} weight="bold" aria-hidden />
          All shops
        </Link>
        <h1 className="text-display font-bold">{shop.name}</h1>
        <p className="text-body-lg text-ink-muted">
          Order ahead for pickup. Agents pay <span className="font-semibold text-ink">{shop.agentDiscountPct}% less</span> than the menu price.
        </p>
        {DEMO_SHOP_PATTERN.test(shop.name) ? (
          <p className="self-start rounded-control bg-surface-sunken px-4 py-2 text-body-sm text-ink-muted">
            This demo storefront isn&rsquo;t affiliated with Ladle &amp; Leaf. No real café order is placed.
          </p>
        ) : null}
        {menuUrl ? (
          <a href={menuUrl} className="self-start text-body-sm text-accent-ink">
            Menu as JSON for agents
          </a>
        ) : null}
      </div>
      <StorefrontOrder menu={menu} initialQuantities={quantities} principal={principal} checkoutEnabled={checkoutEnabled} requestId={requestId} />
    </div>
  );
}
