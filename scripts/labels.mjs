/**
 * Plain-JS mirror of src/recognition/labels.ts, for the Node bootstrap
 * script (plain Node has no TS loader here). Both files derive their
 * labels/CATEGORIES from the exact same src/recognition/characters.json -
 * see that file to add, remove, or resource a character, and labels.ts for
 * the two models ("basic", "full").
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CHARACTERS = JSON.parse(readFileSync(path.join(__dirname, "..", "src", "recognition", "characters.json"), "utf8"));

const CATEGORY_NAMES = ["digits", "math", "lowercase", "uppercase", "mirrored"];

export const MODEL_IDS = ["basic", "full"];

function buildCategories() {
  const byCategory = { digits: [], math: [], lowercase: [], uppercase: [], mirrored: [] };
  for (const entry of CHARACTERS) {
    if (!CATEGORY_NAMES.includes(entry.category)) {
      throw new Error(`characters.json: unknown category ${JSON.stringify(entry.category)} for character ${JSON.stringify(entry.char)}`);
    }
    byCategory[entry.category].push(entry.char);
  }
  return byCategory;
}

export const CATEGORIES = buildCategories();

/** The characters `model` can output, in its class index order. */
export function labelsFor(model) {
  if (!MODEL_IDS.includes(model)) throw new Error(`Unknown model ${JSON.stringify(model)} - expected one of ${MODEL_IDS.join(", ")}`);
  return CHARACTERS.filter((entry) => entry.models.includes(model)).map((entry) => entry.char);
}

/** The full model's labels - every character the engine knows. */
export const LABELS = labelsFor("full");
