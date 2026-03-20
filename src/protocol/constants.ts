export const CHARACTER_IDS = ["char_1", "char_2", "char_3", "char_4"] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export function isCharacterId(value: string): value is CharacterId {
  return CHARACTER_IDS.includes(value as CharacterId);
}
