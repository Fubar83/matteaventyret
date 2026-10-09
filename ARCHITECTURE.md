# Architecture

MatteÄventyret is a Swedish maths training game for åk 1 to gymnasiet. Children
answer by **writing with a finger or pen**; an on-device recognizer reads the
handwriting and the game checks the maths. It is a static web app (React +
TypeScript + Vite), works offline as a PWA, and has no server.

This document is the map: where things live, how a question flows from a
level to stars, the rules the code keeps, and how to extend it. It is written
for people and for coding agents alike - the agent-specific working rules are
in [AGENTS.md](AGENTS.md).

## The big picture

```
                 ┌────────────────────────── src/engine ───────────────────────────┐
 game/stages.ts  │  generator.ts ── QUESTION_TYPES ──► questions/<type>.ts          │
 (levels: path,  │   generateRound(stage) ─► levels[stage](rng) ─► problem          │
  grade, opens)  │   problemKey(problem)  ◄── type.key                              │
        │        │  verifier.ts · methods/ (column algorithms) · scoring.ts         │
        ▼        └──────────────────────────────────┬──────────────────────────────┘
 game/RoundScreen ──────── problems ─────────────────┘
        │
        ▼
 game/questions/QuestionPlayer ── PLAYERS[problem.kind] ──► <type>/…Player.tsx
        │                                                       │ ink
        │                                         game/draw (DrawBoard, WorkPad)
        │                                                       │ strokes
        │                              mathinput/ (segment → classify → layout → LaTeX,
        │                                          check work against the answer)
        │                                                       │
        │                                         recognition/ (tfjs models, profiles)
        ▼
 QuestionOutcome (help used? full setup?) ─► engine/scoring ─► stars, XP ─► storage/save
```

## Folders

| Folder | What it is | Depends on |
|---|---|---|
| `src/engine/` | Pure TypeScript maths: question types and their levels, independent verification, column algorithms, scoring. **No React, no DOM.** | nothing but itself |
| `src/engine/questions/` | One module per type of question (see below). | engine |
| `src/game/` | The React game: screens, levels (`stages.ts`), training paths, unlocks, rounds, rewards, scenes. | engine, mathinput, recognition, i18n |
| `src/game/questions/` | One folder per type of question with its player, plus `QuestionPlayer.tsx` and the players' shared kit (`questionOutcome.ts`, `HelpLadder.tsx`, `NextSheet.tsx`). | engine, game, mathinput |
| `src/game/draw/` | The writing surfaces: `DrawBoard` (boxes, read one digit at a time), `WorkPad` (free writing), and their layouts. | mathinput, recognition |
| `src/mathinput/` | Handwriting → maths: segmentation, layout to LaTeX, evaluation, checking written work, guided-board plans (`guidedPlan.ts`, `GuidedColumn.tsx`). Also the standalone input lab (`mathinput.html`). | recognition |
| `src/recognition/` | The on-device recognizer (TensorFlow.js, CPU backend): models, preprocessing, writing levels and recognition profiles. | – |
| `src/storage/` | The save game in `localStorage`, merged onto defaults so old saves always load. | engine types |
| `src/i18n/` | Swedish (default) and English texts - the same keys in both (tested). | – |
| `src/stories/` | Storybook: every type of question in every configuration. | game, engine |
| `src/trainer/`, `src/detect/`, `src/clocks/` | Maintainer tools, each its own HTML entry: Träningsverkstan (collect samples, train the recognizer), symbol detection lab, and a gallery of clocks, scenes and guided boards. Never shipped as part of the game's flow. | |
| `scripts/` | Node scripts: dataset processing and model training (run by hand - training takes hours). | |
| `public/recognition/` | The trained models the game loads. | |
| `data/` | Raw training datasets (~800k files, not committed). Excluded from every file watcher - walking it stalls Vite. | |

Entry points are the HTML files at the root: `index.html` (the game, `src/main.tsx`),
`trainer.html`, `mathinput.html`, `detect.html`, `clocks.html`.

## Questions: types, levels and kinds

Three words with precise meanings:

- **Level** (`StageId`, e.g. `"2.5.7"`): one step of the curriculum. In the engine
  a level is a generator, `(rng) => problem`. In the game it is a `StageMeta`
  entry in `game/stages.ts`: its training path, grade, what opens it, round
  length, title, and how its handwriting is read.
- **Question type** (`QuestionTypeId`, e.g. `"trappan"`): a family of levels that
  share a problem shape and a player. Defined with `questionType({...})` in
  `engine/questions/<type>.ts`.
- **Kind** (`problem.kind`, e.g. `"columnSub"`): what a player is picked by. A
  type usually has one kind; column questions have three (`columnAdd`,
  `columnSub`, `columnMul`), and the written questions' kind is `"expression"`.

