/**
 * Mouse cursors for the drawing areas (InkCanvas): the browser's own thin
 * crosshair all but disappears on white paper and dark ink, so each tool gets
 * a cursor drawn for it - dark shapes with a white outline, visible on the
 * page, on the guide boxes and on ink alike.
 *
 *  - pen: a pencil, its tip exactly where the ink goes
 *  - select: an arrow with a small move cross
 *  - erase: an eraser, rubbing out where its corner is
 *
 * Each is an SVG data URL with its hotspot, and a built-in cursor to fall back on.
 */
import type { InkTool } from "./InkCanvas";

const OUTLINE = `stroke="#ffffff" stroke-width="3" stroke-linejoin="round" paint-order="stroke"`;

/** Pencil, pointing down-left: the tip at (3, 29). */
const PEN = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <g ${OUTLINE}>
    <path d="M21 4 L28 11 L11 28 L4 21 Z" fill="#f59e0b"/>
    <path d="M4 21 L11 28 L3 29 Z" fill="#fde68a"/>
    <path d="M24 1 L31 8 L28 11 L21 4 Z" fill="#f472b6"/>
  </g>
  <path d="M21 4 L28 11 L11 28 L4 21 Z M24 1 L31 8 L28 11 L21 4 Z M4 21 L11 28 L3 29 Z" fill="none" stroke="#1e293b" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M3 29 L6 28.5 L3.5 26 Z" fill="#1e293b"/>
</svg>`;

/** Arrow with a four-way move sign: the arrow's point at (3, 2). */
const SELECT = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <path d="M3 2 L3 22 L8 17 L12 26 L15.5 24.5 L11.5 15.5 L18 15.5 Z" fill="#1e293b" ${OUTLINE}/>
  <g ${OUTLINE} fill="#0284c7">
    <path d="M24 15 L27 18.5 L25 18.5 L25 22 L28.5 22 L28.5 20 L32 23 L28.5 26 L28.5 24 L25 24 L25 27.5 L27 27.5 L24 31 L21 27.5 L23 27.5 L23 24 L19.5 24 L19.5 26 L16 23 L19.5 20 L19.5 22 L23 22 L23 18.5 L21 18.5 Z"/>
  </g>
</svg>`;

/** An eraser, tilted: rubbing out with the middle of its lower-left edge (7, 25). */
const ERASE = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <g ${OUTLINE}>
    <path d="M18 3 L29 14 L17 26 L6 15 Z" fill="#f472b6"/>
    <path d="M6 15 L17 26 L13 30 L2 19 Z" fill="#e2e8f0"/>
  </g>
  <path d="M18 3 L29 14 L17 26 L6 15 Z M6 15 L17 26 L13 30 L2 19 Z" fill="none" stroke="#1e293b" stroke-width="1.5" stroke-linejoin="round"/>
</svg>`;

function cursor(svg: string, x: number, y: number, fallback: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " "))}") ${x} ${y}, ${fallback}`;
}

export const INK_CURSORS: Record<InkTool, string> = {
  pen: cursor(PEN, 3, 29, "crosshair"),
  select: cursor(SELECT, 3, 2, "default"),
  erase: cursor(ERASE, 7, 25, "cell"),
};
