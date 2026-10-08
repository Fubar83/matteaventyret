import { useEffect, useMemo, useRef, useState } from "react";
import { BottomSheet } from "../game/BottomSheet";
import { revealedAt, type BoxReading, type BoxStatus } from "../game/draw/boardTypes";
import { DrawBoard, type DrawBoardHandle } from "../game/draw/DrawBoard";
import { PendingChoice } from "../game/draw/PendingChoice";
import { rememberBoxDigit } from "../game/draw/rememberBox";
import { useUnsureBoxes } from "../game/draw/useUnsureBoxes";
import type { GuidedBoardPlan } from "./guidedPlan";

/** How a guided board went: wrong tries, digits shown by the board, and boxes written while their digit was there to trace. */
export interface GuidedResult {
  wrong: number;
  shown: number;
  traced: number;
}

/** Wrong tries on one box before its digit is shown. */
const MAX_TRIES = 3;
const NONE: ReadonlySet<string> = new Set();

/**
 * Guidat: a plan's board (guidedPlan.ts), one box open at a time with what to
 * do in it. A right digit stays (green); a wrong one is wiped to try again;
 * after a few wrong tries - or on "Visa siffran" - the digit is shown for the
 * child (amber) and the walk goes on.
 */
/**
 * `onExit`: the test page's "Nya tal". `onDone`: a game round's - called with
 * how it went as soon as the last box is right (the round celebrates, then
 * moves on; there's no starting over).
 */
/**
 * `trace`: start with each box's digit shown dashed, to trace over - help
 * from the beginning, switched off (or on again) with "Spåra". Strict all the
 * same: only the right digit counts.
 */
