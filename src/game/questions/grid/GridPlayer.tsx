import { useRef, useState, type PointerEvent } from "react";
import { playEffect } from "../../../audio/sound";
import type { ChoiceText } from "../../../engine/questions/choice/problem";
import { checkCells, checkPoints, type Cell, type GridCellsProblem, type GridPointsProblem, type Point } from "../../../engine/questions/grid";
import { t } from "../../../i18n";
import { Tex } from "../../Tex";
import { HelpLadder } from "../HelpLadder";
import { NextSheet } from "../NextSheet";
import { triedOutcome, type QuestionOutcome } from "../questionOutcome";

const say = (x: ChoiceText) => t(x.key, x.vars);
const INK = "#334155";
const key = (c: [number, number]) => `${c[0]},${c[1]}`;

/** Wrong checks before the answer is shown. */
const WRONG_ALLOWED = 2;

type State = "working" | "solved" | "shown";

/** The checking, the message and the help - the same for squares and points. */
function useChecks(onSolved: (outcome: QuestionOutcome) => void) {
  const [wrong, setWrong] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [state, setState] = useState<State>("working");
  const [message, setMessage] = useState<string | null>(null);
  /** A check's verdict; `show` puts the answer up when the tries are out. */
  function judge({ ok, why }: { ok: boolean; why: ChoiceText | null }, explanation: ChoiceText, show: () => void) {
    if (ok) {
      playEffect("correct");
      setState("solved");
      setMessage(null);
      onSolved(triedOutcome({ wrong, helpUsed }));
      return;
    }
    playEffect("wrong");
    const next = wrong + 1;
    setWrong(next);
    if (next >= WRONG_ALLOWED) {
      show();
      setState("shown");
      setMessage(`${why ? `${say(why)} ` : ""}${say(explanation)}`);
      return;
    }
    setMessage(why ? say(why) : t("tries.tryAgain"));
  }
  const moveOn = () => onSolved(triedOutcome({ wrong, helpUsed, shown: true }));
  return { state, message, helpUsed, setHelpUsed, judge, moveOn };
}

function Footer({ state, message, tip, explanation, helpUsed, onHelp, onCheck, canCheck, onNext }: { state: State; message: string | null; tip: ChoiceText; explanation: ChoiceText; helpUsed: number; onHelp: (n: number) => void; onCheck: () => void; canCheck: boolean; onNext: () => void }) {
  return (
    <>
      {state === "working" && (
        <button type="button" onClick={onCheck} disabled={!canCheck} className="h-12 px-8 rounded-full bg-sky-500 text-white text-lg font-bold shadow disabled:opacity-40">
          {t("sort.check")}
        </button>
      )}
      {message && state === "working" && (
        <p role="status" className="text-sm text-center max-w-sm text-slate-700">
          {message}
        </p>
      )}
      {state === "solved" && <p className="text-sm text-center max-w-sm text-emerald-700 font-semibold">{say(explanation)}</p>}
      {state === "working" && (
        <HelpLadder
          used={helpUsed}
          onUse={onHelp}
          steps={[
            { title: t("help.tip"), content: say(tip) },
            { title: t("help.solution"), content: say(explanation) },
          ]}
        />
      )}
      {state === "shown" && <NextSheet note={message} onNext={onNext} />}
    </>
  );
}

