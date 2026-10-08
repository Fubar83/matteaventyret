/**
 * A calculation from a solution step, to be worked out in a column
 * (ColumnHelper.tsx): finding it in what was written, and setting it up as
 * whole numbers the way it's taught.
 */
import { formatSwedishNumber } from "../engine/digits";
import type { GuidedOperator } from "../mathinput/guidedPlan";

/** A calculation to set up: two numbers (decimals allowed) and +, − or ×. */
export interface ColumnTask {
  operator: GuidedOperator;
  a: number;
  b: number;
}

/** How many decimals a number is written with: 3,14 → 2. */
export const decimalsOf = (n: number) => (String(n).split(".")[1] ?? "").length;

/**
 * The last "number · number" or "number + number" written in a step - what the
 * child most likely wants worked out ("A = 3,14 · 25" → 3,14 · 25). Read off
 * the step's LaTeX as the recognizer wrote it (digits may be spaced: "2 5").
 */
export function columnTaskIn(latex: string): ColumnTask | null {
  const flat = latex.replace(/\{,\}/g, ",").replace(/\s+/g, "");
  // Numbers, the two signs, and anything else - so in a chain (2 · 3,14 · 6) every neighbouring pair is seen.
  const tokens = flat.match(/\d+(?:,\d+)?|\\cdot|\\times|\+|-|−|\\[a-zA-Z]+|./g) ?? [];
  const isNumber = (s: string) => /^\d/.test(s);
  for (let i = tokens.length - 3; i >= 0; i--) {
    const [a, op, b] = tokens.slice(i, i + 3);
    if (!isNumber(a) || !isNumber(b) || !["\\cdot", "\\times", "+", "-", "−"].includes(op)) continue;
    const num = (s: string) => Number(s.replace(",", "."));
    // A subtraction the wrong way round (12 − 30) isn't one to set up in a column.
    if ((op === "-" || op === "−") && num(a) < num(b)) continue;
    return { operator: op === "+" ? "+" : op === "\\cdot" || op === "\\times" ? "×" : "−", a: num(a), b: num(b) };
  }
  return null;
}

/**
 * The calculation as whole numbers, set up the school way: for ×, both
 * multiplied without their decimal commas and the decimals counted after;
 * for + and −, both written with as many decimals (commas under each other:
 * 36 − 28,26 is 36,00 − 28,26).
 */
export function wholeNumberTask(task: ColumnTask): { top: number; bottom: number; decimals: number } {
  const da = decimalsOf(task.a);
  const db = decimalsOf(task.b);
  if (task.operator === "×") return { top: Math.round(task.a * 10 ** da), bottom: Math.round(task.b * 10 ** db), decimals: da + db };
  const d = Math.max(da, db);
  return { top: Math.round(task.a * 10 ** d), bottom: Math.round(task.b * 10 ** d), decimals: d };
}

/** A number the Swedish way, decimals and all: 7 850, 78,5. */
export function show(n: number): string {
  const [whole, decimals] = String(Math.round(n * 1e6) / 1e6).split(".");
  return formatSwedishNumber(Number(whole)) + (decimals ? `,${decimals}` : "");
}
