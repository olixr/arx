// TEMPORARY rig verification harness (checked-in tooling): THE SADDLE
// SHEET — the mount audit (THE ROAD GROWS SHORT, refit under THE
// MOTION DOCTRINE). Every saddle body (bay/grey/dun courser, the
// Hoargate garron, the Night Sabercat) across the eight facing bands
// at idle, walk, and FULL GALLOP (the flight rig's aerial beat is the
// whole point — shoot the gallop rows animated, not just settled),
// plus the hurt-flash silhouette row, a grey-dapple seed-spread row,
// and BODY-RULER cells standing the player rig beside the courser and
// the sabercat so the saddle height reads at a glance. Each figure
// owns a live LegRig AND a live TailSim — the sheet plays the same
// physics the game does: gallop rows fly, stops settle the hair fall
// in one swing, the cat's rope hooks up through its last third.
// Levers:
//   ?s=px       cell scale (px per tile)
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?cols=a-b   column banding (E/W close-ups)
//   ?only=id    one body huge (courser_bay, garron_hoargate, ...)
//   ?det=1      DETERMINISTIC mode: fixed 60Hz steps run synchronously
//               on the first frame; ?detn=N sets the step count.
import {
  COURSER_LOOKS,
  LegSolver,
  SABERCAT_LOOKS,
  drawBeast,
  drawHumanoid,
  mountSpec,
  shade,
  type RigPose,
} from '../render/rig.js';
import { LegRig } from '../render/legs.js';
import { TailSim, drawHorseTail, drawSabercatTail } from '../render/tail.js';
import { PoseState } from '@arx/shared';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const ONLY = q.get('only');
const S = Math.max(50, parseInt(q.get('s') ?? (ONLY ? '220' : '110'), 10) || 110);
const YS = 0.6; // camera y foreshorten (world-y tile → screen), renderer's yScale

const WALK_SPEED = 2.2; // a led amble — the four-beat walk must read
/** Full saddle speed per body (speedMult × PLAYER_SPEED 5). */
const GALLOP: Record<string, number> = {
  courser_bay: 8,
  courser_grey: 8,
  courser_dun: 8,
  garron_hoargate: 8,
  sabercat_night: 8.75,
};

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

type Mode = 'idle' | 'walk' | 'gallop' | 'hurt';

interface Fig {
  label: string;
  defId: string;
  dir: number;
  mode: Mode;
  seed: number;
  /** Ruler cells stand the player rig beside the saddle body. */
  ruler?: boolean;
  // live sim state
  wx?: number;
  wy?: number;
  legs?: LegRig;
  knee?: number[];
  tail?: TailSim;
  manLegs?: LegSolver;
  manKnee?: number[];
  manDepth?: RigPose['depthMemory'];
}

const figs: Fig[] = [];
const row = (label: string, defId: string, mode: Mode, seed = 5): void => {
  for (const [lbl, dir] of DIRS) figs.push({ label: `${label} ${lbl}`, defId, dir, mode, seed });
};

// Sheet rows, top to bottom — the gallop rows are where the flight
// rig's aerial beat and the streaming tail read.
row('bay idle', 'courser_bay', 'idle');
row('bay walk', 'courser_bay', 'walk');
row('bay gallop', 'courser_bay', 'gallop');
row('grey idle', 'courser_grey', 'idle');
row('grey gallop', 'courser_grey', 'gallop');
row('dun gallop', 'courser_dun', 'gallop');
row('garron idle', 'garron_hoargate', 'idle');
row('garron walk', 'garron_hoargate', 'walk');
row('garron gallop', 'garron_hoargate', 'gallop');
row('saber idle', 'sabercat_night', 'idle');
row('saber walk', 'sabercat_night', 'walk');
row('saber gallop', 'sabercat_night', 'gallop');
row('bay hurt', 'courser_bay', 'hurt');
row('saber hurt', 'sabercat_night', 'hurt');
// THE DAPPLE SPREAD: eight consecutive seeds on the grey — the scatter
// must differ horse to horse (seeded determinism, never random).
// Shot at the E band: the dapples live on the croup and shoulder top
// plane, which the S band hides behind the chest face.
for (let k = 0; k < 8; k++) {
  figs.push({ label: `grey seed ${900 + k}`, defId: 'courser_grey', dir: 0, mode: 'idle', seed: 900 + k });
}
// THE BODY RULER: the player rig beside the courser and the sabercat —
// the seat-height claim proven on screen.
figs.push({ label: 'ruler: player+bay', defId: 'courser_bay', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+saber', defId: 'sabercat_night', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+garron', defId: 'garron_hoargate', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });

const kept = ONLY ? figs.filter((f) => f.defId === ONLY) : figs;

