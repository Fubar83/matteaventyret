import { useMemo, useState } from "react";
import { playEffect } from "../../../audio/sound";
import type { ChoiceText } from "../../../engine/questions/choice/problem";
import { afterQuestion, outcomesOf, runExperiment, tally, type Ask, type ExperimentProblem } from "../../../engine/questions/experiment";
import { t } from "../../../i18n";
import { OptionContent } from "../choice/ChoicePlayer";
import { HelpLadder } from "../HelpLadder";
import { NextSheet } from "../NextSheet";
import { triedOutcome, type QuestionOutcome } from "../questionOutcome";

const say = (x: ChoiceText) => t(x.key, x.vars);
const BAR = { red: "#ef4444", blue: "#3b82f6", yellow: "#facc15", green: "#22c55e" } as const;
const BATCH = 10;

/** Where a die's pips go, by its face. */
const PIPS: Record<number, [number, number][]> = {
  1: [[2, 2]],
  2: [[1, 1], [3, 3]],
  3: [[1, 1], [2, 2], [3, 3]],
  4: [[1, 1], [3, 1], [1, 3], [3, 3]],
  5: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]],
  6: [[1, 1], [3, 1], [1, 2], [3, 2], [1, 3], [3, 3]],
};

/** A die showing a face, tumbling in each time `roll` changes. */
function Die({ face, roll }: { face: number; roll: number }) {
  return (
    <svg key={roll} viewBox="0 0 64 64" width={64} className={roll > 0 ? "anim-die-roll" : undefined} aria-hidden>
      <rect x={3} y={3} width={58} height={58} rx={12} fill="#fff" stroke="#334155" strokeWidth={3} />
      {PIPS[face].map(([c, r], i) => (
        <circle key={i} cx={c * 16} cy={r * 16} r={5.5} fill="#334155" />
      ))}
    </svg>
  );
}

/** A spinner whose needle turns - a couple of laps and onto the sector that came. */
function Spinner({ colors, turn }: { colors: { color: keyof typeof BAR; count: number }[]; turn: number }) {
  const sectors = colors.flatMap((c) => Array(c.count).fill(c.color) as (keyof typeof BAR)[]);
  const n = sectors.length;
  const at = (k: number, r: number) => [80 + r * Math.sin((2 * Math.PI * k) / n), 80 - r * Math.cos((2 * Math.PI * k) / n)];
  return (
    <svg viewBox="0 0 160 160" width={170} aria-hidden>
      {sectors.map((c, k) => {
        const [x0, y0] = at(k, 70);
        const [x1, y1] = at(k + 1, 70);
        return <path key={k} d={`M80 80 L${x0} ${y0} A70 70 0 0 1 ${x1} ${y1} Z`} fill={BAR[c]} stroke="#fff" strokeWidth={2} />;
      })}
      <circle cx={80} cy={80} r={70} fill="none" stroke="#334155" strokeWidth={3} />
      <g style={{ transform: `rotate(${turn}deg)`, transformOrigin: "80px 80px", transformBox: "view-box", transition: "transform 1.1s cubic-bezier(.2,.8,.3,1)" }}>
        <path d="M80 20 L86 80 L74 80 Z" fill="#1e293b" />
      </g>
      <circle cx={80} cy={80} r={8} fill="#1e293b" />
    </svg>
  );
}

/** A question's options as buttons; a wrong pick says why, and one wrong pick shows the answer. */
function Choose({ ask, onDone }: { ask: Ask; onDone: (wrong: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const done = picked !== null;
  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(ask.prompt)}</p>
      <div className="grid grid-cols-2 gap-2 w-full max-w-sm" role="group" aria-label={say(ask.prompt)}>
        {ask.options.map((o, i) => (
          <button
            key={i}
            type="button"
            disabled={done}
            onClick={() => {
              setPicked(i);
              const right = i === ask.correct;
              playEffect(right ? "correct" : "wrong");
              const w = ask.whyNot?.[i];
              setWhy(right ? null : w ? say(w) : t("tries.tryAgain"));
              onDone(!right);
            }}
            className={`min-h-14 px-3 py-2 rounded-2xl border-2 text-lg font-bold shadow-sm ${
              done && i === ask.correct ? "bg-emerald-100 border-emerald-500" : done && i === picked ? "bg-rose-50 border-rose-300 opacity-70" : "bg-white border-sky-300"
            }`}
          >
            <OptionContent option={o} />
          </button>
        ))}
      </div>
      {why && <p className="text-sm text-center max-w-sm text-slate-700">{why}</p>}
    </div>
  );
}

