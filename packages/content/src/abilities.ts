import type { AbilityDef, TechniqueDef } from '@arx/shared';
import { GREEN_ART_DEFS } from './abilities/greenArts.js';
import { SECRET_ART_DEFS } from './abilities/secrets/index.js';
import { RELIC_DEFS } from './abilities/relics.js';
import { SCHOOL_ART_DEFS } from './abilities/schools/index.js';
import { SIGIL_DEFS } from './abilities/sigils.js';
import { NPC_ART_DEFS } from './abilities/npcArts.js';
import { BEASTCRAFT_DEFS } from './abilities/beastcraft.js';
import { POLEARM_DEFS } from './abilities/polearm.js';
import { TECHNIQUE_LADDER_DEFS } from './abilities/techniqueLadder.js';

/**
 * Every active ability in the game, as pure data. Weapon Arts are
 * referenced from a weapon's `art`, relic actives from a relic item's
 * `relic`, and NPC specials from an NpcDef's `special.ability` — all
 * three run through the same server-side interpreter.
 *
 * Cooldown feel targets (before on-hit haste): weapon arts ~6–10 s so
 * every skirmish has one or two Art moments; relics ~12–20 s so the
 * relic is a fight-shaping decision, not a rotation filler.
 */
const defs: AbilityDef[] = [
  ...GREEN_ART_DEFS,
  ...SECRET_ART_DEFS,
  ...RELIC_DEFS,
  ...SCHOOL_ART_DEFS,
  ...SIGIL_DEFS,
  ...NPC_ART_DEFS,
  ...BEASTCRAFT_DEFS,
  ...POLEARM_DEFS,
];

export const ABILITIES: ReadonlyMap<string, AbilityDef> = new Map(defs.map((d) => [d.id, d]));

export function abilityDef(id: string): AbilityDef | undefined {
  return ABILITIES.get(id);
}

/**
 * The technique ladder: which abilities each combat style unlocks and
 * when. Swapping among unlocked techniques is always free.
 *
 * THE HONED-ART LAW: each art carries three rank steps past Rank I,
 * reached at +15/+30/+45 base levels over its unlock — compressed for
 * rungs past 54 by THE SHORTENED CLIMB (shared rankStride), so every
 * art masters exactly by 99. Rank II sharpens numbers, Rank III adds
 * a beat of utility, Rank IV is the signature — one visible, nameable
 * flourish. Notes are player-facing bench copy. The ladder balance
 * contract in ladder.test.ts keeps every art's mature cycle value
 * inside its style's band — tune there, not by ear.
 *
 * THE LONG ROAD: rungs span 5..90, striding wider as the XP curve
 * steepens — ten-art schools climb [5,10,15,20,30,40,50,60,75,90],
 * the two twenty-art schools (onehand, arx) walk every 5 to 50 then
 * every 4 to 90, farming tends [5,15,30,50,75]. The road's whole
 * length holds an unlock to walk toward; the capstone crowns at 90.
 */
export const TECHNIQUES: readonly TechniqueDef[] = TECHNIQUE_LADDER_DEFS;

export function techniquesFor(style: string): TechniqueDef[] {
  return TECHNIQUES.filter((t) => t.style === style);
}

export function techniqueDef(ability: string): TechniqueDef | undefined {
  return TECHNIQUES.find((t) => t.ability === ability);
}
