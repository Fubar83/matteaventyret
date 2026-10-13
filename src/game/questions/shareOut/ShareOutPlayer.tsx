import { useState } from "react";
import { playEffect } from "../../../audio/sound";
import { checkShare, type ShareOutProblem } from "../../../engine/questions/shareOut";
import { t } from "../../../i18n";
import { GROUP_EMOJI } from "../../scenes/EarlyPictures";
import { Sprite } from "../../scenes/Sprite";
import { useDragDrop } from "../dragDrop";
import { type QuestionOutcome } from "../questionOutcome";
import { useCheckTries } from "../useCheckTries";

const say = (x: { key: string; vars?: Record<string, string | number> }) => t(x.key, x.vars);

/**
 * Sharing out by hand: the things in a bowl, the animals with a plate each.
 * Tap a plate - or drag from the bowl onto it - and one thing goes there; tap
 * a thing on a plate and it goes back. Rätta when it's fair.
 */
export function ShareOutPlayer({ problem, onSolved }: { problem: ShareOutProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const n = problem.animals.length;
  const [plates, setPlates] = useState<number[]>(() => Array(n).fill(0));
  const tries = useCheckTries(problem, onSolved);
  const { working } = tries;
  const left = problem.total - plates.reduce((s, x) => s + x, 0);
  const emoji = GROUP_EMOJI[problem.thing];

  function give(i: number) {
    if (!working || left === 0) return;
    playEffect("tap");
    tries.setMessage(null);
    setPlates((ps) => ps.map((x, j) => (j === i ? x + 1 : x)));
  }
  function takeBack(i: number) {
    if (!working || plates[i] === 0) return;
    tries.setMessage(null);
    setPlates((ps) => ps.map((x, j) => (j === i ? x - 1 : x)));
  }
  const dnd = useDragDrop((item, target) => {
    if (item === "bowl" && target.startsWith("plate")) give(Number(target.slice(5)));
    if (item.startsWith("from") && target === "bowl") takeBack(Number(item.slice(4)));
  });
  function check() {
    const r = checkShare(problem, plates);
    if (r.ok) return tries.solved();
    if (tries.failed(say(r.why))) setPlates(Array(n).fill(problem.each));
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      {dnd.ghost}
      <div
        data-drop="bowl"
        className={`flex flex-wrap justify-center gap-1 max-w-sm min-h-16 rounded-b-[3rem] rounded-t-xl border-4 border-amber-700 bg-amber-100 px-4 py-3 text-3xl ${dnd.over === "bowl" ? "ring-4 ring-amber-300" : ""}`}
        aria-label={t("share.bowl", { n: left })}
        {...(working && left > 0 ? dnd.handle("bowl") : {})}
      >
        {Array.from({ length: left }, (_, i) => (
          <span key={i} className="leading-none select-none">
            {emoji}
          </span>
        ))}
        {left === 0 && <span className="text-sm text-amber-800 self-center">{t("share.empty")}</span>}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {problem.animals.map((animal, i) => (
          <div key={animal} className="flex flex-col items-center gap-1">
            <Sprite name={animal} size={52} />
            <button
              type="button"
              data-drop={`plate${i}`}
              data-plate={i}
              onClick={() => give(i)}
              className={`min-h-20 w-28 rounded-full border-4 flex flex-wrap content-center justify-center gap-0.5 p-2 text-xl ${!working ? "border-emerald-500 bg-emerald-50" : dnd.over === `plate${i}` ? "border-amber-400 bg-amber-50" : "border-slate-300 bg-white"}`}
              aria-label={t("share.plate", { n: plates[i] })}
            >
              {Array.from({ length: plates[i] }, (_, k) => (
                <span
                  key={k}
                  className="leading-none select-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    takeBack(i);
                  }}
                  {...(working ? dnd.handle(`from${i}`) : {})}
                >
                  {emoji}
                </span>
              ))}
            </button>
          </div>
        ))}
      </div>
      {!working && <p className="text-2xl font-black tabular-nums text-slate-800">{problem.rest > 0 ? t("share.result.rest", { total: problem.total, n, each: problem.each, rest: problem.rest }) : t("share.result.exact", { total: problem.total, n, each: problem.each })}</p>}
      {working && <p className="text-xs text-slate-500">{t("share.hint")}</p>}
      {working && (
        <button type="button" onClick={check} className="h-12 px-8 rounded-full bg-sky-500 text-white text-lg font-bold shadow">
          {t("sort.check")}
        </button>
      )}
      {tries.footer}
    </div>
  );
}
