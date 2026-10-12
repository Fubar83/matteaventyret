import { useState } from "react";
import { playEffect } from "../../../audio/sound";
import { blocksOf, checkBlocks, type BlocksProblem } from "../../../engine/questions/blocks";
import type { ChoiceText } from "../../../engine/questions/choice/problem";
import { t } from "../../../i18n";
import { block, BLOCK_COLORS } from "../../scenes/BaseTenBlocks";
import { Tex } from "../../Tex";
import { useDragDrop } from "../dragDrop";
import { HelpLadder } from "../HelpLadder";
import { NextSheet } from "../NextSheet";
import { triedOutcome, type QuestionOutcome } from "../questionOutcome";

const say = (x: ChoiceText) => t(x.key, x.vars);
const WRONG_ALLOWED = 2;
const small = "h-9 min-w-9 px-2 rounded-full border-2 text-base font-bold shadow-sm disabled:opacity-30";

/** A place's blocks, as many as there are - laid out like the place value picture, wider when there are more than nine. */
function Pile({ look, count }: { look: number; count: number }) {
  const at = (i: number) =>
    look >= 2 ? { x: (i % 10) * 7, y: 40 - (i % 10) * 4 + Math.floor(i / 10) * 50 } : look === 1 ? { x: i * 12, y: 22 } : { x: (i % 3) * 12, y: 70 - Math.floor(i / 3) * 12 };
  const w = look === 1 ? Math.max(110, count * 12 + 10) : 110;
  const top = look === 0 ? Math.min(0, 70 - Math.floor((count - 1) / 3) * 12) : 0;
  const h = look >= 2 ? 100 + Math.floor(Math.max(count - 1, 0) / 10) * 50 : 100 - top;
  return (
    <svg width={w} height={h} viewBox={`-4 ${top - 4} ${w + 8} ${h}`} aria-hidden>
      {Array.from({ length: count }, (_, i) => block(look, at(i).x, at(i).y, i))}
    </svg>
  );
}

/**
 * Base-ten blocks to build with: + and − per place, and changing one block
 * into ten of the next smaller (and, when building, ten into one bigger).
 * The total isn't shown - working it out is the task. Rätta checks it;
 * after the allowed wrong checks the blocks are put right.
 */
