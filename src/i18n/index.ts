import en from "./en.json";
import sv from "./sv.json";

export type Locale = "sv" | "en";

const DICTS: Record<Locale, Record<string, string>> = { sv, en };

// Swedish is the default and only active locale until the language toggle
// lands (build order milestone 9). Both dictionaries are kept in sync now
// so that toggle only needs to flip this variable.
let currentLocale: Locale = "sv";

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const template = DICTS[currentLocale][key] ?? DICTS.sv[key] ?? key;
  if (!vars) return template;
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), template);
}
