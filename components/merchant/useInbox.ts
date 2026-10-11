"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SHOP_ADMIN_TOKEN_HEADER, type ApiError, type Order } from "@/lib/contract";
import type { InboxResponse } from "@/lib/shops/summary";
import { playOrderChime } from "./orderFormat";

const POLL_MS = 2000;

async function request<T>(url: string, token: string, method = "GET"): Promise<T> {
  const response = await fetch(url, { method, headers: { [SHOP_ADMIN_TOKEN_HEADER]: token }, cache: "no-store" });
  const body = (await response.json()) as T | ApiError;
  if (!response.ok) throw new Error((body as ApiError).error ?? "Something went wrong.");
  return body as T;
}

function newPaidIds(previous: Set<string> | null, orders: Order[]) {
  if (!previous) return [];
  return orders.filter((order) => order.status === "paid" && !previous.has(order.id)).map((order) => order.id);
}

export function useInbox(slug: string, token: string, initial: InboxResponse) {
  const [data, setData] = useState(initial);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [soundOn, setSoundOn] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const seen = useRef<Set<string> | null>(new Set(initial.orders.map((order) => order.id)));
  const soundRef = useRef(soundOn);

  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  const refresh = useCallback(async () => {
    const next = await request<InboxResponse>(`/api/shops/${slug}/inbox`, token);
    const arrivals = newPaidIds(seen.current, next.orders);
    seen.current = new Set(next.orders.map((order) => order.id));
    if (arrivals.length > 0) {
      setFreshIds(new Set(arrivals));
      if (soundRef.current) playOrderChime();
    }
    setData(next);
    setNow(Date.now());
  }, [slug, token]);

  useEffect(() => {
    const timer = window.setInterval(() => refresh().catch(() => undefined), POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function advance(orderId: string) {
    setBusyOrderId(orderId);
    setError(null);
    try {
      await request<Order>(`/api/shops/${slug}/inbox/${orderId}`, token, "POST");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That didn't work. Try again.");
    } finally {
      setBusyOrderId(null);
    }
  }

  async function withdraw() {
    setWithdrawing(true);
    setError(null);
    try {
      await request(`/api/shops/${slug}/withdraw`, token, "POST");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The withdrawal didn't go through. Try again.");
    } finally {
      setWithdrawing(false);
    }
  }

  function enableSound() {
    setSoundOn((on) => {
      if (!on) playOrderChime();
      return !on;
    });
  }

  return { data, freshIds, soundOn, enableSound, busyOrderId, advance, withdrawing, withdraw, error, now };
}
