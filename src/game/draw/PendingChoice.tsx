import { t } from "../../i18n";
import { BottomSheet } from "../BottomSheet";

/**
 * "Menade du?" - the recognizer's most likely readings of a box it wasn't
 * sure about, as buttons; the child's pick is what gets checked. Or they
 * write it again (`onRewrite` clears the box). In a sheet at the bottom of
 * the screen, so it's in view however far down the board reaches.
 */
export function PendingChoice({ guesses, onPick, onRewrite }: { guesses: number[][]; onPick: (digits: number[]) => void; onRewrite?: () => void }) {
  const unique = guesses.filter((g, i) => guesses.findIndex((h) => h.join("") === g.join("")) === i);
  return (
    <BottomSheet label={t("ui.didYouMean")}>
      <div className="flex flex-col items-center gap-2">
        <p className="text-base font-semibold text-slate-700">{t("ui.didYouMean")}</p>
        <div className="flex flex-wrap justify-center gap-3 items-center">
          {unique.map((g) => (
            <button key={g.join("")} type="button" onClick={() => onPick(g)} className="min-w-16 h-14 px-4 rounded-xl bg-violet-600 text-white text-2xl font-bold shadow active:translate-y-0.5">
              {g.join("")}
            </button>
          ))}
          {onRewrite && (
            <button type="button" onClick={onRewrite} className="h-14 px-4 rounded-xl bg-slate-200 text-slate-700 text-base font-semibold">
              {t("ui.rewrite")}
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
