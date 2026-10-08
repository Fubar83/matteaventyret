/**
 * Kort division as written in Swedish schools today: the dividend over a
 * fraction bar, the divisor under it, "=" and the quotient to the right, and
 * each remainder written small, up and to the left of the digit it's carried
 * into:
 *
 *    6²8 8
 *    ─────  = 1 7 2
 *      4
 *
 * The layout renders this as an ordinary fraction (with the remainder notes
 * as prescripts - see layout.ts), so unlike column arithmetic and long
 * division it has no block of its own there. This parser recovers the
 * structure for the verifier: dividend digits and remainder notes by column,
 * divisor, and quotient digits by column (the quotient is right-aligned with
 * the dividend: its last digit is the ones).
 */
import type { ClassifiedSymbol } from "./layout";
import type { DivisionCell } from "./longDivisionLayout";

export interface ShortDivisionWork {
  kind: "shortDivision";
  dividend: DivisionCell[];
  /** Remainder notes, keyed by the dividend column they're carried into. */
  notes: { col: number; symbols: ClassifiedSymbol[]; value: number | null }[];
  divisor: ClassifiedSymbol[];
  quotient: DivisionCell[];
  /** For placing a missing quotient digit: the x of quotient column 0, the column step, and the row's y. */
  quotientAnchorX: number;
  quotientPitch: number;
  quotientY: number;
  consumed: Set<ClassifiedSymbol>;
}

const isDigit = (s: ClassifiedSymbol) => !s.latex && /^[0-9]$/.test(s.char);
const digitOf = (s: ClassifiedSymbol) => (isDigit(s) ? Number(s.char) : null);

/** Tries each fraction bar (a "-" with digits above and below), widest first. */
export function parseShortDivision(symbols: ClassifiedSymbol[]): ShortDivisionWork | null {
  const bars = symbols.filter((s) => s.char === "-").sort((a, b) => b.box.width - a.box.width);
  for (const bar of bars) {
    const margin = bar.box.width * 0.2;
    const inSpan = (s: ClassifiedSymbol) => s !== bar && s.box.cx >= bar.box.minX - margin && s.box.cx <= bar.box.maxX + margin;
    const above = symbols.filter((s) => inSpan(s) && s.box.cy < bar.box.cy).sort((a, b) => a.box.cx - b.box.cx);
    const below = symbols.filter((s) => inSpan(s) && s.box.cy > bar.box.cy).sort((a, b) => a.box.cx - b.box.cx);
    if (above.length === 0 || below.length === 0 || !above.every(isDigit) || !below.every(isDigit)) continue;

    const tallest = Math.max(...above.map((s) => s.box.height));
    const digitH = tallest;
    const dividendSymbols = above.filter((s) => s.box.height >= tallest * 0.65);
    const noteSymbols = above.filter((s) => !dividendSymbols.includes(s));

    // "=" then the quotient, on the bar's line, to its right.
    const onLine = (s: ClassifiedSymbol) => Math.abs(s.box.cy - bar.box.cy) < digitH * 0.6 && s.box.minX > bar.box.maxX - digitH * 0.2;
    const right = symbols.filter(onLine).sort((a, b) => a.box.cx - b.box.cx);
    if (right.length === 0 || right[0].char !== "=") continue;
    // The quotient's digits run together, but its first one may sit a good
    // way from the "=" - e.g. written right-aligned in a template's boxes,
    // leaving the first box empty.
    const quotientSymbols: ClassifiedSymbol[] = [];
    for (const s of right.slice(1)) {
      const prev = quotientSymbols[quotientSymbols.length - 1];
      const maxGap = prev ? digitH * 1.2 : digitH * 3.5;
      if (!isDigit(s) || s.box.minX - (prev ?? right[0]).box.maxX > maxGap) break;
      quotientSymbols.push(s);
    }

    const toCells = (list: ClassifiedSymbol[]): DivisionCell[] => list.map((symbol, i) => ({ col: list.length - 1 - i, symbol, digit: digitOf(symbol) }));
    const dividend = toCells(dividendSymbols);
    const quotient = toCells(quotientSymbols);

    // Each note belongs to the dividend digit right after it.
    const notesByCol = new Map<number, ClassifiedSymbol[]>();
    for (const n of noteSymbols) {
      const next = dividend.find((c) => c.symbol.box.cx > n.box.cx);
      if (!next) continue;
      notesByCol.set(next.col, [...(notesByCol.get(next.col) ?? []), n]);
    }
    const notes = [...notesByCol].map(([col, list]) => {
      const digits = list.map(digitOf);
      return { col, symbols: list, value: digits.every((d) => d !== null) ? Number(digits.join("")) : null };
    });

    const qGaps = quotientSymbols.slice(1).map((s, i) => s.box.cx - quotientSymbols[i].box.cx);
    const quotientPitch = qGaps.length > 0 ? qGaps.reduce((a, b) => a + b, 0) / qGaps.length : digitH * 0.8;
    const lastQ = quotientSymbols[quotientSymbols.length - 1];
    return {
      kind: "shortDivision",
      dividend,
      notes,
      divisor: below,
      quotient,
      quotientAnchorX: lastQ ? lastQ.box.cx : right[0].box.maxX + digitH * 0.6,
      quotientPitch,
      quotientY: bar.box.cy,
      consumed: new Set([bar, ...above, ...below, ...right.slice(0, 1 + quotientSymbols.length)]),
    };
  }
  return null;
}
