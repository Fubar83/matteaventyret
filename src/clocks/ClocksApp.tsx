import { useMemo, useState } from "react";
import { DIGITAL_LOOKS, FACES, hourAngle, minuteAngle, type ClockFaceStyle, type DigitalLook } from "../engine/questions/clock";
import { ClockFace } from "../game/questions/clock/ClockFace";
import { DigitalClock } from "../game/questions/clock/DigitalClock";
import { SkyScene } from "../game/questions/clock/SkyScene";
import { ShopPlayer } from "../game/questions/shop/ShopPlayer";
import { SHOP_QUESTIONS, type ShopStageId } from "../engine/questions/shop";
import { makeRng } from "../engine/rng";
import { ThemeBanner, type ThemeId } from "../game/scenes/ThemeBanner";
import { QuestionScene } from "../game/scenes/QuestionScene";
import { BaseTenBlocks } from "../game/scenes/BaseTenBlocks";
import type { QuestionScene as Scene } from "../engine/questions/written/questionScene";
import { TRAPPAN_QUESTIONS, type Decimal, type TrappanProblem, type TrappanStageId } from "../engine/questions/trappan";
import { TrappanPlayer } from "../game/questions/trappan/TrappanPlayer";
import { PlanFigure, TrappanFigure } from "../game/questions/trappan/TrappanFigure";
import { MulPlayer } from "../game/questions/multiplication/MulPlayer";
import { MUL_GUIDED_QUESTIONS, type MulGuidedProblem, type MulGuidedStageId } from "../engine/questions/multiply";
import { planGuided } from "../mathinput/guidedPlan";
import { t } from "../i18n";

const SCENES: Record<string, Scene> = {
  balance: { kind: "balance", left: [{ kind: "unknown", label: "x" }, { kind: "unknown", label: "x" }, { kind: "weight", value: 3 }], right: [{ kind: "weight", value: 11 }] },
  groups: { kind: "groups", groups: 4, each: 6, thing: "eggs" },
  share: { kind: "share", total: 15, among: 3, thing: "cookies" },
  rounding: { kind: "rounding", numbers: [{ value: 47, step: 10 }, { value: 382, step: 100 }] },
  length: { kind: "units", family: "length", from: "m", to: "cm", value: 3.2 },
  mil: { kind: "units", family: "length", from: "mil", to: "km", value: 4 },
  mass: { kind: "units", family: "mass", from: "ton", to: "kg", value: 2 },
  grams: { kind: "units", family: "mass", from: "g", to: "hg", value: 500 },
  volume: { kind: "units", family: "volume", from: "l", to: "dl", value: 2.5 },
  cubic: { kind: "units", family: "volume", from: "m³", to: "l", value: 2 },
  litre: { kind: "units", family: "volume", from: "dm³", to: "l", value: 60 },
  area: { kind: "units", family: "area", from: "dm²", to: "cm²", value: 3 },
  time: { kind: "units", family: "time", from: "h", to: "min", value: 2.5 },
  missing: { kind: "balance", left: [{ kind: "unknown", label: "?" }, { kind: "weight", value: 7 }], right: [{ kind: "weight", value: 15 }] },
};

type Variant = { kind: "analog"; face: ClockFaceStyle } | { kind: "digital"; look: DigitalLook };

const VARIANTS: Variant[] = [...FACES.map((face) => ({ kind: "analog" as const, face })), ...DIGITAL_LOOKS.map((look) => ({ kind: "digital" as const, look }))];

const name = (v: Variant) => (v.kind === "analog" ? `Analog · ${v.face.look} · siffror: ${v.face.numerals} · streck: ${v.face.ticks}` : `Digital · ${v.look}`);

/**
 * Every clock the game shows, to look them over: all of them, or one at a
 * time with ?v=3 (the number from the list). Each analog clock can be set
 * by dragging its hands, snapping to whole minutes.
 */
