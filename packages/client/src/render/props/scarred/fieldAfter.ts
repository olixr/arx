/**
 * THE SCARRED LAND — B. the field after: what a fight leaves.
 * BrokenCart (512), FieldLitter (513), ArrowPost (514), FallenBanner
 * (515), FieldCairn (516), CairnFallen (517), BeastBones (518).
 *
 * K3 THE FIELD AFTER. Nobody is here any more. Every piece is what a
 * day of fighting left on the ground when the ones who could walk had
 * walked: a wain on its side with its corn in the mud, the litter of a
 * shield wall, a post that stopped the arrows the line did not, a
 * standard down and its cloth in the dirt, the grave the country
 * digs when it has no time to dig, the beast nobody unharnessed.
 * The voice is LEFT BURNING's plain cousin, LEFT LYING: no fire in
 * this family, no light row, no smoke — iron, oak, cloth, stone, bone.
 *
 * The laws, in the order the brush meets them:
 *  - BODY-RULER: every extent is in `s` (the tile); the rig stands
 *    1.15s. Each painter's header states its height against the rig.
 *  - TOP-PLANE: every standing piece shows its lit top at ~syT·0.32.
 *  - FLAT FORGE / BLOCK LAW: squared filled quads, one lit facet toward
 *    the fixed west art sun, depth as value steps, min feature 0.03s.
 *    Diagonals are QUADS (moveTo/lineTo) — never ctx.rotate/translate,
 *    so the canvas oracle and the GL stage draw the same thing.
 *  - THE ONE RING: silhouette only. Nothing here strokes; the cached
 *    eight-tap ring (CACHED_RING_TILES) inks the painted silhouette.
 *    Every loose piece (a grain kernel, the broken shaft, the cup, the
 *    bone chips) sits inside its prop's contact shade or touches its
 *    prop — nothing is shed on open ground to ring as a wheel. The six
 *    still pieces idle in STATIC_RING_TILES; the banner rides the fast
 *    cadence for its one loose corner.
 *  - ONE BREEZE: the fallen banner's loose corner samples rend.breezeAt
 *    ONCE per draw through `breeze()` (≤0.05s, split 0.75/0.55 and
 *    clamped, so the corner never leaves its still pose by more than
 *    the law even in a gale). Nothing else here reads the clock.
 *  - Faction cloth is dealt from THE FOUR-COLOUR FIELD SET
 *    (states.ts) — the litter's shield and the fallen banner say
 *    "somebody's" without saying whose; never a dye band.
 *  - Collect-time light: none in this family. Nothing queueGlows,
 *    nothing paints smoke, nothing paints an ember ink.
 *  - Draw-time `const ctx = rend.ctx`; hash deals by `h >>> k`.
 *  - SHADOWS NEVER BAKE: castEdgeQuad for every standing piece, castBlob
 *    for the cairn's cone, castContact for the two walkable pans.
 *  - The MournerStatue precedent: the cairns stay PALE — graveyard
 *    stone and its lit step, moss as a chip, never a dark teardrop.
 */
import { Tile } from '@arx/shared';
import { shade } from '../../tint.js';
import { facetBlob, facetCircle } from '../../shapes.js';
import { GY_MOSS, GY_STONE, GY_STONE_LIT, PALI_LOG } from '../../paintVocab.js';
import {
  DGN_BONE,
  DGN_BONE_DIM,
  DGN_IRON,
  DGN_IRON_LIT,
  SCAR_RAG_RED,
  TRD_LEATHER,
  TWN_BURLAP,
  TWN_BURLAP_LIT,
  TWN_STONE,
} from '../palette.js';
import { FIELD_SET } from './states.js';
import type { DrawItem } from '../../renderer.js';
import type { PropEntries, PropFrame, PropHost } from '../types.js';

// ---- the inks (dealt once; the hash deals the postures)
/** The contact shade every piece seats in. */
const CONTACT = 'rgba(12, 8, 20, 0.24)';
/** A farm cart's oak: the tile's own minimap ink; its underside is the
 *  plane the sun finds when the cart is on its side (the topColor). */
const CART_OAK = '#5e4630';
const CART_UNDER = '#7d6040';
const CART_UNDER_WEST = shade(CART_UNDER, 14);
const CART_SEAM = shade(CART_UNDER, -14);
const CART_BATTEN = shade(CART_OAK, 4);
const CART_BATTEN_EAST = shade(CART_OAK, -12);
const CART_RAIL = CART_OAK;
const CART_RAIL_TOP = shade(CART_OAK, 30);
const CART_RAIL_EAST = shade(CART_OAK, -14);
/** The axle: a round beam, tar-dark, its top a step lighter. */
const AXLE = '#3b2e22';
const AXLE_TOP = shade(AXLE, 16);
/** Fresh-split wood at a break: pale, cold. */
const SPLINTER = '#9a8a70';
/** The wheel: felloes in the cart oak, the dark between the spokes. */
const WHEEL_RIM = shade(CART_OAK, -8);
const WHEEL_BETWEEN = '#33281e';
const WHEEL_SPOKE = shade(CART_UNDER, 6);
/** Sacking and its corn. */
const SACK = TWN_BURLAP;
const SACK_LIT = TWN_BURLAP_LIT;
const SACK_TIE = '#4e3d2a';
const GRAIN = '#d6b96b';
/** The litter's iron: the dungeon iron with one lit step. */
const IRON = DGN_IRON;
const IRON_LIT = DGN_IRON_LIT;
const IRON_DARK = shade(DGN_IRON, -10);
/** The one glint on a dome or a rivet head: the iron's lit step
 *  lifted again — still grey, never white. */
const IRON_GLINT = shade(DGN_IRON_LIT, 26);
/** A shield's linden board where it split. */
const LINDEN = '#b39a6c';
/** A helm's inside: nothing in it. */
const HELM_HOLLOW = '#1e1a22';
/** Spear and arrow shafts: palisade log ash, one lit strip. */
const SHAFT = PALI_LOG;
const SHAFT_LIT = shade(PALI_LOG, 18);
const SHAFT_DARK = shade(PALI_LOG, -14);
const RAG_FOLD = shade(SCAR_RAG_RED, -16);
/** The four fletchings the country flies: goose, grey goose, dyed
 *  red, crow. Every post deals two of them. */
const FLETCH_SET: readonly string[] = ['#d9d3c4', '#8f8c94', SCAR_RAG_RED, '#2c2830'];
/** The field dyes' value steps, dealt ONCE per dye (never shade() in
 *  a draw — the painter mints every frame): the shield's board seam
 *  and its bend; the banner's fold, its torn hem, its lifted face. */
const FIELD_SEAM: readonly string[] = FIELD_SET.map((d) => shade(d, -22));
const FIELD_BEND: readonly string[] = FIELD_SET.map((d) => shade(d, -30));
const FIELD_FOLD: readonly string[] = FIELD_SET.map((d) => shade(d, -18));
const FIELD_HEM: readonly string[] = FIELD_SET.map((d) => shade(d, -28));
const FIELD_LIFT: readonly string[] = FIELD_SET.map((d) => shade(d, 10));
const NOCK = '#2a2420';
/** Squared oak, driven and weathered: the post. */
const POST_OAK = '#5a4226';
const POST_OAK_WEST = shade(POST_OAK, 14);
const POST_OAK_EAST = shade(POST_OAK, -12);
const POST_OAK_TOP = shade(POST_OAK, 26);
const POST_CLEFT = shade(POST_OAK, -26);
const POST_CHECK = shade(POST_OAK, -18);
/** A banner staff: ash, oiled — a step colder than the post. */
const STAFF = '#4e3f30';
const STAFF_WEST = shade(STAFF, 14);
const STAFF_EAST = shade(STAFF, -12);
const STAFF_TOP = shade(STAFF, 20);
/** Graveyard stone, the country's plainest grey: pale on purpose. */
const STONE = GY_STONE;
const STONE_LIT = GY_STONE_LIT;
const STONE_TOP = shade(GY_STONE_LIT, 10);
const STONE_EAST = shade(GY_STONE, -12);
const STONE_UNDER = shade(GY_STONE, -8);
/** Two tones for the stones (the hash deals which), the marker's
 *  plain back when it lies face-down. */
const STONE_WARM = shade(GY_STONE, 3);
const STONE_COOL = shade(GY_STONE, -3);
const STONE_BACK = shade(GY_STONE, -4);
/** The one stone wrong: a kobold re-stack in the town's warmer stone. */
const STONE_FOREIGN = TWN_STONE;
const STONE_FOREIGN_LIT = shade(TWN_STONE, 18);
/** A clay cup left at the foot: unglazed, its rim catching the sun. */
const CUP = '#6a5446';
const CUP_RIM = '#9c8672';
/** Bone: the dungeon bone and its dim step; the sockets are dark. */
const BONE = DGN_BONE;
const BONE_DIM = DGN_BONE_DIM;
const BONE_DARK = shade(DGN_BONE_DIM, -22);
/** The vertebrae knobs along the spine, the two teeth on the jaw. */
const BONE_KNOB = shade(DGN_BONE, 8);
const BONE_TOOTH = shade(DGN_BONE, 12);
const SOCKET = '#2f2a30';
const STRAP = TRD_LEATHER;
const STRAP_DARK = shade(TRD_LEATHER, -18);
const BUCKLE = '#a68a4a';
const BUCKLE_LIT = shade(BUCKLE, 30);

