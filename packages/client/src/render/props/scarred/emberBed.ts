/**
 * THE SCARRED LAND — EmberBed (510): a dead fire that still glows,
 * the night tell of a fresh burning.
 *
 * What it is: a ring of seven or eight field stones somebody dragged
 * into a circle, a pan of grey ash inside it, a handful of coals
 * banked under that ash, one charred stick that never finished
 * burning. By day it is a cold hearth like any other; the coals are
 * painted at a COLD value on purpose. After dark the lights.ts row
 * (COALS-class, flame-gated) lays its bloom over the pan and the
 * cinders warm — THE LIGHT IS CONTENT, collected in the
 * collectStaticLights scan, and that same scan exhales the smoke
 * grain. This painter never queueGlows and never paints smoke.
 *
 * The laws it obeys: BODY-RULER (shin-high beside the 1.15-tile rig
 * — ring ≈ 0.8 tiles across, stones ≈ 0.17 tall with their top;
 * the bonfire's ring is 0.92 across and this is the smaller, meaner
 * cousin), TOP-PLANE (every stone shows its lit top), BLOCK LAW
 * (squared filled quads, one lit west facet, minimum feature 0.03s,
 * depth as value steps), THE ONE RING (the cached eight-tap ring
 * draws the silhouette; nothing here strokes), TWO SUNS (west facets,
 * the stick's west cap and the ash crown face the fixed art sun),
 * draw-time `const ctx = rend.ctx`, hash deals by `h >>> k`, SHADOWS
 * NEVER BAKE (castContact per frame), and canvas/GL parity (fills
 * only — no translate/rotate; the stick is a parallelogram, not a
 * rotated rect).
 *
 * THE SCORCH is the prop's OWN ground mark, painted first in its
 * draw (the bonfire's facetCircle pool is the precedent for where;
 * the kit's AshHeap dome is the precedent for how): two OPAQUE
 * faceted value planes, never a translucent wash. The ring pass
 * dilates raw alpha and lays its ring UNDER the art, so a
 * translucent pool inside a ringed body composites ring-dark anyway
 * — opaque planes are the honest version, and they outline as one
 * silhouette with the stones (THE ONE RING). Never the decal pool.
 */
import { Tile } from '@arx/shared';
import { shade } from '../../tint.js';
import { chamferRect, facetBlob, facetCircle } from '../../shapes.js';
import { SCAR_ASH, SCAR_CHAR, TWN_STONE, TWN_STONE_DARK, TWN_STONE_LIT } from '../palette.js';
import type { DrawItem } from '../../renderer.js';
import type { PropEntries, PropFrame, PropHost } from '../types.js';

// ---- the inks (dealt once; every bed shares them, the hash deals the deal)
/** The fire side of a ring stone: soot-black, a value step above char. */
const STONE_SOOT = shade(SCAR_CHAR, 8);
const STONE_SOOT_WEST = shade(SCAR_CHAR, 18);
const STONE_SOOT_EAST = shade(SCAR_CHAR, -4);
/** The soot band the top plane wears on its inner edge. */
const STONE_SOOT_TOP = shade(SCAR_CHAR, 22);
/** The outer stone: kept-limestone family, weathered. */
const STONE_FACE = TWN_STONE_DARK;
const STONE_WEST = shade(TWN_STONE, 6);
const STONE_EAST = shade(TWN_STONE_DARK, -12);
const STONE_TOP = TWN_STONE_LIT;
/** The ash pan: a dark floor, a mid crown, a pale drift on the sun side. */
const ASH_FLOOR = shade(SCAR_ASH, -34);
const ASH_CROWN = shade(SCAR_ASH, -8);
const ASH_PALE = shade(SCAR_ASH, 16);
/** Four cold values for the coals — dealt from char toward a DRY
 *  umber, never toward the ember ink. `shade()` moves every channel
 *  by the same step, so a darkened SCAR_EMBER keeps its full chroma
 *  (a saturated orange that reads as a live fire at noon); a banked
 *  coal by day is a brown-black clinker, chroma under 40 on every
 *  step (coldHearth.test pins it). The lights.ts row is the warmth. */
const COAL_COLD: readonly string[] = ['#2f2426', '#3d2c28', '#4a352c', '#54392e'];
/** The one liveliest check on the one liveliest coal — the same dry
 *  umber a step paler, still nothing the eye calls orange. */
const COAL_PIP = '#5a4034';
/** The char under and around every coal — the coal's own shadow step. */
const COAL_RIM = shade(SCAR_CHAR, -6);
/** The stick: char body, a lifted top plane, darker checks, a lit west cap. */
const STICK_FACE = shade(SCAR_CHAR, -2);
const STICK_TOP = shade(SCAR_CHAR, 16);
const STICK_CAP = shade(SCAR_CHAR, 26);
const STICK_CHECK = shade(SCAR_CHAR, -10);
/** The bed's own permanent scorch — two opaque value planes: the
 *  browned rim where the heat reached, the black floor where it sat. */
