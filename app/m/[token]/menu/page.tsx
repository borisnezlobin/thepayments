import { Suspense } from "react";
import { MenuEditor } from "@/components/merchant/MenuEditor";
import { MerchantHeader } from "@/components/merchant/MerchantHeader";
import { DashboardSkeleton } from "@/components/merchant/DashboardSkeleton";
import { loadMenuEditor } from "@/lib/shops/dashboard";

async function MenuPage({ params }: { params: PageProps<"/m/[token]/menu">["params"] }) {
  const { token } = await params;
  const { shop, products } = await loadMenuEditor(token);
  return (
    <>
      <MerchantHeader shop={shop} token={token} current="menu" />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <MenuEditor shop={shop} products={products} token={token} />
      </main>
    </>
  );
}

export default function Page(props: PageProps<"/m/[token]/menu">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <MenuPage params={props.params} />
    </Suspense>
  );
}
