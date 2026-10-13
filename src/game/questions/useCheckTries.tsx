import { useState } from "react";
import { playEffect } from "../../audio/sound";
import type { ChoiceText } from "../../engine/questions/choice/problem";
import { t } from "../../i18n";
import { HelpLadder } from "./HelpLadder";
import { NextSheet } from "./NextSheet";
import { triedOutcome, type QuestionOutcome } from "./questionOutcome";

const say = (x: ChoiceText) => t(x.key, x.vars);

/**
 * What every "do it, then Rätta" question shares: the tries counted, a
 * message, the help ladder (tip, then the explanation), and after
 * `allowed` wrong checks the answer shown with Nästa. Stars from
 * `triedOutcome`, like everywhere else.
 *
 *   const tries = useCheckTries(problem, onSolved);
 *   if (right) tries.solved(); else if (tries.failed(why)) showTheAnswer();
 *   ...{tries.footer}
 */
export function useCheckTries(problem: { tip: ChoiceText; explanation: ChoiceText }, onSolved: (outcome: QuestionOutcome) => void, allowed = 2) {
  const [wrong, setWrong] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [state, setState] = useState<"working" | "solved" | "shown">("working");
  const [message, setMessage] = useState<string | null>(null);

  const solved = () => {
    playEffect("correct");
    setState("solved");
    setMessage(null);
    onSolved(triedOutcome({ wrong, helpUsed }));
  };
  /** A wrong check, and why: true when that was the last try - the caller shows the answer. */
  const failed = (why: string) => {
    playEffect("wrong");
    const next = wrong + 1;
    setWrong(next);
    if (next >= allowed) {
      setState("shown");
      setMessage(`${why} ${say(problem.explanation)}`);
      return true;
    }
    setMessage(why);
    return false;
  };

  const footer = (
    <>
      {message && state === "working" && (
        <p role="status" className="text-sm text-center max-w-sm text-rose-700 font-semibold">
          {message}
        </p>
      )}
      {state === "solved" && <p className="text-sm text-center max-w-sm text-emerald-700 font-semibold">{say(problem.explanation)}</p>}
      {state === "working" && (
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
    </>
  );
  return { state, working: state === "working", solved, failed, setMessage, footer };
}
