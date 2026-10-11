import type { Order } from "@/lib/contract";

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(iso: string, now: number) {
  const seconds = Math.round((Date.parse(iso) - now) / 1000);
  if (Math.abs(seconds) < 45) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
}

const EXPLORERS: Record<Order["chain"], (hash: string) => string> = {
  "base-sepolia": (hash) => `https://sepolia.basescan.org/tx/${hash}`,
  "xrpl-testnet": (hash) => `https://testnet.xrpl.org/transactions/${hash}`,
};

export function explorerLink(order: Pick<Order, "chain" | "txHash">) {
  return order.txHash ? EXPLORERS[order.chain](order.txHash) : undefined;
}

export function playOrderChime() {
  const context = new AudioContext();
  [880, 1320].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + index * 0.16;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.4);
  });
}
