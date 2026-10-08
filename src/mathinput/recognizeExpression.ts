/**
 * Glues the pipeline together: segment the page's strokes into candidate
 * symbols, classify each one with the shared handwriting recognizer (the
 * same model/preprocessing the game uses - see src/recognition/), then lay
 * the results out into LaTeX.
 */
import { detectLine } from "../detect/lineDetection";
import { DIGIT_INDICES, type ModelId } from "../recognition/labels";
import { WRITING_LEVELS, type WritingLevel } from "../recognition/levels";
import type { RecognitionProfile } from "../recognition/profiles";
import { hasSizePrior, sizeWeights, symbolContext } from "../recognition/sizePrior";
import { rerank } from "./rerank";
import { recognizeDigitStrokes, recognizeStrokes, strokeFactors } from "../recognition/recognizer";
import type { Stroke } from "../recognition/preprocess";
import { layoutLines, layoutSymbols, settledByContext, type ClassifiedSymbol } from "./layout";
import { findDivisionBracket, isDividendPart, isDivisorPart, type DivisionBracket } from "./divisionBracket";
import { checkGlyph, looksLikeOne, middleBulge } from "./glyphChecks";
import { verifyWork, type WorkCheck } from "./verify";
import { findRadicalBar, isUnderBar, type RadicalBar } from "./radical";
import { isCrossedDiagonalPair, isFlatDash, segmentSymbols, type SegmentedSymbol } from "./segmentation";
import { boxFromCorners } from "./strokeGeometry";
import { mergeByBox } from "./templates";
import { decodeInOrder, type OrderProblem } from "./orderDecode";

export interface RecognizedSymbol {
  char: string;
  confident: boolean;
  /** The most likely readings, best first (`char` among them) - offered when the page asks "Menade du?". */
  alternatives: string[];
  /** Each alternative's probability among the allowed characters (same order) - for choosing by context (rerank.ts). */
  scores?: number[];
  /** The ink this symbol was read from. */
  strokes: Stroke[];
  /** Read as the writer chose (a Pin), not by the recognizer. */
  pinned?: boolean;
  /** Not written the way it's taught (a profile's strictOrder) - the child is shown how. */
  orderProblem?: OrderProblem;
  box: SegmentedSymbol["box"];
  radical?: RadicalBar;
  bracket?: DivisionBracket;
  struck?: boolean;
}

export interface ExpressionResult {
  latex: string;
  symbols: RecognizedSymbol[];
  /** Grading of any written-out arithmetic on the page (column work, divisions) - see verify/. */
  checks: WorkCheck[];
}

export interface RecognizeOptions {
  /**
   * Symbols a writing template already printed on the page (its line,
   * operator, bracket - see templates.ts), laid out and verified together
   * with the ink.
   */
  printed?: ClassifiedSymbol[];
  /**
   * The ink can only be digits (plus crossing-out lines, and minus signs /
   * underlines in a long division) - true in a writing template, where every
   * operator and line is printed. Each symbol is then classified among the
   * ten digits only, so a digit can never come back as a letter or sign.
   */
  digitsOnly?: boolean;
  /**
   * The writer's own answers to "Menade du?": a symbol made of exactly these
   * strokes is read as `char`. Adding to or erasing any of its ink makes it a
   * different symbol, so the pin stops applying and it's read afresh.
   */
  pins?: readonly Pin[];
  /**
   * Who's writing (levels.ts): picks the model, and narrows free writing to
   * that level's characters. Defaults to gymnasiet - everything.
   */
  level?: WritingLevel;
  /**
   * The question's own recognition profile (recognition/profiles.ts): its
   * model and characters instead of the level's, and whether superscripts
   * and subscripts are read at all. Free writing only.
   */
  profile?: Pick<RecognitionProfile, "model" | "chars" | "scripts"> & Partial<Pick<RecognitionProfile, "strictOrder">>;
  /** The numbers the question gives (its measurements, its task) - a reading with them in is a little more likely (rerank.ts). */
  contextNumbers?: readonly number[];
  /** Which of the context steps run - all of them by default; the benchmarks switch them one at a time. */
  tweaks?: Partial<RecognitionTweaks>;
}

