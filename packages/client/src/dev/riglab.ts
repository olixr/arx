// TEMPORARY rig verification harness (checked-in tooling): THE GOBLIN
// SHEET — the greenskin-dialect audit. All five warband bodies
// (chopper / thrower / firecaller / gloomcaller / warboss) across the
// eight facing bands at idle, walk, the looping strike, and the hurt
// flash; a HIDE CLUSTER row proving eight consecutive spawn eids
// scatter the rank-and-file across all four greens; and BODY-RULER
// cells standing the player rig, the kobold, and the gnoll skulker
// beside the goblins so the stature ladder (knee-high menace, warboss
// under a man) reads at a glance. Each figure owns a live LegSolver,
// so feet plant and knee hysteresis run exactly as in game. Levers:
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
  goblin: { size: 0.72, kind: 'goblin', equip: { weapon: 'bronze_sword' } },
  goblin_thrower: { size: 0.7, kind: 'goblin' },
  goblin_firecaller: { size: 0.74, kind: 'goblin' },
  goblin_gloomcaller: { size: 0.76, kind: 'goblin' },
  goblin_champion: {
    size: 0.98,
    kind: 'goblin',
    equip: { weapon: 'gobmangler', offhand: 'gobnail_warboard', body: 'leather_body' },
  },
  gnoll: { size: 1.18, kind: 'gnoll' },
  kobold: { size: 0.75, kind: 'kobold' },
  player: { size: 1, kind: 'player' },
};

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
}

const figs: Fig[] = [];
const row = (label: string, defId: string, mode: Mode, seed = 5): void => {
  for (const [lbl, dir] of DIRS) figs.push({ label: `${label} ${lbl}`, defId, dir, mode, seed });
};

// Sheet rows, top to bottom — idle/walk/strike per body, hurt for the
// chopper and the warboss (the flash is shared plumbing).
row('chopper idle', 'goblin', 'idle');
row('chopper walk', 'goblin', 'walk');
row('chopper strike', 'goblin', 'strike');
row('thrower idle', 'goblin_thrower', 'idle');
row('thrower walk', 'goblin_thrower', 'walk');
row('firecaller idle', 'goblin_firecaller', 'idle');
row('firecaller strike', 'goblin_firecaller', 'strike');
row('gloomcaller idle', 'goblin_gloomcaller', 'idle');
row('warboss idle', 'goblin_champion', 'idle');
row('warboss walk', 'goblin_champion', 'walk');
row('warboss strike', 'goblin_champion', 'strike');
row('chopper hurt', 'goblin', 'hurt');
// THE HIDE CLUSTER SPREAD: eight consecutive spawn eids facing the
// camera — the hash must scatter the camp across all four greens.
for (let k = 0; k < 8; k++) {
  figs.push({ label: `camp eid ${400 + k}`, defId: 'goblin', dir: Math.PI / 2, mode: 'idle', seed: 400 + k });
}
// THE BODY RULER: the player rig beside the rabble and the warboss,
// then the kobold and the gnoll skulker for the bestiary's stature
// neighbors (goblin over the kobold, warboss under them all).
figs.push({ label: 'ruler: player+chopper', defId: 'goblin', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+warboss', defId: 'goblin_champion', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'kobold (reference)', defId: 'kobold', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'gnoll (reference)', defId: 'gnoll', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'chopper E (profile)', defId: 'goblin', dir: 0, mode: 'idle', seed: 5 });
figs.push({ label: 'warboss E (profile)', defId: 'goblin_champion', dir: 0, mode: 'idle', seed: 5 });
figs.push({ label: 'chopper N (back)', defId: 'goblin', dir: -Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'warboss N (back)', defId: 'goblin_champion', dir: -Math.PI / 2, mode: 'idle', seed: 5 });

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
  const gob = info.kind === 'goblin' ? goblinLook(defId, seed) : undefined;
  const gno = info.kind === 'gnoll' ? gnollLook(defId, seed) : undefined;
  const kob = info.kind === 'kobold' ? koboldLook(defId) : undefined;
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
    gnoll: gno,
    kobold: kob,
  });
}

function drawSheet(now: number, dt: number): void {
  const nRows = rowTo - rowFrom + 1;
  canvas.width = COLS * CW;
  canvas.height = nRows * CH;
  ctx.fillStyle = '#2a3b2f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  figs.forEach((f, i) => {
    const sheetRow = Math.floor(i / COLS);
    if (sheetRow < rowFrom || sheetRow > rowTo) return;
    const homeX = CW / 2 + (i % COLS) * CW;
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
