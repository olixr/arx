/**
 * THE DOOR IS A HINGED LEAF (play3d W2 — WALLS lane) — every doorway,
 * side doorway and garrison gate hangs a real LEAF: a quad pivoting
 * on its hinge jamb, swinging between the wall plane (shut) and the
 * passage's jamb (open) on the 2D client's own clock.
 *
 *  - THE TILE IS THE STATE (tiles.ts doorInfo): open/shut arrives as
 *    a tile patch, which rebuilds the chunk; the walls lane re-registers
 *    its leaves and the registry notices a posture CHANGE per door key
 *    and starts an ease from where the leaf stood. An unchanged door
 *    keeps its posture — a rebuild never makes a door twitch.
 *  - THE CLOCK IS THE 2D's (renderer.ts:14219-14290, ported verbatim
 *    as pure functions): open 520 ms on growEase's overshoot (a latch
 *    beat, then the fling that settles), close 380 ms sober pull-to,
 *    a 460 ms refusal shudder. `DoorEases` is PURE — node:test proves
 *    the timing.
 *  - ONE MESH FOR EVERY LEAF: the layer keeps one dynamic
 *    BufferGeometry per atlas page (4 verts per leaf, preallocated,
 *    grown by doubling, NEVER per frame) and rewrites only the leaves
 *    whose openness moved this frame. Draw calls: one per page.
 *  - The leaf casts and receives the sun like the walls; DoubleSide
 *    Lambert on the face atlas page (u = 0 at the hinge).
 *  - WIRING: the walls lane writes `doorLeaves` (a module singleton —
 *    the lane API hands builders no scene); `DoorLeafLayer` is mounted
 *    by the composition root (main3d.ts) and pruned against the
 *    structures' chunk set so evicted chunks drop their leaves.
 */
import * as THREE from 'three';
import type { FaceAtlas, FaceRef } from './faceAtlas.js';

// ------------------------------------------------------- the clock

export const DOOR_OPEN_MS = 520;
export const DOOR_CLOSE_MS = 380;
export const DOOR_SHAKE_MS = 460;

/** Renderer.growEase (renderer.ts:13613): overshoot and settle. */
export function growEase(u: number): number {
  const v = Math.min(1, u) - 1;
  return 1 + 2.2 * v * v * v + 1.2 * v * v;
}

export type DoorEaseDir = 'open' | 'close' | 'shake';

interface DoorEase {
  dir: DoorEaseDir;
  born: number;
}

/**
 * Door eases keyed by the door's anchor tile — the 2D's addDoorEase /
 * doorOpenness / doorShakeAt as a pure clocked object (`now` is passed
 * in, never read).
 */
export class DoorEases {
  private readonly eases = new Map<string, DoorEase>();

  get size(): number {
    return this.eases.size;
  }

  add(key: string, dir: DoorEaseDir, now: number): void {
    if (this.eases.size > 32) {
      for (const [k, e] of this.eases) if (now - e.born > 2000) this.eases.delete(k);
    }
    this.eases.set(key, { dir, born: now });
  }

  /** Leaf openness 0..1 (may overshoot past 1 while flinging open). */
  openness(key: string, open: boolean, now: number): number {
    const ease = this.eases.get(key);
    if (ease === undefined || ease.dir === 'shake') return open ? 1 : 0;
    const u = (now - ease.born) / (ease.dir === 'open' ? DOOR_OPEN_MS : DOOR_CLOSE_MS);
    if (u >= 1) {
      this.eases.delete(key);
      return open ? 1 : 0;
    }
    if (ease.dir === 'open') return growEase(u);
    return Math.max(0, 1 - growEase(u));
  }

  /** Signed shudder for a locked refusal; 0 when quiet. */
  shake(key: string, now: number): number {
    const ease = this.eases.get(key);
    if (ease === undefined || ease.dir !== 'shake') return 0;
    const u = (now - ease.born) / DOOR_SHAKE_MS;
    if (u >= 1) {
      this.eases.delete(key);
      return 0;
    }
    return Math.sin(u * Math.PI * 7) * (1 - u);
  }

  /** Any ease still running at `now`? */
  hot(key: string, now: number): boolean {
    const ease = this.eases.get(key);
    if (ease === undefined) return false;
    const dur = ease.dir === 'open' ? DOOR_OPEN_MS : ease.dir === 'close' ? DOOR_CLOSE_MS : DOOR_SHAKE_MS;
    if (now - ease.born >= dur) {
      this.eases.delete(key);
      return false;
    }
    return true;
  }
}

// ----------------------------------------------------- the leaf law

