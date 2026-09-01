/**
 * THE STONE VOCABULARY — blocks, monoliths, ore nodes, rubble, sparkle,
 * the growing frame, and the rock formation assembler.
 * Moved verbatim off the Renderer class (foundations F2 wave A); the
 * painters reach the engine through the shared PaintHost slice.
 */
import { twinkle } from './paintVocab.js';
import { chamferRect } from './shapes.js';
import { Tile } from '@arx/shared';
import type { PaintHost } from './paintHost.js';

export const ORE_STYLES: Partial<
  Record<
    number,
    {
      nug: string;
      deep: string;
      accent: string;
      stone: { face: string; top: string; side: string };
    }
  >
> = {
  [Tile.RockCopper]: {
    nug: '#e0954a',
    deep: '#7c4520',
    accent: '#3fa98e',
    stone: { face: '#6b5a50', top: '#8a7668', side: '#544740' },
  },
  [Tile.RockTin]: {
    nug: '#dde1ea',
    deep: '#767c8c',
    accent: '#ffffff',
    stone: { face: '#5d5966', top: '#7b7787', side: '#4b4754' },
  },
  [Tile.RockIron]: {
    nug: '#c26f3e',
    deep: '#6f4638',
    accent: '#3a3d46',
    stone: { face: '#5e524e', top: '#786a60', side: '#4b403c' },
  },
  [Tile.RockCoal]: {
    nug: '#2c2933',
    deep: '#17141f',
    accent: '#8a86a0',
    stone: { face: '#5a5466', top: '#6e6879', side: '#494452' },
  },
  [Tile.RockGold]: {
    nug: '#f4c84f',
    deep: '#a87c1c',
    accent: '#fff3c9',
    stone: { face: '#565064', top: '#6e687c', side: '#454051' },
  },
  [Tile.RockSilver]: {
    // Steel-blue metal tones, not white: silver reads through facet
    // contrast, and near-white fills read as paint (the lesson the
    // first two silver designs taught).
    nug: '#c6cfe0',
    deep: '#59617a',
    accent: '#ffffff',
    stone: { face: '#5a5766', top: '#787588', side: '#484554' },
  },
  [Tile.RockMithril]: {
    nug: '#8fb4e4',
    deep: '#3f5e8c',
    accent: '#d8ecff',
    stone: { face: '#525668', top: '#6c7284', side: '#414452' },
  },
  [Tile.RockAdamant]: {
    nug: '#6cb47a',
    deep: '#2f5e3c',
    accent: '#d2f0d0',
    stone: { face: '#4f5a54', top: '#68766c', side: '#3e4842' },
  },
  [Tile.RockObsidian]: {
    nug: '#3b3247',
    deep: '#1c1626',
    accent: '#b8a8d8',
    stone: { face: '#4a4152', top: '#5e5468', side: '#382f40' },
  },
  [Tile.RockStarfall]: {
    nug: '#d6cbf6',
    deep: '#7a6ab0',
    accent: '#ffffff',
    stone: { face: '#4c4658', top: '#645d72', side: '#3b3648' },
  },
};

const BARREN_STONE = { face: '#5f596b', top: '#767083', side: '#4c475a' };

const BARREN_DIM = { face: '#555061', top: '#696377', side: '#443f52' };

/**
 * One rectangular stone block, spoken in the cliff dialect: broad
 * front face, lit cap strip across the top, shaded lane down the
 * off-light flank — hard 45° top chamfers, flat fills, one crisp
 * dark outline. `lean` shears the top edge sideways so stacked
 * blocks read geologic, never machined. Returns the silhouette so
 * callers can clip veins INTO the stone.
 */
export function stoneBlock(rend: PaintHost, 
  cx: number,
  yb: number,
  w: number,
  hgt: number,
  lean: number,
  pal: { face: string; top: string; side: string },
  seed = 0,
  taperK = 1,
): Array<[number, number]> {
  const ctx = rend.ctx;
  const yt = yb - hgt;
  // Hewn-boulder silhouette: the top is narrower than the base
  // (seeded taper — soften via taperK for masonry-slab reads), the
  // two top chamfers are unequal, and each flank carries a shoulder
  // vertex partway up — eight hard points that read quarried, never
  // packaged.
  const tl = 1 - (0.38 - ((seed >> 2) & 3) * 0.06) * taperK; // top-left half-width factor
  const tr = 1 - (0.38 - ((seed >> 4) & 3) * 0.06) * taperK;
  const cSm = Math.min(w, hgt) * 0.1;
  const cBg = Math.min(w, hgt) * (0.24 + ((seed >> 6) & 3) * 0.05);
  const [cL, cR] = ((seed >> 8) & 1) === 0 ? [cSm, cBg] : [cBg, cSm];
  const shL = yb - hgt * (0.3 + ((seed >> 9) & 3) * 0.05); // shoulder heights
  const shR = yb - hgt * (0.28 + ((seed >> 11) & 3) * 0.05);
  const wl = w / 2;
  const sil: Array<[number, number]> = [
    [cx - wl, yb],
    [cx - wl - w * 0.04, shL],
    [cx - wl * tl + lean, yt + cL],
    [cx - wl * tl + lean + cL, yt],
    [cx + wl * tr + lean - cR, yt],
    [cx + wl * tr + lean, yt + cR],
    [cx + wl + w * 0.03, shR],
    [cx + wl, yb],
  ];
  const trace = (): void => {
    ctx.beginPath();
    sil.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
  };
  ctx.fillStyle = pal.face;
  trace();
  ctx.fill();
  ctx.save();
  trace();
  ctx.clip();
  // Shade lane hugging the off-light flank, then the lit cap wins
  // the top — both flat fills, both clipped to the silhouette.
  ctx.strokeStyle = pal.side;
  ctx.lineWidth = w * 0.24;
  ctx.beginPath();
  ctx.moveTo(cx + wl - w * 0.09, yb + 1);
  ctx.lineTo(cx + wl * tr + lean - w * 0.09, yt + cR);
  ctx.stroke();
  ctx.fillStyle = pal.top;
  const capH = Math.min(hgt * 0.32, w * 0.28);
  ctx.save();
  ctx.translate(cx + lean, yt);
  ctx.rotate(((seed >> 3) & 1) === 0 ? -0.05 : 0.05);
  ctx.fillRect(-w, -w * 0.5, w * 2, w * 0.5 + capH);
  ctx.restore();
  ctx.restore();
  // No baked perimeter stroke: the outline shader rings the whole
  // formation — a stroke here doubles it into a fat double border.
  // Crisp parting shadow where the block meets whatever bears it.
  ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
  ctx.fillRect(cx - w * 0.4, yb - Math.max(1.5, hgt * 0.045), w * 0.8, Math.max(1.5, hgt * 0.045));
  return sil;
}

/**
 * One TALL hewn monolith: a single tapering silhouette with a
 * stepped ledge on each flank — the "you walk up against it"
 * landmark mass. Same flat grammar as stoneBlock (lit cap, shaded
 * lane, shader-rung silhouette) but drawn as ONE rock, so height never reads
 * as a pancake tower of crates. Returns the silhouette so callers
 * can clip veins INTO the stone.
 */
