/**
 * THE SCARRED LAND — C. the stripped land: what the axe and the fire
 * left. CharredStump (519), SpoilHeap (521). DeadTree (520) is NOT
 * here on purpose: it goes through trees.ts (the snag branch of
 * treeModel — species by hash, foliage 0 for good, dead bark, spars
 * for a crown) in the renderer's engine tree switch, beside Tree and
 * the saplings — registry.test pins it there.
 *
 * K4 THE STRIPPED LAND. Two pieces, both COLD, both still:
 *
 *  519 CharredStump — the stump a burning leaves where the axe had
 *      already been: a squat black stub, its crown SPLIT into two
 *      quads of unequal height (the fire opened the heart along the
 *      grain), an ash collar pooled at the foot where the bark burnt
 *      off and fell, two ember checks on the sun face painted COLD
 *      (the shape of a fire that has been), one root knuckle
 *      breaking the turf. RIG: 0.3s to the taller crown — shin-high;
 *      the rig walks past it. Walkable (solid:false), STATIC ring;
 *      worldgen SCORCH emits it at s>0.35 instead of Stump.
 *  521 SpoilHeap — the diggers' tailings: a PEAKED mound (the angle
 *      of repose — tipped stone stands as a cone, never a dome; the
 *      lab rig read the first dome as a boulder) with its apex on the
 *      sun side, a lit crescent down the west slope, six to nine chip
 *      quads riding the two slopes in two values (lit on the sun
 *      flank, shaded east), and the one thing that says somebody
 *      worked here — a
 *      dropped pick head or a snapped tool handle, hashed. Two
 *      hashed washes: QUARRY-BROWN (the kobolds' digs) and STARFALL-
 *      BLACK (the deep's tailings). RIG: crests 0.62s — waist-high.
 *      Solid r.4; rubble ×2; STATIC ring.
 *
 * The laws, in the order the brush meets them:
 *  - BODY-RULER: every extent is in `s` (the tile); the rig stands
 *    1.15s. Each painter's header states its height against the rig.
 *  - TOP-PLANE: every standing piece shows its lit top, foreshortened
 *    to the camera's yScale (the stump's two crowns, the heap's
 *    crest, the pick head's top facet).
 *  - FLAT FORGE / BLOCK LAW: squared filled quads, one lit facet toward
 *    the fixed west art sun, depth as value steps, min feature 0.03s.
 *    Diagonals are QUADS (moveTo/lineTo) — never ctx.rotate/translate.
 *  - THE ONE RING: silhouette only. Nothing here strokes; the cached
 *    eight-tap ring (CACHED_RING_TILES) inks the painted silhouette and
 *    both idle in STATIC_RING_TILES (nothing here moves — ONE BREEZE
 *    has no cloth to sample in this family; neither reads the clock).
 *  - Draw-time `const ctx = rend.ctx`; hash deals by `h >>> k`.
 *  - SHADOWS NEVER BAKE: castEdgeQuad (the stub is a short prism) /
 *    castBlob (the heap is a mass) per frame.
 *  - No light rows, no queueGlow, no smoke: the stripped land is cold.
 */
import { Tile } from '@arx/shared';
import { shade } from '../../tint.js';
import { facetBlob, facetCircle } from '../../shapes.js';
import { SCAR_ASH, SCAR_CHAR, TWN_STONE_DARK } from '../palette.js';
import type { DrawItem } from '../../renderer.js';
import type { PropEntries, PropFrame, PropHost } from '../types.js';

// ---- the inks (dealt once; every piece shares them, the hash deals the deal)
/** Char, stepped as the cold hearth steps it: the top plane of burnt
 *  wood still catches the sun, the west facet a step under, the east
 *  arris darkest. All cold — no orange anywhere in this file. */
