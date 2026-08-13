// TEMPORARY armor verification harness (checked-in tooling): THE
// PLATE SHEET — the high-road armor audit, riglab and bladelab's
// sibling. Every high-road set worn WHOLE (helm, body, greaves,
// sabatons, gauntlets) on a live rig across all eight facings, at
// idle and at a real simulated gait, ringed by the renderer's
// outline-dilate simulation, beside an oathgold benchmark row.
// Rows 13-15 are THE FALLEN GATE (gatefall, the plate lane's second
// flagship); rows 16+ are THE GRAND ARCANUM — the cloth high road —
// with riftweave as the cloth lane's own calibration row.
// THE LAB LESSON applies: every figure owns a persistent LegSolver +
// kneeMemory + depthMemory, or every stateful arm law is dead.
// The audits this sheet runs:
//   1. SILHOUETTE — pauldrons, helm and devices read inside the ring
//   2. THE LIVING WORD — each set's signature fx reads as ITS word
//   3. THE GAIT — tassets, skirts and shoulders ride a real run
//   4. THE FLASH — ?hurt=1 must give honest flat-white silhouettes
// Levers:
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?hurt=1     flat white hurt-flash silhouettes
//   ?gait=walk  run rows amble instead of sprint
//   ?s=<px>     body scale per cell (default 150)
//   ?sets=a,b   audit ANY families (one idle row each) instead of
//               the standing sheet — the lower-wardrobe sweep
import { LegSolver, RIG_DEBUG, drawHumanoid, type RigPose } from '../render/rig.js';
import { PoseState } from '@arx/shared';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const HURT = q.get('hurt') === '1';
// THE PERSPECTIVE SHEET: ?dbg=1 overlays the solved shoulder geometry
// on every cell — GREEN the solved bar and roots, RED the settle
// anchors (the billboard home), YELLOW the pauldron sockets, CYAN the
// honest 3D projection of the shoulder bar (reference only — the
// billboard never adopts it; see THE PROJECTION NEVER OWNS THE
// BILLBOARD). Calibrate the turned-bar laws against the cyan line:
// the green bar should collapse TOWARD it side-on without ever
// reaching its degenerate profile pinch.
const DBG = q.get('dbg') === '1';
const S = Number(q.get('s') ?? 150);
const YS = 0.6;
const GAIT_SPEED = q.get('gait') === 'walk' ? 1.5 : 4.6;

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

/** Full five-piece loadout per family. Plate nouns by default; the
 *  cloth lane wears its own (robe, skirts, slippers, wraps) with a
 *  bespoke head noun per set — the hat IS the identity. */
const CLOTH_HEADS: Record<string, string> = {
  riftweave: 'cowl',
  sunhallow: 'hood',
  stormsinger: 'hat',
  gloamsight: 'veil',
  flamewrought: 'crown',
  duskwarden: 'hat',
  aetherion: 'cowl',
  // The lower wardrobe: early five wear `wraps`, themed five `gloves`.
  thistledown: 'hood',
  mothwing: 'cowl',
  dawnsworn: 'hood',
  fenwalker: 'hood',
  stormwoven: 'hood',
  hedgemage: 'hat',
  tidecaller: 'hood',
  voidwhisper: 'cowl',
  cindersworn: 'hood',
  starweaver: 'circlet',
};
/** Cloth families whose hand piece says `gloves` instead of `wraps`. */
const CLOTH_GLOVES = new Set([
  'hedgemage', 'tidecaller', 'voidwhisper', 'cindersworn', 'starweaver',
]);
/** Lower-wardrobe families whose helm carries its own noun — the
 *  `_helm` default finds nothing and audits them bareheaded. */
const HELM_NOUNS: Record<string, string> = {
  bulwark: 'greathelm',
  sentinel: 'greathelm',
};
const worn = (family: string) => {
  const clothHead = CLOTH_HEADS[family];
  if (clothHead) {
    return {
      headItem: `${family}_${clothHead}`,
      bodyItem: `${family}_robe`,
      legsItem: `${family}_skirts`,
      bootsItem: `${family}_slippers`,
      glovesItem: `${family}_${CLOTH_GLOVES.has(family) ? 'gloves' : 'wraps'}`,
    };
  }
  return {
    headItem: `${family}_${HELM_NOUNS[family] ?? 'helm'}`,
    bodyItem: `${family}_platebody`,
    legsItem: `${family}_greaves`,
    bootsItem: `${family}_sabatons`,
    glovesItem: `${family}_gauntlets`,
  };
};

type Mode = 'idle' | 'move' | 'strike';

