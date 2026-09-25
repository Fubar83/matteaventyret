/**
 * One versioned save object under a single localStorage key, written after
 * every completed round. Reads are wrapped in try/catch: a corrupt or
 * missing save starts fresh rather than crashing (see build brief "Local
 * storage").
 */
import type { StageId } from "../engine/generator";
import { INITIAL_STREAK_STATE, type StreakState } from "../engine/scoring";
import type { MethodId } from "../engine/types";
import { INITIAL_METHOD_PROGRESS, type MethodProgress } from "../game/phaseProgress";

type PlayableMethod = Extract<MethodId, "columnAdd" | "columnSub" | "columnMul">;

export interface Settings {
  muted: boolean;
  musicVolume: number;
  effectsVolume: number;
  locale: "sv" | "en";
  reducedMotion: boolean;
  highContrast: boolean;
  dyslexiaFont: boolean;
  inputMode: "numpad" | "handwriting";
}

export interface SaveDataV1 {
  version: 1;
  stageStars: Partial<Record<StageId, 1 | 2 | 3>>;
  methodProgress: Record<PlayableMethod, MethodProgress>;
  totalXp: number;
  streak: StreakState;
  avatarsUnlocked: string[];
  selectedAvatar: string;
  bossDefeated: boolean;
  blixtrundaBestScore: number;
  settings: Settings;
  /** Teori topics (see game/teoriContent.ts) already shown once; Teori/Exempel can always be replayed via the "?" button regardless. */
  seenTeori: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  muted: false,
  musicVolume: 0.6,
  effectsVolume: 0.8,
  locale: "sv",
  reducedMotion: false,
  highContrast: false,
  dyslexiaFont: false,
  inputMode: "handwriting",
};

export function createDefaultSave(): SaveDataV1 {
  return {
    version: 1,
    stageStars: {},
    methodProgress: {
      columnAdd: INITIAL_METHOD_PROGRESS,
      columnSub: INITIAL_METHOD_PROGRESS,
      columnMul: INITIAL_METHOD_PROGRESS,
    },
    totalXp: 0,
    streak: INITIAL_STREAK_STATE,
    avatarsUnlocked: ["rav", "igelkott"],
    selectedAvatar: "rav",
    bossDefeated: false,
    blixtrundaBestScore: 0,
    settings: { ...DEFAULT_SETTINGS },
    seenTeori: [],
  };
}

const STORAGE_KEY = "matteaventyret-save";

function isSaveDataV1(value: unknown): value is SaveDataV1 {
  return !!value && typeof value === "object" && (value as { version?: unknown }).version === 1;
}

export function loadSave(): SaveDataV1 {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultSave();
    const parsed: unknown = JSON.parse(raw);
    if (!isSaveDataV1(parsed)) return createDefaultSave();
    // Merge onto defaults so a save from an older build with missing fields
    // (e.g. a new setting, or a new method added to methodProgress) still
    // loads instead of crashing the app. methodProgress is merged per-key,
    // not just shallow-spread, so an old save missing e.g. columnMul still
    // gets that method's default progress instead of leaving it undefined.
    const defaults = createDefaultSave();
    return {
      ...defaults,
      ...parsed,
      methodProgress: { ...defaults.methodProgress, ...parsed.methodProgress },
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch {
    return createDefaultSave();
  }
}

export function writeSave(data: SaveDataV1): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable (e.g. private browsing) - progress for
    // this session continues in memory, just isn't persisted.
  }
}

export function bestStageStars(save: SaveDataV1, stageId: StageId): 0 | 1 | 2 | 3 {
  return save.stageStars[stageId] ?? 0;
}

export function totalStars(save: SaveDataV1): number {
  return Object.values(save.stageStars).reduce((sum: number, s) => sum + (s ?? 0), 0);
}
