import type { Move, ProgramStep } from "../../engine/questions/scene";
import { t } from "../../i18n";

/**
 * Programming: a robot on a grid, the program it runs written as arrow cards
 * (a loop as a bracket - "upprepa 3 gånger"), and lettered squares to pick
 * among - or a star to get to.
 */

const CELL = 46;
const ARROW: Record<Move, string> = { up: "↑", down: "↓", left: "←", right: "→" };

function Card({ move }: { move: Move }) {
  return <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-sky-300 bg-white text-2xl font-bold text-sky-700 shadow-sm">{ARROW[move]}</span>;
}

/** The program, in the order it runs. */
export function ProgramCards({ program }: { program: readonly ProgramStep[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2" role="list" aria-label={t("scene.robot.program")}>
      {program.map((s, i) =>
        typeof s === "string" ? (
          <span role="listitem" key={i}>
            <Card move={s} />
          </span>
        ) : (
          <span role="listitem" key={i} className="flex items-center gap-1.5 rounded-xl border-2 border-dashed border-violet-400 bg-violet-50 px-2 py-1">
            <span className="text-sm font-bold text-violet-700 whitespace-nowrap">{t("scene.robot.repeat", { n: s.repeat })}</span>
            {s.moves.map((m, j) => (
              <Card key={j} move={m} />
            ))}
          </span>
        )
      )}
    </div>
  );
}

export function RobotGrid({
  w,
  h,
  start,
  program,
  letters,
  star,
}: {
  w: number;
  h: number;
  start: [number, number];
  program?: ProgramStep[];
  letters: { at: [number, number]; letter: string }[];
  star?: [number, number];
}) {
  const center = ([c, r]: [number, number]) => [c * CELL + CELL / 2, r * CELL + CELL / 2];
  const [sx, sy] = center(start);
  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`-4 -4 ${w * CELL + 8} ${h * CELL + 8}`} width={w * CELL + 8} className="max-w-full" role="img" aria-label={t("scene.robot.label")}>
        {Array.from({ length: h }, (_, r) =>
          Array.from({ length: w }, (_, c) => <rect key={`${c}-${r}`} x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill={(c + r) % 2 === 0 ? "#f0fdf4" : "#dcfce7"} stroke="#86efac" strokeWidth={1.5} />)
        )}
        {letters.map(({ at, letter }) => {
          const [x, y] = center(at);
          return (
            <g key={letter}>
              <circle cx={x} cy={y} r={15} fill="#ffffff" stroke="#7c3aed" strokeWidth={2.5} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={800} fill="#6d28d9">
                {letter}
              </text>
            </g>
          );
        })}
        {star && (
          <text x={center(star)[0]} y={center(star)[1]} textAnchor="middle" dominantBaseline="central" fontSize={30}>
            ⭐
          </text>
        )}
        <text x={sx} y={sy} textAnchor="middle" dominantBaseline="central" fontSize={32}>
          🤖
        </text>
      </svg>
      {program && program.length > 0 && <ProgramCards program={program} />}
    </div>
  );
}
