/**
 * The set of characters the handwriting engine can recognize. Order is the
 * model's class index order - index 0-9 are the digits, kept in digit-value
 * order so old digit-only code (`LABELS[n] === String(n)` for n 0-9) keeps
 * working unchanged. Mirrored in scripts/labels.mjs for the Node bootstrap
 * script (plain Node has no TS loader here) - keep both in sync if this list
 * changes.
 *
 * Letters are disabled for now (numbers + math signs only, by request) -
 * restore by adding these back in and regenerating the bootstrap model:
 *   lowercase: "abcdefghijklmnopqrstuvwxyzåäö".split(""),
 *   uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ".split(""),
 */
export const CATEGORIES = {
  digits: "0123456789".split(""),
  // "," and "." re-added at the end (see preprocessStrokes' small-mark scaling,
  // which is what makes them viable again - a period/comma no longer gets
  // magnified up to fill the canvas like an ordinary character). "×" is still
  // cross-only, never a dot: a dot-style × and a period are the same size AND
  // shape, distinguishable only by baseline position, which this per-character
  // isolated recognizer has no notion of - no preprocessing fix can recover that.
  // New characters are always appended, never inserted, so no existing
  // character's class index shifts under whatever model is currently installed.
  math: ["+", "-", "×", "÷", "=", "<", ">", "(", ")", "/", ",", "."],
} as const;

export type Category = keyof typeof CATEGORIES;

export const LABELS: readonly string[] = [...CATEGORIES.digits, ...CATEGORIES.math];

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
  for (const key of Object.keys(CATEGORIES) as Category[]) {
    if ((CATEGORIES[key] as readonly string[]).includes(char)) return key;
  }
  throw new Error(`categoryOf: unknown character ${JSON.stringify(char)}`);
}

/** Digit class indices, 0-9 - identical to the digit values themselves since digits sit first in LABELS. */
export const DIGIT_INDICES: readonly number[] = CATEGORIES.digits.map((_, i) => i);