const CHAR_TOP = '#4c4746';
const CHAR_WEST = shade(SCAR_CHAR, 16);
const CHAR_FACE = shade(SCAR_CHAR, 4);
const CHAR_EAST = shade(SCAR_CHAR, -7);
/** The alligator check: a lifted cold square where the char split. */
const CHAR_CHECK = shade(SCAR_CHAR, 22);
const CHAR_CRACK = shade(SCAR_CHAR, -12);
/** Unburnt heartwood in the split: cold bone-grey, never warm. */
const SPLIT_WOOD = '#6e655e';
/** The ash collar: dark pan, the ash itself, a pale drift sun-side. */
const ASH_DARK = shade(SCAR_ASH, -22);
const ASH_PALE = shade(SCAR_ASH, 14);
/** The turf the root knuckle broke: a cold dirt, its lip a step up. */
const DIRT = '#4f4034';
const DIRT_LIP = '#63523f';
const CONTACT = 'rgba(12, 8, 20, 0.24)';

/** The heap's two washes, each a family of five value steps:
 *  shade (SE flank) → body → lit crescent → crest → chip-lit. */
interface Wash {
  shade: string;
  body: string;
  lit: string;
  crest: string;
  chipDark: string;
  chipLit: string;
}
/** QUARRY-BROWN: the kept-limestone family gone to dirt — the
 *  kobolds' tailings, a dull warm-grey brown (chroma stays low).
 *  Five value steps a full stride apart: at gameplay zoom a heap is
 *  read by its steps, not its edges. */
const QUARRY: Wash = {
  shade: shade(TWN_STONE_DARK, -34),
  body: shade(TWN_STONE_DARK, -12),
  lit: shade(TWN_STONE_DARK, 6),
  crest: shade(TWN_STONE_DARK, 24),
  chipDark: shade(TWN_STONE_DARK, -24),
  chipLit: shade(TWN_STONE_DARK, 34),
};
/** STARFALL-BLACK: the deep's tailings — a violet-black that drinks
 *  the light. Its steps are wider than a black would want, on
 *  purpose: a black heap with close steps read as a boulder on the
 *  lab rig; the crest and the sun flank must lift a whole stride. */
const STARFALL: Wash = {
  shade: '#1a1720',
  body: '#2c2733',
  lit: '#413b4b',
  crest: '#585162',
  chipDark: '#221e28',
  chipLit: '#665f72',
};
/** The dropped iron: a pick head in the dungeon-iron family, cold. */
const IRON = '#3a3444';
const IRON_LIT = '#5d5670';
const IRON_DARK = '#2a2632';
/** A snapped tool handle: ash-wood gone grey in the weather. */
const HANDLE = '#6b5b48';
const HANDLE_LIT = '#877663';
const HANDLE_END = '#52463a';

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
 * A bar along an axis a→b with half-width vector n (the ground-plane
 * perpendicular), lifted by `lift` (screen up). Corners a−n, b−n, b+n,
 * a+n — a root, a handle, a chip's every face.
 */
function bar(
  ctx: CanvasRenderingContext2D,
  ax: number, ay: number, bx: number, by: number,
  nx: number, ny: number, lift: number,
): void {
  quad(ctx, ax - nx, ay - ny - lift, bx - nx, by - ny - lift, bx + nx, by + ny - lift, ax + nx, ay + ny - lift);
}

// ---------------------------------------------- 519 CharredStump
/**
 * The burnt stump. RIG: the taller crown stands 0.3s over the foot
 * line, the shorter 0.2s — shin-high beside the 1.15s rig; the ash
 * collar spreads ±0.34s. Walkable; STATIC; the shadow is one short
 * prism cast along the stub's ground axis per frame.
 */
