# Drawing on a grid — `grid`

"Rutnätet": drawing by tapping — squares to colour, or points to mark on a
coordinate grid. The child taps (again to undo) and presses **Rätta**. Åk
1–9. It's the start of "constructing figures": a symmetric figure finished, a
rectangle of a given area and perimeter, a triangle reflected or moved.

Two kinds:

- **`gridCells`** — squares to colour. Some may be given (half a figure)
  and stay coloured.
- **`gridPoints`** — points to mark on a coordinate grid, with figures
  already drawn (three corners of a rectangle, a triangle).

## Levels

`engine/questions/grid/index.ts`:

| Level | Title | Kind | Asks | Rule |
|---|---|---|---|---|
| 1.2.6 | Symmetri: rita klart | cells | half a figure (4–7 squares) next to a dashed line on 8 × 8 — colour the other half | exactly the mirrored squares |
| 1.9.4 | Färglägg en del | cells | colour 3/4 of 12 squares (grids of 8–20) | how many |
| 2.6.9 | Procent av en figur | cells | colour 35 % of 20 squares (or 25, 4 % each) | how many |
| 2.4.5 | Rita en rektangel | cells | a rectangle of area 12 and perimeter 14 (one shape) — or of area 12 only (any) | a filled rectangle, its area, its perimeter |
| 2.13.2 | Pricka in punkter | points | (3, 5) — sometimes in all four quadrants; the fourth corner of a rectangle | exactly those points |
| 3.4.12 | Spegling och förflyttning | points | a triangle reflected in the x- or y-axis, or moved 3 steps right and 2 down | exactly the image's corners |

## The question

| Field | |
|---|---|
| `gridCells`: `w`, `h`, `given`, `line` | the grid, the squares coloured from the start, a dashed line |
| `gridCells`: `rule` | `exact` (these squares), `count` (this many), `rectangle` (area, and perimeter when given) |
| `gridCells`: `solution` | one right answer, shown when the answer is |
| `gridPoints`: `x`, `y`, `shown` | the axes' range and the figures drawn from the start |
| `gridPoints`: `answer`, `slips` | the points to mark (any order), and wrong answers that are known slips with what to say about them |
| `display` | the fraction or percent shown big, when there is one |

`checkCells` and `checkPoints` judge an answer and say why it's wrong — 2
squares missing and 1 too many, not a rectangle, the perimeter 16 instead of
14, x and y swapped, reflected in the wrong axis. They're in the engine so
the tests check what the child is checked on.

## How it's made

- **Symmetry** grows a shape square by square in the half next to the line,
  touching it, so the finished figure is one piece.
- **Rectangles** are 2–7 by 2–6; area and perimeter together give one shape
  (either way round).
- **Points**: x ≠ y and neither 0, so swapping them is a different point —
  the slip to catch; with negatives, a sign wrong is caught too.
- **Transformations**: the triangle is a real triangle on one side of the
  axis it's reflected in, its image on the grid and apart from it. The slip
  is the other axis, or a move with its steps swapped or the wrong way.

## How it's played

`game/questions/grid/GridPlayer.tsx`:

- Every square and every grid point is a tap target of its own (and a
  button for a screen reader). Given squares are dark blue and stay.
- Three points placed are joined with a dashed line, so a triangle shows.
- **Rätta** says why it's wrong; the answer stays to fix. After **two**
  wrong checks the answer is shown (green) with the explanation.
- Stars: `triedOutcome` — ★★★ is right at the first check.

## Must stay true

- The solution passes its own check, and the known slips don't
  (`engine/__tests__/grid.test.ts`).
- Symmetry: the given and the solution are mirror images across the line,
  apart from each other; rectangles: area and perimeter fit the solution;
  points and images are on the grid (`grid.test.ts`).
- Every level plays to the end on screen — right at once, wrong twice
  (`game/__tests__/numberLineGrid.test.tsx`).

## Known gaps

- Lines, not just squares and points: drawing a segment, a right angle, a
  triangle with ruler and compasses.
- Rotations (åk 7–9) aren't asked yet.
