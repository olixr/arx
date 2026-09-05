/**
 * THE GROUND STREAMS (play3d S1) — chunk heightfield meshes textured
 * by the real terrain baker, dealt around the camera target and
 * evicted (and DISPOSED) behind it.
 *
 * Per chunk:
 *  1. Geometry NOW: heightfield.ts builds the tile-level mesh (flat
 *     tops, sloped ramps, real vertical cliff faces) from the world's
 *     elev layer — cheap, synchronous, so the ground exists the frame
 *     it enters the ring, wearing a meadow-toned placeholder.
 *  2. Texture SOON: the 2D client's time-sliced bake (terrain.ts
 *     startChunkBake/stepChunkBake) is stepped under a per-frame ms
 *     budget, nearest chunk first, at most `MAX_JOBS` in flight. THE
 *     LEVELS COMPOSITE: the base bake paints every lifted/sunken tile
 *     as the dark cliff band (the 2D client draws plateau tops from
 *     separate per-level canvases shifted up-screen); here each level's
 *     elevated bake (startElevatedBake, ascending, exactly the 2D
 *     client's level list) is composited back onto the base canvas at
 *     its row origin — the 3D mesh carries the height, so the ONE
 *     texture holds every tile's own top. When the chain completes the
 *     canvas becomes a CanvasTexture uploaded ONCE (mipmapped,
 *     anisotropic, sRGB) and the placeholder material is swapped for
 *     the painted one. THE CANVAS PAYS ONCE (the 2D client's B4
 *     lesson): the moment the upload lands (`tex.onUpdate`) the 776²
 *     bake canvas is shrunk to 1×1 — the GPU copy is the only copy, and
 *     a ring of 49 chunks does not also hold ~118 MB of CPU bitmaps.
 *     A context loss therefore cannot re-upload from the image: the
 *     owner calls `reset()` on restore and the ring re-bakes. The bake's
 *     gutter is kept and the UVs inset past it — the gutter is real
 *     neighbour content and is exactly what a bilinear/mip sampler
 *     wants at chunk seams.
 *  3. Eviction past ring+1: geometry, both materials and the texture
 *     are disposed, the chunk's standing statics with them, and the
 *     byte ledger is debited. No leaks; the HUD shows the ledger.
 *
 * Lamps found while scanning a chunk are reported to the sky rig so
 * point lights can find them (lights.ts).
 *
 * S2 — THE LIVE GROUND: a streamed world answers `ready` false until
 * the server has dealt a chunk, and the streamer waits for it (no empty
 * stand-in). Every record remembers the chunk OBJECT and its `rev`;
 * `refresh()` (called when ClientGame.worldVersion moves) evicts any
 * record whose chunk was replaced, patched (rev bump) or fringe-bumped
 * by a neighbour's change, and the ring re-admits it next update with
 * fresh geometry, statics and a fresh bake — the 2D client's own
 * re-bake law, at chunk grain. `reset()` drops everything (a plane
 * crossing: the store under us was emptied).
 */
import * as THREE from 'three';
import { CHUNK_SIZE, Tile, type ChunkData } from '@arx/shared';
import {
  bakeGutter,
  startChunkBake,
  startElevatedBake,
  stepChunkBake,
  type ChunkBakeJob,
  type ElevatedBakeJob,
} from '../render/terrain.js';
import { ELEV_H } from '../render/elevPick.js';
import { buildHeightfield, heightAtPoint } from './heightfield.js';
import { deckLiftAt } from './structures/deckFaces.js';
import { chunkOf, outsideRing, packChunk, ringAround, type RingEntry } from './chunkRing.js';
import { buildChunkStatics, type ChunkStatics, type SpriteAtlas } from './sprites.js';
import type { BillboardClock, BillboardFactory } from './billboard.js';
import type { WorldSource3D } from './world.js';
import type { ChunkStructures } from './structures/structures.js';

/** Bake density: px per tile. 24 keeps a 32-tile chunk at 776² (2.4MB). */
export const BAKE_PX = 24;
/** Chunks loaded within this Chebyshev radius of the target's chunk. */
export const LOAD_RING = 2;
/** ...and evicted only past this one (hysteresis). */
export const EVICT_RING = LOAD_RING + 1;
const MAX_JOBS = 2;

const LAMP_TILES: ReadonlySet<number> = new Set<number>([Tile.LampPost, Tile.Campfire]);

