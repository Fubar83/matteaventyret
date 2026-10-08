/**
 * Reads the LaTeX that layout.ts writes (from handwriting) back as maths, so
 * written work can be checked: "1 2 + 7 = 1 9", "3 {,} 5 \cdot 2",
 * "\frac{6}{2} = x", "2 ( x + 3 ) = 1 0", "\sin 3 0^{\circ}", "\int_{0}^{2} 3 x^{2} d x".
 *
 * Swedish school conventions: a decimal comma ("{,}", or a point between
 * digits), thousands spaced ("\,"), "·" or "×" or nothing for times, ":" for
 * ratio (a division), trigonometry in degrees unless π is involved, lg is log
 * base 10, e is Euler's number unless given a value. Crossed-out writing
 * (\cancel) is a correction and isn't read.
 *
 * Pure - no DOM, no recognizer - so every rule here is testable on its own.
 */

export type Relation = "=" | "<" | ">" | "≤" | "≥" | "≠" | "≈";

export type Expr =
  | { kind: "num"; value: number }
  | { kind: "var"; name: string }
  | { kind: "neg"; arg: Expr }
  | { kind: "bin"; op: "+" | "-" | "*" | "/" | "^"; left: Expr; right: Expr }
  | { kind: "fn"; name: "sin" | "cos" | "tan" | "sqrt" | "lg" | "ln" | "log" | "abs"; arg: Expr; base?: Expr }
  | { kind: "root"; index: Expr; arg: Expr }
  | { kind: "deg"; arg: Expr }
  | { kind: "int"; from: Expr; to: Expr; body: Expr; variable: string }
  | { kind: "call"; name: string; arg: Expr };

/** One written line: expressions joined by relations ("a = b", "0 < x ≤ 5", or just "a"). */
export interface Line {
  sides: Expr[];
  relations: Relation[];
}

type Tok =
  | { t: "num"; v: string }
  | { t: "dec" }
  | { t: "thin" }
  | { t: "cmd"; v: string }
  | { t: "sym"; v: string }
  | { t: "letter"; v: string }
  | { t: "nl" };

const RELATION_OF: Record<string, Relation> = { "=": "=", "<": "<", ">": ">", le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", neq: "≠", approx: "≈" };

function tokenize(latex: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const src = latex
    .replace(/\\begin\{(gathered|aligned)\}|\\end\{(gathered|aligned)\}/g, " ")
    .replace(/\\phantom\{[^}]*\}/g, " ")
    .replace(/\\left|\\right/g, "");
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
    } else if (src.startsWith("{,}", i)) {
      out.push({ t: "dec" });
      i += 3;
    } else if (src.startsWith("\\\\", i)) {
      out.push({ t: "nl" });
      i += 2;
    } else if (src.startsWith("\\,", i) || src.startsWith("\\;", i) || src.startsWith("\\!", i)) {
      out.push({ t: "thin" });
      i += 2;
    } else if (src.startsWith("\\%", i)) {
      out.push({ t: "sym", v: "%" });
      i += 2;
    } else if (src.startsWith("\\cancel{", i)) {
      // A correction: skip the crossed-out part entirely.
      let depth = 0;
      i += "\\cancel".length;
      do {
        if (src[i] === "{") depth++;
        else if (src[i] === "}") depth--;
        i++;
      } while (depth > 0 && i < src.length);
    } else if (c === "\\") {
      const m = /^\\([a-zA-Z]+)/.exec(src.slice(i));
      if (!m) {
        i++;
        continue;
      }
      out.push({ t: "cmd", v: m[1] });
      i += m[0].length;
    } else if (/[0-9]/.test(c)) {
      out.push({ t: "num", v: c });
      i++;
    } else if (/[a-zA-Zα-ωΔπ]/.test(c)) {
      out.push({ t: "letter", v: c });
      i++;
    } else {
      out.push({ t: "sym", v: c });
      i++;
    }
  }
  return out;
}

class ParseError extends Error {}

class Parser {
  private i = 0;
  private readonly toks: Tok[];
  constructor(toks: Tok[]) {
    this.toks = toks;
  }

