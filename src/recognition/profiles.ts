/**
 * Recognition profiles: what handwriting can be read as, per kind of
 * question - narrower than a whole writing level (levels.ts). A triangle's
 * area never needs a g, a q or a |, yet at a level they'd all compete with
 * the digits (the full model's "1" against "|" and "(", its "9" against "g"
 * and "q"); with the question's own profile they can't be the answer at all.
 * The same goes for layout: superscripts and subscripts are opt-in, so a
 * digit written a little small and high is just a digit where no question
 * needs a power (layout.ts's `scripts`).
 *
 * Every profile's characters must be ones its model knows (checked below).
 * Which stage uses which: PROFILE_BY_STAGE.
 */
import type { StageId } from "../engine/generator";
import { CATEGORIES, labelsFor, type ModelId } from "./labels";

export interface RecognitionProfile {
  id: ProfileId;
  model: ModelId;
  /** The characters that can be read. */
  chars: ReadonlySet<string>;
  /** Powers and indices (x², x₁, 10ˣ) read from position; off, a raised digit is just a digit. */
  scripts: boolean;
  /**
   * Writing order is part of the input (åk 7 and up): each symbol finished
   * before the next is started, each character written one of its allowed
   * ways (strokeOrder.ts), a fraction's numerator before its bar. Symbols
   * themselves can come in any order - brackets added afterwards are fine.
   * The youngest (numbers and the four operations) may write any way.
   */
  strictOrder: boolean;
}

export type ProfileId =
  | "arithmetic"
  | "areaBasic"
  | "integers"
  | "powers"
  | "percent"
  | "linearAlgebra"
  | "lines"
  | "quadratics"
  | "pythagoras"
  | "circles"
  | "areaFormulas"
  | "trigonometry"
  | "pq"
  | "logarithms"
  | "derivatives"
  | "integrals"
  | "fractionsYoung"
  | "unitsYoung"
  | "unitsOlder"
  | "probability"
  | "volume"
  | "sequences"
  | "systems"
  | "wordOlder";

const DIGITS = CATEGORIES.digits;
/** Writing a calculation: the four operations ("." is also the · times dot, x also the × sign), brackets, decimal comma. */
const CALC = [...DIGITS, "+", "-", "=", ".", ",", "x", "/", "(", ")"];

/**
 * The letters units are written with: mm, cm, dm, m, km, g, hg, kg, min, h, s.
 * Not liters: the models have no "l" (it reads as a 1 - "4 l" would be 41), so
 * those questions ask for the number alone (engine/examTopics.ts).
 */
const UNIT_LETTERS = ["m", "c", "d", "k", "g", "h", "i", "n", "s"];

function profile(id: ProfileId, model: ModelId, chars: readonly string[], scripts: boolean, strictOrder = model === "full"): RecognitionProfile {
  // The åk 1-6 profiles may be written any way; from åk 7 the order counts.
  return { id, model, chars: new Set(chars), scripts, strictOrder };
}

export const PROFILES: Readonly<Record<ProfileId, RecognitionProfile>> = {
  /** "Visa hur du tänkte" under an answer, omkrets: plain sums. */
  arithmetic: profile("arithmetic", "basic", [...CALC, ":"], false),
  /** Area in åk 4-6 (rectangles, triangles, put together): products, halves. */
  areaBasic: profile("areaBasic", "basic", CALC, false),
  /** Negative numbers. */
  integers: profile("integers", "full", CALC, false),
  /** Powers and grundpotensform: exponents are the point. */
  powers: profile("powers", "full", CALC, true),
  /** Percent and förändringsfaktor. */
  percent: profile("percent", "full", [...CALC, "%", "≈"], false),
  /** Simplifying and first-degree equations in x. */
  linearAlgebra: profile("linearAlgebra", "full", CALC, false),
  /** Straight lines: y = kx + m, Δ. */
  lines: profile("lines", "full", [...CALC, "y", "k", "m", "Δ"], false),
  /** Kvadreringsregler, konjugatregel, andragradsekvationer: x², x₁, ±, roots. */
  quadratics: profile("quadratics", "full", [...CALC, "√", "±"], true),
  /** Pythagoras: c² = a² + b², a root. */
  pythagoras: profile("pythagoras", "full", [...CALC, "√", "a", "b", "c"], true),
  /** The circle and shapes with circles: π, r², and the letters of its formulas (A = πr², O = πd). */
  circles: profile("circles", "full", [...CALC, "π", "≈", "√", "r", "d", "A", "b", "h"], true),
  /**
   * Parallelltrapets, working backwards to a side or a height. No "s" for a
   * square's side: it took 5s and 0s (benchmark: "√15" read "√1s").
   */
  areaFormulas: profile("areaFormulas", "full", [...CALC, "√", "≈", "a", "b", "h", "A"], true),
  /** Trigonometry and the area rule: sin/cos/tan (read from their letters), degrees. */
  trigonometry: profile("trigonometry", "full", [...CALC, "≈", "°", "√", "a", "b", "c", "v", "s", "i", "n", "t"], false),
  /** pq-formeln. */
  pq: profile("pq", "full", [...CALC, "√", "±", "p", "q"], true),
  /** Logarithms: lg ("1g"), 10ˣ. */
  logarithms: profile("logarithms", "full", [...CALC, "g"], true),
  /** Derivatives: f(x), f′(x), xⁿ. */
  derivatives: profile("derivatives", "full", [...CALC, "f"], true),
  /** Integrals: ∫, bounds, F(x), dx. */
  integrals: profile("integrals", "full", [...CALC, "∫", "d", "f"], true),
  /** Bråk in åk 4-6: fractions, and percent (the full model, for "%" - written any way, like the other åk 1-6 profiles). */
  fractionsYoung: profile("fractionsYoung", "full", [...CALC, "%"], false, false),
  /** Unit conversions in åk 4-6: the answer may be written with its unit (350 cm, 2,5 kg, 135 min). */
  unitsYoung: profile("unitsYoung", "full", [...CALC, ...UNIT_LETTERS], true, false),
  /** Speed and scale: units, km/h, and s = v · t written out. */
  unitsOlder: profile("unitsOlder", "full", [...CALC, ...UNIT_LETTERS, "v"], true),
  /** Probability: P = 3/8, or as a decimal or percent. */
  probability: profile("probability", "full", [...CALC, "%", "p"], false),
  /** Volume: V = π r² h, cm³. */
  volume: profile("volume", "full", [...CALC, "π", "≈", "v", "b", "h", "r", "c", "m"], true),
  /** Sequences: the n:th number. */
  sequences: profile("sequences", "full", [...CALC, "n", "a"], true),
  /** Equation systems: x and y. */
  systems: profile("systems", "full", [...CALC, "y"], false),
  /** Word problems in åk 7-9: percent, units (km, km/h), an equation in x. */
  wordOlder: profile("wordOlder", "full", [...CALC, "%", ...UNIT_LETTERS], false),
};

