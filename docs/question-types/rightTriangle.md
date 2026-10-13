# The right triangle by hand — `rightTriangle`

The first steps of trigonometry, before any value is worked out: which side
is which seen from the angle v, and which two sides make sin v, cos v and
tan v. Both are done by dragging. The shape and the side roles are shared
with the trigonometry choices (`choice/trig.ts`, 4.2.6–4.2.7) and the written
trigonometry (`written/advanced.ts`, 4.2.8).

## Levels

`engine/questions/rightTriangle/index.ts`:

| Level | Title | Task |
|---|---|---|
| 4.2.4 | Namnge sidorna | drag motstående katet, närliggande katet and hypotenusa onto the three sides |
| 4.2.5 | Bygg sin, cos och tan | the sides' lengths (a Pythagorean triple) dragged into a fraction that makes sin v, cos v or tan v |

## The question

`RightTriangleProblem`: `mode` (`name`, `ratio`), `shape` (a
`TriangleShape`), and for a ratio `lengths` ([leg 1, leg 2, hypotenuse]) and
`fn`.

**`TriangleShape`**: `legs` (their proportions), `turn` (0–330°, steps of
30), `flip` (mirrored), `angleAt` (v at the far end of leg 1, or of leg 2).
`roleOf(angleAt, side)` is what a side is seen from v: the hypotenuse is
across from the right angle, and of the legs the one touching v is
adjacent. `RATIO` says what each ratio is; `ratioOf` names a fraction of two
roles, upside down included.

## How it's made

- **4.2.4**: any of nine leg proportions (3:4, 5:12, 1:1, 1:1,7 …, either
  way round), any turn, mirrored half the time, v at either corner. The
  child can't learn "the bottom side is adjacent".
- **4.2.5**: a triple from `TRIPLES` (3-4-5, 5-12-13, 8-15-17, 7-24-25 and
  multiples), its legs in either order, drawn to scale; sin, cos or tan.

## How it's played

`game/questions/rightTriangle/RightTrianglePlayer.tsx`, drawn by
`game/scenes/TrigPictures.tsx`'s `RightTriangle`. That drawing fits the
triangle, marks the right angle and v, and puts each label straight out from
its side's middle, just far enough to clear it (`rightTriangleLayout`).

- **Naming**: a dashed place by each side. Drag a name onto it, or tap a name
  and then the place; tap a placed name to take it back. Rätta: the right
  ones turn green and stay, the wrong ones come back, and the first is named
  ("Sidan du kallade hypotenusa är närliggande katet").
- **Building**: "tan v = ▢/▢". Drag a length into the numerator or the
  denominator, or tap it (the next empty place). The lengths are smallest
  first, not in the sides' order. A wrong fraction says what it is: upside
  down, another ratio ("det där är cos v"), or not a ratio of v at all.
- After **two** wrong checks the answer is shown. Stars: `triedOutcome`.

## Must stay true

- Each side has exactly one role from v; the hypotenuse is always across
  from the right angle (`engine/__tests__/trig.test.ts`).
- The right fraction is accepted and upside down is named
  (`trig.test.ts`); 4.2.5's lengths are a Pythagorean triple.
- Every level plays to the end on screen (`game/__tests__/newTypesPlay.test.tsx`).
