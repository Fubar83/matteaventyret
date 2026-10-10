import { useState } from "react";
import { digitsOf } from "../../../engine/digits";
import type { StatisticsProblem } from "../../../engine/questions/statistics";
import { t } from "../../../i18n";
import { checkWrittenAnswer, numbersIn } from "../../../mathinput/workCheck";
import type { WritingLevel } from "../../../recognition/levels";
import { profileForStage } from "../../../recognition/profiles";
import { AnswerBoard } from "../../draw/AnswerBoard";
import { WorkPad } from "../../draw/WorkPad";
import { HelpLadder } from "../HelpLadder";
import type { QuestionOutcome } from "../questionOutcome";
import { NextSheet } from "../NextSheet";
import { useAnswerTries } from "../useAnswerTries";

interface StatisticsPlayerProps {
  problem: StatisticsProblem;
  level?: WritingLevel;
  onSolved: (outcome: QuestionOutcome) => void;
}

/**
 * Is the written work the setup for this measure? A mean: a true calculation
 * ending in it ("12 + 15 + 9 = 36", "36 / 3 = 12"). A median or a mode: the
 * values written in order - that's how either is found.
 */
function statisticsSetupDone(problem: StatisticsProblem, work: string): boolean {
  if (problem.measure === "mean") return checkWrittenAnswer(work, { kind: "value", value: problem.answer }).fullSetup;
  const sorted = [...problem.values].sort((a, b) => a - b);
  const written = numbersIn(work);
  return written.length === sorted.length && written.every((v, i) => v === sorted[i]);
}

/** Lägesmått: medelvärde, median, typvärde - show the values, ask for one computed number (see build brief gap: Lgr22 "Sannolikhet och statistik", åk 4-6). */
export function StatisticsPlayer({ problem, level = 2, onSolved }: StatisticsPlayerProps) {
  const [helpUsed, setHelpUsed] = useState(0);
  const [work, setWork] = useState("");
  const tries = useAnswerTries({
    answer: problem.answer,
    hint: t(`statistics.hint.${problem.measure}`),
    helpUsed,
    setup: () => statisticsSetupDone(problem, work),
    onSolved,
  });

  const sum = problem.values.reduce((a, b) => a + b, 0);
  const sorted = [...problem.values].sort((a, b) => a - b).join(", ");
  const stepText = problem.measure === "mean" ? t("statistics.step.mean", { sum, n: problem.values.length }) : t("statistics.step.sorted", { sorted });
  const solutionText =
    problem.measure === "mean"
      ? t("statistics.solution.mean", { sum, n: problem.values.length, answer: problem.answer })
      : t(`statistics.solution.${problem.measure}`, { answer: problem.answer });

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <div className="flex gap-2 flex-wrap justify-center max-w-md">
        {problem.values.map((v, i) => (
          <div key={i} className="w-12 h-12 flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white text-xl font-bold text-slate-800">
            {v}
          </div>
        ))}
      </div>
      <p className="text-slate-700 text-center font-medium">{t(`statistics.question.${problem.measure}`)}</p>
      <WorkPad
        level={level}
        profile={profileForStage(problem.stageId)}
        title={t("work.title")}
        subtitle={problem.measure === "mean" ? t("work.why") : `${t("work.sortedHint")} ${t("work.why")}`}
        rows={2}
        onChange={setWork}
        disabled={tries.solved}
      />
      <AnswerBoard
        length={digitsOf(problem.answer).length}
        onSubmit={tries.submit}
        resetToken={tries.resetToken}
        revealed={tries.revealed ? problem.answer : null}
        verdict={tries.solved ? "correct" : null}
      />
      {tries.message && <p className="text-slate-600 text-sm max-w-xs text-center">{tries.message}</p>}
      {tries.revealed ? (
        <NextSheet note={tries.message} onNext={tries.moveOn} />
      ) : (
        !tries.solved && (
          <HelpLadder
            used={helpUsed}
            onUse={setHelpUsed}
            steps={[
              { title: t("help.tip"), content: t(`statistics.hint.${problem.measure}`) },
              { title: t("help.step"), content: stepText },
              { title: t("help.solution"), content: solutionText },
            ]}
          />
        )
      )}
    </div>
  );
}
