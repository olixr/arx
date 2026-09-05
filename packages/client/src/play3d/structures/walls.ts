/**
 * THE WALLS LANE (play3d W2) — buildings as geometry with painted
 * faces: stone / wood / cave wall runs, windows as real holes, doorways
 * with jambs, headers and hinged leaves, 45° diagonals, awnings over
 * their hosts, and the wall-hung details on the south face. (The
 * garrison curtain is garrison.ts's — see THE CURTAIN HAS ONE BUILDER.)
 *
 * Laws:
 *  - A WALL TILE IS A PRISM: crown at ground + WALL_H, faces on
 *    EXPOSED sides only — THE SHARED-EDGE LAW
 *    (structKinds runN/E/S/W by the 2D's own `wallish`): a run reads
 *    as one mass and two run-mates never put coincident faces in the
 *    depth buffer. Corner heights come from the heightfield's own
 *    answer (`ctx.heightAt`, sampled a hair inside the tile), so a
 *    wall on a slope follows the ground and a lifted building lifts.
 *  - FACE UV = THE 2D FACE FRAME: u runs left→right as seen from the
 *    face's outside (west→east on the south face), v 0 at the ground
 *    base → 1 at the crown. Every window, door and hanging measure of
 *    the 2D painters maps 1:1 (structureFace.ts faceUV).
 *  - THE SOUTH FACE IS LIT, THE REST SHADED: the 2D only ever painted
 *    the south face; N/E/W wear the REAR RISER's shade(-14) tone and
 *    the same courses (wallFaces.ts).
 *  - A WINDOW IS A HOLE (TRUE GLASS): the face splits around the
 *    opening (head 1.62, band 0.7, u 0.28..0.72 for a single; THE
 *    WIDE LIGHT butts consecutive window tiles into one casement with
 *    a mullion post at each seam); the reveal gets its own four inner
 *    faces; a mullion card (alpha-cut) stands mid-wall. Interior and
 *    exterior both see through. The hole runs along the axis whose two
 *    faces are exposed (a window in a N-S run looks east-west).
 *  - A DOORWAY IS A TUNNEL: opening fixed at WALL_H − 1.56, jambs 0.15
 *    wide where the frame truly ends (wide doorways merge E-W; side
 *    doorways stand edge-on with jambs on their E/W faces and merge
 *    N-S), header above, reveal faces inside; THE LEAF (doors.ts) is a
 *    separate hinged quad on the hinge jamb, in the outdoor face plane
 *    (interiors.regionAt decides which side is out), THROWN OPEN
 *    OUTWARD like the 2D side door — an open doorway visibly HAS a
 *    door instead of hiding its leaf in the tunnel.
 *  - A DIAGONAL IS A TRIANGULAR PRISM: the suffix names the SOLID
 *    triangle (DiagNE = mass across the N and E edges); faces on the
 *    two mass edges when exposed and always on the hypotenuse (a √2
 *    wide face tile so the courses keep their pitch).
 *  - AN AWNING is a sloped cloth slab (root 1.76 on the host's face,
 *    rail 1.70 at 0.85 out, hem flared 0.16 at free ends) with an
 *    underside and an alpha-cut skirt in the dye's cloth.
 *  - NO ROOFS; interiors stay open-topped. No reveal/cutaway (W4).
 *  - THE PAINTER IS SEEDED: face tiles are minted per (material, skin,
 *    tone, variant) — VARIANTS of them per material — and the world
 *    tile picks its variant by hash, so the atlas holds a few hundred
 *    tiles for a whole town.
 */
import { AWNING_HOST_TILES, Tile, awningInfo, hashCoords, type AwningInfo } from '@arx/shared';
import type { InteriorRegion } from '../../render/interiors.js';
import type { WoodSkin } from '../../render/woodSkins.js';
import { packChunk } from '../chunkRing.js';
import type { StructBuildCtx, StructBuildResult } from './structures.js';
import { WALL_H, familyOf, type StructSampler, type TileStruct, type WallMaterial } from './structKinds.js';
import type { FaceRef } from './faceAtlas.js';
import { aimStubHost, type StubHost } from './stubHost.js';
import type { StructMaterialKind, StructSink } from './structSink.js';
import { doorLeaves, type DoorLeaf } from './doors.js';
import * as F from './wallFaces.js';

/** Face tile variants minted per (material, skin, tone). */
export const VARIANTS = 6;
/**
 * THE CURTAIN HAS ONE BUILDER: garrison.ts (the BARRIERS lane) builds
 * the garrison — prism, merlons, gatehouse, side gates and the
 * wall-hung art on its south faces. This lane's own curtain paths were
 * cut by INTEGRATE so two curtains never stand in one depth buffer.
 */
/** Sample the heightfield this far inside a tile for its own corner. */
const EPS = 0.002;
/** The shut leaf stands this far inside its outdoor face plane. */
const LEAF_INSET = 0.03;

export type Side = 'N' | 'E' | 'S' | 'W';
export const SIDES: readonly Side[] = ['S', 'N', 'E', 'W'];

/** Corner ground heights of a tile: [nw, ne, se, sw]. */
export type Corners = [number, number, number, number];

/**
 * A vertical face: the base edge a→b (u 0→1 left→right from outside),
 * base heights at each end, height H, outward normal (nx, nz).
 */
export interface FaceEdge {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  ya: number;
  yb: number;
  H: number;
  nx: number;
  nz: number;
}

