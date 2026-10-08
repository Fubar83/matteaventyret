import { useEffect, useMemo, useRef } from "react";
import type { Stars } from "../engine/scoring";
import { t } from "../i18n";
import { BottomSheet } from "./BottomSheet";
import { kenney } from "./scenes/Sprite";

/** How long "Rätt!" stays before the next question comes by itself. */
export const CELEBRATION_MS = 2600;
const PRAISE = ["ui.praise.1", "ui.praise.2", "ui.praise.3", "ui.praise.4", "ui.praise.5"];
const CONFETTI = ["#f472b6", "#38bdf8", "#fbbf24", "#34d399", "#a78bfa"];

/**
 * "Rätt!" once a question is solved: the answer stays on the board above, and
 * at the bottom a frog hops, the stars pop in and confetti falls. The next
 * question comes on "Nästa" - or by itself after a moment.
 */
export function Celebration({ stars, xp, onNext }: { stars: Stars; xp: number; onNext: () => void }) {
  const praise = useMemo(() => PRAISE[Math.floor(Math.random() * PRAISE.length)], []);
  const confetti = useMemo(
    () => Array.from({ length: 18 }, (_, i) => ({ left: 4 + ((i * 53) % 92), delay: (i % 6) * 0.08, color: CONFETTI[i % CONFETTI.length], size: 7 + (i % 3) * 3 })),
    []
  );
  // The newest onNext, so a re-render of the round doesn't restart the wait.
  const next = useRef(onNext);
  next.current = onNext;
  useEffect(() => {
    const timer = setTimeout(() => next.current(), CELEBRATION_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="fixed inset-x-0 top-0 h-72 z-30 pointer-events-none overflow-hidden" aria-hidden>
        {confetti.map((c, i) => (
          <span key={i} className="anim-confetti absolute top-0 rounded-sm" style={{ left: `${c.left}%`, width: c.size, height: c.size * 1.6, background: c.color, animationDelay: `${c.delay}s` }} />
        ))}
      </div>
      <BottomSheet tone="success" label={t(praise)}>
        <div className="flex items-center gap-3">
          <img src={kenney("frog-jump")} alt="" className="w-14 h-14 anim-happy-hop shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-extrabold text-emerald-700">{t(praise)}</p>
            <p className="flex items-center gap-2">
              <span className="text-2xl tracking-wide" aria-label={`${stars} ★`}>
                {[1, 2, 3].map((n) => (
                  <span key={n} className={n <= stars ? "anim-star-pop inline-block text-amber-400" : "inline-block text-slate-300"} style={{ animationDelay: `${0.15 * n}s` }}>
                    ★
                  </span>
                ))}
              </span>
              <span className="text-sm font-bold text-amber-600">+{xp} XP</span>
            </p>
          </div>
          <button type="button" onClick={onNext} autoFocus className="h-12 px-5 rounded-xl bg-emerald-600 text-white font-bold shadow shrink-0">
            {t("ui.next")} →
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
