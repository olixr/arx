// TEMPORARY rig verification harness (checked-in tooling): THE SKRAL
// SHEET — the brine-folk audit (docs/skral-plan.md, THE BRINE
// DIALECT). All four bodies across the eight facing bands at idle,
// walk, and the STRIKE loop (the gape + crest flare beat is the whole
// point — shoot the strike rows animated, not just settled), plus the
// hurt-flash silhouette rows, a water-cluster seed-spread row (the
// shoal must sort into family banners, never one body stamped eight
// times), and BODY-RULER cells standing the player rig beside the
// wader and the deepking. Every figure owns a live biped LegSolver
// AND a live EarSim crest — the sheet plays the same physics the game
// does: walk rows breathe, strike rows flare, stops settle the sail.
// Levers:
//   ?s=px       cell scale (px per tile)
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?cols=a-b   column banding (E/W close-ups)
//   ?only=id    one body huge (skral, skral_harpooner, ...)
//   ?ol=1       OUTLINE mode: every figure rings through a faithful
//               simulation of the renderer's dilate (radius law
//               max(1.25, s*0.04), integer 8-tap, ink under art)
//   ?det=1      DETERMINISTIC mode: fixed 60Hz steps run synchronously
//               on the first frame; ?detn=N sets the step count.
//   ?dbg=1      SKELETON overlay (don't combine with ?ol=1): the rig's
//               own solved frame in distinct colors — WHITE dashed =
//               the hand-orbit ring (armY), GREY dashed = the hip
//               line, GREEN = the solved shoulder roots, YELLOW/CYAN
//               = each drawn arm chain shoulder→elbow→hand, RED X =
//               the main fist target, BLUE X = the off fist target,
//               MAGENTA = the head hull. THE HUNCH AUDIT: the sheet
//               also rosters the gnolls — the other hunched folk —
//               so both species' arm anchors face the same ruler.
import { LegSolver, RIG_DEBUG, drawHumanoid, gnollLook, type RigPose } from '../render/rig.js';
import { skralLook } from '../render/skral.js';
import { EarSim } from '../render/earPhysics.js';
import { PoseState } from '@arx/shared';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
// `let`, never `const`: outline mode swaps the sheet's ctx out from
// under the painters mid-cell, exactly the way paintOutlineScratch
// does it live.
let ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const ONLY = q.get('only');
const S = Math.max(50, parseInt(q.get('s') ?? (ONLY ? '220' : '110'), 10) || 110);
const YS = 0.6; // camera y foreshorten (world-y tile → screen), renderer's yScale
const OL = q.get('ol') === '1'; // ring every figure with the renderer's dilate

// The outline simulation scratches (renderer's paintOutlineScratch,
// at the lab's 1× dpr): art into A believing it is the frame, B
// becomes the dilated tinted silhouette, ring first then art on top.
const olA = document.createElement('canvas');
const olB = document.createElement('canvas');
const olACtx = olA.getContext('2d')!;
const olBCtx = olB.getContext('2d')!;
const OL_TAPS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0.71, 0.71],
  [-0.71, 0.71],
  [0.71, -0.71],
  [-0.71, -0.71],
];

function paintCellOutlined(x0: number, y0: number, w0: number, h0: number, paint: () => void): void {
  const r = Math.max(1.25, S * 0.04); // the renderer's radius law
  const m = Math.ceil(r) + 2;
  const w = w0 + m * 2;
  const h = h0 + m * 2;
  if (olA.width !== w || olA.height !== h) {
    olA.width = olB.width = w;
    olA.height = olB.height = h;
  }
  olACtx.setTransform(1, 0, 0, 1, 0, 0);
  olACtx.clearRect(0, 0, w, h);
  olACtx.setTransform(1, 0, 0, 1, m - x0, m - y0);
  const prev = ctx;
  ctx = olACtx;
  try {
    paint();
  } finally {
    ctx = prev;
    olACtx.setTransform(1, 0, 0, 1, 0, 0);
  }
  const ri = Math.max(1, Math.round(r));
  const rd = Math.max(1, Math.round(r * 0.71));
  olBCtx.setTransform(1, 0, 0, 1, 0, 0);
  olBCtx.clearRect(0, 0, w, h);
  for (const [tx, ty] of OL_TAPS) {
    const diag = tx !== 0 && ty !== 0;
    olBCtx.drawImage(olA, Math.sign(tx) * (diag ? rd : ri), Math.sign(ty) * (diag ? rd : ri));
  }
  olBCtx.globalCompositeOperation = 'source-in';
  olBCtx.fillStyle = '#241a2e';
  olBCtx.fillRect(0, 0, w, h);
  olBCtx.globalCompositeOperation = 'source-over';
  ctx.drawImage(olB, x0 - m, y0 - m);
  ctx.drawImage(olA, x0 - m, y0 - m);
}