// ---- the deals (exported so the test can name what the hash decides)
/** The cart's kind: 0 farm cart (tailboard), 1 wain (high sides), 2 dray (shafts). */
export function cartKind(h: number): number {
  return ((h >>> 3) & 3) % 3;
}
/** The litter's layout: 0 shield half, 1 snapped spear + rag, 2 dropped helm, 3 two arrows. */
export function litterLayout(h: number): number {
  return (h >>> 2) & 3;
}
/** The litter's shield charge: an index into FIELD_SET. */
export function litterCharge(h: number): number {
  return (h >>> 6) & 3;
}
/** The post's arrows: 5..8. */
export function arrowCount(h: number): number {
  return 5 + ((h >>> 6) & 3);
}
/** The post's two fletch colours: two DISTINCT indices into FLETCH_SET. */
export function fletchPair(h: number): readonly [number, number] {
  const a = (h >>> 10) & 3;
  const b = (a + 1 + ((h >>> 12) % 3)) & 3;
  return [a, b];
}
/** The fallen banner's field dye: an index into FIELD_SET. */
export function bannerDye(h: number): number {
  return (h >>> 4) & 3;
}
/** The cairn's stones: 6..8 (516 and 517 read the same bits — the
 *  fallen cairn is the SAME stones scattered). */
export function cairnStones(h: number): number {
  return 6 + (((h >>> 6) & 3) % 3);
}
/** The kobolds' one-stone-wrong: one cairn in eight was re-stacked. */
export function cairnOneWrong(h: number): boolean {
  return ((h >>> 12) & 7) === 0;
}
/** The beast's ribs: 5..6. */
export function ribCount(h: number): number {
  return 5 + ((h >>> 5) & 1);
}

/** Exported for the test's pins: the corn, the nocks, the splinters,
 *  the cup, the sockets, the buckle — each a thing the hash must deal
 *  in the count the header promises. */
export { FIELD_SET, FLETCH_SET, CART_UNDER, GRAIN, NOCK, SPLINTER, CUP, SOCKET, BUCKLE };

// ---- the grammar (file-local, as every family keeps its own)
/** The one breeze phase: dealt from the hash so no two cloths keep time. */
function breezePhase(h: number, k: number): number {
  return ((h >>> k) & 15) * 0.41;
}

/** Clamp a breeze sample to its law's amplitude (in tiles → px). */
function clampAmp(v: number, ampTiles: number, s: number): number {
  const lim = ampTiles * s;
  return v > lim ? lim : v < -lim ? -lim : v;
}

/**
 * ONE BREEZE, sampled once per draw and held to the law: the sway beat
 * gets 0.75 of `amp`, the lag beat 0.55, both clamped, so a vertex that
 * rides both stays inside amp·s of its still pose (0.75² + 0.55² < 1).
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

/** A filled triangle (a spearhead, a wedge, a shard). */
function tri(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.fill();
}

/**
 * A bar along an axis a→b with half-width vector n (the ground-plane
 * perpendicular), lifted by `lift` (screen up). Corners a−n, b−n, b+n,
 * a+n — a plank, a shaft, a spine.
 */
function bar(
  ctx: CanvasRenderingContext2D,
  ax: number, ay: number, bx: number, by: number,
  nx: number, ny: number, lift: number,
): void {
  quad(ctx, ax - nx, ay - ny - lift, bx - nx, by - ny - lift, bx + nx, by + ny - lift, ax + nx, ay + ny - lift);
}

/**
 * A timber LYING on the ground along a→b, `w` half-wide in the ground
 * plane, `th` thick: the south face (a step under), then the lit top
 * plane — the CharredBeam's grammar for every fallen pole here.
 */
function lyingTimber(
  ctx: CanvasRenderingContext2D, ys: number,
  ax: number, ay: number, bx: number, by: number,
  w: number, th: number, face: string, top: string, end?: string,
): void {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * w;
  const ny = (dx / len) * w * ys;
  if (end) {
    // The far end grain: darkest, it faces away from the sun.
    ctx.fillStyle = end;
    quad(ctx, bx - nx, by - ny - th, bx + nx, by + ny - th, bx + nx, by + ny, bx - nx, by - ny);
  }
  ctx.fillStyle = face;
  quad(ctx, ax + nx, ay + ny - th, bx + nx, by + ny - th, bx + nx, by + ny, ax + nx, ay + ny);
  ctx.fillStyle = top;
  bar(ctx, ax, ay, bx, by, nx, ny, th);
}

/**
 * A thin shaft a→b of thickness `th` (an arrow, a spear haft): the
 * shaft face, then a lit strip along its west/upper edge (one facet).
 */
function thinShaft(
  ctx: CanvasRenderingContext2D,
  ax: number, ay: number, bx: number, by: number, th: number, face: string, lit: string,
): void {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * th * 0.5;
  const ny = (dx / len) * th * 0.5;
  ctx.fillStyle = face;
  quad(ctx, ax - nx, ay - ny, bx - nx, by - ny, bx + nx, by + ny, ax + nx, ay + ny);
  // The lit strip: the half of the shaft that faces up-and-west.
  const lx = nx * 0.5;
  const ly = ny * 0.5;
  const side = nx < 0 || (nx === 0 && ny < 0) ? 1 : -1;
  ctx.fillStyle = lit;
  quad(ctx, ax + side * nx, ay + side * ny, bx + side * nx, by + side * ny, bx + side * lx, by + side * ly, ax + side * lx, ay + side * ly);
}

/**
 * A squared shaft from foot (xb, yb) to head (xt, yt), `w` wide: the
 * face, one lit west strip, one dark east strip — value steps.
 */
function shaft(
  ctx: CanvasRenderingContext2D,
  xb: number, yb: number, xt: number, yt: number,
  w: number, face: string, west: string, east: string, wl: number, we: number,
): void {
  const hw = w * 0.5;
  ctx.fillStyle = face;
  quad(ctx, xb - hw, yb, xt - hw, yt, xt + hw, yt, xb + hw, yb);
  ctx.fillStyle = west;
  quad(ctx, xb - hw, yb, xt - hw, yt, xt - hw + wl, yt, xb - hw + wl, yb);
  ctx.fillStyle = east;
  quad(ctx, xb + hw - we, yb, xt + hw - we, yt, xt + hw, yt, xb + hw, yb);
}

