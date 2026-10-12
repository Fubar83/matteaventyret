import { useEffect, useRef, useState } from "react";
import { playEffect } from "../../../audio/sound";
import type { ChoiceText } from "../../../engine/questions/choice/problem";
import { cardCount, checkProgram, MOVES, runRobot, type ProgramProblem, type Square } from "../../../engine/questions/program";
import type { Move, ProgramStep } from "../../../engine/questions/scene";
import { t } from "../../../i18n";
import { useDragDrop } from "../dragDrop";
import { HelpLadder } from "../HelpLadder";
import { NextSheet } from "../NextSheet";
import { triedOutcome, type QuestionOutcome } from "../questionOutcome";

const say = (x: ChoiceText) => t(x.key, x.vars);
/** Runs that don't do it before a working program is shown. */
const WRONG_ALLOWED = 3;
const CELL = 50;
const STEP_MS = 340;
/** With no limit, a program still fits on the screen. */
const MOST_CARDS = 16;
const ARROW: Record<Move, string> = { up: "↑", down: "↓", left: "←", right: "→" };

type Line = { id: number; move: Move } | { id: number; repeat: number; moves: { id: number; move: Move }[] };
const isLoop = (l: Line): l is Extract<Line, { repeat: number }> => "repeat" in l;
const toProgram = (lines: Line[]): ProgramStep[] => lines.map((l) => (isLoop(l) ? { repeat: l.repeat, moves: l.moves.map((m) => m.move) } : l.move));

/** A run on screen: the squares, how far the robot has come, and what it means when it's done (null: just showing). */
type Run = { path: Square[]; crash: Square | null; step: number; ok: boolean | null; why: ChoiceText | null };

const arrowCard = "inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 text-2xl font-black shadow-sm select-none";

/**
 * Programming the robot: arrow cards (and loops) put together by dragging or
 * tapping, then Kör - and the robot walks the program square by square,
 * picking up gems, until it stops or bumps into something. Editing the
 * program puts it back at the start.
 */
