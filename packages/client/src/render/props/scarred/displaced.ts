/**
 * THE SCARRED LAND — F. the displaced: what people carry when they
 * run. LeanTo (535, a freestanding prop — not an awning — open face
 * south), Bedroll (536, walkable; a lie:true candidate if the seating
 * audit admits it), BelongingsCart (537), FieldCot (538). K0 stubs;
 * K3 replaces (the lean-to's hem samples breezeAt ≤0.05s then).
 */
import { Tile } from '@arx/shared';
import { stubBlock } from './stub.js';
import type { PropEntries } from '../types.js';

const CANVAS = '#6a5a44';
const WOOL = '#5d4f42';
const CART_OAK = '#6e4a33';

export const DISPLACED_PROPS: PropEntries = [
  [[Tile.LeanTo], stubBlock({ hw: 0.5, up: 0.7, ink: CANVAS, depth: 0.42 })],
  [[Tile.Bedroll], stubBlock({ hw: 0.4, up: 0.08, ink: WOOL, depth: 0.34, flat: true, sortOff: 0.45 })],
  [[Tile.BelongingsCart], stubBlock({ hw: 0.48, up: 0.5, ink: CART_OAK, depth: 0.36 })],
  [[Tile.FieldCot], stubBlock({ hw: 0.46, up: 0.3, ink: CANVAS, depth: 0.4, sortOff: 0.66 })],
];
