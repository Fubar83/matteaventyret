import { useEffect, useState } from "react";
import type { Animal, ChanceColor, GroupThing, PatternItem, ShelfThing } from "../../engine/questions/scene";
import { t } from "../../i18n";
import { SpriteImage } from "./Sprite";

/**
 * Pictures for förskoleklass: things to count, a queue to the flag, a
 * pattern to go on with, a shelf to say where things are, ribbons to
 * compare and a balance. Nothing in them gives the answer away - no numbers
 * on the things, no places in the queue.
 */

const INK = "#334155";
const COLOR: Record<ChanceColor, string> = { red: "#ef4444", blue: "#3b82f6", yellow: "#facc15", green: "#22c55e" };

const GROUP_EMOJI: Record<GroupThing, string> = { cookies: "🍪", eggs: "🥚", apples: "🍎", fish: "🐟", flowers: "🌸", stars: "⭐" };
export const THING_EMOJI: Record<ShelfThing, string> = {
  ball: "⚽",
  teddy: "🧸",
  book: "📘",
  cup: "☕",
  car: "🚗",
  plant: "🪴",
  clock: "⏰",
  apple: "🍎",
  feather: "🪶",
  melon: "🍉",
};

/** Things in rows of five, like a ten-frame - easy to count, not arranged to be read at a glance. */
function Things({ thing, n, small }: { thing: GroupThing; n: number; small: boolean }) {
  return (
    <div
      className={`grid justify-center ${small ? "gap-0.5 text-xl" : "gap-1.5 text-4xl"}`}
      style={{ gridTemplateColumns: `repeat(${Math.min(n, 5)}, auto)` }}
      role="img"
      aria-label={t("scene.count.label", { n, thing: t(`countThing.${thing}`) })}
    >
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="leading-none text-center">
          {GROUP_EMOJI[thing]}
        </span>
      ))}
    </div>
  );
}

/** One group to count - or two, A and B, side by side to compare. */
export function CountPicture({ groups, small = false }: { groups: { thing: GroupThing; n: number }[]; small?: boolean }) {
  if (groups.length === 1) return <Things thing={groups[0].thing} n={groups[0].n} small={small} />;
  return (
    <div className="flex flex-wrap justify-center gap-4">
      {groups.map((g, i) => (
        <figure key={i} className="flex flex-col items-center gap-1 rounded-2xl border-2 border-slate-200 bg-white px-3 py-2">
          <figcaption className="text-lg font-black text-slate-600">{"AB"[i]}</figcaption>
          <Things thing={g.thing} n={g.n} small={small} />
        </figure>
      ))}
    </div>
  );
}

/** Animals queueing to the flag on the left - the first one stands at the flag. */
export function Queue({ animals }: { animals: Animal[] }) {
  const size = 62;
  const w = 70 + animals.length * (size + 8);
  return (
    <svg viewBox={`0 0 ${w} 110`} className="w-full max-w-xl" role="img" aria-label={t("scene.queue.label", { n: animals.length })}>
      <rect x={0} y={92} width={w} height={18} rx={4} fill="#bbf7d0" />
      <SpriteImage name="flag" x={4} y={28} size={64} />
      {animals.map((a, i) => (
        <SpriteImage key={i} name={a} x={70 + i * (size + 8)} y={30} size={size} />
      ))}
    </svg>
  );
}

/** A shape of a pattern, `size` across. */
function PatternShape({ item, x, size }: { item: PatternItem; x: number; size: number }) {
  const c = x + size / 2;
  const m = size / 2;
  const r = size * 0.42;
  const fill = COLOR[item.color];
  const line = { stroke: INK, strokeWidth: 2, strokeLinejoin: "round" as const };
  switch (item.shape) {
    case "circle":
      return <circle cx={c} cy={m} r={r} fill={fill} {...line} />;
    case "square":
      return <rect x={c - r * 0.9} y={m - r * 0.9} width={r * 1.8} height={r * 1.8} rx={3} fill={fill} {...line} />;
    case "triangle":
      return <polygon points={`${c},${m - r} ${c + r},${m + r * 0.8} ${c - r},${m + r * 0.8}`} fill={fill} {...line} />;
    case "star": {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rr = i % 2 === 0 ? r : r * 0.45;
        return `${c + rr * Math.cos(a)},${m + rr * Math.sin(a)}`;
      }).join(" ");
      return <polygon points={pts} fill={fill} {...line} />;
    }
    case "heart":
      return (
        <path
          d={`M${c} ${m + r * 0.85} C ${c - r * 1.5} ${m - r * 0.1}, ${c - r * 0.7} ${m - r * 1.2}, ${c} ${m - r * 0.45} C ${c + r * 0.7} ${m - r * 1.2}, ${c + r * 1.5} ${m - r * 0.1}, ${c} ${m + r * 0.85} Z`}
          fill={fill}
          {...line}
        />
      );
  }
}

/** A row of shapes, and a dashed box with ? where the next one goes. */
export function PatternRow({ items, blank, small = false }: { items: PatternItem[]; blank: boolean; small?: boolean }) {
  const size = small ? 56 : 46;
  const gap = 6;
  const n = items.length + (blank ? 1 : 0);
  const w = n * (size + gap) - gap;
  return (
    <svg viewBox={`-2 -2 ${w + 4} ${size + 4}`} width={small ? size : undefined} className={small ? undefined : "w-full max-w-xl"} role="img" aria-label={t("scene.pattern.label", { n: items.length })}>
      {items.map((item, i) => (
        <PatternShape key={i} item={item} x={i * (size + gap)} size={size} />
      ))}
      {blank && (
        <g>
          <rect x={items.length * (size + gap) + 2} y={2} width={size - 4} height={size - 4} rx={8} fill="#f8fafc" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 4" />
          <text x={items.length * (size + gap) + size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.55} fontWeight={900} fill="#64748b">
            ?
          </text>
        </g>
      )}
    </svg>
  );
}

