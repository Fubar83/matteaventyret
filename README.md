# MatteÄventyret

A free, mobile-first maths game for Swedish children in åk 3–9, following Lgr22. Version 1 covers level 1.1 (Positionssystemet & uppställning: written addition and subtraction), the plus/minus 0–20 speed test (Blixtrundan), and the architecture needed for later levels (multiplication, kort division, liggande stolen).

See `MatteAventyret-build-brief.md` for the full design brief this project is built from.

## Getting started

```bash
npm install
npm run dev       # the game, at http://localhost:5173
npm test          # engine + UI unit tests (vitest)
npm run build     # production build
npm run trainer   # Träningsverkstan, the recognizer-training tool (never shipped to players)
```

## Project layout

- `src/engine/` — pure TypeScript maths engine (column arithmetic, generator, verifier, hints, scoring). No UI code, fully unit-tested.
- `src/game/` — React UI: the uppställning board, Teori/Exempel/Uppgift flow, gamification screens.
- `src/recognition/` — on-device handwriting-digit recognizer (TensorFlow.js): preprocessing, confidence rules, model loading.
- `src/trainer/` — Träningsverkstan, the maintainer-only tool for collecting samples and training an improved recognizer model.
- `src/audio/`, `src/fx/` — code-generated sound (Tone.js/Howler) and particle effects (PixiJS).
- `src/i18n/` — Swedish (default) and English UI strings.
- `src/storage/` — versioned localStorage save.
- `scripts/trainBootstrapModel.mjs` — trains the placeholder recognizer model shipped in `src/recognition/model/` on synthetic digit shapes (see that script's header for why: real samples need parental consent and come from Träningsverkstan).

## Status

Engine, generator/verifier, and all 7 stages of level 1.1 are implemented and tested, including the mini-boss, Blixtrundan, avatars/XP/streak, Teori/Exempel, numpad and handwriting input, Swedish/English toggle, and PWA offline support. See `CURRICULUM_REVIEW.md` for the open teacher sign-off checklist before public release, and `LICENSES.md` for every third-party library and how assets were sourced.

The bundled recognizer model is trained on synthetic (not real) handwriting — see `src/recognition/model/report.json` after running the training script, and the Träningsverkstan workflow for replacing it with a model trained on real, consented samples.
