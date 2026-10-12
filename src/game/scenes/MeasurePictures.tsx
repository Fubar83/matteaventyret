import { t } from "../../i18n";
import type { RulerThing } from "../../engine/questions/scene";

/**
 * Pictures to read a number off: a number line, a ruler, a thermometer - and
 * a shape cut in equal parts. Drawn to scale, so reading them is the task.
 */

const INK = "#334155";
const swedish = (n: number) => (n < 0 ? `−${-n}` : String(n)).replace(".", ",");

/** A number line: a tick every `step`, a number under every `labelEvery`, an arrow at `arrow` (never on a numbered tick - that's the question). */
export function NumberLine({ from, to, step, labelEvery, arrow }: { from: number; to: number; step: number; labelEvery: number; arrow: number }) {
  const X = (n: number) => 24 + ((n - from) / (to - from)) * 372;
  const ticks = Math.round((to - from) / step);
  return (
    <svg viewBox="0 0 420 96" className="w-full max-w-lg" role="img" aria-label={t("scene.numberLine.label", { from, to })}>
      <line x1={14} y1={52} x2={406} y2={52} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = from + i * step;
        const k = (v - from) / labelEvery;
        const labelled = Math.abs(k - Math.round(k)) < 1e-9;
        return (
          <g key={i}>
            <line x1={X(v)} y1={labelled ? 40 : 45} x2={X(v)} y2={labelled ? 64 : 59} stroke={INK} strokeWidth={labelled ? 2.5 : 1.5} />
            {labelled && (
              <text x={X(v)} y={82} textAnchor="middle" fontSize={15} fontWeight={700} fill={INK}>
                {swedish(v)}
              </text>
            )}
          </g>
        );
      })}
      {/* The arrow, pointing down at the number asked. */}
      <g transform={`translate(${X(arrow)} 0)`}>
        <path d="M0 40 L-8 24 L-3 24 L-3 6 L3 6 L3 24 L8 24 Z" fill="#e11d48" />
      </g>
    </svg>
  );
}

const SHADE = "#38bdf8";
const PAPER = "#ffffff";

/** A circle, bar or square cut in `parts` equal parts, `shaded` coloured (from the start). */
export function FractionPicture({ shape, parts, shaded, size = 150 }: { shape: "circle" | "bar" | "square"; parts: number; shaded: number; size?: number }) {
  if (shape === "circle") {
    const r = 60;
    const wedge = (i: number) => {
      const a0 = (i / parts) * 2 * Math.PI - Math.PI / 2;
      const a1 = ((i + 1) / parts) * 2 * Math.PI - Math.PI / 2;
      const p = (a: number) => `${70 + r * Math.cos(a)} ${70 + r * Math.sin(a)}`;
      return `M70 70 L${p(a0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)} Z`;
    };
    return (
      <svg viewBox="0 0 140 140" width={size} height={size} role="img" aria-label={`${shaded}/${parts}`}>
        {Array.from({ length: parts }, (_, i) => (
          <path key={i} d={wedge(i)} fill={i < shaded ? SHADE : PAPER} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        ))}
      </svg>
    );
  }
  const [w, h] = shape === "bar" ? [180, 50] : [120, 120];
  return (
    <svg viewBox={`0 0 ${w + 10} ${h + 10}`} width={shape === "bar" ? size * 1.3 : size} role="img" aria-label={`${shaded}/${parts}`}>
      {Array.from({ length: parts }, (_, i) => (
        <rect key={i} x={5 + (i * w) / parts} y={5} width={w / parts} height={h} fill={i < shaded ? SHADE : PAPER} stroke={INK} strokeWidth={2.5} />
      ))}
    </svg>
  );
}

const CM = 26;
const THING_COLOR: Record<RulerThing, string> = { pencil: "#f59e0b", crayon: "#ef4444", straw: "#22c55e" };

