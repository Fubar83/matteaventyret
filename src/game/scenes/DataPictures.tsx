import { useId } from "react";
import type { CodeLine, GraphAxis } from "../../engine/questions/scene";
import { t } from "../../i18n";

/**
 * Tables, charts and programs to read: tally marks, a pie chart, a bus
 * timetable, a coordinate system with lines, and a program in words.
 */

const INK = "#334155";
const GRID = "#e2e8f0";
const SECTORS = ["#38bdf8", "#f472b6", "#facc15", "#34d399", "#a78bfa"];
const swedish = (n: number) => (n < 0 ? `−${-n}` : String(n)).replace(".", ",");

/** Tally marks: bundles of five (four lines and one across), then the ones left over. */
function Tally({ n }: { n: number }) {
  const bundles = Math.floor(n / 5);
  const rest = n % 5;
  const w = bundles * 34 + rest * 8 + 4;
  return (
    <svg viewBox={`0 0 ${Math.max(w, 10)} 30`} height={30} width={Math.max(w, 10)} aria-hidden>
      {Array.from({ length: bundles }, (_, b) => (
        <g key={b} transform={`translate(${b * 34 + 2} 0)`}>
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={i * 7} y1={3} x2={i * 7} y2={27} stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
          ))}
          <line x1={-3} y1={22} x2={24} y2={8} stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        </g>
      ))}
      {Array.from({ length: rest }, (_, i) => (
        <line key={i} x1={bundles * 34 + 2 + i * 8} y1={3} x2={bundles * 34 + 2 + i * 8} y2={27} stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
      ))}
    </svg>
  );
}

