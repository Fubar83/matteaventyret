import { useState } from "react";
import { playEffect } from "../../../audio/sound";
import type { ChoiceOption } from "../../../engine/questions/choice/problem";
import { branches, value, type Frac, type TreeProblem } from "../../../engine/questions/tree";
import { t } from "../../../i18n";
import { Tex } from "../../Tex";
import { OptionContent } from "../choice/ChoicePlayer";
import { useDragDrop } from "../dragDrop";
import { type QuestionOutcome } from "../questionOutcome";
import { useCheckTries } from "../useCheckTries";

const say = (x: { key: string; vars?: Record<string, string | number> }) => t(x.key, x.vars);
const COLOR = { red: "#ef4444", blue: "#3b82f6", yellow: "#facc15", green: "#22c55e" } as const;
const INK = "#334155";
const W = 380;
const H = 300;

/** The branches' ends: the root, the first draw's two nodes, the second's four leaves. */
const ROOT: [number, number] = [24, 150];
const NODE: [number, number][] = [
  [180, 75],
  [180, 225],
];
const LEAF: [number, number][] = [
  [330, 35],
  [330, 115],
  [330, 185],
  [330, 265],
];
/** Branch k: 0-1 from the root, 2-5 from a node (2 + 2i + j: after colour i, colour j). */
const ends = (k: number): [[number, number], [number, number]] => (k < 2 ? [ROOT, NODE[k]] : [NODE[Math.floor((k - 2) / 2)], LEAF[k - 2]]);

/**
 * A tree diagram by hand: each branch's probability put on it - drag a card
 * onto a branch, or tap a card and then the branch (a card can go on many).
 * Rätta checks the tree; then the question: multiply along a path, add the
 * paths.
 */