function paintCharredStump(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const ys = rend.camera.yScale;
  const syT = s * ys;
  const baseY = p.y + syT * 0.18;
  // The deal: which crown stands taller (the split runs off-centre
  // that way), the collar's turn, the knuckle's side, the checks'
  // seats.
  const tallWest = ((h >>> 3) & 1) === 0;
  const turn = ((h >>> 5) & 7) * 0.11;
  const knuckleDir = ((h >>> 8) & 1) === 0 ? -1 : 1;
  const hw = s * 0.18; // half-width of the whole stub
  const split = s * (0.025 + ((h >>> 10) & 1) * 0.01); // the crack's half-width
  const hTall = s * 0.3;
  const hShort = s * (0.18 + ((h >>> 12) & 3) * 0.012);
  // Top planes foreshorten to the stub's width: a 0.36s-wide round
  // stub shows its top as a 0.36 × 0.36·yScale ellipse, squared here.
  const td = hw * 2 * 0.32 * ys;
  return {
    sortY: ty + 0.55,
    // Painted extent: the collar ±0.38s and the knuckle's toe at
    // ±0.45s, the tall crown's top plane at −0.3s − td, the toe at
    // +0.3s.
    body: stationBody(0.5, 0.46, 0.36),
    // SHADOWS NEVER BAKE: the stub is a short prism — its ground axis
    // extruded along the sun (and away from every lamp).
    drawShadow: () => rend.castEdgeQuad(p.x - hw * 0.9, baseY, p.x + hw * 0.9, baseY, 0.28),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // PASS 1 — primary mass. Contact shade, then the ash collar:
      // the bark burnt off the stub and fell in a ring — a dark pan,
      // the ash on it pulled toward the sun, a pale drift on the west
      // rim where the wind sorted the fines.
      ctx.fillStyle = CONTACT;
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.38, syT * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ASH_DARK;
      ctx.beginPath();
      facetBlob(ctx, p.x + s * 0.02, baseY - s * 0.01, s * 0.34, h ^ 0x4b, 9, 0.46, turn);
      ctx.fill();
      // The ash sits ON the pan, pulled west where the wind sorted the
      // fines — the pan stays the larger read (a burnt collar is dark
      // with a pale drift, not a pale pancake: the lab rig said so).
      ctx.fillStyle = SCAR_ASH;
      ctx.beginPath();
      facetBlob(ctx, p.x - s * 0.06, baseY - s * 0.03, s * 0.2, h ^ 0x4b, 9, 0.46, turn);
      ctx.fill();
      ctx.fillStyle = ASH_PALE;
      ctx.beginPath();
      facetCircle(ctx, p.x - s * 0.17, baseY - s * 0.04, s * 0.07, 6, turn + 0.5, 0.46);
      ctx.fill();
      // The root knuckle: a char bar breaking out of the collar on
      // one side and diving back under the turf, its top lit. The
      // turf it lifted shows as two raised dirt squares at the toe.
      const kx0 = p.x + knuckleDir * hw * 0.7;
      const ky0 = baseY - s * 0.02;
      const kx1 = p.x + knuckleDir * s * 0.4;
      const ky1 = baseY + syT * 0.12;
      const kl = Math.hypot(kx1 - kx0, ky1 - ky0);
      const knx = (-(ky1 - ky0) / kl) * s * 0.045;
      const kny = ((kx1 - kx0) / kl) * s * 0.045;
      ctx.fillStyle = DIRT;
      ctx.fillRect(kx1 - s * 0.05, ky1 - s * 0.02, s * 0.1, s * 0.05);
      ctx.fillStyle = DIRT_LIP;
      ctx.fillRect(kx1 - s * 0.05, ky1 - s * 0.045, s * 0.045, s * 0.03);
      ctx.fillRect(kx1 + s * 0.005, ky1 - s * 0.04, s * 0.04, s * 0.03);
      ctx.fillStyle = CHAR_EAST;
      bar(ctx, kx0, ky0, kx1, ky1, knx, kny, 0);
      ctx.fillStyle = CHAR_FACE;
      bar(ctx, kx0, ky0, kx1, ky1, knx * 0.75, kny * 0.75, s * 0.03);
      ctx.fillStyle = CHAR_TOP;
      bar(ctx, kx0, ky0, kx1, ky1, knx * 0.45, kny * 0.45, s * 0.065);
      // PASS 2 — the stub itself: two squared quads with the split
      // between them. The face is one block (the split reads as a
      // crack of heartwood, not a gap), the west arris the one lit
      // facet, the east arris a step darker.
      const wL = hw - split;
      const hL = tallWest ? hTall : hShort;
      const hR = tallWest ? hShort : hTall;
      // Left (west) stub.
      ctx.fillStyle = CHAR_FACE;
      ctx.fillRect(p.x - hw, baseY - hL, wL, hL);
      // Right (east) stub.
      ctx.fillRect(p.x + split, baseY - hR, wL, hR);
      // The split: heartwood shows down the crack, char-cracked at
      // its edges, from the shorter crown down to the collar.
      const hMin = Math.min(hL, hR);
      ctx.fillStyle = CHAR_CRACK;
      ctx.fillRect(p.x - split - s * 0.01, baseY - hMin, split * 2 + s * 0.02, hMin);
      ctx.fillStyle = SPLIT_WOOD;
      ctx.fillRect(p.x - split, baseY - hMin + s * 0.02, split * 2, hMin - s * 0.05);
      // The taller stub's inner face shows above the shorter crown:
      // that face is heartwood too — the fire opened it.
      const tallX = tallWest ? p.x - split - s * 0.04 : p.x + split;
      ctx.fillStyle = SPLIT_WOOD;
      ctx.fillRect(tallX, baseY - Math.max(hL, hR) + s * 0.015, s * 0.04, Math.max(hL, hR) - hMin);
      // The one lit facet: the west arris toward the fixed art sun.
      ctx.fillStyle = CHAR_WEST;
      ctx.fillRect(p.x - hw, baseY - hL, s * 0.05, hL);
      // The east arris steps darker — depth as a value step.
      ctx.fillStyle = CHAR_EAST;
      ctx.fillRect(p.x + hw - s * 0.04, baseY - hR, s * 0.04, hR);
      // The two crowns: lit top planes, foreshortened, each at its
      // own height — TOP-PLANE on a split thing is two planes.
      ctx.fillStyle = CHAR_TOP;
      ctx.fillRect(p.x - hw, baseY - hL - td, wL, td);
      ctx.fillRect(p.x + split, baseY - hR - td, wL, td);
      // Cracks across each crown where the top checked as it cooled.
      ctx.fillStyle = CHAR_CRACK;
      ctx.fillRect(p.x - hw + wL * 0.4, baseY - hL - td, s * 0.03, td);
      ctx.fillRect(p.x + split + wL * 0.55, baseY - hR - td, s * 0.03, td);
      // PASS 3 — tertiary life. THE ALLIGATOR CHAR on the sun face:
      // two ember checks painted COLD (a lifted grey square over a
      // crack groove) at hash-dealt seats on the west stub — the
      // shape of a fire that has been. The kit's warmth is EmberBed's
      // light row, never this paint.
      const q = s * 0.045;
      for (let i = 0; i < 2; i++) {
        const cx = p.x - hw + s * 0.055 + i * s * 0.055 + (((h >>> (14 + i * 2)) & 1) * s * 0.012);
        const cy = baseY - hL * (0.3 + i * 0.3) - (((h >>> (18 + i)) & 1) * s * 0.02);
        ctx.fillStyle = CHAR_CRACK;
        ctx.fillRect(cx - q * 0.5 - s * 0.01, cy - q * 0.5 - s * 0.01, q + s * 0.02, q + s * 0.02);
        ctx.fillStyle = CHAR_CHECK;
        ctx.fillRect(cx - q * 0.5, cy - q * 0.5, q, q);
      }
      // A pale ash fleck or two blown onto the collar's sun side and
      // one char clinker in the drift (inside the collar's alpha —
      // THE ONE RING: no loose flake earns its own wheel).
      ctx.fillStyle = ASH_PALE;
      ctx.fillRect(p.x - s * 0.28 + (((h >>> 20) & 3) * s * 0.02), baseY + s * 0.02, s * 0.03, s * 0.03);
      ctx.fillStyle = SCAR_CHAR;
      ctx.fillRect(p.x + s * 0.2 - knuckleDir * s * 0.06, baseY + s * 0.04, s * 0.034, s * 0.03);
      // PASS 4 — re-read: char in four cold steps (top/west/face/east)
      // + check + crack, heartwood in the split, ash in three, dirt in
      // two; the one lit facet faces west; two lit crowns at two
      // heights; every feature ≥0.03s; nothing stroked, nothing
      // rotated; no clock, no light.
    },
  };
}

