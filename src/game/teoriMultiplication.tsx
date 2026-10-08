/**
 * Theory for the bigger multiplications set up in columns (engine/multiply.ts):
 * two-digit multipliers and decimals. Each works one example through on the
 * board itself, a move at a time - the same layout the child writes on.
 */
import { planGuided } from "../mathinput/guidedPlan";
import type { TeoriSlide } from "./teoriContent";
import { big, check, concept, crossed, mistake, step } from "./teoriAdvanced";
import { PlanFigure } from "./TrappanFigure";

export type MultiplicationTopic = "multiplicationTwoDigit" | "multiplicationDecimal" | "multiplicationDecimalDecimal";

const k = (topic: MultiplicationTopic, n: number) => `teori.mul.${topic}.${n}`;

/** `top` · `bottom` written with `dTop` and `dBottom` decimals, filled in up to box `until` (all of it without), the last `fresh` moves highlighted. */
const figure = (top: number, bottom: number, until?: string, fresh = 1, dTop = 0, dBottom = 0) => (
  <PlanFigure plan={planGuided("×", top, bottom, { top: dTop, bottom: dBottom })} until={until} fresh={fresh} maxWidth={220} />
);

export const MULTIPLICATION_TEORI: Record<MultiplicationTopic, TeoriSlide[]> = {
  // 23 · 14: a row for the 4, a row for the 1 (one step left), then add.
  multiplicationTwoDigit: [
    concept(k("multiplicationTwoDigit", 1), () => figure(23, 14, "")),
    step(k("multiplicationTwoDigit", 2), () => figure(23, 14, "p0:1", 2)),
    step(k("multiplicationTwoDigit", 3), () => figure(23, 14, "p1:2", 2)),
    step(k("multiplicationTwoDigit", 4), () => figure(23, 14, "p1:sign")),
    step(k("multiplicationTwoDigit", 5), () => figure(23, 14, "s:2", 3)),
    mistake(k("multiplicationTwoDigit", 6), () => crossed("23 \\cdot 14 = 92 + 23 = 115")),
    check(k("multiplicationTwoDigit", 7), () => big("12 \\cdot 13"), ["156", "48", "146"], 0),
  ],
  // 3,4 · 6: 3,4 becomes 34 (one decimal away), 34 · 6 = 204, one decimal back: 20,4.
  multiplicationDecimal: [
    concept(k("multiplicationDecimal", 1), () => figure(34, 6, "kt:0", 1, 1, 0)),
    step(k("multiplicationDecimal", 2), () => figure(34, 6, "p0:2", 3, 1, 0)),
    step(k("multiplicationDecimal", 3), () => figure(34, 6, undefined, 1, 1, 0)),
    step(k("multiplicationDecimal", 4), () => figure(125, 3, undefined, 1, 2, 0)),
    mistake(k("multiplicationDecimal", 5), () => crossed("3{,}4 \\cdot 6 = 204")),
    check(k("multiplicationDecimal", 6), () => big("2{,}5 \\cdot 3"), ["7,5", "75", "0,75"], 0),
  ],
  // 0,2 · 0,03: 2 · 3 = 6, 1 + 2 decimals back: 0,006. And 2,5 · 1,3 = 3,25.
  multiplicationDecimalDecimal: [
    concept(k("multiplicationDecimalDecimal", 1), () => figure(2, 3, "ks:0", 3, 1, 2)),
    step(k("multiplicationDecimalDecimal", 2), () => figure(2, 3, "p0:0", 1, 1, 2)),
    step(k("multiplicationDecimalDecimal", 3), () => figure(2, 3, undefined, 1, 1, 2)),
    step(k("multiplicationDecimalDecimal", 4), () => figure(25, 13, undefined, 1, 1, 1)),
    mistake(k("multiplicationDecimalDecimal", 5), () => crossed("0{,}2 \\cdot 0{,}03 = 0{,}6")),
    check(k("multiplicationDecimalDecimal", 6), () => big("0{,}4 \\cdot 0{,}2"), ["0,08", "0,8", "0,008"], 0),
  ],
};
