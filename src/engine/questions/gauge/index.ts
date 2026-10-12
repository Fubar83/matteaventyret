/**
 * Setting an instrument: drag the water in a measuring jug, or a
 * thermometer's red line, to what's asked. The scale is there to read; the
 * number isn't shown, as reading it is the task.
 *
 *   åk 1-3  1.10.5 häll upp: a 1-litre jug in decilitres - n dl, half a litre, n dl more
 *   åk 4-6  2.9.12 mät upp i liter: a 2-litre jug marked in litres - 1,3 l, 7 dl, a recipe for more people
 *   åk 4-6  2.17.4 ställ termometern: −20 to 20 °C - a temperature, or n degrees warmer or colder, across 0
 *
 * Values are whole units of the scale's ticks (decilitres, degrees), so
 * nothing is a floating-point guess.
 *
 * How it works, and what must stay true: docs/question-types/gauge.md.
 */
import { pick, randInt, type Rng } from "../../rng";
import { text, type ChoiceText } from "../choice/problem";
import { questionType, retry } from "../questionType";

export type GaugeStageId = "1.10.5" | "2.9.12" | "2.17.4";

export interface GaugeProblem {
  stageId: GaugeStageId;
  kind: "gauge";
  instrument: "jug" | "thermometer";
  /** The scale, in ticks: decilitres or degrees. */
  min: number;
  max: number;
  /** A number on the scale every … ticks. */
  labelEvery: number;
  /** How the numbers are written: decilitres, litres (ticks are dl), degrees. */
  labels: "dl" | "l" | "deg";
  /** Where it stands at the start - what's in the jug, today's temperature. */
  start: number;
  target: number;
  /** A change asked for ("7 grader kallare"): its size and way, for the slip of going the other way. */
  change: number | null;
  prompt: ChoiceText;
  tip: ChoiceText;
  explanation: ChoiceText;
}

/** A value as the scale writes it: 13 dl in litres is "1,3 l", −4 degrees "−4 °C". */
export function gaugeText(labels: GaugeProblem["labels"], v: number): string {
  if (labels === "deg") return `${v < 0 ? "−" : ""}${Math.abs(v)}\u00a0°C`;
  if (labels === "l") return `${String(v / 10).replace(".", ",")}\u00a0l`;
  return `${v}\u00a0dl`;
}

/** Why a setting isn't right - the other way, a step off at 0, or simply too high or low. */
export function gaugeWhy(p: GaugeProblem, value: number): ChoiceText {
  if (p.change !== null && value === p.start - p.change) return text(p.change < 0 ? "gauge.why.colderIsDown" : p.instrument === "jug" ? "gauge.why.pourIn" : "gauge.why.warmerIsUp");
  if (p.instrument === "thermometer" && Math.abs(value - p.target) === 1 && Math.min(p.start, p.target) < 0 && Math.max(p.start, p.target) > 0) return text("gauge.why.zero");
  if (value === p.start && p.change !== null) return text("gauge.why.notMoved");
  // Only which way: how far is for the scale to tell.
  return text(value > p.target ? "gauge.why.tooHigh" : "gauge.why.tooLow");
}

/** 1.10.5: a 1-litre jug marked every decilitre, numbered every 2. */
function pourDecilitres(rng: Rng): GaugeProblem {
  const base = { stageId: "1.10.5" as const, kind: "gauge" as const, instrument: "jug" as const, min: 0, max: 10, labelEvery: 2, labels: "dl" as const };
  const ask = pick(rng, ["dl", "dl", "half", "more"] as const);
  if (ask === "half")
    return { ...base, start: 0, target: 5, change: null, prompt: text("gauge.jug.half"), tip: text("gauge.tip.half"), explanation: text("gauge.explain.half") };
  if (ask === "more") {
    const start = randInt(rng, 2, 6);
    const more = randInt(rng, 2, 10 - start);
    return { ...base, start, target: start + more, change: more, prompt: text("gauge.jug.more", { n: more }), tip: text("gauge.tip.more"), explanation: text("gauge.explain.more", { a: start, n: more, b: start + more }) };
  }
  // An odd number is between the numbers - read the ticks.
  const n = rng() < 0.7 ? pick(rng, [1, 3, 5, 7, 9]) : pick(rng, [4, 6, 8]);
  return { ...base, start: 0, target: n, change: null, prompt: text("gauge.jug.dl", { n }), tip: text("gauge.tip.dl"), explanation: text("gauge.explain.dl", { n }) };
}