const DIRS = [
  ['S', Math.PI / 2],
  ['SE', Math.PI / 4],
  ['E', 0],
  ['NE', -Math.PI / 4],
  ['N', -Math.PI / 2],
  ['NW', (-3 * Math.PI) / 4],
  ['W', Math.PI],
  ['SW', (3 * Math.PI) / 4],
] as const;

/** Renderer SKRAL_SIZE + GNOLL_SIZE mirror — keep in step when retuning. */
const SIZE: Record<string, number> = {
  skral: 0.86,
  skral_harpooner: 0.84,
  skral_tidecaller: 0.9,
  skral_champion: 1.25,
  skral_tidelord: 1.34,
  skral_deepmaw: 1.44,
  gnoll: 1.18,
  gnoll_champion: 1.42,
};
/** Bestiary walk speeds, mirrored. */
const SPEED: Record<string, number> = {
  skral: 3.4,
  skral_harpooner: 3.2,
  skral_tidecaller: 3.1,
  skral_champion: 3.7,
  skral_tidelord: 3.6,
  skral_deepmaw: 3.5,
  gnoll: 4.2,
  gnoll_champion: 4.0,
};
/** Renderer GNOLL_EQUIP mirror — the gnolls carry their steel. */
const WEAPON: Record<string, string> = {
  gnoll: 'rustbite',
  gnoll_champion: 'iron_greatblade',
};

type Mode = 'idle' | 'walk' | 'strike' | 'cast' | 'hurt';

interface Fig {
  label: string;
  defId: string;
  dir: number;
  mode: Mode;
  seed: number;
  /** Ruler cells stand the player rig beside the skral body. */
  ruler?: boolean;
  // live sim state
  wx?: number;
  wy?: number;
  legs?: LegSolver;
  knee?: number[];
  depth?: RigPose['depthMemory'];
  crest?: EarSim;
  manLegs?: LegSolver;
  manKnee?: number[];
  manDepth?: RigPose['depthMemory'];
}

const figs: Fig[] = [];
const row = (label: string, defId: string, mode: Mode, seed = 5): void => {
  for (const [lbl, dir] of DIRS) figs.push({ label: `${label} ${lbl}`, defId, dir, mode, seed });
};

