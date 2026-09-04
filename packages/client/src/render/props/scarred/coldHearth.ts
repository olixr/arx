/**
 * THE SCARRED LAND — A. the cold hearth: what a burning leaves
 * standing. CharredBeam (507), CollapsedRoof (508), AshHeap (509),
 * ChimneyStack (511). The ember bed lives in emberBed.ts (it carries
 * the family's one light row); the two ruin walls in ruinWalls.ts.
 * K0 stubs in the family's char and ash; K1 replaces in place.
 */
import { Tile } from '@arx/shared';
import { SCAR_ASH, SCAR_CHAR } from '../palette.js';
import { stubBlock } from './stub.js';
import type { PropEntries } from '../types.js';

const RUIN_STONE = '#524c5c';

export const COLD_HEARTH_PROPS: PropEntries = [
  // A fallen timber: long and low, char-black, the one lit facet.
  [[Tile.CharredBeam], stubBlock({ hw: 0.5, up: 0.16, ink: SCAR_CHAR, sortOff: 0.62 })],
  // Rafters through a burnt thatch dome: a squat wide mass.
  [[Tile.CollapsedRoof], stubBlock({ hw: 0.5, up: 0.42, ink: '#4a3f33', depth: 0.4 })],
  // Cold ash, walkable: a pale pan on the ground.
  [[Tile.AshHeap], stubBlock({ hw: 0.42, up: 0.06, ink: SCAR_ASH, depth: 0.4, flat: true, sortOff: 0.4 })],
  // The tallest piece: a narrow masonry column a head and a half
  // over the rig (FADE_TALL; the kit's one lamplight blocker).
  [[Tile.ChimneyStack], stubBlock({ hw: 0.24, up: 1.7, ink: RUIN_STONE, depth: 0.28, sortOff: 0.72 })],
];
