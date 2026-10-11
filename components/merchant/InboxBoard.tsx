"use client";

import { SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import type { Shop } from "@/lib/contract";
import type { InboxResponse } from "@/lib/shops/summary";
import { Button } from "@/components/ui/Button";
import { MoneyPanel } from "./MoneyPanel";
import { OrderTicket } from "./OrderTicket";
import { useInbox } from "./useInbox";

function EmptyInbox({ slug }: { slug: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card bg-surface-sunken p-8">
      <span
        aria-hidden
        className="size-3 animate-pulse-ring rounded-pill bg-accent"
      />
      <p className="text-body-lg font-semibold">
        Waiting for the first agent order
      </p>
      <p className="max-w-md text-body-sm text-ink-muted">
        New orders print here as tickets. Leave this page open on the counter.
        Agents find you at{" "}
        <span className="font-semibold text-ink">/s/{slug}</span>.
      </p>
    </div>
  );
}

export function InboxBoard({
  shop,
  token,
  initial,
}: {
  shop: Shop;
  token: string;
  initial: InboxResponse;
}) {
  const inbox = useInbox(shop.slug, token, initial);
  const open = inbox.data.orders.filter(
    (order) => order.status !== "picked_up",
  );
  const done = inbox.data.orders.filter(
    (order) => order.status === "picked_up",
  );

  return (
    <div className="grid gap-10 lg:layout-sidebar">
      <section aria-labelledby="orders-heading" className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="orders-heading" className="text-title font-bold">
            Orders <span className="tabular text-ink-muted">{open.length}</span>
          </h2>
          <Button
            variant="quiet"
            aria-pressed={inbox.soundOn}
            onClick={inbox.enableSound}
            icon={
              inbox.soundOn ? (
                <SpeakerHigh size={16} weight="bold" aria-hidden />
              ) : (
                <SpeakerSlash size={16} weight="bold" aria-hidden />
              )
            }
          >
            {inbox.soundOn ? "Chime on" : "Chime when an order arrives"}
          </Button>
        </div>
        {inbox.error ? (
          <p
            role="alert"
            className="rounded-control bg-surface-sunken px-4 py-3 text-body-sm font-semibold text-danger"
          >
            {inbox.error}
          </p>
        ) : null}
        {open.length === 0 ? <EmptyInbox slug={shop.slug} /> : null}
        <ul aria-live="polite" className="grid gap-6 xl:grid-cols-2">
          {open.map((order) => (
            <OrderTicket
              key={order.id}
              order={order}
              fresh={inbox.freshIds.has(order.id)}
              busy={inbox.busyOrderId === order.id}
              now={inbox.now}
              onAdvance={() => inbox.advance(order.id)}
            />
          ))}
        </ul>
        {done.length > 0 ? (
          <details className="group flex flex-col gap-4">
            <summary className="cursor-pointer text-body-sm font-semibold text-ink-muted hover:text-ink">
              {done.length} picked up
            </summary>
            <ul className="mt-4 grid gap-6 xl:grid-cols-2">
              {done.map((order) => (
                <OrderTicket
                  key={order.id}
                  order={order}
                  fresh={false}
                  busy={false}
                  now={inbox.now}
                  onAdvance={() => undefined}
                />
              ))}
            </ul>
          </details>
        ) : null}
      </section>
      <MoneyPanel
        data={inbox.data}
        withdrawing={inbox.withdrawing}
        onWithdraw={inbox.withdraw}
        withdrawalPending={inbox.withdrawalPending}
      />
    </div>
  );
}
