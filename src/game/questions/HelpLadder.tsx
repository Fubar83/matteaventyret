import type { ReactNode } from "react";
import { t } from "../../i18n";

export interface HelpStep {
  title: string;
  content: ReactNode;
  /** Something the step does when shown - e.g. switch on the guided order, or write the next digit in. */
  onReveal?: () => void;
}

/**
 * Help that's always there (see engine/scoring.ts): one tap shows a tip, the
 * next the first step, the last how it's done. Using any of it caps the
 * question at one star - never more than that, and it's never refused.
 */
export function HelpLadder({ steps, used, onUse }: { steps: HelpStep[]; used: number; onUse: (nextUsed: number) => void }) {
  const shown = steps.slice(0, used);
  const more = used < steps.length;
  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-md">
      {shown.map((step, i) => (
        <div key={i} className="w-full rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-2 text-slate-700 text-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-amber-700">{step.title}</div>
          <div className="mt-1">{step.content}</div>
        </div>
      ))}
      {more && (
        <button
          type="button"
          onClick={() => {
            steps[used].onReveal?.();
            onUse(used + 1);
          }}
          className="h-10 px-4 rounded-full bg-amber-100 text-amber-800 font-semibold text-sm border-2 border-amber-300 shadow-sm active:translate-y-0.5"
        >
          {used === 0 ? t("help.button") : t("help.more")}
        </button>
      )}
      {used === 1 && <p className="text-xs text-slate-400">{t("help.note")}</p>}
    </div>
  );
}