/** A thing laid along a 15 cm ruler, from `startMm` to `startMm + lengthMm`. */
export function Ruler({ thing, startMm, lengthMm }: { thing: RulerThing; startMm: number; lengthMm: number }) {
  const X = (mm: number) => 16 + (mm / 10) * CM;
  const x0 = X(startMm);
  const x1 = X(startMm + lengthMm);
  const color = THING_COLOR[thing];
  return (
    <svg viewBox="0 0 430 130" className="w-full max-w-xl" role="img" aria-label={t(`scene.ruler.${thing}`)}>
      {/* The thing - a pencil with its tip, a crayon, a straw - over the ruler. */}
      {thing === "pencil" ? (
        <g>
          <rect x={x0} y={20} width={x1 - x0 - 22} height={22} rx={3} fill={color} stroke={INK} strokeWidth={1.5} />
          <path d={`M${x1 - 22} 20 L${x1} 31 L${x1 - 22} 42 Z`} fill="#fde68a" stroke={INK} strokeWidth={1.5} />
          <path d={`M${x1 - 7} 27.5 L${x1} 31 L${x1 - 7} 34.5 Z`} fill={INK} />
        </g>
      ) : thing === "crayon" ? (
        <g>
          <rect x={x0} y={20} width={x1 - x0 - 14} height={22} rx={4} fill={color} stroke={INK} strokeWidth={1.5} />
          <path d={`M${x1 - 14} 22 L${x1} 28 L${x1} 34 L${x1 - 14} 40 Z`} fill={color} stroke={INK} strokeWidth={1.5} />
        </g>
      ) : (
        <rect x={x0} y={24} width={x1 - x0} height={14} rx={7} fill={color} stroke={INK} strokeWidth={1.5} />
      )}
      {/* Where it starts and ends, down onto the ruler. */}
      <line x1={x0} y1={44} x2={x0} y2={60} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
      <line x1={x1} y1={44} x2={x1} y2={60} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
      <rect x={6} y={60} width={418} height={56} rx={6} fill="#fef9c3" stroke="#ca8a04" strokeWidth={2} />
      {Array.from({ length: 151 }, (_, mm) => (
        <line key={mm} x1={X(mm)} y1={60} x2={X(mm)} y2={60 + (mm % 10 === 0 ? 20 : mm % 5 === 0 ? 14 : 8)} stroke={INK} strokeWidth={mm % 10 === 0 ? 1.8 : 1} />
      ))}
      {Array.from({ length: 16 }, (_, cm) => (
        <text key={cm} x={X(cm * 10)} y={98} textAnchor="middle" fontSize={13} fontWeight={700} fill={INK}>
          {cm}
        </text>
      ))}
      <text x={416} y={110} textAnchor="end" fontSize={10} fill="#a16207">
        cm
      </text>
    </svg>
  );
}

/** A thermometer from `min` to `max` degrees, the red column up to `value`. */
export function Thermometer({ value, min, max }: { value: number; min: number; max: number }) {
  const Y = (deg: number) => 20 + ((max - deg) / (max - min)) * 240;
  return (
    <svg viewBox="0 0 150 310" height={280} role="img" aria-label={t("scene.thermometer.label", { t: swedish(value) })}>
      <rect x={60} y={10} width={30} height={262} rx={15} fill="#f8fafc" stroke={INK} strokeWidth={2.5} />
      <circle cx={75} cy={284} r={20} fill="#ef4444" stroke={INK} strokeWidth={2.5} />
      <rect x={68} y={Y(value)} width={14} height={284 - Y(value)} fill="#ef4444" />
      {Array.from({ length: max - min + 1 }, (_, i) => {
        const deg = min + i;
        const big = deg % 5 === 0;
        return (
          <g key={deg}>
            <line x1={90} y1={Y(deg)} x2={big ? 104 : 97} y2={Y(deg)} stroke={deg === 0 ? "#0369a1" : INK} strokeWidth={deg === 0 ? 2.5 : big ? 1.8 : 1} />
            {big && (
              <text x={108} y={Y(deg)} dominantBaseline="central" fontSize={13} fontWeight={deg === 0 ? 800 : 600} fill={deg === 0 ? "#0369a1" : INK}>
                {swedish(deg)}
              </text>
            )}
          </g>
        );
      })}
      <text x={40} y={22} textAnchor="end" fontSize={14} fontWeight={700} fill={INK}>
        °C
      </text>
    </svg>
  );
}

