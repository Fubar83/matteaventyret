import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import type { DigitalLook } from "../../../engine/questions/clock";
import { t } from "../../../i18n";
import { useBlockTouchGestures } from "../../../mathinput/blockTouchGestures";
import { DigitalClock } from "./DigitalClock";

/** How far a finger moves (px) for the number to turn one step. */
const DRAG_STEP = 22;

type Part = "hours" | "minutes";

/**
 * A digital clock to set: the hours and the minutes each turn like a wheel -
 * drag up or down on them, tap the arrows above and below, or use the arrow
 * keys. Hours go round 0-23, minutes 0-59 in `minuteStep`s.
 */
export function DigitalClockSetter({
  h,
  m,
  onChange,
  minuteStep = 1,
  look = "ledRed",
  size = 260,
  disabled = false,
  mark = null,
}: {
  h: number;
  m: number;
  onChange: (h: number, m: number) => void;
  minuteStep?: number;
  look?: DigitalLook;
  size?: number;
  disabled?: boolean;
  /** A part to point out - the one that's wrong. */
  mark?: Part | null;
}) {
  const area = useRef<HTMLDivElement>(null);
  useBlockTouchGestures(area, !disabled);
  const drag = useRef<{ part: Part; startY: number; h: number; m: number } | null>(null);

  const turn = (part: Part, steps: number, from = { h, m }) => {
    if (part === "hours") onChange((((from.h + steps) % 24) + 24) % 24, from.m);
    else onChange(from.h, (((from.m + steps * minuteStep) % 60) + 60) % 60);
  };

  function down(part: Part, e: PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // A stale pointer can throw; the drag then just ends at the edge.
    }
    drag.current = { part, startY: e.clientY, h, m };
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    // Up turns the number up, like pushing a wheel.
    const steps = Math.round((d.startY - e.clientY) / DRAG_STEP);
    turn(d.part, steps, d);
  }
  function up() {
    drag.current = null;
  }
  function key(part: Part, e: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    if (e.key === "ArrowUp") turn(part, 1);
    else if (e.key === "ArrowDown") turn(part, -1);
    else return;
    e.preventDefault();
  }

  const arrows = (dir: 1 | -1) => (
    <div className="flex justify-around" style={{ width: size }}>
      {(["hours", "minutes"] as const).map((part) => (
        <button
          key={part}
          type="button"
          disabled={disabled}
          onClick={() => turn(part, dir)}
          aria-label={`${t(part === "hours" ? "clock.hours" : "clock.minutes")} ${t(dir === 1 ? "clock.up" : "clock.down")}`}
          className="w-20 h-11 rounded-xl bg-white border-2 border-slate-200 text-xl text-slate-600 shadow-sm active:translate-y-0.5 disabled:opacity-40"
        >
          {dir === 1 ? "▲" : "▼"}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-2">
      {arrows(1)}
      <div ref={area} className="relative touch-none select-none" style={{ width: size }}>
        <DigitalClock h={h} m={m} look={look} size={size} />
        {(["hours", "minutes"] as const).map((part, i) => (
          <div
            key={part}
            role="spinbutton"
            tabIndex={disabled ? -1 : 0}
            aria-label={t(part === "hours" ? "clock.hours" : "clock.minutes")}
            aria-valuenow={part === "hours" ? h : m}
            aria-valuemin={0}
            aria-valuemax={part === "hours" ? 23 : 59}
            onPointerDown={(e) => down(part, e)}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onKeyDown={(e) => key(part, e)}
            className={`absolute top-0 bottom-0 rounded-2xl outline-none ${disabled ? "" : "cursor-ns-resize"} ${mark === part ? "ring-4 ring-rose-400" : "focus-visible:ring-4 focus-visible:ring-sky-400"}`}
            style={{ left: i === 0 ? 0 : "50%", width: "50%" }}
          />
        ))}
      </div>
      {arrows(-1)}
    </div>
  );
}
