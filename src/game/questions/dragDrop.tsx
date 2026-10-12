import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

/**
 * Drag and drop for the questions where things are moved - sorting, pairs,
 * blocks - with a finger, a mouse or a pen. Taps still work as before: a
 * press that doesn't move is a tap, and the question's click handlers take
 * it. A drag follows the pointer with a copy of the thing and drops it on the
 * element under it that has `data-drop` (and says which with its value).
 *
 *   const dnd = useDragDrop((item, target) => …);
 *   <button {...dnd.handle("3")} onClick={…}>…</button>   // drag thing "3"
 *   <div data-drop="group-1" className={dnd.over === "group-1" ? … : …}>
 *   {dnd.ghost}
 */
export function useDragDrop(onDrop: (item: string, target: string) => void) {
  const [drag, setDrag] = useState<{ item: string; x: number; y: number; dx: number; dy: number; w: number; html: string } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const start = useRef<{ item: string; x: number; y: number; el: HTMLElement } | null>(null);
  // A drag that ended swallows the click that follows it - it was a move, not a tap.
  const suppressClick = useRef(false);
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;

  useEffect(() => {
    const targetAt = (x: number, y: number) => (document.elementFromPoint?.(x, y)?.closest("[data-drop]") as HTMLElement | null)?.dataset.drop ?? null;
    const move = (e: PointerEvent) => {
      const s = start.current;
      if (!s) return;
      if (!drag && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 8) return;
      const box = s.el.getBoundingClientRect();
      setDrag((d) => d ?? { item: s.item, x: e.clientX, y: e.clientY, dx: s.x - box.left, dy: s.y - box.top, w: box.width, html: s.el.innerHTML });
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
      setOver(targetAt(e.clientX, e.clientY));
    };
    const up = (e: PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (s && drag) {
        suppressClick.current = true;
        const target = targetAt(e.clientX, e.clientY);
        if (target !== null) dropRef.current(drag.item, target);
      }
      setDrag(null);
      setOver(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag]);

  /** What a draggable thing spreads on its element. */
  const handle = (item: string) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      start.current = { item, x: e.clientX, y: e.clientY, el: e.currentTarget };
    },
    onClickCapture: (e: ReactMouseEvent) => {
      if (suppressClick.current) {
        suppressClick.current = false;
        e.stopPropagation();
        e.preventDefault();
      }
    },
    style: { touchAction: "none" as const, cursor: "grab" },
    "data-dragging": drag?.item === item ? "true" : undefined,
  });

  const ghost: ReactNode = drag ? (
    <div
      aria-hidden
      className="fixed z-50 pointer-events-none opacity-90 scale-110 rounded-xl shadow-2xl bg-white border-2 border-amber-400 flex items-center justify-center"
      style={{ left: drag.x - drag.dx, top: drag.y - drag.dy, width: drag.w, minHeight: 48 }}
      dangerouslySetInnerHTML={{ __html: drag.html }}
    />
  ) : null;

  return { handle, over, dragging: drag?.item ?? null, ghost };
}

/**
 * A thing in a picture that follows the finger while it's pressed - a number
 * line's marker, a protractor's arm, a triangle's corner. Spread the result on
 * the <svg>; `onPoint` gets each position in the picture's own coordinates (its
 * viewBox, `width` × `height`). A tap is a press without a move, so it works too.
 */
export function useDragPoint(width: number, height: number, onPoint: (x: number, y: number) => void, enabled = true) {
  const down = useRef(false);
  const at = (e: ReactPointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    onPoint(((e.clientX - box.left) / box.width) * width, ((e.clientY - box.top) / box.height) * height);
  };
  return {
    onPointerDown: (e: ReactPointerEvent<SVGSVGElement>) => {
      if (!enabled) return;
      down.current = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      at(e);
    },
    onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => {
      if (enabled && down.current) at(e);
    },
    onPointerUp: () => {
      down.current = false;
    },
    onPointerCancel: () => {
      down.current = false;
    },
    style: { touchAction: "none" as const },
  };
}
