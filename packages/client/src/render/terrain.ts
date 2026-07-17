import {
  CHUNK_SIZE,
  Detail,
  Tile,
  hashCoords,
  valueNoise,
} from '@devcraft/shared';
import { chamferRect } from './shapes.js';

/**
 * Faceted terrain rendering. Tiles are authored on a grid but drawn as
 * unions of CHAMFERED cells: every material region gets crisp 45°-cut
 * coastlines — angular and deliberate, never pixel-grid, never soft
 * pills. Ground shading comes from low-frequency noise — big soft
 * meadows, no checkerboard.
 */

export type GroundSampler = (tx: number, ty: number) => number | undefined;
export type DetailSampler = (tx: number, ty: number) => number;

// ---------------------------------------------------------------- palette

const GRASS_TONES = ['#5c8941', '#588440', '#608e45', '#55813e'];
const CAVE_TONES = ['#5a5468', '#554f62', '#5f5870'];

interface BlobLayer {
  /** Does this ground id belong to the layer? */
  match: (t: number) => boolean;
  color: (t: number, tx: number, ty: number) => string;
  /** Corner radius in tile fractions. */
  radius: number;
}

/** Region-scale two-tone variation — smooth patches, never per-tile. */
function patch(base: string, alt: string, tx: number, ty: number, salt: number): string {
  return valueNoise(salt, tx * 0.09, ty * 0.09) > 0.55 ? alt : base;
}

/** Painted lowest → highest; later layers' rounding overlaps earlier. */
const BLOB_LAYERS: BlobLayer[] = [
  {
    match: (t) => t === Tile.Dirt,
    color: (_t, tx, ty) => patch('#96744c', '#8f6e47', tx, ty, 31),
    radius: 0.5,
  },
  {
    match: (t) => t === Tile.Swamp,
    color: () => '#556b3e',
    radius: 0.5,
  },
  {
    match: (t) => t === Tile.Path,
    color: (_t, tx, ty) => patch('#c2a26e', '#bc9d69', tx, ty, 33),
    radius: 0.55,
  },
  {
    match: (t) => t === Tile.Sand,
    color: (_t, tx, ty) => patch('#ddc98d', '#d6c286', tx, ty, 35),
    radius: 0.5,
  },
  {
    match: (t) => t === Tile.StoneFloor,
    color: (_t, tx, ty) => patch('#a09aa8', '#99939f', tx, ty, 37),
    radius: 0.42,
  },
  {
    match: (t) => t === Tile.WoodFloor || t === Tile.Bridge,
    color: (_t, tx, ty) => patch('#a87e46', '#a37943', tx, ty, 39),
    radius: 0.3,
  },
  {
    match: (t) => t === Tile.CaveFloor || t === Tile.PortalDown || t === Tile.PortalUp,
    color: (_t, tx, ty) => patch(CAVE_TONES[0]!, CAVE_TONES[1]!, tx, ty, 41),
    radius: 0.45,
  },
  {
    match: (t) => t === Tile.Snow,
    color: () => '#e9edf3',
    radius: 0.5,
  },
  {
    match: (t) => t === Tile.Water || t === Tile.FishingSpot,
    color: () => '#4979b8',
    radius: 0.55,
  },
  {
    match: (t) => t === Tile.WaterDeep,
    color: () => '#3a629e',
    radius: 0.55,
  },
];

const GRASS_LIKE = new Set<number>([
  Tile.Grass,
  Tile.GrassTall,
  Tile.Tree,
  Tile.TreeOak,
  Tile.Stump,
  Tile.Fence,
  Tile.Campfire,
]);

/** What lies visually beneath objects that sit on the ground. */
function isCaveGround(t: number | undefined): boolean {
  return (
    t === Tile.CaveWall ||
    t === Tile.CaveFloor ||
    t === Tile.PortalDown ||
    t === Tile.PortalUp
  );
}

// ---------------------------------------------------------------- baking

