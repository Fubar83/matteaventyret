interface BossMonsterProps {
  hp: number;
  maxHp: number;
  hit?: boolean;
}

/** Siffer-Slukaren: a round, goofy number-eating monster. Wobbles when hit (see build brief "Mini-boss"). */
export function BossMonster({ hp, maxHp, hit }: BossMonsterProps) {
  const angry = hp <= maxHp / 2;
  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox="0 0 160 160"
        width={160}
        height={160}
        className={hit ? "animate-[wiggle_0.4s_ease-in-out]" : ""}
        role="img"
        aria-label="Siffer-Slukaren"
      >
        <style>{`@keyframes wiggle { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-6deg); } 75% { transform: rotate(6deg); } }`}</style>
        <circle cx="80" cy="90" r="60" fill="#a855f7" stroke="#1e293b" strokeWidth="5" />
        <circle cx="55" cy="45" r="10" fill="#a855f7" stroke="#1e293b" strokeWidth="5" />
        <circle cx="105" cy="45" r="10" fill="#a855f7" stroke="#1e293b" strokeWidth="5" />
        <circle cx="58" cy="80" r="14" fill="white" stroke="#1e293b" strokeWidth="3" />
        <circle cx="102" cy="80" r="14" fill="white" stroke="#1e293b" strokeWidth="3" />
        <circle cx="58" cy="80" r="5" fill="#1e293b" />
        <circle cx="102" cy="80" r="5" fill="#1e293b" />
        {angry ? (
          <path d="M50 118 Q80 100 110 118" fill="none" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
        ) : (
          <path d="M50 112 Q80 132 110 112" fill="#1e293b" stroke="#1e293b" strokeWidth="5" strokeLinejoin="round" />
        )}
      </svg>
      <div className="flex gap-1">
        {Array.from({ length: maxHp }, (_, i) => (
          <span key={i} className={`text-xl ${i < hp ? "text-rose-500" : "text-slate-200"}`}>
            ♥
          </span>
        ))}
      </div>
    </div>
  );
}