  private peek(offset = 0): Tok | undefined {
    return this.toks[this.i + offset];
  }
  private next(): Tok {
    const tok = this.toks[this.i++];
    if (!tok) throw new ParseError("unexpected end");
    return tok;
  }
  private isSym(v: string, offset = 0): boolean {
    const tok = this.peek(offset);
    return tok?.t === "sym" && tok.v === v;
  }
  private isCmd(v: string, offset = 0): boolean {
    const tok = this.peek(offset);
    return tok?.t === "cmd" && tok.v === v;
  }
  private expectSym(v: string) {
    if (!this.isSym(v)) throw new ParseError(`expected ${v}`);
    this.i++;
  }
  atEnd(): boolean {
    return this.i >= this.toks.length;
  }

  lines(): Line[] {
    const lines: Line[] = [];
    while (!this.atEnd()) {
      if (this.peek()?.t === "nl") {
        this.i++;
        continue;
      }
      lines.push(this.line());
    }
    return lines;
  }

  private relation(): Relation | null {
    const tok = this.peek();
    if (tok?.t === "sym" && (tok.v === "=" || tok.v === "<" || tok.v === ">")) {
      this.i++;
      return RELATION_OF[tok.v];
    }
    if (tok?.t === "cmd" && RELATION_OF[tok.v]) {
      this.i++;
      return RELATION_OF[tok.v];
    }
    return null;
  }

  private line(): Line {
    const sides = [this.expr()];
    const relations: Relation[] = [];
    for (let rel = this.relation(); rel; rel = this.relation()) {
      relations.push(rel);
      sides.push(this.expr());
    }
    if (!this.atEnd() && this.peek()?.t !== "nl") throw new ParseError("unexpected token");
    return { sides, relations };
  }

  expr(stopAtDifferential = false): Expr {
    let left = this.term(stopAtDifferential);
    for (;;) {
      if (this.isSym("+")) {
        this.i++;
        left = { kind: "bin", op: "+", left, right: this.term(stopAtDifferential) };
      } else if (this.isSym("-")) {
        this.i++;
        left = { kind: "bin", op: "-", left, right: this.term(stopAtDifferential) };
      } else if (this.isCmd("pm")) {
        throw new ParseError("± has two values");
      } else return left;
    }
  }

  /** "d x" closing an integral. */
  private atDifferential(): boolean {
    const a = this.peek();
    const b = this.peek(1);
    return a?.t === "letter" && a.v === "d" && b?.t === "letter";
  }

  private startsFactor(): boolean {
    const tok = this.peek();
    if (!tok) return false;
    if (tok.t === "num" || tok.t === "letter") return true;
    if (tok.t === "sym") return tok.v === "(" || tok.v === "[" || tok.v === "|";
    if (tok.t === "cmd") return ["frac", "sqrt", "pi", "sin", "cos", "tan", "lg", "ln", "log", "int", "infty"].includes(tok.v);
    return false;
  }

  private term(stopAtDifferential: boolean): Expr {
    let left = this.unary(stopAtDifferential);
    for (;;) {
      if (stopAtDifferential && this.atDifferential()) return left;
      if (this.isCmd("cdot") || this.isCmd("times")) {
        this.i++;
        left = { kind: "bin", op: "*", left, right: this.unary(stopAtDifferential) };
      } else if (this.isSym("/") || this.isSym(":") || this.isCmd("div")) {
        this.i++;
        left = { kind: "bin", op: "/", left, right: this.unary(stopAtDifferential) };
      } else if (this.startsFactor() && !(this.isSym("|") && this.closesAbs())) {
        // Implicit multiplication: 2x, 3(x + 1), 2π, x y.
        left = { kind: "bin", op: "*", left, right: this.power(stopAtDifferential) };
      } else return left;
    }
  }

  /** Inside |...|, a "|" closes it rather than starting a new absolute value. */
  private absDepth = 0;
  private closesAbs(): boolean {
    return this.absDepth > 0;
  }

  private unary(stopAtDifferential: boolean): Expr {
    if (this.isSym("-")) {
      this.i++;
      return { kind: "neg", arg: this.unary(stopAtDifferential) };
    }
    if (this.isSym("+")) {
      this.i++;
      return this.unary(stopAtDifferential);
    }
    return this.power(stopAtDifferential);
  }