export function bakeChunk(
  ground: GroundSampler,
  detail: DetailSampler,
  cx: number,
  cy: number,
  px: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CHUNK_SIZE * px;
  canvas.height = CHUNK_SIZE * px;
  const ctx = canvas.getContext('2d')!;
  const baseX = cx * CHUNK_SIZE;
  const baseY = cy * CHUNK_SIZE;

  // Effective ground for blob purposes: objects show what's under them.
  const g = (tx: number, ty: number): number => {
    const t = ground(tx, ty);
    if (t === undefined) return Tile.Grass;
    if (GRASS_LIKE.has(t)) return Tile.Grass;
    if (t === Tile.Rock || t === Tile.RockCopper || t === Tile.RockIron || t === Tile.RockDepleted) {
      // Rocks sit on whatever region they're in.
      return isCaveGround(ground(tx, ty + 1)) || isCaveGround(ground(tx, ty - 1))
        ? Tile.CaveFloor
        : neighborsStone(ground, tx, ty)
          ? Tile.StoneFloor
          : Tile.Grass;
    }
    if (t === Tile.Furnace || t === Tile.Anvil) {
      return isCaveGround(ground(tx, ty + 1)) ? Tile.CaveFloor : nearestFloor(ground, tx, ty);
    }
    if (t === Tile.Workbench || t === Tile.BankChest || t === Tile.ShopCounter) {
      return nearestFloor(ground, tx, ty);
    }
    if (t === Tile.WallStone || t === Tile.WallWood || t === Tile.CaveWall) return t;
    return t;
  };

  // 1. Meadow base: large soft noise patches, no per-tile checker.
  const cell = Math.max(4, Math.floor(px / 4));
  for (let y = 0; y < canvas.height; y += cell) {
    for (let x = 0; x < canvas.width; x += cell) {
      const wx = baseX + x / px;
      const wy = baseY + y / px;
      const n = valueNoise(1234, wx * 0.055, wy * 0.055) * 0.7 + valueNoise(777, wx * 0.021, wy * 0.021) * 0.3;
      const idx = n < 0.38 ? 3 : n < 0.52 ? 1 : n < 0.72 ? 0 : 2;
      ctx.fillStyle = GRASS_TONES[idx]!;
      ctx.fillRect(x, y, cell, cell);
    }
  }
  // Dark band chunks get a cave-rock base instead.
  if (baseY >= 512) {
    ctx.fillStyle = '#2e2938';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 2. Material blobs, lowest to highest.
  for (const layer of BLOB_LAYERS) {
    drawBlobLayer(ctx, layer, g, baseX, baseY, px);
  }

  // 3. Wood-floor plank seams (subtle, flat).
  drawPlanks(ctx, g, baseX, baseY, px);

  // 4. Baked micro-details (static ones only; swaying ones are live).
  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const tx = baseX + lx;
      const ty = baseY + ly;
      const d = detail(tx, ty);
      if (d === Detail.Pebbles) {
        // Angular stone chips, rotated apart so they never tile.
        const h = hashCoords(29, tx, ty);
        ctx.fillStyle = '#8b8494';
        for (const [ox, oy, pw, rot] of [
          [0.4, 0.55, 0.16, 0.4],
          [0.62, 0.38, 0.11, -0.5],
        ] as const) {
          ctx.save();
          ctx.translate(lx * px + px * ox, ly * px + px * oy);
          ctx.rotate(rot + (h % 7) * 0.1);
          ctx.beginPath();
          chamferRect(ctx, (-pw / 2) * px, (-pw * 0.4) * px, pw * px, pw * 0.8 * px, pw * px * 0.3);
          ctx.fill();
          ctx.restore();
        }
      } else if (d === Detail.Mushroom) {
        // Trapezoid cap — a faceted little roof.
        const mx = lx * px + px * 0.5;
        const my = ly * px + px * 0.55;
        ctx.fillStyle = '#efe3c2';
        ctx.fillRect(mx - px * 0.035, my - px * 0.02, px * 0.07, px * 0.14);
        ctx.fillStyle = '#c65b52';
        ctx.beginPath();
        ctx.moveTo(mx - px * 0.13, my - px * 0.02);
        ctx.lineTo(mx - px * 0.07, my - px * 0.11);
        ctx.lineTo(mx + px * 0.07, my - px * 0.11);
        ctx.lineTo(mx + px * 0.13, my - px * 0.02);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  return canvas;
}

function neighborsStone(ground: GroundSampler, tx: number, ty: number): boolean {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    if (ground(tx + dx, ty + dy) === Tile.StoneFloor) return true;
  }
  return false;
}

function nearestFloor(ground: GroundSampler, tx: number, ty: number): number {
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]] as const) {
    const t = ground(tx + dx, ty + dy);
    if (t === Tile.WoodFloor || t === Tile.StoneFloor || t === Tile.CaveFloor || t === Tile.Dirt) {
      return t;
    }
  }
  return Tile.Grass;
}

