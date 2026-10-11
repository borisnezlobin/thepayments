import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { Shop } from "@/lib/contract";
import { Wordmark } from "@/components/ui/Wordmark";
import { CopyLinkButton } from "./CopyLinkButton";

type Section = "orders" | "menu";

const NAV: { section: Section; label: string; path: (token: string) => string }[] = [
  { section: "orders", label: "Orders and money", path: (token) => `/m/${token}` },
  { section: "menu", label: "Menu", path: (token) => `/m/${token}/menu` },
];

export function MerchantHeader({ shop, token, current }: { shop: Shop; token: string; current: Section }) {
  const live = shop.status === "live";
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Wordmark />
          <div className="flex flex-wrap items-center gap-2">
            <CopyLinkButton path={`/m/${token}`} label="Copy dashboard link" />
            {live ? (
              <Link
                href={`/s/${shop.slug}`}
                target="_blank"
                className="inline-flex h-10 items-center gap-2 rounded-control bg-ink px-4 text-body-sm font-semibold text-surface transition-[background-color] duration-150 hover:bg-ink/90"
              >
                Open storefront
                <ArrowSquareOut size={16} weight="bold" aria-hidden />
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-title font-extrabold sm:text-display">{shop.name}</h1>
            <span
              className={`inline-flex h-7 items-center gap-1.5 rounded-pill px-3 text-caption font-semibold ${live ? "bg-accent text-on-accent" : "bg-surface-sunken text-ink-muted"}`}
            >
              <span aria-hidden className={`size-2 rounded-pill ${live ? "bg-on-accent" : "bg-ink-muted"}`} />
              {live ? "Live" : "Draft"}
            </span>
          </div>
        </div>
        <nav aria-label="Dashboard" className="-mb-px flex gap-6">
          {NAV.filter((item) => live || item.section === "menu").map((item) => (
            <Link
              key={item.section}
              href={item.path(token)}
              aria-current={item.section === current ? "page" : undefined}
              className="border-b-2 border-transparent pb-3 text-body-sm font-semibold text-ink-muted transition-[color,border-color] duration-150 hover:text-ink aria-[current=page]:border-accent aria-[current=page]:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
