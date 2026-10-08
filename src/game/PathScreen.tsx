import type { StageId } from "../engine/generator";
import { t } from "../i18n";
import { PATHS, stageById, type GradeBand, type StageMeta } from "./stages";
import { nextOnPath, pathProgress, READY_STARS, type TrainingPath } from "./trainingPaths";
import { isStageUnlocked, missingRequirements } from "./unlocks";

type StageStars = Partial<Record<StageId, 1 | 2 | 3>>;

export const levelName = (s: StageMeta) => t(s.titleKey).replace(/^\d+\.\s*/, "");

export function ProgressBar({ ready, total, color = "#10b981" }: { ready: number; total: number; color?: string }) {
  return (
    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${total ? (100 * ready) / total : 0}%`, background: color }} />
    </div>
  );
}

function StarRow({ n }: { n: number }) {
  return (
    <span className="text-amber-500 tracking-tighter" aria-label={t("paths.stars", { n })}>
      {"★".repeat(n)}
      <span className="text-slate-300">{"★".repeat(3 - n)}</span>
    </span>
  );
}

/** A test path is shown by area, an area path by school year - two ways of grouping the same levels. */
function sectionsOf(path: TrainingPath): { key: string; label: string; color?: string; stages: StageMeta[] }[] {
  const stages = path.stages.map((id) => stageById(id)!);
  if (path.group === "exam") {
    return PATHS.map((p) => ({ key: p.id, label: t(p.nameKey), color: p.color, stages: stages.filter((s) => s.path === p.id) })).filter((x) => x.stages.length > 0);
  }
  const grades: GradeBand[] = ["ak1-3", "ak4-6", "ak7-9", "gy"];
  return grades.map((g) => ({ key: g, label: t(`grade.${g}`), stages: stages.filter((s) => s.grade === g) })).filter((x) => x.stages.length > 0);
}

/**
 * One training path: how far along it is, the level to train next, and every
 * level on it with its stars. A level that isn't open yet says what it builds
 * on - and can still be taken on as a challenge, which opens it.
 */
export function PathScreen({
  path,
  stageStars,
  onPlay,
  onBack,
  forceUnlock,
}: {
  path: TrainingPath;
  stageStars: StageStars;
  onPlay: (stageId: StageId) => void;
  onBack: () => void;
  forceUnlock?: boolean;
}) {
  const progress = pathProgress(path, stageStars);
  const nextId = nextOnPath(path, stageStars);
  const next = nextId ? stageById(nextId) : undefined;
  const offPath = next !== undefined && !path.stages.includes(next.id);
  return (
    <div className="max-w-xl mx-auto p-4 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="px-3 h-10 rounded-xl bg-slate-200 text-slate-700 font-semibold shrink-0">
          ← {t("paths.home")}
        </button>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded-full" style={{ background: path.color }} />
          {t(path.nameKey)}
        </h1>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">{t("paths.levelsDone", { ready: progress.ready, total: progress.total })}</span>
        <ProgressBar {...progress} color={path.color} />
      </div>
      {next && (
        <button type="button" onClick={() => onPlay(next.id)} className="rounded-2xl bg-sky-600 text-white p-4 text-left shadow">
          <div className="text-sm opacity-80">{progress.ready === progress.total ? t("paths.polish") : offPath ? t("paths.groundwork") : t("paths.next")}</div>
          <div className="text-xl font-bold">{levelName(next)} →</div>
        </button>
      )}
      <p className="text-sm text-slate-500">{t("paths.howReady")}</p>
      {sectionsOf(path).map((section) => (
        <section key={section.key} className="flex flex-col gap-1">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            {section.color && <span className="inline-block w-3 h-3 rounded-full" style={{ background: section.color }} />}
            {section.label}
          </h2>
          {section.stages.map((s) => {
            const got = stageStars[s.id] ?? 0;
            const open = forceUnlock || isStageUnlocked(s.id, stageStars);
            const first = open ? [] : missingRequirements(s.id, stageStars).map((id) => stageById(id)).filter((x): x is StageMeta => !!x);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onPlay(s.id)}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left ${got >= READY_STARS ? "bg-emerald-50 border-emerald-200" : open ? "bg-white border-slate-200 hover:border-sky-300" : "bg-slate-50 border-slate-200 text-slate-500"}`}
              >
                <span className="flex-1">
                  <span className={open ? "text-slate-800" : ""}>{levelName(s)}</span>
                  {first.length > 0 && <span className="block text-xs text-slate-500">{t("paths.first", { levels: first.map(levelName).join(", ") })}</span>}
                </span>
                {nextId === s.id && <span className="text-xs font-semibold text-sky-700">{t("paths.nextShort")}</span>}
                <StarRow n={got} />
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}
