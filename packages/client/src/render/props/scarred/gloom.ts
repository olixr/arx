/**
 * THE SCARRED LAND — D. the gloom: what was here first. GloomStone
 * (522), CreepRoot (523), FoulPool (524), CropBlighted (525).
 *
 * K4 THE GLOOM. The Riftgate apron's palette above ground: a
 * bruised blue-violet on black, bone at the water's edge, char where
 * the ground split. Nothing here is warm and nothing here is green.
 *
 *  522 GloomStone — a Rock's silhouette (the hewn eight-point block,
 *      here as FILLS only) in the graveyard's GY_STONE, chamfered and
 *      shouldered, a lesser block at its flank; four to six lichen
 *      PLATES in SCAR_GLOOM's family on the north (the top plane's
 *      back) and shaded (east) faces, painted COLD — a value under
 *      the ink — because the light is the lights.ts row (GlowShroom-
 *      class cool swell, no gate, non-occluding), never this paint;
 *      pale spore dots ≥0.03s around the plates. RIG: 0.62s + its
 *      top plane — chest-high beside the 1.15s rig. Solid; no
 *      destructible (it was here first).
 *  523 CreepRoot — two or three tapered SCAR_CHAR roots arcing up
 *      out of the ground and diving back in, each with its lit top
 *      plane and one lit west facet; the turf they split shows as
 *      two raised dirt squares at the main root's lips; one SCAR_GLOOM
 *      vein square on the lit face, spore dots beside it. RIG: the
 *      tallest arch crowns at 0.32s — shin-high. Solid r.3; root ×3;
 *      respawn 3600 (it comes back). STATIC ring.
 *  524 FoulPool — sick water: a ground-plane ellipse near-black with
 *      an opaque gloom interior (two value planes, never a translucent
 *      wash — emberBed's scorch law), a bone-white scum ring as a
 *      BROKEN CHAIN of squares whose phase drifts on
 *      (t·0.15 + h·0.1) % 1 (0.15 rev/s: far under 4Hz, cadence-safe),
 *      three dead SCAR_ASH reed quads standing at the far rim. RIG:
 *      the reeds stand 0.32s; the pan spreads ±0.44s. Walkable; the
 *      light row is the pool's own cool swell.
 *  525 CropBlighted — rides the CROP painter path (render/crops.ts
 *      paints the blight model; drawFlora bakes it with the ring like
 *      every crop). Its art lives in crops.ts (paintBlighted).
 *
 * The laws, in the order the brush meets them:
 *  - BODY-RULER: every extent is in `s` (the tile); the rig stands
 *    1.15s. Each painter's header states its height against the rig.
 *  - TOP-PLANE: every standing piece shows its lit top, foreshortened
 *    to the camera's yScale (the stone's cap, each root's crown).
 *  - FLAT FORGE / BLOCK LAW: squared filled quads, one lit facet toward
 *    the fixed west art sun, depth as value steps, min feature 0.03s.
 *    Diagonals are QUADS (moveTo/lineTo) — never ctx.rotate/translate.
 *  - THE ONE RING: silhouette only. Nothing here strokes; the cached
 *    eight-tap ring inks the painted silhouette. The root AND the
 *    stone idle in STATIC_RING_TILES (neither reads a clock or the
 *    breeze; the stone's light is a collect-time row, never in the
 *    ring sprite); only the pool keeps the fast cadence (its scum
 *    drifts).
 *  - ONE BREEZE: no cloth here. The pool's one clock is the scum
 *    drift, read from env.t (never performance.now), at 0.15 rev/s.
 *  - Collect-time light: the two rows live in shared/world/lights.ts;
 *    the painters never queueGlow and never paint the glow itself —
 *    by day the stone's plates and the pool's wash read COLD.
 *  - Draw-time `const ctx = rend.ctx`; hash deals by `h >>> k`.
 *  - SHADOWS NEVER BAKE: castBlob (the stone is a mass), castEdgeQuad
 *    (the root is a low prism), castContact (the reeds' foot) per frame.
 */
