/**
 * Theory for the åk 1-6 topics in engine/basicTopics.ts: one small example
 * each, worked the way the questions' guided steps go, the usual mistake,
 * and a quick "Testa själv". Pictures where the question has one - the
 * clock, the angles, the coordinate system.
 */
import { hourAngle, minuteAngle, type ClockFaceStyle } from "../engine/clock";
import { ClockFace } from "./ClockFace";
import { DigitalClock } from "./DigitalClock";
import { MoneyPiece } from "./shop/Money";
import { QuestionScene } from "./scenes/QuestionScene";
import type { Money } from "../engine/shop";
import type { Figure, Point } from "../engine/geometry";
import { GeometryFigure } from "./GeometryFigure";
import type { TeoriSlide } from "./teoriContent";
import { big, check, concept, crossed, mistake, step } from "./teoriAdvanced";

export type BasicTopic =
  | "timesTables"
  | "divisionFacts"
  | "missingNumber"
  | "clock"
  | "duration"
  | "money"
  | "shapeCount"
  | "angles"
  | "coordinates"
  | "equationsYoung"
  | "primes"
  | "estimation"
  | "areaUnits"
  | "shopPay"
  | "shopChange";

const k = (topic: BasicTopic, n: number) => `teori.basic.${topic}.${n}`;

const KIDS: ClockFaceStyle = { numerals: "arabic", ticks: "hours", look: "kids" };
const CLASSIC: ClockFaceStyle = { numerals: "arabic", ticks: "minutes", look: "classic" };
const clockAt = (h: number, m: number, face: ClockFaceStyle, size = 200) => <ClockFace face={face} hourDeg={hourAngle(h, m)} minuteDeg={minuteAngle(m)} size={size} />;
const fig = (figure: Figure, maxWidth = 240, maxHeight = 200) => <GeometryFigure figure={figure} maxWidth={maxWidth} maxHeight={maxHeight} />;

/** An equation's balance: the unknown and a weight on one pan, a weight on the other. */
const balanceOf = (label: string, plus: number, total: number) => (
  <QuestionScene scene={{ kind: "balance", left: [{ kind: "unknown", label }, { kind: "weight", value: plus }], right: [{ kind: "weight", value: total }] }} />
);

/** A triangle 60°, 70°, x - the angle sum. */
const TRIANGLE: Figure = {
  shapes: [
    { kind: "polygon", points: [[0, 0], [8, 0], [3.3, -5.7]], fill: "plain" },
    { kind: "angle", at: [0, 0], a: [8, 0], b: [3.3, -5.7] },
    { kind: "angle", at: [8, 0], a: [3.3, -5.7], b: [0, 0] },
    { kind: "angle", at: [3.3, -5.7], a: [0, 0], b: [8, 0] },
  ],
  labels: [
    { text: "60°", at: [1.5, -0.9], place: "center" },
    { text: "70°", at: [6.5, -0.9], place: "center" },
    { text: "x", at: [3.6, -4.2], place: "center" },
  ],
};

/** The point (3, 2) in a small coordinate system, with the way to it dashed. */
const POINT: Figure = {
  shapes: [
    ...[1, 2, 3, 4, 5].flatMap((i) => [
      { kind: "segment" as const, from: [i, 0] as Point, to: [i, -5] as Point, faint: true },
      { kind: "segment" as const, from: [0, -i] as Point, to: [5, -i] as Point, faint: true },
    ]),
    { kind: "segment", from: [0, 0], to: [5.6, 0] },
    { kind: "segment", from: [0, 0], to: [0, -5.6] },
    { kind: "segment", from: [3, 0], to: [3, -2], dashed: true },
    { kind: "segment", from: [0, -2], to: [3, -2], dashed: true },
    { kind: "circle", center: [3, -2], r: 0.16, fill: "asked" },
  ],
  labels: [
    ...[1, 2, 3, 4, 5].flatMap((i) => [
      { text: String(i), at: [i, 0] as Point, place: "below" as const },
      { text: String(i), at: [0, -i] as Point, place: "left" as const },
    ]),
    { text: "A", at: [3, -2], place: "right" },
  ],
};

/** A cube, drawn on paper: the hidden edges dashed. */
const CUBE: Figure = {
  shapes: [
    { kind: "polygon", points: [[0, 4], [4, 4], [4, 0], [0, 0]], fill: "plain" },
    { kind: "segment", from: [1.8, 2.2], to: [5.8, 2.2], dashed: true },
    { kind: "segment", from: [5.8, 2.2], to: [5.8, -1.8] },
    { kind: "segment", from: [5.8, -1.8], to: [1.8, -1.8] },
    { kind: "segment", from: [1.8, -1.8], to: [1.8, 2.2], dashed: true },
    { kind: "segment", from: [0, 4], to: [1.8, 2.2], dashed: true },
    { kind: "segment", from: [4, 4], to: [5.8, 2.2] },
    { kind: "segment", from: [4, 0], to: [5.8, -1.8] },
    { kind: "segment", from: [0, 0], to: [1.8, -1.8] },
  ],
  labels: [],
};