const COLS = 8;
// Saddle cells: a courser is ~1.2 tiles nose to croup with a raised
// neck, plus the tail streaming a half-tile behind at the gallop.
const CW = Math.round(S * 2.7);
const CH = Math.round(S * 3.1);

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

/**
 * The renderer's saddle-tail dials, mirrored (renderer.ts owns the
 * live copy — keep these in step when retuning): heavy / rootOff /
 * tipCurl per body, dock height off the croup or haunch.
 */
function tailDials(defId: string, bodyLen: number): { heavy: number; rootOff: number; curl: number; hang: number; dockH: number } {
  if (defId.startsWith('sabercat')) {
    return { heavy: 0.95, rootOff: Math.min(0.6, bodyLen - 0.04), curl: 0.32, hang: 0.55, dockH: 0.36 };
  }
  if (defId.startsWith('garron')) {
    return { heavy: 0.62, rootOff: Math.min(0.56, bodyLen - 0.04), curl: 0, hang: 0.88, dockH: 0.5 };
  }
  return { heavy: 0.55, rootOff: Math.min(0.56, bodyLen - 0.04), curl: 0, hang: 0.88, dockH: 0.63 };
}

/** One saddle beast through drawBeast with live legs and tail. */
function drawMount(f: Fig, x: number, y: number, now: number, dt: number): void {
  const spec = mountSpec(f.defId);
  if (!f.legs) {
    f.legs = new LegRig(spec.rig);
    f.knee = [];
    f.wx = 0;
    f.wy = 0;
    const d = tailDials(f.defId, spec.bodyLen);
    f.tail = new TailSim(d.heavy, f.seed, d.rootOff, d.curl, d.hang);
  }
  const speed = f.mode === 'walk' ? WALK_SPEED : f.mode === 'gallop' ? (GALLOP[f.defId] ?? 8) : 0;
  if (speed > 0) {
    f.wx! += Math.cos(f.dir) * speed * dt;
    f.wy! += Math.sin(f.dir) * speed * dt;
  }
  const wx = f.wx!;
  const wy = f.wy!;
  const pose = f.legs.update(wx, wy, f.dir, dt);
  const feet = pose.feet.map((ft) => ({
    x: x + (ft.x - wx) * S,
    y: y + (ft.y - wy) * S * YS,
    lift: ft.lift,
  }));
  const d = tailDials(f.defId, spec.bodyLen);
  f.tail!.update(wx, wy, d.dockH + pose.bob * 0.35, pose.dir, dt, now / 1000, 1);
  const hurt = f.mode === 'hurt';
  const saber = f.defId.startsWith('sabercat');
  const tail = (): void => {
    const pts = f.tail!.nodes.map((nd) => ({
      x: x + (nd.x - wx) * S,
      y: y + (nd.y - wy) * S * YS - nd.z * S,
    }));
    const back = Math.sin(pose.dir) < -0.2;
    if (saber) {
      const look = SABERCAT_LOOKS[f.defId] ?? SABERCAT_LOOKS.sabercat_night!;
      drawSabercatTail(ctx, pts, { coat: look.coat, band: look.stripe, heavy: 1 }, S, { hurt, back });
    } else {
      const look = COURSER_LOOKS[f.defId] ?? COURSER_LOOKS.courser_bay!;
      drawHorseTail(
        ctx,
        pts,
        { hair: shade(look.mane, 18), strand: shade(look.mane, 2), heavy: f.defId.startsWith('garron') ? 1.15 : 1 },
        S,
        { hurt, back },
      );
    }
  };
  drawBeast(ctx, {
    x,
    y,
    scale: S,
    dir: pose.dir,
    radius: 0.42,
    color: '#7b4a2e',
    defId: f.defId,
    spec,
    pose,
    feet,
    yScale: YS,
    walkPhase: 0,
    hurt,
    kneeMemory: f.knee!,
    seed: f.seed,
    nowMs: now,
    tail,
  });
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
    const homeY = Math.round(S * 2.5) + (sheetRow - rowFrom) * CH;
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.18)';
    ctx.lineWidth = 1; // figures leave fat stroke widths behind
    ctx.beginPath();
    ctx.moveTo(homeX - 1.3 * S, homeY);
    ctx.lineTo(homeX + 1.3 * S, homeY);
    ctx.stroke();

    // Ruler cells: the player stands a stride west of the beast.
    if (f.ruler) {
      drawMan(f, homeX - 1.05 * S, homeY, now, dt);
      drawMount(f, homeX + 0.45 * S, homeY, now, dt);
    } else {
      drawMount(f, homeX, homeY, now, dt);
    }
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.label, homeX, homeY - 2.3 * S);
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
