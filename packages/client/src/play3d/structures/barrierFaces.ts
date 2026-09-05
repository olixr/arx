/**
 * THE BARRIER FACES (play3d W2, BARRIERS lane) — every texture the
 * barrier and garrison meshes wear, minted ONCE per key into the shared
 * FaceAtlas and reused by every chunk.
 *
 * THE PAINTERS ARE THE 2D's OWN where the 2D has a primitive: fence
 * posts (barrierArt.drawFencePost), palisade giants and ropes
 * (giantLog / palisadeRope / drawPalisadePost), wrought bars, rails,
 * ornaments, curbs and piers (ironBar / ironRail / ironOrnament /
 * ironCurbEW / drawGravePier), the curtain's ashlar
 * (garrisonArt.paintGarrisonMasonry) — all called under the stub host
 * (stubHost.ts: they read ctx, camera.scale/yScale, outlineOn and the
 * struct-outline pen, nothing else). Where the 2D art lives inside an
 * `*Item` closure (fence rails, the five-bar leaf, the lashed palisade
 * leaf, the hedge's face kit and crown life, merlons in plan, gate
 * leaves) the few lines are RE-EMITTED here with the same tones and
 * measures, each with its source line.
 *
 * LAMBERT EATS A STOP: every tile is lifted toward white by
 * `liftPainted` (a source-atop white wash = faceTone.litTone applied
 * to whatever a painter laid down, alpha preserved) so the lit 3D face
 * reads the 2D's colour under the sun rig.
 *
 * Cards paint at CARD_PX (96 px/tile — a 0.17-tile post is 16 px, not
 * 8) with `bleed:false` (their edge IS transparent); prism faces paint
 * at FACE_PX (48) and replicate their border into the pad.
 *
 * Palettes: barrierArt's iron and hedge inks and garrisonArt's ashlar
 * are module-private in their homes; they are restated here with the
 * line they were read from. paintVocab's exports are imported.
 */
import { Tile, hashCoords, type WallHungInfo } from '@arx/shared';
import { paintGarrisonMasonry } from '../../render/garrisonArt.js';
import {
  drawFencePost,
  drawGravePier,
  drawPalisadePost,
  giantLog,
  ironBar,
  ironOrnament,
  ironRail,
  palisadeRope,
} from '../../render/barrierArt.js';
import { FENCE_POST, FENCE_RAIL, GARRISON_H, GAR_LEAF, GY_STONE, GY_STONE_LIT, PALI_LOG, PALI_ROPE, PALI_ROPE_DARK } from '../../render/paintVocab.js';
import { facetBlob, facetCircle } from '../../render/shapes.js';
import { shade } from '../../render/tint.js';
import { FACE_PX, type FaceAtlas, type FaceRef } from './faceAtlas.js';
import { FACE_LIFT } from './faceTone.js';
import { HED_H } from './structKinds.js';
import { aimStubHost, asPaintHost, faceFrame, type StubHost } from './stubHost.js';
import { paintHungDetail, type HungRun } from './wallFaces.js';

/** Card texture density (px per world tile). */
export const CARD_PX = 96;
/** Hedge prism density. */
export const HEDGE_PX = 64;

// barrierArt.ts:23-37
const IRON_DARK = '#26232f';
const IRON_MID = '#3c3849';
const IRON_LIT = '#635d76';
const HEDGE_DARK = '#24512c';
const HEDGE_LEAF = '#376e37';
const HEDGE_LIT = '#4f8f44';
const HEDGE_BLOOM = '#b04a72';
const HEDGE_BLOOM_LIT = '#ef9ec0';
// garrisonArt.ts:18-33
const GAR_FACE = '#544e61';
const GAR_IRON = '#2b2735';
const GAR_MERLON_TOP = '#847e91';
const GAR_PLINTH = '#3d3849';
const GAR_TOP = '#655f72';
const GAR_TRIM = '#7b7590';

// ------------------------------------------------ heights (world tiles)
/** The wood fence post (barrierArt.ts:361 drawFencePost … s·0.92). */
export const FENCE_H = 0.92;
/** Fence gate hinge posts (barrierArt.ts:487 … s·0.98). */
export const FENCE_GATE_POST_H = 0.98;
/** The rail panel's crown: RT 0.75 + PLANE 0.05 (barrierArt.ts:191-193). */
export const FENCE_RAIL_TOP = 0.8;
/** Fence leaf: yTop = base − 0.72·s (barrierArt.ts:402). */
export const FENCE_LEAF_H = 0.72;
/** The palisade card's crown: max shoulder 1.62 + max spike 0.345 (giantLog / logShoulder). */
export const PALI_CARD_H = 2.0;
/**
 * Where the palisade's flank cards stop and THE ONE CROWN begins: just
 * under the lowest shoulder (1.3). Both flanks carry bodies only; the
 * crowned silhouette rides a single card on the edge axis, so an
 * oblique view never sees two interleaved rows of points.
 */
export const PALI_BODY_H = 1.28;
/** Palisade log girth (barrierArt.ts:772 w = s·(0.24..0.28)). */
export const PALI_W = 0.24;
/** Palisade gate post (barrierArt.ts:905 POST_H = s·1.72) + its point. */
export const PALI_POST_H = 1.72;
export const PALI_POST_CARD_H = 2.1;
export const PALI_POST_W = 0.3;
/** Palisade leaf (barrierArt.ts:927 yTop = base − 1.12·s) + spike. */
export const PALI_LEAF_H = 1.12;
export const PALI_LEAF_CARD_H = 1.26;
export const PALI_LEAF_W = 0.36;
/** Iron: curb 0.15 (barrierArt.ts:1547 CURB_H), panel crown = tallest spear tip 1.41 (tipAt). */
export const IRON_CURB_H = 0.15;
export const IRON_CURB_W = 0.17;
export const IRON_PANEL_H = 1.5;
export const IRON_STANDARD_H = 1.5;
/** Grave pier: drawGravePier(w = s·0.26, hTot) — run/corner piers 1.52 (barrierArt.ts:1734), gate piers 1.66 (:1783); cap and finial ride above hTot. */
export const IRON_PIER_W = 0.26;
export const IRON_PIER_H = 1.52;
export const IRON_GATE_PIER_H = 1.66;
/** The pier card rises this much over hTot (cap 0.135 + the finial). */
export const IRON_PIER_CARD_OVER = 0.58;
export const IRON_PIER_CARD_W = 0.44;
export const IRON_LEAF_H = 1.3;
export const IRON_OVERTHROW_Y = 1.62;
export const IRON_OVERTHROW_H = 0.66;
/** The hedge crown's lobe card above HED_H. */
export const HEDGE_LOBE_H = 0.34;
export const HEDGE_LOBE_DROP = 0.12;
/** THE GATE IS THE HEDGE, THICKENED AT THE GAP (barrierArt.ts hedgeGateItem): posts 0.3 wide at the run's own height, the wicket waist-high. */
export const HEDGE_GATE_POST_W = 0.3;
/** A vertical gate's stubs, cut from the run (v ±0.5..±0.18). */
export const HEDGE_GATE_STUB_D = 0.32;
export const HEDGE_WICKET_H = 0.58;
export const HEDGE_FINIAL_H = 0.3;
export const HEDGE_FINIAL_W = 0.3;
/** Garrison gate: spring line 1.75 (garrisonArt.ts:592), pier width (:588). */
export const GAR_SPRING_H = 1.75;
export const GAR_LEAF_H = 1.75;
export const GAR_SIDE_LEAF_H = 1.9;
export const GAR_SIDE_LEAF_W = 0.8;
/** The raised portcullis shows this much below the arch head (bars thick enough to survive the mip chain: 0.09 tiles). */
export const GAR_PORTCULLIS_DROP = 0.24;
export const GAR_PORTCULLIS_BAR_W = 0.09;

