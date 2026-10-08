import { useState } from "react";
import type { Stroke } from "../recognition/preprocess";
import { addTestCase, clearTestCases, downloadTestCases, loadTestCases } from "./testCases";

/**
 * Collecting test examples (testCases.ts): rätta the reading in the editor
 * first, then save - the ink and what it really says. Download them for
 * data/kids/ and run `npm run benchmark:kids`.
 */
export function TestCaseSaver({ strokes, expected, read, level, template }: { strokes: () => Stroke[]; expected: string; read: string; level: number; template: string }) {
  const [count, setCount] = useState(() => loadTestCases().length);
  const [saved, setSaved] = useState(false);

  return (
    <div className="w-full flex flex-col items-center gap-2 border-t border-slate-100 pt-3">
      <p className="text-xs text-slate-400 text-center max-w-md">
        Samla testexempel: rätta läsningen ovan om något blev fel, och spara. Ladda ner dem till data/kids/ och kör npm run benchmark:kids.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          disabled={!expected || saved}
          onClick={() => {
            setCount(addTestCase({ expected, read, level, template, strokes: strokes() }));
            setSaved(true);
            setTimeout(() => setSaved(false), 1200);
          }}
          className="px-3 h-9 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-40"
        >
          {saved ? "Sparat!" : "Spara som testexempel"}
        </button>
        <button type="button" disabled={count === 0} onClick={downloadTestCases} className="px-3 h-9 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold disabled:opacity-40">
          Ladda ner ({count})
        </button>
        <button
          type="button"
          disabled={count === 0}
          onClick={() => {
            if (!window.confirm(`Ta bort alla ${count} sparade testexempel från den här webbläsaren?`)) return;
            clearTestCases();
            setCount(0);
          }}
          className="px-3 h-9 rounded-lg bg-slate-100 text-slate-500 text-sm font-semibold disabled:opacity-40"
        >
          Töm
        </button>
      </div>
    </div>
  );
}
