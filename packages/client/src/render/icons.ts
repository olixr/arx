import { ELEMENT_COLORS, ENCHANT_DEFS, ITEMS, RECIPES, itemDef } from '@arx/content';
import { shade } from './rig.js';
import { BOW_STYLES, DAGGER_STYLES, GREAT_STYLES, STAFF_STYLES, SWORD_STYLES, drawBow, drawGreatweapon, drawStaff, drawSword } from './weapons.js';
import { TOOL_STYLES, drawTool } from './tools.js';
import { bodyStyle, bootStyle, gloveStyle, helmStyle, legStyle, offhandStyle } from './armor.js';
import {
  bodyIconPainter,
  bootsIconPainter,
  glovesIconPainter,
  helmIconPainter,
  legsIconPainter,
  offhandIconPainter,
} from './armorIcons.js';

/**
 * The icon set: every item and UI glyph is drawn in code, in the same
 * language as the world art — chunky flat shapes, two to four colors
 * per icon, facet highlights, one bold dark outline, one hard drop
 * shadow. No imported silhouettes: single-color glyphs go hazy where
 * this game pops. Rendered once per (icon, size) and cached as data
 * URLs for the DOM.
 */

const OUTLINE = '#241a2e';
const SHADOW = 'rgba(20, 12, 8, 0.45)';

export type IconPainter = (ctx: CanvasRenderingContext2D, color: string) => void;

