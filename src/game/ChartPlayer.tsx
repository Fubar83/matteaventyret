import { useState } from "react";
import { digitsOf } from "../engine/digits";
import type { GeneratedProblem } from "../engine/generator";
import { t } from "../i18n";
import type { Stroke } from "../recognition/preprocess";
import { DigitCanvas } from "./DigitCanvas";
import { Numpad } from "./Numpad";

export interface ProblemSummary {
  wrongFirstAttempts: number;
  hintUsed: boolean;
  miniTutorialUsed: boolean;
}

interface ChartPlayerProps {
  problem: Extract<GeneratedProblem, { kind: "chart" }>;
  inputMode?: "numpad" | "handwriting";
  onSolved: (summary: ProblemSummary) => void;
}

const HAND_CELL_PX = 56;
const CHART_HEIGHT_PX = 140;
const CHART_MAX_VALUE = 15;
const GRID_LINES = [0, 5, 10, 15];

/** Same free-answer handwriting cell as StatisticsPlayer's (see its comment: candidate for a shared future component). */
function HandwrittenDigitCell({
  value,
  disabled,
  resetToken,
  onSettled,
}: {
  value: number | undefined;
  disabled: boolean;
  resetToken: number;
  onSettled: (strokes: Stroke[], canvasSize: number) => void;
}) {
  if (value !== undefined) {
    return (
      <div className="w-12 h-14 flex items-center justify-center rounded-md border-2 border-emerald-400 bg-emerald-50 text-emerald-700 text-2xl font-bold">
        {value}
      </div>
    );
  }
  return (
    <div className={disabled ? "opacity-40 pointer-events-none" : ""}>
      <DigitCanvas size={HAND_CELL_PX} compact resetToken={resetToken} onSettled={(strokes) => onSettled(strokes, HAND_CELL_PX)} />
    </div>
  );
}

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
    <div className="flex items-end gap-2">
      <div className="flex flex-col justify-between text-xs text-slate-400" style={{ height: CHART_HEIGHT_PX }}>
        {[...GRID_LINES].reverse().map((g) => (
          <span key={g}>{g}</span>
        ))}
      </div>
      <div className="flex items-end gap-4 border-l-2 border-b-2 border-slate-300 pl-3 pr-1" style={{ height: CHART_HEIGHT_PX }}>
        {values.map((v, i) => {
          const highlighted = highlightIndices?.includes(i) ?? false;
          return (
            <div key={i} className="flex flex-col items-center gap-1 w-14">
              <span className="text-sm font-bold text-slate-700 h-5">{i === hideIndex ? "?" : v}</span>
              <div
                className={`w-10 rounded-t ${highlighted ? "bg-amber-400" : "bg-sky-400"}`}
                style={{ height: `${(v / CHART_MAX_VALUE) * CHART_HEIGHT_PX}px` }}
              />
              <span className="text-xs text-slate-600 text-center">{t(categoryKeys[i])}</span>
            </div>
          );
        })}
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

