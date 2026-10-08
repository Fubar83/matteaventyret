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
 *  - Square root: a "√" whose overbar was found by geometry (radical.ts)
 *    takes everything under that bar as its radicand (laid out recursively,
 *    so a fraction under a root works), plus an optional small index in its
 *    crook (`\sqrt[3]{...}`).
 *
 *  - Pieces written apart that make one sign: "<", ">" or "+" with a line
 *    under it (≤ ≥), a "/" between two small circles (%), a dash between two
 *    dots (÷). A function name (sin, cos, tan, lg, ln, log) becomes that one
 *    operator - matched from the digits its letters look like, since the
 *    recognizer leaves out letters that are a digit's twin ("5in", "c05").
 *
 * Everything else (digits, letters, +-×÷=<>(), ⇒, etc.) is emitted verbatim,
 * left to right. Not covered (documented scope limit, not a bug):
 * sums/integrals with limits, matrices, and multi-line layouts.
 */
import { columnBlockAt } from "./columnLayout";
import type { DivisionBracket } from "./divisionBracket";
import { layoutLongDivision } from "./longDivisionLayout";
import { isRootIndex, isUnderBar, type RadicalBar } from "./radical";
import type { BoundingBox } from "./segmentation";

export interface ClassifiedSymbol {
  char: string;
  box: BoundingBox;
  /** Set on a "√" whose overbar was located - see radical.ts. */
  radical?: RadicalBar;
  /** Set on an already-laid-out group (a whole root with its radicand) that later passes treat as one opaque symbol. */
  latex?: string;
  /** Crossed out (see segmentation.ts's strike detection) - rendered as \cancel{...}. */
  struck?: boolean;
  /** Set on a long division's bracket (trappan / liggande stolen) - see divisionBracket.ts. */
  bracket?: DivisionBracket;
  /**
   * Set on a template's printed line or bracket (templates.ts): the exact
   * digit-column grid the template drew, so digits snap to the column whose
   * box they were written in instead of the column being estimated from
   * handwriting spacing.
   */
  /** A template's printed fraction bar (kort division): always a fraction, even before anything is written above or below it. */
  fractionBar?: boolean;
  grid?: {
    anchorX: number;
    pitch: number;
    /** Anything written above this y is in the template's note row (carries / borrowed tens), whatever its size. */
    notesAboveY?: number;
    /** A column template's digit rows (their centers' y, top to bottom): everything else written goes in the nearest one, whatever its size. */
    rowYs?: number[];
  };
}

const LATEX_MAP: Record<string, string> = {
  "×": "\\times",
  "÷": "\\div",
  π: "\\pi",
  "⇒": "\\Rightarrow",
  "·": "\\cdot",
  "√": "\\sqrt{}",
  "≤": "\\le",
  "≥": "\\ge",
  "≠": "\\ne",
  "%": "\\%",
  "≈": "\\approx",
  "°": "{}^{\\circ}",
  "±": "\\pm",
  "→": "\\to",
  "⇔": "\\Leftrightarrow",
  "∞": "\\infty",
  "∫": "\\int",
  Δ: "\\Delta",
  α: "\\alpha",
  β: "\\beta",
  θ: "\\theta",
};

/** Function names written out in letters (gymnasiet: trigonometry, logarithms, limits). */
const FUNCTION_NAMES = ["sin", "cos", "tan", "log", "lim", "lg", "ln"];

/**
 * What the recognizer can read a letter of a function name as: it knows no
 * l or o at all (a 1's and a 0's twins), and below gymnasiet no s, g or t
 * either (levels.ts), so "sin" can come back "5in", "cos" "c05", "tan" "+an",
 * "ln" "1n", "lim" "1im".
 */
const LETTER_LOOKALIKES: Record<string, string> = { l: "1", o: "0", s: "5", g: "9", t: "+" };

function latexToken(s: ClassifiedSymbol): string {
  const t = s.latex ?? LATEX_MAP[s.char] ?? s.char;
  return s.struck ? `\\cancel{${t}}` : t;
}

function unionBox(boxes: BoundingBox[]): BoundingBox {
  const minX = Math.min(...boxes.map((b) => b.minX));
  const minY = Math.min(...boxes.map((b) => b.minY));
  const maxX = Math.max(...boxes.map((b) => b.maxX));
  const maxY = Math.max(...boxes.map((b) => b.maxY));
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY };
}

/** Collapses each long division (bracket, quotient, dividend, divisor and the work rows under it) into one composite symbol. */
function collapseLongDivisions(symbols: ClassifiedSymbol[], opts: LayoutOptions): ClassifiedSymbol[] {
  let current = symbols;
  for (const bracket of symbols.filter((s) => s.bracket)) {
    if (!current.includes(bracket)) continue;
    // A template's divisor is just its digits in their boxes - never an exponent, however it's sized.
    const divisorLayout = bracket.grid ? (divisor: ClassifiedSymbol[]) => divisor.map(latexToken).join("") : (divisor: ClassifiedSymbol[]) => layoutSymbols(divisor, opts);
    const block = layoutLongDivision(bracket, bracket.bracket!, current, latexToken, divisorLayout);
    current = [...current.filter((s) => !block.consumed.has(s)), { char: "⟌", latex: block.latex, box: block.box }];
  }
  return current;
}

