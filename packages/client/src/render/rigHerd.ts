/**
 * THE HERD — cattle, ram, sheep, stag and hind.
 * Split out of rig.ts on the golems.ts template (foundations F3.4);
 * rig.ts re-exports everything here, so every lab, test and painter
 * keeps its old door.
 */
import { chamferRect, facetBlob, facetCircle } from './shapes.js';
import { shade } from './tint.js';
// The engine's shared grammar comes back from rig.ts — the same
// deferred cycle golems.ts has always ridden (touched only at draw
// time, long after both modules initialize).
import { OUTLINE, faceProfileK, hullPath, paintBlockBody, ringPath } from './rigKit.js';
import type { BeastBlockFrame, BeastSpec } from './rig.js';

/**
 * THE TURNED BAR's fore-aft stagger (units of tw, signed along the
 * facing): side-on, the leading arm hangs a half-step ahead of the
 * chest line and the trailing arm behind it — the same stagger the
 * feet already take (legs.ts `stag`). Zero face-on; grows with the
 * profile so the diagonals inherit a taste of it.
 */
export function shoulderStagK(fx: number): number {
  return fx * Math.abs(fx);
}
/**
 * Cattle are drawn as true 2.5D blocks — the same dialect as the wall
 * prisms: a chamfered footprint extruded straight up, lit back slab
 * over hard-shaded flanks. Everything species-flavored (hide, patches,
 * horns, muzzle, udder) lives in this look table so the dairy cow and
 * the bull share one painter.
 */
export interface CattleLook {
  hide: string;
  /** Seeded body patches; the count says how many. */
  patch: string;
  spots: number;
  muzzle: string;
  horn: string;
  hornTip: string;
  /** Horn reach (tiles) — stubs on the cow, sweeps on the bull. */
  hornLen: number;
  udder?: string;
  noseRing?: string;
  /** A strap-hung cowbell at the throat (dairy herd charm). */
  bell?: string;
  /** Body half-width (tiles); length comes from the BeastSpec. */
  bodyW: number;
  bellyH: number;
  backH: number;
  /** Extra shoulder mass ramped toward the chest (bull). */
  humpH: number;
  headW: number;
  headH: number;
}
export const CATTLE_LOOKS: Record<string, CattleLook> = {
  cow: {
    hide: '#e7ddca',
    patch: '#59463a',
    spots: 3,
    muzzle: '#d8a396',
    horn: '#ddd0b2',
    hornTip: '#8d7c64',
    hornLen: 0.09,
    udder: '#e2aba1',
    bell: '#c9a24a',
    bodyW: 0.26,
    bellyH: 0.3,
    backH: 0.66,
    humpH: 0,
    headW: 0.3,
    headH: 0.26,
  },
  bull: {
    hide: '#63503f',
    patch: '#473a2e',
    spots: 2,
    muzzle: '#a08872',
    horn: '#e4d8bc',
    hornTip: '#6f6350',
    hornLen: 0.17,
    noseRing: '#d9b054',
    bodyW: 0.29,
    bellyH: 0.31,
    backH: 0.7,
    humpH: 0.14,
    headW: 0.33,
    headH: 0.29,
  },
};
export interface CattleBodyFrame {
  /** Screen position of the body's ground point. */
  bx: number;
  gy: number;
  s: number;
  fx: number;
  fy: number;
  /** Camera foreshorten (1 for ragdolls drawn in screen space). */
  ys: number;
  seed: number;
  hurt: boolean;
  /** Gait bob (tiles) and side roll — 0 for corpses. */
  bob: number;
  roll: number;
  /** Heights (tiles) — corpses pass a collapsed backH. */
  backH: number;
  bellyH: number;
}
/**
 * The cattle body block: chamfered octagon footprint projected at
 * belly and back height, silhouette = convex hull of both rings.
 * Paint order inside the clip makes the light model: base hide, then
 * the seeded patches, then a hard shade step on everything below the
 * back plane, then the lit back facet — so each patch reads darker
 * where it spills over the flank, exactly like the torso shade-half.
 */
