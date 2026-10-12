/**
 * A picture of what a question is about (game/scenes/QuestionScene.tsx draws
 * it) - for the written questions and the single-choice ones alike:
 *
 *   balance     - an equation as a balance scale, level because both sides weigh
 *                 the same: □ + 7 on one pan, 15 on the other
 *   groups      - a times table as groups: 3 plates with 4 cookies on each
 *   share       - a division as sharing: 12 cookies, 3 animals to share them
 *   rounding    - numbers on a number line between their tens (or hundreds): which is nearest?
 *   units       - a conversion on the unit staircase (enhetstrappan): from one unit to another, step by step
 *   numberLine  - a number line with its ticks, and an arrow at the number asked
 *   fraction    - a circle, bar or square cut in equal parts, some coloured
 *   ruler       - a thing laid along a ruler, to read its length
 *   thermometer - a temperature, below zero too
 *   shape       - a plane figure or a solid, to name or count
 *   symmetry    - a figure on a grid and a dashed line: is it a line of symmetry?
 *   chance      - a bag of marbles, a spinner or a die
 *   robot       - programming: a robot on a grid, its program, lettered squares
 *   pizza       - pizzas cut in equal slices: some eaten, some taken, a name under each
 *   chocolate   - a chocolate bar of squares, some eaten
 *
 * Förskoleklass:
 *   count       - things to count; two groups side by side to compare
 *   queue       - animals in a queue to the flag: who is third?
 *   pattern     - shapes in a repeating pattern, a ? where the next one goes
 *   shelf       - a shelf of things: what's under the ball, left of the cup?
 *   lengths     - ribbons, lettered, to compare - not always starting at the same place
 *   weigh       - a balance with a thing on each pan, the heavier one down
 *
 * Measuring and data:
 *   kitchenScale - a dial scale in grams, the needle to read
 *   jug         - a measuring jug in decilitres, up to a litre
 *   tally       - tally marks in a table
 *   pie         - a pie chart and its legend
 *   timetable   - a bus timetable: the stops, and when each departure is there
 *   graph       - a coordinate system with lines (straight or not) through points
 *   bars        - a bar chart whose axis may not start at 0 - to see how that misleads
 *
 * Geometry and programming, åk 4-9:
 *   angle       - an angle to judge: acute, right, obtuse, straight
 *   crossing    - two lines crossing: one angle given, another asked (v)
 *   similar     - two similar triangles, their sides marked, one side x
 *   cuboid      - a box, its length, width and height marked
 *   code        - a program in words (om … annars, upprepa, skriv)
 *   clock       - an analog clock showing a time (a card to match)
 *   protractor  - a protractor laid on an angle, to read
 *   quad        - a quadrilateral: square, rectangle, rhombus, parallelogram, trapezoid, kite
 *   net         - squares joined edge to edge: a net that may fold into a cube
 *   gridShape   - a polygon on squared paper, its corners on the grid points
 *   triangle    - a triangle with its sides marked, turned and maybe flipped
 */
export type ScaleTerm = { kind: "unknown"; label: string } | { kind: "weight"; value: number };

/** What's in the groups, and what holds each group. */
export type GroupThing = "cookies" | "eggs" | "apples" | "fish" | "flowers" | "stars";
export const GROUP_THINGS: readonly GroupThing[] = ["cookies", "eggs", "apples", "fish", "flowers", "stars"];

/** A thing to measure with a ruler. */
export type RulerThing = "pencil" | "crayon" | "straw";
export const RULER_THINGS: readonly RulerThing[] = ["pencil", "crayon", "straw"];

/** The figures and solids åk 1-6 name: plane figures, then solids. */
export type PlaneShape = "circle" | "triangle" | "square" | "rectangle" | "pentagon" | "hexagon";
export type Solid = "cube" | "cuboid" | "sphere" | "cylinder" | "cone" | "pyramid";
export type ShapeName = PlaneShape | Solid;
export const PLANE_SHAPES: readonly PlaneShape[] = ["circle", "triangle", "square", "rectangle", "pentagon", "hexagon"];
export const SOLIDS: readonly Solid[] = ["cube", "cuboid", "sphere", "cylinder", "cone", "pyramid"];

export type ChanceColor = "red" | "blue" | "yellow" | "green";
export const CHANCE_COLORS: readonly ChanceColor[] = ["red", "blue", "yellow", "green"];

