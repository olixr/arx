import { Detail, TILE_PX, TILE_SKIP, Tile, tileDef } from '@arx/shared';
import { BUILDABLES } from '@arx/content';
import { bakeChunk, bakeGutter } from '../render/terrain.js';
import { buildableIconUrl } from '../render/icons.js';
import { paintTree, treeModel } from '../render/trees.js';
import type { EditorState } from './state.js';
import { overlayKind, drawBlockTile } from './render.js';

/**
 * The tile palette: every paintable tile, grouped the way a builder
 * thinks, searchable, with REAL art thumbnails — ground materials come
 * off an actual chunk bake, standing props ride their build-panel
 * icons, trees are painted by the tree painter itself. Nothing here is
 * a bare color square unless the game truly has no art for it yet.
 */

export interface TileCategory {
  id: string;
  label: string;
  tiles: Tile[];
}

export const TILE_CATEGORIES: TileCategory[] = [
  {
    id: 'terrain',
    label: 'Terrain',
    tiles: [
      Tile.Grass, Tile.GrassTall, Tile.Dirt, Tile.Path, Tile.Sand, Tile.Snow,
      Tile.Swamp, Tile.Tilled, Tile.StoneFloor, Tile.WoodFloor, Tile.CaveFloor,
      Tile.CaveRubble, Tile.DungeonFloor, Tile.Bridge, Tile.Dock, Tile.Ramp, Tile.Cliff,
      Tile.Void, TILE_SKIP as Tile,
    ],
  },
  {
    id: 'water',
    label: 'Water',
    tiles: [Tile.WaterShallow, Tile.Water, Tile.WaterDeep, Tile.FishingSpot, Tile.PikeHole, Tile.EelRun, Tile.SalmonRun, Tile.GlimmerShoal],
  },
  {
    id: 'walls',
    label: 'Walls & Doors',
    tiles: [
      Tile.WallStone, Tile.WallStoneWindow, Tile.DoorwayStone, Tile.DoorwayStoneWide,
      Tile.DoorwayStoneShut, Tile.DoorwayStoneWideShut,
      Tile.WallStoneDiagNE, Tile.WallStoneDiagNW, Tile.WallStoneDiagSE, Tile.WallStoneDiagSW,
      Tile.WallWood, Tile.WallWoodWindow, Tile.DoorwayWood, Tile.DoorwayWoodWide,
      Tile.DoorwayWoodShut, Tile.DoorwayWoodWideShut,
      Tile.WallWoodDiagNE, Tile.WallWoodDiagNW, Tile.WallWoodDiagSE, Tile.WallWoodDiagSW,
      Tile.ArchStone, Tile.PillarStone, Tile.RailWood, Tile.Fence,
      Tile.CaveWall, Tile.CrackedCaveWall,
    ],
  },
  {
    id: 'garrison',
    label: 'Fortifications',
    tiles: [
      Tile.WallGarrison, Tile.GateGarrison, Tile.GateGarrisonShut,
      Tile.WallGarrisonDiagNE, Tile.WallGarrisonDiagNW,
      Tile.WallGarrisonDiagSE, Tile.WallGarrisonDiagSW,
    ],
  },
  {
    id: 'nature',
    label: 'Trees & Flora',
    tiles: [
      Tile.Tree, Tile.TreeOak, Tile.TreeWillow, Tile.TreeYew, Tile.TreePine,
      Tile.Sapling, Tile.SaplingOak, Tile.SaplingWillow, Tile.SaplingYew, Tile.SaplingPine,
      Tile.Stump, Tile.BerryBush, Tile.FibrePlant, Tile.WildSagewort,
      Tile.WildMoonbell, Tile.GlowShroom, Tile.Stalagmite, Tile.BonePile,
    ],
  },
  {
    id: 'rocks',
    label: 'Rocks & Ores',
    tiles: [
      Tile.Rock, Tile.RockDepleted, Tile.RockCopper, Tile.RockTin, Tile.RockIron,
      Tile.RockCoal, Tile.RockGold, Tile.RockSilver, Tile.RockMithril,
      Tile.RockAdamant, Tile.RockObsidian, Tile.RockStarfall,
    ],
  },
  {
    id: 'stations',
    label: 'Stations',
    tiles: [
      Tile.Campfire, Tile.Furnace, Tile.Anvil, Tile.Workbench, Tile.Alembic,
      Tile.TanningRack, Tile.Loom, Tile.CarvingBench, Tile.EnchantingTable,
      Tile.Sawhorse, Tile.BeastPen,
      Tile.BankChest, Tile.ShopCounter,
    ],
  },
  {
    id: 'furniture',
    label: 'Furniture & Props',
    tiles: [
      Tile.Table, Tile.Chair, Tile.Throne, Tile.Bench, Tile.Bed, Tile.Bookshelf, Tile.Cabinet,
      Tile.Counter, Tile.Hearth, Tile.Barrel, Tile.Crate, Tile.CrateGoods,
      Tile.MarketStall, Tile.BannerPole, Tile.HangingSign, Tile.Signpost, Tile.FlowerBox,
      Tile.ToolRack, Tile.WeaponRack, Tile.Vault, Tile.Lectern, Tile.Basin,
      Tile.LampPost, Tile.Brazier,
    ],
  },
  {
    id: 'chests',
    label: 'Chests',
    tiles: [
      Tile.ChestWood, Tile.ChestWoodOpen, Tile.ChestMossy, Tile.ChestMossyOpen,
      Tile.ChestIron, Tile.ChestIronOpen, Tile.ChestGilded, Tile.ChestGildedOpen,
      Tile.ChestBoss, Tile.ChestBossOpen,
    ],
  },
  {
    id: 'crops',
    label: 'Crops',
    tiles: [
      Tile.CropSprout, Tile.CarrotMid, Tile.CarrotRipe, Tile.SagewortMid,
      Tile.SagewortRipe, Tile.SunflowerMid, Tile.SunflowerRipe, Tile.WheatMid,
      Tile.WheatRipe, Tile.CottonMid, Tile.CottonRipe, Tile.MoonbellMid,
      Tile.MoonbellRipe,
    ],
  },
  {
    id: 'portals',
    label: 'Portals',
    tiles: [Tile.PortalDown, Tile.PortalUp],
  },
];

