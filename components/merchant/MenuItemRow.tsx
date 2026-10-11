"use client";

import { Warning } from "@phosphor-icons/react";
import { inputClasses } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { itemProblem, type DraftItem } from "./menuDraft";

export function MenuItemRow({ item, onChange }: { item: DraftItem; onChange: (next: DraftItem) => void }) {
  const problem = itemProblem(item);
  const problemId = `${item.id}-problem`;
  return (
    <li className={`flex gap-4 rounded-card p-4 transition-[background-color,opacity] duration-150 ${item.available ? "bg-surface shadow-ring" : "bg-surface-sunken"}`}>
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt="" className="size-16 shrink-0 rounded-control object-cover outline outline-1 -outline-offset-1 outline-black/10" />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor={`${item.id}-name`}>
            Item name
          </label>
          <input
            id={`${item.id}-name`}
            value={item.name}
            onChange={(event) => onChange({ ...item, name: event.target.value })}
            aria-describedby={problem ? problemId : undefined}
            className={`${inputClasses} font-semibold`}
          />
          <label className="sr-only" htmlFor={`${item.id}-price`}>
            Price for {item.name} in dollars
          </label>
          <div className="relative sm:w-32">
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-muted">
              $
            </span>
            <input
              id={`${item.id}-price`}
              inputMode="decimal"
              placeholder="0.00"
              value={item.price}
              onChange={(event) => onChange({ ...item, price: event.target.value })}
              aria-invalid={problem ? true : undefined}
              aria-describedby={problem ? problemId : undefined}
              className={`${inputClasses} tabular pl-7 text-right`}
            />
          </div>
        </div>
        <label className="sr-only" htmlFor={`${item.id}-description`}>
          Description for {item.name}
        </label>
        <input
          id={`${item.id}-description`}
          value={item.description}
          placeholder="Description (optional)"
          onChange={(event) => onChange({ ...item, description: event.target.value })}
          className={`${inputClasses} h-9`}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Switch label="Agents can order this" checked={item.available} onChange={(event) => onChange({ ...item, available: event.target.checked })} />
          {problem ? (
            <p id={problemId} className="inline-flex items-center gap-1.5 text-caption font-semibold text-danger">
              <Warning size={14} weight="bold" aria-hidden />
              {problem}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
