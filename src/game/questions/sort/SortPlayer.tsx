import { useState } from "react";
import { playEffect } from "../../../audio/sound";
import type { ChoiceText } from "../../../engine/questions/choice/problem";
import type { SortGroupsProblem, SortOrderProblem } from "../../../engine/questions/sort/problem";
import { t } from "../../../i18n";
import { OptionContent } from "../choice/ChoicePlayer";
import { HelpLadder } from "../HelpLadder";
import { NextSheet } from "../NextSheet";
import { triedOutcome, type QuestionOutcome } from "../questionOutcome";

const say = (x: ChoiceText) => t(x.key, x.vars);

/** Wrong checks before the answer is shown - as for a single-choice question with four options. */
export const WRONG_CHECKS_ALLOWED = 2;

type State = "working" | "solved" | "shown";

const chip = "min-h-14 min-w-14 px-3 py-1.5 rounded-xl border-2 text-xl font-bold shadow-sm flex items-center justify-center active:translate-y-0.5";
const chipColor = (selected: boolean, locked: boolean) =>
  locked ? "bg-emerald-50 border-emerald-400 text-emerald-900" : selected ? "bg-amber-100 border-amber-500 ring-4 ring-amber-300 text-slate-800" : "bg-white border-sky-300 text-slate-800";

/** What's under the board: the message, the help ladder while working, the answer and Nästa when it was shown. */
function Footer({ state, message, explanation, tip, helpUsed, onHelp, onNext }: { state: State; message: string | null; explanation: ChoiceText; tip: ChoiceText; helpUsed: number; onHelp: (n: number) => void; onNext: () => void }) {
  return (
    <>
      {message && state === "working" && (
        <p role="status" className="text-sm text-center max-w-sm text-slate-700">
          {message}
        </p>
      )}
      {state === "solved" && <p className="text-sm text-center max-w-sm text-emerald-700 font-semibold">{say(explanation)}</p>}
      {state === "working" && (
        <HelpLadder
          used={helpUsed}
          onUse={onHelp}
          steps={[
            { title: t("help.tip"), content: say(tip) },
            { title: t("help.solution"), content: say(explanation) },
          ]}
        />
      )}
      {state === "shown" && <NextSheet note={message} onNext={onNext} />}
    </>
  );
}

/**
 * Sorting into groups: tap a thing, then the group it goes in (tap it again
 * in its group to take it back). Rätta checks them all: the right ones stay,
 * the wrong ones come back with why one of them doesn't fit. After the
 * allowed wrong checks the answer is shown. ★★★ is right at the first check.
 */
