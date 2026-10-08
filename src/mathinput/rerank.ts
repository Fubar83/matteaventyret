/**
 * Choosing between near-equal readings by what makes sense as maths. Each
 * symbol is classified on its own, and an unsure one's runner-up is often
 * almost as likely as its first guess ("(" or "1", "2" or "z") - but only
 * one of them makes the line parse. So for the few least certain symbols,
 * every combination of their top guesses is laid out and scored:
 *
 *   - the classifier's own probability for each choice (log, so it adds up)
 *   - every line has to read as maths (brackets that match, no "2 + = 3")
 *   - a little for numbers the question itself contains, if it's known
 *
 * and the best one wins. Never whether the calculation is right - that would
 * turn a child's real mistake (8 · 5 / 2 = 20) into a right answer.
 */
import { parseLines } from "./evaluate";
import { writtenNumbers } from "./workCheck";

export interface RerankSymbol {
  char: string;
  alternatives: readonly string[];
  /** Each alternative's probability (same order). Without them, the symbol isn't a choice. */
  scores?: readonly number[];
  confident: boolean;
  pinned?: boolean;
}

/** At most this many symbols are reconsidered together (3^5 = 243 layouts at most). */
const MAX_SYMBOLS = 5;
/** Per symbol, guesses this close to its best are worth trying. */
const MIN_RELATIVE = 0.12;
/** A line that doesn't read as maths costs as much as a guess this many times less likely. */
const UNPARSABLE = Math.log(40);
/** A number the question gives is a little more likely to be what was written. */
const KNOWN_NUMBER = Math.log(1.5);

/** How much a reading makes sense as maths: unparsable lines cost, numbers from the question gain a little. */
export function readingScore(latex: string, numbers: readonly number[] = []): number {
  if (!latex.trim()) return 0;
  let score = 0;
  for (const line of parseLines(latex)) {
    if (!line) {
      score -= UNPARSABLE;
      continue;
    }
    if (numbers.length > 0) {
      for (const side of line.sides) for (const n of writtenNumbers(side)) if (numbers.some((g) => Math.abs(g - n) < 1e-9)) score += KNOWN_NUMBER;
    }
  }
  return score;
}

/**
 * The chars to read the symbols as: their own first guesses, except where a
 * combination of the least certain symbols' other guesses reads better as
 * maths. `layout` turns a full set of chars into the page's LaTeX.
 */
export function rerank(symbols: readonly RerankSymbol[], layout: (chars: string[]) => string, numbers: readonly number[] = []): string[] {
  const chars = symbols.map((s) => s.char);
  const open = symbols
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => !s.confident && !s.pinned && s.scores && s.alternatives.length >= 2)
    .map(({ s, i }) => {
      const scores = s.scores!;
      const best = Math.max(...scores);
      const options = s.alternatives.map((c, k) => ({ c, p: scores[k] })).filter((o) => o.p >= best * MIN_RELATIVE && o.p > 0);
      return { i, options, margin: best - (scores.filter((p) => p !== best)[0] ?? 0) };
    })
    .filter((o) => o.options.length >= 2)
    .sort((a, b) => a.margin - b.margin)
    .slice(0, MAX_SYMBOLS);
  if (open.length === 0) return chars;

  let best = { score: -Infinity, choice: chars };
  const pick = (k: number, current: string[], logP: number) => {
    if (k === open.length) {
      const score = logP + readingScore(layout(current), numbers);
      if (score > best.score) best = { score, choice: [...current] };
      return;
    }
    for (const o of open[k].options) {
      current[open[k].i] = o.c;
      pick(k + 1, current, logP + Math.log(o.p));
    }
    current[open[k].i] = chars[open[k].i];
  };
  pick(0, [...chars], 0);
  return best.choice;
}
