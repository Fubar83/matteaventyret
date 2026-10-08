import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactElement } from "react";
import type { ClockFaceStyle, ClockLook } from "../engine/clock";

const ROMAN = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

interface LookColors {
  face: string;
  rim: string;
  rimWidth: number;
  tick: string;
  numeral: string;
  font: string;
  hour: string;
  minute: string;
  hourWidth: number;
  minuteWidth: number;
  /** "pointy": tapering to a sharp point; "blunt": a bar with a flat end. Never a round end or a knob. */
  hands: "pointy" | "blunt";
  /** The cap over the middle, where the hands are fastened. */
  cap: string;
}

const LOOKS: Record<ClockLook, LookColors> = {
  classic: { face: "#ffffff", rim: "#1e293b", rimWidth: 5, tick: "#1e293b", numeral: "#0f172a", font: "Georgia, 'Times New Roman', serif", hour: "#0f172a", minute: "#0f172a", hourWidth: 11, minuteWidth: 8, hands: "pointy", cap: "#0f172a" },
  kids: { face: "#fef9c3", rim: "#38bdf8", rimWidth: 8, tick: "#0369a1", numeral: "#0c4a6e", font: "'Comic Sans MS', 'Trebuchet MS', sans-serif", hour: "#ef4444", minute: "#2563eb", hourWidth: 13, minuteWidth: 9, hands: "pointy", cap: "#0c4a6e" },
  modern: { face: "#f8fafc", rim: "#94a3b8", rimWidth: 2.5, tick: "#475569", numeral: "#334155", font: "system-ui, sans-serif", hour: "#334155", minute: "#0ea5e9", hourWidth: 6, minuteWidth: 4, hands: "blunt", cap: "#334155" },
  station: { face: "#ffffff", rim: "#0f172a", rimWidth: 7, tick: "#0f172a", numeral: "#0f172a", font: "Helvetica, Arial, sans-serif", hour: "#0f172a", minute: "#0f172a", hourWidth: 9, minuteWidth: 7, hands: "blunt", cap: "#dc2626" },
};

/** A point at `r` from the middle, `deg` clockwise from 12. */
const at = (deg: number, r: number): [number, number] => [r * Math.sin((deg * Math.PI) / 180), -r * Math.cos((deg * Math.PI) / 180)];

export interface ClockFaceProps {
  face: ClockFaceStyle;
  /** Degrees clockwise from 12. */
  hourDeg: number;
  minuteDeg: number;
  size?: number;
  /** Draggable hands: each reports its new angle, already snapped. */
  interactive?: {
    onHour: (deg: number) => void;
    onMinute: (deg: number) => void;
    /** Minutes between the places the minute hand stops: 1 or 5. */
    snapMinutes: number;
    /** Degrees between the places the hour hand stops: 15 (whole and half hours) for beginners, 2,5 (every five minutes) later. */
    hourSnapDeg?: number;
    /** Ring a hand to show it's the one to look at. */
    mark?: "hour" | "minute" | null;
  };
  label?: string;
}

/**
 * An analog clock in one of several looks - numbers or Roman numerals, only
 * 12-3-6-9, or none; ticks for every minute, every hour, or none. With
 * `interactive`, the hands can be dragged (or turned with the arrow keys):
 * the minute hand snaps to whole minutes (or fives), the hour hand to every
 * 2,5° - the five-minute steps it takes between two numbers.
 */
