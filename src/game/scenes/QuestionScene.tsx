import { useState } from "react";
import type { GroupThing, QuestionScene as Scene, ScaleTerm } from "../../engine/questions/written/questionScene";
import { t } from "../../i18n";
import { Sprite } from "./Sprite";
import { UnitStairs } from "./UnitStairs";
import type { SpriteName } from "./spriteNames";

/**
 * The picture of a question for the younger levels - and a thing to try
 * with: share the pile out, count the groups, take the same off both pans.
 * The child still works the answer out and writes it; these show what the
 * calculation means. Using them isn't help - it's what the pictures are for.
 */

const THINGS: Record<GroupThing, { item: string; holderClass: string }> = {
  cookies: { item: "🍪", holderClass: "rounded-full bg-white border-4 border-slate-200 shadow-inner" },
  eggs: { item: "🥚", holderClass: "rounded-full border-4 border-amber-800 shadow-inner bg-[repeating-linear-gradient(45deg,#b45309_0_4px,#92400e_4px_8px)]" },
  apples: { item: "🍎", holderClass: "rounded-b-[2rem] rounded-t-lg border-4 border-amber-700 bg-[repeating-linear-gradient(90deg,#fcd34d_0_6px,#f59e0b_6px_8px)]" },
  fish: { item: "🐟", holderClass: "rounded-full bg-sky-200/80 border-4 border-sky-400" },
  flowers: { item: "🌸", holderClass: "rounded-b-2xl rounded-t-md bg-orange-400 border-4 border-orange-600" },
  stars: { item: "⭐", holderClass: "rounded-full bg-indigo-100 border-4 border-indigo-200" },
};

/** The animals that share - Kenney's round ones (kenney.nl, CC0). */
const ANIMALS: SpriteName[] = ["bear", "rabbit", "pig", "panda", "frog", "owl", "cow", "monkey", "penguin", "chick"];

const tinyButton = "h-9 px-3 rounded-full text-sm font-bold shadow-sm border-2 active:translate-y-0.5";

// --- The balance -----------------------------------------------------------------

const UNKNOWN = 34;
const termWidth = (t: ScaleTerm, box: number) => (t.kind === "unknown" ? box : 30 + 10 * String(t.value).length);

/** Things laid on a pan, in rows from the bottom up, centred. Weights on the left can be tapped (`onWeight`). */
function panContents(terms: ScaleTerm[], cx: number, bottom: number, onWeight?: (index: number) => void) {
  const unknowns = terms.filter((t) => t.kind === "unknown").length;
  const box = unknowns > 8 ? 24 : unknowns > 4 ? 28 : UNKNOWN;
  const rowHeight = Math.max(box + 4, 34);
  const rows: { term: ScaleTerm; index: number }[][] = [[]];
  let width = 0;
  terms.forEach((term, index) => {
    const tw = termWidth(term, box) + 4;
    if (width + tw > 156 && rows[rows.length - 1].length > 0) {
      rows.push([]);
      width = 0;
    }
    rows[rows.length - 1].push({ term, index });
    width += tw;
  });
  return rows.flatMap((row, r) => {
    const total = row.reduce((s, { term }) => s + termWidth(term, box) + 4, -4);
    let x = cx - total / 2;
    return row.map(({ term, index }) => {
      const tw = termWidth(term, box);
      const el =
        term.kind === "unknown" ? (
          <g key={`${r}-${index}`} transform={`translate(${x} ${bottom - (r + 1) * rowHeight + (rowHeight - box - 4)})`}>
            <rect width={box} height={box} rx={6} fill="url(#mystery)" stroke="#5b21b6" strokeWidth={2} />
            <rect x={4} y={3} width={box * 0.35} height={4} rx={2} fill="#ffffff" opacity={0.5} />
            <text x={box / 2} y={box / 2 + 1} textAnchor="middle" dominantBaseline="central" fontSize={box * 0.6} fontWeight={900} fill="#fff" fontFamily="system-ui, sans-serif">
              {term.label}
            </text>
          </g>
        ) : (
          <g
            key={`${r}-${index}`}
            transform={`translate(${x} ${bottom - (r + 1) * rowHeight + (rowHeight - 34)})`}
            onClick={onWeight ? () => onWeight(index) : undefined}
            style={onWeight ? { cursor: "pointer" } : undefined}
            role={onWeight ? "button" : undefined}
            aria-label={onWeight ? t("scene.balance.takeAway", { n: term.value }) : undefined}
          >
            {onWeight && <rect x={-4} y={-2} width={tw + 8} height={40} rx={10} fill="#fde68a" opacity={0.7} className="anim-twinkle" />}
            <path d={`M${tw / 2 - 8} 6 a 8 8 0 0 1 16 0`} fill="none" stroke="#475569" strokeWidth={3} />
            <rect y={5} width={tw} height={28} rx={7} fill="url(#weight)" stroke="#334155" strokeWidth={2} />
            <text x={tw / 2} y={20} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={900} fill="#fff" fontFamily="system-ui, sans-serif">
              {term.value}
            </text>
          </g>
        );
      x += tw + 4;
      return el;
    });
  });
}

