# The ten frame — `tenFrame`

"Tiorutan": two rows of five cells, filled with counters. A number is seen as
"five and some more" and as so many short of ten. That's the foundation for
adding over ten.

## Levels

`engine/questions/tenFrame/index.ts`:

| Level | Title | Task |
|---|---|---|
| 0.1.9 | Tiorutan | put n counters (1–10) in an empty frame |
| 1.7.6 | Tiorutan: till tio | n red counters are there (1–9); add blue ones until it's 10 — "6 + 4 = 10" written above, filling in as they're added |
| 1.7.7 | Över tiotalet | a + b (a 6–9, the sum over 10, b ≤ 9) in two frames: move counters from the second to the first until it's full, then it reads "10 + 3", and the sum is picked |

## The question

`TenFrameProblem`: `mode` (`show`, `toTen`, `overTen`), `given` (the counters
in each frame at the start), `target` (the counters wanted, or the sum).
`sumChoices` gives the sums to pick among: the sum, one either side, and ten
less (the full frame forgotten).

## How it's played

`game/questions/tenFrame/TenFramePlayer.tsx`:

- **Showing, to ten**: tap a cell to put a counter there, tap it again to take
  it away; or drag one from the pile. The given red counters stay.
- **Over ten**: tap the second frame and a counter jumps to the first one's
  next empty cell (ringed, so the move is seen). When the first is full the
  equation changes from "8 + 5" to "10 + 3", and the sums appear.
- **Rätta**: too many or too few is said, with how many there are. After
  **two** wrong checks it's filled in. Stars: `triedOutcome`
  (`useCheckTries`).

## Must stay true

- Every question fits its frames, and over ten passes ten
  (`engine/__tests__/handsOn.test.ts`).
- Every level plays to the end (`game/__tests__/handsOnPlay.test.tsx`).
