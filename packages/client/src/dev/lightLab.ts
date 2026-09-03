/**
 * THE LIGHT LAB (lighting v4 phase 5 — the mastering bench).
 *
 * Every emitter row × four skies (noon / dusk / midnight / underground),
 * drawn by the SHIPPED machinery — collectEmitter for the arithmetic,
 * LightingSystem for the exposure map, the exported halo/core dials for
 * the seated glow — so the bench can never drift from the game. A spec
 * is tuned HERE, once, instead of live-hunting towns at four clocks.
 *
 * Each cell: turf + a wall run north of the fixture (occluders show
 * their shadow + lit faces), the seated halo, the multiply map, the
 * core glint — the real frame order. THE DARKNESS LEDGER reads out as
 * three dots east of the fixture (1.5 / 3.5 / 6 tiles): green = the
 * gameplay line holds light there, red = dark. The body ruler stands
 * at the left of every cell (the rig is the unit of measure).
 */
import {
  EMITTER_LIGHTS,
  Tile,
  daylightAt,
  lightLevelAt,
  DARK_LEVEL,
  type DaylightSample,
} from '@arx/shared';
import { itemDef } from '@arx/content';
import { collectEmitter, type EmitterGlowOut } from '../render/emitters.js';
import {
  CORE_A_K,
  CORE_R_K,
  CORE_R_MAX_PX,
  CORE_STOPS,
  HALO_CORONA_A,
  HALO_CORONA_R,
  HALO_POOL_A,
  LightingSystem,
  type WorldLight,
} from '../render/lighting.js';
import { radialGlowSprite } from '../render/glowSprite.js';

const S = 16; // px per tile
const YS = 0.82; // the game camera's squash
const CELL_W = 19 * S; // 19×9 tiles of world per cell
const CELL_H = Math.ceil(9 * S * YS) + 26;
const LABEL_W = 190;
const FX = 8.5; // fixture tile
const FY = 5;
const WALL_Y = 2; // the occluder run north of the fixture
const WALL_X0 = 5;
const WALL_X1 = 12;

/** The underground sky: the renderer's applyUnderground constants over
 *  a midnight base — ambient [100,106,126], flame 1 (documented twin;
 *  the bench approximates the blend at full depth). */
function undergroundSky(): DaylightSample {
  const s = { ...daylightAt(23) };
  s.ambient = [100, 106, 126];
  s.flame = 1;
  s.sun = 0;
  s.moon = 0;
  s.shadowAlpha = 0;
  const lum = (0.299 * 100 + 0.587 * 106 + 0.114 * 126) / 255;
  s.darkness = 1 - lum;
  return s;
}

const COLS: Array<{ name: string; sky: DaylightSample; hours: number; underground: boolean }> = [
  { name: 'NOON', sky: daylightAt(12), hours: 12, underground: false },
  { name: 'DUSK', sky: daylightAt(19.8), hours: 19.8, underground: false },
  { name: 'MIDNIGHT', sky: daylightAt(23), hours: 23, underground: false },
  { name: 'UNDERGROUND', sky: undergroundSky(), hours: 23, underground: true },
];

/** The roster: every registry row, plus the carried lantern. */
const ROWS: Array<{ name: string; tile: number | null }> = [
  ...EMITTER_LIGHTS.map(([tile]) => ({ name: Tile[tile] ?? String(tile), tile: tile as number })),
  { name: 'Lantern (carried)', tile: null },
];

const canvas = document.getElementById('lab') as HTMLCanvasElement;
canvas.width = LABEL_W + COLS.length * (CELL_W + 8) + 8;
canvas.height = 28 + ROWS.length * (CELL_H + 8);
const ctx = canvas.getContext('2d')!;
const lighting = new LightingSystem();

const wallBlocks = (tx: number, ty: number): boolean =>
  ty === WALL_Y && tx >= WALL_X0 && tx <= WALL_X1;
const wallTallH = (tx: number, ty: number): number => (wallBlocks(tx, ty) ? 2.05 / YS : 0);
const gainOne = (): number => 1;

/** A cell's world: the bench's tiny tileAt for the ledger readout. */
function cellTileAt(tile: number | null): (x: number, y: number) => number | undefined {
  return (x, y) => (tile !== null && x === Math.floor(FX) && y === Math.floor(FY) ? tile : Tile.Grass);
}

