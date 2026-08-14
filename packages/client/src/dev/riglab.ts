// TEMPORARY rig verification harness (checked-in tooling): THE LYNX
// SHEET — the tufted-shadow audit. Both cats (lynx + duskruff
// champion) across all eight facing bands at idle, walk, run, the
// looping pounce, and the hurt flash; a CLUSTER SPREAD row proving a
// spawned tribe rolls all four coats (never a rubber stamp); and
// BODY-RULER cells standing the player rig and the wolf family beside
// the cats so scale reads at a glance. Each figure owns a real LegRig
// and a drifting world position, so feet plant and knee hysteresis
// runs exactly as in game. Levers:
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?det=1      DETERMINISTIC mode: fixed 60Hz steps run synchronously
//               on the first frame; ?detn=N sets the step count.
import { LegSolver, drawHumanoid, beastSpec, drawBeast, lynxLook, type RigPose } from '../render/rig.js';
import { LegRig } from '../render/legs.js';
import { BobtailSim, drawBobtail } from '../render/tail.js';
import { PoseState } from '@arx/shared';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const S = Math.max(60, parseInt(q.get('s') ?? '150', 10) || 150); // scale px per tile (?s= zoom lever)
const YS = 0.6; // camera y foreshorten (world-y tile → screen), renderer's yScale

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

/** The bestiary rows this sheet audits (content defs, mirrored). */
const BEASTS: Record<string, { radius: number; color: string; speed: number }> = {
  lynx: { radius: 0.36, color: '#9c7f55', speed: 4.7 },
  lynx_champion: { radius: 0.44, color: '#565064', speed: 4.9 },
  wolf: { radius: 0.34, color: '#6a6f7d', speed: 4.6 },
  dire_wolf: { radius: 0.44, color: '#4b4854', speed: 4.8 },
};

type Mode = 'idle' | 'walk' | 'move' | 'pounce' | 'hurt';

interface Fig {
  label: string;
  defId: string;
  dir: number;
  mode: Mode;
  seed: number;
  /** Ruler cells stand the player rig beside the beast. */
  ruler?: boolean;
  // live sim state
  legs?: LegRig;
  bob?: BobtailSim;
  wx?: number;
  wy?: number;
  wp?: number;
  kneeMemory?: number[];
  manLegs?: LegSolver;
  manKnee?: number[];
  manDepth?: RigPose['depthMemory'];
}

const figs: Fig[] = [];
const row = (label: string, defId: string, mode: Mode, seed = 5): void => {
  for (const [lbl, dir] of DIRS) figs.push({ label: `${label} ${lbl}`, defId, dir, mode, seed });
};

// Sheet rows, top to bottom.
row('lynx idle', 'lynx', 'idle'); // 0
row('lynx walk', 'lynx', 'walk'); // 1
row('lynx run', 'lynx', 'move'); // 2
row('lynx pounce', 'lynx', 'pounce'); // 3
row('lynx hurt', 'lynx', 'hurt'); // 4
row('duskruff idle', 'lynx_champion', 'idle'); // 5
row('duskruff run', 'lynx_champion', 'move'); // 6
row('duskruff pounce', 'lynx_champion', 'pounce'); // 7
// THE CLUSTER SPREAD: eight consecutive spawn eids facing camera —
// the hash must scatter the tribe across all four coats.
for (let k = 0; k < 8; k++) {
  figs.push({ label: `tribe eid ${400 + k}`, defId: 'lynx', dir: Math.PI / 2, mode: 'idle', seed: 400 + k }); // 8
}
// THE BODY RULER: the player rig and the wolf family beside the cats.
figs.push({ label: 'ruler: player+lynx', defId: 'lynx', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'ruler: player+duskruff', defId: 'lynx_champion', dir: Math.PI / 2, mode: 'idle', seed: 5, ruler: true });
figs.push({ label: 'wolf (reference)', defId: 'wolf', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'lynx (beside)', defId: 'lynx', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'dire wolf (reference)', defId: 'dire_wolf', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'duskruff (beside)', defId: 'lynx_champion', dir: Math.PI / 2, mode: 'idle', seed: 5 });
figs.push({ label: 'lynx E (profile)', defId: 'lynx', dir: 0, mode: 'idle', seed: 5 });
figs.push({ label: 'duskruff E (profile)', defId: 'lynx_champion', dir: 0, mode: 'idle', seed: 5 }); // 9

const COLS = 8;
const CW = Math.round(S * 1.6);
const CH = Math.round(S * 2.2);

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

