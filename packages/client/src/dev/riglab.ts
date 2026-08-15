// TEMPORARY rig verification harness (checked-in tooling): THE FLIER
// SHEET — the flight-rig audit (THE PARLIAMENT RIDES THE RIG). Every
// flying body (great owl, elder, cave bat) across the eight facing
// bands in every carriage the rig flies: THE HOVER (upright treading
// watch), SLOW FLIGHT, full CRUISE (shot animated — the sim-fed wing
// vanes and the seeded glides are the whole point), the SWOOP loop,
// and the hurt-flash silhouette row. Plus THE TRANSITION ROW — a slow
// throttle wave so both the takeoff pitch-down and the arrival
// pitch-up play live at all eight bands — a plumage seed-spread row,
// and BODY-RULER cells standing the player rig beside each flier so
// altitude and mass read at a glance. Each figure owns a live
// FlightRig: the sheet plays the same physics the game does.
// Levers:
//   ?s=px       cell scale (px per tile)
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?cols=a-b   column banding (E/W close-ups)
//   ?only=id    one body huge (great_owl, elder_great_owl, cave_bat)
//   ?det=1      DETERMINISTIC mode: fixed 60Hz steps run synchronously
//               on the first frame; ?detn=N sets the step count.
import {
  ELDER_GREAT_OWL_LOOK,
  LegSolver,
  beastSpec,
  drawHumanoid,
  owlLook,
  type RigPose,
} from '../render/rig.js';
import { FlightRig, batLook, drawBat, drawGreatOwl, flierSpec } from '../render/flight.js';
import { PoseState } from '@arx/shared';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const ONLY = q.get('only');
const S = Math.max(40, parseInt(q.get('s') ?? (ONLY ? '220' : '92'), 10) || 92);
const YS = 0.6; // camera y foreshorten (world-y tile → screen), renderer's yScale

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

type Mode = 'hover' | 'slow' | 'cruise' | 'swoop' | 'hurt' | 'wave';

/** Travel dial per mode; the wave sweeps the whole ladder live. */
const MODE_MOVE: Record<Exclude<Mode, 'wave'>, number> = {
  hover: 0,
  slow: 0.4,
  cruise: 1,
  swoop: 0.5,
  hurt: 1,
};

/** World travel speed while the dial is open (tiles/s, cell shuttle). */
const SPEED: Record<string, number> = {
  great_owl: 4.4,
  elder_great_owl: 4.6,
  cave_bat: 2.6,
  giant_bat: 4.2,
  dire_bat: 4.6,
};

interface Fig {
  label: string;
  defId: string;
  dir: number;
  mode: Mode;
  seed: number;
  /** Ruler cells stand the player rig beside the flier. */
  ruler?: boolean;
  // live sim state
  wx?: number;
  wy?: number;
  rig?: FlightRig;
  manLegs?: LegSolver;
  manKnee?: number[];
  manDepth?: RigPose['depthMemory'];
}

const figs: Fig[] = [];
const row = (label: string, defId: string, mode: Mode, seed = 5): void => {
  for (const [lbl, dir] of DIRS) figs.push({ label: `${label} ${lbl}`, defId, dir, mode, seed });
};