/**
 * Union-of-chamfered-cells: the whole trick behind the faceted look.
 * Each material cell is a block with 45°-cut corners; bridge strips
 * span cell boundaries so adjoining cells fuse into one region.
 */
function drawBlobLayer(
  ctx: CanvasRenderingContext2D,
  layer: BlobLayer,
  g: GroundSampler,
  baseX: number,
  baseY: number,
  px: number,
): void {
  const r = layer.radius * px;
  for (let ly = -1; ly <= CHUNK_SIZE; ly++) {
    for (let lx = -1; lx <= CHUNK_SIZE; lx++) {
      const tx = baseX + lx;
      const ty = baseY + ly;
      const t = g(tx, ty);
      if (t === undefined || !layer.match(t)) continue;
      const x = lx * px;
      const y = ly * px;
      ctx.fillStyle = layer.color(t, tx, ty);
      ctx.beginPath();
      chamferRect(ctx, x, y, px + 0.5, px + 0.5, r);
      ctx.fill();
      // Bridge strips span ACROSS the boundary so adjoining cells fuse
      // into one continuous region (this is what erases the tile grid).
      const east = g(tx + 1, ty);
      if (east !== undefined && layer.match(east)) {
        ctx.fillRect(x + px - r, y, r * 2 + 0.5, px + 0.5);
      }
      const south = g(tx, ty + 1);
      if (south !== undefined && layer.match(south)) {
        ctx.fillRect(x, y + px - r, px + 0.5, r * 2 + 0.5);
      }
    }
  }
}

function drawPlanks(
  ctx: CanvasRenderingContext2D,
  g: GroundSampler,
  baseX: number,
  baseY: number,
  px: number,
): void {
  ctx.strokeStyle = 'rgba(58, 40, 22, 0.25)';
  ctx.lineWidth = Math.max(1, px * 0.04);
  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const t = g(baseX + lx, baseY + ly);
      if (t !== Tile.WoodFloor && t !== Tile.Bridge) continue;
      const y = ly * px + px * (0.33 + (hashCoords(43, baseX + lx, baseY + ly) % 3) * 0.17);
      ctx.beginPath();
      ctx.moveTo(lx * px, y);
      ctx.lineTo(lx * px + px, y);
      ctx.stroke();
    }
  }
}

// ------------------------------------------------------ live decorations

/**
 * The breeze layer: swaying grass blades, drifting water glints, pulsing
 * ripples and portal swirls. Drawn every frame over the baked ground —
 * this is what makes the meadow feel alive.
 */
