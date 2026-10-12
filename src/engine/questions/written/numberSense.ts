/**
 * Number sense and mental arithmetic (Lgr22 "Taluppfattning", "Algebra",
 * "Geometri: mätning") - mostly facts to know, so just the answer, picked or
 * written (answerOnly):
 *
 *   åk 1-3  1.7.1 tiokamrater                  1.7.2 plus och minus inom 20 (over the ten)
 *           1.7.3 dubbelt och hälften          1.7.4 huvudräkning med tiotal (and hundrakamrater)
 *           1.8.1 tallinjen                    1.8.4 talmönster
 *           1.10.1 mäta längd (a ruler)
 *   åk 4-6  2.20.1 talföljder: a rule, and the number far along - written out
 *
 * Every worked step ends in the answer, so the help shows how it's thought.
 */
import { pick, randInt, type Rng } from "../../rng";
import { RULER_THINGS } from "../scene";
import { st, type AnswerSpec, type SolutionStep, type WrittenProblem } from "./problem";
import type { QuestionScene } from "../scene";

export type NumberSenseStageId = "1.7.1" | "1.7.2" | "1.7.3" | "1.7.4" | "1.8.1" | "1.8.4" | "1.10.1" | "2.20.1";

interface Spec {
  promptKey: string;
  promptVars?: Record<string, string | number>;
  display?: string;
  answer: number;
  steps: SolutionStep[];
  scene?: QuestionScene;
  unit?: string;
  /** Just the answer: these are the slips offered beside it. */
  slips?: number[];
}

