/**
 * Grades written work - what a student wrote on the free-writing board, as
 * layout.ts's LaTeX - against a question's answer: is the final answer right,
 * and is there a full, correct setup leading to it? (See engine/scoring.ts:
 * a right answer is ★★, a right answer with a correct setup ★★★.)
 *
 * The recognizer never knows the answer; this runs on what it read, after.
 */
import { evaluate, freeVariables, nearlyEqual, parseLines, type Expr, type Line } from "./evaluate";

export type Answer =
  /**
   * A number: 36, 3,5, 0,5 (sin 30°). `approx`: a rounded answer (π, sin) -
   * written with "=" or "≈", but really worked out: the answer is the exact
   * value (`exact`, or `value` when not known) correctly rounded to the
   * decimals written (at least one) - 78,5 or 78,54 for π · 25, not 78,4 or
   * 79 - and each step holds to the decimals it's written with. π taken as
   * 3,14 counts as worked out (3,14 · 45 = 141,3 while π · 45 ≈ 141,4).
   */
  | {
      kind: "value";
      value: number;
      approx?: boolean;
      exact?: number;
      /**
       * The same worked out with π ≈ 3,14 (144 − 3,14 · 36 = 30,96, while
       * 144 − π · 36 = 30,90…): rounding it is right too. Needed where the
       * π part is taken away - the difference 3,14 makes is then a big part
       * of a small answer.
       */
      piAs314?: number;
      /** Written as a fraction in its lowest terms (2/3 - not 4/6, nor 0,666…), or a whole number. */
      fraction?: boolean;
      /**
       * The numbers the question gives (its measurements, its task, the numbers
       * a worked solution passes through). With them, a wrong answer points out
       * any number written that comes neither from the question nor from an
       * earlier step - a 5 where the figure says 6 (WorkVerdict.unknownNumbers).
       */
      givens?: number[];
    }
  /** An equation's solutions: x = 5, or x₁ = 2 and x₂ = −5 (in any order, x or x₁/x₂ written). */
  | { kind: "solutions"; variable: string; values: number[]; given: Expr[] }
  /**
   * An expression in a variable: 4x, 6x + 2 - equal at every point, however
   * it's written, unless `form` says how the final answer must be written:
   * "expanded" (utveckla: no brackets left) or "factored" (faktorisera: a product).
   */
  | { kind: "expression"; variable: string; expected: Expr; form?: "expanded" | "factored" }
  /** An equation system's solution: one value per variable (x = 2, y = 5), each stated. */
  | { kind: "system"; variables: string[]; values: number[] };

export interface WorkVerdict {
  /** The final answer is there and right. */
  correct: boolean;
  /** A correct setup leads to it: at least one real step, and no written line that's wrong. */
  fullSetup: boolean;
  /** Lines (0-based) that are written as true but aren't - for feedback. */
  badLines: number[];
  /**
   * An equation with several solutions, where every solution written is right
   * but some are missing: how many ("Rätt så långt - det finns fler lösningar").
   */
  missing?: number;
  /** The final answer is equal to the right one but not written the way asked - still brackets to expand, or not yet a product. */
  wrongForm?: "expanded" | "factored" | "simplest";
  /**
   * A wrong answer's likely cause: numbers written that neither the question
   * gives nor an earlier step worked out - "8 · 5 / 2 = 20" when the height
   * is 6 gives [5] (the 20 is fine: it's what 8 · 5 / 2 makes).
   */
  unknownNumbers?: number[];
}

/** The numbers written in an expression - not exponents (the 2 of r²) or a root's index, which are part of the notation. */
export function writtenNumbers(e: Expr, out: number[] = []): number[] {
  switch (e.kind) {
    case "num":
      out.push(e.value);
      break;
    case "neg":
    case "deg":
    case "call":
      writtenNumbers(e.arg, out);
      break;
    case "fn":
      writtenNumbers(e.arg, out);
      break;
    case "root":
      writtenNumbers(e.arg, out);
      break;
    case "bin":
      writtenNumbers(e.left, out);
      if (e.op !== "^") writtenNumbers(e.right, out);
      break;
    default:
      break;
  }
  return out;
}

