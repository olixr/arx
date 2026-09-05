/**
 * THE SCARRED LAND — F. the road of the displaced: what people carry
 * when they run. LeanTo (535), Bedroll (536), BelongingsCart (537),
 * FieldCot (538).
 *
 * K3 THE ROAD OF THE DISPLACED. Nothing here burned and nothing here
 * is a claim: it is a household folded small enough to lift. The
 * family's cloth is undyed — linen the colour of the road it has
 * slept on, wool the colour of the smoke it has sat beside — and the
 * one bright thing anyone kept is a copper pot, because a pot is a
 * meal and a meal is tomorrow. Every piece seats in four scenes or
 * more (a husk's yard, a haven's verge, the toll bar's queue, a
 * muster ground's edge, the dead field's margin).
 *
 * The laws, in the order the brush meets them:
 *  - BODY-RULER: every extent is in `s` (the tile); the rig stands
 *    1.15s. Each painter's header states its height against the rig.
 *  - TOP-PLANE: every standing piece shows its lit top — the lean-to's
 *    canvas IS the lit plane; the cart shows its deck and the heap's
 *    crown; the cot its canvas bed; the bedroll its rolled top.
 *  - FLAT FORGE / BLOCK LAW: squared filled quads, one lit facet toward
 *    the fixed west art sun, depth as value steps, min feature 0.03s.
 *    Every diagonal (a guy-cord, a shaft, a trestle leg, a spoke, a
 *    lashing) is a QUAD built by moveTo/lineTo — never ctx.rotate /
 *    translate — so the canvas oracle and the GL stage draw the same
 *    thing. The cart's wheels are RINGS cut evenodd (two faceted
 *    circles, one fill), never a stroked ellipse.
 *  - THE ONE RING: silhouette only. Nothing here strokes; the cached
 *    eight-tap ring (CACHED_RING_TILES) inks the painted silhouette.
 *    Loose pieces share a silhouette with their piece (the pot stands
 *    in the lean-to's contact shade, the bundle leans on the bedroll's
 *    foot, the dropped bundle lies in the cart's shade, the cup touches
 *    the cot's leg) — nothing is shed on open ground to ring as a wheel.
 *  - ONE BREEZE: the lean-to's hem (≤0.05s) samples rend.breezeAt ONCE
 *    per draw through `breeze()`, which splits the amplitude 0.75 sway /
 *    0.55 lag and clamps both, so no vertex leaves its still pose by
 *    more than the law in any gale. The bedroll, the cart and the cot
 *    never read the clock: all three idle in STATIC_RING_TILES.
 *  - Collect-time light: this family has no light rows and asks for
 *    none — nothing here queueGlows, nothing here paints smoke or a
 *    flame (a displaced family's fire is the EmberBed beside them).
 *  - Draw-time `const ctx = rend.ctx`; hash deals by `h >>> k`.
 *  - SHADOWS NEVER BAKE: castEdgeQuad per frame for the three standing
 *    pieces; the walkable bedroll casts a contact.
 *  - stationBody is the painted extent, never the tile.
 */
import { Tile } from '@arx/shared';
import { shade } from '../../tint.js';
import { facetCircle } from '../../shapes.js';
import { DGN_BONE, DGN_BONE_DIM, DGN_IRON, DGN_IRON_LIT, TWN_BURLAP, TWN_BURLAP_LIT } from '../palette.js';
import type { DrawItem } from '../../renderer.js';
import type { PropEntries, PropFrame, PropHost } from '../types.js';

// ---- the inks (dealt once; the hash deals the postures)
/** The contact shade every piece seats in. */
const CONTACT = 'rgba(12, 8, 20, 0.24)';
/** The ground inside an open mouth: the roof's shade, and deeper under the ridge. */
const MOUTH = 'rgba(12, 8, 20, 0.46)';
const MOUTH_DEEP = 'rgba(12, 8, 20, 0.6)';
/**
 * Undyed linen a season on the road: a warm grey that the sun
 * bleaches on its lit plane and the mud darkens in its folds.
 * Exported so the test can name the family's cloth.
 */
export const LINEN = '#b3a487';
const LINEN_LIT = shade(LINEN, 16);
const LINEN_SUN = shade(LINEN, 28);
const LINEN_SHADE = shade(LINEN, -16);
const LINEN_DEEP = shade(LINEN, -30);
const LINEN_SEAM = shade(LINEN, -9);
const LINEN_HEM = shade(LINEN, -20);
/** Sackcloth: the patch, the bundle, the thing tied at the foot. */
const SACK = '#8f7a58';
const SACK_LIT = shade(SACK, 14);
const SACK_DARK = shade(SACK, -16);
/** Wool: the blanket every one of them still has (the tile's ink). */
const WOOL = '#5d4f42';
const WOOL_LIT = shade(WOOL, 20);
const WOOL_FOLD = shade(WOOL, -13);
const WOOL_DARK = shade(WOOL, -24);
/** A second blanket for the hash to deal: grey wool, an older weave. */
const WOOL_GREY = '#6a655d';
const WOOL_GREY_LIT = shade(WOOL_GREY, 20);
const WOOL_GREY_FOLD = shade(WOOL_GREY, -13);
const WOOL_GREY_DARK = shade(WOOL_GREY, -24);
/** Poles and trestle legs: whatever tree stood nearest, bark off. */
const POLE = '#5a4a3a';
const POLE_WEST = shade(POLE, 15);
const POLE_EAST = shade(POLE, -13);
/** A stake: the same wood, driven, its head split. */
const STAKE = '#4f4032';
const STAKE_LIT = shade(STAKE, 15);
/** Cord and rope: hemp gone grey in the weather. */
const ROPE = '#8a713f';
const ROPE_DARK = '#5e4c2c';
/**
 * The copper pot they would not leave: dull, the road's smoke on it.
 * Exported so the test can find the one bright thing in the family.
 */
export const COPPER = '#8c5a3c';
const COPPER_LIT = '#b07a52';
const COPPER_DARK = '#5e3a26';
const COPPER_MOUTH = '#2b2224';
/** The cart's oak (the tile's ink): the one thing built to last. */
const CART_OAK = '#6e4a33';
const CART_OAK_TOP = shade(CART_OAK, 26);
const CART_OAK_ARRIS = shade(CART_OAK, 38);
const CART_OAK_WEST = shade(CART_OAK, 14);
const CART_OAK_EAST = shade(CART_OAK, -14);
const CART_OAK_DARK = shade(CART_OAK, -24);
const CART_OAK_SEAM = shade(CART_OAK_TOP, -9);
/** A chest's boards: darker oak, older. */
const CHEST = '#4a3428';
const CHEST_LIT = shade(CHEST, 18);
/** A tin cup: pewter grey, dented. */
const PEWTER = '#7d7a80';
const PEWTER_LIT = '#a19ea6';
const PEWTER_DARK = '#5a575e';

