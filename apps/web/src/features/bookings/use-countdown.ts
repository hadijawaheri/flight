"use client";

import { useSyncExternalStore } from "react";

import { secondsUntil } from "./countdown";

function subscribe(onTick: () => void): () => void {
  const timer = window.setInterval(onTick, 1000);
  return () => window.clearInterval(timer);
}

// Whole seconds keep the snapshot stable between reads inside one tick.
const clientNow = (): number => Math.floor(Date.now() / 1000) * 1000;
const serverNow = (): null => null;

/** Seconds left until `isoTarget`; null on the server and until mounted, so markup never mismatches. */
export function useCountdown(isoTarget: string | null): number | null {
  const now = useSyncExternalStore(subscribe, clientNow, serverNow);
  if (!isoTarget || now === null) return null;
  return secondsUntil(isoTarget, now);
}
