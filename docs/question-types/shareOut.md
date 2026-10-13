# Sharing out — `shareOut`

"Dela lika": division as dealing things out. The things are in a bowl and the
animals have a plate each; the child deals until it's fair. Division begins
as this, before any table.

## Levels

`engine/questions/shareOut/index.ts`:

| Level | Title | Task |
|---|---|---|
| 1.4.4 | Dela ut lika | n · each things (2–5 animals, 2–6 each): all of it shared, the same each |
| 1.4.5 | Dela med rest | n · each + rest (rest 1 to n − 1): the same each, and what's left is fewer than the animals |

## The question

`ShareOutProblem`: `thing` (cookies, apples …), `total`, `animals`, `each`,
`rest`. `checkShare` decides, for both levels at once: the plates are equal,
and what's left in the bowl isn't enough for another round. For an exact
sharing that means the bowl is empty.

## How it's played

`game/questions/shareOut/ShareOutPlayer.tsx`:

- Tap a plate — or drag from the bowl onto it — and one thing goes there; tap a
  thing on a plate (or drag it back to the bowl) to return it.
- No numbers are shown while sharing; when it's done, "14 / 4 = 3, rest 2".
- **Rätta**: unequal plates, or enough left for one more each, is said. After
  **two** wrong checks it's shared out right. Stars: `triedOutcome`.

## Must stay true

- `total = animals · each + rest`, rest fewer than the animals; the fair
  sharing is accepted and nothing else (`engine/__tests__/handsOn.test.ts`).
- Every level plays to the end (`game/__tests__/handsOnPlay.test.tsx`).
