import { itemDef } from '@devcraft/content';
import { shade } from './rig.js';

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

type IconPainter = (ctx: CanvasRenderingContext2D, color: string) => void;

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
  bar: (c, col) => {
    poly(c, col, [[0.2, 0.62], [0.3, 0.42], [0.74, 0.42], [0.84, 0.62]]);
    c.fillStyle = shade(col, 30);
    poly(c, shade(col, 30), [[0.3, 0.42], [0.74, 0.42], [0.7, 0.48], [0.34, 0.48]]);
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
    // A jeweler's band catching the light.
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.14;
    c.beginPath();
    c.arc(0.5, 0.56, 0.22, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = col;
    c.lineWidth = 0.085;
    c.beginPath();
    c.arc(0.5, 0.56, 0.22, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = shade(col, 26);
    c.lineWidth = 0.04;
    c.beginPath();
    c.arc(0.5, 0.56, 0.25, Math.PI * 0.85, Math.PI * 1.35);
    c.stroke();
    // The stone.
    poly(c, '#8ac4e8', [[0.5, 0.14], [0.6, 0.26], [0.5, 0.38], [0.4, 0.26]]);
    poly(c, '#c8e6f8', [[0.5, 0.14], [0.55, 0.26], [0.45, 0.26]]);
  },
  nuggets: (c, col) => {
    // Fat blocky nuggets of the good stuff, stacked like a hoard.
    oreChunk(c, 0.36, 0.62, 0.33, 0.12, col);
    oreChunk(c, 0.67, 0.64, 0.29, -0.1, col);
    oreChunk(c, 0.5, 0.38, 0.31, -0.18, col);
    dot(c, '#fff2cc', 0.6, 0.27, 0.028);
  },
  chicken: (c, col) => {
    // The whole bird, honest and plucked.
    c.fillStyle = col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.035;
    c.beginPath();
    c.ellipse(0.5, 0.5, 0.27, 0.21, -0.15, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    // Drumstick knuckles.
    for (const side of [-1, 1]) {
      c.strokeStyle = shade(col, -18);
      c.lineWidth = 0.05;
      c.beginPath();
      c.moveTo(0.5 + side * 0.1, 0.66);
      c.lineTo(0.5 + side * 0.17, 0.8);
      c.stroke();
      dot(c, '#efe8d8', 0.5 + side * 0.19, 0.82, 0.035);
    }
    // Wing fold + neck stump.
    c.fillStyle = shade(col, 18);
    c.beginPath();
    c.ellipse(0.44, 0.44, 0.12, 0.07, -0.3, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.028;
    c.stroke();
    dot(c, shade(col, -14), 0.24, 0.36, 0.05);
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
  oak_log: { icon: 'log', color: '#74522f' },
  copper_ore: { icon: 'ore_copper', color: '#c47b3d' },
  tin_ore: { icon: 'ore_tin', color: '#cfd3dc' },
  iron_ore: { icon: 'ore_iron', color: '#a05038' },
  coal: { icon: 'coalpile', color: '#4a4456' },
  gold_ore: { icon: 'nuggets', color: '#e8b64c' },
  raw_trout: { icon: 'fish', color: '#8fb7d9' },
  trout: { icon: 'fishcooked', color: '#d99a6a' },
  raw_chicken: { icon: 'chicken', color: '#ecd3bd' },
  cooked_chicken: { icon: 'chickenleg', color: '#d9a052' },
  raw_beef: { icon: 'meat', color: '#c4645a' },
  cooked_beef: { icon: 'meat', color: '#a05a3a' },
  burnt_food: { icon: 'burnt', color: '#413c4a' },
  bronze_bar: { icon: 'bar', color: '#b0793f' },
  iron_bar: { icon: 'bar', color: '#9aa2ac' },
  steel_bar: { icon: 'bar', color: '#c4cad4' },
  gold_bar: { icon: 'bar', color: '#f2c94c' },
  gold_ring: { icon: 'ring', color: '#f2c94c' },
  leather: { icon: 'hide', color: '#b08a5c' },
  cowhide: { icon: 'hide', color: '#a08468' },
  wolf_fur: { icon: 'hide', color: '#8a90a0' },
  leather_body: { icon: 'armor', color: '#b08a5c' },
  bones: { icon: 'bones', color: '#efe8d8' },
  feather: { icon: 'feather', color: '#f4efe4' },
  bronze_axe: { icon: 'axe', color: '#b0793f' },
  bronze_pickaxe: { icon: 'pickaxe', color: '#b0793f' },
  fishing_rod: { icon: 'rod', color: '#c4a35a' },
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
  verdant_totem: { icon: 'totem', color: '#7ab06a' },
  snare_kit: { icon: 'trap', color: '#b0a05a' },
  storm_bell: { icon: 'bell', color: '#e8d06a' },
  straw_decoy: { icon: 'decoy', color: '#c4a35a' },
  sigil_fallen_champion: { icon: 'skull', color: '#e8b64c' },
  spiked_buckler: { icon: 'shield', color: '#a5794e' },
  frost_quiver: { icon: 'quiver', color: '#8ac4e8' },
  tome_of_embers: { icon: 'tome', color: '#b0543a' },
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

/** Data URL for an item's icon. */
export function itemIconUrl(itemId: string, size = 48): string {
  const spec = ITEM_ICON[itemId];
  if (spec) return renderIcon(spec.icon, spec.color, size);
  // Unknown item: tinted lump so a missing mapping is loud in review.
  return renderIcon('burnt', itemDef(itemId)?.color ?? '#888', size);
}

/** Dim placeholder glyph telling an empty equipment slot's purpose. */
export function slotGlyphUrl(slot: string, size = 40): string {
  const map: Record<string, string> = {
    head: 'helm',
    body: 'armor',
    legs: 'legs',
    weapon: 'sword',
    offhand: 'shield',
    tool: 'axe',
    relic: 'gem',
    sigil: 'skull',
    cape: 'cape',
  };
  return renderIcon(map[slot] ?? 'backpack', '#6e5a40', size);
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
