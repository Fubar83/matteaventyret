import { useState } from "react";
import { t } from "../../i18n";
import { triedOutcome, type QuestionOutcome } from "./questionOutcome";

interface AnswerTriesOptions {
  /** The right answer. */
  answer: number;
  /** What the second wrong answer brings: the question's hint. */
  hint: string;
  /** How far up the help ladder the child has gone. */
  helpUsed: number;
  /** The written setup, for a question that has one - asked when it's solved (see triedOutcome). */
  setup?: () => boolean;
  /** A wrong answer clears the boxes for another go - anything else to clear with them. */
  onRetry?: () => void;
  onSolved: (outcome: QuestionOutcome) => void;
}

/**
 * A question answered with one number, in tries - place value, statistics,
 * charts: a wrong answer clears the boxes for another go, the second brings
 * the hint, the third shows the answer (and Nästa moves on). Scored by
 * triedOutcome, as every question is.
 */
export function useAnswerTries({ answer, hint, helpUsed, setup, onRetry, onSolved }: AnswerTriesOptions) {
  const [wrong, setWrong] = useState(0);
  const [resetToken, setResetToken] = useState(0);
  const [verdict, setVerdict] = useState<"correct" | "wrong" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const outcome = (shown: boolean) => triedOutcome({ wrong, helpUsed, shown, setup: setup?.() });

  /** An answer, as the boxes read it. */
  function submit(value: number) {
    if (value === answer) {
      setVerdict("correct");
      setMessage(null);
      onSolved(outcome(false));
      return;
    }
    const next = wrong + 1;
    setWrong(next);
    setVerdict("wrong");
    if (next >= 3) {
      setMessage(t("tries.reveal", { answer }));
      setRevealed(true);
      return;
    }
    setMessage(next === 1 ? t("tries.tryAgain") : hint);
    setResetToken((r) => r + 1);
    onRetry?.();
  }

  /** Moving on after the answer was shown. */
  const moveOn = () => onSolved(outcome(true));

  return { wrong, resetToken, verdict, message, revealed, submit, moveOn, solved: verdict === "correct" };
}
