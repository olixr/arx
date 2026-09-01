/**
 * THE SCREEN'S OWN LAYER — everything painted after the world pass:
 * build ghosts, action progress, the combo beat, floaties, risen words,
 * museum labels, the HP bar and the wound vignette.
 * Moved verbatim off the Renderer class (foundations F2 wave B); the
 * painters reach the engine through the shared PaintHost slice.
 */
import { ClientGame } from '../game/clientGame.js';
import { WORD_LIFE_MS } from '../game/wordLife.js';
import { buildableIconUrl } from './icons.js';
import { chamferRect } from './shapes.js';
import { STATUS_INK } from './statusFx.js';
import { drawStatusGlyph } from './statusIcons.js';
import { MUSEUM_PLANE_ID, abilityDef } from '@arx/content';
import { STATUS_AMBIENCE_MASK, STATUS_BIT, afflictionStacksOf, countStacksOf } from '@arx/shared';
import type { StatusId } from '@arx/shared';
import type { PaintHost } from './paintHost.js';

/** Wire bit → page id, for surfaces that walk bit order (wound row). */
const BIT_TO_STATUS = new Map<number, StatusId>(
  (Object.entries(STATUS_BIT) as Array<[StatusId, number]>).map(([id, bit]) => [bit, id]),
);

/** Screen-space footprint of a tile, elevation-lifted. */
export function ghostFootprint(rend: PaintHost, tx: number, ty: number): { x: number; y: number; sy: number } {
  const s = rend.camera.scale;
  const p = rend.camera.worldToScreen(tx, ty, rend.w, rend.h);
  const sy = rend.camera.worldToScreen(tx, ty + 1, rend.w, rend.h).y - p.y;
  p.y -= rend.renderLift(tx + 0.5, ty + 0.5) * s;
  return { x: p.x, y: p.y, sy };
}

/** The mass triangle of a 45° piece over a footprint rect. */
export function ghostDiagPath(rend: PaintHost, 
  x: number,
  y: number,
  w: number,
  hgt: number,
  mass: 'NE' | 'NW' | 'SE' | 'SW',
): void {
  const ctx = rend.ctx;
  ctx.beginPath();
  if (mass === 'NE') {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + hgt);
  } else if (mass === 'NW') {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x, y + hgt);
  } else if (mass === 'SE') {
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + hgt);
    ctx.lineTo(x, y + hgt);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + hgt);
    ctx.lineTo(x, y + hgt);
  }
  ctx.closePath();
}