/** Collapses each located radical, with its radicand and index, into one composite symbol - outermost (widest) first, so a root nested inside another is left for the recursive layout of the outer one's radicand. */
function collapseRadicals(symbols: ClassifiedSymbol[], opts: LayoutOptions): ClassifiedSymbol[] {
  const radicals = symbols.filter((s) => s.radical && !s.latex).sort((a, b) => b.box.width - a.box.width);
  if (radicals.length === 0) return symbols;
  const consumed = new Set<ClassifiedSymbol>();
  const composites: ClassifiedSymbol[] = [];
  for (const r of radicals) {
    if (consumed.has(r)) continue;
    const bar = r.radical!;
    const free = symbols.filter((s) => s !== r && !consumed.has(s));
    const radicand = free.filter((s) => isUnderBar(bar, r.box, s.box));
    // An index is a number or a letter - never a sign (the "+" of "1 + √9" sits right where an index would).
    const index = free.filter((s) => !radicand.includes(s) && !s.latex && /^[0-9a-zA-Zπ]$/.test(s.char) && isRootIndex(bar, r.box, s.box));
    for (const s of [r, ...radicand, ...index]) consumed.add(s);
    const body = `{${layoutSymbols(radicand, opts)}}`;
    composites.push({
      char: "√",
      latex: index.length > 0 ? `\\sqrt[${layoutSymbols(index, opts)}]${body}` : `\\sqrt${body}`,
      box: unionBox([r, ...radicand, ...index].map((s) => s.box)),
    });
  }
  return [...symbols.filter((s) => !consumed.has(s)), ...composites];
}

/** A symbol shorter than this fraction of the page's normal height counts as script-sized. */
const SMALL_SIZE_RATIO = 0.65;
/** How far (in normal-heights) a small symbol's center must sit from the baseline to count as raised/lowered rather than just small. */
const SCRIPT_OFFSET_RATIO = 0.2;
/** How close (in normal-heights) a small symbol must sit, horizontally, to the symbol it attaches to. */
const HORIZONTAL_GAP_RATIO = 0.9;
/** Signs and punctuation never carry or become an exponent by position alone - a minus or a dot sits at its own height relative to its neighbors by design. */
const NON_SCRIPT_CHARS = new Set(["+", "-", "×", "÷", "=", "<", ">", "≤", "≥", "≠", "≈", "±", "%", "(", "/", ".", ",", "·", ":", "⇒", "⇔", "→", "√"]);

/** How a piece of writing is laid out - set per question type (recognition/profiles.ts). */
export interface LayoutOptions {
  /**
   * Powers and indices from position (x², x₁, 10ˣ, kort division's small
   * remainder notes). Off: a small or raised digit is just a digit on the
   * line - for questions with no powers in them, where a digit written a
   * little high is far more likely than an exponent.
   */
  scripts: boolean;
}

const DEFAULT_LAYOUT: LayoutOptions = { scripts: true };

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

