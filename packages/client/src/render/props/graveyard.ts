/**
 * THE IRON REST — gravestones, sarcophagi, gibbets: the graveyard and ruin set.
 * Extracted verbatim from renderer.ts's objectItem (THE PROP HALL,
 * foundations F1) — each painter is one former switch case; the frame
 * and host contracts live in ./types.ts.
 */
import { GY_MOSS, GY_STONE, GY_STONE_LIT, PALI_LOG } from '../paintVocab.js';
import { shade } from '../rig.js';
import { chamferRect, facetBlob, facetCircle } from '../shapes.js';
import { DGN_BONE, DGN_BONE_DIM, DGN_IRON, DGN_IRON_LIT, DGN_RUST_LIT } from './palette.js';
import { Tile } from '@arx/shared';
import type { DrawItem } from '../renderer.js';
import type { PropEntries, PropFrame, PropHost } from './types.js';

const DGN_STONE = '#5b5566';
const DGN_STONE_LIT = '#8c8798';
const DGN_STONE_DARK = '#453f52';


// ---------------------------------------------- THE IRON REST
// The graveyard's stones (docs pending; the kit ships with the
// iron-fence family). Every piece measures against the
// 1.15-tile body, leans as the ground let it, and wears the
// crypt kit's damp green — the yard and the dark beneath it
// are one place.
function paintGravestone(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // THREE CUTS OF ONE TRADE — round-top, shouldered, lancet —
  // dealt by hash so a row of graves reads as one mason's
  // yard's work across years, never a stamped multiple. Each
  // stone LEANS its own way (the ground settles; the stone
  // keeps whatever promise it can), shows an east-side sliver
  // so the slab has thickness, and carries carved lines worn
  // just past reading.
  const cut = h % 3;
  const gw = s * (0.4 + ((h >> 3) & 3) * 0.024);
  const gh = s * (0.66 + ((h >> 6) & 7) * 0.018);
  const lean = (((h >> 9) & 7) - 3.5) * s * 0.016;
  const sliver = s * 0.055;
  // The slab silhouette, hoisted so side and face share one
  // truth: trace from SW up over the head to SE.
  const trace = (dx: number, dy: number): void => {
    const ctx = rend.ctx;
    const xL = p.x - gw / 2 + dx;
    const xR = p.x + gw / 2 + dx;
    const topY = baseY - gh + dy;
    ctx.moveTo(xL, baseY + dy);
    if (cut === 0) {
      // The round-top: one full arch.
      ctx.lineTo(xL + lean, topY + gh * 0.22);
      ctx.quadraticCurveTo(p.x + lean + dx, topY - gh * 0.14, xR + lean, topY + gh * 0.22);
    } else if (cut === 1) {
      // The shouldered tablet: stepped shoulders, flat crown.
      ctx.lineTo(xL + lean, topY + gh * 0.2);
      ctx.lineTo(xL + lean + gw * 0.16, topY + gh * 0.2);
      ctx.lineTo(xL + lean + gw * 0.16, topY + gh * 0.06);
      ctx.lineTo(xR + lean - gw * 0.16, topY + gh * 0.06);
      ctx.lineTo(xR + lean - gw * 0.16, topY + gh * 0.2);
      ctx.lineTo(xR + lean, topY + gh * 0.2);
    } else {
      // The lancet: a pointed arch for the older rows.
      ctx.lineTo(xL + lean, topY + gh * 0.3);
      ctx.quadraticCurveTo(xL + lean + gw * 0.1, topY + gh * 0.02, p.x + lean + dx, topY - gh * 0.08);
      ctx.quadraticCurveTo(xR + lean - gw * 0.1, topY + gh * 0.02, xR + lean, topY + gh * 0.3);
    }
    ctx.lineTo(xR, baseY + dy);
  };
  return {
    sortY: ty + 0.7,
    body: stationBody(0.5, 0.95, 0.35),
    drawShadow: () => rend.castBlob(p.x, baseY, gh / s, gw * 0.42, h ^ 0x67),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // Contact shade seats the stone in its turf.
      ctx.fillStyle = 'rgba(12, 8, 20, 0.26)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, gw * 0.62, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // The east sliver first — the slab's thickness.
      ctx.fillStyle = shade(GY_STONE, -22);
      ctx.beginPath();
      trace(sliver, 0);
      ctx.closePath();
      ctx.fill();
      // The face, a full step brighter, west arris lit.
      ctx.fillStyle = shade(GY_STONE, 6);
      ctx.beginPath();
      trace(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(GY_STONE_LIT, 4);
      ctx.fillRect(p.x - gw / 2 + lean * 0.5, baseY - gh * 0.78, Math.max(1, s * 0.02), gh * 0.74);
      // THE CARVED LINES: a name, worn just past reading —
      // rows of broken dashes, longest at the head, the last
      // row half gone. The SHAPE of writing is the story.
      ctx.fillStyle = 'rgba(30, 24, 40, 0.5)';
      const rows = 3 + ((h >> 4) & 1);
      for (let i = 0; i < rows; i++) {
        const ry = baseY - gh * (0.62 - i * 0.14);
        const rw = gw * (0.56 - i * 0.09);
        const gap = ((h >> (6 + i * 2)) & 3) * 0.1 + 0.16;
        ctx.fillRect(p.x + lean * (0.6 - i * 0.14) - rw / 2, ry, rw * gap, Math.max(1, s * 0.022));
        ctx.fillRect(p.x + lean * (0.6 - i * 0.14) - rw / 2 + rw * (gap + 0.12), ry, rw * (1 - gap - 0.12), Math.max(1, s * 0.022));
      }
      // The chipped shoulder — one bite of paler, fresher stone.
      if (((h >> 11) & 3) === 1) {
        const mx = ((h >> 13) & 1) ? -1 : 1;
        ctx.fillStyle = shade(GY_STONE, 20);
        ctx.beginPath();
        ctx.moveTo(p.x + mx * gw * 0.5 + lean, baseY - gh * 0.68);
        ctx.lineTo(p.x + mx * gw * 0.34 + lean, baseY - gh * 0.74);
        ctx.lineTo(p.x + mx * gw * 0.5 + lean, baseY - gh * 0.82);
        ctx.closePath();
        ctx.fill();
      }
      // Moss takes the shaded foot; the turf takes the rest.
      ctx.fillStyle = GY_MOSS;
      ctx.beginPath();
      facetBlob(ctx, p.x + gw * (((h >> 8) & 1) ? 0.3 : -0.3), baseY - s * 0.06, s * 0.06, h ^ 0x71, 5, 0.7);
      ctx.fill();
      // NO struct stroke here: the cached ring pass already
      // dilates the painted silhouette — a manual ring on top
      // doubled the ink and read gross at play scale (the
      // museum audit's verdict; TimberPost had the same bug).
    },
  };
}

function paintGravestoneTall(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // THE MONUMENT — somebody paid for this one. A stepped
  // plinth (both steps showing TRUE top planes to the bird's
  // eye), a tapered shaft carrying a carved band, and a
  // two-facet pyramid cap. It stands PLUMB where the tablets
  // lean: money buys a deeper footing.
  const mh = s * (1.3 + ((h >> 5) & 3) * 0.04);
  return {
    sortY: ty + 0.7,
    body: stationBody(0.55, 1.6, 0.4),
    drawShadow: () => rend.castBlob(p.x, baseY, mh / s, s * 0.26, h ^ 0x53),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.012, s * 0.36, s * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      // Two plinth steps, each a lit tread over a shaded riser.
      const steps: ReadonlyArray<readonly [number, number]> = [
        [s * 0.56, s * 0.1],
        [s * 0.42, s * 0.1],
      ];
      let sy2 = baseY;
      for (const [sw2, sh2] of steps) {
        ctx.fillStyle = shade(GY_STONE, -14);
        ctx.fillRect(p.x - sw2 / 2, sy2 - sh2, sw2, sh2);
        ctx.fillStyle = shade(GY_STONE_LIT, -4);
        ctx.fillRect(p.x - sw2 / 2, sy2 - sh2 - syT * 0.055, sw2, syT * 0.055);
        sy2 -= sh2 + syT * 0.055;
      }
      // The shaft tapers as it rises — the mason's entasis,
      // spoken in two straight lines.
      const shaftB = sy2;
      const capY = baseY - mh + s * 0.18;
      const wB = s * 0.3;
      const wT = s * 0.24;
      ctx.fillStyle = GY_STONE;
      ctx.beginPath();
      ctx.moveTo(p.x - wB / 2, shaftB);
      ctx.lineTo(p.x - wT / 2, capY);
      ctx.lineTo(p.x + wT / 2, capY);
      ctx.lineTo(p.x + wB / 2, shaftB);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(GY_STONE, 12);
      ctx.beginPath();
      ctx.moveTo(p.x - wB / 2, shaftB);
      ctx.lineTo(p.x - wT / 2, capY);
      ctx.lineTo(p.x - wT / 2 + s * 0.05, capY);
      ctx.lineTo(p.x - wB / 2 + s * 0.05, shaftB);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(GY_STONE, -16);
      ctx.beginPath();
      ctx.moveTo(p.x + wB / 2 - s * 0.045, shaftB);
      ctx.lineTo(p.x + wT / 2 - s * 0.045, capY);
      ctx.lineTo(p.x + wT / 2, capY);
      ctx.lineTo(p.x + wB / 2, shaftB);
      ctx.closePath();
      ctx.fill();
      // The carved band rings the shaft's shoulder; below it,
      // the name lines worn like the tablets'.
      ctx.fillStyle = 'rgba(30, 24, 40, 0.45)';
      ctx.fillRect(p.x - wT / 2, capY + mh * 0.09, wT, Math.max(1, s * 0.02));
      ctx.fillRect(p.x - wT / 2, capY + mh * 0.14, wT, Math.max(1, s * 0.012));
      for (let i = 0; i < 3; i++) {
        const rw = wT * (0.62 - i * 0.1);
        ctx.fillRect(p.x - rw / 2, capY + mh * (0.24 + i * 0.09), rw, Math.max(1, s * 0.02));
      }
      // THE CAP: a pyramid in two facets — sunrise west, the
      // shadowed fall east — over its own molded lip.
      ctx.fillStyle = shade(GY_STONE, -18);
      ctx.fillRect(p.x - wT / 2 - s * 0.035, capY - s * 0.045, wT + s * 0.07, s * 0.045);
      ctx.fillStyle = shade(GY_STONE_LIT, 10);
      ctx.beginPath();
      ctx.moveTo(p.x - wT / 2 - s * 0.035, capY - s * 0.045);
      ctx.lineTo(p.x, capY - s * 0.24);
      ctx.lineTo(p.x, capY - s * 0.045);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(GY_STONE, -8);
      ctx.beginPath();
      ctx.moveTo(p.x, capY - s * 0.24);
      ctx.lineTo(p.x + wT / 2 + s * 0.035, capY - s * 0.045);
      ctx.lineTo(p.x, capY - s * 0.045);
      ctx.closePath();
      ctx.fill();
      // Damp holds the north step; the wind keeps the shaft.
      ctx.fillStyle = GY_MOSS;
      ctx.beginPath();
      facetBlob(ctx, p.x - s * 0.2, baseY - s * 0.07, s * 0.055, h ^ 0x39, 5, 0.7);
      ctx.fill();
      // NO struct stroke: the cached ring pass rings the whole
      // stepped silhouette by dilation — the manual trace on
      // top of it doubled the monument's ink (museum audit).
    },
  };
}

