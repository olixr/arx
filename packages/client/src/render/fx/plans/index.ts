/**
 * THE PLAN REGISTRY — every roster's curated ability plans and the
 * roster-only effects they add. abilityEffects.ts reads PLANS; the
 * library index reads PLAN_EFFECTS.
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';
import { CORE_PLANS, CORE_EFFECTS } from './core.js';
import { MELEE_PLANS, MELEE_EFFECTS } from './melee.js';
import { SNEAK_PLANS, SNEAK_EFFECTS } from './sneak.js';
import { ARCHERY_PLANS, ARCHERY_EFFECTS } from './archery.js';
import { ARX_PLANS, ARX_EFFECTS } from './arx.js';
import { ARCHMAGE_PLANS, ARCHMAGE_EFFECTS } from './archmage.js';
import { BLADE_PLANS, BLADE_EFFECTS } from './blade.js';
import { ROGUE_PLANS, ROGUE_EFFECTS } from './rogue.js';
import { TWOHAND_PLANS, TWOHAND_EFFECTS } from './twohand.js';
import { DUALWIELD_PLANS, DUALWIELD_EFFECTS } from './dualwield.js';
import { SHIELD_PLANS, SHIELD_EFFECTS } from './shield.js';
import { COMBAT_PLANS, COMBAT_EFFECTS } from './combat.js';
import { POLEARM_PLANS, POLEARM_EFFECTS } from './polearm.js';
import { RELICS_PLANS, RELICS_EFFECTS } from './relics.js';
import { VOICES_PLANS, VOICES_EFFECTS } from './voices.js';
import { FLIGHTS_PLANS, FLIGHTS_EFFECTS } from './flights.js';
import { BEASTCRAFT_PLANS, BEASTCRAFT_EFFECTS } from './beastcraft.js';
import { PETARTS_PLANS, PETARTS_EFFECTS } from './petarts.js';
import { FOES_PLANS, FOES_EFFECTS } from './foes.js';
import { ARENA_PLANS, ARENA_EFFECTS } from './arena.js';
import { GOLEMS_PLANS, GOLEMS_EFFECTS } from './golems.js';
import { OGRES_PLANS, OGRES_EFFECTS } from './ogres.js';

export const PLANS: Record<string, AbilityPlan> = {
  ...CORE_PLANS,
  ...MELEE_PLANS,
  ...SNEAK_PLANS,
  ...ARCHERY_PLANS,
  ...ARX_PLANS,
  ...ARCHMAGE_PLANS,
  ...BLADE_PLANS,
  ...ROGUE_PLANS,
  ...TWOHAND_PLANS,
  ...DUALWIELD_PLANS,
  ...SHIELD_PLANS,
  ...COMBAT_PLANS,
  ...POLEARM_PLANS,
  ...RELICS_PLANS,
  ...VOICES_PLANS,
  ...FLIGHTS_PLANS,
  ...BEASTCRAFT_PLANS,
  ...PETARTS_PLANS,
  ...FOES_PLANS,
  ...ARENA_PLANS,
  ...GOLEMS_PLANS,
  ...OGRES_PLANS,
};

export const PLAN_EFFECTS: readonly EffectDef[] = [
  ...CORE_EFFECTS,
  ...MELEE_EFFECTS,
  ...SNEAK_EFFECTS,
  ...ARCHERY_EFFECTS,
  ...ARX_EFFECTS,
  ...ARCHMAGE_EFFECTS,
  ...BLADE_EFFECTS,
  ...ROGUE_EFFECTS,
  ...TWOHAND_EFFECTS,
  ...DUALWIELD_EFFECTS,
  ...SHIELD_EFFECTS,
  ...COMBAT_EFFECTS,
  ...POLEARM_EFFECTS,
  ...RELICS_EFFECTS,
  ...VOICES_EFFECTS,
  ...FLIGHTS_EFFECTS,
  ...BEASTCRAFT_EFFECTS,
  ...PETARTS_EFFECTS,
  ...FOES_EFFECTS,
  ...ARENA_EFFECTS,
  ...GOLEMS_EFFECTS,
  ...OGRES_EFFECTS,
];
