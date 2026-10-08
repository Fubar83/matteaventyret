/**
 * Grades handwritten column arithmetic (a ColumnWork from columnLayout.ts)
 * with the game's own engine wherever it covers the case, so a digit is
 * judged exactly the way the game would judge it - including följdfel:
 *
 *  - addition of two numbers        -> engine/methods/columnAdd  (result digits, minnessiffror)
 *  - subtraction                    -> engine/methods/columnSub  (result digits, crossed-out
 *                                      digits, borrowed tens "10", crossed-out tens)
 *  - multiplication by one digit    -> engine/methods/columnMul  (result digits, minnessiffror)
 *
 * and with small checkers of its own where the engine doesn't go yet: three
 * or more addends (the answer's digits) and multi-digit multipliers (each
 * partial product row, then the final sum - a sum that's right for the
 * child's own partial rows but wrong overall is a följdfel).
 *
 * The handwriting is turned into the engine's WrittenMap (cell id -> written
 * digit or "struck"), and each engine verdict is mapped back onto the ink it
 * came from. Missing carries/strikes/borrow notes are shown but never counted
 * as errors (a child may carry in their head); wrong ones are.
 */
import * as columnAdd from "../../engine/methods/columnAdd";
import * as columnMul from "../../engine/methods/columnMul";
import * as columnSub from "../../engine/methods/columnSub";
import { digitAt, digitsOf, formatSwedishNumber } from "../../engine/digits";
import type { CellGraph, CheckReport, WrittenMap } from "../../engine/types";
import type { ColumnNote, ColumnRow, ColumnWork } from "../columnLayout";
import { boxAt, summarize, unionBox, valueOf, type CheckMark, type WorkCheck } from "./types";

const OP_TITLE = { "+": "Addition", "-": "Subtraktion", "×": "Multiplikation" } as const;
const OP_SIGN = { "+": "+", "-": "−", "×": "·" } as const;

export function checkColumnWork(work: ColumnWork): WorkCheck | null {
  const firstLine = work.lines[0];
  if (firstLine === undefined || firstLine < 2) return null;
  const operandRows = work.rows.slice(0, firstLine);
  // A template's number not written yet (only its printed operator) - nothing to grade.
  if (operandRows.some((r) => r.cells.length === 0)) return null;
  // Rows between consecutive lines (and after the last one), skipping empty gaps.
  const sections: ColumnRow[][] = [];
  work.lines.forEach((from, k) => {
    const to = k + 1 < work.lines.length ? work.lines[k + 1] : work.rows.length;
    if (to > from) sections.push(work.rows.slice(from, to));
  });

  const operands = operandRows.map((r) => valueOf(r.cells));
  const title = `${OP_TITLE[work.operator]}: ${operands.map((v) => (v === null ? "?" : formatSwedishNumber(v))).join(` ${OP_SIGN[work.operator]} `)}`;
  if (operands.some((v) => v === null)) return summarize(title, "", [], "Kunde inte läsa alla siffror i talen.");
  const values = operands as number[];

  const ctx = new Context(work);
  try {
    if (work.operator === "+") return values.length === 2 ? ctx.engineAdd(title, values[0], values[1], sections) : ctx.manyAdd(title, values, sections);
    if (work.operator === "-") {
      if (values.length !== 2) return summarize(title, "", [], "Subtraktion med fler än två tal stöds inte ännu.");
      if (values[0] < values[1]) return summarize(title, formatSwedishNumber(values[0] - values[1]), [], "Svaret blir negativt - det stöds inte ännu.");
      return ctx.engineSub(title, values[0], values[1], sections);
    }
    if (values.length !== 2) return summarize(title, "", [], "Multiplikation med fler än två tal stöds inte ännu.");
    if (values[1] >= 1 && values[1] <= 9) return ctx.engineMul(title, values[0], values[1], sections);
    return ctx.longMul(title, values[0], values[1], sections);
  } catch (e) {
    return summarize(title, "", [], `Kunde inte kontrollera: ${(e as Error).message}`);
  }
}

class Context {
  private readonly work: ColumnWork;

  constructor(work: ColumnWork) {
    this.work = work;
  }

  /** Where a digit in `col` of `row` goes - for a missing one. */
  private slot(col: number, row: ColumnRow): CheckMark["box"] {
    return boxAt(this.work.anchorX - col * this.work.pitch, row.cy, this.work.pitch * 0.8, row.height);
  }

