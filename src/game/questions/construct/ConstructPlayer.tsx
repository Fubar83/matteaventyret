import { useState, type MouseEvent } from "react";
import { playEffect } from "../../../audio/sound";
import type { ChoiceText } from "../../../engine/questions/choice/problem";
import { checkAngle, checkLine, checkTriangle, thirdCorner, type AngleTask, type ConstructProblem, type LineTask, type TriangleTask } from "../../../engine/questions/construct";
import { t } from "../../../i18n";
import { PROTRACTOR, ProtractorDrawing } from "../../scenes/GeometryPictures";
import { useDragPoint } from "../dragDrop";
import { HelpLadder } from "../HelpLadder";
import { NextSheet } from "../NextSheet";
import { triedOutcome, type QuestionOutcome } from "../questionOutcome";

const say = (x: ChoiceText) => t(x.key, x.vars);
const INK = "#334155";
const WRONG_ALLOWED = 2;

/** Where a tap landed, in the picture's own coordinates (its viewBox). */
function tapAt(e: MouseEvent<SVGSVGElement>, width: number, height: number): [number, number] {
  const box = e.currentTarget.getBoundingClientRect();
  return [((e.clientX - box.left) / box.width) * width, ((e.clientY - box.top) / box.height) * height];
}

type Answer = { ok: boolean; why: ChoiceText | null };

/** What every construction shares: Rätta, the message, help, and the answer shown after the allowed tries. */
function useConstruction(problem: ConstructProblem, onSolved: (o: QuestionOutcome) => void) {
  const [wrong, setWrong] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [state, setState] = useState<"working" | "solved" | "shown">("working");
  const [message, setMessage] = useState<string | null>(null);
  function judge({ ok, why }: Answer, show: () => void) {
    if (ok) {
      playEffect("correct");
      setState("solved");
      setMessage(null);
      onSolved(triedOutcome({ wrong, helpUsed }));
      return;
    }
    playEffect("wrong");
    const next = wrong + 1;
    setWrong(next);
    if (next >= WRONG_ALLOWED) {
      show();
      setState("shown");
      setMessage(`${why ? `${say(why)} ` : ""}${say(problem.explanation)}`);
      return;
    }
    setMessage(why ? say(why) : t("tries.tryAgain"));
  }
  const footer = (canCheck: boolean, check: () => void) => (
    <>
      {state === "working" && (
        <button type="button" onClick={check} disabled={!canCheck} className="h-12 px-8 rounded-full bg-sky-500 text-white text-lg font-bold shadow disabled:opacity-40">
          {t("sort.check")}
        </button>
      )}
      {message && state === "working" && (
        <p role="status" className="text-sm text-center max-w-sm text-slate-700">
          {message}
        </p>
      )}
      {state === "solved" && <p className="text-sm text-center max-w-sm text-emerald-700 font-semibold">{say(problem.explanation)}</p>}
      {state === "working" && (
        <HelpLadder
          used={helpUsed}
          onUse={setHelpUsed}
          steps={[
            { title: t("help.tip"), content: say(problem.tip) },
            { title: t("help.solution"), content: say(problem.explanation) },
          ]}
        />
      )}
      {state === "shown" && <NextSheet note={message} onNext={() => onSolved(triedOutcome({ wrong, helpUsed, shown: true }))} />}
    </>
  );
  return { working: state === "working", color: state === "working" ? "#e11d48" : "#059669", judge, footer };
}

const CM = 26;
const RX = (cm: number) => 16 + cm * CM;

/** A line along a ruler: tap where it should end. */
function LineConstruction({ problem, onSolved }: { problem: LineTask; onSolved: (o: QuestionOutcome) => void }) {
  const [end, setEnd] = useState<number | null>(null);
  const c = useConstruction(problem, onSolved);
  const [W, H] = [430, 140];
  const placeEnd = (x: number) => {
    const cm = Math.min(15, Math.max(0, Math.round((x - 16) / CM / problem.snap) * problem.snap));
    setEnd(cm);
  };
  const drag = useDragPoint(W, H, (x) => placeEnd(x), c.working);
  const tap = (e: MouseEvent<SVGSVGElement>) => c.working && placeEnd(tapAt(e, W, H)[0]);
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xl touch-none select-none cursor-crosshair" onClick={tap} {...drag} role="img" aria-label={t("construct.line.label")}>
        <rect x={0} y={0} width={W} height={60} fill="#ffffff" />
        <circle cx={RX(problem.start)} cy={40} r={5} fill={INK} />
        {end !== null && <line x1={RX(problem.start)} y1={40} x2={RX(end)} y2={40} stroke={c.color} strokeWidth={4} strokeLinecap="round" />}
        <rect x={6} y={62} width={418} height={56} rx={6} fill="#fef9c3" stroke="#ca8a04" strokeWidth={2} />
        {Array.from({ length: 151 }, (_, mm) => (
          <line key={mm} x1={RX(mm / 10)} y1={62} x2={RX(mm / 10)} y2={62 + (mm % 10 === 0 ? 20 : mm % 5 === 0 ? 14 : 8)} stroke={INK} strokeWidth={mm % 10 === 0 ? 1.8 : 1} />
        ))}
        {Array.from({ length: 16 }, (_, cm) => (
          <text key={cm} x={RX(cm)} y={100} textAnchor="middle" fontSize={13} fontWeight={700} fill={INK}>
            {cm}
          </text>
        ))}
      </svg>
      {c.footer(end !== null, () => c.judge(checkLine(problem, end!), () => setEnd(problem.start + problem.length)))}
    </>
  );
}

