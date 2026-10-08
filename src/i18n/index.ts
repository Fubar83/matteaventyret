import { wordTexts } from "../engine/wordProblems";
import en from "./en.json";
import sv from "./sv.json";

export type Locale = "sv" | "en";

/** The word problems' stories live with their maths (engine/wordProblems.ts) and are merged in here. */
const DICTS: Record<Locale, Record<string, string>> = { sv: { ...sv, ...wordTexts("sv") }, en: { ...en, ...wordTexts("en") } };

// Swedish is the default and only active locale until the language toggle
// lands (build order milestone 9). Both dictionaries are kept in sync now
// so that toggle only needs to flip this variable.
let currentLocale: Locale = "sv";

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

/**
 * A text in the current language, its {placeholders} filled in. A value that
 * starts with "@" is itself a key, translated first - how a word problem
 * from the engine (which knows no language) says "äpplen" or "apples".
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const template = DICTS[currentLocale][key] ?? DICTS.sv[key] ?? key;
  if (!vars) return template;
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, typeof v === "string" && v.startsWith("@") ? t(v.slice(1)) : String(v)), template);
}
