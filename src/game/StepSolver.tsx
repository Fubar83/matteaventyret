import { useEffect, useMemo, useState } from "react";
import { playEffect } from "../audio/sound";
import { stepsOf, tex, type AdvancedProblem } from "../engine/advanced";
import { questionStars } from "../engine/scoring";
import { t } from "../i18n";
import { answerOf, checkStep, type StepVerdict } from "../mathinput/stepCheck";
import type { WritingLevel } from "../recognition/levels";
import { profileForStage } from "../recognition/profiles";
import { ColumnHelper } from "./ColumnHelper";
import { columnTaskIn } from "./columnTask";
import { WorkPad } from "./draw/WorkPad";
import { HelpLadder } from "./HelpLadder";
import { isPlannedStep, nextPlanned } from "./stepMatch";
import type { QuestionOutcome } from "./questionOutcome";
import { Tex } from "./Tex";

interface StepSolverProps {
  problem: AdvancedProblem;
  level: WritingLevel;
  onSolved: (outcome: QuestionOutcome) => void;
  /** Start with each step there to trace (the round's first question) - it can be switched off, and on. */
  trace?: boolean;
}

/** A step written and checked: what it was read as, that it holds, and what it did (its guide, kept as its description). */
interface DoneStep {
  latex: string;
  verdict: StepVerdict;
  guide: string;
}

/** After this many wrong tries at one step, its help shows by itself - so no one gets stuck. */
const AUTO_HELP_AFTER = 2;

/**
 * Guidat: the solution written step by step - one box per step, each with
 * what to do in it ("Subtrahera 4 från båda leden"), checked as soon as the
 * child moves on, and strictly: a step counts when it's right AND it's the
 * step asked for (a right step that skips ahead, or goes another way, is
 * pointed back to this one). Only marked (✓, or "kolla det här steget" with
 * the number that came from nowhere), never told the answer. Each step has
 * its own help - how that step can look - and can be traced, faint in the
 * box, from the start. A done step can be changed: the steps after it go.
 * (Fritt - FreeSolver.tsx - is for writing it any way.)
 */