export function paintCattleBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: CattleLook,
  f: CattleBodyFrame,
): void {
  const { bx, gy, s, fx, fy, ys } = f;
  const px = -fy;
  const py = fx;
  const hl = spec.bodyLen * s;
  const hw = look.bodyW * s;
  const cut = Math.min(hl, hw) * 0.5;
  const oct: Array<[number, number]> = [
    [hl, -hw + cut],
    [hl, hw - cut],
    [hl - cut, hw],
    [-hl + cut, hw],
    [-hl, hw - cut],
    [-hl, -hw + cut],
    [-hl + cut, -hw],
    [hl - cut, -hw],
  ];
  const lift = f.bob * 0.35 * s;
  const hump = look.humpH * s;
  const gx = (X: number, Y: number): number => bx + fx * X + px * Y;
  const gyy = (X: number, Y: number): number => gy + (fy * X + py * Y) * ys;
  const top = oct.map(([X, Y]) => {
    let h = f.backH * s + lift - Y * f.roll * 0.4;
    if (hump > 0 && X > hl * 0.1) h += hump * ((X / hl - 0.1) / 0.9);
    return { x: gx(X, Y), y: gyy(X, Y) - h };
  });
  const bot = oct.map(([X, Y]) => ({
    x: gx(X, Y),
    // The chest runs deeper than the flank — the belly line climbs
    // toward the rump, which is most of what reads "cattle" side-on.
    y: gyy(X, Y) - (f.bellyH - 0.05 * Math.max(0, X / hl)) * s - lift * 0.6,
  }));
  const hull = hullPath([...top, ...bot]);
  const topFace = ringPath(top);

  ctx.save();
  ctx.clip(hull);
  ctx.fillStyle = f.hurt ? '#ffffff' : look.hide;
  ctx.fill(hull);
  if (!f.hurt && look.spots > 0) {
    ctx.fillStyle = look.patch;
    for (let k = 0; k < look.spots; k++) {
      const b = (n: number): number => ((f.seed >>> ((k * 9 + n * 3) % 28)) & 7) / 7;
      const X = (b(0) * 1.7 - 0.85) * hl * 0.9;
      const Y = (b(1) * 2 - 1) * hw;
      const r = (0.55 + b(2) * 0.5) * hw;
      ctx.beginPath();
      facetBlob(
        ctx,
        gx(X, Y),
        gyy(X, Y) - f.backH * 0.72 * s - lift,
        r,
        (f.seed ^ (k * 0x9e37)) | 0,
        7,
        0.8,
        k * 2.1,
      );
      ctx.fill();
    }
  }
  if (!f.hurt) {
    // Hard shade step: hull minus back facet = the flanks.
    const flanks = new Path2D();
    flanks.addPath(hull);
    flanks.addPath(topFace);
    ctx.fillStyle = 'rgba(30, 20, 36, 0.20)';
    ctx.fill(flanks, 'evenodd');
    ctx.fillStyle = 'rgba(255, 244, 220, 0.16)';
    ctx.fill(topFace);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.stroke(hull);
}
/**
 * The cattle head: a billboard chamfered slab (like the humanoid head)
 * whose muzzle, ears, horns and eyes orbit with the facing. Shared by
 * the live rig and the ragdoll — corpses pass `dead` (no face marks)
 * and ys=1.
 */
export function drawCattleHead(
  ctx: CanvasRenderingContext2D,
  look: CattleLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** Slow lateral cud-grind offset (screen px), idle only. */
    chew?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);

  // Ears: angular flaps riding the side axis, drooping at the tips,
  // pink inside when they face the camera.
  for (const es of [-1, 1]) {
    const bxr = cx + px * es * w * 0.4;
    const byr = cy + py * es * w * 0.4 * ys - h * 0.1;
    const tx = cx + px * es * w * 0.95;
    const ty = cy + py * es * w * 0.95 * ys + h * 0.12;
    ctx.fillStyle = C(shade(look.hide, -12));
    ctx.beginPath();
    ctx.moveTo(bxr, byr - h * 0.12);
    ctx.lineTo(tx, ty - h * 0.08);
    ctx.lineTo(tx + px * es * w * 0.06, ty + h * 0.06);
    ctx.lineTo(bxr, byr + h * 0.14);
    ctx.closePath();
    ctx.fill();
    if (fy > 0.05 && !o.hurt && !o.dead) {
      ctx.fillStyle = look.muzzle;
      ctx.beginPath();
      ctx.moveTo(bxr + (tx - bxr) * 0.35, byr + (ty - byr) * 0.35 - h * 0.05);
      ctx.lineTo(bxr + (tx - bxr) * 0.85, byr + (ty - byr) * 0.85 - h * 0.02);
      ctx.lineTo(bxr + (tx - bxr) * 0.4, byr + (ty - byr) * 0.4 + h * 0.07);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Horns: tapered two-segment polygons sweeping out, then forward-up.
  const L = look.hornLen * s;
  for (const es of [-1, 1]) {
    const b0x = cx + px * es * w * 0.3;
    const b0y = cy + py * es * w * 0.3 * ys - h * 0.44;
    const m0x = b0x + px * es * L * 0.85;
    const m0y = b0y + py * es * L * 0.85 * ys - L * 0.55;
    const t0x = m0x + fx * L * 0.6;
    const t0y = m0y + fy * L * 0.6 * ys - L * 0.75;
    // Perpendicular half-widths shrinking base → mid → tip.
    const a1 = Math.atan2(m0y - b0y, m0x - b0x) + Math.PI / 2;
    const a2 = Math.atan2(t0y - m0y, t0x - m0x) + Math.PI / 2;
    const w0 = Math.max(1.2, L * 0.2);
    const w1 = Math.max(0.9, L * 0.13);
    ctx.fillStyle = C(look.horn);
    ctx.beginPath();
    ctx.moveTo(b0x + Math.cos(a1) * w0, b0y + Math.sin(a1) * w0);
    ctx.lineTo(m0x + Math.cos(a2) * w1, m0y + Math.sin(a2) * w1);
    ctx.lineTo(t0x, t0y);
    ctx.lineTo(m0x - Math.cos(a2) * w1, m0y - Math.sin(a2) * w1);
    ctx.lineTo(b0x - Math.cos(a1) * w0, b0y - Math.sin(a1) * w0);
    ctx.closePath();
    ctx.fill();
    // Dark tip cap.
    ctx.fillStyle = C(look.hornTip);
    ctx.beginPath();
    ctx.moveTo(t0x, t0y);
    ctx.lineTo(t0x - (t0x - m0x) * 0.3 + Math.cos(a2) * w1 * 0.7, t0y - (t0y - m0y) * 0.3 + Math.sin(a2) * w1 * 0.7);
    ctx.lineTo(t0x - (t0x - m0x) * 0.3 - Math.cos(a2) * w1 * 0.7, t0y - (t0y - m0y) * 0.3 - Math.sin(a2) * w1 * 0.7);
    ctx.closePath();
    ctx.fill();
  }

  // Head block with a lit poll band and a hard jaw shade.
  ctx.fillStyle = C(look.hide);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.28, w * 0.28]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.28, w * 0.28]);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 244, 220, 0.18)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.2);
    ctx.fillStyle = 'rgba(30, 20, 36, 0.14)';
    ctx.fillRect(cx - w / 2, cy + h * 0.2, w, h * 0.3);
    ctx.restore();
    // Poll tuft between the horns.
    ctx.fillStyle = look.patch;
    ctx.beginPath();
    chamferRect(ctx, cx - w * 0.17, cy - h * 0.56, w * 0.34, h * 0.16, 1.5);
    ctx.fill();
  }

  // The cowbell: a strapped trapezoid at the throat, clapper below.
  if (look.bell && fy > -0.35) {
    const kx = cx - fx * w * 0.1;
    const ky = cy + h * 0.62;
    const bw = w * 0.2;
    ctx.strokeStyle = C('#4a3324');
    ctx.lineWidth = Math.max(1, s * 0.014);
    ctx.beginPath();
    ctx.moveTo(kx, ky - h * 0.14);
    ctx.lineTo(kx, ky);
    ctx.stroke();
    ctx.fillStyle = C(look.bell);
    ctx.beginPath();
    ctx.moveTo(kx - bw * 0.32, ky);
    ctx.lineTo(kx + bw * 0.32, ky);
    ctx.lineTo(kx + bw * 0.52, ky + bw * 0.78);
    ctx.lineTo(kx - bw * 0.52, ky + bw * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C(shade(look.bell, -45));
    ctx.fillRect(kx - bw * 0.14, ky + bw * 0.78, bw * 0.28, bw * 0.3);
  }

  // Muzzle: a paler block pushed along the facing. It must TURN with
  // the head: full-face width head-on, foreshortened to a narrow
  // profile wedge side-on (a frontal muzzle pasted over a profile head
  // was the classic bug), gone entirely from behind.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const d = w * (0.42 + profileK * 0.14);
    const mx = cx + fx * d + (o.chew ?? 0) * (1 - profileK);
    const my = cy + fy * d * ys + h * 0.16;
    const mw = w * 0.74 * (1 - profileK * 0.58);
    const mh = h * 0.52;
    ctx.fillStyle = C(look.muzzle);
    ctx.beginPath();
    chamferRect(ctx, mx - mw / 2, my - mh / 2, mw, mh, mw * 0.16);
    ctx.fill();
    if (!o.hurt) {
      ctx.fillStyle = 'rgba(30, 20, 36, 0.12)';
      ctx.fillRect(mx - mw * 0.4, my + mh * 0.18, mw * 0.8, mh * 0.24);
    }
    if (fy > -0.1 && !o.hurt) {
      // Nostril slits ride the muzzle's own frame — only the near one
      // survives the turn to profile.
      ctx.fillStyle = OUTLINE;
      for (const es of [-1, 1]) {
        if (profileK > 0.45 && es * py < 0) continue;
        const nx = mx + px * es * mw * 0.26 + fx * mw * 0.2 * profileK;
        const ny = my + py * es * mw * 0.26 * ys - mh * 0.18;
        ctx.fillRect(nx - mw * 0.05, ny, mw * 0.1, mh * 0.3);
      }
      if (look.noseRing) {
        ctx.strokeStyle = look.noseRing;
        ctx.lineWidth = Math.max(1.2, s * 0.016);
        ctx.beginPath();
        ctx.arc(mx + fx * mw * 0.18 * profileK, my + mh * 0.22, mw * 0.16, Math.PI * 0.12, Math.PI * 0.88);
        ctx.stroke();
      }
    }
  }

  // Lateral eyes — one per side of the skull, the far one hiding as
  // the head goes profile; none on the back of the skull, none dead.
  if (!o.dead && fy > -0.45) {
    ctx.fillStyle = OUTLINE;
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.1 + px * es * w * 0.44;
      const ey = cy + (fy * w * 0.1 + py * es * w * 0.44) * ys - h * 0.08;
      ctx.fillRect(ex - w * 0.055, ey - h * 0.09, w * 0.11, h * 0.18);
    }
  }
}
/**
 * The wild ram: a boxy fleece loaf on sturdy legs with a dark bare
 * face — and the signature, big ridged horns curling back around the
 * ears. The charge drops the whole head into a battering line.
 */
