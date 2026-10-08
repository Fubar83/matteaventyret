/**
 * Theory for division with trappan (engine/trappan.ts). Each topic works one
 * small example through on the trappan itself, a move at a time - the figure
 * fills in step by step, the newest digits highlighted - so a child sees
 * exactly what to write where before trying. Then the usual mistake and a
 * quick "Testa själv". The trappans are drawn by the same layout as the board.
 */
import type { Decimal, TrappanProblem } from "../engine/trappan";
import type { TeoriSlide } from "./teoriContent";
import { big, check, concept, crossed, mistake, step } from "./teoriAdvanced";
import { TrappanFigure } from "./TrappanFigure";

export type DivisionTopic =
  | "divisionTrappan"
  | "divisionTwoDigit"
  | "divisionRest"
  | "divisionDecimals"
  | "divisionDecimalDividend"
  | "divisionDecimalDivisor"
  | "divisionRounding";

const k = (topic: DivisionTopic, n: number) => `teori.div.${topic}.${n}`;

const num = (digits: string, decimals = 0): Decimal => ({ digits, decimals });
const division = (dividend: Decimal, divisor: Decimal, answer: number, roundTo?: number): TrappanProblem => ({
  stageId: "2.5.1",
  kind: "trappan",
  dividend,
  divisor,
  shift: divisor.decimals,
  answer,
  ...(roundTo !== undefined ? { roundTo } : {}),
});

const D84_4 = division(num("84"), num("4"), 21);
const D412_4 = division(num("412"), num("4"), 103);
const D156_12 = division(num("156"), num("12"), 13);
const D9_2 = division(num("9"), num("2"), 4.5);
const D84d_4 = division(num("84", 1), num("4"), 2.1);
const D45_3 = division(num("45"), num("3"), 15);
const D17_5: TrappanProblem = { ...division(num("17"), num("5"), 3), withRest: true };

/** The trappan, filled in up to and including box `until` (all of it without), the last `fresh` moves highlighted. */
const figure = (p: TrappanProblem, until?: string, fresh = 1, maxWidth = 240) => <TrappanFigure problem={p} until={until} fresh={fresh} maxWidth={maxWidth} />;

/** "1 · 12 = 12 … 9 · 12 = 108" in two columns - the divisor's table, made before a two-digit division. */
const tableOf = (n: number) => {
  const row = (i: number) => `${i} \\cdot ${n} = ${i * n}`;
  const rows = [1, 2, 3, 4, 5].map((i) => (i + 5 <= 9 ? `${row(i)} & \\quad ${row(i + 5)}` : row(i)));
  return big(`\\begin{array}{ll} ${rows.join(" \\\\ ")} \\end{array}`);
};