export function StepSolver({ problem, level, onSolved, trace = false }: StepSolverProps) {
  const plan = useMemo(() => stepsOf(problem), [problem]);
  const answer = useMemo(() => answerOf(problem), [problem]);
  const profile = profileForStage(problem.stageId);
  const [done, setDone] = useState<DoneStep[]>([]);
  /** Which planned step the box being written is (its guide and help). */
  const [planAt, setPlanAt] = useState(0);
  const [latex, setLatex] = useState("");
  /** Bumped to give the next step a fresh, empty box. */
  const [padToken, setPadToken] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; tone: "good" | "bad" | "info" } | null>(null);
  const [suspects, setSuspects] = useState<number[]>([]);
  /** Wrong tries at the step being written, and in all. */
  const [triesHere, setTriesHere] = useState(0);
  const [wrongTotal, setWrongTotal] = useState(0);
  /** Planned steps whose help has been shown. */
  const [helped, setHelped] = useState<ReadonlySet<number>>(new Set());
  const [ladderUsed, setLadderUsed] = useState(0);
  const [solved, setSolved] = useState<QuestionOutcome | null>(null);
  /** The column calculation ("Ställ upp") is open - a tool, like a calculator: it isn't help and costs no stars. */
  const [calculating, setCalculating] = useState(false);
  /** The step to write is shown faint, to trace over - help, like "Visa hur": a step written over it counts as helped. */
  const [tracing, setTracing] = useState(trace);

  const step = plan[Math.min(planAt, plan.length - 1)];
  const pastPlan = planAt >= plan.length;
  const guide = pastPlan ? t("step.writeAnswer") : t(step.guideKey, step.guideVars);

  function write(next: string) {
    setLatex(next);
    setSuspects([]);
  }

  function showHelp(index: number) {
    setHelped((h) => new Set(h).add(index));
  }

  function fresh() {
    setLatex("");
    setSuspects([]);
    setTriesHere(0);
    setPadToken((n) => n + 1);
  }

  function check() {
    const steps = [...done.map((d) => d.latex), latex];
    const v = checkStep(steps, answer, !!problem.unit);
    // Strict: a right step has to be this step - not the answer straight away, nor a later step.
    const right = v.kind === "solved" || v.kind === "ok" || v.kind === "more" || v.kind === "notFinished";
    const isLastPlanned = planAt >= plan.length - 1;
    if (right && !pastPlan && !(v.kind === "solved" && isLastPlanned) && !isPlannedStep(latex, plan, planAt)) {
      setFeedback({ text: t("step.followGuide", { guide }), tone: "info" });
      return;
    }
    if (right && tracing && !pastPlan) showHelp(planAt);
    if (v.kind === "solved") {
      playEffect("correct");
      const helpUsed = helped.size > 0 || ladderUsed > 0 || (tracing && !pastPlan);
      const outcome: QuestionOutcome = {
        helped: helpUsed || wrongTotal >= AUTO_HELP_AFTER,
        fullSetup: v.fullSetup || done.length > 0,
        wrongFirstAttempts: wrongTotal > 0 ? 1 : 0,
        hintUsed: helpUsed,
        miniTutorialUsed: false,
      };
      setDone([...done, { latex, verdict: v, guide }]);
      setFeedback(null);
      setSolved(outcome);
      return;
    }
    if (v.kind === "unread") {
      setFeedback({ text: t("step.unread"), tone: "info" });
      return;
    }
    if (v.kind === "wrong") {
      playEffect("wrong");
      const tries = triesHere + 1;
      setTriesHere(tries);
      setWrongTotal((n) => n + 1);
      setSuspects(v.suspects);
      const numbers = v.suspects.map((n) => tex(n).replace("{,}", ",")).join(", ");
      setFeedback({ text: v.suspects.length > 0 ? t("step.wrongNumber", { n: numbers }) : t("step.wrong"), tone: "bad" });
      if (tries >= AUTO_HELP_AFTER && !pastPlan) showHelp(planAt);
      return;
    }
    // A right step (or right so far): lock it, and on to the next.
    playEffect("correct");
    setDone([...done, { latex, verdict: v, guide }]);
    setPlanAt(nextPlanned(latex, plan, planAt));
    setFeedback({ text: v.kind === "more" ? t("step.more") : v.kind === "notFinished" ? t("step.keepGoing") : t("step.right"), tone: "good" });
    fresh();
  }

  /** Change a done step: it and the ones after it go, and it's written again. */
  function reopen(index: number) {
    setDone(done.slice(0, index));
    // Back to the planned step that step was at - near enough: the index, capped by the plan.
    setPlanAt(Math.min(index, plan.length - 1));
    setFeedback(null);
    fresh();
  }

  const stars = solved ? questionStars(solved) : null;
  // Solved: report it at once - the round celebrates it (Celebration.tsx), the work stays in view meanwhile.
  useEffect(() => {
    if (solved) onSolved(solved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved]);
  const ladder = [
    { title: t("help.tip"), content: t(problem.tipKey) },
    {
      title: t("help.solution"),
      content: (
        <div className="flex flex-col gap-1">
          {problem.solution.map((line, i) => (
            <Tex key={i} latex={line} />
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-2xl">
      {done.map((d, i) => (
        <div key={i} className="w-full flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-emerald-800">
              <span className="font-semibold">{t("step.title", { n: i + 1 })}</span> · {d.guide}
            </div>
            <div className="overflow-x-auto">
              <Tex latex={d.latex} />
            </div>
          </div>
          <span className="text-emerald-600 font-bold" aria-hidden>
            ✓
          </span>
          {!solved && (
            <button type="button" onClick={() => reopen(i)} className="text-xs text-slate-500 underline shrink-0">
              {t("step.edit")}
            </button>
          )}
        </div>
      ))}

      {solved ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-emerald-700 font-bold">{solved.fullSetup && !solved.helped ? t("expr.correctSetup") : t("expr.correct")}</p>
          {stars && <p className="text-amber-500 font-semibold">{t(`stars.q${stars}`)}</p>}
        </div>
      ) : (
        <>
          <div className="w-full rounded-xl bg-sky-50 border border-sky-200 px-4 py-2">
            <div className="text-xs font-bold uppercase tracking-wide text-sky-700">{t("step.title", { n: done.length + 1 })}</div>
            <p className="text-sky-900 font-medium">👉 {guide}</p>
          </div>
          <WorkPad
            level={level}
            profile={profile}
            title=""
            rows={1}
            onChange={write}
            resetToken={padToken}
            highlight={suspects}
            trace={tracing && !pastPlan ? step.line : undefined}
          />
          {helped.has(planAt) && !pastPlan && (
            <div className="w-full rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-2 text-sm text-slate-700">
              <div className="text-xs font-bold text-amber-700">{t("step.howTitle")}</div>
              <Tex latex={step.line} />
            </div>
          )}
          {calculating && <ColumnHelper fromStep={columnTaskIn(latex) || pastPlan ? latex : step.line} onClose={() => setCalculating(false)} />}
          {feedback && (
            <p role="status" className={`text-sm text-center ${feedback.tone === "good" ? "text-emerald-700" : feedback.tone === "bad" ? "text-rose-600" : "text-slate-600"}`}>
              {feedback.text}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            {!pastPlan && (
              <button
                type="button"
                role="switch"
                aria-checked={tracing}
                onClick={() => setTracing((v) => !v)}
                className={`h-12 px-4 rounded-xl font-semibold border-2 ${tracing ? "bg-sky-50 border-sky-300 text-sky-800" : "bg-white border-slate-200 text-slate-600"}`}
              >
                {t(tracing ? "step.traceOn" : "step.traceOff")}
              </button>
            )}
            {!calculating && (
              <button type="button" onClick={() => setCalculating(true)} className="h-12 px-4 rounded-xl bg-white text-sky-700 font-semibold border-2 border-sky-200">
                {t("calc.open")}
              </button>
            )}
            {!pastPlan && !helped.has(planAt) && (
              <button type="button" onClick={() => showHelp(planAt)} className="h-12 px-4 rounded-xl bg-amber-100 text-amber-800 font-semibold border-2 border-amber-300">
                {t("step.showHow")}
              </button>
            )}
            <button type="button" onClick={check} disabled={!latex} className="h-12 px-8 rounded-xl bg-sky-500 text-white font-bold shadow disabled:opacity-40">
              {t("step.nextStep")}
            </button>
          </div>
          <HelpLadder steps={ladder} used={ladderUsed} onUse={setLadderUsed} />
        </>
      )}
    </div>
  );
}