/** The right answer and up to three slips, all different and not below 0, shuffled. */
function quickChoices(rng: Rng, right: number, slips: readonly number[]): number[] {
  const wrong: number[] = [];
  for (const n of slips) if (wrong.length < 3 && n >= 0 && n !== right && !wrong.includes(n)) wrong.push(n);
  for (let k = 1; wrong.length < 3; k++) for (const n of [right + k, right - k]) if (wrong.length < 3 && n >= 0 && !wrong.includes(n)) wrong.push(n);
  const all = [right, ...wrong];
  for (let i = all.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

function make(stageId: NumberSenseStageId, rng: Rng, s: Spec): WrittenProblem {
  const answer: AnswerSpec = { kind: "value", value: s.answer };
  return {
    stageId,
    kind: "expression",
    promptKey: s.promptKey,
    promptVars: s.promptVars,
    display: s.display ?? "",
    answer,
    tipKey: `numsense.tip.${stageId}`,
    firstStep: s.steps[0].line,
    solution: s.steps.map((x) => x.line),
    steps: s.steps,
    ...(s.scene ? { scene: s.scene } : {}),
    ...(s.unit ? { unit: s.unit } : {}),
    ...(s.slips ? { answerOnly: { choices: quickChoices(rng, s.answer, s.slips) } } : {}),
  };
}

const BOX = "\\square";

/** 1.7.1: what makes 10 - 7 + □ = 10. */
function tenBonds(rng: Rng): WrittenProblem {
  const a = randInt(rng, 1, 9);
  const b = 10 - a;
  return make("1.7.1", rng, {
    promptKey: "numsense.prompt.missing",
    display: rng() < 0.7 ? `${a} + ${BOX} = 10` : `${BOX} + ${a} = 10`,
    answer: b,
    steps: [st("step.numsense.bond", `10 - ${a} = ${b}`, { a, total: 10 })],
    slips: [b + 1, b - 1, a, 10 + a],
  });
}

/** 1.7.2: over the ten - 8 + 5 is 8 + 2 + 3; 13 − 5 is 13 − 3 − 2. */
function withinTwenty(rng: Rng): WrittenProblem {
  const a = randInt(rng, 3, 9);
  const b = randInt(rng, 11 - a, 9); // the sum goes over 10
  const sum = a + b;
  if (rng() < 0.5) {
    const fill = 10 - a;
    return make("1.7.2", rng, {
      promptKey: "numsense.prompt.calc",
      display: `${a} + ${b}`,
      answer: sum,
      steps: [st("step.numsense.bridgeUp", `${a} + ${fill} + ${b - fill} = ${sum}`, { a, fill, rest: b - fill })],
      slips: [sum - 1, sum + 1, sum - 10, Math.abs(a - b)],
    });
  }
  const down = sum - 10;
  return make("1.7.2", rng, {
    promptKey: "numsense.prompt.calc",
    display: `${sum} - ${b}`,
    answer: a,
    steps: [st("step.numsense.bridgeDown", `${sum} - ${down} - ${b - down} = ${a}`, { c: sum, down, rest: b - down })],
    slips: [a + 1, a - 1, a + 10, sum + b],
  });
}

/** 1.7.3: doubling (23 → 46) and halving (70 → 35). */
function doublesHalves(rng: Rng): WrittenProblem {
  if (rng() < 0.5) {
    const n = rng() < 0.5 ? randInt(rng, 2, 10) : randInt(rng, 11, 50);
    return make("1.7.3", rng, {
      promptKey: "numsense.prompt.double",
      promptVars: { n },
      answer: 2 * n,
      steps: [st("step.numsense.double", `${n} + ${n} = ${2 * n}`, { n })],
      slips: [2 * n + 1, 2 * n - 1, n + 2, n, 2 * n + 10],
    });
  }
  const m = 2 * (rng() < 0.5 ? randInt(rng, 2, 10) : randInt(rng, 11, 50));
  return make("1.7.3", rng, {
    promptKey: "numsense.prompt.half",
    promptVars: { n: m },
    answer: m / 2,
    steps: [st("step.numsense.half", `${m} / 2 = ${m / 2}`, { n: m })],
    slips: [m / 2 + 1, m / 2 - 1, m - 2, 2 * m, m / 2 + 5],
  });
}

/** 1.7.4: tens in the head - 40 + 30, 83 − 50, 46 + 30 - and what makes 100. */
function tensInHead(rng: Rng): WrittenProblem {
  const kind = pick(rng, ["tensAdd", "tensSub", "mixedAdd", "mixedSub", "hundred"] as const);
  if (kind === "hundred") {
    const a = 5 * randInt(rng, 1, 19);
    return make("1.7.4", rng, {
      promptKey: "numsense.prompt.missing",
      display: `${a} + ${BOX} = 100`,
      answer: 100 - a,
      steps: [st("step.numsense.bond", `100 - ${a} = ${100 - a}`, { a, total: 100 })],
      slips: [110 - a, 90 - a, a, 100 + a],
    });
  }
  const tens = (lo: number, hi: number) => 10 * randInt(rng, lo, hi);
  const ones = kind.startsWith("mixed") ? randInt(rng, 1, 9) : 0;
  if (kind === "tensAdd" || kind === "mixedAdd") {
    const a = tens(1, 6) + ones;
    const b = tens(1, 9 - Math.floor(a / 10));
    return make("1.7.4", rng, {
      promptKey: "numsense.prompt.calc",
      display: `${a} + ${b}`,
      answer: a + b,
      steps: [st(ones ? "step.numsense.tensOnly" : "step.numsense.tens", `${a} + ${b} = ${a + b}`, { a, b, t: b / 10 })],
      slips: [a + b + 10, a + b - 10, a + b / 10, a + b + 1],
    });
  }
  const a = tens(3, 9) + ones;
  const b = tens(1, Math.floor(a / 10) - 1);
  return make("1.7.4", rng, {
    promptKey: "numsense.prompt.calc",
    display: `${a} - ${b}`,
    answer: a - b,
    steps: [st(ones ? "step.numsense.tensOnly" : "step.numsense.tens", `${a} - ${b} = ${a - b}`, { a, b, t: b / 10 })],
    slips: [a - b + 10, a - b - 10, a - b / 10, a + b],
  });
}

/** 1.8.1: the number the arrow points at - counted on from the nearest numbered tick. */
function numberLine(rng: Rng): WrittenProblem {
  const [from, to, step, labelEvery] = pick(rng, [
    [0, 20, 1, 5],
    [0, 20, 1, 10],
    [0, 100, 10, 50],
    [0, 100, 5, 10],
    [0, 1000, 100, 500],
  ] as const);
  // Never on a numbered tick - then there'd be nothing to read.
  let arrow = from + step * randInt(rng, 1, (to - from) / step - 1);
  while (arrow % labelEvery === 0) arrow = from + step * randInt(rng, 1, (to - from) / step - 1);
  const below = Math.floor(arrow / labelEvery) * labelEvery;
  const above = below + labelEvery;
  const near = arrow - below <= above - arrow ? below : above;
  const k = Math.abs(arrow - near) / step;
  const line = near < arrow ? `${near} + ${k} \\cdot ${step} = ${arrow}` : `${near} - ${k} \\cdot ${step} = ${arrow}`;
  return make("1.8.1", rng, {
    promptKey: "numsense.prompt.numberLine",
    answer: arrow,
    scene: { kind: "numberLine", from, to, step, labelEvery, arrow },
    steps: [st(near < arrow ? "step.numsense.lineUp" : "step.numsense.lineDown", line, { near, k, step })],
    slips: [arrow + step, arrow - step, near + (near < arrow ? k : -k), arrow + 2 * step, arrow - 2 * step],
  });
}

/** 1.8.4: a pattern - 3, 6, 9, 12, □ - counting on (or back) by the same each time. */
function patterns(rng: Rng): WrittenProblem {
  const d = pick(rng, [2, 3, 4, 5, 10, -2, -5, -10]);
  const start = d > 0 ? randInt(rng, 0, 20) : randInt(rng, 5 * -d, 9 * -d);
  const terms = Array.from({ length: 5 }, (_, i) => start + i * d);
  const gap = rng() < 0.7 ? 4 : randInt(rng, 1, 3);
  const shown = terms.map((x, i) => (i === gap ? BOX : String(x))).join(" \\quad ");
  const before = terms[gap - 1];
  return make("1.8.4", rng, {
    promptKey: "numsense.prompt.pattern",
    display: shown,
    answer: terms[gap],
    steps: [st(d > 0 ? "step.numsense.patternUp" : "step.numsense.patternDown", d > 0 ? `${before} + ${d} = ${terms[gap]}` : `${before} - ${-d} = ${terms[gap]}`, { d: Math.abs(d) })],
    slips: [terms[gap] + d, terms[gap] - d, terms[gap] + 1, terms[gap] - 1],
  });
}

/** 1.10.1: how long it is - from 0 on the ruler, or from where it starts. */
function measureLength(rng: Rng): WrittenProblem {
  const cm = randInt(rng, 3, 12);
  const startCm = rng() < 0.6 ? 0 : randInt(rng, 1, 15 - cm);
  const end = startCm + cm;
  const thing = pick(rng, RULER_THINGS);
  return make("1.10.1", rng, {
    promptKey: "numsense.prompt.measure",
    promptVars: { thing: `@scene.ruler.${thing}` },
    answer: cm,
    unit: "cm",
    scene: { kind: "ruler", thing, startMm: startCm * 10, lengthMm: cm * 10 },
    steps: [st(startCm === 0 ? "step.numsense.rulerZero" : "step.numsense.rulerFrom", `${end} - ${startCm} = ${cm}`, { start: startCm, end })],
    slips: [end, cm + 1, cm - 1, cm * 10],
  });
}

/** 2.20.1: a sequence's rule, and the number far along it - the 10th: the first, and the step 9 times. */
function sequences(rng: Rng): WrittenProblem {
  const d = randInt(rng, 2, 9);
  const a = randInt(rng, 1, 20);
  const n = randInt(rng, 8, 20);
  const terms = Array.from({ length: 4 }, (_, i) => a + i * d);
  const answer = a + (n - 1) * d;
  return make("2.20.1", rng, {
    promptKey: "numsense.prompt.sequence",
    promptVars: { n },
    display: `${terms.join(" \\quad ")} \\quad \\dots`,
    answer,
    steps: [st("step.numsense.sequenceRule", `${a} + ${n - 1} \\cdot ${d} = ${answer}`, { a, d, n, steps: n - 1 })],
  });
}

export const NUMBER_SENSE_GENERATORS: Record<NumberSenseStageId, (rng: Rng) => WrittenProblem> = {
  "1.7.1": tenBonds,
  "1.7.2": withinTwenty,
  "1.7.3": doublesHalves,
  "1.7.4": tensInHead,
  "1.8.1": numberLine,
  "1.8.4": patterns,
  "1.10.1": measureLength,
  "2.20.1": sequences,
};
