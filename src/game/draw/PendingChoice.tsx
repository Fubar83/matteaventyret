import { t } from "../../i18n";

/**
 * "Menade du?" - the recognizer's most likely readings of a box it wasn't
 * sure about, as buttons; the child's pick is what gets checked. Or they
 * write it again (`onRewrite` clears the box).
 */
export function PendingChoice({ guesses, onPick, onRewrite }: { guesses: number[][]; onPick: (digits: number[]) => void; onRewrite?: () => void }) {
  const unique = guesses.filter((g, i) => guesses.findIndex((h) => h.join("") === g.join("")) === i);
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-xs text-slate-500">{t("ui.didYouMean")}</p>
      <div className="flex gap-2 items-center">
        {unique.map((g) => (
          <button key={g.join("")} type="button" onClick={() => onPick(g)} className="min-w-11 h-11 px-3 rounded-xl bg-violet-600 text-white text-xl font-bold">
            {g.join("")}
          </button>
        ))}
        {onRewrite && (
          <button type="button" onClick={onRewrite} className="h-11 px-3 rounded-xl bg-slate-200 text-slate-700 text-sm font-semibold">
            {t("ui.rewrite")}
          </button>
        )}
      </div>
    </div>
  );
}
