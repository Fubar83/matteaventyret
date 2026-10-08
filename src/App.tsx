import { useEffect, useMemo, useRef, useState } from "react";
import { playWorldMusic, setMuted, setVolumes, unlockAudio } from "./audio/sound";
import { playerLevel, recordRoundCompleted, type Stars } from "./engine/scoring";
import { setLocale, t } from "./i18n";
import { AvatarPicker } from "./game/AvatarPicker";
import { Avatar } from "./game/Avatar";
import { BlixtrundaScreen } from "./game/BlixtrundaScreen";
import { MiniBossScreen } from "./game/MiniBossScreen";
import { RoundScreen } from "./game/RoundScreen";
import { SettingsScreen } from "./game/SettingsScreen";
import { SkrivskolanScreen } from "./game/SkrivskolanScreen";
import { HomeScreen } from "./game/HomeScreen";
import { PathScreen } from "./game/PathScreen";
import { STAGES } from "./game/stages";
import { trainingPathById } from "./game/trainingPaths";
import { recommendNext } from "./game/unlocks";
import { topicForStage } from "./game/teoriContent";
import { bestStageStars, loadSave, totalStars, writeSave, type SaveDataV1 } from "./storage/save";

type Screen = "stages" | "round" | "blixtrunda" | "boss" | "avatars" | "settings" | "skrivskolan";

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function App() {
  const [save, setSave] = useState<SaveDataV1>(() => loadSave());
  const [screen, setScreen] = useState<Screen>("stages");
  const [stageId, setStageId] = useState<string | null>(null);
  // The training path open on the start screen (none: the list of paths) - a round goes back to it.
  const [pathId, setPathId] = useState<string | null>(null);
  const path = pathId ? trainingPathById(pathId) : undefined;

  function update(fn: (s: SaveDataV1) => SaveDataV1) {
    setSave((prev) => {
      const next = fn(prev);
      writeSave(next);
      return next;
    });
  }

  const stage = STAGES.find((s) => s.id === stageId) ?? null;

  function play(id: string) {
    setStageId(id);
    setScreen("round");
  }

  // The result screen plays the stars and any level-up itself (ResultScreen.tsx).
  function handleRoundComplete(stars: Stars, xp: number) {
    if (!stage) return;
    update((s) => {
      const currentBest = bestStageStars(s, stage.id);
      const nextStageStars = { ...s.stageStars, [stage.id]: Math.max(currentBest, stars) as 1 | 2 | 3 };
      const nextTotalXp = s.totalXp + xp;
      const nextStreak = recordRoundCompleted(s.streak, todayISO());
      const nextTotalStars = Object.values(nextStageStars).reduce((sum: number, v) => sum + (v ?? 0), 0);
      const avatarsUnlocked = new Set(s.avatarsUnlocked);
      // Cosmetic unlock checks are cheap and idempotent; see game/avatars.ts for thresholds.
      if (nextTotalStars >= 5) avatarsUnlocked.add("uggla");
      if (nextTotalStars >= 10) avatarsUnlocked.add("ekorre");
      if (nextTotalStars >= 15) avatarsUnlocked.add("grodan");
      return {
        ...s,
        stageStars: nextStageStars,
        stageLastPlayed: { ...s.stageLastPlayed, [stage.id]: todayISO() },
        totalXp: nextTotalXp,
        streak: nextStreak,
        avatarsUnlocked: Array.from(avatarsUnlocked),
      };
    });
  }

  const level = playerLevel(save.totalXp);
  const audioReady = useRef(false);
  // ?test in the URL unlocks every stage, speed test, boss and avatar - a
  // shortcut for QA/demos, never touches the real save data.
  const testMode = useMemo(() => new URLSearchParams(window.location.search).has("test"), []);

  useEffect(() => {
    setLocale(save.settings.locale);
    const root = document.documentElement;
    root.dataset.reducedMotion = String(save.settings.reducedMotion);
    root.dataset.highContrast = String(save.settings.highContrast);
    root.dataset.dyslexiaFont = String(save.settings.dyslexiaFont);
    setMuted(save.settings.muted);
    setVolumes(save.settings.effectsVolume, save.settings.musicVolume);
  }, [save.settings]);

  useEffect(() => {
    function unlockOnce() {
      if (audioReady.current) return;
      audioReady.current = true;
      unlockAudio().then(playWorldMusic);
      window.removeEventListener("pointerdown", unlockOnce);
    }
    window.addEventListener("pointerdown", unlockOnce);
    return () => window.removeEventListener("pointerdown", unlockOnce);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 text-sm text-slate-600">
        <button type="button" onClick={() => setScreen("avatars")} className="flex items-center gap-2">
          <Avatar id={save.selectedAvatar} size={32} />
          <span>
            {t("ui.level")} {level}
          </span>
        </button>
        <span>
          🔥 {save.streak.current} {t("ui.streakDays")}
        </span>
        <span>
          {totalStars(save)} ⭐ {t("ui.totalStarsSuffix")}
        </span>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setScreen("skrivskolan")} aria-label={t("skriv.open")} title={t("skriv.open")} className="text-lg">
            ✍️
          </button>
          <button type="button" onClick={() => setScreen("settings")} aria-label={t("ui.settings")} className="text-lg">
            ⚙️
          </button>
        </div>
      </header>

      {screen === "settings" && (
        <SettingsScreen
          settings={save.settings}
          onChange={(next) => update((s) => ({ ...s, settings: next }))}
          onClose={() => setScreen("stages")}
        />
      )}

      {screen === "skrivskolan" && <SkrivskolanScreen onClose={() => setScreen("stages")} />}

      {screen === "avatars" && (
        <AvatarPicker
          totalStars={totalStars(save)}
          bossDefeated={save.bossDefeated}
          selected={save.selectedAvatar}
          onSelect={(id) => update((s) => ({ ...s, selectedAvatar: id }))}
          onClose={() => setScreen("stages")}
          forceUnlock={testMode}
        />
      )}

      {screen === "stages" && path && (
        <PathScreen path={path} stageStars={save.stageStars} onPlay={play} onBack={() => setPathId(null)} forceUnlock={testMode} />
      )}

      {screen === "stages" && !path && (
        <HomeScreen
          stageStars={save.stageStars}
          recommended={recommendNext(save.stageStars, save.stageLastPlayed, todayISO())}
          onOpenPath={setPathId}
          onPlay={play}
          onBlixtrunda={() => setScreen("blixtrunda")}
          onBoss={() => setScreen("boss")}
          forceUnlock={testMode}
        />
      )}

      {screen === "round" && stage && (
        <RoundScreen
          stage={stage}
          progress={save.methodProgress}
          onProgressChange={(method, next) => update((s) => ({ ...s, methodProgress: { ...s.methodProgress, [method]: next } }))}
          onRoundComplete={handleRoundComplete}
          totalXp={save.totalXp}
          seenTeori={save.seenTeori.includes(topicForStage(stage.id))}
          onTeoriSeen={() =>
            update((s) => ({ ...s, seenTeori: Array.from(new Set([...s.seenTeori, topicForStage(stage.id)])) }))
          }
          onExit={() => setScreen("stages")}
          exitLabel={path ? t(path.nameKey) : t("paths.home")}
        />
      )}

      {screen === "blixtrunda" && (
        <BlixtrundaScreen
          bestScore={save.blixtrundaBestScore}
          onFinish={(correctCount) =>
            update((s) => ({ ...s, blixtrundaBestScore: Math.max(s.blixtrundaBestScore, correctCount) }))
          }
          onExit={() => setScreen("stages")}
        />
      )}

      {screen === "boss" && (
        <MiniBossScreen
          stageStars={save.stageStars}
          methodProgress={save.methodProgress}
          onDefeated={() =>
            update((s) => ({
              ...s,
              bossDefeated: true,
              totalXp: s.totalXp + 100,
              avatarsUnlocked: Array.from(new Set([...s.avatarsUnlocked, "bjorn"])),
            }))
          }
          onExit={() => setScreen("stages")}
        />
      )}
    </div>
  );
}

export default App;
