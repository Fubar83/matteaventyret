/**
 * Plain-JS mirror of src/recognition/labels.ts's CATEGORIES/LABELS, for the
 * Node bootstrap script (plain Node has no TS loader here). Keep both files'
 * order identical - the model's class index depends on it.
 */
export const CATEGORIES = {
  digits: "0123456789".split(""),
  // "," and "." re-added at the end, "^"/"π" appended after - see labels.ts for why.
  math: ["+", "-", "×", "÷", "=", "<", ">", "(", ")", "/", ",", ".", "^", "π"],
  lowercase: "abcdefghijklmnopqrstuvwxyzåäö".split(""),
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ".split(""),
};

export const LABELS = [...CATEGORIES.digits, ...CATEGORIES.math, ...CATEGORIES.lowercase, ...CATEGORIES.uppercase];