/** The one breeze phase: dealt from the hash so no two hems keep time. */
function breezePhase(h: number, k: number): number {
  return ((h >>> k) & 15) * 0.41;
}

/** Clamp a breeze sample to its law's amplitude (in tiles → px). */
function clampAmp(v: number, ampTiles: number, s: number): number {
  const lim = ampTiles * s;
  return v > lim ? lim : v < -lim ? -lim : v;
}

/**
 * ONE BREEZE, sampled once per draw and held to the law. `amp` is the
 * piece's whole amplitude in tiles; the sway beat gets 0.75 of it and
 * the lag beat 0.55 (0.75² + 0.55² ≈ 0.87 < 1), so a hem corner that
 * rides both stays inside `amp·s` of its still pose.
 */
function breeze(
  rend: PropHost, tx: number, ty: number, t: number, ph: number, s: number, amp: number,
): { sw: number; lg: number } {
  const b = rend.breezeAt(tx, ty, t, ph, s, amp * 0.75, amp * 0.55);
  return { sw: clampAmp(b.sway, amp * 0.75, s), lg: clampAmp(b.lag, amp * 0.55, s) };
}

/** A filled four-corner quad (the diagonal grammar: never ctx.rotate). */
function quad(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
}

/**
 * A bar along an axis a→b, `w` wide in the image plane, lifted by
 * `lift` (screen up): a shaft, a leg, a spoke, a chair leg — every
 * diagonal timber in the family.
 */
function beam(
  ctx: CanvasRenderingContext2D,
  ax: number, ay: number, bx: number, by: number, w: number, lift = 0,
): void {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * w * 0.5;
  const ny = (dx / len) * w * 0.5;
  quad(ctx, ax - nx, ay - ny - lift, bx - nx, by - ny - lift, bx + nx, by + ny - lift, ax + nx, ay + ny - lift);
}

/**
 * A squared timber a→b with its own light: the face, then one lit
 * strip (0.03s, BLOCK LAW) laid along the SUN edge — the west edge
 * of a leaning timber, the upper edge of a lying one — and, when the
 * timber is wide enough to keep a face between them (≥0.09s), the
 * dark strip along the far edge. Value steps, never stroked lines.
 */
function timber(
  ctx: CanvasRenderingContext2D,
  ax: number, ay: number, bx: number, by: number, w: number, s: number,
  face: string, lit: string, dark: string,
): void {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  // The unit normal, turned toward the sun: west first, up second.
  let nx = -dy / len;
  let ny = dx / len;
  if (nx > 1e-6 || (nx >= -1e-6 && ny > 0)) {
    nx = -nx;
    ny = -ny;
  }
  const strip = s * 0.03;
  const off = (w - strip) * 0.5;
  ctx.fillStyle = face;
  beam(ctx, ax, ay, bx, by, w);
  ctx.fillStyle = lit;
  beam(ctx, ax + nx * off, ay + ny * off, bx + nx * off, by + ny * off, strip);
  if (w >= s * 0.09 - 1e-6) {
    ctx.fillStyle = dark;
    beam(ctx, ax - nx * off, ay - ny * off, bx - nx * off, by - ny * off, strip);
  }
}

/**
 * A plumb squared shaft from foot (x, yb) to head (x, yt), `w` wide:
 * the face, one lit west strip, one dark east strip (each ≥0.03s).
 */
function post(
  ctx: CanvasRenderingContext2D,
  x: number, yb: number, yt: number, w: number, s: number,
  face: string, west: string, east: string,
): void {
  ctx.fillStyle = face;
  ctx.fillRect(x - w * 0.5, yt, w, yb - yt);
  ctx.fillStyle = west;
  ctx.fillRect(x - w * 0.5, yt, s * 0.03, yb - yt);
  ctx.fillStyle = east;
  ctx.fillRect(x + w * 0.5 - s * 0.03, yt, s * 0.03, yb - yt);
}

/** A cord a→b of thickness `th`: a thin quad along the axis. */
function cord(
  ctx: CanvasRenderingContext2D,
  ax: number, ay: number, bx: number, by: number, th: number,
): void {
  beam(ctx, ax, ay, bx, by, th);
}