/** A bookshelf: three shelves, each with its things (or an empty place). */
export function Shelf({ rows }: { rows: (ShelfThing | null)[][] }) {
  return (
    <div className="rounded-xl border-4 border-amber-800 bg-amber-50 px-2 pt-2" role="img" aria-label={t("scene.shelf.label")}>
      {rows.map((row, r) => (
        <div key={r} className="grid grid-cols-3 border-b-8 border-amber-700 mb-2">
          {row.map((x, c) => (
            <span key={c} className="w-16 h-14 flex items-end justify-center text-4xl leading-none pb-1">
              {x ? THING_EMOJI[x] : ""}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

const SQ = 30;

/** Ribbons over a row of squares each, to compare - counted in squares, not by where they end. */
export function Ribbons({ ribbons }: { ribbons: { letter: string; start: number; length: number; color: ChanceColor }[] }) {
  const cols = 10;
  return (
    <svg viewBox={`0 0 ${40 + cols * SQ + 4} ${ribbons.length * (SQ + 12) + 4}`} className="w-full max-w-md" role="img" aria-label={t("scene.lengths.label", { n: ribbons.length })}>
      {ribbons.map((r, i) => {
        const y = 2 + i * (SQ + 12);
        return (
          <g key={r.letter}>
            <text x={14} y={y + SQ / 2} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={900} fill={INK}>
              {r.letter}
            </text>
            {Array.from({ length: cols }, (_, c) => (
              <rect key={c} x={36 + c * SQ} y={y} width={SQ} height={SQ} fill="#fff" stroke="#cbd5e1" strokeWidth={1} />
            ))}
            <rect x={36 + r.start * SQ + 2} y={y + 7} width={r.length * SQ - 4} height={SQ - 14} rx={6} fill={COLOR[r.color]} stroke={INK} strokeWidth={1.5} />
          </g>
        );
      })}
    </svg>
  );
}

/** A balance with a thing on each pan: it starts level and settles - the heavier side down, or level when they weigh the same. */
export function WeighBalance({ left, right, heavier }: { left: ShelfThing; right: ShelfThing; heavier: "left" | "right" | "same" }) {
  const target = heavier === "same" ? 0 : heavier === "left" ? -14 : 14;
  // Level at first, then it tips - the moving part that shows which is heavier.
  const [tilt, setTilt] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setTilt(target), 300);
    return () => clearTimeout(id);
  }, [target]);
  const rad = (tilt * Math.PI) / 180;
  const half = 100;
  const move = { transition: "transform 0.9s cubic-bezier(.3,1.5,.5,1)" };
  return (
    <svg viewBox="0 0 320 200" className="w-full max-w-sm" role="img" aria-label={t("scene.weigh.label", { a: t(`thing.${left}`), b: t(`thing.${right}`) })}>
      <polygon points="160,72 140,180 180,180" fill="#94a3b8" stroke={INK} strokeWidth={2} />
      <rect x={110} y={178} width={100} height={10} rx={4} fill="#64748b" />
      <g style={{ ...move, transform: `rotate(${tilt}deg)`, transformOrigin: "160px 70px", transformBox: "view-box" }}>
        <line x1={160 - half} y1={70} x2={160 + half} y2={70} stroke={INK} strokeWidth={6} strokeLinecap="round" />
      </g>
      <circle cx={160} cy={70} r={6} fill={INK} />
      {[-1, 1].map((side, i) => {
        // Each pan hangs from its end of the beam, wherever the beam has turned it.
        const [dx, dy] = [side * half * (Math.cos(rad) - 1), side * half * Math.sin(rad)];
        const x = 160 + side * half;
        return (
          <g key={side} style={{ ...move, transform: `translate(${dx}px, ${dy}px)` }}>
            <line x1={x} y1={70} x2={x - 26} y2={120} stroke={INK} strokeWidth={1.5} />
            <line x1={x} y1={70} x2={x + 26} y2={120} stroke={INK} strokeWidth={1.5} />
            <path d={`M${x - 34} 120 Q ${x} 142 ${x + 34} 120 Z`} fill="#cbd5e1" stroke={INK} strokeWidth={2} />
            <text x={x} y={110} textAnchor="middle" fontSize={34}>
              {THING_EMOJI[i === 0 ? left : right]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** A glass jar with things scattered in it - more than are counted at a glance. */
export function Jar({ thing, at }: { thing: GroupThing; at: [number, number][] }) {
  const size = at.length > 40 ? 17 : at.length > 25 ? 20 : 23;
  return (
    <svg viewBox="0 0 240 290" width={220} role="img" aria-label={t("scene.jar.label", { thing: t(`countThing.${thing}`) })}>
      <rect x={70} y={8} width={100} height={22} rx={6} fill="#a16207" stroke={INK} strokeWidth={2} />
      <path d="M78 30 L78 44 Q30 52 30 96 L30 262 Q30 282 50 282 L190 282 Q210 282 210 262 L210 96 Q210 52 162 44 L162 30 Z" fill="#e0f2fe" fillOpacity={0.55} stroke={INK} strokeWidth={2.5} />
      <path d="M44 100 Q40 180 46 250" fill="none" stroke="#ffffff" strokeWidth={5} strokeLinecap="round" opacity={0.7} />
      {at.map(([x, y], i) => (
        <text key={i} x={42 + x * 156} y={88 + y * 182} textAnchor="middle" dominantBaseline="central" fontSize={size}>
          {GROUP_EMOJI[thing]}
        </text>
      ))}
    </svg>
  );
}
