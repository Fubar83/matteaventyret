/**
 * The set of characters the handwriting engine can recognize, and where each
 * one's training data comes from. `characters.json` is the single source of
 * truth - to add, remove, or resource a character, edit that file and
 * retrain (see scripts/trainBootstrapModel.mjs); nothing else needs to
 * change.
 *
 * There are two models, each listing which characters it knows in
 * characters.json's `models` field:
 *   - "basic": digits and the few signs arithmetic needs. Small, trained with
 *     heavier augmentation so it forgives messy handwriting - used wherever
 *     the input is known to be numbers (the game's answer boxes, the
 *     column/division templates).
 *   - "full": everything (signs, Greek, lowercase letters) - free writing.
 * A model's class index order is its characters in characters.json order.
 * Digits come first in both, in value order, so index n is digit n in either
 * model (`DIGIT_INDICES` is the same for both). New characters are appended at
 * the end so an older model's indices stay a prefix of the current list.
 *
 * Mirrored in scripts/labels.mjs, which reads the exact same JSON file
 * (plain Node has no TS loader here, so it can't import this module
 * directly) - the two files derive identical labels from one shared list
 * instead of keeping two hand-written arrays in sync.
 */
import characters from "./characters.json";

export type Category = "digits" | "math" | "lowercase" | "uppercase" | "mirrored";
export type ModelId = "basic" | "full";

export const MODEL_IDS: readonly ModelId[] = ["basic", "full"];

const CATEGORY_NAMES: readonly Category[] = ["digits", "math", "lowercase", "uppercase", "mirrored"];

function buildCategories(): Record<Category, readonly string[]> {
  const byCategory: Record<Category, string[]> = { digits: [], math: [], lowercase: [], uppercase: [], mirrored: [] };
  for (const entry of characters) {
    if (!CATEGORY_NAMES.includes(entry.category as Category)) {
      throw new Error(`characters.json: unknown category ${JSON.stringify(entry.category)} for character ${JSON.stringify(entry.char)}`);
    }
    byCategory[entry.category as Category].push(entry.char);
  }
  return byCategory;
}

export const CATEGORIES: Readonly<Record<Category, readonly string[]>> = buildCategories();

const LABELS_BY_MODEL: Readonly<Record<ModelId, readonly string[]>> = {
  basic: characters.filter((entry) => entry.models.includes("basic")).map((entry) => entry.char),
  full: characters.filter((entry) => entry.models.includes("full")).map((entry) => entry.char),
};

/** The characters `model` can output, in its class index order. */
export function labelsFor(model: ModelId): readonly string[] {
  return LABELS_BY_MODEL[model];
}

/** The full model's labels - every character the engine knows. */
export const LABELS: readonly string[] = LABELS_BY_MODEL.full;

export const NUM_CLASSES = LABELS.length;

const INDEX_BY_CHAR: Readonly<Record<ModelId, ReadonlyMap<string, number>>> = {
  basic: new Map(LABELS_BY_MODEL.basic.map((c, i) => [c, i])),
  full: new Map(LABELS_BY_MODEL.full.map((c, i) => [c, i])),
};

export function charToIndex(char: string, model: ModelId = "full"): number {
  const i = INDEX_BY_CHAR[model].get(char);
  if (i === undefined) throw new Error(`charToIndex: unknown character ${JSON.stringify(char)} for the ${model} model`);
  return i;
}

export function indexToChar(index: number, model: ModelId = "full"): string {
  const c = LABELS_BY_MODEL[model][index];
  if (c === undefined) throw new Error(`indexToChar: index out of range ${index} for the ${model} model`);
  return c;
}

export function categoryOf(char: string): Category {
  for (const key of CATEGORY_NAMES) {
    if (CATEGORIES[key].includes(char)) return key;
  }
  throw new Error(`categoryOf: unknown character ${JSON.stringify(char)}`);
}

/** Digit class indices, 0-9 - looked up by value rather than assumed contiguous. Identical in both models (digits come first in each), checked below. */
export const DIGIT_INDICES: readonly number[] = CATEGORIES.digits.map((d) => charToIndex(d));

/**
 * A digit written backwards (see characters.json's "mirrored" entries - basic
 * model only), mapped to the digit it is. The recognizer folds these into
 * their digit and just flags that it was mirrored.
 */
export const MIRRORED_DIGIT: ReadonlyMap<string, number> = new Map(
  characters.flatMap((entry) => ("mirrorOf" in entry && entry.mirrorOf !== undefined ? [[entry.char, Number(entry.mirrorOf)] as const] : []))
);

for (const model of MODEL_IDS) {
  const labels = LABELS_BY_MODEL[model];
  const firstMirrored = labels.findIndex((c) => MIRRORED_DIGIT.has(c));
  if (firstMirrored >= 0 && labels.slice(firstMirrored).some((c) => !MIRRORED_DIGIT.has(c))) {
    throw new Error(`characters.json: mirrored digits must come last in the ${model} model`);
  }
  if (CATEGORIES.digits.some((d, i) => charToIndex(d, model) !== DIGIT_INDICES[i])) {
    throw new Error(`characters.json: digits must come first, in the same order, in the ${model} model`);
  }
}
