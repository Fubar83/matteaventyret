/**
 * Question types the nationella proven ask that the rest of the game doesn't
 * cover yet - each with a guided step plan, like the åk 7+ questions
 * (advanced.ts), and checked the same way (mathinput/workCheck.ts):
 *
 *   åk 4-6  2.6.x bråk: of a number, simplify, add and subtract, as decimals and percent
 *           2.9.x enheter: length and mass, volume, time
 *           2.10.x räkneordning, avrundning
 *   åk 7-9  3.5.1 multiply and divide fractions
 *           3.6.x hastighet-sträcka-tid, skala
 *           3.7.x sannolikhet: one event, two
 *           3.4.7/3.4.8 volym: rätblock and prisma; cylinder, kon, klot
 *           3.3.7 mönster och talföljder
 *   gy      4.1.3 ekvationssystem
 */
import { coef, signed, st, tex, type WrittenProblem, type AnswerSpec, type SolutionStep } from "./problem";
import type { QuestionScene, UnitFamily } from "./questionScene";
import { pick, randInt, type Rng } from "../../rng";

export type ExamStageId =
  | "2.6.1"
  | "2.6.2"
  | "2.6.3"
  | "2.6.4"
  | "2.9.1"
  | "2.9.2"
  | "2.9.3"
  | "2.10.1"
  | "2.10.2"
  | "3.5.1"
  | "3.6.1"
  | "3.6.2"
  | "3.7.1"
  | "3.7.2"
  | "3.4.7"
  | "3.4.8"
  | "3.3.7"
  | "4.1.3";

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
const fr = (n: number | string, d: number | string) => `\\frac{${n}}{${d}}`;
/** A fraction in lowest terms, as LaTeX - a whole number when it is one. */
function simplest(n: number, d: number): { n: number; d: number; latex: string } {
  const g = gcd(n, d);
  const [a, b] = [n / g, d / g];
  return { n: a, d: b, latex: b === 1 ? String(a) : fr(a, b) };
}
/** A number the Swedish way, for the words of a question: 3,5. */
const say = (n: number) => tex(n).replace("{,}", ",");

interface Spec {
  promptKey: string;
  promptVars?: Record<string, string | number>;
  display?: string;
  answer: AnswerSpec;
  steps: SolutionStep[];
  unit?: string;
  scene?: QuestionScene;
}

function make(stageId: ExamStageId, s: Spec): WrittenProblem {
  return {
    stageId,
    kind: "expression",
    promptKey: s.promptKey,
    promptVars: s.promptVars,
    display: s.display ?? "",
    answer: s.answer,
    tipKey: `exam.tip.${stageId}`,
    firstStep: s.steps[0].line,
    solution: s.steps.map((x) => x.line),
    steps: s.steps,
    ...(s.unit ? { unit: s.unit } : {}),
    ...(s.scene ? { scene: s.scene } : {}),
  };
}

// --- Bråk (åk 4-6) -----------------------------------------------------------

/** 3/4 av 20: one part first (20 / 4), then as many parts as the numerator says. */
function fractionOf(rng: Rng): WrittenProblem {
  const d = pick(rng, [2, 3, 4, 5, 6, 8, 10]);
  const n = randInt(rng, 1, d - 1);
  const part = randInt(rng, 2, 12);
  const whole = d * part;
  const steps = [st("step.onePart", `${fr(whole, d)} = ${part}`, { whole, d })];
  if (n > 1) steps.push(st("step.manyParts", `${part} \\cdot ${n} = ${part * n}`, { n }));
  return make("2.6.1", { promptKey: "exam.prompt.fractionOf", display: `${fr(n, d)} \\text{ av } ${whole}`, answer: { kind: "value", value: part * n }, steps });
}

/** Förkorta 12/18: by the greatest common factor - the answer in lowest terms. */
function simplifyFraction(rng: Rng): WrittenProblem {
  for (;;) {
    const q = randInt(rng, 3, 9);
    const p = randInt(rng, 1, q - 1);
    if (gcd(p, q) !== 1) continue;
    const g = randInt(rng, 2, 6);
    const [a, b] = [p * g, q * g];
    return make("2.6.2", {
      promptKey: "exam.prompt.simplify",
      display: fr(a, b),
      answer: { kind: "value", value: p / q, fraction: true },
      steps: [st("step.divideNumDen", `${fr(a, b)} = ${fr(`${a} / ${g}`, `${b} / ${g}`)}`, { n: g }), st("step.writeSimplest", fr(p, q))],
    });
  }
}

