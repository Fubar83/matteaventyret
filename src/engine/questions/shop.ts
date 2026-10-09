/**
 * Affären: paying with coins and notes, and giving change - played in a
 * shop (game/questions/shop/ShopPlayer.tsx), not written. Swedish money: 1, 2, 5 and 10
 * kronor coins; 20, 50, 100, 200 and 500 kronor notes.
 *
 *   1.6.2 betala   - one thing; pay exactly from your wallet
 *   1.6.3 växel    - you're the cashier: the customer pays with a note, you give back the change
 *   1.6.4 handla   - a shopping list: pick the things off the shelves, then pay it all exactly
 *   2.9.6 kassan   - the cashier again: several things, paid with a 100, 200 or 500 note
 *
 * Each round goes from its easiest question to its hardest (`difficulty`).
 */
import { pick, randInt, type Rng } from "../rng";
import { questionType } from "./questionType";

export type ShopStageId = "1.6.2" | "1.6.3" | "1.6.4" | "2.9.6";
export type Money = 1 | 2 | 5 | 10 | 20 | 50 | 100 | 200 | 500;
export const MONEY: readonly Money[] = [500, 200, 100, 50, 20, 10, 5, 2, 1];
export const isCoin = (m: Money) => m <= 10;

export type ShopKind = "kiosk" | "toys" | "market" | "store";

export interface ShopItem {
  id: string;
  emoji: string;
  price: number;
}

/** What each shop sells, and the price range of each thing. */
const CATALOG: Record<ShopKind, { id: string; emoji: string; min: number; max: number }[]> = {
  kiosk: [
    { id: "icecream", emoji: "🍦", min: 12, max: 25 },
    { id: "lollipop", emoji: "🍭", min: 3, max: 8 },
    { id: "juice", emoji: "🧃", min: 8, max: 15 },
    { id: "cookie", emoji: "🍪", min: 5, max: 12 },
    { id: "chocolate", emoji: "🍫", min: 10, max: 22 },
    { id: "soda", emoji: "🥤", min: 12, max: 19 },
    { id: "hotdog", emoji: "🌭", min: 15, max: 29 },
  ],
  toys: [
    { id: "balloon", emoji: "🎈", min: 5, max: 15 },
    { id: "teddy", emoji: "🧸", min: 39, max: 95 },
    { id: "car", emoji: "🚗", min: 19, max: 59 },
    { id: "ball", emoji: "⚽", min: 29, max: 79 },
    { id: "kite", emoji: "🪁", min: 35, max: 89 },
    { id: "dino", emoji: "🦖", min: 25, max: 69 },
    { id: "puzzle", emoji: "🧩", min: 29, max: 79 },
    { id: "paints", emoji: "🎨", min: 19, max: 45 },
  ],
  market: [
    { id: "apple", emoji: "🍎", min: 3, max: 8 },
    { id: "banana", emoji: "🍌", min: 3, max: 7 },
    { id: "melon", emoji: "🍉", min: 19, max: 39 },
    { id: "carrot", emoji: "🥕", min: 2, max: 6 },
    { id: "strawberries", emoji: "🍓", min: 25, max: 45 },
    { id: "pear", emoji: "🍐", min: 4, max: 9 },
    { id: "cucumber", emoji: "🥒", min: 8, max: 15 },
    { id: "bread", emoji: "🍞", min: 19, max: 35 },
  ],
  store: [
    { id: "game", emoji: "🎮", min: 149, max: 299 },
    { id: "skateboard", emoji: "🛹", min: 199, max: 449 },
    { id: "headphones", emoji: "🎧", min: 119, max: 249 },
    { id: "book", emoji: "📚", min: 79, max: 179 },
    { id: "shoes", emoji: "👟", min: 199, max: 399 },
    { id: "backpack", emoji: "🎒", min: 149, max: 329 },
    { id: "watch", emoji: "⌚", min: 99, max: 249 },
    { id: "cap", emoji: "🧢", min: 59, max: 129 },
  ],
};

export interface ShopProblem {
  stageId: ShopStageId;
  kind: "shop";
  /** Pay exactly (from your wallet), give change (from the till), or a shopping list to pick and pay. */
  mode: "pay" | "change" | "basket";
  shop: ShopKind;
  /** What's on the shelves. */
  shelf: ShopItem[];
  /** The things bought (ids on the shelf) - the shopping list, in basket mode. */
  buy: string[];
  /** Pay and basket: the money in your wallet. */
  wallet: Money[];
  /** Change: what the customer pays with. */
  paidWith: Money[];
  /** The money the till holds, for giving change. */
  till: Money[];
  total: number;
  /** What's given back (change mode), 0 otherwise. */
  change: number;
  difficulty: number;
}


/** The fewest coins and notes making `amount` - largest first, the way it's counted out. */
export function fewestPieces(amount: number, available: readonly Money[] = MONEY): Money[] {
  const out: Money[] = [];
  let left = amount;
  for (const m of [...new Set(available)].sort((a, b) => b - a)) {
    while (left >= m) {
      out.push(m);
      left -= m;
    }
  }
  return left === 0 ? out : [];
}

/** Can `amount` be made exactly from these pieces (each used once)? */
export function canPay(amount: number, pieces: readonly Money[]): boolean {
  const reach = new Set([0]);
  for (const p of pieces) for (const r of [...reach]) reach.add(r + p);
  return reach.has(amount);
}

