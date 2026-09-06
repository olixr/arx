/**
 * THE SCARRED LAND — SmolderHeap (548, band 8 THE CLAMP): a charcoal
 * clamp. The north's charcoal is made here.
 *
 * What it is: cordwood stacked in a dome, the dome sodded over with
 * turf and daubed with earth so it cannot burn, only char; vent
 * holes cut in the skin at mid-height where the burner controls the
 * draw; a crown vent at the top where the fire was lit; a soot stain
 * running down from every vent; a raked ash apron round the foot;
 * two billet ends showing at the foot where the turf was pulled back.
 * By day it is a cold turf mound — the coals at the vents are
 * painted at a COLD value on purpose (chroma under 40 on every fill,
 * smolderHeap.test pins it). After dark the lights.ts row
 * (COALS-class, flame-gated, the bloom in the air at the flank vents)
 * lays its warmth over the vents, and the collectStaticLights scan
 * exhales the crown's plume on the K1 die (renderer.emberBedExhale
 * with the clamp's birth point). THE LIGHT IS CONTENT: this painter
 * never queueGlows and never paints smoke.
 *
 * The laws it obeys: BODY-RULER (waist-high beside the 1.15-tile
 * rig — the dome crests DOME_H 0.62s over a foot FOOT_DY 0.2 south
 * of the tile centre, rx 0.5s; the renderer's exhale and the lights
 * row both read these two numbers, so they are exported and pinned),
 * TOP-PLANE (the crown collar is the dome's lit top plane), BLOCK
 * LAW (squared sods and vents, one lit west flank, minimum feature
 * 0.03s, depth as value steps), THE ONE RING (the cached eight-tap
 * ring draws the silhouette; nothing here strokes), TWO SUNS (the
 * west flank and the west billet cap face the fixed art sun; the
 * east flank is the shade side), draw-time `const ctx = rend.ctx`,
 * hash deals by `h >>> k`, SHADOWS NEVER BAKE (castBlob per frame:
 * a dome throws a blob), canvas/GL parity (fills only — no
 * translate/rotate; every sod and stain is a quad), wear is
 * wobbling lines and never rectangles (the dome's rim is a jittered
 * polygon; the sods are parallelograms laid on the curve).
 *
 * THE APRON is the prop's OWN ground mark, painted first (the ember
 * bed's scorch is the precedent): an opaque faceted plane of raked
 * ash a foot past the dome, never a translucent wash. The terrain
 * underlay fronts the clamp with dirt (terrain.ts) and this apron
 * lies over it.
 */
import { Tile } from '@arx/shared';
import { shade } from '../../tint.js';
import { facetBlob, facetCircle } from '../../shapes.js';
import { SCAR_ASH, SCAR_CHAR } from '../palette.js';
import type { DrawItem } from '../../renderer.js';
import type { PropEntries, PropFrame, PropHost } from '../types.js';

// ---- the rig (the two numbers the renderer and the light row read)
/** The dome's crest over its foot, in tiles of screen height (s). */
export const DOME_H = 0.62;
/** The foot line's offset south of the tile centre, in world tiles. */
export const FOOT_DY = 0.2;
/** The dome's half-width at the foot, in tiles. */
const DOME_RX = 0.5;
/** The foot ellipse's front bulge under the foot line (× yScale). */
const FOOT_RY = 0.2;
/** The apron reaches a foot past the dome. */
const APRON_R = 0.62;
/** The flank vents sit at mid-height (the light row's air 0.35). */
const VENT_H = 0.33;

// ---- the inks (dealt once; every clamp shares them, the hash deals the deal)
/** The turf skin: an earth-brown sod, dried by the heat under it.
 *  Chroma 26 — a clamp's turf is never a lawn. */
const TURF = '#5c5840';
const TURF_LIT = shade(TURF, 16);
const TURF_SHADE = shade(TURF, -20);
const TURF_SOD = shade(TURF, -14);
const TURF_SOD_LIT = shade(TURF, 14);
/** The crown collar: browned turf where the heat comes through —
 *  the def's own topColor (tilesDefs), the dome's lit top plane. */
const CROWN = '#6c6250';
const CROWN_RIM = shade(CROWN, -14);
/** The daub: earth smeared over the sods at the foot to seal the draw. */
const DAUB = '#4a4236';
/** Soot: the stain that runs down from every vent. */
const SOOT = shade(SCAR_CHAR, -4);
const SOOT_EDGE = shade(SCAR_CHAR, 10);
/** The vent hole: the black of the charge behind the skin. */
const VENT = '#1b1719';
/** Four cold values for the coals at the vents — dealt from char
 *  toward a DRY umber, never toward the ember ink (the ember bed's
 *  law: a banked coal by day is a brown-black clinker). The
 *  lights.ts row is the warmth. */