/** 1/3 + 1/4: to a common denominator, then add the numerators - and simplify. */
function addFractions(rng: Rng): WrittenProblem {
  for (;;) {
    const [d1, d2] = [pick(rng, [2, 3, 4, 5, 6, 8, 10, 12]), pick(rng, [2, 3, 4, 5, 6, 8, 10, 12])];
    if (d1 === d2) continue;
    const [n1, n2] = [randInt(rng, 1, d1 - 1), randInt(rng, 1, d2 - 1)];
    const minus = rng() < 0.4;
    const L = lcm(d1, d2);
    if (L > 40) continue;
    const [a1, a2] = [n1 * (L / d1), n2 * (L / d2)];
    const top = minus ? a1 - a2 : a1 + a2;
    if (top <= 0) continue;
    const op = minus ? "-" : "+";
    const result = simplest(top, L);
    const steps = [
      st("step.commonDenominator", `${fr(n1, d1)} ${op} ${fr(n2, d2)} = ${fr(a1, L)} ${op} ${fr(a2, L)}`, { L }),
      st(minus ? "step.subtractNumerators" : "step.addNumerators", `${fr(a1, L)} ${op} ${fr(a2, L)} = ${fr(top, L)}`),
    ];
    if (result.latex !== fr(top, L)) steps.push(st("step.writeSimplest", `${fr(top, L)} = ${result.latex}`));
    return make("2.6.3", { promptKey: "exam.prompt.fractionSum", display: `${fr(n1, d1)} ${op} ${fr(n2, d2)}`, answer: { kind: "value", value: top / L, fraction: true }, steps });
  }
}

/** Bråk, decimaltal och procent: one written as another. */
function convertFraction(rng: Rng): WrittenProblem {
  const kind = pick(rng, ["toDecimal", "toPercent", "percentToFraction"] as const);
  if (kind === "toDecimal") {
    const d = pick(rng, [2, 4, 5, 10, 20, 25, 50]);
    const n = randInt(rng, 1, d - 1);
    return make("2.6.4", { promptKey: "exam.prompt.toDecimal", display: fr(n, d), answer: { kind: "value", value: n / d }, steps: [st("step.fractionAsDivision", `${fr(n, d)} = ${tex(n / d)}`, { n, d })] });
  }
  if (kind === "toPercent") {
    const p = randInt(rng, 1, 99);
    return make("2.6.4", { promptKey: "exam.prompt.toPercent", display: tex(p / 100), answer: { kind: "value", value: p / 100 }, steps: [st("step.hundredthsArePercent", `${tex(p / 100)} = ${p} \\%`)] });
  }
  const p = pick(rng, [10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90]);
  const s = simplest(p, 100);
  return make("2.6.4", {
    promptKey: "exam.prompt.percentToFraction",
    display: `${p} \\%`,
    answer: { kind: "value", value: p / 100, fraction: true },
    steps: [st("step.percentAsHundredths", `${p} \\% = ${fr(p, 100)}`), st("step.writeSimplest", `${fr(p, 100)} = ${s.latex}`)],
  });
}

// --- Enheter (åk 4-6) ----------------------------------------------------------

interface Unit {
  name: string;
  /** In the family's base unit. */
  size: number;
}
const LENGTH: Unit[] = [
  { name: "mm", size: 0.001 },
  { name: "cm", size: 0.01 },
  { name: "dm", size: 0.1 },
  { name: "m", size: 1 },
  { name: "km", size: 1000 },
  { name: "mil", size: 10000 },
];
const MASS: Unit[] = [
  { name: "g", size: 1 },
  { name: "hg", size: 100 },
  { name: "kg", size: 1000 },
  { name: "ton", size: 1000000 },
];
const VOLUME: Unit[] = [
  { name: "ml", size: 0.001 },
  { name: "cl", size: 0.01 },
  { name: "dl", size: 0.1 },
  { name: "l", size: 1 },
];

/** A value, a unit to change it to - nice numbers both ways (at most two decimals). */
function conversion(rng: Rng, family: Unit[], stageId: ExamStageId, extraNames?: Record<string, string>): WrittenProblem {
  const familyName: UnitFamily = family === LENGTH ? "length" : family === MASS ? "mass" : "volume";
  for (;;) {
    const [from, to] = [pick(rng, family), pick(rng, family)];
    if (from === to) continue;
    const ratio = from.size / to.size;
    // Up to three steps apart - mm to km is a step too far for the stage.
    if (ratio > 1000 || ratio < 0.001) continue;
    const value = pick(rng, [randInt(rng, 2, 9), randInt(rng, 11, 95), randInt(rng, 12, 95) / 10, randInt(rng, 120, 950)]);
    const result = Math.round(value * ratio * 1e6) / 1e6;
    if (Math.round(result * 100) / 100 !== result || result >= 100000) continue;
    const factor = ratio >= 1 ? Math.round(ratio) : Math.round(1 / ratio);
    const fromName = extraNames?.[from.name] ?? from.name;
    const toName = extraNames?.[to.name] ?? to.name;
    const line = ratio >= 1 ? `${tex(value)} \\cdot ${factor} = ${tex(result)}` : `${tex(value)} / ${factor} = ${tex(result)}`;
    // Units the writing models can't read after the answer (an "l" reads as a 1; mil and ton have letters they don't know) take the number alone.
    const numberOnly = family === VOLUME || ["mil", "ton"].includes(toName);
    return make(stageId, {
      promptKey: numberOnly ? "exam.prompt.convertNumberOnly" : "exam.prompt.convert",
      promptVars: { value: say(value), from: fromName, to: toName },
      answer: { kind: "value", value: result },
      ...(numberOnly ? {} : { unit: toName }),
      scene: { kind: "units", family: familyName, from: fromName, to: toName, value },
      steps: [st(ratio >= 1 ? "step.toSmallerUnit" : "step.toBiggerUnit", line, { from: fromName, to: toName, factor })],
    });
  }
}