/** The numbers on a kitchen scale: every 100 g, every 200 g past 1 000 (the generator's labelled ticks are the same). */
export const scaleLabelEvery = (max: number) => (max > 1000 ? 200 : 100);

/** A kitchen scale: a dial from 0 to `max` grams round most of the circle, a tick every `step`, the needle at `grams`. */
export function KitchenScale({ grams, max, step }: { grams: number; max: number; step: number }) {
  const labelEvery = scaleLabelEvery(max);
  // 0 at the bottom left, `max` at the bottom right, clockwise over the top.
  const angle = (g: number) => ((-135 + (g / max) * 270) * Math.PI) / 180;
  const at = (g: number, r: number) => [110 + r * Math.sin(angle(g)), 120 - r * Math.cos(angle(g))] as const;
  const [nx, ny] = at(grams, 62);
  return (
    <svg viewBox="0 0 220 220" width={220} role="img" aria-label={t("scene.kitchenScale.label")}>
      <ellipse cx={110} cy={26} rx={70} ry={14} fill="#e2e8f0" stroke={INK} strokeWidth={2} />
      <rect x={20} y={34} width={180} height={176} rx={26} fill="#fda4af" stroke={INK} strokeWidth={2.5} />
      <circle cx={110} cy={120} r={80} fill="#fff" stroke={INK} strokeWidth={2.5} />
      {Array.from({ length: max / step + 1 }, (_, i) => {
        const g = i * step;
        const big = g % labelEvery === 0;
        const [x1, y1] = at(g, 76);
        const [x2, y2] = at(g, big ? 64 : 69);
        const [lx, ly] = at(g, 52);
        return (
          <g key={g}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={big ? 2 : 1.2} />
            {big && (
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={max > 1000 ? 9.5 : 11} fontWeight={700} fill={INK}>
                {g}
              </text>
            )}
          </g>
        );
      })}
      <text x={110} y={160} textAnchor="middle" fontSize={14} fontWeight={700} fill="#64748b">
        g
      </text>
      <line x1={110} y1={120} x2={nx} y2={ny} stroke="#dc2626" strokeWidth={3} strokeLinecap="round" />
      <circle cx={110} cy={120} r={6} fill="#dc2626" />
    </svg>
  );
}

/** A measuring jug: a mark every decilitre, every other one numbered, 1 l at the top; juice up to `dl`. */
export function Jug({ dl }: { dl: number }) {
  const Y = (d: number) => 200 - d * 17;
  return (
    <svg viewBox="0 0 200 220" width={190} role="img" aria-label={t("scene.jug.label")}>
      <path d="M40 22 L140 22 L134 200 Q133 208 125 208 L55 208 Q47 208 46 200 Z" fill="#f8fafc" stroke={INK} strokeWidth={2.5} />
      <path d="M140 50 Q178 60 172 110 Q168 150 136 160" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <path d={`M${46 - 0.033 * (196 - Y(dl))} ${Y(dl)} L${134 + 0.033 * (196 - Y(dl))} ${Y(dl)} L134 200 Q133 208 125 208 L55 208 Q47 208 46 200 Z`} fill="#fb923c" opacity={0.8} />
      {Array.from({ length: 10 }, (_, i) => {
        const d = i + 1;
        const numbered = d % 2 === 0;
        return (
          <g key={d}>
            <line x1={48} y1={Y(d)} x2={numbered ? 72 : 62} y2={Y(d)} stroke={INK} strokeWidth={numbered ? 2 : 1.3} />
            {numbered && (
              <text x={76} y={Y(d)} dominantBaseline="central" fontSize={12} fontWeight={700} fill={INK}>
                {d === 10 ? "1 l" : `${d} dl`}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
