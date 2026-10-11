import { CheckCircle, Clock, CoffeeBean, HandArrowUp } from "@phosphor-icons/react/dist/ssr";
import type { OrderStatus } from "@/lib/contract";

const STATUS_STYLE: Record<OrderStatus, { label: string; className: string; Icon: typeof Clock }> = {
  awaiting_payment: { label: "Waiting for payment", className: "bg-surface-sunken text-ink-muted", Icon: Clock },
  paid: { label: "New order", className: "bg-accent text-on-accent", Icon: CoffeeBean },
  ready: { label: "Ready for pickup", className: "bg-ink text-surface", Icon: HandArrowUp },
  picked_up: { label: "Picked up", className: "bg-surface-sunken text-ink-muted", Icon: CheckCircle },
};

export function StatusPill({ status }: { status: OrderStatus }) {
  const { label, className, Icon } = STATUS_STYLE[status];
  return (
    <span className={`inline-flex h-7 items-center gap-1.5 rounded-pill px-3 text-caption font-semibold whitespace-nowrap ${className}`}>
      <Icon size={14} weight="bold" aria-hidden />
      {label}
    </span>
  );
}
