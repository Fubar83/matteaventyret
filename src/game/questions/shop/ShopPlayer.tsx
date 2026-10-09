import { useMemo, useRef, useState } from "react";
import { fewestPieces, sum, type Money, type ShopItem, type ShopKind, type ShopProblem } from "../../../engine/questions/shop";
import { t } from "../../../i18n";
import { Avatar } from "../../Avatar";
import { HelpLadder } from "../HelpLadder";
import type { QuestionOutcome } from "../questionOutcome";
import { MoneyPiece } from "./Money";
import { NextSheet } from "../NextSheet";

/** Each shop's colours: the awning's stripes, the wallpaper, the sign. */
const THEME: Record<ShopKind, { stripeA: string; stripeB: string; wall: string; wallLine: string; keeper: string; customer: string }> = {
  kiosk: { stripeA: "#ef4444", stripeB: "#ffffff", wall: "#fff1e6", wallLine: "#fde2cc", keeper: "ekorre", customer: "igelkott" },
  toys: { stripeA: "#8b5cf6", stripeB: "#fde047", wall: "#f3e8ff", wallLine: "#e9d5ff", keeper: "uggla", customer: "rav" },
  market: { stripeA: "#16a34a", stripeB: "#ffffff", wall: "#ecfccb", wallLine: "#d9f99d", keeper: "grodan", customer: "ekorre" },
  store: { stripeA: "#0ea5e9", stripeB: "#ffffff", wall: "#e0f2fe", wallLine: "#bae6fd", keeper: "bjorn", customer: "uggla" },
};

