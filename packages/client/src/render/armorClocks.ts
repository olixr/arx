/**
 * THE ARMOR'S CLOCKS — the pure FX-phase helpers every worn set keeps
 * time by: daybreak, fenlight, stormbolt, aurora, tide, cinder, void,
 * breeze and their kin. Pure functions of the wall clock; no canvas,
 * no state. Moved verbatim from armor.ts (foundations F3.1).
 */

/**
 * THE DAYBREAK clock — dawnsworn's one sky, shared by the hood disc,
 * the hem bands and the shoulder crests so the whole set keeps the
 * same sunrise. A 7.4s cycle: the light climbs, holds its gold, and
 * eases back to first light. `noon` stands at full day forever;
 * `setting` runs the same sky backward — sworn to the other horizon.
 * (`eclipse` reads the raw curve as its ring-flare intensity.)
 */
export function daybreakK(
  nowMs: number,
  phase?: 'rising' | 'setting' | 'noon' | 'eclipse',
): number {
  if (phase === 'noon') return 1;
  const u = (nowMs % 7400) / 7400;
  const sm = (k: number): number => {
    const c = Math.min(1, Math.max(0, k));
    return c * c * (3 - 2 * c);
  };
  const rise = u < 0.42 ? sm(u / 0.42) : u < 0.62 ? 1 : sm((1 - u) / 0.38);
  return phase === 'setting' ? 1 - rise : rise;
}

/**
 * THE FENLIGHT clock — the fen court's one breath, shared by the
 * hood lantern, the hem wisps, the shoulder cages, the ripple rings
 * and the bloom crown so the whole set keeps the same slow water.
 * A 5.6s cycle: the light swells, holds, and gutters low — never
 * out. `off` staggers members of the court by a fraction of the
 * cycle so the lights trade watches instead of blinking as one.
 */
export function fenlightK(nowMs: number, off = 0): number {
  const u = ((nowMs / 5600 + off) % 1 + 1) % 1;
  const sm = (k: number): number => {
    const c = Math.min(1, Math.max(0, k));
    return c * c * (3 - 2 * c);
  };
  return u < 0.38
    ? 0.12 + 0.88 * sm(u / 0.38)
    : u < 0.58 ? 1 : 0.12 + 0.88 * sm((1 - u) / 0.42);
}

/**
 * THE STORMBOLT clock — the storm court's sky. A 7.2s cycle: a long
 * banked CHARGE climbing to a watchful glow, then THE STRIKE — two
 * hard flashes with a dark breath between — and a fast decay.
 * THE ROLLING SKY (user-amended from the old one-beat ONE SKY law):
 * worn as a full set, the strike is a DISCHARGE that travels the
 * body — it lands at the crown and drains to earth: helm, near
 * shoulder, far shoulder, chest bank, waist beads, skirt brand, hem
 * sparks, hem fog, ground — each piece ~0.7s behind the last via
 * its `off` phase, so static circulates instead of camera-flashing.
 * WITHIN one piece every bolt still shares that piece's beat.
 * Offsets are start-times: a piece with off=o strikes at global
 * phase 0.78-o (mod 1). The worn ripple order (crown → ground):
 * helm 0, near pauldron 0.9, far pauldron 0.8, thunderbank 0.72,
 * chargebeads 0.64, boltbrand 0.54, staticcourt 0.46, stormshroud
 * 0.38, groundflash 0.3 — sunpatch drifts at 0.6, off the chain.
 */
export function stormboltK(nowMs: number, off = 0): number {
  const u = ((nowMs / 7200 + off) % 1 + 1) % 1;
  const sm = (kk: number): number => {
    const c = Math.min(1, Math.max(0, kk));
    return c * c * (3 - 2 * c);
  };
  if (u < 0.78) return 0.08 + 0.42 * sm(u / 0.78);
  const v = (u - 0.78) / 0.22;
  if (v < 0.16) return 1;
  if (v < 0.3) return 0.3;
  if (v < 0.48) return 0.94;
  return 0.08 + 0.42 * (1 - sm((v - 0.48) / 0.52));
}

/**
 * THE LIVING ARC — one jagged rope of electricity between two
 * points: a colored casing under a hot pale core, with one short
 * branch. Deterministic per seed; callers derive the seed from a
 * ~90ms flicker frame during the strike so the lightning DANCES
 * across the cloth instead of glowing like a sign. Strokes only —
 * strokes survive every paint path (gremlin #2's one safe lane).
 */
