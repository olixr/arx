/**
 * THE SCARRED LAND — A. the cold hearth: what a burning leaves
 * standing. CharredBeam (507), CollapsedRoof (508), AshHeap (509),
 * ChimneyStack (511). The ember bed lives in emberBed.ts (it carries
 * the family's one light row); the two ruin walls in ruinWalls.ts.
 *
 * K1 THE COLD HEARTH. Every piece here is COLD: char is a violet-black
 * that drinks the light, ash the pale grey that sits on it, stone the
 * ruin's bruised grey. Warmth is EmberBed's light row, never paint —
 * the ember checks on the beam are painted a lifted cold grey, the
 * shape of a fire that has been, not one that is.
 *
 * The laws, in the order the brush meets them:
 *  - BODY-RULER: every extent is in `s` (the tile); the rig stands
 *    1.15s. Each painter's header states its height against the rig.
 *  - TOP-PLANE: every standing piece shows its lit top at ~syT·0.32.
 *  - FLAT FORGE / BLOCK LAW: squared filled quads, one lit facet toward
 *    the fixed west art sun, depth as value steps, min feature 0.03s.
 *    Diagonals are QUADS (moveTo/lineTo) — never ctx.rotate/translate,
 *    so the canvas oracle and the GL stage draw the same thing at q=0.
 *  - THE ONE RING: silhouette only. Nothing here strokes; the cached
 *    eight-tap ring (CACHED_RING_TILES) inks the painted silhouette and
 *    all four idle in STATIC_RING_TILES (nothing here moves — ONE
 *    BREEZE has no cloth to sample in this family).
 *  - Draw-time `const ctx = rend.ctx`; hash deals by `h >>> k`.
 *  - SHADOWS NEVER BAKE: castEdgeQuad / castBlob / castContact per frame.
 *  - No light rows, no queueGlow, no smoke: cold means cold.
 */
import { Tile } from '@arx/shared';
import { shade } from '../../tint.js';
import { facetBlob, facetCircle } from '../../shapes.js';
import { SCAR_ASH, SCAR_CHAR } from '../palette.js';
import type { DrawItem } from '../../renderer.js';
import type { PropEntries, PropFrame, PropHost } from '../types.js';

// The ruin's masonry: a half step colder and darker than the town's
// kept limestone — mortar gone, soot in the joints.
const RUIN_STONE = '#524c5c';
const RUIN_STONE_TOP = '#736d80';
// Char, stepped: the top plane of a burnt timber still catches the
// sun (it is a flat plane), the sun-facing side a step under, the end
// grain darkest. All cold — no orange anywhere in this file.
const CHAR_TOP = '#4c4746';
const CHAR_SIDE = shade(SCAR_CHAR, 7);
const CHAR_END = shade(SCAR_CHAR, -7);
const CHAR_CHECK = shade(SCAR_CHAR, 22);
const CHAR_CRACK = shade(SCAR_CHAR, -12);
// Unburnt heartwood where a beam split: cold bone-grey, never warm.
const SPLIT_WOOD = '#6e655e';
// Scorched thatch: the dome's body is straw burnt to a cold brown
// (the tile's own minimap ink), a value step above the char it sits
// on; the stubs that did not finish burning keep a paler tip.
const THATCH_SCORCH = '#4a3f35';
const THATCH_SHADE = '#3a322c';
const STRAW_SCORCH = '#6f624a';
const STRAW_LIT = '#948461';
const ASH_LIT = shade(SCAR_ASH, 16);
const ASH_DARK = shade(SCAR_ASH, -20);
const ASH_FEATHER = '#bcb9be';
const CONTACT = 'rgba(12, 8, 20, 0.24)';
/** The ash heap's six feather seats (x, y in tiles off the pan centre). */
const FEATHER_LIE: readonly number[] = [
  -0.3, -0.06,
  -0.19, -0.16,
  -0.06, -0.02,
  0.02, -0.14,
  0.16, 0.03,
  -0.14, 0.06,
];

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
 * a+n — a rafter, a plank end, a fallen beam's every face.
 */
function bar(
  ctx: CanvasRenderingContext2D,
  ax: number, ay: number, bx: number, by: number,
  nx: number, ny: number, lift: number,
): void {
  quad(ctx, ax - nx, ay - ny - lift, bx - nx, by - ny - lift, bx + nx, by + ny - lift, ax + nx, ay + ny - lift);
}

// ---------------------------------------------- 507 CharredBeam
/**
 * A fallen roof timber lying NW→SE across the tile, char-black,
 * its top facet lit. RIG: the beam is 0.15s thick — knee-high to
 * nobody, a bar across the shin of the 1.15s rig; it spans ~0.95s
 * corner to corner. Collider r.4; charbeam ×2.
 */
