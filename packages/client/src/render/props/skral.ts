/**
 * THE BRINE SHELF — fish racks, dugouts, weirs, tide altars: the Skral coastal set.
 * Extracted verbatim from renderer.ts's objectItem (THE PROP HALL,
 * foundations F1) — each painter is one former switch case; the frame
 * and host contracts live in ./types.ts.
 */
import { facetBlob, facetCircle } from '../shapes.js';
import { DGN_BONE, DGN_BONE_DIM } from './palette.js';
import { Tile, hashCoords } from '@arx/shared';
import type { DrawItem } from '../renderer.js';
import type { PropEntries, PropFrame, PropHost } from './types.js';

// THE BANKS GET THEIR GOODS: the skral shore kit's materials —
// FOUND, NEVER FELLED. Driftwood silvered by salt (a cool gray
// family off both the camp's hewn brown and the elven silverbark
// warm), kelp-cord lashings green-dark and glistening (the joinery
// story: no rope on the banks), wet fish silver, reed-bank wicker
// (drier than the surf's wood), coral the kit's one warm note, and
// the brine glow a step greener than the glowshroom's cave teal.
// Bone reuses DGN_BONE — one bone truth game-wide.
const SKR_DRIFT = '#8d8672';
const SKR_DRIFT_LIT = '#b5ad94';
const SKR_DRIFT_DARK = '#5e5949';
const SKR_KELP = '#3f5c48';
const SKR_KELP_LIT = '#5a7a5c';
const SKR_FISH = '#b8c4c6';
const SKR_FISH_DARK = '#4a5a5e';
const SKR_FISH_BELLY = '#dde6e2';
const SKR_WICKER = '#a08b58';
const SKR_WICKER_LIT = '#c2ab6e';
const SKR_CORAL = '#c98a74';
const SKR_CORAL_LIT = '#e8ab8a';
// THE CRAFTSMEN OF THE BANKS: the working shelf's three additions —
// cut reed (greener and drier than the surf-silvered driftwood, a
// step warmer than kelp: thatch that grew in fresh margins), the
// still dark water a keep-pool holds, and salt's near-white crust
// (the one thing on the bank brighter than bone).
const SKR_REED = '#8a9a5f';
const SKR_REED_LIT = '#b5bd7e';
const SKR_REED_DARK = '#5f6b40';
const SKR_POOL = '#31454e';
const SKR_SALT = '#e8ecec';
const SKR_SHELL_PEARL = '#d8cfd8';
// The water-cluster fin accents (render/skral.ts family banners):
// a camp flies its shoal's colors — the hash deals which. The
// fourth is the deepking's crimson sail, never bone-pale — a pale
// banner on a bone skull vanished at every band (audit verdict).
const SKR_BANNERS = ['#4fae9a', '#5b8fc9', '#8a9a4f', '#b5524a'] as const;


