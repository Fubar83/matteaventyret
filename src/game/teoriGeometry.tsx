/**
 * Theory for the geometry stages (engine/geometry.ts): the same figures the
 * questions show, with one worked example each, the usual mistake, and a
 * quick "Testa själv".
 */
import type { Figure, Point } from "../engine/geometry";
import { GeometryFigure } from "./GeometryFigure";
import type { TeoriSlide } from "./teoriContent";
import { planGuided } from "../mathinput/guidedPlan";
import { big, check, concept, crossed, mistake, step } from "./teoriAdvanced";
import { PlanFigure } from "./TrappanFigure";

export type GeometryTopic =
  | "perimeter"
  | "rectangleArea"
  | "triangleArea"
  | "parallelogram"
  | "compositeBasic"
  | "circle"
  | "trapezoid"
  | "compositeCircle"
  | "inverseArea"
  | "sector"
  | "areaSine";

const k = (topic: GeometryTopic, n: number) => `teori.geo.${topic}.${n}`;
const fig = (figure: Figure) => <GeometryFigure figure={figure} maxWidth={280} maxHeight={190} />;

const rect = (w: number, h: number): Point[] => [
  [0, 0],
  [w, 0],
  [w, h],
  [0, h],
];

const RECT_5_3: Figure = {
  shapes: [{ kind: "polygon", points: rect(5, 3), fill: "asked" }],
  labels: [
    { text: "5 cm", at: [2.5, 3], place: "below" },
    { text: "3 cm", at: [0, 1.5], place: "left" },
  ],
};

const TRIANGLE_6_4: Figure = {
  shapes: [
    { kind: "polygon", points: rect(6, 4), fill: "cut" },
    { kind: "polygon", points: [[0, 4], [6, 4], [2, 0]], fill: "asked" },
    { kind: "segment", from: [2, 0], to: [2, 4], dashed: true },
  ],
  labels: [
    { text: "6 cm", at: [3, 4], place: "below" },
    { text: "4 cm", at: [2, 2], place: "right" },
  ],
};

const PARALLELOGRAM: Figure = {
  shapes: [
    { kind: "polygon", points: [[0, 4], [7, 4], [9, 0], [2, 0]], fill: "asked" },
    { kind: "segment", from: [2, 0], to: [2, 4], dashed: true },
    { kind: "rightAngle", at: [2, 4], a: [7, 4], b: [2, 0] },
  ],
  labels: [
    { text: "7 cm", at: [3.5, 4], place: "below" },
    { text: "4 cm", at: [2, 2], place: "right" },
    { text: "4,5 cm", at: [1, 2], place: "left" },
  ],
};

const L_SHAPE: Figure = {
  shapes: [
    { kind: "polygon", points: rect(3, 2).map(([x, y]) => [x + 5, y] as Point), fill: "cut" },
    { kind: "polygon", points: [[0, 0], [5, 0], [5, 2], [8, 2], [8, 5], [0, 5]], fill: "asked" },
  ],
  labels: [
    { text: "8 cm", at: [4, 5], place: "below" },
    { text: "5 cm", at: [0, 2.5], place: "left" },
    { text: "3 cm", at: [6.5, 0], place: "above" },
    { text: "2 cm", at: [8, 1], place: "right" },
  ],
};

const CIRCLE_R3: Figure = {
  shapes: [
    { kind: "circle", center: [3, 3], r: 3, fill: "asked" },
    { kind: "segment", from: [3, 3], to: [6, 3] },
  ],
  labels: [{ text: "r = 3 cm", at: [4.5, 3], place: "above" }],
};

const TRAPEZOID: Figure = {
  shapes: [
    { kind: "polygon", points: [[0, 4], [10, 4], [7, 0], [2, 0]], fill: "asked" },
    { kind: "segment", from: [2, 0], to: [2, 4], dashed: true },
    { kind: "rightAngle", at: [2, 4], a: [10, 4], b: [2, 0] },
  ],
  labels: [
    { text: "10 cm", at: [5, 4], place: "below" },
    { text: "5 cm", at: [4.5, 0], place: "above" },
    { text: "4 cm", at: [2, 2], place: "right" },
  ],
};

const SQUARE_HOLE: Figure = {
  shapes: [
    { kind: "polygon", points: rect(6, 6), fill: "asked" },
    { kind: "circle", center: [3, 3], r: 3, fill: "cut" },
  ],
  labels: [{ text: "6 cm", at: [3, 6], place: "below" }],
};

const INVERSE_RECT: Figure = {
  shapes: [{ kind: "polygon", points: rect(6, 4), fill: "asked" }],
  labels: [
    { text: "6 cm", at: [3, 4], place: "below" },
    { text: "?", at: [0, 2], place: "left" },
    { text: "24 cm²", at: [3, 2], place: "center" },
  ],
};

