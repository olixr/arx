// TEMPORARY wield verification harness (checked-in tooling): THE WIELD
// SHEET — the standing weapon-carry audit (the arms-v3 ARMS SHEET,
// re-homed here when riglab became the goblin sheet). Every carry class the game knows
// (bare fists, sword standard + rogue, dual blades, sword-and-board,
// greatblade, staff, bow, arm-carried offhand) across all eight facing
// bands, at idle AND at a live simulated gait: each figure owns a real
// LegSolver and a drifting world position, so feet plant, poles pump,
// and every depth/side hysteresis runs exactly as in game. Levers:
//   ?rows=a-b   draw only sheet rows a..b (screenshot banding)
//   ?gait=walk  run rows amble at walk speed instead of sprinting
//   ?det=1      DETERMINISTIC mode: all 240 fixed 60Hz steps run
//               SYNCHRONOUSLY on the first frame (every step drawn, so
//               the caller-owned memories evolve exactly as live) and
//               the settled 4s state stays on canvas — headless
//               capture fires at "page idle", which is only ~4 rAF
//               frames in (measured), so an async det loop would hand
//               it an unsettled gait. Refactor passes byte-compare
//               before/after screenshots with this (the "zero pixels
//               changed" proof); the frame stamp says what you got.
import { LegSolver, drawHumanoid, type RigPose } from '../render/rig.js';
import { PoseState } from '@arx/shared';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const S = 150; // scale px per tile
const YS = 0.6; // camera y foreshorten (world-y tile → screen), renderer's yScale

const q = new URLSearchParams(location.search);
const GAIT_SPEED = q.get('gait') === 'walk' ? 1.5 : 4.6; // tiles/sec
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

interface Loadout {
  key: string;
  weapon?: string;
  off?: string;
  carry?: 'normal' | 'rogue';
  carryOff?: 'normal' | 'rogue';
}

const LOADOUTS: Record<string, Loadout> = {
  bare: { key: 'bare' },
  sword: { key: 'sword', weapon: 'bronze_sword' },
  rogue: { key: 'rogue', weapon: 'bronze_dagger', carry: 'rogue' },
  dual: { key: 'dual', weapon: 'bronze_sword', off: 'bronze_dagger', carryOff: 'rogue' },
  board: { key: 'board', weapon: 'bronze_sword', off: 'oak_kiteshield' },
  // THE SHIELD WAVE's carry classes: the biggest wall (the plant/
  // shoulder rig), the legion's door, the fist disc, the arm kite.
  wall: { key: 'wall', weapon: 'bronze_sword', off: 'aldarens_gate' },
  doorwall: { key: 'doorwall', weapon: 'steel_sword', off: 'legion_doorwall' },
  courtfist: { key: 'courtfist', weapon: 'bronze_sword', off: 'wintercourt_rime' },
  relic: { key: 'relic', weapon: 'bronze_sword', off: 'vale_reliquary' },
  great: { key: 'great', weapon: 'iron_greatblade' },
  staff: { key: 'staff', weapon: 'apprentice_staff' },
  // THE LONG STEEL's two grips: the war grip (empty off fist — THE
  // PORT carry, both hands) and the knight's couch (shield worn —
  // THE PLANT at rest, THE COUCH on the move).
  pole: { key: 'pole', weapon: 'steel_spear' },
  lancer: { key: 'lancer', weapon: 'knights_lance', off: 'oak_kiteshield' },
  bow: { key: 'bow', weapon: 'stickbow' },
  tome: { key: 'tome', weapon: 'bronze_sword', off: 'tome_of_embers' },
  axe: { key: 'axe', weapon: 'bronze_axe' },
  pick: { key: 'pick', weapon: 'bronze_pickaxe' },
};

type Mode = 'idle' | 'guard' | 'move' | 'walk' | 'strafe' | 'draw' | 'stowed' | 'pose' | 'flip';

/** Transition probes: the det frame where 'flip' rows enter Attack. */
const FLIP_AT = 120;

interface Fig {
  label: string;
  dir: number; // facing
  travel?: number; // travel heading when it differs (strafe row)
  mode: Mode;
  load: Loadout;
  /** mode 'pose': explicit pose/blend overrides — frozen strike
   *  samples, casts, seats, mid-sheathe states. All det-stable. */
  pose?: PoseState;
  poseT?: number;
  sitT?: number;
  sitStyle?: RigPose['sitStyle'];
  seatH?: number;
  sitVariant?: 0 | 1;
  sheathT?: number;
  // live sim state
  legs?: LegSolver;
  wx?: number;
  wy?: number;
  kneeMemory?: number[];
  depthMemory?: RigPose['depthMemory'];
  /** flip rows: emulated renderer rest clock (entry ramp/exit glide). */
  restfulSinceMs?: number;
  restK?: number;
}

