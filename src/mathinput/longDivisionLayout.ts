/**
 * A written-out long division (trappan / liggande stolen - see
 * divisionBracket.ts for how the bracket is found), in two steps like
 * columnLayout.ts: parseLongDivision turns the symbols into a structured
 * LongDivisionWork (quotient, dividend, divisor, and the work rows under it,
 * each placed by digit column) for the verifier and the page's overlay, and
 * renderLongDivision turns that into LaTeX:
 *
 *        1 9 1                 \begin{array}{rl}
 *      ─────── ┐               191 & \\
 *      7 6 4   │ 4     ->      \overline{764} & \big|\,4 \\
 *    - 4                       \underline{-4}\phantom{0}\phantom{0} & \\
 *    ───                       36\phantom{0} & \\
 *      3 6                     ...
 *
 * KaTeX has no \cline and no \vline inside a cell, so rather than a
 * one-cell-per-digit grid, every row is ONE right-aligned string, padded on
 * the right with invisible \phantom{0} digits to line up with the dividend's
 * columns. KaTeX's digits all have the same width, so ones stay under ones,
 * and each hand-drawn line becomes an \underline over exactly the digits it
 * was drawn under - closer to the handwriting than a full-width \hline.
 * Trappan puts the divisor in a left column instead (`4\,\big|` then the
 * dividend).
 */
import type { BoundingBox } from "./segmentation";
import type { ClassifiedSymbol } from "./layout";
import { isDividendPart, isDivisorPart, type DivisionBracket } from "./divisionBracket";

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

interface RawRow {
  items: ClassifiedSymbol[];
  minY: number;
  maxY: number;
}

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

export interface DivisionCell {
  /** Place-value column, 0 = the dividend's ones. */
  col: number;
  symbol: ClassifiedSymbol;
  digit: number | null;
}

export interface DivisionRow {
  sign: ClassifiedSymbol | null;
  cells: DivisionCell[];
  /** A line was drawn under it (the subtracted product). */
  underlined: boolean;
  cy: number;
}

export interface LongDivisionWork {
  kind: "longDivision";
  divisorSide: DivisionBracket["divisorSide"];
  quotient: DivisionCell[];
  dividend: DivisionCell[];
  divisor: ClassifiedSymbol[];
  /** The work under the dividend, top to bottom. */
  rows: DivisionRow[];
  pitch: number;
  anchorX: number;
  /** Where the quotient row sits (for placing a missing quotient digit). */
  quotientY: number;
  consumed: Set<ClassifiedSymbol>;
  box: BoundingBox;
}

export interface LongDivisionBlock {
  consumed: Set<ClassifiedSymbol>;
  latex: string;
  box: BoundingBox;
}

const digitOf = (s: ClassifiedSymbol) => (/^[0-9]$/.test(s.char) ? Number(s.char) : null);

