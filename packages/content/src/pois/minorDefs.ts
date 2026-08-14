import type { MinorDef } from './minorTypes.js';
import { validateMinorDef } from './minorValidate.js';

import findBarrow from './minors/find_barrow.json';
import findBonePile from './minors/find_bone_pile.json';
import findCatCache from './minors/find_cat_cache.json';
import findDenMouth from './minors/find_den_mouth.json';
import findGlade from './minors/find_glade.json';
import findHuntersRest from './minors/find_hunters_rest.json';
import findSnareLine from './minors/find_snare_line.json';
import findStandingStone from './minors/find_standing_stone.json';
import findStashMound from './minors/find_stash_mound.json';
import findWarTotem from './minors/find_war_totem.json';
import findTappedYew from './minors/find_tapped_yew.json';
import findWarren from './minors/find_warren.json';
import findWaymarkCairn from './minors/find_waymark_cairn.json';
import findWreckedCart from './minors/find_wrecked_cart.json';

/**
 * Every authored find JSON, registered here — the POI_DEFS pattern
 * wholesale: a def that isn't listed doesn't exist, and pois.test.ts
 * walks the minors/ directory so forgetting the import is a test
 * failure, not a hole in the texture.
 */
const SOURCES: readonly unknown[] = [
  findBarrow,
  findBonePile,
  findCatCache,
  findDenMouth,
  findGlade,
  findHuntersRest,
  findSnareLine,
  findStandingStone,
  findStashMound,
  findTappedYew,
  findWarTotem,
  findWarren,
  findWaymarkCairn,
  findWreckedCart,
];

function buildRegistry(): ReadonlyMap<string, MinorDef> {
  const map = new Map<string, MinorDef>();
  const errors: string[] = [];
  for (const raw of SOURCES) {
    const res = validateMinorDef(raw);
    if (!res.ok) {
      errors.push(...res.errors);
      continue;
    }
    if (map.has(res.def.id)) errors.push(`${res.def.id}: duplicate minor id`);
    else map.set(res.def.id, res.def);
  }
  if (errors.length > 0) throw new Error(`invalid minor defs:\n  ${errors.join('\n  ')}`);
  return map;
}

/**
 * The LIVE finds registry — every runtime consumer resolves through
 * .get()/.values() at call time (the live-registry law), so
 * replaceMinorDefs applies a Studio edit to the very next slot
 * decision.
 */
export const MINOR_DEFS: ReadonlyMap<string, MinorDef> = buildRegistry();

/** The authored roster exactly as shipped — the CMS revert target. */
export const AUTHORED_MINOR_DEFS: ReadonlyMap<string, MinorDef> = buildRegistry();

/** Swap the live registry in place (the replacePoiDefs pattern). */
export function replaceMinorDefs(defs: Iterable<MinorDef>): void {
  const next = new Map<string, MinorDef>();
  for (const d of defs) next.set(d.id, d);
  const live = MINOR_DEFS as Map<string, MinorDef>;
  live.clear();
  for (const [k, v] of next) live.set(k, v);
}
