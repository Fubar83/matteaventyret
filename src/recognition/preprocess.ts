/**
 * Turns raw pointer strokes from a DigitCanvas into a 28x28 grayscale grid,
 * the same shape the model was trained on: cropped to the ink's bounding
 * box, centred, scaled, and thickened (see build brief "Recognizer").
 */
export interface Point {
  x: number;
  y: number;
}
export type Stroke = Point[];

const SIZE = 28;
const PADDING_RATIO = 0.15; // keeps a margin around the digit, like MNIST

function boundingBox(strokes: Stroke[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const stroke of strokes) {
    for (const p of stroke) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  return { minX, minY, maxX, maxY };
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Ink spanning less than this fraction of its drawing canvas is treated as a small mark (period, comma, a tap), not a character to magnify up to fill the grid. */
const SMALL_MARK_RELATIVE_SIZE = 0.15;

/**
 * Crops to the ink, centres and scales it into a 28x28 grid with a small
 * margin, then thickens strokes with a soft falloff. Returns a flat
 * Float32Array of length 28*28 with values in [0, 1], row-major.
 *
 * `canvasSize` (the side length of the square DigitCanvas the strokes were
 * drawn on, in px) lets small marks be told apart from ordinary characters
 * drawn small: a period tapped in a 120px canvas is tiny relative to that
 * canvas, while a digit drawn small inside a compact 32px board cell is not
 * tiny relative to ITS canvas - only the former should be kept small on the
 * grid instead of magnified up to fill it. Omit `canvasSize` to always
 * magnify to fill the grid (the old, unconditional behaviour).
 */
export function preprocessStrokes(strokes: Stroke[], canvasSize?: number): Float32Array {
  const grid = new Float32Array(SIZE * SIZE);
  const nonEmpty = strokes.filter((s) => s.length > 0);
  if (nonEmpty.length === 0) return grid;

  const { minX, minY, maxX, maxY } = boundingBox(nonEmpty);
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const contentSize = SIZE * (1 - 2 * PADDING_RATIO);
  let scale = contentSize / Math.max(width, height);
  if (canvasSize) {
    const relativeSize = Math.max(width, height) / canvasSize;
    if (relativeSize < SMALL_MARK_RELATIVE_SIZE) {
      // Ink this small relative to its own canvas is almost certainly a
      // deliberate small mark, not a character drawn small - scale it down
      // proportionally to how small it really was, instead of blowing it up
      // to the same footprint as an ordinary character.
      scale *= relativeSize / SMALL_MARK_RELATIVE_SIZE;
    }
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const offset = SIZE / 2;

  const toGrid = (p: Point) => ({ x: (p.x - cx) * scale + offset, y: (p.y - cy) * scale + offset });
  const thickness = 1.4; // grid pixels; strokes are pre-scaled, so a fixed value works across input sizes

  for (const stroke of nonEmpty) {
    const pts = stroke.map(toGrid);
    if (pts.length === 1) {
      // A tap with no drag: draw a small dot.
      pts.push({ x: pts[0].x + 0.01, y: pts[0].y });
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const { x: x1, y: y1 } = pts[i];
      const { x: x2, y: y2 } = pts[i + 1];
      const minGX = Math.max(0, Math.floor(Math.min(x1, x2) - thickness));
      const maxGX = Math.min(SIZE - 1, Math.ceil(Math.max(x1, x2) + thickness));
      const minGY = Math.max(0, Math.floor(Math.min(y1, y2) - thickness));
      const maxGY = Math.min(SIZE - 1, Math.ceil(Math.max(y1, y2) + thickness));
      for (let gy = minGY; gy <= maxGY; gy++) {
        for (let gx = minGX; gx <= maxGX; gx++) {
          const d = distToSegment(gx + 0.5, gy + 0.5, x1, y1, x2, y2);
          const intensity = Math.max(0, 1 - d / thickness);
          const idx = gy * SIZE + gx;
          if (intensity > grid[idx]) grid[idx] = intensity;
        }
      }
    }
  }

  return grid;
}

export const RECOGNIZER_INPUT_SIZE = SIZE;