/**
 * The profile each stage's written work is read with. Stages not listed
 * (the åk 1-6 uppställningar, which write in boxes) don't write freely.
 */
export const PROFILE_BY_STAGE: Partial<Record<StageId, ProfileId>> = {
  "1.2.1": "arithmetic",
  "2.4.1": "areaBasic",
  "2.4.2": "areaBasic",
  "2.4.3": "areaBasic",
  "2.4.4": "areaBasic",
  "2.7.1": "arithmetic",
  "2.7.2": "arithmetic",
  "2.7.3": "arithmetic",
  "2.8.1": "arithmetic",
  "2.8.2": "arithmetic",
  "2.8.3": "arithmetic",
  "3.1.1": "integers",
  "3.1.2": "powers",
  "3.1.3": "powers",
  "3.2.1": "percent",
  "3.2.2": "percent",
  "3.3.1": "linearAlgebra",
  "3.3.2": "linearAlgebra",
  "3.3.3": "linearAlgebra",
  "3.3.4": "quadratics",
  "3.3.5": "quadratics",
  "3.3.6": "quadratics",
  "3.4.1": "pythagoras",
  "3.4.2": "lines",
  "3.4.3": "circles",
  "3.4.4": "areaFormulas",
  "3.4.5": "circles",
  "3.4.6": "circles",
  "4.1.1": "pq",
  "4.1.2": "logarithms",
  "4.2.1": "trigonometry",
  "4.2.2": "circles",
  "4.2.3": "trigonometry",
  "4.3.1": "derivatives",
  "4.3.2": "integrals",
  "2.6.1": "fractionsYoung",
  "2.6.2": "fractionsYoung",
  "2.6.3": "fractionsYoung",
  "2.6.4": "fractionsYoung",
  "2.9.1": "unitsYoung",
  "2.9.2": "unitsYoung",
  "2.9.3": "unitsYoung",
  "2.10.1": "arithmetic",
  "2.10.2": "arithmetic",
  "3.5.1": "integers",
  "3.6.1": "unitsOlder",
  "3.6.2": "unitsOlder",
  "3.7.1": "probability",
  "3.7.2": "probability",
  "3.4.7": "volume",
  "3.4.8": "volume",
  "3.3.7": "sequences",
  "4.1.3": "systems",
  "1.3.1": "arithmetic",
  "1.3.2": "arithmetic",
  "2.11.1": "unitsYoung",
  "2.11.2": "unitsYoung",
  "3.8.1": "wordOlder",
  "3.8.2": "wordOlder",
  "1.4.1": "arithmetic",
  "1.4.2": "arithmetic",
  "1.4.3": "arithmetic",
  "1.5.1": "arithmetic",
  "1.5.3": "arithmetic",
  "1.5.4": "arithmetic",
  "1.5.5": "arithmetic",
  "1.5.6": "arithmetic",
  "1.5.7": "arithmetic",
  "1.5.2": "arithmetic",
  "1.6.1": "arithmetic",
  "1.2.2": "arithmetic",
  "2.12.1": "arithmetic",
  "2.13.1": "arithmetic",
  "2.14.1": "arithmetic",
  "2.15.1": "arithmetic",
  "2.10.3": "arithmetic",
  "2.9.4": "unitsYoung",
  "2.9.5": "arithmetic",
};

export function profileForStage(stageId: StageId): RecognitionProfile | undefined {
  const id = PROFILE_BY_STAGE[stageId];
  return id ? PROFILES[id] : undefined;
}

// Every profile's characters must be ones its model can actually output.
for (const p of Object.values(PROFILES)) {
  const known = new Set(labelsFor(p.model));
  const missing = [...p.chars].filter((c) => !known.has(c));
  if (missing.length > 0) throw new Error(`profiles.ts: ${p.id} lists ${missing.join(" ")}, which the ${p.model} model doesn't know`);
}
