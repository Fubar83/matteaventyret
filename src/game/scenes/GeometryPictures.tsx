import type { Quad } from "../../engine/questions/scene";
import { t } from "../../i18n";

/**
 * Figures for åk 4-9: an angle to judge, two lines crossing, two similar
 * triangles and a box. Drawn true to their measures, so a right angle looks
 * right and the bigger triangle is bigger by its scale.
 */

const INK = "#334155";
const FILL = "#bae6fd";
const ASKED = "#e11d48";
const rad = (d: number) => (d * Math.PI) / 180;
const label = (n: number | string) => String(n).replace(".", ",");
/** A viewBox round some points, `pad` on every side. */
const box = (pts: [number, number][], pad: number) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x0, y0] = [Math.min(...xs) - pad, Math.min(...ys) - pad];
  return `${x0} ${y0} ${Math.max(...xs) + pad - x0} ${Math.max(...ys) + pad - y0}`;
};

/** An arc from angle a0 to a1 (degrees, counter-clockwise on screen, 0 to the right), radius r, round (cx, cy). */
function arc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number) => `${cx + r * Math.cos(rad(a))} ${cy - r * Math.sin(rad(a))}`;
  return `M${p(a0)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 0 ${p(a1)}`;
}

/** Two rays from a corner, `degrees` apart, the first `turn` degrees above the horizontal. */
export function AnglePicture({ degrees, turn }: { degrees: number; turn: number }) {
  const L = 110;
  const ray = (a: number) => [L * Math.cos(rad(a)), -L * Math.sin(rad(a))] as const;
  const [x1, y1] = ray(turn);
  const [x2, y2] = ray(turn + degrees);
  return (
    <svg viewBox={box([[0, 0], [x1, y1], [x2, y2]], 18)} width={220} role="img" aria-label={t("scene.angle.label")}>
      <path d={arc(0, 0, 30, turn, turn + degrees)} fill="none" stroke={ASKED} strokeWidth={3} />
      <line x1={0} y1={0} x2={x1} y2={y1} stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <line x1={0} y1={0} x2={x2} y2={y2} stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <circle cx={0} cy={0} r={5} fill={INK} />
    </svg>
  );
}

/** Two lines crossing: the four angles in turn are a, 180 - a, a, 180 - a; one shows its size, one is v. */
export function Crossing({ degrees, given, asked }: { degrees: number; given: number; asked: number }) {
  const base = 10;
  // Where each angle starts, going round: the first line at `base`, the second `degrees` on.
  const starts = [base, base + degrees, base + 180, base + 180 + degrees];
  const sizes = [degrees, 180 - degrees, degrees, 180 - degrees];
  const L = 120;
  const end = (a: number) => [L * Math.cos(rad(a)), -L * Math.sin(rad(a))] as const;
  const mark = (i: number, text: string, color: string) => {
    const mid = starts[i] + sizes[i] / 2;
    const r = sizes[i] < 50 ? 64 : 46;
    return (
      <g key={i}>
        <path d={arc(0, 0, 26, starts[i], starts[i] + sizes[i])} fill="none" stroke={color} strokeWidth={3} />
        <text x={r * Math.cos(rad(mid))} y={-r * Math.sin(rad(mid))} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={800} fill={color}>
          {text}
        </text>
      </g>
    );
  };
  return (
    <svg viewBox="-130 -130 260 260" width={240} role="img" aria-label={t("scene.crossing.label")}>
      {[base, base + degrees].map((a) => {
        const [x, y] = end(a);
        return <line key={a} x1={-x} y1={-y} x2={x} y2={y} stroke={INK} strokeWidth={3} strokeLinecap="round" />;
      })}
      {mark(given, `${sizes[given]}°`, INK)}
      {mark(asked, "v", ASKED)}
    </svg>
  );
}