interface Fig {
  label: string;
  dir: number;
  mode: Mode;
  set: string;
  legs?: LegSolver;
  wx?: number;
  wy?: number;
  kneeMemory?: number[];
  depthMemory?: RigPose['depthMemory'];
}

const figs: Fig[] = [];
const row = (set: string, mode: Mode): void => {
  for (const [lbl, dir] of DIRS) {
    figs.push({ label: `${set} ${mode} ${lbl}`, dir, mode, set });
  }
};

// The benchmark first, then the high road in bracket order. Run rows
// prove the shoulders, tassets and fx ride a real gait; the strike
// row proves the lion keeps its face through a swing.
row('oathgold', 'idle'); // 0 — the old road's best, for calibration
row('jadeskull', 'idle'); // 1
row('jadeskull', 'move'); // 2
row('fellbone', 'idle'); // 3
row('fellbone', 'move'); // 4
row('redmarch', 'idle'); // 5
row('redmarch', 'move'); // 6
row('rimethorn', 'idle'); // 7
row('rimethorn', 'move'); // 8
row('palethorn', 'idle'); // 9 — the twin quench, one row
row('kingsmane', 'idle'); // 10
row('kingsmane', 'move'); // 11
row('kingsmane', 'strike'); // 12
// THE FALLEN GATE: the plate lane's second flagship — the strike row
// proves the keystone holds its float through a swing.
row('gatefall', 'idle'); // 13
row('gatefall', 'move'); // 14
row('gatefall', 'strike'); // 15
// THE GRAND ARCANUM: the cloth high road, with the old cloth road's
// best as its own calibration row.
row('riftweave', 'idle'); // 16 — the old cloth road's best
row('sunhallow', 'idle'); // 17
row('sunhallow', 'move'); // 18
row('stormsinger', 'idle'); // 19
row('stormsinger', 'move'); // 20
row('gloamsight', 'idle'); // 21
row('gloamsight', 'move'); // 22
row('flamewrought', 'idle'); // 23
row('flamewrought', 'move'); // 24
row('duskwarden', 'idle'); // 25
row('duskwarden', 'move'); // 26
row('aetherion', 'idle'); // 27
row('aetherion', 'move'); // 28
row('aetherion', 'strike'); // 29

// ?sets=a,b,c — audit ANY families instead of the standing sheet:
// one idle row each, plate nouns unless CLOTH_HEADS knows the family.
// The lever that lets the lab sweep the LOWER wardrobe too.
const setsQ = q.get('sets');
if (setsQ) {
  figs.length = 0;
  for (const fam of setsQ.split(',').map((t) => t.trim()).filter(Boolean)) {
    row(fam, 'idle');
  }
}

const COLS = 8;
const CW = 240;
const CH = 380;
const HOME_Y = 300;
const OUTLINE = '#241a2e';

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

// The outline-dilate simulation: figure into a scratch cell, the
// scratch tinted to the ring color, eight taps, art on top — the
// bladelab recipe at the renderer's body ring weight.
const scratch = document.createElement('canvas');
scratch.width = CW;
scratch.height = CH;
const sctx = scratch.getContext('2d')!;
const tinted = document.createElement('canvas');
tinted.width = CW;
tinted.height = CH;
const tctx = tinted.getContext('2d')!;

let lastNow = 0;

