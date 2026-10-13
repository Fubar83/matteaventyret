# The unit circle — `unitCircle`

"Enhetscirkeln": drag the point round the circle. Its x is cos v, drawn red
along the x-axis, and its y is sin v, drawn blue up to the point. The exact
values (½, √2/2, √3/2, 1) are marked on both axes, so they're read, not
worked out. Everything here is done without a calculator.

## Levels

`engine/questions/unitCircle/index.ts`:

| Level | Title | Asks | Angle shown? |
|---|---|---|---|
| 4.2.9 | Enhetscirkeln: vinklar | put the point at an angle off the axes: 135°; −60° (counted clockwise); 420° (once round and more). Or anywhere sin v > 0 and cos v < 0 (any of the quadrant's angles) | no — finding it is the task; yes for the signs |
| 4.2.10 | Enhetscirkeln: exakta värden | where sin v (cos v) has an exact value and the other a sign: sin v = 1/2, cos v < 0 → 150°. The other angle with the same sine (180° − v) or cosine (360° − v) | yes |
| 4.2.11 | Radianer | put the point at 3π/4, 7π/6, −π/3 … (multiples of 30° and 45°) | no |

## The question

`UnitCircleProblem`: `unit` (`deg`, `rad`: the labels round the circle),
`showAngle`, `answers` (every angle that's right, whole degrees 0–359, steps
of 15), `start` (never an answer), `about` (what's asked, for saying why a
place is wrong), and `display`, the task in LaTeX ("sin v = 1/2, cos v < 0").

`exact` writes a value as LaTeX, `exactText` as plain text, and `radians` an
angle as a fraction of π. `unitCircleWhy` names the slip:

- counted clockwise;
- the given angle itself, when the other one is asked;
- the right sine but the wrong sign of cos (or the other way round);
- sin is y, cos is x;
- near, or just counted wrong.

## How it's made

- **4.2.9**: a multiple of 15° that isn't on an axis; written as itself,
  minus 360° or plus 360°. A quarter of the questions ask for a quadrant
  instead, by the signs of sin and cos.
- **4.2.10**: an angle from the table's family (30°, 45°, 60° and their
  mirrors), not on an axis. Given sin, the sign of cos tells the two angles
  with that sine apart; given cos, the sign of sin. So exactly one angle
  fits. "The other angle": sin from 15°–165°, cos from either half.
- **4.2.11**: one of 15 angles, a quarter of them negative.

## How it's played

`game/questions/unitCircle/UnitCirclePlayer.tsx`:

- **Drag** anywhere on the picture (`useDragPoint`): the point follows the
  finger round the circle, snapping every 15°. ⟲ ⟳ turn it one step.
- What moves with it: the radius, the angle's arc from the positive x-axis,
  cos v red along the x-axis, and sin v blue up to the point (dashed across
  to the y-axis). There's a faint mark every 15° round the circle, and the
  axes' angles are named (0°, 90°, … or 0, π/2, …).
- The angle is written out ("v = 150°") where finding it isn't the task, and
  after the answer.
- **Rätta**; after **two** wrong checks the point moves to the answer.
  Stars: `triedOutcome`.

## Must stay true

- Every answer fits what's asked; a value with a sign has exactly one angle;
  the start is never an answer (`engine/__tests__/trig.test.ts`).
- No numbers on the point while the angle is the task.
- Every level plays to the end on screen (`game/__tests__/newTypesPlay.test.tsx`).
