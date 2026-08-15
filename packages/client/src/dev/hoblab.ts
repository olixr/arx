// TEMPORARY rig verification harness (checked-in tooling): THE HOBGOBLIN
// SHEET — the legion audit (docs/hobgoblin-plan.md, THE LEGION
// DIALECT). All five bodies across the eight facing bands at idle,
// walk, and the STRIKE loop (the war-shout + ear pin-back beat —
// shoot the strike rows animated, never just settled),
// plus the hurt-flash silhouette rows, a skin-cluster seed-spread row
// (one legion, many faces — and ONE banner: the crimson must not
// vary), and BODY-RULER cells standing the player rig AND a goblin
// beside the legionary and the warlord — the master-race claim proven
// on screen, and the anti-twin proof that a hobgoblin shares nothing
// with the rabble it commands. Every figure owns a live biped
// LegSolver AND a live EarSim — the sheet plays the same physics the
// game does: strike rows pin the swept blades, stops settle them.
// Levers:
//   ?s=px       cell scale (px per tile)
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?cols=a-b   column banding (E/W close-ups)
//   ?only=id    one body huge (hobgoblin, hobgoblin_champion, ...)
//   ?ol=1       OUTLINE mode: every figure rings through a faithful
//               simulation of the renderer's dilate (radius law
//               max(1.25, s*0.04), integer 8-tap, ink under art)
//   ?det=1      DETERMINISTIC mode: fixed 60Hz steps run synchronously
//               on the first frame; ?detn=N sets the step count.
//   ?head=1     THE TURN STRIP: sixteen evenly-spaced headings of one
//               bare body (?only picks it) — the standing procedure
//               for vetting the head as a TURNED VOLUME: the face
//               must travel, tip, and wrap as one object across all
//               sixteen steps, not just behave at the eight bands.
//   ?probe=1    the head's own geometry overlay (HOB_HEAD_DEBUG):
//               magenta = the painter's true silhouette sampling,
//               green/red dots = the load-bearing feature stations on
//               camera-side / turned-away. Judge geometry first, art
//               second.
import { LegSolver, drawHumanoid, goblinLook, type RigPose } from '../render/rig.js';
import { HOB_HEAD_DEBUG, hobgoblinLook } from '../render/hobgoblin.js';
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

/** Renderer HOB_SIZE + GOBLIN_SIZE mirror — keep in step when retuning. */
const SIZE: Record<string, number> = {
  hobgoblin: 1.02,
  hobgoblin_archer: 1.0,
  hobgoblin_warcaster: 1.04,
  hobgoblin_champion: 1.28,
  hobgoblin_juggernaut: 1.62,
  goblin: 0.72,
  goblin_champion: 0.98,
};
/** Bestiary walk speeds, mirrored. */
const SPEED: Record<string, number> = {
  hobgoblin: 3.6,
  hobgoblin_archer: 3.5,
  hobgoblin_warcaster: 3.4,
  hobgoblin_champion: 3.8,
  hobgoblin_juggernaut: 3.1,
  goblin: 3.6,
  goblin_champion: 3.9,
};
/** Renderer HOBGOBLIN_EQUIP + GOBLIN_EQUIP mirror — the legion
 *  audits ARMED: the sword-and-board carry is half the read. */
const WEAPON: Record<string, string> = {
  hobgoblin: 'iron_sword',
  hobgoblin_archer: 'shortbow',
  hobgoblin_warcaster: 'ember_staff',
  hobgoblin_champion: 'steel_sword',
  hobgoblin_juggernaut: 'iron_greatblade',
  goblin: 'bronze_sword',
  goblin_champion: 'gobmangler',
};
const OFFHAND: Record<string, string> = {
  hobgoblin: 'oak_kiteshield',
  hobgoblin_archer: 'hunters_quiver',
  hobgoblin_champion: 'oak_kiteshield',
  goblin_champion: 'gobnail_warboard',
};

type Mode = 'idle' | 'walk' | 'strike' | 'cast' | 'hurt';

interface Fig {
  label: string;
  defId: string;
  dir: number;
  mode: Mode;
  seed: number;
  /** Ruler cells stand the player rig beside the hobgoblin body. */
  ruler?: boolean;
  /** Bare cells drop the weapons so no steel occludes the head. */
  bare?: boolean;
  // live sim state
  wx?: number;
  wy?: number;
  legs?: LegSolver;
  knee?: number[];
  depth?: RigPose['depthMemory'];
  ears?: EarSim;
  manLegs?: LegSolver;
  manKnee?: number[];
  manDepth?: RigPose['depthMemory'];
}

const figs: Fig[] = [];
const row = (label: string, defId: string, mode: Mode, seed = 5, bare = false): void => {
  for (const [lbl, dir] of DIRS) figs.push({ label: `${label} ${lbl}`, defId, dir, mode, seed, bare });
};