/**
 * The steps beyond reading each symbol on its own picture:
 *  - sizePrior: weigh each symbol's guesses by its size and height on its line (recognition/sizePrior.ts)
 *  - resegment: an unsure symbol tried split in two, or merged with an unsure neighbour
 *  - rerank: the least certain symbols' guesses chosen together, by which reads as maths (rerank.ts)
 *  - strokes: weigh each symbol's guesses by how it was drawn (the stroke model, recognizer.ts's strokeFactors)
 *  - segmenter: which strokes make one symbol decided by the learned net (strokePairs.ts) rather than ink-distance rules - free writing only
 *  - order: for a profile with strictOrder, the strokes read in drawing order, cut and read together (orderDecode.ts)
 */
export interface RecognitionTweaks {
  sizePrior: boolean;
  resegment: boolean;
  rerank: boolean;
  strokes: boolean;
  segmenter: boolean;
  order: boolean;
}

export const DEFAULT_TWEAKS: RecognitionTweaks = { sizePrior: true, resegment: true, rerank: true, strokes: true, segmenter: true, order: true };

export interface Pin {
  strokes: readonly Stroke[];
  char: string;
}

/** How many readings a symbol offers when asked about. */
const MAX_ALTERNATIVES = 3;

function sameInk(a: readonly Stroke[], b: readonly Stroke[]): boolean {
  return a.length === b.length && a.every((s) => b.includes(s));
}

/** The labels in order of probability, `first` in front. */
function ranked(first: string, probs: readonly number[], labels: readonly string[], among?: readonly number[]): string[] {
  const order = [...(among ?? probs.map((_, i) => i))].sort((x, y) => probs[y] - probs[x]).map((i) => labels[i]);
  return [first, ...order.filter((c) => c !== first)].slice(0, MAX_ALTERNATIVES);
}

const EMPTY: ExpressionResult = { latex: "", symbols: [], checks: [] };

/** Bowed at least this much (middleBulge) is a bracket for sure - a "1", flag and all, stays under 0.03. */
const BRACKET_BULGE = 0.12;
/** Bowed this much is a bracket too, if it's also drawn taller than the writing around it (real brackets are often nearly straight). */
const TALL_BRACKET_BULGE = 0.05;

/**
 * "(" or ")" when the stroke is one tall, bowed curve - which way it bows says
 * which: clearly bowed, or a little bowed and taller than the rest of the
 * line (a bracket is drawn around what it holds; a "1" is as tall as the digits).
 */
function bracketByShape(seg: SegmentedSymbol, segments: SegmentedSymbol[]): "(" | ")" | null {
  if (seg.strokes.length !== 1 || seg.box.height < seg.box.width * 2) return null;
  const bulge = middleBulge(seg.strokes);
  if (bulge === null) return null;
  const heights = segments.filter((o) => o !== seg && o.box.height > 4).map((o) => o.box.height).sort((a, b) => a - b);
  const typical = heights.length > 0 ? heights[Math.floor(heights.length / 2)] : seg.box.height;
  const tall = seg.box.height >= typical * 1.2;
  if (Math.abs(bulge) < (tall ? TALL_BRACKET_BULGE : BRACKET_BULGE)) return null;
  return bulge > 0 ? ")" : "(";
}

/** Settled by geometry alone - nothing to ask about. */
function known(seg: SegmentedSymbol, char: string): RecognizedSymbol {
  return { char, confident: true, alternatives: [char], strokes: seg.strokes, box: seg.box, struck: seg.struck };
}

/** Each alternative's probability among the candidates - what rerank.ts weighs them by. */
function scoresOf(alternatives: readonly string[], probs: readonly number[], labels: readonly string[], candidates?: readonly number[]): number[] {
  const mass = candidates ? candidates.reduce((sum, i) => sum + (probs[i] ?? 0), 0) : 1;
  return alternatives.map((c) => {
    const i = labels.indexOf(c);
    return i >= 0 && mass > 0 ? probs[i] / mass : 0;
  });
}