// ---------------------------------------------- 521 SpoilHeap
/**
 * The tailings. RIG: the crest stands 0.62s — waist-high to the rig;
 * the mound spreads ±0.5s. Solid r.4; rubble ×2; STATIC; the shadow
 * is a blob mass cast per frame.
 */
function paintSpoilHeap(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The deal: the wash, the chip count, the dropped tool (pick head
  // or handle) and which flank it lies on; the skyline jitters below.
  const wash = ((h >>> 13) & 1) === 0 ? QUARRY : STARFALL;
  const chips = 6 + ((h >>> 6) & 3); // 6..9
  const pick = ((h >>> 9) & 1) === 0;
  const toolDir = ((h >>> 11) & 1) === 0 ? -1 : 1;
  const R = s * 0.5;
  // THE ANGLE OF REPOSE: tailings do not lie in a dome — they are
  // tipped from a barrow and stand at the angle loose stone holds, a
  // peaked cone with one long flank and one short. The mound is an
  // thirteen-point polygon in tile units about (p.x, baseY), the apex
  // 0.6s over the foot line (the rig's waist) and WEST of centre so
  // the long east flank falls into the shade lane. THE SCREE SKYLINE
  // (lab pass 2): a heap of tipped stone is not a boulder — its
  // skyline steps where the last barrow-loads landed, so each flank
  // carries a notch (west) or a bulge (east) off the straight slope,
  // and three vertices jitter by hash so no two heaps break the same
  // line.
  const jx = (((h >>> 15) & 3) - 1.5) * 0.02;
  const jy = (((h >>> 17) & 3) - 1.5) * 0.013;
  const jr = (((h >>> 19) & 3) - 1.5) * 0.02;
  /** Outline (x, y) in tiles; y negative is up. */
  const M: ReadonlyArray<readonly [number, number]> = [
    [-0.5, 0.02],             // 0 west foot
    [-0.46 + jx, -0.14],      // 1 west flank, low
    [-0.37, -0.25 + jy],      // 2 west notch (a load slid)
    [-0.3 + jr, -0.4],        // 3 west shoulder
    [-0.1 + jx, -0.6],        // 4 apex
    [0.06, -0.52 + jy],       // 5 east of the apex
    [0.14 + jr, -0.5 + jy * 0.5], // 6 east bulge (the last load)
    [0.3, -0.34 + jy],        // 7 east shoulder
    [0.44 + jx, -0.16],       // 8 east flank, low
    [0.5, 0.04],              // 9 east foot
    [0.3, 0.17],              // 10 south-east foot
    [0.0, 0.2],               // 11 south foot
    [-0.3, 0.16],             // 12 south-west foot
  ];
  return {
    sortY: ty + 0.7,
    // Painted extent: the mound ±0.54s, the apex at 0.6s over the
    // foot line (≈ −0.47s of p), the contact shade's foot at +0.24s.
    body: stationBody(0.58, 0.56, 0.42),
    drawShadow: () => rend.castBlob(p.x, baseY, 0.55, s * 0.42, h ^ 0x5a),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      /** A filled polygon in tile units about (p.x, baseY); y up is negative. */
      const poly = (pts: ReadonlyArray<readonly [number, number]>): void => {
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(p.x + x * s, baseY + y * s) : ctx.lineTo(p.x + x * s, baseY + y * s)));
        ctx.closePath();
        ctx.fill();
      };
      // PASS 1 — primary mass. Contact shade, then the mound in four
      // value planes, each a polygon INSIDE the last (never a clip):
      // the shade plane is the whole silhouette; the body plane pulls
      // the east and south vertices in, leaving the shade lane on the
      // flank the sun never reaches; the lit crescent is the west
      // slope from foot to apex, a band the width of a chip; the
      // crest is the apex cap — the lit top plane of a heap that has
      // no top but its point.
      ctx.fillStyle = CONTACT;
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.04, R * 1.08, syT * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = wash.shade;
      poly(M);
      ctx.fillStyle = wash.body;
      poly([
        M[0]!, M[1]!, M[2]!, M[3]!, M[4]!,
        [M[5]![0] - 0.03, M[5]![1] + 0.03],
        [M[6]![0] - 0.06, M[6]![1] + 0.03],
        [M[7]![0] - 0.08, M[7]![1] + 0.03],
        [M[8]![0] - 0.1, M[8]![1] + 0.02],
        [M[9]![0] - 0.12, M[9]![1] - 0.03],
        [M[10]![0] - 0.06, M[10]![1] - 0.06],
        [M[11]![0], M[11]![1] - 0.07],
        [M[12]![0] + 0.02, M[12]![1] - 0.05],
      ]);
      // The lit crescent: the whole west slope from foot to apex, a
      // full quarter of the mound wide (the lab rig read a chip-wide
      // band as a boulder's highlight; a heap's sun flank is a FIELD).
      ctx.fillStyle = wash.lit;
      poly([
        [M[0]![0] + 0.03, M[0]![1] - 0.02],
        [M[1]![0] + 0.02, M[1]![1]],
        [M[2]![0] + 0.02, M[2]![1]],
        [M[3]![0] + 0.02, M[3]![1]],
        [M[4]![0] + 0.02, M[4]![1] + 0.01],
        [M[4]![0] - 0.02, M[4]![1] + 0.12],
        [M[3]![0] + 0.2 + jx, M[3]![1] + 0.1],
        [M[2]![0] + 0.2, M[2]![1] + 0.08],
        [M[1]![0] + 0.22, M[1]![1] + 0.1],
        [M[0]![0] + 0.26, M[0]![1] - 0.06],
      ]);
      ctx.fillStyle = wash.crest;
      poly([
        [M[4]![0] - 0.11, M[4]![1] + 0.11],
        [M[4]![0], M[4]![1]],
        [M[4]![0] + 0.13, M[4]![1] + 0.08],
        [M[4]![0] + 0.03, M[4]![1] + 0.15],
      ]);
      // The bulge's own lit cap: the last load's top plane, a small
      // crest-ink square on the east step (the skyline's step reads as
      // a value step, not an outline wobble).
      ctx.fillStyle = wash.lit;
      ctx.fillRect(p.x + (M[6]![0] - 0.04) * s, baseY + (M[6]![1] + 0.015) * s, s * 0.06, s * 0.03);
      // PASS 2 — secondary structure. THE CHIPS: six to nine flat
      // stone chips riding the two slopes, each a parallelogram lying
      // ALONG its slope (the west slope from foot to apex, the east
      // from apex to foot) with a lifted top edge — two values, lit on
      // the sun flank, shaded east. Dealt by slope, by seat along it
      // and by size, so no two heaps lay them alike; every chip is
      // ≥0.12s long and 0.06s deep (lab pass 2: 0.09s chips at s=112
      // read as texture noise on a boulder — a chip is a STONE, the
      // size of a hand, with its own lit top edge and a shaded face
      // under it) — at gameplay zoom a chip you cannot read is a chip
      // you did not paint.
      const westSlope = [M[0]!, M[4]!] as const;
      const eastSlope = [M[4]!, M[9]!] as const;
      for (let i = 0; i < chips; i++) {
        const hi = h >>> ((i * 3 + 1) & 31);
        const west = (i & 1) === 0;
        const [sa, sb] = west ? westSlope : eastSlope;
        // Seat along the slope (never the very foot or the apex),
        // pulled a little inside the silhouette.
        const u = 0.18 + ((i >> 1) * 0.22 + (hi & 3) * 0.05) % 0.66;
        const inx = west ? 0.06 : -0.06;
        const cxp = sa[0] + (sb[0] - sa[0]) * u + inx;
        const cyp = sa[1] + (sb[1] - sa[1]) * u + 0.07;
        // The slope's direction and the chip's half-length along it.
        const ddx = sb[0] - sa[0];
        const ddy = sb[1] - sa[1];
        const dl = Math.hypot(ddx, ddy) || 1;
        const ux = ddx / dl;
        const uy = ddy / dl;
        const half = 0.06 + ((hi >>> 2) & 3) * 0.015;
        const deep = 0.06;
        // The chip's face: the two-value read (lit on the sun flank,
        // shaded east), a parallelogram lying along its slope.
        ctx.fillStyle = west ? wash.chipLit : wash.chipDark;
        poly([
          [cxp - ux * half, cyp - uy * half],
          [cxp + ux * half, cyp + uy * half],
          [cxp + ux * half + 0.012, cyp + uy * half + deep],
          [cxp - ux * half + 0.012, cyp - uy * half + deep],
        ]);
        // TOP-PLANE on a stone the size of a hand: a 0.03s lit band
        // along the chip's top edge — crest ink on the sun flank, the
        // lit ink in the shade (a chip's top still sees the sky).
        ctx.fillStyle = west ? wash.crest : wash.lit;
        poly([
          [cxp - ux * half, cyp - uy * half],
          [cxp + ux * half, cyp + uy * half],
          [cxp + ux * half + 0.006, cyp + uy * half + 0.03],
          [cxp - ux * half + 0.006, cyp - uy * half + 0.03],
        ]);
        // The face under the top edge steps the other way — depth as
        // a value step (the lit chip's face is the body ink, the
        // shaded chip's the shade).
        ctx.fillStyle = west ? wash.body : wash.shade;
        poly([
          [cxp - ux * half + 0.012, cyp - uy * half + deep * 0.5],
          [cxp + ux * half + 0.012, cyp + uy * half + deep * 0.5],
          [cxp + ux * half + 0.012, cyp + uy * half + deep],
          [cxp - ux * half + 0.012, cyp - uy * half + deep],
        ]);
      }
      // THE SCREE: four loose stones that rolled to the south foot
      // when the barrow tipped — squared blocks ≥0.04s straddling the
      // mound's foot edge (inside its silhouette — THE ONE RING), each
      // a chip ink on a shade-ink base (depth as a value step). Lit on
      // the west pair, dark on the east; seats jitter by hash.
      const SCREE: ReadonlyArray<readonly [number, number]> = [[-0.36, 0.1], [-0.12, 0.15], [0.14, 0.16], [0.4, 0.09]];
      SCREE.forEach(([sx0, sy0], i) => {
        const hs = h >>> ((i * 4 + 21) & 31);
        const sz = 0.04 + (hs & 1) * 0.015;
        const sx = sx0 + ((hs >>> 1) & 3) * 0.012;
        const sy = sy0 - ((hs >>> 3) & 1) * 0.02;
        ctx.fillStyle = wash.shade;
        ctx.fillRect(p.x + sx * s, baseY + (sy - sz * 0.2) * s, sz * s, (sz + 0.03) * s);
        ctx.fillStyle = i < 2 ? wash.chipLit : wash.chipDark;
        ctx.fillRect(p.x + sx * s, baseY + (sy - sz * 0.2) * s, sz * s, sz * s);
      });
      // THE DROPPED TOOL: the one thing that says hands did this.
      // Hashed: a pick head (iron, a squared block with its lit top
      // facet and one dark eye where the haft was) lying on the lower
      // west or east flank, or a snapped handle (a bar of grey ash-
      // wood with a lit top and a dark broken end).
      const tx0 = p.x + toolDir * s * 0.24;
      const ty0 = baseY - s * 0.05;
      if (pick) {
        const pw = s * 0.2;
        const ph = s * 0.06;
        const pt = s * 0.035;
        ctx.fillStyle = IRON_DARK;
        ctx.fillRect(tx0 - pw * 0.5, ty0 - ph, pw, ph);
        ctx.fillStyle = IRON;
        ctx.fillRect(tx0 - pw * 0.5, ty0 - ph, pw * 0.9, ph - s * 0.015);
        // The one lit facet: the top, toward the sun-side end.
        ctx.fillStyle = IRON_LIT;
        ctx.fillRect(tx0 - pw * 0.5, ty0 - ph - pt, pw * 0.72, pt);
        // The eye: where the haft was, a dark square.
        ctx.fillStyle = IRON_DARK;
        ctx.fillRect(tx0 - s * 0.017, ty0 - ph - pt, s * 0.034, pt);
        // The pick's point tapers away east: a quad off the block.
        ctx.fillStyle = IRON;
        quad(ctx, tx0 + pw * 0.4, ty0 - ph, tx0 + pw * 0.7, ty0 - ph * 0.55, tx0 + pw * 0.7, ty0 - ph * 0.35, tx0 + pw * 0.4, ty0);
      } else {
        const hx1 = tx0 + toolDir * s * 0.24;
        const hy1 = ty0 - syT * 0.1;
        const hl = Math.hypot(hx1 - tx0, hy1 - ty0);
        const hnx = (-(hy1 - ty0) / hl) * s * 0.035;
        const hny = ((hx1 - tx0) / hl) * s * 0.035;
        ctx.fillStyle = HANDLE_END;
        bar(ctx, tx0, ty0, hx1, hy1, hnx, hny, 0);
        ctx.fillStyle = HANDLE;
        bar(ctx, tx0, ty0, hx1, hy1, hnx * 0.7, hny * 0.7, s * 0.03);
        ctx.fillStyle = HANDLE_LIT;
        bar(ctx, tx0, ty0, hx1, hy1, hnx * 0.36, hny * 0.36, s * 0.06);
        // The broken end: splintered dark, a cold square.
        ctx.fillStyle = HANDLE_END;
        ctx.fillRect(hx1 - s * 0.02, hy1 - s * 0.065, s * 0.04, s * 0.05);
      }
      // PASS 3 — tertiary life. Fines spilled past the mound's foot on
      // the east where the barrow tipped: a dark blob inside the
      // contact shade, two crumbs in it (inside the blob's alpha —
      // THE ONE RING).
      ctx.fillStyle = wash.shade;
      ctx.beginPath();
      facetBlob(ctx, p.x + s * 0.3, baseY + s * 0.01, s * 0.14, h ^ 0x27, 6, 0.42);
      ctx.fill();
      ctx.fillStyle = wash.chipDark;
      ctx.fillRect(p.x + s * 0.26 + (((h >>> 20) & 3) * s * 0.02), baseY - s * 0.02, s * 0.034, s * 0.03);
      ctx.fillRect(p.x + s * 0.34, baseY + s * 0.01 - (((h >>> 22) & 1) * s * 0.02), s * 0.03, s * 0.03);
      // PASS 4 — re-read: one wash in five cold steps, sun west
      // (crescent + crest + lit chips all on the west flank), a
      // stepped scree skyline, chips ≥0.12s with 0.03s lit tops, four
      // scree stones ≥0.04s at the foot, the tool one lit facet, no
      // strokes, no rotates, no clock, no light.
    },
  };
}

export const STRIPPED_PROPS: PropEntries = [
  [[Tile.CharredStump], paintCharredStump],
  [[Tile.SpoilHeap], paintSpoilHeap],
];
