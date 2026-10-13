/**
 * The rules of algebra, one family at a time, as single-choice questions -
 * each wrong option the slip that rule is known for:
 *
 *   åk 7-9    3.1.8  potenslagar: xᵃ · xᵇ = xᵃ⁺ᵇ (not xᵃᵇ), xᵃ / xᵇ = xᵃ⁻ᵇ, (xᵃ)ᵇ = xᵃᵇ,
 *                    (2x)³ = 8x³ (not 2x³), x⁰ = 1
 *             3.1.10 räkneregler för rötter: √a · √b = √(ab), √12 = 2√3, √(9/16) = 3/4,
 *                    (√7)² = 7, √(9 + 16) = 5 - not 3 + 4
 *             3.3.13 minus framför parentes: −(x − 5) = −x + 5, 7 − (x + 3) = 4 − x,
 *                    −3(x − 2) = −3x + 6, −3² = −9 but (−3)² = 9
 *             3.3.16 lösa ut ur formler: s = vt → t = s/v, A = bh/2 → h = 2A/b,
 *                    y = kx + m → x = (y − m)/k
 *   gymnasiet 3.3.15 förenkla bråkuttryck: (6x + 3)/3 = 2x + 1 (not 2x + 3),
 *                    (x² − 9)/(x − 3) = x + 3, x/2 + x/3 = 5x/6
 *             4.1.4  negativa och rationella exponenter: 2⁻³ = 1/8, 16^(1/2) = 4, 8^(2/3) = 4
 *             4.1.5  logaritmlagar: lg a + lg b = lg ab, lg a − lg b = lg(a/b),
 *                    lg aⁿ = n lg a, lg 1 = 0, 10^(lg 7) = 7
 */
import { pick, randInt, shuffle, type Rng } from "../../rng";
import { shuffledOptions, text, type ChoiceOption, type ChoiceProblem, type Slip } from "./problem";

export type AlgebraRuleStageId = "3.1.8" | "3.1.10" | "3.3.13" | "3.3.15" | "3.3.16" | "4.1.4" | "4.1.5";

// Fractions at full size on a button (\dfrac): inline they'd be too small to read.
const L = (latex: string): ChoiceOption => ({ latex: latex.replace(/\\frac/g, "\\dfrac") });
const slip = (latex: string, why: string, vars?: Record<string, string | number>): Slip => ({ option: L(latex), why: text(`choice.alg.why.${why}`, vars) });
const xp = (n: number) => (n === 1 ? "x" : `x^{${n}}`);

/** One question: what's shown, the right form, the slips - and the rule, for the tip and the explanation. */
function rule(stageId: AlgebraRuleStageId, rng: Rng, display: string, right: string, slips: Slip[], ruleKey: string, prompt = "choice.alg.simplify", vars?: Record<string, string | number>): ChoiceProblem {
  return {
    stageId,
    kind: "choice",
    prompt: text(prompt, vars),
    display,
    ...shuffledOptions(rng, L(right), slips),
    tip: text(`choice.alg.tip.${ruleKey}`),
    explanation: text(`choice.alg.explain.${ruleKey}`, vars),
  };
}