function paintCharredBeam(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const ys = rend.camera.yScale;
  const syT = s * ys;
  const baseY = p.y + syT * 0.18;
  // The axis: NW end a, SE end b, on the ground. Hash nudges the lie
  // (a tile's worth of beams never lands twice the same).
  const skew = (((h >>> 4) & 3) - 1.5) * s * 0.03;
  const ax = p.x - s * 0.44 + skew;
  const ay = baseY - syT * 0.30;
  const bx = p.x + s * 0.40 - skew;
  const by = baseY + syT * 0.14;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  // Half-width across the beam in the ground plane (foreshortened in
  // y): points SW — toward the camera and the west sun.
  const W = s * 0.085;
  const nx = -uy * W;
  const ny = ux * W * ys;
  // Thickness (screen up): 0.15s.
  const H = s * 0.15;
  // Chamfer cut along the axis at each corner.
  const C = s * 0.045;
  const cw = 1 - C / (W * 1.4);
  const checks = 4 + ((h >>> 5) & 3); // 4..7 ember checks
  return {
    sortY: ty + 0.62,
    // Painted extent: NW ash drift to the SE drift past the tongue
    // (±0.7s), top facet at −0.29s, SE drift foot at +0.42s.
    body: stationBody(0.72, 0.4, 0.46),
    // The sun transits, so the honest base edge is the beam's own
    // ground axis: extruded any way the light falls it stays a bar.
    drawShadow: () => rend.castEdgeQuad(ax, ay, bx, by, 0.15),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // PASS 1 — primary mass. Contact shade along the lie (a quad,
      // never a rotated ellipse).
      ctx.fillStyle = CONTACT;
      bar(ctx, ax - ux * s * 0.04, ay - uy * s * 0.04, bx + ux * s * 0.06, by + uy * s * 0.06, nx * 1.5, ny * 1.5 + s * 0.02, -s * 0.01);
      // The SE end grain (darkest: it faces east, away from the sun).
      ctx.fillStyle = CHAR_END;
      quad(ctx, bx - nx, by - ny - H, bx + nx, by + ny - H, bx + nx, by + ny, bx - nx, by - ny);
      // The sun-facing long side: one step under the top.
      ctx.fillStyle = CHAR_SIDE;
      quad(ctx, ax + nx, ay + ny - H, bx + nx, by + ny - H, bx + nx, by + ny, ax + nx, ay + ny);
      // The top facet, chamfered at every corner — the one lit plane.
      ctx.fillStyle = CHAR_TOP;
      ctx.beginPath();
      ctx.moveTo(ax - nx + ux * C, ay - ny + uy * C - H);
      ctx.lineTo(bx - nx - ux * C, by - ny - uy * C - H);
      ctx.lineTo(bx - nx * cw, by - ny * cw - H);
      ctx.lineTo(bx + nx * cw, by + ny * cw - H);
      ctx.lineTo(bx + nx - ux * C, by + ny - uy * C - H);
      ctx.lineTo(ax + nx + ux * C, ay + ny + uy * C - H);
      ctx.lineTo(ax + nx * cw, ay + ny * cw - H);
      ctx.lineTo(ax - nx * cw, ay - ny * cw - H);
      ctx.closePath();
      ctx.fill();
      // PASS 2 — secondary structure. THE ALLIGATOR CHAR: the side
      // face cracks into checks — lifted cold squares between crack
      // grooves (depth as a value step). Cold on purpose: the warmth
      // is EmberBed's light row, not this paint.
      const q = s * 0.048;
      for (let i = 0; i < checks; i++) {
        const t = 0.12 + (i * 0.78) / (checks - 1);
        const cx = ax + ux * len * t + nx;
        const cy = ay + uy * len * t + ny;
        const jit = (((h >>> (8 + i * 2)) & 3) - 1.5) * s * 0.012;
        ctx.fillStyle = CHAR_CHECK;
        ctx.fillRect(cx - q * 0.5, cy - H * 0.55 - q * 0.5 + jit, q, q);
        // The crack groove east of each check.
        ctx.fillStyle = CHAR_CRACK;
        ctx.fillRect(cx + q * 0.62, cy - H * 0.86, s * 0.03, H * 0.72);
      }
      // A second crack row on the top facet: two dark grooves across
      // the grain where the plane split as it cooled.
      ctx.fillStyle = CHAR_CRACK;
      for (let k = 0; k < 2; k++) {
        const t = 0.3 + k * 0.38 + (((h >>> (14 + k)) & 1) * 0.06);
        const gx = ax + ux * len * t;
        const gy = ay + uy * len * t;
        bar(ctx, gx - ux * s * 0.015, gy - uy * s * 0.015, gx + ux * s * 0.015, gy + uy * s * 0.015, nx * 0.7, ny * 0.7, H);
      }
      // THE SPLIT CAP: the SE end burst along the grain — a wedge of
      // cold heartwood shows, and a splinter tongue runs on past the
      // cap, its own top lit.
      ctx.fillStyle = SPLIT_WOOD;
      ctx.beginPath();
      ctx.moveTo(bx - nx * 0.45, by - ny * 0.45 - H);
      ctx.lineTo(bx + nx * 0.35, by + ny * 0.35 - H);
      ctx.lineTo(bx + nx * 0.05, by + ny * 0.05 - H * 0.3);
      ctx.closePath();
      ctx.fill();
      const tl = s * 0.12;
      ctx.fillStyle = CHAR_SIDE;
      bar(ctx, bx - nx * 0.2, by - ny * 0.2, bx - nx * 0.2 + ux * tl, by - ny * 0.2 + uy * tl, nx * 0.3, ny * 0.3, H * 0.28);
      ctx.fillStyle = CHAR_TOP;
      bar(ctx, bx - nx * 0.2, by - ny * 0.2 - H * 0.28, bx - nx * 0.2 + ux * tl, by - ny * 0.2 + uy * tl - H * 0.28, nx * 0.3, ny * 0.3, H * 0.28);
      // PASS 3 — tertiary life. Ash drifts at both ends where the
      // burning ran out along the timber; a lit crest on each.
      ctx.fillStyle = ASH_DARK;
      ctx.beginPath();
      facetBlob(ctx, ax + nx * 1.6 + s * 0.04, ay + ny * 1.6 + s * 0.03, s * 0.13, h ^ 0x2b, 6, 0.42);
      ctx.fill();
      ctx.beginPath();
      facetBlob(ctx, bx + nx * 0.2 + s * 0.1, by + ny * 0.2 + s * 0.05, s * 0.15, h ^ 0x5d, 6, 0.42);
      ctx.fill();
      ctx.fillStyle = SCAR_ASH;
      ctx.beginPath();
      facetBlob(ctx, ax + nx * 1.6 + s * 0.02, ay + ny * 1.6 + s * 0.01, s * 0.085, h ^ 0x71, 5, 0.42);
      ctx.fill();
      ctx.beginPath();
      facetBlob(ctx, bx + nx * 0.2 + s * 0.08, by + ny * 0.2 + s * 0.03, s * 0.1, h ^ 0x13, 5, 0.42);
      ctx.fill();
      // Char flakes: clinker IN the ash drift at the burnt-out end
      // (THE ONE RING — a flake shed on open ground earns its own
      // eight-tap ring and reads as a wheel; inside the drift's
      // alpha it is one silhouette with the beam). Three squares
      // dealt across the drift, always inside its 0.15s radius.
      ctx.fillStyle = SCAR_CHAR;
      for (let i = 0; i < 3; i++) {
        const fa = (i / 3) * Math.PI * 2 + (((h >>> (16 + i)) & 1) * 0.9);
        const fr = s * (0.03 + ((h >>> (19 + i)) & 1) * 0.03);
        ctx.fillRect(
          bx + nx * 0.2 + s * 0.1 + Math.cos(fa) * fr - s * 0.017,
          by + ny * 0.2 + s * 0.05 + Math.sin(fa) * fr * 0.42 - s * 0.015,
          s * 0.034,
          s * 0.03,
        );
      }
      // PASS 4 — re-read: three char values (top/side/end) + check +
      // crack = five cold steps, one lit facet (the top), every
      // feature ≥0.03s, nothing stroked, nothing rotated.
    },
  };
}

