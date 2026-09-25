import { useState } from "react";
import { t } from "../i18n";
import { TEORI_SLIDES, type TeoriTopic } from "./teoriContent";

interface TeoriScreenProps {
  topic: TeoriTopic;
  onDone: () => void;
}

/** A concrete worked example, step by step, tap to advance (see build brief "Teori"). */
export function TeoriScreen({ topic, onDone }: TeoriScreenProps) {
  const slides = TEORI_SLIDES[topic];
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  return (
    <div className="flex flex-col items-center gap-6 py-12 px-6 max-w-sm mx-auto text-center">
      <div className="min-h-[6rem] flex items-center justify-center">{slide.render()}</div>
      <p className="text-slate-700 text-lg">{t(slide.textKey)}</p>
      <button
        type="button"
        onClick={() => (isLast ? onDone() : setIndex((i) => i + 1))}
        className="h-12 px-8 rounded-xl bg-sky-500 text-white font-bold shadow"
      >
        {isLast ? t("ui.startTask") : t("ui.continue")}
      </button>
      <div className="flex gap-1">
        {slides.map((_, i) => (
          <span key={i} className={`w-2 h-2 rounded-full ${i === index ? "bg-sky-500" : "bg-slate-200"}`} />
        ))}
      </div>
    </div>
  );
}
