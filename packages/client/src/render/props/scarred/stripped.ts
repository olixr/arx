/**
 * THE SCARRED LAND — C. the stripped land: what the axe and the fire
 * left. CharredStump (519), SpoilHeap (521). DeadTree (520) is NOT
 * here on purpose: it goes through trees.ts (foliage 0, snag species
 * by hash) in the renderer's engine tree switch, beside Tree and the
 * saplings — registry.test pins it there. K0 stubs; K4 replaces.
 */
import { Tile } from '@arx/shared';
import { SCAR_CHAR } from '../palette.js';
import { stubBlock } from './stub.js';
import type { PropEntries } from '../types.js';

const SPOIL_BROWN = '#5c4a38';

export const STRIPPED_PROPS: PropEntries = [
  [[Tile.CharredStump], stubBlock({ hw: 0.22, up: 0.22, ink: SCAR_CHAR, depth: 0.3, sortOff: 0.55 })],
  [[Tile.SpoilHeap], stubBlock({ hw: 0.46, up: 0.5, ink: SPOIL_BROWN, depth: 0.4 })],
];
