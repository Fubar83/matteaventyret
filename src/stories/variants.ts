/**
 * The variants the stories show, as tests on a generated question: a clock to
 * read, a shop where change is given, a balance to picture... A story finds
 * the first level and seed that make one (firstMatching), so new levels are
 * picked up as they come - and storyCoverage.test.ts checks that every variant
 * still has a level that makes it.
 */
import type { GeneratedProblem } from "../engine/generator";
import type { WrittenProblem } from "../engine/questions/written/problem";
import type { ClockProblem } from "../engine/questions/clock";
import type { ShopProblem } from "../engine/questions/shop";
import type { TrappanProblem } from "../engine/questions/trappan";
import type { MulGuidedProblem } from "../engine/questions/multiply";
import type { QuestionScene } from "../engine/questions/scene";
import type { ChoiceProblem } from "../engine/questions/choice/problem";
import type { NumberLineProblem } from "../engine/questions/numberLine";
import type { GridProblem } from "../engine/questions/grid";

export type Match = (p: GeneratedProblem) => boolean;

const expression = (test: (p: WrittenProblem) => boolean): Match => (p) => p.kind === "expression" && test(p);
const clock = (test: (p: ClockProblem) => boolean): Match => (p) => p.kind === "clock" && test(p);
const shop = (mode: ShopProblem["mode"]): Match => (p) => p.kind === "shop" && p.mode === mode;
const trappan = (test: (p: TrappanProblem) => boolean): Match => (p) => p.kind === "trappan" && test(p);
const mul = (test: (p: MulGuidedProblem) => boolean): Match => (p) => p.kind === "mulGuided" && test(p);
const scene = (kind: QuestionScene["kind"]) => expression((p) => p.scene?.kind === kind);
const choice = (stage: ChoiceProblem["stageId"], test: (p: ChoiceProblem) => boolean = () => true): Match => (p) => p.kind === "choice" && p.stageId === stage && test(p);
const prompted = (part: string) => (p: ChoiceProblem) => p.prompt.key.includes(part);
/** A program with a line of this kind: "code.while". */
const codeHas = (key: string) => (p: ChoiceProblem) => p.scene?.kind === "code" && p.scene.lines.some((l) => l.key === key);

export const COLUMN = {
  addition: (p) => p.kind === "columnAdd" && !p.decimalPlaces,
  subtraction: (p) => p.kind === "columnSub" && !p.decimalPlaces,
  multiplication: (p) => p.kind === "columnMul",
  decimals: (p) => (p.kind === "columnAdd" || p.kind === "columnSub") && !!p.decimalPlaces && !p.topDecimals && !p.bottomDecimals,
  differentDecimals: (p) => (p.kind === "columnAdd" || p.kind === "columnSub") && !!(p.topDecimals || p.bottomDecimals),
} satisfies Record<string, Match>;

export const STATISTICS = {
  mean: (p) => p.kind === "statistics" && p.measure === "mean",
  median: (p) => p.kind === "statistics" && p.measure === "median" && p.values.length % 2 === 1,
  mode: (p) => p.kind === "statistics" && p.measure === "mode",
  range: (p) => p.kind === "statistics" && p.measure === "range",
  medianEven: (p) => p.kind === "statistics" && p.measure === "median" && p.values.length % 2 === 0,
} satisfies Record<string, Match>;

export const CHARTS = {
  lookup: (p) => p.kind === "chart" && p.style === "bar" && p.questionType === "lookup",
  difference: (p) => p.kind === "chart" && p.style === "bar" && p.questionType === "difference",
  sum: (p) => p.kind === "chart" && p.style === "bar" && p.questionType === "sum",
  pictogram: (p) => p.kind === "chart" && p.style === "pictogram",
  line: (p) => p.kind === "chart" && p.style === "line",
} satisfies Record<string, Match>;

/** The clock's tasks: read the hands, set them (from words or a digital clock), or set a digital clock. */
export const CLOCK = {
  read: clock((p) => p.task === "read"),
  setHandsFromWords: clock((p) => p.task === "setAnalog" && p.given === "words"),
  setHandsFromDigital: clock((p) => p.task === "setAnalog" && p.given === "digital"),
  setDigital: clock((p) => p.task === "setDigital"),
} satisfies Record<string, Match>;
export type ClockTask = keyof typeof CLOCK;

export const SHOP = { pay: shop("pay"), change: shop("change"), basket: shop("basket") } satisfies Record<string, Match>;
export type ShopMode = keyof typeof SHOP;