import { Tile } from '@arx/shared';
import { shade } from '../../tint.js';
import { facetBlob, facetCircle } from '../../shapes.js';
import { GY_STONE, GY_STONE_LIT } from '../../paintVocab.js';
import { DGN_BONE, DGN_BONE_DIM, SCAR_ASH, SCAR_CHAR, SCAR_GLOOM } from '../palette.js';
import type { DrawItem } from '../../renderer.js';
import type { PropEntries, PropFrame, PropHost } from '../types.js';

// ---- the inks (dealt once; every piece shares them, the hash deals the deal)
/** The stone: the graveyard's grey in four steps — east lane, face,
 *  west facet, lit cap. */
const STONE_LANE = shade(GY_STONE, -16);
const STONE_FACE = GY_STONE;
const STONE_WEST = shade(GY_STONE, 12);
const STONE_CAP = GY_STONE_LIT;
const STONE_FOOT = shade(GY_STONE, -26);
/** The lichen plates, painted COLD: two values UNDER SCAR_GLOOM (the
 *  light row lifts them after dark — the plates are where the bloom
 *  seats, not the bloom). gloom.test pins every plate ink darker
 *  than the ink itself. */
const PLATE = '#5c6899';
const PLATE_SHADE = '#4a5280';
/** Spore dots: pale, low-chroma (18) — a dusting, not a light, and
 *  not blue: the gloom family is the plates' alone. */
const SPORE = '#aeb0c0';
/** Char, stepped as the cold hearth steps it. */
const CHAR_TOP = '#4c4746';
const CHAR_WEST = shade(SCAR_CHAR, 16);
const CHAR_FACE = shade(SCAR_CHAR, 4);
const CHAR_EAST = shade(SCAR_CHAR, -7);
const CHAR_CRACK = shade(SCAR_CHAR, -12);
/** The turf a root split: cold dirt, its lip a step up. */
const DIRT = '#4f4034';
const DIRT_LIP = '#63523f';
/** The pool: a near-black rim plane, the gloom interior in two
 *  opaque steps (the bloom seats over the paler one). */
const POOL_RIM = '#181a20';
const POOL_DEEP = '#252a3e';
const POOL_WASH = '#373e5c';
/** Dead reeds: ash in three — foot, stalk, lit tip. */
const REED_FOOT = shade(SCAR_ASH, -30);
const REED = shade(SCAR_ASH, -10);
const REED_LIT = shade(SCAR_ASH, 12);
const CONTACT = 'rgba(12, 8, 20, 0.24)';

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
 * A TAPERED bar along an axis a→b: half-width wa at a, wb at b (in
 * the ground-plane perpendicular, foreshortened by `ys`), lifted by
 * `lift` (screen up). A root's every face.
 */
function taperBar(
  ctx: CanvasRenderingContext2D,
  ax: number, ay: number, bx: number, by: number,
  wa: number, wb: number, ys: number, lift: number,
): void {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = (dx / len) * ys;
  quad(
    ctx,
    ax - nx * wa, ay - ny * wa - lift,
    bx - nx * wb, by - ny * wb - lift,
    bx + nx * wb, by + ny * wb - lift,
    ax + nx * wa, ay + ny * wa - lift,
  );
}

/**
 * THE HEWN BLOCK, fills only. The Rock painter's eight-point
 * silhouette (a base wider than the top, unequal top chamfers, a
 * shoulder vertex partway up each flank) drawn as one face fill, a
 * shade lane quad hugging the east flank, one lit west facet quad,
 * and the TOP PLANE — a foreshortened cap polygon standing on the
 * top edge, `td` deep. Never a clip, never a rotate, never a stroke
 * (rockArt.stoneBlock does all three; this is the kit's version).
 * Returns the cap's four corners (x0/x1 on the front edge, bx0/bx1
 * on the back edge, yt the front, yb the back) so lichen can seat
 * on the north of the plane.
 */
