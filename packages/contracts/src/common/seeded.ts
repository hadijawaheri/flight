/**
 * Deterministic pseudo-randomness. The simulated flight provider must return the same
 * schedule, seats and prices for the same inputs, otherwise a quoted fare could not be re-verified.
 */

/** FNV-1a 32-bit hash. */
export function hash32(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: small, fast, good enough distribution for simulation. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRandom(key: string): () => number {
  return mulberry32(hash32(key));
}

/** Stable value in [0, 1) for a key; use when a single number is enough. */
export function unitFromKey(key: string): number {
  return seededRandom(key)();
}

export function pickFrom<T>(random: () => number, items: readonly T[]): T {
  if (items.length === 0) throw new Error("pickFrom requires a non-empty list");
  return items[Math.floor(random() * items.length)] as T;
}

export function randomBetween(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

export function randomIntBetween(random: () => number, min: number, max: number): number {
  return Math.floor(randomBetween(random, min, max + 1));
}
