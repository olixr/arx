/**
 * THE LADDER OF TRUST (docs/beastcraft-plan.md, beastcraft v2) — the
 * tame registry. A TameDef existing at all IS the whitelist: there is
 * no `tamable` flag on NpcDef to leak, and everything the plan bans
 * (champions and matriarchs, humanoids, the risen dead, slimes,
 * livestock, the prey crowns) is refused structurally by the
 * validator below, so a future roster row cannot drift past the law
 * without a test going red.
 *
 * THE SPECIES SPEAK (Phase 5): the full ladder stands, entry pair to
 * the worg capstone, each kit shaped from the species' shipped teeth.
 * The ladder table is a tuning dial (plan Part 5), never a law.
 */

import type { StatusApply } from '@arx/shared';
import { NPCS, scaleNpcDef, type NpcDef } from './npcs.js';
import { itemDef } from './items.js';

/**
 * THE SPECIES SPEAK (Phase 5): a tamed kit is the species' own
 * shipped teeth re-aimed, never an invented spellbook. `bite`
 * overrides (or supplies) the status the companion's landed blow
 * carries; `armor` is the shell's lean at the ONE stat site;
 * `knockback` is the gore. Pounce openers ride NpcDef.pounce
 * unchanged — the wild body and the tamed body share one anatomy.
 */
export interface TameKit {
  bite?: StatusApply;
  armor?: number;
  knockback?: number;
}

