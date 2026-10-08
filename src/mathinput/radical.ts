/**
 * Finds the overbar of a hand-drawn square-root sign by geometry, so layout
 * can tell exactly what's under it - however long the bar was drawn. The
 * classifier only ever sees a fixed 28x28 crop, where a long bar squashes the
 * tick into a few pixels; but a radical's shape is distinctive enough to find
 * directly: a check-mark tick on the left whose lowest point sits at (or left
 * of) the start of a long, flat bar running along the top to the right edge.
 * Tick and bar can be one stroke or two (segmentation joins them, since the
 * bar starts where the tick ends).
 *
 * The geometry alone isn't the whole test - see recognizeExpression.ts, which
 * also requires something to actually be written under the bar before
 * treating a symbol as a radical. That's what keeps a "7" or a "5" (flat
 * tops, but nothing tucked under them) from being read as one.
 */
import type { Point, Stroke } from "../recognition/preprocess";
import type { BoundingBox } from "./segmentation";

export interface RadicalBar {
  minX: number;
  maxX: number;
  /** The bar's average height - the top of the radicand's region. */
  y: number;
}

/** A segment counts as part of a flat bar while it rises/falls no more than this per unit of horizontal travel. */
const MAX_BAR_SLOPE = 0.35;

/** The longest run of consecutive, near-horizontal segments heading the same way, across all strokes. Also used by divisionBracket.ts. */
export function longestFlatRun(strokes: Stroke[]): { minX: number; maxX: number; y: number } | null {
  let best: { minX: number; maxX: number; y: number } | null = null;
  for (const stroke of strokes) {
    let run: Point[] = [];
    let dir = 0;
    const close = () => {
      if (run.length >= 2) {
        const xs = run.map((p) => p.x);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        if (!best || maxX - minX > best.maxX - best.minX) best = { minX, maxX, y: run.reduce((sum, p) => sum + p.y, 0) / run.length };
      }
      run = [];
      dir = 0;
    };
    for (let i = 1; i < stroke.length; i++) {
      const a = stroke[i - 1];
      const b = stroke[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue; // jitter, not direction
      const flat = Math.abs(dy) <= Math.abs(dx) * MAX_BAR_SLOPE;
      const segDir = Math.sign(dx);
      if (!flat || (dir !== 0 && segDir !== dir)) {
        close();
        if (!flat) continue;
      }
      if (run.length === 0) run.push(a);
      run.push(b);
      dir = segDir;
    }
    close();
  }
  return best;
}

export function findRadicalBar(strokes: Stroke[], box: BoundingBox): RadicalBar | null {
  if (box.height < 12 || box.width < 12) return null;
  const bar = longestFlatRun(strokes);
  if (!bar) return null;
  const barLength = bar.maxX - bar.minX;
  // A long bar, along the top, reaching the symbol's right edge...
  if (barLength < box.width * 0.4) return null;
  if (bar.y > box.minY + box.height * 0.2) return null;
  if (bar.maxX < box.maxX - box.width * 0.1) return null;
  // ...with a tick to its left: some ink before the bar starts...
  if (bar.minX - box.minX < Math.min(box.width * 0.08, box.height * 0.15)) return null;
  // ...whose lowest point is at, or left of, where the bar starts (a "5"'s
  // lowest point is out under its hat instead).
  let lowest: Point | null = null;
  for (const s of strokes) for (const p of s) if (!lowest || p.y > lowest.y) lowest = p;
  if (!lowest || lowest.x > bar.minX + box.height * 0.15) return null;
  // The tick has to actually drop well below the bar.
  if (box.maxY - bar.y < box.height * 0.6) return null;
  return { minX: bar.minX, maxX: bar.maxX, y: bar.y };
}

/** Whether a symbol's center lies in the region under a radical's bar - above the bottom of its tick, within the bar's horizontal span. */
export function isUnderBar(bar: RadicalBar, radicalBox: BoundingBox, s: BoundingBox): boolean {
  const slack = radicalBox.height * 0.15;
  return s.cx > bar.minX && s.cx <= bar.maxX + slack && s.cy > bar.y && s.cy <= radicalBox.maxY + slack && s.minY >= bar.y - slack;
}

/**
 * Whether a symbol sits in a radical's crook as its index (the small "3" of
 * a cube root): left of the bar's start, small, and high - ending in the
 * upper half of the tick. An inline sign just before a root ("1 + √9") sits
 * lower, at the middle of the line; layout.ts also only lets digits and
 * letters be an index.
 */
export function isRootIndex(bar: RadicalBar, radicalBox: BoundingBox, s: BoundingBox): boolean {
  const tickHeight = radicalBox.maxY - bar.y;
  return (
    s.cx < bar.minX &&
    s.cx > radicalBox.minX - tickHeight * 0.6 &&
    s.maxY < bar.y + tickHeight * 0.55 &&
    s.height < tickHeight * 0.6
  );
}
