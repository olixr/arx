/**
 * THE COMPANY YOU KEEP (docs/companions-plan.md) — the companion
 * registry. A companion is pure company: a small heart that befriends
 * a kind hand and simply comes along. It is not a tamed beast and
 * never becomes one — no beastcraft rung, no stall, no level, no
 * fight, no fall. The two systems share nothing but the world they
 * walk in.
 *
 * A CompanionDef existing at all IS the whitelist (the tame
 * registry's own law, held separately): there is no `companion` flag
 * on NpcDef to leak. The validator below refuses any body that could
 * ever fight, pay a bounty, or stand on the tame ladder at the same
 * time — a species is courted OR befriended, never both.
 */

import { NPCS } from './npcs.js';
import { itemDef } from './items.js';
import { TAMES } from './tames.js';
import { PET_REPERTOIRE } from './petArts.js';

export interface CompanionDef {
  /** NpcDef id — the wild body the friendship begins as. */
  species: string;
  /** Item id the befriending consumes — offered by hand, no skill asked. */
  treat: string;
  /** The plain pat's answer, in the world's diction (VOICE.md: no dashes). */
  pat: string;
  /** One concrete sentence in the world's diction. */
  flavor: string;
}

export const COMPANION_DEFS: readonly CompanionDef[] = [
  {
    // THE HEARTH'S SHADOW: the town cat, the first friend that never
    // fights. The courtship is exactly what every town cat has ever
    // wanted: a fish, offered by hand — no rung, no ladder, no
    // ceremony but the fish itself.
    species: 'cat',
    treat: 'raw_trout',
    pat: 'purrs against your shin, then pretends it never happened.',
    flavor: 'It owes you nothing and follows you anyway. The fish helped.',
  },
];

export const COMPANIONS: ReadonlyMap<string, CompanionDef> = new Map(
  COMPANION_DEFS.map((c) => [c.species, c]),
);

export function companionDef(species: string): CompanionDef | undefined {
  return COMPANIONS.get(species);
}

/** Every law a CompanionDef must clear. Empty array = clean. */
export function companionErrors(def: CompanionDef): string[] {
  const errs: string[] = [];
  const npc = NPCS.get(def.species);
  if (!npc) {
    errs.push(`species '${def.species}' is not in the bestiary`);
    return errs;
  }
  // THE COMPANY THAT KEEPS NO FANG, now structural for the whole
  // registry: a companion's body must be unable to fight, unable to
  // start one, and worth nothing dead — company, whole and entire.
  if (npc.damage > 0) errs.push(`${def.species}: a companion carries a damage-0 body`);
  if (npc.aggroRange > 0) errs.push(`${def.species}: a companion starts nothing`);
  if (npc.xpReward > 0) errs.push(`${def.species}: killing company pays no lesson`);
  if (npc.loot.length > 0) errs.push(`${def.species}: killing company pays no loot`);
  if (npc.produce || npc.lays) {
    errs.push(`${def.species}: livestock already has a place in your life`);
  }
  // ONE DOOR PER SPECIES: the tame ladder and the company never share
  // a body — the whole reason this registry exists apart.
  if (TAMES.has(def.species)) {
    errs.push(`${def.species}: courted or befriended, never both`);
  }
  if (PET_REPERTOIRE[def.species]) {
    errs.push(`${def.species}: company holds no art shelf`);
  }
  if (!itemDef(def.treat)) errs.push(`${def.species}: treat '${def.treat}' is not an item`);
  if (def.flavor.length < 1 || def.flavor.length > 200) {
    errs.push(`${def.species}: flavor must be one honest sentence`);
  }
  if (def.pat.length < 1 || def.pat.length > 200) {
    errs.push(`${def.species}: the pat must answer with one honest sentence`);
  }
  return errs;
}

/** Roster-wide gate — content tests refuse against THIS, never a copy. */
export function companionRosterErrors(): string[] {
  const errs: string[] = [];
  const seen = new Set<string>();
  for (const def of COMPANION_DEFS) {
    if (seen.has(def.species)) errs.push(`${def.species}: duplicate companion row`);
    seen.add(def.species);
    errs.push(...companionErrors(def));
  }
  return errs;
}
