import { hashString } from '@arx/shared';
import type { DiscoveryWire } from '@arx/shared';
import { PLAYER_COLORS } from '../../render/renderer.js';

/**
 * MAP SIGILS — the place ledger's marks, drawn in the dock-glyph
 * dialect: thin monoline strokes in muted brass ink with one soft
 * under-shade pass. NO emoji, NO icon fonts (the studio law). Faded
 * markers are rumors: desaturated ink at reduced presence.
 */

const INK = '#d8c08c';
const INK_FADED = '#9a8f78';
const SHADE = 'rgba(12, 9, 5, 0.55)';

function stroke(ctx: CanvasRenderingContext2D, ink: string, r: number, draw: () => void): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.2, r * 0.16);
  // Under-shade first, then the ink on top — one soft pass, no ring.
  ctx.save();
  ctx.translate(r * 0.06, r * 0.09);
  ctx.strokeStyle = SHADE;
  draw();
  ctx.restore();
  ctx.strokeStyle = ink;
  draw();
}

/** A keep: gabled tower with a doorway — towns and havens. */
function drawTown(ctx: CanvasRenderingContext2D, r: number, ink: string): void {
  stroke(ctx, ink, r, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, r * 0.8);
    ctx.lineTo(-r * 0.7, -r * 0.25);
    ctx.lineTo(0, -r * 0.95);
    ctx.lineTo(r * 0.7, -r * 0.25);
    ctx.lineTo(r * 0.7, r * 0.8);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.22, r * 0.8);
    ctx.lineTo(-r * 0.22, r * 0.1);
    ctx.arc(0, r * 0.1, r * 0.22, Math.PI, 0);
    ctx.lineTo(r * 0.22, r * 0.8);
    ctx.stroke();
  });
}

/** A pennant on a pole — frontier sites. */
function drawPoi(ctx: CanvasRenderingContext2D, r: number, ink: string): void {
  stroke(ctx, ink, r, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, r * 0.9);
    ctx.lineTo(-r * 0.35, -r * 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, -r * 0.9);
    ctx.lineTo(r * 0.75, -r * 0.55);
    ctx.lineTo(-r * 0.35, -r * 0.2);
    ctx.closePath();
    ctx.stroke();
  });
}

/** An arched gate over a descending stair — riftgates delved. */
function drawDungeon(ctx: CanvasRenderingContext2D, r: number, ink: string): void {
  stroke(ctx, ink, r, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, r * 0.75);
    ctx.lineTo(-r * 0.75, -r * 0.1);
    ctx.arc(0, -r * 0.1, r * 0.75, Math.PI, 0);
    ctx.lineTo(r * 0.75, r * 0.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, r * 0.75);
    ctx.lineTo(-r * 0.4, r * 0.3);
    ctx.lineTo(0, r * 0.3);
    ctx.lineTo(0, -r * 0.1);
    ctx.lineTo(r * 0.4, -r * 0.1);
    ctx.lineTo(r * 0.4, r * 0.75);
    ctx.stroke();
  });
}

/** A standing stone — named landmarks (future geography names). */
function drawLandmark(ctx: CanvasRenderingContext2D, r: number, ink: string): void {
  stroke(ctx, ink, r, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, r * 0.85);
    ctx.lineTo(-r * 0.55, -r * 0.35);
    ctx.lineTo(-r * 0.1, -r * 0.9);
    ctx.lineTo(r * 0.5, -r * 0.5);
    ctx.lineTo(r * 0.45, r * 0.85);
    ctx.closePath();
    ctx.stroke();
  });
}