// ================= THE BANKS GET THEIR GOODS =================
// Twelve pieces of skral shore dressing, ids 369-380
// (docs/skral-decor-plan.md). The kit's voice: FOUND, NEVER
// FELLED — driftwood silvered by salt, kelp-cord lashings, bone
// and shell and woven withy, no saw-cut ends and no iron; and
// every piece is WET where it meets the ground, because the
// tide is always just behind the people who own it.
function paintFishRack(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.22;
  // The larder in the open: crossed shear-legs of driftwood
  // under a sagging rail heavy with the split catch, hung
  // tails-up. The hash deals one fish already gull-picked to a
  // rib comb — nothing on a bank goes unshared.
  const hw = s * 0.5;
  const railY = baseY - s * 0.8;
  const picked = (h >> 5) % 5;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.75, 1.15, 0.5),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.2, s * 0.09),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.2, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // Damp underfoot: the drip line the catch keeps.
      ctx.fillStyle = 'rgba(52, 62, 60, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, hw * 0.9, s * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      // Shear-legs: two crossed driftwood poles at each end,
      // water-worn knobs up — never a sawn end on a bank.
      const leg = (ex: number, m2: number): void => {
        for (const [dx, tip] of [
          [-0.13, 0.1],
          [0.13, -0.1],
        ] as const) {
          ctx.strokeStyle = SKR_DRIFT;
          ctx.lineWidth = Math.max(1.5, s * 0.05);
          ctx.beginPath();
          ctx.moveTo(ex + dx * s * m2, baseY);
          ctx.quadraticCurveTo(ex + dx * s * 0.3 * m2, baseY - s * 0.5, ex + tip * s * m2, railY - s * 0.1);
          ctx.stroke();
          ctx.strokeStyle = SKR_DRIFT_LIT;
          ctx.lineWidth = Math.max(1, s * 0.018);
          ctx.beginPath();
          ctx.moveTo(ex + dx * s * m2 - s * 0.01, baseY - s * 0.06);
          ctx.quadraticCurveTo(ex + dx * s * 0.3 * m2 - s * 0.01, baseY - s * 0.5, ex + tip * s * m2 - s * 0.01, railY - s * 0.08);
          ctx.stroke();
          // The worn knob crowning each pole.
          ctx.fillStyle = SKR_DRIFT_LIT;
          ctx.beginPath();
          ctx.ellipse(ex + tip * s * m2, railY - s * 0.1, s * 0.028, s * 0.024, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // The kelp lash at the crossing — the joinery story.
        ctx.strokeStyle = SKR_KELP;
        ctx.lineWidth = Math.max(1, s * 0.026);
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(ex - s * 0.05, railY + s * (0.02 + k * 0.024));
          ctx.lineTo(ex + s * 0.05, railY + s * (0.012 + k * 0.024));
          ctx.stroke();
        }
        ctx.strokeStyle = SKR_KELP_LIT;
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.moveTo(ex - s * 0.04, railY + s * 0.028);
        ctx.lineTo(ex + s * 0.03, railY + s * 0.022);
        ctx.stroke();
      };
      leg(p.x - hw, 1);
      leg(p.x + hw, -1);
      // The rail: one long driftwood rod sagging under the
      // weight of the catch.
      ctx.strokeStyle = SKR_DRIFT;
      ctx.lineWidth = Math.max(1.5, s * 0.045);
      ctx.beginPath();
      ctx.moveTo(p.x - hw - s * 0.08, railY);
      ctx.quadraticCurveTo(p.x, railY + s * 0.05, p.x + hw + s * 0.08, railY);
      ctx.stroke();
      ctx.strokeStyle = SKR_DRIFT_LIT;
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.moveTo(p.x - hw, railY - s * 0.012);
      ctx.quadraticCurveTo(p.x, railY + s * 0.038, p.x + hw * 0.6, railY - s * 0.004);
      ctx.stroke();
      // The catch: four split fish hung tails-up, bellies out —
      // fewer and BIGGER than pass one (the audit read five
      // narrow tubes as a rack of gourds; a fish needs its leaf
      // body, its fork, and its two-tone split to be a fish).
      for (let k = 0; k < 4; k++) {
        const fx2 = p.x + (k - 1.5) * hw * 0.52 + (((h >> (k * 3)) & 3) - 1.5) * s * 0.014;
        const sag = s * 0.05 * (1 - Math.abs(k - 1.5) / 2.2);
        const fy = railY + sag;
        const tilt = (((h >> (k * 2 + 1)) & 3) - 1.5) * 0.11;
        const fl = s * (0.34 + ((h >> (k * 2)) & 1) * 0.05);
        ctx.save();
        ctx.translate(fx2, fy);
        ctx.rotate(tilt);
        // The tail fork hooked over the rail — a big honest V.
        ctx.fillStyle = SKR_FISH_DARK;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.014);
        ctx.lineTo(-s * 0.046, -s * 0.05);
        ctx.lineTo(0, -s * 0.014);
        ctx.lineTo(s * 0.046, -s * 0.05);
        ctx.closePath();
        ctx.fill();
        if (k === picked) {
          // The gull-picked one: a spine and rib comb where a
          // fish used to be.
          ctx.strokeStyle = DGN_BONE;
          ctx.lineWidth = Math.max(1, s * 0.018);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, fl);
          ctx.stroke();
          ctx.lineWidth = Math.max(1, s * 0.012);
          for (let r2 = 0; r2 < 4; r2++) {
            const ry = fl * (0.22 + r2 * 0.18);
            ctx.beginPath();
            ctx.moveTo(-s * (0.045 - r2 * 0.008), ry);
            ctx.lineTo(s * (0.045 - r2 * 0.008), ry);
            ctx.stroke();
          }
          ctx.fillStyle = DGN_BONE_DIM;
          ctx.beginPath();
          ctx.ellipse(0, fl + s * 0.02, s * 0.032, s * 0.026, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // The body: a hung leaf of fish split in two voices —
          // the whole shaded flank first, then the pale belly
          // half OVER it, so the split reads at arm's length.
          ctx.fillStyle = SKR_FISH;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(-s * 0.085, fl * 0.45, -s * 0.026, fl);
          ctx.quadraticCurveTo(0, fl * 1.1, s * 0.026, fl);
          ctx.quadraticCurveTo(s * 0.085, fl * 0.45, 0, 0);
          ctx.fill();
          ctx.fillStyle = SKR_FISH_BELLY;
          ctx.beginPath();
          ctx.moveTo(-s * 0.004, s * 0.015);
          ctx.quadraticCurveTo(-s * 0.075, fl * 0.45, -s * 0.022, fl * 0.98);
          ctx.quadraticCurveTo(-s * 0.002, fl * 1.04, -s * 0.002, fl * 0.9);
          ctx.lineTo(-s * 0.002, s * 0.015);
          ctx.closePath();
          ctx.fill();
          // The dark back stripe holds the other flank's edge.
          ctx.strokeStyle = SKR_FISH_DARK;
          ctx.lineWidth = Math.max(1.5, s * 0.022);
          ctx.beginPath();
          ctx.moveTo(s * 0.012, s * 0.035);
          ctx.quadraticCurveTo(s * 0.066, fl * 0.45, s * 0.016, fl * 0.92);
          ctx.stroke();
          // Gill seam and the flat dead eye at the head.
          ctx.lineWidth = Math.max(1, s * 0.014);
          ctx.beginPath();
          ctx.moveTo(-s * 0.028, fl * 0.8);
          ctx.quadraticCurveTo(0, fl * 0.88, s * 0.026, fl * 0.78);
          ctx.stroke();
          ctx.fillStyle = '#2c3438';
          ctx.beginPath();
          ctx.ellipse(-s * 0.012, fl * 0.93, s * 0.014, s * 0.014, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      // The low spare rail — one end slipped its lash years ago.
      ctx.strokeStyle = SKR_DRIFT_DARK;
      ctx.lineWidth = Math.max(1.5, s * 0.04);
      ctx.beginPath();
      ctx.moveTo(p.x - hw + s * 0.05, baseY - s * 0.3);
      ctx.lineTo(p.x + hw - s * 0.02, baseY - s * 0.2);
      ctx.stroke();
      // Two drip beads and a scatter of scale-glint underfoot.
      ctx.fillStyle = 'rgba(178, 208, 216, 0.5)';
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.35, baseY - s * 0.02, s * 0.014, s * 0.01, 0, 0, Math.PI * 2);
      ctx.ellipse(p.x + hw * 0.28, baseY + s * 0.01, s * 0.012, s * 0.009, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintTideTotem(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // The camp's watcher: a driven driftwood post wearing its old
  // waterline as a barnacle collar, crowned with a great fish
  // skull whose sockets hold shell inlays — the lantern-eye
  // read, in prop form — and flying a fin-membrane banner in
  // the shoal's own water color. The banner sways; bone holds.
  const ht = s * 1.3;
  const topY = baseY - ht;
  const accent = SKR_BANNERS[(h >>> 6) & 3]!;
  const m = ((h >> 4) & 1) === 0 ? 1 : -1;
  const phase = tx * 3.1 + ty * 1.7;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.8, 1.9, 0.5),
    drawShadow: () => rend.castEdgeQuad(p.x - s * 0.1, baseY, p.x + s * 0.1, baseY, 1.1),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.26)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, s * 0.22, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(52, 62, 60, 0.25)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, s * 0.17, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // The post: driftwood with one lit lane, leaning a hair.
      ctx.fillStyle = SKR_DRIFT;
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.055, baseY);
      ctx.lineTo(p.x - s * 0.04 + m * s * 0.02, topY + s * 0.1);
      ctx.lineTo(p.x + s * 0.04 + m * s * 0.02, topY + s * 0.1);
      ctx.lineTo(p.x + s * 0.055, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(181, 173, 148, 0.5)';
      ctx.fillRect(p.x - s * 0.035, topY + s * 0.12, s * 0.024, ht - s * 0.14);
      ctx.strokeStyle = SKR_DRIFT_DARK;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(p.x + s * 0.02, baseY - s * 0.04);
      ctx.quadraticCurveTo(p.x + s * 0.03, baseY - ht * 0.5, p.x + s * 0.012 + m * s * 0.02, topY + s * 0.16);
      ctx.stroke();
      // The barnacle collar at the old waterline: the post
      // stood in the shallows before it stood here.
      ctx.fillStyle = '#c5bda8';
      for (let k = 0; k < 7; k++) {
        const bx = p.x + (((h >> (k * 2)) % 9) - 4) * s * 0.014;
        const by = baseY - s * (0.2 + ((h >> (k * 3)) % 7) * 0.016);
        ctx.beginPath();
        ctx.ellipse(bx, by, s * 0.014, s * 0.011, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(62, 70, 66, 0.4)';
      ctx.fillRect(p.x - s * 0.055, baseY - s * 0.14, s * 0.11, s * 0.05);
      // The cross-spar, lashed in kelp.
      const sparY = topY + s * 0.34;
      ctx.strokeStyle = SKR_DRIFT;
      ctx.lineWidth = Math.max(1.5, s * 0.036);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.3, sparY + s * 0.03);
      ctx.lineTo(p.x + s * 0.3, sparY - s * 0.03);
      ctx.stroke();
      ctx.strokeStyle = SKR_KELP;
      ctx.lineWidth = Math.max(1, s * 0.024);
      for (const d of [-0.03, 0.01, 0.05]) {
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.05, sparY + d * s);
        ctx.lineTo(p.x + s * 0.05, sparY + d * s - s * 0.02);
        ctx.stroke();
      }
      // The fin banner: a membrane on three rays, hung from the
      // spar's far end, swaying slow — cloth never grew on a
      // bank; this is somebody's old sail fin, dried and flown.
      const bx = p.x - m * s * 0.28;
      const by = sparY + m * s * 0.028 * -1 + s * 0.02;
      const sway = Math.sin(t * 1.5 + phase) * 0.14;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(sway);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-s * 0.14, s * 0.3, -s * 0.04, s * 0.58);
      ctx.quadraticCurveTo(s * 0.08, s * 0.4, s * 0.065, s * 0.025);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      // The membrane keeps its ink — a banner without an edge
      // melted into the sky at map scale (audit verdict).
      ctx.strokeStyle = 'rgba(20, 26, 24, 0.55)';
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-s * 0.14, s * 0.3, -s * 0.04, s * 0.58);
      ctx.quadraticCurveTo(s * 0.08, s * 0.4, s * 0.065, s * 0.025);
      ctx.closePath();
      ctx.stroke();
      ctx.lineWidth = Math.max(1, s * 0.013);
      for (const rf of [0.2, 0.55, 0.85]) {
        ctx.beginPath();
        ctx.moveTo(s * 0.05 * (1 - rf), s * 0.025);
        ctx.quadraticCurveTo(-s * 0.026 - s * 0.05 * rf, s * 0.26, -s * 0.037 * rf * 1.2, s * 0.55 * (0.6 + rf * 0.45));
        ctx.stroke();
      }
      ctx.restore();
      // Shell strings falling from the spar ends — they HANG
      // (plumb, close to the post); the splayed catenaries of
      // pass one read as skeleton arms at every band.
      for (const d of [-1, 1]) {
        const ax = p.x + d * s * 0.28;
        const ay = sparY - d * s * 0.028;
        const ex = p.x + d * s * 0.2;
        const ey = baseY - s * 0.52;
        ctx.strokeStyle = 'rgba(63, 92, 72, 0.7)';
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(ax + d * s * 0.012, (ay + ey) / 2 + s * 0.03, ex, ey);
        ctx.stroke();
        ctx.fillStyle = '#ded5c4';
        for (let k = 1; k < 5; k++) {
          const tt = k / 5;
          const sx2 = ax + (ex - ax) * tt + d * s * 0.014 * Math.sin(tt * 3);
          const sy2 = ay + (ey - ay) * tt + s * 0.03 * tt * (1 - tt);
          ctx.beginPath();
          ctx.ellipse(sx2, sy2, s * 0.018, s * 0.023, 0.3 * d, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // THE SKULL: dome, brow, and the two great sockets with
      // their pale shell inlays — the lantern eyes that watch
      // the path into camp long after their owner stopped.
      const skY = topY + s * 0.02;
      ctx.fillStyle = DGN_BONE;
      ctx.beginPath();
      facetCircle(ctx, p.x, skY, s * 0.15, 7, 0.5, 0.9);
      ctx.fill();
      // The needle snout dropping from the dome — a fish skull
      // is mostly jaw.
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.1, skY + s * 0.08);
      ctx.lineTo(p.x, skY + s * 0.3);
      ctx.lineTo(p.x + s * 0.1, skY + s * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = DGN_BONE_DIM;
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.06, skY + s * 0.12);
      ctx.lineTo(p.x, skY + s * 0.26);
      ctx.lineTo(p.x + s * 0.02, skY + s * 0.11);
      ctx.closePath();
      ctx.fill();
      // Needle teeth on the jaw line.
      ctx.strokeStyle = '#efe9d8';
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (let k = 0; k < 4; k++) {
        const tt = 0.25 + k * 0.16;
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.09 + tt * s * 0.09, skY + s * (0.1 + tt * 0.16));
        ctx.lineTo(p.x - s * 0.09 + tt * s * 0.09 + s * 0.012, skY + s * (0.13 + tt * 0.16));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x + s * 0.09 - tt * s * 0.09, skY + s * (0.1 + tt * 0.16));
        ctx.lineTo(p.x + s * 0.09 - tt * s * 0.09 - s * 0.012, skY + s * (0.13 + tt * 0.16));
        ctx.stroke();
      }
      // The brow ridge and the crest of bone rays — the sail
      // the skull used to fly.
      ctx.fillStyle = 'rgba(90, 82, 60, 0.35)';
      ctx.fillRect(p.x - s * 0.11, skY - s * 0.045, s * 0.22, s * 0.028);
      ctx.strokeStyle = DGN_BONE_DIM;
      ctx.lineWidth = Math.max(1, s * 0.02);
      for (const [dx, dl] of [
        [-0.06, 0.1],
        [0, 0.15],
        [0.06, 0.1],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(p.x + dx * s, skY - s * 0.1);
        ctx.lineTo(p.x + dx * s * 1.8, skY - s * (0.1 + dl));
        ctx.stroke();
      }
      // The sockets and their inlays: dark holes, pale shells,
      // one cold glint each — they still catch what light there is.
      for (const d of [-1, 1]) {
        ctx.fillStyle = '#2c2620';
        ctx.beginPath();
        ctx.ellipse(p.x + d * s * 0.068, skY + s * 0.008, s * 0.05, s * 0.056, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e8e2d4';
        ctx.beginPath();
        ctx.ellipse(p.x + d * s * 0.068, skY + s * 0.012, s * 0.034, s * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.ellipse(p.x + d * s * 0.055, skY - s * 0.004, s * 0.011, s * 0.013, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}

function paintNetFrame(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // A net is wealth: hung to dry between two lashed posts, cork
  // floats riding the head-rope, the hem dragging sand — and one
  // torn hole MENDED in paler cord, because somebody sat down
  // and fixed it. A dried starfish stays caught forever.
  const hw = s * 0.46;
  const topY = baseY - s * 0.82;
  const mendX = p.x + (((h >> 6) & 1) === 0 ? -1 : 1) * hw * 0.32;
  const mendY = topY + s * 0.34;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.7, 1.15, 0.5),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.1, s * 0.08),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.15, s * 0.075, 0, 0, Math.PI * 2);
      ctx.fill();
      // Posts first (the net hangs in FRONT of its frame).
      for (const d of [-1, 1]) {
        ctx.strokeStyle = SKR_DRIFT;
        ctx.lineWidth = Math.max(1.5, s * 0.05);
        ctx.beginPath();
        ctx.moveTo(p.x + d * hw, baseY);
        ctx.lineTo(p.x + d * (hw + s * 0.05), topY - s * 0.06);
        ctx.stroke();
        ctx.strokeStyle = SKR_DRIFT_LIT;
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(p.x + d * hw - s * 0.012, baseY - s * 0.05);
        ctx.lineTo(p.x + d * (hw + s * 0.05) - s * 0.012, topY - s * 0.03);
        ctx.stroke();
        ctx.fillStyle = SKR_DRIFT_LIT;
        ctx.beginPath();
        ctx.ellipse(p.x + d * (hw + s * 0.05), topY - s * 0.06, s * 0.026, s * 0.022, 0, 0, Math.PI * 2);
        ctx.fill();
        // Kelp lash where the head-rope meets the post.
        ctx.strokeStyle = SKR_KELP;
        ctx.lineWidth = Math.max(1, s * 0.022);
        ctx.beginPath();
        ctx.moveTo(p.x + d * (hw + s * 0.02), topY + s * 0.015);
        ctx.lineTo(p.x + d * (hw + s * 0.06), topY - s * 0.02);
        ctx.stroke();
      }
      // The head-rope sags between the posts.
      ctx.strokeStyle = SKR_KELP;
      ctx.lineWidth = Math.max(1, s * 0.026);
      ctx.beginPath();
      ctx.moveTo(p.x - hw - s * 0.03, topY - s * 0.02);
      ctx.quadraticCurveTo(p.x, topY + s * 0.12, p.x + hw + s * 0.03, topY - s * 0.02);
      ctx.stroke();
      // The net body: a translucent skirt under the rope, hem
      // bunching where it drags. Mesh rides inside a clip so
      // the diamonds die at the selvedge, never past it.
      const hang = (f: number): number => topY + s * 0.12 * (1 - f * f) + s * 0.02;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.94, hang(-0.94));
      ctx.quadraticCurveTo(p.x, topY + s * 0.14, p.x + hw * 0.94, hang(0.94));
      ctx.lineTo(p.x + hw * 0.68, baseY - s * 0.02);
      ctx.quadraticCurveTo(p.x + hw * 0.2, baseY + s * 0.045, p.x - hw * 0.3, baseY - s * 0.01);
      ctx.quadraticCurveTo(p.x - hw * 0.62, baseY + s * 0.03, p.x - hw * 0.72, baseY - s * 0.03);
      ctx.closePath();
      ctx.fillStyle = 'rgba(40, 52, 48, 0.18)';
      ctx.fill();
      ctx.clip();
      // Two diagonal cord families = the knotted diamonds.
      ctx.strokeStyle = 'rgba(168, 178, 164, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (let k = -8; k <= 8; k++) {
        ctx.beginPath();
        ctx.moveTo(p.x + k * s * 0.11 - s * 0.5, topY - s * 0.05);
        ctx.lineTo(p.x + k * s * 0.11 + s * 0.5, baseY + s * 0.05);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x + k * s * 0.11 + s * 0.5, topY - s * 0.05);
        ctx.lineTo(p.x + k * s * 0.11 - s * 0.5, baseY + s * 0.05);
        ctx.stroke();
      }
      // The tear, taken back: a hole shadow under a spider of
      // paler mending cord — wealth, kept.
      ctx.fillStyle = 'rgba(30, 38, 36, 0.35)';
      ctx.beginPath();
      ctx.ellipse(mendX, mendY, s * 0.085, s * 0.075, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(214, 220, 204, 0.85)';
      ctx.lineWidth = Math.max(1, s * 0.013);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + 0.4;
        ctx.beginPath();
        ctx.moveTo(mendX - Math.cos(a) * s * 0.085, mendY - Math.sin(a) * s * 0.075);
        ctx.quadraticCurveTo(mendX, mendY, mendX + Math.cos(a) * s * 0.085, mendY + Math.sin(a) * s * 0.075);
        ctx.stroke();
      }
      ctx.restore();
      // Cork floats riding the head-rope.
      for (const f of [-0.72, -0.3, 0.18, 0.62]) {
        const fy = hang(f) - s * 0.012;
        ctx.fillStyle = SKR_WICKER_LIT;
        ctx.beginPath();
        ctx.ellipse(p.x + f * hw, fy, s * 0.036, s * 0.028, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(62, 52, 30, 0.55)';
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(p.x + f * hw, fy - s * 0.028);
        ctx.lineTo(p.x + f * hw, fy + s * 0.028);
        ctx.stroke();
      }
      // The starfish that never got out.
      const stX = p.x + (mendX > p.x ? -1 : 1) * hw * 0.38;
      const stY = topY + s * 0.52;
      ctx.fillStyle = SKR_CORAL;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 - Math.PI / 2 + 0.25;
        ctx.beginPath();
        ctx.moveTo(stX + Math.cos(a + 0.55) * s * 0.018, stY + Math.sin(a + 0.55) * s * 0.018);
        ctx.lineTo(stX + Math.cos(a) * s * 0.052, stY + Math.sin(a) * s * 0.052);
        ctx.lineTo(stX + Math.cos(a - 0.55) * s * 0.018, stY + Math.sin(a - 0.55) * s * 0.018);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = SKR_CORAL_LIT;
      ctx.beginPath();
      ctx.ellipse(stX, stY, s * 0.016, s * 0.016, 0, 0, Math.PI * 2);
      ctx.fill();
      // The hem's damp drag-line in the sand.
      ctx.fillStyle = 'rgba(52, 62, 60, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.1, baseY + s * 0.015, hw * 0.55, s * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintDugout(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.24;
  // Hauled up past the tide line, lying long-axis across the
  // screen the way a hull lies (the coffin's law, afloat). Most
  // sit open — hollow dark, a thwart, the paddle shipped across
  // the gunwale — and the hash turns some turtle, keel up over
  // a lashed hide patch. The drag furrow says it was CARRIED.
  const L = s * 0.7;
  const turtle = ((h >> 7) & 3) === 0;
  const m = ((h >> 3) & 1) === 0 ? 1 : -1; // bow side
  return {
    sortY: ty + 0.7,
    body: stationBody(1.0, 0.9, 0.55),
    drawShadow: () => rend.castContact(p.x, baseY, L * 1.15, s * 0.12),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      // The drag furrow: two scored lines running off the stern
      // — the wet proof somebody hauled this above the reach.
      ctx.strokeStyle = 'rgba(58, 52, 40, 0.3)';
      ctx.lineWidth = Math.max(1, s * 0.02);
      for (const d of [-0.05, 0.05]) {
        ctx.beginPath();
        ctx.moveTo(p.x - m * L * 0.6, baseY + d * s + s * 0.04);
        ctx.quadraticCurveTo(p.x - m * L * 1.1, baseY + d * s + s * 0.09, p.x - m * L * 1.35, baseY + d * s + s * 0.16);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(12, 8, 20, 0.26)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, L * 1.08, s * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      // The bow puddle: the last of the lake, still leaking out.
      ctx.fillStyle = 'rgba(74, 96, 104, 0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x + m * L * 0.95, baseY + s * 0.05, s * 0.13, s * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(178, 208, 216, 0.4)';
      ctx.beginPath();
      ctx.ellipse(p.x + m * L * 0.92, baseY + s * 0.04, s * 0.045, s * 0.016, 0, 0, Math.PI * 2);
      ctx.fill();
      if (turtle) {
        // Keel up: one long low dome wearing its keel-line like
        // a spine, plank seams following, the patch mid-hull.
        ctx.fillStyle = SKR_DRIFT;
        ctx.beginPath();
        ctx.moveTo(p.x - L, baseY);
        ctx.quadraticCurveTo(p.x - L * 0.92, baseY - s * 0.3, p.x - L * 0.45, baseY - s * 0.36);
        ctx.lineTo(p.x + L * 0.45, baseY - s * 0.36);
        ctx.quadraticCurveTo(p.x + L * 0.92, baseY - s * 0.3, p.x + L, baseY);
        ctx.closePath();
        ctx.fill();
        // The shade the hull throws on itself below the turn
        // of the bilge.
        ctx.fillStyle = 'rgba(46, 42, 34, 0.4)';
        ctx.beginPath();
        ctx.moveTo(p.x - L, baseY);
        ctx.quadraticCurveTo(p.x, baseY - s * 0.1, p.x + L, baseY);
        ctx.quadraticCurveTo(p.x, baseY - s * 0.02, p.x - L, baseY);
        ctx.fill();
        // Plank seams chase the sheer; the keel takes the light.
        ctx.strokeStyle = 'rgba(58, 52, 40, 0.45)';
        ctx.lineWidth = Math.max(1, s * 0.014);
        for (const f of [0.14, 0.24]) {
          ctx.beginPath();
          ctx.moveTo(p.x - L * 0.96, baseY - s * f * 0.6);
          ctx.quadraticCurveTo(p.x, baseY - s * (f + 0.1), p.x + L * 0.96, baseY - s * f * 0.6);
          ctx.stroke();
        }
        ctx.strokeStyle = SKR_DRIFT_LIT;
        ctx.lineWidth = Math.max(1.5, s * 0.03);
        ctx.beginPath();
        ctx.moveTo(p.x - L * 0.85, baseY - s * 0.32);
        ctx.lineTo(p.x + L * 0.85, baseY - s * 0.32);
        ctx.stroke();
        // The lashed hide patch: rounded, stitched, honest.
        const pxx = p.x + m * L * 0.22;
        ctx.fillStyle = '#8a6f52';
        ctx.beginPath();
        ctx.ellipse(pxx, baseY - s * 0.24, s * 0.11, s * 0.075, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = SKR_KELP;
        ctx.lineWidth = Math.max(1, s * 0.012);
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(pxx + Math.cos(a) * s * 0.1, baseY - s * 0.24 + Math.sin(a) * s * 0.068);
          ctx.lineTo(pxx + Math.cos(a) * s * 0.125, baseY - s * 0.24 + Math.sin(a) * s * 0.085);
          ctx.stroke();
        }
        // One end propped on a stone: the dark gap beneath is
        // what says HOLLOW.
        ctx.fillStyle = '#241f1c';
        ctx.beginPath();
        ctx.ellipse(p.x - m * L * 0.8, baseY - s * 0.015, s * 0.1, s * 0.035, 0, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#6a747a';
        ctx.beginPath();
        facetBlob(ctx, p.x - m * L * 0.98, baseY - s * 0.02, s * 0.05, h ^ 0x31, 5, 0.7);
        ctx.fill();
      } else {
        // Open hull: the outer wall keeps its waterline stain;
        // the rim is a long foreshortened ring; the hollow is
        // DARK with the far inner wall catching what falls in.
        ctx.fillStyle = SKR_DRIFT;
        ctx.beginPath();
        ctx.moveTo(p.x - L, baseY - s * 0.19);
        ctx.quadraticCurveTo(p.x - L * 0.5, baseY - s * 0.02, p.x, baseY);
        ctx.quadraticCurveTo(p.x + L * 0.5, baseY - s * 0.02, p.x + L, baseY - s * 0.19);
        ctx.lineTo(p.x + L * 0.9, baseY - s * 0.3);
        ctx.lineTo(p.x - L * 0.9, baseY - s * 0.3);
        ctx.closePath();
        ctx.fill();
        // The waterline: a dark soak band low on the planks.
        ctx.fillStyle = 'rgba(52, 56, 52, 0.45)';
        ctx.beginPath();
        ctx.moveTo(p.x - L * 0.9, baseY - s * 0.1);
        ctx.quadraticCurveTo(p.x, baseY + s * 0.02, p.x + L * 0.9, baseY - s * 0.1);
        ctx.quadraticCurveTo(p.x, baseY - s * 0.05, p.x - L * 0.9, baseY - s * 0.1);
        ctx.fill();
        // The rim: gunwale ring, lit on the near edge — the
        // top plane a low hull owns.
        ctx.fillStyle = '#2e2a24';
        ctx.beginPath();
        ctx.moveTo(p.x - L * 0.94, baseY - s * 0.295);
        ctx.quadraticCurveTo(p.x, baseY - s * 0.2, p.x + L * 0.94, baseY - s * 0.295);
        ctx.quadraticCurveTo(p.x + L * 0.98, baseY - s * 0.31, p.x + L * 0.94, baseY - s * 0.33);
        ctx.quadraticCurveTo(p.x, baseY - s * 0.42, p.x - L * 0.94, baseY - s * 0.33);
        ctx.quadraticCurveTo(p.x - L * 0.98, baseY - s * 0.31, p.x - L * 0.94, baseY - s * 0.295);
        ctx.fill();
        // Far inner wall band: the hollow has a BACK.
        ctx.fillStyle = 'rgba(141, 134, 114, 0.6)';
        ctx.beginPath();
        ctx.moveTo(p.x - L * 0.88, baseY - s * 0.33);
        ctx.quadraticCurveTo(p.x, baseY - s * 0.405, p.x + L * 0.88, baseY - s * 0.33);
        ctx.quadraticCurveTo(p.x, baseY - s * 0.365, p.x - L * 0.88, baseY - s * 0.33);
        ctx.fill();
        // Gunwale lips take the light bow to stern.
        ctx.strokeStyle = SKR_DRIFT_LIT;
        ctx.lineWidth = Math.max(1, s * 0.022);
        ctx.beginPath();
        ctx.moveTo(p.x - L * 0.94, baseY - s * 0.29);
        ctx.quadraticCurveTo(p.x, baseY - s * 0.195, p.x + L * 0.94, baseY - s * 0.29);
        ctx.stroke();
        // Bow and stern rise to worn knobs — carved, then
        // sanded round by forty seasons of bank.
        for (const d of [-1, 1]) {
          ctx.fillStyle = d === m ? SKR_DRIFT_LIT : SKR_DRIFT;
          ctx.beginPath();
          ctx.ellipse(p.x + d * L * 0.97, baseY - s * 0.3, s * 0.05, s * 0.06, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // The thwart: one plank the paddler sat on.
        ctx.fillStyle = SKR_DRIFT_DARK;
        ctx.fillRect(p.x - m * L * 0.28 - s * 0.04, baseY - s * 0.37, s * 0.08, s * 0.075);
        ctx.fillStyle = SKR_DRIFT_LIT;
        ctx.fillRect(p.x - m * L * 0.28 - s * 0.04, baseY - s * 0.37, s * 0.08, s * 0.016);
        // The paddle, shipped across the gunwale mid-hull:
        // shaft, then the leaf blade hanging outboard.
        ctx.save();
        ctx.translate(p.x + m * L * 0.3, baseY - s * 0.33);
        ctx.rotate(m * 0.5);
        ctx.strokeStyle = SKR_DRIFT_LIT;
        ctx.lineWidth = Math.max(1.5, s * 0.028);
        ctx.beginPath();
        ctx.moveTo(-s * 0.22, 0);
        ctx.lineTo(s * 0.2, 0);
        ctx.stroke();
        ctx.fillStyle = SKR_DRIFT_LIT;
        ctx.beginPath();
        ctx.ellipse(s * 0.28, 0, s * 0.1, s * 0.045, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = SKR_DRIFT_DARK;
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(s * 0.2, 0);
        ctx.lineTo(s * 0.36, 0);
        ctx.stroke();
        ctx.restore();
      }
    },
  };
}

function paintHarpoonRack(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // The shoal's armory: two rib-bones lashed into an A-frame,
  // three bone-tipped harpoons leaning points-up against the
  // crown — dark seat shadow behind them, one lit facet per
  // point (THE DISPLAY MUST READ) — and one shaft fallen flat,
  // because discipline is a dry-land idea.
  const crownY = baseY - s * 1.0;
  const m = ((h >> 4) & 1) === 0 ? 1 : -1;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.65, 1.4, 0.5),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.34, s * 0.09),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, s * 0.33, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      // The seat shadow: the dark the shafts stand against.
      ctx.fillStyle = 'rgba(20, 16, 24, 0.3)';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.24, baseY);
      ctx.lineTo(p.x - s * 0.04, crownY + s * 0.08);
      ctx.lineTo(p.x + s * 0.06, crownY + s * 0.08);
      ctx.lineTo(p.x + s * 0.26, baseY);
      ctx.closePath();
      ctx.fill();
      // The rib A-frame: bone sweeps, lashed at the crossing.
      for (const d of [-1, 1]) {
        ctx.strokeStyle = d === 1 ? DGN_BONE : DGN_BONE_DIM;
        ctx.lineWidth = Math.max(1.5, s * 0.048);
        ctx.beginPath();
        ctx.moveTo(p.x + d * s * 0.3, baseY);
        ctx.quadraticCurveTo(p.x + d * s * 0.16, baseY - s * 0.55, p.x - d * s * 0.035, crownY);
        ctx.stroke();
      }
      ctx.strokeStyle = SKR_KELP;
      ctx.lineWidth = Math.max(1, s * 0.024);
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.055, crownY + s * (0.02 + k * 0.024));
        ctx.lineTo(p.x + s * 0.055, crownY + s * (0.01 + k * 0.024));
        ctx.stroke();
      }
      // Three harpoons leaning into the crown, fanned; the
      // point is the whole argument: a two-facet bone head with
      // its one lit face, a barb, and a gut-cord grommet.
      for (const [fx2, lean] of [
        [-0.18, -0.1],
        [0.02, 0.02],
        [0.2, 0.12],
      ] as const) {
        const rootX = p.x + fx2 * s;
        const tipX = p.x + lean * s * 1.6;
        const tipY = crownY - s * (0.3 - Math.abs(lean) * 0.4);
        ctx.strokeStyle = SKR_DRIFT;
        ctx.lineWidth = Math.max(1.5, s * 0.026);
        ctx.beginPath();
        ctx.moveTo(rootX, baseY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        ctx.strokeStyle = SKR_DRIFT_LIT;
        ctx.lineWidth = Math.max(1, s * 0.011);
        ctx.beginPath();
        ctx.moveTo(rootX - s * 0.008, baseY - s * 0.04);
        ctx.lineTo(tipX - s * 0.008, tipY + s * 0.05);
        ctx.stroke();
        // Grommet wrap under the head.
        ctx.strokeStyle = SKR_KELP;
        ctx.lineWidth = Math.max(1, s * 0.018);
        ctx.beginPath();
        ctx.moveTo(tipX - s * 0.02, tipY + s * 0.045);
        ctx.lineTo(tipX + s * 0.02, tipY + s * 0.06);
        ctx.stroke();
        // The bone head: two facets, one lit; one barb tooth.
        const ang = Math.atan2(tipY - baseY, tipX - rootX);
        ctx.save();
        ctx.translate(tipX, tipY);
        ctx.rotate(ang + Math.PI / 2);
        ctx.fillStyle = DGN_BONE_DIM;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.14);
        ctx.lineTo(s * 0.032, s * 0.01);
        ctx.lineTo(-s * 0.032, s * 0.01);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#efe9d8';
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.14);
        ctx.lineTo(-s * 0.032, s * 0.01);
        ctx.lineTo(-s * 0.004, s * 0.01);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = DGN_BONE;
        ctx.beginPath();
        ctx.moveTo(s * 0.026, -s * 0.02);
        ctx.lineTo(s * 0.062, s * 0.025);
        ctx.lineTo(s * 0.022, s * 0.03);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      // The fallen one, flat in the sand, point offside.
      ctx.strokeStyle = SKR_DRIFT_DARK;
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(p.x - m * s * 0.38, baseY + s * 0.055);
      ctx.lineTo(p.x + m * s * 0.3, baseY + s * 0.09);
      ctx.stroke();
      ctx.fillStyle = DGN_BONE_DIM;
      ctx.beginPath();
      ctx.moveTo(p.x + m * s * 0.3, baseY + s * 0.09);
      ctx.lineTo(p.x + m * s * 0.38, baseY + s * 0.1);
      ctx.lineTo(p.x + m * s * 0.3, baseY + s * 0.115);
      ctx.closePath();
      ctx.fill();
    },
  };
}