/** A robot's move: one square in that direction. */
export type Move = "up" | "down" | "left" | "right";
/** A step of a program: a move, or moves repeated (a loop). */
export type ProgramStep = Move | { repeat: number; moves: Move[] };

export type QuestionScene =
  | { kind: "balance"; left: ScaleTerm[]; right: ScaleTerm[] }
  | { kind: "groups"; groups: number; each: number; thing: GroupThing }
  | { kind: "share"; total: number; among: number; thing: GroupThing }
  | { kind: "rounding"; numbers: { value: number; step: number }[] }
  | { kind: "units"; family: UnitFamily; from: string; to: string; value: number }
  /** From `from` to `to`, a tick every `step`, a number under every `labelEvery`; the arrow at `arrow`. */
  | { kind: "numberLine"; from: number; to: number; step: number; labelEvery: number; arrow: number }
  /** `parts` equal parts, `shaded` of them coloured. */
  | { kind: "fraction"; shape: "circle" | "bar" | "square"; parts: number; shaded: number }
  /** A thing from `startMm` to `startMm + lengthMm` along a ruler in centimetres. */
  | { kind: "ruler"; thing: RulerThing; startMm: number; lengthMm: number }
  /** Whole degrees, on a scale from `min` to `max`. */
  | { kind: "thermometer"; value: number; min: number; max: number }
  | { kind: "shape"; shape: ShapeName }
  /** A figure of grid squares (`cells`, [column, row]) on a `size` × `size` grid, and a dashed line through it - after column (or row) `at`. */
  | { kind: "symmetry"; size: number; cells: [number, number][]; line: "vertical" | "horizontal"; at: number }
  /** Marbles in a bag, sectors of a spinner (each colour `count` sectors), or a die. */
  | { kind: "chance"; device: "bag" | "spinner" | "die"; colors: { color: ChanceColor; count: number }[] }
  /**
   * A robot on a `w` × `h` grid at `start` ([column, row], row 0 at the top),
   * its program shown beside it (when given), and squares lettered to pick among.
   */
  | { kind: "robot"; w: number; h: number; start: [number, number]; program?: ProgramStep[]; letters: { at: [number, number]; letter: string }[]; star?: [number, number] }
  | { kind: "pizza"; pizzas: Pizza[] }
  /** A bar of `rows` × `cols` squares, the last `eaten` of them gone. */
  | { kind: "chocolate"; rows: number; cols: number; eaten: number }
  /** One group of things to count, or two (lettered A and B) to compare. */
  | { kind: "count"; groups: { thing: GroupThing; n: number }[] }
  /** Animals in a queue, the first one at the flag (on the left). */
  | { kind: "queue"; animals: Animal[] }
  /** A row of shapes, and a ? where the next one goes (when `blank`). One shape alone is an option to pick. */
  | { kind: "pattern"; items: PatternItem[]; blank: boolean }
  /** A shelf: `rows` from the top, each a row of things (or an empty place). */
  | { kind: "shelf"; rows: (ShelfThing | null)[][] }
  /** Ribbons over a grid of squares: each from `start` for `length` squares, with its letter. */
  | { kind: "lengths"; ribbons: { letter: string; start: number; length: number; color: ChanceColor }[] }
  /** A balance with a thing on each pan: the heavier side down, level when they weigh the same. */
  | { kind: "weigh"; left: ShelfThing; right: ShelfThing; heavier: "left" | "right" | "same" }
  /** A dial scale from 0 to `max` grams, a tick every `step`, the needle at `grams`. */
  | { kind: "kitchenScale"; grams: number; max: number; step: number }
  /** A measuring jug marked in decilitres up to 10 (1 litre), filled to `dl`. */
  | { kind: "jug"; dl: number }
  /** Tally marks, one row per thing (its name an i18n key). */
  | { kind: "tally"; rows: { label: string; count: number }[] }
  /** A pie chart: each sector `parts` of the whole's `total`, named by an i18n key. */
  | { kind: "pie"; sectors: { label: string; parts: number }[]; total: number }
  /** A timetable: a row per stop, a column per departure ("08:15"). */
  | { kind: "timetable"; stops: string[]; times: string[][] }
  /** A coordinate system: axes with their range, tick step and name (an i18n key, or none), and lines through points. */
  | { kind: "graph"; x: GraphAxis; y: GraphAxis; lines: { points: [number, number][]; label?: string }[] }
  /** A bar chart of A, B, C…: its axis from `from` (0, or more - the misleading cut) to `to`, a line every `step`. */
  | { kind: "bars"; values: number[]; from: number; to: number; step: number }
  /** Two rays from a corner, `degrees` apart, the whole turned `turn` degrees. */
  | { kind: "angle"; degrees: number; turn: number }
  /** Two lines crossing: the four angles in turn are a, 180 - a, a, 180 - a. Angle `given` shows a, angle `asked` shows v. */
  | { kind: "crossing"; degrees: number; given: number; asked: number }
  /** Two similar triangles, the big one `k` times the small: the sides as marked (a number, "x", or nothing). */
  | { kind: "similar"; sides: [number, number, number]; k: number; small: (number | "x" | null)[]; big: (number | "x" | null)[] }
  /** A box: length, width, height, in `unit`. */
  | { kind: "cuboid"; l: number; w: number; h: number; unit: string }
  /** A program in words, a line at a time. */
  | { kind: "code"; lines: CodeLine[] }
  /** An analog clock at h:m (12-hour face). */
  | { kind: "clock"; h: number; m: number }
  /** A protractor on an angle of `degrees`, its first arm pointing `base`. */
  | { kind: "protractor"; degrees: number; base: "right" | "left" }
  /** A quadrilateral, turned `turn` degrees. */
  | { kind: "quad"; shape: Quad; turn: number }
  /** Squares of a net, [column, row]. */
  | { kind: "net"; cells: [number, number][] }
  /** A polygon on a `w` × `h` squared paper, its corners on grid points (x right, y down). */
  | { kind: "gridShape"; w: number; h: number; points: [number, number][] }
  /** A triangle with sides a, b, c (c along the bottom before turning) marked, turned `turn` degrees, mirrored when `flip`. */
  | { kind: "triangle"; sides: [number, number, number]; turn: number; flip: boolean };

