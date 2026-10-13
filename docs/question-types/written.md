# Written questions — `written`

Everything answered by writing on the free board, from åk 1's mental
arithmetic to gymnasiet's integrals: 81 levels of `kind: "expression"`. Facts to know, like
the times tables, ask for just the answer instead.

## Levels

One type; its levels come from six topic modules in
`engine/questions/written/`, which share the model in `problem.ts`:

| Module | Levels | Covers |
|---|---|---|
| `numberSense.ts` | 1.7.1–1.7.4, 1.8.1, 1.8.4, 1.10.1, 2.20.1 | åk 1–6 number sense: tiokamrater, within 20 over the ten, doubles and halves, tens in the head and hundrakamrater, the number line, patterns, measuring with a ruler, sequences (the 10th number) |
| `basicTopics.ts` | 1.2.2, 1.4.1–1.4.3, 1.5.2, 1.6.1, 2.9.4, 2.9.5, 2.10.3, 2.12.1, 2.13.1, 2.14.1, 2.15.1, 2.18.2 | åk 1–6: the times tables, sharing, the missing number, time, money, corners and edges, angles, coordinates, equations, primes, estimation, combinations (one of these with one of those; a queue) |
| `wordProblems.ts` | 1.3.1, 1.3.2, 2.11.1, 2.11.2, 3.8.1, 3.8.2 | textuppgifter, one step to several, percent, equations from the words |
| `geometry.ts` | 1.2.1, 2.4.1–2.4.4, 3.4.3–3.4.6, 4.2.2, 4.2.3 | perimeter and area with a figure: rectangles to composite shapes, circles, sectors, the area rule |
| `examTopics.ts` | 2.6.1–2.6.4, 2.9.1–2.9.3, 2.10.1, 2.10.2, 3.3.7, 3.4.7, 3.4.8, 3.5.1, 3.6.1, 3.6.2, 3.7.1, 3.7.2, 4.1.3 | the national tests' topics: fractions, units, order of operations, rounding, speed, scale, probability, volume, sequences, equation systems |
| `advanced.ts` | 3.1.1–3.1.3, 3.1.9, 3.2.1, 3.2.2, 3.3.1–3.3.6, 3.3.14, 3.3.18, 3.4.1, 3.4.2, 4.1.1, 4.1.2, 4.1.6, 4.2.1, 4.2.8, 4.2.12, 4.3.1, 4.3.2 | åk 7–9 and gymnasiet: negative numbers, powers and the power laws, percent, algebra (factoring out, multiplying brackets), the square rules, quadratics (and factoring them), Pythagoras, lines, pq, logarithms, trigonometry (exact values, sides and angles without a calculator, equations), derivatives, integrals |

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
| `scene` | a picture (`engine/questions/scene.ts`): a `balance`, `groups`, `share`, `rounding`, `units` (the unit staircase), a `numberLine`, a `ruler` or a `rightTriangle` |
| `unit` | the answer's unit ("cm", "m²"), written after it but not part of the number |
| `answerOnly` | a fact to know: just the answer, picked among `choices` or written |

**`AnswerSpec`**, what counts as right:

| Kind | Right when |
|---|---|
| `value` | the number, with Swedish decimals. `approx` answers (π, sin) may be written with ≈ and must be the exact value correctly rounded (π as 3,14 allowed). `fraction`: a fraction in its lowest terms (2/3, not 4/6 or 0,666…) |
| `solutions` | every solution of an equation (`x = 2` and `x = −3`); some still missing is not wrong, just not done |
| `expression` | an expression equal to `latex`, in its required `form`: `expanded` (utveckla) or `factored` (faktorisera). Factored means all the way: no bracket keeps a common factor (6x + 15 is 3(2x + 5), not 2(3x + 7,5)), and nothing common to every term in it |
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
- The times tables (1.4.1) and the number-sense facts (1.7.x, 1.8.1, 1.8.4,
  1.10.1) are `answerOnly`. Their wrong choices are the slips children make:
  for the tables, the next or previous fact in either table, then the sum
  (`tableChoices`); for 8 + 5, 12 or 3 or 15.
- A number line's arrow is never on a numbered tick, so there's something to
  read; counting on from the nearest numbered tick is the worked step.
- On the ruler, the thing starts at 0, or at a whole centimetre (then it's
  the end minus the start; the end alone is a slip offered).
- **2.4.4**'s L-shape never cuts away exactly half the rectangle: the corner's
  area would then already be the answer. Such a corner is drawn again - only
  those seeds' questions changed (2026-10).
- **The power laws with numbers** (3.1.9): one base (2, 3, 5 or 10), a
  quotient, a product, a power of a power, a negative exponent or both laws,
  always ending at a power small enough to work out (2⁶, 3⁴, 5³, 10⁴).
- **Factoring out** (3.3.14): a number (k(ax + b), a and b without a common
  factor), x (x(x + b)) or both (kx(ax + b)) - the bracket left has nothing in
  common, so the factoring is complete.
- **Multiplying brackets** (3.3.18): a(x + b) − c(x + d), where the minus
  changes every sign in the second bracket; or (x + a)(x + b), four products.
- **Factoring quadratics** (4.1.6): x² + bx + c with two different whole
  roots, not opposite (that's the conjugate rule's).
- **Trigonometry without a calculator** (4.2.8) draws the right triangle
  (`rightTriangle` scene, turned and mirrored, v at either corner). A side:
  the triangle is a Pythagorean triple times 2–4, the ratio is given exact
  (sin v = 3/5) and x is the top of the ratio (x = 20 · 3/5) or, less often,
  its bottom (x = 9 · 5/3). An angle: two sides in a table ratio - 1 : 2 is
  sin 30° or cos 60°, equal legs tan 45° - drawn true to shape. The answer is
  written "v = 30°": a degree sign after a number is a number.
- **Trigonometric equations** (4.2.12), 0° ≤ v < 360°: sin, cos or tan equal to
  ±1/2, ±√2/2, ±√3/2 (tan: ±1/√3, ±1, ±√3), sometimes as 2 sin v = 1 to divide
  first. The worked steps: the acute angle with the value, then both
  solutions ("v = 150°, v = 210°"), each from the unit circle.

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
