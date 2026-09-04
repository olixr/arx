/**
 * THE STRUCTURES STAND UP (play3d W2 scaffold) — ChunkStructures, the
 * per-chunk aggregator that turns the three lanes' quads into a few
 * merged meshes, adds them to the scene, and takes them down again.
 *
 * Per chunk, on `build`:
 *  1. THE BORDER IS READ ONCE: `snapshotWithBorder` copies the chunk
 *     plus its 1-tile ring out of the world (structKinds.ts).
 *  2. `scanChunkStructs` lists the standing tiles by family.
 *  3. Each lane builder — walls.ts (buildings + garrison + awnings +
 *     wall-hung), barriers.ts (fence / palisade / hedge / iron),
 *     terrainForms.ts (decks + cliffs) — receives ONE `StructBuildCtx`
 *     and pushes quads into the shared StructSink, minting face tiles
 *     from the shared FaceAtlas as it goes.
 *  4. The sink drains into one BufferGeometry per (material kind,
 *     atlas page) — a chunk is at most opaque×pages + cutout×pages
 *     draws; the target is < 6.
 *  5. Meshes carry the real depth buffer: castShadow + receiveShadow,
 *     cutouts with an alpha-tested depth material so the sun cuts
 *     through fence rails. Bounding spheres are set from the drained
 *     extents; frustum culling stays on.
 *
 * THE BORDER WAKES THE NEIGHBOUR: a chunk built while its neighbour
 * was not yet streamed saw `undefined` past the seam and put a face
 * there. When the neighbour arrives, the built chunks around it are
 * marked dirty and rebuilt under `update`'s budget (a rebuild never
 * wakes its own neighbours — no ping-pong). THE BORDER WAKES ONLY WHEN
 * IT STANDS (INTEGRATE): a neighbour is woken only when the ring cells
 * on its side hold a standing tile or an elevation step
 * (structKinds.ringStands) — grass against grass rebuilds nothing;
 * `stats.wakesSkipped` counts the rebuilds this spares.
 *
 * Dispose is explicit: `evict` removes the meshes, disposes their
 * geometries and debits the byte ledger. Materials are shared
 * (StructMaterials) and the atlas pages are shared (FaceAtlas); the
 * chunk owns only its geometry.
 *
 * Interiors: `regionAt` runs the 2D InteriorMap over the world seam
 * through a minimal ClientGame-shaped shim (it reads only
 * `game.world.groundAt/elevAt`) so wood skins deal per building here
 * exactly as in the 2D client. The map's version gate is this class's
 * own counter, bumped by `invalidate()` when the world moves.
 */
import * as THREE from 'three';
import { CHUNK_SIZE } from '@arx/shared';
import type { ClientGame } from '../../game/clientGame.js';
import { InteriorMap, type InteriorRegion } from '../../render/interiors.js';
import { dealWoodSkin, type WoodSkin } from '../../render/woodSkins.js';
import { chunkOf, packChunk } from '../chunkRing.js';
import type { WorldSource3D } from '../world.js';
import { FaceAtlas } from './faceAtlas.js';
import { ELEV_H, ringStands, scanChunkStructs, snapshotWithBorder, type ChunkStructScan, type StructSampler } from './structKinds.js';
import { StructMaterials } from './structMaterials.js';
import { StructSink, bucketBytes } from './structSink.js';
import { makeStubHost, type StubHost } from './stubHost.js';
import { buildWallStructures } from './walls.js';
import { buildBarrierStructures } from './barriers.js';
import { buildTerrainFormStructures } from './terrainForms.js';

