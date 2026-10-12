/**
 * Everyday maths as single-choice questions (åk 1-3):
 *
 *   1.5.8 kalendern - the days of the week and the months: what comes after,
 *         what day it is in a few days, how many days a week has
 */
import { pick, randInt, type Rng } from "../../rng";
import { shuffledOptions, text, type ChoiceProblem, type Slip } from "./problem";

export type EverydayChoiceStageId = "1.5.8";

const DAYS = 7;
const MONTHS = 12;
const day = (i: number) => ({ text: text(`weekday.${((i % DAYS) + DAYS) % DAYS}`) });
const month = (i: number) => ({ text: text(`month.${((i % MONTHS) + MONTHS) % MONTHS}`) });

/** 1.5.8: the week and the year, in order. */
function calendar(rng: Rng): ChoiceProblem {
  const kind = rng();
  if (kind < 0.45) {
    // In a few days (or a few days ago).
    const today = randInt(rng, 0, DAYS - 1);
    const n = randInt(rng, 2, rng() < 0.7 ? 4 : 9);
    const after = rng() < 0.75;
    const right = after ? today + n : today - n;
    const slips: Slip[] = [
      { option: day(after ? right - 1 : right + 1), why: text("choice.calendar.whyCountToday") },
      { option: day(after ? today - n : today + n), why: text(after ? "choice.calendar.whyBack" : "choice.calendar.whyForward") },
      { option: day(after ? right + 1 : right - 1), why: text("choice.calendar.whyOneMore") },
      { option: day(today), why: text("choice.calendar.whyToday") },
    ];
    return {
      stageId: "1.5.8",
      kind: "choice",
      prompt: text(after ? "choice.calendar.inDays" : "choice.calendar.daysAgo", { today: `@weekday.${today}`, n }),
      ...shuffledOptions(rng, day(right), slips),
      tip: text("choice.calendar.tipWeek"),
      explanation: text(after ? "choice.calendar.explainInDays" : "choice.calendar.explainDaysAgo", { today: `@weekday.${today}`, n, answer: `@weekday.${((right % DAYS) + DAYS) % DAYS}` }),
    };
  }
  if (kind < 0.8) {
    // The month after (or before).
    const m = randInt(rng, 0, MONTHS - 1);
    const after = rng() < 0.7;
    const right = after ? m + 1 : m - 1;
    return {
      stageId: "1.5.8",
      kind: "choice",
      prompt: text(after ? "choice.calendar.monthAfter" : "choice.calendar.monthBefore", { month: `@month.${m}` }),
      ...shuffledOptions(rng, month(right), [
        { option: month(after ? m - 1 : m + 1), why: text(after ? "choice.calendar.whyBack" : "choice.calendar.whyForward") },
        { option: month(after ? m + 2 : m - 2), why: text("choice.calendar.whyOneMore") },
        { option: month(m), why: text("choice.calendar.whySame") },
      ]),
      tip: text("choice.calendar.tipYear"),
      explanation: text(after ? "choice.calendar.explainMonthAfter" : "choice.calendar.explainMonthBefore", { month: `@month.${m}`, answer: `@month.${((right % MONTHS) + MONTHS) % MONTHS}` }),
    };
  }
  // How many: days in a week, months in a year, days in a month, hours in a day.
  const [what, right, slips] = pick(rng, [
    ["week", 7, [5, 10, 6]],
    ["year", 12, [10, 52, 7]],
    ["day", 24, [12, 60, 7]],
    ["hour", 60, [100, 24, 30]],
  ] as const);
  return {
    stageId: "1.5.8",
    kind: "choice",
    prompt: text(`choice.calendar.howMany.${what}`),
    ...shuffledOptions(
      rng,
      { latex: String(right) },
      slips.map((n) => ({ option: { latex: String(n) } }))
    ),
    tip: text("choice.calendar.tipHowMany"),
    explanation: text(`choice.calendar.explainHowMany.${what}`),
  };
}

export const EVERYDAY_CHOICES: Record<EverydayChoiceStageId, (rng: Rng) => ChoiceProblem> = {
  "1.5.8": calendar,
};
