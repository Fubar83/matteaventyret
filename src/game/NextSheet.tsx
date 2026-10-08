import { t } from "../i18n";
import { BottomSheet } from "./BottomSheet";

/**
 * "Nästa" once a question's answer has been shown: at the bottom of the
 * screen like "Rätt!" (Celebration.tsx), so it's in view on a phone - with
 * the explanation beside it, so the child reads why before going on.
 */
export function NextSheet({ note, onNext }: { note?: string | null; onNext: () => void }) {
  return (
    <BottomSheet label={t("placeValue.next")}>
      <div className="flex items-center gap-3">
        {note && <p className="flex-1 min-w-0 text-sm text-slate-700">{note}</p>}
        <button type="button" onClick={onNext} autoFocus className="ml-auto h-12 px-6 rounded-xl bg-emerald-600 text-white font-bold shadow shrink-0">
          {t("placeValue.next")} →
        </button>
      </div>
    </BottomSheet>
  );
}