  /** Where a note above `col` of the top row goes. */
  private noteSlot(col: number): CheckMark["box"] {
    const top = this.work.rows[0];
    return boxAt(this.work.anchorX - col * this.work.pitch, top.cy - top.height * 0.85, this.work.pitch * 0.6, top.height * 0.5);
  }

  private topNotes(): ColumnNote[] {
    return this.work.notes.filter((n) => n.row === 0);
  }

  private noteValue(n: ColumnNote): number | null {
    return n.parts.every((p) => p.digit !== null) ? Number(n.parts.map((p) => p.digit).join("")) : null;
  }

  /** Engine verdict for one cell -> a mark on `box` (null for a verdict that doesn't need drawing). */
  private markFor(status: CheckReport["results"][number]["status"], box: CheckMark["box"], expected: string, optional = false): CheckMark | null {
    if (status === "notRequired") return null;
    if (status === "unattempted") return { status: "missing", box, expected, optional };
    return { status, box, expected: status === "correct" ? undefined : expected };
  }

  private expectedOf(graph: CellGraph, id: string): string {
    const v = graph.cells.find((c) => c.id === id)?.expected;
    return v === "struck" ? "stryk" : v === null || v === undefined ? "" : String(v);
  }

  /** The answer row: the last row after the last line. */
  private answerRow(sections: ColumnRow[][]): ColumnRow | null {
    const last = sections[sections.length - 1];
    return last ? last[last.length - 1] : null;
  }

  /** Result digits written beyond what the answer has: a leading zero is fine, anything else is wrong. */
  private extraResultMarks(row: ColumnRow, answer: number, checkedCols: Set<number>): CheckMark[] {
    return row.cells
      .filter((c) => !checkedCols.has(c.col) && c.col >= digitsOf(answer).length)
      .filter((c) => c.digit !== 0)
      .map((c) => ({ status: "wrong" as const, box: c.symbol.box, expected: "" }));
  }

  engineAdd(title: string, top: number, bottom: number, sections: ColumnRow[][]): WorkCheck {
    const answer = top + bottom;
    const row = this.answerRow(sections);
    if (!row) return summarize(title, formatSwedishNumber(answer), [], "Inget svar skrivet ännu.");
    const written: WrittenMap = {};
    for (const c of row.cells) if (c.digit !== null) written[`add-r${c.col}`] = c.digit;
    const carryNotes = new Map(this.topNotes().map((n) => [n.col, n]));
    for (const [col, n] of carryNotes) {
      const v = this.noteValue(n);
      if (col >= 1 && v !== null) written[`add-c${col - 1}`] = v;
    }
    const graph = columnAdd.buildGraph({ top, bottom });
    const report = columnAdd.checkAll({ top, bottom }, written);
    return summarize(title, formatSwedishNumber(answer), this.carryAndResultMarks(graph, report, row, carryNotes, "add", answer));
  }

  engineMul(title: string, top: number, bottom: number, sections: ColumnRow[][]): WorkCheck {
    const answer = top * bottom;
    const row = this.answerRow(sections);
    if (!row) return summarize(title, formatSwedishNumber(answer), [], "Inget svar skrivet ännu.");
    const written: WrittenMap = {};
    for (const c of row.cells) if (c.digit !== null) written[`mul-r${c.col}`] = c.digit;
    const carryNotes = new Map(this.topNotes().map((n) => [n.col, n]));
    for (const [col, n] of carryNotes) {
      const v = this.noteValue(n);
      if (col >= 1 && v !== null) written[`mul-c${col - 1}`] = v;
    }
    const graph = columnMul.buildGraph({ top, bottom });
    const report = columnMul.checkAll({ top, bottom }, written);
    return summarize(title, formatSwedishNumber(answer), this.carryAndResultMarks(graph, report, row, carryNotes, "mul", answer));
  }