/** Tabeller och diagram: read, compare, or sum a simple bar chart (see build brief gap: Lgr22 "Sannolikhet och statistik", åk 4-6). */
export function ChartPlayer({ problem, inputMode = "numpad", onSolved }: ChartPlayerProps) {
  const answerLength = digitsOf(problem.answer).length;
  const [typed, setTyped] = useState("");
  const [handDigits, setHandDigits] = useState<(number | undefined)[]>(() => Array(answerLength).fill(undefined));
  const [resetTokens, setResetTokens] = useState<number[]>(() => Array(answerLength).fill(0));
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [pendingGuesses, setPendingGuesses] = useState<[number, number] | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [verdict, setVerdict] = useState<"correct" | "wrong" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  function resetAnswer() {
    setTyped("");
    setHandDigits(Array(answerLength).fill(undefined));
    setResetTokens((r) => r.map((x) => x + 1));
    setPendingIndex(null);
    setPendingGuesses(null);
  }

  function submitValue(value: number) {
    if (value === problem.answer) {
      setVerdict("correct");
      setMessage(null);
      onSolved({ wrongFirstAttempts: attempts >= 1 ? 1 : 0, hintUsed: attempts >= 2, miniTutorialUsed: attempts >= 3 });
      return;
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setVerdict("wrong");
    if (nextAttempts === 1) {
      setMessage(t("statistics.tryAgain"));
      resetAnswer();
    } else if (nextAttempts === 2) {
      setMessage(hintText(problem));
      resetAnswer();
    } else {
      setMessage(t("statistics.reveal", { answer: problem.answer }));
      setRevealed(true);
      setTyped(String(problem.answer));
      setHandDigits(digitsOf(problem.answer).reverse());
    }
  }

  function submit() {
    if (typed === "") return;
    submitValue(Number(typed));
  }

  function applyHandDigit(index: number, digit: number) {
    const next = [...handDigits];
    next[index] = digit;
    setHandDigits(next);
    if (next.every((d) => d !== undefined)) submitValue(Number(next.join("")));
  }

  async function handleDigitStrokes(index: number, strokes: Stroke[], canvasSize: number) {
    const { recognizeDigitStrokes } = await import("../recognition/recognizer");
    const result = await recognizeDigitStrokes(strokes, canvasSize);
    if (result.confident) {
      applyHandDigit(index, result.digit);
    } else {
      setPendingIndex(index);
      setPendingGuesses([result.topTwo.first.digit, result.topTwo.second.digit]);
    }
  }

  function resolvePending(digit: number) {
    if (pendingIndex === null) return;
    const index = pendingIndex;
    setPendingIndex(null);
    setPendingGuesses(null);
    applyHandDigit(index, digit);
  }

  const hideIndex = problem.questionType === "lookup" && !revealed ? problem.askIndex : undefined;
  const highlightIndices = problem.questionType === "difference" ? problem.compareIndices : undefined;

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center gap-6 lg:gap-12">
      <div className="flex flex-col items-center gap-6">
        <BarChart categoryKeys={problem.categoryKeys} values={problem.values} hideIndex={hideIndex} highlightIndices={highlightIndices} />
        <p className="text-slate-700 text-center font-medium max-w-xs">{questionText(problem)}</p>

        {inputMode === "handwriting" && !revealed && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {handDigits.map((d, i) => (
                <HandwrittenDigitCell
                  key={i}
                  value={d}
                  disabled={pendingIndex !== null && pendingIndex !== i}
                  resetToken={resetTokens[i]}
                  onSettled={(strokes, canvasSize) => handleDigitStrokes(i, strokes, canvasSize)}
                />
              ))}
            </div>
            {pendingIndex !== null && pendingGuesses && (
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs text-slate-500">{t("ui.didYouMean")}</p>
                <div className="flex gap-2">
                  {pendingGuesses.map((d) => (
                    <button key={d} type="button" onClick={() => resolvePending(d)} className="w-11 h-11 rounded-xl bg-sky-500 text-white text-xl font-bold">
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {!revealed && inputMode !== "handwriting" && (
          <div
            className={`w-40 h-14 flex items-center justify-center rounded-xl border-2 text-2xl font-bold ${
              verdict === "correct"
                ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                : verdict === "wrong"
                  ? "bg-rose-50 border-rose-400 text-rose-700"
                  : "bg-white border-slate-300 border-dashed text-slate-800"
            }`}
          >
            {typed || " "}
          </div>
        )}
        {message && <p className="text-slate-600 text-sm max-w-xs text-center">{message}</p>}
        {revealed && (
          <button
            type="button"
            onClick={() => onSolved({ wrongFirstAttempts: attempts >= 1 ? 1 : 0, hintUsed: true, miniTutorialUsed: true })}
            className="h-12 px-6 rounded-xl bg-emerald-600 text-white font-bold shadow"
          >
            {t("placeValue.next")}
          </button>
        )}
      </div>
      {inputMode === "numpad" && !revealed && (
        <Numpad
          onDigit={(d) => setTyped((prev) => (prev.length >= 5 ? prev : prev + d))}
          onDelete={() => setTyped((prev) => prev.slice(0, -1))}
          onSubmit={submit}
        />
      )}
    </div>
  );
}
