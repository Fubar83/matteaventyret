/**
 * Column arithmetic ("uppställning"): numbers written in rows, the operator
 * at the start of the last row, a line under them, and optionally the answer
 * (and, for multiplication, partial products and further lines) below.
 *
 * Two steps, kept apart on purpose:
 *
 *  - parseColumnWork: the page's symbols -> a structured ColumnWork (rows of
 *    digit cells by place-value column, the operator, lines, carry/borrow
 *    notes, crossed-out digits). This is what the verifier
 *    (verify/columnCheck.ts) grades and the page's overlay highlights.
 *  - renderColumnWork: ColumnWork -> a right-aligned LaTeX array, one column
 *    per digit position so ones stay under ones:
 *
 *        ¹⁰ ¹⁰
 *    1̸  0̸  0          \begin{array}{rccc}
 *  -        9    ->     & \cancel{1} & \overset{10}{\cancel{0}} & \overset{10}{0} \\
 *  ─────────            - & & & 9 \\ \hline
 *       9  1            & & 9 & 1 \end{array}
 *
 * - Crossed-out digits (borrowing) come from segmentation.ts's strike
 *   detection and render as \cancel{...}.
 * - Small digits written above a column (carries, borrowed tens) attach to
 *   the digit below them via \overset, however many there are ("10").
 * - Columns come from each digit's actual horizontal position (rounded to
 *   the page's digit pitch), anchored on the top row's last digit - so a
 *   multiplication's partial products, written shifted left, still land in
 *   the right columns.
 *
 * - A small mark low between two digits of a row is a decimal comma.
 *
 * Detection is deliberately conservative: at least two full-size rows above
 * the line, and the row right above it must start with an operator. A plain
 * fraction (one row above) never matches. A writing template is read by its
 * printed boxes instead (templateRows): size means nothing there.
 */
import type { ClassifiedSymbol } from "./layout";
import type { BoundingBox } from "./segmentation";

const OPERATOR_LATEX: Record<string, string> = { "+": "+", "-": "-", x: "\\times", "×": "\\times", "·": "\\cdot", "*": "\\cdot" };
/** A symbol shorter than this fraction of the block's normal digit height is a carry/borrow note, not part of a row. */
const ANNOTATION_RATIO = 0.65;

export type ColumnOperator = "+" | "-" | "×";

export interface ColumnCell {
  /** Place-value column, 0 = ones. */
  col: number;
  symbol: ClassifiedSymbol;
  /** The digit, or null when the symbol isn't one (a misread). */
  digit: number | null;
  struck: boolean;
}

/** A small carry/borrow note ("1", "10", a crossed-out "10") written above a column. */
export interface ColumnNote {
  col: number;
  /** Index into ColumnWork.rows of the row it sits above. */
  row: number;
  parts: { symbol: ClassifiedSymbol; digit: number | null; struck: boolean }[];
}

export interface ColumnRow {
  op: ClassifiedSymbol | null;
  cells: ColumnCell[];
  /** Decimal commas (or points) in this row: the column of the digit each one follows. */
  commas: number[];
  cy: number;
  height: number;
}

export interface ColumnWork {
  kind: "column";
  /** The operator from the row just above the first line. */
  operator: ColumnOperator;
  /** All rows, top to bottom. */
  rows: ColumnRow[];
  /** `lines[i]` = how many rows come before the i-th line, top to bottom (a line after the last row counts too). */
  lines: number[];
  notes: ColumnNote[];
  /** Horizontal step between neighboring digit columns, and the x of column 0 - for placing things (e.g. a missing digit) by column. */
  pitch: number;
  anchorX: number;
  consumed: Set<ClassifiedSymbol>;
  cx: number;
}

