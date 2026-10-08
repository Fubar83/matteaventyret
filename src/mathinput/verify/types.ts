/**
 * What the handwriting verifier reports: a verdict per written digit (or per
 * missing one), in page coordinates so the page can draw it right on top of
 * the ink, plus a one-line summary.
 *
 * Statuses follow the game engine's own (src/engine/types.ts CheckReport):
 * a följdfel ("followOnError") is a digit that's wrong only because of an
 * earlier mistake the child made - correct given their own earlier work - and
 * isn't counted as a new error, exactly as the game scores it.
 */
import type { BoundingBox } from "../segmentation";
import type { ClassifiedSymbol } from "../layout";

export type MarkStatus = "correct" | "wrong" | "followOnError" | "missing";

export interface CheckMark {
  status: MarkStatus;
  box: BoundingBox;
  /** What should have been written there, when it's wrong or missing. */
  expected?: string;
  /** Missing carries/borrow notes are shown, but don't count as errors - a child may carry in their head. */
  optional?: boolean;
}

export interface WorkCheck {
  /** e.g. "Subtraktion: 100 − 91" */
  title: string;
  /** The true answer, formatted, e.g. "9". */
  answer: string;
  allCorrect: boolean;
  errors: number;
  followOnErrors: number;
  /** Required digits not written yet (not counting optional notes). */
  missing: number;
  marks: CheckMark[];
  /** Anything the checker couldn't do, in plain Swedish (unreadable digit, unsupported case, no answer yet...). */
  notice?: string;
}

export function unionBox(symbols: ClassifiedSymbol[]): BoundingBox {
  const minX = Math.min(...symbols.map((s) => s.box.minX));
  const minY = Math.min(...symbols.map((s) => s.box.minY));
  const maxX = Math.max(...symbols.map((s) => s.box.maxX));
  const maxY = Math.max(...symbols.map((s) => s.box.maxY));
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY };
}

/** A box of the given size centered at (cx, cy) - where a missing digit would go. */
export function boxAt(cx: number, cy: number, w: number, h: number): BoundingBox {
  return { cx, cy, width: w, height: h, minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 };
}

/** Tallies marks into a WorkCheck. */
export function summarize(title: string, answer: string, marks: CheckMark[], notice?: string): WorkCheck {
  const errors = marks.filter((m) => m.status === "wrong").length;
  const followOnErrors = marks.filter((m) => m.status === "followOnError").length;
  const missing = marks.filter((m) => m.status === "missing" && !m.optional).length;
  return { title, answer, allCorrect: errors === 0 && followOnErrors === 0 && missing === 0 && !notice, errors, followOnErrors, missing, marks, notice };
}

/** Value of digits by place-value column. */
export function valueOf(cells: { col: number; digit: number | null }[]): number | null {
  if (cells.length === 0 || cells.some((c) => c.digit === null)) return null;
  return cells.reduce((sum, c) => sum + c.digit! * 10 ** c.col, 0);
}
