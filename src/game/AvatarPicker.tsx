import { Avatar } from "./Avatar";
import { AVATARS, isAvatarUnlocked } from "./avatars";

interface AvatarPickerProps {
  totalStars: number;
  bossDefeated: boolean;
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  /** ?test in the URL: unlocks every avatar regardless of stars/boss, for QA/demo purposes. */
  forceUnlock?: boolean;
}

export function AvatarPicker({ totalStars, bossDefeated, selected, onSelect, onClose, forceUnlock }: AvatarPickerProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-10 px-4">
      <h2 className="text-xl font-bold text-slate-800">Välj din kompis</h2>
      <div className="grid grid-cols-3 gap-4">
        {AVATARS.map((a) => {
          const unlocked = forceUnlock || isAvatarUnlocked(a, totalStars, bossDefeated);
          return (
            <button
              key={a.id}
              type="button"
              disabled={!unlocked}
              onClick={() => onSelect(a.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl ${
                selected === a.id ? "ring-4 ring-sky-400" : ""
              }`}
            >
              <Avatar id={a.id} locked={!unlocked} />
              <span className="text-xs text-slate-500">{unlocked ? a.name : a.unlock.type === "boss" ? "Besegra bossen" : `${a.unlock.type === "stars" ? a.unlock.count : ""} stjärnor`}</span>
            </button>
          );
        })}
      </div>
      <button type="button" onClick={onClose} className="h-12 px-6 rounded-xl bg-slate-200 text-slate-700 font-bold">
        Klar
      </button>
    </div>
  );
}
