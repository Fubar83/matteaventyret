import { useRef, useState, type PointerEvent } from "react";
import { playEffect } from "../../../audio/sound";
import type { ChoiceText } from "../../../engine/questions/choice/problem";
import { rightOnes, type DrawChartProblem } from "../../../engine/questions/drawChart";
import { t } from "../../../i18n";
import { TallyTable } from "../../scenes/DataPictures";
import { HelpLadder } from "../HelpLadder";
import { NextSheet } from "../NextSheet";
import { triedOutcome, type QuestionOutcome } from "../questionOutcome";

const say = (x: ChoiceText) => t(x.key, x.vars);
const WRONG_ALLOWED = 2;
const INK = "#334155";
const W = 420;
const H = 300;
const LEFT = 48;
const RIGHT = 405;
const TOP = 30;
const BOTTOM = 252;
const BAR_COLORS = ["#f87171", "#facc15", "#4ade80", "#fb923c"];
const minus = (v: number) => (v < 0 ? `−${-v}` : String(v));
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Drawing a chart by hand: drag a bar (or a point of a line) up and down -
 * it snaps to the scale's lines - or nudge it with ▲ ▼. The numbers are in
 * the tally or the table above; the chart doesn't write them, so the scale
 * has to be read. Rätta: the right ones turn green and stay, the wrong ones
 * are marked.
 */
