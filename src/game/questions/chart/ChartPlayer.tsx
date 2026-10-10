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
import { useAnswerTries } from "../useAnswerTries";

interface ChartPlayerProps {
  problem: ChartProblem;
  level?: WritingLevel;
  onSolved: (outcome: QuestionOutcome) => void;
}

// 14 px for each unit: room to count a bar's height against the lines.
const CHART_HEIGHT_PX = 210;
const CHART_MAX_VALUE = 15;
/** The scale's numbers - and a faint line at every whole number between, so a bar's height can be read off exactly. */
const AXIS_NUMBERS = [0, 5, 10, 15];
const UNIT_LINES = Array.from({ length: CHART_MAX_VALUE }, (_, i) => i + 1);
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
        {/* Each number centred on its own line. */}
        <div className="relative text-xs text-slate-500 text-right" style={{ height: CHART_HEIGHT_PX, width: AXIS_LABEL_WIDTH }}>
          {AXIS_NUMBERS.map((g) => (
            <span key={g} className="absolute right-0 translate-y-1/2 leading-none" style={{ bottom: `${(g / CHART_MAX_VALUE) * 100}%` }}>
              {g}
            </span>
          ))}
        </div>
        {/* Only the bars themselves live inside this fixed-height, scaled box - a
            value label or category name in here too would inflate a tall
            column's total height past CHART_HEIGHT_PX (they're bottom-aligned
            via items-end, so that extra height pushes the bar itself above
            where the scale says it should be, throwing off the whole chart). */}
        <div className="relative flex items-end gap-4 border-l-2 border-b-2 border-slate-300 pl-3 pr-1" style={{ height: CHART_HEIGHT_PX }}>
          {UNIT_LINES.map((g) => (
            <div
              key={g}
              className={`absolute left-0 right-0 border-t ${g % 5 === 0 ? "border-dashed border-slate-400" : "border-slate-200"}`}
              style={{ bottom: `${(g / CHART_MAX_VALUE) * 100}%` }}
            />
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
  const [helpUsed, setHelpUsed] = useState(0);
  const [work, setWork] = useState("");
  const calculates = problem.questionType !== "lookup";
  const tries = useAnswerTries({
    answer: problem.answer,
    hint: hintText(problem),
    helpUsed,
    // Reading one bar has nothing to set up; a difference or a sum has its calculation.
    setup: calculates ? () => checkWrittenAnswer(work, { kind: "value", value: problem.answer }).fullSetup : undefined,
    onSolved,
  });

  const hideIndex = problem.questionType === "lookup" && !tries.revealed ? problem.askIndex : undefined;
  const highlightIndices = problem.questionType === "difference" ? problem.compareIndices : undefined;
  const help = helpTexts(problem);

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <BarChart categoryKeys={problem.categoryKeys} values={problem.values} hideIndex={hideIndex} highlightIndices={highlightIndices} />
      <p className="text-slate-700 text-center font-medium max-w-xs">{questionText(problem)}</p>
      {calculates && <WorkPad level={level} profile={profileForStage(problem.stageId)} title={t("work.title")} subtitle={t("work.why")} rows={2} onChange={setWork} disabled={tries.solved} />}
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