  /** Shared by addition and single-digit multiplication: same cell shapes ("<p>-r<col>" results, "<p>-c<col>" carries shown above col+1). */
  private carryAndResultMarks(graph: CellGraph, report: CheckReport, row: ColumnRow, carryNotes: Map<number, ColumnNote>, prefix: string, answer: number): CheckMark[] {
    const marks: CheckMark[] = [];
    const checkedCols = new Set<number>();
    const usedNotes = new Set<number>();
    for (const r of report.results) {
      const cell = graph.cells.find((c) => c.id === r.cellId);
      if (!cell) continue;
      const expected = this.expectedOf(graph, r.cellId);
      if (r.cellId.startsWith(`${prefix}-r`)) {
        checkedCols.add(cell.col);
        const written = row.cells.find((c) => c.col === cell.col);
        const m = this.markFor(r.status, written ? written.symbol.box : this.slot(cell.col, row), expected);
        if (m) marks.push(m);
      } else {
        const note = carryNotes.get(cell.col);
        if (note) usedNotes.add(cell.col);
        if (r.status === "notRequired") {
          // No carry here - a written non-zero carry is wrong.
          if (note && this.noteValue(note) !== 0) marks.push({ status: "wrong", box: unionBox(note.parts.map((p) => p.symbol)), expected: "ingen minnessiffra" });
          continue;
        }
        const m = this.markFor(r.status, note ? unionBox(note.parts.map((p) => p.symbol)) : this.noteSlot(cell.col), expected, true);
        if (m) marks.push(m);
      }
    }
    for (const [col, n] of carryNotes) {
      if (!usedNotes.has(col)) marks.push({ status: "wrong", box: unionBox(n.parts.map((p) => p.symbol)), expected: "ingen minnessiffra" });
    }
    return [...marks, ...this.extraResultMarks(row, answer, checkedCols)];
  }

  engineSub(title: string, top: number, bottom: number, sections: ColumnRow[][]): WorkCheck {
    const answer = top - bottom;
    const topRow = this.work.rows[0];
    const row = this.answerRow(sections);
    const written: WrittenMap = {};
    for (const c of topRow.cells) if (c.struck) written[`sub-strike${c.col}`] = "struck";
    const notes = new Map(this.topNotes().map((n) => [n.col, n]));
    for (const [col, n] of notes) {
      const [tens, ones] = n.parts;
      if (tens?.digit != null) written[`sub-bt${col}-tens`] = tens.digit;
      if (ones?.digit != null) written[`sub-bt${col}-ones`] = ones.digit;
      // Crossing out any part of a borrowed "10" crosses out the ten - a quick dash often doesn't catch both digits cleanly.
      if (n.parts.some((p) => p.struck)) written[`sub-strikebt${col}`] = "struck";
    }
    if (row) for (const c of row.cells) if (c.digit !== null) written[`sub-r${c.col}`] = c.digit;

    const graph = columnSub.buildGraph({ top, bottom });
    const report = columnSub.checkAll({ top, bottom }, written);
    const marks: CheckMark[] = [];
    const seen = new Set<string>();
    const checkedCols = new Set<number>();
    for (const r of report.results) {
      if (seen.has(r.cellId)) continue;
      seen.add(r.cellId);
      const cell = graph.cells.find((c) => c.id === r.cellId);
      if (!cell) continue;
      const expected = this.expectedOf(graph, r.cellId);
      const note = notes.get(cell.col);
      const topCell = topRow.cells.find((c) => c.col === cell.col);
      let m: CheckMark | null = null;
      if (r.cellId.startsWith("sub-strikebt")) {
        m = this.markFor(r.status, note ? unionBox(note.parts.map((p) => p.symbol)) : this.noteSlot(cell.col), "stryk tian", true);
      } else if (r.cellId.startsWith("sub-strike")) {
        m = this.markFor(r.status, topCell ? topCell.symbol.box : this.slot(cell.col, topRow), "stryk", true);
      } else if (r.cellId.startsWith("sub-bt")) {
        const part = note?.parts[r.cellId.endsWith("-tens") ? 0 : 1];
        m = this.markFor(r.status, part ? part.symbol.box : this.noteSlot(cell.col), expected, true);
      } else if (r.cellId.startsWith("sub-r")) {
        if (!row) continue;
        checkedCols.add(cell.col);
        const w = row.cells.find((c) => c.col === cell.col);
        m = this.markFor(r.status, w ? w.symbol.box : this.slot(cell.col, row), expected);
      }
      if (m) marks.push(m);
    }
    // Crossing out or borrowing where nothing needed it is a mistake too.
    for (const c of topRow.cells) {
      if (c.struck && !graph.cells.some((g) => g.id === `sub-strike${c.col}`)) marks.push({ status: "wrong", box: c.symbol.box, expected: "ska inte strykas" });
    }
    for (const [col, n] of notes) {
      const box = unionBox(n.parts.map((p) => p.symbol));
      if (!graph.cells.some((g) => g.id === `sub-bt${col}-tens`)) marks.push({ status: "wrong", box, expected: "ingen växling här" });
      // A borrowed ten is only crossed out when it's lent on again (a zero passed through on the way to a digit to borrow from).
      else if (n.parts.some((p) => p.struck) && !graph.cells.some((g) => g.id === `sub-strikebt${col}`)) marks.push({ status: "wrong", box, expected: "ska inte strykas" });
    }
    if (row) marks.push(...this.extraResultMarks(row, answer, checkedCols));
    return summarize(title, formatSwedishNumber(answer), marks, row ? undefined : "Inget svar skrivet ännu.");
  }