| Type (`id`) | Module | Kinds | Player |
|---|---|---|---|
| `placeValue` | `questions/placeValue.ts` | placeValue | `placeValue/PlaceValuePlayer` |
| `column` | `questions/column.ts` | columnAdd, columnSub, columnMul | `column/ColumnProblemPlayer` |
| `shortDivision` | `questions/shortDivision.ts` | shortDiv | none yet - its levels aren't in the game |
| `statistics` | `questions/statistics.ts` | statistics | `statistics/StatisticsPlayer` |
| `chart` | `questions/chart.ts` | chart | `chart/ChartPlayer` |
| `trappan` | `questions/trappan.ts` | trappan | `trappan/TrappanPlayer` (guided board) |
| `mulGuided` | `questions/multiply.ts` | mulGuided | `multiplication/MulPlayer` (guided board) |
| `clock` | `questions/clock.ts` | clock | `clock/ClockPlayer` |
| `shop` | `questions/shop.ts` | shop | `shop/ShopPlayer` |
| `written` | `questions/written/` | expression | `written/ExpressionPlayer` (free board, or just the answer) |

### The question-type contract

```ts
// engine/questions/questionType.ts
interface QuestionType<Id, P, S> {
  id: Id;                                  // "trappan"
  kinds: readonly P["kind"][];             // ["trappan"]
  levels: Record<S, (rng: Rng) => P>;      // one generator per level
  key: (problem: P) => string;             // same key = same question
}
```

`engine/generator.ts` lists every type in `QUESTION_TYPES` and derives everything
else from that list:

- `GeneratedProblem` (the union of every type's problem) and `StageId` (every
  level id), as exact types, never hand-maintained;
- `generateProblem(stage, rng)`, `questionTypeOf(stage)`, `problemKey(problem)`;
- `generateRound(stage, count, rng, recentKeys)`: no question twice in a round
  or from the last rounds, and questions that carry a `difficulty` come easiest
  first.

`game/questions/QuestionPlayer.tsx` maps **every kind** to its player in a
mapped type, `{ [K in QuestionKind]: Player<K> }`, so a new kind without a
player does not type-check.

### The written questions