/** The seat: a contact ellipse under the foot. */
function contact(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.fillStyle = CONTACT;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * A rounded field stone: the blob in its face ink, then the lit facet
 * (a smaller blob pulled west and up — one value step toward the west
 * sun, never a stroke). `sq` squashes it into the ground plane.
 */
function stone(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number, seed: number, sq: number, face: string, lit: string,
): void {
  ctx.fillStyle = face;
  ctx.beginPath();
  facetBlob(ctx, x, y, r, seed, 7, sq);
  ctx.fill();
  ctx.fillStyle = lit;
  ctx.beginPath();
  facetBlob(ctx, x - r * 0.26, y - r * 0.3 * sq, r * 0.56, seed ^ 0x35, 6, sq);
  ctx.fill();
}

/** A sack: the burlap blob, its lit crown, the tie at one end. */
function sack(
  ctx: CanvasRenderingContext2D, s: number,
  x: number, y: number, r: number, seed: number, tieSide: number,
): void {
  ctx.fillStyle = SACK;
  ctx.beginPath();
  facetBlob(ctx, x, y, r, seed, 7, 0.68);
  ctx.fill();
  ctx.fillStyle = SACK_LIT;
  ctx.beginPath();
  facetBlob(ctx, x - r * 0.24, y - r * 0.26, r * 0.55, seed ^ 0x4c, 6, 0.68);
  ctx.fill();
  ctx.fillStyle = SACK_TIE;
  ctx.fillRect(x + tieSide * r * 0.8 - s * 0.015, y - s * 0.02, s * 0.03, s * 0.04);
}

// ---------------------------------------------- 512 BrokenCart
/**
 * An overturned farm cart: the bed tipped on its side so its planked
 * UNDERSIDE faces the sun (the one lit facet — a plane the sun never
 * saw while the cart stood), the axle torn off and lying along the
 * bed's foot, one wheel standing against the bed, the other end a
 * bare axle stub, two or three sacks spilled with their corn in the
 * mud. The hash deals the kind: a farm cart (short bed, tailboard),
 * a wain (long bed, high sides), a dray (low bed, its shafts still
 * on). RIG: the farm cart's bed rises to 0.46s (the rig's knee), the
 * wain's to 0.54s (its hip), the dray's to 0.32s. Solid; cart ×3.
 * Static.
 */
function paintBrokenCart(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const ys = rend.camera.yScale;
  const syT = s * ys;
  const baseY = p.y + syT * 0.18;
  const kind = cartKind(h);
  // Which end keeps its wheel: −1 the west end, +1 the east.
  const m = ((h >>> 5) & 1) === 0 ? -1 : 1;
  const bedL = kind === 1 ? 0.92 : kind === 2 ? 0.86 : 0.74;
  const bedH = kind === 1 ? 0.54 : kind === 2 ? 0.32 : 0.46;
  const rail = kind === 2 ? 0.05 : kind === 1 ? 0.1 : 0.07;
  // The bed's foot edge on the ground, W→E with a hashed cant.
  const cant = (((h >>> 7) & 3) - 1.5) * syT * 0.05;
  const ax = p.x - s * bedL * 0.5;
  const ay = baseY + cant;
  const bx = p.x + s * bedL * 0.5;
  const by = baseY - cant;
  const H = s * bedH;
  // The plane leans back and toward the wheel end.
  const skew = m * s * 0.06;
  const P = (t: number, f: number): [number, number] => [ax + (bx - ax) * t + skew * f, ay + (by - ay) * t - H * f];
  const R = s * (kind === 1 ? 0.22 : 0.19);
  const wx = p.x + m * s * (bedL * 0.5 - 0.06);
  const wy = baseY + syT * 0.05 - R;
  const wrot = ((h >>> 9) & 7) * 0.2;
  const sacks = 2 + ((h >>> 12) & 1);
  const stubX = p.x - m * s * (bedL * 0.5 + 0.11);
  return {
    sortY: ty + 0.7,
    // Painted extent: the stub and the wheel to ±0.62s, the wain's
    // rail top 0.8s over baseY, the sacks' seat 0.36s under it.
    body: stationBody(0.66, bedH + rail + 0.3, 0.42),
    // The bed's own ground edge is the honest base: extruded any way
    // the light falls it stays the tipped bed.
    drawShadow: () => rend.castEdgeQuad(ax, ay, bx, by, bedH),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // PASS 1 — primary mass. The seat under the whole wreck, the
      // sacks' seat in front of it, then the bed's underside — the
      // one lit plane — with its west strip a step lighter.
      contact(ctx, p.x, baseY + syT * 0.02, s * (bedL * 0.5 + 0.12), syT * 0.16);
      // The sacks' seat reaches past the burst sack's mouth on the
      // tie side (west), so the spilled corn lies IN a shade, never
      // on open ground where the ring would wheel each kernel.
      contact(ctx, p.x - m * s * 0.06 - s * 0.04, baseY + syT * 0.22, s * 0.5, syT * 0.11);
      const [x00, y00] = P(0, 0);
      const [x10, y10] = P(1, 0);
      const [x11, y11] = P(1, 1);
      const [x01, y01] = P(0, 1);
      ctx.fillStyle = CART_UNDER;
      quad(ctx, x00, y00, x10, y10, x11, y11, x01, y01);
      ctx.fillStyle = CART_UNDER_WEST;
      const [wx0, wy0] = P(0.07, 0);
      const [wx1, wy1] = P(0.07, 1);
      quad(ctx, x00, y00, wx0, wy0, wx1, wy1, x01, y01);
      // The plank seams along the bed — four boards, three seams
      // (depth as value, never a line).
      const seamF = (s * 0.03) / H;
      ctx.fillStyle = CART_SEAM;
      for (const f of [0.25, 0.5, 0.75]) {
        const [sx0, sy0] = P(0, f);
        const [sx1, sy1] = P(1, f);
        const [sx2, sy2] = P(1, f + seamF);
        const [sx3, sy3] = P(0, f + seamF);
        quad(ctx, sx0, sy0, sx1, sy1, sx2, sy2, sx3, sy3);
      }
      // The side board along the top edge: its face leans on back, its
      // top edge lit (TOP-PLANE), its east end grain dark.
      const rv = s * rail;
      ctx.fillStyle = CART_RAIL;
      quad(ctx, x01, y01, x11, y11, x11 + skew * 0.3, y11 - rv, x01 + skew * 0.3, y01 - rv);
      ctx.fillStyle = CART_RAIL_TOP;
      quad(ctx, x01 + skew * 0.3, y01 - rv, x11 + skew * 0.3, y11 - rv, x11 + skew * 0.3, y11 - rv - s * 0.03, x01 + skew * 0.3, y01 - rv - s * 0.03);
      ctx.fillStyle = CART_RAIL_EAST;
      ctx.fillRect(x11 + skew * 0.3 - s * 0.03, y11 - rv, s * 0.03, rv);
      // PASS 2 — secondary structure. The cross-battens under the bed
      // at either end (a bed is battened at its ends, not its middle —
      // the grid that reads as a door is the wrong carpentry): two
      // raised members, each with a dark east edge; the iron strap
      // that held the axle, with its bolt heads, at the middle.
      const bw = (s * 0.05) / (bx - ax);
      for (const t0 of [0.14, 0.86]) {
        const [b0x, b0y] = P(t0 - bw, 0);
        const [b1x, b1y] = P(t0 + bw, 0);
        const [b2x, b2y] = P(t0 + bw, 1);
        const [b3x, b3y] = P(t0 - bw, 1);
        ctx.fillStyle = CART_BATTEN;
        quad(ctx, b0x, b0y, b1x, b1y, b2x, b2y, b3x, b3y);
        const [e0x, e0y] = P(t0 + bw * 0.45, 0);
        const [e1x, e1y] = P(t0 + bw * 0.45, 1);
        ctx.fillStyle = CART_BATTEN_EAST;
        quad(ctx, e0x, e0y, b1x, b1y, b2x, b2y, e1x, e1y);
      }
      const [ix, iy] = P(0.5, 0.42);
      ctx.fillStyle = IRON;
      ctx.fillRect(ix - s * 0.05, iy - s * 0.03, s * 0.1, s * 0.06);
      ctx.fillStyle = IRON_LIT;
      ctx.fillRect(ix - s * 0.05, iy - s * 0.03, s * 0.03, s * 0.06);
      ctx.fillStyle = IRON_DARK;
      ctx.fillRect(ix + s * 0.02, iy - s * 0.015, s * 0.03, s * 0.03);
      // The kind's tell: a tailboard hanging off the stub end (farm
      // cart), the wain's second side board seen edge-on over the
      // first, the dray's two shafts on the ground past the stub.
      if (kind === 0) {
        const tx0 = stubX + m * s * 0.08;
        ctx.fillStyle = CART_OAK;
        quad(ctx, tx0, baseY - s * 0.02, tx0 - m * s * 0.2, baseY - s * 0.3, tx0 - m * s * 0.28, baseY - s * 0.26, tx0 - m * s * 0.08, baseY + syT * 0.02);
        ctx.fillStyle = CART_RAIL_TOP;
        quad(ctx, tx0 - m * s * 0.2, baseY - s * 0.3, tx0 - m * s * 0.28, baseY - s * 0.26, tx0 - m * s * 0.28, baseY - s * 0.23, tx0 - m * s * 0.2, baseY - s * 0.27);
      } else if (kind === 1) {
        const rv2 = s * 0.06;
        ctx.fillStyle = CART_RAIL_EAST;
        quad(ctx, x01 + skew * 0.3, y01 - rv - s * 0.03, x11 + skew * 0.3, y11 - rv - s * 0.03, x11 + skew * 0.45, y11 - rv - s * 0.03 - rv2, x01 + skew * 0.45, y01 - rv - s * 0.03 - rv2);
        ctx.fillStyle = CART_RAIL_TOP;
        quad(ctx, x01 + skew * 0.45, y01 - rv - s * 0.03 - rv2, x11 + skew * 0.45, y11 - rv - s * 0.03 - rv2, x11 + skew * 0.45, y11 - rv - s * 0.06 - rv2, x01 + skew * 0.45, y01 - rv - s * 0.06 - rv2);
      } else {
        for (const k of [0, 1]) {
          const sy0 = baseY - syT * 0.04 + k * syT * 0.18;
          lyingTimber(ctx, ys, stubX + m * s * 0.08, sy0, stubX - m * s * 0.22, sy0 + syT * 0.03, s * 0.028, s * 0.04, SHAFT_DARK, SHAFT);
        }
      }
      // The axle along the bed's foot: a tar-dark beam, its top a step
      // lighter, the bare stub past the far end with its split face.
      const axY = baseY + syT * 0.08;
      lyingTimber(ctx, ys, stubX, axY + (m < 0 ? -cant : cant) * 0.4, wx - m * s * 0.06, axY - (m < 0 ? -cant : cant) * 0.4, s * 0.035, s * 0.06, AXLE, AXLE_TOP);
      ctx.fillStyle = SPLINTER;
      ctx.fillRect(stubX - s * 0.025, axY + (m < 0 ? -cant : cant) * 0.4 - s * 0.06, s * 0.05, s * 0.05);
      ctx.fillStyle = IRON;
      ctx.fillRect(stubX + m * s * 0.06 - s * 0.02, axY - s * 0.065, s * 0.04, s * 0.07);
      // The wheel, upright against the bed: the felloes, the dark
      // between the spokes, four spokes (quads at the hash's turn), the
      // iron nave with its lit corner. The iron tyre is the rim's own
      // darker step — the ring inks its round.
      ctx.fillStyle = WHEEL_RIM;
      ctx.beginPath();
      facetCircle(ctx, wx, wy, R, 10, wrot);
      ctx.fill();
      ctx.fillStyle = WHEEL_BETWEEN;
      ctx.beginPath();
      facetCircle(ctx, wx, wy, R * 0.78, 10, wrot);
      ctx.fill();
      ctx.fillStyle = WHEEL_SPOKE;
      for (let i = 0; i < 4; i++) {
        const a = wrot + 0.3 + (i * Math.PI) / 2;
        const ex = wx + Math.cos(a) * R * 0.8;
        const ey = wy + Math.sin(a) * R * 0.8;
        const nx = -Math.sin(a) * s * 0.018;
        const ny = Math.cos(a) * s * 0.018;
        quad(ctx, wx - nx, wy - ny, ex - nx, ey - ny, ex + nx, ey + ny, wx + nx, wy + ny);
      }
      ctx.fillStyle = IRON;
      ctx.fillRect(wx - s * 0.04, wy - s * 0.04, s * 0.08, s * 0.08);
      ctx.fillStyle = IRON_LIT;
      ctx.fillRect(wx - s * 0.04, wy - s * 0.04, s * 0.03, s * 0.03);
      // PASS 3 — tertiary life. The sacks spilled in front, the first
      // burst: its corn in squares inside the sacks' seat.
      // The burst sack is the first (west) one, its tie torn on its
      // west side: the corn fans from that mouth, in front of the
      // sack's foot, every kernel touching the pile it fell from.
      let mouthX = 0;
      let mouthY = 0;
      for (let i = 0; i < sacks; i++) {
        const sx = p.x - m * s * 0.06 + (i - (sacks - 1) * 0.5) * s * 0.24 + (((h >>> (14 + i * 2)) & 3) - 1.5) * s * 0.03;
        const sy = baseY + syT * (0.2 + ((h >>> (18 + i)) & 1) * 0.06);
        const r = s * (0.12 + ((h >>> (20 + i)) & 1) * 0.02);
        sack(ctx, s, sx, sy, r, h ^ (0x2b + i * 0x31), i === 0 ? -1 : 1);
        if (i === 0) {
          mouthX = sx - r * 0.7;
          mouthY = sy + syT * 0.04;
        }
      }
      ctx.fillStyle = GRAIN;
      for (let i = 0; i < 5; i++) {
        // A fan from the mouth toward the west and south (the sack
        // lies on the tie): angles from 0.55π to 1.35π, radii 0.03..0.1s.
        const ga = Math.PI * (0.55 + (i / 4) * 0.8) + (((h >>> (22 + i)) & 1) - 0.5) * 0.25;
        const gr = s * (0.03 + (i % 2) * 0.035 + ((h >>> (24 + i)) & 1) * 0.03);
        ctx.fillRect(mouthX + Math.cos(ga) * gr - s * 0.015, mouthY - Math.sin(ga) * gr * 0.5 - s * 0.015, s * 0.03, s * 0.03);
      }
      // PASS 4 — re-read: oak (6 values), tar (2), iron (3), sacking
      // (3), corn; the underside is the one lit facet; every rect
      // ≥0.03s, nothing stroked, nothing rotated, no clock.
    },
  };
}

