/**
 * Checking a solution one step at a time (training mode: one box per step,
 * checked as the child moves on). A step is judged as a line of the whole
 * solution so far (workCheck.ts): does it still hold, does it bring in a
 * number that came from nowhere - and is it the answer.
 */
import { givenNumbers, type AdvancedProblem } from "../engine/advanced";
import { parseExpression, parseLines } from "./evaluate";
import { checkWrittenAnswer, isSimplestFraction, isSimplified, numbersIn, withoutUnits, type Answer } from "./workCheck";

/** A question's answer in the checker's form. */
export function answerOf(p: AdvancedProblem): Answer {
  const a = p.answer;
  if (a.kind === "value") return { ...a, givens: givenNumbers(p) }; // approx (π, sin) travels along
  if (a.kind === "solutions") return { kind: "solutions", variable: a.variable, values: a.values, given: [] };
  if (a.kind === "system") return a;
  return { kind: "expression", variable: a.variable, expected: parseExpression(a.latex)!, form: a.form };
}

/**
 * The step is the answer written out, not just equal to it: a number answer
 * ends in the number ("−4 − (−2) = −4 + 2" is equal but not worked out), an
 * expression is simplified as far as the answer is (an "utveckla"/"faktorisera"
 * answer is held to its form by the checker itself).
 */
function finished(latex: string, answer: Answer): boolean {
  // A probability (or any answer that isn't whole) is as much worked out as a fraction in lowest terms (3/11) as a decimal.
  if (answer.kind === "value") return answer.fraction ? endsInSimplestFraction(latex) : endsInNumber(latex) || (!Number.isInteger(answer.value) && endsInSimplestFraction(latex));
  if (answer.kind === "system") return true;
  // "x = 64/8" is the solution, not yet worked out: each one stated ("x₁ = 2, x₂ = −5") ends in its number.
  if (answer.kind === "solutions") {
    return statements(latex)
      .filter((part) => part.includes("="))
      .every(endsInNumber);
  }
  if (answer.kind === "expression" && answer.form !== "factored") {
    const lines = parseLines(latex).filter((l) => l !== null);
    const last = lines[lines.length - 1];
    const side = last?.sides[last.sides.length - 1];
    return !!side && isSimplified(side, answer.expected);
  }
  return true;
}

/** The values a step states for the variable: "x = 5", "x_1 = 2, x_2 = -5" - each worked out to a plain number. */
function statedValues(latex: string, variable: string): number[] {
  const out: number[] = [];
  for (const part of statements(latex)) {
    const line = parseLines(part)[0];
    if (!line || line.sides.length < 2 || !endsInNumber(part)) continue;
    const lhs = line.sides[0];
    if (lhs.kind !== "var" || !(lhs.name === variable || lhs.name.startsWith(`${variable}_`))) continue;
    const last = line.sides[line.sides.length - 1];
    out.push(last.kind === "num" ? last.value : last.kind === "neg" && last.arg.kind === "num" ? -last.arg.value : NaN);
  }
  return out.filter(Number.isFinite);
}

/** The step ends in a fraction in lowest terms (or a whole number). */
function endsInSimplestFraction(latex: string): boolean {
  const lines = parseLines(latex).filter((l) => l !== null);
  const last = lines[lines.length - 1];
  const side = last?.sides[last.sides.length - 1];
  return !!side && isSimplestFraction(side);
}

/** A step split into its statements: "x₁ = 2, x₂ = −5" is two (a decimal comma "{,}" stays). */
function statements(latex: string): string[] {
  return latex
    .replace(/\{,\}/g, "#")
    .split(/,|;|\\lor|\\vee/)
    .map((part) => part.replace(/#/g, "{,}"));
}

/** The step ends in a plain number ("= 24", "≈ 78,5", "= −2") - an answer written out. */
function endsInNumber(latex: string): boolean {
  const lines = parseLines(latex).filter((l) => l !== null);
  const last = lines[lines.length - 1];
  const side = last?.sides[last.sides.length - 1];
  if (!side) return false;
  const plain = (e: typeof side) => e.kind === "num" || (e.kind === "neg" && e.arg.kind === "num");
  // A percentage written out ("46 %" reads as 46 / 100) is a number too.
  const percent = side.kind === "bin" && side.op === "/" && plain(side.left) && side.right.kind === "num" && side.right.value === 100;
  return plain(side) || percent;
}

export type StepVerdict =
  /** The step is the answer, and it's right: done. */
  | { kind: "solved"; fullSetup: boolean }
  /** A right step - on to the next. */
  | { kind: "ok" }
  /** Right so far, with solutions still to find ("x₁ = 2" of two). */
  | { kind: "more"; missing: number }
  /** The right expression, not written the way asked yet (brackets left to expand, not a product yet). */
  | { kind: "notFinished"; form: "expanded" | "factored" | "simplest" }
  /** The step doesn't follow - and the numbers in it that didn't come from the question or an earlier step, if any. */
  | { kind: "wrong"; suspects: number[] }
  /** Nothing in the step reads as maths - write it again. */
  | { kind: "unread" };

/**
 * The verdict on the last of `steps` (each the LaTeX one box was read as),
 * given the ones before it. `unit`: the question's answer has a unit,
 * written after a number ("24 cm") - it isn't part of the number.
 */
export function checkStep(steps: readonly string[], answer: Answer, unit = false): StepVerdict {
  const clean = steps.map((s) => (unit ? withoutUnits(s) : s));
  const current = clean[clean.length - 1] ?? "";
  // (A ± reads as both signs to the checker - for whether it reads at all, either will do.)
  const reads = (part: string) => parseLines(part.replace(/\\pm/g, "+")).some((l) => l !== null);
  if (current.trim() === "" || !statements(current).some(reads)) return { kind: "unread" };
  // The whole solution so far, one row per step - the checker numbers its rows, so the last row is this step.
  const latex = clean.join(" \\\\ ");
  const v = checkWrittenAnswer(latex, answer);
  // A number answer is given as the number: "−4 − (−2) = −4 + 2" equals it, but isn't worked out yet.
  if (v.correct && finished(current, answer)) return { kind: "solved", fullSetup: v.fullSetup };
  const row = clean.length - 1;
  // Numbers in this step that come from nowhere (the 5 where the figure says 6).
  const here = new Set(numbersIn(current).map((n) => Math.round(n * 1e6)));
  const suspects = (v.unknownNumbers ?? []).filter((n) => here.has(Math.round(n * 1e6)));
  if (v.badLines.includes(row) || suspects.length > 0) return { kind: "wrong", suspects };
  // A solution stated that isn't one ("x = 1000" for 2x − 7 = −1): the whole-solution checker leaves answer lines to the
  // final answer, but here each step is judged as it's written - the wrong value is what to look at.
  const wrongValues = answer.kind === "solutions" ? statedValues(current, answer.variable).filter((x) => !answer.values.some((a) => Math.abs(a - x) < 1e-6)) : [];
  if (wrongValues.length > 0) return { kind: "wrong", suspects: wrongValues };
  if (v.missing) return { kind: "more", missing: v.missing };
  if (v.wrongForm) return { kind: "notFinished", form: v.wrongForm };
  return { kind: "ok" };
}
