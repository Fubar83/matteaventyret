/**
 * Writing levels: which characters a student at a given stage can write, and
 * which model reads them. The youngest get the small, forgiving "basic" model;
 * older students the "full" one, narrowed to their level's characters -
 * whatever isn't on the list can't be the answer, so it never competes for
 * it (the same idea as a game box that only takes digits).
 *
 * Named after grades, not numbered in the UI: the game has its own "Nivå 1/2"
 * (stage groups), which are something else.
 */
import { CATEGORIES, labelsFor, type ModelId } from "./labels";

export type WritingLevel = 1 | 2 | 3 | 4;

export interface WritingLevelSpec {
  level: WritingLevel;
  /** Shown in the UI. */
  name: string;
  model: ModelId;
  /** The characters that can be read at this level. */
  chars: ReadonlySet<string>;
}

const DIGITS = CATEGORIES.digits;
/** Åk 1-3: whole numbers, + − = < >, and · × for the times tables (one dot class, one x class - layout.ts reads them). */
const LEVEL_1 = [...DIGITS, "+", "-", "=", "<", ">", ".", "x"];
/** Åk 4-6: decimals (comma or dot), fractions, percent, överslag, parentheses, ratio and scale (1:500), x as the unknown. */
const LEVEL_2 = [...LEVEL_1, ",", "/", "%", "≈", "(", ")", ":"];
/** Åk 7-9: algebra, inequalities, powers, roots, π, angles, area and volume. */
const LEVEL_3 = [...LEVEL_2, "π", "√", "≤", "≥", "≠", "°", ..."abcdhkmnruvyz", "A"];

export const WRITING_LEVELS: Readonly<Record<WritingLevel, WritingLevelSpec>> = {
  1: { level: 1, name: "Åk 1–3", model: "basic", chars: new Set(LEVEL_1) },
  2: { level: 2, name: "Åk 4–6", model: "basic", chars: new Set(LEVEL_2) },
  3: { level: 3, name: "Åk 7–9", model: "full", chars: new Set(LEVEL_3) },
  // Gymnasiet: everything the full model knows - functions, trigonometry, logarithms, limits, integrals, ±, |x|, Greek.
  4: { level: 4, name: "Gymnasiet", model: "full", chars: new Set(labelsFor("full")) },
};

export const ALL_WRITING_LEVELS: readonly WritingLevel[] = [1, 2, 3, 4];

// Every level's characters must be ones its model can actually output.
for (const spec of Object.values(WRITING_LEVELS)) {
  const known = new Set(labelsFor(spec.model));
  const missing = [...spec.chars].filter((c) => !known.has(c));
  if (missing.length > 0) throw new Error(`levels.ts: ${spec.name} lists ${missing.join(" ")}, which the ${spec.model} model doesn't know`);
}
