/**
 * THE SCARRED LAND — E. the marks: five peoples finally get a glyph.
 * CharterPost (526, the towns), LampCairn (527, the waykeepers),
 * LegionStandard (528), BoneTree (529, the wolfkin), TallyStone (530,
 * the kobolds), WardThread (531, the evencourt), RedRagStake (532, the
 * reavers), PitLamp / PitLampDark (533/534, the Returners).
 *
 * K2 THE MARKS. A mark is the cheapest faction visibility in the
 * world: a post you can read from the road, a rag you can read from
 * the treeline. Every piece here is a claim, so every piece stands
 * up (the thread lies lowest and even it stands on two wands) and
 * every piece carries exactly ONE glyph — a brass square, a painted
 * square, a bar on a cloth, a jaw on a sinew, a tally, a chip on a
 * thread, a chalk square, a lamp that is or is not lit.
 *
 * The laws, in the order the brush meets them:
 *  - BODY-RULER: every extent is in `s` (the tile); the rig stands
 *    1.15s. Each painter's header states its height against the rig.
 *  - TOP-PLANE: every standing piece shows its lit top (collar, crown,
 *    slab top, cap) foreshortened at the camera's yScale.
 *  - FLAT FORGE / BLOCK LAW: squared filled quads, one lit facet toward
 *    the fixed west art sun, depth as value steps, min feature 0.03s.
 *    Every diagonal (a lean, a cord, a limb, a sinew, a sag) is a QUAD
 *    built by moveTo/lineTo — never ctx.rotate/translate — so the
 *    canvas oracle and the GL stage draw the same thing.
 *  - THE ONE RING: silhouette only. Nothing here strokes; the cached
 *    eight-tap ring (CACHED_RING_TILES) inks the painted silhouette.
 *    Loose pieces share a silhouette with their piece (the chip hangs
 *    on the thread, the bone tree's cords run to its limbs, the
 *    footing stones touch the slab) or sit inside a contact shade (the dark lamp's
 *    one shard) — nothing is shed on open ground to ring as a wheel.
 *  - ONE BREEZE: the standard's cloth (≤0.06s), the bone tree's
 *    hangings (≤0.04s), the reavers' rag (≤0.04s) and the ward thread
 *    (≤0.03s) sample rend.breezeAt ONCE per draw through `breeze()`,
 *    which asks for the amplitude split 0.75 sway / 0.55 lag and
 *    clamps both, so no painted vertex ever leaves its still pose by
 *    more than the law (0.75² + 0.55² ≈ 0.87 < 1: the two beats
 *    together stay inside the amplitude, not each). The swing between two ring-cache bakes
 *    (TREE_REBAKE_FRAMES) is then a breath and never a jump. The five
 *    still pieces (post, cairn, tally, lit lamp, dark lamp) never read
 *    the clock; three of them idle in STATIC_RING_TILES.
 *  - Collect-time light: the cairn and the lit pit lamp have their
 *    lights.ts rows; their panes are painted COLD here (a horn grey, no
 *    flame ink) and the row is the only warmth. The dark lamp and the
 *    thread have no row by law. Nothing here queueGlows; nothing here
 *    paints smoke.
 *  - Draw-time `const ctx = rend.ctx`; hash deals by `h >>> k`.
 *  - SHADOWS NEVER BAKE: castEdgeQuad per frame for every standing
 *    piece; the walkable thread casts its two wands.
 *  - Faction cloth is its own ink — never a dye band (the Legion's
 *    crimson, the reavers' rag red).
 */
import { Tile } from '@arx/shared';
import { shade } from '../../tint.js';
import { chamferRect, facetBlob } from '../../shapes.js';
import { GY_STONE, GY_STONE_LIT } from '../../paintVocab.js';
import {
  CHARTER_BRASS,
  DGN_BONE,
  DGN_BONE_DIM,
  DGN_IRON,
  DGN_IRON_LIT,
  LEGION_CRIMSON,
  SCAR_RAG_RED,
  TWN_STONE,
  TWN_STONE_DARK,
  TWN_STONE_LIT,
} from '../palette.js';
import type { DrawItem } from '../../renderer.js';
import type { PropEntries, PropFrame, PropHost } from '../types.js';

// ---- the inks (dealt once; the hash deals the postures)
/** The contact shade every piece seats in. */
const CONTACT = 'rgba(12, 8, 20, 0.24)';
/** Planed oak (the charter post): the towns' timber, squared and true. */
const POST_OAK = '#5a4226';
const POST_OAK_WEST = shade(POST_OAK, 14);
const POST_OAK_EAST = shade(POST_OAK, -12);
/** Where planed oak has stood a few winters: the top silvers. */
const POST_SILVER = '#6f6558';
const POST_SILVER_WEST = shade(POST_SILVER, 12);
/** The tar the foot was dipped in against rot: a cold black-brown. */
const TAR = '#211b1c';
const BRASS_LIT = shade(CHARTER_BRASS, 22);
const BRASS_STAMP = shade(CHARTER_BRASS, -34);
const BRASS_EDGE = shade(CHARTER_BRASS, -16);
/** The waykeepers' cairn: graveyard stone, the country's plain grey. */
const CAIRN_FACE = GY_STONE;
const CAIRN_WEST = shade(GY_STONE_LIT, -4);
const CAIRN_EAST = shade(GY_STONE, -16);
const CAIRN_TOP = GY_STONE_LIT;
const CAIRN_JOINT = shade(GY_STONE, -24);
/** The waymark: whitewash, a pale square anyone can read from a horse. */
const WAYMARK = '#cfc9bc';
const WAYMARK_PIP = '#4a4552';
/**
 * A lamp pane by day: horn, painted COLD — a warm-grey with chroma
 * under 40 (marks.test pins it). The lights.ts row is the flame.
 * Exported so the test can name the ink it forbids to be warm.
 */
export const PANE_COLD = '#a89d8a';
const PANE_COLD_LIT = '#b8ad9a';
/** The dark lamp's pane: soot on the inside of the horn. */
export const PANE_DARK = '#2e2c38';
const PANE_SOOT = '#3a3742';
/** The Legion's pole: ash wood, iron-shod. */
const POLE_ASH = '#463a2e';
const POLE_ASH_WEST = shade(POLE_ASH, 14);
const POLE_ASH_EAST = shade(POLE_ASH, -10);
const CRIMSON_FOLD = shade(LEGION_CRIMSON, -14);
const CRIMSON_HEM = shade(LEGION_CRIMSON, -22);
/** The one bar on the Legion's cloth: lamp-black, never a dye. */
const LEGION_BAR = '#1c161a';
/** Cord and rope: hemp gone grey in the weather. */
const ROPE = '#8a713f';
const ROPE_DARK = '#5e4c2c';
/** Dead sapling wood (the bone tree): grey-brown, cold. */
const SNAG = '#5b4f48';
const SNAG_WEST = shade(SNAG, 14);
const SNAG_EAST = shade(SNAG, -12);
const SNAG_TWIG = shade(SNAG, -18);
/** Where a claw opened the bark: the pale wood under. */
const SCRATCH = '#8c7d6c';
/** Sinew: a dried cord, darker than the bone it holds. */
const SINEW = '#7a6a56';
const BONE_PIT = '#3a3238';
/** A pelt scrap: dull fur, one paler flank. */
const PELT = '#5e4636';
const PELT_LIT = shade(PELT, 12);
/** The tally: soot rubbed into the cut. */
const TALLY_INK = '#2f2a33';
/** The chalk smear on the tally stone: white, low chroma. */
const CHALK = '#d9d6cc';
const SLAB_EAST = shade(TWN_STONE_DARK, -6);
/** The evencourt's wands: peeled willow, silver-green. */
const WAND = '#9fb096';
const WAND_WEST = '#c2d0b8';
const WAND_EAST = '#7a8a72';
const WAND_CUT = '#d6dcd0';
/** Moonpale thread and the moonglass-tint chip knotted on it. */
const THREAD = '#cdd8ec';
const KNOT = '#6b7686';
const MOONGLASS = '#a6dcd6';
const MOONGLASS_LIT = '#d8f2ee';
/** A reaver's stake: whatever tree stood nearest, bark on. */
const STAKE = '#4f4032';
const STAKE_WEST = shade(STAKE, 14);
const STAKE_EAST = shade(STAKE, -12);
const STAKE_CHECK = shade(STAKE, -22);
const RAG_BACK = shade(SCAR_RAG_RED, -16);
const RAG_KNOT = shade(SCAR_RAG_RED, -30);
/** The Returners' pit timber: raw split oak, driven — cold-graded so
 *  the lit lamp's daytime paint stays under the chroma pin. */
