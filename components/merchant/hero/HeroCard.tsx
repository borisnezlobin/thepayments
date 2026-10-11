"use client";

import dynamic from "next/dynamic";

const ShreddedCard = dynamic(() => import("./ShreddedCard"), { ssr: false });

export function HeroCard() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10">
      <ShreddedCard />
    </div>
  );
}
