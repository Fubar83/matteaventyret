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
