import { shade } from './rig.js';

/**
 * The gatherer's roster: every axe, pickaxe, and rod resolves a style
 * — bespoke head silhouette, haft furniture, collar lashing, and (for
 * starsteel) a living fx channel — exactly the SwordStyle law. One
 * painter dresses the working hand AND the pack icon, so a tool in
 * the world and its glyph in the pack are the same object.
 *
 * Draw space: hand at the origin, +x toward the business end, the
 * haft lying along the x axis. `s` is body scale, the same unit every
 * weapon painter thinks in. The head mounts ACROSS the haft the way
 * heads mount — bit/spurs spanning −y, the honed edge facing away
 * from the wielder — so a downward chop leads with the edge.
 */

export type ToolKind = 'axe' | 'pickaxe' | 'rod';

export interface ToolStyle {
  kind: ToolKind;
  /** Head metal. Edge defaults to shade(+34), cheek to shade(−22). */
  color: string;
  edge?: string;
  cheek?: string;
  /** Haft wood + its grain line. */
  haft: string;
  haftDark?: string;
  /** Eye collar where the head grips the haft, and its lash strokes. */
  collar: string;
  lash?: string;
  /** Butt cap on the haft's near end — the high-ladder flourish. */
  butt?: string;
  /** Grip wrap bands near the hand. */
  wrap?: string;
  /** Rivet/stud accent on the cheek. */
  stud?: string;
  /** Head size multiplier — the ladder swells as the metal climbs. */
  headScale?: number;
  /** The living channel: starsteel hums. */
  fx?: 'star';
  fxColor?: string;
}

/**
 * Palette law: each metal tier speaks the SAME identity colors its
 * sword line and ore deposit speak — bronze warm, iron gunmetal,
 * steel bright, mithril sky, adamant deep green, starsteel violet
 * (the only tier that earns an fx). Furniture climbs with the tier:
 * bronze is lashed leather on plain wood; steel earns a butt cap and
 * wrap; the high ladder carves and studs.
 */
export const TOOL_STYLES: Record<string, ToolStyle> = {
  bronze_axe: {
    kind: 'axe', color: '#c08a52', haft: '#8a6a45',
    collar: '#6b4a26', lash: '#a8874f',
  },
  bronze_pickaxe: {
    kind: 'pickaxe', color: '#c08a52', haft: '#8a6a45',
    collar: '#6b4a26', lash: '#a8874f',
  },
  iron_axe: {
    kind: 'axe', color: '#8d9299', haft: '#7a5a38',
    collar: '#4a4554', lash: '#6e737c', headScale: 1.04,
  },
  iron_pickaxe: {
    kind: 'pickaxe', color: '#8d9299', haft: '#7a5a38',
    collar: '#4a4554', lash: '#6e737c', headScale: 1.04,
  },
  steel_axe: {
    kind: 'axe', color: '#c4cad4', edge: '#eef2f8', haft: '#6b4a26',
    collar: '#5a5f6a', butt: '#8d9299', wrap: '#4a3a2a', headScale: 1.08,
  },
  steel_pickaxe: {
    kind: 'pickaxe', color: '#c4cad4', edge: '#eef2f8', haft: '#6b4a26',
    collar: '#5a5f6a', butt: '#8d9299', wrap: '#4a3a2a', headScale: 1.08,
  },
  mithril_axe: {
    kind: 'axe', color: '#8fb4e4', edge: '#d8ecff', cheek: '#5f84b4',
    haft: '#4e4636', collar: '#3f5e8c', butt: '#3f5e8c', wrap: '#7fa8d9', headScale: 1.1,
  },
  mithril_pickaxe: {
    kind: 'pickaxe', color: '#8fb4e4', edge: '#d8ecff', cheek: '#5f84b4',
    haft: '#4e4636', collar: '#3f5e8c', butt: '#3f5e8c', wrap: '#7fa8d9', headScale: 1.1,
  },
  adamant_axe: {
    kind: 'axe', color: '#6cb47a', edge: '#d2f0d0', cheek: '#2f5e3c',
    haft: '#33302a', collar: '#2f5e3c', butt: '#2f5e3c', wrap: '#5fa06a',
    stud: '#d2f0d0', headScale: 1.16,
  },
  adamant_pickaxe: {
    kind: 'pickaxe', color: '#6cb47a', edge: '#d2f0d0', cheek: '#2f5e3c',
    haft: '#33302a', collar: '#2f5e3c', butt: '#2f5e3c', wrap: '#5fa06a',
    stud: '#d2f0d0', headScale: 1.16,
  },
  starsteel_axe: {
    kind: 'axe', color: '#d6cbf6', edge: '#ffffff', cheek: '#a99ad8',
    haft: '#3a3452', collar: '#7a6ab0', butt: '#7a6ab0', wrap: '#a99ad8',
    stud: '#f4f4ff', headScale: 1.18, fx: 'star', fxColor: '#f4f4ff',
  },
  starsteel_pickaxe: {
    kind: 'pickaxe', color: '#d6cbf6', edge: '#ffffff', cheek: '#a99ad8',
    haft: '#3a3452', collar: '#7a6ab0', butt: '#7a6ab0', wrap: '#a99ad8',
    stud: '#f4f4ff', headScale: 1.18, fx: 'star', fxColor: '#f4f4ff',
  },
  fishing_rod: {
    kind: 'rod', color: '#c4a35a', haft: '#6b4a26',
    collar: '#8d9299', lash: '#dcd6c4',
  },
};