`questions/written/` is one type whose levels come from five topic modules:
`basicTopics.ts` (åk 1-6 facts and topics), `wordProblems.ts` (textuppgifter),
`geometry.ts` (figures), `examTopics.ts` (the national tests' topics) and
`advanced.ts` (åk 7-9 and gymnasiet). They share the model in `problem.ts`:

- `AdvancedProblem`: the task (an i18n prompt and LaTeX), the `answer`
  (`AnswerSpec`: a value, solutions, an expression in a required form, or a
  system), the help ladder (tip, first step, worked solution), and optionally
  a `figure`, a `scene` picture for young children, a `unit`, or `answerOnly`
  (facts like the times tables: pick or write just the answer).
- Helpers the topics write with: `tex`, `par`, `signed`, `coef`, `st`, `stepsOf`,
  `givenNumbers`.

The player writes on one free board (`FreeSolver`), checked as a whole by
`mathinput/workCheck.ts`. A chain on one line counts ("4·3+5·2 = 12+10 = 22").

### Guided boards

Trappan (division) and bigger multiplications are worked **box by box** on a
guided board: a plan (`game/questions/trappan/trappanPlan.ts`,
`mathinput/guidedPlan.ts`) lists every box in the order it's done by hand, and
`mathinput/GuidedColumn.tsx` reveals the board step by step, checks each box,
asks the occasional single-choice question in a bottom sheet, and supports
tracing (on by default for a round's first question).

Decimal multiplication uses the compensation method: make the factors whole,
multiply, count the decimals removed and put them back (0,2 · 0,03 → 2 · 3 = 6 →
0,006).

### Column questions and phases

Column addition, subtraction and multiplication have three phases, tracked per
method rather than per level (`game/phaseProgress.ts`): **Guidat** (told where
to write next), **Egen ordning** (choose the order), **Fritt** (on your own,
checked with följdfel). The cell graph and checking are the method plugins in
`engine/methods/`, entered through `engine/arithmetic.ts`.

## From ink to an answer

1. **Ink.** `mathinput/InkCanvas.tsx` collects strokes (touch, pen or mouse; page
   gestures blocked while writing).
2. **Boxes or a page.**
   - A box on a `DrawBoard` holds one digit (or two): `game/draw/readBox.ts`
     reads it with the digits-only classifier and offers "Menade du?" choices
     when it's unsure.
   - A free page (`WorkPad`) goes through `mathinput/recognizeExpression.ts`:
     segmentation into symbols (`segmentation.ts`, with a learned stroke-pair
     net), classification (`recognition/recognizer.ts`), then 2-D layout to
     LaTeX (`layout.ts`: fractions, powers, roots, the dot as the times sign).
3. **Narrowed reading.** What can be read is limited by the child's writing level
   (`recognition/levels.ts`) and narrower still by the question's recognition
   profile (`recognition/profiles.ts`): a triangle's area never needs a `g`.
4. **Checking.** `mathinput/evaluate.ts` reads the LaTeX back as maths in Swedish
   notation, and `workCheck.ts` grades the work: is the answer right, and is
   there a correct setup leading to it?
5. **Outcome.** The player reports a `QuestionOutcome` (help used? full setup?)
   and `engine/scoring.ts` turns it into stars: help ★, a right answer ★★, a
   right answer with a full setup ★★★.

## Rules the code keeps

These are design decisions, not accidents. Keep them.

- **The recognizer never knows the expected answer.** Recognition reads what was
  written; checking happens afterwards, on what was read. A model that saw the
  answer would "read" it into a child's wrong work.
- **Generators are pure and deterministic given the rng** (`engine/rng.ts`,
  mulberry32): the same seed always gives the same question, which makes rounds,
  stories and bug reports reproducible. Never call `Math.random` in the engine.
- **Generated arithmetic is verified independently.** `engine/verifier.ts`
  recomputes with plain arithmetic and never imports the generators, so a bug
  shared between them is unlikely. A generator bug must never reach a child.
- **No reward is ever taken away.** Scoring only computes rewards from what was
  done. Every question is solved in the end; help is always there.
- **Swedish notation throughout**: decimal comma, spaced thousands, `·` as the
  times sign, Swedish school methods (uppställning, trappan, kort division).
  Exact decimal arithmetic uses scaled integers, never floating point, where
  digits matter.
- **The engine has no UI code.** It is plain TypeScript, fully unit-tested.
- **Every text is in both `sv.json` and `en.json`** with the same keys.
- **Old saves always load** (`storage/save.ts` merges onto defaults).
- **Recognition runs on the tfjs CPU backend in the browser.** WebGL froze the
  page; tfjs-node and wasm don't work in this setup. Readings are memoized per
  stroke group.

## Extending

### A new level of an existing type

1. Its generator in that type's module, added to the type's `levels` (and its
   level id to the module's `…StageId` union).
2. Its entry in `game/stages.ts`: path, problems per round, what opens it, grade.
3. Its title, `stage.<id>`, in `i18n/sv.json` and `en.json`, plus any prompt and
   tip texts it uses.
4. Where its handwriting needs it, a recognition profile in `recognition/profiles.ts`.

It shows up in Storybook's "Nivå" setting automatically.

### A new type of question

1. `engine/questions/<type>.ts`: the problem interface, the level generators and
   `export const <TYPE>_QUESTIONS = questionType({ id, kinds, levels, key })`.
   Add it to `QUESTION_TYPES` in `engine/generator.ts`.
2. `game/questions/<type>/<Type>Player.tsx`, and its entry in `PLAYERS` in
   `QuestionPlayer.tsx` (until then the code doesn't type-check). A player
   takes the problem, reports a `QuestionOutcome` through `onSolved`, uses
   `HelpLadder` for help and `NextSheet` to move on.
3. Its levels in `game/stages.ts` and their texts in `i18n/`.
4. A story file in `src/stories/`, listed in `catalog.ts`, with the type's
   variants as stories (`variants.ts`) and its settings as controls.

### What the tests catch

| Missing | Test |
|---|---|
| a level the engine has but the game doesn't | `game/__tests__/stages.test.ts` |
| a level id or kind claimed by two types; a level making another type's kind | `engine/__tests__/questionTypes.test.ts` |
| a kind without a player | the type-check |
| a type the game plays without a story; a story variant no level makes | `stories/storyCoverage.test.ts` |
| a level title or text in only one language | `game/__tests__/content.test.ts` |
| a written question whose worked steps don't check out | `engine/__tests__/solutionSteps.test.ts` |
| a freely written level without a recognition profile | `recognition/__tests__/profiles.test.ts` |
| a profile listing characters its model doesn't know | `recognition/profiles.ts` throws when it loads |

## Building, testing, shipping

```bash
npm run dev              # the game at http://localhost:5173
npm test                 # vitest, jsdom
npx tsc -b               # type-check everything, tests included
npm run build            # production build into dist/
npm run storybook        # Storybook at http://localhost:6006
npm run build-storybook  # static Storybook into storybook-static/
```

- **Deploy:** every push to `main` builds and publishes to GitHub Pages
  (`.github/workflows/deploy.yml`, served under `/matteaventyret/`).
- **Offline and updates:** `vite-plugin-pwa` precaches everything, models
  included. `main.tsx` registers the worker with `immediate: true`, so a new
  version reloads into place at once.
- **Version:** `__APP_VERSION__` (the commit and build day) is set at build time
  and shown in Settings.
- **Storybook** uses the game's Vite config minus the PWA plugin, and keeps
  `data/` out of the watcher (`.storybook/main.ts`).