const SCORCH_RIM = '#3b3230';
const SCORCH_FLOOR = '#221c20';

/** Ring geometry, tiles: the ring stands well inside its cell. */
const RING_RX = 0.4;
const RING_RY = 0.4;
/** The scorch reaches a stone's width past the ring. */
const SCORCH_R = 0.6;

function paintEmberBed(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The deal: seven or eight stones, the ring turned a little so no
  // two beds share a stone at north; the stick lies one way or the
  // other; five to nine coals.
  const stones = 7 + ((h >>> 4) & 1);
  const turn = ((h >>> 7) & 7) * 0.11;
  const stickDir = ((h >>> 26) & 1) === 0 ? 1 : -1;
  const coals = 5 + ((h >>> 20) & 3) + ((h >>> 22) & 1);
  const rx = RING_RX * s;
  const ry = RING_RY * syT;

  /** One ring stone: a squared block with a lit top plane and one
   *  lit west facet; the face that looks at the fire is soot. `back`
   *  stones (north half) show their south face to the viewer AND to
   *  the fire, so that face is soot; front stones show their outer
   *  face and carry the soot as a band on the top's inner edge. */
  const stone = (ctx: CanvasRenderingContext2D, i: number): void => {
    const a = turn + (i / stones) * Math.PI * 2;
    const wob = 1 + (((h >>> (9 + i)) & 1) === 0 ? -0.04 : 0.04);
    const cx = p.x + Math.cos(a) * rx * wob;
    const cy = baseY + Math.sin(a) * ry * wob;
    const w = s * (0.15 + ((h >>> (i * 2)) & 1) * 0.03);
    const fh = s * (0.085 + ((h >>> (12 + i)) & 1) * 0.02);
    const td = syT * 0.11;
    const back = Math.sin(a) < 0;
    const x0 = cx - w * 0.5;
    const yTop = cy - fh;
    // The face (south side), one squared quad.
    ctx.fillStyle = back ? STONE_SOOT : STONE_FACE;
    ctx.fillRect(x0, yTop, w, fh);
    // The one lit facet: the west arris toward the fixed art sun.
    ctx.fillStyle = back ? STONE_SOOT_WEST : STONE_WEST;
    ctx.fillRect(x0, yTop, s * 0.035, fh);
    // The east arris steps darker — depth as a value step.
    ctx.fillStyle = back ? STONE_SOOT_EAST : STONE_EAST;
    ctx.fillRect(x0 + w - s * 0.03, yTop, s * 0.03, fh);
    // The lit top plane, foreshortened, chamfered like a field stone.
    ctx.fillStyle = STONE_TOP;
    ctx.beginPath();
    chamferRect(ctx, x0, yTop - td, w, td, s * 0.022);
    ctx.fill();
    // Soot on the top's inner edge: the fire licked over the rim.
    ctx.fillStyle = STONE_SOOT_TOP;
    if (back) {
      ctx.fillRect(x0 + s * 0.015, yTop - s * 0.03, w - s * 0.03, s * 0.03);
    } else {
      ctx.fillRect(x0 + s * 0.015, yTop - td, w - s * 0.03, s * 0.03);
    }
  };

  // The painted extent (the ring-cache sprite is cut to this box):
  // scorch ±0.6s wide, 0.6-squashed → ±0.36s tall about baseY; the
  // north stone's top reaches baseY − 0.42s; baseY sits 0.108s under p.
  return {
    sortY: ty + 0.6,
    body: stationBody(0.66, 0.38, 0.52),
    // SHADOWS NEVER BAKE: a shin-high ring seats with a contact
    // shade under its whole footprint, cast per frame.
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.46, syT * 0.2),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // ---- pass 1: the ground remembers. The permanent scorch is the
      // prop's own mark — a browned rim a stone's width past the ring
      // where the heat reached, and the black floor the fire sat on.
      // Two opaque value planes, faceted like the bonfire's pool.
      ctx.fillStyle = SCORCH_RIM;
      ctx.beginPath();
      facetCircle(ctx, p.x + s * 0.02, baseY - syT * 0.03, s * SCORCH_R, 9, 0.3 + turn, 0.6);
      ctx.fill();
      ctx.fillStyle = SCORCH_FLOOR;
      ctx.beginPath();
      facetCircle(ctx, p.x, baseY - syT * 0.04, s * 0.5, 9, 0.9 + turn, 0.62);
      ctx.fill();
      // ---- pass 2: the back half of the ring stands behind the pan.
      for (let i = 0; i < stones; i++) {
        if (Math.sin(turn + (i / stones) * Math.PI * 2) < 0) stone(ctx, i);
      }
      // ---- pass 3: the ash pan. A dark floor fills the ring, a mid
      // crown heaps on it, and a pale drift lies on the sun side
      // where the wind sorted the fines.
      ctx.fillStyle = ASH_FLOOR;
      ctx.beginPath();
      facetBlob(ctx, p.x, baseY - syT * 0.06, s * 0.31, h ^ 0x3d, 7, 0.66);
      ctx.fill();
      ctx.fillStyle = ASH_CROWN;
      ctx.beginPath();
      facetBlob(ctx, p.x - s * 0.02, baseY - syT * 0.1, s * 0.22, h ^ 0x71, 6, 0.64);
      ctx.fill();
      ctx.fillStyle = ASH_PALE;
      ctx.beginPath();
      facetBlob(ctx, p.x - s * 0.09, baseY - syT * 0.14, s * 0.1, h ^ 0xa6, 5, 0.62);
      ctx.fill();
      // ---- pass 4: the coals, banked in the ash. Squared cinders
      // each seated on a char rim that shows as a 0.03s step east and
      // south (the coal's own shadow — depth as a value step), dealt
      // to a cold value by their own phase; the lights.ts row is what
      // warms them after dark. One coal (the liveliest phase) keeps a
      // single hot check.
      for (let i = 0; i < coals; i++) {
        const hi = h >>> ((i * 3) & 31);
        const ang = (i / coals) * Math.PI * 2 + ((hi >>> 1) & 3) * 0.37;
        const rad = s * (0.05 + (hi & 3) * 0.045);
        const cx = p.x + Math.cos(ang) * rad;
        const cy = baseY - syT * 0.06 + Math.sin(ang) * rad * 0.62;
        const sz = s * (0.045 + ((hi >>> 2) & 3) * 0.008);
        const phase = (hi >>> 4) & 3;
        const step = s * 0.03;
        ctx.fillStyle = COAL_RIM;
        ctx.fillRect(cx - sz * 0.5, cy - sz * 0.5, sz + step, sz + step);
        ctx.fillStyle = COAL_COLD[phase]!;
        ctx.fillRect(cx - sz * 0.5, cy - sz * 0.5, sz, sz);
        if (phase === 3) {
          ctx.fillStyle = COAL_PIP;
          ctx.fillRect(cx - s * 0.015, cy - s * 0.015, s * 0.03, s * 0.03);
        }
      }
      // ---- pass 5: the one charred stick, lying across the pan with
      // both ends on the ring's inner edge. A parallelogram top plane
      // (lit) over a parallelogram face (char) — never a rotated rect.
      // A lit west cap toward the sun, two checks where the char
      // split, one cold ember eye.
      const ax = p.x - s * 0.34;
      const ay = baseY - syT * (0.1 + stickDir * 0.08);
      const bx = p.x + s * 0.31;
      const by = baseY - syT * (0.1 - stickDir * 0.08);
      const tt = s * 0.035;
      const ff = s * 0.04;
      ctx.fillStyle = STICK_FACE;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx, by + ff);
      ctx.lineTo(ax, ay + ff);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = STICK_TOP;
      ctx.beginPath();
      ctx.moveTo(ax, ay - tt);
      ctx.lineTo(bx, by - tt);
      ctx.lineTo(bx, by);
      ctx.lineTo(ax, ay);
      ctx.closePath();
      ctx.fill();
      // The west end cap: the one facet that faces the art sun.
      ctx.fillStyle = STICK_CAP;
      ctx.fillRect(ax, ay - tt, s * 0.035, tt + ff);
      ctx.fillStyle = STICK_CHECK;
      for (const u of [0.28, 0.66]) {
        const kx = ax + (bx - ax) * u;
        const ky = ay + (by - ay) * u;
        ctx.fillRect(kx - s * 0.02, ky - tt, s * 0.04, tt + ff);
      }
      {
        const u = 0.47;
        const kx = ax + (bx - ax) * u;
        const ky = ay + (by - ay) * u;
        ctx.fillStyle = COAL_COLD[2]!;
        ctx.fillRect(kx - s * 0.017, ky - tt + s * 0.002, s * 0.034, tt - s * 0.004);
      }
      // ---- pass 6: the front half of the ring stands over the pan.
      for (let i = 0; i < stones; i++) {
        if (Math.sin(turn + (i / stones) * Math.PI * 2) >= 0) stone(ctx, i);
      }
    },
  };
}

export const EMBER_BED_PROPS: PropEntries = [[[Tile.EmberBed], paintEmberBed]];
