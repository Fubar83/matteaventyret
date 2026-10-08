import type { ReactNode } from "react";
import type { StageMeta } from "../stages";
import { kenney, SpriteImage } from "./Sprite";
import type { SpriteName } from "./spriteNames";

/**
 * A little world above each question for the younger levels (åk 1-6): a
 * meadow, the sea, space, a farm, slime land, a forest, winter. Kenney's
 * backgrounds (kenney.nl, CC0) with his animals and creatures peeking out
 * and bobbing, clouds and fish drifting - so a round feels like a place.
 */
export type ThemeId = "meadow" | "ocean" | "space" | "farm" | "candy" | "forest" | "winter";
export const THEME_IDS: readonly ThemeId[] = ["meadow", "ocean", "space", "farm", "candy", "forest", "winter"];

/** Each area of the curriculum has its own world; word problems wander between them. */
const BY_PATH: Record<string, ThemeId> = {
  tal: "space",
  plusminus: "meadow",
  ganger: "farm",
  decimal: "ocean",
  statistik: "candy",
  algebra: "forest",
  geometri: "winter",
  vardag: "meadow",
};

export function themeForStage(stage: StageMeta): ThemeId {
  if (BY_PATH[stage.path]) return BY_PATH[stage.path];
  // Text problems: a different world on each level.
  const n = [...stage.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return THEME_IDS[n % THEME_IDS.length];
}

const W = 600;
const H = 170;

/** A sprite placed in the scene by its centre, `size` its height; optionally bobbing. */
function S({ name, x, y, size, bob, delay = 0, flip = false }: { name: SpriteName; x: number; y: number; size: number; bob?: boolean; delay?: number; flip?: boolean }) {
  return <SpriteImage name={name} x={x - size / 2} y={y - size / 2} size={size} className={bob ? "anim-bob" : undefined} delay={delay} flip={flip} />;
}

/** Kenney's landscape tiles side by side: a background 256 high, scaled to `size`, its top at `y`. */
function Tiles({ name, y, size }: { name: SpriteName; y: number; size: number }) {
  return (
    <>
      {Array.from({ length: Math.ceil(W / size) + 1 }, (_, i) => (
        <image key={i} href={kenney(name)} x={i * size - 1} y={y} width={size + 2} height={size} preserveAspectRatio="none" />
      ))}
    </>
  );
}

/** A drifting cloud, from the clouds background's own puffs. */
function Cloud({ y, scale, dur, delay }: { y: number; scale: number; dur: number; delay: number }) {
  return (
    <g className="anim-drift" style={{ animationDuration: `${dur}s`, animationDelay: `${delay}s` }}>
      <g transform={`translate(0 ${y}) scale(${scale})`} fill="#fff" opacity={0.95}>
        <ellipse cx={40} cy={20} rx={34} ry={14} />
        <ellipse cx={22} cy={14} rx={18} ry={14} />
        <ellipse cx={50} cy={8} rx={20} ry={16} />
        <ellipse cx={66} cy={18} rx={16} ry={11} />
      </g>
    </g>
  );
}

/** Sky and clouds, then a hill background - the Kenney landscape. */
function Landscape({ hills }: { hills: SpriteName }) {
  return (
    <>
      <rect width={W} height={H} fill="#C3E3FF" />
      <Cloud y={12} scale={0.7} dur={70} delay={-20} />
      <Cloud y={34} scale={0.5} dur={95} delay={-60} />
      <Tiles name={hills} y={-34} size={220} />
    </>
  );
}

const SCENES: Record<ThemeId, () => ReactNode> = {
  meadow: () => (
    <>
      <Landscape hills="bg-hills" />
      <S name="bush" x={70} y={130} size={40} />
      <S name="grass" x={170} y={137} size={26} />
      <S name="mushroom-red" x={420} y={137} size={26} />
      <S name="grass" x={520} y={136} size={28} />
      <S name="rabbit" x={300} y={121} size={58} bob />
      <S name="snail" x={470} y={133} size={34} />
      <S name="ladybug" x={120} y={136} size={28} />
      <S name="bee" x={210} y={70} size={34} bob delay={0.6} />
      <S name="bee" x={520} y={60} size={28} bob delay={1.4} flip />
    </>
  ),
  farm: () => (
    <>
      <Landscape hills="bg-hills" />
      {/* A fence along the field, the animals looking over it. */}
      <S name="cow" x={110} y={98} size={52} bob />
      <S name="pig" x={250} y={102} size={46} bob delay={0.5} />
      <S name="horse" x={390} y={96} size={50} bob delay={1} />
      <S name="goat" x={520} y={100} size={46} bob delay={1.5} />
      {Array.from({ length: 10 }, (_, i) => (
        <SpriteImage key={i} name="fence" x={i * 62 - 6} y={108} size={44} />
      ))}
      <S name="chicken" x={190} y={133} size={34} bob delay={0.3} />
      <S name="chick" x={230} y={137} size={26} bob delay={0.9} />
      <S name="sign" x={455} y={133} size={34} />
    </>
  ),
  forest: () => (
    <>
      <Landscape hills="bg-trees" />
      <S name="bush" x={60} y={128} size={44} />
      <S name="owl" x={150} y={60} size={46} bob />
      <S name="bear" x={290} y={120} size={60} bob delay={0.4} />
      <S name="moose" x={440} y={121} size={58} bob delay={1} />
      <S name="mushroom-red" x={370} y={137} size={26} />
      <S name="mushroom-brown" x={210} y={137} size={26} />
      <S name="sloth" x={550} y={70} size={40} bob delay={1.6} />
      <S name="frog-jump" x={520} y={134} size={32} />
    </>
  ),
  candy: () => (
    <>
      <Landscape hills="bg-mushrooms" />
      <S name="slime-green" x={110} y={132} size={36} bob />
      <S name="slime-red" x={230} y={133} size={34} bob delay={0.5} />
      <S name="slime-spike" x={360} y={131} size={38} bob delay={1} />
      <S name="slime-block" x={480} y={132} size={36} bob delay={1.5} />
      <S name="gem-blue" x={170} y={70} size={24} bob delay={0.2} />
      <S name="gem-red" x={300} y={50} size={24} bob delay={0.8} />
      <S name="star" x={420} y={66} size={28} bob delay={1.2} />
      <S name="heart" x={540} y={52} size={24} bob delay={0.4} />
    </>
  ),
  ocean: () => (
    <>
      <rect width={W} height={H} fill="url(#oceanWater)" />
      <rect width={W} height={26} fill="#bae6fd" />
      <path d={`M0 26 q 25 -8 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 V 34 H 0 Z`} fill="#38bdf8" />
      <path d={`M0 158 Q 120 146 240 156 T ${W} 150 V ${H} H 0 Z`} fill="#fde68a" />
      <S name="seaweed-green" x={40} y={120} size={60} />
      <S name="seaweed-pink" x={200} y={128} size={44} />
      <S name="sea-rock" x={330} y={132} size={36} />
      <S name="seaweed-orange" x={420} y={126} size={48} />
      <S name="seaweed-green-b" x={570} y={120} size={60} />
      <S name="sea-fish-orange" x={120} y={80} size={36} bob />
      <S name="sea-fish-blue" x={300} y={100} size={34} bob delay={0.7} flip />
      <S name="sea-fish-pink" x={480} y={70} size={32} bob delay={1.3} />
      <S name="whale" x={380} y={62} size={44} bob delay={0.4} />
      <S name="bubble" x={140} y={50} size={14} bob delay={0.2} />
      <S name="bubble-small" x={320} y={60} size={10} bob delay={0.9} />
      <S name="bubble" x={500} y={110} size={12} bob delay={1.5} />
    </>
  ),
  space: () => (
    <>
      <rect width={W} height={H} fill="url(#spaceSky)" />
      {Array.from({ length: 50 }, (_, i) => (
        <circle key={i} cx={(i * 113) % W} cy={(i * 37) % H} r={0.8 + (i % 3) * 0.5} fill="#fff" className="anim-twinkle" style={{ animationDelay: `${(i % 8) * 0.35}s` }} />
      ))}
      <circle cx={520} cy={50} r={26} fill="#f472b6" stroke="#2b2b3b" strokeWidth={3} />
      <ellipse cx={520} cy={50} rx={44} ry={8} fill="none" stroke="#fbcfe8" strokeWidth={4} transform="rotate(-18 520 50)" />
      <circle cx={70} cy={130} r={20} fill="#60a5fa" stroke="#2b2b3b" strokeWidth={3} />
      <S name="ufo-green" x={180} y={60} size={54} bob />
      <S name="ufo-pink" x={360} y={86} size={50} bob delay={0.8} />
      <S name="astronaut-yellow" x={270} y={129} size={42} bob delay={0.4} />
      <S name="astronaut-pink" x={460} y={131} size={38} bob delay={1.2} />
      <S name="star" x={590} y={140} size={20} bob delay={0.6} />
    </>
  ),
  winter: () => (
    <>
      <rect width={W} height={H} fill="#dbeafe" />
      <Tiles name="bg-fade-hills" y={-60} size={230} />
      <path d={`M0 128 Q 150 108 300 126 T ${W} 120 V ${H} H 0 Z`} fill="#ffffff" stroke="#c7d7ea" strokeWidth={3} />
      <S name="penguin" x={150} y={124} size={52} bob />
      <S name="walrus" x={320} y={122} size={56} bob delay={0.6} />
      <S name="panda" x={480} y={125} size={50} bob delay={1.1} />
      <S name="snow" x={60} y={130} size={40} />
      <S name="snow" x={560} y={130} size={40} />
      {Array.from({ length: 30 }, (_, i) => (
        <circle key={i} cx={(i * 71) % W} cy={(i * 29) % 110} r={1.5 + (i % 3) * 0.7} fill="#fff" className="anim-bob" style={{ animationDelay: `${(i % 6) * 0.4}s` }} />
      ))}
    </>
  ),
};

/** The world, as a banner above the question. */
export function ThemeBanner({ theme, children }: { theme: ThemeId; children?: ReactNode }) {
  return (
    <div className="relative w-full max-w-2xl h-[150px] sm:h-[170px] rounded-3xl overflow-hidden shadow-lg border-4 border-white" data-theme-scene={theme}>
      <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id="oceanWater" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#38bdf8" />
            <stop offset="1" stopColor="#1e40af" />
          </linearGradient>
          <linearGradient id="spaceSky" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1e1b4b" />
            <stop offset="1" stopColor="#4c1d95" />
          </linearGradient>
        </defs>
        {SCENES[theme]()}
      </svg>
      {children && <div className="relative h-full flex items-center justify-center p-3">{children}</div>}
    </div>
  );
}
