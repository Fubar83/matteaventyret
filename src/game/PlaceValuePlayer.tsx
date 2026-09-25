import { useState } from "react";
import type { GeneratedProblem } from "../engine/generator";
import { t } from "../i18n";
import { Numpad } from "./Numpad";
import { PlaceValueBoard } from "./PlaceValueBoard";

export interface ProblemSummary {
  wrongFirstAttempts: number;
  hintUsed: boolean;
  miniTutorialUsed: boolean;
}

interface PlaceValuePlayerProps {
  problem: Extract<GeneratedProblem, { kind: "placeValue" }>;
  onSolved: (summary: ProblemSummary) => void;
}

export function PlaceValuePlayer({ problem, onSolved }: PlaceValuePlayerProps) {
  const [typed, setTyped] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [verdict, setVerdict] = useState<"correct" | "wrong" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  function submit() {
    if (typed === "") return;
    const value = Number(typed);
    if (value === problem.answer) {
      setVerdict("correct");
      setMessage(null);
      onSolved({
        wrongFirstAttempts: attempts >= 1 ? 1 : 0,
        hintUsed: attempts >= 2,
        miniTutorialUsed: attempts >= 3,
      });
      return;
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setVerdict("wrong");
    if (nextAttempts === 1) {
      setMessage(t("placeValue.tryAgain"));
      setTyped("");
    } else if (nextAttempts === 2) {
      setMessage(t("placeValue.hint"));
      setTyped("");
    } else {
      setMessage(t("placeValue.reveal", { answer: problem.answer }));
      setRevealed(true);
      setTyped(String(problem.answer));
    }
  }

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center gap-6 lg:gap-12">
      <div className="flex flex-col items-center gap-6">
        <PlaceValueBoard
          number={problem.number}
          columnAsked={problem.columnAsked}
          answerText={typed}
          verdict={verdict}
        />
        {message && <p className="text-slate-600 text-sm max-w-xs text-center">{message}</p>}
        {revealed && (
          <button
            type="button"
            onClick={() =>
              onSolved({
                wrongFirstAttempts: attempts >= 1 ? 1 : 0,
                hintUsed: true,
                miniTutorialUsed: true,
              })
            }
            className="h-12 px-6 rounded-xl bg-emerald-600 text-white font-bold shadow"
          >
            {t("placeValue.next")}
          </button>
        )}
      </div>
      {!revealed && (
        <Numpad
          onDigit={(d) => setTyped((prev) => (prev.length >= 5 ? prev : prev + d))}
          onDelete={() => setTyped((prev) => prev.slice(0, -1))}
          onSubmit={submit}
        />
      )}
    </div>
  );
}
