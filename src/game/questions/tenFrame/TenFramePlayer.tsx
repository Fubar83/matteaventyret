import { useState } from "react";
import { playEffect } from "../../../audio/sound";
import { sumChoices, type TenFrameProblem } from "../../../engine/questions/tenFrame";
import { t } from "../../../i18n";
import { useDragDrop } from "../dragDrop";
import { type QuestionOutcome } from "../questionOutcome";
import { useCheckTries } from "../useCheckTries";

const say = (x: { key: string; vars?: Record<string, string | number> }) => t(x.key, x.vars);
type Cell = "given" | "added" | "moved" | null;

/** A frame of ten: two rows of five cells, each empty or holding a counter of its kind. */
function Frame({ cells, onCell, drop, lit, done }: { cells: Cell[]; onCell?: (i: number) => void; drop: string; lit: boolean; done: boolean }) {
  return (
    <div data-drop={drop} data-frame={drop} className={`grid grid-cols-5 gap-1.5 rounded-2xl border-4 p-2 ${done ? "border-emerald-500 bg-emerald-50" : lit ? "border-amber-400 bg-amber-50" : "border-slate-500 bg-white"}`}>
      {cells.map((c, i) => (
        <button
          key={i}
          type="button"
          data-cell={i}
          onClick={() => onCell?.(i)}
          className={`h-14 w-14 rounded-xl border-2 border-slate-300 flex items-center justify-center ${i === 4 ? "mr-0" : ""}`}
          aria-label={c ? t("tf.counter") : t("tf.empty")}
        >
          {c && <span className={`h-11 w-11 rounded-full shadow-inner ${c === "given" ? "bg-rose-500" : c === "moved" ? "bg-sky-500 ring-4 ring-amber-300" : "bg-sky-500"}`} />}
        </button>
      ))}
    </div>
  );
}

const fill = (n: number, kind: Cell): Cell[] => Array.from({ length: 10 }, (_, i) => (i < n ? kind : null));

/**
 * The ten frame by hand. Showing and filling to ten: tap a cell (or drag a
 * counter from the pile) to put a counter there, tap it again to take it
 * away - the given red ones stay. Over ten: tap a blue counter in the second
 * frame and it jumps to the first; when the first is full, it's 10 and the
 * rest, and the sum is picked.
 */
export function TenFramePlayer({ problem, onSolved }: { problem: TenFrameProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const [first, setFirst] = useState<Cell[]>(() => fill(problem.given[0], "given"));
  const [second, setSecond] = useState<Cell[]>(() => fill(problem.given[1], "added"));
  const [picked, setPicked] = useState<number | null>(null);
  const tries = useCheckTries(problem, onSolved);
  const { working } = tries;
  const count = (cells: Cell[]) => cells.filter(Boolean).length;
  const added = first.filter((c) => c === "added").length;
  const over = problem.mode === "overTen";
  const firstFull = count(first) === 10;

  function tapFirst(i: number) {
    if (!working || over) return;
    if (first[i] === "given") return;
    playEffect("tap");
    tries.setMessage(null);
    setFirst((cs) => cs.map((c, j) => (j === i ? (c ? null : "added") : c)));
  }
  /** Over ten: a counter from the second frame into the first's next empty cell. */
  function move() {
    if (!working || firstFull) return;
    const to = first.indexOf(null);
    const from = second.map((c, j) => (c ? j : -1)).filter((j) => j >= 0).pop();
    if (to < 0 || from === undefined) return;
    playEffect("tap");
    tries.setMessage(null);
    setFirst((cs) => cs.map((c, j) => (j === to ? "moved" : c)));
    setSecond((cs) => cs.map((c, j) => (j === from ? null : c)));
  }
  const dnd = useDragDrop((item, target) => {
    if (item === "pile" && target === "first" && !over) {
      const i = first.indexOf(null);
      if (i >= 0) tapFirst(i);
    }
    if (item === "counter2" && target === "first" && over) move();
  });

  function check() {
    if (problem.mode === "overTen") {
      if (picked === problem.target) return tries.solved();
      if (tries.failed(t(picked === problem.target - 10 ? "tf.why.forgotTen" : "tf.why.sum"))) setPicked(problem.target);
      return;
    }
    const n = count(first);
    if (n === problem.target) return tries.solved();
    if (tries.failed(t(n > problem.target ? "tf.why.tooMany" : "tf.why.tooFew", { n }))) setFirst(problem.mode === "show" ? fill(problem.target, "added") : first.map((c) => c ?? "added"));
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      {dnd.ghost}
      {problem.mode === "toTen" && (
        <p className="text-3xl font-black tabular-nums text-slate-800" data-equation>
          <span className="text-rose-600">{problem.given[0]}</span> + <span className="text-sky-600">{added}</span> = {problem.given[0] + added}
        </p>
      )}
      {over && (
        <p className="text-3xl font-black tabular-nums text-slate-800" data-equation>
          {firstFull ? (
            <>
              10 + <span className="text-sky-600">{count(second)}</span>
            </>
          ) : (
            <>
              <span className="text-rose-600">{problem.given[0]}</span> + <span className="text-sky-600">{problem.given[1]}</span>
            </>
          )}
        </p>
      )}
      <Frame cells={first} onCell={tapFirst} drop="first" lit={dnd.over === "first"} done={!working} />
      {over && (
        <div className="flex flex-col items-center gap-2">
          <div {...(working && !firstFull ? dnd.handle("counter2") : {})} onClick={move}>
            <Frame cells={second} drop="second" lit={false} done={false} />
          </div>
          {working && !firstFull && <p className="text-sm text-slate-500">{t("tf.moveHint")}</p>}
        </div>
      )}
      {working && !over && (
        <div className="flex items-center gap-3">
          <div {...dnd.handle("pile")} className="h-12 w-12 rounded-full bg-sky-500 shadow-md" aria-label={t("tf.pile")} />
          <span className="text-sm text-slate-500">{t("tf.tapHint")}</span>
        </div>
      )}
      {over && firstFull && (
        <div className="flex gap-2" role="group" aria-label={t("tf.whatSum")}>
          {sumChoices(problem).map((n) => (
            <button
              key={n}
              type="button"
              disabled={!working}
              onClick={() => (setPicked(n), tries.setMessage(null))}
              data-sum={n}
              className={`h-14 w-16 rounded-2xl border-2 text-2xl font-bold tabular-nums ${picked === n ? (working ? "bg-amber-100 border-amber-500" : "bg-emerald-100 border-emerald-500") : "bg-white border-sky-300"}`}
            >
              {n}
            </button>
          ))}
        </div>
      )}
      {working && (
        <button type="button" onClick={check} disabled={over && picked === null} className="h-12 px-8 rounded-full bg-sky-500 text-white text-lg font-bold shadow disabled:opacity-40">
          {t("sort.check")}
        </button>
      )}
      {tries.footer}
    </div>
  );
}
