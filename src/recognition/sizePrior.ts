/**
 * A symbol's size and height on its line, as evidence for what it is - what
 * the classifier can't see, since it gets every symbol scaled to fill the
 * same 28x28 grid: a "." and a "0", a "," and a "1", a "-" and an "_" look
 * alike there, but not next to the digits around them.
 *
 * sizePrior.json holds, per character, how often it was seen at each
 * (relative height, vertical offset) - counted on real handwriting by
 * scripts/ts/extractContext.ts. `sizeWeights` turns that into a factor per
 * class that the recognizer multiplies its probabilities by, gently: an
 * unusual place for a character only weighs against it, never rules it out,
 * and a place no character is usually seen at (an exponent, high and small)
 * changes nothing.
 */
import prior from "./sizePrior.json";

/** Height relative to the line's tall symbols: a dot, a small mark, an x-height letter, a digit, a tall bracket. */
export const REL_H_EDGES = [0.2, 0.35, 0.5, 0.65, 0.8, 1.0, 1.25, 1.6];
/** Centre relative to the line's middle, in line heights (negative is up): raised, on the line, low. */
export const DY_EDGES = [-0.45, -0.25, -0.1, 0.1, 0.25, 0.45];

interface Box {
  minY: number;
  maxY: number;
  cy: number;
  height: number;
}

export function binOf(v: number, edges: readonly number[]): number {
  let i = 0;
  while (i < edges.length && v >= edges[i]) i++;
  return i;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/**
 * A symbol's height and vertical offset relative to its line: the symbols
 * beside it (overlapping its height band), measured against the tall ones
 * among them - so a dot is small next to digits, and a digit is 1.
 */
export function symbolContext(box: Box, all: readonly Box[]): { relH: number; dy: number } {
  const neighbours = all.filter((b) => b.minY < box.maxY + box.height && b.maxY > box.minY - box.height);
  const tallest = Math.max(...neighbours.map((b) => b.height), box.height);
  const tall = neighbours.filter((b) => b.height >= tallest * 0.5);
  const refH = Math.max(1e-6, median(tall.map((b) => b.height)));
  const mid = median(tall.map((b) => b.cy));
  return { relH: box.height / refH, dy: (box.cy - mid) / refH };
}

interface PriorFile {
  relHEdges: number[];
  dyEdges: number[];
  classes: Record<string, { n: number; counts: number[] }>;
}

const PRIOR = prior as PriorFile;
const BINS = (REL_H_EDGES.length + 1) * (DY_EDGES.length + 1);
/** How much of each character's distribution is spread evenly over every place - so nothing is ever ruled out. */
const SPREAD = 0.15;
/** Below this many samples a character's own counts are too few to go by - it's treated as neutral. */
const MIN_SAMPLES = 40;

/** P(place | character), smoothed - or null where there's too little data for that character. */
function placeProbability(char: string, bin: number): number | null {
  const c = PRIOR.classes[char];
  if (!c || c.n < MIN_SAMPLES) return null;
  return (1 - SPREAD) * (c.counts[bin] / c.n) + SPREAD / BINS;
}

/** True when sizePrior.json has been built (it ships empty until extractContext.ts has run). */
export function hasSizePrior(): boolean {
  return Object.keys(PRIOR.classes).length > 0;
}

/**
 * A factor per label for a symbol at this place on its line - each label's
 * P(place | label) to the power `weight`, scaled so the labels average 1.
 * Characters without enough data get the average (neutral).
 */
export function sizeWeights(labels: readonly string[], relH: number, dy: number, weight = 0.6): number[] {
  if (!hasSizePrior()) return labels.map(() => 1);
  const bin = binOf(relH, REL_H_EDGES) * (DY_EDGES.length + 1) + binOf(dy, DY_EDGES);
  const raw = labels.map((l) => placeProbability(l, bin));
  const known = raw.filter((p): p is number => p !== null);
  const fallback = known.length > 0 ? known.reduce((a, b) => a + b, 0) / known.length : 1;
  const factors = raw.map((p) => (p ?? fallback) ** weight);
  const mean = factors.reduce((a, b) => a + b, 0) / factors.length;
  return factors.map((f) => f / mean);
}