/** One hinged leaf, in world units. */
export interface DoorLeaf {
  /** The door's anchor-tile key ("tx,ty"); a pair shares it. */
  key: string;
  /** Hinge foot (world x / z) and base height. */
  hx: number;
  hy: number;
  hz: number;
  /** Unit direction the leaf lies along when SHUT (in the wall plane). */
  sx: number;
  sz: number;
  /** Unit direction it lies along when OPEN (into the passage). */
  ox: number;
  oz: number;
  w: number;
  h: number;
  open: boolean;
  ref: FaceRef;
}

/**
 * The free-edge direction for an openness: the swing sweeps from the
 * shut direction to the open one through the quarter turn between
 * them (an overshoot past 1 keeps rotating; the fling settles back).
 */
export function leafDir(l: DoorLeaf, openness: number, out: { x: number; z: number }): { x: number; z: number } {
  const th = (openness * Math.PI) / 2;
  const c = Math.cos(th);
  const s = Math.sin(th);
  out.x = l.sx * c + l.ox * s;
  out.z = l.sz * c + l.oz * s;
  return out;
}

/** Write a leaf's four corners (hinge-base, free-base, free-top, hinge-top) into `p` at `at`. */
export function leafCorners(l: DoorLeaf, openness: number, p: Float32Array, at: number, dir: { x: number; z: number }): void {
  leafDir(l, openness, dir);
  const fx = l.hx + dir.x * l.w;
  const fz = l.hz + dir.z * l.w;
  p[at] = l.hx;
  p[at + 1] = l.hy;
  p[at + 2] = l.hz;
  p[at + 3] = fx;
  p[at + 4] = l.hy;
  p[at + 5] = fz;
  p[at + 6] = fx;
  p[at + 7] = l.hy + l.h;
  p[at + 8] = fz;
  p[at + 9] = l.hx;
  p[at + 10] = l.hy + l.h;
  p[at + 11] = l.hz;
}

// ------------------------------------------------------ the registry

interface LeafState {
  leaf: DoorLeaf;
  /** Openness last written to the mesh (NaN = never). */
  written: number;
}

/**
 * Leaves by chunk, with posture memory: `setChunk` replaces a chunk's
 * leaves and kicks an ease for every door whose `open` flipped since
 * the last registration (rebuilds with no change are silent).
 */
export class DoorLeafRegistry {
  private readonly chunks = new Map<number, LeafState[]>();
  /** Posture memory across rebuilds: door key → open. */
  private readonly posture = new Map<string, boolean>();
  readonly eases = new DoorEases();
  /** Bumped whenever the leaf set changes (the layer repacks). */
  version = 0;

  setChunk(key: number, leaves: readonly DoorLeaf[], now: number): void {
    const states: LeafState[] = [];
    for (const leaf of leaves) {
      const was = this.posture.get(leaf.key);
      if (was !== undefined && was !== leaf.open) this.eases.add(leaf.key, leaf.open ? 'open' : 'close', now);
      this.posture.set(leaf.key, leaf.open);
      states.push({ leaf, written: NaN });
    }
    if (states.length === 0 && !this.chunks.has(key)) return;
    if (states.length === 0) this.chunks.delete(key);
    else this.chunks.set(key, states);
    this.version++;
  }

  dropChunk(key: number): void {
    if (this.chunks.delete(key)) this.version++;
  }

  /** Drop every chunk `keep` refuses (the structures' own set). */
  prune(keep: (key: number) => boolean): void {
    for (const key of [...this.chunks.keys()]) if (!keep(key)) this.dropChunk(key);
  }

  get count(): number {
    let n = 0;
    for (const s of this.chunks.values()) n += s.length;
    return n;
  }

  /** Every leaf state, in chunk order. */
  *states(): IterableIterator<LeafState> {
    for (const list of this.chunks.values()) for (const s of list) yield s;
  }

  clear(): void {
    this.chunks.clear();
    this.posture.clear();
    this.version++;
  }
}

/** THE ONE REGISTRY the walls lane writes and the layer reads. */
export const doorLeaves = new DoorLeafRegistry();

// --------------------------------------------------------- the layer

interface PageMesh {
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshLambertMaterial;
  positions: THREE.BufferAttribute;
  normals: THREE.BufferAttribute;
  uvs: THREE.BufferAttribute;
  index: THREE.BufferAttribute;
  capacity: number;
  /** Leaves packed into this page, in slot order. */
  slots: LeafState[];
}

const DIR = { x: 0, z: 0 };

/**
 * The Three side: one dynamic mesh per atlas page holding every leaf
 * in the registry. `update(now, keep)` prunes evicted chunks, repacks
 * when the set changed, and rewrites the corners of leaves whose
 * openness moved.
 */
export class DoorLeafLayer {
  readonly group = new THREE.Group();
  private readonly pages = new Map<number, PageMesh>();
  private packedVersion = -1;
  /** Confession: leaves drawn, corner rewrites this frame. */
  leaves = 0;
  rewrites = 0;