// Sheet rows, top to bottom — the strike rows are where the gape and
// the crest flare read; the hurt rows are the silhouette truth.
row('skral idle', 'skral', 'idle');
row('skral walk', 'skral', 'walk');
row('skral strike', 'skral', 'strike');
row('skral hurt', 'skral', 'hurt');
row('harpoon idle', 'skral_harpooner', 'idle', 11);
row('harpoon walk', 'skral_harpooner', 'walk', 11);
row('tidecall idle', 'skral_tidecaller', 'idle');
row('tidecall cast', 'skral_tidecaller', 'cast');
row('deepking idle', 'skral_champion', 'idle');
row('deepking walk', 'skral_champion', 'walk');
row('deepking strike', 'skral_champion', 'strike');
row('deepking hurt', 'skral_champion', 'hurt');
// THE BRINE CROWNS: the tidelord's cast rows (the regalia + the
// standoff caster read) and the deepmaw's strike rows (the biggest
// jaw in the game croaking open mid-swing).
row('tidelord idle', 'skral_tidelord', 'idle');
row('tidelord walk', 'skral_tidelord', 'walk');
row('tidelord cast', 'skral_tidelord', 'cast');
row('tidelord hurt', 'skral_tidelord', 'hurt');
row('deepmaw idle', 'skral_deepmaw', 'idle');
row('deepmaw walk', 'skral_deepmaw', 'walk');
row('deepmaw strike', 'skral_deepmaw', 'strike');
row('deepmaw hurt', 'skral_deepmaw', 'hurt');
// THE HUNCH AUDIT rows: the gnolls share the sheet — same bands, same
// rulers — so the two hunched species' arm anchors are one audit.
row('gnoll idle', 'gnoll', 'idle', 7);
row('gnoll walk', 'gnoll', 'walk', 7);
row('gnoll strike', 'gnoll', 'strike', 7);
row('packlord idle', 'gnoll_champion', 'idle', 7);
row('packlord walk', 'gnoll_champion', 'walk', 7);
row('packlord strike', 'gnoll_champion', 'strike', 7);
// THE WATER SPREAD: eight consecutive seeds on the wader — the shoal
// must sort into the four family banners (seeded determinism, and the
// hash-first law: consecutive eids must scatter, never clump).
for (let k = 0; k < 8; k++) {
  figs.push({ label: `skral seed ${900 + k}`, defId: 'skral', dir: Math.PI / 2, mode: 'idle', seed: 900 + k });
}
// THE BODY RULER: the player rig beside the wader and the deepking —
// the waist-high claim proven on screen.
figs.push({ label: 'ruler: player+skral', defId: 'skral', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+tidecall', defId: 'skral_tidecaller', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+deepking', defId: 'skral_champion', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+tidelord', defId: 'skral_tidelord', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+deepmaw', defId: 'skral_deepmaw', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+gnoll', defId: 'gnoll', dir: Math.PI / 2, mode: 'idle', seed: 7, ruler: true });
figs.push({ label: 'ruler: player+packlord', defId: 'gnoll_champion', dir: Math.PI / 2, mode: 'idle', seed: 7, ruler: true });

const kept = ONLY ? figs.filter((f) => f.defId === ONLY) : figs;

const COLS = 8;
const CW = Math.round(S * 2.2);
const CH = Math.round(S * 2.7);

let rowFrom = 0;
let rowTo = Math.ceil(kept.length / COLS) - 1;
const rowsQ = q.get('rows');
if (rowsQ) {
  const m = rowsQ.match(/^(\d+)-(\d+)$/);
  if (m) {
    rowFrom = parseInt(m[1]!, 10);
    rowTo = parseInt(m[2]!, 10);
  }
}
let colFrom = 0;
let colTo = COLS - 1;
const colsQ = q.get('cols');
if (colsQ) {
  const m = colsQ.match(/^(\d+)-(\d+)$/);
  if (m) {
    colFrom = parseInt(m[1]!, 10);
    colTo = parseInt(m[2]!, 10);
  }
}

const DET = q.get('det') === '1';
const DET_FRAMES = Math.max(1, parseInt(q.get('detn') ?? '240', 10) || 240);
const DBG = q.get('dbg') === '1';
let frameIdx = 0;
let lastNow = 0;

/**
 * THE HUNCH AUDIT overlay: the rig's own solved frame, straight off
 * RIG_DEBUG, in unmistakable colors — drawn right after the figure it
 * measures so ruler cells overlay each body separately.
 */
function drawDbg(): void {
  const d = RIG_DEBUG;
  ctx.save();
  ctx.lineWidth = 1.5;
  // WHITE dashed: the hand-orbit ring (armY) — where rest/strike hand
  // math thinks "hand height zero" lives.
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.moveTo(d.x - 0.7 * d.s, d.armY);
  ctx.lineTo(d.x + 0.7 * d.s, d.armY);
  ctx.stroke();
  // GREY dashed: the hip line the whole frame hangs off.
  ctx.strokeStyle = 'rgba(190,190,190,0.4)';
  ctx.beginPath();
  ctx.moveTo(d.x - 0.7 * d.s, d.hipY);
  ctx.lineTo(d.x + 0.7 * d.s, d.hipY);
  ctx.stroke();
  ctx.setLineDash([]);
  // GREEN: the solved shoulder roots the arms actually hang from.
  ctx.strokeStyle = 'rgba(90,230,110,0.95)';
  ctx.beginPath();
  ctx.moveTo(d.mainShX, d.mainShY);
  ctx.lineTo(d.offShX, d.offShY);
  ctx.stroke();
  ctx.fillStyle = 'rgba(90,230,110,0.95)';
  for (const [px, py] of [
    [d.mainShX, d.mainShY],
    [d.offShX, d.offShY],
  ] as const) {
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // YELLOW / CYAN: each drawn arm chain shoulder→elbow→hand.
  const armInk = ['rgba(240,210,60,0.95)', 'rgba(80,220,235,0.95)'];
  d.arms.forEach((a, i) => {
    ctx.strokeStyle = armInk[i % 2]!;
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(a.kx, a.ky);
    ctx.lineTo(a.ex, a.ey);
    ctx.stroke();
    ctx.fillStyle = armInk[i % 2]!;
    ctx.beginPath();
    ctx.arc(a.kx, a.ky, 2.4, 0, Math.PI * 2);
    ctx.fill();
  });
  // RED X: the main fist target; BLUE X: the off fist target.
  const cross = (px: number, py: number, ink: string): void => {
    ctx.strokeStyle = ink;
    ctx.beginPath();
    ctx.moveTo(px - 4, py - 4);
    ctx.lineTo(px + 4, py + 4);
    ctx.moveTo(px - 4, py + 4);
    ctx.lineTo(px + 4, py - 4);
    ctx.stroke();
  };
  cross(d.mainFistX, d.mainFistY, 'rgba(235,80,80,0.95)');
  cross(d.offFistX, d.offFistY, 'rgba(90,140,255,0.95)');
  // MAGENTA: the head hull — the face the hands must never cross.
  ctx.strokeStyle = 'rgba(235,80,225,0.9)';
  ctx.beginPath();
  ctx.arc(d.headX, d.headY, d.headR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** One hunched-folk body through drawHumanoid with live legs (and,
 *  for the skral, the live crest). */
function drawSkral(f: Fig, x: number, y: number, now: number, dt: number): void {
  const size = SIZE[f.defId] ?? 0.86;
  const gnoll = f.defId.startsWith('gnoll');
  if (!f.legs) {
    f.legs = new LegSolver(1);
    f.knee = [0, 0];
    f.depth = { mainBehind: false };
    f.crest = new EarSim(f.seed);
    f.wx = 0;
    f.wy = 0;
  }
  const speed = f.mode === 'walk' ? (SPEED[f.defId] ?? 3.4) : 0;
  if (speed > 0) {
    f.wx! += Math.cos(f.dir) * speed * dt;
    f.wy! += Math.sin(f.dir) * speed * dt;
  }
  const wx = f.wx!;
  const wy = f.wy!;
  const lp = f.legs.update(wx, wy, f.dir, dt);
  const feet = lp.feet.map((ft) => ({
    x: x + (ft.x - wx) * S,
    y: y + (ft.y - wy) * S * YS,
    lift: ft.lift,
  }));
  const look = gnoll ? null : skralLook(f.defId, f.seed);
  const gno = gnoll ? gnollLook(f.defId, f.seed) : undefined;
  const striking = f.mode === 'strike' || f.mode === 'cast';
  const poseT = striking ? ((now / 1000) * 1.4) % 1 : 1;
  RIG_DEBUG.on = DBG;
  drawHumanoid(ctx, {
    x,
    y,
    scale: S,
    size,
    dir: f.dir,
    pose:
      f.mode === 'strike'
        ? PoseState.Attack
        : f.mode === 'cast'
          ? PoseState.Cast
          : f.mode === 'walk'
            ? PoseState.Walk
            : PoseState.Idle,
    poseT,
    drawT: 0,
    // Walk is a RESTFUL pose in the game (renderer restfulPose set:
    // Idle/Walk/Sneak → restT rides to 1) — the sheet must show the
    // true walk CARRIAGE, never the combat orbit the old 0 showed.
    restT: f.mode === 'strike' || f.mode === 'cast' ? 0 : 1,
    nowMs: now,
    feet,
    bob: lp.bob,
    rise: lp.rise,
    wScale: lp.wScale,
    poleX: lp.poleX,
    poleY: lp.poleY,
    poleStrength: lp.poleStrength,
    runF: lp.runF,
    align: lp.align,
    kneeMemory: f.knee!,
    depthMemory: f.depth,
    bodyColor: gnoll ? gno!.fur : look!.hide,
    skinColor: gnoll ? gno!.fur : look!.hide,
    hurt: f.mode === 'hurt',
    isOwn: false,
    gatherPhase: 0,
    sheathT: 0,
    weaponItem: gnoll ? WEAPON[f.defId] : undefined,
    skral: look ?? undefined,
    gnoll: gno,
    earSim: gnoll ? undefined : f.crest,
  });
  RIG_DEBUG.on = false;
  if (DBG) drawDbg();
}

/** The ruler player, on the game's own biped solver. */
function drawMan(f: Fig, x: number, y: number, now: number, dt: number): void {
  if (!f.manLegs) {
    f.manLegs = new LegSolver(1);
    f.manKnee = [0, 0];
    f.manDepth = { mainBehind: false };
  }
  const lp = f.manLegs.update(0, 0, Math.PI / 2, dt);
  const feet = lp.feet.map((ft) => ({ x: x + ft.x * S, y: y + ft.y * S * YS, lift: ft.lift }));
  RIG_DEBUG.on = DBG;
  drawHumanoid(ctx, {
    x,
    y,
    scale: S,
    size: 1,
    dir: Math.PI / 2,
    pose: PoseState.Idle,
    poseT: 1,
    drawT: 0,
    restT: 1,
    nowMs: now,
    feet,
    bob: lp.bob,
    rise: lp.rise,
    wScale: lp.wScale,
    poleX: lp.poleX,
    poleY: lp.poleY,
    poleStrength: lp.poleStrength,
    runF: lp.runF,
    align: lp.align,
    kneeMemory: f.manKnee!,
    depthMemory: f.manDepth,
    bodyColor: '#3f5d8e',
    hurt: false,
    isOwn: false,
    gatherPhase: 0,
    sheathT: 0,
  });
  RIG_DEBUG.on = false;
  if (DBG) drawDbg();
}

function frame(now: number): void {
  const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
  lastNow = now;
  drawSheet(now, dt);
  requestAnimationFrame(frame);
}

function drawSheet(now: number, dt: number): void {
  const nRows = rowTo - rowFrom + 1;
  canvas.width = (colTo - colFrom + 1) * CW;
  canvas.height = nRows * CH;
  ctx.fillStyle = '#2a3b2f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  kept.forEach((f, i) => {
    const sheetRow = Math.floor(i / COLS);
    if (sheetRow < rowFrom || sheetRow > rowTo) return;
    const sheetCol = i % COLS;
    if (sheetCol < colFrom || sheetCol > colTo) return;
    const homeX = CW / 2 + (sheetCol - colFrom) * CW;
    const homeY = Math.round(S * 2.05) + (sheetRow - rowFrom) * CH;
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(homeX - 1.0 * S, homeY);
    ctx.lineTo(homeX + 1.0 * S, homeY);
    ctx.stroke();

    const paint = (): void => {
      if (f.ruler) {
        drawMan(f, homeX - 0.85 * S, homeY, now, dt);
        drawSkral(f, homeX + 0.5 * S, homeY, now, dt);
      } else {
        drawSkral(f, homeX, homeY, now, dt);
      }
    };
    if (OL) {
      paintCellOutlined(homeX - CW / 2, homeY - Math.round(S * 2.05), CW, CH, paint);
    } else {
      paint();
    }
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.label, homeX, homeY - 1.85 * S);
  });
  if (DET) {
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`det frame ${frameIdx}`, 8, 20);
  }
  frameIdx++;
}

if (DET) {
  requestAnimationFrame(() => {
    for (let i = 0; i < DET_FRAMES; i++) drawSheet(i * (1000 / 60), 1 / 60);
  });
} else {
  requestAnimationFrame(frame);
}
