import { useMemo, type ReactNode } from "react";
import { t } from "../../../i18n";

/** The sky's colours (top, horizon) through a day; between these hours they blend. */
const SKY: [number, string, string][] = [
  [0, "#0b1026", "#1b2550"],
  [4.5, "#141c48", "#3b3f7a"],
  [6, "#4c4a8a", "#f8a07a"],
  [7.5, "#7cc4f0", "#fde2b8"],
  [10, "#4fb3f0", "#c8ecff"],
  [14, "#3aa7ee", "#bfe6ff"],
  [17, "#5a9ee0", "#ffd59a"],
  [19, "#6b4fa3", "#ff8c5a"],
  [20.5, "#2a2a66", "#6b4a8a"],
  [22, "#0f1638", "#26306a"],
  [24, "#0b1026", "#1b2550"],
];

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a: string, b: string, f: number) => {
  const [x, y] = [rgb(a), rgb(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * f)).join(",")})`;
};

function skyAt(hour: number): [string, string] {
  const h = ((hour % 24) + 24) % 24;
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, top0, bottom0] = SKY[i];
    const [h1, top1, bottom1] = SKY[i + 1];
    if (h >= h0 && h <= h1) {
      const f = (h - h0) / (h1 - h0);
      return [mix(top0, top1, f), mix(bottom0, bottom1, f)];
    }
  }
  return [SKY[0][1], SKY[0][2]];
}

/** How much daylight there is, 0 (night) to 1 (day): dawn 5-7,5, dusk 18-20,5. */
function daylight(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  if (h < 5 || h > 20.5) return 0;
  if (h < 7.5) return (h - 5) / 2.5;
  if (h > 18) return 1 - (h - 18) / 2.5;
  return 1;
}

const W = 400;
const HORIZON = 200;

/** A point on the sun's (or the moon's) path: up from the left at 6, highest at 12, down on the right at 18. */
function arc(t: number): { x: number; y: number } {
  return { x: 30 + 340 * t, y: HORIZON + 10 - Math.sin(Math.PI * t) * 165 };
}

/** The part of the day an hour is in, for the badge in the corner. */
function partOfDay(hour: number): { icon: string; key: string } {
  const h = ((hour % 24) + 24) % 24;
  if (h < 5) return { icon: "🌙", key: "sky.night" };
  if (h < 9) return { icon: "🌅", key: "sky.morning" };
  if (h < 12) return { icon: "☀️", key: "sky.forenoon" };
  if (h < 13) return { icon: "☀️", key: "sky.noon" };
  if (h < 18) return { icon: "🌤️", key: "sky.afternoon" };
  if (h < 22) return { icon: "🌇", key: "sky.evening" };
  return { icon: "🌙", key: "sky.night" };
}

/**
 * A landscape under a sky that follows the clock: the sun rising on the
 * left, high at noon, setting behind the hills on the right; then the moon
 * and the stars. Clouds drift, the cottage's windows light up at night. The
 * clock (children) stands in front.
 */
export function SkyScene({ hour, children, height = 360 }: { hour: number; children: ReactNode; height?: number }) {
  const [top, bottom] = skyAt(hour);
  const day = daylight(hour);
  const h = ((hour % 24) + 24) % 24;
  const sun = h > 5.3 && h < 18.7 ? arc((h - 6) / 12) : null;
  const moonT = (((h - 18 + 24) % 24) / 12);
  const moon = moonT >= -0.05 && moonT <= 1.05 && day < 0.9 ? arc(moonT) : null;
  const part = partOfDay(hour);
  // The stars stay put between renders.
  const stars = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ x: (i * 97) % W, y: (i * 53) % (HORIZON - 40), r: 0.6 + ((i * 7) % 5) * 0.25, delay: (i % 7) * 0.4 })), []);
  const hillBack = mix("#1e3a2b", "#86c96b", day);
  const hillFront = mix("#14281e", "#5fae4e", day);
  const cloud = mix("#3b4373", "#ffffff", day);

  return (
    <div className="relative w-full max-w-xl overflow-hidden rounded-3xl shadow-lg border-4 border-white" style={{ height }}>
      <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${W} 300`} preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={top} />
            <stop offset="0.75" stopColor={bottom} />
          </linearGradient>
          <radialGradient id="sunGlow">
            <stop offset="0" stopColor="#fff7c2" stopOpacity="0.9" />
            <stop offset="1" stopColor="#fde047" stopOpacity="0" />
          </radialGradient>
          <mask id="crescent" maskUnits="userSpaceOnUse" x="-20" y="-20" width="40" height="40">
            <circle r={15} fill="white" />
            <circle cx={8} cy={-5} r={13} fill="black" />
          </mask>
          <radialGradient id="moonGlow">
            <stop offset="0" stopColor="#e0e7ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#e0e7ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={W} height={300} fill="url(#sky)" style={{ transition: "fill 0.6s" }} />

        {/* Stars, at night. */}
        <g opacity={1 - day}>
          {stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" className="anim-twinkle" style={{ animationDelay: `${s.delay}s` }} />
          ))}
        </g>

        {/* The sun: a glow, slowly turning rays, the disc. */}
        {sun && (
          <g style={{ transform: `translate(${sun.x}px, ${sun.y}px)`, transition: "transform 0.35s ease-out" }}>
            <circle r={44} fill="url(#sunGlow)" />
            <g className="anim-spin-slow">
              {Array.from({ length: 12 }, (_, i) => (
                <rect key={i} x={-2} y={-34} width={4} height={10} rx={2} fill="#fcd34d" transform={`rotate(${i * 30})`} />
              ))}
            </g>
            <circle r={19} fill="#fde047" stroke="#f59e0b" strokeWidth={2} />
          </g>
        )}

        {/* The moon: a glow, and a crescent - the disc with a bite taken out of it (a mask, so the sky shows through). */}
        {moon && (
          <g style={{ transform: `translate(${moon.x}px, ${moon.y}px)`, transition: "transform 0.35s ease-out" }} opacity={1 - day * 0.8}>
            <circle r={36} fill="url(#moonGlow)" />
            <g mask="url(#crescent)">
              <circle r={15} fill="#f8fafc" />
              <circle cx={-6} cy={4} r={2.4} fill="#cbd5e1" />
              <circle cx={-3} cy={-6} r={1.6} fill="#cbd5e1" />
            </g>
          </g>
        )}

        {/* Clouds drifting across, each at its own speed. */}
        {[
          { y: 40, s: 1, dur: 70, delay: -10 },
          { y: 85, s: 0.75, dur: 95, delay: -60 },
          { y: 25, s: 0.6, dur: 120, delay: -30 },
        ].map((c, i) => (
          <g key={i} className="anim-drift" style={{ animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}>
            <g transform={`translate(0 ${c.y}) scale(${c.s})`} fill={cloud} opacity={0.55 + day * 0.4}>
              <ellipse cx={40} cy={20} rx={34} ry={14} />
              <ellipse cx={22} cy={14} rx={18} ry={14} />
              <ellipse cx={50} cy={8} rx={20} ry={16} />
              <ellipse cx={66} cy={18} rx={16} ry={11} />
            </g>
          </g>
        ))}

        {/* Birds, in daytime. */}
        {day > 0.6 && (
          <g fill="none" stroke="#334155" strokeWidth={1.6} strokeLinecap="round" opacity={0.6}>
            <path d="M300 70 q5 -5 10 0 q5 -5 10 0" />
            <path d="M325 58 q4 -4 8 0 q4 -4 8 0" />
          </g>
        )}

        {/* The hills, a cottage and some trees - darker at night. */}
        <path d={`M0 ${HORIZON} Q 90 150 200 190 T ${W} 175 V 300 H 0 Z`} fill={hillBack} />
        <g transform="translate(300 160)">
          <rect x={-14} y={0} width={28} height={22} fill={mix("#4b3a2a", "#fef3c7", day)} />
          <path d="M-18 2 L0 -14 L18 2 Z" fill={mix("#4c1d1d", "#dc2626", day)} />
          <rect x={-9} y={6} width={7} height={7} fill={day < 0.5 ? "#fde047" : "#7dd3fc"} />
          <rect x={3} y={6} width={7} height={7} fill={day < 0.5 ? "#fde047" : "#7dd3fc"} />
        </g>
        {[60, 95, 350].map((x, i) => (
          <g key={x} transform={`translate(${x} ${i === 2 ? 178 : 175})`}>
            <rect x={-2} y={0} width={4} height={14} fill={mix("#2b1d12", "#7c4a1e", day)} />
            <circle cy={-4} r={11} fill={mix("#10261a", "#3f9a45", day)} />
          </g>
        ))}
        <path d={`M0 250 Q 120 215 220 240 T ${W} 230 V 300 H 0 Z`} fill={hillFront} />
      </svg>

      <div className="absolute top-2 left-3 rounded-full bg-white/80 backdrop-blur px-3 py-1 text-sm font-semibold text-slate-700 shadow">
        {part.icon} {t(part.key)}
      </div>
      <div className="relative h-full flex items-center justify-center">{children}</div>
    </div>
  );
}
