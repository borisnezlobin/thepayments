import { redirect } from "next/navigation";
import { getPrincipal } from "@/lib/buyer/auth";
import { StatusPanel } from "@/components/buyer/status-panel";
export const metadata = {
  title: "Order status",
  robots: { index: false, follow: false },
};
export default async function OrderPage() {
  if (!(await getPrincipal())) redirect("/login");
  // Do not display a successful receipt without Track B's verified order response.
  return (
    <div className="page narrow">
      <StatusPanel
        title="Order status isn’t connected yet"
        href="/shops"
        action="Back to shops"
      >
        <p>
          We can’t show a payment confirmation until wallet checkout is
          available. This page does not confirm that an order was placed.
        </p>
      </StatusPanel>
    </div>
  );
}
