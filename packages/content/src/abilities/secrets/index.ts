/** THE MASTERED HAND: every school's secret shelf, one file each (polearm's four live in polearm.ts). */
import type { AbilityDef } from '@arx/shared';
import { ONEHAND_SECRET_ARTS } from './onehand.js';
import { TWOHAND_SECRET_ARTS } from './twohand.js';
import { ARCHERY_SECRET_ARTS } from './archery.js';
import { ARX_SECRET_ARTS } from './arx.js';

export const SECRET_ART_DEFS: AbilityDef[] = [
  ...ONEHAND_SECRET_ARTS,
  ...TWOHAND_SECRET_ARTS,
  ...ARCHERY_SECRET_ARTS,
  ...ARX_SECRET_ARTS,
];
