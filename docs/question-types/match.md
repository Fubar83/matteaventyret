# Matching pairs — `match`

"Para ihop": cards face up; the child taps one, then the one it belongs with.
A right pair stays together in its own colour; a wrong pair lets go. Every
age, förskoleklass to åk 9.

## Levels

`engine/questions/match/index.ts`:

| Level | Title | Pairs |
|---|---|---|
| 0.1.7 | Para ihop: antal och siffra | a picture of n things and the digit n (4 pairs) |
| 1.7.5 | Para ihop talkamrater | two numbers that make 10, 20 or 100 — the smaller of each pair below half, so no number could go with two |
| 1.5.10 | Para ihop klockor | an analog clock and its time in words; never two with the same minutes |
| 2.6.10 | Para ihop bråk, decimaltal och procent | one value in two of its forms: 1/4 and 0,25, 0,5 and 50 % |
| 2.9.9 | Lika mycket i olika enheter | 1,5 m and 150 cm, 2,3 kg and 2 300 g, 1 h 15 min and 75 min — one family each |
| 3.3.9 | Para ihop uttryck | 2(x + 3) and 2x + 6, x · x and x², (x + 3)² and x² + 6x + 9 — a different rule each |
| 3.10.3 | Para ihop graf och formel | three lines and their y = kx + m |
| 3.1.11 | Para ihop: potenser | xᵃ · xᵇ, (xᵃ)ᵇ, xᵃ/xᵇ, x⁰, x⁻¹, √x and the one power each is — four of them, every power different |

## The question

`cards`: the shuffled cards, each a `ChoiceOption` (words, LaTeX,
characters, a small picture) and the `pair` it belongs to. `key` is the
level and the cards whatever their order.

## How it's played

`game/questions/match/MatchPlayer.tsx`: drag a card onto its partner, or tap
a card (it's ringed) and then its partner. Dragging is `useDragDrop`
(`game/questions/dragDrop.tsx`). After **three** wrong pairs the rest are shown — more than a
single choice allows, as there are several pairs to find. Stars:
`triedOutcome`, ★★★ every pair right the first time.

## Must stay true

- Every card has exactly one partner and no two cards look the same; number
  friends can't pair two ways (`engine/__tests__/newTypes.test.ts`).
- Every level plays to the end on screen (`game/__tests__/newTypesPlay.test.tsx`).