// ---------------------------------------------- 508 CollapsedRoof
/**
 * Rafters through a burnt thatch dome: the roof came down whole and
 * the fire ate it where it lay. RIG: the dome crests at 0.62s (a
 * little over the rig's waist), the one standing rafter tips at
 * ~0.84s (its shoulder). Solid; roofheap ×3 → CaveRubble.
 */
function paintCollapsedRoof(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.16;
  const R = s * 0.5;
  const SQ = 0.66;
  const cy = baseY - s * 0.29;
  const laths = Math.min(6, 4 + ((h >>> 7) & 3)); // 4..6 lit lath squares
  const rot = ((h >>> 2) & 7) * 0.09;
  return {
    sortY: ty + 0.7,
    // Painted extent: rim stubs to ±0.6s, the standing rafter's tip
    // at −0.9s, the contact shade's foot at +0.16s.
    body: stationBody(0.66, 1.0, 0.44),
    drawShadow: () => rend.castBlob(p.x, baseY, 0.62, s * 0.46, h ^ 0x3c),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // PASS 1 — primary mass. Contact shade, then the char dome:
      // the whole silhouette in the undershade.
      ctx.fillStyle = CONTACT;
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, R * 1.06, syT * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(SCAR_CHAR, -4);
      ctx.beginPath();
      facetCircle(ctx, p.x, cy, R, 9, rot, SQ);
      ctx.fill();
      // The burnt thatch body in two steps: the shaded straw over the
      // char, then the sun-side straw pulled west and up so the SE
      // lower rim keeps the undershade (depth as value, never a line).
      ctx.fillStyle = THATCH_SHADE;
      ctx.beginPath();
      facetCircle(ctx, p.x - s * 0.02, cy - s * 0.04, R * 0.9, 9, rot + 0.3, SQ);
      ctx.fill();
      ctx.fillStyle = THATCH_SCORCH;
      ctx.beginPath();
      facetCircle(ctx, p.x - s * 0.07, cy - s * 0.08, R * 0.76, 9, rot + 0.5, SQ);
      ctx.fill();
      // The ash crown — the lit top plane at ~syT·0.32 depth, sitting
      // west of centre where the sun reaches and clear of the rafters'
      // crossing (which lands east of it).
      ctx.fillStyle = ASH_DARK;
      ctx.beginPath();
      facetCircle(ctx, p.x - s * 0.1, cy - s * 0.13, R * 0.66, 8, rot + 0.6, 0.5);
      ctx.fill();
      ctx.fillStyle = SCAR_ASH;
      ctx.beginPath();
      facetCircle(ctx, p.x - s * 0.13, cy - s * 0.16, R * 0.5, 7, rot + 1.1, 0.5);
      ctx.fill();
      // PASS 2 — secondary structure. THE LATH GRID on the crown
      // (crate-lid treatment): a dark bed, then lit squares with the
      // dark showing in the gaps — the roof's own carpentry, seen from
      // above, 4..6 laths in two rows.
      const lq = s * 0.08;
      const lg = s * 0.03;
      const cols = Math.min(3, laths);
      const rows = laths > 3 ? 2 : 1;
      const gx0 = p.x - s * 0.3;
      const gy0 = cy - s * 0.24;
      ctx.fillStyle = shade(SCAR_ASH, -30);
      ctx.fillRect(gx0 - lg, gy0 - lg, cols * (lq + lg) + lg, rows * (lq * 0.72 + lg) + lg);
      ctx.fillStyle = ASH_LIT;
      for (let i = 0; i < laths; i++) {
        const col = i % 3;
        const row = (i / 3) | 0;
        ctx.fillRect(gx0 + col * (lq + lg), gy0 + row * (lq * 0.72 + lg), lq, lq * 0.72);
      }
      // THREE CROSSED RAFTERS breaking the dome: charred squared
      // timbers as quads, each with its lit upper facet. One rises
      // past the crest; one crosses it; one lies along the west flank.
      const rafter = (x0: number, y0: number, x1: number, y1: number, w: number) => {
        const ddx = x1 - x0;
        const ddy = y1 - y0;
        const l = Math.hypot(ddx, ddy);
        const nx = (-ddy / l) * w;
        const ny = (ddx / l) * w;
        // Char body (the underside faces east: a step darker).
        ctx.fillStyle = CHAR_END;
        bar(ctx, x0, y0, x1, y1, nx, ny, 0);
        ctx.fillStyle = CHAR_SIDE;
        bar(ctx, x0, y0, x1, y1, nx * 0.7, ny * 0.7, w * 0.3);
        // The lit upper facet: the west/upper long edge.
        ctx.fillStyle = CHAR_TOP;
        bar(ctx, x0, y0, x1, y1, nx * 0.34, ny * 0.34, w * 0.62);
        // Char checks along the lit facet — the same alligator skin
        // the beam wears, three cold squares.
        ctx.fillStyle = CHAR_CHECK;
        for (let k = 0; k < 3; k++) {
          const t = 0.2 + k * 0.28;
          ctx.fillRect(x0 + ddx * t - s * 0.017, y0 + ddy * t - w * 0.62 - s * 0.017, s * 0.034, s * 0.034);
        }
      };
      // The lying one first (it is furthest into the heap), along the
      // west flank under the crown's edge.
      rafter(p.x - s * 0.46, baseY - s * 0.14, p.x - s * 0.1, baseY - s * 0.46, s * 0.065);
      // The crossing one, SE foot to the crest.
      rafter(p.x + s * 0.42, baseY - s * 0.04, p.x - s * 0.02, baseY - s * 0.6, s * 0.07);
      // The standing one, S foot up past the crest to the NE.
      rafter(p.x - s * 0.22, baseY - s * 0.04, p.x + s * 0.26, baseY - s * 0.84, s * 0.075);
      // Ash buries each rafter's foot where it enters the heap.
      ctx.fillStyle = ASH_DARK;
      ctx.beginPath();
      facetBlob(ctx, p.x - s * 0.2, baseY - s * 0.03, s * 0.09, h ^ 0x44, 5, 0.5);
      ctx.fill();
      ctx.beginPath();
      facetBlob(ctx, p.x + s * 0.4, baseY - s * 0.03, s * 0.08, h ^ 0x27, 5, 0.5);
      ctx.fill();
      // PASS 3 — tertiary life. Scorched straw stubs bristle at the
      // lit rim: thatch that did not finish burning, grey-brown with
      // pale tips, standing out from the dome's west and north
      // shoulder (the sun side), 0.05s wide so they read at scale.
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * (1.02 + i * 0.12) + (((h >>> (10 + i)) & 1) * 0.05);
        const rx = p.x + Math.cos(a) * R * 0.92;
        const ry = cy + Math.sin(a) * R * SQ * 0.92;
        const ln = s * (0.1 + ((h >>> (16 + i)) & 1) * 0.03);
        const ox = Math.cos(a) * ln;
        const oy = Math.sin(a) * ln * SQ;
        const nx = -Math.sin(a) * s * 0.025;
        const ny = Math.cos(a) * s * 0.025;
        ctx.fillStyle = STRAW_SCORCH;
        quad(ctx, rx - nx, ry - ny, rx + ox - nx, ry + oy - ny, rx + ox + nx, ry + oy + ny, rx + nx, ry + ny);
        ctx.fillStyle = STRAW_LIT;
        ctx.fillRect(rx + ox * 0.82 - s * 0.02, ry + oy * 0.82 - s * 0.02, s * 0.04, s * 0.04);
      }
      // A pale ash feather or two blown onto the crown.
      ctx.fillStyle = ASH_FEATHER;
      ctx.fillRect(p.x - s * 0.02 + (((h >>> 18) & 3) * s * 0.03), cy - s * 0.06, s * 0.03, s * 0.03);
      ctx.fillRect(p.x - s * 0.34, cy - s * 0.1 - (((h >>> 20) & 1) * s * 0.03), s * 0.03, s * 0.03);
      // PASS 4 — re-read: dome = char → shaded straw → sun straw →
      // ash → lit ash (five steps, sun west), rafters carry the beam's
      // own three char values, laths 0.08s on 0.03s gaps, stubs
      // ≥0.04s, no strokes, no rotates.
    },
  };
}