export interface ColumnBlock {
  consumed: Set<ClassifiedSymbol>;
  latex: string;
  cx: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

interface RawRow {
  items: ClassifiedSymbol[];
  minY: number;
  maxY: number;
}

/** Clusters symbols into rows of vertically overlapping boxes. */
function toRows(symbols: ClassifiedSymbol[]): RawRow[] {
  const rows: RawRow[] = [];
  for (const s of [...symbols].sort((a, b) => a.box.minY - b.box.minY)) {
    const last = rows[rows.length - 1];
    if (last && s.box.minY < last.maxY) {
      last.items.push(s);
      last.maxY = Math.max(last.maxY, s.box.maxY);
    } else {
      rows.push({ items: [s], minY: s.box.minY, maxY: s.box.maxY });
    }
  }
  for (const r of rows) r.items.sort((a, b) => a.box.cx - b.box.cx);
  return rows;
}

/**
 * Splits a row into its leading operator (if any) and its digit cells. The
 * top row is the number being operated on and never has an operator - so an
 * "x"-looking first symbol there is a crossed-out digit, not a × (see
 * digitOf).
 */
function splitOperator(row: RawRow, isTopRow: boolean): { op: ClassifiedSymbol | null; cells: ClassifiedSymbol[] } {
  const [first, ...rest] = row.items;
  if (!isTopRow && rest.length > 0 && first.char in OPERATOR_LATEX) return { op: first, cells: rest };
  return { op: null, cells: row.items };
}

/**
 * A cell's digit and whether it's crossed out. An "x" among the digits is a
 * crossed-out "1": a slanted "1" with a strike through it is two crossing
 * straight diagonals, which is exactly what an "x" looks like to both
 * segmentation and the classifier - and no other digit is a single straight
 * stroke, while column arithmetic has no variables for a real "x" to be.
 */
function digitOf(s: ClassifiedSymbol): { digit: number | null; struck: boolean } {
  if (s.char === "x") return { digit: 1, struck: true };
  return { digit: /^[0-9]$/.test(s.char) ? Number(s.char) : null, struck: !!s.struck };
}

function toOperator(char: string): ColumnOperator {
  return char === "+" ? "+" : char === "-" ? "-" : "×";
}

/** The rows found by one of the two readings below, with the small notes still to attach to them. */
interface FoundRows {
  rows: ColumnRow[];
  opSymbol: ClassifiedSymbol;
  annotations: ClassifiedSymbol[];
  pitch: number;
  anchorX: number;
  /** The row a note whose ink ends at `bottom` (y) sits above. */
  rowBelow: (bottom: number) => number;
}

/** In a column template: a small mark low between two boxes of the row at `rowY` - a decimal comma (or point), not a digit. */
export function isCommaBetweenBoxes(box: BoundingBox, grid: NonNullable<ClassifiedSymbol["grid"]>, rowY: number): boolean {
  const p = (grid.anchorX - box.cx) / grid.pitch;
  const betweenBoxes = Math.abs(p - Math.round(p)) > 0.3;
  const tiny = Math.max(box.width, box.height) < grid.pitch * 0.5;
  return tiny && betweenBoxes && box.cy > rowY;
}

/**
 * A writing template's column work: every symbol is in the box it was
 * written in - its row the nearest printed row, its column the nearest
 * printed column - whatever its size, so a digit written small is still a
 * plain digit (never a note or an exponent). Only the template's note row
 * holds notes. A small mark low between two boxes is a decimal comma (or
 * point). The operator is the printed one, so this reads the work however
 * little of it is written yet.
 */
function templateRows(grid: NonNullable<ClassifiedSymbol["grid"]>, rowYs: number[], pool: ClassifiedSymbol[]): FoundRows | null {
  const { anchorX, pitch, notesAboveY } = grid;
  const colPos = (cx: number) => (anchorX - cx) / pitch;
  // An "x" is a crossed-out "1" (see digitOf), never the operator - the template prints that.
  const isOp = (s: ClassifiedSymbol) => s.char in OPERATOR_LATEX && s.char !== "x";
  const annotations = notesAboveY === undefined ? [] : pool.filter((s) => !isOp(s) && s.box.cy < notesAboveY);
  const byRow = rowYs.map((): ClassifiedSymbol[] => []);
  for (const s of pool) {
    if (annotations.includes(s)) continue;
    const nearest = rowYs.reduce((best, y, k) => (Math.abs(y - s.box.cy) < Math.abs(rowYs[best] - s.box.cy) ? k : best), 0);
    byRow[nearest].push(s);
  }

  const rows: ColumnRow[] = [];
  byRow.forEach((items, k) => {
    if (items.length === 0) return;
    const op = items.filter(isOp).sort((a, b) => a.box.cx - b.box.cx)[0] ?? null;
    const cells: ColumnCell[] = [];
    const commas: number[] = [];
    for (const s of items) {
      if (s === op) continue;
      const p = colPos(s.box.cx);
      // A comma follows the digit in the box to its left.
      if (isCommaBetweenBoxes(s.box, grid, rowYs[k])) commas.push(Math.ceil(p));
      else cells.push({ col: Math.round(p), symbol: s, ...digitOf(s) });
    }
    cells.sort((a, b) => a.col - b.col);
    const minY = Math.min(...items.map((s) => s.box.minY));
    const maxY = Math.max(...items.map((s) => s.box.maxY));
    rows.push({ op, cells, commas, cy: rowYs[k], height: maxY - minY });
  });
  const opSymbol = rows.find((r) => r.op)?.op;
  if (!opSymbol) return null;
  // The note row is over the top number.
  return { rows, opSymbol, annotations, pitch, anchorX, rowBelow: () => 0 };
}

/**
 * Column work written freehand: rows of full-size symbols, with small ones
 * above them as carry/borrow notes - except a small mark low in the gap
 * between two digits of a row, which is a decimal comma (or point).
 */
function handwrittenRows(bar: ClassifiedSymbol, pool: ClassifiedSymbol[]): FoundRows | null {
  const digits = pool.filter((s) => /^[0-9]$/.test(s.char));
  if (digits.length < 2) return null;
  const tallest = Math.max(...digits.map((d) => d.box.height));
  const normalH = median(digits.filter((d) => d.box.height >= tallest * 0.6).map((d) => d.box.height));
  const isSmall = (s: ClassifiedSymbol) => !(s.char in OPERATOR_LATEX) && s.box.height < normalH * ANNOTATION_RATIO;

  const small = pool.filter(isSmall);
  const rawRows = toRows(pool.filter((s) => !isSmall(s)));

  const rowsAbove = rawRows.filter((r) => (r.minY + r.maxY) / 2 < bar.box.cy);
  if (rowsAbove.length < 2) return null;
  const opSymbol = splitOperator(rowsAbove[rowsAbove.length - 1], false).op;
  if (!opSymbol) return null;

  // Column pitch: the typical horizontal step between neighboring digits in a row.
  const split = rawRows.map((r, i) => splitOperator(r, i === 0));
  const gaps: number[] = [];
  for (const { cells } of split) for (let i = 1; i < cells.length; i++) gaps.push(cells[i].box.cx - cells[i - 1].box.cx);
  const pitch = gaps.length > 0 ? median(gaps) : normalH * 0.7;
  const topCells = split[0].cells;
  const anchorX = topCells[topCells.length - 1].box.cx;
  const colOf = (cx: number) => Math.round((anchorX - cx) / pitch);

  // Digits within a row take consecutive columns leftward from wherever the row's last digit rounds to.
  const rows: ColumnRow[] = rawRows.map((r, i) => {
    const { op, cells } = split[i];
    const rightCol = colOf(cells[cells.length - 1].box.cx);
    const columnCells = cells
      .slice()
      .reverse()
      .map((symbol, k) => ({ col: rightCol + k, symbol, ...digitOf(symbol) }));
    return { op, cells: columnCells, commas: [], cy: (r.minY + r.maxY) / 2, height: r.maxY - r.minY };
  });

  const annotations: ClassifiedSymbol[] = [];
  for (const s of small) {
    const i = rawRows.findIndex((r) => s.box.cy > (r.minY + r.maxY) / 2 && s.box.cy < r.maxY + normalH * 0.2);
    const cells = i >= 0 ? rows[i].cells : [];
    const left = cells.filter((c) => c.symbol.box.cx < s.box.cx).sort((a, b) => b.symbol.box.cx - a.symbol.box.cx)[0];
    const right = cells.filter((c) => c.symbol.box.cx > s.box.cx).sort((a, b) => a.symbol.box.cx - b.symbol.box.cx)[0];
    const inGap = left && right && s.box.cx >= left.symbol.box.maxX - pitch * 0.15 && s.box.cx <= right.symbol.box.minX + pitch * 0.15;
    if (inGap) rows[i].commas.push(left.col);
    else annotations.push(s);
  }

  const rowBelow = (bottom: number) => {
    const row = rawRows.findIndex((r) => r.minY >= bottom - normalH * 0.3);
    return row < 0 ? rows.length - 1 : row;
  };
  return { rows, opSymbol, annotations, pitch, anchorX, rowBelow };
}

export function parseColumnWork(bar: ClassifiedSymbol, candidates: ClassifiedSymbol[]): ColumnWork | null {
  const margin = bar.box.width * 0.25;
  const pool = candidates.filter((s) => s !== bar && s.box.cx >= bar.box.minX - margin && s.box.cx <= bar.box.maxX + margin);
  const isLine = (s: ClassifiedSymbol) => s.char === "-" && s.box.width >= bar.box.width * 0.6;
  const lineSymbols = [bar, ...pool.filter(isLine)];
  const written = pool.filter((s) => !isLine(s));

  const found = bar.grid?.rowYs ? templateRows(bar.grid, bar.grid.rowYs, written) : handwrittenRows(bar, written);
  if (!found) return null;
  const { rows, opSymbol, annotations, pitch, anchorX, rowBelow } = found;
  const colOf = (cx: number) => Math.round((anchorX - cx) / pitch);

  // Carries / borrow notes: group neighboring small symbols ("1","0" -> "10"),
  // then attach each group to its column in the nearest row below it. A
  // note never grows wider than about one column, so notes over two
  // neighboring columns ("10" "10") don't run together into "1010".
  const groups: ClassifiedSymbol[][] = [];
  for (const a of [...annotations].sort((p, q) => p.box.cx - q.box.cx)) {
    const g = groups.find((gr) => {
      const last = gr[gr.length - 1];
      return (
        a.box.minX - last.box.maxX < a.box.height * 0.6 &&
        a.box.maxX - gr[0].box.minX <= pitch * 1.2 &&
        a.box.minY < last.box.maxY &&
        last.box.minY < a.box.maxY
      );
    });
    if (g) g.push(a);
    else groups.push([a]);
  }
  // Everything that lands over the same column of the same row is ONE note,
  // read left to right - a hand-written "10" whose "1" and "0" aren't level
  // (so the grouping above kept them apart) is still one borrowed ten, not a
  // lone "1" and a lone "0" (regression: its "0" was graded as the ten's tens digit).
  const notesByCell = new Map<string, ColumnNote>();
  for (const g of groups) {
    const row = rowBelow(Math.max(...g.map((s) => s.box.maxY)));
    const col = colOf((g[0].box.minX + g[g.length - 1].box.maxX) / 2);
    const key = `${row}:${col}`;
    const note = notesByCell.get(key) ?? { col, row, parts: [] };
    note.parts.push(...g.map((symbol) => ({ symbol, ...digitOf(symbol) })));
    note.parts.sort((a, b) => a.symbol.box.cx - b.symbol.box.cx);
    notesByCell.set(key, note);
  }
  const notes = [...notesByCell.values()];
  // A borrowed "10" is one number, not two digits: crossing out either of
  // its digits crosses out the ten (a quick line rarely catches both
  // cleanly). Only the note's first two digits - a replacement written after
  // it (the "9" in "1̸0̸9") keeps its own state.
  for (const note of notes) {
    const ten = note.parts.slice(0, 2);
    if (ten.length === 2 && ten.some((p) => p.struck)) for (const p of ten) p.struck = true;
  }

  const lines = lineSymbols.map((l) => rows.filter((r) => r.cy < l.box.cy).length).sort((a, b) => a - b);

  return {
    kind: "column",
    operator: toOperator(opSymbol.char),
    rows,
    lines,
    notes,
    pitch,
    anchorX,
    consumed: new Set([bar, ...pool]),
    cx: bar.box.cx,
  };
}

/** A note's LaTeX, with each run of crossed-out digits under ONE \cancel - a crossed-out borrowed ten reads "\cancel{10}", one number, not two crossed-out digits. */
function noteLatex(note: ColumnNote, token: (s: ClassifiedSymbol) => string): string {
  let out = "";
  let run = "";
  for (const p of note.parts) {
    const plain = token({ ...p.symbol, struck: false });
    if (p.struck) {
      run += plain;
    } else {
      if (run) out += `\\cancel{${run}}`;
      run = "";
      out += plain;
    }
  }
  return run ? `${out}\\cancel{${run}}` : out;
}

export function renderColumnWork(work: ColumnWork, token: (s: ClassifiedSymbol) => string): string {
  const cellLatex = (c: ColumnCell) => (c.symbol.char === "x" ? "\\cancel{1}" : token(c.symbol));
  const allCols = [...work.rows.flatMap((r) => [...r.cells.map((c) => c.col), ...r.commas]), ...work.notes.map((n) => n.col)];
  const maxCol = Math.max(0, ...allCols);
  const minCol = Math.min(0, ...allCols);

  const parts: string[] = [];
  work.rows.forEach((row, i) => {
    const cells: string[] = [];
    for (let col = maxCol; col >= minCol; col--) {
      const cell = row.cells.find((c) => c.col === col);
      const notes = work.notes.filter((n) => n.row === i && n.col === col).map((n) => noteLatex(n, token));
      const comma = row.commas.includes(col);
      const base = cell ? cellLatex(cell) : notes.length > 0 || comma ? "\\phantom{0}" : "";
      // \rlap: the comma takes no width, so the digits stay lined up under each other.
      const withComma = comma ? `${base}\\rlap{,}` : base;
      cells.push(notes.length > 0 ? `\\overset{${notes.join("")}}{${withComma}}` : withComma);
    }
    const op = row.op ? OPERATOR_LATEX[row.op.char] : "";
    const lineBefore = i > 0 && work.lines.includes(i);
    parts.push(`${lineBefore ? "\\hline " : ""}${[op, ...cells].join(" & ").trim()}`);
  });
  const trailingLine = work.lines.includes(work.rows.length);
  return `\\begin{array}{r${"c".repeat(maxCol - minCol + 1)}} ${parts.join(" \\\\ ")}${trailingLine ? " \\\\ \\hline" : ""} \\end{array}`;
}

/** Parse + render in one go, for the layout pass. */
export function columnBlockAt(bar: ClassifiedSymbol, candidates: ClassifiedSymbol[], token: (s: ClassifiedSymbol) => string): ColumnBlock | null {
  const work = parseColumnWork(bar, candidates);
  if (!work) return null;
  return { consumed: work.consumed, latex: renderColumnWork(work, token), cx: work.cx };
}
