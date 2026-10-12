/**
 * Measuring, as single-choice questions:
 *
 *   åk 1-3  1.10.2 väga: read the kitchen scale in grams; 1 500 g in kilograms
 *           1.10.3 litermått: read the jug in decilitres; how much more makes a litre
 *   åk 4-6  2.12.2 vinkeltyper: spetsig, rät, trubbig or rak - and about how big
 *           2.12.3 skala: a map in 1:1000, a drawing in 1:20, an ant enlarged 5:1
 *           2.12.4 gradskivan: read an angle - on the scale that starts at the first arm
 *           2.9.11 liter och kubikdecimeter: an aquarium 5 × 3 × 4 dm holds 60 l
 *
 * The slips are the usual ones: a tick read as 100 g when it's 50, the jug read
 * from the top, centimetres taken for metres, an enlargement multiplied.
 */
import { pick, randInt, shuffle, type Rng } from "../../rng";
import { tex } from "../written/problem";
import { fixedOptions, plainOption, shuffledOptions, text, textOption, type ChoiceProblem, type Slip } from "./problem";

export type MeasuringChoiceStageId = "1.10.2" | "1.10.3" | "2.12.2" | "2.12.3" | "2.12.4" | "2.9.11";

/** A measure as it's written: "350 g", "1,5 kg". */
const measure = (n: number, unit: string) => plainOption(`${tex(n).replace("{,}", ",")} ${unit}`);
const distinct = <T>(xs: T[]) => [...new Set(xs)];

/** 1.10.2: read the needle on a kitchen scale - and turn grams into kilograms. */
function weighing(rng: Rng): ChoiceProblem {
  // 0-1000 g with a tick every 100 or 50 g, or 0-2000 g with a tick every 100.
  const [max, step] = pick(rng, [[1000, 100], [1000, 50], [2000, 100]] as const);
  const grams = step * randInt(rng, 1, max / step - 1);
  const scene = { kind: "kitchenScale" as const, grams, max, step };
  if (grams >= 1000 && grams % 100 === 0 && rng() < 0.5) {
    const kg = grams / 1000;
    return {
      stageId: "1.10.2",
      kind: "choice",
      prompt: text("choice.weigh.inKg", { g: grams }),
      scene,
      ...shuffledOptions(rng, measure(kg, "kg"), [
        { option: measure(grams / 100, "kg"), why: text("choice.weigh.whyKg") },
        { option: measure(grams, "kg"), why: text("choice.weigh.whyKg") },
        ...(grams % 1000 !== 0 ? [{ option: measure(1 + (grams % 1000) / 10000, "kg"), why: text("choice.weigh.whyKg") }] : [{ option: measure(grams / 10, "kg"), why: text("choice.weigh.whyKg") }]),
      ]),
      tip: text("choice.weigh.tipKg"),
      explanation: text("choice.weigh.explainKg", { g: grams, kg: tex(kg).replace("{,}", ",") }),
    };
  }
  // A labelled number every 100 g (every 200 g on the big scale), the ticks between.
  const labelEvery = max === 2000 ? 200 : 100;
  const slips: Slip[] = distinct([grams + step, grams - step, grams + labelEvery, grams - labelEvery, grams + 2 * step, grams - 2 * step])
    .filter((g) => g > 0 && g < max && g !== grams)
    .map((g) => ({ option: measure(g, "g"), why: text("choice.weigh.whyTick", { step }) }));
  // Every tick taken for 100 g - on a scale in 50s, that's the slip.
  if (step === 50 && grams % 100 !== 0) slips.unshift({ option: measure(Math.floor(grams / 100) * 100 + 10 * ((grams % 100) / 50), "g"), why: text("choice.weigh.whyTick", { step }) });
  return {
    stageId: "1.10.2",
    kind: "choice",
    prompt: text("choice.weigh.read"),
    scene,
    ...shuffledOptions(rng, measure(grams, "g"), slips),
    tip: text("choice.weigh.tipRead", { step }),
    explanation: text("choice.weigh.explainRead", { g: grams, step }),
  };
}