/** The player rig at rest — the unit of measure (the body-ruler law). */
function drawRulerMan(f: Fig, x: number, y: number, now: number, dt: number): void {
  if (!f.manLegs) {
    f.manLegs = new LegSolver();
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
  canvas.width = COLS * CW;
  canvas.height = nRows * CH;
  ctx.fillStyle = '#2a3b2f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  figs.forEach((f, i) => {
    const sheetRow = Math.floor(i / COLS);
    if (sheetRow < rowFrom || sheetRow > rowTo) return;
    const homeX = CW / 2 + (i % COLS) * CW;
    const homeY = Math.round(S * 1.67) + (sheetRow - rowFrom) * CH;
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.18)';
    ctx.beginPath();
    ctx.moveTo(homeX - 0.72 * S, homeY);
    ctx.lineTo(homeX + 0.72 * S, homeY);
    ctx.stroke();

    const info = BEASTS[f.defId]!;
    const spec = beastSpec(f.defId, info.radius, info.speed);
    if (!f.legs) {
      f.legs = new LegRig(spec.rig);
      f.wx = 0;
      f.wy = 0;
      f.wp = 0;
      f.kneeMemory = new Array(spec.rig.legs.length).fill(0);
    }
    const moving = f.mode === 'move' || f.mode === 'walk';
    const speed = f.mode === 'walk' ? WALK_SPEED : info.speed;
    if (moving) {
      f.wx! += Math.cos(f.dir) * speed * dt;
      f.wy! += Math.sin(f.dir) * speed * dt;
      f.wp! += speed * dt * 0.9;
    }
    const lp = f.legs.update(f.wx!, f.wy!, f.dir, dt);
    // World → cell: body pinned at the cell home, feet ride their
    // world offsets under the renderer's own y squash.
    const feet = lp.feet.map((ft) => ({
      x: homeX + (ft.x - f.wx!) * S,
      y: homeY + (ft.y - f.wy!) * S * YS,
      lift: ft.lift,
    }));
    // The pounce loop: crouch → strike on the renderer's 420ms clock,
    // held in a slow loop so the sheet shows every beat.
    const attackT = f.mode === 'pounce' ? ((now * 0.0014) % 1) : 0;
    // THE SIMULATED BOB: lynx figs run the live verlet stub exactly
    // as the game does — ticked here, painted through drawBeast's
    // depth seam.
    let tailFn: (() => void) | undefined;
    if (f.defId.startsWith('lynx')) {
      const champ = f.defId === 'lynx_champion';
      if (!f.bob) f.bob = new BobtailSim(champ ? 1.35 : 1, f.seed);
      f.bob.update(
        f.wx!,
        f.wy!,
        (champ ? 0.68 : 0.53) + lp.bob * 0.35,
        lp.dir,
        dt,
        now / 1000,
        1,
        attackT > 0 && attackT < 0.7 ? 1 : 0,
      );
      const look = lynxLook(f.defId, f.seed);
      const bob = f.bob;
      const bodyDx = f.ruler ? 0.28 * S : 0;
      tailFn = () => {
        const pts = bob.nodes.map((nd) => ({
          x: homeX + bodyDx + (nd.x - f.wx!) * S,
          y: homeY + (nd.y - f.wy!) * S * YS - nd.z * S,
        }));
        drawBobtail(ctx, pts, look, S, {
          hurt: f.mode === 'hurt',
          back: Math.sin(lp.dir) < -0.2,
        });
      };
    }
    // Ruler cells: the player stands a body-width west of the beast.
    if (f.ruler) drawRulerMan(f, homeX - 0.62 * S, homeY, now, dt);
    drawBeast(ctx, {
      x: homeX + (f.ruler ? 0.28 * S : 0),
      y: homeY,
      scale: S,
      dir: lp.dir,
      radius: info.radius,
      color: info.color,
      defId: f.defId,
      spec,
      pose: lp,
      feet: f.ruler ? feet.map((ft) => ({ ...ft, x: ft.x + 0.28 * S })) : feet,
      yScale: YS,
      walkPhase: f.wp!,
      // Constant white for the silhouette-gap audit (never a flicker
      // lottery for the capture).
      hurt: f.mode === 'hurt',
      kneeMemory: f.kneeMemory!,
      attackT,
      seed: f.seed,
      nowMs: now,
      tail: tailFn,
    });
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.label, homeX, homeY - 1.62 * S);
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
