/**
 * The learned half of segmentation: for two strokes on a page, how likely
 * they belong to the same symbol. A small neural net (trained by
 * scripts/trainSegmenter.mjs on real handwriting from MathWriting, see
 * scripts/ts/alignStrokes.ts) looks at what the hand-tuned rules in
 * segmentation.ts look at - how close the ink comes, how the boxes overlap,
 * how big and how straight each stroke is, whether they were drawn one right
 * after the other - but weighs it all from data instead of fixed thresholds.
 *
 * Plain arithmetic, no tfjs: the net is a few thousand numbers
 * (src/recognition/segmenter.json), evaluated synchronously, so the grouping
 * stays a pure function like the rules it replaces.
 */
import type { Stroke } from "../recognition/preprocess";
import segmenter from "../recognition/segmenter.json";
import { crossingCount, inkDistance, pointToStroke, strokeBox, type BoundingBox } from "./strokeGeometry";

/** Pairs farther apart than this (in typical symbol sizes) are never one symbol, so aren't even asked about. */
export const PAIR_REACH = 2.5;

/** One number per feature, in this order - shared by training and use, so the net always sees what it learned on. */
export const PAIR_FEATURES = [
  "inkDist",
  "endAtoB",
  "endBtoA",
  "dx",
  "dy",
  "gapX",
  "gapY",
  "overlapX",
  "overlapY",
  "aW",
  "aH",
  "bW",
  "bH",
  "aAspect",
  "bAspect",
  "aLength",
  "bLength",
  "aCurl",
  "bCurl",
  "crossings",
  "strokesBetween",
  "consecutive",
  "unionW",
  "unionH",
  "aRank",
  "bRank",
  "aTiny",
  "bTiny",
  "spatialBetween",
] as const;

/** Compresses a size or a distance: small differences matter, big ones much less. */
const squash = (v: number) => Math.sign(v) * Math.log1p(Math.abs(v));

/**
 * A page's typical symbol size: the 60th percentile of its strokes' longer
 * sides. A stroke is usually a whole symbol or most of one, and the
 * percentile keeps dots and bars at one end and long fraction bars at the
 * other from setting the scale.
 */
export function typicalSize(boxes: BoundingBox[]): number {
  const sizes = boxes.map((b) => Math.max(b.width, b.height)).sort((a, b) => a - b);
  return Math.max(4, sizes[Math.min(sizes.length - 1, Math.floor(sizes.length * 0.6))] ?? 4);
}

function pathLength(s: Stroke): number {
  let n = 0;
  for (let i = 1; i < s.length; i++) n += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
  return n;
}

/** How far a stroke wanders from the straight line between its ends, relative to that line - 0 for a bar, large for a loop. */
function curl(s: Stroke, length: number): number {
  if (s.length < 2) return 0;
  const chord = Math.hypot(s[s.length - 1].x - s[0].x, s[s.length - 1].y - s[0].y);
  return Math.min(5, length / Math.max(chord, 1) - 1);
}

export interface StrokePair {
  /** The earlier-drawn stroke's index. */
  a: number;
  /** The later one's. */
  b: number;
  features: number[];
}

