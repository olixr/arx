// TEMPORARY work verification harness (checked-in tooling): THE WORK
// SHEET — the standing audit surface for THE WORK LIVES IN THE WORLD
// (work.ts, docs/work-cycles-plan.md). Every work verb the engine
// speaks — chop, mine, forage, milk, and the station crafts — across
// all eight facing bands, on the flesh rig AND the dialect bodies
// whose carriage must survive it (the hunched folk at their stations
// are the acceptance scenario). Every figure owns a persistent
// LegSolver + kneeMemory + depthMemory (THE LAB LESSON: stateless
// figures kill every stateful arm law), and work rows feed restT 0 —
// the renderer's restful-set law, honestly. Levers:
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?det=1      DETERMINISTIC: all 240 fixed 60Hz steps run
//               synchronously on the first frame (?detn=N to change)
//   ?dbg=1      THE WORK AUDIT overlay: the rig's solved frame off
//               RIG_DEBUG (WHITE dashed = hand-orbit ring, GREY = hip
//               line, GREEN = shoulder roots, YELLOW/CYAN = arm
//               chains, RED/BLUE X = fist targets, MAGENTA = head
//               hull) plus the work engine's own truth: ORANGE ray =
//               the work bearing, ORANGE dots = the business-end tip
//               path over the whole cycle (the projected world arc —
//               watch it compress into an ellipse at N/S), ORANGE
//               ring = the tip at the impact beat.
import {
  LegSolver,
  RIG_DEBUG,
  drawHumanoid,
  gnollLook,
  goblinLook,
  koboldLook,
  type RigPose,
} from '../render/rig.js';
import { skralLook } from '../render/skral.js';
import { WORK_BOOK, resolveWork, workCycleU, type WorkKind } from '../render/work.js';
import { PoseState } from '@arx/shared';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const S = 150; // scale px per tile
const YS = 0.6; // camera y foreshorten, renderer's yScale

const q = new URLSearchParams(location.search);
const DBG = q.get('dbg') === '1';

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

type Dialect = 'flesh' | 'gnoll' | 'goblin' | 'kobold' | 'skral';

interface WorkRow {
  label: string;
  /** The verb: a WorkKind for engine rows. */
  kind: WorkKind;
  /** Pose + inputs the renderer would feed for this verb. */
  pose: PoseState;
  weapon?: string;
  foraging?: boolean;
  craftKind?: RigPose['craftKind'];
  dialect: Dialect;
}

const DIALECT_SIZE: Record<Dialect, number> = {
  flesh: 1,
  gnoll: 1.18,
  goblin: 0.85,
  kobold: 0.75,
  skral: 0.86,
};

const ROWS: WorkRow[] = [
  // The flesh rig, every verb.
  { label: 'chop', kind: 'chop', pose: PoseState.Gather, weapon: 'bronze_axe', dialect: 'flesh' },
  { label: 'mine', kind: 'mine', pose: PoseState.Gather, weapon: 'bronze_pickaxe', dialect: 'flesh' },
  { label: 'forage', kind: 'forage', pose: PoseState.Gather, foraging: true, dialect: 'flesh' },
  { label: 'milk', kind: 'milk', pose: PoseState.Milk, dialect: 'flesh' },
  { label: 'anvil', kind: 'anvil', pose: PoseState.Craft, craftKind: 'anvil', dialect: 'flesh' },
  { label: 'furnace', kind: 'furnace', pose: PoseState.Craft, craftKind: 'furnace', dialect: 'flesh' },
  { label: 'fire', kind: 'fire', pose: PoseState.Craft, craftKind: 'fire', dialect: 'flesh' },
  { label: 'bench', kind: 'workbench', pose: PoseState.Craft, craftKind: 'workbench', dialect: 'flesh' },
  // The dialect bodies at work — the stoop lane and the small folk.
  // The skral smith and the gnoll axeman are the acceptance scenarios:
  // a hunched carriage working a station must read as ITS OWN body at
  // the work, never the human frame wearing a fish head.
  { label: 'gnoll chop', kind: 'chop', pose: PoseState.Gather, weapon: 'bronze_axe', dialect: 'gnoll' },
  { label: 'skral anvil', kind: 'anvil', pose: PoseState.Craft, craftKind: 'anvil', dialect: 'skral' },
  { label: 'kobold mine', kind: 'mine', pose: PoseState.Gather, weapon: 'bronze_pickaxe', dialect: 'kobold' },
  { label: 'goblin bench', kind: 'workbench', pose: PoseState.Craft, craftKind: 'workbench', dialect: 'goblin' },
  { label: 'gnoll forage', kind: 'forage', pose: PoseState.Gather, foraging: true, dialect: 'gnoll' },
];

interface Fig {
  row: WorkRow;
  dir: number;
  legs?: LegSolver;
  kneeMemory?: number[];
  depthMemory?: RigPose['depthMemory'];
}

const figs: Fig[] = [];
for (const r of ROWS) for (const [, dir] of DIRS) figs.push({ row: r, dir });