/** A source-atop white wash: litTone for a painted tile, alpha kept. */
export function liftPainted(ctx: CanvasRenderingContext2D, w: number, h: number, k = FACE_LIFT): void {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = `rgba(255,255,255,${k.toFixed(3)})`;
  ctx.fillRect(-1, -1, w + 2, h + 2);
  ctx.restore();
}

/** Atlas rect of a ref as the [u0, v0, u1, v1] tuple emitBox reads. */
export function rectOf(r: FaceRef): [number, number, number, number] {
  return [r.u0, r.v0, r.u1, r.v1];
}

/** A sub-rect of a ref: fractions along u (0..1, west→east) and v (0..1, base→crown). */
export function subRect(r: FaceRef, fu0: number, fv0: number, fu1: number, fv1: number): [number, number, number, number] {
  return [r.u0 + (r.u1 - r.u0) * fu0, r.v0 + (r.v1 - r.v0) * fv0, r.u0 + (r.u1 - r.u0) * fu1, r.v0 + (r.v1 - r.v0) * fv1];
}

/**
 * The minting surface: `atlas` + the one stub host every painter is
 * aimed through. Every method returns the FaceRef for a key, painting
 * on first use only.
 */
export class BarrierFaces {
  constructor(
    readonly atlas: FaceAtlas,
    readonly host: StubHost,
  ) {}

  /** Mint a card (bleed off) at CARD_PX: `wt`×`ht` in world tiles. */
  private card(key: string, wt: number, ht: number, paint: (ctx: CanvasRenderingContext2D, w: number, h: number, s: number) => void, lift = FACE_LIFT): FaceRef {
    return this.atlas.get(key, () => ({
      w: Math.ceil(wt * CARD_PX),
      h: Math.ceil(ht * CARD_PX),
      bleed: false,
      paint: (ctx, w, h) => {
        aimStubHost(this.host, ctx, CARD_PX);
        paint(ctx, w, h, CARD_PX);
        if (lift > 0) liftPainted(ctx, w, h, lift);
      },
    }));
  }

  /** Mint an opaque prism face (bleed on) at `px`/tile. */
  private prism(key: string, wt: number, ht: number, px: number, paint: (ctx: CanvasRenderingContext2D, w: number, h: number, s: number) => void, lift = FACE_LIFT): FaceRef {
    return this.atlas.get(key, () => ({
      w: Math.ceil(wt * px),
      h: Math.ceil(ht * px),
      bleed: true,
      paint: (ctx, w, h) => {
        aimStubHost(this.host, ctx, px);
        paint(ctx, w, h, px);
        if (lift > 0) liftPainted(ctx, w, h, lift);
      },
    }));
  }

  // ---------------------------------------------------------- fence

  /** The capped square post (drawFencePost, barrierArt.ts:83). */
  fencePost(gate = false): FaceRef {
    const hTot = gate ? FENCE_GATE_POST_H : FENCE_H;
    return this.card(`fence/post/${gate ? 'gate' : 'run'}`, 0.22, hTot + 0.02, (_ctx, w, h, s) => {
      drawFencePost(asPaintHost(this.host), w / 2, h - s * 0.01, s * (gate ? 0.19 : 0.17), s * hTot);
    });
  }

  /**
   * One tile of the two-rail panel (barrierArt.ts:196-216 railEW): lit
   * top plane over a front face, an under-edge shadow seating each
   * board. Constant per tile by the 2D's own law (no hash jitter —
   * "any per-tile tone would print the grid").
   */
  fenceRail(): FaceRef {
    return this.card('fence/rail', 1, FENCE_RAIL_TOP + 0.02, (ctx, w, h, s) => {
      const base = h - s * 0.02;
      const PLANE = 0.05;
      const FACE = 0.11;
      for (const T of [0.45, 0.75]) {
        const yPlane = base - T * s;
        const yFace = yPlane + PLANE * s;
        const yBot = yFace + FACE * s;
        ctx.fillStyle = shade(FENCE_RAIL, 20);
        ctx.fillRect(0, yPlane, w, PLANE * s);
        ctx.fillStyle = T === 0.75 ? FENCE_RAIL : shade(FENCE_RAIL, -6);
        ctx.fillRect(0, yFace, w, FACE * s);
        ctx.fillStyle = shade(FENCE_RAIL, -20);
        ctx.fillRect(0, yBot - s * 0.02, w, s * 0.02);
      }
    });
  }

  /** The five-bar field-gate leaf (barrierArt.ts:396-455 drawLeaf), hinge at u = 0. */
  fenceLeaf(): FaceRef {
    return this.card('fence/leaf', 0.8, FENCE_LEAF_H, (ctx, w, h, s) => {
      const base = h + 0.1 * s; // the leaf hangs 0.1 above the ground (yBot = base − 0.1·s)
      const yTop = base - 0.72 * s;
      const yBot = base - 0.1 * s;
      const IRON = '#3a3444';
      const rc = (k: number): string => shade(FENCE_RAIL, k);
      const stW = 0.09 * s;
      const bars: ReadonlyArray<readonly [number, number, number]> = [
        [yTop, 0.1 * s, 14],
        [base - 0.5 * s, 0.06 * s, 4],
        [base - 0.335 * s, 0.06 * s, -4],
        [yBot - 0.055 * s, 0.055 * s, -10],
      ];
      for (const [by, bh, tone] of bars) {
        ctx.fillStyle = rc(tone);
        ctx.fillRect(0, by, w, bh);
        ctx.fillStyle = rc(tone + 16);
        ctx.fillRect(0, by, w, s * 0.02);
      }
      ctx.fillStyle = rc(-20);
      ctx.beginPath();
      ctx.moveTo(stW, yBot - 0.12 * s);
      ctx.lineTo(w - stW, yTop + 0.06 * s);
      ctx.lineTo(w - stW, yTop + 0.13 * s);
      ctx.lineTo(stW, yBot - 0.05 * s);
      ctx.closePath();
      ctx.fill();
      for (const sx of [0, w - stW]) {
        ctx.fillStyle = rc(0);
        ctx.fillRect(sx, yTop, stW, yBot - yTop);
        ctx.fillStyle = rc(14);
        ctx.fillRect(sx, yTop, s * 0.022, yBot - yTop);
        ctx.fillStyle = rc(28);
        ctx.fillRect(sx, yTop, stW, s * 0.035);
      }
      ctx.fillStyle = IRON;
      ctx.fillRect(0, yTop + 0.035 * s, 0.2 * s, 0.045 * s);
      ctx.fillRect(0, yBot - 0.1 * s, 0.2 * s, 0.045 * s);
      ctx.fillRect(w - 0.045 * s, base - 0.47 * s, 0.045 * s, 0.05 * s);
      ctx.fillStyle = '#565064';
      ctx.fillRect(0, yTop + 0.035 * s, 0.2 * s, 0.014 * s);
    });
  }