export function layoutSymbols(symbols: ClassifiedSymbol[], opts: LayoutOptions = DEFAULT_LAYOUT): string {
  if (symbols.length === 0) return "";
  // Pass 0: long divisions, then roots - each is a self-contained 2D block
  // (a root's radicand can hold a fraction), so the fraction pass below must
  // not see their pieces loose.
  const collapsed = collapseRadicals(collapseLongDivisions(combineCompoundSigns(symbols), opts), opts).sort((a, b) => a.box.cx - b.box.cx);
  // The reference "normal" size is the TALLEST symbol on the page, not the
  // median: a superscript is by definition smaller than its base, but there
  // is no such guarantee about how many superscripts there are relative to
  // base symbols (e.g. "x^12" is 1 base to 2 script digits) - a median would
  // get dragged down by a script-heavy expression and stop calling its own
  // digits "small". A whole root (sign plus radicand) is taller than any one
  // symbol by construction, so it doesn't count.
  // An integral sign is drawn far taller than the writing around it, so it doesn't set the size either.
  const plain = collapsed.filter((s) => !s.latex && s.char !== "∫");
  const hMed = Math.max(...(plain.length > 0 ? plain : collapsed).map((s) => Math.max(s.box.height, 1)));
  // Then the 2D pieces that need that size: lim with what's under it, ∫ with its bounds.
  const ordered = collapseIntegrals(collapseLimits(readLookalikes(collapsed, hMed), hMed, opts), opts).sort((a, b) => a.box.cx - b.box.cx);

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
    // Column arithmetic first: with an answer row under its line it has
    // content both above and below, exactly like a fraction.
    const block = columnBlockAt(bar, ordered.filter((s) => !consumed.has(s)), latexToken);
    if (block) {
      for (const s of block.consumed) consumed.add(s);
      fractionSlots.push({ cx: block.cx, latex: block.latex });
      continue;
    }
    const margin = bar.box.width * 0.2;
    const inSpan = (s: ClassifiedSymbol) => s !== bar && !consumed.has(s) && s.box.cx >= bar.box.minX - margin && s.box.cx <= bar.box.maxX + margin;
    const above = ordered.filter((s) => inSpan(s) && s.box.cy < bar.box.cy - bar.box.height * 0.2);
    const below = ordered.filter((s) => inSpan(s) && s.box.cy > bar.box.cy + bar.box.height * 0.2);
    // A genuine minus sign, not a bar - unless a template printed it as a fraction bar.
    if ((above.length === 0 || below.length === 0) && !bar.fractionBar) continue;
    consumed.add(bar);
    for (const s of [...above, ...below]) consumed.add(s);
    // One dot over, one dot under: a "÷", not a fraction of two dots.
    if (!bar.fractionBar && above.length === 1 && below.length === 1 && isDot(above[0], hMed) && isDot(below[0], hMed)) {
      fractionSlots.push({ cx: bar.box.cx, latex: "\\div" });
      continue;
    }
    // An empty side (not written yet) is a blank space, so "100 over nothing" still reads as a division.
    const side = (symbols: ClassifiedSymbol[]) => (symbols.length > 0 ? layoutSymbols(symbols, opts) : "\\phantom{0}");
    fractionSlots.push({ cx: bar.box.cx, latex: `\\frac{${side(above)}}{${side(below)}}` });
  }

  const remaining = ordered.filter((s) => !consumed.has(s));
  // Baseline = median vertical center among normal-sized symbols, so a
  // formula that's mostly superscripts still has something to measure against.
  const normalSized = remaining.filter((s) => s.box.height >= hMed * SMALL_SIZE_RATIO);
  const baseline = median((normalSized.length > 0 ? normalSized : remaining).map((s) => s.box.cy));

  const tokens: Token[] = [];
  let lastWasScript = false;
  /** The last token pushed was a plain digit - a number is being written (for thousands spaces). */
  let inNumber = false;
  let i = 0;
  while (i < remaining.length) {
    const wasInNumber = inNumber;
    inNumber = false;
    const s = remaining[i];
    const prev = i > 0 ? remaining[i - 1] : null;
    const gapToPrev = prev ? s.box.minX - prev.box.maxX : Infinity;
    const closeEnoughToPrev = gapToPrev < hMed * HORIZONTAL_GAP_RATIO;

    // Swedish decimal comma: a small mark low between two digits of a number -
    // whatever the classifier called it (scaled up on its own, a comma is a
    // "1"). A dot there is one too - both are accepted, a comma is written.
    const next = i + 1 < remaining.length ? remaining[i + 1] : null;
    if (prev && next && !lastWasScript && isDigit(prev) && isDigit(next) && isDecimalMark(s, prev, next, hMed)) {
      tokens.push({ cx: s.box.cx, latex: "{,}", openScript: null });
      i++;
      continue;
    }

    // A comma separating (0, 1, 3, 7 or coordinates): a small tick low on the
    // line - whatever the classifier called it, it isn't a subscript.
    if (prev && !lastWasScript && isCommaMark(s, prev, hMed, baseline)) {
      tokens.push({ cx: s.box.cx, latex: ",", openScript: null });
      i++;
      continue;
    }

    // A prime: a small tick up at the right of a function's letter (f′(x)).
    if (prev && tokens.length > 0 && isPrime(s, prev, hMed)) {
      tokens[tokens.length - 1].latex += "'";
      i++;
      continue;
    }

    // A degree sign is always raised onto what it follows ("90°").
    if (s.char === "°" && !s.latex) {
      if (tokens.length > 0) attachScript(tokens[tokens.length - 1], "^", "\\circ");
      else tokens.push({ cx: s.box.cx, latex: "{}^{\\circ}", openScript: null });
      lastWasScript = false;
      i++;
      continue;
    }

    // A dot on the line is a decimal point; one halfway up is multiplication.
    // The classifier can't tell them apart - it sees each dot scaled on its own
    // (and a dot tiny enough, scaled up, can come back as anything - a "+").
    // A dash stays a minus, however short next to tall writing (2 - a fraction's 6/4 makes the line tall).
    const dash = s.char === "-" && s.box.width >= s.box.height * 3 && s.box.width >= hMed * 0.1;
    const tinyMark = !dash && Math.max(s.box.width, s.box.height) < hMed * 0.2;
    if ((s.char === "." || s.char === "·" || tinyMark) && !s.latex && !s.struck) {
      const raisedDot = s.box.cy < baseline + hMed * 0.25;
      tokens.push({ cx: s.box.cx, latex: raisedDot ? "\\cdot" : ".", openScript: null });
      lastWasScript = false;
      i++;
      continue;
    }

    const name = functionNameAt(remaining, i, hMed);
    if (name) {
      tokens.push({ cx: s.box.cx, latex: `\\${name.name}`, openScript: null });
      lastWasScript = false;
      i += name.length;
      continue;
    }

    if (s.char === "^" && i + 1 < remaining.length && tokens.length > 0) {
      attachScript(tokens[tokens.length - 1], "^", latexToken(remaining[i + 1]));
      lastWasScript = true;
      i += 2;
      continue;
    }

    // A question without powers (opts.scripts off): nothing is raised or lowered - every symbol is on the line.
    const isSmall = opts.scripts && s.box.height < hMed * SMALL_SIZE_RATIO;
    // Signs are small by nature and often drawn a little off the line - that
    // doesn't make them scripts (regression: "∛27 + 2√3" put the "+" in a
    // subscript). The one raised sign kept is "-", for a negative exponent (x⁻¹).
    const isSign = NON_SCRIPT_CHARS.has(s.char);
    const isRaised = isSmall && (!isSign || s.char === "-") && s.box.cy < baseline - hMed * SCRIPT_OFFSET_RATIO;
    const isLowered = isSmall && !isSign && s.box.cy > baseline + hMed * SCRIPT_OFFSET_RATIO;
    // Relative test against the symbol right before it: the page-wide size
    // test above misses an exponent on a short letter (a "²" on an "x" is
    // often nearly as tall as the x itself, so it isn't "small" next to the
    // page's tallest digit). What gives it away is position - it sits wholly
    // above the base's middle, and is no bigger than the base.
    const scriptable = opts.scripts && prev !== null && !NON_SCRIPT_CHARS.has(s.char) && !NON_SCRIPT_CHARS.has(prev.char);
    const sitsAbovePrev = scriptable && !lastWasScript && s.box.maxY < prev.box.cy && s.box.height <= prev.box.height * 1.1;
    // The next digit of a multi-digit exponent lines up with the script digit before it rather than with the base.
    const continuesScript = scriptable && lastWasScript && Math.abs(s.box.cy - prev.box.cy) < prev.box.height * 0.35;

    // Kort division's remainder notes: a small raised digit (or two) BETWEEN
    // two digits of a number, tucked up against the next one ("6²88" for
    // 688/4 = 172), belongs to that next digit - it's the remainder carried
    // into it, written as a prescript - not an exponent on the digit before.
    // An exponent ends a number ("10²"), so it never has a digit right after.
    if ((isRaised || sitsAbovePrev) && isDigit(s) && prev && isDigit(prev) && !lastWasScript) {
      let k = i;
      while (k < remaining.length && isDigit(remaining[k]) && remaining[k].box.height < hMed * SMALL_SIZE_RATIO && remaining[k].box.cy < baseline) k++;
      const next = remaining[k];
      if (next && isDigit(next) && next.box.height >= hMed * SMALL_SIZE_RATIO && next.box.minX - remaining[k - 1].box.maxX < hMed * 0.5) {
        const note = remaining.slice(i, k).map(latexToken).join("");
        tokens.push({ cx: next.box.cx, latex: `{}^{${note}}${latexToken(next)}`, openScript: null });
        lastWasScript = false;
        i = k + 1;
        continue;
      }
    }

    if ((isRaised || isLowered || sitsAbovePrev || continuesScript) && tokens.length > 0 && closeEnoughToPrev) {
      const last = tokens[tokens.length - 1];
      const op = continuesScript && last.openScript ? last.openScript : isLowered ? "_" : "^";
      attachScript(last, op, latexToken(s));
      lastWasScript = true;
      i++;
      continue;
    }

    // Swedish thousands: "12 500" - a wider gap before a group of exactly three digits is a space in one number.
    if (prev && wasInNumber && !lastWasScript && isThousandsGap(remaining, i, hMed)) tokens.push({ cx: (prev.box.maxX + s.box.minX) / 2, latex: "\\,", openScript: null });
    tokens.push({ cx: s.box.cx, latex: latexToken(s), openScript: null });
    lastWasScript = false;
    inNumber = isDigit(s);
    i++;
    continue;
  }

  const allSlots: { cx: number; latex: string }[] = [...tokens, ...fractionSlots];
  allSlots.sort((a, b) => a.cx - b.cx);
  return allSlots.map((t) => t.latex).join(" ");
}