/** One ledger mark at screen (x, y); r is the sigil half-size in px. */
export function drawDiscoveryMarker(
  ctx: CanvasRenderingContext2D,
  d: DiscoveryWire,
  x: number,
  y: number,
  r: number,
  hot = false,
): void {
  const ink = d.faded ? INK_FADED : INK;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = d.faded ? 0.55 : 1;
  if (hot) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(242, 201, 76, 0.9)';
    ctx.lineWidth = 1.5;
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
  switch (d.kind) {
    case 'town':
      drawTown(ctx, r, ink);
      break;
    case 'poi':
      drawPoi(ctx, r, ink);
      break;
    case 'dungeon':
      drawDungeon(ctx, r, ink);
      break;
    case 'landmark':
      drawLandmark(ctx, r, ink);
      break;
  }
  // THE STAGE PIPS (the boldness ladder): one monoline tick under the
  // sigil per rung — the chart says "bolder than when you found it"
  // at a glance, in the same one-ink dialect as the sigils. Rumor
  // markers drop them: a faded marker's stage is itself a rumor.
  if (!d.faded && d.stage !== undefined && d.stage > 0) {
    const n = Math.min(d.stage, 3);
    const w = r * 0.42;
    const py = r * 1.25;
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1.1, r * 0.16);
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const px = (i - (n - 1) / 2) * w;
      ctx.beginPath();
      ctx.moveTo(px - w * 0.28, py);
      ctx.lineTo(px + w * 0.28, py);
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
  const pr = r * (0.9 + pulse01 * 1.4);
  ctx.beginPath();
  ctx.arc(0, 0, pr, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(126, 200, 227, ${0.55 * (1 - pulse01)})`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.4, r * 0.2);
  ctx.strokeStyle = 'rgba(12, 9, 5, 0.6)';
  ctx.beginPath();
  ctx.moveTo(1, 1);
  ctx.lineTo(1, -r * 1.7 + 1);
  ctx.stroke();
  ctx.strokeStyle = '#7ec8e3';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -r * 1.7);
  ctx.stroke();
  ctx.fillStyle = '#7ec8e3';
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.7);
  ctx.lineTo(r * 1.05, -r * 1.25);
  ctx.lineTo(0, -r * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Where the reader last fell: a little bone-ink skull over the spilled
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
  ctx.strokeStyle = `rgba(217, 108, 79, ${0.5 * (1 - pulse01)})`;
  ctx.lineWidth = 2;
  ctx.stroke();
  const bone = '#e6ddc8';
  const skull = (ink: string) => {
    // Cranium: a broad dome dying into two jaw shoulders.
    ctx.beginPath();
    ctx.moveTo(-r * 0.62, r * 0.2);
    ctx.quadraticCurveTo(-r * 0.72, -r * 0.75, 0, -r * 0.82);
    ctx.quadraticCurveTo(r * 0.72, -r * 0.75, r * 0.62, r * 0.2);
    ctx.lineTo(r * 0.36, r * 0.42);
    ctx.lineTo(r * 0.36, r * 0.72);
    ctx.lineTo(-r * 0.36, r * 0.72);
    ctx.lineTo(-r * 0.36, r * 0.42);
    ctx.closePath();
    ctx.lineWidth = Math.max(1.2, r * 0.18);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = ink;
    ctx.stroke();
  };
  // Under-shade pass, then the bone ink (the sigil dialect).
  ctx.save();
  ctx.translate(r * 0.07, r * 0.1);
  skull(SHADE);
  ctx.restore();
  skull(bone);
  // Sockets and the nose notch, filled so they read at glass scale.
  ctx.fillStyle = bone;
  ctx.beginPath();
  ctx.arc(-r * 0.27, -r * 0.12, r * 0.17, 0, Math.PI * 2);
  ctx.arc(r * 0.27, -r * 0.12, r * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, r * 0.14);
  ctx.lineTo(-r * 0.1, r * 0.34);
  ctx.lineTo(r * 0.1, r * 0.34);
  ctx.closePath();
  ctx.fill();
  // Two tooth ticks on the jaw.
  ctx.strokeStyle = bone;
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  ctx.moveTo(-r * 0.12, r * 0.5);
  ctx.lineTo(-r * 0.12, r * 0.7);
  ctx.moveTo(r * 0.12, r * 0.5);
  ctx.lineTo(r * 0.12, r * 0.7);
  ctx.stroke();
  ctx.restore();
}

/** The reader's own body: a gold compass-arrow token at their heading. */
export function drawPlayerToken(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  dir: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(dir + Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.25);
  ctx.lineTo(r * 0.85, r);
  ctx.lineTo(0, r * 0.45);
  ctx.lineTo(-r * 0.85, r);
  ctx.closePath();
  ctx.fillStyle = '#f2c94c';
  ctx.fill();
  ctx.strokeStyle = '#241a2e';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

/** A fellow's identity ink — the tint their undressed rig would wear. */
export function partyColor(name: string): string {
  return PLAYER_COLORS[hashString(name) % PLAYER_COLORS.length]!;
}

/**
 * A party member: a kin-dot in their identity color. Round where the
 * reader's own token is an arrow — kin are companions, not headings —
 * with the same dark rim and one soft under-shade so it sits in the
 * sigil dialect on parchment and glass alike.
 */
export function drawPartyToken(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  // Under-shade pass, then the dot.
  ctx.beginPath();
  ctx.arc(r * 0.08, r * 0.12, r, 0, Math.PI * 2);
  ctx.fillStyle = SHADE;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#241a2e';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // A pale keystone dot so the mark reads at glass scale.
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(1, r * 0.3), 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(236, 228, 208, 0.85)';
  ctx.fill();
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

/** A serif nameplate over dark backing — the cartographer's hand. */
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
  ctx.fillStyle = 'rgba(16, 13, 24, 0.72)';
  ctx.fillRect(x - w / 2 - 5, y - size - 4, w + 10, size + 6);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
