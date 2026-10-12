/**
 * Geometry to recognise, as single-choice questions (åk 1-3):
 *
 *   1.2.3 former och kroppar - the plane figures and the solids, by name and by picture
 *   1.2.4 symmetri           - is the dashed line a line of symmetry?
 */
import { pick, randInt, shuffle, type Rng } from "../../rng";
import { PLANE_SHAPES, SOLIDS, type ShapeName } from "../scene";
import { fixedOptions, shuffledOptions, text, type ChoiceProblem, type Slip } from "./problem";

export type ShapeChoiceStageId = "1.2.3" | "1.2.4";

/** Shapes that are easily mixed up with each one - asked first among the wrong options. */
const LOOKALIKES: Record<ShapeName, ShapeName[]> = {
  circle: ["sphere", "pentagon", "hexagon"],
  triangle: ["pyramid", "cone", "square"],
  square: ["rectangle", "cube", "pentagon"],
  rectangle: ["square", "cuboid", "hexagon"],
  pentagon: ["hexagon", "triangle", "square"],
  hexagon: ["pentagon", "circle", "rectangle"],
  cube: ["square", "cuboid", "pyramid"],
  cuboid: ["rectangle", "cube", "cylinder"],
  sphere: ["circle", "cylinder", "cone"],
  cylinder: ["cone", "cuboid", "sphere"],
  cone: ["pyramid", "triangle", "cylinder"],
  pyramid: ["cone", "triangle", "cube"],
};

const isSolid = (s: ShapeName) => (SOLIDS as readonly string[]).includes(s);

/** 1.2.3: what's this called - or which picture is it. */
function shapes(rng: Rng): ChoiceProblem {
  const shape = pick(rng, rng() < 0.5 ? PLANE_SHAPES : SOLIDS);
  const others = [...LOOKALIKES[shape], ...shuffle(rng, [...PLANE_SHAPES, ...SOLIDS])].filter((s) => s !== shape);
  const kindOf = (s: ShapeName) => (isSolid(s) ? "solid" : "plane");
  const why = (s: ShapeName): Slip["why"] =>
    isSolid(s) !== isSolid(shape) ? text(`choice.shape.why.${kindOf(shape)}`) : text("choice.shape.why.same", { name: `@shape.${s}`, about: `@shape.about.${s}` });
  if (rng() < 0.6) {
    return {
      stageId: "1.2.3",
      kind: "choice",
      prompt: text("choice.shape.name"),
      scene: { kind: "shape", shape },
      ...shuffledOptions(
        rng,
        { text: text(`shape.${shape}`) },
        others.map((s) => ({ option: { text: text(`shape.${s}`) }, why: why(s) }))
      ),
      tip: text("choice.shape.tip"),
      explanation: text("choice.shape.explain", { name: `@shape.a.${shape}`, about: `@shape.about.${shape}` }),
    };
  }
  return {
    stageId: "1.2.3",
    kind: "choice",
    prompt: text("choice.shape.which", { name: `@shape.a.${shape}` }),
    ...shuffledOptions(
      rng,
      { scene: { kind: "shape", shape } },
      others.map((s) => ({ option: { scene: { kind: "shape", shape: s } }, why: text("choice.shape.whyPicture", { name: `@shape.a.${s}` }) }))
    ),
    tip: text("choice.shape.tip"),
    explanation: text("choice.shape.explain", { name: `@shape.a.${shape}`, about: `@shape.about.${shape}` }),
  };
}

/**
 * 1.2.4: a figure of squares on a grid and a dashed line through it - fold
 * along the line, and do the halves cover each other? Half the time they do
 * (the figure mirrored), half the time one square spoils it.
 */
function symmetry(rng: Rng): ChoiceProblem {
  const size = 6;
  const vertical = rng() < 0.6;
  // One half of the figure: squares in the columns left of the line (or rows above), touching it.
  const half = new Set<string>();
  const rows = randInt(rng, 3, 5);
  const top = randInt(rng, 0, size - rows);
  for (let r = top; r < top + rows; r++) {
    const width = randInt(rng, 1, 3);
    for (let c = 3 - width; c < 3; c++) half.add(`${c},${r}`);
  }
  // The other half: the mirror image - then, half the time, one square moved.
  const cells: [number, number][] = [];
  for (const key of half) {
    const [c, r] = key.split(",").map(Number);
    cells.push([c, r], [5 - c, r]);
  }
  const symmetric = rng() < 0.5;
  if (!symmetric) {
    // One mirrored square taken away - its mirror stays, so the halves no longer cover each other.
    const right = cells.filter(([c]) => c >= 3);
    const [rc, rr] = right[randInt(rng, 0, right.length - 1)];
    cells.splice(cells.findIndex(([c, r]) => c === rc && r === rr), 1);
    // Now and then a square added too, next to the figure where the mirror side is empty - so it isn't always one missing.
    const free: [number, number][] = [];
    for (let r = 0; r < size; r++)
      for (let c = 3; c < size; c++) {
        const taken = cells.some(([x, y]) => x === c && y === r);
        const touches = cells.some(([x, y]) => Math.abs(x - c) + Math.abs(y - r) === 1);
        if (!taken && touches && !half.has(`${5 - c},${r}`)) free.push([c, r]);
      }
    if (free.length > 0 && rng() < 0.5) cells.push(free[randInt(rng, 0, free.length - 1)]);
  }
  const shown: [number, number][] = vertical ? cells : cells.map(([c, r]) => [r, c]);
  return {
    stageId: "1.2.4",
    kind: "choice",
    prompt: text("choice.symmetry.prompt"),
    scene: { kind: "symmetry", size, cells: shown, line: vertical ? "vertical" : "horizontal", at: 3 },
    ...fixedOptions([{ text: text("choice.yes") }, { text: text("choice.no") }], symmetric ? 0 : 1, [text("choice.symmetry.whyYes"), text("choice.symmetry.whyNo")]),
    tip: text("choice.symmetry.tip"),
    explanation: text(symmetric ? "choice.symmetry.explainYes" : "choice.symmetry.explainNo"),
  };
}

export const SHAPE_CHOICES: Record<ShapeChoiceStageId, (rng: Rng) => ChoiceProblem> = {
  "1.2.3": shapes,
  "1.2.4": symmetry,
};
