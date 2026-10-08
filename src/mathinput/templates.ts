/**
 * Writing templates for the drawing area: faint guide boxes showing where
 * each digit goes (and smaller ones for carries / borrowed tens), plus the
 * parts a textbook would print - the operator, the answer line(s), the
 * division bracket or fraction bar. They help a child put things in the
 * right places, sized for a finger on a tablet.
 *
 * The printed parts aren't just drawn: `printedSymbols` hands them to
 * recognition as already-known symbols (a line, a "+", a trappan bracket),
 * so nothing depends on recognizing them from ink - and the template's
 * exact digit grid travels along on the line/bracket (ClassifiedSymbol.grid),
 * so every digit lands in the column of the box it was written in rather
 * than one estimated from handwriting spacing.
 *
 * All geometry is in the drawing area's own viewBox units.
 */
import { isCommaBetweenBoxes } from "./columnLayout";
import type { DivisionBracket } from "./divisionBracket";
import type { ClassifiedSymbol } from "./layout";
import type { BoundingBox, SegmentedSymbol } from "./segmentation";

export type TemplateId = "free" | "add" | "sub" | "mul" | "shortDiv" | "trappan";

export interface GuideBox {
  x: number;
  y: number;
  w: number;
  h: number;
  /** "note" = a small carry / borrowed-ten box; "work" = the fainter scratch area of a long division. */
  kind: "digit" | "note" | "work";
}

export interface GuideLine {
  x1: number;
  x2: number;
  y: number;
  /** A fraction bar (kort division) rather than a column's answer line - it's a division even with nothing written yet. */
  fraction?: boolean;
}

export interface GuideGlyph {
  char: "+" | "−" | "·" | "=";
  cx: number;
  cy: number;
  size: number;
}

export interface WritingTemplate {
  id: TemplateId;
  label: string;
  width: number;
  height: number;
  boxes: GuideBox[];
  lines: GuideLine[];
  glyphs: GuideGlyph[];
  bracket?: DivisionBracket;
  /** The digit grid: x of the ones column's center, and the column step. */
  grid?: ClassifiedSymbol["grid"];
  /** Named rows of digit boxes: y-center and each place-value column's x-center (index 0 = ones). For hints and tests. */
  slots: Record<string, { cy: number; xs: number[] }>;
}

/** A digit box: big enough to write in comfortably with a fingertip. */
export const CELL_W = 72;
export const CELL_H = 92;
const NOTE_H = 42;
const GAP = 12;
const WIDTH = 900;

function box(minX: number, minY: number, maxX: number, maxY: number): BoundingBox {
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY };
}

const FREE: WritingTemplate = { id: "free", label: "Fritt", width: WIDTH, height: 440, boxes: [], lines: [], glyphs: [], slots: {} };

/** Note boxes above a column template's top row: their height, and how far in from the column's edges they sit. */
interface NoteRow {
  h: number;
  inset: number;
}
/** Addition's carries are a single small "1". */
const CARRY_NOTES: NoteRow = { h: NOTE_H, inset: 10 };
/** Subtraction's borrowed ten is two digits ("10") - a wider, taller box so it's easy to fit. */
const BORROW_NOTES: NoteRow = { h: 60, inset: 3 };

/**
 * A column template: an operator column on the left, `cols` digit columns,
 * optionally a row of note boxes on top (carries / borrowed tens), two
 * operand rows, then for each entry of `sections` a printed line and that
 * many answer rows (addition: [1]; multiplication: [2, 1] - two partial
 * products, then their sum).
 */
function columnTemplate(id: TemplateId, label: string, op: GuideGlyph["char"], sections: number[], notes: NoteRow | null, cols = 5): WritingTemplate {
  const left = (WIDTH - (cols + 1) * CELL_W) / 2;
  const xOf = (placeCol: number) => left + CELL_W * (cols - placeCol) + CELL_W / 2;
  const xs = Array.from({ length: cols }, (_, c) => xOf(c));
  const boxes: GuideBox[] = [];
  const lines: GuideLine[] = [];
  const glyphs: GuideGlyph[] = [];
  const slots: WritingTemplate["slots"] = {};
  const digitRow = (name: string, y: number) => {
    for (const x of xs) boxes.push({ x: x - CELL_W / 2 + 4, y, w: CELL_W - 8, h: CELL_H, kind: "digit" });
    slots[name] = { cy: y + CELL_H / 2, xs };
  };

  let y = 18;
  if (notes) {
    for (const x of xs) boxes.push({ x: x - CELL_W / 2 + notes.inset, y, w: CELL_W - 2 * notes.inset, h: notes.h, kind: "note" });
    slots.notes = { cy: y + notes.h / 2, xs };
    y += notes.h + 8;
  }
  const topRowY = y;
  digitRow("top", y);
  y += CELL_H + GAP;
  digitRow("bottom", y);
  glyphs.push({ char: op, cx: left + CELL_W / 2, cy: y + CELL_H / 2, size: 44 });
  y += CELL_H + 8;
  sections.forEach((rowCount, k) => {
    lines.push({ x1: left + 6, x2: left + (cols + 1) * CELL_W - 6, y });
    y += 12;
    for (let r = 0; r < rowCount; r++) {
      digitRow(k === sections.length - 1 && r === rowCount - 1 ? "answer" : `section${k}row${r}`, y);
      y += CELL_H + (r < rowCount - 1 ? GAP : 8);
    }
  });
  return {
    id,
    label,
    width: WIDTH,
    height: y + 14,
    boxes,
    lines,
    glyphs,
    grid: {
      anchorX: xOf(0),
      pitch: CELL_W,
      notesAboveY: notes ? topRowY : undefined,
      rowYs: Object.entries(slots)
        .filter(([name]) => name !== "notes")
        .map(([, slot]) => slot.cy)
        .sort((a, b) => a - b),
    },
    slots,
  };
}

