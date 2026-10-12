import type { Pizza } from "../../engine/questions/scene";
import { t } from "../../i18n";

/**
 * Fractions you could eat: pizzas cut in equal slices (some eaten, some lifted
 * out as someone's share) and a chocolate bar of squares.
 */

const INK = "#78350f";
const R = 56;

/** Where on a slice the pepperoni go: a few spots towards its middle, the same on every slice. */
const PEPPERONI = [
  [0.55, 0.5],
  [0.8, 0.3],
  [0.75, 0.72],
] as const;

function OnePizza({ pizza, size }: { pizza: Pizza; size: number }) {
  const { slices, left, taken = 0 } = pizza;
  const angle = (i: number) => (i / slices) * 2 * Math.PI - Math.PI / 2;
  const at = (a: number, r: number) => [70 + r * Math.cos(a), 70 + r * Math.sin(a)];
  const wedge = (i: number, r: number) => {
    const [a0, a1] = [angle(i), angle(i + 1)];
    const [x0, y0] = at(a0, r);
    const [x1, y1] = at(a1, r);
    return slices === 1 ? `M${70 - r} 70 A${r} ${r} 0 1 1 ${70 + r} 70 A${r} ${r} 0 1 1 ${70 - r} 70 Z` : `M70 70 L${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1} Z`;
  };
  return (
    <svg viewBox="0 0 140 140" width={size} height={size} role="img" aria-label={t("scene.pizza.label", { left, slices })}>
      {/* The plate - what's eaten leaves it bare, its slices drawn dashed. */}
      <circle cx={70} cy={70} r={66} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={2} />
      {Array.from({ length: slices }, (_, i) => {
        if (i >= left) return <path key={i} d={wedge(i, R)} fill="none" stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 4" />;
        // A share is lifted out a little, outlined.
        const lift = i < taken ? 8 : 0;
        const mid = (angle(i) + angle(i + 1)) / 2;
        const [dx, dy] = [lift * Math.cos(mid), lift * Math.sin(mid)];
        return (
          <g key={i} transform={`translate(${dx} ${dy})`}>
            <path d={wedge(i, R)} fill="#f59e0b" stroke={i < taken ? "#16a34a" : INK} strokeWidth={i < taken ? 3.5 : 2} strokeLinejoin="round" />
            <path d={wedge(i, R - 7)} fill="#fde047" stroke="none" />
            {PEPPERONI.map(([f, s], k) => {
              const a = angle(i) + (angle(i + 1) - angle(i)) * s;
              const [x, y] = at(a, (R - 10) * f);
              return <circle key={k} cx={x} cy={y} r={Math.min(6, 36 / slices + 2)} fill="#dc2626" />;
            })}
          </g>
        );
      })}
    </svg>
  );
}

/** One or more pizzas side by side, each with its name under it. */
export function Pizzas({ pizzas, small = false }: { pizzas: Pizza[]; small?: boolean }) {
  const size = small ? 90 : pizzas.length > 2 ? 110 : 150;
  return (
    <div className="flex flex-wrap items-start justify-center gap-3">
      {pizzas.map((p, i) => (
        <figure key={i} className="flex flex-col items-center gap-1">
          <OnePizza pizza={p} size={size} />
          {p.label && <figcaption className="text-base font-bold text-slate-700">{p.label}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

const SQ = 34;

/** A chocolate bar of rows × cols squares, the last `eaten` of them gone (bare foil). */
export function ChocolateBar({ rows, cols, eaten }: { rows: number; cols: number; eaten: number }) {
  const n = rows * cols;
  return (
    <svg viewBox={`-6 -6 ${cols * SQ + 12} ${rows * SQ + 12}`} width={cols * SQ + 12} className="max-w-full" role="img" aria-label={t("scene.chocolate.label", { n, eaten })}>
      <rect x={-6} y={-6} width={cols * SQ + 12} height={rows * SQ + 12} rx={6} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1.5} />
      {Array.from({ length: n }, (_, i) => {
        const [r, c] = [Math.floor(i / cols), i % cols];
        const gone = i >= n - eaten;
        return (
          <g key={i}>
            <rect x={c * SQ + 2} y={r * SQ + 2} width={SQ - 4} height={SQ - 4} rx={3} fill={gone ? "#f8fafc" : "#7c2d12"} stroke={gone ? "#cbd5e1" : "#451a03"} strokeWidth={1.5} strokeDasharray={gone ? "3 3" : undefined} />
            {!gone && <rect x={c * SQ + 7} y={r * SQ + 7} width={SQ - 14} height={SQ - 14} rx={2} fill="#9a3412" />}
          </g>
        );
      })}
    </svg>
  );
}
