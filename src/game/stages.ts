import type { StageId } from "../engine/generator";
import type { WritingLevel } from "../recognition/levels";

/** The areas - each runs up through the grades, and each is a training path of its own (see trainingPaths.ts). */
export type PathId = "tal" | "plusminus" | "ganger" | "decimal" | "statistik" | "algebra" | "geometri" | "analys" | "vardag" | "problem";

export const PATHS: readonly { id: PathId; nameKey: string; color: string }[] = [
  { id: "tal", nameKey: "path.tal", color: "#fbbf24" },
  { id: "plusminus", nameKey: "path.plusminus", color: "#38bdf8" },
  { id: "ganger", nameKey: "path.ganger", color: "#f472b6" },
  { id: "decimal", nameKey: "path.decimal", color: "#34d399" },
  { id: "statistik", nameKey: "path.statistik", color: "#a78bfa" },
  { id: "algebra", nameKey: "path.algebra", color: "#fb923c" },
  { id: "geometri", nameKey: "path.geometri", color: "#2dd4bf" },
  { id: "analys", nameKey: "path.analys", color: "#f87171" },
  { id: "vardag", nameKey: "path.vardag", color: "#e879f9" },
  { id: "problem", nameKey: "path.problem", color: "#fde68a" },
];

/** School stages, youngest first. */
export type GradeBand = "ak1-3" | "ak4-6" | "ak7-9" | "gy";

/**
 * A level as the game shows it: where it sits (its path, grade and what opens
 * it), how long a round is, and how its handwriting is read. What it asks -
 * its type of question and how its questions are made - is the engine's
 * (engine/generator.ts's questionTypeOf).
 */
export interface StageMeta {
  id: StageId;
  /** i18n key, resolved with t() at render time (see i18n/sv.json, en.json). */
  titleKey: string;
  problemsPerRound: number;
  path: PathId;
  /** Stages that open this one: each needs at least one star. Any stage can still be taken on as a challenge (see unlocks.ts). */
  requires: StageId[];
  grade: GradeBand;
  /** What the handwriting is read as (recognition/levels.ts). */
  writingLevel: WritingLevel;
}

const s = (
  id: StageId,
  problemsPerRound: number,
  path: PathId,
  requires: StageId[],
  grade: GradeBand
): StageMeta => ({
  id,
  titleKey: `stage.${id}`,
  problemsPerRound,
  path,
  requires,
  grade,
  writingLevel: grade === "ak1-3" ? 1 : grade === "ak4-6" ? 2 : grade === "ak7-9" ? 3 : 4,
});

/**
 * Every stage, in curriculum order (which is also the order a recommendation
 * breaks ties in). Paths branch: after Positionssystemet both addition and
 * subtraction open, and so do the diagrams; multiplication opens after the
 * first carry, and so on up to gymnasiet. (2.2's kort division is
 * engine-complete but has no player yet.)
 */