export const WRITTEN = {
  answerOnly: expression((p) => !!p.answerOnly),
  numberLine: scene("numberLine"),
  ruler: scene("ruler"),
  pattern: expression((p) => p.stageId === "1.8.4"),
  sequence: expression((p) => p.stageId === "2.20.1"),
  balance: scene("balance"),
  groups: scene("groups"),
  share: scene("share"),
  rounding: scene("rounding"),
  units: scene("units"),
  figure: expression((p) => !!p.figure),
  unit: expression((p) => !!p.unit && !p.figure && !p.scene),
} satisfies Record<string, Match>;

export const TRAPPAN = {
  whole: trappan((p) => p.shift === 0 && p.dividend.decimals === 0 && !p.withRest && p.roundTo === undefined),
  decimalDividend: trappan((p) => p.shift === 0 && p.dividend.decimals > 0 && p.roundTo === undefined),
  decimalDivisor: trappan((p) => p.shift > 0 && p.roundTo === undefined),
  rounded: trappan((p) => p.roundTo !== undefined),
  withRest: trappan((p) => !!p.withRest),
} satisfies Record<string, Match>;

export const MULTIPLICATION = {
  twoDigit: mul((p) => p.top.decimals + p.bottom.decimals === 0 && p.bottom.digits.length >= 2),
  oneDecimal: mul((p) => (p.top.decimals > 0) !== (p.bottom.decimals > 0)),
  bothDecimals: mul((p) => p.top.decimals > 0 && p.bottom.decimals > 0),
} satisfies Record<string, Match>;