/** Every pair of strokes close enough to possibly be one symbol, with what the net looks at for each. Strokes are in the order they were drawn. */
export function strokePairs(strokes: Stroke[]): StrokePair[] {
  const n = strokes.length;
  if (n < 2) return [];
  const boxes = strokes.map(strokeBox);
  const u = typicalSize(boxes);
  const lengths = strokes.map(pathLength);
  const dist: number[][] = Array.from({ length: n }, () => new Array(n).fill(Infinity));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const [a, b] = [boxes[i], boxes[j]];
      // Boxes already farther apart than the reach can't have ink closer than it.
      const boxGap = Math.max(a.minX - b.maxX, b.minX - a.maxX, a.minY - b.maxY, b.minY - a.maxY, 0);
      if (boxGap > PAIR_REACH * u) continue;
      dist[i][j] = dist[j][i] = inkDistance(strokes[i], strokes[j]);
    }
  }
  // Each stroke's neighbours, nearest first - "is this the closest thing to it?" says more than the distance alone.
  const rankOf = (from: number, to: number) => dist[from].filter((d, k) => k !== from && d < dist[from][to]).length;

  const out: StrokePair[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = dist[i][j];
      if (d > PAIR_REACH * u) continue;
      const [A, B] = [boxes[i], boxes[j]];
      const [s, t] = [strokes[i], strokes[j]];
      const ends = (x: Stroke, y: Stroke) => Math.min(pointToStroke(x[0], y), pointToStroke(x[x.length - 1], y));
      const overlapX = Math.min(A.maxX, B.maxX) - Math.max(A.minX, B.minX);
      const overlapY = Math.min(A.maxY, B.maxY) - Math.max(A.minY, B.minY);
      const left = Math.min(A.cx, B.cx);
      const right = Math.max(A.cx, B.cx);
      const between = boxes.filter((c, k) => k !== i && k !== j && c.cx > left && c.cx < right && c.maxY > Math.min(A.minY, B.minY) && c.minY < Math.max(A.maxY, B.maxY)).length;
      out.push({
        a: i,
        b: j,
        features: [
          squash(d / u),
          squash(ends(s, t) / u),
          squash(ends(t, s) / u),
          squash((B.cx - A.cx) / u),
          squash((B.cy - A.cy) / u),
          squash(-overlapX / u),
          squash(-overlapY / u),
          Math.max(0, overlapX) / Math.max(1, Math.min(A.width, B.width)),
          Math.max(0, overlapY) / Math.max(1, Math.min(A.height, B.height)),
          squash(A.width / u),
          squash(A.height / u),
          squash(B.width / u),
          squash(B.height / u),
          A.height / Math.max(1, A.width + A.height),
          B.height / Math.max(1, B.width + B.height),
          squash(lengths[i] / u),
          squash(lengths[j] / u),
          curl(s, lengths[i]),
          curl(t, lengths[j]),
          Math.min(3, crossingCount(s, t)),
          Math.min(5, j - i - 1),
          j === i + 1 ? 1 : 0,
          squash((Math.max(A.maxX, B.maxX) - Math.min(A.minX, B.minX)) / u),
          squash((Math.max(A.maxY, B.maxY) - Math.min(A.minY, B.minY)) / u),
          Math.min(4, rankOf(i, j)),
          Math.min(4, rankOf(j, i)),
          Math.max(A.width, A.height) < 0.25 * u ? 1 : 0,
          Math.max(B.width, B.height) < 0.25 * u ? 1 : 0,
          Math.min(3, between),
        ],
      });
    }
  }
  return out;
}

interface Layer {
  w: number[][];
  b: number[];
}
interface SegmenterNet {
  features: string[];
  mean: number[];
  std: number[];
  layers: Layer[];
  /** Pairs at least this likely are joined. */
  threshold: number;
}

const NET: SegmenterNet | null =
  (segmenter as Partial<SegmenterNet>).layers?.length && (segmenter as SegmenterNet).features.join() === PAIR_FEATURES.join() ? (segmenter as SegmenterNet) : null;

/** Whether a trained net is there to use (scripts/trainSegmenter.mjs) - without one, segmentation uses its rules. */
export const hasLearnedSegmenter = NET !== null;

/** How likely a pair's two strokes are one symbol, 0-1. */
export function sameSymbolProbability(features: number[]): number {
  if (!NET) return 0;
  let x = features.map((v, k) => (v - NET.mean[k]) / NET.std[k]);
  NET.layers.forEach((layer, li) => {
    const last = li === NET.layers.length - 1;
    x = layer.b.map((bias, o) => {
      let sum = bias;
      for (let k = 0; k < x.length; k++) sum += x[k] * layer.w[k][o];
      return last ? sum : Math.max(0, sum);
    });
  });
  return 1 / (1 + Math.exp(-x[0]));
}

/**
 * The pairs of strokes the net would join: each as [earlier, later].
 * (Requiring whole groups to belong together on average, against chains of
 * joins, was tried - it didn't get more expressions' symbols right.)
 */
export function learnedJoins(strokes: Stroke[], threshold = NET?.threshold ?? 0.5): [number, number][] {
  if (!NET) return [];
  return strokePairs(strokes)
    .filter((p) => sameSymbolProbability(p.features) >= threshold)
    .map((p) => [p.a, p.b]);
}
