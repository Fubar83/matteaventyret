/**
 * Recognition by the pen's path: how closely ink follows a path it's
 * compared with - point by point along the way it was drawn, so the order
 * and direction count, not just the picture. An 8 drawn the way
 * Skrivskolan teaches it (from the top right, over the top loop, across,
 * round the bottom and back up) follows the taught 8's path; an "s" or a 3
 * on the same spot does not.
 *
 * Two kinds of paths to compare with:
 *  - the taught way of writing each character (strokeTemplates.ts) - in
 *    Skrivskolan, where that's what's being written (in the question types
 *    it was measured to cost a little on real writing, see recognizeExpression.ts);
 *  - this child's own earlier writing (personal.ts) - each symbol they've
 *    written in Skrivskolan or confirmed under "Menade du?", on this device.
 *
 * Paths are compared with dynamic time warping: each point of one matched to
 * a point of the other in order, letting one be drawn faster in places.
 */
import type { Stroke } from "./preprocess";
import { resampleStrokes, STROKE_POINTS } from "./strokeFeatures";
import { STROKE_TEMPLATES } from "./strokeTemplates";

/** How far (in point steps) a match may run ahead or behind - keeps the order, allows for speed. */
const BAND = 10;
/** What a stroke too many or too few adds to the distance. */
const STROKE_COUNT_PENALTY = 0.12;
/** The distance at which a match counts about a third (exp(-1)): tuned on simulated taught writing (scripts/ts/benchmarkPaths.ts). */
export const MATCH_SCALE = { template: 0.22, personal: 0.25 };
/**
 * How much more a perfectly matching character counts: up to 1 + this.
 * Measured (benchmarkPaths.ts): taught writing 91.5% -> 92.6% of symbols
 * read right, a child's own style with three remembered samples 72% -> 85%,
 * real adult writing unchanged (93.1% -> 92.9%).
 */
export const MATCH_BOOST = { template: 4, personal: 10 };

/** A symbol's pen path: STROKE_POINTS points of [x, y, pen just came down], centred and scaled (strokeFeatures.ts). */
export function pathOf(strokes: readonly Stroke[]): Float32Array {
  return resampleStrokes(strokes);
}

function strokeCount(path: ArrayLike<number>): number {
  let n = 0;
  for (let k = 0; k < STROKE_POINTS; k++) n += path[k * 3 + 2] === 1 ? 1 : 0;
  return n;
}

/** How far apart two paths are: the average distance between matched points (in half the symbol's size), plus a little per stroke too many or few. */
export function pathDistance(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = STROKE_POINTS;
  const INF = Number.POSITIVE_INFINITY;
  // cost[i][j]: the cheapest matching of a's first i+1 points with b's first j+1.
  let prev = new Float64Array(n).fill(INF);
  let cur = new Float64Array(n).fill(INF);
  for (let i = 0; i < n; i++) {
    cur.fill(INF);
    const lo = Math.max(0, i - BAND);
    const hi = Math.min(n - 1, i + BAND);
    for (let j = lo; j <= hi; j++) {
      const d = Math.hypot(a[i * 3] - b[j * 3], a[i * 3 + 1] - b[j * 3 + 1]);
      const before = i === 0 && j === 0 ? 0 : Math.min(i > 0 ? prev[j] : INF, j > 0 ? cur[j - 1] : INF, i > 0 && j > 0 ? prev[j - 1] : INF);
      cur[j] = d + before;
    }
    [prev, cur] = [cur, prev];
  }
  // The summed distance along the cheapest matching, per point of one path - the average gap, near enough.
  return prev[n - 1] / n + Math.abs(strokeCount(a) - strokeCount(b)) * STROKE_COUNT_PENALTY;
}

/** 0-1: how well a distance counts as a match (1 the same path, about 0 for a different one). */
export function matchQuality(distance: number, scale: number): number {
  return Math.exp(-((distance / scale) ** 2));
}

/**
 * Each taught character's path, at the proportions it's written at: digits
 * and brackets taller than wide, an "=" wider than tall (the templates
 * themselves are drawn in a square).
 */
const PROPORTIONS: Record<string, [number, number]> = { "(": [0.35, 1], ")": [0.35, 1], "/": [0.55, 1], ",": [0.35, 0.6], "-": [1, 0.05], "=": [1, 0.6], "+": [1, 1], x: [1, 1] };
const TEMPLATE_PATHS: ReadonlyMap<string, Float32Array> = new Map(
  Object.entries(STROKE_TEMPLATES).map(([char, strokes]) => {
    const [w, h] = PROPORTIONS[char] ?? [0.6, 1];
    return [char, pathOf(strokes.map((s) => s.map((p) => ({ x: p.x * w * 100, y: p.y * h * 100 }))))];
  })
);

/**
 * A factor per label from how closely the ink follows each character's
 * taught path: above 1 for the ones it follows (up to 1 + MATCH_BOOST),
 * exactly 1 for the rest and for characters without a taught way.
 */
export function templateFactors(strokes: readonly Stroke[], labels: readonly string[]): number[] {
  const path = pathOf(strokes);
  return labels.map((c) => {
    const template = TEMPLATE_PATHS.get(c);
    return template ? 1 + MATCH_BOOST.template * matchQuality(pathDistance(path, template), MATCH_SCALE.template) : 1;
  });
}

/** The same, against paths of this child's own writing: per character, the closest of its samples counts. */
export function personalPathFactors(strokes: readonly Stroke[], labels: readonly string[], samples: readonly { char: string; path?: readonly number[] }[]): number[] | null {
  const withPaths = samples.filter((s) => s.path && s.path.length === STROKE_POINTS * 3 && labels.includes(s.char));
  if (withPaths.length === 0) return null;
  const path = pathOf(strokes);
  const best = new Map<string, number>();
  for (const s of withPaths) best.set(s.char, Math.max(best.get(s.char) ?? 0, matchQuality(pathDistance(path, s.path!), MATCH_SCALE.personal)));
  return labels.map((c) => 1 + MATCH_BOOST.personal * (best.get(c) ?? 0));
}