/** 3.1.8: the power laws with x - the product, the quotient, a power of a power, a product's power, x⁰. */
function powerLaws(rng: Rng): ChoiceProblem {
  const a = randInt(rng, 2, 6);
  const b = randInt(rng, 2, 5);
  const form = pick(rng, ["product", "quotient", "power", "productPower", "zero", "mixed"] as const);
  const R = (d: string, r: string, s: Slip[], k: string) => rule("3.1.8", rng, d, r, s, k);
  if (form === "product")
    return R(`${xp(a)} \\cdot ${xp(b)}`, xp(a + b), [slip(xp(a * b), "multiplied"), slip(`2${xp(a + b)}`, "twoX"), slip(xp(Math.abs(a - b) || 1), "subtracted")], "product");
  if (form === "quotient") {
    const top = a + b;
    return R(`\\frac{${xp(top)}}{${xp(b)}}`, xp(a), [slip(xp(top + b), "added"), ...(top % b === 0 ? [slip(xp(top / b), "divided")] : []), slip(`\\frac{1}{${xp(a)}}`, "upside"), slip(xp(top * b), "multiplied")], "quotient");
  }
  if (form === "power") return R(`(${xp(a)})^{${b}}`, xp(a * b), [slip(xp(a + b), "addedPower"), slip(`${b}${xp(a)}`, "timesB"), slip(xp(a ** b), "towered")], "power");
  if (form === "productPower") {
    const k = randInt(rng, 2, 3);
    const n = k === 2 ? randInt(rng, 2, 4) : 2;
    return R(`(${k}x)^{${n}}`, `${k ** n}${xp(n)}`, [slip(`${k}${xp(n)}`, "onlyX"), slip(`${k * n}${xp(n)}`, "timesN"), slip(`${k ** n}x`, "onlyNumber")], "productPower");
  }
  if (form === "zero") {
    const c = randInt(rng, 2, 9);
    return R(`${c}x^{0}`, String(c), [slip("0", "zeroIsZero"), slip("1", "zeroCoefficient"), slip(`${c}x`, "zeroIsX")], "zero");
  }
  const c = randInt(rng, 2, a + b - 1);
  return R(`\\frac{${xp(a)} \\cdot ${xp(b)}}{${xp(c)}}`, xp(a + b - c), [slip(xp(a * b - c), "multiplied"), slip(xp(a + b + c), "added"), ...((a * b) % c === 0 ? [slip(xp((a * b) / c), "divided")] : [slip(xp(a + b), "forgotBottom")])], "mixed");
}

/** Square numbers to build roots from: √(k²·m) = k√m, m without square factors. */
const SQUARE_FREE = [2, 3, 5, 6, 7];

/** 3.1.10: the rules for square roots - and the one that isn't a rule. */
function rootRules(rng: Rng): ChoiceProblem {
  const form = pick(rng, ["product", "simplify", "simplify", "fraction", "square", "sum", "quotient"] as const);
  const R = (d: string, r: string, s: Slip[], k: string) => rule("3.1.10", rng, d, r, s, k);
  if (form === "product") {
    // √a · √b with ab a square: √2 · √8 = √16 = 4.
    const m = pick(rng, SQUARE_FREE);
    const [p, q] = pick(rng, [[1, 4], [1, 9], [4, 9], [1, 16], [4, 4]] as const);
    const a = m * p;
    const b = m * q;
    const value = m * Math.sqrt(p * q);
    return R(`\\sqrt{${a}} \\cdot \\sqrt{${b}}`, String(value), [slip(`\\sqrt{${a + b}}`, "rootSum"), slip(String(a * b), "noRoot"), slip(`${value}\\sqrt{${m}}`, "rootLeft")], "rootProduct");
  }
  if (form === "simplify") {
    const k = randInt(rng, 2, 5);
    const m = pick(rng, SQUARE_FREE.filter((x) => x * k * k <= 125));
    const n = k * k * m;
    return R(`\\sqrt{${n}}`, `${k}\\sqrt{${m}}`, [slip(`${k * k}\\sqrt{${m}}`, "squareOut", { k: k * k, r: k }), slip(`${m}\\sqrt{${k}}`, "wrongPart"), slip(`${k}\\sqrt{${m * k}}`, "notAll")], "rootSimplify");
  }
  if (form === "fraction") {
    const [p, q] = shuffle(rng, [2, 3, 4, 5, 6, 7]).slice(0, 2).sort((x, y) => x - y);
    return R(`\\sqrt{\\frac{${p * p}}{${q * q}}}`, `\\frac{${p}}{${q}}`, [slip(`\\frac{${p * p}}{${q}}`, "rootBottomOnly"), slip(`\\frac{${p}}{${q * q}}`, "rootTopOnly"), slip(`\\frac{${p * p}}{${q * q}}`, "noRoot")], "rootFraction");
  }
  if (form === "square") {
    const a = pick(rng, [2, 3, 5, 6, 7, 10, 11]);
    return R(`(\\sqrt{${a}})^{2}`, String(a), [slip(String(a * a), "squaredInside"), slip(String(2 * a), "timesTwo"), slip(`\\sqrt{${a}}`, "rootTwice")], "rootSquare");
  }
  if (form === "sum") {
    const [a, b, c] = pick(rng, [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17]] as const);
    return R(`\\sqrt{${a * a} + ${b * b}}`, String(c), [slip(String(a + b), "rootOfSum"), slip(`\\sqrt{${a + b}}`, "rootOfSum"), slip(String(a * a + b * b), "noRoot")], "rootSum");
  }
  const m = pick(rng, [2, 3, 5]);
  const k = randInt(rng, 2, 5);
  return R(`\\frac{\\sqrt{${m * k * k}}}{\\sqrt{${m}}}`, String(k), [slip(`\\sqrt{${k}}`, "quotientRoot"), slip(String(k * k), "noRoot"), slip(`${k}\\sqrt{${m}}`, "rootLeft")], "rootQuotient");
}

