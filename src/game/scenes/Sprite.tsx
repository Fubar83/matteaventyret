import type { SpriteName } from "./spriteNames";

/**
 * Kenney's sprites (kenney.nl, CC0), built into public/kenney/ by
 * `npm run kenney` - as an <image> inside a scene's SVG, or an <img> in
 * the page.
 */
export const kenney = (name: SpriteName) => `${import.meta.env.BASE_URL}kenney/${name}.svg`;

/** A sprite inside an SVG scene: its top-left at x, y, fitted into a `size` square. */
export function SpriteImage({ name, x, y, size, className, delay = 0, flip = false }: { name: SpriteName; x: number; y: number; size: number; className?: string; delay?: number; flip?: boolean }) {
  return (
    <image
      href={kenney(name)}
      x={x}
      y={y}
      width={size}
      height={size}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ animationDelay: `${delay}s`, transformBox: "fill-box", transformOrigin: "center", ...(flip ? { transform: "scaleX(-1)" } : {}) }}
    />
  );
}

/** A sprite in the page. */
export function Sprite({ name, size, className, title }: { name: SpriteName; size: number; className?: string; title?: string }) {
  return <img src={kenney(name)} alt={title ?? ""} width={size} height={size} className={className} draggable={false} style={{ objectFit: "contain" }} />;
}