export function monolith(rend: PaintHost, 
  cx: number,
  yb: number,
  w: number,
  hgt: number,
  m: number,
  pal: { face: string; top: string; side: string },
  seed = 0,
): Array<[number, number]> {
  const ctx = rend.ctx;
  const yt = yb - hgt;
  const r = (bits: number, lo: number, hi: number): number =>
    lo + (((seed >> bits) & 7) / 7) * (hi - lo);
  const lean = w * r(0, -0.06, 0.06) * m;
  const c = w * 0.1;
  const wl = w / 2;
  // Seeded ledge heights and a top that narrows to roughly half.
  const lY = yb - hgt * r(3, 0.42, 0.55);
  const rY = yb - hgt * r(6, 0.36, 0.5);
  const tw = wl * r(9, 0.5, 0.62);
  const sil: Array<[number, number]> = [
    [cx - wl, yb],
    [cx - wl - w * 0.025, yb - hgt * 0.2],
    [cx - wl * 0.8 + lean * 0.5, lY],
    [cx - wl * 0.66 + lean * 0.5, lY - hgt * 0.05],
    [cx - tw + lean, yt + c],
    [cx - tw + lean + c, yt],
    [cx + tw + lean - c * 1.6, yt],
    [cx + tw + lean, yt + c * 1.6],
    [cx + wl * 0.7 + lean * 0.5, rY - hgt * 0.045],
    [cx + wl * 0.84 + lean * 0.5, rY],
    [cx + wl + w * 0.03, yb - hgt * 0.16],
    [cx + wl, yb],
  ];
  const trace = (): void => {
    ctx.beginPath();
    sil.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
  };
  ctx.fillStyle = pal.face;
  trace();
  ctx.fill();
  ctx.save();
  trace();
  ctx.clip();
  // Shaded lane tracing the off-light profile, lit cap up top, and
  // a lit sill on each ledge so the steps read as flats in the sun.
  ctx.strokeStyle = pal.side;
  ctx.lineWidth = w * 0.2;
  ctx.beginPath();
  ctx.moveTo(cx + wl - w * 0.09, yb + 1);
  ctx.lineTo(cx + wl * 0.84 + lean * 0.5 - w * 0.08, rY);
  ctx.lineTo(cx + tw + lean - w * 0.08, yt + c);
  ctx.stroke();
  ctx.fillStyle = pal.top;
  const capH = Math.min(hgt * 0.14, w * 0.26);
  ctx.save();
  ctx.translate(cx + lean, yt);
  ctx.rotate(((seed >> 3) & 1) === 0 ? -0.045 : 0.045);
  ctx.fillRect(-w, -w * 0.5, w * 2, w * 0.5 + capH);
  ctx.restore();
  ctx.fillRect(cx - wl * 0.84 + lean * 0.5, lY - hgt * 0.052, wl * 0.22, hgt * 0.032);
  ctx.fillRect(cx + wl * 0.58 + lean * 0.5, rY - hgt * 0.048, wl * 0.28, hgt * 0.03);
  ctx.restore();
  // No baked perimeter stroke — the outline shader supplies it.
  ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
  ctx.fillRect(cx - w * 0.4, yb - Math.max(1.5, hgt * 0.03), w * 0.8, Math.max(1.5, hgt * 0.03));
  return sil;
}

/**
 * One BIG rectangular ore node: a deep-toned frame around a bright
 * mineral face, capped with a hard square glint. The nodes are the
 * protagonists of a deposit — blocky, rigid, sized to read from
 * across the screen, planted proud of the host stone.
 */
export function oreNode(rend: PaintHost, 
  x: number,
  y: number,
  w: number,
  rot: number,
  pal: { nug: string; deep: string; accent: string },
): void {
  const ctx = rend.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const hh = w * 0.8;
  const cut = w * 0.13;
  ctx.fillStyle = pal.deep;
  ctx.beginPath();
  chamferRect(ctx, -w / 2, -hh / 2, w, hh, cut);
  ctx.fill();
  // Hairline seat only — the shader ring owns the bold border, and a
  // heavy frame here stacked into a double-thick edge on skyline nodes.
  ctx.strokeStyle = 'rgba(26, 20, 36, 0.35)';
  ctx.lineWidth = Math.max(1, w * 0.04);
  ctx.stroke();
  // Bright face biased toward the lit top-left.
  ctx.fillStyle = pal.nug;
  ctx.beginPath();
  chamferRect(ctx, -w * 0.4, -hh * 0.42, w * 0.74, hh * 0.68, cut * 0.8);
  ctx.fill();
  // Hard square glint — flat, no gradient.
  ctx.fillStyle = pal.accent;
  ctx.fillRect(-w * 0.32, -hh * 0.34, w * 0.28, hh * 0.22);
  ctx.restore();
}

/**
 * THE GROWING FRAME's body: three bent withy hoops over the bed, a
 * ridge lath, and the oiled cloth — rolled to one side on a bare
 * frame, drawn as a low translucent skirt over a planted one (the
 * plant shows through; the cloth is the promise of warmth, never a
 * curtain over the art).
 */
