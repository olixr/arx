/**
 * THE LIVE WORLD (play3d S2) — WorldSource3D over ClientGame.
 *
 * ClientGame already owns the streamed truth: its ChunkStore fills as
 * the server deals chunks around the body, tile patches land in place
 * with a `rev` bump (own content) or a fringe bump (a neighbour's edge
 * changed — the blob halo reads across borders), and a plane crossing
 * drops the store whole. This source adds nothing to that; it only
 * answers the streamer's questions from the live store and refuses
 * (`ready` false) for a chunk the wire has not delivered yet, so the
 * ground never stands up as an empty field that would need tearing
 * down a frame later.
 *
 * Absent-chunk answers follow the 2D client: elev 0, ground undefined
 * (solid to a collider), so a heightfield at the streaming edge slopes
 * to the meadow plane and the body cannot walk off into nothing.
 */
import { CHUNK_SIZE, Tile, isSolidTile, type ChunkData, type Vec2 } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';
import type { WorldSource3D } from './world.js';

export class LiveWorld implements WorldSource3D {
  readonly label: string;

  constructor(private readonly game: ClientGame) {
    this.label = 'live (ClientGame)';
  }

  get spawn(): Vec2 {
    return this.game.predictor.pos;
  }

  ensure(cx: number, cy: number): ChunkData {
    const chunk = this.game.world.get(cx, cy);
    if (!chunk) throw new Error(`play3d LiveWorld: chunk ${cx},${cy} not streamed (ask ready() first)`);
    return chunk;
  }

  peek(cx: number, cy: number): ChunkData | undefined {
    return this.game.world.get(cx, cy);
  }

  ready(cx: number, cy: number): boolean {
    return this.game.world.has(cx, cy);
  }

  groundAt(tx: number, ty: number): number | undefined {
    return this.game.world.groundAt(tx, ty);
  }

  detailAt(tx: number, ty: number): number {
    return this.game.world.detailAt(tx, ty);
  }

  elevAt(tx: number, ty: number): number {
    return this.game.world.elevAt(tx, ty);
  }

  isSolid(tx: number, ty: number): boolean {
    const g = this.game.world.groundAt(tx, ty);
    return g === undefined ? true : isSolidTile(g);
  }

  isRamp(tx: number, ty: number): boolean {
    return this.game.world.groundAt(tx, ty) === Tile.Ramp;
  }

  /** The chunk coordinates of a world tile (streaming helpers). */
  static chunkOf(t: number): number {
    return Math.floor(t / CHUNK_SIZE);
  }
}
