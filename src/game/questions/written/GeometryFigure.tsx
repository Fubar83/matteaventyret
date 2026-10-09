import type { Figure, FigureFill, FigureLabel, Point } from "../../../engine/questions/written/geometry";

/** How big a figure is drawn, at most (CSS px) - it shrinks with the screen. */
const MAX_W = 340;
const MAX_H = 230;
/** Room around the shape for its labels. */
const PAD = 56;
const FONT = 17;

const FILL: Record<FigureFill, { fill: string; stroke: string; dash?: string }> = {
  asked: { fill: "#99f6e4", stroke: "#0f766e" }, // teal: what the question is about
  cut: { fill: "#ffffff", stroke: "#94a3b8", dash: "6 5" }, // taken away
  plain: { fill: "#f8fafc", stroke: "#334155" },
};

/** Every point a figure touches - for its size. */
function extent(fig: Figure): Point[] {
  const pts: Point[] = [];
  for (const s of fig.shapes) {
    if (s.kind === "polygon") pts.push(...s.points);
    else if (s.kind === "circle") pts.push([s.center[0] - s.r, s.center[1] - s.r], [s.center[0] + s.r, s.center[1] + s.r]);
    else if (s.kind === "sector") {
      pts.push(s.center);
      for (let a = s.from; a <= s.to; a += 5) pts.push(polar(s.center, s.r, a));
      pts.push(polar(s.center, s.r, s.to));
    } else if (s.kind === "segment") pts.push(s.from, s.to);
  }
  for (const l of fig.labels) pts.push(l.at);
  return pts;
}

/** A point at `deg` degrees (counter-clockwise from "east", y up as in maths) on a circle in y-down drawing units. */
function polar(c: Point, r: number, deg: number): Point {
  const a = (deg * Math.PI) / 180;
  return [c[0] + r * Math.cos(a), c[1] - r * Math.sin(a)];
}

function unit(from: Point, to: Point): Point {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const d = Math.hypot(dx, dy) || 1;
  return [dx / d, dy / d];
}

const LABEL_OFFSET: Record<FigureLabel["place"], { dx: number; dy: number; anchor: "start" | "middle" | "end" }> = {
  above: { dx: 0, dy: -12, anchor: "middle" },
  below: { dx: 0, dy: 22, anchor: "middle" },
  left: { dx: -10, dy: 6, anchor: "end" },
  right: { dx: 10, dy: 6, anchor: "start" },
  center: { dx: 0, dy: 6, anchor: "middle" },
};

/**
 * A geometry question's figure (engine/questions/written/geometry.ts): the shape in its real
 * proportions, the part asked about in teal, a part taken away white and
 * dashed, heights and radii as thin lines, measurements beside their sides.
 */
