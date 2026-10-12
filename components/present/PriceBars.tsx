import type { ReactNode } from "react";
import { COFFEE, cents } from "./coffeeMath";

const shopGainCents = COFFEE.agentPriceCents - COFFEE.cardShopKeepsCents;
const customerSavesCents = COFFEE.priceCents - COFFEE.agentPriceCents;

function share(value: number) {
  return `${(value / COFFEE.priceCents) * 100}%`;
}

function Bar({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-12 w-full md:h-16">
      <div className="absolute inset-0 flex origin-left animate-bar-grow">{children}</div>
    </div>
  );
}

function Segment({ widthCents, className }: { widthCents: number; className: string }) {
  return <div style={{ width: share(widthCents) }} className={`h-full shrink-0 ${className}`} />;
}

function Figure({ heading, value, note, valueClass = "text-ink" }: { heading: string; value: string; note?: string; valueClass?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-body-sm text-ink-muted lg:sr-only">{heading}</span>
      <span className={`font-display text-title font-bold tabular md:text-display ${valueClass}`}>{value}</span>
      {note ? <span className="text-body font-semibold text-accent-ink md:text-body-lg">{note}</span> : null}
    </div>
  );
}

const HEADINGS = ["Customer pays", "Fees", "Shop keeps"];

function HeadingRow() {
  return (
    <div aria-hidden className="col-span-full hidden grid-cols-subgrid text-body-lg text-ink-muted lg:grid">
      <span className="col-start-3">{HEADINGS[0]}</span>
      <span>{HEADINGS[1]}</span>
      <span>{HEADINGS[2]}</span>
    </div>
  );
}

function CardRow() {
  return (
    <div className="col-span-full grid grid-cols-3 items-center gap-x-8 gap-y-3 lg:grid-cols-subgrid">
      <span className="col-span-3 font-display text-title font-bold lg:col-span-1">Card</span>
      <div className="col-span-3 lg:col-span-1">
        <Bar>
          <Segment widthCents={COFFEE.cardShopKeepsCents} className="bg-line" />
          <Segment widthCents={COFFEE.cardFeeCents} className="bg-danger" />
        </Bar>
      </div>
      <Figure heading={HEADINGS[0]} value={cents(COFFEE.priceCents)} />
      <Figure heading={HEADINGS[1]} value={cents(COFFEE.cardFeeCents)} valueClass="text-danger" />
      <Figure heading={HEADINGS[2]} value={cents(COFFEE.cardShopKeepsCents)} />
    </div>
  );
}

function AgentRow() {
  return (
    <div className="col-span-full grid grid-cols-3 items-center gap-x-8 gap-y-3 lg:grid-cols-subgrid">
      <span className="col-span-3 font-display text-title font-bold lg:col-span-1">Agent</span>
      <div className="col-span-3 lg:col-span-1">
        <Bar>
          <Segment widthCents={COFFEE.cardShopKeepsCents} className="bg-line" />
          <Segment widthCents={shopGainCents} className="bg-accent" />
          <Segment widthCents={customerSavesCents} className="border-2 border-l-0 border-dashed border-ink-muted" />
        </Bar>
      </div>
      <Figure heading={HEADINGS[0]} value={cents(COFFEE.agentPriceCents)} note={`${customerSavesCents}¢ less`} />
      <Figure heading={HEADINGS[1]} value={COFFEE.agentFeeLabel} />
      <Figure heading={HEADINGS[2]} value={cents(COFFEE.agentPriceCents)} note={`${shopGainCents}¢ more`} />
    </div>
  );
}

export function PriceBars() {
  return (
    <figure className="flex flex-col gap-10">
      <div className="grid gap-x-12 gap-y-10 lg:layout-compare lg:items-center">
        <HeadingRow />
        <CardRow />
        <AgentRow />
      </div>
      <figcaption className="text-body-lg text-ink-muted">
        Both bars show one {cents(COFFEE.priceCents)} coffee to scale from $0.
      </figcaption>
    </figure>
  );
}