const money = (pieces: Money[]) => (
  <div className="flex flex-wrap gap-2 justify-center items-center">
    {pieces.map((p, i) => (
      <MoneyPiece key={i} value={p} noteWidth={92} />
    ))}
  </div>
);

export const BASIC_TEORI: Record<BasicTopic, TeoriSlide[]> = {
  shopPay: [
    concept("teori.basic.shopPay.1", () => money([1, 2, 5, 10, 20, 50, 100])),
    step("teori.basic.shopPay.2", () => money([20, 10, 5, 2])),
    step("teori.basic.shopPay.3", () => big("20 + 10 + 5 + 2 = 37")),
    mistake("teori.basic.shopPay.4", () => money([50])),
    check("teori.basic.shopPay.5", () => big("24\ \text{kr}"), ["20 + 2 + 2", "20 + 5", "10 + 10 + 5"], 0),
  ],
  shopChange: [
    concept("teori.basic.shopChange.1", () => money([50])),
    step("teori.basic.shopChange.2", () => big("37 \rightarrow 40: \; 3\ \text{kr}")),
    step("teori.basic.shopChange.3", () => big("40 \rightarrow 50: \; 10\ \text{kr}")),
    step("teori.basic.shopChange.4", () => money([10, 2, 1])),
    mistake("teori.basic.shopChange.5", () => crossed("50 + 37 = 87")),
    check("teori.basic.shopChange.6", () => big("100 - 64"), ["36", "46", "164"], 0),
  ],
  timesTables: [
    concept(k("timesTables", 1), () => <QuestionScene scene={{ kind: "groups", groups: 3, each: 4, thing: "cookies" }} />),
    step(k("timesTables", 2), () => big("4 + 4 + 4 = 3 \\cdot 4 = 12")),
    step(k("timesTables", 3), () => big("3 \\cdot 4 = 4 \\cdot 3")),
    mistake(k("timesTables", 4), () => crossed("3 \\cdot 4 = 7")),
    check(k("timesTables", 5), () => big("6 \\cdot 7"), ["42", "13", "36"], 0),
  ],
  divisionFacts: [
    concept(k("divisionFacts", 1), () => <QuestionScene scene={{ kind: "share", total: 12, among: 3, thing: "cookies" }} />),
    step(k("divisionFacts", 2), () => big("? \\cdot 3 = 12 \\quad \\Rightarrow \\quad 12 / 3 = 4")),
    mistake(k("divisionFacts", 3), () => crossed("12 / 3 = 9")),
    check(k("divisionFacts", 4), () => big("35 / 5"), ["7", "6", "30"], 0),
  ],
  missingNumber: [
    concept(k("missingNumber", 1), () => balanceOf("?", 7, 15)),
    step(k("missingNumber", 2), () => big("15 - 7 = 8")),
    step(k("missingNumber", 3), () => big("8 + 7 = 15 \\;\\checkmark")),
    mistake(k("missingNumber", 4), () => crossed("\\square = 15 + 7 = 22")),
    check(k("missingNumber", 5), () => big("\\square + 6 = 13"), ["7", "19", "8"], 0),
  ],
  clock: [
    concept(k("clock", 1), () => clockAt(3, 0, KIDS)),
    step(k("clock", 2), () => clockAt(3, 30, KIDS)),
    step(k("clock", 3), () => clockAt(3, 15, CLASSIC)),
    step(k("clock", 4), () => clockAt(3, 45, CLASSIC)),
    step("teori.basic.clock.faces", () => (
      <div className="flex gap-2 justify-center flex-wrap">
        {clockAt(10, 10, { numerals: "roman", ticks: "minutes", look: "classic" }, 120)}
        {clockAt(10, 10, { numerals: "quarters", ticks: "minutes", look: "modern" }, 120)}
        {clockAt(10, 10, { numerals: "none", ticks: "hours", look: "station" }, 120)}
      </div>
    )),
    step("teori.basic.clock.digital", () => (
      <div className="flex gap-2 justify-center flex-wrap items-center">
        <DigitalClock h={15} m={30} look="ledRed" size={170} />
        <DigitalClock h={15} m={30} look="lcd" size={170} />
      </div>
    )),
    mistake(k("clock", 5), () => clockAt(3, 30, CLASSIC)),
    check(k("clock", 6), () => clockAt(8, 15, { numerals: "roman", ticks: "minutes", look: "classic" }), ["8.15", "3.40", "8.03"], 0),
  ],
  duration: [
    concept(k("duration", 1), () => big("9.40 \\;\\rightarrow\\; 11.15")),
    step(k("duration", 2), () => big("9.40 \\rightarrow 10.00: \\quad 60 - 40 = 20")),
    step(k("duration", 3), () => big("10.00 \\rightarrow 11.00: \\quad 60")),
    step(k("duration", 4), () => big("20 + 60 + 15 = 95")),
    mistake(k("duration", 5), () => crossed("11{,}15 - 9{,}40 = 1{,}75")),
    check(k("duration", 6), () => big("10.30 \\;\\rightarrow\\; 11.15"), ["45 min", "85 min", "75 min"], 0),
  ],
  money: [
    concept(k("money", 1), () => big("50 + 20 + 10 + 5 + 2 + 1")),
    step(k("money", 2), () => big("50 + 20 + 10 = 80 \\qquad 80 + 5 + 2 + 1 = 88")),
    mistake(k("money", 3), () => crossed("50 + 20 + 10 + 5 + 2 + 1 = 6")),
    check(k("money", 4), () => big("20 + 20 + 5 + 1"), ["46", "4", "45"], 0),
  ],
  shapeCount: [
    concept(k("shapeCount", 1), () => fig(CUBE, 220, 180)),
    step(k("shapeCount", 2), () => big("4 + 4 = 8")),
    step(k("shapeCount", 3), () => big("4 + 4 + 4 = 12")),
    mistake(k("shapeCount", 4), () => fig(CUBE, 220, 180)),
    check(k("shapeCount", 5), () => big("\\text{rätblock: sidoytor?}"), ["6", "4", "8"], 0),
  ],
  angles: [
    concept(k("angles", 1), () => big("90^{\\circ} \\qquad 180^{\\circ} \\qquad 360^{\\circ}")),
    step(k("angles", 2), () => fig(TRIANGLE)),
    step(k("angles", 3), () => big("60 + 70 = 130 \\qquad x = 180 - 130 = 50")),
    mistake(k("angles", 4), () => crossed("x = 360 - 130")),
    check(k("angles", 5), () => big("40^{\\circ},\\ 90^{\\circ},\\ x"), ["50°", "130°", "230°"], 0),
  ],
  coordinates: [
    concept(k("coordinates", 1), () => fig(POINT, 220, 220)),
    step(k("coordinates", 2), () => big("A = (3, 2)")),
    mistake(k("coordinates", 3), () => crossed("A = (2, 3)")),
    check(k("coordinates", 4), () => big("(5, 1)"), ["5 åt höger, 1 upp", "1 åt höger, 5 upp", "5 upp, 1 åt höger"], 0),
  ],
  equationsYoung: [
    concept(k("equationsYoung", 1), () => balanceOf("x", 7, 15)),
    step(k("equationsYoung", 2), () => big("x = 15 - 7 = 8")),
    step(k("equationsYoung", 3), () => big("4x = 28 \\qquad x = \\frac{28}{4} = 7")),
    mistake(k("equationsYoung", 4), () => crossed("4x = 28 \\quad x = 28 - 4")),
    check(k("equationsYoung", 5), () => big("3x = 18"), ["x = 6", "x = 15", "x = 21"], 0),
  ],
  primes: [
    concept(k("primes", 1), () => big("2,\\ 3,\\ 5,\\ 7,\\ 11,\\ 13,\\ 17,\\ 19,\\ 23,\\ \\ldots")),
    step(k("primes", 2), () => big("21 = 3 \\cdot 7")),
    step(k("primes", 3), () => big("60 = 2 \\cdot 30 = 2 \\cdot 2 \\cdot 15 = 2 \\cdot 2 \\cdot 3 \\cdot 5")),
    mistake(k("primes", 4), () => crossed("1 \\text{ är ett primtal}")),
    check(k("primes", 5), () => big("15,\\ 17,\\ 21"), ["17", "15", "21"], 0),
  ],
  estimation: [
    concept(k("estimation", 1), () => big("49 \\cdot 21 \\approx 50 \\cdot 20 = 1000")),
    step(k("estimation", 2), () => big("398 + 207 \\approx 400 + 200 = 600")),
    mistake(k("estimation", 3), () => crossed("49 \\cdot 21 \\approx 40 \\cdot 20")),
    check(k("estimation", 4), () => big("31 \\cdot 19"), ["600", "500", "900"], 0),
  ],
  areaUnits: [
    concept(k("areaUnits", 1), () => big("1\\ \\text{dm} = 10\\ \\text{cm} \\qquad 1\\ \\text{dm}^{2} = 10 \\cdot 10 = 100\\ \\text{cm}^{2}")),
    step(k("areaUnits", 2), () => big("\\text{mm}^{2} \\xrightarrow{\\,/100\\,} \\text{cm}^{2} \\xrightarrow{\\,/100\\,} \\text{dm}^{2} \\xrightarrow{\\,/100\\,} \\text{m}^{2}")),
    step(k("areaUnits", 3), () => big("3\\ \\text{dm}^{2} = 3 \\cdot 100 = 300\\ \\text{cm}^{2}")),
    mistake(k("areaUnits", 4), () => crossed("1\\ \\text{dm}^{2} = 10\\ \\text{cm}^{2}")),
    check(k("areaUnits", 5), () => big("2\\ \\text{m}^{2} = \\ ?\\ \\text{dm}^{2}"), ["200", "20", "2000"], 0),
  ],
};
