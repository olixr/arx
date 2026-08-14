// TEMPORARY rig verification harness (checked-in tooling): THE GNOLL
// SHEET — the fur-dialect head rework audit. Both warband bodies
// (skulker / packlord) across the eight facing bands at idle, walk,
// and the looping strike (the cackle gape must read), plus the hurt
// flash; a COAT CLUSTER row proving eight consecutive spawn eids
// scatter the warband across all four coats; and BODY-RULER cells
// standing the player rig, the goblin, and the kobold beside the
// gnolls so the stature ladder (seven feet carried low) reads at a
// glance. Each figure owns a live LegSolver, so feet plant and knee
// hysteresis run exactly as in game. Levers:
//   ?s=px       cell scale (px per tile)
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?det=1      DETERMINISTIC mode: fixed 60Hz steps run synchronously
//               on the first frame; ?detn=N sets the step count.
import {
  LegSolver,
  drawHumanoid,
  goblinLook,
  gnollLook,
  koboldLook,
  type RigPose,
} from '../render/rig.js';
import { PoseState } from '@arx/shared';
import { EarSim } from '../render/earPhysics.js';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const S = Math.max(60, parseInt(q.get('s') ?? '110', 10) || 110); // scale px per tile (?s= zoom lever)
const YS = 0.6; // camera y foreshorten (world-y tile → screen), renderer's yScale

const WALK_SPEED = 1.3;

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

/** The bestiary rows this sheet audits (content defs, mirrored). */
const BODIES: Record<
  string,
  {
    size: number;
    kind: 'goblin' | 'gnoll' | 'kobold' | 'player';
    equip?: { weapon?: string; offhand?: string; head?: string; body?: string };
  }
> = {
  gnoll: { size: 1.18, kind: 'gnoll', equip: { weapon: 'rustbite' } },
  gnoll_champion: { size: 1.42, kind: 'gnoll', equip: { weapon: 'iron_greatblade' } },
  gnoll_bare: { size: 1.18, kind: 'gnoll' },
  goblin: { size: 0.72, kind: 'goblin' },
  kobold: { size: 0.75, kind: 'kobold' },
  player: { size: 1, kind: 'player' },
};

/** Bare-body cells alias the real defs so the head is never occluded. */
const DEF_ALIAS: Record<string, string> = { gnoll_bare: 'gnoll' };

type Mode = 'idle' | 'walk' | 'strike' | 'hurt';

interface Fig {
  label: string;
  defId: string;
  dir: number;
  mode: Mode;
  seed: number;
  /** Ruler cells stand the player rig beside the subject. */
  ruler?: boolean;
  // live sim state
  wx?: number;
  wy?: number;
  legs?: LegSolver;
  knee?: number[];
  depth?: RigPose['depthMemory'];
  manLegs?: LegSolver;
  manKnee?: number[];
  manDepth?: RigPose['depthMemory'];
  /** THE EAR IS A SIMULATION: live elastic pair per goblin fig, so
   *  the sheet shows the same physics the game plays — walk rows
   *  flap with the bob, strike rows pin back through the jeer. */
  ears?: EarSim;
}

const figs: Fig[] = [];
const row = (label: string, defId: string, mode: Mode, seed = 5): void => {
  for (const [lbl, dir] of DIRS) figs.push({ label: `${label} ${lbl}`, defId, dir, mode, seed });
};

