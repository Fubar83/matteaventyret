import { useState } from "react";
import { playEffect } from "../../../audio/sound";
import type { PyramidProblem } from "../../../engine/questions/pyramid";
import { t } from "../../../i18n";
import { AnswerBoard } from "../../draw/AnswerBoard";
import { type QuestionOutcome } from "../questionOutcome";
import { useCheckTries } from "../useCheckTries";

const say = (x: { key: string; vars?: Record<string, string | number> }) => t(x.key, x.vars);
/** Wrong bricks in all before the pyramid is filled in. */
const WRONG_ALLOWED = 3;
type At = [number, number];
const keyOf = ([r, i]: At) => `${r},${i}`;

/**
 * A number pyramid: tap an empty brick and write its number on the board
 * under the pyramid. A right number stays (green); a wrong one is wiped, and
 * counts. When every brick is filled, it's done. The algebra pyramid has
 * its middle bricks as expressions, and x to find.
 */
export function PyramidPlayer({ problem, onSolved }: { problem: PyramidProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const { values, shown, labels } = problem;
  const [filled, setFilled] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<At | null>(() => {
    const first = values.flatMap((row, r) => row.map((_, i) => [r, i] as At)).find(([r, i]) => !shown[r][i]);
    return first ?? null;
  });
  const [resetToken, setResetToken] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const tries = useCheckTries(problem, onSolved, WRONG_ALLOWED);
  const { working } = tries;
  const open = values.flatMap((row, r) => row.map((_, i) => [r, i] as At)).filter(([r, i]) => !shown[r][i]);

  function write(n: number) {
    if (!working || !selected) return;
    const [r, i] = selected;
    if (n === values[r][i]) {
      playEffect("tap");
      tries.setMessage(null);
      const next = new Set(filled).add(keyOf(selected));
      setFilled(next);
      const rest = open.filter((at) => !next.has(keyOf(at)));
      setSelected(rest[0] ?? null);
      setResetToken((k) => k + 1);
      if (rest.length === 0) tries.solved();
      return;
    }
    setResetToken((k) => k + 1);
    if (tries.failed(t(labels ? "pyr.why.algebra" : r > 0 ? "pyr.why.sum" : "pyr.why.difference", { n }))) setShowAll(true);
  }

  const rows = [...values.keys()].reverse();
  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      <div className="flex flex-col items-center gap-1" role="group" aria-label={t("pyr.label")}>
        {rows.map((r) => (
          <div key={r} className="flex gap-1">
            {values[r].map((v, i) => {
              const at: At = [r, i];
              const k = keyOf(at);
              const given = shown[r][i];
              const done = filled.has(k) || showAll;
              const isSel = working && selected !== null && keyOf(selected) === k;
              const label = labels?.[k];
              return (
                <button
                  key={i}
                  type="button"
                  data-brick={k}
                  disabled={!working || given || done}
                  onClick={() => (setSelected(at), setResetToken((x) => x + 1))}
                  className={`h-14 min-w-20 px-2 rounded-lg border-2 text-xl font-black tabular-nums ${
                    given ? "bg-amber-100 border-amber-600 text-amber-900" : done ? "bg-emerald-100 border-emerald-500 text-emerald-800" : isSel ? "bg-white border-sky-500 ring-4 ring-sky-200 text-slate-400" : "bg-white border-dashed border-slate-400 text-slate-400"
                  }`}
                  aria-label={given || done ? String(label ?? v) : t("pyr.empty")}
                >
                  {given ? (label ?? v) : done ? v : labels && r === 0 ? "x" : "?"}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {working && selected && (
        <div className="flex flex-col items-center gap-1 w-full">
          <p className="text-sm text-slate-600">{t(labels ? "pyr.writeX" : "pyr.write")}</p>
          <AnswerBoard length={String(values[selected[0]][selected[1]]).length} onSubmit={write} resetToken={resetToken} />
        </div>
      )}
      {tries.footer}
    </div>
  );
}