  // ------------------------------------------------------- palisade

  /**
   * One tile of the E–W course (barrierArt.ts:779-800 courseEW): four
   * giants to the tile, widths hash-split per half, two rope courses.
   * `v` is the world-hashed variant standing in for (tx, ty).
   */
  palisadeRun(v: number): FaceRef {
    return this.card(`pali/run/${v}`, 1, PALI_CARD_H, (_ctx, _w, h, s) => {
      const host = asPaintHost(this.host);
      const baseY = h;
      const tx = v * 7 + 3;
      const ty = v * 3 + 1;
      const seams: number[] = [];
      for (const [hx, hi] of [
        [0, 0],
        [s * 0.5, 1],
      ] as const) {
        const split = 0.42 + ((hashCoords(59, tx * 2 + hi, ty) >> 2) & 7) * 0.02;
        const w0 = s * 0.5 * split;
        const k0 = hi * 2;
        const sh0 = baseY - (1.3 + ((hashCoords(43, tx * 8 + k0, ty) >> 3) & 7) * 0.046) * s;
        const sh1 = baseY - (1.3 + ((hashCoords(43, tx * 8 + k0 + 1, ty) >> 3) & 7) * 0.046) * s;
        giantLog(host, hx, baseY, w0, sh0, hashCoords(47, tx * 8 + k0, ty), false);
        giantLog(host, hx + w0, baseY, s * 0.5 - w0, sh1, hashCoords(47, tx * 8 + k0 + 1, ty), false);
        seams.push(hx + w0);
        if (hi === 1) seams.push(s * 0.5);
      }
      const hh = hashCoords(41, tx, ty);
      palisadeRope(host, 0, s, baseY - s * 1.02, seams, hh);
      palisadeRope(host, 0, s, baseY - s * 0.52, seams, hh >> 3);
    });
  }

  /** The palisade body's top strip (bark, seen from above between the flank cards). */
  palisadeTop(): FaceRef {
    return this.prism('pali/top', 1, PALI_W, FACE_PX, (ctx, w, h) => {
      ctx.fillStyle = shade(PALI_LOG, -18);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = shade(PALI_LOG, -30);
      for (let x = 0; x < w; x += w / 4) ctx.fillRect(x, 0, Math.max(1, w * 0.02), h);
    });
  }

  /** The fat junction giant (barrierArt.ts:849-853). */
  palisadeAnchor(v: number): FaceRef {
    return this.card(`pali/anchor/${v}`, 0.34, PALI_CARD_H, (_ctx, w, h, s) => {
      const seed = hashCoords(53, v * 5 + 1, v * 11 + 2);
      const lw = s * 0.3;
      giantLog(asPaintHost(this.host), (w - lw) / 2, h, lw, h - s * (1.46 + ((seed >> 4) & 3) * 0.04), seed, false);
    });
  }

  /** A gate post with its rope collar and, on one side, the skull (drawPalisadePost). */
  palisadePost(skull: boolean): FaceRef {
    return this.card(`pali/post/${skull ? 'skull' : 'plain'}`, 0.42, PALI_POST_CARD_H, (_ctx, w, h, s) => {
      drawPalisadePost(asPaintHost(this.host), w / 2, h - s * 0.02, s * PALI_POST_W, s * PALI_POST_H, skull);
    });
  }

  /** One lashed half-log leaf (barrierArt.ts:918-991 drawLeaf), hinge at u = 0. */
  palisadeLeaf(): FaceRef {
    return this.card('pali/leaf', PALI_LEAF_W, PALI_LEAF_CARD_H, (ctx, w, h, s) => {
      const yBot = h - 0.04 * s;
      const yTop = yBot - PALI_LEAF_H * s;
      const n = 3;
      const glw = w / n;
      const spike = s * 0.12;
      const hh = 0x5a3c;
      for (let i = 0; i < n; i++) {
        const gh = 0.9 + ((hh >> (i * 3)) & 3) * 0.035;
        const sh = yBot - (yBot - yTop) * gh;
        const seed = hashCoords(67, 4 + i, 9);
        const lx = i * glw;
        ctx.fillStyle = shade(PALI_LOG, ((seed >> 2) & 5) - 2);
        ctx.fillRect(lx, sh, glw, yBot - sh);
        ctx.fillStyle = shade(PALI_LOG, 14);
        ctx.fillRect(lx + glw * 0.12, sh, glw * 0.26, yBot - sh);
        ctx.fillStyle = shade(PALI_LOG, -16);
        ctx.fillRect(lx + glw * 0.78, sh, glw * 0.22, yBot - sh);
        const ax = lx + glw * 0.48;
        ctx.fillStyle = shade(PALI_LOG, 30);
        ctx.beginPath();
        ctx.moveTo(lx, sh);
        ctx.lineTo(ax, sh - spike);
        ctx.lineTo(ax, sh);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(PALI_LOG, -8);
        ctx.beginPath();
        ctx.moveTo(ax, sh - spike);
        ctx.lineTo(lx + glw, sh);
        ctx.lineTo(ax, sh);
        ctx.closePath();
        ctx.fill();
      }
      for (const by of [yBot - 0.78 * s, yBot - 0.26 * s]) {
        ctx.fillStyle = shade(PALI_LOG, -14);
        ctx.fillRect(0, by, w, 0.08 * s);
        ctx.fillStyle = shade(PALI_LOG, 2);
        ctx.fillRect(0, by, w, 0.024 * s);
        ctx.fillStyle = PALI_ROPE;
        ctx.fillRect(0, by - 0.012 * s, 0.05 * s, 0.104 * s);
      }
    });
  }

  /** The gate lintel's front face (barrierArt.ts:1010-1020). */
  palisadeBeam(): FaceRef {
    return this.prism('pali/beam', 1, 0.13, FACE_PX, (ctx, w, h, s) => {
      ctx.fillStyle = shade(PALI_LOG, -8);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = shade(PALI_LOG, -22);
      ctx.fillRect(0, h - s * 0.024, w, s * 0.024);
      ctx.fillStyle = PALI_ROPE_DARK;
      ctx.fillRect(w * 0.08, 0, w * 0.09, h);
      ctx.fillRect(w * 0.83, 0, w * 0.09, h);
      ctx.fillStyle = PALI_ROPE;
      ctx.fillRect(w * 0.08, h * 0.3, w * 0.09, h * 0.14);
      ctx.fillRect(w * 0.83, h * 0.3, w * 0.09, h * 0.14);
    });
  }

  palisadeBeamTop(): FaceRef {
    return this.prism('pali/beamTop', 1, 0.2, FACE_PX, (ctx, w, h, s) => {
      ctx.fillStyle = shade(PALI_LOG, 20);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = shade(PALI_LOG, 34);
      ctx.fillRect(0, h - s * 0.016, w, s * 0.016);
    });
  }

