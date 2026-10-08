import { useState } from "react";
import { digitAt, digitsOf } from "../engine/digits";
import type { GeneratedProblem } from "../engine/generator";
import { t } from "../i18n";
import { AnswerBoard } from "./draw/AnswerBoard";
import { HelpLadder } from "./HelpLadder";
import { PlaceValueBoard } from "./PlaceValueBoard";
import { BaseTenBlocks } from "./scenes/BaseTenBlocks";
import type { QuestionOutcome } from "./questionOutcome";

interface PlaceValuePlayerProps {
  problem: Extract<GeneratedProblem, { kind: "placeValue" }>;
  onSolved: (outcome: QuestionOutcome) => void;
}

/**
 * "What is the 3 worth in 4 339?" - read off, nothing to set up, so right the
 * first time without help is the full ★★★ (see engine/scoring.ts).
 */
export function PlaceValuePlayer({ problem, onSolved }: PlaceValuePlayerProps) {
  const answerLength = digitsOf(problem.answer).length;
  const [answerText, setAnswerText] = useState("");
  const [resetToken, setResetToken] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [verdict, setVerdict] = useState<"correct" | "wrong" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const digit = digitAt(problem.number, problem.columnAsked);
  const place = t(`place.${problem.columnAsked}`);
  const outcome = (finalAttempts: number, shown: boolean): QuestionOutcome => ({
    helped: helpUsed > 0 || finalAttempts >= 2 || shown,
    fullSetup: finalAttempts === 0,
    wrongFirstAttempts: finalAttempts >= 1 ? 1 : 0,
    hintUsed: finalAttempts >= 2,
    miniTutorialUsed: finalAttempts >= 3 || shown,
  });

  function resetAnswer() {
    setAnswerText("");
    setResetToken((r) => r + 1);
  }

  function submitValue(value: number) {
    if (value === problem.answer) {
      setVerdict("correct");
      setMessage(null);
      onSolved(outcome(attempts, false));
      return;
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setVerdict("wrong");
    if (nextAttempts === 1) {
      setMessage(t("placeValue.tryAgain"));
      resetAnswer();
    } else if (nextAttempts === 2) {
      setMessage(t("placeValue.hint"));
      resetAnswer();
    } else {
      setMessage(t("placeValue.reveal", { answer: problem.answer }));
      setRevealed(true);
      setAnswerText(String(problem.answer));
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <BaseTenBlocks number={problem.number} highlight={problem.columnAsked} />
      <PlaceValueBoard number={problem.number} columnAsked={problem.columnAsked} answerText={answerText} verdict={verdict} />
      <AnswerBoard
        length={answerLength}
        onSubmit={submitValue}
        resetToken={resetToken}
        revealed={revealed ? problem.answer : null}
        verdict={verdict === "correct" ? "correct" : null}
        onDigitsChange={(digits) => setAnswerText(digits.map((d) => d ?? "").join(""))}
      />
      {message && <p className="text-slate-600 text-sm max-w-xs text-center">{message}</p>}
      {revealed ? (
        <button type="button" onClick={() => onSolved(outcome(attempts, true))} className="h-12 px-6 rounded-xl bg-emerald-600 text-white font-bold shadow">
          {t("placeValue.next")}
        </button>
      ) : (
        verdict !== "correct" && (
          <HelpLadder
            used={helpUsed}
            onUse={setHelpUsed}
            steps={[
              { title: t("help.tip"), content: t("placeValue.hint") },
              { title: t("help.step"), content: t("placeValue.step", { digit, place }) },
              { title: t("help.solution"), content: t("placeValue.solution", { digit, place, answer: problem.answer }) },
            ]}
          />
        )
      )}
    </div>
  );
}
