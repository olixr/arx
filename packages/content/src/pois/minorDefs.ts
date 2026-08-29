import { hashString } from '@arx/shared';
import type { MinorDef } from './minorTypes.js';
import { validateMinorDef } from './minorValidate.js';

import findBarrow from './minors/find_barrow.json';
import findBeachedWreck from './minors/find_beached_wreck.json';
import findBonePile from './minors/find_bone_pile.json';
import findCatCache from './minors/find_cat_cache.json';
import findDenMouth from './minors/find_den_mouth.json';
import findForgottenGraves from './minors/find_forgotten_graves.json';
import findGlade from './minors/find_glade.json';
import findHuntersRest from './minors/find_hunters_rest.json';
import findOldRibs from './minors/find_old_ribs.json';
import findRoeGround from './minors/find_roe_ground.json';
import findSnareLine from './minors/find_snare_line.json';
import findStandingStone from './minors/find_standing_stone.json';
import findStashMound from './minors/find_stash_mound.json';
import findTideShrine from './minors/find_tide_shrine.json';
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
  findBeachedWreck,
  findBonePile,
  findCatCache,
  findDenMouth,
  findForgottenGraves,
  findGlade,
  findHuntersRest,
  findOldRibs,
  findRoeGround,
  findSnareLine,
  findStandingStone,
  findStashMound,
  findTappedYew,
  findTideShrine,
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

/**
 * THE BITS KNOW THEIR ROSTER (core-audit debt 6): a stable fingerprint
 * of the LIVE minor roster's deal-shaping content. The finds layer's
 * cleared bits bind by slot index while the deal re-derives from this
 * roster — same bits over a changed roster silently re-aim at the
 * wrong finds (a cleared boar den stands its replacement down, an
 * uncleared cache stands back up "cleared"). The server compares this
 * print to the one stored beside the frontier state and lawfully drops
 * every bit when it drifts. Sorted by id, whole-def JSON: any field
 * that could shape a deal counts, and field order can't fake identity.
 */
export function minorRosterFingerprint(defs: ReadonlyMap<string, MinorDef> = MINOR_DEFS): number {
  const ids = [...defs.keys()].sort();
  let fp = 0x51ab7e11 | 0;
  for (const id of ids) {
    fp = (Math.imul(fp, 0x01000193) ^ hashString(JSON.stringify(defs.get(id)))) | 0;
  }
  return fp >>> 0;
}

/** Swap the live registry in place (the replacePoiDefs pattern). */
export function replaceMinorDefs(defs: Iterable<MinorDef>): void {
  const next = new Map<string, MinorDef>();
  for (const d of defs) next.set(d.id, d);
  const live = MINOR_DEFS as Map<string, MinorDef>;
  live.clear();
  for (const [k, v] of next) live.set(k, v);
}