/** 2.9.12: a 2-litre jug marked every decilitre, numbered every half litre in litres. */
function pourLitres(rng: Rng): GaugeProblem {
  const base = { stageId: "2.9.12" as const, kind: "gauge" as const, instrument: "jug" as const, min: 0, max: 20, labelEvery: 5, labels: "l" as const, start: 0, change: null };
  const ask = pick(rng, ["litres", "decilitres", "recipe"] as const);
  if (ask === "litres") {
    const dl = retry("gauge 2.9.12 litres", () => {
      const v = randInt(rng, 3, 19);
      return v % 5 === 0 ? null : v;
    });
    const l = gaugeText("l", dl);
    return { ...base, target: dl, prompt: text("gauge.jug.litres", { l }), tip: text("gauge.tip.litres"), explanation: text("gauge.explain.litres", { l, dl }) };
  }
  if (ask === "decilitres") {
    const dl = retry("gauge 2.9.12 dl", () => {
      const v = randInt(rng, 3, 18);
      return v % 5 === 0 ? null : v;
    });
    return { ...base, target: dl, prompt: text("gauge.jug.dlInLitres", { n: dl }), tip: text("gauge.tip.litres"), explanation: text("gauge.explain.litres", { l: gaugeText("l", dl), dl }) };
  }
  // A recipe for 4, made for 2, 6 or 8 - the amount scaled, a whole number of decilitres up to 2 litres.
  return retry("gauge 2.9.12 recipe", () => {
    const per4 = randInt(rng, 2, 8);
    const people = pick(rng, [2, 6, 8]);
    const target = (per4 * people) / 4;
    if (!Number.isInteger(target) || target > 20 || target === per4) return null;
    const what = pick(rng, ["milk", "water", "juice"]);
    return {
      ...base,
      target,
      prompt: text("gauge.jug.recipe", { a: per4, n: people, what: `@gauge.what.${what}` }),
      tip: text("gauge.tip.recipe"),
      explanation: text("gauge.explain.recipe", { a: per4, n: people, b: target, l: gaugeText("l", target) }),
    };
  });
}

/** 2.17.4: a thermometer from −20 to 20, numbered every 5 - a temperature to set, or a change across 0. */
function setThermometer(rng: Rng): GaugeProblem {
  const base = { stageId: "2.17.4" as const, kind: "gauge" as const, instrument: "thermometer" as const, min: -20, max: 20, labelEvery: 5, labels: "deg" as const };
  if (rng() < 0.35) {
    const target = retry("gauge 2.17.4 set", () => {
      const v = randInt(rng, -18, 18);
      return v % 5 === 0 ? null : v;
    });
    const start = retry("gauge 2.17.4 start", () => {
      const v = randInt(rng, -10, 10);
      return v === target ? null : v;
    });
    const deg = gaugeText("deg", target);
    return { ...base, start, target, change: null, prompt: text("gauge.temp.set", { t: deg }), tip: text(target < 0 ? "gauge.tip.minus" : "gauge.tip.plus"), explanation: text("gauge.explain.set", { t: deg }) };
  }
  // Warmer or colder, mostly across 0: that's where the counting goes wrong.
  return retry("gauge 2.17.4 change", () => {
    const start = randInt(rng, -12, 12);
    const change = pick(rng, [-1, 1]) * randInt(rng, 3, 12);
    const target = start + change;
    if (target < -19 || target > 19 || start === 0 || target === 0) return null;
    if (Math.sign(start) === Math.sign(target) && rng() < 0.7) return null;
    const from = gaugeText("deg", start);
    const to = gaugeText("deg", target);
    return {
      ...base,
      start,
      target,
      change,
      prompt: text(change < 0 ? "gauge.temp.colder" : "gauge.temp.warmer", { t: from, n: Math.abs(change) }),
      tip: text(change < 0 ? "gauge.tip.colder" : "gauge.tip.warmer"),
      explanation: text(change < 0 ? "gauge.explain.colder" : "gauge.explain.warmer", { t: from, n: Math.abs(change), u: to }),
    };
  });
}

export const GAUGE_QUESTIONS = questionType<"gauge", GaugeProblem, GaugeStageId>({
  id: "gauge",
  kinds: ["gauge"],
  levels: {
    "1.10.5": pourDecilitres,
    "2.9.12": pourLitres,
    "2.17.4": setThermometer,
  },
  key: (p) => `gauge:${p.stageId}:${p.start}:${p.target}:${p.prompt.key}:${JSON.stringify(p.prompt.vars ?? {})}`,
});