const COLS = 8;
const CW = 300;
const CH = 430;
const rowsQ = q.get('rows');
let rowFrom = 0;
let rowTo = ROWS.length - 1;
if (rowsQ) {
  const m = /^(\d+)-(\d+)$/.exec(rowsQ);
  if (m) {
    rowFrom = Math.max(0, parseInt(m[1]!, 10));
    rowTo = Math.min(ROWS.length - 1, parseInt(m[2]!, 10));
  }
}

/** The skeleton overlay, straight off RIG_DEBUG (skrallab grammar). */
function drawDbg(): void {
  const d = RIG_DEBUG;
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.moveTo(d.x - 0.7 * d.s, d.armY);
  ctx.lineTo(d.x + 0.7 * d.s, d.armY);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(190,190,190,0.4)';
  ctx.beginPath();
  ctx.moveTo(d.x - 0.7 * d.s, d.hipY);
  ctx.lineTo(d.x + 0.7 * d.s, d.hipY);
  ctx.stroke();
  ctx.setLineDash([]);
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
  ctx.strokeStyle = 'rgba(235,80,225,0.9)';
  ctx.beginPath();
  ctx.arc(d.headX, d.headY, d.headR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The work engine's own truth: bearing ray, cycle-long tip path,
 *  impact-beat ring — anchored on the rig's recorded armY. */
function drawWorkDbg(f: Fig, homeX: number, nowMs: number): void {
  const d = RIG_DEBUG;
  const kind = f.row.kind;
  const spec = WORK_BOOK[kind];
  const size = DIALECT_SIZE[f.row.dialect];
  const sS = S * size;
  ctx.save();
  // ORANGE ray: the work bearing on the projected ground plane.
  ctx.strokeStyle = 'rgba(255,164,64,0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(homeX, d.armY);
  ctx.lineTo(homeX + Math.cos(f.dir) * sS, d.armY + Math.sin(f.dir) * YS * sS);
  ctx.stroke();
  // ORANGE dots: the business-end path over the whole cycle.
  ctx.fillStyle = 'rgba(255,164,64,0.85)';
  for (let i = 0; i < 48; i++) {
    const r = resolveWork(kind, i / 48, f.dir, nowMs);
    ctx.beginPath();
    ctx.arc(homeX + r.tipDX * sS, d.armY + r.tipDY * sS, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // ORANGE ring: the tip at the impact beat — where the FX spawn.
  if (spec.impactAt !== null) {
    const r = resolveWork(kind, spec.impactAt, f.dir, nowMs);
    ctx.strokeStyle = 'rgba(255,164,64,0.95)';
    ctx.beginPath();
    ctx.arc(homeX + r.tipDX * sS, d.armY + r.tipDY * sS, 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
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
    const homeY = 290 + (sheetRow - rowFrom) * CH;
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.18)';
    ctx.beginPath();
    ctx.moveTo(homeX - 0.72 * S, homeY);
    ctx.lineTo(homeX + 0.72 * S, homeY);
    ctx.stroke();

    if (!f.legs) {
      f.legs = new LegSolver();
      f.kneeMemory = [0, 0];
      f.depthMemory = { mainBehind: false };
    }
    const lp = f.legs.update(0, 0, f.dir, dt);
    const feet = lp.feet.map((ft) => ({
      x: homeX + ft.x * S,
      y: homeY + ft.y * S * YS,
      lift: ft.lift,
    }));
    const r = f.row;
    const rig: RigPose = {
      x: homeX,
      y: homeY,
      scale: S,
      size: DIALECT_SIZE[r.dialect],
      dir: f.dir,
      pose: r.pose,
      poseT: 1,
      drawT: 0,
      // Work rows are NON-restful states — restT 0, exactly as the
      // renderer's restful-set law feeds them (the skrallab lesson).
      restT: 0,
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
      gatherPhase: now / 1000,
      craftKind: r.craftKind ?? null,
      foraging: r.foraging,
      weaponItem: r.weapon,
      gnoll: r.dialect === 'gnoll' ? gnollLook('gnoll') : undefined,
      goblin: r.dialect === 'goblin' ? goblinLook('goblin') : undefined,
      kobold: r.dialect === 'kobold' ? koboldLook('kobold') : undefined,
      skral: r.dialect === 'skral' ? skralLook('skral') : undefined,
    };
    RIG_DEBUG.on = DBG;
    drawHumanoid(ctx, rig);
    RIG_DEBUG.on = false;
    if (DBG) {
      drawDbg();
      drawWorkDbg(f, homeX, now);
    }
    // The impact beat, called on the cell: a tick under the ground
    // line pulses at the book's own impact instant — eyeball SYNC
    // between the swing you see and the beat the FX will fire on.
    const spec = WORK_BOOK[r.kind];
    if (spec.impactAt !== null) {
      const u = workCycleU(r.kind, now);
      const since = (u - spec.impactAt + 1) % 1;
      if (since < 0.12) {
        ctx.fillStyle = `rgba(255,205,120,${1 - since / 0.12})`;
        ctx.beginPath();
        ctx.arc(homeX, homeY + 14, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${r.label} ${DIRS[i % COLS]![0]}`, homeX, homeY - 1.72 * S);
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
