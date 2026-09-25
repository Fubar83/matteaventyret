/**
 * Confidence rules for the handwriting recognizer (see build brief "Auto-check
 * flow" and "Digit styles"). Kept pure and separate from model inference so
 * they're exhaustively testable, and separate from answer-checking: the
 * recognizer must never know the expected answer.
 */
import { charToIndex, LABELS } from "./labels";

export interface TopTwo {
  first: { index: number; prob: number };
  second: { index: number; prob: number };
}

/** Character pairs that look alike in handwriting, checked both directions. Index pairs, derived from LABELS. */
const CONFUSABLE_CHAR_PAIRS: readonly [string, string][] = [
  // digit / digit
  ["1", "7"],
  ["4", "9"],
  ["5", "6"],
  ["3", "8"],
  ["0", "6"],
  // digit / math sign
  ["1", "/"],
  ["7", "/"],
  // both small marks - still the closest pair even with size-aware scaling
  [",", "."],
  // digit / letter (round or straight lookalikes)
  ["0", "O"],
  ["0", "o"],
  ["1", "l"],
  ["1", "I"],
  ["1", "i"],
  ["2", "Z"],
  ["2", "z"],
  ["5", "S"],
  ["5", "s"],
  ["6", "b"],
  ["6", "G"],
  ["8", "B"],
  ["9", "g"],
  ["9", "q"],
  // letter / letter (case or shape lookalikes)
  ["l", "I"],
  ["o", "O"],
  ["c", "C"],
  ["s", "S"],
  ["u", "v"],
  ["u", "U"],
  ["v", "V"],
  ["w", "W"],
  ["x", "X"],
  ["z", "Z"],
  ["p", "P"],
  ["k", "K"],
  ["m", "n"],
  // letter / math sign
  ["x", "×"],
  ["X", "×"],
  // Swedish diacritics / their base letter
  ["a", "å"],
  ["a", "ä"],
  ["A", "Å"],
  ["A", "Ä"],
  ["o", "ö"],
  ["O", "Ö"],
];

const CONFUSABLE_MIN_MARGIN = 0.4;
const DEFAULT_MIN_TOP = 0.85;
const DEFAULT_MIN_MARGIN = 0.3;

function buildConfusablePairSet(pairs: readonly [string, string][]): ReadonlySet<string> {
  const set = new Set<string>();
  for (const [a, b] of pairs) {
    // Some pairs name a character outside the currently active LABELS (e.g. letters,
    // while they're disabled) - skip those rather than erroring, so the list doesn't
    // need pruning/restoring by hand each time the active character set changes.
    if (!LABELS.includes(a) || !LABELS.includes(b)) continue;
    const ia = charToIndex(a);
    const ib = charToIndex(b);
    set.add(`${ia}-${ib}`);
    set.add(`${ib}-${ia}`);
  }
  return set;
}

const CONFUSABLE_PAIRS = buildConfusablePairSet(CONFUSABLE_CHAR_PAIRS);

/**
 * Top two classes by probability. `candidates` restricts the search to those
 * class indices (e.g. digit-only cells should never propose a letter),
 * defaulting to every class in `probs`.
 */
export function topTwo(probs: readonly number[], candidates?: readonly number[]): TopTwo {
  const idx = [...(candidates ?? probs.map((_, i) => i))].sort((a, b) => probs[b] - probs[a]);
  const firstIdx = idx[0];
  const secondIdx = idx[1];
  return { first: { index: firstIdx, prob: probs[firstIdx] }, second: { index: secondIdx, prob: probs[secondIdx] } };
}

/** True if the top guess (within `candidates`, if given) clears the general threshold and the confusable-pair margin. */
export function isConfident(probs: readonly number[], candidates?: readonly number[]): boolean {
  const { first, second } = topTwo(probs, candidates);
  if (first.prob < DEFAULT_MIN_TOP) return false;
  const margin = first.prob - second.prob;
  const requiredMargin = CONFUSABLE_PAIRS.has(`${first.index}-${second.index}`) ? CONFUSABLE_MIN_MARGIN : DEFAULT_MIN_MARGIN;
  return margin >= requiredMargin;
}

export function charAt(index: number): string {
  return LABELS[index];
}
