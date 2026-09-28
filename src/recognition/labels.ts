/**
 * The set of characters the handwriting engine can recognize, and where each
 * one's training data comes from. `characters.json` is the single source of
 * truth - to add, remove, or resource a character, edit that file and
 * retrain (see scripts/trainBootstrapModel.mjs); nothing else needs to
 * change. Order is the model's class index order - index 0-9 are the
 * digits, kept in digit-value order so old digit-only code
 * (`LABELS[n] === String(n)` for n 0-9) keeps working unchanged.
 *
 * Mirrored in scripts/labels.mjs, which reads the exact same JSON file
 * (plain Node has no TS loader here, so it can't import this module
 * directly) - the two files derive identical LABELS/CATEGORIES from one
 * shared list instead of keeping two hand-written arrays in sync.
 */
import characters from "./characters.json";

export type Category = "digits" | "math" | "lowercase" | "uppercase";

const CATEGORY_NAMES: readonly Category[] = ["digits", "math", "lowercase", "uppercase"];

function buildCategories(): Record<Category, readonly string[]> {
  const byCategory: Record<Category, string[]> = { digits: [], math: [], lowercase: [], uppercase: [] };
  for (const entry of characters) {
    if (!CATEGORY_NAMES.includes(entry.category as Category)) {
      throw new Error(`characters.json: unknown category ${JSON.stringify(entry.category)} for character ${JSON.stringify(entry.char)}`);
    }
    byCategory[entry.category as Category].push(entry.char);
  }
  return byCategory;
}

export const CATEGORIES: Readonly<Record<Category, readonly string[]>> = buildCategories();

export const LABELS: readonly string[] = characters.map((entry) => entry.char);

export const NUM_CLASSES = LABELS.length;

const INDEX_BY_CHAR = new Map(LABELS.map((c, i) => [c, i]));

export function charToIndex(char: string): number {
  const i = INDEX_BY_CHAR.get(char);
  if (i === undefined) throw new Error(`charToIndex: unknown character ${JSON.stringify(char)}`);
  return i;
}

export function indexToChar(index: number): string {
  const c = LABELS[index];
  if (c === undefined) throw new Error(`indexToChar: index out of range ${index}`);
  return c;
}

export function categoryOf(char: string): Category {
  for (const key of CATEGORY_NAMES) {
    if (CATEGORIES[key].includes(char)) return key;
  }
  throw new Error(`categoryOf: unknown character ${JSON.stringify(char)}`);
}

/** Digit class indices, 0-9 - looked up by value rather than assumed contiguous, so this stays correct even if digits ever stop being first in characters.json. */
export const DIGIT_INDICES: readonly number[] = CATEGORIES.digits.map((d) => charToIndex(d));
