# Licenses and credits

MatteÄventyret is free to use, with no paid services, subscriptions or third-party runtime requests. Every library below is open source (MIT or equivalent). No third-party art, audio, or font *files* are used: graphics are drawn in code as SVG, sound is synthesized in code with Tone.js, and the digit-recognizer model is trained by this project's own scripts.

## Runtime libraries

| Library | License | Used for |
| --- | --- | --- |
| React | MIT | UI framework |
| Vite | MIT | Build tool / dev server |
| TypeScript | Apache-2.0 | Language |
| Tailwind CSS | MIT | Styling |
| @tensorflow/tfjs | Apache-2.0 | On-device digit recognizer |
| GSAP | Standard "No Charge" license (free for this use) | UI micro-animation |
| PixiJS | MIT | Confetti / particle effects |
| Howler.js | MIT | Background music playback/looping |
| Tone.js | MIT | Code-generated sound effects and music |
| @fontsource/nunito | OFL-1.1 (SIL Open Font License) | Bundled UI font (Nunito, by Vernon Adams et al.) |
| vite-plugin-pwa | MIT | Offline/installable PWA support |
| Zod | MIT | Curriculum data validation (planned) |
| KaTeX | MIT | Renders recognized/edited LaTeX on the handwriting-to-LaTeX test page (`npm run mathinput`) |
| perfect-freehand | MIT | Smooth ink rendering on that page's drawing canvas |
| MathLive | MIT | Editable math field for correcting recognized LaTeX by hand |

## Assets

- **Graphics**: all backgrounds, avatars, the boss, and UI chrome are original SVG/CSS drawn in this codebase (see `src/game/Avatar.tsx`, `src/game/BossMonster.tsx`, `src/game/TeoriIllustration.tsx`). Nothing is traced or copied from another game.
- **Sound and music**: every sound effect and the background loop are synthesized at runtime with Tone.js (see `src/audio/sound.ts`) - there are no bundled audio files to license.
- **Handwriting-recognizer model**: `src/recognition/model/` is trained by `scripts/trainBootstrapModel.mjs` from `src/recognition/characters.json` (the list of active characters and where each one's real training data comes from). Three possible real-data sources, each with its own processing script:
  - [MathWriting](https://github.com/google-research/google-research/blob/master/mathwriting/README.md) (Google Research, 2024) via `scripts/processMathWriting.mjs` - **CC BY-NC-SA 4.0, non-commercial only**. This is the primary source for the currently active character set (see `characters.json`), which means **the model file itself is presently non-commercial-licensed** - consistent with this project's own scope (non-commercial, open source, free to use and fork), but worth knowing if that ever changes: swapping every entry in `characters.json` back to an `emnist`/`hasy` source (or synthetic) and retraining removes the NC encumbrance.
  - [EMNIST](https://www.nist.gov/itl/products-and-services/emnist-dataset) (public domain, derived from NIST Special Database 19) via `scripts/processEmnist.mjs` - digits and letters.
  - [HASYv2](https://doi.org/10.5281/zenodo.259444) (ODC-ODbL, crowdsourced via Detexify) via `scripts/processHasy.mjs` - math signs.
  Any character with no cached real samples falls back to a procedurally generated synthetic shape (see `scripts/charTemplates.mjs`). Real, consented handwriting samples collected via Träningsverkstan (`npm run trainer`) are the long-term source of truth once available.

## Fonts

Nunito is bundled via `@fontsource/nunito` (no runtime Google Fonts requests), licensed under the SIL Open Font License 1.1.