/** The seat: a contact ellipse under the foot. */
function contact(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.fillStyle = CONTACT;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * A household block standing on a plane: the face, its lit top plane
 * (`top` deep), the lit west strip and the dark east strip. Every
 * bale, bundle, chest and pot in the family is one of these.
 */
function block(
  ctx: CanvasRenderingContext2D,
  x: number, footY: number, w: number, hgt: number, top: number, s: number,
  face: string, lit: string, dark: string,
): void {
  ctx.fillStyle = face;
  ctx.fillRect(x, footY - hgt, w, hgt);
  ctx.fillStyle = lit;
  ctx.fillRect(x, footY - hgt, s * 0.03, hgt);
  ctx.fillStyle = dark;
  ctx.fillRect(x + w - s * 0.03, footY - hgt, s * 0.03, hgt);
  ctx.fillStyle = lit;
  ctx.fillRect(x, footY - hgt - top, w, top);
}

/**
 * The copper pot: a squat body, the rim's lit top plane, the dark
 * mouth inside it, two iron lugs where the bail hangs. `w` is the
 * body's width; it stands `w·0.8` tall.
 */
function pot(ctx: CanvasRenderingContext2D, x: number, footY: number, w: number, s: number): void {
  const hgt = w * 0.8;
  block(ctx, x, footY, w, hgt, s * 0.04, s, COPPER, COPPER_LIT, COPPER_DARK);
  ctx.fillStyle = COPPER_MOUTH;
  ctx.fillRect(x + s * 0.03, footY - hgt - s * 0.035, w - s * 0.06, s * 0.03);
  ctx.fillStyle = DGN_IRON;
  ctx.fillRect(x - s * 0.015, footY - hgt + s * 0.01, s * 0.03, s * 0.03);
  ctx.fillRect(x + w - s * 0.015, footY - hgt + s * 0.01, s * 0.03, s * 0.03);
}

/** The blanket's inks, dealt by one hash bit: brown wool or the older grey. */
function woolInks(h: number, k: number): { face: string; lit: string; fold: string; dark: string } {
  return ((h >>> k) & 1) === 0
    ? { face: WOOL, lit: WOOL_LIT, fold: WOOL_FOLD, dark: WOOL_DARK }
    : { face: WOOL_GREY, lit: WOOL_GREY_LIT, fold: WOOL_GREY_FOLD, dark: WOOL_GREY_DARK };
}

/**
 * The lean-to's frame in screen space, pure: pole feet at `baseY`,
 * the ridge `poleH` up, the canvas's north edge staked past it (the
 * open face is SOUTH — the canvas recedes north, up the screen).
 * Exported so the test can pin the orientation without a canvas.
 */
export function leanToFrame(s: number): {
  hw: number; hwN: number; poleH: number; ridge: number; canvasS: number; north: number;
} {
  const poleH = s * 0.62;
  return {
    hw: s * 0.5,
    hwN: s * 0.4,
    poleH,
    // Screen offsets from baseY (negative = up).
    ridge: -poleH,
    canvasS: -poleH - s * 0.05,
    north: -poleH - s * 0.05 - s * 0.34,
  };
}

/** The cart's heap: 4..6 household blocks, dealt by the hash. Exported for the test. */
export function cartHeapCount(h: number): number {
  return 4 + Math.min(2, (h >>> 3) & 3);
}

// ---------------------------------------------- 535 LeanTo
/**
 * One canvas thrown over a ridge pole on two uprights and staked to
 * the ground behind, its two side skirts pegged out splayed: the open
 * face SOUTH, so the road can see what they own — a dark mouth with
 * two bedrolls in it, the pot outside. RIG: the ridge at 0.62s (the
 * rig's hip — you crawl in), the canvas's staked edge recedes to
 * ~1.0s up the screen. Solid; tent ×2. The roof is the bright plane
 * (the sky-facing read the house tents keep); the mouth's hem hangs
 * in the unlit tone and samples the one breeze, clamped ≤0.05s.
 */
function paintLeanTo(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, t, tx, ty, stationBody } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  const F = leanToFrame(s);
  const hw = F.hw;
  const hwN = F.hwN;
  const ridgeY = baseY + F.ridge;
  const canvasS = baseY + F.canvasS;
  const northY = baseY + F.north;
  const poleW = s * 0.08;
  // The skirts' front pegs: splayed past the poles at the foot line.
  const skirtX = hw + s * 0.28;
  const skirtY = baseY + s * 0.05;
  const ph = breezePhase(h, 3);
  // The deal: the pot's side of the mouth, where the patch was sewn,
  // which blanket each sleeper has, how far the east fold runs.
  const potSide = ((h >>> 5) & 1) === 0 ? -1 : 1;
  const patchU = 0.22 + ((h >>> 7) & 3) * 0.08;
  const patchV = 0.3 + ((h >>> 9) & 3) * 0.1;
  const foldU = 0.66 + ((h >>> 11) & 3) * 0.03;
  const near = woolInks(h, 13);
  // The far roll is always the brown wool: two greys in one dark
  // mouth read as stones, not beds.
  const far = woolInks(0, 0);
  // Canvas-plane helpers: u across (west→east), v from the ridge (0)
  // to the staked north edge (1); the plane narrows as it recedes.
  const left = (v: number): number => p.x - hw + (hw - hwN) * v;
  const width = (v: number): number => 2 * (hw - (hw - hwN) * v);
  const cx = (u: number, v: number): number => left(v) + width(v) * u;
  const cy = (v: number): number => canvasS + (northY - canvasS) * v;
  return {
    sortY: ty + 0.72,
    // Painted extent: the skirt pegs' heads at ±0.81s, the north
    // stakes 1.06s over the foot line, the pot's foot 0.2s under it.
    body: stationBody(0.83, 1.1, 0.45),
    drawShadow: () => rend.castEdgeQuad(p.x - hw, baseY, p.x + hw, baseY, 0.62),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // ONE BREEZE, sampled once and held to the hem's law (0.05s).
      const { sw, lg } = breeze(rend, tx, ty, t, ph, s, 0.05);
      // PASS 1 — primary mass. The seat (wide enough to hold the pegs
      // and the pot in one silhouette); then THE MOUTH: the ground in
      // the roof's shade, a hollow the road looks into, the canvas's
      // underside deepest just under the ridge.
      contact(ctx, p.x, baseY + s * 0.02, hw * 1.5, syT * 0.17);
      const inL = p.x - hw + poleW * 0.5;
      const inW = hw * 2 - poleW;
      ctx.fillStyle = MOUTH;
      ctx.fillRect(inL, ridgeY, inW, baseY - ridgeY);
      ctx.fillStyle = LINEN_DEEP;
      ctx.fillRect(inL, ridgeY, inW, s * 0.12);
      ctx.fillStyle = MOUTH_DEEP;
      ctx.fillRect(inL, ridgeY + s * 0.12, inW, s * 0.1);
      // Two bedrolls on the floor inside, lying east-west, heads
      // apart: the far one deeper in (its head east), the near one at
      // the mouth (its head west). Each is a rolled blanket with its
      // lit top, a fold line (a value step), a lashing, its foot end
      // the roll's dark spiral.
      // `T` is the roll's thickness: the far roll is drawn a step
      // thinner so the mouth reads as depth, not two shelves.
      const roll = (x0: number, x1: number, footY: number, headWest: boolean, ink: ReturnType<typeof woolInks>, T: number) => {
        ctx.fillStyle = ink.face;
        ctx.fillRect(x0, footY - T, x1 - x0, T);
        ctx.fillStyle = ink.lit;
        ctx.fillRect(x0, footY - T, x1 - x0, s * 0.04);
        ctx.fillStyle = ink.fold;
        ctx.fillRect(x0 + s * 0.03, footY - T * 0.5, x1 - x0 - s * 0.06, s * 0.03);
        ctx.fillStyle = ink.dark;
        ctx.fillRect(headWest ? x1 - s * 0.04 : x0, footY - T, s * 0.04, T);
        ctx.fillStyle = ROPE_DARK;
        ctx.fillRect(x0 + (x1 - x0) * (headWest ? 0.6 : 0.4), footY - T - s * 0.01, s * 0.03, T + s * 0.01);
        // The head: a thicker roll at one end, lit on top and west.
        const hx = headWest ? x0 - s * 0.02 : x1 - s * 0.11;
        const HH = T + s * 0.05;
        ctx.fillStyle = ink.face;
        ctx.fillRect(hx, footY - HH, s * 0.13, HH);
        ctx.fillStyle = ink.lit;
        ctx.fillRect(hx, footY - HH, s * 0.13, s * 0.04);
        ctx.fillRect(hx, footY - HH, s * 0.03, HH);
        ctx.fillStyle = ink.dark;
        ctx.fillRect(hx + s * 0.1, footY - HH + s * 0.04, s * 0.03, HH - s * 0.04);
      };
      roll(p.x - hw * 0.5, p.x + hw * 0.5, baseY - s * 0.27, false, far, s * 0.1);
      roll(p.x - hw * 0.7, p.x + hw * 0.3, baseY - s * 0.05, true, near, s * 0.12);
      // The two uprights and the ridge pole over them (its ends show
      // past the poles; the canvas covers the rest).
      post(ctx, p.x - hw, baseY, ridgeY, poleW, s, POLE, POLE_WEST, POLE_EAST);
      post(ctx, p.x + hw, baseY, ridgeY, poleW, s, POLE, POLE_WEST, POLE_EAST);
      ctx.fillStyle = POLE;
      ctx.fillRect(p.x - hw - s * 0.07, ridgeY - s * 0.05, hw * 2 + s * 0.14, s * 0.05);
      ctx.fillStyle = POLE_WEST;
      ctx.fillRect(p.x - hw - s * 0.07, ridgeY - s * 0.08, hw * 2 + s * 0.14, s * 0.03);
      // THE SKIRTS: the canvas's two sides pegged out from the pole
      // tops to the ground — the tent's splay. The west skirt takes
      // the sun; the east hangs in shade. Each is one quad from the
      // pole top down to its peg and back up to the north stake.
      ctx.fillStyle = LINEN;
      quad(ctx, p.x - hw, ridgeY - s * 0.02, p.x - skirtX, skirtY, p.x - hwN - s * 0.05, northY + s * 0.02, p.x - hw, canvasS);
      ctx.fillStyle = LINEN_SHADE;
      quad(ctx, p.x + hw, ridgeY - s * 0.02, p.x + skirtX, skirtY, p.x + hwN + s * 0.05, northY + s * 0.02, p.x + hw, canvasS);
      // THE ROOF: the one bright plane, sloping from the ridge back to
      // the ground stakes. Then its light: the sun strip along the
      // west edge, the east fold a step under, the seam where two
      // widths were sewn (a value step down the middle).
      ctx.fillStyle = LINEN_LIT;
      quad(ctx, cx(0, 0), cy(0), cx(1, 0), cy(0), cx(1, 1), cy(1), cx(0, 1), cy(1));
      ctx.fillStyle = LINEN_SUN;
      quad(ctx, cx(0, 0), cy(0), cx(0.16, 0), cy(0), cx(0.16, 1), cy(1), cx(0, 1), cy(1));
      ctx.fillStyle = LINEN;
      quad(ctx, cx(foldU, 0), cy(0), cx(1, 0), cy(0), cx(1, 1), cy(1), cx(foldU, 1), cy(1));
      ctx.fillStyle = LINEN_SEAM;
      quad(ctx, cx(0.5, 0) - s * 0.015, cy(0), cx(0.5, 0) + s * 0.015, cy(0), cx(0.5, 1) + s * 0.015, cy(1), cx(0.5, 1) - s * 0.015, cy(1));
      // PASS 2 — secondary structure. The patch: sackcloth sewn over a
      // tear, its two corner stitches darker. The hem: the canvas's
      // overhang hanging in front of the ridge in the unlit tone, its
      // foot free to the breeze (a quad, its lower corners displaced).
      const pw = s * 0.13;
      const pxx = cx(patchU, patchV);
      const pyy = cy(patchV);
      ctx.fillStyle = SACK;
      ctx.fillRect(pxx, pyy - s * 0.05, pw, s * 0.1);
      // Four corner stitches: two read as a hatch (screenshot-judged).
      ctx.fillStyle = SACK_DARK;
      ctx.fillRect(pxx + s * 0.01, pyy - s * 0.05, s * 0.03, s * 0.03);
      ctx.fillRect(pxx + pw - s * 0.04, pyy - s * 0.05, s * 0.03, s * 0.03);
      ctx.fillRect(pxx + s * 0.01, pyy + s * 0.02, s * 0.03, s * 0.03);
      ctx.fillRect(pxx + pw - s * 0.04, pyy + s * 0.02, s * 0.03, s * 0.03);
      const hemD = s * 0.13;
      ctx.fillStyle = LINEN_HEM;
      quad(ctx, cx(0, 0), canvasS, cx(1, 0), canvasS, cx(1, 0) + sw, canvasS + hemD + lg, cx(0, 0) + sw, canvasS + hemD + lg);
      // The hem's own shade where it turns under the ridge's lip.
      ctx.fillStyle = LINEN_DEEP;
      quad(ctx, cx(0, 0), canvasS + s * 0.03, cx(1, 0), canvasS + s * 0.03, cx(1, 0) + sw * 0.25, canvasS + s * 0.06 + lg * 0.25, cx(0, 0) + sw * 0.25, canvasS + s * 0.06 + lg * 0.25);
      // The skirts' edge cords from each pole top down to its peg, the
      // pegs themselves (a split head with its lit west face), and
      // the north stakes holding the canvas's staked corners.
      ctx.fillStyle = ROPE;
      for (const m of [-1, 1] as const) {
        cord(ctx, p.x + m * hw, ridgeY - s * 0.02, p.x + m * skirtX, skirtY - s * 0.03, s * 0.03);
      }
      for (const m of [-1, 1] as const) {
        const sx = p.x + m * skirtX;
        ctx.fillStyle = STAKE;
        ctx.fillRect(sx - s * 0.025, skirtY - s * 0.08, s * 0.05, s * 0.08);
        ctx.fillStyle = STAKE_LIT;
        ctx.fillRect(sx - s * 0.025, skirtY - s * 0.08, s * 0.03, s * 0.03);
        ctx.fillStyle = STAKE;
        ctx.fillRect(p.x + m * hwN - s * 0.025, northY - s * 0.06, s * 0.05, s * 0.07);
        ctx.fillStyle = STAKE_LIT;
        ctx.fillRect(p.x + m * hwN - s * 0.025, northY - s * 0.06, s * 0.03, s * 0.03);
      }
      // PASS 3 — tertiary life. The pot outside the mouth, on the side
      // the deal says: the one bright thing they kept.
      pot(ctx, p.x + potSide * s * 0.3 - s * 0.075, baseY + s * 0.13, s * 0.15, s);
      // PASS 4 — re-read: linen at six values (sun / lit / face / seam
      // / shade / deep) with the sun west, the roof the bright plane,
      // the mouth a hollow open south with two rolls in it, the skirts
      // the tent's splay, cords as quads, the hem the only thing that
      // moves and only ≤0.05s.
    },
  };
}