export function ClocksApp() {
  const params = new URLSearchParams(window.location.search);
  // ?sky=17.5: a clock in the sky scene at that time of day. ?shop=1.6.3&seed=4: a shop question.
  // ?world=ocean: a level's world. ?scene=balance|groups|share: a question's picture.
  if (params.has("world")) return <div className="min-h-screen bg-slate-50 p-4 flex justify-center"><ThemeBanner theme={params.get("world") as ThemeId} /></div>;
  if (params.has("scene")) return <div className="min-h-screen bg-slate-50 p-4 flex justify-center"><QuestionScene scene={SCENES[params.get("scene")!]} /></div>;
  if (params.has("blocks")) return <div className="min-h-screen bg-slate-50 p-4 flex justify-center"><BaseTenBlocks number={Number(params.get("blocks"))} highlight={Number(params.get("col") ?? 2)} /></div>;
  if (params.has("mul")) return <MulPreview stage={params.get("mul") as MulGuidedStageId} seed={Number(params.get("seed") ?? 1)} step={params.has("step") ? Number(params.get("step")) : undefined} a={params.get("a")} b={params.get("b")} />;
  if (params.has("trappan")) return <TrappanPreview stage={params.get("trappan") as TrappanStageId} seed={Number(params.get("seed") ?? 1)} step={params.has("step") ? Number(params.get("step")) : undefined} own={ownDivision(params)} />;
  if (params.has("sky")) return <SkyPreview hour={Number(params.get("sky"))} />;
  if (params.has("shop")) return <ShopPreview stage={params.get("shop") as ShopStageId} seed={Number(params.get("seed") ?? 1)} />;
  const one = params.get("v");
  const [time, setTime] = useState({ h: 10, m: 8 });
  const shown = one !== null ? [VARIANTS[Number(one)]].filter(Boolean) : VARIANTS;
  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center gap-6">
      <h1 className="text-xl font-bold text-slate-800">
        Klockor – {String(time.h).padStart(2, "0")}:{String(time.m).padStart(2, "0")}
      </h1>
      <div className="flex flex-wrap gap-6 justify-center">
        {shown.map((v) => (
          <figure key={name(v)} className="flex flex-col items-center gap-2 rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
            {v.kind === "analog" ? (
              <ClockFace
                face={v.face}
                hourDeg={hourAngle(time.h, time.m)}
                minuteDeg={minuteAngle(time.m)}
                size={one !== null ? 360 : 240}
                interactive={{
                  snapMinutes: 1,
                  onMinute: (deg) => setTime((t) => ({ ...t, m: Math.round(deg / 6) % 60 })),
                  onHour: (deg) => setTime((t) => ({ ...t, h: Math.floor(deg / 30) || 12 })),
                }}
              />
            ) : (
              <DigitalClock h={time.h + 7} m={time.m} look={v.look} size={one !== null ? 360 : 260} />
            )}
            <figcaption className="text-xs text-slate-500">{name(v)}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

/** A clock in the sky at a time of day: sun, moon, clouds, the village. */
function SkyPreview({ hour }: { hour: number }) {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return (
    <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center gap-3">
      <SkyScene hour={hour}>
        <div className="rounded-full bg-white/30 p-2 backdrop-blur-[2px] shadow-2xl">
          <ClockFace face={FACES[1]} hourDeg={hourAngle(h, m)} minuteDeg={minuteAngle(m)} size={230} />
        </div>
      </SkyScene>
    </div>
  );
}

/** A shop question, as a round shows it. */
/** "125,25" as written: its digits and how many come after the comma. */
const asDecimal = (text: string): Decimal => {
  const [whole, frac = ""] = text.split(/[,.]/);
  return { digits: (whole + frac).replace(/^0+(?=\d)/, ""), decimals: frac.length };
};

/** `&a=125,25&b=12,7&round=1` (or `&rest`): a division of your own instead of a generated one. */
function ownDivision(params: URLSearchParams): TrappanProblem | undefined {
  const a = params.get("a");
  const b = params.get("b");
  if (!a || !b) return undefined;
  const divisor = asDecimal(b);
  const round = params.get("round");
  return { stageId: params.get("trappan") as TrappanStageId, kind: "trappan", dividend: asDecimal(a), divisor, shift: divisor.decimals, answer: 0, ...(round !== null ? { roundTo: Number(round) } : {}), ...(params.has("rest") ? { withRest: true as const } : {}) };
}

/** `?mul=2.1.6&seed=3` - or `&a=2,5&b=1,3` for a multiplication of your own; `&step=4` opens the board at that step. */
function MulPreview({ stage, seed, step, a, b }: { stage: MulGuidedStageId; seed: number; step?: number; a: string | null; b: string | null }) {
  const problem = useMemo<MulGuidedProblem>(
    () => (a && b ? { stageId: stage, kind: "mulGuided", top: asDecimal(a), bottom: asDecimal(b), answer: 0 } : MUL_GUIDED_QUESTIONS.levels[stage](makeRng(seed))),
    [stage, seed, a, b]
  );
  const plan = useMemo(() => planGuided("×", Number(problem.top.digits), Number(problem.bottom.digits), { top: problem.top.decimals, bottom: problem.bottom.decimals }), [problem]);
  return (
    <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center gap-3">
      <p className="text-sm font-semibold text-slate-500">{stage} · {t(`stage.${stage}`)}</p>
      <div className="flex flex-wrap items-start justify-center gap-6 w-full">
        <div className="w-[560px] rounded-2xl bg-white/70 border border-slate-200 p-4">
          <MulPlayer problem={problem} onSolved={() => {}} first startAt={step} />
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col items-center gap-2">
          <p className="text-sm font-semibold text-slate-500">Färdig uppställning</p>
          <PlanFigure plan={plan} maxWidth={300} />
        </div>
      </div>
    </div>
  );
}

function TrappanPreview({ stage, seed, step, own }: { stage: TrappanStageId; seed: number; step?: number; own?: TrappanProblem }) {
  const problem = useMemo(() => own ?? TRAPPAN_QUESTIONS.levels[stage](makeRng(seed)), [own?.dividend.digits, own?.divisor.digits, stage, seed]);
  return (
    <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center gap-3">
      <p className="text-sm font-semibold text-slate-500">{stage} · {t(`stage.${stage}`)}</p>
      <div className="flex flex-wrap items-start justify-center gap-6 w-full">
        <div className="w-[560px] rounded-2xl bg-white/70 border border-slate-200 p-4">
          <TrappanPlayer problem={problem} onSolved={() => {}} first startAt={step} />
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col items-center gap-2">
          <p className="text-sm font-semibold text-slate-500">Färdig uppställning</p>
          <TrappanFigure problem={problem} maxWidth={360} />
        </div>
      </div>
    </div>
  );
}

function ShopPreview({ stage, seed }: { stage: ShopStageId; seed: number }) {
  const problem = useMemo(() => SHOP_QUESTIONS.levels[stage](makeRng(seed)), [stage, seed]);
  return (
    <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center">
      <ShopPlayer problem={problem} onSolved={() => {}} />
    </div>
  );
}