/** The face on `side` of tile (tx,ty) with corner heights `g`, rising H. */
export function sideFace(side: Side, tx: number, ty: number, g: Corners, H: number, out: FaceEdge): FaceEdge {
  out.H = H;
  switch (side) {
    case 'S':
      out.ax = tx;
      out.az = ty + 1;
      out.bx = tx + 1;
      out.bz = ty + 1;
      out.ya = g[3];
      out.yb = g[2];
      out.nx = 0;
      out.nz = 1;
      break;
    case 'N':
      out.ax = tx + 1;
      out.az = ty;
      out.bx = tx;
      out.bz = ty;
      out.ya = g[1];
      out.yb = g[0];
      out.nx = 0;
      out.nz = -1;
      break;
    case 'E':
      out.ax = tx + 1;
      out.az = ty + 1;
      out.bx = tx + 1;
      out.bz = ty;
      out.ya = g[2];
      out.yb = g[1];
      out.nx = 1;
      out.nz = 0;
      break;
    case 'W':
      out.ax = tx;
      out.az = ty;
      out.bx = tx;
      out.bz = ty + 1;
      out.ya = g[0];
      out.yb = g[3];
      out.nx = -1;
      out.nz = 0;
      break;
  }
  return out;
}

/** Which side of `t` continues its run (no face there). */
export function runOn(t: TileStruct, side: Side): boolean {
  return side === 'N' ? t.runN : side === 'S' ? t.runS : side === 'E' ? t.runE : t.runW;
}

/**
 * THE WIDE LIGHT's u range on a face: a single light rides
 * 0.28..0.72; a merged edge butts the seam. `mergeL`/`mergeR` are in
 * the face's own left/right.
 */
export function windowSpan(mergeL: boolean, mergeR: boolean): [number, number] {
  return [mergeL ? 0 : F.WINDOW_U0, mergeR ? 1 : F.WINDOW_U1];
}

/** The corner loop of a diagonal's solid triangle and its hypotenuse (a→b seen from outside). */
export function diagShape(mass: 'NE' | 'NW' | 'SE' | 'SW'): { tri: ReadonlyArray<readonly [number, number]>; hypA: readonly [number, number]; hypB: readonly [number, number]; nx: number; nz: number; edges: readonly Side[] } {
  const r = Math.SQRT1_2;
  switch (mass) {
    case 'NE':
      return { tri: [[0, 0], [1, 0], [1, 1]], hypA: [0, 0], hypB: [1, 1], nx: -r, nz: r, edges: ['N', 'E'] };
    case 'NW':
      return { tri: [[0, 0], [1, 0], [0, 1]], hypA: [0, 1], hypB: [1, 0], nx: r, nz: r, edges: ['N', 'W'] };
    case 'SE':
      return { tri: [[1, 0], [1, 1], [0, 1]], hypA: [1, 0], hypB: [0, 1], nx: -r, nz: -r, edges: ['E', 'S'] };
    case 'SW':
      return { tri: [[0, 0], [1, 1], [0, 1]], hypA: [1, 1], hypB: [0, 0], nx: r, nz: -r, edges: ['S', 'W'] };
  }
}

// ---------------------------------------------------------- the lane

class WallBuilder {
  private readonly sink: StructSink;
  private readonly sampler: StructSampler;
  /**
   * THE RUN REACHES PAST THE RING: wide doorways and merged hung art
   * scan up to 8 tiles along the wall, further than the 1-tile
   * bordered snapshot answers — so those scans read the LIVE world
   * (as garrison gate runs do) and two chunks sharing a run agree on
   * its extent (one jamb pair, one leaf key, one pennant index). The
   * 4-neighbour continuity still reads the snapshot.
   */
  private readonly far: StructSampler;
  private readonly host: StubHost;
  private readonly face: FaceEdge = { ax: 0, az: 0, bx: 0, bz: 0, ya: 0, yb: 0, H: 0, nx: 0, nz: 0 };
  private readonly g: Corners = [0, 0, 0, 0];
  private readonly leaves: DoorLeaf[] = [];
  private readonly skins = new Map<number, WoodSkin>();
  runs = 0;
  doors = 0;
  windows = 0;
  awnings = 0;
  hung = 0;

  constructor(private readonly ctx: StructBuildCtx) {
    this.sink = ctx.sink;
    this.sampler = ctx.sampler;
    this.far = ctx.world;
    this.host = ctx.host;
  }

  // ----------------------------------------------------- utilities

  private corners(tx: number, ty: number): Corners {
    const h = this.ctx.heightAt;
    const g = this.g;
    g[0] = h(tx + EPS, ty + EPS);
    g[1] = h(tx + 1 - EPS, ty + EPS);
    g[2] = h(tx + 1 - EPS, ty + 1 - EPS);
    g[3] = h(tx + EPS, ty + 1 - EPS);
    return g;
  }

  private flat(tx: number, ty: number): number {
    return this.ctx.heightAt(tx + 0.5, ty + 0.5);
  }