// ---------------------------------------------- 536 Bedroll
/**
 * A wool blanket rolled tight and cinched twice, its head rolled
 * thicker, the owner's bundle tied at the foot. RIG: 0.16s thick —
 * ankle-high, the rig walks over it (walkable, sortY under the
 * rig). STATIC: never reads the clock; contact shade only (a pan
 * casts no edge).
 */
function paintBedroll(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The deal: the head's end, the blanket, the roll's length, the
  // bundle's size.
  const headWest = ((h >>> 2) & 1) === 0;
  const ink = woolInks(h, 4);
  const L = s * (0.34 + ((h >>> 6) & 3) * 0.02);
  const bw = s * (0.13 + ((h >>> 8) & 1) * 0.03);
  const T = s * 0.16;
  const x0 = p.x - L;
  const x1 = p.x + L;
  const headX = headWest ? x0 - s * 0.03 : x1 - s * 0.17;
  const footX = headWest ? x1 : x0 - bw;
  return {
    sortY: ty + 0.42,
    // Painted extent: the bundle past the foot (±0.56s), the head's
    // top at 0.25s, the seat's rim 0.14s under the foot line.
    body: stationBody(0.58, 0.3, 0.3),
    drawShadow: () => rend.castContact(p.x, baseY + s * 0.01, L * 1.2, syT * 0.13),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // PASS 1 — primary mass. The seat; the roll: a squared bar with
      // its lit top plane, the fold line a value step along it, the
      // foot end's spiral darkest with the roll's eye in it.
      contact(ctx, p.x, baseY + s * 0.01, L * 1.32, syT * 0.13);
      ctx.fillStyle = ink.face;
      ctx.fillRect(x0, baseY - T, L * 2, T);
      ctx.fillStyle = ink.lit;
      ctx.fillRect(x0, baseY - T, L * 2, s * 0.05);
      // The roll's underside turns from the sun: the dark band along
      // its foot is what makes a bar read as a cylinder (screenshot-
      // judged — without it the roll lay flat as a plank).
      ctx.fillStyle = ink.dark;
      ctx.fillRect(x0, baseY - s * 0.035, L * 2, s * 0.035);
      ctx.fillStyle = ink.fold;
      ctx.fillRect(x0 + s * 0.04, baseY - T * 0.52, L * 2 - s * 0.08, s * 0.03);
      // (East-facing it is the roll's darkest step; west-facing it
      // takes the sun: the fold value with a lit eye — TWO SUNS.)
      const eyeX = headWest ? x1 - s * 0.07 : x0;
      ctx.fillStyle = headWest ? ink.dark : ink.fold;
      ctx.fillRect(eyeX, baseY - T, s * 0.07, T);
      ctx.fillStyle = headWest ? ink.face : ink.lit;
      ctx.fillRect(eyeX + s * 0.02, baseY - T * 0.64, s * 0.03, s * 0.03);
      // PASS 2 — secondary structure. The head roll: thicker, proud of
      // the body, lit on its top and its west face. Two lashings cinch
      // the roll, each knotted on top.
      ctx.fillStyle = ink.face;
      ctx.fillRect(headX, baseY - s * 0.24, s * 0.2, s * 0.24);
      ctx.fillStyle = ink.lit;
      ctx.fillRect(headX, baseY - s * 0.24, s * 0.2, s * 0.05);
      ctx.fillRect(headX, baseY - s * 0.24, s * 0.03, s * 0.24);
      ctx.fillStyle = ink.dark;
      ctx.fillRect(headX + s * 0.17, baseY - s * 0.24, s * 0.03, s * 0.24);
      ctx.fillRect(headX, baseY - s * 0.04, s * 0.2, s * 0.04);
      ctx.fillStyle = ink.fold;
      ctx.fillRect(headX + s * 0.03, baseY - s * 0.13, s * 0.14, s * 0.03);
      for (const u of [0.3, 0.68]) {
        const lx = x0 + L * 2 * u;
        ctx.fillStyle = ROPE_DARK;
        ctx.fillRect(lx, baseY - T - s * 0.01, s * 0.03, T + s * 0.01);
        ctx.fillStyle = ROPE;
        ctx.fillRect(lx - s * 0.005, baseY - T - s * 0.03, s * 0.04, s * 0.03);
      }
      // PASS 3 — tertiary life. The bundle at the foot: sackcloth
      // gathered and tied, leaning on the roll so the two share one
      // silhouette (THE ONE RING). Its lit top, its cord, its neck.
      block(ctx, footX, baseY + s * 0.01, bw, bw * 0.9, s * 0.03, s, SACK, SACK_LIT, SACK_DARK);
      ctx.fillStyle = ROPE_DARK;
      ctx.fillRect(footX, baseY + s * 0.01 - bw * 0.5, bw, s * 0.03);
      ctx.fillStyle = ROPE;
      ctx.fillRect(footX + bw * 0.5 - s * 0.02, baseY + s * 0.01 - bw * 0.9 - s * 0.05, s * 0.04, s * 0.04);
      // PASS 4 — re-read: wool at four values (lit / face / fold /
      // dark), the sun west on the head's face, every mark ≥0.03s,
      // nothing stroked, nothing clocked, walkable (sortY under the rig).
    },
  };
}