function hewnBlock(
  ctx: CanvasRenderingContext2D,
  cx: number, yb: number, w: number, hgt: number, td: number, lean: number, seed: number,
): { x0: number; x1: number; bx0: number; bx1: number; yt: number; yBack: number; laneX: (y: number) => number } {
  const yt = yb - hgt;
  const tl = 1 - (0.3 - ((seed >>> 2) & 3) * 0.05);
  const tr = 1 - (0.3 - ((seed >>> 4) & 3) * 0.05);
  const cSm = Math.min(w, hgt) * 0.1;
  const cBg = Math.min(w, hgt) * (0.2 + ((seed >>> 6) & 3) * 0.04);
  const [cL, cR] = ((seed >>> 8) & 1) === 0 ? [cSm, cBg] : [cBg, cSm];
  const shL = yb - hgt * (0.3 + ((seed >>> 9) & 3) * 0.05);
  const shR = yb - hgt * (0.28 + ((seed >>> 11) & 3) * 0.05);
  const wl = w / 2;
  // The face.
  ctx.fillStyle = STONE_FACE;
  ctx.beginPath();
  ctx.moveTo(cx - wl, yb);
  ctx.lineTo(cx - wl - w * 0.04, shL);
  ctx.lineTo(cx - wl * tl + lean, yt + cL);
  ctx.lineTo(cx - wl * tl + lean + cL, yt);
  ctx.lineTo(cx + wl * tr + lean - cR, yt);
  ctx.lineTo(cx + wl * tr + lean, yt + cR);
  ctx.lineTo(cx + wl + w * 0.03, shR);
  ctx.lineTo(cx + wl, yb);
  ctx.closePath();
  ctx.fill();
  // The shade lane on the east flank: a band inside the silhouette
  // following the flank (foot → shoulder → top chamfer), `laneW`
  // wide — depth as a value step, one fill.
  const laneW = w * 0.16;
  ctx.fillStyle = STONE_LANE;
  ctx.beginPath();
  ctx.moveTo(cx + wl - laneW, yb);
  ctx.lineTo(cx + wl, yb);
  ctx.lineTo(cx + wl + w * 0.03, shR);
  ctx.lineTo(cx + wl * tr + lean, yt + cR);
  ctx.lineTo(cx + wl * tr + lean - laneW * 0.8, yt + cR + laneW * 0.4);
  ctx.lineTo(cx + wl + w * 0.03 - laneW, shR + laneW * 0.2);
  ctx.closePath();
  ctx.fill();
  // The one lit facet: the west arris toward the fixed art sun.
  const facW = Math.max(w * 0.08, hgt * 0.06);
  ctx.fillStyle = STONE_WEST;
  quad(
    ctx,
    cx - wl, yb,
    cx - wl + facW, yb,
    cx - wl * tl + lean + facW, yt + cL + facW * 0.3,
    cx - wl * tl + lean, yt + cL,
  );
  // TOP-PLANE: the lit cap stands on the top edge, `td` deep, its
  // back edge pulled in — the block is narrower at the crown.
  const x0 = cx - wl * tl + lean + cL;
  const x1 = cx + wl * tr + lean - cR;
  const inset = (x1 - x0) * 0.12;
  const yBack = yt - td;
  ctx.fillStyle = STONE_CAP;
  quad(ctx, x0, yt, x1, yt, x1 - inset, yBack, x0 + inset, yBack);
  // The shade lane's inner edge at a height (for lichen to straddle).
  const laneX = (y: number): number => {
    const u = Math.max(0, Math.min(1, (yb - y) / (yb - (yt + cR))));
    return cx + wl - laneW + (cx + wl * tr + lean - laneW * 0.8 - (cx + wl - laneW)) * u;
  };
  return { x0, x1, bx0: x0 + inset, bx1: x1 - inset, yt, yBack, laneX };
}

