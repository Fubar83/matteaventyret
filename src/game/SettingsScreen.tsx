import { useState } from "react";
import type { Locale } from "../i18n";
import { forgetHandwriting, personalSamples } from "../recognition/personal";
import type { Settings } from "../storage/save";

interface SettingsScreenProps {
  settings: Settings;
  onChange: (next: Settings) => void;
  onClose: () => void;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2">
      <span className="text-slate-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-6 h-6 accent-sky-500"
      />
    </label>
  );
}

export function SettingsScreen({ settings, onChange, onClose }: SettingsScreenProps) {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [learned, setLearned] = useState(() => personalSamples().length);

  if (showPrivacy) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 px-6 max-w-md mx-auto text-slate-700">
        <h2 className="text-xl font-bold text-slate-800">Integritet</h2>
        <p>
          MatteÄventyret samlar inte in något. Det finns inga konton, inga namn (barnet väljer en avatar, inte ett
          namn), ingen analys och inga tredjepartsanrop när du spelar. Allt sparas bara på den här enheten – även de
          tecken barnet har förklarat ("Menade du?"), som spelet använder för att läsa just den handstilen bättre.
        </p>
        <p className="text-sm text-slate-500">
          Privacy: MatteÄventyret collects nothing. No accounts, no names, no analytics, no third-party requests
          while playing. Everything is saved only on this device - including the symbols the child has explained
          ("Did you mean?"), which the game uses to read that handwriting better.
        </p>
        <button type="button" onClick={() => setShowPrivacy(false)} className="h-12 px-6 rounded-xl bg-slate-200 text-slate-700 font-bold">
          Tillbaka
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-10 px-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-slate-800">Inställningar</h2>

      <div className="flex items-center justify-between py-2">
        <span className="text-slate-700">Språk / Language</span>
        <div className="flex gap-2">
          {(["sv", "en"] as Locale[]).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => onChange({ ...settings, locale: loc })}
              className={`px-4 h-9 rounded-lg font-semibold ${settings.locale === loc ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              {loc === "sv" ? "Svenska" : "English"}
            </button>
          ))}
        </div>
      </div>

      <Toggle label="Ljud av (mute)" checked={settings.muted} onChange={(v) => onChange({ ...settings, muted: v })} />
      <div className="flex items-center justify-between gap-4 py-2">
        <span className="text-slate-700">Musik</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={settings.musicVolume}
          onChange={(e) => onChange({ ...settings, musicVolume: Number(e.target.value) })}
          className="w-32 accent-sky-500"
        />
      </div>
      <div className="flex items-center justify-between gap-4 py-2">
        <span className="text-slate-700">Ljudeffekter</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={settings.effectsVolume}
          onChange={(e) => onChange({ ...settings, effectsVolume: Number(e.target.value) })}
          className="w-32 accent-sky-500"
        />
      </div>
      <Toggle
        label="Mindre rörelse (reduced motion)"
        checked={settings.reducedMotion}
        onChange={(v) => onChange({ ...settings, reducedMotion: v })}
      />
      <Toggle
        label="Hög kontrast"
        checked={settings.highContrast}
        onChange={(v) => onChange({ ...settings, highContrast: v })}
      />
      <Toggle
        label="Dyslexivänligt typsnitt"
        checked={settings.dyslexiaFont}
        onChange={(v) => onChange({ ...settings, dyslexiaFont: v })}
      />

      {/* What the game has learned of this child's handwriting (recognition/personal.ts) - on this device only, and can be forgotten. */}
      <div className="flex flex-col gap-1 py-2">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-700">Handstil</span>
          <button
            type="button"
            disabled={learned === 0}
            onClick={() => {
              forgetHandwriting();
              setLearned(0);
            }}
            className="px-4 h-9 rounded-lg bg-slate-100 text-slate-600 font-semibold text-sm disabled:opacity-40"
          >
            Glöm min handstil
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {learned === 0
            ? "När du svarar på \"Menade du?\" lär sig spelet hur du skriver. Det sparas bara på den här enheten."
            : `Spelet har lärt sig ${learned} tecken av hur du skriver. Det sparas bara på den här enheten.`}
        </p>
      </div>

      <button type="button" onClick={() => setShowPrivacy(true)} className="text-sky-600 underline text-sm text-left">
        Om integritet / Privacy
      </button>

      <button type="button" onClick={onClose} className="h-12 px-6 rounded-xl bg-sky-500 text-white font-bold shadow mt-2">
        Klar
      </button>
    </div>
  );
}