/** Free writing: anything in the character set, with geometry settling lines, roots and division brackets. */
async function classifyFree(
  seg: SegmentedSymbol,
  segments: SegmentedSymbol[],
  spec: { model: ModelId; chars: ReadonlySet<string> },
  useSizePrior = false,
  useStrokes = false
): Promise<RecognizedSymbol> {
  if (seg.knownChar) return known(seg, seg.knownChar);
  // A straight, flat stroke is a bar or a minus by geometry alone - no
  // need to trust the classifier with a fraction bar or the line under a
  // column sum, however long.
  if (detectLine(seg)) return known(seg, "-");
  // A root sign is settled by its shape plus what's written under its
  // bar - see radical.ts for why the classifier alone isn't trusted with
  // a long-barred root. Needing something under the bar keeps a flat-
  // topped "7" or "5" from qualifying.
  // Same idea for a long division's bracket (divisionBracket.ts): the
  // shape, plus a dividend under its bar and a divisor beside its stem.
  const bracket = findDivisionBracket(seg.strokes, seg.box);
  if (bracket && segments.some((o) => o !== seg && isDividendPart(bracket, o.box)) && segments.some((o) => o !== seg && isDivisorPart(bracket, o.box))) {
    return { ...known(seg, "⟌"), bracket };
  }
  const bar = findRadicalBar(seg.strokes, seg.box);
  if (bar && segments.some((other) => other !== seg && isUnderBar(bar, seg.box, other.box))) {
    return { ...known(seg, "√"), radical: bar };
  }
  // What the classifier's 28x28 picture can't show: its size and height next to the rest of its line,
  // and how it was drawn (the stroke model).
  const strokes = useStrokes ? await strokeFactors(seg.strokes) : null;
  // The full model only: the basic model's guesses are spread more evenly (it's trained to forgive), and
  // the prior then pushes too hard - measured, it lost exact readings on the åk 1-6 profiles (31% -> 26%).
  const sized = useSizePrior && hasSizePrior() && spec.model === "full";
  // (Matching the taught paths too - pathMatch.ts's templateFactors - was measured here: 37.1% -> 36.5% exact on the
  // strict profiles' real writing, so it's left to Skrivskolan, where the taught paths are what's being written.)
  const weightsFor =
    sized || strokes
      ? (labels: readonly string[]) => {
          const { relH, dy } = symbolContext(seg.box, segments.map((s) => s.box));
          const size = sized ? sizeWeights(labels, relH, dy) : labels.map(() => 1);
          return labels.map((c, i) => size[i] * (strokes?.get(c) ?? 1));
        }
      : undefined;
  const result = await recognizeStrokes(seg.strokes, undefined, spec.model, spec.chars, weightsFor);
  let char = checkGlyph(result.char, seg.strokes, result.probs, result.labels);
  // A tall stroke clearly bowed to one side is a bracket, not a "1" - the
  // classifier mixes them up (regression, from MathWriting's "f(y)" read as "f11").
  const bowed = char === "1" && spec.chars.has("(") ? bracketByShape(seg, segments) : null;
  if (bowed) char = bowed;
  // A correction by the ink's own shape (a straight upright stroke is a "1", a bowed one a bracket) is as sure as the shape.
  const shapedOne = char === "1" && looksLikeOne(seg.strokes);
  const sure = char === result.char ? result.confident || shapedOne : shapedOne || char === bowed;
  const alternatives = ranked(char, result.probs, result.labels, result.candidates);
  return {
    char,
    confident: sure,
    alternatives,
    // A correction by shape is as sure as the shape: its choice is the only one worth weighing.
    scores: char === result.char ? scoresOf(alternatives, result.probs, result.labels, result.candidates) : undefined,
    strokes: seg.strokes,
    box: seg.box,
    struck: seg.struck,
  };
}