/** Everything a lane builder is handed for one chunk. */
export interface StructBuildCtx {
  world: WorldSource3D;
  cx: number;
  cy: number;
  size: number;
  /** World tile origin of the chunk (x0 = cx·size). */
  x0: number;
  y0: number;
  /** The chunk + 1-tile border, snapshotted; answers undefined past the ring. */
  sampler: StructSampler;
  /** The chunk's standing tiles, by family, in scan order. */
  scan: ChunkStructScan;
  /** Mint face tiles here (`atlas.get(key, () => spec)`); shared by every chunk. */
  atlas: FaceAtlas;
  /** Point it at a tile canvas with `aimStubHost` before calling an amber painter. */
  host: StubHost;
  /** One elevation level's rise in world units (ELEV_H). */
  elevH: number;
  /** Ground height (world units, tiles) under a world point — the heightfield's own answer. */
  heightAt(wx: number, wy: number): number;
  interiors: InteriorMap;
  /** The enclosed room at a tile, or null outdoors (walls are outdoors; ask the tile behind). */
  regionAt(tx: number, ty: number): InteriorRegion | null;
  /** The wood skin a building wears (null region = oak). */
  woodSkinFor(region: InteriorRegion | null): WoodSkin;
  /** Push quads here, bucketed by material kind and atlas page. */
  sink: StructSink;
}

/** What a lane confesses after a build. */
export interface StructBuildResult {
  /** Quads the lane landed in the sink. */
  quads: number;
  /** Optional one-line note for the HUD/probe (e.g. "12 runs, 3 doors"). */
  note?: string;
}

export type StructBuilder = (ctx: StructBuildCtx) => StructBuildResult;

export interface StructStats {
  chunks: number;
  draws: number;
  tris: number;
  quads: number;
  geometryBytes: number;
  atlasPages: number;
  atlasTiles: number;
  atlasBytes: number;
  buildMsLast: number;
  builds: number;
  /** Neighbour-woken rebuilds performed. */
  rebuilds: number;
  dirty: number;
  /** Per-lane quad counts from the last build. */
  lanes: { walls: number; barriers: number; terrainForms: number };
  /** The most draws any one built chunk costs (the < 6 target). */
  drawsMax: number;
  /** Neighbour wakes skipped because the seam holds nothing (THE BORDER WAKES ONLY WHEN IT STANDS). */
  wakesSkipped: number;
}

/** THE LEDGER CONFESSES: the running stats recomputed from the records. */
export interface StructAudit {
  ok: boolean;
  chunks: number;
  draws: number;
  drawsMax: number;
  tris: number;
  quads: number;
  geometryBytes: number;
  /** Meshes still parented under the group (must equal draws). */
  meshesInGroup: number;
}

interface StructRec {
  key: number;
  cx: number;
  cy: number;
  meshes: THREE.Mesh[];
  geometries: THREE.BufferGeometry[];
  bytes: number;
  tris: number;
  quads: number;
  dirty: boolean;
}

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

export class ChunkStructures {
  readonly group = new THREE.Group();
  private readonly recs = new Map<number, StructRec>();
  private readonly interiors = new InteriorMap();
  private readonly sink = new StructSink();
  private readonly host: StubHost;
  /** A ClientGame-shaped shim over the world seam for InteriorMap (reads game.world only). */
  private readonly interiorGame: ClientGame;
  private version = 1;
  readonly stats: StructStats = {
    chunks: 0,
    draws: 0,
    tris: 0,
    quads: 0,
    geometryBytes: 0,
    atlasPages: 0,
    atlasTiles: 0,
    atlasBytes: 0,
    buildMsLast: 0,
    builds: 0,
    rebuilds: 0,
    dirty: 0,
    lanes: { walls: 0, barriers: 0, terrainForms: 0 },
    drawsMax: 0,
    wakesSkipped: 0,
  };
  /** The lane builders, overridable for labs and tests. */
  builders: { walls: StructBuilder; barriers: StructBuilder; terrainForms: StructBuilder } = {
    walls: buildWallStructures,
    barriers: buildBarrierStructures,
    terrainForms: buildTerrainFormStructures,
  };

