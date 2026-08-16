/**
 * BANNER LAB — THE CHAMPION'S MARK on the wall.
 *
 * Runs the REAL sims and the REAL painter (trophyBanner.ts), stepped
 * deterministically at 120Hz from birth, so every cell is exactly the
 * frame the game would paint:
 *
 *   Row 1  THE STAKING — one banner's arrival at fixed ages
 *          (fall, strike, settle, rest), each cell its own sim.
 *   Row 2  THE STAND — hero scale beside the rig ruler (~1.15 tiles,
 *          the unit of measure), tiers 1..5 wearing their pips.
 *   Row 3  GAMEPLAY — the same standard at world zooms.
 *
 * Levers: `?t=ms` freezes the living clock (deterministic
 * screenshots); without it the sheet RUNS on requestAnimationFrame.
 * `?seed=N` re-deals the seeded lean/phase/rubble.
 */
import {
  makeTrophySpine,
  makeTrophyTassel,
  trophyDrop,
  trophyClothPin,
  trophyTasselPin,
  drawTrophyBanner,
  drawTrophyShadow,
  type TrophyCloth,
  type Pt,
} from '../render/trophyBanner.js';
import { windAtInto, type WindSample } from '../render/grass.js';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const q = new URLSearchParams(location.search);
const FREEZE = q.get('t');
const SEED = Number(q.get('seed') ?? 7013) >>> 0;

/** The camera pitch the game paints under. */
const YK = 0.6;
const SIM_DT = 1 / 120;
const WIND: WindSample = { bx: 0, by: 0, s: 0, l: 0 };

interface Rig {
  spine: TrophyCloth;
  tl: TrophyCloth;
  tr: TrophyCloth;
  simT: number;
}

function makeRig(seed: number): Rig {
  return {
    spine: makeTrophySpine(seed),
    tl: makeTrophyTassel(seed ^ 0x5f),
    tr: makeTrophyTassel(seed ^ 0xa3),
    simT: 0,
  };
}

/**
 * Step a rig's sims deterministically to `toSec` on the fixed clock —
 * the frame the game reaches by playing, the lab reaches by stepping.
 */
function stepTo(rig: Rig, toSec: number, bornOfs: number): void {
  while (rig.simT < toSec) {
    rig.simT = Math.min(toSec, rig.simT + SIM_DT);
    const age = (rig.simT - bornOfs) * 1000;
    const drop = trophyDrop(bornOfs < 0 ? null : age);
    windAtInto(WIND, 4.5, 8.5, rig.simT);
    const pin = trophyClothPin(0, 0, drop);
    const pl = trophyTasselPin(0, 0, drop, -1);
    const pr = trophyTasselPin(0, 0, drop, 1);
    if (!drop.landed) {
      // Airborne = furled and pinned, exactly as the renderer rides it.
      rig.spine.rest(pin.x, pin.y, pin.z);
      rig.tl.rest(pl.x, pl.y, pl.z);
      rig.tr.rest(pr.x, pr.y, pr.z);
    } else {
      rig.spine.update(pin.x, pin.y, pin.z, SIM_DT, WIND, rig.simT);
      rig.tl.update(pl.x, pl.y, pl.z, SIM_DT, WIND, rig.simT);
      rig.tr.update(pr.x, pr.y, pr.z, SIM_DT, WIND, rig.simT);
    }
    // The strike jolt, exactly as the renderer fires it.
    if (bornOfs >= 0 && drop.landed && !(rig as { jolted?: boolean }).jolted) {
      (rig as { jolted?: boolean }).jolted = true;
      rig.spine.jolt(1);
      rig.tl.jolt(0.6);
      rig.tr.jolt(0.6);
    }
  }
}

/** Project a sim node into a cell (screen px), lab camera. */
function projector(cx: number, groundY: number, s: number): (n: { x: number; y: number; z: number }) => Pt {
  return (n) => ({ x: cx + n.x * s, y: groundY + n.y * s * YK - n.z * s });
}

