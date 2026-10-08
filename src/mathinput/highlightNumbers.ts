/**
 * Pointing at a number in written work - the one a check found suspicious
 * (workCheck.ts's unknownNumbers: a 5 where the figure says 6) - both in the
 * typeset reading of the work and in the ink itself.
 */
import type { Stroke } from "../recognition/preprocess";
import type { BoundingBox } from "./segmentation";

/** The colour a suspicious number is marked in. */
export const SUSPECT_COLOR = "#dc2626";

const same = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

/**
 * The reading (layout.ts's LaTeX, where a number's digits are spaced: "2 0",
 * "7 8 {,} 5", "12\,500") with each number equal to one of `values` coloured.
 * Exponents and subscripts (r^{2}, x_{1}) are notation, not numbers written, and stay as they are.
 */
export function highlightInLatex(latex: string, values: readonly number[]): string {
  if (values.length === 0) return latex;
  return latex.replace(/\d(?:(?:\s|\\,)*\d|\s*\{,\}\s*\d)*/g, (match, offset: number) => {
    const before = latex.slice(0, offset).trimEnd();
    if (/[\^_]\{?$/.test(before)) return match;
    const value = Number(match.replace(/\\,|\s/g, "").replace("{,}", "."));
    return values.some((v) => same(v, value)) ? `\\textcolor{${SUSPECT_COLOR}}{${match}}` : match;
  });
}

interface InkSymbol {
  char: string;
  box: BoundingBox;
  strokes: Stroke[];
}

/** The numbers written in ink: runs of digits side by side on a line (with a decimal comma or point between), each with its strokes. */
export function inkNumbers(symbols: readonly InkSymbol[]): { value: number; strokes: Stroke[] }[] {
  const isDigit = (s: InkSymbol) => /^[0-9]$/.test(s.char);
  const runs: { text: string; last: InkSymbol; strokes: Stroke[]; open: boolean }[] = [];
  for (const s of [...symbols].sort((a, b) => a.box.minX - b.box.minX)) {
    const run = runs.find((r) => r.open && Math.abs(r.last.box.cy - s.box.cy) < r.last.box.height * 0.6);
    const h = run ? run.last.box.height : s.box.height;
    const close = run && s.box.minX - run.last.box.maxX < h * 0.7;
    if (isDigit(s)) {
      if (run && close) {
        run.text += s.char;
        run.last = s;
        run.strokes.push(...s.strokes);
      } else {
        if (run) run.open = false;
        runs.push({ text: s.char, last: s, strokes: [...s.strokes], open: true });
      }
    } else if (run) {
      // A decimal comma/point: small, low, right after a digit - the number goes on. Anything else ends it.
      const decimal = close && Math.max(s.box.width, s.box.height) < h * 0.45 && s.box.cy > run.last.box.cy && !run.text.includes(".");
      if (decimal) run.text += ".";
      else run.open = false;
    }
  }
  return runs.map((r) => ({ value: Number(r.text.replace(/\.$/, "")), strokes: r.strokes }));
}

/** Every stroke of a written number equal to one of `values`. */
export function strokesOfNumbers(symbols: readonly InkSymbol[], values: readonly number[]): Set<Stroke> {
  const out = new Set<Stroke>();
  for (const n of inkNumbers(symbols)) if (values.some((v) => same(v, n.value))) for (const s of n.strokes) out.add(s);
  return out;
}
