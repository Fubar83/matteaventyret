# Shaping a graph — `graphShape`

"Forma grafen": drag the curve's handles, or step its numbers, until it's the
function asked for. What each number in a formula does is seen as it
changes.

## Levels

`engine/questions/graphShape/index.ts`:

| Level | Title | Function | Numbers |
|---|---|---|---|
| 3.10.5 | Forma linjen | y = kx + m | k −3 to 3 in halves (not 0), m −5 to 5 |
| 4.1.7 | Parabeln i vertexform | y = a(x − h)² + d | a ±½, ±1, ±2; h −3 to 3; d −4 to 4 |
| 4.1.8 | Exponentialfunktioner | y = C · aˣ | C 1–5; a ½, 1,5, 2, 3 |

Half the questions give the **formula** to make. The numbers aren't shown,
so the graph has to be read. Half give the **graph**, dashed, to cover; the
formula is written out as the curve changes.

## The question

`GraphShapeProblem`: `family`, `target`, `start` (y = x, y = x², y = 2ˣ),
`given`. `PARAMS` lists each family's numbers and the values they can take.
`VIEW` is the part of the plane drawn. `valueAt` evaluates the function and
`formula` writes it the school way: y = −(x − 2)² + 3, y = 0,5x, y = 3 · 2ˣ.

## How it's played

`game/questions/graphShape/GraphShapePlayer.tsx`:

- **Handles**: a line's point on the y-axis (m) and one a step to the right
  (k); a parabola's vertex (h, d, dragged both ways) and the point a step from
  it (a); an exponential's value at 0 (C) and at 1 (a). A drag grabs the
  nearest handle and snaps to the allowed values.
- **− / +** per number, stepping through its values (and for the keyboard).
- **Rätta**: the first wrong number is named in words: the slope, where it
  crosses, the vertex sideways or in height, which way it opens, the start
  value or the factor. After **two** wrong checks the curve is set right.
  Stars: `triedOutcome`.

## Must stay true

- The target is reachable by the handles and isn't the start; formulas are
  written as in school (`engine/__tests__/handsOn.test.ts`).
- Given a formula, no numbers are shown while working.
- Every level plays to the end (`game/__tests__/handsOnPlay.test.tsx`).
