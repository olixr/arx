// TEMPORARY rig verification harness (checked-in tooling): THE OGRE
// SHEET — the giant-dialect audit (docs/ogres-plan.md). All four
// bodies (brute / hurler / bellower / Bonegrinder) across the eight
// facing bands at idle, walk, and the looping strike (the ROAR must
// read — jaw drop, brow knit, skull tip), the bellower's cast row,
// and the hurt flash; a HIDE CLUSTER row proving eight consecutive
// spawn eids scatter a camp across all four hides; BODY-RULER cells
// standing the player rig, the gnoll packlord, and the goblin beside
// the giants so the broken stature ceiling reads at a glance; and a
// bare close-up band with no club in the fist. Each figure owns a
// live LegSolver AND live GutSim/PendantSim — the sheet plays the
// same physics the game does: walk rows breathe and bounce, strike
// rows throw the gut through the lunge, stops settle in one bounce.
// Levers:
//   ?s=px       cell scale (px per tile)
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?cols=a-b   column banding (E/W close-ups)
//   ?det=1      DETERMINISTIC mode: fixed 60Hz steps run synchronously
//               on the first frame; ?detn=N sets the step count.
import {
  LegSolver,
  drawHumanoid,
  goblinLook,
  gnollLook,
  type RigPose,
} from '../render/rig.js';
import { GutSim, PendantSim, ogreLook } from '../render/ogre.js';
import { PoseState } from '@arx/shared';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const S = Math.max(50, parseInt(q.get('s') ?? '90', 10) || 90); // scale px per tile (?s= zoom lever)
const YS = 0.6; // camera y foreshorten (world-y tile → screen), renderer's yScale

const WALK_SPEED = 1.45; // an ogre's stroll still covers ground

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
    kind: 'ogre' | 'gnoll' | 'goblin' | 'player';
    equip?: { weapon?: string; offhand?: string; head?: string; body?: string };
  }
> = {
  ogre: { size: 2.15, kind: 'ogre', equip: { weapon: 'ogre_greatclub' } },
  ogre_hurler: { size: 2.1, kind: 'ogre' },
  ogre_bellower: { size: 2.25, kind: 'ogre' },
  ogre_champion: { size: 2.5, kind: 'ogre', equip: { weapon: 'ogre_greatclub' } },
  ogre_bare: { size: 2.15, kind: 'ogre' },
  gnoll_champion: { size: 1.42, kind: 'gnoll', equip: { weapon: 'iron_greatblade' } },
  goblin: { size: 0.72, kind: 'goblin' },
  player: { size: 1, kind: 'player' },
};

/** Bare-body cells alias the real defs so the head is never occluded. */
const DEF_ALIAS: Record<string, string> = { ogre_bare: 'ogre' };

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
  /** THE GUT KEEPS ITS OWN TIME: live belly spring per ogre fig — the
   *  walk rows bounce with the bob exactly as in game. */
  gut?: GutSim;
  /** The belt-trophy pendant verlet — swings the stride, settles the stop. */
  pendant?: PendantSim;
}

const figs: Fig[] = [];
const row = (label: string, defId: string, mode: Mode, seed = 5): void => {
  for (const [lbl, dir] of DIRS) figs.push({ label: `${label} ${lbl}`, defId, dir, mode, seed });
};