/**
 * Symbols whose reading the page around them settles, however unsure the
 * classifier was about them on their own: letters of a function name ("5in"
 * is sin), a dot (its height says decimal or times), and a bracket with its
 * partner on the line. The page doesn't ask about these ("Menade du?").
 */
export function settledByContext(symbols: ClassifiedSymbol[]): Set<ClassifiedSymbol> {
  const settled = new Set<ClassifiedSymbol>();
  const plain = symbols.filter((s) => !s.latex && s.char !== "∫");
  if (plain.length === 0) return settled;
  const hMed = Math.max(...plain.map((s) => Math.max(s.box.height, 1)));
  const sorted = [...plain].sort((a, b) => a.box.cx - b.box.cx);
  for (let i = 0; i < sorted.length; i++) {
    const name = functionNameAt(sorted, i, hMed);
    if (name) for (const s of sorted.slice(i, i + name.length)) settled.add(s);
  }
  // The pieces of a sign drawn in parts (⇒ as "=" and ">", ≤, %): whatever the classifier thought of each piece.
  const combined = new Set(combineCompoundSigns(plain));
  for (const s of plain) if (!combined.has(s)) settled.add(s);
  // Commas, and decimal commas: their place on the line says what they are.
  const normal = plain.filter((s) => s.box.height >= hMed * SMALL_SIZE_RATIO);
  const baseline = median((normal.length > 0 ? normal : plain).map((s) => s.box.cy));
  for (const s of plain) {
    // Its neighbours on its own line - on a page of several lines, the one before it left to right can be on another.
    const line = plain.filter((o) => o !== s && Math.abs(o.box.cy - s.box.cy) < hMed * 0.7);
    const prev = line.filter((o) => o.box.cx < s.box.cx).sort((a, b) => b.box.cx - a.box.cx)[0];
    const next = line.filter((o) => o.box.cx > s.box.cx).sort((a, b) => a.box.cx - b.box.cx)[0];
    const lineBaseline = prev ? prev.box.cy : baseline;
    if (prev && isCommaMark(s, prev, hMed, lineBaseline)) settled.add(s);
    if (prev && next && isDigit(prev) && isDigit(next) && isDecimalMark(s, prev, next, hMed)) settled.add(s);
  }
  for (const s of plain) {
    if (Math.max(s.box.width, s.box.height) < hMed * 0.2) settled.add(s);
    const partner = s.char === "(" ? ")" : s.char === ")" ? "(" : null;
    if (partner && plain.some((o) => o.char === partner && sameLine(o, s) && (partner === ")" ? o.box.cx > s.box.cx : o.box.cx < s.box.cx))) settled.add(s);
  }
  return settled;
}

/**
 * A page of writing that may run over several lines - an equation solved step
 * by step - laid out line by line, one under the other. A line is a band of
 * writing with clear space above and below it. A fraction or column sum spans
 * several such bands (numerator, bar, denominator), so a wide bar glues to it
 * every band just above and below it that lies within its span; a long
 * division's bracket or a root holds its whole height together by itself.
 */
export function layoutLines(symbols: ClassifiedSymbol[], opts: LayoutOptions = DEFAULT_LAYOUT): string {
  const lines = splitLines(symbols);
  if (lines.length <= 1) return layoutSymbols(symbols, opts);
  return `\\begin{gathered} ${lines.map((line) => layoutSymbols(line, opts)).join(" \\\\ ")} \\end{gathered}`;
}