  /** Three carved spikes standing on the lintel (barrierArt.ts:1041-1067). */
  palisadeSpikes(): FaceRef {
    return this.card('pali/spikes', 1, 0.27, (ctx, w, h, s) => {
      for (const [fx, hgt] of [
        [0.5, 0.24],
        [0.28, 0.17],
        [0.72, 0.18],
      ] as const) {
        const sx2 = w * fx;
        const sw2 = s * 0.075;
        const sb = h;
        ctx.fillStyle = shade(PALI_LOG, 2);
        ctx.fillRect(sx2 - sw2 / 2, sb - hgt * s * 0.62, sw2, hgt * s * 0.62);
        ctx.fillStyle = shade(PALI_LOG, 30);
        ctx.beginPath();
        ctx.moveTo(sx2 - sw2 / 2, sb - hgt * s * 0.62);
        ctx.lineTo(sx2, sb - hgt * s);
        ctx.lineTo(sx2, sb - hgt * s * 0.62);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(PALI_LOG, -12);
        ctx.beginPath();
        ctx.moveTo(sx2, sb - hgt * s);
        ctx.lineTo(sx2 + sw2 / 2, sb - hgt * s * 0.62);
        ctx.lineTo(sx2, sb - hgt * s * 0.62);
        ctx.closePath();
        ctx.fill();
      }
    });
  }

  // ----------------------------------------------------------- iron

  /**
   * One tile of the E–W panel (barrierArt.ts:1571-1592 courseEW): bars
   * at the 0.125 pitch (the u = 1 seam bar is the neighbour's u = 0),
   * three rails over them, the smith's ornament per half tile. The
   * curb is a prism, not painted here. `v` stands in for (tx, ty).
   */
  ironPanel(v: number): FaceRef {
    return this.card(`iron/panel/${v}`, 1, IRON_PANEL_H, (_ctx, w, h, s) => {
      const host = asPaintHost(this.host);
      const tx = v * 5 + 2;
      const ty = v * 3 + 7;
      const baseY = h;
      const CURB_H = s * IRON_CURB_H;
      const foot = baseY - CURB_H * 0.6;
      const PITCH = 0.125;
      const tipAt = (k: number): number => baseY - s * (1.28 + ((hashCoords(163, tx * 16 + k, ty) >> 2) & 3) * 0.045);
      for (let i = 0; i < 8; i++) {
        const bx = i * s * PITCH + s * 0.004;
        ironBar(host, bx, foot, tipAt(i), hashCoords(167, tx * 16 + i, ty), 0);
      }
      const railT = s * 0.048;
      ironRail(host, 0, w, baseY - s * 0.3, railT, 0);
      ironRail(host, 0, w, baseY - s * 0.78, railT * 0.8, 0);
      ironRail(host, 0, w, baseY - s * 1.0, railT, 0);
      for (const [hx, hi] of [
        [s * 0.25, 0],
        [s * 0.75, 1],
      ] as const) {
        ironOrnament(host, hx, baseY - s * 1.0 + railT / 2, baseY - s * 0.78 - railT / 2, hashCoords(173, tx * 2 + hi, ty), 0);
      }
    });
  }

