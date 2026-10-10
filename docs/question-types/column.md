# Column questions — `column`

Uppställning: addition, subtraction and multiplication set up in columns, the
written methods taught in Swedish schools. Åk 1–6. Each level has its own
pattern of minnessiffror (carries) and växlingar (borrows), and the child
moves through three phases per method.

## Levels

| Level | Title | Kind | Pattern |
|---|---|---|---|
| 1.1.2 | Addition utan minnessiffra | columnAdd | 2–3 digits, no carry |
| 1.1.3 | Subtraktion utan växling | columnSub | 2–3 digits, no borrow, difference ≥ 10 |
| 1.1.4 | En minnessiffra | columnAdd | 2 digits, a carry from the ones, sum 20–99 |
| 1.1.5 | En växling | columnSub | 2 digits, a borrow from the tens |
| 1.1.6 | Flera växlingar | add and sub | 3 digits, carries or borrows in two or more columns |
| 1.1.7 | Växling över nollor | mostly sub | 3–4 digits, borrowing across one or two zeros (85 %) |
| 2.1.1 | 2-siffrigt · 1-siffrigt, utan minnessiffra | columnMul | 23 · 3 |
| 2.1.2 | Med minnessiffra | columnMul | a carry from the ones |
| 2.1.3 | 3-siffrigt · 1-siffrigt | columnMul | carries in one or two columns |
| 2.3.3 | Addition och subtraktion med tiondelar | add and sub | 4,7 + 2,5 · 12,5 − 3,8: carries and borrows across the comma |
| 2.3.4 | Olika antal decimaler | add and sub | 3,5 + 1,25 · 4,2 − 1,75: one number with tenths only |

## The question

`ColumnProblem` (`engine/questions/column.ts`): `kind` (columnAdd / columnSub /
columnMul), `top`, `bottom`, `answer`. Then, for decimals:

- **`decimalPlaces`**: both numbers are integers at this scale (4,7 is 47 with 1).
- **`topDecimals` / `bottomDecimals`**: set when a number has fewer decimals
  than that (the 3,5 in 3,5 + 1,25). Its last digit is a 0 to think of, which
  the board draws faint and dashed.

Two questions are the same when their kind, top and bottom are.

## How it's made

- Numbers are built **column by column to the level's exact pattern**
  (`buildAdditionWithCarryPattern` and its siblings), then **re-verified** by
  `engine/verifier.ts`, which never imports the generators. A mismatch throws:
  a generator bug must never reach a child.
- No trivial questions (an operand ≤ 1, top = bottom). At most one 0 digit
  per operand, except where zeros are the point (1.1.7).
- Decimals are integer arithmetic at a fixed scale, never floating point.
- 2.3.4 always has one number with tenths only, either way round. On top in a
  subtraction, its padded 0 has to borrow.

Generation changed on purpose in 2026-10: 2.3.3 and 2.3.4 had been built
with no carries at all and with equal decimals.

## How it's played

`game/questions/column/ColumnProblemPlayer.tsx`. The board
(`game/draw/columnBoardLayout.ts`) has a box for every cell: each result
digit, each minnessiffra, each borrowed ten. The cells and their order come
from the method plugins in `engine/methods/` through `engine/arithmetic.ts`.

**Phases**, per method, not per level (`game/phaseProgress.ts`):

| Phase | How it's played | Moves |
|---|---|---|
| Guidat | only the next cells open, each checked at once | up after 4 good questions in a row (one hint allowed in the streak) |
| Egen ordning | any order, a nudge when out of order, each cell checked at once | up after 4 in a row (one nudge allowed) |
| Fritt | everything open, checked all at once with följdfel ("Rätta") | down is suggested after 3 questions in a row with an original error |

**Per cell**, in the guided phases: a wrong digit gives "Försök igen". A second
gives a hint diagnosed from the mistake (`engine/hints.ts`, e.g. a forgotten
minnessiffra). A third shows the digit.

**Stars:** help (the ladder, a diagnosed hint, a shown digit, or the Guidat
phase) is ★. The full setup is every cell right the first time. The
outcome also reports `nudgeUsed` and `hadOriginalError` for the phase rules.

## Must stay true

- Every generated question has its level's exact pattern and is verified
  independently (`engine/__tests__/generator.test.ts`, `verifier.test.ts`).
- 2.3.3 crosses the comma with a carry or borrow in a good share of questions.
  2.3.4 always has exactly one tenths-only number, its padded digit 0, both
  ways round (generator tests).
- A padded 0 is drawn faint, and only that digit (`game/__tests__/drawBoard.test.ts`).
- A minnessiffra of 0 is never asked for; it stays a faint, skippable box.
- Phase is tracked per method (columnAdd, columnSub, columnMul), not per level.

## Where it lives

`engine/questions/column.ts` (levels), `engine/methods/` (the algorithms),
`engine/verifier.ts`, `engine/hints.ts`; `game/questions/column/`,
`game/draw/columnBoardLayout.ts`, `game/cellFlow.ts`, `game/phaseProgress.ts`.

## Known gaps

- No subtraction of decimals with a whole number (5 − 1,25), and no three
  decimals.