function splitLines(symbols: ClassifiedSymbol[]): ClassifiedSymbol[][] {
  if (symbols.length === 0) return [];
  const heights = symbols.filter((s) => !s.latex && s.char !== "-").map((s) => s.box.height);
  const h = heights.length > 0 ? median(heights) : Math.max(...symbols.map((s) => s.box.height));
  // Bands: vertical runs of writing, split where there's a clear gap.
  const bands: { minY: number; maxY: number; members: ClassifiedSymbol[] }[] = [];
  for (const s of [...symbols].sort((a, b) => a.box.minY - b.box.minY)) {
    const last = bands[bands.length - 1];
    if (last && s.box.minY - last.maxY < h * 0.35) {
      last.members.push(s);
      last.maxY = Math.max(last.maxY, s.box.maxY);
    } else {
      bands.push({ minY: s.box.minY, maxY: s.box.maxY, members: [s] });
    }
  }
  // Glue what belongs together: the bands a wide bar spans (fractions, column sums).
  const glued = bands.map((_, i) => i);
  const find = (i: number): number => (glued[i] === i ? i : (glued[i] = find(glued[i])));
  const bars = symbols.filter((s) => s.char === "-" && !s.latex && (s.box.width > h * 1.2 || s.fractionBar || s.grid));
  for (const bar of bars) {
    const at = bands.findIndex((b) => b.members.includes(bar));
    const margin = bar.box.width * 0.2;
    const within = (b: (typeof bands)[number]) => b.members.every((s) => s.box.minX >= bar.box.minX - margin && s.box.maxX <= bar.box.maxX + margin);
    for (const dir of [-1, 1]) {
      for (let k = at + dir; k >= 0 && k < bands.length; k += dir) {
        const gap = dir < 0 ? bands[k + 1].minY - bands[k].maxY : bands[k].minY - bands[k - 1].maxY;
        if (gap > h * 1.2 || !within(bands[k])) break;
        glued[find(k)] = find(at);
      }
    }
  }
  const lines = new Map<number, ClassifiedSymbol[]>();
  bands.forEach((b, i) => lines.set(find(i), [...(lines.get(find(i)) ?? []), ...b.members]));
  return [...lines.values()].sort((a, b) => Math.min(...a.map((s) => s.box.minY)) - Math.min(...b.map((s) => s.box.minY)));
}

function isDigit(s: ClassifiedSymbol): boolean {
  return !s.latex && /^[0-9]$/.test(s.char);
}

/** Signs that are never a decimal mark, however small they're written - an "=" squeezed between two digits ("0=0") stays an "=". */
const NOT_DECIMAL = new Set(["-", "=", "≈", "≠", "<", ">", "≤", "≥", "+", "±"]);

/** Small, low on the line, and tight between two digits - a decimal comma (or point). */
function isDecimalMark(s: ClassifiedSymbol, prev: ClassifiedSymbol, next: ClassifiedSymbol, hMed: number): boolean {
  if (s.latex || NOT_DECIMAL.has(s.char)) return false;
  const digitHeight = Math.min(prev.box.height, next.box.height);
  const lineMiddle = (prev.box.cy + next.box.cy) / 2;
  return (
    s.box.height < digitHeight * 0.6 &&
    s.box.cy > lineMiddle + digitHeight * 0.15 &&
    s.box.minX - prev.box.maxX < hMed * 0.6 &&
    // Tight on the right as well: a comma with a space after it separates (0, 1, 3) - see isCommaMark.
    next.box.minX - s.box.maxX < hMed * 0.35
  );
}

/** What a comma's short tick comes back as from the classifier, scaled up on its own. */
const COMMA_LIKE = new Set([",", "1", ")", "/", "|", "("]);

/**
 * A comma: a narrow tick that starts at the bottom of the writing before it
 * and hangs below it (regression, from MathWriting's "0,1,3,7,15": each
 * comma, read as "1", became a subscript). Real commas are as much as half
 * the line tall - what sets them apart from a subscript is that a subscript
 * starts higher, level with the middle of its letter.
 */
function isCommaMark(s: ClassifiedSymbol, prev: ClassifiedSymbol, hMed: number, baseline: number): boolean {
  if (s.latex || s.struck || prev.latex || !COMMA_LIKE.has(s.char)) return false;
  return (
    s.box.width < hMed * 0.3 &&
    s.box.height < hMed * 0.6 &&
    Math.abs(prev.box.cy - baseline) < hMed * 0.4 &&
    s.box.minY > prev.box.maxY - prev.box.height * 0.3 &&
    s.box.maxY > prev.box.maxY + hMed * 0.12 &&
    s.box.minX - prev.box.maxX < hMed * 0.5
  );
}

/** Letters a prime goes on: f′(x), g′(x), y′. */
const PRIMED = new Set(["f", "g", "y"]);

/** A short tick, small and up at the top right of f, g or y - however the classifier read the tick. */
function isPrime(s: ClassifiedSymbol, prev: ClassifiedSymbol, hMed: number): boolean {
  if (s.latex || prev.latex || !PRIMED.has(prev.char)) return false;
  return s.box.height < hMed * 0.45 && s.box.width < s.box.height && s.box.maxY < prev.box.cy && s.box.minX - prev.box.maxX < hMed * 0.4;
}

/**
 * `remaining[i]` is a digit starting a group of exactly three after a wider
 * gap than the digits around it - Swedish thousands grouping (12 500,
 * 1 000 000), a space inside one number rather than two numbers.
 */
function isThousandsGap(remaining: ClassifiedSymbol[], i: number, hMed: number): boolean {
  const s = remaining[i];
  const prev = remaining[i - 1];
  if (!isDigit(s) || !isDigit(prev) || !sameLine(s, prev)) return false;
  const gap = s.box.minX - prev.box.maxX;
  if (gap < hMed * 0.25 || gap > hMed) return false;
  const tight = (a: ClassifiedSymbol, b: ClassifiedSymbol) => isDigit(b) && sameLine(a, b) && b.box.minX - a.box.maxX < gap * 0.6;
  let after = 1;
  while (i + after < remaining.length && tight(remaining[i + after - 1], remaining[i + after])) after++;
  let before = 1;
  while (i - 1 - before >= 0 && tight(remaining[i - 1 - before], remaining[i - before])) before++;
  return after === 3 && before <= 3;
}