/** One side of the balance as an equation side: "? + 7", "3x", "x + x + 3" as "2x + 3". */
function sideText(terms: ScaleTerm[]): string {
  const unknowns = terms.filter((t) => t.kind === "unknown");
  const weights = terms.filter((t): t is { kind: "weight"; value: number } => t.kind === "weight");
  const parts: string[] = [];
  if (unknowns.length > 0) {
    const label = (unknowns[0] as { label: string }).label;
    parts.push(unknowns.length === 1 ? label : label === "x" ? `${unknowns.length}x` : `${unknowns.length} · ${label}`);
  }
  for (const w of weights) parts.push(String(w.value));
  return parts.join(" + ") || "0";
}

/**
 * An equation as a balance scale, level - both pans weigh the same. Tap a
 * weight next to the unknowns and the same comes off the other pan too;
 * with only unknowns left, split the other pan into as many equal parts.
 */
function Balance({ left: startLeft, right: startRight }: { left: ScaleTerm[]; right: ScaleTerm[] }) {
  const [left, setLeft] = useState(startLeft);
  const [right, setRight] = useState(startRight);
  const [note, setNote] = useState<string>(t("scene.balance.hint"));
  const unknowns = left.filter((x) => x.kind === "unknown");
  const label = unknowns[0]?.kind === "unknown" ? unknowns[0].label : "?";
  const rightSum = right.reduce((s, x) => s + (x.kind === "weight" ? x.value : 0), 0);
  const onlyUnknowns = left.every((x) => x.kind === "unknown");
  const splitDone = onlyUnknowns && right.length === unknowns.length && unknowns.length > 1;
  const solved = onlyUnknowns && (unknowns.length === 1 || splitDone);

  function takeAway(index: number) {
    const w = left[index];
    if (w.kind !== "weight") return;
    setLeft(left.filter((_, i) => i !== index));
    setRight([{ kind: "weight", value: rightSum - w.value }]);
    setNote(t("scene.balance.removed", { n: w.value }));
  }
  function split() {
    const each = rightSum / unknowns.length;
    setRight(Array.from({ length: unknowns.length }, () => ({ kind: "weight" as const, value: each })));
    setNote(t("scene.balance.each", { label, n: each }));
  }
  function reset() {
    setLeft(startLeft);
    setRight(startRight);
    setNote(t("scene.balance.hint"));
  }

  const beamY = 58;
  const panY = 190;
  const pan = (cx: number) => (
    <g>
      <line x1={cx} y1={beamY} x2={cx - 72} y2={panY} stroke="#78716c" strokeWidth={1.5} />
      <line x1={cx} y1={beamY} x2={cx + 72} y2={panY} stroke="#78716c" strokeWidth={1.5} />
      <path d={`M${cx - 80} ${panY} Q ${cx} ${panY + 30} ${cx + 80} ${panY} Z`} fill="url(#pan)" stroke="#a16207" strokeWidth={2} />
    </g>
  );
  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <svg viewBox="0 0 440 260" className="w-full max-w-md" role="img" aria-label={`${sideText(left)} = ${sideText(right)}`}>
        <defs>
          <linearGradient id="mystery" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="weight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#94a3b8" />
            <stop offset="1" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="pan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fde68a" />
            <stop offset="1" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#92400e" />
            <stop offset="0.5" stopColor="#b45309" />
            <stop offset="1" stopColor="#92400e" />
          </linearGradient>
        </defs>
        <ellipse cx={220} cy={250} rx={200} ry={10} fill="#86efac" />
        <path d="M180 250 L196 232 H244 L260 250 Z" fill="url(#wood)" />
        <rect x={214} y={beamY} width={12} height={176} rx={4} fill="url(#wood)" />
        <path d={`M220 ${beamY - 14} L232 ${beamY + 4} H208 Z`} fill="#78350f" />
        {pan(95)}
        {pan(345)}
        <rect x={60} y={beamY - 5} width={320} height={10} rx={5} fill="url(#wood)" />
        <circle cx={220} cy={beamY} r={7} fill="#fbbf24" stroke="#78350f" strokeWidth={2} />
        <image href={`${import.meta.env.BASE_URL}kenney/owl.svg`} x={270} y={216} width={34} height={34} />
        {panContents(left, 95, panY - 2, unknowns.length > 0 && !onlyUnknowns ? takeAway : undefined)}
        {panContents(right, 345, panY - 2)}
      </svg>
      <div className={`rounded-xl px-3 py-1 text-xl font-extrabold tabular-nums ${solved ? "bg-emerald-100 text-emerald-800" : "bg-white text-slate-700 border border-slate-200"}`}>
        {splitDone ? `${label} = ${rightSum / unknowns.length}` : `${sideText(left)} = ${sideText(right)}`}
      </div>
      <p className="text-sm text-slate-600 text-center max-w-sm">{note}</p>
      <div className="flex gap-2">
        {onlyUnknowns && unknowns.length > 1 && !splitDone && (
          <button type="button" onClick={split} className={`${tinyButton} bg-violet-100 border-violet-300 text-violet-800`}>
            {t("scene.balance.split", { k: unknowns.length })}
          </button>
        )}
        {(left !== startLeft || right !== startRight) && (
          <button type="button" onClick={reset} className={`${tinyButton} bg-white border-slate-200 text-slate-600`}>
            ↺ {t("scene.reset")}
          </button>
        )}
      </div>
    </div>
  );
}