// Sheet rows, top to bottom. The cruise and swoop rows animate — the
// sim-fed vanes, glide windows, and the mantle drag only live moving.
row('owl hover', 'great_owl', 'hover');
row('owl slow', 'great_owl', 'slow');
row('owl cruise', 'great_owl', 'cruise');
row('owl swoop', 'great_owl', 'swoop');
row('owl hurt', 'great_owl', 'hurt');
row('owl WAVE', 'great_owl', 'wave');
row('elder hover', 'elder_great_owl', 'hover', 9);
row('elder cruise', 'elder_great_owl', 'cruise', 9);
row('elder swoop', 'elder_great_owl', 'swoop', 9);
row('bat hover', 'cave_bat', 'hover', 3);
row('bat cruise', 'cave_bat', 'cruise', 3);
row('bat swoop', 'cave_bat', 'swoop', 3);
row('giant bat hover', 'giant_bat', 'hover', 4);
row('giant bat cruise', 'giant_bat', 'cruise', 4);
row('giant bat swoop', 'giant_bat', 'swoop', 4);
row('dire bat hover', 'dire_bat', 'hover', 6);
row('dire bat cruise', 'dire_bat', 'cruise', 6);
row('dire bat swoop', 'dire_bat', 'swoop', 6);
// THE PLUMAGE SPREAD: eight consecutive seeds — the parliament sorts
// into kin clusters, never rubber stamps. Shot at the E band where
// the mantle and barred keel both show.
for (let k = 0; k < 8; k++) {
  figs.push({ label: `owl seed ${900 + k}`, defId: 'great_owl', dir: 0, mode: 'hover', seed: 900 + k });
}
// THE BODY RULER: the player rig beside each flier — hover altitude
// and body mass proven on screen.
figs.push({ label: 'ruler: player+owl', defId: 'great_owl', dir: Math.PI / 2, mode: 'hover', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+elder', defId: 'elder_great_owl', dir: Math.PI / 2, mode: 'hover', seed: 9, ruler: true });
figs.push({ label: 'ruler: player+bat', defId: 'cave_bat', dir: Math.PI / 2, mode: 'hover', seed: 3, ruler: true });
figs.push({ label: 'ruler: player+giant bat', defId: 'giant_bat', dir: Math.PI / 2, mode: 'hover', seed: 4, ruler: true });
figs.push({ label: 'ruler: player+dire bat', defId: 'dire_bat', dir: Math.PI / 2, mode: 'hover', seed: 6, ruler: true });
// THE ROOST SPREAD: eight consecutive seeds per bat design — skin
// clusters and the modular bits (torn ears, mottle) proven mixed.
for (const bid of ['cave_bat', 'giant_bat', 'dire_bat']) {
  for (let k = 0; k < 8; k++) {
    figs.push({ label: `${bid} seed ${700 + k}`, defId: bid, dir: Math.PI / 2, mode: 'hover', seed: 700 + k });
  }
}

const kept = ONLY ? figs.filter((f) => f.defId === ONLY) : figs;

const COLS = 8;
// Flier cells: the elder spans 1.85 tiles per wing at full mantle and
// cruises 1.2 tiles up — cells are wide and tall so nothing clips.
const CW = Math.round(S * 3.9);
const CH = Math.round(S * 3.9);

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

/** One flier through its live FlightRig. */
function drawFlier(f: Fig, x: number, y: number, now: number, dt: number): void {
  if (!f.rig) {
    f.rig = new FlightRig(flierSpec(f.defId), f.seed);
    f.wx = 0;
    f.wy = 0;
  }
  // THE WAVE: a slow square-ish throttle so both transitions play —
  // open 5s, shut 5s — the state blend judged live, mid-swing.
  const moveK =
    f.mode === 'wave'
      ? Math.min(1, Math.max(0, Math.sin((now / 1000) * ((Math.PI * 2) / 10)) * 3 + 0.5))
      : MODE_MOVE[f.mode];
  const speed = moveK * (SPEED[f.defId] ?? 4);
  if (speed > 0) {
    f.wx! += Math.cos(f.dir) * speed * dt;
    f.wy! += Math.sin(f.dir) * speed * dt;
  }
  const attackT = f.mode === 'swoop' ? ((now / 1000) * 1.4) % 1 : 0;
  const flight = f.rig.update({
    x: f.wx!,
    y: f.wy!,
    dir: f.dir,
    moveK,
    dt,
    attackT,
  });
  const hurt = f.mode === 'hurt';
  // The ground shadow the renderer would cast — the altitude read.
  ctx.fillStyle = 'rgba(20, 16, 26, 0.28)';
  ctx.beginPath();
  const isBat = f.defId.endsWith('_bat');
  const shr =
    (f.defId === 'cave_bat' ? 0.5 : isBat ? 0.72 : 0.62) * S * (1.05 - 0.18 * flight.lift);
  ctx.ellipse(x, y, shr, shr * YS * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  if (isBat) {
    drawBat(ctx, batLook(f.defId, f.seed), {
      x,
      y,
      s: S,
      dir: f.dir,
      hurt,
      nowMs: now,
      seed: f.seed,
      ys: YS,
      flight,
      attackT,
    });
    return;
  }
  const spec = beastSpec(f.defId, f.defId === 'elder_great_owl' ? 0.46 : 0.36, SPEED[f.defId] ?? 4.4);
  const look = f.defId === 'elder_great_owl' ? ELDER_GREAT_OWL_LOOK : owlLook(f.defId, f.seed);
  drawGreatOwl(ctx, spec, look, {
    x,
    y,
    s: S,
    dir: f.dir,
    ys: YS,
    flight,
    attackT,
    hurt,
    nowMs: now,
    seed: f.seed,
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
    const homeY = Math.round(S * 2.55) + (sheetRow - rowFrom) * CH;
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.18)';
    ctx.lineWidth = 1; // figures leave fat stroke widths behind
    ctx.beginPath();
    ctx.moveTo(homeX - 1.5 * S, homeY);
    ctx.lineTo(homeX + 1.5 * S, homeY);
    ctx.stroke();

    // Ruler cells: the player stands a stride west of the flier.
    if (f.ruler) {
      drawMan(f, homeX - 1.05 * S, homeY, now, dt);
      drawFlier(f, homeX + 0.55 * S, homeY, now, dt);
    } else {
      drawFlier(f, homeX, homeY, now, dt);
    }
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.label, homeX, homeY - 2.35 * S);
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