const COAL_COLD: readonly string[] = ['#2f2426', '#3d2c28', '#4a352c', '#54392e'];
/** The apron: raked ash, two opaque value planes. */
const APRON_RIM = shade(SCAR_ASH, -30);
const APRON_FLOOR = shade(SCAR_ASH, -18);
const APRON_PALE = shade(SCAR_ASH, -6);
/** The billet ends at the foot: bark side, end grain, a lit west cap. */
const BILLET = '#4f4436';
const BILLET_END = shade(BILLET, 12);
const BILLET_CAP = shade(BILLET, 22);
const BILLET_DARK = shade(BILLET, -12);
/** Char chips on the apron. */
const CHIP = shade(SCAR_CHAR, 4);

/**
 * The dome's silhouette: a jittered polygon whose upper half is the
 * dome arc (rx × hgt) and whose lower half is the FRONT of the foot
 * ellipse (rx × footRy) — a mound seen from the south-east, its foot
 * bulging toward the viewer. `lean` slides the crest west so the
 * lit flank reads wider than the shade flank (TWO SUNS).
 */
function domePath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  footY: number,
  rx: number,
  hgt: number,
  footRy: number,
  seed: number,
  lean: number,
): void {
  const sides = 14;
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const j = 0.94 + (((seed >>> ((i * 2) & 31)) & 3) / 3) * 0.06;
    const up = Math.sin(a);
    const vx = cx + Math.cos(a) * rx * j + (up > 0 ? -lean * up : 0);
    const vy = up > 0 ? footY - up * hgt * j : footY - up * footRy * j;
    if (i === 0) ctx.moveTo(vx, vy);
    else ctx.lineTo(vx, vy);
  }
  ctx.closePath();
}

/** One filled quad — the parallelogram every sod and stain is. */
function quad(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  x2: number, y2: number, x3: number, y3: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
}