/** The value of every part of an expression that has one (no letters in it) - what a later step may carry on with. */
function partValues(e: Expr, out: number[] = []): number[] {
  if (freeVariables(e).size === 0) {
    const v = evaluate(e);
    if (Number.isFinite(v)) out.push(v);
  }
  if (e.kind === "bin") {
    partValues(e.left, out);
    partValues(e.right, out);
  } else if (e.kind === "neg" || e.kind === "fn" || e.kind === "deg" || e.kind === "call" || e.kind === "root") {
    partValues(e.arg, out);
  }
  return out;
}

/**
 * Numbers in the work that come from nowhere: not given by the question, not
 * a value an earlier step (or an earlier part of this line) worked out, and
 * not simply the result of the side before it ("… = 20").
 */
function unknownNumbersIn(lines: (Line | null)[], givens: number[], rounded: boolean): number[] {
  const same = (a: number, b: number) => (rounded ? roundedEqual(a, b) : nearlyEqual(a, b, true));
  const known = [...givens, 2];
  const worked: number[] = [];
  const unknown: number[] = [];
  for (const line of lines) {
    if (!line) continue;
    line.sides.forEach((side, k) => {
      if (freeVariables(side).size > 0) return;
      const value = evaluate(side);
      const before = k > 0 ? line.sides[k - 1] : null;
      // "… = 20": the result of the step before, whatever went into it.
      if (side.kind === "num" && before && freeVariables(before).size === 0 && same(value, evaluate(before))) return;
      for (const n of writtenNumbers(side)) {
        const explained = known.some((g) => same(g, n)) || worked.some((w) => same(w, n));
        if (!explained && !unknown.some((u) => same(u, n))) unknown.push(n);
      }
    });
    for (const side of line.sides) partValues(side, worked);
  }
  return unknown;
}

/** Holds a + or − somewhere inside. */
function hasSum(e: Expr): boolean {
  switch (e.kind) {
    case "bin":
      return e.op === "+" || e.op === "-" || hasSum(e.left) || hasSum(e.right);
    case "neg":
    case "fn":
    case "deg":
    case "call":
      return hasSum(e.arg);
    default:
      return false;
  }
}

/** The terms of a sum: a + b − c → a, b, c. */
function termsOf(e: Expr): Expr[] {
  if (e.kind === "bin" && (e.op === "+" || e.op === "-")) return [...termsOf(e.left), ...termsOf(e.right)];
  if (e.kind === "neg") return termsOf(e.arg);
  return [e];
}

/** Written out: a sum of terms, none of which still holds a bracketed sum - x² + 6x + 9, not (x + 3)² or x(x + 6) + 9. */
function isExpanded(e: Expr): boolean {
  return termsOf(e).every((t) => !hasSum(t));
}

/** A product with a sum in it: (x + 3)², (x + 5)(x − 5), 2(x − 1)(x + 1) - a factoring, not a sum of terms. */
function isFactored(e: Expr): boolean {
  const inner = e.kind === "neg" ? e.arg : e;
  if (inner.kind !== "bin") return false;
  if (inner.op === "^") return hasSum(inner.left);
  if (inner.op !== "*") return false;
  const factors = (x: Expr): Expr[] => (x.kind === "bin" && x.op === "*" ? [...factors(x.left), ...factors(x.right)] : [x]);
  return factors(inner).some((f) => hasSum(f) && freeVariables(f).size > 0);
}

/** How many plain numbers multiply together in a term: 3 · 2x has two (not worked out yet), 6x one, x² none - an exponent isn't a factor. */
function numberFactors(e: Expr): number {
  if (e.kind === "num") return 1;
  if (e.kind === "neg") return numberFactors(e.arg);
  if (e.kind === "bin" && (e.op === "*" || e.op === "/")) return numberFactors(e.left) + numberFactors(e.right);
  return 0;
}

/**
 * Worked out as far as the answer is: no more terms than it, no bracketed
 * sum left in a term, no numbers left to multiply (3 · 2x) - "4x + 3", not
 * "3x + x - 8 + 11" or "(3) · 2x + 4". For a step-by-step solution, where
 * every step equals the answer and only the last is the answer.
 */
export function isSimplified(e: Expr, expected: Expr): boolean {
  const terms = termsOf(e);
  // A term without letters is a plain number (25, not 5²).
  const plain = (t: Expr) => freeVariables(t).size > 0 || t.kind === "num" || (t.kind === "neg" && t.arg.kind === "num");
  return terms.length <= termsOf(expected).length && terms.every((t) => !hasSum(t) && numberFactors(t) <= 1 && plain(t));
}