export function stormArc(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  seed: number, amp: number, col: string, alpha: number, lw: number,
  branch = true,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 0.0001) return;
  const nx = -dy / len;
  const ny = dx / len;
  const segs = 5;
  const pts: Array<[number, number]> = [[x0, y0]];
  for (let i = 1; i < segs; i++) {
    const v = i / segs;
    const h = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    const off = ((h - Math.floor(h)) * 2 - 1) * amp * (1 - Math.abs(v - 0.5));
    pts.push([x0 + dx * v + nx * off, y0 + dy * v + ny * off]);
  }
  pts.push([x1, y1]);
  const trace = (): void => {
    ctx.beginPath();
    ctx.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
    ctx.stroke();
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // The casing: the storm's own color, wide and soft.
  ctx.globalAlpha = alpha * 0.5;
  ctx.strokeStyle = col;
  ctx.lineWidth = lw * 2.3;
  trace();
  // The core: near-white, hot, thin.
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#f4f8ff';
  ctx.lineWidth = lw;
  trace();
  if (branch) {
    const h2 = Math.sin(seed * 37.719 + 11.7) * 43758.5453;
    const ba = (h2 - Math.floor(h2)) * Math.PI * 2;
    const bl = len * 0.22;
    ctx.globalAlpha = alpha * 0.75;
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    ctx.moveTo(pts[2]![0], pts[2]![1]);
    ctx.lineTo(pts[2]![0] + Math.cos(ba) * bl, pts[2]![1] + Math.sin(ba) * bl);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * THE WORLD'S OWN CLOUD — one puff traced in the game's canopy/pool
 * blob idiom (the renderer's foam-mound language): seven noise-bumped
 * radii smoothed through vertex midpoints, the silhouette boiling
 * gently on its own air. Straight edges here would read as ice floes,
 * not vapour — the curves are load-bearing. Traces the closed path
 * only, so one caller can lay a wash base, a dark belly and a lit
 * cap from the same language.
 */
export function cloudPuff(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, rx: number, ry: number,
  seed: number, nowMs: number, boil = 1,
): void {
  const B = 7;
  const px: number[] = [];
  const py: number[] = [];
  for (let i = 0; i < B; i++) {
    const a = (i / B) * Math.PI * 2;
    const h = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    const rr = 1 + ((h - Math.floor(h)) - 0.5) * 0.42 +
      boil * 0.09 * Math.sin(nowMs * 0.0021 + seed + i * 2.4);
    px.push(cx + Math.cos(a) * rx * rr);
    py.push(cy + Math.sin(a) * ry * rr);
  }
  ctx.beginPath();
  ctx.moveTo((px[B - 1]! + px[0]!) / 2, (py[B - 1]! + py[0]!) / 2);
  for (let i = 0; i < B; i++) {
    const j = (i + 1) % B;
    ctx.quadraticCurveTo(px[i]!, py[i]!, (px[i]! + px[j]!) / 2, (py[i]! + py[j]!) / 2);
  }
  ctx.closePath();
}

/**
 * THE CAST VEIL — the face's mystery as a true falloff: stacked
 * wide translucent STROKES (fills gutter inside clipped paint
 * paths; strokes do not), near-solid from the brow to the eye
 * line, then fading down the chin like shade actually cast by the
 * hood. Callers clip to the opening FIRST so the veil lives IN the
 * hole and conforms to its chamfer — never a black sticker over it.
 */
export function stormVeil(
  ctx: CanvasRenderingContext2D,
  cx: number, ohw: number,
  yTop: number, yEye: number, yEnd: number,
  rgb: string,
): void {
  ctx.save();
  ctx.lineCap = 'butt';
  ctx.strokeStyle = rgb;
  const bands = 10;
  const step = (yEnd - yTop) / (bands - 1);
  const hold = (yEye - yTop) / (yEnd - yTop);
  for (let i = 0; i < bands; i++) {
    const v = i / (bands - 1);
    // The hold zone is fully OPAQUE (translucent strokes attenuate
    // inside clips); only the falloff below the eye line is a wash.
    const fall = v <= hold ? 1 : Math.pow(1 - (v - hold) / (1 - hold), 1.35);
    ctx.globalAlpha = v <= hold ? 1 : 0.92 * fall;
    ctx.lineWidth = step * 1.04;
    ctx.beginPath();
    ctx.moveTo(cx - ohw, yTop + step * i);
    ctx.lineTo(cx + ohw, yTop + step * i);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * THE SUBSTORM clock — the aurora's own sky, the court's SIXTH
 * grammar (the fen trades watches, the storm rolls its discharge,
 * the tide processes, the cinder breathes as one bed, the void
 * arrives — the aurora DANCES): the polar night hangs in a low
 * breathing shimmer for most of its 9.6s watch, then the sky breaks
 * into THE DANCE — a fast bloom, a shimmering hold, a graceful ease
 * home. The aurora lot secedes from the rolling discharge BY
 * DESIGN: this is the one weather that never strikes. `off`
 * staggers the dance down the body (corona 0, near shoulder 0.07,
 * far shoulder 0.12, streams 0.18, great curtain 0.28, snowline
 * 0.4) so the lights visibly travel crown to earth. Surges speak
 * through amplitude, width and alpha only — the phase runs at one
 * constant rate forever (pulse honesty).
 */
export function auroraK(nowMs: number, off = 0): number {
  const u = ((nowMs / 9600 - off) % 1 + 1) % 1;
  const sm = (kk: number): number => {
    const c = Math.min(1, Math.max(0, kk));
    return c * c * (3 - 2 * c);
  };
  if (u < 0.64) {
    // The quiet arc: two slow breaths, never out.
    const b = 0.5 + 0.5 * Math.sin((u / 0.64) * Math.PI * 4 - Math.PI / 2);
    return 0.18 + 0.18 * b;
  }
  const v = (u - 0.64) / 0.36;
  if (v < 0.18) return 0.18 + 0.7 * sm(v / 0.18);
  if (v < 0.66) return 0.88 + 0.12 * Math.abs(Math.sin(((v - 0.18) / 0.48) * Math.PI * 5));
  return 0.18 + 0.7 * (1 - sm((v - 0.66) / 0.34));
}

/**
 * THE DRAWN CURTAIN — one fold of the aurora worn as a GARMENT
 * device (the drawn-light family's sky verse: light is never a
 * body's fill). The fold's silk is night cloth; the light lives
 * only on the drawn lower hem — casing under a hot pale core — and
 * in the rays combed up from it, and every stroke is CLIPPED INTO
 * the silk so the outline dilate never fans a whisker. `pts` is the
 * lower hem in the caller's space; the body rises `hgt` above it on
 * a wavering top edge that morphs at one constant pace. The silk is
 * garment-scale structure: pass `hurt` and it holds white whole.
 */
export function auroraCurtain(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  hgt: number, silk: string, edge: string, core: string,
  k: number, nowMs: number, ph: number, lw: number, hurt: boolean,
): void {
  if (pts.length < 2) return;
  const top = pts.map((p, i) => ({
    x: p.x + Math.sin(nowMs * 0.00058 + ph + i * 0.9) * hgt * 0.12,
    y: p.y - hgt * (0.74 + 0.26 * Math.sin(nowMs * 0.00073 + ph + i * 1.1)),
  }));
  const body = (): void => {
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y);
    for (let i = top.length - 1; i >= 0; i--) ctx.lineTo(top[i]!.x, top[i]!.y);
    ctx.closePath();
  };
  ctx.fillStyle = hurt ? '#ffffff' : silk;
  body();
  ctx.fill();
  if (hurt) return;
  ctx.save();
  body();
  ctx.clip();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // The rays: combed UP from the hem, waking with the sky.
  for (let i = 0; i < pts.length - 1; i++) {
    const rw = 0.5 + 0.5 * Math.sin(nowMs * 0.0011 + ph * 1.3 + i * 2.3);
    const a = (0.16 + 0.5 * k) * (0.4 + 0.6 * rw);
    if (a < 0.14) continue;
    const bx = (pts[i]!.x + pts[i + 1]!.x) / 2;
    const by = (pts[i]!.y + pts[i + 1]!.y) / 2;
    const ty = (top[i]!.y + top[i + 1]!.y) / 2;
    ctx.globalAlpha = a;
    ctx.strokeStyle = edge;
    ctx.lineWidth = lw * 1.5;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + (top[i]!.x - pts[i]!.x) * 0.3, ty + (by - ty) * 0.18);
    ctx.stroke();
  }
  // The bright lower hem: the curtain's own light, casing under
  // core, half-buried in the silk by the clip — lit from within.
  const hemTrace = (): void => {
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y);
    ctx.stroke();
  };
  ctx.globalAlpha = 0.4 + 0.5 * k;
  ctx.strokeStyle = edge;
  ctx.lineWidth = lw * 2.4;
  hemTrace();
  ctx.globalAlpha = 0.55 + 0.45 * k;
  ctx.strokeStyle = core;
  ctx.lineWidth = lw;
  hemTrace();
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** One four-point star prick — path only; the caller fills. */
export function starPrick(
  ctx: CanvasRenderingContext2D, px: number, py: number, rr: number,
): void {
  ctx.beginPath();
  ctx.moveTo(px, py - rr);
  ctx.lineTo(px + rr * 0.3, py - rr * 0.3);
  ctx.lineTo(px + rr, py);
  ctx.lineTo(px + rr * 0.3, py + rr * 0.3);
  ctx.lineTo(px, py + rr);
  ctx.lineTo(px - rr * 0.3, py + rr * 0.3);
  ctx.lineTo(px - rr, py);
  ctx.lineTo(px - rr * 0.3, py - rr * 0.3);
  ctx.closePath();
}

/**
 * THE TIDE clock — the tide court's one water, shared by the crest,
 * the shoulders, the surf tiers and the moon. A 6.8s cycle: the
 * swell BUILDS long and patient, stands for a breath, BREAKS fast,
 * then a backwash lap and slack. Unlike the fen's traded watches
 * and the storm's one shared sky, the tide is a PROCESSION: callers
 * pass `off` by their place DOWN the garment (moon 0 → crest 0.06 →
 * shoulders 0.14 → waist 0.22 → hem 0.3) so one swell visibly
 * travels the wearer crown to hem (THE TRAVELING SWELL law).
 */
export function tideK(nowMs: number, off = 0): number {
  const u = ((nowMs / 6800 - off) % 1 + 1) % 1;
  const sm = (kk: number): number => {
    const c = Math.min(1, Math.max(0, kk));
    return c * c * (3 - 2 * c);
  };
  if (u < 0.62) return 0.15 + 0.85 * sm(u / 0.62);
  const v = (u - 0.62) / 0.38;
  if (v < 0.2) return 1 - 0.85 * sm(v / 0.2);
  if (v < 0.48) return 0.15 + 0.16 * Math.sin(((v - 0.2) / 0.28) * Math.PI);
  return 0.15;
}

/**
 * THE BREAK — how hard the wave is breaking right now, 0..1: full
 * at the moment the swell falls, decaying through the backwash.
 * Drives spray, foam surge and flow surges; same `off` convention
 * as tideK so the break travels the garment too.
 */
export function tideBreakK(nowMs: number, off = 0): number {
  const u = ((nowMs / 6800 - off) % 1 + 1) % 1;
  if (u < 0.62 || u > 0.9) return 0;
  return 1 - (u - 0.62) / 0.28;
}

/**
 * THE DRAWN CURRENT — water as strokes with intent (the LIGHTNING
 * IS DRAWN law's sibling: water is DRAWN, never glowed). A smooth
 * sinuous rope between two points — deep casing under a pale core —
 * whose ripple TRAVELS along the rope, with foam beads riding the
 * flow. Strokes and small opaque bead fills only, gremlin #2's safe
 * lanes. `flow` scales the running speed (surge it at the break).
 */
export function tideStream(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  nowMs: number, phase: number, amp: number,
  col: string, foam: string, alpha: number, lw: number,
  flow = 1,
  core = '#dff4ef',
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 0.0001) return;
  const nx = -dy / len;
  const ny = dx / len;
  const segs = 11;
  // THE SEAMLESS RUN: the phase NEVER rides a changing rate —
  // absolute time × a time-varying `flow` teleports the whole
  // pattern the moment the flow changes (the pulse-honesty law's
  // cousin). Speed stays constant forever; the surge speaks through
  // amplitude, weight and foam instead, and the loop has no seam.
  const surge = Math.max(0, flow - 1);
  const run = nowMs * 0.0042;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= segs; i++) {
    const v = i / segs;
    const off = Math.sin(v * Math.PI * 2.3 - run + phase) * amp * (1 + 0.35 * surge) * Math.sin(v * Math.PI);
    pts.push([x0 + dx * v + nx * off, y0 + dy * v + ny * off]);
  }
  const trace = (): void => {
    ctx.beginPath();
    ctx.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
    ctx.stroke();
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // The casing: the deep water, wide and soft — heavier in a surge.
  ctx.globalAlpha = Math.min(1, alpha * 0.55 * (1 + 0.2 * surge));
  ctx.strokeStyle = col;
  ctx.lineWidth = lw * 2.2 * (1 + 0.18 * surge);
  trace();
  // The core: the light the water carries. Seafoam-pale by default;
  // the dark waters run their own cold neon through it.
  ctx.globalAlpha = Math.min(1, alpha * (1 + 0.15 * surge));
  ctx.strokeStyle = core;
  ctx.lineWidth = lw * (1 + 0.22 * surge);
  trace();
  // Foam riding the flow: two beads travelling the rope at the
  // water's own constant pace, born and dying at nothing — they
  // swell mid-run and FADE OUT at both ends, so the wrap from rope's
  // end back to its start is never seen.
  ctx.fillStyle = foam;
  for (let j = 0; j < 2; j++) {
    const ub = ((nowMs * 0.00019 + phase * 0.37 + j * 0.5) % 1 + 1) % 1;
    const i0 = Math.min(segs - 1, Math.floor(ub * segs));
    const fr2 = ub * segs - i0;
    const bx = pts[i0]![0] + (pts[i0 + 1]![0] - pts[i0]![0]) * fr2;
    const by = pts[i0]![1] + (pts[i0 + 1]![1] - pts[i0]![1]) * fr2;
    const life = Math.sin(ub * Math.PI);
    ctx.globalAlpha = life;
    ctx.beginPath();
    ctx.arc(bx, by, lw * (0.55 + 0.65 * life) * (1 + 0.3 * surge), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * THE DRAWN BREATH — the cinder oath's clock: a banked fire under a
 * slow bellows. A long smoulder rising off the floor (a sworn ember
 * NEVER goes out), the held draw, then THE FLARE — brief, bright,
 * gone — and the settle back down to the watch. Fourth clock grammar
 * in the court: the fen trades watches, the storm shares one sky,
 * the tide processes — the cinder BREATHES AS ONE BED; every ember
 * on the garment draws on the same wind, and only the crawl
 * positions keep their own time. Same `off` convention as tideK.
 */
export function cinderK(nowMs: number, off = 0): number {
  const u = ((nowMs / 5800 - off) % 1 + 1) % 1;
  const sm = (kk: number): number => {
    const c = Math.min(1, Math.max(0, kk));
    return c * c * (3 - 2 * c);
  };
  if (u < 0.62) return 0.12 + 0.88 * sm(u / 0.62);
  const v = (u - 0.62) / 0.38;
  if (v < 0.3) return 1 - 0.7 * sm(v / 0.3);
  return 0.3 - 0.18 * sm((v - 0.3) / 0.7);
}

/**
 * THE FLARE — how hard the fire is remembering right now, 0..1:
 * full the instant the draw crests (a flare is SUDDEN), decaying
 * through the settle. Drives the licks, the sparks, the halos —
 * and their particles ride `1 - flare` as a monotone run.
 */
export function cinderFlareK(nowMs: number, off = 0): number {
  const u = ((nowMs / 5800 - off) % 1 + 1) % 1;
  if (u < 0.62 || u > 0.86) return 0;
  return 1 - (u - 0.62) / 0.24;
}

/**
 * THE DRAWN CRACK — fire as strokes with intent (the drawn-water
 * law's fire verse: FIRE LIVES IN THE CRACK, never in a glow, and
 * never dresses a device's body in its own light). A fixed jagged
 * fissure between two points — the crack itself NEVER moves; what
 * moves is THE EMBER CRAWL: bright beads walking the fissure at one
 * constant pace forever (the seamless law), swelling and fading with
 * the breath `k`. Deep-red casing under a hot core, both breathing.
 */
export function emberCrack(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  seed: number, amp: number,
  casing: string, ember: string,
  nowMs: number, k: number, lw: number,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 0.0001) return;
  const nx = -dy / len;
  const ny = dx / len;
  const segs = 9;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= segs; i++) {
    const v = i / segs;
    // A fissure, not a wave: hard per-vertex jags, deterministic in
    // the seed, damped at both ends so the crack roots cleanly.
    const j = Math.sin(seed * 37.7 + i * 91.3) + 0.5 * Math.sin(seed * 13.1 + i * 53.7);
    pts.push([
      x0 + dx * v + nx * j * amp * Math.sin(v * Math.PI),
      y0 + dy * v + ny * j * amp * Math.sin(v * Math.PI),
    ]);
  }
  const trace = (): void => {
    ctx.beginPath();
    ctx.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
    ctx.stroke();
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = casing;
  ctx.globalAlpha = 0.3 + 0.45 * k;
  ctx.lineWidth = lw * 2.1;
  trace();
  ctx.strokeStyle = ember;
  ctx.globalAlpha = 0.28 + 0.6 * k;
  ctx.lineWidth = lw;
  trace();
  // The crawl: embers walking the fissure, born dark and dying
  // dark — the fade at both ends hides the wrap (the bead law).
  ctx.fillStyle = ember;
  for (let j2 = 0; j2 < 2; j2++) {
    const ub = ((nowMs * 0.00016 + seed * 0.31 + j2 * 0.5) % 1 + 1) % 1;
    const i0 = Math.min(segs - 1, Math.floor(ub * segs));
    const fr2 = ub * segs - i0;
    const bx = pts[i0]![0] + (pts[i0 + 1]![0] - pts[i0]![0]) * fr2;
    const by = pts[i0]![1] + (pts[i0 + 1]![1] - pts[i0]![1]) * fr2;
    const life = Math.sin(ub * Math.PI);
    ctx.globalAlpha = life * (0.5 + 0.5 * k);
    ctx.beginPath();
    ctx.arc(bx, by, lw * (0.6 + 0.7 * life), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * THE HUSH — the void whisper's clock: the FIFTH grammar in the
 * court. The fen trades watches, the storm shares one sky, the tide
 * processes, the cinder breathes as one bed — THE VOID HOLDS STILL.
 * For most of the cycle the cloth sits at a low rim-light (the
 * hush), then THE WHISPER passes: every torn edge brightens on the
 * same beat, the taken pieces stir, and the dark closes back over
 * it. Same `off` convention as tideK.
 */
export function voidK(nowMs: number, off = 0): number {
  const u = ((nowMs / 7800 - off) % 1 + 1) % 1;
  const sm = (kk: number): number => {
    const c = Math.min(1, Math.max(0, kk));
    return c * c * (3 - 2 * c);
  };
  if (u < 0.58) return 0.25;
  const v = (u - 0.58) / 0.42;
  if (v < 0.45) return 0.25 + 0.75 * sm(v / 0.45);
  return 1 - 0.75 * sm((v - 0.45) / 0.55);
}

/**
 * THE ARRIVAL — the void does not travel, it ARRIVES. A light that
 * lives at a ring of fixed seats: it wakes at one, brightens, dies,
 * and is next seen at the NEXT seat — never on the road between.
 * One constant pace forever (the seamless law); a whisper speaks
 * only through brightness, never through hurry. Returns the current
 * seat index and its life 0..1.
 */
export function voidWink(
  nowMs: number, seed: number, seats: number,
): { i: number; a: number } {
  const t = nowMs / 2600 + seed;
  const visit = Math.floor(t);
  return {
    i: ((visit % seats) + seats) % seats,
    a: Math.pow(Math.sin((t - visit) * Math.PI), 1.4),
  };
}

/**
 * THE DRAWN RIFT — void as an absence with a lit edge (the drawn-
 * light family's void verse: THE VOID IS AN ABSENCE — a tear's
 * interior is the garment's DARKEST value, plasma lives ONLY on the
 * torn edge, and no device is ever filled with its own light). A
 * fixed lens-shaped tear between two points: edges jagged and
 * deterministic in the seed (a rift never re-rolls), the interior
 * void, the rim a violet casing under a pale core, both riding the
 * hush `k`. In the deep, one tiny star ARRIVES at fixed seats down
 * the spine — seen, then elsewhere, never in between.
 */
export function voidRift(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  seed: number, w: number,
  casing: string, core: string, voidCol: string,
  nowMs: number, k: number, lw: number,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 0.0001) return;
  const nx = -dy / len;
  const ny = dx / len;
  const segs = 7;
  const edge = (side: number): Array<[number, number]> => {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= segs; i++) {
      const v = i / segs;
      const bulge = Math.sin(v * Math.PI) * w;
      const j = 0.3 * w * Math.sin(seed * (side > 0 ? 41.3 : 27.7) + i * 73.1);
      pts.push([
        x0 + dx * v + nx * (side * bulge + j),
        y0 + dy * v + ny * (side * bulge + j),
      ]);
    }
    return pts;
  };
  const a = edge(1);
  const b = edge(-1);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // The absence itself — darker than any cloth around it.
  ctx.fillStyle = voidCol;
  ctx.beginPath();
  ctx.moveTo(a[0]![0], a[0]![1]);
  for (let i = 1; i < a.length; i++) ctx.lineTo(a[i]![0], a[i]![1]);
  for (let i = b.length - 2; i >= 1; i--) ctx.lineTo(b[i]![0], b[i]![1]);
  ctx.closePath();
  ctx.fill();
  // The torn edge wears the only light.
  const rim = (pts: Array<[number, number]>): void => {
    ctx.beginPath();
    ctx.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
    ctx.stroke();
  };
  ctx.strokeStyle = casing;
  ctx.globalAlpha = 0.3 + 0.5 * k;
  ctx.lineWidth = lw * 2;
  rim(a);
  rim(b);
  ctx.strokeStyle = core;
  ctx.globalAlpha = 0.25 + 0.6 * k;
  ctx.lineWidth = lw;
  rim(a);
  rim(b);
  // The star in the deep: it arrives, it does not cross.
  ctx.fillStyle = core;
  const wk = voidWink(nowMs, seed * 0.37, 3);
  const sv = 0.25 + 0.25 * wk.i;
  ctx.globalAlpha = wk.a * (0.35 + 0.65 * k);
  ctx.beginPath();
  ctx.arc(x0 + dx * sv, y0 + dy * sv, lw * (0.7 + 0.6 * wk.a), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * THE PASSING BREEZE — thistledown's clock: the first wind. A long
 * calm at a low stir, then a gust rises, crests, and lets the field
 * settle. One wind for the whole garment (the daybreak cross-painter
 * pattern): the bloom nods, the shoulders shed, the hem seeds
 * brighten — all on the same breath of weather. Drift positions run
 * at one constant pace forever (the seamless law); the gust speaks
 * only through amplitude and light.
 */
export function breezeK(nowMs: number, off = 0): number {
  const u = ((nowMs / 6400 - off) % 1 + 1) % 1;
  const sm = (kk: number): number => {
    const c = Math.min(1, Math.max(0, kk));
    return c * c * (3 - 2 * c);
  };
  if (u < 0.55) return 0.2;
  const v = (u - 0.55) / 0.45;
  if (v < 0.4) return 0.2 + 0.8 * sm(v / 0.4);
  return 1 - 0.8 * sm((v - 0.4) / 0.6);
}

/**
 * THE SEED — thistledown drawn, never glowed: a tiny pale heart
 * with filament rays fanned above it, the way the seed actually
 * hangs under its down. One shape serves the whole wardrobe — the
 * hat's shed, the shoulders' loose fluff, the hem's riders — so
 * every seed in the set is unmistakably the same species.
 */
export function thistleSeed(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  color: string, rot: number, alpha: number,
): void {
  // Below ~0.3 the world's outline dilate rings a near-invisible
  // seed in full dark and it reads as a fly, not as down — a seed
  // too faint to carry its own light is not drawn at all.
  if (alpha <= 0.3) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, r * 0.32);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI * 0.82 + (i / 4) * Math.PI * 0.64;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, r * 0.3, r * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}


/**
 * Visual equipment styles — the CAPE_STYLES pattern extended to every
 * armor slot. Each record is pure JSON-shaped data a painter interprets;
 * the content pass authors records + palettes here, never new painters.
 * Unknown items fall back to silhouettes derived from their item color,
 * so every future def is dressed the moment it exists.
 *
 * Painters run inside drawHumanoid's frames (torso squash frame, head
 * frame, arm joints) so the fake-3D foreshortening and facing bands are
 * inherited for free. Laws every painter obeys:
 * - hurt ⇒ paint flat #ffffff (the white-flash silhouette);
 * - fills/strokes on the live ctx only, no allocation, ≤ ~10 subpaths
 *   per garment (the cape budget — these run per entity per frame);
 * - front/profile/back reads gate on profileK/backK/lead like the face.
 */

