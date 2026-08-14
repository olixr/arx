import { hashCoords } from '../math/rng.js';
import { RARITY_TIERS, rarityIndex, type ItemRoll, type RarityTier } from '../rarity.js';

/**
 * Dungeon keys — THE SEED-IS-THE-DUNGEON LAW.
 *
 * A dungeon key is an ordinary item instance whose ItemRoll IS the
 * dungeon: `roll.seed` fixes the layout down to the last stalagmite,
 * `roll.rar` is the tier (size, depth of the treasure ladder, garrison
 * density), and `roll.pwr` is the power level the garrison is scaled
 * to. Nothing else is stored anywhere: the same key regenerates the
 * same halls forever, on any server, after any restart — which is what
 * makes keys worth trading, hoarding, and awarding.
 *
 * Everything here is pure and shared: the server generates from a spec,
 * the client titles the key card and the entry banner from the same
 * spec, and the two can never disagree.
 */

/** The one key item id. Identity lives in the roll, not the item. */
export const DUNGEON_KEY_ITEM = 'dungeon_key';

/**
 * The five dungeon dialects. `caveness` is the fraction of chambers
 * carved as natural cavern (cellular growth) rather than worked halls
 * (rect rooms + masonry) — the generator blends the two per room, so
 * a stronghold still cracks open into raw cave now and then and a
 * cavern hides the odd bricked vault. The warren is the gnolls'
 * ground: dug dens, bone and hide, the Matriarch at the heart.
 */
export type DungeonTheme = 'cavern' | 'crypt' | 'mine' | 'stronghold' | 'warren';

export interface ThemeLaw {
  theme: DungeonTheme;
  /** 0..1 — chance any given chamber is natural cave vs worked hall. */
  caveness: number;
  /** Chance the dungeon carries shallow groundwater pools. */
  water: number;
}

export const THEME_LAWS: readonly ThemeLaw[] = [
  { theme: 'cavern', caveness: 0.92, water: 0.75 },
  { theme: 'mine', caveness: 0.6, water: 0.45 },
  { theme: 'stronghold', caveness: 0.3, water: 0.15 },
  { theme: 'crypt', caveness: 0.15, water: 0.0 },
  { theme: 'warren', caveness: 0.75, water: 0.25 },
];

/**
 * What each key tier buys. Size is the square side in tiles; chambers
 * is the target room count; power is the DEFAULT recommended combat
 * level when the roll carries no explicit pwr (awarded keys may
 * override — a legendary key stamped pwr 90 is endgame no matter what
 * the tier default says).
 */
export interface TierLaw {
  size: number;
  chambers: number;
  power: number;
  /** Vendor value of a key at this tier (economy floor, not cap). */
  value: number;
}

// THE LONG DARK: a run is a 5–10 minute journey — the spine-and-branch
// plan draws the road, these laws buy it the ground it needs.
export const DUNGEON_TIER_LAWS: Record<RarityTier, TierLaw> = {
  common: { size: 120, chambers: 12, power: 6, value: 120 },
  uncommon: { size: 140, chambers: 16, power: 16, value: 340 },
  rare: { size: 160, chambers: 20, power: 30, value: 900 },
  epic: { size: 180, chambers: 25, power: 48, value: 2200 },
  legendary: { size: 200, chambers: 30, power: 68, value: 5600 },
};

/** Everything the generator (and the key card) needs, derived pure. */
export interface DungeonSpec {
  seed: number;
  tier: RarityTier;
  theme: DungeonTheme;
  /** Recommended combat level; the garrison is scaled to it. */
  power: number;
  size: number;
  chambers: number;
  /** Seed-derived title, e.g. "The Ashen Barrow". */
  name: string;
  /** Short pronounceable seed code, e.g. "KAR-VOTH" — the trade name. */
  sigil: string;
}

