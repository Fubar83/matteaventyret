/**
 * Deterministic, seedable PRNG (mulberry32). No external dependency.
 * Same seed always produces the same sequence, so rounds and bug reports
 * are reproducible.
 */
export type Rng = () => number;

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return function mulberry32() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random integer in [min, max], inclusive. */
export function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Random element of a non-empty array. */
export function choice<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error("choice: empty array");
  return items[randInt(rng, 0, items.length - 1)];
}

/** Fisher-Yates shuffle, returns a new array. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