// ---------------------------------------------- 513 FieldLitter
/**
 * What a shield wall drops: walkable ground litter in four hashed
 * layouts — a shield half with its boss, a snapped spear with a rag
 * through it, a dropped helm on its side, two arrows standing in the
 * turf. RIG: everything lies under the rig's shin (the standing
 * arrows reach 0.36s). Walkable; no collider; the server may spawn
 * it. Static (STATIC_RING_TILES).
 */
function paintFieldLitter(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const ys = rend.camera.yScale;
  const syT = s * ys;
  const baseY = p.y + syT * 0.18;
  const layout = litterLayout(h);
  const charge = litterCharge(h);
  const dye = FIELD_SET[charge]!;
  const dyeSeam = FIELD_SEAM[charge]!;
  const dyeBend = FIELD_BEND[charge]!;
  const turn = ((h >>> 8) & 7) * 0.35;
  const cx = p.x + (((h >>> 11) & 3) - 1.5) * s * 0.05;
  const cy = baseY - syT * 0.06;
  // The seat is the litter's own size: the shield and the helm sit
  // in a broad pan, the spear's two halves in a long one, and the
  // two standing arrows seat only at their own feet (a broad shade
  // under two shafts reads as a hole, not as litter).
  const seatRx = layout === 0 ? 0.34 : layout === 1 ? 0.38 : layout === 2 ? 0.24 : 0;
  const seatRy = layout === 1 ? 0.12 : 0.14;
  return {
    sortY: ty + 0.4,
    // Painted extent: the litter to ±0.42s, the arrows' tips 0.44s
    // over baseY, the seat 0.16s under it.
    body: stationBody(0.46, 0.48, 0.3),
    drawShadow: () =>
      seatRx > 0
        ? rend.castContact(p.x, baseY, s * seatRx, syT * seatRy)
        : rend.castContact(cx, cy + syT * 0.06, s * 0.2, syT * 0.06),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      if (seatRx > 0) contact(ctx, cx, cy + syT * 0.06, s * seatRx, syT * seatRy);
      if (layout === 0) {
        // THE SHIELD HALF: a round shield split down its middle, the
        // half lying face-up. The iron rim is the half-disc under; the
        // linden shows along the split; the field dye on the board; a
        // darker bend across it (its one charge); the boss on the split.
        const R = s * 0.3;
        const half = (r: number, ink: string): void => {
          ctx.fillStyle = ink;
          ctx.beginPath();
          for (let i = 0; i <= 5; i++) {
            const a = turn + (i / 5) * Math.PI;
            const vx = cx + Math.cos(a) * r;
            const vy = cy + Math.sin(a) * r * 0.55;
            if (i === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
          }
          ctx.closePath();
          ctx.fill();
        };
        half(R, IRON);
        half(R * 0.86, dye);
        // The boards run across the split: two dark seams, then the
        // split's own edge grain — the linden strip along the diameter.
        const sx = Math.cos(turn);
        const sy = Math.sin(turn) * 0.55;
        const qx = Math.cos(turn + Math.PI * 0.5);
        const qy = Math.sin(turn + Math.PI * 0.5) * 0.55;
        ctx.fillStyle = dyeSeam;
        for (const u of [-0.42, 0.42]) {
          const ox = cx + sx * R * u;
          const oy = cy + sy * R * u;
          const rr = R * 0.84 * Math.sqrt(1 - u * u);
          // Each seam 0.03s wide (BLOCK LAW's minimum feature).
          quad(ctx, ox - sx * s * 0.015, oy - sy * s * 0.015, ox + sx * s * 0.015, oy + sy * s * 0.015, ox + sx * s * 0.015 + qx * rr, oy + sy * s * 0.015 + qy * rr, ox - sx * s * 0.015 + qx * rr, oy - sy * s * 0.015 + qy * rr);
        }
        ctx.fillStyle = LINDEN;
        quad(ctx, cx - sx * R * 0.86, cy - sy * R * 0.86, cx + sx * R * 0.86, cy + sy * R * 0.86, cx + sx * R * 0.86 - qx * s * 0.045, cy + sy * R * 0.86 - qy * s * 0.045, cx - sx * R * 0.86 - qx * s * 0.045, cy - sy * R * 0.86 - qy * s * 0.045);
        // The bend: a quad from the split's centre toward the rim.
        const ba = turn + Math.PI * 0.5;
        const bx1 = cx + Math.cos(ba) * R * 0.72;
        const by1 = cy + Math.sin(ba) * R * 0.72 * 0.55;
        const bnx = -Math.sin(ba) * s * 0.035;
        const bny = Math.cos(ba) * s * 0.035 * 0.55;
        ctx.fillStyle = dyeBend;
        quad(ctx, cx - bnx, cy - bny, bx1 - bnx, by1 - bny, bx1 + bnx, by1 + bny, cx + bnx, cy + bny);
        // The boss sits on the split edge: iron, its west corner lit.
        ctx.fillStyle = IRON;
        ctx.beginPath();
        facetCircle(ctx, cx, cy, s * 0.085, 7, turn, 0.6);
        ctx.fill();
        ctx.fillStyle = IRON_LIT;
        ctx.fillRect(cx - s * 0.05, cy - s * 0.03, s * 0.03, s * 0.03);
        // Two rivets along the split.
        ctx.fillStyle = IRON_DARK;
        ctx.fillRect(cx + Math.cos(turn) * R * 0.6 - s * 0.015, cy + Math.sin(turn) * R * 0.6 * 0.55 - s * 0.015, s * 0.03, s * 0.03);
        ctx.fillRect(cx - Math.cos(turn) * R * 0.6 - s * 0.015, cy - Math.sin(turn) * R * 0.6 * 0.55 - s * 0.015, s * 0.03, s * 0.03);
      } else if (layout === 1) {
        // THE SNAPPED SPEAR: the head half and the butt half lying at
        // a broken angle, a splinter square at each break, the iron
        // head with its lit facet, a red rag caught on the butt.
        const a = turn * 0.4 - 0.3;
        const ux = Math.cos(a);
        const uy = Math.sin(a) * ys;
        const hx0 = cx - ux * s * 0.36;
        const hy0 = cy - uy * s * 0.36;
        const hx1 = cx + ux * s * 0.06;
        const hy1 = cy + uy * s * 0.06;
        thinShaft(ctx, hx0, hy0, hx1, hy1, s * 0.05, SHAFT, SHAFT_LIT);
        // The head: a socket square and the blade, west facet lit.
        ctx.fillStyle = IRON;
        ctx.fillRect(hx0 - s * 0.03, hy0 - s * 0.03, s * 0.06, s * 0.06);
        const tipx = hx0 - ux * s * 0.2;
        const tipy = hy0 - uy * s * 0.2;
        const nnx = -uy * s * 0.05;
        const nny = ux * s * 0.05;
        ctx.fillStyle = IRON_LIT;
        tri(ctx, hx0 - nnx, hy0 - nny, tipx, tipy, hx0, hy0);
        ctx.fillStyle = IRON;
        tri(ctx, hx0, hy0, tipx, tipy, hx0 + nnx, hy0 + nny);
        // The butt half, kinked 30° off, the break's splinter pale.
        const b = a + 0.55;
        const vx = Math.cos(b);
        const vy = Math.sin(b) * ys;
        const bx0 = hx1 + s * 0.03;
        const by0 = hy1 + syT * 0.05;
        const bx1 = bx0 + vx * s * 0.34;
        const by1 = by0 + vy * s * 0.34;
        thinShaft(ctx, bx0, by0, bx1, by1, s * 0.05, SHAFT, SHAFT_LIT);
        ctx.fillStyle = SPLINTER;
        ctx.fillRect(hx1 - s * 0.015, hy1 - s * 0.025, s * 0.03, s * 0.04);
        ctx.fillRect(bx0 - s * 0.015, by0 - s * 0.025, s * 0.03, s * 0.04);
        // The rag: a torn quad draped over the butt half, its fold a
        // step darker where it doubles.
        const rx = bx0 + vx * s * 0.17;
        const ry = by0 + vy * s * 0.17;
        ctx.fillStyle = SCAR_RAG_RED;
        quad(ctx, rx - s * 0.1, ry - syT * 0.08, rx + s * 0.08, ry - syT * 0.1, rx + s * 0.12, ry + syT * 0.06, rx - s * 0.06, ry + syT * 0.09);
        ctx.fillStyle = RAG_FOLD;
        quad(ctx, rx - s * 0.06, ry + syT * 0.09, rx + s * 0.12, ry + syT * 0.06, rx + s * 0.09, ry + syT * 0.11, rx - s * 0.03, ry + syT * 0.13);
      } else if (layout === 2) {
        // THE DROPPED HELM: a nasal helm on its side, the open face to
        // the east. Iron on the ground must not read as a stone, so
        // the helm carries THREE value steps the stone never has: the
        // dome's broad west sheen (its one lit facet) with a glint on
        // its crown, the LIT RIM of the opening — a ring of brighter
        // iron round the dark hollow — and the brow band's rivet
        // heads catching the sun along the rim; the nasal bar lies
        // out past the rim on the ground. One dent on the dome.
        // A dome is three values, not one: the mid iron over the whole
        // round, the dark crescent on its south-east (away from the
        // sun), the pale sheen on its north-west, the glint on top.
        const R = s * 0.22;
        ctx.fillStyle = IRON_LIT;
        ctx.beginPath();
        facetCircle(ctx, cx, cy, R, 9, turn, 0.8);
        ctx.fill();
        ctx.fillStyle = IRON;
        ctx.beginPath();
        facetCircle(ctx, cx + R * 0.22, cy + R * 0.2, R * 0.72, 8, turn + 0.2, 0.8);
        ctx.fill();
        ctx.fillStyle = IRON_LIT;
        ctx.beginPath();
        facetCircle(ctx, cx - R * 0.06, cy - R * 0.06, R * 0.62, 8, turn + 0.2, 0.8);
        ctx.fill();
        ctx.fillStyle = IRON_GLINT;
        ctx.beginPath();
        facetCircle(ctx, cx - R * 0.34, cy - R * 0.32, R * 0.34, 7, turn + 0.4, 0.8);
        ctx.fill();
        // The opening on the east flank: its lit rim, then the hollow.
        ctx.fillStyle = IRON_GLINT;
        ctx.beginPath();
        facetCircle(ctx, cx + R * 0.68, cy + R * 0.06, R * 0.5, 8, turn + 0.8, 1.15);
        ctx.fill();
        ctx.fillStyle = HELM_HOLLOW;
        ctx.beginPath();
        facetCircle(ctx, cx + R * 0.7, cy + R * 0.08, R * 0.36, 7, turn + 0.8, 1.15);
        ctx.fill();
        // The nasal: a bar from the brow out past the rim, its lit top.
        ctx.fillStyle = IRON_DARK;
        ctx.fillRect(cx + R * 0.86, cy - R * 0.52, s * 0.035, s * 0.16);
        ctx.fillStyle = IRON_GLINT;
        ctx.fillRect(cx + R * 0.86, cy - R * 0.52, s * 0.035, s * 0.03);
        // Three rivet heads along the brow band where the rim meets
        // the dome; the dent on the dome's south, a dark square.
        ctx.fillStyle = IRON_GLINT;
        ctx.fillRect(cx + R * 0.3 - s * 0.015, cy - R * 0.72, s * 0.03, s * 0.03);
        ctx.fillRect(cx + R * 0.42 - s * 0.015, cy - R * 0.2, s * 0.03, s * 0.03);
        ctx.fillRect(cx + R * 0.3 - s * 0.015, cy + R * 0.5, s * 0.03, s * 0.03);
        ctx.fillStyle = IRON_DARK;
        ctx.fillRect(cx - R * 0.2 + (((h >>> 14) & 1) * R * 0.3), cy + R * 0.2, s * 0.05, s * 0.04);
      } else {
        // TWO ARROWS STANDING: shot into the turf and left, each
        // leaning its own way, its fletching in two of the four
        // colours (the post's deal, so a post and its litter agree).
        // Each arrow: a shaft of 0.035s leaning its own way, two
        // fletch vanes (one each side of the shaft, the near one a
        // step lower) and the nock square; a small seat at its foot.
        const [fa, fb] = fletchPair(h);
        for (let i = 0; i < 2; i++) {
          const fx = cx + (i === 0 ? -1 : 1) * s * (0.12 + ((h >>> (14 + i)) & 1) * 0.06);
          const fy = cy + syT * (i === 0 ? 0.04 : -0.04);
          const lean = (((h >>> (16 + i * 2)) & 3) - 1.5) * s * 0.09;
          const tipx = fx + lean;
          const tipy = fy - s * 0.4;
          contact(ctx, fx, fy + syT * 0.02, s * 0.08, syT * 0.035);
          thinShaft(ctx, fx, fy, tipx, tipy, s * 0.035, SHAFT, SHAFT_LIT);
          ctx.fillStyle = FLETCH_SET[i === 0 ? fa : fb]!;
          ctx.fillRect(tipx - s * 0.055, tipy + s * 0.035, s * 0.05, s * 0.05);
          ctx.fillRect(tipx + s * 0.01, tipy + s * 0.07, s * 0.04, s * 0.05);
          ctx.fillStyle = NOCK;
          ctx.fillRect(tipx - s * 0.0175, tipy - s * 0.005, s * 0.035, s * 0.035);
        }
      }
      // PASS 4 — re-read: iron (3 values), linden, one field dye and
      // its bend, shaft (2), rag (2), fletch (2); every rect ≥0.03s;
      // every layout lies inside the one seat; no clock.
    },
  };
}