/** The rows of written work (one per line of the page). */
function rowsOf(latex: string): string[] {
  return latex
    .replace(/\\begin\{gathered\}|\\end\{gathered\}/g, "")
    .split("\\\\")
    .map((r) => r.trim())
    .filter((r) => r !== "");
}

/** A row split at its top-level commas, semicolons and "or"s (∨) - never inside a group, so a decimal comma "{,}" stays. */
function splitStatements(row: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (c === "{" || c === "(" || c === "[") depth++;
    else if (c === "}" || c === ")" || c === "]") depth--;
    else if (depth === 0 && (c === "," || c === ";")) {
      parts.push(row.slice(start, i));
      start = i + 1;
    } else if (depth === 0 && (row.startsWith("\\lor", i) || row.startsWith("\\vee", i))) {
      parts.push(row.slice(start, i));
      start = i + 4;
    }
  }
  parts.push(row.slice(start));
  return parts.map((p) => p.trim()).filter((p) => p !== "");
}

/** "x = -1 ± 3" is two statements: with + and with −. */
function expandPlusMinus(statement: string): string[] {
  const at = statement.indexOf("\\pm");
  if (at < 0) return [statement];
  const [before, after] = [statement.slice(0, at), statement.slice(at + 3)];
  return [...expandPlusMinus(`${before}+${after}`), ...expandPlusMinus(`${before}-${after}`)];
}

/**
 * Every statement in the work, each with the row it's written on: rows split
 * into their statements, ± expanded. A statement that doesn't read as maths
 * is null (it counts neither way).
 */
function solutionStatements(latex: string): { line: Line | null; row: number }[] {
  return rowsOf(latex).flatMap((row, i) =>
    splitStatements(row)
      .flatMap(expandPlusMinus)
      .map((st) => ({ line: parseLines(st)[0] ?? null, row: i }))
  );
}

/** Points an expression in one variable is compared at - avoiding 0, 1 and whole numbers where different forms tend to agree by accident. */
const SAMPLES = [-2.37, -0.61, 0.43, 1.79, 3.14];

function hasOperation(e: Expr): boolean {
  return e.kind !== "num" && e.kind !== "var" && !(e.kind === "neg" && e.arg.kind === "num");
}

function constant(e: Expr): number | null {
  if (freeVariables(e).size > 0) return null;
  const v = evaluate(e);
  return Number.isFinite(v) ? v : null;
}

/** Every relation in the line holds with these values (only "=" and "≈" are checked - an inequality is a statement, not a step). */
function lineHolds(line: Line, vars: Record<string, number>, rounded = false): boolean {
  return line.relations.every((rel, k) => {
    if (rel !== "=" && rel !== "≈") return true;
    const a = line.sides[k];
    const b = line.sides[k + 1];
    if (a.kind === "call" || b.kind === "call") return true; // "f'(x) = …" names what follows
    const [x, y] = [evaluate(a, vars), evaluate(b, vars)];
    if (!rounded) return nearlyEqual(x, y, rel === "≈");
    // A calculation and its rounded result, either way round: the result has to be the calculation rounded right.
    const [db, da] = [writtenDecimals(b), writtenDecimals(a)];
    if (db !== null) return roundsTo(x, y, db, hasPi(a));
    if (da !== null) return roundsTo(y, x, da, hasPi(b));
    // Two calculations, one with numbers rounded along the way (9 − π · 9/4 ≈ 9 − 7,1): as far apart as those roundings allow, no more.
    const pi = hasPi(a) || hasPi(b) ? PI_AS_314 * 1.05 * Math.abs(x) : 0;
    return Math.abs(x - y) <= roundingSlack(a, vars) + roundingSlack(b, vars) + pi + 1e-9;
  });
}

