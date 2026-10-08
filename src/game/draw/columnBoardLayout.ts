/**
 * An uppställning (column addition / subtraction / multiplication) as a
 * drawing board: the engine's cell graph, grouped by board.ts's buildColumns
 * exactly as the old tap-and-type board was, laid out as boxes to write in.
 *
 *   carries / borrowed tens   small boxes above their column (a borrowed
 *                             "10" is one two-digit box, crossed out with a line)
 *   top number                printed; a line through a digit crosses it out
 *   bottom number, operator   printed
 *   the line                  printed
 *   answer                    one box per digit - a box that can take a
 *                             carry also takes the whole column sum ("15")
 *
 * Also maps between boxes and cells both ways, for the players.
 */
import type { Cell, CellGraph, WrittenMap } from "../../engine/types";
import { buildColumns } from "../board";
import { tensCellFor } from "../cellFlow";
import type { BoardLayout, BoxStatus, DrawBox, PrintedText } from "./boardTypes";

export type BoxTarget =
  | { kind: "cell"; cell: Cell }
  | { kind: "ten"; tens: Cell; ones: Cell; strike: Cell | null }
  | { kind: "top"; strike: Cell | null };

export interface ColumnBoard {
  layout: BoardLayout;
  targets: Record<string, BoxTarget>;
}

export type ColumnOperator = "+" | "-" | "×";

export function operatorFor(method: "columnAdd" | "columnSub" | "columnMul"): ColumnOperator {
  if (method === "columnAdd") return "+";
  if (method === "columnSub") return "-";
  return "×";
}

const COL = 88;
const DIGIT_W = 76;
const DIGIT_H = 92;
const SMALL_W = 60;
const SMALL_H = 54;
const TEN_W = 82;
const NOTE_PITCH = SMALL_H + 8;
const OP_W = 64;
const COMMA_W = 20;
const PAD = 14;
const ROW_GAP = 10;

export function buildColumnBoard(
  graph: CellGraph,
  top: number,
  bottom: number,
  operator: ColumnOperator,
  written: WrittenMap,
  decimalPlaces = 0
): ColumnBoard {
  const columns = buildColumns(graph, top, bottom);
  const boxes: DrawBox[] = [];
  const texts: PrintedText[] = [];
  const targets: Record<string, BoxTarget> = {};

  // Horizontal: an operator column, then the digit columns (most significant first), with a gap for the decimal comma.
  const colX = new Map<number, number>();
  let x = PAD + OP_W;
  let commaX: number | null = null;
  for (const col of columns) {
    colX.set(col.col, x);
    x += COL;
    if (decimalPlaces > 0 && col.col === decimalPlaces) {
      commaX = x + COMMA_W / 2 - 4;
      x += COMMA_W;
    }
  }
  const width = x + PAD;

  // Vertical: carries / borrowed tens stacked above their column (earliest at the bottom), then the rows.
  const noteRows = Math.max(0, ...columns.map((c) => c.annotations.length));
  const notesTop = PAD;
  const topY = notesTop + noteRows * NOTE_PITCH + (noteRows > 0 ? 4 : 0);
  const bottomY = topY + DIGIT_H + ROW_GAP;
  const lineY = bottomY + DIGIT_H + 12;
  const resultY = lineY + 12;
  const height = resultY + DIGIT_H + PAD;

  for (const col of columns) {
    const left = colX.get(col.col)!;
    const center = left + COL / 2;
    col.annotations.forEach((slot, i) => {
      const y = notesTop + (noteRows - 1 - i) * NOTE_PITCH;
      if (slot.kind === "ten") {
        // A borrowed ten only appears once the lending digit has been crossed out (as on the old board).
        if (slot.revealedBy && written[slot.revealedBy.id] !== "struck") return;
        const id = `ten:${slot.tens.id}`;
        boxes.push({ id, x: center - TEN_W / 2, y, w: TEN_W, h: SMALL_H, kind: "small", maxDigits: 2, strikeable: !!slot.strikeCell });
        targets[id] = { kind: "ten", tens: slot.tens, ones: slot.ones, strike: slot.strikeCell };
      } else {
        boxes.push({ id: slot.cell.id, x: center - SMALL_W / 2, y, w: SMALL_W, h: SMALL_H, kind: "small", maxDigits: 1 });
        targets[slot.cell.id] = { kind: "cell", cell: slot.cell };
      }
    });
    if (col.topDigit !== null) {
      const id = `top:${col.col}`;
      boxes.push({ id, x: center - DIGIT_W / 2, y: topY, w: DIGIT_W, h: DIGIT_H, kind: "printed", text: String(col.topDigit), strikeable: !!col.topStrikeCell });
      targets[id] = { kind: "top", strike: col.topStrikeCell };
    }
    if (col.bottomDigit !== null) {
      boxes.push({ id: `bottom:${col.col}`, x: center - DIGIT_W / 2, y: bottomY, w: DIGIT_W, h: DIGIT_H, kind: "printed", text: String(col.bottomDigit) });
    }
    if (col.resultCell) {
      const cell = col.resultCell;
      boxes.push({ id: cell.id, x: center - DIGIT_W / 2, y: resultY, w: DIGIT_W, h: DIGIT_H, kind: "digit", maxDigits: tensCellFor(graph, cell) ? 2 : 1 });
      targets[cell.id] = { kind: "cell", cell };
    }
  }

  texts.push({ x: PAD + OP_W / 2, y: bottomY + DIGIT_H / 2, text: operator === "-" ? "−" : operator, size: 46 });
  if (commaX !== null) {
    for (const rowY of [topY, bottomY, resultY]) texts.push({ x: commaX, y: rowY + DIGIT_H * 0.8, text: ",", size: 44 });
  }

  return {
    layout: { width, height, boxes, texts, lines: [{ x1: PAD, y1: lineY, x2: width - PAD, y2: lineY }] },
    targets,
  };
}