export function ClockFace({ face, hourDeg, minuteDeg, size = 260, interactive, label }: ClockFaceProps) {
  const look = LOOKS[face.look];
  const svg = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<"hour" | "minute" | null>(null);

  const snap = (hand: "hour" | "minute", deg: number) => {
    const step = hand === "minute" ? 6 * (interactive?.snapMinutes ?? 1) : (interactive?.hourSnapDeg ?? 2.5);
    return (((Math.round(deg / step) * step) % 360) + 360) % 360;
  };
  const report = (hand: "hour" | "minute", deg: number) => (hand === "hour" ? interactive?.onHour(snap("hour", deg)) : interactive?.onMinute(snap("minute", deg)));

  /** The pointer's direction from the middle, in degrees clockwise from 12. */
  function angleOf(e: PointerEvent): number {
    const r = svg.current!.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    return ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
  }

  function down(hand: "hour" | "minute", e: PointerEvent) {
    if (!interactive) return;
    e.preventDefault();
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // No capture (an old browser, a synthetic event): the drag still follows the pointer over the clock.
    }
    setDragging(hand);
  }
  function move(e: PointerEvent) {
    if (!interactive || !dragging) return;
    report(dragging, angleOf(e));
  }
  function key(hand: "hour" | "minute", e: KeyboardEvent) {
    if (!interactive) return;
    const step = hand === "minute" ? 6 * interactive.snapMinutes : (interactive.hourSnapDeg ?? 2.5);
    const now = hand === "minute" ? minuteDeg : hourDeg;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") report(hand, now + step);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") report(hand, now - step);
    else return;
    e.preventDefault();
  }

  const ticks: ReactElement[] = [];
  if (face.ticks !== "none") {
    for (let i = 0; i < 60; i++) {
      const hourTick = i % 5 === 0;
      if (!hourTick && face.ticks === "hours") continue;
      const deg = i * 6;
      if (face.look === "modern" && hourTick) {
        const [x, y] = at(deg, 88);
        ticks.push(<circle key={i} cx={x} cy={y} r={3.2} fill={look.tick} />);
        continue;
      }
      const inner = hourTick ? (face.look === "station" ? (face.numerals === "none" ? 74 : 81) : 82) : 88;
      const [x1, y1] = at(deg, inner);
      const [x2, y2] = at(deg, 93);
      ticks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={look.tick} strokeWidth={hourTick ? (face.look === "station" ? 6 : 3.5) : 1.5} />);
    }
  }

  const numerals: ReactElement[] = [];
  if (face.numerals !== "none") {
    for (let n = 1; n <= 12; n++) {
      if (face.numerals === "quarters" && n % 3 !== 0) continue;
      const text = face.numerals === "roman" ? ROMAN[n % 12] : String(n);
      const r = face.ticks === "none" ? 80 : face.look === "station" ? 63 : face.numerals === "roman" ? 66 : 68;
      const [x, y] = at(n * 30, r);
      numerals.push(
        <text key={n} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={face.numerals === "roman" ? 15 : 19} fontWeight={face.look === "kids" ? 700 : 600} fill={look.numeral} fontFamily={look.font}>
          {text}
        </text>
      );
    }
  }

  const hand = (which: "hour" | "minute", deg: number) => {
    const length = which === "hour" ? 46 : 74;
    const width = which === "hour" ? look.hourWidth : look.minuteWidth;
    const color = which === "hour" ? look.hour : look.minute;
    const [x, y] = at(deg, length);
    const tail = look.hands === "blunt" ? 14 : 10;
    // The hand's outline: from its short tail behind the middle out to the tip - a point, or a flat end.
    const across = (r: number, half: number): [number, number][] => {
      const [cx, cy] = at(deg, r);
      const [px, py] = at(deg + 90, half);
      return [
        [cx - px, cy - py],
        [cx + px, cy + py],
      ];
    };
    let outline: [number, number][];
    if (look.hands === "blunt") {
      const [tailL, tailR] = across(-tail, width / 2);
      outline = [tailL, tailR, ...across(length, width / 2).reverse()];
    } else {
      // A lance: a slim tail, widest at the middle, tapering all the way out to a sharp point.
      const [tailL, tailR] = across(-tail, width * 0.22);
      const [midL, midR] = across(0, width / 2);
      const [neckL, neckR] = across(length * 0.7, width * 0.3);
      outline = [tailL, midL, neckL, [x, y], neckR, midR, tailR];
    }
    const points = outline.map(([px, py]) => `${px.toFixed(2)},${py.toFixed(2)}`).join(" ");
    const marked = interactive?.mark === which;
    const name = which === "hour" ? "Timvisaren" : "Minutvisaren";
    return (
      <g
        key={which}
        role={interactive ? "slider" : undefined}
        aria-label={interactive ? name : undefined}
        aria-valuenow={interactive ? Math.round(which === "hour" ? deg / 30 : deg / 6) : undefined}
        tabIndex={interactive ? 0 : undefined}
        onPointerDown={(e) => down(which, e)}
        onKeyDown={(e) => key(which, e)}
        style={{ cursor: interactive ? (dragging === which ? "grabbing" : "grab") : undefined, touchAction: "none", outline: "none" }}
      >
        {marked && <polygon points={points} fill="none" stroke="#fbbf24" strokeWidth={9} strokeLinejoin="round" opacity={0.7} />}
        <polygon points={points} fill={color} stroke={color} strokeWidth={0.8} strokeLinejoin="miter" />
        {/* A wide invisible strip over the hand, so the whole of it is easy to catch with a finger. */}
        {interactive && <line x1={0} y1={0} x2={x} y2={y} stroke="transparent" strokeWidth={30} />}
      </g>
    );
  };

  return (
    <svg
      ref={svg}
      viewBox="-100 -100 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={label}
      onPointerMove={move}
      onPointerUp={() => setDragging(null)}
      onPointerCancel={() => setDragging(null)}
      style={{ touchAction: interactive ? "none" : undefined, maxWidth: "100%", height: "auto" }}
    >
      <circle cx={0} cy={0} r={96} fill={look.face} stroke={look.rim} strokeWidth={look.rimWidth} />
      {ticks}
      {numerals}
      {/* The hand being dragged on top, so it never hides under the other. */}
      {dragging === "hour" ? [hand("minute", minuteDeg), hand("hour", hourDeg)] : [hand("hour", hourDeg), hand("minute", minuteDeg)]}
      {/* The cap over the middle, where both hands are fastened: a ring with a light centre. */}
      <circle cx={0} cy={0} r={8} fill={look.cap} />
      <circle cx={0} cy={0} r={3.2} fill={look.face} />
    </svg>
  );
}