const PIT_TIMBER = '#584636';
const PIT_TIMBER_WEST = '#6f5a48';
const PIT_TIMBER_EAST = '#3e3227';
const PIT_TIMBER_CAP = '#4a3a2c';
const PIT_TIMBER_BAND = '#3b2f24';

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
 * ONE BREEZE, sampled once per draw and held to the law. `amp` is the
 * piece's whole amplitude in tiles; the sway beat gets 0.75 of it and
 * the lag beat 0.55 (together 0.93), so a vertex that rides both (a
 * hem corner, the knot) plus the turning edge of the thin quad it
 * hangs on (a cord's perpendicular swings with its end — up to a few
 * thousandths of a tile) stays inside `amp·s` of its still pose. The
 * clamp is a guard against a gale, not the shape of the motion —
 * breezeAt's own gust factor keeps a calm day well under it.
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

/** A filled triangle (a pyramid facet, a spearhead, a shard). */
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
 * A squared shaft from foot (xb, yb) to head (xt, yt), `w` wide: the
 * face, one lit west strip, one dark east strip — value steps, never
 * stroked lines. A plumb shaft is a rect; a leaning one is three
 * parallelograms. Strips are ≥0.03s (BLOCK LAW).
 */
function shaft(
  ctx: CanvasRenderingContext2D,
  xb: number, yb: number, xt: number, yt: number,
  w: number, face: string, west: string, east: string,
  wl: number, we: number,
): void {
  const hw = w * 0.5;
  ctx.fillStyle = face;
  quad(ctx, xb - hw, yb, xt - hw, yt, xt + hw, yt, xb + hw, yb);
  ctx.fillStyle = west;
  quad(ctx, xb - hw, yb, xt - hw, yt, xt - hw + wl, yt, xb - hw + wl, yb);
  ctx.fillStyle = east;
  quad(ctx, xb + hw - we, yb, xt + hw - we, yt, xt + hw, yt, xb + hw, yb);
}

/** A cord a→b of thickness `th`: a thin quad along the axis. */
function cord(
  ctx: CanvasRenderingContext2D,
  ax: number, ay: number, bx: number, by: number, th: number,
): void {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * th * 0.5;
  const ny = (dx / len) * th * 0.5;
  quad(ctx, ax - nx, ay - ny, bx - nx, by - ny, bx + nx, by + ny, ax + nx, ay + ny);
}

/** The seat: a contact ellipse under the foot. */
function contact(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.fillStyle = CONTACT;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------- 526 CharterPost
/**
 * The towns' claim: a squared, planed oak post standing plumb (a
 * charter is surveyed, not driven), a four-facet pyramid cap on a
 * collar, a brass plate with the charter's stamp, the foot tarred
 * against rot. RIG: the collar tops at 1.05s — the rig's chin; the
 * pyramid's apex at 1.21s. Solid r.2; post ×2. Static.
 */
function paintCharterPost(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  const W = s * 0.14;
  const H = s * 1.0;
  const topY = baseY - H;
  // The deal: how high the tar was brushed, where the silvering
  // stops, where one grain check opened, which side the tar ran up.
  const tarH = s * (0.17 + ((h >>> 4) & 3) * 0.02);
  const silverH = s * (0.24 + ((h >>> 7) & 3) * 0.03);
  const checkY = topY + s * (0.52 + ((h >>> 10) & 7) * 0.04);
  const tarSide = ((h >>> 13) & 1) === 0 ? -1 : 1;
  const collarW = s * 0.2;
  const collarH = s * 0.05;
  const collarTop = syT * 0.06;
  const apexY = topY - collarH - collarTop - s * 0.16;
  const plateY = topY + s * 0.2;
  const plateW = s * 0.12;
  return {
    sortY: ty + 0.66,
    // Painted extent: collar ±0.1s, apex 1.27s over baseY (1.14s over
    // p), foot contact 0.08s under baseY.
    body: stationBody(0.3, 1.3, 0.35),
    drawShadow: () => rend.castEdgeQuad(p.x - W * 0.5, baseY, p.x + W * 0.5, baseY, 1.05),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // PASS 1 — primary mass. The seat, then the shaft: face, one
      // lit west facet, one dark east arris.
      contact(ctx, p.x, baseY + s * 0.01, W * 0.95, syT * 0.09);
      shaft(ctx, p.x, baseY, p.x, topY, W, POST_OAK, POST_OAK_WEST, POST_OAK_EAST, s * 0.04, s * 0.03);
      // The silvered head: planed oak weathers grey from the top down;
      // face and west facet both step cooler, the east arris stays.
      ctx.fillStyle = POST_SILVER;
      ctx.fillRect(p.x - W * 0.5, topY, W - s * 0.03, silverH);
      ctx.fillStyle = POST_SILVER_WEST;
      ctx.fillRect(p.x - W * 0.5, topY, s * 0.04, silverH);
      // The collar under the cap: a wider block, its top plane lit
      // (TOP-PLANE), one lit west facet.
      ctx.fillStyle = POST_OAK_EAST;
      ctx.fillRect(p.x - collarW * 0.5, topY - collarH, collarW, collarH);
      ctx.fillStyle = POST_OAK;
      ctx.fillRect(p.x - collarW * 0.5, topY - collarH, s * 0.04, collarH);
      ctx.fillStyle = POST_SILVER_WEST;
      ctx.fillRect(p.x - collarW * 0.5, topY - collarH - collarTop, collarW, collarTop);
      // The pyramid cap: two visible facets split at the apex — the
      // west one lit, the east one dark (one lit facet).
      const capBase = topY - collarH - collarTop;
      ctx.fillStyle = POST_SILVER_WEST;
      tri(ctx, p.x - collarW * 0.5, capBase, p.x, apexY, p.x, capBase);
      ctx.fillStyle = POST_OAK_EAST;
      tri(ctx, p.x, capBase, p.x, apexY, p.x + collarW * 0.5, capBase);
      // PASS 2 — secondary. The plate: brass, a lit top edge, a
      // darker edge under, the charter's stamped square in the middle
      // (depth as value steps), and its own shadow step on the shaft.
      ctx.fillStyle = POST_OAK_EAST;
      ctx.fillRect(p.x - plateW * 0.5, plateY + plateW, plateW, s * 0.03);
      ctx.fillStyle = CHARTER_BRASS;
      ctx.fillRect(p.x - plateW * 0.5, plateY, plateW, plateW);
      ctx.fillStyle = BRASS_LIT;
      ctx.fillRect(p.x - plateW * 0.5, plateY, plateW, s * 0.03);
      ctx.fillStyle = BRASS_EDGE;
      ctx.fillRect(p.x - plateW * 0.5, plateY + plateW - s * 0.03, plateW, s * 0.03);
      ctx.fillStyle = BRASS_STAMP;
      ctx.fillRect(p.x - s * 0.025, plateY + s * 0.035, s * 0.05, s * 0.05);
      // The tar band at the foot, and the one place the brush ran up
      // past the line on the side the tarrer stood.
      ctx.fillStyle = TAR;
      ctx.fillRect(p.x - W * 0.5, baseY - tarH, W, tarH);
      ctx.fillRect(p.x + tarSide * s * 0.035 - s * 0.015, baseY - tarH - s * 0.05, s * 0.03, s * 0.05);
      // PASS 3 — tertiary. One grain check where the planed face
      // opened over a dry summer: a dark tick on the east half.
      ctx.fillStyle = POST_OAK_EAST;
      ctx.fillRect(p.x + s * 0.005, checkY, s * 0.03, s * 0.09);
      // PASS 4 — re-read: oak (3 values) + silver (2) + brass (4) +
      // tar = one lit facet per block, every feature ≥0.03s, nothing
      // stroked, nothing rotated, no clock.
    },
  };
}