/** Derive the full spec from a key's roll. Pure; client and server share it. */
export function dungeonSpecFromRoll(roll: ItemRoll | undefined): DungeonSpec {
  const seed = (roll?.seed ?? 0) >>> 0;
  const tier: RarityTier = roll?.rar ?? 'common';
  const law = DUNGEON_TIER_LAWS[tier];
  const themeLaw = THEME_LAWS[hashCoords(seed, 11, 29) % THEME_LAWS.length]!;
  return {
    seed,
    tier,
    theme: themeLaw.theme,
    power: clampPower(roll?.pwr ?? law.power),
    size: law.size,
    chambers: law.chambers,
    name: dungeonName(seed, themeLaw.theme),
    sigil: dungeonSigil(seed),
  };
}

function clampPower(p: number): number {
  return Math.max(1, Math.min(99, Math.floor(p)));
}

// ---------------------------------------------------------------- names

/**
 * Seed-derived titles. Word banks are per-theme so a key's name hints
 * at what waits inside — a miner reads "Galleries" and packs a
 * pickaxe. Kept to weathered, earthen vocabulary.
 */
const NAME_BANKS: Record<DungeonTheme, { adj: string[]; noun: string[] }> = {
  cavern: {
    adj: ['Whispering', 'Sunken', 'Glimmering', 'Yawning', 'Drowned', 'Echoing', 'Weeping', 'Hollow'],
    noun: ['Hollows', 'Caverns', 'Depths', 'Grottoes', 'Chasm', 'Undercaves', 'Gulf', 'Warrens'],
  },
  mine: {
    adj: ['Abandoned', 'Collapsed', 'Rusted', 'Deep-Cut', 'Forgotten', 'Flooded', 'Broken', 'Old'],
    noun: ['Galleries', 'Shafts', 'Diggings', 'Quarry', 'Lodeworks', 'Tunnels', 'Delvings', 'Pits'],
  },
  stronghold: {
    adj: ['Broken', 'Fallen', 'Iron', 'Grim', 'Shattered', 'Silent', 'Last', 'Sundered'],
    noun: ['Bastion', 'Garrison', 'Redoubt', 'Holdfast', 'Rampart', 'Keep', 'Vaults', 'Barracks'],
  },
  crypt: {
    adj: ['Ashen', 'Mossgrown', 'Quiet', 'Gloomlit', 'Crumbled', 'Nameless', 'Cold', 'Elder'],
    noun: ['Barrow', 'Crypt', 'Ossuary', 'Tombs', 'Catacombs', 'Sepulcher', 'Reliquary', 'Halls'],
  },
  warren: {
    adj: ['Howling', 'Gnawed', 'Redfang', 'Musky', 'Snarling', 'Bonestrewn', 'Rank', 'Wild'],
    noun: ['Dens', 'Warren', 'Burrows', 'Lair', 'Digs', 'Underdens', 'Hollow', 'Sett'],
  },
};

export function dungeonName(seed: number, theme: DungeonTheme): string {
  const bank = NAME_BANKS[theme];
  const adj = bank.adj[hashCoords(seed, 3, 7) % bank.adj.length]!;
  const noun = bank.noun[hashCoords(seed, 5, 13) % bank.noun.length]!;
  return `The ${adj} ${noun}`;
}

/**
 * A short pronounceable code minted from the seed — the key's trade
 * name. Two syllable pairs cover ~4.3M combinations; collisions are
 * harmless (the seed, not the sigil, is identity) but rare enough
 * that "KAR-VOTH sells for 2k" works as market shorthand.
 */
const SIGIL_ON = ['K', 'V', 'TH', 'M', 'R', 'D', 'G', 'BR', 'SK', 'N', 'DR', 'H', 'ST', 'F', 'GR', 'L'];
const SIGIL_NUC = ['A', 'E', 'O', 'U', 'AR', 'OR', 'IR', 'UN'];
const SIGIL_COD = ['N', 'R', 'TH', 'M', 'D', 'K', 'L', 'ND'];

function syllable(h: number): string {
  const on = SIGIL_ON[h & 15]!;
  const nuc = SIGIL_NUC[(h >>> 4) & 7]!;
  const cod = SIGIL_COD[(h >>> 7) & 7]!;
  return on + nuc + cod;
}

export function dungeonSigil(seed: number): string {
  const h = hashCoords(seed, 17, 23);
  return `${syllable(h)}-${syllable(h >>> 10)}`;
}