// ---------------------------------------------- 522 GloomStone
/**
 * The stone that was here first. RIG: the main block stands 0.62s
 * plus a 0.14s cap — chest-high beside the 1.15s rig; the pair
 * spreads ±0.55s. Solid; not destructible; the light row is the
 * only glow. The shadow is a blob mass cast per frame.
 */
function paintGloomStone(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const ys = rend.camera.yScale;
  const syT = s * ys;
  const baseY = p.y + syT * 0.18;
  // The deal: the lesser block's side, the main block's lean, the
  // plate count and where each seats, the spore seats.
  const sideDir = ((h >>> 3) & 1) === 0 ? -1 : 1;
  const lean = (((h >>> 5) & 3) - 1.5) * s * 0.02;
  const plates = 4 + ((h >>> 7) & 1) + ((h >>> 8) & 1); // 4..6
  const W = s * 0.66;
  const HGT = s * 0.6;
  const td = W * 0.32 * ys;
  const mainX = p.x - sideDir * s * 0.08;
  return {
    sortY: ty + 0.7,
    // Painted extent: the pair ±0.56s, the cap's back at −0.6s − td
    // over the foot line (≈ −0.64s of p at yScale 0.82), the contact
    // shade's foot at +0.2s.
    body: stationBody(0.6, 0.8, 0.42),
    drawShadow: () => rend.castBlob(mainX, baseY, 0.62, s * 0.34, h ^ 0x33),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // PASS 1 — primary mass. Contact shade, the stone's foot plane
      // (a dark pan under the pair — depth as a value step), then the
      // lesser block behind, then the main block.
      ctx.fillStyle = CONTACT;
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.56, syT * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = STONE_FOOT;
      ctx.beginPath();
      facetBlob(ctx, p.x, baseY - s * 0.01, s * 0.5, h ^ 0x19, 8, 0.4);
      ctx.fill();
      const lesserX = p.x + sideDir * s * 0.33;
      const lesser = hewnBlock(ctx, lesserX, baseY - syT * 0.06, s * 0.3, s * 0.26, s * 0.3 * 0.32 * ys, -lean * 0.5, h >>> 13);
      const main = hewnBlock(ctx, mainX, baseY, W, HGT, td, lean, h);
      // PASS 2 — secondary structure. THE LICHEN PLATES: flat plate
      // quads in the gloom's two cold values on the NORTH of the cap
      // (its back edge — where the sun never reaches) and down the
      // shaded east face. Each plate a squared quad ≥0.04s; the
      // first two always take the cap's back corners, the rest are
      // dealt by hash between the east face and the lesser block's
      // north. The light row's bloom seats over these.
      const plate = (x: number, y: number, w: number, hh: number, skew: number, ink: string): void => {
        ctx.fillStyle = ink;
        quad(ctx, x + skew, y, x + w + skew, y, x + w, y + hh, x, y + hh);
      };
      const capW = main.bx1 - main.bx0;
      plate(main.bx0 + capW * 0.05, main.yBack, capW * 0.32, td * 0.55, s * 0.02, PLATE_SHADE);
      plate(main.bx0 + capW * 0.55, main.yBack - s * 0.005, capW * 0.36, td * 0.5, -s * 0.015, PLATE);
      for (let i = 2; i < plates; i++) {
        const hi = h >>> ((i * 5 + 3) & 31);
        if ((hi & 1) === 0) {
          // The east face: a plate straddling the shade lane's inner
          // edge (lichen creeping round the arris into the shade),
          // one of two values, dealt down the flank.
          const py = main.yt + s * 0.1 + (i - 2) * s * 0.13 + (hi & 2) * s * 0.02;
          plate(main.laneX(py) - s * 0.03, py, s * 0.09, s * (0.05 + ((hi >>> 2) & 1) * 0.015), s * 0.012, (hi & 4) === 0 ? PLATE : PLATE_SHADE);
        } else {
          // The lesser block's north.
          const lw = lesser.bx1 - lesser.bx0;
          plate(lesser.bx0 + lw * (0.1 + ((hi >>> 2) & 1) * 0.3), lesser.yBack, lw * 0.45, s * 0.04, s * 0.01, PLATE_SHADE);
        }
      }
      // PASS 3 — tertiary life. Spore dots: pale squares dusted
      // beside the plates (on the cap's back, the east face, the
      // foot pan) — three or four, ≥0.03s, inside the stone's own
      // silhouette (THE ONE RING).
      ctx.fillStyle = SPORE;
      ctx.fillRect(main.bx0 + capW * 0.42, main.yBack + td * 0.2, s * 0.03, s * 0.03);
      ctx.fillRect(main.laneX(main.yt + s * 0.3) - s * 0.06 + (((h >>> 20) & 1) * s * 0.02), main.yt + s * 0.3, s * 0.03, s * 0.03);
      ctx.fillRect(mainX + s * 0.2, baseY - s * 0.05, s * 0.03, s * 0.03);
      if (((h >>> 22) & 1) === 0) {
        ctx.fillRect(lesser.bx0 + s * 0.02, lesser.yBack + s * 0.01, s * 0.03, s * 0.03);
      }
      // A crack up the main face from the foot: a dark groove (depth
      // as a value step), the stone splitting from below.
      ctx.fillStyle = STONE_LANE;
      ctx.fillRect(mainX - s * 0.1 + (((h >>> 24) & 3) * s * 0.03), baseY - HGT * 0.42, s * 0.03, HGT * 0.42);
      // PASS 4 — re-read: stone in five cold steps (foot/lane/face/
      // west/cap), the one lit facet west, the cap TOP-PLANE at
      // 0.32·yScale of the width, plates under the gloom ink on the
      // north and east only, spores ≥0.03s, no strokes, no clips, no
      // rotates, no clock, no glow painted.
    },
  };
}

