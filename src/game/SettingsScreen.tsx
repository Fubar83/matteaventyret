import { useState } from "react";
import type { Locale } from "../i18n";
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

  if (showPrivacy) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 px-6 max-w-md mx-auto text-slate-700">
        <h2 className="text-xl font-bold text-slate-800">Integritet</h2>
        <p>
          MatteÄventyret samlar inte in något. Det finns inga konton, inga namn (barnet väljer en avatar, inte ett
          namn), ingen analys och inga tredjepartsanrop när du spelar. Allt sparas bara på den här enheten.
        </p>
        <p className="text-sm text-slate-500">
          Privacy: MatteÄventyret collects nothing. No accounts, no names, no analytics, no third-party requests
          while playing. Everything is saved only on this device.
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

      <div className="flex items-center justify-between py-2">
        <span className="text-slate-700">Skriva med</span>
        <div className="flex gap-2">
          {(["numpad", "handwriting"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChange({ ...settings, inputMode: mode })}
              className={`px-3 h-9 rounded-lg font-semibold text-sm ${settings.inputMode === mode ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              {mode === "numpad" ? "Knappsats" : "Handskrift"}
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

      <button type="button" onClick={() => setShowPrivacy(true)} className="text-sky-600 underline text-sm text-left">
        Om integritet / Privacy
      </button>

      <button type="button" onClick={onClose} className="h-12 px-6 rounded-xl bg-sky-500 text-white font-bold shadow mt-2">
        Klar
      </button>
    </div>
  );
}
