import { Detail, Tile } from '@devcraft/shared';
import type { PrefabDef, ZoneDef } from '@devcraft/content';

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
  | 'structure'
  | 'prefab'
  | 'portal'
  | 'cluster'
  | 'actor'
  | 'spawn';

/** Which sidebar tab is showing. */
export type SidebarTab = 'tiles' | 'structures' | 'placements';

export type PlacementKind = 'portal' | 'cluster' | 'actor' | 'spawn';

/** A handle to one placement in the zone (spawn point uses index 0). */
export interface PlacementRef {
  kind: PlacementKind;
  index: number;
}

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

  /** Sidebar tab; placement/structure tools auto-switch it. */
  tab: SidebarTab = 'tiles';
  /** Armed structure template id (structure tool). */
  armedTemplate: string | null = null;
  /** Armed prefab (prefab tool) — fetched def, ready to stamp. */
  armedPrefab: PrefabDef | null = null;
  /** Mirror the armed stamp east-west (X key). */
  stampFlip = false;
  /** The selected placement, if any — inspector target. */
  selected: PlacementRef | null = null;
  /** Placement under the cursor (hover affordance). */
  hoverPlacement: PlacementRef | null = null;

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
    this.selected = null;
    this.hoverPlacement = null;
    this.armedPrefab = null;
    this.armedTemplate = null;
    this.changed();
  }
}
