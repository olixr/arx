// TEMPORARY rig verification harness (untracked): renders the humanoid
// at controlled facings/poses with dual blades to verify depth layering
// and elbow behavior without touching a live game session.
//
// This round: the inward-elbow / crossed-arm edge cases at near-N/S
// facings — fine yaw sweeps, a facing "wiggle" that churns the side
// flip ease, and pre-poisoned elbow memory to test whether the
// remembered elbow ever heals. Cells flag RED when an elbow sign sits
// inboard while the figure is settled.
import { PoseState } from '@arx/shared';
import { drawHumanoid, type RigPose } from '../render/rig.js';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const S = 150; // scale px per tile
const HIP_HALF = 0.1;

type Gait = 'idle' | 'walk' | 'run';

interface Fig {
  label: string;
  dir: number | ((t: number) => number);
  gait: Gait;
  /** Seed the elbow memory INBOARD at t=0 — the poisoning probe. */
  poison?: boolean;
  kneeMemory: number[];
  depthMemory: NonNullable<RigPose['depthMemory']>;
}

const SOUTH = Math.PI / 2;
const NORTH = -Math.PI / 2;
const deg = (d: number): number => (d * Math.PI) / 180;

const defs: Array<Omit<Fig, 'kneeMemory' | 'depthMemory'>> = [
  // Row 1: fine yaw sweep around SOUTH, walking.
  { label: 'S-12 walk', dir: SOUTH - deg(12), gait: 'walk' },
  { label: 'S-6 walk', dir: SOUTH - deg(6), gait: 'walk' },
  { label: 'S walk', dir: SOUTH, gait: 'walk' },
  { label: 'S+6 walk', dir: SOUTH + deg(6), gait: 'walk' },
  { label: 'S+12 walk', dir: SOUTH + deg(12), gait: 'walk' },
  { label: 'S run', dir: SOUTH, gait: 'run' },
  // Row 2: same around NORTH.
  { label: 'N-12 walk', dir: NORTH - deg(12), gait: 'walk' },
  { label: 'N-6 walk', dir: NORTH - deg(6), gait: 'walk' },
  { label: 'N walk', dir: NORTH, gait: 'walk' },
  { label: 'N+6 walk', dir: NORTH + deg(6), gait: 'walk' },
  { label: 'N+12 walk', dir: NORTH + deg(12), gait: 'walk' },
  { label: 'N run', dir: NORTH, gait: 'run' },
  // Row 3: the dynamic + poisoned probes.
  { label: 'S wiggle 10', dir: (t) => SOUTH + deg(10) * Math.sin(t * 2.6), gait: 'walk' },
  { label: 'S wiggle 16', dir: (t) => SOUTH + deg(16) * Math.sin(t * 2.6), gait: 'walk' },
  { label: 'N wiggle 16', dir: (t) => NORTH + deg(16) * Math.sin(t * 2.6), gait: 'walk' },
  { label: 'S poisoned walk', dir: SOUTH, gait: 'walk', poison: true },
  { label: 'S poisoned idle', dir: SOUTH, gait: 'idle', poison: true },
  { label: 'N poisoned walk', dir: NORTH, gait: 'walk', poison: true },
];

const figs: Fig[] = defs.map((f) => ({
  ...f,
  kneeMemory: [0, 0],
  depthMemory: { mainBehind: false },
}));

let seeded = false;

function frame(now: number): void {
  canvas.width = 6 * 260;
  canvas.height = 3 * 340;
  ctx.fillStyle = '#2a3b2f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  figs.forEach((f, i) => {
    const cx = 130 + (i % 6) * 260;
    const cy = 150 + Math.floor(i / 6) * 340;
    const t = now * 0.001;
    const dir = typeof f.dir === 'function' ? f.dir(t) : f.dir;
    const moving = f.gait !== 'idle';
    const runF = f.gait === 'run' ? 1 : 0;
    const speed = f.gait === 'run' ? 8 : 5;
    const stride = Math.sin(t * speed);
    const travelX = Math.cos(dir);
    const travelY = Math.sin(dir) * 0.52;
    const feet: Array<{ x: number; y: number; lift: number }> = [0, 1].map((leg) => {
      const sgn = leg === 0 ? -1 : 1;
      const ph = leg === 0 ? stride : -stride;
      const along = moving ? ph * (f.gait === 'run' ? 0.18 : 0.1) : 0;
      return {
        x: cx + sgn * HIP_HALF * S + travelX * along * S,
        y: cy + 0.44 * S + travelY * along * S,
        lift: moving
          ? Math.max(0, (leg === 0 ? 1 : -1) * Math.sin(t * speed)) *
            (f.gait === 'run' ? 0.12 : 0.07)
          : 0,
      };
    });
    // Poison probe: commit both elbows INBOARD once (main on side +1
    // outboard is sign -1, so inboard is +1; off arm mirrored).
    if (f.poison && !seeded) {
      f.depthMemory.mainElbow = { sign: 1 };
      f.depthMemory.offElbow = { sign: -1 };
    }
    const rig: RigPose = {
      x: cx,
      y: cy,
      scale: S,
      dir,
      pose: moving ? PoseState.Walk : PoseState.Idle,
      poseT: 0,
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
      bodyColor: '#3f5d8e',
      hurt: false,
      isOwn: false,
      weaponItem: 'iron_sword',
      offhandItem: 'iron_dagger',
      gatherPhase: 0,
    };
    drawHumanoid(ctx, rig);
    // Inversion detector: while settled, the main elbow (hanging on
    // side mem.side) should read sign -mem.side and the off elbow
    // +mem.side. Anything else is an inboard bow — flag the cell.
    const mem = f.depthMemory;
    const side = Math.sign(mem.side ?? 1) || 1;
    const mainSgn = mem.mainElbow?.sign ?? 0;
    const offSgn = mem.offElbow?.sign ?? 0;
    // A legitimate side flip holds the old elbow signs through the
    // 240ms crossing ease — only flag signs still inboard AFTER the
    // hands have arrived and the pole has had frames to reclaim.
    const settling = now - (mem.sideFlipMs ?? -1e9) < 350;
    const bad = !settling && (mainSgn === side || offSgn === -side);
    if (bad) {
      ctx.strokeStyle = '#d33';
      ctx.lineWidth = 3;
      ctx.strokeRect(cx - 120, cy - 130, 240, 320);
    }
    ctx.fillStyle = bad ? '#f4a' : '#e8e4d8';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.label, cx, cy + 0.62 * S + 60);
    ctx.fillText(`m${mainSgn > 0 ? '+' : mainSgn < 0 ? '-' : '0'} o${offSgn > 0 ? '+' : offSgn < 0 ? '-' : '0'} s${side > 0 ? '+' : '-'}`, cx, cy + 0.62 * S + 76);
  });
  seeded = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