export interface RamLook {
  wool: string;
  /** Bare face and leg tone — dark against the fleece. */
  face: string;
  horn: string;
  hornRib: string;
  bodyW: number;
  backH: number;
  chestH: number;
  headW: number;
  headH: number;
  /** Horn curl radius (tiles). */
  hornR: number;
}
export function paintRamBody(
  ctx: CanvasRenderingContext2D,
  spec: BeastSpec,
  look: RamLook,
  f: BeastBlockFrame,
): void {
  const hl = spec.bodyLen;
  const hw = look.bodyW;
  // Nearly a full rectangle — the fleece hides the taper a leaner
  // animal would show; the loaf read IS the sheep read.
  const foot: Array<[number, number]> = [
    [hl, -hw * 0.72],
    [hl, hw * 0.72],
    [hl * 0.55, hw],
    [-hl * 0.55, hw],
    [-hl, hw * 0.72],
    [-hl, -hw * 0.72],
    [-hl * 0.55, -hw],
    [hl * 0.55, -hw],
  ];
  const wool = shade(look.wool, (((f.seed >>> 5) & 7) - 3) * 2);
  paintBlockBody(
    ctx,
    f,
    foot,
    (X) => look.backH * (1 - 0.1 * Math.pow(X / hl, 2)),
    () => look.chestH,
    wool,
    (gx, gyy, lift) => {
      const s = f.s;
      const tk = f.topScale ?? 1;
      // Lumpy fleece: lighter wool clumps drifting along the back in
      // the body's rotated frame, seeded per animal.
      ctx.save();
      ctx.translate(gx(0, 0), gyy(0, 0) - look.backH * tk * s * 0.88 - lift);
      ctx.rotate(Math.atan2(f.fy * f.ys, f.fx));
      ctx.fillStyle = shade(wool, 14);
      for (let k = 0; k < 3; k++) {
        const b = ((f.seed >>> (k * 5 + 3)) & 7) / 7;
        ctx.beginPath();
        facetBlob(
          ctx,
          (k - 1) * hl * s * 0.58,
          (b - 0.5) * hw * s * 0.5,
          hl * s * 0.36,
          (f.seed ^ (k * 0x51)) | 0,
          7,
          (hw * 0.75) / (hl * 0.72),
          k * 1.9,
        );
        ctx.fill();
      }
      ctx.restore();
    },
  );
}
/**
 * The ram head: horns first — each curls in its sagittal plane, up
 * over the ear, back, down and forward, drifting outward through the
 * spiral so the front view reads as two curls flanking the poll.
 * Growth ribs cross the curl. The bare face is a dark slab under a
 * wool cap.
 */