/** 1.10.3: read the jug in decilitres; how much more makes a litre; more or less than half a litre. */
function jug(rng: Rng): ChoiceProblem {
  const dl = randInt(rng, 1, 9);
  const scene = { kind: "jug" as const, dl };
  const kind = rng();
  if (kind < 0.45) {
    return {
      stageId: "1.10.3",
      kind: "choice",
      prompt: text("choice.jug.read"),
      scene,
      ...shuffledOptions(rng, measure(dl, "dl"), [
        { option: measure(10 - dl, "dl"), why: text("choice.jug.whyFromTop") },
        ...[dl + 1, dl - 1].filter((n) => n >= 1 && n <= 10 && n !== 10 - dl).map((n) => ({ option: measure(n, "dl"), why: text("choice.jug.whyLine") })),
        { option: measure(dl, "l"), why: text("choice.jug.whyLitre") },
      ]),
      tip: text("choice.jug.tip"),
      explanation: text("choice.jug.explainRead", { n: dl }),
    };
  }
  if (kind < 0.8) {
    const more = 10 - dl;
    return {
      stageId: "1.10.3",
      kind: "choice",
      prompt: text("choice.jug.toLitre"),
      scene,
      ...shuffledOptions(rng, measure(more, "dl"), [
        ...(dl !== more ? [{ option: measure(dl, "dl"), why: text("choice.jug.whyHave", { n: dl }) }] : []),
        ...[more + 1, more - 1].filter((n) => n >= 1 && n !== dl).map((n) => ({ option: measure(n, "dl"), why: text("choice.jug.whyTen") })),
        { option: measure(100 - dl, "dl"), why: text("choice.jug.whyTen") },
      ]),
      tip: text("choice.jug.tipLitre"),
      explanation: text("choice.jug.explainLitre", { n: dl, m: more }),
    };
  }
  const correct = dl > 5 ? 0 : dl < 5 ? 1 : 2;
  return {
    stageId: "1.10.3",
    kind: "choice",
    prompt: text("choice.jug.half"),
    scene,
    ...fixedOptions([textOption("choice.jug.more"), textOption("choice.jug.less"), textOption("choice.jug.exactly")], correct, [
      text("choice.jug.whyHalf", { n: dl }),
      text("choice.jug.whyHalf", { n: dl }),
      text("choice.jug.whyHalf", { n: dl }),
    ]),
    tip: text("choice.jug.tipHalf"),
    explanation: text("choice.jug.explainHalf", { n: dl }),
  };
}

const ANGLE_KINDS = ["acute", "right", "obtuse", "straight"] as const;
const kindOf = (d: number) => (d < 90 ? "acute" : d === 90 ? "right" : d < 180 ? "obtuse" : "straight");

/** 2.12.2: what kind of angle - and about how big. */
function angleTypes(rng: Rng): ChoiceProblem {
  const kind = pick(rng, ["acute", "acute", "right", "obtuse", "obtuse", "straight"] as const);
  const degrees = kind === "acute" ? 5 * randInt(rng, 4, 16) : kind === "right" ? 90 : kind === "obtuse" ? 5 * randInt(rng, 20, 34) : 180;
  const scene = { kind: "angle" as const, degrees, turn: pick(rng, [0, 0, 15, 30, -20, 60]) };
  if (kind === "straight" || kind === "right" || rng() < 0.5) {
    return {
      stageId: "2.12.2",
      kind: "choice",
      prompt: text("choice.angle.kind"),
      scene,
      ...fixedOptions(
        ANGLE_KINDS.map((k) => textOption(`choice.angle.${k}`)),
        ANGLE_KINDS.indexOf(kind),
        ANGLE_KINDS.map((k) => text(`choice.angle.why.${k}`))
      ),
      tip: text("choice.angle.tip"),
      explanation: text(`choice.angle.explain.${kind}`, { d: degrees }),
    };
  }
  // About how big: the options 40° or more apart, one of them read from the wrong side.
  const deg = (d: number) => plainOption(`${d}°`);
  const slips: Slip[] = [{ option: deg(180 - degrees), why: text("choice.angle.whySide") }];
  for (const d of shuffle(rng, [20, 45, 90, 120, 150, 170])) if (Math.abs(d - degrees) >= 30 && Math.abs(d - (180 - degrees)) >= 20) slips.push({ option: deg(d), why: text(`choice.angle.whySize.${kindOf(d)}`) });
  return {
    stageId: "2.12.2",
    kind: "choice",
    prompt: text("choice.angle.size"),
    scene,
    ...shuffledOptions(rng, deg(degrees), slips),
    tip: text("choice.angle.tipSize"),
    explanation: text("choice.angle.explainSize", { d: degrees, kind: `@choice.angle.${kind}` }),
  };
}

