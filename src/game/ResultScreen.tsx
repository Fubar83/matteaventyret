import { lazy, Suspense } from "react";
import type { Stars } from "../engine/scoring";
import { t } from "../i18n";

// PixiJS is a large dependency, only needed for the 3-star celebration.
const Confetti = lazy(() => import("../fx/Confetti").then((m) => ({ default: m.Confetti })));

interface ResultScreenProps {
  stars: Stars;
  xp: number;
  onPlayAgain: () => void;
  onBack: () => void;
}

export function ResultScreen({ stars, xp, onPlayAgain, onBack }: ResultScreenProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-12">
      {stars === 3 && (
        <Suspense fallback={null}>
          <Confetti />
        </Suspense>
      )}
      <h2 className="text-2xl font-bold text-slate-800">{t("ui.roundDone")}</h2>
      <div className="flex gap-2 text-5xl">
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= stars ? "text-amber-400" : "text-slate-200"}>
            ★
          </span>
        ))}
      </div>
      <p className="text-slate-600">+{xp} XP</p>
      <div className="flex gap-3">
        <button type="button" onClick={onPlayAgain} className="h-12 px-6 rounded-xl bg-sky-500 text-white font-bold shadow">
          {t("ui.playAgain")}
        </button>
        <button type="button" onClick={onBack} className="h-12 px-6 rounded-xl bg-slate-200 text-slate-700 font-bold">
          {t("ui.backToStages")}
        </button>
      </div>
    </div>
  );
}