export function drawRamHead(
  ctx: CanvasRenderingContext2D,
  look: RamLook,
  o: {
    x: number;
    y: number;
    s: number;
    fx: number;
    fy: number;
    ys: number;
    hurt?: boolean;
    dead?: boolean;
    /** 0..1 through the charge telegraph. */
    charge?: number;
  },
): void {
  const { x: cx, y: cy, s, fx, fy, ys } = o;
  const px = -fy;
  const py = fx;
  const w = look.headW * s;
  const h = look.headH * s;
  const C = (c: string): string => (o.hurt ? '#ffffff' : c);
  const fsx = fx;
  const fsy = fy * ys;

  for (const es of [-1, 1]) {
    // The far horn only vanishes deep into profile — it is the ram's
    // whole identity, so it holds on longer than an ear would.
    if (Math.abs(fx) > 0.75 && es * py < 0) continue;
    const bxr = cx + px * es * w * 0.34 + fx * es * w * 0.05;
    const byr = cy + (py * es * w * 0.34 + fy * es * w * 0.05) * ys - h * 0.28;
    const R = look.hornR * s;
    const NPT = 9;
    // A solid tapered ribbon along the spiral — inner and outer edges
    // offset radially from the curl center, so the horn reads as one
    // carved mass, never a wire loop.
    const outer: Array<{ x: number; y: number }> = [];
    const inner: Array<{ x: number; y: number }> = [];
    const at = (t: number, rOff: number): { x: number; y: number } => {
      const phi = 1.95 + t * 4.05;
      const r = Math.max(R * 0.12, R * (1 - 0.38 * t) + rOff);
      const out = Math.sin(Math.PI * Math.min(1, t * 1.15)) * R * 0.78;
      return {
        x: bxr + Math.cos(phi) * fsx * r + px * es * out,
        y: byr + Math.cos(phi) * fsy * r - Math.sin(phi) * r + py * es * out * ys,
      };
    };
    for (let i = 0; i <= NPT; i++) {
      const t = i / NPT;
      const wdt = w * (0.19 - 0.13 * t);
      outer.push(at(t, wdt));
      inner.push(at(t, -wdt));
    }
    ctx.fillStyle = C(look.horn);
    ctx.beginPath();
    ctx.moveTo(outer[0]!.x, outer[0]!.y);
    for (let i = 1; i <= NPT; i++) ctx.lineTo(outer[i]!.x, outer[i]!.y);
    for (let i = NPT; i >= 0; i--) ctx.lineTo(inner[i]!.x, inner[i]!.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(26, 20, 36, 0.4)';
    ctx.lineWidth = Math.max(1, s * 0.018);
    ctx.stroke();
    // Growth ribs across the curl — what makes it horn, not hose.
    if (!o.hurt) {
      ctx.strokeStyle = C(look.hornRib);
      ctx.lineWidth = Math.max(1, s * 0.018);
      for (const rt of [0.2, 0.42, 0.64]) {
        const a = at(rt, w * (0.19 - 0.13 * rt));
        const b = at(rt, -w * (0.19 - 0.13 * rt));
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  // Bare dark face under a wool poll cap.
  ctx.fillStyle = C(look.face);
  ctx.beginPath();
  chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.28, w * 0.28]);
  ctx.fill();
  if (!o.hurt) {
    ctx.save();
    ctx.beginPath();
    chamferRect(ctx, cx - w / 2, cy - h / 2, w, h, [w * 0.2, w * 0.2, w * 0.28, w * 0.28]);
    ctx.clip();
    ctx.fillStyle = C(look.wool);
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h * 0.3);
    ctx.fillStyle = 'rgba(30, 20, 36, 0.14)';
    ctx.fillRect(cx - w / 2, cy + h * 0.24, w, h * 0.26);
    ctx.restore();
  }

  // Roman-nose muzzle wedge, foreshortening with the facing.
  if (fy > -0.3) {
    const profileK = faceProfileK(fx);
    const bx0 = cx + fx * w * 0.22;
    const by0 = cy + fy * w * 0.22 * ys + h * 0.16;
    const sl = w * (0.18 + 0.18 * profileK);
    const tx = bx0 + fx * sl;
    const ty = by0 + fy * sl * ys + h * 0.1;
    const axv = tx - bx0;
    const ayv = ty - by0;
    const al = Math.hypot(axv, ayv) || 1e-4;
    const nx = -ayv / al;
    const ny = axv / al;
    const hb = w * 0.21 * (1 - profileK * 0.22);
    const ht = hb * 0.66;
    ctx.fillStyle = C(shade(look.face, 6));
    ctx.beginPath();
    ctx.moveTo(bx0 + nx * hb, by0 + ny * hb);
    ctx.lineTo(tx + nx * ht, ty + ny * ht);
    ctx.lineTo(tx - nx * ht, ty - ny * ht);
    ctx.lineTo(bx0 - nx * hb, by0 - ny * hb);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C(OUTLINE);
    ctx.beginPath();
    facetCircle(ctx, tx - (axv / al) * w * 0.02, ty - (ayv / al) * w * 0.02, w * 0.07, 5, fx);
    ctx.fill();
  }

  // Small dark eyes under the horn bases.
  if (!o.dead && fy > -0.45) {
    for (const es of [-1, 1]) {
      if (Math.abs(fx) > 0.6 && es * py < 0) continue;
      const ex = cx + fx * w * 0.1 + px * es * w * 0.3;
      const ey = cy + (fy * w * 0.1 + py * es * w * 0.3) * ys - h * 0.06;
      ctx.fillStyle = C(OUTLINE);
      ctx.fillRect(ex - w * 0.05, ey - h * 0.06, w * 0.1, h * 0.12);
    }
  }
}
/**
 * The kept ewe — THE FLEECE TELLS THE TIME. Two bodies in one
 * painter: a full cloud of scalloped cream fleece while the wool
 * stands ready for the shears, and a clipped, slimmer trim while it
 * regrows — the produce clock worn as silhouette, readable across a
 * whole yard. Dark bare face, drooping ears, no horns: kin to the
 * crag ram, but nobody's charger.
 */
export interface SheepLook {
  /** Standing fleece — and the duller clipped tone beneath it. */
  wool: string;
  woolShorn: string;
  /** Bare face, ears, and legs — dark against the cream. */
  face: string;
  bodyW: number;
  /** Fleece height standing full — and trimmed after the shears. */
  backH: number;
  backHShorn: number;
  chestH: number;
  headW: number;
  headH: number;
}
export const SHEEP_LOOK: SheepLook = {
  wool: '#e6dfcd',
  woolShorn: '#d6cab0',
  face: '#4f4234',
  bodyW: 0.23,
  backH: 0.48,
  backHShorn: 0.35,
  chestH: 0.16,
  headW: 0.21,
  headH: 0.19,
};
/**
 * The stag: elegance by proportion — a slim barrel held HIGH on long
 * legs, a proud rising neck column, pale rump patch, and branched
 * antlers swept back off the crown. The alarm-charge levels the
 * antlers forward.
 */
export interface StagLook {
  coat: string;
  belly: string;
  /** The pale rump patch — the deer flag. */
  rump: string;
  antler: string;
  muzzle: string;
  bodyW: number;
  backH: number;
  chestH: number;
  headW: number;
  headH: number;
  /** How far the head rides above the back line (tiles). */
  neckRise: number;
  /**
   * Branched crown or bare poll — the hind shares the whole deer
   * dialect and differs exactly here: no beams, leaf ears instead
   * (everything species-flavored lives in the look table).
   */
  antlers: boolean;
}
export const STAG_LOOK: StagLook = {
  coat: '#a67c52',
  belly: '#c4a97f',
  rump: '#e2d6b9',
  antler: '#9c8563',
  muzzle: '#5f4c38',
  bodyW: 0.16,
  backH: 0.62,
  chestH: 0.38,
  headW: 0.22,
  headH: 0.19,
  neckRise: 0.3,
  antlers: true,
};
/**
 * The hind: the stag's dialect at herd scale — a hand smaller, a
 * shade warmer, the neck a touch lower, and big leaf ears where the
 * stag carries his crown. Reads "deer" beside the stag and "not the
 * stag" on her own.
 */
export const HIND_LOOK: StagLook = {
  coat: '#b18a60',
  belly: '#d1b98f',
  rump: '#e9ddc2',
  antler: '#9c8563',
  muzzle: '#63503a',
  bodyW: 0.145,
  backH: 0.56,
  chestH: 0.35,
  headW: 0.19,
  headH: 0.17,
  neckRise: 0.26,
  antlers: false,
};
