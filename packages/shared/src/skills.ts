/**
 * The visible skills (plus hidden arts below). Classless:
 * everyone can train everything.
 *
 * Trade-skill law: there is no generic "crafting" skill. Every recipe
 * belongs to a named trade (smithing, woodworking, leatherworking,
 * tailoring, cooking, herbalism, enchanting) so a player can LIVE that
 * profession — gathering skills stay separate from producing skills.
 */
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
  | 'woodworking'
  | 'leatherworking'
  | 'tailoring'
  | 'cooking'
  | 'construction'
  | 'farming'
  | 'foraging'
  | 'herbalism'
  | 'enchanting'
  | 'beastcraft'
  | 'sneak'
  | 'twohand'
  | 'dualwield'
  | 'shield';

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
  'woodworking',
  'leatherworking',
  'tailoring',
  'cooking',
  'construction',
  'farming',
  'foraging',
  'herbalism',
  'enchanting',
  'beastcraft',
  'sneak',
  'twohand',
  'dualwield',
  'shield',
];

/**
 * Hidden skills — the secret arts. They never appear in the skills
 * panel, the affix pools, or any tooltip until a character DISCOVERS
 * one by doing the deed; there is no in-game hint that they exist.
 *
 * The unlock flag is row-presence: a character owns a hidden skill iff
 * their skills record carries the key (even at 0 xp). The server
 * creates the row at the moment of discovery; the client hides any
 * hidden skill whose key is absent. No extra table, no extra protocol.
 */
export const HIDDEN_SKILLS: Partial<Record<SkillId, { name: string; discovery: string }>> = {
  dualwield: {
    name: 'Dual Wielding',
    discovery:
      'Secret skill discovered: Dual Wielding! Your off hand learns the blade — ' +
      'train it and the second edge will bite nearly as deep as the first.',
  },
  shield: {
    name: 'Shield',
    discovery:
      'Secret skill discovered: Shield! The wall has a craft of its own — ' +
      'every blow it turns will teach your arm to hold the next one better.',
  },
};

export function isHiddenSkill(s: SkillId): boolean {
  return s in HIDDEN_SKILLS;
}

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

/**
 * The one number a beast sizes you up by: staying power (vitality +
 * defence) plus your best way of hurting it back. A player who trains
 * all three combat pillars to L sits at combat level L; a pure skiller
 * stays near 1 no matter how deep their trade runs — and the wilds
 * treat them accordingly.
 */
export function combatLevel(skills: SkillXp): number {
  const stay = (levelForXp(skills.vitality ?? 0) + levelForXp(skills.defence ?? 0)) / 4;
  const strike =
    Math.max(
      levelForXp(skills.melee ?? 0),
      levelForXp(skills.archery ?? 0),
      levelForXp(skills.magic ?? 0),
      levelForXp(skills.twohand ?? 0),
    ) / 2;
  return Math.max(1, Math.round(stay + strike));
}

export function isSkillId(s: string): s is SkillId {
  return (SKILL_IDS as readonly string[]).includes(s);
}

// ------------------------------------------------------------- focus

/** Base Focus every character carries before any milestone. */
export const FOCUS_BASE = 2;
/** Each skill at or past this BASE level grants +1 Focus... */
export const FOCUS_MILESTONE_LEVEL = 50;
/** ...and +1 more at mastery. */
export const FOCUS_MASTERY_LEVEL = 99;

/**
 * THE FOCUS LAW: the account's capacity to hold Callings answered.
 * Derived from base skill levels, never stored — the milestone IS the
 * ledger. Breadth and depth both pay: +1 per skill at 50, +1 more at
 * 99, so the completionist visibly runs a richer build.
 */
export function focusBudget(skills: SkillXp): number {
  let focus = FOCUS_BASE;
  for (const xp of Object.values(skills)) {
    const level = levelForXp(xp ?? 0);
    if (level >= FOCUS_MILESTONE_LEVEL) focus++;
    if (level >= FOCUS_MASTERY_LEVEL) focus++;
  }
  return focus;
}