/**
 * A chance experiment: guess, then throw (ten at a time) and watch the
 * results pile up, then a question about what came. Each question is one
 * try; a wrong one shows the answer. ★★★ is both right.
 */
export function ExperimentPlayer({ problem, onSolved }: { problem: ExperimentProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const results = useMemo(() => runExperiment(problem), [problem]);
  const [phase, setPhase] = useState<"predict" | "run" | "after" | "done">("predict");
  const [thrown, setThrown] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const outcomes = outcomesOf(problem.device);
  const counts = tally(problem.device, results.slice(0, thrown));
  const max = Math.max(4, ...counts);
  const device = problem.device;
  // The last throw shown on the device: the needle on its sector, the dice on their faces.
  const last = thrown > 0 ? results[thrown - 1] : null;
  const [turn, setTurn] = useState(0);
  const sectorOf = (colorIndex: number) => {
    if (device.type !== "spinner") return 0;
    const sectors = device.colors.flatMap((c, i) => Array(c.count).fill(i) as number[]);
    const ks = sectors.map((s, k) => (s === colorIndex ? k : -1)).filter((k) => k >= 0);
    return (360 * (ks[thrown % ks.length] + 0.5)) / sectors.length;
  };
  const faces = last === null ? [] : device.type === "die" ? [last] : device.type === "twoDice" ? [Math.min(6, last - 1), last - Math.min(6, last - 1)] : [];
  const picture =
    device.type === "spinner" ? (
      <Spinner colors={device.colors} turn={turn} />
    ) : (
      <div className="flex gap-3 min-h-16">
        {(faces.length ? faces : device.type === "twoDice" ? [3, 4] : [6]).map((f, i) => (
          <Die key={i} face={f} roll={thrown + i} />
        ))}
      </div>
    );
  const label = (o: number) => (device.type === "spinner" ? <span className="inline-block w-4 h-4 rounded-full" style={{ background: BAR[device.colors[o].color] }} /> : <span>{o}</span>);
  const finish = (w: boolean) => {
    const all = wrong + (w ? 1 : 0);
    setWrong(all);
    setPhase("done");
    if (!w) onSolved(triedOutcome({ wrong: all, helpUsed }));
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="w-full max-w-xl rounded-3xl bg-gradient-to-b from-sky-50 to-white border-2 border-sky-100 shadow-sm p-3 flex flex-col items-center gap-3">
        {picture}
        <div className="flex items-end gap-1.5 h-36" role="img" aria-label={t("exp.results", { n: thrown })}>
          {outcomes.map((o, i) => (
            <div key={o} className="flex flex-col items-center justify-end h-full gap-0.5" data-outcome={o}>
              <span className="text-xs font-bold text-slate-600 tabular-nums">{thrown > 0 ? counts[i] : ""}</span>
              <div className="w-6 rounded-t bg-sky-400 transition-all" style={{ height: `${(counts[i] / max) * 100}px`, background: device.type === "spinner" ? BAR[device.colors[o].color] : undefined }} />
              <span className="text-sm font-bold text-slate-700">{label(o)}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-600">{t("exp.thrown", { n: thrown, of: problem.throws })}</p>
      </div>

      {/* The guess stays up, with what was said about it, while the throws come. */}
      {(phase === "predict" || phase === "run") && (
        <Choose
          ask={problem.predict}
          onDone={(w) => {
            setWrong(w ? 1 : 0);
            setPhase("run");
          }}
        />
      )}
      {phase === "run" && (
        <button
          type="button"
          onClick={() => {
            const next = Math.min(problem.throws, thrown + BATCH);
            setThrown(next);
            // A couple of laps, onto where the last spin of the ten stopped.
            if (device.type === "spinner") setTurn((t) => t + 720 + ((sectorOf(results[next - 1]) - (t % 360) + 360) % 360));
            if (next === problem.throws) setPhase("after");
          }}
          className="h-12 px-8 rounded-full bg-sky-500 text-white text-lg font-bold shadow"
        >
          {t(device.type === "spinner" ? "exp.spin" : "exp.throw", { n: BATCH })}
        </button>
      )}
      {(phase === "after" || phase === "done") && <Choose ask={afterQuestion(problem, results)} onDone={finish} />}
      {phase === "done" && wrong > 0 && <NextSheet note={say(problem.explanation)} onNext={() => onSolved(triedOutcome({ wrong, helpUsed, shown: true }))} />}
      {phase !== "done" && (
        <HelpLadder
          used={helpUsed}
          onUse={setHelpUsed}
          steps={[
            { title: t("help.tip"), content: say(problem.tip) },
            { title: t("help.solution"), content: say(problem.explanation) },
          ]}
        />
      )}
    </div>
  );
}