export function ProgramPlayer({ problem, onSolved }: { problem: ProgramProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [wrong, setWrong] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [state, setState] = useState<"working" | "solved" | "shown">("working");
  const [message, setMessage] = useState<string | null>(null);
  const nextId = useRef(1);
  const id = () => nextId.current++;
  const working = state === "working";
  const running = run !== null && run.step < run.path.length - 1;
  const editable = working && !running;
  const count = cardCount(toProgram(lines));
  const limit = problem.maxCards ?? MOST_CARDS;

  /** Any change to the program: the robot goes back to the start. */
  function change(next: Line[]) {
    setLines(next);
    setRun(null);
    setMessage(null);
  }
  function roomFor(n: number) {
    if (count + n <= limit) return true;
    setMessage(problem.maxCards !== null ? t("program.full", { n: problem.maxCards }) : t("program.fullScreen"));
    return false;
  }
  function addMove(move: Move, into: number | null = active) {
    if (!editable || !roomFor(1)) return;
    playEffect("tap");
    const loop = into === null ? undefined : lines.find((l) => l.id === into && isLoop(l));
    if (loop) change(lines.map((l) => (l.id === into && isLoop(l) ? { ...l, moves: [...l.moves, { id: id(), move }] } : l)));
    else change([...lines, { id: id(), move }]);
  }
  function addLoop() {
    if (!editable || !roomFor(1)) return;
    playEffect("tap");
    const loop = { id: id(), repeat: 2, moves: [] };
    change([...lines, loop]);
    // New arrows go into the new loop until another place is chosen.
    setActive(loop.id);
  }
  function remove(cardId: number) {
    if (!editable) return;
    if (active === cardId) setActive(null);
    change(lines.filter((l) => l.id !== cardId).map((l) => (isLoop(l) ? { ...l, moves: l.moves.filter((m) => m.id !== cardId) } : l)));
  }
  const setRepeat = (loopId: number, d: number) =>
    editable && change(lines.map((l) => (l.id === loopId && isLoop(l) ? { ...l, repeat: Math.max(2, Math.min(9, l.repeat + d)) } : l)));

  const dnd = useDragDrop((item, target) => {
    if (item.startsWith("move:")) {
      const move = item.slice(5) as Move;
      if (target === "main") addMove(move, null);
      else if (target.startsWith("loop")) addMove(move, Number(target.slice(4)));
    } else if (item === "loop" && (target === "main" || target.startsWith("loop"))) addLoop();
    else if (item.startsWith("card:") && target === "palette") remove(Number(item.slice(5)));
  });

  function go() {
    if (!editable) return;
    const program = toProgram(lines);
    const check = checkProgram(problem, program);
    const { path, crash } = runRobot(problem, program);
    setMessage(null);
    setRun({ path, crash: crash?.at ?? null, step: 0, ok: check.ok, why: check.ok ? null : check.why });
  }

  // The robot walks: a square at a time, and when it has stopped, what it did is judged.
  useEffect(() => {
    if (!run) return;
    if (run.step < run.path.length - 1) {
      const timer = setTimeout(() => {
        playEffect("tap");
        setRun((r) => r && { ...r, step: r.step + 1 });
      }, STEP_MS);
      return () => clearTimeout(timer);
    }
    if (run.ok === null) return;
    const timer = setTimeout(() => {
      if (run.ok) {
        playEffect("correct");
        setState("solved");
        onSolved(triedOutcome({ wrong, helpUsed }));
      } else {
        playEffect("wrong");
        const next = wrong + 1;
        setWrong(next);
        if (next >= WRONG_ALLOWED) {
          // A program that works, and the robot shows it.
          setState("shown");
          setLines(problem.solution.map((s) => (typeof s === "string" ? { id: id(), move: s } : { id: id(), repeat: s.repeat, moves: s.moves.map((move) => ({ id: id(), move })) })));
          const shown = runRobot(problem, problem.solution);
          setRun({ path: shown.path, crash: null, step: 0, ok: null, why: null });
          setMessage(`${say(run.why!)} ${say(problem.explanation)}`);
        } else setMessage(say(run.why!));
      }
      setRun((r) => r && { ...r, ok: null });
    }, STEP_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  const { w, h } = problem;
  const center = ([c, r]: Square) => [c * CELL + CELL / 2, r * CELL + CELL / 2];
  const robotAt = run ? run.path[run.step] : problem.start;
  const walked = run ? run.path.slice(0, run.step + 1) : [problem.start];
  const taken = (g: Square) => walked.some((s) => s[0] === g[0] && s[1] === g[1]);
  const crashed = run !== null && run.crash !== null && run.step === run.path.length - 1;
  const [rx, ry] = center(robotAt);

  const lit = (target: string) => (dnd.over === target ? "ring-4 ring-amber-300 border-amber-400" : "");
  const placedCard = (cardId: number, move: Move) => (
    <button
      key={cardId}
      type="button"
      className={`${arrowCard} bg-white border-sky-300 text-sky-700`}
      onClick={() => remove(cardId)}
      disabled={!editable}
      aria-label={t("program.removeCard", { arrow: ARROW[move] })}
      {...(editable ? dnd.handle(`card:${cardId}`) : {})}
    >
      {ARROW[move]}
    </button>
  );

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      {dnd.ghost}
      <svg viewBox={`-4 -4 ${w * CELL + 8} ${h * CELL + 8}`} width={w * CELL + 8} className="max-w-full select-none" role="img" aria-label={t("program.board", { n: problem.gems.length })}>
        {Array.from({ length: h }, (_, r) =>
          Array.from({ length: w }, (_, c) => <rect key={`${c}-${r}`} x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill={(c + r) % 2 === 0 ? "#f0fdf4" : "#dcfce7"} stroke="#86efac" strokeWidth={1.5} />)
        )}
        {walked.length > 1 && <polyline points={walked.map((s) => center(s).join(",")).join(" ")} fill="none" stroke="#0ea5e9" strokeWidth={4} strokeDasharray="2 7" strokeLinecap="round" />}
        {problem.rocks.map((s, i) => (
          <text key={i} x={center(s)[0]} y={center(s)[1]} textAnchor="middle" dominantBaseline="central" fontSize={32}>
            🪨
          </text>
        ))}
        {problem.gems.map((g, i) => (
          <text key={i} x={center(g)[0]} y={center(g)[1]} textAnchor="middle" dominantBaseline="central" fontSize={26} style={{ opacity: taken(g) ? 0.15 : 1, transition: "opacity 0.3s" }}>
            💎
          </text>
        ))}
        <text x={center(problem.star)[0]} y={center(problem.star)[1]} textAnchor="middle" dominantBaseline="central" fontSize={32}>
          ⭐
        </text>
        {crashed && (
          <text x={(rx + center(run!.crash!)[0]) / 2} y={(ry + center(run!.crash!)[1]) / 2} textAnchor="middle" dominantBaseline="central" fontSize={26}>
            💥
          </text>
        )}
        <g style={{ transform: `translate(${rx}px, ${ry}px)`, transition: `transform ${STEP_MS - 40}ms ease-in-out` }}>
          <text className={crashed ? "anim-robot-bump" : undefined} textAnchor="middle" dominantBaseline="central" fontSize={34}>
            🤖
          </text>
        </g>
      </svg>

      <div
        data-drop="main"
        className={`w-full max-w-lg min-h-16 rounded-2xl border-2 bg-white px-3 py-2 flex flex-wrap items-center gap-2 ${active === null && editable ? "border-sky-400" : "border-slate-200"} ${lit("main")}`}
        role="list"
        aria-label={t("program.program")}
        onClick={(e) => e.target === e.currentTarget && setActive(null)}
      >
        {lines.length === 0 && <span className="text-sm text-slate-500">{t("program.empty")}</span>}
        {lines.map((l) =>
          isLoop(l) ? (
            <div
              key={l.id}
              role="listitem"
              data-drop={`loop${l.id}`}
              data-loop={l.id}
              onClick={() => editable && setActive(l.id)}
              className={`flex flex-wrap items-center gap-1.5 rounded-xl border-2 border-dashed px-2 py-1 ${active === l.id ? "border-violet-600 bg-violet-100" : "border-violet-300 bg-violet-50"} ${lit(`loop${l.id}`)}`}
            >
              <button type="button" className="h-8 w-8 rounded-full border-2 border-violet-300 bg-white font-bold text-violet-700 disabled:opacity-30" onClick={() => setRepeat(l.id, -1)} disabled={!editable || l.repeat <= 2} aria-label={t("program.fewer")}>
                −
              </button>
              <span className="text-sm font-bold text-violet-700 whitespace-nowrap">{t("scene.robot.repeat", { n: l.repeat })}</span>
              <button type="button" className="h-8 w-8 rounded-full border-2 border-violet-300 bg-white font-bold text-violet-700 disabled:opacity-30" onClick={() => setRepeat(l.id, 1)} disabled={!editable || l.repeat >= 9} aria-label={t("program.more")} data-repeat-plus={l.id}>
                +
              </button>
              {l.moves.map((m) => placedCard(m.id, m.move))}
              {l.moves.length === 0 && <span className="text-xs text-violet-600">{t("program.loopEmpty")}</span>}
              <button type="button" className="ml-1 text-violet-500 text-lg font-bold" onClick={() => remove(l.id)} disabled={!editable} aria-label={t("program.removeLoop")}>
                ×
              </button>
            </div>
          ) : (
            <span key={l.id} role="listitem">
              {placedCard(l.id, l.move)}
            </span>
          )
        )}
      </div>
      {problem.maxCards !== null && (
        <p className={`text-sm font-semibold ${count > problem.maxCards ? "text-rose-700" : "text-slate-600"}`}>{t("program.cards", { n: count, max: problem.maxCards })}</p>
      )}

      {working && (
        <div data-drop="palette" className={`flex flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-slate-50 px-3 py-2 ${lit("palette")}`}>
          {MOVES.map((m) => (
            <button key={m} type="button" className={`${arrowCard} bg-sky-500 border-sky-600 text-white`} onClick={() => addMove(m)} disabled={!editable} data-card={m} aria-label={t("program.add", { arrow: ARROW[m] })} {...dnd.handle(`move:${m}`)}>
              {ARROW[m]}
            </button>
          ))}
          {problem.loops && (
            <button type="button" className="h-11 px-3 rounded-xl border-2 border-violet-500 bg-violet-500 text-white text-sm font-bold shadow-sm" onClick={addLoop} disabled={!editable} data-card="loop" {...dnd.handle("loop")}>
              {t("program.addLoop")}
            </button>
          )}
        </div>
      )}
      {working && (
        <div className="flex gap-3">
          <button type="button" onClick={() => (change([]), setActive(null))} disabled={!editable || lines.length === 0} className="h-12 px-5 rounded-full bg-white border-2 border-slate-300 text-base font-bold disabled:opacity-40">
            {t("program.clear")}
          </button>
          <button type="button" onClick={go} disabled={!editable || lines.length === 0} data-run className="h-12 px-8 rounded-full bg-emerald-500 text-white text-lg font-bold shadow disabled:opacity-40">
            {t("program.run")}
          </button>
        </div>
      )}
      {message && working && (
        <p role="status" className="text-sm text-center max-w-sm text-rose-700 font-semibold">
          {message}
        </p>
      )}
      {state === "solved" && <p className="text-sm text-center max-w-sm text-emerald-700 font-semibold">{t("program.done")}</p>}
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