export function drawLiveGround(
  ctx: CanvasRenderingContext2D,
  ground: GroundSampler,
  detail: DetailSampler,
  bounds: { minTx: number; maxTx: number; minTy: number; maxTy: number },
  worldToScreen: (wx: number, wy: number) => { x: number; y: number },
  s: number,
  timeMs: number,
): void {
  const t = timeMs / 1000;
  for (let ty = bounds.minTy; ty <= bounds.maxTy; ty++) {
    for (let tx = bounds.minTx; tx <= bounds.maxTx; tx++) {
      const tile = ground(tx, ty);
      if (tile === undefined) continue;
      const h = hashCoords(59, tx, ty);

      if (tile === Tile.Grass || tile === Tile.GrassTall) {
        const isTall = tile === Tile.GrassTall;
        // A fraction of tiles grow visible blades.
        if (!isTall && h % 5 !== 0) {
          // Some of the rest get swaying flowers from the detail layer.
          const d = detail(tx, ty);
          if (d === Detail.Flowers) drawFlowers(ctx, tx, ty, worldToScreen, s, t, h);
          else if (d === Detail.Tuft) drawBlades(ctx, tx, ty, worldToScreen, s, t, h, 2, false);
          continue;
        }
        drawBlades(ctx, tx, ty, worldToScreen, s, t, h, isTall ? 5 : 3, isTall);
      } else if (tile === Tile.Water || tile === Tile.WaterDeep) {
        if (h % 6 === 0) {
          // Drifting glint: a short dash that slides and fades.
          const phase = (t * 0.35 + (h % 100) / 100) % 1;
          const gx = tx + ((h >> 4) % 60) / 100 + phase * 0.35;
          const gy = ty + ((h >> 9) % 60) / 100 + 0.2;
          const p = worldToScreen(gx, gy);
          ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.5;
          ctx.strokeStyle = '#cfe3f7';
          ctx.lineWidth = Math.max(1.5, s * 0.05);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + s * 0.22, p.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else if (tile === Tile.FishingSpot) {
        const p = worldToScreen(tx + 0.5, ty + 0.5);
        for (let ring = 0; ring < 2; ring++) {
          const phase = (t * 0.6 + ring * 0.5) % 1;
          ctx.globalAlpha = (1 - phase) * 0.6;
          ctx.strokeStyle = '#dcebfb';
          ctx.lineWidth = Math.max(1.5, s * 0.05);
          ctx.beginPath();
          ctx.arc(p.x, p.y, (0.1 + phase * 0.34) * s, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (tile === Tile.PortalDown || tile === Tile.PortalUp) {
        drawPortal(ctx, tx, ty, tile === Tile.PortalUp, worldToScreen, s, t);
      }
    }
  }
}

function drawBlades(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  worldToScreen: (wx: number, wy: number) => { x: number; y: number },
  s: number,
  t: number,
  h: number,
  count: number,
  tall: boolean,
): void {
  ctx.strokeStyle = tall ? '#4a7433' : '#6b9a4e';
  ctx.lineWidth = Math.max(1.2, s * 0.045);
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const hh = hashCoords(61 + i, tx, ty);
    const bx = tx + 0.15 + ((hh >> 3) % 70) / 100;
    const by = ty + 0.2 + ((hh >> 10) % 70) / 100;
    const height = (tall ? 0.3 : 0.2) * (0.8 + ((hh >> 5) % 40) / 100);
    // The breeze: tips sway together on a slow travelling wave.
    const sway = Math.sin(t * 1.6 + bx * 0.7 + by * 0.35 + (hh % 10) * 0.2) * 0.09;
    const base = worldToScreen(bx, by);
    const tip = worldToScreen(bx + sway, by - height);
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.quadraticCurveTo(base.x, (base.y + tip.y) / 2, tip.x, tip.y);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

function drawFlowers(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  worldToScreen: (wx: number, wy: number) => { x: number; y: number },
  s: number,
  t: number,
  h: number,
): void {
  const colors = ['#e88a9e', '#f0d264', '#efe3c2'];
  for (let i = 0; i < 2; i++) {
    const hh = hashCoords(67 + i, tx, ty);
    const bx = tx + 0.2 + ((hh >> 3) % 60) / 100;
    const by = ty + 0.25 + ((hh >> 9) % 60) / 100;
    const sway = Math.sin(t * 1.6 + bx * 0.7 + (hh % 7) * 0.3) * 0.05;
    const base = worldToScreen(bx, by);
    const head = worldToScreen(bx + sway, by - 0.16);
    ctx.strokeStyle = '#4a7433';
    ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(head.x, head.y);
    ctx.stroke();
    // Diamond bloom — four petals as one faceted chip.
    const pr = s * 0.07;
    ctx.fillStyle = colors[hh % colors.length]!;
    ctx.beginPath();
    ctx.moveTo(head.x, head.y - pr);
    ctx.lineTo(head.x + pr, head.y);
    ctx.lineTo(head.x, head.y + pr);
    ctx.lineTo(head.x - pr, head.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f7efd8';
    ctx.fillRect(head.x - s * 0.02, head.y - s * 0.02, s * 0.04, s * 0.04);
  }
}

function drawPortal(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  up: boolean,
  worldToScreen: (wx: number, wy: number) => { x: number; y: number },
  s: number,
  t: number,
): void {
  const p = worldToScreen(tx + 0.5, ty + 0.5);
  const base = up ? '#b8a5e8' : '#7a68b0';
  // Dark pool.
  ctx.fillStyle = up ? 'rgba(65, 56, 98, 0.9)' : 'rgba(26, 22, 38, 0.9)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, s * 0.4, s * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  // Rotating spiral arms.
  ctx.strokeStyle = base;
  ctx.lineWidth = Math.max(1.5, s * 0.06);
  ctx.lineCap = 'round';
  for (let arm = 0; arm < 3; arm++) {
    const a0 = t * 1.4 + (arm * Math.PI * 2) / 3;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const f = i / 8;
      const ang = a0 + f * 2.2;
      const rad = (0.06 + f * 0.28) * s;
      const x = p.x + Math.cos(ang) * rad;
      const y = p.y + Math.sin(ang) * rad * 0.8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // Center glow dot.
  ctx.fillStyle = '#efe3ff';
  ctx.beginPath();
  ctx.arc(p.x, p.y, s * 0.05 + Math.sin(t * 3) * s * 0.015, 0, Math.PI * 2);
  ctx.fill();
}
