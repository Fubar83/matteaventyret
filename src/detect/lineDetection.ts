/**
 * Decides whether a segmented symbol is actually a straight line (a fraction
 * bar, a minus sign, an underline, a division slash) rather than a glyph to
 * hand to the ML recognizer - purely by geometry, no model involved. This is
 * deliberately a separate, cheap, deterministic pass before classification:
 * a wobbly hand-drawn line still looks nothing like a curved digit's path,
 * so there's no need to ask a neural net to tell them apart.
 */
import type { Point, Stroke } from "../recognition/preprocess";
import type { SegmentedSymbol } from "../mathinput/segmentation";

export interface DetectedLine {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** How far (as a fraction of the line's own length) the drawn path may wander from dead straight and still count as a line. */
const MAX_DEVIATION_RATIO = 0.12;
/** Shorter than this, it's treated as a glyph (e.g. a dot or a short dash within a letter) rather than a line - see preprocess.ts's own small-mark note for a similar distinction. */
const MIN_LINE_LENGTH = 18;

/** Candidate endpoints: each stroke's own first/last point. Cheap (O(strokes), not O(points²)) and correct for how a line is actually drawn - one continuous motion from one end to the other, so the true endpoints are always a stroke's own ends, never a point in its middle. */
function candidateEndpoints(strokes: Stroke[]): Point[] {
  const points: Point[] = [];
  for (const s of strokes) {
    if (s.length === 0) continue;
    points.push(s[0], s[s.length - 1]);
  }
  return points;
}

function farthestPair(points: Point[]): [Point, Point] | null {
  if (points.length < 2) return null;
  let a = points[0];
  let b = points[1];
  let maxDist = -1;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      if (d > maxDist) {
        maxDist = d;
        a = points[i];
        b = points[j];
      }
    }
  }
  return [a, b];
}

/** Perpendicular distance from p to the infinite line through a-b. */
function distanceToLine(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

export function detectLine(symbol: SegmentedSymbol): DetectedLine | null {
  const endpoints = candidateEndpoints(symbol.strokes);
  const pair = farthestPair(endpoints);
  if (!pair) return null;
  const [a, b] = pair;
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  if (length < MIN_LINE_LENGTH) return null;

  let maxDeviation = 0;
  for (const stroke of symbol.strokes) {
    for (const p of stroke) {
      const d = distanceToLine(p, a, b);
      if (d > maxDeviation) maxDeviation = d;
    }
  }
  if (maxDeviation / length > MAX_DEVIATION_RATIO) return null;

  return { type: "line", x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}
