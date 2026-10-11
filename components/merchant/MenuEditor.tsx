"use client";

import { CircleNotch, RocketLaunch } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SHOP_ADMIN_TOKEN_HEADER, type ApiError, type Product, type Shop, type UpdateShopRequest } from "@/lib/contract";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { DiscountPanel } from "./DiscountPanel";
import { MenuSectionList } from "./MenuSectionList";
import { groupMenu, itemProblem, menuNotes, nameSectionSizes, toDraftItem, toProductEdits, type DraftItem } from "./menuDraft";

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

function MenuOverview({ live, items }: { live: boolean; items: DraftItem[] }) {
  const notes = useMemo(() => menuNotes(items), [items]);
  const orderable = items.filter((item) => item.available && !itemProblem(item)).length;
  return (
    <>
      <div className="flex flex-col gap-1">
        <h2 id="menu-heading" className="text-title font-bold">
          {live ? "Your menu" : "Check what we found"}
        </h2>
        <p className="text-body-sm text-ink-muted">
          <span className="tabular font-semibold text-ink">{orderable}</span> of {items.length} items can be ordered by agents.
        </p>
      </div>
      {notes.length > 0 ? (
        <ul className="flex flex-col gap-1 rounded-control bg-accent-wash px-4 py-3 text-body-sm text-ink">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
      {items.length === 0 ? (
        <p className="rounded-card bg-surface-sunken p-6 text-body text-ink-muted">We didn&rsquo;t find any items on that page. Go back and paste the link to your menu page itself.</p>
      ) : null}
    </>
  );
}

function SaveControls({ live, state, items, shopName, onSave }: { live: boolean; state: SaveState; items: DraftItem[]; shopName: string; onSave: (publish: boolean) => void }) {
  const saving = state.phase === "saving";
  const problemCount = items.filter((item) => itemProblem(item)).length;
  const orderable = items.some((item) => item.available && !itemProblem(item));
  const blocked = saving || problemCount > 0 || !orderable || !shopName.trim();
  const publishIcon = live ? null : <RocketLaunch size={20} weight="bold" aria-hidden />;
  return (
    <div className="flex flex-col gap-2">
      <Button size="lg" onClick={() => onSave(!live)} disabled={blocked} icon={saving ? <CircleNotch size={20} weight="bold" className="animate-spin" aria-hidden /> : publishIcon}>
        {live ? "Save changes" : "Publish my storefront"}
      </Button>
      {live ? null : (
        <Button variant="quiet" onClick={() => onSave(false)} disabled={saving}>
          Save without publishing
        </Button>
      )}
      <p role="status" className={`min-h-5 text-body-sm ${state.phase === "failed" || problemCount > 0 ? "text-danger" : "text-ink-muted"}`}>
        {statusText(state, problemCount)}
      </p>
    </div>
  );
}

export function MenuEditor({ shop, products, token }: { shop: Shop; products: Product[]; token: string }) {
  const router = useRouter();
  const [items, setItems] = useState(() => products.map(toDraftItem));
  const [shopName, setShopName] = useState(shop.name);
  const [discountPct, setDiscountPct] = useState(shop.agentDiscountPct);
  const [state, setState] = useState<SaveState>({ phase: "idle" });
  const sections = useMemo(() => groupMenu(items), [items]);
  const live = shop.status === "live";

  function updateDish(changed: DraftItem[]) {
    const byId = new Map(changed.map((item) => [item.id, item]));
    setItems((current) => current.map((item) => byId.get(item.id) ?? item));
    setState({ phase: "idle" });
  }

  function nameSizes(category: string, labels: string[]) {
    setItems((current) => nameSectionSizes(current, category, labels));
    setState({ phase: "idle" });
  }

  async function save(publish: boolean) {
    setState({ phase: "saving" });
    try {
      await saveShop(shop.slug, token, { name: shopName.trim(), agentDiscountPct: discountPct, products: toProductEdits(items), publish: publish || undefined });
      setState({ phase: "saved" });
      router.push(publish ? `/m/${token}` : `/m/${token}/menu`);
      router.refresh();
    } catch (error) {
      setState({ phase: "failed", message: error instanceof Error ? error.message : "Saving failed. Try again." });
    }
  }

  return (
    <div className="grid gap-10 lg:layout-sidebar">
      <section aria-labelledby="menu-heading" className="flex flex-col gap-8">
        <MenuOverview live={live} items={items} />
        {sections.map((section) => (
          <MenuSectionList key={section.category} section={section} onDishChange={updateDish} onNameSizes={nameSizes} />
        ))}
      </section>
      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <Field
          label="Shop name"
          name="shop-name"
          value={shopName}
          onChange={(event) => (setShopName(event.target.value), setState({ phase: "idle" }))}
          hint="Agents and customers see this name."
        />
        <DiscountPanel discountPct={discountPct} onChange={(pct) => (setDiscountPct(pct), setState({ phase: "idle" }))} />
        <SaveControls live={live} state={state} items={items} shopName={shopName} onSave={save} />
      </aside>
    </div>
  );
}
