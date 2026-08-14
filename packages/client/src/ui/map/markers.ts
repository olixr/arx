import { hashString } from '@arx/shared';
import type { DiscoveryWire } from '@arx/shared';
import { PLAYER_COLORS } from '../../render/renderer.js';
import { bakeOutlinedSprite } from '../../render/icons.js';
import { INK } from '../kit/tokens.js';

/**
 * MAP SIGILS — the chart's marks, rebuilt as SOLID FILLED plaques that
 * ride the world's outline shader (the eight-tap ink ring + hard
 * shadow every object in the grass wears — bakeOutlinedSprite is the
 * icon pipeline itself). Two flat value planes per glyph, never a
 * stroked interior line (the flat-forge law), so every mark reads at
 * a glance on parchment, glass, and the danger wash alike. NO emoji,
 * NO icon fonts (the studio law). Faded markers are rumors:
 * desaturated ink at reduced presence.
 */

// The sigil palette — canvas statics in the renderer's dialect.
const BRASS = '#d8c08c';
const BRASS_DEEP = '#a8905c';
const FADE = '#9a8f78';
const FADE_DEEP = '#7a715c';
const SKY = '#7ec8e3';
const SKY_DEEP = '#4f92b4';
const BONE = '#e6ddc8';
const BONE_DEEP = '#bfb291';
const GOLD = '#f2c94c';
const GOLD_DEEP = '#c99b2c';
const EMBER = '#d96c4f';

/** Chart marks wear a bolder ring than pack icons — map distance. */
const MARK_RING = 0.05;

type Painter = (ctx: CanvasRenderingContext2D) => void;

/**
 * Baked-sprite cache. Sprites bake at quantized device resolution and
 * stamp at CSS size, so a mark stays crisp on hidpi glass without a
 * bake per fractional radius.
 */
const sprites = new Map<string, HTMLCanvasElement>();

function sprite(key: string, cssSize: number, paint: Painter): { cnv: HTMLCanvasElement; px: number } {
  const dpr = Math.min(3, Math.max(1, Math.round(window.devicePixelRatio || 1)));
  const px = Math.min(224, Math.max(24, Math.ceil((cssSize * dpr) / 8) * 8));
  const k = `${key}|${px}`;
  let cnv = sprites.get(k);
  if (!cnv) {
    cnv = bakeOutlinedSprite(paint, px, MARK_RING);
    sprites.set(k, cnv);
    if (sprites.size > 256) {
      const first = sprites.keys().next().value as string;
      sprites.delete(first);
    }
  }
  return { cnv, px };
}

/** Stamp a baked sprite with its unit-box anchor point at (x, y). */
function stamp(
  ctx: CanvasRenderingContext2D,
  s: { cnv: HTMLCanvasElement },
  x: number,
  y: number,
  cssSize: number,
  ax = 0.5,
  ay = 0.5,
): void {
  ctx.drawImage(s.cnv, x - cssSize * ax, y - cssSize * ay, cssSize, cssSize);
}