/**
 * Division needs no note boxes (kort division's remainders go in the space
 * above the dividend) and trappan needs many rows, so both use a somewhat
 * smaller cell - still comfortable for a finger, and trappan fits a tablet
 * screen better.
 */
const DIV_W = 60;
const DIV_H = 76;

/** Kort division: dividend over a printed fraction bar, divisor under it, "=" and the quotient to the right. */
function shortDivisionTemplate(): WritingTemplate {
  const CELL_W = DIV_W;
  const CELL_H = DIV_H;
  const cols = 4;
  const left = 150;
  const top = 50; // room above for the small remainder notes
  const barY = top + CELL_H + 16;
  const dividendXs = Array.from({ length: cols }, (_, c) => left + CELL_W * (cols - 1 - c) + CELL_W / 2);
  const barX2 = left + cols * CELL_W;
  const divisorXs = [left + (cols * CELL_W) / 2 + CELL_W / 2, left + (cols * CELL_W) / 2 - CELL_W / 2];
  const eqX = barX2 + 52;
  const quotientLeft = eqX + 44;
  const quotientXs = Array.from({ length: cols }, (_, c) => quotientLeft + CELL_W * (cols - 1 - c) + CELL_W / 2);
  const boxes: GuideBox[] = [
    ...dividendXs.map((x) => ({ x: x - CELL_W / 2 + 4, y: top, w: CELL_W - 8, h: CELL_H, kind: "digit" as const })),
    ...divisorXs.map((x) => ({ x: x - CELL_W / 2 + 4, y: barY + 14, w: CELL_W - 8, h: CELL_H, kind: "digit" as const })),
    ...quotientXs.map((x) => ({ x: x - CELL_W / 2 + 4, y: barY - CELL_H / 2, w: CELL_W - 8, h: CELL_H, kind: "digit" as const })),
  ];
  return {
    id: "shortDiv",
    label: "Kort division",
    width: WIDTH,
    height: barY + 14 + CELL_H + 22,
    boxes,
    lines: [{ x1: left - 10, x2: barX2 + 10, y: barY, fraction: true }],
    glyphs: [{ char: "=", cx: eqX, cy: barY, size: 44 }],
    slots: {
      dividend: { cy: top + CELL_H / 2, xs: dividendXs },
      divisor: { cy: barY + 14 + CELL_H / 2, xs: divisorXs },
      quotient: { cy: barY, xs: quotientXs },
    },
  };
}

/** Trappan: divisor left of the bracket's stem, dividend under its bar, quotient above, and room for the steps below. */
function trappanTemplate(): WritingTemplate {
  const CELL_W = DIV_W;
  const CELL_H = DIV_H;
  const cols = 4;
  const workRows = 6;
  const divisorLeft = 110;
  const stemX = divisorLeft + 2 * CELL_W + 14;
  const dividendLeft = stemX + 10;
  const xOf = (c: number) => dividendLeft + CELL_W * (cols - 1 - c) + CELL_W / 2;
  const xs = Array.from({ length: cols }, (_, c) => xOf(c));
  const workXs = Array.from({ length: cols + 1 }, (_, c) => xOf(c)); // one extra column on the left for the "−"
  const quotientTop = 18;
  const barY = quotientTop + CELL_H + 10;
  const dividendTop = barY + 8;
  const stemBottom = dividendTop + CELL_H + 8;
  const barX2 = dividendLeft + cols * CELL_W + 8;
  const boxes: GuideBox[] = [
    ...xs.map((x) => ({ x: x - CELL_W / 2 + 4, y: quotientTop, w: CELL_W - 8, h: CELL_H, kind: "digit" as const })),
    ...xs.map((x) => ({ x: x - CELL_W / 2 + 4, y: dividendTop, w: CELL_W - 8, h: CELL_H, kind: "digit" as const })),
    ...[0, 1].map((i) => ({ x: divisorLeft + i * CELL_W + 4, y: dividendTop, w: CELL_W - 8, h: CELL_H, kind: "digit" as const })),
  ];
  let y = stemBottom + 14;
  const workSlots: WritingTemplate["slots"] = {};
  for (let r = 0; r < workRows; r++) {
    for (const x of workXs) boxes.push({ x: x - CELL_W / 2 + 4, y, w: CELL_W - 8, h: CELL_H - 10, kind: "work" });
    workSlots[`work${r}`] = { cy: y + (CELL_H - 10) / 2, xs: workXs };
    y += CELL_H - 4;
  }
  return {
    id: "trappan",
    label: "Trappan",
    width: WIDTH,
    height: y + 14,
    boxes,
    lines: [],
    glyphs: [],
    bracket: { divisorSide: "left", bar: { minX: stemX, maxX: barX2, y: barY }, stemX, stemBottom },
    grid: { anchorX: xOf(0), pitch: CELL_W },
    slots: {
      quotient: { cy: quotientTop + CELL_H / 2, xs },
      dividend: { cy: dividendTop + CELL_H / 2, xs },
      divisor: { cy: dividendTop + CELL_H / 2, xs: [divisorLeft + 1.5 * CELL_W, divisorLeft + 0.5 * CELL_W] },
      ...workSlots,
    },
  };
}

