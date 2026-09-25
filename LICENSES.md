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

## Assets

- **Graphics**: all backgrounds, avatars, the boss, and UI chrome are original SVG/CSS drawn in this codebase (see `src/game/Avatar.tsx`, `src/game/BossMonster.tsx`, `src/game/TeoriIllustration.tsx`). Nothing is traced or copied from another game.
- **Sound and music**: every sound effect and the background loop are synthesized at runtime with Tone.js (see `src/audio/sound.ts`) - there are no bundled audio files to license.
- **Digit-recognizer model**: `src/recognition/model/` is trained by `scripts/trainBootstrapModel.mjs` on procedurally generated synthetic digit shapes (see that script's header comment). It is a placeholder until real, consented handwriting samples are collected via Träningsverkstan (`npm run trainer`) and a new model is trained and exported from there.

## Fonts

Nunito is bundled via `@fontsource/nunito` (no runtime Google Fonts requests), licensed under the SIL Open Font License 1.1.
