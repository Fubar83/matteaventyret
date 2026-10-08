/** Turns polylines into a 28x28 grayscale bitmap (0-1), with optional random augmentation. */

function transformPoint(p, cx, cy, cosR, sinR, scale, dx, dy) {
  const x = p.x - cx;
  const y = p.y - cy;
  const rx = x * cosR - y * sinR;
  const ry = x * sinR + y * cosR;
  return { x: cx + rx * scale + dx, y: cy + ry * scale + dy };
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

export function rasterize(polylines, { size = 28, thickness = 2.2, rotationDeg = 0, scale = 1, dx = 0, dy = 0 } = {}) {
  const cx = size / 2;
  const cy = size / 2;
  const rad = (rotationDeg * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);

  const transformed = polylines.map((poly) => poly.map((p) => transformPoint(p, cx, cy, cosR, sinR, scale, dx, dy)));

  const grid = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let minDist = Infinity;
      for (const poly of transformed) {
        for (let i = 0; i < poly.length - 1; i++) {
          const d = distToSegment(x + 0.5, y + 0.5, poly[i].x, poly[i].y, poly[i + 1].x, poly[i + 1].y);
          if (d < minDist) minDist = d;
        }
      }
      const intensity = Math.max(0, 1 - minDist / thickness);
      grid[y * size + x] = intensity;
    }
  }
  return grid;
}

export function randomAugment(rng) {
  return {
    rotationDeg: (rng() - 0.5) * 30, // +-15 deg
    scale: 0.82 + rng() * 0.3, // 0.82-1.12
    dx: (rng() - 0.5) * 3,
    dy: (rng() - 0.5) * 3,
    thickness: 1.7 + rng() * 1.3, // 1.7-3.0
  };
}

/** Mild: tops up thin classes without inventing shapes the real sample doesn't have. */
export const MILD_AUGMENT = { rotateDeg: 10, scaleMin: 0.88, scaleMax: 1.12, shift: 3, aspect: 0, shear: 0, strokeWeight: 0 };

/**
 * Strong: for a model that should forgive messy handwriting (the basic,
 * numbers-only model) - more tilt, squashed or stretched digits, slanted
 * writing, and heavier or lighter pen strokes than the datasets' own.
 */
export const STRONG_AUGMENT = { rotateDeg: 18, scaleMin: 0.8, scaleMax: 1.15, shift: 4, aspect: 0.2, shear: 0.3, strokeWeight: 0.5 };

/**
 * A randomly rotated/scaled/shifted copy of an already-rasterized grid
 * (bilinear resampling around the center). Used to top up classes with only
 * a few dozen real samples, so they aren't drowned out by classes with
 * hundreds - kept mild by default, since a real sample's own shape is what's
 * being multiplied here, not a clean template's. `opts` (see MILD_AUGMENT /
 * STRONG_AUGMENT) widens it: `aspect` squashes/stretches one axis by up to
 * that fraction, `shear` slants it, and `strokeWeight` is the chance the
 * pen gets heavier (dilated) or lighter (thinned).
 */
export function augmentGrid(grid, rng, size = 28, opts = MILD_AUGMENT) {
  const rad = (((rng() - 0.5) * 2 * opts.rotateDeg) * Math.PI) / 180;
  const scale = opts.scaleMin + rng() * (opts.scaleMax - opts.scaleMin);
  const aspect = 1 + (rng() - 0.5) * 2 * opts.aspect;
  const scaleX = scale * Math.sqrt(aspect);
  const scaleY = scale / Math.sqrt(aspect);
  const shear = (rng() - 0.5) * 2 * opts.shear;
  const shiftX = (rng() - 0.5) * opts.shift;
  const shiftY = (rng() - 0.5) * opts.shift;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);
  const c = size / 2;
  const out = new Float32Array(size * size);
  const at = (x, y) => (x < 0 || y < 0 || x >= size || y >= size ? 0 : grid[y * size + x]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Inverse-map each output pixel back into the source grid.
      const oy = (y + 0.5 - c - shiftY) / scaleY;
      const ox = (x + 0.5 - c - shiftX) / scaleX - shear * oy;
      const sx = ox * cosR + oy * sinR + c - 0.5;
      const sy = -ox * sinR + oy * cosR + c - 0.5;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const fx = sx - x0;
      const fy = sy - y0;
      out[y * size + x] =
        at(x0, y0) * (1 - fx) * (1 - fy) + at(x0 + 1, y0) * fx * (1 - fy) + at(x0, y0 + 1) * (1 - fx) * fy + at(x0 + 1, y0 + 1) * fx * fy;
    }
  }
  if (opts.strokeWeight > 0 && rng() < opts.strokeWeight) return rng() < 0.5 ? dilate(out, size) : thin(out);
  return out;
}

/** A heavier pen: each pixel takes most of its brightest 4-neighbor's ink. */
function dilate(grid, size) {
  const out = new Float32Array(grid.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const n = Math.max(x > 0 ? grid[i - 1] : 0, x < size - 1 ? grid[i + 1] : 0, y > 0 ? grid[i - size] : 0, y < size - 1 ? grid[i + size] : 0);
      out[i] = Math.max(grid[i], n * 0.8);
    }
  }
  return out;
}

/** A lighter pen: faint (edge) ink fades out, the stroke's core stays. */
function thin(grid) {
  return grid.map((v) => (v < 0.5 ? v * v * 2 : v));
}
