// TEMPORARY rig verification harness (checked-in tooling): THE SHEEP
// SHEET — the ewe at all eight facing bands in BOTH fleece states
// (THE FLEECE TELLS THE TIME: full cloud vs clipped trim must read
// at a glance), running cells shuttling along their facing, and a
// ruler row: player rig, ram and cow kin beside her, and a seed
// spread so no two ewes stamp the same cloud.
import { beastSpec, drawBeast, drawHumanoid, type RigPose } from '../render/rig.js';
import { LegRig } from '../render/legs.js';
import { PoseState } from '@arx/shared';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const S = 150; // scale px per tile
const YS = 0.52; // camera y foreshorten (world-y tile → screen)

type Gait = 'idle' | 'run';

interface Fig {
  label: string;
  dir: number;
  gait: Gait;
  /** beast def id, or null for the bare player-rig reference body. */
  beast: string | null;
  color: string;
  radius: number;
  speed: number;
  shorn?: boolean;
  seed: number;
  legs?: LegRig;
  kneeMemory: number[];
  wx: number;
  wy: number;
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

const SHEEP = { color: '#e6dfcd', radius: 0.26, speed: 2.4 };

const defs: Array<Omit<Fig, 'kneeMemory' | 'wx' | 'wy'>> = [];
// Row 1: full fleece idle, all eight bands.
for (const [lbl, dir] of DIRS) {
  defs.push({ label: `fleece ${lbl}`, dir, gait: 'idle', beast: 'sheep', ...SHEEP, seed: 11 });
}
// Row 2: shorn idle, all eight bands — the clipped trim.
for (const [lbl, dir] of DIRS) {
  defs.push({ label: `shorn ${lbl}`, dir, gait: 'idle', beast: 'sheep', ...SHEEP, shorn: true, seed: 11 });
}
// Row 3: full fleece on the move, shuttling along the facing.
for (const [lbl, dir] of DIRS) {
  defs.push({ label: `run ${lbl}`, dir, gait: 'run', beast: 'sheep', ...SHEEP, seed: 11 });
}
// Row 4: the body-ruler audit + the kin + the seed spread.
defs.push({ label: 'player', dir: Math.PI / 2, gait: 'idle', beast: null, color: '#3f5d8e', radius: 0.3, speed: 2, seed: 0 });
defs.push({ label: 'ewe', dir: Math.PI / 2, gait: 'idle', beast: 'sheep', ...SHEEP, seed: 11 });
defs.push({ label: 'ewe shorn', dir: Math.PI / 2, gait: 'idle', beast: 'sheep', ...SHEEP, shorn: true, seed: 11 });
defs.push({ label: 'ram kin', dir: Math.PI / 2, gait: 'idle', beast: 'ram', color: '#cfc6b4', radius: 0.28, speed: 3.4, seed: 5 });
defs.push({ label: 'cow kin', dir: Math.PI / 2, gait: 'idle', beast: 'cow', color: '#e7ddca', radius: 0.34, speed: 1.8, seed: 3 });
for (const seed of [4, 19, 87]) {
  defs.push({ label: `ewe seed ${seed}`, dir: Math.PI / 2, gait: 'idle', beast: 'sheep', ...SHEEP, seed });
}

const figs: Fig[] = defs.map((f, i) => ({
  ...f,
  kneeMemory: [],
  wx: (i % 8) * 40,
  wy: Math.floor(i / 8) * 40,
}));

const COLS = 8;
const CW = 220;
const CH = 260;

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  canvas.width = COLS * CW;
  canvas.height = Math.ceil(figs.length / COLS) * CH;
  ctx.fillStyle = '#2a3b2f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  figs.forEach((f, i) => {
    const homeX = CW / 2 + (i % COLS) * CW;
    const homeY = 165 + Math.floor(i / COLS) * CH;
    const t = now * 0.001;
    // The shuttle: running cells travel along their facing, so the
    // leg rig plants real steps and the gait reads under motion.
    const shuttle = f.gait === 'run' ? Math.sin(t * 1.1) * 0.85 : 0;
    const wx = f.wx + Math.cos(f.dir) * shuttle;
    const wy = f.wy + Math.sin(f.dir) * shuttle;
    const toSx = (x: number): number => homeX + (x - f.wx) * S;
    const toSy = (y: number): number => homeY + (y - f.wy) * S * YS;

    if (!f.beast) {
      // The bare player rig — the unit of measure.
      const stride = 0;
      const feet = [0, 1].map((leg) => ({
        x: toSx(wx) + (leg === 0 ? -1 : 1) * 0.1 * S,
        y: toSy(wy) + 0.44 * S,
        lift: stride,
      }));
      const rig: RigPose = {
        x: toSx(wx),
        y: toSy(wy),
        scale: S,
        size: 1,
        dir: f.dir,
        pose: PoseState.Idle,
        poseT: 0,
        drawT: 0,
        restT: 1,
        nowMs: now,
        feet,
        bob: 0,
        rise: 0,
        wScale: 1 - 0.12 * Math.abs(Math.sin(f.dir)),
        poleX: 0,
        poleY: 0,
        poleStrength: 0,
        runF: 0,
        align: 1,
        kneeMemory: f.kneeMemory,
        depthMemory: { mainBehind: false },
        bodyColor: f.color,
        hurt: false,
        isOwn: false,
        gatherPhase: 0,
      };
      drawHumanoid(ctx, rig);
    } else {
      const spec = beastSpec(f.beast, f.radius, f.speed);
      if (!f.legs) f.legs = new LegRig(spec.rig);
      const legPose = f.legs.update(wx, wy, f.dir, dt);
      const feet = legPose.feet.map((ft) => ({ x: toSx(ft.x), y: toSy(ft.y), lift: ft.lift }));
      drawBeast(ctx, {
        x: toSx(wx),
        y: toSy(wy),
        scale: S,
        dir: legPose.dir,
        radius: f.radius,
        color: f.color,
        defId: f.beast,
        spec,
        pose: legPose,
        feet,
        yScale: YS,
        walkPhase: 0,
        hurt: false,
        kneeMemory: f.kneeMemory,
        seed: f.seed,
        nowMs: now,
        shorn: f.shorn === true,
        collar: '#8a6234',
      });
    }
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.label, homeX, homeY + 0.62 * S + 30);
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