  private power(stopAtDifferential: boolean): Expr {
    let base = this.postfix(this.primary(stopAtDifferential));
    while (this.isSym("^")) {
      this.i++;
      const exp = this.group();
      base = exp.kind === "var" && exp.name === "°" ? { kind: "deg", arg: base } : { kind: "bin", op: "^", left: base, right: exp };
      base = this.postfix(base);
    }
    return base;
  }

  private postfix(e: Expr): Expr {
    if (this.isSym("%")) {
      this.i++;
      return { kind: "bin", op: "/", left: e, right: { kind: "num", value: 100 } };
    }
    return e;
  }

  /** A braced group, or a single primary ("x^2" as well as "x^{2}"). */
  private group(): Expr {
    if (this.isSym("{")) {
      this.i++;
      if (this.isSym("}")) throw new ParseError("empty group");
      if (this.isCmd("circ") && this.isSym("}", 1)) {
        this.i += 2;
        return { kind: "var", name: "°" };
      }
      const e = this.expr();
      this.expectSym("}");
      return e;
    }
    if (this.isCmd("circ")) {
      this.i++;
      return { kind: "var", name: "°" };
    }
    return this.primary(false);
  }

  private number(): Expr {
    let text = "";
    for (;;) {
      const tok = this.peek();
      if (tok?.t === "num") {
        text += tok.v;
        this.i++;
      } else if ((tok?.t === "dec" || (tok?.t === "sym" && (tok.v === "." || tok.v === ","))) && this.peek(1)?.t === "num" && text !== "" && !text.includes(".")) {
        // A decimal comma, or point, between digits. A comma with no digit right after separates.
        if (tok.t === "sym" && tok.v === ",") break;
        text += ".";
        this.i++;
      } else if (tok?.t === "thin" && this.peek(1)?.t === "num" && text !== "") {
        this.i++; // thousands: 12 500
      } else break;
    }
    return { kind: "num", value: Number(text) };
  }

  /** Applies a function to what follows it: "\sin x", "\sin(30°)", "\lg 1 0 0 0", "\sin 2 x" = sin(2x). */
  private argument(stopAtDifferential: boolean): Expr {
    if (this.isSym("(")) return this.postfix(this.power(stopAtDifferential));
    let arg = this.power(stopAtDifferential);
    while (this.startsFactor() && !this.isSym("(") && !(stopAtDifferential && this.atDifferential())) {
      arg = { kind: "bin", op: "*", left: arg, right: this.power(stopAtDifferential) };
    }
    return arg;
  }

