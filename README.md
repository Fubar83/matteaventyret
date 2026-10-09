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

Storybook (`src/stories/`) has a story file per kind of question, with every level in its Nivå setting and the variants as stories of their own (a clock to read, change to give, your own trappan division...). A new kind of question or a new level method needs a story: `src/stories/storyCoverage.test.ts` fails until `src/stories/catalog.ts` lists it.

## Project layout

- `src/engine/` — pure TypeScript maths engine: the question generators for every level, the trappan and multiplication walks, verification, scoring. No UI code, fully unit-tested.
- `src/game/` — React UI: the levels and training paths, the guided boards, theory slides, scenes, clocks and the shop.
- `src/mathinput/` — the handwriting board: layout, column and trappan plans, step checking.
- `src/recognition/` — the on-device handwriting recognizer (TensorFlow.js): preprocessing, segmentation, models.
- `src/trainer/` — Träningsverkstan, the maintainer-only tool for collecting samples and training the recognizer.
- `src/i18n/` — Swedish (default) and English texts.
- `scripts/` — model training, dataset processing and the Kenney sprite build (`npm run kenney`).

## License

The source code is MIT-licensed (see `LICENSE`). The trained recognizer models and the data derived from their training sets are licensed CC BY-NC-SA 4.0, because they are trained on Google's MathWriting dataset; the sprites are Kenney's (CC0). `LICENSES.md` lists every library, dataset and asset.

See `CURRICULUM_REVIEW.md` for the curriculum review checklist.
