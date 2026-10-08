/**
 * Slicing one of Kenney's vector sprite sheets (kenney.nl, CC0) into single
 * sprites. The sheets come out of Flash with no names: either flat paths
 * (the animal pack) or unnamed symbols placed with <use>, and a sprite is
 * often several overlapping pieces (a trunk and a crown). So every path's
 * outline is worked out where it's drawn, pieces whose outlines overlap are
 * joined into one sprite, and each sprite comes out cropped to itself -
 * in reading order, rows top to bottom.
 */
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import parsePath from "parse-svg-path";

/** A sheet's sprites, each a complete SVG cropped to it. */
export function sliceSheet(text) {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const serializer = new XMLSerializer();
  const XLINK = "http://www.w3.org/1999/xlink";
  /** xmldom's node lists, as arrays. */
  const list = (nodes) => Array.from({ length: nodes.length }, (_, i) => nodes.item(i));
  
  // --- Matrices: [a, b, c, d, e, f] as in SVG's matrix(). ---------------------------
  const IDENTITY = [1, 0, 0, 1, 0, 0];
  const multiply = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  
  function parseTransform(text) {
    let m = IDENTITY;
    if (!text) return m;
    for (const [, kind, args] of text.matchAll(/(matrix|translate|scale|rotate)\s*\(([^)]*)\)/g)) {
      const v = args.split(/[\s,]+/).filter(Boolean).map(Number);
      let t = IDENTITY;
      if (kind === "matrix") t = v;
      else if (kind === "translate") t = [1, 0, 0, 1, v[0], v[1] ?? 0];
      else if (kind === "scale") t = [v[0], 0, 0, v[1] ?? v[0], 0, 0];
      else if (kind === "rotate") {
        const r = (v[0] * Math.PI) / 180;
        t = [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
      }
      m = multiply(m, t);
    }
    return m;
  }
  
  /** Every point a path's outline passes (or bends toward), absolute. Control points are included - a slightly generous box is fine here. */
  function pathPoints(d) {
    const pts = [];
    let x = 0;
    let y = 0;
    let sx = 0;
    let sy = 0;
    for (const seg of parsePath(d)) {
      const [cmd, ...a] = seg;
      const rel = cmd === cmd.toLowerCase();
      const C = cmd.toUpperCase();
      const ox = rel ? x : 0;
      const oy = rel ? y : 0;
      if (C === "M" || C === "L" || C === "T") {
        x = ox + a[0];
        y = oy + a[1];
        if (C === "M") [sx, sy] = [x, y];
        pts.push([x, y]);
      } else if (C === "H") {
        x = (rel ? x : 0) + a[0];
        pts.push([x, y]);
      } else if (C === "V") {
        y = (rel ? y : 0) + a[0];
        pts.push([x, y]);
      } else if (C === "Q" || C === "S") {
        pts.push([ox + a[0], oy + a[1]]);
        x = ox + a[2];
        y = oy + a[3];
        pts.push([x, y]);
      } else if (C === "C") {
        pts.push([ox + a[0], oy + a[1]], [ox + a[2], oy + a[3]]);
        x = ox + a[4];
        y = oy + a[5];
        pts.push([x, y]);
      } else if (C === "A") {
        x = ox + a[5];
        y = oy + a[6];
        pts.push([x - a[0], y - a[1]], [x + a[0], y + a[1]]);
      } else if (C === "Z") {
        [x, y] = [sx, sy];
      }
    }
    return pts;
  }
  
  // --- Walk the drawing: every path, where it ends up. -----------------------------
  const symbols = new Map();
  for (const g of list(doc.getElementsByTagName("defs")).flatMap((d) => list(d.childNodes))) {
    if (g.nodeType === 1 && g.getAttribute("id")) symbols.set(g.getAttribute("id"), g);
  }
  
  /** @type {{ markup: string, box: [number, number, number, number] }[]} */
  const pieces = [];
  
  function walk(node, m) {
    if (node.nodeType !== 1) return;
    const tag = node.tagName.replace(/^svg:/, "");
    if (tag === "defs") return;
    const here = multiply(m, parseTransform(node.getAttribute("transform")));
    if (tag === "use") {
      const ref = (node.getAttributeNS(XLINK, "href") || node.getAttribute("xlink:href") || node.getAttribute("href") || "").replace(/^#/, "");
      const symbol = symbols.get(ref);
      if (symbol) for (const child of list(symbol.childNodes)) walk(child, multiply(here, parseTransform(symbol.getAttribute("transform"))));
      return;
    }
    if (tag === "path" || tag === "polygon" || tag === "rect" || tag === "circle" || tag === "ellipse") {
      let pts = [];
      if (tag === "path") pts = pathPoints(node.getAttribute("d") || "");
      else if (tag === "polygon") {
        const v = (node.getAttribute("points") || "").split(/[\s,]+/).filter(Boolean).map(Number);
        for (let i = 0; i + 1 < v.length; i += 2) pts.push([v[i], v[i + 1]]);
      } else if (tag === "rect") {
        const [x, y, w, h] = ["x", "y", "width", "height"].map((k) => Number(node.getAttribute(k) || 0));
        pts = [
          [x, y],
          [x + w, y + h],
        ];
      } else {
        const [cx, cy] = ["cx", "cy"].map((k) => Number(node.getAttribute(k) || 0));
        const rx = Number(node.getAttribute("r") || node.getAttribute("rx") || 0);
        const ry = Number(node.getAttribute("r") || node.getAttribute("ry") || 0);
        pts = [
          [cx - rx, cy - ry],
          [cx + rx, cy + ry],
        ];
      }
      if (pts.length === 0) return;
      const placed = pts.map(([px, py]) => apply(here, px, py));
      const xs = placed.map((p) => p[0]);
      const ys = placed.map((p) => p[1]);
      const clone = node.cloneNode(true);
      clone.removeAttribute("transform");
      const matrix = here.map((v) => Math.round(v * 1000) / 1000).join(" ");
      pieces.push({ markup: `<g transform="matrix(${matrix})">${serializer.serializeToString(clone).replace(/ xmlns(:\w+)?="[^"]*"/g, "")}</g>`, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] });
      return;
    }
    for (const child of list(node.childNodes)) walk(child, here);
  }
  walk(doc.documentElement, IDENTITY);
  
  // --- Join overlapping pieces into sprites. ---------------------------------------
  const parent = pieces.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const PAD = 1.5;
  const touch = (a, b) => a[0] - PAD <= b[2] && b[0] - PAD <= a[2] && a[1] - PAD <= b[3] && b[1] - PAD <= a[3];
  // Pieces sorted by left edge, so only near neighbours are compared.
  const order = pieces.map((_, i) => i).sort((i, j) => pieces[i].box[0] - pieces[j].box[0]);
  for (let k = 0; k < order.length; k++) {
    const a = pieces[order[k]];
    for (let l = k + 1; l < order.length && pieces[order[l]].box[0] <= a.box[2] + PAD; l++) {
      if (touch(a.box, pieces[order[l]].box)) parent[find(order[k])] = find(order[l]);
    }
  }
  const groups = new Map();
  pieces.forEach((p, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  });
  // A sprite joined through another can still miss the third overlapping it via the union only - one more pass over the sprites' boxes.
  let sprites = [...groups.values()].map((ids) => ({ ids, box: ids.reduce((b, i) => [Math.min(b[0], pieces[i].box[0]), Math.min(b[1], pieces[i].box[1]), Math.max(b[2], pieces[i].box[2]), Math.max(b[3], pieces[i].box[3])], [Infinity, Infinity, -Infinity, -Infinity]) }));
  for (let merged = true; merged; ) {
    merged = false;
    outer: for (let i = 0; i < sprites.length; i++) {
      for (let j = i + 1; j < sprites.length; j++) {
        const [a, b] = [sprites[i].box, sprites[j].box];
        // Only boxes clearly inside one another (a crown's highlight inside the crown), not neighbours touching at an edge.
        const inside = (p, q) => p[0] >= q[0] - PAD && p[1] >= q[1] - PAD && p[2] <= q[2] + PAD && p[3] <= q[3] + PAD;
        if (inside(a, b) || inside(b, a)) {
          sprites[i] = { ids: [...sprites[i].ids, ...sprites[j].ids], box: [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])] };
          sprites.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
  }
  // Reading order: rows (by top edge, 40 units apart), then left to right.
  sprites.sort((s, t) => Math.round(s.box[1] / 40) - Math.round(t.box[1] / 40) || s.box[0] - t.box[0]);
  
  
  return sprites
    .map((s) => {
      const [x0, y0, x1, y1] = s.box;
      const [w, h] = [x1 - x0, y1 - y0];
      if (w < 4 || h < 4) return null; // stray specks
      const inner = s.ids.sort((a, b) => a - b).map((i) => pieces[i].markup).join("");
      return { width: w, height: h, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(x0 - 1).toFixed(1)} ${(y0 - 1).toFixed(1)} ${(w + 2).toFixed(1)} ${(h + 2).toFixed(1)}">${inner}</svg>
` };
    })
    .filter(Boolean);
}
