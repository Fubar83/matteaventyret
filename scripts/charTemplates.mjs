/**
 * Geometric character templates used only to bootstrap the recognizer before
 * any real handwriting has been collected (see build brief: real samples
 * need parental consent and come from Träningsverkstan). Each character is a
 * list of polylines (arrays of {x,y} points) on a 28x28 grid, later randomly
 * rotated/scaled/jittered/thickened for variety (see rasterize.mjs). This is
 * a rough placeholder, not a substitute for training on real handwriting -
 * some shapes (especially look-alike upper/lowercase letter pairs) are only
 * roughly distinguished here; real samples collected via the trainer's
 * collect/test tabs are what actually teaches the model to tell them apart.
 */

function line(x1, y1, x2, y2, steps = 4) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
  }
  return pts;
}

function arc(cx, cy, rx, ry, startDeg, endDeg, steps = 16) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = startDeg + ((endDeg - startDeg) * i) / steps;
    const rad = (t * Math.PI) / 180;
    pts.push({ x: cx + rx * Math.cos(rad), y: cy + ry * Math.sin(rad) });
  }
  return pts;
}

/** A tiny ring, used for accent dots (ä, ö, ...) and periods. */
function dot(x, y, r = 1.1) {
  return arc(x, y, r, r, 0, 360, 8);
}

/** A freeform polyline through explicit points, e.g. for M/W/N/w/v. */
function poly(points) {
  return points.map((p) => ({ x: p[0], y: p[1] }));
}

// --- Digits (unchanged from the original bootstrap set) ---------------
const DIGITS = {
  0: [arc(14, 14, 8, 12, 0, 360, 32)],
  1: [line(14, 4, 14, 24), line(10, 8, 14, 4)],
  2: [arc(14, 9, 7, 5, -160, 40, 16), line(19, 12, 6, 24), line(6, 24, 22, 24)],
  3: [arc(12, 9, 7, 5, -140, 100, 16), arc(12, 18, 7, 6, -80, 140, 16)],
  4: [line(17, 4, 6, 18), line(6, 18, 22, 18), line(17, 4, 17, 24)],
  5: [line(20, 5, 8, 5), line(8, 5, 8, 13), arc(14, 18, 7, 6, -170, 110, 16)],
  6: [line(17, 5, 9, 16), arc(14, 19, 7, 6, 0, 360, 24)],
  7: [line(6, 5, 22, 5), line(22, 5, 11, 24)],
  8: [arc(14, 10, 6, 5, 0, 360, 20), arc(14, 19, 7, 6, 0, 360, 24)],
  9: [arc(14, 9, 7, 6, 0, 360, 24), line(19, 9, 12, 24)],
};

// --- Uppercase letters, cap-height y:4-24, x:6-22 ----------------------
const UPPER = {
  A: [line(6, 24, 14, 4), line(14, 4, 22, 24), line(9, 16, 19, 16)],
  B: [line(7, 4, 7, 24), arc(7, 9, 7, 5, -100, 100, 12), arc(7, 19, 8, 6, -100, 100, 12)],
  C: [arc(14, 14, 7, 9, 50, 310, 20)],
  D: [line(7, 4, 7, 24), arc(7, 14, 9, 10, -90, 90, 20)],
  E: [line(7, 4, 7, 24), line(7, 4, 20, 4), line(7, 14, 16, 14), line(7, 24, 20, 24)],
  F: [line(7, 4, 7, 24), line(7, 4, 20, 4), line(7, 14, 16, 14)],
  G: [arc(14, 14, 7, 9, 50, 340, 20), line(21, 14, 21, 19), line(21, 19, 14, 19)],
  H: [line(7, 4, 7, 24), line(20, 4, 20, 24), line(7, 14, 20, 14)],
  I: [line(14, 4, 14, 24), line(9, 4, 19, 4), line(9, 24, 19, 24)],
  J: [line(18, 4, 18, 18), arc(13, 18, 5, 5, 0, 180, 12)],
  K: [line(7, 4, 7, 24), line(20, 4, 7, 14), line(7, 14, 20, 24)],
  L: [line(7, 4, 7, 24), line(7, 24, 20, 24)],
  M: [poly([[6, 24], [6, 4], [14, 16], [22, 4], [22, 24]])],
  N: [poly([[7, 24], [7, 4], [21, 24], [21, 4]])],
  O: [arc(14, 14, 8, 10, 0, 360, 28)],
  P: [line(7, 4, 7, 24), line(7, 4, 15, 4), arc(15, 9, 6, 5, -90, 90, 12), line(15, 14, 7, 14)],
  Q: [arc(14, 13, 8, 9, 0, 360, 28), line(17, 19, 22, 25)],
  R: [line(7, 4, 7, 24), line(7, 4, 15, 4), arc(15, 9, 6, 5, -90, 90, 12), line(15, 14, 7, 14), line(11, 14, 20, 24)],
  S: [arc(14, 9, 6, 5, 130, 410, 16), arc(14, 19, 6, 6, -50, 230, 16)],
  T: [line(6, 4, 22, 4), line(14, 4, 14, 24)],
  U: [line(7, 4, 7, 17), arc(14, 17, 7, 6, 180, 360, 16), line(21, 17, 21, 4)],
  V: [line(6, 4, 14, 24), line(14, 24, 22, 4)],
  W: [poly([[6, 4], [10, 24], [14, 10], [18, 24], [22, 4]])],
  X: [line(6, 4, 22, 24), line(22, 4, 6, 24)],
  Y: [line(6, 4, 14, 14), line(22, 4, 14, 14), line(14, 14, 14, 24)],
  Z: [line(6, 4, 22, 4), line(22, 4, 6, 24), line(6, 24, 22, 24)],
};

