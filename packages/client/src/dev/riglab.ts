// TEMPORARY rig verification harness (untracked): renders the humanoid
// at controlled facings/poses with dual blades to verify depth layering
// and elbow behavior without touching a live game session.
import { PoseState } from '@arx/shared';
import { drawHumanoid, type RigPose } from '../render/rig.js';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const S = 200; // scale px per tile
const HIP_HALF = 0.1;

interface Fig {
  label: string;
  dir: number;
  run: boolean;
  kneeMemory: number[];
  depthMemory: { mainBehind: boolean };
  restClock: number;
}

const N = -Math.PI / 2;
const figs: Fig[] = [
  { label: 'N idle', dir: N, run: false },
  { label: 'N+14° idle', dir: N + 0.25, run: false },
  { label: 'N run', dir: N, run: true },
  { label: 'N+14° run', dir: N + 0.25, run: true },
  { label: 'S idle', dir: Math.PI / 2, run: false },
  { label: 'S run', dir: Math.PI / 2, run: true },
  { label: 'E idle', dir: 0, run: false },
  { label: 'E run', dir: 0, run: true },
].map((f) => ({ ...f, kneeMemory: [0, 0], depthMemory: { mainBehind: false }, restClock: 0 }));

function frame(now: number): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#2a3b2f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  figs.forEach((f, i) => {
    const cx = 160 + (i % 4) * 320;
    const cy = 300 + Math.floor(i / 4) * 360;
    const t = now * 0.001;
    const stride = Math.sin(t * 8);
    const travelX = Math.cos(f.dir);
    const travelY = Math.sin(f.dir) * 0.52;
    const feet: Array<{ x: number; y: number; lift: number }> = [0, 1].map((leg) => {
      const sgn = leg === 0 ? -1 : 1;
      const ph = leg === 0 ? stride : -stride;
      const along = f.run ? ph * 0.18 : 0;
      return {
        x: cx + sgn * HIP_HALF * S + travelX * along * S,
        y: cy + 0.44 * S + travelY * along * S,
        lift: f.run ? Math.max(0, leg === 0 ? Math.sin(t * 8) : -Math.sin(t * 8)) * 0.12 : 0,
      };
    });
    const rig: RigPose = {
      x: cx,
      y: cy,
      scale: S,
      dir: f.dir,
      pose: f.run ? PoseState.Walk : PoseState.Idle,
      poseT: 0,
      drawT: 0,
      restT: 1,
      nowMs: now,
      feet,
      bob: f.run ? Math.abs(Math.cos(t * 8)) * 0.03 : 0,
      rise: 0,
      wScale: 1 - 0.12 * Math.abs(Math.sin(f.dir)),
      poleX: f.run ? Math.cos(f.dir) : 0,
      poleY: f.run ? Math.sin(f.dir) : 0,
      poleStrength: f.run ? 1 : 0,
      runF: f.run ? 1 : 0,
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
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.label, cx, cy + 0.62 * S);
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