// ---------------------------------------------- 514 ArrowPost
/**
 * A squared oak post that stood where the line did not: its top split
 * by a blade, five to eight arrows in it fanning at the hash's angles,
 * their fletchings in two of the country's four colours, and one
 * shaft that broke on the post lying at its foot. RIG: the post tops
 * at 1.0s (the rig's chin), the split prongs at 1.06s. Solid r.2;
 * post ×2. Static.
 */
function paintArrowPost(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const ys = rend.camera.yScale;
  const syT = s * ys;
  const baseY = p.y + syT * 0.18;
  const W = s * 0.14;
  const H = s * 1.0;
  const lean = (((h >>> 3) & 3) - 1.5) * s * 0.012;
  const topX = p.x + lean;
  const topY = baseY - H;
  const n = arrowCount(h);
  const [fa, fb] = fletchPair(h);
  const cleftSide = ((h >>> 14) & 1) === 0 ? -1 : 1;
  // The line stood on ONE side: every arrow entered the post from the
  // archers' side and its nock still points back at them — arrows
  // fanned both ways read as a dead sapling, not as a volley. One
  // stray (a hashed half of the posts) came from behind.
  const shotSide = ((h >>> 15) & 1) === 0 ? -1 : 1;
  const stray = ((h >>> 28) & 1) === 0;
  return {
    sortY: ty + 0.66,
    // Painted extent: the arrows reach 0.5s off the post, the prongs
    // 1.08s over baseY, the broken shaft's seat 0.2s under it.
    body: stationBody(0.54, 1.2, 0.36),
    drawShadow: () => rend.castEdgeQuad(p.x - W * 0.5, baseY, p.x + W * 0.5, baseY, 0.98),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // PASS 1 — primary mass: the seat, the post with its lit west
      // strip and dark east strip, the split top — two prongs with
      // their lit tops (TOP-PLANE) and the dark cleft between.
      // The seat reaches to where the broken shaft's head lies.
      contact(ctx, p.x, baseY + s * 0.01, s * 0.38, syT * 0.1);
      shaft(ctx, p.x, baseY, topX, topY + s * 0.08, W, POST_OAK, POST_OAK_WEST, POST_OAK_EAST, s * 0.03, s * 0.03);
      const pl = topX - W * 0.5;
      const prongW = s * 0.055;
      // The taller prong keeps the hash's side; the cleft runs down
      // 0.22s between them, dark inside, its floor the pale split
      // wood a blade opened.
      const tallL = cleftSide < 0;
      const lTop = topY + (tallL ? 0 : s * 0.03);
      const rTop = topY + (tallL ? s * 0.03 : 0);
      ctx.fillStyle = POST_OAK;
      ctx.fillRect(pl, lTop, prongW, s * 0.08 + (tallL ? 0 : -s * 0.03) + s * 0.001);
      ctx.fillRect(pl + W - prongW, rTop, prongW, s * 0.08 + (tallL ? -s * 0.03 : 0) + s * 0.001);
      ctx.fillStyle = POST_CLEFT;
      ctx.fillRect(pl + prongW, topY + s * 0.02, W - prongW * 2, s * 0.22);
      ctx.fillStyle = SPLINTER;
      ctx.fillRect(pl + prongW, topY + s * 0.2, W - prongW * 2, s * 0.04);
      ctx.fillStyle = POST_OAK_WEST;
      ctx.fillRect(pl, lTop, s * 0.03, s * 0.05);
      // TOP-PLANE: each prong's lit top is the post's full depth seen
      // at the camera's foreshortening (W·yScale), not a sliver.
      const topD = W * ys;
      ctx.fillStyle = POST_OAK_TOP;
      ctx.fillRect(pl, lTop - topD, prongW, topD);
      ctx.fillRect(pl + W - prongW, rTop - topD, prongW, topD);
      // Weather checks on the face: two dark squares the hash seats.
      ctx.fillStyle = POST_CHECK;
      ctx.fillRect(p.x - s * 0.015 + lean * 0.5, baseY - s * (0.28 + ((h >>> 16) & 3) * 0.06), s * 0.03, s * 0.09);
      ctx.fillRect(p.x + s * 0.02 + lean * 0.7, baseY - s * (0.62 + ((h >>> 18) & 3) * 0.05), s * 0.03, s * 0.06);
      // PASS 2 — secondary: the arrows. Each enters the post's face at
      // its own height and leaves it on the archers' side at the
      // hash's pitch — a lobbed shaft sticks nock-UP, a flat one
      // level; nothing droops (an arrow in oak holds) — a thin quad
      // with its lit strip; two fletch squares in one of the post's
      // two colours, the nock a dark square.
      for (let i = 0; i < n; i++) {
        const f = 0.16 + (i * 0.66) / (n - 1);
        const ey = topY + s * f;
        const side = stray && i === n - 1 ? -shotSide : shotSide;
        const ang = -0.5 + ((h >>> (13 + i * 2)) & 3) * 0.18;
        const len = s * (0.3 + ((h >>> (20 + i)) & 1) * 0.08);
        const ex = topX + lean * -f + side * W * 0.5 - side * s * 0.02;
        const tx1 = ex + side * Math.cos(ang) * len;
        const ty1 = ey + Math.sin(ang) * len;
        thinShaft(ctx, ex, ey, tx1, ty1, s * 0.035, SHAFT, SHAFT_LIT);
        ctx.fillStyle = FLETCH_SET[((h >>> (24 + i)) & 1) === 0 ? fa : fb]!;
        const ux = side * Math.cos(ang);
        const uy = Math.sin(ang);
        ctx.fillRect(tx1 - ux * s * 0.1 - s * 0.02, ty1 - uy * s * 0.1 - s * 0.035, s * 0.04, s * 0.04);
        ctx.fillRect(tx1 - ux * s * 0.05 - s * 0.015, ty1 - uy * s * 0.05 - s * 0.005, s * 0.03, s * 0.03);
        ctx.fillStyle = NOCK;
        ctx.fillRect(tx1 - s * 0.015, ty1 - s * 0.015, s * 0.03, s * 0.03);
      }
      // PASS 3 — tertiary: the one that broke. Its butt half lies in
      // the post's seat with its fletching, the head half a hand off
      // with the iron point; both splinters pale.
      // Both halves lie inside the post's seat (±0.38s).
      const gx = p.x + cleftSide * s * 0.08;
      const gy = baseY + syT * 0.03;
      thinShaft(ctx, gx - s * 0.16, gy + syT * 0.02, gx + s * 0.06, gy - syT * 0.02, s * 0.035, SHAFT_DARK, SHAFT);
      ctx.fillStyle = FLETCH_SET[fa]!;
      ctx.fillRect(gx - s * 0.16, gy - s * 0.03, s * 0.04, s * 0.04);
      ctx.fillStyle = SPLINTER;
      ctx.fillRect(gx + s * 0.05, gy - s * 0.03, s * 0.03, s * 0.03);
      thinShaft(ctx, gx + s * 0.1, gy + syT * 0.05, gx + s * 0.2, gy + syT * 0.02, s * 0.035, SHAFT_DARK, SHAFT);
      ctx.fillStyle = IRON;
      tri(ctx, gx + s * 0.2, gy + syT * 0.02 - s * 0.025, gx + s * 0.26, gy + syT * 0.01, gx + s * 0.2, gy + syT * 0.02 + s * 0.025);
      // PASS 4 — re-read: oak (6 values), shaft (3), fletch (2 of 4),
      // iron; one lit facet on the post; every rect ≥0.03s; no clock.
    },
  };
}