/** A mark much smaller than the page's writing in both directions - a dot, however the classifier read it. */
function isDot(s: ClassifiedSymbol, hMed: number): boolean {
  return !s.latex && Math.max(s.box.width, s.box.height) < hMed * 0.3;
}

/** `a` sits right on top of `b`, across mostly the same span. */
function sitsOnTopOf(a: BoundingBox, b: BoundingBox): boolean {
  const overlap = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const gap = b.minY - a.maxY;
  return overlap >= Math.min(a.width, b.width) * 0.5 && gap >= -a.height * 0.15 && gap <= a.height * 0.6;
}

/**
 * `head` is an arrowhead on the right end of `shaft`: it starts at (or just
 * past, or a little over) the shaft's end, is level with it, and is at least
 * about as tall as the shaft - a ">" written after an "=" with a gap is
 * still two signs.
 */
function isArrowHead(shaft: BoundingBox, head: BoundingBox): boolean {
  const gap = head.minX - shaft.maxX;
  const level = Math.abs(head.cy - shaft.cy) < Math.max(head.height, shaft.height) * 0.35;
  return gap < shaft.width * 0.25 && head.cx > shaft.cx && level && head.height >= shaft.height * 0.8 && head.minY <= shaft.cy && head.maxY >= shaft.cy;
}

/** A box turned left-right (about x = 0) - so the "<" at an arrow's start can be tested as a head. */
function mirrorX(b: BoundingBox): BoundingBox {
  return { ...b, minX: -b.maxX, maxX: -b.minX, cx: -b.cx };
}

const UNDERLINED: Record<string, string> = { "<": "≤", ">": "≥" };
const ROUND_MARKS = new Set(["0", "°"]);

/**
 * Signs whose pieces were written far enough apart to be segmented (and
 * classified) separately: an underlined "<" or ">" (≤, ≥), and a
 * "/" with a small circle up-left and another down-right (%). Written close
 * together, the same pieces are one segment the classifier knows as a whole.
 */
function combineCompoundSigns(symbols: ClassifiedSymbol[]): ClassifiedSymbol[] {
  let current = symbols;
  for (const line of symbols.filter((s) => s.char === "-" && !s.latex && !s.fractionBar && !s.grid)) {
    // A short line only - a column sum's line is far wider than the "+" beside it.
    const sign = current.find(
      (s) => UNDERLINED[s.char] && !s.latex && line.box.width >= s.box.width * 0.5 && line.box.width <= s.box.width * 2.5 && sitsOnTopOf(s.box, line.box)
    );
    if (!sign || !current.includes(line)) continue;
    current = [...current.filter((s) => s !== sign && s !== line), { char: UNDERLINED[sign.char], box: unionBox([sign.box, line.box]) }];
  }
  // Arrows drawn as a shaft and a head (regression, from MathWriting: 36 of
  // 39 "⇒" came out as "= >"): a double shaft ("=") with a ">" right at its
  // end is ⇒, a single one ("-") is →, and a "<" at the start makes it ⇔.
  for (const shaft of symbols.filter((s) => (s.char === "=" || s.char === "-") && !s.latex && !s.fractionBar && !s.grid)) {
    const head = current.find((s) => s.char === ">" && !s.latex && isArrowHead(shaft.box, s.box));
    if (!head || !current.includes(shaft)) continue;
    // Its two shaft lines not paired into an "=": a second "-" beside this one, both within the head's height, is the other line.
    const twin =
      shaft.char === "-"
        ? current.find(
            (s) => s !== shaft && s.char === "-" && !s.latex && Math.abs(s.box.cx - shaft.box.cx) < shaft.box.width * 0.5 && s.box.cy >= head.box.minY && s.box.cy <= head.box.maxY && Math.abs(s.box.cy - shaft.box.cy) > shaft.box.height
          )
        : undefined;
    const double = shaft.char === "=" || !!twin;
    const tail = double ? current.find((s) => s.char === "<" && !s.latex && isArrowHead(mirrorX(shaft.box), mirrorX(s.box))) : undefined;
    const parts = [shaft, head, ...(twin ? [twin] : []), ...(tail ? [tail] : [])];
    const char = tail ? "⇔" : double ? "⇒" : "→";
    current = [...current.filter((s) => !parts.includes(s)), { char, box: unionBox(parts.map((p) => p.box)) }];
  }
  for (const slash of symbols.filter((s) => s.char === "/" && !s.latex)) {
    const b = slash.box;
    const round = current.filter((s) => ROUND_MARKS.has(s.char) && !s.latex && s.box.height < b.height * 0.6);
    const upperLeft = round.find((s) => s.box.cy < b.cy && s.box.cx < b.cx && s.box.maxY > b.minY - b.height * 0.2 && s.box.minX > b.minX - b.height * 0.6);
    const lowerRight = round.find((s) => s.box.cy > b.cy && s.box.cx > b.cx && s.box.minY < b.maxY + b.height * 0.2 && s.box.maxX < b.maxX + b.height * 0.6);
    if (!upperLeft || !lowerRight || !current.includes(slash)) continue;
    current = [...current.filter((s) => s !== slash && s !== upperLeft && s !== lowerRight), { char: "%", box: unionBox([slash.box, upperLeft.box, lowerRight.box]) }];
  }
  return current;
}

