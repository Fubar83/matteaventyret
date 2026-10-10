# Kort division — `shortDivision`

A three-digit number divided by a one-digit number, written the short way: the
quotient above, each remainder carried as a small digit to the next. **The
engine is complete, but no level plays it yet.** There's no player
(`QuestionPlayer` renders nothing for `shortDiv`), and its levels aren't in
`game/stages.ts`. Trappan (`trappan.md`) is how division is played today.

## Levels (engine only)

| Level | Pattern | Example |
|---|---|---|
| 2.2.1 | no minnesrest: every digit a multiple of the divisor | 486 ÷ 2 |
| 2.2.2 | with minnesrest, still exact | 756 ÷ 3 |
| 2.2.3 | a 0 in the quotient, at the tens | 612 ÷ 3 = 204 |
| 2.2.4 | a remainder at the end | 763 ÷ 5 = 152 r 3 |

## The question

`ShortDivisionProblem`: `dividend`, `divisor`, `answer` (the quotient) and
`remainder`. Two questions are the same when the dividend and divisor are.

## How it's made

A random dividend and divisor, checked against the column-by-column plan
(`engine/methods/shortDiv.ts`'s `computeShortDivisionPlan`) for the level's
pattern. 2.2.1 and 2.2.3 are too rare to hit by chance, so they build the
digits directly. Every question is re-verified (`verifyDivision`).

## To make it playable

1. A player in `game/questions/shortDivision/`, added to `PLAYERS` in
   `QuestionPlayer.tsx`. The handwriting side already reads it:
   `mathinput/shortDivisionParse.ts`, `verify/divisionCheck.ts`, the "kort
   division" template on the input lab page.
2. Its levels in `game/stages.ts` with titles in `i18n/`. Remove
   `"shortDivision"` from `NOT_PLAYED` in `game/__tests__/stages.test.ts`.
3. A story file (the coverage test will ask for it) and this document updated.

## Must stay true

- The quotient and remainder are verified independently of the generator.
- The type stays out of the game until it has a player (`stages.test.ts`).
