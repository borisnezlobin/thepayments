import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { getMenu, publicMenuUrl } from "@/lib/catalog";
import { getPrincipal } from "@/lib/buyer/auth";
import { CatalogError, IntegrationUnavailable } from "@/lib/errors";
import { StatusPanel } from "@/components/buyer/status-panel";
import { Storefront } from "@/components/buyer/storefront";
export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  let menu;
  try {
    menu = await getMenu(slug);
  } catch (error) {
    if (
      !(
        error instanceof IntegrationUnavailable || error instanceof CatalogError
      )
    )
      throw error;
    return (
      <div className="page">
        <StatusPanel
          title="This menu isn’t available yet"
          href="/shops"
          action="Browse shops"
        >
          <p>
            Check back when the shop’s menu is ready. No order has been placed.
          </p>
        </StatusPanel>
      </div>
    );
  }
  if (!menu) notFound();
  const query = await searchParams;
  const quantities: Record<string, number> = {};
  for (const product of menu.items) {
    const raw = query[`qty_${product.productId}`];
    const qty = typeof raw === "string" ? Number(raw) : 0;
    quantities[product.productId] =
      Number.isInteger(qty) && qty >= 0 && qty <= 20 ? qty : 0;
  }
  const url = publicMenuUrl(slug);
  return (
    <>
      {url && (
        <link
          rel="alternate"
          type="application/json"
          title={`${menu.shop.name} menu`}
          href={url}
        />
      )}
      <Storefront
        menu={menu}
        quantities={quantities}
        principal={await getPrincipal()}
        requestId={randomUUID()}
        menuUrl={url}
      />
    </>
  );
}