const itemName = (id: string) => t(`shop.item.${id}`);
/** "en ballong, en nalle och en drake". */
const listOf = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} ${t("shop.and")} ${names.at(-1)}`);
/** At the start of a sentence: "En glass kostar …". */
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const kr = (pieces: readonly Money[]) => pieces.map((p) => `${p} kr`).join(" + ");

/** Pieces from `wallet` (each used once) making exactly `amount` - the fewest, found by trying. */
function payFrom(wallet: readonly Money[], amount: number): Money[] | null {
  const best = new Map<number, Money[]>([[0, []]]);
  for (const piece of [...wallet].sort((a, b) => b - a)) {
    for (const [total, used] of [...best]) {
      const next = total + piece;
      if (next > amount) continue;
      const candidate = [...used, piece];
      if (!best.has(next) || best.get(next)!.length > candidate.length) best.set(next, candidate);
    }
  }
  return best.get(amount) ?? null;
}

/** Counting up from the price to the note, the cashier's way: 37 → 40 is 3, 40 → 50 is 10. */
function countUp(price: number, paid: number): { from: number; to: number; diff: number }[] {
  const legs: { from: number; to: number; diff: number }[] = [];
  let at = price;
  const ten = Math.ceil(at / 10) * 10;
  if (ten !== at && ten <= paid) legs.push({ from: at, to: ten, diff: ten - at }), (at = ten);
  const hundred = Math.ceil(at / 100) * 100;
  if (hundred !== at && hundred < paid) legs.push({ from: at, to: hundred, diff: hundred - at }), (at = hundred);
  if (at !== paid) legs.push({ from: at, to: paid, diff: paid - at });
  return legs;
}

type Piece = { key: number; value: Money; from?: number };

/** The awning: stripes with a scalloped edge. */
function Awning({ a, b }: { a: string; b: string }) {
  const n = 12;
  const w = 400 / n;
  return (
    <svg viewBox="0 0 400 58" preserveAspectRatio="none" className="absolute top-0 inset-x-0 w-full h-14 drop-shadow-md" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={`M${i * w} 0 H${(i + 1) * w} V40 Q${i * w + w / 2} 58 ${i * w} 40 Z`} fill={i % 2 ? b : a} />
      ))}
      <rect width="400" height="6" fill="#00000022" />
    </svg>
  );
}

/** A thing on the shelf: bobbing gently, its price on a tag hanging from it. */
function ShelfItem({ item, index, picked, onPick, interactive }: { item: ShopItem; index: number; picked: boolean; onPick: () => void; interactive: boolean }) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={!interactive || picked}
      aria-label={`${itemName(item.id)}, ${item.price} kr`}
      className={`relative flex flex-col items-center transition-opacity ${picked ? "opacity-25" : ""} ${interactive && !picked ? "cursor-pointer hover:scale-110 active:scale-95 transition-transform" : "cursor-default"}`}
    >
      <span className="text-5xl leading-none anim-bob select-none" style={{ animationDelay: `${index * 0.35}s`, filter: "drop-shadow(0 4px 2px rgba(0,0,0,0.25))" }}>
        {item.emoji}
      </span>
      <span className="mt-1 rounded-md bg-white border-2 border-rose-400 px-1.5 text-sm font-extrabold text-rose-600 shadow" style={{ transform: `rotate(${index % 2 ? 6 : -5}deg)` }}>
        {item.price} kr
      </span>
    </button>
  );
}

/** A cash register: a body, a screen, keys and a drawer. */
function Register({ display }: { display: string }) {
  return (
    <svg width="96" height="78" viewBox="0 0 96 78" aria-hidden className="drop-shadow-lg">
      <rect x="18" y="4" width="60" height="22" rx="4" fill="#1f2937" />
      <rect x="23" y="8" width="50" height="14" rx="2" fill="#064e3b" />
      <text x="48" y="19" textAnchor="middle" fontSize="11" fontWeight="700" fill="#4ade80" fontFamily="monospace">
        {display}
      </text>
      <path d="M8 30 H88 L80 60 H16 Z" fill="#475569" />
      {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} x={26 + c * 12} y={34 + r * 8} width={9} height={5} rx={1.5} fill="#e2e8f0" />))}
      <rect x="4" y="60" width="88" height="16" rx="3" fill="#334155" />
      <rect x="40" y="65" width="16" height="4" rx="2" fill="#94a3b8" />
    </svg>
  );
}

/** Confetti, on a right answer. */
function Confetti() {
  const bits = useMemo(() => Array.from({ length: 28 }, (_, i) => ({ left: (i * 37) % 100, delay: (i % 7) * 0.08, color: ["#f43f5e", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7"][i % 5], size: 6 + (i % 3) * 3 })), []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bits.map((b, i) => (
        <span key={i} className="absolute top-0 anim-confetti rounded-sm" style={{ left: `${b.left}%`, width: b.size, height: b.size * 0.6, background: b.color, animationDelay: `${b.delay}s` }} />
      ))}
    </div>
  );
}

/**
 * Affären: a shop to play in. Pay for something with the coins and notes in
 * your wallet, exactly; pick a shopping list off the shelves and pay for it
 * all; or stand at the till and give a customer their change. Money is
 * tapped onto the tray on the counter (and tapped again to take it back) -
 * no sum shown, it's to be counted. A wrong try gets the shopkeeper's (or
 * the customer's) reaction; help goes from a tip, to a worked way, to the
 * money laid out.
 */
export function ShopPlayer({ problem, onSolved }: { problem: ShopProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const theme = THEME[problem.shop];
  const nextKey = useRef(1);
  const [tray, setTray] = useState<Piece[]>([]);
  const [picked, setPicked] = useState<string[]>(problem.mode === "change" ? problem.buy : []);
  const [attempts, setAttempts] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [state, setState] = useState<"working" | "solved" | "shown">("working");
  const cashier = problem.mode === "change";
  const items = problem.shelf.filter((x) => problem.buy.includes(x.id));
  const first = items[0];
  const note = problem.paidWith[0];
  const opening = cashier
    ? items.length === 1
      ? t("shop.say.customerOne", { item: itemName(first.id), price: first.price, note })
      : t("shop.say.customerMany", { items: listOf(items.map((x) => itemName(x.id))), note })
    : problem.mode === "pay"
      ? t("shop.say.pay", { item: capital(itemName(first.id)), price: first.price })
      : t("shop.say.basket");
  const [bubble, setBubble] = useState<{ text: string; mood: "talk" | "happy" | "puzzled" }>({ text: opening, mood: "talk" });

  const usedFromWallet = new Set(tray.map((p) => p.from).filter((x): x is number => x !== undefined));
  const target = cashier ? problem.change : problem.total;
  const done = state !== "working";

  function addFromWallet(index: number) {
    if (done || usedFromWallet.has(index)) return;
    setTray((tr) => [...tr, { key: nextKey.current++, value: problem.wallet[index], from: index }]);
  }
  function addFromTill(value: Money) {
    if (done) return;
    setTray((tr) => [...tr, { key: nextKey.current++, value }]);
  }
  function takeBack(key: number) {
    if (done) return;
    setTray((tr) => tr.filter((p) => p.key !== key));
  }
  function pick(id: string) {
    if (done || picked.includes(id)) return;
    if (!problem.buy.includes(id)) {
      setBubble({ text: t("shop.say.notOnList", { item: itemName(id) }), mood: "puzzled" });
      return;
    }
    setPicked((p) => [...p, id]);
    setBubble({ text: t("shop.say.picked", { item: capital(itemName(id)) }), mood: "talk" });
  }

  const outcome = (shown: boolean): QuestionOutcome => ({
    helped: helpUsed > 0 || attempts >= 2 || shown,
    fullSetup: true,
    wrongFirstAttempts: attempts >= 1 ? 1 : 0,
    hintUsed: attempts >= 2,
    miniTutorialUsed: shown,
  });

  /** The answer laid out on the tray: from the wallet (pay, basket) or the till (change). */
  function solution(): Piece[] {
    if (cashier) return fewestPieces(problem.change, problem.till).map((value) => ({ key: nextKey.current++, value }));
    const pieces = payFrom(problem.wallet, problem.total) ?? [];
    const free = problem.wallet.map((v, i) => ({ v, i }));
    return pieces.map((value) => {
      const at = free.findIndex((f) => f.v === value);
      const [{ i }] = free.splice(at, 1);
      return { key: nextKey.current++, value, from: i };
    });
  }

  function show() {
    setPicked(problem.buy);
    setTray(solution());
    setState("shown");
    setBubble({ text: cashier ? t("shop.say.shownChange", { change: problem.change }) : t("shop.say.shownPay", { total: problem.total }), mood: "talk" });
  }

  function check() {
    if (problem.mode === "basket" && picked.length < problem.buy.length) {
      setBubble({ text: t("shop.say.listNotDone"), mood: "puzzled" });
      return;
    }
    const given = sum(tray.map((p) => p.value));
    if (given === target) {
      setState("solved");
      setBubble({ text: cashier ? t("shop.say.thanksCustomer") : t("shop.say.thanks"), mood: "happy" });
      onSolved(outcome(false));
      return;
    }
    const next = attempts + 1;
    setAttempts(next);
    if (next >= 3) {
      show();
      return;
    }
    if (cashier) setBubble({ text: t(given < target ? "shop.say.changeTooLittle" : "shop.say.changeTooMuch", { given }), mood: "puzzled" });
    else setBubble({ text: t(given < target ? "shop.say.tooLittle" : "shop.say.tooMuch", { given, total: problem.total }), mood: "puzzled" });
  }

  const legs = cashier ? countUp(problem.total, note) : [];
  const helpSteps = cashier
    ? [
        { title: t("help.tip"), content: t("shop.help.changeTip") },
        {
          title: t("help.step"),
          content: `${items.length > 1 ? `${t("shop.help.total", { sum: items.map((x) => x.price).join(" + "), total: problem.total })} ` : ""}${legs.map((l) => t("shop.help.leg", { from: l.from, to: l.to, diff: l.diff })).join(" ")} ${t("shop.help.together", { change: problem.change })}`,
        },
        { title: t("help.solution"), content: t("shop.help.giveBack", { pieces: kr(fewestPieces(problem.change, problem.till)) }), onReveal: show },
      ]
    : [
        { title: t("help.tip"), content: t(problem.mode === "basket" ? "shop.help.basketTip" : "shop.help.payTip") },
        {
          title: t("help.step"),
          content: problem.mode === "basket" ? t("shop.help.total", { sum: items.map((x) => x.price).join(" + "), total: problem.total }) : t("shop.help.payWith", { pieces: kr(payFrom(problem.wallet, problem.total) ?? []) }),
        },
        { title: t("help.solution"), content: t("shop.help.layOut", { pieces: kr(payFrom(problem.wallet, problem.total) ?? []) }), onReveal: show },
      ];

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* The shop. */}
      <div className="relative w-full max-w-xl h-[480px] rounded-3xl overflow-hidden border-4 border-amber-900/70 shadow-xl" style={{ background: `repeating-linear-gradient(90deg, ${theme.wall} 0 22px, ${theme.wallLine} 22px 26px)` }}>
        <Awning a={theme.stripeA} b={theme.stripeB} />
        <div className="absolute top-12 left-1/2 -translate-x-1/2 rounded-lg px-5 py-1 text-lg font-extrabold text-amber-50 shadow-md border-2 border-amber-950/40" style={{ background: "linear-gradient(#a16207, #78350f)", fontFamily: "'Trebuchet MS', sans-serif" }}>
          {t(`shop.kind.${problem.shop}`)}
        </div>

        {/* Two shelves of things. */}
        {[problem.shelf.slice(0, 3), problem.shelf.slice(3)].map((row, r) => (
          <div key={r} className="absolute inset-x-6" style={{ top: 92 + r * 96 }}>
            <div className="flex justify-around items-end h-[78px] px-2">
              {row.map((item, i) => (
                <ShelfItem key={item.id} item={item} index={r * 3 + i} picked={problem.mode === "basket" && picked.includes(item.id)} onPick={() => pick(item.id)} interactive={problem.mode === "basket" && !done} />
              ))}
            </div>
            <div className="h-3 rounded-sm shadow-md" style={{ background: "linear-gradient(#b45309, #78350f)" }} />
          </div>
        ))}

        {/* The counter, with the tray (and the till, the customer's note, the basket). */}
        <div className="absolute inset-x-0 bottom-0 h-[118px]" style={{ background: "linear-gradient(#d97706 0 10px, #92400e 10px 14px, #b45309 14px)" }}>
          <div className="absolute inset-x-0 top-[14px] bottom-0 opacity-20" style={{ background: "repeating-linear-gradient(90deg, transparent 0 38px, #451a03 38px 40px)" }} />
        </div>

        {/* The shopkeeper - or, at the till, the customer - and what they say. */}
        <div className={`absolute bottom-[100px] ${cashier ? "left-3" : "right-3"} ${bubble.mood === "happy" ? "anim-happy-hop" : ""}`}>
          <Avatar id={cashier ? theme.customer : theme.keeper} size={86} />
        </div>
        <div className={`absolute ${cashier ? "left-[100px]" : "right-[100px]"} bottom-[126px] max-w-[60%] rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-lg border-2 border-slate-200`} role="status">
          {bubble.mood === "puzzled" ? "🤔 " : bubble.mood === "happy" ? "😊 " : ""}
          {bubble.text}
          <span className={`absolute -bottom-2 ${cashier ? "left-4" : "right-4"} w-4 h-4 rotate-45 bg-white border-b-2 border-r-2 border-slate-200`} />
        </div>

        {cashier && (
          <div className="absolute bottom-[96px] right-4">
            <Register display={`${problem.total} kr`} />
          </div>
        )}
        {cashier && (
          <div className="absolute bottom-[22px] left-4 flex flex-col items-center -rotate-6">
            <span className="text-[10px] font-bold text-amber-100 uppercase tracking-wide">{t("shop.paidWith")}</span>
            <MoneyPiece value={note} noteWidth={86} />
          </div>
        )}
        {problem.mode === "basket" && (
          <div className="absolute bottom-[20px] left-3 flex items-end">
            <span className="text-5xl" aria-hidden>
              🧺
            </span>
            <span className="text-2xl -ml-9 mb-5 flex">{picked.map((id) => problem.shelf.find((x) => x.id === id)!.emoji)}</span>
          </div>
        )}
        {cashier && (
          <div className="absolute bottom-[60px] left-[110px] flex gap-1 text-3xl" aria-hidden>
            {items.map((x) => (
              <span key={x.id}>{x.emoji}</span>
            ))}
          </div>
        )}

        {/* The tray: money tapped onto it lands here - tap it again to take it back. */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[46%] min-h-[70px] rounded-[50%] border-4 border-dashed border-amber-200/80 bg-amber-950/25 flex flex-wrap items-center justify-center gap-1 px-4 py-2" aria-label={t("shop.tray")}>
          {tray.length === 0 && <span className="text-amber-100/90 text-xs font-bold">{t(cashier ? "shop.trayChange" : "shop.trayPay")}</span>}
          {tray.map((p) => (
            <button key={p.key} type="button" onClick={() => takeBack(p.key)} className="anim-coin-pop" aria-label={`${p.value} kr`}>
              <MoneyPiece value={p.value} noteWidth={64} />
            </button>
          ))}
        </div>

        {state === "solved" && <Confetti />}
      </div>

      {/* The shopping list. */}
      {problem.mode === "basket" && (
        <div className="w-full max-w-xs rounded-lg bg-[#fffdf2] border border-amber-200 shadow-md px-4 py-2 -rotate-1" style={{ backgroundImage: "repeating-linear-gradient(transparent 0 23px, #bfdbfe 23px 24px)" }}>
          <div className="font-bold text-slate-700" style={{ fontFamily: "'Comic Sans MS', 'Trebuchet MS', sans-serif" }}>
            📝 {t("shop.list")}
          </div>
          {items.map((x) => (
            <div key={x.id} className={`text-slate-700 leading-6 ${picked.includes(x.id) ? "line-through opacity-50" : ""}`} style={{ fontFamily: "'Comic Sans MS', 'Trebuchet MS', sans-serif" }}>
              {x.emoji} {itemName(x.id)}
            </div>
          ))}
        </div>
      )}

      {/* The wallet - or, at the till, the drawer with every kind of coin and note. */}
      {cashier ? (
        <div className="w-full max-w-xl rounded-2xl p-3 shadow-inner border-4 border-slate-500" style={{ background: "linear-gradient(#475569, #334155)" }}>
          <div className="text-xs font-bold text-slate-200 mb-2">💰 {t("shop.till")}</div>
          <div className="grid grid-cols-4 gap-2">
            {problem.till.map((v) => (
              <button key={v} type="button" disabled={done} onClick={() => addFromTill(v)} className="rounded-xl bg-slate-800/70 border border-slate-600 flex items-center justify-center h-16 hover:bg-slate-700 active:scale-95 transition" aria-label={`${v} kr`}>
                <MoneyPiece value={v} noteWidth={70} />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-xl rounded-2xl p-3 shadow-lg border-2 border-dashed border-amber-300/60" style={{ background: "linear-gradient(#92400e, #78350f)" }}>
          <div className="text-xs font-bold text-amber-100 mb-2">👛 {t("shop.wallet")}</div>
          <div className="flex flex-wrap gap-2 items-center justify-center min-h-[64px]">
            {problem.wallet.map((v, i) => (
              <button key={i} type="button" disabled={done || usedFromWallet.has(i)} onClick={() => addFromWallet(i)} className={`transition ${usedFromWallet.has(i) ? "opacity-0 scale-50" : "hover:-translate-y-1 active:scale-95"}`} aria-label={`${v} kr`}>
                <MoneyPiece value={v} noteWidth={88} />
              </button>
            ))}
          </div>
        </div>
      )}

      {state === "working" && (
        <>
          <button type="button" onClick={check} className="h-14 px-10 rounded-2xl bg-emerald-500 text-white text-lg font-extrabold shadow-lg border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2">
            {t(cashier ? "shop.giveBack" : "shop.pay")}
          </button>
          <HelpLadder used={helpUsed} onUse={setHelpUsed} steps={helpSteps} />
        </>
      )}
      {state === "shown" && (
        <NextSheet note={bubble.text} onNext={() => onSolved(outcome(true))} />
      )}
    </div>
  );
}