/** A triangle with sides a, b, c (c along the bottom), `unit` pixels a length: its corners. */
function corners(a: number, b: number, c: number, unit: number): [number, number][] {
  // The top corner, from the bottom left one: b along, at the angle the law of cosines gives.
  const x = (b * b + c * c - a * a) / (2 * c);
  const y = Math.sqrt(Math.max(b * b - x * x, 0));
  return [
    [0, 0],
    [c * unit, 0],
    [x * unit, -y * unit],
  ];
}

/** Two similar triangles side by side, the big one `k` times the small, their sides marked. */
export function SimilarTriangles({ sides, k, small, big }: { sides: [number, number, number]; k: number; small: (number | "x" | null)[]; big: (number | "x" | null)[] }) {
  const [a, b, c] = sides;
  const unit = 170 / (k * Math.max(...sides));
  const draw = (scale: number, marks: (number | "x" | null)[], dx: number) => {
    const pts = corners(a, b, c, unit * scale).map(([x, y]) => [x + dx, y + 170] as [number, number]);
    const centre = [(pts[0][0] + pts[1][0] + pts[2][0]) / 3, (pts[0][1] + pts[1][1] + pts[2][1]) / 3];
    // Side a joins the bottom right and top corners, b the top and bottom left, c the bottom.
    const ends: [number, number][] = [
      [1, 2],
      [2, 0],
      [0, 1],
    ];
    return (
      <g>
        <polygon points={pts.map((p) => p.join(",")).join(" ")} fill={FILL} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        {marks.map((m, i) => {
          if (m === null) return null;
          const [p, q] = ends[i].map((j) => pts[j]);
          const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
          const out = [mid[0] - centre[0], mid[1] - centre[1]];
          const len = Math.hypot(out[0], out[1]) || 1;
          return (
            <text key={i} x={mid[0] + (out[0] / len) * 16} y={mid[1] + (out[1] / len) * 16} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={800} fill={m === "x" ? ASKED : INK}>
              {label(m)}
            </text>
          );
        })}
      </g>
    );
  };
  const smallWidth = (c * unit) | 0;
  const height = -corners(a, b, c, unit * k)[2][1];
  return (
    <svg viewBox={`-20 ${145 - height} ${smallWidth + 230} ${height + 50}`} className="w-full max-w-lg" role="img" aria-label={t("scene.similar.label")}>
      {draw(1, small, 0)}
      {draw(k, big, smallWidth + 40)}
    </svg>
  );
}

/** A box drawn at a slant: length along the front, height up the side, width going back. */
export function Cuboid({ l, w, h, unit }: { l: number; w: number; h: number; unit: string }) {
  const s = 150 / Math.max(l + w * 0.5, h + w * 0.5);
  const [L, H, D] = [l * s, h * s, w * s * 0.5];
  const x0 = 64;
  const y0 = 30 + D + H;
  const front = `${x0},${y0} ${x0 + L},${y0} ${x0 + L},${y0 - H} ${x0},${y0 - H}`;
  const top = `${x0},${y0 - H} ${x0 + L},${y0 - H} ${x0 + L + D},${y0 - H - D} ${x0 + D},${y0 - H - D}`;
  const side = `${x0 + L},${y0} ${x0 + L + D},${y0 - D} ${x0 + L + D},${y0 - H - D} ${x0 + L},${y0 - H}`;
  const text = (x: number, y: number, n: number, anchor: "middle" | "end" | "start" = "middle") => (
    <text x={x} y={y} textAnchor={anchor} dominantBaseline="central" fontSize={15} fontWeight={800} fill={INK}>
      {label(n)} {unit}
    </text>
  );
  return (
    <svg viewBox={`0 0 ${x0 + L + D + 80} ${y0 + 30}`} width={Math.min(320, x0 + L + D + 80)} role="img" aria-label={t("scene.cuboid.label", { l, w, h, u: unit })}>
      <polygon points={front} fill={FILL} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <polygon points={top} fill="#e0f2fe" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <polygon points={side} fill="#7dd3fc" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      {text(x0 + L / 2, y0 + 14, l)}
      {text(x0 - 6, y0 - H / 2, h, "end")}
      {text(x0 + L + D / 2 + 8, y0 - D / 2 + 6, w, "start")}
    </svg>
  );
}

