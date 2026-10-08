import { useEffect, useMemo, useRef, useState } from "react";
import { playEffect } from "../audio/sound";
import { generateRound } from "../engine/generator";
import { makeRng } from "../engine/rng";
import { questionStars, questionXp, roundStars, type Stars } from "../engine/scoring";
import type { MethodId } from "../engine/types";
import { t } from "../i18n";
import { ChartPlayer } from "./ChartPlayer";
import type { ColumnProblemSummary } from "./ColumnProblemPlayer";
import { ColumnProblemPlayer } from "./ColumnProblemPlayer";
import { ExempelPlayer } from "./ExempelPlayer";
import { ExpressionPlayer } from "./ExpressionPlayer";
import type { MethodProgress } from "./phaseProgress";
import { applyOutcome, demoteToEgenOrdning } from "./phaseProgress";
import { PlaceValuePlayer } from "./PlaceValuePlayer";
import type { QuestionOutcome } from "./questionOutcome";
import { ResultScreen } from "./ResultScreen";
import { StatisticsPlayer } from "./StatisticsPlayer";
import { TrappanPlayer } from "./TrappanPlayer";
import { MulPlayer } from "./MulPlayer";
import { ClockPlayer } from "./ClockPlayer";
import { ShopPlayer } from "./shop/ShopPlayer";
import { ThemeBanner, themeForStage } from "./scenes/ThemeBanner";
import type { StageMeta } from "./stages";
import { TeoriScreen } from "./TeoriScreen";
import { topicForStage } from "./teoriContent";

type ColumnMethod = Extract<MethodId, "columnAdd" | "columnSub" | "columnMul">;

interface RoundScreenProps {
  stage: StageMeta;
  progress: Record<ColumnMethod, MethodProgress>;
  onProgressChange: (method: ColumnMethod, next: MethodProgress) => void;
  onRoundComplete: (stars: Stars, xp: number) => void;
  /** XP before this round - for the result screen's level bar. */
  totalXp: number;
  seenTeori: boolean;
  onTeoriSeen: () => void;
  onExit: () => void;
  /** What the back button returns to: the training path the round was started from, or the start screen. */
  exitLabel: string;
}

type Intro = "teori" | "exempel" | "uppgift";

/** A question's stars as it flies up after it's solved. */
interface Pop {
  key: number;
  stars: Stars;
  xp: number;
}

const STAR_COLOR: Record<Stars, string> = { 1: "#d97706", 2: "#94a3b8", 3: "#fbbf24" };

/** One round of a stage: its questions one after the other, each earning its stars (engine/scoring.ts), then the result. */
export function RoundScreen({ stage, progress, onProgressChange, onRoundComplete, totalXp, seenTeori, onTeoriSeen, onExit, exitLabel }: RoundScreenProps) {
  const [intro, setIntro] = useState<Intro>(seenTeori ? "uppgift" : "teori");
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

  function record(outcome: QuestionOutcome) {
    const stars = questionStars(outcome);
    setResults((r) => [...r, stars]);
    setPop({ key: Date.now(), stars, xp: questionXp(stars) });
    playEffect("star");
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

  const topic = topicForStage(stage.id);
  const isColumnStage = stage.method === "columnAdd" || stage.method === "columnSub" || stage.method === "columnMul" || stage.method === "mixed";
  const exempelMethod: ColumnMethod = topic.startsWith("subtraction") ? "columnSub" : topic.startsWith("multiplication") ? "columnMul" : "columnAdd";

  if (intro === "teori") {
    return (
      <TeoriScreen
        topic={topic}
        title={t(stage.titleKey).replace(/^\d+\.\s*/, "")}
        onDone={() => {
          onTeoriSeen();
          setIntro(isColumnStage ? "exempel" : "uppgift");
        }}
      />
    );
  }

  if (intro === "exempel") {
    return <ExempelPlayer stageId={stage.id} method={exempelMethod} onDone={() => setIntro("uppgift")} />;
  }

  if (done || !problem) {
    return <ResultScreen stars={stars} questionStars={results} xp={xp} totalXpBefore={xpAtStart} onPlayAgain={playAgain} onBack={onExit} backLabel={exitLabel} />;
  }

  // The younger levels' rounds play in a little world; the clock and the shop bring their own scenes.
  const showWorld = (stage.grade === "ak1-3" || stage.grade === "ak4-6") && stage.method !== "clock" && stage.method !== "shop";

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
        <button type="button" onClick={() => setIntro("teori")} aria-label={t("ui.theory")} className="w-7 h-7 rounded-full bg-slate-700 text-slate-200 font-bold">
          {t("ui.replayTeori")}
        </button>
      </div>

      {showWorld && <ThemeBanner theme={themeForStage(stage)} />}

      {pop && (
        <div key={pop.key} className="anim-float-up pointer-events-none fixed top-24 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center" onAnimationEnd={() => setPop(null)}>
          <span className="text-4xl drop-shadow" style={{ color: STAR_COLOR[pop.stars] }}>
            {"★".repeat(pop.stars)}
          </span>
          <span className="text-sm font-bold text-amber-600">+{pop.xp} XP</span>
        </div>
      )}

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

      {problem.kind === "placeValue" ? (
        <PlaceValuePlayer key={index} problem={problem} onSolved={record} />
      ) : problem.kind === "statistics" ? (
        <StatisticsPlayer key={index} problem={problem} level={stage.writingLevel} onSolved={record} />
      ) : problem.kind === "chart" ? (
        <ChartPlayer key={index} problem={problem} level={stage.writingLevel} onSolved={record} />
      ) : problem.kind === "expression" ? (
        <ExpressionPlayer key={`${roundKey}-${index}`} problem={problem} level={stage.writingLevel} onSolved={record} first={index === 0} />
      ) : problem.kind === "shop" ? (
        <ShopPlayer key={`${roundKey}-${index}`} problem={problem} onSolved={record} />
      ) : problem.kind === "clock" ? (
        <ClockPlayer key={`${roundKey}-${index}`} problem={problem} onSolved={record} />
      ) : problem.kind === "mulGuided" ? (
        <MulPlayer key={`${roundKey}-${index}`} problem={problem} onSolved={record} first={index === 0} />
      ) : problem.kind === "trappan" ? (
        <TrappanPlayer key={`${roundKey}-${index}`} problem={problem} onSolved={record} first={index === 0} />
      ) : problem.kind === "shortDiv" ? (
        // shortDiv has its own board layout (kort division), not yet wired into a
        // player component - not reachable yet since no StageMeta uses it (see stages.ts).
        null
      ) : (
        <ColumnProblemPlayer key={index} problem={problem} phase={currentMethod ? progress[currentMethod].phase : "fritt"} onSolved={handleColumnSolved} />
      )}
    </div>
  );
}
