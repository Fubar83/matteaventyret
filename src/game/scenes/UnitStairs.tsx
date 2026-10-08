import { useState } from "react";
import type { UnitFamily } from "../../engine/questionScene";
import { t } from "../../i18n";
import { kenney } from "./Sprite";

/**
 * Enhetstrappan - the unit staircase Swedish schools use: big units at the
 * top, small at the bottom. Only the units children meet are on it (no hm,
 * dam, dag, hl, dal or ar), so a step can be worth × 10, × 100 or × 1 000 -
 * drawn that many tens deep (hundreds for area; × 24 and × 60 for time). A frog hops from the question's unit to the one asked
 * for, a step at a time, and the steps it takes add up to what to multiply
 * (or divide) by. The number itself is left to the child. Above the stairs,
 * what the units are: a metre of ten decimetres, a square decimetre of a
 * hundred square centimetres, a litre that is a cube of 1 dm.
 */
interface Step {
  name: string;
  /** The same step under another name: 1 l = 1 dm³, 1 ml = 1 cm³. */
  alias?: string;
}

const STAIRS: Record<UnitFamily, { steps: Step[]; factors: number[]; color: string }> = {
  length: {
    steps: [{ name: "mil" }, { name: "km" }, { name: "m" }, { name: "dm" }, { name: "cm" }, { name: "mm" }],
    factors: [10, 1000, 10, 10, 10],
    color: "#3b82f6",
  },
  mass: {
    steps: [{ name: "ton" }, { name: "kg" }, { name: "hg" }, { name: "g" }],
    factors: [1000, 10, 100],
    color: "#f59e0b",
  },
  volume: {
    steps: [{ name: "m³" }, { name: "l", alias: "dm³" }, { name: "dl" }, { name: "cl" }, { name: "ml", alias: "cm³" }],
    factors: [1000, 10, 10, 10],
    color: "#06b6d4",
  },
  area: {
    steps: [{ name: "km²" }, { name: "ha" }, { name: "m²" }, { name: "dm²" }, { name: "cm²" }, { name: "mm²" }],
    factors: [100, 10000, 100, 100, 100],
    color: "#22c55e",
  },
  time: {
    steps: [{ name: "dygn" }, { name: "h" }, { name: "min" }, { name: "s" }],
    factors: [24, 60, 60],
    color: "#a855f7",
  },
};

const indexOf = (family: UnitFamily, unit: string) => STAIRS[family].steps.findIndex((s) => s.name === unit || s.alias === unit);

/** The units along the way, in pairs with what's between them: m → cm is m–dm, dm–cm; ton → kg is one pair of 1 000. */
function pairs(family: UnitFamily, a: number, b: number): { big: string; small: string; factor: number }[] {
  const { steps, factors } = STAIRS[family];
  const lo = Math.min(a, b);
  return Array.from({ length: Math.abs(b - a) }, (_, k) => ({ big: steps[lo + k].name, small: steps[lo + k + 1].name, factor: factors[lo + k] }));
}

/** How deep a step is drawn: one for each ten (each hundred for area) it's worth; time's 24 and 60 are one each. */
function depth(family: UnitFamily, factor: number) {
  const base = family === "area" ? 100 : family === "time" ? factor : 10;
  return Math.max(1, Math.round(Math.log(factor) / Math.log(base)));
}

// --- What the units are --------------------------------------------------------

/** "1 m = 10 dm": a bar of ten (or of as many as fit), the parts named. */
function TenBar({ big, small, factor, color }: { big: string; small: string; factor: number; color: string }) {
  const parts = factor <= 12 ? factor : factor === 24 ? 24 : factor === 60 ? 12 : 10;
  const per = factor / parts;
  return (
    <div className="flex flex-col items-center gap-0.5 w-full max-w-sm">
      <div className="flex w-full h-7 rounded-md overflow-hidden border-2 border-slate-700">
        {Array.from({ length: parts }, (_, i) => (
          <div key={i} className="flex-1 border-r border-slate-700/40 last:border-r-0" style={{ background: i % 2 ? `${color}55` : `${color}aa` }} />
        ))}
      </div>
      <div className="flex w-full justify-between text-[11px] text-slate-500">
        <span>0</span>
        <span>
          {per === 1 ? `1 ${small}` : `${per} ${small}`} {t("units.each")}
        </span>
        <span>
          {factor} {small}
        </span>
      </div>
      <div className="text-sm font-extrabold text-slate-700">
        1 {big} = {factor} {small}
      </div>
    </div>
  );
}