const lengthMass = (rng: Rng) => conversion(rng, rng() < 0.6 ? LENGTH : MASS, "2.9.1");

function volumeUnits(rng: Rng): WrittenProblem {
  // 1 l = 1 dm³ and 1 ml = 1 cm³: the same family, two names.
  const kind = pick(rng, ["liter", "liter", "liter", "same", "cubicMeter", "aquarium"] as const);
  if (kind === "same") {
    // dm³ = l, cm³ = ml: the same amount, two names.
    const [big, small] = rng() < 0.6 ? ["l", "dm³"] : ["ml", "cm³"];
    const toCubic = rng() < 0.5;
    const value = randInt(rng, 2, 40) / (rng() < 0.5 ? 1 : 2);
    const [from, to] = toCubic ? [big, small] : [small, big];
    return make("2.9.2", {
      promptKey: "exam.prompt.convertNumberOnly",
      promptVars: { value: say(value), from, to },
      answer: { kind: "value", value },
      scene: { kind: "units", family: "volume", from, to, value },
      steps: [st(big === "l" ? "step.litreIsCubicDm" : "step.mlIsCubicCm", tex(value))],
    });
  }
  if (kind === "cubicMeter") {
    // 1 m³ = 1 000 l: a cube a meter each way.
    const toLiters = rng() < 0.6;
    const m3 = pick(rng, [1, 2, 3, 0.5, 1.5, 2.5, 0.25, 4]);
    const liters = m3 * 1000;
    return make("2.9.2", {
      promptKey: "exam.prompt.convertNumberOnly",
      promptVars: toLiters ? { value: say(m3), from: "m³", to: "l" } : { value: say(liters), from: "l", to: "m³" },
      answer: { kind: "value", value: toLiters ? liters : m3 },
      scene: { kind: "units", family: "volume", from: toLiters ? "m³" : "l", to: toLiters ? "l" : "m³", value: toLiters ? m3 : liters },
      steps: [st(toLiters ? "step.cubicMeterToLiters" : "step.litersToCubicMeter", toLiters ? `${tex(m3)} \\cdot 1000 = ${liters}` : `${liters} / 1000 = ${tex(m3)}`)],
    });
  }
  if (kind === "aquarium") {
    // A box measured in dm holds its volume in dm³ - which is liters.
    const [l, b, h] = [randInt(rng, 3, 8), randInt(rng, 2, 5), randInt(rng, 2, 5)];
    return make("2.9.2", {
      promptKey: "exam.prompt.aquarium",
      promptVars: { l, b, h },
      answer: { kind: "value", value: l * b * h },
      scene: { kind: "units", family: "volume", from: "dm³", to: "l", value: l * b * h },
      steps: [st("step.aquariumVolume", `${l} \\cdot ${b} \\cdot ${h} = ${l * b * h}`)],
    });
  }
  return conversion(rng, VOLUME, "2.9.2");
}

/** Tid: hours and minutes - 2,5 h in minutes, 1 h 45 min in minutes, 150 min in hours. */
function timeUnits(rng: Rng): WrittenProblem {
  const kind = pick(rng, ["decimalHours", "hoursMinutes", "minutesToHours", "minutesToSeconds", "days"] as const);
  if (kind === "days") {
    const toHours = rng() < 0.6;
    const d = pick(rng, [2, 3, 4, 7, 0.5, 1.5]);
    return make("2.9.3", {
      // "dygn" can't be written after the answer (no y in the writing models) - the number alone, that way.
      promptKey: toHours ? "exam.prompt.convert" : "exam.prompt.convertNumberOnly",
      promptVars: toHours ? { value: say(d), from: "dygn", to: "h" } : { value: d * 24, from: "h", to: "dygn" },
      answer: { kind: "value", value: toHours ? d * 24 : d },
      ...(toHours ? { unit: "h" } : {}),
      scene: { kind: "units", family: "time", from: toHours ? "dygn" : "h", to: toHours ? "h" : "dygn", value: toHours ? d : d * 24 },
      steps: [st(toHours ? "step.dayIs24" : "step.hoursToDays", toHours ? `${tex(d)} \\cdot 24 = ${d * 24}` : `${d * 24} / 24 = ${tex(d)}`)],
    });
  }
  if (kind === "decimalHours") {
    const h = pick(rng, [0.5, 1.5, 2.5, 0.25, 0.75, 1.25, 3.5]);
    return make("2.9.3", { promptKey: "exam.prompt.convert", promptVars: { value: say(h), from: "h", to: "min" }, answer: { kind: "value", value: h * 60 }, unit: "min", scene: { kind: "units", family: "time", from: "h", to: "min", value: h }, steps: [st("step.hourIs60", `${tex(h)} \\cdot 60 = ${h * 60}`)] });
  }
  if (kind === "hoursMinutes") {
    const [h, m] = [randInt(rng, 1, 4), pick(rng, [5, 10, 15, 20, 25, 30, 40, 45, 50])];
    return make("2.9.3", {
      promptKey: "exam.prompt.hoursMinutes",
      promptVars: { h, m },
      answer: { kind: "value", value: h * 60 + m },
      unit: "min",
      steps: [st("step.hourIs60", `${h} \\cdot 60 = ${h * 60}`), st("step.addMinutes", `${h * 60} + ${m} = ${h * 60 + m}`, { m })],
    });
  }
  if (kind === "minutesToHours") {
    const h = pick(rng, [1.5, 2.5, 0.5, 1.25, 2.25, 3.5, 0.75]);
    return make("2.9.3", { promptKey: "exam.prompt.convert", promptVars: { value: h * 60, from: "min", to: "h" }, answer: { kind: "value", value: h }, unit: "h", scene: { kind: "units", family: "time", from: "min", to: "h", value: h * 60 }, steps: [st("step.minutesToHours", `${h * 60} / 60 = ${tex(h)}`)] });
  }
  const min = pick(rng, [2, 3, 5, 1.5, 2.5, 4]);
  return make("2.9.3", { promptKey: "exam.prompt.convert", promptVars: { value: say(min), from: "min", to: "s" }, answer: { kind: "value", value: min * 60 }, unit: "s", scene: { kind: "units", family: "time", from: "min", to: "s", value: min }, steps: [st("step.minuteIs60", `${tex(min)} \\cdot 60 = ${min * 60}`)] });
}

