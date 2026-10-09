import { formatSwedishNumber } from "../../../engine/digits";
import { t } from "../../../i18n";

interface PlaceValueBoardProps {
  number: number;
  columnAsked: number;
  answerText: string;
  verdict: "correct" | "wrong" | null;
}

/** Stage 1: "Vad är siffran X värd i talet N?" - a plain numeric-answer question, not an uppställning. */
export function PlaceValueBoard({ number, columnAsked, answerText, verdict }: PlaceValueBoardProps) {
  const digits = number.toString().split("").reverse();
  const highlightIndex = columnAsked;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-row-reverse gap-1 text-3xl font-bold">
        {digits.map((d, i) => (
          <span
            key={i}
            className={`w-12 h-14 flex items-center justify-center rounded-md ${
              i === highlightIndex ? "bg-amber-200 text-amber-800 ring-2 ring-amber-500" : "text-slate-800"
            }`}
          >
            {d}
          </span>
        ))}
      </div>
      <p className="text-slate-700 text-center font-medium">
        {t("placeValue.question", {
          digit: digits[highlightIndex],
          number: formatSwedishNumber(number),
          place: t(`place.${highlightIndex}`),
        })}
      </p>
      <div
        className={`w-40 h-14 flex items-center justify-center rounded-xl border-2 text-2xl font-bold ${
          verdict === "correct"
            ? "bg-emerald-50 border-emerald-400 text-emerald-700"
            : verdict === "wrong"
              ? "bg-rose-50 border-rose-400 text-rose-700"
              : "bg-white border-slate-300 border-dashed text-slate-800"
        }`}
      >
        {answerText || " "}
      </div>
    </div>
  );
}