/** The protractor's middle and radius, in its picture's coordinates (viewBox 0 0 360 200). */
export const PROTRACTOR = { cx: 180, cy: 180, r: 150, width: 360, height: 200 };

/**
 * A protractor with both scales - the outer from 0 on the right, the inner
 * from 0 on the left - the first arm along its base pointing `base`, and a
 * second arm at `theta` (degrees anticlockwise from the right) when there is one.
 */
export function ProtractorDrawing({ base, theta, color = "#e11d48" }: { base: "right" | "left"; theta?: number | null; color?: string }) {
  const { cx, cy, r } = PROTRACTOR;
  const at = (deg: number, rr: number) => [cx + rr * Math.cos(rad(deg)), cy - rr * Math.sin(rad(deg))] as const;
  return (
    <g>
      <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} Z`} fill="#e0f2fe" fillOpacity={0.75} stroke="#0284c7" strokeWidth={2} />
      {Array.from({ length: 181 }, (_, d) => {
        const len = d % 10 === 0 ? 14 : d % 5 === 0 ? 9 : 5;
        const [x1, y1] = at(d, r);
        const [x2, y2] = at(d, r - len);
        return <line key={d} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0369a1" strokeWidth={d % 10 === 0 ? 1.4 : 0.8} />;
      })}
      {Array.from({ length: 19 }, (_, i) => {
        const d = i * 10;
        // The 0 and 180 at the ends lifted clear of the arms that lie along the base.
        const lift = d === 0 || d === 180 ? 9 : 0;
        const [ox, oy0] = at(d, r - 24);
        const [ix, iy0] = at(d, r - 42);
        const [oy, iy] = [oy0 - lift, iy0 - lift];
        return (
          <g key={d} fontSize={10} fontWeight={700} textAnchor="middle" dominantBaseline="central">
            <text x={ox} y={oy} fill="#0c4a6e">
              {d}
            </text>
            <text x={ix} y={iy} fill="#be123c">
              {180 - d}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={3.5} fill={INK} />
      {/* The first arm, along the base. */}
      <line x1={cx} y1={cy} x2={base === "right" ? cx + r + 14 : cx - r - 14} y2={cy} stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
      {theta !== undefined && theta !== null && <line x1={cx} y1={cy} x2={at(theta, r + 14)[0]} y2={at(theta, r + 14)[1]} stroke={color} strokeWidth={3.5} strokeLinecap="round" />}
    </g>
  );
}

/** A protractor laid on an angle of `degrees`, its first arm pointing `base`: an angle to read. */
export function ProtractorPicture({ degrees, base }: { degrees: number; base: "right" | "left" }) {
  const { width, height } = PROTRACTOR;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md" role="img" aria-label={t("scene.protractor.label")}>
      <ProtractorDrawing base={base} theta={base === "right" ? degrees : 180 - degrees} color={INK} />
    </svg>
  );
}

/** The quadrilaterals' corners, in a 100 × 80 box - none of them with marks that give away a right angle. */
const QUAD_CORNERS: Record<Quad, [number, number][]> = {
  square: [[22, 10], [82, 10], [82, 70], [22, 70]],
  rectangle: [[5, 20], [95, 20], [95, 60], [5, 60]],
  rhombus: [[50, 4], [86, 40], [50, 76], [14, 40]],
  parallelogram: [[22, 20], [96, 20], [78, 60], [4, 60]],
  trapezoid: [[28, 18], [72, 18], [96, 62], [4, 62]],
  kite: [[50, 4], [80, 28], [50, 76], [20, 28]],
};

/** A quadrilateral, turned `turn` degrees about its middle. */
export function QuadPicture({ shape, turn, size = 120 }: { shape: Quad; turn: number; size?: number }) {
  return (
    <svg viewBox="-12 -22 124 124" width={size} role="img" aria-label={t(`scene.quad.${shape}`)}>
      <polygon points={QUAD_CORNERS[shape].map((p) => p.join(",")).join(" ")} transform={`rotate(${turn} 50 40)`} fill={FILL} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
    </svg>
  );
}

/** A net: squares joined edge to edge. */
export function NetPicture({ cells, size = 16 }: { cells: [number, number][]; size?: number }) {
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const h = Math.max(...cells.map((c) => c[1])) + 1;
  return (
    <svg viewBox={`-2 -2 ${w * size + 4} ${h * size + 4}`} width={w * size + 4} role="img" aria-label={t("scene.net.label")}>
      {cells.map(([c, r]) => (
        <rect key={`${c},${r}`} x={c * size} y={r * size} width={size} height={size} fill={FILL} stroke={INK} strokeWidth={1.5} />
      ))}
    </svg>
  );
}

/** A polygon on squared paper, its corners on the grid points. */
export function GridShapePicture({ w, h, points }: { w: number; h: number; points: [number, number][] }) {
  const S = Math.min(36, Math.floor(320 / w));
  return (
    <svg viewBox={`-2 -2 ${w * S + 4} ${h * S + 4}`} width={w * S + 4} className="max-w-full" role="img" aria-label={t("scene.gridShape.label")}>
      {Array.from({ length: w + 1 }, (_, i) => (
        <line key={`v${i}`} x1={i * S} y1={0} x2={i * S} y2={h * S} stroke="#cbd5e1" strokeWidth={1} />
      ))}
      {Array.from({ length: h + 1 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={i * S} x2={w * S} y2={i * S} stroke="#cbd5e1" strokeWidth={1} />
      ))}
      <polygon points={points.map(([x, y]) => `${x * S},${y * S}`).join(" ")} fill={FILL} fillOpacity={0.8} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
    </svg>
  );
}

/** A triangle with its sides marked: a = BC, b = CA, c = AB along the bottom - then turned, and mirrored when `flip`. */
export function TrianglePicture({ sides, turn, flip, size = 150 }: { sides: [number, number, number]; turn: number; flip: boolean; size?: number }) {
  const [a, b, c] = sides;
  const unit = 100 / Math.max(...sides);
  // Mirrored, then turned about the middle - computed, so the numbers stay upright.
  const place = ([x, y]: [number, number]): [number, number] => {
    const mx = flip ? -x : x;
    return [mx * Math.cos(rad(turn)) - y * Math.sin(rad(turn)), mx * Math.sin(rad(turn)) + y * Math.cos(rad(turn))];
  };
  const raw = corners(a, b, c, unit);
  const mid0 = [(raw[0][0] + raw[1][0] + raw[2][0]) / 3, (raw[0][1] + raw[1][1] + raw[2][1]) / 3];
  const pts = raw.map(([x, y]) => place([x - mid0[0], y - mid0[1]]));
  const ends: [number, number][] = [
    [1, 2],
    [2, 0],
    [0, 1],
  ];
  return (
    <svg viewBox="-80 -80 160 160" width={size} role="img" aria-label={t("scene.triangle.label", { a, b, c })}>
      <polygon points={pts.map((p) => p.join(",")).join(" ")} fill={FILL} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      {sides.map((side, i) => {
        const [p, q] = ends[i].map((j) => pts[j]);
        const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        const len = Math.hypot(mid[0], mid[1]) || 1;
        return (
          <text key={i} x={mid[0] + (mid[0] / len) * 13} y={mid[1] + (mid[1] / len) * 13} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={800} fill={INK}>
            {side}
          </text>
        );
      })}
    </svg>
  );
}