export function drawGrowingFrame(rend: PaintHost, bx: number, gy: number, h: number, planted: boolean): void {
  const ctx = rend.ctx;
  const s = rend.camera.scale;
  const half = s * 0.42;
  const top = s * 0.52;
  ctx.strokeStyle = '#8a6234';
  ctx.lineWidth = Math.max(1.4, s * 0.035);
  for (const u of [-0.85, 0, 0.85]) {
    ctx.beginPath();
    ctx.arc(bx + u * half * 0.8, gy, half * 0.55, Math.PI, 0);
    ctx.stroke();
  }
  // Ridge lath along the hoop crowns, sun on its top edge.
  ctx.beginPath();
  ctx.moveTo(bx - half * 0.85, gy - half * 0.55);
  ctx.lineTo(bx + half * 0.85, gy - half * 0.55);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(214, 175, 122, 0.55)';
  ctx.lineWidth = Math.max(1, s * 0.014);
  ctx.beginPath();
  ctx.moveTo(bx - half * 0.8, gy - half * 0.56 - s * 0.01);
  ctx.lineTo(bx + half * 0.8, gy - half * 0.56 - s * 0.01);
  ctx.stroke();
  if (planted) {
    // The cloth skirt: a low translucent band on the near flank.
    ctx.fillStyle = 'rgba(238, 232, 216, 0.28)';
    ctx.beginPath();
    ctx.moveTo(bx - half * 0.95, gy);
    ctx.quadraticCurveTo(bx, gy - top * 0.34, bx + half * 0.95, gy);
    ctx.lineTo(bx + half * 0.9, gy + s * 0.06);
    ctx.lineTo(bx - half * 0.9, gy + s * 0.06);
    ctx.closePath();
    ctx.fill();
  } else {
    // Rolled cloth resting along the west foot, tie cords dark.
    ctx.fillStyle = '#e6dfcc';
    ctx.beginPath();
    ctx.roundRect(bx - half * 0.95, gy - s * 0.07, half * 0.7, s * 0.09, s * 0.04);
    ctx.fill();
    ctx.strokeStyle = 'rgba(26, 20, 36, 0.5)';
    ctx.lineWidth = Math.max(1, s * 0.015);
    ctx.stroke();
    ctx.strokeStyle = '#6e5433';
    for (const u of [0.25, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(bx - half * 0.95 + u * half * 0.7, gy - s * 0.07);
      ctx.lineTo(bx - half * 0.95 + u * half * 0.7, gy + s * 0.02);
      ctx.stroke();
    }
  }
  // Stake feet pin the hoops (h deals which side gets the wobble).
  ctx.fillStyle = '#5f4426';
  ctx.fillRect(bx - half * 0.85 - s * 0.02, gy - s * 0.02, s * 0.04, s * 0.06);
  ctx.fillRect(bx + half * 0.85 - s * 0.02 + ((h & 1) ? s * 0.01 : 0), gy - s * 0.02, s * 0.04, s * 0.06);
}

/** A four-point star twinkle - the "this is mineable" beacon. */
export function sparkle(rend: PaintHost, x: number, y: number, r: number, alpha: number, color: string): void {
  if (rend.bakingMask) return;
  const ctx = rend.ctx;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.22, y - r * 0.22);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x + r * 0.22, y + r * 0.22);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.22, y + r * 0.22);
  ctx.lineTo(x - r, y);
  ctx.lineTo(x - r * 0.22, y - r * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Blocky spall scattered at a formation's feet - grounds the mass. */
export function rubble(rend: PaintHost, px: number, py: number, s: number, h: number, colors: string[]): void {
  const ctx = rend.ctx;
  for (let k = 0; k < 4; k++) {
    const cx = px + (((h >> (k * 6)) % 200) - 100) / 100 * s * 0.62;
    const cy = py + s * 0.3 + (((h >> (k * 4 + 2)) % 24) - 8) / 100 * s;
    const cw = s * (0.05 + ((h >> (k * 5)) % 5) / 110);
    ctx.fillStyle = colors[k % colors.length]!;
    ctx.beginPath();
    chamferRect(ctx, cx, cy, cw * 1.3, cw * 0.8, cw * 0.2);
    ctx.fill();
  }
}

/**
 * MINING NODES — every metal is a bespoke LANDMARK in the brutalist
 * dialect: rectangular blocks, hard chamfers, flat fills, no
 * pebble-circles. Copper raises a rust obelisk with a seam of raw
 * metal climbing its full height. Tin lays an oblong ridge crested
 * by a march of cubic crystals. Iron stacks banded slabs into a
 * natural anvil. Coal drives a jagged black seam-wall up between
 * grey shoulders. Gold splits a standing pillar with a quartz vein
 * crowned in nuggets. Deposits stand player-tall or better, and all
 * of them twinkle at idle — the eye finds a mineable node before
 * the tooltip does. Every formation mirrors and resizes off its
 * world hash so no two reads stamped.
 */
export function drawRockFormation(rend: PaintHost, 
  px: number,
  py: number,
  s: number,
  h: number,
  tile: Tile,
  tSec: number,
  crowded = false,
): void {
  const ctx = rend.ctx;
  const m = ((h >> 5) & 1) === 0 ? 1 : -1; // mirror variant
  const S = s * (0.94 + (((h >> 11) & 7) / 7) * 0.14); // size jitter
  const base = py + s * 0.28; // ground contact line
  const X = (dx: number): number => px + dx * m;
  // Crowded formations (another rock immediately in front) stay low.
  const H = crowded ? 0.55 : 1;

  if (tile === Tile.RockDepleted) {
    // Worked out: the block remains, cracked open around a stepped
    // rectangular cavity, spall at its feet.
    stoneBlock(rend, X(-0.03 * S), base, S * 0.92, S * 0.64, 0.04 * S * m, BARREN_DIM, h);
    const cavW = S * 0.46;
    const cavH = S * 0.36;
    ctx.fillStyle = '#332f3d';
    ctx.beginPath();
    chamferRect(ctx, X(-0.05 * S) - cavW / 2, base - S * 0.44, cavW, cavH, cavW * 0.16);
    ctx.fill();
    ctx.fillStyle = '#221f2b';
    ctx.beginPath();
    chamferRect(ctx, X(-0.02 * S) - cavW * 0.32, base - S * 0.38, cavW * 0.64, cavH * 0.62, cavW * 0.1);
    ctx.fill();
    // Hard cracks running off the cavity corners.
    ctx.strokeStyle = 'rgba(26, 20, 36, 0.55)';
    ctx.lineWidth = Math.max(1.5, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(X(-0.22 * S), base - S * 0.4);
    ctx.lineTo(X(-0.34 * S), base - S * 0.18);
    ctx.moveTo(X(0.14 * S), base - S * 0.42);
    ctx.lineTo(X(0.3 * S), base - S * 0.3);
    ctx.lineTo(X(0.34 * S), base - S * 0.1);
    ctx.moveTo(X(0.02 * S), base - S * 0.14);
    ctx.lineTo(X(-0.06 * S), base - S * 0.02);
    ctx.stroke();
    rubble(rend, px, py, s, h, ['#4a4556', '#3f3b4a']);
    return;
  }

  if (tile === Tile.Rock) {
    // Barren stone: honest blocky boulders — low, wide, flat-capped.
    if (((h >> 7) & 3) !== 3) {
      stoneBlock(rend, X(0.38 * S), base, S * 0.44, S * 0.3, 0.03 * S * m, BARREN_DIM, h ^ 0x9e37);
    }
    stoneBlock(rend, X(-0.08 * S), base, S * 0.84, S * 0.52, -0.05 * S * m, BARREN_STONE, h);
    if (h % 3 === 0) {
      // A quartz streak — one hard zigzag, not a squiggle.
      ctx.strokeStyle = 'rgba(228, 224, 236, 0.5)';
      ctx.lineWidth = Math.max(1.5, s * 0.04);
      ctx.beginPath();
      ctx.moveTo(X(-0.34 * S), base - S * 0.12);
      ctx.lineTo(X(-0.1 * S), base - S * 0.3);
      ctx.lineTo(X(0.18 * S), base - S * 0.22);
      ctx.stroke();
    }
    rubble(rend, px, py, s, h, ['#6a6375', '#5a5466']);
    return;
  }

  const pal = ORE_STYLES[tile]!;
  // Node anchors double as sparkle sites, collected per metal.
  const sites: Array<[number, number]> = [];

  if (tile === Tile.RockCopper) {
    // THE RUST OBELISK — a leaning tower of warm stone with one deep
    // seam of raw copper climbing its full height.
    stoneBlock(rend, X(0.52 * S), base, S * 0.52, S * 0.44 * H, 0.04 * S * m, BARREN_DIM, h ^ 0x51f3);
    const cSil = monolith(rend, X(-0.05 * S), base, S * 1.18, S * 1.6 * H, m, pal.stone, h);
    // The seam lives IN the stone — clipped to the monolith.
    ctx.save();
    const seamClip = new Path2D();
    cSil.forEach(([x, y], i) => (i === 0 ? seamClip.moveTo(x, y) : seamClip.lineTo(x, y)));
    seamClip.closePath();
    ctx.clip(seamClip);
    ctx.fillStyle = pal.deep;
    ctx.beginPath();
    ctx.moveTo(X(-0.28 * S), base);
    ctx.lineTo(X(0.02 * S), base);
    ctx.lineTo(X(-0.06 * S), base - S * 1.66 * H);
    ctx.lineTo(X(-0.28 * S), base - S * 1.66 * H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Raw copper blocks erupting along the seam — one near the top.
    const c1: [number, number] = [X(-0.14 * S), base - S * 1.34 * H];
    const c3: [number, number] = [X(-0.16 * S), base - S * 0.3];
    oreNode(rend, c1[0], c1[1], S * 0.38, -0.16 * m, pal);
    if (!crowded) {
      const c2: [number, number] = [X(-0.06 * S), base - S * 0.82];
      oreNode(rend, c2[0], c2[1], S * 0.32, 0.12 * m, pal);
      sites.push(c2);
    }
    oreNode(rend, c3[0], c3[1], S * 0.36, -0.08 * m, pal);
    sites.push(c1);
    // Verdigris: flat teal stains weeping under the metal.
    ctx.fillStyle = pal.accent;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(X(-0.1 * S) - S * 0.03, base - S * 0.68 * H, S * 0.06, S * 0.2 * H);
    ctx.fillRect(X(-0.24 * S) - S * 0.025, base - S * 0.16, S * 0.05, S * 0.14);
    ctx.globalAlpha = 1;
    rubble(rend, px, py, s, h, [pal.nug, '#6a6375', pal.deep]);
  } else if (tile === Tile.RockTin) {
    // THE SHARD RIDGE — an oblong spine of cool stone crested with a
    // march of cubic tin crystals along its skyline.
    const tH = crowded ? 0.72 : 1;
    stoneBlock(rend, X(-0.5 * S), base, S * 0.6, S * 0.5 * tH, -0.05 * S * m, pal.stone, h ^ 0x51f3);
    stoneBlock(rend, X(0.48 * S), base, S * 0.54, S * 0.38 * tH, 0.05 * S * m, BARREN_DIM, h ^ 0x9e37);
    stoneBlock(rend, X(0), base, S * 0.74, S * 0.78 * tH, 0.04 * S * m, pal.stone, h);
    const t1: [number, number] = [X(-0.52 * S), base - S * 0.62 * tH];
    const t2: [number, number] = [X(0), base - S * 0.92 * tH];
    const t3: [number, number] = [X(0.22 * S), base - S * 0.32];
    const t4: [number, number] = [X(0.5 * S), base - S * 0.5 * tH];
    oreNode(rend, t1[0], t1[1], S * 0.3, -0.18 * m, pal);
    oreNode(rend, t2[0], t2[1], S * 0.36, 0.1 * m, pal);
    oreNode(rend, t3[0], t3[1], S * 0.26, -0.08 * m, pal);
    oreNode(rend, t4[0], t4[1], S * 0.22, 0.2 * m, pal);
    sites.push(t2, t4);
    rubble(rend, px, py, s, h, [pal.nug, '#6a6375']);
  } else if (tile === Tile.RockIron) {
    // THE BANDED BUTTE — one tall mass of banded ironstone: dark
    // strata beds running flat THROUGH a single hewn silhouette
    // with rust partings between them, studded with rust blocks and
    // a magnetite crown. Bands on one rock, never a stack of crates.
    stoneBlock(rend, X(0.5 * S), base, S * 0.5, S * 0.4, 0.04 * S * m, BARREN_DIM, h ^ 0x51f3);
    const iSil = monolith(rend, X(-0.04 * S), base, S * 1.16, S * 1.38 * H, m, pal.stone, h);
    ctx.save();
    const bedClip = new Path2D();
    iSil.forEach(([x, y], i) => (i === 0 ? bedClip.moveTo(x, y) : bedClip.lineTo(x, y)));
    bedClip.closePath();
    ctx.clip(bedClip);
    ctx.translate(px, 0);
    ctx.rotate(m * -0.045);
    ctx.fillStyle = '#55423c';
    ctx.fillRect(-S, base - S * 0.5 * H, S * 2, S * 0.16 * H);
    ctx.fillRect(-S, base - S * 0.98 * H, S * 2, S * 0.12 * H);
    ctx.fillStyle = '#a35c33';
    ctx.fillRect(-S, base - S * 0.52 * H, S * 2, Math.max(1.5, S * 0.035));
    ctx.fillRect(-S, base - S * 1 * H, S * 2, Math.max(1.5, S * 0.03));
    ctx.restore();
    const w1: [number, number] = [X(-0.36 * S), base - S * 0.46 * H];
    const w2: [number, number] = [X(0.3 * S), base - S * 0.2];
    const mag: [number, number] = [X(0.08 * S), base - S * 1.16 * H];
    oreNode(rend, w1[0], w1[1], S * 0.34, -0.16 * m, pal);
    oreNode(rend, w2[0], w2[1], S * 0.36, 0.12 * m, pal);
    // Magnetite: near-black with a cold specular.
    oreNode(rend, mag[0], mag[1], S * 0.3, 0.08 * m, {
      nug: '#3a3d46',
      deep: '#23252c',
      accent: '#9fb2c8',
    });
    sites.push(w1, mag);
    rubble(rend, px, py, s, h, [pal.nug, '#5f4a42']);
  } else if (tile === Tile.RockCoal) {
    // THE SEAM WALL — a jagged black face driven up between grey
    // stone shoulders, glossed with hard angular facets.
    stoneBlock(rend, X(-0.6 * S), base, S * 0.5, S * 0.52, -0.05 * S * m, BARREN_STONE, h ^ 0x51f3);
    stoneBlock(rend, X(0.58 * S), base, S * 0.46, S * 0.42, 0.05 * S * m, BARREN_DIM, h ^ 0x9e37);
    // Stepped rectangular battlements, heights off the hash.
    const cH = crowded ? 0.7 : 1;
    const s0 = (0.78 + ((h >> 3) & 3) * 0.07) * cH;
    const s1 = (1.06 + ((h >> 6) & 3) * 0.06) * cH;
    const s2 = (0.84 + ((h >> 9) & 3) * 0.07) * cH;
    ctx.fillStyle = pal.nug;
    ctx.beginPath();
    ctx.moveTo(X(-0.5 * S), base);
    ctx.lineTo(X(-0.53 * S), base - S * s0);
    ctx.lineTo(X(-0.17 * S), base - S * s0);
    ctx.lineTo(X(-0.14 * S), base - S * s1);
    ctx.lineTo(X(0.19 * S), base - S * s1);
    ctx.lineTo(X(0.22 * S), base - S * s2);
    ctx.lineTo(X(0.48 * S), base - S * s2);
    ctx.lineTo(X(0.5 * S), base);
    ctx.closePath();
    ctx.fill();
    // Angular gloss facets + hard glint ticks — coal shines flat.
    ctx.fillStyle = '#44404f';
    ctx.beginPath();
    ctx.moveTo(X(-0.43 * S), base - S * 0.6 * cH);
    ctx.lineTo(X(-0.22 * S), base - S * 0.74 * cH);
    ctx.lineTo(X(-0.22 * S), base - S * 0.36 * cH);
    ctx.lineTo(X(-0.43 * S), base - S * 0.24 * cH);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(X(0), base - S * (s1 - 0.07 * cH));
    ctx.lineTo(X(0.17 * S), base - S * (s1 - 0.14 * cH));
    ctx.lineTo(X(0.17 * S), base - S * 0.46 * cH);
    ctx.lineTo(X(0), base - S * 0.4 * cH);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.fillRect(X(-0.36 * S), base - S * 0.66 * cH, S * 0.12, Math.max(1.5, S * 0.03));
    ctx.fillRect(X(0.05 * S), base - S * 0.86 * cH, S * 0.1, Math.max(1.5, S * 0.028));
    // Tumbled coal blocks at the foot.
    oreNode(rend, X(-0.34 * S), base - S * 0.09, S * 0.24, 0.1 * m, pal);
    oreNode(rend, X(0.4 * S), base - S * 0.07, S * 0.2, -0.14 * m, pal);
    sites.push([X(-0.28 * S), base - S * 0.62 * cH], [X(0.1 * S), base - S * 0.8 * cH]);
    rubble(rend, px, py, s, h, ['#232028', '#3d3a48']);
  } else if (tile === Tile.RockGold) {
    // THE CROWNED VEIN — a standing pillar split by a milky quartz
    // band, fat gold blocks studding the vein and one crowning the
    // top. The band lives IN the stone — clipped to the stack so it
    // reads as a vein, never a plank laid across it.
    const gSil = monolith(rend, X(0), base, S * 1.08, S * 1.32 * H, m, pal.stone, h);
    ctx.save();
    const veinClip = new Path2D();
    gSil.forEach(([x, y], i) => (i === 0 ? veinClip.moveTo(x, y) : veinClip.lineTo(x, y)));
    veinClip.closePath();
    ctx.clip(veinClip);
    ctx.translate(px, base - S * 0.56 * H);
    ctx.rotate(-0.38 * m);
    ctx.fillStyle = '#c9c2d4';
    ctx.fillRect(-S * 0.8, -S * 0.12, S * 1.6, S * 0.24);
    ctx.fillStyle = '#efeaf2';
    ctx.fillRect(-S * 0.8, -S * 0.08, S * 1.6, S * 0.16);
    ctx.restore();
    const g1: [number, number] = [X(-0.34 * S), base - S * 0.26];
    const g2: [number, number] = [X(0.02 * S), base - S * 0.58 * H];
    const g3: [number, number] = [X(0.3 * S), base - S * 0.88 * H];
    const g4: [number, number] = [X(0), base - S * 1.34 * H]; // the crown
    oreNode(rend, g1[0], g1[1], S * 0.26, 0.18 * m, pal);
    oreNode(rend, g2[0], g2[1], S * 0.3, -0.1 * m, pal);
    oreNode(rend, g3[0], g3[1], S * 0.24, 0.12 * m, pal);
    oreNode(rend, g4[0], g4[1], S * 0.28, -0.08 * m, pal);
    sites.push(g2, g3, g4);
    rubble(rend, px, py, s, h, [pal.nug, '#6a6375']);
    // The hoard glows: a slow warm pulse. (pickWorld: the glow
    // reprojects through liftedWTS, so the inverse must ride the
    // same lift — the flat inverse doubled it on mesas.)
    const pulse = 0.6 + Math.sin(tSec * 1.7 + (h % 10)) * 0.4;
    const gw = rend.pickWorld(px, base - S * 0.6);
    rend.queueGlow(gw.x, gw.y, 0.7, '242, 201, 76', 0.14 * pulse);
  } else if (tile === Tile.RockSilver) {
    // THE SILVERSPUR — the rock's shoulder has BROKEN OPEN into a
    // crystal pocket, and the silver grows from inside it. The
    // integration is structural, not painted: cavity in shadow, a
    // freshly-cut rim facet, columns rising from WITHIN the pocket
    // with the stone's front lip overlapping their bases, and one
    // column standing proud in front — occlusion layering is what
    // makes the metal belong to the rock. Columns are blocky
    // near-parallel shafts with slanted flat caps (the stoneBlock
    // lit-cap grammar), split hard into lit/shadow facets; the tall
    // column carries a sky-sheen stripe — polished metal remembers
    // the sky. Steel-blue tones, white only in chips.
    stoneBlock(rend, X(0.56 * S), base, S * 0.44, S * 0.34 * H, 0.05 * S * m, BARREN_DIM, h ^ 0x51f3);
    const vSil = monolith(rend, X(-0.04 * S), base, S * 1.2, S * 1.02 * H, m, pal.stone, h);
    const silPath = new Path2D();
    vSil.forEach(([x, y], i) => (i === 0 ? silPath.moveTo(x, y) : silPath.lineTo(x, y)));
    silPath.closePath();
    // A columnar silver crystal rooted at (bx, by): blocky shaft,
    // slanted flat cap, hard lengthwise facet split. Returns the
    // cap point for the sparkle sites.
    const column = (bx: number, by: number, len: number, w: number, ang: number, sheen = false): [number, number] => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(ang);
      ctx.fillStyle = '#8e97ad';
      ctx.beginPath();
      ctx.moveTo(-w * 0.5, 0);
      ctx.lineTo(-w * 0.56, -len * 0.62);
      ctx.lineTo(-w * 0.36, -len);
      ctx.lineTo(w * 0.3, -len * 0.86);
      ctx.lineTo(w * 0.54, -len * 0.58);
      ctx.lineTo(w * 0.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d4dcea';
      ctx.beginPath();
      ctx.moveTo(-w * 0.5, 0);
      ctx.lineTo(-w * 0.56, -len * 0.62);
      ctx.lineTo(-w * 0.36, -len);
      ctx.lineTo(w * 0.0, -len * 0.92);
      ctx.lineTo(w * 0.02, -len * 0.5);
      ctx.lineTo(-w * 0.04, 0);
      ctx.closePath();
      ctx.fill();
      if (sheen) {
        // The sky, reflected: one narrow brighter stripe running the
        // shaft inside the lit facet.
        ctx.fillStyle = '#f2f6fe';
        ctx.beginPath();
        ctx.moveTo(-w * 0.34, -len * 0.06);
        ctx.lineTo(-w * 0.4, -len * 0.6);
        ctx.lineTo(-w * 0.26, -len * 0.94);
        ctx.lineTo(-w * 0.12, -len * 0.88);
        ctx.lineTo(-w * 0.18, -len * 0.5);
        ctx.lineTo(-w * 0.14, -len * 0.06);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#eef2fa';
      ctx.beginPath();
      ctx.moveTo(-w * 0.36, -len);
      ctx.lineTo(w * 0.3, -len * 0.86);
      ctx.lineTo(w * 0.18, -len * 0.76);
      ctx.lineTo(-w * 0.28, -len * 0.88);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-w * 0.36, -len);
      ctx.lineTo(-w * 0.1, -len * 0.95);
      ctx.lineTo(-w * 0.3, -len * 0.86);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return [bx + Math.sin(ang) * len * -0.95, by - Math.cos(ang) * len * 0.95];
    };
    const lean = (((h >> 7) & 7) / 7 - 0.5) * 0.2;
    // 1) The pocket: a broken basin high in the stone — cavity in
    //    shadow with a freshly-cut facet along its lower rim, cracks
    //    running off its corners. All clipped INTO the rock.
    ctx.save();
    ctx.clip(silPath);
    ctx.fillStyle = '#262a38';
    ctx.beginPath();
    ctx.moveTo(X(-0.46 * S), base - S * 0.56 * H);
    ctx.lineTo(X(-0.3 * S), base - S * 0.78 * H);
    ctx.lineTo(X(0.06 * S), base - S * 0.9 * H);
    ctx.lineTo(X(0.38 * S), base - S * 0.7 * H);
    ctx.lineTo(X(0.28 * S), base - S * 0.5 * H);
    ctx.lineTo(X(-0.12 * S), base - S * 0.44 * H);
    ctx.closePath();
    ctx.fill();
    // The fresh cut: a lighter cool facet where the rock sheared.
    ctx.fillStyle = '#6b6878';
    ctx.beginPath();
    ctx.moveTo(X(-0.46 * S), base - S * 0.56 * H);
    ctx.lineTo(X(-0.3 * S), base - S * 0.78 * H);
    ctx.lineTo(X(-0.2 * S), base - S * 0.72 * H);
    ctx.lineTo(X(-0.36 * S), base - S * 0.52 * H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(26, 20, 36, 0.5)';
    ctx.lineWidth = Math.max(1.5, s * 0.03);
    ctx.beginPath();
    ctx.moveTo(X(0.38 * S), base - S * 0.7 * H);
    ctx.lineTo(X(0.52 * S), base - S * 0.78 * H);
    ctx.moveTo(X(-0.12 * S), base - S * 0.44 * H);
    ctx.lineTo(X(-0.2 * S), base - S * 0.24 * H);
    ctx.stroke();
    ctx.restore();
    // 2) Columns rising from INSIDE the pocket — their feet stand on
    //    the cavity floor, behind the lip that comes next.
    const t1 = column(X(-0.08 * S), base - S * 0.52 * H, S * 0.78 * H, S * 0.22, (-0.1 + lean) * m, true);
    const t2 = column(X(0.18 * S), base - S * 0.56 * H, S * 0.5 * H, S * 0.16, (0.3 + lean) * m);
    // 3) The front lip: the pocket's lower rim, a stone wedge laid
    //    OVER the column feet — the occlusion that roots them.
    ctx.save();
    ctx.clip(silPath);
    ctx.fillStyle = pal.stone.face;
    ctx.beginPath();
    ctx.moveTo(X(-0.5 * S), base - S * 0.5 * H);
    ctx.lineTo(X(-0.1 * S), base - S * 0.56 * H);
    ctx.lineTo(X(0.3 * S), base - S * 0.52 * H);
    ctx.lineTo(X(0.42 * S), base - S * 0.4 * H);
    ctx.lineTo(X(0.16 * S), base - S * 0.3 * H);
    ctx.lineTo(X(-0.34 * S), base - S * 0.32 * H);
    ctx.closePath();
    ctx.fill();
    // Lit brink along the lip's top edge — the stoneBlock cap law.
    ctx.fillStyle = pal.stone.top;
    ctx.beginPath();
    ctx.moveTo(X(-0.5 * S), base - S * 0.5 * H);
    ctx.lineTo(X(-0.1 * S), base - S * 0.56 * H);
    ctx.lineTo(X(0.3 * S), base - S * 0.52 * H);
    ctx.lineTo(X(0.29 * S), base - S * 0.475 * H);
    ctx.lineTo(X(-0.1 * S), base - S * 0.515 * H);
    ctx.lineTo(X(-0.44 * S), base - S * 0.465 * H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // 4) The front growth: one shorter column standing proud of the
    //    lip, and a half-sunk silver block at the pocket's rim.
    const t3 = column(X(-0.26 * S), base - S * 0.36 * H, S * 0.4 * H, S * 0.15, (-0.42 + lean * 0.5) * m);
    oreNode(rend, X(0.34 * S), base - S * 0.44 * H, S * 0.24, 0.1 * m, pal);
    // 5) The foot: the cut block every deposit promises the pick.
    const cut: [number, number] = [X(0.34 * S), base - S * 0.14];
    oreNode(rend, cut[0], cut[1], S * 0.3, 0.08 * m, pal);
    sites.push(t1, t2, t3, cut);
    rubble(rend, px, py, s, h, [pal.nug, '#6a6375', pal.deep]);
  } else if (tile === Tile.RockMithril) {
    // THE RISEN LODE — mithril is the feather-light sky-metal, and
    // this is the only deposit in the game that FLOATS: a broken
    // notch in the tall spire holds the embedded lode-mass, and a
    // trail of faceted shards drifts weightlessly up off it, each
    // bobbing on its own slow phase with a contact shadow selling
    // the hover. Integration follows the silverspur law — notch
    // clipped INTO the stone, lode seated behind a stone lip, the
    // sky claiming what worked loose.
    stoneBlock(rend, X(0.5 * S), base, S * 0.48, S * 0.34 * H, 0.04 * S * m, BARREN_DIM, h ^ 0x9e37);
    const spH = crowded ? 0.62 : 1;
    const mSil = monolith(rend, X(-0.04 * S), base, S * 0.98, S * 1.6 * spH, m, pal.stone, h);
    const spirePath = new Path2D();
    mSil.forEach(([x, y], i) => (i === 0 ? spirePath.moveTo(x, y) : spirePath.lineTo(x, y)));
    spirePath.closePath();
    // A faceted mithril shard: low-poly chunk, hard three-tone split
    // (deep flank, sky-blue body, lit facet) + one white chip.
    const shard = (cx2: number, cy2: number, r: number, rot: number): void => {
      ctx.save();
      ctx.translate(cx2, cy2);
      ctx.rotate(rot);
      ctx.fillStyle = pal.deep;
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 0.15);
      ctx.lineTo(-r * 0.45, -r * 0.85);
      ctx.lineTo(r * 0.5, -r * 0.75);
      ctx.lineTo(r * 0.95, r * 0.1);
      ctx.lineTo(r * 0.35, r * 0.8);
      ctx.lineTo(-r * 0.5, r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = pal.nug;
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 0.15);
      ctx.lineTo(-r * 0.45, -r * 0.85);
      ctx.lineTo(r * 0.5, -r * 0.75);
      ctx.lineTo(r * 0.28, -r * 0.05);
      ctx.lineTo(-r * 0.35, r * 0.45);
      ctx.closePath();
      ctx.fill();
      // Lit facet toward the sky.
      ctx.fillStyle = '#b7d2f2';
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, -r * 0.85);
      ctx.lineTo(r * 0.5, -r * 0.75);
      ctx.lineTo(r * 0.28, -r * 0.05);
      ctx.lineTo(-r * 0.25, -r * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e8f4ff';
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, -r * 0.85);
      ctx.lineTo(-r * 0.1, -r * 0.78);
      ctx.lineTo(-r * 0.38, -r * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    // 1) The notch: a shadowed bite in the spire's flank where the
    //    lode surfaced — clipped INTO the stone, crack running down.
    const notchY = base - S * 0.98 * spH;
    ctx.save();
    ctx.clip(spirePath);
    ctx.fillStyle = '#262a38';
    ctx.beginPath();
    ctx.moveTo(X(-0.34 * S), notchY + S * 0.08);
    ctx.lineTo(X(-0.16 * S), notchY - S * 0.26);
    ctx.lineTo(X(0.2 * S), notchY - S * 0.3);
    ctx.lineTo(X(0.34 * S), notchY - S * 0.02);
    ctx.lineTo(X(0.12 * S), notchY + S * 0.16);
    ctx.lineTo(X(-0.14 * S), notchY + S * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(26, 20, 36, 0.5)';
    ctx.lineWidth = Math.max(1.5, s * 0.03);
    ctx.beginPath();
    ctx.moveTo(X(-0.14 * S), notchY + S * 0.18);
    ctx.lineTo(X(-0.22 * S), notchY + S * 0.52);
    ctx.stroke();
    ctx.restore();
    // 2) The lode-mass: one big faceted chunk seated IN the notch.
    shard(X(0.0 * S), notchY - S * 0.04, S * 0.3, 0.1 * m);
    // 3) The lip: the notch's lower rim laid over the mass's foot —
    //    the occlusion that roots it in the spire.
    ctx.save();
    ctx.clip(spirePath);
    ctx.fillStyle = pal.stone.face;
    ctx.beginPath();
    ctx.moveTo(X(-0.36 * S), notchY + S * 0.1);
    ctx.lineTo(X(0.14 * S), notchY + S * 0.14);
    ctx.lineTo(X(0.36 * S), notchY + S * 0.02);
    ctx.lineTo(X(0.3 * S), notchY + S * 0.34);
    ctx.lineTo(X(-0.28 * S), notchY + S * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pal.stone.top;
    ctx.beginPath();
    ctx.moveTo(X(-0.36 * S), notchY + S * 0.1);
    ctx.lineTo(X(0.14 * S), notchY + S * 0.14);
    ctx.lineTo(X(0.36 * S), notchY + S * 0.02);
    ctx.lineTo(X(0.35 * S), notchY + S * 0.07);
    ctx.lineTo(X(0.14 * S), notchY + S * 0.185);
    ctx.lineTo(X(-0.35 * S), notchY + S * 0.145);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // 4) THE DRIFT: shards working loose and rising — each bobs on
    //    its own slow phase (deterministic off tSec, so bakes hold
    //    still), with a soft contact shadow on the stone below the
    //    lowest one anchoring the hover.
    const bob = (k: number): number => Math.sin(tSec * 1.15 + k * 2.1 + (h % 7)) * S * 0.025;
    const f1: [number, number] = [X(0.1 * S), notchY - S * 0.52 + bob(0)];
    const f2: [number, number] = [X(-0.08 * S), notchY - S * 0.82 + bob(1)];
    const f3: [number, number] = [X(0.16 * S), notchY - S * 1.08 + bob(2)];
    if (!rend.bakingMask) {
      ctx.fillStyle = 'rgba(20, 16, 30, 0.28)';
      ctx.beginPath();
      ctx.ellipse(f1[0], notchY - S * 0.2, S * 0.13 - bob(0) * 0.8, S * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    shard(f1[0], f1[1], S * 0.15, 0.3 * m + bob(0) * 0.01);
    shard(f2[0], f2[1], S * 0.11, -0.5 * m + bob(1) * 0.01);
    shard(f3[0], f3[1], S * 0.075, 0.8 * m);
    // 5) The foot: half-sunk cut blocks — the pick's honest target.
    const cut: [number, number] = [X(-0.24 * S), base - S * 0.2];
    oreNode(rend, cut[0], cut[1], S * 0.3, -0.08 * m, pal);
    oreNode(rend, X(0.3 * S), base - S * 0.12, S * 0.22, 0.14 * m, pal);
    sites.push(f1, f2, f3, cut);
    rubble(rend, px, py, s, h, [pal.nug, '#6a6375']);
    // The cool halo rides the drift — the sky remembering its metal.
    const mPulse = 0.6 + Math.sin(tSec * 1.3 + (h % 10)) * 0.4;
    const gw = rend.pickWorld(px, notchY - S * 0.6);
    rend.queueGlow(gw.x, gw.y, 0.6, '143, 180, 228', 0.12 * mPulse);
  } else if (tile === Tile.RockAdamant) {
    // THE TWIN HORNS — two hard prongs leaning apart in a V, deep
    // green plates clipped into the tall horn, an adamant block
    // seated in the notch between them. Nothing else in the rock
    // family splits; the silhouette is the signature.
    const aH = crowded ? 0.66 : 1;
    const hornL = stoneBlock(rend, X(-0.3 * S), base, S * 0.62, S * 1.42 * aH, -0.22 * S * m, pal.stone, h, 0.75);
    stoneBlock(rend, X(0.34 * S), base, S * 0.54, S * 1.02 * aH, 0.24 * S * m, pal.stone, h ^ 0x51f3, 0.75);
    // Green armor plates live IN the tall horn.
    ctx.save();
    const hornClip = new Path2D();
    hornL.forEach(([x, y], i) => (i === 0 ? hornClip.moveTo(x, y) : hornClip.lineTo(x, y)));
    hornClip.closePath();
    ctx.clip(hornClip);
    ctx.fillStyle = pal.deep;
    ctx.save();
    ctx.translate(X(-0.3 * S), base);
    ctx.rotate(-0.18 * m);
    ctx.fillRect(-S * 0.5, -S * 1.06 * aH, S, S * 0.13 * aH);
    ctx.fillRect(-S * 0.5, -S * 0.6 * aH, S, S * 0.1 * aH);
    ctx.restore();
    ctx.restore();
    const a1: [number, number] = [X(0.02 * S), base - S * 0.52 * aH]; // the notch
    const a2: [number, number] = [X(-0.36 * S), base - S * 1.18 * aH];
    const a3: [number, number] = [X(0.4 * S), base - S * 0.2];
    oreNode(rend, a1[0], a1[1], S * 0.36, 0.08 * m, pal);
    oreNode(rend, a2[0], a2[1], S * 0.3, -0.14 * m, pal);
    oreNode(rend, a3[0], a3[1], S * 0.26, 0.16 * m, pal);
    sites.push(a1, a2);
    rubble(rend, px, py, s, h, [pal.nug, '#4f5a54', pal.deep]);
  } else if (tile === Tile.RockObsidian) {
    // THE GLASS FLOW — low and wide where the others stand tall: a
    // cooled black flow in hard angular steps, glossed with violet
    // facets and conchoidal arcs, ember light still breathing in
    // the crack along its base. Volcanic, not stony — nothing else
    // in the family glows warm.
    const oH = crowded ? 0.75 : 1;
    stoneBlock(rend, X(-0.62 * S), base, S * 0.44, S * 0.34 * oH, -0.04 * S * m, BARREN_DIM, h ^ 0x9e37);
    // The flow: one wide stepped slab of black glass.
    const f0 = (0.42 + ((h >> 3) & 3) * 0.05) * oH;
    const f1 = (0.66 + ((h >> 6) & 3) * 0.05) * oH;
    const f2 = (0.36 + ((h >> 9) & 3) * 0.04) * oH;
    ctx.fillStyle = pal.nug;
    ctx.beginPath();
    ctx.moveTo(X(-0.66 * S), base);
    ctx.lineTo(X(-0.6 * S), base - S * f0);
    ctx.lineTo(X(-0.2 * S), base - S * f0 - S * 0.06);
    ctx.lineTo(X(-0.08 * S), base - S * f1);
    ctx.lineTo(X(0.3 * S), base - S * f1 + S * 0.04);
    ctx.lineTo(X(0.44 * S), base - S * f2);
    ctx.lineTo(X(0.68 * S), base - S * f2 + S * 0.05);
    ctx.lineTo(X(0.72 * S), base);
    ctx.closePath();
    ctx.fill();
    // Violet gloss facets — flat parallelograms, biased to the light.
    ctx.fillStyle = '#5c4f70';
    ctx.beginPath();
    ctx.moveTo(X(-0.5 * S), base - S * f0 * 0.82);
    ctx.lineTo(X(-0.26 * S), base - S * f0 * 0.94);
    ctx.lineTo(X(-0.3 * S), base - S * f0 * 0.4);
    ctx.lineTo(X(-0.52 * S), base - S * f0 * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(X(-0.02 * S), base - S * f1 * 0.9);
    ctx.lineTo(X(0.22 * S), base - S * f1 * 0.82);
    ctx.lineTo(X(0.18 * S), base - S * f1 * 0.44);
    ctx.lineTo(X(-0.04 * S), base - S * f1 * 0.5);
    ctx.closePath();
    ctx.fill();
    // Conchoidal arcs: the glass-fracture tell, thin and hard.
    ctx.strokeStyle = pal.accent;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = Math.max(1.4, S * 0.028);
    ctx.beginPath();
    ctx.arc(X(-0.34 * S), base - S * f0 * 0.55, S * 0.14, Math.PI * 0.15, Math.PI * 0.85);
    ctx.moveTo(X(0.14 * S) + S * 0.12, base - S * f1 * 0.6);
    ctx.arc(X(0.14 * S), base - S * f1 * 0.6, S * 0.12, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // The ember crack: warm light breathing along the base — the
    // one warm note in the whole rock family, so it must READ.
    const breathe = 0.55 + Math.sin(tSec * 2.3 + (h % 7)) * 0.45;
    ctx.fillStyle = '#ff8a3c';
    ctx.globalAlpha = 0.65 + 0.35 * breathe;
    ctx.fillRect(X(-0.44 * S), base - Math.max(2.5, S * 0.07), S * 0.34, Math.max(2.5, S * 0.06));
    ctx.fillRect(X(0.1 * S), base - Math.max(2.5, S * 0.06), S * 0.26, Math.max(2.5, S * 0.055));
    // A vent higher in the flow, ember light leaking up a step.
    ctx.fillRect(X(-0.12 * S), base - S * f1 * 0.98, S * 0.14, Math.max(2, S * 0.04));
    ctx.globalAlpha = 1;
    // Knapped shards leaning at the foot.
    oreNode(rend, X(-0.2 * S), base - S * 0.12, S * 0.26, -0.12 * m, pal);
    oreNode(rend, X(0.5 * S), base - S * 0.1, S * 0.22, 0.16 * m, pal);
    sites.push([X(-0.3 * S), base - S * f0 * 0.6], [X(0.1 * S), base - S * f1 * 0.7]);
    rubble(rend, px, py, s, h, ['#241d30', '#3b3247']);
    const gw = rend.pickWorld(px, base - S * 0.15);
    rend.queueGlow(gw.x, gw.y, 0.55, '232, 104, 60', 0.12 * breathe);
  } else {
    // THE FALLEN STAR — a scorched crater cupping a half-buried
    // core of starmetal: two dim shoulder blocks ring a fat bright
    // block with hard cracks radiating from the impact. The only
    // deposit that reads as an EVENT, not a formation.
    const cH = crowded ? 0.75 : 1;
    // Scorch: a flat dark apron under everything.
    ctx.fillStyle = 'rgba(24, 17, 32, 0.5)';
    ctx.beginPath();
    ctx.ellipse(px, base - S * 0.06, S * 0.78, S * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    stoneBlock(rend, X(-0.52 * S), base, S * 0.52, S * 0.5 * cH, 0.12 * S * m, pal.stone, h ^ 0x51f3);
    stoneBlock(rend, X(0.52 * S), base, S * 0.48, S * 0.42 * cH, -0.12 * S * m, pal.stone, h ^ 0x9e37);
    // Radiating impact cracks — hard strokes, out from the core.
    ctx.strokeStyle = 'rgba(26, 20, 36, 0.6)';
    ctx.lineWidth = Math.max(1.5, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(X(-0.18 * S), base - S * 0.3 * cH);
    ctx.lineTo(X(-0.52 * S), base - S * 0.06);
    ctx.moveTo(X(0.2 * S), base - S * 0.32 * cH);
    ctx.lineTo(X(0.5 * S), base - S * 0.1);
    ctx.lineTo(X(0.64 * S), base - S * 0.02);
    ctx.moveTo(X(0.04 * S), base - S * 0.18);
    ctx.lineTo(X(0.1 * S), base - S * 0.02);
    ctx.stroke();
    // The core: one great tilted block of starmetal, half-sunk —
    // the fattest single node in the game; the event IS the ore.
    const core: [number, number] = [X(0), base - S * 0.46 * cH];
    oreNode(rend, core[0], core[1], S * 0.62, -0.14 * m, pal);
    const shard: [number, number] = [X(-0.42 * S), base - S * 0.64 * cH];
    oreNode(rend, shard[0], shard[1], S * 0.26, 0.2 * m, pal);
    const ember: [number, number] = [X(0.44 * S), base - S * 0.52 * cH];
    oreNode(rend, ember[0], ember[1], S * 0.2, -0.22 * m, pal);
    sites.push(core, shard, ember);
    rubble(rend, px, py, s, h, [pal.nug, '#3b3648', pal.deep]);
    // Starlight never quite goes out: a pale violet pulse.
    const sPulse = 0.6 + Math.sin(tSec * 1.9 + (h % 10)) * 0.4;
    const gw = rend.pickWorld(px, base - S * 0.42);
    rend.queueGlow(gw.x, gw.y, 0.75, '214, 203, 246', 0.16 * sPulse);
  }

  // Idle shimmer: brief four-point twinkles over the crystal sites -
  // gold flashes often, the fallen star outright glitters, and
  // everything else winks patiently.
  const period =
    tile === Tile.RockStarfall ? 1.7
    : tile === Tile.RockGold ? 2.1
    : tile === Tile.RockMithril ? 2.6
    : 3.4;
  for (let k = 0; k < sites.length; k++) {
    const a = twinkle(tSec, h >> (k * 4), period + k * 0.53);
    if (a <= 0) continue;
    const [sx2, sy2] = sites[k]!;
    const jx = (((h >> (k * 7)) % 20) - 10) / 100 * s;
    sparkle(rend, sx2 + jx, sy2 - s * 0.04, s * (0.07 + 0.05 * a), 0.9 * a, '#ffffff');
    sparkle(rend, sx2 + jx, sy2 - s * 0.04, s * (0.035 + 0.02 * a), 0.9 * a, pal.accent);
  }
}