export function drawBuildGhost(rend: PaintHost, ): void {
  const g = rend.buildGhost;
  const ctx = rend.ctx;
  const s = rend.camera.scale;

  // The build site's progress ring — the work has a place, not just
  // a bar over the head.
  if (rend.buildSite && rend.game?.action) {
    const a = rend.game.action;
    const frac = Math.min(1, (performance.now() - a.startedAt) / Math.max(1, a.durationMs));
    const f = ghostFootprint(rend, rend.buildSite.tx, rend.buildSite.ty);
    const cx = f.x + s / 2;
    const cy = f.y + f.sy / 2;
    ctx.strokeStyle = 'rgba(24, 14, 32, 0.55)';
    ctx.lineWidth = Math.max(2.5, s * 0.07);
    ctx.beginPath();
    ctx.ellipse(cx, cy, s * 0.42, s * 0.42 * rend.camera.yScale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#e8b64c';
    ctx.beginPath();
    ctx.ellipse(
      cx,
      cy,
      s * 0.42,
      s * 0.42 * rend.camera.yScale,
      0,
      -Math.PI / 2,
      -Math.PI / 2 + frac * Math.PI * 2,
    );
    ctx.stroke();
  }

  // In build mode (either ghost live), your own work glints softly —
  // what the wrecking hand may touch, visible before it's armed.
  if ((g || rend.demolishGhost) && rend.ownBuiltTiles.length > 0) {
    ctx.strokeStyle = 'rgba(232, 214, 164, 0.34)';
    ctx.lineWidth = Math.max(1.2, s * 0.035);
    // Cull on TILE coords first: the ledger holds every tile this
    // hand ever raised, world-wide, and projecting each one
    // (worldToScreen ×2 + renderLift) before the screen test made
    // build mode pay for a lifetime of construction every frame.
    const vb = rend.visibleTileBounds();
    for (const t of rend.ownBuiltTiles) {
      if (t.tx < vb.minTx - 1 || t.tx > vb.maxTx + 1 || t.ty < vb.minTy - 1 || t.ty > vb.maxTy + 4) {
        continue;
      }
      const f = ghostFootprint(rend, t.tx, t.ty);
      if (f.x < -s || f.x > rend.w + s || f.y < -s * 3 || f.y > rend.h + s) continue;
      const tick = s * 0.18;
      ctx.beginPath();
      ctx.moveTo(f.x + 2 + tick, f.y + 2);
      ctx.lineTo(f.x + 2, f.y + 2);
      ctx.lineTo(f.x + 2, f.y + 2 + tick * rend.camera.yScale);
      ctx.moveTo(f.x + s - 2 - tick, f.y + f.sy - 2);
      ctx.lineTo(f.x + s - 2, f.y + f.sy - 2);
      ctx.lineTo(f.x + s - 2, f.y + f.sy - 2 - tick * rend.camera.yScale);
      ctx.stroke();
    }
  }

  // The armed hover: a red dashed frame on YOUR tile, with what the
  // teardown hands back written above it.
  if (rend.demolishGhost) {
    const dg = rend.demolishGhost;
    const f = ghostFootprint(rend, dg.tx, dg.ty);
    ctx.strokeStyle = '#e07a5f';
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.setLineDash([Math.max(3, s * 0.14), Math.max(3, s * 0.1)]);
    ctx.beginPath();
    chamferRect(ctx, f.x + 2, f.y + 2, s - 4, f.sy - 4, s * 0.14);
    ctx.stroke();
    ctx.setLineDash([]);
    if (dg.salvage) {
      ctx.font = "600 12px 'Trebuchet MS', sans-serif";
      const tw = ctx.measureText(dg.salvage).width;
      const cx = f.x + s / 2;
      ctx.fillStyle = 'rgba(24, 14, 32, 0.85)';
      ctx.beginPath();
      chamferRect(ctx, cx - tw / 2 - 7, f.y - 26, tw + 14, 18, 5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(224, 122, 95, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#f0dcc8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(dg.salvage, cx, f.y - 17);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  }

  if (!g) return;

  // The reach annulus: a quiet breathing ring at the 3-tile working
  // radius — where the red "Too far" begins, made visible.
  const own = rend.game?.predictor.renderPos();
  if (own) {
    const c = rend.liftedWTS(own.x, own.y);
    const breathe = 0.1 + Math.sin(performance.now() / 640) * 0.025;
    ctx.strokeStyle = `rgba(238, 222, 178, ${breathe})`;
    ctx.lineWidth = Math.max(1.5, s * 0.045);
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, s * 3, s * 3 * rend.camera.yScale, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // The queued run: faint footprints awaiting their turn, and a
  // count chip on the last so the drain is legible.
  for (const q of g.queued) {
    const f = ghostFootprint(rend, q.tx, q.ty);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = g.topColor;
    ctx.beginPath();
    chamferRect(ctx, f.x + 2, f.y + 2, s - 4, f.sy - 4, s * 0.14);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#e8d6a4';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (g.queued.length > 0) {
    const last = g.queued[g.queued.length - 1]!;
    const f = ghostFootprint(rend, last.tx, last.ty);
    const label = `×${g.queued.length}`;
    ctx.font = "600 12px 'Trebuchet MS', sans-serif";
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(24, 14, 32, 0.82)';
    ctx.beginPath();
    chamferRect(ctx, f.x + s / 2 - tw / 2 - 5, f.y - 20, tw + 10, 16, 4);
    ctx.fill();
    ctx.fillStyle = '#e8d6a4';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, f.x + s / 2, f.y - 12);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  const f = ghostFootprint(rend, g.tx, g.ty);
  const edge = g.valid ? '#4fc06a' : '#c4553d';

  // The footprint always grounds the read.
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = g.topColor;
  if (g.diag) ghostDiagPath(rend, f.x + 1, f.y + 1, s - 2, f.sy - 2, g.diag);
  else {
    ctx.beginPath();
    chamferRect(ctx, f.x + 1, f.y + 1, s - 2, f.sy - 2, s * 0.16);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 3;
  ctx.strokeStyle = edge;
  ctx.stroke();

  if (g.kind === 'wall') {
    // The piece in the flesh: the wall's own height (WALL_H, full-s
    // units — the projection law), faces ghosted, edges firm.
    const rise = s * 2.05;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = g.color;
    if (g.diag) {
      // The hypotenuse face rises from the diagonal; ghost it as the
      // lifted triangle plus plumb edge hints.
      ghostDiagPath(rend, f.x + 1, f.y + 1 - rise, s - 2, f.sy - 2, g.diag);
      ctx.fill();
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 2;
      ctx.strokeStyle = edge;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(f.x + 1, f.y + 1 + (g.diag === 'SE' ? f.sy - 2 : 0));
      ctx.lineTo(f.x + 1, f.y + 1 + (g.diag === 'SE' ? f.sy - 2 : 0) - rise);
      ctx.moveTo(f.x + s - 1, f.y + 1 + (g.diag === 'SW' ? f.sy - 2 : 0));
      ctx.lineTo(f.x + s - 1, f.y + 1 + (g.diag === 'SW' ? f.sy - 2 : 0) - rise);
      ctx.stroke();
    } else {
      // Front face from the south edge up, then the crown plate.
      ctx.fillRect(f.x + 1, f.y + f.sy - rise, s - 2, rise);
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = g.topColor;
      ctx.beginPath();
      chamferRect(ctx, f.x + 1, f.y + 1 - rise, s - 2, f.sy - 2, s * 0.16);
      ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 2;
      ctx.strokeStyle = edge;
      ctx.beginPath();
      chamferRect(ctx, f.x + 1, f.y + 1 - rise, s - 2, f.sy - 2, s * 0.16);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(f.x + 1, f.y + f.sy);
      ctx.lineTo(f.x + 1, f.y + f.sy - rise);
      ctx.moveTo(f.x + s - 1, f.y + f.sy);
      ctx.lineTo(f.x + s - 1, f.y + f.sy - rise);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (g.kind === 'prop' && g.icon) {
    // The piece's own icon standing on the footprint.
    let img = rend.ghostIcons.get(g.icon);
    if (!img) {
      img = new Image();
      img.src = buildableIconUrl(g.icon, 44) ?? '';
      rend.ghostIcons.set(g.icon, img);
    }
    if (img.complete && img.naturalWidth > 0) {
      const iw = s * 0.85;
      ctx.globalAlpha = 0.92;
      ctx.drawImage(img, f.x + s / 2 - iw / 2, f.y + f.sy / 2 - iw * 0.82, iw, iw);
      ctx.globalAlpha = 1;
    }
  }

  // The one-breath refusal chip: the ghost says WHY it is red.
  if (!g.valid && g.reason) {
    const topY = g.kind === 'wall' ? f.y - s * 2.05 : f.y;
    ctx.font = "600 12px 'Trebuchet MS', sans-serif";
    const tw = ctx.measureText(g.reason).width;
    const cx = f.x + s / 2;
    ctx.fillStyle = 'rgba(24, 14, 32, 0.85)';
    ctx.beginPath();
    chamferRect(ctx, cx - tw / 2 - 7, topY - 26, tw + 14, 18, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(196, 85, 61, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#f0dcc8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(g.reason, cx, topY - 17);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}

export function drawActionProgress(rend: PaintHost, game: ClientGame): void {
  if (game.ownEid === null) return;
  // THE DRAWN BREATH shares the action bar's spot and dialect (the
  // server keeps the two mutually exclusive) but wears the art's own
  // color, and its fill rides the tick accrual — visibly quicker the
  // moment the feet plant. renderAlpha smooths the 20 Hz steps.
  let frac: number | null = null;
  let fill = '#e8b64c';
  if (game.action) {
    frac = Math.min(
      1,
      (performance.now() - game.action.startedAt) / Math.max(1, game.action.durationMs),
    );
    // THE HELD NOTE wears its art's color, like the breath does.
    if (game.action.ability) fill = abilityDef(game.action.ability)?.color ?? fill;
  } else if (game.ownCast) {
    const c = game.ownCast;
    const alpha = Math.min(1, Math.max(0, game.predictor.renderAlpha));
    frac = Math.min(1, (c.progress + alpha * c.rate) / Math.max(1, c.total));
    fill = c.ab.color;
  }
  if (frac === null) return;
  const ctx = rend.ctx;
  const s = rend.camera.scale;
  const own = game.predictor.renderPos();
  const p = rend.liftedWTS(own.x, own.y);
  const bw = s * 1.0;
  const bh = Math.max(4, s * 0.1);
  const bx = p.x - bw / 2;
  const by = p.y - s * 1.32;
  ctx.fillStyle = 'rgba(24, 14, 32, 0.85)';
  ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  ctx.fillStyle = fill;
  ctx.fillRect(bx, by, Math.max(2, bw * frac), bh);
}

/**
 * THE SPOKEN BEAT's face: stage pips under the own body while a
 * string is alive. Filled pips = beats already swung, the next pip
 * ghosted; the whole row is the GRACE EMBER — it burns down with the
 * window and fades out as the string dies. THE RUN warms the pips
 * once the rhythm holds past one full string. Same canvas dialect as
 * the cast bar above it; single-beat lanes (len 1) stay silent.
 */
export function drawComboBeat(rend: PaintHost, game: ClientGame): void {
  const combo = game.ownCombo;
  if (!combo || combo.len < 2 || game.ownEid === null) return;
  const now = performance.now();
  const left = combo.graceUntilMs - now;
  if (left <= 0) return;
  const total = Math.max(1, combo.graceUntilMs - combo.bornMs);
  // The ember: full presence while the string is hot, a fade across
  // the last 35% of the window so the die-off reads as cooling.
  const frac = left / total;
  const alpha = Math.min(1, frac / 0.35);
  const ctx = rend.ctx;
  const s = rend.camera.scale;
  const own = game.predictor.renderPos();
  const p = rend.liftedWTS(own.x, own.y);
  const gap = s * 0.16;
  const r = Math.max(2, s * 0.045);
  const cy = p.y + s * 0.62; // under the feet, clear of the body
  const cx0 = p.x - ((combo.len - 1) * gap) / 2;
  // The run warms the lit pips from ember-gold toward white heat.
  const warm = Math.min(1, Math.max(0, combo.run - combo.len) / (combo.len * 2));
  const lit = `rgba(${232 + Math.round(warm * 23)}, ${182 + Math.round(warm * 60)}, ${76 + Math.round(warm * 140)}, ${0.9 * alpha})`;
  const dim = `rgba(232, 182, 76, ${0.28 * alpha})`;
  for (let i = 0; i < combo.len; i++) {
    ctx.beginPath();
    ctx.arc(cx0 + i * gap, cy, i <= combo.stage ? r : r * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = i <= combo.stage ? lit : dim;
    ctx.fill();
  }
}

export function drawFloaties(rend: PaintHost, game: ClientGame): void {
  const ctx = rend.ctx;
  const s = rend.camera.scale;
  const now = performance.now();
  const LIFE = 850;
  for (let i = game.floaties.length - 1; i >= 0; i--) {
    const f = game.floaties[i]!;
    const age = now - f.bornAt;
    if (age > LIFE) {
      game.floaties.splice(i, 1);
      continue;
    }
    const frac = age / LIFE;
    const p = rend.liftedWTS(f.x, f.y - frac * 0.8);
    ctx.globalAlpha = 1 - frac * frac;
    // Pop: numbers land big and settle — impact you can read.
    const pop = 1 + 0.55 * Math.max(0, 1 - age / 130);
    ctx.font = `700 ${Math.max(13, s * 0.38 * (f.sizeMul ?? 1) * pop)}px 'Trebuchet MS', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(24, 14, 32, 0.9)';
    ctx.fillText(f.text, p.x + 2, p.y + 2);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, p.x, p.y);
    ctx.globalAlpha = 1;
  }
}

/**
 * THE RISEN WORD: interaction answers standing in the world —
 * "LOCKED" over the chest, "PACK FULL" over your own head. A
 * different voice from damage numbers on purpose: capitals, letter
 * air, the full eight-tap ink ring (the icons' outline dialect), a
 * settle instead of a flight. A deny-toned word is born with a short
 * head-shake — the shape of "no" you can read before the letters.
 * Words live on game.words under the dedupe law (a re-ask re-pops
 * the standing word via its refreshed bornAt).
 */
export function drawWords(rend: PaintHost, game: ClientGame): void {
  if (game.words.length === 0) return;
  const ctx = rend.ctx;
  const s = rend.camera.scale;
  const now = performance.now();
  for (let i = game.words.length - 1; i >= 0; i--) {
    const w = game.words[i]!;
    const age = now - w.bornAt;
    if (age > WORD_LIFE_MS) {
      game.words.splice(i, 1);
      continue;
    }
    const frac = age / WORD_LIFE_MS;
    // The settle: barely drifts while it speaks, then leaves upward.
    const rise = 0.5 * frac * frac;
    const p = rend.liftedWTS(w.x, w.y - 0.95 - rise);
    // Landing pop — overshoot big, settle fast (same law the damage
    // numbers obey, softened: a word is said, not struck).
    const pop = 1 + 0.4 * Math.max(0, 1 - age / 150);
    // The head-shake: deny words shiver side-to-side for the first
    // beat — a "no" that reads from across the room.
    const shake =
      w.tone === 'deny' && age < 260
        ? Math.sin(age / 26) * 3.2 * (1 - age / 260)
        : 0;
    const alpha = frac < 0.65 ? 1 : Math.pow(1 - (frac - 0.65) / 0.35, 1.2);
    const text = w.word.toUpperCase();
    // Long words yield a little so "NEEDS MINING 20" stays composed.
    const fit = text.length > 10 ? 0.82 : 1;
    const px = Math.max(12, s * 0.3 * fit * pop);
    ctx.globalAlpha = alpha;
    ctx.font = `800 ${px}px 'Trebuchet MS', sans-serif`;
    ctx.textAlign = 'center';
    const cx = p.x + shake;
    // The full ink ring — the same eight-tap silhouette the world's
    // sprites wear, so the word belongs to the scene it stands in.
    const r = Math.max(1.5, px * 0.09);
    ctx.fillStyle = 'rgba(24, 14, 32, 0.92)';
    for (let t = 0; t < 8; t++) {
      const a = (t * Math.PI) / 4;
      ctx.fillText(text, cx + Math.cos(a) * r, p.y + Math.sin(a) * r);
    }
    // The grounding tap: a hard south-east drop so it sits, not floats.
    ctx.fillText(text, cx + r * 1.4, p.y + r * 1.4);
    ctx.fillStyle =
      w.tone === 'deny' ? '#ff9b8a' : w.tone === 'good' ? '#7dc46a' : '#f0e6cf';
    ctx.fillText(text, cx, p.y);
    ctx.globalAlpha = 1;
  }
}

/**
 * THE PROP MUSEUM (dev builds only): on the museum plane every
 * plinth speaks at once — each sign's title hangs as a small plate
 * beneath its post so a reviewer reads a whole aisle at a glance
 * instead of plaque-by-plaque through the sign HUD's 2.9-tile
 * radius. Loot-plate dialect, calmer: no ration, no climb — the
 * floor plan already spaces the plinths. Off-plane this is a single
 * string compare per frame.
 */
export function drawMuseumLabels(rend: PaintHost, game: ClientGame): void {
  if (game.plane.id !== MUSEUM_PLANE_ID || game.signs.size === 0) return;
  const ctx = rend.ctx;
  const b = rend.visibleTileBounds();
  ctx.save();
  ctx.font = "600 11px 'Trebuchet MS', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const h = 16;
  for (const sign of game.signs.values()) {
    if (sign.tx < b.minTx || sign.tx > b.maxTx || sign.ty < b.minTy || sign.ty > b.maxTy) {
      continue;
    }
    const p = rend.liftedWTS(sign.tx + 0.5, sign.ty + 1.05);
    const w = ctx.measureText(sign.title).width + 12;
    ctx.fillStyle = 'rgba(24, 16, 30, 0.78)';
    ctx.strokeStyle = 'rgba(240, 232, 212, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    chamferRect(ctx, p.x - w / 2, p.y - h / 2, w, h, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f0e6cf';
    ctx.fillText(sign.title, p.x, p.y + 0.5);
  }
  ctx.restore();
}

export function drawHpBar(rend: PaintHost, game: ClientGame): void {
  if (game.ownEid === null) return;
  // A cinematic owns the frame: the gauge bows out with the HUD
  // (it pokes over the letterbox otherwise — nothing may compete
  // with the scene).
  if (rend.cineEid !== null) return;
  const ctx = rend.ctx;
  const bw = Math.min(260, rend.w * 0.36);
  const bh = 14;
  const bx = rend.w / 2 - bw / 2;
  // Sits just above the hotbar (56px slots + 14px inset).
  const by = rend.h - 96;
  // The main vitality gauge: a chamfered block, framed hard.
  ctx.fillStyle = 'rgba(24, 14, 32, 0.85)';
  ctx.beginPath();
  chamferRect(ctx, bx - 3, by - 3, bw + 6, bh + 6, 5);
  ctx.fill();
  ctx.fillStyle = '#54303a';
  ctx.fillRect(bx, by, bw, bh);
  const frac = game.ownHpPct / 255;
  ctx.fillStyle = frac > 0.5 ? '#4fc06a' : frac > 0.25 ? '#e8b64c' : '#c4553d';
  ctx.fillRect(bx, by, Math.max(3, bw * frac), bh);
  ctx.strokeStyle = '#6a4f35';
  ctx.lineWidth = 2;
  ctx.beginPath();
  chamferRect(ctx, bx - 3, by - 3, bw + 6, bh + 6, 5);
  ctx.stroke();
  drawOwnWounds(rend, game, by);
}

/**
 * THE WOUND ROW (visible-buildcraft V2): the player's own riding
 * states, on the vitality gauge's shoulder. ONE GRAMMAR, EVERY
 * SCALE — the same inks, the same priority order, and the same xN
 * stack voice as every nameplate, scaled up for the owner. It
 * stands ABOVE the bar because the hotbar owns the south edge; no
 * timers are invented (the wire carries bits and stacks, and that
 * is what is shown). Empty when clean — no furniture for nothing.
 */
export function drawOwnWounds(rend: PaintHost, game: ClientGame, barY: number): void {
  const states = game.ownStatus & STATUS_AMBIENCE_MASK;
  if (!states) return;
  const ctx = rend.ctx;
  // The one priority order, owner scale (THE WIDER WOUND appends).
  const order: ReadonlyArray<readonly [number, string]> = [
    [STATUS_BIT.sunder, STATUS_INK.sunder!],
    [STATUS_BIT.bleed, STATUS_INK.bleed!],
    [STATUS_BIT.venom, STATUS_INK.venom!],
    [STATUS_BIT.burn, STATUS_INK.burn!],
    [STATUS_BIT.chill, STATUS_INK.chill!],
    [STATUS_BIT.shock, STATUS_INK.shock!],
    [STATUS_BIT.root, STATUS_INK.root!],
    [STATUS_BIT.stagger, STATUS_INK.stagger!],
    [STATUS_BIT.weaken, STATUS_INK.weaken!],
    [STATUS_BIT.stonehide, STATUS_INK.stonehide!],
    [STATUS_BIT.quicken, STATUS_INK.quicken!],
    [STATUS_BIT.mend, STATUS_INK.mend!],
  ];
  const shown = order.filter(([bit]) => (states & bit) !== 0);
  const d = 14;
  const gap = 5;
  // Both nibbles count on the owner's row too.
  const stacks = afflictionStacksOf(game.ownStatus) + countStacksOf(game.ownStatus);
  const stackW = stacks >= 2 ? 26 : 0;
  let sx = rend.w / 2 - (shown.length * (d + gap) - gap + stackW) / 2;
  const sy = barY - d - 8;
  // THE ICON IS THE PAINTER, at owner scale: the row wears the
  // pages' own glyphs (the nameplate keeps its squares — at 3-7 px
  // a square IS the right glyph; 14 px earns the subject).
  for (const [bit] of shown) {
    const id = BIT_TO_STATUS.get(bit)!;
    drawStatusGlyph(ctx, id, sx, sy, d);
    sx += d + gap;
  }
  if (stacks >= 2) {
    ctx.font = "700 12px 'Trebuchet MS', sans-serif";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(24, 14, 32, 0.9)';
    ctx.fillText(`x${stacks}`, sx + 2.5, sy + d + 0.5);
    ctx.fillStyle = '#efe3c2';
    ctx.fillText(`x${stacks}`, sx + 1, sy + d - 1);
  }
}
