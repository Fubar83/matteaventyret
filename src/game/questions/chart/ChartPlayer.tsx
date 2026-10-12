import { useState } from "react";
import { digitsOf } from "../../../engine/digits";
import { PICTOGRAM_UNIT, type ChartProblem, type ChartStyle } from "../../../engine/questions/chart";
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

/** The emoji each fruit is drawn with in a pictogram. */
const FRUIT_ICON: Record<string, string> = { "chart.cat.apple": "🍎", "chart.cat.banana": "🍌", "chart.cat.pear": "🍐", "chart.cat.orange": "🍊" };

/** A pictogram: a row of pictures for each kind, every picture worth PICTOGRAM_UNIT - counting them is the reading. */
function Pictogram({ categoryKeys, values, highlightIndices }: { categoryKeys: readonly string[]; values: number[]; highlightIndices?: number[] }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 border-slate-200 bg-white p-3 shadow-sm">
      {values.map((v, i) => (
        <div key={i} className={`flex items-center gap-3 rounded-lg px-2 ${highlightIndices?.includes(i) ? "bg-amber-100" : ""}`}>
          <span className="w-20 text-sm text-slate-600 text-right">{t(categoryKeys[i])}</span>
          <span className="text-2xl tracking-wide" aria-label={t(categoryKeys[i])}>
            {FRUIT_ICON[categoryKeys[i]].repeat(v / PICTOGRAM_UNIT)}
          </span>
        </div>
      ))}
      <p className="border-t border-slate-200 pt-2 text-sm text-slate-600 text-center">{t("chart.legend", { n: PICTOGRAM_UNIT })}</p>
    </div>
  );
}

/** A line chart through the day: points joined by a line, read against the scale - no numbers written on it. */
function LineChart({ categoryKeys, values, highlightIndices }: { categoryKeys: readonly string[]; values: number[]; highlightIndices?: number[] }) {
  const W = 300;
  const X = (i: number) => 18 + (i * (W - 36)) / (values.length - 1);
  const Y = (v: number) => CHART_HEIGHT_PX - (v / CHART_MAX_VALUE) * CHART_HEIGHT_PX;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-2">
        <div className="relative text-xs text-slate-500 text-right" style={{ height: CHART_HEIGHT_PX, width: AXIS_LABEL_WIDTH }}>
          {AXIS_NUMBERS.map((g) => (
            <span key={g} className="absolute right-0 translate-y-1/2 leading-none" style={{ bottom: `${(g / CHART_MAX_VALUE) * 100}%` }}>
              {g}
            </span>
          ))}
        </div>
        <svg width={W} height={CHART_HEIGHT_PX} className="border-l-2 border-b-2 border-slate-300 overflow-visible" role="img" aria-label={t("chart.lineLabel")}>
          {UNIT_LINES.map((g) => (
            <line key={g} x1={0} x2={W} y1={Y(g)} y2={Y(g)} stroke={g % 5 === 0 ? "#94a3b8" : "#e2e8f0"} strokeDasharray={g % 5 === 0 ? "4 3" : undefined} />
          ))}
          {values.map((_, i) => (
            <line key={i} x1={X(i)} x2={X(i)} y1={0} y2={CHART_HEIGHT_PX} stroke={highlightIndices?.includes(i) ? "#f59e0b" : "#f1f5f9"} strokeWidth={highlightIndices?.includes(i) ? 2 : 1} />
          ))}
          <polyline points={values.map((v, i) => `${X(i)},${Y(v)}`).join(" ")} fill="none" stroke="#0284c7" strokeWidth={3} strokeLinejoin="round" />
          {values.map((v, i) => (
            <circle key={i} cx={X(i)} cy={Y(v)} r={5} fill={highlightIndices?.includes(i) ? "#f59e0b" : "#0284c7"} />
          ))}
        </svg>
        <span className="self-start text-xs text-slate-500">{t("chart.degrees")}</span>
      </div>
      <div className="relative" style={{ marginLeft: `calc(${AXIS_LABEL_WIDTH} + 0.5rem)`, width: W, height: 18 }}>
        {values.map((_, i) => (
          <span key={i} className="absolute -translate-x-1/2 text-xs text-slate-600 whitespace-nowrap" style={{ left: X(i) }}>
            {t(categoryKeys[i])}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A text's key for this chart: its own wording for a line chart or a pictogram where it has one (`chart.hint.lookup.line`). */
const styled = (problem: ChartPlayerProps["problem"], key: string, styles: readonly ChartStyle[]) => (styles.includes(problem.style) ? `${key}.${problem.style}` : key);

function questionText(problem: ChartPlayerProps["problem"]): string {
  if (problem.questionType === "lookup") {
    return t(styled(problem, "chart.question.lookup", ["line"]), { category: t(problem.categoryKeys[problem.askIndex!]) });
  }
  if (problem.questionType === "difference") {
    const [a, b] = problem.compareIndices!;
    return t(styled(problem, "chart.question.difference", ["line"]), { catA: t(problem.categoryKeys[a]), catB: t(problem.categoryKeys[b]) });
  }
  return t("chart.question.sum");
}

function hintText(problem: ChartPlayerProps["problem"]): string {
  if (problem.questionType === "lookup") return t(styled(problem, "chart.hint.lookup", ["line", "pictogram"]), { category: t(problem.categoryKeys[problem.askIndex!]), n: PICTOGRAM_UNIT });
  if (problem.questionType === "difference") return t(styled(problem, "chart.hint.difference", ["line"]));
  return t("chart.hint.sum");
}

/** The help ladder's first step and its worked solution, with the chart's own numbers. */
function helpTexts(problem: ChartPlayerProps["problem"]): { step: string; solution: string } {
  const name = (i: number) => t(problem.categoryKeys[i]);
  if (problem.questionType === "lookup") {
    const category = name(problem.askIndex!);
    return {
      step: hintText(problem),
      solution: t(styled(problem, "chart.step.lookup", ["line", "pictogram"]), { category, answer: problem.answer, pictures: problem.answer / PICTOGRAM_UNIT, n: PICTOGRAM_UNIT }),
    };
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
      {problem.style === "pictogram" ? (
        <Pictogram categoryKeys={problem.categoryKeys} values={problem.values} highlightIndices={highlightIndices} />
      ) : problem.style === "line" ? (
        <LineChart categoryKeys={problem.categoryKeys} values={problem.values} highlightIndices={highlightIndices} />
      ) : (
        <BarChart categoryKeys={problem.categoryKeys} values={problem.values} hideIndex={hideIndex} highlightIndices={highlightIndices} />
      )}
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