export type Quad = "square" | "rectangle" | "rhombus" | "parallelogram" | "trapezoid" | "kite";
export const QUADS: readonly Quad[] = ["square", "rectangle", "rhombus", "parallelogram", "trapezoid", "kite"];

/** Animals that queue - each a sprite, and a name (`animal.<name>`) in both languages. */
export type Animal = "bear" | "rabbit" | "pig" | "frog" | "owl" | "cow" | "monkey" | "penguin" | "elephant" | "giraffe" | "dog" | "duck";
export const ANIMALS: readonly Animal[] = ["bear", "rabbit", "pig", "frog", "owl", "cow", "monkey", "penguin", "elephant", "giraffe", "dog", "duck"];

/** A shape in a pattern. */
export interface PatternItem {
  shape: "circle" | "square" | "triangle" | "star" | "heart";
  color: ChanceColor;
}

/** Things on a shelf or a balance - each a picture and a name (`thing.<name>`). */
export type ShelfThing = "ball" | "teddy" | "book" | "cup" | "car" | "plant" | "clock" | "apple" | "feather" | "melon";
export const SHELF_THINGS: readonly ShelfThing[] = ["ball", "teddy", "book", "cup", "car", "plant", "clock", "apple"];

export interface GraphAxis {
  min: number;
  max: number;
  step: number;
  /** i18n key of the axis' name ("kg", "kr"), or none. */
  label?: string;
}

/** A line of a program: an i18n key ("code.*") and its values, indented `indent` steps. */
export interface CodeLine {
  indent: number;
  key: string;
  vars?: Record<string, string | number>;
}

/**
 * A pizza on its plate: cut in `slices` equal slices, `left` of them still
 * there (the rest eaten - an empty plate), the first `taken` of those lifted
 * out (someone's share), and a name under it.
 */
export interface Pizza {
  slices: number;
  left: number;
  taken?: number;
  label?: string;
}

/** The unit staircases: length, mass, volume (liters and cubic units together), area, time. */
export type UnitFamily = "length" | "mass" | "volume" | "area" | "time";

/** Where a program takes a robot from `start`: each move one square, loops repeated. */
export function runProgram(start: [number, number], program: readonly ProgramStep[]): [number, number] {
  let [x, y] = start;
  const step = (m: Move) => {
    if (m === "up") y -= 1;
    else if (m === "down") y += 1;
    else if (m === "left") x -= 1;
    else x += 1;
  };
  for (const s of program) {
    if (typeof s === "string") step(s);
    else for (let i = 0; i < s.repeat; i++) s.moves.forEach(step);
  }
  return [x, y];
}