// ---------------------------------------------- 515 FallenBanner
/**
 * A standard down: the staff's stump still driven with its split
 * top, the rest of the staff lying across the tile with its crossbar,
 * the cloth spilled on the ground beside it in one of the four field
 * dyes — the main sheet, a fold doubled over it, a lifted flap — its
 * hem torn, and one loose corner that the breeze lifts (≤0.05s). RIG:
 * the stump tops at 0.3s (the rig's shin); everything else lies.
 * Solid; banner ×2. Rides the fast ring cadence for the corner.
 */
function paintFallenBanner(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, t, tx, ty, stationBody } = env;
  const ys = rend.camera.yScale;
  const syT = s * ys;
  const baseY = p.y + syT * 0.18;
  const m = ((h >>> 2) & 1) === 0 ? -1 : 1;
  const dyeIx = bannerDye(h);
  const dye = FIELD_SET[dyeIx]!;
  const dyeFold = FIELD_FOLD[dyeIx]!;
  const dyeHem = FIELD_HEM[dyeIx]!;
  const dyeLift = FIELD_LIFT[dyeIx]!;
  const W = s * 0.1;
  const stumpX = p.x - m * s * 0.3;
  const stumpH = s * 0.3;
  // The staff from the break to the far corner, lying on the ground.
  const sx0 = stumpX + m * s * 0.08;
  const sy0 = baseY - syT * 0.02;
  const sx1 = stumpX + m * s * 0.86;
  const sy1 = baseY + syT * (0.1 + ((h >>> 8) & 3) * 0.03);
  const ph = breezePhase(h, 10);
  return {
    sortY: ty + 0.5,
    // Painted extent: the staff's head to 0.56s past centre, the stump
    // 0.34s over baseY, the cloth's hem 0.4s under it.
    body: stationBody(0.6, 0.48, 0.44),
    drawShadow: () => rend.castEdgeQuad(stumpX - W * 0.5, baseY, stumpX + W * 0.5, baseY, 0.3),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // ONE BREEZE, held to the corner's law (0.05s).
      const { sw, lg } = breeze(rend, tx, ty, t, ph, s, 0.05);
      // PASS 1 — primary mass: the seats, the stump with its split
      // top, the staff lying with its lit top plane and iron shoe.
      contact(ctx, stumpX, baseY + s * 0.01, s * 0.14, syT * 0.07);
      contact(ctx, (sx0 + sx1) * 0.5, (sy0 + sy1) * 0.5 + syT * 0.12, s * 0.46, syT * 0.16);
      shaft(ctx, stumpX, baseY, stumpX, baseY - stumpH + s * 0.06, W, STAFF, STAFF_WEST, STAFF_EAST, s * 0.03, s * 0.03);
      ctx.fillStyle = STAFF;
      ctx.fillRect(stumpX - W * 0.5, baseY - stumpH, s * 0.035, s * 0.07);
      ctx.fillRect(stumpX + W * 0.5 - s * 0.035, baseY - stumpH + s * 0.03, s * 0.035, s * 0.04);
      ctx.fillStyle = SPLINTER;
      ctx.fillRect(stumpX - s * 0.015, baseY - stumpH + s * 0.02, s * 0.03, s * 0.03);
      ctx.fillStyle = STAFF_TOP;
      ctx.fillRect(stumpX - W * 0.5, baseY - stumpH - s * 0.03, s * 0.035, s * 0.03);
      lyingTimber(ctx, ys, sx0, sy0, sx1, sy1, s * 0.03, s * 0.05, STAFF_EAST, STAFF_TOP, STAFF_EAST);
      ctx.fillStyle = SPLINTER;
      ctx.fillRect(sx0 - s * 0.02, sy0 - s * 0.05, s * 0.04, s * 0.04);
      // The crossbar near the head, across the staff; the iron finial
      // socket past it.
      const cbx = sx0 + (sx1 - sx0) * 0.8;
      const cby = sy0 + (sy1 - sy0) * 0.8;
      lyingTimber(ctx, ys, cbx - s * 0.03, cby - syT * 0.2, cbx + s * 0.03, cby + syT * 0.2, s * 0.025, s * 0.04, STAFF_EAST, STAFF_TOP);
      ctx.fillStyle = IRON;
      ctx.fillRect(sx1 - s * 0.02, sy1 - s * 0.06, s * 0.05, s * 0.06);
      ctx.fillStyle = IRON_LIT;
      ctx.fillRect(sx1 - s * 0.02, sy1 - s * 0.06, s * 0.03, s * 0.03);
      // PASS 2 — secondary: the cloth on the ground beside the staff,
      // still nailed along the crossbar's stretch. It lies, so it is
      // the lit plane; it fell, so nothing on it is square: the sheet
      // is an irregular polygon with two torn notches in its hem, two
      // crumple RIDGES run diagonally across it (a dark fold with its
      // lit face beside it — a ridge, never a rectangle), the far hem
      // a step darker, and the loose far corner lifts with the breeze,
      // its hem neighbours riding half of it.
      const c0x = cbx - s * 0.02;
      const c0y = cby - syT * 0.16;
      const c1x = cbx + s * 0.02;
      const c1y = cby + syT * 0.18;
      const spill = -m; // the cloth falls away from the stump's side
      const dxw = spill * s * 0.5;
      const dyw = syT * 0.1;
      // Sheet space: u along the spill (0 at the bar, 1 at the loose
      // edge), v down the bar (0 at its head, 1 at its foot); k is how
      // much of the breeze a vertex rides.
      const sx = (u: number, v: number, k = 0): number => c0x + (c1x - c0x) * v + dxw * u + sw * k;
      const sy = (u: number, v: number, k = 0): number => c0y + (c1y - c0y) * v + dyw * u * (0.6 + v * 0.8) + lg * k;
      ctx.fillStyle = dye;
      ctx.beginPath();
      ctx.moveTo(sx(0, 0), sy(0, 0));
      ctx.lineTo(sx(0, 1), sy(0, 1));
      ctx.lineTo(sx(0.3, 1.12), sy(0.3, 1.12));
      ctx.lineTo(sx(0.5, 0.95), sy(0.5, 0.95));
      ctx.lineTo(sx(0.66, 1.18), sy(0.66, 1.18));
      ctx.lineTo(sx(0.84, 1.0), sy(0.84, 1.0));
      ctx.lineTo(sx(1, 1.05, 1), sy(1, 1.05, 1));
      ctx.lineTo(sx(1.02, 0.55, 0.5), sy(1.02, 0.55, 0.5));
      ctx.lineTo(sx(0.9, 0.15), sy(0.9, 0.15));
      ctx.lineTo(sx(0.62, -0.1), sy(0.62, -0.1));
      ctx.lineTo(sx(0.3, -0.04), sy(0.3, -0.04));
      ctx.closePath();
      ctx.fill();
      const ridge = (u0: number, v0: number, u1: number, v1: number): void => {
        ctx.fillStyle = dyeFold;
        quad(ctx, sx(u0, v0), sy(u0, v0), sx(u1, v1), sy(u1, v1), sx(u1 + 0.06, v1 + 0.12), sy(u1 + 0.06, v1 + 0.12), sx(u0 + 0.06, v0 + 0.12), sy(u0 + 0.06, v0 + 0.12));
        ctx.fillStyle = dyeLift;
        quad(ctx, sx(u0 - 0.05, v0 - 0.08), sy(u0 - 0.05, v0 - 0.08), sx(u1 - 0.05, v1 - 0.08), sy(u1 - 0.05, v1 - 0.08), sx(u1, v1), sy(u1, v1), sx(u0, v0), sy(u0, v0));
      };
      ridge(0.12, 0.15, 0.62, 0.75);
      ridge(0.4, -0.02, 0.86, 0.5);
      ctx.fillStyle = dyeHem;
      quad(ctx, sx(0.84, 1.0), sy(0.84, 1.0), sx(1, 1.05, 1), sy(1, 1.05, 1), sx(0.96, 0.98, 0.6), sy(0.96, 0.98, 0.6), sx(0.84, 0.94), sy(0.84, 0.94));
      // PASS 3 — tertiary: the nail heads still in the crossbar where
      // the cloth tore free of it — two iron squares; the mud on the
      // stump's foot, a dark square.
      ctx.fillStyle = IRON;
      ctx.fillRect(cbx - s * 0.015, cby - syT * 0.12, s * 0.03, s * 0.03);
      ctx.fillRect(cbx - s * 0.015, cby + syT * 0.1, s * 0.03, s * 0.03);
      ctx.fillStyle = STAFF_EAST;
      ctx.fillRect(stumpX - W * 0.5, baseY - s * 0.05, W, s * 0.05);
      // PASS 4 — re-read: staff (4 values), one field dye (4 steps),
      // iron (2), splinter; one lit facet on the stump; the corner
      // and its hem neighbours are the only vertices that breathe.
    },
  };
}

