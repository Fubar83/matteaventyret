/**
 * Plain-JS mirror of src/recognition/labels.ts's CATEGORIES/LABELS, for the
 * Node bootstrap script (plain Node has no TS loader here). Keep both files'
 * order identical - the model's class index depends on it.
 *
 * Letters are disabled for now (numbers + math signs only, by request) - see
 * src/recognition/labels.ts for how to restore them.
 */
export const CATEGORIES = {
  digits: "0123456789".split(""),
  // "," and "." re-added at the end - see labels.ts for why.
  math: ["+", "-", "×", "÷", "=", "<", ">", "(", ")", "/", ",", "."],
};

export const LABELS = [...CATEGORIES.digits, ...CATEGORIES.math];
