import { useMemo } from "react";
import type { TrappanProblem } from "../../../engine/questions/trappan";
import type { GuidedBoardPlan } from "../../../mathinput/guidedPlan";
import { trappanPlan } from "./trappanPlan";

/** A trappan division drawn out - the same layout as the board (trappanPlan.ts) - for the theory slides; see PlanFigure. */
export function TrappanFigure({ problem, ...rest }: { problem: TrappanProblem; maxWidth?: number; until?: string; fresh?: number }) {
  const plan = useMemo(() => trappanPlan(problem), [problem]);
  return <PlanFigure plan={plan} {...rest} />;
}

/**
 * A guided board's working drawn out (a trappan, a column addition or
 * multiplication), for the theory slides. With `until`, only as far as the
 * box of that id is filled in (rows not reached yet left out), and the
 * digits written by the last `fresh` moves are highlighted - so a slide can
 * show one step of the working at a time.
 */
export function PlanFigure({ plan, maxWidth = 300, until, fresh = 1 }: { plan: GuidedBoardPlan; maxWidth?: number; until?: string; fresh?: number }) {
  const shownSteps = useMemo(() => {
    if (until === undefined) return plan.steps;
    const at = plan.steps.findIndex((s) => s.boxId === until);
    return at < 0 ? [] : plan.steps.slice(0, at + 1);
  }, [plan, until]);
  const written = useMemo(() => new Map(shownSteps.map((s) => [s.boxId, String(s.expected)])), [shownSteps]);
  const newest = useMemo(() => (until === undefined ? new Set<string>() : new Set(shownSteps.slice(-fresh).map((s) => s.boxId))), [shownSteps, until, fresh]);
  const { width, height, boxes, texts, lines } = plan.layout;
  // How far down the working has got: the lowest box with something in it.
  const reached = Math.max(...boxes.filter((b) => b.kind === "printed" || written.has(b.id)).map((b) => b.y + b.h));
  // Only what the steps so far need (`from`) - the same as the board shows.
  const reach = Math.max(0, shownSteps.length - 1);
  const needed = (e: { from?: number }) => until === undefined || (e.from ?? 0) <= reach;
  const shown = (y: number) => until === undefined || y <= reached + 12;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ maxWidth, width: "100%" }} role="img" aria-label={`${plan.title} ${plan.answerText}`}>
      {lines
        .filter((l) => needed(l) && shown(Math.min(l.y1, l.y2)))
        .map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#334155" strokeWidth={3} strokeLinecap="round" />
        ))}
      {texts
        .filter((tx) => needed(tx) && shown(tx.y))
        .map((tx, i) => (
          <text key={i} x={tx.x} y={tx.y} fontSize={tx.size} textAnchor="middle" dominantBaseline="central" fill="#334155">
            {tx.text}
          </text>
        ))}
      {boxes.map((b) => {
        const digit = b.text ?? written.get(b.id);
        if (digit === undefined || !needed(b)) return null;
        const isNew = newest.has(b.id);
        return (
          <g key={b.id}>
            {isNew && <rect x={b.x - 2} y={b.y - 2} width={b.w + 4} height={b.h + 4} rx={8} fill="#fef3c7" />}
            <text
              x={b.x + b.w / 2}
              y={b.y + b.h / 2}
              fontSize={40}
              textAnchor="middle"
              dominantBaseline="central"
              fill={b.kind === "printed" ? "#0f172a" : isNew ? "#b45309" : "#0369a1"}
              fontWeight={b.kind === "printed" ? 600 : isNew ? 700 : 500}
            >
              {digit}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
