import { useEffect, useMemo, useState } from "react";
import { DEFAULT_CANVAS_SIZE, DigitCanvas } from "../game/DigitCanvas";
import type { RecognitionResult } from "../recognition/recognizer";
import { recognizeStrokes } from "../recognition/recognizer";
import type { Stroke } from "../recognition/preprocess";
import { CATEGORIES, type Category, LABELS } from "../recognition/labels";
import { exportSamplesAsBmp } from "./exportImages";
import { addSample, deleteAllSamples, getAllSamples, newSessionId, type StoredSample } from "./sampleStore";
import { trainAndDownload } from "./train";

type Tab = "collect" | "review" | "test" | "train";
type PracticeSet = Category | "all";

// Letters are disabled for now (numbers + math signs only, by request) - once
// re-enabled in labels.ts, add { key: "lowercase", label: "Gemener" } and
// { key: "uppercase", label: "Versaler" } back here.
const PRACTICE_SETS: { key: PracticeSet; label: string }[] = [
  { key: "all", label: "Alla" },
  { key: "digits", label: "Siffror" },
  { key: "math", label: "Tecken" },
];

const QUICK_SIGNS = ["+", "-", "×", "÷", "/", "=", "<", ">", "(", ")", ",", "."];

function charsFor(set: PracticeSet): readonly string[] {
  return set === "all" ? LABELS : CATEGORIES[set];
}

/**
 * Träningsverkstan: a maintainer-only tool for collecting handwriting
 * samples (currently digits and common math signs - letters are disabled for
 * now, see labels.ts), testing the currently shipped model against fresh
 * strokes, and producing an improved recognizer model. Not part of the
 * game's production build (see trainer.html / npm run trainer).
 */
