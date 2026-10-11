"use client";

import { useEffect, useRef } from "react";
import { ShreddedCardStage } from "./shreddedCardStage";

export default function ShreddedCard() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const stage = new ShreddedCardStage(container);
    return () => stage.dispose();
  }, []);

  return <div ref={containerRef} className="size-full" />;
}
