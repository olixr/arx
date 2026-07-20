import { itemDef } from '@devcraft/content';
import { shade } from './rig.js';
import { DAGGER_STYLES, SWORD_STYLES, drawSword } from './weapons.js';

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
    // A cut sprig: central stem, paired chunky leaves, one lit leaf.
    c.strokeStyle = shade(col, -28);
    c.lineWidth = 0.045;
    c.beginPath();
    c.moveTo(0.5, 0.88);
    c.quadraticCurveTo(0.46, 0.5, 0.52, 0.14);
    c.stroke();
    const leaf = (x: number, y: number, rot: number, s: number, tint: number) => {
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      poly(c, shade(col, tint), [[0, 0], [s, -s * 0.42], [s * 1.7, 0], [s, s * 0.42]]);
      c.restore();
    };
    leaf(0.49, 0.7, Math.PI - 0.5, 0.15, 0);
    leaf(0.5, 0.68, -0.5, 0.15, -12);
    leaf(0.48, 0.5, Math.PI - 0.35, 0.14, 10);
    leaf(0.5, 0.46, -0.4, 0.14, 0);
    leaf(0.5, 0.3, Math.PI - 0.3, 0.12, 22);
    leaf(0.51, 0.26, -0.3, 0.12, 32);
    dot(c, shade(col, 44), 0.52, 0.15, 0.035);
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
    // Moonbell: an arched stem with hanging bells, faintly aglow.
    c.strokeStyle = '#5b7a52';
    c.lineWidth = 0.04;
    c.beginPath();
    c.moveTo(0.3, 0.9);
    c.quadraticCurveTo(0.34, 0.3, 0.72, 0.24);
    c.stroke();
    for (const [x, y, s] of [[0.42, 0.5, 0.1], [0.56, 0.4, 0.11], [0.72, 0.34, 0.12]] as const) {
      c.strokeStyle = '#5b7a52';
      c.lineWidth = 0.026;
      c.beginPath();
      c.moveTo(x, y - s * 0.9);
      c.lineTo(x, y - s * 0.4);
      c.stroke();
      poly(c, col, [
        [x - s * 0.55, y - s * 0.45],
        [x + s * 0.55, y - s * 0.45],
        [x + s * 0.75, y + s * 0.55],
        [x + s * 0.3, y + s * 0.35],
        [x, y + s * 0.6],
        [x - s * 0.3, y + s * 0.35],
        [x - s * 0.75, y + s * 0.55],
      ]);
      c.fillStyle = shade(col, 26);
      c.fillRect(x - s * 0.4, y - s * 0.38, s * 0.5, s * 0.3);
      dot(c, '#e8ecff', x, y + s * 0.62, s * 0.16);
    }
  },
  berries: (c, col) => {
    // A plump cluster with two leaves.
    poly(c, '#5f9c46', [[0.42, 0.3], [0.6, 0.16], [0.7, 0.3], [0.52, 0.38]]);
    poly(c, '#4c8039', [[0.42, 0.32], [0.28, 0.2], [0.2, 0.34], [0.36, 0.42]]);
    for (const [x, y, r] of [
      [0.36, 0.56, 0.14], [0.62, 0.52, 0.14], [0.5, 0.74, 0.15], [0.5, 0.44, 0.12],
    ] as const) {
      c.fillStyle = col;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 0.03;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      dot(c, shade(col, 34), x - r * 0.3, y - r * 0.35, r * 0.32);
    }
  },
  fibre: (c, col) => {
    // A hank of long strands folded over a knot.
    bar(c, shade(col, -18), 0.38, 0.42, 0.24, 0.12);
    c.lineWidth = 0.045;
    for (const [dx, tint] of [[-0.14, -10], [-0.05, 8], [0.04, 0], [0.13, 18]] as const) {
      c.strokeStyle = shade(col, tint);
      c.beginPath();
      c.moveTo(0.5 + dx, 0.18);
      c.quadraticCurveTo(0.5 + dx * 1.8, 0.5, 0.5 + dx * 1.3, 0.86);
      c.stroke();
    }
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.028;
    c.strokeRect(0.38, 0.42, 0.24, 0.12);
  },
  twine: (c, col) => {
    // A wound coil with a loose tail.
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.32;
    c.beginPath();
    c.arc(0.5, 0.46, 0.2, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = col;
    c.lineWidth = 0.26;
    c.beginPath();
    c.arc(0.5, 0.46, 0.2, 0, Math.PI * 2);
    c.stroke();
    // Wrap ridges.
    c.strokeStyle = shade(col, -26);
    c.lineWidth = 0.03;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.beginPath();
      c.moveTo(0.5 + Math.cos(a) * 0.1, 0.46 + Math.sin(a) * 0.1);
      c.lineTo(0.5 + Math.cos(a) * 0.31, 0.46 + Math.sin(a) * 0.31);
      c.stroke();
    }
    c.strokeStyle = shade(col, 20);
    c.lineWidth = 0.05;
    c.beginPath();
    c.moveTo(0.62, 0.62);
    c.quadraticCurveTo(0.76, 0.74, 0.7, 0.88);
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
    // A woven circlet dotted with blooms.
    c.strokeStyle = '#8a6534';
    c.lineWidth = 0.1;
    c.beginPath();
    c.ellipse(0.5, 0.55, 0.3, 0.2, 0, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = '#5f9c46';
    c.lineWidth = 0.045;
    c.beginPath();
    c.ellipse(0.5, 0.55, 0.3, 0.2, 0, 0.4, Math.PI * 1.3);
    c.stroke();
    for (const [x, y, s] of [
      [0.24, 0.48, 0.075], [0.5, 0.36, 0.09], [0.76, 0.48, 0.075], [0.36, 0.72, 0.065], [0.64, 0.72, 0.065],
    ] as const) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - 0.3;
        dot(c, col, x + Math.cos(a) * s, y + Math.sin(a) * s * 0.85, s * 0.55);
      }
      dot(c, '#c4553d', x, y, s * 0.45);
      dot(c, '#fff2cc', x - s * 0.15, y - s * 0.15, s * 0.16);
    }
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
  leather_body: { icon: 'jerkin', color: '#b08a5c' },
  bones: { icon: 'bones', color: '#efe8d8' },
  feather: { icon: 'feather', color: '#f4efe4' },
  bronze_axe: { icon: 'axe', color: '#b0793f' },
  bronze_pickaxe: { icon: 'pickaxe', color: '#b0793f' },
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
  verdant_totem: { icon: 'totem', color: '#7ab06a' },
  snare_kit: { icon: 'trap', color: '#b0a05a' },
  storm_bell: { icon: 'bell', color: '#e8d06a' },
  straw_decoy: { icon: 'decoy', color: '#c4a35a' },
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
  // Themed cloth sets — same colorway law as the other wardrobes.
  hedgewitch_hat: { icon: 'wizardhat', color: '#5a6b3a' },
  hedgewitch_robe: { icon: 'robe', color: '#5a6b3a' },
  hedgewitch_skirts: { icon: 'legs', color: '#5a6b3a' },
  hedgewitch_slippers: { icon: 'boots', color: '#8a7a3c' },
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
  healing_tincture: { icon: 'bottle', color: '#d65a5a' },
  gatherers_brew: { icon: 'bottle', color: '#7fc9b3' },
  swiftness_tonic: { icon: 'bottle', color: '#8fd0e8' },
  ironbark_tonic: { icon: 'bottle', color: '#9c7440' },
  mending_salve: { icon: 'jar', color: '#c9a8e8' },
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
  hedgewitch_gloves: { icon: 'gloves', color: '#5a6b3a' },
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
    const dagger = id in DAGGER_STYLES;
    const scale = dagger ? 92 : 78;
    const shift = dagger ? -9 : -15;
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
  wood_window: { icon: 'windowframe', color: '#7d5a2e' },
  stone_window: { icon: 'windowframe', color: '#767181' },
  wood_doorway: { icon: 'doorframe', color: '#7d5a2e' },
  stone_doorway: { icon: 'doorframe', color: '#767181' },
  fence: { icon: 'railing', color: '#8a6534' },
  wood_railing: { icon: 'railing', color: '#a5793f' },
  campfire: { icon: 'campfirebuild', color: '#e8823d' },
  furnace: { icon: 'furnacebuild', color: '#6e6a75' },
  anvil: { icon: 'anvilbuild', color: '#55505e' },
  lamp_post: { icon: 'lamppostbuild', color: '#e8c06a' },
  workbench: { icon: 'hammer', color: '#9aa2ac' },
  garden_plot: { icon: 'seeds', color: '#79a355' },
  alembic: { icon: 'bottle', color: '#7fc9b3' },
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
  flower_box: { icon: 'flowerbox', color: '#d977a8' },
  banner_pole: { icon: 'banner', color: '#7a3f8f' },
  stone_pillar: { icon: 'pillar', color: '#8c8798' },
  stone_arch: { icon: 'archway', color: '#8c8798' },
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

/**
 * Data URL for a buildable's build-panel icon, or null when a buildable
 * has no art yet — the panel falls back to its tile color swatch, so a
 * missing mapping degrades instead of breaking.
 */
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
