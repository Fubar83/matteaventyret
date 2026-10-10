import { useState } from "react";
import { digitAt, digitsOf } from "../../../engine/digits";
import type { PlaceValueProblem } from "../../../engine/questions/placeValue";
import { t } from "../../../i18n";
import { AnswerBoard } from "../../draw/AnswerBoard";
import { HelpLadder } from "../HelpLadder";
import { PlaceValueBoard } from "./PlaceValueBoard";
import { BaseTenBlocks } from "../../scenes/BaseTenBlocks";
import type { QuestionOutcome } from "../questionOutcome";
import { NextSheet } from "../NextSheet";
import { useAnswerTries } from "../useAnswerTries";

interface PlaceValuePlayerProps {
  problem: PlaceValueProblem;
  onSolved: (outcome: QuestionOutcome) => void;
}

/**
 * "What is the 3 worth in 4 339?" - read off, nothing to set up, so right the
 * first time without help is the full ★★★ (see engine/scoring.ts). The
 * answer is echoed under the number as it's written.
 */
export function PlaceValuePlayer({ problem, onSolved }: PlaceValuePlayerProps) {
  const [answerText, setAnswerText] = useState("");
  const [helpUsed, setHelpUsed] = useState(0);
  const tries = useAnswerTries({ answer: problem.answer, hint: t("placeValue.hint"), helpUsed, onRetry: () => setAnswerText(""), onSolved });

  const digit = digitAt(problem.number, problem.columnAsked);
  const place = t(`place.${problem.columnAsked}`);

  return (
    <div className="flex flex-col items-center gap-6">
      <BaseTenBlocks number={problem.number} highlight={problem.columnAsked} />
      <PlaceValueBoard number={problem.number} columnAsked={problem.columnAsked} answerText={tries.revealed ? String(problem.answer) : answerText} verdict={tries.verdict} />
      <AnswerBoard
        length={digitsOf(problem.answer).length}
        onSubmit={tries.submit}
        resetToken={tries.resetToken}
        revealed={tries.revealed ? problem.answer : null}
        verdict={tries.solved ? "correct" : null}
        onDigitsChange={(digits) => setAnswerText(digits.map((d) => d ?? "").join(""))}
      />
      {tries.message && <p className="text-slate-600 text-sm max-w-xs text-center">{tries.message}</p>}
      {tries.revealed ? (
        <NextSheet note={tries.message} onNext={tries.moveOn} />
      ) : (
        !tries.solved && (
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
