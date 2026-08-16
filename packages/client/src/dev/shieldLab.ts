// THE SHIELD SHEET (checked-in tooling): the standing shield-art audit
// surface — the whole roster × a yaw sweep, every row at hero scale
// AND the three gameplay scales in the same sheet, because most
// defects only show at one of the two. This is the bench EVERY SHIELD
// PAINTS ITSELF prescribed as a throwaway; it earned a place on the
// wall with the shield wave (rebuilt here from that session's bench).
// Levers:
//   ?only=id,id   draw only these roster rows (screenshot banding)
//   ?theta=a,b,c  override the yaw stations (radians)
//   ?t=ms         freeze the living clock at one instant (screenshots,
//                 frame-by-frame audits); without it the sheet RUNS —
//                 shields with living art (the storm crown's arc, the
//                 aurora) move on the wall the way they move in game.
import { SHIELD_STYLES, drawShieldAt } from '../render/shields.js';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const ONLY = q.get('only')?.split(',');

// The wave first, then the elder roster — every authored shield rides
// the sheet, so a new record is on the wall the moment it exists.
const ROSTER = Object.keys(SHIELD_STYLES).filter((id) => !ONLY || ONLY.includes(id));

// Yaw stations: face-on, the icon's 0.42 three-quarter, half turn,
// near edge-on, past edge (reading the back), and the full back.
const THETAS = (q.get('theta')?.split(',').map(Number) ?? [0, 0.42, 0.9, 1.35, 2.2, Math.PI]);

const HERO = 74; // half-height px of the hero cells
const CELL = 200;
const SMALLS = [26, 17, 11]; // gameplay-scale half-heights
const ROW_H = CELL + 78;
const LABEL_W = 190;

canvas.width = LABEL_W + THETAS.length * CELL + SMALLS.length * 90 + 40;
canvas.height = ROSTER.length * ROW_H + 40;

ctx.textBaseline = 'middle';

// ?t= freezes the clock for deterministic screenshots; otherwise the
// sheet runs on rAF so living art moves here exactly as in game.
const FREEZE = q.get('t');

function render(nowMs: number): void {
  ctx.fillStyle = '#1c1524';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < ROSTER.length; r++) {
    const id = ROSTER[r]!;
    const st = SHIELD_STYLES[id]!;
    const cy = 30 + r * ROW_H + CELL / 2;
    ctx.fillStyle = '#e8dfc9';
    ctx.font = '15px monospace';
    ctx.fillText(id, 14, cy - 10);
    ctx.fillStyle = '#6f6680';
    ctx.font = '12px monospace';
    ctx.fillText(`${st.shape} · t${st.tier ?? '?'}`, 14, cy + 12);
    for (let c = 0; c < THETAS.length; c++) {
      const cx = LABEL_W + c * CELL + CELL / 2;
      // The dark seat so hangs and edges read against something.
      ctx.fillStyle = '#241c30';
      ctx.fillRect(LABEL_W + c * CELL + 6, 30 + r * ROW_H, CELL - 12, CELL + 44);
      drawShieldAt(ctx, st, { cx, cy: cy + 16, size: HERO, theta: THETAS[c]!, tilt: 0, nowMs });
      ctx.fillStyle = '#57506a';
      ctx.font = '11px monospace';
      ctx.fillText(`θ=${THETAS[c]!.toFixed(2)}`, LABEL_W + c * CELL + 12, 30 + r * ROW_H + CELL + 30);
    }
    // The gameplay strip: the icon yaw at the three world scales.
    for (let s = 0; s < SMALLS.length; s++) {
      const cx = LABEL_W + THETAS.length * CELL + s * 90 + 45;
      ctx.fillStyle = '#241c30';
      ctx.fillRect(cx - 40, 30 + r * ROW_H, 80, CELL + 44);
      drawShieldAt(ctx, st, { cx, cy: cy + 10, size: SMALLS[s]!, theta: 0.42, tilt: 0, nowMs });
    }
  }
}

if (FREEZE != null) {
  render(Number(FREEZE));
} else {
  const loop = (now: number): void => {
    render(now);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