const figs: Fig[] = [];
const row = (label: string, load: Loadout, mode: Mode): void => {
  for (const [lbl, dir] of DIRS) figs.push({ label: `${label} ${lbl}`, dir, mode, load });
};

// Sheet rows, top to bottom. Idle-then-gait per class so each carry's
// two stances sit stacked for judging.
row('bare idle', LOADOUTS.bare!, 'idle'); // 0
row('bare run', LOADOUTS.bare!, 'move'); // 1
row('sword idle', LOADOUTS.sword!, 'idle'); // 2
row('sword walk', LOADOUTS.sword!, 'walk'); // 3
row('sword run', LOADOUTS.sword!, 'move'); // 4
row('rogue idle', LOADOUTS.rogue!, 'idle'); // 5
row('dual idle', LOADOUTS.dual!, 'idle'); // 6
row('dual run', LOADOUTS.dual!, 'move'); // 7
row('board idle', LOADOUTS.board!, 'idle'); // 8
row('board run', LOADOUTS.board!, 'move'); // 9
row('great idle', LOADOUTS.great!, 'idle'); // 10
row('great run', LOADOUTS.great!, 'move'); // 11
row('staff idle', LOADOUTS.staff!, 'idle'); // 12
row('staff walk', LOADOUTS.staff!, 'walk'); // 13
row('staff run', LOADOUTS.staff!, 'move'); // 14
row('bow idle', LOADOUTS.bow!, 'idle'); // 15
row('bow run', LOADOUTS.bow!, 'move'); // 16
row('bow draw', LOADOUTS.bow!, 'draw'); // 17
// Strafe row: the body FACES south (camera) while traveling all eight
// headings — the aim/travel disagreement that folded elbows historically.
for (const [lbl, trav] of DIRS) {
  figs.push({ label: `strafe→${lbl}`, dir: Math.PI / 2, travel: trav, mode: 'strafe', load: LOADOUTS.sword! }); // 18
}
row('stowed idle', LOADOUTS.dual!, 'stowed'); // 19
row('tome idle', LOADOUTS.tome!, 'idle'); // 20

// ---- THE ASSEMBLY ROWS (arms-v3 Phase 2): every non-gait state the
// one-mouth assembly owns, frozen at its most readable beat so the
// det harness can byte-compare the whole cascade, not just carries.
const poseRow = (label: string, load: Loadout, o: Partial<Fig>): void => {
  for (const [lbl, dir] of DIRS) {
    figs.push({ label: `${label} ${lbl}`, dir, mode: 'pose', load, ...o });
  }
};
poseRow('sword cut', LOADOUTS.sword!, { pose: PoseState.Attack, poseT: 0.48 }); // 21
poseRow('rogue rake', LOADOUTS.rogue!, { pose: PoseState.Attack, poseT: 0.42 }); // 22
poseRow('dual cut', LOADOUTS.dual!, { pose: PoseState.Attack, poseT: 0.55 }); // 23
poseRow('great fell', LOADOUTS.great!, { pose: PoseState.Attack, poseT: 0.55 }); // 24
poseRow('staff sweep', LOADOUTS.staff!, { pose: PoseState.Attack, poseT: 0.45 }); // 25
poseRow('sword ram', LOADOUTS.sword!, { pose: PoseState.Attack3, poseT: 0.55 }); // 26
poseRow('staff cast', LOADOUTS.staff!, { pose: PoseState.Cast, poseT: 0.25 }); // 27
poseRow('sit floor', LOADOUTS.sword!, { pose: PoseState.Sit, sitT: 1, sitVariant: 1 }); // 28
poseRow('sit chair', LOADOUTS.sword!, { pose: PoseState.Sit, sitT: 1, sitStyle: 'chair', seatH: 0.34 }); // 29
poseRow('sheathe 30%', LOADOUTS.dual!, { sheathT: 0.3 }); // 30
poseRow('sheathe 70%', LOADOUTS.dual!, { sheathT: 0.7 }); // 31
poseRow('chop', LOADOUTS.axe!, { pose: PoseState.Gather }); // 32
poseRow('mine', LOADOUTS.pick!, { pose: PoseState.Gather }); // 33
// THE TRANSITION PROBES: rest→combat pose flips at det frame 120,
// with the RENDERER'S rest clock emulated per figure (280ms entry
// ramp, exponential exit glide) — capture frames around the flip via
// ?detn=N and measure per-frame pixel deltas to PROVE the exit is a
// glide, not a snap. Row 34 sword, row 35 staff (the grip channel).
for (const [lbl, dir] of DIRS) figs.push({ label: `flip-sword ${lbl}`, dir, mode: 'flip', load: LOADOUTS.sword! }); // 34
for (const [lbl, dir] of DIRS) figs.push({ label: `flip-staff ${lbl}`, dir, mode: 'flip', load: LOADOUTS.staff! }); // 35