/** 3.3.13: a minus in front of a bracket changes every sign in it - and −3² isn't (−3)². */
function minusBracket(rng: Rng): ChoiceProblem {
  const form = pick(rng, ["minus", "numberMinus", "times", "xMinus", "square"] as const);
  const R = (d: string, r: string, s: Slip[], k: string, p?: string) => rule("3.3.13", rng, d, r, s, k, p);
  const a = randInt(rng, 2, 9);
  if (form === "minus") return R(`-(x - ${a})`, `-x + ${a}`, [slip(`-x - ${a}`, "onlyFirst"), slip(`x + ${a}`, "onlySecond"), slip(`x - ${a}`, "noChange")], "minus");
  if (form === "numberMinus") {
    const n = a + randInt(rng, 2, 9);
    return R(`${n} - (x + ${a})`, `${n - a} - x`, [slip(`${n + a} - x`, "onlyFirst"), slip(`${n - a} + x`, "onlySecond"), slip(`${n} - x + ${a}`, "onlyFirst")], "minus");
  }
  if (form === "times") {
    const k = randInt(rng, 2, 6);
    return R(`-${k}(x - ${a})`, `-${k}x + ${k * a}`, [slip(`-${k}x - ${k * a}`, "timesSign"), slip(`-${k}x - ${a}`, "timesOnlyFirst"), slip(`-${k}x + ${a}`, "timesOnlyFirst")], "times");
  }
  if (form === "xMinus") {
    const k = randInt(rng, 2, 5);
    return R(`x - (${k}x - ${a})`, `${a} - ${k - 1 === 1 ? "" : k - 1}x`, [slip(`${k + 1}x - ${a}`, "onlyFirstX"), slip(`-${k - 1 === 1 ? "" : k - 1}x - ${a}`, "onlyFirst"), slip(`${k - 1 === 1 ? "" : k - 1}x + ${a}`, "onlyFirst")], "minus");
  }
  const n = randInt(rng, 2, 9);
  return rng() < 0.5
    ? R(`-${n}^{2}`, `-${n * n}`, [slip(String(n * n), "squareSign"), slip(`-${2 * n}`, "squareTimesTwo"), slip(String(2 * n), "squareTimesTwo")], "squareMinus", "choice.alg.calculate")
    : R(`(-${n})^{2}`, String(n * n), [slip(`-${n * n}`, "squareBracket"), slip(`-${2 * n}`, "squareTimesTwo"), slip(String(2 * n), "squareTimesTwo")], "squareBracket", "choice.alg.calculate");
}

