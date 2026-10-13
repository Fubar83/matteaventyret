import { useState } from "react";
import { playEffect } from "../../../audio/sound";
import type { ChoiceText } from "../../../engine/questions/choice/problem";
import { cosOf, norm, radians, sinOf, SNAP, unitCircleWhy, type UnitCircleProblem } from "../../../engine/questions/unitCircle";
import { t } from "../../../i18n";
import { Tex } from "../../Tex";
import { useDragPoint } from "../dragDrop";
import { HelpLadder } from "../HelpLadder";
import { NextSheet } from "../NextSheet";
import { triedOutcome, type QuestionOutcome } from "../questionOutcome";

const say = (x: ChoiceText) => t(x.key, x.vars);
const WRONG_ALLOWED = 2;
const SIZE = 380;
const C = SIZE / 2;
const R = 140;
const INK = "#334155";
const SIN = "#2563eb";
const COS = "#e11d48";
/** The exact values marked on both axes. */
const MARKS: [number, string][] = [
  [0.5, "½"],
  [Math.SQRT2 / 2, "√2/2"],
  [Math.sqrt(3) / 2, "√3/2"],
];

/**
 * The unit circle by hand: drag the point round (it snaps every 15°), or turn
 * it with ⟲ ⟳. Its x is cos v (red, along the x-axis), its y sin v (blue, up
 * the y-axis); the exact values are marked on the axes, so they're read, not
 * worked out. The angle is written out only where finding it isn't the task.
 */