// ---------------------------------------------- 527 LampCairn
/**
 * The waykeepers' mark: three courses of squared grey stone stacked
 * to a flat crown, a small iron lantern seated in the crown, a
 * whitewashed square on the road face. RIG: the crown at 0.44s (the
 * rig's knee), the lantern's cap peak at 0.82s (its hip). Solid; the
 * road-faith law keeps it unbreakable. The lights.ts row is the
 * warmth — the pane here is cold horn.
 */
function paintLampCairn(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The courses, foot to crown: [width, height, block count].
  const courses: ReadonlyArray<readonly [number, number, number]> = [
    [0.58, 0.15, 3],
    [0.46, 0.14, 2],
    [0.34, 0.13, 1],
  ];
  const ledge = syT * 0.09;
  const markSide = ((h >>> 3) & 1) === 0 ? -1 : 1;
  // Course tops climb; the crown plane is where the lantern seats.
  let y = baseY;
  const tops: number[] = [];
  for (const c of courses) {
    y -= s * c[1];
    tops.push(y);
  }
  const crownY = tops[2]! - ledge;
  const lanW = s * 0.2;
  const lanH = s * 0.22;
  const lanY = crownY - ledge * 0.4 - lanH;
  const capH = s * 0.1;
  return {
    sortY: ty + 0.66,
    // Painted extent: foot ±0.3s, cap peak 0.86s over baseY.
    body: stationBody(0.4, 0.95, 0.4),
    drawShadow: () => rend.castEdgeQuad(p.x - s * 0.28, baseY, p.x + s * 0.28, baseY, 0.5),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      contact(ctx, p.x, baseY + s * 0.01, s * 0.32, syT * 0.12);
      // PASS 1 — primary mass: the courses. Each course is one lit
      // top plane (the course above covers its middle and leaves the
      // setback as a lit ledge) over its blocks; each block a face,
      // a lit west strip, a dark east strip; the joint between two
      // blocks is the east strip of the west one plus a dark seam.
      let yb = baseY;
      for (let ci = 0; ci < courses.length; ci++) {
        const [cw, ch, n] = courses[ci]!;
        const H = s * ch;
        const yt = yb - H;
        const shift = (((h >>> (5 + ci * 2)) & 3) - 1.5) * s * 0.015;
        const x0 = p.x - s * cw * 0.5 + shift;
        const total = s * cw;
        ctx.fillStyle = CAIRN_TOP;
        ctx.fillRect(x0, yt - ledge, total, ledge);
        let x = x0;
        for (let bi = 0; bi < n; bi++) {
          const last = bi === n - 1;
          // Block widths share the course; the hash deals the split.
          const bw = last ? x0 + total - x : (total / n) * (0.9 + ((h >>> (9 + ci * 3 + bi)) & 1) * 0.2);
          const tone = (((h >>> (14 + ci * 2 + bi)) & 3) - 1) * 4;
          ctx.fillStyle = tone === 0 ? CAIRN_FACE : shade(CAIRN_FACE, tone);
          ctx.fillRect(x, yt, bw, H);
          ctx.fillStyle = CAIRN_WEST;
          ctx.fillRect(x, yt, s * 0.035, H);
          ctx.fillStyle = CAIRN_EAST;
          ctx.fillRect(x + bw - s * 0.03, yt, s * 0.03, H);
          if (!last) {
            ctx.fillStyle = CAIRN_JOINT;
            ctx.fillRect(x + bw - s * 0.015, yt, s * 0.03, H);
          }
          x += bw;
        }
        // The bed joint under every course but the first.
        if (ci > 0) {
          ctx.fillStyle = CAIRN_JOINT;
          ctx.fillRect(x0 + s * 0.02, yb - s * 0.015, total - s * 0.04, s * 0.03);
        }
        yb = yt;
      }
      // PASS 2 — secondary: the lantern seated in the crown. A dark
      // foot plate, the iron box (frame, mid bar), horn panes painted
      // cold, a peaked cap with its one lit west facet.
      const lx = p.x - lanW * 0.5;
      ctx.fillStyle = shade(DGN_IRON, -8);
      ctx.fillRect(lx - s * 0.02, lanY + lanH - s * 0.02, lanW + s * 0.04, s * 0.04);
      ctx.fillStyle = DGN_IRON;
      ctx.fillRect(lx, lanY, lanW, lanH);
      ctx.fillStyle = PANE_COLD;
      ctx.fillRect(lx + s * 0.03, lanY + s * 0.03, lanW - s * 0.06, lanH - s * 0.06);
      ctx.fillStyle = PANE_COLD_LIT;
      ctx.fillRect(lx + s * 0.03, lanY + s * 0.03, s * 0.03, lanH - s * 0.06);
      ctx.fillStyle = DGN_IRON;
      ctx.fillRect(p.x - s * 0.015, lanY, s * 0.03, lanH);
      ctx.fillStyle = DGN_IRON_LIT;
      ctx.fillRect(lx, lanY, s * 0.03, lanH);
      // The cap: west facet lit, east facet iron.
      const capBase = lanY;
      ctx.fillStyle = DGN_IRON_LIT;
      tri(ctx, lx - s * 0.03, capBase, p.x, capBase - capH, p.x, capBase);
      ctx.fillStyle = DGN_IRON;
      tri(ctx, p.x, capBase, p.x, capBase - capH, lx + lanW + s * 0.03, capBase);
      ctx.fillStyle = shade(DGN_IRON, -10);
      ctx.fillRect(p.x - s * 0.015, capBase - capH - s * 0.03, s * 0.03, s * 0.03);
      // PASS 3 — tertiary: the waymark on the road face — a whitewash
      // square on the middle course, the keepers' pip in it.
      const my = tops[1]! + s * 0.025;
      const mx = p.x + markSide * s * 0.1 - s * 0.045;
      ctx.fillStyle = WAYMARK;
      ctx.fillRect(mx, my, s * 0.09, s * 0.09);
      ctx.fillStyle = WAYMARK_PIP;
      ctx.fillRect(mx + s * 0.03, my + s * 0.03, s * 0.03, s * 0.03);
      // PASS 4 — re-read: stone (5 values), iron (3), horn (2, cold),
      // whitewash (2). One lit facet per block, every top plane lit,
      // every feature ≥0.03s, no clock, no flame ink.
    },
  };
}

