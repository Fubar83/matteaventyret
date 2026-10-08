import { useState } from "react";
import { t } from "../i18n";
import { GuidedColumn } from "../mathinput/GuidedColumn";
import { planGuided, type GuidedOperator } from "../mathinput/guidedPlan";
import { columnTaskIn, decimalsOf, show, wholeNumberTask, type ColumnTask } from "./columnTask";

/**
 * "Ställ upp": a calculation from a solution step worked out in a column,
 * guided box by box (GuidedColumn - the same as the younger stages' column
 * calculations), so no one has to know 3,14 · 25 by heart. Decimals are done
 * the way they're taught: × without the commas, then the answer gets as many
 * decimals as both numbers together.
 */
export function ColumnHelper({ fromStep, onClose }: { fromStep: string; onClose: () => void }) {
  const found = columnTaskIn(fromStep);
  const [task, setTask] = useState<ColumnTask | null>(null);
  const [a, setA] = useState(found ? show(found.a) : "");
  const [b, setB] = useState(found ? show(found.b) : "");
  const [operator, setOperator] = useState<GuidedOperator>(found?.operator ?? "×");

  if (task) {
    const whole = wholeNumberTask(task);
    // A multiplication's decimals are taken away and put back on the board itself; for + and − the note below says where the comma goes.
    const plan = planGuided(task.operator, whole.top, whole.bottom, task.operator === "×" ? { top: decimalsOf(task.a), bottom: decimalsOf(task.b) } : undefined);
    const result = task.operator === "−" ? task.a - task.b : task.a + task.b;
    const exact = Math.round(result * 10 ** whole.decimals) / 10 ** whole.decimals;
    return (
      <div className="w-full rounded-2xl border-2 border-sky-200 bg-white p-3 flex flex-col gap-2">
        <GuidedColumn plan={plan} onExit={onClose} />
        {whole.decimals > 0 && task.operator !== "×" && (
          <p className="text-sm text-sky-900 bg-sky-50 rounded-lg px-3 py-2">{t("calc.decimalsPlus", { d: whole.decimals, whole: show(plan.answer), result: show(exact) })}</p>
        )}
      </div>
    );
  }

  const parse = (s: string) => Number(s.replace(",", ".").replace(/\s/g, ""));
  const ready = (s: string) => s.trim() !== "" && Number.isFinite(parse(s)) && parse(s) >= 0;
  // A column subtraction takes the smaller number from the bigger one.
  const backwards = operator === "−" && ready(a) && ready(b) && parse(a) < parse(b);
  return (
    <div className="w-full rounded-2xl border-2 border-sky-200 bg-white p-3 flex flex-col gap-2">
      <div className="font-semibold text-slate-700">{t("calc.title")}</div>
      <p className="text-sm text-slate-500">{t("calc.pick")}</p>
      <div className="flex items-center gap-2">
        <input aria-label={t("calc.first")} inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} className="w-28 h-11 rounded-lg border border-slate-300 px-2 text-lg text-right" />
        <div className="flex rounded-lg bg-slate-200 p-1" role="radiogroup" aria-label={t("calc.operator")}>
          {(["+", "−", "×"] as const).map((op) => (
            <button key={op} type="button" role="radio" aria-checked={operator === op} onClick={() => setOperator(op)} className={`w-10 h-9 rounded-md text-lg font-bold ${operator === op ? "bg-white text-sky-700 shadow" : "text-slate-600"}`}>
              {op === "×" ? "·" : op}
            </button>
          ))}
        </div>
        <input aria-label={t("calc.second")} inputMode="decimal" value={b} onChange={(e) => setB(e.target.value)} className="w-28 h-11 rounded-lg border border-slate-300 px-2 text-lg text-right" />
      </div>
      {backwards && <p className="text-sm text-amber-700">{t("calc.biggerFirst")}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="px-4 h-11 rounded-xl bg-slate-200 text-slate-700 font-semibold">
          {t("calc.close")}
        </button>
        <button type="button" disabled={!ready(a) || !ready(b) || backwards} onClick={() => setTask({ operator, a: parse(a), b: parse(b) })} className="flex-1 h-11 rounded-xl bg-sky-600 text-white font-semibold disabled:opacity-40">
          {t("calc.start")}
        </button>
      </div>
    </div>
  );
}
