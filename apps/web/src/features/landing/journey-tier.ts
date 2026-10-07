"use client";

import { useSyncExternalStore } from "react";

import type { Tier } from "./journey-model";

interface NavigatorHints extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

let current: Tier | null = null;
const listeners = new Set<() => void>();

/**
 * Decides how much of the flight a visitor gets. Full is the WebGL airliner, lite is the same
 * scroll maths driving an SVG airliner, off is a still sky for people who asked for less motion.
 * `?motion=full|lite|off` forces a tier so the experience can be tested and compared.
 */
function detect(): Tier {
  const forced = new URLSearchParams(window.location.search).get("motion");
  if (forced === "full" || forced === "lite" || forced === "off") return forced;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "off";

  const hints = navigator as NavigatorHints;
  // Automated browsers render WebGL in software, which is slow and makes tests flaky
  if (navigator.webdriver) return "lite";
  if (hints.connection?.saveData) return "lite";
  if ((hints.deviceMemory ?? 8) <= 2 || (navigator.hardwareConcurrency ?? 8) <= 2) return "lite";
  return "full";
}

function getSnapshot(): Tier {
  current ??= detect();
  return current;
}

// During server rendering and hydration nothing is known about the device; lite is a safe,
// cheap first paint that the 3D scene replaces once it has produced a frame.
function getServerSnapshot(): Tier {
  return "lite";
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Called when WebGL is missing, is software-rendered, or cannot keep up. */
export function demoteTier(to: Tier): void {
  if (current === to) return;
  current = to;
  listeners.forEach((listener) => listener());
}

export function useJourneyTier(): Tier {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