/** `startAt` (the gallery's step-by-step pictures): open at that step, the boxes before it already written right. */
export function GuidedColumn({ plan, onExit, onDone, trace = false, startAt = 0 }: { plan: GuidedBoardPlan; onExit?: () => void; onDone?: (result: GuidedResult) => void; trace?: boolean; startAt?: number }) {
  const [tracing, setTracing] = useState(trace);
  const [tableOpen, setTableOpen] = useState(false);
  const [tracedTotal, setTracedTotal] = useState(0);
  const boardRef = useRef<DrawBoardHandle>(null);
  const marks = useUnsureBoxes();
  const [stepIndex, setStepIndex] = useState(startAt);
  const before = plan.steps.slice(0, startAt);
  const [statuses, setStatuses] = useState<Record<string, BoxStatus>>(() => Object.fromEntries(before.map((s) => [s.boxId, "correct"])));
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(before.map((s) => [s.boxId, String(s.expected)])));
  const [tries, setTries] = useState(0);
  const [wrongTotal, setWrongTotal] = useState(0);
  const [shownTotal, setShownTotal] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  /** Bumped by "Börja om" - a fresh board. */
  const [round, setRound] = useState(0);

  const step = plan.steps[stepIndex];
  // Only what's needed so far: a box, line or comma a later step needs turns up then.
  const layout = useMemo(() => revealedAt(plan.layout, stepIndex), [plan.layout, stepIndex]);
  const done = !step;
  // A game round's board reports as soon as the last box is right - the round celebrates it and moves on.
  const reported = useRef(false);
  useEffect(() => {
    if (!done || !onDone || reported.current) return;
    reported.current = true;
    onDone({ wrong: wrongTotal, shown: shownTotal, traced: tracedTotal });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);
  // A step to pick (where the comma goes) has no box to write in.
  const active = step && !step.choice ? new Set([step.boxId]) : NONE;
  // The numbers this step works with light up on the board, not just in the words.
  const highlight = useMemo(() => (step ? new Set(step.uses) : NONE), [step]);

  function advance() {
    setStepIndex((i) => i + 1);
    setTries(0);
  }

  function show() {
    if (!step) return;
    if (step.choice) {
      setShownTotal((n) => n + 1);
      setMessage(`Det är ${step.choice.options[step.choice.correct]}.`);
      advance();
      return;
    }
    marks.settle(step.boxId);
    boardRef.current?.clearBox(step.boxId);
    setValues((v) => ({ ...v, [step.boxId]: String(step.expected) }));
    setStatuses((s) => ({ ...s, [step.boxId]: "followOn" }));
    setShownTotal((n) => n + 1);
    setMessage(null);
    advance();
  }

  /** What was written - a digit, or "+" (or null: a sign box's ink that isn't a plus). */
  function answer(written: number | "+" | null) {
    if (!step) return;
    if (written === step.expected) {
      if (tracing) setTracedTotal((n) => n + 1);
      setStatuses((s) => ({ ...s, [step.boxId]: "correct" }));
      setMessage(null);
      advance();
      return;
    }
    const sign = step.expected === "+";
    boardRef.current?.clearBox(step.boxId);
    setWrongTotal((n) => n + 1);
    if (tries + 1 >= MAX_TRIES) {
      show();
      setMessage(sign ? "Plustecknet visas - titta på det och fortsätt." : "Siffran visas - titta på den och fortsätt.");
      return;
    }
    setTries(tries + 1);
    setStatuses((s) => ({ ...s, [step.boxId]: "wrong" }));
    setMessage(sign ? "Det ser inte ut som ett plus - rita ett streck rakt över och ett rakt ner, så att de korsar varandra i mitten." : "Inte riktigt - försök igen.");
  }

  function handleRead(boxId: string, reading: BoxReading) {
    if (!step || boxId !== step.boxId) return;
    if (reading.kind === "unsure") {
      marks.mark(boxId, reading.guesses);
      return;
    }
    marks.settle(boxId);
    if (reading.kind === "strike" || reading.kind === "invalid") {
      boardRef.current?.removeStrokes(reading.strokes);
      return;
    }
    if (reading.kind === "sign") answer(reading.plus ? "+" : null);
    else if (reading.kind === "digits") answer(Number(reading.digits.join("")));
  }

  /** A step to pick: the right option goes on; a wrong one says why it isn't. */
  function pick(i: number) {
    if (!step?.choice) return;
    if (i === step.choice.correct) {
      setMessage(null);
      advance();
      return;
    }
    setWrongTotal((n) => n + 1);
    if (tries + 1 >= MAX_TRIES) {
      show();
      return;
    }
    setTries(tries + 1);
    setMessage(step.choice.whyNot[i]);
  }

  function restart() {
    boardRef.current?.clearAll();
    marks.reset();
    setStepIndex(0);
    setStatuses({});
    setValues({});
    setTries(0);
    setWrongTotal(0);
    setShownTotal(0);
    setTracedTotal(0);
    setMessage(null);
    setRound((r) => r + 1);
  }

  const question = marks.question;
  const pickPending = (digits: number[]) => {
    if (!question) return;
    marks.settle(question.boxId);
    rememberBoxDigit(boardRef.current, question.boxId, digits);
    answer(Number(digits.join("")));
  };
  const rewritePending = () => {
    if (!question) return;
    marks.settle(question.boxId);
    boardRef.current?.clearBox(question.boxId);
  };

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="w-full max-w-2xl flex flex-col items-center gap-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Guidat: {plan.title} – steg {Math.min(stepIndex + 1, plan.steps.length)} av {plan.steps.length}
        </p>
        <p className="text-lg text-slate-700 min-h-[3.5rem]">
          {done ? (
            <span className="text-green-700 font-semibold">
              Klart! {plan.title} {plan.answerText}
            </span>
          ) : (
            step.prompt
          )}
        </p>
      </div>

      <DrawBoard
        key={round}
        ref={boardRef}
        layout={layout}
        active={active}
        values={values}
        statuses={statuses}
        unsure={marks.unsure}
        asking={question?.boxId ?? null}
        onAsk={marks.ask}
        onRead={handleRead}
        highlight={highlight}
        traces={tracing && step && !step.choice ? { [step.boxId]: String(step.expected) } : undefined}
        onBlocked={() => setMessage("Skriv i den markerade rutan.")}
        // A little bigger than its own size (it's small for short numbers), but never wider than the page's writing area.
        maxWidth={Math.min(plan.layout.width * 1.4, 900)}
      />

      <div className="min-h-[3rem] flex flex-col items-center gap-2">
        {/* A step to pick (where the comma goes): the question and its options in a sheet at the bottom, in view on a phone. */}
        {step?.choice && (
          <BottomSheet label={step.prompt}>
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-slate-700 text-center">{step.prompt}</p>
              <div className="flex flex-wrap justify-center gap-3" role="group" aria-label={step.prompt}>
                {step.choice.options.map((option, i) => (
                  <button key={option} type="button" onClick={() => pick(i)} className="min-w-[5.5rem] h-14 px-4 rounded-xl border-2 border-violet-300 bg-white text-2xl font-bold text-slate-800 shadow-sm tabular-nums active:translate-y-0.5">
                    {option}
                  </button>
                ))}
              </div>
              {message && <p className="text-sm text-rose-700 text-center">{message}</p>}
            </div>
          </BottomSheet>
        )}
        {message && !step?.choice && <p className="text-sm text-slate-600 text-center max-w-md">{message}</p>}
        {done && plan.doneNote && <p className="text-sm text-sky-900 bg-sky-50 rounded-lg px-3 py-2 text-center max-w-md">{plan.doneNote}</p>}
        {question && <PendingChoice guesses={question.guesses} onPick={pickPending} onRewrite={rewritePending} />}
        {done && (
          <p className="text-sm text-slate-600">
            {wrongTotal === 0 && shownTotal === 0 ? "Allt rätt på första försöket!" : `${wrongTotal} fel försök, ${shownTotal} siffror visade.`}
          </p>
        )}
      </div>

      {plan.table && tableOpen && !done && (
        <div className="rounded-xl border-2 border-violet-200 bg-violet-50 px-4 py-2" aria-label={`Gångertabellen för ${plan.table.of}`}>
          <div className="text-xs font-bold text-violet-700 mb-1">Gångertabellen för {plan.table.of}</div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-0.5 text-lg tabular-nums text-slate-800">
            {plan.table.rows.map((r) => (
              <span key={r.times}>
                {r.times} · {plan.table!.of} = <b>{r.product}</b>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {plan.table && !done && (
          <button
            type="button"
            role="switch"
            aria-checked={tableOpen}
            onClick={() => setTableOpen((v) => !v)}
            className={`px-4 h-10 rounded-lg font-semibold text-sm border-2 ${tableOpen ? "bg-violet-50 border-violet-300 text-violet-800" : "bg-white border-slate-200 text-slate-600"}`}
          >
            📋 Gångertabell
          </button>
        )}
        {!done && (
          <button
            type="button"
            role="switch"
            aria-checked={tracing}
            onClick={() => setTracing((v) => !v)}
            className={`px-4 h-10 rounded-lg font-semibold text-sm border-2 ${tracing ? "bg-sky-50 border-sky-300 text-sky-800" : "bg-white border-slate-200 text-slate-600"}`}
          >
            ✏️ Spåra: {tracing ? "på" : "av"}
          </button>
        )}
        {!done && (
          <button type="button" onClick={show} className="px-4 h-10 rounded-lg bg-amber-400 text-white font-semibold text-sm">
            {step.choice ? "Visa svaret" : step.expected === "+" ? "Visa plustecknet" : "Visa siffran"}
          </button>
        )}
        {!onDone && (
          <button type="button" onClick={restart} className="px-4 h-10 rounded-lg bg-slate-200 text-slate-700 font-semibold text-sm">
            Börja om
          </button>
        )}
        {onExit && (
          <button type="button" onClick={onExit} className="px-4 h-10 rounded-lg bg-sky-600 text-white font-semibold text-sm">
            Nya tal
          </button>
        )}
      </div>
    </div>
  );
}
