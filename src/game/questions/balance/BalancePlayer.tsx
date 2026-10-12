import { useState } from "react";
import { playEffect } from "../../../audio/sound";
import { applyStep, panLatex, solvedValue, type BalanceProblem, type BalanceStep, type Pan } from "../../../engine/questions/balance";
import type { ChoiceText } from "../../../engine/questions/choice/problem";
import { t } from "../../../i18n";
import { Tex } from "../../Tex";
import { HelpLadder } from "../HelpLadder";
import { NextSheet } from "../NextSheet";
import { triedOutcome, type QuestionOutcome } from "../questionOutcome";

const say = (x: ChoiceText) => t(x.key, x.vars);
/** Steps that can't be done before the solution is shown. */
const WRONG_ALLOWED = 3;
const INK = "#334155";
const HALF = 120;
const same = (a: Pan, b: Pan) => a.x === b.x && a.n === b.n;

/** A pan's things in rows, from the bottom up: x-boxes, then weights of 10, 5 and 1 - each one can be lifted off. */
function PanThings({ pan, cx, bottom, onLift }: { pan: Pan; cx: number; bottom: number; onLift?: (thing: "x" | number) => void }) {
  const weights = [...Array(Math.floor(pan.n / 10)).fill(10), ...Array(Math.floor((pan.n % 10) / 5)).fill(5), ...Array(pan.n % 5).fill(1)] as number[];
  const things = [...Array(pan.x).fill("x"), ...weights] as (number | "x")[];
  const size = (t: number | "x") => (t === "x" ? 26 : t === 10 ? 26 : t === 5 ? 22 : 16);
  const rows: (number | "x")[][] = [];
  // Five to a row: a row fits on the pan.
  things.forEach((t, i) => (i % 5 === 0 ? rows.push([t]) : rows[rows.length - 1].push(t)));
  return (
    <g>
      {rows.map((row, r) => {
        const w = row.reduce<number>((s, t) => s + size(t) + 3, -3);
        let x = cx - w / 2;
        return row.map((thing, i) => {
          const s = size(thing);
          const y = bottom - (r + 1) * 30 + (30 - s);
          const el = (
            <g
              key={`${r}-${i}`}
              onClick={onLift ? () => onLift(thing) : undefined}
              style={onLift ? { cursor: "pointer" } : undefined}
              role={onLift ? "button" : undefined}
              aria-label={onLift ? t(thing === "x" ? "balance.liftX" : "balance.lift", { n: thing }) : undefined}
              data-thing={thing}
            >
              <rect x={x} y={y} width={s} height={s} rx={thing === "x" ? 4 : 3} fill={thing === "x" ? "#7c3aed" : "#64748b"} stroke={thing === "x" ? "#4c1d95" : "#1e293b"} strokeWidth={1.4} />
              <text x={x + s / 2} y={y + s / 2} textAnchor="middle" dominantBaseline="central" fontSize={thing === "x" ? 15 : s > 20 ? 12 : 9} fontWeight={900} fill="#fff" pointerEvents="none">
                {thing}
              </text>
            </g>
          );
          x += s + 3;
          return el;
        });
      })}
    </g>
  );
}

/**
 * An equation as a balance that moves. Lift a thing off one pan and the beam
 * tips - by the real difference, x weighing what it is - and it levels again
 * only when the same comes off the other side. "På båda" does a step to both
 * at once; sharing works when the balance is level. Every level state is
 * written as an equation. Solved when a lone x stands on one level pan.
 */
