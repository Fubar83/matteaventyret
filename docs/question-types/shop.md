# The shop — `shop`

Affären: paying with coins and notes, and giving change, played in a shop
rather than written. Swedish money: 1, 2, 5 and 10 kronor coins; 20, 50, 100,
200 and 500 kronor notes. Åk 1–3, with the bigger till in åk 4–6.

## Levels

| Level | Title | You are | Task |
|---|---|---|---|
| 1.6.2 | Affären: betala | the customer | one thing; pay exactly from your wallet |
| 1.6.3 | Affären: ge växel | the cashier | the customer pays with a 20, 50 or 100 note; give back the change |
| 1.6.4 | Affären: handla från listan | the customer | a shopping list of 2–3 things: pick them off the shelf, then pay it all exactly (total ≤ 100) |
| 2.9.6 | Kassan: stora sedlar | the cashier | several things, paid with a 100, 200 or 500 note |

## The question

`ShopProblem` (`engine/questions/shop.ts`):

| Field | |
|---|---|
| `mode` | `pay`, `change`, or `basket` |
| `shop`, `shelf` | which shop (kiosk, toys, market, store) and the 5–6 things on its shelf |
| `buy` | the things bought: the shopping list, in basket mode |
| `wallet` | pay and basket: the money you have |
| `paidWith`, `till` | change: the customer's note, and the money in the till |
| `total`, `change` | what it costs, and what's given back |
| `difficulty` | a round goes from its easiest question to its hardest |

## How it's made

- Each shop's things have their own price ranges (a lollipop 3–8 kr, a game
  149–299 kr).
- **The wallet always pays exactly, more than one way** (`walletFor`): the
  fewest pieces that make the price, plus a few that aren't needed, and now
  and then a 10 or a 20 split into smaller pieces. It has to be counted out,
  not just emptied.
- The customer's note is the smallest that covers the price, sometimes the
  next one up (`noteFor`). Change is never 0.
- `difficulty`: the amount's size, how many pieces it takes, and how many
  things there are.

## How it's played

`game/questions/shop/ShopPlayer.tsx`: a shop with an awning, a shelf, a
shopkeeper's speech bubble and a till display.

- Tap coins and notes from the wallet (or the till) onto the tray; tap one on
  the tray to take it back. Basket mode picks the things off the shelf first,
  and a thing that isn't on the list is refused.
- "Betala" / "Ge tillbaka" checks the tray's sum. Three tries, then the
  answer is laid out.
- The help ladder for change counts up from the price to the note, in legs
  ("from 37 to 40 is 3, from 40 to 50 is 10").
- Stars use `triedOutcome`: nothing to set up, so ★★★ is the right money the
  first time.

## Must stay true

- Every wallet can pay its total exactly, with money left over
  (`engine/__tests__/shop.test.ts`). The till holds every piece up to the
  note, so change can always be given.
- The note always covers the price and change is the difference, never 0
  (`shop.test.ts`).
- A shopping list is on the shelf, and its total is at most 100 (`shop.test.ts`).
- Any combination of pieces with the right sum is right, not only the fewest.

## Known gaps

- No öre or rounding to whole kronor; no "is there enough money?"
  questions.