export function parseLongDivision(bracketSymbol: ClassifiedSymbol, bracket: DivisionBracket, candidates: ClassifiedSymbol[]): LongDivisionWork {
  const others = candidates.filter((s) => s !== bracketSymbol);
  const dividendSymbols = others.filter((s) => isDividendPart(bracket, s.box)).sort((a, b) => a.box.cx - b.box.cx);
  const divisor = others.filter((s) => !dividendSymbols.includes(s) && isDivisorPart(bracket, s.box)).sort((a, b) => a.box.cx - b.box.cx);
  const digitH = dividendSymbols.length > 0 ? median(dividendSymbols.map((s) => s.box.height)) : bracket.stemBottom - bracket.bar.y;
  const quotientSymbols = others
    .filter(
      (s) =>
        s.box.cx > bracket.bar.minX - digitH * 0.3 &&
        s.box.cx < bracket.bar.maxX + digitH * 0.3 &&
        s.box.maxY <= bracket.bar.y + digitH * 0.3 &&
        s.box.minY > bracket.bar.y - digitH * 2
    )
    .sort((a, b) => a.box.cx - b.box.cx);
  const workTop = Math.max(bracket.stemBottom, ...dividendSymbols.map((s) => s.box.maxY)) - digitH * 0.2;
  const workSymbols = others.filter(
    (s) =>
      !dividendSymbols.includes(s) &&
      !divisor.includes(s) &&
      s.box.cy > workTop &&
      s.box.cx > bracket.bar.minX - digitH * 1.5 &&
      s.box.cx < bracket.bar.maxX + digitH * 0.5
  );

  // Digit columns come from the dividend (0 = its last digit) - or, with a
  // template, from the exact grid it printed.
  const grid = bracketSymbol.grid;
  const gaps = dividendSymbols.slice(1).map((s, i) => s.box.cx - dividendSymbols[i].box.cx);
  const pitch = grid ? grid.pitch : gaps.length > 0 ? median(gaps) : digitH * 0.7;
  const anchorX = grid
    ? grid.anchorX
    : dividendSymbols.length > 0
      ? dividendSymbols[dividendSymbols.length - 1].box.cx
      : bracket.bar.maxX - pitch / 2;
  const colOf = (cx: number) => Math.max(0, Math.round((anchorX - cx) / pitch));

  /** With a grid, each digit is in its own box's column; otherwise a row's digits take consecutive columns leftward from wherever its last digit lands. */
  const toCells = (symbols: ClassifiedSymbol[]): DivisionCell[] => {
    if (symbols.length === 0) return [];
    const right = colOf(symbols[symbols.length - 1].box.cx);
    return symbols.map((symbol, i) => ({ col: grid ? colOf(symbol.box.cx) : right + (symbols.length - 1 - i), symbol, digit: digitOf(symbol) }));
  };

  const isLine = (s: ClassifiedSymbol) => s.char === "-" && s.box.width >= pitch * 1.2;
  const lines = workSymbols.filter(isLine);
  const rawRows = toRows(workSymbols.filter((s) => !isLine(s)));
  const underlined = new Set<RawRow>();
  for (const l of lines) {
    // A line belongs to the nearest row above it (the subtracted product).
    const above = rawRows.filter((r) => r.maxY <= l.box.cy + digitH * 0.2);
    if (above.length > 0) underlined.add(above[above.length - 1]);
  }
  const rows: DivisionRow[] = rawRows.map((r) => {
    const signs = r.items.filter((s) => s.char === "-" || s.char === "+");
    return { sign: signs[0] ?? null, cells: toCells(r.items.filter((s) => !signs.includes(s))), underlined: underlined.has(r), cy: (r.minY + r.maxY) / 2 };
  });

  const all = [bracketSymbol, ...dividendSymbols, ...divisor, ...quotientSymbols, ...workSymbols];
  const minX = Math.min(...all.map((s) => s.box.minX));
  const minY = Math.min(...all.map((s) => s.box.minY));
  const maxX = Math.max(...all.map((s) => s.box.maxX));
  const maxY = Math.max(...all.map((s) => s.box.maxY));
  return {
    kind: "longDivision",
    divisorSide: bracket.divisorSide,
    quotient: toCells(quotientSymbols),
    dividend: toCells(dividendSymbols),
    divisor,
    rows,
    pitch,
    anchorX,
    quotientY: bracket.bar.y - digitH * 0.7,
    consumed: new Set(all),
    box: { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY },
  };
}

export function renderLongDivision(
  work: LongDivisionWork,
  token: (s: ClassifiedSymbol) => string,
  layoutInline: (symbols: ClassifiedSymbol[]) => string
): string {
  const pad = (n: number) => "\\phantom{0}".repeat(n);
  /** A row's digits as one string, padded right to column 0 - the leading sign included. */
  const rowString = (sign: ClassifiedSymbol | null, cells: DivisionCell[], wrap?: (s: string) => string) => {
    const text = (sign ? token(sign) : "") + cells.map((c) => token(c.symbol)).join("");
    const right = cells.length > 0 ? cells[cells.length - 1].col : 0;
    return (wrap ? wrap(text) : text) + pad(right);
  };

  const quotientStr = work.quotient.length > 0 ? rowString(null, work.quotient) : "";
  const dividendStr = `\\overline{${work.dividend.map((c) => token(c.symbol)).join("")}}`;
  const divisorStr = layoutInline(work.divisor);
  const rows = work.rows.map((r) => rowString(r.sign, r.cells, r.underlined ? (t) => `\\underline{${t}}` : undefined));

  return work.divisorSide === "right"
    ? `\\begin{array}{rl} ${[`${quotientStr} &`, `${dividendStr} & \\big|\\,${divisorStr}`, ...rows.map((r) => `${r} &`)].join(" \\\\ ")} \\end{array}`
    : `\\begin{array}{rr} ${[`& ${quotientStr}`, `${divisorStr}\\,\\big| & ${dividendStr}`, ...rows.map((r) => `& ${r}`)].join(" \\\\ ")} \\end{array}`;
}

/** Parse + render in one go, for the layout pass. */
export function layoutLongDivision(
  bracketSymbol: ClassifiedSymbol,
  bracket: DivisionBracket,
  candidates: ClassifiedSymbol[],
  token: (s: ClassifiedSymbol) => string,
  layoutInline: (symbols: ClassifiedSymbol[]) => string
): LongDivisionBlock {
  const work = parseLongDivision(bracketSymbol, bracket, candidates);
  return { consumed: work.consumed, latex: renderLongDivision(work, token, layoutInline), box: work.box };
}
