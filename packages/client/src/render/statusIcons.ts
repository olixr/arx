/**
 * THE ICON IS THE PAINTER, FOR STATES TOO (statusBook Phase 4).
 * Twelve status glyphs, one per page, each ONE SUBJECT in the page's
 * own ink (STATUS_INK — which derives from the book, so a page's
 * color and its glyph can never drift apart). Painters draw DIRECT
 * into a live 2D context inside a (x, y, size) box — the wound row
 * and any canvas HUD read them per-frame with no async image round
 * trip — and `statusIconUrl` bakes the same painter through the
 * shared outlined-sprite pipeline for DOM surfaces (chips, tooltips,
 * the codex) the day they ask.
 *
 * Grammar (THE PLATE LAW at thumbnail scale): hard edges, solid
 * masses over wire, a single dominant silhouette per glyph, the ink
 * at full alpha with one darker facet tone — readable at 12 px, the
 * wound row's floor.
 */

import { STATUS_BOOK, type StatusId } from '@arx/shared';
import { STATUS_INK } from './statusFx.js';
import { paintedIconUrl } from './icons.js';

type Ctx = CanvasRenderingContext2D;

/** Darken a #rrggbb hex toward the facet tone. */
function facet(hex: string, f = 0.62): string {
  const r = Math.round(Number.parseInt(hex.slice(1, 3), 16) * f);
  const g = Math.round(Number.parseInt(hex.slice(3, 5), 16) * f);
  const b = Math.round(Number.parseInt(hex.slice(5, 7), 16) * f);
  return `rgb(${r}, ${g}, ${b})`;
}

/** One glyph painter: draws inside the (x, y, s) box, s = side. */
export type StatusGlyph = (ctx: Ctx, x: number, y: number, s: number) => void;

const ink = (id: StatusId): string => STATUS_INK[id]!;