/** All painters draw inside a 0..1 unit box. */
const PAINTERS: Record<string, IconPainter> = {
  sword: (c, col) => {
    c.translate(0.5, 0.5);
    c.rotate(-Math.PI / 4);
    // Blade with a bright edge and a dark fuller down the middle.
    poly(c, col, [[-0.18, -0.055], [0.28, -0.055], [0.41, 0], [0.28, 0.055], [-0.18, 0.055]]);
    c.fillStyle = shade(col, 40);
    c.beginPath();
    c.moveTo(-0.17, -0.045);
    c.lineTo(0.27, -0.045);
    c.lineTo(0.36, -0.005);
    c.lineTo(-0.17, -0.005);
    c.closePath();
    c.fill();
    c.strokeStyle = shade(col, -30);
    c.lineWidth = 0.022;
    c.beginPath();
    c.moveTo(-0.15, 0.01);
    c.lineTo(0.26, 0.01);
    c.stroke();
    // Crossguard, wrapped grip, gem pommel.
    bar(c, '#8a5f1c', -0.235, -0.115, 0.055, 0.23);
    bar(c, '#d9a441', -0.225, -0.1, 0.035, 0.2);
    bar(c, '#5b4028', -0.36, -0.045, 0.13, 0.09);
    c.strokeStyle = '#8a6a45';
    c.lineWidth = 0.02;
    for (const x of [-0.335, -0.295, -0.255]) {
      c.beginPath();
      c.moveTo(x, -0.045);
      c.lineTo(x, 0.045);
      c.stroke();
    }
    dot(c, '#d9a441', -0.4, 0, 0.055);
    dot(c, '#c4553d', -0.4, 0, 0.03);
    dot(c, '#fff2cc', -0.415, -0.015, 0.012);
  },
  dagger: (c, col) => {
    // The sword compressed: a short wicked blade, slim wrapped grip,
    // no gem — a working knife, drawn bigger in frame to stay readable.
    c.translate(0.5, 0.5);
    c.rotate(-Math.PI / 4);
    poly(c, col, [[-0.06, -0.07], [0.2, -0.07], [0.38, 0], [0.2, 0.07], [-0.06, 0.07]]);
    c.fillStyle = shade(col, 40);
    c.beginPath();
    c.moveTo(-0.05, -0.055);
    c.lineTo(0.19, -0.055);
    c.lineTo(0.32, -0.005);
    c.lineTo(-0.05, -0.005);
    c.closePath();
    c.fill();
    // Straight guard + dark wrapped grip.
    bar(c, '#8a5f1c', -0.11, -0.115, 0.05, 0.23);
    bar(c, '#4a3a2a', -0.3, -0.05, 0.19, 0.1);
    c.strokeStyle = '#6b5238';
    c.lineWidth = 0.02;
    for (const x of [-0.26, -0.21, -0.16]) {
      c.beginPath();
      c.moveTo(x, -0.05);
      c.lineTo(x, 0.05);
      c.stroke();
    }
  },
  eye_open: (c, col) => {
    // Alert almond eye — "something sees you."
    c.translate(0.5, 0.5);
    poly(c, '#f4efe4', [[-0.34, 0], [-0.12, -0.17], [0.12, -0.17], [0.34, 0], [0.12, 0.17], [-0.12, 0.17]]);
    dot(c, col, 0, 0, 0.13);
    dot(c, '#241a2e', 0, 0, 0.06);
    dot(c, '#ffffff', -0.04, -0.05, 0.025);
  },
  eye_half: (c, col) => {
    // Half-lidded — watchful, unseen so far.
    c.translate(0.5, 0.5);
    poly(c, '#d8d2c4', [[-0.34, 0], [-0.12, -0.17], [0.12, -0.17], [0.34, 0], [0.12, 0.17], [-0.12, 0.17]]);
    dot(c, col, 0, 0.03, 0.12);
    dot(c, '#241a2e', 0, 0.03, 0.055);
    // The lid drops over the top half.
    poly(c, shade(col, -25), [[-0.34, 0], [-0.12, -0.17], [0.12, -0.17], [0.34, 0], [0.12, -0.02], [-0.12, -0.02]]);
  },
  eye_closed: (c, col) => {
    // A closed lid with lashes — gone from the world.
    c.translate(0.5, 0.5);
    c.strokeStyle = col;
    c.lineWidth = 0.07;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.32, -0.03);
    c.quadraticCurveTo(0, 0.18, 0.32, -0.03);
    c.stroke();
    c.lineWidth = 0.05;
    for (const [x, y] of [[-0.24, 0.09], [-0.08, 0.15], [0.08, 0.15], [0.24, 0.09]] as const) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x * 1.25, y + 0.1);
      c.stroke();
    }
  },
  axe: (c, col) => {
    // A woodsman's axe with the head mounted the way heads mount:
    // ACROSS the haft. The bit hangs off the eye perpendicular, horns
    // spanning sideways, the honed crescent facing away.
    c.translate(0.5, 0.55);
    c.rotate(-Math.PI / 4);
    // Haft runs low-left to the eye; a nub pokes past the head.
    bar(c, '#7a5a38', -0.38, -0.048, 0.53, 0.096);
    c.strokeStyle = shade('#7a5a38', -22);
    c.lineWidth = 0.017;
    c.beginPath();
    c.moveTo(-0.34, 0.005);
    c.lineTo(0.0, 0.005);
    c.stroke();
    // The head, perpendicular to the haft: concave shoulders rise from
    // the eye to two horns, joined by the cutting crescent on top.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.033;
    c.beginPath();
    c.moveTo(0.02, -0.04);
    c.quadraticCurveTo(-0.04, -0.16, -0.22, -0.26);
    c.quadraticCurveTo(0.05, -0.47, 0.32, -0.31);
    c.quadraticCurveTo(0.23, -0.18, 0.2, -0.04);
    c.closePath();
    c.fill();
    c.stroke();
    // Honed crescent along the top edge.
    c.fillStyle = shade(col, 50);
    c.beginPath();
    c.moveTo(-0.22, -0.26);
    c.quadraticCurveTo(0.05, -0.47, 0.32, -0.31);
    c.quadraticCurveTo(0.05, -0.38, -0.22, -0.26);
    c.closePath();
    c.fill();
    // Cheek shading on the trailing half.
    c.fillStyle = shade(col, -20);
    c.beginPath();
    c.moveTo(0.2, -0.05);
    c.quadraticCurveTo(0.23, -0.17, 0.33, -0.28);
    c.quadraticCurveTo(0.24, -0.26, 0.16, -0.2);
    c.quadraticCurveTo(0.13, -0.12, 0.12, -0.05);
    c.closePath();
    c.fill();
    // Eye collar lashing where the head grips the haft.
    bar(c, '#6b4a26', 0.0, -0.075, 0.21, 0.15);
    c.strokeStyle = '#a8874f';
    c.lineWidth = 0.016;
    c.beginPath();
    c.moveTo(0.03, -0.05);
    c.lineTo(0.1, 0.06);
    c.moveTo(0.1, -0.05);
    c.lineTo(0.17, 0.06);
    c.stroke();
  },
  pickaxe: (c, col) => {
    // A miner's pick: stout grained haft, a broad double-pointed head
    // with real thickness and a lit crown.
    c.translate(0.5, 0.53);
    c.rotate(-Math.PI / 3.6);
    bar(c, '#8a6a45', -0.4, -0.048, 0.58, 0.096);
    c.strokeStyle = shade('#8a6a45', -22);
    c.lineWidth = 0.017;
    c.beginPath();
    c.moveTo(-0.36, 0.005);
    c.lineTo(0.06, 0.005);
    c.stroke();
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.033;
    c.beginPath();
    c.moveTo(0.16, -0.34);
    c.quadraticCurveTo(0.4, -0.22, 0.46, 0);
    c.quadraticCurveTo(0.4, 0.22, 0.16, 0.34);
    c.quadraticCurveTo(0.3, 0.16, 0.31, 0);
    c.quadraticCurveTo(0.3, -0.16, 0.16, -0.34);
    c.closePath();
    c.fill();
    c.stroke();
    // Crown highlight on the upper spur.
    c.fillStyle = shade(col, 34);
    c.beginPath();
    c.moveTo(0.18, -0.3);
    c.quadraticCurveTo(0.38, -0.2, 0.43, -0.02);
    c.quadraticCurveTo(0.39, -0.16, 0.22, -0.26);
    c.closePath();
    c.fill();
    // Eye collar lashed to the haft.
    bar(c, '#6b4a26', 0.13, -0.095, 0.075, 0.19);
    c.strokeStyle = '#a8874f';
    c.lineWidth = 0.016;
    c.beginPath();
    c.moveTo(0.135, -0.07);
    c.lineTo(0.2, 0.05);
    c.moveTo(0.135, 0.01);
    c.lineTo(0.2, 0.09);
    c.stroke();
  },
  bow: (c, col) => {
    // A recurve at full profile, arrow nocked and ready.
    c.lineCap = 'round';
    // Limbs: outline pass, wood pass, highlight pass.
    const limbs = (): void => {
      c.beginPath();
      c.moveTo(0.56, 0.1);
      c.quadraticCurveTo(0.72, 0.16, 0.7, 0.34);
      c.quadraticCurveTo(0.68, 0.46, 0.66, 0.5);
      c.quadraticCurveTo(0.68, 0.54, 0.7, 0.66);
      c.quadraticCurveTo(0.72, 0.84, 0.56, 0.9);
    };
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.1;
    limbs();
    c.stroke();
    c.strokeStyle = col;
    c.lineWidth = 0.062;
    limbs();
    c.stroke();
    c.strokeStyle = shade(col, 26);
    c.lineWidth = 0.022;
    limbs();
    c.stroke();
    // Wrapped grip at the riser.
    bar(c, '#6b4a26', 0.62, 0.44, 0.085, 0.12);
    // Recurved tips.
    for (const side of [-1, 1]) {
      c.strokeStyle = shade(col, -24);
      c.lineWidth = 0.045;
      c.beginPath();
      c.moveTo(0.56, 0.5 + side * 0.4);
      c.quadraticCurveTo(0.5, 0.5 + side * 0.42, 0.48, 0.5 + side * 0.36);
      c.stroke();
    }
    // String, and the nocked arrow across it.
    c.strokeStyle = '#e6e0d0';
    c.lineWidth = 0.024;
    c.beginPath();
    c.moveTo(0.49, 0.145);
    c.lineTo(0.38, 0.5);
    c.lineTo(0.49, 0.855);
    c.stroke();
    c.strokeStyle = '#8a6a45';
    c.lineWidth = 0.032;
    c.beginPath();
    c.moveTo(0.38, 0.5);
    c.lineTo(0.76, 0.5);
    c.stroke();
    poly(c, '#9aa2ac', [[0.76, 0.455], [0.87, 0.5], [0.76, 0.545]]);
    poly(c, '#e6e0d0', [[0.33, 0.455], [0.42, 0.5], [0.33, 0.545], [0.38, 0.5]]);
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
    // A caster's staff: gnarled dark shaft, wire-wrapped grip, forked
    // crown cradling a levitating faceted focus that leaks light.
    c.translate(0.5, 0.5);
    c.rotate(-Math.PI / 4);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.1;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.38, 0.03);
    c.quadraticCurveTo(-0.05, -0.045, 0.17, 0.005);
    c.stroke();
    c.strokeStyle = '#5b4632';
    c.lineWidth = 0.068;
    c.stroke();
    c.strokeStyle = shade('#5b4632', 20);
    c.lineWidth = 0.022;
    c.beginPath();
    c.moveTo(-0.36, 0.015);
    c.quadraticCurveTo(-0.05, -0.06, 0.15, -0.01);
    c.stroke();
    // Gold wire wraps at the grip.
    c.strokeStyle = '#d9a441';
    c.lineWidth = 0.02;
    for (const x of [-0.26, -0.22, -0.18]) {
      c.beginPath();
      c.moveTo(x, -0.05);
      c.lineTo(x + 0.025, 0.055);
      c.stroke();
    }
    // The fork: two prongs reaching around the focus.
    c.strokeStyle = '#5b4632';
    c.lineWidth = 0.045;
    c.beginPath();
    c.moveTo(0.16, 0);
    c.quadraticCurveTo(0.22, -0.1, 0.33, -0.11);
    c.moveTo(0.16, 0);
    c.quadraticCurveTo(0.22, 0.1, 0.33, 0.11);
    c.stroke();
    c.lineCap = 'butt';
    // The focus: glow halo, faceted stone, hot core, escaping sparks.
    dot(c, shade(col, -18), 0.31, 0, 0.155);
    c.globalAlpha = 0.35;
    dot(c, col, 0.31, 0, 0.19);
    c.globalAlpha = 1;
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.028;
    c.beginPath();
    c.moveTo(0.31, -0.13);
    c.lineTo(0.42, 0);
    c.lineTo(0.31, 0.13);
    c.lineTo(0.2, 0);
    c.closePath();
    c.fill();
    c.stroke();
    poly(c, shade(col, 34), [[0.31, -0.13], [0.37, 0], [0.25, 0]]);
    dot(c, '#fff2cc', 0.29, -0.035, 0.028);
    // Sparks drifting off the stone.
    for (const [sx, sy, r] of [
      [0.4, -0.16, 0.02],
      [0.46, 0.08, 0.016],
      [0.24, -0.19, 0.014],
    ] as const) {
      c.save();
      c.translate(sx, sy);
      c.rotate(Math.PI / 4);
      c.fillStyle = '#fff2cc';
      c.fillRect(-r, -r, r * 2, r * 2);
      c.restore();
    }
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
  log: (c, col) => drawLog(c, col, 'plain'),
  log_oak: (c, col) => drawLog(c, col, 'oak'),
  log_willow: (c, col) => drawLog(c, col, 'willow'),
  log_yew: (c, col) => drawLog(c, col, 'yew'),
  log_pine: (c, col) => drawLog(c, col, 'pine'),
  board: (c, col) => drawBoards(c, col),
  sawhorse: (c, col) => drawSawhorse(c, col),
  beast_pen: (c, col) => drawBeastPen(c, col),
  // Each ore is its own find, cut in the game's blocky node language:
  // a deep-toned frame, a bright mineral face, one hard square glint —
  // the icon IS the chunk the deposit gives up, no generic host rock.
  ore_copper: (c, col) => {
    // A hewn block of raw copper, verdigris kissing its shadowed flank.
    oreChunk(c, 0.46, 0.5, 0.5, -0.1, col);
    oreChunk(c, 0.72, 0.72, 0.27, 0.18, col);
    c.save();
    c.translate(0.46, 0.5);
    c.rotate(-0.1);
    c.fillStyle = '#3fa98e';
    c.fillRect(-0.14, 0.05, 0.1, 0.09);
    c.fillRect(-0.02, 0.11, 0.07, 0.05);
    c.restore();
  },
  ore_tin: (c, col) => {
    // Twin cubic crystals leaning shoulder to shoulder.
    oreChunk(c, 0.4, 0.58, 0.42, -0.16, col, '#ffffff');
    oreChunk(c, 0.68, 0.5, 0.32, 0.22, col, '#ffffff');
    dot(c, '#ffffff', 0.33, 0.42, 0.022);
  },
  ore_iron: (c, col) => {
    // A banded ironstone block with a black magnetite corner.
    oreChunk(c, 0.48, 0.52, 0.54, 0.08, col);
    c.save();
    c.translate(0.48, 0.52);
    c.rotate(0.08);
    c.fillStyle = shade(col, -28);
    c.fillRect(-0.2, -0.02, 0.4, 0.05);
    c.fillRect(-0.17, 0.09, 0.34, 0.04);
    c.restore();
    oreChunk(c, 0.74, 0.72, 0.23, -0.14, '#3a3d46', '#9fb2c8');
  },
  ore_silver: (c, col) => {
    // The silverspur in miniature: a dark host chunk with two faceted
    // blade crystals erupting from it — each split hard into a lit
    // facet and a steel-shadow facet, white chip only at the tip.
    // Metal through facet contrast, never bright paint.
    const blade = (bx: number, by: number, len: number, w: number, ang: number): void => {
      c.save();
      c.translate(bx, by);
      c.rotate(ang);
      poly(c, shade(col, -26), [
        [-w * 0.5, 0], [-w * 0.56, -len * 0.62], [-w * 0.36, -len],
        [w * 0.3, -len * 0.86], [w * 0.54, -len * 0.58], [w * 0.5, 0],
      ]);
      poly(c, col, [
        [-w * 0.5, 0], [-w * 0.56, -len * 0.62], [-w * 0.36, -len],
        [0, -len * 0.92], [w * 0.02, -len * 0.5], [-w * 0.04, 0],
      ]);
      poly(c, shade(col, 24), [
        [-w * 0.36, -len], [w * 0.3, -len * 0.86], [w * 0.18, -len * 0.76], [-w * 0.28, -len * 0.88],
      ]);
      poly(c, '#ffffff', [
        [-w * 0.36, -len], [-w * 0.1, -len * 0.95], [-w * 0.3, -len * 0.86],
      ]);
      c.restore();
    };
    // Host chunk low in the frame, columns fanning up from its back.
    oreChunk(c, 0.46, 0.72, 0.46, -0.06, shade(col, -34), shade(col, -10));
    blade(0.42, 0.62, 0.48, 0.2, -0.14);
    blade(0.6, 0.66, 0.32, 0.15, 0.42);
    blade(0.3, 0.68, 0.25, 0.13, -0.55);
  },
  ore_mithril: (c, col) => {
    // The risen lode in miniature: the sky-metal chunk floats free of
    // its host stone — a visible gap and a soft contact shadow below
    // sell the feather-light hover, faceted like the deposit's drift.
    oreChunk(c, 0.5, 0.72, 0.44, -0.06, col, '#d8ecff');
    c.fillStyle = 'rgba(20, 16, 30, 0.3)';
    c.beginPath();
    c.ellipse(0.48, 0.47, 0.11, 0.028, 0, 0, Math.PI * 2);
    c.fill();
    const shard = (bx: number, by: number, r: number, rot: number): void => {
      c.save();
      c.translate(bx, by);
      c.rotate(rot);
      poly(c, shade(col, -30), [
        [-r * 0.9, -r * 0.15], [-r * 0.45, -r * 0.85], [r * 0.5, -r * 0.75],
        [r * 0.95, r * 0.1], [r * 0.35, r * 0.8], [-r * 0.5, r * 0.7],
      ]);
      poly(c, col, [
        [-r * 0.9, -r * 0.15], [-r * 0.45, -r * 0.85], [r * 0.5, -r * 0.75],
        [r * 0.28, -r * 0.05], [-r * 0.35, r * 0.45],
      ]);
      poly(c, '#e8f4ff', [
        [-r * 0.45, -r * 0.85], [-r * 0.1, -r * 0.78], [-r * 0.38, -r * 0.5],
      ]);
      c.restore();
    };
    shard(0.48, 0.32, 0.15, 0.12);
    shard(0.72, 0.18, 0.08, -0.4);
  },
  ore_adamant: (c, col) => {
    // Deep-green block banded with the horns' dark armor plates.
    oreChunk(c, 0.5, 0.54, 0.56, 0.06, col, '#d2f0d0');
    c.save();
    c.translate(0.5, 0.54);
    c.rotate(0.06);
    c.fillStyle = shade(col, -30);
    c.fillRect(-0.21, -0.04, 0.42, 0.055);
    c.fillRect(-0.18, 0.09, 0.36, 0.045);
    c.restore();
    oreChunk(c, 0.24, 0.72, 0.2, -0.2, col, '#d2f0d0');
  },
  shard_obsidian: (c, col) => {
    // A knapped blade of volcano glass: hard angular silhouette,
    // violet facet, conchoidal ripples, one ember still warm at the heel.
    poly(c, shade(col, -20), [
      [0.36, 0.82], [0.3, 0.56], [0.4, 0.3], [0.56, 0.14], [0.62, 0.34], [0.7, 0.58], [0.58, 0.8],
    ]);
    poly(c, '#4e4260', [
      [0.42, 0.72], [0.38, 0.52], [0.46, 0.3], [0.56, 0.18], [0.58, 0.4], [0.52, 0.62],
    ]);
    c.strokeStyle = '#b8a8d8';
    c.lineWidth = 0.022;
    c.beginPath();
    c.arc(0.5, 0.52, 0.1, Math.PI * 1.15, Math.PI * 1.85);
    c.stroke();
    c.beginPath();
    c.arc(0.52, 0.66, 0.13, Math.PI * 1.2, Math.PI * 1.8);
    c.stroke();
    dot(c, '#e8683c', 0.4, 0.76, 0.03);
  },
  ore_starmetal: (c, col) => {
    // The fallen star's core: a pale chunk trailing impact cracks,
    // crowned with a white four-point glitter.
    oreChunk(c, 0.5, 0.58, 0.52, -0.12, col, '#ffffff');
    c.strokeStyle = shade(col, -40);
    c.lineWidth = 0.025;
    c.beginPath();
    c.moveTo(0.3, 0.74);
    c.lineTo(0.18, 0.84);
    c.moveTo(0.68, 0.7);
    c.lineTo(0.8, 0.8);
    c.stroke();
    poly(c, '#ffffff', [
      [0.72, 0.22], [0.755, 0.315], [0.85, 0.35], [0.755, 0.385], [0.72, 0.48], [0.685, 0.385], [0.59, 0.35], [0.685, 0.315],
    ]);
  },
  bar: (c, col) => {
    // A cast ingot with real body: foreshortened top plane, tall front
    // face, shadowed end, and the smith's stamp struck into the top —
    // the crate-lid treatment in metal.
    c.save();
    c.translate(0.5, 0.54);
    c.rotate(-0.09);
    const topY = -0.2;
    const face = 0.24;
    // Front face (mold-tapered sides).
    poly(c, shade(col, -14), [[-0.34, topY + 0.02], [0.34, topY + 0.02], [0.42, topY + face], [-0.42, topY + face]]);
    // Bottom lip in deeper shadow.
    poly(c, shade(col, -32), [[-0.42, topY + face], [0.42, topY + face], [0.43, topY + face + 0.05], [-0.43, topY + face + 0.05]]);
    // Top plane, lit, narrowing away from camera.
    poly(c, col, [[-0.28, topY - 0.13], [0.28, topY - 0.13], [0.34, topY + 0.02], [-0.34, topY + 0.02]]);
    // Sunlit arris along the near top edge.
    c.strokeStyle = shade(col, 36);
    c.lineWidth = 0.028;
    c.beginPath();
    c.moveTo(-0.33, topY + 0.015);
    c.lineTo(0.33, topY + 0.015);
    c.stroke();
    // The smith's stamp: a struck diamond, debossed (dark, lit lip).
    c.strokeStyle = shade(col, -34);
    c.lineWidth = 0.026;
    c.beginPath();
    c.moveTo(0, topY - 0.1);
    c.lineTo(0.09, topY - 0.05);
    c.lineTo(0, topY - 0.0);
    c.lineTo(-0.09, topY - 0.05);
    c.closePath();
    c.stroke();
    // Casting shine sweeping the top plane.
    c.fillStyle = shade(col, 26);
    poly(c, shade(col, 26), [[-0.24, topY - 0.115], [-0.13, topY - 0.115], [-0.2, topY], [-0.31, topY]]);
    c.restore();
  },
  fish: (c, col) => {
    // A river trout with real anatomy: forked tail, dorsal fin, gill
    // line, pale belly, and a scatter of spots.
    c.save();
    c.translate(0.5, 0.5);
    c.rotate(-0.08);
    // Dorsal fin first, tucked behind the body.
    poly(c, shade(col, -16), [[-0.1, -0.13], [0.02, -0.26], [0.12, -0.13]]);
    // Body: nose to tail-root.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(-0.34, 0.02);
    c.quadraticCurveTo(-0.24, -0.15, 0.0, -0.15);
    c.quadraticCurveTo(0.18, -0.14, 0.26, -0.03);
    c.quadraticCurveTo(0.18, 0.08, 0.0, 0.13);
    c.quadraticCurveTo(-0.24, 0.15, -0.34, 0.02);
    c.closePath();
    c.fill();
    c.stroke();
    // Forked tail.
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0.24, -0.02);
    c.lineTo(0.4, -0.15);
    c.lineTo(0.36, 0.0);
    c.lineTo(0.42, 0.14);
    c.lineTo(0.24, 0.03);
    c.closePath();
    c.fill();
    c.stroke();
    // Pale belly band.
    c.fillStyle = shade(col, 30);
    c.beginPath();
    c.moveTo(-0.3, 0.045);
    c.quadraticCurveTo(-0.1, 0.125, 0.12, 0.075);
    c.quadraticCurveTo(-0.1, 0.075, -0.3, 0.045);
    c.closePath();
    c.fill();
    // Gill line + eye + spots + side fin.
    c.strokeStyle = shade(col, -26);
    c.lineWidth = 0.024;
    c.beginPath();
    c.arc(-0.19, 0.0, 0.09, -Math.PI * 0.4, Math.PI * 0.4);
    c.stroke();
    dot(c, '#170f1c', -0.26, -0.045, 0.026);
    dot(c, '#fff2cc', -0.268, -0.052, 0.009);
    for (const [sx, sy] of [
      [-0.06, -0.06],
      [0.05, -0.03],
      [-0.02, 0.02],
      [0.13, -0.06],
    ] as const) {
      dot(c, shade(col, -20), sx, sy, 0.018);
    }
    poly(c, shade(col, -14), [[-0.12, 0.05], [-0.02, 0.12], [-0.13, 0.12]]);
    c.restore();
  },
  fishcooked: (c, col) => {
    // Off the fire on its skewer, char-striped and steaming.
    // The skewer runs nose to tail.
    c.strokeStyle = '#6b4a26';
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.08, 0.72);
    c.lineTo(0.92, 0.42);
    c.stroke();
    c.save();
    c.translate(0.5, 0.56);
    c.rotate(-0.33);
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(-0.3, 0.01);
    c.quadraticCurveTo(-0.2, -0.13, 0.0, -0.13);
    c.quadraticCurveTo(0.16, -0.12, 0.23, -0.02);
    c.quadraticCurveTo(0.16, 0.07, 0.0, 0.11);
    c.quadraticCurveTo(-0.2, 0.13, -0.3, 0.01);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0.21, -0.015);
    c.lineTo(0.34, -0.12);
    c.lineTo(0.31, 0.0);
    c.lineTo(0.35, 0.11);
    c.lineTo(0.21, 0.025);
    c.closePath();
    c.fill();
    c.stroke();
    // Char stripes across the flank.
    c.strokeStyle = shade(col, -34);
    c.lineWidth = 0.03;
    for (const x of [-0.16, -0.04, 0.08]) {
      c.beginPath();
      c.moveTo(x, -0.09);
      c.lineTo(x + 0.03, 0.08);
      c.stroke();
    }
    dot(c, '#170f1c', -0.23, -0.035, 0.022);
    c.restore();
    // Steam curls rising.
    c.strokeStyle = 'rgba(244, 239, 228, 0.75)';
    c.lineWidth = 0.026;
    c.lineCap = 'round';
    for (const x of [0.38, 0.52]) {
      c.beginPath();
      c.moveTo(x, 0.3);
      c.quadraticCurveTo(x + 0.05, 0.22, x, 0.15);
      c.stroke();
    }
    c.lineCap = 'butt';
  },
  meat: (c, col) => {
    // A butcher's cut, not a lollipop: a thick chop slab with a fat
    // cap along the top edge, marbling in the muscle, and the round
    // bone eye set INTO the meat where a chop carries it.
    c.save();
    c.translate(0.5, 0.52);
    c.rotate(-0.18);
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.034;
    c.beginPath();
    c.moveTo(-0.3, -0.14);
    c.quadraticCurveTo(0.05, -0.3, 0.3, -0.16);
    c.quadraticCurveTo(0.4, -0.02, 0.32, 0.14);
    c.quadraticCurveTo(0.18, 0.28, -0.06, 0.24);
    c.quadraticCurveTo(-0.32, 0.2, -0.34, 0.0);
    c.closePath();
    c.fill();
    c.stroke();
    // The fat cap riding the top edge.
    c.fillStyle = '#efe3d0';
    c.beginPath();
    c.moveTo(-0.29, -0.135);
    c.quadraticCurveTo(0.05, -0.29, 0.29, -0.155);
    c.quadraticCurveTo(0.06, -0.2, -0.12, -0.16);
    c.quadraticCurveTo(-0.22, -0.14, -0.29, -0.135);
    c.closePath();
    c.fill();
    // Marbling: two pale veins wandering the muscle.
    c.strokeStyle = shade(col, 30);
    c.lineWidth = 0.02;
    c.beginPath();
    c.moveTo(-0.2, 0.04);
    c.quadraticCurveTo(-0.04, -0.05, 0.1, 0.05);
    c.stroke();
    c.beginPath();
    c.moveTo(-0.08, 0.15);
    c.quadraticCurveTo(0.06, 0.1, 0.18, 0.16);
    c.stroke();
    // The bone eye, set into the chop.
    c.fillStyle = '#efe8d8';
    c.strokeStyle = shade(col, -26);
    c.lineWidth = 0.022;
    c.beginPath();
    c.arc(0.2, -0.02, 0.065, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = '#cfc4ae';
    c.beginPath();
    c.arc(0.215, -0.005, 0.028, 0, Math.PI * 2);
    c.fill();
    c.restore();
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
    // A splayed pelt the tanner would recognize: neck stub at the top,
    // four leg flares, ragged flanks, the belly lighter than the rim
    // and a grain of strokes running with the hide.
    c.save();
    c.translate(0.5, 0.52);
    c.rotate(-0.06);
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.032;
    c.beginPath();
    c.moveTo(0, -0.4); // neck
    c.quadraticCurveTo(0.14, -0.38, 0.19, -0.3);
    c.quadraticCurveTo(0.34, -0.34, 0.36, -0.22); // fore leg flare
    c.quadraticCurveTo(0.28, -0.12, 0.3, 0.02);
    c.quadraticCurveTo(0.27, 0.14, 0.35, 0.24); // hind leg flare
    c.quadraticCurveTo(0.3, 0.36, 0.16, 0.32);
    c.quadraticCurveTo(0.04, 0.4, -0.08, 0.33); // tail edge
    c.quadraticCurveTo(-0.26, 0.37, -0.31, 0.24);
    c.quadraticCurveTo(-0.27, 0.12, -0.29, 0.0);
    c.quadraticCurveTo(-0.36, -0.14, -0.31, -0.24);
    c.quadraticCurveTo(-0.33, -0.34, -0.18, -0.31);
    c.quadraticCurveTo(-0.12, -0.39, 0, -0.4);
    c.closePath();
    c.fill();
    c.stroke();
    // The belly field, worked lighter toward the middle.
    c.fillStyle = shade(col, 16);
    c.beginPath();
    c.ellipse(-0.01, -0.03, 0.19, 0.24, 0.05, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = shade(col, 28);
    c.beginPath();
    c.ellipse(-0.05, -0.09, 0.1, 0.13, 0.15, 0, Math.PI * 2);
    c.fill();
    // Hide grain: short strokes running with the spine.
    c.strokeStyle = shade(col, -18);
    c.lineWidth = 0.016;
    for (const [x, y] of [[-0.18, -0.18], [0.14, -0.14], [-0.16, 0.16], [0.16, 0.12], [0.0, 0.26]] as const) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 0.05, y + 0.07);
      c.stroke();
    }
    c.restore();
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
    // Treasure with WEIGHT: a stacked column flanked by strays, milled
    // edges, and the top coin struck with a star — gold you count.
    const coin = (x: number, y: number, r: number, stamped = false): void => {
      const ry = r * 0.62;
      // Edge thickness under the face.
      c.fillStyle = shade(col, -28);
      c.beginPath();
      c.ellipse(x, y + 0.035, r, ry, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = col;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 0.028;
      c.beginPath();
      c.ellipse(x, y, r, ry, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.strokeStyle = shade(col, -34);
      c.lineWidth = 0.018;
      c.beginPath();
      c.ellipse(x, y, r * 0.66, ry * 0.62, 0, 0, Math.PI * 2);
      c.stroke();
      if (stamped) {
        // The struck star on the face.
        c.fillStyle = shade(col, -34);
        c.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
          const px = x + Math.cos(a) * r * 0.4;
          const py = y + Math.sin(a) * ry * 0.4;
          if (i === 0) c.moveTo(px, py);
          else c.lineTo(px, py);
          const a2 = a + Math.PI / 5;
          c.lineTo(x + Math.cos(a2) * r * 0.16, y + Math.sin(a2) * ry * 0.16);
        }
        c.closePath();
        c.fill();
      } else {
        c.fillStyle = shade(col, 30);
        c.beginPath();
        c.ellipse(x - r * 0.35, y - ry * 0.35, r * 0.2, ry * 0.22, -0.5, 0, Math.PI * 2);
        c.fill();
      }
    };
    // Strays at the base, then the stack, capped by the stamped face.
    coin(0.24, 0.72, 0.15);
    coin(0.76, 0.74, 0.14);
    coin(0.5, 0.66, 0.17);
    coin(0.5, 0.56, 0.17);
    coin(0.5, 0.46, 0.17);
    coin(0.5, 0.36, 0.17, true);
  },
  burnt: (c, col) => {
    poly(c, col, [[0.26, 0.72], [0.2, 0.5], [0.38, 0.32], [0.66, 0.3], [0.8, 0.52], [0.7, 0.72]]);
    c.fillStyle = '#66606e';
    dot(c, '#66606e', 0.4, 0.46, 0.04);
    dot(c, '#66606e', 0.58, 0.54, 0.03);
  },
  cape: (c, col) => {
    // The wardrobe's own silhouette: shoulder collar, billowing cloth,
    // notched hem — the world capes shrunk to a chip.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.35, 0.17);
    c.quadraticCurveTo(0.5, 0.1, 0.65, 0.17);
    c.quadraticCurveTo(0.8, 0.42, 0.75, 0.82);
    c.lineTo(0.62, 0.72);
    c.lineTo(0.51, 0.84);
    c.lineTo(0.4, 0.72);
    c.lineTo(0.26, 0.82);
    c.quadraticCurveTo(0.2, 0.42, 0.35, 0.17);
    c.closePath();
    c.fill();
    c.stroke();
    // Light catches the left fold; the right turns away.
    c.fillStyle = shade(col, 20);
    c.beginPath();
    c.moveTo(0.37, 0.2);
    c.quadraticCurveTo(0.31, 0.45, 0.33, 0.72);
    c.lineTo(0.4, 0.68);
    c.quadraticCurveTo(0.4, 0.44, 0.44, 0.2);
    c.closePath();
    c.fill();
    c.fillStyle = shade(col, -24);
    c.beginPath();
    c.moveTo(0.6, 0.2);
    c.quadraticCurveTo(0.68, 0.46, 0.66, 0.74);
    c.lineTo(0.58, 0.68);
    c.quadraticCurveTo(0.58, 0.44, 0.54, 0.2);
    c.closePath();
    c.fill();
    // Collar clasp.
    bar(c, shade(col, -32), 0.38, 0.14, 0.24, 0.06);
    dot(c, '#d9a441', 0.5, 0.17, 0.035);
  },
  banner: (c, col) => {
    // A warband pennant on its crossbar, swallowtail cut.
    bar(c, '#6b4a26', 0.2, 0.13, 0.6, 0.055);
    dot(c, '#d9a441', 0.22, 0.157, 0.035);
    dot(c, '#d9a441', 0.78, 0.157, 0.035);
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.3, 0.19);
    c.lineTo(0.7, 0.19);
    c.lineTo(0.7, 0.78);
    c.lineTo(0.5, 0.66);
    c.lineTo(0.3, 0.78);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 22);
    c.fillRect(0.44, 0.21, 0.12, 0.44);
    c.fillStyle = shade(col, -26);
    c.fillRect(0.63, 0.21, 0.05, 0.5);
  },
  helm: (c, col) => {
    // Rounded dome, cheek plates, dark eye slit, a proud crest ridge.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.26, 0.52);
    c.quadraticCurveTo(0.24, 0.2, 0.5, 0.18);
    c.quadraticCurveTo(0.76, 0.2, 0.74, 0.52);
    c.lineTo(0.72, 0.78);
    c.lineTo(0.6, 0.7);
    c.lineTo(0.4, 0.7);
    c.lineTo(0.28, 0.78);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 24);
    c.beginPath();
    c.moveTo(0.44, 0.16);
    c.quadraticCurveTo(0.5, 0.12, 0.56, 0.16);
    c.lineTo(0.56, 0.5);
    c.lineTo(0.44, 0.5);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = '#170f1c';
    c.beginPath();
    c.roundRect(0.32, 0.5, 0.36, 0.085, 0.03);
    c.fill();
  },
  legs: (c, col) => {
    // A pair of greaves, splayed at the boots.
    for (const side of [-1, 1]) {
      c.save();
      c.translate(0.5 + side * 0.115, 0.5);
      c.rotate(side * 0.08);
      c.fillStyle = col;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 0.035;
      c.beginPath();
      c.roundRect(-0.085, -0.32, 0.17, 0.62, 0.06);
      c.fill();
      c.stroke();
      c.fillStyle = shade(col, side < 0 ? 18 : -20);
      c.fillRect(-0.05, -0.28, 0.1, 0.5);
      c.fillStyle = shade(col, -30);
      c.beginPath();
      c.roundRect(-0.085, -0.05, 0.17, 0.07, 0.03);
      c.fill();
      c.restore();
    }
    bar(c, shade(col, -26), 0.3, 0.14, 0.4, 0.09);
  },
  boots: (c, col) => {
    // A pair of boots toeing outward — shaft, folded cuff, solid sole.
    for (const side of [-1, 1]) {
      c.save();
      c.translate(0.5 + side * 0.14, 0.52);
      c.rotate(side * 0.06);
      c.fillStyle = col;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 0.035;
      c.beginPath();
      c.moveTo(-0.09, -0.3);
      c.lineTo(0.09, -0.3);
      c.lineTo(0.09, 0.14);
      c.lineTo(side * 0.2, 0.14);
      c.lineTo(side * 0.2, 0.3);
      c.lineTo(-0.09, 0.3);
      c.closePath();
      c.fill();
      c.stroke();
      // Lit shaft face + folded cuff + sole.
      c.fillStyle = shade(col, side < 0 ? 16 : -18);
      c.fillRect(-0.05, -0.24, 0.1, 0.3);
      c.fillStyle = shade(col, 26);
      c.beginPath();
      c.roundRect(-0.105, -0.32, 0.21, 0.1, 0.03);
      c.fill();
      c.stroke();
      c.fillStyle = '#170f1c';
      c.beginPath();
      c.roundRect(Math.min(-0.09, side * 0.2 - 0.02), 0.24, 0.09 + Math.abs(side * 0.2) + 0.02, 0.07, 0.02);
      c.fill();
      c.restore();
    }
  },
  gloves: (c, col) => {
    // One hero glove, fingers up, back of the hand to us — soft work
    // leather or cloth. Fingers paint first so the palm block's outline
    // draws the knuckle line over their roots.
    c.translate(0.5, 0.54);
    c.rotate(-0.1);
    // Out-thrown thumb, behind the palm.
    c.save();
    c.translate(-0.17, -0.02);
    c.rotate(-0.55);
    c.fillStyle = shade(col, -8);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.roundRect(-0.055, -0.24, 0.11, 0.3, 0.05);
    c.fill();
    c.stroke();
    c.restore();
    // Four chunky fingers, middle pair the tallest.
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    for (let i = 0; i < 4; i++) {
      const x = -0.152 + i * 0.082;
      const len = 0.26 + (i === 1 || i === 2 ? 0.05 : 0);
      c.fillStyle = i < 2 ? shade(col, 12) : shade(col, -10);
      c.beginPath();
      c.roundRect(x, -0.12 - len, 0.076, len + 0.1, 0.036);
      c.fill();
      c.stroke();
    }
    // The palm block seats the fingers and hides their roots.
    c.fillStyle = col;
    c.beginPath();
    c.roundRect(-0.17, -0.16, 0.34, 0.36, 0.05);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 16);
    c.beginPath();
    c.roundRect(-0.17, -0.16, 0.15, 0.36, 0.05);
    c.fill();
    // Knuckle stitch line.
    c.strokeStyle = shade(col, -26);
    c.lineWidth = 0.024;
    c.beginPath();
    c.moveTo(-0.12, -0.07);
    c.lineTo(0.12, -0.07);
    c.stroke();
    // Flared cuff over the wrist, rolled top edge catching the light.
    poly(c, shade(col, -18), [[-0.2, 0.14], [0.2, 0.14], [0.25, 0.4], [-0.25, 0.4]]);
    c.fillStyle = shade(col, 22);
    c.beginPath();
    c.roundRect(-0.215, 0.11, 0.43, 0.085, 0.03);
    c.fill();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.stroke();
  },
  gauntlet: (c, col) => {
    // One armored gauntlet, fingers up: segmented finger lames, a
    // faceted hand plate, a knuckle stud row, and the flared cuff that
    // says PLATE from across the room.
    c.translate(0.5, 0.54);
    c.rotate(-0.1);
    // Armored thumb.
    c.save();
    c.translate(-0.18, -0.02);
    c.rotate(-0.55);
    c.fillStyle = shade(col, -6);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.roundRect(-0.055, -0.23, 0.11, 0.29, 0.04);
    c.fill();
    c.stroke();
    c.strokeStyle = shade(col, -30);
    c.lineWidth = 0.024;
    c.beginPath();
    c.moveTo(-0.045, -0.12);
    c.lineTo(0.045, -0.12);
    c.stroke();
    c.restore();
    // Finger lames — each finger crossed by segment shadows.
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    for (let i = 0; i < 4; i++) {
      const x = -0.152 + i * 0.082;
      const len = 0.26 + (i === 1 || i === 2 ? 0.05 : 0);
      c.fillStyle = i < 2 ? shade(col, 14) : shade(col, -8);
      c.beginPath();
      c.roundRect(x, -0.12 - len, 0.076, len + 0.1, 0.03);
      c.fill();
      c.stroke();
      c.strokeStyle = shade(col, -32);
      c.lineWidth = 0.02;
      for (const t of [0.42, 0.7]) {
        c.beginPath();
        c.moveTo(x + 0.008, -0.12 - len * t);
        c.lineTo(x + 0.068, -0.12 - len * t);
        c.stroke();
      }
      c.strokeStyle = OUTLINE;
      c.lineWidth = 0.035;
    }
    // Faceted back-of-hand plate.
    poly(c, col, [[-0.18, -0.14], [0.18, -0.14], [0.21, 0.1], [0.14, 0.22], [-0.14, 0.22], [-0.21, 0.1]]);
    c.fillStyle = shade(col, 26);
    c.beginPath();
    c.moveTo(-0.18, -0.14);
    c.lineTo(0.02, -0.14);
    c.lineTo(-0.06, 0.22);
    c.lineTo(-0.14, 0.22);
    c.lineTo(-0.21, 0.1);
    c.closePath();
    c.fill();
    // Knuckle stud row riding the plate's top edge.
    for (let i = 0; i < 3; i++) {
      const x = -0.1 + i * 0.1;
      poly(c, shade(col, 34), [[x - 0.038, -0.12], [x + 0.038, -0.12], [x, -0.21]]);
    }
    // Flared cuff: bright rolled rim over a dark mouth shadow.
    poly(c, shade(col, -14), [[-0.2, 0.16], [0.2, 0.16], [0.27, 0.42], [-0.27, 0.42]]);
    c.fillStyle = 'rgba(20, 12, 8, 0.5)';
    c.fillRect(-0.19, 0.16, 0.38, 0.05);
    c.fillStyle = shade(col, 20);
    c.beginPath();
    c.roundRect(-0.28, 0.38, 0.56, 0.075, 0.03);
    c.fill();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.stroke();
  },
  robe: (c, col) => {
    // A-line robe falling to a wide hem, sash, center stitch.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.34, 0.14);
    c.lineTo(0.66, 0.14);
    c.lineTo(0.72, 0.3);
    c.lineTo(0.68, 0.42);
    c.lineTo(0.78, 0.86);
    c.lineTo(0.22, 0.86);
    c.lineTo(0.32, 0.42);
    c.lineTo(0.28, 0.3);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, -22);
    c.beginPath();
    c.moveTo(0.5, 0.14);
    c.lineTo(0.66, 0.14);
    c.lineTo(0.72, 0.3);
    c.lineTo(0.68, 0.42);
    c.lineTo(0.78, 0.86);
    c.lineTo(0.5, 0.86);
    c.closePath();
    c.fill();
    c.fillStyle = shade(col, -38);
    c.fillRect(0.3, 0.44, 0.4, 0.07);
    c.strokeStyle = shade(col, 30);
    c.lineWidth = 0.02;
    c.beginPath();
    c.moveTo(0.5, 0.18);
    c.lineTo(0.5, 0.42);
    c.stroke();
    c.fillStyle = shade(col, 26);
    c.fillRect(0.24, 0.8, 0.52, 0.05);
  },
  jerkin: (c, col) => {
    // Sleeveless leather vest: diagonal strap, buckle, stitched hem.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.3, 0.18);
    c.lineTo(0.7, 0.18);
    c.lineTo(0.76, 0.34);
    c.lineTo(0.7, 0.44);
    c.lineTo(0.7, 0.8);
    c.quadraticCurveTo(0.5, 0.88, 0.3, 0.8);
    c.lineTo(0.3, 0.44);
    c.lineTo(0.24, 0.34);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, -20);
    c.beginPath();
    c.moveTo(0.5, 0.18);
    c.lineTo(0.7, 0.18);
    c.lineTo(0.76, 0.34);
    c.lineTo(0.7, 0.44);
    c.lineTo(0.7, 0.8);
    c.quadraticCurveTo(0.6, 0.84, 0.5, 0.85);
    c.closePath();
    c.fill();
    c.strokeStyle = shade(col, -35);
    c.lineWidth = 0.05;
    c.beginPath();
    c.moveTo(0.32, 0.24);
    c.lineTo(0.66, 0.62);
    c.stroke();
    c.fillStyle = '#c9a23c';
    c.fillRect(0.46, 0.4, 0.07, 0.07);
    c.strokeStyle = shade(col, -30);
    c.lineWidth = 0.02;
    c.beginPath();
    c.moveTo(0.32, 0.76);
    c.lineTo(0.68, 0.76);
    c.stroke();
  },
  platebody: (c, col) => {
    // Cuirass with pauldron lobes, bright chest facet, dark fauld.
    c.fillStyle = shade(col, -14);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    for (const side of [-1, 1]) {
      c.beginPath();
      c.roundRect(0.5 + side * 0.24 - 0.14, 0.14, 0.28, 0.18, 0.06);
      c.fill();
      c.stroke();
    }
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0.3, 0.2);
    c.lineTo(0.7, 0.2);
    c.lineTo(0.74, 0.4);
    c.lineTo(0.68, 0.82);
    c.quadraticCurveTo(0.5, 0.9, 0.32, 0.82);
    c.lineTo(0.26, 0.4);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 22);
    c.beginPath();
    c.roundRect(0.38, 0.28, 0.24, 0.26, 0.04);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, -30);
    c.fillRect(0.3, 0.66, 0.4, 0.09);
    c.fillStyle = shade(col, -18);
    c.fillRect(0.32, 0.75, 0.36, 0.07);
  },
  hood: (c, col) => {
    // A draped cowl: peaked crown, deep shadowed face opening.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.5, 0.1);
    c.quadraticCurveTo(0.24, 0.2, 0.22, 0.52);
    c.quadraticCurveTo(0.2, 0.78, 0.3, 0.86);
    c.lineTo(0.7, 0.86);
    c.quadraticCurveTo(0.8, 0.78, 0.78, 0.52);
    c.quadraticCurveTo(0.76, 0.2, 0.5, 0.1);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = '#170f1c';
    c.beginPath();
    c.moveTo(0.34, 0.44);
    c.quadraticCurveTo(0.5, 0.36, 0.66, 0.44);
    c.lineTo(0.64, 0.74);
    c.quadraticCurveTo(0.5, 0.8, 0.36, 0.74);
    c.closePath();
    c.fill();
    c.fillStyle = shade(col, 20);
    c.beginPath();
    c.moveTo(0.5, 0.12);
    c.quadraticCurveTo(0.32, 0.2, 0.3, 0.4);
    c.lineTo(0.38, 0.4);
    c.quadraticCurveTo(0.4, 0.24, 0.52, 0.17);
    c.closePath();
    c.fill();
  },
  wizardhat: (c, col) => {
    // The folded cone over a broad brim — Gandalf, not a traffic cone.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.3, 0.62);
    c.quadraticCurveTo(0.36, 0.3, 0.58, 0.14);
    c.quadraticCurveTo(0.4, 0.16, 0.22, 0.1);
    c.quadraticCurveTo(0.38, 0.26, 0.44, 0.34);
    c.quadraticCurveTo(0.6, 0.4, 0.7, 0.62);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, -20);
    c.beginPath();
    c.moveTo(0.5, 0.6);
    c.quadraticCurveTo(0.5, 0.34, 0.58, 0.14);
    c.quadraticCurveTo(0.62, 0.34, 0.7, 0.62);
    c.closePath();
    c.fill();
    // Band + buckle above the brim.
    c.fillStyle = '#c9a23c';
    c.fillRect(0.32, 0.56, 0.36, 0.07);
    c.fillStyle = '#e8d06a';
    c.fillRect(0.46, 0.545, 0.08, 0.1);
    // The wide brim, lit on top.
    c.fillStyle = shade(col, 8);
    c.beginPath();
    c.ellipse(0.5, 0.68, 0.34, 0.1, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, -26);
    c.beginPath();
    c.ellipse(0.5, 0.71, 0.31, 0.06, 0, 0, Math.PI);
    c.fill();
  },
  greathelm: (c, col) => {
    // Full-face bucket: flat crown, breathing slits, dark eye slot.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.28, 0.2);
    c.lineTo(0.72, 0.2);
    c.lineTo(0.74, 0.78);
    c.quadraticCurveTo(0.5, 0.86, 0.26, 0.78);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 22);
    c.fillRect(0.3, 0.22, 0.4, 0.09);
    c.fillStyle = '#170f1c';
    c.beginPath();
    c.roundRect(0.3, 0.42, 0.4, 0.09, 0.03);
    c.fill();
    c.fillStyle = shade(col, -26);
    for (const x of [0.4, 0.5, 0.6]) c.fillRect(x - 0.014, 0.6, 0.028, 0.12);
    c.fillStyle = '#8a2f3c';
    c.beginPath();
    c.moveTo(0.42, 0.2);
    c.quadraticCurveTo(0.5, 0.04, 0.58, 0.2);
    c.closePath();
    c.fill();
    c.stroke();
  },
  circlet: (c, col) => {
    // A thin crown band with a center bloom/gem.
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.fillStyle = col;
    c.beginPath();
    c.ellipse(0.5, 0.55, 0.3, 0.2, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = '#241a2e';
    c.beginPath();
    c.ellipse(0.5, 0.55, 0.21, 0.12, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = shade(col, 26);
    c.beginPath();
    c.ellipse(0.42, 0.48, 0.1, 0.05, -0.5, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#79a355';
    c.beginPath();
    c.arc(0.5, 0.34, 0.09, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = shade('#79a355', 30);
    c.beginPath();
    c.arc(0.47, 0.31, 0.035, 0, Math.PI * 2);
    c.fill();
  },
  kiteshield: (c, col) => {
    // Tall kite: pointed foot, chevron blazon, bright rim edge.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.26, 0.18);
    c.lineTo(0.74, 0.18);
    c.lineTo(0.72, 0.5);
    c.lineTo(0.5, 0.88);
    c.lineTo(0.28, 0.5);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, -22);
    c.beginPath();
    c.moveTo(0.5, 0.18);
    c.lineTo(0.74, 0.18);
    c.lineTo(0.72, 0.5);
    c.lineTo(0.5, 0.88);
    c.closePath();
    c.fill();
    c.fillStyle = '#a4744b';
    c.beginPath();
    c.moveTo(0.32, 0.34);
    c.lineTo(0.5, 0.52);
    c.lineTo(0.68, 0.34);
    c.lineTo(0.68, 0.44);
    c.lineTo(0.5, 0.62);
    c.lineTo(0.32, 0.44);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 20);
    c.fillRect(0.26, 0.18, 0.48, 0.045);
  },
  orb: (c, col) => {
    // A faceted focus sphere on a small claw stand, glinting.
    c.fillStyle = '#6b5a38';
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.36, 0.84);
    c.lineTo(0.64, 0.84);
    c.lineTo(0.56, 0.68);
    c.lineTo(0.44, 0.68);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = col;
    c.beginPath();
    c.arc(0.5, 0.46, 0.26, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, -24);
    c.beginPath();
    c.arc(0.5, 0.46, 0.26, -Math.PI * 0.25, Math.PI * 0.75);
    c.fill();
    c.fillStyle = shade(col, 34);
    c.beginPath();
    c.ellipse(0.41, 0.36, 0.09, 0.06, -0.6, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f4efe4';
    c.beginPath();
    c.arc(0.38, 0.32, 0.03, 0, Math.PI * 2);
    c.fill();
  },
  shield: (c, col) => {
    // Spiked buckler: rim, boss, and four teeth that mean business.
    for (const a of [-Math.PI / 4, Math.PI / 4, (Math.PI * 3) / 4, (-Math.PI * 3) / 4]) {
      const sx = 0.5 + Math.cos(a) * 0.46;
      const sy = 0.5 + Math.sin(a) * 0.46;
      poly(c, '#dde2ea', [
        [0.5 + Math.cos(a + 0.42) * 0.27, 0.5 + Math.sin(a + 0.42) * 0.27],
        [sx, sy],
        [0.5 + Math.cos(a - 0.42) * 0.27, 0.5 + Math.sin(a - 0.42) * 0.27],
      ]);
    }
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.arc(0.5, 0.5, 0.3, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.strokeStyle = shade(col, -28);
    c.lineWidth = 0.045;
    c.beginPath();
    c.arc(0.5, 0.5, 0.225, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = shade(col, 22);
    c.beginPath();
    c.arc(0.42, 0.42, 0.09, 0, Math.PI * 2);
    c.fill();
    dot(c, '#d9a441', 0.5, 0.5, 0.075);
    dot(c, '#fff2cc', 0.475, 0.475, 0.026);
  },
  gem: (c, col) => {
    // A cut stone with a live heart — relic-grade sparkle.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.5, 0.12);
    c.lineTo(0.78, 0.42);
    c.lineTo(0.5, 0.88);
    c.lineTo(0.22, 0.42);
    c.closePath();
    c.fill();
    c.stroke();
    poly(c, shade(col, 30), [[0.5, 0.12], [0.64, 0.42], [0.36, 0.42]]);
    poly(c, shade(col, -24), [[0.64, 0.42], [0.78, 0.42], [0.5, 0.88]]);
    dot(c, '#fff2cc', 0.42, 0.3, 0.035);
  },
  totem: (c, col) => {
    // Carved watcher: stacked faces and spread wings.
    poly(c, shade(col, -18), [[0.14, 0.4], [0.36, 0.32], [0.36, 0.5], [0.16, 0.52]]);
    poly(c, shade(col, -18), [[0.86, 0.4], [0.64, 0.32], [0.64, 0.5], [0.84, 0.52]]);
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.roundRect(0.36, 0.14, 0.28, 0.72, 0.05);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 20);
    c.fillRect(0.4, 0.16, 0.08, 0.66);
    // Two carved faces: brows and hollow eyes.
    c.fillStyle = shade(col, -34);
    c.fillRect(0.38, 0.3, 0.24, 0.045);
    c.fillRect(0.38, 0.6, 0.24, 0.045);
    dot(c, '#170f1c', 0.44, 0.42, 0.032);
    dot(c, '#170f1c', 0.56, 0.42, 0.032);
    dot(c, '#170f1c', 0.44, 0.72, 0.032);
    dot(c, '#170f1c', 0.56, 0.72, 0.032);
  },
  trap: (c, col) => {
    // A snare's sprung jaws: two toothed arcs over a base plate.
    c.fillStyle = '#6a6274';
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.03;
    c.beginPath();
    c.ellipse(0.5, 0.72, 0.3, 0.11, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    for (const side of [-1, 1]) {
      // Open jaw arc with three bright teeth pointing inward.
      c.fillStyle = col;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 0.033;
      c.beginPath();
      c.moveTo(0.5 + side * 0.06, 0.7);
      c.quadraticCurveTo(0.5 + side * 0.36, 0.62, 0.5 + side * 0.34, 0.28);
      c.quadraticCurveTo(0.5 + side * 0.24, 0.4, 0.5 + side * 0.16, 0.52);
      c.closePath();
      c.fill();
      c.stroke();
      for (let i = 0; i < 3; i++) {
        const t = 0.3 + i * 0.28;
        const bx = 0.5 + side * (0.33 - t * 0.16);
        const by = 0.3 + t * 0.36;
        poly(c, '#e6e0d0', [
          [bx, by],
          [bx - side * 0.09, by - 0.02],
          [bx - side * 0.015, by + 0.075],
        ]);
      }
    }
    // Trigger plate + anchor ring.
    dot(c, shade(col, 24), 0.5, 0.7, 0.065);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.028;
    c.beginPath();
    c.arc(0.5, 0.7, 0.065, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = '#c9ccd4';
    c.lineWidth = 0.045;
    c.beginPath();
    c.arc(0.5, 0.87, 0.055, 0, Math.PI * 2);
    c.stroke();
  },
  bell: (c, col) => {
    // Storm bell mid-ring.
    bar(c, '#6b4a26', 0.38, 0.1, 0.24, 0.07);
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.42, 0.18);
    c.quadraticCurveTo(0.42, 0.14, 0.5, 0.14);
    c.quadraticCurveTo(0.58, 0.14, 0.58, 0.18);
    c.quadraticCurveTo(0.6, 0.44, 0.7, 0.58);
    c.lineTo(0.7, 0.66);
    c.lineTo(0.3, 0.66);
    c.lineTo(0.3, 0.58);
    c.quadraticCurveTo(0.4, 0.44, 0.42, 0.18);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 24);
    c.beginPath();
    c.moveTo(0.45, 0.18);
    c.quadraticCurveTo(0.44, 0.44, 0.38, 0.58);
    c.lineTo(0.45, 0.62);
    c.quadraticCurveTo(0.49, 0.4, 0.5, 0.18);
    c.closePath();
    c.fill();
    c.fillStyle = shade(col, -26);
    c.fillRect(0.3, 0.6, 0.4, 0.06);
    dot(c, shade(col, -35), 0.5, 0.74, 0.055);
    // Ring-out ticks.
    c.strokeStyle = '#fff2cc';
    c.lineWidth = 0.028;
    for (const side of [-1, 1]) {
      c.beginPath();
      c.arc(0.5, 0.42, 0.36, side === -1 ? Math.PI * 0.8 : -Math.PI * 0.2, side === -1 ? Math.PI * 1.0 : 0);
      c.stroke();
    }
  },
  decoy: (c, col) => {
    // You, allegedly: crossed poles and a stuffed shirt.
    bar(c, '#8a6a45', 0.47, 0.2, 0.06, 0.68);
    bar(c, '#8a6a45', 0.22, 0.34, 0.56, 0.055);
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.36, 0.4);
    c.lineTo(0.64, 0.4);
    c.lineTo(0.6, 0.72);
    c.lineTo(0.4, 0.72);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, -20);
    c.fillRect(0.54, 0.42, 0.07, 0.28);
    // Straw head with sprigs.
    dot(c, '#d4b36a', 0.5, 0.26, 0.11);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.03;
    c.beginPath();
    c.arc(0.5, 0.26, 0.11, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = '#b8933e';
    c.lineWidth = 0.025;
    for (const [x1, y1, x2, y2] of [
      [0.5, 0.14, 0.47, 0.06],
      [0.56, 0.16, 0.6, 0.08],
      [0.42, 0.17, 0.37, 0.1],
    ] as const) {
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.stroke();
    }
  },
  tome: (c, col) => {
    // A clasped grimoire wearing its element on the cover.
    c.fillStyle = shade(col, -32);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.roundRect(0.2, 0.16, 0.6, 0.68, 0.05);
    c.fill();
    c.stroke();
    c.fillStyle = col;
    c.beginPath();
    c.roundRect(0.28, 0.16, 0.52, 0.68, 0.05);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 16);
    c.fillRect(0.31, 0.19, 0.46, 0.09);
    // Clasp.
    bar(c, '#d9a441', 0.72, 0.44, 0.1, 0.12);
    // Flame sigil.
    c.fillStyle = '#ffd77a';
    c.beginPath();
    c.moveTo(0.5, 0.32);
    c.quadraticCurveTo(0.62, 0.46, 0.54, 0.6);
    c.quadraticCurveTo(0.5, 0.66, 0.46, 0.6);
    c.quadraticCurveTo(0.38, 0.46, 0.5, 0.32);
    c.fill();
    c.fillStyle = '#e8823d';
    c.beginPath();
    c.moveTo(0.5, 0.42);
    c.quadraticCurveTo(0.55, 0.5, 0.51, 0.58);
    c.quadraticCurveTo(0.46, 0.54, 0.47, 0.48);
    c.fill();
  },
  quiver: (c, col) => {
    // Canted quiver, three shafts ready.
    c.save();
    c.translate(0.5, 0.5);
    c.rotate(0.35);
    for (const off of [-0.09, 0, 0.09]) {
      c.strokeStyle = '#8a6a45';
      c.lineWidth = 0.035;
      c.beginPath();
      c.moveTo(off, -0.18);
      c.lineTo(off * 1.4, -0.42);
      c.stroke();
      poly(c, '#e6e0d0', [
        [off * 1.4 - 0.045, -0.38],
        [off * 1.4, -0.5],
        [off * 1.4 + 0.045, -0.38],
      ]);
    }
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.roundRect(-0.16, -0.22, 0.32, 0.62, 0.09);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 20);
    c.fillRect(-0.11, -0.18, 0.09, 0.52);
    c.fillStyle = shade(col, -24);
    c.beginPath();
    c.roundRect(-0.16, -0.22, 0.32, 0.1, 0.05);
    c.fill();
    c.stroke();
    bar(c, '#6b4a26', -0.18, 0.05, 0.36, 0.06);
    c.restore();
  },
  skull: (c, col) => {
    // The fallen champion's sigil: a crowned skull.
    poly(c, col, [
      [0.32, 0.3],
      [0.32, 0.14],
      [0.41, 0.22],
      [0.5, 0.12],
      [0.59, 0.22],
      [0.68, 0.14],
      [0.68, 0.3],
    ]);
    c.fillStyle = '#efe8d8';
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.arc(0.5, 0.48, 0.22, Math.PI * 0.95, Math.PI * 0.05);
    c.quadraticCurveTo(0.72, 0.66, 0.62, 0.68);
    c.lineTo(0.62, 0.76);
    c.lineTo(0.38, 0.76);
    c.lineTo(0.38, 0.68);
    c.quadraticCurveTo(0.28, 0.66, 0.28, 0.48);
    c.closePath();
    c.fill();
    c.stroke();
    dot(c, '#170f1c', 0.42, 0.5, 0.052);
    dot(c, '#170f1c', 0.58, 0.5, 0.052);
    poly(c, '#170f1c', [[0.5, 0.58], [0.535, 0.64], [0.465, 0.64]]);
    c.strokeStyle = shade('#efe8d8', -35);
    c.lineWidth = 0.022;
    for (const x of [0.44, 0.5, 0.56]) {
      c.beginPath();
      c.moveTo(x, 0.7);
      c.lineTo(x, 0.76);
      c.stroke();
    }
  },
  ring: (c, col) => {
    // A jeweler's band STANDING in three-quarter view: the hoop is an
    // ellipse with real thickness — near limb fat and lit, far limb
    // thin in shadow — crowned by a faceted stone cut from the metal's
    // own family so every band keeps one clean identity color.
    c.save();
    c.translate(0.5, 0.56);
    c.rotate(-0.12);
    // Far limb (inside of the hoop, in shadow).
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.15;
    c.beginPath();
    c.ellipse(0, 0, 0.22, 0.26, 0, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = shade(col, -22);
    c.lineWidth = 0.09;
    c.beginPath();
    c.ellipse(0, 0, 0.22, 0.26, 0, 0, Math.PI * 2);
    c.stroke();
    // Near limb: the lit outer half rides slightly low-left.
    c.strokeStyle = col;
    c.lineWidth = 0.095;
    c.beginPath();
    c.ellipse(0.012, 0.012, 0.225, 0.265, 0, Math.PI * 0.3, Math.PI * 1.25);
    c.stroke();
    // Band shine along the lit shoulder.
    c.strokeStyle = shade(col, 34);
    c.lineWidth = 0.042;
    c.beginPath();
    c.ellipse(0, 0, 0.245, 0.29, 0, Math.PI * 0.72, Math.PI * 1.1);
    c.stroke();
    // The crown: a bezel-set faceted stone at the top of the hoop.
    const gem = shade(col, 44);
    c.fillStyle = shade(col, -18);
    c.beginPath();
    c.ellipse(0, -0.3, 0.115, 0.1, 0, 0, Math.PI * 2);
    c.fill();
    poly(c, gem, [[0, -0.395], [0.082, -0.3], [0, -0.21], [-0.082, -0.3]]);
    poly(c, shade(gem, 24), [[0, -0.395], [0.041, -0.3], [-0.041, -0.3]]);
    dot(c, '#ffffff', -0.02, -0.345, 0.016);
    c.restore();
  },
  key: (c, col) => {
    // A warded strongchest key, bow up, laid on the diagonal so the
    // teeth read at 44px. Chunky flat masses, never thin scrollwork.
    c.save();
    c.translate(0.5, 0.5);
    c.rotate(Math.PI * 0.23);
    c.translate(-0.5, -0.5);
    // The bow: a squared ring with a diamond void.
    c.fillStyle = OUTLINE;
    c.fillRect(0.335, 0.045, 0.33, 0.33);
    c.fillStyle = col;
    c.fillRect(0.365, 0.075, 0.27, 0.27);
    c.fillStyle = shade(col, 24);
    c.fillRect(0.365, 0.075, 0.27, 0.075);
    c.fillStyle = OUTLINE;
    poly(c, OUTLINE, [[0.5, 0.115], [0.585, 0.21], [0.5, 0.305], [0.415, 0.21]]);
    // The shank, with a collar where the bow meets it.
    c.fillStyle = OUTLINE;
    c.fillRect(0.435, 0.36, 0.13, 0.5);
    c.fillStyle = col;
    c.fillRect(0.455, 0.375, 0.09, 0.475);
    c.fillStyle = shade(col, 22);
    c.fillRect(0.455, 0.375, 0.036, 0.475);
    c.fillStyle = shade(col, -18);
    c.fillRect(0.435, 0.42, 0.13, 0.045);
    // The teeth: two hard steps off the tip.
    c.fillStyle = OUTLINE;
    c.fillRect(0.545, 0.7, 0.17, 0.075);
    c.fillRect(0.545, 0.8, 0.24, 0.075);
    c.fillStyle = shade(col, -10);
    c.fillRect(0.56, 0.715, 0.135, 0.045);
    c.fillRect(0.56, 0.815, 0.205, 0.045);
    c.restore();
  },
  dungeonkey: (c, col) => {
    // The Riftgate's ward-key: heavy dark iron on the jaunty key
    // diagonal, its bow forged as a small RIFT RING — a violet-rimmed
    // portal void — over a thick shank and two blocky ward teeth.
    // `col` is the rift violet; the iron stays near-black so the glow
    // owns the read.
    const iron = '#4a4458';
    c.save();
    c.translate(0.5, 0.5);
    c.rotate(Math.PI * 0.21);
    c.translate(-0.5, -0.5);
    // The bow: a heavy iron annulus around the rift.
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.2;
    c.beginPath();
    c.arc(0.5, 0.26, 0.16, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = iron;
    c.lineWidth = 0.135;
    c.beginPath();
    c.arc(0.5, 0.26, 0.16, 0, Math.PI * 2);
    c.stroke();
    // Lit arris riding the ring's upper shoulder.
    c.strokeStyle = shade(iron, 26);
    c.lineWidth = 0.045;
    c.beginPath();
    c.arc(0.5, 0.26, 0.19, Math.PI * 0.85, Math.PI * 1.5);
    c.stroke();
    // The void the wards answer to, with its violet glow rim.
    c.fillStyle = '#161221';
    c.beginPath();
    c.arc(0.5, 0.26, 0.105, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = col;
    c.lineWidth = 0.036;
    c.beginPath();
    c.arc(0.5, 0.26, 0.096, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = shade(col, 30);
    c.lineWidth = 0.018;
    c.beginPath();
    c.arc(0.5, 0.26, 0.072, Math.PI * 0.65, Math.PI * 1.75);
    c.stroke();
    // Swallowed sparks drifting in the vortex.
    dot(c, shade(col, 44), 0.535, 0.225, 0.016);
    dot(c, col, 0.462, 0.3, 0.011);
    // Collar where the bow hands off to the shank.
    c.fillStyle = shade(iron, -16);
    c.fillRect(0.43, 0.42, 0.14, 0.05);
    // The shank: thick square-cut iron, lit west, shaded east.
    c.fillStyle = OUTLINE;
    c.fillRect(0.435, 0.42, 0.13, 0.45);
    c.fillStyle = iron;
    c.fillRect(0.452, 0.44, 0.096, 0.42);
    c.fillStyle = shade(iron, 22);
    c.fillRect(0.452, 0.44, 0.036, 0.42);
    c.fillStyle = shade(iron, -16);
    c.fillRect(0.514, 0.44, 0.034, 0.42);
    // A breath of the rift's charge running the shank groove.
    c.fillStyle = shade(col, -8);
    c.fillRect(0.492, 0.46, 0.018, 0.34);
    // Two blocky ward teeth off the tip, stepped like the lock they
    // were struck for.
    c.fillStyle = OUTLINE;
    c.fillRect(0.548, 0.69, 0.17, 0.08);
    c.fillRect(0.548, 0.795, 0.245, 0.08);
    c.fillStyle = iron;
    c.fillRect(0.562, 0.705, 0.14, 0.05);
    c.fillRect(0.562, 0.81, 0.215, 0.05);
    c.fillStyle = shade(iron, 18);
    c.fillRect(0.562, 0.705, 0.14, 0.02);
    c.fillRect(0.562, 0.81, 0.215, 0.02);
    c.restore();
  },
  nuggets: (c, col) => {
    // Fat blocky nuggets of the good stuff, stacked like a hoard.
    oreChunk(c, 0.36, 0.62, 0.33, 0.12, col);
    oreChunk(c, 0.67, 0.64, 0.29, -0.1, col);
    oreChunk(c, 0.5, 0.38, 0.31, -0.18, col);
    dot(c, '#fff2cc', 0.6, 0.27, 0.028);
  },
  dust: (c, col) => {
    // Ground enchantment: a poured mound of powder still holding the
    // pour's cone, motes lifting off it, four-point star glints where
    // the Arx catches — dust that refuses to sit still.
    c.save();
    c.translate(0.5, 0.6);
    // The mound: a soft cone with a spilled skirt.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.032;
    c.beginPath();
    c.moveTo(-0.34, 0.14);
    c.quadraticCurveTo(-0.2, 0.1, -0.12, -0.04);
    c.quadraticCurveTo(-0.04, -0.2, 0.02, -0.19);
    c.quadraticCurveTo(0.1, -0.16, 0.16, -0.02);
    c.quadraticCurveTo(0.24, 0.1, 0.35, 0.14);
    c.quadraticCurveTo(0.2, 0.22, 0, 0.22);
    c.quadraticCurveTo(-0.2, 0.22, -0.34, 0.14);
    c.closePath();
    c.fill();
    c.stroke();
    // Lit slope + settled shadow skirt.
    c.fillStyle = shade(col, 24);
    c.beginPath();
    c.moveTo(-0.11, -0.03);
    c.quadraticCurveTo(-0.04, -0.18, 0.015, -0.175);
    c.quadraticCurveTo(-0.01, -0.05, -0.02, 0.08);
    c.quadraticCurveTo(-0.08, 0.06, -0.11, -0.03);
    c.closePath();
    c.fill();
    c.fillStyle = shade(col, -18);
    c.beginPath();
    c.ellipse(0.1, 0.15, 0.18, 0.045, 0, 0, Math.PI);
    c.fill();
    // Star glints: four-point sparks on and above the pile.
    const star = (x: number, y: number, r: number): void => {
      c.fillStyle = '#fff6e8';
      c.beginPath();
      c.moveTo(x, y - r);
      c.quadraticCurveTo(x + r * 0.2, y - r * 0.2, x + r, y);
      c.quadraticCurveTo(x + r * 0.2, y + r * 0.2, x, y + r);
      c.quadraticCurveTo(x - r * 0.2, y + r * 0.2, x - r, y);
      c.quadraticCurveTo(x - r * 0.2, y - r * 0.2, x, y - r);
      c.fill();
    };
    star(-0.05, -0.08, 0.05);
    star(0.14, 0.04, 0.035);
    star(-0.2, 0.1, 0.03);
    // Motes drifting off the pour.
    dot(c, shade(col, 36), 0.12, -0.3, 0.022);
    dot(c, shade(col, 30), -0.16, -0.24, 0.017);
    dot(c, shade(col, 42), 0.24, -0.18, 0.014);
    c.restore();
  },
  chicken: (c, col) => {
    // The trussed bird, breast up on the board: plump keel, two
    // drumsticks tied over the tail end, wing folds tucked at the
    // sides — the roasting-pan read, honest and plucked.
    c.save();
    c.translate(0.48, 0.52);
    c.rotate(-0.08);
    // Body: deep-keeled oval, fatter at the breast (left).
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.034;
    c.beginPath();
    c.moveTo(-0.3, -0.06);
    c.quadraticCurveTo(-0.28, -0.24, -0.02, -0.24);
    c.quadraticCurveTo(0.2, -0.24, 0.28, -0.1);
    c.quadraticCurveTo(0.32, 0.04, 0.24, 0.14);
    c.quadraticCurveTo(0.06, 0.26, -0.14, 0.2);
    c.quadraticCurveTo(-0.32, 0.14, -0.3, -0.06);
    c.closePath();
    c.fill();
    c.stroke();
    // Breast highlight — the plump keel catching light.
    c.fillStyle = shade(col, 20);
    c.beginPath();
    c.ellipse(-0.12, -0.08, 0.13, 0.09, -0.25, 0, Math.PI * 2);
    c.fill();
    // Wing folds tucked against the flanks.
    c.fillStyle = shade(col, -12);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.026;
    c.beginPath();
    c.ellipse(-0.05, 0.1, 0.1, 0.055, 0.18, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    // The drumsticks: two plump legs crossed up over the tail end,
    // knuckles tipped in bone.
    for (const side of [-1, 1] as const) {
      c.fillStyle = shade(col, side < 0 ? 6 : -6);
      c.strokeStyle = OUTLINE;
      c.lineWidth = 0.028;
      c.beginPath();
      c.ellipse(0.27 + side * 0.02, side * 0.055 - 0.02, 0.13, 0.06, side * 0.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      dot(c, '#efe8d8', 0.38, side * 0.1 - 0.03, 0.036);
      dot(c, shade('#efe8d8', -22), 0.39, side * 0.1 - 0.03, 0.016);
    }
    // Twine truss around the drumstick ankles.
    c.strokeStyle = '#b0a068';
    c.lineWidth = 0.022;
    c.beginPath();
    c.moveTo(0.33, -0.08);
    c.lineTo(0.31, 0.06);
    c.stroke();
    c.restore();
  },
  chickenleg: (c, col) => {
    // The classic drumstick.
    c.save();
    c.translate(0.5, 0.5);
    c.rotate(-Math.PI / 5);
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.ellipse(-0.08, 0, 0.2, 0.16, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 20);
    c.beginPath();
    c.ellipse(-0.12, -0.05, 0.1, 0.06, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#efe8d8';
    c.lineWidth = 0.06;
    c.beginPath();
    c.moveTo(0.1, 0);
    c.lineTo(0.28, 0);
    c.stroke();
    dot(c, '#efe8d8', 0.32, -0.045, 0.045);
    dot(c, '#efe8d8', 0.32, 0.045, 0.045);
    c.restore();
  },
  coalpile: (c, col) => {
    // Blocky coal lumps, each glossed with one cold flat facet.
    oreChunk(c, 0.36, 0.62, 0.35, 0.1, col, '#8a86a0');
    oreChunk(c, 0.67, 0.64, 0.31, -0.16, col, '#8a86a0');
    oreChunk(c, 0.5, 0.39, 0.33, 0.06, col, '#8a86a0');
  },

  // ------------------------------------------- construction buildables
  // Icons for the build panel: each buildable drawn as the OBJECT it
  // places, in the same chunky flat language as the item art. Wood and
  // stone variants share a painter and speak through their tint.
  floortile: (c, col) => {
    // A laid floor square seen at a slight tilt, boards/flags scored in.
    c.save();
    c.translate(0.5, 0.52);
    c.rotate(-0.12);
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.rect(-0.32, -0.28, 0.64, 0.56);
    c.fill();
    c.stroke();
    // Course lines + one offset butt joint per course, like real decking.
    c.strokeStyle = shade(col, -26);
    c.lineWidth = 0.025;
    for (const y of [-0.09, 0.09]) {
      c.beginPath();
      c.moveTo(-0.32, y);
      c.lineTo(0.32, y);
      c.stroke();
    }
    for (const [x, y0, y1] of [[-0.08, -0.28, -0.09], [0.12, -0.09, 0.09], [-0.04, 0.09, 0.28]] as const) {
      c.beginPath();
      c.moveTo(x, y0);
      c.lineTo(x, y1);
      c.stroke();
    }
    c.fillStyle = shade(col, 22);
    c.fillRect(-0.32, -0.28, 0.64, 0.07);
    c.restore();
  },
  wallblock: (c, col) => {
    // A run of coursed masonry with a bright cap — the world wall's
    // raised-top read, shrunk to an icon.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.rect(0.18, 0.26, 0.64, 0.54);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 34);
    c.fillRect(0.18, 0.26, 0.64, 0.1);
    c.strokeStyle = shade(col, -28);
    c.lineWidth = 0.024;
    for (const y of [0.5, 0.66]) {
      c.beginPath();
      c.moveTo(0.18, y);
      c.lineTo(0.82, y);
      c.stroke();
    }
    // Staggered head joints sell the bond pattern.
    for (const [x, y0, y1] of [[0.44, 0.36, 0.5], [0.62, 0.5, 0.66], [0.36, 0.66, 0.8], [0.66, 0.66, 0.8]] as const) {
      c.beginPath();
      c.moveTo(x, y0);
      c.lineTo(x, y1);
      c.stroke();
    }
  },
  windowframe: (c, col) => {
    // A wall block pierced by a cross-mullioned window, glass catching sky.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.rect(0.18, 0.24, 0.64, 0.56);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 34);
    c.fillRect(0.18, 0.24, 0.64, 0.09);
    c.fillStyle = shade(col, -22);
    c.beginPath();
    c.roundRect(0.3, 0.4, 0.4, 0.32, 0.03);
    c.fill();
    c.fillStyle = '#9fc4e0';
    c.beginPath();
    c.roundRect(0.33, 0.43, 0.34, 0.26, 0.02);
    c.fill();
    c.fillStyle = '#c9e2f2';
    poly(c, '#c9e2f2', [[0.34, 0.55], [0.44, 0.43], [0.5, 0.43], [0.36, 0.6]]);
    // Mullion cross in the frame's own wood/stone.
    c.strokeStyle = shade(col, -22);
    c.lineWidth = 0.03;
    c.beginPath();
    c.moveTo(0.5, 0.43);
    c.lineTo(0.5, 0.69);
    c.moveTo(0.33, 0.56);
    c.lineTo(0.67, 0.56);
    c.stroke();
  },
  doorframe: (c, col) => {
    // A framed walk-through opening: jambs, a proud lintel, and dark
    // interior beyond — the icon reads "hole you may pass".
    c.fillStyle = '#241a2e';
    c.beginPath();
    c.rect(0.34, 0.36, 0.32, 0.44);
    c.fill();
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    for (const x of [0.22, 0.66]) {
      c.beginPath();
      c.rect(x, 0.3, 0.12, 0.5);
      c.fill();
      c.stroke();
    }
    c.beginPath();
    c.rect(0.16, 0.18, 0.68, 0.14);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 30);
    c.fillRect(0.16, 0.18, 0.68, 0.05);
    c.fillStyle = shade(col, -24);
    c.fillRect(0.28, 0.3, 0.06, 0.5);
    c.fillRect(0.72, 0.3, 0.06, 0.5);
  },
  archway: (c, col) => {
    // A freestanding arch: two piers and a keystoned curve over open air.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.18, 0.82);
    c.lineTo(0.18, 0.4);
    c.quadraticCurveTo(0.18, 0.16, 0.5, 0.16);
    c.quadraticCurveTo(0.82, 0.16, 0.82, 0.4);
    c.lineTo(0.82, 0.82);
    c.lineTo(0.68, 0.82);
    c.lineTo(0.68, 0.44);
    c.quadraticCurveTo(0.68, 0.3, 0.5, 0.3);
    c.quadraticCurveTo(0.32, 0.3, 0.32, 0.44);
    c.lineTo(0.32, 0.82);
    c.closePath();
    c.fill();
    c.stroke();
    // Keystone + springer joints.
    c.strokeStyle = shade(col, -26);
    c.lineWidth = 0.024;
    c.beginPath();
    c.moveTo(0.5, 0.16);
    c.lineTo(0.5, 0.3);
    c.moveTo(0.24, 0.32);
    c.lineTo(0.34, 0.4);
    c.moveTo(0.76, 0.32);
    c.lineTo(0.66, 0.4);
    c.stroke();
    c.fillStyle = shade(col, 26);
    c.fillRect(0.44, 0.17, 0.12, 0.06);
  },
  pillar: (c, col) => {
    // A column with capital and base; one bright flute keeps it round.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.rect(0.4, 0.28, 0.2, 0.44);
    c.fill();
    c.stroke();
    bar(c, shade(col, 18), 0.32, 0.16, 0.36, 0.12);
    bar(c, shade(col, 10), 0.3, 0.72, 0.4, 0.13);
    c.fillStyle = shade(col, 26);
    c.fillRect(0.43, 0.28, 0.05, 0.44);
    c.fillStyle = shade(col, -22);
    c.fillRect(0.54, 0.28, 0.04, 0.44);
  },
  railing: (c, col) => {
    // Two turned posts carrying a top rail and a lower stringer.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    for (const x of [0.26, 0.66]) {
      c.beginPath();
      c.roundRect(x, 0.3, 0.09, 0.5, 0.03);
      c.fill();
      c.stroke();
    }
    bar(c, shade(col, 18), 0.14, 0.32, 0.72, 0.09);
    bar(c, shade(col, -12), 0.18, 0.56, 0.64, 0.07);
    // Post caps.
    dot(c, shade(col, 30), 0.305, 0.3, 0.045);
    dot(c, shade(col, 30), 0.705, 0.3, 0.045);
  },
  fencebuild: (c, col) => {
    // The new pasture fence in miniature: two square-hewn capped
    // posts carrying a pair of chunky rails with lit top edges.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    for (const x of [0.2, 0.66]) {
      c.beginPath();
      c.rect(x, 0.2, 0.14, 0.62);
      c.fill();
      c.stroke();
    }
    for (const y of [0.34, 0.58]) {
      c.beginPath();
      c.rect(0.08, y, 0.84, 0.13);
      c.fillStyle = shade(col, 6);
      c.fill();
      c.stroke();
      bar(c, shade(col, 26), 0.08, y, 0.84, 0.045);
    }
    // Post caps read over the rails.
    c.fillStyle = col;
    for (const x of [0.2, 0.66]) {
      c.beginPath();
      c.rect(x, 0.2, 0.14, 0.62);
      c.fill();
      bar(c, shade(col, 30), x, 0.2, 0.14, 0.06);
    }
  },
  fencegate: (c, col) => {
    // A five-bar field gate: stout hinge posts, slatted bars, and the
    // signature Z-brace running hinge-heel to latch-head.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    for (const x of [0.08, 0.8]) {
      c.beginPath();
      c.rect(x, 0.16, 0.12, 0.68);
      c.fill();
      c.stroke();
      bar(c, shade(col, 30), x, 0.16, 0.12, 0.06);
    }
    // Bars, top one heaviest.
    bar(c, shade(col, 14), 0.2, 0.28, 0.6, 0.09);
    bar(c, shade(col, 2), 0.2, 0.46, 0.6, 0.065);
    bar(c, shade(col, -8), 0.2, 0.62, 0.6, 0.065);
    // The Z-brace.
    c.strokeStyle = shade(col, -26);
    c.lineWidth = 0.06;
    c.beginPath();
    c.moveTo(0.23, 0.68);
    c.lineTo(0.77, 0.31);
    c.stroke();
    // Iron hinge straps.
    c.fillStyle = '#3a3644';
    c.fillRect(0.17, 0.29, 0.1, 0.05);
    c.fillRect(0.17, 0.63, 0.1, 0.05);
  },
  garrisonwall: (c, col) => {
    // A crenellated curtain block: tall coursed body, two parapet
    // teeth with bright caps — the castellated silhouette at a glance.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.16, 0.86);
    c.lineTo(0.16, 0.3);
    c.lineTo(0.28, 0.3);
    c.lineTo(0.28, 0.18);
    c.lineTo(0.44, 0.18);
    c.lineTo(0.44, 0.3);
    c.lineTo(0.56, 0.3);
    c.lineTo(0.56, 0.18);
    c.lineTo(0.72, 0.18);
    c.lineTo(0.72, 0.3);
    c.lineTo(0.84, 0.3);
    c.lineTo(0.84, 0.86);
    c.closePath();
    c.fill();
    c.stroke();
    // Bright merlon caps + the wall-walk band.
    c.fillStyle = shade(col, 30);
    c.fillRect(0.28, 0.18, 0.16, 0.05);
    c.fillRect(0.56, 0.18, 0.16, 0.05);
    c.fillRect(0.16, 0.3, 0.68, 0.06);
    // Great ashlar bed joints + staggered heads.
    c.strokeStyle = shade(col, -28);
    c.lineWidth = 0.024;
    for (const y of [0.5, 0.66]) {
      c.beginPath();
      c.moveTo(0.16, y);
      c.lineTo(0.84, y);
      c.stroke();
    }
    for (const [x, y0, y1] of [[0.5, 0.38, 0.5], [0.34, 0.5, 0.66], [0.66, 0.5, 0.66], [0.5, 0.66, 0.86]] as const) {
      c.beginPath();
      c.moveTo(x, y0);
      c.lineTo(x, y1);
      c.stroke();
    }
    // The battered talus footing.
    c.fillStyle = shade(col, -20);
    c.fillRect(0.16, 0.78, 0.68, 0.08);
  },
  garrisongate: (c, col) => {
    // The gatehouse: crenellated brow over a voussoir arch, with the
    // raised portcullis showing its teeth in the opening.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.1, 0.88);
    c.lineTo(0.1, 0.26);
    c.lineTo(0.22, 0.26);
    c.lineTo(0.22, 0.14);
    c.lineTo(0.36, 0.14);
    c.lineTo(0.36, 0.26);
    c.lineTo(0.46, 0.26);
    c.lineTo(0.46, 0.18);
    c.lineTo(0.54, 0.18);
    c.lineTo(0.54, 0.26);
    c.lineTo(0.64, 0.26);
    c.lineTo(0.64, 0.14);
    c.lineTo(0.78, 0.14);
    c.lineTo(0.78, 0.26);
    c.lineTo(0.9, 0.26);
    c.lineTo(0.9, 0.88);
    c.closePath();
    c.fill();
    c.stroke();
    // The arched passage, dark.
    c.fillStyle = '#181226';
    c.beginPath();
    c.moveTo(0.3, 0.88);
    c.lineTo(0.3, 0.56);
    c.quadraticCurveTo(0.5, 0.34, 0.7, 0.56);
    c.lineTo(0.7, 0.88);
    c.closePath();
    c.fill();
    c.strokeStyle = OUTLINE;
    c.stroke();
    // Portcullis teeth hanging in the arch head.
    c.fillStyle = shade(col, -34);
    for (const x of [0.38, 0.48, 0.58]) {
      c.fillRect(x, 0.44, 0.04, 0.14);
    }
    // Keystone + bright cap band.
    c.fillStyle = shade(col, 30);
    c.fillRect(0.46, 0.36, 0.08, 0.08);
    c.fillRect(0.1, 0.26, 0.8, 0.05);
  },
  fencediag: (c, col) => {
    // The 45° turn: a capped post with rails striding away downhill.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.save();
    c.translate(0.5, 0.55);
    c.rotate(-Math.PI / 5.2);
    for (const y of [-0.15, 0.07]) {
      c.beginPath();
      c.rect(-0.44, y, 0.88, 0.1);
      c.fillStyle = shade(col, y < 0 ? 14 : -6);
      c.fill();
      c.stroke();
    }
    c.restore();
    c.fillStyle = col;
    c.beginPath();
    c.rect(0.43, 0.18, 0.14, 0.64);
    c.fill();
    c.stroke();
    bar(c, shade(col, 30), 0.43, 0.18, 0.14, 0.06);
  },
  barrel: (c, col) => {
    // Bulged oak staves bound by two dark iron hoops.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.3, 0.22);
    c.quadraticCurveTo(0.2, 0.5, 0.3, 0.8);
    c.lineTo(0.7, 0.8);
    c.quadraticCurveTo(0.8, 0.5, 0.7, 0.22);
    c.closePath();
    c.fill();
    c.stroke();
    // Stave seams follow the bulge.
    c.strokeStyle = shade(col, -24);
    c.lineWidth = 0.024;
    for (const x of [0.42, 0.58]) {
      c.beginPath();
      c.moveTo(x, 0.23);
      c.quadraticCurveTo(x + (x < 0.5 ? -0.03 : 0.03), 0.5, x, 0.79);
      c.stroke();
    }
    c.fillStyle = shade(col, 24);
    c.beginPath();
    c.moveTo(0.32, 0.22);
    c.quadraticCurveTo(0.27, 0.35, 0.29, 0.45);
    c.lineTo(0.36, 0.45);
    c.quadraticCurveTo(0.35, 0.33, 0.38, 0.22);
    c.closePath();
    c.fill();
    // Iron hoops.
    c.fillStyle = '#3a3644';
    c.fillRect(0.245, 0.32, 0.51, 0.055);
    c.fillRect(0.245, 0.62, 0.51, 0.055);
    bar(c, shade(col, 14), 0.3, 0.16, 0.4, 0.09);
  },
  crate: (c, col) => {
    // A planked shipping box with a cross-brace face.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.rect(0.22, 0.26, 0.56, 0.54);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 24);
    c.fillRect(0.22, 0.26, 0.56, 0.08);
    // Diagonal brace, then the frame rails over it.
    c.strokeStyle = shade(col, -22);
    c.lineWidth = 0.05;
    c.beginPath();
    c.moveTo(0.26, 0.76);
    c.lineTo(0.74, 0.36);
    c.stroke();
    c.fillStyle = shade(col, -14);
    c.fillRect(0.22, 0.26, 0.07, 0.54);
    c.fillRect(0.71, 0.26, 0.07, 0.54);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.024;
    c.strokeRect(0.29, 0.34, 0.42, 0.46);
  },
  table: (c, col) => {
    // A proper board on two sturdy legs, seen from the side.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    for (const x of [0.28, 0.62]) {
      c.beginPath();
      c.rect(x, 0.46, 0.1, 0.32);
      c.fill();
      c.stroke();
    }
    c.beginPath();
    c.roundRect(0.14, 0.32, 0.72, 0.13, 0.03);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 26);
    c.fillRect(0.16, 0.33, 0.68, 0.05);
    // Stretcher between the legs.
    bar(c, shade(col, -14), 0.34, 0.6, 0.32, 0.05);
  },
  chair: (c, col) => {
    // Side profile: tall back post, seat, two legs.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.roundRect(0.34, 0.14, 0.11, 0.44, 0.03);
    c.fill();
    c.stroke();
    c.beginPath();
    c.roundRect(0.3, 0.5, 0.42, 0.11, 0.03);
    c.fill();
    c.stroke();
    for (const x of [0.34, 0.6]) {
      c.beginPath();
      c.rect(x, 0.61, 0.09, 0.24);
      c.fill();
      c.stroke();
    }
    c.fillStyle = shade(col, 26);
    c.fillRect(0.32, 0.51, 0.38, 0.04);
    c.fillRect(0.36, 0.16, 0.04, 0.4);
  },
  bench: (c, col) => {
    // The table lowered and lightened: a long backless seat.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    for (const x of [0.22, 0.68]) {
      c.beginPath();
      c.rect(x, 0.56, 0.1, 0.24);
      c.fill();
      c.stroke();
    }
    c.beginPath();
    c.roundRect(0.12, 0.44, 0.76, 0.12, 0.03);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 26);
    c.fillRect(0.14, 0.45, 0.72, 0.045);
    bar(c, shade(col, -14), 0.28, 0.66, 0.44, 0.05);
  },
  bed: (c, col) => {
    // Headboard, white pillow, and a blanket in the bed's own color.
    c.fillStyle = '#8a6534';
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.roundRect(0.14, 0.22, 0.14, 0.5, 0.04);
    c.fill();
    c.stroke();
    // Mattress slab.
    c.fillStyle = '#e8e4da';
    c.beginPath();
    c.roundRect(0.24, 0.4, 0.62, 0.24, 0.05);
    c.fill();
    c.stroke();
    // Blanket tucked over the foot half.
    c.fillStyle = col;
    c.beginPath();
    c.roundRect(0.44, 0.38, 0.42, 0.28, 0.05);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 22);
    c.fillRect(0.46, 0.4, 0.06, 0.24);
    // Pillow.
    c.fillStyle = '#f4f2ec';
    c.beginPath();
    c.roundRect(0.28, 0.34, 0.16, 0.14, 0.05);
    c.fill();
    c.stroke();
    // Foot leg.
    bar(c, '#8a6534', 0.78, 0.62, 0.08, 0.16);
  },
  bookshelf: (c, col) => {
    // A tall case, two shelves, spines in library colors.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.rect(0.24, 0.14, 0.52, 0.7);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 20);
    c.fillRect(0.24, 0.14, 0.52, 0.07);
    c.fillStyle = shade(col, -32);
    c.fillRect(0.3, 0.24, 0.4, 0.26);
    c.fillRect(0.3, 0.54, 0.4, 0.24);
    // Spines: varied heights, a couple leaning.
    const spines: Array<[number, number, number, string]> = [
      [0.31, 0.28, 0.07, '#a34434'], [0.39, 0.26, 0.06, '#4c6a9c'], [0.46, 0.3, 0.07, '#7a8a4a'],
      [0.54, 0.27, 0.08, '#8a5cc4'], [0.31, 0.58, 0.08, '#c9a23c'], [0.4, 0.56, 0.06, '#4c6a9c'],
      [0.47, 0.6, 0.07, '#a34434'], [0.55, 0.57, 0.07, '#3f7d6a'],
    ];
    for (const [x, y, w, color] of spines) {
      c.fillStyle = color;
      c.fillRect(x, y, w, y < 0.5 ? 0.5 - y : 0.78 - y);
    }
  },
  counter: (c, col) => {
    // A service counter: overhanging bright top, paneled front.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.rect(0.22, 0.42, 0.56, 0.38);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, -22);
    c.beginPath();
    c.roundRect(0.28, 0.5, 0.19, 0.22, 0.02);
    c.fill();
    c.beginPath();
    c.roundRect(0.53, 0.5, 0.19, 0.22, 0.02);
    c.fill();
    c.fillStyle = shade(col, 34);
    c.strokeStyle = OUTLINE;
    c.beginPath();
    c.roundRect(0.14, 0.3, 0.72, 0.13, 0.03);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 12);
    c.fillRect(0.16, 0.38, 0.68, 0.04);
  },
  hearth: (c, col) => {
    // A stone firebox with a live flame — the home's warm heart.
    c.fillStyle = '#6e6a75';
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.rect(0.18, 0.3, 0.64, 0.5);
    c.fill();
    c.stroke();
    bar(c, '#827e8a', 0.12, 0.2, 0.76, 0.12);
    // Mortar joints.
    c.strokeStyle = shade('#6e6a75', -24);
    c.lineWidth = 0.022;
    for (const [x, y0, y1] of [[0.3, 0.32, 0.42], [0.62, 0.32, 0.42], [0.24, 0.66, 0.78], [0.72, 0.66, 0.78]] as const) {
      c.beginPath();
      c.moveTo(x, y0);
      c.lineTo(x, y1);
      c.stroke();
    }
    // Arched firebox, then the flame in the buildable's ember color.
    c.fillStyle = '#241a2e';
    c.beginPath();
    c.moveTo(0.32, 0.78);
    c.lineTo(0.32, 0.55);
    c.quadraticCurveTo(0.5, 0.42, 0.68, 0.55);
    c.lineTo(0.68, 0.78);
    c.closePath();
    c.fill();
    poly(c, col, [[0.42, 0.76], [0.46, 0.6], [0.5, 0.68], [0.55, 0.56], [0.6, 0.76]]);
    poly(c, '#f2d060', [[0.46, 0.76], [0.5, 0.68], [0.55, 0.76]]);
  },
  signpost: (c, col) => {
    // A post and bracket with a shingle swinging on two twine drops.
    c.fillStyle = '#5e3f1e';
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.roundRect(0.26, 0.14, 0.1, 0.7, 0.03);
    c.fill();
    c.stroke();
    bar(c, '#5e3f1e', 0.26, 0.18, 0.5, 0.07);
    // Twine drops.
    c.strokeStyle = '#b0a068';
    c.lineWidth = 0.025;
    for (const x of [0.48, 0.68]) {
      c.beginPath();
      c.moveTo(x, 0.25);
      c.lineTo(x, 0.36);
      c.stroke();
    }
    // The shingle itself carries the tint.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.roundRect(0.4, 0.36, 0.36, 0.24, 0.04);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 22);
    c.fillRect(0.42, 0.38, 0.32, 0.05);
    c.strokeStyle = shade(col, -30);
    c.lineWidth = 0.025;
    c.beginPath();
    c.moveTo(0.46, 0.48);
    c.lineTo(0.7, 0.48);
    c.moveTo(0.46, 0.54);
    c.lineTo(0.64, 0.54);
    c.stroke();
  },
  timberpost: (c, col) => {
    // A hewn post: plinth, shaft with lit facet, capped square.
    c.fillStyle = shade(col, -10);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.fillRect(0.36, 0.74, 0.28, 0.12);
    c.strokeRect(0.36, 0.74, 0.28, 0.12);
    c.fillStyle = col;
    c.fillRect(0.42, 0.28, 0.16, 0.46);
    c.strokeRect(0.42, 0.28, 0.16, 0.46);
    c.fillStyle = shade(col, 22);
    c.fillRect(0.42, 0.28, 0.05, 0.46);
    c.fillStyle = shade(col, -4);
    c.fillRect(0.38, 0.18, 0.24, 0.1);
    c.strokeRect(0.38, 0.18, 0.24, 0.1);
    c.fillStyle = shade(col, 30);
    c.fillRect(0.38, 0.15, 0.24, 0.04);
  },
  pennants: (c, col) => {
    // Three long pennons on their rail, cream-bordered in the dye.
    c.fillStyle = '#2c2836';
    c.fillRect(0.08, 0.16, 0.84, 0.05);
    for (const [i, x] of [0.13, 0.41, 0.69].entries()) {
      const len = i === 1 ? 0.66 : 0.52;
      c.fillStyle = '#e8dcc4';
      c.strokeStyle = OUTLINE;
      c.lineWidth = 0.035;
      c.beginPath();
      c.moveTo(x, 0.21);
      c.lineTo(x + 0.18, 0.21);
      c.lineTo(x + 0.09, 0.21 + len);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(x + 0.035, 0.24);
      c.lineTo(x + 0.145, 0.24);
      c.lineTo(x + 0.09, 0.21 + len - 0.1);
      c.closePath();
      c.fill();
    }
  },
  brasign: (c, col) => {
    // The wrought arm and its swinging shingle.
    c.strokeStyle = '#454052';
    c.lineWidth = 0.05;
    c.beginPath();
    c.moveTo(0.2, 0.16);
    c.lineTo(0.2, 0.5);
    c.moveTo(0.2, 0.22);
    c.lineTo(0.74, 0.26);
    c.stroke();
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.roundRect(0.34, 0.34, 0.42, 0.34, 0.03);
    c.fill();
    c.stroke();
    c.fillStyle = '#e8dcc4';
    c.beginPath();
    c.arc(0.55, 0.51, 0.09, 0, Math.PI * 2);
    c.fill();
  },
  trellisicon: (c, col) => {
    // Lattice with a vine winding through.
    c.strokeStyle = '#7a5c34';
    c.lineWidth = 0.05;
    c.strokeRect(0.24, 0.2, 0.52, 0.6);
    c.beginPath();
    c.moveTo(0.24, 0.2);
    c.lineTo(0.76, 0.8);
    c.moveTo(0.76, 0.2);
    c.lineTo(0.24, 0.8);
    c.stroke();
    for (const [x, y] of [
      [0.34, 0.62],
      [0.5, 0.44],
      [0.66, 0.3],
    ] as const) {
      dot(c, col, x, y, 0.075);
    }
  },
  wallbasket: (c, col) => {
    // A wicker bowl on a peg, blooms above the rim.
    c.strokeStyle = '#454052';
    c.lineWidth = 0.04;
    c.beginPath();
    c.moveTo(0.5, 0.14);
    c.lineTo(0.5, 0.3);
    c.stroke();
    for (const [i, x] of [0.36, 0.5, 0.64].entries()) {
      dot(c, i === 1 ? shade(col, 35) : col, x, 0.36, 0.07);
    }
    c.fillStyle = '#a8814c';
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.24, 0.44);
    c.lineTo(0.76, 0.44);
    c.quadraticCurveTo(0.68, 0.74, 0.5, 0.75);
    c.quadraticCurveTo(0.32, 0.74, 0.24, 0.44);
    c.closePath();
    c.fill();
    c.stroke();
  },
  awning: (c, col) => {
    // A sloped canvas off a wall bar: trapezoid spread toward the
    // viewer, three valance teeth swinging under the hem.
    c.fillStyle = shade(col, -25);
    c.fillRect(0.22, 0.24, 0.56, 0.07);
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.26, 0.3);
    c.lineTo(0.74, 0.3);
    c.lineTo(0.84, 0.62);
    c.lineTo(0.16, 0.62);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 22);
    c.fillRect(0.2, 0.5, 0.6, 0.1);
    c.fillStyle = shade(col, -14);
    for (const x of [0.2, 0.42, 0.64]) {
      c.beginPath();
      c.moveTo(x, 0.61);
      c.lineTo(x + 0.18, 0.61);
      c.quadraticCurveTo(x + 0.09, 0.74, x, 0.61);
      c.closePath();
      c.fill();
    }
  },
  flowerbox: (c, col) => {
    // A timber trough with three blooms nodding over the rim.
    // Stems first so the box overlaps them.
    c.strokeStyle = '#4f7c35';
    c.lineWidth = 0.035;
    for (const x of [0.32, 0.5, 0.68]) {
      c.beginPath();
      c.moveTo(x, 0.52);
      c.lineTo(x, 0.4);
      c.stroke();
    }
    for (const [i, x] of [0.32, 0.5, 0.68].entries()) {
      dot(c, col, x, 0.34, 0.075);
      dot(c, shade(col, i === 1 ? 45 : 30), x, 0.34, 0.032);
    }
    c.fillStyle = '#6f4d26';
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.2, 0.52);
    c.lineTo(0.8, 0.52);
    c.lineTo(0.74, 0.76);
    c.lineTo(0.26, 0.76);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = shade('#6f4d26', 22);
    c.fillRect(0.22, 0.53, 0.56, 0.06);
    c.strokeStyle = shade('#6f4d26', -24);
    c.lineWidth = 0.024;
    for (const x of [0.4, 0.6]) {
      c.beginPath();
      c.moveTo(x, 0.6);
      c.lineTo(x, 0.75);
      c.stroke();
    }
  },
  stallcanopy: (c, col) => {
    // A market stall: striped awning pitched over a plank counter.
    c.fillStyle = '#7a552e';
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    for (const x of [0.22, 0.72]) {
      c.beginPath();
      c.rect(x, 0.32, 0.06, 0.42);
      c.fill();
      c.stroke();
    }
    c.beginPath();
    c.roundRect(0.16, 0.58, 0.68, 0.2, 0.03);
    c.fill();
    c.stroke();
    c.fillStyle = shade('#7a552e', 24);
    c.fillRect(0.18, 0.59, 0.64, 0.06);
    // Awning: canted sheet with a scalloped drop edge, striped in col.
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0.12, 0.36);
    c.lineTo(0.5, 0.16);
    c.lineTo(0.88, 0.36);
    c.lineTo(0.84, 0.44);
    c.quadraticCurveTo(0.775, 0.38, 0.71, 0.44);
    c.quadraticCurveTo(0.645, 0.38, 0.58, 0.44);
    c.quadraticCurveTo(0.5, 0.38, 0.42, 0.44);
    c.quadraticCurveTo(0.355, 0.38, 0.29, 0.44);
    c.quadraticCurveTo(0.225, 0.38, 0.16, 0.44);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = '#f2efe6';
    for (const x of [0.29, 0.55]) {
      c.fillRect(x, 0.245, 0.11, 0.155);
    }
  },
  campfirebuild: (c, col) => {
    // Crossed logs under a fat flame — the tile's warm invitation.
    for (const flip of [1, -1]) {
      c.save();
      c.translate(0.5, 0.74);
      c.rotate(0.35 * flip);
      c.fillStyle = '#8a6a45';
      c.strokeStyle = OUTLINE;
      c.lineWidth = 0.035;
      c.beginPath();
      c.roundRect(-0.3, -0.05, 0.6, 0.11, 0.05);
      c.fill();
      c.stroke();
      c.restore();
    }
    poly(c, col, [[0.34, 0.66], [0.4, 0.42], [0.47, 0.52], [0.5, 0.26], [0.58, 0.48], [0.63, 0.4], [0.66, 0.66]]);
    poly(c, '#f2d060', [[0.43, 0.66], [0.5, 0.44], [0.58, 0.66]]);
  },
  furnacebuild: (c, col) => {
    // A squat stone kiln with a glowing mouth and a chimney stub.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.24, 0.8);
    c.lineTo(0.24, 0.36);
    c.quadraticCurveTo(0.24, 0.24, 0.4, 0.22);
    c.lineTo(0.6, 0.22);
    c.quadraticCurveTo(0.76, 0.24, 0.76, 0.36);
    c.lineTo(0.76, 0.8);
    c.closePath();
    c.fill();
    c.stroke();
    bar(c, shade(col, -14), 0.42, 0.1, 0.16, 0.14);
    c.fillStyle = shade(col, 22);
    c.fillRect(0.28, 0.26, 0.2, 0.07);
    // Mortar joints.
    c.strokeStyle = shade(col, -26);
    c.lineWidth = 0.024;
    c.beginPath();
    c.moveTo(0.26, 0.44);
    c.lineTo(0.74, 0.44);
    c.moveTo(0.4, 0.44);
    c.lineTo(0.4, 0.55);
    c.moveTo(0.6, 0.44);
    c.lineTo(0.6, 0.55);
    c.stroke();
    // The mouth, banked with fire.
    c.fillStyle = '#241a2e';
    c.beginPath();
    c.moveTo(0.36, 0.8);
    c.lineTo(0.36, 0.62);
    c.quadraticCurveTo(0.5, 0.52, 0.64, 0.62);
    c.lineTo(0.64, 0.8);
    c.closePath();
    c.fill();
    poly(c, '#e8573d', [[0.42, 0.78], [0.46, 0.64], [0.5, 0.7], [0.55, 0.62], [0.59, 0.78]]);
    poly(c, '#f2c94c', [[0.46, 0.78], [0.5, 0.7], [0.55, 0.78]]);
  },
  anvilbuild: (c, col) => {
    // The classic profile: horn, face, waist, block base.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.14, 0.34);
    c.quadraticCurveTo(0.14, 0.46, 0.3, 0.48);
    c.lineTo(0.42, 0.48);
    c.lineTo(0.4, 0.58);
    c.lineTo(0.32, 0.62);
    c.lineTo(0.32, 0.66);
    c.lineTo(0.68, 0.66);
    c.lineTo(0.68, 0.62);
    c.lineTo(0.6, 0.58);
    c.lineTo(0.58, 0.48);
    c.lineTo(0.84, 0.46);
    c.quadraticCurveTo(0.86, 0.32, 0.66, 0.3);
    c.lineTo(0.3, 0.3);
    c.quadraticCurveTo(0.14, 0.3, 0.14, 0.34);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 30);
    c.fillRect(0.28, 0.31, 0.5, 0.05);
    // Wooden stump base.
    c.fillStyle = '#6b4a26';
    c.beginPath();
    c.roundRect(0.28, 0.66, 0.44, 0.16, 0.03);
    c.fill();
    c.stroke();
    c.fillStyle = shade('#6b4a26', -22);
    c.fillRect(0.34, 0.7, 0.05, 0.12);
    c.fillRect(0.6, 0.7, 0.05, 0.12);
  },
  lamppostbuild: (c, col) => {
    // An iron post crowned by a warm glass lantern.
    c.fillStyle = '#3a3444';
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.roundRect(0.45, 0.34, 0.1, 0.52, 0.03);
    c.fill();
    c.stroke();
    bar(c, '#3a3444', 0.36, 0.82, 0.28, 0.07);
    // Lantern cage: cap, glass, base.
    poly(c, '#3a3444', [[0.34, 0.18], [0.5, 0.1], [0.66, 0.18]]);
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0.37, 0.18);
    c.lineTo(0.63, 0.18);
    c.lineTo(0.6, 0.34);
    c.lineTo(0.4, 0.34);
    c.closePath();
    c.fill();
    c.stroke();
    dot(c, '#fff2cc', 0.5, 0.255, 0.05);
    bar(c, '#3a3444', 0.38, 0.33, 0.24, 0.05);
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
  // The recipe scroll: rolled parchment lying on the diagonal, bound
  // by a ribbon in the profession's ink and sealed with a wax drop —
  // knowledge still wrapped, unlike the flat enchant scroll.
  recipe: (c, col) => {
    const parch = '#d8c69a';
    c.translate(0.5, 0.5);
    c.rotate(-Math.PI / 8);
    c.fillStyle = parch;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.roundRect(-0.32, -0.13, 0.64, 0.26, 0.04);
    c.fill();
    c.stroke();
    // Rolled ends: darker cores peeking out of each end of the tube.
    c.fillStyle = shade(parch, -34);
    for (const x of [-0.32, 0.24] as const) {
      c.beginPath();
      c.roundRect(x, -0.11, 0.08, 0.22, 0.035);
      c.fill();
      c.stroke();
    }
    // The profession's ribbon, cinched off-center, wax drop on the knot.
    c.fillStyle = col;
    c.beginPath();
    c.roundRect(-0.07, -0.15, 0.14, 0.3, 0.03);
    c.fill();
    c.stroke();
    dot(c, shade(col, -28), 0, 0.02, 0.055);
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
  seeds: (c, col) => {
    // A tied burlap seed pouch, three seeds spilled at its foot in the
    // crop's identity color — the family painter for every seed.
    poly(c, '#a5824e', [
      [0.3, 0.34], [0.7, 0.34], [0.78, 0.56], [0.72, 0.76], [0.28, 0.76], [0.22, 0.56],
    ]);
    c.fillStyle = shade('#a5824e', 22);
    c.beginPath();
    c.moveTo(0.32, 0.38);
    c.lineTo(0.66, 0.38);
    c.lineTo(0.7, 0.52);
    c.lineTo(0.3, 0.52);
    c.closePath();
    c.fill();
    // Cinched neck + tie.
    bar(c, '#7d5a2e', 0.4, 0.24, 0.2, 0.12);
    bar(c, col, 0.38, 0.28, 0.24, 0.045);
    // Spilled seeds: chunky teardrop kernels.
    for (const [x, y, r] of [[0.24, 0.86, 0.05], [0.44, 0.9, 0.055], [0.66, 0.87, 0.05]] as const) {
      c.fillStyle = col;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 0.028;
      c.beginPath();
      c.ellipse(x, y, r * 1.25, r, -0.4, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = shade(col, 30);
      c.beginPath();
      c.ellipse(x - r * 0.3, y - r * 0.3, r * 0.4, r * 0.28, -0.4, 0, Math.PI * 2);
      c.fill();
    }
  },
  carrot: (c, col) => {
    c.save();
    c.translate(0.5, 0.55);
    c.rotate(0.5);
    // Tapered root with rib lines.
    poly(c, col, [[-0.3, -0.12], [0.05, -0.14], [0.34, -0.03], [0.34, 0.03], [0.05, 0.14], [-0.3, 0.12]]);
    c.fillStyle = shade(col, 26);
    c.beginPath();
    c.moveTo(-0.28, -0.09);
    c.lineTo(0.08, -0.1);
    c.lineTo(0.26, -0.03);
    c.lineTo(-0.28, -0.03);
    c.closePath();
    c.fill();
    c.strokeStyle = shade(col, -24);
    c.lineWidth = 0.024;
    for (const x of [-0.16, -0.02, 0.12]) {
      c.beginPath();
      c.moveTo(x, -0.1 + Math.abs(x) * 0.14);
      c.lineTo(x + 0.03, 0.1 - Math.abs(x) * 0.14);
      c.stroke();
    }
    // Frilly green top.
    for (const a of [-0.5, 0, 0.5]) {
      poly(c, '#5f9c46', [[-0.3, 0], [-0.46 - 0.06 * Math.cos(a), -0.16 * a - 0.1], [-0.38, 0.02]]);
    }
    c.restore();
  },
  herb: (c, col) => {
    // Sagewort as it grows: a fan of chamfered paddle spears with
    // silver midribs under a stacked silver floret crown.
    const spear = (rot: number, len: number, tint: number) => {
      c.save();
      c.translate(0.5, 0.86);
      c.rotate(rot);
      poly(c, shade(col, tint), [
        [0, 0.02],
        [-0.085, -len * 0.42],
        [0, -len],
        [0.085, -len * 0.42],
      ]);
      // Silver midrib — the healer's-herb signature.
      poly(c, '#d4e4c8', [[0, -len * 0.3], [-0.028, -len * 0.55], [0, -len * 0.92], [0.028, -len * 0.55]]);
      c.restore();
    };
    spear(-1.05, 0.42, -18);
    spear(1.05, 0.42, -18);
    spear(-0.55, 0.52, -6);
    spear(0.55, 0.52, -6);
    // The floret tower rising from the heart.
    c.save();
    c.translate(0.5, 0.86);
    poly(c, shade(col, 6), [[-0.05, 0], [-0.026, -0.52], [0.026, -0.52], [0.05, 0]]);
    c.restore();
    for (let k = 0; k < 4; k++) {
      const fw = 0.24 - k * 0.045;
      const fy = 0.34 - k * 0.09;
      poly(c, k >= 2 ? '#f2f8ec' : k === 1 ? '#d8e8cc' : '#b9d4ae', [
        [0.5 - fw / 2, fy],
        [0.5 + fw / 2, fy],
        [0.5 + fw / 2 - 0.02, fy - 0.075],
        [0.5 - fw / 2 + 0.02, fy - 0.075],
      ]);
    }
  },
  sunflower: (c, col) => {
    // Stem + one leaf.
    c.strokeStyle = '#5f8a44';
    c.lineWidth = 0.05;
    c.beginPath();
    c.moveTo(0.5, 0.92);
    c.quadraticCurveTo(0.54, 0.66, 0.5, 0.46);
    c.stroke();
    poly(c, '#5f9c46', [[0.52, 0.72], [0.68, 0.62], [0.74, 0.72], [0.6, 0.78]]);
    // Petal ring: chunky diamonds around the head.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      c.save();
      c.translate(0.5 + Math.cos(a) * 0.19, 0.34 + Math.sin(a) * 0.19);
      c.rotate(a);
      poly(c, i % 2 ? col : shade(col, 16), [[-0.02, -0.05], [0.12, 0], [-0.02, 0.05]]);
      c.restore();
    }
    // Seed heart with a lit crescent.
    dot(c, '#6b4a26', 0.5, 0.34, 0.13);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.03;
    c.beginPath();
    c.arc(0.5, 0.34, 0.13, 0, Math.PI * 2);
    c.stroke();
    dot(c, '#8a6534', 0.47, 0.31, 0.07);
  },
  wheat: (c, col) => {
    // A tied sheaf of three stalks, heads heavy with grain.
    c.strokeStyle = shade(col, -20);
    c.lineWidth = 0.04;
    for (const [x0, x1] of [[0.36, 0.3], [0.5, 0.5], [0.64, 0.7]] as const) {
      c.beginPath();
      c.moveTo(0.5, 0.88);
      c.quadraticCurveTo(x0, 0.6, x1, 0.36);
      c.stroke();
    }
    bar(c, '#8a6534', 0.4, 0.68, 0.2, 0.08);
    // Grain heads: stacked kernel pairs.
    for (const [hx, hy] of [[0.3, 0.36], [0.5, 0.5], [0.7, 0.36]] as const) {
      for (let i = 0; i < 4; i++) {
        const y = hy - i * 0.075;
        const s = 0.055 - i * 0.007;
        for (const side of [-1, 1]) {
          c.fillStyle = i % 2 ? col : shade(col, 18);
          c.strokeStyle = OUTLINE;
          c.lineWidth = 0.022;
          c.beginPath();
          c.ellipse(hx + side * s * 0.8, y, s, s * 0.55, side * 0.7, 0, Math.PI * 2);
          c.fill();
          c.stroke();
        }
      }
    }
  },
  cottonpuff: (c, col) => {
    // A dry branched stem holding three fat bolls.
    c.strokeStyle = '#8a6534';
    c.lineWidth = 0.04;
    c.beginPath();
    c.moveTo(0.5, 0.9);
    c.lineTo(0.5, 0.6);
    c.moveTo(0.5, 0.66);
    c.lineTo(0.3, 0.44);
    c.moveTo(0.5, 0.6);
    c.lineTo(0.7, 0.42);
    c.stroke();
    for (const [x, y, r] of [[0.3, 0.36, 0.13], [0.7, 0.34, 0.13], [0.5, 0.5, 0.14]] as const) {
      // Boll cup.
      poly(c, '#7d5a2e', [[x - r * 0.7, y + r * 0.5], [x, y + r * 1.1], [x + r * 0.7, y + r * 0.5]]);
      // Puff: three lobes + lit crown.
      c.fillStyle = col;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 0.028;
      c.beginPath();
      c.arc(x - r * 0.5, y + r * 0.15, r * 0.6, 0, Math.PI * 2);
      c.arc(x + r * 0.5, y + r * 0.15, r * 0.6, 0, Math.PI * 2);
      c.arc(x, y - r * 0.25, r * 0.7, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      dot(c, '#ffffff', x - r * 0.25, y - r * 0.4, r * 0.28);
    }
  },
  bells: (c, col) => {
    // Moonbell: a thick arched stem hanging two faceted lanterns
    // with hot moon-white cores, haloed like the wild plant at dusk.
    c.strokeStyle = '#46695c';
    c.lineCap = 'round';
    c.lineWidth = 0.07;
    c.beginPath();
    c.moveTo(0.26, 0.92);
    c.quadraticCurveTo(0.3, 0.28, 0.74, 0.22);
    c.stroke();
    for (const [x, y, s] of [[0.44, 0.56, 0.15], [0.76, 0.48, 0.18]] as const) {
      dot(c, 'rgba(170, 188, 255, 0.35)', x, y, s * 1.55);
      c.strokeStyle = '#46695c';
      c.lineWidth = 0.032;
      c.beginPath();
      c.moveTo(x - s * 0.2, y - s * 1.5);
      c.lineTo(x, y - s * 0.6);
      c.stroke();
      poly(c, shade(col, -16), [
        [x - s * 0.55, y - s * 0.9],
        [x + s * 0.55, y - s * 0.9],
        [x + s * 0.78, y + s * 0.35],
        [x + s * 0.3, y + s * 0.66],
        [x, y + s * 0.44],
        [x - s * 0.3, y + s * 0.66],
        [x - s * 0.78, y + s * 0.35],
      ]);
      poly(c, col, [
        [x - s * 0.42, y - s * 0.72],
        [x + s * 0.42, y - s * 0.72],
        [x + s * 0.58, y + s * 0.28],
        [x - s * 0.58, y + s * 0.28],
      ]);
      c.fillStyle = '#e8ecff';
      c.fillRect(x - s * 0.3, y - s * 0.52, s * 0.6, s * 0.7);
    }
  },
  berries: (c, col) => {
    // A cluster of fat chamfered berry GEMS — deep frame, bright
    // face, hard glint — under two chunky leaves, as on the bush.
    poly(c, '#549447', [[0.44, 0.3], [0.62, 0.14], [0.74, 0.3], [0.54, 0.38]]);
    poly(c, '#3a7539', [[0.44, 0.32], [0.28, 0.18], [0.18, 0.34], [0.36, 0.42]]);
    const gem = (x: number, y: number, r: number, rot: number) => {
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      const cut = r * 0.36;
      poly(c, shade(col, -22), [
        [-r + cut, -r], [r - cut, -r], [r, -r + cut], [r, r - cut],
        [r - cut, r], [-r + cut, r], [-r, r - cut], [-r, -r + cut],
      ]);
      poly(c, shade(col, 12), [
        [-r * 0.62, -r * 0.62], [r * 0.55, -r * 0.62], [r * 0.62, r * 0.5], [-r * 0.55, r * 0.55],
      ]);
      c.fillStyle = shade(col, 48);
      c.fillRect(-r * 0.5, -r * 0.52, r * 0.5, r * 0.36);
      c.restore();
    };
    gem(0.35, 0.55, 0.15, -0.2);
    gem(0.66, 0.52, 0.15, 0.25);
    gem(0.5, 0.76, 0.16, 0.1);
  },
  fibre: (c, col) => {
    // A cut hank of the living fibre plant: blades fanning up from a
    // lashed waist, two still wearing their gold seed-heads, short
    // tails splayed below the tie. The silhouette is the sheaf —
    // an hourglass of grass — never a box or a cage.
    const blade = (bx: number, lean: number, len: number, w: number, tone: string): void => {
      const tipX = bx + lean;
      const tipY = 0.6 - len;
      const midX = bx + lean * 0.3;
      const midY = 0.6 - len * 0.55;
      c.fillStyle = tone;
      c.beginPath();
      c.moveTo(bx - w, 0.64);
      c.quadraticCurveTo(midX - w, midY, tipX, tipY);
      c.quadraticCurveTo(midX + w, midY, bx + w, 0.64);
      c.closePath();
      c.fill();
    };
    // Back rank dark, front rank lit — same shade-banding as the plant.
    blade(0.43, -0.24, 0.4, 0.034, shade(col, -20));
    blade(0.57, 0.24, 0.42, 0.034, shade(col, -20));
    blade(0.46, -0.13, 0.5, 0.038, col);
    blade(0.55, 0.14, 0.52, 0.038, col);
    blade(0.5, 0.02, 0.57, 0.04, shade(col, 18));
    // The two tallest blades wear fat gold seed-heads — chunky
    // towers along the blade axis, sized to survive the ring and
    // the hotbar both.
    for (const [hx, hy, ang] of [[0.52, 0.06, 0.06], [0.71, 0.13, 0.5]] as const) {
      c.save();
      c.translate(hx, hy);
      c.rotate(ang);
      poly(c, '#a37b2e', [[0, -0.15], [0.075, -0.02], [0.05, 0.13], [-0.05, 0.13], [-0.075, -0.02]]);
      poly(c, '#d9b04c', [[0, -0.115], [0.05, -0.015], [0.032, 0.1], [-0.032, 0.1], [-0.05, -0.015]]);
      dot(c, '#f2dd94', -0.016, -0.045, 0.026);
      c.restore();
    }
    // Cut tails under the lash: a short bright whisk, splayed wide
    // so the outline can never fuse them into a block.
    poly(c, shade(col, 4), [[0.43, 0.64], [0.47, 0.64], [0.33, 0.84], [0.3, 0.81]]);
    poly(c, shade(col, 18), [[0.47, 0.64], [0.51, 0.64], [0.46, 0.88], [0.42, 0.87]]);
    poly(c, shade(col, 10), [[0.52, 0.64], [0.56, 0.64], [0.61, 0.87], [0.57, 0.88]]);
    poly(c, shade(col, -8), [[0.55, 0.64], [0.59, 0.64], [0.69, 0.8], [0.66, 0.83]]);
    // The lash: two courses of twine cinched at the waist, the knot
    // sitting proud at the side.
    poly(c, '#8a6c40', [[0.38, 0.555], [0.62, 0.555], [0.64, 0.65], [0.36, 0.65]]);
    c.fillStyle = '#b89552';
    c.fillRect(0.385, 0.562, 0.235, 0.034);
    c.fillStyle = '#6b5230';
    c.fillRect(0.375, 0.612, 0.255, 0.018);
    dot(c, '#b89552', 0.645, 0.598, 0.032);
    dot(c, '#8a6c40', 0.645, 0.598, 0.016);
  },
  bloomstone: (c, col) => {
    // A seed that chose stone: a hewn grey-green BLOCK (quarried
    // stoneBlock dialect — tapered top, shoulder verts, lit cap,
    // shaded flank) with a live sprout breaking from its crown.
    poly(c, '#6a7562', [
      [0.2, 0.88], [0.16, 0.62], [0.28, 0.4], [0.34, 0.36],
      [0.66, 0.36], [0.76, 0.44], [0.82, 0.66], [0.78, 0.88],
    ]);
    c.fillStyle = '#7d8872';
    c.fillRect(0.24, 0.39, 0.44, 0.13);
    c.fillStyle = '#525c4c';
    c.fillRect(0.66, 0.52, 0.13, 0.3);
    poly(c, shade(col, -8), [[0.5, 0.38], [0.44, 0.24], [0.5, 0.08], [0.56, 0.24]]);
    poly(c, shade(col, 14), [[0.5, 0.32], [0.32, 0.28], [0.22, 0.13], [0.44, 0.17]]);
    poly(c, shade(col, 26), [[0.52, 0.32], [0.68, 0.26], [0.78, 0.11], [0.58, 0.16]]);
  },
  essence: (c, col) => {
    // Pressed vigor: a faceted drop of pure element, lit from within.
    dot(c, shade(col, 30), 0.5, 0.52, 0.36);
    c.globalAlpha = 1;
    poly(c, shade(col, -20), [
      [0.5, 0.12], [0.72, 0.4], [0.78, 0.62], [0.64, 0.84],
      [0.36, 0.84], [0.22, 0.62], [0.28, 0.4],
    ]);
    poly(c, col, [[0.5, 0.22], [0.66, 0.44], [0.7, 0.62], [0.58, 0.76], [0.38, 0.72], [0.32, 0.5]]);
    c.fillStyle = shade(col, 44);
    c.fillRect(0.38, 0.34, 0.14, 0.16);
    poly(c, '#ffffff', [[0.62, 0.28], [0.65, 0.34], [0.71, 0.37], [0.65, 0.4], [0.62, 0.46], [0.59, 0.4], [0.53, 0.37], [0.59, 0.34]]);
  },
  twine: (c, col) => {
    // A wound BALL of twine, courses curving with the sphere and a
    // loose working tail — the winding rides the ball, so it can
    // never flatten into a wheel.
    const cx = 0.45;
    const cy = 0.44;
    const r = 0.31;
    dot(c, shade(col, -22), cx, cy, r);
    c.save();
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.clip();
    dot(c, col, cx + 0.04, cy - 0.04, r * 0.94);
    dot(c, shade(col, 22), cx + 0.09, cy - 0.1, r * 0.52);
    // Two families of winding: nested loops one way, one crossing.
    c.strokeStyle = shade(col, -28);
    c.lineWidth = 0.028;
    for (const ry of [0.34, 0.6, 0.86]) {
      c.beginPath();
      c.ellipse(cx, cy, r * 0.99, r * ry, -0.62, 0, Math.PI * 2);
      c.stroke();
    }
    c.beginPath();
    c.ellipse(cx, cy, r * 0.99, r * 0.48, 0.85, 0, Math.PI * 2);
    c.stroke();
    // One course catches the light on the lit shoulder.
    c.strokeStyle = shade(col, 34);
    c.lineWidth = 0.024;
    c.beginPath();
    c.ellipse(cx, cy, r * 0.96, r * 0.6, -0.62, -2.4, -0.9);
    c.stroke();
    c.restore();
    // The tail: off the ball, a lazy curve, frayed at the cut.
    c.strokeStyle = shade(col, 8);
    c.lineWidth = 0.05;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(cx + r * 0.62, cy + r * 0.72);
    c.quadraticCurveTo(0.84, 0.7, 0.78, 0.84);
    c.quadraticCurveTo(0.74, 0.92, 0.64, 0.9);
    c.stroke();
    c.lineWidth = 0.02;
    c.strokeStyle = shade(col, -12);
    c.beginPath();
    c.moveTo(0.64, 0.9);
    c.lineTo(0.57, 0.87);
    c.moveTo(0.64, 0.9);
    c.lineTo(0.585, 0.935);
    c.stroke();
  },
  clothbolt: (c, col) => {
    // A rolled bolt: fabric unrolling toward the viewer, the fat roll
    // behind with a spiral end-cap — unmistakably cloth, not paper.
    poly(c, shade(col, -14), [[0.3, 0.5], [0.86, 0.5], [0.9, 0.66], [0.34, 0.66]]);
    poly(c, col, [[0.34, 0.66], [0.9, 0.66], [0.86, 0.82], [0.3, 0.82]]);
    // Weave shadow at the fold.
    c.fillStyle = shade(col, -34);
    c.fillRect(0.33, 0.645, 0.55, 0.025);
    // The roll.
    bar(c, shade(col, 8), 0.24, 0.26, 0.58, 0.24);
    c.fillStyle = shade(col, 24);
    c.fillRect(0.28, 0.29, 0.5, 0.07);
    // Spiral end-cap.
    dot(c, shade(col, -26), 0.3, 0.38, 0.115);
    dot(c, col, 0.3, 0.38, 0.08);
    dot(c, shade(col, -26), 0.3, 0.38, 0.045);
    dot(c, shade(col, 18), 0.31, 0.365, 0.02);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.03;
    c.beginPath();
    c.arc(0.3, 0.38, 0.115, 0, Math.PI * 2);
    c.stroke();
  },
  threadspool: (c, col) => {
    // A wooden spool wound fat with lustrous thread, one strand run
    // loose — the flanges top and bottom keep it a spool, never a
    // wheel, and the sheen band says silk.
    c.save();
    c.translate(0.47, 0.46);
    c.rotate(0.14);
    // The wound body, waisted slightly where the thread piles —
    // drawn wide, so the spool still has a body at hotbar size.
    poly(c, shade(col, 6), [[-0.24, -0.27], [0.24, -0.27], [0.2, 0.27], [-0.2, 0.27]]);
    // Thread courses, bowed like winding.
    c.strokeStyle = shade(col, -22);
    c.lineWidth = 0.022;
    for (const y of [-0.17, -0.06, 0.05, 0.16]) {
      c.beginPath();
      c.moveTo(-0.22, y);
      c.quadraticCurveTo(0, y + 0.035, 0.22, y);
      c.stroke();
    }
    // The luster: one bright band riding the body.
    poly(c, shade(col, 40), [[-0.02, -0.27], [0.06, -0.27], [-0.005, 0.27], [-0.085, 0.27]]);
    // Wooden flanges, lit caps on top.
    bar(c, '#7a5a34', -0.31, -0.38, 0.62, 0.115);
    bar(c, '#9a7848', -0.31, -0.38, 0.62, 0.045);
    bar(c, '#7a5a34', -0.31, 0.265, 0.62, 0.115);
    bar(c, '#5b4028', -0.31, 0.335, 0.62, 0.045);
    c.restore();
    // The loose strand, glint near the cut end.
    c.strokeStyle = shade(col, 14);
    c.lineWidth = 0.034;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0.68, 0.56);
    c.quadraticCurveTo(0.84, 0.66, 0.78, 0.82);
    c.quadraticCurveTo(0.75, 0.9, 0.66, 0.9);
    c.stroke();
    dot(c, shade(col, 52), 0.795, 0.74, 0.02);
  },
  ragswatch: (c, col) => {
    // A torn scrap of woven linen: the selvedge still straight up
    // top, the tear ragged along the bottom, loose threads hanging
    // where the cloth gave way.
    c.save();
    c.translate(0.5, 0.46);
    c.rotate(-0.09);
    poly(c, col, [
      [-0.31, -0.26], [0.29, -0.3], [0.33, 0.06],
      [0.24, 0.02], [0.17, 0.16], [0.06, 0.06], [-0.03, 0.2],
      [-0.14, 0.08], [-0.22, 0.18], [-0.3, 0.06],
    ]);
    // The dog-eared corner shows the underside.
    poly(c, shade(col, -16), [[0.29, -0.3], [0.33, -0.1], [0.13, -0.27]]);
    // Weave hint: sparse hatch both ways.
    c.strokeStyle = shade(col, -14);
    c.globalAlpha = 0.65;
    c.lineWidth = 0.016;
    c.beginPath();
    for (const x of [-0.17, -0.02, 0.13]) {
      c.moveTo(x - 0.015, -0.24);
      c.lineTo(x + 0.015, 0.04);
    }
    for (const y of [-0.16, -0.04] as const) {
      c.moveTo(-0.28, y);
      c.lineTo(0.28, y - 0.02);
    }
    c.stroke();
    c.globalAlpha = 1;
    // Two short threads hanging off the tear — no more, or at small
    // sizes they read as legs.
    c.strokeStyle = shade(col, -8);
    c.lineWidth = 0.018;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.03, 0.2);
    c.lineTo(-0.045, 0.29);
    c.moveTo(0.17, 0.16);
    c.lineTo(0.18, 0.24);
    c.stroke();
    c.restore();
  },
  linenbolt: (c, col) => {
    // Linen folded into a neat stack, three courses deep — the fold
    // rounds show on the right, the open edges stagger on the left,
    // a flax stripe woven along the middle course. A different
    // silhouette from the rolled cloth bolt on purpose.
    const fold = (x: number, y: number, w: number, h: number, tone: string): void => {
      c.fillStyle = tone;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + w - h / 2, y);
      c.arc(x + w - h / 2, y + h / 2, h / 2, -Math.PI / 2, Math.PI / 2);
      c.lineTo(x, y + h);
      c.closePath();
      c.fill();
    };
    fold(0.18, 0.6, 0.62, 0.17, shade(col, -18));
    fold(0.22, 0.44, 0.6, 0.17, col);
    fold(0.19, 0.28, 0.58, 0.17, shade(col, 12));
    // Lit top plane on the upper fold.
    c.fillStyle = shade(col, 30);
    c.fillRect(0.19, 0.28, 0.5, 0.05);
    // The flax stripe riding the middle course.
    c.fillStyle = '#b09a6a';
    c.fillRect(0.22, 0.5, 0.56, 0.035);
    // Open edges: fold shadows at the left cut.
    c.strokeStyle = shade(col, -30);
    c.lineWidth = 0.022;
    c.beginPath();
    c.moveTo(0.22, 0.44);
    c.lineTo(0.22, 0.61);
    c.moveTo(0.19, 0.28);
    c.lineTo(0.19, 0.45);
    c.stroke();
  },
  silkbolt: (c, col) => {
    // Gloomsilk off the roll: the fat roll up top, the drape
    // spilling down with a waved hem, moon-sheen streaks riding
    // the luster — cloth that shines back.
    // The drape.
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0.3, 0.4);
    c.lineTo(0.78, 0.4);
    c.quadraticCurveTo(0.84, 0.62, 0.76, 0.84);
    c.quadraticCurveTo(0.68, 0.9, 0.62, 0.82);
    c.quadraticCurveTo(0.55, 0.92, 0.46, 0.84);
    c.quadraticCurveTo(0.38, 0.92, 0.32, 0.82);
    c.quadraticCurveTo(0.24, 0.6, 0.3, 0.4);
    c.closePath();
    c.fill();
    // Fold shadows down the drape.
    c.strokeStyle = shade(col, -22);
    c.lineWidth = 0.03;
    c.beginPath();
    c.moveTo(0.44, 0.44);
    c.quadraticCurveTo(0.4, 0.64, 0.44, 0.82);
    c.moveTo(0.62, 0.44);
    c.quadraticCurveTo(0.66, 0.62, 0.63, 0.8);
    c.stroke();
    // Moon-sheen: two bright diagonals across the luster.
    c.strokeStyle = shade(col, 46);
    c.globalAlpha = 0.85;
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.36, 0.72);
    c.lineTo(0.56, 0.48);
    c.moveTo(0.52, 0.78);
    c.lineTo(0.68, 0.58);
    c.stroke();
    c.globalAlpha = 1;
    // The roll, spiral cap on the left with a glint.
    bar(c, shade(col, -10), 0.2, 0.24, 0.62, 0.2);
    c.fillStyle = shade(col, 16);
    c.fillRect(0.24, 0.265, 0.54, 0.06);
    dot(c, shade(col, -28), 0.26, 0.34, 0.105);
    dot(c, col, 0.26, 0.34, 0.072);
    dot(c, shade(col, -28), 0.26, 0.34, 0.04);
    dot(c, shade(col, 42), 0.275, 0.325, 0.018);
  },
  loombuild: (c, col) => {
    // The loom stands as its frame: posts and beams in wood, warp
    // threads strung down to the woven cloth, the shuttle resting
    // mid-weave — the machine, not its product.
    const wood = '#8a6534';
    const woodLit = '#a5793f';
    const woodDark = '#6d4a26';
    // A warm shadowed backdrop fills the frame, so the gaps between
    // warp threads stay the loom's own shadow — not outline ink.
    bar(c, '#3a2c1c', 0.16, 0.14, 0.68, 0.7);
    // Side posts with lit faces.
    bar(c, wood, 0.14, 0.16, 0.095, 0.72);
    bar(c, woodLit, 0.14, 0.16, 0.038, 0.72);
    bar(c, wood, 0.765, 0.16, 0.095, 0.72);
    bar(c, woodLit, 0.765, 0.16, 0.038, 0.72);
    // Top beam shows its foreshortened cap; bottom beam sits dark.
    bar(c, wood, 0.1, 0.1, 0.8, 0.11);
    bar(c, woodLit, 0.1, 0.1, 0.8, 0.045);
    bar(c, woodDark, 0.1, 0.82, 0.8, 0.08);
    // Warp threads from the beam down into the weave.
    c.strokeStyle = shade(col, -8);
    c.lineWidth = 0.024;
    c.beginPath();
    for (const x of [0.31, 0.4, 0.49, 0.58, 0.67]) {
      c.moveTo(x, 0.21);
      c.lineTo(x, 0.62);
    }
    c.stroke();
    // The woven cloth grown up from the bottom, weft courses inked.
    bar(c, col, 0.26, 0.6, 0.48, 0.22);
    c.fillStyle = shade(col, 16);
    c.fillRect(0.26, 0.6, 0.48, 0.05);
    c.strokeStyle = shade(col, -20);
    c.lineWidth = 0.018;
    c.beginPath();
    for (const y of [0.68, 0.74, 0.79]) {
      c.moveTo(0.27, y);
      c.lineTo(0.73, y);
    }
    c.stroke();
    // The shuttle resting across the warp.
    poly(c, '#5b4028', [[0.32, 0.45], [0.5, 0.4], [0.68, 0.45], [0.5, 0.5]]);
    poly(c, '#7a5a34', [[0.38, 0.445], [0.5, 0.415], [0.62, 0.445], [0.5, 0.475]]);
  },
  floursack: (c, col) => {
    // A plump sack rolled open at the top, flour heaped over the rim.
    poly(c, '#c9b690', [
      [0.28, 0.4], [0.72, 0.4], [0.8, 0.66], [0.74, 0.88], [0.26, 0.88], [0.2, 0.66],
    ]);
    c.fillStyle = shade('#c9b690', 18);
    c.beginPath();
    c.moveTo(0.3, 0.44);
    c.lineTo(0.6, 0.44);
    c.lineTo(0.62, 0.7);
    c.lineTo(0.28, 0.7);
    c.closePath();
    c.fill();
    // Rolled rim.
    bar(c, '#a5824e', 0.24, 0.34, 0.52, 0.11);
    // The heap.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.03;
    c.beginPath();
    c.arc(0.4, 0.32, 0.09, 0, Math.PI * 2);
    c.arc(0.56, 0.3, 0.1, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    dot(c, '#ffffff', 0.52, 0.26, 0.04);
  },
  milkpail: (c, col) => {
    // A banded wooden pail, milk risen to the brim.
    poly(c, '#8a6534', [[0.28, 0.38], [0.72, 0.38], [0.66, 0.84], [0.34, 0.84]]);
    c.fillStyle = shade('#8a6534', 16);
    c.beginPath();
    c.moveTo(0.31, 0.42);
    c.lineTo(0.48, 0.42);
    c.lineTo(0.46, 0.8);
    c.lineTo(0.36, 0.8);
    c.closePath();
    c.fill();
    bar(c, '#55505e', 0.28, 0.52, 0.44, 0.05);
    bar(c, '#55505e', 0.3, 0.7, 0.4, 0.05);
    // Handle arc.
    c.strokeStyle = '#55505e';
    c.lineWidth = 0.04;
    c.beginPath();
    c.arc(0.5, 0.38, 0.26, Math.PI, 0);
    c.stroke();
    // The milk.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.03;
    c.beginPath();
    c.ellipse(0.5, 0.38, 0.22, 0.08, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    dot(c, '#ffffff', 0.42, 0.36, 0.045);
  },
  egg: (c, col) => {
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.ellipse(0.5, 0.54, 0.24, 0.3, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 22);
    c.beginPath();
    c.ellipse(0.42, 0.42, 0.09, 0.12, -0.4, 0, Math.PI * 2);
    c.fill();
    dot(c, '#ffffff', 0.4, 0.38, 0.035);
  },
  bread: (c, col) => {
    // A crusty oval loaf with three score marks.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.ellipse(0.5, 0.56, 0.32, 0.22, -0.15, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 22);
    c.beginPath();
    c.ellipse(0.44, 0.46, 0.2, 0.1, -0.2, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = shade(col, -32);
    c.lineWidth = 0.035;
    for (const t of [-0.14, 0, 0.14]) {
      c.beginPath();
      c.moveTo(0.42 + t, 0.42 + t * 0.2);
      c.lineTo(0.56 + t, 0.56 + t * 0.2);
      c.stroke();
    }
  },
  friedegg: (c, col) => {
    // Sunny side up: a wobbly white, a proud yolk.
    c.fillStyle = '#f6f2e8';
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.032;
    c.beginPath();
    c.moveTo(0.24, 0.5);
    c.quadraticCurveTo(0.2, 0.28, 0.44, 0.26);
    c.quadraticCurveTo(0.64, 0.2, 0.74, 0.38);
    c.quadraticCurveTo(0.84, 0.56, 0.68, 0.7);
    c.quadraticCurveTo(0.52, 0.82, 0.34, 0.72);
    c.quadraticCurveTo(0.22, 0.64, 0.24, 0.5);
    c.closePath();
    c.fill();
    c.stroke();
    dot(c, col, 0.5, 0.5, 0.14);
    c.strokeStyle = shade(col, -28);
    c.lineWidth = 0.024;
    c.beginPath();
    c.arc(0.5, 0.5, 0.14, 0, Math.PI * 2);
    c.stroke();
    dot(c, '#fff6d8', 0.45, 0.44, 0.045);
  },
  stew: (c, col) => {
    // A steaming bowl with chunks breaking the surface.
    poly(c, '#7d5a2e', [[0.2, 0.5], [0.8, 0.5], [0.72, 0.78], [0.28, 0.78]]);
    c.fillStyle = shade('#7d5a2e', 16);
    c.fillRect(0.24, 0.53, 0.2, 0.16);
    // Broth.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.03;
    c.beginPath();
    c.ellipse(0.5, 0.5, 0.28, 0.09, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    // Chunks: carrot and beef above the surface.
    bar(c, '#e8873d', 0.36, 0.43, 0.1, 0.07);
    bar(c, '#8a4a3a', 0.54, 0.42, 0.11, 0.08);
    // Steam curls.
    c.strokeStyle = 'rgba(244, 239, 228, 0.75)';
    c.lineWidth = 0.035;
    for (const x of [0.42, 0.58]) {
      c.beginPath();
      c.moveTo(x, 0.34);
      c.quadraticCurveTo(x + 0.05, 0.26, x, 0.18);
      c.stroke();
    }
  },
  cakeicon: (c, col) => {
    // A two-tier iced cake with a berry on top.
    poly(c, '#e8d9b0', [[0.24, 0.56], [0.76, 0.56], [0.76, 0.8], [0.24, 0.8]]);
    poly(c, '#e8d9b0', [[0.32, 0.36], [0.68, 0.36], [0.68, 0.56], [0.32, 0.56]]);
    // Icing drips.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.028;
    c.beginPath();
    c.moveTo(0.24, 0.56);
    for (let i = 0; i < 4; i++) {
      const x = 0.24 + (i + 0.5) * 0.13;
      c.quadraticCurveTo(x, 0.68, x + 0.065, 0.56);
    }
    c.lineTo(0.76, 0.5);
    c.lineTo(0.24, 0.5);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = shade(col, 14);
    c.beginPath();
    c.moveTo(0.32, 0.36);
    for (let i = 0; i < 3; i++) {
      const x = 0.32 + (i + 0.5) * 0.12;
      c.quadraticCurveTo(x, 0.46, x + 0.06, 0.36);
    }
    c.lineTo(0.68, 0.31);
    c.lineTo(0.32, 0.31);
    c.closePath();
    c.fill();
    dot(c, '#a04a6e', 0.5, 0.27, 0.06);
    dot(c, shade('#a04a6e', 36), 0.48, 0.25, 0.022);
  },
  bottle: (c, col) => {
    // The herbalist's rounded flask: cork, slim neck, bright liquid.
    bar(c, '#a5824e', 0.44, 0.12, 0.12, 0.1);
    poly(c, 'rgba(210, 224, 235, 0.5)', [
      [0.45, 0.2], [0.55, 0.2], [0.55, 0.34], [0.68, 0.46], [0.7, 0.62],
      [0.62, 0.8], [0.38, 0.8], [0.3, 0.62], [0.32, 0.46], [0.45, 0.34],
    ]);
    // The draught inside.
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0.335, 0.52);
    c.lineTo(0.665, 0.52);
    c.lineTo(0.69, 0.62);
    c.lineTo(0.615, 0.775);
    c.lineTo(0.385, 0.775);
    c.lineTo(0.31, 0.62);
    c.closePath();
    c.fill();
    c.fillStyle = shade(col, 26);
    c.beginPath();
    c.ellipse(0.5, 0.52, 0.165, 0.045, 0, 0, Math.PI * 2);
    c.fill();
    // Glasswork glint.
    c.strokeStyle = '#f4f8ff';
    c.lineWidth = 0.04;
    c.beginPath();
    c.moveTo(0.4, 0.42);
    c.quadraticCurveTo(0.34, 0.52, 0.37, 0.66);
    c.stroke();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.032;
    c.beginPath();
    c.moveTo(0.45, 0.2);
    c.lineTo(0.55, 0.2);
    c.lineTo(0.55, 0.34);
    c.lineTo(0.68, 0.46);
    c.lineTo(0.7, 0.62);
    c.lineTo(0.62, 0.8);
    c.lineTo(0.38, 0.8);
    c.lineTo(0.3, 0.62);
    c.lineTo(0.32, 0.46);
    c.lineTo(0.45, 0.34);
    c.closePath();
    c.stroke();
  },
  resin: (c, col) => {
    // Pine resin: three amber tears clustered on a bark chip, each
    // with a window of trapped light — the northwood's loose change.
    c.save();
    c.translate(0.5, 0.52);
    // The bark chip they bled onto.
    c.fillStyle = '#6b4a30';
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.03;
    c.beginPath();
    c.moveTo(-0.34, 0.1);
    c.lineTo(-0.12, 0.02);
    c.lineTo(0.3, 0.06);
    c.lineTo(0.36, 0.2);
    c.lineTo(-0.24, 0.24);
    c.closePath();
    c.fill();
    c.stroke();
    // The tears: fat teardrops, biggest in front.
    const drop = (x: number, y: number, r: number) => {
      c.fillStyle = col;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 0.032;
      c.beginPath();
      c.moveTo(x, y - r * 1.5);
      c.quadraticCurveTo(x + r, y - r * 0.5, x + r * 0.9, y + r * 0.35);
      c.quadraticCurveTo(x + r * 0.55, y + r, x, y + r);
      c.quadraticCurveTo(x - r * 0.55, y + r, x - r * 0.9, y + r * 0.35);
      c.quadraticCurveTo(x - r, y - r * 0.5, x, y - r * 1.5);
      c.closePath();
      c.fill();
      c.stroke();
      // Trapped light.
      c.fillStyle = shade(col, 34);
      c.beginPath();
      c.ellipse(x - r * 0.3, y - r * 0.25, r * 0.28, r * 0.42, -0.4, 0, Math.PI * 2);
      c.fill();
    };
    drop(-0.16, -0.04, 0.11);
    drop(0.2, -0.02, 0.09);
    drop(0.03, 0.08, 0.14);
    c.restore();
  },
  gland: (c, col) => {
    // The milked venom sac: a taut membrane bulb with a sinew stem,
    // sheen on the swell, and one drop leaving the tip.
    c.save();
    c.translate(0.5, 0.46);
    // Sinew stem, tied off.
    c.strokeStyle = '#8a7a5f';
    c.lineWidth = 0.05;
    c.beginPath();
    c.moveTo(0.02, -0.36);
    c.quadraticCurveTo(0.1, -0.3, 0.05, -0.22);
    c.stroke();
    c.strokeStyle = '#6b5a42';
    c.lineWidth = 0.022;
    c.beginPath();
    c.moveTo(-0.05, -0.25);
    c.lineTo(0.13, -0.21);
    c.stroke();
    // The sac: heavy teardrop, wall thick with the good stuff.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.034;
    c.beginPath();
    c.moveTo(0.04, -0.22);
    c.quadraticCurveTo(0.26, -0.12, 0.22, 0.1);
    c.quadraticCurveTo(0.18, 0.3, 0, 0.34);
    c.quadraticCurveTo(-0.2, 0.3, -0.23, 0.08);
    c.quadraticCurveTo(-0.25, -0.14, 0.04, -0.22);
    c.closePath();
    c.fill();
    c.stroke();
    // Membrane sheen + the darker payload swirling low.
    c.fillStyle = shade(col, -20);
    c.beginPath();
    c.ellipse(0.02, 0.16, 0.14, 0.1, 0.1, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = shade(col, 30);
    c.beginPath();
    c.ellipse(-0.09, -0.06, 0.07, 0.11, 0.5, 0, Math.PI * 2);
    c.fill();
    dot(c, shade(col, 46), -0.11, -0.1, 0.026);
    // The drop leaving the tip.
    c.fillStyle = shade(col, 18);
    c.beginPath();
    c.moveTo(0, 0.36);
    c.quadraticCurveTo(0.045, 0.42, 0, 0.47);
    c.quadraticCurveTo(-0.045, 0.42, 0, 0.36);
    c.fill();
    c.restore();
  },
  fang: (c, col) => {
    // The trophy tooth: a stout up-hooked tusk fang, root socket at
    // the base, enamel sheen down the outer curve, honed tip.
    c.save();
    c.translate(0.5, 0.52);
    c.rotate(-0.35);
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.034;
    c.beginPath();
    c.moveTo(-0.16, 0.3);
    c.quadraticCurveTo(-0.3, 0.02, -0.14, -0.24);
    c.quadraticCurveTo(-0.02, -0.4, 0.14, -0.42);
    c.quadraticCurveTo(0.02, -0.28, -0.01, -0.1);
    c.quadraticCurveTo(-0.03, 0.12, 0.1, 0.3);
    c.quadraticCurveTo(-0.02, 0.38, -0.16, 0.3);
    c.closePath();
    c.fill();
    c.stroke();
    // Root socket band — the raw end the charm-cord ties around.
    c.fillStyle = shade(col, -26);
    c.beginPath();
    c.moveTo(-0.16, 0.3);
    c.quadraticCurveTo(-0.02, 0.38, 0.1, 0.3);
    c.quadraticCurveTo(0.03, 0.24, -0.03, 0.24);
    c.quadraticCurveTo(-0.1, 0.24, -0.16, 0.3);
    c.closePath();
    c.fill();
    // Enamel sheen riding the outer curve to the tip.
    c.strokeStyle = shade(col, 30);
    c.lineWidth = 0.045;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.19, 0.14);
    c.quadraticCurveTo(-0.22, -0.06, -0.1, -0.24);
    c.stroke();
    c.lineCap = 'butt';
    dot(c, shade(col, 42), 0.09, -0.36, 0.025);
    c.restore();
  },
  spottedhide: (c, col) => {
    // The gnoll's pelt: the tanner's splay with a raggedier flank line
    // (a scavenger's hide never comes off clean) and the hyena dapple
    // scattered over the shoulder field.
    c.save();
    c.translate(0.5, 0.52);
    c.rotate(0.05);
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.032;
    c.beginPath();
    c.moveTo(0, -0.4); // neck
    c.quadraticCurveTo(0.15, -0.37, 0.2, -0.29);
    c.quadraticCurveTo(0.35, -0.33, 0.36, -0.2); // fore flare
    c.quadraticCurveTo(0.26, -0.1, 0.31, 0.03);
    c.lineTo(0.24, 0.08); // torn notch
    c.quadraticCurveTo(0.28, 0.16, 0.34, 0.25); // hind flare
    c.quadraticCurveTo(0.28, 0.36, 0.15, 0.31);
    c.quadraticCurveTo(0.03, 0.4, -0.09, 0.32);
    c.quadraticCurveTo(-0.25, 0.38, -0.3, 0.23);
    c.lineTo(-0.24, 0.14); // torn notch
    c.quadraticCurveTo(-0.3, 0.04, -0.28, -0.02);
    c.quadraticCurveTo(-0.36, -0.15, -0.3, -0.25);
    c.quadraticCurveTo(-0.32, -0.34, -0.17, -0.3);
    c.quadraticCurveTo(-0.11, -0.38, 0, -0.4);
    c.closePath();
    c.fill();
    c.stroke();
    // The pale belly field.
    c.fillStyle = shade(col, 18);
    c.beginPath();
    c.ellipse(-0.01, 0.02, 0.17, 0.2, 0.05, 0, Math.PI * 2);
    c.fill();
    // The dapple: broken spots over the shoulder, never a grid.
    c.fillStyle = shade(col, -30);
    for (const [x, y, r] of [
      [-0.16, -0.2, 0.035], [0.08, -0.24, 0.03], [0.2, -0.1, 0.035],
      [-0.22, -0.02, 0.028], [0.14, 0.16, 0.032], [-0.12, 0.22, 0.028],
      [0.0, -0.08, 0.026],
    ] as const) {
      c.beginPath();
      c.ellipse(x, y, r * 1.25, r, 0.2, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  },
  mane: (c, col) => {
    // The packlord's crest, taken whole: a strip of hide bearing the
    // standing bristle ridge, cord-bound at the root end — a trophy
    // you could hang over a door, and somewhere somebody will.
    c.save();
    c.translate(0.5, 0.54);
    c.rotate(-0.5);
    // The hide strip.
    c.fillStyle = shade(col, 14);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.03;
    c.beginPath();
    c.moveTo(-0.34, 0.1);
    c.quadraticCurveTo(0, 0.16, 0.34, 0.08);
    c.lineTo(0.33, 0.2);
    c.quadraticCurveTo(0, 0.28, -0.33, 0.22);
    c.closePath();
    c.fill();
    c.stroke();
    // The bristles: stiff locks marching root to tip, tallest mid-run.
    c.fillStyle = col;
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const bx = -0.3 + t * 0.6;
      const tall = 0.2 + 0.16 * Math.sin(t * Math.PI) + 0.04 * Math.sin(i * 2.3);
      c.beginPath();
      c.moveTo(bx - 0.055, 0.12);
      c.lineTo(bx - 0.02 + 0.05 * Math.sin(i * 1.7), 0.12 - tall);
      c.lineTo(bx + 0.055, 0.13);
      c.closePath();
      c.fill();
      c.strokeStyle = OUTLINE;
      c.lineWidth = 0.018;
      c.stroke();
    }
    // Frost ticks on the crest tips — the packlord's gray coming in.
    c.strokeStyle = shade(col, 34);
    c.lineWidth = 0.02;
    for (const [x, y] of [[-0.18, -0.16], [0.02, -0.24], [0.2, -0.12]] as const) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 0.03, y - 0.06);
      c.stroke();
    }
    // The cord binding at the root end.
    c.strokeStyle = shade(col, -20);
    c.lineWidth = 0.035;
    for (const o of [0, 0.05]) {
      c.beginPath();
      c.moveTo(-0.34 + o, 0.08);
      c.lineTo(-0.31 + o, 0.24);
      c.stroke();
    }
    c.restore();
  },
  vial: (c, col) => {
    // The tonic: a tall slim vial, corked and collared, the draught
    // filling two-thirds with one rising bubble.
    c.save();
    c.translate(0.5, 0.5);
    c.rotate(0.06);
    bar(c, '#a5824e', -0.055, -0.44, 0.11, 0.1);
    bar(c, shade('#a5824e', -18), -0.055, -0.37, 0.11, 0.03);
    // Glass body.
    c.fillStyle = 'rgba(210, 224, 235, 0.5)';
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.032;
    c.beginPath();
    c.roundRect(-0.11, -0.35, 0.22, 0.75, 0.09);
    c.fill();
    // The draught.
    c.fillStyle = col;
    c.beginPath();
    c.roundRect(-0.095, -0.08, 0.19, 0.465, 0.075);
    c.fill();
    c.fillStyle = shade(col, 26);
    c.beginPath();
    c.ellipse(0, -0.08, 0.095, 0.032, 0, 0, Math.PI * 2);
    c.fill();
    dot(c, shade(col, 34), 0.03, 0.12, 0.022);
    // Glass outline + shine.
    c.strokeStyle = OUTLINE;
    c.beginPath();
    c.roundRect(-0.11, -0.35, 0.22, 0.75, 0.09);
    c.stroke();
    c.strokeStyle = '#f4f8ff';
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(-0.062, -0.26);
    c.lineTo(-0.062, 0.24);
    c.stroke();
    c.restore();
  },
  jug: (c, col) => {
    // The brew: a stout stoneware jug, glaze dipped to the shoulder,
    // rope-loop handle, the cork driven deep.
    c.save();
    c.translate(0.5, 0.54);
    bar(c, '#8a6a45', -0.05, -0.48, 0.1, 0.09);
    // Body.
    c.fillStyle = '#c9b690';
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.032;
    c.beginPath();
    c.moveTo(-0.08, -0.42);
    c.lineTo(0.08, -0.42);
    c.quadraticCurveTo(0.13, -0.32, 0.24, -0.22);
    c.quadraticCurveTo(0.32, -0.1, 0.3, 0.12);
    c.quadraticCurveTo(0.28, 0.34, 0.0, 0.36);
    c.quadraticCurveTo(-0.28, 0.34, -0.3, 0.12);
    c.quadraticCurveTo(-0.32, -0.1, -0.24, -0.22);
    c.quadraticCurveTo(-0.13, -0.32, -0.08, -0.42);
    c.closePath();
    c.fill();
    c.stroke();
    // The glaze dip: the brew's color poured over the shoulder.
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(-0.235, -0.21);
    c.quadraticCurveTo(-0.1, -0.13, 0, -0.145);
    c.quadraticCurveTo(0.12, -0.16, 0.235, -0.21);
    c.quadraticCurveTo(0.16, -0.3, 0.09, -0.4);
    c.lineTo(-0.09, -0.4);
    c.quadraticCurveTo(-0.16, -0.3, -0.235, -0.21);
    c.closePath();
    c.fill();
    // Drip runs off the glaze line.
    c.fillStyle = col;
    c.beginPath();
    c.roundRect(-0.05, -0.16, 0.045, 0.1, 0.02);
    c.fill();
    // Belly shine + handle.
    c.fillStyle = shade('#c9b690', 20);
    c.beginPath();
    c.ellipse(-0.13, 0.05, 0.055, 0.12, 0.2, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#8a6a45';
    c.lineWidth = 0.05;
    c.beginPath();
    c.arc(0.2, -0.26, 0.09, Math.PI * 1.3, Math.PI * 0.45);
    c.stroke();
    c.restore();
  },
  oilvial: (c, col) => {
    // The blade oil: an angular alchemist's bottle with a shoulder
    // spike of a stopper and a fang charm on a cord — poison you
    // recognize before you read the label.
    c.save();
    c.translate(0.5, 0.52);
    // Stopper: a whittled spike.
    poly(c, '#6a6274', [[-0.035, -0.5], [0.035, -0.5], [0.05, -0.34], [-0.05, -0.34]]);
    // Angular body: wide shoulders tapering to a foot.
    c.fillStyle = 'rgba(205, 220, 228, 0.45)';
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.032;
    c.beginPath();
    c.moveTo(-0.06, -0.36);
    c.lineTo(0.06, -0.36);
    c.lineTo(0.09, -0.26);
    c.lineTo(0.24, -0.14);
    c.lineTo(0.18, 0.34);
    c.lineTo(-0.18, 0.34);
    c.lineTo(-0.24, -0.14);
    c.lineTo(-0.09, -0.26);
    c.closePath();
    c.fill();
    // The oil, thick and to the shoulders.
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(-0.215, -0.1);
    c.lineTo(0.215, -0.1);
    c.lineTo(0.172, 0.325);
    c.lineTo(-0.172, 0.325);
    c.closePath();
    c.fill();
    c.fillStyle = shade(col, 24);
    c.beginPath();
    c.ellipse(0, -0.1, 0.215, 0.04, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = OUTLINE;
    c.beginPath();
    c.moveTo(-0.06, -0.36);
    c.lineTo(0.06, -0.36);
    c.lineTo(0.09, -0.26);
    c.lineTo(0.24, -0.14);
    c.lineTo(0.18, 0.34);
    c.lineTo(-0.18, 0.34);
    c.lineTo(-0.24, -0.14);
    c.lineTo(-0.09, -0.26);
    c.closePath();
    c.stroke();
    // Glass shine.
    c.strokeStyle = '#f4f8ff';
    c.lineWidth = 0.032;
    c.beginPath();
    c.moveTo(-0.14, -0.05);
    c.lineTo(-0.11, 0.26);
    c.stroke();
    // The fang charm on its cord.
    c.strokeStyle = '#6b4a26';
    c.lineWidth = 0.022;
    c.beginPath();
    c.moveTo(0.09, -0.28);
    c.quadraticCurveTo(0.2, -0.26, 0.24, -0.18);
    c.stroke();
    c.fillStyle = '#efe8d8';
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.02;
    c.beginPath();
    c.moveTo(0.2, -0.19);
    c.quadraticCurveTo(0.3, -0.16, 0.26, -0.02);
    c.quadraticCurveTo(0.22, -0.13, 0.18, -0.15);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  },
  jar: (c, col) => {
    // A squat salve pot with a waxed lid.
    poly(c, '#c9b690', [[0.3, 0.4], [0.7, 0.4], [0.76, 0.6], [0.68, 0.82], [0.32, 0.82], [0.24, 0.6]]);
    c.fillStyle = shade('#c9b690', 18);
    c.beginPath();
    c.moveTo(0.33, 0.44);
    c.lineTo(0.52, 0.44);
    c.lineTo(0.5, 0.78);
    c.lineTo(0.35, 0.78);
    c.closePath();
    c.fill();
    // Salve band showing through a dipped stripe.
    bar(c, col, 0.3, 0.56, 0.4, 0.12);
    // Lid + tied cloth.
    bar(c, col, 0.34, 0.26, 0.32, 0.12);
    bar(c, shade(col, 24), 0.36, 0.28, 0.16, 0.05);
    c.strokeStyle = '#7d5a2e';
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(0.3, 0.4);
    c.lineTo(0.7, 0.4);
    c.stroke();
  },
  flowercrown: (c, col) => {
    // A woven meadow circlet seen at the wearing angle: a braided
    // green ring with leaves tucked into the weave and five open
    // blooms riding the crown — the FRONT arc passes over, the back
    // arc dips behind, so it reads as a ring with depth, not a bowl.
    c.save();
    c.translate(0.5, 0.54);
    // Back arc of the braid, dimmed.
    c.strokeStyle = '#4a7a3a';
    c.lineWidth = 0.085;
    c.beginPath();
    c.ellipse(0, 0, 0.3, 0.185, 0, Math.PI * 1.02, Math.PI * 1.98);
    c.stroke();
    // Blooms on the back rim peek over the braid.
    const bloom = (x: number, y: number, s: number, dim: boolean): void => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.35;
        dot(c, dim ? shade(col, -16) : col, x + Math.cos(a) * s, y + Math.sin(a) * s * 0.9, s * 0.6);
      }
      dot(c, dim ? '#a8452f' : '#c4553d', x, y, s * 0.48);
      dot(c, '#fff2cc', x - s * 0.18, y - s * 0.18, s * 0.17);
    };
    bloom(-0.21, -0.15, 0.062, true);
    bloom(0.21, -0.15, 0.062, true);
    // Front arc of the braid: two-tone strands woven over each other.
    c.strokeStyle = '#5f9c46';
    c.lineWidth = 0.095;
    c.beginPath();
    c.ellipse(0, 0, 0.3, 0.185, 0, -0.1, Math.PI * 1.1);
    c.stroke();
    c.strokeStyle = '#79b858';
    c.lineWidth = 0.038;
    for (let i = 0; i < 5; i++) {
      const a = 0.25 + (i / 5) * Math.PI * 0.75;
      c.beginPath();
      c.ellipse(0, 0, 0.3, 0.185, 0, a, a + 0.28);
      c.stroke();
    }
    // Leaf tips tucked in the weave.
    c.fillStyle = '#79b858';
    for (const [lx, ly, la] of [[-0.29, 0.1, 2.4], [0.29, 0.1, 0.7], [0.0, 0.2, 1.5]] as const) {
      c.save();
      c.translate(lx, ly);
      c.rotate(la);
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(0.06, -0.045, 0.11, 0);
      c.quadraticCurveTo(0.06, 0.045, 0, 0);
      c.fill();
      c.restore();
    }
    // Front blooms, biggest at the brow center.
    bloom(-0.26, 0.06, 0.07, false);
    bloom(0.26, 0.06, 0.07, false);
    bloom(0, 0.16, 0.088, false);
    c.restore();
  },
  wateringcan: (c, col) => {
    // Body, high handle, long spout ending in a rose.
    poly(c, col, [[0.3, 0.42], [0.62, 0.42], [0.66, 0.82], [0.26, 0.82]]);
    c.fillStyle = shade(col, 20);
    c.beginPath();
    c.moveTo(0.33, 0.46);
    c.lineTo(0.46, 0.46);
    c.lineTo(0.44, 0.78);
    c.lineTo(0.3, 0.78);
    c.closePath();
    c.fill();
    // Spout.
    poly(c, shade(col, -10), [[0.3, 0.52], [0.14, 0.32], [0.08, 0.38], [0.28, 0.62]]);
    bar(c, shade(col, -22), 0.05, 0.3, 0.1, 0.1);
    // Handle.
    c.strokeStyle = shade(col, -18);
    c.lineWidth = 0.05;
    c.beginPath();
    c.arc(0.5, 0.42, 0.2, Math.PI, 0);
    c.stroke();
    // Drops from the rose.
    for (const [x, y] of [[0.06, 0.48], [0.12, 0.52], [0.08, 0.58]] as const) {
      dot(c, '#7fb2d9', x, y, 0.028);
    }
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.03;
    c.strokeRect(0.3, 0.42, 0.32, 0.4);
  },
};

/**
 * One felled log, and each timber wears its own bark: plain birchwood
 * is clean with a knot; oak runs deep fissured ridges; willow is a
 * slimmer green-skinned bough with lenticel ticks; yew flakes purple-
 * brown over a blood-red heart. The sawn end shows growth rings — the
 * 2.5D plane every log gets for free.
 */
function drawLog(c: CanvasRenderingContext2D, col: string, kind: 'plain' | 'oak' | 'willow' | 'yew' | 'pine'): void {
  c.save();
  c.translate(0.5, 0.52);
  c.rotate(-0.35);
  const hw = kind === 'willow' ? 0.13 : kind === 'oak' ? 0.175 : 0.16;
  const len = 0.37;
  c.fillStyle = col;
  c.strokeStyle = OUTLINE;
  c.lineWidth = 0.034;
  c.beginPath();
  c.roundRect(-len, -hw, len * 2, hw * 2, hw * 0.62);
  c.fill();
  c.stroke();
  // Bark character.
  if (kind === 'oak') {
    // Deep fissures: paired dark ridges with a lit shoulder between.
    c.strokeStyle = shade(col, -26);
    c.lineWidth = 0.026;
    for (const [y0, y1, x0, x1] of [[-0.09, -0.07, -0.3, 0.1], [0.02, 0.05, -0.24, 0.2], [0.1, 0.09, -0.32, -0.02]] as const) {
      c.beginPath();
      c.moveTo(x0, y0);
      c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 0.03, x1, y1);
      c.stroke();
    }
    c.strokeStyle = shade(col, 16);
    c.lineWidth = 0.018;
    c.beginPath();
    c.moveTo(-0.28, -0.035);
    c.quadraticCurveTo(-0.05, -0.01, 0.16, -0.03);
    c.stroke();
  } else if (kind === 'willow') {
    // Smooth young bark: horizontal lenticel ticks, a leafed withy.
    c.strokeStyle = shade(col, -20);
    c.lineWidth = 0.018;
    for (const [x, y] of [[-0.24, -0.05], [-0.1, 0.06], [0.06, -0.06], [0.2, 0.04]] as const) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 0.07, y);
      c.stroke();
    }
    // A sprouting withy with two leaves — willow refuses to be lumber.
    c.strokeStyle = '#6f8a4a';
    c.lineWidth = 0.024;
    c.beginPath();
    c.moveTo(-0.12, -hw);
    c.quadraticCurveTo(-0.16, -hw - 0.12, -0.26, -hw - 0.16);
    c.stroke();
    c.fillStyle = '#87a85e';
    for (const [lx, ly, la] of [[-0.2, -hw - 0.13, -0.6], [-0.26, -hw - 0.15, -1.2]] as const) {
      c.save();
      c.translate(lx, ly);
      c.rotate(la);
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(0.05, -0.035, 0.1, 0);
      c.quadraticCurveTo(0.05, 0.035, 0, 0);
      c.fill();
      c.restore();
    }
  } else if (kind === 'yew') {
    // Flaking bark: lifted purple-brown scales over the red body.
    c.fillStyle = shade(col, -18);
    for (const [x, y, w] of [[-0.28, -0.1, 0.12], [-0.06, 0.02, 0.15], [0.14, -0.08, 0.12]] as const) {
      c.beginPath();
      c.roundRect(x, y, w, 0.07, 0.03);
      c.fill();
    }
    c.fillStyle = shade(col, 14);
    for (const [x, y, w] of [[-0.16, -0.02, 0.09], [0.04, 0.08, 0.1]] as const) {
      c.beginPath();
      c.roundRect(x, y, w, 0.05, 0.025);
      c.fill();
    }
  } else if (kind === 'pine') {
    // Dead-straight grain, twin dark knots, and one amber resin bead
    // welling at the lower edge — the northwood signature.
    c.strokeStyle = shade(col, -20);
    c.lineWidth = 0.018;
    for (const y of [-0.07, 0.0, 0.07] as const) {
      c.beginPath();
      c.moveTo(-0.3, y);
      c.lineTo(0.22, y);
      c.stroke();
    }
    dot(c, shade(col, -32), -0.16, -0.035, 0.03);
    dot(c, shade(col, -32), 0.08, 0.035, 0.026);
    dot(c, '#d8963c', -0.02, 0.128, 0.028);
    dot(c, '#f0be6a', -0.028, 0.12, 0.014);
  } else {
    // Plain timber: one grain line and a dark knot.
    c.strokeStyle = shade(col, -22);
    c.lineWidth = 0.02;
    c.beginPath();
    c.moveTo(-0.28, 0.04);
    c.quadraticCurveTo(0, 0.08, 0.18, 0.03);
    c.stroke();
    dot(c, shade(col, -30), -0.1, -0.06, 0.032);
    dot(c, shade(col, -10), -0.1, -0.06, 0.016);
  }
  // The sawn end: lit face, growth rings, yew's blood-red heart.
  const endX = len - 0.045;
  c.fillStyle = shade(col, 42);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 0.03;
  c.beginPath();
  c.ellipse(endX, 0, 0.085, hw * 0.94, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.strokeStyle = kind === 'yew' ? '#8c3a32' : shade(col, -24);
  c.lineWidth = 0.02;
  c.beginPath();
  c.ellipse(endX, 0, 0.05, hw * 0.55, 0, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.ellipse(endX, 0, 0.022, hw * 0.24, 0, 0, Math.PI * 2);
  c.stroke();
  c.restore();
}

/**
 * A sawyer's stack of three boards — the milled twin of drawLog: same
 * lean, but flat lumber with staggered ends, a lit top arris on each
 * course, square end grain, and one honest knot. Tint carries the
 * species (golden for plain, deep brown for oak).
 */
function drawBoards(c: CanvasRenderingContext2D, col: string): void {
  c.save();
  c.translate(0.5, 0.54);
  c.rotate(-0.35);
  const len = 0.36;
  const bh = 0.075;
  // Bottom-up so each course overlaps the one beneath; ends stagger
  // like a hand-stacked pile, never a machined block.
  const courses: Array<[number, number, number]> = [
    [0.09, 0.03, -14],
    [0, -0.035, -4],
    [-0.09, 0.015, 10],
  ];
  for (const [y, xOff, tone] of courses) {
    const x0 = -len + xOff;
    const x1 = len + xOff * 0.4;
    c.fillStyle = shade(col, tone);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.032;
    c.beginPath();
    c.roundRect(x0, y - bh / 2, x1 - x0, bh, 0.018);
    c.fill();
    c.stroke();
    // Sun catches the top arris of every course.
    c.strokeStyle = shade(col, tone + 30);
    c.lineWidth = 0.018;
    c.beginPath();
    c.moveTo(x0 + 0.03, y - bh / 2 + 0.016);
    c.lineTo(x1 - 0.05, y - bh / 2 + 0.016);
    c.stroke();
    // Square sawn end grain, one ring tick.
    c.fillStyle = shade(col, tone + 42);
    c.beginPath();
    c.roundRect(x1 - 0.052, y - bh / 2 + 0.012, 0.042, bh - 0.024, 0.008);
    c.fill();
    c.strokeStyle = shade(col, tone - 18);
    c.lineWidth = 0.012;
    c.beginPath();
    c.moveTo(x1 - 0.031, y - bh / 2 + 0.018);
    c.lineTo(x1 - 0.031, y + bh / 2 - 0.018);
    c.stroke();
  }
  // The middle board owns the knot.
  dot(c, shade(col, -26), -0.08, -0.035, 0.024);
  dot(c, shade(col, -6), -0.08, -0.035, 0.012);
  c.restore();
}

/**
 * The sawhorse station: two X-trestles, a half-ripped log racked
 * across them, and the rip saw parked upright in its kerf — the icon
 * reads as the work mid-stroke, not the furniture alone.
 */
/**
 * The beast pen: a post-and-rail corner with hay heaped inside — the
 * icon reads as a kept animal's home corner, never bare fencing.
 */
function drawBeastPen(c: CanvasRenderingContext2D, col: string): void {
  const postCol = shade(col, -16);
  // Two posts, square-set, with sun on their sawn tops.
  c.fillStyle = postCol;
  c.strokeStyle = OUTLINE;
  c.lineWidth = 0.03;
  for (const x of [0.16, 0.84] as const) {
    c.beginPath();
    c.roundRect(x - 0.055, 0.3, 0.11, 0.58, 0.03);
    c.fill();
    c.stroke();
    c.fillStyle = shade(postCol, 24);
    c.fillRect(x - 0.055, 0.3, 0.11, 0.05);
    c.fillStyle = postCol;
  }
  // Two rails spanning the posts, the upper catching light.
  c.fillStyle = col;
  for (const [y, lit] of [
    [0.42, 22],
    [0.62, 8],
  ] as const) {
    c.beginPath();
    c.roundRect(0.1, y, 0.8, 0.09, 0.04);
    c.fill();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.026;
    c.stroke();
    c.fillStyle = shade(col, lit);
    c.fillRect(0.14, y + 0.012, 0.72, 0.028);
    c.fillStyle = col;
  }
  // Hay heaped against the rail foot, a few straws escaping.
  c.fillStyle = '#c9a64b';
  c.beginPath();
  c.ellipse(0.5, 0.85, 0.26, 0.1, 0, Math.PI, 0);
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 0.024;
  c.stroke();
  c.strokeStyle = shade('#c9a64b', -22);
  c.lineWidth = 0.018;
  for (const [x0, y0, x1, y1] of [
    [0.34, 0.79, 0.26, 0.72],
    [0.52, 0.76, 0.56, 0.68],
    [0.66, 0.8, 0.74, 0.74],
  ] as const) {
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.stroke();
  }
}

function drawSawhorse(c: CanvasRenderingContext2D, col: string): void {
  const legCol = shade(col, -18);
  // The two X-frames.
  c.strokeStyle = legCol;
  c.lineWidth = 0.06;
  c.lineCap = 'round';
  for (const x of [0.26, 0.72] as const) {
    c.beginPath();
    c.moveTo(x - 0.11, 0.88);
    c.lineTo(x + 0.11, 0.5);
    c.moveTo(x + 0.11, 0.88);
    c.lineTo(x - 0.11, 0.5);
    c.stroke();
  }
  c.lineCap = 'butt';
  // The racked log, riding the crossing points.
  c.fillStyle = col;
  c.strokeStyle = OUTLINE;
  c.lineWidth = 0.034;
  c.beginPath();
  c.roundRect(0.08, 0.42, 0.84, 0.19, 0.09);
  c.fill();
  c.stroke();
  // The kerf: the cut already made, dark and true, from the near end.
  c.strokeStyle = shade(col, -34);
  c.lineWidth = 0.022;
  c.beginPath();
  c.moveTo(0.5, 0.435);
  c.lineTo(0.86, 0.5);
  c.stroke();
  // Sun on the log's upper arris.
  c.strokeStyle = shade(col, 26);
  c.lineWidth = 0.02;
  c.beginPath();
  c.moveTo(0.14, 0.46);
  c.lineTo(0.46, 0.445);
  c.stroke();
  // The rip saw parked in the kerf: blade up, tapering, iron-toothed.
  c.fillStyle = '#b8bec8';
  c.strokeStyle = OUTLINE;
  c.lineWidth = 0.028;
  c.beginPath();
  c.moveTo(0.47, 0.44);
  c.lineTo(0.52, 0.14);
  c.lineTo(0.6, 0.16);
  c.lineTo(0.56, 0.44);
  c.closePath();
  c.fill();
  c.stroke();
  // Wooden grip capping the blade.
  c.fillStyle = shade(col, -10);
  c.beginPath();
  c.roundRect(0.485, 0.09, 0.135, 0.075, 0.035);
  c.fill();
  c.stroke();
}

/**
 * One blocky ore chunk — the icon-scale twin of the world's oreNode:
 * a chamfered deep-toned frame, a bright mineral face biased to the
 * lit top-left, a flat lighter cap band, one hard square glint.
 */
function oreChunk(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  rot: number,
  col: string,
  glint = '#fff6d8',
): void {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  const hh = w * 0.8;
  const cut = w * 0.22;
  poly(c, shade(col, -32), [
    [-w / 2 + cut, -hh / 2],
    [w / 2 - cut, -hh / 2],
    [w / 2, -hh / 2 + cut],
    [w / 2, hh / 2 - cut],
    [w / 2 - cut, hh / 2],
    [-w / 2 + cut, hh / 2],
    [-w / 2, hh / 2 - cut],
    [-w / 2, -hh / 2 + cut],
  ]);
  // Bright face, biased toward the light.
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(-w * 0.36 + cut * 0.6, -hh * 0.42);
  c.lineTo(w * 0.34 - cut * 0.6, -hh * 0.42);
  c.lineTo(w * 0.34, -hh * 0.42 + cut * 0.6);
  c.lineTo(w * 0.34, hh * 0.24);
  c.lineTo(w * 0.34 - cut * 0.6, hh * 0.26);
  c.lineTo(-w * 0.36, hh * 0.26);
  c.lineTo(-w * 0.36, -hh * 0.42 + cut * 0.6);
  c.closePath();
  c.fill();
  // Flat lit cap band + one hard square glint.
  c.fillStyle = shade(col, 24);
  c.fillRect(-w * 0.33, -hh * 0.38, w * 0.64, hh * 0.18);
  c.fillStyle = glint;
  c.fillRect(-w * 0.26, -hh * 0.32, w * 0.2, hh * 0.15);
  c.restore();
}

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

/**
 * Which painter + tint each item renders. EVERY item gets real art;
 * families (capes, bars, ores) share a painter and speak through their
 * identity color, exactly like the world sprites do.
 */
const ITEM_ICON: Record<string, { icon: string; color: string }> = {
  coins: { icon: 'coins', color: '#e8b64c' },
  log: { icon: 'log', color: '#96744c' },
  oak_log: { icon: 'log_oak', color: '#74522f' },
  board: { icon: 'board', color: '#b5854f' },
  oak_board: { icon: 'board', color: '#7a5530' },
  willow_log: { icon: 'log_willow', color: '#94a05e' },
  yew_log: { icon: 'log_yew', color: '#87493a' },
  pine_log: { icon: 'log_pine', color: '#b08050' },
  copper_ore: { icon: 'ore_copper', color: '#c47b3d' },
  tin_ore: { icon: 'ore_tin', color: '#cfd3dc' },
  iron_ore: { icon: 'ore_iron', color: '#a05038' },
  coal: { icon: 'coalpile', color: '#4a4456' },
  gold_ore: { icon: 'nuggets', color: '#e8b64c' },
  silver_ore: { icon: 'ore_silver', color: '#c6cfe0' },
  mithril_ore: { icon: 'ore_mithril', color: '#8fb4e4' },
  adamant_ore: { icon: 'ore_adamant', color: '#6cb47a' },
  obsidian_shard: { icon: 'shard_obsidian', color: '#3b3247' },
  starmetal_ore: { icon: 'ore_starmetal', color: '#d6cbf6' },
  raw_trout: { icon: 'fish', color: '#8fb7d9' },
  trout: { icon: 'fishcooked', color: '#d99a6a' },
  // The fishing ladder: raw wears the water's tint, cooked the fire's.
  raw_pike: { icon: 'fish', color: '#8aa9c9' },
  pike: { icon: 'fishcooked', color: '#d9925f' },
  raw_eel: { icon: 'fish', color: '#7590ad' },
  eel: { icon: 'fishcooked', color: '#d99a54' },
  raw_salmon: { icon: 'fish', color: '#a9c0dd' },
  salmon: { icon: 'fishcooked', color: '#e08a72' },
  raw_glimmerfish: { icon: 'fish', color: '#b5cdef' },
  glimmerfish: { icon: 'fishcooked', color: '#e8b072' },
  raw_chicken: { icon: 'chicken', color: '#ecd3bd' },
  cooked_chicken: { icon: 'chickenleg', color: '#d9a052' },
  raw_beef: { icon: 'meat', color: '#c4645a' },
  cooked_beef: { icon: 'meat', color: '#a05a3a' },
  burnt_food: { icon: 'burnt', color: '#413c4a' },
  bronze_bar: { icon: 'bar', color: '#b0793f' },
  iron_bar: { icon: 'bar', color: '#9aa2ac' },
  steel_bar: { icon: 'bar', color: '#c4cad4' },
  gold_bar: { icon: 'bar', color: '#f2c94c' },
  silver_bar: { icon: 'bar', color: '#dce4f0' },
  mithril_bar: { icon: 'bar', color: '#8fb4e4' },
  adamant_bar: { icon: 'bar', color: '#6cb47a' },
  starsteel_bar: { icon: 'bar', color: '#d6cbf6' },
  gold_ring: { icon: 'ring', color: '#f2c94c' },
  silver_ring: { icon: 'ring', color: '#dce4f0' },
  leather: { icon: 'hide', color: '#b08a5c' },
  cowhide: { icon: 'hide', color: '#a08468' },
  scrap_hide: { icon: 'hide', color: '#8a6f52' },
  // Quest items — papers and tokens; the color says whose.
  redmask_writ: { icon: 'scroll', color: '#c26a5a' },
  reavers_mark: { icon: 'ring', color: '#5a5666' },
  torn_ledger_page: { icon: 'scroll', color: '#e6ddc2' },
  marked_tool: { icon: 'pickaxe', color: '#8d94a3' },
  crew_paytin: { icon: 'jar', color: '#a9976a' },
  gilded_locket: { icon: 'gem', color: '#d8b45a' },
  weathered_letter: { icon: 'scroll', color: '#cfc5ab' },
  hardened_leather: { icon: 'hide', color: '#7d5636' },
  linen_scrap: { icon: 'ragswatch', color: '#ddd6c2' },
  linen: { icon: 'linenbolt', color: '#e4dcc4' },
  gloomsilk_thread: { icon: 'threadspool', color: '#5a4a78' },
  gloomsilk: { icon: 'silkbolt', color: '#6a5690' },
  wolf_fur: { icon: 'hide', color: '#8a90a0' },
  direwolf_pelt: { icon: 'hide', color: '#5d5a68' },
  worg_fang: { icon: 'fang', color: '#d8ccb0' },
  gnoll_hide: { icon: 'spottedhide', color: '#7f6d4c' },
  packlord_mane: { icon: 'mane', color: '#4e4034' },
  leather_body: { icon: 'jerkin', color: '#b08a5c' },
  bones: { icon: 'bones', color: '#efe8d8' },
  feather: { icon: 'feather', color: '#f4efe4' },
  bronze_axe: { icon: 'axe', color: '#b0793f' },
  bronze_pickaxe: { icon: 'pickaxe', color: '#b0793f' },
  iron_axe: { icon: 'axe', color: '#9aa2ac' },
  iron_pickaxe: { icon: 'pickaxe', color: '#9aa2ac' },
  steel_axe: { icon: 'axe', color: '#c4cad4' },
  steel_pickaxe: { icon: 'pickaxe', color: '#c4cad4' },
  mithril_axe: { icon: 'axe', color: '#8fb4e4' },
  mithril_pickaxe: { icon: 'pickaxe', color: '#8fb4e4' },
  adamant_axe: { icon: 'axe', color: '#6cb47a' },
  adamant_pickaxe: { icon: 'pickaxe', color: '#6cb47a' },
  starsteel_axe: { icon: 'axe', color: '#d6cbf6' },
  starsteel_pickaxe: { icon: 'pickaxe', color: '#d6cbf6' },
  fishing_rod: { icon: 'rod', color: '#c4a35a' },
  bronze_dagger: { icon: 'dagger', color: '#c98d4b' },
  iron_dagger: { icon: 'dagger', color: '#b6bcc6' },
  bronze_sword: { icon: 'sword', color: '#c98d4b' },
  iron_helm: { icon: 'helm', color: '#9aa2ac' },
  iron_sword: { icon: 'sword', color: '#b6bcc6' },
  steel_sword: { icon: 'sword', color: '#e2e8f0' },
  oak_shortbow: { icon: 'bow', color: '#8a6a45' },
  willow_longbow: { icon: 'bow', color: '#7fa46a' },
  arrow: { icon: 'arrow', color: '#c4b590' },
  apprentice_staff: { icon: 'staff', color: '#9a7ae0' },
  ember_staff: { icon: 'staff', color: '#ff8a3c' },
  ember_charm: { icon: 'gem', color: '#ff8a3c' },
  // The battlestaff swap stones — one gem painter, four schools.
  emberstone: { icon: 'gem', color: '#e8683c' },
  frostshard: { icon: 'gem', color: '#9ad0ec' },
  stormpearl: { icon: 'gem', color: '#e8e29a' },
  bloomstone: { icon: 'bloomstone', color: '#7ac46a' },
  // Enchanting reagents — dust on the nugget pile, essences on the gem.
  arcane_dust: { icon: 'dust', color: '#b8a8e0' },
  brass_key: { icon: 'key', color: '#c9a23e' },
  dungeon_key: { icon: 'dungeonkey', color: '#8f7bd9' },
  ember_essence: { icon: 'essence', color: '#e8885c' },
  frost_essence: { icon: 'essence', color: '#b8e0f4' },
  storm_essence: { icon: 'essence', color: '#f0eab8' },
  verdant_essence: { icon: 'essence', color: '#9ad48a' },
  crimson_essence: { icon: 'essence', color: '#d06868' },
  verdant_totem: { icon: 'totem', color: '#7ab06a' },
  snare_kit: { icon: 'trap', color: '#b0a05a' },
  storm_bell: { icon: 'bell', color: '#e8d06a' },
  straw_decoy: { icon: 'decoy', color: '#c4a35a' },
  aegis_stone: { icon: 'shield', color: '#8a9484' },
  storm_coil: { icon: 'ring', color: '#e8d06a' },
  bramble_band: { icon: 'ring', color: '#5a7a42' },
  seeker_stone: { icon: 'gem', color: '#b49af0' },
  fang_band: { icon: 'ring', color: '#a0c050' },
  sigil_fallen_champion: { icon: 'skull', color: '#e8b64c' },
  spiked_buckler: { icon: 'shield', color: '#a5794e' },
  frost_quiver: { icon: 'quiver', color: '#8ac4e8' },
  tome_of_embers: { icon: 'tome', color: '#b0543a' },
  oak_kiteshield: { icon: 'kiteshield', color: '#8a6234' },
  arcane_orb: { icon: 'orb', color: '#8f9ed6' },
  // Rolled armor roster — one painter per silhouette family, tinted.
  apprentice_robe: { icon: 'robe', color: '#5a6ea0' },
  emberweave_robe: { icon: 'robe', color: '#c4553d' },
  huntsman_jerkin: { icon: 'jerkin', color: '#3f6b3a' },
  iron_platebody: { icon: 'platebody', color: '#8d9299' },
  steel_platebody: { icon: 'platebody', color: '#b8bec8' },
  leather_hood: { icon: 'hood', color: '#8a6a45' },
  wolfhide_hood: { icon: 'hood', color: '#6a6f7d' },
  runecloth_cowl: { icon: 'hood', color: '#7a5ac4' },
  wizards_hat: { icon: 'wizardhat', color: '#4a5a9c' },
  steel_greathelm: { icon: 'greathelm', color: '#b8bec8' },
  horned_raider_helm: { icon: 'helm', color: '#7d6a52' },
  woven_trousers: { icon: 'legs', color: '#8f9ed6' },
  leather_chaps: { icon: 'legs', color: '#b08a5c' },
  iron_greaves: { icon: 'legs', color: '#8d9299' },
  steel_greaves: { icon: 'legs', color: '#b8bec8' },
  swiftstep_boots: { icon: 'boots', color: '#7fc9b3' },
  leather_boots: { icon: 'boots', color: '#6b4a26' },
  wanderer_boots: { icon: 'boots', color: '#8a6a45' },
  iron_sabatons: { icon: 'boots', color: '#8d9299' },
  steel_sabatons: { icon: 'boots', color: '#b8bec8' },
  tower_shield: { icon: 'shield', color: '#8d9299' },
  frostplate_greatshield: { icon: 'shield', color: '#9db6cc' },
  bulwark_bastion: { icon: 'shield', color: '#5a6270' },
  sunforged_aegis: { icon: 'shield', color: '#d4a43c' },
  gobnail_warboard: { icon: 'shield', color: '#6b5233' },
  wolfjaw_targe: { icon: 'shield', color: '#7a5a38' },
  bonespur_ward: { icon: 'shield', color: '#d9d2bd' },
  kingsward: { icon: 'shield', color: '#8a2431' },
  dreadforge_thornwall: { icon: 'shield', color: '#3a3d46' },
  // Themed plate sets — family painters carry the shape, the palette
  // carries the identity.
  warden_helm: { icon: 'helm', color: '#4a7a5a' },
  warden_platebody: { icon: 'platebody', color: '#4a7a5a' },
  warden_greaves: { icon: 'legs', color: '#4a7a5a' },
  warden_sabatons: { icon: 'boots', color: '#4a7a5a' },
  frostplate_helm: { icon: 'helm', color: '#9db6cc' },
  frostplate_platebody: { icon: 'platebody', color: '#9db6cc' },
  frostplate_greaves: { icon: 'legs', color: '#9db6cc' },
  frostplate_sabatons: { icon: 'boots', color: '#9db6cc' },
  bulwark_greathelm: { icon: 'greathelm', color: '#5a6270' },
  bulwark_platebody: { icon: 'platebody', color: '#5a6270' },
  bulwark_greaves: { icon: 'legs', color: '#5a6270' },
  bulwark_sabatons: { icon: 'boots', color: '#5a6270' },
  dreadforge_helm: { icon: 'helm', color: '#4a4553' },
  dreadforge_platebody: { icon: 'platebody', color: '#4a4553' },
  dreadforge_greaves: { icon: 'legs', color: '#4a4553' },
  dreadforge_sabatons: { icon: 'boots', color: '#4a4553' },
  sunforged_helm: { icon: 'helm', color: '#d4a43c' },
  sunforged_platebody: { icon: 'platebody', color: '#d4a43c' },
  sunforged_greaves: { icon: 'legs', color: '#d4a43c' },
  sunforged_sabatons: { icon: 'boots', color: '#d4a43c' },
  // Themed leather sets — same colorway law as the plate wardrobe.
  wayfarer_hood: { icon: 'hood', color: '#a8895a' },
  wayfarer_jerkin: { icon: 'jerkin', color: '#a8895a' },
  wayfarer_chaps: { icon: 'legs', color: '#a8895a' },
  wayfarer_boots: { icon: 'boots', color: '#8a6a45' },
  wolfstalker_hood: { icon: 'hood', color: '#5f6470' },
  wolfstalker_jerkin: { icon: 'jerkin', color: '#5f6470' },
  wolfstalker_chaps: { icon: 'legs', color: '#5f6470' },
  wolfstalker_boots: { icon: 'boots', color: '#4f5460' },
  nightveil_cowl: { icon: 'hood', color: '#3a3648' },
  nightveil_jerkin: { icon: 'jerkin', color: '#3a3648' },
  nightveil_leggings: { icon: 'legs', color: '#3a3648' },
  nightveil_boots: { icon: 'boots', color: '#302c3c' },
  drakescale_coif: { icon: 'helm', color: '#8c3a32' },
  drakescale_body: { icon: 'jerkin', color: '#8c3a32' },
  drakescale_chaps: { icon: 'legs', color: '#8c3a32' },
  drakescale_boots: { icon: 'boots', color: '#8c3a32' },
  stagheart_hood: { icon: 'hood', color: '#6b5138' },
  stagheart_jerkin: { icon: 'jerkin', color: '#6b5138' },
  stagheart_chaps: { icon: 'legs', color: '#6b5138' },
  stagheart_boots: { icon: 'boots', color: '#5a4430' },
  hunters_quiver: { icon: 'quiver', color: '#8a6a45' },
  // The named wardrobe — six chase sets with owners.
  moonbell_hood: { icon: 'hood', color: '#545a86' },
  moonbell_robe: { icon: 'robe', color: '#545a86' },
  moonbell_skirts: { icon: 'legs', color: '#434871' },
  moonbell_slippers: { icon: 'boots', color: '#434871' },
  riftweave_cowl: { icon: 'hood', color: '#2b2438' },
  riftweave_robe: { icon: 'robe', color: '#2b2438' },
  riftweave_skirts: { icon: 'legs', color: '#221c2e' },
  riftweave_slippers: { icon: 'boots', color: '#221c2e' },
  adderfang_hood: { icon: 'hood', color: '#74683c' },
  adderfang_jerkin: { icon: 'jerkin', color: '#74683c' },
  adderfang_leggings: { icon: 'legs', color: '#74683c' },
  adderfang_boots: { icon: 'boots', color: '#5c5230' },
  broodsilk_cowl: { icon: 'hood', color: '#2c2a34' },
  broodsilk_jerkin: { icon: 'jerkin', color: '#2c2a34' },
  broodsilk_leggings: { icon: 'legs', color: '#2c2a34' },
  broodsilk_boots: { icon: 'boots', color: '#232028' },
  aurochs_helm: { icon: 'helm', color: '#4a3f36' },
  aurochs_platebody: { icon: 'platebody', color: '#4a3f36' },
  aurochs_greaves: { icon: 'legs', color: '#4a3f36' },
  aurochs_sabatons: { icon: 'boots', color: '#4a3f36' },
  barrowking_helm: { icon: 'helm', color: '#3a4038' },
  barrowking_platebody: { icon: 'platebody', color: '#3a4038' },
  barrowking_greaves: { icon: 'legs', color: '#3a4038' },
  barrowking_sabatons: { icon: 'boots', color: '#3a4038' },
  stormcrown_helm: { icon: 'helm', color: '#46506e' },
  stormcrown_platebody: { icon: 'platebody', color: '#46506e' },
  stormcrown_greaves: { icon: 'legs', color: '#46506e' },
  stormcrown_sabatons: { icon: 'boots', color: '#46506e' },
  forgeheart_helm: { icon: 'helm', color: '#33302e' },
  forgeheart_platebody: { icon: 'platebody', color: '#33302e' },
  forgeheart_greaves: { icon: 'legs', color: '#33302e' },
  forgeheart_sabatons: { icon: 'boots', color: '#33302e' },
  wyrmsteel_helm: { icon: 'helm', color: '#2e4438' },
  wyrmsteel_platebody: { icon: 'platebody', color: '#2e4438' },
  wyrmsteel_greaves: { icon: 'legs', color: '#2e4438' },
  wyrmsteel_sabatons: { icon: 'boots', color: '#2e4438' },
  oathgold_helm: { icon: 'helm', color: '#c9a23c' },
  oathgold_platebody: { icon: 'platebody', color: '#c9a23c' },
  oathgold_greaves: { icon: 'legs', color: '#c9a23c' },
  oathgold_sabatons: { icon: 'boots', color: '#c9a23c' },
  // The legendary cloth road — four vestments down the leveling bands.
  wintercourt_crown: { icon: 'circlet', color: '#cfe4f0' },
  wintercourt_robe: { icon: 'robe', color: '#3a5a74' },
  wintercourt_skirts: { icon: 'legs', color: '#2e4a60' },
  wintercourt_slippers: { icon: 'boots', color: '#2e4a60' },
  vigil_circlet: { icon: 'circlet', color: '#c9a23c' },
  vigil_robe: { icon: 'robe', color: '#e0d6bc' },
  vigil_skirts: { icon: 'legs', color: '#c2b696' },
  vigil_slippers: { icon: 'boots', color: '#c2b696' },
  skydancer_hood: { icon: 'hood', color: '#33465e' },
  skydancer_robe: { icon: 'robe', color: '#33465e' },
  skydancer_skirts: { icon: 'legs', color: '#283a4e' },
  skydancer_slippers: { icon: 'boots', color: '#283a4e' },
  orrery_diadem: { icon: 'circlet', color: '#c9a23c' },
  orrery_robe: { icon: 'robe', color: '#262e4e' },
  orrery_skirts: { icon: 'legs', color: '#1e2540' },
  orrery_slippers: { icon: 'boots', color: '#1e2540' },
  // The legendary leather road — four hunter and assassin kits.
  hartsong_crown: { icon: 'hood', color: '#33472e' },
  hartsong_jerkin: { icon: 'jerkin', color: '#33472e' },
  hartsong_leggings: { icon: 'legs', color: '#2a3b26' },
  hartsong_treads: { icon: 'boots', color: '#2a3b26' },
  skytalon_helm: { icon: 'hood', color: '#46596e' },
  skytalon_harness: { icon: 'jerkin', color: '#46596e' },
  skytalon_leggings: { icon: 'legs', color: '#32404f' },
  skytalon_striders: { icon: 'boots', color: '#32404f' },
  cindershade_cowl: { icon: 'hood', color: '#332e2c' },
  cindershade_jerkin: { icon: 'jerkin', color: '#332e2c' },
  cindershade_leggings: { icon: 'legs', color: '#2a2624' },
  cindershade_soles: { icon: 'boots', color: '#241f1e' },
  rookfeather_cowl: { icon: 'hood', color: '#2a2e38' },
  rookfeather_mantle: { icon: 'jerkin', color: '#2a2e38' },
  rookfeather_leggings: { icon: 'legs', color: '#232630' },
  rookfeather_steps: { icon: 'boots', color: '#1e2128' },
  // Themed cloth sets — same colorway law as the other wardrobes.
  hedgemage_hat: { icon: 'wizardhat', color: '#5a6b3a' },
  hedgemage_robe: { icon: 'robe', color: '#5a6b3a' },
  hedgemage_skirts: { icon: 'legs', color: '#5a6b3a' },
  hedgemage_slippers: { icon: 'boots', color: '#8a7a3c' },
  tidecaller_hood: { icon: 'hood', color: '#2f6a78' },
  tidecaller_robe: { icon: 'robe', color: '#2f6a78' },
  tidecaller_skirts: { icon: 'legs', color: '#2f6a78' },
  tidecaller_slippers: { icon: 'boots', color: '#1f4a55' },
  voidwhisper_cowl: { icon: 'hood', color: '#453a5c' },
  voidwhisper_robe: { icon: 'robe', color: '#453a5c' },
  voidwhisper_skirts: { icon: 'legs', color: '#453a5c' },
  voidwhisper_slippers: { icon: 'boots', color: '#2e2740' },
  cindersworn_hood: { icon: 'hood', color: '#4a3a38' },
  cindersworn_robe: { icon: 'robe', color: '#4a3a38' },
  cindersworn_skirts: { icon: 'legs', color: '#4a3a38' },
  cindersworn_slippers: { icon: 'boots', color: '#332826' },
  starweaver_circlet: { icon: 'circlet', color: '#c8cee8' },
  starweaver_robe: { icon: 'robe', color: '#2c3260' },
  starweaver_skirts: { icon: 'legs', color: '#2c3260' },
  starweaver_slippers: { icon: 'boots', color: '#232850' },
  scholars_tome: { icon: 'tome', color: '#4a5a9c' },
  wolf_pelt_cloak: { icon: 'cape', color: '#8a90a0' },
  cape_traveler: { icon: 'cape', color: '#7da35a' },
  cape_emberweave: { icon: 'cape', color: '#c4553d' },
  cape_champion: { icon: 'cape', color: '#b04a5c' },
  cape_ragged: { icon: 'cape', color: '#8a7a5f' },
  cape_banner: { icon: 'banner', color: '#a34434' },
  cape_huntsman: { icon: 'cape', color: '#5c8a54' },
  cape_midnight: { icon: 'cape', color: '#565080' },
  cape_gilded: { icon: 'cape', color: '#c9a23c' },
  cape_storm: { icon: 'cape', color: '#6a7ea0' },
  cape_royal: { icon: 'cape', color: '#8a5cc4' },
  cape_celestial: { icon: 'cape', color: '#7078c4' },
  cape_phoenix: { icon: 'cape', color: '#e05438' },
  carrot_seed: { icon: 'seeds', color: '#e8873d' },
  sagewort_seed: { icon: 'seeds', color: '#8fb083' },
  sunflower_seed: { icon: 'seeds', color: '#e8c04c' },
  wheat_seed: { icon: 'seeds', color: '#d9b45c' },
  cotton_seed: { icon: 'seeds', color: '#e8e4da' },
  moonbell_seed: { icon: 'seeds', color: '#8f9ed6' },
  tree_seed: { icon: 'seeds', color: '#7a9b4a' },
  acorn: { icon: 'seeds', color: '#8a6a3a' },
  pine_cone: { icon: 'seeds', color: '#6f5a3c' },
  willow_cutting: { icon: 'herb', color: '#87a06b' },
  yew_seed: { icon: 'seeds', color: '#4a6b52' },
  bush_cutting: { icon: 'herb', color: '#9b5a6b' },
  carrot: { icon: 'carrot', color: '#e8873d' },
  sagewort: { icon: 'herb', color: '#8fb083' },
  sunflower: { icon: 'sunflower', color: '#e8c04c' },
  wheat: { icon: 'wheat', color: '#d9b45c' },
  cotton: { icon: 'cottonpuff', color: '#f2efe6' },
  moonbell: { icon: 'bells', color: '#8f9ed6' },
  berries: { icon: 'berries', color: '#a04a6e' },
  plant_fibre: { icon: 'fibre', color: '#79a355' },
  twine: { icon: 'twine', color: '#b0a068' },
  cloth: { icon: 'clothbolt', color: '#e8e4da' },
  flour: { icon: 'floursack', color: '#f2efe6' },
  milk: { icon: 'milkpail', color: '#f4f2ec' },
  egg: { icon: 'egg', color: '#e8d9b0' },
  bread: { icon: 'bread', color: '#c49a5c' },
  fried_egg: { icon: 'friedegg', color: '#f2c04c' },
  hearty_stew: { icon: 'stew', color: '#b06a4a' },
  cake: { icon: 'cakeicon', color: '#e8b6c9' },
  // The apothecary's shelf speaks in silhouettes: round flask =
  // tincture you drink, stoneware jug = brew, slim vial = tonic,
  // fanged angular bottle = a blade oil you'd best not drink.
  healing_tincture: { icon: 'bottle', color: '#d65a5a' },
  gatherers_brew: { icon: 'jug', color: '#7fc9b3' },
  swiftness_tonic: { icon: 'vial', color: '#8fd0e8' },
  ironbark_tonic: { icon: 'vial', color: '#9c7440' },
  mending_salve: { icon: 'jar', color: '#c9a8e8' },
  venom_gland: { icon: 'gland', color: '#8a9a3a' },
  pine_resin: { icon: 'resin', color: '#d8963c' },
  firepitch_oil: { icon: 'oilvial', color: '#e07a38' },
  adderfang_oil: { icon: 'oilvial', color: '#a0c050' },
  hobble_brew: { icon: 'jug', color: '#8f9ed6' },
  vipers_kiss: { icon: 'oilvial', color: '#7a9a2a' },
  leadfoot_oil: { icon: 'oilvial', color: '#6a7ab8' },
  wyrmtongue_oil: { icon: 'oilvial', color: '#4a6a2a' },
  flower_crown: { icon: 'flowercrown', color: '#e8c04c' },
  watering_can: { icon: 'wateringcan', color: '#7a8fa5' },
  // Early-game cloth sets — colorway variants are registered by the
  // loop below, pulling each dye lot's palette off its item def.
  thistledown_hood: { icon: 'hood', color: '#c9bfa3' },
  thistledown_robe: { icon: 'robe', color: '#c9bfa3' },
  thistledown_skirts: { icon: 'legs', color: '#c9bfa3' },
  thistledown_slippers: { icon: 'boots', color: '#a89a80' },
  mothwing_cowl: { icon: 'hood', color: '#8a8a72' },
  mothwing_robe: { icon: 'robe', color: '#8a8a72' },
  mothwing_skirts: { icon: 'legs', color: '#8a8a72' },
  mothwing_slippers: { icon: 'boots', color: '#6e6e5a' },
  dawnsworn_hood: { icon: 'hood', color: '#d9c9a0' },
  dawnsworn_robe: { icon: 'robe', color: '#d9c9a0' },
  dawnsworn_skirts: { icon: 'legs', color: '#d9c9a0' },
  dawnsworn_slippers: { icon: 'boots', color: '#b8a87e' },
  fenwalker_hood: { icon: 'hood', color: '#4a6b5c' },
  fenwalker_robe: { icon: 'robe', color: '#4a6b5c' },
  fenwalker_skirts: { icon: 'legs', color: '#4a6b5c' },
  fenwalker_slippers: { icon: 'boots', color: '#3a564a' },
  stormwoven_hood: { icon: 'hood', color: '#4e5a78' },
  stormwoven_robe: { icon: 'robe', color: '#4e5a78' },
  stormwoven_skirts: { icon: 'legs', color: '#4e5a78' },
  stormwoven_slippers: { icon: 'boots', color: '#4e5a78' },
  // Early-game leather sets — dye lots registered by the same loop.
  hareswift_hood: { icon: 'hood', color: '#c2a878' },
  hareswift_jerkin: { icon: 'jerkin', color: '#c2a878' },
  hareswift_chaps: { icon: 'legs', color: '#c2a878' },
  hareswift_boots: { icon: 'boots', color: '#a88f60' },
  kingfisher_hood: { icon: 'hood', color: '#2f7a8a' },
  kingfisher_jerkin: { icon: 'jerkin', color: '#2f7a8a' },
  kingfisher_chaps: { icon: 'legs', color: '#2f7a8a' },
  kingfisher_boots: { icon: 'boots', color: '#256575' },
  cutpurse_cowl: { icon: 'hood', color: '#4e4438' },
  cutpurse_jerkin: { icon: 'jerkin', color: '#4e4438' },
  cutpurse_leggings: { icon: 'legs', color: '#4e4438' },
  cutpurse_boots: { icon: 'boots', color: '#3a332c' },
  trapline_hood: { icon: 'hood', color: '#8a7248' },
  trapline_jerkin: { icon: 'jerkin', color: '#8a7248' },
  trapline_chaps: { icon: 'legs', color: '#8a7248' },
  trapline_boots: { icon: 'boots', color: '#6e5a3c' },
  emberfox_hood: { icon: 'hood', color: '#b05a30' },
  emberfox_jerkin: { icon: 'jerkin', color: '#b05a30' },
  emberfox_leggings: { icon: 'legs', color: '#b05a30' },
  emberfox_boots: { icon: 'boots', color: '#3a3230' },
  // Early-game plate sets — forge lots registered by the same loop.
  tuskguard_helm: { icon: 'helm', color: '#a4744b' },
  tuskguard_platebody: { icon: 'platebody', color: '#a4744b' },
  tuskguard_greaves: { icon: 'legs', color: '#a4744b' },
  tuskguard_sabatons: { icon: 'boots', color: '#a4744b' },
  valiant_helm: { icon: 'helm', color: '#c9ccd4' },
  valiant_platebody: { icon: 'platebody', color: '#c9ccd4' },
  valiant_greaves: { icon: 'legs', color: '#c9ccd4' },
  valiant_sabatons: { icon: 'boots', color: '#c9ccd4' },
  ramwall_helm: { icon: 'helm', color: '#6a7080' },
  ramwall_platebody: { icon: 'platebody', color: '#6a7080' },
  ramwall_greaves: { icon: 'legs', color: '#6a7080' },
  ramwall_sabatons: { icon: 'boots', color: '#6a7080' },
  briarplate_helm: { icon: 'helm', color: '#3e4a38' },
  briarplate_platebody: { icon: 'platebody', color: '#3e4a38' },
  briarplate_greaves: { icon: 'legs', color: '#3e4a38' },
  briarplate_sabatons: { icon: 'boots', color: '#3e4a38' },
  sentinel_greathelm: { icon: 'greathelm', color: '#55607a' },
  sentinel_platebody: { icon: 'platebody', color: '#55607a' },
  sentinel_greaves: { icon: 'legs', color: '#55607a' },
  sentinel_sabatons: { icon: 'boots', color: '#55607a' },
  // Gloves: the fifth armor slot. Soft classes share the `gloves`
  // painter, plate shares `gauntlet`; identity rides the set color and
  // the EARLY_COLORWAYS loop below spreads the dye lots for free.
  padded_mitts: { icon: 'gloves', color: '#8a8ab0' },
  leather_gloves: { icon: 'gloves', color: '#b08a5c' },
  iron_gauntlets: { icon: 'gauntlet', color: '#8d9299' },
  steel_gauntlets: { icon: 'gauntlet', color: '#b8bec8' },
  warden_gauntlets: { icon: 'gauntlet', color: '#4a7a5a' },
  frostplate_gauntlets: { icon: 'gauntlet', color: '#9db6cc' },
  bulwark_gauntlets: { icon: 'gauntlet', color: '#5a6270' },
  dreadforge_gauntlets: { icon: 'gauntlet', color: '#4a4553' },
  sunforged_gauntlets: { icon: 'gauntlet', color: '#d4a43c' },
  wayfarer_gloves: { icon: 'gloves', color: '#a8895a' },
  wolfstalker_gloves: { icon: 'gloves', color: '#5f6470' },
  nightveil_gloves: { icon: 'gloves', color: '#302c3c' },
  drakescale_gloves: { icon: 'gloves', color: '#8c3a32' },
  stagheart_gloves: { icon: 'gloves', color: '#5a4430' },
  hedgemage_gloves: { icon: 'gloves', color: '#5a6b3a' },
  tidecaller_gloves: { icon: 'gloves', color: '#1f4a55' },
  voidwhisper_gloves: { icon: 'gloves', color: '#352c48' },
  cindersworn_gloves: { icon: 'gloves', color: '#332826' },
  starweaver_gloves: { icon: 'gloves', color: '#2c3260' },
  thistledown_wraps: { icon: 'gloves', color: '#c9bfa3' },
  mothwing_wraps: { icon: 'gloves', color: '#8a8a72' },
  dawnsworn_wraps: { icon: 'gloves', color: '#d9c9a0' },
  fenwalker_wraps: { icon: 'gloves', color: '#4a6b5c' },
  stormwoven_wraps: { icon: 'gloves', color: '#4e5a78' },
  hareswift_gloves: { icon: 'gloves', color: '#c2a878' },
  kingfisher_gloves: { icon: 'gloves', color: '#2f7a8a' },
  cutpurse_gloves: { icon: 'gloves', color: '#4e4438' },
  trapline_gloves: { icon: 'gloves', color: '#8a7248' },
  emberfox_gloves: { icon: 'gloves', color: '#3a3230' },
  moonbell_wraps: { icon: 'gloves', color: '#545a86' },
  riftweave_wraps: { icon: 'gloves', color: '#2b2438' },
  wintercourt_wraps: { icon: 'gloves', color: '#3a5a74' },
  vigil_wraps: { icon: 'gloves', color: '#e0d6bc' },
  skydancer_wraps: { icon: 'gloves', color: '#33465e' },
  orrery_wraps: { icon: 'gloves', color: '#262e4e' },
  adderfang_gloves: { icon: 'gloves', color: '#74683c' },
  broodsilk_gloves: { icon: 'gloves', color: '#2c2a34' },
  hartsong_grips: { icon: 'gloves', color: '#33472e' },
  skytalon_talons: { icon: 'gloves', color: '#46596e' },
  cindershade_grips: { icon: 'gloves', color: '#332e2c' },
  rookfeather_fingers: { icon: 'gloves', color: '#2a2e38' },
  aurochs_gauntlets: { icon: 'gauntlet', color: '#4a3f36' },
  barrowking_gauntlets: { icon: 'gauntlet', color: '#3a4038' },
  stormcrown_gauntlets: { icon: 'gauntlet', color: '#46506e' },
  forgeheart_gauntlets: { icon: 'gauntlet', color: '#33302e' },
  wyrmsteel_gauntlets: { icon: 'gauntlet', color: '#2e4438' },
  oathgold_gauntlets: { icon: 'gauntlet', color: '#c9a23c' },
  tuskguard_gauntlets: { icon: 'gauntlet', color: '#a4744b' },
  valiant_gauntlets: { icon: 'gauntlet', color: '#c9ccd4' },
  ramwall_gauntlets: { icon: 'gauntlet', color: '#6a7080' },
  briarplate_gauntlets: { icon: 'gauntlet', color: '#3e4a38' },
  sentinel_gauntlets: { icon: 'gauntlet', color: '#55607a' },
};

// Colorway variants inherit their base piece's painter; the tint comes
// off the item def, so a new dye lot is zero icon work by construction.
{
  const EARLY_COLORWAYS: Record<string, string[]> = {
    thistledown: ['madder', 'woad', 'bracken'],
    mothwing: ['luna', 'dusk', 'ember'],
    dawnsworn: ['duskvow', 'highnoon', 'eclipse'],
    fenwalker: ['mirebloom', 'rustsedge', 'graymist'],
    stormwoven: ['thunderhead', 'sunshower', 'aurora'],
    hareswift: ['clover', 'snowmelt', 'sorrel'],
    kingfisher: ['reedmace', 'stormgull', 'sundart'],
    cutpurse: ['alleyrat', 'moonless', 'redhand'],
    trapline: ['juniper', 'riverclay', 'nightsnare'],
    emberfox: ['silverfox', 'shadowfox', 'dawnfox'],
    tuskguard: ['ironshod', 'gilded', 'ashen'],
    valiant: ['crimson', 'azure', 'gilded'],
    ramwall: ['steelhorn', 'goldhorn', 'stormram'],
    briarplate: ['bloodbriar', 'bonebriar', 'nightbriar'],
    sentinel: ['daybreak', 'bloodwatch', 'midnight'],
  };
  const CLOTH_PIECES = ['hood', 'robe', 'skirts', 'slippers', 'wraps'];
  const LEATHER_PIECES = ['hood', 'jerkin', 'chaps', 'boots', 'gloves'];
  const PLATE_PIECES = ['helm', 'platebody', 'greaves', 'sabatons', 'gauntlets'];
  const PIECES: Record<string, string[]> = {
    mothwing: ['cowl', 'robe', 'skirts', 'slippers', 'wraps'],
    hareswift: LEATHER_PIECES,
    kingfisher: LEATHER_PIECES,
    cutpurse: ['cowl', 'jerkin', 'leggings', 'boots', 'gloves'],
    trapline: LEATHER_PIECES,
    emberfox: ['hood', 'jerkin', 'leggings', 'boots', 'gloves'],
    tuskguard: PLATE_PIECES,
    valiant: PLATE_PIECES,
    ramwall: PLATE_PIECES,
    briarplate: PLATE_PIECES,
    sentinel: ['greathelm', 'platebody', 'greaves', 'sabatons', 'gauntlets'],
  };
  for (const [set, dyes] of Object.entries(EARLY_COLORWAYS)) {
    for (const piece of PIECES[set] ?? CLOTH_PIECES) {
      const base = ITEM_ICON[`${set}_${piece}`]!;
      for (const dye of dyes) {
        const id = `${set}_${piece}_${dye}`;
        ITEM_ICON[id] = { icon: base.icon, color: itemDef(id)?.color ?? base.color };
      }
    }
  }
}

// ---- the blade roster: every sword's icon IS its world painter. The
// same SwordStyle that dresses the hand draws the pack glyph — bespoke
// silhouettes, guards, and fx with zero art drift, framed on the same
// diagonal as the classic sword glyph. nowMs is pinned so cached icons
// hold one deterministic fx frame.
{
  for (const [id, st] of Object.entries({ ...SWORD_STYLES, ...DAGGER_STYLES })) {
    // Daggers are short — render bigger and shift less so the knife
    // fills the same diagonal the swords command.
    // Chunky-icon law: the pack glyph rides the box DIAGONAL (90px in
    // a 64 frame), so the painter can render ~35% bigger than a
    // square fit — thickness comes free with the length headroom.
    const dagger = id in DAGGER_STYLES;
    const scale = dagger ? 118 : 105;
    const shift = dagger ? -12 : -20;
    PAINTERS[`sword:${id}`] = (c) => {
      c.translate(0.5, 0.5);
      c.rotate(-Math.PI / 4);
      // drawSword thinks in body-scale pixels: render inside a /64
      // frame so its px-floor line widths stay subpixel-honest.
      c.scale(1 / 64, 1 / 64);
      c.translate(shift, 0);
      drawSword(c, st, scale, 5234, false);
    };
    ITEM_ICON[id] = { icon: `sword:${id}`, color: st.color };
  }
}

// ---- the archer's roster: every bow's icon IS its world painter, at
// rest (string taut, no arrow) on the same diagonal. Longbows are tall
// — render smaller so the full stave fits the box.
{
  for (const [id, st] of Object.entries(BOW_STYLES)) {
    // Same diagonal headroom as the blades — a bow is all silhouette,
    // so the fatter limbs and visible grain matter double here.
    const tall = st.bow === 'longbow' || st.bow === 'siege';
    const scale = tall ? 92 : 108;
    const shift = -0.15 * scale;
    PAINTERS[`bow:${id}`] = (c) => {
      c.translate(0.5, 0.5);
      c.rotate(-Math.PI / 4);
      c.scale(1 / 64, 1 / 64);
      c.translate(shift, 0);
      drawBow(c, st, scale, 5234, false, 0, undefined);
    };
    ITEM_ICON[id] = { icon: `bow:${id}`, color: st.color };
  }
}

// ---- the archmage's roster: every staff's icon IS its world painter on
// the sword diagonal, gripped at mid-shaft so butt and crown share the
// box. Long builds render smaller so the whole silhouette fits.
{
  for (const [id, st] of Object.entries(STAFF_STYLES)) {
    const scale = (st.len ?? 1) > 1.04 ? 68 : 74;
    PAINTERS[`staff:${id}`] = (c) => {
      c.translate(0.5, 0.5);
      c.rotate(-Math.PI / 4);
      c.scale(1 / 64, 1 / 64);
      // Mid-shaft grip centers the mass; nudge down so crown fx clear
      // the corner.
      c.translate(-0.08 * scale, 0);
      drawStaff(c, st, scale, 5234, false, 0.5, 0);
    };
    ITEM_ICON[id] = { icon: `staff:${id}`, color: st.gem ?? st.color };
  }
}

// ---- the colossus's roster: every greatweapon's icon IS its world
// painter on the sword diagonal, gripped at the balance point so the
// long handle and the mass both make the box — the icon must say
// "two hands" at a glance.
{
  for (const [id, st] of Object.entries(GREAT_STYLES)) {
    // Axes grip at mid-haft so the double head owns the box — at
    // balance-point grip the bits shrank to a wrench (bench verdict).
    const axe = st.kind === 'greataxe';
    const scale = axe ? 66 : 68;
    const grip = axe ? 0.5 : 0.42;
    PAINTERS[`great:${id}`] = (c) => {
      c.translate(0.5, 0.5);
      c.rotate(-Math.PI / 4);
      c.scale(1 / 64, 1 / 64);
      c.translate(axe ? -0.04 * scale : -0.1 * scale, 0);
      drawGreatweapon(c, st, scale, 5234, false, grip);
    };
    ITEM_ICON[id] = { icon: `great:${id}`, color: st.color };
  }
}

// ---- the wardrobe: every armor piece's icon renders FROM the style
// record that dresses the rig (helms and torsos through the actual
// world painters on a mannequin frame; legs/boots/gloves/shields as
// product shots consuming the same style fields). Gated on the item's
// real equip slot so trinkets that borrow armor glyphs stay put.
{
  const SLOT_PAINTER: Record<string, (id: string, tint: string) => IconPainter> = {
    head: (id) => {
      const p = helmIconPainter(helmStyle(id));
      return (c) => p(c);
    },
    body: (id) => {
      const p = bodyIconPainter(bodyStyle(id));
      return (c) => p(c);
    },
    legs: (id, tint) => {
      const p = legsIconPainter(legStyle(id), itemDef(id)?.color ?? tint, id);
      return (c) => p(c);
    },
    boots: (id) => {
      const p = bootsIconPainter(bootStyle(id));
      return (c) => p(c);
    },
    gloves: (id) => {
      const p = glovesIconPainter(gloveStyle(id));
      return (c) => p(c);
    },
    // Only true shields product-shot here; tomes/orbs/quivers keep
    // their bespoke object painters (the caller gates the kind).
    offhand: (id) => {
      const p = offhandIconPainter(offhandStyle(id), id);
      return (c) => p(c);
    },
  };
  // Only ids still wearing a GENERIC slot glyph convert to product
  // shots — an item that already earned a bespoke painter (the flower
  // crown, capes) keeps it.
  const GENERIC = new Set([
    'helm', 'greathelm', 'hood', 'wizardhat', 'circlet',
    'armor', 'robe', 'jerkin', 'platebody',
    'legs', 'boots', 'gloves', 'gauntlet',
    'shield', 'kiteshield',
  ]);
  for (const [id, spec] of Object.entries(ITEM_ICON)) {
    const slot = itemDef(id)?.equipSlot;
    if (!slot) continue;
    if (!GENERIC.has(spec.icon)) continue;
    const make = SLOT_PAINTER[slot];
    if (!make) continue;
    if (slot === 'offhand') {
      const st = offhandStyle(id);
      if (st.kind !== 'buckler' && st.kind !== 'kite' && st.kind !== 'tower') continue;
    }
    PAINTERS[`worn:${id}`] = make(id, spec.color);
    ITEM_ICON[id] = { icon: `worn:${id}`, color: spec.color };
  }
}

// ---- the gatherer's roster: every tool's icon IS its world painter,
// on the sword diagonal, head up-right where the classic axe glyph
// carried its bit. The rod lies flatter so line and bobber stay in.
{
  for (const [id, st] of Object.entries(TOOL_STYLES)) {
    const rod = st.kind === 'rod';
    const scale = rod ? 96 : 100;
    PAINTERS[`tool:${id}`] = (c) => {
      c.translate(0.5, 0.5);
      c.rotate(rod ? -Math.PI / 7 : -Math.PI / 4);
      c.scale(1 / 64, 1 / 64);
      c.translate(rod ? -22 : -16, rod ? 4 : 6);
      drawTool(c, st, scale, 5234, false);
    };
    ITEM_ICON[id] = { icon: `tool:${id}`, color: st.color };
  }
}

// ---- enchant scrolls: one scroll painter, tinted by each enchant's
// element — new enchants get icons for free.
{
  for (const e of ENCHANT_DEFS) {
    ITEM_ICON[`scroll_${e.id}`] = { icon: 'scroll', color: ELEMENT_COLORS[e.element] };
  }
}

// ---- recipe scrolls: one rolled-parchment painter, ribbon tinted by
// the profession's ink (the item def's color) — new unlockable recipes
// get icons for free. Keyed off the teaches pointer so retired legacy
// scrolls (items.ts LEGACY_RECIPE_SCROLLS) keep their paper too.
{
  for (const def of ITEMS.values()) {
    if (!def.teaches || !RECIPES.has(def.teaches)) continue;
    ITEM_ICON[def.id] = { icon: 'recipe', color: def.color ?? '#c9b98a' };
  }
}

/**
 * Which painter + tint each BUILDABLE renders in the build panel.
 * Wood/stone families share a painter and differ by tint, exactly like
 * item families; tints echo the placed tile's world colors so the icon
 * promises what the ghost delivers.
 */
const BUILDABLE_ICON: Record<string, { icon: string; color: string }> = {
  wood_floor: { icon: 'floortile', color: '#a87e46' },
  stone_floor: { icon: 'floortile', color: '#a09aa8' },
  wood_wall: { icon: 'wallblock', color: '#7d5a2e' },
  stone_wall: { icon: 'wallblock', color: '#767181' },
  wood_wall_corner: { icon: 'wallblock', color: '#6d4a26' },
  stone_wall_corner: { icon: 'wallblock', color: '#8c8798' },
  wood_window: { icon: 'windowframe', color: '#7d5a2e' },
  stone_window: { icon: 'windowframe', color: '#767181' },
  wood_doorway: { icon: 'doorframe', color: '#7d5a2e' },
  stone_doorway: { icon: 'doorframe', color: '#767181' },
  wood_doorway_wide: { icon: 'doorframe', color: '#96703c' },
  stone_doorway_wide: { icon: 'doorframe', color: '#8a8496' },
  fence: { icon: 'fencebuild', color: '#8a6534' },
  fence_gate: { icon: 'fencegate', color: '#8a6534' },
  fence_corner: { icon: 'fencediag', color: '#8a6534' },
  wood_railing: { icon: 'railing', color: '#a5793f' },
  campfire: { icon: 'campfirebuild', color: '#e8823d' },
  furnace: { icon: 'furnacebuild', color: '#6e6a75' },
  anvil: { icon: 'anvilbuild', color: '#55505e' },
  lamp_post: { icon: 'lamppostbuild', color: '#e8c06a' },
  workbench: { icon: 'hammer', color: '#9aa2ac' },
  garden_plot: { icon: 'seeds', color: '#79a355' },
  alembic: { icon: 'bottle', color: '#7fc9b3' },
  tanning_rack: { icon: 'hide', color: '#b08a5c' },
  loom: { icon: 'loombuild', color: '#d8cbb0' },
  carving_bench: { icon: 'bow', color: '#9b7440' },
  sawhorse: { icon: 'sawhorse', color: '#a8794a' },
  beast_pen: { icon: 'beast_pen', color: '#96703f' },
  enchanting_table: { icon: 'tome', color: '#7a6aa8' },
  barrel: { icon: 'barrel', color: '#94693a' },
  crate: { icon: 'crate', color: '#a5793f' },
  chair: { icon: 'chair', color: '#94693a' },
  table: { icon: 'table', color: '#a5793f' },
  bench: { icon: 'bench', color: '#94693a' },
  bed: { icon: 'bed', color: '#a34b52' },
  bookshelf: { icon: 'bookshelf', color: '#7a552e' },
  counter: { icon: 'counter', color: '#94693a' },
  hearth: { icon: 'hearth', color: '#e8823d' },
  hanging_sign: { icon: 'signpost', color: '#a5793f' },
  awning_shed: { icon: 'awning', color: '#a8433a' },
  awning_market: { icon: 'awning', color: '#c9962e' },
  awning_board: { icon: 'awning', color: '#8a6534' },
  awning_bowed: { icon: 'awning', color: '#7a3f8f' },
  porch_deck: { icon: 'floortile', color: '#9a7040' },
  timber_post: { icon: 'timberpost', color: '#8a6534' },
  wall_banner: { icon: 'banner', color: '#31589c' },
  pennant_string: { icon: 'pennants', color: '#a8433a' },
  bracket_sign: { icon: 'brasign', color: '#8a6534' },
  trellis: { icon: 'trellisicon', color: '#3f7a48' },
  wall_basket: { icon: 'wallbasket', color: '#d977a8' },
  signpost: { icon: 'signpost', color: '#c2a068' },
  flower_box: { icon: 'flowerbox', color: '#d977a8' },
  banner_pole: { icon: 'banner', color: '#7a3f8f' },
  stone_pillar: { icon: 'pillar', color: '#8c8798' },
  stone_arch: { icon: 'archway', color: '#8c8798' },
  garrison_wall: { icon: 'garrisonwall', color: '#716b80' },
  garrison_wall_corner: { icon: 'garrisonwall', color: '#544e61' },
  garrison_gate: { icon: 'garrisongate', color: '#716b80' },
};

const cache = new Map<string, string>();

/**
 * Eight-tap dilate offsets — the SAME kernel as the renderer's entity
 * outline pass (Renderer.OUTLINE_TAPS). Icons ride through the world's
 * outline shader so a glyph in the pack and the object in the grass
 * wear the identical dark ring.
 */
const ICON_TAPS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0.71, 0.71],
  [-0.71, 0.71],
  [0.71, -0.71],
  [-0.71, -0.71],
];

