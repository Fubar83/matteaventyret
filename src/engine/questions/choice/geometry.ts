/**
 * Geometry in åk 7-9, as single-choice questions with a figure:
 *
 *   3.4.9  likformighet: the side x in the bigger of two similar triangles
 *   3.4.10 vinklar: vertikalvinklar are equal, sidovinklar make 180°
 *   3.4.11 begränsningsarea: the area of all a box's sides
 *   3.4.15 kongruens: the triangle with the same three sides, turned or mirrored
 *
 * And in åk 4-6:
 *   2.4.7  area på rutat papper: a triangle or parallelogram - half the rectangle round it
 *   2.4.8  kubens nät: which net folds into a cube (no 2 × 2 block, no six in a row)
 *
 * The slips: the difference added instead of the scale multiplied, the
 * neighbouring angle for the opposite one, the volume for the area, each side
 * counted once.
 */
import { pick, randInt, shuffle, type Rng } from "../../rng";
import { tex } from "../written/problem";
import type { QuestionScene } from "../scene";
import { numberOption, plainOption, shuffledOptions, text, type ChoiceOption, type ChoiceProblem, type Slip } from "./problem";

export type GeometryChoiceStageId = "3.4.9" | "3.4.10" | "3.4.11" | "3.4.15" | "2.4.7" | "2.4.8";

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

/** 3.4.15: congruent triangles - the same three sides, however turned or mirrored. */
function congruence(rng: Rng): ChoiceProblem {
  const sides = pick(rng, TRIANGLES);
  const tri = (s: [number, number, number], turn: number, flip: boolean): ChoiceOption => ({ scene: { kind: "triangle", sides: s, turn, flip } satisfies QuestionScene });
  // The same triangle drawn from another side, turned, maybe mirrored.
  const [a, b, c] = sides;
  const again = pick(rng, [[b, c, a], [c, a, b], [a, b, c]] as [number, number, number][]);
  const turn = () => pick(rng, [0, 30, 60, 90, 150, 200, 270]);
  return {
    stageId: "3.4.15",
    kind: "choice",
    prompt: text("choice.congruent.prompt"),
    scene: { kind: "triangle", sides, turn: 0, flip: false },
    ...shuffledOptions(rng, tri(again, turn(), rng() < 0.5), [
      { option: tri(sides.map((s) => s * 2) as [number, number, number], turn(), false), why: text("choice.congruent.whySimilar") },
      { option: tri([a, b, c + 1], turn(), rng() < 0.5), why: text("choice.congruent.whyOneSide") },
      { option: tri([a + 1, b, c], turn(), false), why: text("choice.congruent.whyOneSide") },
    ]),
    tip: text("choice.congruent.tip"),
    explanation: text("choice.congruent.explain", { a, b, c }),
  };
}

/** Twice a polygon's area on grid points (the shoelace formula) - whole, so halves stay exact. */
const twiceArea = (pts: [number, number][]) => Math.abs(pts.reduce((s, [x, y], i) => s + x * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * y, 0));