/** 3.3.15: algebraic fractions - divide every term, cancel only factors, a common denominator to add. */
function fractions(rng: Rng): ChoiceProblem {
  const form = pick(rng, ["divideTerms", "cancelConjugate", "cancelX", "add", "split"] as const);
  const R = (d: string, r: string, s: Slip[], k: string) => rule("3.3.15", rng, d, r, s, k);
  if (form === "divideTerms") {
    const k = randInt(rng, 2, 5);
    const a = randInt(rng, 2, 4);
    const b = randInt(rng, 1, 5);
    return R(`\\frac{${k * a}x + ${k * b}}{${k}}`, `${a}x + ${b === 1 ? 1 : b}`, [slip(`${a}x + ${k * b}`, "oneTerm"), slip(`${k * a}x + ${b}`, "oneTerm"), slip(`${a + b}x`, "addedTerms")], "divideTerms");
  }
  if (form === "cancelConjugate") {
    const a = randInt(rng, 2, 9);
    const sign = rng() < 0.5 ? "-" : "+";
    const other = sign === "-" ? "+" : "-";
    return R(`\\frac{x^{2} - ${a * a}}{x ${sign} ${a}}`, `x ${other} ${a}`, [slip(`x ${sign} ${a}`, "conjugateSign"), slip(`x - ${a * a}`, "cancelTerms"), slip(`x^{2} ${other} ${a}`, "cancelTerms")], "cancelConjugate");
  }
  if (form === "cancelX") {
    const b = randInt(rng, 2, 9);
    return R(`\\frac{x^{2} + ${b}x}{x}`, `x + ${b}`, [slip(`x^{2} + ${b}`, "oneTerm"), slip(`x + ${b}x`, "oneTerm"), slip(`${b + 1}x`, "addedTerms")], "cancelX");
  }
  if (form === "add") {
    const [p, q] = pick(rng, [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5]] as const);
    return R(`\\frac{x}{${p}} + \\frac{x}{${q}}`, `\\frac{${p + q}x}{${p * q}}`, [slip(`\\frac{2x}{${p + q}}`, "addedBottoms"), slip(`\\frac{x}{${p + q}}`, "addedBottoms"), slip(`\\frac{x^{2}}{${p * q}}`, "multipliedTops")], "add");
  }
  const a = randInt(rng, 2, 9);
  return R(`\\frac{x + ${a}}{${a}}`, `\\frac{x}{${a}} + 1`, [slip(`x + 1`, "oneTerm"), slip(`\\frac{x}{${a}} + ${a}`, "oneTerm"), slip("x", "cancelTerms")], "split");
}

/** The formulas to rearrange: shown, the variable asked, the right form and its slips. */
const FORMULAS: { shown: string; v: string; right: string; slips: [string, string][] }[] = [
  { shown: "s = v \\cdot t", v: "t", right: "t = \\frac{s}{v}", slips: [["t = \\frac{v}{s}", "upside"], ["t = s - v", "subtracted"], ["t = s \\cdot v", "multipliedBack"]] },
  { shown: "F = m \\cdot a", v: "a", right: "a = \\frac{F}{m}", slips: [["a = \\frac{m}{F}", "upside"], ["a = F - m", "subtracted"], ["a = F \\cdot m", "multipliedBack"]] },
  { shown: "A = \\frac{b \\cdot h}{2}", v: "h", right: "h = \\frac{2A}{b}", slips: [["h = \\frac{A}{2b}", "halfWrong"], ["h = \\frac{Ab}{2}", "multipliedBack"], ["h = 2A - b", "subtracted"]] },
  { shown: "y = kx + m", v: "x", right: "x = \\frac{y - m}{k}", slips: [["x = \\frac{y}{k} - m", "order"], ["x = \\frac{y + m}{k}", "sign"], ["x = y - m - k", "subtracted"]] },
  { shown: "C = 2\\pi r", v: "r", right: "r = \\frac{C}{2\\pi}", slips: [["r = \\frac{2\\pi}{C}", "upside"], ["r = C - 2\\pi", "subtracted"], ["r = \\frac{C}{2} \\cdot \\pi", "halfWrong"]] },
  { shown: "P = 2a + 2b", v: "a", right: "a = \\frac{P - 2b}{2}", slips: [["a = P - 2b", "notDivided"], ["a = \\frac{P}{2} - 2b", "order"], ["a = \\frac{P + 2b}{2}", "sign"]] },
  { shown: "V = \\frac{\\pi r^{2} h}{3}", v: "h", right: "h = \\frac{3V}{\\pi r^{2}}", slips: [["h = \\frac{V}{3\\pi r^{2}}", "halfWrong"], ["h = 3V - \\pi r^{2}", "subtracted"], ["h = \\frac{\\pi r^{2}}{3V}", "upside"]] },
  { shown: "E = m c^{2}", v: "m", right: "m = \\frac{E}{c^{2}}", slips: [["m = E - c^{2}", "subtracted"], ["m = \\frac{c^{2}}{E}", "upside"], ["m = \\frac{E}{2c}", "halfWrong"]] },
  { shown: "v = \\frac{s}{t}", v: "s", right: "s = v \\cdot t", slips: [["s = \\frac{v}{t}", "notMultiplied"], ["s = \\frac{t}{v}", "upside"], ["s = v + t", "subtracted"]] },
];