interface ChunkRec {
  key: number;
  cx: number;
  cy: number;
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  placeholder: THREE.MeshLambertMaterial;
  painted: THREE.MeshLambertMaterial | null;
  tex: THREE.CanvasTexture | null;
  /** GPU bytes the ledger was credited for this chunk's texture. */
  texBytes: number;
  /** The bake in flight: the base job, then one elevated job per level. */
  job: ChunkBakeJob | null;
  /** The base canvas the level bakes composite onto (null until baked). */
  base: HTMLCanvasElement | null;
  /** Remaining elevation levels to bake (ascending), after the base. */
  levels: number[];
  statics: ChunkStatics | null;
  faces: number;
  /** The chunk object stood up, and its rev at that moment. */
  chunk: ChunkData;
  rev: number;
}

/** The 2D client's level list: min..max, level 0 only when pits exist. */
export function elevLevels(elev: Int8Array): number[] {
  let min = 0;
  let max = 0;
  for (let i = 0; i < elev.length; i++) {
    const e = elev[i]!;
    if (e > max) max = e;
    if (e < min) min = e;
  }
  const out: number[] = [];
  for (let level = min; level <= max; level++) {
    if (level === 0 && min >= 0) continue;
    out.push(level);
  }
  return out;
}

export interface LampSpot {
  x: number;
  y: number;
  z: number;
  /** Campfires burn warmer and lower than lamp posts. */
  kind: 'lamp' | 'fire';
}

export interface GroundStats {
  chunks: number;
  painted: number;
  baking: number;
  bakesDone: number;
  bakeMsLast: number;
  /** GPU bytes (mips counted). */
  textureBytes: number;
  /** CPU bake canvases still held (in flight or awaiting their upload). */
  canvasBytes: number;
  faces: number;
  statics: number;
  staticDraws: number;
}

export class GroundStreamer {
  readonly group = new THREE.Group();
  private readonly recs = new Map<number, ChunkRec>();
  private readonly ring: RingEntry[] = [];
  private readonly lamps = new Map<number, LampSpot[]>();
  private readonly scratch = new Float64Array(4);
  private readonly gutter = bakeGutter(BAKE_PX);
  readonly stats: GroundStats = {
    chunks: 0,
    painted: 0,
    baking: 0,
    bakesDone: 0,
    bakeMsLast: 0,
    textureBytes: 0,
    canvasBytes: 0,
    faces: 0,
    statics: 0,
    staticDraws: 0,
  };
  /** Fires whenever the lamp roster changes (chunk load/evict). */
  onLampsChanged: ((lamps: LampSpot[]) => void) | null = null;
  /**
   * W2: the structures aggregator rides the chunk lifecycle — built
   * when a chunk stands up, evicted with it, rebuilt on a rev bump
   * (the same evict + re-admit). Set by the composition after both
   * exist (it needs `heightAtFn`); null = no structures (labs).
   */
  structures: ChunkStructures | null = null;

  constructor(
    scene: THREE.Scene,
    private readonly world: WorldSource3D,
    private readonly atlas: SpriteAtlas,
    private readonly clock: BillboardClock,
    private readonly billboards: BillboardFactory,
  ) {
    this.group.name = 'ground';
    scene.add(this.group);
  }

  /**
   * World-unit height of the ground under a world point — the
   * heightfield's answer plus the deck lift (W2 terrain-forms: feet and
   * boards agree by construction; `deckLiftAt` is pure and 0 off a deck).
   */
  heightAt(wx: number, wy: number): number {
    return heightAtPoint(wx, wy, this.levelAt, this.isRamp, ELEV_H, this.scratch) + deckLiftAt(this.groundSampler, wx, wy);
  }

  /** `heightAt` as one bound function (handed out, never re-minted). */
  readonly heightAtFn = (wx: number, wy: number): number => this.heightAt(wx, wy);

  private readonly levelAt = (tx: number, ty: number): number => this.world.elevAt(tx, ty);
  private readonly isRamp = (tx: number, ty: number): boolean => this.world.isRamp(tx, ty);
  private readonly groundSampler = (tx: number, ty: number): number | undefined => this.world.groundAt(tx, ty);
  private readonly detailSampler = (tx: number, ty: number): number => this.world.detailAt(tx, ty);

