# Trappan — `trappan`

Division with trappan, the written method taught in Swedish schools. The
divisor goes to the left of the bracket's stem, the dividend under its bar,
the quotient above, and the work steps down underneath like stairs. Each step
is the same four moves: how many times the divisor goes into the part (a
quotient digit), multiply back, subtract, bring down the next digit. Åk 4–9.

## Levels

| Level | Title | Example | What's new |
|---|---|---|---|
| 2.5.1 | Trappan, två siffror | 84 ÷ 4 | 2-digit ÷ 1-digit, sometimes a rest to carry on with |
| 2.5.2 | Trappan, tre siffror | 764 ÷ 4, 412 ÷ 4 = 103 | 3 digits; now and then a 0 in the answer |
| 2.5.8 | Trappan med rest | 158 ÷ 6 = 26 rest 2 | it doesn't go evenly: the answer is a whole number and a rest |
| 2.5.3 | Svar med decimaler | 7 ÷ 4 = 1,75 | on past the comma with zeros |
| 2.5.4 | Dela med tvåsiffrigt | 672 ÷ 12 | a two-digit divisor (11–25) |
| 2.5.5 | Decimaltal ÷ heltal | 12,6 ÷ 3 | the answer's comma straight above the dividend's |
| 2.5.6 | Decimaltal ÷ decimaltal | 13,2 ÷ 5,28 | both commas moved until the divisor is whole |
| 2.5.7 | Avrunda svaret | 125,25 ÷ 12,7 ≈ 9,9 | it never ends: worked one decimal further, then rounded |

(2.5.8 sits after 2.5.2 in the curriculum; its id is just newer.)

## The question

`TrappanProblem` (`engine/questions/trappan.ts`):

| Field | |
|---|---|
| `dividend`, `divisor` | `Decimal`s: their digits and how many are decimals ("13,2" is `{ digits: "132", decimals: 1 }`) |
| `shift` | how many places both commas move so the divisor is whole (0 for a whole divisor) |
| `answer` | exact, or rounded to `roundTo` decimals |
| `roundTo` | 2.5.7 only: round to this many decimals |
| `withRest` | 2.5.8 only: whole numbers, the walk ends with a rest |

Two questions are the same when the dividend and divisor are.

## How it's made

- Numbers are digit strings and scaled integers. **No floating point decides a
  digit.**
- `walkOf(problem)` works the division: the commas moved (`shifted`), then
  step by step. It goes 4 decimals at most; one more than `roundTo`; or none
  with a rest. Every level is built so its walk ends: an exact answer, the
  rounding decimal, or a rest.
- 2.5.7 keeps only divisions that really don't end within the decimals
  worked, so there is something to round.

## How it's played

`game/questions/trappan/TrappanPlayer.tsx`, on the shared guided board
(`mathinput/GuidedColumn.tsx`):

- The prompt says what kind of answer is wanted (exact, a rest, rounded).
- With a decimal divisor, a box first shows the commas moving:
  "125,25 ÷ 12,7 = 1252,5 ÷ 127".
- The plan (`trappanPlan.ts`) lists every box in the order it's done by hand.
  The board **reveals its parts as they're needed** (each box's `from` step),
  not all at once.
- One box open at a time, with what to do in it. A right digit stays green. A
  wrong one is wiped. After 3 wrong tries, or "Visa siffran", the digit is
  shown in amber and the walk goes on.
- **Tracing** is on by default for a round's first question: the expected
  digit is drawn dashed to write over. "Spåra" switches it off.
- The times table of the divisor is a tap away.
- **Stars** (`guidedOutcome`): a digit shown or traced is ★; every box right
  the first time is ★★★; otherwise ★★.

## Must stay true

- Every level's walk ends, with an answer, a rest, or the decimal to round
  (`engine/__tests__/trappan.test.ts`).
- The quotient digits above the bar line up with the dividend's columns; the
  answer's comma sits straight above the dividend's (`game/__tests__/trappanPlan.test.ts`).
- Both commas move by the same number of places, and the shift is shown
  before the board.
- Wrong digits cost the third star; a shown or traced digit caps at ★.

## Known gaps

- The board's guiding texts (`trappanPlan.ts`, `GuidedColumn.tsx`) are
  Swedish only; they don't go through `i18n/`.