// ---------------------------------------------- 528 LegionStandard
/**
 * The Legion's claim: an iron-shod ash pole with a crossbar, ONE
 * square of crimson cloth carrying ONE black bar, an iron spearhead
 * finial. SOCKETED, never guyed: a muster standard is driven and
 * shod, and the K2 proof showed the guy cords read as a tripod at
 * zoom 1.3 — so the shoe alone holds it. RIG: the crossbar at 1.73s
 * (over the rig's head — a standard is read from a distance), the
 * finial tip at 2.05s. FADE_TALL. Solid; banner ×3. The cloth samples
 * the one breeze, clamped to 0.06s.
 */
function paintLegionStandard(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, t, tx, ty, stationBody } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  const W = s * 0.08;
  const H = s * 1.85;
  const topY = baseY - H;
  const barY = topY + s * 0.12;
  const barHW = s * 0.31;
  const barTh = s * 0.05;
  const shoeH = s * 0.2;
  const clothHW = s * 0.25;
  const clothTop = barY + barTh;
  const clothH = s * 0.5;
  const finH = s * 0.2;
  const ph = breezePhase(h, 3);
  // The deal: where the pole was mended, how deep the cloth's east
  // fold falls.
  // The mend sits on the pole's bare stretch under the cloth's hem
  // (0.67s) and over the shoe (1.65s).
  const mendY = topY + s * (0.8 + ((h >>> 7) & 3) * 0.12);
  const foldU = 0.62 + ((h >>> 5) & 3) * 0.03;
  return {
    sortY: ty + 0.66,
    // Painted extent: the crossbar to ±0.34s, finial tip 2.07s over
    // baseY, the shoe's contact shade 0.1s under it.
    body: stationBody(0.6, 2.2, 0.45),
    drawShadow: () => rend.castEdgeQuad(p.x - W * 0.5, baseY, p.x + W * 0.5, baseY, 1.85),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // ONE BREEZE, sampled once and held to the cloth's law (0.06s).
      const { sw, lg } = breeze(rend, tx, ty, t, ph, s, 0.06);
      // PASS 1 — primary mass. The seat; the pole with its west
      // facet; the iron shoe that holds it (socketed, no cords).
      contact(ctx, p.x, baseY + s * 0.01, s * 0.2, syT * 0.09);
      shaft(ctx, p.x, baseY, p.x, topY, W, POLE_ASH, POLE_ASH_WEST, POLE_ASH_EAST, s * 0.03, s * 0.03);
      ctx.fillStyle = DGN_IRON;
      ctx.fillRect(p.x - W * 0.5, baseY - shoeH, W, shoeH);
      ctx.fillStyle = DGN_IRON_LIT;
      ctx.fillRect(p.x - W * 0.5, baseY - shoeH, s * 0.03, shoeH);
      // The mend: an iron band where the pole was spliced, on its
      // bare stretch under the cloth (the deal says where). Painted
      // with the pole so the cloth always hangs in front of it.
      ctx.fillStyle = DGN_IRON;
      ctx.fillRect(p.x - W * 0.5 - s * 0.01, mendY, W + s * 0.02, s * 0.04);
      // PASS 2 — secondary. The cloth hangs from the crossbar's
      // underside: its top edge is nailed, its foot swings by the
      // breeze. A fold on the east third steps darker, the hem a
      // step darker still, and the ONE bar crosses at the waist,
      // following the same deformation (a quad, never a rect).
      const cx0 = p.x - clothHW;
      const cx1 = p.x + clothHW;
      const cy1 = clothTop + clothH;
      const px = (u: number, v: number): number => cx0 + (cx1 - cx0) * u + sw * v;
      const py = (v: number): number => clothTop + (cy1 - clothTop) * v + lg * v;
      ctx.fillStyle = LEGION_CRIMSON;
      quad(ctx, px(0, 0), py(0), px(1, 0), py(0), px(1, 1), py(1), px(0, 1), py(1));
      ctx.fillStyle = CRIMSON_FOLD;
      quad(ctx, px(foldU, 0), py(0), px(1, 0), py(0), px(1, 1), py(1), px(foldU, 1), py(1));
      ctx.fillStyle = CRIMSON_HEM;
      quad(ctx, px(0, 0.93), py(0.93), px(1, 0.93), py(0.93), px(1, 1), py(1), px(0, 1), py(1));
      ctx.fillStyle = LEGION_BAR;
      quad(ctx, px(0, 0.44), py(0.44), px(1, 0.44), py(0.44), px(1, 0.58), py(0.58), px(0, 0.58), py(0.58));
      // The crossbar over the cloth: ash, lit top strip, iron caps at
      // both ends, an iron band where it lashes to the pole.
      ctx.fillStyle = POLE_ASH;
      ctx.fillRect(p.x - barHW, barY, barHW * 2, barTh);
      ctx.fillStyle = POLE_ASH_WEST;
      ctx.fillRect(p.x - barHW, barY - s * 0.03, barHW * 2, s * 0.03);
      ctx.fillStyle = DGN_IRON;
      ctx.fillRect(p.x - barHW - s * 0.02, barY - s * 0.03, s * 0.05, barTh + s * 0.03);
      ctx.fillRect(p.x + barHW - s * 0.03, barY - s * 0.03, s * 0.05, barTh + s * 0.03);
      ctx.fillRect(p.x - W * 0.5 - s * 0.015, barY - s * 0.05, W + s * 0.03, barTh + s * 0.07);
      // The finial: a socket, then a spearhead split at its spine —
      // the west facet lit, the east iron.
      ctx.fillStyle = DGN_IRON;
      ctx.fillRect(p.x - s * 0.035, topY - s * 0.05, s * 0.07, s * 0.05);
      const fb = topY - s * 0.05;
      ctx.fillStyle = DGN_IRON_LIT;
      tri(ctx, p.x - s * 0.06, fb - finH * 0.35, p.x, fb - finH, p.x, fb);
      ctx.fillStyle = DGN_IRON;
      tri(ctx, p.x, fb, p.x, fb - finH, p.x + s * 0.06, fb - finH * 0.35);
      // PASS 3 — tertiary: the nail heads where the cloth's top edge
      // is fixed to the bar's underside — three iron squares along
      // the hem line, the only hard edge on the cloth.
      ctx.fillStyle = DGN_IRON;
      for (const u of [0.12, 0.5, 0.88]) {
        ctx.fillRect(px(u, 0) - s * 0.015, clothTop - s * 0.005, s * 0.03, s * 0.03);
      }
      // PASS 4 — re-read: one cloth, one bar, one ink family for the
      // cloth (crimson + two darker steps + lamp-black), pole with
      // one lit facet, cords as quads, the breeze clamped ≤0.06s.
    },
  };
}

// ---------------------------------------------- 529 BoneTree
/**
 * The wolfkin's mark: a bare dead sapling forked at the waist, four
 * to six jaws and long bones hung on sinew from its limbs, one pelt
 * scrap at the fork, two claw scratches on the trunk. RIG: the fork
 * at 0.62s (the rig's hip), the tall limb's tip at 1.35s (over its
 * head). Solid r.25; bones ×2. The hangings sample the one breeze,
 * clamped to 0.04s.
 */