/** Every variant, for the coverage test. */
/** The single-choice questions, one variant per kind of question asked. */
export const CHOICE = {
  count: choice("0.1.1", prompted("count.howMany")),
  countWhich: choice("0.1.1", prompted("count.which")),
  moreOrFewer: choice("0.1.2", (p) => !p.prompt.key.endsWith("howManyMore")),
  howManyMore: choice("0.1.2", prompted("howManyMore")),
  beforeAfter: choice("0.1.3", (p) => !!p.scene),
  between: choice("0.1.3", prompted("order.between")),
  queueWho: choice("0.1.4", prompted("queue.who")),
  queuePlace: choice("0.1.4", prompted("queue.place")),
  pattern: choice("0.2.1"),
  shelf: choice("0.3.1", prompted("where.what")),
  shelfBetween: choice("0.3.1", prompted("where.between")),
  ribbons: choice("0.3.2", (p) => p.scene?.kind === "lengths" && p.scene.ribbons.some((r) => r.start > 0)),
  balance: choice("0.3.2", (p) => p.scene?.kind === "weigh"),
  compare: choice("1.8.2"),
  parity: choice("1.8.3", prompted("parity.prompt")),
  parityWhich: choice("1.8.3", prompted("parity.which")),
  fractionHowMuch: choice("1.9.1", prompted("howMuch")),
  fractionWhichPicture: choice("1.9.1", prompted("fraction.which")),
  partOf: choice("1.9.1", prompted("partOf")),
  pizzaLeft: choice("1.9.2", prompted("pizza.")),
  chocolate: choice("1.9.2", prompted("chocolate")),
  sharePizza: choice("1.9.2", prompted("share")),
  whoGetsMost: choice("1.9.3"),
  equalWhich: choice("2.6.5", prompted("equal.which")),
  equalMissing: choice("2.6.5", prompted("equal.missing")),
  pizzaTogether: choice("2.6.6", (p) => p.prompt.key.endsWith("together") || p.prompt.key.endsWith(".left")),
  chocolatePart: choice("2.6.6", prompted("everyday.chocolate")),
  mixedNumber: choice("2.6.6", prompted("mixed")),
  shapeName: choice("1.2.3", prompted("shape.name")),
  shapeWhichPicture: choice("1.2.3", prompted("shape.which")),
  symmetry: choice("1.2.4"),
  calendarDays: choice("1.5.8", (p) => p.prompt.key.includes("Days") || p.prompt.key.includes("daysAgo")),
  calendarMonths: choice("1.5.8", prompted("month")),
  calendarHowMany: choice("1.5.8", prompted("howMany")),
  chanceWords: choice("1.11.1", prompted("words")),
  chanceMost: choice("1.11.1", prompted("most")),
  decimalPlace: choice("2.16.1"),
  tenPowers: choice("2.16.2"),
  orderDecimals: choice("2.16.3"),
  thermometer: choice("2.17.1", (p) => p.scene?.kind === "thermometer"),
  coldest: choice("2.17.1", (p) => !p.scene),
  probabilityDie: choice("2.18.1", (p) => p.scene?.kind === "chance" && p.scene.device === "die"),
  probabilityBag: choice("2.18.1", (p) => p.scene?.kind === "chance" && p.scene.device !== "die"),
  robotWhere: choice("1.12.1", prompted("whereEnds")),
  robotWhich: choice("1.12.1", prompted("whichProgram")),
  loopWhere: choice("2.19.2", prompted("whereEnds")),
  loopSteps: choice("2.19.2", prompted("howManySteps")),
  kitchenScale: choice("1.10.2", prompted("weigh.read")),
  kilograms: choice("1.10.2", prompted("inKg")),
  jug: choice("1.10.3", prompted("jug.read")),
  jugToLitre: choice("1.10.3", prompted("toLitre")),
  tally: choice("1.13.1", prompted("tally.howMany")),
  pieFraction: choice("2.8.6", prompted("pie.fraction")),
  piePercent: choice("2.8.6", prompted("pie.percent")),
  pieHowMany: choice("2.8.6", prompted("pie.howMany")),
  busWhen: choice("2.9.7", prompted("bus.when")),
  busWhich: choice("2.9.7", prompted("bus.which")),
  proportionalGraph: choice("2.11.3", (p) => p.scene?.kind === "graph"),
  proportionalWhich: choice("2.11.3", (p) => !p.scene),
  angleKind: choice("2.12.2", prompted("angle.kind")),
  angleSize: choice("2.12.2", prompted("angle.size")),
  scaleMap: choice("2.12.3", prompted("scale.map")),
  scaleBigger: choice("2.12.3", prompted("scale.bigger")),
  codeIfElse: choice("2.19.3", (p) => codeHas("code.ifEven")(p) && !codeHas("code.for")(p)),
  codeScore: choice("2.19.3", codeHas("code.ifGreater")),
  codeLoop: choice("3.9.1", codeHas("code.while")),
  codeSwap: choice("3.9.1", codeHas("code.printTwo")),
  squareRoots: choice("3.1.4", prompted("whichBetween")),
  percentagePoints: choice("3.2.3"),
  interest: choice("3.2.4", prompted("twoYears")),
  inequality: choice("3.3.8", prompted("ineq.solve")),
  lineFormula: choice("3.10.1", prompted("line.formula")),
  tableFormula: choice("3.10.2", (p) => !!p.display),
  sticks: choice("3.10.2", prompted("sticks.formula")),
  similar: choice("3.4.9"),
  crossing: choice("3.4.10"),
  surfaceArea: choice("3.4.11", prompted("surface.box")),
  meanOrMedian: choice("3.7.3", prompted("typical.which")),
  misleadingChart: choice("3.7.4", prompted("bars.misleading")),
  chartHowMuch: choice("3.7.4", prompted("bars.howMuch")),
  missingLine: choice("3.9.2"),
  protractor: choice("2.12.4"),
  areaOnPaper: choice("2.4.7", (p) => p.scene?.kind === "gridShape" && p.scene.points.length === 3),
  parallelogramOnPaper: choice("2.4.7", (p) => p.scene?.kind === "gridShape" && p.scene.points.length === 4),
  cubeNets: choice("2.4.8", prompted("net.which")),
  notCubeNet: choice("2.4.8", prompted("net.whichNot")),
  congruent: choice("3.4.15"),
  reasonable: choice("2.10.4", (p) => !!p.display),
  reasonablePrice: choice("2.10.4", prompted("price")),
  primeFactors: choice("2.15.4"),
  sale: choice("3.2.5", prompted("sale")),
  vatRemove: choice("3.2.5", prompted("vat.remove")),
  loanMonthly: choice("3.2.6", prompted("amortise")),
  loanInterest: choice("3.2.6", prompted("loan.interest")),
  litres: choice("2.9.11"),
} satisfies Record<string, Match>;

/** Sorting: one variant per level - each asks one thing. */
const sortLevel = (stage: string): Match => (p) => (p.kind === "sortGroups" || p.kind === "sortOrder") && p.stageId === stage;
export const SORT = {
  shapes: sortLevel("0.4.1"),
  oddEven: sortLevel("1.8.5"),
  planeOrSolid: sortLevel("1.2.5"),
  primes: sortLevel("2.15.2"),
  aroundAHalf: sortLevel("2.6.7"),
  rational: sortLevel("3.1.5"),
  fewestToMost: sortLevel("0.1.5"),
  numbers: sortLevel("1.8.6"),
  mixedForms: sortLevel("2.16.4"),
  negatives: sortLevel("2.17.2"),
  units: sortLevel("2.9.8"),
  standardForm: sortLevel("3.1.6"),
  venn: sortLevel("2.15.3"),
  quadrilaterals: sortLevel("2.12.7"),
  impossibleToCertain: sortLevel("1.11.3"),
  program: sortLevel("3.9.3"),
  solution: sortLevel("3.3.12"),
} satisfies Record<string, Match>;