/** Resolve a tool style; unknown '*_axe'/'*_pickaxe' ids get a color-
 * derived fallback so a new ladder rung never renders as nothing. */
export function toolStyle(itemId: string | undefined, color?: string): ToolStyle | null {
  if (!itemId) return null;
  const st = TOOL_STYLES[itemId];
  if (st) return st;
  const kind: ToolKind | null = itemId.includes('pickaxe')
    ? 'pickaxe'
    : itemId.includes('axe')
      ? 'axe'
      : itemId.includes('rod')
        ? 'rod'
        : null;
  if (!kind) return null;
  const c = color ?? '#9aa2ac';
  return { kind, color: c, haft: '#7a5a38', collar: shade(c, -30), lash: shade(c, 20) };
}

export function drawTool(
  ctx: CanvasRenderingContext2D,
  st: ToolStyle,
  s: number,
  nowMs: number,
  hurt?: boolean,
  /** THE PATIENT LINE (work.ts): a rod mid-cast keeps its decorative
   *  dangle home — the rig paints the real line to the water. */
  rodCast?: boolean,
): void {
  if (st.kind === 'rod') {
    drawRod(ctx, st, s, hurt, rodCast);
    return;
  }
  const color = hurt ? '#ffffff' : st.color;
  const hs = st.headScale ?? 1;
  // Eye center: where the head grips the haft.
  const ex = 0.4 * s;

  // ---- haft: butt cap end behind the hand, a nub past the eye.
  const hw = 0.026 * s;
  ctx.fillStyle = hurt ? '#ffffff' : st.haft;
  ctx.beginPath();
  ctx.roundRect(-0.12 * s, -hw, ex + 0.1 * s + 0.12 * s, hw * 2, hw);
  ctx.fill();
  if (!hurt) {
    // One grain line along the lower face — the crate-lid treatment.
    ctx.strokeStyle = st.haftDark ?? shade(st.haft, -22);
    ctx.lineWidth = Math.max(1, 0.012 * s);
    ctx.beginPath();
    ctx.moveTo(-0.08 * s, hw * 0.35);
    ctx.lineTo(ex - 0.02 * s, hw * 0.35);
    ctx.stroke();
    // Butt cap (high ladder) or a plain chamfered end.
    if (st.butt) {
      ctx.fillStyle = st.butt;
      ctx.beginPath();
      ctx.roundRect(-0.135 * s, -hw * 1.2, 0.045 * s, hw * 2.4, 0.01 * s);
      ctx.fill();
    }
    // Grip wrap bands where the fist rides.
    if (st.wrap) {
      ctx.fillStyle = st.wrap;
      for (const x of [-0.052, -0.018, 0.016]) {
        ctx.fillRect(x * s, -hw, 0.013 * s, hw * 2);
      }
    }
  }

  if (st.kind === 'axe') drawAxeHead(ctx, st, color, ex, s, hs, hurt);
  else drawPickHead(ctx, st, color, ex, s, hs, hurt);

  // ---- eye collar lashed over the mount, seating head onto haft.
  ctx.fillStyle = hurt ? '#ffffff' : st.collar;
  ctx.beginPath();
  ctx.roundRect(ex - 0.055 * s, -0.042 * s, 0.11 * s, 0.084 * s, 0.014 * s);
  ctx.fill();
  if (!hurt && st.lash) {
    ctx.strokeStyle = st.lash;
    ctx.lineWidth = Math.max(1, 0.011 * s);
    ctx.beginPath();
    ctx.moveTo(ex - 0.035 * s, -0.036 * s);
    ctx.lineTo(ex + 0.005 * s, 0.036 * s);
    ctx.moveTo(ex + 0.005 * s, -0.036 * s);
    ctx.lineTo(ex + 0.045 * s, 0.036 * s);
    ctx.stroke();
  }

  // ---- the living channel: starsteel hums a slow star.
  if (!hurt && st.fx === 'star') drawStarFx(ctx, st, ex, s, hs, nowMs);
}