function paintShellMidden(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // The heap that names the camp: cracked fans, spirals, and
  // mussel-dark chips a generation deep, a fishbone comb or two
  // riding the slope, the crown still wet from this morning's
  // shucking. The hash deals the heap's age — a young camp's
  // spill or an old bank's whole stratum.
  // A MIDDEN IS A MOUND, NOT A PEBBLE (audit verdict): the heap
  // carries real mass and a satellite spill, or it reads as one
  // white stone from three tiles out.
  const sz = 0.85 + ((h >> 2) & 3) * 0.16;
  const rr = s * 0.4 * sz;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.62, 0.75, 0.5),
    drawShadow: () => rend.castContact(p.x, baseY, rr * 1.2, s * 0.09),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, rr * 1.25, s * 0.085, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(52, 62, 60, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, rr * 1.05, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // The mound in two strata — the old dark base and the
      // fresher pale crown — with a satellite spill leaning on
      // the big heap (a midden GROWS; one clean dome is a rock).
      ctx.fillStyle = '#7c7362';
      ctx.beginPath();
      facetBlob(ctx, p.x, baseY - rr * 0.34, rr, h ^ 0x11, 7, 0.58);
      ctx.fill();
      ctx.fillStyle = '#d5ccb8';
      ctx.beginPath();
      facetBlob(ctx, p.x - rr * 0.08, baseY - rr * 0.56, rr * 0.74, h ^ 0x2f, 6, 0.58);
      ctx.fill();
      const spillX = p.x + (((h >> 9) & 1) === 0 ? 1 : -1) * rr * 0.92;
      ctx.fillStyle = '#9a9080';
      ctx.beginPath();
      facetBlob(ctx, spillX, baseY - rr * 0.14, rr * 0.42, h ^ 0x47, 6, 0.5);
      ctx.fill();
      ctx.fillStyle = '#c5bca6';
      ctx.beginPath();
      facetBlob(ctx, spillX, baseY - rr * 0.24, rr * 0.28, h ^ 0x59, 5, 0.5);
      ctx.fill();
      // Individual shells dealt over the slope, back to front:
      // fans with their rib combs, spirals, mussel darks —
      // scaled to READ (pass-one shells vanished into texture).
      for (let k = 0; k < 10; k++) {
        const hs2 = hashCoords(83 + k, tx, ty);
        const a = ((hs2 % 100) / 100) * Math.PI * 2;
        const rad = ((hs2 >>> 7) % 80) / 100;
        const sx2 = p.x + Math.cos(a) * rr * rad * 0.95;
        const sy2 = baseY - rr * 0.44 - Math.sin(a) * rr * rad * 0.34 + rr * 0.24;
        const kind2 = (hs2 >>> 4) % 3;
        if (kind2 === 0) {
          // A fan, hinge down, three rib strokes.
          ctx.fillStyle = ((hs2 >>> 9) & 1) === 0 ? '#e4dbc8' : '#d0bfa8';
          ctx.beginPath();
          ctx.moveTo(sx2, sy2);
          ctx.arc(sx2, sy2 - s * 0.016, s * 0.058, Math.PI * 0.85, Math.PI * 0.15, true);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(122, 108, 88, 0.65)';
          ctx.lineWidth = Math.max(1, s * 0.01);
          for (const ra of [-0.5, 0, 0.5]) {
            ctx.beginPath();
            ctx.moveTo(sx2, sy2);
            ctx.lineTo(sx2 + Math.sin(ra) * s * 0.05, sy2 - s * 0.016 - Math.cos(ra) * s * 0.052);
            ctx.stroke();
          }
        } else if (kind2 === 1) {
          // A spiral whorl.
          ctx.fillStyle = '#c8b9a0';
          ctx.beginPath();
          ctx.ellipse(sx2, sy2, s * 0.042, s * 0.034, a, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(110, 96, 76, 0.75)';
          ctx.lineWidth = Math.max(1, s * 0.01);
          ctx.beginPath();
          ctx.arc(sx2 + s * 0.008, sy2 - s * 0.005, s * 0.02, 0, Math.PI * 1.5);
          ctx.stroke();
        } else {
          // A mussel dark, the blue-black note in the pale.
          ctx.fillStyle = '#3e4650';
          ctx.beginPath();
          ctx.ellipse(sx2, sy2, s * 0.046, s * 0.024, a * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(150, 168, 178, 0.55)';
          ctx.lineWidth = Math.max(1, s * 0.01);
          ctx.beginPath();
          ctx.ellipse(sx2, sy2, s * 0.035, s * 0.016, a * 0.5, Math.PI, Math.PI * 1.8);
          ctx.stroke();
        }
      }
      // The fishbone comb riding the slope.
      const cbX = p.x + ((h >> 9) & 1 ? 1 : -1) * rr * 0.45;
      const cbY = baseY - rr * 0.55;
      ctx.strokeStyle = DGN_BONE;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(cbX - s * 0.07, cbY + s * 0.03);
      ctx.lineTo(cbX + s * 0.08, cbY - s * 0.03);
      ctx.stroke();
      ctx.lineWidth = Math.max(1, s * 0.009);
      for (let k = 1; k < 5; k++) {
        const tt = k / 5;
        ctx.beginPath();
        ctx.moveTo(cbX - s * 0.07 + tt * s * 0.15, cbY + s * 0.03 - tt * s * 0.06);
        ctx.lineTo(cbX - s * 0.07 + tt * s * 0.15 + s * 0.012, cbY + s * 0.055 - tt * s * 0.06);
        ctx.stroke();
      }
      // The wet crown: this morning's shucking still shines.
      ctx.fillStyle = 'rgba(220, 235, 240, 0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x - rr * 0.2, baseY - rr * 0.72, rr * 0.3, s * 0.03, -0.2, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintFishTrap(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // A funnel creel of hooped withies lying on its side, mouth
  // toward the camera — the dark round MOUTH is the 3D argument
  // (nothing painted flat has an end) — with one silver tail
  // still poking out of it, and the little spare trap leaning
  // on the big one's flank.
  const m = ((h >> 5) & 1) === 0 ? 1 : -1; // which way the tail points
  return {
    sortY: ty + 0.7,
    body: stationBody(0.68, 0.75, 0.5),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.4, s * 0.09),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, s * 0.42, s * 0.085, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(52, 62, 60, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x - m * s * 0.16, baseY, s * 0.2, s * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      // The big trap: mouth ring at the near end, body tapering
      // away to the tied tail. Axis runs shallow so both the
      // end AND the length read.
      const mouthX = p.x - m * s * 0.28;
      const mouthY = baseY - s * 0.15;
      const tailX = p.x + m * s * 0.34;
      const tailY = baseY - s * 0.09;
      // Body silhouette between the rings.
      ctx.fillStyle = SKR_WICKER;
      ctx.beginPath();
      ctx.moveTo(mouthX, mouthY - s * 0.16);
      ctx.quadraticCurveTo(p.x, baseY - s * 0.28, tailX, tailY - s * 0.045);
      ctx.lineTo(tailX, tailY + s * 0.045);
      ctx.quadraticCurveTo(p.x, baseY + s * 0.03, mouthX, mouthY + s * 0.16);
      ctx.closePath();
      ctx.fill();
      // The under-curve holds its shade — a basket is round.
      ctx.fillStyle = 'rgba(92, 76, 40, 0.45)';
      ctx.beginPath();
      ctx.moveTo(mouthX, mouthY + s * 0.16);
      ctx.quadraticCurveTo(p.x, baseY + s * 0.03, tailX, tailY + s * 0.045);
      ctx.quadraticCurveTo(p.x, baseY - s * 0.05, mouthX, mouthY + s * 0.08);
      ctx.closePath();
      ctx.fill();
      // Longitudinal withies chase the taper.
      ctx.strokeStyle = SKR_WICKER_LIT;
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (const f of [-0.1, -0.02, 0.06]) {
        ctx.beginPath();
        ctx.moveTo(mouthX, mouthY + f * s * 1.4);
        ctx.quadraticCurveTo(p.x, baseY - s * 0.14 + f * s, tailX, tailY + f * s * 0.5);
        ctx.stroke();
      }
      // The hoops, shrinking with the body: woven law made
      // visible. Ellipses lean with the axis.
      ctx.strokeStyle = 'rgba(92, 76, 40, 0.7)';
      ctx.lineWidth = Math.max(1, s * 0.014);
      for (let k = 1; k <= 3; k++) {
        const tt = k / 4;
        const hx = mouthX + (tailX - mouthX) * tt;
        const hy = mouthY + (tailY - mouthY) * tt - s * 0.06 * (1 - tt);
        const hr = s * 0.16 * (1 - tt * 0.6);
        ctx.beginPath();
        ctx.ellipse(hx, hy, hr * 0.32, hr, m * 0.18, 0, Math.PI * 2);
        ctx.stroke();
      }
      // THE MOUTH: dark, ringed, with the inner funnel throat
      // — the reason a trap works and the reason this prop reads.
      ctx.fillStyle = '#241f1c';
      ctx.beginPath();
      ctx.ellipse(mouthX, mouthY, s * 0.062, s * 0.16, m * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = SKR_WICKER_LIT;
      ctx.lineWidth = Math.max(1, s * 0.016);
      ctx.beginPath();
      ctx.ellipse(mouthX, mouthY, s * 0.062, s * 0.16, m * 0.18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(160, 139, 88, 0.55)';
      ctx.lineWidth = Math.max(1, s * 0.011);
      ctx.beginPath();
      ctx.ellipse(mouthX + m * s * 0.02, mouthY + s * 0.01, s * 0.036, s * 0.095, m * 0.18, 0, Math.PI * 2);
      ctx.stroke();
      // The tail knot and its tie-off cord.
      ctx.fillStyle = SKR_WICKER_LIT;
      ctx.beginPath();
      ctx.ellipse(tailX, tailY, s * 0.028, s * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = SKR_KELP;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(tailX + m * s * 0.01, tailY - s * 0.02);
      ctx.quadraticCurveTo(tailX + m * s * 0.07, tailY + s * 0.02, tailX + m * s * 0.05, baseY + s * 0.03);
      ctx.stroke();
      // One tail still flagging from the mouth: the trap WORKS.
      ctx.fillStyle = SKR_FISH;
      ctx.beginPath();
      ctx.moveTo(mouthX - m * s * 0.03, mouthY + s * 0.05);
      ctx.lineTo(mouthX - m * s * 0.1, mouthY + s * 0.02);
      ctx.lineTo(mouthX - m * s * 0.1, mouthY + s * 0.09);
      ctx.closePath();
      ctx.fill();
      // The spare: a young trap leaning upright on the flank.
      const spX = p.x + m * s * 0.12;
      ctx.fillStyle = SKR_WICKER;
      ctx.beginPath();
      ctx.moveTo(spX - s * 0.07, baseY - s * 0.02);
      ctx.lineTo(spX - s * 0.02, baseY - s * 0.34);
      ctx.lineTo(spX + s * 0.03, baseY - s * 0.34);
      ctx.lineTo(spX + s * 0.08, baseY - s * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(92, 76, 40, 0.7)';
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (const f of [0.08, 0.18, 0.28]) {
        ctx.beginPath();
        ctx.moveTo(spX - s * (0.068 - f * 0.16), baseY - s * f);
        ctx.lineTo(spX + s * (0.075 - f * 0.16), baseY - s * f);
        ctx.stroke();
      }
      ctx.fillStyle = '#241f1c';
      ctx.beginPath();
      ctx.ellipse(spX + s * 0.005, baseY - s * 0.34, s * 0.026, s * 0.012, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintRoeNest(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // The clutch: a scraped hollow ringed in hauled kelp, packed
  // with glistening roe — teal-pale domes, each wearing one
  // specular tick, the biggest few carrying the dark eye-dot of
  // what's coming — and one hatched husk already empty. Poke
  // the nursery and the bank comes down on you.
  return {
    sortY: ty + 0.7,
    body: stationBody(0.6, 0.7, 0.5),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.34, s * 0.09),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, s * 0.37, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // The scraped hollow, wet at its heart — mid-toned, never
      // black (a dark pit read as a hole in the bank, the
      // floating-shade lesson arriving by water).
      ctx.fillStyle = '#5c5546';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.06, s * 0.26, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(88, 110, 102, 0.45)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.05, s * 0.2, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // The kelp ring: hauled straps and blob wrack, greens
      // alternating so the ring reads BUILT, not grown.
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + 0.35;
        const kx = p.x + Math.cos(a) * s * 0.29;
        const ky = baseY - s * 0.05 + Math.sin(a) * s * 0.135;
        ctx.fillStyle = (k & 1) === 0 ? '#4a6a54' : SKR_KELP_LIT;
        ctx.beginPath();
        facetBlob(ctx, kx, ky, s * (0.055 + ((h >> k) & 1) * 0.018), h ^ (k * 37), 5, 0.6);
        ctx.fill();
      }
      // Two strap-leaves trailing off the ring.
      ctx.strokeStyle = SKR_KELP;
      ctx.lineWidth = Math.max(1.5, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(p.x + s * 0.24, baseY + s * 0.02);
      ctx.quadraticCurveTo(p.x + s * 0.38, baseY + s * 0.06, p.x + s * 0.46, baseY + s * 0.03);
      ctx.stroke();
      ctx.strokeStyle = SKR_KELP_LIT;
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.26, baseY - s * 0.11);
      ctx.quadraticCurveTo(p.x - s * 0.38, baseY - s * 0.12, p.x - s * 0.44, baseY - s * 0.06);
      ctx.stroke();
      // The clutch, packed back-to-front. Every dome: shaded
      // base crescent, teal body, one wet specular tick.
      const eggs: Array<[number, number, number]> = [];
      for (let k = 0; k < 8; k++) {
        const hs2 = hashCoords(97 + k, tx, ty);
        const a = ((hs2 % 100) / 100) * Math.PI * 2;
        const rad = ((hs2 >>> 6) % 70) / 100;
        eggs.push([
          p.x + Math.cos(a) * s * 0.17 * rad,
          baseY - s * 0.07 + Math.sin(a) * s * 0.075 * rad,
          s * (0.052 + ((hs2 >>> 9) % 4) * 0.011),
        ]);
      }
      eggs.sort((a, b) => a[1] - b[1]);
      for (const [ex, ey, er] of eggs) {
        ctx.fillStyle = '#6fae9e';
        ctx.beginPath();
        ctx.ellipse(ex, ey + er * 0.15, er, er * 0.82, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#9fe0d0';
        ctx.beginPath();
        ctx.ellipse(ex, ey, er * 0.92, er * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        // The biggest carry the coming generation: a dark
        // curled dot low in the yolk.
        if (er > s * 0.075) {
          ctx.fillStyle = 'rgba(36, 66, 60, 0.75)';
          ctx.beginPath();
          ctx.ellipse(ex + er * 0.15, ey + er * 0.12, er * 0.3, er * 0.24, 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.ellipse(ex - er * 0.35, ey - er * 0.35, er * 0.2, er * 0.14, -0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // The hatched husk: torn open, rim flapped, gone dark —
      // the clutch is already partway a shoal.
      const hkX = p.x + (((h >> 8) & 1) === 0 ? -1 : 1) * s * 0.2;
      const hkY = baseY - s * 0.005;
      ctx.fillStyle = '#c5e6da';
      ctx.beginPath();
      ctx.moveTo(hkX - s * 0.05, hkY);
      ctx.quadraticCurveTo(hkX - s * 0.055, hkY - s * 0.05, hkX - s * 0.02, hkY - s * 0.045);
      ctx.lineTo(hkX - s * 0.005, hkY - s * 0.07);
      ctx.lineTo(hkX + s * 0.012, hkY - s * 0.04);
      ctx.lineTo(hkX + s * 0.035, hkY - s * 0.058);
      ctx.quadraticCurveTo(hkX + s * 0.055, hkY - s * 0.02, hkX + s * 0.045, hkY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2e3c38';
      ctx.beginPath();
      ctx.ellipse(hkX, hkY - s * 0.012, s * 0.032, s * 0.02, 0, 0, Math.PI * 2);
      ctx.fill();
      // Glisten: the whole clutch is wet.
      ctx.fillStyle = 'rgba(220, 245, 240, 0.5)';
      ctx.beginPath();
      ctx.ellipse(p.x - s * 0.06, baseY - s * 0.13, s * 0.05, s * 0.016, -0.3, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintLurePole(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // The shoal's street light: a bowed driftwood pole leaning
  // over the path, and swinging from its tip a woven bone cage
  // holding a captured deep-jelly — teal, breathing, trailing
  // its tendrils through the bars. The glow rides the live
  // light pass (bioluminescence law: swell, never flicker);
  // the painter keeps its own halo to a whisper.
  const m = ((h >> 4) & 1) === 0 ? 1 : -1; // which way it bows
  const rootX = p.x + m * s * 0.22;
  const tipX = p.x - m * s * 0.26;
  const tipY = baseY - s * 1.42;
  const phase = tx * 2.3 + ty * 1.9;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.7, 1.95, 0.5),
    drawShadow: () => rend.castContact(rootX, baseY, s * 0.16, s * 0.07),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(rootX, baseY + s * 0.01, s * 0.17, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      // The footing: three stones and a kelp lash hold the butt
      // — driven posts are for people with mallets.
      ctx.fillStyle = '#6a747a';
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        facetBlob(ctx, rootX + (k - 1) * s * 0.07, baseY - s * 0.02 - (k & 1) * s * 0.02, s * 0.045, h ^ (k * 41), 5, 0.7);
        ctx.fill();
      }
      // The pole: one long bow, thick at the butt, worn thin at
      // the tip — an angler's rod scaled to a camp.
      ctx.strokeStyle = SKR_DRIFT;
      ctx.lineWidth = Math.max(2, s * 0.055);
      ctx.beginPath();
      ctx.moveTo(rootX, baseY - s * 0.02);
      ctx.quadraticCurveTo(rootX - m * s * 0.05, baseY - s * 0.95, tipX, tipY);
      ctx.stroke();
      ctx.strokeStyle = SKR_DRIFT_LIT;
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(rootX - s * 0.014, baseY - s * 0.1);
      ctx.quadraticCurveTo(rootX - m * s * 0.06, baseY - s * 0.92, tipX - s * 0.01, tipY + s * 0.03);
      ctx.stroke();
      // The brace: a second stick shoring the bow's belly.
      ctx.strokeStyle = SKR_DRIFT_DARK;
      ctx.lineWidth = Math.max(1.5, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(rootX - m * s * 0.3, baseY);
      ctx.lineTo(rootX - m * s * 0.13, baseY - s * 0.62);
      ctx.stroke();
      ctx.strokeStyle = SKR_KELP;
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(rootX - m * s * 0.16, baseY - s * 0.6);
      ctx.lineTo(rootX - m * s * 0.09, baseY - s * 0.66);
      ctx.stroke();
      // The gut line and the slow ride of the cage beneath it.
      const bob = Math.sin(t * 1.2 + phase) * s * 0.015;
      const cgX = tipX + Math.sin(t * 0.7 + phase) * s * 0.012;
      const cgY = tipY + s * 0.3 + bob;
      ctx.strokeStyle = 'rgba(214, 220, 204, 0.6)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(cgX, cgY - s * 0.17);
      ctx.stroke();
      // The painter's whisper of halo (the light pass owns the
      // real pool).
      ctx.fillStyle = 'rgba(127, 216, 200, 0.1)';
      ctx.beginPath();
      ctx.ellipse(cgX, cgY, s * 0.3, s * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(127, 216, 200, 0.07)';
      ctx.beginPath();
      ctx.ellipse(rootX - m * s * 0.24, baseY, s * 0.3, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // THE JELLY: dome, deep core, bell rim — lit from inside.
      ctx.fillStyle = 'rgba(127, 216, 200, 0.9)';
      ctx.beginPath();
      ctx.ellipse(cgX, cgY - s * 0.01, s * 0.105, s * 0.09, 0, Math.PI, Math.PI * 2);
      ctx.ellipse(cgX, cgY - s * 0.005, s * 0.105, s * 0.045, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = 'rgba(64, 150, 136, 0.8)';
      ctx.beginPath();
      ctx.ellipse(cgX + s * 0.02, cgY - s * 0.025, s * 0.038, s * 0.032, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(214, 245, 238, 0.85)';
      ctx.beginPath();
      ctx.ellipse(cgX - s * 0.035, cgY - s * 0.055, s * 0.028, s * 0.018, -0.5, 0, Math.PI * 2);
      ctx.fill();
      // The tendrils trail through the cage floor and DRIFT —
      // slow water motion in open air; the sea never quite lets
      // its creatures go.
      ctx.strokeStyle = 'rgba(127, 216, 200, 0.55)';
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (let k = 0; k < 4; k++) {
        const dx = (k - 1.5) * s * 0.038;
        const drift = Math.sin(t * 0.9 + phase + k * 1.7) * s * 0.022;
        ctx.beginPath();
        ctx.moveTo(cgX + dx, cgY + s * 0.055);
        ctx.quadraticCurveTo(cgX + dx + drift, cgY + s * 0.16, cgX + dx + drift * 1.8, cgY + s * (0.22 + (k & 1) * 0.05));
        ctx.stroke();
      }
      // The cage: bone ribs and two hoops, woven OVER the glow.
      ctx.strokeStyle = DGN_BONE_DIM;
      ctx.lineWidth = Math.max(1, s * 0.014);
      for (const f of [-1, -0.35, 0.35, 1]) {
        ctx.beginPath();
        ctx.ellipse(cgX, cgY - s * 0.01, s * 0.115 * Math.abs(f), s * 0.115, 0, -Math.PI / 2, Math.PI / 2, f < 0);
        ctx.stroke();
      }
      ctx.strokeStyle = DGN_BONE;
      ctx.lineWidth = Math.max(1, s * 0.013);
      for (const fy of [-0.045, 0.05]) {
        ctx.beginPath();
        ctx.ellipse(cgX, cgY + fy * s, s * 0.105 * (1 - Math.abs(fy) * 3), s * 0.032, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // The crown knot where cage meets line.
      ctx.fillStyle = SKR_KELP_LIT;
      ctx.beginPath();
      ctx.ellipse(cgX, cgY - s * 0.125, s * 0.02, s * 0.018, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintTideAltar(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.22;
  // The tidecaller's table: a wave-worn slab on stacked stones,
  // and the sea already reclaiming it — coral fingers over the
  // east end, a wet ring that never dries. The offerings stand
  // ON the top plane (pearls, a laid fish, a shell), and one
  // mother-of-pearl glint breathes on the slow clock. It does
  // not break: the tide keeps its own.
  const m = ((h >> 6) & 1) === 0 ? 1 : -1; // coral's end
  const topY = baseY - s * 0.5;
  const phase = tx * 1.9 + ty * 2.7;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.75, 1.0, 0.55),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.44, s * 0.11),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.26)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, s * 0.46, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // The wet ring: the tide visits this stone. Two standing
      // glints keep it read as water, not shadow.
      ctx.fillStyle = 'rgba(58, 74, 78, 0.3)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.015, s * 0.52, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(178, 208, 216, 0.4)';
      ctx.beginPath();
      ctx.ellipse(p.x - s * 0.34, baseY + s * 0.04, s * 0.05, s * 0.016, 0.2, 0, Math.PI * 2);
      ctx.ellipse(p.x + s * 0.4, baseY + s * 0.02, s * 0.035, s * 0.013, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // The stack: two courses of sea-rounded stone.
      ctx.fillStyle = '#5c666c';
      ctx.beginPath();
      facetBlob(ctx, p.x - s * 0.18, baseY - s * 0.09, s * 0.14, h ^ 0x51, 6, 0.62);
      ctx.fill();
      ctx.beginPath();
      facetBlob(ctx, p.x + s * 0.16, baseY - s * 0.08, s * 0.13, h ^ 0x67, 6, 0.62);
      ctx.fill();
      ctx.fillStyle = '#6a747a';
      ctx.beginPath();
      facetBlob(ctx, p.x, baseY - s * 0.22, s * 0.15, h ^ 0x73, 6, 0.6);
      ctx.fill();
      // The slab: side face, front arris, then the honest
      // foreshortened TOP PLANE (the 2.5D law for anything
      // that carries things).
      ctx.fillStyle = '#707a80';
      ctx.fillRect(p.x - s * 0.39, topY, s * 0.78, s * 0.15);
      ctx.fillStyle = '#9aa4aa';
      ctx.fillRect(p.x - s * 0.39, topY, s * 0.78, Math.max(1, s * 0.022));
      ctx.fillStyle = '#8b959b';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.39, topY);
      ctx.lineTo(p.x - s * 0.33, topY - syT * 0.3);
      ctx.lineTo(p.x + s * 0.33, topY - syT * 0.3);
      ctx.lineTo(p.x + s * 0.39, topY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(70, 80, 86, 0.55)';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.33, topY - syT * 0.3);
      ctx.lineTo(p.x + s * 0.33, topY - syT * 0.3);
      ctx.lineTo(p.x + s * 0.3, topY - syT * 0.24);
      ctx.lineTo(p.x - s * 0.3, topY - syT * 0.24);
      ctx.closePath();
      ctx.fill();
      // Wave-wear: two pale scour lines along the side face.
      ctx.strokeStyle = 'rgba(154, 164, 170, 0.5)';
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.36, topY + s * 0.06);
      ctx.quadraticCurveTo(p.x, topY + s * 0.085, p.x + s * 0.36, topY + s * 0.055);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.3, topY + s * 0.11);
      ctx.quadraticCurveTo(p.x - s * 0.05, topY + s * 0.13, p.x + s * 0.2, topY + s * 0.105);
      ctx.stroke();
      // The offerings, standing ON the plane: three pearls, a
      // fish laid out straight (a meal given, not dropped), one
      // fan shell.
      const planeY = topY - syT * 0.16;
      ctx.fillStyle = SKR_FISH;
      ctx.beginPath();
      ctx.ellipse(p.x - m * s * 0.13, planeY, s * 0.1, s * 0.026, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = SKR_FISH_DARK;
      ctx.beginPath();
      ctx.moveTo(p.x - m * s * 0.23, planeY);
      ctx.lineTo(p.x - m * s * 0.28, planeY - s * 0.025);
      ctx.lineTo(p.x - m * s * 0.28, planeY + s * 0.025);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2c3438';
      ctx.beginPath();
      ctx.ellipse(p.x - m * s * 0.06, planeY - s * 0.006, s * 0.008, s * 0.008, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let k = 0; k < 3; k++) {
        const pxx = p.x + m * s * (0.02 + k * 0.06) + ((k & 1) === 0 ? 0 : s * 0.01);
        const pyy = planeY + (k === 1 ? -s * 0.028 : s * 0.012);
        ctx.fillStyle = '#e8e6de';
        ctx.beginPath();
        ctx.ellipse(pxx, pyy, s * 0.021, s * 0.019, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.ellipse(pxx - s * 0.006, pyy - s * 0.007, s * 0.006, s * 0.005, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ded5c4';
      ctx.beginPath();
      ctx.moveTo(p.x + m * s * 0.22, planeY + s * 0.01);
      ctx.arc(p.x + m * s * 0.22, planeY, s * 0.032, Math.PI * 0.8, Math.PI * 0.2, true);
      ctx.closePath();
      ctx.fill();
      // The coral takeover: branched fingers climbing the east
      // end, lit at their growing tips — the kit's one warm
      // note, and it's the SEA'S warmth, not a fire's.
      const cx2 = p.x + m * s * 0.34;
      ctx.strokeStyle = SKR_CORAL;
      ctx.lineWidth = Math.max(1.5, s * 0.03);
      for (const [a0, len] of [
        [-0.9, 0.3],
        [-0.45, 0.38],
        [0.05, 0.32],
        [0.5, 0.24],
      ] as const) {
        const bx = cx2 + Math.sin(a0) * s * 0.1;
        const by = baseY - s * 0.06;
        const ex = cx2 + Math.sin(a0) * s * 0.22 + m * s * 0.06;
        const ey = by - s * len;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + m * s * 0.05, by - s * len * 0.6, ex, ey);
        ctx.stroke();
        // A short side-finger halfway up.
        ctx.beginPath();
        ctx.moveTo(bx + (ex - bx) * 0.5, by - s * len * 0.5);
        ctx.lineTo(bx + (ex - bx) * 0.5 + m * s * 0.045, by - s * len * 0.64);
        ctx.stroke();
        ctx.fillStyle = SKR_CORAL_LIT;
        ctx.beginPath();
        ctx.ellipse(ex, ey, s * 0.022, s * 0.02, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // One finger has made the top: over the arris, onto the
      // plane — the reclamation in a single gesture.
      ctx.strokeStyle = SKR_CORAL;
      ctx.lineWidth = Math.max(1.5, s * 0.026);
      ctx.beginPath();
      ctx.moveTo(cx2 + m * s * 0.03, topY + s * 0.02);
      ctx.quadraticCurveTo(cx2 + m * s * 0.01, topY - syT * 0.12, cx2 - m * s * 0.04, topY - syT * 0.18);
      ctx.stroke();
      ctx.fillStyle = SKR_CORAL_LIT;
      ctx.beginPath();
      ctx.ellipse(cx2 - m * s * 0.04, topY - syT * 0.18, s * 0.018, s * 0.015, 0, 0, Math.PI * 2);
      ctx.fill();
      // The breathing glint: mother-of-pearl catching a light
      // that isn't quite the sun's.
      const gl = 0.35 + 0.65 * Math.max(0, Math.sin(t * 1.3 + phase));
      ctx.strokeStyle = `rgba(220, 240, 245, ${(0.7 * gl).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, s * 0.012);
      const gx = p.x + m * s * 0.08;
      const gy = planeY - s * 0.03;
      ctx.beginPath();
      ctx.moveTo(gx - s * 0.035, gy);
      ctx.lineTo(gx + s * 0.035, gy);
      ctx.moveTo(gx, gy - s * 0.035);
      ctx.lineTo(gx, gy + s * 0.035);
      ctx.stroke();
    },
  };
}

function paintCatchBasket(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.22;
  // The day's haul: two woven creels brimming — tails over the
  // rims, one head staring back — and a third tipped on its
  // side, spilling its run of silver toward whoever's asking.
  // Wealth on a bank is counted wet.
  const m = ((h >> 5) & 1) === 0 ? 1 : -1;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.65, 0.85, 0.5),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.38, s * 0.1),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, s * 0.4, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // One creel, woven: tapered body, band-and-rib weave, a
      // lit rim hoop, dark interior. Height varies per basket.
      const creel = (cx3: number, cy3: number, w2: number, hgt: number): void => {
        ctx.fillStyle = SKR_WICKER;
        ctx.beginPath();
        ctx.moveTo(cx3 - w2 * 0.78, cy3);
        ctx.lineTo(cx3 - w2, cy3 - hgt);
        ctx.lineTo(cx3 + w2, cy3 - hgt);
        ctx.lineTo(cx3 + w2 * 0.78, cy3);
        ctx.closePath();
        ctx.fill();
        // The weave: horizontal bands, verticals offset per
        // course — basketry, not barrel staves.
        ctx.strokeStyle = 'rgba(92, 76, 40, 0.6)';
        ctx.lineWidth = Math.max(1, s * 0.012);
        const rows = 3;
        for (let r2 = 1; r2 <= rows; r2++) {
          const fy = cy3 - (hgt * r2) / (rows + 1);
          const fw = w2 * (0.78 + 0.22 * (r2 / (rows + 1)));
          ctx.beginPath();
          ctx.moveTo(cx3 - fw, fy);
          ctx.quadraticCurveTo(cx3, fy + s * 0.02, cx3 + fw, fy);
          ctx.stroke();
          for (let v2 = 0; v2 < 4; v2++) {
            const vx = cx3 - fw * 0.75 + ((v2 + (r2 & 1) * 0.5) * fw * 1.5) / 3.5;
            ctx.beginPath();
            ctx.moveTo(vx, fy - s * 0.008);
            ctx.lineTo(vx, fy + s * 0.025);
            ctx.stroke();
          }
        }
        // Rim: dark mouth behind a lit hoop.
        ctx.fillStyle = '#2e2a22';
        ctx.beginPath();
        ctx.ellipse(cx3, cy3 - hgt, w2, s * 0.045, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = SKR_WICKER_LIT;
        ctx.lineWidth = Math.max(1, s * 0.018);
        ctx.beginPath();
        ctx.ellipse(cx3, cy3 - hgt, w2, s * 0.045, 0, 0, Math.PI * 2);
        ctx.stroke();
      };
      // Back pair first: the tall keeper and the short one.
      creel(p.x - s * 0.17, baseY - s * 0.01, s * 0.15, s * 0.44);
      creel(p.x + s * 0.19, baseY, s * 0.13, s * 0.32);
      // The catch over the rims: tails mid-flip, one head.
      ctx.fillStyle = SKR_FISH;
      for (const [bx2, by2, a2] of [
        [p.x - s * 0.23, baseY - s * 0.47, -0.6],
        [p.x - s * 0.1, baseY - s * 0.49, 0.4],
        [p.x + s * 0.24, baseY - s * 0.35, 0.7],
      ] as const) {
        ctx.save();
        ctx.translate(bx2, by2);
        ctx.rotate(a2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(s * 0.02, -s * 0.05, 0, -s * 0.08);
        ctx.lineTo(-s * 0.035, -s * 0.125);
        ctx.lineTo(0, -s * 0.1);
        ctx.lineTo(s * 0.035, -s * 0.125);
        ctx.lineTo(s * 0.012, -s * 0.075);
        ctx.quadraticCurveTo(s * 0.03, -s * 0.03, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      // The head, staring back over the tall rim.
      ctx.fillStyle = SKR_FISH_BELLY;
      ctx.beginPath();
      ctx.ellipse(p.x - s * 0.15, baseY - s * 0.47, s * 0.038, s * 0.03, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c3438';
      ctx.beginPath();
      ctx.ellipse(p.x - s * 0.14, baseY - s * 0.475, s * 0.01, s * 0.01, 0, 0, Math.PI * 2);
      ctx.fill();
      // The tipped one: mouth to the camera, the run spilled.
      const tpX = p.x + m * s * 0.06;
      const tpY = baseY + s * 0.05;
      ctx.fillStyle = SKR_WICKER;
      ctx.beginPath();
      ctx.moveTo(tpX - m * s * 0.05, tpY - s * 0.15);
      ctx.lineTo(tpX + m * s * 0.24, tpY - s * 0.13);
      ctx.lineTo(tpX + m * s * 0.26, tpY - s * 0.02);
      ctx.lineTo(tpX - m * s * 0.05, tpY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(92, 76, 40, 0.6)';
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (const f of [0.35, 0.7]) {
        ctx.beginPath();
        ctx.moveTo(tpX + m * s * 0.24 * f, tpY - s * 0.14);
        ctx.lineTo(tpX + m * s * 0.26 * f, tpY - s * 0.01);
        ctx.stroke();
      }
      ctx.fillStyle = '#241f1c';
      ctx.beginPath();
      ctx.ellipse(tpX - m * s * 0.05, tpY - s * 0.075, m * s * 0.035, s * 0.078, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = SKR_WICKER_LIT;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.ellipse(tpX - m * s * 0.05, tpY - s * 0.075, m * s * 0.035, s * 0.078, 0, 0, Math.PI * 2);
      ctx.stroke();
      // The spilled run: silver slivers fanned on a wet streak,
      // one scale-tick of light each.
      ctx.fillStyle = 'rgba(120, 150, 160, 0.22)';
      ctx.beginPath();
      ctx.ellipse(tpX - m * s * 0.24, tpY + s * 0.01, s * 0.2, s * 0.05, -m * 0.15, 0, Math.PI * 2);
      ctx.fill();
      for (let k = 0; k < 5; k++) {
        const hs2 = hashCoords(113 + k, tx, ty);
        const fa = -m * (0.5 + ((hs2 % 60) / 100)) ;
        const fd = s * (0.1 + k * 0.055);
        const fx3 = tpX - m * s * 0.06 + Math.cos(fa) * fd * 0.9;
        const fy3 = tpY + s * 0.01 + Math.abs(Math.sin(fa)) * fd * 0.28;
        ctx.save();
        ctx.translate(fx3, fy3);
        ctx.rotate(fa + ((hs2 >> 5) % 40) / 100 - 0.2);
        ctx.fillStyle = (hs2 & 1) === 0 ? SKR_FISH : SKR_FISH_BELLY;
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.055, s * 0.017, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = SKR_FISH_DARK;
        ctx.beginPath();
        ctx.moveTo(s * 0.05, 0);
        ctx.lineTo(s * 0.078, -s * 0.014);
        ctx.lineTo(s * 0.078, s * 0.014);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.ellipse(-s * 0.012, -s * 0.005, s * 0.012, s * 0.005, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    },
  };
}

function paintWhaleRibs(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.22;
  // The landmark: five ribs of something the deepking's line
  // still sings about, arching out of the bank in two ranks —
  // the far rank thinner and dimmer, because distance is a
  // color. Bleached crowns, barnacled roots, one rib snapped to
  // honest end-grain — and a shell string slung between two,
  // because the skral moved in UNDER their ancestor.
  const snapped = ((h >> 7) & 1) === 0;
  return {
    sortY: ty + 0.74,
    body: stationBody(1.1, 2.3, 0.6),
    drawShadow: () => rend.castEdgeQuad(p.x - s * 0.5, baseY, p.x + s * 0.5, baseY, 1.4),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.26)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, s * 0.6, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      // One rib: a TRUE crescent (second-audit law: straight
      // tapers converged into a teepee of planks) — the root
      // stands near-vertical, the belly bows OUTWARD away from
      // the spine, and the worn tip hooks back in over the
      // hollow. Tips never meet: this is an open ribcage the
      // sky fell through, not a tent.
      const rib = (
        rx: number,
        rootY: number,
        dir: number,
        hgt: number,
        w2: number,
        tone: string,
        litEdge: boolean,
        cut = 1,
      ): void => {
        const H = hgt * s * cut;
        const bow = dir * s * 0.3 * (hgt / 1.8);
        const bellyX = rx + bow;
        const bellyY = rootY - H * 0.5;
        const tipX = rx + bow * 0.3 - dir * s * 0.2 * cut;
        const tipY = rootY - H;
        ctx.fillStyle = tone;
        ctx.beginPath();
        ctx.moveTo(rx - w2 * s, rootY);
        ctx.quadraticCurveTo(bellyX - w2 * s * 0.85, bellyY, tipX - w2 * s * 0.3, tipY);
        ctx.lineTo(tipX + w2 * s * 0.3, tipY - s * 0.005);
        ctx.quadraticCurveTo(bellyX + w2 * s * 0.7, bellyY + s * 0.03, rx + w2 * s, rootY);
        ctx.closePath();
        ctx.fill();
        if (litEdge) {
          // One lit lane up the outer sweep keeps the bone round.
          ctx.strokeStyle = '#e6dfc8';
          ctx.lineWidth = Math.max(1, s * 0.022);
          ctx.beginPath();
          ctx.moveTo(rx + dir * w2 * s * 0.55, rootY - s * 0.08);
          ctx.quadraticCurveTo(bellyX + dir * w2 * s * 0.5, bellyY, tipX + dir * w2 * s * 0.1, tipY + s * 0.04);
          ctx.stroke();
        }
        if (cut >= 1) {
          // The crown: a worn knob, not a point.
          ctx.fillStyle = tone;
          ctx.beginPath();
          ctx.ellipse(tipX, tipY, w2 * s * 0.42, s * 0.032, -dir * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Snapped: the end-grain ellipse, paler than the
          // skin — a break is a window into the bone.
          ctx.fillStyle = '#efe9d8';
          ctx.beginPath();
          ctx.ellipse(tipX, tipY, w2 * s * 0.44, s * 0.038, -dir * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(122, 108, 82, 0.6)';
          ctx.lineWidth = Math.max(1, s * 0.01);
          ctx.beginPath();
          ctx.ellipse(tipX, tipY, w2 * s * 0.26, s * 0.022, -dir * 0.4, 0, Math.PI * 2);
          ctx.stroke();
        }
        // The root mound: bank sand piled and barnacled.
        ctx.fillStyle = '#b8a87c';
        ctx.beginPath();
        facetBlob(ctx, rx, rootY - s * 0.015, w2 * s * 1.8, h ^ (Math.round(rx) * 7), 5, 0.5);
        ctx.fill();
        ctx.fillStyle = '#c5bda8';
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.ellipse(
            rx + ((k - 1.5) * w2 * s) / 2,
            rootY - s * (0.05 + (k & 1) * 0.05),
            s * 0.012,
            s * 0.009,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      };
      // Far rank first: three dim ribs rooted a half-step north
      // (distance is a color AND a row).
      const farY = baseY - syT * 0.24;
      rib(p.x - s * 0.55, farY, -1, 1.4, 0.048, '#a29a82', false);
      rib(p.x - s * 0.04, farY, -1, 1.6, 0.052, '#a29a82', false);
      rib(p.x + s * 0.5, farY, 1, 1.35, 0.048, '#a29a82', false);
      // Near rank: two bold ribs facing each other over the
      // hollow, one maybe snapped mid-sweep with its lost crown
      // lying where it landed.
      rib(p.x - s * 0.34, baseY, -1, 1.9, 0.075, DGN_BONE, true);
      rib(p.x + s * 0.32, baseY, 1, 1.75, 0.07, DGN_BONE, true, snapped ? 0.52 : 1);
      // The shell string slung between the two near ribs —
      // strung AFTER them so the camp's claim reads in front of
      // the ancestor's bones.
      const strL = { x: p.x - s * 0.42, y: baseY - s * 1.16 };
      const strR = { x: p.x + s * (snapped ? 0.44 : 0.4), y: baseY - s * (snapped ? 0.78 : 1.08) };
      ctx.strokeStyle = 'rgba(63, 92, 72, 0.8)';
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      ctx.moveTo(strL.x, strL.y);
      ctx.quadraticCurveTo((strL.x + strR.x) / 2, Math.max(strL.y, strR.y) + s * 0.24, strR.x, strR.y);
      ctx.stroke();
      ctx.fillStyle = '#ded5c4';
      for (let k = 1; k < 6; k++) {
        const tt = k / 6;
        const sx2 = strL.x + (strR.x - strL.x) * tt;
        // Shells ride the string's own catenary sag.
        const sagY = strL.y * (1 - tt) + strR.y * tt + s * 0.2 * 4 * tt * (1 - tt);
        ctx.beginPath();
        ctx.ellipse(sx2, sagY, s * 0.016, s * 0.021, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (snapped) {
        // The fallen crown: a crescent of bone in the sand,
        // end-grain up.
        ctx.save();
        ctx.translate(p.x + s * 0.52, baseY + s * 0.02);
        ctx.rotate(-0.9);
        ctx.fillStyle = DGN_BONE_DIM;
        ctx.beginPath();
        ctx.moveTo(-s * 0.16, 0);
        ctx.quadraticCurveTo(0, -s * 0.09, s * 0.16, -s * 0.02);
        ctx.quadraticCurveTo(0, -s * 0.02, -s * 0.16, s * 0.028);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#efe9d8';
        ctx.beginPath();
        ctx.ellipse(-s * 0.155, s * 0.012, s * 0.022, s * 0.028, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // The tide-damp streak the whole monument stands in.
      ctx.fillStyle = 'rgba(52, 62, 60, 0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x + s * 0.05, baseY + s * 0.04, s * 0.55, s * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}


// ================ THE CRAFTSMEN OF THE BANKS ================
// Ten pieces of working-village gear, ids 381-390
// (docs/skral-decor-plan.md, second shelf): the layer that says
// people LIVE here and work the water for a living. Same voice,
// same laws as the first twelve — found, never felled; kelp for
// rope, bone for iron; wet at the ground line.
function paintReedShelter(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.26;
  // The shoal's dwelling: a low arched coat of reed bundles
  // bent over a withy frame, ridge across the screen, the dark
  // door mouth facing the path. The 2.5D law holds: the roof
  // shows its foreshortened top plane, lit along the ridge.
  // PASS-TWO VERDICT — A HOUSE MUST HOLD ITS TENANT: the first
  // build stood waist-high to the ruler; a dwelling the skral
  // can enter needs the full body-and-a-bit of height.
  const hw = s * 0.92;
  const ridgeY = baseY - s * 1.38;
  const flapUp = ((h >> 3) & 3) !== 0; // most doors stand open
  const stringed = ((h >> 6) & 3) === 0; // some hang a shell string
  return {
    sortY: ty + 0.7,
    body: stationBody(1.0, 1.85, 0.55),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.05, s * 0.11),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.08, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // Damp seep where the thatch sheds to the ground.
      ctx.fillStyle = 'rgba(52, 62, 60, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, hw * 0.95, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      // The reed coat: one arched hull, darkest at the eaves.
      ctx.fillStyle = SKR_REED_DARK;
      ctx.beginPath();
      ctx.moveTo(p.x - hw, baseY);
      ctx.quadraticCurveTo(p.x - hw * 1.04, ridgeY + s * 0.16, p.x - hw * 0.42, ridgeY);
      ctx.lineTo(p.x + hw * 0.42, ridgeY);
      ctx.quadraticCurveTo(p.x + hw * 1.04, ridgeY + s * 0.16, p.x + hw, baseY);
      ctx.closePath();
      ctx.fill();
      // The south face in the body tone over it.
      ctx.fillStyle = SKR_REED;
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.92, baseY);
      ctx.quadraticCurveTo(p.x - hw * 0.95, ridgeY + s * 0.22, p.x - hw * 0.4, ridgeY + s * 0.07);
      ctx.lineTo(p.x + hw * 0.4, ridgeY + s * 0.07);
      ctx.quadraticCurveTo(p.x + hw * 0.95, ridgeY + s * 0.22, p.x + hw * 0.92, baseY);
      ctx.closePath();
      ctx.fill();
      // THE TOP PLANE: the ridge cap reads as a lit roof strip —
      // tall casework must show a foreshortened top (scale law).
      ctx.fillStyle = SKR_REED_LIT;
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.42, ridgeY + s * 0.005);
      ctx.quadraticCurveTo(p.x, ridgeY - s * 0.085, p.x + hw * 0.42, ridgeY + s * 0.005);
      ctx.quadraticCurveTo(p.x, ridgeY + s * 0.075, p.x - hw * 0.42, ridgeY + s * 0.005);
      ctx.fill();
      // Reed-bundle seams: vertical strokes down the coat, the
      // thatch's grain (never planks — nothing here was sawn).
      ctx.strokeStyle = SKR_REED_DARK;
      ctx.lineWidth = Math.max(1, s * 0.016);
      for (let k = 0; k < 7; k++) {
        const rx = p.x + (k - 3) * hw * 0.27 + (((h >> k) & 3) - 1.5) * s * 0.01;
        ctx.beginPath();
        ctx.moveTo(rx, ridgeY + s * (0.1 + Math.abs(k - 3) * 0.016));
        ctx.quadraticCurveTo(rx * 0.995 + p.x * 0.005, baseY - s * 0.34, rx + Math.sign(k - 3) * s * 0.05, baseY - s * 0.02);
        ctx.stroke();
      }
      // Two kelp lashing bands holding the coat to the frame.
      ctx.strokeStyle = SKR_KELP;
      ctx.lineWidth = Math.max(1, s * 0.024);
      for (const bandT of [0.36, 0.68]) {
        const by = ridgeY + (baseY - ridgeY) * bandT;
        const bw = hw * (0.5 + bandT * 0.45);
        ctx.beginPath();
        ctx.moveTo(p.x - bw, by);
        ctx.quadraticCurveTo(p.x, by + s * 0.045, p.x + bw, by);
        ctx.stroke();
      }
      ctx.strokeStyle = SKR_KELP_LIT;
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.5, ridgeY + (baseY - ridgeY) * 0.36 - s * 0.012);
      ctx.quadraticCurveTo(p.x, ridgeY + (baseY - ridgeY) * 0.36 + s * 0.03, p.x + hw * 0.3, ridgeY + (baseY - ridgeY) * 0.36 - s * 0.006);
      ctx.stroke();
      // THE MOUTH: the door hollow keeps its far inner wall — a
      // dark pit is a hole in the bank, never a void (kit law).
      const doorW = hw * 0.32;
      ctx.fillStyle = '#2e3330';
      ctx.beginPath();
      ctx.moveTo(p.x - doorW, baseY);
      ctx.quadraticCurveTo(p.x - doorW * 1.05, baseY - s * 0.72, p.x, baseY - s * 0.84);
      ctx.quadraticCurveTo(p.x + doorW * 1.05, baseY - s * 0.72, p.x + doorW, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#454d44';
      ctx.beginPath();
      ctx.moveTo(p.x - doorW * 0.6, baseY);
      ctx.quadraticCurveTo(p.x, baseY - s * 0.46, p.x + doorW * 0.6, baseY);
      ctx.closePath();
      ctx.fill();
      // The kelp bedding just inside — somebody sleeps here.
      ctx.fillStyle = SKR_KELP;
      ctx.beginPath();
      ctx.ellipse(p.x + doorW * 0.2, baseY - s * 0.05, doorW * 0.42, s * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      if (flapUp) {
        // The woven flap rolled up over the lintel.
        ctx.fillStyle = SKR_WICKER;
        ctx.beginPath();
        ctx.ellipse(p.x, baseY - s * 0.82, doorW * 1.02, s * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = SKR_WICKER_LIT;
        ctx.beginPath();
        ctx.ellipse(p.x - doorW * 0.3, baseY - s * 0.835, doorW * 0.5, s * 0.03, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Dropped: the weave hangs across most of the mouth.
        ctx.fillStyle = SKR_WICKER;
        ctx.beginPath();
        ctx.moveTo(p.x - doorW * 0.9, baseY - s * 0.72);
        ctx.lineTo(p.x + doorW * 0.9, baseY - s * 0.72);
        ctx.lineTo(p.x + doorW * 0.75, baseY - s * 0.06);
        ctx.lineTo(p.x - doorW * 0.75, baseY - s * 0.06);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = SKR_WICKER_LIT;
        ctx.lineWidth = Math.max(1, s * 0.012);
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(p.x - doorW * 0.8, baseY - s * (0.58 - k * 0.18));
          ctx.lineTo(p.x + doorW * 0.8, baseY - s * (0.6 - k * 0.18));
          ctx.stroke();
        }
      }
      if (stringed) {
        // A short shell string over the door — the household
        // charm (hung plumb: strings HANG, never splay).
        ctx.strokeStyle = 'rgba(214, 220, 204, 0.55)';
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.moveTo(p.x + doorW * 0.7, baseY - s * 0.86);
        ctx.lineTo(p.x + doorW * 0.7, baseY - s * 0.6);
        ctx.stroke();
        ctx.fillStyle = DGN_BONE;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.ellipse(p.x + doorW * 0.7, baseY - s * (0.8 - k * 0.08), s * 0.019, s * 0.016, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // One dry frond tucked into the ridge, and the drip beads.
      ctx.strokeStyle = SKR_KELP_LIT;
      ctx.lineWidth = Math.max(1, s * 0.018);
      ctx.beginPath();
      ctx.moveTo(p.x + hw * 0.3, ridgeY + s * 0.02);
      ctx.quadraticCurveTo(p.x + hw * 0.42, ridgeY - s * 0.12, p.x + hw * 0.52, ridgeY - s * 0.04);
      ctx.stroke();
      ctx.fillStyle = 'rgba(178, 208, 216, 0.45)';
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.55, baseY + s * 0.005, s * 0.013, s * 0.01, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintSmokeTripod(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // The smoker: three driftwood poles lashed at the crown over
  // a banked ember bed, the day's catch hung INSIDE the cone
  // where the smoke lives. The wisps ride offset clocks under
  // 4Hz — the cached ring carries them.
  // PASS-TWO VERDICT — THE SMOKE IS THE READ: the first build's
  // wisps vanished in a still frame; a smoker that reads
  // smokeless is just sticks. The column got body and the
  // embers got their coal-light.
  const crownY = baseY - s * 1.15;
  const fishN = 2 + ((h >> 7) & 1);
  return {
    sortY: ty + 0.7,
    // THE SMOKE IS THE READ — and the bounds must hold the smoke:
    // the standing haze tops out near baseY − 1.9s, and the old
    // 1.4 rise guillotined the plume at a hard horizontal.
    body: stationBody(0.6, 2.05, 0.45),
    drawShadow: () => rend.castContact(p.x, baseY, s * 0.42, s * 0.08),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, s * 0.44, s * 0.075, 0, 0, Math.PI * 2);
      ctx.fill();
      // The ember bed: a scraped ring of bank sand, coals
      // banked low — painted warmth only, no light entry (the
      // night hierarchy stays: one street light, one shrine).
      ctx.fillStyle = '#6a6154';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.02, s * 0.26, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38302c';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.03, s * 0.18, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      // The coal-light: a warm painted pool under the bed (no
      // light entry — the hierarchy holds), then the embers.
      ctx.fillStyle = 'rgba(216, 120, 70, 0.13)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.03, s * 0.2, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      const embers = [
        [-0.08, -0.02, 0.75],
        [0.06, -0.05, 0.95],
        [0.0, -0.01, 0.6],
        [-0.02, -0.055, 0.5],
      ] as const;
      for (const [ex, ey, a] of embers) {
        const breathe = 0.75 + Math.sin(t * 1.6 + h % 7 + ex * 30) * 0.25;
        ctx.fillStyle = `rgba(224, 132, 76, ${a * breathe})`;
        ctx.beginPath();
        ctx.ellipse(p.x + ex * s, baseY + ey * s, s * 0.03, s * 0.02, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(244, 180, 110, 0.85)';
      ctx.beginPath();
      ctx.ellipse(p.x + s * 0.055, baseY - s * 0.055, s * 0.013, s * 0.009, 0, 0, Math.PI * 2);
      ctx.fill();
      // The tripod: three worn poles, knobs up, kelp-lashed at
      // the crown. The far leg first, thinner and dimmer.
      ctx.strokeStyle = SKR_DRIFT_DARK;
      ctx.lineWidth = Math.max(1.5, s * 0.038);
      ctx.beginPath();
      ctx.moveTo(p.x + s * 0.02, baseY - s * 0.16);
      ctx.lineTo(p.x + s * 0.01, crownY);
      ctx.stroke();
      for (const m of [-1, 1] as const) {
        ctx.strokeStyle = SKR_DRIFT;
        ctx.lineWidth = Math.max(1.5, s * 0.048);
        ctx.beginPath();
        ctx.moveTo(p.x + m * s * 0.34, baseY);
        ctx.quadraticCurveTo(p.x + m * s * 0.2, baseY - s * 0.5, p.x + m * s * 0.045, crownY);
        ctx.stroke();
        ctx.strokeStyle = SKR_DRIFT_LIT;
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(p.x + m * s * 0.325, baseY - s * 0.08);
        ctx.quadraticCurveTo(p.x + m * s * 0.19, baseY - s * 0.5, p.x + m * s * 0.04, crownY + s * 0.04);
        ctx.stroke();
        ctx.fillStyle = SKR_DRIFT_LIT;
        ctx.beginPath();
        ctx.ellipse(p.x + m * s * 0.05, crownY - s * 0.015, s * 0.026, s * 0.022, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // The crown lash.
      ctx.strokeStyle = SKR_KELP;
      ctx.lineWidth = Math.max(1, s * 0.026);
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.06, crownY + s * (0.03 + k * 0.024));
        ctx.lineTo(p.x + s * 0.06, crownY + s * (0.02 + k * 0.024));
        ctx.stroke();
      }
      ctx.strokeStyle = SKR_KELP_LIT;
      ctx.lineWidth = Math.max(1, s * 0.013);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.05, crownY + s * 0.032);
      ctx.lineTo(p.x + s * 0.04, crownY + s * 0.025);
      ctx.stroke();
      // The catch in the smoke: small split fish on gut drops
      // inside the cone — leaf bodies, forks, two-tone (a fish
      // must read as a fish, at every size).
      for (let k = 0; k < fishN; k++) {
        const fx2 = p.x + (k - (fishN - 1) / 2) * s * 0.14;
        const fy = crownY + s * (0.22 + ((h >> (k * 2)) & 1) * 0.05);
        ctx.strokeStyle = 'rgba(214, 220, 204, 0.5)';
        ctx.lineWidth = Math.max(1, s * 0.008);
        ctx.beginPath();
        ctx.moveTo(fx2, crownY + s * 0.06);
        ctx.lineTo(fx2, fy);
        ctx.stroke();
        const fl = s * 0.2;
        ctx.fillStyle = SKR_FISH_DARK;
        ctx.beginPath();
        ctx.moveTo(fx2, fy);
        ctx.lineTo(fx2 - s * 0.03, fy - s * 0.035);
        ctx.lineTo(fx2, fy - s * 0.01);
        ctx.lineTo(fx2 + s * 0.03, fy - s * 0.035);
        ctx.closePath();
        ctx.fill();
        // Smoked flanks cure darker than the drying rack's.
        ctx.fillStyle = '#9aa39b';
        ctx.beginPath();
        ctx.moveTo(fx2, fy);
        ctx.quadraticCurveTo(fx2 - s * 0.055, fy + fl * 0.45, fx2 - s * 0.016, fy + fl);
        ctx.quadraticCurveTo(fx2, fy + fl * 1.1, fx2 + s * 0.016, fy + fl);
        ctx.quadraticCurveTo(fx2 + s * 0.055, fy + fl * 0.45, fx2, fy);
        ctx.fill();
        ctx.fillStyle = '#c6cfc4';
        ctx.beginPath();
        ctx.moveTo(fx2 - s * 0.003, fy + s * 0.01);
        ctx.quadraticCurveTo(fx2 - s * 0.045, fy + fl * 0.45, fx2 - s * 0.013, fy + fl * 0.96);
        ctx.lineTo(fx2 - s * 0.002, fy + fl * 0.9);
        ctx.closePath();
        ctx.fill();
      }
      // THE SMOKE: a standing haze column through the cone (the
      // read a still frame keeps), and four wisps on offset
      // clocks rising through it, fattening and thinning away.
      ctx.fillStyle = 'rgba(182, 192, 194, 0.14)';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.07, baseY - s * 0.18);
      ctx.quadraticCurveTo(p.x - s * 0.13, crownY - s * 0.35, p.x - s * 0.04, crownY - s * 0.72);
      ctx.lineTo(p.x + s * 0.1, crownY - s * 0.7);
      ctx.quadraticCurveTo(p.x + s * 0.12, crownY - s * 0.2, p.x + s * 0.08, baseY - s * 0.18);
      ctx.closePath();
      ctx.fill();
      for (let k = 0; k < 4; k++) {
        const ph = (t * 0.24 + k * 0.27 + (h % 83) * 0.012) % 1;
        const wx = p.x + Math.sin(ph * 4.6 + k * 2.1) * s * (0.04 + ph * 0.09);
        const wy = baseY - s * 0.2 - ph * s * 1.55;
        ctx.fillStyle = `rgba(186, 196, 198, ${(1 - ph) * 0.3})`;
        ctx.beginPath();
        ctx.ellipse(wx, wy, s * (0.06 + ph * 0.12), s * (0.045 + ph * 0.08), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}

function paintMendingBench(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // The net-mender's seat: a driftwood slab on two stone
  // footings, the work spread mid-repair — a torn gap half
  // re-laced in paler cord, the bone needle parked upright.
  // Nets are wealth; somebody sits here every evening.
  const hw = s * 0.52;
  const topY = baseY - s * 0.38;
  const m = ((h >> 4) & 1) === 0 ? 1 : -1; // which side spills
  return {
    sortY: ty + 0.7,
    body: stationBody(0.72, 0.75, 0.45),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.1, s * 0.08),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.12, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      // Stone footings — wave-rounded, never quarried.
      ctx.fillStyle = '#6a747a';
      for (const ex of [-hw * 0.72, hw * 0.72]) {
        ctx.beginPath();
        facetBlob(ctx, p.x + ex, baseY - s * 0.12, s * 0.09, h ^ Math.round(ex), 6, 0.72);
        ctx.fill();
      }
      ctx.fillStyle = '#7d868b';
      ctx.beginPath();
      facetBlob(ctx, p.x - hw * 0.72, baseY - s * 0.16, s * 0.055, h ^ 91, 5, 0.7);
      ctx.fill();
      // The slab: one thick worn plank of surf-wood, its top
      // plane lit (foreshortened — the 2.5D read).
      ctx.fillStyle = SKR_DRIFT_DARK;
      ctx.beginPath();
      ctx.moveTo(p.x - hw - s * 0.06, topY + s * 0.1);
      ctx.lineTo(p.x + hw + s * 0.06, topY + s * 0.1);
      ctx.lineTo(p.x + hw + s * 0.04, topY + s * 0.2);
      ctx.lineTo(p.x - hw - s * 0.04, topY + s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = SKR_DRIFT;
      ctx.beginPath();
      ctx.moveTo(p.x - hw - s * 0.07, topY);
      ctx.lineTo(p.x + hw + s * 0.07, topY);
      ctx.lineTo(p.x + hw + s * 0.06, topY + s * 0.105);
      ctx.lineTo(p.x - hw - s * 0.06, topY + s * 0.105);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = SKR_DRIFT_LIT;
      ctx.beginPath();
      ctx.moveTo(p.x - hw - s * 0.07, topY);
      ctx.lineTo(p.x + hw + s * 0.07, topY);
      ctx.lineTo(p.x + hw + s * 0.02, topY + s * 0.032);
      ctx.lineTo(p.x - hw - s * 0.02, topY + s * 0.032);
      ctx.closePath();
      ctx.fill();
      // The net across the slab — PASS-TWO VERDICT: A NET
      // DRAPES, NEVER BRISTLES. The first build's bare mesh
      // strokes over the slab read as a row of teeth; the net
      // is now a soft-bodied CLOTH first (one pale-green fill
      // with a draped outline), and the diamond mesh lives
      // INSIDE it — the hung-net painter's own law.
      const netBody = (path: () => void, tone: string, meshTone: string, skew: number): void => {
        ctx.save();
        ctx.beginPath();
        path();
        ctx.fillStyle = tone;
        ctx.fill();
        ctx.clip();
        ctx.strokeStyle = meshTone;
        ctx.lineWidth = Math.max(1, s * 0.01);
        const step = s * 0.06;
        for (let i = -10; i <= 10; i++) {
          ctx.beginPath();
          ctx.moveTo(p.x + i * step, topY - s * 0.2);
          ctx.lineTo(p.x + i * step + skew, baseY + s * 0.05);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(p.x + i * step, topY - s * 0.2);
          ctx.lineTo(p.x + i * step - skew, baseY + s * 0.05);
          ctx.stroke();
        }
        ctx.restore();
      };
      // Over the slab: a soft heap with a sagging front hem.
      netBody(
        () => {
          ctx.moveTo(p.x - hw * 0.85, topY + s * 0.02);
          ctx.quadraticCurveTo(p.x - hw * 0.3, topY - s * 0.085, p.x + hw * 0.5, topY - s * 0.05);
          ctx.quadraticCurveTo(p.x + hw * 0.9, topY - s * 0.015, p.x + hw * 0.82, topY + s * 0.07);
          ctx.quadraticCurveTo(p.x, topY + s * 0.11, p.x - hw * 0.85, topY + s * 0.02);
        },
        'rgba(112, 140, 110, 0.9)',
        'rgba(58, 82, 62, 0.75)',
        s * 0.28,
      );
      // The spill down one side, pooling at the foot.
      netBody(
        () => {
          ctx.moveTo(p.x + m * hw * 0.55, topY + s * 0.04);
          ctx.quadraticCurveTo(p.x + m * hw * 0.85, (topY + baseY) / 2, p.x + m * hw * 0.62, baseY - s * 0.03);
          ctx.quadraticCurveTo(p.x + m * hw * 0.3, baseY + s * 0.045, p.x + m * hw * 0.08, baseY - s * 0.02);
          ctx.quadraticCurveTo(p.x + m * hw * 0.22, (topY + baseY) / 2, p.x + m * hw * 0.18, topY + s * 0.06);
          ctx.closePath();
        },
        'rgba(96, 124, 96, 0.85)',
        'rgba(52, 74, 56, 0.7)',
        s * 0.22,
      );
      // Cork floats riding the hem — the net's own jewelry.
      ctx.fillStyle = SKR_WICKER_LIT;
      for (const [fx4, fy4] of [
        [-hw * 0.6, topY + s * 0.035],
        [m * hw * 0.4, baseY - s * 0.05],
      ] as const) {
        ctx.beginPath();
        ctx.ellipse(p.x + fx4, fy4, s * 0.028, s * 0.022, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // THE REPAIR: the torn gap half re-laced in paler cord —
      // the work is IN PROGRESS, that is the whole read.
      ctx.strokeStyle = '#c9d3b8';
      ctx.lineWidth = Math.max(1, s * 0.014);
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(p.x - m * hw * 0.34 + k * s * 0.04 * m, topY + s * 0.012);
        ctx.lineTo(p.x - m * hw * 0.34 + (k + 0.5) * s * 0.04 * m, topY + s * 0.075);
        ctx.stroke();
      }
      // The bone needle parked upright in the slab.
      ctx.strokeStyle = DGN_BONE;
      ctx.lineWidth = Math.max(1.5, s * 0.024);
      ctx.beginPath();
      ctx.moveTo(p.x - m * hw * 0.55, topY + s * 0.02);
      ctx.lineTo(p.x - m * hw * 0.62, topY - s * 0.2);
      ctx.stroke();
      ctx.fillStyle = DGN_BONE_DIM;
      ctx.beginPath();
      ctx.ellipse(p.x - m * hw * 0.625, topY - s * 0.21, s * 0.02, s * 0.026, 0, 0, Math.PI * 2);
      ctx.fill();
      // Cord spool (a wound stick) and one cork float waiting.
      ctx.fillStyle = SKR_KELP;
      ctx.fillRect(p.x + m * hw * 0.62 - s * 0.045, topY - s * 0.075, s * 0.09, s * 0.075);
      ctx.strokeStyle = SKR_KELP_LIT;
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(p.x + m * hw * 0.62 - s * 0.045, topY - s * (0.06 - k * 0.022));
        ctx.lineTo(p.x + m * hw * 0.62 + s * 0.045, topY - s * (0.065 - k * 0.022));
        ctx.stroke();
      }
      ctx.fillStyle = SKR_WICKER_LIT;
      ctx.beginPath();
      ctx.ellipse(p.x + m * hw * 0.4, topY - s * 0.035, s * 0.032, s * 0.026, 0, 0, Math.PI * 2);
      ctx.fill();
      // Damp ring where the wet net drips off the spill side.
      ctx.fillStyle = 'rgba(52, 62, 60, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x + m * hw * 0.3, baseY + s * 0.005, s * 0.2, s * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintWeirPanels(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.22;
  // The camp's namesake, dry-land half: two woven hurdle
  // panels meeting at a funnel gap — the trap that works while
  // the shoal sleeps. Stake tops worn round, weave in long
  // horizontal strokes, the gap dark like the trap mouths.
  const hw = s * 0.62;
  const topY = baseY - s * 0.62;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.8, 0.95, 0.45),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.05, s * 0.08),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.06, s * 0.075, 0, 0, Math.PI * 2);
      ctx.fill();
      // The wet working line: this piece lives half in the
      // shallows even when stamped dry — puddle glints at foot.
      ctx.fillStyle = 'rgba(96, 130, 138, 0.3)';
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.4, baseY + s * 0.01, s * 0.16, s * 0.04, 0, 0, Math.PI * 2);
      ctx.ellipse(p.x + hw * 0.5, baseY - s * 0.005, s * 0.12, s * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();
      // Two panels angling back to the funnel gap at center.
      // PASS-TWO VERDICT — A HURDLE IS WOVEN, NOT PLANKED: the
      // first build's straight rows read as crate boards. The
      // weave now shows its VERTICAL ribs threading sagging
      // horizontals, the top hem droops between stakes, and
      // the stakes stand proud of the panel.
      const panel = (x0: number, x1: number, y0: number, y1: number, seed2: number): void => {
        const bY0 = baseY;
        const bY1 = baseY - s * 0.02;
        // The woven field, top hem SAGGING between the stakes.
        ctx.fillStyle = SKR_WICKER;
        ctx.beginPath();
        ctx.moveTo(x0, bY0);
        ctx.lineTo(x0, y0);
        ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + s * 0.09, x1, y1);
        ctx.lineTo(x1, bY1);
        ctx.closePath();
        ctx.fill();
        // Sagging horizontal withies.
        ctx.strokeStyle = '#8a7648';
        ctx.lineWidth = Math.max(1, s * 0.016);
        for (let k = 1; k < 4; k++) {
          const f = k / 4;
          ctx.beginPath();
          ctx.moveTo(x0, y0 + (bY0 - y0) * f);
          ctx.quadraticCurveTo((x0 + x1) / 2, y1 + (bY1 - y1) * f + s * 0.055, x1, y1 + (bY1 - y1) * f);
          ctx.stroke();
        }
        // THE RIBS: vertical withies threading the rows — the
        // over-under is the whole craft.
        const ribN = 4;
        for (let k = 0; k < ribN; k++) {
          const f = (k + 0.7) / (ribN + 0.6);
          const rxTop = x0 + (x1 - x0) * f;
          const sagT = y0 + (y1 - y0) * f + Math.sin(f * Math.PI) * s * 0.085;
          ctx.strokeStyle = ((seed2 >> k) & 1) === 0 ? '#93804a' : SKR_WICKER_LIT;
          ctx.lineWidth = Math.max(1, s * 0.02);
          ctx.beginPath();
          ctx.moveTo(rxTop, sagT + s * 0.02);
          ctx.quadraticCurveTo(rxTop + s * 0.012, (sagT + bY0) / 2, rxTop - s * 0.008, bY0 - s * 0.015);
          ctx.stroke();
        }
        // The lit hem along the sag.
        ctx.strokeStyle = SKR_WICKER_LIT;
        ctx.lineWidth = Math.max(1, s * 0.018);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + s * 0.088, x1, y1);
        ctx.stroke();
        // Stakes: driven PROUD of the weave, worn tops, one
        // lit edge each — posts first, panel hung between.
        for (const [sx2, sy2] of [
          [x0, y0],
          [x1, y1],
        ] as const) {
          ctx.strokeStyle = SKR_DRIFT;
          ctx.lineWidth = Math.max(1.5, s * 0.045);
          ctx.beginPath();
          ctx.moveTo(sx2, baseY + s * 0.01);
          ctx.lineTo(sx2, sy2 - s * 0.16);
          ctx.stroke();
          ctx.strokeStyle = SKR_DRIFT_LIT;
          ctx.lineWidth = Math.max(1, s * 0.014);
          ctx.beginPath();
          ctx.moveTo(sx2 - s * 0.012, baseY - s * 0.04);
          ctx.lineTo(sx2 - s * 0.012, sy2 - s * 0.13);
          ctx.stroke();
          ctx.fillStyle = SKR_DRIFT_LIT;
          ctx.beginPath();
          ctx.ellipse(sx2, sy2 - s * 0.17, s * 0.026, s * 0.022, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      // Left panel runs toward the center-back; right mirrors,
      // leaving the funnel gap between their inner stakes.
      panel(p.x - hw, p.x - s * 0.12, topY, topY - s * 0.12, h);
      panel(p.x + hw, p.x + s * 0.12, topY, topY - s * 0.12, h ^ 977);
      // THE GAP: the funnel's dark mouth — nothing painted flat
      // has an opening; the dark IS the depth argument.
      ctx.fillStyle = '#2e3330';
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.085, topY - s * 0.08);
      ctx.lineTo(p.x + s * 0.085, topY - s * 0.08);
      ctx.lineTo(p.x + s * 0.06, baseY - s * 0.02);
      ctx.lineTo(p.x - s * 0.06, baseY - s * 0.02);
      ctx.closePath();
      ctx.fill();
      // One silver stray flagging at the gap on some panels.
      if (((h >> 8) & 3) === 0) {
        ctx.fillStyle = SKR_FISH;
        ctx.beginPath();
        ctx.ellipse(p.x + s * 0.01, baseY - s * 0.08, s * 0.05, s * 0.02, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = SKR_FISH_DARK;
        ctx.beginPath();
        ctx.moveTo(p.x + s * 0.05, baseY - s * 0.06);
        ctx.lineTo(p.x + s * 0.09, baseY - s * 0.1);
        ctx.lineTo(p.x + s * 0.08, baseY - s * 0.04);
        ctx.closePath();
        ctx.fill();
      }
      // The kelp ties binding weave to stakes.
      ctx.strokeStyle = SKR_KELP;
      ctx.lineWidth = Math.max(1, s * 0.018);
      for (const kx of [-hw, -s * 0.1, s * 0.1, hw]) {
        ctx.beginPath();
        ctx.moveTo(p.x + kx - s * 0.03, topY + s * 0.06);
        ctx.lineTo(p.x + kx + s * 0.03, topY + s * 0.045);
        ctx.stroke();
      }
    },
  };
}

function paintKelpLine(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // The winter larder: kelp fronds over a sagging cord between
  // two leaning poles — food, cordage, and thatch all cure on
  // the same line. The fronds ride one slow breeze clock.
  const hw = s * 0.58;
  const tipY = baseY - s * 1.05;
  const phase = tx * 1.7 + ty * 2.9;
  const frondN = 4 + ((h >> 6) & 1);
  return {
    sortY: ty + 0.7,
    body: stationBody(0.75, 1.35, 0.45),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.0, s * 0.08),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.02, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      // The poles lean OUT — tension is the joinery here.
      for (const m of [-1, 1] as const) {
        ctx.strokeStyle = SKR_DRIFT;
        ctx.lineWidth = Math.max(1.5, s * 0.05);
        ctx.beginPath();
        ctx.moveTo(p.x + m * hw * 0.82, baseY);
        ctx.quadraticCurveTo(p.x + m * hw * 0.98, baseY - s * 0.55, p.x + m * hw * 1.05, tipY + s * 0.06);
        ctx.stroke();
        ctx.strokeStyle = SKR_DRIFT_LIT;
        ctx.lineWidth = Math.max(1, s * 0.018);
        ctx.beginPath();
        ctx.moveTo(p.x + m * hw * 0.81 - s * 0.01, baseY - s * 0.08);
        ctx.quadraticCurveTo(p.x + m * hw * 0.97, baseY - s * 0.55, p.x + m * hw * 1.04 - s * 0.01, tipY + s * 0.08);
        ctx.stroke();
        ctx.fillStyle = SKR_DRIFT_LIT;
        ctx.beginPath();
        ctx.ellipse(p.x + m * hw * 1.05, tipY + s * 0.05, s * 0.026, s * 0.022, 0, 0, Math.PI * 2);
        ctx.fill();
        // The heel stones pinning each butt.
        ctx.fillStyle = '#6a747a';
        ctx.beginPath();
        facetBlob(ctx, p.x + m * hw * 0.74, baseY - s * 0.015, s * 0.05, h ^ (m * 53), 5, 0.7);
        ctx.fill();
      }
      // The cord, sagging under the crop.
      ctx.strokeStyle = SKR_KELP;
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 1.04, tipY + s * 0.06);
      ctx.quadraticCurveTo(p.x, tipY + s * 0.16, p.x + hw * 1.04, tipY + s * 0.06);
      ctx.stroke();
      // THE CROP: long olive straps with holdfast bulbs at the
      // hung end, each on its own sway phase — the body of the
      // frond swings as one piece (secondary read, never a
      // screen trick).
      for (let k = 0; k < frondN; k++) {
        // The crop spreads the WHOLE line (pass three: bunched
        // fronds read as a cage — a line must read as a line).
        const f = (k + 0.5) / frondN;
        const fx2 = p.x - hw * 1.0 + f * hw * 2.0;
        const cordY = tipY + s * 0.06 + Math.sin(f * Math.PI) * s * 0.11;
        const sway = Math.sin(t * 0.9 + phase + k * 1.7) * 0.06 + Math.sin(t * 0.53 + k) * 0.03;
        const fl = s * (0.5 + ((h >> (k * 2)) & 3) * 0.055);
        ctx.save();
        ctx.translate(fx2, cordY);
        ctx.rotate(sway);
        // The strap: two long curves, dark then lit half.
        ctx.fillStyle = SKR_KELP;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-s * 0.052, fl * 0.5, -s * 0.012, fl);
        ctx.quadraticCurveTo(0, fl * 1.06, s * 0.012, fl);
        ctx.quadraticCurveTo(s * 0.052, fl * 0.5, 0, 0);
        ctx.fill();
        ctx.fillStyle = SKR_KELP_LIT;
        ctx.beginPath();
        ctx.moveTo(-s * 0.002, s * 0.02);
        ctx.quadraticCurveTo(-s * 0.04, fl * 0.5, -s * 0.01, fl * 0.94);
        ctx.lineTo(-s * 0.001, fl * 0.86);
        ctx.closePath();
        ctx.fill();
        // Curl notch and holdfast bulb at the tip.
        ctx.strokeStyle = SKR_KELP_LIT;
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(s * 0.008, fl * 0.3);
        ctx.quadraticCurveTo(s * 0.03, fl * 0.44, s * 0.008, fl * 0.58);
        ctx.stroke();
        ctx.fillStyle = SKR_REED_DARK;
        ctx.beginPath();
        ctx.ellipse(0, fl + s * 0.02, s * 0.023, s * 0.02, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // One fallen frond drying on the ground its own way.
      ctx.fillStyle = SKR_KELP;
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.3, baseY - s * 0.015, s * 0.16, s * 0.032, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = SKR_KELP_LIT;
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.36, baseY - s * 0.025, s * 0.07, s * 0.014, 0.15, 0, Math.PI * 2);
      ctx.fill();
      // The drip line the wet crop keeps.
      ctx.fillStyle = 'rgba(52, 62, 60, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY, hw * 0.8, s * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintSaltPan(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The salt work: a shallow clay-and-stone basin of brine
  // evaporating to crust — the white creeps inward from the
  // rim, and the middle still holds the sky. The scraper rests
  // where the last shift left it. Salt is the bank's money.
  // PASS-TWO VERDICT — THE PAN IS A WORKS, NOT A SAUCER: the
  // first build read as a dropped plate; a season's pay needs
  // a basin the ruler could wade.
  const rx = s * 0.74;
  const ry = s * 0.36;
  return {
    sortY: ty + 0.62,
    body: stationBody(0.85, 0.6, 0.55),
    drawShadow: () => rend.castContact(p.x, baseY, rx * 1.05, s * 0.07),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, rx * 1.08, ry * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      // The rim: packed stones, wave-rounded.
      ctx.fillStyle = '#7d868b';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - ry * 0.5, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6a747a';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - ry * 0.44, rx * 0.94, ry * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      // Rim stones as separate worn knuckles around the lip.
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + (h % 7) * 0.2;
        const kx = p.x + Math.cos(a) * rx * 0.97;
        const ky = baseY - ry * 0.5 + Math.sin(a) * ry * 0.95;
        ctx.fillStyle = (k & 1) === 0 ? '#8b9499' : '#737d82';
        ctx.beginPath();
        facetBlob(ctx, kx, ky, s * (0.05 + ((h >> k) & 1) * 0.016), h ^ (k * 67), 5, 0.72);
        ctx.fill();
      }
      // The brine sheet: a pale mirror holding the sky's tone.
      ctx.fillStyle = '#aebfc2';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - ry * 0.42, rx * 0.78, ry * 0.68, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c4d2d2';
      ctx.beginPath();
      ctx.ellipse(p.x - rx * 0.16, baseY - ry * 0.52, rx * 0.36, ry * 0.26, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // THE CRUST: white salt creeping inward from the rim in
      // an irregular collar — brightest thing on the bank.
      ctx.fillStyle = SKR_SALT;
      for (let k = 0; k < 13; k++) {
        const a = (k / 13) * Math.PI * 2 + (h % 13) * 0.31;
        const reach = 0.6 + (((h >> k) & 3) / 3) * 0.18;
        const kx = p.x + Math.cos(a) * rx * reach;
        const ky = baseY - ry * 0.42 + Math.sin(a) * ry * reach * 0.85;
        ctx.beginPath();
        facetBlob(ctx, kx, ky, s * (0.06 + ((h >> (k + 3)) & 1) * 0.024), h ^ (k * 29), 5, 0.6);
        ctx.fill();
      }
      // Crust shore along the whole rim's inner edge.
      ctx.strokeStyle = 'rgba(232, 236, 236, 0.85)';
      ctx.lineWidth = Math.max(1.5, s * 0.035);
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - ry * 0.42, rx * 0.8, ry * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
      // The scraper: a flat bone blade on a driftwood haft,
      // resting across the rim mid-shift.
      ctx.strokeStyle = SKR_DRIFT;
      ctx.lineWidth = Math.max(1.5, s * 0.032);
      ctx.beginPath();
      ctx.moveTo(p.x + rx * 0.5, baseY - ry * 1.06);
      ctx.lineTo(p.x + rx * 1.12, baseY - ry * 0.3);
      ctx.stroke();
      ctx.fillStyle = DGN_BONE;
      ctx.beginPath();
      ctx.moveTo(p.x + rx * 0.42, baseY - ry * 1.16);
      ctx.lineTo(p.x + rx * 0.62, baseY - ry * 1.0);
      ctx.lineTo(p.x + rx * 0.48, baseY - ry * 0.88);
      ctx.lineTo(p.x + rx * 0.34, baseY - ry * 1.04);
      ctx.closePath();
      ctx.fill();
      // The harvest: a white heap on a woven mat beside — big
      // enough to be somebody's season.
      ctx.fillStyle = SKR_WICKER;
      ctx.beginPath();
      ctx.ellipse(p.x - rx * 1.02, baseY - s * 0.02, s * 0.18, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = SKR_SALT;
      ctx.beginPath();
      ctx.moveTo(p.x - rx * 1.02 - s * 0.12, baseY - s * 0.03);
      ctx.quadraticCurveTo(p.x - rx * 1.02, baseY - s * 0.24, p.x - rx * 1.02 + s * 0.12, baseY - s * 0.03);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#cfd8d8';
      ctx.beginPath();
      ctx.moveTo(p.x - rx * 1.02 + s * 0.015, baseY - s * 0.035);
      ctx.quadraticCurveTo(p.x - rx * 1.02 + s * 0.07, baseY - s * 0.14, p.x - rx * 1.02 + s * 0.115, baseY - s * 0.032);
      ctx.closePath();
      ctx.fill();
    },
  };
}

function paintShellBench(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // The shell-carver's bench: where the totem inlays and the
  // household strings are made. Drilled fans in a tidy row,
  // one string half-strung and trailing off the slab, the
  // bone awl at rest — craft mid-thought, tools down.
  // PASS-TWO VERDICT: the fans were pebbles at arm's length —
  // the work must read as SHELLS from a body-length away.
  const hw = s * 0.56;
  const topY = baseY - s * 0.44;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.68, 0.8, 0.45),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.15, s * 0.08),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.18, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      // The chip litter first — pale workshop snow underfoot.
      ctx.fillStyle = 'rgba(222, 213, 196, 0.55)';
      for (let k = 0; k < 6; k++) {
        const cx2 = p.x + (((h >> (k * 3)) & 7) - 3.5) * s * 0.11;
        const cy2 = baseY - s * 0.02 + (((h >> (k * 2 + 1)) & 3) - 1.5) * s * 0.03;
        ctx.beginPath();
        ctx.ellipse(cx2, cy2, s * 0.02, s * 0.013, k, 0, Math.PI * 2);
        ctx.fill();
      }
      // Stone trestles and the worn slab (lit top plane).
      ctx.fillStyle = '#6a747a';
      for (const ex of [-hw * 0.7, hw * 0.7]) {
        ctx.beginPath();
        facetBlob(ctx, p.x + ex, baseY - s * 0.14, s * 0.085, h ^ Math.round(ex * 3), 6, 0.72);
        ctx.fill();
      }
      ctx.fillStyle = SKR_DRIFT_DARK;
      ctx.beginPath();
      ctx.moveTo(p.x - hw - s * 0.05, topY + s * 0.09);
      ctx.lineTo(p.x + hw + s * 0.05, topY + s * 0.09);
      ctx.lineTo(p.x + hw + s * 0.03, topY + s * 0.18);
      ctx.lineTo(p.x - hw - s * 0.03, topY + s * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = SKR_DRIFT;
      ctx.beginPath();
      ctx.moveTo(p.x - hw - s * 0.06, topY);
      ctx.lineTo(p.x + hw + s * 0.06, topY);
      ctx.lineTo(p.x + hw + s * 0.05, topY + s * 0.095);
      ctx.lineTo(p.x - hw - s * 0.05, topY + s * 0.095);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = SKR_DRIFT_LIT;
      ctx.beginPath();
      ctx.moveTo(p.x - hw - s * 0.06, topY);
      ctx.lineTo(p.x + hw + s * 0.06, topY);
      ctx.lineTo(p.x + hw + s * 0.015, topY + s * 0.03);
      ctx.lineTo(p.x - hw - s * 0.015, topY + s * 0.03);
      ctx.closePath();
      ctx.fill();
      // THE ROW: drilled fans stood in a work line, each with
      // its mother-of-pearl tick — order is the craftsman read
      // (the display must read; a heap is a midden).
      for (let k = 0; k < 4; k++) {
        const sx2 = p.x - hw * 0.64 + k * hw * 0.43;
        const st = (h >> (k * 4)) & 3;
        ctx.fillStyle = st === 1 ? '#ded5c4' : st === 2 ? '#cfc4bb' : '#e6e0d2';
        ctx.beginPath();
        ctx.moveTo(sx2 - s * 0.072, topY - s * 0.002);
        ctx.quadraticCurveTo(sx2, topY - s * 0.185, sx2 + s * 0.072, topY - s * 0.002);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(138, 130, 114, 0.65)';
        ctx.lineWidth = Math.max(1, s * 0.01);
        for (const fx3 of [-0.034, 0, 0.034]) {
          ctx.beginPath();
          ctx.moveTo(sx2 + fx3 * s, topY - s * 0.012);
          ctx.lineTo(sx2 + fx3 * s * 2.0, topY - s * 0.15);
          ctx.stroke();
        }
        // The drilled eye and its pearl gleam.
        ctx.fillStyle = '#4a4437';
        ctx.beginPath();
        ctx.ellipse(sx2, topY - s * 0.125, s * 0.014, s * 0.014, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = SKR_SHELL_PEARL;
        ctx.beginPath();
        ctx.ellipse(sx2 - s * 0.026, topY - s * 0.07, s * 0.018, s * 0.011, -0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      // THE STRING IN PROGRESS: strung shells trailing off the
      // slab edge and HANGING plumb (strings hang, never splay).
      const sx3 = p.x + hw * 0.78;
      ctx.strokeStyle = 'rgba(214, 220, 204, 0.6)';
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.moveTo(p.x + hw * 0.3, topY - s * 0.01);
      ctx.quadraticCurveTo(sx3 - s * 0.03, topY + s * 0.01, sx3, topY + s * 0.06);
      ctx.lineTo(sx3, topY + s * 0.34);
      ctx.stroke();
      ctx.fillStyle = DGN_BONE;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.ellipse(sx3, topY + s * (0.1 + k * 0.075), s * 0.024, s * 0.02, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = SKR_SHELL_PEARL;
      ctx.beginPath();
      ctx.ellipse(sx3, topY + s * 0.175, s * 0.011, s * 0.009, 0, 0, Math.PI * 2);
      ctx.fill();
      // The bone awl, at rest against the near edge.
      ctx.strokeStyle = DGN_BONE;
      ctx.lineWidth = Math.max(1.5, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.2, topY + s * 0.05);
      ctx.lineTo(p.x - hw * 0.02, topY - s * 0.045);
      ctx.stroke();
      ctx.fillStyle = SKR_DRIFT_LIT;
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.21, topY + s * 0.055, s * 0.022, s * 0.018, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintWithyStore(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.22;
  // The wicker-craft store: bound sheaves of withies leaned
  // into an X-stand, tops splaying — every trap, creel, and
  // weir panel on the bank started here. One binding let go;
  // its rods lie where they spilled.
  // PASS-TWO VERDICT — A STORE IS KEPT, NOT DUMPED: the first
  // build's thin sheaves fanned like a collapsed pile. The
  // sheaves are now FAT, upright, and visibly BOUND — the
  // cord bands are what make it a store.
  const hw = s * 0.44;
  const sheafN = 3;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.62, 1.2, 0.45),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.15, s * 0.08),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.2, s * 0.075, 0, 0, Math.PI * 2);
      ctx.fill();
      // The X-stand rail the sheaves lean into.
      ctx.strokeStyle = SKR_DRIFT_DARK;
      ctx.lineWidth = Math.max(1.5, s * 0.04);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 1.1, baseY - s * 0.02);
      ctx.lineTo(p.x - hw * 0.5, baseY - s * 0.52);
      ctx.moveTo(p.x - hw * 1.25, baseY - s * 0.44);
      ctx.lineTo(p.x - hw * 0.42, baseY - s * 0.04);
      ctx.stroke();
      ctx.strokeStyle = SKR_KELP;
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.88, baseY - s * 0.3);
      ctx.lineTo(p.x - hw * 0.78, baseY - s * 0.24);
      ctx.stroke();
      // The sheaves: leaning bundles, each a fan of rod strokes
      // under one body fill, banded twice in kelp cord.
      for (let k = 0; k < sheafN; k++) {
        const f = (k + 0.5) / sheafN;
        const bx = p.x - hw * 0.62 + f * hw * 1.5;
        const lean = -0.12 + f * 0.2 + (((h >> (k * 3)) & 3) - 1.5) * 0.025;
        const bh = s * (1.0 + ((h >> (k * 2 + 4)) & 3) * 0.06);
        ctx.save();
        ctx.translate(bx, baseY);
        ctx.rotate(lean);
        // Body: a FAT bound sheaf, waisted at the bands.
        ctx.fillStyle = k === 1 ? SKR_WICKER : '#93804a';
        ctx.beginPath();
        ctx.moveTo(-s * 0.13, 0);
        ctx.quadraticCurveTo(-s * 0.115, -bh * 0.3, -s * 0.082, -bh * 0.52);
        ctx.quadraticCurveTo(-s * 0.1, -bh * 0.78, -s * 0.06, -bh);
        ctx.lineTo(s * 0.06, -bh);
        ctx.quadraticCurveTo(s * 0.1, -bh * 0.78, s * 0.082, -bh * 0.52);
        ctx.quadraticCurveTo(s * 0.115, -bh * 0.3, s * 0.13, 0);
        ctx.closePath();
        ctx.fill();
        // Rod grain + the splayed tops past the upper band.
        ctx.strokeStyle = '#7a683c';
        ctx.lineWidth = Math.max(1, s * 0.013);
        for (let r2 = 0; r2 < 5; r2++) {
          const rx2 = (r2 - 2) * s * 0.042;
          ctx.beginPath();
          ctx.moveTo(rx2, -s * 0.05);
          ctx.lineTo(rx2 * 0.55, -bh * 0.96);
          ctx.stroke();
        }
        ctx.strokeStyle = SKR_WICKER_LIT;
        ctx.lineWidth = Math.max(1, s * 0.016);
        for (let r2 = 0; r2 < 4; r2++) {
          const rx2 = (r2 - 1.5) * s * 0.034;
          ctx.beginPath();
          ctx.moveTo(rx2 * 0.5, -bh + s * 0.01);
          ctx.quadraticCurveTo(rx2 * 1.6, -bh - s * 0.1, rx2 * 2.4 + s * 0.012, -bh - s * (0.15 + (r2 & 1) * 0.03));
          ctx.stroke();
        }
        // THE BANDS: two fat kelp cords cinching the waist —
        // lit knot on the near face. The binding IS the store.
        for (const bandY of [-bh * 0.72, -bh * 0.32]) {
          ctx.strokeStyle = SKR_KELP;
          ctx.lineWidth = Math.max(1.5, s * 0.034);
          ctx.beginPath();
          ctx.moveTo(-s * 0.098, bandY);
          ctx.quadraticCurveTo(0, bandY + s * 0.022, s * 0.098, bandY);
          ctx.stroke();
          ctx.strokeStyle = SKR_KELP_LIT;
          ctx.lineWidth = Math.max(1, s * 0.014);
          ctx.beginPath();
          ctx.moveTo(-s * 0.07, bandY + s * 0.008);
          ctx.quadraticCurveTo(0, bandY + s * 0.026, s * 0.05, bandY + s * 0.01);
          ctx.stroke();
          ctx.fillStyle = SKR_KELP_LIT;
          ctx.beginPath();
          ctx.ellipse(s * 0.02, bandY + s * 0.02, s * 0.016, s * 0.013, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      // THE SPILL: kept small — two rods slid from the near
      // sheaf and the slipped band beside them (one accident,
      // not a habit).
      for (let k = 0; k < 2; k++) {
        ctx.strokeStyle = k === 1 ? SKR_WICKER_LIT : '#8a7648';
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        const ox = p.x + hw * 0.6 + k * s * 0.035;
        ctx.moveTo(ox, baseY - s * 0.015 + k * s * 0.012);
        ctx.lineTo(ox + s * 0.3, baseY - s * 0.08 + k * s * 0.02);
        ctx.stroke();
      }
      ctx.strokeStyle = SKR_KELP;
      ctx.lineWidth = Math.max(1, s * 0.018);
      ctx.beginPath();
      ctx.ellipse(p.x + hw * 0.6, baseY + s * 0.01, s * 0.045, s * 0.02, 0.4, 0, Math.PI * 2);
      ctx.stroke();
      // Damp footing.
      ctx.fillStyle = 'rgba(52, 62, 60, 0.18)';
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.2, baseY + s * 0.005, hw * 0.7, s * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function paintKeepPool(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  // The live larder: a withy-curbed keep-pool holding the
  // catch till it is wanted — dark still water, silver backs
  // circling under the surface on the kit's slowest clock.
  // The lid panel leans on the curb; the tally stick counts.
  // PASS TWO: grown a step and the curb deepened — the dark
  // water is the read, and it needs rim enough to hold it.
  const rx = s * 0.62;
  const ry = s * 0.33;
  const phase = tx * 3.1 + ty * 1.3;
  const fishN = 2 + ((h >> 9) & 1);
  return {
    sortY: ty + 0.62,
    body: stationBody(0.72, 0.55, 0.5),
    drawShadow: () => rend.castContact(p.x, baseY, rx * 1.06, s * 0.07),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.02, rx * 1.1, ry * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // The woven curb: a low wicker ring, dark under-lip
      // first so the rim reads as a raised band, lit near lip.
      ctx.fillStyle = '#7a683c';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - ry * 0.42, rx * 1.02, ry * 1.04, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = SKR_WICKER;
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - ry * 0.5, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a7648';
      ctx.lineWidth = Math.max(1, s * 0.013);
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        ctx.ellipse(p.x, baseY - ry * 0.5, rx * (0.9 - k * 0.06), ry * (0.9 - k * 0.06), 0, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      }
      ctx.strokeStyle = SKR_WICKER_LIT;
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - ry * 0.46, rx * 0.96, ry * 0.92, 0, Math.PI * 0.25, Math.PI * 0.75);
      ctx.stroke();
      // Stakes pinning the curb, worn tops.
      for (const a of [0.3, 1.4, 2.6, 3.9, 5.1] as const) {
        const kx = p.x + Math.cos(a) * rx * 0.98;
        const ky = baseY - ry * 0.5 + Math.sin(a) * ry * 0.95;
        ctx.strokeStyle = SKR_DRIFT;
        ctx.lineWidth = Math.max(1.5, s * 0.03);
        ctx.beginPath();
        ctx.moveTo(kx, ky + s * 0.03);
        ctx.lineTo(kx, ky - s * 0.1);
        ctx.stroke();
        ctx.fillStyle = SKR_DRIFT_LIT;
        ctx.beginPath();
        ctx.ellipse(kx, ky - s * 0.11, s * 0.018, s * 0.015, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // THE WATER: dark, still, deep — the one interior on the
      // bank that is meant to stay wet.
      ctx.fillStyle = SKR_POOL;
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - ry * 0.44, rx * 0.76, ry * 0.66, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3d5560';
      ctx.beginPath();
      ctx.ellipse(p.x - rx * 0.14, baseY - ry * 0.56, rx * 0.4, ry * 0.28, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // THE CIRCLING CATCH: silver backs breaking the dark on a
      // slow orbit — never the whole fish, just the glint of a
      // back and the wake tick behind it (<4Hz, cache-safe).
      for (let k = 0; k < fishN; k++) {
        const a = t * (0.5 + k * 0.13) + phase + k * 2.6;
        const orx = rx * (0.42 - k * 0.1);
        const ory = ry * (0.36 - k * 0.08);
        const fx2 = p.x + Math.cos(a) * orx;
        const fy = baseY - ry * 0.44 + Math.sin(a) * ory;
        const heading = Math.atan2(-Math.sin(a) * ory, -Math.cos(a) * orx) + Math.PI;
        ctx.save();
        ctx.translate(fx2, fy);
        ctx.rotate(heading);
        ctx.fillStyle = 'rgba(184, 196, 198, 0.75)';
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.055, s * 0.016, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(74, 90, 94, 0.8)';
        ctx.beginPath();
        ctx.ellipse(s * 0.02, -s * 0.004, s * 0.026, s * 0.007, 0, 0, Math.PI * 2);
        ctx.fill();
        // The wake tick.
        ctx.strokeStyle = 'rgba(196, 210, 210, 0.3)';
        ctx.lineWidth = Math.max(1, s * 0.01);
        ctx.beginPath();
        ctx.moveTo(-s * 0.06, 0);
        ctx.quadraticCurveTo(-s * 0.11, s * 0.008, -s * 0.15, -s * 0.004);
        ctx.stroke();
        ctx.restore();
      }
      // One resting ripple ring, off-center, barely there.
      const rip = (t * 0.31 + (h % 31) * 0.03) % 1;
      ctx.strokeStyle = `rgba(196, 210, 210, ${(1 - rip) * 0.25})`;
      ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath();
      ctx.ellipse(p.x + rx * 0.2, baseY - ry * 0.4, rx * 0.24 * (0.3 + rip * 0.7), ry * 0.2 * (0.3 + rip * 0.7), 0, 0, Math.PI * 2);
      ctx.stroke();
      // The lid: a woven panel leaning against the curb's far
      // side — the pool is TENDED, not wild.
      ctx.save();
      ctx.translate(p.x - rx * 0.95, baseY - ry * 1.1);
      ctx.rotate(-0.34);
      ctx.fillStyle = SKR_WICKER;
      ctx.fillRect(-s * 0.14, -s * 0.24, s * 0.28, s * 0.26);
      ctx.strokeStyle = '#8a7648';
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.13, -s * 0.2 + k * s * 0.08);
        ctx.lineTo(s * 0.13, -s * 0.21 + k * s * 0.08);
        ctx.stroke();
      }
      ctx.strokeStyle = SKR_WICKER_LIT;
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(-s * 0.13, -s * 0.24);
      ctx.lineTo(s * 0.13, -s * 0.25);
      ctx.stroke();
      ctx.restore();
      // The tally stick: notches for what the pool owes.
      ctx.strokeStyle = SKR_DRIFT;
      ctx.lineWidth = Math.max(1.5, s * 0.026);
      ctx.beginPath();
      ctx.moveTo(p.x + rx * 0.95, baseY - ry * 1.02);
      ctx.lineTo(p.x + rx * 1.02, baseY - ry * 1.9);
      ctx.stroke();
      ctx.strokeStyle = SKR_DRIFT_LIT;
      ctx.lineWidth = Math.max(1, s * 0.012);
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(p.x + rx * (0.94 + k * 0.014), baseY - ry * (1.2 + k * 0.18));
        ctx.lineTo(p.x + rx * (1.04 + k * 0.014), baseY - ry * (1.23 + k * 0.18));
        ctx.stroke();
      }
    },
  };
}

function paintTideChimes(rend: PropHost, env: PropFrame): DrawItem {
  const { ctx, p, s, h, t, stationBody, tx, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  // The bank's own music: shell strings under a driftwood
  // arch, ticking in the sea wind. Culture, not tooling — the
  // totem's household cousin. Strings HANG and sway as whole
  // pendulums (kit law: never splay).
  // PASS-TWO VERDICT — THE CHIMES MUST READ PALE: the first
  // build's silhouette swallowed its own shells; the shells
  // are the read, so they grew, brightened, and thinned out,
  // and the arch takes more of the driftwood's lit tone.
  const hw = s * 0.44;
  const lintelY = baseY - s * 1.2;
  const phase = tx * 2.1 + ty * 3.3;
  const glassed = ((h >> 5) & 3) !== 3; // most carry sea-glass
  return {
    sortY: ty + 0.7,
    body: stationBody(0.6, 1.6, 0.4),
    drawShadow: () => rend.castContact(p.x, baseY, hw * 1.0, s * 0.07),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx
      // to its scratch — the build-time capture would paint past it.
      const ctx = rend.ctx;
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, hw * 1.05, s * 0.065, 0, 0, Math.PI * 2);
      ctx.fill();
      // Uprights: two worn poles with heel stones.
      for (const m of [-1, 1] as const) {
        ctx.fillStyle = '#6a747a';
        ctx.beginPath();
        facetBlob(ctx, p.x + m * hw * 0.9, baseY - s * 0.01, s * 0.045, h ^ (m * 37), 5, 0.7);
        ctx.fill();
        ctx.strokeStyle = SKR_DRIFT;
        ctx.lineWidth = Math.max(1.5, s * 0.045);
        ctx.beginPath();
        ctx.moveTo(p.x + m * hw * 0.9, baseY);
        ctx.quadraticCurveTo(p.x + m * hw * 0.98, baseY - s * 0.6, p.x + m * hw * 0.8, lintelY + s * 0.08);
        ctx.stroke();
        ctx.strokeStyle = SKR_DRIFT_LIT;
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.beginPath();
        ctx.moveTo(p.x + m * hw * 0.89 - s * 0.01, baseY - s * 0.1);
        ctx.quadraticCurveTo(p.x + m * hw * 0.97, baseY - s * 0.58, p.x + m * hw * 0.79 - s * 0.01, lintelY + s * 0.1);
        ctx.stroke();
      }
      // The lintel: one naturally-curved branch — found bent,
      // never steamed. Kelp lashes at both shoulders.
      ctx.strokeStyle = SKR_DRIFT;
      ctx.lineWidth = Math.max(1.5, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.88, lintelY + s * 0.1);
      ctx.quadraticCurveTo(p.x, lintelY - s * 0.12, p.x + hw * 0.88, lintelY + s * 0.1);
      ctx.stroke();
      ctx.strokeStyle = SKR_DRIFT_LIT;
      ctx.lineWidth = Math.max(1, s * 0.018);
      ctx.beginPath();
      ctx.moveTo(p.x - hw * 0.7, lintelY + s * 0.05);
      ctx.quadraticCurveTo(p.x, lintelY - s * 0.1, p.x + hw * 0.5, lintelY + s * 0.02);
      ctx.stroke();
      ctx.strokeStyle = SKR_KELP;
      ctx.lineWidth = Math.max(1, s * 0.022);
      for (const m of [-1, 1] as const) {
        for (let k = 0; k < 2; k++) {
          ctx.beginPath();
          ctx.moveTo(p.x + m * hw * 0.82 - s * 0.035, lintelY + s * (0.06 + k * 0.03));
          ctx.lineTo(p.x + m * hw * 0.82 + s * 0.035, lintelY + s * (0.05 + k * 0.03));
          ctx.stroke();
        }
      }
      // THE STRINGS: three pendulums on offset phases — each
      // string sways as ONE line from its knot, shells riding
      // it; the middle one longest, all hanging TRUE.
      for (let k = 0; k < 3; k++) {
        const kx = p.x + (k - 1) * hw * 0.52;
        const knotY = lintelY + s * (0.02 - Math.abs(k - 1) * 0.05);
        const len = s * (0.62 + (k === 1 ? 0.16 : 0) + ((h >> (k * 2)) & 1) * 0.05);
        const sway = Math.sin(t * 1.1 + phase + k * 2.3) * 0.075 + Math.sin(t * 0.6 + k * 1.1) * 0.03;
        ctx.save();
        ctx.translate(kx, knotY);
        ctx.rotate(sway);
        ctx.strokeStyle = 'rgba(228, 232, 216, 0.85)';
        ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, len);
        ctx.stroke();
        const shellN = 3;
        for (let j = 0; j < shellN; j++) {
          const jy = len * ((j + 1) / (shellN + 0.4));
          const st = (h >> (j * 2 + k)) & 3;
          if (glassed && k === 1 && j === shellN - 1) {
            // The sea-glass drop: the string's one cool jewel —
            // painted lumen only, never a light entry.
            ctx.fillStyle = 'rgba(148, 214, 202, 0.9)';
            ctx.beginPath();
            ctx.ellipse(0, jy, s * 0.03, s * 0.038, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(226, 248, 240, 0.85)';
            ctx.beginPath();
            ctx.ellipse(-s * 0.009, jy - s * 0.012, s * 0.011, s * 0.008, -0.5, 0, Math.PI * 2);
            ctx.fill();
            continue;
          }
          ctx.fillStyle = st === 1 ? '#e6ded0' : st === 2 ? '#e2d8e0' : '#e0d9c4';
          ctx.beginPath();
          if ((st & 1) === 0) {
            // A fan hung tip-down.
            ctx.moveTo(-s * 0.036, jy - s * 0.022);
            ctx.quadraticCurveTo(0, jy + s * 0.05, s * 0.036, jy - s * 0.022);
            ctx.closePath();
          } else {
            ctx.ellipse(0, jy, s * 0.026, s * 0.033, 0.2, 0, Math.PI * 2);
          }
          ctx.fill();
          // Each shell keeps a dark under-edge so it reads
          // against the sky AND the grass alike.
          ctx.strokeStyle = 'rgba(90, 84, 70, 0.55)';
          ctx.lineWidth = Math.max(1, s * 0.008);
          ctx.beginPath();
          ctx.moveTo(-s * 0.022, jy + s * 0.014);
          ctx.quadraticCurveTo(0, jy + s * 0.03, s * 0.022, jy + s * 0.014);
          ctx.stroke();
        }
        ctx.restore();
      }
      // The wind's litter: two shells that rang themselves free.
      ctx.fillStyle = '#ded5c4';
      ctx.beginPath();
      ctx.ellipse(p.x - hw * 0.3, baseY - s * 0.02, s * 0.024, s * 0.016, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = DGN_BONE_DIM;
      ctx.beginPath();
      ctx.ellipse(p.x + hw * 0.42, baseY, s * 0.02, s * 0.014, -0.3, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

export const SKRAL_PROPS: PropEntries = [
  [[Tile.FishRack], paintFishRack],
  [[Tile.TideTotem], paintTideTotem],
  [[Tile.NetFrame], paintNetFrame],
  [[Tile.Dugout], paintDugout],
  [[Tile.HarpoonRack], paintHarpoonRack],
  [[Tile.ShellMidden], paintShellMidden],
  [[Tile.FishTrap], paintFishTrap],
  [[Tile.RoeNest], paintRoeNest],
  [[Tile.LurePole], paintLurePole],
  [[Tile.TideAltar], paintTideAltar],
  [[Tile.CatchBasket], paintCatchBasket],
  [[Tile.WhaleRibs], paintWhaleRibs],
  [[Tile.ReedShelter], paintReedShelter],
  [[Tile.SmokeTripod], paintSmokeTripod],
  [[Tile.MendingBench], paintMendingBench],
  [[Tile.WeirPanels], paintWeirPanels],
  [[Tile.KelpLine], paintKelpLine],
  [[Tile.SaltPan], paintSaltPan],
  [[Tile.ShellBench], paintShellBench],
  [[Tile.WithyStore], paintWithyStore],
  [[Tile.KeepPool], paintKeepPool],
  [[Tile.TideChimes], paintTideChimes],
];
