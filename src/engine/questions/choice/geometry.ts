/**
 * Geometry in åk 7-9, as single-choice questions with a figure:
 *
 *   3.4.9  likformighet: the side x in the bigger of two similar triangles
 *   3.4.10 vinklar: vertikalvinklar are equal, sidovinklar make 180°
 *   3.4.11 begränsningsarea: the area of all a box's sides
 *
 * The slips: the difference added instead of the scale multiplied, the
 * neighbouring angle for the opposite one, the volume for the area, each side
 * counted once.
 */
import { pick, randInt, shuffle, type Rng } from "../../rng";
import { tex } from "../written/problem";
import { plainOption, shuffledOptions, text, type ChoiceProblem, type Slip } from "./problem";

export type GeometryChoiceStageId = "3.4.9" | "3.4.10" | "3.4.11";

const cm = (n: number, unit = "cm") => plainOption(`${tex(n).replace("{,}", ",")} ${unit}`);

/** Triangles that can be drawn - each side shorter than the other two together. */
const TRIANGLES: [number, number, number][] = [
  [3, 4, 5],
  [4, 5, 6],
  [4, 6, 7],
  [5, 6, 8],
  [6, 8, 9],
  [4, 7, 8],
  [3, 5, 6],
];

/** 3.4.9: similar triangles - the big one k times the small; x from the scale, not from the difference. */
function similarity(rng: Rng): ChoiceProblem {
  const sides = pick(rng, TRIANGLES);
  const k = pick(rng, [2, 3, 1.5, 2.5]);
  // With 1,5 and 2,5 the small sides are even, so the big ones are whole.
  const s = (k * 2) % 2 === 0 ? sides : (sides.map((x) => x * 2) as [number, number, number]);
  const [known, asked] = shuffle(rng, [0, 1, 2]).slice(0, 2);
  const small = s.map((x) => x as number | "x" | null);
  const big = s.map((x, i) => (i === known ? x * k : i === asked ? "x" : null));
  const right = s[asked] * k;
  const diff = s[known] * k - s[known];
  const slips: Slip[] = [
    { option: cm(s[asked] + diff), why: text("choice.similar.whyAdd", { d: tex(diff).replace("{,}", ",") }) },
    { option: cm(s[known] * k), why: text("choice.similar.whySide") },
    { option: cm(s[asked] / k), why: text("choice.similar.whySmaller") },
  ];
  return {
    stageId: "3.4.9",
    kind: "choice",
    prompt: text("choice.similar.prompt"),
    scene: { kind: "similar", sides: s, k, small, big },
    ...shuffledOptions(rng, cm(right), slips),
    tip: text("choice.similar.tip"),
    explanation: text("choice.similar.explain", { a: s[known], b: tex(s[known] * k).replace("{,}", ","), k: tex(k).replace("{,}", ","), c: s[asked], x: tex(right).replace("{,}", ",") }),
  };
}

/** 3.4.10: two lines crossing - the angle opposite is the same, the one beside makes 180° with it. */
function crossingAngles(rng: Rng): ChoiceProblem {
  const degrees = 5 * randInt(rng, 6, 30);
  const a = degrees === 90 ? 85 : degrees;
  const given = randInt(rng, 0, 3);
  const asked = (given + randInt(rng, 1, 3)) % 4;
  const opposite = (asked - given + 4) % 2 === 0;
  // The angles in turn round the crossing: a, 180 - a, a, 180 - a.
  const valueAt = (i: number) => (i % 2 === 0 ? a : 180 - a);
  const deg = (n: number) => plainOption(`${n}°`);
  const v = valueAt(asked);
  const g = valueAt(given);
  const slips: Slip[] = [
    { option: deg(180 - v), why: text(opposite ? "choice.crossing.whyOpposite" : "choice.crossing.whyBeside") },
    { option: deg(360 - g), why: text("choice.crossing.whyFull") },
  ];
  if (g < 90) slips.push({ option: deg(90 - g), why: text("choice.crossing.whyRight") });
  slips.push({ option: deg(360 - 2 * g), why: text("choice.crossing.whyFull") });
  return {
    stageId: "3.4.10",
    kind: "choice",
    prompt: text("choice.crossing.prompt"),
    scene: { kind: "crossing", degrees: a, given, asked },
    ...shuffledOptions(rng, deg(v), slips),
    tip: text("choice.crossing.tip"),
    explanation: text(opposite ? "choice.crossing.explainOpposite" : "choice.crossing.explainBeside", { g, v }),
  };
}

/** 3.4.11: the surface area of a box - every side twice - or of a cube. */
function surfaceArea(rng: Rng): ChoiceProblem {
  const unit = pick(rng, ["cm", "dm", "m"]);
  const area = (n: number) => cm(n, `${unit}²`);
  if (rng() < 0.3) {
    const s = randInt(rng, 2, 9);
    return {
      stageId: "3.4.11",
      kind: "choice",
      prompt: text("choice.surface.cube"),
      scene: { kind: "cuboid", l: s, w: s, h: s, unit },
      ...shuffledOptions(rng, area(6 * s * s), [
        { option: cm(s ** 3, `${unit}³`), why: text("choice.surface.whyVolume") },
        { option: area(4 * s * s), why: text("choice.surface.whyFour") },
        { option: area(6 * s), why: text("choice.surface.whyArea") },
        { option: area(s * s), why: text("choice.surface.whyOne") },
      ]),
      tip: text("choice.surface.tipCube"),
      explanation: text("choice.surface.explainCube", { s, a: s * s, r: 6 * s * s, u: unit }),
    };
  }
  const [l, w, h] = shuffle(rng, [2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 3);
  const faces = l * w + l * h + w * h;
  return {
    stageId: "3.4.11",
    kind: "choice",
    prompt: text("choice.surface.box"),
    scene: { kind: "cuboid", l, w, h, unit },
    ...shuffledOptions(rng, area(2 * faces), [
      { option: area(faces), why: text("choice.surface.whyTwice") },
      { option: cm(l * w * h, `${unit}³`), why: text("choice.surface.whyVolume") },
      { option: area(6 * l * w), why: text("choice.surface.whySame") },
      { option: area(2 * (l + w + h)), why: text("choice.surface.whyArea") },
    ]),
    tip: text("choice.surface.tip"),
    explanation: text("choice.surface.explain", { a: l * w, b: l * h, c: w * h, s: faces, r: 2 * faces, u: unit }),
  };
}

export const GEOMETRY_CHOICES: Record<GeometryChoiceStageId, (rng: Rng) => ChoiceProblem> = {
  "3.4.9": similarity,
  "3.4.10": crossingAngles,
  "3.4.11": surfaceArea,
};