export function TreePlayer({ problem, onSolved }: { problem: TreeProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const { first, second } = branches(problem);
  const expected: Frac[] = [...first, ...second.flat()];
  const [placed, setPlaced] = useState<(number | null)[]>(() => Array(6).fill(null));
  const [wrongAt, setWrongAt] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [treeDone, setTreeDone] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const tries = useCheckTries(problem, onSolved, 3);
  const { working } = tries;

  function put(card: number, branch: number) {
    if (!working || treeDone) return;
    playEffect("tap");
    tries.setMessage(null);
    setWrongAt((w) => w.filter((b) => b !== branch));
    setPlaced((p) => p.map((c, k) => (k === branch ? card : c)));
  }
  const dnd = useDragDrop((item, target) => {
    if (item.startsWith("card") && target.startsWith("branch")) put(Number(item.slice(4)), Number(target.slice(6)));
  });
  function tapBranch(k: number) {
    if (selected !== null) put(selected, k);
    else if (placed[k] !== null && working && !treeDone) setPlaced((p) => p.map((c, j) => (j === k ? null : c)));
  }

  function checkTree() {
    const wrong = expected.map((f, k) => (placed[k] === null || value(problem.cards[placed[k]!]) !== value(f) ? k : -1)).filter((k) => k >= 0);
    if (wrong.length === 0) {
      playEffect("correct");
      setTreeDone(true);
      tries.setMessage(null);
      return;
    }
    // A second branch with the first draw's fraction: the marble wasn't taken out of the bag.
    const keptSlip = !problem.replace && wrong.some((k) => k >= 2 && placed[k] !== null && first.some((f) => value(f) === value(problem.cards[placed[k]!])));
    if (tries.failed(t(keptSlip ? "tree.why.kept" : "tree.why.branch", { n: wrong.length }))) {
      setPlaced(expected.map((f) => problem.cards.findIndex((c) => value(c) === value(f))));
      setTreeDone(true);
      return;
    }
    setWrongAt(wrong);
    setPlaced((p) => p.map((c, k) => (wrong.includes(k) ? null : c)));
  }
  function answer(i: number) {
    if (!working) return;
    setPicked(i);
    if (i === problem.after.correct) return tries.solved();
    const why = problem.after.whyNot?.[i];
    if (tries.failed(why ? say(why) : t("tries.tryAgain"))) setPicked(problem.after.correct);
  }

  const fracText = (f: Frac) => (
    <>
      <tspan x={0} dy={-4}>
        {f[0]}
      </tspan>
      <tspan x={0} dy={16}>
        {f[1]}
      </tspan>
    </>
  );
  const marble = (x: number, y: number, c: (typeof problem.colors)[number], r = 9) => <circle cx={x} cy={y} r={r} fill={COLOR[c]} stroke={INK} strokeWidth={1.5} />;
  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      <div className="flex gap-1 rounded-b-3xl border-4 border-slate-500 bg-slate-50 px-3 py-2" aria-label={t("tree.bag")}>
        {problem.counts.flatMap((n, i) => Array.from({ length: n }, (_, k) => <span key={`${i}-${k}`} className="h-6 w-6 rounded-full border-2 border-slate-600" style={{ background: COLOR[problem.colors[i]] }} />))}
      </div>
      {dnd.ghost}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md select-none" role="img" aria-label={t("tree.label")}>
        {[0, 1, 2, 3, 4, 5].map((k) => {
          const [a, b] = ends(k);
          return <line key={k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={INK} strokeWidth={2.5} />;
        })}
        <circle cx={ROOT[0]} cy={ROOT[1]} r={6} fill={INK} />
        {NODE.map(([x, y], i) => (
          <g key={i}>{marble(x, y, problem.colors[i], 12)}</g>
        ))}
        {LEAF.map(([x, y], l) => (
          <g key={l}>
            {marble(x, y, problem.colors[Math.floor(l / 2)])}
            {marble(x + 20, y, problem.colors[l % 2])}
          </g>
        ))}
        {[0, 1, 2, 3, 4, 5].map((k) => {
          const [a, b] = ends(k);
          const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + (b[1] < a[1] ? -6 : 6)];
          const card = placed[k];
          const bad = wrongAt.includes(k);
          return (
            <g key={k} transform={`translate(${mx}, ${my})`} data-drop={`branch${k}`} data-branch={k} onClick={() => tapBranch(k)} style={{ cursor: working ? "pointer" : undefined }} role="button" aria-label={t("tree.branch")}>
              <rect x={-21} y={-22} width={42} height={40} rx={8} fill={card !== null ? (treeDone ? "#d1fae5" : "#ffffff") : bad ? "#ffe4e6" : "#f8fafc"} stroke={dnd.over === `branch${k}` ? "#f59e0b" : bad ? "#e11d48" : "#94a3b8"} strokeWidth={2} strokeDasharray={card !== null ? undefined : "4 3"} />
              {card !== null ? (
                <text textAnchor="middle" fontSize={14} fontWeight={800} fill={INK}>
                  {fracText(problem.cards[card])}
                </text>
              ) : (
                <text y={4} textAnchor="middle" fontSize={16} fontWeight={800} fill="#94a3b8">
                  ?
                </text>
              )}
              {card !== null && <line x1={-10} y1={0} x2={10} y2={0} stroke={INK} strokeWidth={1.5} />}
            </g>
          );
        })}
      </svg>
      {working && !treeDone && (
        <>
          <div className="flex flex-wrap justify-center gap-2" role="group" aria-label={t("tree.cards")}>
            {problem.cards.map((c, i) => (
              <button key={i} type="button" data-card={i} onClick={() => setSelected(selected === i ? null : i)} className={`h-16 min-w-14 px-2 rounded-xl border-2 text-xl ${selected === i ? "bg-amber-100 border-amber-500 ring-4 ring-amber-200" : "bg-white border-sky-300"}`} {...dnd.handle(`card${i}`)}>
                <Tex latex={`\\dfrac{${c[0]}}{${c[1]}}`} />
              </button>
            ))}
          </div>
          <button type="button" onClick={checkTree} disabled={placed.some((c) => c === null)} className="h-12 px-8 rounded-full bg-sky-500 text-white text-lg font-bold shadow disabled:opacity-40">
            {t("sort.check")}
          </button>
        </>
      )}
      {treeDone && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-base font-semibold text-slate-800 text-center">{say(problem.after.prompt)}</p>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label={say(problem.after.prompt)}>
            {problem.after.options.map((o: ChoiceOption, i) => (
              <button
                key={i}
                type="button"
                data-after={i}
                disabled={!working}
                onClick={() => answer(i)}
                className={`h-16 min-w-24 rounded-2xl border-2 text-xl ${!working && i === problem.after.correct ? "bg-emerald-100 border-emerald-500" : picked === i ? "bg-rose-50 border-rose-300" : "bg-white border-sky-300"}`}
              >
                <OptionContent option={o} />
              </button>
            ))}
          </div>
        </div>
      )}
      {tries.footer}
    </div>
  );
}
