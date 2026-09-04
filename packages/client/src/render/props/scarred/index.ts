/**
 * THE SCARRED LAND — the contested-lands prop kit's roster
 * (docs/contested-lands-plan.md §6). Seven families, one hall entry.
 * Not here by design: RuinWallStone/RuinWallWood (run painters called
 * from the renderer's switch — ruinWalls.ts), DeadTree (the engine
 * tree switch, trees.ts foliage 0), FenceBroken and HedgeDead (their
 * living families' run painters via states.ts), LampPostDark (the
 * LampPost engine case).
 */
import { COLD_HEARTH_PROPS } from './coldHearth.js';
import { EMBER_BED_PROPS } from './emberBed.js';
import { FIELD_AFTER_PROPS } from './fieldAfter.js';
import { STRIPPED_PROPS } from './stripped.js';
import { GLOOM_PROPS } from './gloom.js';
import { MARKS_PROPS } from './marks.js';
import { DISPLACED_PROPS } from './displaced.js';
import { STATES_PROPS } from './states.js';
import type { PropEntries } from '../types.js';

export { ruinWallItem } from './ruinWalls.js';
export { fenceBrokenItem, hedgeDeadItem } from './states.js';

export const SCARRED_PROPS: PropEntries = [
  ...COLD_HEARTH_PROPS,
  ...EMBER_BED_PROPS,
  ...FIELD_AFTER_PROPS,
  ...STRIPPED_PROPS,
  ...GLOOM_PROPS,
  ...MARKS_PROPS,
  ...DISPLACED_PROPS,
  ...STATES_PROPS,
];