  /**
   * One frame of streaming around the target: admit new chunks
   * (nearest first), step bakes under `budgetMs`, evict the far ones.
   */
  update(targetX: number, targetZ: number, budgetMs: number): void {
    const ccx = chunkOf(targetX);
    const ccy = chunkOf(targetZ);
    ringAround(ccx, ccy, LOAD_RING, this.ring);
    for (const e of this.ring) {
      const key = packChunk(e.cx, e.cy);
      if (!this.recs.has(key) && this.world.ready(e.cx, e.cy)) this.admit(key, e.cx, e.cy);
    }
    // Evict beyond the wider ring.
    for (const rec of this.recs.values()) {
      if (outsideRing(rec.cx, rec.cy, ccx, ccy, EVICT_RING)) this.evict(rec);
    }
    // Bake: nearest un-painted chunks first, MAX_JOBS in flight, under budget.
    const t0 = performance.now();
    let inFlight = 0;
    for (const rec of this.recs.values()) if (rec.job) inFlight++;
    for (const e of this.ring) {
      if (inFlight >= MAX_JOBS) break;
      const rec = this.recs.get(packChunk(e.cx, e.cy));
      if (!rec || rec.painted || rec.job) continue;
      rec.job = startChunkBake(this.groundSampler, this.detailSampler, this.levelAt, rec.cx, rec.cy, BAKE_PX);
      rec.levels = elevLevels(this.world.ensure(rec.cx, rec.cy).elev);
      inFlight++;
    }
    let baking = 0;
    for (const e of this.ring) {
      const rec = this.recs.get(packChunk(e.cx, e.cy));
      if (!rec?.job) continue;
      baking++;
      while (performance.now() - t0 < budgetMs) {
        if (stepChunkBake(rec.job) && !this.advanceBake(rec)) {
          baking--;
          break;
        }
      }
    }
    this.stats.baking = baking;
    this.stats.bakeMsLast = performance.now() - t0;
    this.stats.chunks = this.recs.size;
    // W2: neighbour-woken structure rebuilds share the frame budget.
    this.structures?.update(t0, budgetMs);
  }

