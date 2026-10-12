import { useState } from "react";
import { playEffect } from "../../../audio/sound";
import type { ChoiceOption, ChoiceProblem, ChoiceText } from "../../../engine/questions/choice/problem";
import { t } from "../../../i18n";
import { ScenePicture, QuestionScene } from "../../scenes/QuestionScene";
import { Tex } from "../../Tex";
import { HelpLadder } from "../HelpLadder";
import { NextSheet } from "../NextSheet";
import { triedOutcome, type QuestionOutcome } from "../questionOutcome";

const say = (x: ChoiceText) => t(x.key, x.vars);

/** How many wrong picks before the answer is shown: two among four options, one among two or three - with fewer left, it would only be guessing. */
export const wrongPicksAllowed = (options: number) => (options >= 4 ? 2 : 1);

/** An option as it shows on its button: words, LaTeX, characters, or a small picture. The sorting questions show their things the same way. */
export function OptionContent({ option }: { option: ChoiceOption }) {
  if ("text" in option) return <>{say(option.text)}</>;
  if ("latex" in option) return <Tex latex={option.latex} />;
  if ("plain" in option) return <span className="tracking-wide">{option.plain}</span>;
  return <ScenePicture scene={option.scene} small />;
}

/**
 * A single-choice question (engine/questions/choice/): the picture, the
 * question, the options. A wrong pick says why it isn't right; after the
 * allowed wrong picks the answer is shown. Nothing to set up: ★★★ is right
 * the first time (triedOutcome).
 */
export function ChoicePlayer({ problem, onSolved }: { problem: ChoiceProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [helpUsed, setHelpUsed] = useState(0);
  const [state, setState] = useState<"working" | "solved" | "shown">("working");
  const [message, setMessage] = useState<string | null>(null);
  const pictures = problem.options.some((o) => "scene" in o);
  // Long words ("medelvärdet", "20 procentenheter") get a smaller size, so they fit their button.
  const longest = Math.max(...problem.options.map((o) => ("text" in o ? say(o.text).length : "plain" in o ? o.plain.length : 0)));
  const size = longest > 14 ? "text-lg" : longest > 9 ? "text-xl" : "text-2xl";

  function pick(i: number) {
    if (state !== "working" || wrongPicks.includes(i)) return;
    if (i === problem.correct) {
      playEffect("correct");
      setState("solved");
      setMessage(null);
      onSolved(triedOutcome({ wrong: wrongPicks.length, helpUsed }));
      return;
    }
    playEffect("wrong");
    const wrong = [...wrongPicks, i];
    setWrongPicks(wrong);
    const why = problem.whyNot?.[i];
    if (wrong.length >= wrongPicksAllowed(problem.options.length)) {
      setState("shown");
      setMessage(`${why ? `${say(why)} ` : ""}${say(problem.explanation)}`);
      return;
    }
    setMessage(why ? say(why) : t("tries.tryAgain"));
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {problem.scene && <QuestionScene scene={problem.scene} />}
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      {problem.display && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 px-6 py-3 text-3xl shadow-sm">
          <Tex latex={problem.display} block />
        </div>
      )}
      <div className={`grid gap-3 w-full ${pictures ? "grid-cols-2 max-w-md" : problem.options.length === 3 ? "grid-cols-3 max-w-md" : "grid-cols-2 max-w-sm"}`} role="group" aria-label={say(problem.prompt)}>
        {problem.options.map((o, i) => {
          const isWrong = wrongPicks.includes(i);
          const isRight = state !== "working" && i === problem.correct;
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              disabled={isWrong || state !== "working"}
              className={`min-h-16 px-3 py-2 rounded-2xl border-2 ${size} font-bold shadow-sm flex items-center justify-center active:translate-y-0.5 ${
                isRight ? "bg-emerald-100 border-emerald-500 text-emerald-800" : isWrong ? "bg-rose-50 border-rose-300 text-rose-400 opacity-60" : "bg-white border-sky-300 text-slate-800"
              }`}
            >
              <OptionContent option={o} />
            </button>
          );
        })}
      </div>
      {message && state !== "shown" && (
        <p role="status" className="text-sm text-center max-w-sm text-slate-700">
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
      {state === "shown" && <NextSheet note={message} onNext={() => onSolved(triedOutcome({ wrong: wrongPicks.length, helpUsed, shown: true }))} />}
    </div>
  );
}