// ---------------------------------------------- 516/517 the cairns
/** Where the cone's stones sit (x in s, y in s above baseY, r in s),
 *  foot row first, by row — eight seats, the count takes the first
 *  of each row it needs. */
interface Seat { x: number; y: number; r: number; row: number }
const CONE_SEATS: readonly Seat[] = [
  { x: -0.2, y: 0.07, r: 0.135, row: 0 },
  { x: 0.02, y: 0.08, r: 0.14, row: 0 },
  { x: 0.24, y: 0.07, r: 0.13, row: 0 },
  { x: -0.34, y: 0.04, r: 0.11, row: 0 },
  { x: -0.11, y: 0.22, r: 0.125, row: 1 },
  { x: 0.13, y: 0.23, r: 0.12, row: 1 },
  { x: 0.33, y: 0.18, r: 0.1, row: 1 },
  { x: 0.01, y: 0.37, r: 0.115, row: 2 },
];
/** The cone's seat order for n stones: three rows, the crown last. */
function coneSeats(n: number): readonly Seat[] {
  // n=6: 3 foot + 2 mid + 1 crown; n=7: 3+3+1; n=8: 4+3+1.
  const foot = n >= 8 ? 4 : 3;
  const mid = n - foot - 1;
  const out: Seat[] = [];
  for (let i = 0; i < foot; i++) out.push(CONE_SEATS[i]!);
  for (let i = 0; i < mid; i++) out.push(CONE_SEATS[4 + i]!);
  out.push(CONE_SEATS[7]!);
  return out;
}
/** Where the same stones lie when the cairn is down (x, y in s). */
const FALLEN_LIE: readonly number[] = [
  -0.36, 0.04,
  -0.12, 0.12,
  0.2, 0.1,
  0.4, -0.02,
  -0.28, -0.14,
  0.06, -0.08,
  0.3, -0.18,
  -0.06, 0.24,
];

/**
 * The country's plainest grave: six to eight rounded field stones in
 * a squat cone, one flat marker standing at its north with its lit
 * west edge, moss on the stones that face north, a clay cup left at
 * the foot. The stones stay PALE (the MournerStatue precedent). One
 * cairn in eight was re-stacked by the digmasters: one stone wrong,
 * the town's warmer stone where a grey one should be. RIG: the crown
 * stone at 0.48s (the rig's knee), the marker's top at 0.6s (its
 * hip). Solid r.34; not destructible (the graves law). Static.
 */
function paintFieldCairn(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  const n = cairnStones(h);
  const seats = coneSeats(n);
  const wrong = cairnOneWrong(h) ? 4 + ((h >>> 15) & 1) : -1;
  const markerX = p.x + (((h >>> 9) & 3) - 1.5) * s * 0.06;
  const mW = s * 0.26;
  const mTop = baseY - s * 0.6;
  const mFoot = baseY - s * 0.28;
  const cupSeat = (h >>> 17) & 3;
  const cupX = p.x + (cupSeat - 1.5) * s * 0.18;
  return {
    sortY: ty + 0.68,
    // Painted extent: stones to ±0.46s, the marker's top plane 0.64s
    // over baseY, the cup's seat 0.2s under it.
    body: stationBody(0.5, 0.7, 0.36),
    drawShadow: () => rend.castBlob(p.x, baseY, 0.5, s * 0.36, h ^ 0x51),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // PASS 1 — primary mass: the seat, the foot row, then the
      // marker (behind the upper rows), then the upper rows over it.
      contact(ctx, p.x, baseY + s * 0.02, s * 0.42, syT * 0.14);
      const paintRow = (row: number): void => {
        for (let i = 0; i < seats.length; i++) {
          const st = seats[i]!;
          if (st.row !== row) continue;
          const jx = (((h >>> (4 + i * 2)) & 3) - 1.5) * s * 0.012;
          const face = i === wrong ? STONE_FOREIGN : ((h >>> (11 + i)) & 1) === 0 ? STONE_COOL : STONE_WARM;
          const lit = i === wrong ? STONE_FOREIGN_LIT : STONE_LIT;
          // The stone's under-shade against the one it rests on.
          if (row > 0) {
            ctx.fillStyle = STONE_UNDER;
            ctx.beginPath();
            facetBlob(ctx, p.x + st.x * s + jx, baseY - st.y * s + s * 0.03, st.r * s * 1.02, h ^ (0x17 + i * 0x29), 7, 0.8);
            ctx.fill();
          }
          stone(ctx, p.x + st.x * s + jx, baseY - st.y * s, st.r * s, h ^ (0x17 + i * 0x29), 0.8, face, lit);
        }
      };
      paintRow(0);
      // The marker: a flat slab standing on edge at the cairn's north,
      // its face the plain grey, the west edge lit, the east dark, the
      // top plane lit (TOP-PLANE), one chiselled mark near its head.
      ctx.fillStyle = STONE;
      ctx.fillRect(markerX - mW * 0.5, mTop, mW, mFoot - mTop);
      ctx.fillStyle = STONE_LIT;
      ctx.fillRect(markerX - mW * 0.5, mTop, s * 0.035, mFoot - mTop);
      ctx.fillStyle = STONE_EAST;
      ctx.fillRect(markerX + mW * 0.5 - s * 0.03, mTop, s * 0.03, mFoot - mTop);
      ctx.fillStyle = STONE_TOP;
      ctx.fillRect(markerX - mW * 0.5, mTop - syT * 0.05, mW, syT * 0.05);
      // The one chiselled mark: a single sunk cut near the head — the
      // country had no time for a name, only for a stroke that says
      // "one" (never a sign of any faith; the plainest grave).
      ctx.fillStyle = STONE_EAST;
      ctx.fillRect(markerX - s * 0.015, mTop + s * 0.06, s * 0.03, s * 0.12);
      paintRow(1);
      paintRow(2);
      // PASS 2 — secondary: the moss chips on the north faces — the
      // crown stone's back and the marker's foot where the shade
      // keeps them, two or three squares.
      ctx.fillStyle = GY_MOSS;
      const crown = seats[seats.length - 1]!;
      ctx.fillRect(p.x + crown.x * s - s * 0.06, baseY - crown.y * s - s * 0.07, s * 0.05, s * 0.035);
      ctx.fillRect(p.x + crown.x * s + s * 0.02, baseY - crown.y * s - s * 0.08, s * 0.035, s * 0.03);
      if (((h >>> 19) & 1) === 0) {
        ctx.fillRect(markerX + mW * 0.5 - s * 0.07, mFoot - s * 0.02, s * 0.045, s * 0.03);
      }
      // PASS 3 — tertiary: the cup at the foot, its rim lit.
      ctx.fillStyle = CUP;
      ctx.fillRect(cupX - s * 0.03, baseY + syT * 0.02, s * 0.06, s * 0.05);
      ctx.fillStyle = CUP_RIM;
      ctx.fillRect(cupX - s * 0.03, baseY + syT * 0.02 - s * 0.03, s * 0.06, s * 0.03);
      // PASS 4 — re-read: stone (5 values, all pale), moss as a chip,
      // clay (2); one lit facet per stone and on the marker; every
      // rect ≥0.03s; no clock; nothing dark but the cup.
    },
  };
}

/**
 * The two-state tell with 516: the SAME stones (the same count, the
 * same seeds) scattered across the tile, the marker face-down with
 * its plain back up, the cup on its side. Whoever did it did not
 * stop to look. Walkable; static; the rig walks over it.
 */
function paintCairnFallen(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const ys = rend.camera.yScale;
  const syT = s * ys;
  const baseY = p.y + syT * 0.18;
  const n = cairnStones(h);
  const seats = coneSeats(n);
  const wrong = cairnOneWrong(h) ? 4 + ((h >>> 15) & 1) : -1;
  const mX = p.x + (((h >>> 9) & 3) - 1.5) * s * 0.08;
  const mY = baseY - syT * 0.02;
  const cupX = p.x + (((h >>> 17) & 3) - 1.5) * s * 0.2;
  return {
    sortY: ty + 0.45,
    // Painted extent: stones to ±0.5s, 0.28s over baseY, the seat
    // 0.3s under it.
    body: stationBody(0.54, 0.34, 0.36),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.44, syT * 0.18),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // PASS 1 — primary mass: the seat; the marker on its face (a
      // flat slab lying, foreshortened, its west edge the lit step,
      // its south edge the dark one); the stones where they rolled.
      contact(ctx, p.x, baseY + syT * 0.04, s * 0.44, syT * 0.18);
      const mw = s * 0.36;
      const md = syT * 0.15;
      ctx.fillStyle = STONE_EAST;
      quad(ctx, mX - mw * 0.5, mY, mX + mw * 0.5 + s * 0.02, mY, mX + mw * 0.5 + s * 0.02, mY + s * 0.04, mX - mw * 0.5, mY + s * 0.04);
      ctx.fillStyle = STONE_BACK;
      quad(ctx, mX - mw * 0.5 + s * 0.02, mY - md, mX + mw * 0.5, mY - md, mX + mw * 0.5 + s * 0.02, mY, mX - mw * 0.5, mY);
      ctx.fillStyle = STONE_LIT;
      quad(ctx, mX - mw * 0.5 + s * 0.02, mY - md, mX - mw * 0.5 + s * 0.055, mY - md, mX - mw * 0.5 + s * 0.035, mY, mX - mw * 0.5, mY);
      for (let i = 0; i < seats.length; i++) {
        const st = seats[i]!;
        const lx = FALLEN_LIE[i * 2]!;
        const ly = FALLEN_LIE[i * 2 + 1]!;
        const jx = (((h >>> (4 + i * 2)) & 3) - 1.5) * s * 0.02;
        const face = i === wrong ? STONE_FOREIGN : ((h >>> (11 + i)) & 1) === 0 ? STONE_COOL : STONE_WARM;
        const lit = i === wrong ? STONE_FOREIGN_LIT : STONE_LIT;
        stone(ctx, p.x + lx * s + jx, baseY + ly * syT, st.r * s * 0.95, h ^ (0x17 + i * 0x29), 0.62, face, lit);
      }
      // PASS 2 — secondary: the moss, now on whatever side is up —
      // two chips on two stones.
      ctx.fillStyle = GY_MOSS;
      ctx.fillRect(p.x + FALLEN_LIE[8]! * s - s * 0.02, baseY + FALLEN_LIE[9]! * syT - s * 0.05, s * 0.04, s * 0.03);
      ctx.fillRect(p.x + FALLEN_LIE[4]! * s + s * 0.03, baseY + FALLEN_LIE[5]! * syT - s * 0.02, s * 0.035, s * 0.03);
      // PASS 3 — tertiary: the cup on its side, its rim to the west.
      ctx.fillStyle = CUP;
      ctx.fillRect(cupX - s * 0.02, baseY + syT * 0.1, s * 0.06, s * 0.035);
      ctx.fillStyle = CUP_RIM;
      ctx.fillRect(cupX - s * 0.045, baseY + syT * 0.1 - s * 0.005, s * 0.03, s * 0.045);
      // PASS 4 — re-read: the same pale stone, the same count, the
      // marker's back and its one lit edge; every rect ≥0.03s; no clock.
    },
  };
}