/** "1 dm² = 100 cm²": a square of ten by ten. */
function HundredGrid({ big, small }: { big: string; small: string }) {
  return (
    <div className="flex items-center gap-3">
      <svg width={84} height={84} viewBox="0 0 102 102" aria-hidden>
        {Array.from({ length: 100 }, (_, i) => (
          <rect key={i} x={1 + (i % 10) * 10} y={1 + Math.floor(i / 10) * 10} width={10} height={10} fill={i === 0 ? "#22c55e" : "#dcfce7"} stroke="#15803d" strokeWidth={0.6} />
        ))}
        <rect x={1} y={1} width={100} height={100} fill="none" stroke="#14532d" strokeWidth={2} />
      </svg>
      <div className="text-sm text-slate-700">
        <div className="font-extrabold">
          1 {big} = 100 {small}
        </div>
        <div className="text-xs text-slate-500">{t("units.gridHint", { big, small })}</div>
      </div>
    </div>
  );
}

/** A cube 1 dm each way is a litre (and 1 cm each way a millilitre; 1 m each way a thousand litres). */
function LitreCube({ edge, holds }: { edge: string; holds: string }) {
  return (
    <div className="flex items-center gap-3">
      <svg width={84} height={84} viewBox="0 0 100 100" aria-hidden>
        <path d="M14 34 h52 v52 h-52 Z" fill="#a5f3fc" stroke="#0e7490" strokeWidth={2.5} />
        <path d="M14 34 l18 -18 h52 l-18 18 Z" fill="#cffafe" stroke="#0e7490" strokeWidth={2.5} />
        <path d="M66 34 l18 -18 v52 l-18 18 Z" fill="#67e8f9" stroke="#0e7490" strokeWidth={2.5} />
        {/* Water inside, to show it holds liquid. */}
        <path d="M16 56 h48 v28 h-48 Z" fill="#06b6d4" opacity={0.55} />
        <text x={40} y={98} textAnchor="middle" fontSize={11} fontWeight={700} fill="#0e7490">
          {edge}
        </text>
      </svg>
      <div className="text-sm font-extrabold text-slate-700">{holds}</div>
    </div>
  );
}

function UnitPicture({ family, from, to }: { family: UnitFamily; from: string; to: string }) {
  const a = indexOf(family, from);
  const b = indexOf(family, to);
  const { color } = STAIRS[family];
  if (a === b) {
    // l = dm³, ml = cm³: the same, two names.
    const litre = from === "l" || to === "l";
    return <LitreCube edge={litre ? "1 dm" : "1 cm"} holds={litre ? "1 dm³ = 1 l" : "1 cm³ = 1 ml"} />;
  }
  const ps = pairs(family, a, b).slice(0, 3);
  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {ps.map((p) =>
        family === "area" && p.factor === 100 ? (
          <HundredGrid key={p.big} big={p.big} small={p.small} />
        ) : family === "volume" && p.big === "m³" ? (
          <LitreCube key={p.big} edge="1 m" holds="1 m³ = 1 000 l" />
        ) : (
          <TenBar key={p.big} big={p.big} small={p.small} factor={p.factor} color={color} />
        )
      )}
    </div>
  );
}

// --- The staircase -------------------------------------------------------------

const STEP_W = 84;
const STEP_H = 26;
/** Room above the top step for the frog and the number it starts with. */
const TOP = 70;

