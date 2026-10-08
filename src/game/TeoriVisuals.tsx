import type { ReactNode } from "react";
/** Small presentational building blocks shared by the Teori worked examples. */

export function Box({
  children,
  tone = "plain",
  size = "md",
}: {
  children?: React.ReactNode;
  tone?: "plain" | "highlight" | "muted" | "new" | "struck";
  size?: "sm" | "md";
}) {
  const dims = size === "sm" ? "w-7 h-7 text-sm" : "w-11 h-11 text-xl";
  const toneClasses: Record<string, string> = {
    plain: "bg-white border-slate-300 text-slate-800",
    highlight: "bg-amber-100 border-amber-400 text-amber-800 ring-2 ring-amber-300",
    muted: "bg-slate-50 border-slate-200 text-slate-300",
    new: "bg-emerald-50 border-emerald-400 text-emerald-700",
    struck: "bg-white border-slate-300 text-slate-400 line-through decoration-rose-500 decoration-2",
  };
  return (
    <div className={`relative flex items-center justify-center rounded-md border-2 font-bold ${dims} ${toneClasses[tone]}`}>
      {children}
    </div>
  );
}

/** A left-to-right row (most significant column first) - just order children visually left to right yourself. */
export function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-1 items-end justify-center">{children}</div>;
}

/** One unit dot, used to make "how many" visually countable rather than abstract. */
export function Dot({ tone = "sky" }: { tone?: "sky" | "orange" | "emerald" }) {
  const toneClasses = { sky: "bg-sky-500", orange: "bg-orange-500", emerald: "bg-emerald-500" };
  return <span className={`inline-block w-3.5 h-3.5 rounded-full ${toneClasses[tone]}`} />;
}

export function DotGroup({ count, tone }: { count: number; tone?: "sky" | "orange" | "emerald" }) {
  return (
    <div className="flex flex-wrap gap-1 max-w-[7rem]">
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} tone={tone} />
      ))}
    </div>
  );
}

/** A bundled ten: ten dots grouped into one visibly-counted stick, labelled "10". */
export function TenBundle() {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-1 rounded-lg border-2 border-dashed border-orange-400 bg-orange-50">
      <div className="grid grid-cols-5 gap-0.5">
        {Array.from({ length: 10 }, (_, i) => (
          <Dot key={i} tone="orange" />
        ))}
      </div>
      <span className="text-xs font-bold text-orange-600">10</span>
    </div>
  );
}

export function ArrowDown() {
  return (
    <span aria-hidden className="text-2xl text-slate-400">
      ↓
    </span>
  );
}

export function ArrowUp() {
  return (
    <span aria-hidden className="text-2xl text-slate-400">
      ↑
    </span>
  );
}

// Pictures for the åk 7 - gymnasiet theory (teoriAdvanced.tsx).

export function NumberLine() {
  const xs = Array.from({ length: 13 }, (_, i) => i - 6);
  return (
    <svg viewBox="0 0 320 70" className="w-80">
      <line x1={10} y1={40} x2={310} y2={40} stroke="#334155" strokeWidth={2} />
      {xs.map((n) => {
        const x = 160 + n * 23;
        return (
          <g key={n}>
            <line x1={x} y1={34} x2={x} y2={46} stroke="#334155" strokeWidth={n === 0 ? 3 : 1.5} />
            <text x={x} y={62} textAnchor="middle" fontSize={11} fill={n < 0 ? "#e11d48" : "#334155"} fontWeight={n === 0 ? 800 : 500}>
              {n < 0 ? `−${-n}` : n}
            </text>
          </g>
        );
      })}
      <path d={`M 160 28 Q ${160 - 34} 6 ${160 - 69} 28`} fill="none" stroke="#e11d48" strokeWidth={2.5} markerEnd="url(#arrow)" />
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#e11d48" />
        </marker>
      </defs>
    </svg>
  );
}

export function RightTriangle({ showAngle = false }: { showAngle?: boolean }) {
  return (
    <svg viewBox="0 0 220 150" className="w-56">
      <polygon points="20,130 190,130 190,20" fill="#e0f2fe" stroke="#0369a1" strokeWidth={2.5} />
      <rect x={176} y={116} width={14} height={14} fill="none" stroke="#0369a1" strokeWidth={1.5} />
      <text x={105} y={146} textAnchor="middle" fontSize={15} fontWeight={700} fill="#0f172a">b</text>
      <text x={202} y={80} fontSize={15} fontWeight={700} fill="#0f172a">a</text>
      <text x={92} y={66} fontSize={15} fontWeight={700} fill="#b45309">c</text>
      {showAngle && (
        <>
          <path d="M 52 130 A 32 32 0 0 0 48 112" fill="none" stroke="#b45309" strokeWidth={2} />
          <text x={58} y={122} fontSize={14} fontWeight={700} fill="#b45309">v</text>
        </>
      )}
    </svg>
  );
}