  constructor(
    scene: THREE.Scene,
    private readonly world: WorldSource3D,
    readonly atlas: FaceAtlas,
    private readonly materials: StructMaterials,
    private readonly heightAt: (wx: number, wy: number) => number,
    private readonly elevH = ELEV_H,
  ) {
    this.group.name = 'structures';
    scene.add(this.group);
    // The host paints through a scratch context until a lane aims it.
    const scratch = document.createElement('canvas');
    scratch.width = 1;
    scratch.height = 1;
    this.host = makeStubHost(scratch.getContext('2d')!);
    // InteriorMap.regionAt(game, tx, ty) reads game.world.groundAt /
    // elevAt and nothing else (interiors.ts:112,176). ClientGame is a
    // class with private state, so the shim is cast — the one place
    // the 3D client pretends to be the 2D game, for the 2D's own
    // room-finder.
    const w = this.world;
    this.interiorGame = { world: { groundAt: (tx: number, ty: number) => w.groundAt(tx, ty), elevAt: (tx: number, ty: number) => w.elevAt(tx, ty), detailAt: (tx: number, ty: number) => w.detailAt(tx, ty) } } as unknown as ClientGame;
  }

  private readonly regionAt = (tx: number, ty: number): InteriorRegion | null => this.interiors.regionAt(this.interiorGame, tx, ty);

  has(cx: number, cy: number): boolean {
    return this.recs.has(packChunk(cx, cy));
  }

  /** The world moved (patch / plane): rooms are recomputed on next use. */
  invalidate(): void {
    this.version++;
  }

  /**
   * Build (or rebuild) a chunk's structures. `wake` marks the 8
   * neighbours dirty so their seam faces resolve against this chunk.
   */
  build(cx: number, cy: number, wake = true): void {
    const key = packChunk(cx, cy);
    const had = this.recs.get(key);
    if (had) this.evict(cx, cy);
    const t0 = performance.now();
    this.interiors.beginFrame(this.version);
    const sampler = snapshotWithBorder(this.world, cx, cy, CHUNK_SIZE, 1);
    const scan = scanChunkStructs(sampler, cx, cy, CHUNK_SIZE, this.elevH);
    const rec: StructRec = { key, cx, cy, meshes: [], geometries: [], bytes: 0, tris: 0, quads: 0, dirty: false };
    this.recs.set(key, rec);
    if (scan.tiles.length > 0) {
      const ctx: StructBuildCtx = {
        world: this.world,
        cx,
        cy,
        size: CHUNK_SIZE,
        x0: scan.x0,
        y0: scan.y0,
        sampler,
        scan,
        atlas: this.atlas,
        host: this.host,
        elevH: this.elevH,
        heightAt: this.heightAt,
        interiors: this.interiors,
        regionAt: this.regionAt,
        woodSkinFor: dealWoodSkin,
        sink: this.sink,
      };
      const lanes = this.stats.lanes;
      lanes.walls = this.builders.walls(ctx).quads;
      lanes.barriers = this.builders.barriers(ctx).quads;
      lanes.terrainForms = this.builders.terrainForms(ctx).quads;
      rec.quads = this.sink.quads;
      for (const b of this.sink.drain()) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(b.positions, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(b.normals, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(b.uvs, 2));
        geometry.setIndex(new THREE.BufferAttribute(b.indices, 1));
        geometry.boundingSphere = new THREE.Sphere(
          new THREE.Vector3((cx + 0.5) * CHUNK_SIZE, (b.minY + b.maxY) / 2, (cy + 0.5) * CHUNK_SIZE),
          Math.hypot(CHUNK_SIZE + 2, b.maxY - b.minY, CHUNK_SIZE + 2) / 2 + 0.5,
        );
        const set = this.materials.get(b.kind, b.page);
        const mesh = new THREE.Mesh(geometry, set.material);
        if (set.depth) mesh.customDepthMaterial = set.depth;
        mesh.castShadow = set.castShadow;
        mesh.receiveShadow = set.receiveShadow;
        mesh.frustumCulled = true;
        mesh.name = `structs ${cx},${cy} ${b.kind} p${b.page}`;
        this.group.add(mesh);
        rec.meshes.push(mesh);
        rec.geometries.push(geometry);
        rec.bytes += bucketBytes(b);
        rec.tris += b.triangles;
      }
    }
    this.stats.chunks = this.recs.size;
    this.stats.draws += rec.meshes.length;
    if (rec.meshes.length > this.stats.drawsMax) this.stats.drawsMax = rec.meshes.length;
    this.stats.tris += rec.tris;
    this.stats.quads += rec.quads;
    this.stats.geometryBytes += rec.bytes;
    this.stats.builds++;
    this.stats.buildMsLast = performance.now() - t0;
    this.refreshAtlasStats();
    if (wake) {
      for (const [dx, dy] of NEIGHBOURS) {
        const n = this.recs.get(packChunk(cx + dx, cy + dy));
        if (!n || n.dirty) continue;
        if (!ringStands(sampler, scan.x0, scan.y0, CHUNK_SIZE, dx, dy)) {
          this.stats.wakesSkipped++;
          continue;
        }
        n.dirty = true;
        this.stats.dirty++;
      }
    }
  }