function paintGraveMound(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // THE FRESH GRAVE — the yard's quietest and loudest piece. A
  // low mound of turned earth (dark: the soil hasn't dried),
  // crumb flecks catching light along the ridge, a field-stone
  // at its head because a field-stone is what there was. Some
  // carry a laid posy, still pale. Nothing here is carved; the
  // grief is recent.
  const mw = s * (0.76 + ((h >> 4) & 3) * 0.03);
  return {
    sortY: ty + 0.65,
    body: stationBody(0.8, 0.5, 0.45),
    // A mound throws no standing shadow — it IS ground.
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // The turned bed sinks a shade into the turf around it.
      ctx.fillStyle = 'rgba(12, 8, 20, 0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - syT * 0.1, mw * 0.62, syT * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      // The mound: dark fresh soil, faceted so it reads dug,
      // not poured.
      ctx.fillStyle = shade('#4a3a2c', ((h >> 7) & 3) - 1);
      ctx.beginPath();
      facetBlob(ctx, p.x, baseY - syT * 0.12, mw * 0.5, h ^ 0x25, 8, 0.82);
      ctx.fill();
      // The ridge catches what light the yard gets.
      ctx.fillStyle = shade('#5e4a36', 8);
      ctx.beginPath();
      ctx.ellipse(p.x - mw * 0.06, baseY - syT * 0.2, mw * 0.3, syT * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      // Crumb flecks, hash-strewn — the spade's signature.
      ctx.fillStyle = 'rgba(24, 16, 12, 0.55)';
      for (let i = 0; i < 5; i++) {
        const fx = p.x + (((h >> (i * 3)) & 7) - 3.5) * mw * 0.11;
        const fy = baseY - syT * (0.06 + (((h >> (i * 3 + 2)) & 3) * 0.07));
        ctx.fillRect(fx, fy, Math.max(1, s * 0.02), Math.max(1, s * 0.016));
      }
      // The head stone: one rounded field-stone, set north.
      ctx.fillStyle = shade(GY_STONE, -6);
      ctx.beginPath();
      facetBlob(ctx, p.x - mw * 0.04, baseY - syT * 0.38, s * 0.11, h ^ 0x4d, 6, 0.75);
      ctx.fill();
      ctx.fillStyle = shade(GY_STONE_LIT, -4);
      ctx.beginPath();
      facetBlob(ctx, p.x - mw * 0.06, baseY - syT * 0.4, s * 0.055, h ^ 0x4e, 5, 0.7);
      ctx.fill();
      // The posy, where someone left one: three pale heads on
      // a laid stem, wilting toward the foot.
      if ((h & 7) < 3) {
        const px2 = p.x + mw * 0.16;
        const py2 = baseY - syT * 0.18;
        ctx.strokeStyle = 'rgba(74, 97, 56, 0.8)';
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(px2, py2);
        ctx.quadraticCurveTo(px2 + s * 0.08, py2 + syT * 0.03, px2 + s * 0.15, py2 + syT * 0.1);
        ctx.stroke();
        ctx.fillStyle = '#cfc8dd';
        for (const [dx2, dy2] of [
          [0, 0],
          [s * 0.045, -s * 0.02],
          [s * 0.02, s * 0.035],
        ] as const) {
          ctx.beginPath();
          facetCircle(ctx, px2 + dx2, py2 + dy2, s * 0.026, 5, 0.4);
          ctx.fill();
        }
      }
    },
  };
}

function paintMournerStatue(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // THE MOURNER — the yard's showpiece. A hooded figure in
  // carved stone, head bowed over folded hands, robe falling
  // sheer to the plinth. The hood's cavity is the darkest
  // value in the whole kit — the face is NOT drawn; the
  // camera never earns it — and the rain has worn two pale
  // tracks down the cowl where centuries cried for it. Bowed
  // east or west by hash, so facing pairs can flank a gate.
  const m = ((h >> 4) & 1) === 0 ? 1 : -1;
  // Robe stone: PALE weathered marble, two full steps off the
  // pier granite. (The first cut's dark teardrop read as a
  // ghost at play distance — a statue is STONE first; the
  // grief lives in the pose, not the value.)
  const MRB = '#a49fb3';
  return {
    sortY: ty + 0.7,
    body: stationBody(0.55, 1.65, 0.4),
    drawShadow: () => rend.castBlob(p.x, baseY, 1.4, s * 0.24, h ^ 0x77),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.012, s * 0.36, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // The plinth: two stepped blocks, each a lit tread over a
      // shaded riser — the statue is SET UP, never set down.
      let stepY = baseY;
      for (const [sw2, sh2] of [
        [s * 0.56, s * 0.11],
        [s * 0.4, s * 0.1],
      ] as const) {
        ctx.fillStyle = shade(GY_STONE, -16);
        ctx.fillRect(p.x - sw2 / 2, stepY - sh2, sw2, sh2);
        ctx.fillStyle = shade(GY_STONE_LIT, -4);
        ctx.fillRect(p.x - sw2 / 2, stepY - sh2 - syT * 0.05, sw2, syT * 0.05);
        stepY -= sh2 + syT * 0.05;
      }
      const footY = stepY;
      const headX = p.x + m * s * 0.055;
      const headY = footY - s * 1.02;
      // THE SILHOUETTE — hem flare, gathered waist, sloped
      // shoulders, the cowl bowed over the grave it keeps.
      // Grief is drawn in the SHOULDER LINE, not the value.
      const silhouette = (): void => {
        ctx.moveTo(p.x - s * 0.21, footY);
        // West hem gathers in to the waist...
        ctx.quadraticCurveTo(p.x - s * 0.15, footY - s * 0.34, p.x - s * 0.135, footY - s * 0.52);
        // ...rises to the near shoulder...
        ctx.quadraticCurveTo(headX - s * 0.15, headY + s * 0.34, headX - s * 0.125, headY + s * 0.2);
        // ...the cowl closes over the bowed head...
        ctx.quadraticCurveTo(headX - s * 0.1, headY - s * 0.045, headX + m * s * 0.02, headY - s * 0.05);
        ctx.quadraticCurveTo(headX + s * 0.115, headY - s * 0.03, headX + s * 0.12, headY + s * 0.21);
        // ...falls off the far shoulder to the waist...
        ctx.quadraticCurveTo(headX + s * 0.14, headY + s * 0.36, p.x + s * 0.13, footY - s * 0.5);
        // ...and the east hem flares back out to the plinth.
        ctx.quadraticCurveTo(p.x + s * 0.15, footY - s * 0.3, p.x + s * 0.21, footY);
      };
      ctx.fillStyle = MRB;
      ctx.beginPath();
      silhouette();
      ctx.closePath();
      ctx.fill();
      // The west light takes the near fold; the east fall
      // shades one step — planes, never gradients.
      ctx.fillStyle = shade(MRB, 12);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.17, footY);
      ctx.quadraticCurveTo(p.x - s * 0.115, footY - s * 0.4, headX - s * 0.09, headY + s * 0.24);
      ctx.lineTo(headX - s * 0.035, headY + s * 0.26);
      ctx.quadraticCurveTo(p.x - s * 0.055, footY - s * 0.36, p.x - s * 0.075, footY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(MRB, -16);
      ctx.beginPath();
      ctx.moveTo(p.x + s * 0.21, footY);
      ctx.quadraticCurveTo(p.x + s * 0.15, footY - s * 0.3, headX + s * 0.115, headY + s * 0.24);
      ctx.lineTo(headX + s * 0.06, headY + s * 0.27);
      ctx.quadraticCurveTo(p.x + s * 0.09, footY - s * 0.34, p.x + s * 0.1, footY);
      ctx.closePath();
      ctx.fill();
      // Two drape folds fall from the hands — carved lines,
      // not paint.
      ctx.strokeStyle = shade(MRB, -22);
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.moveTo(headX - s * 0.045, headY + s * 0.48);
      ctx.quadraticCurveTo(p.x - s * 0.05, footY - s * 0.26, p.x - s * 0.035, footY - s * 0.02);
      ctx.moveTo(headX + s * 0.05, headY + s * 0.47);
      ctx.quadraticCurveTo(p.x + s * 0.06, footY - s * 0.24, p.x + s * 0.05, footY - s * 0.02);
      ctx.stroke();
      // THE HOOD'S CAVITY — small, bowed toward the grave. The
      // darkest value in the kit; no face is carved there.
      ctx.fillStyle = '#241f2e';
      ctx.beginPath();
      ctx.ellipse(headX + m * s * 0.035, headY + s * 0.075, s * 0.052, s * 0.068, m * 0.35, 0, Math.PI * 2);
      ctx.fill();
      // The cowl's rim catches the sky over the cavity.
      ctx.strokeStyle = shade(MRB, 20);
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.arc(headX + m * s * 0.005, headY + s * 0.06, s * 0.088, Math.PI * 0.95, Math.PI * 2.05);
      ctx.stroke();
      // The folded hands: one carved knot at the breast, the
      // wrists meeting under it.
      ctx.fillStyle = shade(MRB, 18);
      ctx.beginPath();
      facetCircle(ctx, headX - m * s * 0.01, headY + s * 0.4, s * 0.05, 6, 0.5, 0.75);
      ctx.fill();
      ctx.fillStyle = shade(MRB, -12);
      ctx.fillRect(headX - m * s * 0.01 - s * 0.055, headY + s * 0.435, s * 0.11, Math.max(1, s * 0.016));
      // THE RAIN'S TRACKS: two faint runnels down the cowl —
      // the weather mourns with it, quietly.
      ctx.fillStyle = 'rgba(60, 52, 76, 0.22)';
      ctx.fillRect(headX - m * s * 0.035, headY + s * 0.16, Math.max(1, s * 0.013), s * 0.26);
      ctx.fillRect(headX + m * s * 0.02, headY + s * 0.18, Math.max(1, s * 0.013), s * 0.2);
      // Moss holds the hem and the plinth's shaded corner.
      ctx.fillStyle = GY_MOSS;
      ctx.beginPath();
      facetBlob(ctx, p.x - m * s * 0.15, footY - s * 0.04, s * 0.055, h ^ 0x2b, 5, 0.7);
      ctx.fill();
      ctx.beginPath();
      facetBlob(ctx, p.x + m * s * 0.22, baseY - s * 0.04, s * 0.05, h ^ 0x2c, 5, 0.7);
      ctx.fill();
      if (rend.outlineOn) {
        rend.beginStructOutline();
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.28, baseY);
        ctx.lineTo(p.x - s * 0.28, baseY - s * 0.11);
        ctx.lineTo(p.x - s * 0.21, footY);
        silhouette();
        ctx.lineTo(p.x + s * 0.28, baseY - s * 0.11);
        ctx.lineTo(p.x + s * 0.28, baseY);
        ctx.stroke();
      }
    },
  };
}

function paintSarcophagus(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  // The crypt's anchor. A stone coffin LIES — long axis across
  // the screen so the eye reads a horizontal box, never a
  // standing cabinet (the first live audit's verdict). The lid
  // is the read: a sky-lit top plane carrying the effigy in
  // two-value relief, head to one end, sword run to the feet.
  // Longer than the body it holds (the BODY-RULER law: it
  // overdraws its tile east-west like a lone bed overdraws
  // south). A quarter of them stand AJAR — the lid walked a
  // hand's width and nobody talks about why.
  const m = ((h >> 4) & 1) === 0 ? 1 : -1; // head end
  const ajar = ((h >> 6) & 3) === 0;
  const xL = p.x - s * 0.62;
  const xR = p.x + s * 0.62;
  const hh = s * 0.42; // box height off the floor
  const yS = p.y + syT * 0.34; // plan south edge
  const yN = p.y - syT * 0.3; // plan north edge
  return {
    sortY: ty + 0.7,
    body: stationBody(0.75, 1.0, 0.55),
    drawShadow: () => rend.castEdgeQuad(xL, yS, xR, yS, 0.45),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // Contact shade pools along the standing face.
      ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
      ctx.fillRect(xL - s * 0.02, yS - s * 0.012, xR - xL + s * 0.04, s * 0.06);
      // The south face: coursed stone over a plinth lip — the
      // one plumb face the camera sees, a full step off the
      // flagstone dark (the kit's value law).
      ctx.fillStyle = DGN_STONE;
      ctx.fillRect(xL, yS - hh, xR - xL, hh);
      ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
      ctx.fillRect(xL, yS - s * 0.1, xR - xL, s * 0.1);
      // Two carved course lines and a vent slit break the face.
      ctx.fillStyle = 'rgba(30, 24, 40, 0.4)';
      ctx.fillRect(xL, yS - hh * 0.55, xR - xL, Math.max(1, s * 0.016));
      ctx.fillRect(p.x + m * s * 0.3 - s * 0.02, yS - hh * 0.78, s * 0.04, hh * 0.3);
      // Side arrises pin the box's ends.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.35)';
      ctx.fillRect(xR - Math.max(1, s * 0.02), yS - hh, Math.max(1, s * 0.02), hh);
      ctx.fillStyle = 'rgba(178, 174, 196, 0.4)';
      ctx.fillRect(xL, yS - hh, Math.max(1, s * 0.02), hh);
      // THE LID — the foreshortened top plane, sky-lit.
      const lidN = yN - hh;
      const lidS = yS - hh - s * 0.02;
      ctx.save();
      if (ajar) {
        // The walked lid: slid toward the foot end; the gap it
        // opened at the head is a hard black wedge.
        ctx.fillStyle = '#16121e';
        ctx.fillRect(m > 0 ? xL : xR - s * 0.22, lidN, s * 0.22, lidS - lidN);
        ctx.translate(-m * s * 0.1, 0);
      }
      ctx.fillStyle = '#9a95a8';
      ctx.fillRect(xL, lidN, xR - xL, lidS - lidN);
      // The raised border: shadow inboard, lit north arris.
      ctx.strokeStyle = 'rgba(38, 32, 48, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.strokeRect(xL + s * 0.06, lidN + syT * 0.07, xR - xL - s * 0.12, lidS - lidN - syT * 0.14);
      ctx.fillStyle = '#c2bdcf';
      ctx.fillRect(xL, lidN, xR - xL, Math.max(1, s * 0.02));
      // The effigy lies head-to-one-end: dark cast first, then
      // the raised stone a half step proud. Weather ate the
      // face centuries ago — the SHAPE is the story.
      const hx = p.x + m * s * 0.4; // head end
      const midY = (lidN + lidS) / 2;
      const relief = (d: number, col: string): void => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(hx + d, midY + d * 0.6, s * 0.075, syT * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
        // Shoulders taper toward the feet.
        ctx.beginPath();
        ctx.moveTo(hx - m * s * 0.12 + d, midY - syT * 0.13 + d * 0.6);
        ctx.lineTo(hx - m * s * 0.72 + d, midY - syT * 0.08 + d * 0.6);
        ctx.lineTo(hx - m * s * 0.72 + d, midY + syT * 0.08 + d * 0.6);
        ctx.lineTo(hx - m * s * 0.12 + d, midY + syT * 0.13 + d * 0.6);
        ctx.closePath();
        ctx.fill();
        // The sword runs the body line to the feet; crossguard
        // bars it under the folded arms; pommel at the chest.
        ctx.fillRect(hx - m * s * 0.68 + d - s * 0.34 + m * s * 0.34, midY - s * 0.016 + d * 0.6, s * 0.42, s * 0.032);
        ctx.fillRect(hx - m * s * 0.26 + d - s * 0.016, midY - syT * 0.11 + d * 0.6, s * 0.032, syT * 0.22);
        ctx.beginPath();
        ctx.ellipse(hx - m * s * 0.18 + d, midY + d * 0.6, s * 0.028, s * 0.026, 0, 0, Math.PI * 2);
        ctx.fill();
      };
      relief(s * 0.014, 'rgba(38, 32, 48, 0.55)');
      relief(0, '#c6c1d3');
      // The chipped corner: a bite of fresh, paler stone.
      ctx.fillStyle = shade('#9a95a8', 16);
      ctx.beginPath();
      ctx.moveTo(m > 0 ? xL : xR, lidS);
      ctx.lineTo(m > 0 ? xL + s * 0.09 : xR - s * 0.09, lidS);
      ctx.lineTo(m > 0 ? xL : xR, lidS - syT * 0.09);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Damp creeps up the shaded end of the face.
      ctx.fillStyle = 'rgba(74, 97, 56, 0.5)';
      ctx.beginPath();
      facetBlob(ctx, m > 0 ? xR - s * 0.08 : xL + s * 0.08, yS - s * 0.06, s * 0.075, h ^ 0x33, 5, 0.7);
      ctx.fill();
    },
  };
}

