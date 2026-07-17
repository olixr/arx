import { itemDef } from '@devcraft/content';
import { shade } from './rig.js';

/**
 * The icon set: every item and UI glyph is drawn in code on a unit
 * canvas — flat shapes, dark outline, one hard drop shadow. Rendered
 * once per (icon, size) and cached as data URLs for the DOM.
 */

const OUTLINE = '#241a2e';
const SHADOW = 'rgba(20, 12, 8, 0.45)';

type IconPainter = (ctx: CanvasRenderingContext2D, color: string) => void;

/** All painters draw inside a 0..1 unit box. */
const PAINTERS: Record<string, IconPainter> = {
  sword: (c, col) => {
    c.translate(0.5, 0.5);
    c.rotate(-Math.PI / 4);
    poly(c, col, [[-0.22, -0.05], [0.26, -0.05], [0.38, 0], [0.26, 0.05], [-0.22, 0.05]]);
    c.fillStyle = shade(col, 34);
    c.fillRect(-0.2, -0.04, 0.44, 0.035);
    bar(c, '#6b4a26', -0.27, -0.13, 0.055, 0.26);
    dot(c, '#d9a441', -0.34, 0, 0.05);
  },
  axe: (c, col) => {
    c.translate(0.5, 0.5);
    c.rotate(-Math.PI / 4);
    bar(c, '#8a6a45', -0.34, -0.035, 0.6, 0.07);
    poly(c, col, [[0.14, -0.2], [0.4, -0.1], [0.38, 0.14], [0.14, 0.1]]);
  },
  pickaxe: (c, col) => {
    c.translate(0.5, 0.5);
    c.rotate(-Math.PI / 4);
    bar(c, '#8a6a45', -0.34, -0.035, 0.56, 0.07);
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.03;
    c.beginPath();
    c.moveTo(0.18, -0.26);
    c.quadraticCurveTo(0.44, 0, 0.18, 0.26);
    c.quadraticCurveTo(0.28, 0, 0.18, -0.26);
    c.fill();
    c.stroke();
  },
  bow: (c, col) => {
    c.strokeStyle = col;
    c.lineWidth = 0.07;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(0.36, 0.5, 0.34, -Math.PI / 2.4, Math.PI / 2.4);
    c.stroke();
    c.strokeStyle = '#e6e0d0';
    c.lineWidth = 0.028;
    const ty = Math.sin(Math.PI / 2.4) * 0.34;
    c.beginPath();
    c.moveTo(0.36 + Math.cos(Math.PI / 2.4) * 0.34, 0.5 - ty);
    c.lineTo(0.3, 0.5);
    c.lineTo(0.36 + Math.cos(Math.PI / 2.4) * 0.34, 0.5 + ty);
    c.stroke();
    c.strokeStyle = '#c4b590';
    c.lineWidth = 0.04;
    c.beginPath();
    c.moveTo(0.3, 0.5);
    c.lineTo(0.78, 0.5);
    c.stroke();
    c.lineCap = 'butt';
  },
  arrow: (c, col) => {
    c.translate(0.5, 0.5);
    c.rotate(-Math.PI / 4);
    c.strokeStyle = col;
    c.lineWidth = 0.05;
    c.beginPath();
    c.moveTo(-0.24, 0);
    c.lineTo(0.24, 0);
    c.stroke();
    poly(c, '#9aa2ac', [[0.24, -0.08], [0.42, 0], [0.24, 0.08]]);
    poly(c, '#e6e0d0', [[-0.38, -0.09], [-0.22, 0], [-0.38, 0.09], [-0.3, 0]]);
  },
  staff: (c, col) => {
    c.translate(0.5, 0.5);
    c.rotate(-Math.PI / 4);
    bar(c, '#5b4632', -0.36, -0.035, 0.58, 0.07);
    dot(c, col, 0.3, 0, 0.12);
    dot(c, '#efe3ff', 0.27, -0.03, 0.04);
  },
  rod: (c, col) => {
    c.strokeStyle = col;
    c.lineWidth = 0.06;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0.14, 0.86);
    c.quadraticCurveTo(0.5, 0.1, 0.82, 0.2);
    c.stroke();
    c.strokeStyle = '#dcd6c4';
    c.lineWidth = 0.024;
    c.beginPath();
    c.moveTo(0.82, 0.2);
    c.lineTo(0.78, 0.62);
    c.stroke();
    c.lineCap = 'butt';
    dot(c, '#9aa2ac', 0.78, 0.66, 0.045);
  },
  log: (c, col) => {
    c.save();
    c.translate(0.5, 0.52);
    c.rotate(-0.35);
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.roundRect(-0.36, -0.16, 0.72, 0.32, 0.1);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 40);
    c.beginPath();
    c.ellipse(0.3, 0, 0.09, 0.15, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.strokeStyle = shade(col, -30);
    c.lineWidth = 0.025;
    c.beginPath();
    c.arc(0.3, 0, 0.05, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  },
  ore: (c, col) => {
    poly(c, '#7d7887', [[0.2, 0.75], [0.14, 0.5], [0.32, 0.3], [0.62, 0.26], [0.84, 0.48], [0.76, 0.75]]);
    poly(c, '#928d99', [[0.32, 0.3], [0.62, 0.26], [0.7, 0.42], [0.4, 0.48]]);
    poly(c, col, [[0.36, 0.62], [0.44, 0.48], [0.54, 0.6]]);
    poly(c, shade(col, 26), [[0.56, 0.5], [0.64, 0.4], [0.7, 0.54]]);
  },
  bar: (c, col) => {
    poly(c, col, [[0.2, 0.62], [0.3, 0.42], [0.74, 0.42], [0.84, 0.62]]);
    c.fillStyle = shade(col, 30);
    poly(c, shade(col, 30), [[0.3, 0.42], [0.74, 0.42], [0.7, 0.48], [0.34, 0.48]]);
  },
  fish: (c, col) => {
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.ellipse(0.44, 0.5, 0.28, 0.16, -0.15, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    poly(c, col, [[0.66, 0.44], [0.88, 0.3], [0.84, 0.52], [0.88, 0.72], [0.66, 0.56]]);
    dot(c, OUTLINE, 0.26, 0.46, 0.035);
    c.fillStyle = shade(col, 24);
    c.beginPath();
    c.ellipse(0.42, 0.42, 0.16, 0.06, -0.2, 0, Math.PI * 2);
    c.fill();
  },
  meat: (c, col) => {
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.ellipse(0.42, 0.44, 0.24, 0.19, -0.5, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.strokeStyle = '#efe8d8';
    c.lineWidth = 0.07;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0.58, 0.6);
    c.lineTo(0.76, 0.78);
    c.stroke();
    c.lineCap = 'butt';
    dot(c, '#efe8d8', 0.8, 0.82, 0.06);
    c.fillStyle = shade(col, 22);
    c.beginPath();
    c.ellipse(0.38, 0.38, 0.12, 0.08, -0.5, 0, Math.PI * 2);
    c.fill();
  },
  bones: (c, col) => {
    c.strokeStyle = col;
    c.lineWidth = 0.08;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0.26, 0.3);
    c.lineTo(0.72, 0.72);
    c.stroke();
    for (const [x, y] of [[0.24, 0.24], [0.32, 0.34], [0.68, 0.66], [0.76, 0.76]] as const) {
      dot(c, col, x, y, 0.07);
    }
    c.lineCap = 'butt';
  },
  feather: (c, col) => {
    c.save();
    c.translate(0.5, 0.5);
    c.rotate(0.6);
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.03;
    c.beginPath();
    c.moveTo(0, -0.38);
    c.quadraticCurveTo(0.22, -0.1, 0.03, 0.3);
    c.lineTo(-0.03, 0.3);
    c.quadraticCurveTo(-0.22, -0.1, 0, -0.38);
    c.fill();
    c.stroke();
    c.strokeStyle = shade(col, -40);
    c.lineWidth = 0.02;
    c.beginPath();
    c.moveTo(0, -0.34);
    c.lineTo(0, 0.38);
    c.stroke();
    c.restore();
  },
  hide: (c, col) => {
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.5, 0.16);
    c.quadraticCurveTo(0.84, 0.2, 0.78, 0.5);
    c.quadraticCurveTo(0.8, 0.8, 0.5, 0.84);
    c.quadraticCurveTo(0.2, 0.8, 0.22, 0.5);
    c.quadraticCurveTo(0.16, 0.2, 0.5, 0.16);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 18);
    c.beginPath();
    c.ellipse(0.44, 0.42, 0.14, 0.1, 0.3, 0, Math.PI * 2);
    c.fill();
  },
  armor: (c, col) => {
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.28, 0.2);
    c.lineTo(0.72, 0.2);
    c.lineTo(0.8, 0.36);
    c.lineTo(0.72, 0.5);
    c.lineTo(0.72, 0.78);
    c.quadraticCurveTo(0.5, 0.88, 0.28, 0.78);
    c.lineTo(0.28, 0.5);
    c.lineTo(0.2, 0.36);
    c.closePath();
    c.fill();
    c.stroke();
    c.strokeStyle = shade(col, -35);
    c.lineWidth = 0.025;
    c.beginPath();
    c.moveTo(0.5, 0.24);
    c.lineTo(0.5, 0.8);
    c.stroke();
  },
  coins: (c, col) => {
    for (const [x, y] of [[0.38, 0.66], [0.62, 0.66], [0.5, 0.48]] as const) {
      c.fillStyle = col;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 0.03;
      c.beginPath();
      c.ellipse(x, y, 0.17, 0.12, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.strokeStyle = shade(col, -40);
      c.lineWidth = 0.02;
      c.beginPath();
      c.ellipse(x, y, 0.1, 0.06, 0, 0, Math.PI * 2);
      c.stroke();
    }
  },
  burnt: (c, col) => {
    poly(c, col, [[0.26, 0.72], [0.2, 0.5], [0.38, 0.32], [0.66, 0.3], [0.8, 0.52], [0.7, 0.72]]);
    c.fillStyle = '#66606e';
    dot(c, '#66606e', 0.4, 0.46, 0.04);
    dot(c, '#66606e', 0.58, 0.54, 0.03);
  },
  // ------------------------------------------------------- UI glyphs
  backpack: (c, col) => {
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.04;
    c.beginPath();
    c.roundRect(0.22, 0.28, 0.56, 0.52, 0.12);
    c.fill();
    c.stroke();
    c.strokeStyle = shade(col, -40);
    c.lineWidth = 0.05;
    c.beginPath();
    c.arc(0.5, 0.32, 0.16, Math.PI, 0);
    c.stroke();
    c.fillStyle = shade(col, 26);
    c.beginPath();
    c.roundRect(0.34, 0.52, 0.32, 0.2, 0.06);
    c.fill();
    dot(c, '#d9a441', 0.5, 0.52, 0.045);
  },
  scroll: (c, col) => {
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.roundRect(0.26, 0.18, 0.48, 0.64, 0.05);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, -30);
    c.beginPath();
    c.roundRect(0.2, 0.14, 0.6, 0.1, 0.05);
    c.fill();
    c.stroke();
    c.beginPath();
    c.roundRect(0.2, 0.76, 0.6, 0.1, 0.05);
    c.fill();
    c.stroke();
    c.strokeStyle = shade(col, -45);
    c.lineWidth = 0.025;
    for (const y of [0.36, 0.48, 0.6]) {
      c.beginPath();
      c.moveTo(0.34, y);
      c.lineTo(0.66, y);
      c.stroke();
    }
  },
  hammer: (c, col) => {
    c.translate(0.5, 0.55);
    c.rotate(-Math.PI / 5);
    bar(c, '#8a6a45', -0.32, -0.03, 0.5, 0.06);
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.roundRect(0.14, -0.15, 0.24, 0.3, 0.05);
    c.fill();
    c.stroke();
  },
  house: (c, col) => {
    poly(c, shade(col, -20), [[0.16, 0.46], [0.5, 0.16], [0.84, 0.46]]);
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.rect(0.26, 0.46, 0.48, 0.36);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, -38);
    c.beginPath();
    c.roundRect(0.44, 0.58, 0.14, 0.24, 0.04);
    c.fill();
  },
  attack: (c, col) => {
    // Crossed swords.
    for (const flip of [1, -1]) {
      c.save();
      c.translate(0.5, 0.5);
      c.rotate((Math.PI / 4) * flip);
      poly(c, col, [[-0.3, -0.045], [0.26, -0.045], [0.36, 0], [0.26, 0.045], [-0.3, 0.045]]);
      bar(c, '#6b4a26', -0.36, -0.08, 0.05, 0.16);
      c.restore();
    }
  },
};