// ---- THE WALL CARRY rows (the shield wave's second rig): rest, the
// standing PLANT (mode 'guard' = combat idle, no gait — restT 0 with
// the body still, which is exactly the branch the plant law owns),
// and the shouldered run; then the wave's fist disc and arm kite.
// Appended after the historic sheet so every documented row index
// above survives untouched.
row('wall rest', LOADOUTS.wall!, 'idle'); // 36
row('wall plant', LOADOUTS.wall!, 'guard'); // 37
row('wall run', LOADOUTS.wall!, 'move'); // 38
row('doorwall plant', LOADOUTS.doorwall!, 'guard'); // 39
row('courtfist idle', LOADOUTS.courtfist!, 'idle'); // 40
row('relic idle', LOADOUTS.relic!, 'idle'); // 41

// ---- THE LONG STEEL rows (the polearm's two grips), appended so the
// historic indices above survive. Port: idle/walk/run + the ready
// guard; couched: the sentry's plant through idle and walk, the couch
// at a run, and the guard beside the wall. Strike rows come free via
// ?strike=pole / ?strike=lancer on the standing sweep.
row('pole port idle', LOADOUTS.pole!, 'idle'); // 42
row('pole port walk', LOADOUTS.pole!, 'walk'); // 43
row('pole port run', LOADOUTS.pole!, 'move'); // 44
row('pole guard', LOADOUTS.pole!, 'guard'); // 45
row('lancer plant', LOADOUTS.lancer!, 'idle'); // 46
row('lancer walk', LOADOUTS.lancer!, 'walk'); // 47
row('lancer couch run', LOADOUTS.lancer!, 'move'); // 48
row('lancer guard', LOADOUTS.lancer!, 'guard'); // 49
poseRow('pole thrust', LOADOUTS.pole!, { pose: PoseState.Attack, poseT: 0.5 }); // 50
poseRow('lancer thrust', LOADOUTS.lancer!, { pose: PoseState.Attack, poseT: 0.5 }); // 51

// ---- THE STRIKE SWEEP (?strike=<loadout>&stage=<0|1|2>): the whole
// beat, frame by frame — rows are TIME (poseT 0.02→0.98), columns the
// eight facings, one loadout+stage per sheet. This is the standing way
// to judge a cut's anticipation/snap/impact/follow-through at every
// heading; combine with ?det=1 for byte-stable captures.
const strikeQ = q.get('strike');
if (strikeQ && LOADOUTS[strikeQ]) {
  const stageQ = parseInt(q.get('stage') ?? '0', 10);
  const pose =
    stageQ === 2 ? PoseState.Attack3 : stageQ === 1 ? PoseState.Attack2 : PoseState.Attack;
  figs.length = 0;
  const SWEEP_N = 12;
  for (let k = 0; k < SWEEP_N; k++) {
    const t = 0.02 + (0.96 * k) / (SWEEP_N - 1);
    for (const [lbl, dir] of DIRS) {
      figs.push({
        label: `${strikeQ}${stageQ} t=${t.toFixed(2)} ${lbl}`,
        dir,
        mode: 'pose',
        load: LOADOUTS[strikeQ]!,
        pose,
        poseT: t,
      });
    }
  }
}

const COLS = 8;
const CW = 240;
const CH = 330;

