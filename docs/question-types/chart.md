# Charts — `chart`

Tabeller och diagram (Lgr22 "Sannolikhet och statistik"): reading a chart -
bars over four kinds of fruit, a pictogram, a line chart of the temperature
through a day. Reading bars and pictograms is åk 1–3; comparing, summing and
line charts are åk 4–6.

## Levels

| Level | Title | Asks | Bars show their numbers? |
|---|---|---|---|
| 2.8.1 | Läsa av ett diagram | how many of one fruit | all but the one asked ("?") — read it off the scale |
| 2.8.2 | Jämföra i diagram | the difference between two (they're highlighted) | yes |
| 2.8.3 | Summera i diagram | all the fruit together | yes |
| 2.8.4 | Piktogram | how many of one fruit (count the pictures, each is 2); the difference between two rows | no numbers — counting the pictures twice is the reading |
| 2.8.5 | Linjediagram | the temperature at a time (kl 8–16); how many degrees warmer one time was than another | no numbers — read it off the scale |

## The question

`ChartProblem`: `style` (`bar`, `pictogram`, `line`), `categoryKeys` (the four
fruit, or the line chart's five times, i18n keys), `values` (1–15 each), `questionType` (lookup / difference / sum), `askIndex` (lookup),
`compareIndices` (difference), `answer`. Two questions are the same when
their question type, values and asked bars are.

## How it's made

Four values 1–15. A difference is between two bars of different heights, so
it's never 0 - and a pictogram's or line chart's difference is the bigger
minus the smaller, the bigger asked first. A pictogram's values are even
(each picture is `PICTOGRAM_UNIT`, 2). A line chart's day warms up to the
early afternoon, then cools a little, 0–15 degrees.

## How it's played

`game/questions/chart/ChartPlayer.tsx`:

- **The chart**: a scale of 0–15 with its numbers centred on their lines, a
  dashed line at every 5 and a faint line at every whole number. That's what
  makes reading a hidden bar's height exact (2.8.1), not a guess.
- A difference and a sum have **"Visa hur du tänkte"** (a free board). Its
  calculation is the full setup for ★★★. Reading one bar has nothing to set
  up: ★★★ is right the first time.
- The answer is written in boxes. Tries and help follow the shared rules
  through `useAnswerTries`.

## Must stay true

- The scale's maximum (`CHART_MAX_VALUE`) is the largest value a level makes
  (15).
- In a lookup, the asked bar's number is hidden until it's answered or shown.
- A difference is never 0.

## Known gaps

- Bar charts only: no tables, line charts or pictograms.
- The answer box count shows how many digits the answer has.
