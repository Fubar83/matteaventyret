import { useEffect, useState } from "react";
import { playEffect } from "../audio/sound";
import { getLocale, t } from "../i18n";
import { TEORI_SLIDES, type TeoriSlide, type TeoriTopic } from "./teoriContent";

interface TeoriScreenProps {
  topic: TeoriTopic;
  /** Shown over the slides - the stage's name. */
  title?: string;
  onDone: () => void;
}

const KIND_LABEL: Record<NonNullable<TeoriSlide["kind"]>, { key: string; tone: string }> = {
  concept: { key: "teori.kind.concept", tone: "bg-sky-100 text-sky-800" },
  step: { key: "teori.kind.step", tone: "bg-indigo-100 text-indigo-800" },
  mistake: { key: "teori.kind.mistake", tone: "bg-rose-100 text-rose-800" },
  check: { key: "teori.kind.check", tone: "bg-emerald-100 text-emerald-800" },
};

/** Reads a slide's text aloud in the game's language, with the browser's own voice (nothing is sent anywhere). */
function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/·/g, " gånger ").replace(/−/g, " minus "));
  u.lang = getLocale() === "sv" ? "sv-SE" : "en-GB";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

/**
 * A topic's theory, a slide at a time (see build brief "Teori"): the idea with
 * a picture, a worked example step by step, a common mistake, and a quick
 * "Testa själv" before the questions - not graded, just a check that it
 * landed. Every slide can be read aloud.
 */
export function TeoriScreen({ topic, title, onDone }: TeoriScreenProps) {
  const slides = TEORI_SLIDES[topic];
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const slide = slides[index];
  const isLast = index === slides.length - 1;
  const text = t(slide.textKey);
  const check = slide.check;
  const answeredRight = check ? picked === check.correct : true;

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function next() {
    window.speechSynthesis?.cancel();
    setPicked(null);
    if (isLast) onDone();
    else setIndex((i) => i + 1);
  }

  const kind = slide.kind ?? "step";
  return (
    <div className="flex flex-col items-center gap-5 py-10 px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-900 to-slate-900 px-5 py-3 text-white">
          <span className="font-bold truncate">{title ?? t("ui.theory")}</span>
          <span className={`ml-auto text-xs font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${KIND_LABEL[kind].tone}`}>{t(KIND_LABEL[kind].key)}</span>
        </div>
        <div className="flex flex-col items-center gap-5 p-6 text-center">
          <div className="min-h-[7rem] flex items-center justify-center">{slide.render()}</div>
          <div className="flex items-start gap-2">
            <p className="text-slate-700 text-lg">{text}</p>
            <button type="button" onClick={() => speak(text)} aria-label={t("teori.readAloud")} className="shrink-0 w-9 h-9 rounded-full bg-slate-100 text-lg">
              🔊
            </button>
          </div>
          {check && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex flex-wrap justify-center gap-2">
                {check.options.map((option, i) => {
                  const chosen = picked === i;
                  const tone = picked === null ? "bg-white border-slate-300 text-slate-800" : i === check.correct && (chosen || picked !== null) ? "bg-emerald-100 border-emerald-500 text-emerald-800" : chosen ? "bg-rose-100 border-rose-400 text-rose-700" : "bg-white border-slate-200 text-slate-400";
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={answeredRight && picked !== null}
                      onClick={() => {
                        setPicked(i);
                        playEffect(i === check.correct ? "correct" : "wrong");
                      }}
                      className={`min-w-14 h-12 px-4 rounded-xl border-2 text-lg font-bold ${tone}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              {picked !== null && <p className={`text-sm font-semibold ${answeredRight ? "text-emerald-700" : "text-rose-600"}`}>{answeredRight ? t("teori.checkRight") : t("teori.checkAgain")}</p>}
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={next}
        disabled={!!check && !answeredRight}
        className="h-12 px-8 rounded-xl bg-sky-500 text-white font-bold shadow disabled:opacity-40"
      >
        {isLast ? t("ui.startTask") : t("ui.continue")}
      </button>
      <div className="flex gap-1">
        {slides.map((_, i) => (
          <span key={i} className={`w-2 h-2 rounded-full ${i === index ? "bg-sky-500" : i < index ? "bg-sky-200" : "bg-slate-200"}`} />
        ))}
      </div>
    </div>
  );
}