/** An angle with a protractor: tap where the second arm should go. */
function AngleConstruction({ problem, onSolved }: { problem: AngleTask; onSolved: (o: QuestionOutcome) => void }) {
  const [theta, setTheta] = useState<number | null>(null);
  const c = useConstruction(problem, onSolved);
  const { cx, cy, width, height } = PROTRACTOR;
  const placeArm = (x: number, y: number) => {
    const deg = (Math.atan2(cy - y, x - cx) * 180) / Math.PI;
    setTheta(Math.min(180, Math.max(0, Math.round(deg))));
  };
  const drag = useDragPoint(width, height, placeArm, c.working);
  const tap = (e: MouseEvent<SVGSVGElement>) => c.working && placeArm(...tapAt(e, width, height));
  return (
    <>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md touch-none select-none cursor-crosshair" onClick={tap} {...drag} role="img" aria-label={t("construct.angle.label")}>
        <ProtractorDrawing base={problem.base} theta={theta} color={c.color} />
      </svg>
      {c.footer(theta !== null, () => c.judge(checkAngle(problem, theta!), () => setTheta(problem.base === "right" ? problem.degrees : 180 - problem.degrees)))}
    </>
  );
}

const TCM = 34;

/** A triangle from three sides: the base AB drawn; circles from A and B with the compasses; tap where C goes. */
function TriangleConstruction({ problem, onSolved }: { problem: TriangleTask; onSolved: (o: QuestionOutcome) => void }) {
  const [corner, setCorner] = useState<[number, number] | null>(null);
  const [circles, setCircles] = useState({ a: false, b: false });
  const c = useConstruction(problem, onSolved);
  const [W, H] = [Math.max(360, (problem.c + 2) * TCM), 9 * TCM];
  const [ax, ay] = [TCM, H - 20];
  const P = ([x, y]: [number, number]) => [ax + x * TCM, ay - y * TCM] as const;
  const placeCorner = (x: number, y: number) => {
    // To the millimetre, above the base.
    setCorner([Math.round(((x - ax) / TCM) * 10) / 10, Math.max(0.1, Math.round(((ay - y) / TCM) * 10) / 10)]);
  };
  const drag = useDragPoint(W, H, placeCorner, c.working);
  const tap = (e: MouseEvent<SVGSVGElement>) => c.working && placeCorner(...tapAt(e, W, H));
  const [bx, by] = P([problem.c, 0]);
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-lg touch-none select-none cursor-crosshair" onClick={tap} {...drag} role="img" aria-label={t("construct.triangle.label")}>
        <rect x={0} y={0} width={W} height={H} fill="#ffffff" />
        {circles.b && <circle cx={ax} cy={ay} r={problem.b * TCM} fill="none" stroke="#0284c7" strokeWidth={1.5} strokeDasharray="6 5" pointerEvents="none" />}
        {circles.a && <circle cx={bx} cy={by} r={problem.a * TCM} fill="none" stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="6 5" pointerEvents="none" />}
        <line x1={ax} y1={ay} x2={bx} y2={by} stroke={INK} strokeWidth={3} />
        {corner && (
          <polygon points={[[ax, ay], [bx, by], P(corner)].map((p) => p.join(",")).join(" ")} fill="#bae6fd" fillOpacity={0.5} stroke={c.color} strokeWidth={2.5} pointerEvents="none" />
        )}
        {[["A", ax, ay], ["B", bx, by]].map(([l, x, y]) => (
          <g key={l as string}>
            <circle cx={x as number} cy={y as number} r={4} fill={INK} />
            <text x={(x as number) + (l === "A" ? -12 : 12)} y={(y as number) + 4} textAnchor="middle" fontSize={15} fontWeight={800} fill={INK}>
              {l}
            </text>
          </g>
        ))}
        <text x={(ax + bx) / 2} y={ay + 16} textAnchor="middle" fontSize={13} fontWeight={700} fill={INK}>
          {problem.c} cm
        </text>
        {corner && <circle cx={P(corner)[0]} cy={P(corner)[1]} r={5} fill={c.color} pointerEvents="none" />}
      </svg>
      {c.working && (
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => setCircles((s) => ({ ...s, b: !s.b }))} aria-pressed={circles.b} className="h-11 px-4 rounded-full border-2 border-sky-300 bg-white text-sm font-bold">
            {t("construct.triangle.compassA", { r: problem.b })}
          </button>
          <button type="button" onClick={() => setCircles((s) => ({ ...s, a: !s.a }))} aria-pressed={circles.a} className="h-11 px-4 rounded-full border-2 border-violet-300 bg-white text-sm font-bold">
            {t("construct.triangle.compassB", { r: problem.a })}
          </button>
        </div>
      )}
      {c.footer(corner !== null, () =>
        c.judge(checkTriangle(problem, corner!), () => {
          setCircles({ a: true, b: true });
          setCorner(thirdCorner(problem));
        })
      )}
    </>
  );
}

/**
 * Constructing with ruler, protractor and compasses - a line, an angle, a
 * triangle - by tapping where it goes. Rätta checks it and names the slip
 * (counted from the ruler's 0, read on the other scale); after the allowed
 * tries the construction is shown.
 */
export function ConstructPlayer({ problem, onSolved }: { problem: ConstructProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{say(problem.prompt)}</p>
      {problem.task === "line" ? (
        <LineConstruction problem={problem} onSolved={onSolved} />
      ) : problem.task === "angle" ? (
        <AngleConstruction problem={problem} onSolved={onSolved} />
      ) : (
        <TriangleConstruction problem={problem} onSolved={onSolved} />
      )}
    </div>
  );
}