/** The symbols right beside `s` on its line (not above or below it), nearest on each side. */
function lineNeighbors(symbols: ClassifiedSymbol[], s: ClassifiedSymbol, hMed: number): { left?: ClassifiedSymbol; right?: ClassifiedSymbol } {
  const onLine = symbols.filter((o) => o !== s && Math.abs(o.box.cy - s.box.cy) < hMed * 0.5);
  const near = hMed * 0.6;
  const left = onLine.filter((o) => o.box.cx < s.box.cx && s.box.minX - o.box.maxX < near).sort((a, b) => b.box.cx - a.box.cx)[0];
  const right = onLine.filter((o) => o.box.cx > s.box.cx && o.box.minX - s.box.maxX < near).sort((a, b) => a.box.cx - b.box.cx)[0];
  return { left, right };
}

/** `a` and `b` are written on the same line (their heights overlap). */
function sameLine(a: ClassifiedSymbol, b: ClassifiedSymbol): boolean {
  return Math.min(a.box.maxY, b.box.maxY) - Math.max(a.box.minY, b.box.minY) > Math.min(a.box.height, b.box.height) * 0.3;
}

/**
 * The "1" before an unmatched ")" that is really its "(": a bracket is drawn
 * taller than the digits around it - a "1" isn't (regression, from
 * MathWriting's "4(1-x)" read as "411-x1"). The nearest such "1" with no
 * ")" between them. Null if there's none.
 */
function openedBy(close: ClassifiedSymbol, before: ClassifiedSymbol[]): ClassifiedSymbol | null {
  const digits = before.filter((o) => isDigit(o) && o.char !== "1");
  const digitHeight = digits.length > 0 ? median(digits.map((o) => o.box.height)) : close.box.height * 0.75;
  const candidates = before
    .filter((o) => !o.latex && o.char === "1" && o.box.height >= digitHeight * 1.15 && o.box.height >= close.box.height * 0.8)
    .sort((a, b) => b.box.cx - a.box.cx);
  const nearest = candidates[0];
  if (!nearest) return null;
  const between = before.some((o) => o.char === ")" && o.box.cx > nearest.box.cx);
  return between ? null : nearest;
}

/** One class, two letters (characters.json): the capital is the one written as tall as a digit. */
const CAPITAL_OF: Record<string, string> = { c: "C", v: "V", p: "P" };

/**
 * Written at capital height. A "p" also reaches that tall with its tail, so
 * it additionally has to stand on the line rather than hang below it.
 */
function writtenAsCapital(s: ClassifiedSymbol, symbols: ClassifiedSymbol[], hMed: number): boolean {
  // Measured against the digits on its line when there are any (brackets are drawn taller than the writing).
  const digits = symbols.filter((o) => isDigit(o) && sameLine(o, s));
  const capitalHeight = digits.length > 0 ? median(digits.map((o) => o.box.height)) : hMed;
  if (s.box.height < capitalHeight * 0.85) return false;
  if (s.char !== "p") return true;
  const onLine = symbols.filter((o) => o !== s && sameLine(o, s) && o.box.height >= hMed * 0.6 && o.char !== "(" && o.char !== ")");
  if (onLine.length === 0) return true;
  return s.box.maxY - median(onLine.map((o) => o.box.maxY)) < s.box.height * 0.2;
}

/**
 * Symbols the classifier gets right by shape but wrong by meaning - decided by
 * what's around them:
 *  - a "°" as tall as the writing isn't a degree sign but a "0"
 *  - x and × are one class: between two numbers it's the times sign ("3x4"),
 *    everywhere else the letter; an "×" with nothing on its right is an x
 *  - a ")" that closes nothing is a "1" - brackets come in pairs (this is
 *    what lets the youngest children's model have parentheses at all)
 *  - a lone "|" (no second one on its line to make an absolute value) is a "1"
 *  - c, v, p written as tall as a digit are C, V, P (one class per pair)
 */
function readLookalikes(symbols: ClassifiedSymbol[], hMed: number): ClassifiedSymbol[] {
  // A function name's letters are read as that name, whatever they'd be on their own ("c05" is cos, not C05).
  const inNames = new Set<ClassifiedSymbol>();
  const sorted = [...symbols].sort((a, b) => a.box.cx - b.box.cx);
  for (let i = 0; i < sorted.length; i++) {
    const name = functionNameAt(sorted, i, hMed);
    if (name) for (const s of sorted.slice(i, i + name.length)) inNames.add(s);
  }
  return symbols.map((s) => {
    if (s.latex || inNames.has(s)) return s;
    if (s.char === "°" && s.box.height >= hMed * SMALL_SIZE_RATIO) return { ...s, char: "0" };
    const { left, right } = lineNeighbors(symbols, s, hMed);
    if (s.char === "×" && (!right || NON_SCRIPT_CHARS.has(right.char))) return { ...s, char: "x" };
    if (s.char === "x" && left && right && (isDigit(left) || left.char === ")") && (isDigit(right) || right.char === "(")) return { ...s, char: "×" };
    if (s.char === ")") {
      const before = symbols.filter((o) => o.box.cx < s.box.cx && sameLine(o, s));
      const open = before.filter((o) => o.char === "(").length - before.filter((o) => o.char === ")").length;
      // No "(" for it - unless a "1" before it is the "(" the classifier missed (see openedBy).
      if (open <= 0 && !openedBy(s, before)) return { ...s, char: "1" };
    }
    if (s.char === "1") {
      const after = symbols.filter((o) => o.box.cx > s.box.cx && sameLine(o, s));
      const closer = after.find((o) => o.char === ")");
      if (closer && openedBy(closer, symbols.filter((o) => o.box.cx < closer.box.cx && sameLine(o, closer))) === s) return { ...s, char: "(" };
    }
    if (s.char === "|" && !symbols.some((o) => o !== s && o.char === "|" && sameLine(o, s))) return { ...s, char: "1" };
    if (CAPITAL_OF[s.char] && writtenAsCapital(s, symbols, hMed)) return { ...s, char: CAPITAL_OF[s.char] };
    return s;
  });
}

