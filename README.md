# MatteÄventyret

A free maths training game for Swedish children, from åk 1 to gymnasiet, following Lgr22. Children write their answers by hand, on a tablet or with the mouse, and every method is guided step by step: column addition and subtraction, multiplication with and without decimals, division with trappan (with remainders, decimals and rounding), clocks, money, unit conversions, equations and more. The levels are grouped into training paths, by topic and for the national tests (åk 3, 6 and 9).

**Play it:** https://fubar83.github.io/matteaventyret/

Everything runs in the browser: the handwriting recognizer is a small TensorFlow.js model, there are no accounts, no ads and no tracking, and it works offline once loaded.

## Getting started

```bash
npm install
npm run dev       # the game, at http://localhost:5173
npm test          # engine + UI unit tests (vitest)
npm run build     # production build in dist/
npm run trainer   # Träningsverkstan, the recognizer-training tool (never shipped to players)
npm run storybook # every kind of question in Storybook, at http://localhost:6006
```

The gallery page `http://localhost:5173/clocks.html` shows the clocks, scenes, shop, trappan and multiplication boards on their own, for example `clocks.html?mul=2.1.6&a=0,2&b=0,03&step=0` or `clocks.html?trappan=2.5.7&a=125,25&b=12,7&round=1&step=0`.

Storybook (`src/stories/`, published at https://fubar83.github.io/matteaventyret/storybook/) has a story file per type of question, with every level in its Nivå setting and the variants as stories of their own (a clock to read, change to give, your own trappan division...).

## Project layout

[ARCHITECTURE.md](ARCHITECTURE.md) has the full map: how a question flows from a level to stars, the rules the code keeps, and how to extend it. Coding agents: see [AGENTS.md](AGENTS.md).

- `src/engine/` — pure TypeScript maths engine: the types of question and their levels, verification, scoring. No UI code, fully unit-tested.
  - `engine/questions/` — one module per type of question (place value, column questions, trappan, the clock, the shop, the written questions...): its levels, the kinds of question they make, and when two are the same (see `questionType.ts`).
  - `engine/generator.ts` — the list of types, and making questions and rounds from them.
- `src/game/` — React UI: the levels (`stages.ts`) and training paths, rounds, scenes.
  - `game/questions/` — a player per type of question, each in a folder of its own, and `QuestionPlayer.tsx`, which picks the player for a question.
- `src/mathinput/` — the handwriting board: layout, column and trappan plans, step checking.
- `src/recognition/` — the on-device handwriting recognizer (TensorFlow.js): preprocessing, segmentation, models.
- `src/trainer/` — Träningsverkstan, the maintainer-only tool for collecting samples and training the recognizer.
- `src/i18n/` — Swedish (default) and English texts.
- `scripts/` — model training, dataset processing and the Kenney sprite build (`npm run kenney`).

### Adding a type of question

1. A module in `src/engine/questions/` that defines it with `questionType` (its levels, kinds and key), added to `QUESTION_TYPES` in `src/engine/generator.ts`.
2. A player in `src/game/questions/<type>/`, added to `PLAYERS` in `QuestionPlayer.tsx` — the code doesn't type-check until every kind has one.
3. Its levels in `src/game/stages.ts`, their titles in `src/i18n/`, and a story in `src/stories/` (listed in `catalog.ts`).

The tests say what's missing: a level the engine has but the game doesn't, a type with no story, a level without a title.

## License

The source code is MIT-licensed (see `LICENSE`). The trained recognizer models and the data derived from their training sets are licensed CC BY-NC-SA 4.0, because they are trained on Google's MathWriting dataset; the sprites are Kenney's (CC0). `LICENSES.md` lists every library, dataset and asset.

See `CURRICULUM_REVIEW.md` for the curriculum review checklist.