const SECTOR_90: Figure = {
  shapes: [
    { kind: "circle", center: [4, 4], r: 4, fill: "plain" },
    { kind: "sector", center: [4, 4], r: 4, from: 0, to: 90, fill: "asked" },
    { kind: "angle", at: [4, 4], a: [8, 4], b: [4, 0] },
  ],
  labels: [
    { text: "4 cm", at: [6, 4], place: "below" },
    { text: "90°", at: [4, 4], place: "left" },
  ],
};

const AREA_SINE: Figure = {
  shapes: [
    { kind: "polygon", points: [[0, 0], [8, 0], [5 * Math.cos(Math.PI / 6), -5 * Math.sin(Math.PI / 6)]], fill: "asked" },
    { kind: "angle", at: [0, 0], a: [8, 0], b: [5 * Math.cos(Math.PI / 6), -5 * Math.sin(Math.PI / 6)] },
  ],
  labels: [
    { text: "8 cm", at: [4, 0], place: "below" },
    { text: "5 cm", at: [2.2, -1.25], place: "left" },
    { text: "30°", at: [0, 0], place: "right" },
  ],
};

export const GEOMETRY_TEORI: Record<GeometryTopic, TeoriSlide[]> = {
  perimeter: [
    concept(k("perimeter", 1), () =>
      fig({
        shapes: [{ kind: "polygon", points: rect(5, 3), fill: "plain" }],
        labels: [
          { text: "5 cm", at: [2.5, 0], place: "above" },
          { text: "3 cm", at: [5, 1.5], place: "right" },
          { text: "5 cm", at: [2.5, 3], place: "below" },
          { text: "3 cm", at: [0, 1.5], place: "left" },
        ],
      })
    ),
    step(k("perimeter", 2), () => big("5 + 3 + 5 + 3 = 16")),
    step(k("perimeter", 3), () => big("4 + 5 + 6 = 15")),
    mistake(k("perimeter", 4), () => crossed("5 + 3 = 8")),
    check(k("perimeter", 5), () => big("2 + 2 + 2 + 2"), ["8", "4", "6"], 0),
  ],
  rectangleArea: [
    concept(k("rectangleArea", 1), () => fig(RECT_5_3)),
    step(k("rectangleArea", 2), () => big("A = b \\cdot h = 5 \\cdot 3 = 15\\ \\text{cm}^{2}")),
    step(k("rectangleArea", 3), () => big("A = s \\cdot s = 4 \\cdot 4 = 16\\ \\text{cm}^{2}")),
    mistake(k("rectangleArea", 4), () => crossed("5 + 3 + 5 + 3 = 16\\ \\text{cm}^{2}")),
    check(k("rectangleArea", 5), () => big("b = 6,\\; h = 2"), ["12 cm²", "16 cm²", "8 cm²"], 0),
  ],
  triangleArea: [
    concept(k("triangleArea", 1), () => fig(TRIANGLE_6_4)),
    step(k("triangleArea", 2), () => big("A = \\frac{b \\cdot h}{2}")),
    step(k("triangleArea", 3), () => big("A = \\frac{6 \\cdot 4}{2} = \\frac{24}{2} = 12\\ \\text{cm}^{2}")),
    mistake(k("triangleArea", 4), () => crossed("A = 6 \\cdot 4 = 24")),
    check(k("triangleArea", 5), () => big("b = 10,\\; h = 3"), ["15 cm²", "30 cm²", "13 cm²"], 0),
  ],
  parallelogram: [
    concept(k("parallelogram", 1), () => fig(PARALLELOGRAM)),
    step(k("parallelogram", 2), () => big("A = b \\cdot h = 7 \\cdot 4 = 28\\ \\text{cm}^{2}")),
    step(k("parallelogram", 3), () =>
      fig({
        shapes: [
          { kind: "polygon", points: rect(7, 4).map(([x, y]) => [x + 2, y] as Point), fill: "asked" },
          { kind: "polygon", points: [[0, 4], [2, 4], [2, 0]], fill: "cut" },
        ],
        labels: [
          { text: "7 cm", at: [5.5, 4], place: "below" },
          { text: "4 cm", at: [9, 2], place: "right" },
        ],
      })
    ),
    mistake(k("parallelogram", 4), () => crossed("A = 7 \\cdot 4{,}5")),
    check(k("parallelogram", 5), () => big("b = 9,\\; h = 5"), ["45 cm²", "22,5 cm²", "14 cm²"], 0),
  ],
  compositeBasic: [
    concept(k("compositeBasic", 1), () => fig(L_SHAPE)),
    step(k("compositeBasic", 2), () => big("8 \\cdot 5 = 40 \\qquad 3 \\cdot 2 = 6")),
    step(k("compositeBasic", 3), () => big("40 - 6 = 34\\ \\text{cm}^{2}")),
    mistake(k("compositeBasic", 4), () => crossed("40 + 6 = 46")),
    check(k("compositeBasic", 5), () => big("10 \\cdot 4 - \\frac{4 \\cdot 2}{2}"), ["36", "32", "44"], 0),
  ],
  circle: [
    concept(k("circle", 1), () => fig(CIRCLE_R3)),
    step(k("circle", 2), () => big("d = 2r \\qquad O = \\pi \\cdot d \\qquad A = \\pi r^{2}")),
    step(k("circle", 3), () => big("A = \\pi \\cdot 3^{2} = \\pi \\cdot 9 \\approx 3{,}14 \\cdot 9")),
    // 3,14 · 9 the way it's done by hand: 314 · 9 in a column, then the two decimals back.
    step("teori.geo.circle.column", () => <PlanFigure plan={planGuided("×", 314, 9)} maxWidth={200} />),
    step("teori.geo.circle.decimals", () => big("3{,}14 \\cdot 9 = 28{,}26 \\approx 28{,}3\\ \\text{cm}^{2}")),
    mistake(k("circle", 4), () => crossed("A = \\pi \\cdot 6^{2}")),
    check(k("circle", 5), () => big("r = 5 \\quad O = ?"), ["≈ 31,4 cm", "≈ 78,5 cm", "≈ 15,7 cm"], 0),
  ],
  trapezoid: [
    concept(k("trapezoid", 1), () => fig(TRAPEZOID)),
    step(k("trapezoid", 2), () => big("A = \\frac{(a + b) \\cdot h}{2}")),
    step(k("trapezoid", 3), () => big("A = \\frac{(5 + 10) \\cdot 4}{2} = \\frac{60}{2} = 30\\ \\text{cm}^{2}")),
    mistake(k("trapezoid", 4), () => crossed("A = 5 \\cdot 10 \\cdot 4")),
    check(k("trapezoid", 5), () => big("a = 2,\\; b = 6,\\; h = 5"), ["20", "40", "60"], 0),
  ],
  compositeCircle: [
    concept(k("compositeCircle", 1), () => fig(SQUARE_HOLE)),
    step(k("compositeCircle", 2), () => big("6 \\cdot 6 = 36 \\qquad 3{,}14 \\cdot 3^{2} = 3{,}14 \\cdot 9 = 28{,}26")),
    step(k("compositeCircle", 3), () => big("36 - 28{,}26 = 7{,}74 \\approx 7{,}7\\ \\text{cm}^{2}")),
    mistake(k("compositeCircle", 4), () => crossed("r = 6")),
    check(k("compositeCircle", 5), () => big("\\text{halvcirkel},\\; r = 2"), ["≈ 6,3", "≈ 12,6", "≈ 3,1"], 0),
  ],
  inverseArea: [
    concept(k("inverseArea", 1), () => fig(INVERSE_RECT)),
    step(k("inverseArea", 2), () => big("6 \\cdot h = 24 \\qquad h = \\frac{24}{6} = 4\\ \\text{cm}")),
    step(k("inverseArea", 3), () => big("s^{2} = 49 \\qquad s = \\sqrt{49} = 7")),
    mistake(k("inverseArea", 4), () => crossed("h = 24 \\cdot 6")),
    check(k("inverseArea", 5), () => big("\\frac{8 \\cdot h}{2} = 20"), ["5", "10", "2,5"], 0),
  ],
  sector: [
    concept(k("sector", 1), () => fig(SECTOR_90)),
    step(k("sector", 2), () => big("A = \\frac{v}{360} \\cdot \\pi r^{2} \\qquad b = \\frac{v}{360} \\cdot 2 \\pi r")),
    step(k("sector", 3), () => big("\\frac{90}{360} = \\frac{1}{4} \\qquad 3{,}14 \\cdot 4^{2} = 3{,}14 \\cdot 16 = 50{,}24 \\qquad \\frac{50{,}24}{4} = 12{,}56 \\approx 12{,}6")),
    mistake(k("sector", 4), () => crossed("A = \\frac{90}{100} \\cdot \\pi r^{2}")),
    check(k("sector", 5), () => big("v = 180^{\\circ}"), ["en halv cirkel", "en fjärdedel", "hela cirkeln"], 0),
  ],
  areaSine: [
    concept(k("areaSine", 1), () => fig(AREA_SINE)),
    step(k("areaSine", 2), () => big("T = \\frac{a \\cdot b \\cdot \\sin C}{2}")),
    step(k("areaSine", 3), () => big("T = \\frac{8 \\cdot 5 \\cdot \\sin 30^{\\circ}}{2} = \\frac{40 \\cdot 0{,}5}{2} = 10\\ \\text{cm}^{2}")),
    mistake(k("areaSine", 4), () => crossed("T = \\frac{a \\cdot b}{2}")),
    check(k("areaSine", 5), () => big("\\sin 90^{\\circ}"), ["1", "0", "0,5"], 0),
  ],
};