// --- Groups ---------------------------------------------------------------------

function Holder({ thing, count, lit }: { thing: GroupThing; count: number; lit: boolean }) {
  const th = THINGS[thing];
  const cols = Math.min(count, count > 6 ? 4 : 3);
  const size = count > 6 ? "text-base" : "text-xl";
  return (
    <div className={`${th.holderClass} min-w-[64px] min-h-[64px] p-2 flex items-center justify-center transition ${lit ? "ring-4 ring-amber-300 scale-105" : ""}`}>
      <div className={`grid gap-0.5 ${size} leading-none`} style={{ gridTemplateColumns: `repeat(${Math.max(cols, 1)}, minmax(0, 1fr))` }}>
        {Array.from({ length: count }, (_, i) => (
          <span key={i}>{th.item}</span>
        ))}
      </div>
    </div>
  );
}

/** Groups to count: tap them one after another, and the count goes on under each - 4, 8, 12. */
function Groups({ groups, each, thing }: { groups: number; each: number; thing: GroupThing }) {
  const [counted, setCounted] = useState(0);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap justify-center gap-3 max-w-xl">
        {Array.from({ length: groups }, (_, i) => (
          <button key={i} type="button" onClick={() => setCounted(Math.max(counted, i + 1))} className="flex flex-col items-center gap-1" aria-label={t("scene.groups.count", { n: i + 1 })}>
            <Holder thing={thing} count={each} lit={i < counted} />
            <span className={`min-w-8 rounded-full px-2 text-sm font-extrabold ${i < counted ? "bg-amber-300 text-amber-900" : "text-transparent"}`}>{each * (i + 1)}</span>
          </button>
        ))}
      </div>
      <p className="text-sm text-slate-600 text-center">{counted === 0 ? t("scene.groups.hint", { each }) : counted < groups ? t("scene.groups.going") : t("scene.groups.done", { groups })}</p>
      {counted > 0 && (
        <button type="button" onClick={() => setCounted(0)} className={`${tinyButton} bg-white border-slate-200 text-slate-600`}>
          ↺ {t("scene.reset")}
        </button>
      )}
    </div>
  );
}

// --- Sharing ---------------------------------------------------------------------

