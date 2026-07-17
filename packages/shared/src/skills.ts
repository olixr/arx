/** The twelve launch skills. Classless: everyone can train everything. */
export type SkillId =
  | 'vitality'
  | 'melee'
  | 'defence'
  | 'archery'
  | 'magic'
  | 'mining'
  | 'woodcutting'
  | 'fishing'
  | 'smithing'
  | 'crafting'
  | 'cooking'
  | 'construction';

export const SKILL_IDS: readonly SkillId[] = [
  'vitality',
  'melee',
  'defence',
  'archery',
  'magic',
  'mining',
  'woodcutting',
  'fishing',
  'smithing',
  'crafting',
  'cooking',
  'construction',
];

export const MAX_LEVEL = 99;

/** Cumulative XP required for each level, RuneScape-style curve. */
const XP_TABLE: number[] = (() => {
  const table = [0, 0]; // levels are 1-based; level 1 = 0 xp
  let points = 0;
  for (let lvl = 1; lvl < MAX_LEVEL; lvl++) {
    points += Math.floor(lvl + 300 * Math.pow(2, lvl / 7));
    table.push(Math.floor(points / 4));
  }
  return table;
})();

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level > MAX_LEVEL) level = MAX_LEVEL;
  return XP_TABLE[level]!;
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= XP_TABLE[level + 1]!) level++;
  return level;
}

export type SkillXp = Partial<Record<SkillId, number>>;

export function isSkillId(s: string): s is SkillId {
  return (SKILL_IDS as readonly string[]).includes(s);
}
