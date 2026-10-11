"use client";

import { Minus, Plus } from "@phosphor-icons/react";

const MAX_QUANTITY = 20;

const stepButton =
  "flex size-9 shrink-0 items-center justify-center rounded-pill bg-surface text-ink shadow-ring transition-[background-color,scale] duration-150 hover:bg-surface-sunken active:scale-[0.96] disabled:opacity-40";

export function QuantityStepper({
  productId,
  name,
  quantity,
  interactive,
  onChange,
}: {
  productId: string;
  name: string;
  quantity: number;
  interactive: boolean;
  onChange: (quantity: number) => void;
}) {
  const clamp = (value: number) => Math.max(0, Math.min(MAX_QUANTITY, value));
  return (
    <div className={`flex items-center gap-1 rounded-pill p-0.5 ${quantity > 0 ? "bg-accent-wash" : ""}`}>
      {interactive ? (
        <button type="button" className={stepButton} aria-label={`Remove one ${name}`} disabled={quantity === 0} onClick={() => onChange(clamp(quantity - 1))}>
          <Minus size={16} weight="bold" aria-hidden />
        </button>
      ) : null}
      <input
        type="number"
        name={`qty_${productId}`}
        aria-label={`Quantity for ${name}`}
        min={0}
        max={MAX_QUANTITY}
        step={1}
        inputMode="numeric"
        value={quantity}
        onChange={(event) => onChange(clamp(Math.trunc(Number(event.target.value) || 0)))}
        className="tabular no-spinner w-10 rounded-control border-0 bg-transparent p-0 text-center text-body font-semibold text-ink focus:outline-none focus-visible:shadow-ring"
      />
      {interactive ? (
        <button type="button" className={stepButton} aria-label={`Add one ${name}`} disabled={quantity === MAX_QUANTITY} onClick={() => onChange(clamp(quantity + 1))}>
          <Plus size={16} weight="bold" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
