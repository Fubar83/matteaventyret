import { useState } from "react";
import { playEffect } from "../../../audio/sound";
import type { ChoiceText } from "../../../engine/questions/choice/problem";
import { checkRatio, namesRight, RATIO, ROLES, roleOf, sideOf, SIDES, type RightTriangleProblem, type Role, type Side } from "../../../engine/questions/rightTriangle";
import { t } from "../../../i18n";
import { RightTriangle, RT_H, RT_W, ZONE } from "../../scenes/TrigPictures";
import { useDragDrop } from "../dragDrop";
import { type QuestionOutcome } from "../questionOutcome";
import { useCheckTries } from "../useCheckTries";

const say = (x: ChoiceText) => t(x.key, x.vars);
const chip = "h-11 px-4 rounded-full border-2 text-base font-bold shadow-sm select-none";

/**
 * The right triangle by hand. Naming: drag motstående, närliggande and
 * hypotenusa onto the sides (or tap a name, then a side). Building a ratio:
 * drag the sides' lengths into the fraction for sin v, cos v or tan v.
 * Rätta keeps what's right and sends the rest back.
 */
export function RightTrianglePlayer({ problem, onSolved }: { problem: RightTriangleProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  return problem.mode === "name" ? <NameSides problem={problem} onSolved={onSolved} /> : <BuildRatio problem={problem} onSolved={onSolved} />;
}

function NameSides({ problem, onSolved }: { problem: RightTriangleProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const { angleAt } = problem.shape;
  const [names, setNames] = useState<Partial<Record<Side, Role>>>({});
  const [locked, setLocked] = useState<Side[]>([]);
  const [selected, setSelected] = useState<Role | null>(null);
  const tries = useCheckTries(problem, onSolved);
  const { working } = tries;
  const tray = ROLES.filter((r) => !Object.values(names).includes(r));

  function place(role: Role, side: Side) {
    if (!working || locked.includes(side)) return;
    playEffect("tap");
    setNames((n) => {
      // A name is on one side only: off wherever it was, onto this one (whatever was there goes back).
      const next = Object.fromEntries(Object.entries(n).filter(([, r]) => r !== role)) as Partial<Record<Side, Role>>;
      return { ...next, [side]: role };
    });
    setSelected(null);
    tries.setMessage(null);
  }
  const dnd = useDragDrop((item, target) => {
    if ((SIDES as readonly string[]).includes(target)) place(item as Role, target as Side);
    else if (target === "tray") setNames((n) => Object.fromEntries(Object.entries(n).filter(([s, r]) => r !== item || locked.includes(s as Side))));
  });
  function tapSide(side: Side) {
    if (!working || locked.includes(side)) return;
    if (selected) place(selected, side);
    else if (names[side]) setNames((n) => ({ ...n, [side]: undefined }));
  }
  function check() {
    const right = namesRight(problem, names);
    if (right.every(Boolean)) return tries.solved();
    const keep = SIDES.filter((_, i) => right[i]);
    const first = SIDES.find((_, i) => !right[i])!;
    const why = names[first] ? t("rt.why.name", { name: t(`rt.role.${names[first]}`), role: t(`rt.role.${roleOf(angleAt, first)}`) }) : t("rt.why.missing");
    if (tries.failed(why)) {
      setNames(Object.fromEntries(SIDES.map((s) => [s, roleOf(angleAt, s)])));
      setLocked([...SIDES]);
      return;
    }
    setLocked(keep);
    setNames((n) => Object.fromEntries(Object.entries(n).filter(([s]) => keep.includes(s as Side))));
  }

  const done = tries.state !== "working";
  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      {dnd.ghost}
      <RightTriangle
        shape={problem.shape}
        width={380}
        onSide={(side, [x, y]) => {
          const role = names[side];
          const ok = done || locked.includes(side);
          const lit = dnd.over === side || (selected && !role);
          const w = 2 * ZONE[0];
          const cx = Math.max(w / 2 + 2, Math.min(RT_W - w / 2 - 2, x));
          const cy = Math.max(ZONE[1] + 2, Math.min(RT_H - ZONE[1] - 2, y));
          return (
            <g data-drop={side} data-side={side} onClick={() => tapSide(side)} style={{ cursor: working ? "pointer" : undefined }} role="button" aria-label={role ? t(`rt.role.${role}`) : t("rt.emptySide")}>
              <rect x={cx - w / 2} y={cy - ZONE[1]} width={w} height={2 * ZONE[1]} rx={ZONE[1]} fill={ok ? "#d1fae5" : role ? "#ffffff" : "#f8fafc"} stroke={ok ? "#059669" : lit ? "#f59e0b" : "#94a3b8"} strokeWidth={lit ? 3 : 2} strokeDasharray={role ? undefined : "5 4"} />
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={800} fill={ok ? "#047857" : "#334155"} pointerEvents="none">
                {role ? t(`rt.role.${role}`) : "?"}
              </text>
            </g>
          );
        }}
      />
      {working && (
        <div className="flex flex-wrap justify-center gap-2 min-h-12" data-drop="tray">
          {tray.map((r) => (
            <button key={r} type="button" className={`${chip} ${selected === r ? "bg-amber-100 border-amber-500 ring-4 ring-amber-200" : "bg-white border-sky-300"}`} onClick={() => setSelected(selected === r ? null : r)} data-role={r} {...dnd.handle(r)}>
              {t(`rt.role.${r}`)}
            </button>
          ))}
        </div>
      )}
      {working && (
        <button type="button" onClick={check} disabled={tray.length > 0} className="h-12 px-8 rounded-full bg-sky-500 text-white text-lg font-bold shadow disabled:opacity-40">
          {t("sort.check")}
        </button>
      )}
      {tries.footer}
    </div>
  );
}

function BuildRatio({ problem, onSolved }: { problem: RightTriangleProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const lengths = problem.lengths!;
  const fn = problem.fn!;
  const [top, setTop] = useState<Side | null>(null);
  const [bottom, setBottom] = useState<Side | null>(null);
  const tries = useCheckTries(problem, onSolved);
  const { working } = tries;
  const len = (s: Side) => lengths[SIDES.indexOf(s)];
  // The lengths smallest first: not in the order of the sides.
  const order = [...SIDES].sort((a, b) => len(a) - len(b));

  function put(side: Side, slot?: "top" | "bottom") {
    if (!working) return;
    playEffect("tap");
    tries.setMessage(null);
    const where = slot ?? (top === null ? "top" : "bottom");
    // A length is in one place at a time.
    if (where === "top") {
      if (bottom === side) setBottom(null);
      setTop(side);
    } else {
      if (top === side) setTop(null);
      setBottom(side);
    }
  }
  const dnd = useDragDrop((item, target) => {
    if (target === "top" || target === "bottom") put(item as Side, target);
  });
  function check() {
    const r = checkRatio(problem, top!, bottom!);
    if (r.ok) return tries.solved();
    if (tries.failed(say(r.why))) {
      // Shown: the right fraction.
      setTop(sideOf(problem.shape.angleAt, RATIO[fn][0]));
      setBottom(sideOf(problem.shape.angleAt, RATIO[fn][1]));
      return;
    }
    setTop(null);
    setBottom(null);
  }

  const done = tries.state !== "working";
  const slot = (which: "top" | "bottom", side: Side | null) => (
    <button
      type="button"
      data-drop={which}
      data-slot={which}
      onClick={() => working && (which === "top" ? setTop(null) : setBottom(null))}
      className={`h-12 min-w-16 px-3 rounded-xl border-2 text-2xl font-black tabular-nums ${done ? "border-emerald-500 bg-emerald-50 text-emerald-700" : side !== null ? "border-sky-400 bg-white text-slate-800" : "border-dashed border-slate-300 bg-slate-50 text-slate-400"} ${dnd.over === which ? "ring-4 ring-amber-300" : ""}`}
      aria-label={t(which === "top" ? "rt.numerator" : "rt.denominator")}
    >
      {side !== null ? len(side) : "?"}
    </button>
  );
  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      {dnd.ghost}
      <RightTriangle shape={problem.shape} labels={{ leg1: String(lengths[0]), leg2: String(lengths[1]), hyp: String(lengths[2]) }} width={340} />
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold text-slate-800">
          {fn} <i>v</i> =
        </span>
        <div className="flex flex-col items-center gap-1">
          {slot("top", top)}
          <div className="h-1 w-20 rounded bg-slate-700" />
          {slot("bottom", bottom)}
        </div>
      </div>
      {working && (
        <div className="flex flex-wrap justify-center gap-2">
          {order.map((s) => (
            <button key={s} type="button" className={`${chip} bg-white border-sky-300 text-xl tabular-nums ${top === s || bottom === s ? "opacity-40" : ""}`} onClick={() => put(s)} data-length={s} {...dnd.handle(s)}>
              {len(s)}
            </button>
          ))}
        </div>
      )}
      {working && (
        <button type="button" onClick={check} disabled={top === null || bottom === null} className="h-12 px-8 rounded-full bg-sky-500 text-white text-lg font-bold shadow disabled:opacity-40">
          {t("sort.check")}
        </button>
      )}
      {tries.footer}
    </div>
  );
}