/** 3.3.16: a variable out of a formula - do the same to both sides until it stands alone. */
function rearrange(rng: Rng): ChoiceProblem {
  const f = pick(rng, FORMULAS);
  return {
    stageId: "3.3.16",
    kind: "choice",
    prompt: text("choice.alg.rearrange", { v: f.v }),
    display: f.shown,
    ...shuffledOptions(
      rng,
      L(f.right),
      f.slips.map(([latex, why]) => slip(latex, `formula.${why}`))
    ),
    tip: text("choice.alg.tip.rearrange"),
    explanation: text("choice.alg.explain.rearrange", { v: f.v }),
  };
}

/** 4.1.4: negative and fractional exponents - a⁻ⁿ = 1/aⁿ, a^(1/n) is the n-th root. */
function exponents(rng: Rng): ChoiceProblem {
  const form = pick(rng, ["negative", "negativeX", "half", "third", "twoThirds", "fractionBase"] as const);
  const R = (d: string, r: string, s: Slip[], k: string) => rule("4.1.4", rng, d, r, s, k, "choice.alg.calculate");
  if (form === "negative") {
    const [b, n] = pick(rng, [[2, 3], [2, 4], [3, 2], [5, 2], [10, 2], [10, 3], [4, 2]] as const);
    return R(`${b}^{-${n}}`, `\\frac{1}{${b ** n}}`, [slip(`-${b ** n}`, "negativeIsMinus"), slip(`-${b * n}`, "negativeTimes"), slip(`\\frac{1}{${b * n}}`, "negativeTimes")], "negative");
  }
  if (form === "negativeX") {
    const n = randInt(rng, 2, 4);
    return { ...R(`x^{-${n}}`, `\\frac{1}{x^{${n}}}`, [slip(`-x^{${n}}`, "negativeIsMinus"), slip(`-${n}x`, "negativeTimes"), slip(`\\frac{1}{${n}x}`, "negativeTimes")], "negative"), prompt: text("choice.alg.writeWithout") };
  }
  if (form === "half") {
    const r = randInt(rng, 3, 12);
    return R(`${r * r}^{\\frac{1}{2}}`, String(r), [slip(`\\frac{${r * r}}{2}`, "halfIsHalf"), slip(`\\frac{1}{${r * r}}`, "fractionIsOneOver"), slip(String(r * r * 2), "halfIsHalf")], "half");
  }
  if (form === "third") {
    const r = randInt(rng, 2, 5);
    return R(`${r ** 3}^{\\frac{1}{3}}`, String(r), [slip(`\\frac{${r ** 3}}{3}`, "halfIsHalf"), slip(String(r * r), "thirdIsSquare"), slip(`\\frac{1}{${r ** 3}}`, "fractionIsOneOver")], "third");
  }
  if (form === "twoThirds") {
    const r = randInt(rng, 2, 4);
    return R(`${r ** 3}^{\\frac{2}{3}}`, String(r * r), [slip(String(r), "forgotSquare"), slip(String(r ** 6), "forgotRoot"), slip(`\\frac{${2 * r ** 3}}{3}`, "halfIsHalf")], "twoThirds");
  }
  const [p, n] = pick(rng, [[2, 2], [3, 2], [2, 3], [5, 2]] as const);
  return R(`\\left(\\frac{1}{${p}}\\right)^{-${n}}`, String(p ** n), [slip(`\\frac{1}{${p ** n}}`, "negativeIgnored"), slip(`-${p ** n}`, "negativeIsMinus"), slip(`-\\frac{1}{${p ** n}}`, "negativeIsMinus")], "fractionBase");
}