// --- Lowercase letters, x-height y:11-24, ascenders to y:5, descenders to y:26, x:7-21 ---
const LOWER = {
  a: [arc(15, 18, 6, 6, 0, 360, 20), line(21, 12, 21, 24)],
  b: [line(7, 4, 7, 24), arc(13, 18, 6, 6, 0, 360, 20)],
  c: [arc(14, 18, 6, 7, 50, 310, 16)],
  d: [arc(15, 18, 6, 6, 0, 360, 20), line(21, 4, 21, 24)],
  e: [arc(14, 18, 6, 6, 0, 360, 20), line(8, 18, 20, 18)],
  f: [line(14, 6, 14, 24), arc(16, 6, 3, 3, 90, 270, 10), line(9, 15, 18, 15)],
  g: [arc(14, 18, 6, 6, 0, 360, 20), line(20, 12, 20, 26), arc(15, 26, 5, 4, 0, 180, 10)],
  h: [line(7, 4, 7, 24), arc(14, 17, 7, 7, 180, 360, 14), line(21, 17, 21, 24)],
  i: [line(14, 11, 14, 24), dot(14, 6)],
  j: [line(15, 11, 15, 26), arc(11, 26, 4, 4, 0, 180, 10), dot(15, 6)],
  k: [line(7, 4, 7, 24), line(19, 11, 7, 18), line(7, 18, 19, 24)],
  l: [line(14, 4, 14, 24)],
  m: [line(7, 11, 7, 24), arc(11, 15, 4, 6, 180, 360, 10), line(15, 11, 15, 24), arc(19, 15, 4, 6, 180, 360, 10), line(23, 11, 23, 24)],
  n: [line(7, 11, 7, 24), arc(14, 15, 7, 6, 180, 360, 14), line(21, 11, 21, 24)],
  o: [arc(14, 17, 7, 6, 0, 360, 20)],
  p: [arc(14, 17, 6, 6, 0, 360, 20), line(8, 11, 8, 26)],
  q: [arc(14, 17, 6, 6, 0, 360, 20), line(20, 11, 20, 26)],
  r: [line(8, 11, 8, 24), arc(8, 13, 5, 4, 180, 340, 10)],
  s: [arc(14, 14, 5, 4, 60, 320, 12), arc(14, 21, 5, 4, -120, 140, 12)],
  t: [line(14, 6, 14, 22), arc(15, 22, 3, 3, 180, 360, 8), line(9, 11, 19, 11)],
  u: [line(7, 11, 7, 18), arc(14, 18, 7, 6, 180, 360, 14), line(21, 11, 21, 24)],
  v: [line(7, 11, 14, 24), line(21, 11, 14, 24)],
  w: [poly([[7, 11], [10, 24], [14, 14], [18, 24], [21, 11]])],
  x: [line(7, 11, 21, 24), line(21, 11, 7, 24)],
  y: [line(7, 11, 14, 20), line(21, 11, 10, 26)],
  z: [line(7, 11, 21, 11), line(21, 11, 7, 24), line(7, 24, 21, 24)],
};

// --- Swedish accented letters: base shape plus ring/dots above ---------
const SWEDISH_LOWER = {
  å: [...LOWER.a, dot(15, 4, 1.4)],
  ä: [...LOWER.a, dot(11, 5), dot(19, 5)],
  ö: [...LOWER.o, dot(10, 8), dot(18, 8)],
};
const SWEDISH_UPPER = {
  Å: [...UPPER.A, dot(14, 1, 1.6)],
  Ä: [...UPPER.A, dot(9, 1), dot(19, 1)],
  Ö: [...UPPER.O, dot(9, 1), dot(19, 1)],
};

// --- Math signs, x:6-22, y:5-23 -----------------------------------------
const MATH = {
  "+": [line(14, 5, 14, 23), line(5, 14, 23, 14)],
  "-": [line(6, 14, 22, 14)],
  "×": [line(6, 6, 22, 22), line(22, 6, 6, 22)],
  "÷": [line(6, 14, 22, 14), dot(14, 7), dot(14, 21)],
  "=": [line(6, 10, 22, 10), line(6, 18, 22, 18)],
  "<": [line(20, 6, 8, 14), line(8, 14, 20, 22)],
  ">": [line(8, 6, 20, 14), line(20, 14, 8, 22)],
  "(": [arc(19, 14, 7, 11, 100, 260, 16)],
  ")": [arc(9, 14, 7, 11, -80, 80, 16)],
  ",": [line(14, 20, 12, 25)],
  ".": [dot(14, 22, 1.3)],
  "/": [line(20, 5, 8, 23)],
};

export const CHAR_TEMPLATES = {
  ...DIGITS,
  ...LOWER,
  ...UPPER,
  ...SWEDISH_LOWER,
  ...SWEDISH_UPPER,
  ...MATH,
};