function drawAxeHead(
  ctx: CanvasRenderingContext2D,
  st: ToolStyle,
  color: string,
  ex: number,
  s: number,
  hs: number,
  hurt?: boolean,
): void {
  const edge = hurt ? '#ffffff' : (st.edge ?? shade(st.color, 34));
  const cheek = hurt ? '#ffffff' : (st.cheek ?? shade(st.color, -22));
  // Bit rises off the eye toward −y: concave shoulders to two horns,
  // the honed crescent joining them, swept slightly forward.
  const top = -0.3 * s * hs;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(ex - 0.045 * s, -0.02 * s);
  ctx.quadraticCurveTo(ex - 0.06 * s * hs, top * 0.55, ex - 0.16 * s * hs, top * 0.82);
  ctx.quadraticCurveTo(ex + 0.02 * s, top * 1.28, ex + 0.24 * s * hs, top * 0.72);
  ctx.quadraticCurveTo(ex + 0.1 * s * hs, top * 0.4, ex + 0.065 * s, -0.02 * s);
  ctx.closePath();
  ctx.fill();
  if (hurt) return;
  // The honed crescent along the top edge.
  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.moveTo(ex - 0.16 * s * hs, top * 0.82);
  ctx.quadraticCurveTo(ex + 0.02 * s, top * 1.28, ex + 0.24 * s * hs, top * 0.72);
  ctx.quadraticCurveTo(ex + 0.03 * s, top * 1.02, ex - 0.16 * s * hs, top * 0.82);
  ctx.closePath();
  ctx.fill();
  // Cheek shading on the trailing half — the 2.5D facet.
  ctx.fillStyle = cheek;
  ctx.beginPath();
  ctx.moveTo(ex + 0.065 * s, -0.025 * s);
  ctx.quadraticCurveTo(ex + 0.09 * s * hs, top * 0.42, ex + 0.22 * s * hs, top * 0.7);
  ctx.quadraticCurveTo(ex + 0.13 * s * hs, top * 0.52, ex + 0.03 * s, -0.025 * s);
  ctx.closePath();
  ctx.fill();
  // Stud rivet on the cheek (high ladder).
  if (st.stud) {
    ctx.fillStyle = st.stud;
    ctx.beginPath();
    ctx.arc(ex + 0.015 * s, top * 0.5, 0.016 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPickHead(
  ctx: CanvasRenderingContext2D,
  st: ToolStyle,
  color: string,
  ex: number,
  s: number,
  hs: number,
  hurt?: boolean,
): void {
  const edge = hurt ? '#ffffff' : (st.edge ?? shade(st.color, 34));
  const cheek = hurt ? '#ffffff' : (st.cheek ?? shade(st.color, -22));
  // TRUE PICK ANATOMY: a slim head seated on the eye, two tapered
  // tines mounted ACROSS the haft — a long spike on −y (the bit side,
  // per the bit-leads law) and a shorter squared chisel arm opposite.
  // THE BOW LAW: the crescent's belly bulges AWAY from the hands
  // (+x, past the eye) and the tips hook back TOWARD the haft — bow
  // it the other way and the whole head reads upside down. Every
  // facet is a FILLED sliver inside the silhouette — no boundary
  // strokes, so nothing can ever poke past the head again.
  const L = 0.32 * s * hs; // leading spike length off the eye
  const T = 0.23 * s * hs; // trailing chisel arm length
  const bw = 0.048 * s * hs; // tine half-thickness at the eye
  const bow = 0.15 * s * hs; // mid-arm belly, out past the eye
  const hook = 0.05 * s * hs; // how far the tips curl back behind it
  const chin = ex - hook * 0.6; // chisel tip x
  ctx.fillStyle = color;
  ctx.beginPath();
  // Up the spike's concave inner edge to the point...
  ctx.moveTo(ex - bw, -0.02 * s);
  ctx.quadraticCurveTo(ex + bow * 0.2, -L * 0.5, ex - hook, -L);
  // ...down its convex outer edge to the eye...
  ctx.quadraticCurveTo(ex + bow, -L * 0.55, ex + bw, -0.02 * s);
  // ...through the eye boss, down the chisel arm's outer edge...
  ctx.lineTo(ex + bw, 0.02 * s);
  ctx.quadraticCurveTo(ex + bow * 0.85, T * 0.5, chin + 0.04 * s, T * 0.93);
  // ...across the chisel flat, back up its inner edge and home.
  ctx.lineTo(chin - 0.01 * s, T);
  ctx.quadraticCurveTo(ex + bow * 0.15, T * 0.45, ex - bw, 0.02 * s);
  ctx.closePath();
  ctx.fill();
  if (hurt) return;
  // Lit face down the spike's outer sweep — the honed taper.
  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.moveTo(ex - hook, -L);
  ctx.quadraticCurveTo(ex + bow, -L * 0.55, ex + bw, -0.02 * s);
  ctx.lineTo(ex + bw * 0.4, -0.02 * s);
  ctx.quadraticCurveTo(ex + bow * 0.62, -L * 0.5, ex - hook, -L);
  ctx.closePath();
  ctx.fill();
  // Cheek shade up the spike's concave inner edge.
  ctx.fillStyle = cheek;
  ctx.beginPath();
  ctx.moveTo(ex - hook, -L);
  ctx.quadraticCurveTo(ex + bow * 0.2, -L * 0.5, ex - bw, -0.02 * s);
  ctx.lineTo(ex - bw * 0.4, -0.02 * s);
  ctx.quadraticCurveTo(ex + bow * 0.32, -L * 0.46, ex - hook, -L);
  ctx.closePath();
  ctx.fill();
  // Cheek shade along the chisel arm's concave inner face.
  ctx.fillStyle = cheek;
  ctx.beginPath();
  ctx.moveTo(ex - bw, 0.02 * s);
  ctx.quadraticCurveTo(ex + bow * 0.15, T * 0.45, chin - 0.01 * s, T);
  ctx.lineTo(chin + 0.008 * s, T * 0.86);
  ctx.quadraticCurveTo(ex + bow * 0.26, T * 0.42, ex - bw * 0.4, 0.02 * s);
  ctx.closePath();
  ctx.fill();
  if (st.stud) {
    ctx.fillStyle = st.stud;
    ctx.beginPath();
    ctx.arc(ex + 0.012 * s, -0.1 * s * hs, 0.016 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRod(
  ctx: CanvasRenderingContext2D,
  st: ToolStyle,
  s: number,
  hurt?: boolean,
  rodCast?: boolean,
): void {
  const color = hurt ? '#ffffff' : st.color;
  // Cork grip under the fist, wrapped in twine.
  ctx.fillStyle = hurt ? '#ffffff' : st.haft;
  ctx.beginPath();
  ctx.roundRect(-0.1 * s, -0.026 * s, 0.16 * s, 0.052 * s, 0.02 * s);
  ctx.fill();
  // The rod: a tapering curve rising away, thick at the grip.
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, 0.036 * s);
  ctx.beginPath();
  ctx.moveTo(0.05 * s, 0);
  ctx.quadraticCurveTo(0.3 * s, -0.1 * s, 0.46 * s, -0.16 * s);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, 0.02 * s);
  ctx.beginPath();
  ctx.moveTo(0.44 * s, -0.152 * s);
  ctx.quadraticCurveTo(0.56 * s, -0.2 * s, 0.62 * s, -0.235 * s);
  ctx.stroke();
  if (hurt) return;
  // Ferrule bands where the taper steps down.
  ctx.fillStyle = st.collar;
  ctx.save();
  ctx.translate(0.3 * s, -0.102 * s);
  ctx.rotate(-0.36);
  ctx.fillRect(-0.008 * s, -0.024 * s, 0.016 * s, 0.048 * s);
  ctx.restore();
  ctx.save();
  ctx.translate(0.45 * s, -0.157 * s);
  ctx.rotate(-0.4);
  ctx.fillRect(-0.007 * s, -0.018 * s, 0.014 * s, 0.036 * s);
  ctx.restore();
  // Line from the tip, straight down to a bobber and hook — the
  // CARRIED read. Mid-cast the dangle stays home: the rig paints the
  // real line out to the water (THE PATIENT LINE).
  if (rodCast) return;
  ctx.strokeStyle = st.lash ?? '#dcd6c4';
  ctx.lineWidth = Math.max(1, 0.011 * s);
  ctx.beginPath();
  ctx.moveTo(0.62 * s, -0.235 * s);
  ctx.lineTo(0.615 * s, 0.03 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0.607 * s, 0.065 * s, 0.02 * s, -Math.PI * 0.4, Math.PI * 0.9);
  ctx.stroke();
  // Bobber: red over white.
  ctx.fillStyle = '#e8e2d4';
  ctx.beginPath();
  ctx.arc(0.615 * s, -0.06 * s, 0.026 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c4553d';
  ctx.beginPath();
  ctx.arc(0.615 * s, -0.06 * s, 0.026 * s, Math.PI, Math.PI * 2);
  ctx.fill();
}

function drawStarFx(
  ctx: CanvasRenderingContext2D,
  st: ToolStyle,
  ex: number,
  s: number,
  hs: number,
  nowMs: number,
): void {
  const c = st.fxColor ?? '#f4f4ff';
  const t = nowMs * 0.0011;
  // One slow mote orbiting the head, plus a breathing edge glint.
  const cx = ex + Math.cos(t) * 0.16 * s * hs;
  const cy = -0.22 * s * hs + Math.sin(t * 1.7) * 0.07 * s;
  ctx.fillStyle = c;
  ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 3);
  ctx.beginPath();
  ctx.arc(cx, cy, 0.013 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t * 2.3 + 1);
  ctx.beginPath();
  ctx.arc(ex + 0.1 * s, -0.3 * s * hs, 0.009 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}
