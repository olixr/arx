import type { DiscoveryWire } from '@arx/shared';

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
