import { Button } from "@/components/ui/Button";
import { Ticket, TicketLine, TicketRule } from "@/components/ui/Ticket";
import { approveOrderRequest, declineOrderRequest } from "@/app/actions";
import type { ApprovalRequest } from "@/lib/buyer/approvals";
import { money } from "@/lib/money";
function RequestTicket({
  request,
  canPay,
}: {
  request: ApprovalRequest;
  canPay: boolean;
}) {
  return (
    <li>
      <Ticket tone="fresh">
        <h3>{request.shopName}</h3>
        <p className="small muted">
          Your agent asked at{" "}
          {new Date(request.createdAt).toLocaleTimeString("en-US", {
            timeZone: "UTC",
            hour: "numeric",
            minute: "2-digit",
          })}{" "}
          UTC for pickup under {request.pickupName}.
        </p>
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
        <TicketRule />
        <TicketLine emphasis label="Total" value={money(request.totalCents)} />
        <div className="approval-actions">
          <form action={approveOrderRequest}>
            <input type="hidden" name="requestId" value={request.id} />
            <Button disabled={!canPay}>
              Approve and pay {money(request.totalCents)}
            </Button>
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
export function ApprovalRequests({
  requests,
  canPay,
}: {
  requests: ApprovalRequest[];
  canPay: boolean;
}) {
  return (
    <section id="approvals" className="account-section">
      <div>
        <h2>Waiting for your approval</h2>
        <p>
          Your agent can only ask. Nothing is charged until you approve an
          order. Requests expire after 30 minutes.
        </p>
        {!canPay && (
          <p className="small muted">
            Approving opens when wallet checkout is connected. You can decline
            now.
          </p>
        )}
      </div>
      <ul className="approval-list">
        {requests.map((request) => (
          <RequestTicket key={request.id} request={request} canPay={canPay} />
        ))}
      </ul>
    </section>
  );
}