function paintBoneTree(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, t, tx, ty, stationBody } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  const m = ((h >>> 2) & 1) === 0 ? 1 : -1;
  const tx0 = p.x + m * s * 0.03;
  const forkY = baseY - s * 0.62;
  const W = s * 0.1;
  // Two limbs: the long one leans with `m`, the short one against it.
  const lA = { x: tx0 - m * s * 0.34, y: baseY - s * 1.35 };
  const lB = { x: tx0 + m * s * 0.27, y: baseY - s * 1.12 };
  const n = 4 + Math.min(2, (h >>> 10) & 3);
  const ph = breezePhase(h, 14);
  return {
    sortY: ty + 0.68,
    // Painted extent: limb tips ±0.4s (hangings swing ±0.04s past
    // that), the tall tip 1.35s over baseY.
    body: stationBody(0.55, 1.45, 0.4),
    drawShadow: () => rend.castEdgeQuad(tx0 - W * 0.5, baseY, tx0 + W * 0.5, baseY, 1.2),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // ONE BREEZE, held to the hangings' law (0.04s).
      const { sw, lg } = breeze(rend, tx, ty, t, ph, s, 0.04);
      // PASS 1 — primary mass: the seat, the trunk, the two limbs
      // (each a shaft leaning off the fork), a twig stub on each.
      contact(ctx, tx0, baseY + s * 0.01, s * 0.16, syT * 0.08);
      shaft(ctx, tx0, baseY, tx0, forkY + s * 0.04, W, SNAG, SNAG_WEST, SNAG_EAST, s * 0.03, s * 0.03);
      shaft(ctx, tx0 - m * s * 0.02, forkY + s * 0.06, lA.x, lA.y, s * 0.06, SNAG, SNAG_WEST, SNAG_EAST, s * 0.03, s * 0.03);
      shaft(ctx, tx0 + m * s * 0.02, forkY + s * 0.06, lB.x, lB.y, s * 0.055, SNAG, SNAG_WEST, SNAG_EAST, s * 0.03, s * 0.03);
      // Twig stubs: broken short, the ends dark.
      ctx.fillStyle = SNAG_TWIG;
      const tA = 0.55;
      cord(ctx, tx0 + (lA.x - tx0) * tA, forkY + (lA.y - forkY) * tA, tx0 + (lA.x - tx0) * tA - m * s * 0.1, forkY + (lA.y - forkY) * tA - s * 0.05, s * 0.03);
      const tB = 0.7;
      cord(ctx, tx0 + (lB.x - tx0) * tB, forkY + (lB.y - forkY) * tB, tx0 + (lB.x - tx0) * tB + m * s * 0.09, forkY + (lB.y - forkY) * tB - s * 0.04, s * 0.03);
      ctx.fillRect(lA.x - s * 0.02, lA.y - s * 0.03, s * 0.04, s * 0.03);
      ctx.fillRect(lB.x - s * 0.02, lB.y - s * 0.03, s * 0.04, s * 0.03);
      // PASS 2 — secondary: the hangings. Each hangs from a point on
      // a limb by a sinew, swinging with the one breeze weighted by
      // its own deal (every offset stays inside ±0.04s). Jaws and
      // long bones alternate by the deal.
      for (let i = 0; i < n; i++) {
        const hi = h >>> ((i * 4) & 31);
        const onA = (i & 1) === 0;
        const u = 0.38 + ((i >> 1) * 0.28 + (hi & 3) * 0.05) % 0.6;
        const ax = onA ? tx0 + (lA.x - tx0) * u : tx0 + (lB.x - tx0) * u;
        const ay = onA ? forkY + (lA.y - forkY) * u : forkY + (lB.y - forkY) * u;
        const len = s * (0.12 + ((hi >>> 2) & 3) * 0.03);
        const wgt = ((hi >>> 4) & 3) / 3;
        const ox = sw * wgt + lg * (1 - wgt);
        const bx = ax + ox;
        const by = ay + len;
        ctx.fillStyle = SINEW;
        cord(ctx, ax, ay, bx, by, s * 0.03);
        if (((hi >>> 6) & 1) === 0) {
          // A long bone: a dim shaft between two knobs.
          ctx.fillStyle = DGN_BONE_DIM;
          ctx.fillRect(bx - s * 0.022, by, s * 0.045, s * 0.15);
          ctx.fillStyle = DGN_BONE;
          ctx.fillRect(bx - s * 0.035, by - s * 0.01, s * 0.07, s * 0.045);
          ctx.fillRect(bx - s * 0.035, by + s * 0.13, s * 0.07, s * 0.045);
        } else {
          // A jaw: a wedge hung by its hinge, two tooth pits.
          ctx.fillStyle = DGN_BONE;
          quad(ctx, bx - s * 0.075, by, bx + s * 0.065, by, bx + s * 0.03, by + s * 0.075, bx - s * 0.05, by + s * 0.075);
          ctx.fillStyle = DGN_BONE_DIM;
          ctx.fillRect(bx - s * 0.05, by + s * 0.045, s * 0.08, s * 0.03);
          ctx.fillStyle = BONE_PIT;
          ctx.fillRect(bx - s * 0.05, by + s * 0.01, s * 0.03, s * 0.03);
          ctx.fillRect(bx + s * 0.01, by + s * 0.01, s * 0.03, s * 0.03);
        }
      }
      // The pelt scrap at the fork: dull fur hung over the crotch, a
      // ragged hem, one paler flank toward the sun. It swings with
      // the lag beat (the heavier thing moves later).
      const fx = tx0 - s * 0.07;
      const fy = forkY + s * 0.02;
      const hem = fy + s * 0.22;
      ctx.fillStyle = PELT;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + s * 0.14, fy);
      ctx.lineTo(fx + s * 0.15 + lg, hem - s * 0.05);
      ctx.lineTo(fx + s * 0.09 + lg, hem);
      ctx.lineTo(fx + s * 0.04 + lg, hem - s * 0.04);
      ctx.lineTo(fx - s * 0.01 + lg, hem - s * 0.01);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PELT_LIT;
      quad(ctx, fx, fy, fx + s * 0.03, fy, fx + s * 0.03 + lg, hem - s * 0.03, fx + lg, hem - s * 0.02);
      // PASS 3 — tertiary: two claw scratches on the trunk, pale wood
      // showing under the bark.
      ctx.fillStyle = SCRATCH;
      ctx.fillRect(tx0 - s * 0.03, baseY - s * 0.36, s * 0.03, s * 0.08);
      ctx.fillRect(tx0 + s * 0.005, baseY - s * 0.3, s * 0.03, s * 0.07);
      // PASS 4 — re-read: dead wood (4 values) + bone (3) + sinew +
      // pelt (2) + scratch; one lit facet per shaft; every hanging is
      // tied to a limb (THE ONE RING); breeze ≤0.04s.
    },
  };
}

// ---------------------------------------------- 530 TallyStone
/**
 * The count the tally stone carries: full rows of five-groups over
 * an unfinished last row. Pure in the hash so the test can walk
 * every deal: the count is SMALL (11..44) and is never 214 or 215 —
 * the kobolds count what they took, not the year.
 */