export function BlocksPlayer({ problem, onSolved }: { problem: BlocksProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const { places, mode } = problem;
  const [counts, setCounts] = useState<number[]>(problem.start);
  const [wrong, setWrong] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [state, setState] = useState<"working" | "solved" | "shown">("working");
  const [message, setMessage] = useState<string | null>(null);
  const working = state === "working";
  // Decimals are drawn one size up: a whole is a plate of a hundred hundredths.
  const look = (p: number) => p - Math.min(0, ...places);
  const change = (i: number, d: number) => setCounts((c) => c.map((n, j) => (j === i ? n + d : n)));
  const breakDown = (i: number) => setCounts((c) => c.map((n, j) => (j === i ? n - 1 : j === i + 1 ? n + 10 : n)));
  const bundle = (i: number) => setCounts((c) => c.map((n, j) => (j === i ? n - 10 : j === i - 1 ? n + 1 : n)));

  // Dragging: a new block from the supply into its column; a block from a column into the bin, or onto
  // the next smaller column - where it's changed into ten.
  const dnd = useDragDrop((item, target) => {
    if (!working) return;
    const i = Number(item.slice(3));
    if (item.startsWith("new") && target === `col${i}` && mode === "build") change(i, 1);
    if (item.startsWith("out") && counts[i] > 0) {
      if (target === "bin") change(i, -1);
      if (target === `col${i + 1}`) breakDown(i);
    }
  });
  /** One block, small - to drag. */
  const one = (p: number) => <svg width={look(p) >= 2 ? 30 : 22} height={look(p) === 1 ? 44 : 30} viewBox={look(p) === 1 ? "-2 -2 14 64" : look(p) >= 2 ? "-2 -2 48 48" : "-2 -2 14 14"} aria-hidden>{block(look(p), 0, 0, 0)}</svg>;

  function check() {
    const { ok, why } = checkBlocks(problem, counts);
    if (ok) {
      playEffect("correct");
      setState("solved");
      setMessage(null);
      onSolved(triedOutcome({ wrong, helpUsed }));
      return;
    }
    playEffect("wrong");
    const next = wrong + 1;
    setWrong(next);
    if (next >= WRONG_ALLOWED) {
      setCounts(blocksOf(places, problem.target));
      setState("shown");
      setMessage(`${why ? `${say(why)} ` : ""}${say(problem.explanation)}`);
      return;
    }
    setMessage(why ? say(why) : t("tries.tryAgain"));
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      <div className="rounded-2xl bg-white border-2 border-slate-200 px-6 py-2 text-3xl shadow-sm">
        <Tex latex={problem.display} block />
      </div>
      {dnd.ghost}
      {working && mode === "build" && (
        <div className="flex items-center gap-3 rounded-2xl bg-white border-2 border-slate-200 px-3 py-1">
          <span className="text-xs font-semibold text-slate-500">{t("blocks.supply")}</span>
          {places.map((p, i) => (
            <div key={p} {...dnd.handle(`new${i}`)} className="p-1 rounded-lg hover:bg-amber-50" aria-hidden>
              {one(p)}
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-2 w-full max-w-xl">
        {places.map((p, i) => (
          <div key={p} className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 pt-2 pb-2 min-w-32 ${dnd.over === `col${i}` ? "bg-amber-100 border-amber-400 ring-4 ring-amber-200" : "bg-amber-50/70 border-amber-100"}`} data-place={p} data-drop={`col${i}`}>
            <span className="text-sm font-bold" style={{ color: BLOCK_COLORS[look(p)] }}>
              {t(`blocks.place.${p}`)}
            </span>
            <div {...(working && counts[i] > 0 ? dnd.handle(`out${i}`) : {})} aria-hidden={false}>
              <Pile look={look(p)} count={counts[i]} />
            </div>
            {working && (
              <div className="flex flex-wrap justify-center gap-1">
                <button type="button" className={`${small} bg-white border-slate-300`} onClick={() => change(i, -1)} disabled={counts[i] === 0} aria-label={t("blocks.remove", { place: t(`blocks.place.${p}`) })}>
                  −
                </button>
                {mode === "build" && (
                  <button type="button" className={`${small} bg-white border-slate-300`} onClick={() => change(i, 1)} disabled={counts[i] >= 19} aria-label={t("blocks.add", { place: t(`blocks.place.${p}`) })}>
                    +
                  </button>
                )}
              </div>
            )}
            {working && i < places.length - 1 && (
              <button type="button" className={`${small} bg-sky-50 border-sky-300 text-xs`} onClick={() => breakDown(i)} disabled={counts[i] === 0} data-break={p}>
                {t("blocks.breakDown")}
              </button>
            )}
            {working && mode === "build" && i > 0 && (
              <button type="button" className={`${small} bg-sky-50 border-sky-300 text-xs`} onClick={() => bundle(i)} disabled={counts[i] < 10}>
                {t("blocks.bundle")}
              </button>
            )}
          </div>
        ))}
      </div>
      {working && (
        <div data-drop="bin" className={`rounded-2xl border-2 border-dashed px-6 py-2 text-sm font-semibold ${dnd.over === "bin" ? "border-rose-400 bg-rose-50 text-rose-700" : "border-slate-300 text-slate-500"}`}>
          🗑️ {t("blocks.bin")}
        </div>
      )}
      {working && (
        <div className="flex gap-3">
          <button type="button" onClick={() => setCounts(problem.start)} className="h-12 px-5 rounded-full bg-white border-2 border-slate-300 text-base font-bold">
            {t("blocks.reset")}
          </button>
          <button type="button" onClick={check} className="h-12 px-8 rounded-full bg-sky-500 text-white text-lg font-bold shadow">
            {t("sort.check")}
          </button>
        </div>
      )}
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