  /** The region a wall belongs to (renderer.ts wallRegion): cardinals, then diagonals. */
  private wallRegion(tx: number, ty: number): InteriorRegion | null {
    const own = this.ctx.regionAt(tx, ty);
    if (own) return own;
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ] as const) {
      const t = this.sampler.groundAt(tx + dx, ty + dy);
      if (t === undefined || familyOf(t) === 'wall') continue;
      const r = this.ctx.regionAt(tx + dx, ty + dy);
      if (r) return r;
    }
    return null;
  }

  private skinAt(tx: number, ty: number): WoodSkin {
    const key = (tx + 0x8000) * 65536 + (ty + 0x8000);
    let s = this.skins.get(key);
    if (!s) this.skins.set(key, (s = this.ctx.woodSkinFor(this.wallRegion(tx, ty))));
    return s;
  }

  private variant(tx: number, ty: number): number {
    return hashCoords(311, tx, ty) % VARIANTS;
  }

  /**
   * Emit a sub-rectangle [u0,u1]×[v0,v1] of a face, textured by the
   * matching sub-rect of `ref` (ref spans the whole face).
   */
  private piece(kind: StructMaterialKind, f: FaceEdge, u0: number, u1: number, v0: number, v1: number, ref: FaceRef): void {
    const p = this.sink.p;
    const uv = this.sink.uv;
    const ru = ref.u1 - ref.u0;
    const rv = ref.v1 - ref.v0;
    const set = (i: number, u: number, v: number): void => {
      p[i * 3] = f.ax + (f.bx - f.ax) * u;
      p[i * 3 + 1] = f.ya + (f.yb - f.ya) * u + v * f.H;
      p[i * 3 + 2] = f.az + (f.bz - f.az) * u;
      uv[i * 2] = ref.u0 + ru * u;
      uv[i * 2 + 1] = ref.v0 + rv * v;
    };
    set(0, u0, v0);
    set(1, u1, v0);
    set(2, u1, v1);
    set(3, u0, v1);
    this.sink.quad(kind, ref.page, p, uv, f.nx, 0, f.nz);
  }

  /** A whole face. */
  private whole(f: FaceEdge, ref: FaceRef): void {
    this.piece('opaque', f, 0, 1, 0, 1, ref);
  }

  /** A horizontal quad over [x0,x1]×[z0,z1] at per-corner heights, normal ±Y. */
  private flatQuad(kind: StructMaterialKind, ref: FaceRef, x0: number, z0: number, x1: number, z1: number, yNW: number, yNE: number, ySE: number, ySW: number, up: boolean): void {
    const p = this.sink.p;
    const uv = this.sink.uv;
    p[0] = x0;
    p[1] = yNW;
    p[2] = z0;
    p[3] = x1;
    p[4] = yNE;
    p[5] = z0;
    p[6] = x1;
    p[7] = ySE;
    p[8] = z1;
    p[9] = x0;
    p[10] = ySW;
    p[11] = z1;
    uv[0] = ref.u0;
    uv[1] = ref.v1;
    uv[2] = ref.u1;
    uv[3] = ref.v1;
    uv[4] = ref.u1;
    uv[5] = ref.v0;
    uv[6] = ref.u0;
    uv[7] = ref.v0;
    this.sink.quad(kind, ref.page, p, uv, 0, up ? 1 : -1, 0);
  }

  // ---------------------------------------------------- face tiles

  private faceRef(mat: WallMaterial, skin: WoodSkin, tone: F.FaceToneKind, variant: number, cracked: boolean, tilesW = 1, H = WALL_H): FaceRef {
    const si = mat === 'wood' ? F.skinIndex(skin) : 0;
    const key = `wf/${mat}/${si}/${tone}/${variant}${cracked ? 'c' : ''}/${tilesW}/${H}`;
    return this.ctx.atlas.get(key, () =>
      F.faceSpec(tilesW, H, (c, w, hs, s) => F.paintMaterialFace(c, 0, w, hs, s, mat, skin, tone, variant * 7 + 3, variant * 3 + 11, cracked)),
    );
  }

  private windowRef(mat: WallMaterial, skin: WoodSkin, tone: F.FaceToneKind, mergeL: boolean, mergeR: boolean, sillMix: number): FaceRef {
    const si = mat === 'wood' ? F.skinIndex(skin) : 0;
    const key = `ww/${mat}/${si}/${tone}/${mergeL ? 1 : 0}${mergeR ? 1 : 0}/${sillMix}`;
    return this.ctx.atlas.get(key, () =>
      F.faceSpec(1, WALL_H, (c, w, hs, s) => {
        F.paintMaterialFace(c, 0, w, hs, s, mat, skin, tone, 5, 17);
        F.paintWindowDressing(c, s, mat, F.tonedSkin(skin, tone), F.matTones(mat, skin, tone).face, mergeL, mergeR);
        if (sillMix >= 0) {
          const [wu0, wu1] = windowSpan(mergeL, mergeR);
          // THE HERBALIST'S SILL rides the window stack; sill y = the glass's bottom edge.
          aimStubHost(this.host, c, s);
          F.paintHungSill(this.host, wu0 * s, wu1 * s, -s * F.WINDOW_SILL, s, sillMix);
        }
      }),
    );
  }

  /** THE GLAZED FACE WEARS ITS ART TOO: the window dressing with the wall-hung detail composited over it (the 2D order). */
  private windowHungRef(mat: WallMaterial, skin: WoodSkin, mergeL: boolean, mergeR: boolean, t: TileStruct, index: number, length: number): FaceRef {
    const detail = this.sampler.detailAt(t.tx, t.ty);
    const si = mat === 'wood' ? F.skinIndex(skin) : 0;
    const key = `wwh/${mat}/${si}/${mergeL ? 1 : 0}${mergeR ? 1 : 0}/${detail}/${index}/${length}`;
    return this.ctx.atlas.get(key, () =>
      F.faceSpec(1, WALL_H, (c, w, hs, s) => {
        F.paintMaterialFace(c, 0, w, hs, s, mat, skin, 'lit', 5, 17);
        F.paintWindowDressing(c, s, mat, F.tonedSkin(skin, 'lit'), F.matTones(mat, skin, 'lit').face, mergeL, mergeR);
        aimStubHost(this.host, c, s);
        F.paintHungDetail(this.host, t.wallHung!, detail, s, false, { index, length }, t.tile);
      }),
    );
  }

  private mullionRef(mat: WallMaterial, skin: WoodSkin, mergeL: boolean, mergeR: boolean, spanU: number): FaceRef {
    const si = mat === 'wood' ? F.skinIndex(skin) : 0;
    const key = `mul/${mat}/${si}/${mergeL ? 1 : 0}${mergeR ? 1 : 0}/${spanU.toFixed(2)}`;
    return this.ctx.atlas.get(key, () => {
      const { s } = F.faceTileSize(1, 1);
      const w = Math.max(2, Math.round(spanU * s));
      const h = Math.max(2, Math.round(F.WINDOW_BAND * s));
      const tone = mat === 'wood' ? F.toned(skin.log, 'shaded') : F.toned(F.STONE_FACE, 'shaded');
      return { w, h, bleed: false, paint: (c) => F.paintMullionCard(c, w, h, s, tone, mergeL, mergeR) };
    });
  }

  private crownRef(mat: WallMaterial, skin: WoodSkin, vert: boolean, variant: number): FaceRef {
    const si = mat === 'wood' ? F.skinIndex(skin) : 0;
    const key = `cr/${mat}/${si}/${vert ? 'v' : 'h'}/${variant}`;
    return this.ctx.atlas.get(key, () => {
      const { w, h } = F.faceTileSize(1, 1);
      return {
        w,
        h,
        paint: (c) => F.paintCrownTile(c, w, h, mat, skin, vert, variant * 7 + 3, variant * 3 + 11),
      };
    });
  }

  private plainRef(tone: string): FaceRef {
    return this.ctx.atlas.get(`pl/${tone}`, () => F.faceSpec(0.5, 0.5, (c, w, h) => F.paintPlainTile(c, w, h, tone)));
  }

  private doorFaceRef(mat: WallMaterial, skin: WoodSkin, tone: F.FaceToneKind, jambL: boolean, jambR: boolean): FaceRef {
    const si = mat === 'wood' ? F.skinIndex(skin) : 0;
    const key = `df/${mat}/${si}/${tone}/${jambL ? 1 : 0}${jambR ? 1 : 0}`;
    return this.ctx.atlas.get(key, () => F.faceSpec(1, WALL_H, (c, w, hs, s) => F.paintDoorFace(c, w, hs, s, mat, skin, tone, jambL, jambR, 9, 23)));
  }

  private leafRef(mat: WallMaterial, skin: WoodSkin, w: number, h: number, mirror: boolean): FaceRef {
    const si = mat === 'wood' ? F.skinIndex(skin) : 0;
    const wq = Math.round(w * 20) / 20;
    const hq = Math.round(h * 20) / 20;
    const ref = this.ctx.atlas.get(`lf/${mat}/${si}/${wq}/${hq}`, () => F.faceSpec(wq, hq, (c, cw, ch, s) => F.paintLeafTile(c, cw, ch, s, F.leafTone(mat, skin))));
    return mirror ? { ...ref, u0: ref.u1, u1: ref.u0 } : ref;
  }

  private hungRef(mat: WallMaterial, skin: WoodSkin, t: TileStruct, index: number, length: number): FaceRef {
    const detail = this.sampler.detailAt(t.tx, t.ty);
    const si = mat === 'wood' ? F.skinIndex(skin) : 0;
    const key = `wh/${mat}/${si}/${detail}/${index}/${length}`;
    return this.ctx.atlas.get(key, () =>
      F.faceSpec(1, WALL_H, (c, w, hs, s) => {
        aimStubHost(this.host, c, s);
        F.paintMaterialFace(c, 0, w, hs, s, mat, skin, 'lit', 5, 19);
        F.paintHungDetail(this.host, t.wallHung!, detail, s, false, { index, length }, t.tile);
      }),
    );
  }

  private awningRefs(shape: AwningInfo['shape'], dye: number, skin: WoodSkin): { top: FaceRef; under: FaceRef; skirt: FaceRef } {
    const si = shape === 'board' ? F.skinIndex(skin) : 0;
    const { s } = F.faceTileSize(1, 1);
    const w = Math.round(s);
    const d = Math.round(F.AWNING_DEPTH * s);
    const sd = Math.round((F.awningSkirtDepth(shape) + 0.06) * s);
    const top = this.ctx.atlas.get(`aw/t/${shape}/${dye}/${si}`, () => ({ w, h: d, paint: (c: CanvasRenderingContext2D) => F.paintAwningTop(c, w, d, shape, dye, skin) }));
    const under = this.ctx.atlas.get(`aw/u/${shape}/${dye}/${si}`, () => ({ w, h: d, paint: (c: CanvasRenderingContext2D) => F.paintAwningUnder(c, w, d, shape, dye, skin) }));
    const skirt = this.ctx.atlas.get(`aw/s/${shape}/${dye}/${si}`, () => ({ w, h: sd, bleed: false, paint: (c: CanvasRenderingContext2D) => F.paintAwningSkirt(c, w, sd, shape, dye, skin) }));
    return { top, under, skirt };
  }

  // ------------------------------------------------------ the crown

  private crown(t: TileStruct, g: Corners, H: number, mat: WallMaterial, skin: WoodSkin): void {
    const vert = (t.runN || t.runS) && !(t.runW || t.runE);
    const ref = this.crownRef(mat, skin, vert, this.variant(t.tx, t.ty));
    this.flatQuad('opaque', ref, t.tx, t.ty, t.tx + 1, t.ty + 1, g[0] + H, g[1] + H, g[2] + H, g[3] + H, true);
  }

  // ------------------------------------------------------ the prism

  private prism(t: TileStruct, mat: WallMaterial, skin: WoodSkin): void {
    const g = this.corners(t.tx, t.ty);
    const H = WALL_H;
    const v = this.variant(t.tx, t.ty);
    const cracked = t.tile === Tile.CrackedCaveWall;
    // The window's axis: through the two exposed opposite faces —
    // or, when only ONE face of the pair is exposed (a party wall, a
    // thick mass), THE LIGHT STILL SHOWS on that face: a shallow reveal
    // half a tile deep, capped by a back plate in the shaded tone (the
    // 2D paints the window whenever the south face is open).
    let axis: 'NS' | 'EW' | null = null;
    let single: Side | null = null;
    if (t.isWindow) {
      if (!t.runS && !t.runN) axis = 'NS';
      else if (!t.runE && !t.runW) axis = 'EW';
      else if (!t.runS) single = 'S';
      else if (!t.runN) single = 'N';
      else if (!t.runE) single = 'E';
      else if (!t.runW) single = 'W';
      if (single) axis = single === 'S' || single === 'N' ? 'NS' : 'EW';
    }
    const sillMix = t.wallHung?.kind === 'sill' ? (t.wallHung.mix ?? 0) : -1;
    const sameWin = (dx: number, dy: number): boolean => this.sampler.groundAt(t.tx + dx, t.ty + dy) === t.tile;
    const mergeW = axis === 'NS' && sameWin(-1, 0);
    const mergeE = axis === 'NS' && sameWin(1, 0);
    const mergeN = axis === 'EW' && sameWin(0, -1);
    const mergeS = axis === 'EW' && sameWin(0, 1);
    // Hung art rides the south face whether or not it is glazed (the 2D hangs over the window).
    const hung = t.wallHung !== null && t.wallHung.kind !== 'sill' && !t.runS;
    for (const side of SIDES) {
      if (runOn(t, side)) continue;
      const f = sideFace(side, t.tx, t.ty, g, H, this.face);
      const tone: F.FaceToneKind = side === 'S' ? 'lit' : 'shaded';
      const onAxis = single ? side === single : axis === 'NS' ? side === 'S' || side === 'N' : axis === 'EW' ? side === 'E' || side === 'W' : false;
      if (onAxis) {
        // Face-local merge flags: left/right as seen from outside.
        const mergeL = side === 'S' ? mergeW : side === 'N' ? mergeE : side === 'E' ? mergeS : mergeN;
        const mergeR = side === 'S' ? mergeE : side === 'N' ? mergeW : side === 'E' ? mergeN : mergeS;
        let ref = this.windowRef(mat, skin, tone, mergeL, mergeR, sillMix);
        if (side === 'S' && hung) {
          const { index, length } = this.hungRun(t);
          ref = this.windowHungRef(mat, skin, mergeL, mergeR, t, index, length);
          this.hung++;
        }
        const [u0, u1] = windowSpan(mergeL, mergeR);
        const v0 = F.WINDOW_SILL / H;
        const v1 = F.WINDOW_HEAD / H;
        this.piece('opaque', f, 0, 1, 0, v0, ref);
        this.piece('opaque', f, 0, 1, v1, 1, ref);
        if (u0 > 0) this.piece('opaque', f, 0, u0, v0, v1, ref);
        if (u1 < 1) this.piece('opaque', f, u1, 1, v0, v1, ref);
      } else if (side === 'S' && hung) {
        const { index, length } = this.hungRun(t);
        this.whole(f, this.hungRef(mat, skin, t, index, length));
        this.hung++;
      } else {
        this.whole(f, this.faceRef(mat, skin, tone, v, cracked));
      }
    }
    if (axis) this.windowReveal(t, g, mat, skin, axis, single, mergeW, mergeE, mergeN, mergeS);
    this.crown(t, g, H, mat, skin);
  }

  /**
   * The reveal's inner faces + the mullion card, along `axis`. A
   * through window spans the tile; a `single`-face window's reveal
   * runs from that face to mid-tile and a back plate (shaded face
   * tone) closes it, the mullion a hair in front of the plate.
   */
  private windowReveal(t: TileStruct, g: Corners, mat: WallMaterial, skin: WoodSkin, axis: 'NS' | 'EW', single: Side | null, mergeW: boolean, mergeE: boolean, mergeN: boolean, mergeS: boolean): void {
    this.windows++;
    const base = (g[0] + g[1] + g[2] + g[3]) / 4;
    const y0 = base + F.WINDOW_SILL;
    const y1 = base + F.WINDOW_HEAD;
    const tone = F.matTones(mat, skin, 'shaded').face;
    const rv = this.plainRef(tone);
    const f = this.face;
    f.H = y1 - y0;
    f.ya = y0;
    f.yb = y0;
    const PLATE = 0.06;
    if (axis === 'NS') {
      const x0 = t.tx + (mergeW ? 0 : F.WINDOW_U0);
      const x1 = t.tx + (mergeE ? 1 : F.WINDOW_U1);
      // Depth range of the reveal along z.
      const z0 = single === 'S' ? t.ty + 0.5 : t.ty;
      const z1 = single === 'N' ? t.ty + 0.5 : t.ty + 1;
      this.flatQuad('opaque', rv, x0, z0, x1, z1, y0, y0, y0, y0, true);
      this.flatQuad('opaque', rv, x0, z0, x1, z1, y1, y1, y1, y1, false);
      if (!mergeW) {
        Object.assign(f, { ax: x0, az: z0, bx: x0, bz: z1, nx: 1, nz: 0 });
        this.whole(f, rv);
      }
      if (!mergeE) {
        Object.assign(f, { ax: x1, az: z1, bx: x1, bz: z0, nx: -1, nz: 0 });
        this.whole(f, rv);
      }
      if (single === 'S') {
        Object.assign(f, { ax: x0, az: z0, bx: x1, bz: z0, nx: 0, nz: 1 });
        this.whole(f, rv);
      } else if (single === 'N') {
        Object.assign(f, { ax: x1, az: z1, bx: x0, bz: z1, nx: 0, nz: -1 });
        this.whole(f, rv);
      }
      // The mullion card mid-wall (or just before the plate), seen from the south (u W→E).
      const zm = single === 'S' ? z0 + PLATE : single === 'N' ? z1 - PLATE : t.ty + 0.5;
      Object.assign(f, { ax: x0, az: zm, bx: x1, bz: zm, nx: 0, nz: 1 });
      this.piece('cutout', f, 0, 1, 0, 1, this.mullionRef(mat, skin, mergeW, mergeE, x1 - x0));
    } else {
      const z0 = t.ty + (mergeN ? 0 : F.WINDOW_U0);
      const z1 = t.ty + (mergeS ? 1 : F.WINDOW_U1);
      const x0 = single === 'E' ? t.tx + 0.5 : t.tx;
      const x1 = single === 'W' ? t.tx + 0.5 : t.tx + 1;
      this.flatQuad('opaque', rv, x0, z0, x1, z1, y0, y0, y0, y0, true);
      this.flatQuad('opaque', rv, x0, z0, x1, z1, y1, y1, y1, y1, false);
      if (!mergeN) {
        Object.assign(f, { ax: x1, az: z0, bx: x0, bz: z0, nx: 0, nz: 1 });
        this.whole(f, rv);
      }
      if (!mergeS) {
        Object.assign(f, { ax: x0, az: z1, bx: x1, bz: z1, nx: 0, nz: -1 });
        this.whole(f, rv);
      }
      if (single === 'E') {
        Object.assign(f, { ax: x0, az: z1, bx: x0, bz: z0, nx: 1, nz: 0 });
        this.whole(f, rv);
      } else if (single === 'W') {
        Object.assign(f, { ax: x1, az: z0, bx: x1, bz: z1, nx: -1, nz: 0 });
        this.whole(f, rv);
      }
      // Seen from the east (u S→N): left = south.
      const xm = single === 'E' ? x0 + PLATE : single === 'W' ? x1 - PLATE : t.tx + 0.5;
      Object.assign(f, { ax: xm, az: z1, bx: xm, bz: z0, nx: 1, nz: 0 });
      this.piece('cutout', f, 0, 1, 0, 1, this.mullionRef(mat, skin, mergeS, mergeN, z1 - z0));
    }
  }

  /** This tile's place in its merged hung-art run (pennants and tapestries merge along the row). */
  private hungRun(t: TileStruct): { index: number; length: number } {
    const kind = t.wallHung?.kind;
    if (kind !== 'pennant' && kind !== 'tapestry') return { index: 0, length: 1 };
    const d = this.sampler.detailAt(t.tx, t.ty);
    const far = this.far;
    const member = (x: number): boolean => far.groundAt(x, t.ty) === t.tile && far.detailAt(x, t.ty) === d;
    let w = 0;
    while (w < 8 && member(t.tx - w - 1)) w++;
    let e = 0;
    while (e < 8 && member(t.tx + e + 1)) e++;
    return { index: w, length: w + e + 1 };
  }

  // ---------------------------------------------------- the diagonal

  private diag(t: TileStruct, mat: WallMaterial, skin: WoodSkin): void {
    const g = this.corners(t.tx, t.ty);
    const H = WALL_H;
    const v = this.variant(t.tx, t.ty);
    const shape = diagShape(t.diag!.mass);
    const f = this.face;
    for (const side of shape.edges) {
      if (runOn(t, side)) continue;
      sideFace(side, t.tx, t.ty, g, H, f);
      const tone: F.FaceToneKind = side === 'S' ? 'lit' : 'shaded';
      this.whole(f, this.faceRef(mat, skin, tone, v, false));
    }
    // The hypotenuse: √2 wide so the courses keep their pitch.
    const cornerH = (c: readonly [number, number]): number => (c[0] === 0 ? (c[1] === 0 ? g[0] : g[3]) : c[1] === 0 ? g[1] : g[2]);
    Object.assign(f, {
      ax: t.tx + shape.hypA[0],
      az: t.ty + shape.hypA[1],
      bx: t.tx + shape.hypB[0],
      bz: t.ty + shape.hypB[1],
      ya: cornerH(shape.hypA),
      yb: cornerH(shape.hypB),
      H,
      nx: shape.nx,
      nz: shape.nz,
    });
    const front = shape.nz > 0;
    this.whole(f, this.faceRef(mat, skin, front ? 'lit' : 'shaded', v, false, Math.SQRT2));
    // The crown triangle.
    const ref = this.crownRef(mat, skin, false, v);
    const p = this.sink.p;
    const uv = this.sink.uv;
    shape.tri.forEach((c, i) => {
      p[i * 3] = t.tx + c[0];
      p[i * 3 + 1] = cornerH(c) + H;
      p[i * 3 + 2] = t.ty + c[1];
      uv[i * 2] = ref.u0 + (ref.u1 - ref.u0) * c[0];
      uv[i * 2 + 1] = ref.v1 - (ref.v1 - ref.v0) * c[1];
    });
    this.sink.tri('opaque', ref.page, p, uv, 0, 1, 0);
    this.sink.quads++;
  }

  // ------------------------------------------------------ the doorway

  /**
   * A framed opening through the tile along `axis` ('NS' = you walk
   * north-south through an E-W wall; 'EW' = a side doorway). Wide
   * doors merge along the wall (jambs only at true ends).
   */
  private doorway(t: TileStruct, mat: WallMaterial, skin: WoodSkin): void {
    this.doors++;
    const door = t.door!;
    const wmat: WallMaterial = mat;
    const H = WALL_H;
    const axis: 'NS' | 'EW' = t.sideDoorway ? 'EW' : 'NS';
    const g = this.corners(t.tx, t.ty);
    const base = this.flat(t.tx, t.ty);
    const same = (dx: number, dy: number): boolean => this.far.groundAt(t.tx + dx, t.ty + dy) === t.tile;
    // Run extent along the wall, read from the live world (THE RUN REACHES PAST THE RING).
    const along: [number, number] = axis === 'NS' ? [1, 0] : [0, 1];
    let before = 0;
    let after = 0;
    if (door.wide) {
      while (before < 8 && same(-along[0] * (before + 1), -along[1] * (before + 1))) before++;
      while (after < 8 && same(along[0] * (after + 1), along[1] * (after + 1))) after++;
    }
    const runLen = before + after + 1;
    const jambA = before === 0; // west / north end
    const jambB = after === 0; // east / south end
    const pierW = F.DOOR_JAMB;
    const headH = F.DOOR_CLEAR;
    const clear = Math.min(headH, H - 0.2);
    const jw = pierW;
    const v = this.variant(t.tx, t.ty);
    const f = this.face;
    // The two framed faces and the two plain faces.
    for (const side of SIDES) {
      if (runOn(t, side)) continue;
      sideFace(side, t.tx, t.ty, g, H, f);
      const tone: F.FaceToneKind = side === 'S' ? 'lit' : 'shaded';
      const framed = axis === 'NS' ? side === 'S' || side === 'N' : side === 'E' || side === 'W';
      if (!framed) {
        this.whole(f, this.faceRef(wmat, skin, tone, v, false));
        continue;
      }
      // Face-local jambs: left/right as seen from outside.
      const jL = side === 'S' || side === 'W' ? jambA : jambB;
      const jR = side === 'S' || side === 'W' ? jambB : jambA;
      const ref = this.doorFaceRef(wmat, skin, tone, jL, jR);
      const cv = clear / H;
      this.piece('opaque', f, 0, 1, cv, 1, ref);
      if (jL) this.piece('opaque', f, 0, jw, 0, cv, ref);
      if (jR) this.piece('opaque', f, 1 - jw, 1, 0, cv, ref);
    }
    // The tunnel: header underside + jamb reveals.
    const trim = F.matTones(wmat, skin, 'shaded').trim;
    const rv = this.plainRef(trim);
    f.H = clear;
    f.ya = base;
    f.yb = base;
    if (axis === 'NS') {
      const x0 = t.tx + (jambA ? jw : 0);
      const x1 = t.tx + 1 - (jambB ? jw : 0);
      this.flatQuad('opaque', rv, x0, t.ty, x1, t.ty + 1, base + clear, base + clear, base + clear, base + clear, false);
      if (jambA) {
        Object.assign(f, { ax: x0, az: t.ty, bx: x0, bz: t.ty + 1, nx: 1, nz: 0 });
        this.whole(f, rv);
      }
      if (jambB) {
        Object.assign(f, { ax: x1, az: t.ty + 1, bx: x1, bz: t.ty, nx: -1, nz: 0 });
        this.whole(f, rv);
      }
    } else {
      const z0 = t.ty + (jambA ? jw : 0);
      const z1 = t.ty + 1 - (jambB ? jw : 0);
      this.flatQuad('opaque', rv, t.tx, z0, t.tx + 1, z1, base + clear, base + clear, base + clear, base + clear, false);
      if (jambA) {
        Object.assign(f, { ax: t.tx + 1, az: z0, bx: t.tx, bz: z0, nx: 0, nz: 1 });
        this.whole(f, rv);
      }
      if (jambB) {
        Object.assign(f, { ax: t.tx, az: z1, bx: t.tx + 1, bz: z1, nx: 0, nz: -1 });
        this.whole(f, rv);
      }
    }
    this.crown(t, g, H, mat, skin);
    // THE LEAF: in the outdoor face plane, hinged on the end jambs, swinging outward.
    const anchorKey = axis === 'NS' ? `${t.tx - before},${t.ty}` : `${t.tx},${t.ty - before}`;
    const opening = runLen - jw * 2;
    const lw = door.wide ? opening / 2 - 0.01 : opening - 0.02;
    const lh = clear - 0.06;
    const inside = (dx: number, dy: number): boolean => this.ctx.regionAt(t.tx + dx, t.ty + dy) !== null;
    if (axis === 'NS') {
      // Room to the south and none to the north = the outdoor face is north.
      const outN = inside(0, 1) && !inside(0, -1);
      const z = outN ? t.ty + LEAF_INSET : t.ty + 1 - LEAF_INSET;
      const oz = outN ? -1 : 1;
      if (jambA) this.leaves.push({ key: anchorKey, hx: t.tx + jw, hy: base, hz: z, sx: 1, sz: 0, ox: 0, oz, w: lw, h: lh, open: door.open, ref: this.leafRef(mat, skin, lw, lh, outN) });
      if (door.wide && jambB) this.leaves.push({ key: anchorKey, hx: t.tx + 1 - jw, hy: base, hz: z, sx: -1, sz: 0, ox: 0, oz, w: lw, h: lh, open: door.open, ref: this.leafRef(mat, skin, lw, lh, !outN) });
    } else {
      const outE = inside(-1, 0) && !inside(1, 0);
      const x = outE ? t.tx + 1 - LEAF_INSET : t.tx + LEAF_INSET;
      const ox = outE ? 1 : -1;
      if (jambA) this.leaves.push({ key: anchorKey, hx: x, hy: base, hz: t.ty + jw, sx: 0, sz: 1, ox, oz: 0, w: lw, h: lh, open: door.open, ref: this.leafRef(mat, skin, lw, lh, !outE) });
      if (door.wide && jambB) this.leaves.push({ key: anchorKey, hx: x, hy: base, hz: t.ty + 1 - jw, sx: 0, sz: -1, ox, oz: 0, w: lw, h: lh, open: door.open, ref: this.leafRef(mat, skin, lw, lh, outE) });
    }
  }

  // ------------------------------------------------------ the awning

  private awning(tx: number, ty: number, awn: AwningInfo, tile: number): void {
    const host = this.sampler.groundAt(tx, ty - 1);
    if (host === undefined || !AWNING_HOST_TILES.has(host as Tile)) return;
    this.awnings++;
    const skin = awn.shape === 'board' ? this.skinAt(tx, ty - 1) : this.ctx.woodSkinFor(null);
    const { top, under, skirt } = this.awningRefs(awn.shape, awn.dye, skin);
    const g = this.flat(tx, ty);
    const joins = (dx: number): boolean => {
      const n = this.sampler.groundAt(tx + dx, ty);
      return n !== undefined && (n === tile || awningInfo(n) !== null);
    };
    const fw = !joins(-1);
    const fe = !joins(1);
    const x0 = tx;
    const x1 = tx + 1;
    const hx0 = fw ? x0 - F.AWNING_FLARE : x0;
    const hx1 = fe ? x1 + F.AWNING_FLARE : x1;
    const zr = ty + F.AWNING_DEPTH;
    const yRoot = g + F.AWNING_ROOT_H;
    const yRail = g + F.AWNING_RAIL_H;
    const p = this.sink.p;
    const uv = this.sink.uv;
    const slab = (ref: FaceRef, up: boolean): void => {
      p[0] = x0;
      p[1] = yRoot;
      p[2] = ty;
      p[3] = x1;
      p[4] = yRoot;
      p[5] = ty;
      p[6] = hx1;
      p[7] = yRail;
      p[8] = zr;
      p[9] = hx0;
      p[10] = yRail;
      p[11] = zr;
      uv[0] = ref.u0;
      uv[1] = ref.v1;
      uv[2] = ref.u1;
      uv[3] = ref.v1;
      uv[4] = ref.u1;
      uv[5] = ref.v0;
      uv[6] = ref.u0;
      uv[7] = ref.v0;
      const k = up ? 1 : -1;
      this.sink.quad('opaque', ref.page, p, uv, 0, F.AWNING_DEPTH * k, (F.AWNING_ROOT_H - F.AWNING_RAIL_H) * k);
    };
    slab(top, true);
    slab(under, false);
    const sd = F.awningSkirtDepth(awn.shape) + 0.06;
    const f = this.face;
    Object.assign(f, { ax: hx0, az: zr, bx: hx1, bz: zr, ya: yRail - sd, yb: yRail - sd, H: sd, nx: 0, nz: 1 });
    this.piece('cutout', f, 0, 1, 0, 1, skirt);
  }

  // ----------------------------------------------------------- build

  build(): void {
    const scan = this.ctx.scan;
    for (const t of scan.byFamily.get('wall') ?? []) {
      const mat = t.material ?? 'stone';
      const skin = mat === 'wood' ? this.skinAt(t.tx, t.ty) : this.ctx.woodSkinFor(null);
      this.runs++;
      if (t.diag) this.diag(t, mat, skin);
      else if (t.door) this.doorway(t, mat, skin);
      else this.prism(t, mat, skin);
    }
    // Awnings are not a standing family: sweep the chunk for them.
    for (let ly = 0; ly < scan.size; ly++) {
      for (let lx = 0; lx < scan.size; lx++) {
        const tx = scan.x0 + lx;
        const ty = scan.y0 + ly;
        const tile = this.sampler.groundAt(tx, ty);
        if (tile === undefined) continue;
        const awn = awningInfo(tile);
        if (awn) this.awning(tx, ty, awn, tile);
      }
    }
    doorLeaves.setChunk(packChunk(this.ctx.cx, this.ctx.cy), this.leaves, performance.now());
  }
}

export function buildWallStructures(ctx: StructBuildCtx): StructBuildResult {
  const before = ctx.sink.quads;
  const b = new WallBuilder(ctx);
  b.build();
  return {
    quads: ctx.sink.quads - before,
    note: `walls ${b.runs} (${b.windows} windows, ${b.doors} doors, ${b.hung} hung) awnings ${b.awnings}`,
  };
}
