import type { MinorDef, MinorGarrisonEntry } from './minorTypes.js';

export type ValidateMinorResult =
  | { ok: true; def: MinorDef }
  | { ok: false; errors: string[] };

/** The habitat slugs WildEntry.habitat may answer to — one shared roster. */
const HABITAT_RE = /^[a-z][a-z0-9_]*$/;

/** THE TEXTURE-IS-NOT-TREASURE LAW's numbers, named. */
export const MINOR_GARRISON_CAP = 3;
export const MINOR_CACHE_CHANCE_CAP = 0.35;
export const MINOR_CLEARING_CAP = 2;

/**
 * THE ONE VALIDATOR for finds — guards authored JSON, DB rows, and
 * tool submissions alike (the validatePoiDef precedent: collect every
 * error, refuse loudly, never half-accept). `refs.prefabIds` (the live
 * prefab library) and `refs.npcIds` (the bestiary) cross-check when
 * provided; authored-registry builds pass the content registries.
 */
export function validateMinorDef(
  raw: unknown,
  refs: { prefabIds?: ReadonlySet<string>; npcIds?: ReadonlySet<string> } = {},
): ValidateMinorResult {
  const errors: string[] = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ['minor def must be an object'] };
  }
  const d = raw as Record<string, unknown>;

  const id = typeof d.id === 'string' ? d.id : '';
  if (!/^find_[a-z0-9_]+$/.test(id)) {
    errors.push(`id '${String(d.id)}' must match find_[a-z0-9_]+ (the finds prefix is law)`);
  }
  const name = typeof d.name === 'string' && d.name.trim().length > 0 ? d.name : '';
  if (!name) errors.push('name is required');
  const description = typeof d.description === 'string' ? d.description : undefined;

  const tiers = d.tiers;
  let tiersOk: readonly [number, number] = [1, 1];
  if (
    !Array.isArray(tiers) ||
    tiers.length !== 2 ||
    !Number.isInteger(tiers[0]) ||
    !Number.isInteger(tiers[1]) ||
    (tiers[0] as number) < 1 ||
    (tiers[1] as number) > 5 ||
    (tiers[0] as number) > (tiers[1] as number)
  ) {
    errors.push('tiers must be integers [min, max] inside [1, 5]');
  } else {
    tiersOk = [tiers[0] as number, tiers[1] as number];
  }

  const weight = typeof d.weight === 'number' && Number.isFinite(d.weight) ? d.weight : NaN;
  if (!(weight > 0)) errors.push('weight must be a positive number');

  const prefabs = Array.isArray(d.prefabs) ? d.prefabs : null;
  const prefabsOk: string[] = [];
  if (!prefabs || prefabs.length === 0) {
    errors.push('prefabs must be a non-empty array of prefab ids');
  } else {
    for (const p of prefabs) {
      if (typeof p !== 'string' || p.length === 0) {
        errors.push('prefabs entries must be non-empty strings');
        continue;
      }
      if (refs.prefabIds && !refs.prefabIds.has(p)) {
        errors.push(`prefab '${p}' is not in the library`);
      }
      prefabsOk.push(p);
    }
  }

  const garrisonOk: MinorGarrisonEntry[] = [];
  if (d.garrison !== undefined) {
    if (!Array.isArray(d.garrison)) {
      errors.push('garrison must be an array');
    } else {
      for (const [i, g] of (d.garrison as unknown[]).entries()) {
        const at = `garrison[${i}]`;
        if (typeof g !== 'object' || g === null) {
          errors.push(`${at} must be an object`);
          continue;
        }
        const e = g as Record<string, unknown>;
        const npc = typeof e.npc === 'string' && e.npc.length > 0 ? e.npc : '';
        if (!npc) errors.push(`${at}.npc is required`);
        else if (refs.npcIds && !refs.npcIds.has(npc)) errors.push(`${at}: unknown npc '${npc}'`);
        const count = e.count;
        let countOk: readonly [number, number] = [1, 1];
        if (
          !Array.isArray(count) ||
          count.length !== 2 ||
          !Number.isInteger(count[0]) ||
          !Number.isInteger(count[1]) ||
          (count[0] as number) < 0 ||
          (count[0] as number) > (count[1] as number)
        ) {
          errors.push(`${at}.count must be integers [min, max], 0 <= min <= max`);
        } else {
          countOk = [count[0] as number, count[1] as number];
        }
        if (e.minTier !== undefined && (!Number.isInteger(e.minTier) || (e.minTier as number) < 1 || (e.minTier as number) > 5)) {
          errors.push(`${at}.minTier must be an integer in [1, 5]`);
        }
        if (e.levelOffset !== undefined && (!Number.isInteger(e.levelOffset) || Math.abs(e.levelOffset as number) > 8)) {
          errors.push(`${at}.levelOffset must be an integer within ±8`);
        }
        let hours: { from: number; to: number } | undefined;
        if (e.hours !== undefined) {
          const h = e.hours as { from?: unknown; to?: unknown };
          if (
            typeof h !== 'object' || h === null ||
            typeof h.from !== 'number' || typeof h.to !== 'number' ||
            h.from < 0 || h.from >= 24 || h.to < 0 || h.to >= 24 || h.from === h.to
          ) {
            errors.push(`${at}.hours must be {from, to} in [0, 24), from != to`);
          } else {
            hours = { from: h.from, to: h.to };
          }
        }
        garrisonOk.push({
          npc,
          count: countOk,
          ...(e.minTier !== undefined ? { minTier: e.minTier as number } : {}),
          ...(e.levelOffset !== undefined ? { levelOffset: e.levelOffset as number } : {}),
          ...(hours !== undefined ? { hours } : {}),
        });
      }
      const maxBodies = garrisonOk.reduce((s, g) => s + g.count[1], 0);
      if (maxBodies > MINOR_GARRISON_CAP) {
        errors.push(
          `garrison may field at most ${MINOR_GARRISON_CAP} bodies ` +
            `(texture is not a camp — ${maxBodies} authored)`,
        );
      }
    }
  }

  if (d.habitat !== undefined && (typeof d.habitat !== 'string' || !HABITAT_RE.test(d.habitat))) {
    errors.push('habitat must be a lowercase slug');
  }

  if (d.family !== undefined && (typeof d.family !== 'string' || !HABITAT_RE.test(d.family))) {
    errors.push('family must be a lowercase slug');
  }

  let cache: { chance: number } | undefined;
  if (d.cache !== undefined) {
    const c = d.cache as { chance?: unknown };
    if (typeof c !== 'object' || c === null || typeof c.chance !== 'number') {
      errors.push('cache must be { chance }');
    } else if (!(c.chance > 0) || c.chance > MINOR_CACHE_CHANCE_CAP) {
      errors.push(
        `cache.chance must sit in (0, ${MINOR_CACHE_CHANCE_CAP}] — texture is not treasure`,
      );
    } else {
      cache = { chance: c.chance };
    }
  }

  if (
    d.clearing !== undefined &&
    (!Number.isInteger(d.clearing) || (d.clearing as number) < 0 || (d.clearing as number) > MINOR_CLEARING_CAP)
  ) {
    errors.push(`clearing must be an integer in [0, ${MINOR_CLEARING_CAP}]`);
  }

  const known = new Set([
    'id', 'name', 'description', 'tiers', 'weight', 'prefabs',
    'garrison', 'habitat', 'family', 'cache', 'clearing',
  ]);
  for (const key of Object.keys(d)) {
    if (!known.has(key)) errors.push(`unknown field '${key}'`);
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    def: {
      id,
      name,
      ...(description !== undefined ? { description } : {}),
      tiers: tiersOk,
      weight,
      prefabs: prefabsOk,
      ...(garrisonOk.length > 0 ? { garrison: garrisonOk } : {}),
      ...(typeof d.habitat === 'string' ? { habitat: d.habitat } : {}),
      ...(typeof d.family === 'string' ? { family: d.family } : {}),
      ...(cache !== undefined ? { cache } : {}),
      ...(d.clearing !== undefined ? { clearing: d.clearing as number } : {}),
    },
  };
}