const line = (stage: string, test: (p: NumberLineProblem) => boolean = () => true): Match => (p) => p.kind === "placeOnLine" && p.stageId === stage && test(p);
export const NUMBER_LINE = {
  toTen: line("0.1.6"),
  toHundred: line("1.8.7", (p) => p.to === 100),
  toThousand: line("1.8.7", (p) => p.to === 1000),
  fraction: line("2.6.8", (p) => p.value < 1),
  fractionPastOne: line("2.6.8", (p) => p.value > 1),
  tenths: line("2.16.5", (p) => p.snap === 0.1),
  hundredths: line("2.16.5", (p) => p.snap === 0.01),
  negative: line("2.17.3"),
  estimate: line("3.1.7"),
  zoomedDecimal: line("2.16.7", (p) => p.step < 1),
  zoomedWhole: line("2.16.7", (p) => p.step === 1),
  double: line("2.11.4"),
  time: line("2.9.10", (p) => p.prompt.key.endsWith("placeTime")),
  ends: line("2.9.10", (p) => p.prompt.key.endsWith("placeEnds")),
} satisfies Record<string, Match>;

const grid = (stage: string, test: (p: GridProblem) => boolean = () => true): Match => (p) => (p.kind === "gridCells" || p.kind === "gridPoints") && p.stageId === stage && test(p);
const gridPrompt = (part: string) => (p: GridProblem) => p.prompt.key.includes(part);
export const GRID = {
  symmetry: grid("1.2.6"),
  fraction: grid("1.9.4"),
  percent: grid("2.6.9"),
  rectangleBoth: grid("2.4.5", gridPrompt("rectangle.both")),
  rectangleArea: grid("2.4.5", gridPrompt("rectangle.area")),
  point: grid("2.13.2", gridPrompt("point.prompt")),
  corner: grid("2.13.2", gridPrompt("corner")),
  reflect: grid("3.4.12", gridPrompt("move.reflect")),
  translate: grid("3.4.12", gridPrompt("move.translate")),
  rotateQuarter: grid("3.4.14", (p) => !p.prompt.key.endsWith("half")),
  rotateHalf: grid("3.4.14", gridPrompt("turn.half")),
  enlarge: grid("2.12.6"),
  drawLine: grid("3.10.4"),
} satisfies Record<string, Match>;

const ofLevel = (kind: string, stage: string, test: (p: GeneratedProblem) => boolean = () => true): Match => (p) => p.kind === kind && p.stageId === stage && test(p);
export const MATCH = {
  count: ofLevel("match", "0.1.7"),
  friends: ofLevel("match", "1.7.5"),
  clocks: ofLevel("match", "1.5.10"),
  forms: ofLevel("match", "2.6.10"),
  units: ofLevel("match", "2.9.9"),
  expressions: ofLevel("match", "3.3.9"),
  graphs: ofLevel("match", "3.10.3"),
} satisfies Record<string, Match>;

export const BLOCKS = {
  toTwenty: ofLevel("buildNumber", "0.1.8"),
  threeDigits: ofLevel("buildNumber", "1.14.1"),
  exchange: ofLevel("buildNumber", "1.14.2"),
  decimals: ofLevel("buildNumber", "2.16.6"),
} satisfies Record<string, Match>;

export const BALANCE = {
  plain: ofLevel("balanceSolve", "2.14.2"),
  share: ofLevel("balanceSolve", "3.3.10"),
  both: ofLevel("balanceSolve", "3.3.11"),
} satisfies Record<string, Match>;

export const EXPERIMENT = {
  spinner: ofLevel("experiment", "1.11.2"),
  die: ofLevel("experiment", "2.18.3"),
  twoDice: ofLevel("experiment", "3.7.5"),
} satisfies Record<string, Match>;

export const CONSTRUCT = {
  lineFromZero: ofLevel("construct", "1.10.4", (p) => p.kind === "construct" && p.task === "line" && p.start === 0),
  lineFromInside: ofLevel("construct", "1.10.4", (p) => p.kind === "construct" && p.task === "line" && p.start > 0),
  angleRight: ofLevel("construct", "2.12.5", (p) => p.kind === "construct" && p.task === "angle" && p.base === "right"),
  angleLeft: ofLevel("construct", "2.12.5", (p) => p.kind === "construct" && p.task === "angle" && p.base === "left"),
  triangle: ofLevel("construct", "3.4.13"),
} satisfies Record<string, Match>;

export const ALL_VARIANTS: Record<string, Record<string, Match>> = { COLUMN, STATISTICS, CHARTS, CLOCK, SHOP, WRITTEN, TRAPPAN, MULTIPLICATION, CHOICE, SORT, NUMBER_LINE, GRID, MATCH, BLOCKS, BALANCE, EXPERIMENT, CONSTRUCT };