export function SortGroupsPlayer({ problem, onSolved }: { problem: SortGroupsProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const n = problem.items.length;
  const [placed, setPlaced] = useState<(number | null)[]>(() => Array(n).fill(null));
  const [locked, setLocked] = useState<boolean[]>(() => Array(n).fill(false));
  const [selected, setSelected] = useState<number | null>(null);
  const [wrong, setWrong] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [state, setState] = useState<State>("working");
  const [message, setMessage] = useState<string | null>(null);
  const working = state === "working";

  function putIn(group: number) {
    if (!working || selected === null) return;
    setPlaced((p) => p.map((g, i) => (i === selected ? group : g)));
    setSelected(null);
  }
  function takeBack(i: number) {
    if (!working || locked[i]) return;
    setPlaced((p) => p.map((g, j) => (j === i ? null : g)));
    setSelected(i);
  }

  function check() {
    const misplaced = placed.map((g, i) => (g !== problem.answer[i] ? i : -1)).filter((i) => i >= 0);
    if (misplaced.length === 0) {
      playEffect("correct");
      setLocked(Array(n).fill(true));
      setState("solved");
      setMessage(null);
      onSolved(triedOutcome({ wrong, helpUsed }));
      return;
    }
    playEffect("wrong");
    const next = wrong + 1;
    setWrong(next);
    const why = problem.why[misplaced[0]];
    if (next >= WRONG_CHECKS_ALLOWED) {
      setPlaced([...problem.answer]);
      setLocked(Array(n).fill(true));
      setState("shown");
      setMessage(`${why ? `${say(why)} ` : ""}${say(problem.explanation)}`);
      return;
    }
    // The right ones stay put; the wrong ones come back to the tray.
    setLocked(placed.map((g, i) => g === problem.answer[i]));
    setPlaced(placed.map((g, i) => (g === problem.answer[i] ? g : null)));
    setMessage(`${t("sort.check.groupsWrong", { n: misplaced.length })}${why ? ` ${say(why)}` : ""}`);
  }

  const tray = problem.items.map((_, i) => i).filter((i) => placed[i] === null);
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      <div className="flex flex-wrap justify-center gap-2 min-h-14 max-w-xl" role="group" aria-label={t("sort.tray")}>
        {tray.map((i) => (
          <button key={i} type="button" onClick={() => setSelected(selected === i ? null : i)} disabled={!working} aria-pressed={selected === i} className={`${chip} ${chipColor(selected === i, false)}`}>
            <OptionContent option={problem.items[i]} />
          </button>
        ))}
        {tray.length === 0 && working && <p className="text-sm text-slate-500 self-center">{t("sort.allPlaced")}</p>}
      </div>
      <div className={`grid gap-3 w-full max-w-xl ${problem.groups.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {problem.groups.map((g, gi) => (
          <div
            key={gi}
            role="button"
            tabIndex={0}
            aria-label={t("sort.putIn", { group: "text" in g ? say(g.text) : String(gi + 1) })}
            onClick={() => putIn(gi)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && putIn(gi)}
            className={`min-h-36 rounded-2xl border-2 border-dashed p-2 flex flex-col items-center gap-2 ${selected !== null ? "border-amber-400 bg-amber-50/60 cursor-pointer" : "border-slate-300 bg-slate-50"}`}
          >
            <div className="text-base font-bold text-slate-700 text-center">
              <OptionContent option={g} />
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {problem.items.map((item, i) =>
                placed[i] === gi ? (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      takeBack(i);
                    }}
                    disabled={!working || locked[i]}
                    className={`${chip} ${chipColor(false, locked[i])} text-lg min-h-12 min-w-12`}
                  >
                    <OptionContent option={item} />
                  </button>
                ) : null
              )}
            </div>
          </div>
        ))}
      </div>
      {working && (
        <button type="button" onClick={check} disabled={tray.length > 0} className="h-12 px-8 rounded-full bg-sky-500 text-white text-lg font-bold shadow disabled:opacity-40">
          {t("sort.check")}
        </button>
      )}
      <Footer
        state={state}
        message={message}
        explanation={problem.explanation}
        tip={problem.tip}
        helpUsed={helpUsed}
        onHelp={setHelpUsed}
        onNext={() => onSolved(triedOutcome({ wrong, helpUsed, shown: true }))}
      />
    </div>
  );
}

/**
 * Putting in order: tap the things one after another, from one end to the
 * other (tap a placed one to take it back). Rätta keeps the ones right from
 * the start and sends the rest back. After the allowed wrong checks the
 * order is shown.
 */
export function SortOrderPlayer({ problem, onSolved }: { problem: SortOrderProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const n = problem.items.length;
  const [row, setRow] = useState<number[]>([]);
  const [lockedUpTo, setLockedUpTo] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [state, setState] = useState<State>("working");
  const [message, setMessage] = useState<string | null>(null);
  const working = state === "working";

  function check() {
    const right = row.findIndex((item, i) => item !== problem.answer[i]);
    if (right === -1) {
      playEffect("correct");
      setLockedUpTo(n);
      setState("solved");
      setMessage(null);
      onSolved(triedOutcome({ wrong, helpUsed }));
      return;
    }
    playEffect("wrong");
    const next = wrong + 1;
    setWrong(next);
    if (next >= WRONG_CHECKS_ALLOWED) {
      setRow([...problem.answer]);
      setLockedUpTo(n);
      setState("shown");
      setMessage(say(problem.explanation));
      return;
    }
    // Right from the start up to the first wrong one: those stay.
    setRow(row.slice(0, right));
    setLockedUpTo(right);
    setMessage(right === 0 ? t("sort.check.firstWrong", { end: say(problem.ends[0]) }) : t("sort.check.rightUpTo", { n: right }));
  }

  const tray = problem.items.map((_, i) => i).filter((i) => !row.includes(i));
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      <div className="flex flex-wrap justify-center gap-2 min-h-14 max-w-xl" role="group" aria-label={t("sort.tray")}>
        {tray.map((i) => (
          <button key={i} type="button" onClick={() => working && setRow([...row, i])} disabled={!working} className={`${chip} ${chipColor(false, false)}`}>
            <OptionContent option={problem.items[i]} />
          </button>
        ))}
      </div>
      <div className="w-full max-w-xl flex flex-col gap-1">
        <div className="flex justify-between text-sm font-bold text-slate-500 px-1">
          <span>{say(problem.ends[0])}</span>
          <span>{say(problem.ends[1])}</span>
        </div>
        <ol className="flex flex-wrap justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-2" aria-label={t("sort.row")}>
          {Array.from({ length: n }, (_, slot) => {
            const item = row[slot];
            if (item === undefined) return <li key={slot} className="min-h-14 min-w-14 rounded-xl border-2 border-dashed border-slate-300 bg-white/60" aria-label={t("sort.emptySlot", { n: slot + 1 })} />;
            const locked = slot < lockedUpTo;
            return (
              <li key={slot}>
                <button type="button" onClick={() => working && !locked && setRow(row.filter((x) => x !== item))} disabled={!working || locked} className={`${chip} ${chipColor(false, locked)}`}>
                  <OptionContent option={problem.items[item]} />
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      {working && (
        <button type="button" onClick={check} disabled={row.length < n} className="h-12 px-8 rounded-full bg-sky-500 text-white text-lg font-bold shadow disabled:opacity-40">
          {t("sort.check")}
        </button>
      )}
      <Footer
        state={state}
        message={message}
        explanation={problem.explanation}
        tip={problem.tip}
        helpUsed={helpUsed}
        onHelp={setHelpUsed}
        onNext={() => onSolved(triedOutcome({ wrong, helpUsed, shown: true }))}
      />
    </div>
  );
}
