import type { ChanceColor, ShapeName } from "../../engine/questions/scene";
import { t } from "../../i18n";

/**
 * Pictures to recognise: the plane figures and solids, a figure on a grid
 * with a line to fold along, and the things chance is about - a bag of
 * marbles, a spinner, a die.
 */

const INK = "#334155";
const FACE = "#bae6fd";
const SIDE = "#7dd3fc";
const TOP = "#e0f2fe";

/** A plane figure, or a solid drawn in perspective (the hidden edges dashed). */
export function ShapePicture({ shape, size = 140 }: { shape: ShapeName; size?: number }) {
  const poly = (n: number, r = 52, start = -90) =>
    Array.from({ length: n }, (_, i) => {
      const a = ((start + (i * 360) / n) * Math.PI) / 180;
      return `${70 + r * Math.cos(a)},${72 + r * Math.sin(a)}`;
    }).join(" ");
  const line = { stroke: INK, strokeWidth: 2.5, strokeLinejoin: "round" as const };
  const hidden = { stroke: INK, strokeWidth: 1.5, strokeDasharray: "4 4", fill: "none" };
  const drawing = (() => {
    switch (shape) {
      case "circle":
        return <circle cx={70} cy={70} r={52} fill={FACE} {...line} />;
      case "triangle":
        return <polygon points={poly(3, 58, -90)} fill={FACE} {...line} />;
      case "square":
        return <rect x={22} y={22} width={96} height={96} fill={FACE} {...line} />;
      case "rectangle":
        return <rect x={8} y={38} width={124} height={66} fill={FACE} {...line} />;
      case "pentagon":
        return <polygon points={poly(5)} fill={FACE} {...line} />;
      case "hexagon":
        return <polygon points={poly(6, 54, 0)} fill={FACE} {...line} />;
      case "cube":
        return (
          <g>
            <polygon points="20,50 90,50 90,120 20,120" fill={FACE} {...line} />
            <polygon points="20,50 50,22 120,22 90,50" fill={TOP} {...line} />
            <polygon points="90,50 120,22 120,92 90,120" fill={SIDE} {...line} />
            <path d="M20 120 L50 92 L120 92 M50 92 L50 22" {...hidden} />
          </g>
        );
      case "cuboid":
        return (
          <g>
            <polygon points="6,62 100,62 100,118 6,118" fill={FACE} {...line} />
            <polygon points="6,62 36,38 130,38 100,62" fill={TOP} {...line} />
            <polygon points="100,62 130,38 130,94 100,118" fill={SIDE} {...line} />
            <path d="M6 118 L36 94 L130 94 M36 94 L36 38" {...hidden} />
          </g>
        );
      case "sphere":
        return (
          <g>
            <circle cx={70} cy={70} r={54} fill={FACE} {...line} />
            <path d="M16 70 A54 16 0 0 0 124 70" fill="none" stroke={INK} strokeWidth={1.8} />
            <path d="M16 70 A54 16 0 0 1 124 70" {...hidden} />
            <ellipse cx={52} cy={48} rx={12} ry={8} fill="#ffffff" opacity={0.7} />
          </g>
        );
      case "cylinder":
        return (
          <g>
            <path d="M28 30 L28 112 A42 13 0 0 0 112 112 L112 30" fill={SIDE} {...line} />
            <path d="M28 112 A42 13 0 0 1 112 112" {...hidden} />
            <ellipse cx={70} cy={30} rx={42} ry={13} fill={TOP} {...line} />
          </g>
        );
      case "cone":
        return (
          <g>
            <path d="M70 12 L24 112 A46 14 0 0 0 116 112 Z" fill={SIDE} {...line} />
            <path d="M24 112 A46 14 0 0 1 116 112" {...hidden} />
          </g>
        );
      case "pyramid":
        return (
          <g>
            <polygon points="70,12 18,112 96,124" fill={SIDE} {...line} />
            <polygon points="70,12 96,124 124,100" fill={FACE} {...line} />
            <path d="M18 112 L48 92 L124 100 M48 92 L70 12" {...hidden} />
          </g>
        );
    }
  })();
  return (
    <svg viewBox="0 0 140 140" width={size} height={size} role="img" aria-label={t(`shape.${shape}`)}>
      {drawing}
    </svg>
  );
}

const CELL = 30;