  /** Rebuild dirty (neighbour-woken) chunks under a time budget, from `t0`. */
  update(t0: number, budgetMs: number): void {
    if (this.stats.dirty === 0) return;
    for (const rec of this.recs.values()) {
      if (!rec.dirty) continue;
      if (performance.now() - t0 >= budgetMs) return;
      rec.dirty = false;
      this.stats.dirty--;
      this.stats.rebuilds++;
      this.build(rec.cx, rec.cy, false);
    }
  }

  evict(cx: number, cy: number): void {
    const key = packChunk(cx, cy);
    const rec = this.recs.get(key);
    if (!rec) return;
    for (const m of rec.meshes) this.group.remove(m);
    for (const g of rec.geometries) g.dispose();
    if (rec.dirty) this.stats.dirty--;
    this.stats.draws -= rec.meshes.length;
    this.stats.tris -= rec.tris;
    this.stats.quads -= rec.quads;
    this.stats.geometryBytes -= rec.bytes;
    this.recs.delete(key);
    this.stats.chunks = this.recs.size;
  }

  /** The chunk under a world point is built. */
  builtAt(wx: number, wy: number): boolean {
    return this.has(chunkOf(wx), chunkOf(wy));
  }

  /**
   * Recompute the ledger from the records and compare it with the
   * running stats — the dispose proof (a walk that evicts chunks must
   * leave bytes/draws/tris exactly what the survivors own, and no mesh
   * orphaned under the group).
   */
  audit(): StructAudit {
    let draws = 0;
    let drawsMax = 0;
    let tris = 0;
    let quads = 0;
    let bytes = 0;
    for (const r of this.recs.values()) {
      draws += r.meshes.length;
      if (r.meshes.length > drawsMax) drawsMax = r.meshes.length;
      tris += r.tris;
      quads += r.quads;
      bytes += r.bytes;
    }
    const meshesInGroup = this.group.children.length;
    const s = this.stats;
    return {
      ok: draws === s.draws && tris === s.tris && quads === s.quads && bytes === s.geometryBytes && meshesInGroup === draws && this.recs.size === s.chunks,
      chunks: this.recs.size,
      draws,
      drawsMax,
      tris,
      quads,
      geometryBytes: bytes,
      meshesInGroup,
    };
  }

  private refreshAtlasStats(): void {
    this.stats.atlasPages = this.atlas.pages.length;
    this.stats.atlasTiles = this.atlas.tiles;
    this.stats.atlasBytes = this.atlas.textureBytes;
  }

  /** Drop every chunk (plane crossing / context reset). */
  reset(): void {
    for (const rec of [...this.recs.values()]) this.evict(rec.cx, rec.cy);
    this.invalidate();
  }

  dispose(): void {
    this.reset();
    this.group.removeFromParent();
  }
}