export function UnitCirclePlayer({ problem, onSolved }: { problem: UnitCircleProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const [at, setAt] = useState(problem.start);
  const [wrong, setWrong] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [state, setState] = useState<"working" | "solved" | "shown">("working");
  const [message, setMessage] = useState<string | null>(null);
  const working = state === "working";
  const set = (deg: number) => {
    const next = norm(Math.round(deg / SNAP) * SNAP);
    if (next !== at) setMessage(null);
    setAt(next);
  };
  const drag = useDragPoint(SIZE, SIZE, (x, y) => set((Math.atan2(C - y, x - C) * 180) / Math.PI), working);

  function check() {
    if (problem.answers.includes(at)) {
      playEffect("correct");
      setState("solved");
      setMessage(null);
      onSolved(triedOutcome({ wrong, helpUsed }));
      return;
    }
    playEffect("wrong");
    const next = wrong + 1;
    setWrong(next);
    const why = say(unitCircleWhy(problem, at));
    if (next >= WRONG_ALLOWED) {
      setAt(problem.answers[0]);
      setState("shown");
      setMessage(`${why} ${say(problem.explanation)}`);
      return;
    }
    setMessage(why);
  }

  const x = cosOf(at);
  const y = sinOf(at);
  const px = C + R * x;
  const py = C - R * y;
  // The angle's arc from the positive x-axis, counter-clockwise.
  const arcR = 32;
  const arc = at === 0 ? "" : `M${C + arcR} ${C} A${arcR} ${arcR} 0 ${at > 180 ? 1 : 0} 0 ${C + arcR * x} ${C - arcR * y}`;
  const right = state !== "working";
  const mark = (deg: number) => (problem.unit === "rad" ? radians(deg, true) : `${deg}°`);

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      <div className="rounded-2xl bg-white border-2 border-slate-200 px-5 py-2 text-2xl shadow-sm">
        <Tex latex={problem.display} block />
      </div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} className={`max-w-full select-none ${working ? "cursor-grab" : ""}`} role="img" aria-label={t("uc.label")} {...drag}>
        {/* A faint line every 15°, and the axes' angles named. */}
        {Array.from({ length: 24 }, (_, i) => {
          const d = i * SNAP;
          const [cx, cy] = [Math.cos((d * Math.PI) / 180), -Math.sin((d * Math.PI) / 180)];
          const big = d % 90 === 0;
          return <line key={d} x1={C + cx * (R - (big ? 0 : 6))} y1={C + cy * (R - (big ? 0 : 6))} x2={C + cx * (R + 6)} y2={C + cy * (R + 6)} stroke={d % 45 === 0 || d % 30 === 0 ? "#64748b" : "#cbd5e1"} strokeWidth={1.5} />;
        })}
        <circle cx={C} cy={C} r={R} fill="#f8fafc" fillOpacity={0.4} stroke={INK} strokeWidth={2} />
        <line x1={14} y1={C} x2={SIZE - 14} y2={C} stroke={INK} strokeWidth={1.5} />
        <line x1={C} y1={14} x2={C} y2={SIZE - 14} stroke={INK} strokeWidth={1.5} />
        <text x={SIZE - 12} y={C - 8} textAnchor="end" fontSize={13} fontStyle="italic" fill={INK}>x</text>
        <text x={C + 8} y={20} fontSize={13} fontStyle="italic" fill={INK}>y</text>
        {[0, 90, 180, 270].map((d) => {
          const [cx, cy] = [Math.cos((d * Math.PI) / 180), -Math.sin((d * Math.PI) / 180)];
          return (
            <text key={d} x={C + cx * (R + 20) + (d === 90 || d === 270 ? 18 : 0)} y={C + cy * (R + 18) + (d === 0 || d === 180 ? -10 : 0)} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700} fill="#64748b">
              {mark(d)}
            </text>
          );
        })}
        {/* The exact values, on both axes and both sides. */}
        {/* On the x-axis the marks are close: their names alternate below and above it. */}
        {MARKS.flatMap(([v, label], k) =>
          [1, -1].flatMap((s) => [
            <g key={`x${v}${s}`}>
              <line x1={C + s * v * R} y1={C - 4} x2={C + s * v * R} y2={C + 4} stroke={INK} strokeWidth={1.5} />
              {s > 0 && (
                <text x={C + v * R} y={k === 1 ? C - 8 : C + 16} textAnchor="middle" fontSize={10} fill="#475569">
                  {label}
                </text>
              )}
            </g>,
            <g key={`y${v}${s}`}>
              <line x1={C - 4} y1={C - s * v * R} x2={C + 4} y2={C - s * v * R} stroke={INK} strokeWidth={1.5} />
              {s > 0 && (
                <text x={C - 7} y={C - v * R} textAnchor="end" dominantBaseline="central" fontSize={10} fill="#475569">
                  {label}
                </text>
              )}
            </g>,
          ])
        )}
        <text x={C + R + 4} y={C + 16} fontSize={10} fill="#475569">1</text>
        <text x={C - 7} y={C - R + 2} textAnchor="end" fontSize={10} fill="#475569">1</text>
        {/* cos v along the x-axis, sin v up from it to the point. */}
        <line x1={C} y1={C} x2={px} y2={C} stroke={COS} strokeWidth={5} strokeLinecap="round" opacity={0.85} />
        <line x1={px} y1={C} x2={px} y2={py} stroke={SIN} strokeWidth={5} strokeLinecap="round" opacity={0.85} />
        <line x1={C} y1={py} x2={px} y2={py} stroke={SIN} strokeWidth={1.5} strokeDasharray="4 4" />
        <line x1={C} y1={C} x2={C} y2={py} stroke={SIN} strokeWidth={5} strokeLinecap="round" opacity={0.35} />
        <path d={arc} fill="none" stroke="#f59e0b" strokeWidth={2.5} />
        <line x1={C} y1={C} x2={px} y2={py} stroke={INK} strokeWidth={2.5} />
        <circle cx={px} cy={py} r={11} fill={right ? "#059669" : "#f59e0b"} stroke="#ffffff" strokeWidth={3} data-point />
      </svg>
      <div className="flex items-center gap-4 text-sm font-semibold">
        <span style={{ color: COS }}>{t("uc.cosIsX")}</span>
        <span style={{ color: SIN }}>{t("uc.sinIsY")}</span>
        {(problem.showAngle || !working) && (
          <span className="text-amber-700 tabular-nums" data-angle>
            v = {problem.unit === "rad" ? radians(at, true) : `${at}°`}
          </span>
        )}
      </div>
      {working && (
        <div className="flex gap-3">
          <button type="button" className="h-11 w-11 rounded-full border-2 border-slate-300 bg-white text-xl font-bold shadow-sm" onClick={() => set(at + SNAP)} data-turn="ccw" aria-label={t("uc.ccw")}>
            ⟲
          </button>
          <button type="button" className="h-11 w-11 rounded-full border-2 border-slate-300 bg-white text-xl font-bold shadow-sm" onClick={() => set(at - SNAP)} data-turn="cw" aria-label={t("uc.cw")}>
            ⟳
          </button>
        </div>
      )}
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