// --- Räkneordning och avrundning (åk 4-6) --------------------------------------

/** Multiplication and division before addition and subtraction; brackets before everything. */
function orderOfOperations(rng: Rng): WrittenProblem {
  const kind = pick(rng, ["plusTimes", "bracket", "minusDivide", "twoProducts"] as const);
  const [a, b, c] = [randInt(rng, 2, 9), randInt(rng, 2, 9), randInt(rng, 2, 9)];
  if (kind === "plusTimes") {
    return make("2.10.1", { promptKey: "exam.prompt.calculate", display: `${a} + ${b} \\cdot ${c}`, answer: { kind: "value", value: a + b * c }, steps: [st("step.multiplyFirst", `${b} \\cdot ${c} = ${b * c}`), st("step.thenAddSubtract", `${a} + ${b * c} = ${a + b * c}`)] });
  }
  if (kind === "bracket") {
    return make("2.10.1", { promptKey: "exam.prompt.calculate", display: `(${a} + ${b}) \\cdot ${c}`, answer: { kind: "value", value: (a + b) * c }, steps: [st("step.bracketFirst", `${a} + ${b} = ${a + b}`), st("step.thenMultiply", `${a + b} \\cdot ${c} = ${(a + b) * c}`)] });
  }
  if (kind === "minusDivide") {
    const q = randInt(rng, 2, 9);
    const big = q * c + randInt(rng, 1, 20);
    return make("2.10.1", {
      promptKey: "exam.prompt.calculate",
      display: `${big} - ${q * c} / ${c}`,
      answer: { kind: "value", value: big - q },
      steps: [st("step.divideFirst", `${q * c} / ${c} = ${q}`), st("step.thenAddSubtract", `${big} - ${q} = ${big - q}`)],
    });
  }
  const d = randInt(rng, 2, 9);
  return make("2.10.1", {
    promptKey: "exam.prompt.calculate",
    display: `${a} \\cdot ${b} + ${c} \\cdot ${d}`,
    answer: { kind: "value", value: a * b + c * d },
    steps: [st("step.multiplyFirst", `${a} \\cdot ${b} = ${a * b}`), st("step.multiplyFirst", `${c} \\cdot ${d} = ${c * d}`), st("step.thenAddSubtract", `${a * b} + ${c * d} = ${a * b + c * d}`)],
  });
}

/** Avrunda: to tens, hundreds, a whole number, one decimal. */
function rounding(rng: Rng): WrittenProblem {
  const kind = pick(rng, ["tens", "hundreds", "whole", "oneDecimal", "twoDecimals"] as const);
  const n =
    kind === "tens" ? randInt(rng, 101, 999) : kind === "hundreds" ? randInt(rng, 1001, 9999) : kind === "whole" ? randInt(rng, 101, 999) / 10 : kind === "oneDecimal" ? randInt(rng, 1001, 9999) / 1000 : randInt(rng, 10001, 99999) / 10000;
  const step = kind === "tens" ? 10 : kind === "hundreds" ? 100 : kind === "whole" ? 1 : kind === "oneDecimal" ? 0.1 : 0.01;
  const r = Math.round(Math.round(n / step + 1e-9) * step * 1e6) / 1e6;
  return make("2.10.2", { promptKey: `exam.prompt.round.${kind}`, display: tex(n), answer: { kind: "value", value: r }, steps: [st(`step.round.${kind}`, tex(r))] });
}

// --- Bråk (åk 7-9) -------------------------------------------------------------