export function tallyRows(h: number): { groups: number[]; rem: number } {
  const rows = 3 + Math.min(2, (h >>> 5) & 3);
  const groups: number[] = [];
  for (let r = 0; r < rows - 1; r++) groups.push(1 + ((h >>> (8 + r)) & 1));
  const rem = 1 + ((h >>> 14) & 3);
  return { groups, rem };
}

export function tallyCount(h: number): number {
  const { groups, rem } = tallyRows(h);
  let n = rem;
  for (const g of groups) n += g * 5;
  return n;
}

/**
 * The kobolds' mark: a slab of worked stone leaning on two footing
 * stones, its face cut with tally rows — three to five, the last
 * unfinished — and a chalk smear where a hand rubbed the last count
 * out. RIG: the slab tops at 0.58s (the rig's hip). Solid r.3;
 * stone ×3. Static.
 */
function paintTallyStone(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const ys = rend.camera.yScale;
  const syT = s * ys;
  const baseY = p.y + syT * 0.18;
  const m = ((h >>> 2) & 1) === 0 ? 1 : -1;
  const lean = m * s * 0.1;
  // Half-width 0.22s: two five-groups (0.34s) and a 0.05s margin each
  // side fit the face — the tally never runs off the stone.
  const hw = s * 0.22;
  const H = s * 0.58;
  const topY = baseY - H;
  const topD = syT * 0.08;
  const { groups, rem } = tallyRows(h);
  const rows = groups.length + 1;
  const chalkSide = ((h >>> 17) & 1) === 0 ? -1 : 1;
  return {
    sortY: ty + 0.62,
    // Painted extent: footings to ±0.34s, slab top plane 0.64s over baseY.
    body: stationBody(0.42, 0.75, 0.35),
    drawShadow: () => rend.castEdgeQuad(p.x - hw, baseY, p.x + hw, baseY, 0.58),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // PASS 1 — primary mass: the seat, the two footing stones (they
      // touch the slab's foot — one silhouette), the leaning slab as
      // three parallelograms and a lit top plane.
      contact(ctx, p.x, baseY + s * 0.01, s * 0.34, syT * 0.1);
      for (const [ox, w, hh] of [[-0.27, 0.16, 0.1], [0.23, 0.14, 0.09]] as const) {
        const fx = p.x + s * ox - s * w * 0.5;
        ctx.fillStyle = TWN_STONE_DARK;
        ctx.fillRect(fx, baseY - s * hh, s * w, s * hh);
        ctx.fillStyle = TWN_STONE;
        ctx.fillRect(fx, baseY - s * hh, s * 0.03, s * hh);
        ctx.fillStyle = TWN_STONE_LIT;
        ctx.fillRect(fx, baseY - s * hh - s * 0.03, s * w, s * 0.03);
      }
      shaft(ctx, p.x, baseY, p.x + lean, topY, hw * 2, TWN_STONE, TWN_STONE_LIT, SLAB_EAST, s * 0.04, s * 0.03);
      ctx.fillStyle = TWN_STONE_LIT;
      quad(ctx, p.x + lean - hw, topY - topD, p.x + lean + hw, topY - topD, p.x + lean + hw, topY, p.x + lean - hw, topY);
      // A chipped shoulder on the leaning side: the top plane loses a
      // corner (a dark step where the stone broke).
      ctx.fillStyle = SLAB_EAST;
      ctx.fillRect(p.x + lean + m * hw - (m > 0 ? s * 0.05 : 0), topY - topD, s * 0.05, topD + s * 0.03);
      // PASS 2 — secondary: the tally. Each row rides the lean; a
      // full row is one or two five-groups (four uprights and a bar);
      // the last row is one to four uprights and no bar.
      const tick = s * 0.03;
      const tickH = s * 0.065;
      const pitch = s * 0.04;
      const rowPitch = s * 0.085;
      const groupW = pitch * 3 + tick; // 0.15s: four uprights
      const groupGap = s * 0.04;
      const rowAt = (r: number): number => topY + s * 0.1 + r * rowPitch;
      const leanAt = (yy: number): number => lean * ((baseY - yy) / H);
      ctx.fillStyle = TALLY_INK;
      for (let r = 0; r < rows; r++) {
        const yy = rowAt(r);
        const gx = p.x + leanAt(yy) - hw + s * 0.05;
        const full = r < rows - 1;
        const count = full ? groups[r]! : 1;
        for (let g = 0; g < count; g++) {
          const x0 = gx + g * (groupW + groupGap);
          const ticks = full ? 4 : rem;
          for (let k = 0; k < ticks; k++) ctx.fillRect(x0 + k * pitch, yy, tick, tickH);
          if (full) ctx.fillRect(x0 - s * 0.01, yy + tickH * 0.5 - s * 0.015, groupW + s * 0.02, s * 0.03);
        }
      }
      // PASS 3 — tertiary: the chalk smear, a pale blob at one lower
      // corner of the face where a palm wiped the count.
      ctx.fillStyle = CHALK;
      ctx.beginPath();
      facetBlob(ctx, p.x + chalkSide * s * 0.1 + leanAt(baseY - s * 0.12), baseY - s * 0.12, s * 0.06, h ^ 0x5b, 6, 0.7);
      ctx.fill();
      // PASS 4 — re-read: stone (4 values), soot ticks ≥0.03s, chalk;
      // one lit facet, one lit top plane, no clock, count never
      // 214/215 (tallyCount is pinned).
    },
  };
}

// ---------------------------------------------- 531 WardThread
/**
 * The evencourt's mark: two peeled willow wands at the tile's east
 * and west edges, one moonpale thread strung between them sagging
 * to a knot, a chip of moonglass tint knotted on. RIG: the wands
 * stand 0.36s (the rig's shin); the thread sags to 0.2s. Walkable
 * (stepping over is free; cutting it is the deed). ZERO light
 * entries — a mark that draws nothing at night is the point. The
 * thread samples the one breeze, clamped to 0.03s.
 */