/** The cells a box writes. */
export function cellsOf(target: BoxTarget): Cell[] {
  if (target.kind === "cell") return [target.cell];
  if (target.kind === "ten") return [target.tens, target.ones, ...(target.strike ? [target.strike] : [])];
  return target.strike ? [target.strike] : [];
}

/** The box that holds a cell, if any. */
export function boxForCell(board: ColumnBoard, cellId: string): string | null {
  for (const [id, target] of Object.entries(board.targets)) if (cellsOf(target).some((c) => c.id === cellId)) return id;
  return null;
}

/**
 * Boxes that can be written in now: in Fritt every box that takes an
 * answer; in the guided phases only boxes with an unwritten cell whose turn
 * it is (a finished box stays as written).
 */
export function activeBoxes(board: ColumnBoard, activeCellIds: ReadonlySet<string>, written: WrittenMap, fritt: boolean): Set<string> {
  const open = (c: Cell | null) => !!c && activeCellIds.has(c.id) && written[c.id] === undefined;
  const out = new Set<string>();
  for (const [id, target] of Object.entries(board.targets)) {
    if (fritt) {
      if (target.kind !== "top" || target.strike) out.add(id);
    } else if (target.kind === "cell" ? open(target.cell) : target.kind === "ten" ? open(target.tens) || open(target.ones) || open(target.strike) : open(target.strike)) {
      out.add(id);
    }
  }
  return out;
}

/** What to show in boxes without ink: written (e.g. revealed) values, and "struck" for a crossed-out printed digit. */
export function boxValues(board: ColumnBoard, written: WrittenMap): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, target] of Object.entries(board.targets)) {
    if (target.kind === "cell") {
      const v = written[target.cell.id];
      if (typeof v === "number") out[id] = String(v);
    } else if (target.kind === "ten") {
      const text = [target.tens, target.ones].map((c) => written[c.id]).filter((v) => typeof v === "number").join("");
      if (text) out[id] = text;
    } else if (target.strike && written[target.strike.id] === "struck") {
      out[id] = "struck";
    }
  }
  return out;
}

/** A box's color: its cell's verdict - for a borrowed ten, the worst of its parts. */
export function boxStatuses(board: ColumnBoard, verdicts: Readonly<Record<string, BoxStatus>>): Record<string, BoxStatus> {
  const rank: Record<BoxStatus, number> = { correct: 0, followOn: 1, wrong: 2 };
  const out: Record<string, BoxStatus> = {};
  for (const [id, target] of Object.entries(board.targets)) {
    const statuses = cellsOf(target)
      .map((c) => verdicts[c.id])
      .filter((v): v is BoxStatus => !!v);
    if (statuses.length > 0) out[id] = statuses.reduce((a, b) => (rank[b] > rank[a] ? b : a));
  }
  return out;
}
