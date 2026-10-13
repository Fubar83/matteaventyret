# Number pyramids — `pyramid`

"Talpyramider": every brick is the sum of the two under it. Some bricks are
given; the rest are worked out, by adding up or by subtracting down. The
answers are written by hand, a brick at a time.

## Levels

`engine/questions/pyramid/index.ts`:

| Level | Title | Task |
|---|---|---|
| 1.7.8 | Talpyramider | three at the bottom, the top at most 20 — add up |
| 2.1.7 | Talpyramider till 100 | four at the bottom to add up (top ≤ 100), or three with bricks missing low down: the brick above minus its neighbour |
| 3.3.19 | Algebrapyramid | a, x, b at the bottom, the middle written "a + x" and "x + b", the top given: x from a + 2x + b = top |

## The question

`PyramidProblem`: `values` (every brick, row by row from the bottom),
`shown` (given or not), `labels` (the algebra pyramid's expressions).
`build` makes a pyramid from its bottom row. `solveOrder` finds the order the
hidden bricks can be worked out in, or null when something can't be found.
2.1.7's mixes of given bricks are four that can be solved (`GIVEN_3`): from
the bottom up, or from the top and a side down.

## How it's played

`game/questions/pyramid/PyramidPlayer.tsx`:

- Given bricks are sand-coloured. Tap an empty one (the first is chosen
  already) and write its number on the `AnswerBoard` under the pyramid.
- A right number stays (green) and the next empty brick is chosen. A wrong
  one is wiped and counts; the message says how a brick is found. After
  **three** wrong numbers the pyramid is filled in. Stars: `triedOutcome`.

## Must stay true

- Every brick is the sum of the two under it, no brick is 0 or less, and
  every hidden brick can be worked out (`engine/__tests__/handsOn.test.ts`).
- Every level plays to the end; the board is stubbed there
  (`game/__tests__/handsOnPlay.test.tsx`).