export function GeometryFigure({ figure, maxWidth = MAX_W, maxHeight = MAX_H }: { figure: Figure; maxWidth?: number; maxHeight?: number }) {
  const pts = extent(figure);
  const minX = Math.min(...pts.map((p) => p[0]));
  const maxX = Math.max(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1]));
  const maxY = Math.max(...pts.map((p) => p[1]));
  const scale = Math.min((maxWidth - 2 * PAD) / Math.max(maxX - minX, 1e-6), (maxHeight - 2 * PAD) / Math.max(maxY - minY, 1e-6));
  const at = (p: Point): Point => [(p[0] - minX) * scale + PAD, (p[1] - minY) * scale + PAD];
  // The drawing, grown to take in every label ("R = 7 cm" beside a circle can reach past the padding).
  const box = { minX: 0, minY: 0, maxX: (maxX - minX) * scale + 2 * PAD, maxY: (maxY - minY) * scale + 2 * PAD };
  for (const l of figure.labels) {
    const [x, y] = at(l.at);
    const o = LABEL_OFFSET[l.place];
    const w = l.text.length * FONT * 0.6;
    const left = o.anchor === "start" ? x + o.dx : o.anchor === "end" ? x + o.dx - w : x + o.dx - w / 2;
    box.minX = Math.min(box.minX, left - 4);
    box.maxX = Math.max(box.maxX, left + w + 4);
    box.minY = Math.min(box.minY, y + o.dy - FONT - 2);
    box.maxY = Math.max(box.maxY, y + o.dy + 6);
  }
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;

  return (
    <svg viewBox={`${box.minX} ${box.minY} ${width} ${height}`} width={width} height={height} className="max-w-full h-auto" role="img">
      {figure.shapes.map((s, i) => {
        if (s.kind === "polygon") {
          const f = FILL[s.fill];
          return (
            <polygon
              key={i}
              points={s.points.map((p) => at(p).join(",")).join(" ")}
              fill={f.fill}
              stroke={f.stroke}
              strokeWidth={2.5}
              strokeDasharray={f.dash}
              strokeLinejoin="round"
            />
          );
        }
        if (s.kind === "circle") {
          const f = FILL[s.fill];
          const [cx, cy] = at(s.center);
          return <circle key={i} cx={cx} cy={cy} r={s.r * scale} fill={f.fill} stroke={f.stroke} strokeWidth={2.5} strokeDasharray={f.dash} />;
        }
        if (s.kind === "sector") {
          const f = FILL[s.fill];
          const [cx, cy] = at(s.center);
          const [x1, y1] = at(polar(s.center, s.r, s.from));
          const [x2, y2] = at(polar(s.center, s.r, s.to));
          const large = s.to - s.from > 180 ? 1 : 0;
          const r = s.r * scale;
          // A piece cut away only dashes its curved edge - its straight edges lie along the shape it was cut from.
          if (s.fill === "cut") {
            return (
              <g key={i}>
                <path d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 0 ${x2} ${y2} Z`} fill={f.fill} />
                <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 0 ${x2} ${y2}`} fill="none" stroke={f.stroke} strokeWidth={2.5} strokeDasharray={f.dash} />
              </g>
            );
          }
          // Sweep 0: counter-clockwise on screen, which is the maths direction once y is flipped.
          return (
            <path
              key={i}
              d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 0 ${x2} ${y2} Z`}
              fill={f.fill}
              stroke={f.stroke}
              strokeWidth={2.5}
              strokeDasharray={f.dash}
              strokeLinejoin="round"
            />
          );
        }
        if (s.kind === "segment") {
          const [x1, y1] = at(s.from);
          const [x2, y2] = at(s.to);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={s.faint ? "#cbd5e1" : "#334155"} strokeWidth={s.faint ? 1.2 : 2} strokeDasharray={s.dashed ? "6 5" : undefined} />;
        }
        if (s.kind === "rightAngle") {
          const size = 12;
          const [x, y] = at(s.at);
          const ua = unit(s.at, s.a);
          const ub = unit(s.at, s.b);
          const p1 = [x + ua[0] * size, y + ua[1] * size];
          const p2 = [x + (ua[0] + ub[0]) * size, y + (ua[1] + ub[1]) * size];
          const p3 = [x + ub[0] * size, y + ub[1] * size];
          return <polyline key={i} points={[p1, p2, p3].map((p) => p.join(",")).join(" ")} fill="none" stroke="#334155" strokeWidth={1.8} />;
        }
        // An angle's arc.
        const r = 22;
        const [x, y] = at(s.at);
        const ua = unit(s.at, s.a);
        const ub = unit(s.at, s.b);
        // Screen coordinates flip y, so the maths angle between the two directions is measured with -y.
        const angA = Math.atan2(-ua[1], ua[0]);
        let angB = Math.atan2(-ub[1], ub[0]);
        while (angB < angA) angB += 2 * Math.PI;
        const large = angB - angA > Math.PI ? 1 : 0;
        return (
          <path
            key={i}
            d={`M ${x + ua[0] * r} ${y + ua[1] * r} A ${r} ${r} 0 ${large} 0 ${x + ub[0] * r} ${y + ub[1] * r}`}
            fill="none"
            stroke="#b45309"
            strokeWidth={2}
          />
        );
      })}
      {figure.labels.map((l, i) => {
        const [x, y] = at(l.at);
        const o = LABEL_OFFSET[l.place];
        return (
          <text
            key={`l${i}`}
            x={x + o.dx}
            y={y + o.dy}
            textAnchor={o.anchor}
            fontSize={FONT}
            fontWeight={700}
            fill="#0f172a"
            stroke="#ffffff"
            strokeWidth={4}
            paintOrder="stroke"
          >
            {l.text}
          </text>
        );
      })}
    </svg>
  );
}