export const DETAILS: Array<{ d: Detail; label: string }> = [
  { d: Detail.None, label: 'erase detail' },
  { d: Detail.Flowers, label: 'flowers' },
  { d: Detail.Tuft, label: 'grass tuft' },
  { d: Detail.Pebbles, label: 'pebbles' },
  { d: Detail.Mushroom, label: 'mushroom' },
  { d: Detail.Rug, label: 'rug' },
  { d: Detail.RugRound, label: 'round rug' },
  { d: Detail.CarpetRoyal, label: 'royal carpet' },
  { d: Detail.CarpetMoon, label: 'moonpale carpet' },
  { d: Detail.BannerCrown, label: 'crown banner (on wall)' },
  { d: Detail.BannerMoon, label: 'moon banner (on wall)' },
  { d: Detail.Tapestry, label: 'tapestry (on wall)' },
  { d: Detail.Doormat, label: 'doormat' },
  { d: Detail.Sawdust, label: 'sawdust' },
  { d: Detail.Straw, label: 'straw' },
];

/** Palette display name — the transparency sentinel isn't a TileDef. */
export function paletteTileName(t: Tile): string {
  return (t as number) === TILE_SKIP ? 'transparent (keep ground)' : tileDef(t).name;
}

// -------------------------------------------------------- thumbnails

const THUMB = 44;

/** tile -> buildable id, for build-panel icon reuse. */
const BUILDABLE_OF = new Map<number, string>();
for (const [id, def] of BUILDABLES) {
  if (!BUILDABLE_OF.has(def.tile)) BUILDABLE_OF.set(def.tile, id);
}

/**
 * Real-art swatches for bake-painted tiles: every candidate gets a
 * 3x3 patch in a synthetic strip zone, one bakeChunk pass renders
 * them all, and each thumb is the crop of its center tile.
 */