function poly(ctx: CanvasRenderingContext2D, pts: ReadonlyArray<readonly [number, number]>, fill: string): void {
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

// ------------------------------------------------------ sigil painters

/** A keep: solid gabled tower, roof in shade plane, ink doorway. */
function paintTown(lit: string, deep: string): Painter {
  return (ctx) => {
    poly(ctx, [[0.22, 0.4], [0.22, 0.9], [0.78, 0.9], [0.78, 0.4]], lit);
    poly(ctx, [[0.5, 0.06], [0.13, 0.42], [0.87, 0.42]], deep);
    // The doorway, punched in ink — the outline material carving in.
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(0.41, 0.9);
    ctx.lineTo(0.41, 0.66);
    ctx.arc(0.5, 0.66, 0.09, Math.PI, 0);
    ctx.lineTo(0.59, 0.9);
    ctx.closePath();
    ctx.fill();
  };
}

/** A pennant on a planted pole — frontier sites. */
function paintPoi(lit: string, deep: string): Painter {
  return (ctx) => {
    poly(ctx, [[0.3, 0.1], [0.3, 0.92], [0.38, 0.92], [0.38, 0.1]], deep);
    poly(ctx, [[0.24, 0.86], [0.24, 0.94], [0.44, 0.94], [0.44, 0.86]], deep);
    poly(ctx, [[0.38, 0.1], [0.9, 0.27], [0.38, 0.44]], lit);
  };
}

/** An arched gate over a descending stair — riftgates delved. */
function paintDungeon(lit: string, deep: string): Painter {
  return (ctx) => {
    // The massif with its arched crown.
    ctx.beginPath();
    ctx.moveTo(0.14, 0.9);
    ctx.lineTo(0.14, 0.46);
    ctx.arc(0.5, 0.46, 0.36, Math.PI, 0);
    ctx.lineTo(0.86, 0.9);
    ctx.closePath();
    ctx.fillStyle = lit;
    ctx.fill();
    // Keystone wedge — the one shade plane on the face.
    poly(ctx, [[0.44, 0.1], [0.56, 0.1], [0.53, 0.24], [0.47, 0.24]], deep);
    // The mouth, ink-dark, with two steps sinking into it.
    ctx.beginPath();
    ctx.moveTo(0.31, 0.9);
    ctx.lineTo(0.31, 0.56);
    ctx.arc(0.5, 0.56, 0.19, Math.PI, 0);
    ctx.lineTo(0.69, 0.9);
    ctx.closePath();
    ctx.fillStyle = INK;
    ctx.fill();
    poly(ctx, [[0.37, 0.74], [0.63, 0.74], [0.63, 0.79], [0.37, 0.79]], deep);
    poly(ctx, [[0.42, 0.83], [0.58, 0.83], [0.58, 0.88], [0.42, 0.88]], deep);
  };
}

/** A standing stone — named landmarks: lit face, shaded east flank. */
function paintLandmark(lit: string, deep: string): Painter {
  return (ctx) => {
    poly(ctx, [[0.28, 0.9], [0.22, 0.36], [0.4, 0.1], [0.66, 0.14], [0.72, 0.9]], lit);
    poly(ctx, [[0.56, 0.115], [0.66, 0.14], [0.72, 0.9], [0.56, 0.9]], deep);
    poly(ctx, [[0.18, 0.86], [0.3, 0.86], [0.3, 0.94], [0.18, 0.94]], deep);
  };
}

/** The one waypoint: a planted swallow-tail banner in sky ink. */
function paintWaypoint(): Painter {
  return (ctx) => {
    // Pole with a ground pin — planted, not floating.
    poly(ctx, [[0.3, 0.1], [0.3, 0.92], [0.38, 0.92], [0.38, 0.1]], SKY_DEEP);
    poly(ctx, [[0.34, 0.99], [0.44, 0.92], [0.34, 0.85], [0.24, 0.92]], SKY_DEEP);
    // The banner: full swallow-tail fly.
    poly(ctx, [[0.38, 0.11], [0.94, 0.17], [0.78, 0.31], [0.94, 0.45], [0.38, 0.51]], SKY);
    // Hoist shade plane where the cloth meets the pole.
    poly(ctx, [[0.38, 0.11], [0.5, 0.123], [0.5, 0.497], [0.38, 0.51]], SKY_DEEP);
    // The gold finial: the flag's little sun.
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(0.34, 0.08, 0.055, 0, Math.PI * 2);
    ctx.fill();
  };
}

/** Where the reader last fell: a solid bone skull. */
function paintSkull(): Painter {
  return (ctx) => {
    // Cranium dying into two jaw shoulders — one filled mass.
    ctx.beginPath();
    ctx.moveTo(0.19, 0.56);
    ctx.quadraticCurveTo(0.14, 0.1, 0.5, 0.08);
    ctx.quadraticCurveTo(0.86, 0.1, 0.81, 0.56);
    ctx.lineTo(0.68, 0.66);
    ctx.lineTo(0.68, 0.88);
    ctx.lineTo(0.32, 0.88);
    ctx.lineTo(0.32, 0.66);
    ctx.closePath();
    ctx.fillStyle = BONE;
    ctx.fill();
    // The jaw plane sits a half-tone under the dome.
    poly(ctx, [[0.32, 0.72], [0.68, 0.72], [0.68, 0.88], [0.32, 0.88]], BONE_DEEP);
    // Sockets, nose notch, and tooth seams — punched in ink.
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(0.365, 0.44, 0.1, 0, Math.PI * 2);
    ctx.arc(0.635, 0.44, 0.1, 0, Math.PI * 2);
    ctx.fill();
    poly(ctx, [[0.5, 0.55], [0.445, 0.67], [0.555, 0.67]], INK);
    poly(ctx, [[0.43, 0.73], [0.455, 0.73], [0.455, 0.88], [0.43, 0.88]], INK);
    poly(ctx, [[0.545, 0.73], [0.57, 0.73], [0.57, 0.88], [0.545, 0.88]], INK);
  };
}

/** The reader's own body: a gold compass needle, folded down its spine. */
function paintPlayerArrow(): Painter {
  return (ctx) => {
    poly(ctx, [[0.5, 0.04], [0.5, 0.6], [0.14, 0.88]], GOLD);
    poly(ctx, [[0.5, 0.04], [0.86, 0.88], [0.5, 0.6]], GOLD_DEEP);
  };
}

/** A kin-dot in a fellow's identity color, pale keystone at heart. */
function paintPartyDot(color: string): Painter {
  return (ctx) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0.5, 0.5, 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(236, 228, 208, 0.9)';
    ctx.beginPath();
    ctx.arc(0.5, 0.5, 0.13, 0, Math.PI * 2);
    ctx.fill();
  };
}