  private primary(stopAtDifferential: boolean): Expr {
    const tok = this.peek();
    if (!tok) throw new ParseError("unexpected end");
    if (tok.t === "num") return this.number();
    if (tok.t === "dec") throw new ParseError("stray comma");
    if (tok.t === "sym") {
      if (tok.v === "(" || tok.v === "[") {
        this.i++;
        const e = this.expr();
        this.expectSym(tok.v === "(" ? ")" : "]");
        return e;
      }
      if (tok.v === "|") {
        this.i++;
        this.absDepth++;
        const e = this.expr();
        this.absDepth--;
        this.expectSym("|");
        return { kind: "fn", name: "abs", arg: e };
      }
      if (tok.v === "{") {
        // "{}^{\circ}" (a degree sign on its own) or "{}^{2}8" (a kort division note): nothing to read.
        if (this.isSym("}", 1)) {
          this.i += 2;
          if (this.isSym("^")) {
            this.i++;
            this.group();
          }
          return this.primary(stopAtDifferential);
        }
        return this.group();
      }
      throw new ParseError(`unexpected ${tok.v}`);
    }
    if (tok.t === "letter") {
      this.i++;
      let name = tok.v;
      if (this.isSym("_")) {
        this.i++;
        const sub = this.next();
        if (sub.t === "sym" && sub.v === "{") {
          let text = "";
          while (!this.isSym("}")) {
            const s = this.next();
            text += "v" in s ? s.v : "";
          }
          this.i++;
          name += `_${text}`;
        } else name += `_${"v" in sub ? sub.v : ""}`;
      }
      while (this.isSym("'")) {
        this.i++;
        name += "'";
      }
      if (name === "π") return { kind: "num", value: Math.PI };
      // f(x), g(x), f'(x): a function applied, not f times x.
      if (/^[fgh]'*$/.test(name) && this.isSym("(")) {
        this.i++;
        const arg = this.expr();
        this.expectSym(")");
        return { kind: "call", name, arg };
      }
      return { kind: "var", name };
    }
    if (tok.t === "cmd") {
      this.i++;
      switch (tok.v) {
        case "pi":
          return { kind: "num", value: Math.PI };
        case "infty":
          return { kind: "num", value: Infinity };
        case "frac": {
          const num = this.group();
          const den = this.group();
          return { kind: "bin", op: "/", left: num, right: den };
        }
        case "sqrt": {
          if (this.isSym("[")) {
            this.i++;
            const index = this.expr();
            this.expectSym("]");
            return { kind: "root", index, arg: this.group() };
          }
          return { kind: "fn", name: "sqrt", arg: this.group() };
        }
        case "sin":
        case "cos":
        case "tan":
        case "lg":
        case "ln":
          return { kind: "fn", name: tok.v, arg: this.argument(stopAtDifferential) };
        case "log": {
          let base: Expr | undefined;
          if (this.isSym("_")) {
            this.i++;
            base = this.group();
          }
          return { kind: "fn", name: "log", arg: this.argument(stopAtDifferential), base };
        }
        case "int": {
          let from: Expr | null = null;
          let to: Expr | null = null;
          for (let k = 0; k < 2; k++) {
            if (this.isSym("_")) {
              this.i++;
              from = this.group();
            } else if (this.isSym("^")) {
              this.i++;
              to = this.group();
            }
          }
          if (!from || !to) throw new ParseError("an integral needs both bounds");
          const body = this.expr(true);
          if (!this.atDifferential()) throw new ParseError("an integral ends with d and its variable");
          this.i++;
          const v = this.next();
          return { kind: "int", from, to, body, variable: "v" in v ? v.v : "x" };
        }
        default:
          throw new ParseError(`unknown \\${tok.v}`);
      }
    }
    throw new ParseError("unexpected token");
  }
}

/**
 * Each written line on its own - null for a line that doesn't read as maths,
 * so one half-finished line doesn't hide the others. A line starting with its
 * relation ("= 3 6", continuing the line above) reads as if that side was
 * the line above's last one.
 */
export function parseLines(latex: string): (Line | null)[] {
  const all = tokenize(latex);
  const groups: Tok[][] = [[]];
  for (const tok of all) {
    if (tok.t === "nl") groups.push([]);
    else groups[groups.length - 1].push(tok);
  }
  const out: (Line | null)[] = [];
  for (const toks of groups.filter((g) => g.length > 0)) {
    const continues = toks[0].t === "sym" && toks[0].v === "=";
    try {
      const parsed = new Parser(continues ? toks.slice(1) : toks).lines();
      const line = parsed.length === 1 ? parsed[0] : null;
      const previous = out[out.length - 1];
      if (line && continues && previous) {
        out.push({ sides: [previous.sides[previous.sides.length - 1], ...line.sides], relations: ["=", ...line.relations] });
      } else out.push(line);
    } catch (err) {
      if (!(err instanceof ParseError)) throw err;
      out.push(null);
    }
  }
  return out;
}

/** The written lines, or null if they don't read as maths (a column sum, half-written work). */
export function parseLatex(latex: string): Line[] | null {
  try {
    const lines = new Parser(tokenize(latex)).lines();
    return lines.length > 0 ? lines : null;
  } catch (err) {
    if (err instanceof ParseError) return null;
    throw err;
  }
}

/** One expression (no relation), or null. */
export function parseExpression(latex: string): Expr | null {
  const lines = parseLatex(latex);
  return lines && lines.length === 1 && lines[0].sides.length === 1 ? lines[0].sides[0] : null;
}

const DEG = Math.PI / 180;

