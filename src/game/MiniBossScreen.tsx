import { lazy, Suspense, useRef, useState } from "react";
import { playEffect } from "../audio/sound";
import { generateProblem, type GeneratedProblem, type StageId } from "../engine/generator";
import { makeRng } from "../engine/rng";
import type { MethodId } from "../engine/types";
import { BOSS_MAX_HP, pickBossStage } from "./boss";
import { BossMonster } from "./BossMonster";
import type { ColumnProblemSummary } from "./ColumnProblemPlayer";
import { ColumnProblemPlayer } from "./ColumnProblemPlayer";
import type { MethodProgress } from "./phaseProgress";

const Confetti = lazy(() => import("../fx/Confetti").then((m) => ({ default: m.Confetti })));

type PlayableMethod = Extract<MethodId, "columnAdd" | "columnSub">;
type ColumnProblem = Extract<GeneratedProblem, { kind: "columnAdd" } | { kind: "columnSub" }>;

interface MiniBossScreenProps {
  stageStars: Partial<Record<StageId, 1 | 2 | 3>>;
  methodProgress: Record<PlayableMethod, MethodProgress>;
  onDefeated: () => void;
  onExit: () => void;
}

export function MiniBossScreen({ stageStars, methodProgress, onDefeated, onExit }: MiniBossScreenProps) {
  const rngRef = useRef(makeRng(Date.now()));
  const [hp, setHp] = useState(BOSS_MAX_HP);
  const [hit, setHit] = useState(false);
  const [defeated, setDefeated] = useState(false);
  const [problem, setProblem] = useState<ColumnProblem>(() => nextProblem(rngRef.current, stageStars));

  function handleSolved(_summary: ColumnProblemSummary) {
    const newHp = hp - 1;
    setHit(true);
    setTimeout(() => setHit(false), 400);
    if (newHp <= 0) {
      setHp(0);
      setDefeated(true);
      playEffect("bossDefeat");
      onDefeated();
      return;
    }
    playEffect("bossHit");
    setHp(newHp);
    setProblem(nextProblem(rngRef.current, stageStars));
  }

  if (defeated) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <Suspense fallback={null}>
          <Confetti />
        </Suspense>
        <h2 className="text-2xl font-bold text-slate-800">Du besegrade Siffer-Slukaren!</h2>
        <BossMonster hp={0} maxHp={BOSS_MAX_HP} />
        <p className="text-slate-600">+100 XP och en ny kompis att låsa upp!</p>
        <button type="button" onClick={onExit} className="h-12 px-6 rounded-xl bg-sky-500 text-white font-bold shadow">
          Tillbaka
        </button>
      </div>
    );
  }

  const phase = methodProgress[problem.kind].phase;

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4">
      <button type="button" onClick={onExit} className="self-start text-sm text-slate-500 underline">
        Tillbaka
      </button>
      <h2 className="text-xl font-bold text-slate-800">Siffer-Slukaren</h2>
      <BossMonster hp={hp} maxHp={BOSS_MAX_HP} hit={hit} />
      <ColumnProblemPlayer key={`${problem.top}-${problem.bottom}-${hp}`} problem={problem} phase={phase} onSolved={handleSolved} />
    </div>
  );
}

function nextProblem(rng: ReturnType<typeof makeRng>, stageStars: Partial<Record<StageId, 1 | 2 | 3>>): ColumnProblem {
  const stageId = pickBossStage(rng, stageStars);
  const p = generateProblem(stageId, rng);
  // BOSS_STAGES never includes 1.1.1, so this is always a column problem.
  return p as ColumnProblem;
}