function paintBrokenPillar(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // Ancient violence in stone: the stump still stands on its
  // stepped plinth — the GRAND pillar's own base language, so
  // the two read as kin — sheared at a raking angle, and the
  // drum it dropped lies where it rolled, round end-grain to
  // the camera. That foreshortened circle is the piece's whole
  // 3D argument: nothing painted flat has an END. (First audit
  // verdict: the v1 stump read as a thin gravestone — the
  // rework gives it the grand pillar's girth and its plinth.)
  const m = ((h >> 4) & 1) === 0 ? 1 : -1;
  const stumpH = s * (0.72 + ((h >> 6) & 3) * 0.08);
  const rw = s * 0.23; // shaft half-width
  return {
    sortY: ty + 0.7,
    body: stationBody(0.95, 1.3, 0.55),
    drawShadow: () => rend.castBlob(p.x - m * s * 0.16, baseY, stumpH / s, s * 0.26, h ^ 0x41),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      const sx = p.x - m * s * 0.18; // the stump keeps one side
      ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
      ctx.beginPath();
      ctx.ellipse(sx, baseY + s * 0.01, s * 0.34, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // The stepped plinth, each tread keeping a lit arris —
      // the grand pillar's base, verbatim.
      ctx.fillStyle = DGN_STONE_DARK;
      ctx.fillRect(sx - s * 0.32, baseY - s * 0.08, s * 0.64, s * 0.08);
      ctx.fillStyle = DGN_STONE;
      ctx.fillRect(sx - s * 0.26, baseY - s * 0.16, s * 0.52, s * 0.08);
      ctx.fillStyle = 'rgba(160, 155, 173, 0.5)';
      ctx.fillRect(sx - s * 0.32, baseY - s * 0.08, s * 0.64, Math.max(1, s * 0.018));
      ctx.fillRect(sx - s * 0.26, baseY - s * 0.16, s * 0.52, Math.max(1, s * 0.016));
      // The stump: full shaft girth up to the shear line.
      ctx.fillStyle = DGN_STONE;
      ctx.beginPath();
      ctx.moveTo(sx - rw, baseY - s * 0.16);
      ctx.lineTo(sx - rw * 0.95, baseY - stumpH + s * 0.12 * m);
      ctx.lineTo(sx + rw * 0.95, baseY - stumpH - s * 0.14 * m);
      ctx.lineTo(sx + rw, baseY - s * 0.16);
      ctx.closePath();
      ctx.fill();
      // The turned form: shade flank, lit lane, carved flutes —
      // the grand pillar's skin so kinship is unmistakable.
      ctx.fillStyle = 'rgba(20, 14, 30, 0.28)';
      ctx.beginPath();
      ctx.moveTo(sx + m * rw, baseY - s * 0.16);
      ctx.lineTo(sx + m * rw * 0.95, baseY - stumpH - s * 0.14 * m * (m > 0 ? 1 : -1));
      ctx.lineTo(sx + m * rw * 0.55, baseY - stumpH - s * 0.05 * m * (m > 0 ? 1 : -1));
      ctx.lineTo(sx + m * rw * 0.55, baseY - s * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(178, 174, 196, 0.5)';
      ctx.fillRect(sx - m * rw * 0.82, baseY - stumpH * 0.88, s * 0.05, stumpH * 0.72);
      ctx.strokeStyle = 'rgba(38, 32, 48, 0.45)';
      ctx.lineWidth = Math.max(1, s * 0.02);
      for (const f of [-0.42, 0.1, 0.56]) {
        ctx.beginPath();
        ctx.moveTo(sx + rw * f, baseY - s * 0.16);
        ctx.lineTo(sx + rw * f * 0.95, baseY - stumpH + s * (0.08 - f * 0.1) * m);
        ctx.stroke();
      }
      // The shear: fresh break reads PALER than weathered skin,
      // two raking facets meeting in a ridge.
      ctx.fillStyle = shade(DGN_STONE_LIT, 10);
      ctx.beginPath();
      ctx.moveTo(sx - rw * 0.95, baseY - stumpH + s * 0.12 * m);
      ctx.lineTo(sx - rw * 0.1, baseY - stumpH - s * 0.06 * m);
      ctx.lineTo(sx + rw * 0.95, baseY - stumpH - s * 0.14 * m);
      ctx.lineTo(sx + rw * 0.3, baseY - stumpH + s * 0.03 * m);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(DGN_STONE_LIT, 26);
      ctx.beginPath();
      ctx.moveTo(sx - rw * 0.95, baseY - stumpH + s * 0.12 * m);
      ctx.lineTo(sx - rw * 0.1, baseY - stumpH - s * 0.06 * m);
      ctx.lineTo(sx + rw * 0.3, baseY - stumpH + s * 0.03 * m);
      ctx.closePath();
      ctx.fill();
      // The fallen drum: a full-girth cylinder on its side, its
      // end-grain circle catching the light, flutes running the
      // length, half bedded in its own rubble.
      const dr = s * 0.16;
      const dl = s * 0.42;
      const dx = p.x + m * s * 0.34 - (m > 0 ? 0 : dl);
      const dy = baseY - s * 0.03;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.26)';
      ctx.beginPath();
      ctx.ellipse(dx + dl * 0.5, dy + dr * 0.7, dl * 0.66, s * 0.075, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = DGN_STONE_DARK;
      ctx.fillRect(dx, dy - dr, dl, dr * 2);
      // A lit top lane keeps the barrel round.
      ctx.fillStyle = 'rgba(160, 155, 173, 0.35)';
      ctx.fillRect(dx, dy - dr, dl, dr * 0.42);
      ctx.strokeStyle = 'rgba(38, 32, 48, 0.5)';
      for (const f of [-0.35, 0.2, 0.7]) {
        ctx.beginPath();
        ctx.moveTo(dx, dy + dr * f);
        ctx.lineTo(dx + dl, dy + dr * f);
        ctx.stroke();
      }
      // The end face, pale — stone the weather never found.
      const ex = m > 0 ? dx + dl : dx;
      ctx.fillStyle = DGN_STONE;
      ctx.beginPath();
      ctx.ellipse(ex, dy, dr * 0.58, dr * 1.02, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = DGN_STONE_LIT;
      ctx.beginPath();
      ctx.ellipse(ex, dy, dr * 0.44, dr * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(38, 32, 48, 0.5)';
      ctx.beginPath();
      ctx.ellipse(ex, dy, dr * 0.17, dr * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      // A second drum behind, half sunk in the floor's dark.
      ctx.fillStyle = shade(DGN_STONE_DARK, -8);
      ctx.beginPath();
      ctx.ellipse(dx + dl * 0.3 - m * s * 0.3, dy - s * 0.16, s * 0.16, s * 0.08, m * 0.2, 0, Math.PI * 2);
      ctx.fill();
      // Chips trail from the shear to where the drums bounced.
      rend.rubble(p.x, p.y - s * 0.1, s * 0.8, h ^ 0x59, [DGN_STONE, DGN_STONE_DARK, DGN_STONE_LIT]);
      // Moss takes the stump's north-facing shade.
      ctx.fillStyle = 'rgba(74, 97, 56, 0.6)';
      ctx.beginPath();
      facetBlob(ctx, sx - m * rw * 0.7, baseY - s * 0.22, s * 0.07, h ^ 0x6d, 5, 0.8);
      ctx.fill();
    },
  };
}

function paintGrandPillar(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // The depth-of-field piece: a carved column at the walls' own
  // WALL_H so colonnades and corridors agree on the ceiling they
  // hold. Entasis keeps the shaft alive (a dead-straight column
  // reads as a painted bar), the capital shows its TOP PLANE,
  // and one hard lit lane runs the full height — stone earns
  // one edge the way mithril does.
  const ht = s * 2.02;
  const m = ((h >> 5) & 1) === 0 ? 1 : -1;
  // The shaft's half-width at fraction f of its height —
  // swelling gently to a third up, drawing to the neck.
  const wAt = (f: number): number => s * (0.2 + 0.03 * Math.sin(Math.min(f, 1) * Math.PI * 0.82) - 0.045 * f);
  return {
    sortY: ty + 0.7,
    body: stationBody(0.62, 2.35, 0.5),
    drawShadow: () => rend.castEdgeQuad(p.x - s * 0.2, baseY, p.x + s * 0.2, baseY, 1.4),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, s * 0.34, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // The stepped plinth, each tread keeping a lit arris.
      ctx.fillStyle = DGN_STONE_DARK;
      ctx.fillRect(p.x - s * 0.32, baseY - s * 0.08, s * 0.64, s * 0.08);
      ctx.fillStyle = DGN_STONE;
      ctx.fillRect(p.x - s * 0.26, baseY - s * 0.16, s * 0.52, s * 0.08);
      ctx.fillStyle = 'rgba(160, 155, 173, 0.5)';
      ctx.fillRect(p.x - s * 0.32, baseY - s * 0.08, s * 0.64, Math.max(1, s * 0.018));
      ctx.fillRect(p.x - s * 0.26, baseY - s * 0.16, s * 0.52, Math.max(1, s * 0.016));
      // The shaft with entasis, built as one polygon.
      const y0 = baseY - s * 0.16;
      const shaftH = ht - s * 0.42;
      ctx.fillStyle = DGN_STONE;
      ctx.beginPath();
      ctx.moveTo(p.x - wAt(0), y0);
      for (let f = 0.2; f <= 1.001; f += 0.2) ctx.lineTo(p.x - wAt(f), y0 - shaftH * f);
      for (let f = 1; f >= -0.001; f -= 0.2) ctx.lineTo(p.x + wAt(f), y0 - shaftH * f);
      ctx.closePath();
      ctx.fill();
      // Turned form: the away flank falls to shadow…
      ctx.fillStyle = 'rgba(20, 14, 30, 0.28)';
      ctx.beginPath();
      ctx.moveTo(p.x + m * wAt(0), y0);
      for (let f = 0.2; f <= 1.001; f += 0.2) ctx.lineTo(p.x + m * wAt(f), y0 - shaftH * f);
      for (let f = 1; f >= -0.001; f -= 0.2) ctx.lineTo(p.x + m * wAt(f) * 0.55, y0 - shaftH * f);
      ctx.closePath();
      ctx.fill();
      // …and ONE hard lit lane answers on the near flank.
      ctx.fillStyle = 'rgba(178, 174, 196, 0.55)';
      ctx.beginPath();
      ctx.moveTo(p.x - m * wAt(0) * 0.82, y0);
      for (let f = 0.25; f <= 1.001; f += 0.25) ctx.lineTo(p.x - m * wAt(f) * 0.82, y0 - shaftH * f);
      for (let f = 1; f >= -0.001; f -= 0.25) ctx.lineTo(p.x - m * wAt(f) * 0.62, y0 - shaftH * f);
      ctx.closePath();
      ctx.fill();
      // Two carved flutes ride the swell.
      ctx.strokeStyle = 'rgba(38, 32, 48, 0.4)';
      ctx.lineWidth = Math.max(1, s * 0.02);
      for (const g of [-0.12, 0.3]) {
        ctx.beginPath();
        ctx.moveTo(p.x + wAt(0) * g, y0);
        for (let f = 0.25; f <= 1.001; f += 0.25) ctx.lineTo(p.x + wAt(f) * g, y0 - shaftH * f);
        ctx.stroke();
      }
      // The carved band at the kingdom's own height: a belt of
      // chevron ticks two-thirds up.
      const bandY = y0 - shaftH * 0.64;
      const bandW = wAt(0.64);
      ctx.fillStyle = DGN_STONE_DARK;
      ctx.fillRect(p.x - bandW, bandY - s * 0.05, bandW * 2, s * 0.1);
      ctx.strokeStyle = 'rgba(160, 155, 173, 0.6)';
      ctx.lineWidth = Math.max(1, s * 0.018);
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(p.x + k * bandW * 0.38 - s * 0.028, bandY + s * 0.03);
        ctx.lineTo(p.x + k * bandW * 0.38, bandY - s * 0.028);
        ctx.lineTo(p.x + k * bandW * 0.38 + s * 0.028, bandY + s * 0.03);
        ctx.stroke();
      }
      // The capital: a flared echinus under the abacus slab —
      // and the slab shows its foreshortened TOP (the 2.5D law:
      // sky-lit plane, shaded south arris).
      const nkY = y0 - shaftH;
      ctx.fillStyle = DGN_STONE;
      ctx.beginPath();
      ctx.moveTo(p.x - wAt(1), nkY);
      ctx.lineTo(p.x - s * 0.3, nkY - s * 0.14);
      ctx.lineTo(p.x + s * 0.3, nkY - s * 0.14);
      ctx.lineTo(p.x + wAt(1), nkY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(20, 14, 30, 0.25)';
      ctx.fillRect(p.x - wAt(1) * 0.9, nkY - s * 0.035, wAt(1) * 1.8, s * 0.035);
      ctx.fillStyle = DGN_STONE;
      ctx.fillRect(p.x - s * 0.33, nkY - s * 0.26, s * 0.66, s * 0.12);
      ctx.fillStyle = DGN_STONE_LIT;
      ctx.fillRect(p.x - s * 0.33, nkY - s * 0.26 - syT * 0.14, s * 0.66, syT * 0.14);
      ctx.fillStyle = 'rgba(220, 216, 236, 0.45)';
      ctx.fillRect(p.x - s * 0.33, nkY - s * 0.26 - syT * 0.14, s * 0.66, Math.max(1, s * 0.02));
      // Damp wicks up from the floor; moss keeps the plinth.
      ctx.fillStyle = 'rgba(30, 24, 40, 0.25)';
      ctx.fillRect(p.x - wAt(0.02), y0 - shaftH * 0.09, wAt(0.02) * 2, shaftH * 0.09);
      ctx.fillStyle = 'rgba(74, 97, 56, 0.6)';
      ctx.beginPath();
      facetBlob(ctx, p.x - m * s * 0.22, baseY - s * 0.1, s * 0.07, h ^ 0x51, 5, 0.75);
      ctx.fill();
    },
  };
}

function paintAncientStatue(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // A king of the swallowed kingdom, at watch long past the
  // point of anyone to watch for. Old granite, not elven marble:
  // the masses are heavy and the weather has won — the face is
  // an eroded shadow band, one arm is gone at the elbow, and
  // moss has taken the crown. The sword he leans on is the one
  // shape time couldn't blur.
  const m = ((h >> 4) & 1) === 0 ? 1 : -1; // the surviving arm's side
  const ht = s * 1.6; // figure over the plinth
  const plH = s * 0.26;
  return {
    sortY: ty + 0.74,
    body: stationBody(0.6, 2.2, 0.5),
    drawShadow: () => rend.castEdgeQuad(p.x - s * 0.2, baseY, p.x + s * 0.2, baseY, 1.3),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, s * 0.32, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // The plinth: one block, lit top arris, weather-streaked.
      ctx.fillStyle = DGN_STONE_DARK;
      ctx.fillRect(p.x - s * 0.3, baseY - plH, s * 0.6, plH);
      ctx.fillStyle = 'rgba(160, 155, 173, 0.5)';
      ctx.fillRect(p.x - s * 0.3, baseY - plH, s * 0.6, Math.max(1, s * 0.02));
      ctx.fillStyle = 'rgba(143, 138, 122, 0.3)';
      ctx.fillRect(p.x - s * 0.12, baseY - plH, s * 0.05, plH);
      ctx.fillRect(p.x + s * 0.16, baseY - plH, s * 0.035, plH);
      const fy = baseY - plH; // the figure's footing
      // A full value step off the '#514b58' flagstone (the
      // kit's value law — the first audit melted him into the
      // floor at map scale).
      const body = '#6a6377';
      const lit = '#9a9486';
      // The robe: one long fall of stone widening to the hem,
      // three carved folds — the SWEPT MASS reads at map scale.
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.24, fy);
      ctx.lineTo(p.x - s * 0.13, fy - ht * 0.62);
      ctx.lineTo(p.x + s * 0.13, fy - ht * 0.62);
      ctx.lineTo(p.x + s * 0.24, fy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(30, 24, 40, 0.45)';
      ctx.lineWidth = Math.max(1, s * 0.022);
      for (const g of [-0.5, 0.05, 0.55]) {
        ctx.beginPath();
        ctx.moveTo(p.x + s * 0.2 * g, fy);
        ctx.quadraticCurveTo(p.x + s * 0.16 * g, fy - ht * 0.3, p.x + s * 0.11 * g, fy - ht * 0.6);
        ctx.stroke();
      }
      // Torso and pauldron shoulders: a soldier-king's block.
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.19, fy - ht * 0.58);
      ctx.lineTo(p.x - s * 0.16, fy - ht * 0.86);
      ctx.lineTo(p.x + s * 0.16, fy - ht * 0.86);
      ctx.lineTo(p.x + s * 0.19, fy - ht * 0.58);
      ctx.closePath();
      ctx.fill();
      // One lit flank keeps the figure round.
      ctx.fillStyle = 'rgba(143, 138, 122, 0.4)';
      ctx.beginPath();
      ctx.moveTo(p.x - m * s * 0.2, fy);
      ctx.lineTo(p.x - m * s * 0.13, fy - ht * 0.8);
      ctx.lineTo(p.x - m * s * 0.06, fy - ht * 0.8);
      ctx.lineTo(p.x - m * s * 0.11, fy);
      ctx.closePath();
      ctx.fill();
      // The surviving arm falls to the sword; the other ends at
      // a fresh-broken stub — the break paler than the skin.
      ctx.fillStyle = body;
      const swX = p.x - m * s * 0.3;
      ctx.beginPath();
      ctx.moveTo(p.x - m * s * 0.16, fy - ht * 0.8);
      ctx.lineTo(swX - m * s * 0.02, fy - ht * 0.5);
      ctx.lineTo(swX + m * s * 0.05, fy - ht * 0.5);
      ctx.lineTo(p.x - m * s * 0.08, fy - ht * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x + m * s * 0.16, fy - ht * 0.8);
      ctx.lineTo(p.x + m * s * 0.24, fy - ht * 0.68);
      ctx.lineTo(p.x + m * s * 0.17, fy - ht * 0.64);
      ctx.lineTo(p.x + m * s * 0.1, fy - ht * 0.78);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(lit, 18);
      ctx.beginPath();
      ctx.ellipse(p.x + m * s * 0.205, fy - ht * 0.66, s * 0.038, s * 0.028, m * 0.6, 0, Math.PI * 2);
      ctx.fill();
      // The sword, point down on the plinth: quillons, grip,
      // and the long blade — the one hard-edged thing left.
      ctx.fillStyle = DGN_STONE_LIT;
      ctx.fillRect(swX - s * 0.024, fy - ht * 0.52, s * 0.048, ht * 0.52);
      ctx.fillStyle = 'rgba(38, 32, 48, 0.5)';
      ctx.fillRect(swX + s * 0.002, fy - ht * 0.52, s * 0.02, ht * 0.5);
      ctx.fillStyle = body;
      ctx.fillRect(swX - s * 0.09, fy - ht * 0.56, s * 0.18, s * 0.038);
      ctx.beginPath();
      ctx.ellipse(swX, fy - ht * 0.6, s * 0.03, s * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
      // The head under a mossed crown: features surrendered to
      // one brow shadow — a face the rain finished centuries ago.
      const hdY = fy - ht * 0.94;
      ctx.fillStyle = body;
      ctx.beginPath();
      facetCircle(ctx, p.x, hdY, s * 0.1, 6, 0.42, 0.8);
      ctx.fill();
      ctx.fillStyle = 'rgba(30, 24, 40, 0.5)';
      ctx.fillRect(p.x - s * 0.07, hdY - s * 0.01, s * 0.14, s * 0.035);
      ctx.fillStyle = 'rgba(143, 138, 122, 0.5)';
      ctx.beginPath();
      ctx.ellipse(p.x - m * s * 0.04, hdY - s * 0.045, s * 0.045, s * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
      // The crown: a band and three tines, one snapped short.
      ctx.fillStyle = DGN_STONE_LIT;
      ctx.fillRect(p.x - s * 0.085, hdY - s * 0.115, s * 0.17, s * 0.035);
      for (const [fx2, tall] of [
        [-0.06, 1],
        [0, 1.5],
        [0.06, ((h >> 8) & 1) === 0 ? 0.5 : 1],
      ] as const) {
        ctx.fillRect(p.x + fx2 * s - s * 0.014, hdY - s * (0.115 + 0.05 * tall), s * 0.028, s * 0.05 * tall);
      }
      // Moss holds the crown and the high shoulder; erosion
      // streaks bleach the down-weather flank.
      ctx.fillStyle = 'rgba(74, 97, 56, 0.7)';
      ctx.beginPath();
      facetBlob(ctx, p.x + m * s * 0.05, hdY - s * 0.1, s * 0.05, h ^ 0x27, 5, 0.7);
      ctx.fill();
      ctx.beginPath();
      facetBlob(ctx, p.x + m * s * 0.14, fy - ht * 0.84, s * 0.055, h ^ 0x63, 5, 0.7);
      ctx.fill();
      ctx.fillStyle = 'rgba(196, 190, 176, 0.22)';
      ctx.fillRect(p.x + m * s * 0.07, fy - ht * 0.62, s * 0.035, ht * 0.5);
    },
  };
}

function paintGibbetCage(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // THE LONG DARK PEOPLED — the garrison's warning, still doing
  // its job centuries after the garrison. A driven gallows post,
  // an arm, and an iron basket-cage on a short chain, swinging
  // on air nobody felt move. The bones inside sit low in the
  // basket: whoever it was gave up standing a long time ago.
  const m = ((h >> 4) & 1) === 0 ? 1 : -1; // the arm's side
  const postX = p.x - m * s * 0.22;
  const postTop = baseY - s * 1.58;
  const tipX = postX + m * s * 0.6;
  const tipY = postTop + s * 0.06;
  return {
    sortY: ty + 0.6,
    body: stationBody(0.8, 2.0, 0.4),
    drawShadow: () => rend.castEdgeQuad(postX - s * 0.1, baseY, postX + s * 0.1, baseY, 1.5),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // The swing: one slow pendulum term, cage and chain agree.
      const sw = Math.sin(t * 0.8 + h * 0.7) * s * 0.038;
      const cageX = tipX + sw;
      const cageTop = tipY + s * 0.34;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.26)';
      ctx.beginPath();
      ctx.ellipse(postX, baseY + s * 0.01, s * 0.13, s * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cageX, baseY + syT * 0.06, s * 0.14, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // The post: squared timber, weather-checked, one iron band.
      ctx.fillStyle = shade(PALI_LOG, -8);
      ctx.fillRect(postX - s * 0.055, postTop, s * 0.11, baseY - postTop);
      ctx.fillStyle = shade(PALI_LOG, 8);
      ctx.fillRect(postX - s * 0.055, postTop, s * 0.036, baseY - postTop);
      ctx.fillStyle = 'rgba(30, 22, 16, 0.5)';
      for (const dy of [0.35, 0.7, 1.1]) {
        ctx.fillRect(postX - s * 0.04, baseY - s * dy, s * 0.07, Math.max(1, s * 0.016));
      }
      ctx.fillStyle = DGN_IRON;
      ctx.fillRect(postX - s * 0.06, baseY - s * 0.42, s * 0.12, s * 0.05);
      // The arm and its knee brace carry the load to the post.
      ctx.fillStyle = shade(PALI_LOG, -4);
      ctx.beginPath();
      ctx.moveTo(postX, postTop + s * 0.02);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(tipX, tipY + s * 0.07);
      ctx.lineTo(postX, postTop + s * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade(PALI_LOG, -14);
      ctx.lineWidth = Math.max(1.5, s * 0.045);
      ctx.beginPath();
      ctx.moveTo(postX + m * s * 0.02, postTop + s * 0.42);
      ctx.lineTo(postX + m * s * 0.34, tipY + s * 0.09);
      ctx.stroke();
      // The chain takes the sway as a lean, links alternating
      // tall and flat the way a hung chain turns to the eye.
      for (let k = 0; k <= 5; k++) {
        const f = k / 5;
        const lx = tipX + (cageX - tipX) * f;
        const ly = tipY + s * 0.05 + (cageTop - tipY - s * 0.05) * f;
        ctx.fillStyle = DGN_IRON_LIT;
        if ((k & 1) === 0) ctx.fillRect(lx - s * 0.013, ly - s * 0.024, s * 0.026, s * 0.048);
        else ctx.fillRect(lx - s * 0.019, ly - s * 0.015, s * 0.038, s * 0.03);
      }
      // The cage: dark air behind the bars first, then the iron.
      const cbot = cageTop + s * 0.46;
      ctx.fillStyle = 'rgba(18, 14, 26, 0.55)';
      ctx.beginPath();
      ctx.moveTo(cageX - s * 0.13, cageTop + s * 0.04);
      ctx.quadraticCurveTo(cageX - s * 0.16, cageTop + s * 0.24, cageX - s * 0.1, cbot);
      ctx.lineTo(cageX + s * 0.1, cbot);
      ctx.quadraticCurveTo(cageX + s * 0.16, cageTop + s * 0.24, cageX + s * 0.13, cageTop + s * 0.04);
      ctx.closePath();
      ctx.fill();
      // The tenant: a heap of old bone low in the basket, the
      // skull tipped against the bars.
      ctx.fillStyle = DGN_BONE_DIM;
      ctx.beginPath();
      facetBlob(ctx, cageX + s * 0.01, cbot - s * 0.07, s * 0.085, h ^ 0x35, 5, 0.6);
      ctx.fill();
      ctx.fillStyle = DGN_BONE;
      ctx.beginPath();
      facetCircle(ctx, cageX - m * s * 0.045, cbot - s * 0.12, s * 0.048, 6, 0.4, 0.8);
      ctx.fill();
      ctx.fillStyle = 'rgba(24, 18, 30, 0.8)';
      ctx.fillRect(cageX - m * s * 0.06, cbot - s * 0.13, s * 0.02, s * 0.022);
      ctx.fillStyle = DGN_BONE_DIM;
      ctx.fillRect(cageX + m * s * 0.04, cbot - s * 0.2, s * 0.018, s * 0.1);
      // The ironwork: rings top, middle, bottom; four bowed bars;
      // rust taking the weather side of everything.
      ctx.strokeStyle = DGN_IRON;
      ctx.lineWidth = Math.max(1, s * 0.024);
      for (const bf of [-0.85, -0.3, 0.3, 0.85]) {
        ctx.beginPath();
        ctx.moveTo(cageX + s * 0.13 * bf, cageTop + s * 0.04);
        ctx.quadraticCurveTo(cageX + s * 0.165 * bf, cageTop + s * 0.24, cageX + s * 0.1 * bf, cbot);
        ctx.stroke();
      }
      for (const [ry2, rw] of [
        [cageTop + s * 0.04, 0.13],
        [cageTop + s * 0.24, 0.155],
        [cbot, 0.1],
      ] as const) {
        ctx.strokeStyle = DGN_IRON;
        ctx.beginPath();
        ctx.ellipse(cageX, ry2, s * rw, s * 0.042, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = DGN_IRON_LIT;
        ctx.beginPath();
        ctx.ellipse(cageX, ry2, s * rw, s * 0.042, 0, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
      ctx.fillStyle = DGN_RUST_LIT;
      ctx.fillRect(cageX - s * 0.012, cageTop - s * 0.02, s * 0.024, s * 0.05);
    },
  };
}

function paintStocks(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // The pillory: village justice the dungeon inherited. A worn
  // platform, two posts, and the split board with its three
  // holes — all standing empty, which is somehow worse. The
  // warrant is still nailed up; nobody can read it now.
  const m = ((h >> 6) & 1) === 0 ? 1 : -1;
  const platTop = baseY - s * 0.12;
  const boardY = platTop - s * 0.84; // the split board's seam
  return {
    sortY: ty + 0.6,
    body: stationBody(0.72, 1.5, 0.4),
    drawShadow: () => rend.castEdgeQuad(p.x - s * 0.4, baseY, p.x + s * 0.4, baseY, 0.95),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.26)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.48, s * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      // Old rot thrown and never cleaned: dark stains fanned in
      // front of the platform.
      ctx.fillStyle = 'rgba(52, 44, 36, 0.4)';
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        facetBlob(
          ctx,
          p.x + (((h >> (k * 5 + 2)) % 100) - 50) / 100 * s * 0.7,
          baseY + syT * (0.18 + ((h >> (k * 3)) % 20) / 100),
          s * 0.055,
          h ^ (k * 77),
          5,
          0.5,
        );
        ctx.fill();
      }
      // The platform: a worn gray-going deck, low and wide —
      // pass 1's tall saturated box read as a podium.
      const deckWood = '#5e4c34';
      ctx.fillStyle = shade(deckWood, -12);
      ctx.fillRect(p.x - s * 0.5, platTop, s * 1.0, s * 0.12);
      ctx.fillStyle = shade(deckWood, 4);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.5, platTop);
      ctx.lineTo(p.x - s * 0.4, platTop - syT * 0.3);
      ctx.lineTo(p.x + s * 0.4, platTop - syT * 0.3);
      ctx.lineTo(p.x + s * 0.5, platTop);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(30, 22, 16, 0.45)';
      ctx.lineWidth = Math.max(1, s * 0.018);
      for (const f of [-0.1, 0.1]) {
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.44, platTop - syT * (0.15 + f));
        ctx.lineTo(p.x + s * 0.44, platTop - syT * (0.15 + f));
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(160, 140, 110, 0.35)';
      ctx.fillRect(p.x - s * 0.5, platTop, s * 1.0, Math.max(1, s * 0.02));
      // The posts rise wide from the deck's back plank.
      const py2 = platTop - syT * 0.2;
      for (const fx of [-0.34, 0.34]) {
        ctx.fillStyle = shade(PALI_LOG, -8);
        ctx.fillRect(p.x + fx * s - s * 0.055, boardY - s * 0.3, s * 0.11, py2 - boardY + s * 0.3);
        ctx.fillStyle = shade(PALI_LOG, 8);
        ctx.fillRect(p.x + fx * s - s * 0.055, boardY - s * 0.3, s * 0.035, py2 - boardY + s * 0.3);
      }
      // The split board: two halves meeting at the seam, three
      // holes straddling it — neck between the wrists. Wide
      // enough to hold a man's reach; nobody mistakes it now.
      ctx.fillStyle = shade(PALI_LOG, -2);
      ctx.fillRect(p.x - s * 0.42, boardY - s * 0.16, s * 0.84, s * 0.32);
      ctx.fillStyle = 'rgba(160, 140, 110, 0.35)';
      ctx.fillRect(p.x - s * 0.42, boardY - s * 0.16, s * 0.84, Math.max(1, s * 0.022));
      ctx.strokeStyle = 'rgba(30, 22, 16, 0.55)';
      ctx.lineWidth = Math.max(1, s * 0.022);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.42, boardY);
      ctx.lineTo(p.x + s * 0.42, boardY);
      ctx.stroke();
      ctx.fillStyle = '#241d18';
      for (const [hx, hr] of [
        [-0.21, 0.048],
        [0, 0.075],
        [0.21, 0.048],
      ] as const) {
        ctx.beginPath();
        ctx.ellipse(p.x + hx * s, boardY, s * hr, s * (hr * 1.15), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Wear-polish around the neck hole: a thousand collars.
      ctx.strokeStyle = 'rgba(180, 158, 122, 0.35)';
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.ellipse(p.x, boardY, s * 0.095, s * 0.11, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Hinge one side, hasp the other — honest iron.
      ctx.fillStyle = DGN_IRON;
      ctx.fillRect(p.x - m * s * 0.41, boardY - s * 0.07, s * 0.055, s * 0.14);
      ctx.fillStyle = DGN_IRON_LIT;
      ctx.fillRect(p.x + m * s * 0.36, boardY - s * 0.045, s * 0.06, s * 0.09);
      // The warrant, nailed to a post: paper gone parchment,
      // one corner curled off the grain.
      const wx = p.x + m * s * 0.34;
      ctx.fillStyle = '#c9bd9e';
      ctx.fillRect(wx - s * 0.045, boardY + s * 0.2, s * 0.09, s * 0.13);
      ctx.fillStyle = '#b0a486';
      ctx.beginPath();
      ctx.moveTo(wx + s * 0.045, boardY + s * 0.28);
      ctx.lineTo(wx + s * 0.045, boardY + s * 0.33);
      ctx.lineTo(wx - s * 0.005, boardY + s * 0.33);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = DGN_RUST_LIT;
      ctx.fillRect(wx - s * 0.008, boardY + s * 0.208, s * 0.016, s * 0.016);
      ctx.strokeStyle = 'rgba(70, 60, 48, 0.6)';
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (const ly of [0.24, 0.27, 0.3]) {
        ctx.beginPath();
        ctx.moveTo(wx - s * 0.03, boardY + s * ly);
        ctx.lineTo(wx + s * 0.028, boardY + s * ly);
        ctx.stroke();
      }
    },
  };
}

function paintTimberBrace(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, game, tile, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  // THE WALL FIXTURES, second rank — same law as the sconce and
  // the chains: the prop owns a FLOOR cell, its art lives on the
  // wall face NORTH of it, and with no honest wall behind each
  // piece falls back to a form that stands alone.
  const wn = game.world.groundAt(tx, ty - 1);
  const walled =
    wn === Tile.CaveWall ||
    wn === Tile.CrackedCaveWall ||
    wn === Tile.WallStone ||
    wn === Tile.WallGarrison ||
    wn === Tile.WallWood;
  const wallBase = p.y - syT * 0.5;
  const fixSort = ty + 0.3;

  if (tile === Tile.TimberBrace) {
    // The miners' frame: two squared posts and a cap beam wedged
    // under the roof, bowed a hair where the mountain leans on
    // it. It reads as load-bearing because it IS load-bearing —
    // the one piece of carpentry down here nobody dares strike.
    // Pass 1 read a bare goalpost: the frame now carries WEIGHT —
    // heavy timbers leaning into the load, stone footings, a
    // diagonal sway-brace, and the feet planted in the cell.
    const footY = wallBase + syT * 0.42;
    const capY = wallBase - s * 1.46;
    return {
      sortY: fixSort,
      body: stationBody(0.68, 1.95, 0.4),
      draw: () => {
        // Draw-time ctx capture: the outline pass swaps rend.ctx
        // to its scratch — the build-time capture would paint past it.
        const ctx = rend.ctx;
        ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
        for (const fx of [-0.4, 0.4]) {
          ctx.beginPath();
          ctx.ellipse(p.x + fx * s, footY + s * 0.02, s * 0.15, s * 0.06, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Sifted rock dust streaks the wall under the cap — the
        // frame is earning its keep.
        ctx.fillStyle = 'rgba(150, 145, 158, 0.18)';
        for (const fx of [-0.24, 0.08, 0.3]) {
          ctx.fillRect(p.x + fx * s, capY + s * 0.16, s * 0.035, s * 0.55);
        }
        // Stone footings: the frame stands on pads, not dirt.
        for (const fx of [-0.4, 0.4]) {
          ctx.fillStyle = DGN_STONE_DARK;
          ctx.fillRect(p.x + fx * s - s * 0.11, footY - s * 0.09, s * 0.22, s * 0.09);
          ctx.fillStyle = 'rgba(160, 155, 173, 0.4)';
          ctx.fillRect(p.x + fx * s - s * 0.11, footY - s * 0.09, s * 0.22, Math.max(1, s * 0.018));
        }
        // The diagonal sway-brace ties the frame square — nailed
        // across both posts, the carpenter's signature.
        ctx.strokeStyle = shade(PALI_LOG, -14);
        ctx.lineWidth = Math.max(2, s * 0.065);
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.38, capY + s * 0.34);
        ctx.lineTo(p.x + s * 0.38, footY - s * 0.32);
        ctx.stroke();
        // The posts: heavy squared timber leaning INTO the load
        // (a hair of A-frame), checked with age.
        for (const fx of [-0.4, 0.4]) {
          const bx2 = p.x + fx * s;
          const tx2 = p.x + fx * s * 0.88;
          ctx.fillStyle = shade(PALI_LOG, -8);
          ctx.beginPath();
          ctx.moveTo(bx2 - s * 0.085, footY - s * 0.06);
          ctx.lineTo(tx2 - s * 0.08, capY + s * 0.04);
          ctx.lineTo(tx2 + s * 0.08, capY + s * 0.04);
          ctx.lineTo(bx2 + s * 0.085, footY - s * 0.06);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(PALI_LOG, 8);
          ctx.beginPath();
          ctx.moveTo(bx2 - s * 0.085, footY - s * 0.06);
          ctx.lineTo(tx2 - s * 0.08, capY + s * 0.04);
          ctx.lineTo(tx2 - s * 0.028, capY + s * 0.04);
          ctx.lineTo(bx2 - s * 0.033, footY - s * 0.06);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(30, 22, 16, 0.5)';
          for (const dy of [0.5, 0.95]) {
            ctx.fillRect(bx2 - s * 0.06, footY - s * dy, s * 0.1, Math.max(1, s * 0.02));
          }
        }
        // The cap beam bows DOWN a hair mid-span: the load made
        // visible. Lit top arris, deep checked underside.
        ctx.fillStyle = shade(PALI_LOG, -4);
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.54, capY - s * 0.02);
        ctx.quadraticCurveTo(p.x, capY + s * 0.05, p.x + s * 0.54, capY - s * 0.02);
        ctx.lineTo(p.x + s * 0.54, capY + s * 0.15);
        ctx.quadraticCurveTo(p.x, capY + s * 0.22, p.x - s * 0.54, capY + s * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(160, 140, 110, 0.45)';
        ctx.lineWidth = Math.max(1, s * 0.024);
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.54, capY - s * 0.005);
        ctx.quadraticCurveTo(p.x, capY + s * 0.06, p.x + s * 0.54, capY - s * 0.005);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(30, 22, 16, 0.5)';
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.4, capY + s * 0.1);
        ctx.quadraticCurveTo(p.x, capY + s * 0.16, p.x + s * 0.4, capY + s * 0.1);
        ctx.stroke();
        // The wedge pairs driven between post and cap — the
        // miners' signature, and the first thing checked on
        // every shift that ever walked this drift.
        ctx.fillStyle = shade(PALI_LOG, 20);
        for (const fx of [-0.35, 0.35]) {
          ctx.beginPath();
          ctx.moveTo(p.x + fx * s - s * 0.1, capY + s * 0.2);
          ctx.lineTo(p.x + fx * s + s * 0.1, capY + s * 0.2);
          ctx.lineTo(p.x + fx * s + s * 0.06, capY + s * 0.28);
          ctx.lineTo(p.x + fx * s - s * 0.06, capY + s * 0.28);
          ctx.closePath();
          ctx.fill();
        }
        // A coil of rope on a peg — somebody meant to come back.
        if (((h >> 9) & 1) === 0) {
          ctx.strokeStyle = '#8a7355';
          ctx.lineWidth = Math.max(1, s * 0.028);
          ctx.beginPath();
          ctx.ellipse(p.x - s * 0.37, footY - s * 0.66, s * 0.06, s * 0.075, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      },
    };
  }

  if (tile === Tile.WallFossil) {
    // Something older than the kingdom: a rank of enormous ribs
    // half-proud of the rock, crusted where the mountain is
    // taking them back. Nobody carved rend. Nobody could.
    const m = ((h >> 5) & 1) === 0 ? 1 : -1;
    if (walled) {
      const spX = p.x - m * s * 0.34;
      const spY = wallBase - s * 1.28;
      return {
        sortY: fixSort,
        body: stationBody(0.75, 1.9, 0.2),
        draw: () => {
          // Draw-time ctx capture: the outline pass swaps rend.ctx
          // to its scratch — the build-time capture would paint past it.
          const ctx = rend.ctx;
          // The recess shadow behind the rank sinks the bones
          // INTO the face instead of pasting them onto it.
          ctx.fillStyle = 'rgba(14, 10, 22, 0.32)';
          ctx.beginPath();
          facetBlob(ctx, p.x + m * s * 0.05, wallBase - s * 0.75, s * 0.52, h ^ 0x4d, 7, 0.62);
          ctx.fill();
          // The spine end: a stack of vertebra discs where the
          // rank roots into the rock.
          for (let k = 0; k < 3; k++) {
            ctx.fillStyle = k === 1 ? DGN_BONE : DGN_BONE_DIM;
            ctx.beginPath();
            ctx.ellipse(spX - m * s * 0.02 * k, spY + s * 0.13 * k, s * (0.09 - k * 0.012), s * 0.055, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          // Four ribs, arcing down-and-away, each shorter than
          // the last — the rest of the animal is still in there.
          // Pass 1 read thin painted marks: the ribs run THICK
          // now, bone that argues with the rock.
          for (let k = 0; k < 4; k++) {
            const rx = spX + m * s * (0.16 + k * 0.19);
            const ln = s * (1.05 - k * 0.18);
            ctx.strokeStyle = DGN_BONE_DIM;
            ctx.lineWidth = Math.max(2.5, s * (0.088 - k * 0.008));
            ctx.beginPath();
            ctx.moveTo(rx, spY + s * 0.05 + k * s * 0.04);
            ctx.quadraticCurveTo(
              rx + m * s * 0.16,
              spY + ln * 0.5,
              rx + m * s * 0.05,
              spY + ln,
            );
            ctx.stroke();
            ctx.strokeStyle = DGN_BONE;
            ctx.lineWidth = Math.max(1.5, s * 0.032);
            ctx.beginPath();
            ctx.moveTo(rx - m * s * 0.02, spY + s * 0.08 + k * s * 0.04);
            ctx.quadraticCurveTo(
              rx + m * s * 0.14,
              spY + ln * 0.48,
              rx + m * s * 0.03,
              spY + ln * 0.92,
            );
            ctx.stroke();
            // Each rib ends in a broken knuckle, not a taper.
            ctx.fillStyle = DGN_BONE;
            ctx.beginPath();
            ctx.ellipse(rx + m * s * 0.05, spY + ln, s * 0.038, s * 0.028, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          // Mineral crust laps over the mid-ribs: the mountain
          // reclaiming its tenants, one century at a time.
          ctx.fillStyle = 'rgba(69, 63, 82, 0.7)';
          ctx.beginPath();
          facetBlob(ctx, spX + m * s * 0.38, spY + s * 0.42, s * 0.16, h ^ 0x71, 6, 0.7);
          ctx.fill();
          ctx.beginPath();
          facetBlob(ctx, spX + m * s * 0.68, spY + s * 0.3, s * 0.12, h ^ 0x2b, 5, 0.7);
          ctx.fill();
        },
      };
    }
    // Fallback in the open: the same ribs erupt from the floor —
    // a beached cage of them, arching over a buried spine.
    return {
      sortY: ty + 0.55,
      body: stationBody(0.8, 1.4, 0.4),
      draw: () => {
        // Draw-time ctx capture: the outline pass swaps rend.ctx
        // to its scratch — the build-time capture would paint past it.
        const ctx = rend.ctx;
        const gy = p.y + syT * 0.15;
        ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
        ctx.beginPath();
        ctx.ellipse(p.x, gy + s * 0.02, s * 0.5, s * 0.13, 0, 0, Math.PI * 2);
        ctx.fill();
        // The buried spine: a low bone ridge the ribs spring
        // from — pass 1's rootless arcs read as pale grass.
        ctx.fillStyle = DGN_BONE_DIM;
        ctx.beginPath();
        facetBlob(ctx, p.x - m * s * 0.3, gy - s * 0.02, s * 0.16, h ^ 0x1f, 6, 0.4);
        ctx.fill();
        for (let k = 3; k >= 0; k--) {
          const off = (k - 1.5) * syT * 0.24;
          const sc = 1 - Math.abs(k - 1.5) * 0.14;
          // Contact shadow where each rib leaves the ground.
          ctx.fillStyle = 'rgba(12, 8, 20, 0.3)';
          ctx.beginPath();
          ctx.ellipse(p.x - m * s * 0.42 * sc, gy + off + s * 0.02, s * 0.07, s * 0.032, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = k === 1 || k === 2 ? DGN_BONE : DGN_BONE_DIM;
          ctx.lineWidth = Math.max(2.5, s * 0.085 * sc);
          ctx.beginPath();
          ctx.moveTo(p.x - m * s * 0.42 * sc, gy + off);
          ctx.quadraticCurveTo(p.x - m * s * 0.1, gy + off - s * 1.0 * sc, p.x + m * s * 0.3 * sc, gy + off - s * 0.24);
          ctx.stroke();
          // The broken knuckle at the free end.
          ctx.fillStyle = DGN_BONE;
          ctx.beginPath();
          ctx.ellipse(p.x + m * s * 0.3 * sc, gy + off - s * 0.24, s * 0.04, s * 0.03, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = DGN_BONE_DIM;
        ctx.beginPath();
        ctx.ellipse(p.x - m * s * 0.4, gy + s * 0.02, s * 0.11, s * 0.055, 0, 0, Math.PI * 2);
        ctx.fill();
      },
    };
  }

  // Tile.WallWeb — the patient tenant's work: sheet webs draped
  // down the stone, mended nightly by something nobody has seen.
  const post = (px2: number, ht2: number): void => {
    const ctx = rend.ctx;
    ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
    ctx.beginPath();
    ctx.ellipse(px2, wallBase + s * 0.02, s * 0.11, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(PALI_LOG, -6);
    ctx.fillRect(px2 - s * 0.05, wallBase - ht2, s * 0.1, ht2);
    ctx.fillStyle = shade(PALI_LOG, 10);
    ctx.fillRect(px2 - s * 0.05, wallBase - ht2, s * 0.032, ht2);
  };
  return {
    sortY: fixSort,
    body: stationBody(0.6, 1.9, 0.2),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      if (!walled) post(p.x - s * 0.32, s * 1.5);
      // The drape breathes on a slow swell — the only air down
      // here is the mountain's own.
      const sw = Math.sin(t * 0.5 + h * 0.4) * s * 0.024;
      const aX = p.x - s * 0.42;
      const aY = wallBase - s * 1.48;
      const bX = p.x + s * 0.36;
      const bY = wallBase - s * 1.16;
      const dX = p.x + s * 0.02 + sw;
      const dY = wallBase - s * 0.32;
      // The main sheet: a translucent fall from two anchors to
      // the drape point, then its strands over the top. Pass 1
      // read wireframe scratches on the dark stone — the sheet
      // now carries real BODY: a doubled fill, a bright drape
      // heart, heavy sagging strands, and dew.
      ctx.fillStyle = 'rgba(216, 214, 228, 0.2)';
      ctx.beginPath();
      ctx.moveTo(aX, aY);
      ctx.quadraticCurveTo(p.x - s * 0.1, wallBase - s * 1.5, bX, bY);
      ctx.quadraticCurveTo(bX - s * 0.06, dY - s * 0.3, dX, dY);
      ctx.quadraticCurveTo(aX + s * 0.1, aY + s * 0.62, aX, aY);
      ctx.closePath();
      ctx.fill();
      // The dense heart where the drape gathers.
      ctx.fillStyle = 'rgba(228, 226, 238, 0.16)';
      ctx.beginPath();
      ctx.moveTo(aX + s * 0.18, aY + s * 0.22);
      ctx.quadraticCurveTo(p.x, wallBase - s * 1.1, bX - s * 0.08, bY + s * 0.16);
      ctx.quadraticCurveTo(bX - s * 0.1, dY - s * 0.2, dX, dY);
      ctx.quadraticCurveTo(aX + s * 0.16, aY + s * 0.6, aX + s * 0.18, aY + s * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(232, 230, 242, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.02);
      for (const [ex, ey] of [
        [aX, aY],
        [aX + s * 0.2, aY - s * 0.04],
        [p.x - s * 0.04, wallBase - s * 1.44],
        [bX - s * 0.14, bY - s * 0.12],
        [bX, bY],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(dX, dY);
        ctx.quadraticCurveTo((dX + ex) / 2 + s * 0.05, (dY + ey) / 2 + s * 0.08, ex, ey);
        ctx.stroke();
      }
      for (const f of [0.3, 0.55, 0.78]) {
        ctx.beginPath();
        ctx.moveTo(aX + (dX - aX) * f, aY + (dY - aY) * f);
        ctx.quadraticCurveTo(
          p.x - s * 0.02,
          aY + (dY - aY) * f + s * 0.16,
          bX + (dX - bX) * f,
          bY + (dY - bY) * f,
        );
        ctx.stroke();
      }
      // Dew beads where the strands cross — the web's glint.
      ctx.fillStyle = 'rgba(240, 240, 250, 0.55)';
      for (const [gx2, gy2] of [
        [aX + s * 0.3, aY + s * 0.34],
        [p.x + s * 0.06, wallBase - s * 0.86],
        [bX - s * 0.1, bY + s * 0.3],
      ] as const) {
        ctx.fillRect(gx2 - s * 0.013, gy2 - s * 0.013, s * 0.026, s * 0.026);
      }
      // A second, smaller sheet lower in the corner.
      ctx.fillStyle = 'rgba(216, 214, 228, 0.16)';
      ctx.beginPath();
      ctx.moveTo(bX + s * 0.04, wallBase - s * 0.7);
      ctx.quadraticCurveTo(bX - s * 0.14, wallBase - s * 0.42, bX - s * 0.24, wallBase - s * 0.08);
      ctx.lineTo(bX + s * 0.04, wallBase - s * 0.05);
      ctx.closePath();
      ctx.fill();
      // Anchor threads run to the floor: the web owns the cell.
      ctx.strokeStyle = 'rgba(228, 226, 238, 0.3)';
      ctx.beginPath();
      ctx.moveTo(dX, dY);
      ctx.lineTo(p.x - s * 0.18, p.y + syT * 0.16);
      ctx.moveTo(dX, dY);
      ctx.lineTo(p.x + s * 0.26, p.y + syT * 0.08);
      ctx.stroke();
      // Something wrapped, hanging from the drape — the size of
      // a rabbit. Best not to ask.
      if (((h >> 7) & 3) !== 0) {
        const cx2 = dX + sw * 1.6;
        const cy2 = dY + s * 0.2;
        ctx.strokeStyle = 'rgba(228, 226, 238, 0.4)';
        ctx.beginPath();
        ctx.moveTo(dX, dY);
        ctx.lineTo(cx2, cy2 - s * 0.07);
        ctx.stroke();
        ctx.fillStyle = '#b9b6c4';
        ctx.beginPath();
        ctx.ellipse(cx2, cy2, s * 0.05, s * 0.075, sw * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(150, 147, 162, 0.6)';
        ctx.lineWidth = Math.max(1, s * 0.012);
        for (const wy of [-0.03, 0.01, 0.045]) {
          ctx.beginPath();
          ctx.moveTo(cx2 - s * 0.048, cy2 + s * wy);
          ctx.lineTo(cx2 + s * 0.048, cy2 + s * wy * 0.7);
          ctx.stroke();
        }
      }
    },
  };
}

function paintDripPool(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  // A still mineral pool: the mountain's slowest clock. Pale
  // deposit rings where centuries of beads landed, water the
  // color of a held breath, and every few seconds — one drip.
  const cy = p.y + syT * 0.05;
  return {
    sortY: ty - 0.42,
    body: stationBody(0.55, 0.5, 0.45),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // The deposit apron, then its brighter rim — pass 1 read
      // a manhole: the pale mineral collar now steps a full
      // value off the flagstone (the kit's value law) and the
      // water goes cold BLUE, never floor-dark.
      ctx.fillStyle = 'rgba(138, 135, 120, 0.55)';
      ctx.beginPath();
      ctx.ellipse(p.x, cy, s * 0.47, syT * 0.47, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(168, 165, 150, 0.85)';
      ctx.lineWidth = Math.max(1.5, s * 0.035);
      ctx.beginPath();
      ctx.ellipse(p.x, cy, s * 0.4, syT * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      // The water: cold blue-dark, deepening at the heart.
      ctx.fillStyle = '#28304a';
      ctx.beginPath();
      ctx.ellipse(p.x, cy, s * 0.35, syT * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1b2136';
      ctx.beginPath();
      ctx.ellipse(p.x + s * 0.04, cy + syT * 0.04, s * 0.22, syT * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      // The wet sheen on the near rim — light catching the lip.
      ctx.strokeStyle = 'rgba(190, 205, 230, 0.25)';
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.ellipse(p.x, cy, s * 0.35, syT * 0.35, 0, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      // One cold reflection: whatever light there is, held still.
      ctx.fillStyle = 'rgba(150, 170, 200, 0.22)';
      ctx.fillRect(p.x - s * 0.16, cy - syT * 0.12, s * 0.04, syT * 0.22);
      ctx.fillStyle = 'rgba(190, 205, 230, 0.45)';
      ctx.fillRect(p.x - s * 0.155, cy - syT * 0.1, s * 0.02, syT * 0.06);
      // Two beads on offset clocks: ripple ring, then stillness.
      for (let k = 0; k < 2; k++) {
        const ph = (t * 0.32 + k * 0.47 + (h % 97) * 0.01) % 1;
        if (ph < 0.55) {
          const f = ph / 0.55;
          const dx = p.x + (k === 0 ? -s * 0.08 : s * 0.12);
          const dy = cy + (k === 0 ? syT * 0.08 : -syT * 0.06);
          ctx.strokeStyle = `rgba(170, 185, 210, ${(1 - f) * 0.4})`;
          ctx.lineWidth = Math.max(1, s * 0.016);
          ctx.beginPath();
          ctx.ellipse(dx, dy, s * 0.26 * f + s * 0.02, (syT * 0.26 * f + syT * 0.02), 0, 0, Math.PI * 2);
          ctx.stroke();
          if (f < 0.18) {
            ctx.fillStyle = 'rgba(210, 220, 240, 0.55)';
            ctx.fillRect(dx - s * 0.012, dy - s * 0.012, s * 0.024, s * 0.024);
          }
        }
      }
      // Two wet stones keep the rim company.
      ctx.fillStyle = DGN_STONE_DARK;
      ctx.beginPath();
      facetCircle(ctx, p.x + s * 0.36, cy + syT * 0.18, s * 0.05, 5, 0.4, 0.8);
      ctx.fill();
      ctx.fillStyle = DGN_STONE;
      ctx.beginPath();
      facetCircle(ctx, p.x - s * 0.34, cy - syT * 0.2, s * 0.04, 5, 1.1, 0.8);
      ctx.fill();
    },
  };
}

function paintColdCamp(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  // A delver's camp with nobody in it: cold ash in a ring of
  // scorched stones, a bedroll still laid out, a pack still
  // packed. They meant to come back. The kit's quietest story —
  // deliberately no flame, no light, no motion at all.
  const m = ((h >> 3) & 1) === 0 ? 1 : -1;
  const fx2 = p.x - m * s * 0.14;
  const fy2 = p.y + syT * 0.06;
  return {
    sortY: ty + 0.45,
    body: stationBody(0.8, 0.85, 0.5),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // The bedroll: laid out east-west (a coffin lies — and so
      // does a sleeper), wool with a blanket band, the head end
      // still dented.
      const bx = p.x + m * s * 0.34;
      const by = p.y - syT * 0.22;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.2)';
      ctx.beginPath();
      ctx.ellipse(bx, by + syT * 0.1, s * 0.32, syT * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a6a58';
      ctx.beginPath();
      chamferRect(ctx, bx, by, s * 0.62, syT * 0.3, s * 0.06);
      ctx.fill();
      ctx.fillStyle = '#5d4f42';
      ctx.fillRect(bx - s * 0.31 + s * 0.16, by - syT * 0.15, s * 0.32, syT * 0.3);
      ctx.fillStyle = '#8d7c66';
      ctx.beginPath();
      ctx.ellipse(bx - m * s * 0.2, by - syT * 0.02, s * 0.085, syT * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(50, 42, 34, 0.4)';
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.02, by - syT * 0.14);
      ctx.lineTo(bx + s * 0.04, by + syT * 0.13);
      ctx.stroke();
      // The fire ring: scorched stones around a heart of cold
      // ash — pale dust crown on a black bed, two charred stubs.
      // Pass 1's pebbles vanished at map scale: the ring reads
      // as a RING now, big scorched stones and a pale heart.
      ctx.fillStyle = 'rgba(20, 16, 24, 0.55)';
      ctx.beginPath();
      ctx.ellipse(fx2, fy2, s * 0.24, syT * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + (h % 10) * 0.1;
        ctx.fillStyle = (k & 1) === 0 ? '#413b46' : '#4c4652';
        ctx.beginPath();
        facetCircle(ctx, fx2 + Math.cos(a) * s * 0.24, fy2 + Math.sin(a) * syT * 0.24, s * 0.062, 5, a, 0.8);
        ctx.fill();
        ctx.fillStyle = 'rgba(160, 155, 168, 0.3)';
        ctx.beginPath();
        facetCircle(ctx, fx2 + Math.cos(a) * s * 0.24 - s * 0.012, fy2 + Math.sin(a) * syT * 0.24 - s * 0.015, s * 0.026, 4, a + 1, 0.8);
        ctx.fill();
      }
      ctx.fillStyle = '#57525a';
      ctx.beginPath();
      facetBlob(ctx, fx2, fy2, s * 0.14, h ^ 0x19, 6, 0.6);
      ctx.fill();
      ctx.fillStyle = '#767077';
      ctx.beginPath();
      facetBlob(ctx, fx2 - s * 0.02, fy2 - syT * 0.03, s * 0.085, h ^ 0x52, 5, 0.6);
      ctx.fill();
      ctx.fillStyle = '#2b2530';
      ctx.fillRect(fx2 - s * 0.15, fy2 - syT * 0.02, s * 0.19, s * 0.032);
      ctx.fillRect(fx2 - s * 0.02, fy2 - syT * 0.1, s * 0.034, s * 0.15);
      // The pack: still buckled, flap thrown, one strap loose —
      // and the tin cup where it landed.
      const kx = p.x - m * s * 0.42;
      const ky = p.y - syT * 0.16;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(kx, ky + s * 0.1, s * 0.14, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6a5a44';
      ctx.beginPath();
      ctx.moveTo(kx - s * 0.13, ky + s * 0.1);
      ctx.quadraticCurveTo(kx - s * 0.14, ky - s * 0.16, kx, ky - s * 0.19);
      ctx.quadraticCurveTo(kx + s * 0.14, ky - s * 0.16, kx + s * 0.13, ky + s * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4e4232';
      ctx.beginPath();
      ctx.moveTo(kx - s * 0.09, ky - s * 0.14);
      ctx.lineTo(kx + s * 0.09, ky - s * 0.14);
      ctx.lineTo(kx + s * 0.05, ky - s * 0.02);
      ctx.lineTo(kx - s * 0.05, ky - s * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#84684a';
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(kx + s * 0.1, ky - s * 0.06);
      ctx.quadraticCurveTo(kx + s * 0.17, ky + s * 0.02, kx + s * 0.13, ky + s * 0.09);
      ctx.stroke();
      ctx.fillStyle = '#9a97a4';
      ctx.beginPath();
      ctx.ellipse(kx + m * s * 0.2, ky + s * 0.08, s * 0.04, s * 0.028, 0.3, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintLootedChest(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  // Somebody got here first. The lid is torn clean off and lies
  // where it was thrown; the hinges point at the ceiling; the
  // inside holds splinters, dust, and the one coin they missed.
  const m = ((h >> 5) & 1) === 0 ? 1 : -1;
  const baseY = p.y + syT * 0.16;
  const bw = s * 0.4; // half-width of the box
  const bh = s * 0.26; // front face height
  return {
    sortY: ty + 0.5,
    body: stationBody(0.72, 1.0, 0.5),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.26)';
      ctx.beginPath();
      ctx.ellipse(p.x - m * s * 0.1, baseY + s * 0.02, s * 0.44, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      // Drag scuffs from box to lid: the story in two arcs.
      ctx.strokeStyle = 'rgba(30, 24, 20, 0.3)';
      ctx.lineWidth = Math.max(1, s * 0.025);
      for (const dy of [0, 0.07]) {
        ctx.beginPath();
        ctx.moveTo(p.x + m * s * 0.1, baseY - s * 0.02 + s * dy);
        ctx.quadraticCurveTo(p.x + m * s * 0.4, baseY + s * 0.04 + s * dy, p.x + m * s * 0.6, baseY + s * 0.1 + s * dy);
        ctx.stroke();
      }
      // The thrown lid, face-down past the box: an arched slab
      // with its strap still riveted on.
      const lx = p.x + m * s * 0.58;
      const ly = baseY + s * 0.06;
      ctx.fillStyle = '#5d4732';
      ctx.beginPath();
      ctx.moveTo(lx - s * 0.22, ly);
      ctx.quadraticCurveTo(lx - m * s * 0.04, ly - s * 0.13, lx + s * 0.2, ly - s * 0.04);
      ctx.lineTo(lx + s * 0.22, ly + s * 0.07);
      ctx.lineTo(lx - s * 0.2, ly + s * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = DGN_IRON;
      ctx.fillRect(lx - s * 0.04, ly - s * 0.1, s * 0.07, s * 0.19);
      ctx.fillStyle = DGN_RUST_LIT;
      ctx.fillRect(lx - s * 0.025, ly - s * 0.07, s * 0.02, s * 0.02);
      // The box: wood body, iron corner straps, and the OPEN top
      // — rim, then the dark of an emptied inside.
      const topY = baseY - bh;
      ctx.fillStyle = '#6a5138';
      ctx.fillRect(p.x - m * s * 0.1 - bw, topY, bw * 2, bh);
      ctx.fillStyle = 'rgba(30, 22, 16, 0.4)';
      ctx.fillRect(p.x - m * s * 0.1 - bw, topY + bh * 0.55, bw * 2, Math.max(1, s * 0.02));
      ctx.fillStyle = '#7d6244';
      ctx.beginPath();
      ctx.moveTo(p.x - m * s * 0.1 - bw, topY);
      ctx.lineTo(p.x - m * s * 0.1 - bw + s * 0.07, topY - syT * 0.24);
      ctx.lineTo(p.x - m * s * 0.1 + bw - s * 0.07, topY - syT * 0.24);
      ctx.lineTo(p.x - m * s * 0.1 + bw, topY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#241d18';
      ctx.beginPath();
      ctx.moveTo(p.x - m * s * 0.1 - bw + s * 0.06, topY - s * 0.005);
      ctx.lineTo(p.x - m * s * 0.1 - bw + s * 0.115, topY - syT * 0.2);
      ctx.lineTo(p.x - m * s * 0.1 + bw - s * 0.115, topY - syT * 0.2);
      ctx.lineTo(p.x - m * s * 0.1 + bw - s * 0.06, topY - s * 0.005);
      ctx.closePath();
      ctx.fill();
      // The coin they missed, and the glint that gives it away.
      const cx2 = p.x - m * s * 0.1 + m * bw * 0.55;
      const cy2 = topY - syT * 0.08;
      ctx.fillStyle = '#e8c26a';
      ctx.beginPath();
      ctx.ellipse(cx2, cy2, s * 0.032, s * 0.02, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 240, 190, 0.8)';
      ctx.fillRect(cx2 - s * 0.006, cy2 - s * 0.03, s * 0.012, s * 0.06);
      ctx.fillRect(cx2 - s * 0.03, cy2 - s * 0.006, s * 0.06, s * 0.012);
      // Iron corner straps; the wrenched hinges point UP off the
      // back rim — the violence of the opening, kept.
      ctx.fillStyle = DGN_IRON;
      for (const fx of [-1, 1]) {
        ctx.fillRect(p.x - m * s * 0.1 + fx * bw - (fx > 0 ? s * 0.06 : 0), topY, s * 0.06, bh);
      }
      ctx.fillStyle = DGN_IRON_LIT;
      for (const fx of [-0.35, 0.35]) {
        ctx.save();
        ctx.translate(p.x - m * s * 0.1 + fx * bw, topY - syT * 0.22);
        ctx.rotate(fx * m * 0.5);
        ctx.fillRect(-s * 0.018, -s * 0.09, s * 0.036, s * 0.09);
        ctx.restore();
      }
      // Splinters where the pry-bar won.
      rend.rubble(p.x - m * s * 0.1, baseY - s * 0.1, s * 0.8, h ^ 0x5e, ['#a58258', '#7d6244', '#5d4732']);
    },
  };
}

function paintCandleShrine(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  // Grave-candles on a ledger stone: wax generations deep, the
  // runnels frozen mid-fall over the slab's edge. Two or three
  // still burn — someone still comes down here, and recently.
  // The kept-flame heart of the kit: the one prop that says the
  // dark is TENDED.
  const baseY = p.y + syT * 0.14;
  const slabTop = baseY - s * 0.2;
  const lit = (h >> 2) % 3; // which arrangement burns tonight
  return {
    sortY: ty + 0.5,
    body: stationBody(0.62, 1.05, 0.45),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      const flick = 0.86 + Math.sin(t * 9 + h) * 0.08 + Math.sin(t * 17 + h * 0.4) * 0.06;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.4, s * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      // The firelight lap on the floor is a WHISPER — the live
      // light pass throws the real pool (the sconce's lesson).
      ctx.fillStyle = `rgba(232, 160, 70, ${0.04 * flick})`;
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + syT * 0.08, s * 0.55, s * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      // The ledger stone: front face, lit top, a worn line of
      // lettering nobody living can read.
      ctx.fillStyle = DGN_STONE_DARK;
      ctx.fillRect(p.x - s * 0.34, slabTop, s * 0.68, s * 0.2);
      ctx.fillStyle = DGN_STONE;
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.34, slabTop);
      ctx.lineTo(p.x - s * 0.28, slabTop - syT * 0.22);
      ctx.lineTo(p.x + s * 0.28, slabTop - syT * 0.22);
      ctx.lineTo(p.x + s * 0.34, slabTop);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(160, 155, 173, 0.5)';
      ctx.fillRect(p.x - s * 0.34, slabTop, s * 0.68, Math.max(1, s * 0.02));
      ctx.fillStyle = 'rgba(24, 18, 30, 0.5)';
      for (const fx of [-0.22, -0.08, 0.06, 0.18]) {
        ctx.fillRect(p.x + fx * s, slabTop + s * 0.08, s * 0.07, Math.max(1, s * 0.02));
      }
      // The candles: a family of stubs, tall to spent, wax
      // pooled and run over the front edge in frozen falls.
      const cands = [
        { x: -0.22, ht: 0.3, on: lit !== 0 },
        { x: -0.09, ht: 0.16, on: lit === 0 },
        { x: 0.02, ht: 0.38, on: true },
        { x: 0.13, ht: 0.1, on: false },
        { x: 0.24, ht: 0.22, on: lit === 1 },
      ];
      ctx.fillStyle = '#e6dcc0';
      ctx.beginPath();
      facetBlob(ctx, p.x + s * 0.02, slabTop - syT * 0.12, s * 0.16, h ^ 0x44, 6, 0.42);
      ctx.fill();
      for (const [rx, rh] of [
        [-0.16, 0.14],
        [0.09, 0.2],
      ] as const) {
        ctx.fillStyle = '#d8cba8';
        ctx.fillRect(p.x + rx * s - s * 0.02, slabTop - s * 0.01, s * 0.04, s * rh);
        ctx.fillStyle = '#e6dcc0';
        ctx.beginPath();
        ctx.ellipse(p.x + rx * s, slabTop + s * (rh - 0.01), s * 0.028, s * 0.02, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const c of cands) {
        const cx2 = p.x + c.x * s;
        const topY2 = slabTop - syT * 0.12 - s * c.ht;
        ctx.fillStyle = '#d8cba8';
        ctx.fillRect(cx2 - s * 0.032, topY2, s * 0.064, s * c.ht);
        ctx.fillStyle = '#efe6cf';
        ctx.fillRect(cx2 - s * 0.032, topY2, s * 0.022, s * c.ht);
        ctx.fillStyle = '#c9bd9e';
        ctx.beginPath();
        ctx.ellipse(cx2, topY2, s * 0.032, s * 0.014, 0, 0, Math.PI * 2);
        ctx.fill();
        if (c.on) {
          // The flame and its private halo.
          ctx.fillStyle = `rgba(255, 200, 120, ${0.12 * flick})`;
          ctx.beginPath();
          ctx.ellipse(cx2, topY2 - s * 0.07, s * 0.09, s * 0.11, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#e8823d';
          ctx.beginPath();
          ctx.moveTo(cx2 - s * 0.024 * flick, topY2);
          ctx.quadraticCurveTo(cx2 - s * 0.02, topY2 - s * 0.08 * flick, cx2 + s * 0.004, topY2 - s * 0.11 * flick);
          ctx.quadraticCurveTo(cx2 + s * 0.026, topY2 - s * 0.05, cx2 + s * 0.024 * flick, topY2);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#f2c94c';
          ctx.beginPath();
          ctx.ellipse(cx2, topY2 - s * 0.035, s * 0.012, s * 0.028 * flick, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#241d18';
          ctx.fillRect(cx2 - s * 0.006, topY2 - s * 0.022, s * 0.012, s * 0.022);
        }
      }
      // Offerings at the slab's foot: two river pebbles and a
      // dried sprig — someone's whole eulogy.
      ctx.fillStyle = '#9a97a4';
      ctx.beginPath();
      facetCircle(ctx, p.x - s * 0.3, baseY - s * 0.03, s * 0.03, 5, 0.5, 0.8);
      ctx.fill();
      ctx.beginPath();
      facetCircle(ctx, p.x - s * 0.24, baseY - s * 0.015, s * 0.024, 5, 1.3, 0.8);
      ctx.fill();
      ctx.strokeStyle = '#7d6a4a';
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.moveTo(p.x + s * 0.28, baseY - s * 0.02);
      ctx.quadraticCurveTo(p.x + s * 0.34, baseY - s * 0.09, p.x + s * 0.4, baseY - s * 0.11);
      ctx.stroke();
    },
  };
}

function paintIronGrate(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  // A grate over black depth. The bars are honest garrison iron;
  // what's under them is nobody's business. The air below is
  // colder than the air above, and you can watch it rise.
  const cy = p.y + syT * 0.02;
  const hw = s * 0.38;
  const hd = syT * 0.38;
  const bent = ((h >> 8) & 3) === 0; // one bar pried, once
  return {
    sortY: ty - 0.42,
    body: stationBody(0.55, 0.6, 0.5),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // The depth first: a hole in the world.
      ctx.fillStyle = '#0b0a12';
      ctx.fillRect(p.x - hw, cy - hd, hw * 2, hd * 2);
      // The under-bars run away from the eye, faint in the dark.
      ctx.fillStyle = 'rgba(93, 86, 112, 0.45)';
      for (const fx of [-0.36, 0, 0.36]) {
        ctx.fillRect(p.x + fx * hw - s * 0.016, cy - hd, s * 0.032, hd * 2);
      }
      // The main bars face the camera: three flat iron strips
      // with lit top edges — and one of them pried and bent
      // down into the dark, if this grate has a story.
      for (const [fy3, k] of [
        [-0.5, 0],
        [0, 1],
        [0.5, 2],
      ] as const) {
        const by2 = cy + fy3 * hd * 1.1;
        if (bent && k === 1) {
          ctx.fillStyle = DGN_IRON;
          ctx.fillRect(p.x - hw, by2 - s * 0.026, hw * 0.75, s * 0.052);
          ctx.fillStyle = DGN_IRON_LIT;
          ctx.fillRect(p.x - hw, by2 - s * 0.026, hw * 0.75, s * 0.018);
          ctx.save();
          ctx.translate(p.x + hw * 0.05, by2);
          ctx.rotate(0.7);
          ctx.fillStyle = DGN_IRON;
          ctx.fillRect(0, -s * 0.026, hw * 0.4, s * 0.052);
          ctx.restore();
          continue;
        }
        ctx.fillStyle = DGN_IRON;
        ctx.fillRect(p.x - hw, by2 - s * 0.028, hw * 2, s * 0.056);
        ctx.fillStyle = DGN_IRON_LIT;
        ctx.fillRect(p.x - hw, by2 - s * 0.028, hw * 2, s * 0.02);
      }
      // The frame: four beveled strips and their corner rivets.
      ctx.fillStyle = DGN_IRON;
      ctx.fillRect(p.x - hw - s * 0.05, cy - hd - s * 0.05, hw * 2 + s * 0.1, s * 0.06);
      ctx.fillRect(p.x - hw - s * 0.05, cy + hd - s * 0.01, hw * 2 + s * 0.1, s * 0.06);
      ctx.fillRect(p.x - hw - s * 0.05, cy - hd - s * 0.05, s * 0.06, hd * 2 + s * 0.1);
      ctx.fillRect(p.x + hw - s * 0.01, cy - hd - s * 0.05, s * 0.06, hd * 2 + s * 0.1);
      ctx.fillStyle = DGN_IRON_LIT;
      ctx.fillRect(p.x - hw - s * 0.05, cy - hd - s * 0.05, hw * 2 + s * 0.1, s * 0.02);
      ctx.fillStyle = DGN_RUST_LIT;
      for (const [fx, fy3] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const) {
        ctx.fillRect(p.x + fx * hw - s * 0.014, cy + fy3 * hd - s * 0.014, s * 0.028, s * 0.028);
      }
      // The breath of the deep: two wisps on offset clocks,
      // rising, drifting, thinning to nothing.
      for (let k = 0; k < 2; k++) {
        const ph = (t * 0.22 + k * 0.53 + (h % 89) * 0.011) % 1;
        const wx = p.x + (k === 0 ? -s * 0.12 : s * 0.16) + Math.sin(ph * 5 + k) * s * 0.05;
        const wy = cy - ph * s * 0.55;
        ctx.fillStyle = `rgba(190, 198, 218, ${(1 - ph) * 0.12})`;
        ctx.beginPath();
        ctx.ellipse(wx, wy, s * (0.05 + ph * 0.07), s * (0.04 + ph * 0.05), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}

export const GRAVEYARD_PROPS: PropEntries = [
  [[Tile.Gravestone], paintGravestone],
  [[Tile.GravestoneTall], paintGravestoneTall],
  [[Tile.GraveMound], paintGraveMound],
  [[Tile.MournerStatue], paintMournerStatue],
  [[Tile.Sarcophagus], paintSarcophagus],
  [[Tile.BrokenPillar], paintBrokenPillar],
  [[Tile.GrandPillar], paintGrandPillar],
  [[Tile.AncientStatue], paintAncientStatue],
  [[Tile.GibbetCage], paintGibbetCage],
  [[Tile.Stocks], paintStocks],
  [[Tile.TimberBrace, Tile.WallFossil, Tile.WallWeb], paintTimberBrace],
  [[Tile.DripPool], paintDripPool],
  [[Tile.ColdCamp], paintColdCamp],
  [[Tile.LootedChest], paintLootedChest],
  [[Tile.CandleShrine], paintCandleShrine],
  [[Tile.IronGrate], paintIronGrate],
];
