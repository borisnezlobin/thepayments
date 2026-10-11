"use client";

import type { MenuItem } from "@/lib/contract";
import { formatCents } from "@/lib/pricing";
import { QuantityStepper } from "./QuantityStepper";
import type { MenuCategory, MenuDish } from "./storefrontMenu";

export interface StepperState {
  quantities: Record<string, number>;
  interactive: boolean;
  setQuantity: (productId: string, quantity: number) => void;
}

function Price({ item }: { item: MenuItem }) {
  const discounted = item.agentPriceCents < item.priceCents;
  return (
    <span className="flex flex-col items-end leading-tight">
      <span className="tabular text-body font-semibold text-ink">{formatCents(item.agentPriceCents)}</span>
      {discounted ? (
        <span className="tabular text-caption text-ink-muted">
          <s>{formatCents(item.priceCents)}</s>
          <span className="sr-only"> regular price</span>
        </span>
      ) : null}
    </span>
  );
}

function OrderControl({ item, state }: { item: MenuItem; state: StepperState }) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <Price item={item} />
      <QuantityStepper
        productId={item.productId}
        name={item.name}
        quantity={state.quantities[item.productId] ?? 0}
        interactive={state.interactive}
        onChange={(quantity) => state.setQuantity(item.productId, quantity)}
      />
    </div>
  );
}

function DishEntry({ dish, state }: { dish: MenuDish; state: StepperState }) {
  const sized = dish.items.length > 1;
  return (
    <li className="flex flex-col gap-2 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-body-lg font-semibold">{dish.name}</h3>
          {dish.description ? <p className="line-clamp-2 text-body-sm text-ink-muted">{dish.description}</p> : null}
        </div>
        {sized ? null : <OrderControl item={dish.items[0]} state={state} />}
      </div>
      {sized ? (
        <ul aria-label={`Sizes of ${dish.name}`} className="flex flex-col gap-2">
          {dish.items.map((item) => (
            <li key={item.productId} className="flex items-center justify-between gap-4 rounded-control bg-surface-sunken py-1.5 pr-1.5 pl-4">
              <span className="text-body-sm font-semibold">{item.sizeLabel ?? item.name}</span>
              <OrderControl item={item} state={state} />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function StorefrontMenuList({ categories, state }: { categories: MenuCategory[]; state: StepperState }) {
  return (
    <div className="flex flex-col gap-12">
      {categories.map((category) => (
        <section key={category.anchor} id={category.anchor} aria-labelledby={`${category.anchor}-heading`} className="scroll-mt-24">
          <h2 id={`${category.anchor}-heading`} className="text-title font-bold">
            {category.name}
          </h2>
          <ul className="flex flex-col divide-y divide-line">
            {category.dishes.map((dish) => (
              <DishEntry key={dish.items[0].productId} dish={dish} state={state} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