export function BalancePlayer({ problem, onSolved }: { problem: BalanceProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const start: [Pan, Pan] = [problem.left, problem.right];
  const [pans, setPans] = useState<[Pan, Pan]>(start);
  const [history, setHistory] = useState<[Pan, Pan][]>([]);
  const [lines, setLines] = useState<{ latex: string; pans: [Pan, Pan] }[]>([{ latex: `${panLatex(problem.left)} = ${panLatex(problem.right)}`, pans: start }]);
  const [wrong, setWrong] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [state, setState] = useState<"working" | "solved" | "shown">("working");
  const [message, setMessage] = useState<string | null>(null);
  const working = state === "working";
  const weight = (p: Pan) => p.x * problem.answer + p.n;
  const [wl, wr] = pans.map(weight);
  const level = wl === wr;
  // Heavier side down, more for a bigger difference - at most 14°.
  const tilt = Math.max(-14, Math.min(14, ((wr - wl) / Math.max(wl, wr, 1)) * 40));
  const end = (side: -1 | 1) => [side * HALF * Math.cos((tilt * Math.PI) / 180), side * HALF * Math.sin((tilt * Math.PI) / 180)];

  /** The balance after a change: level and new, it's written down - and maybe solved. */
  function settle(next: [Pan, Pan]) {
    setHistory((h) => [...h, pans]);
    setPans(next);
    if (weight(next[0]) !== weight(next[1])) {
      setMessage(t("balance.tipped"));
      return;
    }
    setMessage(null);
    const last = lines[lines.length - 1].pans;
    if (!(same(last[0], next[0]) && same(last[1], next[1]))) setLines((ls) => [...ls, { latex: `${panLatex(next[0])} = ${panLatex(next[1])}`, pans: next }]);
    if (solvedValue(next) !== null) {
      playEffect("correct");
      setState("solved");
      onSolved(triedOutcome({ wrong, helpUsed }));
    }
  }

  function fail(why: ChoiceText) {
    playEffect("wrong");
    const next = wrong + 1;
    setWrong(next);
    if (next >= WRONG_ALLOWED) {
      setState("shown");
      setMessage(`${say(why)} ${say(problem.explanation)}`);
      return;
    }
    setMessage(say(why));
  }

  function step(s: BalanceStep) {
    if (!working) return;
    if (!level) return fail({ key: "balance.why.levelFirst" });
    const done = applyStep(pans, s);
    if ("why" in done) return fail(done.why);
    settle(done.pans);
  }

  /** One thing lifted off one pan - the balance tips until the same comes off the other. */
  function lift(side: 0 | 1, thing: "x" | number) {
    if (!working) return;
    const p = pans[side];
    const next: Pan = thing === "x" ? { ...p, x: p.x - 1 } : { ...p, n: p.n - thing };
    settle(side === 0 ? [next, pans[1]] : [pans[0], next]);
  }

  const button = "h-11 min-w-12 px-3 rounded-full border-2 bg-white border-slate-300 text-base font-bold shadow-sm active:translate-y-0.5 disabled:opacity-40";
  const move = { transition: "transform 0.7s cubic-bezier(.3,1.6,.5,1)" };
  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      <svg viewBox="0 0 420 230" className="w-full max-w-lg select-none" role="img" aria-label={t("balance.label", { eq: lines[lines.length - 1].latex })}>
        <polygon points="210,92 195,216 225,216" fill="#94a3b8" stroke={INK} strokeWidth={2} />
        <rect x={150} y={214} width={120} height={10} rx={4} fill="#64748b" />
        <g style={{ ...move, transform: `rotate(${tilt}deg)`, transformOrigin: "210px 92px", transformBox: "view-box" }}>
          <line x1={210 - HALF} y1={92} x2={210 + HALF} y2={92} stroke={INK} strokeWidth={6} strokeLinecap="round" />
          {/* A pointer under the middle: straight down when level. */}
          <line x1={210} y1={92} x2={210} y2={124} stroke={level ? "#059669" : "#e11d48"} strokeWidth={3} strokeLinecap="round" />
        </g>
        <circle cx={210} cy={92} r={6} fill={INK} />
        {([0, 1] as const).map((side) => {
          const [dx, dy] = end(side === 0 ? -1 : 1);
          const cx = 210 + (side === 0 ? -HALF : HALF);
          return (
            <g key={side} style={{ ...move, transform: `translate(${210 + dx - cx}px, ${dy}px)` }}>
              <line x1={cx} y1={92} x2={cx} y2={150} stroke={INK} strokeWidth={2} />
              <path d={`M${cx - 80} 150 Q ${cx} 172 ${cx + 80} 150 Z`} fill="#cbd5e1" stroke={INK} strokeWidth={2} />
              <PanThings pan={pans[side]} cx={cx} bottom={150} onLift={working ? (thing) => lift(side, thing) : undefined} />
            </g>
          );
        })}
      </svg>
      <ol className="flex flex-col items-center gap-0.5 text-xl" aria-label={t("balance.steps")}>
        {lines.map((l, i) => (
          <li key={i} className={i === lines.length - 1 ? "font-bold" : "text-slate-500"}>
            <Tex latex={l.latex} />
          </li>
        ))}
      </ol>
      {working && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-slate-500">{t("balance.liftHint")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[1, 5, 10].map((n) => (
              <button key={n} type="button" className={button} onClick={() => step({ op: "take", n })} data-step={`take${n}`}>
                {t("balance.take", { n })}
              </button>
            ))}
            <button type="button" className={`${button} border-violet-300`} onClick={() => step({ op: "takeX" })} data-step="takeX">
              {t("balance.takeX")}
            </button>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-2">
            <span className="text-sm font-semibold text-slate-600">{t("balance.share")}</span>
            {[2, 3, 4, 5, 6].map((by) => (
              <button key={by} type="button" className={button} onClick={() => step({ op: "share", by })} data-step={`share${by}`}>
                {by}
              </button>
            ))}
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              className="text-sm text-slate-600 underline disabled:opacity-40"
              disabled={history.length === 0}
              onClick={() => {
                const prev = history[history.length - 1];
                setHistory((h) => h.slice(0, -1));
                setPans(prev);
                setMessage(weight(prev[0]) === weight(prev[1]) ? null : t("balance.tipped"));
              }}
            >
              {t("balance.undo")}
            </button>
            <button
              type="button"
              className="text-sm text-slate-600 underline"
              onClick={() => {
                setPans(start);
                setHistory([]);
                setLines([lines[0]]);
                setMessage(null);
              }}
            >
              {t("balance.reset")}
            </button>
          </div>
        </div>
      )}
      {message && working && (
        <p role="status" className={`text-sm text-center max-w-sm ${level ? "text-slate-700" : "text-rose-700 font-semibold"}`}>
          {message}
        </p>
      )}
      {state === "solved" && <p className="text-sm text-center max-w-sm text-emerald-700 font-semibold">{say(problem.explanation)}</p>}
      {working && (
        <HelpLadder
          used={helpUsed}
          onUse={setHelpUsed}
          steps={[
            { title: t("help.tip"), content: say(problem.tip) },
            { title: t("help.solution"), content: say(problem.explanation) },
          ]}
        />
      )}
      {state === "shown" && <NextSheet note={message} onNext={() => onSolved(triedOutcome({ wrong, helpUsed, shown: true }))} />}
    </div>
  );
}