/** A table of tally marks, a row per thing. */
export function TallyTable({ rows }: { rows: { label: string; count: number }[] }) {
  return (
    <table className="bg-white rounded-xl border-2 border-slate-200 text-lg" aria-label={t("scene.tally.label")}>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-b last:border-b-0 border-slate-200">
            <th className="px-3 py-1 text-left font-bold text-slate-700 first-letter:uppercase">{t(r.label)}</th>
            <td className="px-3 py-1 min-w-32">
              <Tally n={r.count} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A pie chart, faint lines where each part of the whole is, and its legend. */
export function PieChart({ sectors, total }: { sectors: { label: string; parts: number }[]; total: number }) {
  const R = 80;
  const at = (p: number) => {
    const a = (p / total) * 2 * Math.PI - Math.PI / 2;
    return [90 + R * Math.cos(a), 90 + R * Math.sin(a)] as const;
  };
  let from = 0;
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <svg viewBox="0 0 180 180" width={180} role="img" aria-label={t("scene.pie.label")}>
        {sectors.map((s, i) => {
          const [x0, y0] = at(from);
          const [x1, y1] = at(from + s.parts);
          const d = s.parts === total ? `M${90 - R} 90 A${R} ${R} 0 1 1 ${90 + R} 90 A${R} ${R} 0 1 1 ${90 - R} 90 Z` : `M90 90 L${x0} ${y0} A${R} ${R} 0 ${s.parts / total > 0.5 ? 1 : 0} 1 ${x1} ${y1} Z`;
          from += s.parts;
          return <path key={i} d={d} fill={SECTORS[i % SECTORS.length]} stroke="#fff" strokeWidth={3} />;
        })}
        {/* The parts, to count: a faint line at each. */}
        {Array.from({ length: total }, (_, p) => {
          const [x, y] = at(p);
          return <line key={p} x1={90} y1={90} x2={x} y2={y} stroke="#ffffff" strokeOpacity={0.7} strokeWidth={1} />;
        })}
        <circle cx={90} cy={90} r={R} fill="none" stroke={INK} strokeWidth={2} />
      </svg>
      <ul className="flex flex-col gap-1 text-base font-semibold text-slate-700">
        {sectors.map((s, i) => (
          <li key={i} className="flex items-center gap-2 first-letter:uppercase">
            <span className="inline-block w-4 h-4 rounded" style={{ background: SECTORS[i % SECTORS.length] }} />
            <span className="first-letter:uppercase">{t(s.label)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A bus timetable: a row per stop, a column per departure. */
export function Timetable({ stops, times }: { stops: string[]; times: string[][] }) {
  return (
    <table className="bg-white rounded-xl border-2 border-slate-200 text-base tabular-nums" aria-label={t("scene.timetable.label")}>
      <thead>
        <tr className="bg-amber-100 text-slate-700">
          <th className="px-3 py-1 text-left">{t("scene.timetable.stop")}</th>
          <th className="px-3 py-1" colSpan={times[0].length}>
            🚌 {t("scene.timetable.departures")}
          </th>
        </tr>
      </thead>
      <tbody>
        {stops.map((stop, i) => (
          <tr key={stop} className="border-t border-slate-200">
            <th className="px-3 py-1 text-left font-bold text-slate-700">{stop}</th>
            {times[i].map((time, j) => (
              <td key={j} className="px-3 py-1 text-center font-semibold">
                {time}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A coordinate system: a grid line every step, the axes through 0 (or along the edge), and the lines. */
export function Graph({ x, y, lines, small = false }: { x: GraphAxis; y: GraphAxis; lines: { points: [number, number][] }[]; small?: boolean }) {
  const clip = useId();
  const size = small ? 110 : 260;
  const pad = small ? 6 : 36;
  const X = (v: number) => pad + ((v - x.min) / (x.max - x.min)) * size;
  const Y = (v: number) => pad + size - ((v - y.min) / (y.max - y.min)) * size;
  const ticks = (a: GraphAxis) => Array.from({ length: Math.round((a.max - a.min) / a.step) + 1 }, (_, i) => a.min + i * a.step);
  const x0 = X(Math.min(Math.max(0, x.min), x.max));
  const y0 = Y(Math.min(Math.max(0, y.min), y.max));
  return (
    <svg viewBox={`0 0 ${size + 2 * pad + (small ? 0 : 20)} ${size + 2 * pad}`} width={small ? size + 2 * pad : undefined} className={small ? undefined : "w-full max-w-sm"} role="img" aria-label={t("scene.graph.label")}>
      <defs>
        <clipPath id={clip}>
          <rect x={pad} y={pad} width={size} height={size} />
        </clipPath>
      </defs>
      <rect x={pad} y={pad} width={size} height={size} fill="#fff" />
      {ticks(x).map((v) => (
        <line key={`x${v}`} x1={X(v)} y1={pad} x2={X(v)} y2={pad + size} stroke={GRID} strokeWidth={1} />
      ))}
      {ticks(y).map((v) => (
        <line key={`y${v}`} x1={pad} y1={Y(v)} x2={pad + size} y2={Y(v)} stroke={GRID} strokeWidth={1} />
      ))}
      <line x1={pad} y1={y0} x2={pad + size} y2={y0} stroke={INK} strokeWidth={2} />
      <line x1={x0} y1={pad} x2={x0} y2={pad + size} stroke={INK} strokeWidth={2} />
      {!small && (
        <g fontSize={11} fontWeight={600} fill={INK}>
          {ticks(x).map((v) =>
            v === 0 && x.min < 0 ? null : (
              <text key={`lx${v}`} x={X(v)} y={y0 + 14} textAnchor="middle">
                {swedish(v)}
              </text>
            )
          )}
          {ticks(y).map((v) =>
            v === 0 ? null : (
              <text key={`ly${v}`} x={x0 - 5} y={Y(v)} textAnchor="end" dominantBaseline="central">
                {swedish(v)}
              </text>
            )
          )}
          <text x={pad + size + 6} y={y0} dominantBaseline="central" fontSize={13} fontWeight={800}>
            {x.label ? t(x.label) : "x"}
          </text>
          <text x={x0} y={pad - 10} textAnchor="middle" fontSize={13} fontWeight={800}>
            {y.label ? t(y.label) : "y"}
          </text>
        </g>
      )}
      <g clipPath={`url(#${clip})`}>
        {lines.map((l, i) => (
          <polyline key={i} points={l.points.map(([a, b]) => `${X(a)},${Y(b)}`).join(" ")} fill="none" stroke="#e11d48" strokeWidth={small ? 3 : 3.5} strokeLinejoin="round" strokeLinecap="round" />
        ))}
      </g>
    </svg>
  );
}

/** The kinds of line a program has, for its colour: a condition or loop, an output, the rest. */
const CONTROL = new Set(["code.ifEven", "code.ifGreater", "code.else", "code.repeat", "code.for", "code.while"]);
const OUTPUT = new Set(["code.print", "code.printTwo", "code.printText"]);

/** A program in words, numbered, its blocks indented. */
export function CodeBlock({ lines }: { lines: CodeLine[] }) {
  return (
    <ol className="rounded-xl bg-slate-900 text-slate-100 font-mono text-base py-3 pr-5 pl-3 shadow-inner min-w-60" aria-label={t("scene.code.label")}>
      {lines.map((l, i) => (
        <li key={i} className="flex gap-3 leading-7">
          <span className="w-5 text-right text-slate-500 select-none">{i + 1}</span>
          <span style={{ paddingLeft: `${l.indent * 1.5}rem` }} className={CONTROL.has(l.key) ? "text-fuchsia-300 font-bold" : OUTPUT.has(l.key) ? "text-sky-300" : undefined}>
            {t(l.key, l.vars)}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** A bar chart of A, B, C…, the axis from `from` to `to` - starting above 0 makes small differences look big. */
export function BarsPicture({ values, from, to, step, small = false }: { values: number[]; from: number; to: number; step: number; small?: boolean }) {
  const h = small ? 90 : 180;
  const pad = small ? 26 : 36;
  const w = values.length * (small ? 26 : 50) + 20;
  const Y = (v: number) => pad / 2 + h - ((v - from) / (to - from)) * h;
  const ticks = Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) => from + i * step);
  return (
    <svg viewBox={`0 0 ${w + pad} ${h + pad + 4}`} width={small ? w + pad : undefined} className={small ? undefined : "w-full max-w-xs"} role="img" aria-label={t("scene.bars.label", { from })}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pad} y1={Y(v)} x2={pad + w} y2={Y(v)} stroke={GRID} strokeWidth={1} />
          <text x={pad - 4} y={Y(v)} textAnchor="end" dominantBaseline="central" fontSize={small ? 9 : 11} fontWeight={600} fill={INK}>
            {swedish(v)}
          </text>
        </g>
      ))}
      {values.map((v, i) => {
        const bw = small ? 16 : 32;
        const x = pad + 10 + i * (small ? 26 : 50);
        return (
          <g key={i}>
            <rect x={x} y={Y(v)} width={bw} height={Y(from) - Y(v)} fill={SECTORS[i % SECTORS.length]} stroke={INK} strokeWidth={1} />
            <text x={x + bw / 2} y={Y(from) + (small ? 10 : 14)} textAnchor="middle" fontSize={small ? 9 : 12} fontWeight={800} fill={INK}>
              {"ABCDE"[i]}
            </text>
          </g>
        );
      })}
      <line x1={pad} y1={Y(from)} x2={pad + w} y2={Y(from)} stroke={INK} strokeWidth={2} />
      <line x1={pad} y1={Y(to)} x2={pad} y2={Y(from)} stroke={INK} strokeWidth={2} />
    </svg>
  );
}

/** A month's budget: what comes in, what goes out - each row in kronor, the sums left to the reader. */
export function Budget({ income, costs }: { income: { label: string; kr: number }[]; costs: { label: string; kr: number }[] }) {
  // 18 000 kr: a space in the thousands that never breaks the line.
  const kr = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0")} kr`;
  const row = (r: { label: string; kr: number }, sign: string, color: string) => (
    <tr key={r.label} className="border-b last:border-b-0 border-slate-200">
      <th className="px-3 py-1 text-left font-semibold text-slate-700">{t(r.label)}</th>
      <td className={`px-3 py-1 text-right font-bold tabular-nums ${color}`}>
        {sign} {kr(r.kr)}
      </td>
    </tr>
  );
  return (
    <table className="bg-white rounded-xl border-2 border-slate-200 text-base min-w-64" aria-label={t("scene.budget.label")}>
      <tbody>
        <tr className="bg-emerald-50 border-b border-slate-200">
          <th colSpan={2} className="px-3 py-1 text-left text-sm text-emerald-800">{t("scene.budget.in")}</th>
        </tr>
        {income.map((r) => row(r, "+", "text-emerald-700"))}
        <tr className="bg-rose-50 border-b border-slate-200">
          <th colSpan={2} className="px-3 py-1 text-left text-sm text-rose-800">{t("scene.budget.out")}</th>
        </tr>
        {costs.map((r) => row(r, "−", "text-rose-700"))}
      </tbody>
    </table>
  );
}
