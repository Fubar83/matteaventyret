/**
 * Slices a Kenney vector sheet into numbered sprites, with a contact sheet
 * (index.html) to see which number is which - for choosing the ones to name
 * in scripts/kenney/sprites.json.
 *
 *   node scripts/kenney/slice.mjs <sheet.svg> <outDir>
 */
import fs from "node:fs";
import path from "node:path";
import { sliceSheet } from "./sliceSheet.mjs";

const [, , sheetFile, outDir] = process.argv;
if (!sheetFile || !outDir) {
  console.error("usage: node scripts/kenney/slice.mjs <sheet.svg> <outDir>");
  process.exit(1);
}
const sprites = sliceSheet(fs.readFileSync(sheetFile, "utf8"));
fs.mkdirSync(outDir, { recursive: true });
const cells = sprites.map((s, n) => {
  fs.writeFileSync(path.join(outDir, `${n}.svg`), s.svg);
  return `<figure><img src="${n}.svg"><figcaption>${n} <small>${Math.round(s.width)}×${Math.round(s.height)}</small></figcaption></figure>`;
});
fs.writeFileSync(
  path.join(outDir, "index.html"),
  `<!doctype html><meta charset="utf-8"><style>body{font:12px system-ui;display:flex;flex-wrap:wrap;gap:6px;background:#f8fafc;margin:8px}figure{margin:0;width:110px;height:120px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:4px}img{max-width:100px;max-height:90px}small{color:#94a3b8}</style>${cells.join("")}`
);
console.log(`${path.basename(sheetFile)}: ${sprites.length} sprites in ${outDir}`);
