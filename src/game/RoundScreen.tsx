import { useEffect, useMemo, useRef, useState } from "react";
import { playEffect } from "../audio/sound";
import { generateRound } from "../engine/generator";
import { makeRng } from "../engine/rng";
import { questionStars, questionXp, roundStars, type Stars } from "../engine/scoring";
import type { MethodId } from "../engine/types";
import { t } from "../i18n";
import { Celebration } from "./Celebration";
import type { ColumnProblemSummary } from "./ColumnProblemPlayer";
import type { MethodProgress } from "./phaseProgress";
import { applyOutcome, demoteToEgenOrdning } from "./phaseProgress";
import type { QuestionOutcome } from "./questionOutcome";
import { QuestionPlayer } from "./QuestionPlayer";
import { ResultScreen } from "./ResultScreen";
import type { StageMeta } from "./stages";

type ColumnMethod = Extract<MethodId, "columnAdd" | "columnSub" | "columnMul">;

interface RoundScreenProps {
  stage: StageMeta;
  progress: Record<ColumnMethod, MethodProgress>;
  onProgressChange: (method: ColumnMethod, next: MethodProgress) => void;
  onRoundComplete: (stars: Stars, xp: number) => void;
  /** XP before this round - for the result screen's level bar. */
  totalXp: number;
  onExit: () => void;
  /** What the back button returns to: the training path the round was started from, or the start screen. */
  exitLabel: string;
}

/** A solved question's stars, celebrated before the next question. */
interface Pop {
  key: number;
  stars: Stars;
  xp: number;
}

const STAR_COLOR: Record<Stars, string> = { 1: "#d97706", 2: "#94a3b8", 3: "#fbbf24" };

/** One round of a stage: its questions one after the other, each earning its stars (engine/scoring.ts), then the result. */
/** Straight to the questions - no theory slides or worked example first; help is in each question's own help ladder. */
export function RoundScreen({ stage, progress, onProgressChange, onRoundComplete, totalXp, onExit, exitLabel }: RoundScreenProps) {
  const [roundKey, setRoundKey] = useState(0);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Stars[]>([]);
  const [pop, setPop] = useState<Pop | null>(null);
  const [demotionPrompt, setDemotionPrompt] = useState(false);
  /** The XP when this round began - the result's bar fills from here (totalXp itself moves on as the round is saved). */
  const [xpAtStart, setXpAtStart] = useState(totalXp);
  const reportedRef = useRef(false);

  const { problems } = useMemo(() => {
    const rng = makeRng(Date.now() + roundKey * 7919);
    return generateRound(stage.id, stage.problemsPerRound, rng);
  }, [stage.id, stage.problemsPerRound, roundKey]);

  const done = index >= problems.length;
  const problem = done ? null : problems[index];
  // A "mixed" stage generates both operators in one round, so the active
  // method is read off the current problem, not fixed per stage.
  const currentMethod: ColumnMethod | null =
    problem && (problem.kind === "columnAdd" || problem.kind === "columnSub" || problem.kind === "columnMul") ? problem.kind : null;
  const xp = results.reduce((sum, s) => sum + questionXp(s), 0);

  /** A question solved: its stars count at once, but the next question waits for the celebration (Celebration.tsx). */
  function record(outcome: QuestionOutcome) {
    if (pop) return; // already celebrating this one
    const stars = questionStars(outcome);
    setResults((r) => [...r, stars]);
    setPop({ key: Date.now(), stars, xp: questionXp(stars) });
    playEffect("star");
  }

  function nextQuestion() {
    setPop(null);
    setIndex((i) => i + 1);
  }

  function handleColumnSolved(summary: ColumnProblemSummary) {
    record(summary);
    if (currentMethod) {
      const result = applyOutcome(progress[currentMethod], summary);
      onProgressChange(currentMethod, result.progress);
      if (result.suggestDemotion) setDemotionPrompt(true);
    }
  }

  function playAgain() {
    reportedRef.current = false;
    setRoundKey((k) => k + 1);
    setIndex(0);
    setResults([]);
    setPop(null);
    setXpAtStart(totalXp);
  }

  const stars = roundStars(results);
  useEffect(() => {
    if ((done || !problem) && !reportedRef.current) {
      reportedRef.current = true;
      onRoundComplete(stars, xp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, problem]);

  if (done || !problem) {
    return <ResultScreen stars={stars} questionStars={results} xp={xp} totalXpBefore={xpAtStart} onPlayAgain={playAgain} onBack={onExit} backLabel={exitLabel} />;
  }

  return (
    <div className="flex flex-col items-center gap-5 py-6 px-4">
      <div className="w-full max-w-2xl flex items-center gap-3 rounded-2xl bg-slate-900 text-white px-4 py-2 shadow">
        <button type="button" onClick={onExit} className="text-sm text-slate-300 hover:text-white">
          ← {exitLabel}
        </button>
        <span className="font-semibold truncate">{t(stage.titleKey).replace(/^\d+\.\s*/, "")}</span>
        <div className="ml-auto flex items-center gap-1.5" aria-label={`${t("ui.problem")} ${index + 1} ${t("ui.of")} ${problems.length}`}>
          {problems.map((_, i) => {
            const got = results[i];
            return (
              <span
                key={i}
                className={`w-3.5 h-3.5 rounded-full border ${i === index ? "border-sky-300 ring-2 ring-sky-400/60" : "border-slate-600"}`}
                style={{ background: got ? STAR_COLOR[got] : "transparent" }}
              />
            );
          })}
        </div>
        <span className="text-sm font-bold text-amber-300 tabular-nums">{xp} XP</span>
      </div>

      {/* "Rätt!" - the answer stays in view while the child takes in that it was right; then the next question. */}
      {pop && <Celebration key={pop.key} stars={pop.stars} xp={pop.xp} onNext={nextQuestion} />}

      {demotionPrompt && currentMethod && (
        <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-center max-w-xs">
          <p className="mb-3 text-slate-700">{t("ui.suggestDemote")}</p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              className="px-4 h-10 rounded-lg bg-amber-500 text-white font-bold"
              onClick={() => {
                onProgressChange(currentMethod, demoteToEgenOrdning());
                setDemotionPrompt(false);
              }}
            >
              {t("ui.suggestDemoteYes")}
            </button>
            <button type="button" className="px-4 h-10 rounded-lg bg-slate-200 text-slate-700 font-bold" onClick={() => setDemotionPrompt(false)}>
              {t("ui.suggestDemoteNo")}
            </button>
          </div>
        </div>
      )}

      <QuestionPlayer
        key={`${roundKey}-${index}`}
        problem={problem}
        level={stage.writingLevel}
        phase={currentMethod ? progress[currentMethod].phase : "fritt"}
        first={index === 0}
        onSolved={record}
        onColumnSolved={handleColumnSolved}
      />
    </div>
  );
}
