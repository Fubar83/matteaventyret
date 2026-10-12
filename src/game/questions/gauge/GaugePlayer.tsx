import { useId, useState } from "react";
import { playEffect } from "../../../audio/sound";
import type { ChoiceText } from "../../../engine/questions/choice/problem";
import { gaugeText, gaugeWhy, type GaugeProblem } from "../../../engine/questions/gauge";
import { t } from "../../../i18n";
import { useDragPoint } from "../dragDrop";
import { HelpLadder } from "../HelpLadder";
import { NextSheet } from "../NextSheet";
import { triedOutcome, type QuestionOutcome } from "../questionOutcome";

const say = (x: ChoiceText) => t(x.key, x.vars);
const WRONG_ALLOWED = 2;
const INK = "#334155";
const W = 220;
const H = 340;
/** The scale runs from TOP (max) to BOTTOM (min). */
const TOP = 30;
const BOTTOM = 280;
/** The jug, its floor at 0. */
const JUG = `M56 ${TOP - 12} L164 ${TOP - 12} L157 ${BOTTOM - 10} Q156 ${BOTTOM} 146 ${BOTTOM} L74 ${BOTTOM} Q64 ${BOTTOM} 63 ${BOTTOM - 10} Z`;

/** A scale's number: 1,5 l on a litre jug, "1 l" at the top of the decilitre one, −5 on the thermometer. */
const labelText = (p: GaugeProblem, v: number) => (p.labels === "deg" ? (v < 0 ? `−${-v}` : String(v)) : p.labels === "dl" && v === 10 ? "1 l" : gaugeText(p.labels, v));

/**
 * Setting an instrument by hand: drag the water in the jug, or the
 * thermometer's red line, up and down - ▲ ▼ for the last tick. The number
 * isn't shown; reading the scale is the task. For a change ("7 grader
 * kallare") a mark stays where it started, to count from.
 */
