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
import type { QuestionScene } from "../engine/questions/written/questionScene";

export type Match = (p: GeneratedProblem) => boolean;

const expression = (test: (p: WrittenProblem) => boolean): Match => (p) => p.kind === "expression" && test(p);
const clock = (test: (p: ClockProblem) => boolean): Match => (p) => p.kind === "clock" && test(p);
const shop = (mode: ShopProblem["mode"]): Match => (p) => p.kind === "shop" && p.mode === mode;
const trappan = (test: (p: TrappanProblem) => boolean): Match => (p) => p.kind === "trappan" && test(p);
const mul = (test: (p: MulGuidedProblem) => boolean): Match => (p) => p.kind === "mulGuided" && test(p);
const scene = (kind: QuestionScene["kind"]) => expression((p) => p.scene?.kind === kind);

export const COLUMN = {
  addition: (p) => p.kind === "columnAdd" && !p.decimalPlaces,
  subtraction: (p) => p.kind === "columnSub" && !p.decimalPlaces,
  multiplication: (p) => p.kind === "columnMul",
  decimals: (p) => (p.kind === "columnAdd" || p.kind === "columnSub") && !!p.decimalPlaces && !p.topDecimals && !p.bottomDecimals,
  differentDecimals: (p) => (p.kind === "columnAdd" || p.kind === "columnSub") && !!(p.topDecimals || p.bottomDecimals),
} satisfies Record<string, Match>;

export const STATISTICS = {
  mean: (p) => p.kind === "statistics" && p.measure === "mean",
  median: (p) => p.kind === "statistics" && p.measure === "median",
  mode: (p) => p.kind === "statistics" && p.measure === "mode",
} satisfies Record<string, Match>;

export const CHARTS = {
  lookup: (p) => p.kind === "chart" && p.questionType === "lookup",
  difference: (p) => p.kind === "chart" && p.questionType === "difference",
  sum: (p) => p.kind === "chart" && p.questionType === "sum",
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
export const ALL_VARIANTS: Record<string, Record<string, Match>> = { COLUMN, STATISTICS, CHARTS, CLOCK, SHOP, WRITTEN, TRAPPAN, MULTIPLICATION };