export const STAGES: StageMeta[] = [
  // Åk 1-3
  s("1.1.1", 6, "tal", [], "ak1-3"),
  s("1.1.2", 6, "plusminus", ["1.1.1"], "ak1-3"),
  s("1.1.3", 6, "plusminus", ["1.1.1"], "ak1-3"),
  s("1.1.4", 8, "plusminus", ["1.1.2"], "ak1-3"),
  s("1.1.5", 8, "plusminus", ["1.1.3"], "ak1-3"),
  s("1.1.6", 8, "plusminus", ["1.1.4", "1.1.5"], "ak1-3"),
  s("1.1.7", 8, "plusminus", ["1.1.5"], "ak1-3"),
  s("2.8.1", 6, "statistik", ["1.1.1"], "ak1-3"),
  s("1.2.1", 6, "geometri", ["1.1.2"], "ak1-3"),
  // Åk 4-6
  s("2.1.1", 6, "ganger", ["1.1.4"], "ak4-6"),
  s("2.1.2", 8, "ganger", ["2.1.1"], "ak4-6"),
  s("2.1.3", 8, "ganger", ["2.1.2"], "ak4-6"),
  s("2.1.4", 5, "ganger", ["2.1.3"], "ak4-6"),
  s("2.1.5", 5, "ganger", ["2.1.3"], "ak4-6"),
  s("2.1.6", 5, "ganger", ["2.1.5"], "ak4-6"),
  // Division with trappan: from 2-digit ÷ 1-digit down to decimal ÷ decimal, rounded.
  s("2.5.1", 5, "ganger", ["2.1.1"], "ak4-6"),
  s("2.5.2", 5, "ganger", ["2.5.1"], "ak4-6"),
  s("2.5.8", 5, "ganger", ["2.5.2"], "ak4-6"),
  s("2.5.3", 5, "ganger", ["2.5.2"], "ak4-6"),
  s("2.5.4", 5, "ganger", ["2.5.3"], "ak4-6"),
  s("2.5.5", 5, "ganger", ["2.5.4"], "ak4-6"),
  s("2.5.6", 4, "ganger", ["2.5.5"], "ak7-9"),
  s("2.5.7", 4, "ganger", ["2.5.6"], "ak7-9"),
  s("2.3.3", 8, "decimal", ["1.1.6"], "ak4-6"),
  s("2.3.4", 8, "decimal", ["2.3.3"], "ak4-6"),
  s("2.8.2", 6, "statistik", ["2.8.1", "1.1.3"], "ak4-6"),
  s("2.8.3", 6, "statistik", ["2.8.1", "1.1.2"], "ak4-6"),
  s("2.7.2", 6, "statistik", ["2.8.1"], "ak4-6"),
  s("2.7.3", 6, "statistik", ["2.8.1"], "ak4-6"),
  s("2.7.1", 6, "statistik", ["2.8.3", "2.1.1"], "ak4-6"),
  // Geometry, from one shape at a time to shapes put together.
  s("2.4.1", 6, "geometri", ["1.2.1", "2.1.1"], "ak4-6"),
  s("2.4.2", 6, "geometri", ["2.4.1"], "ak4-6"),
  s("2.4.3", 6, "geometri", ["2.4.2"], "ak4-6"),
  s("2.4.4", 6, "geometri", ["2.4.2"], "ak4-6"),
  // Åk 7-9
  s("3.1.1", 6, "tal", ["1.1.7"], "ak7-9"),
  s("3.1.2", 6, "tal", ["2.1.2"], "ak7-9"),
  s("3.1.3", 6, "tal", ["3.1.2", "2.3.4"], "ak7-9"),
  s("3.2.1", 6, "decimal", ["2.3.4", "2.1.2"], "ak7-9"),
  s("3.2.2", 6, "decimal", ["3.2.1"], "ak7-9"),
  s("3.3.1", 6, "algebra", ["3.1.1"], "ak7-9"),
  s("3.3.2", 6, "algebra", ["3.3.1"], "ak7-9"),
  s("3.3.3", 6, "algebra", ["3.3.2"], "ak7-9"),
  s("3.3.4", 6, "algebra", ["3.3.1", "3.1.2"], "ak7-9"),
  s("3.3.5", 6, "algebra", ["3.3.4"], "ak7-9"),
  s("3.3.6", 6, "algebra", ["3.3.3", "3.3.4"], "ak7-9"),
  s("3.4.1", 6, "geometri", ["3.1.2"], "ak7-9"),
  s("3.4.2", 6, "geometri", ["3.3.2"], "ak7-9"),
  s("3.4.3", 6, "geometri", ["2.4.1", "2.3.4"], "ak7-9"),
  s("3.4.4", 6, "geometri", ["2.4.3"], "ak7-9"),
  s("3.4.5", 6, "geometri", ["3.4.3", "2.4.4"], "ak7-9"),
  s("3.4.6", 6, "geometri", ["3.4.5", "3.3.2"], "ak7-9"),
  // Gymnasiet
  s("4.1.2", 6, "tal", ["3.1.3"], "gy"),
  s("4.1.1", 6, "algebra", ["3.3.3", "3.4.1"], "gy"),
  s("4.2.1", 6, "geometri", ["3.4.1"], "gy"),
  s("4.2.2", 6, "geometri", ["3.4.5"], "gy"),
  s("4.2.3", 6, "geometri", ["4.2.1", "3.4.4"], "gy"),
  s("4.3.1", 6, "analys", ["3.4.2", "3.1.2"], "gy"),
  s("4.3.2", 6, "analys", ["4.3.1"], "gy"),
  // The national tests' other topics, along the bottom of the sky.
  s("2.6.1", 6, "decimal", ["2.5.5"], "ak4-6"),
  s("2.6.2", 6, "decimal", ["2.6.1"], "ak4-6"),
  s("2.6.3", 6, "decimal", ["2.6.2"], "ak4-6"),
  s("2.6.4", 6, "decimal", ["2.6.3"], "ak4-6"),
  s("2.9.1", 6, "vardag", ["2.4.1"], "ak4-6"),
  s("2.9.2", 6, "vardag", ["2.9.1"], "ak4-6"),
  s("2.9.3", 6, "vardag", ["2.9.1"], "ak4-6"),
  s("2.10.1", 6, "tal", ["2.9.1"], "ak4-6"),
  s("2.10.2", 6, "tal", ["2.10.1"], "ak4-6"),
  s("3.5.1", 6, "decimal", ["2.6.3"], "ak7-9"),
  s("3.6.1", 6, "vardag", ["2.9.3"], "ak7-9"),
  s("3.6.2", 6, "vardag", ["3.6.1"], "ak7-9"),
  s("3.7.1", 6, "statistik", ["2.6.4"], "ak7-9"),
  s("3.7.2", 6, "statistik", ["3.7.1"], "ak7-9"),
  s("3.3.7", 6, "algebra", ["2.10.1"], "ak7-9"),
  s("3.4.7", 6, "geometri", ["2.9.2"], "ak7-9"),
  s("3.4.8", 6, "geometri", ["3.4.7"], "ak7-9"),
  s("4.1.3", 6, "algebra", ["3.3.3"], "gy"),
  // The rest of åk 1-6: tables, the clock, money, shapes; angles, coordinates, equations, primes, estimation.
  s("1.4.1", 8, "ganger", ["1.1.2"], "ak1-3"),
  s("1.4.2", 8, "ganger", ["1.4.1"], "ak1-3"),
  s("1.4.3", 8, "plusminus", ["1.1.3"], "ak1-3"),
  // The clock, a step at a time: reading and setting it mixed in every step.
  s("1.5.1", 6, "vardag", ["1.1.1"], "ak1-3"),
  s("1.5.3", 6, "vardag", ["1.5.1"], "ak1-3"),
  s("1.5.4", 8, "vardag", ["1.5.3"], "ak1-3"),
  s("1.5.5", 8, "vardag", ["1.5.4"], "ak1-3"),
  s("1.5.6", 8, "vardag", ["1.5.5"], "ak1-3"),
  s("1.5.7", 8, "vardag", ["1.5.6"], "ak1-3"),
  s("1.5.2", 6, "vardag", ["1.5.4"], "ak1-3"),
  s("1.6.1", 6, "vardag", ["1.1.2"], "ak1-3"),
  // Affären: pay, give change, shop from a list - and the till with bigger notes.
  s("1.6.2", 6, "vardag", ["1.6.1"], "ak1-3"),
  s("1.6.3", 6, "vardag", ["1.6.2"], "ak1-3"),
  s("1.6.4", 6, "vardag", ["1.6.3"], "ak1-3"),
  s("2.9.6", 6, "vardag", ["1.6.4"], "ak4-6"),
  s("1.2.2", 6, "geometri", ["1.1.1"], "ak1-3"),
  s("2.12.1", 6, "geometri", ["2.4.2"], "ak4-6"),
  s("2.13.1", 6, "algebra", ["1.1.1"], "ak4-6"),
  s("2.14.1", 6, "algebra", ["1.4.3"], "ak4-6"),
  s("2.15.1", 6, "tal", ["2.1.1"], "ak4-6"),
  s("2.10.3", 6, "tal", ["2.1.1"], "ak4-6"),
  s("2.9.4", 6, "vardag", ["2.4.1"], "ak4-6"),
  s("2.9.5", 6, "vardag", ["1.5.2"], "ak4-6"),
  // Textuppgifter, from the first stories to an equation from the words.
  s("1.3.1", 6, "problem", ["1.2.1"], "ak1-3"),
  s("1.3.2", 6, "problem", ["1.3.1"], "ak1-3"),
  s("2.11.1", 6, "problem", ["1.3.2"], "ak4-6"),
  s("2.11.2", 6, "problem", ["2.11.1"], "ak4-6"),
  s("3.8.1", 6, "problem", ["2.11.2"], "ak7-9"),
  s("3.8.2", 6, "problem", ["3.8.1"], "ak7-9"),
];

export function stageById(id: StageId): StageMeta | undefined {
  return STAGES.find((st) => st.id === id);
}

