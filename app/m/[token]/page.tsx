import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/merchant/DashboardSkeleton";
import { InboxBoard } from "@/components/merchant/InboxBoard";
import { MerchantHeader } from "@/components/merchant/MerchantHeader";
import { loadDashboardShop, loadInbox } from "@/lib/shops/dashboard";

async function Dashboard({ params }: { params: PageProps<"/m/[token]">["params"] }) {
  const { token } = await params;
  const shop = await loadDashboardShop(token);
  if (shop.status === "draft") redirect(`/m/${token}/menu`);
  const initial = await loadInbox(shop.id);
  return (
    <>
      <MerchantHeader shop={shop} token={token} current="orders" />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <InboxBoard shop={shop} token={token} initial={initial} />
      </main>
    </>
  );
}

export default function Page(props: PageProps<"/m/[token]">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard params={props.params} />
    </Suspense>
  );
}
