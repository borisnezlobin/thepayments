"use client";

import { Warning } from "@phosphor-icons/react";
import { inlineInputClasses } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { itemProblem, UNNAMED_SIZE_PROBLEM, type Dish, type DraftItem } from "./menuDraft";

function PriceInput({ item, label, onPrice }: { item: DraftItem; label: string; onPrice: (price: string) => void }) {
  const problem = itemProblem(item);
  const invalid = problem?.startsWith("Add a price") ?? false;
  return (
    <div className="relative w-24 shrink-0">
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-ink-muted">
        $
      </span>
      <input
        aria-label={label}
        inputMode="decimal"
        placeholder="0.00"
        value={item.price}
        onChange={(event) => onPrice(event.target.value)}
        aria-invalid={invalid || undefined}
        className={`${inlineInputClasses} tabular pl-5 text-right`}
      />
    </div>
  );
}

function SizeLine({ item, index, dishName, onChange }: { item: DraftItem; index: number; dishName: string; onChange: (patch: Partial<DraftItem>) => void }) {
  return (
    <li className="flex items-baseline gap-3">
      <input
        aria-label={`Size name for ${dishName}`}
        placeholder={`Size ${index + 1}, not named yet`}
        value={item.sizeLabel}
        onChange={(event) => onChange({ sizeLabel: event.target.value })}
        className={`${inlineInputClasses} flex-1 text-body`}
      />
      <PriceInput item={item} label={`Price for ${dishName}, ${item.sizeLabel || "this size"}`} onPrice={(price) => onChange({ price })} />
    </li>
  );
}

function DishProblems({ dish }: { dish: Dish }) {
  const problems = [...new Set(dish.items.map(itemProblem).filter((problem): problem is string => problem !== null && problem !== UNNAMED_SIZE_PROBLEM))];
  if (problems.length === 0) return null;
  return (
    <p className="flex items-center gap-1.5 px-2 text-caption font-semibold text-danger">
      <Warning size={14} weight="bold" aria-hidden />
      {problems.join(" ")}
    </p>
  );
}

export function DishRow({ dish, onChange }: { dish: Dish; onChange: (items: DraftItem[]) => void }) {
  const first = dish.items[0];
  const available = dish.items.some((item) => item.available);
  const setAll = (patch: Partial<DraftItem>) => onChange(dish.items.map((item) => ({ ...item, ...patch })));
  const setOne = (id: string, patch: Partial<DraftItem>) => onChange(dish.items.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  return (
    <li className={`flex gap-3 py-4 transition-[opacity] duration-150 ${available ? "" : "opacity-55"}`}>
      <div className="pt-1.5">
        <Switch label={`Agents can order ${first.name || "this item"}`} hideLabel checked={available} onChange={(event) => setAll({ available: event.target.checked })} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline gap-3">
          <input
            aria-label="Item name"
            value={first.name}
            onChange={(event) => setAll({ name: event.target.value })}
            className={`${inlineInputClasses} flex-1 text-body-lg font-semibold`}
          />
          {dish.sized ? null : <PriceInput item={first} label={`Price for ${first.name}`} onPrice={(price) => setOne(first.id, { price })} />}
        </div>
        <input
          aria-label={`Description for ${first.name}`}
          placeholder="Add a description"
          value={first.description}
          onChange={(event) => setAll({ description: event.target.value })}
          className={`${inlineInputClasses} text-body-sm text-ink-muted`}
        />
        {dish.sized ? (
          <ul aria-label={`Sizes of ${first.name}`} className="mt-1 ml-2 flex flex-col gap-0.5 border-l-2 border-line pl-2">
            {dish.items.map((item, index) => (
              <SizeLine key={item.id} item={item} index={index} dishName={first.name} onChange={(patch) => setOne(item.id, patch)} />
            ))}
          </ul>
        ) : null}
        <DishProblems dish={dish} />
      </div>
    </li>
  );
}
