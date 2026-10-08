import { TEMPLATES, type TemplateId, type WritingTemplate } from "./templates";

const PRINTED = "#334155"; // slate-700: the template's own "printed" parts
const GUIDE = { digit: "#bae6fd", note: "#fde68a", work: "#e2e8f0" } as const; // sky-200, amber-200, slate-200

/** A writing template's guide boxes and printed parts, as SVG for InkCanvas's `guides` layer. */
export function TemplateGuides({ template }: { template: WritingTemplate }) {
  const b = template.bracket;
  return (
    <g pointerEvents="none">
      {template.boxes.map((box, i) => (
        <rect
          key={i}
          x={box.x}
          y={box.y}
          width={box.w}
          height={box.h}
          rx={8}
          fill={box.kind === "note" ? "#fffbeb" : "#f8fafc"}
          stroke={GUIDE[box.kind]}
          strokeWidth={2}
          strokeDasharray={box.kind === "note" ? "5 4" : undefined}
        />
      ))}
      {template.lines.map((l, i) => (
        <line key={i} x1={l.x1} x2={l.x2} y1={l.y} y2={l.y} stroke={PRINTED} strokeWidth={4} strokeLinecap="round" />
      ))}
      {template.glyphs.map((g, i) =>
        // A text "·" is a speck even at a large font size - draw the multiplication dot as a solid dot instead.
        g.char === "·" ? (
          <circle key={i} cx={g.cx} cy={g.cy} r={g.size * 0.12} fill={PRINTED} />
        ) : (
          <text key={i} x={g.cx} y={g.cy} fontSize={g.size} fill={PRINTED} textAnchor="middle" dominantBaseline="central" fontWeight={600}>
            {g.char}
          </text>
        )
      )}
      {b && (
        <path
          d={`M ${b.stemX} ${b.stemBottom} L ${b.stemX} ${b.bar.y} L ${b.bar.maxX} ${b.bar.y}`}
          fill="none"
          stroke={PRINTED}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}

/** Segmented template switcher - big touch targets, like the tool picker. */
export function TemplatePicker({ value, onChange }: { value: TemplateId; onChange: (id: TemplateId) => void }) {
  return (
    <div className="inline-flex flex-wrap justify-center rounded-lg bg-slate-200 p-1 gap-1" role="radiogroup" aria-label="Mall">
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={value === t.id}
          onClick={() => onChange(t.id)}
          className={`px-3 h-10 rounded-md text-sm font-semibold ${value === t.id ? "bg-white text-sky-700 shadow" : "text-slate-600"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
