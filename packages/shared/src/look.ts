/**
 * Player-chosen base appearance — the RuneScape layer of identity that
 * lives UNDER the gear. Everything is a palette index, never a raw
 * color: the server validates cheaply, the wire stays tiny, and the
 * art direction keeps final say over every hue on screen.
 *
 * The look is chosen once at character creation and then locked
 * server-side (a future makeover NPC can selectively unlock pieces —
 * the lock lives in one place on the server, not in the client).
 *
 * Heritage is COSMETIC, not mechanical: pointed ears, tusks, and an
 * ashen or war-green skin are how a player becomes an elf, an orc, or
 * a drow. No stats, no flags — just the face in the mirror.
 *
 * INDEX STABILITY LAW: looks are stored in the DB as raw indices, so
 * existing entries keep their meaning forever — new skins, styles,
 * and features are APPENDED, never inserted or reordered.
 */

export interface Look {
  /** SKIN_TONES index. */
  skin: number;
  /** HAIR_STYLES index. */
  hair: number;
  /** HAIR_COLORS index. */
  hairColor: number;
  /** BEARD_STYLES index. */
  beard: number;
  /** EYE_STYLES index. */
  eyes: number;
  /** EAR_STYLES index — round, or the pointed kinds that make an elf. */
  ears: number;
  /** FACE_FEATURES index — tusks, fangs, warpaint, scar, freckles. */
  feature: number;
  /** CLOTH_COLORS index — the tunic. */
  shirt: number;
  /** CLOTH_COLORS index — the trousers. */
  pants: number;
}

/**
 * Six honest skin tones, then the heritage shelf: the fantasy hues
 * that carry orc, drow, frost-kin, and moon-pale elf identities.
 */
export const SKIN_TONES = [
  '#f2d6b8',
  '#e8b98a',
  '#cf9a63',
  '#a8713f',
  '#7d5232',
  '#54371f',
  '#7fae4a',
  '#6fa8c9',
  '#a077c9',
  '#9aa2ac',
  '#557a35',
  '#5d5169',
  '#e9dfd6',
] as const;

/** Display names, aligned with SKIN_TONES. */
export const SKIN_TONE_NAMES = [
  'Fair',
  'Honey',
  'Bronze',
  'Tawny',
  'Umber',
  'Ebon',
  'Grove green',
  'Frost blue',
  'Violet',
  'Stone gray',
  'War green',
  'Drow ash',
  'Moonpale',
] as const;

export const HAIR_COLORS = [
  '#2a2020',
  '#4a3221',
  '#7a5230',
  '#b8863f',
  '#d9b45a',
  '#a83b2a',
  '#7a7d85',
  '#e8e4da',
  '#3e5a8a',
  '#4e7d54',
  '#b06a8e',
] as const;

/** Display names, aligned with HAIR_COLORS. */
export const HAIR_COLOR_NAMES = [
  'Raven',
  'Chestnut',
  'Brown',
  'Amber',
  'Gold',
  'Copper',
  'Ash gray',
  'Snow white',
  'Midnight blue',
  'Moss green',
  'Rose',
] as const;

/** Base cloth dyes for shirt and trousers (RuneScape starter wardrobe). */
export const CLOTH_COLORS = [
  '#c4553d',
  '#3d78c4',
  '#3da865',
  '#c4a03d',
  '#8a55c4',
  '#3da8a0',
  '#c47a3d',
  '#5b6570',
  '#8a3d5f',
  '#4a6b2e',
  '#31465e',
  '#6b4a2c',
] as const;

/**
 * THE SHEARING (2026-07-27): the eleven placeholder hairstyles and six
 * beards were retired wholesale — they were screen-space slabs that
 * snapped between facing bands instead of riding the skull. Hair is
 * rebuilt on the skull-ring projection (client render/hair.ts); styles
 * return one at a time as they earn their place. Index 0 stays the
 * default head of hair and index 1 stays Bald, so the two indices that
 * survive keep their stored meaning; every retired index is migrated
 * to 0 by sanitizeLook (see LEGACY_HAIR_MAX below). From here the
 * INDEX STABILITY LAW resumes: append, never reorder.
 *
 * 'Crop' (the short cut) was appended at index 2, which the retired
 * table used for 'Long'. There is no way to tell a pre-shearing 2 from
 * a post-shearing 2, so a character stored with the old Long loads
 * with the Crop. That is a deliberate, one-time cosmetic shift: the
 * alternative is a hole in the table, and a hole is a permanent bug
 * for every UI that enumerates styles.
 */
export const HAIR_STYLES = ['Wayfarer', 'Bald', 'Crop'] as const;

/**
 * Beards were retired with the shear and return on the same ring
 * foundation. The field stays on the wire and in the DB; every stored
 * index migrates to clean-shaven.
 */
export const BEARD_STYLES = ['Clean-shaven'] as const;

/** Highest style index ever stored by the retired systems. */
const LEGACY_HAIR_MAX = 10;
const LEGACY_BEARD_MAX = 6;

export const EYE_STYLES = ['Calm', 'Sharp', 'Wide', 'Lashed'] as const;

/** Round ears vanish into the head; the pointed kinds break the silhouette. */
export const EAR_STYLES = ['Round', 'Pointed', 'Upswept'] as const;

export const FACE_FEATURES = [
  'None',
  'Tusks',
  'Fangs',
  'Warpaint',
  'Scar',
  'Freckles',
] as const;

/**
 * Heritage presets — one-click starting points that read as a D&D
 * ancestry using nothing but cosmetics. Applying one pins the
 * identity-bearing fields (ears, feature, a skin pool) and nudges the
 * rest; every field stays individually editable afterwards.
 */