  /** Three or more addends: the answer's digits against the true sum (the engine's columnAdd takes two). */
  manyAdd(title: string, values: number[], sections: ColumnRow[][]): WorkCheck {
    const answer = values.reduce((a, b) => a + b, 0);
    const row = this.answerRow(sections);
    if (!row) return summarize(title, formatSwedishNumber(answer), [], "Inget svar skrivet ännu.");
    return summarize(title, formatSwedishNumber(answer), this.digitMarks(row, answer, null));
  }

  /**
   * Multi-digit multiplier: one partial product per multiplier digit (row k
   * is top × digit k, shifted k columns - a placeholder zero is fine but not
   * needed), then their sum. The sum is a följdfel where it matches the
   * child's own partial rows but not the true product.
   */
  longMul(title: string, top: number, bottom: number, sections: ColumnRow[][]): WorkCheck {
    const answer = top * bottom;
    const multiplierDigits = digitsOf(bottom);
    const partialRows = sections.length >= 2 || (sections[0]?.length ?? 0) > 1 ? sections[0] : [];
    const finalRow = sections.length >= 2 ? this.answerRow(sections) : partialRows.length === 0 ? this.answerRow(sections) : null;
    const marks: CheckMark[] = [];
    let followOnSum: number | null = 0;
    partialRows.forEach((row, k) => {
      if (k >= multiplierDigits.length) {
        marks.push(...row.cells.map((c) => ({ status: "wrong" as const, box: c.symbol.box, expected: "" })));
        return;
      }
      const expected = top * multiplierDigits[k] * 10 ** k;
      marks.push(...this.digitMarks(row, expected, null, k));
      const v = valueOf(row.cells);
      followOnSum = followOnSum === null || v === null ? null : followOnSum + v;
    });
    const notices: string[] = [];
    if (partialRows.length > 0 && partialRows.length < multiplierDigits.length) notices.push(`${multiplierDigits.length - partialRows.length} delprodukt(er) saknas.`);
    if (finalRow) marks.push(...this.digitMarks(finalRow, answer, partialRows.length > 0 ? followOnSum : null));
    else notices.push("Inget slutsvar skrivet ännu.");
    return summarize(title, formatSwedishNumber(answer), marks, notices.length > 0 ? notices.join(" ") : undefined);
  }

  /** Digit-by-digit check of a row against `expected` (and, if given, a följdfel value); columns below `fromCol` may be a placeholder zero or blank. */
  private digitMarks(row: ColumnRow, expected: number, followOn: number | null, fromCol = 0): CheckMark[] {
    const marks: CheckMark[] = [];
    const topCol = digitsOf(expected).length - 1;
    for (let col = fromCol; col <= topCol; col++) {
      const w = row.cells.find((c) => c.col === col);
      const want = digitAt(expected, col);
      if (!w) {
        marks.push({ status: "missing", box: this.slot(col, row), expected: String(want) });
      } else if (w.digit === want) {
        marks.push({ status: "correct", box: w.symbol.box });
      } else if (followOn !== null && followOn >= 0 && w.digit === digitAt(followOn, col)) {
        marks.push({ status: "followOnError", box: w.symbol.box, expected: String(want) });
      } else {
        marks.push({ status: "wrong", box: w.symbol.box, expected: String(want) });
      }
    }
    for (const w of row.cells) {
      if (w.col > topCol && w.digit !== 0) marks.push({ status: "wrong", box: w.symbol.box, expected: "" });
      if (w.col < fromCol && w.digit !== 0) marks.push({ status: "wrong", box: w.symbol.box, expected: "0 eller tom" });
    }
    return marks;
  }
}
