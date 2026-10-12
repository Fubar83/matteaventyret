# Constructions — `construct`

"Konstruera": drawing with ruler, protractor and compasses, by tapping where
the line ends, where the arm goes, where the corner is.

## Levels

`engine/questions/construct/index.ts`:

| Level | Title | Task | Slip caught |
|---|---|---|---|
| 1.10.4 | Rita en sträcka | a line of whole centimetres along a ruler, starting at 0 or further in | counting from the ruler's 0 |
| 2.12.5 | Rita en vinkel | an angle with a protractor, the first arm pointing right or left | reading the other scale (180° − v) |
| 3.4.13 | Konstruera en triangel | a triangle from three sides: the base AB drawn, compass circles from A and B | — the sides are told |

Reading a protractor is the single-choice level 2.12.4 (`choice.md`).

## The question

A task each: `line` (`start`, `length`, `snap`), `angle` (`degrees`, `base`),
`triangle` (`a`, `b`, `c` — BC, AC, AB). `checkLine`, `checkAngle` (two degrees
either way) and `checkTriangle` (two millimetres) judge and name the slip;
`thirdCorner` is where C is.

## How it's played

`game/questions/construct/ConstructPlayer.tsx`: a ruler, a protractor
(`GeometryPictures.tsx`'s `ProtractorDrawing`, both scales) or the paper with
AB. The line's end, the angle's second arm and corner C are dragged
(`useDragPoint` in `game/questions/dragDrop.tsx`) or put with a tap; both
are mapped from the screen to the drawing through its bounding box.
The compasses are buttons that draw the circles. After two wrong checks the
construction is shown. Stars: `triedOutcome`.

## Must stay true

- The construction where it should be passes; the slips are caught as what
  they are (`engine/__tests__/newTypes.test.ts`).
- Every level plays to the end on screen (`game/__tests__/newTypesPlay.test.tsx`).
