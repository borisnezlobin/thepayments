"use client";

import { CircleNotch } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ApiError, ImportShopResponse } from "@/lib/contract";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";

type ImportState = { phase: "idle" } | { phase: "reading" } | { phase: "failed"; message: string };

async function importShop(url: string): Promise<ImportShopResponse> {
  const response = await fetch("/api/shops/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const body = (await response.json()) as ImportShopResponse | ApiError;
  if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : "We couldn't read that page.");
  return body;
}

const STATUS_TONE = {
  light: { idle: "text-ink-muted", failed: "text-danger" },
  dark: { idle: "text-surface/80", failed: "font-semibold text-surface" },
} as const;

export function ImportForm({ tone = "light" }: { tone?: keyof typeof STATUS_TONE }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [state, setState] = useState<ImportState>({ phase: "idle" });
  const reading = state.phase === "reading";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState({ phase: "reading" });
    try {
      const { adminToken } = await importShop(url);
      router.push(`/m/${adminToken}/menu`);
    } catch (error) {
      setState({ phase: "failed", message: error instanceof Error ? error.message : "We couldn't read that page." });
    }
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-xl flex-col gap-2" aria-busy={reading}>
      <label htmlFor="shop-url" className="sr-only">
        Your shop&rsquo;s website
      </label>
      <div className="flex flex-col gap-2 rounded-card bg-surface p-2 shadow-raised sm:flex-row">
        <input
          id="shop-url"
          name="url"
          type="text"
          inputMode="url"
          autoComplete="url"
          required
          placeholder="yourshop.com/menu"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          disabled={reading}
          aria-invalid={state.phase === "failed" ? true : undefined}
          aria-describedby="shop-url-status"
          className={`${inputClasses} h-13 border-transparent sm:text-body`}
        />
        <Button type="submit" size="lg" disabled={reading} icon={reading ? <CircleNotch size={20} weight="bold" className="animate-spin" aria-hidden /> : null}>
          {reading ? "Reading your menu" : "Build my storefront"}
        </Button>
      </div>
      <p id="shop-url-status" role="status" className={`min-h-5 px-2 text-body-sm ${state.phase === "failed" ? STATUS_TONE[tone].failed : STATUS_TONE[tone].idle}`}>
        {state.phase === "failed" ? state.message : reading ? "This usually takes 15 to 30 seconds." : "Paste the page that lists your menu and prices."}
      </p>
    </form>
  );
}
