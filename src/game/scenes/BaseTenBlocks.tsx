import { useState, type ReactNode } from "react";
import { digitAt } from "../../engine/digits";
import { t } from "../../i18n";

/**
 * A number as base-ten blocks: thousand cubes, hundred plates, ten rods and
 * single ones, each place its own group - so "the 7 in 3 742" is seen to be
 * seven plates of a hundred. The asked place is lit; tapping a group says
 * what it is (7 hundratal: 7 · 100), the working out left to the child.
 */
const UNITS = [1, 10, 100, 1000];
const COLORS = ["#f59e0b", "#22c55e", "#3b82f6", "#a855f7"];

/** One block of a place, drawn at x, y. */
function block(place: number, x: number, y: number, key: number): ReactNode {
  const c = COLORS[place];
  const s = "#1e293b";
  if (place === 0) return <rect key={key} x={x} y={y} width={9} height={9} rx={1.5} fill={c} stroke={s} strokeWidth={1.2} />;
  if (place === 1)
    return (
      <g key={key}>
        <rect x={x} y={y} width={9} height={60} rx={1.5} fill={c} stroke={s} strokeWidth={1.2} />
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} x1={x} y1={y + 6 * (i + 1)} x2={x + 9} y2={y + 6 * (i + 1)} stroke={s} strokeWidth={0.6} opacity={0.5} />
        ))}
      </g>
    );
  if (place === 2)
    return (
      <g key={key}>
        <rect x={x} y={y} width={44} height={44} rx={2} fill={c} stroke={s} strokeWidth={1.2} />
        {Array.from({ length: 9 }, (_, i) => (
          <g key={i} stroke={s} strokeWidth={0.5} opacity={0.45}>
            <line x1={x + 4.4 * (i + 1)} y1={y} x2={x + 4.4 * (i + 1)} y2={y + 44} />
            <line x1={x} y1={y + 4.4 * (i + 1)} x2={x + 44} y2={y + 4.4 * (i + 1)} />
          </g>
        ))}
      </g>
    );
  // A thousand: a cube, drawn with its top and side.
  return (
    <g key={key}>
      <path d={`M${x} ${y + 12} h44 v44 h-44 Z`} fill={c} stroke={s} strokeWidth={1.2} />
      <path d={`M${x} ${y + 12} l12 -12 h44 l-12 12 Z`} fill="#c084fc" stroke={s} strokeWidth={1.2} />
      <path d={`M${x + 44} ${y + 12} l12 -12 v44 l-12 12 Z`} fill="#7e22ce" stroke={s} strokeWidth={1.2} />
    </g>
  );
}

/** Where each of a place's blocks goes inside its group: cubes and plates overlapping in a stack, rods side by side, ones in a column pair. */
function layout(place: number, count: number): { x: number; y: number }[] {
  return Array.from({ length: count }, (_, i) => {
    if (place === 3) return { x: i * 8, y: 40 - i * 4 };
    if (place === 2) return { x: i * 7, y: 40 - i * 4 };
    if (place === 1) return { x: i * 12, y: 22 };
    return { x: (i % 3) * 12, y: 70 - Math.floor(i / 3) * 12 };
  });
}

export function BaseTenBlocks({ number, highlight }: { number: number; highlight: number }) {
  const places = String(number).length;
  const [opened, setOpened] = useState<number | null>(null);
  const cols = Array.from({ length: places }, (_, i) => places - 1 - i); // thousands first, left to right
  return (
    <div className="w-full max-w-xl rounded-3xl bg-gradient-to-b from-amber-50 to-white border-2 border-amber-100 shadow-sm p-3 flex flex-col items-center gap-2">
      <div className="flex gap-2 justify-center flex-wrap">
        {cols.map((place) => {
          const d = digitAt(number, place);
          const lit = place === highlight;
          return (
            <button
              key={place}
              type="button"
              onClick={() => setOpened(place)}
              className={`flex flex-col items-center rounded-2xl px-2 pt-2 pb-1 transition ${lit ? "bg-amber-100 ring-4 ring-amber-300" : "bg-white/70 hover:bg-white"}`}
              aria-label={t("scene.blocks.group", { d, place: t(`place.${place}`) })}
            >
              <svg width={110} height={100} viewBox="-4 -4 118 100" aria-hidden>
                {layout(place, d).map((p, i) => block(place, p.x, p.y, i))}
              </svg>
              <span className="text-2xl font-extrabold tabular-nums" style={{ color: COLORS[place] }}>
                {d}
              </span>
              <span className="text-xs font-semibold text-slate-500">{t(`place.${place}`)}</span>
            </button>
          );
        })}
      </div>
      <p className="text-sm text-slate-600 text-center min-h-5">
        {opened === null ? t("scene.blocks.hint") : t("scene.blocks.says", { d: digitAt(number, opened), place: t(`place.${opened}`), unit: UNITS[opened] })}
      </p>
    </div>
  );
}
