# The equation balance — `balance`

"Ekvationsvågen": an equation as a balance, level because both sides weigh
the same. Whatever is done to one pan is done to the other: take weights off,
take an x off, share both into equal parts. Solved when one pan holds a lone
x and the other only weights. Each step is written as the equation it leaves,
so the balance and the algebra are seen to be one thing.

## Levels

`engine/questions/balance/index.ts`:

| Level | Title | Equations |
|---|---|---|
| 2.14.2 | Ekvationsvågen | x + b = c |
| 3.3.10 | Ekvationsvågen: dela | ax + b = c — take b off, share in a |
| 3.3.11 | Ekvationsvågen: x på båda sidor | ax + b = cx + d — take cx off first |

Sometimes the x-side is on the right.

## The question

`left`, `right` (each a `Pan`: x-boxes and weights in all), `answer`, `steps`
(the fewest steps). `applyStep` does a step to both pans, or says why it
can't be done (too few weights, no x on one side, not shareable); `solvedValue`
reads x off the pans when it stands alone. `panLatex` writes a pan.

## How it's played

`game/questions/balance/BalancePlayer.tsx`: a balance that moves, with its
x-boxes and weights (10, 5 and 1).

- **Lift a thing** off one pan by tapping it. The beam tips by the real
  difference - x weighs what the answer is - towards the heavier side (at
  most 14°), and "Vågen tippar!" asks for the same off the other side. It
  levels when that comes off. Learning that both sides must change alike is
  the point, so tipping isn't counted as wrong.
- **På båda**: − 1, − 5, − 10 and − x on both pans at once, and "Dela båda i"
  2–6. These only work on a level balance (`balance.why.levelFirst`).
- Every new level state is written below as an equation; the latest is bold.
- **Ångra** takes back the last change, **Börja om** goes back to the start.
- A step that can't be done counts as wrong; after three the solution is
  shown. Solved when a lone x stands on a level balance. Stars:
  `triedOutcome`.

## Must stay true

- The equation holds for the answer, and taking off and sharing reaches it;
  impossible steps say why (`engine/__tests__/newTypes.test.ts`).
- Every level plays to the end on screen (`game/__tests__/newTypesPlay.test.tsx`).
