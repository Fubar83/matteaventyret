/**
 * Finds the bracket of a written-out long division by geometry - a flat bar
 * along the top with a straight vertical stem hanging from one end:
 *
 *   trappan ("┌", divisor on the left):   4 │ 764      quotient above the bar
 *   liggande stolen ("┐", on the right):  764 │ 4      in both
 *
 * Bar and stem may be one stroke or two touching ones (segmentation joins
 * touching ink). Like the radical sign (radical.ts), the shape alone isn't
 * trusted: recognizeExpression.ts also requires digits under the bar AND a
 * divisor on the far side of the stem before calling it a bracket - that's
 * what keeps a "7" (a short bar with a slanted, not vertical, stem) out.
 */
import type { Point, Stroke } from "../recognition/preprocess";
import { longestFlatRun } from "./radical";
import type { BoundingBox } from "./segmentation";

export interface DivisionBracket {
  /** Which side of the stem the divisor is on: "left" is trappan, "right" is liggande stolen. */
  divisorSide: "left" | "right";
  bar: { minX: number; maxX: number; y: number };
  stemX: number;
  stemBottom: number;
}

/** A stem segment may lean this much sideways per unit of drop - a "7"'s slanted stroke leans far more. */
const MAX_STEM_LEAN = 0.25;

function longestVerticalRun(strokes: Stroke[]): { x: number; minY: number; maxY: number } | null {
  let best: { x: number; minY: number; maxY: number } | null = null;
  for (const stroke of strokes) {
    let run: Point[] = [];
    const close = () => {
      if (run.length >= 2) {
        const ys = run.map((p) => p.y);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        if (!best || maxY - minY > best.maxY - best.minY) best = { x: run.reduce((sum, p) => sum + p.x, 0) / run.length, minY, maxY };
      }
      run = [];
    };
    for (let i = 1; i < stroke.length; i++) {
      const a = stroke[i - 1];
      const b = stroke[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      if (Math.abs(dx) > Math.abs(dy) * MAX_STEM_LEAN) {
        close();
        continue;
      }
      if (run.length === 0) run.push(a);
      run.push(b);
    }
    close();
  }
  return best;
}

export function findDivisionBracket(strokes: Stroke[], box: BoundingBox): DivisionBracket | null {
  const bar = longestFlatRun(strokes);
  const stem = longestVerticalRun(strokes);
  if (!bar || !stem) return null;
  const barLength = bar.maxX - bar.minX;
  const stemLength = stem.maxY - stem.minY;
  if (stemLength < 20 || barLength < stemLength * 0.4) return null;
  // The bar is the top of the shape, the stem hangs from it...
  if (bar.y > box.minY + Math.max(box.height * 0.15, 6)) return null;
  if (stem.minY > bar.y + stemLength * 0.25) return null;
  // ...from one of its ends...
  const reach = Math.max(barLength * 0.15, 8);
  const atRight = Math.abs(stem.x - bar.maxX) <= reach;
  const atLeft = Math.abs(stem.x - bar.minX) <= reach;
  if (atRight === atLeft) return null;
  // ...and there's nothing else to the shape - in particular no ink past the
  // stem's own side, which is where a root sign's lead-in stroke would be
  // (its steep tick can otherwise pass for a trappan stem).
  if (box.width > barLength + reach * 2 || box.height > stemLength + Math.max(box.height * 0.2, 8)) return null;
  if (atLeft ? box.minX < stem.x - 8 : box.maxX > stem.x + 8) return null;
  return { divisorSide: atRight ? "right" : "left", bar, stemX: stem.x, stemBottom: stem.maxY };
}

/** The dividend sits under the bar, beside the stem. */
export function isDividendPart(b: DivisionBracket, s: BoundingBox): boolean {
  return s.cx > b.bar.minX && s.cx < b.bar.maxX && s.cy > b.bar.y && s.cy < b.stemBottom + (b.stemBottom - b.bar.y) * 0.2;
}

/** The divisor sits on the far side of the stem, at the dividend's height. */
export function isDivisorPart(b: DivisionBracket, s: BoundingBox): boolean {
  const sideOk = b.divisorSide === "right" ? s.cx > b.stemX : s.cx < b.stemX;
  return sideOk && s.cy > b.bar.y && s.cy < b.stemBottom + (b.stemBottom - b.bar.y) * 0.2;
}
