import type { StageId } from "../engine/generator";
import { t } from "../i18n";
import { isBlixtrundaUnlocked, isBossUnlocked, isStageUnlocked } from "./unlocks";
import { STAGES } from "./stages";

type StageStars = Partial<Record<StageId, 1 | 2 | 3>>;

interface StageSelectProps {
  stageStars: StageStars;
  onSelect: (stageId: string) => void;
  onBlixtrunda: () => void;
  onBoss: () => void;
  /** ?test in the URL: unlocks every stage/speed-test/boss regardless of stars, for QA/demo purposes. */
  forceUnlock?: boolean;
}

function Stars({ count }: { count: number }) {
  return (
    <span className="text-amber-400 text-sm">
      {"★".repeat(count)}
      <span className="text-slate-200">{"★".repeat(3 - count)}</span>
    </span>
  );
}

export function StageSelect({ stageStars, onSelect, onBlixtrunda, onBoss, forceUnlock }: StageSelectProps) {
  const blixtrundaOpen = forceUnlock || isBlixtrundaUnlocked(stageStars);
  const bossOpen = forceUnlock || isBossUnlocked(stageStars);

  return (
    <div className="flex flex-col items-center gap-4 py-10 px-4">
      <h1 className="text-2xl font-bold text-slate-800">{t("ui.chooseStage")}</h1>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {STAGES.map((s) => {
          const unlocked = forceUnlock || isStageUnlocked(s.id, stageStars);
          const stars = stageStars[s.id] ?? 0;
          return (
            <button
              key={s.id}
              type="button"
              disabled={!unlocked}
              onClick={() => onSelect(s.id)}
              className={`h-16 rounded-xl border-2 shadow text-left px-5 font-semibold flex items-center justify-between ${
                unlocked ? "bg-white border-slate-200 text-slate-700 active:translate-y-0.5" : "bg-slate-100 border-slate-100 text-slate-400"
              }`}
            >
              <span>{t(s.titleKey)}</span>
              {unlocked ? <Stars count={stars} /> : <span aria-hidden>🔒</span>}
            </button>
          );
        })}

        <button
          type="button"
          disabled={!blixtrundaOpen}
          onClick={onBlixtrunda}
          className={`h-16 rounded-xl border-2 shadow text-left px-5 font-semibold flex items-center justify-between ${
            blixtrundaOpen ? "bg-sky-50 border-sky-200 text-sky-800" : "bg-slate-100 border-slate-100 text-slate-400"
          }`}
        >
          <span>⚡ {t("ui.blixtrunda")}</span>
          {!blixtrundaOpen && <span aria-hidden>🔒</span>}
        </button>

        <button
          type="button"
          disabled={!bossOpen}
          onClick={onBoss}
          className={`h-16 rounded-xl border-2 shadow text-left px-5 font-semibold flex items-center justify-between ${
            bossOpen ? "bg-purple-50 border-purple-200 text-purple-800" : "bg-slate-100 border-slate-100 text-slate-400"
          }`}
        >
          <span>👾 {t("ui.boss")}</span>
          {!bossOpen && <span aria-hidden>🔒</span>}
        </button>
      </div>
    </div>
  );
}