function mulDivFractions(rng: Rng): WrittenProblem {
  for (;;) {
    const [d1, d2] = [randInt(rng, 2, 9), randInt(rng, 2, 9)];
    const [n1, n2] = [randInt(rng, 1, d1 - 1), randInt(rng, 1, d2 - 1)];
    const divide = rng() < 0.5;
    // Divided: times the second turned upside down.
    const [m, k] = divide ? [d2, n2] : [n2, d2];
    const [top, bottom] = [n1 * m, d1 * k];
    const result = simplest(top, bottom);
    const steps: SolutionStep[] = [];
    if (divide) steps.push(st("step.invertDivisor", `${fr(n1, d1)} \\cdot ${fr(m, k)}`));
    steps.push(st("step.multiplyFractions", `${fr(n1, d1)} \\cdot ${fr(m, k)} = ${fr(top, bottom)}`));
    if (result.latex !== fr(top, bottom)) steps.push(st("step.writeSimplest", `${fr(top, bottom)} = ${result.latex}`));
    return make("3.5.1", { promptKey: "exam.prompt.calculateSimplest", display: `${fr(n1, d1)} ${divide ? "\\div" : "\\cdot"} ${fr(n2, d2)}`, answer: { kind: "value", value: top / bottom, fraction: true }, steps });
  }
}

// --- Hastighet och skala (åk 7-9) -------------------------------------------------

/** s = v · t, v = s / t, t = s / v. */
function speed(rng: Rng): WrittenProblem {
  const kind = pick(rng, ["distance", "speed", "time"] as const);
  const v = 5 * randInt(rng, 6, 22);
  const t = pick(rng, [0.5, 1.5, 2, 2.5, 3, 4, 1.25]);
  const s = v * t;
  if (kind === "distance") {
    return make("3.6.1", { promptKey: "exam.prompt.speedDistance", promptVars: { v, t: say(t) }, answer: { kind: "value", value: s }, unit: "km", steps: [st("step.distanceFormula", `s = v \\cdot t = ${v} \\cdot ${tex(t)} = ${tex(s)}`)] });
  }
  if (kind === "speed") {
    // Dividing by a time with decimals (2,5 h): the commas moved first, as in trappan - 125 / 2,5 = 1250 / 25.
    const k = (String(t).split(".")[1] ?? "").length;
    const steps =
      k === 0
        ? [st("step.speedFormula", `v = \\frac{s}{t} = \\frac{${tex(s)}}{${tex(t)}} = ${v}`)]
        : [
            st("step.speedFormula", `v = \\frac{s}{t} = \\frac{${tex(s)}}{${tex(t)}}`),
            st("step.moveComma", `v = \\frac{${Math.round(s * 10 ** k)}}{${Math.round(t * 10 ** k)}}`, { n: k }),
            st("step.trappanDivide", `v = ${v}`),
          ];
    return make("3.6.1", { promptKey: "exam.prompt.speedSpeed", promptVars: { s: say(s), t: say(t) }, answer: { kind: "value", value: v }, unit: "km/h", steps });
  }
  return make("3.6.1", { promptKey: "exam.prompt.speedTime", promptVars: { s: say(s), v }, answer: { kind: "value", value: t }, unit: "h", steps: [st("step.timeFormula", `t = \\frac{s}{v} = \\frac{${tex(s)}}{${v}} = ${tex(t)}`)] });
}

/** Skala: on the map to real life (1:k), back again, and an enlargement (k:1). */
function scale(rng: Rng): WrittenProblem {
  const kind = pick(rng, ["mapToReal", "realToMap", "enlargement"] as const);
  if (kind === "enlargement") {
    const k = pick(rng, [2, 4, 5, 10]);
    const real = randInt(rng, 2, 15);
    return make("3.6.2", {
      promptKey: "exam.prompt.scaleEnlarge",
      promptVars: { k, drawn: real * k },
      answer: { kind: "value", value: real },
      unit: "mm",
      steps: [st("step.scaleDivide", `${real * k} / ${k} = ${real}`, { k })],
    });
  }
  const k = pick(rng, [100, 200, 500, 1000, 2000, 5000, 10000]);
  const cm = pick(rng, [2, 3, 4, 5, 6, 8, 1.5, 2.5, 3.5]);
  const realCm = Math.round(cm * k * 1e6) / 1e6;
  const realM = realCm / 100;
  if (kind === "mapToReal") {
    return make("3.6.2", {
      promptKey: "exam.prompt.scaleMapToReal",
      promptVars: { k, cm: say(cm) },
      answer: { kind: "value", value: realM },
      unit: "m",
      steps: [st("step.scaleMultiply", `${tex(cm)} \\cdot ${k} = ${tex(realCm)}`, { k }), st("step.cmToM", `${tex(realCm)} / 100 = ${tex(realM)}`)],
    });
  }
  return make("3.6.2", {
    promptKey: "exam.prompt.scaleRealToMap",
    promptVars: { k, m: say(realM) },
    answer: { kind: "value", value: cm },
    unit: "cm",
    steps: [st("step.mToCm", `${tex(realM)} \\cdot 100 = ${tex(realCm)}`), st("step.scaleDivide", `${tex(realCm)} / ${k} = ${tex(cm)}`, { k })],
  });
}

