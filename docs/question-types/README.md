# Question types

One document per type of question: what it teaches, its levels, how its
questions are made and played, and what **must stay true** through any
refactoring. Read the type's document before changing it, and update it in
the same commit as the change. A test fails if a type in
`engine/generator.ts`'s `QUESTION_TYPES` has no document here.

ARCHITECTURE.md explains the parts every type plugs into (the question-type
contract, the registry, the players). The words: a **level** is one step of
the curriculum (`"2.5.7"`); a **type** is a family of levels with one problem
shape and one player (`trappan`); a **kind** is `problem.kind`, what picks the
player.

| Type | Teaches | Levels | Document |
|---|---|---|---|
| `placeValue` | what a digit is worth | 1.1.1 | [placeValue.md](placeValue.md) |
| `column` | addition, subtraction, multiplication in columns; decimals | 1.1.2–1.1.7, 2.1.1–2.1.3, 2.3.3–2.3.4 | [column.md](column.md) |
| `shortDivision` | kort division (not played yet) | 2.2.1–2.2.4 | [shortDivision.md](shortDivision.md) |
| `statistics` | medelvärde, median, typvärde | 2.7.1–2.7.3 | [statistics.md](statistics.md) |
| `chart` | reading bar charts | 2.8.1–2.8.3 | [chart.md](chart.md) |
| `trappan` | division with trappan | 2.5.1–2.5.8 | [trappan.md](trappan.md) |
| `mulGuided` | bigger multiplications, decimals | 2.1.4–2.1.6 | [mulGuided.md](mulGuided.md) |
| `clock` | reading and setting clocks | 1.5.1, 1.5.3–1.5.7 | [clock.md](clock.md) |
| `shop` | paying and giving change | 1.6.2–1.6.4, 2.9.6 | [shop.md](shop.md) |
| `written` | everything written on the free board, åk 1 – gymnasiet | 66 levels | [written.md](written.md) |

## What every type shares

### Stars

Every player reports a `QuestionOutcome`, built with one of two helpers in
`game/questions/questionOutcome.ts`, so the same rules hold everywhere:

| Stars | When |
|---|---|
| ★ | any help: the help ladder, the hint that comes after a second wrong try, the answer shown, a digit traced, a guided phase that shows the order |
| ★★ | right, without help |
| ★★★ | right, without help, **with the full setup**: the written work where the question has some ("Visa hur du tänkte", the uppställning), and otherwise **right the first time** |

- `triedOutcome({ wrong, helpUsed, shown, setup })`: questions answered in
  tries. Leave `setup` out when there's nothing to set up.
- `guidedOutcome(result)`: the guided boards (trappan, multiplication), where
  the board is the setup. ★★★ means every box was right the first time.

A round's stars are the level that at least half its questions reached
(`engine/scoring.ts`). No reward is ever taken away.

### Tries

Help is never refused and every question is solved in the end:

1. A wrong answer: "Försök igen", and the boxes clear.
2. A second: the question's hint comes by itself.
3. A third: the answer is shown, and Nästa moves on.

Single-choice questions (a clock to read, the times tables to pick) show the
answer after the second wrong pick, since there are few options left.
`game/questions/useAnswerTries.ts` does this for any question answered with
one number.

### The help ladder

`HelpLadder.tsx`, three steps opened one at a time: a **tip**, the **first
step** worked with the question's own numbers, then the **whole solution**.
Opening any of them is help (★).

### Handwriting

Answers written in boxes are read digit by digit with the digits-only
classifier. A free board is read with the level's writing level, narrowed
by the stage's recognition profile (`recognition/profiles.ts`). The
recognizer never knows the expected answer.

### Generation

Pure and deterministic given the rng: the same seed is always the same
question (the stories and tests rely on it). Changing how a generator uses
the rng changes every seed's question, so do it on purpose and note it in
the type's document.
