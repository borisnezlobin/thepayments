import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Suspense } from "react";
import {
  FeaturedShops,
  ShopGalleryHeading,
} from "@/components/buyer/FeaturedShops";
import { AgentOrderExample } from "@/components/merchant/AgentOrderExample";
import { FeeTicket } from "@/components/merchant/FeeTicket";
import { HeroCard } from "@/components/merchant/hero/HeroCard";
import { ImportForm } from "@/components/merchant/ImportForm";
import { Logo } from "@/components/ui/Logo";

const HERO_LINK =
  "inline-flex h-10 items-center rounded-control px-4 text-body-sm font-semibold text-ink transition-[background-color] duration-150 hover:bg-surface-sunken";

export default function Home() {
  return (
    <>
      <section className="relative isolate flex min-h-svh flex-col overflow-hidden">
        <HeroCard />
        <nav
          aria-label="For customers"
          className="mx-auto flex w-full max-w-6xl justify-end gap-2 px-6 pt-6"
        >
          <Link href="/shops" className={HERO_LINK}>
            Order from a shop
          </Link>
          <Link href="/signup" className={`${HERO_LINK} bg-surface-sunken`}>
            Sign up to order
          </Link>
        </nav>
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end gap-10 px-6 pt-56 pb-12 lg:justify-center lg:pt-8">
          <div className="flex max-w-xl flex-col gap-6">
            <h1>
              <Logo className="h-auto w-full max-w-sm sm:h-16 sm:w-auto sm:max-w-none" />
            </h1>
            <p className="font-display text-title font-bold">
              We cut card fees out of small-business orders by letting AI agents
              pay directly.
            </p>
            <ImportForm />
          </div>
        </div>
        <a
          href="#featured-shops"
          aria-label="Browse published shops"
          className="mx-auto mb-6 flex size-12 items-center justify-center rounded-pill text-ink transition-[background-color] duration-150 hover:bg-surface-sunken"
        >
          <CaretDown size={32} weight="bold" aria-hidden />
        </a>
      </section>
      <main className="mx-auto flex max-w-6xl flex-col gap-32 px-6 pt-16 pb-32">
        <section
          id="featured-shops"
          aria-labelledby="featured-shops-heading"
          className="flex scroll-mt-8 flex-col gap-8"
        >
          <ShopGalleryHeading />
          <Suspense
            fallback={
              <p className="text-body text-ink-muted">Loading shops…</p>
            }
          >
            <FeaturedShops />
          </Suspense>
        </section>
        <section
          id="card-fees"
          aria-labelledby="card-fees-heading"
          className="grid items-center gap-16 lg:layout-hero"
        >
          <div className="flex flex-col gap-6">
            <h2 id="card-fees-heading" className="text-display font-bold">
              What a card costs on one order
            </h2>
            <p className="max-w-xl text-body-lg text-ink-muted">
              Stripe charges 2.9% plus 30¢ on every online card payment. The
              fixed 30¢ is why small orders lose the most. Drag the price to see
              it.
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <FeeTicket />
          </div>
        </section>
        <AgentOrderExample />
      </main>
    </>
  );
}