// --- Sannolikhet (åk 7-9) -----------------------------------------------------------

/** P = 2/6 = 1/3 - counted, then in lowest terms when it isn't already. */
function probabilityLine(fav: number, total: number): string {
  const s = simplest(fav, total);
  return s.latex === fr(fav, total) ? `P = ${s.latex}` : `P = ${fr(fav, total)} = ${s.latex}`;
}

/** One event: a bag of marbles, a die. Any form of the probability is right (3/8, 0,375, 37,5 %). */
function probability(rng: Rng): WrittenProblem {
  if (rng() < 0.5) {
    const [r, b, g] = [randInt(rng, 2, 8), randInt(rng, 2, 8), pick(rng, [0, 2, 3, 4, 5])];
    const total = r + b + g;
    const color = pick(rng, g > 0 ? (["red", "blue", "green"] as const) : (["red", "blue"] as const));
    const fav = color === "red" ? r : color === "blue" ? b : g;
    return make("3.7.1", {
      promptKey: `exam.prompt.${g > 0 ? "marbles" : "marblesTwo"}.${color}`,
      promptVars: { r, b, g },
      answer: { kind: "value", value: fav / total },
      steps: [st("step.probabilityCount", probabilityLine(fav, total), { fav, total })],
    });
  }
  const event = pick(rng, ["six", "even", "overFour", "underThree"] as const);
  const fav = event === "six" ? 1 : event === "even" ? 3 : 2;
  return make("3.7.1", { promptKey: `exam.prompt.die.${event}`, answer: { kind: "value", value: fav / 6 }, steps: [st("step.probabilityCount", probabilityLine(fav, 6), { fav, total: 6 })] });
}

/** Two events: two coins, two dice - multiplied, or counted among the 36 outcomes. */
function probabilityTwo(rng: Rng): WrittenProblem {
  const kind = pick(rng, ["twoHeads", "twoSixes", "sumSeven", "atLeastOneSix", "sameNumber", "sumK", "sumK", "twoDraws", "twoDraws", "coinAndDie"] as const);
  if (kind === "sumK") {
    const k = pick(rng, [3, 4, 5, 6, 8, 9, 10, 11]);
    const ways = 6 - Math.abs(k - 7);
    const s = simplest(ways, 36);
    return make("3.7.2", {
      promptKey: "exam.prompt.sumK",
      promptVars: { k },
      answer: { kind: "value", value: ways / 36 },
      steps: [st("step.countOutcomes", s.latex === fr(ways, 36) ? `P = ${fr(ways, 36)}` : `P = ${fr(ways, 36)} = ${s.latex}`)],
    });
  }
  if (kind === "twoDraws") {
    // Put back between the draws: the same chance both times.
    const [r, b] = [randInt(rng, 1, 6), randInt(rng, 1, 6)];
    const n = r + b;
    const s = simplest(r * r, n * n);
    return make("3.7.2", {
      promptKey: "exam.prompt.twoDraws",
      promptVars: { r, b },
      answer: { kind: "value", value: (r * r) / (n * n) },
      steps: [st("step.multiplyProbabilities", `P = ${fr(r, n)} \\cdot ${fr(r, n)} = ${fr(r * r, n * n)}${s.latex === fr(r * r, n * n) ? "" : ` = ${s.latex}`}`)],
    });
  }
  if (kind === "coinAndDie") return make("3.7.2", { promptKey: "exam.prompt.coinAndDie", answer: { kind: "value", value: 1 / 12 }, steps: [st("step.multiplyProbabilities", `P = ${fr(1, 2)} \\cdot ${fr(1, 6)} = ${fr(1, 12)}`)] });
  if (kind === "twoHeads") return make("3.7.2", { promptKey: "exam.prompt.twoHeads", answer: { kind: "value", value: 0.25 }, steps: [st("step.multiplyProbabilities", `P = ${fr(1, 2)} \\cdot ${fr(1, 2)} = ${fr(1, 4)}`)] });
  if (kind === "twoSixes") return make("3.7.2", { promptKey: "exam.prompt.twoSixes", answer: { kind: "value", value: 1 / 36 }, steps: [st("step.multiplyProbabilities", `P = ${fr(1, 6)} \\cdot ${fr(1, 6)} = ${fr(1, 36)}`)] });
  if (kind === "sumSeven") return make("3.7.2", { promptKey: "exam.prompt.sumSeven", answer: { kind: "value", value: 6 / 36 }, steps: [st("step.countOutcomes", `P = ${fr(6, 36)} = ${fr(1, 6)}`)] });
  if (kind === "sameNumber") return make("3.7.2", { promptKey: "exam.prompt.sameNumber", answer: { kind: "value", value: 6 / 36 }, steps: [st("step.countOutcomes", `P = ${fr(6, 36)} = ${fr(1, 6)}`)] });
  return make("3.7.2", {
    promptKey: "exam.prompt.atLeastOneSix",
    answer: { kind: "value", value: 11 / 36 },
    steps: [st("step.complementNoSix", `P = 1 - ${fr(5, 6)} \\cdot ${fr(5, 6)}`), st("step.calculate", `1 - ${fr(25, 36)} = ${fr(11, 36)}`)],
  });
}