// ---------------------------------------------- 537 BelongingsCart
/**
 * A household on two wheels: a hand-cart's deck heaped with what
 * would lift — the wool bale, the linen bundle, the chest, the pot, a
 * chair by its one leg — lashed twice with rope, the shafts down and
 * resting, one bundle dropped beside where the rope gave. RIG: the
 * deck at 0.42s, the heap's lit crown at ~0.99s over the foot line
 * (the rig's chest), the chair's corner — seat rail and one spindle
 * — topping out at 1.24s (a hand over its brow). Solid; cart ×3.
 * Static.
 */
function paintBelongingsCart(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  const hw = s * 0.5;
  const bedY = baseY - s * 0.42;
  const deep = s * 0.24;
  const skew = s * 0.08;
  const railH = s * 0.14;
  // The deal: how much they got on, which side the bundle fell, how
  // the chair leg leans, where the spokes stopped.
  const n = cartHeapCount(h);
  const dropEast = ((h >>> 6) & 1) === 0;
  const legLean = (((h >>> 8) & 3) - 1.5) * s * 0.05;
  const spokeRot = ((h >>> 10) & 7) * 0.13;
  const bale = woolInks(h, 13);
  // A point on the deck plane: x shifts east with v (the camera's
  // skew), y climbs by the deck's depth.
  const dx = (x: number, v: number): number => x + skew * v;
  const dy = (v: number): number => bedY - deep * v;
  return {
    sortY: ty + 0.7,
    // Painted extent: the shafts' tips at −0.86s, the dropped bundle
    // at ±0.9s, the chair's spindle top 1.24s over baseY (1.1s over
    // p.y — a hand over the rig's brow).
    body: stationBody(0.95, 1.14, 0.5),
    drawShadow: () => rend.castEdgeQuad(p.x - hw, baseY, p.x + hw, baseY, 0.6),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // A wheel: an iron tire and an oak felloe, each a ring cut
      // evenodd from two faceted circles (never a stroked ellipse),
      // three spoke bars through the hub, the hub an iron block with
      // its lit west face.
      const wheel = (wx: number, wy: number, r: number) => {
        ctx.fillStyle = DGN_IRON;
        ctx.beginPath();
        facetCircle(ctx, wx, wy, r, 12, spokeRot, 1.02);
        facetCircle(ctx, wx, wy, r * 0.8, 12, spokeRot, 1.02);
        ctx.fill('evenodd');
        ctx.fillStyle = CART_OAK_DARK;
        ctx.beginPath();
        facetCircle(ctx, wx, wy, r * 0.8, 12, spokeRot, 1.02);
        facetCircle(ctx, wx, wy, r * 0.62, 12, spokeRot, 1.02);
        ctx.fill('evenodd');
        ctx.fillStyle = CART_OAK;
        for (let k = 0; k < 3; k++) {
          const a = spokeRot + (k / 3) * Math.PI;
          const ex = Math.cos(a) * r * 0.66;
          const ey = Math.sin(a) * r * 0.66;
          beam(ctx, wx - ex, wy - ey, wx + ex, wy + ey, s * 0.035);
        }
        ctx.fillStyle = DGN_IRON;
        ctx.fillRect(wx - s * 0.045, wy - s * 0.045, s * 0.09, s * 0.09);
        ctx.fillStyle = DGN_IRON_LIT;
        ctx.fillRect(wx - s * 0.045, wy - s * 0.045, s * 0.03, s * 0.09);
      };
      // PASS 1 — primary mass. The seat (wide: the wheels, the shafts'
      // tips and the dropped bundle all stand in it); the far wheel
      // on the one axle (east of centre, the cart faces west), its
      // crown over the deck's back edge east of the heap; the shafts
      // down, resting on the road to the west; the deck's lit top.
      contact(ctx, p.x - s * 0.02, baseY + s * 0.02, s * 0.96, syT * 0.15);
      wheel(p.x + s * 0.31 + skew, baseY - s * 0.3 - deep * 0.8, s * 0.3);
      timber(ctx, p.x - hw + s * 0.02, bedY + railH * 0.45, p.x - hw - s * 0.36, baseY + s * 0.02, s * 0.07, s, POLE, POLE_WEST, POLE_EAST);
      timber(ctx, p.x - hw + skew * 0.8 + s * 0.02, bedY - deep * 0.8 + railH * 0.45, p.x - hw - s * 0.32, baseY - s * 0.14, s * 0.07, s, POLE, POLE_WEST, POLE_EAST);
      ctx.fillStyle = CART_OAK_TOP;
      quad(ctx, p.x - hw, bedY, dx(p.x - hw, 1), dy(1), dx(p.x + hw, 1), dy(1), p.x + hw, bedY);
      ctx.fillStyle = CART_OAK_SEAM;
      for (const v of [0.34, 0.67]) {
        quad(ctx, dx(p.x - hw, v), dy(v), dx(p.x + hw, v), dy(v), dx(p.x + hw, v) + s * 0.01, dy(v) - s * 0.03, dx(p.x - hw, v) + s * 0.01, dy(v) - s * 0.03);
      }
      // The far board: the deck's back lip, its top lit.
      ctx.fillStyle = CART_OAK;
      ctx.fillRect(dx(p.x - hw, 1), dy(1) - s * 0.06, hw * 2, s * 0.06);
      ctx.fillStyle = CART_OAK_WEST;
      ctx.fillRect(dx(p.x - hw, 1), dy(1) - s * 0.09, hw * 2, s * 0.03);
      // PASS 2 — secondary structure. THE HEAP, read from above on the
      // deck plane, back to front: the chest (if they got it on), the
      // wool bale, the sack (if they got it on), the linen bundle on
      // the bale — its lit top the heap's crown — the pot, the chair.
      const baleX = dx(p.x - s * 0.44, 0.4);
      const baleY = dy(0.4);
      const baleW = s * 0.38;
      const baleH = s * 0.22;
      // The chest sits west of the axle and low (0.18s), the sack low
      // and near (v 0.25), so the far wheel's crown clears the heap on
      // the east — the two-wheeled tell stays readable at every deal.
      const chX = dx(p.x - s * 0.18, 0.55);
      const chTop = dy(0.55) - s * 0.18 - s * 0.04;
      if (n >= 5) {
        block(ctx, chX, dy(0.55), s * 0.3, s * 0.18, s * 0.04, s, CHEST, CHEST_LIT, shade(CHEST, -16));
        ctx.fillStyle = DGN_IRON;
        ctx.fillRect(chX + s * 0.08, chTop, s * 0.03, s * 0.22);
        ctx.fillRect(chX + s * 0.19, chTop, s * 0.03, s * 0.22);
      }
      block(ctx, baleX, baleY, baleW, baleH, s * 0.04, s, bale.face, bale.lit, bale.dark);
      ctx.fillStyle = bale.fold;
      ctx.fillRect(baleX + s * 0.04, baleY - baleH * 0.5, baleW - s * 0.08, s * 0.03);
      if (n >= 6) {
        const skX = dx(p.x + s * 0.26, 0.25);
        block(ctx, skX, dy(0.25), s * 0.22, s * 0.16, s * 0.04, s, TWN_BURLAP, TWN_BURLAP_LIT, shade(TWN_BURLAP, -18));
        ctx.fillStyle = ROPE_DARK;
        ctx.fillRect(skX + s * 0.08, dy(0.25) - s * 0.16 - s * 0.05, s * 0.06, s * 0.03);
      }
      const linX = baleX + s * 0.03;
      const linY = baleY - baleH - s * 0.04;
      const linW = s * 0.3;
      const linH = s * 0.16;
      block(ctx, linX, linY, linW, linH, s * 0.05, s, LINEN, LINEN_LIT, LINEN_SHADE);
      ctx.fillStyle = ROPE_DARK;
      ctx.fillRect(linX + linW * 0.45, linY - linH - s * 0.05, s * 0.03, linH + s * 0.05);
      // The pot rides the chest when there is one, else the deck's
      // middle; the chair's one leg stands up out of the heap.
      const potX = n >= 5 ? chX + s * 0.11 : dx(p.x + s * 0.02, 0.5);
      const potFoot = n >= 5 ? chTop : dy(0.5);
      const potW = n >= 5 ? s * 0.14 : s * 0.15;
      pot(ctx, potX, potFoot, potW, s);
      const legX0 = baleX + baleW * 0.62;
      const legY0 = baleY - baleH * 0.4;
      const legX1 = legX0 + s * 0.12 + legLean;
      const legY1 = legY0 - s * 0.42;
      timber(ctx, legX0, legY0, legX1, legY1, s * 0.06, s, CART_OAK, CART_OAK_WEST, CART_OAK_EAST);
      // The chair's corner, not a stick with a knob (screenshot-judged):
      // the seat rail runs east off the leg's head as an L, its top
      // lit, and one spindle of the back stands up from the rail.
      const railX = legX1 - s * 0.045;
      const railY = legY1 - s * 0.05;
      ctx.fillStyle = CART_OAK;
      ctx.fillRect(railX, railY, s * 0.24, s * 0.07);
      ctx.fillStyle = CART_OAK_EAST;
      ctx.fillRect(railX + s * 0.21, railY, s * 0.03, s * 0.07);
      ctx.fillStyle = CART_OAK_TOP;
      ctx.fillRect(railX, railY - s * 0.03, s * 0.24, s * 0.03);
      ctx.fillStyle = CART_OAK;
      ctx.fillRect(railX + s * 0.15, railY - s * 0.14, s * 0.04, s * 0.11);
      ctx.fillStyle = CART_OAK_TOP;
      ctx.fillRect(railX + s * 0.15, railY - s * 0.17, s * 0.04, s * 0.03);
      // The lashings: two ropes over the heap from the near rail to
      // the far board, each a cord in two runs (up to the crown, down
      // the back), knotted where they meet the rail.
      ctx.fillStyle = ROPE;
      cord(ctx, p.x - hw + s * 0.05, bedY, linX + linW * 0.25, linY - linH - s * 0.05, s * 0.03);
      cord(ctx, linX + linW * 0.25, linY - linH - s * 0.05, dx(p.x - s * 0.08, 1), dy(1) - s * 0.06, s * 0.03);
      const eastCrownX = potX + potW * 0.6;
      const eastCrownY = potFoot - potW * 0.8 - s * 0.05;
      cord(ctx, p.x + hw - s * 0.06, bedY, eastCrownX, eastCrownY, s * 0.03);
      cord(ctx, eastCrownX, eastCrownY, dx(p.x + s * 0.3, 1), dy(1) - s * 0.06, s * 0.03);
      ctx.fillStyle = ROPE_DARK;
      ctx.fillRect(p.x - hw + s * 0.03, bedY - s * 0.02, s * 0.04, s * 0.04);
      ctx.fillRect(p.x + hw - s * 0.08, bedY - s * 0.02, s * 0.04, s * 0.04);
      // The near side board, its lit west strip, the iron corner
      // brackets; the east end cap turned to the camera; the deck's
      // front arris catching the sun.
      ctx.fillStyle = CART_OAK;
      ctx.fillRect(p.x - hw, bedY, hw * 2, railH);
      ctx.fillStyle = CART_OAK_WEST;
      ctx.fillRect(p.x - hw, bedY, s * 0.03, railH);
      ctx.fillStyle = CART_OAK_EAST;
      quad(ctx, p.x + hw, bedY, dx(p.x + hw, 1), dy(1), dx(p.x + hw, 1), dy(1) + railH, p.x + hw, bedY + railH);
      ctx.fillStyle = DGN_IRON;
      ctx.fillRect(p.x - hw + s * 0.03, bedY + s * 0.02, s * 0.035, railH - s * 0.04);
      ctx.fillRect(p.x + hw - s * 0.065, bedY + s * 0.02, s * 0.035, railH - s * 0.04);
      ctx.fillStyle = CART_OAK_ARRIS;
      ctx.fillRect(p.x - hw, bedY - s * 0.03, hw * 2, s * 0.03);
      // The near wheel, proud of the board, on the same axle.
      wheel(p.x + s * 0.31, baseY - s * 0.3, s * 0.32);
      // PASS 3 — tertiary life. The dropped bundle: wool that slid off
      // where the rope gave, lying in the cart's shade (THE ONE RING) —
      // beside the near wheel, or under the shafts' fall to the west
      // (never ON the shaft tips: a block on a shaft reads as a hitch).
      const drop = woolInks(h ^ 0x20, 15);
      const bX = dropEast ? p.x + s * 0.72 : p.x - s * 0.74;
      const bY = dropEast ? baseY + s * 0.03 : baseY + s * 0.16;
      block(ctx, bX, bY, s * 0.2, s * 0.14, s * 0.03, s, drop.face, drop.lit, drop.dark);
      // The cord runs ACROSS the bundle (a vertical cord split it into
      // two blocks in the sheet), its knot on the lit west face.
      ctx.fillStyle = ROPE_DARK;
      ctx.fillRect(bX, bY - s * 0.085, s * 0.2, s * 0.03);
      ctx.fillStyle = ROPE;
      ctx.fillRect(bX + s * 0.03, bY - s * 0.095, s * 0.04, s * 0.04);
      // PASS 4 — re-read: oak at six values (arris / top / west / face
      // / east / dark) with the sun west, the deck and the crown as
      // lit planes, wheels as evenodd rings and spoke quads, cords as
      // quads, 4..6 blocks in the heap, nothing stroked, no clock.
    },
  };
}