/** An edge pointer chevron, aimed right at rotation zero. */
function paintChevron(color: string): Painter {
  return (ctx) => {
    poly(ctx, [[0.16, 0.14], [0.9, 0.5], [0.16, 0.86], [0.36, 0.5]], color);
  };
}

// --------------------------------------------------------- draw calls

/** One ledger mark at screen (x, y); r is the sigil half-size in px. */
export function drawDiscoveryMarker(
  ctx: CanvasRenderingContext2D,
  d: DiscoveryWire,
  x: number,
  y: number,
  r: number,
  hot = false,
): void {
  const lit = d.faded ? FADE : BRASS;
  const deep = d.faded ? FADE_DEEP : BRASS_DEEP;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = d.faded ? 0.6 : 1;
  if (hot) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(242, 201, 76, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (d.faded) {
    // The rumor ring: a dashed halo saying "this may have changed".
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2);
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(154, 143, 120, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const fadeKey = d.faded ? 'f' : 'b';
  const S = r * 2.6;
  const painters: Record<DiscoveryWire['kind'], () => Painter> = {
    town: () => paintTown(lit, deep),
    poi: () => paintPoi(lit, deep),
    dungeon: () => paintDungeon(lit, deep),
    landmark: () => paintLandmark(lit, deep),
  };
  stamp(ctx, sprite(`disc:${d.kind}:${fadeKey}`, S, painters[d.kind]()), 0, 0, S);
  // THE STAGE PIPS (the boldness ladder): one filled stud under the
  // sigil per rung — "bolder than when you found it" at a glance.
  // Rumor markers drop them: a faded marker's stage is itself a rumor.
  if (!d.faded && d.stage !== undefined && d.stage > 0) {
    const n = Math.min(d.stage, 3);
    const w = r * 0.46;
    const py = r * 1.32;
    for (let i = 0; i < n; i++) {
      const px = (i - (n - 1) / 2) * w;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1.6, r * 0.15), 0, Math.PI * 2);
      ctx.fillStyle = lit;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** The one active waypoint: a planted banner with a soft beacon pulse. */
export function drawWaypointFlag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  pulse01: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  // Beacon: an expanding ring breathing out of the plant point.
  const pr = r * (0.9 + pulse01 * 1.5);
  ctx.beginPath();
  ctx.arc(0, 0, pr, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(126, 200, 227, ${0.6 * (1 - pulse01)})`;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // The banner sprite, its ground pin planted on the spot.
  const S = r * 2.8;
  stamp(ctx, sprite('waypoint', S, paintWaypoint()), 0, 0, S, 0.34, 0.92);
  ctx.restore();
}

/**
 * Where the reader last fell: a solid bone skull over the spilled
 * pack, breathing a slow ember ring (the waypoint beacon's grim
 * cousin). Personal like the flag — nobody else's chart carries it.
 */
export function drawDeathMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  pulse01: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  // The ember breath: an expanding ring sighing out of the fall.
  const pr = r * (1.0 + pulse01 * 1.5);
  ctx.beginPath();
  ctx.arc(0, 0, pr, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(217, 108, 79, ${0.55 * (1 - pulse01)})`;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  const S = r * 2.5;
  stamp(ctx, sprite('skull', S, paintSkull()), 0, 0, S);
  ctx.restore();
}

/**
 * The reader's own body: a gold compass needle at their heading, over
 * a quiet gold presence halo — the first thing the eye should find.
 * `pulse01` breathes the halo; pass `quiet` on the glass, where the
 * needle is always dead center and only needs a whisper.
 */
export function drawPlayerToken(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  dir: number,
  pulse01 = 0,
  quiet = false,
): void {
  ctx.save();
  ctx.translate(x, y);
  // The presence halo: a soft gold ground the needle stands on.
  const glow = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.3);
  glow.addColorStop(0, `rgba(242, 201, 76, ${quiet ? 0.22 : 0.3})`);
  glow.addColorStop(1, 'rgba(242, 201, 76, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.3, 0, Math.PI * 2);
  ctx.fill();
  if (!quiet) {
    // The breath: one ring swelling off the halo, then gone.
    ctx.beginPath();
    ctx.arc(0, 0, r * (1.35 + pulse01 * 1.1), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(242, 201, 76, ${0.4 * (1 - pulse01)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.rotate(dir + Math.PI / 2);
  const S = r * 3;
  stamp(ctx, sprite('player', S, paintPlayerArrow()), 0, 0, S);
  ctx.restore();
}

/** A fellow's identity ink — the tint their undressed rig would wear. */
export function partyColor(name: string): string {
  return PLAYER_COLORS[hashString(name) % PLAYER_COLORS.length]!;
}

/**
 * A party member: a kin-dot in their identity color. Round where the
 * reader's own token is an arrow — kin are companions, not headings —
 * in the same shader-ringed dialect on parchment and glass alike.
 */
export function drawPartyToken(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
): void {
  const S = r * 2.9;
  stamp(ctx, sprite(`party:${color}`, S, paintPartyDot(color)), x, y, S);
}

/**
 * THE EDGE POINTER — when a mark the reader cares about (their own
 * body, the flag, the fall) sits off the folded chart, a solid
 * chevron rides the chart's edge aimed along the bearing, so nothing
 * personal is ever simply lost. Returns the clamped anchor so callers
 * can set a word beside it.
 */
export function drawEdgePointer(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  x: number,
  y: number,
  color: string,
  label?: string,
): void {
  const inset = 26;
  const px = Math.min(cw - inset, Math.max(inset, x));
  const py = Math.min(ch - inset, Math.max(inset, y));
  const ang = Math.atan2(y - py, x - px);
  const S = 30;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(ang);
  stamp(ctx, sprite(`chev:${color}`, S, paintChevron(color)), 0, 0, S);
  ctx.restore();
  if (label) {
    // The word steps inward off the chevron, never off the sheet.
    const lx = px - Math.cos(ang) * 26;
    const ly = py - Math.sin(ang) * 20 + 14;
    drawMapLabel(ctx, lx, ly, label, '#ece4d0', 11);
  }
}

/**
 * THE COMPASS ROSE — north is up, said out loud. A quiet bone-and-
 * brass star in the chart's corner; the N is set at draw time (text
 * does not survive the unit-box bake).
 */
export function drawCompassRose(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const S = r * 2;
  const rose: Painter = (c) => {
    // Long cardinal points, each folded lit/deep down the spine.
    const pts: Array<[number, number]> = [[0.5, 0.04], [0.96, 0.5], [0.5, 0.96], [0.04, 0.5]];
    for (let i = 0; i < 4; i++) {
      const [tx, ty] = pts[i]!;
      const dx = ty === 0.5 ? 0 : 0.09;
      const dy = tx === 0.5 ? 0 : 0.09;
      poly(c, [[tx, ty], [0.5 - dx, 0.5 - dy], [0.5, 0.5]], i === 0 ? BONE : BRASS);
      poly(c, [[tx, ty], [0.5 + dx, 0.5 + dy], [0.5, 0.5]], i === 0 ? BONE_DEEP : BRASS_DEEP);
    }
    // Short intercardinals under them.
    const diag: Array<[number, number]> = [[0.79, 0.21], [0.79, 0.79], [0.21, 0.79], [0.21, 0.21]];
    for (const [tx, ty] of diag) poly(c, [[tx, ty], [0.5, 0.42], [0.42, 0.5], [0.5, 0.58], [0.58, 0.5]], BRASS_DEEP);
    c.fillStyle = GOLD;
    c.beginPath();
    c.arc(0.5, 0.5, 0.07, 0, Math.PI * 2);
    c.fill();
  };
  stamp(ctx, sprite('rose', S, rose), x, y, S);
  ctx.save();
  ctx.font = `700 ${Math.round(r * 0.62)}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.strokeText('N', x, y - r - 3);
  ctx.fillStyle = BONE;
  ctx.fillText('N', x, y - r - 3);
  ctx.restore();
}

/**
 * THE SCALE BAR — how far is that, in tiles (a tile is a stride).
 * Picks a round count that lands the bar near a hand's width.
 */
export function drawScaleBar(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  const NICE = [5, 10, 25, 50, 100, 250, 500, 1000];
  let tiles = NICE[NICE.length - 1]!;
  for (const n of NICE) {
    if (n * scale >= 64) {
      tiles = n;
      break;
    }
  }
  const w = tiles * scale;
  if (w > 260) return; // absurd zoom — the bar would lie off the sheet
  const h = 7;
  ctx.save();
  ctx.fillStyle = 'rgba(16, 13, 24, 0.72)';
  ctx.beginPath();
  ctx.roundRect(x - 6, y - 22, w + 12, 30, 4);
  ctx.fill();
  // Two alternating spans, bone on ink — the surveyor's chain.
  ctx.fillStyle = INK;
  ctx.fillRect(x, y - h, w, h);
  ctx.fillStyle = BONE;
  ctx.fillRect(x + 1, y - h + 1, w / 2 - 1, h - 2);
  ctx.fillStyle = BONE_DEEP;
  ctx.fillRect(x + w / 2, y - h + 1, w / 2 - 1, h - 2);
  ctx.font = `10.5px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#ece4d0';
  ctx.fillText(`${tiles} tiles`, x, y - h - 2);
  ctx.restore();
}

/**
 * THE SEARCH RING — an errand's "somewhere hereabouts". A soft gold
 * wash inside a slowly walking dashed rim, breathing one quiet beacon
 * ring: deliberately loose, because the ring promises a neighborhood,
 * never a spot. `quiet` mutes it for the traveler's glass.
 */
export function drawSearchRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rPx: number,
  pulse01: number,
  quiet = false,
): void {
  ctx.save();
  ctx.translate(x, y);
  const a = quiet ? 0.55 : 1;
  // The wash: barely there at the heart, gathering toward the rim.
  const g = ctx.createRadialGradient(0, 0, rPx * 0.2, 0, 0, rPx);
  g.addColorStop(0, `rgba(242, 201, 76, ${0.05 * a})`);
  g.addColorStop(0.8, `rgba(242, 201, 76, ${0.11 * a})`);
  g.addColorStop(1, `rgba(242, 201, 76, ${0.02 * a})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rPx, 0, Math.PI * 2);
  ctx.fill();
  // A dark hairline seats the gold rim on pale ground.
  ctx.beginPath();
  ctx.arc(0, 0, rPx + (quiet ? 1.25 : 2), 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(12, 9, 5, ${0.35 * a})`;
  ctx.lineWidth = 1;
  ctx.stroke();
  // The rim: the cartographer's dashed compass stroke, slowly walking.
  ctx.beginPath();
  ctx.arc(0, 0, rPx, 0, Math.PI * 2);
  ctx.setLineDash([9, 7]);
  ctx.lineDashOffset = -pulse01 * 16;
  ctx.strokeStyle = `rgba(242, 201, 76, ${0.75 * a})`;
  ctx.lineWidth = quiet ? 1.25 : 2;
  ctx.stroke();
  ctx.setLineDash([]);
  // The breath: one soft ring sighing outward, the beacon's gold kin.
  ctx.beginPath();
  ctx.arc(0, 0, rPx * (1 + pulse01 * 0.16), 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(242, 201, 76, ${0.3 * (1 - pulse01) * a})`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/** A serif nameplate on a dark eased plate — the cartographer's hand. */
export function drawMapLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color = '#ece4d0',
  size = 12,
): void {
  ctx.font = `${size}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const w = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(16, 13, 24, 0.78)';
  ctx.beginPath();
  ctx.roundRect(x - w / 2 - 6, y - size - 5, w + 12, size + 8, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(236, 228, 208, 0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** The waypoint's sky ink and the fall's ember — shared with the HUD. */
export const WAYPOINT_INK = SKY;
export const DEATH_INK = EMBER;
export const PLAYER_INK = GOLD;