  /** The forged standard (barrierArt.ts:1598-1637 drawStandard) as a cross-card. */
  ironStandard(): FaceRef {
    return this.card('iron/standard', 0.16, IRON_STANDARD_H, (ctx, w, h, s) => {
      const sx = w / 2;
      const footBase = h;
      const bw = s * 0.062;
      const foot = footBase - s * IRON_CURB_H * 0.5;
      const stTip = footBase - s * 1.48;
      const stShoulder = stTip + s * 0.24;
      const railT = s * 0.048;
      ctx.fillStyle = IRON_MID;
      ctx.fillRect(sx - bw / 2, stShoulder, bw, foot - stShoulder);
      ctx.fillStyle = IRON_LIT;
      ctx.fillRect(sx - bw / 2, stShoulder, Math.max(1, bw * 0.28), foot - stShoulder);
      ctx.fillStyle = shade(IRON_MID, 10);
      ctx.beginPath();
      ctx.moveTo(sx - s * 0.052, stShoulder - s * 0.075);
      ctx.lineTo(sx, stTip);
      ctx.lineTo(sx, stShoulder);
      ctx.lineTo(sx - s * 0.052, stShoulder - s * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = IRON_DARK;
      ctx.beginPath();
      ctx.moveTo(sx, stTip);
      ctx.lineTo(sx + s * 0.052, stShoulder - s * 0.075);
      ctx.lineTo(sx + s * 0.052, stShoulder - s * 0.02);
      ctx.lineTo(sx, stShoulder);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = IRON_DARK;
      for (const cy of [footBase - s * 0.3, footBase - s * 1.0]) ctx.fillRect(sx - bw * 0.95, cy - railT * 0.85, bw * 1.9, railT * 1.7);
      ctx.fillStyle = shade(IRON_LIT, -6);
      for (const cy of [footBase - s * 0.3, footBase - s * 1.0]) ctx.fillRect(sx - bw * 0.95, cy - railT * 0.85, bw * 1.9, Math.max(1, s * 0.014));
    });
  }

  /** The granite curb's face (barrierArt.ts:1247 ironCurbEW, the south face + joint ticks). */
  ironCurb(): FaceRef {
    return this.prism('iron/curb', 1, IRON_CURB_H, FACE_PX, (ctx, w, h, s) => {
      ctx.fillStyle = shade(GY_STONE, -14);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
      ctx.fillRect(0, h - s * 0.045, w, s * 0.045);
      ctx.fillStyle = 'rgba(24, 18, 34, 0.4)';
      ctx.fillRect(w * 0.5 - 1, 0, Math.max(1, s * 0.02), h);
    });
  }

  ironCurbTop(): FaceRef {
    return this.prism('iron/curbTop', 1, IRON_CURB_W, FACE_PX, (ctx, w, h, s) => {
      ctx.fillStyle = GY_STONE_LIT;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = shade(GY_STONE_LIT, -16);
      ctx.fillRect(0, 0, w, Math.max(1, s * 0.02));
      ctx.fillStyle = 'rgba(24, 18, 34, 0.4)';
      ctx.fillRect(w * 0.5 - 1, 0, Math.max(1, s * 0.02), h);
    });
  }

  /**
   * The whole pier elevation (drawGravePier: plinth, coursed shaft,
   * molded cap, finial) — one card; the pier's boxes sample sub-rects
   * of it (plinth / shaft / cap bands) and the finial rides as a cross.
   */
  ironPier(finial: 'urn' | 'orb', hTot = IRON_PIER_H): FaceRef {
    return this.card(`iron/pier/${finial}/${hTot.toFixed(2)}`, IRON_PIER_CARD_W, hTot + IRON_PIER_CARD_OVER, (_ctx, w, h, s) => {
      drawGravePier(asPaintHost(this.host), w / 2, h - s * 0.02, s * IRON_PIER_W, s * hTot, finial);
    });
  }

  /** The pier cap's top plane. */
  ironPierTop(): FaceRef {
    return this.prism('iron/pierTop', 0.4, 0.4, FACE_PX, (ctx, w, h, s) => {
      ctx.fillStyle = GY_STONE_LIT;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = shade(GY_STONE_LIT, -16);
      ctx.fillRect(0, 0, w, Math.max(1, s * 0.03));
      ctx.fillRect(0, 0, Math.max(1, s * 0.03), h);
    });
  }

  /** A barred gate leaf (the 2D ironGateItem grammar re-emitted: bars, three rails, spear leaves), hinge at u = 0. */
  ironLeaf(): FaceRef {
    return this.card('iron/leaf', 0.4, IRON_LEAF_H, (ctx, w, h, s) => {
      const host = asPaintHost(this.host);
      const base = h;
      const railT = s * 0.044;
      const n = Math.max(2, Math.round(w / (s * 0.1)));
      for (let i = 0; i <= n; i++) {
        const bx = (i / n) * (w - s * 0.02) + s * 0.01;
        // The top rail sweeps down from the hinge toward the meeting stile.
        const tip = base - s * (1.22 - (i / n) * 0.28);
        ironBar(host, bx, base - s * 0.04, tip, 0x2b1 + i * 37, 0);
      }
      ironRail(host, 0, w, base - s * 0.26, railT, 0);
      ironRail(host, 0, w, base - s * 0.62, railT * 0.8, 0);
      // The sweeping top rail as a slanted band.
      ctx.fillStyle = IRON_DARK;
      ctx.beginPath();
      ctx.moveTo(0, base - s * 0.98 - railT / 2);
      ctx.lineTo(w, base - s * 0.7 - railT / 2);
      ctx.lineTo(w, base - s * 0.7 + railT / 2);
      ctx.lineTo(0, base - s * 0.98 + railT / 2);
      ctx.closePath();
      ctx.fill();
      // The hinge stile and the meeting stile.
      ctx.fillStyle = IRON_MID;
      ctx.fillRect(0, base - s * 1.0, s * 0.05, s * 0.98);
      ctx.fillRect(w - s * 0.05, base - s * 0.74, s * 0.05, s * 0.72);
      ctx.fillStyle = IRON_LIT;
      ctx.fillRect(0, base - s * 1.0, Math.max(1, s * 0.014), s * 0.98);
    });
  }

  /** The wrought overthrow spanning the gate piers: an arched band, scroll curls, a spear at the crown. */
  ironOverthrow(): FaceRef {
    return this.card('iron/overthrow', 1, IRON_OVERTHROW_H, (ctx, w, h, s) => {
      const cx = w / 2;
      const r = w * 0.42;
      const cy = h - s * 0.02;
      ctx.strokeStyle = IRON_DARK;
      ctx.lineWidth = Math.max(1.5, s * 0.05);
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, h * 0.62, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = shade(IRON_MID, 6);
      ctx.lineWidth = Math.max(1, s * 0.03);
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.86, h * 0.5, 0, Math.PI + 0.15, Math.PI * 2 - 0.15);
      ctx.stroke();
      for (const sx of [cx - r * 0.72, cx + r * 0.72]) {
        ctx.beginPath();
        ctx.arc(sx, cy - h * 0.32, s * 0.07, 0, Math.PI * 1.6);
        ctx.stroke();
      }
      // The spear finial at the crown.
      const top = cy - h * 0.62;
      ctx.fillStyle = IRON_MID;
      ctx.fillRect(cx - s * 0.02, top - s * 0.02, s * 0.04, s * 0.16);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.05, top + s * 0.02);
      ctx.lineTo(cx, top - s * 0.14);
      ctx.lineTo(cx + s * 0.05, top + s * 0.02);
      ctx.closePath();
      ctx.fill();
    });
  }

  // ---------------------------------------------------------- hedge

  /**
   * A hedge FACE (barrierArt.ts:2334-2396, the face kit): leaf fill,
   * the shade band with its rolling top, seat shadow at the roots,
   * clipped clusters, tufts at the foot. `v` stands in for the
   * world-keyed seeds so runs never print a repeat every tile.
   */
  hedgeFace(v: number): FaceRef {
    return this.prism(`hedge/face/${v}`, 1, HED_H, HEDGE_PX, (ctx, w, h, s) => {
      const gy = h;
      const tx = v * 3 + 5;
      const ty = v * 7 + 2;
      ctx.fillStyle = HEDGE_LEAF;
      ctx.fillRect(0, 0, w, h);
      const bseed2 = hashCoords(181, tx * 4, ty * 4);
      const bh = HED_H * s * (0.42 + ((bseed2 >>> 9) & 3) * 0.02);
      const wob = s * (0.035 + ((bseed2 >>> 4) & 3) * 0.012);
      ctx.fillStyle = shade(HEDGE_LEAF, -8);
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, gy);
      ctx.lineTo(-s * 0.1, gy - bh);
      ctx.quadraticCurveTo(w * 0.25, gy - bh - wob, w * 0.5, gy - bh + wob * 0.4);
      ctx.quadraticCurveTo(w * 0.75, gy - bh + wob, w + s * 0.1, gy - bh - wob * 0.5);
      ctx.lineTo(w + s * 0.1, gy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(20, 14, 26, 0.28)';
      ctx.fillRect(-1, gy - s * 0.09, w + 2, s * 0.1);
      const nCl = 4;
      for (let j = 0; j < nCl; j++) {
        const cseed = hashCoords(89, tx * 8 + j, ty);
        const cx = s * 0.06 + (((cseed >>> 4) % 100) / 100) * Math.max(0, w - s * 0.12);
        const fh = 0.2 + ((cseed >>> 8) % 60) / 100;
        ctx.fillStyle = fh > 0.55 ? shade(HEDGE_LEAF, 7) : HEDGE_DARK;
        ctx.beginPath();
        facetBlob(ctx, cx, gy - HED_H * s * fh, s * (0.038 + ((cseed >>> 11) & 3) * 0.011), cseed, 6, 0.85);
        ctx.fill();
      }
      for (let j = 0; j < nCl; j++) {
        const tseed = hashCoords(151, tx * 8 + j, ty);
        const tx3 = s * 0.05 + (((tseed >>> 5) % 100) / 100) * Math.max(0, w - s * 0.1);
        const tr = s * (0.04 + ((tseed >>> 9) & 3) * 0.013);
        ctx.fillStyle = (tseed & 4) === 0 ? HEDGE_DARK : shade(HEDGE_LEAF, -4);
        ctx.beginPath();
        facetBlob(ctx, tx3, gy - tr * 0.5, tr, tseed, 5, 0.8);
        ctx.fill();
      }
    });
  }

  /**
   * The crown plane (barrierArt.ts:2411-2478 crown life): dome sheen,
   * a clump, leaf flecks, and one pillow in six flowering.
   */
  hedgeCrown(v: number): FaceRef {
    return this.prism(`hedge/crown/${v}`, 1, 1, HEDGE_PX, (ctx, w, h, s) => {
      ctx.fillStyle = shade(HEDGE_LIT, 10);
      ctx.fillRect(0, 0, w, h);
      for (const [cu, cv, ci] of [
        [0.25, 0.25, 0],
        [0.75, 0.25, 1],
        [0.25, 0.75, 2],
        [0.75, 0.75, 3],
      ] as const) {
        const ku = v * 4 + ci;
        const kv = v * 9 + 3;
        const dseed = hashCoords(139, ku, kv);
        // The dome sheen: a soft pillow crown, not a polka dot (the 2D's
        // 0.15 × 0.11·yScale ellipse under the squash; here a faint
        // rounded lift per cushion).
        ctx.fillStyle = 'rgba(214, 236, 176, 0.09)';
        ctx.beginPath();
        ctx.ellipse(w * cu + (((dseed >>> 3) % 24) - 12) / 100 * s, h * cv + (((dseed >>> 7) % 16) - 8) / 100 * s, s * 0.2, s * 0.17, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(24, 50, 28, 0.08)';
        ctx.beginPath();
        ctx.ellipse(w * cu, h * cv, s * 0.25, s * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        const cseed = hashCoords(113, ku, kv);
        ctx.fillStyle = (cseed & 4) === 0 ? HEDGE_DARK : shade(HEDGE_LEAF, 6);
        ctx.beginPath();
        facetBlob(ctx, w * cu + (((cseed >>> 4) % 30) - 15) / 100 * s, h * cv + (((cseed >>> 9) % 24) - 12) / 100 * s, s * (0.045 + ((cseed >>> 12) & 3) * 0.009), cseed, 6, 0.85);
        ctx.fill();
        for (let k = 0; k < 2; k++) {
          const gseed = hashCoords(97, ku * 4 + k, kv);
          ctx.fillStyle = (gseed & 8) === 0 ? shade(HEDGE_LIT, 18) : shade(HEDGE_LEAF, -5);
          ctx.fillRect(w * cu + (((gseed >>> 3) % 34) - 17) / 100 * s, h * cv + (((gseed >>> 8) % 26) - 13) / 100 * s, s * 0.032, s * 0.026);
        }
        if (((hashCoords(103, ku, kv) >>> 7) & 7) < 1) {
          const b0 = hashCoords(103, ku, kv);
          const bu = w * cu + (((b0 >>> 10) % 20) - 10) / 100 * s;
          const bv = h * cv + (((b0 >>> 13) % 16) - 8) / 100 * s;
          for (let k = 0; k < 4; k++) {
            const bseed = hashCoords(103, ku * 8 + k + 1, kv);
            ctx.fillStyle = k === 3 ? HEDGE_BLOOM_LIT : HEDGE_BLOOM;
            ctx.beginPath();
            facetCircle(ctx, bu + (((bseed >>> 2) % 30) - 15) / 100 * s, bv + (((bseed >>> 7) % 24) - 12) / 100 * s, s * (k === 3 ? 0.02 : 0.028), 5, 0.4, 0.8);
            ctx.fill();
          }
        }
      }
      // The shears' partings along the half-tile stations.
      ctx.strokeStyle = 'rgba(24, 50, 28, 0.32)';
      ctx.lineWidth = Math.max(1, s * 0.022);
      ctx.beginPath();
      ctx.moveTo(w * 0.5, s * 0.03);
      ctx.quadraticCurveTo(w * 0.5 + (((hashCoords(149, v, 1) >>> 4) % 12) - 6) / 100 * s, h * 0.5, w * 0.5, h - s * 0.03);
      ctx.stroke();
    });
  }

  /**
   * The crown's LOBE card: a skirt of solid crown tone that overlaps
   * the top edge, then world-keyed half-tile lobes (hedgeLobe
   * amplitudes, barrierArt.ts:2039) billowing above it, air beyond.
   */
  hedgeLobes(v: number): FaceRef {
    return this.card(`hedge/lobes/${v}`, 1, HEDGE_LOBE_H, (ctx, w, h, s) => {
      const y0 = h - HEDGE_LOBE_DROP * s; // the crown plane's height on the card
      ctx.fillStyle = shade(HEDGE_LIT, 10);
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, y0);
      let cur = 0;
      for (let i = 0; i < 2; i++) {
        const next = cur + 0.5;
        const amp = (0.05 + ((hashCoords(71, v * 2 + i, v * 3) >> 2) & 7) * 0.0075) * s;
        ctx.quadraticCurveTo(w * (cur + 0.12), y0 - amp * 2.1, w * (cur + 0.25), y0 - amp * 0.55);
        ctx.quadraticCurveTo(w * (cur + 0.38), y0 - amp * 1.8, w * next, y0);
        cur = next;
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
      // Sprigs the shears missed, and a bloom on one lobe in six.
      ctx.fillStyle = shade(HEDGE_LIT, 22);
      for (let i = 0; i < 3; i++) {
        const sd = hashCoords(211, v * 8 + i, 3);
        ctx.fillRect(w * (0.1 + ((sd >>> 3) % 80) / 100), y0 - s * (0.06 + ((sd >>> 9) & 7) * 0.012), s * 0.022, s * 0.05);
      }
      if (((hashCoords(103, v, 11) >>> 7) & 7) < 1) {
        ctx.fillStyle = HEDGE_BLOOM;
        ctx.beginPath();
        facetCircle(ctx, w * 0.72, y0 - s * 0.08, s * 0.03, 5, 0.4, 0.8);
        ctx.fill();
        ctx.fillStyle = HEDGE_BLOOM_LIT;
        ctx.beginPath();
        facetCircle(ctx, w * 0.7, y0 - s * 0.095, s * 0.018, 5, 0.4, 0.8);
        ctx.fill();
      }
    });
  }

  /**
   * The gatepost's clipped ball (barrierArt.ts hedgeGateItem `finial`):
   * a CLEAN circle — seat shadow, globe, one lit crescent, a dark
   * shadow spot — seated on the post crown (card base = the crown).
   */
  hedgeFinial(): FaceRef {
    return this.card('hedge/finial', HEDGE_FINIAL_W, HEDGE_FINIAL_H, (ctx, w, h, s) => {
      const r0 = s * 0.125;
      const bx = w / 2;
      const cy0 = h - s * 0.01;
      const by = cy0 - r0 * 0.85;
      ctx.fillStyle = 'rgba(24, 50, 28, 0.3)';
      ctx.beginPath();
      ctx.ellipse(bx, cy0 - r0 * 0.05, r0 * 0.8, r0 * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = HEDGE_LEAF;
      ctx.beginPath();
      ctx.arc(bx, by, r0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(HEDGE_LIT, 14);
      ctx.beginPath();
      ctx.arc(bx - r0 * 0.24, by - r0 * 0.26, r0 * 0.52, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = HEDGE_DARK;
      ctx.beginPath();
      ctx.arc(bx + r0 * 0.3, by + r0 * 0.32, r0 * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 26, 18, 0.55)';
      ctx.lineWidth = Math.max(1, s * 0.018);
      ctx.beginPath();
      ctx.arc(bx, by, r0, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  /**
   * The timber wicket (barrierArt.ts hedgeGateItem `wicket`): three
   * pales under a capped top rail, one diagonal brace — waist-high,
   * light against the green. Hinge at u = 0; `wt` is the leaf width.
   */
  hedgeWicket(wt: number): FaceRef {
    return this.card(`hedge/wicket/${wt.toFixed(2)}`, wt, HEDGE_WICKET_H, (ctx, w, h, s) => {
      const yBot = h - s * 0.03;
      const yTop = h - HEDGE_WICKET_H * s;
      const paleW = Math.min(s * 0.05, w * 0.22);
      for (let i = 0; i < 3; i++) {
        const px2 = (w - paleW) * (i / 2);
        ctx.fillStyle = shade(FENCE_POST, 4);
        ctx.fillRect(px2, yTop + s * 0.05, paleW, yBot - yTop - s * 0.05);
        ctx.fillStyle = shade(FENCE_POST, 18);
        ctx.beginPath();
        ctx.moveTo(px2, yTop + s * 0.05);
        ctx.lineTo(px2 + paleW / 2, yTop);
        ctx.lineTo(px2 + paleW, yTop + s * 0.05);
        ctx.closePath();
        ctx.fill();
      }
      for (const ry of [yTop + s * 0.14, yBot - s * 0.16]) {
        ctx.fillStyle = shade(FENCE_RAIL, 8);
        ctx.fillRect(0, ry, w, s * 0.05);
        ctx.fillStyle = shade(FENCE_RAIL, 22);
        ctx.fillRect(0, ry, w, s * 0.016);
      }
      ctx.strokeStyle = shade(FENCE_RAIL, -6);
      ctx.lineWidth = Math.max(1.5, s * 0.032);
      ctx.beginPath();
      ctx.moveTo(s * 0.01, yBot - s * 0.14);
      ctx.lineTo(w - s * 0.01, yTop + s * 0.16);
      ctx.stroke();
    });
  }

  // ------------------------------------------------------- garrison

  /**
   * One tile of the curtain's great-ashlar face (paintGarrisonMasonry,
   * garrisonArt.ts:45), WORLD-ANCHORED on `worldX` so courses run
   * unbroken across a run; the 0.68-tile bond repeats every 17 tiles,
   * so the key is worldX mod 17 and a run of any length reads
   * seamless. The face is the FULL curtain (GARRISON_H).
   */
  garrisonFace(worldX: number): FaceRef {
    const wx = ((worldX % 17) + 17) % 17;
    return this.prism(`gar/face/${wx}`, 1, GARRISON_H, FACE_PX, (ctx, w, h, s) => {
      faceFrame(ctx, h, () => {
        paintGarrisonMasonry(asPaintHost(this.host), 0, w, GARRISON_H * s, s, wx, 1, wx, 7, GARRISON_H, true);
      });
    }, 0.14);
  }

  /**
   * The curtain face wearing its wall-hung detail (the 2D hangs art on
   * garrisonish walls too: banners on the gatehouse towers, the
   * standards along the curtain — wallHungArt *OnFace with `garrison`
   * true). Keyed by detail + place in the merged run; the masonry is
   * lifted first so the art keeps its own inks (INTEGRATE: moved here
   * from the walls lane's cut garrison path).
   */
  garrisonHungFace(worldX: number, info: WallHungInfo, detail: number, run: HungRun, tile: number): FaceRef {
    const wx = ((worldX % 17) + 17) % 17;
    return this.prism(`gar/hung/${wx}/${detail}/${run.index}/${run.length}`, 1, GARRISON_H, FACE_PX, (ctx, w, h, s) => {
      faceFrame(ctx, h, () => {
        paintGarrisonMasonry(asPaintHost(this.host), 0, w, GARRISON_H * s, s, wx, 1, wx, 7, GARRISON_H, true);
        ctx.save();
        ctx.translate(0, -h);
        liftPainted(ctx, w, h, 0.14);
        ctx.restore();
        paintHungDetail(this.host, info, detail, s, true, run, tile);
      });
    }, 0);
  }

  /** The wall-walk flags (garrisonArt.ts:255-277), `v` a hashed variant. */
  garrisonTop(v: number): FaceRef {
    return this.prism(`gar/top/${v}`, 1, 1, FACE_PX, (ctx, w, h, s) => {
      ctx.fillStyle = GAR_TOP;
      ctx.fillRect(0, 0, w, h);
      const hf = hashCoords(457, v * 3 + 1, v * 5 + 2);
      ctx.fillStyle = 'rgba(20, 14, 28, 0.16)';
      if ((hf & 3) !== 0) ctx.fillRect(w * (0.2 + (hf % 60) / 100), 0, Math.max(1, s * 0.03), h);
      if ((hf & 4) === 0) ctx.fillRect(0, h * (0.3 + ((hf >>> 6) % 40) / 100), w, Math.max(1, s * 0.028));
    }, 0.1);
  }

  /** A parapet tooth's face (merlonBox, garrisonArt.ts:155: faceTone + contact shade). */
  merlonFace(): FaceRef {
    return this.prism('gar/merlon', 0.34, 0.5, CARD_PX, (ctx, w, h) => {
      ctx.fillStyle = shade(GAR_FACE, 4);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
      ctx.fillRect(0, h - Math.max(1, h * 0.14), w, Math.max(1, h * 0.14));
      ctx.fillStyle = 'rgba(255, 236, 200, 0.12)';
      ctx.fillRect(0, 0, w, Math.max(1, h * 0.06));
    }, 0.14);
  }

  /** The tooth's cap: the lightest stone in the kit, shaded far edge, lit near arris. */
  merlonTop(): FaceRef {
    return this.prism('gar/merlonTop', 0.34, 0.34, CARD_PX, (ctx, w, h) => {
      ctx.fillStyle = GAR_MERLON_TOP;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.fillRect(0, 0, w, h * 0.24);
      ctx.fillStyle = 'rgba(255, 236, 200, 0.18)';
      ctx.fillRect(0, h - h * 0.18, w, h * 0.18);
    }, 0.1);
  }

  /**
   * The gatehouse elevation for a run of `len` tiles (garrisonArt.ts
   * garrisonGateItem re-emitted for a face: the curtain's ashlar with
   * the voussoir ring, keystone, imposts, machicolations and quoined
   * piers; the passage itself is GEOMETRY — the boxes sample this
   * card's pier columns and lintel band).
   */
  garrisonGate(len: number): FaceRef {
    return this.prism(`gar/gate/${len}`, len, GARRISON_H, FACE_PX, (ctx, w, h, s) => {
      const host = asPaintHost(this.host);
      const hs = GARRISON_H * s;
      const pw = Math.min(s * 0.34, w * 0.18);
      const ox0 = pw;
      const ox1 = w - pw;
      const ow = ox1 - ox0;
      const springH = GAR_SPRING_H * s;
      const rise = Math.min(ow * 0.22, s * 0.42);
      faceFrame(ctx, h, () => {
        paintGarrisonMasonry(host, 0, w, hs, s, 0, len, 3, 11, GARRISON_H, false);
        // Deep reveal shadows down the inner pier edges.
        ctx.fillStyle = 'rgba(10, 8, 16, 0.4)';
        ctx.fillRect(ox0, -springH, s * 0.05, springH);
        ctx.fillRect(ox1 - s * 0.05, -springH, s * 0.05, springH);
        // The voussoir ring around the arch head, radial joints.
        const cxA = (ox0 + ox1) / 2;
        const ringW = s * 0.16;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, -hs, w, hs - springH);
        ctx.clip();
        ctx.beginPath();
        ctx.ellipse(cxA, -springH, ow / 2 + ringW, rise + ringW, 0, 0, Math.PI * 2);
        ctx.ellipse(cxA, -springH, ow / 2, rise, 0, 0, Math.PI * 2, true);
        ctx.clip('evenodd');
        ctx.fillStyle = shade(GAR_FACE, 14);
        ctx.fillRect(0, -hs, w, hs);
        ctx.strokeStyle = 'rgba(20, 14, 28, 0.45)';
        ctx.lineWidth = Math.max(1, s * 0.03);
        for (let a = Math.PI + 0.28; a < Math.PI * 2 - 0.2; a += 0.34) {
          ctx.beginPath();
          ctx.moveTo(cxA + Math.cos(a) * (ow / 2), -springH + Math.sin(a) * rise);
          ctx.lineTo(cxA + Math.cos(a) * (ow / 2 + ringW * 1.1), -springH + Math.sin(a) * (rise + ringW * 1.1));
          ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = shade(GAR_FACE, 26);
        ctx.beginPath();
        ctx.moveTo(cxA - s * 0.11, -springH - rise + s * 0.02);
        ctx.lineTo(cxA + s * 0.11, -springH - rise + s * 0.02);
        ctx.lineTo(cxA + s * 0.075, -springH - rise - ringW - s * 0.03);
        ctx.lineTo(cxA - s * 0.075, -springH - rise - ringW - s * 0.03);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(GAR_FACE, 20);
        ctx.fillRect(ox0 - s * 0.1, -springH - s * 0.06, s * 0.18, s * 0.13);
        ctx.fillRect(ox1 - s * 0.08, -springH - s * 0.06, s * 0.18, s * 0.13);
        // Machicolations under the parapet.
        const bandT = -hs + s * 0.3;
        ctx.fillStyle = 'rgba(12, 9, 18, 0.42)';
        ctx.fillRect(s * 0.06, bandT, w - s * 0.12, s * 0.2);
        ctx.fillStyle = shade(GAR_FACE, 4);
        for (let cxb = s * 0.1; cxb < w - s * 0.2; cxb += s * 0.28) ctx.fillRect(cxb, bandT, s * 0.15, s * 0.22);
        ctx.fillStyle = 'rgba(255, 236, 200, 0.1)';
        ctx.fillRect(s * 0.06, bandT + s * 0.2, w - s * 0.12, s * 0.04);
        // Flanking piers: quoins over the ashlar, a talus base.
        for (const [px0, inner] of [
          [0, ox0],
          [ox1, w],
        ] as const) {
          const pwid = inner - px0;
          ctx.fillStyle = shade(GAR_FACE, 5);
          ctx.fillRect(px0, -hs, pwid, hs);
          let qi = 0;
          for (let qy = -s * 0.55; qy > -hs + s * 0.2; qy -= s * 0.34, qi++) {
            ctx.fillStyle = shade(GAR_FACE, qi % 2 === 0 ? 16 : 6);
            ctx.fillRect(px0, qy - s * 0.3, pwid, s * 0.3);
            ctx.fillStyle = 'rgba(20, 14, 28, 0.35)';
            ctx.fillRect(px0, qy - Math.max(1, s * 0.026), pwid, Math.max(1, s * 0.026));
          }
          ctx.fillStyle = GAR_PLINTH;
          ctx.fillRect(px0, -s * 0.55, pwid, s * 0.55);
          ctx.fillStyle = 'rgba(255, 236, 200, 0.12)';
          ctx.fillRect(px0, -s * 0.55, pwid, s * 0.05);
        }
        ctx.fillStyle = shade(GAR_TRIM, 12);
        ctx.fillRect(ox0, -s * 0.07, ow, s * 0.07);
      });
    }, 0.14);
  }

  /** The passage vault's underside. */
  garrisonSoffit(): FaceRef {
    return this.prism('gar/soffit', 1, 1, FACE_PX, (ctx, w, h) => {
      ctx.fillStyle = '#1a1420';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(80, 74, 96, 0.35)';
      ctx.fillRect(0, h * 0.48, w, Math.max(1, h * 0.03));
    }, 0);
  }

  /** The raised portcullis's teeth hanging in the arch head (garrisonArt.ts:660-683). */
  garrisonPortcullis(): FaceRef {
    return this.card('gar/portcullis', 1, GAR_PORTCULLIS_DROP, (ctx, w, h, s) => {
      // THE BARS SURVIVE THE MIP: a 0.065-tile bar alpha-tested away at
      // play distance and left its teeth floating; 0.09 wide at a 0.24
      // pitch keeps a bar where the eye looks for one.
      const tipY = h - s * 0.1;
      const barW = Math.max(2, s * GAR_PORTCULLIS_BAR_W);
      for (let bx = s * 0.04; bx < w - s * 0.06; bx += s * 0.24) {
        ctx.fillStyle = '#3d3950';
        ctx.fillRect(bx, 0, barW, tipY);
        ctx.beginPath();
        ctx.moveTo(bx, tipY);
        ctx.lineTo(bx + barW, tipY);
        ctx.lineTo(bx + barW / 2, tipY + s * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(170, 178, 200, 0.28)';
        ctx.fillRect(bx, 0, Math.max(1, barW * 0.35), tipY);
      }
      ctx.fillStyle = '#3d3950';
      ctx.fillRect(0, s * 0.02, w, Math.max(1.5, s * 0.06));
      ctx.fillStyle = 'rgba(170, 178, 200, 0.3)';
      ctx.fillRect(0, s * 0.02, w, Math.max(1, s * 0.022));
    }, 0.1);
  }

  /** An iron-bound oak gate leaf (the 2D paintGarrisonLeaf grammar: dark boards, straps, studs), hinge at u = 0. */
  garrisonLeaf(wt: number, ht: number): FaceRef {
    return this.card(`gar/leaf/${wt.toFixed(2)}x${ht.toFixed(2)}`, wt, ht, (ctx, w, h, s) => {
      ctx.fillStyle = GAR_LEAF;
      ctx.fillRect(0, 0, w, h);
      const nb = Math.max(2, Math.round(w / (s * 0.18)));
      for (let i = 0; i < nb; i++) {
        const bx = (i / nb) * w;
        ctx.fillStyle = shade(GAR_LEAF, i % 2 === 0 ? 6 : -6);
        ctx.fillRect(bx, 0, w / nb, h);
        ctx.fillStyle = 'rgba(18, 11, 5, 0.5)';
        ctx.fillRect(bx, 0, Math.max(1, s * 0.012), h);
      }
      ctx.fillStyle = GAR_IRON;
      for (const fy of [0.16, 0.5, 0.84]) {
        ctx.fillRect(0, h * fy - s * 0.04, w, s * 0.08);
        ctx.fillStyle = 'rgba(170, 178, 200, 0.22)';
        ctx.fillRect(0, h * fy - s * 0.04, w, s * 0.02);
        ctx.fillStyle = GAR_IRON;
        for (let sx = s * 0.08; sx < w; sx += s * 0.22) ctx.fillRect(sx, h * fy - s * 0.02, s * 0.04, s * 0.04);
      }
      ctx.fillStyle = 'rgba(18, 11, 5, 0.6)';
      ctx.fillRect(w - Math.max(1, s * 0.03), 0, Math.max(1, s * 0.03), h);
    }, 0.12);
  }
}

/** A stable small variant number for a world tile (0..n-1). */
export function variantAt(salt: number, tx: number, ty: number, n: number): number {
  return (hashCoords(salt, tx, ty) >>> 3) % n;
}

/** True for the tile ids this lane's hedge slab law treats as 45°. */
export function isHedgeDiag(t: number | undefined): boolean {
  return t === Tile.HedgeDiagNE || t === Tile.HedgeDiagNW;
}