/** 2.12.3: scale - a map, a drawing made smaller, a small animal drawn bigger. */
function scaleDrawings(rng: Rng): ChoiceProblem {
  const kind = rng();
  if (kind < 0.4) {
    // A map in 1:1000 - 3 cm on the map is 3 000 cm, which is 30 m.
    const s = pick(rng, [100, 1000, 10000]);
    const d = randInt(rng, 2, 9);
    const metres = (d * s) / 100;
    return {
      stageId: "2.12.3",
      kind: "choice",
      prompt: text("choice.scale.map", { s, d }),
      display: `1:${s}`,
      ...shuffledOptions(rng, measure(metres, "m"), [
        { option: measure(d * s, "m"), why: text("choice.scale.whyCm", { cm: d * s }) },
        { option: measure(metres / 10, "m"), why: text("choice.scale.whyZeros") },
        { option: measure(metres * 10, "m"), why: text("choice.scale.whyZeros") },
        { option: measure(d + s, "m"), why: text("choice.scale.whyAdd") },
      ]),
      tip: text("choice.scale.tipMap", { s }),
      explanation: text("choice.scale.explainMap", { s, d, cm: d * s, m: metres }),
    };
  }
  if (kind < 0.7) {
    // A drawing in 1:20 - 4 cm on the drawing is 80 cm.
    const k = pick(rng, [10, 20, 50]);
    const b = randInt(rng, 2, 9);
    return {
      stageId: "2.12.3",
      kind: "choice",
      prompt: text("choice.scale.drawing", { k, b }),
      display: `1:${k}`,
      ...shuffledOptions(rng, measure(b * k, "cm"), [
        { option: measure(b + k, "cm"), why: text("choice.scale.whyAdd") },
        { option: measure(b, "cm"), why: text("choice.scale.whySame") },
        { option: measure(b * k * 10, "cm"), why: text("choice.scale.whyZeros") },
      ]),
      tip: text("choice.scale.tipSmaller", { k }),
      explanation: text("choice.scale.explainDrawing", { k, b, r: b * k }),
    };
  }
  // A small animal drawn bigger, 5:1 - 15 cm in the picture is 3 cm in real life.
  const k = pick(rng, [2, 5, 10]);
  const real = randInt(rng, 1, k === 10 ? 2 : 4);
  const b = real * k;
  const animal = pick(rng, ["ant", "ladybug", "bee", "snail"]);
  return {
    stageId: "2.12.3",
    kind: "choice",
    prompt: text("choice.scale.bigger", { k, b, animal: `@choice.scale.animal.${animal}` }),
    display: `${k}:1`,
    ...shuffledOptions(rng, measure(real, "cm"), [
      { option: measure(b * k, "cm"), why: text("choice.scale.whyTimes", { k }) },
      ...(b - k > 0 && b - k !== real ? [{ option: measure(b - k, "cm"), why: text("choice.scale.whyAdd") }] : []),
      { option: measure(b, "cm"), why: text("choice.scale.whySame") },
      { option: measure(b + k, "cm"), why: text("choice.scale.whyAdd") },
    ]),
    tip: text("choice.scale.tipBigger", { k }),
    explanation: text("choice.scale.explainBigger", { k, b, r: real }),
  };
}

/** 2.12.4: read a protractor - the scale that starts at 0 on the first arm, not the other one. */
function readProtractor(rng: Rng): ChoiceProblem {
  const degrees = 5 * pick(rng, [4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 22, 23, 24, 25, 26, 27, 28, 30, 32]);
  const base = rng() < 0.5 ? "right" : "left";
  const deg = (d: number) => plainOption(`${d}°`);
  return {
    stageId: "2.12.4",
    kind: "choice",
    prompt: text("choice.protractor.prompt"),
    scene: { kind: "protractor", degrees, base },
    ...shuffledOptions(rng, deg(degrees), [
      { option: deg(180 - degrees), why: text("choice.protractor.whyScale") },
      { option: deg(degrees + 10), why: text("choice.protractor.whyTens") },
      { option: deg(degrees - 10), why: text("choice.protractor.whyTens") },
    ]),
    tip: text(base === "right" ? "choice.protractor.tipRight" : "choice.protractor.tipLeft"),
    explanation: text("choice.protractor.explain", { d: degrees, scale: `@construct.scale.${base === "right" ? "outer" : "inner"}` }),
  };
}

/** 2.9.11: litres and cubic decimetres - 1 dm³ is 1 l, so a box's volume in dm³ is what it holds in litres. */
function litres(rng: Rng): ChoiceProblem {
  const inCm = rng() < 0.35;
  const [l, w, h] = inCm ? [10 * randInt(rng, 2, 6), 10 * randInt(rng, 1, 3), 10 * randInt(rng, 1, 3)] : [randInt(rng, 3, 8), randInt(rng, 2, 5), randInt(rng, 2, 5)];
  const dm3 = inCm ? (l * w * h) / 1000 : l * w * h;
  const litre = (n: number) => measure(n, "l");
  return {
    stageId: "2.9.11",
    kind: "choice",
    prompt: text("choice.litres.prompt"),
    scene: { kind: "cuboid", l, w, h, unit: inCm ? "cm" : "dm" },
    ...shuffledOptions(rng, litre(dm3), [
      ...(inCm ? [{ option: litre(dm3 * 1000), why: text("choice.litres.whyCm") }, { option: litre(dm3 * 10), why: text("choice.litres.whyCm") }] : []),
      { option: litre(inCm ? (l + w + h) / 10 : l + w + h), why: text("choice.litres.whyAdd") },
      { option: litre(inCm ? (l * w) / 100 : l * w), why: text("choice.litres.whyBase") },
      { option: litre(inCm ? (2 * (l * w + l * h + w * h)) / 100 : 2 * (l * w + l * h + w * h)), why: text("choice.litres.whySurface") },
    ]),
    tip: text(inCm ? "choice.litres.tipCm" : "choice.litres.tip"),
    explanation: text(inCm ? "choice.litres.explainCm" : "choice.litres.explain", { l, w, h, v: tex(dm3).replace("{,}", ","), lw: l / 10, ww: w / 10, hw: h / 10 }),
  };
}

export const MEASURING_CHOICES: Record<MeasuringChoiceStageId, (rng: Rng) => ChoiceProblem> = {
  "2.12.4": readProtractor,
  "2.9.11": litres,
  "1.10.2": weighing,
  "1.10.3": jug,
  "2.12.2": angleTypes,
  "2.12.3": scaleDrawings,
};