// Sheet rows, top to bottom — the strike rows are where the ROAR
// reads; the bellower's cast row winds the bellows.
row('brute idle', 'ogre', 'idle');
row('brute walk', 'ogre', 'walk');
row('brute strike', 'ogre', 'strike');
row('hurler idle', 'ogre_hurler', 'idle');
row('hurler walk', 'ogre_hurler', 'walk');
row('bellower idle', 'ogre_bellower', 'idle');
row('bellower cast', 'ogre_bellower', 'cast');
row('Bonegrinder idle', 'ogre_champion', 'idle');
row('Bonegrinder walk', 'ogre_champion', 'walk');
row('Bonegrinder strike', 'ogre_champion', 'strike');
row('brute hurt', 'ogre', 'hurt');
// THE HIDE CLUSTER SPREAD: eight consecutive spawn eids facing the
// camera — the hash must scatter a camp across all four hides, and
// no two trophies or wart-fields may match.
for (let k = 0; k < 8; k++) {
  figs.push({ label: `camp eid ${700 + k}`, defId: 'ogre', dir: Math.PI / 2, mode: 'idle', seed: 700 + k });
}
// THE BODY RULER: the player rig beside the brute and the Bonegrinder
// (the 2x-and-more claim proven on screen), then the packlord and the
// goblin — the whole stature ladder in one row.
figs.push({ label: 'ruler: player+brute', defId: 'ogre', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+Bonegrinder', defId: 'ogre_champion', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'packlord (reference)', defId: 'gnoll_champion', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'goblin (reference)', defId: 'goblin', dir: Math.PI / 2, mode: 'idle', seed: 5 });
// Bare close-up band: no club in the fist, the head unoccluded — the
// quarter bands are where seams hide.
figs.push({ label: 'bare S (face)', defId: 'ogre_bare', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'bare SE (3/4)', defId: 'ogre_bare', dir: Math.PI / 4, mode: 'idle', seed: 5 });
figs.push({ label: 'bare E (profile)', defId: 'ogre_bare', dir: 0, mode: 'idle', seed: 5 });
figs.push({ label: 'bare NE (turn)', defId: 'ogre_bare', dir: -Math.PI / 4, mode: 'idle', seed: 5 });
figs.push({ label: 'bare N (back)', defId: 'ogre_bare', dir: -Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'bare W (profile)', defId: 'ogre_bare', dir: Math.PI, mode: 'idle', seed: 5 });
figs.push({ label: 'bare roar S', defId: 'ogre_bare', dir: Math.PI / 2, mode: 'strike', seed: 5 });
figs.push({ label: 'bare roar E', defId: 'ogre_bare', dir: 0, mode: 'strike', seed: 5 });

const COLS = 8;
// Giant cells: a 2.5-size body plus a raised club needs headroom the
// gnoll sheet never did.
const CW = Math.round(S * 3.2);
const CH = Math.round(S * 4.6);

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
  // The looping beat, slow enough that the roar's jaw drop and the
  // gut's follow-through both read.
  const beatT = mode === 'strike' || mode === 'cast' ? (now * 0.0012) % 1 : 0;
  const pose =
    mode === 'strike'
      ? PoseState.Attack
      : mode === 'cast'
        ? PoseState.Cast
        : moving
          ? PoseState.Walk
          : PoseState.Idle;
  const ogr = info.kind === 'ogre' ? ogreLook(lookId, seed) : undefined;
  const gno = info.kind === 'gnoll' ? gnollLook(lookId, seed) : undefined;
  const gob = info.kind === 'goblin' ? goblinLook(lookId, seed) : undefined;
  const eq = info.equip ?? {};
  drawHumanoid(ctx, {
    x,
    y,
    scale: S,
    size: info.size,
    dir,
    pose,
    poseT: mode === 'strike' || mode === 'cast' ? beatT : 1,
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
    bodyColor: ogr?.hide ?? gno?.fur ?? gob?.hide ?? '#3f5d8e',
    skinColor: ogr?.hide ?? gno?.fur ?? gob?.hide ?? undefined,
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
    ogre: ogr,
    // THE GUT AND THE TROPHY are live sims per fig — the sheet plays
    // the game's own physics, never a pose of it.
    ogreGut: ogr ? (f.gut ??= new GutSim(seed)) : undefined,
    ogrePendant: ogr ? (f.pendant ??= new PendantSim(seed)) : undefined,
    gnoll: gno,
    goblin: gob,
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
    const homeY = Math.round(S * 3.9) + (sheetRow - rowFrom) * CH;
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.18)';
    ctx.lineWidth = 1; // figures leave fat stroke widths behind
    ctx.beginPath();
    ctx.moveTo(homeX - 1.3 * S, homeY);
    ctx.lineTo(homeX + 1.3 * S, homeY);
    ctx.stroke();

    // Ruler cells: the player stands a stride west of the giant.
    if (f.ruler) {
      drawBody(f, 'player', homeX - 1.1 * S, homeY, Math.PI / 2, 'idle', 5, now, dt, 'ruler');
      drawBody(f, f.defId, homeX + 0.5 * S, homeY, f.dir, f.mode, f.seed, now, dt, 'main');
    } else {
      drawBody(f, f.defId, homeX, homeY, f.dir, f.mode, f.seed, now, dt, 'main');
    }
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.label, homeX, homeY - 3.7 * S);
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
