# Statistics — `statistics`

Lägesmått, åk 4–6 (Lgr22 "Sannolikhet och statistik"): the mean, the median
and the mode of a few small numbers.

## Levels

| Level | Title | Values | Answer |
|---|---|---|---|
| 2.7.1 | Medelvärde | 4 numbers 1–20 whose sum divides by 4, not all equal | the mean |
| 2.7.2 | Median | 5 numbers 1–20 (an odd count: always one middle value) | the median |
| 2.7.3 | Typvärde | one number three times among four other, different numbers | the mode |

## The question

`StatisticsProblem`: `measure` (mean / median / mode), `values`, `answer`.
Every answer is a whole number. Two questions are the same when their measure
and values are.

## How it's played

`game/questions/statistics/StatisticsPlayer.tsx`:

- The values are shown as tiles, with the question underneath.
- **"Visa hur du tänkte"**: a free board (`WorkPad`), read with the
  `arithmetic` recognition profile.
- The answer is written in boxes (`AnswerBoard`), one per digit of the answer.
- Tries and help follow the shared rules through `useAnswerTries`. The hint
  is the measure's own.

**The full setup** (★★★) is written work, checked even after a wrong answer:

- mean: a true calculation ending in the answer ("12 + 15 + 9 + 4 = 40",
  "40 / 4 = 10");
- median and mode: the values written in order, smallest first.

## Must stay true

- Whole-number answers only; the median from an odd count
  (`engine/__tests__/generator.test.ts`).
- The setup is the work that finds the measure, not just the answer written
  again.

## Known gaps

- The answer box count shows how many digits the answer has (8 vs 12). A
  board that takes 1 or 2 digits would remove that cue.
- No even-count median (the average of the two middle values) and no range
  (variationsbredd).
