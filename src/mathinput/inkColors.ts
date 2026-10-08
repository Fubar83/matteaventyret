/**
 * Colors the child's own handwriting by the verifier's verdicts (green right,
 * red wrong, amber följdfel) instead of drawing boxes around it.
 *
 * Each checked mark is a box around the ink it came from (verify/types.ts),
 * so a stroke takes the color of the mark whose box its center is in - the
 * smallest one, when boxes nest (a borrowed "10"'s whole-note mark around its
 * "1" and "0" marks). A strike-through's center sits on the digit it crosses
 * out, so it's colored with that digit.
 *
 * Keyed by the stroke objects that were actually checked: a stroke drawn,
 * moved or erased since stays uncolored (or disappears) until the next check,
 * instead of being colored for a verdict that wasn't about it.
 */
import type { Stroke } from "../recognition/preprocess";
import type { MarkStatus, WorkCheck } from "./verify";

export type InkStatus = Exclude<MarkStatus, "missing">;

/** A few px of slack, so a stroke's center just past the edge of its own symbol's box still counts. */
const SLACK = 4;

export function colorStrokesByChecks(strokes: Stroke[], checks: WorkCheck[], colors: Record<InkStatus, string>): Map<Stroke, string> {
  const marks = checks.flatMap((c) => c.marks).filter((m): m is typeof m & { status: InkStatus } => m.status !== "missing");
  const out = new Map<Stroke, string>();
  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    const xs = stroke.map((p) => p.x);
    const ys = stroke.map((p) => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    let best: { area: number; status: InkStatus } | null = null;
    for (const m of marks) {
      const b = m.box;
      if (cx < b.minX - SLACK || cx > b.maxX + SLACK || cy < b.minY - SLACK || cy > b.maxY + SLACK) continue;
      const area = b.width * b.height;
      if (!best || area < best.area) best = { area, status: m.status };
    }
    if (best) out.set(stroke, colors[best.status]);
  }
  return out;
}
