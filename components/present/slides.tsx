import type { ReactNode } from "react";
import { HeroCard } from "@/components/merchant/hero/HeroCard";
import { Logo } from "@/components/ui/Logo";
import { CentGrid, CentLegend } from "./CentGrid";
import { COFFEE } from "./coffeeMath";
import { PriceBars } from "./PriceBars";

const SITE = "thepayments.vercel.app";

function SlideFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto flex size-full max-w-7xl flex-col justify-center gap-8 px-6 md:px-16 ${className}`}>{children}</div>;
}

function TitleSlide() {
  return (
    <div className="relative isolate size-full">
      <HeroCard />
      <div className="mx-auto flex size-full max-w-6xl flex-col justify-end px-6 pb-16 lg:justify-center lg:pb-0">
        <h1>
          <Logo className="h-auto w-full max-w-sm sm:h-20 sm:w-auto sm:max-w-none" />
        </h1>
      </div>
    </div>
  );
}

function ProblemSlide() {
  return (
    <SlideFrame className="gap-10">
      <h2 className="max-w-5xl text-display font-bold md:text-display-xl">Stripe takes almost as much from a $5.50 coffee as the café keeps.</h2>
      <CentGrid />
      <CentLegend />
      <p className="text-body-sm text-ink-muted">
        Each dot is 1¢. BizBuySell puts the average US coffee shop&rsquo;s 2021 profit at {COFFEE.cafeProfitPct}% of sales.
      </p>
    </SlideFrame>
  );
}

function PitchSlide() {
  return (
    <SlideFrame>
      <h2 className="max-w-5xl text-display font-bold md:text-display-xl">We cut card fees out of small-business orders by letting AI agents pay directly.</h2>
    </SlideFrame>
  );
}

function BarsSlide() {
  return (
    <SlideFrame>
      <PriceBars />
    </SlideFrame>
  );
}

function LiveSlide() {
  return (
    <SlideFrame>
      <h2 className="flex flex-col items-start gap-6 text-poster font-bold md:flex-row md:gap-10">
        <span aria-hidden className="size-8 shrink-0 animate-pulse-ring rounded-pill bg-accent md:mt-10 md:size-12" />
        <span>In production</span>
      </h2>
    </SlideFrame>
  );
}

function ClosingSlide() {
  return (
    <SlideFrame className="gap-10">
      <h2>
        <Logo className="h-auto w-full max-w-md md:h-32 md:w-auto md:max-w-none" />
      </h2>
      <p className="font-display text-title font-bold text-accent-ink md:text-display">{SITE}</p>
    </SlideFrame>
  );
}

export const SLIDES = [TitleSlide, ProblemSlide, PitchSlide, BarsSlide, LiveSlide, ClosingSlide];