/** 4.1.5: the logarithm laws - a sum is the product's lg, a difference the quotient's, a power comes down in front. */
function logLaws(rng: Rng): ChoiceProblem {
  const form = pick(rng, ["sum", "difference", "power", "rule", "inverse", "one"] as const);
  const R = (d: string, r: string, s: Slip[], k: string, p = "choice.alg.calculate") => rule("4.1.5", rng, d, r, s, k, p);
  if (form === "sum") {
    const [a, b, n] = pick(rng, [[2, 5, 1], [4, 25, 2], [20, 5, 2], [50, 2, 2], [25, 40, 3], [8, 125, 3], [200, 5, 3]] as const);
    return R(`\\lg ${a} + \\lg ${b}`, String(n), [slip(`\\lg ${a + b}`, "lgSum"), slip(String(a * b), "lgForgot"), slip(`\\lg ${a} \\cdot \\lg ${b}`, "lgProduct")], "lgSum");
  }
  if (form === "difference") {
    const [a, b, n] = pick(rng, [[200, 2, 2], [500, 5, 2], [3000, 3, 3], [80, 8, 1], [600, 6, 2]] as const);
    return R(`\\lg ${a} - \\lg ${b}`, String(n), [slip(`\\lg ${a - b}`, "lgDifference"), slip(String(a / b), "lgForgot"), slip(`\\frac{\\lg ${a}}{\\lg ${b}}`, "lgQuotient")], "lgDifference");
  }
  if (form === "power") {
    const n = randInt(rng, 2, 5);
    return R(`\\lg x^{${n}}`, `${n} \\lg x`, [slip(`(\\lg x)^{${n}}`, "lgPowerOutside"), slip(`\\lg ${n}x`, "lgPowerTimes"), slip(`${n} + \\lg x`, "lgPowerPlus")], "lgPower", "choice.alg.equalTo");
  }
  if (form === "rule") {
    return R(`\\lg (ab)`, `\\lg a + \\lg b`, [slip(`\\lg a \\cdot \\lg b`, "lgProduct"), slip(`a \\lg b`, "lgPowerTimes"), slip(`\\lg a - \\lg b`, "lgDifference")], "lgSum", "choice.alg.equalTo");
  }
  if (form === "inverse") {
    const a = randInt(rng, 2, 9);
    return R(`10^{\\lg ${a}}`, String(a), [slip(String(10 * a), "lgInverse"), slip(`10^{${a}}`, "lgInverse"), slip(`\\lg ${a}`, "lgInverse")], "lgInverse");
  }
  return R(`\\lg 1 + \\lg 10`, "1", [slip("0", "lgOne"), slip("11", "lgForgot"), slip(`\\lg 11`, "lgSum")], "lgOne");
}

export const ALGEBRA_RULE_CHOICES: Record<AlgebraRuleStageId, (rng: Rng) => ChoiceProblem> = {
  "3.1.8": powerLaws,
  "3.1.10": rootRules,
  "3.3.13": minusBracket,
  "3.3.15": fractions,
  "3.3.16": rearrange,
  "4.1.4": exponents,
  "4.1.5": logLaws,
};