// ---------------------------------------------- 523 CreepRoot
/**
 * The root that comes back. RIG: the tallest arch crowns at 0.32s —
 * shin-high beside the 1.15s rig; the roots span ±0.5s. Solid r.3;
 * root ×3; STATIC. The shadow is a low prism cast per frame along
 * the main root's ground span.
 */
function paintCreepRoot(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const ys = rend.camera.yScale;
  const syT = s * ys;
  const baseY = p.y + syT * 0.18;
  // The deal: two or three roots, the main one's direction (west lip
  // to east lip or the reverse), each lesser root's seat.
  const roots = 2 + ((h >>> 4) & 1);
  const dir = ((h >>> 6) & 1) === 0 ? 1 : -1;
  /** A root: lips a (emerges) and b (dives), crown height. */
  interface Root { ax: number; ay: number; bx: number; by: number; rise: number; w: number }
  const lay: Root[] = [];
  // The main root spans the tile, its crown 0.3s up.
  lay.push({
    ax: p.x - dir * s * 0.34,
    ay: baseY - syT * (0.02 + ((h >>> 8) & 1) * 0.06),
    bx: p.x + dir * s * 0.28,
    by: baseY + syT * (0.06 + ((h >>> 9) & 1) * 0.04),
    rise: s * (0.28 + ((h >>> 10) & 3) * 0.013),
    w: s * 0.075,
  });
  // The lesser roots: shorter arches behind and beside.
  lay.push({
    ax: p.x + dir * s * 0.02,
    ay: baseY - syT * 0.22,
    bx: p.x + dir * s * 0.38,
    by: baseY - syT * 0.16,
    rise: s * (0.16 + ((h >>> 12) & 1) * 0.03),
    w: s * 0.055,
  });
  if (roots === 3) {
    lay.push({
      ax: p.x - dir * s * 0.42,
      ay: baseY + syT * 0.14,
      bx: p.x - dir * s * 0.16,
      by: baseY + syT * 0.2,
      rise: s * (0.13 + ((h >>> 13) & 1) * 0.03),
      w: s * 0.05,
    });
  }
  const main = lay[0]!;
  return {
    sortY: ty + 0.6,
    // Painted extent: the roots ±0.5s, the main crown's top at −0.32s
    // − its top plane, the SE lip at +0.24s.
    body: stationBody(0.54, 0.5, 0.42),
    // Every arch is a low prism: its chord extruded along the sun.
    drawShadow: () => {
      for (const r of lay) rend.castEdgeQuad(r.ax, r.ay, r.bx, r.by, r.rise / s);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // PASS 1 — primary mass. Contact shade under the span; the
      // roots from the back forward: the north arch first, then the
      // main root over its lips, then the south arch (in front of
      // the main root's lips) last.
      ctx.fillStyle = CONTACT;
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.04, s * 0.46, syT * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      const paintRoot = (r: Root, k: number): void => {
        // The crown sits above the chord's midpoint; each leg is a
        // tapered bar (wide at the lip, narrowing toward the crown
        // for the emerging leg; the diving leg narrows to its lip —
        // the root thins as it goes back under).
        const cx = (r.ax + r.bx) * 0.5;
        const cy = (r.ay + r.by) * 0.5 - r.rise;
        const wc = r.w * 0.8;
        const wb = r.w * 0.55;
        // The underside (east/shade value), then the body a step up,
        // then the lit top plane along the arch — depth as value.
        ctx.fillStyle = CHAR_EAST;
        taperBar(ctx, r.ax, r.ay, cx, cy, r.w, wc, ys, 0);
        taperBar(ctx, cx, cy, r.bx, r.by, wc, wb, ys, 0);
        ctx.fillStyle = CHAR_FACE;
        taperBar(ctx, r.ax, r.ay, cx, cy, r.w * 0.8, wc * 0.8, ys, s * 0.025);
        taperBar(ctx, cx, cy, r.bx, r.by, wc * 0.8, wb * 0.8, ys, s * 0.025);
        ctx.fillStyle = CHAR_TOP;
        taperBar(ctx, r.ax, r.ay, cx, cy, r.w * 0.5, wc * 0.5, ys, s * 0.055);
        taperBar(ctx, cx, cy, r.bx, r.by, wc * 0.5, wb * 0.5, ys, s * 0.055);
        // The one lit facet: the west leg's face where it meets the
        // sun — a square on whichever leg stands west.
        const westX = Math.min(r.ax, r.bx);
        const westY = westX === r.ax ? r.ay : r.by;
        const fx = westX + (cx - westX) * 0.35;
        const fy = westY + (cy - westY) * 0.35;
        ctx.fillStyle = CHAR_WEST;
        ctx.fillRect(fx - s * 0.02, fy - s * 0.045, s * 0.04, s * 0.05);
        // A crack check on the crown: the bark split as it dried.
        ctx.fillStyle = CHAR_CRACK;
        ctx.fillRect(cx - s * 0.015 + (((h >>> (16 + k)) & 1) * s * 0.02), cy - s * 0.05, s * 0.03, s * 0.04);
      };
      paintRoot(lay[1]!, 1);
      // PASS 2 — secondary structure. THE SPLIT TURF at the main
      // root's two lips: raised dirt squares with a lit lip, the
      // ground heaved where the root came up and where it went back.
      // The heave is a hand's width each side of the root (0.18s), its
      // two lips a full 0.035s step — at gameplay zoom a lip you cannot
      // read is turf that never split.
      for (const [lx, ly] of [[main.ax, main.ay], [main.bx, main.by]] as const) {
        ctx.fillStyle = DIRT;
        ctx.fillRect(lx - s * 0.09, ly - s * 0.035, s * 0.18, s * 0.075);
        ctx.fillStyle = DIRT_LIP;
        ctx.fillRect(lx - s * 0.09, ly - s * 0.065, s * 0.07, s * 0.035);
        ctx.fillRect(lx + s * 0.02, ly - s * 0.06, s * 0.065, s * 0.035);
      }
      paintRoot(main, 0);
      if (lay.length === 3) paintRoot(lay[2]!, 2);
      // THE VEIN: one SCAR_GLOOM square on the main root's lit face —
      // the gloom in the wood, painted at the plates' cold value.
      const vx = Math.min(main.ax, main.bx) + Math.abs(main.bx - main.ax) * 0.22;
      const vy = (main.ay + main.by) * 0.5 - main.rise * 0.45;
      ctx.fillStyle = PLATE;
      ctx.fillRect(vx - s * 0.02, vy - s * 0.02, s * 0.04, s * 0.04);
      // PASS 3 — tertiary life. Spore dots beside the vein and at
      // the far lip: pale, ≥0.03s, inside the root's silhouette or
      // the dirt's.
      ctx.fillStyle = SPORE;
      ctx.fillRect(vx + s * 0.03, vy - s * 0.005, s * 0.03, s * 0.03);
      ctx.fillRect(main.bx - s * 0.04 + (((h >>> 20) & 1) * s * 0.03), main.by - s * 0.045, s * 0.03, s * 0.03);
      // PASS 4 — re-read: char in four cold steps (top/west/face/
      // east) + crack, two roots or three each with a lit crown and
      // one lit west square, dirt in two, one gloom vein at the
      // plates' value, spores ≥0.03s; no strokes, no rotates, no
      // clock, no light.
    },
  };
}

