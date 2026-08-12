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
 * The four dungeon dialects. `caveness` is the fraction of chambers
 * carved as natural cavern (cellular growth) rather than worked halls
 * (rect rooms + masonry) — the generator blends the two per room, so
 * a stronghold still cracks open into raw cave now and then and a
 * cavern hides the odd bricked vault.
 */
export type DungeonTheme = 'cavern' | 'crypt' | 'mine' | 'stronghold';

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

export const DUNGEON_TIER_LAWS: Record<RarityTier, TierLaw> = {
  common: { size: 100, chambers: 10, power: 6, value: 120 },
  uncommon: { size: 120, chambers: 13, power: 16, value: 340 },
  rare: { size: 140, chambers: 17, power: 30, value: 900 },
  epic: { size: 160, chambers: 21, power: 48, value: 2200 },
  legendary: { size: 184, chambers: 26, power: 68, value: 5600 },
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
