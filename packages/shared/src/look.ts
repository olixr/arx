/**
 * Player-chosen base appearance — the RuneScape layer of identity that
 * lives UNDER the gear. Everything is a palette index, never a raw
 * color: the server validates cheaply, the wire stays tiny, and the
 * art direction keeps final say over every hue on screen.
 *
 * The look is chosen once at character creation and then locked
 * server-side (a future makeover NPC can selectively unlock pieces —
 * the lock lives in one place on the server, not in the client).
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
  /** CLOTH_COLORS index — the tunic. */
  shirt: number;
  /** CLOTH_COLORS index — the trousers. */
  pants: number;
}

/** Six honest skin tones, then the goofy shelf: green, frost, violet, stone. */
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

export const HAIR_STYLES = ['Crop', 'Bald', 'Long', 'Topknot'] as const;
export const BEARD_STYLES = ['Clean-shaven', 'Mustache', 'Goatee', 'Full beard'] as const;

/** The default look — the pre-customization hero, for NPCs and fallbacks. */
export const DEFAULT_LOOK: Look = { skin: 1, hair: 0, hairColor: 1, beard: 0, shirt: 1, pants: 1 };

function idx(v: unknown, max: number): number | null {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v >= max) return null;
  return v;
}

/** Validate an untrusted look; null when any field is out of range. */
export function sanitizeLook(raw: unknown): Look | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const skin = idx(r.skin, SKIN_TONES.length);
  const hair = idx(r.hair, HAIR_STYLES.length);
  const hairColor = idx(r.hairColor, HAIR_COLORS.length);
  const beard = idx(r.beard, BEARD_STYLES.length);
  const shirt = idx(r.shirt, CLOTH_COLORS.length);
  const pants = idx(r.pants, CLOTH_COLORS.length);
  if (
    skin === null ||
    hair === null ||
    hairColor === null ||
    beard === null ||
    shirt === null ||
    pants === null
  ) {
    return null;
  }
  return { skin, hair, hairColor, beard, shirt, pants };
}

/** Roll a coherent random look (natural skin tones weighted heavily). */
export function randomLook(rand: () => number = Math.random): Look {
  const pick = (n: number): number => Math.floor(rand() * n);
  return {
    // 4-in-5 rolls land on the honest tones; the goofy shelf is a choice.
    skin: rand() < 0.8 ? pick(6) : 6 + pick(SKIN_TONES.length - 6),
    hair: pick(HAIR_STYLES.length),
    hairColor: pick(HAIR_COLORS.length),
    beard: pick(BEARD_STYLES.length),
    shirt: pick(CLOTH_COLORS.length),
    pants: pick(CLOTH_COLORS.length),
  };
}
