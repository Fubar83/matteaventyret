/**
 * Plain-JS mirror of src/recognition/preprocess.ts's preprocessStrokes (plain
 * Node has no TS loader here - same reason labels.mjs mirrors labels.ts).
 * Kept byte-for-byte equivalent on purpose: using the EXACT function real
 * strokes get run through at recognition time - not a separate resize/
 * normalize implementation like processEmnist.mjs/processHasy.mjs each have
 * for their own (pre-rasterized bitmap) sources - means MathWriting's raw
 * ink can't drift out of sync with how the live recognizer preprocesses a
 * child's own strokes. Keep both files in sync if preprocess.ts changes.
 */
const SIZE = 28;
const PADDING_RATIO = 0.15;
const SMALL_MARK_RELATIVE_SIZE = 0.15;

function boundingBox(strokes) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
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

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function preprocessStrokes(strokes, canvasSize) {
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
      scale *= relativeSize / SMALL_MARK_RELATIVE_SIZE;
    }
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const offset = SIZE / 2;

  const toGrid = (p) => ({ x: (p.x - cx) * scale + offset, y: (p.y - cy) * scale + offset });
  const thickness = 1.4;

  for (const stroke of nonEmpty) {
    const pts = stroke.map(toGrid);
    if (pts.length === 1) {
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
