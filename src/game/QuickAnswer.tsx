import { useState } from "react";
import { t } from "../i18n";
import type { WritingLevel } from "../recognition/levels";
import { AnswerBoard } from "./draw/AnswerBoard";
import type { QuestionOutcome } from "./questionOutcome";
import { NextSheet } from "./NextSheet";

type Mode = "choose" | "write";
const MODE_KEY = "matteaventyret-quickmode";

function loadMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === "write" ? "write" : "choose";
  } catch {
    return "choose";
  }
}

/** Stars as for the other questions: help (beyond the first slip) or the answer shown costs. */
function outcomeOf(wrong: number, shown: boolean): QuestionOutcome {
  return { helped: wrong >= 2 || shown, fullSetup: true, wrongFirstAttempts: wrong >= 1 ? 1 : 0, hintUsed: wrong >= 2, miniTutorialUsed: shown };
}

/**
 * Just the answer, for facts to know (the times tables): picked among a few
 * - the right one and the usual slips - or written in boxes. The child picks
 * the way, and it's remembered. Two wrong picks (three written tries) and the
 * answer is shown.
 */
export function QuickAnswer({ answer, choices, onSolved }: { answer: number; choices: number[]; level: WritingLevel; onSolved: (outcome: QuestionOutcome) => void }) {
  const [mode, setMode] = useState<Mode>(loadMode);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [tries, setTries] = useState(0);
  const [resetToken, setResetToken] = useState(0);
  const [state, setState] = useState<"working" | "solved" | "shown">("working");
  const [message, setMessage] = useState<string | null>(null);
  const wrong = mode === "choose" ? wrongPicks.length : tries;

  function choose(next: Mode) {
    setMode(next);
    setMessage(null);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // Just not remembered.
    }
  }

  function solved() {
    setState("solved");
    setMessage(null);
    onSolved(outcomeOf(wrong, false));
  }

  function pick(n: number) {
    if (state !== "working" || wrongPicks.includes(n)) return;
    if (n === answer) return solved();
    const next = [...wrongPicks, n];
    setWrongPicks(next);
    if (next.length >= 2) {
      setState("shown");
      setMessage(t("quick.reveal", { answer }));
    } else setMessage(t("quick.tryAgain"));
  }

  function write(n: number) {
    if (state !== "working") return;
    if (n === answer) return solved();
    const next = tries + 1;
    setTries(next);
    if (next >= 3) {
      setState("shown");
      setMessage(t("quick.reveal", { answer }));
      return;
    }
    setMessage(t("quick.tryAgain"));
    setResetToken((r) => r + 1);
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {state === "working" && (
        <div className="flex rounded-xl bg-slate-200 p-1" role="radiogroup" aria-label={t("quick.mode")}>
          {(["choose", "write"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => choose(m)}
              className={`px-4 h-9 rounded-lg text-sm font-semibold ${mode === m ? "bg-white text-sky-700 shadow" : "text-slate-600"}`}
            >
              {t(m === "choose" ? "quick.choose" : "quick.write")}
            </button>
          ))}
        </div>
      )}
      {mode === "choose" ? (
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs" role="group" aria-label={t("quick.choose")}>
          {choices.map((n) => {
            const isWrong = wrongPicks.includes(n);
            const isRight = state !== "working" && n === answer;
            return (
              <button
                key={n}
                type="button"
                onClick={() => pick(n)}
                disabled={isWrong || state !== "working"}
                className={`h-16 rounded-2xl border-2 text-3xl font-bold tabular-nums shadow-sm active:translate-y-0.5 ${
                  isRight ? "bg-emerald-100 border-emerald-500 text-emerald-800" : isWrong ? "bg-rose-50 border-rose-300 text-rose-400 line-through" : "bg-white border-sky-300 text-slate-800"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
      ) : (
        <AnswerBoard
          length={String(answer).length}
          onSubmit={write}
          resetToken={resetToken}
          revealed={state === "shown" ? answer : null}
          verdict={state === "solved" ? "correct" : null}
          disabled={state !== "working"}
        />
      )}
      {message && (
        <p role="status" className="text-sm text-center text-slate-700">
          {message}
        </p>
      )}
      {state === "shown" && (
        <NextSheet note={message} onNext={() => onSolved(outcomeOf(wrong, true))} />
      )}
    </div>
  );
}
