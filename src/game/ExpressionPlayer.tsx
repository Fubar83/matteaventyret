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
import { Tex } from "./Tex";

interface ExpressionPlayerProps {
  problem: AdvancedProblem;
  level: WritingLevel;
  onSolved: (outcome: QuestionOutcome) => void;
  /** The round's first question (kept for the round's call; the free board needs nothing different). */
  first?: boolean;
}

/**
 * The written questions (and the geometry ones): the task, and the solution
 * written underneath on one free board (FreeSolver.tsx) - any way the child
 * likes, a chain on one line included (4 · 3 + 5 · 2 = 12 + 10 = 22), checked
 * as a whole. No step-by-step boxes. A fact to know (the times tables) asks
 * for just the answer (QuickAnswer.tsx).
 */
export function ExpressionPlayer({ problem, level, onSolved }: ExpressionPlayerProps) {
  const key = `${problem.promptKey}|${problem.display}|${problem.solution.join("|")}`;
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
        <FreeSolver key={key} problem={problem} level={level} onSolved={onSolved} />
      )}
    </div>
  );
}
