import { useState } from "react";
import type { AdvancedProblem } from "../engine/advanced";
import { t } from "../i18n";
import type { WritingLevel } from "../recognition/levels";
import { FreeSolver } from "./FreeSolver";
import { QuickAnswer } from "./QuickAnswer";
import { GeometryFigure } from "./GeometryFigure";
import { ClockFace } from "./ClockFace";
import { DigitalClock } from "./DigitalClock";
import { SkyScene } from "./SkyScene";
import { QuestionScene } from "./scenes/QuestionScene";
import { hourAngle, minuteAngle } from "../engine/clock";
import type { QuestionOutcome } from "./questionOutcome";
import { StepSolver } from "./StepSolver";
import { Tex } from "./Tex";

interface ExpressionPlayerProps {
  problem: AdvancedProblem;
  level: WritingLevel;
  onSolved: (outcome: QuestionOutcome) => void;
  /** The round's first question: in Guidat, each step starts out there to trace. */
  first?: boolean;
}

type SolveMode = "guided" | "free";
const MODE_KEY = "matteaventyret-solve-mode-v1";

function loadMode(): SolveMode {
  try {
    return localStorage.getItem(MODE_KEY) === "free" ? "free" : "guided";
  } catch {
    return "guided";
  }
}

/**
 * Åk 7-9 and gymnasiet (and the geometry questions): the task, and the
 * solution written underneath, one of two ways - the child's choice,
 * remembered:
 *  - Guidat (StepSolver.tsx): one box per step, each with what to do in it,
 *    checked strictly as the child moves on, and to trace from the start;
 *  - Fritt (FreeSolver.tsx): one free board, written any way, checked as a whole.
 */
export function ExpressionPlayer({ problem, level, onSolved, first = false }: ExpressionPlayerProps) {
  const [mode, setMode] = useState<SolveMode>(loadMode);

  function choose(next: SolveMode) {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // Just not remembered.
    }
  }

  const key = `${mode}|${problem.promptKey}|${problem.display}|${problem.solution.join("|")}`;
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {problem.clock && (
        <SkyScene hour={problem.clock.sky ?? 12} height={320}>
          {problem.clock.kind === "analog" ? (
            <div className="rounded-full bg-white/30 p-2 backdrop-blur-[2px] shadow-2xl">
              <ClockFace face={problem.clock.face} hourDeg={hourAngle(problem.clock.h, problem.clock.m)} minuteDeg={minuteAngle(problem.clock.m)} size={250} label={t("clock.label")} />
            </div>
          ) : (
            <DigitalClock h={problem.clock.h} m={problem.clock.m} look={problem.clock.look} />
          )}
        </SkyScene>
      )}
      {problem.scene && <QuestionScene scene={problem.scene} />}
      {problem.figure && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 p-2 shadow-sm">
          <GeometryFigure figure={problem.figure} />
        </div>
      )}
      <p className="text-slate-700 text-center font-medium max-w-xl">{t(problem.promptKey, problem.promptVars)}</p>
      {problem.display && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 px-6 py-3 text-2xl shadow-sm">
          <Tex latex={problem.display} block />
        </div>
      )}
      {problem.answerOnly && problem.answer.kind === "value" ? (
        <QuickAnswer key={key} answer={problem.answer.value} choices={problem.answerOnly.choices} level={level} onSolved={onSolved} />
      ) : (
        <>
      <div className="flex rounded-xl bg-slate-200 p-1" role="radiogroup" aria-label={t("solve.mode")}>
        {(["guided", "free"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => choose(m)}
            className={`px-4 h-9 rounded-lg text-sm font-semibold ${mode === m ? "bg-white text-sky-700 shadow" : "text-slate-600"}`}
          >
            {t(m === "guided" ? "solve.guided" : "solve.free")}
          </button>
        ))}
      </div>
      {mode === "guided" ? (
        <StepSolver key={key} problem={problem} level={level} onSolved={onSolved} trace={first} />
      ) : (
        <FreeSolver key={key} problem={problem} level={level} onSolved={onSolved} />
      )}
        </>
      )}
    </div>
  );
}