// ------------------------------------------------------------- economy

/**
 * The key ladder: which tier a dungeon's own boss chest pays out.
 * Running a dungeon should feed the next rung — commons seed
 * uncommons, epics seed legendaries, legendaries keep paying
 * legendaries (the endgame loop sustains itself).
 */
export function nextKeyTier(tier: RarityTier): RarityTier {
  const i = rarityIndex(tier);
  return RARITY_TIERS[Math.min(i + 1, RARITY_TIERS.length - 1)]!;
}

/** A freshly minted key's power for its tier, with seeded jitter. */
export function mintKeyPower(tier: RarityTier, seed: number): number {
  const law = DUNGEON_TIER_LAWS[tier];
  return clampPower(law.power + (hashCoords(seed, 41, 43) % 7) - 3);
}

// ---------------------------------------------------------------- wear

/**
 * THE WORN WARD: how many turns a fresh key of each tier holds. Every
 * fresh cut of the key's dungeon spends one (re-entering a run that
 * still stands is free — the door is already open); at zero the ward
 * is worn through and the key crumbles when its dungeon tears down.
 * THE THREE TURNS (user decree, 2026-08-14): every key holds exactly
 * three, whatever its tier — the allure is the same scarce arithmetic
 * at every rung, and a legendary is precious for what it opens, not
 * for how often.
 */
export const KEY_USES_LAWS: Record<RarityTier, number> = {
  common: 3,
  uncommon: 3,
  rare: 3,
  epic: 3,
  legendary: 3,
};

/** The use budget a fresh key of this tier is minted with. */
export function keyUsesForTier(tier: RarityTier): number {
  return KEY_USES_LAWS[tier];
}

/**
 * Turns left in a key. Absent reads as the FULL tier budget — every
 * key minted before wear shipped starts whole (legacy grace), and the
 * wire never has to carry a field for an unworn key.
 */
export function keyUsesLeft(roll: ItemRoll | undefined): number {
  const tier: RarityTier = roll?.rar ?? 'common';
  return roll?.uses ?? keyUsesForTier(tier);
}

// ---------------------------------------------------------------- lore

/**
 * THE KEY LEDGER: a door once held is known forever. The moment a key
 * lands on a character's ring, its identity (seed/tier/power — the
 * whole dungeon, by the seed-is-the-dungeon law) is written into that
 * character's ledger and never leaves it, even after the key crumbles
 * or trades away. The ledger is KNOWLEDGE, not property: it holds no
 * uses, opens no doors, and its labels are the reader's own margin
 * notes (they never ride a traded key).
 *
 * THE KEYWRIGHT CLOSES THE LOOP: a ledgered door can be cut again by
 * the Keywright for a steep price — the wear economy stands (keys
 * still die), but a door you loved is never lost forever, only
 * expensive. Priced off the tier's vendor value so the ladder's
 * arithmetic carries through.
 */
export interface KeyLore {
  seed: number;
  rar: RarityTier;
  pwr?: number;
  /** The reader's own margin note; absent = unlabeled. */
  label?: string;
}

/**
 * The Keywright's fee: steep enough that finding keys stays the road
 * and the forge stays the safety net — three keys' worth of coin for
 * one re-cut door, at every rung.
 */
export const KEY_FORGE_PRICE_MULT = 3;

export function keyForgePrice(tier: RarityTier): number {
  return DUNGEON_TIER_LAWS[tier].value * KEY_FORGE_PRICE_MULT;
}

/**
 * A margin-note label: 2–24 characters, letters/digits with inner
 * spaces, apostrophes, or hyphens, starting and ending on a letter or
 * digit. Whitespace collapses. Returns the cleaned label, or null
 * when nothing worthy of ink remains — both sides run the same rule
 * (the pet collar-tag law), so the pen can refuse before the wire
 * ever hears about it.
 */
export function sanitizeKeyLabel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.replace(/\s+/g, ' ').trim();
  if (clean.length < 2 || clean.length > 24) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9 '-]*[A-Za-z0-9]$/.test(clean)) return null;
  return clean;
}
