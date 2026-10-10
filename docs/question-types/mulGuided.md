# Guided multiplication — `mulGuided`

Bigger multiplications set up in columns and worked box by box: two-digit
multipliers, then decimals. Åk 4–6. They follow on from the column
multiplications (`column.md`, 2.1.1–2.1.3), which have one-digit multipliers.

## Levels

| Level | Title | Example |
|---|---|---|
| 2.1.4 | 2-siffrigt · 2-siffrigt | 34 · 26 (no 0 digits, no 11, 22, …) |
| 2.1.5 | Decimaltal · heltal | 3,4 · 6, 2,35 · 4, now and then 1,6 · 12 |
| 2.1.6 | Decimaltal · decimaltal | 2,5 · 1,3, 4,6 · 0,8, and small ones like 0,2 · 0,03 = 0,006 |

## The question

`MulGuidedProblem` (`engine/questions/multiply.ts`): `top` and `bottom` as
`Decimal`s (shared with trappan), and `answer`. Two questions are the same
when both numbers are.

## How it's made

- **No product whose decimals end in 0** (2,5 · 1,2 = 3,00): the decimals put
  back would need simplifying, which is another lesson.
- At most three decimals in all, so at most three to put back.
- 2.1.6 now and then makes small factors, so zeros go in front (0,006).

## How it's played — the compensation method

`game/questions/multiplication/MulPlayer.tsx`, on the shared guided board.
The plan is `planGuided("×", …)` in `mathinput/guidedPlan.ts`.

1. **Make the numbers whole**: 0,2 · 0,03 becomes 2 · 3, and the decimals
   taken away (1 + 2) are counted.
2. **Multiply** as a column multiplication: a partial product per multiplier
   digit, each shifted one column left (a 0 digit is skipped), then the
   partial products added.
3. **Put the decimals back**: 6 → 0,006, with zeros in front when needed. A
   single-choice step asks where the comma goes, and says why the wrong
   options are wrong.

There's **no estimation step**, by the user's decision (2026-10). The board
reveals its parts as they're needed. Tracing, "Visa siffran", 3 tries per
box and the stars (`guidedOutcome`) are as for trappan (`trappan.md`).

## Must stay true

- Compensation, not estimation: count the decimals removed and put them all
  back (`engine/__tests__/multiply.test.ts`, `mathinput/__tests__/guidedPlan.test.ts`).
- The product never ends in a 0 decimal.
- Wrong digits cost the third star; a shown or traced digit caps at ★.

## Known gaps

- The board's guiding texts are Swedish only (see `trappan.md`).
- No three-digit multipliers.