/**
 * "lim" with what's written under it (h → 0) as one symbol: \lim_{h \to 0}.
 * Its letters are found on their own line first, since the small writing
 * under them sits between them in left-to-right order.
 */
function collapseLimits(symbols: ClassifiedSymbol[], hMed: number, opts: LayoutOptions): ClassifiedSymbol[] {
  let current = symbols;
  for (const first of symbols.filter((s) => (s.char === "1" || s.char === "l") && !s.latex)) {
    if (!current.includes(first)) continue;
    const line = current.filter((o) => !o.latex && Math.abs(o.box.cy - first.box.cy) < hMed * 0.35).sort((a, b) => a.box.cx - b.box.cx);
    const name = functionNameAt(line, line.indexOf(first), hMed);
    if (name?.name !== "lim") continue;
    const run = line.slice(line.indexOf(first), line.indexOf(first) + 3);
    const box = unionBox(run.map((s) => s.box));
    const under = current.filter(
      (o) => !run.includes(o) && o.box.minY > box.maxY - box.height * 0.2 && o.box.minY < box.maxY + hMed && o.box.cx > box.minX - box.width * 0.4 && o.box.cx < box.maxX + box.width * 0.4
    );
    const latex = under.length > 0 ? `\\lim_{${layoutSymbols(under, opts)}}` : "\\lim";
    current = [...current.filter((o) => !run.includes(o) && !under.includes(o)), { char: "lim", latex, box: unionBox([...run, ...under].map((s) => s.box)) }];
  }
  return current;
}

/** An integral with its bounds - the small writing at its top and bottom right - as one symbol: \int_{a}^{b}. */
function collapseIntegrals(symbols: ClassifiedSymbol[], opts: LayoutOptions): ClassifiedSymbol[] {
  let current = symbols;
  for (const sign of symbols.filter((s) => s.char === "∫" && !s.latex)) {
    const b = sign.box;
    const near = (o: ClassifiedSymbol) => o !== sign && o.box.height < b.height * 0.45 && o.box.minX > b.cx - b.width * 0.2 && o.box.minX < b.maxX + b.height * 0.35;
    const upper = current.filter((o) => near(o) && o.box.cy < b.minY + b.height * 0.3);
    const lower = current.filter((o) => near(o) && o.box.cy > b.maxY - b.height * 0.3);
    const sub = lower.length > 0 ? `_{${layoutSymbols(lower, opts)}}` : "";
    const sup = upper.length > 0 ? `^{${layoutSymbols(upper, opts)}}` : "";
    current = [...current.filter((o) => o !== sign && !upper.includes(o) && !lower.includes(o)), { char: "∫", latex: `\\int${sub}${sup}`, box: b }];
  }
  return current;
}

/**
 * A function name spelled out starting at `remaining[i]`: its letters, or
 * the digits/signs they're read as (LETTER_LOOKALIKES), in a tight row on
 * one line. At least one has to be a real letter, so "5 · 1 · n" is only
 * "sin" because the n is a letter; a plain number ("19", "109") never is -
 * except that "lg" and "log" have no letter the recognizer knows, so there
 * the "9" must hang below the line like a "g" does, where a real 9 sits on it.
 * A "+" standing in for the "t" of "tan" must be shaped like one: rising
 * above the other letters and standing on the line, where a plus sign sits
 * inside the letters' height.
 * Returns the name and how many symbols it took.
 */
function functionNameAt(remaining: ClassifiedSymbol[], i: number, hMed: number): { name: string; length: number } | null {
  for (const name of FUNCTION_NAMES) {
    if (i + name.length > remaining.length) continue;
    const run = remaining.slice(i, i + name.length);
    let realLetters = 0;
    const matches = run.every((s, k) => {
      if (s.latex || s.struck) return false;
      if (s.char === name[k]) realLetters++;
      else if (LETTER_LOOKALIKES[name[k]] !== s.char) return false;
      if (k === 0) return true;
      const prev = run[k - 1];
      return s.box.minX - prev.box.maxX < hMed * 0.5 && Math.abs(s.box.cy - run[0].box.cy) < hMed * 0.4;
    });
    if (!matches) continue;
    const t = name.indexOf("t");
    if (t >= 0 && run[t].char === "+" && !standsLikeT(run[t], run)) continue;
    if (realLetters > 0) return { name, length: name.length };
    const g = name.indexOf("g");
    if (g >= 0 && hangsBelowLine(run[g], run)) return { name, length: name.length };
  }
  return null;
}

/** `s` reaches clearly above the rest of `run` (a "t"'s ascender) and stands on the same line. */
function standsLikeT(s: ClassifiedSymbol, run: ClassifiedSymbol[]): boolean {
  const others = run.filter((o) => o !== s);
  const top = Math.min(...others.map((o) => o.box.minY));
  const bottom = Math.max(...others.map((o) => o.box.maxY));
  const letterHeight = bottom - top;
  return s.box.minY < top - letterHeight * 0.2 && Math.abs(s.box.maxY - bottom) < letterHeight * 0.3;
}

/** `s` reaches clearly below the bottom of the rest of `run` - a "g"'s tail, not a "9" on the line. */
function hangsBelowLine(s: ClassifiedSymbol, run: ClassifiedSymbol[]): boolean {
  const others = run.filter((o) => o !== s);
  const bottom = Math.max(...others.map((o) => o.box.maxY));
  return s.box.maxY - bottom > s.box.height * 0.25;
}

function attachScript(token: Token, op: "^" | "_", char: string) {
  if (token.openScript === op) {
    token.latex = token.latex.slice(0, -1) + char + "}";
  } else {
    token.latex += `${op}{${char}}`;
    token.openScript = op;
  }
}
