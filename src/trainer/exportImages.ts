/**
 * Exports every collected sample as a single BMP "contact sheet": one row per
 * character, one tile per sample, rendered through the exact same
 * preprocessStrokes grid the model itself trains and predicts on - so what
 * you see here is what the model sees, useful for spotting bad samples or
 * confirming two characters really do look alike.
 */
import { DEFAULT_CANVAS_SIZE } from "../game/DigitCanvas";
import { preprocessStrokes, RECOGNIZER_INPUT_SIZE } from "../recognition/preprocess";
import type { StoredSample } from "./sampleStore";

const TILE = RECOGNIZER_INPUT_SIZE;
const GAP = 2;
const LABEL_COL_WIDTH = 24;
const MAX_SAMPLES_PER_ROW = 40;

/** Minimal 24-bit uncompressed BMP encoder (BITMAPFILEHEADER + BITMAPINFOHEADER + bottom-up BGR rows). */
function encodeBmp(width: number, height: number, rgba: Uint8ClampedArray): Uint8Array {
  const rowSize = Math.ceil((width * 3) / 4) * 4; // rows are 4-byte aligned
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buf = new ArrayBuffer(fileSize);
  const view = new DataView(buf);

  view.setUint8(0, 0x42); // "B"
  view.setUint8(1, 0x4d); // "M"
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true); // pixel data offset

  view.setUint32(14, 40, true); // DIB header size (BITMAPINFOHEADER)
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // positive = bottom-up rows
  view.setUint16(26, 1, true); // color planes
  view.setUint16(28, 24, true); // bits per pixel
  view.setUint32(30, 0, true); // no compression
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, 2835, true); // ~72 DPI
  view.setInt32(42, 2835, true);

  const bytes = new Uint8Array(buf);
  let writtenRow = 0;
  for (let y = height - 1; y >= 0; y--) {
    let offset = 54 + writtenRow * rowSize;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      bytes[offset++] = rgba[i + 2]; // B
      bytes[offset++] = rgba[i + 1]; // G
      bytes[offset++] = rgba[i]; // R
      // remaining row padding bytes stay 0 (ArrayBuffer default) automatically
    }
    writtenRow++;
  }
  return bytes;
}

export function exportSamplesAsBmp(samples: StoredSample[]): void {
  if (samples.length === 0) return;

  const byLabel = new Map<string, StoredSample[]>();
  for (const s of samples) {
    if (!byLabel.has(s.label)) byLabel.set(s.label, []);
    byLabel.get(s.label)!.push(s);
  }
  const labels = [...byLabel.keys()].sort();
  const cols = Math.min(MAX_SAMPLES_PER_ROW, Math.max(...labels.map((l) => byLabel.get(l)!.length)));
  const rowHeight = TILE + GAP;
  const width = LABEL_COL_WIDTH + cols * (TILE + GAP);
  const height = labels.length * rowHeight + GAP;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "middle";

  labels.forEach((label, row) => {
    const y0 = GAP + row * rowHeight;
    ctx.fillText(label, 4, y0 + TILE / 2);
    const list = byLabel.get(label)!.slice(0, MAX_SAMPLES_PER_ROW);
    list.forEach((sample, col) => {
      const grid = preprocessStrokes(sample.strokes, DEFAULT_CANVAS_SIZE); // Float32Array, ink intensity 0-1
      const x0 = LABEL_COL_WIDTH + col * (TILE + GAP);
      const tileData = ctx.createImageData(TILE, TILE);
      for (let i = 0; i < TILE * TILE; i++) {
        const v = Math.round((1 - grid[i]) * 255); // ink -> black, background -> white
        tileData.data[i * 4] = v;
        tileData.data[i * 4 + 1] = v;
        tileData.data[i * 4 + 2] = v;
        tileData.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(tileData, x0, y0);
    });
  });

  const imageData = ctx.getImageData(0, 0, width, height);
  const bmpBytes = encodeBmp(width, height, imageData.data);
  const blob = new Blob([bmpBytes.buffer as ArrayBuffer], { type: "image/bmp" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `matteaventyret-samples-${Date.now()}.bmp`;
  a.click();
  URL.revokeObjectURL(url);
}
