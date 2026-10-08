/**
 * Plain geometry of strokes - boxes, distances, crossings - shared by the
 * rule-based grouping (segmentation.ts) and the learned one (strokePairs.ts).
 */
import type { Point, Stroke } from "../recognition/preprocess";

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
}

export function strokeBox(stroke: Stroke): BoundingBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of stroke) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  if (minX === Infinity) {
    // A single tap with no movement never happens in practice (pointerdown
    // always records at least one point), but stay defined if it ever does.
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, cx: 0, cy: 0, width: 0, height: 0 };
  }
  return boxFromCorners(minX, minY, maxX, maxY);
}

export function boxFromCorners(minX: number, minY: number, maxX: number, maxY: number): BoundingBox {
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY };
}

export function union(a: BoundingBox, b: BoundingBox): BoundingBox {
  return boxFromCorners(Math.min(a.minX, b.minX), Math.min(a.minY, b.minY), Math.max(a.maxX, b.maxX), Math.max(a.maxY, b.maxY));
}

export function pointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const side = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = side(c, d, a);
  const d2 = side(c, d, b);
  const d3 = side(a, b, c);
  const d4 = side(a, b, d);
  // Half-open on each segment's first end: a line passing exactly through a
  // shared vertex of two consecutive segments (e.g. the far left point of a
  // drawn "0") counts as crossing exactly one of them, not neither.
  const straddles = (p: number, q: number) => (p >= 0 && q < 0) || (p < 0 && q >= 0);
  return straddles(d1, d2) && straddles(d3, d4);
}

/** Closest distance between two strokes' actual ink, as polylines - 0 where they cross. */
export function inkDistance(s: Stroke, t: Stroke): number {
  const segs = (x: Stroke): [Point, Point][] => (x.length === 1 ? [[x[0], x[0]]] : x.slice(1).map((p, i) => [x[i], p]));
  let min = Infinity;
  for (const [a, b] of segs(s)) {
    for (const [c, d] of segs(t)) {
      if (segmentsCross(a, b, c, d)) return 0;
      min = Math.min(min, pointToSegment(a, c, d), pointToSegment(b, c, d), pointToSegment(c, a, b), pointToSegment(d, a, b));
    }
  }
  return min;
}

/** Closest distance from a point to a stroke's ink. */
export function pointToStroke(p: Point, s: Stroke): number {
  if (s.length === 1) return Math.hypot(p.x - s[0].x, p.y - s[0].y);
  let min = Infinity;
  for (let i = 1; i < s.length; i++) min = Math.min(min, pointToSegment(p, s[i - 1], s[i]));
  return min;
}

/** How many times two strokes' ink crosses. */
export function crossingCount(s: Stroke, t: Stroke): number {
  let n = 0;
  for (let i = 1; i < s.length; i++) for (let j = 1; j < t.length; j++) if (segmentsCross(s[i - 1], s[i], t[j - 1], t[j])) n++;
  return n;
}
