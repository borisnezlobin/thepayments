import type { CSSProperties } from "react";

const ORDER_CENTS = 600;
const CARD_FEE_CENTS = 46;
const SHOP_GAIN_CENTS = 18;
const CARD_KEPT_CENTS = ORDER_CENTS - CARD_FEE_CENTS;
const AGENT_TOTAL_CENTS = CARD_KEPT_CENTS + SHOP_GAIN_CENTS;
const CUSTOMER_SAVES_CENTS = ORDER_CENTS - AGENT_TOTAL_CENTS;

const FLOOR_CENTS = 500;
const PIXELS_PER_CENT = 5;
const BASELINE = 520;
const BAR_WIDTH = 220;
const TOOTH = 20;
const CARD_X = 330;
const AGENT_X = 630;
const LABEL_GAP = 24;

const DELAY = { card: 0.1, agent: 0.45, fee: 1.1, savings: 1.6, gain: 2.1, gas: 2.6 };

function level(cents: number) {
  return BASELINE - (cents - FLOOR_CENTS) * PIXELS_PER_CENT;
}

function delayed(seconds: number): CSSProperties {
  return { animationDelay: `${seconds}s` };
}

function zigzagBar(centerX: number, topCents: number) {
  const left = centerX - BAR_WIDTH / 2;
  const right = centerX + BAR_WIDTH / 2;
  const points = [`${left},${level(topCents)}`, `${right},${level(topCents)}`, `${right},${BASELINE}`];
  for (let x = right; x > left; x -= TOOTH) points.push(`${x - TOOTH / 2},${BASELINE + TOOTH / 2}`, `${x - TOOTH},${BASELINE}`);
  return points.join(" ");
}

function Band({ centerX, fromCents, toCents, className, delay }: { centerX: number; fromCents: number; toCents: number; className: string; delay: number }) {
  return (
    <rect
      x={centerX - BAR_WIDTH / 2}
      y={level(toCents)}
      width={BAR_WIDTH}
      height={level(fromCents) - level(toCents)}
      className={`animate-fade-in ${className}`}
      style={delayed(delay)}
    />
  );
}

function Callout({ x, y, anchor, figure, note, figureClass, delay }: { x: number; y: number; anchor: "start" | "middle" | "end"; figure: string; note: string; figureClass: string; delay: number }) {
  return (
    <g className="animate-fade-in" style={delayed(delay)} textAnchor={anchor}>
      <text x={x} y={y} fontSize={52} className={`font-display font-bold ${figureClass}`}>
        {figure}
      </text>
      <text x={x} y={y + 34} fontSize={22} className="fill-ink-muted">
        {note}
      </text>
    </g>
  );
}

function BarLabel({ centerX, name, cents, delay }: { centerX: number; name: string; cents: number; delay: number }) {
  return (
    <g className="animate-fade-in" style={delayed(delay)} textAnchor="middle">
      <text x={centerX} y={BASELINE + 62} fontSize={26} className="fill-ink-muted">
        {name}
      </text>
      <text x={centerX} y={BASELINE + 108} fontSize={40} className="font-display font-bold fill-ink">
        ${(cents / 100).toFixed(2)}
      </text>
    </g>
  );
}

function CardBar() {
  return (
    <>
      <polygon points={zigzagBar(CARD_X, CARD_KEPT_CENTS)} className="animate-bar-grow fill-line origin-bottom transform-fill" style={delayed(DELAY.card)} />
      <Band centerX={CARD_X} fromCents={CARD_KEPT_CENTS} toCents={ORDER_CENTS} className="fill-danger" delay={DELAY.fee} />
      <Callout x={CARD_X - BAR_WIDTH / 2 - LABEL_GAP} y={level((ORDER_CENTS + CARD_KEPT_CENTS) / 2)} anchor="end" figure={`−${CARD_FEE_CENTS}¢`} note="to Stripe" figureClass="fill-danger" delay={DELAY.fee} />
      <BarLabel centerX={CARD_X} name="Card" cents={ORDER_CENTS} delay={DELAY.card} />
    </>
  );
}

function AgentBar() {
  const rightEdge = AGENT_X + BAR_WIDTH / 2;
  return (
    <>
      <g className="animate-fade-in" style={delayed(DELAY.savings)}>
        <rect x={AGENT_X - BAR_WIDTH / 2} y={level(ORDER_CENTS)} width={BAR_WIDTH} height={CUSTOMER_SAVES_CENTS * PIXELS_PER_CENT} className="fill-accent-wash" />
        <line x1={CARD_X + BAR_WIDTH / 2} x2={rightEdge} y1={level(ORDER_CENTS)} y2={level(ORDER_CENTS)} strokeWidth={3} strokeDasharray="10 10" className="stroke-ink-muted" />
      </g>
      <Callout x={AGENT_X} y={level((ORDER_CENTS + AGENT_TOTAL_CENTS) / 2)} anchor="middle" figure={`−${CUSTOMER_SAVES_CENTS}¢`} note="customer saves" figureClass="fill-ink" delay={DELAY.savings} />
      <polygon points={zigzagBar(AGENT_X, CARD_KEPT_CENTS)} className="animate-bar-grow fill-line origin-bottom transform-fill" style={delayed(DELAY.agent)} />
      <Band centerX={AGENT_X} fromCents={CARD_KEPT_CENTS} toCents={AGENT_TOTAL_CENTS} className="fill-accent" delay={DELAY.gain} />
      <Callout x={rightEdge + LABEL_GAP} y={level((AGENT_TOTAL_CENTS + CARD_KEPT_CENTS) / 2) + 8} anchor="start" figure={`+${SHOP_GAIN_CENTS}¢`} note="shop keeps" figureClass="fill-accent-ink" delay={DELAY.gain} />
      <g className="animate-fade-in" style={delayed(DELAY.gas)}>
        <rect x={AGENT_X - BAR_WIDTH / 2} y={level(AGENT_TOTAL_CENTS) - 4} width={BAR_WIDTH} height={4} className="fill-danger" />
        <text x={rightEdge + LABEL_GAP} y={level(AGENT_TOTAL_CENTS) - 24} fontSize={22} className="fill-danger">
          0.001¢ gas
        </text>
      </g>
      <BarLabel centerX={AGENT_X} name="Agent" cents={AGENT_TOTAL_CENTS} delay={DELAY.agent} />
    </>
  );
}

export function PriceBars() {
  return (
    <svg
      viewBox="0 0 960 640"
      role="img"
      aria-label={`A $6.00 order. By card the shop keeps $5.54 after Stripe takes 46 cents. By agent the customer pays $5.72 and the shop keeps all of it, 18 cents more.`}
      className="h-full max-h-full w-full"
    >
      <CardBar />
      <AgentBar />
    </svg>
  );
}
