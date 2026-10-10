/**
 * The game's drawing board: one free drawing area (the same InkCanvas as the
 * handwriting-to-LaTeX page) with boxes where answers go, plus whatever the
 * question prints (the numbers of an uppställning, its operator and line, a
 * decimal comma). Each box is read on its own once the child pauses - see
 * readBox.ts - so recognition only ever has to tell digits apart, and the
 * box a digit is written in says which cell of the problem it answers.
 *
 * All geometry is in the board's own viewBox units.
 */
import type { Stroke } from "../../recognition/preprocess";

export interface DrawBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /**
   * "digit": a full-size answer box; "small": a carry / borrowed ten above a
   * column; "printed": a number the question prints (an uppställning's top
   * digit) - nothing is written in it, but it can be crossed out; "sign": an
   * operator the child writes (the "+" before adding a multiplication's
   * partial products), read by its shape rather than as a digit.
   */
  kind: "digit" | "small" | "printed" | "sign";
  /** For "printed": the digit shown. */
  text?: string;
  /** For "printed": a digit that is only thought of - the 0 that makes 3,5 into 3,50 under 1,25 - drawn faint and dashed. */
  faint?: boolean;
  /** How many digits the box takes: 2 for a borrowed "10", or a result box that can take a whole column sum ("15"). */
  maxDigits?: 1 | 2;
  /** A straight line through it counts as crossing it out. */
  strikeable?: boolean;
  /** On a guided board: the step (its index) that first needs this - it isn't drawn before then. Left out: there from the start. */
  from?: number;
}

export interface PrintedText {
  x: number;
  y: number;
  text: string;
  size: number;
  /** On a guided board: the step (its index) that first needs this - it isn't drawn before then. Left out: there from the start. */
  from?: number;
}

export interface PrintedLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** On a guided board: the step (its index) that first needs this - it isn't drawn before then. Left out: there from the start. */
  from?: number;
}

export interface BoardLayout {
  width: number;
  height: number;
  boxes: DrawBox[];
  texts: PrintedText[];
  lines: PrintedLine[];
}

/** The layout as far as step `step` of a guided walk: what only a later step needs (`from`) is left out until then. */
export function revealedAt(layout: BoardLayout, step: number): BoardLayout {
  const shown = (e: { from?: number }) => (e.from ?? 0) <= step;
  return { ...layout, boxes: layout.boxes.filter(shown), texts: layout.texts.filter(shown), lines: layout.lines.filter(shown) };
}

/** What a box's ink was read as. */
export type BoxReading =
  /** `mirrored`: which digits were written backwards (a mirrored 3) - still that digit. */
  | { kind: "digits"; digits: number[]; mirrored?: boolean[] }
  /** Not sure enough: the most likely readings, best first - the child picks. */
  | { kind: "unsure"; guesses: number[][] }
  /** A line crossing the box out. `strokes` is the line itself. */
  | { kind: "strike"; strokes: Stroke[] }
  /** Ink that can't be an answer here (writing on a printed number). */
  | { kind: "invalid"; strokes: Stroke[] }
  /** The box's ink was erased. */
  | { kind: "empty" }
  /** A "sign" box's ink: whether it's a plus sign (two strokes crossing, one across and one up and down). */
  | { kind: "sign"; plus: boolean; strokes: Stroke[] };

export type BoxStatus = "correct" | "wrong" | "followOn";
