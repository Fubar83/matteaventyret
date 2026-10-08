import type { Money } from "../../engine/shop";
import { isCoin } from "../../engine/shop";

/** Coin sizes, roughly as the real ones compare: the 10-krona is smaller than the 5. */
const COIN_SIZE: Record<number, number> = { 1: 40, 2: 46, 5: 50, 10: 44 };
/** Notes in the colours of the real ones - drawn as play money, nothing more. */
const NOTE_COLOR: Record<number, [string, string, string]> = {
  20: ["#7c3aed", "#ddd6fe", "#5b21b6"],
  50: ["#d97706", "#fde68a", "#92400e"],
  100: ["#2563eb", "#bfdbfe", "#1e3a8a"],
  200: ["#16a34a", "#bbf7d0", "#14532d"],
  500: ["#dc2626", "#fecaca", "#7f1d1d"],
};

function Coin({ value }: { value: Money }) {
  const size = COIN_SIZE[value];
  const gold = value >= 5;
  const id = `coin-${value}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className="drop-shadow-md">
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor={gold ? "#fff7cc" : "#ffffff"} />
          <stop offset="0.45" stopColor={gold ? "#fbbf24" : "#d1d5db"} />
          <stop offset="1" stopColor={gold ? "#b45309" : "#6b7280"} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${id})`} stroke={gold ? "#92400e" : "#4b5563"} strokeWidth="2" />
      <circle cx="50" cy="50" r="39" fill="none" stroke={gold ? "#fde68a" : "#f3f4f6"} strokeWidth="2" strokeDasharray="2 3" opacity="0.8" />
      <text x="50" y="52" textAnchor="middle" dominantBaseline="central" fontSize={value === 10 ? 34 : 40} fontWeight="900" fill={gold ? "#78350f" : "#374151"} fontFamily="system-ui, sans-serif">
        {value}
      </text>
      <text x="50" y="79" textAnchor="middle" fontSize="13" fontWeight="800" fill={gold ? "#92400e" : "#4b5563"} fontFamily="system-ui, sans-serif">
        KR
      </text>
    </svg>
  );
}

function Note({ value, width = 104 }: { value: Money; width?: number }) {
  const [main, light, dark] = NOTE_COLOR[value];
  const id = `note-${value}`;
  return (
    <svg width={width} height={width * 0.52} viewBox="0 0 200 104" aria-hidden className="drop-shadow-md">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.55" stopColor={main} stopOpacity="0.55" />
          <stop offset="1" stopColor={light} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="196" height="100" rx="8" fill={`url(#${id})`} stroke={dark} strokeWidth="2.5" />
      <rect x="9" y="9" width="182" height="86" rx="5" fill="none" stroke={dark} strokeWidth="1" opacity="0.5" />
      {/* Wavy lines across, like a real note's pattern. */}
      {[30, 46, 62, 78].map((y) => (
        <path key={y} d={`M12 ${y} q 22 -10 44 0 t 44 0 t 44 0 t 44 0`} fill="none" stroke={dark} strokeWidth="0.8" opacity="0.25" />
      ))}
      <circle cx="148" cy="52" r="28" fill={light} stroke={dark} strokeWidth="1.5" opacity="0.9" />
      <text x="148" y="54" textAnchor="middle" dominantBaseline="central" fontSize="30">
        ⭐
      </text>
      <text x="16" y="44" fontSize="40" fontWeight="900" fill={dark} fontFamily="system-ui, sans-serif">
        {value}
      </text>
      <text x="17" y="66" fontSize="13" fontWeight="800" fill={dark} fontFamily="system-ui, sans-serif" letterSpacing="2">
        KRONOR
      </text>
      <text x="17" y="86" fontSize="9" fontWeight="700" fill={dark} opacity="0.6" fontFamily="system-ui, sans-serif" letterSpacing="1.5">
        LEKPENGAR
      </text>
    </svg>
  );
}

/** A coin or a note, drawn. */
export function MoneyPiece({ value, noteWidth }: { value: Money; noteWidth?: number }) {
  return isCoin(value) ? <Coin value={value} /> : <Note value={value} width={noteWidth} />;
}
