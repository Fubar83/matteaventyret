import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * A card fixed to the bottom of the screen - always in view, even on a phone
 * where the board fills the screen and what's under it would need scrolling.
 * For what the child must answer right now: "Menade du?", which way to write
 * the comma, and "Rätt!" before the next question. Rendered into <body> so no
 * transformed ancestor can pull it out of place. While it's open the page gets
 * that much room at the bottom, so nothing is left hidden under it.
 */
export function BottomSheet({ children, tone = "plain", label }: { children: ReactNode; tone?: "plain" | "success"; label?: string }) {
  const sheet = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = sheet.current;
    if (!el) return;
    const before = document.body.style.paddingBottom;
    const fit = () => (document.body.style.paddingBottom = `${el.offsetHeight + 16}px`);
    fit();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    observer?.observe(el);
    return () => {
      observer?.disconnect();
      document.body.style.paddingBottom = before;
    };
  }, []);

  return createPortal(
    <div ref={sheet} className="fixed inset-x-0 bottom-0 z-40 flex justify-center pointer-events-none px-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
      <div
        role="dialog"
        aria-label={label}
        className={`anim-sheet-up pointer-events-auto w-full max-w-md rounded-2xl border-2 shadow-xl px-4 py-3 ${tone === "success" ? "bg-emerald-50 border-emerald-300" : "bg-white border-violet-300"}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
