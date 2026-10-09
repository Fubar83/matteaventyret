import { useState } from "react";
import { digitsOf } from "../../../engine/digits";
import type { ChartProblem } from "../../../engine/questions/chart";
import { t } from "../../../i18n";
import { checkWrittenAnswer } from "../../../mathinput/workCheck";
import type { WritingLevel } from "../../../recognition/levels";
import { profileForStage } from "../../../recognition/profiles";
import { AnswerBoard } from "../../draw/AnswerBoard";
import { WorkPad } from "../../draw/WorkPad";
import { HelpLadder } from "../HelpLadder";
import type { QuestionOutcome } from "../questionOutcome";
import { NextSheet } from "../NextSheet";

interface ChartPlayerProps {
  problem: ChartProblem;
  level?: WritingLevel;
  onSolved: (outcome: QuestionOutcome) => void;
}

const CHART_HEIGHT_PX = 140;
const CHART_MAX_VALUE = 15;
const GRID_LINES = [0, 5, 10, 15];
/** Fixed so the axis-label column and the category-label row below line up under the same bars. */
const AXIS_LABEL_WIDTH = "1.5rem";

function BarChart({
  categoryKeys,
  values,
  hideIndex,
  highlightIndices,
}: {
  categoryKeys: readonly string[];
  values: number[];
  hideIndex?: number;
  highlightIndices?: number[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-2">
        <div className="flex flex-col justify-between text-xs text-slate-400 text-right" style={{ height: CHART_HEIGHT_PX, width: AXIS_LABEL_WIDTH }}>
          {[...GRID_LINES].reverse().map((g) => (
            <span key={g}>{g}</span>
          ))}
        </div>
        {/* Only the bars themselves live inside this fixed-height, scaled box - a
            value label or category name in here too would inflate a tall
            column's total height past CHART_HEIGHT_PX (they're bottom-aligned
            via items-end, so that extra height pushes the bar itself above
            where the scale says it should be, throwing off the whole chart). */}
        <div className="relative flex items-end gap-4 border-l-2 border-b-2 border-slate-300 pl-3 pr-1" style={{ height: CHART_HEIGHT_PX }}>
          {GRID_LINES.filter((g) => g > 0).map((g) => (
            <div key={g} className="absolute left-0 right-0 border-t border-dashed border-slate-200" style={{ bottom: `${(g / CHART_MAX_VALUE) * 100}%` }} />
          ))}
          {values.map((v, i) => {
            const highlighted = highlightIndices?.includes(i) ?? false;
            return (
              <div key={i} className="relative w-10 h-full flex items-end">
                {/* Tracks the bar's own top (bar-height% + a small gap), not a fixed
                    offset from the box's top - otherwise every label would sit at
                    the same height regardless of its bar's value. */}
                <span
                  className="absolute left-1/2 -translate-x-1/2 text-sm font-bold text-slate-700 whitespace-nowrap"
                  style={{ bottom: `calc(${(v / CHART_MAX_VALUE) * 100}% + 4px)` }}
                >
                  {i === hideIndex ? "?" : v}
                </span>
                <div className={`w-full rounded-t ${highlighted ? "bg-amber-400" : "bg-sky-400"}`} style={{ height: `${(v / CHART_MAX_VALUE) * 100}%` }} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-start gap-2">
        <div style={{ width: AXIS_LABEL_WIDTH }} />
        <div className="flex gap-4 pl-3 pr-1">
          {values.map((_, i) => (
            <span key={i} className="w-10 text-xs text-slate-600 text-center">
              {t(categoryKeys[i])}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function questionText(problem: ChartPlayerProps["problem"]): string {
  if (problem.questionType === "lookup") {
    return t("chart.question.lookup", { category: t(problem.categoryKeys[problem.askIndex!]) });
  }
  if (problem.questionType === "difference") {
    const [a, b] = problem.compareIndices!;
    return t("chart.question.difference", { catA: t(problem.categoryKeys[a]), catB: t(problem.categoryKeys[b]) });
  }
  return t("chart.question.sum");
}

function hintText(problem: ChartPlayerProps["problem"]): string {
  if (problem.questionType === "lookup") return t("chart.hint.lookup", { category: t(problem.categoryKeys[problem.askIndex!]) });
  if (problem.questionType === "difference") return t("chart.hint.difference");
  return t("chart.hint.sum");
}

/** The help ladder's first step and its worked solution, with the chart's own numbers. */
function helpTexts(problem: ChartPlayerProps["problem"]): { step: string; solution: string } {
  const name = (i: number) => t(problem.categoryKeys[i]);
  if (problem.questionType === "lookup") {
    const category = name(problem.askIndex!);
    return { step: t("chart.hint.lookup", { category }), solution: t("chart.step.lookup", { category, answer: problem.answer }) };
  }
  if (problem.questionType === "difference") {
    const [ia, ib] = problem.compareIndices!;
    const [a, b] = [problem.values[ia], problem.values[ib]];
    return {
      step: t("chart.step.two", { catA: name(ia), catB: name(ib), a, b }),
      solution: t("chart.solution.difference", { big: Math.max(a, b), small: Math.min(a, b), answer: problem.answer }),
    };
  }
  return { step: t("chart.step.all", { values: problem.values.join(", ") }), solution: t("chart.solution.sum", { sum: problem.values.join(" + "), answer: problem.answer }) };
}

/**
 * Tabeller och diagram: read, compare, or sum a simple bar chart (see build brief gap: Lgr22 "Sannolikhet och statistik", åk 4-6).
 * Reading one bar has nothing to set up; a difference or a sum does - its
 * calculation, written under "Visa hur du tänkte", is what makes ★★★.
 */
export function ChartPlayer({ problem, level = 2, onSolved }: ChartPlayerProps) {
  const answerLength = digitsOf(problem.answer).length;
  const [resetToken, setResetToken] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [work, setWork] = useState("");
  const [verdict, setVerdict] = useState<"correct" | "wrong" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const calculates = problem.questionType !== "lookup";
  const outcome = (finalAttempts: number, shown: boolean): QuestionOutcome => ({
    helped: helpUsed > 0 || finalAttempts >= 2 || shown,
    fullSetup: calculates ? checkWrittenAnswer(work, { kind: "value", value: problem.answer }).fullSetup : finalAttempts === 0,
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
      setMessage(hintText(problem));
      setResetToken((r) => r + 1);
    } else {
      setMessage(t("statistics.reveal", { answer: problem.answer }));
      setRevealed(true);
    }
  }

  const hideIndex = problem.questionType === "lookup" && !revealed ? problem.askIndex : undefined;
  const highlightIndices = problem.questionType === "difference" ? problem.compareIndices : undefined;
  const help = helpTexts(problem);

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <BarChart categoryKeys={problem.categoryKeys} values={problem.values} hideIndex={hideIndex} highlightIndices={highlightIndices} />
      <p className="text-slate-700 text-center font-medium max-w-xs">{questionText(problem)}</p>
      {calculates && <WorkPad level={level} profile={profileForStage(problem.stageId)} title={t("work.title")} subtitle={t("work.why")} rows={2} onChange={setWork} disabled={verdict === "correct"} />}
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
              { title: t("help.tip"), content: hintText(problem) },
              { title: t("help.step"), content: help.step },
              { title: t("help.solution"), content: help.solution },
            ]}
          />
        )
      )}
    </div>
  );
}
