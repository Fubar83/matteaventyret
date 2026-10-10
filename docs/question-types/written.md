# Written questions — `written`

Everything answered by writing on the free board, from åk 1's word problems to
gymnasiet's integrals: 66 levels of `kind: "expression"`. Facts to know, like
the times tables, ask for just the answer instead.

## Levels

One type; its levels come from five topic modules in
`engine/questions/written/`, which share the model in `problem.ts`:

| Module | Levels | Covers |
|---|---|---|
| `basicTopics.ts` | 1.2.2, 1.4.1–1.4.3, 1.5.2, 1.6.1, 2.9.4, 2.9.5, 2.10.3, 2.12.1, 2.13.1, 2.14.1, 2.15.1 | åk 1–6: the times tables, sharing, the missing number, time, money, corners and edges, angles, coordinates, equations, primes, estimation |
| `wordProblems.ts` | 1.3.1, 1.3.2, 2.11.1, 2.11.2, 3.8.1, 3.8.2 | textuppgifter, one step to several, percent, equations from the words |
| `geometry.ts` | 1.2.1, 2.4.1–2.4.4, 3.4.3–3.4.6, 4.2.2, 4.2.3 | perimeter and area with a figure: rectangles to composite shapes, circles, sectors, the area rule |
| `examTopics.ts` | 2.6.1–2.6.4, 2.9.1–2.9.3, 2.10.1, 2.10.2, 3.3.7, 3.4.7, 3.4.8, 3.5.1, 3.6.1, 3.6.2, 3.7.1, 3.7.2, 4.1.3 | the national tests' topics: fractions, units, order of operations, rounding, speed, scale, probability, volume, sequences, equation systems |
| `advanced.ts` | 3.1.1–3.1.3, 3.2.1, 3.2.2, 3.3.1–3.3.6, 3.4.1, 3.4.2, 4.1.1, 4.1.2, 4.2.1, 4.3.1, 4.3.2 | åk 7–9 and gymnasiet: negative numbers, powers, percent, algebra, the square rules, quadratics, Pythagoras, lines, pq, logarithms, trigonometry, derivatives, integrals |

Each level's title is `stage.<id>` in `i18n/`.

## The question

`WrittenProblem` (`engine/questions/written/problem.ts`):

| Field | |
|---|---|
| `promptKey`, `promptVars` | the question in words (i18n) and its values |
| `display` | the task in LaTeX, shown big; empty when the words say it all |
| `answer` | an `AnswerSpec`, which written work is checked against (below) |
| `tipKey`, `firstStep`, `solution` | the help ladder: a tip, the first step, the whole worked solution (LaTeX lines) |
| `steps` | the solution as guided steps; `stepsOf` makes them from `solution` when absent |
| `figure` | geometry: the shape, its measurements marked (`GeometryFigure`) |
| `scene` | a picture for young children: a `balance`, `groups`, `share`, `rounding` or `units` (the unit staircase) |
| `unit` | the answer's unit ("cm", "m²"), written after it but not part of the number |
| `answerOnly` | a fact to know: just the answer, picked among `choices` or written |

**`AnswerSpec`**, what counts as right:

| Kind | Right when |
|---|---|
| `value` | the number, with Swedish decimals. `approx` answers (π, sin) may be written with ≈ and must be the exact value correctly rounded (π as 3,14 allowed). `fraction`: a fraction in its lowest terms (2/3, not 4/6 or 0,666…) |
| `solutions` | every solution of an equation (`x = 2` and `x = −3`); some still missing is not wrong, just not done |
| `expression` | an expression equal to `latex`, in its required `form`: `expanded` (utveckla) or `factored` (faktorisera) |
| `system` | an equation system's values, one per variable |

Two questions are the same when their level, display, prompt values and worked
solution are; a geometry question is all in its figure.

## How it's made

- Numbers are chosen so answers come out whole, or with one Swedish decimal,
  as school exercises do.
- Every worked solution must check out step by step and end solving the
  question (`engine/__tests__/solutionSteps.test.ts`), and every level's
  prompt and tip must exist in both languages with its placeholders filled
  (`game/__tests__/content.test.ts`).
- The times tables (1.4.1) are `answerOnly`; their wrong choices are the
  slips children make: the next or previous fact in either table, then the
  sum (`tableChoices`).

## How it's played

`game/questions/written/ExpressionPlayer.tsx` shows the scene, the figure,
the words and the display, then either:

- **The free board** (`FreeSolver`): the whole solution written on one board
  (`WorkPad`), any way the child likes. A chain on one line counts:
  "4 · 3 + 5 · 2 = 12 + 10 = 22". A dot is the times sign. "Kontrollera"
  checks the answer and every line (`mathinput/workCheck.ts`):
  - right, with a correct calculation leading to it → the full setup;
  - some solutions still missing, or the right value not yet in the asked
    form (not expanded, not factored, not simplest) → not a wrong try, just
    one more step;
  - wrong → the first line that doesn't hold is named, and **numbers that
    aren't in the question** (a 5 where the figure says 6) are marked red;
  - a second wrong try opens the tip, a third the whole solution;
  - "🧮 Ställ upp" opens a column calculation (`ColumnHelper`) for a step
    that needs one.
- **Just the answer** (`QuickAnswer`, for `answerOnly`): picked among the
  choices, or written in boxes. The child picks the way, and it's
  remembered (`localStorage`). Two wrong picks, or three written tries, show
  the answer.

Stars use `triedOutcome`. On the free board the written work is the setup,
so ★★★ is a correct calculation leading to the answer, even after a wrong
try. A quick answer has nothing to set up, so ★★★ is right the first time.

**Handwriting**: the board is read with the stage's writing level, narrowed
by its recognition profile (`recognition/profiles.ts`): digits and the
operators the topic needs, letters only where they belong, powers only where
asked. Profiles on the full model read strokes in order (`strictOrder`).

## Must stay true

- Every worked solution checks out and ends solving its question
  (`solutionSteps.test.ts`); every text exists in Swedish and English
  (`content.test.ts`).
- A number's unit is never part of it ("24 cm" is 24).
- An equal but unfinished answer (wrong form, missing solutions) is never
  counted as a wrong try.
- Every freely written level has a recognition profile
  (`recognition/__tests__/profiles.test.ts`).
- No step-by-step boxes for written questions (user's decision, 2026-10). The
  `steps` are kept as content.

## Known gaps

- No graphs to draw or read (functions, coordinates drawn by hand).
- Word problems keep their stories with their maths (`wordTexts` in
  `wordProblems.ts`), not in `i18n/`; the content test checks them all the
  same.
