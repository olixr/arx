/** THE MASTERED HAND: every combat school's arts, one file each. */
import type { AbilityDef } from '@arx/shared';
import { ONEHAND_ARTS } from './onehand.js';
import { ARCHERY_ARTS } from './archery.js';
import { ARX_ARTS } from './arx.js';
import { SNEAK_ARTS } from './sneak.js';
import { SHIELD_ARTS } from './shield.js';
import { TWOHAND_ARTS } from './twohand.js';
import { DUALWIELD_ARTS } from './dualwield.js';
import { COMBAT_ARTS } from './combat.js';

export const SCHOOL_ART_DEFS: AbilityDef[] = [
  ...ONEHAND_ARTS,
  ...ARCHERY_ARTS,
  ...ARX_ARTS,
  ...SNEAK_ARTS,
  ...SHIELD_ARTS,
  ...TWOHAND_ARTS,
  ...DUALWIELD_ARTS,
  ...COMBAT_ARTS,
];