// --- Volym (åk 7-9) ---------------------------------------------------------------------

/** Rätblock, kub and a prism with a triangle for its base. */
function volumePrism(rng: Rng): WrittenProblem {
  const kind = pick(rng, ["box", "cube", "prism"] as const);
  if (kind === "cube") {
    const s = randInt(rng, 2, 9);
    return make("3.4.7", { promptKey: "exam.prompt.cube", promptVars: { s }, answer: { kind: "value", value: s ** 3 }, unit: "cm³", steps: [st("step.cubeVolume", `V = ${s} \\cdot ${s} \\cdot ${s} = ${s ** 3}`)] });
  }
  if (kind === "box") {
    const [l, b, h] = [randInt(rng, 2, 12), randInt(rng, 2, 9), randInt(rng, 2, 9)];
    return make("3.4.7", { promptKey: "exam.prompt.box", promptVars: { l, b, h }, answer: { kind: "value", value: l * b * h }, unit: "cm³", steps: [st("step.boxVolume", `V = ${l} \\cdot ${b} \\cdot ${h} = ${l * b * h}`)] });
  }
  const [b, h] = [2 * randInt(rng, 2, 6), randInt(rng, 2, 8)];
  const len = randInt(rng, 3, 12);
  const base = (b * h) / 2;
  return make("3.4.7", {
    promptKey: "exam.prompt.prism",
    promptVars: { b, h, len },
    answer: { kind: "value", value: base * len },
    unit: "cm³",
    steps: [st("step.baseArea", `B = ${fr(`${b} \\cdot ${h}`, 2)} = ${base}`), st("step.prismVolume", `V = ${base} \\cdot ${len} = ${base * len}`)],
  });
}

/**
 * Cylinder, kon, klot - rounded to one decimal, and worked by hand: the whole
 * numbers first (r² · h, and the third or the 4/3 coming out even), so π
 * meets one whole number at the end - 3,14 · 150, in a column.
 */
function volumeRound(rng: Rng): WrittenProblem {
  const kind = pick(rng, ["cylinder", "cone", "sphere"] as const);
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const dec = (n: number) => Math.round(n * 1e6) / 1e6;
  /** "V ≈ 3,14 · 150 = 471 (≈ 471,0)": π times the whole number, then rounded when there's more than one decimal. */
  const piLine = (n: number) => {
    const p = dec(3.14 * n);
    const more = (String(p).split(".")[1] ?? "").length > 1;
    return st(more ? "step.geo.piTimesRound" : "step.geo.piTimes", `V \\approx 3{,}14 \\cdot ${n} = ${tex(p)}${more ? ` \\approx ${round1(p).toFixed(1).replace(".", "{,}")}` : ""}`, { x: n });
  };
  const answer = (exact: number, n: number) => ({ kind: "value" as const, value: round1(dec(3.14 * n)), approx: true, exact, piAs314: dec(3.14 * n) });
  if (kind === "cylinder") {
    const r = randInt(rng, 2, 8);
    const h = randInt(rng, 3, 15);
    const n = r * r * h;
    return make("3.4.8", {
      promptKey: "exam.prompt.cylinder",
      promptVars: { r, h },
      answer: answer(Math.PI * n, n),
      unit: "cm³",
      steps: [st("step.cylinderVolume", `V = \\pi \\cdot ${r}^{2} \\cdot ${h} = \\pi \\cdot ${n}`, { r, h, n }), piLine(n)],
    });
  }
  if (kind === "cone") {
    // r² · h divisible by 3, so the third comes out even.
    const r = randInt(rng, 2, 8);
    const h = r % 3 === 0 ? randInt(rng, 3, 15) : 3 * randInt(rng, 1, 5);
    const n = (r * r * h) / 3;
    return make("3.4.8", {
      promptKey: "exam.prompt.cone",
      promptVars: { r, h },
      answer: answer(Math.PI * n, n),
      unit: "cm³",
      steps: [st("step.coneVolume", `V = \\frac{\\pi \\cdot ${r}^{2} \\cdot ${h}}{3} = \\frac{\\pi \\cdot ${r * r * h}}{3} = \\pi \\cdot ${n}`, { r, h, rrh: r * r * h }), piLine(n)],
    });
  }
  // A radius divisible by 3, so 4 · r³ / 3 is whole.
  const r = pick(rng, [3, 6]);
  const n = (4 * r ** 3) / 3;
  return make("3.4.8", {
    promptKey: "exam.prompt.sphere",
    promptVars: { r },
    answer: answer(Math.PI * n, n),
    unit: "cm³",
    steps: [st("step.sphereVolume", `V = \\frac{4 \\cdot \\pi \\cdot ${r}^{3}}{3} = \\frac{4 \\cdot \\pi \\cdot ${r ** 3}}{3} = \\pi \\cdot ${n}`, { r, rrr: r ** 3 }), piLine(n)],
  });
}