// Row banding lever for screenshots: ?rows=0-9
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
    const homeY = 250 + (sheetRow - rowFrom) * CH;
    // Cell furniture: a ground line under the feet and the label at the
    // TOP of the cell so it can never overlap a neighboring figure.
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.18)';
    ctx.beginPath();
    ctx.moveTo(homeX - 0.72 * S, homeY);
    ctx.lineTo(homeX + 0.72 * S, homeY);
    ctx.stroke();

    // Lazy per-fig sim state.
    if (!f.legs) {
      f.legs = new LegSolver();
      f.wx = 0;
      f.wy = 0;
      f.kneeMemory = [0, 0];
      f.depthMemory = { mainBehind: false };
    }
    const moving = f.mode === 'move' || f.mode === 'walk' || f.mode === 'strafe';
    const speed = f.mode === 'walk' ? WALK_SPEED : GAIT_SPEED;
    const heading = f.travel ?? f.dir;
    if (moving) {
      f.wx! += Math.cos(heading) * speed * dt;
      f.wy! += Math.sin(heading) * speed * dt;
    }
    const lp = f.legs.update(f.wx!, f.wy!, f.dir, dt);
    // World → cell: body pinned at the cell home, feet ride their
    // world offsets under the renderer's own y squash.
    const feet = lp.feet.map((ft) => ({
      x: homeX + (ft.x - f.wx!) * S,
      y: homeY + (ft.y - f.wy!) * S * YS,
      lift: ft.lift,
    }));
    const drawing = f.mode === 'draw';
    // Pose rows are NON-restful states (Attack/Cast/Sit/Gather):
    // restT 0, exactly as the renderer's restful-set law feeds them.
    // The mid-sheathe rows keep Idle + restT 1 (the real stow case).
    const posed = f.pose !== undefined;
    // Flip rows: Idle → Attack at FLIP_AT, with the renderer's own
    // rest-clock law emulated (280ms entry ramp, exp exit glide) so
    // the transition probe exercises exactly what the game feeds.
    let flipPose: PoseState | undefined;
    let flipPoseT = 1;
    let flipRest = 1;
    if (f.mode === 'flip') {
      const frameNo = now / (1000 / 60);
      const restful = frameNo < FLIP_AT;
      flipPose = restful ? PoseState.Idle : PoseState.Attack;
      flipPoseT = restful ? 1 : Math.min(1, ((frameNo - FLIP_AT) * (1000 / 60)) / 280);
      if (restful) f.restfulSinceMs ??= now;
      else f.restfulSinceMs = undefined;
      const target = restful ? Math.min(1, (now - (f.restfulSinceMs ?? now)) / 280) : 0;
      let rk = f.restK ?? target;
      if (target >= rk) rk = target;
      else rk += (target - rk) * (1 - Math.exp(-12 * dt));
      if (rk < 0.004) rk = 0;
      f.restK = rk;
      flipRest = rk;
    }
    const rig: RigPose = {
      x: homeX,
      y: homeY,
      scale: S,
      size: 1,
      dir: f.dir,
      pose:
        flipPose ?? f.pose ?? (drawing ? PoseState.Draw : moving ? PoseState.Walk : PoseState.Idle),
      poseT: f.mode === 'flip' ? flipPoseT : (f.poseT ?? 1),
      drawT: drawing ? 0.95 : 0,
      restT: f.mode === 'flip' ? flipRest : drawing || posed || f.mode === 'guard' ? 0 : 1,
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
      hurt: false,
      isOwn: false,
      gatherPhase: 0,
      weaponItem: f.load.weapon,
      offhandItem: f.load.off,
      carryStyle: f.load.carry,
      carryOff: f.load.carryOff,
      sheathT: f.mode === 'stowed' ? 1 : (f.sheathT ?? 0),
      sitT: f.sitT,
      sitStyle: f.sitStyle,
      seatH: f.seatH,
      sitVariant: f.sitVariant,
    };
    drawHumanoid(ctx, rig);
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.label, homeX, homeY - 1.62 * S);
  });
  // The stamp PROVES which sim state a screenshot captured (headless
  // capture timing is not obvious — measured at ~4 rAF frames in).
  if (DET) {
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`det frame ${frameIdx}`, 8, 20);
  }
  frameIdx++;
}

if (DET) {
  // All 240 steps synchronously, every step drawn — the caller-owned
  // memories (side ease, elbows, layer hysteresis) evolve exactly as
  // they would live, and the settled 4s state waits on the canvas for
  // however late (or early) the capture fires. Deferred into the first
  // rAF: running it at module init blocked the LOAD event and headless
  // capture fired on a blank page; inside a frame callback the busy
  // main thread instead makes the capture wait for completion.
  requestAnimationFrame(() => {
    for (let i = 0; i < DET_FRAMES; i++) drawSheet(i * (1000 / 60), 1 / 60);
  });
} else {
  requestAnimationFrame(frame);
}
