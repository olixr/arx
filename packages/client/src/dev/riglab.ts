// TEMPORARY rig verification harness (checked-in tooling): THE ARMS
// SHEET — the procedural-arm audit. Every carry class the game knows
// (bare fists, sword standard + rogue, dual blades, sword-and-board,
// greatblade, staff, bow, arm-carried offhand) across all eight facing
// bands, at idle AND at a live simulated gait: each figure owns a real
// LegSolver and a drifting world position, so feet plant, poles pump,
// and every depth/side hysteresis runs exactly as in game. Levers:
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?gait=walk  run rows amble at walk speed instead of sprinting
import { LegSolver, drawHumanoid, type RigPose } from '../render/rig.js';
import { PoseState } from '@arx/shared';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const S = 150; // scale px per tile
const YS = 0.6; // camera y foreshorten (world-y tile → screen), renderer's yScale

const q = new URLSearchParams(location.search);
const GAIT_SPEED = q.get('gait') === 'walk' ? 1.5 : 4.6; // tiles/sec
const WALK_SPEED = 1.5;

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

interface Loadout {
  key: string;
  weapon?: string;
  off?: string;
  carry?: 'normal' | 'rogue';
  carryOff?: 'normal' | 'rogue';
}

const LOADOUTS: Record<string, Loadout> = {
  bare: { key: 'bare' },
  sword: { key: 'sword', weapon: 'bronze_sword' },
  rogue: { key: 'rogue', weapon: 'bronze_dagger', carry: 'rogue' },
  dual: { key: 'dual', weapon: 'bronze_sword', off: 'bronze_dagger', carryOff: 'rogue' },
  board: { key: 'board', weapon: 'bronze_sword', off: 'oak_kiteshield' },
  great: { key: 'great', weapon: 'iron_greatblade' },
  staff: { key: 'staff', weapon: 'apprentice_staff' },
  bow: { key: 'bow', weapon: 'stickbow' },
  tome: { key: 'tome', weapon: 'bronze_sword', off: 'tome_of_embers' },
};

type Mode = 'idle' | 'move' | 'walk' | 'strafe' | 'draw' | 'stowed';

interface Fig {
  label: string;
  dir: number; // facing
  travel?: number; // travel heading when it differs (strafe row)
  mode: Mode;
  load: Loadout;
  // live sim state
  legs?: LegSolver;
  wx?: number;
  wy?: number;
  kneeMemory?: number[];
  depthMemory?: RigPose['depthMemory'];
}

const figs: Fig[] = [];
const row = (label: string, load: Loadout, mode: Mode): void => {
  for (const [lbl, dir] of DIRS) figs.push({ label: `${label} ${lbl}`, dir, mode, load });
};

// Sheet rows, top to bottom. Idle-then-gait per class so each carry's
// two stances sit stacked for judging.
row('bare idle', LOADOUTS.bare!, 'idle'); // 0
row('bare run', LOADOUTS.bare!, 'move'); // 1
row('sword idle', LOADOUTS.sword!, 'idle'); // 2
row('sword walk', LOADOUTS.sword!, 'walk'); // 3
row('sword run', LOADOUTS.sword!, 'move'); // 4
row('rogue idle', LOADOUTS.rogue!, 'idle'); // 5
row('dual idle', LOADOUTS.dual!, 'idle'); // 6
row('dual run', LOADOUTS.dual!, 'move'); // 7
row('board idle', LOADOUTS.board!, 'idle'); // 8
row('board run', LOADOUTS.board!, 'move'); // 9
row('great idle', LOADOUTS.great!, 'idle'); // 10
row('great run', LOADOUTS.great!, 'move'); // 11
row('staff idle', LOADOUTS.staff!, 'idle'); // 12
row('staff walk', LOADOUTS.staff!, 'walk'); // 13
row('staff run', LOADOUTS.staff!, 'move'); // 14
row('bow idle', LOADOUTS.bow!, 'idle'); // 15
row('bow run', LOADOUTS.bow!, 'move'); // 16
row('bow draw', LOADOUTS.bow!, 'draw'); // 17
// Strafe row: the body FACES south (camera) while traveling all eight
// headings — the aim/travel disagreement that folded elbows historically.
for (const [lbl, trav] of DIRS) {
  figs.push({ label: `strafe→${lbl}`, dir: Math.PI / 2, travel: trav, mode: 'strafe', load: LOADOUTS.sword! }); // 18
}
row('stowed idle', LOADOUTS.dual!, 'stowed'); // 19
row('tome idle', LOADOUTS.tome!, 'idle'); // 20

const COLS = 8;
const CW = 240;
const CH = 330;

// Row banding lever for screenshots: ?rows=0-9
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

let lastNow = 0;

function frame(now: number): void {
  const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
  lastNow = now;
  const nRows = rowTo - rowFrom + 1;
  canvas.width = COLS * CW;
  canvas.height = nRows * CH;
  ctx.fillStyle = '#2a3b2f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  figs.forEach((f, i) => {
    const sheetRow = Math.floor(i / COLS);
    if (sheetRow < rowFrom || sheetRow > rowTo) return;
    const homeX = CW / 2 + (i % COLS) * CW;
    const homeY = 250 + (sheetRow - rowFrom) * CH;
    // Cell furniture: a ground line under the feet and the label at the
    // TOP of the cell so it can never overlap a neighboring figure.
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.18)';
    ctx.beginPath();
    ctx.moveTo(homeX - 0.72 * S, homeY);
    ctx.lineTo(homeX + 0.72 * S, homeY);
    ctx.stroke();

    // Lazy per-fig sim state.
    if (!f.legs) {
      f.legs = new LegSolver();
      f.wx = 0;
      f.wy = 0;
      f.kneeMemory = [0, 0];
      f.depthMemory = { mainBehind: false };
    }
    const moving = f.mode === 'move' || f.mode === 'walk' || f.mode === 'strafe';
    const speed = f.mode === 'walk' ? WALK_SPEED : GAIT_SPEED;
    const heading = f.travel ?? f.dir;
    if (moving) {
      f.wx! += Math.cos(heading) * speed * dt;
      f.wy! += Math.sin(heading) * speed * dt;
    }
    const lp = f.legs.update(f.wx!, f.wy!, f.dir, dt);
    // World → cell: body pinned at the cell home, feet ride their
    // world offsets under the renderer's own y squash.
    const feet = lp.feet.map((ft) => ({
      x: homeX + (ft.x - f.wx!) * S,
      y: homeY + (ft.y - f.wy!) * S * YS,
      lift: ft.lift,
    }));
    const drawing = f.mode === 'draw';
    const rig: RigPose = {
      x: homeX,
      y: homeY,
      scale: S,
      size: 1,
      dir: f.dir,
      pose: drawing ? PoseState.Draw : moving ? PoseState.Walk : PoseState.Idle,
      poseT: 1,
      drawT: drawing ? 0.95 : 0,
      restT: drawing ? 0 : 1,
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
      kneeMemory: f.kneeMemory!,
      depthMemory: f.depthMemory,
      bodyColor: '#3f5d8e',
      hurt: false,
      isOwn: false,
      gatherPhase: 0,
      weaponItem: f.load.weapon,
      offhandItem: f.load.off,
      carryStyle: f.load.carry,
      carryOff: f.load.carryOff,
      sheathT: f.mode === 'stowed' ? 1 : 0,
    };
    drawHumanoid(ctx, rig);
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.label, homeX, homeY - 1.62 * S);
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
