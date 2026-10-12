"use client";

import { useRef, type ReactNode } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

export function ShopGalleryRail({ children }: { children: ReactNode }) {
  const rail = useRef<HTMLDivElement>(null);
  function scroll(direction: number) {
    const element = rail.current;
    if (!element) return;
    element.scrollBy({
      left: direction * element.clientWidth * 0.8,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-body-sm text-ink-muted">
          Scroll to explore the shops
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="quiet"
            aria-label="Previous shops"
            onClick={() => scroll(-1)}
            icon={<CaretLeft size={20} aria-hidden />}
          />
          <Button
            type="button"
            variant="quiet"
            aria-label="Next shops"
            onClick={() => scroll(1)}
            icon={<CaretRight size={20} aria-hidden />}
          />
        </div>
      </div>
      <div
        ref={rail}
        role="region"
        aria-label="Published shops"
        tabIndex={0}
        className="flex min-w-0 snap-x snap-mandatory gap-6 overflow-x-auto pb-4"
      >
        {children}
      </div>
    </div>
  );
}
