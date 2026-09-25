export type BoxState = "printed" | "strikeable" | "default" | "selected" | "disabled" | "correct" | "wrong" | "followOn";

interface DigitBoxProps {
  value: number | string | null;
  size?: "full" | "small";
  struck?: boolean;
  state?: BoxState;
  onClick?: () => void;
}

const STATE_CLASSES: Record<BoxState, string> = {
  printed: "bg-white text-slate-800 border-slate-300",
  strikeable: "bg-white text-slate-800 border-sky-400 ring-2 ring-sky-200",
  default: "bg-white text-slate-400 border-slate-300 border-dashed",
  selected: "bg-sky-50 text-slate-800 border-sky-500 ring-2 ring-sky-300",
  disabled: "bg-slate-100 text-slate-300 border-slate-200",
  correct: "bg-emerald-50 text-emerald-700 border-emerald-400",
  wrong: "bg-rose-50 text-rose-700 border-rose-400",
  followOn: "bg-amber-50 text-amber-700 border-amber-400",
};

/** One square of squared paper: a printed digit, or a cell the child writes/strikes in. */
export function DigitBox({ value, size = "full", struck, state = "printed", onClick }: DigitBoxProps) {
  const dims = size === "full" ? "w-24 h-24 text-5xl" : "w-16 h-16 text-2xl";
  const interactive = onClick ? "cursor-pointer" : "cursor-default";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`relative ${dims} ${interactive} flex items-center justify-center rounded-md border-2 font-semibold ${STATE_CLASSES[state]}`}
    >
      {value ?? ""}
      {struck && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <span className="block w-[140%] h-1 bg-rose-600 rotate-[-45deg]" />
        </span>
      )}
    </button>
  );
}
