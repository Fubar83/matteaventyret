import { useState } from "react";
import { digitsOf } from "../engine/digits";
import type { GeneratedProblem } from "../engine/generator";
import { t } from "../i18n";
import { checkWrittenAnswer, numbersIn } from "../mathinput/workCheck";
import type { WritingLevel } from "../recognition/levels";
import { profileForStage } from "../recognition/profiles";
import { AnswerBoard } from "./draw/AnswerBoard";
import { WorkPad } from "./draw/WorkPad";
import { HelpLadder } from "./HelpLadder";
import type { QuestionOutcome } from "./questionOutcome";
import { NextSheet } from "./NextSheet";

interface StatisticsPlayerProps {
  problem: Extract<GeneratedProblem, { kind: "statistics" }>;
  level?: WritingLevel;
  onSolved: (outcome: QuestionOutcome) => void;
}

/**
 * Is the written work the setup for this measure? A mean: a true calculation
 * ending in it ("12 + 15 + 9 = 36", "36 / 3 = 12"). A median or a mode: the
 * values written in order - that's how either is found.
 */
function statisticsSetupDone(problem: Extract<GeneratedProblem, { kind: "statistics" }>, work: string): boolean {
  if (problem.measure === "mean") return checkWrittenAnswer(work, { kind: "value", value: problem.answer }).fullSetup;
  const sorted = [...problem.values].sort((a, b) => a - b);
  const written = numbersIn(work);
  return written.length === sorted.length && written.every((v, i) => v === sorted[i]);
}

/** Lägesmått: medelvärde, median, typvärde - show the values, ask for one computed number (see build brief gap: Lgr22 "Sannolikhet och statistik", åk 4-6). */
export function StatisticsPlayer({ problem, level = 2, onSolved }: StatisticsPlayerProps) {
  const answerLength = digitsOf(problem.answer).length;
  const [resetToken, setResetToken] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [work, setWork] = useState("");
  const [verdict, setVerdict] = useState<"correct" | "wrong" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const sum = problem.values.reduce((a, b) => a + b, 0);
  const sorted = [...problem.values].sort((a, b) => a - b).join(", ");
  const outcome = (finalAttempts: number, shown: boolean): QuestionOutcome => ({
    helped: helpUsed > 0 || finalAttempts >= 2 || shown,
    fullSetup: statisticsSetupDone(problem, work),
    wrongFirstAttempts: finalAttempts >= 1 ? 1 : 0,
    hintUsed: finalAttempts >= 2,
    miniTutorialUsed: finalAttempts >= 3 || shown,
  });

  function submitValue(value: number) {
    if (value === problem.answer) {
      setVerdict("correct");
      setMessage(null);
      onSolved(outcome(attempts, false));
      return;
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setVerdict("wrong");
    if (nextAttempts === 1) {
      setMessage(t("statistics.tryAgain"));
      setResetToken((r) => r + 1);
    } else if (nextAttempts === 2) {
      setMessage(t(`statistics.hint.${problem.measure}`));
      setResetToken((r) => r + 1);
    } else {
      setMessage(t("statistics.reveal", { answer: problem.answer }));
      setRevealed(true);
    }
  }

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
        disabled={verdict === "correct"}
      />
      <AnswerBoard
        length={answerLength}
        onSubmit={submitValue}
        resetToken={resetToken}
        revealed={revealed ? problem.answer : null}
        verdict={verdict === "correct" ? "correct" : null}
      />
      {message && <p className="text-slate-600 text-sm max-w-xs text-center">{message}</p>}
      {revealed ? (
        <NextSheet note={message} onNext={() => onSolved(outcome(attempts, true))} />
      ) : (
        verdict !== "correct" && (
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
