"use client";

import { SLIDES } from "./slides";
import { useIdleCursor, usePresentation } from "./usePresentation";

export function Presentation() {
  const { index, pointerHandlers } = usePresentation(SLIDES.length);
  const cursorIsIdle = useIdleCursor();
  const Slide = SLIDES[index];

  return (
    <main className={`fixed inset-0 overflow-hidden bg-surface select-none ${cursorIsIdle ? "cursor-none" : "cursor-default"}`} {...pointerHandlers}>
      <section key={index} aria-label={`Slide ${index + 1} of ${SLIDES.length}`} className="absolute inset-0 animate-slide-in">
        <Slide />
      </section>
    </main>
  );
}