/** How much an expression's value can be off for its decimal numbers having been rounded: each one moved by half its last decimal (7,1 by 0,05), the effects added up. */
function roundingSlack(e: Expr, vars: Record<string, number>): number {
  const base = evaluate(e, vars);
  let slack = 0;
  const visit = (node: Expr, replace: (n: Expr) => Expr) => {
    if (node.kind === "num") {
      const d = writtenDecimals(node);
      if (d !== null && d > 0) slack += Math.abs(evaluate(replace({ kind: "num", value: node.value + 0.5 * 10 ** -d }), vars) - base);
      return;
    }
    if (node.kind === "bin") {
      visit(node.left, (n) => replace({ ...node, left: n }));
      visit(node.right, (n) => replace({ ...node, right: n }));
    } else if (node.kind === "neg" || node.kind === "fn" || node.kind === "deg" || node.kind === "call" || node.kind === "root") {
      visit(node.arg, (n) => replace({ ...node, arg: n } as Expr));
    }
  };
  visit(e, (n) => n);
  return Number.isFinite(slack) ? slack : 0;
}

/** How many decimals a plain written number has (78,5 → 1, 24 → 0) - or null for anything else, π included. */
function writtenDecimals(e: Expr): number | null {
  if (e.kind === "neg") return writtenDecimals(e.arg);
  if (e.kind !== "num" || e.value === Math.PI || !Number.isFinite(e.value)) return null;
  const s = String(e.value);
  return s.includes(".") ? s.split(".")[1].length : 0;
}

/** π somewhere in an expression. */
function hasPi(e: Expr): boolean {
  switch (e.kind) {
    case "num":
      return e.value === Math.PI;
    case "bin":
      return hasPi(e.left) || hasPi(e.right);
    case "neg":
    case "fn":
    case "deg":
    case "call":
      return hasPi(e.arg);
    case "root":
      return hasPi(e.arg);
    default:
      return false;
  }
}

/** How far 3,14 is from π, relatively - a calculation done with it is that much off, and still counts as worked out. */
const PI_AS_314 = (Math.PI - 3.14) / Math.PI;

/**
 * `written` is `value` worked out and rounded to `decimals`: within half
 * its last decimal (78,5 or 78,54 for 78,539…; not 78,4), with room for π
 * taken as 3,14 where π is in the calculation.
 */
export function roundsTo(value: number, written: number, decimals: number, piUsed: boolean): boolean {
  const slack = 0.5 * 10 ** -decimals + (piUsed ? PI_AS_314 * 1.05 * Math.abs(value) : 0) + 1e-9;
  return Math.abs(value - written) <= slack;
}

/**
 * Equal as a rounded answer is: within rounding of each other - relatively
 * (π ≈ 3,14), or by the tenth or so that rounding to one decimal along the
 * way can add up to (9 − 7,1 ≈ 1,9, when it's really 1,93).
 */
function roundedEqual(a: number, b: number): boolean {
  return nearlyEqual(a, b, true) || Math.abs(a - b) <= 0.11;
}

/**
 * The work with a unit written after a number taken off ("24 cm", "78,5 cm^{2}",
 * "12 m²") - it names what the number is, it isn't part of it. Only for
 * questions that have a unit: elsewhere an "m" can be a variable (y = kx + m).
 */
export function withoutUnits(latex: string): string {
  // Longest first: "km/h" before "km", "mm" before "m", "min" before "m".
  const unit = String.raw`(?:\\frac\{\s*k\s*m\s*\}\{\s*h\s*\}|k\s*m\s*/\s*h|m\s*/\s*s|m\s*i\s*n|m\s*m|c\s*m|d\s*m|k\s*m|k\s*g|h\s*g|m\s*l|c\s*l|d\s*l|m|g|l|h|s)`;
  const pattern = new RegExp(String.raw`(\d|\})\s*(?:\\,|\\ )?\s*(?:\\text\{\s*)?${unit}\s*\}?\s*(?:\^\s*\{?\s*[23]\s*\}?|[²³])?(?=\s*(?:\\\\|\\end|$|\s*[=≈]|\\approx))`, "g");
  return latex.replace(pattern, "$1");
}

/**
 * Solutions the lines state: "x = 5", "x_1 = 2", "x_{2} = -5", or a chain
 * ending in the value ("x = \lg 100 = 2"). The same value stated twice
 * ("x = 6/2", then "x = 3") is one solution.
 */
function statedSolutions(lines: Line[], variable: string): number[] {
  const out: number[] = [];
  for (const line of lines) {
    if (line.sides.length < 2 || line.relations.some((r) => r !== "=" && r !== "≈")) continue;
    const lhs = line.sides[0];
    const named = lhs.kind === "var" && (lhs.name === variable || lhs.name.startsWith(`${variable}_`));
    const value = named ? constant(line.sides[line.sides.length - 1]) : null;
    if (value !== null && !out.some((v) => nearlyEqual(v, value, true))) out.push(value);
  }
  return out;
}