// Sheet rows, top to bottom — idle/walk/strike per body (the strike
// row is where the cackle gape reads), hurt for the skulker.
row('skulker idle', 'gnoll', 'idle');
row('skulker walk', 'gnoll', 'walk');
row('skulker strike', 'gnoll', 'strike');
row('packlord idle', 'gnoll_champion', 'idle');
row('packlord walk', 'gnoll_champion', 'walk');
row('packlord strike', 'gnoll_champion', 'strike');
row('skulker hurt', 'gnoll', 'hurt');
// THE COAT CLUSTER SPREAD: eight consecutive spawn eids facing the
// camera — the hash must scatter a warband across all four coats.
for (let k = 0; k < 8; k++) {
  figs.push({ label: `warband eid ${400 + k}`, defId: 'gnoll', dir: Math.PI / 2, mode: 'idle', seed: 400 + k });
}
// THE BODY RULER: the player rig beside the skulker and the packlord,
// then the goblin and the kobold for the bestiary's stature neighbors
// (the gnoll stands over a man even hunched).
figs.push({ label: 'ruler: player+skulker', defId: 'gnoll', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+packlord', defId: 'gnoll_champion', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'goblin (reference)', defId: 'goblin', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'kobold (reference)', defId: 'kobold', dir: Math.PI / 2, mode: 'idle', seed: 5 });
// Bare close-up band: no weapon in the hand, the head unoccluded.
figs.push({ label: 'bare S (face)', defId: 'gnoll_bare', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'bare E (profile)', defId: 'gnoll_bare', dir: 0, mode: 'idle', seed: 5 });
figs.push({ label: 'bare SW (3/4)', defId: 'gnoll_bare', dir: (3 * Math.PI) / 4, mode: 'idle', seed: 5 });
figs.push({ label: 'bare N (back)', defId: 'gnoll_bare', dir: -Math.PI / 2, mode: 'idle', seed: 5 });

const COLS = 8;
const CW = Math.round(S * 2.1);
const CH = Math.round(S * 2.9);

let rowFrom = 0;
let rowTo = Math.ceil(figs.length / COLS) - 1;
const rowsQ = q.get('rows');
if (rowsQ) {
  const m = rowsQ.match(/^(\d+)-(\d+)$/);
  if (m) {
    rowFrom = parseInt(m[1]!, 10);
    rowTo = parseInt(m[2]!, 10);
  }
}
// ?cols=a-b — column banding for close-up screenshots (E/W cells).
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
let frameIdx = 0;
let lastNow = 0;

function frame(now: number): void {
  const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
  lastNow = now;
  drawSheet(now, dt);
  requestAnimationFrame(frame);
}

/** One biped figure through drawHumanoid with a live leg solver. */
function drawBody(
  f: Fig,
  defId: string,
  x: number,
  y: number,
  dir: number,
  mode: Mode,
  seed: number,
  now: number,
  dt: number,
  slot: 'main' | 'ruler',
): void {
  const info = BODIES[defId]!;
  const lookId = DEF_ALIAS[defId] ?? defId;
  let legs = slot === 'main' ? f.legs : f.manLegs;
  if (!legs) {
    legs = new LegSolver();
    if (slot === 'main') {
      f.legs = legs;
      f.knee = [0, 0];
      f.depth = { mainBehind: false };
      f.wx = 0;
      f.wy = 0;
    } else {
      f.manLegs = legs;
      f.manKnee = [0, 0];
      f.manDepth = { mainBehind: false };
    }
  }
  const knee = slot === 'main' ? f.knee! : f.manKnee!;
  const depth = slot === 'main' ? f.depth : f.manDepth;
  const moving = slot === 'main' && mode === 'walk';
  if (moving) {
    f.wx! += Math.cos(dir) * WALK_SPEED * dt;
    f.wy! += Math.sin(dir) * WALK_SPEED * dt;
  }
  const wx = slot === 'main' ? f.wx! : 0;
  const wy = slot === 'main' ? f.wy! : 0;
  const lp = legs.update(wx, wy, dir, dt);
  const feet = lp.feet.map((ft) => ({
    x: x + (ft.x - wx) * S,
    y: y + (ft.y - wy) * S * YS,
    lift: ft.lift,
  }));
  // The looping strike beat, slow enough that the jeer's gape and the
  // ear pin-back both read.
  const strikeT = mode === 'strike' ? (now * 0.0014) % 1 : 0;
  const pose = mode === 'strike' ? PoseState.Attack : moving ? PoseState.Walk : PoseState.Idle;
  const gob = info.kind === 'goblin' ? goblinLook(lookId, seed) : undefined;
  const gno = info.kind === 'gnoll' ? gnollLook(lookId, seed) : undefined;
  const kob = info.kind === 'kobold' ? koboldLook(lookId) : undefined;
  const eq = info.equip ?? {};
  drawHumanoid(ctx, {
    x,
    y,
    scale: S,
    size: info.size,
    dir,
    pose,
    poseT: mode === 'strike' ? strikeT : 1,
    drawT: 0,
    restT: mode === 'idle' || mode === 'hurt' ? 1 : 0,
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
    kneeMemory: knee,
    depthMemory: depth,
    bodyColor: gob?.hide ?? gno?.fur ?? kob?.hide ?? '#3f5d8e',
    skinColor: gob?.hide ?? gno?.fur ?? kob?.hide ?? undefined,
    hurt: mode === 'hurt',
    isOwn: false,
    gatherPhase: 0,
    sheathT: 0,
    // The equip→slot mapping lives in renderer.humanoidItem — a
    // direct-drawHumanoid rig passes the worn items by hand.
    weaponItem: eq.weapon,
    offhandItem: eq.offhand,
    headItem: eq.head,
    bodyItem: eq.body,
    goblin: gob,
    earSim: gob ? (f.ears ??= new EarSim(f.seed)) : undefined,
    gnoll: gno,
    kobold: kob,
  });
}

function drawSheet(now: number, dt: number): void {
  const nRows = rowTo - rowFrom + 1;
  canvas.width = (colTo - colFrom + 1) * CW;
  canvas.height = nRows * CH;
  ctx.fillStyle = '#2a3b2f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  figs.forEach((f, i) => {
    const sheetRow = Math.floor(i / COLS);
    if (sheetRow < rowFrom || sheetRow > rowTo) return;
    const sheetCol = i % COLS;
    if (sheetCol < colFrom || sheetCol > colTo) return;
    const homeX = CW / 2 + (sheetCol - colFrom) * CW;
    const homeY = Math.round(S * 2.3) + (sheetRow - rowFrom) * CH;
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.18)';
    ctx.lineWidth = 1; // figures leave fat stroke widths behind
    ctx.beginPath();
    ctx.moveTo(homeX - 0.9 * S, homeY);
    ctx.lineTo(homeX + 0.9 * S, homeY);
    ctx.stroke();

    // Ruler cells: the player stands a stride west of the goblin.
    if (f.ruler) {
      drawBody(f, 'player', homeX - 0.78 * S, homeY, Math.PI / 2, 'idle', 5, now, dt, 'ruler');
      drawBody(f, f.defId, homeX + 0.34 * S, homeY, f.dir, f.mode, f.seed, now, dt, 'main');
    } else {
      drawBody(f, f.defId, homeX, homeY, f.dir, f.mode, f.seed, now, dt, 'main');
    }
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.label, homeX, homeY - 2.2 * S);
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
