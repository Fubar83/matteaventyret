import { useEffect, useMemo, useRef, useState } from "react";
import { generateRound } from "../engine/generator";
import { makeRng } from "../engine/rng";
import type { RoundStats } from "../engine/scoring";
import { computeProblemXp, computeStars, type Stars } from "../engine/scoring";
import type { MethodId } from "../engine/types";
import { t } from "../i18n";
import type { ColumnProblemSummary } from "./ColumnProblemPlayer";
import { ColumnProblemPlayer } from "./ColumnProblemPlayer";
import type { MethodProgress } from "./phaseProgress";
import { applyOutcome, demoteToEgenOrdning } from "./phaseProgress";
import { ExempelPlayer } from "./ExempelPlayer";
import { PlaceValuePlayer, type ProblemSummary } from "./PlaceValuePlayer";
import { ResultScreen } from "./ResultScreen";
import { StatisticsPlayer } from "./StatisticsPlayer";
import type { StageMeta } from "./stages";
import { TeoriScreen } from "./TeoriScreen";
import { topicForStage } from "./teoriContent";

interface RoundScreenProps {
  stage: StageMeta;
  progress: Record<Extract<MethodId, "columnAdd" | "columnSub" | "columnMul">, MethodProgress>;
  onProgressChange: (method: Extract<MethodId, "columnAdd" | "columnSub" | "columnMul">, next: MethodProgress) => void;
  onRoundComplete: (stars: Stars, xp: number) => void;
  seenTeori: boolean;
  onTeoriSeen: () => void;
  inputMode: "numpad" | "handwriting";
  onExit: () => void;
}

type Intro = "teori" | "exempel" | "uppgift";

export function RoundScreen({ stage, progress, onProgressChange, onRoundComplete, seenTeori, onTeoriSeen, inputMode, onExit }: RoundScreenProps) {
  const [intro, setIntro] = useState<Intro>(seenTeori ? "uppgift" : "teori");
  const [roundKey, setRoundKey] = useState(0);
  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState<RoundStats>({ wrongFirstAttempts: 0, problemsWithHint: 0, miniTutorialsUsed: 0 });
  const [xp, setXp] = useState(0);
  const [demotionPrompt, setDemotionPrompt] = useState(false);
  const reportedRef = useRef(false);

  const { problems } = useMemo(() => {
    const rng = makeRng(Date.now() + roundKey * 7919);
    return generateRound(stage.id, stage.problemsPerRound, rng);
  }, [stage.id, stage.problemsPerRound, roundKey]);

  const done = index >= problems.length;
  const problem = done ? null : problems[index];
  // A "mixed" stage (6-7) generates both operators in one round, so the active
  // method is read off the current problem, not fixed per stage.
  const currentMethod: Extract<MethodId, "columnAdd" | "columnSub" | "columnMul"> | null =
    problem && problem.kind !== "placeValue" && problem.kind !== "shortDiv" && problem.kind !== "statistics" ? problem.kind : null;

  function recordCommon(outcome: { wrongFirstAttempts: number; hintUsed: boolean; miniTutorialUsed: boolean }) {
    setStats((s) => ({
      wrongFirstAttempts: s.wrongFirstAttempts + outcome.wrongFirstAttempts,
      problemsWithHint: s.problemsWithHint + (outcome.hintUsed ? 1 : 0),
      miniTutorialsUsed: s.miniTutorialsUsed + (outcome.miniTutorialUsed ? 1 : 0),
    }));
    setXp((x) => x + computeProblemXp(outcome.hintUsed || outcome.miniTutorialUsed));
    setIndex((i) => i + 1);
  }

  function handlePlaceValueSolved(summary: ProblemSummary) {
    recordCommon(summary);
  }

  function handleStatisticsSolved(summary: ProblemSummary) {
    recordCommon(summary);
  }

  function handleColumnSolved(summary: ColumnProblemSummary) {
    recordCommon(summary);
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
    setStats({ wrongFirstAttempts: 0, problemsWithHint: 0, miniTutorialsUsed: 0 });
    setXp(0);
  }

  const stars = computeStars(stats);
  useEffect(() => {
    if ((done || !problem) && !reportedRef.current) {
      reportedRef.current = true;
      onRoundComplete(stars, xp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, problem]);

  const topic = topicForStage(stage.id);
  const exempelMethod: Extract<MethodId, "columnAdd" | "columnSub" | "columnMul"> = topic.startsWith("subtraction")
    ? "columnSub"
    : topic.startsWith("multiplication")
      ? "columnMul"
      : "columnAdd";

  if (intro === "teori") {
    return (
      <TeoriScreen
        topic={topic}
        onDone={() => {
          onTeoriSeen();
          setIntro(stage.method === "placeValue" || stage.method === "statistics" ? "uppgift" : "exempel");
        }}
      />
    );
  }

  if (intro === "exempel") {
    return <ExempelPlayer stageId={stage.id} method={exempelMethod} inputMode={inputMode} onDone={() => setIntro("uppgift")} />;
  }

  if (done || !problem) {
    return <ResultScreen stars={stars} xp={xp} onPlayAgain={playAgain} onBack={onExit} />;
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4">
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <button type="button" onClick={onExit} className="underline">
          {t("ui.backToStages")}
        </button>
        <span>
          {t("ui.problem")} {index + 1} {t("ui.of")} {problems.length}
        </span>
        <button type="button" onClick={() => setIntro("teori")} aria-label={t("ui.exempel")} className="ml-auto w-7 h-7 rounded-full bg-slate-200 text-slate-600 font-bold">
          {t("ui.replayTeori")}
        </button>
      </div>

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
            <button
              type="button"
              className="px-4 h-10 rounded-lg bg-slate-200 text-slate-700 font-bold"
              onClick={() => setDemotionPrompt(false)}
            >
              {t("ui.suggestDemoteNo")}
            </button>
          </div>
        </div>
      )}

      {problem.kind === "placeValue" ? (
        <PlaceValuePlayer key={index} problem={problem} inputMode={inputMode} onSolved={handlePlaceValueSolved} />
      ) : problem.kind === "statistics" ? (
        <StatisticsPlayer key={index} problem={problem} inputMode={inputMode} onSolved={handleStatisticsSolved} />
      ) : problem.kind === "shortDiv" ? (
        // shortDiv has its own board layout (kort division), not yet wired into a
        // player component - not reachable yet since no StageMeta uses it (see stages.ts).
        null
      ) : (
        <ColumnProblemPlayer
          key={index}
          problem={problem}
          phase={currentMethod ? progress[currentMethod].phase : "fritt"}
          inputMode={inputMode}
          onSolved={handleColumnSolved}
        />
      )}
    </div>
  );
}
