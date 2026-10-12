import { COFFEE, cents } from "./coffeeMath";

const PROFIT_STARTS_MS = 500;
const FEE_STARTS_MS = 1700;
const STEP_MS = 18;

type Share = { key: string; cents: number; dotClass: string; figureClass: string; label: string; startsAtMs?: number };

const costsCents = COFFEE.priceCents - COFFEE.cafeProfitCents - COFFEE.cardFeeCents;

const SHARES: Share[] = [
  { key: "costs", cents: costsCents, dotClass: "bg-line", figureClass: "text-ink", label: "beans, milk, wages and rent" },
  { key: "profit", cents: COFFEE.cafeProfitCents, dotClass: "bg-accent", figureClass: "text-accent-ink", label: "the café keeps as profit", startsAtMs: PROFIT_STARTS_MS },
  { key: "fee", cents: COFFEE.cardFeeCents, dotClass: "bg-danger", figureClass: "text-danger", label: "goes to Stripe", startsAtMs: FEE_STARTS_MS },
];

function Cents({ share }: { share: Share }) {
  const animated = share.startsAtMs !== undefined;
  return Array.from({ length: share.cents }, (_, index) => (
    <span
      key={`${share.key}-${index}`}
      className={`aspect-square rounded-pill ${share.dotClass} ${animated ? "animate-cent-in" : ""}`}
      style={animated ? { animationDelay: `${(share.startsAtMs ?? 0) + index * STEP_MS}ms` } : undefined}
    />
  ));
}

export function CentGrid() {
  return (
    <div aria-hidden className="grid grid-flow-col grid-cols-50 grid-rows-11 gap-0.5 md:gap-1">
      {SHARES.map((share) => (
        <Cents key={share.key} share={share} />
      ))}
    </div>
  );
}

export function CentLegend() {
  return (
    <ul className="flex flex-wrap gap-x-10 gap-y-3">
      {[...SHARES].reverse().map((share) => (
        <li key={share.key} className="flex items-baseline gap-3 text-body-lg">
          <span aria-hidden className={`size-3 shrink-0 self-center rounded-pill ${share.dotClass}`} />
          <span className={`font-display text-title font-bold tabular ${share.figureClass}`}>{cents(share.cents)}</span>
          <span className="text-ink-muted">{share.label}</span>
        </li>
      ))}
    </ul>
  );
}