/** Supersample factor: paint big, ring big, downscale once — curve
 * edges and the dilate ring land antialiased instead of stair-stepped. */
const SS = 3;

function renderIcon(icon: string, color: string, size: number): string {
  const key = `${icon}|${color}|${size}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const painter = PAINTERS[icon] ?? PAINTERS.burnt!;

  // 1. Paint the art at supersample resolution. Painters draw in a
  // 0..1 unit box; a small inset leaves apron for the ring to grow
  // outward without clipping at the canvas edge.
  const px = size * SS;
  const inset = Math.ceil(px * 0.045) + 2;
  const art = document.createElement('canvas');
  art.width = px;
  art.height = px;
  const actx = art.getContext('2d')!;
  actx.save();
  actx.translate(inset, inset);
  actx.scale(px - inset * 2, px - inset * 2);
  painter(actx, color);
  actx.restore();

  // 2. The outline shader: eight-tap alpha dilate of the art, tinted
  // the world's outline color. Radius matches the world pass's feel
  // (max(1.25, scale*0.04)) at this icon's effective scale.
  const r = Math.max(1.25 * SS, px * 0.03);
  const ri = Math.max(1, Math.round(r));
  const rd = Math.max(1, Math.round(r * 0.71));
  const ring = document.createElement('canvas');
  ring.width = px;
  ring.height = px;
  const rctx = ring.getContext('2d')!;
  for (const [tx, ty] of ICON_TAPS) {
    const diag = tx !== 0 && ty !== 0;
    rctx.drawImage(art, Math.sign(tx) * (diag ? rd : ri), Math.sign(ty) * (diag ? rd : ri));
  }
  rctx.globalCompositeOperation = 'source-in';
  rctx.fillStyle = OUTLINE;
  rctx.fillRect(0, 0, px, px);
  rctx.globalCompositeOperation = 'source-over';

  // 3. The hard drop shadow comes off the RINGED silhouette (ring ∪
  // art), so the shadow hugs the final outlined shape.
  const sil = document.createElement('canvas');
  sil.width = px;
  sil.height = px;
  const sctx = sil.getContext('2d')!;
  sctx.drawImage(ring, 0, 0);
  sctx.drawImage(art, 0, 0);
  sctx.globalCompositeOperation = 'source-in';
  sctx.fillStyle = SHADOW;
  sctx.fillRect(0, 0, px, px);

  // 4. Compose at supersample, then downscale once.
  const big = document.createElement('canvas');
  big.width = px;
  big.height = px;
  const bctx = big.getContext('2d')!;
  bctx.drawImage(sil, px * 0.045, px * 0.045);
  bctx.drawImage(ring, 0, 0);
  bctx.drawImage(art, 0, 0);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(big, 0, 0, size, size);

  const url = canvas.toDataURL();
  cache.set(key, url);
  return url;
}

/**
 * Render an externally-authored painter through the SAME pipeline —
 * supersample, eight-tap outline ring, hard shadow — so satellite icon
 * sets (the ability spell-plates) wear the identical dark ring the
 * item set does. The key namespaces the painter in the shared cache;
 * re-registration under the same key is a no-op.
 */
export function paintedIconUrl(key: string, painter: IconPainter, color: string, size: number): string {
  if (!PAINTERS[key]) PAINTERS[key] = painter;
  return renderIcon(key, color, size);
}

/** Every mapped item id — the dev icon gallery walks this. */
export function allIconItemIds(): string[] {
  return Object.keys(ITEM_ICON);
}

/** Every mapped buildable id — the dev icon gallery walks this. */
export function allIconBuildableIds(): string[] {
  return Object.keys(BUILDABLE_ICON);
}

/** Data URL for an item's icon. */
export function itemIconUrl(itemId: string, size = 48): string {
  const spec = ITEM_ICON[itemId];
  if (spec) return renderIcon(spec.icon, spec.color, size);
  // Unknown item: tinted lump so a missing mapping is loud in review.
  return renderIcon('burnt', itemDef(itemId)?.color ?? '#888', size);
}

/**
 * Data URL for a buildable's build-panel icon, or null when a buildable
 * has no art yet — the panel falls back to its tile color swatch, so a
 * missing mapping degrades instead of breaking.
 */
/**
 * THE DYE LAW's swatches, index-married to the shared roster (linen 0
 * … rose 9). The ONE client-side color truth for dyes: the renderer's
 * AWNING_CLOTHS derives its bolt colors from this list, and the build
 * tray's swatch row paints its dots with it — change a dye here and
 * every reader agrees.
 */
export const DYE_SWATCHES: readonly string[] = [
  '#cfc5aa', // linen
  '#a8433a', // madder
  '#31589c', // woad
  '#c9962e', // weld
  '#3f7a48', // ivy
  '#7a3f8f', // mulberry
  '#b9772e', // ochre
  '#4a4a54', // charcoal
  '#5c6b38', // moss
  '#c9738f', // rose
];

export function buildableIconUrl(buildableId: string, size: number): string | null {
  const spec = BUILDABLE_ICON[buildableId];
  return spec ? renderIcon(spec.icon, spec.color, size) : null;
}

/** Dim placeholder glyph telling an empty equipment slot's purpose. */
export function slotGlyphUrl(slot: string, size = 40): string {
  const map: Record<string, string> = {
    head: 'helm',
    body: 'armor',
    legs: 'legs',
    gloves: 'gloves',
    boots: 'boots',
    weapon: 'sword',
    offhand: 'shield',
    tool: 'axe',
    relic: 'gem',
    sigil: 'skull',
    cape: 'cape',
  };
  return renderIcon(map[slot] ?? 'backpack', '#6e5a40', size);
}

/** Data URL for the HUD sneak-state eye chip. */
export function sneakEyeUrl(state: 'sneaking' | 'hidden' | 'detected', size = 34): string {
  const spec = {
    sneaking: { icon: 'eye_half', color: '#7a8fa5' },
    hidden: { icon: 'eye_closed', color: '#8a7fae' },
    detected: { icon: 'eye_open', color: '#c4553d' },
  }[state];
  return renderIcon(spec.icon, spec.color, size);
}

/** Data URL for a UI glyph. */
export function uiIconUrl(
  kind: 'backpack' | 'scroll' | 'hammer' | 'house' | 'attack' | 'bell' | 'signpost',
  size = 48,
): string {
  const colors: Record<string, string> = {
    backpack: '#a5793f',
    scroll: '#efe3c2',
    hammer: '#9aa2ac',
    house: '#c98d4b',
    attack: '#c9ccd4',
    bell: '#d9b969',
    signpost: '#c2a068',
  };
  return renderIcon(kind, colors[kind]!, size);
}

/* ------------------------------------------------------------------ */
/* DOCK GLYPHS — the quiet console's menu language.                    */
/* ------------------------------------------------------------------ */

/**
 * The dock speaks a different dialect from item icons: not painted
 * objects wearing the world's fat outline ring, but thin monoline
 * sigils in one muted brass — engraved instrument markings, not loot.
 * One soft under-shade keeps them legible over the open world without
 * the contrast of the item pipeline.
 */
type DockGlyphPainter = (c: CanvasRenderingContext2D) => void;

/** The one ink every dock sigil is engraved in. */
const GLYPH_INK = '#d8c08c';

export type DockGlyph = 'pack' | 'skills' | 'arts' | 'handiwork' | 'build' | 'sound' | 'social' | 'attack' | 'map' | 'quest' | 'rep';

const DOCK_GLYPHS: Record<DockGlyph, DockGlyphPainter> = {
  // Standing: a hanging banner — pole ring, swallow-tailed cloth, and
  // the mark stitched at its heart. The name you carry, on display.
  rep: (c) => {
    c.lineWidth = 0.055;
    // The crossbar and its hanging rings.
    c.beginPath();
    c.moveTo(0.2, 0.2);
    c.lineTo(0.8, 0.2);
    c.stroke();
    c.beginPath();
    c.arc(0.3, 0.245, 0.035, 0, Math.PI * 2);
    c.moveTo(0.735, 0.245);
    c.arc(0.7, 0.245, 0.035, 0, Math.PI * 2);
    c.stroke();
    // The banner cloth, swallow-tailed at the foot.
    c.beginPath();
    c.moveTo(0.28, 0.29);
    c.lineTo(0.72, 0.29);
    c.lineTo(0.72, 0.74);
    c.lineTo(0.5, 0.63);
    c.lineTo(0.28, 0.74);
    c.closePath();
    c.stroke();
    // The stitched mark: a diamond at the banner's heart.
    c.lineWidth = 0.045;
    c.beginPath();
    c.moveTo(0.5, 0.36);
    c.lineTo(0.585, 0.46);
    c.lineTo(0.5, 0.56);
    c.lineTo(0.415, 0.46);
    c.closePath();
    c.stroke();
  },
  // The journal: a half-unrolled scroll — rolled ends top and bottom,
  // three ruled entry lines, and the wax seal dot of a sworn errand.
  quest: (c) => {
    c.lineWidth = 0.055;
    // The open sheet between the two rolls.
    c.beginPath();
    c.moveTo(0.24, 0.26);
    c.lineTo(0.24, 0.74);
    c.moveTo(0.76, 0.26);
    c.lineTo(0.76, 0.74);
    c.stroke();
    // Rolled ends: shallow arcs curling past the sheet's edges.
    c.beginPath();
    c.moveTo(0.18, 0.3);
    c.quadraticCurveTo(0.5, 0.14, 0.82, 0.3);
    c.moveTo(0.18, 0.7);
    c.quadraticCurveTo(0.5, 0.86, 0.82, 0.7);
    c.stroke();
    // Ruled entries.
    c.lineWidth = 0.045;
    c.beginPath();
    c.moveTo(0.34, 0.4);
    c.lineTo(0.66, 0.4);
    c.moveTo(0.34, 0.51);
    c.lineTo(0.66, 0.51);
    c.moveTo(0.34, 0.62);
    c.lineTo(0.52, 0.62);
    c.stroke();
    // The seal.
    c.beginPath();
    c.arc(0.63, 0.63, 0.045, 0, Math.PI * 2);
    c.fillStyle = GLYPH_INK;
    c.fill();
  },
  // The folded chart: two panel creases, a dotted route wandering
  // across, and the planted waypoint pin where the route ends.
  map: (c) => {
    c.lineWidth = 0.06;
    c.beginPath();
    c.moveTo(0.14, 0.28);
    c.lineTo(0.38, 0.2);
    c.lineTo(0.62, 0.28);
    c.lineTo(0.86, 0.2);
    c.lineTo(0.86, 0.72);
    c.lineTo(0.62, 0.8);
    c.lineTo(0.38, 0.72);
    c.lineTo(0.14, 0.8);
    c.closePath();
    c.stroke();
    c.lineWidth = 0.045;
    c.beginPath();
    c.moveTo(0.38, 0.2);
    c.lineTo(0.38, 0.72);
    c.moveTo(0.62, 0.28);
    c.lineTo(0.62, 0.8);
    c.stroke();
    c.setLineDash([0.045, 0.05]);
    c.lineWidth = 0.05;
    c.beginPath();
    c.moveTo(0.2, 0.66);
    c.quadraticCurveTo(0.42, 0.6, 0.5, 0.46);
    c.quadraticCurveTo(0.58, 0.34, 0.72, 0.36);
    c.stroke();
    c.setLineDash([]);
    c.beginPath();
    c.arc(0.72, 0.36, 0.05, 0, Math.PI * 2);
    c.fill();
  },
  // The satchel: body, drooping flap, buckle strap, carry handle.
  pack: (c) => {
    c.lineWidth = 0.07;
    c.beginPath();
    c.moveTo(0.38, 0.33);
    c.quadraticCurveTo(0.5, 0.15, 0.62, 0.33);
    c.stroke();
    c.beginPath();
    c.moveTo(0.26, 0.34);
    c.lineTo(0.74, 0.34);
    c.quadraticCurveTo(0.83, 0.34, 0.83, 0.43);
    c.lineTo(0.83, 0.75);
    c.quadraticCurveTo(0.83, 0.84, 0.74, 0.84);
    c.lineTo(0.26, 0.84);
    c.quadraticCurveTo(0.17, 0.84, 0.17, 0.75);
    c.lineTo(0.17, 0.43);
    c.quadraticCurveTo(0.17, 0.34, 0.26, 0.34);
    c.closePath();
    c.stroke();
    c.beginPath();
    c.moveTo(0.17, 0.49);
    c.quadraticCurveTo(0.5, 0.6, 0.83, 0.49);
    c.stroke();
    c.beginPath();
    c.moveTo(0.5, 0.56);
    c.lineTo(0.5, 0.67);
    c.stroke();
  },
  // Three rising columns on a baseline: the skill ladder itself.
  skills: (c) => {
    c.lineWidth = 0.058;
    c.beginPath();
    c.moveTo(0.18, 0.84);
    c.lineTo(0.82, 0.84);
    c.stroke();
    c.lineWidth = 0.105;
    for (const [x, top] of [
      [0.3, 0.62],
      [0.5, 0.45],
      [0.7, 0.28],
    ] as const) {
      c.beginPath();
      c.moveTo(x, 0.73);
      c.lineTo(x, top);
      c.stroke();
    }
  },
  // A spell-plate held aloft, radiating four spark ticks — the codex
  // of techniques: power you choose and carry.
  arts: (c) => {
    c.lineWidth = 0.07;
    c.beginPath();
    c.moveTo(0.5, 0.26);
    c.lineTo(0.72, 0.48);
    c.lineTo(0.5, 0.7);
    c.lineTo(0.28, 0.48);
    c.closePath();
    c.stroke();
    c.beginPath();
    c.arc(0.5, 0.48, 0.045, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 0.055;
    for (const [x1, y1, x2, y2] of [
      [0.5, 0.16, 0.5, 0.08],
      [0.82, 0.48, 0.9, 0.48],
      [0.18, 0.48, 0.1, 0.48],
      [0.71, 0.25, 0.77, 0.19],
      [0.29, 0.25, 0.23, 0.19],
    ] as const) {
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.stroke();
    }
    // The plate rests on an open stand: the choosing hand's cradle.
    c.lineWidth = 0.06;
    c.beginPath();
    c.moveTo(0.3, 0.84);
    c.quadraticCurveTo(0.5, 0.72, 0.7, 0.84);
    c.stroke();
  },
  // The smith's hammer mid-swing, two spark ticks off the face.
  handiwork: (c) => {
    c.save();
    c.translate(0.44, 0.4);
    c.rotate(-0.62);
    c.lineWidth = 0.15;
    c.beginPath();
    c.moveTo(-0.16, 0);
    c.lineTo(0.16, 0);
    c.stroke();
    c.lineWidth = 0.07;
    c.beginPath();
    c.moveTo(0, 0.1);
    c.lineTo(0, 0.46);
    c.stroke();
    c.restore();
    c.lineWidth = 0.05;
    c.beginPath();
    c.moveTo(0.68, 0.2);
    c.lineTo(0.75, 0.13);
    c.stroke();
    c.beginPath();
    c.moveTo(0.73, 0.33);
    c.lineTo(0.82, 0.3);
    c.stroke();
  },
  // Gable, walls, door — the builder's mark.
  build: (c) => {
    c.lineWidth = 0.07;
    c.beginPath();
    c.moveTo(0.14, 0.5);
    c.lineTo(0.5, 0.18);
    c.lineTo(0.86, 0.5);
    c.stroke();
    c.beginPath();
    c.moveTo(0.24, 0.56);
    c.lineTo(0.24, 0.84);
    c.lineTo(0.76, 0.84);
    c.lineTo(0.76, 0.56);
    c.stroke();
    c.beginPath();
    c.moveTo(0.44, 0.84);
    c.lineTo(0.44, 0.66);
    c.lineTo(0.56, 0.66);
    c.lineTo(0.56, 0.84);
    c.stroke();
  },
  // Three mixer rails with set knobs — the settings drawer.
  sound: (c) => {
    c.lineWidth = 0.058;
    for (const [y, kx] of [
      [0.28, 0.6],
      [0.5, 0.34],
      [0.72, 0.68],
    ] as const) {
      c.beginPath();
      c.moveTo(0.18, y);
      c.lineTo(0.82, y);
      c.stroke();
      c.beginPath();
      c.arc(kx, y, 0.068, 0, Math.PI * 2);
      c.fill();
    }
  },
  // Two head-and-shoulder arcs, the far one half-risen behind the
  // near — company kept: the fellowship ledger.
  social: (c) => {
    c.lineWidth = 0.07;
    // The companion behind: head + shoulder line, higher and smaller.
    c.beginPath();
    c.arc(0.64, 0.33, 0.11, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.moveTo(0.5, 0.62);
    c.quadraticCurveTo(0.64, 0.47, 0.82, 0.6);
    c.stroke();
    // The near figure: bigger head, full shoulder sweep to a baseline.
    c.beginPath();
    c.arc(0.36, 0.45, 0.135, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.moveTo(0.14, 0.84);
    c.quadraticCurveTo(0.36, 0.6, 0.58, 0.84);
    c.stroke();
  },
  // The drawn blade for the touch attack key.
  attack: (c) => {
    c.lineWidth = 0.095;
    c.beginPath();
    c.moveTo(0.74, 0.22);
    c.lineTo(0.46, 0.5);
    c.stroke();
    c.lineWidth = 0.06;
    c.beginPath();
    c.moveTo(0.34, 0.46);
    c.lineTo(0.54, 0.66);
    c.stroke();
    c.lineWidth = 0.08;
    c.beginPath();
    c.moveTo(0.41, 0.59);
    c.lineTo(0.28, 0.72);
    c.stroke();
  },
};

/** Data URL for a dock sigil — monoline, muted brass, soft under-shade. */
export function dockGlyphUrl(kind: DockGlyph, size = 30): string {
  const key = `dock|${kind}|${size}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const painter = DOCK_GLYPHS[kind];
  const px = size * SS;
  const inset = Math.ceil(px * 0.06);
  const big = document.createElement('canvas');
  big.width = px;
  big.height = px;
  const bctx = big.getContext('2d')!;
  const pass = (ink: string, dx: number, dy: number): void => {
    bctx.save();
    bctx.translate(inset + dx, inset + dy);
    bctx.scale(px - inset * 2, px - inset * 2);
    bctx.lineCap = 'round';
    bctx.lineJoin = 'round';
    bctx.strokeStyle = ink;
    bctx.fillStyle = ink;
    painter(bctx);
    bctx.restore();
  };
  pass('rgba(9, 6, 3, 0.85)', px * 0.022, px * 0.022);
  pass(GLYPH_INK, 0, 0);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(big, 0, 0, size, size);

  const url = canvas.toDataURL();
  cache.set(key, url);
  return url;
}
