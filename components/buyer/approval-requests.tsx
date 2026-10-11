import { Button } from "@/components/ui/Button";
import { Ticket, TicketLine, TicketRule } from "@/components/ui/Ticket";
import { approveOrderRequest, declineOrderRequest } from "@/app/actions";
import type { ApprovalRequest } from "@/lib/buyer/approvals";
import { formatCents } from "@/lib/pricing";

function askedAt(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" });
}

function RequestTicket({ request, canPay }: { request: ApprovalRequest; canPay: boolean }) {
  return (
    <li>
      <Ticket tone="fresh">
        <h3 className="text-body-lg font-semibold">{request.shopName}</h3>
        <p className="text-body-sm text-ink-muted">
          Your agent asked at {askedAt(request.createdAt)} UTC for pickup under {request.pickupName}.
        </p>
        <ul className="mt-4 flex flex-col gap-1">
          {request.items.map((item) => (
            <li key={item.productId}>
              <TicketLine label={`${item.qty}× ${item.name}`} value={formatCents(item.unitPriceCents * item.qty)} />
            </li>
          ))}
        </ul>
        <TicketRule />
        <TicketLine emphasis label="Total" value={formatCents(request.totalCents)} />
        <div className="mt-5 flex flex-wrap gap-3">
          <form action={approveOrderRequest}>
            <input type="hidden" name="requestId" value={request.id} />
            <Button disabled={!canPay}>{request.status === "approved" ? "Check payment" : `Approve and pay ${formatCents(request.totalCents)}`}</Button>
          </form>
          <form action={declineOrderRequest}>
            <input type="hidden" name="requestId" value={request.id} />
            <Button variant="quiet">Decline</Button>
          </form>
        </div>
      </Ticket>
    </li>
  );
}

export function ApprovalRequests({ requests, canPay }: { requests: ApprovalRequest[]; canPay: boolean }) {
  return (
    <section id="approvals" aria-labelledby="approvals-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="approvals-heading">Waiting for your approval</h2>
        <p className="text-body text-ink-muted">Nothing is paid until you approve an order. Requests expire after 30 minutes.</p>
        {canPay ? null : <p className="text-body-sm text-ink-muted">Approving opens when wallet checkout is connected. You can decline now.</p>}
      </div>
      <ul className="flex flex-col gap-4">
        {requests.map((request) => (
          <RequestTicket key={request.id} request={request} canPay={canPay} />
        ))}
      </ul>
    </section>
  );
}