/** A segment made of `strokes`, with their box. */
function segmentOf(strokes: Stroke[]): SegmentedSymbol {
  const pts = strokes.flat();
  const minX = Math.min(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxX = Math.max(...pts.map((p) => p.x));
  const maxY = Math.max(...pts.map((p) => p.y));
  return { strokes, box: { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY } };
}

/** The best guess's probability - how sure a reading is, to compare a split or merge against. */
const sureness = (r: RecognizedSymbol) => r.scores?.[0] ?? (r.confident ? 1 : 0);

/** A symbol's strokes cut in two at the widest gap between them, left to right - or null if they overlap all the way. */
function splitInTwo(strokes: Stroke[]): [Stroke[], Stroke[]] | null {
  if (strokes.length < 2) return null;
  const sorted = strokes.map((s) => ({ s, box: segmentOf([s]).box })).sort((a, b) => a.box.cx - b.box.cx);
  let bestGap = 0;
  let at = -1;
  for (let k = 1; k < sorted.length; k++) {
    const leftEdge = Math.max(...sorted.slice(0, k).map((x) => x.box.maxX));
    const gap = sorted[k].box.minX - leftEdge;
    if (gap > bestGap) {
      bestGap = gap;
      at = k;
    }
  }
  if (at < 0) return null;
  return [sorted.slice(0, at).map((x) => x.s), sorted.slice(at).map((x) => x.s)];
}

/**
 * Two dashes stacked close with nothing between are an "=" written quickly -
 * bars slanted or offset too far to be paired while cutting the ink
 * (segmentation.ts's pairEqualsBars wants them flat and mostly overlapping).
 * Read as two minus signs, "x=5" came out "x--5". Once the classifier has
 * called both a dash, overlapping at all and within a bar's length of each
 * other is enough: two minus signs are never written stacked.
 */
export function joinStackedDashes(
  segments: SegmentedSymbol[],
  read: RecognizedSymbol[],
  pinned: (seg: SegmentedSymbol) => boolean = () => false
): { segments: SegmentedSymbol[]; read: RecognizedSymbol[] } {
  const isDash = (i: number) => read[i].char === "-" && !read[i].struck && !segments[i].knownChar && !pinned(segments[i]);
  const used = new Set<number>();
  const joined: { segment: SegmentedSymbol; symbol: RecognizedSymbol }[] = [];
  for (let i = 0; i < read.length; i++) {
    if (!isDash(i) || used.has(i)) continue;
    for (let j = 0; j < read.length; j++) {
      if (j === i || !isDash(j) || used.has(j)) continue;
      const [top, bottom] = read[i].box.cy <= read[j].box.cy ? [read[i].box, read[j].box] : [read[j].box, read[i].box];
      const shorter = Math.min(top.width, bottom.width);
      const longer = Math.max(top.width, bottom.width);
      const overlap = Math.min(top.maxX, bottom.maxX) - Math.max(top.minX, bottom.minX);
      const gap = bottom.minY - top.maxY;
      if (shorter < longer * 0.4 || overlap <= 0 || gap < 0 || gap > longer * 1.3) continue;
      const left = Math.min(top.minX, bottom.minX);
      const right = Math.max(top.maxX, bottom.maxX);
      const between = read.some((s, k) => k !== i && k !== j && s.box.cx > left && s.box.cx < right && s.box.cy > top.maxY && s.box.cy < bottom.minY);
      if (between) continue;
      used.add(i).add(j);
      const strokes = [...segments[i].strokes, ...segments[j].strokes];
      const box = boxFromCorners(left, top.minY, right, bottom.maxY);
      joined.push({ segment: { strokes, box, knownChar: "=" }, symbol: { char: "=", confident: true, alternatives: ["="], strokes, box } });
      break;
    }
  }
  if (joined.length === 0) return { segments, read };
  const keep = read.map((_, i) => i).filter((i) => !used.has(i));
  return { segments: [...keep.map((i) => segments[i]), ...joined.map((x) => x.segment)], read: [...keep.map((i) => read[i]), ...joined.map((x) => x.symbol)] };
}

/**
 * Segmentation is by position alone, so touching digits can come out as one
 * symbol and a digit drawn in two pieces as two. Where the reading is unsure,
 * the other cut is tried too - an unsure symbol of several strokes split at
 * its widest gap, two unsure neighbours close together merged - and kept
 * when every piece of it reads surely and better than before.
 */
async function resegment(
  segments: SegmentedSymbol[],
  read: RecognizedSymbol[],
  classify: (seg: SegmentedSymbol, all: SegmentedSymbol[]) => Promise<RecognizedSymbol>
): Promise<{ segments: SegmentedSymbol[]; read: RecognizedSymbol[] }> {
  let segs = [...segments];
  let reads = [...read];

  // Splits.
  for (let i = 0; i < segs.length; i++) {
    const r = reads[i];
    if (r.confident || !r.scores || segs[i].knownChar || segs[i].struck) continue;
    const parts = splitInTwo(segs[i].strokes);
    if (!parts) continue;
    const pieces = parts.map(segmentOf);
    const context = [...segs.slice(0, i), ...pieces, ...segs.slice(i + 1)];
    const pieceReads = await Promise.all(pieces.map((p) => classify(p, context)));
    if (pieceReads.every((p) => p.confident && sureness(p) > sureness(r))) {
      segs = context;
      reads = [...reads.slice(0, i), ...pieceReads, ...reads.slice(i + 1)];
      i++;
    }
  }

  // Merges: neighbours on the same line, side by side and close, both unsure.
  const order = segs.map((_, i) => i).sort((a, b) => segs[a].box.cx - segs[b].box.cx);
  const drop = new Set<number>();
  const added: { seg: SegmentedSymbol; read: RecognizedSymbol }[] = [];
  for (let k = 1; k < order.length; k++) {
    const a = order[k - 1];
    const b = order[k];
    if (drop.has(a) || drop.has(b)) continue;
    const [ra, rb] = [reads[a], reads[b]];
    if (ra.confident || rb.confident || !ra.scores || !rb.scores || segs[a].knownChar || segs[b].knownChar) continue;
    const A = segs[a].box;
    const B = segs[b].box;
    const h = Math.max(A.height, B.height);
    const overlap = Math.min(A.maxY, B.maxY) - Math.max(A.minY, B.minY);
    if (overlap < Math.min(A.height, B.height) * 0.5 || B.minX - A.maxX > h * 0.25) continue;
    const merged = segmentOf([...segs[a].strokes, ...segs[b].strokes]);
    const context = [...segs.filter((_, i) => i !== a && i !== b), merged];
    const mr = await classify(merged, context);
    if (mr.confident && sureness(mr) > Math.max(sureness(ra), sureness(rb))) {
      drop.add(a);
      drop.add(b);
      added.push({ seg: merged, read: mr });
    }
  }
  if (drop.size > 0) {
    reads = [...reads.filter((_, i) => !drop.has(i)), ...added.map((x) => x.read)];
    segs = [...segs.filter((_, i) => !drop.has(i)), ...added.map((x) => x.seg)];
  }
  return { segments: segs, read: reads };
}

/**
 * Digits only (a writing template): the few non-digit shapes that can
 * occur are told apart by shape, and everything else is one of the ten digits.
 */
async function classifyDigit(seg: SegmentedSymbol): Promise<RecognizedSymbol> {
  if (seg.knownChar) return known(seg, seg.knownChar);
  // A minus sign or an underline (long division's work rows) - no digit is a single flat stroke.
  if (isFlatDash(seg.strokes) || detectLine(seg)) return known(seg, "-");
  // An "x" shape can't be written here - it's a "1" crossed out with a
  // diagonal line (a slanted "1" plus its strike are two crossing diagonals,
  // which segmentation's strike detection deliberately leaves together).
  if (isCrossedDiagonalPair(seg.strokes)) return { ...known(seg, "1"), struck: true };
  const result = await recognizeDigitStrokes(seg.strokes);
  // Only a digit-to-digit check can apply here (a narrow "0" the model called "8").
  const char = checkGlyph(String(result.digit), seg.strokes, result.probs, result.labels);
  const sure = char === String(result.digit) ? result.confident : char === "1" && looksLikeOne(seg.strokes);
  return { char, confident: sure, alternatives: ranked(char, result.probs, result.labels, DIGIT_INDICES), strokes: seg.strokes, box: seg.box, struck: seg.struck };
}

export async function recognizeExpression(strokes: Stroke[], options: RecognizeOptions = {}): Promise<ExpressionResult> {
  // Crossing out is only for column calculations in free writing; a template is all digits to cross out.
  const printed = options.printed ?? [];
  const tweaks = { ...DEFAULT_TWEAKS, ...options.tweaks };
  const learned = tweaks.segmenter && !options.digitsOnly && printed.length === 0;
  const segments = mergeByBox(segmentSymbols(strokes, { strikes: options.digitsOnly ? "always" : "inColumns", learned }), printed);
  // Nothing written yet: only a template whose printed parts make an
  // expression on their own (kort division's fraction bar and "=") has
  // anything to show - an empty column template's "+" and line don't.
  if (segments.length === 0 && !printed.some((p) => p.fractionBar)) return EMPTY;

  const pins = options.pins ?? [];
  const spec = options.profile ?? WRITING_LEVELS[options.level ?? 4];
  const free = (seg: SegmentedSymbol, all: SegmentedSymbol[]) => classifyFree(seg, all, spec, tweaks.sizePrior, tweaks.strokes);
  // Writing order as part of the input (åk 7 and up): the strokes are read in the order they were drawn - see orderDecode.ts.
  const inOrder =
    tweaks.order && options.profile?.strictOrder && !options.digitsOnly && printed.length === 0 && !segments.some((s) => s.struck)
      ? await decodeInOrder(strokes.filter((s) => s.length > 0), segments, free)
      : null;
  let segs = inOrder?.segments ?? segments;
  let read: RecognizedSymbol[] = inOrder?.read ?? (await Promise.all(segs.map((seg) => (options.digitsOnly ? classifyDigit(seg) : free(seg, segs)))));
  // Pinned ink ("Menade du?" answered) is never cut differently - the writer said what it is.
  const isPinned = (seg: SegmentedSymbol) => pins.some((p) => sameInk(p.strokes, seg.strokes));
  // Read in order, the cut is already chosen together with the readings - no stacked dashes to join or unsure symbols to re-cut.
  if (!options.digitsOnly && !inOrder) ({ segments: segs, read } = joinStackedDashes(segs, read, isPinned));
  if (!options.digitsOnly && !inOrder && tweaks.resegment && !segs.some(isPinned)) ({ segments: segs, read } = await resegment(segs, read, free));
  read = read.map((r, i) => {
    const pin = pins.find((p) => sameInk(p.strokes, segs[i].strokes));
    return pin ? { ...r, char: pin.char, confident: true, pinned: true } : r;
  });

  const toClassified = (s: RecognizedSymbol, char = s.char): ClassifiedSymbol => ({ char, box: s.box, radical: s.radical, bracket: s.bracket, struck: s.struck });
  // A template is one piece of work; free writing can run over several lines.
  const layout = { scripts: options.profile?.scripts ?? true };
  const lay = (cls: ClassifiedSymbol[]) => (options.digitsOnly ? layoutSymbols(cls) : layoutLines(cls, layout));

  // The least certain symbols' guesses, chosen together by which reads as maths.
  if (!options.digitsOnly && tweaks.rerank) {
    const chosen = rerank(read, (chars) => lay([...read.map((s, i) => toClassified(s, chars[i])), ...printed]), options.contextNumbers);
    read = read.map((s, i) => (chosen[i] === s.char ? s : { ...s, char: chosen[i], alternatives: [chosen[i], ...s.alternatives.filter((c) => c !== chosen[i])] }));
  }

  const written: ClassifiedSymbol[] = read.map((s) => toClassified(s));
  const classified: ClassifiedSymbol[] = [...written, ...printed];
  // What the page around it settles isn't asked about, however unsure the classifier was alone.
  const settled = settledByContext(classified);
  const symbols = read.map((s, i) => (!s.confident && settled.has(written[i]) ? { ...s, confident: true } : s));
  const latex = lay(classified);
  return { latex, symbols, checks: verifyWork(classified) };
}
