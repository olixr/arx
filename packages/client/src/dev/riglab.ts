// TEMPORARY rig verification harness (checked-in tooling): THE GOLEM
// SHEET — the construct-dialect audit (docs/golems-plan.md). All four
// builds (rock / iron / fire / ice) across the eight facing bands at
// idle, walk, the looping strike, the looping cast wind, and the hurt
// flash; a STONE CLUSTER row proving eight consecutive spawn eids
// scatter the rock golem across all four quarries; and BODY-RULER
// cells standing the player rig, the troll, and the gnoll packlord
// beside each golem so the tallest-walking-body claim reads at a
// glance. Each figure owns a live LegSolver, so feet plant and knee
// hysteresis run exactly as in game. Levers:
//   ?s=px       cell scale (px per tile)
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?det=1      DETERMINISTIC mode: fixed 60Hz steps run synchronously
//               on the first frame; ?detn=N sets the step count.
import { LegSolver, drawHumanoid, gnollLook, type RigPose } from '../render/rig.js';
import { golemLook } from '../render/golems.js';
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
const BODIES: Record<string, { size: number; color: string; skin?: string; kind: 'golem' | 'troll' | 'gnoll' | 'player' }> = {
  rock_golem: { size: 1.55, color: '#8a8164', kind: 'golem' },
  iron_golem: { size: 1.6, color: '#6f665e', kind: 'golem' },
  fire_golem: { size: 1.6, color: '#3a2c26', kind: 'golem' },
  ice_golem: { size: 1.7, color: '#9ec8dc', kind: 'golem' },
  troll: { size: 1.4, color: '#6a7d5c', skin: '#6a7d5c', kind: 'troll' },
  gnoll_champion: { size: 1.42, color: '#4e463c', kind: 'gnoll' },
  player: { size: 1, color: '#3f5d8e', kind: 'player' },
};

type Mode = 'idle' | 'walk' | 'strike' | 'cast' | 'hurt';

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

// Sheet rows, top to bottom — five rows per build.
for (const [id, tag] of [
  ['rock_golem', 'rock'],
  ['iron_golem', 'iron'],
  ['fire_golem', 'fire'],
  ['ice_golem', 'ice'],
] as const) {
  row(`${tag} idle`, id, 'idle');
  row(`${tag} walk`, id, 'walk');
  row(`${tag} strike`, id, 'strike');
  row(`${tag} cast`, id, 'cast');
  row(`${tag} hurt`, id, 'hurt');
}
// THE STONE CLUSTER SPREAD: eight consecutive spawn eids facing the
// camera — the hash must scatter the quarry across all four stones.
for (let k = 0; k < 8; k++) {
  figs.push({ label: `quarry eid ${400 + k}`, defId: 'rock_golem', dir: Math.PI / 2, mode: 'idle', seed: 400 + k });
}
// THE BODY RULER: the player rig beside each golem, then the troll
// and the packlord for the bestiary's old height records.
figs.push({ label: 'ruler: player+rock', defId: 'rock_golem', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+iron', defId: 'iron_golem', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+fire', defId: 'fire_golem', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+ice', defId: 'ice_golem', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'troll (reference)', defId: 'troll', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'packlord (reference)', defId: 'gnoll_champion', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'rock E (profile)', defId: 'rock_golem', dir: 0, mode: 'idle', seed: 5 });
figs.push({ label: 'ice E (profile)', defId: 'ice_golem', dir: 0, mode: 'idle', seed: 5 });

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
  const store = slot === 'main' ? f : (f as Required<Fig>);
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
  // Looping beats: the strike on a slow 700ms-ish loop, the cast wind
  // held longer so the flare ramp reads.
  const strikeT = mode === 'strike' ? (now * 0.0014) % 1 : 0;
  const castT = mode === 'cast' ? (now * 0.0008) % 1 : 0;
  const pose =
    mode === 'strike' ? PoseState.Attack : mode === 'cast' ? PoseState.Cast : moving ? PoseState.Walk : PoseState.Idle;
  drawHumanoid(ctx, {
    x,
    y,
    scale: S,
    size: info.size,
    dir,
    pose,
    poseT: mode === 'strike' ? strikeT : mode === 'cast' ? castT : 1,
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
    bodyColor: info.color,
    skinColor: info.kind === 'golem' ? golemLook(defId, seed).shell : info.skin,
    hurt: mode === 'hurt',
    isOwn: false,
    gatherPhase: 0,
    sheathT: 0,
    golem: info.kind === 'golem' ? golemLook(defId, seed) : undefined,
    gnoll: info.kind === 'gnoll' ? gnollLook(defId, seed) : undefined,
  });
  void store;
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

    // Ruler cells: the player stands a stride west of the golem.
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