// Sheet rows, top to bottom — the strike rows are where the shout
// and the pin-back read; hurt rows are the silhouette truth; the
// bare rows uncover the war mask.
row('legion idle', 'hobgoblin', 'idle');
row('legion walk', 'hobgoblin', 'walk');
row('legion strike', 'hobgoblin', 'strike');
row('legion hurt', 'hobgoblin', 'hurt');
row('legion bare', 'hobgoblin', 'idle', 5, true);
row('bowman idle', 'hobgoblin_archer', 'idle', 11);
row('bowman walk', 'hobgoblin_archer', 'walk', 11);
row('warcast idle', 'hobgoblin_warcaster', 'idle');
row('warcast cast', 'hobgoblin_warcaster', 'cast');
row('warlord idle', 'hobgoblin_champion', 'idle');
row('warlord walk', 'hobgoblin_champion', 'walk');
row('warlord strike', 'hobgoblin_champion', 'strike');
row('warlord hurt', 'hobgoblin_champion', 'hurt');
row('warlord bare', 'hobgoblin_champion', 'idle', 5, true);
row('juggern idle', 'hobgoblin_juggernaut', 'idle');
row('juggern walk', 'hobgoblin_juggernaut', 'walk');
row('juggern strike', 'hobgoblin_juggernaut', 'strike');
// THE ANTI-TWIN ROW: the goblin beside the master race — the sheet
// must show two species arguing OPPOSITE things, sharing no line.
row('goblin ref', 'goblin', 'idle', 7);
// THE SKIN SPREAD: eight consecutive seeds on the legionary — the
// column must sort into the four skins (hash-first law) while the
// crimson sash stays ONE color (THE BANNER IS ONE, on screen).
for (let k = 0; k < 8; k++) {
  figs.push({ label: `legion seed ${900 + k}`, defId: 'hobgoblin', dir: Math.PI / 2, mode: 'idle', seed: 900 + k });
}
// THE BODY RULER: the player rig beside the ranks — the man-height
// claim proven on screen, and the goblin ruler for the mastery gap.
figs.push({ label: 'ruler: player+legion', defId: 'hobgoblin', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+warcast', defId: 'hobgoblin_warcaster', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+warlord', defId: 'hobgoblin_champion', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+juggern', defId: 'hobgoblin_juggernaut', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: goblin+legion', defId: 'hobgoblin', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });

// THE TURN STRIP: ?head=1 swaps the roster for sixteen headings of
// one bare body — the head-vetting procedure's own sheet.
if (q.get('head') === '1') {
  figs.length = 0;
  const id = ONLY ?? 'hobgoblin';
  for (let i = 0; i < 16; i++) {
    const a = Math.PI / 2 + (i / 16) * Math.PI * 2;
    figs.push({ label: `turn ${i}/16`, defId: id, dir: a, mode: 'idle', seed: 5, bare: true });
  }
}
HOB_HEAD_DEBUG.on = q.get('probe') === '1';

const kept = ONLY ? figs.filter((f) => f.defId === ONLY) : figs;

const COLS = 8;
const CW = Math.round(S * 2.2);
const CH = Math.round(S * 2.9);

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
let frameIdx = 0;
let lastNow = 0;

/** One legion body through drawHumanoid with live legs and live
 *  swept blades. Goblin reference cells run the greenskin dialect
 *  on the same ruler. */
function drawHob(f: Fig, x: number, y: number, now: number, dt: number): void {
  const size = SIZE[f.defId] ?? 1.02;
  const gob = f.defId.startsWith('goblin');
  if (!f.legs) {
    // The juggernaut walks the GIANT GAIT — the renderer's stature
    // law mirrored: 1.5+ bodies take the statured solver.
    f.legs = new LegSolver(!gob && size >= 1.5 ? size : 1);
    f.knee = [0, 0];
    f.depth = { mainBehind: false };
    f.ears = new EarSim(f.seed);
    f.wx = 0;
    f.wy = 0;
  }
  const speed = f.mode === 'walk' ? (SPEED[f.defId] ?? 3.6) : 0;
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
  const look = gob ? null : hobgoblinLook(f.defId, f.seed);
  const gb = gob ? goblinLook(f.defId, f.seed) : undefined;
  const striking = f.mode === 'strike' || f.mode === 'cast';
  const poseT = striking ? ((now / 1000) * 1.4) % 1 : 1;
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
    bodyColor: gob ? gb!.hide : look!.hide,
    skinColor: gob ? gb!.hide : look!.hide,
    hurt: f.mode === 'hurt',
    isOwn: false,
    gatherPhase: 0,
    sheathT: 0,
    weaponItem: f.bare ? undefined : WEAPON[f.defId],
    offhandItem: f.bare ? undefined : OFFHAND[f.defId],
    goblin: gb,
    hobgoblin: look ?? undefined,
    earSim: f.ears,
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

/** The goblin half of the mastery-gap ruler cell — one persistent
 *  fig so its sims live between frames like every other cell's. */
const gobRulerFig: Fig = { label: 'gob ruler', defId: 'goblin', dir: Math.PI / 2, mode: 'idle', seed: 7 };
function drawGobRuler(x: number, y: number, now: number, dt: number): void {
  drawHob(gobRulerFig, x, y, now, dt);
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
  ctx.fillStyle = '#33302a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  kept.forEach((f, i) => {
    const sheetRow = Math.floor(i / COLS);
    if (sheetRow < rowFrom || sheetRow > rowTo) return;
    const sheetCol = i % COLS;
    if (sheetCol < colFrom || sheetCol > colTo) return;
    const homeX = CW / 2 + (sheetCol - colFrom) * CW;
    const homeY = Math.round(S * 2.25) + (sheetRow - rowFrom) * CH;
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(homeX - 1.0 * S, homeY);
    ctx.lineTo(homeX + 1.0 * S, homeY);
    ctx.stroke();

    const paint = (): void => {
      if (f.ruler) {
        if (f.label.startsWith('ruler: goblin')) {
          drawGobRuler(homeX - 0.85 * S, homeY, now, dt);
        } else {
          drawMan(f, homeX - 0.85 * S, homeY, now, dt);
        }
        drawHob(f, homeX + 0.5 * S, homeY, now, dt);
      } else {
        drawHob(f, homeX, homeY, now, dt);
      }
    };
    if (OL) {
      paintCellOutlined(homeX - CW / 2, homeY - Math.round(S * 2.25), CW, CH, paint);
    } else {
      paint();
    }
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.label, homeX, homeY - 2.05 * S);
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
