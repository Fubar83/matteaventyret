/**
 * Grades handwritten division:
 *
 *  - kort division (ShortDivisionWork) -> the game engine's shortDiv, for a
 *    single-digit divisor: quotient digits, and each remainder note as the
 *    engine's remainder cell, with följdfel exactly as the game scores them.
 *    Other divisors get a plain digit-by-digit check of the quotient.
 *  - trappan / liggande stolen (LongDivisionWork) -> checked here, since the
 *    engine's longDiv is still a stub: the quotient digit by digit, then each
 *    work row against the true algorithm's rows, in order:
 *
 *        product 1, partial number 2, product 2, ..., last product, remainder
 *
 *    where a product row is (quotient digit × divisor), written under the
 *    digits it's taken from, and a partial number is the difference plus the
 *    digit(s) brought down. A step whose quotient digit is 0 has no product
 *    row (the next digit is simply brought down too), as written in class.
 *    Rows are compared by value AND place (their digits' columns), and a row
 *    that's right given the child's own previous rows (their own quotient
 *    digit, their own subtraction) is a följdfel, not a new error.
 */
import * as shortDiv from "../../engine/methods/shortDiv";
import { digitAt, digitsOf, formatSwedishNumber } from "../../engine/digits";
import type { WrittenMap } from "../../engine/types";
import type { ClassifiedSymbol } from "../layout";
import type { DivisionCell, LongDivisionWork } from "../longDivisionLayout";
import type { ShortDivisionWork } from "../shortDivisionParse";
import { boxAt, summarize, unionBox, valueOf, type CheckMark, type WorkCheck } from "./types";

const numberOf = (symbols: ClassifiedSymbol[]): number | null =>
  symbols.length > 0 && symbols.every((s) => /^[0-9]$/.test(s.char)) ? Number(symbols.map((s) => s.char).join("")) : null;

/** Quotient digits against the true quotient (leading zeros allowed), plus missing ones. */
function quotientMarks(cells: DivisionCell[], quotient: number, slot: (col: number) => CheckMark["box"], followOn?: (col: number) => number | null): CheckMark[] {
  const marks: CheckMark[] = [];
  const topCol = digitsOf(quotient).length - 1;
  for (let col = 0; col <= topCol; col++) {
    const w = cells.find((c) => c.col === col);
    const want = digitAt(quotient, col);
    if (!w) marks.push({ status: "missing", box: slot(col), expected: String(want) });
    else if (w.digit === want) marks.push({ status: "correct", box: w.symbol.box });
    else if (followOn && w.digit !== null && w.digit === followOn(col)) marks.push({ status: "followOnError", box: w.symbol.box, expected: String(want) });
    else marks.push({ status: "wrong", box: w.symbol.box, expected: String(want) });
  }
  for (const w of cells) if (w.col > topCol && w.digit !== 0) marks.push({ status: "wrong", box: w.symbol.box, expected: "" });
  return marks;
}

export function checkShortDivision(work: ShortDivisionWork): WorkCheck {
  const dividend = valueOf(work.dividend);
  const divisor = numberOf(work.divisor);
  const title = `Kort division: ${dividend === null ? "?" : formatSwedishNumber(dividend)} / ${divisor === null ? "?" : divisor}`;
  if (dividend === null || divisor === null) return summarize(title, "", [], "Kunde inte läsa alla siffror.");
  if (divisor === 0) return summarize(title, "", [], "Division med 0 går inte.");
  const quotient = Math.floor(dividend / divisor);
  const remainder = dividend % divisor;
  const answer = formatSwedishNumber(quotient) + (remainder > 0 ? ` rest ${remainder}` : "");
  const slot = (col: number) => boxAt(work.quotientAnchorX - col * work.quotientPitch, work.quotientY, work.quotientPitch * 0.8, work.quotientPitch * 1.2);
  const noteBox = (col: number) => {
    const digit = work.dividend.find((c) => c.col === col)!.symbol.box;
    return boxAt(digit.minX - digit.width * 0.15, digit.minY + digit.height * 0.1, digit.width * 0.5, digit.height * 0.45);
  };
  const remainderNotice = remainder > 0 ? `Divisionen går inte jämnt ut (rest ${remainder}) - resten och decimaler kontrolleras inte ännu.` : undefined;
  if (work.quotient.length === 0) return summarize(title, answer, [], "Inget svar skrivet ännu.");

  if (divisor < 2 || divisor > 9) {
    return summarize(title, answer, quotientMarks(work.quotient, quotient, slot), remainderNotice);
  }

  const written: WrittenMap = {};
  for (const c of work.quotient) if (c.digit !== null) written[`div-q${c.col}`] = c.digit;
  for (const n of work.notes) if (n.value !== null) written[`div-rem${n.col}`] = n.value;
  const params = { dividend, divisor };
  const graph = shortDiv.buildGraph(params);
  const report = shortDiv.checkAll(params, written);
  const marks: CheckMark[] = [];
  const noteCols = new Set<number>();
  for (const r of report.results) {
    const cell = graph.cells.find((c) => c.id === r.cellId);
    if (!cell || r.status === "notRequired" || cell.meta?.final) continue;
    const expected = String(cell.expected);
    if (cell.type === "quotient") {
      const w = work.quotient.find((c) => c.col === cell.col);
      if (r.status === "unattempted") marks.push({ status: "missing", box: slot(cell.col), expected });
      else marks.push({ status: r.status as CheckMark["status"], box: w!.symbol.box, expected: r.status === "correct" ? undefined : expected });
    } else {
      noteCols.add(cell.col);
      const n = work.notes.find((x) => x.col === cell.col);
      if (r.status === "unattempted") marks.push({ status: "missing", box: noteBox(cell.col), expected, optional: true });
      else marks.push({ status: r.status as CheckMark["status"], box: unionBox(n!.symbols), expected: r.status === "correct" ? undefined : expected });
    }
  }
  // A remainder note where nothing is left over is a mistake.
  for (const n of work.notes) if (!noteCols.has(n.col)) marks.push({ status: "wrong", box: unionBox(n.symbols), expected: "ingen rest" });
  // Quotient digits beyond the true quotient's length: a leading zero is fine.
  const topCol = digitsOf(quotient).length - 1;
  for (const w of work.quotient) if (w.col > topCol && w.digit !== 0) marks.push({ status: "wrong", box: w.symbol.box, expected: "" });
  return summarize(title, answer, marks, remainderNotice);
}

