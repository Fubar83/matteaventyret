import { useState } from "react";
import { playEffect } from "../../../audio/sound";
import type { ChoiceText } from "../../../engine/questions/choice/problem";
import { placed, type NumberLineProblem } from "../../../engine/questions/numberLine";
import { t } from "../../../i18n";
import { Tex } from "../../Tex";
import { useDragPoint } from "../dragDrop";
import { HelpLadder } from "../HelpLadder";
import { NextSheet } from "../NextSheet";
import { triedOutcome, type QuestionOutcome } from "../questionOutcome";

const say = (x: ChoiceText) => t(x.key, x.vars);
const INK = "#334155";
/** A tick label: LaTeX's 0{,}5 and -5 as text. */
const labelText = (latex: string) => latex.replace("{,}", ",").replace(/^-/, "−");

/** Wrong checks before the place is shown. */
const WRONG_ALLOWED = 2;

/**
 * A number to place on a number line: tap the line (or nudge the marker with
 * ◀ ▶), then Rätta. A wrong place says which way to go; after the allowed
 * wrong checks the right place is shown. ★★★ is right the first time.
 */
export function NumberLinePlayer({ problem, onSolved }: { problem: NumberLineProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const { from, to, step, snap } = problem;
  const [at, setAt] = useState<number | null>(null);
  const [wrong, setWrong] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [state, setState] = useState<"working" | "solved" | "shown">("working");
  const [message, setMessage] = useState<string | null>(null);
  const working = state === "working";

  const X = (v: number) => 24 + ((v - from) / (to - from)) * 372;
  const places = Math.round((to - from) / snap);
  const placeAt = (i: number) => Math.round((from + i * snap) * 1e9) / 1e9;
  const ticks = Math.round((to - from) / step);
  // The marker follows the finger along the line, from place to place.
  const drag = useDragPoint(420, problem.second ? 126 : 110, (x) => setAt(placeAt(Math.min(places, Math.max(0, Math.round(((x - 24) / 372) * places))))), working);
  const nudge = (d: number) => {
    if (!working) return;
    const i = at === null ? 0 : Math.round((at - from) / snap) + d;
    setAt(placeAt(Math.min(places, Math.max(0, i))));
  };

  function check() {
    if (at === null) return;
    const verdict = placed(problem, at);
    if (verdict === "right") {
      playEffect("correct");
      setState("solved");
      setMessage(null);
      onSolved(triedOutcome({ wrong, helpUsed }));
      return;
    }
    playEffect("wrong");
    const next = wrong + 1;
    setWrong(next);
    if (next >= WRONG_ALLOWED) {
      setAt(problem.value);
      setState("shown");
      setMessage(say(problem.explanation));
      return;
    }
    setMessage(t(verdict === "tooLow" ? "line.tooLow" : "line.tooHigh"));
  }

  const marker = at === null ? null : X(at);
  const color = state === "working" ? "#e11d48" : "#059669";
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      <div className="rounded-2xl bg-white border-2 border-slate-200 px-6 py-3 text-3xl shadow-sm">
        <Tex latex={problem.target} block />
      </div>
      <svg viewBox={`0 0 420 ${problem.second ? 126 : 110}`} className="w-full max-w-xl touch-none select-none" {...drag} role="img" aria-label={t("line.label", { from: labelText(problem.labels[0].latex), to: labelText(problem.labels.at(-1)!.latex) })}>
        <line x1={14} y1={62} x2={406} y2={62} stroke={INK} strokeWidth={3} strokeLinecap="round" />
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = from + i * step;
          const big = problem.labels.some((l) => Math.abs(l.at - v) < 1e-9);
          return <line key={i} x1={X(v)} y1={big ? 50 : 55} x2={X(v)} y2={big ? 74 : 69} stroke={INK} strokeWidth={big ? 2.5 : 1.5} />;
        })}
        {problem.labels.map((l) => (
          <text key={l.at} x={X(l.at)} y={94} textAnchor="middle" fontSize={15} fontWeight={700} fill={INK}>
            {labelText(l.latex)}
          </text>
        ))}
        {/* A double number line's other scale, under the first. */}
        {problem.second?.map((l) => (
          <text key={`s${l.at}`} x={X(l.at)} y={116} textAnchor="middle" fontSize={14} fontWeight={700} fill="#be123c">
            {labelText(l.latex)}
          </text>
        ))}
        {marker !== null && (
          <g transform={`translate(${marker} 0)`}>
            <path d="M0 50 L-9 32 L-3.5 32 L-3.5 12 L3.5 12 L3.5 32 L9 32 Z" fill={color} />
          </g>
        )}
        {/* Where the marker can go: a tap target at each place, unseen. */}
        {working &&
          Array.from({ length: places + 1 }, (_, i) => {
            const v = placeAt(i);
            const w = 372 / places;
            return <rect key={i} data-at={v} x={X(v) - w / 2} y={0} width={w} height={110} fill="transparent" onClick={() => setAt(v)} style={{ cursor: "pointer" }} aria-hidden />;
          })}
      </svg>
      {working && (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => nudge(-1)} aria-label={t("line.left")} className="h-11 w-11 rounded-full bg-white border-2 border-slate-300 text-lg font-bold">
            ◀
          </button>
          <button type="button" onClick={check} disabled={at === null} className="h-12 px-8 rounded-full bg-sky-500 text-white text-lg font-bold shadow disabled:opacity-40">
            {t("sort.check")}
          </button>
          <button type="button" onClick={() => nudge(1)} aria-label={t("line.right")} className="h-11 w-11 rounded-full bg-white border-2 border-slate-300 text-lg font-bold">
            ▶
          </button>
        </div>
      )}
      {message && working && (
        <p role="status" className="text-sm text-center max-w-sm text-slate-700">
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
