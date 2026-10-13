# Tree diagrams — `tree`

"Träddiagram": two marbles drawn from a bag. The child puts each branch's
probability on it, then answers: multiply along a path, add the paths that
give what's asked.

## Levels

`engine/questions/tree/index.ts`:

| Level | Title | The second draw |
|---|---|---|
| 3.7.6 | Träddiagram | the marble is put back — the same as the first |
| 3.7.7 | Träddiagram utan återläggning | the marble is kept — one fewer in the bag, one fewer of its colour |

2–5 marbles of each of two colours. The question after: both of the first
colour, both of the second, or one of each (in either order).

## The question

`TreeProblem`: `colors`, `counts`, `replace`, `ask`, `cards` (every branch's
fraction once, and the slips: without replacement the put-back fractions,
with it the kept ones), and `after`, a single-choice question.
`branches` gives the right fractions, unsimplified as read from the bag
(4/10, then 3/9). The after-question's slips:

- one path only, for one of each;
- the fractions added along the path instead of multiplied;
- the put-back answer when the marble is kept;
- one draw's probability.

## How it's played

`game/questions/tree/TreePlayer.tsx`:

- The bag, then the tree: the root, a node per colour, four leaves showing
  the two marbles.
- Drag a card onto a branch, or tap a card and then branches. A card is a
  stamp: it can go on several. Tap a filled branch to clear it.
- **Rätta** checks the tree. Wrong branches are cleared and marked. A kept
  marble read as put back is named ("en kula mindre i påsen").
- Then the question, with the choices. Three wrong in all (tree and question)
  show the answer. Stars: `triedOutcome`.

## Must stay true

- Each node's branches add up to 1; the right answer is the paths multiplied
  and added; every branch has its card and no two cards are worth the same
  (`engine/__tests__/handsOn.test.ts`).
- Every level plays to the end (`game/__tests__/handsOnPlay.test.tsx`).
