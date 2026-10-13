import type { ReactNode } from "react";
import type { Side, TriangleShape } from "../../engine/questions/rightTriangle";
import { t } from "../../i18n";

/**
 * Trigonometry's pictures: a right triangle any way round, its right angle
 * and the angle v marked - the sides' names or lengths, or places to put
 * them - and the unit circle.
 */

const INK = "#334155";
const FILL = "#e0f2fe";
export const RT_W = 360;
export const RT_H = 260;
/** Half the size of a place to drop a side's name. */
export const ZONE: Pt = [64, 15];
type Pt = [number, number];

/**
 * Where a triangle's corners and sides land: fitted into RT_W × RT_H, with room
 * around for the labels - or, `zones`, for the wider places names are dropped on.
 */
export function rightTriangleLayout(shape: TriangleShape, zones = false) {
  const [l1, l2] = shape.legs;
  const r = (shape.turn * Math.PI) / 180;
  // The right angle at the origin, leg 1 along x, leg 2 up (y grows down on screen); mirrored, then turned.
  const place = ([x, y]: Pt): Pt => {
    const mx = shape.flip ? -x : x;
    return [mx * Math.cos(r) - y * Math.sin(r), mx * Math.sin(r) + y * Math.cos(r)];
  };
  const raw = { R: place([0, 0]), P: place([l1, 0]), Q: place([0, -l2]) };
  const xs = Object.values(raw).map((p) => p[0]);
  const ys = Object.values(raw).map((p) => p[1]);
  const [roomX, roomY] = zones ? [2 * ZONE[0] + 30, 2 * ZONE[1] + 60] : [90, 80];
  const scale = Math.min((RT_W - roomX) / (Math.max(...xs) - Math.min(...xs) || 1), (RT_H - roomY) / (Math.max(...ys) - Math.min(...ys) || 1));
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const fit = ([x, y]: Pt): Pt => [RT_W / 2 + (x - cx) * scale, RT_H / 2 + (y - cy) * scale];
  const R = fit(raw.R);
  const P = fit(raw.P);
  const Q = fit(raw.Q);
  const ends: Record<Side, [Pt, Pt]> = { leg1: [R, P], leg2: [R, Q], hyp: [P, Q] };
  const middle: Pt = [(R[0] + P[0] + Q[0]) / 3, (R[1] + P[1] + Q[1]) / 3];
  /**
   * Where a label `hw` × `hh` (half its width and height) goes: straight out from
   * the side's middle, just far enough that the label clears the side.
   */
  const labelAt = (side: Side, [hw, hh]: Pt = [10, 10], gap = 6): Pt => {
    const [a, b] = ends[side];
    const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    let n: Pt = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
    // Out of the triangle, not into it.
    if (n[0] * (m[0] - middle[0]) + n[1] * (m[1] - middle[1]) < 0) n = [-n[0], -n[1]];
    const out = Math.abs(n[0]) * hw + Math.abs(n[1]) * hh + gap;
    return [m[0] + n[0] * out, m[1] + n[1] * out];
  };
  const V = shape.angleAt === 0 ? P : Q;
  return { R, P, Q, V, ends, labelAt };
}

const unit = (a: Pt, b: Pt): Pt => {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
};

/**
 * A right triangle: the right angle's square, v's arc and its name, and per
 * side either a label (a name, a length, a letter) or whatever `onSide` puts
 * there - a place to drop a name.
 */
export function RightTriangle({
  shape,
  labels,
  angle = "v",
  onSide,
  colors,
  width = RT_W,
}: {
  shape: TriangleShape;
  labels?: Partial<Record<Side, string | null>>;
  angle?: string;
  onSide?: (side: Side, at: Pt, ends: [Pt, Pt]) => ReactNode;
  colors?: Partial<Record<Side, string>>;
  width?: number;
}) {
  const { R, P, Q, V, ends, labelAt } = rightTriangleLayout(shape, !!onSide);
  const other = V === P ? Q : P;
  // The right angle's little square.
  const u1 = unit(R, P);
  const u2 = unit(R, Q);
  const s = 14;
  const square = [R[0] + u1[0] * s, R[1] + u1[1] * s, R[0] + (u1[0] + u2[0]) * s, R[1] + (u1[1] + u2[1]) * s, R[0] + u2[0] * s, R[1] + u2[1] * s];
  // v's arc, from the side towards the right angle to the hypotenuse.
  const a1 = unit(V, R);
  const a2 = unit(V, other);
  const ar = 26;
  const sweep = a1[0] * a2[1] - a1[1] * a2[0] > 0 ? 1 : 0;
  const bis = unit([0, 0], [a1[0] + a2[0], a1[1] + a2[1]]);
  return (
    <svg viewBox={`0 0 ${RT_W} ${RT_H}`} width={width} className="max-w-full select-none" role="img" aria-label={t("scene.rightTriangle.label", { v: angle })}>
      <polygon points={[R, P, Q].map((p) => p.join(",")).join(" ")} fill={FILL} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      {(["leg1", "leg2", "hyp"] as const).map((side) =>
        colors?.[side] ? <line key={side} x1={ends[side][0][0]} y1={ends[side][0][1]} x2={ends[side][1][0]} y2={ends[side][1][1]} stroke={colors[side]} strokeWidth={6} strokeLinecap="round" /> : null
      )}
      <polyline points={square.join(",")} fill="none" stroke={INK} strokeWidth={1.8} />
      <path d={`M${V[0] + a1[0] * ar} ${V[1] + a1[1] * ar} A${ar} ${ar} 0 0 ${sweep} ${V[0] + a2[0] * ar} ${V[1] + a2[1] * ar}`} fill="none" stroke="#e11d48" strokeWidth={2.5} />
      {/* A longer name (30°) further out, clear of the sides in a sharp corner. */}
      <text x={V[0] + bis[0] * (ar + 8 + 6 * angle.length)} y={V[1] + bis[1] * (ar + 8 + 6 * angle.length)} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={800} fontStyle={angle === "v" ? "italic" : undefined} fill="#e11d48">
        {angle}
      </text>
      {(["leg1", "leg2", "hyp"] as const).map((side) => {
        if (onSide) return <g key={side}>{onSide(side, labelAt(side, ZONE), ends[side])}</g>;
        const label = labels?.[side];
        const at = labelAt(side, [5 * (label?.length ?? 1) + 2, 10]);
        return label ? (
          <text key={side} x={at[0]} y={at[1]} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={800} fill={INK}>
            {label}
          </text>
        ) : null;
      })}
    </svg>
  );
}