// ---------------------------------------------- 538 FieldCot
/**
 * A canvas bed on two trestles: the blanket folded back on one side,
 * a bandage roll where the head lay, a cup on the ground by the leg.
 * Someone was nursed here, and got up or did not. RIG: the bed at
 * 0.34s — the rig's knee; the far rail at ~0.66s up the screen.
 * Solid; cot ×2. Static.
 */
function paintFieldCot(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  const hw = s * 0.52;
  const bedY = baseY - s * 0.34;
  const deep = s * 0.28;
  const skew = s * 0.07;
  const legW = s * 0.06;
  // The deal: which side the blanket is thrown back to, the blanket,
  // where the bandage roll lies, the legs' splay, the canvas's stain.
  const foldEast = ((h >>> 3) & 1) === 0;
  const blanket = woolInks(h, 5);
  const bandU = 0.12 + ((h >>> 7) & 3) * 0.05;
  const splay = s * (0.1 + ((h >>> 9) & 1) * 0.03);
  const canvasInk = ((h >>> 11) & 1) === 0 ? LINEN : shade(LINEN, -6);
  // A point on the bed plane: x shifts east with v, y climbs by the
  // bed's depth. u runs west→east across the canvas.
  const cxAt = (u: number, v: number): number => p.x - hw + s * 0.04 + (hw * 2 - s * 0.08) * u + skew * v;
  const cyAt = (v: number): number => bedY - deep * v;
  const u0 = foldEast ? 0.5 : 0;
  const u1 = foldEast ? 1 : 0.5;
  const fu = 0.5; // the fold's edge
  return {
    sortY: ty + 0.66,
    // Painted extent: the far east trestle's splayed foot at +0.65s,
    // the far rail's lit top 0.7s over baseY, the cup's foot 0.02s
    // under it.
    body: stationBody(0.68, 0.75, 0.4),
    drawShadow: () => rend.castEdgeQuad(p.x - hw * 0.9, baseY, p.x + hw * 0.9, baseY, 0.34),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // A trestle: two legs crossed, foot to rail.
      const trestle = (x: number, footY: number, railY: number, face: string, lit: string, dark: string) => {
        timber(ctx, x - splay, footY, x + splay * 0.7, railY, legW, s, face, lit, dark);
        timber(ctx, x + splay, footY, x - splay * 0.7, railY, legW, s, face, lit, dark);
      };
      // PASS 1 — primary mass. The seat; the far trestles (a step
      // darker: they stand in the bed's shade); the far rail with its
      // lit top; THE CANVAS BED — the lit plane — with its sun strip
      // west and the hollow where a body lay as a value step.
      contact(ctx, p.x, baseY + s * 0.02, hw * 1.2, syT * 0.14);
      trestle(p.x - hw + s * 0.1 + skew, baseY - deep, bedY - deep + s * 0.04, POLE_EAST, POLE, shade(POLE, -26));
      trestle(p.x + hw - s * 0.1 + skew, baseY - deep, bedY - deep + s * 0.04, POLE_EAST, POLE, shade(POLE, -26));
      ctx.fillStyle = POLE;
      ctx.fillRect(p.x - hw + skew, bedY - deep - s * 0.05, hw * 2, s * 0.05);
      ctx.fillStyle = POLE_WEST;
      ctx.fillRect(p.x - hw + skew, bedY - deep - s * 0.08, hw * 2, s * 0.03);
      ctx.fillStyle = canvasInk;
      quad(ctx, cxAt(0, 0), cyAt(0), cxAt(0, 1), cyAt(1), cxAt(1, 1), cyAt(1), cxAt(1, 0), cyAt(0));
      ctx.fillStyle = LINEN_LIT;
      quad(ctx, cxAt(0, 0), cyAt(0), cxAt(0, 1), cyAt(1), cxAt(0.2, 1), cyAt(1), cxAt(0.2, 0), cyAt(0));
      ctx.fillStyle = LINEN_SHADE;
      quad(ctx, cxAt(0.16, 0.3), cyAt(0.3), cxAt(0.16, 0.72), cyAt(0.72), cxAt(0.86, 0.72), cyAt(0.72), cxAt(0.86, 0.3), cyAt(0.3));
      // PASS 2 — secondary structure. The blanket thrown back over one
      // half: its face, the fold's turned-up cuff lit (the underside
      // shown to the sun), the crease beside it a step darker, its hem
      // hanging over the near rail. Then the near trestles and the
      // near rail, its lit top plane, the canvas's ties on its face.
      // The blanket's cast on the canvas beside the fold: a value step
      // that says the wool lies ON the linen (screenshot-judged — flat
      // on flat read as a two-tone tabletop).
      const castA = foldEast ? fu - 0.07 : fu;
      const castB = foldEast ? fu : fu + 0.07;
      ctx.fillStyle = LINEN_DEEP;
      quad(ctx, cxAt(castA, 0), cyAt(0), cxAt(castA, 1), cyAt(1), cxAt(castB, 1), cyAt(1), cxAt(castB, 0), cyAt(0));
      ctx.fillStyle = blanket.face;
      quad(ctx, cxAt(u0, 0), cyAt(0), cxAt(u0, 1), cyAt(1), cxAt(u1, 1), cyAt(1), cxAt(u1, 0), cyAt(0));
      // The rolled cuff where the blanket turned back: a block with
      // real height standing proud of the bed plane along the fold —
      // its lit top, its face, its dark underside — then the crease a
      // step darker beside it.
      const cuffA = foldEast ? fu : fu - 0.12;
      const cuffB = foldEast ? fu + 0.12 : fu;
      const cuffH = s * 0.07;
      ctx.fillStyle = blanket.lit;
      quad(ctx, cxAt(cuffA, 0), cyAt(0) - cuffH, cxAt(cuffA, 1), cyAt(1) - cuffH, cxAt(cuffB, 1), cyAt(1) - cuffH, cxAt(cuffB, 0), cyAt(0) - cuffH);
      ctx.fillStyle = blanket.face;
      quad(ctx, cxAt(cuffA, 0), cyAt(0) - cuffH, cxAt(cuffB, 0), cyAt(0) - cuffH, cxAt(cuffB, 0), cyAt(0), cxAt(cuffA, 0), cyAt(0));
      ctx.fillStyle = blanket.dark;
      quad(ctx, cxAt(cuffA, 0), cyAt(0) - s * 0.03, cxAt(cuffB, 0), cyAt(0) - s * 0.03, cxAt(cuffB, 0), cyAt(0), cxAt(cuffA, 0), cyAt(0));
      const creaseA = foldEast ? fu + 0.12 : fu - 0.17;
      const creaseB = foldEast ? fu + 0.17 : fu - 0.12;
      ctx.fillStyle = blanket.dark;
      quad(ctx, cxAt(creaseA, 0), cyAt(0), cxAt(creaseA, 1), cyAt(1), cxAt(creaseB, 1), cyAt(1), cxAt(creaseB, 0), cyAt(0));
      trestle(p.x - hw + s * 0.1, baseY, bedY + s * 0.04, POLE, POLE_WEST, POLE_EAST);
      trestle(p.x + hw - s * 0.1, baseY, bedY + s * 0.04, POLE, POLE_WEST, POLE_EAST);
      ctx.fillStyle = POLE;
      ctx.fillRect(p.x - hw, bedY, hw * 2, s * 0.06);
      ctx.fillStyle = POLE_WEST;
      ctx.fillRect(p.x - hw, bedY - s * 0.03, hw * 2, s * 0.03);
      ctx.fillStyle = ROPE_DARK;
      for (const u of [0.18, 0.5, 0.82]) {
        ctx.fillRect(cxAt(u, 0) - s * 0.015, bedY + s * 0.015, s * 0.03, s * 0.03);
      }
      const hemX0 = cxAt(u0, 0);
      const hemX1 = cxAt(u1, 0);
      ctx.fillStyle = blanket.fold;
      ctx.fillRect(hemX0, bedY + s * 0.02, hemX1 - hemX0, s * 0.1);
      ctx.fillStyle = blanket.dark;
      ctx.fillRect(hemX0, bedY + s * 0.09, hemX1 - hemX0, s * 0.03);
      // PASS 3 — tertiary life. The bandage roll on the bare half,
      // bone-white, its wound tail trailing; the cup on the ground by
      // the near west leg (touching it: THE ONE RING).
      const bu = foldEast ? bandU : 0.55 + bandU;
      const bx = cxAt(bu, 0.5);
      const by = cyAt(0.5);
      ctx.fillStyle = DGN_BONE;
      ctx.fillRect(bx, by - s * 0.08, s * 0.09, s * 0.08);
      ctx.fillStyle = DGN_BONE_DIM;
      ctx.fillRect(bx + s * 0.06, by - s * 0.08, s * 0.03, s * 0.08);
      ctx.fillStyle = DGN_BONE;
      ctx.fillRect(bx + s * 0.09, by - s * 0.03, s * 0.07, s * 0.03);
      const cupX = p.x - hw + s * 0.1 + splay - s * 0.01;
      block(ctx, cupX, baseY + s * 0.02, s * 0.09, s * 0.08, s * 0.03, s, PEWTER, PEWTER_LIT, PEWTER_DARK);
      ctx.fillStyle = PEWTER;
      ctx.fillRect(cupX + s * 0.09, baseY + s * 0.02 - s * 0.06, s * 0.03, s * 0.03);
      // PASS 4 — re-read: linen at three values (lit / face / hollow)
      // with the sun west, wool at four on the blanket, poles with one
      // lit strip, the bed the lit plane, the bandage bone-white, the
      // cup in the leg's silhouette, nothing stroked, no clock.
    },
  };
}

export const DISPLACED_PROPS: PropEntries = [
  [[Tile.LeanTo], paintLeanTo],
  [[Tile.Bedroll], paintBedroll],
  [[Tile.BelongingsCart], paintBelongingsCart],
  [[Tile.FieldCot], paintFieldCot],
];
