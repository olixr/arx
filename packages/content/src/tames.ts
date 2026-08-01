/**
 * THE LADDER OF TRUST (docs/beastcraft-plan.md, beastcraft v2) — the
 * tame registry. A TameDef existing at all IS the whitelist: there is
 * no `tamable` flag on NpcDef to leak, and everything the plan bans
 * (champions and matriarchs, humanoids, the risen dead, slimes,
 * livestock, the prey crowns) is refused structurally by the
 * validator below, so a future roster row cannot drift past the law
 * without a test going red.
 *
 * Phase 1 ships the entry rung only — the beetle and the rat, the
 * level-10 moment. The full ladder (boar, wolf, bear, owl, adder,
 * worg) lands with its kits in Phase 5, THE SPECIES SPEAK.
 */

import { NPCS, scaleNpcDef } from './npcs.js';
import { itemDef } from './items.js';

export interface TameDef {
  /** NpcDef id — the wild body this bond begins as. */
  species: string;
  /** Beastcraft rung: the gentling refuses below this, aloud. */
  level: number;
  /** Item id the gentling consumes — the farmer and cook sell to the hunter. */
  lure: string;
  /** The ceremony's beastcraft grant — the tame is the skill's spine. */
  tameXp: number;
  /** One concrete sentence in the world's diction (VOICE.md: no dashes). */
  flavor: string;
}

export const TAME_DEFS: readonly TameDef[] = [
  {
    species: 'giant_beetle',
    level: 10,
    lure: 'berries',
    // First-pass tame xp = 30 + 10 × species wild level (plan Part 5).
    tameXp: 90,
    flavor: 'A walking shield with a sweet tooth for windfall berries.',
  },
  {
    species: 'rat',
    level: 10,
    lure: 'egg',
    tameXp: 50,
    flavor: 'Quick in the dark, and loyal to whoever holds the egg.',
  },
];

export const TAMES: ReadonlyMap<string, TameDef> = new Map(TAME_DEFS.map((t) => [t.species, t]));

export function tameDef(species: string): TameDef | undefined {
  return TAMES.get(species);
}

/** Beastcraft opens the gentling here — the roster may not rung below it. */
export const TAME_FLOOR_LEVEL = 10;

/**
 * Humanoid mobs ride the player rig and keep their own counsel; the
 * risen dead have nothing left to gentle. Both are banned by prefix
 * so future kin swear in automatically.
 */
const HUMANOID_PREFIXES = ['goblin', 'brigand', 'kobold', 'skeleton', 'gnoll', 'troll'];

/**
 * Named refusals outside the structural classes: matriarchs and named
 * terrors stay wild by decree, and the prey crowns keep their feet —
 * the wild keeps what makes it the wild.
 */
const NEVER_TAMED = new Set(['dire_wolf', 'elder_great_owl', 'stag', 'hind']);

/** Every law a TameDef must clear. Empty array = clean. */
export function tameErrors(def: TameDef): string[] {
  const errs: string[] = [];
  const npc = NPCS.get(def.species);
  if (!npc) {
    errs.push(`species '${def.species}' is not in the bestiary`);
    return errs;
  }
  if (def.species.endsWith('_champion')) errs.push(`${def.species}: champions are never tamed`);
  if (NEVER_TAMED.has(def.species)) errs.push(`${def.species}: stays wild by decree`);
  for (const prefix of HUMANOID_PREFIXES) {
    if (def.species.startsWith(prefix)) {
      errs.push(`${def.species}: humanoids and the risen dead are never tamed`);
      break;
    }
  }
  if (npc.splitInto) errs.push(`${def.species}: a thing that splits in two is not one friend`);
  if (npc.produce || npc.lays) {
    errs.push(`${def.species}: livestock already has a place in your life`);
  }
  if (!Number.isInteger(def.level) || def.level < TAME_FLOOR_LEVEL || def.level > 99) {
    errs.push(`${def.species}: rung ${def.level} outside [${TAME_FLOOR_LEVEL}, 99]`);
  }
  if (!itemDef(def.lure)) errs.push(`${def.species}: lure '${def.lure}' is not an item`);
  if (!Number.isFinite(def.tameXp) || def.tameXp <= 0) {
    errs.push(`${def.species}: tameXp must be positive`);
  }
  if (def.flavor.length < 1 || def.flavor.length > 200) {
    errs.push(`${def.species}: flavor must be one honest sentence`);
  }
  return errs;
}

/**
 * THE LEASH ON THE LADDER, second half — the ONE stat composition
 * site (beastcraft v2 Phase 2). The species def rides scaleNpcDef
 * exactly as a dungeon garrison would (the coupled-curve law in
 * npcs.ts holds: the die only drifts, the level multiplies at the
 * strike site), then THE HAND BEHIND THE FANG: the keeper's
 * beastcraft leans on the same beast — +1% health and +0.5% damage
 * per level, and a hide toughened a point of armor every 4 levels.
 * First-pass magnitudes; the Phase 6 ledger owns them. Anything that
 * reads a pet stat reads it from here or not at all.
 */
export interface PetStats {
  maxHp: number;
  /** The strike die — npcMaxHit(die, petLevel) at the strike site. */
  die: number;
  /** The hand's lean on every landed blow. */
  dmgMult: number;
  /** Mitigation armor (THREAT LAW rating: armor × 3). */
  armor: number;
}

export function petStatBlock(species: string, petLevel: number, bcLevel: number): PetStats | null {
  const base = NPCS.get(species);
  if (!base) return null;
  const scaled = petLevel > base.level ? scaleNpcDef(base, petLevel) : base;
  return {
    maxHp: Math.round(scaled.maxHp * (1 + 0.01 * bcLevel)),
    die: scaled.damage,
    dmgMult: 1 + 0.005 * bcLevel,
    armor: Math.floor(bcLevel / 4),
  };
}

/** Roster-wide gate — content tests refuse against THIS, never a copy. */
export function tameRosterErrors(): string[] {
  const errs: string[] = [];
  const seen = new Set<string>();
  for (const def of TAME_DEFS) {
    if (seen.has(def.species)) errs.push(`${def.species}: duplicate tame row`);
    seen.add(def.species);
    errs.push(...tameErrors(def));
  }
  return errs;
}
