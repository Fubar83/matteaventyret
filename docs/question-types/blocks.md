# Building with blocks — `blocks`

"Bygg talet": base-ten blocks — ones, ten-rods, hundred-plates; for decimals
a whole plate cut into tenth-rods and hundredth-cubes. The child adds and
takes blocks and changes one block into ten smaller (växling). The total isn't
shown: working it out is the task.

## Levels

`engine/questions/blocks/index.ts`:

| Level | Title | Mode | Asks |
|---|---|---|---|
| 0.1.8 | Bygg talet till 20 | build | 10–20 with tens and ones |
| 1.14.1 | Bygg tresiffriga tal | build | a three-digit number, often with a 0 (407, 350) |
| 1.14.2 | Växla och ta bort | take | 52 take 7: fewer ones than are taken, so a ten has to be changed — växling, as in a column subtraction |
| 2.16.6 | Bygg decimaltal | build | 2,35 or 1,07 — a whole is a plate, a tenth a rod, a hundredth a cube |

(1.14.x, not 1.1.x: the 1.1 levels are Siffer-Slukaren's, and its gate counts
every level whose id starts with 1.1.)

## The question

`places` (biggest first, as powers of ten), `start` (the blocks there from the
start), `mode` (`build`: add and take freely; `take`: only take away and change
one into ten), `target`.

`checkBlocks` judges: the value, and — when building — at most nine of a kind
(41 tens is 410, but that's not how 410 is written).

## How it's played

`game/questions/blocks/BlocksPlayer.tsx`: a column per place with its blocks
drawn as in the place value picture; − and + per place, "Växla 1 → 10" on all
but the smallest, "Växla 10 → 1" when building. The same can be done by hand
(`useDragDrop`): when building, a block from the supply row into its column;
a block from a pile into the bin takes it away, and onto the next smaller
column changes it into ten. Rätta; after two wrong checks the fewest blocks
are shown. Stars: `triedOutcome`.

## Must stay true

- The fewest blocks for the target pass the check; in `take`, the start is the
  number and there are fewer ones than are taken; ten of a kind is caught
  (`engine/__tests__/newTypes.test.ts`).
- Every level plays to the end on screen (`game/__tests__/newTypesPlay.test.tsx`).