function bakeStrip(entries: Array<{ ground: Tile; detail: Detail }>): HTMLCanvasElement[] {
  const cols = entries.length * 3;
  const patch = (tx: number, ty: number): { ground: number; detail: number } | null => {
    if (ty < 0 || ty >= 3 || tx < 0 || tx >= cols) return null;
    const k = Math.floor(tx / 3);
    const e = entries[k];
    if (!e) return null;
    const center = tx % 3 === 1 && ty === 1;
    return { ground: e.ground, detail: center ? e.detail : Detail.None };
  };
  const ground = (tx: number, ty: number): number | undefined =>
    patch(tx, ty)?.ground ?? undefined;
  const detail = (tx: number, ty: number): number => patch(tx, ty)?.detail ?? Detail.None;
  const elev = (): number => 0;

  const G = bakeGutter(TILE_PX);
  const out: HTMLCanvasElement[] = [];
  const chunksNeeded = Math.ceil(cols / 32);
  const bakes: HTMLCanvasElement[] = [];
  for (let c = 0; c < chunksNeeded; c++) bakes.push(bakeChunk(ground, detail, elev, c, 0, TILE_PX));
  for (let k = 0; k < entries.length; k++) {
    const tx = k * 3 + 1;
    const c = Math.floor(tx / 32);
    const canvas = document.createElement('canvas');
    canvas.width = THUMB;
    canvas.height = THUMB;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(
      bakes[c]!,
      G + (tx - c * 32) * TILE_PX,
      G + 1 * TILE_PX,
      TILE_PX,
      TILE_PX,
      0,
      0,
      THUMB,
      THUMB,
    );
    out.push(canvas);
  }
  return out;
}

/**
 * Ground swatches every standing-tile thumb sits on: real baked art,
 * chosen to match where the prop naturally lives. One strip bake
 * serves the whole palette.
 */
type ThumbGround = 'grass' | 'wood' | 'stone' | 'cave';
let thumbGrounds: Record<ThumbGround, HTMLCanvasElement> | null = null;

function groundSwatches(): Record<ThumbGround, HTMLCanvasElement> {
  if (thumbGrounds) return thumbGrounds;
  const strip = bakeStrip([
    { ground: Tile.Grass, detail: Detail.None },
    { ground: Tile.WoodFloor, detail: Detail.None },
    { ground: Tile.StoneFloor, detail: Detail.None },
    { ground: Tile.CaveFloor, detail: Detail.None },
  ]);
  thumbGrounds = { grass: strip[0]!, wood: strip[1]!, stone: strip[2]!, cave: strip[3]! };
  return thumbGrounds;
}

const CAVE_TILES = new Set<Tile>([
  Tile.CaveWall, Tile.CrackedCaveWall, Tile.Stalagmite, Tile.BonePile,
  Tile.Brazier, Tile.GlowShroom,
]);
const WOOD_GROUND_TILES = new Set<Tile>([
  Tile.Table, Tile.Chair, Tile.Throne, Tile.Bench, Tile.Bed, Tile.Bookshelf, Tile.Cabinet,
  Tile.Counter, Tile.Hearth, Tile.Barrel, Tile.Crate, Tile.CrateGoods,
  Tile.ToolRack, Tile.WeaponRack, Tile.Lectern, Tile.Vault,
]);
const STONE_GROUND_TILES = new Set<Tile>([
  Tile.WallStone, Tile.WallStoneWindow, Tile.PillarStone, Tile.ArchStone,
  Tile.ChestIron, Tile.ChestIronOpen, Tile.ChestGilded, Tile.ChestGildedOpen,
  Tile.ChestBoss, Tile.ChestBossOpen, Tile.Anvil, Tile.Furnace,
]);

function thumbGroundFor(tile: Tile): HTMLCanvasElement {
  const g = groundSwatches();
  if (CAVE_TILES.has(tile)) return g.cave;
  if (WOOD_GROUND_TILES.has(tile)) return g.wood;
  if (STONE_GROUND_TILES.has(tile)) return g.stone;
  return g.grass;
}

function treeThumb(tile: Tile, grow: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = THUMB;
  canvas.height = THUMB;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(groundSwatches().grass, 0, 0);
  const s = THUMB / 3.4;
  paintTree(ctx, treeModel(tile, 3), {
    bx: THUMB / 2,
    groundY: THUMB - 3,
    s,
    syT: s * 0.5,
    wx: 3,
    wy: 5,
    tSec: 0,
    windOverride: 0,
    grow,
  });
  return canvas;
}

/** A standing tile drawn on its natural baked ground. */
function blockThumb(tile: Tile): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = THUMB;
  canvas.height = THUMB;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(thumbGroundFor(tile), 0, 0);
  drawBlockTile(ctx, 7, 13, THUMB - 14, tile);
  return canvas;
}