export const DIVISION_TEORI: Record<DivisionTopic, TeoriSlide[]> = {
  // 84 ÷ 4, one move at a time: how many times, multiply back, subtract, bring down.
  divisionTrappan: [
    concept(k("divisionTrappan", 1), () => figure(D84_4, "")),
    step(k("divisionTrappan", 2), () => figure(D84_4, "q:0")),
    step(k("divisionTrappan", 3), () => figure(D84_4, "p0:0")),
    step(k("divisionTrappan", 4), () => figure(D84_4, "r0:0")),
    step(k("divisionTrappan", 5), () => figure(D84_4, "b0")),
    step(k("divisionTrappan", 6), () => figure(D84_4, "r1:1", 3)),
    mistake(k("divisionTrappan", 7), () => figure(D412_4, "q:1")),
    check(k("divisionTrappan", 8), () => big("96 \\div 3"), ["32", "33", "23"], 0),
  ],
  // 156 ÷ 12: a table of 12 first, so no guessing.
  divisionTwoDigit: [
    concept(k("divisionTwoDigit", 1), () => tableOf(12)),
    step(k("divisionTwoDigit", 2), () => figure(D156_12, "q:1")),
    step(k("divisionTwoDigit", 3), () => figure(D156_12, "r0:1", 3)),
    step(k("divisionTwoDigit", 4), () => figure(D156_12, "q:2", 2)),
    step(k("divisionTwoDigit", 5), () => figure(D156_12, "r1:2", 3)),
    mistake(k("divisionTwoDigit", 6), () => crossed("36 - 24 = 12")),
    check(k("divisionTwoDigit", 7), () => big("144 \\div 12"), ["12", "11", "14"], 0),
  ],
  // 17 ÷ 5 = 3 rest 2: nothing more to bring down, and what's left is the rest.
  divisionRest: [
    concept(k("divisionRest", 1), () => figure(D17_5, "")),
    step(k("divisionRest", 2), () => figure(D17_5, "q:1")),
    step(k("divisionRest", 3), () => figure(D17_5, "p0:1", 2)),
    step(k("divisionRest", 4), () => figure(D17_5, "r0:1")),
    step(k("divisionRest", 5), () => big("3 \\cdot 5 + 2 = 17")),
    mistake(k("divisionRest", 6), () => crossed("17 \\div 5 = 2 \\text{ rest } 7")),
    check(k("divisionRest", 7), () => big("23 \\div 4"), ["5 rest 3", "6 rest 1", "4 rest 7"], 0),
  ],
  // 9 ÷ 2 = 4,5: a rest, so on past the comma with a zero.
  divisionDecimals: [
    concept(k("divisionDecimals", 1), () => figure(D9_2, "")),
    step(k("divisionDecimals", 2), () => figure(D9_2, "r0:0", 3)),
    step(k("divisionDecimals", 3), () => figure(D9_2, "b0")),
    step(k("divisionDecimals", 4), () => figure(D9_2, "r1:1", 4)),
    mistake(k("divisionDecimals", 5), () => crossed("9 \\div 2 = 4")),
    check(k("divisionDecimals", 6), () => big("7 \\div 2"), ["3,5", "3", "35"], 0),
  ],
  // 8,4 ÷ 4 = 2,1: as usual, and the comma goes up when the digit after it comes down.
  divisionDecimalDividend: [
    concept(k("divisionDecimalDividend", 1), () => figure(D84d_4, "")),
    step(k("divisionDecimalDividend", 2), () => figure(D84d_4, "r0:0", 3)),
    step(k("divisionDecimalDividend", 3), () => figure(D84d_4, "q:1", 2)),
    step(k("divisionDecimalDividend", 4), () => figure(D84d_4, "r1:1", 2)),
    mistake(k("divisionDecimalDividend", 5), () => crossed("12{,}6 \\div 3 = 42")),
    check(k("divisionDecimalDividend", 6), () => big("9{,}6 \\div 3"), ["3,2", "32", "0,32"], 0),
  ],
  // 4,5 ÷ 0,3: make the divisor whole first, then it's 45 ÷ 3.
  divisionDecimalDivisor: [
    concept(k("divisionDecimalDivisor", 1), () => big("4{,}5 \\div 0{,}3")),
    step(k("divisionDecimalDivisor", 2), () => big("4{,}5 \\div 0{,}3 = 45 \\div 3")),
    step(k("divisionDecimalDivisor", 3), () => big("\\frac{4{,}5 \\cdot 10}{0{,}3 \\cdot 10} = \\frac{45}{3}")),
    step(k("divisionDecimalDivisor", 4), () => figure(D45_3)),
    step(k("divisionDecimalDivisor", 5), () => big("2{,}46 \\div 0{,}12 = 246 \\div 12")),
    mistake(k("divisionDecimalDivisor", 6), () => crossed("4{,}5 \\div 0{,}3 = 4{,}5 \\div 3")),
    check(k("divisionDecimalDivisor", 7), () => big("4{,}5 \\div 0{,}3"), ["15", "1,5", "150"], 0),
  ],
  divisionRounding: [
    concept(k("divisionRounding", 1), () => big("125{,}25 \\div 12{,}7 = 9{,}86\\ldots \\approx 9{,}9")),
    step(k("divisionRounding", 2), () => big("9{,}8\\underline{6} \\;\\Rightarrow\\; 9{,}9")),
    step(k("divisionRounding", 3), () => big("4{,}2\\underline{3} \\;\\Rightarrow\\; 4{,}2")),
    mistake(k("divisionRounding", 4), () => crossed("9{,}86 \\approx 9{,}8")),
    check(k("divisionRounding", 5), () => big("4{,}27"), ["4,3", "4,2", "4,27"], 0),
  ],
};
