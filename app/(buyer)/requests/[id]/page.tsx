import { notFound, redirect } from "next/navigation";
import { getPrincipal } from "@/lib/buyer/auth";
import {
  getRequest,
  isExpired,
  type ApprovalRequest,
} from "@/lib/buyer/approvals";
import { money } from "@/lib/money";
import { StatusPanel } from "@/components/buyer/status-panel";
export const metadata = {
  title: "Order approval",
  robots: { index: false, follow: false },
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function message(request: ApprovalRequest) {
  if (isExpired(request))
    return {
      title: "This order request expired",
      body: "Nobody approved it in time. No payment was taken. Place the order again to send a new request.",
    };
  switch (request.status) {
    case "pending":
      return {
        title: "Waiting for approval",
        body: `The account owner needs to approve this order on their account page. Nothing is charged until they do. This request expires at ${new Date(request.expiresAt).toLocaleTimeString("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" })} UTC.`,
      };
    case "approved":
      return {
        title: "Approved",
        body: "The account owner approved this order. Payment is being processed.",
      };
    case "declined":
      return {
        title: "The account owner declined this order",
        body: "No payment was taken.",
      };
    case "paid":
      return { title: "Paid", body: "The shop has the order." };
    default:
      return {
        title: "Payment did not complete",
        body: "Ask the account owner to check their account page before trying again.",
      };
  }
}
export default async function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const principal = await getPrincipal();
  if (!principal) redirect("/login");
  if (!uuid.test(id)) notFound();
  const request = await getRequest(principal.buyerId, id);
  if (!request) notFound();
  const { title, body } = message(request);
  const waiting =
    (request.status === "pending" && !isExpired(request)) ||
    request.status === "approved";
  return (
    <div className="page narrow">
      {waiting && <meta httpEquiv="refresh" content="5" />}
      <StatusPanel
        title={title}
        href={
          request.status === "paid" && request.orderId
            ? `/orders/${request.orderId}`
            : `/s/${request.shopSlug}`
        }
        action={
          request.status === "paid" && request.orderId
            ? "View paid receipt"
            : `Back to ${request.shopName}`
        }
      >
        <p role="status">{body}</p>
        <ul className="receipt-items">
          {request.items.map((item) => (
            <li key={item.productId}>
              <span>
                {item.qty} × {item.name}
              </span>
              <span>{money(item.unitPriceCents * item.qty)}</span>
            </li>
          ))}
        </ul>
        <p>
          Pickup under {request.pickupName}. Total {money(request.totalCents)}.
        </p>
      </StatusPanel>
    </div>
  );
}