export function DrawChartPlayer({ problem, onSolved }: { problem: DrawChartProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const { min, max, step, labelKeys } = problem;
  const n = labelKeys.length;
  const [values, setValues] = useState<number[]>(() => labelKeys.map(() => problem.start));
  const [locked, setLocked] = useState<boolean[]>(() => labelKeys.map(() => false));
  const [marked, setMarked] = useState<boolean[]>(() => labelKeys.map(() => false));
  const [wrong, setWrong] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [state, setState] = useState<"working" | "solved" | "shown">("working");
  const [message, setMessage] = useState<string | null>(null);
  const working = state === "working";
  const dragging = useRef<number | null>(null);

  const Y = (v: number) => BOTTOM - ((v - min) / (max - min)) * (BOTTOM - TOP);
  const colWidth = (RIGHT - LEFT) / n;
  const X = (i: number) => LEFT + colWidth * (i + 0.5);
  const zeroY = Y(Math.max(min, 0));

  function set(i: number, v: number) {
    if (!working || locked[i]) return;
    const snapped = Math.max(min, Math.min(max, Math.round(v / step) * step));
    setValues((vs) => (vs[i] === snapped ? vs : vs.map((x, j) => (j === i ? snapped : x))));
    setMarked((m) => (m[i] ? m.map((x, j) => (j === i ? false : x)) : m));
    setMessage(null);
  }
  /** The picture's point under the finger, in the drawing's own units. */
  const at = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - box.left) / box.width) * W, ((e.clientY - box.top) / box.height) * H];
  };
  const valueAt = (y: number) => min + ((BOTTOM - y) / (BOTTOM - TOP)) * (max - min);
  const pointer = {
    onPointerDown: (e: PointerEvent<SVGSVGElement>) => {
      if (!working) return;
      const [x, y] = at(e);
      const i = Math.floor((x - LEFT) / colWidth);
      if (i < 0 || i >= n) return;
      dragging.current = i;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      set(i, valueAt(y));
    },
    onPointerMove: (e: PointerEvent<SVGSVGElement>) => {
      if (dragging.current !== null) set(dragging.current, valueAt(at(e)[1]));
    },
    onPointerUp: () => {
      dragging.current = null;
    },
    onPointerCancel: () => {
      dragging.current = null;
    },
    style: { touchAction: "none" as const },
  };

  function check() {
    const right = rightOnes(problem, values);
    if (right.every(Boolean)) {
      playEffect("correct");
      setState("solved");
      setLocked(right);
      setMessage(null);
      onSolved(triedOutcome({ wrong, helpUsed }));
      return;
    }
    playEffect("wrong");
    const next = wrong + 1;
    setWrong(next);
    // The right ones stay put; the wrong ones are marked, the first one named.
    setLocked(right);
    setMarked(right.map((r) => !r));
    const first = right.indexOf(false);
    const high = values[first] > problem.values[first];
    const why = t(`drawChart.why.${problem.style === "line" ? "point" : "bar"}${high ? "High" : "Low"}`, { x: t(labelKeys[first]).toLowerCase() });
    const count = right.filter((r) => !r).length;
    const text = count > 1 ? `${why} ${t("drawChart.why.more", { n: count - 1 })}` : why;
    if (next >= WRONG_ALLOWED) {
      setValues(problem.values);
      setState("shown");
      setMessage(`${text} ${say(problem.explanation)}`);
      return;
    }
    setMessage(text);
  }

  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + i * step);
  const colorOf = (i: number) => (state !== "working" || locked[i] ? "#059669" : marked[i] ? "#e11d48" : problem.style === "line" ? "#0284c7" : BAR_COLORS[i % BAR_COLORS.length]);
  const move = { transition: "all 0.15s ease-out" };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      {problem.source === "tally" ? (
        <TallyTable rows={labelKeys.map((k, i) => ({ label: k, count: problem.values[i] }))} />
      ) : (
        <table className="bg-white rounded-xl border-2 border-slate-200 text-base" aria-label={t("drawChart.table")}>
          <tbody>
            <tr className="border-b border-slate-200">
              <th className="px-3 py-1 text-left text-slate-500 font-semibold">{t(problem.style === "line" ? "drawChart.what.time" : "drawChart.what.sport")}</th>
              {labelKeys.map((k) => (
                <th key={k} className="px-3 py-1 font-bold text-slate-700 first-letter:uppercase">
                  {t(k)}
                </th>
              ))}
            </tr>
            <tr>
              <th className="px-3 py-1 text-left text-slate-500 font-semibold">{t(problem.what)}</th>
              {problem.values.map((v, i) => (
                <td key={i} className="px-3 py-1 text-center font-bold tabular-nums">
                  {minus(v)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className={`w-full max-w-lg select-none ${working ? "cursor-ns-resize" : ""}`} role="img" aria-label={t("drawChart.label")} {...pointer}>
        <rect x={LEFT} y={TOP} width={RIGHT - LEFT} height={BOTTOM - TOP} fill="#ffffff" />
        {ticks.map((v) => {
          const big = v % problem.labelEvery === 0;
          return (
            <g key={v}>
              <line x1={LEFT} y1={Y(v)} x2={RIGHT} y2={Y(v)} stroke={v === 0 ? INK : big ? "#94a3b8" : "#e2e8f0"} strokeWidth={v === 0 ? 2 : big ? 1.3 : 1} />
              {big && (
                <text x={LEFT - 8} y={Y(v)} textAnchor="end" dominantBaseline="central" fontSize={13} fontWeight={700} fill={INK}>
                  {minus(v)}
                </text>
              )}
            </g>
          );
        })}
        <line x1={LEFT} y1={TOP} x2={LEFT} y2={BOTTOM} stroke={INK} strokeWidth={2} />
        {problem.style === "bar" ? (
          values.map((v, i) => (
            <g key={i}>
              {/* An empty bar shows where it can grow - red when it was wrong, even at 0. */}
              <rect x={X(i) - 22} y={TOP} width={44} height={zeroY - TOP} fill={marked[i] ? "#ffe4e6" : "#f1f5f9"} opacity={working && !locked[i] ? 0.8 : 0} />
              <rect x={X(i) - 22} y={Y(v)} width={44} height={Math.max(0, zeroY - Y(v))} fill={colorOf(i)} stroke={INK} strokeWidth={1.5} style={move} />
              {working && !locked[i] && <rect x={X(i) - 22} y={Y(v) - 4} width={44} height={8} rx={4} fill={INK} opacity={0.55} style={move} />}
            </g>
          ))
        ) : (
          <g>
            <polyline points={values.map((v, i) => `${X(i)},${Y(v)}`).join(" ")} fill="none" stroke={state === "working" ? "#0284c7" : "#059669"} strokeWidth={3} style={move} />
            {values.map((v, i) => (
              <circle key={i} cx={X(i)} cy={Y(v)} r={working && !locked[i] ? 9 : 7} fill={colorOf(i)} stroke="#ffffff" strokeWidth={2.5} style={move} />
            ))}
          </g>
        )}
        {labelKeys.map((k, i) => (
          <text key={k} x={X(i)} y={BOTTOM + 20} textAnchor="middle" fontSize={13} fontWeight={700} fill={INK}>
            {capital(t(k))}
          </text>
        ))}
        {problem.style === "line" && (
          <text x={LEFT - 8} y={TOP - 16} textAnchor="end" fontSize={12} fontWeight={700} fill={INK}>
            °C
          </text>
        )}
      </svg>
      {working && (
        <div className="grid w-full max-w-lg" style={{ gridTemplateColumns: `${(LEFT / W) * 100}% repeat(${n}, 1fr) ${((W - RIGHT) / W) * 100}%` }}>
          <span />
          {labelKeys.map((k, i) => (
            <div key={k} className="flex justify-center gap-1">
              <button type="button" className="h-9 w-9 rounded-full border-2 border-slate-300 bg-white text-sm font-bold disabled:opacity-30" onClick={() => set(i, values[i] - step)} disabled={locked[i] || values[i] <= min} data-col={i} data-dir="down" aria-label={t("drawChart.down", { x: t(k) })}>
                ▼
              </button>
              <button type="button" className="h-9 w-9 rounded-full border-2 border-slate-300 bg-white text-sm font-bold disabled:opacity-30" onClick={() => set(i, values[i] + step)} disabled={locked[i] || values[i] >= max} data-col={i} data-dir="up" aria-label={t("drawChart.up", { x: t(k) })}>
                ▲
              </button>
            </div>
          ))}
          <span />
        </div>
      )}
      {working && <p className="text-xs text-slate-500">{t(problem.style === "line" ? "drawChart.hintLine" : "drawChart.hintBar")}</p>}
      {working && (
        <button type="button" onClick={check} className="h-12 px-8 rounded-full bg-sky-500 text-white text-lg font-bold shadow">
          {t("sort.check")}
        </button>
      )}
      {message && working && (
        <p role="status" className="text-sm text-center max-w-sm text-rose-700 font-semibold">
          {message}
        </p>
      )}
      {state === "solved" && <p className="text-sm text-center max-w-sm text-emerald-700 font-semibold">{say(problem.explanation)}</p>}
      {working && (
        <HelpLadder
          used={helpUsed}
          onUse={setHelpUsed}
          steps={[
            { title: t("help.tip"), content: say(problem.tip) },
            { title: t("help.solution"), content: say(problem.explanation) },
          ]}
        />
      )}
      {state === "shown" && <NextSheet note={message} onNext={() => onSolved(triedOutcome({ wrong, helpUsed, shown: true }))} />}
    </div>
  );
}
