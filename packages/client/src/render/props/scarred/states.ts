/**
 * THE SCARRED LAND — G. the states: living props in their broken
 * posture. The tile IS the state, so each is its own id — but the
 * ART is the living prop's, re-voiced: thin wrappers over the
 * Signpost and Well painters (SignpostBurnt 540, WellFouled 541), the
 * Fence and Hedge run painters (FenceBroken 539, HedgeDead 542 — both
 * join their family's run mask so a break reads as ONE built line
 * with a broken length), and the LampPost engine case (LampPostDark
 * 543, handled inside the renderer's LampPost case with the flame
 * held at zero). SluiceGate / SluiceGateStrung (544/545) are the
 * kit's own. K0: the wrappers hand straight through to the living
 * painters; K2 THE MARKS AND STATES paints the scorch, the rag, the
 * rails down and the brown sticks in place.
 */
import { Tile } from '@arx/shared';
import { fenceItem, hedgeItem } from '../../barrierArt.js';
import { HOUSE_PROPS } from '../house.js';
import { STATIONS_PROPS } from '../stations.js';
import { stubBlock } from './stub.js';
import type { ClientGame } from '../../../game/clientGame.js';
import type { PaintHost } from '../../paintHost.js';
import type { DrawItem } from '../../renderer.js';
import type { PropEntries, PropFrame, PropHost, PropPainter } from '../types.js';

const POST_OAK = '#5a4226';

/** Find a living prop's painter in its family roster (build-time: a
 *  missing painter is a defect, not a silent blank). */
function painterOf(roster: PropEntries, tile: Tile): PropPainter {
  for (const [tiles, painter] of roster) if (tiles.includes(tile)) return painter;
  throw new Error(`no living painter for tile ${Tile[tile]} to wrap`);
}

const paintSignpost = painterOf(HOUSE_PROPS, Tile.Signpost);
const paintWell = painterOf(STATIONS_PROPS, Tile.Well);

/** The living painter sees its own tile; the state id stays the world's. */
function asTile(env: PropFrame, tile: Tile): PropFrame {
  return { ...env, tile };
}

function paintSignpostBurnt(rend: PropHost, env: PropFrame): DrawItem {
  return paintSignpost(rend, asTile(env, Tile.Signpost));
}

function paintWellFouled(rend: PropHost, env: PropFrame): DrawItem {
  return paintWell(rend, asTile(env, Tile.Well));
}

/** The broken fence: the fence run painter, spoken for a straight
 *  member (its neighbours' rails reach for it through FENCE_TILES). */
export function fenceBrokenItem(rend: PaintHost, tx: number, ty: number, game: ClientGame): DrawItem {
  return fenceItem(rend, Tile.Fence, tx, ty, game);
}

/** The dead hedge: the hedge run painter for a straight member — it
 *  coalesces with the living green through HEDGE_TILES. */
export function hedgeDeadItem(rend: PaintHost, tx: number, ty: number, game: ClientGame): DrawItem {
  return hedgeItem(rend, Tile.Hedge, tx, ty, game);
}

export const STATES_PROPS: PropEntries = [
  [[Tile.SignpostBurnt], paintSignpostBurnt],
  [[Tile.WellFouled], paintWellFouled],
  [[Tile.SluiceGate], stubBlock({ hw: 0.5, up: 0.6, ink: POST_OAK, depth: 0.2, sortOff: 0.64 })],
  [[Tile.SluiceGateStrung], stubBlock({ hw: 0.5, up: 0.6, ink: POST_OAK, lit: '#4c6a58', depth: 0.2, sortOff: 0.64 })],
];
