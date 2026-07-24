import { Detail, Tile } from '@devcraft/shared';
import type { ZoneDef } from '@devcraft/content';

/** The editor's document + tool state. Plain and observable. */

export type ToolId =
  | 'paint'
  | 'erase'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'fill'
  | 'road'
  | 'select'
  | 'picker'
  | 'spawn';

export type LayerId = 'ground' | 'detail' | 'elev';

export interface Selection {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface ClipBuf {
  w: number;
  h: number;
  ground: Uint16Array;
  detail: Uint16Array;
  elev: Int8Array;
}

export function newZone(id = 'myzone', name = 'My Zone', width = 96, height = 96): ZoneDef {
  return {
    id,
    name,
    origin: { x: 0, y: 0 },
    width,
    height,
    ground: new Uint16Array(width * height).fill(Tile.Grass),
    detail: new Uint16Array(width * height),
    elev: new Int8Array(width * height),
    spawn: undefined,
    portals: [],
    spawns: [],
    actorSpawns: [],
  };
}

export class EditorState {
  zone: ZoneDef = newZone();
  dirty = false;
  /** True once the open zone came from (or was saved to) the server. */
  serverBacked = false;

  tool: ToolId = 'paint';
  layer: LayerId = 'ground';
  brushTile: Tile = Tile.Grass;
  brushDetail: Detail = Detail.Flowers;
  elevLevel = 1;
  brushSize = 1;
  brushShape: 'round' | 'square' = 'round';
  /** Rect/ellipse tools: filled or outline. */
  shapeFill = true;
  roadWidth = 3;
  selection: Selection | null = null;
  clip: ClipBuf | null = null;
  hover: { x: number; y: number } | null = null;

  private readonly listeners = new Set<() => void>();

  onChange(fn: () => void): void {
    this.listeners.add(fn);
  }

  changed(): void {
    for (const fn of this.listeners) fn();
  }

  /** Normalize an incoming zone so the editor's invariants hold. */
  adopt(zone: ZoneDef, opts: { serverBacked: boolean }): void {
    if (!zone.elev) zone.elev = new Int8Array(zone.width * zone.height);
    zone.portals ??= [];
    zone.spawns ??= [];
    zone.actorSpawns ??= [];
    this.zone = zone;
    this.dirty = false;
    this.serverBacked = opts.serverBacked;
    this.selection = null;
    this.changed();
  }
}