/** Squares to colour: tap one to colour it, again to clear it; the given ones stay. */
export function GridCellsPlayer({ problem, onSolved }: { problem: GridCellsProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const [cells, setCells] = useState<Cell[]>([]);
  const checks = useChecks(onSolved);
  const working = checks.state === "working";
  const S = Math.min(40, Math.floor(360 / Math.max(problem.w, problem.h)));
  const given = new Set(problem.given.map(key));
  const mine = new Set(cells.map(key));
  const toggle = (c: Cell) => working && !given.has(key(c)) && setCells(mine.has(key(c)) ? cells.filter((x) => key(x) !== key(c)) : [...cells, c]);
  // A swipe colours every square it passes (or clears them, when it starts on a coloured one).
  const painting = useRef<boolean | null>(null);
  const swiped = useRef(false);
  const cellAt = (el: Element | null): Cell | null => {
    const k = el?.closest("[data-cell]")?.getAttribute("data-cell");
    return k ? (k.split(",").map(Number) as Cell) : null;
  };
  const paint = (c: Cell, on: boolean) => {
    if (given.has(key(c))) return;
    setCells((cs) => (on ? (cs.some((x) => key(x) === key(c)) ? cs : [...cs, c]) : cs.filter((x) => key(x) !== key(c))));
  };
  const swipe = {
    onPointerDown: (e: PointerEvent<SVGSVGElement>) => {
      const c = working ? cellAt(e.target as Element) : null;
      if (!c || given.has(key(c))) return;
      painting.current = !mine.has(key(c));
      swiped.current = true;
      paint(c, painting.current);
    },
    onPointerMove: (e: PointerEvent<SVGSVGElement>) => {
      if (painting.current === null) return;
      const c = cellAt(document.elementFromPoint?.(e.clientX, e.clientY) ?? null);
      if (c) paint(c, painting.current);
    },
    onPointerUp: () => {
      painting.current = null;
    },
  };
  const fill = (c: Cell) => (given.has(key(c)) ? "#0284c7" : mine.has(key(c)) ? (checks.state === "working" ? "#7dd3fc" : "#6ee7b7") : "#ffffff");
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      {problem.display && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 px-6 py-2 text-3xl shadow-sm">
          <Tex latex={problem.display} block />
        </div>
      )}
      <svg viewBox={`-4 -4 ${problem.w * S + 8} ${problem.h * S + 8}`} width={problem.w * S + 8} className="max-w-full touch-none select-none" {...swipe} role="group" aria-label={t("grid.cells")}>
        {Array.from({ length: problem.w * problem.h }, (_, i) => {
          const c: Cell = [i % problem.w, Math.floor(i / problem.w)];
          return (
            <rect
              key={i}
              data-cell={key(c)}
              x={c[0] * S}
              y={c[1] * S}
              width={S}
              height={S}
              fill={fill(c)}
              stroke="#94a3b8"
              strokeWidth={1}
              onClick={() => {
                // The press already coloured it - the click after it isn't another tap.
                if (swiped.current) swiped.current = false;
                else toggle(c);
              }}
              style={{ cursor: working && !given.has(key(c)) ? "pointer" : undefined }}
              role="button"
              aria-pressed={given.has(key(c)) || mine.has(key(c))}
              aria-label={t("grid.cell", { c: c[0] + 1, r: c[1] + 1 })}
            />
          );
        })}
        {problem.line && (
          <line
            x1={problem.line.dir === "vertical" ? problem.line.at * S : -4}
            y1={problem.line.dir === "vertical" ? -4 : problem.line.at * S}
            x2={problem.line.dir === "vertical" ? problem.line.at * S : problem.w * S + 4}
            y2={problem.line.dir === "vertical" ? problem.h * S + 4 : problem.line.at * S}
            stroke="#e11d48"
            strokeWidth={3}
            strokeDasharray="8 6"
            pointerEvents="none"
          />
        )}
      </svg>
      <p className="text-sm text-slate-500">{t("grid.coloured", { n: cells.length })}</p>
      <Footer
        state={checks.state}
        message={checks.message}
        tip={problem.tip}
        explanation={problem.explanation}
        helpUsed={checks.helpUsed}
        onHelp={checks.setHelpUsed}
        canCheck={cells.length > 0}
        onCheck={() => checks.judge(checkCells(problem, cells), problem.explanation, () => setCells(problem.solution))}
        onNext={checks.moveOn}
      />
    </div>
  );
}

