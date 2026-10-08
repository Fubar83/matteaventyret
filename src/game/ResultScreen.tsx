import { lazy, Suspense, useEffect } from "react";
import { playEffect } from "../audio/sound";
import { playerLevel, type Stars } from "../engine/scoring";
import { t } from "../i18n";

// PixiJS is a large dependency, only needed for the 3-star celebration.
const Confetti = lazy(() => import("../fx/Confetti").then((m) => ({ default: m.Confetti })));

const XP_PER_LEVEL = 200;

interface ResultScreenProps {
  stars: Stars;
  /** Each question's stars, in order. */
  questionStars: readonly Stars[];
  xp: number;
  /** XP before this round - the bar fills from there. */
  totalXpBefore: number;
  onPlayAgain: () => void;
  onBack: () => void;
  /** Where onBack goes: the training path, or the start screen. */
  backLabel: string;
}

/** The round's stars one by one, every question's own, and the XP bar filling - with a level-up when it's crossed. */
export function ResultScreen({ stars, questionStars, xp, totalXpBefore, onPlayAgain, onBack, backLabel }: ResultScreenProps) {
  const before = totalXpBefore;
  const after = totalXpBefore + xp;
  const levelUp = playerLevel(after) > playerLevel(before);
  const from = levelUp ? 0 : ((before % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;
  const to = ((after % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;

  useEffect(() => {
    const timers = [1, 2, 3].filter((n) => n <= stars).map((n) => setTimeout(() => playEffect("star"), 300 + n * 350));
    if (levelUp) timers.push(setTimeout(() => playEffect("levelUp"), 1900));
    return () => timers.forEach(clearTimeout);
  }, [stars, levelUp]);

  return (
    <div className="flex flex-col items-center gap-6 py-10 px-4">
      {stars === 3 && (
        <Suspense fallback={null}>
          <Confetti />
        </Suspense>
      )}
      <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-slate-900 to-indigo-950 text-white p-6 shadow-xl flex flex-col items-center gap-5">
        <h2 className="text-2xl font-bold">{t("ui.roundDone")}</h2>
        <div className="flex gap-3 text-6xl">
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= stars ? "anim-star-pop text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]" : "text-slate-700"} style={{ animationDelay: `${300 + n * 350}ms` }}>
              ★
            </span>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          {questionStars.map((s, i) => (
            <span key={i} className="rounded-full bg-slate-800 px-2 py-0.5 text-amber-300" title={t(`stars.q${s}`)}>
              {"★".repeat(s)}
              <span className="text-slate-600">{"★".repeat(3 - s)}</span>
            </span>
          ))}
        </div>
        <div className="w-full flex flex-col gap-1">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">{t("result.level", { n: playerLevel(after) })}</span>
            <span className="text-amber-300 font-bold">+{xp} XP</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
            <div className="anim-fill-bar h-full rounded-full bg-gradient-to-r from-amber-400 to-pink-400" style={{ ["--from" as string]: `${from}%`, ["--to" as string]: `${to}%`, width: `${to}%` }} />
          </div>
          {levelUp && (
            <div className="anim-star-pop mt-2 self-center rounded-full bg-amber-400 text-slate-900 font-extrabold px-4 py-1" style={{ animationDelay: "1.9s" }}>
              {t("result.levelUp")}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onPlayAgain} className="h-12 px-6 rounded-xl bg-sky-500 text-white font-bold shadow">
          {t("ui.playAgain")}
        </button>
        <button type="button" onClick={onBack} className="h-12 px-6 rounded-xl bg-slate-200 text-slate-700 font-bold">
          {backLabel}
        </button>
      </div>
    </div>
  );
}