/** A pile to share out: one to each in turn (tap the pile), or a whole round at once - until nothing is left. */
function Share({ total, among, thing }: { total: number; among: number; thing: GroupThing }) {
  const th = THINGS[thing];
  const [dealt, setDealt] = useState(0);
  const left = total - dealt;
  const onPlate = (i: number) => Math.floor(dealt / among) + (i < dealt % among ? 1 : 0);
  const next = dealt % among;
  return (
    <div className="flex flex-col items-center gap-3">
      <button type="button" disabled={left === 0} onClick={() => setDealt(dealt + 1)} className="rounded-3xl bg-white/80 border-2 border-amber-200 px-4 py-2 shadow-inner max-w-md min-h-[48px] enabled:hover:border-amber-400 enabled:cursor-pointer" aria-label={t("scene.share.giveOne")}>
        <div className="flex flex-wrap justify-center gap-0.5 text-lg leading-none">
          {left === 0 ? <span className="text-sm text-slate-400">{t("scene.share.empty")}</span> : Array.from({ length: left }, (_, i) => <span key={i}>{th.item}</span>)}
        </div>
      </button>
      <div className="flex flex-wrap justify-center gap-3">
        {Array.from({ length: among }, (_, i) => (
          <div key={i} className={`flex flex-col items-center ${left > 0 && i === next ? "anim-bob" : ""}`}>
            <Sprite name={ANIMALS[i % ANIMALS.length]} size={48} />
            <div className="min-w-14 min-h-7 rounded-full bg-white border-4 border-slate-200 shadow-inner -mt-1 px-1 flex flex-wrap justify-center items-center text-xs leading-none">
              {Array.from({ length: onPlate(i) }, (_, k) => (
                <span key={k}>{th.item}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-600 text-center max-w-sm">{left === 0 ? t("scene.share.done") : dealt === 0 ? t("scene.share.hint") : t("scene.share.going", { left })}</p>
      <div className="flex gap-2">
        {left >= among && (
          <button type="button" onClick={() => setDealt(dealt + among)} className={`${tinyButton} bg-amber-100 border-amber-300 text-amber-900`}>
            {t("scene.share.round")}
          </button>
        )}
        {dealt > 0 && (
          <button type="button" onClick={() => setDealt(0)} className={`${tinyButton} bg-white border-slate-200 text-slate-600`}>
            ↺ {t("scene.reset")}
          </button>
        )}
      </div>
    </div>
  );
}

// --- Rounding ------------------------------------------------------------------------

/** A number on a number line between its two tens (or hundreds): which is it nearest? Tap one. */
function RoundLine({ value, step }: { value: number; step: number }) {
  const lo = Math.floor(value / step) * step;
  const hi = lo + step;
  const nearest = value - lo < hi - value ? lo : hi;
  const [picked, setPicked] = useState<number | null>(null);
  const X = (n: number) => 30 + ((n - lo) / step) * 340;
  const tick = step / 10;
  return (
    <div className="flex flex-col items-center gap-1 w-full max-w-md">
      <svg viewBox="0 0 400 90" className="w-full" role="img" aria-label={`${lo} – ${value} – ${hi}`}>
        <line x1={30} y1={50} x2={370} y2={50} stroke="#334155" strokeWidth={3} strokeLinecap="round" />
        {Array.from({ length: 11 }, (_, i) => (
          <line key={i} x1={X(lo + i * tick)} y1={i % 5 === 0 ? 40 : 44} x2={X(lo + i * tick)} y2={i % 5 === 0 ? 60 : 56} stroke="#334155" strokeWidth={i % 5 === 0 ? 2.5 : 1.5} />
        ))}
        {/* The number, a little flag above the line. */}
        <g transform={`translate(${X(value)} 0)`}>
          <path d="M0 48 L0 22" stroke="#e11d48" strokeWidth={3} />
          <rect x={-22} y={4} width={44} height={20} rx={6} fill="#e11d48" />
          <text y={14} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={800} fill="#fff">
            {value}
          </text>
        </g>
        {picked !== null && <path d={`M${X(value)} 66 Q ${(X(value) + X(nearest)) / 2} 86 ${X(nearest)} 66`} fill="none" stroke="#16a34a" strokeWidth={2.5} strokeDasharray="5 4" />}
      </svg>
      <div className="flex w-full justify-between px-2">
        {[lo, hi].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setPicked(n)}
            className={`${tinyButton} ${picked === n ? (n === nearest ? "bg-emerald-100 border-emerald-400 text-emerald-800" : "bg-rose-100 border-rose-300 text-rose-700") : "bg-white border-slate-200 text-slate-700"}`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="text-sm text-slate-600 text-center">
        {picked === null ? t("scene.round.ask", { n: value }) : picked === nearest ? t("scene.round.right", { n: value, r: nearest }) : t("scene.round.wrong")}
      </p>
    </div>
  );
}

/** The picture of a question: a balance, groups of things, things to share, numbers to round, units on the staircase. */
export function QuestionScene({ scene }: { scene: Scene }) {
  return (
    <div className="w-full max-w-xl rounded-3xl bg-gradient-to-b from-sky-50 to-white border-2 border-sky-100 shadow-sm p-3 flex flex-col items-center gap-3">
      {scene.kind === "balance" ? (
        <Balance left={scene.left} right={scene.right} />
      ) : scene.kind === "groups" ? (
        <Groups groups={scene.groups} each={scene.each} thing={scene.thing} />
      ) : scene.kind === "share" ? (
        <Share total={scene.total} among={scene.among} thing={scene.thing} />
      ) : scene.kind === "rounding" ? (
        scene.numbers.map((n) => <RoundLine key={`${n.value}-${n.step}`} value={n.value} step={n.step} />)
      ) : (
        <UnitStairs family={scene.family} from={scene.from} to={scene.to} value={scene.value} />
      )}
    </div>
  );
}
