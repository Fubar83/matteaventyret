# Place value — `placeValue`

Positionssystemet, åk 1–3: what a digit in a four-digit number is worth. The
6 in 6 435 is 6 000. It's the first level of the game and opens both the
addition and subtraction paths.

## Levels

| Level | Title | Asks |
|---|---|---|
| 1.1.1 | Positionssystemet | "Vad är siffran 3 värd i talet 4 339? (tiotal)" → 30 |

## The question

`PlaceValueProblem` (`engine/questions/placeValue.ts`):

| Field | |
|---|---|
| `number` | 1000–9999 |
| `columnAsked` | 0 ones, 1 tens, 2 hundreds, 3 thousands |
| `answer` | the digit × 10^column |

Two questions are the same when their number and column are (`pv:<number>:<column>`).

## How it's made

- A random four-digit number and a random column.
- **Never a 0 digit.** "What is the 0 worth?" has nothing to show in the
  blocks and nothing to count, so such a draw is retried.

## How it's played

`game/questions/placeValue/PlaceValuePlayer.tsx`:

- Base-ten blocks show the number with the asked column lit. The number is
  printed with the digit highlighted, and the question names the place
  ("(tiotal)"). This is åk 1 scaffolding, on purpose.
- The answer is written in boxes, one per digit of the answer. With the place
  named, the box count is part of the scaffold.
- What's written is echoed under the number as it comes in.
- Tries, the help ladder and stars follow the shared rules
  ([README](README.md)) through `useAnswerTries`. There's nothing to set up,
  so ★★★ is right the first time.

## Must stay true

- The asked digit is never 0 (`engine/__tests__/generator.test.ts`).
- The answer is the digit times its place value; the number has four digits.

## Known gaps

- Only four-digit numbers. Larger numbers (åk 4–6: 52 000, decimals' tenths
  and hundredths) would be a new level.