const TREE_THUMBS = new Map<Tile, { tile: Tile; grow: number }>([
  [Tile.Tree, { tile: Tile.Tree, grow: 1 }],
  [Tile.TreeOak, { tile: Tile.TreeOak, grow: 1 }],
  [Tile.TreeWillow, { tile: Tile.TreeWillow, grow: 1 }],
  [Tile.TreeYew, { tile: Tile.TreeYew, grow: 1 }],
  [Tile.TreePine, { tile: Tile.TreePine, grow: 1 }],
  [Tile.Sapling, { tile: Tile.Tree, grow: 0.45 }],
  [Tile.SaplingOak, { tile: Tile.TreeOak, grow: 0.45 }],
  [Tile.SaplingWillow, { tile: Tile.TreeWillow, grow: 0.45 }],
  [Tile.SaplingYew, { tile: Tile.TreeYew, grow: 0.45 }],
  [Tile.SaplingPine, { tile: Tile.TreePine, grow: 0.45 }],
]);

/**
 * Canvas → <img>. Swatches are cloned on every palette rebuild, and a
 * cloned canvas is a BLANK canvas (the bitmap never copies) — images
 * carry their src through cloneNode, so thumbs live as data URLs.
 */
function asImg(canvas: HTMLCanvasElement): HTMLImageElement {
  const img = document.createElement('img');
  img.src = canvas.toDataURL();
  img.width = THUMB;
  img.height = THUMB;
  return img;
}

/** The transparency swatch: a checkerboard — nothing painted here. */
function checkerThumb(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = THUMB;
  canvas.height = THUMB;
  const ctx = canvas.getContext('2d')!;
  const cell = THUMB / 6;
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 6; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#3a3244' : '#262031';
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  ctx.strokeStyle = '#57506b';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, THUMB - 2, THUMB - 2);
  return canvas;
}

/** Build (once) every tile thumbnail as a DOM element. */
export function buildThumbs(): Map<Tile, HTMLElement> {
  const thumbs = new Map<Tile, HTMLElement>();
  const allTiles = TILE_CATEGORIES.flatMap((c) => c.tiles);

  // The sentinel first — it must never reach the chunk bake.
  thumbs.set(TILE_SKIP as Tile, asImg(checkerThumb()));

  // Which tiles ride the ground bake for their look.
  const bakeable = allTiles.filter(
    (t) => !thumbs.has(t) && overlayKind(t) === 'none' && !TREE_THUMBS.has(t),
  );
  const baked = bakeStrip(bakeable.map((t) => ({ ground: t, detail: Detail.None })));
  bakeable.forEach((t, i) => thumbs.set(t, asImg(baked[i]!)));

  for (const t of allTiles) {
    if (thumbs.has(t)) continue;
    const tree = TREE_THUMBS.get(t);
    if (tree) {
      thumbs.set(t, asImg(treeThumb(tree.tile, tree.grow)));
      continue;
    }
    const buildable = BUILDABLE_OF.get(t);
    const iconUrl = buildable ? buildableIconUrl(buildable, THUMB) : null;
    if (iconUrl) {
      const img = document.createElement('img');
      img.src = iconUrl;
      img.width = THUMB;
      img.height = THUMB;
      img.style.background = '#2a2133';
      thumbs.set(t, img);
      continue;
    }
    thumbs.set(t, asImg(blockThumb(t)));
  }
  return thumbs;
}

/** Detail-layer thumbnails off the same bake path (grass underlay). */
export function buildDetailThumbs(): Map<Detail, HTMLElement> {
  const grounds = DETAILS.map((e) => ({
    ground: e.d === Detail.Sawdust || e.d === Detail.Straw || e.d === Detail.Rug ||
      e.d === Detail.RugRound || e.d === Detail.Doormat
      ? Tile.WoodFloor
      : e.d === Detail.CarpetRoyal || e.d === Detail.CarpetMoon
        ? Tile.StoneFloor
        : e.d === Detail.BannerCrown || e.d === Detail.BannerMoon || e.d === Detail.Tapestry
          ? Tile.WallStone
          : Tile.Grass,
    detail: e.d,
  }));
  const baked = bakeStrip(grounds);
  const out = new Map<Detail, HTMLElement>();
  DETAILS.forEach((e, i) => out.set(e.d, asImg(baked[i]!)));
  return out;
}

// -------------------------------------------------------- palette DOM

export interface PaletteHooks {
  onPickTile: (t: Tile) => void;
  onPickDetail: (d: Detail) => void;
}

export class PaletteUI {
  private readonly thumbs = buildThumbs();
  private readonly detailThumbs = buildDetailThumbs();
  private activeCat = 'terrain';
  private query = '';
  private readonly recents: Tile[] = [];

  constructor(
    private readonly root: HTMLElement,
    private readonly state: EditorState,
    private readonly hooks: PaletteHooks,
  ) {
    this.rebuild();
  }

