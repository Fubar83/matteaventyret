# The number line — `numberLine`

"Tallinjen": a number to place on a number line. The line has its ticks but
only some of them numbered; the child **taps where the number goes** (or
nudges the marker with ◀ ▶) and presses **Rätta**. Förskoleklass to åk 9.

Reading a number line is the written level 1.8.1 (an arrow at a number:
which is it?). This is the other way round: the number given, its place to
find — what number sense is made of: 37 is a bit nearer 40 than 30, 3/4 is
three of four parts, −7 is left of −5, √50 is just past 7.

## Levels

`engine/questions/numberLine/index.ts`:

| Level | Title | Line | Place | Snap | Tolerance |
|---|---|---|---|---|---|
| 0.1.6 | Var på tallinjen? | 0–10, numbered at 0, 5, 10 | a whole number | 1 | exact |
| 1.8.7 | Tallinjen till 100 och 1000 | 0–100 in tens, or 0–1000 in hundreds | 11–89 (110–890), never on a numbered tick | 1 (10) | ± 2 (± 20) |
| 2.6.8 | Bråk på tallinjen | 0–1 or 0–2, a tick every 1/p | 3/4, 5/4 — never a whole | 1/p | exact |
| 2.16.5 | Decimaltal på tallinjen | a whole number to the next, ticks every 0,1 | 2,7 exactly, or 2,35 between ticks | 0,1 (0,01) | exact (± 0,02) |
| 2.17.3 | Negativa tal på tallinjen | −10–10, numbered every 5 | −1 to −9 | 1 | exact |
| 2.16.7 | Inzoomade tallinjer | 3,4–3,5 in hundredths, or 340–350 in ones, numbered at the ends | 3,47, 346 | 0,01 (1) | exact |
| 2.11.4 | Dubbel tallinje | 0–100 % above, 0–240 kr below (the `second` row) | 60 kr — where in percent | 5 | exact |
| 2.9.10 | Tidslinjen | four hours in quarters, numbered every hour | a time, or when a film ends — never on the hour | 15 min | exact |
| 3.1.7 | Uppskatta på tallinjen | 0–10 (or −10–0), every whole number | √50, π, 2π, 22/7, −√20 | 0,1 | ± 0,2 |

## The question

| Field | |
|---|---|
| `prompt`, `target` | the question, and what to place shown big (LaTeX) |
| `value` | where it really is |
| `from`, `to`, `step` | the line and its ticks |
| `labels` | the numbered ticks, each with its LaTeX label |
| `second` | a double number line's other scale, under the first (kr under %) |
| `snap` | where the marker can stand: multiples of it from `from` |
| `tolerance` | how near is right: 0 where the place is on a tick, more where it's estimated between |
| `tip`, `explanation` | the help ladder |

`placed(problem, at)` says whether a place is right, too low or too high —
the player and the tests use the same judgement.

## How it's played

`game/questions/numberLine/NumberLinePlayer.tsx`:

- The line is drawn like the reading line (`MeasurePictures.tsx`'s
  `NumberLine`), and every place the marker can stand is an unseen tap target.
- The marker can be dragged along the line (`useDragPoint`); it snaps to the
  nearest place. A double line shows its second row of labels under the first.
- ◀ ▶ nudge the marker one `snap` — for fine adjustment and the keyboard.
- **Rätta**: a wrong place says which way to go ("lite för långt åt vänster").
  After **two** wrong checks the right place is shown, the marker green.
- Stars: `triedOutcome` — ★★★ is right at the first check.

## Must stay true

- The value is on the line, and the marker can stand on it (a multiple of
  `snap`); nothing to place sits on a numbered tick where that would make it
  reading instead of placing (`engine/__tests__/numberLine.test.ts`).
- Tapped at the value it's right; a snap away beyond the tolerance it's
  wrong, on the right side (`numberLine.test.ts`); every level plays to the
  end on screen (`game/__tests__/numberLineGrid.test.tsx`).

## Known gaps

- No dragging: a tap moves the marker; ◀ ▶ fine-tune it.
- No number lines that don't start at a whole number (34–35 in tenths).