// ---------------------------------------------- 518 BeastBones
/**
 * The beast nobody unharnessed: a ribcage on its side — the spine a
 * beam along the ground, five or six ribs rising from it as tapered
 * bone quads that bend over at the knee, the long skull wedge with
 * two dark sockets, and the strap still buckled round its neck (the
 * wreck that stands in for the dead horse). RIG: the tallest rib
 * tips at 0.56s (the rig's hip). Solid r.4; bones ×2. Static.
 */
function paintBeastBones(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const ys = rend.camera.yScale;
  const syT = s * ys;
  const baseY = p.y + syT * 0.18;
  // The head end: −1 west, +1 east. The spine lies head-high.
  const m = ((h >>> 3) & 1) === 0 ? -1 : 1;
  const n = ribCount(h);
  const cant = (((h >>> 7) & 3) - 1.5) * syT * 0.04;
  // The spine from the neck (head end) to the tail.
  const nx0 = p.x + m * s * 0.2;
  const ny0 = baseY - syT * 0.06 + cant;
  const tx0 = p.x - m * s * 0.44;
  const ty0 = baseY + syT * 0.06 - cant;
  const skX = p.x + m * s * 0.28;
  const skY = ny0 + syT * 0.02;
  return {
    sortY: ty + 0.64,
    // Painted extent: the muzzle to 0.62s off centre on the head end,
    // the tallest rib 0.58s over baseY, the seat 0.24s under it.
    body: stationBody(0.64, 0.66, 0.4),
    drawShadow: () => rend.castEdgeQuad(nx0, ny0, tx0, ty0, 0.45),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // PASS 1 — primary mass: the seat; the ribs BEHIND the spine
      // (they rise from its far side and bend toward the viewer), each
      // a lower quad and a bent upper quad, tapered, with the dim step
      // on the east edge; then the spine over their roots.
      contact(ctx, p.x - m * s * 0.06, baseY + syT * 0.04, s * 0.5, syT * 0.16);
      const dx = tx0 - nx0;
      const dy = ty0 - ny0;
      for (let i = 0; i < n; i++) {
        const f = 0.12 + (i * 0.7) / (n - 1);
        const rx = nx0 + dx * f;
        const ry = ny0 + dy * f - s * 0.02;
        const tall = s * (0.5 - 0.16 * (i / (n - 1))) * (1 + (((h >>> (9 + i)) & 1) - 0.5) * 0.08);
        // The rib ARCS toward the head over the chest cavity: the
        // lower quad leans a little, the upper quad leans hard, so
        // the two read as one bent bone, not a picket.
        const bend = m * s * 0.075;
        const kx = rx + bend * 0.7;
        const ky = ry - tall * 0.6;
        const tipx = rx + bend * 2.7;
        const tipy = ry - tall * 0.96;
        const w0 = s * 0.03;
        const w1 = s * 0.024;
        const w2 = s * 0.015;
        ctx.fillStyle = BONE;
        quad(ctx, rx - w0, ry, rx + w0, ry, kx + w1, ky, kx - w1, ky);
        quad(ctx, kx - w1, ky, kx + w1, ky, tipx + w2, tipy, tipx - w2, tipy);
        ctx.fillStyle = BONE_DIM;
        quad(ctx, rx + w0 * 0.2, ry, rx + w0, ry, kx + w1, ky, kx + w1 * 0.2, ky);
        quad(ctx, kx + w1 * 0.2, ky, kx + w1, ky, tipx + w2, tipy, tipx + w2 * 0.2, tipy);
      }
      // The spine: a bone beam lying, its south face the dim step,
      // its top the pale plane, the tail end's grain dark.
      lyingTimber(ctx, ys, nx0, ny0, tx0, ty0, s * 0.03, s * 0.06, BONE_DIM, BONE, BONE_DARK);
      // Vertebrae along the top: three or four knobs, one per gap.
      ctx.fillStyle = BONE_KNOB;
      for (let i = 0; i < n - 1; i++) {
        const f = 0.12 + ((i + 0.5) * 0.7) / (n - 1);
        ctx.fillRect(nx0 + dx * f - s * 0.02, ny0 + dy * f - s * 0.085, s * 0.04, s * 0.03);
      }
      // PASS 2 — secondary: the skull — a long wedge from the neck
      // out past the head end, the cranium high at the neck, the
      // muzzle narrowing; the lower jaw a dim step under; the two
      // sockets dark squares; two teeth on the jaw.
      const jaw = skY + s * 0.03;
      const muzX = skX + m * s * 0.34;
      ctx.fillStyle = BONE_DIM;
      quad(ctx, skX - m * s * 0.02, jaw - s * 0.02, muzX - m * s * 0.02, jaw + s * 0.005, muzX, jaw + s * 0.04, skX, jaw + s * 0.05);
      ctx.fillStyle = BONE;
      ctx.beginPath();
      ctx.moveTo(skX - m * s * 0.03, skY + s * 0.03);
      ctx.lineTo(skX - m * s * 0.04, skY - s * 0.16);
      ctx.lineTo(skX + m * s * 0.08, skY - s * 0.2);
      ctx.lineTo(skX + m * s * 0.18, skY - s * 0.13);
      ctx.lineTo(muzX, skY - s * 0.05);
      ctx.lineTo(muzX + m * s * 0.01, skY + s * 0.02);
      ctx.lineTo(skX + m * s * 0.12, skY + s * 0.035);
      ctx.closePath();
      ctx.fill();
      // The cheek's dim step (the east side of the wedge for a west
      // head reads under the brow either way: the value step goes on
      // the side away from the sun).
      ctx.fillStyle = BONE_DIM;
      quad(ctx, skX + m * s * 0.12, skY + s * 0.035, muzX + m * s * 0.01, skY + s * 0.02, muzX, skY - s * 0.01, skX + m * s * 0.1, skY);
      ctx.fillStyle = SOCKET;
      ctx.fillRect(skX + m * s * 0.06 - s * 0.03, skY - s * 0.12, s * 0.055, s * 0.05);
      ctx.fillRect(skX + m * s * 0.17 - s * 0.02, skY - s * 0.06, s * 0.035, s * 0.035);
      ctx.fillStyle = BONE_TOOTH;
      ctx.fillRect(muzX - m * s * 0.08 - s * 0.015, jaw - s * 0.01, s * 0.03, s * 0.03);
      ctx.fillRect(muzX - m * s * 0.03 - s * 0.015, jaw - s * 0.005, s * 0.03, s * 0.03);
      // PASS 3 — tertiary: the strap round the neck between the skull
      // and the first rib, its dark under-turn, the buckle square with
      // its lit corner.
      const stx = nx0 + m * s * 0.02;
      ctx.fillStyle = STRAP_DARK;
      quad(ctx, stx - s * 0.02, ny0 - s * 0.14, stx + s * 0.04, ny0 - s * 0.13, stx + s * 0.05, ny0 + s * 0.06, stx - s * 0.01, ny0 + s * 0.07);
      ctx.fillStyle = STRAP;
      quad(ctx, stx - s * 0.02, ny0 - s * 0.14, stx + s * 0.02, ny0 - s * 0.135, stx + s * 0.03, ny0 + s * 0.06, stx - s * 0.01, ny0 + s * 0.07);
      ctx.fillStyle = BUCKLE;
      ctx.fillRect(stx - s * 0.03, ny0 - s * 0.05, s * 0.05, s * 0.05);
      ctx.fillStyle = BUCKLE_LIT;
      ctx.fillRect(stx - s * 0.03, ny0 - s * 0.05, s * 0.03, s * 0.03);
      // PASS 4 — re-read: bone (4 values), socket, leather (2), brass
      // (2); ribs as quads, one lit step each; every rect ≥0.03s;
      // no clock, no ember, no blood (DarkSpill is a Detail).
    },
  };
}

export const FIELD_AFTER_PROPS: PropEntries = [
  [[Tile.BrokenCart], paintBrokenCart],
  [[Tile.FieldLitter], paintFieldLitter],
  [[Tile.ArrowPost], paintArrowPost],
  [[Tile.FallenBanner], paintFallenBanner],
  [[Tile.FieldCairn], paintFieldCairn],
  [[Tile.CairnFallen], paintCairnFallen],
  [[Tile.BeastBones], paintBeastBones],
];