interface ExpectedRow {
  kind: "product" | "partial";
  /** Absolute value (digits at their true place): e.g. the "4" under the 7 of 764 is 400. */
  value: number;
  /** The quotient column this step belongs to. */
  col: number;
}

/** The rows the long-division algorithm writes, in order (see file comment). */
function expectedRows(dividend: number, divisor: number): ExpectedRow[] {
  const rows: ExpectedRow[] = [];
  const n = digitsOf(dividend).length;
  let current = 0;
  let producedAny = false;
  for (let col = n - 1; col >= 0; col--) {
    current = current * 10 + digitAt(dividend, col);
    const q = Math.floor(current / divisor);
    if (q === 0) continue;
    if (producedAny) rows.push({ kind: "partial", value: current * 10 ** col, col });
    rows.push({ kind: "product", value: q * divisor * 10 ** col, col });
    current -= q * divisor;
    producedAny = true;
  }
  if (producedAny) rows.push({ kind: "partial", value: current, col: 0 });
  return rows;
}

export function checkLongDivision(work: LongDivisionWork): WorkCheck {
  const dividend = valueOf(work.dividend);
  const divisor = numberOf(work.divisor);
  const kind = work.divisorSide === "left" ? "Trappan" : "Liggande stolen";
  const title = `${kind}: ${dividend === null ? "?" : formatSwedishNumber(dividend)} / ${divisor === null ? "?" : divisor}`;
  if (dividend === null || divisor === null) return summarize(title, "", [], "Kunde inte läsa alla siffror.");
  if (divisor === 0) return summarize(title, "", [], "Division med 0 går inte.");
  const quotient = Math.floor(dividend / divisor);
  const remainder = dividend % divisor;
  const answer = formatSwedishNumber(quotient) + (remainder > 0 ? ` rest ${remainder}` : "");
  const slot = (col: number) => boxAt(work.anchorX - col * work.pitch, work.quotientY, work.pitch * 0.8, work.pitch * 1.2);

  const marks: CheckMark[] = [];
  const notices: string[] = [];
  if (work.quotient.length === 0) notices.push("Ingen kvot skriven ännu.");
  else marks.push(...quotientMarks(work.quotient, quotient, slot));

  // Work rows, in order, against the algorithm's rows.
  const expected = expectedRows(dividend, divisor);
  const writtenQuotientDigit = (col: number) => work.quotient.find((c) => c.col === col)?.digit ?? null;
  let prevPartial: number | null = null; // the child's own previous partial number (absolute), for följdfel
  let prevProduct: number | null = null;
  work.rows.forEach((row, i) => {
    const value = valueOf(row.cells);
    const want = expected[i];
    const rowMarks = (status: CheckMark["status"], exp?: number) =>
      row.cells.map((c) => ({ status, box: c.symbol.box, expected: exp === undefined || status === "correct" ? undefined : formatSwedishNumber(exp / 10 ** row.cells[row.cells.length - 1].col) }));
    if (!want) {
      marks.push(...rowMarks("wrong"));
      return;
    }
    let followOn: number | null = null;
    if (want.kind === "product") {
      const q = writtenQuotientDigit(want.col);
      if (q !== null) followOn = q * divisor * 10 ** want.col;
    } else if (prevProduct !== null) {
      // Previous partial (or, for the first one, the dividend's leading part) minus the child's own product, plus what's brought down.
      const prevStep = expected[i - 1];
      const base = prevPartial ?? Math.floor(dividend / 10 ** prevStep.col) * 10 ** prevStep.col;
      const broughtDown = Math.floor((dividend % 10 ** prevStep.col) / 10 ** want.col) * 10 ** want.col;
      followOn = base - prevProduct + broughtDown;
    }
    if (value === want.value) marks.push(...rowMarks("correct"));
    else if (value !== null && followOn !== null && value === followOn) marks.push(...rowMarks("followOnError", want.value));
    else marks.push(...rowMarks("wrong", want.value));
    if (want.kind === "product") prevProduct = value;
    else prevPartial = value;
  });
  if (work.rows.length < expected.length && work.quotient.length > 0) notices.push(`${expected.length - work.rows.length} rad(er) av uträkningen saknas.`);
  return summarize(title, answer, marks, notices.length > 0 ? notices.join(" ") : undefined);
}
