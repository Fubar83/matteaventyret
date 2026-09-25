import { AVATARS } from "./avatars";

interface AvatarProps {
  id: string;
  size?: number;
  locked?: boolean;
  className?: string;
}

/**
 * A friendly animal face built from simple shapes, in the Toca-Boca-ish
 * "chunky rounded, thick outline" style the build brief asks for. Deliberately
 * simple (no separate limb parts / blinking yet - that's the art-pass
 * milestone), but original and distinct per avatar id.
 */
export function Avatar({ id, size = 64, locked, className }: AvatarProps) {
  const meta = AVATARS.find((a) => a.id === id) ?? AVATARS[0];
  const color = locked ? "#cbd5e1" : meta.color;
  const stroke = locked ? "#94a3b8" : "#1e293b";

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={meta.name}
    >
      {meta.earShape === "round" && (
        <>
          <circle cx="22" cy="24" r="14" fill={color} stroke={stroke} strokeWidth="4" />
          <circle cx="78" cy="24" r="14" fill={color} stroke={stroke} strokeWidth="4" />
        </>
      )}
      {meta.earShape === "pointy" && (
        <>
          <polygon points="15,35 28,5 38,32" fill={color} stroke={stroke} strokeWidth="4" strokeLinejoin="round" />
          <polygon points="85,35 72,5 62,32" fill={color} stroke={stroke} strokeWidth="4" strokeLinejoin="round" />
        </>
      )}
      {meta.earShape === "tuft" && (
        <>
          <polygon points="30,20 38,2 44,22" fill={color} stroke={stroke} strokeWidth="4" strokeLinejoin="round" />
          <polygon points="70,20 62,2 56,22" fill={color} stroke={stroke} strokeWidth="4" strokeLinejoin="round" />
        </>
      )}

      <circle cx="50" cy="55" r="38" fill={color} stroke={stroke} strokeWidth="4" />

      {locked ? (
        <>
          <rect x="38" y="50" width="24" height="18" rx="4" fill="#64748b" />
          <path d="M42 50 v-6 a8 8 0 0 1 16 0 v6" fill="none" stroke="#64748b" strokeWidth="4" />
        </>
      ) : (
        <>
          <circle cx="36" cy="52" r="6" fill="white" stroke={stroke} strokeWidth="2" />
          <circle cx="64" cy="52" r="6" fill="white" stroke={stroke} strokeWidth="2" />
          <circle cx="36" cy="52" r="2.5" fill="#1e293b" />
          <circle cx="64" cy="52" r="2.5" fill="#1e293b" />
          <path d="M40 68 Q50 76 60 68" fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
