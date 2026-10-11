"use client";

import { CircleNotch, RocketLaunch } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SHOP_ADMIN_TOKEN_HEADER, type ApiError, type Product, type Shop, type UpdateShopRequest } from "@/lib/contract";
import { Button } from "@/components/ui/Button";
import { DiscountPanel } from "./DiscountPanel";
import { MenuItemRow } from "./MenuItemRow";
import { groupByCategory, itemProblem, toDraftItem, toProductEdits, type DraftItem } from "./menuDraft";

type SaveState = { phase: "idle" | "saving" | "saved" } | { phase: "failed"; message: string };

async function saveShop(slug: string, token: string, request: UpdateShopRequest) {
  const response = await fetch(`/api/shops/${slug}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", [SHOP_ADMIN_TOKEN_HEADER]: token },
    body: JSON.stringify(request),
  });
  if (response.ok) return;
  const body = (await response.json().catch(() => ({ error: "Saving failed. Try again." }))) as ApiError;
  throw new Error(body.error);
}

function statusText(state: SaveState, problemCount: number) {
  if (state.phase === "failed") return state.message;
  if (state.phase === "saving") return "Saving";
  if (state.phase === "saved") return "Saved";
  if (problemCount === 1) return "One item needs attention before you publish.";
  if (problemCount > 1) return `${problemCount} items need attention before you publish.`;
  return "";
}

export function MenuEditor({ shop, products, token }: { shop: Shop; products: Product[]; token: string }) {
  const router = useRouter();
  const [items, setItems] = useState(() => products.map(toDraftItem));
  const [discountPct, setDiscountPct] = useState(shop.agentDiscountPct);
  const [state, setState] = useState<SaveState>({ phase: "idle" });
  const groups = useMemo(() => groupByCategory(items), [items]);
  const problemCount = items.filter((item) => itemProblem(item)).length;
  const orderableCount = items.filter((item) => item.available && !itemProblem(item)).length;
  const live = shop.status === "live";

  function update(next: DraftItem) {
    setItems((current) => current.map((item) => (item.id === next.id ? next : item)));
    setState({ phase: "idle" });
  }

  async function save(publish: boolean) {
    setState({ phase: "saving" });
    try {
      await saveShop(shop.slug, token, { agentDiscountPct: discountPct, products: toProductEdits(items), publish: publish || undefined });
      setState({ phase: "saved" });
      router.push(publish ? `/m/${token}` : `/m/${token}/menu`);
      router.refresh();
    } catch (error) {
      setState({ phase: "failed", message: error instanceof Error ? error.message : "Saving failed. Try again." });
    }
  }

  const saving = state.phase === "saving";

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <section aria-labelledby="menu-heading" className="flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h2 id="menu-heading" className="text-title font-bold">
            {live ? "Your menu" : "Check what we found"}
          </h2>
          <p className="text-body-sm text-ink-muted">
            <span className="tabular font-semibold text-ink">{orderableCount}</span> of {items.length} items can be ordered by agents.
          </p>
        </div>
        {items.length === 0 ? (
          <p className="rounded-card bg-surface-sunken p-6 text-body text-ink-muted">We didn&rsquo;t find any items on that page. Go back and paste the link to your menu page itself.</p>
        ) : null}
        {groups.map(([category, groupItems]) => (
          <div key={category} className="flex flex-col gap-3">
            <h3 className="text-body-lg font-bold">{category}</h3>
            <ul className="flex flex-col gap-3">
              {groupItems.map((item) => (
                <MenuItemRow key={item.id} item={item} onChange={update} />
              ))}
            </ul>
          </div>
        ))}
      </section>
      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <DiscountPanel discountPct={discountPct} onChange={(pct) => (setDiscountPct(pct), setState({ phase: "idle" }))} />
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            onClick={() => save(!live)}
            disabled={saving || problemCount > 0 || orderableCount === 0}
            icon={saving ? <CircleNotch size={20} weight="bold" className="animate-spin" aria-hidden /> : live ? null : <RocketLaunch size={20} weight="bold" aria-hidden />}
          >
            {live ? "Save changes" : "Publish my storefront"}
          </Button>
          {live ? null : (
            <Button variant="quiet" onClick={() => save(false)} disabled={saving}>
              Save without publishing
            </Button>
          )}
          <p role="status" className={`min-h-5 text-body-sm ${state.phase === "failed" || problemCount > 0 ? "text-danger" : "text-ink-muted"}`}>
            {statusText(state, problemCount)}
          </p>
        </div>
      </aside>
    </div>
  );
}