function paintWardThread(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, t, tx, ty, stationBody } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  const wx = [p.x - s * 0.46, p.x + s * 0.46] as const;
  const wandH = [s * (0.34 + ((h >>> 3) & 1) * 0.04), s * (0.34 + ((h >>> 4) & 1) * 0.04)] as const;
  const wandW = s * 0.06;
  const sagY = baseY - s * 0.2;
  const ph = breezePhase(h, 6);
  return {
    sortY: ty + 0.5,
    // Painted extent: wands to ±0.49s, tips 0.38s over baseY.
    body: stationBody(0.56, 0.5, 0.3),
    drawShadow: () => {
      rend.castEdgeQuad(wx[0] - wandW * 0.5, baseY, wx[0] + wandW * 0.5, baseY, 0.35);
      rend.castEdgeQuad(wx[1] - wandW * 0.5, baseY, wx[1] + wandW * 0.5, baseY, 0.35);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // ONE BREEZE, held to the thread's law (0.03s).
      const { sw, lg } = breeze(rend, tx, ty, t, ph, s, 0.03);
      // PASS 1 — primary mass: the two wands, each a squared shaft
      // with a lit west strip and a dark east strip, a pale cut at
      // the tip (the wand was cut, not broken).
      for (let i = 0; i < 2; i++) {
        const x = wx[i]!;
        const hh = wandH[i]!;
        contact(ctx, x, baseY + s * 0.01, s * 0.07, syT * 0.04);
        shaft(ctx, x, baseY, x, baseY - hh, wandW, WAND, WAND_WEST, WAND_EAST, s * 0.03, s * 0.03);
        ctx.fillStyle = WAND_CUT;
        ctx.fillRect(x - wandW * 0.5, baseY - hh - s * 0.03, wandW, s * 0.03);
      }
      // PASS 2 — secondary: the thread, two thin quads from tip to
      // knot to tip, the knot carried by the breeze; the chip hangs
      // under the knot on a short drop.
      const kx = p.x + sw;
      const ky = sagY + lg;
      ctx.fillStyle = THREAD;
      cord(ctx, wx[0], baseY - wandH[0]! - s * 0.015, kx, ky, s * 0.03);
      cord(ctx, wx[1], baseY - wandH[1]! - s * 0.015, kx, ky, s * 0.03);
      ctx.fillStyle = KNOT;
      ctx.fillRect(kx - s * 0.02, ky - s * 0.02, s * 0.04, s * 0.04);
      ctx.fillStyle = THREAD;
      ctx.fillRect(kx - s * 0.015, ky + s * 0.02, s * 0.03, s * 0.035);
      const cy = ky + s * 0.055;
      ctx.fillStyle = MOONGLASS;
      ctx.beginPath();
      chamferRect(ctx, kx - s * 0.04, cy, s * 0.08, s * 0.08, s * 0.02);
      ctx.fill();
      ctx.fillStyle = MOONGLASS_LIT;
      ctx.fillRect(kx - s * 0.03, cy + s * 0.015, s * 0.03, s * 0.05);
      // PASS 3 — tertiary: a second knot on the west wand where the
      // thread was tied off (the court ties, it never nails).
      ctx.fillStyle = KNOT;
      ctx.fillRect(wx[0] - s * 0.02, baseY - wandH[0]! + s * 0.01, s * 0.04, s * 0.04);
      // PASS 4 — re-read: willow (4 values), thread, knot, glass (2);
      // no light, no glow, breeze ≤0.03s, every piece tied on.
    },
  };
}

// ---------------------------------------------- 532 RedRagStake
/**
 * The reavers' mark: a rough stake driven leaning (nobody surveyed
 * it), a rag of their red tied near the split top in two overlapping
 * folds with a torn hem, a chalk square on the stake with one tick
 * (what the road owes). RIG: the top at 0.95s (the rig's chest).
 * Solid r.15; stakes ×1. The rag samples the one breeze, clamped
 * to 0.04s.
 */
function paintRedRagStake(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, t, tx, ty, stationBody } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  const m = ((h >>> 2) & 1) === 0 ? 1 : -1;
  const lean = m * s * (0.06 + ((h >>> 4) & 1) * 0.03);
  const W = s * 0.09;
  const H = s * 0.95;
  const topX = p.x + lean;
  const topY = baseY - H;
  const knotY = topY + s * 0.16;
  const knotX = p.x + lean * ((H - s * 0.16) / H);
  const ragSide = -m; // the rag hangs off the low side of the lean
  const chalkY = topY + s * 0.42;
  const chalkX = p.x + lean * ((H - s * 0.42) / H);
  const ph = breezePhase(h, 8);
  return {
    sortY: ty + 0.64,
    // Painted extent: the rag reaches 0.36s off the stake, the split
    // top 1.0s over baseY.
    body: stationBody(0.48, 1.15, 0.35),
    drawShadow: () => rend.castEdgeQuad(p.x - W * 0.5, baseY, p.x + W * 0.5, baseY, 0.9),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // ONE BREEZE, held to the rag's law (0.04s).
      const { sw, lg } = breeze(rend, tx, ty, t, ph, s, 0.04);
      // PASS 1 — primary mass: the seat and the leaning stake, a
      // bark check low on the face, the split top (two prongs).
      contact(ctx, p.x, baseY + s * 0.01, s * 0.14, syT * 0.07);
      shaft(ctx, p.x, baseY, topX, topY + s * 0.08, W, STAKE, STAKE_WEST, STAKE_EAST, s * 0.03, s * 0.03);
      ctx.fillStyle = STAKE_CHECK;
      ctx.fillRect(p.x + lean * 0.3 - s * 0.005, baseY - s * 0.34, s * 0.03, s * 0.1);
      ctx.fillStyle = STAKE;
      ctx.fillRect(topX - W * 0.5, topY, s * 0.03, s * 0.08);
      ctx.fillRect(topX + W * 0.5 - s * 0.03, topY + s * 0.02, s * 0.03, s * 0.06);
      ctx.fillStyle = STAKE_WEST;
      ctx.fillRect(topX - W * 0.5, topY, s * 0.03, s * 0.03);
      // PASS 2 — secondary: the rag. The back fold hangs off the low
      // side, a value step darker; the front fold over it in the
      // rag's own red with the torn hem (a notch in the foot edge).
      // Both feet swing with the breeze; the knot holds the heads.
      const rx = knotX + ragSide * s * 0.03;
      const backW = ragSide * s * 0.2;
      const backH = s * 0.26;
      ctx.fillStyle = RAG_BACK;
      quad(ctx, rx, knotY, rx + backW, knotY + s * 0.03, rx + backW * 0.9 + sw, knotY + backH * 0.85 + lg, rx + sw * 0.6, knotY + backH + lg * 0.6);
      const frontW = ragSide * s * 0.3;
      const frontH = s * 0.32;
      ctx.fillStyle = SCAR_RAG_RED;
      ctx.beginPath();
      ctx.moveTo(rx, knotY);
      ctx.lineTo(rx + frontW * 0.4, knotY + s * 0.01);
      ctx.lineTo(rx + frontW + sw, knotY + frontH * 0.55 + lg);
      ctx.lineTo(rx + frontW * 0.62 + sw, knotY + frontH * 0.72 + lg);
      ctx.lineTo(rx + frontW * 0.5 + sw, knotY + frontH * 0.55 + lg);
      ctx.lineTo(rx + frontW * 0.2 + sw * 0.7, knotY + frontH + lg * 0.7);
      ctx.lineTo(rx + sw * 0.4, knotY + frontH * 0.8 + lg * 0.4);
      ctx.closePath();
      ctx.fill();
      // The knot around the stake: a darker red band with a tail.
      ctx.fillStyle = RAG_KNOT;
      ctx.fillRect(knotX - W * 0.5 - s * 0.015, knotY - s * 0.03, W + s * 0.03, s * 0.06);
      ctx.fillRect(knotX + ragSide * s * 0.03 - s * 0.015, knotY + s * 0.02, s * 0.03, s * 0.06);
      // PASS 3 — tertiary: the chalk square on the stake, one tick.
      ctx.fillStyle = CHALK;
      ctx.fillRect(chalkX - s * 0.035, chalkY, s * 0.07, s * 0.07);
      ctx.fillStyle = TALLY_INK;
      ctx.fillRect(chalkX - s * 0.015, chalkY + s * 0.015, s * 0.03, s * 0.04);
      // PASS 4 — re-read: bark (4 values), rag (3, its own ink, never
      // a dye), chalk; one lit facet; breeze ≤0.04s; every piece tied.
    },
  };
}

// ---------------------------------------------- 533/534 PitLamp
/**
 * The Returners' word against the LampPost: a driven pit timber at
 * TimberPost scale, an iron bracket arm with a rope loop, a small
 * iron lamp hung from the loop, its pane painted cold (the lights.ts
 * row is the flame). RIG: the timber tops at 1.6s (over the rig's
 * head), the lamp hangs at its shoulder. FADE_TALL (lit). Solid.
 * PitLampDark is the shame in a tile: the same fixture with a sooted
 * pane, one chip out of the horn, and the shard on the ground in the
 * foot's contact shade. No row, no clock, static.
 */
