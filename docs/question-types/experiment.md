# Chance experiments — `experiment`

"Experimentet": guess first, then spin or throw ten at a time and watch the
results pile up, then answer about what came. Chance as a prediction against
chance as what happened.

## Levels

`engine/questions/experiment/index.ts`:

| Level | Title | Device | Guess | After |
|---|---|---|---|---|
| 1.11.2 | Slumpförsök med snurra | a spinner, one colour on half, 20 spins | which colour most | which colour came most |
| 2.18.3 | Relativ frekvens | a die, 60 throws | about how many sixes (10) | the share of sixes as it came — not 1/6 |
| 3.7.5 | Två tärningar | two dice' sum, 100 throws | the most common sum (7) | why 7: the most ways |

## The question

`device`, `throws`, `seed`, `predict` (a single-choice question), `after`
(what's asked once the throws are done — `afterQuestion` makes it from the
results). `runExperiment` gives the results from the seed, so a question
always gives the same throws — in a story, in a test. The seed is chosen for
results worth talking about: the big colour clearly most; sixes near 10 but
not exactly; 7 the most common sum.

## How it's played

`game/questions/experiment/ExperimentPlayer.tsx`: the device, a bar per
outcome that grows, the guess (one try, with why - it stays on screen to
compare with), the throw button, the question after. The device moves: the
spinner's needle turns two laps and stops at the last result's sector, and
the dice roll (`anim-die-roll` in `index.css`; no roll with reduced motion)
before they show it. Ten at a time, so the bars grow while the class
watches. Stars: `triedOutcome` — ★★★ both right.

## Must stay true

- The same seed gives the same results; the after-question's right answer is
  what the results say (`engine/__tests__/newTypes.test.ts`).
- Every level plays to the end on screen (`game/__tests__/newTypesPlay.test.tsx`).