/** Points to mark on a coordinate grid: tap a crossing to mark it, again to clear it. */
export function GridPointsPlayer({ problem, onSolved }: { problem: GridPointsProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const [points, setPoints] = useState<Point[]>([]);
  const checks = useChecks(onSolved);
  const working = checks.state === "working";
  const [x0, x1] = problem.x;
  const [y0, y1] = problem.y;
  const S = Math.floor(340 / Math.max(x1 - x0, y1 - y0));
  const pad = 26;
  const X = (x: number) => pad + (x - x0) * S;
  const Y = (y: number) => pad + (y1 - y) * S;
  const mine = new Set(points.map(key));
  const toggle = (p: Point) => working && setPoints(mine.has(key(p)) ? points.filter((q) => key(q) !== key(p)) : [...points, p]);
  const xs = Array.from({ length: x1 - x0 + 1 }, (_, i) => x0 + i);
  const ys = Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i);
  const axisX = Y(Math.max(y0, Math.min(0, y1)));
  const axisY = X(Math.max(x0, Math.min(0, x1)));
  const dot = working ? "#e11d48" : "#059669";
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      <svg viewBox={`0 0 ${X(x1) + pad} ${Y(y0) + pad}`} className="w-full max-w-sm touch-none select-none" role="group" aria-label={t("grid.points")}>
        <rect x={X(x0)} y={Y(y1)} width={X(x1) - X(x0)} height={Y(y0) - Y(y1)} fill="#fff" />
        {xs.map((x) => (
          <line key={`gx${x}`} x1={X(x)} y1={Y(y1)} x2={X(x)} y2={Y(y0)} stroke="#e2e8f0" strokeWidth={1} />
        ))}
        {ys.map((y) => (
          <line key={`gy${y}`} x1={X(x0)} y1={Y(y)} x2={X(x1)} y2={Y(y)} stroke="#e2e8f0" strokeWidth={1} />
        ))}
        <line x1={X(x0)} y1={axisX} x2={X(x1) + 8} y2={axisX} stroke={INK} strokeWidth={2} />
        <line x1={axisY} y1={Y(y1) - 8} x2={axisY} y2={Y(y0)} stroke={INK} strokeWidth={2} />
        <g fontSize={10} fontWeight={600} fill={INK}>
          {xs.map((x) => (x === 0 ? null : <text key={`lx${x}`} x={X(x)} y={axisX + 13} textAnchor="middle">{x < 0 ? `−${-x}` : x}</text>))}
          {ys.map((y) => (y === 0 ? null : <text key={`ly${y}`} x={axisY - 5} y={Y(y)} textAnchor="end" dominantBaseline="central">{y < 0 ? `−${-y}` : y}</text>))}
          <text x={X(x1) + 12} y={axisX} dominantBaseline="central" fontWeight={800} fontSize={13}>x</text>
          <text x={axisY} y={Y(y1) - 12} textAnchor="middle" fontWeight={800} fontSize={13}>y</text>
        </g>
        {problem.shown.map((f, i) =>
          f.closed ? (
            <polygon key={i} points={f.points.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ")} fill="#bae6fd" fillOpacity={0.6} stroke="#0284c7" strokeWidth={2.5} pointerEvents="none" />
          ) : (
            <g key={i} pointerEvents="none">
              {f.points.map(([x, y]) => (
                <circle key={key([x, y])} cx={X(x)} cy={Y(y)} r={6} fill="#0284c7" />
              ))}
            </g>
          )
        )}
        {problem.line && points.length === 2 && points[0][0] !== points[1][0] && (() => {
          const [[ax, ay], [bx, by]] = points;
          const k = (by - ay) / (bx - ax);
          const yAt = (x: number) => ay + k * (x - ax);
          return <line x1={X(x0)} y1={Y(yAt(x0))} x2={X(x1)} y2={Y(yAt(x1))} stroke={dot} strokeWidth={2} strokeDasharray="6 4" pointerEvents="none" />;
        })()}
        {points.length === 3 && <polygon points={points.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ")} fill="none" stroke={dot} strokeWidth={2} strokeDasharray="6 4" pointerEvents="none" />}
        {points.map(([x, y]) => (
          <circle key={key([x, y])} cx={X(x)} cy={Y(y)} r={7} fill={dot} pointerEvents="none" />
        ))}
        {working &&
          xs.flatMap((x) =>
            ys.map((y) => (
              <circle key={`t${x},${y}`} data-point={key([x, y])} cx={X(x)} cy={Y(y)} r={S / 2} fill="transparent" onClick={() => toggle([x, y])} style={{ cursor: "pointer" }} role="button" aria-label={`(${x}, ${y})`} />
            ))
          )}
      </svg>
      <Footer
        state={checks.state}
        message={checks.message}
        tip={problem.tip}
        explanation={problem.explanation}
        helpUsed={checks.helpUsed}
        onHelp={checks.setHelpUsed}
        canCheck={points.length > 0}
        onCheck={() => checks.judge(checkPoints(problem, points), problem.explanation, () => setPoints(problem.answer))}
        onNext={checks.moveOn}
      />
    </div>
  );
}
