import { useEffect, useMemo, useState } from "react";
import { playEffect } from "../../../audio/sound";
import { tex, type AdvancedProblem } from "../../../engine/questions/written/problem";
import { questionStars } from "../../../engine/scoring";
import { t } from "../../../i18n";
import { answerOf } from "../../../mathinput/stepCheck";
import { checkWrittenAnswer, withoutUnits } from "../../../mathinput/workCheck";
import type { WritingLevel } from "../../../recognition/levels";
import { profileForStage } from "../../../recognition/profiles";
import { ColumnHelper } from "./ColumnHelper";
import { WorkPad } from "../../draw/WorkPad";
import { HelpLadder, type HelpStep } from "../HelpLadder";
import type { QuestionOutcome } from "../questionOutcome";
import { Tex } from "../../Tex";

interface FreeSolverProps {
  problem: AdvancedProblem;
  level: WritingLevel;
  onSolved: (outcome: QuestionOutcome) => void;
}

/**
 * Fritt: one free board for the whole solution, written as the child likes -
 * one line per step, the answer last. "Kontrollera" checks the answer and
 * every line (mathinput/workCheck.ts). Help is a tap away; after a second
 * wrong try the tip comes by itself, after more the whole solution.
 */
export function FreeSolver({ problem, level, onSolved }: FreeSolverProps) {
  const answer = useMemo(() => answerOf(problem), [problem]);
  const [latex, setLatex] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [solved, setSolved] = useState<QuestionOutcome | null>(null);
  /** After a wrong answer: the numbers that didn't come from the question, marked in the writing until it changes. */
  const [suspects, setSuspects] = useState<number[]>([]);
  const [calculating, setCalculating] = useState(false);

  function handleWork(next: string) {
    setLatex(next);
    setSuspects([]);
  }

  const steps: HelpStep[] = [
    { title: t("help.tip"), content: t(problem.tipKey) },
    { title: t("help.step"), content: <Tex latex={problem.firstStep} /> },
    {
      title: t("help.solution"),
      content: (
        <div className="flex flex-col gap-1">
          {problem.solution.map((line, i) => (
            <Tex key={i} latex={line} />
          ))}
        </div>
      ),
    },
  ];

  function check() {
    // "24 cm" is 24 - a geometry answer's unit isn't part of the number.
    const v = checkWrittenAnswer(problem.unit ? withoutUnits(latex) : latex, answer);
    if (v.correct) {
      const helped = helpUsed > 0 || attempts >= 2;
      playEffect("correct");
      setMessage(null);
      setSolved({ helped, fullSetup: v.fullSetup, wrongFirstAttempts: attempts > 0 ? 1 : 0, hintUsed: attempts >= 2, miniTutorialUsed: attempts >= 3 });
      return;
    }
    // Everything written is right, some solutions are still to come: not a wrong try - keep going.
    if (v.missing) {
      setMessage(t("expr.moreSolutions"));
      return;
    }
    // Equal to the answer, just not written out (or factored) yet: not wrong either - one more step.
    if (v.wrongForm) {
      setMessage(t(v.wrongForm === "expanded" ? "expr.expandFurther" : v.wrongForm === "simplest" ? "expr.simplifyFurther" : "expr.factorFurther"));
      return;
    }
    playEffect("wrong");
    const next = attempts + 1;
    setAttempts(next);
    // A second wrong try brings the tip, more the whole solution - so no one gets stuck.
    if (next >= 2 && helpUsed < 1) setHelpUsed(1);
    if (next >= 3) setHelpUsed(steps.length);
    // A number that isn't in the question (a 5 where the figure says 6) is marked in red - often the whole reason, even when every step adds up.
    const unknown = v.unknownNumbers ?? [];
    setSuspects(unknown);
    const suspect = unknown.map((n) => tex(n).replace("{,}", ",")).join(", ");
    setMessage(
      latex.trim() === ""
        ? t("expr.noAnswer")
        : v.badLines.length > 0
          ? t("expr.badLine", { n: v.badLines[0] + 1 })
          : unknown.length > 0
            ? t(unknown.length === 1 ? "expr.checkNumber" : "expr.checkNumbers", { n: suspect })
            : t("expr.wrongAnswer")
    );
  }

  const stars = solved ? questionStars(solved) : null;
  // Solved: report it at once - the round celebrates it (Celebration.tsx), the work stays in view meanwhile.
  useEffect(() => {
    if (solved) onSolved(solved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved]);
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-2xl">
      <WorkPad level={level} profile={profileForStage(problem.stageId)} title={t("expr.writeHere")} rows={4} onChange={handleWork} disabled={!!solved} highlight={suspects} />
      {calculating && !solved && <ColumnHelper fromStep={latex.split("\\\\").pop() ?? ""} onClose={() => setCalculating(false)} />}
      {message && !solved && <p className="text-rose-600 text-sm text-center">{message}</p>}
      {solved ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-emerald-700 font-bold">{solved.fullSetup && !solved.helped ? t("expr.correctSetup") : t("expr.correct")}</p>
          {stars && <p className="text-amber-500 font-semibold">{t(`stars.q${stars}`)}</p>}
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-2">
          {!calculating && (
            <button type="button" onClick={() => setCalculating(true)} className="h-12 px-4 rounded-xl bg-white text-sky-700 font-semibold border-2 border-sky-200">
              {t("calc.open")}
            </button>
          )}
          <button type="button" onClick={check} disabled={!latex} className="h-12 px-8 rounded-xl bg-sky-500 text-white font-bold shadow disabled:opacity-40">
            {t("expr.check")}
          </button>
        </div>
      )}
      {!solved && <HelpLadder steps={steps} used={helpUsed} onUse={setHelpUsed} />}
    </div>
  );
}