export const sum = (pieces: readonly Money[]) => pieces.reduce<number>((a, b) => a + b, 0);

/** A shelf of 5 things from a shop, at prices in their ranges - with the ones to buy among them. */
function stockShelf(rng: Rng, shop: ShopKind, count: number): ShopItem[] {
  const pool = [...CATALOG[shop]];
  const shelf: ShopItem[] = [];
  while (shelf.length < count && pool.length > 0) {
    const i = randInt(rng, 0, pool.length - 1);
    const c = pool.splice(i, 1)[0];
    shelf.push({ id: c.id, emoji: c.emoji, price: randInt(rng, c.min, c.max) });
  }
  return shelf;
}

/**
 * A wallet to pay `amount` from: enough to pay exactly - the obvious way and
 * other ways - plus a little that isn't needed, so it has to be counted out,
 * not just emptied.
 */
function walletFor(rng: Rng, amount: number): Money[] {
  const exact = fewestPieces(amount, [50, 20, 10, 5, 2, 1]);
  const extra: Money[] = [pick(rng, [1, 2, 5] as Money[]), pick(rng, [2, 5, 10] as Money[]), pick(rng, [10, 20] as Money[])];
  // Sometimes a bigger piece split up, so there's more than one way to pay.
  if (exact.includes(10) && rng() < 0.6) extra.push(5, 5);
  if (exact.includes(20) && rng() < 0.5) extra.push(10, 10);
  return [...exact, ...extra].sort((a, b) => b - a);
}

/** How hard a sum of money is: its size, how many pieces it takes, a ten to cross. */
const amountScore = (amount: number) => Math.log2(amount + 1) + fewestPieces(amount).length * 0.5;

function pay(rng: Rng): ShopProblem {
  const shop = pick(rng, ["kiosk", "toys", "market"] as ShopKind[]);
  const shelf = stockShelf(rng, shop, 5);
  const item = pick(rng, shelf);
  return {
    stageId: "1.6.2",
    kind: "shop",
    mode: "pay",
    shop,
    shelf,
    buy: [item.id],
    wallet: walletFor(rng, item.price),
    paidWith: [],
    till: [],
    total: item.price,
    change: 0,
    difficulty: amountScore(item.price),
  };
}

/** The note a customer pays a price with: the smallest of 20, 50, 100 (… 500) that covers it - now and then the next one up. */
function noteFor(rng: Rng, price: number, notes: readonly Money[]): Money {
  const covering = notes.filter((n) => n > price);
  return covering.length > 1 && rng() < 0.3 ? covering[1] : covering[0];
}

function change(rng: Rng): ShopProblem {
  const shop = pick(rng, ["kiosk", "toys", "market"] as ShopKind[]);
  const shelf = stockShelf(rng, shop, 5);
  const item = pick(rng, shelf);
  const note = noteFor(rng, item.price, [20, 50, 100]);
  return {
    stageId: "1.6.3",
    kind: "shop",
    mode: "change",
    shop,
    shelf,
    buy: [item.id],
    wallet: [],
    paidWith: [note],
    till: [50, 20, 10, 5, 2, 1],
    total: item.price,
    change: note - item.price,
    difficulty: amountScore(note - item.price) + (item.price % 10 !== 0 ? 1 : 0),
  };
}

function basket(rng: Rng): ShopProblem {
  for (;;) {
    const shop = pick(rng, ["kiosk", "market"] as ShopKind[]);
    const shelf = stockShelf(rng, shop, 6);
    const n = rng() < 0.6 ? 2 : 3;
    const buy = shelf.slice(0, 0);
    const pool = [...shelf];
    while (buy.length < n) buy.push(pool.splice(randInt(rng, 0, pool.length - 1), 1)[0]);
    const total = buy.reduce((s, x) => s + x.price, 0);
    if (total > 100) continue;
    return {
      stageId: "1.6.4",
      kind: "shop",
      mode: "basket",
      shop,
      shelf,
      buy: buy.map((x) => x.id),
      wallet: walletFor(rng, total),
      paidWith: [],
      till: [],
      total,
      change: 0,
      difficulty: amountScore(total) + n,
    };
  }
}

function bigChange(rng: Rng): ShopProblem {
  for (;;) {
    const shop: ShopKind = rng() < 0.5 ? "store" : "toys";
    const shelf = stockShelf(rng, shop, 6);
    const n = randInt(rng, 2, 3);
    const bought = shelf.slice(0, n);
    const total = bought.reduce((s, x) => s + x.price, 0);
    if (total >= 500) continue;
    const note = noteFor(rng, total, [100, 200, 500]);
    return {
      stageId: "2.9.6",
      kind: "shop",
      mode: "change",
      shop,
      shelf,
      buy: bought.map((x) => x.id),
      wallet: [],
      paidWith: [note],
      till: [200, 100, 50, 20, 10, 5, 2, 1],
      total,
      change: note - total,
      difficulty: amountScore(note - total) + n,
    };
  }
}

export const SHOP_QUESTIONS = questionType({
  id: "shop",
  kinds: ["shop"],
  levels: {
    "1.6.2": pay,
    "1.6.3": change,
    "1.6.4": basket,
    "2.9.6": bigChange,
  },
  key: (p) => `${p.kind}:${p.mode}:${p.buy.join(",")}:${p.total}:${p.paidWith.join(",")}`,
});