function paintSmolderHeap(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * FOOT_DY;
  const rx = DOME_RX * s;
  const hgt = DOME_H * s;
  const footRy = FOOT_RY * syT;
  const crownY = baseY - hgt;
  // The deal: three or four flank vents, the crown vent turned a
  // little, the billets on one side or the other, the sods' lie.
  const vents = 3 + ((h >>> 5) & 1);
  const turn = ((h >>> 8) & 7) * 0.09;
  const billetSide = ((h >>> 14) & 1) === 0 ? 1 : -1;
  const lean = s * (0.03 + ((h >>> 17) & 3) * 0.01);

  /** Where the dome's skin is at angle `a` round the foot (0 = east,
   *  π/2 = north = the far side): the vents ride this at VENT_H. */
  const flank = (a: number, hFrac: number): { x: number; y: number } => {
    // The dome narrows toward the crest: a circle's chord at hFrac.
    const w = Math.sqrt(Math.max(0, 1 - hFrac * hFrac));
    return {
      x: p.x + Math.cos(a) * rx * w * 0.96,
      y: baseY - hFrac * hgt - Math.sin(a) * footRy * w,
    };
  };

  // The painted extent (the ring-cache sprite is cut to this box):
  // apron ±0.62s wide, 0.5-squashed → ±0.31s tall about baseY; the
  // crest at baseY − 0.62s; baseY sits 0.2·yScale under p.
  const up = DOME_H - FOOT_DY * rend.camera.yScale + 0.06;
  const down = FOOT_DY * rend.camera.yScale + 0.34;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.66, up, down),
    // SHADOWS NEVER BAKE: a dome throws a blob, cast per frame; the
    // smear carries its foot's width.
    drawShadow: () => rend.castBlob(p.x, baseY, DOME_H, s * 0.46, h ^ 0x5a, s * 0.2),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // ---- pass 1: the ground remembers. The raked apron is the
      // prop's own mark — a rim of trodden ash a foot past the dome,
      // the floor where the burner rakes, a pale drift on the sun side.
      // Three opaque value planes, faceted; never a translucent pool.
      ctx.fillStyle = APRON_RIM;
      ctx.beginPath();
      facetCircle(ctx, p.x + s * 0.02, baseY - syT * 0.02, s * APRON_R, 10, 0.2 + turn, 0.5);
      ctx.fill();
      ctx.fillStyle = APRON_FLOOR;
      ctx.beginPath();
      facetBlob(ctx, p.x, baseY - syT * 0.03, s * 0.54, h ^ 0x2c, 9, 0.5, 0.7 + turn);
      ctx.fill();
      ctx.fillStyle = APRON_PALE;
      ctx.beginPath();
      facetBlob(ctx, p.x - s * 0.2, baseY + syT * 0.04, s * 0.16, h ^ 0x93, 6, 0.5);
      ctx.fill();
      // Char chips on the apron: what the rake missed, dealt by hash
      // to the shade side so no seed beads them into a row.
      ctx.fillStyle = CHIP;
      for (let i = 0; i < 3; i++) {
        const k = h >>> ((20 + i * 3) & 31);
        const cx = p.x + s * (0.18 + (k & 3) * 0.09) * (i === 1 ? -1 : 1);
        const cy = baseY + syT * (0.08 + ((k >>> 2) & 3) * 0.05);
        ctx.fillRect(cx, cy, s * 0.035, s * 0.03);
      }
      // ---- pass 2: the dome, primary mass. The shade body first
      // (the whole silhouette in the SE undershade), then the lit
      // west flank one step up laid on the curve, then the mid turf
      // between them: three values, sun-west.
      ctx.fillStyle = TURF_SHADE;
      ctx.beginPath();
      domePath(ctx, p.x, baseY, rx, hgt, footRy, h, lean);
      ctx.fill();
      ctx.fillStyle = TURF;
      ctx.beginPath();
      domePath(ctx, p.x - s * 0.05, baseY - syT * 0.02, rx * 0.86, hgt * 0.94, footRy * 0.8, h ^ 0x1f, lean);
      ctx.fill();
      ctx.fillStyle = TURF_LIT;
      ctx.beginPath();
      domePath(ctx, p.x - s * 0.15, baseY - syT * 0.04, rx * 0.56, hgt * 0.84, footRy * 0.6, h ^ 0x4e, lean * 0.5);
      ctx.fill();
      // ---- pass 3: the sods. The skin is laid in turves, each a
      // parallelogram following the dome's curve, dark on the shade
      // side and a step lit on the sun side; a daub band seals the
      // foot. Every sod ≥ 0.03s; none crosses the silhouette (they
      // sit inside 0.9 of the dome's width at their height).
      const sods = 6 + ((h >>> 10) & 3);
      for (let i = 0; i < sods; i++) {
        const k = h >>> ((i * 3 + 1) & 31);
        const hf = 0.12 + ((k & 3) / 3) * 0.6;
        const a = 0.15 + (i / sods) * (Math.PI - 0.3);
        const c = flank(a, hf);
        const w = s * (0.09 + ((k >>> 2) & 1) * 0.03);
        const d = s * 0.045;
        const west = Math.cos(a) < -0.2;
        ctx.fillStyle = west ? TURF_SOD_LIT : TURF_SOD;
        // The sod lies along the curve: its long edge slopes with the
        // flank (down toward the foot on the outside).
        const slope = Math.cos(a) * s * 0.02;
        quad(ctx, c.x - w * 0.5, c.y - slope, c.x + w * 0.5, c.y + slope, c.x + w * 0.5, c.y + slope + d, c.x - w * 0.5, c.y - slope + d);
      }
      // The daub band at the foot: earth smeared over the lowest
      // sods, a darker step, following the front arc.
      ctx.fillStyle = DAUB;
      {
        const y0 = baseY - hgt * 0.06;
        quad(ctx, p.x - rx * 0.86, y0 - s * 0.03, p.x + rx * 0.86, y0 - s * 0.03, p.x + rx * 0.8, y0 + footRy * 0.7, p.x - rx * 0.8, y0 + footRy * 0.7);
      }
      // ---- pass 4: the vents. Cut at mid-height round the front of
      // the flank (the burner reaches them from the ground); each a
      // black squared hole with a cold coal showing inside, a SHORT
      // soot stain under its sill (a vent stains what it breathes
      // over — a hand's length, never a bar to the foot: the museum
      // read the long stain as a slot), a lit lip on its west edge
      // where the sod was cut. Depth as value steps.
      for (let i = 0; i < vents; i++) {
        const k = h >>> ((i * 5 + 3) & 31);
        const a = 0.35 + turn + (i / vents) * (Math.PI - 0.7);
        const c = flank(a, VENT_H + ((k & 3) - 1.5) * 0.02);
        const vw = s * 0.085;
        const vh = s * 0.065;
        // The stain first: a tapering quad a hand's length under the
        // sill, pulled toward the shade side.
        ctx.fillStyle = SOOT;
        const sx = c.x + s * 0.015;
        const sy = c.y + vh * 0.5;
        const fy = sy + s * 0.13;
        quad(ctx, sx - vw * 0.5, sy, sx + vw * 0.5, sy, sx + s * 0.05, fy, sx + s * 0.005, fy);
        ctx.fillStyle = SOOT_EDGE;
        ctx.fillRect(sx - vw * 0.5, sy, s * 0.03, s * 0.035);
        // The hole.
        ctx.fillStyle = VENT;
        ctx.fillRect(c.x - vw * 0.5, c.y - vh * 0.5, vw, vh);
        // The cold coals showing through the hole — the light row's
        // seat after dark; two dry clinkers by day, the liveliest
        // phase on the one nearest the sun.
        ctx.fillStyle = COAL_COLD[(k >>> 2) & 3]!;
        ctx.fillRect(c.x - s * 0.032, c.y - s * 0.014, s * 0.03, s * 0.03);
        ctx.fillStyle = COAL_COLD[3]!;
        ctx.fillRect(c.x + s * 0.002, c.y - s * 0.018, s * 0.03, s * 0.03);
        // The cut lip toward the art sun.
        ctx.fillStyle = TURF_LIT;
        ctx.fillRect(c.x - vw * 0.5 - s * 0.03, c.y - vh * 0.5, s * 0.03, vh);
      }
      // ---- pass 5: the crown. TOP-PLANE: the dome's lit top is the
      // browned collar where the heat comes through — a flattened
      // facet at the crest, a darker rim, and the crown vent in it: a
      // black hole ringed with soot, one cold coal at its throat. The
      // renderer births the plume here (the K1 die).
      ctx.fillStyle = CROWN_RIM;
      ctx.beginPath();
      facetCircle(ctx, p.x - lean * 0.6, crownY + s * 0.075, s * 0.19, 8, 0.4 + turn, 0.42);
      ctx.fill();
      ctx.fillStyle = CROWN;
      ctx.beginPath();
      facetCircle(ctx, p.x - lean * 0.6 - s * 0.015, crownY + s * 0.06, s * 0.15, 8, 0.4 + turn, 0.42);
      ctx.fill();
      ctx.fillStyle = SOOT;
      ctx.beginPath();
      facetCircle(ctx, p.x - lean * 0.6, crownY + s * 0.065, s * 0.085, 7, 0.9 + turn, 0.5);
      ctx.fill();
      ctx.fillStyle = VENT;
      ctx.fillRect(p.x - lean * 0.6 - s * 0.03, crownY + s * 0.045, s * 0.06, s * 0.04);
      ctx.fillStyle = COAL_COLD[3]!;
      ctx.fillRect(p.x - lean * 0.6 - s * 0.015, crownY + s * 0.05, s * 0.03, s * 0.03);
      // ---- pass 6: tertiary life. Two billet ends at the foot on
      // the dealt side, where the turf was pulled back to add to the
      // charge: BLOCK LAW's lying log — a bark face, a lifted end
      // grain a step lighter, a lit cap toward the sun.
      {
        const bx = p.x + billetSide * rx * 0.62;
        const by = baseY + footRy * 0.35;
        const bl = s * 0.16;
        const bt = s * 0.06;
        for (let i = 0; i < 2; i++) {
          const ox = bx + i * s * 0.02 * billetSide;
          const oy = by - i * (bt + s * 0.01);
          ctx.fillStyle = BILLET_DARK;
          ctx.fillRect(ox - bl * 0.5, oy - bt, bl, bt);
          ctx.fillStyle = BILLET;
          ctx.fillRect(ox - bl * 0.5, oy - bt, bl - s * 0.03, bt - s * 0.012);
          // The end grain: the face toward the viewer, chamfered.
          ctx.fillStyle = BILLET_END;
          ctx.beginPath();
          facetCircle(ctx, ox + (billetSide > 0 ? bl * 0.5 - s * 0.03 : -bl * 0.5 + s * 0.03), oy - bt * 0.5, s * 0.032, 6, 0.3, 1);
          ctx.fill();
          // The lit cap: the west arris toward the art sun.
          ctx.fillStyle = BILLET_CAP;
          ctx.fillRect(ox - bl * 0.5, oy - bt, s * 0.03, bt);
        }
      }
      // ---- re-read: apron (three ash values) → dome (three turf
      // values sun-west) → sods (two steps) → daub → vents (hole,
      // cold coal, soot stain, lit lip) → crown (collar, rim, soot,
      // hole, coal) → billets. No stroke, no transform, every rect
      // ≥ 0.03s, no ink over chroma 40: by day it is a mound of turf.
    },
  };
}

export const SMOLDER_HEAP_PROPS: PropEntries = [[[Tile.SmolderHeap], paintSmolderHeap]];
