/**
 * Turns a left-to-right list of already-classified, positioned symbols into
 * a LaTeX string. Two layout rules are detected purely from position/size,
 * the same signals a human reader uses:
 *
 *  - Fraction bar: a "-" with other symbols centered both above AND below
 *    its horizontal span is a fraction, not a minus sign - its numerator and
 *    denominator are laid out recursively (so nested fractions work) and the
 *    whole thing becomes `\frac{...}{...}`.
 *  - Superscript/subscript: a symbol notably smaller than the page's normal
 *    size, sitting well above or below the baseline, and close enough
 *    horizontally to the symbol before it, attaches to that symbol instead
 *    of standing on its own. The classified "^" glyph is also an explicit,
 *    position-independent trigger for a superscript on whatever follows it,
 *    for anyone who'd rather write it out.
 *
 * Everything else (digits, letters, +-×÷=<>(), etc.) is emitted verbatim,
 * left to right. Not covered (documented scope limit, not a bug): roots,
 * sums/integrals with limits, matrices, and multi-line layouts.
 */
import type { BoundingBox } from "./segmentation";

export interface ClassifiedSymbol {
  char: string;
  box: BoundingBox;
}

const LATEX_MAP: Record<string, string> = {
  "×": "\\times",
  "÷": "\\div",
  π: "\\pi",
};

function latexToken(char: string): string {
  return LATEX_MAP[char] ?? char;
}

/** A symbol shorter than this fraction of the page's normal height counts as script-sized. */
const SMALL_SIZE_RATIO = 0.65;
/** How far (in normal-heights) a small symbol's center must sit from the baseline to count as raised/lowered rather than just small. */
const SCRIPT_OFFSET_RATIO = 0.2;
/** How close (in normal-heights) a small symbol must sit, horizontally, to the symbol it attaches to. */
const HORIZONTAL_GAP_RATIO = 0.9;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

interface Token {
  cx: number;
  latex: string;
  /** Which script suffix (if any) is currently open on this token, so a run of same-side script symbols (e.g. a two-digit exponent) merges into one `^{...}` instead of stacking `^{1}^{2}`. */
  openScript: "^" | "_" | null;
}

export function layoutSymbols(symbols: ClassifiedSymbol[]): string {
  if (symbols.length === 0) return "";
  const ordered = [...symbols].sort((a, b) => a.box.cx - b.box.cx);
  // The reference "normal" size is the TALLEST symbol on the page, not the
  // median: a superscript is by definition smaller than its base, but there
  // is no such guarantee about how many superscripts there are relative to
  // base symbols (e.g. "x^12" is 1 base to 2 script digits) - a median would
  // get dragged down by a script-heavy expression and stop calling its own
  // digits "small".
  const hMed = Math.max(...ordered.map((s) => Math.max(s.box.height, 1)));

  // Pass 1: pull out fraction bars (and everything they cover) before the
  // flat left-to-right pass below ever sees them. Widest bars first: for a
  // nested fraction, the outer bar must span at least as wide as the inner
  // one it contains, so processing outer-before-inner here means the inner
  // bar is only ever seen recursively (via layoutSymbols(above) below), never
  // by this loop directly - process them the other way around and the inner
  // bar's own "above"/"below" scan sweeps up the outer bar and everything
  // past it too, since nothing yet marks those as already spoken for.
  const consumed = new Set<ClassifiedSymbol>();
  const fractionSlots: { cx: number; latex: string }[] = [];
  const barCandidates = ordered.filter((s) => s.char === "-").sort((a, b) => b.box.width - a.box.width);
  for (const bar of barCandidates) {
    if (consumed.has(bar)) continue;
    const margin = bar.box.width * 0.2;
    const inSpan = (s: ClassifiedSymbol) => s !== bar && !consumed.has(s) && s.box.cx >= bar.box.minX - margin && s.box.cx <= bar.box.maxX + margin;
    const above = ordered.filter((s) => inSpan(s) && s.box.cy < bar.box.cy - bar.box.height * 0.2);
    const below = ordered.filter((s) => inSpan(s) && s.box.cy > bar.box.cy + bar.box.height * 0.2);
    if (above.length === 0 || below.length === 0) continue; // a genuine minus sign, not a bar
    consumed.add(bar);
    for (const s of [...above, ...below]) consumed.add(s);
    fractionSlots.push({ cx: bar.box.cx, latex: `\\frac{${layoutSymbols(above)}}{${layoutSymbols(below)}}` });
  }

  const remaining = ordered.filter((s) => !consumed.has(s));
  // Baseline = median vertical center among normal-sized symbols, so a
  // formula that's mostly superscripts still has something to measure against.
  const normalSized = remaining.filter((s) => s.box.height >= hMed * SMALL_SIZE_RATIO);
  const baseline = median((normalSized.length > 0 ? normalSized : remaining).map((s) => s.box.cy));

  const tokens: Token[] = [];
  let i = 0;
  while (i < remaining.length) {
    const s = remaining[i];
    const gapToPrev = i > 0 ? s.box.minX - remaining[i - 1].box.maxX : Infinity;
    const closeEnoughToPrev = gapToPrev < hMed * HORIZONTAL_GAP_RATIO;

    if (s.char === "^" && i + 1 < remaining.length && tokens.length > 0) {
      attachScript(tokens[tokens.length - 1], "^", latexToken(remaining[i + 1].char));
      i += 2;
      continue;
    }

    const isSmall = s.box.height < hMed * SMALL_SIZE_RATIO;
    const isRaised = isSmall && s.box.cy < baseline - hMed * SCRIPT_OFFSET_RATIO;
    const isLowered = isSmall && s.box.cy > baseline + hMed * SCRIPT_OFFSET_RATIO;
    if ((isRaised || isLowered) && tokens.length > 0 && closeEnoughToPrev) {
      attachScript(tokens[tokens.length - 1], isRaised ? "^" : "_", latexToken(s.char));
      i++;
      continue;
    }

    tokens.push({ cx: s.box.cx, latex: latexToken(s.char), openScript: null });
    i++;
  }

  const allSlots: { cx: number; latex: string }[] = [...tokens, ...fractionSlots];
  allSlots.sort((a, b) => a.cx - b.cx);
  return allSlots.map((t) => t.latex).join(" ");
}

function attachScript(token: Token, op: "^" | "_", char: string) {
  if (token.openScript === op) {
    token.latex = token.latex.slice(0, -1) + char + "}";
  } else {
    token.latex += `${op}{${char}}`;
    token.openScript = op;
  }
}
