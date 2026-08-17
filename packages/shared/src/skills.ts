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
  | 'combat'
  | 'onehand'
  | 'defence'
  | 'archery'
  | 'arx'
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
  | 'polearm'
  | 'dualwield'
  | 'shield';

export const SKILL_IDS: readonly SkillId[] = [
  'vitality',
  'combat',
  'onehand',
  'defence',
  'archery',
  'arx',
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
  'polearm',
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

/**
 * THE SPOKEN NAME: a skill whose id does not read as its name says so
 * here. Everything else falls through to the id itself, which the
 * skills hall capitalizes in CSS — so this map stays a short list of
 * exceptions, not a second roster to keep in sync.
 *
 * `arx` is the standing one: Arx is the energy and matter that binds
 * the world, and the skill is the craft of tapping it. The id is the
 * substance; the name is the art.
 */
export const SKILL_NAMES: Partial<Record<SkillId, string>> = {
  arx: 'Arx Wielding',
};

/** The name a skill wears in front of players. */
export function skillName(s: SkillId | string): string {
  return HIDDEN_SKILLS[s as SkillId]?.name ?? SKILL_NAMES[s as SkillId] ?? s;
}

/**
 * Retired skill ids, and what they answer to now. Quests and dialogue
 * are DB-truth: a row a designer touched in the Studio keeps whatever
 * skill id it was authored with, and a shipped-JSON reseed will not
 * overwrite it. So a rename has to be forgiving at the reading end
 * forever, not just at the migration.
 */
const LEGACY_SKILL_IDS: Record<string, SkillId> = {
  magic: 'arx', // v16 ARX WIELDING
  melee: 'onehand', // v15 THE VETERAN'S SCHOOL
};

/** A skill id read from stored or authored data, under its live name. */
export function resolveSkillId(s: string): SkillId | null {
  const live = LEGACY_SKILL_IDS[s] ?? s;
  return isSkillId(live) ? live : null;
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
      levelForXp(skills.onehand ?? 0),
      levelForXp(skills.archery ?? 0),
      levelForXp(skills.arx ?? 0),
      levelForXp(skills.twohand ?? 0),
      levelForXp(skills.polearm ?? 0),
      levelForXp(skills.combat ?? 0),
    ) / 2;
  return Math.max(1, Math.round(stay + strike));
}

export function isSkillId(s: string): s is SkillId {
  return (SKILL_IDS as readonly string[]).includes(s);
}

// ------------------------------------------------- the shared lesson

/**
 * THE SHARED LESSON: combat is the generalist's skill — whatever the
 * hand holds, the fight itself is teaching you. Every XP grant to a
 * strike school echoes a share into `combat` at the one grantXp door.
 *
 * Sneak is deliberately absent: its combat blows already echo through
 * the weapon school that swung them, and its stealth-craft XP (marks,
 * staying hidden) is not combat and must never train it.
 */
export const COMBAT_SCHOOL_IDS: readonly SkillId[] = [
  'onehand',
  'twohand',
  'polearm',
  'archery',
  'arx',
  'dualwield',
  'shield',
];

/** The echo's share: half of every strike lesson is a lesson in war. */
export const COMBAT_LESSON_FRAC = 0.5;

export function isCombatSchool(s: SkillId): boolean {
  return (COMBAT_SCHOOL_IDS as readonly string[]).includes(s);
}

// --------------------------------------------------- the mark's worth

/**
 * THE MARK'S WORTH: a body's lessons are priced by its own xpReward,
 * never by how much meat it carries. Landed damage pays school XP only
 * while the mark's lesson budget lasts — each attacker draws their own
 * budget down, and the bank dies with the body — so a thick-skinned
 * punching bag never becomes a training dummy. The keeper's trickle
 * bank taught this law (pets shipped it first); this is the same
 * bottom under the player's own blade. Damage itself always lands in
 * full: only the LESSON has a floor under it, so whiff-0 and the
 * damage pipeline are untouched.
 *
 * THE LONGER ROAD (2026-08-16, second cut same day): the strike rates
 * are a QUARTER of their founding values (school 3 → 1.5 → 0.75, kill
 * share 0.5 → 0.25 → 0.125, drip 2 → 1 → 0.5). An hour of play was
 * carrying a fresh hand to school 20-30; the first halving wasn't
 * enough, so the road doubled twice and the low levels get lived in.
 * The fractional rate is rounded at the grant site, never banked as a
 * fraction; vitality and defence keep their founding rates on purpose.
 */