// --- Mönster och talföljder (åk 7-9) --------------------------------------------------------

/** An arithmetic sequence: the number at a place, or a formula for the n:th. */
function sequences(rng: Rng): WrittenProblem {
  const a1 = randInt(rng, 1, 12);
  const d = randInt(rng, 2, 9);
  const terms = [0, 1, 2, 3].map((k) => a1 + k * d);
  const shown = `${terms.join(",\\ ")},\\ \\ldots`;
  if (rng() < 0.5) {
    const n = randInt(rng, 10, 50);
    const value = a1 + (n - 1) * d;
    return make("3.3.7", {
      promptKey: "exam.prompt.sequenceTerm",
      promptVars: { n },
      display: shown,
      answer: { kind: "value", value },
      steps: [st("step.sequenceDifference", `${terms[1]} - ${terms[0]} = ${d}`), st("step.sequenceTerm", `${a1} + (${n} - 1) \\cdot ${d} = ${value}`, { n })],
    });
  }
  const formula = `${coef(d, "n")} ${signed(a1 - d)}`.replace(/ \+ 0$/, "");
  return make("3.3.7", {
    promptKey: "exam.prompt.sequenceFormula",
    display: shown,
    answer: { kind: "expression", variable: "n", latex: a1 - d === 0 ? coef(d, "n") : formula },
    steps: [st("step.sequenceStart", `${a1} + (n - 1) \\cdot ${d}`, { d }), st("step.simplifyTerms", a1 - d === 0 ? coef(d, "n") : formula)],
  });
}

// --- Ekvationssystem (gy) -----------------------------------------------------------------

/** Two lines y = kx + m crossing at whole numbers (substitution), or two equations to add (addition method). */
function systems(rng: Rng): WrittenProblem {
  const x = randInt(rng, -5, 6);
  const y = randInt(rng, -5, 8);
  if (rng() < 0.5) {
    for (;;) {
      const [k1, k2] = [randInt(rng, -4, 5), randInt(rng, -4, 5)];
      if (k1 === k2 || k1 === 0 || k2 === 0) continue;
      const [m1, m2] = [y - k1 * x, y - k2 * x];
      const line = (k: number, m: number) => `y = ${coef(k)} ${m === 0 ? "" : signed(m)}`.trim();
      const rhs = (k: number, m: number) => `${coef(k)} ${m === 0 ? "" : signed(m)}`.trim();
      return make("4.1.3", {
        promptKey: "exam.prompt.system",
        display: `\\begin{cases} ${line(k1, m1)} \\\\ ${line(k2, m2)} \\end{cases}`,
        answer: { kind: "system", variables: ["x", "y"], values: [x, y] },
        steps: [
          st("step.setEqual", `${rhs(k1, m1)} = ${rhs(k2, m2)}`),
          ...(k1 - k2 === 1 ? [] : [st("step.collectX", `${coef(k1 - k2)} = ${tex(m2 - m1)}`, { term: coef(k2) })]),
          st("step.solveForX", `x = ${x}`),
          st("step.insertToGetY", `y = ${k1} \\cdot ${x < 0 ? `(${x})` : x} ${m1 === 0 ? "" : signed(m1)} = ${y}`.replace("  ", " ")),
        ],
      });
    }
  }
  // Addition: a x + y = c1 and b x − y = c2 → (a + b) x = c1 + c2.
  const [a, b] = [randInt(rng, 1, 4), randInt(rng, 1, 4)];
  const [c1, c2] = [a * x + y, b * x - y];
  return make("4.1.3", {
    promptKey: "exam.prompt.system",
    display: `\\begin{cases} ${coef(a)} + y = ${c1} \\\\ ${coef(b)} - y = ${c2} \\end{cases}`,
    answer: { kind: "system", variables: ["x", "y"], values: [x, y] },
    steps: [
      st("step.addEquations", `${coef(a + b)} = ${c1 + c2}`),
      st("step.solveForX", `x = ${x}`),
      st("step.insertToGetY", `${a} \\cdot ${x < 0 ? `(${x})` : x} + y = ${c1}`),
      st("step.solveForY", `y = ${y}`),
    ],
  });
}

export const EXAM_GENERATORS: Record<ExamStageId, (rng: Rng) => WrittenProblem> = {
  "2.6.1": fractionOf,
  "2.6.2": simplifyFraction,
  "2.6.3": addFractions,
  "2.6.4": convertFraction,
  "2.9.1": lengthMass,
  "2.9.2": volumeUnits,
  "2.9.3": timeUnits,
  "2.10.1": orderOfOperations,
  "2.10.2": rounding,
  "3.5.1": mulDivFractions,
  "3.6.1": speed,
  "3.6.2": scale,
  "3.7.1": probability,
  "3.7.2": probabilityTwo,
  "3.4.7": volumePrism,
  "3.4.8": volumeRound,
  "3.3.7": sequences,
  "4.1.3": systems,
};
