/**
 * MELEE — ability plans (particles v6 phase 5). Curated by this roster's
 * master pass: one plan per ability id, cues into the effect library;
 * roster-only effects live in MELEE_EFFECTS and register through the
 * library index. The armory wave's non-onehand arts (twin_strike, rend);
 * the onehand rungs moved to blade.ts (THE MASTERED HAND Phase 4).
 *
 * Wire kinds noted per ability are what the server casts with. Plans
 * are keyed by ability id ALONE, so an art that arrives on several
 * wires (a leap = dash + blast; a compound `self` = + buff) speaks its
 * plan on each — the cues below are laid out so the mass-carrying
 * wire reads right and the others stay small (see the report's asks).
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';

export const MELEE_PLANS: Record<string, AbilityPlan> = {
  
};

export const MELEE_EFFECTS: EffectDef[] = [];
