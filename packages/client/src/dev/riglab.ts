// TEMPORARY rig verification harness (untracked): this round, THE
// GNOLL SHEET — the fur dialect at all eight facing bands, idle and
// on the move, skulker and packlord, with the player rig standing
// beside them for the body-ruler audit. Attack cells run the strike
// beat on a loop so the cackle gape and swing carriage read live.
import { PoseState } from '@arx/shared';
import { drawHumanoid, gnollLook, type RigPose } from '../render/rig.js';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const S = 150; // scale px per tile
const HIP_HALF = 0.1;

type Gait = 'idle' | 'walk' | 'run' | 'attack';

interface Fig {
  label: string;
  dir: number;
  gait: Gait;
  /** gnoll def id, or null for the bare player-rig reference body. */
  gnoll: string | null;
  seed: number;
  size: number;
  weapon?: string;
  kneeMemory: number[];
  depthMemory: NonNullable<RigPose['depthMemory']>;
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

// Live-game size multipliers (renderer GNOLL_SIZE).
const SKULKER_SIZE = 1.18;
const LORD_SIZE = 1.42;

const defs: Array<Omit<Fig, 'kneeMemory' | 'depthMemory'>> = [];
// Row 1: skulker idle, all eight bands.
for (const [lbl, dir] of DIRS) {
  defs.push({ label: `skulker ${lbl}`, dir, gait: 'idle', gnoll: 'gnoll', seed: 5, size: SKULKER_SIZE, weapon: 'rustbite' });
}
// Row 2: skulker running, all eight bands.
for (const [lbl, dir] of DIRS) {
  defs.push({ label: `skulker run ${lbl}`, dir, gait: 'run', gnoll: 'gnoll', seed: 5, size: SKULKER_SIZE, weapon: 'rustbite' });
}
// Row 3: packlord idle, all eight bands.
for (const [lbl, dir] of DIRS) {
  defs.push({ label: `lord ${lbl}`, dir, gait: 'idle', gnoll: 'gnoll_champion', seed: 9, size: LORD_SIZE, weapon: 'iron_greatblade' });
}
// Row 4: the body-ruler audit + strike beats + coat clusters.
defs.push({ label: 'player', dir: Math.PI / 2, gait: 'idle', gnoll: null, seed: 0, size: 1 });
defs.push({ label: 'skulker', dir: Math.PI / 2, gait: 'idle', gnoll: 'gnoll', seed: 5, size: SKULKER_SIZE, weapon: 'rustbite' });
defs.push({ label: 'lord', dir: Math.PI / 2, gait: 'idle', gnoll: 'gnoll_champion', seed: 9, size: LORD_SIZE, weapon: 'iron_greatblade' });
defs.push({ label: 'skulker strike S', dir: Math.PI / 2, gait: 'attack', gnoll: 'gnoll', seed: 5, size: SKULKER_SIZE, weapon: 'rustbite' });
defs.push({ label: 'lord strike E', dir: 0, gait: 'attack', gnoll: 'gnoll_champion', seed: 9, size: LORD_SIZE, weapon: 'iron_greatblade' });
// Coat clusters: four seeds that land in the four families.
for (const seed of [0, 8, 3, 22]) {
  defs.push({ label: `coat seed ${seed}`, dir: Math.PI / 2, gait: 'idle', gnoll: 'gnoll', seed, size: SKULKER_SIZE, weapon: 'rustbite' });
}

const figs: Fig[] = defs.map((f) => ({
  ...f,
  kneeMemory: [0, 0],
  depthMemory: { mainBehind: false },
}));

const COLS = 9;
const CW = 230;
const CH = 340;

function frame(now: number): void {
  canvas.width = COLS * CW;
  canvas.height = Math.ceil(figs.length / COLS) * CH;
  ctx.fillStyle = '#2a3b2f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  figs.forEach((f, i) => {
    const cx = CW / 2 + (i % COLS) * CW;
    const cy = 170 + Math.floor(i / COLS) * CH;
    const t = now * 0.001;
    const dir = f.dir;
    const moving = f.gait === 'walk' || f.gait === 'run';
    const runF = f.gait === 'run' ? 1 : 0;
    const speed = f.gait === 'run' ? 8 : 5;
    const stride = Math.sin(t * speed);
    const travelX = Math.cos(dir);
    const travelY = Math.sin(dir) * 0.52;
    const s = S * f.size;
    const feet: Array<{ x: number; y: number; lift: number }> = [0, 1].map((leg) => {
      const sgn = leg === 0 ? -1 : 1;
      const ph = leg === 0 ? stride : -stride;
      const along = moving ? ph * (f.gait === 'run' ? 0.18 : 0.1) : 0;
      return {
        x: cx + sgn * HIP_HALF * s + travelX * along * s,
        y: cy + 0.44 * s + travelY * along * s,
        lift: moving
          ? Math.max(0, (leg === 0 ? 1 : -1) * Math.sin(t * speed)) *
            (f.gait === 'run' ? 0.12 : 0.07)
          : 0,
      };
    });
    // The strike beat loops: poseT sweeps 0→1 about 1.4x a second.
    const poseT = f.gait === 'attack' ? (t * 1.4) % 1 : 0;
    const rig: RigPose = {
      x: cx,
      y: cy,
      scale: S,
      size: f.size,
      dir,
      pose: f.gait === 'attack' ? PoseState.Attack : moving ? PoseState.Walk : PoseState.Idle,
      poseT,
      drawT: 0,
      restT: 1,
      nowMs: now,
      feet,
      bob: moving ? Math.abs(Math.cos(t * speed)) * (f.gait === 'run' ? 0.03 : 0.015) : 0,
      rise: 0,
      wScale: 1 - 0.12 * Math.abs(Math.sin(dir)),
      poleX: moving ? Math.cos(dir) : 0,
      poleY: moving ? Math.sin(dir) : 0,
      poleStrength: moving ? 1 : 0,
      runF,
      align: 1,
      kneeMemory: f.kneeMemory,
      depthMemory: f.depthMemory,
      bodyColor: f.gnoll ? gnollLook(f.gnoll, f.seed).fur : '#3f5d8e',
      hurt: false,
      isOwn: false,
      weaponItem: f.weapon,
      gatherPhase: 0,
      skinColor: f.gnoll ? gnollLook(f.gnoll, f.seed).fur : undefined,
      gnoll: f.gnoll ? gnollLook(f.gnoll, f.seed) : undefined,
    };
    drawHumanoid(ctx, rig);
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.label, cx, cy + 0.62 * S + 60);
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
