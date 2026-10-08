/**
 * How a symbol was drawn, as numbers for the stroke model: its pen path
 * resampled to STROKE_POINTS points evenly along the ink, each as
 * (x, y, pen just came down), scaled into [-1, 1] around the symbol's middle
 * (keeping its proportions). The picture of a "1" and a "7", or a "5" and an
 * "s", can be close; the order and direction their strokes were drawn in
 * usually isn't.
 */
import type { Stroke } from "./preprocess";

export const STROKE_POINTS = 48;

/** The pen path as STROKE_POINTS × [x, y, penDown], flattened. */
export function resampleStrokes(strokes: readonly Stroke[]): Float32Array {
  const out = new Float32Array(STROKE_POINTS * 3);
  const ink = strokes.filter((s) => s.length > 0);
  if (ink.length === 0) return out;
  const xs = ink.flat().map((p) => p.x);
  const ys = ink.flat().map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const half = Math.max(maxX - minX, maxY - minY, 1e-6) / 2;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // Each stroke's length along the ink - a dot gets a little, so it still gets a point of its own.
  const lengths = ink.map((s) => {
    let len = 0;
    for (let i = 1; i < s.length; i++) len += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
    return Math.max(len, half * 0.1);
  });
  const total = lengths.reduce((a, b) => a + b, 0);

  /** The point `d` along stroke `s` - its end if `d` runs past it (a dot's padded length). */
  const pointAt = (s: Stroke, d: number) => {
    let walked = 0;
    for (let i = 1; i < s.length; i++) {
      const seg = Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
      if (walked + seg >= d) {
        const t = seg > 0 ? Math.max(0, (d - walked) / seg) : 0;
        return { x: s[i - 1].x + (s[i].x - s[i - 1].x) * t, y: s[i - 1].y + (s[i].y - s[i - 1].y) * t };
      }
      walked += seg;
    }
    return s[s.length - 1];
  };

  let stroke = 0;
  let before = 0; // ink length of the strokes before `stroke`
  let lastStroke = -1;
  for (let k = 0; k < STROKE_POINTS; k++) {
    const d = (k / (STROKE_POINTS - 1)) * total;
    while (stroke < ink.length - 1 && d > before + lengths[stroke]) {
      before += lengths[stroke];
      stroke++;
    }
    const p = pointAt(ink[stroke], d - before);
    out[k * 3] = (p.x - cx) / half;
    out[k * 3 + 1] = (p.y - cy) / half;
    out[k * 3 + 2] = stroke !== lastStroke ? 1 : 0;
    lastStroke = stroke;
  }
  return out;
}