// ---------------------------------------------- 524 FoulPool
/**
 * Sick water. RIG: the pan spreads ±0.44s; the reeds at the far rim
 * stand 0.32s — shin-high; the rig wades through it. Walkable; the
 * light row is the pool's own cool swell; the scum ring is the one
 * clock (0.15 rev/s). The reeds cast a contact shade per frame.
 */
function paintFoulPool(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, t, stationBody, ty } = env;
  const ys = rend.camera.yScale;
  const syT = s * ys;
  const baseY = p.y + syT * 0.2;
  const turn = ((h >>> 3) & 7) * 0.09;
  const RX = s * 0.44;
  const SQ = 0.5;
  // The scum ring's phase: (t·0.15 + h·0.1) % 1 — h's low byte, so
  // the fraction stays exact.
  const phase = (t * 0.15 + (h & 0xff) * 0.1) % 1;
  // The reeds' seats on the far (north) rim.
  const reedX = p.x + (((h >>> 6) & 3) - 1.5) * s * 0.06;
  const reedY = baseY - RX * SQ * 0.82;
  return {
    sortY: ty + 0.35,
    // Painted extent: the pan ±0.46s, the reed tips at −0.55s, the
    // south rim at +0.37s (baseY sits 0.16s under p; the pan's half-
    // height is 0.22s).
    body: stationBody(0.5, 0.56, 0.44),
    drawShadow: () => rend.castContact(reedX, reedY + s * 0.01, s * 0.14, syT * 0.05),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // PASS 1 — primary mass. The pan: a near-black rim plane, the
      // gloom interior a step up, the wash where the bloom seats
      // (north of centre, where the light row's dy sits) — three
      // opaque value planes, never a translucent wash.
      ctx.fillStyle = POOL_RIM;
      ctx.beginPath();
      facetCircle(ctx, p.x, baseY, RX, 10, turn, SQ);
      ctx.fill();
      ctx.fillStyle = POOL_DEEP;
      ctx.beginPath();
      facetBlob(ctx, p.x + s * 0.01, baseY - s * 0.01, RX * 0.82, h ^ 0x5c, 9, SQ, turn + 0.3);
      ctx.fill();
      ctx.fillStyle = POOL_WASH;
      ctx.beginPath();
      facetBlob(ctx, p.x - s * 0.03, baseY - syT * 0.06, RX * 0.5, h ^ 0x2e, 8, SQ, turn + 0.7);
      ctx.fill();
      // PASS 2 — secondary structure. THE SCUM RING: a broken chain
      // of bone squares riding the rim's inner edge, three slots in
      // four filled (hash), the chain sliding round at 0.15 rev/s in
      // two bone values. Under 4Hz, so the ring cache's cadence
      // never strobes it.
      const slots = 14;
      // Two gaps are always dealt (opposite-ish slots) so the chain
      // is BROKEN at every seed; the hash breaks more.
      const gapA = (h >>> 3) % slots;
      const gapB = (gapA + 6 + ((h >>> 12) & 3)) % slots;
      // The slot deal reads a MIXED hash: a small world hash shifted
      // past its bits is all zeros, and an all-zero deal is no ring.
      const hm = (h ^ 0x9e3779b9) >>> 0;
      for (let i = 0; i < slots; i++) {
        if (i === gapA || i === gapB) continue;
        if (((hm >>> ((i * 2 + 5) & 31)) & 3) === 0) continue;
        const a = ((i / slots) + phase) * Math.PI * 2;
        const rr = RX * (0.8 + ((h >>> ((i + 9) & 31)) & 1) * 0.08);
        const sx = p.x + Math.cos(a) * rr;
        const sy = baseY + Math.sin(a) * rr * SQ;
        const sz = s * (0.03 + ((h >>> ((i + 17) & 31)) & 1) * 0.012);
        ctx.fillStyle = (i & 1) === 0 ? DGN_BONE : DGN_BONE_DIM;
        ctx.fillRect(sx - sz * 0.5, sy - sz * 0.5, sz, sz);
      }
      // PASS 3 — tertiary life. THREE DEAD REEDS at the far rim:
      // tapered ash quads standing out of the water, a dark foot at
      // the waterline, the tallest with its tip broken over — a lit
      // square hung off the top. Dead: they do not sample the breeze.
      for (let k = 0; k < 3; k++) {
        const rx0 = reedX + (k - 1) * s * 0.07 + (((h >>> (20 + k)) & 1) * s * 0.015);
        const rh = s * (0.22 + ((h >>> (23 + k)) & 1) * 0.05 + (k === 1 ? 0.05 : 0));
        const leanX = (((h >>> (26 + k)) & 1) === 0 ? -1 : 1) * s * 0.03;
        ctx.fillStyle = REED_FOOT;
        ctx.fillRect(rx0 - s * 0.025, reedY - s * 0.02, s * 0.05, s * 0.03);
        ctx.fillStyle = REED;
        quad(ctx, rx0 - s * 0.02, reedY, rx0 + s * 0.02, reedY, rx0 + leanX + s * 0.015, reedY - rh, rx0 + leanX - s * 0.015, reedY - rh);
        // The lit west edge of the stalk: a sliver quad, 0.03s at the foot.
        ctx.fillStyle = REED_LIT;
        quad(ctx, rx0 - s * 0.02, reedY, rx0 + s * 0.01, reedY, rx0 + leanX * 0.5 + s * 0.005, reedY - rh * 0.5, rx0 + leanX * 0.5 - s * 0.02, reedY - rh * 0.5);
        if (k === 1) {
          // The broken tip: folded over, hanging east.
          ctx.fillStyle = REED_FOOT;
          ctx.fillRect(rx0 + leanX - s * 0.005, reedY - rh - s * 0.01, s * 0.05, s * 0.03);
        }
      }
      // PASS 4 — re-read: the pan in three opaque cold steps, bone
      // in two, ash in three; the one clock the scum's slow slide;
      // every square ≥0.03s; no strokes, no rotates, no glow painted
      // (the row is the light); walkable — no edge cast.
    },
  };
}

/** The blighted row: the crop painter path with the blight palette. */
function paintCropBlighted(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, t, tile, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  return {
    sortY: ty + 0.75,
    drawShadow: () => rend.castFloraShadow(p.x, p.y + syT * 0.3, tile, h),
    draw: () => rend.drawFlora(p.x, p.y, tx, ty, tile, h, t),
  };
}

export const GLOOM_PROPS: PropEntries = [
  [[Tile.GloomStone], paintGloomStone],
  [[Tile.CreepRoot], paintCreepRoot],
  [[Tile.FoulPool], paintFoulPool],
  [[Tile.CropBlighted], paintCropBlighted],
];
