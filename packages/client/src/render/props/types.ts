/**
 * THE PROP HALL's contracts (foundations F1). A PropPainter is one
 * former objectItem switch case: it receives the renderer through the
 * narrow PropHost surface and the mint-time frame locals through
 * PropFrame, and returns the DrawItem the sorted world pass consumes.
 *
 * The ctx law carries over unchanged: env.ctx is captured at MINT time
 * (scratch-safety — re-minting under a swapped ctx is what makes items
 * scratch-safe), while draw closures that must survive the outline
 * pass's ctx swap re-capture rend.ctx at DRAW time, exactly as the
 * switch cases always did.
 */
import type { Tile } from '@arx/shared';
import type { ClientGame } from '../../game/clientGame.js';
import type { DrawItem, Renderer } from '../renderer.js';

/** The slice of the Renderer the prop painters may touch. */
export type PropHost = Pick<
  Renderer,
  'bedCoversSide' |
  'bedCoversVert' |
  'bedFinialPost' |
  'bedFootboardVert' |
  'beginStructOutline' |
  'breezeAt' |
  'camera' |
  'castBlob' |
  'castContact' |
  'castEdgeQuad' |
  'castFloraShadow' |
  'chestOpenness' |
  'ctx' |
  'drawChestBoss' |
  'drawChestGilded' |
  'drawChestIron' |
  'drawChestMossy' |
  'drawChestWood' |
  'drawFlora' |
  'drawGrowingFrame' |
  'drawStallGood' |
  'outlineOn' |
  'paintGreatCloth' |
  'paintShelfGood' |
  'paintStandingHoop' |
  'paintStreetCask' |
  'queueGlow' |
  'rubble' |
  'signHasText' |
  'sky' |
  'sparkle' |
  'stationClang' |
  'stationHeat'
>;

/** The mint-time locals objectItem builds once per prop. */
export interface PropFrame {
  readonly tile: Tile;
  readonly tx: number;
  readonly ty: number;
  readonly game: ClientGame;
  /** Mint-time canvas (see the ctx law above). */
  readonly ctx: CanvasRenderingContext2D;
  /** Screen point of the tile center, elevation- and porch-lifted. */
  readonly p: { x: number; y: number };
  readonly s: number;
  /** The tile's stable hash — every painter's seed. */
  readonly h: number;
  /** Seconds clock for live animation. */
  readonly t: number;
  /** Dye index when the tile is a dyed banner pole, else null. */
  readonly poleDye: { dye: number } | null;
  /** The interactable-outline bounds recipe (see objectItem). */
  stationBody(hw?: number, up?: number, down?: number): { x: number; y: number; w: number; h: number };
}

export type PropPainter = (rend: PropHost, env: PropFrame) => DrawItem;

/** One family's roster: tile labels married to their painter. */
export type PropEntries = ReadonlyArray<readonly [ReadonlyArray<Tile>, PropPainter]>;