/** 2.4.7: area on squared paper - a triangle is half the rectangle (or parallelogram) round it. */
function areaOnPaper(rng: Rng): ChoiceProblem {
  const kind = pick(rng, ["right", "triangle", "parallelogram"] as const);
  const b = randInt(rng, 3, 7);
  const h = randInt(rng, 2, 5);
  const s = randInt(rng, 1, 3);
  const points: [number, number][] =
    kind === "right"
      ? [[1, 1 + h], [1 + b, 1 + h], [1, 1]]
      : kind === "triangle"
        ? [[1, 1 + h], [1 + b, 1 + h], [1 + randInt(rng, 0, b), 1]]
        : [[1, 1 + h], [1 + b, 1 + h], [1 + b + s, 1], [1 + s, 1]];
  const area = twiceArea(points) / 2;
  const w = Math.max(...points.map((p) => p[0])) + 1;
  const slips: Slip[] =
    kind === "parallelogram"
      ? [
          { option: numberOption(area / 2), why: text("choice.paper.whyHalfParallelogram") },
          { option: numberOption((b + s) * h), why: text("choice.paper.whyBox") },
          { option: numberOption(area + h), why: text("choice.paper.whyCount") },
        ]
      : [
          { option: numberOption(b * h), why: text("choice.paper.whyWhole") },
          { option: numberOption(area + 1), why: text("choice.paper.whyCount") },
          { option: numberOption(b + h), why: text("choice.paper.whyAdd") },
        ];
  return {
    stageId: "2.4.7",
    kind: "choice",
    prompt: text("choice.paper.prompt"),
    scene: { kind: "gridShape", w, h: h + 2, points },
    ...shuffledOptions(rng, numberOption(area), slips),
    tip: text(kind === "parallelogram" ? "choice.paper.tipParallelogram" : "choice.paper.tipTriangle"),
    explanation: text(kind === "parallelogram" ? "choice.paper.explainParallelogram" : "choice.paper.explainTriangle", { b, h, a: tex(area).replace("{,}", ",") }),
  };
}

/** The eleven nets of a cube. */
const CUBE_NETS: [number, number][][] = [
  ...[[0, 0], [0, 1], [0, 2], [0, 3], [1, 1], [1, 2]].map(([i, j]) => [[0, 1], [1, 1], [2, 1], [3, 1], [i, 0], [j, 2]] as [number, number][]),
  ...[1, 2, 3].map((j) => [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [j, 2]] as [number, number][]),
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]],
];
/** Six squares that don't fold into a cube: a 2 × 3 block, six in a row, five in a row, ones with a 2 × 2 block. */
const NOT_NETS: [number, number][][] = [
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [2, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [3, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [2, 2]],
];

/** 2.4.8: which net folds into a cube - or which doesn't. */
function cubeNets(rng: Rng): ChoiceProblem {
  const net = (cells: [number, number][]): ChoiceOption => ({ scene: { kind: "net", cells } satisfies QuestionScene });
  const whyNot = (cells: [number, number][]) => (cells.length === 6 && cells.every(([, r]) => r === 0) ? "choice.net.whyRow" : cells.some(([c, r]) => [[c + 1, r], [c, r + 1], [c + 1, r + 1]].every(([x, y]) => cells.some(([p, q]) => p === x && q === y))) ? "choice.net.whyBlock" : "choice.net.whyFive");
  if (rng() < 0.6) {
    return {
      stageId: "2.4.8",
      kind: "choice",
      prompt: text("choice.net.which"),
      scene: { kind: "shape", shape: "cube" },
      ...shuffledOptions(
        rng,
        net(pick(rng, CUBE_NETS)),
        shuffle(rng, NOT_NETS)
          .slice(0, 3)
          .map((c) => ({ option: net(c), why: text(whyNot(c)) }))
      ),
      tip: text("choice.net.tip"),
      explanation: text("choice.net.explain"),
    };
  }
  const bad = pick(rng, NOT_NETS);
  return {
    stageId: "2.4.8",
    kind: "choice",
    prompt: text("choice.net.whichNot"),
    scene: { kind: "shape", shape: "cube" },
    ...shuffledOptions(
      rng,
      net(bad),
      shuffle(rng, CUBE_NETS)
        .slice(0, 3)
        .map((c) => ({ option: net(c), why: text("choice.net.whyFolds") }))
    ),
    tip: text("choice.net.tip"),
    explanation: text(whyNot(bad)),
  };
}

export const GEOMETRY_CHOICES: Record<GeometryChoiceStageId, (rng: Rng) => ChoiceProblem> = {
  "3.4.9": similarity,
  "3.4.10": crossingAngles,
  "3.4.11": surfaceArea,
  "3.4.15": congruence,
  "2.4.7": areaOnPaper,
  "2.4.8": cubeNets,
};
