import { templateFor } from "../recognition/strokeTemplates";

/** Seconds each stroke takes to draw, and the pause before the next. */
const STROKE_SECONDS = 0.9;
const PAUSE_SECONDS = 0.35;
/** The finished character stays this long before it's drawn again. */
const HOLD_SECONDS = 1.2;

interface StrokeOrderDemoProps {
  char: string;
  /** Height in px (the character's box is 3:5). */
  size?: number;
}

/**
 * A character drawn the way it's taught, over and over: each stroke in turn,
 * a numbered dot where the pen goes down. Shown when a child wrote one
 * another way, and in Skrivskolan. Nothing for a character without a
 * template (strokeTemplates.ts).
 */
export function StrokeOrderDemo({ char, size = 80 }: StrokeOrderDemoProps) {
  const strokes = templateFor(char);
  if (!strokes) return null;
  const W = 60;
  const H = 100;
  const pad = 14;
  const toPath = (s: readonly { x: number; y: number }[]) => s.map((p, i) => `${i === 0 ? "M" : "L"}${(pad + p.x * (W - 2 * pad)).toFixed(1)},${(pad + p.y * (H - 2 * pad)).toFixed(1)}`).join(" ");
  const cycle = strokes.length * (STROKE_SECONDS + PAUSE_SECONDS) + HOLD_SECONDS;
  // Each stroke's share of the cycle: hidden until its turn, drawn during it, then kept to the end.
  const keyframes = strokes
    .map((_, k) => {
      const start = ((k * (STROKE_SECONDS + PAUSE_SECONDS)) / cycle) * 100;
      const end = (((k * (STROKE_SECONDS + PAUSE_SECONDS) + STROKE_SECONDS) / cycle) * 100).toFixed(2);
      return `@keyframes draw-${k} { 0%, ${start.toFixed(2)}% { stroke-dashoffset: 1; } ${end}%, 100% { stroke-dashoffset: 0; } }
@keyframes dot-${k} { 0%, ${Math.max(0, start - 0.01).toFixed(2)}% { opacity: 0; } ${start.toFixed(2)}%, 100% { opacity: 1; } }`;
    })
    .join("\n");
  return (
    <svg width={(size * W) / H} height={size} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={char} className="shrink-0">
      <style>{keyframes}</style>
      <rect x={1} y={1} width={W - 2} height={H - 2} rx={8} className="fill-white stroke-slate-200" strokeWidth={1.5} />
      {strokes.map((s, k) => (
        <path key={`ghost-${k}`} d={toPath(s)} className="stroke-slate-200" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {strokes.map((s, k) => (
        <path
          key={`ink-${k}`}
          d={toPath(s)}
          pathLength={1}
          className="stroke-sky-600"
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ strokeDasharray: 1, animation: `draw-${k} ${cycle}s linear infinite` }}
        />
      ))}
      {strokes.map((s, k) => {
        const x = pad + s[0].x * (W - 2 * pad);
        const y = pad + s[0].y * (H - 2 * pad);
        return (
          <g key={`dot-${k}`} style={{ animation: `dot-${k} ${cycle}s linear infinite` }}>
            <circle cx={x} cy={y} r={6} className="fill-amber-400" />
            <text x={x} y={y + 3.5} textAnchor="middle" fontSize={9} fontWeight={700} className="fill-white">
              {k + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
