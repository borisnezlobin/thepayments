"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import { DishRow } from "./DishRow";
import { unnamedSizeCount, type DraftItem, type MenuSection } from "./menuDraft";

const SIZE_PLACEHOLDERS = ["Smallest, like Half or Cup", "Next size up, like Full or Bowl", "Next size up", "Largest"];

function SizeNamer({ category, count, onApply }: { category: string; count: number; onApply: (labels: string[]) => void }) {
  const [labels, setLabels] = useState<string[]>(() => Array.from({ length: count }, () => ""));
  const ready = labels.every((label) => label.trim());

  function submit(event: FormEvent) {
    event.preventDefault();
    if (ready) onApply(labels);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-card bg-accent-wash p-4">
      <p className="text-body-sm text-ink">
        Your site shows a price range for some of these dishes but doesn&rsquo;t name the sizes. Name them once, smallest first. We&rsquo;ll use the names for every dish in {category}.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        {labels.map((label, index) => (
          <input
            key={index}
            aria-label={`Size ${index + 1} name for ${category}`}
            placeholder={SIZE_PLACEHOLDERS[index] ?? "Size name"}
            value={label}
            onChange={(event) => setLabels((current) => current.map((entry, at) => (at === index ? event.target.value : entry)))}
            className={`${inputClasses} sm:flex-1`}
          />
        ))}
        <Button type="submit" variant="secondary" disabled={!ready} className="h-11">
          Name the sizes
        </Button>
      </div>
    </form>
  );
}

export function MenuSectionList({
  section,
  onDishChange,
  onNameSizes,
}: {
  section: MenuSection;
  onDishChange: (items: DraftItem[]) => void;
  onNameSizes: (category: string, labels: string[]) => void;
}) {
  const unnamed = unnamedSizeCount(section);
  return (
    <section aria-label={section.category} className="flex flex-col gap-3">
      <h3 className="text-title font-bold">{section.category}</h3>
      {unnamed > 0 ? <SizeNamer key={unnamed} category={section.category} count={unnamed} onApply={(labels) => onNameSizes(section.category, labels)} /> : null}
      <ul className="flex flex-col divide-y divide-line">
        {section.dishes.map((dish) => (
          <DishRow key={dish.key} dish={dish} onChange={onDishChange} />
        ))}
      </ul>
    </section>
  );
}
