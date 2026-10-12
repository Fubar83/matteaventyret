import { describe, expect, it } from "vitest";
import { WRITTEN_QUESTIONS } from "../../engine/questions/written";
import { CHOICE_QUESTIONS } from "../../engine/questions/choice";
import type {
  ChoiceProblem,
  ChoiceText,
} from "../../engine/questions/choice/problem";
import { SORT_QUESTIONS } from "../../engine/questions/sort";
import { BALANCE_QUESTIONS } from "../../engine/questions/balance";
import { BLOCKS_QUESTIONS } from "../../engine/questions/blocks";
import { CONSTRUCT_QUESTIONS } from "../../engine/questions/construct";
import { EXPERIMENT_QUESTIONS } from "../../engine/questions/experiment";
import { MATCH_QUESTIONS } from "../../engine/questions/match";
import { GRID_QUESTIONS } from "../../engine/questions/grid";
import { NUMBER_LINE_QUESTIONS } from "../../engine/questions/numberLine";
import type { SortProblem } from "../../engine/questions/sort/problem";
import { makeRng } from "../../engine/rng";
import { textIn } from "../../i18n";
import en from "../../i18n/en.json";
import sv from "../../i18n/sv.json";
import { PATHS, STAGES } from "../stages";

const dicts = {
  sv: sv as Record<string, string>,
  en: en as Record<string, string>,
};
const missingIn = (key: string) =>
  Object.entries(dicts)
    .filter(([, d]) => !(key in d))
    .map(([lang]) => lang);

describe("every text the game shows exists in Swedish and English", () => {
  it("both languages have exactly the same keys", () => {
    expect(Object.keys(sv).sort()).toEqual(Object.keys(en).sort());
  });

  it("every stage's title", () => {
    for (const stage of STAGES)
      expect(missingIn(stage.titleKey), stage.titleKey).toEqual([]);
  });

  it("every path's name", () => {
    for (const p of PATHS) expect(missingIn(p.nameKey), p.nameKey).toEqual([]);
  });

  it("every written question's prompt and tip - word problems' stories included - with every {placeholder} filled", () => {
    const rng = makeRng(11);
    for (const [stage, gen] of Object.entries(WRITTEN_QUESTIONS.levels)) {
      for (let i = 0; i < 30; i++) {
        const p = gen(rng);
        for (const key of [p.promptKey, p.tipKey]) {
          const missing = (["sv", "en"] as const).filter(
            (lang) => textIn(lang, key) === undefined,
          );
          expect(missing, `${stage}: ${key}`).toEqual([]);
        }
        const placeholders = [
          ...textIn("sv", p.promptKey)!.matchAll(/\{(\w+)\}/g),
        ].map((m) => m[1]);
        for (const name of placeholders)
          expect(
            p.promptVars ?? {},
            `${stage}: ${p.promptKey} {${name}}`,
          ).toHaveProperty(name);
      }
    }
  });

  it("every single-choice and sorting question's texts - question, options, reasons, tip, explanation, program lines, and the words in their values", () => {
    const rng = makeRng(12);
    const textsOf = (p: ChoiceProblem): ChoiceText[] => [
      p.prompt,
      p.tip,
      p.explanation,
      ...(p.whyNot ?? []).filter((w): w is ChoiceText => w !== null),
      ...p.options.flatMap((o) => ("text" in o ? [o.text] : [])),
      // A program's lines are texts too ("om {v} är jämnt:").
      ...(p.scene?.kind === "code"
        ? p.scene.lines.map((l) => ({ key: l.key, vars: l.vars }))
        : []),
    ];
    const sortTexts = (p: SortProblem): ChoiceText[] => [
      p.prompt,
      p.tip,
      p.explanation,
      ...(p.kind === "sortGroups"
        ? [
            ...p.why.filter((w): w is ChoiceText => w !== null),
            ...p.groups.flatMap((g) => ("text" in g ? [g.text] : [])),
          ]
        : p.ends),
      ...p.items.flatMap((o) => ("text" in o ? [o.text] : [])),
    ];
    const levels: [string, () => ChoiceText[]][] = [
      ...Object.entries(CHOICE_QUESTIONS.levels).map(
        ([stage, gen]) =>
          [stage, () => textsOf(gen(rng))] as [string, () => ChoiceText[]],
      ),
      ...Object.entries(SORT_QUESTIONS.levels).map(
        ([stage, gen]) =>
          [stage, () => sortTexts(gen(rng))] as [string, () => ChoiceText[]],
      ),
      ...Object.entries(NUMBER_LINE_QUESTIONS.levels).map(
        ([stage, gen]) =>
          [
            stage,
            () => {
              const p = gen(rng);
              return [p.prompt, p.tip, p.explanation];
            },
          ] as [string, () => ChoiceText[]],
      ),
      ...Object.entries(GRID_QUESTIONS.levels).map(
        ([stage, gen]) =>
          [
            stage,
            () => {
              const p = gen(rng);
              return [
                p.prompt,
                p.tip,
                p.explanation,
                ...(p.kind === "gridPoints" ? p.slips.map((s) => s.why) : []),
              ];
            },
          ] as [string, () => ChoiceText[]],
      ),
      // The other new types: their question, help, and every text an option or a reason has.
      ...[MATCH_QUESTIONS, BLOCKS_QUESTIONS, BALANCE_QUESTIONS, EXPERIMENT_QUESTIONS, CONSTRUCT_QUESTIONS].flatMap((type) =>
        Object.entries(type.levels).map(
          ([stage, gen]) =>
            [
              stage,
              () => {
                const p = (gen as (r: typeof rng) => { prompt: ChoiceText; tip: ChoiceText; explanation: ChoiceText } & Record<string, unknown>)(rng);
                const options = (x: unknown) => ((x as { options?: { text?: ChoiceText }[] }).options ?? []).flatMap((o) => (o.text ? [o.text] : []));
                const reasons = (x: unknown) => ((x as { whyNot?: (ChoiceText | null)[] }).whyNot ?? []).filter((w): w is ChoiceText => w !== null);
                const cards = ((p.cards as { option: { text?: ChoiceText } }[] | undefined) ?? []).flatMap((c) => (c.option.text ? [c.option.text] : []));
                // An experiment has no question of its own: its questions are the guess and the one after.
                return [p.prompt, p.tip, p.explanation, ...cards, ...(p.predict ? [(p.predict as { prompt: ChoiceText }).prompt, ...options(p.predict), ...reasons(p.predict)] : [])].filter((x): x is ChoiceText => !!x);
              },
            ] as [string, () => ChoiceText[]],
        ),
      ),
    ];
    for (const [stage, texts] of levels) {
      for (let i = 0; i < 60; i++) {
        for (const { key, vars } of texts()) {
          // A value starting with "@" is a key itself ("@weekday.2").
          const keys = [
            key,
            ...Object.values(vars ?? {}).flatMap((v) =>
              typeof v === "string" && v.startsWith("@") ? [v.slice(1)] : [],
            ),
          ];
          for (const k of keys)
            expect(
              (["sv", "en"] as const).filter(
                (lang) => textIn(lang, k) === undefined,
              ),
              `${stage}: ${k}`,
            ).toEqual([]);
          const placeholders = [
            ...textIn("sv", key)!.matchAll(/\{(\w+)\}/g),
          ].map((m) => m[1]);
          for (const name of placeholders)
            expect(vars ?? {}, `${stage}: ${key} {${name}}`).toHaveProperty(
              name,
            );
        }
      }
    }
  });
});