export function UnitStairs({ family, from, to, value }: { family: UnitFamily; from: string; to: string; value: number }) {
  const { steps, factors, color } = STAIRS[family];
  const start = indexOf(family, from);
  const goal = indexOf(family, to);
  const [at, setAt] = useState(start);
  const down = goal > start;
  const done = at === goal;
  const walked = Array.from({ length: Math.abs(at - start) }, (_, i) => factors[Math.min(start, at) + i]);
  const total = walked.reduce((x, y) => x * y, 1);
  const tops = factors.reduce((acc, f) => [...acc, acc[acc.length - 1] + depth(family, f) * STEP_H], [TOP]);
  const W = steps.length * STEP_W + 20;
  const H = tops[tops.length - 1] + 58;
  const x = (i: number) => 10 + i * STEP_W;
  const y = (i: number) => tops[i];
  const sayValue = String(value).replace(".", ",");

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <UnitPicture family={family} from={from} to={to} />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-lg" role="img" aria-label={t("units.stairs")}>
        {steps.map((s, i) => {
          const onPath = (i >= Math.min(start, goal) && i <= Math.max(start, goal));
          return (
            <g key={i}>
              {/* The step: its top, and the riser below it. */}
              <rect x={x(i)} y={y(i)} width={STEP_W} height={H - y(i) - 4} fill={onPath ? `${color}33` : "#f1f5f9"} stroke="#334155" strokeWidth={1.5} />
              <rect x={x(i)} y={y(i)} width={STEP_W} height={8} fill={onPath ? color : "#cbd5e1"} />
              <text x={x(i) + STEP_W / 2} y={y(i) + 26} textAnchor="middle" fontSize={17} fontWeight={800} fill="#0f172a">
                {s.name}
              </text>
              {s.alias && (
                <text x={x(i) + STEP_W / 2} y={y(i) + 40} textAnchor="middle" fontSize={11} fontWeight={700} fill="#475569">
                  = {s.alias}
                </text>
              )}
              {i === goal && i !== at && (
                <image href={kenney("flag")} x={x(i) + STEP_W / 2 - 12} y={y(i) - 26} width={24} height={24} />
              )}
            </g>
          );
        })}
        {/* What a step down is worth, on each riser just below the lower step's top - clear of the frog and the flag. Drawn after the steps so none covers it. */}
        {factors.map((f, i) => (
          <g key={i} transform={`translate(${x(i + 1)} ${y(i + 1) + 18})`}>
            <rect x={-(6 + 3.2 * String(f).length)} y={-8} width={12 + 6.4 * String(f).length} height={16} rx={8} fill="#fff" stroke="#cbd5e1" />
            <text textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700} fill="#475569">
              ×{f}
            </text>
          </g>
        ))}
        {/* The steps taken so far, as hops. */}
        {walked.map((_, k) => {
          const i = down ? start + k : start - k - 1;
          return <path key={k} d={`M${x(i) + STEP_W / 2} ${y(i) - 4} Q ${x(i) + STEP_W} ${y(i) - 30} ${x(i + 1) + STEP_W / 2} ${y(i + 1) - 4}`} fill="none" stroke={color} strokeWidth={2.5} strokeDasharray="4 3" />;
        })}
        <image href={kenney("frog-jump")} x={x(at) + STEP_W / 2 - 20} y={y(at) - 38} width={40} height={40} className="anim-bob" style={{ transition: "x 0.3s, y 0.3s" }} />
        {/* The start: the number in the question. */}
        <g transform={`translate(${x(start) + STEP_W / 2} ${y(start) - 46})`}>
          <rect x={-28} y={-12} width={56} height={20} rx={8} fill="#fff" stroke={color} strokeWidth={2} />
          <text textAnchor="middle" dominantBaseline="central" y={-2} fontSize={12} fontWeight={800} fill="#0f172a">
            {sayValue} {from}
          </text>
        </g>
      </svg>
      <div className="rounded-xl bg-white border border-slate-200 px-3 py-1 text-base font-bold text-slate-700 text-center">
        {start === goal
          ? t("units.same", { from, to })
          : walked.length === 0
            ? t("units.start", { from, to })
            : done
              ? t(down ? "units.doneDown" : "units.doneUp", { from, to, n: walked.length, factor: total, value: sayValue })
              : `${walked.map((f) => `${down ? "×" : "/"} ${f}`).join(" ")}`}
      </div>
      <div className="flex gap-2">
        {!done && (
          <button type="button" onClick={() => setAt(at + (down ? 1 : -1))} className="h-10 px-4 rounded-full text-sm font-bold shadow-sm border-2 bg-emerald-100 border-emerald-300 text-emerald-900 active:translate-y-0.5">
            {down ? t("units.stepDown", { f: factors[at] }) : t("units.stepUp", { f: factors[at - 1] })}
          </button>
        )}
        {at !== start && (
          <button type="button" onClick={() => setAt(start)} className="h-10 px-4 rounded-full text-sm font-bold shadow-sm border-2 bg-white border-slate-200 text-slate-600">
            ↺ {t("scene.reset")}
          </button>
        )}
      </div>
    </div>
  );
}