export function TrainerApp() {
  const [tab, setTab] = useState<Tab>("collect");
  const [samples, setSamples] = useState<StoredSample[]>([]);
  const [practiceSet, setPracticeSet] = useState<PracticeSet>("all");
  const [charIndex, setCharIndex] = useState(0);
  const [resetToken, setResetToken] = useState(0);
  const [sessionId] = useState(newSessionId);
  const [consented, setConsented] = useState(false);
  const [trainStatus, setTrainStatus] = useState<string | null>(null);

  const [testResetToken, setTestResetToken] = useState(0);
  const [testStrokes, setTestStrokes] = useState<Stroke[] | null>(null);
  const [testResult, setTestResult] = useState<RecognitionResult | null>(null);
  const [testCorrection, setTestCorrection] = useState("");
  const [testSavedMsg, setTestSavedMsg] = useState<string | null>(null);

  const practiceChars = charsFor(practiceSet);
  const currentChar = practiceChars[charIndex % practiceChars.length];

  async function refresh() {
    setSamples(await getAllSamples());
  }

  useEffect(() => {
    refresh();
  }, []);

  function selectPracticeSet(set: PracticeSet) {
    setPracticeSet(set);
    setCharIndex(0);
    setResetToken((t) => t + 1);
  }

  const countsByChar = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of samples) counts.set(s.label, (counts.get(s.label) ?? 0) + 1);
    return counts;
  }, [samples]);

  async function handleCollectedStrokes(strokes: Stroke[]) {
    await addSample({ id: `${sessionId}-${Date.now()}`, label: currentChar, strokes, sessionId, createdAt: Date.now() });
    setCharIndex((i) => i + 1);
    setResetToken((t) => t + 1);
    refresh();
  }

  async function handleTestStrokes(strokes: Stroke[]) {
    setTestStrokes(strokes);
    setTestSavedMsg(null);
    const result = await recognizeStrokes(strokes, DEFAULT_CANVAS_SIZE);
    setTestResult(result);
    setTestCorrection(result.char);
  }

  async function saveCorrection() {
    if (!testStrokes || !testCorrection) return;
    if (!LABELS.includes(testCorrection)) {
      setTestSavedMsg(`Okänt tecken: "${testCorrection}"`);
      return;
    }
    await addSample({ id: `${sessionId}-${Date.now()}`, label: testCorrection, strokes: testStrokes, sessionId, createdAt: Date.now() });
    setTestSavedMsg(`Sparad som "${testCorrection}"`);
    setTestStrokes(null);
    setTestResult(null);
    setTestResetToken((t) => t + 1);
    refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center gap-6 py-8 px-4">
      <h1 className="text-2xl font-bold text-slate-800">Träningsverkstan</h1>
      <p className="text-xs text-slate-400 max-w-md text-center">
        Maintainer-only tool. Not shown to children, not part of the shipped game. Samples are stroke coordinates, not
        images, and stay on this device unless you export them.
      </p>

      <div className="flex gap-2 flex-wrap justify-center">
        {(["collect", "review", "test", "train"] as Tab[]).map((tKey) => (
          <button
            key={tKey}
            type="button"
            onClick={() => setTab(tKey)}
            className={`px-4 h-9 rounded-lg font-semibold text-sm ${tab === tKey ? "bg-sky-500 text-white" : "bg-slate-200 text-slate-600"}`}
          >
            {tKey}
          </button>
        ))}
      </div>

      {tab === "collect" && (
        <div className="flex flex-col items-center gap-4">
          {!consented ? (
            <label className="flex items-start gap-2 max-w-sm text-sm text-slate-600">
              <input type="checkbox" checked={consented} onChange={(e) => setConsented(e.target.checked)} className="mt-1 w-5 h-5" />
              A parent/guardian has consented to this session collecting anonymous handwriting stroke samples (no
              names, no images).
            </label>
          ) : (
            <>
              <div className="flex gap-2 flex-wrap justify-center">
                {PRACTICE_SETS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => selectPracticeSet(s.key)}
                    className={`px-3 h-8 rounded-lg text-xs font-semibold ${practiceSet === s.key ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="text-lg text-slate-700">
                Rita tecknet: <span className="font-bold text-2xl">{currentChar}</span>
              </p>
              {currentChar === "×" && (
                <p className="text-xs text-slate-400 max-w-xs text-center">
                  Rita alltid som ett kryss - en punkt går inte att skilja från "." eller "," och lärs inte in bra.
                </p>
              )}
              <DigitCanvas resetToken={resetToken} onSettled={handleCollectedStrokes} />
              <p className="text-xs text-slate-400">Samlade i denna session: {samples.filter((s) => s.sessionId === sessionId).length}</p>
            </>
          )}
        </div>
      )}

      {tab === "review" && (
        <div className="flex flex-col items-center gap-5 w-full max-w-md">
          {(Object.keys(CATEGORIES) as Category[]).map((cat) => (
            <div key={cat} className="w-full">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">{cat}</p>
              <div className="grid grid-cols-8 gap-1.5 w-full">
                {CATEGORIES[cat].map((c) => {
                  const count = countsByChar.get(c) ?? 0;
                  return (
                    <div key={c} className="flex flex-col items-center bg-white rounded-lg border p-1.5">
                      <span className="text-sm font-bold">{c}</span>
                      <span className={`text-[10px] ${count === 0 ? "text-slate-300" : count < 20 ? "text-amber-500" : "text-emerald-600"}`}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => exportSamplesAsBmp(samples)}
              disabled={samples.length === 0}
              className="h-10 px-4 rounded-lg bg-sky-500 text-white font-semibold text-sm disabled:opacity-40"
            >
              Exportera bilder (BMP)
            </button>
            <button
              type="button"
              onClick={async () => {
                await deleteAllSamples();
                refresh();
              }}
              className="h-10 px-4 rounded-lg bg-rose-500 text-white font-semibold text-sm"
            >
              Radera alla samples
            </button>
          </div>
        </div>
      )}

      {tab === "test" && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <p className="text-sm text-slate-600 max-w-sm text-center">
            Rita vad som helst - siffra, bokstav eller tecken - och se vad den nuvarande modellen (den som skickas
            med spelet) tror att det är. Fel gissning? Rätta den och spara som ny träningsexempel.
          </p>
          <DigitCanvas resetToken={testResetToken} onSettled={handleTestStrokes} />
          {testResult && (
            <div className="w-full bg-white rounded-xl border p-3 flex flex-col gap-2 items-center">
              <p className="text-sm text-slate-700">
                Modellen tror det är <span className="font-bold text-xl">{testResult.char}</span>{" "}
                <span className="text-xs text-slate-400">({(testResult.topTwo.first.prob * 100).toFixed(0)}%)</span>
              </p>
              <p className="text-xs text-slate-400">
                Näst mest sannolikt: {testResult.topTwo.second.char} ({(testResult.topTwo.second.prob * 100).toFixed(0)}%)
              </p>
              <p className={`text-xs font-semibold ${testResult.confident ? "text-emerald-600" : "text-amber-500"}`}>
                {testResult.confident ? "Säker gissning" : "Osäker gissning"}
              </p>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-500">Rätt tecken:</span>
                <input
                  value={testCorrection}
                  onChange={(e) => setTestCorrection(e.target.value.slice(-1))}
                  maxLength={1}
                  className="w-10 h-9 text-center rounded-lg border font-bold text-lg"
                />
                <button type="button" onClick={saveCorrection} className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-sm font-semibold">
                  Spara som exempel
                </button>
              </div>
              <div className="flex gap-1 flex-wrap justify-center">
                {QUICK_SIGNS.map((sign) => (
                  <button
                    key={sign}
                    type="button"
                    onClick={() => setTestCorrection(sign)}
                    className="w-7 h-7 rounded bg-slate-200 text-slate-700 text-sm"
                  >
                    {sign}
                  </button>
                ))}
              </div>
              {testSavedMsg && <p className="text-xs text-slate-500">{testSavedMsg}</p>}
            </div>
          )}
        </div>
      )}

      {tab === "train" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-slate-600 max-w-sm text-center">
            Tränar en ny modell från de sparade samples ({samples.length} st, {LABELS.length} möjliga tecken) och
            laddar ner model.json + weights. Kopiera filerna till public/recognition/model/ (och en kopia av
            report.json till src/recognition/model/) och släpp nästa version.
          </p>
          <button
            type="button"
            onClick={async () => {
              setTrainStatus("Tränar...");
              try {
                const acc = await trainAndDownload(samples);
                setTrainStatus(`Klar. Träffsäkerhet på eget testset: ${(acc * 100).toFixed(1)}%`);
              } catch (e) {
                setTrainStatus(`Fel: ${(e as Error).message}`);
              }
            }}
            className="h-12 px-6 rounded-xl bg-emerald-600 text-white font-bold shadow"
          >
            Träna och exportera
          </button>
          {trainStatus && <p className="text-sm text-slate-600">{trainStatus}</p>}
        </div>
      )}
    </div>
  );
}
