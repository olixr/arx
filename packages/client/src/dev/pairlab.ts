// TEMPORARY rig verification harness (checked-in tooling): THE CARRIED
// PAIR — THE VISIBLE BACK's audit sheet (weapon sets, Phase 3). Every
// meaningful pairing of a live set in the hands over a waiting set on
// the body, across the eight facing bands: the second belt row under
// the war belt, the crossed sling on the back, the slung wall, the
// waiting quiver, and the caped variants (gear straps over cloth).
// Each figure owns a live LegSolver + kneeMemory + depthMemory (THE
// LAB LESSON: stateful arm/stow laws are DEAD without them). Levers:
//   ?s=px       cell scale (px per tile)
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?det=1      DETERMINISTIC mode: fixed 60Hz steps run synchronously
//               on the first frame; ?detn=N sets the step count.
import { LegSolver, drawBackGear, drawHumanoid, type RigPose } from '../render/rig.js';
import { PoseState } from '@arx/shared';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const S = Math.max(60, parseInt(q.get('s') ?? '110', 10) || 110);
const YS = 0.6;

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

/** One pairing: the live set in the hands, the waiting set worn. */
interface Kit {
  weapon?: string;
  offhand?: string;
  stowWeapon?: string;
  stowOffhand?: string;
  cape?: string;
  body?: string;
  /** 1 = the live set is sheathed too (the crossed-back audit). */
  sheathed?: boolean;
}

const KITS: Record<string, Kit> = {
  // The flagship: sword and board live, bow and quiver waiting.
  swordboard_bow: {
    weapon: 'bronze_sword',
    offhand: 'oak_kiteshield',
    stowWeapon: 'shortbow',
    stowOffhand: 'frost_quiver',
  },
  // The reverse: bow drawn, sword and THE SLUNG WALL waiting.
  bow_swordboard: {
    weapon: 'shortbow',
    stowWeapon: 'bronze_sword',
    stowOffhand: 'oak_kiteshield',
  },
  // THE CROSS: the sheathed greatblade over the waiting bow.
  great_x_bow: { weapon: 'iron_greatblade', stowWeapon: 'shortbow', sheathed: true },
  // THE SECOND ROW: live daggers over waiting daggers — four hilts,
  // two rows, none kissing.
  daggers_daggers: {
    weapon: 'bronze_dagger',
    offhand: 'iron_dagger',
    stowWeapon: 'steel_dagger',
    stowOffhand: 'gold_dagger',
  },
  // The caped rank: waiting staff straps OVER the cloth (drawBackGear).
  caped_staff: { weapon: 'bronze_sword', stowWeapon: 'carved_staff', cape: 'cape_traveler' },
  // The caped wall: shield and quiver both riding a caped back.
  caped_wall: {
    weapon: 'shortbow',
    stowWeapon: 'iron_greatblade',
    stowOffhand: 'oak_kiteshield',
    cape: 'cape_traveler',
  },
};

type Mode = 'idle' | 'walk' | 'hurt';

interface Fig {
  label: string;
  kit: string;
  dir: number;
  mode: Mode;
  wx?: number;
  wy?: number;
  legs?: LegSolver;
  knee?: number[];
  depth?: RigPose['depthMemory'];
}

const figs: Fig[] = [];
const row = (label: string, kit: string, mode: Mode): void => {
  for (const [lbl, dir] of DIRS) figs.push({ label: `${label} ${lbl}`, kit, dir, mode });
};

// Sheet rows, top to bottom.
row('sword+board / bow waits', 'swordboard_bow', 'idle');
row('sword+board / bow waits', 'swordboard_bow', 'walk');
row('bow / wall waits', 'bow_swordboard', 'idle');
row('bow / wall waits', 'bow_swordboard', 'walk');
row('THE CROSS great x bow', 'great_x_bow', 'idle');
row('THE CROSS great x bow', 'great_x_bow', 'walk');
row('second row: 4 daggers', 'daggers_daggers', 'idle');
row('caped: staff over cloth', 'caped_staff', 'idle');
row('caped: wall + great', 'caped_wall', 'idle');
row('hurt flash', 'swordboard_bow', 'hurt');

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

function drawBody(f: Fig, x: number, y: number, now: number, dt: number): void {
  const kit = KITS[f.kit]!;
  if (!f.legs) {
    f.legs = new LegSolver();
    f.knee = [0, 0];
    f.depth = { mainBehind: false };
    f.wx = 0;
    f.wy = 0;
  }
  const moving = f.mode === 'walk';
  if (moving) {
    f.wx! += Math.cos(f.dir) * WALK_SPEED * dt;
    f.wy! += Math.sin(f.dir) * WALK_SPEED * dt;
  }
  const lp = f.legs.update(f.wx!, f.wy!, f.dir, dt);
  const feet = lp.feet.map((ft) => ({
    x: x + (ft.x - f.wx!) * S,
    y: y + (ft.y - f.wy!) * S * YS,
    lift: ft.lift,
  }));
  const pose: RigPose = {
    x,
    y,
    scale: S,
    size: 1,
    dir: f.dir,
    pose: moving ? PoseState.Walk : PoseState.Idle,
    poseT: 1,
    drawT: 0,
    restT: f.mode === 'idle' || f.mode === 'hurt' ? 1 : 0,
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
    bodyColor: '#3f5d8e',
    hurt: f.mode === 'hurt',
    isOwn: false,
    gatherPhase: 0,
    sheathT: kit.sheathed ? 1 : 0,
    weaponItem: kit.weapon,
    offhandItem: kit.offhand,
    stowWeaponItem: kit.stowWeapon,
    stowOffhandItem: kit.stowOffhand,
    bodyItem: kit.body,
    hasCape: kit.cape !== undefined,
  };
  // A caped body's back gear is the RENDERER's call (over the cloth,
  // on whichever side of the body the cape lands) — the lab plays the
  // renderer's part, cape-depth ordering included: facing the camera
  // the cape (and its gear) rides BEHIND the body. No cape cloth here
  // — the sim lives renderer-side; this sheet audits the gear path.
  const capeBehind = Math.sin(f.dir) > 0;
  if (kit.cape && capeBehind) drawBackGear(ctx, pose);
  drawHumanoid(ctx, pose);
  if (kit.cape && !capeBehind) drawBackGear(ctx, pose);
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
    const sheetCol = i % COLS;
    const homeX = CW / 2 + sheetCol * CW;
    const homeY = Math.round(S * 2.3) + (sheetRow - rowFrom) * CH;
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(homeX - 0.9 * S, homeY);
    ctx.lineTo(homeX + 0.9 * S, homeY);
    ctx.stroke();
    drawBody(f, homeX, homeY, now, dt);
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
