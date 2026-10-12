import { useState } from "react";
import { playEffect } from "../../../audio/sound";
import type { ChoiceText } from "../../../engine/questions/choice/problem";
import type { MatchProblem } from "../../../engine/questions/match";
import { t } from "../../../i18n";
import { OptionContent } from "../choice/ChoicePlayer";
import { useDragDrop } from "../dragDrop";
import { HelpLadder } from "../HelpLadder";
import { NextSheet } from "../NextSheet";
import { triedOutcome, type QuestionOutcome } from "../questionOutcome";

const say = (x: ChoiceText) => t(x.key, x.vars);

/** Wrong pairs before the rest are shown - more than a single choice allows, as there are several pairs to find. */
export const WRONG_PAIRS_ALLOWED = 3;

/** A colour per matched pair, so the pairs stand out from each other. */
const PAIR_COLORS = ["bg-emerald-100 border-emerald-500", "bg-sky-100 border-sky-500", "bg-amber-100 border-amber-500", "bg-fuchsia-100 border-fuchsia-500", "bg-lime-100 border-lime-500"];

/**
 * Matching pairs: all cards face up; tap one, then the one it belongs with.
 * A right pair stays together in its own colour; a wrong one says so and
 * lets go. After the allowed wrong pairs the rest are shown. ★★★ is every
 * pair right the first time.
 */
export function MatchPlayer({ problem, onSolved }: { problem: MatchProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [wrong, setWrong] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [state, setState] = useState<"working" | "solved" | "shown">("working");
  const [message, setMessage] = useState<string | null>(null);
  const working = state === "working";
  const pairs = problem.cards.length / 2;

  function tap(i: number) {
    if (!working || matched.includes(problem.cards[i].pair)) return;
    if (selected === null || selected === i) {
      setSelected(selected === i ? null : i);
      return;
    }
    pairUp(selected, i);
  }

  // A card dragged onto another is the same as tapping the two.
  const dnd = useDragDrop((item, target) => {
    const [i, j] = [Number(item), Number(target)];
    if (!working || i === j || matched.includes(problem.cards[i].pair) || matched.includes(problem.cards[j].pair)) return;
    pairUp(i, j);
  });

  function pairUp(first: number, second: number) {
    const [a, b] = [problem.cards[first], problem.cards[second]];
    setSelected(null);
    if (a.pair === b.pair) {
      const done = [...matched, a.pair];
      setMatched(done);
      setMessage(null);
      if (done.length === pairs) {
        playEffect("correct");
        setState("solved");
        onSolved(triedOutcome({ wrong, helpUsed }));
      }
      return;
    }
    playEffect("wrong");
    const next = wrong + 1;
    setWrong(next);
    if (next >= WRONG_PAIRS_ALLOWED) {
      setMatched(problem.cards.map((c) => c.pair).filter((p, k, all) => all.indexOf(p) === k));
      setState("shown");
      setMessage(say(problem.explanation));
      return;
    }
    setMessage(t("match.notPair"));
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {dnd.ghost}
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      <div className={`grid gap-2 w-full max-w-xl ${problem.cards.length > 6 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"}`} role="group" aria-label={t("match.cards")}>
        {problem.cards.map((card, i) => {
          const done = matched.indexOf(card.pair);
          const color = done >= 0 ? PAIR_COLORS[done % PAIR_COLORS.length] : selected === i || dnd.over === String(i) ? "bg-amber-50 border-amber-500 ring-4 ring-amber-300" : "bg-white border-sky-300";
          return (
            <button
              key={i}
              type="button"
              data-drop={String(i)}
              {...(working && done < 0 ? dnd.handle(String(i)) : {})}
              onClick={() => tap(i)}
              disabled={!working || done >= 0}
              aria-pressed={selected === i}
              className={`min-h-20 px-2 py-2 rounded-2xl border-2 text-xl font-bold text-slate-800 shadow-sm flex items-center justify-center active:translate-y-0.5 ${color}`}
            >
              <OptionContent option={card.option} />
            </button>
          );
        })}
      </div>
      {message && working && (
        <p role="status" className="text-sm text-center max-w-sm text-slate-700">
          {message}
        </p>
      )}
      {state === "solved" && <p className="text-sm text-center max-w-sm text-emerald-700 font-semibold">{say(problem.explanation)}</p>}
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