/** Axes with a curve through them - `f` in unit coordinates, shown for x in [-4, 4]. */
export function Graph({ f, children }: { f: (x: number) => number; children?: ReactNode }) {
  const X = (x: number) => 110 + x * 22;
  const Y = (y: number) => 85 - y * 12;
  const pts = Array.from({ length: 81 }, (_, i) => -4 + i * 0.1)
    .map((x) => ({ x, y: f(x) }))
    .filter((p) => p.y > -6.5 && p.y < 6.5)
    .map((p) => `${X(p.x)},${Y(p.y)}`)
    .join(" ");
  return (
    <svg viewBox="0 0 220 170" className="w-60">
      <line x1={10} y1={85} x2={210} y2={85} stroke="#94a3b8" />
      <line x1={110} y1={5} x2={110} y2={165} stroke="#94a3b8" />
      {children}
      <polyline points={pts} fill="none" stroke="#7c3aed" strokeWidth={3} />
    </svg>
  );
}

export function Balance() {
  return (
    <svg viewBox="0 0 240 110" className="w-60">
      <polygon points="110,100 130,100 120,60" fill="#94a3b8" />
      <line x1={30} y1={60} x2={210} y2={60} stroke="#334155" strokeWidth={4} strokeLinecap="round" />
      <rect x={30} y={30} width={70} height={30} rx={6} fill="#dbeafe" stroke="#1d4ed8" />
      <text x={65} y={51} textAnchor="middle" fontSize={16} fontWeight={700} fill="#1e3a8a">3x + 5</text>
      <rect x={140} y={30} width={70} height={30} rx={6} fill="#dcfce7" stroke="#15803d" />
      <text x={175} y={51} textAnchor="middle" fontSize={16} fontWeight={700} fill="#14532d">20</text>
    </svg>
  );
}

export function PercentGrid({ filled }: { filled: number }) {
  return (
    <svg viewBox="0 0 104 104" className="w-28">
      {Array.from({ length: 100 }, (_, i) => (
        <rect key={i} x={2 + (i % 10) * 10} y={2 + Math.floor(i / 10) * 10} width={9} height={9} fill={i < filled ? "#10b981" : "#e2e8f0"} />
      ))}
    </svg>
  );
}

/** One bar against a 0-15 scale - reading the height off the scale. */
export function BarWithScale({ value }: { value: number }) {
  return (
    <svg viewBox="0 0 120 110" className="w-32">
      {[0, 5, 10, 15].map((g) => (
        <g key={g}>
          <line x1={24} y1={100 - g * 6} x2={110} y2={100 - g * 6} stroke="#e2e8f0" />
          <text x={18} y={104 - g * 6} textAnchor="end" fontSize={9} fill="#94a3b8">
            {g}
          </text>
        </g>
      ))}
      <rect x={50} y={100 - value * 6} width={30} height={value * 6} fill="#38bdf8" />
    </svg>
  );
}

/** (a + b)² as a picture: a square with sides a + b, split into a², two ab and b². */
export function SquareRuleSquare() {
  const a = 90;
  const b = 50;
  const cell = (x: number, y: number, w: number, h: number, fill: string, text: string) => (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={fill} stroke="#334155" strokeWidth={2} />
      <text x={x + w / 2} y={y + h / 2 + 6} textAnchor="middle" fontSize={18} fontWeight={700} fill="#0f172a">
        {text}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 170 170" width={170} height={170} role="img">
      {cell(20, 20, a, a, "#bae6fd", "a²")}
      {cell(20 + a, 20, b, a, "#fde68a", "ab")}
      {cell(20, 20 + a, a, b, "#fde68a", "ab")}
      {cell(20 + a, 20 + a, b, b, "#fecaca", "b²")}
      <text x={20 + a / 2} y={14} textAnchor="middle" fontSize={15} fill="#475569">
        a
      </text>
      <text x={20 + a + b / 2} y={14} textAnchor="middle" fontSize={15} fill="#475569">
        b
      </text>
    </svg>
  );
}
