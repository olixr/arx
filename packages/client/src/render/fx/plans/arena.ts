/**
 * ARENA — ability plans (particles v6 phase 5). Curated by this roster's
 * master pass: one plan per ability id, cues into the effect library;
 * roster-only effects live in ARENA_EFFECTS and register through the
 * library index. Until the pass lands, abilities derive their plan
 * from their family (see abilityEffects.ts).
 */

import type { AbilityPlan } from '../abilityEffects.js';
import type { EffectDef } from '../effects.js';

export const ARENA_PLANS: Record<string, AbilityPlan> = {};

export const ARENA_EFFECTS: EffectDef[] = [];
