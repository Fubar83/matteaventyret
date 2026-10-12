# Sorting — `sort`

"Sortera": things to put where they belong. Two kinds:

- **`sortGroups`** — each thing into its group: udda or jämna, primtal or not,
  less than / equal to / more than a half, rational or irrational.
- **`sortOrder`** — the things in a row, from one end to the other: smallest
  first, fewest first, shortest first.

The child **taps a thing, then where it goes** (a group, or the next place in
the row). Nothing is checked until everything is placed; then **Rätta** checks
it all. Förskoleklass to åk 9.

It's for what's learnt by comparing many things at once — where a slip shows
in the pattern of the answer, not in one number: 51 put among the primes,
−10 put after −2, 1 050 mm put after 1,2 m.

## Levels

Engine modules in `engine/questions/sort/`:

| Level | Title | Kind | Module | Sorts |
|---|---|---|---|---|
| 0.4.1 | Sortera former | groups | `groups.ts` | 6–8 shapes by shape (any colour) or by colour (any shape), 2–3 groups |
| 0.1.5 | Färst till flest | order | `order.ts` | 3–4 groups of things, by how many |
| 1.8.5 | Sortera: udda och jämna | groups | `groups.ts` | 6 numbers, two of them three-digit — only the ones digit decides |
| 1.8.6 | Storleksordna tal | order | `order.ts` | 4–5 numbers made of the same three digits (93, 309, 390, 903), up or down |
| 1.2.5 | Sortera: figurer och kroppar | groups | `groups.ts` | 3 plane figures and 3 solids, as pictures |
| 2.15.2 | Sortera: primtal | groups | `groups.ts` | 7 numbers to 60: always an odd composite (9, 27, 51, 57…) and 1 or 2 |
| 2.6.7 | Bråk kring en halv | groups | `groups.ts` | 6 fractions: less than, equal to, more than a half — a half written as 4/8 or 6/12 |
| 2.16.4 | Bråk, decimaltal och procent i ordning | order | `order.ts` | 4 values each written as a fraction, a decimal or a percent |
| 2.17.2 | Storleksordna negativa tal | order | `order.ts` | 5 whole numbers, two or more negative, up or down |
| 2.9.8 | Längder i olika enheter | order | `order.ts` | 4 lengths around a metre, each in its own unit (m, dm, cm, mm) |
| 3.1.5 | Rationella och irrationella tal | groups | `groups.ts` | 4 rational (√16, 3,14, 0,333…, 22/7, −5) and 3 irrational (√2, π) |
| 3.1.6 | Grundpotensform i storleksordning | order | `order.ts` | 4 numbers, mostly as a · 10ᵏ, some written out — 9 · 10³ < 2 · 10⁴ |

## The question

`engine/questions/sort/problem.ts`. The things are the single-choice
options' kinds (`ChoiceOption`: words, LaTeX, characters, a small picture),
shown with the same `OptionContent`.

| Field | |
|---|---|
| `prompt` | the question (`ChoiceText`) |
| `items` | the things, in the order the tray shows them (shuffled) |
| `groups` (`sortGroups`) | the groups' names or pictures |
| `answer` | `sortGroups`: each thing's group; `sortOrder`: the things' indexes in the right order |
| `why` (`sortGroups`) | per thing, why it belongs where it does — said when a check finds it elsewhere |
| `ends` (`sortOrder`) | the words at the two ends of the row: "minst" … "störst" |
| `tip`, `explanation` | the help ladder; an order's explanation lists it: "93 < 309 < 390 < 903" |

`key` is the level, the prompt and the things whatever their order: the
same things shuffled again are the same question.

## How it's made

- `sorted()` and `ordered()` shuffle the things for the tray and keep each
  thing's answer (and reason) with it. `ordered()` refuses two things of the
  same value — an order has to be unambiguous.
- The traps are put in on purpose, not left to chance: a three-digit number
  among the odd and even; an odd composite and 1 or 2 among the primes; a half
  written as 4/8; 3,14 and √16 among the rationals; a two-digit number among
  the three-digit ones; units shuffled so no two lengths share one.

## How it's played

`game/questions/sort/SortPlayer.tsx`:

- **Groups**: the tray on top, the groups below as dashed boxes. Tap a thing
  (it's highlighted), then a group. A thing in a group can be tapped back out.
- **Order**: the tray on top, the row below with its ends named. Tapping a
  thing puts it in the next place; tapping a placed one takes it out.
- **Rätta** when everything is placed. Groups: the right ones stay (green,
  locked), the wrong ones come back to the tray, with one of their reasons.
  Order: the run that's right from the start stays, the rest comes back.
- After **two** wrong checks the answer is shown, with the explanation, and
  Nästa moves on (as a single-choice question with four options).
- Stars: `triedOutcome` — ★★★ is right at the first check.

## Must stay true

- Groups: every thing's group is right — the parity, the primality, the
  comparison with a half, rational or not, plane or solid, shape or colour —
  and every group has something in it (`engine/__tests__/sort.test.ts`).
- Order: the answer really is in order by value, and no two things are worth
  the same (`sort.test.ts`).
- The traps are there: an odd composite among the primes; a half among the
  fractions; a three-digit number among the odd and even (`sort.test.ts`).
- Every text a question uses exists in both languages
  (`game/__tests__/content.test.ts`); every level draws and plays to the end —
  sorted right it's solved, sorted wrong twice the answer is shown
  (`game/__tests__/sortPlayer.test.tsx`).

## Known gaps

- Tap, not drag. Dragging would feel more like sorting, but tapping works the
  same with a finger, a pen and a keyboard.
- No sorting into a Venn diagram (two properties at once: even *and* over 50).