  private admit(key: number, cx: number, cy: number): void {
    const chunk = this.world.ensure(cx, cy);
    const hf = buildHeightfield({
      cx,
      cy,
      size: CHUNK_SIZE,
      levelAt: this.levelAt,
      isRamp: this.isRamp,
      levelH: ELEV_H,
      px: BAKE_PX,
      gutter: this.gutter,
      // THE CURTAIN IS THE FACE: with the structures aggregator mounted, the
      // terrain-forms lane's cliff curtains are the only cliff geometry —
      // the heightfield keeps its stretched-rect placeholder only for labs.
      faces: this.structures === null,
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(hf.positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(hf.normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(hf.uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(hf.indices, 1));
    geometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3((cx + 0.5) * CHUNK_SIZE, (hf.minY + hf.maxY) / 2, (cy + 0.5) * CHUNK_SIZE),
      Math.hypot(CHUNK_SIZE, hf.maxY - hf.minY, CHUNK_SIZE) / 2 + 0.5,
    );
    const placeholder = new THREE.MeshLambertMaterial({ color: 0x5d8a3e });
    const mesh = new THREE.Mesh(geometry, placeholder);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.name = `chunk ${cx},${cy}`;
    this.group.add(mesh);
    const rec: ChunkRec = {
      key,
      cx,
      cy,
      mesh,
      geometry,
      placeholder,
      painted: null,
      tex: null,
      texBytes: 0,
      job: null,
      base: null,
      levels: [],
      statics: null,
      faces: hf.faceCount,
      chunk,
      rev: chunk.rev ?? 0,
    };
    this.recs.set(key, rec);
    this.stats.faces += hf.faceCount;
    this.standUp(rec, chunk);
    this.scanLamps(rec, chunk);
    this.structures?.build(cx, cy);
  }

  private standUp(rec: ChunkRec, chunk: ChunkData): void {
    const statics = buildChunkStatics(chunk, this.atlas, this.clock, this.billboards, this.heightAtFn);
    for (const m of statics.meshes) this.group.add(m);
    rec.statics = statics;
    this.stats.statics += statics.instances;
    this.stats.staticDraws += statics.meshes.length;
  }

  private scanLamps(rec: ChunkRec, chunk: ChunkData): void {
    const found: LampSpot[] = [];
    const x0 = chunk.cx * CHUNK_SIZE;
    const y0 = chunk.cy * CHUNK_SIZE;
    for (let i = 0; i < chunk.ground.length; i++) {
      const t = chunk.ground[i]!;
      if (!LAMP_TILES.has(t)) continue;
      const wx = x0 + (i % CHUNK_SIZE) + 0.5;
      const wy = y0 + Math.floor(i / CHUNK_SIZE) + 0.5;
      const fire = t === Tile.Campfire;
      found.push({ x: wx, y: this.heightAt(wx, wy) + (fire ? 0.35 : 1.7), z: wy, kind: fire ? 'fire' : 'lamp' });
    }
    if (found.length > 0) {
      this.lamps.set(rec.key, found);
      this.emitLamps();
    }
  }

  private emitLamps(): void {
    if (!this.onLampsChanged) return;
    const all: LampSpot[] = [];
    for (const list of this.lamps.values()) for (const l of list) all.push(l);
    this.onLampsChanged(all);
  }

  /**
   * A job finished: composite it (elevated) or adopt it (base), then
   * start the next level or finalize. Returns true while more baking
   * remains for this chunk.
   */
  private advanceBake(rec: ChunkRec): boolean {
    const job = rec.job!;
    if (rec.base === null) {
      rec.base = job.canvas;
      this.stats.canvasBytes += job.canvas.width * job.canvas.height * 4;
    } else {
      const ej = job as ElevatedBakeJob;
      // THE LIFTED LAYER PAYS FOR ITS ROWS (B2): the tight canvas
      // begins at rowOrigin; landing it at rowOrigin·px re-aligns rows.
      rec.base.getContext('2d')!.drawImage(job.canvas, 0, ej.rowOrigin * BAKE_PX);
    }
    rec.job = null;
    while (rec.levels.length > 0) {
      const level = rec.levels.shift()!;
      const next = startElevatedBake(this.groundSampler, this.detailSampler, this.levelAt, rec.cx, rec.cy, BAKE_PX, level);
      if (next) {
        rec.job = next;
        return true;
      }
    }
    this.finishBake(rec);
    return false;
  }

  private finishBake(rec: ChunkRec): void {
    const canvas = rec.base!;
    rec.base = null;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = 8;
    tex.name = `chunk ${rec.cx},${rec.cy}`;
    const gpuBytes = canvas.width * canvas.height * 4 * 1.34;
    const cpuBytes = canvas.width * canvas.height * 4;
    rec.texBytes = gpuBytes;
    // THE CANVAS PAYS ONCE: the upload landed — release the bitmap.
    tex.onUpdate = () => {
      tex.onUpdate = null;
      canvas.width = 1;
      canvas.height = 1;
      this.stats.canvasBytes -= cpuBytes;
    };
    const painted = new THREE.MeshLambertMaterial({ map: tex });
    rec.tex = tex;
    rec.painted = painted;
    rec.mesh.material = painted;
    this.stats.textureBytes += gpuBytes;
    this.stats.painted++;
    this.stats.bakesDone++;
  }

  private evict(rec: ChunkRec): void {
    this.group.remove(rec.mesh);
    rec.geometry.dispose();
    rec.placeholder.dispose();
    if (rec.painted) {
      rec.painted.dispose();
      this.stats.painted--;
    }
    if (rec.tex) {
      if (rec.tex.onUpdate) {
        // Evicted before its upload landed: the canvas is still whole.
        rec.tex.onUpdate = null;
        this.stats.canvasBytes -= rec.tex.image.width * rec.tex.image.height * 4;
      }
      rec.tex.dispose();
      this.stats.textureBytes -= rec.texBytes;
    }
    if (rec.base) this.stats.canvasBytes -= rec.base.width * rec.base.height * 4;
    if (rec.statics) {
      for (const m of rec.statics.meshes) this.group.remove(m);
      rec.statics.dispose();
      this.stats.statics -= rec.statics.instances;
      this.stats.staticDraws -= rec.statics.meshes.length;
    }
    this.stats.faces -= rec.faces;
    if (this.lamps.delete(rec.key)) this.emitLamps();
    this.structures?.evict(rec.cx, rec.cy);
    this.recs.delete(rec.key);
  }

  /**
   * The world moved under us: evict every record whose chunk was
   * replaced, patched or fringe-bumped. Returns the number evicted;
   * the next update() re-admits them nearest first.
   */
  refresh(): number {
    let n = 0;
    this.structures?.invalidate();
    for (const rec of [...this.recs.values()]) {
      const cur = this.world.peek(rec.cx, rec.cy);
      if (cur === rec.chunk && (cur.rev ?? 0) === rec.rev) continue;
      this.evict(rec);
      n++;
    }
    return n;
  }

  /** Drop every chunk (plane crossing) — the ring refills from the new store. */
  reset(): void {
    for (const rec of [...this.recs.values()]) this.evict(rec);
  }

  dispose(): void {
    this.reset();
    this.group.removeFromParent();
  }
}
