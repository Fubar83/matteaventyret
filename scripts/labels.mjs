/**
 * Plain-JS mirror of src/recognition/labels.ts, for the Node bootstrap
 * script (plain Node has no TS loader here). Both files derive their
 * LABELS/CATEGORIES from the exact same src/recognition/characters.json -
 * see that file to add, remove, or resource a character.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CHARACTERS = JSON.parse(readFileSync(path.join(__dirname, "..", "src", "recognition", "characters.json"), "utf8"));

const CATEGORY_NAMES = ["digits", "math", "lowercase", "uppercase"];

function buildCategories() {
  const byCategory = { digits: [], math: [], lowercase: [], uppercase: [] };
  for (const entry of CHARACTERS) {
    if (!CATEGORY_NAMES.includes(entry.category)) {
      throw new Error(`characters.json: unknown category ${JSON.stringify(entry.category)} for character ${JSON.stringify(entry.char)}`);
    }
    byCategory[entry.category].push(entry.char);
  }
  return byCategory;
}

export const CATEGORIES = buildCategories();

export const LABELS = CHARACTERS.map((entry) => entry.char);
