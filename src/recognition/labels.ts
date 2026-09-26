/**
 * The set of characters the handwriting engine can recognize. Order is the
 * model's class index order - index 0-9 are the digits, kept in digit-value
 * order so old digit-only code (`LABELS[n] === String(n)` for n 0-9) keeps
 * working unchanged. Mirrored in scripts/labels.mjs for the Node bootstrap
 * script (plain Node has no TS loader here) - keep both in sync if this list
 * changes.
 *
 * Letters were restored for the free-form math-input page (see
 * src/mathinput/), which needs real variable names (x, y, n, ...), not just
 * digits and signs.
 */
export const CATEGORIES = {
  digits: "0123456789".split(""),
  // "," and "." re-added at the end (see preprocessStrokes' small-mark scaling,
  // which is what makes them viable again - a period/comma no longer gets
  // magnified up to fill the canvas like an ordinary character). "×" is still
  // cross-only, never a dot: a dot-style × and a period are the same size AND
  // shape, distinguishable only by baseline position, which this per-character
  // isolated recognizer has no notion of - no preprocessing fix can recover that.
  // "^" and "π" are for the math-input page: an explicit exponent marker (in
  // addition to position-based superscript detection - see mathinput/layout.ts)
  // and the Greek letter pi, drawn as its own glyph rather than spelled "pi".
  // New characters are always appended, never inserted, so no existing
  // character's class index shifts under whatever model is currently installed.
  math: ["+", "-", "×", "÷", "=", "<", ">", "(", ")", "/", ",", ".", "^", "π"],
  lowercase: "abcdefghijklmnopqrstuvwxyzåäö".split(""),
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ".split(""),
} as const;

export type Category = keyof typeof CATEGORIES;

export const LABELS: readonly string[] = [...CATEGORIES.digits, ...CATEGORIES.math, ...CATEGORIES.lowercase, ...CATEGORIES.uppercase];

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
