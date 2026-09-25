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
