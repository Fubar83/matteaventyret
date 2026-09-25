export type AvatarUnlock = { type: "free" } | { type: "stars"; count: number } | { type: "boss" };

export interface AvatarMeta {
  id: string;
  name: string;
  color: string;
  earShape: "round" | "pointy" | "tuft" | "none";
  unlock: AvatarUnlock;
}

/** 6 original animal avatars: 2 free, 4 unlocked by total stars or the mini-boss (see build brief "Avatars and cosmetics"). */
export const AVATARS: AvatarMeta[] = [
  { id: "rav", name: "Räven", color: "#f97316", earShape: "pointy", unlock: { type: "free" } },
  { id: "igelkott", name: "Igelkotten", color: "#a16207", earShape: "round", unlock: { type: "free" } },
  { id: "uggla", name: "Ugglan", color: "#7c3aed", earShape: "tuft", unlock: { type: "stars", count: 5 } },
  { id: "ekorre", name: "Ekorren", color: "#dc2626", earShape: "round", unlock: { type: "stars", count: 10 } },
  { id: "grodan", name: "Grodan", color: "#16a34a", earShape: "none", unlock: { type: "stars", count: 15 } },
  { id: "bjorn", name: "Björnen", color: "#78716c", earShape: "round", unlock: { type: "boss" } },
];

export function isAvatarUnlocked(avatar: AvatarMeta, totalStars: number, bossDefeated: boolean): boolean {
  switch (avatar.unlock.type) {
    case "free":
      return true;
    case "stars":
      return totalStars >= avatar.unlock.count;
    case "boss":
      return bossDefeated;
  }
}

export function unlockedAvatarIds(totalStars: number, bossDefeated: boolean): string[] {
  return AVATARS.filter((a) => isAvatarUnlocked(a, totalStars, bossDefeated)).map((a) => a.id);
}