function drawCell(
  px: number,
  py: number,
  row: { name: string; tile: number | null },
  col: (typeof COLS)[number],
  t: number,
): void {
  const { sky } = col;
  ctx.save();
  ctx.translate(px, py);
  ctx.beginPath();
  ctx.rect(0, 0, CELL_W, CELL_H);
  ctx.clip();

  // Ground + the wall run + the fixture seat marker.
  ctx.fillStyle = '#4a5d43';
  ctx.fillRect(0, 0, CELL_W, CELL_H);
  ctx.fillStyle = '#43553d';
  for (let gx = 0; gx < 19; gx++) {
    for (let gy = 0; gy < 10; gy++) {
      if ((gx + gy) % 2 === 0) ctx.fillRect(gx * S, gy * S * YS, S, S * YS);
    }
  }
  ctx.fillStyle = '#6b6b78';
  ctx.fillRect(WALL_X0 * S, (WALL_Y - 1.2) * S * YS, (WALL_X1 - WALL_X0 + 1) * S, 2.2 * S * YS);
  ctx.fillStyle = '#3d3d46';
  ctx.fillRect(WALL_X0 * S, (WALL_Y + 0.62) * S * YS, (WALL_X1 - WALL_X0 + 1) * S, 0.38 * S * YS);
  // The body ruler: 1.15 tiles of standing rig at the cell's west.
  ctx.fillStyle = '#d8cdb6';
  ctx.fillRect(1.2 * S, (FY - 0.05) * S * YS - 1.15 * S, 0.42 * S, 1.15 * S);

  // The fixture's evaluated voice — the shipped arithmetic.
  const glows: EmitterGlowOut[] = [];
  const lights: WorldLight[] = [];
  if (row.tile !== null) {
    const spec = EMITTER_LIGHTS.find(([tl]) => tl === row.tile)?.[1];
    if (spec) {
      collectEmitter(spec, Math.floor(FX), Math.floor(FY), t, sky.flame, 1 + 0.8 * sky.darkness, YS, 0, glows, lights);
    }
  } else {
    const cl = itemDef('lantern')?.carryLight;
    if (cl && sky.flame > 0.05) {
      const breathe = 0.93 + Math.sin(t * 2.1) * 0.05 + Math.sin(t * 5.7) * 0.02;
      lights.push({ x: FX + 0.5, y: FY + 0.5, r: cl.r, rgb: cl.rgb, intensity: cl.intensity * sky.flame * breathe, z: cl.z });
      glows.push({ x: FX + 0.5, y: FY + 0.5 - cl.z / YS, gy: FY + 0.5, z: cl.z, r: 0.85 * breathe, rgb: `${cl.rgb[0]}, ${cl.rgb[1]}, ${cl.rgb[2]}`, a: 0.22 * sky.flame * breathe });
    }
  }
  // The fixture marker (the light is the subject — a seat, not a prop).
  ctx.fillStyle = '#2b2320';
  ctx.fillRect((FX + 0.28) * S, (FY + 0.1) * S * YS, 0.44 * S, 0.5 * S * YS);

  // THE SEATED HALO — pool, corona (lighter, pre-multiply).
  ctx.globalCompositeOperation = 'lighter';
  for (const g of glows) {
    const sprite = radialGlowSprite(g.rgb, [[0, 1], [0.55, 0.38], [1, 0]], 0.08);
    const pr = g.r * S;
    ctx.globalAlpha = Math.min(1, g.a * HALO_POOL_A);
    ctx.drawImage(sprite, g.x * S - pr, g.gy * S * YS - pr * YS, pr * 2, pr * 2 * YS);
    const cr = pr * HALO_CORONA_R;
    ctx.globalAlpha = Math.min(1, g.a * HALO_CORONA_A);
    ctx.drawImage(sprite, g.x * S - cr, g.y * S * YS - cr, cr * 2, cr * 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // THE EXPOSURE MAP — the real class, the real order.
  lighting.draw(
    ctx,
    { w: CELL_W, h: CELL_H, scale: S, yScale: YS, ox: 0, oy: 0, q: 0 },
    sky,
    lights,
    wallBlocks,
    wallTallH,
    gainOne,
  );

  // THE CORE — the one post-multiply survivor.
  ctx.globalCompositeOperation = 'lighter';
  for (const g of glows) {
    const a = g.a * CORE_A_K;
    if (a < 0.04) continue;
    const cr = Math.min(g.r * S * CORE_R_K, CORE_R_MAX_PX);
    ctx.globalAlpha = Math.min(0.6, a);
    ctx.drawImage(radialGlowSprite(g.rgb, CORE_STOPS, 0.25), g.x * S - cr, g.y * S * YS - cr, cr * 2, cr * 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // THE LEDGER READOUT: the gameplay truth at three distances.
  const tileAt = cellTileAt(row.tile);
  for (const [i, d] of [1.5, 3.5, 6].entries()) {
    const lx = Math.floor(FX + d);
    const level = lightLevelAt(col.hours, col.underground, lx, Math.floor(FY), tileAt);
    ctx.fillStyle = level >= DARK_LEVEL ? '#7ad47a' : '#d45a5a';
    ctx.beginPath();
    ctx.arc((FX + d + 0.5) * S, (FY + 0.5) * S * YS, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffffaa';
    ctx.fillText(level.toFixed(2), (FX + d) * S - 4, (FY + 0.5) * S * YS + 14 + i * 0);
  }

  // The spec line.
  const L = lights[0];
  ctx.fillStyle = '#0e1116cc';
  ctx.fillRect(0, CELL_H - 18, CELL_W, 18);
  ctx.fillStyle = '#cfd4de';
  ctx.fillText(
    L
      ? `r ${L.r.toFixed(2)}  i ${L.intensity.toFixed(2)}${L.z !== undefined ? `  z ${L.z}` : ''}${L.occlude ? '  occlude' : ''}`
      : 'glow only (no light row)',
    6,
    CELL_H - 5,
  );
  ctx.restore();
}

function frame(): void {
  const t = performance.now() / 1000;
  ctx.fillStyle = '#14181f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = '12px ui-monospace, monospace';
  for (const [c, col] of COLS.entries()) {
    ctx.fillStyle = '#8b93a3';
    ctx.fillText(col.name, LABEL_W + c * (CELL_W + 8) + 4, 18);
  }
  for (const [r, row] of ROWS.entries()) {
    const py = 28 + r * (CELL_H + 8);
    ctx.fillStyle = '#cfd4de';
    ctx.fillText(row.name, 10, py + 16);
    for (const [c, col] of COLS.entries()) {
      drawCell(LABEL_W + c * (CELL_W + 8), py, row, col, t);
    }
  }
  requestAnimationFrame(frame);
}
frame();