/** A figure of squares on a grid, and a dashed line - after column (or row) `at` - to fold along. */
export function SymmetryGrid({ size, cells, line, at }: { size: number; cells: [number, number][]; line: "vertical" | "horizontal"; at: number }) {
  const px = size * CELL;
  return (
    <svg viewBox={`-6 -6 ${px + 12} ${px + 12}`} width={px + 12} className="max-w-full" role="img" aria-label={t("scene.symmetry.label")}>
      {Array.from({ length: size }, (_, r) =>
        Array.from({ length: size }, (_, c) => (
          <rect key={`${c}-${r}`} x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill={cells.some(([x, y]) => x === c && y === r) ? "#fb923c" : "#ffffff"} stroke="#cbd5e1" strokeWidth={1} />
        ))
      )}
      {line === "vertical" ? (
        <line x1={at * CELL} y1={-6} x2={at * CELL} y2={px + 6} stroke="#be123c" strokeWidth={3} strokeDasharray="8 6" />
      ) : (
        <line x1={-6} y1={at * CELL} x2={px + 6} y2={at * CELL} stroke="#be123c" strokeWidth={3} strokeDasharray="8 6" />
      )}
    </svg>
  );
}

export const CHANCE_HEX: Record<ChanceColor, string> = { red: "#ef4444", blue: "#3b82f6", yellow: "#facc15", green: "#22c55e" };

/** Marbles in a bag, a spinner's sectors (each colour `count` of them), or a die. */
export function ChanceDevice({ device, colors }: { device: "bag" | "spinner" | "die"; colors: { color: ChanceColor; count: number }[] }) {
  if (device === "die") {
    const pips = [
      [40, 40],
      [100, 40],
      [40, 70],
      [100, 70],
      [40, 100],
      [100, 100],
    ];
    return (
      <div className="flex flex-col items-center gap-1">
        <svg viewBox="0 0 140 140" width={120} role="img" aria-label={t("scene.die.label")}>
          <rect x={10} y={10} width={120} height={120} rx={20} fill="#ffffff" stroke={INK} strokeWidth={3} />
          {pips.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={10} fill={INK} />
          ))}
        </svg>
        <p className="text-sm text-slate-600">{t("scene.die.caption")}</p>
      </div>
    );
  }
  const pieces = colors.flatMap((c) => Array.from({ length: c.count }, () => c.color));
  if (device === "spinner") {
    const n = pieces.length;
    const r = 70;
    const sector = (i: number) => {
      const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
      const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
      const p = (a: number) => `${80 + r * Math.cos(a)} ${80 + r * Math.sin(a)}`;
      return `M80 80 L${p(a0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)} Z`;
    };
    // Same colours next to each other, as a spinner is coloured.
    return (
      <svg viewBox="0 0 160 160" width={170} role="img" aria-label={t("scene.spinner.label", { n })}>
        {n === 1 ? (
          <circle cx={80} cy={80} r={r} fill={CHANCE_HEX[pieces[0]]} stroke={INK} strokeWidth={2} />
        ) : (
          pieces.map((c, i) => <path key={i} d={sector(i)} fill={CHANCE_HEX[c]} stroke={INK} strokeWidth={2} />)
        )}
        <path d="M80 80 L80 28" stroke={INK} strokeWidth={5} strokeLinecap="round" />
        <path d="M72 34 L80 18 L88 34 Z" fill={INK} />
        <circle cx={80} cy={80} r={7} fill={INK} />
      </svg>
    );
  }
  // A bag, open at the top, the marbles in rows.
  const perRow = 4;
  return (
    <svg viewBox="0 0 180 170" width={180} role="img" aria-label={t("scene.bag.label", { n: pieces.length })}>
      <path d="M40 40 Q20 160 90 160 Q160 160 140 40 Z" fill="#d6c3a5" stroke="#78350f" strokeWidth={3} />
      <path d="M36 40 L144 40" stroke="#78350f" strokeWidth={6} strokeLinecap="round" />
      {pieces.map((c, i) => {
        const row = Math.floor(i / perRow);
        const inRow = Math.min(perRow, pieces.length - row * perRow);
        const col = i % perRow;
        return <circle key={i} cx={90 + (col - (inRow - 1) / 2) * 26} cy={140 - row * 26} r={11} fill={CHANCE_HEX[c]} stroke={INK} strokeWidth={1.5} />;
      })}
    </svg>
  );
}