export function GaugePlayer({ problem, onSolved }: { problem: GaugeProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const { min, max } = problem;
  const [value, setValue] = useState(problem.start);
  const [wrong, setWrong] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [state, setState] = useState<"working" | "solved" | "shown">("working");
  const [message, setMessage] = useState<string | null>(null);
  const working = state === "working";
  // An id fit for url(#…): useId's own has characters that a url() reference can trip on.
  const clip = `gauge${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const Y = (v: number) => BOTTOM - ((v - min) / (max - min)) * (BOTTOM - TOP);
  const set = (v: number) => {
    const next = Math.max(min, Math.min(max, v));
    if (next !== value) setMessage(null);
    setValue(next);
  };
  const drag = useDragPoint(W, H, (_, y) => set(Math.round(min + ((BOTTOM - y) / (BOTTOM - TOP)) * (max - min))), working);

  function check() {
    if (value === problem.target) {
      playEffect("correct");
      setState("solved");
      setMessage(null);
      onSolved(triedOutcome({ wrong, helpUsed }));
      return;
    }
    playEffect("wrong");
    const next = wrong + 1;
    setWrong(next);
    const why = say(gaugeWhy(problem, value));
    if (next >= WRONG_ALLOWED) {
      setValue(problem.target);
      setState("shown");
      setMessage(`${why} ${say(problem.explanation)}`);
      return;
    }
    setMessage(why);
  }

  const ticks = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const move = { transition: "transform 0.18s ease-out" };
  const right = state !== "working" ? "#059669" : undefined;
  const startMark = problem.change !== null && (
    <g aria-hidden>
      <path d={`M${problem.instrument === "jug" ? 52 : 90} ${Y(problem.start)} l-10 -6 v12 Z`} fill="#94a3b8" />
      <text x={problem.instrument === "jug" ? 38 : 76} y={Y(problem.start)} textAnchor="end" dominantBaseline="central" fontSize={12} fontWeight={700} fill="#64748b">
        {t(problem.instrument === "jug" ? "gauge.before" : "gauge.now")}
      </text>
    </g>
  );

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      <div className="flex items-center gap-3">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} className={`max-w-full select-none ${working ? "cursor-ns-resize" : ""}`} role="img" aria-label={t(problem.instrument === "jug" ? "gauge.jugLabel" : "gauge.thermometerLabel")} {...drag}>
          <defs>
            <clipPath id={clip}>
              {problem.instrument === "jug" ? <path d={JUG} /> : <rect x={98} y={TOP - 14} width={24} height={BOTTOM - TOP + 50} rx={12} />}
            </clipPath>
          </defs>
          {problem.instrument === "jug" ? (
            <>
              <path d={`M164 ${TOP + 20} Q206 ${TOP + 34} 198 ${TOP + 100} Q192 ${TOP + 150} 158 ${TOP + 160}`} fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
              <path d={JUG} fill="#f8fafc" />
              <g clipPath={`url(#${clip})`}>
                <g style={{ ...move, transform: `translateY(${Y(value)}px)` }}>
                  <rect x={40} y={0} width={140} height={H} fill={right ?? "#38bdf8"} opacity={0.75} />
                  <ellipse cx={110} cy={0} rx={60} ry={4} fill="#e0f2fe" opacity={value === min ? 0 : 0.9} />
                </g>
              </g>
              <path d={JUG} fill="none" stroke={INK} strokeWidth={2.5} />
              {ticks.slice(1).map((v) => {
                const big = v % problem.labelEvery === 0;
                return (
                  <g key={v}>
                    <line x1={66} y1={Y(v)} x2={big ? 92 : 80} y2={Y(v)} stroke={INK} strokeWidth={big ? 2 : 1.2} />
                    {big && (
                      <text x={96} y={Y(v)} dominantBaseline="central" fontSize={13} fontWeight={800} fill={INK}>
                        {labelText(problem, v)}
                      </text>
                    )}
                  </g>
                );
              })}
            </>
          ) : (
            <>
              <rect x={95} y={TOP - 17} width={30} height={BOTTOM - TOP + 30} rx={15} fill="#f8fafc" stroke={INK} strokeWidth={2.5} />
              <circle cx={110} cy={BOTTOM + 26} r={20} fill={right ?? "#ef4444"} stroke={INK} strokeWidth={2.5} />
              <g clipPath={`url(#${clip})`}>
                <g style={{ ...move, transform: `translateY(${Y(value)}px)` }}>
                  <rect x={103} y={0} width={14} height={H} fill={right ?? "#ef4444"} />
                </g>
              </g>
              {ticks.map((v) => {
                const big = v % problem.labelEvery === 0;
                return (
                  <g key={v}>
                    <line x1={125} y1={Y(v)} x2={big ? 140 : 132} y2={Y(v)} stroke={v === 0 ? "#0369a1" : INK} strokeWidth={v === 0 ? 2.5 : big ? 1.8 : 1} />
                    {big && (
                      <text x={145} y={Y(v)} dominantBaseline="central" fontSize={13} fontWeight={v === 0 ? 800 : 600} fill={v === 0 ? "#0369a1" : INK}>
                        {labelText(problem, v)}
                      </text>
                    )}
                  </g>
                );
              })}
              <text x={78} y={TOP - 4} textAnchor="end" fontSize={14} fontWeight={700} fill={INK}>
                °C
              </text>
            </>
          )}
          {startMark}
        </svg>
        {working && (
          <div className="flex flex-col gap-3">
            <button type="button" className="h-12 w-12 rounded-full border-2 border-slate-300 bg-white text-xl font-bold shadow-sm disabled:opacity-30" onClick={() => set(value + 1)} disabled={value >= max} data-nudge="up" aria-label={t("gauge.up")}>
              ▲
            </button>
            <button type="button" className="h-12 w-12 rounded-full border-2 border-slate-300 bg-white text-xl font-bold shadow-sm disabled:opacity-30" onClick={() => set(value - 1)} disabled={value <= min} data-nudge="down" aria-label={t("gauge.down")}>
              ▼
            </button>
          </div>
        )}
      </div>
      {working && <p className="text-xs text-slate-500">{t(problem.instrument === "jug" ? "gauge.hintJug" : "gauge.hintThermometer")}</p>}
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
