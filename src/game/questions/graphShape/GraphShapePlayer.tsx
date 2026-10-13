import { useRef, useState, type PointerEvent } from "react";
import { playEffect } from "../../../audio/sound";
import { formula, PARAMS, valueAt, VIEW, type GraphShapeProblem } from "../../../engine/questions/graphShape";
import { t } from "../../../i18n";
import { Tex } from "../../Tex";
import { type QuestionOutcome } from "../questionOutcome";
import { useCheckTries } from "../useCheckTries";

const say = (x: { key: string; vars?: Record<string, string | number> }) => t(x.key, x.vars);
const SIZE = 340;
const INK = "#334155";
const nearest = (values: number[], v: number) => values.reduce((best, x) => (Math.abs(x - v) < Math.abs(best - v) ? x : best), values[0]);

/**
 * Shaping a graph by hand. The curve has handles to drag - a line's point
 * on the y-axis and one a step to the right; a parabola's vertex and one a
 * step from it; an exponential's value at 0 and at 1 - and each number has
 * − / + too. Given a formula, the numbers aren't shown: the graph is read.
 * Given a graph (dashed), the formula is written out as it changes.
 */
export function GraphShapePlayer({ problem, onSolved }: { problem: GraphShapeProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const { family } = problem;
  const { names, values } = PARAMS[family];
  const view = VIEW[family];
  const [p, setP] = useState<number[]>(problem.start);
  const tries = useCheckTries(problem, onSolved);
  const { working } = tries;
  const dragging = useRef<number | null>(null);

  const X = (x: number) => ((x - view.x[0]) / (view.x[1] - view.x[0])) * SIZE;
  const Y = (y: number) => SIZE - ((y - view.y[0]) / (view.y[1] - view.y[0])) * SIZE;
  const fromX = (sx: number) => view.x[0] + (sx / SIZE) * (view.x[1] - view.x[0]);
  const fromY = (sy: number) => view.y[0] + ((SIZE - sy) / SIZE) * (view.y[1] - view.y[0]);

  function set(next: number[]) {
    if (!working) return;
    if (next.some((v, i) => v !== p[i])) tries.setMessage(null);
    setP(next);
  }
  function step(i: number, d: number) {
    const list = values[i];
    const at = list.indexOf(nearest(list, p[i]));
    const to = list[Math.max(0, Math.min(list.length - 1, at + d))];
    playEffect("tap");
    set(p.map((v, j) => (j === i ? to : v)));
  }

  /** The handles, where they are now: each moves some of the numbers. */
  const handles: [number, number][] =
    family === "line" ? [[0, p[1]], [1, p[0] + p[1]]] : family === "parabola" ? [[p[1], p[2]], [p[1] + 1, p[0] + p[2]]] : [[0, p[0]], [1, p[0] * p[1]]];
  function moveHandle(h: number, x: number, y: number) {
    if (family === "line") {
      if (h === 0) set([p[0], nearest(values[1], y)]);
      else set([nearest(values[0], y - p[1]), p[1]]);
    } else if (family === "parabola") {
      if (h === 0) set([p[0], nearest(values[1], x), nearest(values[2], y)]);
      else set([nearest(values[0], y - p[2]), p[1], p[2]]);
    } else if (h === 0) set([nearest(values[0], y), p[1]]);
    else set([p[0], nearest(values[1], y / p[0])]);
  }
  const at = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - box.left) / box.width) * SIZE, ((e.clientY - box.top) / box.height) * SIZE];
  };
  const pointer = {
    onPointerDown: (e: PointerEvent<SVGSVGElement>) => {
      if (!working) return;
      const [sx, sy] = at(e);
      // The handle nearest the finger, if it's near one.
      const d = handles.map(([hx, hy]) => Math.hypot(X(hx) - sx, Y(hy) - sy));
      const h = d.indexOf(Math.min(...d));
      if (d[h] > 34) return;
      dragging.current = h;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: PointerEvent<SVGSVGElement>) => {
      if (dragging.current === null) return;
      const [sx, sy] = at(e);
      moveHandle(dragging.current, fromX(sx), fromY(sy));
    },
    onPointerUp: () => (dragging.current = null),
    onPointerCancel: () => (dragging.current = null),
    style: { touchAction: "none" as const },
  };

  function check() {
    if (p.every((v, i) => v === problem.target[i])) return tries.solved();
    const wrong = names.findIndex((_, i) => p[i] !== problem.target[i]);
    const sign = family === "parabola" && wrong === 0 && Math.sign(p[0]) !== Math.sign(problem.target[0]);
    if (tries.failed(t(sign ? "gs.why.parabola.sign" : `gs.why.${family}.${names[wrong]}`))) setP(problem.target);
  }

  const curve = (q: number[]) => {
    const pts: string[] = [];
    for (let x = view.x[0]; x <= view.x[1] + 1e-9; x += 0.05) {
      const y = valueAt(family, q, x);
      if (y > view.y[1] + 2 || y < view.y[0] - 2) continue;
      pts.push(`${X(x).toFixed(1)},${Y(y).toFixed(1)}`);
    }
    return pts.join(" ");
  };
  const gridX = Array.from({ length: view.x[1] - view.x[0] + 1 }, (_, i) => view.x[0] + i);
  const gridY = Array.from({ length: view.y[1] - view.y[0] + 1 }, (_, i) => view.y[0] + i);
  const labelEvery = view.y[1] - view.y[0] > 12 ? 2 : 1;
  const done = !working;

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      <div className="rounded-2xl bg-white border-2 border-slate-200 px-5 py-2 text-2xl shadow-sm min-h-14" data-formula>
        <Tex latex={problem.given === "formula" ? formula(family, problem.target) : formula(family, p)} block />
      </div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} className={`max-w-full select-none ${working ? "cursor-grab" : ""}`} role="img" aria-label={t("gs.label")} {...pointer}>
        <defs>
          <clipPath id="gs-clip">
            <rect x={0} y={0} width={SIZE} height={SIZE} />
          </clipPath>
        </defs>
        <rect x={0} y={0} width={SIZE} height={SIZE} fill="#ffffff" />
        {gridX.map((x) => (
          <line key={`x${x}`} x1={X(x)} y1={0} x2={X(x)} y2={SIZE} stroke={x === 0 ? INK : "#e2e8f0"} strokeWidth={x === 0 ? 1.8 : 1} />
        ))}
        {gridY.map((y) => (
          <line key={`y${y}`} x1={0} y1={Y(y)} x2={SIZE} y2={Y(y)} stroke={y === 0 ? INK : "#e2e8f0"} strokeWidth={y === 0 ? 1.8 : 1} />
        ))}
        {/* Every number but 0 and the edges, which would be cut in half. */}
        {gridX.filter((x) => x !== 0 && x !== view.x[0] && x !== view.x[1]).map((x) => (
          <text key={`lx${x}`} x={X(x)} y={Y(0) + 13} textAnchor="middle" fontSize={10} fill="#64748b">
            {x < 0 ? `−${-x}` : x}
          </text>
        ))}
        {gridY.filter((y) => y !== 0 && y % labelEvery === 0 && y !== view.y[0] && y !== view.y[1]).map((y) => (
          <text key={`ly${y}`} x={X(0) - 5} y={Y(y) + 3} textAnchor="end" fontSize={10} fill="#64748b">
            {y < 0 ? `−${-y}` : y}
          </text>
        ))}
        <g clipPath="url(#gs-clip)">
          {problem.given === "graph" && <polyline points={curve(problem.target)} fill="none" stroke="#f59e0b" strokeWidth={4} strokeDasharray="8 6" opacity={0.9} />}
          <polyline points={curve(p)} fill="none" stroke={done ? "#059669" : "#2563eb"} strokeWidth={3.5} style={{ transition: "all 0.15s" }} />
        </g>
        {working &&
          handles.map(([hx, hy], h) => (
            <circle key={h} cx={X(hx)} cy={Y(hy)} r={10} fill={h === 0 ? "#2563eb" : "#ffffff"} stroke="#2563eb" strokeWidth={3} data-handle={h} />
          ))}
      </svg>
      {working && (
        <div className="flex flex-wrap justify-center gap-3">
          {names.map((n, i) => (
            <div key={n} className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
              <button type="button" className="h-9 w-9 rounded-full bg-white border-2 border-slate-300 font-bold" onClick={() => step(i, -1)} data-param={n} data-dir="down" aria-label={t("gs.less", { n })}>
                −
              </button>
              <span className="w-8 text-center font-bold italic text-slate-700">{n}</span>
              <button type="button" className="h-9 w-9 rounded-full bg-white border-2 border-slate-300 font-bold" onClick={() => step(i, 1)} data-param={n} data-dir="up" aria-label={t("gs.more", { n })}>
                +
              </button>
            </div>
          ))}
        </div>
      )}
      {working && <p className="text-xs text-slate-500 text-center max-w-sm">{t(`gs.hint.${family}`)}</p>}
      {working && (
        <button type="button" onClick={check} className="h-12 px-8 rounded-full bg-sky-500 text-white text-lg font-bold shadow">
          {t("sort.check")}
        </button>
      )}
      {tries.footer}
    </div>
  );
}