export interface TameDef {
  /** NpcDef id — the wild body this bond begins as. */
  species: string;
  /** Beastcraft rung: the gentling refuses below this, aloud. */
  level: number;
  /** Item id the gentling consumes — the farmer and cook sell to the hunter. */
  lure: string;
  /** The ceremony's beastcraft grant — the tame is the skill's spine. */
  tameXp: number;
  /** The tamed body's teeth (see TameKit). Absent = the wild kit as-is. */
  kit?: TameKit;
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
    // THE SHELL: the first tank. Armor at the one stat site.
    kit: { armor: 4 },
    flavor: 'A walking shield with a sweet tooth for windfall berries.',
  },
  {
    species: 'rat',
    level: 10,
    lure: 'egg',
    tameXp: 50,
    // FILTH NIP: the first fang — the sewer's own gift.
    kit: { bite: { status: 'venom', power: 1, durationTicks: 60 } },
    flavor: 'Quick in the dark, and loyal to whoever holds the egg.',
  },
  {
    species: 'cave_bat',
    level: 10,
    lure: 'berries',
    tameXp: 60,
    // THE FIRST LESSON KEPT: no kit — the bleeding nip is the wild
    // tooth as-is, the wolf-and-bear precedent at the entry rung.
    flavor: 'A scrap of night that sleeps in your hood and wakes for berries.',
  },
  {
    species: 'mudcrab',
    level: 15,
    lure: 'raw_trout',
    tameXp: 50,
    // THE GRIP: a pinch that holds the mark half-still.
    kit: { bite: { status: 'chill', power: 1, durationTicks: 50 } },
    flavor: 'It holds what it takes. Ask any careless toe on the shore.',
  },
  {
    species: 'boar',
    level: 15,
    lure: 'carrot',
    tameXp: 100,
    // GORE: the charge lands like a cart — the pounce is the species' own.
    kit: { knockback: 1.6 },
    flavor: 'A cart with opinions. Point it and stand aside.',
  },
  {
    species: 'giant_spider',
    level: 20,
    lure: 'raw_beef',
    tameXp: 130,
    // THE PATIENT FANG: no kit — the wild venom and the born pounce
    // are already its own, and the web stays on the wild cast rail.
    flavor: 'Eight eyes, and every one of them minds your back.',
  },
  {
    species: 'wolf',
    level: 20,
    lure: 'raw_beef',
    tameXp: 150,
    // WORRY THE WOUND: the wild bleed and the fast lope, untouched.
    flavor: 'It runs where you look. The pack was practice for you.',
  },
  {
    species: 'bear',
    level: 25,
    lure: 'raw_beef',
    tameXp: 190,
    // THE CHARGE: the big wall — pounce and maul as it was born with.
    flavor: 'A wall that walks beside you and eats more than you do.',
  },
  {
    species: 'great_owl',
    level: 30,
    lure: 'raw_trout',
    tameXp: 190,
    // THE SWOOP AND THE HUSH: the strike from above lands cold.
    kit: { bite: { status: 'chill', power: 1, durationTicks: 60 } },
    flavor: 'The quietest thing you will ever own, and the largest.',
  },
  {
    species: 'adder',
    level: 35,
    lure: 'egg',
    tameXp: 120,
    // DEEP VENOM: the poisoner's pick, one weight past the wild dose.
    kit: { bite: { status: 'venom', power: 2, durationTicks: 100 } },
    flavor: 'It came for the egg and stayed for the second egg.',
  },
  {
    species: 'worg',
    level: 45,
    lure: 'raw_beef',
    tameXp: 170,
    // THE WAR-HOUND TURNED: the capstone — cold bite, hard head.
    kit: { armor: 2 },
    flavor: 'Bred for a war it no longer owes. It sleeps facing the door.',
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
const NEVER_TAMED = new Set([
  'dire_wolf',
  'elder_great_owl',
  'stag',
  'hind',
  // Livestock by nature even before it is livestock by row: a sheep
  // carries no produce on its NpcDef (the yard registry pays), so
  // the structural refusal misses it — named here instead.
  'sheep',
  // The ram and the bull graze the same yards: livestock by nature
  // with no produce row on the NpcDef either, so the structural
  // refusal misses them the same way.
  'ram',
  'bull',
]);

/**
 * THE WILD'S OWN WORDS (THE KEEPER'S TONGUE): which bodies the wild-
 * facing beastcraft arts speak to. A wild beast is anything that
 * walks the beast rig and answers to no one: humanoids and the risen
 * dead are out by prefix, slimes split instead of listening, and
 * livestock already has a place in your life. Callers exclude actors
 * and pets at the site (the store knows those, content does not).
 */
export function isWildBeast(def: NpcDef): boolean {
  if (def.splitInto) return false;
  if (def.produce || def.lays) return false;
  for (const prefix of HUMANOID_PREFIXES) {
    if (def.id.startsWith(prefix)) return false;
  }
  if (def.id.startsWith('slime')) return false;
  return true;
}

/**
 * Too proud to be stilled: champions and the crowned terrors hear the
 * becalm words and refuse them. The truce and the bait simply pass
 * them by (a sovereign neither pauses for supper nor grants one).
 */
export function isBeastSovereign(def: NpcDef): boolean {
  return def.id.endsWith('_champion') || def.id === 'dire_wolf' || def.id === 'elder_great_owl';
}

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
  if (def.kit) {
    const k = def.kit;
    if (k.bite) {
      if (!['bleed', 'burn', 'venom', 'chill', 'shock'].includes(k.bite.status)) {
        errs.push(`${def.species}: kit bite status '${k.bite.status}' unknown`);
      }
      if (!(k.bite.power > 0) || !(k.bite.durationTicks > 0)) {
        errs.push(`${def.species}: kit bite needs positive power and duration`);
      }
    }
    if (k.armor !== undefined && (!Number.isInteger(k.armor) || k.armor <= 0 || k.armor > 12)) {
      errs.push(`${def.species}: kit armor outside (0, 12]`);
    }
    if (k.knockback !== undefined && (k.knockback < 1 || k.knockback > 2.5)) {
      errs.push(`${def.species}: kit knockback outside [1, 2.5]`);
    }
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
    // The hand's toughening plus THE SHELL where a kit grants one.
    armor: Math.floor(bcLevel / 4) + (TAMES.get(species)?.kit?.armor ?? 0),
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
