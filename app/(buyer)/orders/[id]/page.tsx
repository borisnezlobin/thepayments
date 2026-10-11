import { connection } from "next/server";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getPrincipal } from "@/lib/buyer/auth";
import { buyerOrder } from "@/lib/payments/buyer";
import { explorerUrl } from "@/lib/payments";
import { formatCents, cardFeeCents } from "@/lib/pricing";
import { Ticket, TicketLine, TicketRule } from "@/components/ui/Ticket";
export const instant = false;
export const metadata = {
  title: "Order status",
  robots: { index: false, follow: false },
};
export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  await connection();
  const principal = await getPrincipal();
  if (!principal) redirect("/login");
  const order = await buyerOrder(principal.buyerId, (await params).id);
  if (!order) notFound();
  const paid =
    order.status !== "awaiting_payment" &&
    Boolean(order.txHash) &&
    Boolean(order.paidAt);
  return (
    <div className="page narrow">
      <Ticket tone={paid ? "fresh" : "plain"}>
        <h1>{paid ? "Your pickup is paid" : "Payment is pending"}</h1>
        <p>Order {order.id.slice(0, 8)}</p>
        <p>Pickup under {order.pickupName}</p>
        <ul>
          {order.items.map((item) => (
            <li key={item.productId}>
              {item.qty} × {item.name}
            </li>
          ))}
        </ul>
        <TicketRule />
        <TicketLine
          emphasis
          label="Total"
          value={formatCents(order.totalCents)}
        />
        {paid && (
          <>
            <TicketLine
              label="Shop’s card fee avoided"
              value={formatCents(
                cardFeeCents(order.subtotalCents, "stripeOnline"),
              )}
            />
            <p>
              <a
                href={explorerUrl(order.txHash!)}
                target="_blank"
                rel="noreferrer"
              >
                Verify the AUSD payment
              </a>
            </p>
          </>
        )}
        <p>Status: {order.status.replaceAll("_", " ")}</p>
        <p>This payment used testnet AUSD.</p>
        <Link href="/shops">Back to shops</Link>
      </Ticket>
    </div>
  );
}