export const TEMPLATES: WritingTemplate[] = [
  FREE,
  columnTemplate("add", "Addition", "+", [1], CARRY_NOTES),
  columnTemplate("sub", "Subtraktion", "−", [1], BORROW_NOTES),
  // Multiplication's carries are done without note boxes - one less row, a shorter page.
  columnTemplate("mul", "Multiplikation", "·", [2, 1], null),
  shortDivisionTemplate(),
  trappanTemplate(),
];

export function templateById(id: TemplateId): WritingTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? FREE;
}

/** The page URL's `?mall=` parameter picks the starting template (e.g. `mathinput.html?mall=sub`) - so a quick-start command can open straight into one. */
export const TEMPLATE_URL_PARAM = "mall";

export function templateIdFromUrl(search: string): TemplateId {
  const id = new URLSearchParams(search).get(TEMPLATE_URL_PARAM);
  return TEMPLATES.some((t) => t.id === id) ? (id as TemplateId) : "free";
}

/**
 * One digit per box: in a column template, all ink in the same digit box is
 * one symbol, however it was drawn - a "5" whose hat was lifted off its body
 * would otherwise be a "5" plus a "-" that isn't a digit (so the number
 * couldn't be read). The note row ("10" is two digits in one box) and a
 * decimal comma between two boxes stay as they are.
 */
export function mergeByBox(segments: SegmentedSymbol[], printed: ClassifiedSymbol[]): SegmentedSymbol[] {
  const grid = printed.find((p) => p.grid?.rowYs)?.grid;
  const rowYs = grid?.rowYs;
  if (!grid || !rowYs) return segments;
  const out: SegmentedSymbol[] = [];
  const byBox = new Map<string, SegmentedSymbol[]>();
  for (const seg of segments) {
    const row = rowYs.reduce((best, y, k) => (Math.abs(y - seg.box.cy) < Math.abs(rowYs[best] - seg.box.cy) ? k : best), 0);
    const inNoteRow = grid.notesAboveY !== undefined && seg.box.cy < grid.notesAboveY;
    if (seg.knownChar || inNoteRow || isCommaBetweenBoxes(seg.box, grid, rowYs[row])) {
      out.push(seg);
      continue;
    }
    const key = `${row}:${Math.round((grid.anchorX - seg.box.cx) / grid.pitch)}`;
    byBox.set(key, [...(byBox.get(key) ?? []), seg]);
  }
  for (const group of byBox.values()) {
    if (group.length === 1) {
      out.push(group[0]);
      continue;
    }
    const minX = Math.min(...group.map((g) => g.box.minX));
    const minY = Math.min(...group.map((g) => g.box.minY));
    const maxX = Math.max(...group.map((g) => g.box.maxX));
    const maxY = Math.max(...group.map((g) => g.box.maxY));
    out.push({ strokes: group.flatMap((g) => g.strokes), box: box(minX, minY, maxX, maxY), struck: group.some((g) => g.struck) || undefined });
  }
  return out;
}

/** The template's printed parts, as the symbols recognition would otherwise have had to read from ink. */
export function printedSymbols(t: WritingTemplate): ClassifiedSymbol[] {
  const out: ClassifiedSymbol[] = [];
  for (const l of t.lines) out.push({ char: "-", box: box(l.x1, l.y - 2, l.x2, l.y + 2), grid: t.grid, fractionBar: l.fraction });
  for (const g of t.glyphs) {
    const h = g.size / 2;
    if (g.char === "+") out.push({ char: "+", box: box(g.cx - h * 0.6, g.cy - h * 0.6, g.cx + h * 0.6, g.cy + h * 0.6) });
    else if (g.char === "−") out.push({ char: "-", box: box(g.cx - h * 0.6, g.cy - 2, g.cx + h * 0.6, g.cy + 2) });
    else if (g.char === "·") out.push({ char: "·", box: box(g.cx - 4, g.cy - 4, g.cx + 4, g.cy + 4) });
    else out.push({ char: "=", box: box(g.cx - h * 0.6, g.cy - h * 0.3, g.cx + h * 0.6, g.cy + h * 0.3) });
  }
  if (t.bracket) {
    const b = t.bracket;
    out.push({ char: "⟌", box: box(Math.min(b.stemX, b.bar.minX), b.bar.y, b.bar.maxX, b.stemBottom), bracket: b, grid: t.grid });
  }
  return out;
}