// ---------------------------------------------- 509 AshHeap
/**
 * Cold ash, walkable: a pale pan spread on the ground where a fire
 * was raked out or a wall's thatch fell and burnt to nothing. RIG:
 * crests 0.13s — ankle-high; the rig walks through it. STATIC ring;
 * contact shade only (SHADOWS NEVER BAKE and a pan casts no edge).
 */
function paintAshHeap(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  const rot = ((h >>> 3) & 7) * 0.11;
  return {
    sortY: ty + 0.4,
    // Painted extent: the pan's rim ±0.46s, the plank's lit end at
    // −0.3s, the SE rim at +0.36s.
    body: stationBody(0.52, 0.36, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY + s * 0.02, s * 0.4, syT * 0.17),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // PASS 1 — primary mass. The pan's dark rim (the SE shade side
      // of a low mound), then the ash body pulled toward the sun.
      ctx.fillStyle = ASH_DARK;
      ctx.beginPath();
      facetBlob(ctx, p.x + s * 0.02, baseY - s * 0.02, s * 0.42, h ^ 0x39, 9, 0.5, rot);
      ctx.fill();
      ctx.fillStyle = SCAR_ASH;
      ctx.beginPath();
      facetBlob(ctx, p.x - s * 0.02, baseY - s * 0.05, s * 0.37, h ^ 0x39, 9, 0.5, rot);
      ctx.fill();
      // The lighter CRESCENT toward the west sun: the lit flank is a
      // disc one step up, and the pan's own ash laid back over its
      // east side leaves a crescent on the sun side (two fills, no
      // arc, no stroke).
      ctx.fillStyle = shade(SCAR_ASH, 12);
      ctx.beginPath();
      facetCircle(ctx, p.x - s * 0.09, baseY - s * 0.08, s * 0.28, 9, rot + 0.4, 0.5);
      ctx.fill();
      ctx.fillStyle = SCAR_ASH;
      ctx.beginPath();
      facetCircle(ctx, p.x + s * 0.01, baseY - s * 0.06, s * 0.25, 9, rot + 0.4, 0.5);
      ctx.fill();
      // The crest — the lit top plane of a pile that is barely a pile.
      ctx.fillStyle = ASH_LIT;
      ctx.beginPath();
      facetCircle(ctx, p.x - s * 0.1, baseY - s * 0.11, s * 0.1, 6, rot + 0.9, 0.5);
      ctx.fill();
      // PASS 2 — secondary structure. One plank end that did not
      // burn through, lying flat and shouldering out of the NE of the
      // heap: BLOCK LAW's lying board — a wide lit top plane over a
      // thin sun-side face, the end grain darkest.
      const px0 = p.x + s * 0.06;
      const py0 = baseY - s * 0.1;
      const px1 = p.x + s * 0.36;
      const py1 = baseY - s * 0.22;
      const pl = Math.hypot(px1 - px0, py1 - py0);
      const pnx = (-(py1 - py0) / pl) * s * 0.05;
      const pny = ((px1 - px0) / pl) * s * 0.05;
      const pt = s * 0.035;
      ctx.fillStyle = CHAR_SIDE;
      quad(ctx, px0 + pnx, py0 + pny - pt, px1 + pnx, py1 + pny - pt, px1 + pnx, py1 + pny, px0 + pnx, py0 + pny);
      ctx.fillStyle = CHAR_END;
      quad(ctx, px1 - pnx, py1 - pny - pt, px1 + pnx, py1 + pny - pt, px1 + pnx, py1 + pny, px1 - pnx, py1 - pny);
      ctx.fillStyle = CHAR_TOP;
      bar(ctx, px0, py0, px1, py1, pnx, pny, pt);
      // Two cold checks on the plank's top where the char split.
      ctx.fillStyle = CHAR_CRACK;
      for (const u of [0.35, 0.7]) {
        const kx = px0 + (px1 - px0) * u;
        const ky = py0 + (py1 - py0) * u;
        bar(ctx, kx - s * 0.015, ky, kx + s * 0.015, ky, pnx * 0.8, pny * 0.8, pt);
      }
      // Two clinker chips: fused black lumps that will not blow away.
      ctx.fillStyle = SCAR_CHAR;
      ctx.beginPath();
      facetCircle(ctx, p.x - s * 0.24 + (((h >>> 9) & 3) * s * 0.02), baseY - s * 0.01, s * 0.042, 5, rot, 0.7);
      ctx.fill();
      ctx.beginPath();
      facetCircle(ctx, p.x + s * 0.14, baseY + s * 0.04 - (((h >>> 11) & 1) * s * 0.03), s * 0.038, 5, rot + 1.3, 0.7);
      ctx.fill();
      ctx.fillStyle = CHAR_CHECK;
      ctx.fillRect(p.x - s * 0.255 + (((h >>> 9) & 3) * s * 0.02), baseY - s * 0.03, s * 0.03, s * 0.03);
      // PASS 3 — tertiary life. Pale feather squares: the flakes on
      // top that lift at a breath. A fixed scatter across the lit half
      // (so no seed can bead them into a row) with a hash nudge each.
      ctx.fillStyle = ASH_FEATHER;
      for (let i = 0; i < 6; i++) {
        const fx = p.x + FEATHER_LIE[i * 2]! * s + (((h >>> (12 + i * 3)) & 3) - 1.5) * s * 0.02;
        const fy = baseY + FEATHER_LIE[i * 2 + 1]! * s + (((h >>> (14 + i * 3)) & 3) - 1.5) * s * 0.014;
        ctx.fillRect(fx, fy, s * 0.03, s * 0.03);
      }
      // PASS 4 — re-read: five ash values sun-west (rim / pan /
      // crescent / crest / feather), char at three values on the
      // plank + a crack step, every mark ≥0.03s, no strokes, walkable
      // (sortY low so the rig draws over it).
    },
  };
}

