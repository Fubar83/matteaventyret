# Drawing a chart — `drawChart`

"Rita diagrammet": the numbers are in tally marks or a table, and the child
drags each bar, or each point of a line, to its height. Lgr22 has tables and
charts *made* from åk 1–3; the `chart` type (2.8.x) reads them. The chart
doesn't write the values, so the scale has to be read, as in a real one.

## Levels

`engine/questions/drawChart/index.ts`:

| Level | Title | From | Chart | Scale |
|---|---|---|---|---|
| 1.13.2 | Rita stapeldiagram | four fruit in tally marks, 1–10, all different | bars | 0–10, a line every 1, numbered every 2 |
| 2.8.7 | Stapeldiagram från en tabell | votes for four sports, multiples of 5 up to 50, at least two not a multiple of 10 | bars | 0–50, a line every 5, numbered every 10 |
| 2.8.8 | Rita linjediagram | the temperature at kl 8–16 | a line through five points | −5 to 15, a line every degree, numbered every 5 |

## The question

`DrawChartProblem`: `style` (`bar`, `line`), `source` (`tally`, `table`),
`labelKeys` (the bars' or times' names: `chart.cat.*`, `sport.*`,
`chart.time.*`), `what` (the table's row heading), `values`, the scale
`min`, `max`, `step` (what a bar snaps to), `labelEvery`, and `start` (where
the bars and points stand at first: 0). `rightOnes` says which are right.

## How it's made

- **1.13.2**: four different counts out of 1–10, so the bars differ.
- **2.8.7**: four different multiples of 5, at least two between the
  numbered lines (15, 35).
- **2.8.8**: a day that warms up three times (by 1–4, 1–4, 0–3 degrees) and
  cools once at the end, starting at −5 to 6. It stays on the scale, never
  stands at 0 (where the points start), and has at least three values off
  the numbered lines.

## How it's played

`game/questions/drawChart/DrawChartPlayer.tsx`:

- The tally (`TallyTable`) or a two-row table on top; the chart below.
- **Drag** in a bar's column: the bar's top (a dark handle) or the line's
  point follows the finger, snapping to the scale's lines. The column is
  picked when the finger goes down and kept while it moves. ▲ ▼ under each
  column move one line, for the last bit and for the keyboard.
- **Rätta**: the right ones turn green and stay (their ▲ ▼ are disabled); the
  wrong ones turn red, a wrong one at 0 tints its column. The first wrong one
  is named ("Stapeln för fotboll är för låg"), with how many more.
- After **two** wrong checks the chart is drawn right, in green, with the
  explanation. Stars: `triedOutcome` — ★★★ is right at the first check.

## Must stay true

- Every value is on the scale and on one of its lines, and none is where the
  bars start (`engine/__tests__/drawChart.test.ts`).
- 2.8.7 and 2.8.8 have values between the numbered lines.
- The chart never writes the values while working.
- Every level plays to the end on screen, and a wrong check keeps the right
  bars (`game/__tests__/newTypesPlay.test.tsx`).
