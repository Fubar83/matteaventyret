import { playEffect } from "../audio/sound";

interface NumpadProps {
  onDigit: (digit: number) => void;
  onDelete: () => void;
  /** Shown as an "OK" button next to Radera when the answer is a free multi-digit number (stage 1). */
  onSubmit?: () => void;
  disabled?: boolean;
}

/** Large on-screen numpad: 0-9, radera, and (for free-entry answers) OK. Numpad and handwriting give identical scoring. */
export function Numpad({ onDigit, onDelete, onSubmit, disabled }: NumpadProps) {
  return (
    <div className="grid grid-cols-3 gap-2 w-full max-w-xs mx-auto select-none">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
        <button
          key={d}
          type="button"
          disabled={disabled}
          onClick={() => {
            playEffect("tap");
            onDigit(d);
          }}
          className="h-14 rounded-2xl bg-sky-500 text-white text-2xl font-bold shadow active:translate-y-0.5 active:shadow-none disabled:opacity-40 disabled:active:translate-y-0"
        >
          {d}
        </button>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        className="h-14 rounded-2xl bg-amber-500 text-white text-sm font-bold shadow active:translate-y-0.5 active:shadow-none disabled:opacity-40"
      >
        Radera
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          playEffect("tap");
          onDigit(0);
        }}
        className="h-14 rounded-2xl bg-sky-500 text-white text-2xl font-bold shadow active:translate-y-0.5 active:shadow-none disabled:opacity-40"
      >
        0
      </button>
      {onSubmit ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onSubmit}
          className="h-14 rounded-2xl bg-emerald-600 text-white text-sm font-bold shadow active:translate-y-0.5 active:shadow-none disabled:opacity-40"
        >
          OK
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}