function poly(c: CanvasRenderingContext2D, color: string, pts: Array<[number, number]>): void {
  c.fillStyle = color;
  c.strokeStyle = OUTLINE;
  c.lineWidth = 0.035;
  c.beginPath();
  c.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i]![0], pts[i]![1]);
  c.closePath();
  c.fill();
  c.stroke();
}

function bar(c: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  c.fillStyle = color;
  c.strokeStyle = OUTLINE;
  c.lineWidth = 0.03;
  c.beginPath();
  c.roundRect(x, y, w, h, Math.min(w, h) * 0.3);
  c.fill();
  c.stroke();
}

function dot(c: CanvasRenderingContext2D, color: string, x: number, y: number, r: number): void {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

/** Which painter + tint an item uses. */
const ITEM_ICON: Record<string, { icon: string; color: string }> = {
  coins: { icon: 'coins', color: '#e8b64c' },
  log: { icon: 'log', color: '#96744c' },
  oak_log: { icon: 'log', color: '#74522f' },
  copper_ore: { icon: 'ore', color: '#c47b3d' },
  tin_ore: { icon: 'ore', color: '#cfd3dc' },
  iron_ore: { icon: 'ore', color: '#aeb4bd' },
  coal: { icon: 'ore', color: '#39343f' },
  gold_ore: { icon: 'ore', color: '#e8b64c' },
  raw_trout: { icon: 'fish', color: '#8fb7d9' },
  trout: { icon: 'fish', color: '#d99a6a' },
  raw_chicken: { icon: 'meat', color: '#ecd3bd' },
  cooked_chicken: { icon: 'meat', color: '#d99a52' },
  raw_beef: { icon: 'meat', color: '#c4645a' },
  cooked_beef: { icon: 'meat', color: '#a05a3a' },
  burnt_food: { icon: 'burnt', color: '#413c4a' },
  bronze_bar: { icon: 'bar', color: '#b0793f' },
  iron_bar: { icon: 'bar', color: '#9aa2ac' },
  steel_bar: { icon: 'bar', color: '#c4cad4' },
  gold_bar: { icon: 'bar', color: '#f2c94c' },
  gold_ring: { icon: 'coins', color: '#f2c94c' },
  leather: { icon: 'hide', color: '#b08a5c' },
  cowhide: { icon: 'hide', color: '#a08468' },
  wolf_fur: { icon: 'hide', color: '#6a6f7d' },
  leather_body: { icon: 'armor', color: '#b08a5c' },
  bones: { icon: 'bones', color: '#efe8d8' },
  feather: { icon: 'feather', color: '#f4efe4' },
  bronze_axe: { icon: 'axe', color: '#b0793f' },
  bronze_pickaxe: { icon: 'pickaxe', color: '#b0793f' },
  fishing_rod: { icon: 'rod', color: '#c4a35a' },
  bronze_sword: { icon: 'sword', color: '#c98d4b' },
  iron_sword: { icon: 'sword', color: '#b6bcc6' },
  steel_sword: { icon: 'sword', color: '#d6dce6' },
  oak_shortbow: { icon: 'bow', color: '#8a6a45' },
  arrow: { icon: 'arrow', color: '#c4b590' },
  apprentice_staff: { icon: 'staff', color: '#9a7ae0' },
};

const cache = new Map<string, string>();

function renderIcon(icon: string, color: string, size: number): string {
  const key = `${icon}|${color}|${size}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const painter = PAINTERS[icon] ?? PAINTERS.burnt!;

  // Draw the art once, derive a solid silhouette, then compose:
  // silhouette offset (the hard drop shadow) + art on top.
  const art = document.createElement('canvas');
  art.width = size;
  art.height = size;
  const actx = art.getContext('2d')!;
  actx.save();
  actx.scale(size, size);
  painter(actx, color);
  actx.restore();

  const sil = document.createElement('canvas');
  sil.width = size;
  sil.height = size;
  const sctx = sil.getContext('2d')!;
  sctx.drawImage(art, 0, 0);
  sctx.globalCompositeOperation = 'source-in';
  sctx.fillStyle = SHADOW;
  sctx.fillRect(0, 0, size, size);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(sil, size * 0.05, size * 0.05);
  ctx.drawImage(art, 0, 0);

  const url = canvas.toDataURL();
  cache.set(key, url);
  return url;
}

/** Data URL for an item's icon (falls back to a tinted lump). */
export function itemIconUrl(itemId: string, size = 48): string {
  const spec = ITEM_ICON[itemId] ?? { icon: 'burnt', color: itemDef(itemId)?.color ?? '#888' };
  return renderIcon(spec.icon, spec.color, size);
}

/** Data URL for a UI glyph. */
export function uiIconUrl(kind: 'backpack' | 'scroll' | 'hammer' | 'house' | 'attack', size = 48): string {
  const colors: Record<string, string> = {
    backpack: '#a5793f',
    scroll: '#efe3c2',
    hammer: '#9aa2ac',
    house: '#c98d4b',
    attack: '#c9ccd4',
  };
  return renderIcon(kind, colors[kind]!, size);
}