  noteUse(t: Tile): void {
    const i = this.recents.indexOf(t);
    if (i !== -1) this.recents.splice(i, 1);
    this.recents.unshift(t);
    if (this.recents.length > 10) this.recents.pop();
    this.rebuild();
  }

  rebuild(): void {
    const root = this.root;
    root.innerHTML = '';

    // Search box.
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Search tiles…  (/)';
    search.className = 'pal-search';
    search.value = this.query;
    search.id = 'pal-search';
    search.oninput = () => {
      this.query = search.value;
      this.rebuildGrid(grid);
      this.rebuildTabs(tabs);
    };
    root.appendChild(search);

    // Category tabs.
    const tabs = document.createElement('div');
    tabs.className = 'pal-tabs';
    this.rebuildTabs(tabs);
    root.appendChild(tabs);

    // Swatch grid.
    const grid = document.createElement('div');
    grid.className = 'pal-grid';
    this.rebuildGrid(grid);
    root.appendChild(grid);
  }

  private rebuildTabs(tabs: HTMLElement): void {
    tabs.innerHTML = '';
    if (this.query.trim()) return;
    for (const cat of [...TILE_CATEGORIES, { id: 'details', label: 'Details', tiles: [] }]) {
      const b = document.createElement('button');
      b.className = 'pal-tab' + (cat.id === this.activeCat ? ' active' : '');
      b.textContent = cat.label;
      b.onclick = () => {
        this.activeCat = cat.id;
        this.rebuild();
      };
      tabs.appendChild(b);
    }
  }

  private swatch(
    thumb: HTMLElement,
    name: string,
    selected: boolean,
    onPick: () => void,
  ): HTMLElement {
    const el = document.createElement('button');
    el.className = 'pal-swatch' + (selected ? ' selected' : '');
    el.title = name;
    const pic = thumb.cloneNode(true) as HTMLElement;
    pic.classList.add('pal-thumb');
    el.appendChild(pic);
    const label = document.createElement('span');
    label.textContent = name;
    el.appendChild(label);
    el.onclick = onPick;
    return el;
  }

  private rebuildGrid(grid: HTMLElement): void {
    grid.innerHTML = '';
    const q = this.query.trim().toLowerCase();

    if (q) {
      for (const cat of TILE_CATEGORIES) {
        for (const t of cat.tiles) {
          const name = paletteTileName(t);
          if (!name.toLowerCase().includes(q)) continue;
          grid.appendChild(
            this.swatch(
              this.thumbs.get(t)!,
              name,
              this.state.layer === 'ground' && this.state.brushTile === t,
              () => this.hooks.onPickTile(t),
            ),
          );
        }
      }
      for (const e of DETAILS) {
        if (!e.label.toLowerCase().includes(q)) continue;
        grid.appendChild(
          this.swatch(
            this.detailThumbs.get(e.d)!,
            e.label,
            this.state.layer === 'detail' && this.state.brushDetail === e.d,
            () => this.hooks.onPickDetail(e.d),
          ),
        );
      }
      return;
    }

    if (this.recents.length > 0 && this.activeCat !== 'details') {
      const head = document.createElement('div');
      head.className = 'pal-head';
      head.textContent = 'Recent';
      grid.appendChild(head);
      for (const t of this.recents) {
        grid.appendChild(
          this.swatch(
            this.thumbs.get(t)!,
            paletteTileName(t),
            this.state.layer === 'ground' && this.state.brushTile === t,
            () => this.hooks.onPickTile(t),
          ),
        );
      }
      const rule = document.createElement('div');
      rule.className = 'pal-rule';
      grid.appendChild(rule);
    }

    if (this.activeCat === 'details') {
      for (const e of DETAILS) {
        grid.appendChild(
          this.swatch(
            this.detailThumbs.get(e.d)!,
            e.label,
            this.state.layer === 'detail' && this.state.brushDetail === e.d,
            () => this.hooks.onPickDetail(e.d),
          ),
        );
      }
      return;
    }

    const cat = TILE_CATEGORIES.find((c) => c.id === this.activeCat) ?? TILE_CATEGORIES[0]!;
    for (const t of cat.tiles) {
      grid.appendChild(
        this.swatch(
          this.thumbs.get(t)!,
          paletteTileName(t),
          this.state.layer === 'ground' && this.state.brushTile === t,
          () => this.hooks.onPickTile(t),
        ),
      );
    }
  }
}