function drawCell(
  x: number,
  y: number,
  s: number,
  rig: Rig,
  ageMs: number | null,
  tier: number,
  nowMs: number,
): void {
  const gx = x;
  const gy = y;
  const drop = trophyDrop(ageMs);
  const proj = projector(gx, gy, s);
  drawTrophyShadow(ctx, gx, gy, s, drop);
  drawTrophyBanner(ctx, {
    gx,
    gy,
    s,
    tier,
    seed: SEED,
    nowMs,
    drop,
    spine: rig.spine.nodes.map(proj),
    tasselL: rig.tl.nodes.map(proj),
    tasselR: rig.tr.nodes.map(proj),
    hemSpd: rig.spine.hemSpd,
  });
}

/** The unit of measure: a rig-height silhouette (~1.15 tiles). */
function drawRuler(x: number, gy: number, s: number): void {
  const h = 1.15 * s;
  ctx.fillStyle = 'rgba(20, 24, 20, 0.85)';
  ctx.fillRect(x - s * 0.16, gy - h * 0.72, s * 0.32, h * 0.72);
  ctx.beginPath();
  ctx.arc(x, gy - h * 0.82, s * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cfe3cf';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('rig 1.15t', x, gy + 16);
}

function label(text: string, x: number, y: number): void {
  ctx.fillStyle = '#cfe3cf';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
}

/** Ages photographed across the staking row (ms since the cue). */
const STAKE_AGES = [240, 420, 530, 640, 800, 1100, 1600, 4000];

/** Staking cells are still photographs — each rig stepped once. */
const STAKE_RIGS = STAKE_AGES.map((age, i) => {
  const rig = makeRig(SEED + i);
  stepTo(rig, age / 1000, 0);
  return rig;
});

/** Standing rigs persist and step INCREMENTALLY with the live clock
 *  (bornOfs −1 = settled from the first frame; +6s of pre-roll so the
 *  cloth has found its carriage before the first photograph). */
const STAND_PREROLL = 6;
const heroRig = makeRig(SEED);
const tierRigs = [1, 2, 3, 4, 5].map((t) => makeRig(SEED + 40 + t));
const zoomRigs = [0, 1, 2].map((i) => makeRig(SEED + 90 + i));

function render(nowMs: number): void {
  const tSec = nowMs / 1000 + STAND_PREROLL;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // A meadow-dark ground so the gold reads on world tones.
  ctx.fillStyle = '#33472f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ---- Row 1: THE STAKING
  label('THE STAKING — age (ms) since the fresh cue; strike at 520', 20, 26);
  const s1 = 52;
  STAKE_AGES.forEach((age, i) => {
    const cx = 120 + i * 172;
    const gy = 320;
    ctx.fillStyle = '#2c3d29';
    ctx.fillRect(cx - 80, gy - 290, 160, 320);
    drawCell(cx, gy, s1, STAKE_RIGS[i]!, age, 3, age);
    ctx.fillStyle = '#cfe3cf';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${age}`, cx, gy + 28);
  });

  // ---- Row 2: THE STAND (hero + ruler + tier ladder)
  label('THE STAND — settled, live wind; tiers 1..5 wear their pips', 20, 388);
  const s2 = 118;
  const gy2 = 740;
  stepTo(heroRig, tSec, -1);
  drawCell(190, gy2, s2, heroRig, null, 3, nowMs);
  drawRuler(330, gy2, s2);
  for (let tier = 1; tier <= 5; tier++) {
    const cx = 470 + (tier - 1) * 200;
    const rig = tierRigs[tier - 1]!;
    stepTo(rig, tSec, -1);
    drawCell(cx, gy2, 86, rig, null, tier, nowMs);
    ctx.fillStyle = '#cfe3cf';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`tier ${tier}`, cx, gy2 + 28);
  }

  // ---- Row 3: GAMEPLAY zooms
  label('GAMEPLAY — world zooms (px/tile)', 20, 800);
  const gy3 = 930;
  [48, 34, 22].forEach((s3, i) => {
    const cx = 140 + i * 170;
    const rig = zoomRigs[i]!;
    stepTo(rig, tSec, -1);
    drawCell(cx, gy3, s3, rig, null, 3, nowMs);
    drawRuler(cx + 70, gy3, s3);
    ctx.fillStyle = '#cfe3cf';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${s3}px`, cx, gy3 + 26);
  });
}

if (FREEZE != null) {
  render(Number(FREEZE));
} else {
  const loop = (now: number): void => {
    render(now);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