function paintPitLamp(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, tile, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  const dark = tile === Tile.PitLampDark;
  // TimberPost scale (0.17s × 1.68s hewn): a driven stake stands a
  // hair under the porch post it answers.
  const W = s * 0.16;
  const H = s * 1.6;
  const topY = baseY - H;
  const m = ((h >>> 2) & 1) === 0 ? -1 : 1; // which side the arm reaches
  const armY = topY + s * 0.2;
  const armLen = s * 0.24;
  const armEndX = p.x + m * (W * 0.5 + armLen);
  const loopTop = armY + s * 0.035;
  const loopH = s * 0.1;
  const lanW = s * 0.2;
  const lanH = s * 0.22;
  const capH = s * 0.09;
  const bailH = s * 0.05;
  const lanTop = loopTop + loopH + s * 0.04 + bailH + capH;
  const lx = armEndX - lanW * 0.5;
  const shardSide = ((h >>> 5) & 1) === 0 ? -1 : 1;
  return {
    sortY: ty + 0.66,
    // Painted extent: the arm reaches 0.45s off centre, the cap 1.65s
    // over baseY.
    body: stationBody(0.55, 1.6, 0.4),
    drawShadow: () => rend.castEdgeQuad(p.x - W * 0.5, baseY, p.x + W * 0.5, baseY, 1.6),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // PASS 1 — primary mass: the seat, the timber (one lit facet),
      // the battered head (a cap block, its top plane lit), a band
      // low on the shaft where the maul caught it going in.
      contact(ctx, p.x, baseY + s * 0.01, s * 0.2, syT * 0.09);
      if (dark) {
        // The one shard, inside the contact shade: a piece of the
        // horn on the ground, the shape of what is missing above.
        ctx.fillStyle = PANE_COLD;
        tri(ctx, p.x + shardSide * s * 0.13, baseY + s * 0.005, p.x + shardSide * s * 0.2, baseY - s * 0.02, p.x + shardSide * s * 0.17, baseY + s * 0.035);
      }
      shaft(ctx, p.x, baseY, p.x, topY + s * 0.05, W, PIT_TIMBER, PIT_TIMBER_WEST, PIT_TIMBER_EAST, s * 0.045, s * 0.03);
      ctx.fillStyle = PIT_TIMBER_CAP;
      ctx.fillRect(p.x - W * 0.5 - s * 0.02, topY, W + s * 0.04, s * 0.05);
      ctx.fillStyle = PIT_TIMBER_WEST;
      ctx.fillRect(p.x - W * 0.5 - s * 0.02, topY - syT * 0.07, W + s * 0.04, syT * 0.07);
      ctx.fillStyle = PIT_TIMBER_BAND;
      ctx.fillRect(p.x - W * 0.5, baseY - s * 0.3, W, s * 0.04);
      // PASS 2 — secondary: the bracket arm out of the timber, its
      // brace back to the shaft, the rope loop over the arm's end
      // (two strands and a bottom, the knot under), and the lamp.
      ctx.fillStyle = DGN_IRON;
      ctx.fillRect(Math.min(p.x, armEndX) - s * 0.02, armY, armLen + W * 0.5 + s * 0.04, s * 0.035);
      ctx.fillStyle = DGN_IRON_LIT;
      ctx.fillRect(Math.min(p.x, armEndX) - s * 0.02, armY, armLen + W * 0.5 + s * 0.04, s * 0.03);
      ctx.fillStyle = DGN_IRON;
      cord(ctx, p.x + m * W * 0.5, armY + s * 0.2, armEndX - m * s * 0.03, armY + s * 0.035, s * 0.03);
      ctx.fillStyle = ROPE;
      ctx.fillRect(armEndX - s * 0.045, loopTop, s * 0.03, loopH);
      ctx.fillRect(armEndX + s * 0.015, loopTop, s * 0.03, loopH);
      ctx.fillRect(armEndX - s * 0.045, loopTop + loopH - s * 0.03, s * 0.09, s * 0.03);
      ctx.fillStyle = ROPE_DARK;
      ctx.fillRect(armEndX - s * 0.02, loopTop + loopH, s * 0.04, s * 0.04);
      // The bail, the cap (one lit west facet), the box, the pane.
      ctx.fillStyle = DGN_IRON;
      ctx.fillRect(armEndX - s * 0.015, loopTop + loopH + s * 0.04, s * 0.03, bailH);
      const capBase = lanTop;
      ctx.fillStyle = DGN_IRON_LIT;
      tri(ctx, lx - s * 0.03, capBase, armEndX, capBase - capH, armEndX, capBase);
      ctx.fillStyle = DGN_IRON;
      tri(ctx, armEndX, capBase, armEndX, capBase - capH, lx + lanW + s * 0.03, capBase);
      ctx.fillRect(lx, lanTop, lanW, lanH);
      ctx.fillStyle = dark ? PANE_DARK : PANE_COLD;
      ctx.fillRect(lx + s * 0.03, lanTop + s * 0.03, lanW - s * 0.06, lanH - s * 0.06);
      if (dark) {
        // Soot climbs the pane from the burner; one corner of horn is
        // gone (the shard below), showing the frame's dark behind.
        ctx.fillStyle = PANE_SOOT;
        ctx.fillRect(lx + s * 0.03, lanTop + s * 0.03, lanW - s * 0.06, s * 0.05);
        ctx.fillStyle = DGN_IRON;
        ctx.fillRect(lx + lanW - s * 0.07, lanTop + lanH - s * 0.07, s * 0.04, s * 0.04);
      } else {
        ctx.fillStyle = PANE_COLD_LIT;
        ctx.fillRect(lx + s * 0.03, lanTop + s * 0.03, s * 0.03, lanH - s * 0.06);
      }
      ctx.fillStyle = DGN_IRON;
      ctx.fillRect(armEndX - s * 0.015, lanTop, s * 0.03, lanH);
      ctx.fillStyle = DGN_IRON_LIT;
      ctx.fillRect(lx, lanTop, s * 0.03, lanH);
      ctx.fillStyle = shade(DGN_IRON, -8);
      ctx.fillRect(lx + s * 0.03, lanTop + lanH, lanW - s * 0.06, s * 0.03);
      // PASS 3 — tertiary: the driven mark — a split running down
      // from the head on the east face where the grain gave.
      ctx.fillStyle = PIT_TIMBER_EAST;
      ctx.fillRect(p.x + W * 0.5 - s * 0.065, topY + s * 0.05, s * 0.03, s * (0.14 + ((h >>> 8) & 3) * 0.03));
      // PASS 4 — re-read: timber (5 values), iron (3), rope (2), horn
      // painted cold (or sooted); one lit facet per block; no clock;
      // the dark posture's only loose piece sits in the contact shade.
    },
  };
}

export const MARKS_PROPS: PropEntries = [
  [[Tile.CharterPost], paintCharterPost],
  [[Tile.LampCairn], paintLampCairn],
  [[Tile.LegionStandard], paintLegionStandard],
  [[Tile.BoneTree], paintBoneTree],
  [[Tile.TallyStone], paintTallyStone],
  [[Tile.WardThread], paintWardThread],
  [[Tile.RedRagStake], paintRedRagStake],
  [[Tile.PitLamp, Tile.PitLampDark], paintPitLamp],
];