// ---------------------------------------------- 511 ChimneyStack
/**
 * The chimney the fire could not take: a hearth block and a coursed
 * shaft standing alone where the house was. RIG: 2.4 bodies —
 * 2.76s from the foot to the broken cap's high face, its lit top
 * past that (the 1.15s rig's crown comes to the shaft's first course
 * above the hearth block; WALL_H 2.05 sits at the fourth course), the
 * kit's tallest discrete piece: FADE_TALL_PROPS and the family's one
 * light blocker. Solid, never smashable (the load-bearing law). Goes
 * NORTH of a shell (WALL-SHADOW LAW).
 */
function paintChimneyStack(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  const HT = s * 2.76; // 2.4 × 1.15s
  const HEARTH_HW = s * 0.32;
  const HEARTH_H = s * 0.62;
  const top = syT * 0.32;
  // The shaft stands on the BACK half of the hearth's top plane, so
  // a tread of lit top shows in front of its foot (the plinth-and-
  // shaft grammar of the tall gravestone).
  const footLift = top * 0.5;
  const courses = 5 + ((h >>> 3) & 1); // 5..6
  const shaftH = HT - HEARTH_H - footLift;
  const courseH = shaftH / courses;
  const hwBot = s * 0.23;
  const hwTop = s * 0.17;
  const hwAt = (i: number) => hwBot - ((hwBot - hwTop) * i) / (courses - 1);
  // The shaft's five values sit a full step apart so the courses read
  // at a tile's distance (the first cut's ±3 alternation and -20 joint
  // washed to one flat column in the museum walk).
  const STONE_LIT = shade(RUIN_STONE, 24);
  const STONE_DARK = shade(RUIN_STONE, -16);
  const JOINT = shade(RUIN_STONE, -32);
  // The course missing a stone: 1..3, never the broken cap course
  // (a bite in a half-gone course would float in the sky).
  const bite = 1 + ((h >>> 6) & 1) + ((h >>> 7) & 1);
  const biteWest = ((h >>> 9) & 1) === 0;
  // Which half of the cap still stands (the lit facet stays west
  // either way — TWO SUNS; only the break mirrors).
  const standWest = ((h >>> 11) & 1) === 0;
  const looseSeat = ((h >>> 13) & 3) * s * 0.02;
  const fallenEast = ((h >>> 15) & 1) === 0;
  return {
    sortY: ty + 0.72,
    // Painted extent: hearth ±0.32s plus the fallen cap stone at a
    // foot (±0.5s); the cap's lit top at −(2.76s + 0.32syT) over the
    // foot; the raked ash at +0.3s.
    body: stationBody(0.54, 3.15, 0.44),
    // Two prisms, two casts: the hearth block at its height, the
    // shaft at the full 2.4 bodies from its own narrower foot.
    drawShadow: () => {
      rend.castEdgeQuad(p.x - HEARTH_HW * 0.9, baseY, p.x + HEARTH_HW * 0.9, baseY, 0.62);
      rend.castEdgeQuad(p.x - hwBot * 0.9, baseY, p.x + hwBot * 0.9, baseY, 2.76);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // PASS 1 — primary mass. Contact shade; the hearth block with
      // its lit top plane (the full TOP-PLANE depth — the shaft rises
      // off its back half); the coursed shaft climbing off it.
      ctx.fillStyle = CONTACT;
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, HEARTH_HW * 1.1, syT * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      const hearthFace = baseY - HEARTH_H;
      const hearthTop = hearthFace - footLift;
      ctx.fillStyle = RUIN_STONE_TOP;
      ctx.fillRect(p.x - HEARTH_HW, hearthFace - top, HEARTH_HW * 2, top);
      ctx.fillStyle = RUIN_STONE;
      ctx.fillRect(p.x - HEARTH_HW, hearthFace, HEARTH_HW * 2, HEARTH_H);
      ctx.fillStyle = STONE_LIT;
      ctx.fillRect(p.x - HEARTH_HW, hearthFace, s * 0.06, HEARTH_H);
      ctx.fillStyle = STONE_DARK;
      ctx.fillRect(p.x + HEARTH_HW - s * 0.05, hearthFace, s * 0.05, HEARTH_H);
      // The hearth's own courses: a joint row (a value step).
      ctx.fillStyle = JOINT;
      ctx.fillRect(p.x - HEARTH_HW + s * 0.06, hearthFace + HEARTH_H * 0.36, HEARTH_HW * 2 - s * 0.11, s * 0.03);
      // The shaft, course by course from the hearth up. The cap course
      // is broken: one half stands, the other is down by half.
      for (let i = 0; i < courses; i++) {
        const hw = hwAt(i);
        const y1 = hearthTop - i * courseH;
        const y0 = y1 - courseH;
        const last = i === courses - 1;
        const tone = (i & 1) === 0 ? 7 : -7;
        const brk = p.x + (standWest ? s * 0.03 : -s * 0.03);
        const lowTop = last ? y1 - courseH * 0.5 : y0;
        // The standing half's span and the low half's span.
        const stX0 = standWest ? p.x - hw : brk;
        const stX1 = standWest ? brk : p.x + hw;
        const loX0 = standWest ? brk : p.x - hw;
        const loX1 = standWest ? p.x + hw : brk;
        const westTop = last && !standWest ? lowTop : y0;
        const eastTop = last && standWest ? lowTop : y0;
        // Face: full course, or standing stub + lowered stub.
        ctx.fillStyle = shade(RUIN_STONE, tone);
        if (last) {
          ctx.fillRect(stX0, y0, stX1 - stX0, courseH);
          ctx.fillRect(loX0, lowTop, loX1 - loX0, y1 - lowTop);
        } else {
          ctx.fillRect(p.x - hw, y0, hw * 2, courseH);
        }
        // Bed joint under each course (the value step between stones).
        ctx.fillStyle = JOINT;
        ctx.fillRect(p.x - hw + s * 0.02, y1 - s * 0.03, hw * 2 - s * 0.04, s * 0.03);
        // Running bond: one perpend per course, alternating sides.
        const px = p.x + ((i & 1) === 0 ? -0.28 : 0.22) * hw;
        const pTop = last && px >= loX0 && px < loX1 ? lowTop : y0;
        ctx.fillRect(px, pTop + s * 0.03, s * 0.03, y1 - s * 0.03 - (pTop + s * 0.03));
        // The lit west facet and the dark east arris.
        ctx.fillStyle = STONE_LIT;
        ctx.fillRect(p.x - hw, westTop, s * 0.055, y1 - westTop);
        ctx.fillStyle = STONE_DARK;
        ctx.fillRect(p.x + hw - s * 0.045, eastTop, s * 0.045, y1 - eastTop);
        if (last) {
          // The break's face: east-facing it is a dark step, west-
          // facing it catches the sun. Then the lit tops — high on
          // the standing half, low on the other — the TOP-PLANE.
          if (standWest) {
            ctx.fillStyle = STONE_DARK;
            ctx.fillRect(brk - s * 0.04, y0, s * 0.04, lowTop - y0);
          } else {
            ctx.fillStyle = STONE_LIT;
            ctx.fillRect(brk, y0, s * 0.04, lowTop - y0);
          }
          ctx.fillStyle = RUIN_STONE_TOP;
          ctx.fillRect(stX0, y0 - top, stX1 - stX0, top);
          ctx.fillStyle = shade(RUIN_STONE_TOP, -8);
          ctx.fillRect(loX0, lowTop - top * 0.8, loX1 - loX0, top * 0.8);
          // The flue mouth on the high top: a char square, the dark
          // the smoke used to leave by.
          ctx.fillStyle = SCAR_CHAR;
          ctx.fillRect(stX0 + s * 0.05, y0 - top * 0.72, stX1 - stX0 - s * 0.09, top * 0.44);
          // PASS 2 — the loose block: one cap stone tipped on the low
          // step, hanging past its arris. Side, lit west sliver, lit
          // top.
          const bw = s * 0.15;
          const bh = s * 0.1;
          const bx = standWest ? loX1 - bw * 0.62 - looseSeat : loX0 - bw * 0.38 + looseSeat;
          const byy = lowTop - top * 0.8;
          ctx.fillStyle = shade(RUIN_STONE, -2);
          ctx.fillRect(bx, byy - bh, bw, bh);
          ctx.fillStyle = STONE_LIT;
          ctx.fillRect(bx, byy - bh, s * 0.035, bh);
          ctx.fillStyle = STONE_DARK;
          ctx.fillRect(bx + bw - s * 0.03, byy - bh, s * 0.03, bh);
          ctx.fillStyle = RUIN_STONE_TOP;
          ctx.fillRect(bx, byy - bh - top * 0.36, bw, top * 0.36);
        }
        // A stone gone from one course: a dark bite in the face.
        if (i === bite) {
          ctx.fillStyle = JOINT;
          const bxx = biteWest ? p.x - hw + s * 0.055 : p.x + hw - s * 0.045 - s * 0.12;
          ctx.fillRect(bxx, y0 + courseH * 0.12, s * 0.12, courseH * 0.4);
        }
      }
      // PASS 2 — the hearth mouth: ONE char quad on the south face,
      // a lintel slab over it, the sill under.
      const mouthHw = s * 0.19;
      const mouthTop = hearthFace + s * 0.14;
      ctx.fillStyle = shade(RUIN_STONE, 10);
      ctx.fillRect(p.x - mouthHw - s * 0.04, mouthTop - s * 0.06, mouthHw * 2 + s * 0.08, s * 0.06);
      ctx.fillStyle = SCAR_CHAR;
      ctx.fillRect(p.x - mouthHw, mouthTop, mouthHw * 2, baseY - s * 0.04 - mouthTop);
      // Inside the mouth the back wall catches a little of the day.
      ctx.fillStyle = CHAR_SIDE;
      ctx.fillRect(p.x - mouthHw + s * 0.05, mouthTop + s * 0.05, mouthHw * 2 - s * 0.1, s * 0.09);
      // THE SOOT FAN: the smoke's own stain climbing the lit face —
      // over the lintel to the hearth's top edge, then on up the
      // shaft's first course and a half, wider as it rises,
      // translucent so the stonework shows through it.
      ctx.fillStyle = 'rgba(30, 26, 30, 0.5)';
      quad(
        ctx,
        p.x - mouthHw * 0.75, mouthTop - s * 0.06,
        p.x + mouthHw * 0.75, mouthTop - s * 0.06,
        p.x + HEARTH_HW * 0.78, hearthFace,
        p.x - HEARTH_HW * 0.78, hearthFace,
      );
      ctx.fillStyle = 'rgba(30, 26, 30, 0.38)';
      quad(
        ctx,
        p.x - hwBot * 0.8, hearthTop,
        p.x + hwBot * 0.8, hearthTop,
        p.x + hwAt(1) * 0.55, hearthTop - courseH * 1.6,
        p.x - hwAt(1) * 0.55, hearthTop - courseH * 1.6,
      );
      // PASS 3 — tertiary life. Ash raked out of the mouth and SWEPT
      // EAST along the ground — two or three offset squared drifts
      // (BLOCK LAW, every one ≥0.03s), long axes running east, each
      // overlapping the last and the first overlapping the foot so the
      // skirt shares ONE silhouette with the hearth (THE ONE RING).
      // Never a symmetric tongue centred under the mouth: the first
      // cut's faceted lens there read as light spilling out of a dark
      // opening — a spotlight — and the only cast this piece throws
      // comes from drawShadow above (the two castEdgeQuads), never
      // from paint. Dark drift first, the pale sweep over it, a last
      // dark tail when the hash deals it.
      ctx.fillStyle = ASH_DARK;
      ctx.fillRect(p.x - s * 0.14, baseY - s * 0.015, s * 0.3, s * 0.05);
      ctx.fillStyle = SCAR_ASH;
      ctx.fillRect(p.x - s * 0.03, baseY + s * 0.01, s * 0.3, s * 0.04);
      if (((h >>> 17) & 1) === 0) {
        ctx.fillStyle = ASH_DARK;
        ctx.fillRect(p.x + s * 0.17, baseY + s * 0.035, s * 0.19, s * 0.035);
      }
      const fx = fallenEast ? p.x + HEARTH_HW + s * 0.02 : p.x - HEARTH_HW - s * 0.15;
      ctx.fillStyle = shade(RUIN_STONE, -4);
      ctx.fillRect(fx, baseY - s * 0.08, s * 0.13, s * 0.08);
      ctx.fillStyle = RUIN_STONE_TOP;
      ctx.fillRect(fx, baseY - s * 0.08 - top * 0.3, s * 0.13, top * 0.3);
      ctx.fillStyle = STONE_LIT;
      ctx.fillRect(fx, baseY - s * 0.08, s * 0.03, s * 0.08);
      // PASS 4 — re-read: stone at five values (top / lit west / face
      // / dark east / joint), one lit facet toward the west sun, the
      // hearth's tread and the cap's two lit tops at syT·0.32, every
      // joint ≥0.03s, nothing stroked, no transforms; no light row
      // and no smoke — the flue is a cold black square.
    },
  };
}

export const COLD_HEARTH_PROPS: PropEntries = [
  [[Tile.CharredBeam], paintCharredBeam],
  [[Tile.CollapsedRoof], paintCollapsedRoof],
  [[Tile.AshHeap], paintAshHeap],
  [[Tile.ChimneyStack], paintChimneyStack],
];