export const STATUS_GLYPHS: Readonly<Record<StatusId, StatusGlyph>> = {
  burn: (c, x, y, s) => {
    // One flame: the outer tongue in ink, the heart darker.
    c.fillStyle = ink('burn');
    c.beginPath();
    c.moveTo(x + s * 0.5, y + s * 0.04);
    c.quadraticCurveTo(x + s * 0.92, y + s * 0.52, x + s * 0.68, y + s * 0.86);
    c.quadraticCurveTo(x + s * 0.5, y + s * 0.98, x + s * 0.32, y + s * 0.86);
    c.quadraticCurveTo(x + s * 0.08, y + s * 0.52, x + s * 0.5, y + s * 0.04);
    c.fill();
    c.fillStyle = facet(ink('burn'));
    c.beginPath();
    c.moveTo(x + s * 0.5, y + s * 0.38);
    c.quadraticCurveTo(x + s * 0.68, y + s * 0.66, x + s * 0.5, y + s * 0.86);
    c.quadraticCurveTo(x + s * 0.32, y + s * 0.66, x + s * 0.5, y + s * 0.38);
    c.fill();
  },
  chill: (c, x, y, s) => {
    // The six-armed flake: three crossing bars, a core glint.
    c.strokeStyle = ink('chill');
    c.lineWidth = Math.max(1.5, s * 0.14);
    c.lineCap = 'round';
    const cx = x + s * 0.5;
    const cy = y + s * 0.5;
    const r = s * 0.42;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      c.beginPath();
      c.moveTo(cx - Math.cos(a) * r, cy - Math.sin(a) * r);
      c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      c.stroke();
    }
    c.fillStyle = '#ffffff';
    c.fillRect(cx - s * 0.08, cy - s * 0.08, s * 0.16, s * 0.16);
  },
  shock: (c, x, y, s) => {
    // One bolt, solid.
    c.fillStyle = ink('shock');
    c.beginPath();
    c.moveTo(x + s * 0.62, y + s * 0.02);
    c.lineTo(x + s * 0.24, y + s * 0.56);
    c.lineTo(x + s * 0.47, y + s * 0.56);
    c.lineTo(x + s * 0.38, y + s * 0.98);
    c.lineTo(x + s * 0.78, y + s * 0.42);
    c.lineTo(x + s * 0.54, y + s * 0.42);
    c.closePath();
    c.fill();
  },
  bleed: (c, x, y, s) => {
    // One falling drop, a darker meniscus at its base.
    c.fillStyle = ink('bleed');
    c.beginPath();
    c.moveTo(x + s * 0.5, y + s * 0.04);
    c.quadraticCurveTo(x + s * 0.86, y + s * 0.55, x + s * 0.5, y + s * 0.94);
    c.quadraticCurveTo(x + s * 0.14, y + s * 0.55, x + s * 0.5, y + s * 0.04);
    c.fill();
    c.fillStyle = facet(ink('bleed'));
    c.beginPath();
    c.ellipse(x + s * 0.5, y + s * 0.74, s * 0.2, s * 0.13, 0, 0, Math.PI * 2);
    c.fill();
  },
  venom: (c, x, y, s) => {
    // The beading poison: one fat bleb rising off a pooled base.
    c.fillStyle = facet(ink('venom'));
    c.beginPath();
    c.ellipse(x + s * 0.5, y + s * 0.82, s * 0.36, s * 0.14, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = ink('venom');
    c.beginPath();
    c.arc(x + s * 0.42, y + s * 0.42, s * 0.24, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(x + s * 0.7, y + s * 0.24, s * 0.12, 0, Math.PI * 2);
    c.fill();
  },
  sunder: (c, x, y, s) => {
    // The cracked plate: a solid square split by one dark fissure.
    c.fillStyle = ink('sunder');
    c.fillRect(x + s * 0.14, y + s * 0.14, s * 0.72, s * 0.72);
    c.strokeStyle = 'rgba(24, 14, 32, 0.9)';
    c.lineWidth = Math.max(1.5, s * 0.1);
    c.lineCap = 'butt';
    c.beginPath();
    c.moveTo(x + s * 0.34, y + s * 0.12);
    c.lineTo(x + s * 0.52, y + s * 0.46);
    c.lineTo(x + s * 0.4, y + s * 0.62);
    c.lineTo(x + s * 0.6, y + s * 0.9);
    c.stroke();
  },
  root: (c, x, y, s) => {
    // The gripping earth: three ground spikes closing on the ankle.
    c.fillStyle = ink('root');
    const base = y + s * 0.95;
    const spikes: Array<[number, number, number]> = [
      [0.18, 0.42, 0.3],
      [0.42, 0.62, 0.08],
      [0.66, 0.9, 0.34],
    ];
    for (const [x0, x1, topT] of spikes) {
      c.beginPath();
      c.moveTo(x + s * x0, base);
      c.lineTo(x + s * ((x0 + x1) / 2), y + s * topT);
      c.lineTo(x + s * x1, base);
      c.closePath();
      c.fill();
    }
    c.fillStyle = facet(ink('root'));
    c.fillRect(x + s * 0.1, base - s * 0.06, s * 0.8, s * 0.06);
  },
  stagger: (c, x, y, s) => {
    // The rung bell: three stars arcing over a tilted crown line.
    c.fillStyle = ink('stagger');
    const star = (px: number, py: number, r: number): void => {
      c.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const rr = i % 2 === 0 ? r : r * 0.42;
        c.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr);
      }
      c.closePath();
      c.fill();
    };
    star(x + s * 0.22, y + s * 0.4, s * 0.14);
    star(x + s * 0.52, y + s * 0.2, s * 0.18);
    star(x + s * 0.8, y + s * 0.44, s * 0.12);
    c.strokeStyle = facet(ink('stagger'), 0.75);
    c.lineWidth = Math.max(1.5, s * 0.1);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x + s * 0.18, y + s * 0.82);
    c.lineTo(x + s * 0.82, y + s * 0.7);
    c.stroke();
  },
  weaken: (c, x, y, s) => {
    // The drained arm: two chevrons sinking.
    c.strokeStyle = ink('weaken');
    c.lineWidth = Math.max(2, s * 0.16);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (const t of [0.3, 0.62]) {
      c.beginPath();
      c.moveTo(x + s * 0.2, y + s * t);
      c.lineTo(x + s * 0.5, y + s * (t + 0.24));
      c.lineTo(x + s * 0.8, y + s * t);
      c.stroke();
    }
  },
  quicken: (c, x, y, s) => {
    // The quickened hand: two chevrons driving forward.
    c.strokeStyle = ink('quicken');
    c.lineWidth = Math.max(2, s * 0.16);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (const t of [0.26, 0.58]) {
      c.beginPath();
      c.moveTo(x + s * t, y + s * 0.2);
      c.lineTo(x + s * (t + 0.24), y + s * 0.5);
      c.lineTo(x + s * t, y + s * 0.8);
      c.stroke();
    }
  },
  mend: (c, x, y, s) => {
    // The closing wound: one solid cross.
    c.fillStyle = ink('mend');
    const w = s * 0.28;
    c.fillRect(x + s * 0.5 - w / 2, y + s * 0.1, w, s * 0.8);
    c.fillRect(x + s * 0.1, y + s * 0.5 - w / 2, s * 0.8, w);
    c.fillStyle = facet(ink('mend'));
    c.fillRect(x + s * 0.5 - w / 2, y + s * 0.5 - w / 2, w, w);
  },
  stonehide: (c, x, y, s) => {
    // The worn coat: one faceted hex plate.
    c.fillStyle = ink('stonehide');
    const cx = x + s * 0.5;
    const cy = y + s * 0.5;
    const r = s * 0.44;
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    c.closePath();
    c.fill();
    c.fillStyle = facet(ink('stonehide'));
    c.beginPath();
    c.moveTo(cx, cy - r);
    c.lineTo(cx + r * 0.87, cy - r * 0.5);
    c.lineTo(cx, cy);
    c.closePath();
    c.fill();
  },
};

/**
 * Draw one status glyph into a live context, plate-and-ink: the dark
 * inset plate the nameplate blocks already wear, then the glyph.
 */
export function drawStatusGlyph(ctx: Ctx, id: StatusId, x: number, y: number, size: number): void {
  ctx.fillStyle = 'rgba(24, 14, 32, 0.88)';
  ctx.fillRect(x - 2, y - 2, size + 4, size + 4);
  STATUS_GLYPHS[id](ctx, x, y, size);
}

/**
 * The DOM door: the same painter baked through the shared outlined
 * sprite pipeline (chips, tooltips, codex). Painters take the 0..1
 * unit box the pipeline expects.
 */
export function statusIconUrl(id: StatusId, size = 24): string {
  return paintedIconUrl(
    `status:${id}`,
    (c) => STATUS_GLYPHS[id](c, 0.08, 0.08, 0.84),
    STATUS_BOOK[id].visuals.ink,
    size,
  );
}