function usesPi(e: Expr): boolean {
  switch (e.kind) {
    case "num":
      return e.value === Math.PI;
    case "var":
      return false;
    case "neg":
    case "deg":
      return usesPi(e.arg);
    case "bin":
      return usesPi(e.left) || usesPi(e.right);
    case "fn":
    case "call":
      return usesPi(e.arg);
    case "root":
      return usesPi(e.arg) || usesPi(e.index);
    case "int":
      return usesPi(e.body);
  }
}

/** Trigonometry reads its argument in degrees (as school does), unless it's in terms of π. */
function angle(arg: Expr, vars: Readonly<Record<string, number>>): number {
  if (arg.kind === "deg") return evaluate(arg.arg, vars) * DEG;
  const v = evaluate(arg, vars);
  return usesPi(arg) ? v : v * DEG;
}

/** The value with `vars` bound; NaN where it isn't a number (an unbound letter, f(x) unknown). "e" is Euler's number unless bound. */
export function evaluate(e: Expr, vars: Readonly<Record<string, number>> = {}): number {
  switch (e.kind) {
    case "num":
      return e.value;
    case "var":
      if (e.name in vars) return vars[e.name];
      return e.name === "e" ? Math.E : NaN;
    case "neg":
      return -evaluate(e.arg, vars);
    case "deg":
      return evaluate(e.arg, vars);
    case "bin": {
      const a = evaluate(e.left, vars);
      const b = evaluate(e.right, vars);
      switch (e.op) {
        case "+":
          return a + b;
        case "-":
          return a - b;
        case "*":
          return a * b;
        case "/":
          return a / b;
        case "^":
          return a ** b;
      }
      break;
    }
    case "fn":
      switch (e.name) {
        case "sin":
          return Math.sin(angle(e.arg, vars));
        case "cos":
          return Math.cos(angle(e.arg, vars));
        case "tan":
          return Math.tan(angle(e.arg, vars));
        case "sqrt":
          return Math.sqrt(evaluate(e.arg, vars));
        case "lg":
          return Math.log10(evaluate(e.arg, vars));
        case "ln":
          return Math.log(evaluate(e.arg, vars));
        case "log":
          return e.base ? Math.log(evaluate(e.arg, vars)) / Math.log(evaluate(e.base, vars)) : Math.log10(evaluate(e.arg, vars));
        case "abs":
          return Math.abs(evaluate(e.arg, vars));
      }
      break;
    case "root": {
      const n = evaluate(e.index, vars);
      const x = evaluate(e.arg, vars);
      return x < 0 && n % 2 === 1 ? -((-x) ** (1 / n)) : x ** (1 / n);
    }
    case "int": {
      // Simpson's rule - plenty for school integrals of polynomials and friends.
      const a = evaluate(e.from, vars);
      const b = evaluate(e.to, vars);
      const n = 200;
      const h = (b - a) / n;
      let sum = 0;
      for (let k = 0; k <= n; k++) {
        const w = k === 0 || k === n ? 1 : k % 2 === 1 ? 4 : 2;
        sum += w * evaluate(e.body, { ...vars, [e.variable]: a + k * h });
      }
      return (sum * h) / 3;
    }
    case "call":
      return NaN;
  }
  return NaN;
}

/** Every letter the expression depends on (not e unless... it's always Euler's number here, so not counted). */
export function freeVariables(e: Expr, out = new Set<string>()): Set<string> {
  switch (e.kind) {
    case "var":
      if (e.name !== "e" && e.name !== "°") out.add(e.name);
      break;
    case "neg":
    case "deg":
    case "fn":
    case "call":
      freeVariables(e.arg, out);
      if (e.kind === "fn" && e.base) freeVariables(e.base, out);
      break;
    case "bin":
      freeVariables(e.left, out);
      freeVariables(e.right, out);
      break;
    case "root":
      freeVariables(e.index, out);
      freeVariables(e.arg, out);
      break;
    case "int": {
      const inner = freeVariables(e.body);
      inner.delete(e.variable);
      for (const v of inner) out.add(v);
      freeVariables(e.from, out);
      freeVariables(e.to, out);
      break;
    }
  }
  return out;
}

/** Equal as numbers written by hand: exact enough, or within rounding when "≈" was written. */
export function nearlyEqual(a: number, b: number, rough = false): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= (rough ? 0.006 : 1e-9) * scale;
}
