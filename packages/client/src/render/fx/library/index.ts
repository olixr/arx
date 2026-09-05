/**
 * THE EFFECT LIBRARY — the registry (particles v6, phase 3).
 *
 * Every composed effect the game can cast, by id. The lab reads this
 * roster; the contract tests hold every entry to the layer laws
 * (≥ 4 layers, casts clean at scale 1 and 3, leaks nothing, a hero
 * somewhere in the story). Signatures cast these through the
 * renderer's `castEffect` — ONE-VOICE: the library masters a
 * material once and every ability inherits it.
 */

import type { EffectDef } from '../effects.js';
import { FIRE_EFFECTS } from './fire.js';
import { SMOKE_EFFECTS } from './smoke.js';
import { FROST_EFFECTS } from './frost.js';
import { STORM_EFFECTS } from './storm.js';
import { VENOM_EFFECTS } from './venom.js';
import { ARCANE_EFFECTS } from './arcane.js';
import { BLOOD_EFFECTS } from './blood.js';
import { DUST_EFFECTS } from './dust.js';
import { WATER_EFFECTS } from './water.js';
import { SHADOW_EFFECTS } from './shadow.js';

export const EFFECT_LIST: readonly EffectDef[] = [
  ...FIRE_EFFECTS,
  ...SMOKE_EFFECTS,
  ...FROST_EFFECTS,
  ...STORM_EFFECTS,
  ...VENOM_EFFECTS,
  ...ARCANE_EFFECTS,
  ...BLOOD_EFFECTS,
  ...DUST_EFFECTS,
  ...WATER_EFFECTS,
  ...SHADOW_EFFECTS,
];

export const EFFECTS: Record<string, EffectDef> = Object.fromEntries(EFFECT_LIST.map((e) => [e.id, e]));

export function effectOf(id: string): EffectDef | undefined {
  return EFFECTS[id];
}