export const XP_PER_DMG_SCHOOL = 0.75;
/** Vitality rides every landed blow at this rate (no echo, no cap change). */
export const XP_PER_DMG_VITALITY = 2;
/** The felling pays the school this share of xpReward, on top of damage XP. */
export const XP_KILL_SCHOOL_FRAC = 0.125;
/** School damage-XP per attacker per mark tops out at this many xpRewards. */
export const XP_MARK_CAP_MULT = 1.25;

/** The mark's lesson budget, in damage points, per attacker. */
export function xpMarkAllowance(xpReward: number): number {
  return Math.ceil((xpReward * XP_MARK_CAP_MULT) / XP_PER_DMG_SCHOOL);
}

// ------------------------------------------------------------- focus

/** Base Focus every character carries before any milestone. */
export const FOCUS_BASE = 2;
/**
 * THE FOCUS LAW v2 (callings-v2 Phase 4, THE WIDER LADDER — the
 * epic's ONE number move, green-lit): every skill pays +1 Focus at
 * each quartile milestone. Four milestones × 25 skills + the base
 * = 102 at the ceiling — a maxed account holds roughly a fifth of a
 * ten-seat world, so the class stays a CHOICE at every hour of play.
 * The 50 and 99 milestones keep their founding seats inside the
 * curve (nothing a character had is taken away).
 */
export const FOCUS_MILESTONES: readonly number[] = [25, 50, 75, 99];
/** The founding milestone constants, kept for the ceremony lines. */
export const FOCUS_MILESTONE_LEVEL = 50;
export const FOCUS_MASTERY_LEVEL = 99;

/**
 * THE FOCUS LAW: the account's capacity to hold Callings answered.
 * Derived from base skill levels, never stored — the milestone IS the
 * ledger. Breadth and depth both pay: +1 per skill at each quartile,
 * so the completionist visibly runs a richer build.
 */
export function focusBudget(skills: SkillXp): number {
  let focus = FOCUS_BASE;
  for (const xp of Object.values(skills)) {
    const level = levelForXp(xp ?? 0);
    for (const m of FOCUS_MILESTONES) if (level >= m) focus++;
  }
  return focus;
}

/**
 * THE SIXTEEN RUNGS (callings-v2, THE FILLED HALL): every skill's
 * ladder holds exactly sixteen seats, one every five levels from 5
 * to 80 — the technique cadence made a calling's cadence, so the
 * first calling answers at the first rung a hand can climb and the
 * capstone masters (Rank IV, THE SHORTENED CLIMB) by 98. Seats past
 * 80 are off the ladder on purpose: a 90/99 seat could never hone.
 */
export const CALLING_SEAT_STEP = 5;
export const CALLING_LADDER_SEATS = 16;
export const CALLING_CAPSTONE_LEVEL = CALLING_SEAT_STEP * CALLING_LADDER_SEATS;
export const CALLING_SEATS: readonly number[] = Array.from(
  { length: CALLING_LADDER_SEATS },
  (_, i) => CALLING_SEAT_STEP * (i + 1),
);

/**
 * THE SEAT BANDS: a Calling's rank-I price follows its seat on the
 * ladder — minors under 40 hold 1, majors 40..79 hold 2, capstones
 * 80+ hold 3. Content authors read the band; the contract test pins
 * every def to it.
 */
export function focusCostForSeat(unlockLevel: number): number {
  return unlockLevel >= 80 ? 3 : unlockLevel >= 40 ? 2 : 1;
}

/**
 * RANK IS A CHOICE YOU AFFORD (the green-light's word): the Focus an
 * answered Calling holds at an APPLIED rank — its seat price plus one
 * per rank past I. Entitlement to a rank derives free from skill
 * depth (the honed clocks); holding it deeper is what costs.
 */
export function callingCost(seatCost: number, appliedRank: number): number {
  return seatCost + Math.max(0, appliedRank - 1);
}
