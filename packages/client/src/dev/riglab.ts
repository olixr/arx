// TEMPORARY rig verification harness (checked-in tooling): THE OWL
// SHEET — the parliament on the wing. Cruise cells at all eight
// facing bands (live wingbeats + seeded glides), the swoop strike
// loop, the landing/takeoff blend loop, the roost squat, the elder's
// heavier wing beside the hunter, a ruler row (player rig beside the
// bird), and a plumage-cluster spread so no two hunters stamp one coat.
import {
  beastSpec,
  drawGreatOwl,
  drawHumanoid,
  owlLook,
  type RigPose,
} from '../render/rig.js';
import { PoseState } from '@arx/shared';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const S = 150; // scale px per tile
const YS = 0.52; // camera y foreshorten (world-y tile → screen)

type Mode = 'cruise' | 'hover' | 'strike' | 'land' | 'perch';

interface Fig {
  label: string;
  dir: number;
  mode: Mode;
  /** owl def id, or null for the bare player-rig reference body. */
  owl: string | null;
  seed: number;
  /** Live banking demo: a slow weaving turn. */
  weave?: boolean;
  /** Portrait cells: scale multiplier for head-close judging. */
  zoom?: number;
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

const figs: Fig[] = [];
// Row 1: the hunter cruising, all eight bands — live beats and glides.
for (const [lbl, dir] of DIRS) figs.push({ label: `cruise ${lbl}`, dir, mode: 'cruise', owl: 'great_owl', seed: 11 });
// Row 2: the swoop loop, all eight bands — windup mantle into the dive.
for (const [lbl, dir] of DIRS) figs.push({ label: `swoop ${lbl}`, dir, mode: 'strike', owl: 'great_owl', seed: 11 });
// Row 3: THE HOVER, all eight bands — the pitched-up watch: deep
// slow beats, the breath of the column, the drift. Owls never sit.
for (const [lbl, dir] of DIRS) figs.push({ label: `hover ${lbl}`, dir, mode: 'perch', owl: 'great_owl', seed: 11 });
// Row 4: the altitude blend loop (air 0..1 — low hold to cruise).
for (const [lbl, dir] of [DIRS[0], DIRS[2], DIRS[4], DIRS[6]] as const) {
  figs.push({ label: `altitude ${lbl}`, dir, mode: 'land', owl: 'great_owl', seed: 11 });
}
figs.push({ label: 'hover S', dir: Math.PI / 2, mode: 'hover', owl: 'great_owl', seed: 11 });
figs.push({ label: 'bank weave', dir: Math.PI / 2, mode: 'cruise', owl: 'great_owl', seed: 11, weave: true });
figs.push({ label: 'elder swoop', dir: Math.PI / 2, mode: 'strike', owl: 'elder_great_owl', seed: 3 });
figs.push({ label: 'elder hover', dir: Math.PI / 2, mode: 'perch', owl: 'elder_great_owl', seed: 3 });
// Row 5: elder cruise cardinals + the body ruler + plumage spread.
for (const [lbl, dir] of [DIRS[0], DIRS[2], DIRS[4], DIRS[6]] as const) {
  figs.push({ label: `elder ${lbl}`, dir, mode: 'cruise', owl: 'elder_great_owl', seed: 3 });
}
figs.push({ label: 'player', dir: Math.PI / 2, mode: 'cruise', owl: null, seed: 0 });
for (const seed of [4, 9, 19]) {
  figs.push({ label: `plumage ${seed}`, dir: Math.PI / 2, mode: 'cruise', owl: 'great_owl', seed });
}
// Row 6: PORTRAITS — the head at 2.4x for eye/proportion judging.
figs.push({ label: 'portrait hover S', dir: Math.PI / 2, mode: 'perch', owl: 'great_owl', seed: 11, zoom: 2.05 });
figs.push({ label: 'portrait hover SE', dir: Math.PI / 4, mode: 'perch', owl: 'great_owl', seed: 11, zoom: 2.05 });
figs.push({ label: 'portrait hover E', dir: 0, mode: 'perch', owl: 'great_owl', seed: 11, zoom: 2.05 });
figs.push({ label: 'portrait cruise S', dir: Math.PI / 2, mode: 'cruise', owl: 'great_owl', seed: 11, zoom: 2 });
figs.push({ label: 'portrait swoop S', dir: Math.PI / 2, mode: 'strike', owl: 'great_owl', seed: 11, zoom: 1.7 });
figs.push({ label: 'portrait elder hover', dir: Math.PI / 2, mode: 'perch', owl: 'elder_great_owl', seed: 3, zoom: 1.75 });

const COLS = 8;
const CW = 240;
const CH = 300;

function frame(now: number): void {
  canvas.width = COLS * CW;
  canvas.height = Math.ceil(figs.length / COLS) * CH;
  ctx.fillStyle = '#2a3b2f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  figs.forEach((f, i) => {
    const homeX = CW / 2 + (i % COLS) * CW;
    const homeY = 205 + Math.floor(i / COLS) * CH;

    if (!f.owl) {
      // The bare player rig — the unit of measure.
      const feet = [0, 1].map((leg) => ({
        x: homeX + (leg === 0 ? -1 : 1) * 0.1 * S,
        y: homeY + 0.44 * S,
        lift: 0,
      }));
      const rig: RigPose = {
        x: homeX,
        y: homeY,
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
        kneeMemory: [0, 0],
        depthMemory: { mainBehind: false },
        bodyColor: '#3f5d8e',
        hurt: false,
        isOwn: false,
        gatherPhase: 0,
      };
      drawHumanoid(ctx, rig);
    } else {
      const defR = f.owl === 'elder_great_owl' ? 0.46 : 0.36;
      const defSp = f.owl === 'elder_great_owl' ? 4.6 : 4.4;
      const spec = beastSpec(f.owl, defR, defSp);
      const look = owlLook(f.owl, f.seed);
      const FS = S * (f.zoom ?? 1);
      const t = now * 0.001;
      // Per-mode drivers: looping poseT for the swoop, a slow
      // triangle for the landing blend, a weaving dir for banking.
      const at = f.mode === 'strike' ? (t * 1.1) % 1 : 0;
      const cyc = (t * 0.22) % 1;
      const air =
        f.mode === 'perch'
          ? 0
          : f.mode === 'land'
            ? cyc < 0.5
              ? 1 - cyc * 2
              : (cyc - 0.5) * 2
            : 1;
      const dir = f.weave ? f.dir + Math.sin(t * 0.9) * 0.8 : f.dir;
      const bank = f.weave ? Math.cos(t * 0.9) * 0.3 : 0;
      // The ground line the shadow would own — the altitude ruler,
      // drawn UNDER the bird.
      ctx.strokeStyle = 'rgba(232, 228, 216, 0.25)';
      ctx.beginPath();
      ctx.moveTo(homeX - 0.7 * S, homeY + 0.55 * S);
      ctx.lineTo(homeX + 0.7 * S, homeY + 0.55 * S);
      ctx.stroke();
      drawGreatOwl(ctx, spec, look, {
        x: homeX,
        y: homeY + 0.55 * S,
        s: FS,
        dir,
        ys: YS,
        air,
        moveK: f.mode === 'hover' || f.mode === 'perch' ? 0 : 1,
        bank,
        attackT: at,
        nowMs: now,
        seed: f.seed,
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