  constructor(
    scene: THREE.Scene,
    private readonly atlas: FaceAtlas,
    private readonly registry: DoorLeafRegistry = doorLeaves,
  ) {
    this.group.name = 'door leaves';
    scene.add(this.group);
  }

  private page(page: number, need: number): PageMesh {
    let p = this.pages.get(page);
    if (p && p.capacity >= need) return p;
    const capacity = Math.max(64, p ? p.capacity * 2 : 0, need);
    const positions = new THREE.BufferAttribute(new Float32Array(capacity * 12), 3);
    const normals = new THREE.BufferAttribute(new Float32Array(capacity * 12), 3);
    const uvs = new THREE.BufferAttribute(new Float32Array(capacity * 8), 2);
    const index = new THREE.BufferAttribute(new Uint32Array(capacity * 6), 1);
    positions.setUsage(THREE.DynamicDrawUsage);
    normals.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < capacity; i++) {
      const b = i * 4;
      index.setX(i * 6, b);
      index.setX(i * 6 + 1, b + 1);
      index.setX(i * 6 + 2, b + 2);
      index.setX(i * 6 + 3, b);
      index.setX(i * 6 + 4, b + 2);
      index.setX(i * 6 + 5, b + 3);
    }
    if (p) {
      this.group.remove(p.mesh);
      p.geometry.dispose();
      p.material.dispose();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', positions);
    geometry.setAttribute('normal', normals);
    geometry.setAttribute('uv', uvs);
    geometry.setIndex(index);
    const material = new THREE.MeshLambertMaterial({ map: this.atlas.texture(page), side: THREE.DoubleSide });
    material.name = `door leaves p${page}`;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // Leaves are few and spread; skip the culling sphere upkeep.
    mesh.frustumCulled = false;
    mesh.name = `door leaves p${page}`;
    this.group.add(mesh);
    p = { mesh, geometry, material, positions, normals, uvs, index, capacity, slots: [] };
    this.pages.set(page, p);
    return p;
  }

  /** Repack every leaf into its page's slots (the set changed). */
  private repack(): void {
    const byPage = new Map<number, LeafState[]>();
    for (const s of this.registry.states()) {
      let list = byPage.get(s.leaf.ref.page);
      if (!list) byPage.set(s.leaf.ref.page, (list = []));
      list.push(s);
      s.written = NaN;
    }
    for (const [page, p] of this.pages) {
      if (!byPage.has(page)) {
        p.slots.length = 0;
        p.geometry.setDrawRange(0, 0);
      }
    }
    for (const [page, list] of byPage) {
      const p = this.page(page, list.length);
      p.slots = list;
      for (let i = 0; i < list.length; i++) {
        const r = list[i]!.leaf.ref;
        const u = p.uvs.array as Float32Array;
        const at = i * 8;
        u[at] = r.u0;
        u[at + 1] = r.v0;
        u[at + 2] = r.u1;
        u[at + 3] = r.v0;
        u[at + 4] = r.u1;
        u[at + 5] = r.v1;
        u[at + 6] = r.u0;
        u[at + 7] = r.v1;
      }
      p.uvs.needsUpdate = true;
      p.geometry.setDrawRange(0, list.length * 6);
    }
    this.packedVersion = this.registry.version;
  }

  update(now: number, keep: (key: number) => boolean): void {
    this.registry.prune(keep);
    if (this.packedVersion !== this.registry.version) this.repack();
    this.rewrites = 0;
    this.leaves = 0;
    const eases = this.registry.eases;
    for (const p of this.pages.values()) {
      let dirty = false;
      const pos = p.positions.array as Float32Array;
      const nrm = p.normals.array as Float32Array;
      for (let i = 0; i < p.slots.length; i++) {
        const s = p.slots[i]!;
        const o = eases.openness(s.leaf.key, s.leaf.open, now);
        if (o === s.written) continue;
        leafCorners(s.leaf, o, pos, i * 12, DIR);
        // Normal ⟂ the leaf in the ground plane (DoubleSide flips it for the back).
        const nx = -DIR.z;
        const nz = DIR.x;
        for (let k = 0; k < 4; k++) {
          nrm[i * 12 + k * 3] = nx;
          nrm[i * 12 + k * 3 + 1] = 0;
          nrm[i * 12 + k * 3 + 2] = nz;
        }
        s.written = o;
        dirty = true;
        this.rewrites++;
      }
      this.leaves += p.slots.length;
      if (dirty) {
        p.positions.needsUpdate = true;
        p.normals.needsUpdate = true;
      }
    }
  }

  dispose(): void {
    for (const p of this.pages.values()) {
      this.group.remove(p.mesh);
      p.geometry.dispose();
      p.material.dispose();
    }
    this.pages.clear();
    this.group.removeFromParent();
  }
}