export interface Heritage {
  name: string;
  blurb: string;
  /** Allowed SKIN_TONES pool; the first entry is the signature tone. */
  skins: readonly number[];
  ears: number;
  feature: number;
  /** Preferred HAIR_COLORS pool; omitted = keep the current color. */
  hairColors?: readonly number[];
  /** Preferred BEARD_STYLES pool; omitted = keep the current beard. */
  beards?: readonly number[];
}

export const HERITAGES: readonly Heritage[] = [
  {
    name: 'Human',
    blurb: 'The wide-walking folk. Every road belongs to them.',
    skins: [1, 0, 2, 3, 4, 5],
    ears: 0,
    feature: 0,
  },
  {
    name: 'Elf',
    blurb: 'Upswept ears and grove-quiet steps.',
    skins: [12, 0, 1, 2],
    ears: 2,
    feature: 0,
  },
  {
    name: 'Drow',
    blurb: 'Ash-skinned kin of the sunless vaults.',
    skins: [11, 9],
    ears: 1,
    feature: 0,
    hairColors: [7, 6, 8],
  },
  {
    name: 'Orc',
    blurb: 'War-green and proud — tusks worn like medals.',
    skins: [10, 6],
    ears: 1,
    feature: 1,
  },
  {
    name: 'Goblin',
    blurb: 'Quick, sharp-eared, and grinning about it.',
    skins: [6, 10],
    ears: 2,
    feature: 2,
  },
  {
    name: 'Stoneborn',
    blurb: 'Mountain-hewn folk, patient as the crags they came from.',
    skins: [9, 3, 4],
    ears: 0,
    feature: 0,
  },
] as const;

/** Apply a heritage preset over a look — identity fields pinned, the rest kept. */
export function applyHeritage(
  h: Heritage,
  look: Look,
  rand: () => number = Math.random,
): Look {
  const pickFrom = (pool: readonly number[]): number =>
    pool[Math.floor(rand() * pool.length)]!;
  return {
    ...look,
    skin: pickFrom(h.skins),
    ears: h.ears,
    feature: h.feature,
    hairColor: h.hairColors ? pickFrom(h.hairColors) : look.hairColor,
    beard: h.beards ? pickFrom(h.beards) : look.beard,
  };
}

/** The default look — the pre-customization hero, for NPCs and fallbacks. */
export const DEFAULT_LOOK: Look = {
  skin: 1,
  hair: 0,
  hairColor: 1,
  beard: 0,
  eyes: 0,
  ears: 0,
  feature: 0,
  shirt: 1,
  pants: 1,
};

function idx(v: unknown, max: number): number | null {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v >= max) return null;
  return v;
}

/** Newer optional fields: absent = 0 (pre-expansion looks in the DB). */
function idxOpt(v: unknown, max: number): number | null {
  if (v === undefined) return 0;
  return idx(v, max);
}

/**
 * THE SHEARING migration: a stored index from the retired style range
 * collapses to 0 instead of invalidating the whole look — a player
 * who wore a topknot logs in wearing the default cut, never a broken
 * character. Anything outside even the legacy range is still garbage.
 */
function idxSheared(v: unknown, max: number, legacyMax: number): number | null {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) return null;
  if (v < max) return v;
  return v <= legacyMax ? 0 : null;
}

/** Validate an untrusted look; null when any field is out of range. */
export function sanitizeLook(raw: unknown): Look | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const skin = idx(r.skin, SKIN_TONES.length);
  const hair = idxSheared(r.hair, HAIR_STYLES.length, LEGACY_HAIR_MAX);
  const hairColor = idx(r.hairColor, HAIR_COLORS.length);
  const beard = idxSheared(r.beard, BEARD_STYLES.length, LEGACY_BEARD_MAX);
  const eyes = idxOpt(r.eyes, EYE_STYLES.length);
  const ears = idxOpt(r.ears, EAR_STYLES.length);
  const feature = idxOpt(r.feature, FACE_FEATURES.length);
  const shirt = idx(r.shirt, CLOTH_COLORS.length);
  const pants = idx(r.pants, CLOTH_COLORS.length);
  if (
    skin === null ||
    hair === null ||
    hairColor === null ||
    beard === null ||
    eyes === null ||
    ears === null ||
    feature === null ||
    shirt === null ||
    pants === null
  ) {
    return null;
  }
  return { skin, hair, hairColor, beard, eyes, ears, feature, shirt, pants };
}

/** Roll a coherent random look (natural skin tones weighted heavily). */
export function randomLook(rand: () => number = Math.random): Look {
  const pick = (n: number): number => Math.floor(rand() * n);
  // 4-in-5 rolls land on the honest tones; the heritage shelf is a choice.
  const skin = rand() < 0.8 ? pick(6) : 6 + pick(SKIN_TONES.length - 6);
  const green = skin === 6 || skin === 10;
  return {
    skin,
    // A full head of hair is the norm; bald is a choice, not a coin flip.
    hair: rand() < 0.45 ? 0 : rand() < 0.86 ? 2 : 1,
    hairColor: pick(HAIR_COLORS.length),
    beard: 0,
    eyes: pick(EYE_STYLES.length),
    // Most rolls keep round ears; green skins lean into pointed kinds.
    ears: rand() < (green ? 0.3 : 0.78) ? 0 : 1 + pick(EAR_STYLES.length - 1),
    // Features are seasoning: green skins favor tusks and fangs.
    feature:
      rand() < 0.68 ? 0 : green ? 1 + pick(2) : 1 + pick(FACE_FEATURES.length - 1),
    shirt: pick(CLOTH_COLORS.length),
    pants: pick(CLOTH_COLORS.length),
  };
}
