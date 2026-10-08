import { useEffect, type RefObject } from "react";

/**
 * Stops the browser from scrolling, zooming or long-pressing while a finger
 * draws (or drags a clock hand) on `ref`'s element. CSS touch-action: none
 * should do that alone, but iOS Safari doesn't reliably honour it on an
 * <svg> or a <canvas> in a scrolling page: it takes the finger for a scroll
 * and cancels the pointer after the first point, so nothing gets drawn.
 * Cancelling the touch events themselves works everywhere - in native
 * listeners, as React's own touch listeners are passive and can't cancel -
 * and the pointer events the drawing runs on keep coming.
 */
export function useBlockTouchGestures(ref: RefObject<Element | null>, enabled = true) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const block = (e: Event) => {
      if (e.cancelable) e.preventDefault();
    };
    el.addEventListener("touchstart", block, { passive: false });
    el.addEventListener("touchmove", block, { passive: false });
    return () => {
      el.removeEventListener("touchstart", block);
      el.removeEventListener("touchmove", block);
    };
  }, [ref, enabled]);
}