function sameSet(found: number[], expected: number[]): boolean {
  if (found.length !== expected.length) return false;
  const left = [...found];
  return expected.every((v) => {
    const i = left.findIndex((f) => nearlyEqual(f, v, true));
    if (i < 0) return false;
    left.splice(i, 1);
    return true;
  });
}

function equivalent(a: Expr, b: Expr, variable: string): boolean {
  return SAMPLES.every((x) => nearlyEqual(evaluate(a, { [variable]: x }), evaluate(b, { [variable]: x })));
}

/** An equation's solutions: all of them stated (in any notation), each other line a true step. */
function checkSolutions(latex: string, answer: Extract<Answer, { kind: "solutions" }>): WorkVerdict {
  const badLines: number[] = [];
  // Several solutions can share a line ("x₁ = 2, x₂ = 3") or hide in a ± - each is its own statement here.
  const statements = solutionStatements(latex);
  const stated = statements.filter((st) => st.line !== null) as { line: Line; row: number }[];
  const found = statedSolutions(
    stated.map((st) => st.line),
    answer.variable
  );
  const correct = sameSet(found, answer.values);
  // Every solution written is right, just not all of them yet.
  const allRight = found.length > 0 && found.every((v) => answer.values.some((a) => nearlyEqual(a, v, true)));
  const missing = allRight ? answer.values.length - found.length : 0;
  // Every other line is a step of the equation: each solution still makes it true.
  let steps = 0;
  for (const { line, row } of stated) {
    if (line.relations.length === 0) continue;
    if (statedSolutions([line], answer.variable).length > 0) continue; // the answer itself
    // A note about other letters ("p = 3, q = -10" before the pq formula) is neither a step nor wrong.
    const letters = new Set(line.sides.flatMap((side) => [...freeVariables(side)]));
    if ([...letters].some((v) => v !== answer.variable && !v.startsWith(`${answer.variable}_`))) continue;
    // A step holds for the solutions - or, once the equation splits (x(x + 3) = 0 → x + 3 = 0), for at least one of them.
    const holdsForSome = answer.values.some((x) => lineHolds(line, { [answer.variable]: x }));
    if (!holdsForSome) {
      if (!badLines.includes(row)) badLines.push(row);
    } else steps++;
  }
  return { correct, fullSetup: correct && steps > 0 && badLines.length === 0, badLines, ...(missing > 0 ? { missing } : {}) };
}

/** A fraction in its lowest terms (2/3, −5/4) or a whole number - not 4/6, 6/3 or 0,666…. */
export function isSimplestFraction(e: Expr): boolean {
  const inner = e.kind === "neg" ? e.arg : e;
  const whole = (x: Expr) => x.kind === "num" && Number.isInteger(x.value);
  if (whole(inner)) return true;
  if (inner.kind !== "bin" || inner.op !== "/" || !whole(inner.left) || !whole(inner.right)) return false;
  const [n, d] = [Math.abs((inner.left as { value: number }).value), Math.abs((inner.right as { value: number }).value)];
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  return d > 1 && gcd(n, d) === 1;
}

/** The value a statement gives a variable: "x = 2" → 2 (null if it isn't one). */
function statedValue(line: Line, variable: string): number | null {
  if (line.sides.length < 2 || line.relations.some((r) => r !== "=")) return null;
  const lhs = line.sides[0];
  if (lhs.kind !== "var" || lhs.name !== variable) return null;
  return constant(line.sides[line.sides.length - 1]);
}

/**
 * An equation system: every variable's value stated ("x = 2", "y = 5" - on one
 * line or several), each one right; every other line a step that still holds
 * with the solution put in.
 */
