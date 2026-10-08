import type { DigitalLook } from "../engine/clock";

/** Which of the seven segments (a top, b top right, c bottom right, d bottom, e bottom left, f top left, g middle) each digit lights. */
const SEGMENTS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abged",
  "3": "abgcd",
  "4": "fgbc",
  "5": "afgcd",
  "6": "afgedc",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
};

const W = 48; // a digit's cell
const H = 84;
const T = 9; // segment thickness
const GAP = 1.6;

/** The seven segments of one digit cell, as polygons - each a long hexagon, pointed at both ends. */
function segmentPolygons(): Record<string, string> {
  const m = T / 2 + 1;
  const [left, right, top, mid, bottom] = [m, W - m, m, H / 2, H - m];
  const across = (y: number, x0: number, x1: number) =>
    [
      [x0, y],
      [x0 + T / 2, y - T / 2],
      [x1 - T / 2, y - T / 2],
      [x1, y],
      [x1 - T / 2, y + T / 2],
      [x0 + T / 2, y + T / 2],
    ] as const;
  const down = (x: number, y0: number, y1: number) =>
    [
      [x, y0],
      [x + T / 2, y0 + T / 2],
      [x + T / 2, y1 - T / 2],
      [x, y1],
      [x - T / 2, y1 - T / 2],
      [x - T / 2, y0 + T / 2],
    ] as const;
  const pts = (p: readonly (readonly [number, number])[]) => p.map(([x, y]) => `${x},${y}`).join(" ");
  return {
    a: pts(across(top, left + GAP, right - GAP)),
    b: pts(down(right, top + GAP, mid - GAP)),
    c: pts(down(right, mid + GAP, bottom - GAP)),
    d: pts(across(bottom, left + GAP, right - GAP)),
    e: pts(down(left, mid + GAP, bottom - GAP)),
    f: pts(down(left, top + GAP, mid - GAP)),
    g: pts(across(mid, left + GAP, right - GAP)),
  };
}
const POLYGONS = segmentPolygons();

const SEGMENT_LOOKS = {
  ledRed: { screen: "#0a0a0a", frame: "#262626", on: "#ff2d2d", off: "rgba(255,45,45,0.07)", glow: "rgba(255,40,40,0.75)" },
  ledGreen: { screen: "#03110a", frame: "#1f2937", on: "#3dff7a", off: "rgba(61,255,122,0.07)", glow: "rgba(61,255,122,0.6)" },
  lcd: { screen: "#c5d1ad", frame: "#9ca3af", on: "#1b2414", off: "rgba(27,36,20,0.07)", glow: "" },
} as const;

/** Seven-segment digits - an LED alarm clock's or an LCD's: a blank instead of a leading zero, the unlit segments just visible. */
function SegmentDisplay({ h, m, look, width }: { h: number; m: number; look: "ledRed" | "ledGreen" | "lcd"; width: number }) {
  const c = SEGMENT_LOOKS[look];
  const digits = [h < 10 ? " " : String(h)[0], String(h % 10), String(Math.floor(m / 10)), String(m % 10)];
  const COLON = 22;
  const STEP = W + 10;
  const total = 4 * STEP + COLON;
  const x = (i: number) => i * STEP + (i >= 2 ? COLON : 0);
  return (
    <div
      className="rounded-2xl p-3 shadow-lg"
      style={{ width, background: c.frame, boxShadow: look === "lcd" ? "inset 0 2px 6px rgba(0,0,0,0.25)" : undefined }}
    >
      <div className="rounded-lg px-3 py-3" style={{ background: c.screen, boxShadow: "inset 0 3px 10px rgba(0,0,0,0.35)" }}>
        <svg viewBox={`-6 -6 ${total + 12} ${H + 12}`} width="100%" role="img" aria-label={`${h}:${String(m).padStart(2, "0")}`}>
          <g transform="skewX(-6)" style={c.glow ? { filter: `drop-shadow(0 0 4px ${c.glow})` } : undefined}>
            {digits.map((d, i) => (
              <g key={i} transform={`translate(${x(i) + 8},0)`}>
                {Object.entries(POLYGONS).map(([seg, points]) => (
                  <polygon key={seg} points={points} fill={d !== " " && SEGMENTS[d].includes(seg) ? c.on : c.off} />
                ))}
              </g>
            ))}
            <circle cx={2 * STEP + COLON / 2 + 4} cy={H * 0.32} r={4.5} fill={c.on} />
            <circle cx={2 * STEP + COLON / 2 + 2} cy={H * 0.68} r={4.5} fill={c.on} />
          </g>
        </svg>
      </div>
    </div>
  );
}

/** A flip clock: hours and minutes on two cards, split across the middle. */
function FlipDisplay({ h, m, width }: { h: number; m: number; width: number }) {
  const card = (text: string) => (
    <div
      className="relative flex-1 rounded-xl flex items-center justify-center font-black text-white overflow-hidden"
      style={{ background: "linear-gradient(#2b2b30 0%, #2b2b30 49.5%, #1c1c20 50.5%, #1c1c20 100%)", fontSize: width / 3.6, height: width / 2.4, fontFamily: "Helvetica, Arial, sans-serif", letterSpacing: "0.02em" }}
    >
      {text}
      <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-black/70" />
      <span className="absolute left-0 top-1/2 w-1.5 h-3 -translate-y-1/2 bg-neutral-600 rounded-r" />
      <span className="absolute right-0 top-1/2 w-1.5 h-3 -translate-y-1/2 bg-neutral-600 rounded-l" />
    </div>
  );
  return (
    <div className="rounded-2xl bg-neutral-800 p-2 flex gap-2 shadow-lg" style={{ width }} role="img" aria-label={`${h}:${String(m).padStart(2, "0")}`}>
      {card(String(h).padStart(2, "0"))}
      {card(String(m).padStart(2, "0"))}
    </div>
  );
}

/** A phone's lock screen: big thin digits on a dark gradient. */
function PhoneDisplay({ h, m, width }: { h: number; m: number; width: number }) {
  const text = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return (
    <div
      className="rounded-[1.75rem] border-4 border-neutral-800 shadow-lg flex flex-col items-center justify-center text-white"
      style={{ width, height: width * 0.62, background: "linear-gradient(160deg, #312e81, #6d28d9 55%, #db2777)" }}
      role="img"
      aria-label={text}
    >
      <span className="text-xs opacity-80" aria-hidden>
        🔒
      </span>
      <span style={{ fontSize: width / 4.2, fontWeight: 300, fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", letterSpacing: "0.02em", lineHeight: 1.1 }}>{text}</span>
    </div>
  );
}

/** A digital clock showing h:m (24-hour) the way one of the common kinds looks. */
export function DigitalClock({ h, m, look = "ledRed", size = 220 }: { h: number; m: number; look?: DigitalLook; size?: number }) {
  if (look === "flip") return <FlipDisplay h={h} m={m} width={size} />;
  if (look === "phone") return <PhoneDisplay h={h} m={m} width={size} />;
  return <SegmentDisplay h={h} m={m} look={look} width={size} />;
}