function frame(now: number): void {
  const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
  lastNow = now;
  const nRows = rowTo - rowFrom + 1;
  canvas.width = COLS * CW;
  canvas.height = nRows * CH;
  ctx.fillStyle = '#2a3b2f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const ring = Math.max(1.25, S * 0.04);
  const rd = Math.round(ring * 0.71);

  figs.forEach((f, i) => {
    const sheetRow = Math.floor(i / COLS);
    if (sheetRow < rowFrom || sheetRow > rowTo) return;
    const cellX = (i % COLS) * CW;
    const cellY = (sheetRow - rowFrom) * CH;

    if (!f.legs) {
      f.legs = new LegSolver();
      f.wx = 0;
      f.wy = 0;
      f.kneeMemory = [0, 0];
      f.depthMemory = { mainBehind: false };
    }
    const moving = f.mode === 'move';
    if (moving) {
      f.wx! += Math.cos(f.dir) * GAIT_SPEED * dt;
      f.wy! += Math.sin(f.dir) * GAIT_SPEED * dt;
    }
    const lp = f.legs.update(f.wx!, f.wy!, f.dir, dt);
    const feet = lp.feet.map((ft) => ({
      x: CW / 2 + (ft.x - f.wx!) * S,
      y: HOME_Y + (ft.y - f.wy!) * S * YS,
      lift: ft.lift,
    }));
    const striking = f.mode === 'strike';
    const rig: RigPose = {
      x: CW / 2,
      y: HOME_Y,
      scale: S,
      size: 1,
      dir: f.dir,
      pose: striking ? PoseState.Attack : moving ? PoseState.Walk : PoseState.Idle,
      poseT: striking ? (now * 0.0014) % 1 : 1,
      drawT: 0,
      restT: striking ? 0 : 1,
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
      kneeMemory: f.kneeMemory!,
      depthMemory: f.depthMemory,
      bodyColor: '#3f5d8e',
      hurt: HURT,
      isOwn: false,
      gatherPhase: 0,
      // Hands stay empty except the strike row: the gauntlets and
      // pauldrons are the subjects here, not the sword.
      weaponItem: striking ? 'bronze_sword' : undefined,
      ...worn(f.set),
    };

    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, CW, CH);
    RIG_DEBUG.on = DBG;
    drawHumanoid(sctx, rig);
    RIG_DEBUG.on = false;
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.clearRect(0, 0, CW, CH);
    tctx.drawImage(scratch, 0, 0);
    tctx.globalCompositeOperation = 'source-in';
    tctx.fillStyle = OUTLINE;
    tctx.fillRect(0, 0, CW, CH);
    tctx.globalCompositeOperation = 'source-over';
    for (const [ox, oy] of [
      [ring, 0], [-ring, 0], [0, ring], [0, -ring],
      [rd, rd], [rd, -rd], [-rd, rd], [-rd, -rd],
    ] as const) {
      ctx.drawImage(tinted, cellX + ox, cellY + oy);
    }
    ctx.drawImage(scratch, cellX, cellY);

    ctx.strokeStyle = 'rgba(232, 228, 216, 0.18)';
    ctx.beginPath();
    ctx.moveTo(cellX + CW / 2 - 0.72 * S, cellY + HOME_Y);
    ctx.lineTo(cellX + CW / 2 + 0.72 * S, cellY + HOME_Y);
    ctx.stroke();

    if (DBG) {
      // Scratch-local coords ARE cell-local — offset by the cell only.
      const d = RIG_DEBUG;
      const gx = (x: number): number => cellX + x;
      const gy = (y: number): number => cellY + y;
      ctx.lineWidth = 1.5;
      // CYAN: the honest 3D projection of a shoulder bar of the same
      // half-width, at the world's bird-eye tilt — the reference the
      // billboard leans toward but never fully adopts.
      const bx = Math.cos(d.dir) * d.tw * 0.98;
      const by = Math.sin(d.dir) * d.tw * 0.98 * 0.5;
      ctx.strokeStyle = 'rgba(80, 220, 235, 0.85)';
      ctx.beginPath();
      ctx.moveTo(gx(d.x - bx), gy(d.shoulderY - by));
      ctx.lineTo(gx(d.x + bx), gy(d.shoulderY + by));
      ctx.stroke();
      // RED: the settle anchors — the billboard's home for each root.
      ctx.strokeStyle = 'rgba(235, 80, 80, 0.9)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(gx(d.anchorMainX), gy(d.shoulderY));
      ctx.lineTo(gx(d.anchorOffX), gy(d.shoulderY));
      ctx.stroke();
      ctx.setLineDash([]);
      for (const ax of [d.anchorMainX, d.anchorOffX]) {
        ctx.beginPath();
        ctx.arc(gx(ax), gy(d.shoulderY), 2.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      // GREEN: the solved bar the arms actually hang from this frame.
      ctx.strokeStyle = 'rgba(90, 230, 110, 0.95)';
      ctx.beginPath();
      ctx.moveTo(gx(d.mainShX), gy(d.mainShY));
      ctx.lineTo(gx(d.offShX), gy(d.offShY));
      ctx.stroke();
      ctx.fillStyle = 'rgba(90, 230, 110, 0.95)';
      ctx.beginPath();
      ctx.arc(gx(d.mainShX), gy(d.mainShY), 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(gx(d.offShX), gy(d.offShY), 2.2, 0, Math.PI * 2);
      ctx.fill();
      // YELLOW: the pauldron sockets, tied down to the solved bar.
      ctx.fillStyle = 'rgba(240, 210, 60, 0.95)';
      for (const so of d.sockets) {
        ctx.beginPath();
        ctx.arc(gx(so.x), gy(so.y), 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // The yaw readout: signed fx, the angle the laws key on.
      ctx.fillStyle = '#9fdcff';
      ctx.font = '10px monospace';
      ctx.fillText(`fx ${Math.cos(d.dir).toFixed(2)}`, cellX + CW / 2, cellY + CH - 6);
    }
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.label, cellX + CW / 2, cellY + 16);
  });
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