function checkSystem(latex: string, answer: Extract<Answer, { kind: "system" }>): WorkVerdict {
  const statements = solutionStatements(latex);
  const stated = statements.filter((st) => st.line !== null) as { line: Line; row: number }[];
  const values = Object.fromEntries(answer.variables.map((v, i) => [v, answer.values[i]]));
  const found = new Map<string, number>();
  const badLines: number[] = [];
  let steps = 0;
  for (const { line, row } of stated) {
    if (line.relations.length === 0) continue;
    const named = answer.variables.find((v) => statedValue(line, v) !== null);
    if (named !== undefined) {
      const value = statedValue(line, named)!;
      found.set(named, value);
      if (!nearlyEqual(value, values[named], true) && !badLines.includes(row)) badLines.push(row);
      continue;
    }
    const letters = [...new Set(line.sides.flatMap((side) => [...freeVariables(side)]))];
    if (letters.some((v) => !answer.variables.includes(v))) continue;
    if (lineHolds(line, values)) steps++;
    else if (!badLines.includes(row)) badLines.push(row);
  }
  const correct = answer.variables.every((v) => found.has(v) && nearlyEqual(found.get(v)!, values[v], true));
  return { correct, fullSetup: correct && steps > 0 && badLines.length === 0, badLines };
}

export function checkWrittenAnswer(latex: string, answer: Answer): WorkVerdict {
  // Solutions are read statement by statement - a line can hold several ("x₁ = 2, x₂ = 3") that don't parse as one.
  if (answer.kind === "solutions") return checkSolutions(latex, answer);
  if (answer.kind === "system") return checkSystem(latex, answer);
  const parsed = parseLines(latex);
  const lines = parsed.filter((l): l is Line => l !== null);
  if (lines.length === 0) return { correct: false, fullSetup: false, badLines: [] };
  const badLines: number[] = [];
  const last = lines[lines.length - 1];
  const finalSide = last.sides[last.sides.length - 1];

  if (answer.kind === "value") {
    const v = constant(finalSide);
    const rough = last.relations[last.relations.length - 1] === "≈";
    // A rounded answer has at least one decimal's worth of work in it: 141 isn't π · 45 worked out (141,4 is).
    const decimals = Math.max(1, writtenDecimals(finalSide) ?? 1);
    const equal =
      v !== null &&
      (answer.approx
        ? roundsTo(answer.exact ?? answer.value, v, decimals, true) || (answer.piAs314 !== undefined && roundsTo(answer.piAs314, v, decimals, false))
        : nearlyEqual(v, answer.value, rough));
    // A fraction answer is right in its lowest terms: 4/6 is the value, not yet the answer.
    const simplest = !answer.fraction || isSimplestFraction(finalSide);
    const correct = equal && simplest;
    let steps = 0;
    parsed.forEach((line, i) => {
      if (!line) return;
      // A line with letters in it can't be checked as a calculation - it doesn't count either way.
      if (line.sides.some((s) => freeVariables(s).size > 0)) return;
      if (!lineHolds(line, {}, answer.approx)) badLines.push(i);
      if (line.sides.some(hasOperation)) steps++;
    });
    // A wrong answer: which numbers didn't come from the question (or from an earlier step)?
    const unknown = !equal && answer.givens ? unknownNumbersIn(parsed, answer.givens, !!answer.approx) : [];
    return {
      correct,
      fullSetup: correct && steps > 0 && badLines.length === 0,
      badLines,
      ...(unknown.length > 0 ? { unknownNumbers: unknown } : {}),
      ...(equal && !simplest ? { wrongForm: "simplest" as const } : {}),
    };
  }


  // An expression: every side written (but "f'(x)") must be the same expression.
  const equal = finalSide.kind !== "call" && equivalent(finalSide, answer.expected, answer.variable);
  // Utveckla / faktorisera: the right expression, but still written the way it started, isn't done yet.
  const inForm = !answer.form || (answer.form === "expanded" ? isExpanded(finalSide) : isFactored(finalSide));
  const correct = equal && inForm;
  let forms = 0;
  parsed.forEach((line, i) => {
    if (!line) return;
    const sides = line.sides.filter((s) => s.kind !== "call");
    if (sides.some((s) => !equivalent(s, answer.expected, answer.variable))) badLines.push(i);
    forms += sides.length;
  });
  return { correct, fullSetup: correct && forms >= 2 && badLines.length === 0, badLines, ...(equal && !inForm ? { wrongForm: answer.form } : {}) };
}

/** The numbers written, in order - for work that's a list (sorting the values to find a median). */
export function numbersIn(latex: string): number[] {
  const out: number[] = [];
  for (const m of latex.replace(/\{,\}/g, "#").matchAll(/(\d(?:\s*\d)*(?:\s*#\s*\d(?:\s*\d)*)?)/g)) {
    out.push(Number(m[1].replace(/\s+/g, "").replace("#", ".")));
  }
  return out;
}
