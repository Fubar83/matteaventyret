import type { StageId } from "../engine/generator";
import { t } from "../i18n";
import { levelName, ProgressBar } from "./PathScreen";
import { stageById } from "./stages";
import { pathProgress, pathsWith, TRAINING_PATHS, type TrainingPath } from "./trainingPaths";
import { isBlixtrundaUnlocked, isBossUnlocked } from "./unlocks";

type StageStars = Partial<Record<StageId, 1 | 2 | 3>>;

function PathCard({ path, stageStars, onOpen }: { path: TrainingPath; stageStars: StageStars; onOpen: () => void }) {
  const p = pathProgress(path, stageStars);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-2xl bg-white border-2 border-slate-200 p-3 text-left shadow-sm hover:border-sky-300 flex flex-col gap-2"
      style={{ borderLeftColor: path.color, borderLeftWidth: 6 }}
    >
      <span className="font-bold text-slate-800">{t(path.nameKey)}</span>
      <span className="text-xs text-slate-500">{t("paths.levelsDone", { ready: p.ready, total: p.total })}</span>
      <ProgressBar {...p} color={path.color} />
    </button>
  );
}

/**
 * The start: training paths instead of a map. What to do next, the speed
 * round and the boss, then the paths - one per national test, one per area.
 * The same level is on a test path and an area path, with the same stars.
 */
export function HomeScreen({
  stageStars,
  recommended,
  onOpenPath,
  onPlay,
  onBlixtrunda,
  onBoss,
  forceUnlock,
}: {
  stageStars: StageStars;
  recommended: StageId | null;
  onOpenPath: (pathId: string) => void;
  onPlay: (stageId: StageId) => void;
  onBlixtrunda: () => void;
  onBoss: () => void;
  forceUnlock?: boolean;
}) {
  const next = recommended ? stageById(recommended) : undefined;
  const blixtOpen = forceUnlock || isBlixtrundaUnlocked(stageStars);
  const bossOpen = forceUnlock || isBossUnlocked(stageStars);
  const groups: { group: TrainingPath["group"]; titleKey: string }[] = [
    { group: "exam", titleKey: "paths.exams" },
    { group: "topic", titleKey: "paths.topics" },
  ];
  return (
    <div className="max-w-2xl mx-auto p-4 flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">{t("paths.title")}</h1>
        <p className="text-sm text-slate-500">{t("paths.subtitle")}</p>
      </div>
      {next && (
        <button type="button" onClick={() => onPlay(next.id)} className="rounded-2xl bg-sky-600 text-white p-4 text-left shadow">
          <div className="text-sm opacity-80">{t("paths.next")}</div>
          <div className="text-xl font-bold">{levelName(next)} →</div>
          <div className="text-xs opacity-80 mt-1">{pathsWith(next.id).map((p) => t(p.nameKey)).join(" · ")}</div>
        </button>
      )}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" disabled={!blixtOpen} onClick={onBlixtrunda} className="h-14 rounded-2xl bg-indigo-900 text-white font-bold disabled:opacity-40">
          {blixtOpen ? "⚡" : "🔒"} {t("paths.blixtrunda")}
        </button>
        <button type="button" disabled={!bossOpen} onClick={onBoss} className="h-14 rounded-2xl bg-indigo-900 text-white font-bold disabled:opacity-40">
          {bossOpen ? "👾" : "🔒"} {t("paths.boss")}
        </button>
      </div>
      {groups.map((g) => (
        <section key={g.group} className="flex flex-col gap-2">
          <h2 className="font-bold text-slate-700">{t(g.titleKey)}</h2>
          <div className="grid grid-cols-2 gap-3">
            {TRAINING_PATHS.filter((p) => p.group === g.group).map((p) => (
              <PathCard key={p.id} path={p} stageStars={stageStars} onOpen={() => onOpenPath(p.id)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
