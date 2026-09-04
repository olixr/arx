/**
 * THE SCARRED LAND — B. the field after: what a fight leaves.
 * BrokenCart (512), FieldLitter (513), ArrowPost (514), FallenBanner
 * (515), FieldCairn (516), CairnFallen (517), BeastBones (518).
 * K0 stubs; K3 THE FIELD AFTER replaces in place. The fallen banner's
 * corner will sample rend.breezeAt (≤0.05s) in K3 — nothing here
 * reads the clock yet, so the whole family idles on the static ring
 * except the banner, which K0 already keeps on the fast cadence.
 */
import { Tile } from '@arx/shared';
import { DGN_BONE } from '../palette.js';
import { stubBlock } from './stub.js';
import type { PropEntries } from '../types.js';

const CART_OAK = '#5e4630';
const POST_OAK = '#5a4226';
const CAIRN_STONE = '#7c7889';
const FIELD_STEEL = '#5c5a5f';
const BANNER_FIELD = '#5a3a3e';

export const FIELD_AFTER_PROPS: PropEntries = [
  [[Tile.BrokenCart], stubBlock({ hw: 0.5, up: 0.38, ink: CART_OAK, depth: 0.38 })],
  [[Tile.FieldLitter], stubBlock({ hw: 0.4, up: 0.05, ink: FIELD_STEEL, depth: 0.36, flat: true, sortOff: 0.4 })],
  [[Tile.ArrowPost], stubBlock({ hw: 0.09, up: 1.0, ink: POST_OAK, depth: 0.2, sortOff: 0.66 })],
  [[Tile.FallenBanner], stubBlock({ hw: 0.46, up: 0.08, ink: BANNER_FIELD, depth: 0.36, sortOff: 0.5 })],
  [[Tile.FieldCairn], stubBlock({ hw: 0.3, up: 0.42, ink: CAIRN_STONE, depth: 0.36 })],
  [[Tile.CairnFallen], stubBlock({ hw: 0.36, up: 0.1, ink: CAIRN_STONE, depth: 0.4, flat: true, sortOff: 0.45 })],
  [[Tile.BeastBones], stubBlock({ hw: 0.46, up: 0.3, ink: DGN_BONE, depth: 0.34, sortOff: 0.64 })],
];
