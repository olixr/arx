import { Detail, Tile, tileDef } from '@arx/shared';
import {
  NPCS,
  NPC_ACTORS,
  ROUTINES,
  STRUCTURE_TEMPLATES,
  buildDawnmead,
  flipTemplate,
  prefabFromJson,
  prefabToJson,
  templateHeight,
  templateWidth,
  validatePrefab,
  zoneFromJson,
  zoneToJson,
  type PrefabDef,
  type StructureTemplate,
  type ZoneDef,
  type ZoneJson,
} from '@arx/content';
import {
  deletePrefab,
  deleteZone,
  fetchPrefab,
  fetchRegistry,
  fetchZone,
  listMaps,
  listPrefabs,
  savePrefab,
  saveZone,
  type MapListEntry,
  type PrefabListEntry,
  type RegistrySnapshot,
} from './api.js';
import { iconImg } from './editorIcons.js';
import { History, StrokeRecorder, cloneZone } from './history.js';
import { PaletteUI } from './palette.js';
import { buildPlacementsPanel, buildStructuresPanel, type PanelDeps } from './panels.js';
import { drawPreviewPins, prefabLayers, renderLayersPreview } from './preview.js';
import {
  clusterEdgeAt,
  deletePlacement,
  movePlacement,
  placementAt,
  placementPos,
  sameRef,
} from './placements.js';
import { EditorView, GHOST_SKIP } from './render.js';
import {
  EditorState,
  newZone,
  type LayerId,
  type PlacementRef,
  type SidebarTab,
  type ToolId,
} from './state.js';
import {
  ellipseCells,
  floodCells,
  footprint,
  rectCells,
  roadCells,
  thickLine,
  type Pt,
} from './tools.js';
import { validateZone } from './validate.js';
import { WorldMode } from './world/worldMode.js';
import type { WorldTool } from './world/worldState.js';

/**
 * Arx Map Studio — the world and its zones in one studio. The
 * WORLD view is the home screen: the whole plan (zones, roads,
 * landmarks, hearths, the frontier ledger) rendered through the real
 * worldgen and edited in place. The ZONE view is the tile editor,
 * reached by stepping into any zone from the world. Saves hot-swap
 * into the running server mid-session; local import/export still
 * works when the server is down.
 */

// The DOM wakes in zone dress; boot flips to the world home screen
// (setMode no-ops on a same-mode call, so the start value must be
// the one the HTML shows).
type StudioMode = 'world' | 'zone';
let mode: StudioMode = 'zone';

const canvas = document.getElementById('editor-canvas') as HTMLCanvasElement;
const state = new EditorState();
const view = new EditorView(canvas, state);
const history = new History();
let palette: PaletteUI;
/** The zone view was framed while hidden — re-fit on first reveal. */
let pendingZoneFit = false;

/** Live pick lists — served by the running game, content as fallback. */
let registry: RegistrySnapshot = {
  npcs: [...NPCS.values()].map((d) => ({ id: d.id, name: d.name, level: d.level })),
  actors: [...NPC_ACTORS.values()].map((a) => ({
    id: a.id,
    name: a.name,
    ...(a.title ? { title: a.title } : {}),
  })),
  routines: [...ROUTINES.keys()],
};
let prefabList: PrefabListEntry[] = [];
let prefabsOnline = false;

/** Real-art prefab card previews, rendered lazily off the fetched def. */
const prefabPreviews = new Map<string, HTMLCanvasElement>();
const prefabPreviewPending = new Set<string>();

function prefabPreviewFor(id: string): HTMLCanvasElement | null {
  const hit = prefabPreviews.get(id);
  if (hit) return hit;
  if (!prefabPreviewPending.has(id)) {
    prefabPreviewPending.add(id);
    void fetchPrefab(id)
      .then((json) => {
        const def = prefabFromJson(json);
        const layers = prefabLayers(def);
        const canvas = renderLayersPreview(layers, 150);
        drawPreviewPins(canvas, layers, [
          ...def.spawns.map((s) => ({ dx: s.dx, dy: s.dy, color: '#d4544a' })),
          ...def.actorSpawns.map((a) => ({ dx: a.dx, dy: a.dy, color: '#5fc9c4' })),
          ...def.portals.map((p) => ({ dx: p.dx, dy: p.dy, color: '#b48fe8' })),
        ], 150);
        prefabPreviews.set(id, canvas);
        prefabPreviewPending.delete(id);
        state.changed();
      })
      .catch(() => prefabPreviewPending.delete(id));
  }
  return null;
}

/** Put an armed structure/prefab stamp away without placing it. */
function disarmStamp(quiet = false): boolean {
  if (state.armedTemplate === null && state.armedPrefab === null) return false;
  state.armedTemplate = null;
  state.armedPrefab = null;
  view.ghost = null;
  state.changed();
  if (!quiet) toast('stamp put away');
  return true;
}

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

// ----------------------------------------------------------- helpers

const idx = (x: number, y: number): number => y * state.zone.width + x;
const inBounds = (x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < state.zone.width && y < state.zone.height;

function toast(text: string, ms = 2600, kind: 'info' | 'success' | 'error' = 'info'): void {
  const el = $('toast');
  el.textContent = text;
  el.className = `show ${kind}`;
  window.clearTimeout((toast as { t?: number }).t);
  (toast as { t?: number }).t = window.setTimeout(() => el.classList.remove('show'), ms);
}

function markDirtyCells(pts: Pt[]): void {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  if (x0 <= x1) view.markDirty(x0, y0, x1, y1);
}

/** Apply the active brush value to one cell through a recorder. */
function applyBrush(rec: StrokeRecorder, x: number, y: number, erase: boolean): void {
  if (!inBounds(x, y)) return;
  const i = idx(x, y);
  const z = state.zone;
  const c = rec.record(i, z.ground[i]!, z.detail[i]!, z.elev![i]!);
  if (state.layer === 'ground') {
    c.g1 = erase ? Tile.Grass : state.brushTile;
    z.ground[i] = c.g1;
  } else if (state.layer === 'detail') {
    c.d1 = erase ? Detail.None : state.brushDetail;
    z.detail[i] = c.d1;
  } else {
    c.e1 = erase ? 0 : Math.max(-2, Math.min(3, state.elevLevel));
    z.elev![i] = c.e1;
  }
}

function commitStroke(rec: StrokeRecorder, label: string, pts: Pt[]): void {
  const op = rec.finish(label);
  if (!op) return;
  history.push(op);
  state.dirty = true;
  markDirtyCells(pts);
  state.changed();
}

/** One-shot cell application (fill, shapes, road). */
function applyCellsOp(label: string, pts: Pt[], erase = false): void {
  const rec = new StrokeRecorder();
  for (const p of pts) applyBrush(rec, p.x, p.y, erase);
  commitStroke(rec, label, pts);
}

/**
 * Structural zone op (resize, origin, placements): full snapshots.
 * Placement-only edits pass tiles:false and skip the ground rebake.
 */
function zoneOp(label: string, mutate: (z: ZoneDef) => void, opts?: { tiles?: boolean }): void {
  const before = cloneZone(state.zone);
  mutate(state.zone);
  history.push({ kind: 'zone', label, before, after: cloneZone(state.zone) });
  state.dirty = true;
  if (opts?.tiles !== false) view.markAllDirty();
  state.changed();
}

/**
 * Drag-spanning zone op: snapshot at gesture start, mutate freely
 * while the pointer moves, commit one undo entry on release.
 */
let pendingZoneBefore: ZoneDef | null = null;
function beginZoneGesture(): void {
  pendingZoneBefore = cloneZone(state.zone);
}
function endZoneGesture(label: string, opts?: { tiles?: boolean }): void {
  if (!pendingZoneBefore) return;
  history.push({
    kind: 'zone',
    label,
    before: pendingZoneBefore,
    after: cloneZone(state.zone),
  });
  pendingZoneBefore = null;
  state.dirty = true;
  if (opts?.tiles !== false) view.markAllDirty();
  state.changed();
}

function undoRedo(dir: 'undo' | 'redo'): void {
  const res = dir === 'undo' ? history.undo(state.zone) : history.redo(state.zone);
  if (!res) {
    toast(`nothing to ${dir}`);
    return;
  }
  if (res.zone !== state.zone) {
    state.zone = res.zone;
    view.markAllDirty();
  } else {
    view.markAllDirty(); // cell ops know their rect, but cheap & safe
  }
  state.dirty = true;
  state.changed();
  toast(`${dir}: ${res.label}`);
}

// ----------------------------------------------------------- pointer

type Drag =
  | { kind: 'none' }
  | { kind: 'pan'; lastX: number; lastY: number }
  | { kind: 'stroke'; rec: StrokeRecorder; erase: boolean; last: Pt; pts: Pt[] }
  | { kind: 'shape'; anchor: Pt; cur: Pt; erase: boolean }
  | { kind: 'marquee'; anchor: Pt; cur: Pt }
  | { kind: 'movesel'; from: Pt; cur: Pt; copy: boolean }
  | { kind: 'placeMove'; ref: PlacementRef; label: string; moved: boolean }
  | { kind: 'clusterSize'; index: number };

let drag: Drag = { kind: 'none' };
let roadPts: Pt[] = [];
let spaceHeld = false;
let pasteArmed = false;

// -------------------------------------------------------- placements

const PLACEMENT_TOOLS: ReadonlySet<ToolId> = new Set([
  'portal',
  'cluster',
  'actor',
  'sign',
  'spawn',
]);

function selectPlacement(ref: PlacementRef | null): void {
  state.selected = ref;
  if (ref) state.tab = 'placements';
  state.changed();
}

function focusPlacement(ref: PlacementRef): void {
  const pos = placementPos(state.zone, ref);
  if (pos) view.centerOn(pos.x, pos.y);
}

function removePlacementRef(ref: PlacementRef): void {
  const label = `remove ${ref.kind}`;
  zoneOp(
    label,
    (z) => {
      if (ref.kind === 'sign') {
        // The board leaves with its words — the pair is the unit.
        const g = z.signs?.[ref.index];
        if (g) {
          const lx = g.x - z.origin.x;
          const ly = g.y - z.origin.y;
          if (lx >= 0 && ly >= 0 && lx < z.width && ly < z.height) {
            z.ground[ly * z.width + lx] = Tile.Grass;
          }
        }
      }
      if (ref.kind === 'portal') {
        // The entrance tile leaves with its portal.
        const p = z.portals?.[ref.index];
        if (p) {
          const lx = p.x - z.origin.x;
          const ly = p.y - z.origin.y;
          if (lx >= 0 && ly >= 0 && lx < z.width && ly < z.height) {
            z.ground[ly * z.width + lx] = Tile.Grass;
          }
        }
      }
      deletePlacement(z, ref);
    },
    { tiles: ref.kind === 'portal' },
  );
  state.selected = null;
  state.changed();
  toast(`${label}d`);
}

/** Portal markers carry their entrance tile: moving one swaps tiles. */
function carryPlacementTile(z: ZoneDef, fromW: Pt, toW: Pt): void {
  const li = (w: Pt): number | null => {
    const lx = w.x - z.origin.x;
    const ly = w.y - z.origin.y;
    return lx >= 0 && ly >= 0 && lx < z.width && ly < z.height ? ly * z.width + lx : null;
  };
  const a = li(fromW);
  const b = li(toW);
  if (a === null || b === null || a === b) return;
  const t = z.ground[a]!;
  z.ground[a] = z.ground[b]!;
  z.ground[b] = t;
  view.markDirty(fromW.x - z.origin.x, fromW.y - z.origin.y, fromW.x - z.origin.x, fromW.y - z.origin.y);
  view.markDirty(toW.x - z.origin.x, toW.y - z.origin.y, toW.x - z.origin.x, toW.y - z.origin.y);
}

/** Create the active placement tool's object at a local tile. */
function createPlacementAt(t: Pt): PlacementRef | null {
  const z = state.zone;
  if (!inBounds(t.x, t.y)) return null;
  const wx = z.origin.x + t.x;
  const wy = z.origin.y + t.y;
  switch (state.tool) {
    case 'portal': {
      z.portals ??= [];
      z.portals.push({ x: wx, y: wy, dest: { x: z.origin.x, y: z.origin.y } });
      const i = t.y * z.width + t.x;
      z.ground[i] = Tile.PortalDown;
      view.markDirty(t.x, t.y, t.x, t.y);
      return { kind: 'portal', index: z.portals.length - 1 };
    }
    case 'cluster': {
      z.spawns ??= [];
      const npc = registry.npcs[0]?.id ?? 'goblin';
      z.spawns.push({ npc, x: wx, y: wy, radius: 4, count: 3 });
      return { kind: 'cluster', index: z.spawns.length - 1 };
    }
    case 'actor': {
      z.actorSpawns ??= [];
      const actor = registry.actors[0]?.id;
      if (!actor) {
        toast('no actors in the registry — is the server running?', 3600);
        return null;
      }
      z.actorSpawns.push({ actor, x: wx, y: wy });
      return { kind: 'actor', index: z.actorSpawns.length - 1 };
    }
    case 'sign': {
      // Board AND words in one act: a sign tile with no record is a
      // blank plank the zone build refuses, so the tool never makes
      // one half of the pair.
      z.signs ??= [];
      z.signs.push({ x: wx, y: wy, title: 'NEW SIGN' });
      const i = t.y * z.width + t.x;
      z.ground[i] = Tile.Signpost;
      view.markDirty(t.x, t.y, t.x, t.y);
      return { kind: 'sign', index: z.signs.length - 1 };
    }
    case 'spawn': {
      z.spawn = { x: wx + 0.5, y: wy + 0.5 };
      return { kind: 'spawn', index: 0 };
    }
    default:
      return null;
  }
}

// ------------------------------------------------------------ stamps

function armedTemplateDef(): StructureTemplate | null {
  const tpl = STRUCTURE_TEMPLATES.find((t) => t.id === state.armedTemplate) ?? null;
  return tpl && state.stampFlip ? flipTemplate(tpl) : tpl;
}

function templateGhost(t: Pt): void {
  const tpl = armedTemplateDef();
  if (!tpl) {
    view.ghost = null;
    return;
  }
  const w = templateWidth(tpl);
  const h = templateHeight(tpl);
  const ground = new Uint16Array(w * h).fill(GHOST_SKIP);
  const detail = new Uint16Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = tpl.rows[y]!;
    for (let x = 0; x < w; x++) {
      const cell = row[x] === ' ' ? undefined : tpl.legend[row[x]!];
      if (!cell) continue;
      if (cell.tile !== undefined) ground[y * w + x] = cell.tile;
      else ground[y * w + x] = GHOST_SKIP;
      if (cell.detail !== undefined) detail[y * w + x] = cell.detail;
    }
  }
  view.ghost = { w, h, ground, detail, at: { x: t.x - (w >> 1), y: t.y - (h >> 1) } };
}

function stampTemplateAt(t: Pt): void {
  const tpl = armedTemplateDef();
  if (!tpl) {
    toast('pick a structure template first (Structures tab)');
    return;
  }
  const w = templateWidth(tpl);
  const h = templateHeight(tpl);
  const at = { x: t.x - (w >> 1), y: t.y - (h >> 1) };
  const rec = new StrokeRecorder();
  const pts: Pt[] = [];
  const z = state.zone;
  for (let y = 0; y < h; y++) {
    const row = tpl.rows[y]!;
    for (let x = 0; x < w; x++) {
      const cell = row[x] === ' ' ? undefined : tpl.legend[row[x]!];
      if (!cell) continue;
      const lx = at.x + x;
      const ly = at.y + y;
      if (!inBounds(lx, ly)) continue;
      const i = idx(lx, ly);
      const c = rec.record(i, z.ground[i]!, z.detail[i]!, z.elev![i]!);
      if (cell.tile !== undefined) {
        c.g1 = cell.tile;
        z.ground[i] = c.g1;
      }
      if (cell.detail !== undefined) {
        c.d1 = cell.detail;
        z.detail[i] = c.d1;
      }
      pts.push({ x: lx, y: ly });
    }
  }
  commitStroke(rec, `stamp ${tpl.meta?.label ?? tpl.id}`, pts);
  toast(`stamped ${tpl.meta?.label ?? tpl.id}${state.stampFlip ? ' (mirrored)' : ''}`);
}

function prefabGhost(t: Pt): void {
  const p = state.armedPrefab;
  if (!p) {
    view.ghost = null;
    return;
  }
  const pins = [
    ...p.spawns.map((s) => ({ dx: s.dx, dy: s.dy, color: '#d4544a' })),
    ...p.actorSpawns.map((a) => ({ dx: a.dx, dy: a.dy, color: '#5fc9c4' })),
    ...p.portals.map((pt) => ({ dx: pt.dx, dy: pt.dy, color: '#b48fe8' })),
  ];
  view.ghost = {
    w: p.width,
    h: p.height,
    ground: p.ground,
    detail: p.detail,
    at: { x: t.x - (p.width >> 1), y: t.y - (p.height >> 1) },
    pins,
  };
}

function stampPrefabAt(t: Pt): void {
  const p = state.armedPrefab;
  if (!p) {
    toast('arm a prefab first (Structures tab)');
    return;
  }
  const at = { x: t.x - (p.width >> 1), y: t.y - (p.height >> 1) };
  zoneOp(`stamp prefab ${p.name}`, (z) => {
    for (let y = 0; y < p.height; y++) {
      for (let x = 0; x < p.width; x++) {
        const lx = at.x + x;
        const ly = at.y + y;
        if (lx < 0 || ly < 0 || lx >= z.width || ly >= z.height) continue;
        const i = ly * z.width + lx;
        z.ground[i] = p.ground[y * p.width + x]!;
        z.detail[i] = p.detail[y * p.width + x]!;
        z.elev![i] = p.elev[y * p.width + x]!;
      }
    }
    const inZone = (dx: number, dy: number): boolean => {
      const lx = at.x + dx;
      const ly = at.y + dy;
      return lx >= 0 && ly >= 0 && lx < z.width && ly < z.height;
    };
    z.portals ??= [];
    z.spawns ??= [];
    z.actorSpawns ??= [];
    for (const pt of p.portals) {
      if (!inZone(pt.dx, pt.dy)) continue;
      z.portals.push({
        x: z.origin.x + at.x + pt.dx,
        y: z.origin.y + at.y + pt.dy,
        ...(pt.delve ? { delve: true } : { dest: pt.dest ?? { x: z.origin.x, y: z.origin.y } }),
      });
    }
    for (const s of p.spawns) {
      if (!inZone(s.dx, s.dy)) continue;
      z.spawns.push({
        npc: s.npc,
        x: z.origin.x + at.x + s.dx,
        y: z.origin.y + at.y + s.dy,
        radius: s.radius,
        count: s.count,
        ...(s.level !== undefined ? { level: s.level } : {}),
        ...(s.name !== undefined ? { name: s.name } : {}),
      });
    }
    for (const a of p.actorSpawns) {
      if (!inZone(a.dx, a.dy)) continue;
      z.actorSpawns.push({
        actor: a.actor,
        x: z.origin.x + at.x + a.dx,
        y: z.origin.y + at.y + a.dy,
        ...(a.dir !== undefined ? { dir: a.dir } : {}),
        ...(a.routine !== undefined ? { routine: a.routine } : {}),
      });
    }
  });
  const dropped = p.spawns.length + p.actorSpawns.length + p.portals.length;
  toast(`stamped '${p.name}'${dropped > 0 ? ` with ${dropped} placement${dropped > 1 ? 's' : ''}` : ''}`);
}

function setPreview(pts: Pt[], erase: boolean): void {
  const indices = new Set<number>();
  for (const p of pts) if (inBounds(p.x, p.y)) indices.add(idx(p.x, p.y));
  view.preview = {
    indices,
    color: erase
      ? 'rgba(212, 84, 74, 0.35)'
      : state.layer === 'ground'
        ? `${'rgba(232, 223, 200, 0.30)'}`
        : 'rgba(140, 210, 240, 0.30)',
  };
}

function shapeCells(d: { anchor: Pt; cur: Pt }, shift: boolean): Pt[] {
  let { x: x1, y: y1 } = d.cur;
  if (shift) {
    // Square/circle constraint.
    const dx = x1 - d.anchor.x;
    const dy = y1 - d.anchor.y;
    const m = Math.max(Math.abs(dx), Math.abs(dy));
    x1 = d.anchor.x + Math.sign(dx || 1) * m;
    y1 = d.anchor.y + Math.sign(dy || 1) * m;
  }
  if (state.tool === 'rect') return rectCells(d.anchor.x, d.anchor.y, x1, y1, state.shapeFill);
  if (state.tool === 'ellipse')
    return ellipseCells(d.anchor.x, d.anchor.y, x1, y1, state.shapeFill);
  return thickLine(d.anchor.x, d.anchor.y, x1, y1, state.brushSize, state.brushShape);
}

function pickAt(x: number, y: number): void {
  if (!inBounds(x, y)) return;
  const i = idx(x, y);
  const d = state.zone.detail[i]! as Detail;
  const e = state.zone.elev![i]!;
  if (state.layer === 'detail' && d !== Detail.None) {
    state.brushDetail = d;
  } else if (state.layer === 'elev' && e !== 0) {
    state.elevLevel = e;
  } else {
    state.brushTile = state.zone.ground[i]! as Tile;
    state.layer = 'ground';
  }
  state.changed();
  toast(`picked ${tileDef(state.zone.ground[i]!).name}`);
}

function selRect(): { x0: number; y0: number; x1: number; y1: number } | null {
  const s = state.selection;
  if (!s) return null;
  return {
    x0: Math.min(s.x0, s.x1),
    y0: Math.min(s.y0, s.y1),
    x1: Math.max(s.x0, s.x1),
    y1: Math.max(s.y0, s.y1),
  };
}

function copySelection(): boolean {
  const r = selRect();
  if (!r) return false;
  const w = r.x1 - r.x0 + 1;
  const h = r.y1 - r.y0 + 1;
  const z = state.zone;
  const buf = {
    w,
    h,
    ground: new Uint16Array(w * h),
    detail: new Uint16Array(w * h),
    elev: new Int8Array(w * h),
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const src = idx(r.x0 + x, r.y0 + y);
      buf.ground[y * w + x] = z.ground[src]!;
      buf.detail[y * w + x] = z.detail[src]!;
      buf.elev[y * w + x] = z.elev![src]!;
    }
  }
  state.clip = buf;
  return true;
}

function clearRegion(r: { x0: number; y0: number; x1: number; y1: number }, label: string): void {
  const pts: Pt[] = [];
  for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) pts.push({ x, y });
  const rec = new StrokeRecorder();
  for (const p of pts) {
    if (!inBounds(p.x, p.y)) continue;
    const i = idx(p.x, p.y);
    const z = state.zone;
    const c = rec.record(i, z.ground[i]!, z.detail[i]!, z.elev![i]!);
    c.g1 = Tile.Grass;
    c.d1 = Detail.None;
    c.e1 = 0;
    z.ground[i] = c.g1;
    z.detail[i] = c.d1;
    z.elev![i] = c.e1;
  }
  commitStroke(rec, label, pts);
}

function stampBuffer(
  buf: { w: number; h: number; ground: Uint16Array; detail: Uint16Array; elev: Int8Array },
  at: Pt,
  rec: StrokeRecorder,
  pts: Pt[],
): void {
  const z = state.zone;
  for (let y = 0; y < buf.h; y++) {
    for (let x = 0; x < buf.w; x++) {
      const lx = at.x + x;
      const ly = at.y + y;
      if (!inBounds(lx, ly)) continue;
      const i = idx(lx, ly);
      const c = rec.record(i, z.ground[i]!, z.detail[i]!, z.elev![i]!);
      c.g1 = buf.ground[y * buf.w + x]!;
      c.d1 = buf.detail[y * buf.w + x]!;
      c.e1 = buf.elev[y * buf.w + x]!;
      z.ground[i] = c.g1;
      z.detail[i] = c.d1;
      z.elev![i] = c.e1;
      pts.push({ x: lx, y: ly });
    }
  }
}

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('mousedown', (e) => {
  const t = view.tileAt(e.clientX, e.clientY);
  if (e.button === 1 || spaceHeld) {
    drag = { kind: 'pan', lastX: e.clientX, lastY: e.clientY };
    return;
  }
  if (pasteArmed && state.clip && e.button === 0) {
    const rec = new StrokeRecorder();
    const pts: Pt[] = [];
    stampBuffer(state.clip, { x: t.x - (state.clip.w >> 1), y: t.y - (state.clip.h >> 1) }, rec, pts);
    commitStroke(rec, 'paste', pts);
    pasteArmed = false;
    view.ghost = null;
    return;
  }
  if (e.altKey && e.button === 0) {
    pickAt(t.x, t.y);
    return;
  }
  const erase = e.button === 2;

  switch (state.tool) {
    case 'paint':
    case 'erase': {
      const rec = new StrokeRecorder();
      const pts = footprint(t.x, t.y, state.brushSize, state.brushShape);
      for (const p of pts) applyBrush(rec, p.x, p.y, erase || state.tool === 'erase');
      markDirtyCells(pts);
      view.strokeActive = true;
      drag = { kind: 'stroke', rec, erase: erase || state.tool === 'erase', last: t, pts };
      break;
    }
    case 'line':
    case 'rect':
    case 'ellipse':
      drag = { kind: 'shape', anchor: t, cur: t, erase };
      break;
    case 'fill': {
      if (!inBounds(t.x, t.y)) break;
      const z = state.zone;
      const sample =
        state.layer === 'ground'
          ? (i: number): number => z.ground[i]!
          : state.layer === 'detail'
            ? (i: number): number => z.detail[i]!
            : (i: number): number => z.elev![i]!;
      const pts = floodCells(t.x, t.y, z.width, z.height, sample);
      applyCellsOp('fill', pts, erase);
      toast(`filled ${pts.length} tiles`);
      break;
    }
    case 'road': {
      if (erase) {
        roadPts = [];
        view.preview = null;
        break;
      }
      roadPts.push(t);
      setPreview(roadCells(roadPts, state.roadWidth), false);
      break;
    }
    case 'select': {
      const r = selRect();
      if (r && t.x >= r.x0 && t.x <= r.x1 && t.y >= r.y0 && t.y <= r.y1 && !erase) {
        drag = { kind: 'movesel', from: t, cur: t, copy: e.altKey };
      } else if (!erase) {
        drag = { kind: 'marquee', anchor: t, cur: t };
      } else {
        state.selection = null;
        state.changed();
      }
      break;
    }
    case 'picker':
      pickAt(t.x, t.y);
      break;
    case 'structure':
      // Right-click puts the stamp away — the no-surprises exit.
      if (erase) disarmStamp();
      else stampTemplateAt(t);
      break;
    case 'prefab':
      if (erase) disarmStamp();
      else stampPrefabAt(t);
      break;
    case 'portal':
    case 'cluster':
    case 'actor':
    case 'sign':
    case 'spawn': {
      if (erase) {
        // Right-click a marker removes it — the eraser law for pins.
        const f = view.tileAtFloat(e.clientX, e.clientY);
        const hitR = placementAt(state.zone, f.x, f.y);
        if (hitR) removePlacementRef(hitR);
        break;
      }
      const f = view.tileAtFloat(e.clientX, e.clientY);
      // Ring edge first: resizing a big cluster must beat re-selecting it.
      const edge = clusterEdgeAt(state.zone, f.x, f.y, Math.max(0.35, 8 / view.scale));
      if (edge !== null) {
        beginZoneGesture();
        selectPlacement({ kind: 'cluster', index: edge });
        drag = { kind: 'clusterSize', index: edge };
        break;
      }
      const hit = placementAt(state.zone, f.x, f.y);
      if (hit) {
        beginZoneGesture();
        selectPlacement(hit);
        drag = { kind: 'placeMove', ref: hit, label: `move ${hit.kind}`, moved: false };
        break;
      }
      if (!inBounds(t.x, t.y)) break;
      beginZoneGesture();
      const ref = createPlacementAt(t);
      if (!ref) {
        pendingZoneBefore = null;
        break;
      }
      selectPlacement(ref);
      drag = { kind: 'placeMove', ref, label: `place ${ref.kind}`, moved: true };
      break;
    }
  }
});

window.addEventListener('mousemove', (e) => {
  const t = view.tileAt(e.clientX, e.clientY);
  state.hover = inBounds(t.x, t.y) ? t : null;
  updateStatus();

  if (drag.kind === 'pan') {
    view.panX += e.clientX - drag.lastX;
    view.panY += e.clientY - drag.lastY;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    return;
  }
  if (drag.kind === 'stroke') {
    const pts = thickLine(drag.last.x, drag.last.y, t.x, t.y, state.brushSize, state.brushShape);
    for (const p of pts) applyBrush(drag.rec, p.x, p.y, drag.erase);
    drag.pts.push(...pts);
    markDirtyCells(pts);
    drag.last = t;
    return;
  }
  if (drag.kind === 'shape') {
    drag.cur = t;
    setPreview(shapeCells(drag, e.shiftKey), drag.erase);
    return;
  }
  if (drag.kind === 'marquee') {
    drag.cur = t;
    state.selection = {
      x0: Math.max(0, Math.min(drag.anchor.x, t.x)),
      y0: Math.max(0, Math.min(drag.anchor.y, t.y)),
      x1: Math.min(state.zone.width - 1, Math.max(drag.anchor.x, t.x)),
      y1: Math.min(state.zone.height - 1, Math.max(drag.anchor.y, t.y)),
    };
    return;
  }
  if (drag.kind === 'movesel') {
    drag.cur = t;
    const r = selRect()!;
    if (!state.clip || view.ghost === null) {
      copySelection();
    }
    view.ghost = state.clip
      ? {
          w: state.clip.w,
          h: state.clip.h,
          ground: state.clip.ground,
          at: { x: r.x0 + (t.x - drag.from.x), y: r.y0 + (t.y - drag.from.y) },
        }
      : null;
    return;
  }
  if (drag.kind === 'placeMove') {
    if (!inBounds(t.x, t.y)) return;
    const cur = placementPos(state.zone, drag.ref);
    if (cur && (Math.floor(cur.x) !== t.x || Math.floor(cur.y) !== t.y)) {
      if (drag.ref.kind === 'portal' || drag.ref.kind === 'sign') {
        carryPlacementTile(
          state.zone,
          { x: state.zone.origin.x + Math.floor(cur.x), y: state.zone.origin.y + Math.floor(cur.y) },
          { x: state.zone.origin.x + t.x, y: state.zone.origin.y + t.y },
        );
      }
      movePlacement(state.zone, drag.ref, t.x, t.y);
      drag.moved = true;
    }
    return;
  }
  if (drag.kind === 'clusterSize') {
    const sp = state.zone.spawns?.[drag.index];
    if (sp) {
      const f = view.tileAtFloat(e.clientX, e.clientY);
      const d = Math.hypot(
        f.x - (sp.x - state.zone.origin.x + 0.5),
        f.y - (sp.y - state.zone.origin.y + 0.5),
      );
      sp.radius = Math.max(0, Math.min(24, Math.round(d)));
    }
    return;
  }

  // Idle hover: brush ghost for the painting tools, marker hover for
  // the placement tools, stamp ghosts for structures and prefabs.
  if (state.tool === 'paint' || state.tool === 'erase') {
    setPreview(footprint(t.x, t.y, state.brushSize, state.brushShape), state.tool === 'erase');
  } else if (state.tool === 'road' && roadPts.length > 0) {
    setPreview(roadCells([...roadPts, t], state.roadWidth), false);
  } else if (drag.kind === 'none' && state.tool !== 'select') {
    view.preview = null;
  }
  if (state.tool === 'structure') {
    templateGhost(t);
  } else if (state.tool === 'prefab') {
    prefabGhost(t);
  } else if (pasteArmed && state.clip) {
    view.ghost = {
      w: state.clip.w,
      h: state.clip.h,
      ground: state.clip.ground,
      at: { x: t.x - (state.clip.w >> 1), y: t.y - (state.clip.h >> 1) },
    };
  }
  if (PLACEMENT_TOOLS.has(state.tool)) {
    const f = view.tileAtFloat(e.clientX, e.clientY);
    state.hoverPlacement = placementAt(state.zone, f.x, f.y);
    const edge = clusterEdgeAt(state.zone, f.x, f.y, Math.max(0.35, 8 / view.scale));
    canvas.style.cursor = state.hoverPlacement ? 'grab' : edge !== null ? 'ew-resize' : 'crosshair';
  } else {
    state.hoverPlacement = null;
    canvas.style.cursor = 'crosshair';
  }
});

window.addEventListener('mouseup', (e) => {
  if (drag.kind === 'stroke') {
    view.strokeActive = false;
    commitStroke(drag.rec, state.tool === 'erase' || drag.erase ? 'erase' : 'paint', drag.pts);
  } else if (drag.kind === 'shape') {
    const pts = shapeCells(drag, e.shiftKey);
    applyCellsOp(state.tool, pts, drag.erase);
    view.preview = null;
  } else if (drag.kind === 'movesel') {
    const r = selRect()!;
    const dx = drag.cur.x - drag.from.x;
    const dy = drag.cur.y - drag.from.y;
    if ((dx !== 0 || dy !== 0) && state.clip) {
      const rec = new StrokeRecorder();
      const pts: Pt[] = [];
      if (!drag.copy) {
        // Cut the source region first.
        for (let y = r.y0; y <= r.y1; y++) {
          for (let x = r.x0; x <= r.x1; x++) {
            const i = idx(x, y);
            const z = state.zone;
            const c = rec.record(i, z.ground[i]!, z.detail[i]!, z.elev![i]!);
            c.g1 = Tile.Grass;
            c.d1 = Detail.None;
            c.e1 = 0;
            z.ground[i] = c.g1;
            z.detail[i] = c.d1;
            z.elev![i] = c.e1;
            pts.push({ x, y });
          }
        }
      }
      stampBuffer(state.clip, { x: r.x0 + dx, y: r.y0 + dy }, rec, pts);
      commitStroke(rec, drag.copy ? 'copy selection' : 'move selection', pts);
      state.selection = {
        x0: r.x0 + dx,
        y0: r.y0 + dy,
        x1: r.x1 + dx,
        y1: r.y1 + dy,
      };
    }
    view.ghost = null;
  } else if (drag.kind === 'placeMove') {
    if (drag.moved) {
      endZoneGesture(drag.label, { tiles: drag.ref.kind === 'portal' });
      toast(drag.label);
    } else {
      pendingZoneBefore = null;
    }
  } else if (drag.kind === 'clusterSize') {
    endZoneGesture('cluster radius', { tiles: false });
  }
  drag = { kind: 'none' };
});

canvas.addEventListener('dblclick', () => {
  if (state.tool === 'road' && roadPts.length >= 2) commitRoad();
});

function commitRoad(): void {
  const pts = roadCells(roadPts, state.roadWidth).filter((p) => inBounds(p.x, p.y));
  // Roads paint the active ground brush — Path by default.
  const prevLayer = state.layer;
  state.layer = 'ground';
  applyCellsOp('road', pts);
  state.layer = prevLayer;
  roadPts = [];
  view.preview = null;
  toast(`road laid (${pts.length} tiles)`);
}

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  view.zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  updateStatus();
}, { passive: false });

// ---------------------------------------------------------- keyboard

const TOOL_KEYS: Record<string, ToolId> = {
  KeyB: 'paint',
  KeyE: 'erase',
  KeyL: 'line',
  KeyR: 'rect',
  KeyO: 'ellipse',
  KeyG: 'fill',
  KeyT: 'road',
  KeyM: 'select',
  KeyI: 'picker',
  KeyH: 'structure',
  KeyF: 'prefab',
  KeyU: 'portal',
  KeyN: 'cluster',
  KeyA: 'actor',
  KeyJ: 'sign',
  KeyP: 'spawn',
};

window.addEventListener('keydown', (e) => {
  const inField =
    document.activeElement instanceof HTMLInputElement ||
    document.activeElement instanceof HTMLTextAreaElement ||
    document.activeElement instanceof HTMLSelectElement;
  const mod = e.metaKey || e.ctrlKey;

  // The world hears its own keys while it is the view on stage.
  if (mode === 'world') {
    if (mod && e.code === 'KeyO') {
      e.preventDefault();
      void openBrowser();
      return;
    }
    if (mod && (e.code === 'KeyZ' || e.code === 'KeyS')) {
      e.preventDefault();
      world.keydown(e);
      return;
    }
    if (inField) return;
    if (e.code === 'Space') {
      e.preventDefault();
      world.keydown(e);
      return;
    }
    if (e.code === 'KeyZ') {
      setMode('zone');
      return;
    }
    if (world.keydown(e)) e.preventDefault();
    return;
  }
  if (!inField && !mod && e.code === 'KeyW') {
    setMode('world');
    return;
  }

  if (mod && e.code === 'KeyZ') {
    e.preventDefault();
    undoRedo(e.shiftKey ? 'redo' : 'undo');
    return;
  }
  if (mod && e.code === 'KeyS') {
    e.preventDefault();
    void saveToServer();
    return;
  }
  if (mod && e.code === 'KeyO') {
    e.preventDefault();
    void openBrowser();
    return;
  }
  if (inField) return;

  if (mod && e.code === 'KeyC') {
    if (copySelection()) toast('copied selection');
    return;
  }
  if (mod && e.code === 'KeyX') {
    const r = selRect();
    if (r && copySelection()) {
      clearRegion(r, 'cut selection');
      toast('cut selection');
    }
    return;
  }
  if (mod && e.code === 'KeyV') {
    if (state.clip) {
      pasteArmed = true;
      toast('paste: click to place (Esc cancels)');
    }
    return;
  }

  if (e.code === 'Space') {
    spaceHeld = true;
    e.preventDefault();
    return;
  }
  const tool = TOOL_KEYS[e.code];
  if (tool) {
    setTool(tool);
    return;
  }
  if (e.code === 'KeyX' && (state.tool === 'structure' || state.tool === 'prefab')) {
    state.stampFlip = !state.stampFlip;
    if (state.tool === 'prefab') toast('prefabs stamp as captured (no mirror) — flip applies to structures');
    else toast(state.stampFlip ? 'mirrored east-west' : 'mirror off');
    state.changed();
    return;
  }
  switch (e.code) {
    case 'Digit1':
      state.layer = 'ground';
      state.changed();
      break;
    case 'Digit2':
      state.layer = 'detail';
      state.changed();
      break;
    case 'Digit3':
      state.layer = 'elev';
      state.changed();
      break;
    case 'BracketLeft':
      state.brushSize = Math.max(1, state.brushSize - 1);
      state.changed();
      break;
    case 'BracketRight':
      state.brushSize = Math.min(12, state.brushSize + 1);
      state.changed();
      break;
    case 'Digit0':
      view.fitZone();
      break;
    case 'Slash':
      e.preventDefault();
      $('pal-search')?.focus();
      break;
    case 'Enter':
      if (state.tool === 'road' && roadPts.length >= 2) commitRoad();
      break;
    case 'Escape': {
      // One cancel per press, most-transient first — predictable exits.
      if (pasteArmed) {
        pasteArmed = false;
        view.ghost = null;
        toast('paste cancelled');
        break;
      }
      if (disarmStamp()) break;
      if (roadPts.length > 0) {
        roadPts = [];
        view.preview = null;
        toast('road abandoned');
        break;
      }
      if (state.selected) {
        state.selected = null;
        state.changed();
        break;
      }
      if (state.selection) {
        state.selection = null;
        state.changed();
      }
      break;
    }
    case 'Delete':
    case 'Backspace': {
      // A selected placement outranks a tile selection.
      if (state.selected) {
        removePlacementRef(state.selected);
        break;
      }
      const r = selRect();
      if (r) {
        clearRegion(r, 'delete selection');
        toast('cleared selection');
      }
      break;
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') spaceHeld = false;
  world.keyup(e);
});

window.addEventListener('beforeunload', (e) => {
  if (state.dirty || world.ws.dirty) e.preventDefault();
});

// ----------------------------------------------------------- file io

function adoptZone(zone: ZoneDef, serverBacked: boolean, opts: { stay?: boolean } = {}): void {
  state.adopt(zone, { serverBacked });
  history.clear();
  view.markAllDirty();
  // Opening a zone steps into it — unless the caller is pre-warming
  // the zone view behind the world screen (boot's background load).
  if (!opts.stay) setMode('zone');
  view.fitZone();
  if (opts.stay) pendingZoneFit = true;
  syncZoneChip();
  updateStatus();
}

async function saveToServer(): Promise<void> {
  const v = validateZone(state.zone);
  showValidation(v.ok ? (v.fenceAdded > 0 ? `auto-fence will add ${v.fenceAdded} cliff tiles` : 'zone is valid') : v.error!, v.ok);
  if (!v.ok) {
    toast('validation failed — see panel', 4000);
    return;
  }
  if (v.fencedGround) {
    zoneOp('auto-fence', (z) => {
      z.ground.set(v.fencedGround!);
    });
    toast(`auto-fence added ${v.fenceAdded} cliff tiles`);
  }
  try {
    await saveZone(zoneToJson(state.zone));
    state.dirty = false;
    state.serverBacked = true;
    state.changed();
    toast(`saved '${state.zone.id}' — live on the server`);
    setServerStatus(`saved ${new Date().toLocaleTimeString()}`);
    // The world map wears this zone's art — re-read it on return.
    world.view.invalidateZone(state.zone.id);
  } catch (err) {
    toast(`save failed: ${(err as Error).message}`, 5000);
    setServerStatus('offline — Export keeps a local copy');
  }
}

function showModal(builder: (body: HTMLElement, close: () => void) => void): void {
  const modal = $('modal') as HTMLDialogElement;
  const body = $('modal-body');
  body.innerHTML = '';
  body.className = '';
  builder(body, () => modal.close());
  modal.showModal();
}

/** Recently opened zone ids, newest first (localStorage-backed). */
function recentZones(): string[] {
  try {
    return JSON.parse(localStorage.getItem('dc-editor-recent') ?? '[]') as string[];
  } catch {
    return [];
  }
}

function noteRecentZone(id: string): void {
  const list = [id, ...recentZones().filter((x) => x !== id)].slice(0, 8);
  localStorage.setItem('dc-editor-recent', JSON.stringify(list));
}

/**
 * THE OPEN BROWSER — everything the world holds, one dialog: towns,
 * the dark band, every composed frontier site, files, orphans. Search
 * filters as you type; every row can open, show itself on the world
 * map, or take its kind's actions (revert/delete/adopt).
 */
async function openBrowser(): Promise<void> {
  let list;
  let cells: typeof world.ws.cells = world.ws.cells;
  try {
    list = await listMaps();
    world.ws.setZones(list.zones);
    cells = world.ws.cells;
    setServerStatus('connected');
  } catch (err) {
    toast(`server list failed: ${(err as Error).message}`, 4000);
    setServerStatus('offline — Import a local file instead');
    return;
  }
  const zones = list.zones;
  const orphans = list.orphans;
  showModal((body, close) => {
    body.className = 'open-browser';
    const h = document.createElement('h2');
    h.textContent = 'Open';
    body.appendChild(h);
    const search = document.createElement('input');
    search.type = 'search';
    search.id = 'ob-search';
    search.placeholder = 'Search zones and frontier sites… (name, id, archetype)';
    body.appendChild(search);
    const listHost = document.createElement('div');
    listHost.className = 'ob-list';
    body.appendChild(listHost);

    const defNameOf = (id: string): string | null => {
      const m = /^poi:(-?\d+),(-?\d+)$/.exec(id);
      if (!m) return null;
      const cell = cells.find((c) => c.cellX === Number(m[1]) && c.cellY === Number(m[2]));
      return cell?.defName ?? null;
    };

    const rebuild = (): void => {
      const q = search.value.trim().toLowerCase();
      listHost.innerHTML = '';
      const match = (z: MapListEntry): boolean =>
        q === '' ||
        z.id.toLowerCase().includes(q) ||
        z.name.toLowerCase().includes(q) ||
        (defNameOf(z.id)?.toLowerCase().includes(q) ?? false);

      const recent = recentZones()
        .map((id) => zones.find((z) => z.id === id))
        .filter((z): z is MapListEntry => z !== undefined && match(z));
      const towns = zones.filter((z) => !z.poi && z.origin.y < 512 && match(z));
      const dark = zones.filter((z) => !z.poi && z.origin.y >= 512 && match(z));
      // Every decided cell belongs in the catalog — the dormant ones
      // (no zone standing yet) open by composing on demand.
      const standing = new Set(zones.filter((z) => z.poi).map((z) => z.id));
      const dormant: MapListEntry[] = cells
        .filter((c) => c.site && !standing.has(`poi:${c.cellX},${c.cellY}`))
        .map((c) => ({
          id: `poi:${c.cellX},${c.cellY}`,
          name: c.defName ?? c.site!.defId,
          width: 0,
          height: 0,
          origin: { x: c.site!.anchorX, y: c.site!.anchorY },
          spawn: null,
          builtin: false,
          hasFile: false,
          poi: true,
          actorSpawns: 0,
          npcSpawns: 0,
          portals: 0,
          dormant: true,
        }));
      const sites = [...zones.filter((z) => z.poi), ...dormant].filter(match);

      const section = (title: string, entries: MapListEntry[]): void => {
        if (entries.length === 0) return;
        const head = document.createElement('div');
        head.className = 'ob-head';
        head.textContent = `${title} (${entries.length})`;
        listHost.appendChild(head);
        for (const z of entries) listHost.appendChild(openRow(z, close));
      };
      if (q === '' && recent.length > 0) section('Recent', recent);
      section('Towns & authored zones', towns);
      section('The dark band', dark);
      section('Frontier sites — composed by the scaffold', sites);
      if (orphans.length > 0 && q === '') {
        const p = document.createElement('p');
        p.className = 'muted';
        p.textContent = `On disk but not loaded (bad parse?): ${orphans.join(', ')}`;
        listHost.appendChild(p);
      }
      if (listHost.childElementCount === 0) {
        const p = document.createElement('p');
        p.className = 'muted';
        p.textContent = 'Nothing matches — the world holds no such place.';
        listHost.appendChild(p);
      }
    };
    search.oninput = rebuild;
    rebuild();
    search.focus();
  });
}

function openRow(z: MapListEntry, close: () => void): HTMLElement {
  const row = document.createElement('div');
  row.className = 'ob-row';
  const pic = document.createElement('div');
  pic.className = 'ob-pic';
  if (z.dormant) {
    // A thumbnail would force the site to compose server-side —
    // browsing must never change the world. The lamp stands in.
    pic.appendChild(iconImg('wsite', 30));
  } else {
    void world.view.thumbUrl(z.id).then((url) => {
      if (url && row.isConnected) {
        const img = document.createElement('img');
        img.src = url;
        pic.appendChild(img);
      }
    });
  }
  row.appendChild(pic);

  const facts = document.createElement('div');
  facts.className = 'ob-facts';
  const title = document.createElement('div');
  title.className = 'ob-title';
  title.innerHTML = `<b></b><span class="muted"></span>`;
  (title.firstChild as HTMLElement).textContent = z.name;
  (title.lastChild as HTMLElement).textContent = z.id;
  facts.appendChild(title);
  const sub = document.createElement('div');
  sub.className = 'ob-sub muted';
  sub.textContent = z.dormant
    ? `anchor @ ${z.origin.x},${z.origin.y} · dormant — composes when opened or approached`
    : `${z.width}×${z.height} @ ${z.origin.x},${z.origin.y} · ` +
      `${z.npcSpawns} spawns · ${z.actorSpawns} actors · ${z.portals} portals`;
  facts.appendChild(sub);
  const badges = document.createElement('div');
  badges.className = 'ob-badges';
  const badge = (text: string, cls = ''): void => {
    const b = document.createElement('span');
    b.className = `pill ${cls}`;
    b.textContent = text;
    badges.appendChild(b);
  };
  if (z.builtin) badge('built-in');
  if (z.hasFile) badge('file', 'brass');
  if (z.poi) badge('frontier site', 'blue');
  if (z.dormant) badge('dormant');
  if (!z.dormant && z.origin.y >= 512) badge('dark band');
  facts.appendChild(badges);
  row.appendChild(facts);

  const actions = document.createElement('div');
  actions.className = 'ob-actions';
  const open = document.createElement('button');
  open.className = 'primary';
  open.textContent = z.poi ? 'Look' : 'Open';
  open.title = z.poi
    ? 'Open read-only — the scaffold owns composed ground (Adopt to edit)'
    : 'Open in the zone editor';
  open.onclick = () => {
    close();
    noteRecentZone(z.id);
    void openZoneById(z.id);
  };
  actions.appendChild(open);
  if (z.origin.y < 512) {
    const show = document.createElement('button');
    show.textContent = 'Map';
    show.title = 'Show on the world map';
    show.onclick = () => {
      close();
      setMode('world');
      world.select({ kind: 'zone', id: z.id });
      world.centerOn({ kind: 'zone', id: z.id });
    };
    actions.appendChild(show);
  }
  if (z.poi) {
    const m = /^poi:(-?\d+),(-?\d+)$/.exec(z.id);
    if (m) {
      const adopt = document.createElement('button');
      adopt.textContent = 'Adopt…';
      adopt.title = 'Freeze this composed site into an authored zone you own';
      adopt.onclick = () => {
        close();
        setMode('world');
        world.adoptCell(Number(m[1]), Number(m[2]));
      };
      actions.appendChild(adopt);
    }
  }
  if (z.hasFile) {
    const del = document.createElement('button');
    del.textContent = z.builtin ? 'Revert' : 'Delete';
    del.title = z.builtin
      ? 'Delete the override file; the shipped zone returns live'
      : 'Delete the map file and unload the zone';
    del.className = 'danger';
    del.onclick = async () => {
      if (!window.confirm(`${del.textContent} '${z.id}'? This removes data/maps/${z.id}.json.`)) return;
      try {
        await deleteZone(z.id);
        toast(`${z.builtin ? 'reverted' : 'deleted'} '${z.id}'`);
        world.view.invalidateZone(z.id);
        close();
        void openBrowser();
      } catch (err) {
        toast(`delete failed: ${(err as Error).message}`, 4000);
      }
    };
    actions.appendChild(del);
  }
  row.appendChild(actions);
  return row;
}

function newZoneDialog(): void {
  showModal((body, close) => {
    body.innerHTML = `
      <h2>New zone</h2>
      <div class="form-grid">
        <label>id <input id="nz-id" value="myzone" pattern="[a-z][a-z0-9_-]*"></label>
        <label>name <input id="nz-name" value="My Zone"></label>
        <label>width <input id="nz-w" type="number" value="96" min="8" max="512"></label>
        <label>height <input id="nz-h" type="number" value="96" min="8" max="512"></label>
        <label>origin x <input id="nz-ox" type="number" value="0" step="32"></label>
        <label>origin y <input id="nz-oy" type="number" value="0" step="32"></label>
      </div>
      <p class="muted">Tip: chunk-align the origin (multiples of 32) and keep clear of
      Dawnmead (-96,16–0,80) unless you mean to override it.</p>`;
    const go = document.createElement('button');
    go.textContent = 'Create';
    go.className = 'primary';
    go.onclick = () => {
      const id = ($('nz-id') as HTMLInputElement).value.trim();
      if (!/^[a-z][a-z0-9_-]*$/.test(id)) {
        toast('id must be lowercase [a-z0-9_-]');
        return;
      }
      const z = newZone(
        id,
        ($('nz-name') as HTMLInputElement).value.trim() || id,
        Math.max(8, Math.min(512, Number(($('nz-w') as HTMLInputElement).value) || 96)),
        Math.max(8, Math.min(512, Number(($('nz-h') as HTMLInputElement).value) || 96)),
      );
      z.origin = {
        x: Number(($('nz-ox') as HTMLInputElement).value) || 0,
        y: Number(($('nz-oy') as HTMLInputElement).value) || 0,
      };
      adoptZone(z, false);
      close();
      toast(`new ${z.width}×${z.height} zone '${z.id}'`);
    };
    body.appendChild(go);
  });
}

// ----------------------------------------------- zone identity chip

function syncZoneChip(): void {
  if (mode === 'world') {
    const g = world.ws.geo;
    const towns = world.ws.zones.filter((z) => !z.poi).length;
    const sites = world.ws.cells.filter((c) => c.site).length;
    $('zone-chip').innerHTML = g
      ? `<b>The Dawnlands</b><span>${towns} zones · ${g.routes.length} routes · ` +
        `${g.sites.length} landmarks · ${sites} frontier sites${world.ws.edited ? ' · edited plan' : ''}</span>`
      : `<b>The Dawnlands</b><span>${world.ws.offline ? 'server asleep' : 'waking…'}</span>`;
    return;
  }
  const z = state.zone;
  const readOnly = z.id.startsWith('poi:') ? ' · composed site (adopt to own it)' : '';
  $('zone-chip').innerHTML =
    `<b>${z.name}</b><span>${z.id} · ${z.width}×${z.height} @ ${z.origin.x},${z.origin.y}${readOnly}</span>`;
}

/**
 * Zone properties live in one calm dialog — identity, origin, and
 * size, each explained, applied together as undoable operations.
 */
function zonePropertiesDialog(): void {
  const z = state.zone;
  showModal((body, close) => {
    body.innerHTML = `
      <h2>Zone properties</h2>
      <div class="form-rows">
        <label class="form-row">
          <span>id</span>
          <input id="zp-id" value="${z.id}" pattern="[a-z][a-z0-9_-]*">
          <em>The save file name and reference key — lowercase, stable once shipped.</em>
        </label>
        <label class="form-row">
          <span>name</span>
          <input id="zp-name" value="${z.name}">
          <em>The display name players and teammates see.</em>
        </label>
        <label class="form-row">
          <span>origin</span>
          <span class="pair">
            <input id="zp-ox" type="number" step="32" value="${z.origin.x}">
            <input id="zp-oy" type="number" step="32" value="${z.origin.y}">
          </span>
          <em>World tile of the top-left corner. Moving it carries the spawn,
          portals, and every placement along with the content.</em>
        </label>
        <label class="form-row">
          <span>size</span>
          <span class="pair">
            <input id="zp-w" type="number" min="8" max="512" value="${z.width}">
            <input id="zp-h" type="number" min="8" max="512" value="${z.height}">
          </span>
          <em>8–512 tiles per side. Shrinking crops from the south-east;
          growth fills with meadow.</em>
        </label>
        <label class="form-row">
          <span>growth</span>
          <select id="zp-growth">
            <option value="kept"${z.growth !== 'wild' ? ' selected' : ''}>kept — tended ground, fast in-place respawn</option>
            <option value="wild"${z.growth === 'wild' ? ' selected' : ''}>wild — harvests ride the growth ledger</option>
          </select>
          <em>THE KEPT AND THE WILD (second-growth): which renewal law this
          zone's owned tiles obey. Towns stay kept; authored wilderness may
          go wild.</em>
        </label>
      </div>`;
    const row = document.createElement('div');
    row.className = 'dialog-actions';
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.onclick = close;
    const apply = document.createElement('button');
    apply.className = 'primary';
    apply.textContent = 'Apply';
    apply.onclick = () => {
      const id = ($('zp-id') as HTMLInputElement).value.trim();
      const name = ($('zp-name') as HTMLInputElement).value.trim();
      if (!/^[a-z][a-z0-9_-]*$/.test(id)) {
        toast('id must be lowercase [a-z0-9_-]', 3200, 'error');
        return;
      }
      const nx = Number(($('zp-ox') as HTMLInputElement).value) || 0;
      const ny = Number(($('zp-oy') as HTMLInputElement).value) || 0;
      const w = Math.max(8, Math.min(512, Number(($('zp-w') as HTMLInputElement).value) || z.width));
      const h = Math.max(8, Math.min(512, Number(($('zp-h') as HTMLInputElement).value) || z.height));
      const changes: string[] = [];
      if (id !== z.id || name !== (z.name || z.id)) {
        zoneOp('rename zone', (zone) => {
          zone.id = id;
          zone.name = name || id;
        }, { tiles: false });
        changes.push('identity');
      }
      const growthSel = ($('zp-growth') as HTMLSelectElement).value;
      if ((z.growth ?? 'kept') !== growthSel) {
        zoneOp('set growth domain', (zone) => {
          zone.growth = growthSel === 'wild' ? 'wild' : undefined;
        }, { tiles: false });
        changes.push('growth');
      }
      const dx = nx - state.zone.origin.x;
      const dy = ny - state.zone.origin.y;
      if (dx !== 0 || dy !== 0) {
        zoneOp('move origin', (zone) => {
          zone.origin = { x: nx, y: ny };
          if (zone.spawn) {
            zone.spawn.x += dx;
            zone.spawn.y += dy;
          }
          for (const p of zone.portals ?? []) {
            p.x += dx;
            p.y += dy;
          }
          for (const s of zone.spawns ?? []) {
            s.x += dx;
            s.y += dy;
          }
          for (const a of zone.actorSpawns ?? []) {
            a.x += dx;
            a.y += dy;
          }
        });
        changes.push(`origin → ${nx},${ny}`);
      }
      if (w !== state.zone.width || h !== state.zone.height) {
        zoneOp(`resize to ${w}×${h}`, (zone) => {
          const ground = new Uint16Array(w * h).fill(Tile.Grass);
          const detail = new Uint16Array(w * h);
          const elev = new Int8Array(w * h);
          for (let y = 0; y < Math.min(h, zone.height); y++) {
            for (let x = 0; x < Math.min(w, zone.width); x++) {
              ground[y * w + x] = zone.ground[y * zone.width + x]!;
              detail[y * w + x] = zone.detail[y * zone.width + x]!;
              elev[y * w + x] = zone.elev![y * zone.width + x]!;
            }
          }
          zone.width = w;
          zone.height = h;
          zone.ground = ground;
          zone.detail = detail;
          zone.elev = elev;
        });
        state.selection = null;
        changes.push(`resized to ${w}×${h}`);
      }
      syncZoneChip();
      close();
      if (changes.length > 0) toast(changes.join(' · '), 3200, 'success');
    };
    row.append(cancel, apply);
    body.appendChild(row);
  });
}

// ----------------------------------------------------- toolbar & opts

interface ToolSpec {
  id: ToolId;
  name: string;
  key: string;
  hint: string;
  tab?: SidebarTab;
}

const TOOL_GROUPS: Array<{ caption: string; tools: ToolSpec[] }> = [
  {
    caption: 'Draw',
    tools: [
      { id: 'paint', name: 'Paint', key: 'B', hint: 'Drag to paint the active layer · right-drag erases · [ ] size the brush' },
      { id: 'erase', name: 'Erase', key: 'E', hint: 'Ground back to grass, detail to none, elevation to flat' },
      { id: 'line', name: 'Line', key: 'L', hint: 'Drag a straight run · Shift snaps the angle' },
      { id: 'rect', name: 'Rectangle', key: 'R', hint: 'Drag a rectangle · Shift squares it · filled/outline in options' },
      { id: 'ellipse', name: 'Ellipse', key: 'O', hint: 'Drag an ellipse · Shift rounds it · filled/outline in options' },
      { id: 'fill', name: 'Fill', key: 'G', hint: 'Flood a connected region on the active layer' },
      { id: 'road', name: 'Road', key: 'T', hint: 'Click waypoints · Enter or double-click lays the road · Esc abandons' },
    ],
  },
  {
    caption: 'Build',
    tools: [
      { id: 'structure', name: 'Structure', key: 'H', hint: 'Stamp a building template · X mirrors it · pick one in the Structures tab', tab: 'structures' },
      { id: 'prefab', name: 'Prefab', key: 'F', hint: 'Stamp a saved point of interest — tiles and placements together', tab: 'structures' },
    ],
  },
  {
    caption: 'Place',
    tools: [
      { id: 'portal', name: 'Portal', key: 'U', hint: 'Click to plant a portal · drag a marker to move it · right-click removes', tab: 'placements' },
      { id: 'cluster', name: 'NPC cluster', key: 'N', hint: 'Click to plant a respawning mob camp · drag the ring edge to resize', tab: 'placements' },
      { id: 'actor', name: 'Actor', key: 'A', hint: 'Click to post a named NPC · bind identity and routine in the inspector', tab: 'placements' },
      { id: 'sign', name: 'Sign', key: 'J', hint: 'Click to raise a board · write its words in the inspector · right-click removes', tab: 'placements' },
      { id: 'spawn', name: 'World spawn', key: 'P', hint: 'Click to set where players arrive in the world', tab: 'placements' },
    ],
  },
  {
    caption: 'Edit',
    tools: [
      { id: 'select', name: 'Select', key: 'M', hint: 'Drag a marquee · drag inside moves it · Alt-drag copies · Delete clears' },
      { id: 'picker', name: 'Picker', key: 'I', hint: 'Click any tile to make it the brush · Alt-click works from any tool' },
    ],
  },
];

const TOOL_SPECS = new Map<ToolId, ToolSpec>(
  TOOL_GROUPS.flatMap((g) => g.tools).map((t) => [t.id, t]),
);

function setTool(tool: ToolId): void {
  state.tool = tool;
  if (tool !== 'road') {
    roadPts = [];
    view.preview = null;
  }
  if (tool !== 'structure' && tool !== 'prefab') view.ghost = null;
  const spec = TOOL_SPECS.get(tool);
  if (spec?.tab) state.tab = spec.tab;
  else if (tool === 'paint' || tool === 'fill' || tool === 'line' || tool === 'rect' || tool === 'ellipse' || tool === 'road') {
    state.tab = 'tiles';
  }
  state.changed();
}

function buildToolbar(): void {
  if (mode === 'world') {
    buildWorldToolbar();
    return;
  }
  const bar = $('toolbar');
  bar.innerHTML = '';
  for (const group of TOOL_GROUPS) {
    const cap = document.createElement('div');
    cap.className = 'tool-caption';
    cap.textContent = group.caption;
    bar.appendChild(cap);
    for (const t of group.tools) {
      const b = document.createElement('button');
      b.className = 'tool' + (state.tool === t.id ? ' active' : '');
      b.title = `${t.name} (${t.key})\n${t.hint}`;
      b.appendChild(iconImg(t.id, 22));
      const key = document.createElement('span');
      key.className = 'key';
      key.textContent = t.key;
      b.appendChild(key);
      b.onclick = () => setTool(t.id);
      bar.appendChild(b);
    }
  }
  const spec = TOOL_SPECS.get(state.tool);
  $('st-hint').textContent = spec ? `${spec.name} — ${spec.hint}` : '';
}

function buildOptions(): void {
  const root = $('tool-options');
  root.innerHTML = '';

  // Stamp tools carry their own compact option row and no layers.
  if (state.tool === 'structure' || state.tool === 'prefab') {
    const row = document.createElement('div');
    row.className = 'opt-row';
    const armed =
      state.tool === 'structure'
        ? STRUCTURE_TEMPLATES.find((t) => t.id === state.armedTemplate)?.meta?.label ?? 'nothing armed'
        : state.armedPrefab?.name ?? 'nothing armed';
    const chip = document.createElement('span');
    chip.className = 'armed-chip';
    chip.textContent = armed;
    row.appendChild(chip);
    if (state.tool === 'structure') {
      const flipBtn = document.createElement('button');
      flipBtn.className = 'opt-btn' + (state.stampFlip ? ' active' : '');
      flipBtn.appendChild(iconImg('flip', 14));
      flipBtn.append(' mirror (X)');
      flipBtn.onclick = () => {
        state.stampFlip = !state.stampFlip;
        state.changed();
      };
      row.appendChild(flipBtn);
    }
    root.appendChild(row);
    const note = document.createElement('p');
    note.className = 'muted';
    note.textContent =
      state.tool === 'structure'
        ? 'Click the map to stamp. Buildings mirror but never rotate — the camera reads south faces.'
        : 'Click the map to stamp tiles and placements together. Stays armed for repeats.';
    root.appendChild(note);
    return;
  }

  if (PLACEMENT_TOOLS.has(state.tool)) {
    const note = document.createElement('p');
    note.className = 'muted';
    note.textContent =
      'Click empty ground to place · click a marker to select it · drag to move · right-click removes. Properties live in the Placements tab.';
    root.appendChild(note);
    return;
  }

  const layerRow = document.createElement('div');
  layerRow.className = 'opt-row';
  for (const [id, label] of [
    ['ground', 'Ground (1)'],
    ['detail', 'Detail (2)'],
    ['elev', 'Elevation (3)'],
  ] as Array<[LayerId, string]>) {
    const b = document.createElement('button');
    b.className = 'opt-btn' + (state.layer === id ? ' active' : '');
    b.textContent = label;
    b.onclick = () => {
      state.layer = id;
      state.changed();
    };
    layerRow.appendChild(b);
  }
  root.appendChild(layerRow);

  if (state.layer === 'elev') {
    const row = document.createElement('div');
    row.className = 'opt-row';
    row.append('level ');
    for (let lv = -2; lv <= 3; lv++) {
      const b = document.createElement('button');
      b.className = 'opt-btn' + (state.elevLevel === lv ? ' active' : '');
      b.textContent = String(lv);
      b.onclick = () => {
        state.elevLevel = lv;
        state.changed();
      };
      row.appendChild(b);
    }
    root.appendChild(row);
    const note = document.createElement('p');
    note.className = 'muted';
    note.textContent =
      'Paint levels, then paint stone stair tiles (Ramp) on a straight high-side edge; Save runs the fence + stair laws.';
    root.appendChild(note);
  }

  const brushRow = document.createElement('div');
  brushRow.className = 'opt-row';
  brushRow.append(`brush ${state.brushSize} `);
  const size = document.createElement('input');
  size.type = 'range';
  size.min = '1';
  size.max = '12';
  size.value = String(state.brushSize);
  size.oninput = () => {
    state.brushSize = Number(size.value);
    state.changed();
  };
  brushRow.appendChild(size);
  for (const shape of ['round', 'square'] as const) {
    const b = document.createElement('button');
    b.className = 'opt-btn' + (state.brushShape === shape ? ' active' : '');
    b.textContent = shape === 'round' ? '●' : '■';
    b.title = `${shape} brush`;
    b.onclick = () => {
      state.brushShape = shape;
      state.changed();
    };
    brushRow.appendChild(b);
  }
  root.appendChild(brushRow);

  if (state.tool === 'rect' || state.tool === 'ellipse') {
    const row = document.createElement('div');
    row.className = 'opt-row';
    for (const [fill, label] of [
      [true, 'filled'],
      [false, 'outline'],
    ] as Array<[boolean, string]>) {
      const b = document.createElement('button');
      b.className = 'opt-btn' + (state.shapeFill === fill ? ' active' : '');
      b.textContent = label;
      b.onclick = () => {
        state.shapeFill = fill;
        state.changed();
      };
      row.appendChild(b);
    }
    root.appendChild(row);
  }

  if (state.tool === 'road') {
    const row = document.createElement('div');
    row.className = 'opt-row';
    row.append(`road width ${state.roadWidth} `);
    const wSlider = document.createElement('input');
    wSlider.type = 'range';
    wSlider.min = '1';
    wSlider.max = '7';
    wSlider.value = String(state.roadWidth);
    wSlider.oninput = () => {
      state.roadWidth = Number(wSlider.value);
      state.changed();
    };
    row.appendChild(wSlider);
    root.appendChild(row);
    const note = document.createElement('p');
    note.className = 'muted';
    note.textContent = 'Roads lay the selected ground tile (pick path, dirt, stone…).';
    root.appendChild(note);
  }

  const view4 = document.createElement('div');
  view4.className = 'opt-row';
  for (const [key, label] of [
    ['showGrid', 'grid'],
    ['showChunkGrid', 'chunks'],
    ['showMarkers', 'markers'],
    ['showElev', 'elev'],
  ] as Array<['showGrid' | 'showChunkGrid' | 'showMarkers' | 'showElev', string]>) {
    const b = document.createElement('button');
    b.className = 'opt-btn' + (view[key] ? ' active' : '');
    b.textContent = label;
    b.onclick = () => {
      view[key] = !view[key];
      state.changed();
    };
    view4.appendChild(b);
  }
  root.appendChild(view4);
}

// ------------------------------------------------- sidebar tabs

const TAB_LABELS: Array<[SidebarTab, string, string]> = [
  ['tiles', 'Tiles', 'paint'],
  ['structures', 'Structures', 'structure'],
  ['placements', 'Placements', 'actor'],
];

function panelDeps(): PanelDeps {
  return {
    state,
    registry,
    prefabs: prefabList,
    prefabsOnline,
    prefabPreview: prefabPreviewFor,
    actions: {
      armTemplate(id) {
        if (!id) {
          disarmStamp();
          return;
        }
        state.armedTemplate = id;
        state.armedPrefab = null;
        state.stampFlip = false;
        setTool('structure');
        toast(`armed ${id} — click the map to stamp · X mirrors · Esc puts it away`);
      },
      armPrefab(id) {
        if (!id) {
          disarmStamp();
          return;
        }
        void (async () => {
          try {
            state.armedPrefab = prefabFromJson(await fetchPrefab(id));
            state.armedTemplate = null;
            setTool('prefab');
            toast(`armed '${state.armedPrefab.name}' — click the map to stamp · Esc puts it away`);
          } catch (err) {
            toast(`prefab load failed: ${(err as Error).message}`, 4000, 'error');
          }
        })();
      },
      saveSelectionAsPrefab() {
        savePrefabDialog();
      },
      removePrefab(id) {
        if (!window.confirm(`Delete prefab '${id}' from the shared library? Every teammate loses it.`)) return;
        void (async () => {
          try {
            await deletePrefab(id);
            if (state.armedPrefab?.id === id) state.armedPrefab = null;
            await refreshPrefabs();
            toast(`deleted prefab '${id}'`);
          } catch (err) {
            toast(`delete failed: ${(err as Error).message}`, 4000);
          }
        })();
      },
      refreshPrefabs() {
        void refreshPrefabs(true);
      },
      selectPlacement,
      focusPlacement,
      removePlacement: removePlacementRef,
      editPlacement(ref, label, mutate) {
        zoneOp(label, mutate, { tiles: false });
      },
    },
  };
}

async function refreshPrefabs(announce = false): Promise<void> {
  try {
    prefabList = await listPrefabs();
    prefabsOnline = true;
    // Content may have changed under any id — re-render cards lazily.
    prefabPreviews.clear();
    prefabPreviewPending.clear();
    if (announce) toast(`prefab library: ${prefabList.length} saved`, 2600, 'success');
  } catch {
    prefabsOnline = false;
  }
  state.changed();
}

function buildPanels(): void {
  const tabs = $('side-tabs');
  tabs.innerHTML = '';
  for (const [id, label, icon] of TAB_LABELS) {
    const b = document.createElement('button');
    b.className = 'side-tab' + (state.tab === id ? ' active' : '');
    b.appendChild(iconImg(icon, 15));
    b.append(` ${label}`);
    b.onclick = () => {
      state.tab = id;
      state.changed();
    };
    tabs.appendChild(b);
  }
  $('tab-tiles').classList.toggle('hidden', state.tab !== 'tiles');
  $('tab-structures').classList.toggle('hidden', state.tab !== 'structures');
  $('tab-placements').classList.toggle('hidden', state.tab !== 'placements');
  if (state.tab === 'structures') buildStructuresPanel($('tab-structures'), panelDeps());
  if (state.tab === 'placements') buildPlacementsPanel($('tab-placements'), panelDeps());
}

function savePrefabDialog(): void {
  const r = selRect();
  if (!r) {
    toast('select the region first (M), then save it as a prefab');
    return;
  }
  showModal((body, close) => {
    const w = r.x1 - r.x0 + 1;
    const h = r.y1 - r.y0 + 1;
    body.innerHTML = `
      <h2>Save selection as prefab</h2>
      <p class="muted">Captures the ${w}×${h} selection — all three tile layers plus every
      portal, spawn cluster, and actor standing inside it — into the shared library.</p>
      <div class="form-grid">
        <label>id <input id="pf-id" placeholder="guard_post" pattern="[a-z][a-z0-9_-]*"></label>
        <label>name <input id="pf-name" placeholder="Guard Post"></label>
      </div>`;
    const go = document.createElement('button');
    go.textContent = 'Save to library';
    go.className = 'primary';
    go.onclick = () => {
      const id = ($('pf-id') as HTMLInputElement).value.trim();
      const name = ($('pf-name') as HTMLInputElement).value.trim() || id;
      if (!/^[a-z][a-z0-9_-]*$/.test(id)) {
        toast('prefab id must be lowercase [a-z0-9_-]');
        return;
      }
      const z = state.zone;
      const def: PrefabDef = {
        id,
        name,
        width: w,
        height: h,
        ground: new Uint16Array(w * h),
        detail: new Uint16Array(w * h),
        elev: new Int8Array(w * h),
        portals: [],
        spawns: [],
        actorSpawns: [],
      };
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const src = idx(r.x0 + x, r.y0 + y);
          def.ground[y * w + x] = z.ground[src]!;
          def.detail[y * w + x] = z.detail[src]!;
          def.elev[y * w + x] = z.elev![src]!;
        }
      }
      const contains = (wx: number, wy: number): boolean => {
        const lx = wx - z.origin.x;
        const ly = wy - z.origin.y;
        return lx >= r.x0 && lx <= r.x1 && ly >= r.y0 && ly <= r.y1;
      };
      for (const p of z.portals ?? []) {
        if (contains(p.x, p.y)) {
          def.portals.push({
            dx: p.x - z.origin.x - r.x0,
            dy: p.y - z.origin.y - r.y0,
            ...(p.delve ? { delve: true } : {}),
            ...(p.dest ? { dest: { ...p.dest } } : {}),
          });
        }
      }
      for (const s of z.spawns ?? []) {
        if (contains(s.x, s.y)) {
          def.spawns.push({
            dx: s.x - z.origin.x - r.x0,
            dy: s.y - z.origin.y - r.y0,
            npc: s.npc,
            radius: s.radius,
            count: s.count,
            ...(s.level !== undefined ? { level: s.level } : {}),
            ...(s.name !== undefined ? { name: s.name } : {}),
          });
        }
      }
      for (const a of z.actorSpawns ?? []) {
        if (contains(a.x, a.y)) {
          def.actorSpawns.push({
            dx: a.x - z.origin.x - r.x0,
            dy: a.y - z.origin.y - r.y0,
            actor: a.actor,
            ...(a.dir !== undefined ? { dir: a.dir } : {}),
            ...(a.routine !== undefined ? { routine: a.routine } : {}),
          });
        }
      }
      const errors = validatePrefab(def);
      if (errors.length > 0) {
        toast(`prefab invalid: ${errors[0]}`, 4500);
        return;
      }
      void (async () => {
        try {
          await savePrefab(prefabToJson(def));
          await refreshPrefabs();
          const n = def.portals.length + def.spawns.length + def.actorSpawns.length;
          toast(`saved '${name}' to the library${n > 0 ? ` (${n} placement${n > 1 ? 's' : ''} captured)` : ''}`);
          close();
        } catch (err) {
          toast(`save failed: ${(err as Error).message}`, 4500);
        }
      })();
    };
    body.appendChild(go);
  });
}

// -------------------------------------------------------- status bar

function setServerStatus(text: string): void {
  $('st-server').textContent = text;
}

function updateStatus(): void {
  if (mode === 'world') {
    $('st-tile').textContent = '';
    $('dirty-dot').classList.toggle('on', world.ws.dirty);
    world.syncZoom();
    return;
  }
  const z = state.zone;
  const h = state.hover;
  $('st-coords').textContent = h
    ? `${h.x},${h.y}  (world ${z.origin.x + h.x},${z.origin.y + h.y})`
    : '—';
  if (h) {
    const i = idx(h.x, h.y);
    const g = tileDef(z.ground[i]!).name;
    const d = z.detail[i]!;
    const e = z.elev![i]!;
    $('st-tile').textContent =
      g + (d ? ` · detail ${d}` : '') + (e ? ` · lvl ${e > 0 ? '+' : ''}${e}` : '');
  } else {
    $('st-tile').textContent = '';
  }
  const pct = `${Math.round((view.scale * 100) / 32)}%`;
  $('st-zoom').textContent = pct;
  $('zoom-pct').textContent = pct;
  $('dirty-dot').classList.toggle('on', state.dirty);
}

function showValidation(text: string, ok: boolean): void {
  const panel = $('validation');
  panel.classList.remove('hidden');
  panel.className = ok ? 'ok' : 'bad';
  panel.textContent = (ok ? '✓ ' : '✕ ') + text;
}

// ------------------------------------------------------------ wiring

$('btn-new').onclick = () => newZoneDialog();
$('btn-open').onclick = () => void openBrowser();
$('btn-save').onclick = () => {
  if (mode === 'world') void world.save();
  else void saveToServer();
};
$('btn-validate').onclick = () => {
  if (mode === 'world') {
    const res = world.validate();
    showValidation(res.text, res.ok);
    return;
  }
  const v = validateZone(state.zone);
  showValidation(
    v.ok
      ? v.fenceAdded > 0
        ? `valid — auto-fence would add ${v.fenceAdded} cliff tiles on save`
        : 'zone is valid'
      : v.error!,
    v.ok,
  );
};
$('zone-chip').onclick = () => {
  if (mode === 'world') world.view.fitWorld();
  else zonePropertiesDialog();
};
$('zoom-fit').onclick = () => {
  if (mode === 'world') {
    world.view.fitWorld();
    world.syncZoom();
  } else view.fitZone();
};
$('zoom-in').onclick = () => zoomFromCenter(1.25);
$('zoom-out').onclick = () => zoomFromCenter(1 / 1.25);
$('zoom-pct').onclick = () => {
  if (mode === 'world') {
    const rect = worldCanvas.getBoundingClientRect();
    world.view.zoomAt(rect.width / 2, rect.height / 2, 8 / world.view.scale);
    world.syncZoom();
    return;
  }
  const rect = canvas.getBoundingClientRect();
  view.zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 32 / view.scale);
  updateStatus();
};

function zoomFromCenter(factor: number): void {
  if (mode === 'world') {
    const rect = worldCanvas.getBoundingClientRect();
    world.view.zoomAt(rect.width / 2, rect.height / 2, factor);
    world.syncZoom();
    return;
  }
  const rect = canvas.getBoundingClientRect();
  view.zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  updateStatus();
}
$('btn-export').onclick = () => {
  const isWorld = mode === 'world';
  if (isWorld && !world.ws.geo) return;
  const json = isWorld
    ? JSON.stringify(world.ws.geo, null, 2)
    : JSON.stringify(zoneToJson(state.zone), null, 2);
  const name = isWorld ? 'geography.json' : `${state.zone.id}.json`;
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`exported ${name}`);
};
const fileInput = $('file-load') as HTMLInputElement;
$('btn-import').onclick = () => fileInput.click();
fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
    if (mode === 'world' || (Array.isArray(parsed.routes) && Array.isArray(parsed.planned))) {
      world.importDraft(parsed);
      setMode('world');
      toast(`imported ${file.name} as the world plan draft — Save makes it live`);
    } else {
      adoptZone(zoneFromJson(parsed as unknown as ZoneJson), false);
      toast(`imported ${file.name}`);
    }
  } catch (err) {
    toast(`import failed: ${(err as Error).message}`, 4000);
  }
  fileInput.value = '';
});
$('btn-help').onclick = () =>
  showModal((body) => {
    body.innerHTML = `
      <h2>Map Studio</h2>
      <p><b>The World view</b> is the whole plan on one canvas — every zone, road, landmark,
      hearth, and frontier site, rendered through the real worldgen. <b>Save</b> there PUTs the
      geography document: the server regenerates terrain everywhere, restreams every client,
      and re-surveys the frontier ledger. <b>The Zone view</b> edits one zone tile-by-tile;
      Save writes <code>data/maps/&lt;id&gt;.json</code> and hot-swaps it into the running world.</p>
      <ul class="help">
        <li><b>World ⇄ Zone</b> — W / Z, or the segment in the topbar; double-click a zone
            on the world map to step in</li>
        <li><b>World tools</b> — Survey V · Road R · Trail T · Landmark N · Hearth A ·
            Plan ground P; drag things to move them, the carve re-cuts when you drop</li>
        <li><b>Roads</b> — click waypoints, Enter/double-click opens the way; Alt-click a
            segment adds a waypoint; Delete removes a point (a 2-point route dissolves)</li>
        <li><b>The frontier</b> — click a diamond to administer its cell: open, re-roll,
            force an archetype, dissolve, or <i>adopt</i> it into an authored zone you own</li>
        <li><b>Lenses</b> — toggle zones/roads/landmarks/hearths/frontier/danger overlays</li>
        <li><b>Zone tools</b> — Paint B · Erase E · Line L · Rect R · Ellipse O · Fill G ·
            Road T · Select M · Picker I; layers 1/2/3; [ ] brush size</li>
        <li><b>Everywhere</b> — space/middle-drag pans · wheel zooms · 0 fits ·
            ⌘Z undoes · ⌘S saves · ⌘O opens · Esc cancels the most-transient thing</li>
        <li><b>Elevation</b> — paint levels, add stone-stair tiles on straight rims;
            Save runs the cliff auto-fence and stair/reachability laws</li>
      </ul>`;
  });

state.onChange(() => {
  buildToolbar();
  buildOptions();
  palette?.rebuild();
  buildPanels();
  syncZoneChip();
  updateStatus();
  mmDirty = true;
});

// ----------------------------------------------------------- minimap

const minimap = $('minimap') as HTMLCanvasElement;
const MM_SIZE = 168;
let mmBitmap: HTMLCanvasElement | null = null;
let mmDirty = true;
let mmLastBuild = 0;
let mmDragging = false;

/** Tile id → rgb, decoded once. */
const mmColors = new Map<number, [number, number, number]>();
function mmColor(t: number): [number, number, number] {
  let c = mmColors.get(t);
  if (!c) {
    const hex = tileDef(t).color;
    const n = parseInt(hex.slice(1), 16);
    c = [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
    mmColors.set(t, c);
  }
  return c;
}

function minimapRebuild(): void {
  const z = state.zone;
  const bmp = document.createElement('canvas');
  bmp.width = z.width;
  bmp.height = z.height;
  const ctx = bmp.getContext('2d')!;
  const img = ctx.createImageData(z.width, z.height);
  for (let i = 0; i < z.ground.length; i++) {
    const [r, g, b] = mmColor(z.ground[i]!);
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  mmBitmap = bmp;
}

/** Screen box the zone occupies inside the minimap canvas. */
function mmLayout(): { x: number; y: number; w: number; h: number; s: number } {
  const z = state.zone;
  const s = Math.min(MM_SIZE / z.width, MM_SIZE / z.height);
  const w = z.width * s;
  const h = z.height * s;
  return { x: (MM_SIZE - w) / 2, y: (MM_SIZE - h) / 2, w, h, s };
}

function minimapDraw(nowMs: number): void {
  if (mmDirty && nowMs - mmLastBuild > 350) {
    minimapRebuild();
    mmDirty = false;
    mmLastBuild = nowMs;
  }
  if (!mmBitmap) return;
  const dpr = window.devicePixelRatio || 1;
  if (minimap.width !== MM_SIZE * dpr) {
    minimap.width = MM_SIZE * dpr;
    minimap.height = MM_SIZE * dpr;
  }
  const ctx = minimap.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, MM_SIZE, MM_SIZE);
  const box = mmLayout();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mmBitmap, box.x, box.y, box.w, box.h);
  // The viewport window.
  const z = state.zone;
  const vx0 = -view.panX / view.scale;
  const vy0 = -view.panY / view.scale;
  const vw = canvas.clientWidth / view.scale;
  const vh = canvas.clientHeight / view.scale;
  ctx.strokeStyle = '#f2c94c';
  ctx.lineWidth = 1.25;
  ctx.strokeRect(
    box.x + Math.max(0, vx0) * box.s,
    box.y + Math.max(0, vy0) * box.s,
    Math.min(vw, z.width - Math.max(0, vx0)) * box.s,
    Math.min(vh, z.height - Math.max(0, vy0)) * box.s,
  );
}

function mmJump(e: MouseEvent): void {
  const rect = minimap.getBoundingClientRect();
  const box = mmLayout();
  const tx = (e.clientX - rect.left - box.x) / box.s;
  const ty = (e.clientY - rect.top - box.y) / box.s;
  view.centerOn(tx, ty);
  updateStatus();
}

minimap.addEventListener('mousedown', (e) => {
  mmDragging = true;
  mmJump(e);
});
window.addEventListener('mousemove', (e) => {
  if (mmDragging) mmJump(e);
});
window.addEventListener('mouseup', () => {
  mmDragging = false;
});

// ---------------------------------------------------------- the world

const worldCanvas = document.getElementById('world-canvas') as HTMLCanvasElement;

const world = new WorldMode({
  canvas: worldCanvas,
  panelHost: $('world-panel'),
  toast,
  openZone: (id) => void openZoneById(id),
  newZone: (spec) => {
    const z = newZone(spec.id, spec.name, spec.w, spec.h);
    z.origin = { x: spec.x, y: spec.y };
    adoptZone(z, false);
    toast(`new ${spec.w}×${spec.h} zone '${spec.id}' on its planned ground — Save stands it up live`);
  },
  showModal,
  setHint: (text) => {
    $('st-hint').textContent = text;
  },
  setCoords: (text) => {
    $('st-coords').textContent = text;
  },
  setZoom: (text) => {
    $('st-zoom').textContent = text;
    $('zoom-pct').textContent = text;
  },
  refreshMaps: async () => {
    try {
      const l = await listMaps();
      world.ws.setZones(l.zones);
    } catch {
      /* offline — the next action retries */
    }
  },
});

world.ws.onChange(() => {
  if (mode !== 'world') return;
  buildToolbar();
  syncZoneChip();
  updateStatus();
});

async function openZoneById(id: string): Promise<void> {
  try {
    const json = await fetchZone(id);
    adoptZone(zoneFromJson(json), true);
    noteRecentZone(id);
    if (id.startsWith('poi:')) {
      toast('a composed frontier site — look freely; adopt it from the World view to make it yours', 4600);
    } else {
      toast(`opened '${id}'`);
    }
  } catch (err) {
    toast(`open failed: ${(err as Error).message}`, 4000);
  }
}

const WORLD_TOOLS: Array<{ id: WorldTool; icon: string; name: string; key: string; hint: string }> = [
  { id: 'select', icon: 'wselect', name: 'Survey', key: 'V', hint: 'Click to inspect · drag to move · drag empty land to pan · double-click a zone to step in' },
  { id: 'route', icon: 'wroute', name: 'Road', key: 'R', hint: 'Click waypoints · Enter or double-click opens the road · the land grades itself under it' },
  { id: 'trail', icon: 'wtrail', name: 'Trail', key: 'T', hint: 'Click waypoints · a bare-dirt hunter’s track — unlit, barely cleared' },
  { id: 'site', icon: 'wsite', name: 'Landmark', key: 'N', hint: 'Pin an authored wild site — a waystation, a den, a lamp' },
  { id: 'anchor', icon: 'wanchor', name: 'Hearth', key: 'A', hint: 'Light a hearth or haven — its ring is the safe ground' },
  { id: 'planned', icon: 'wplanned', name: 'Plan ground', key: 'P', hint: 'Drag out the rect a future town will claim' },
];

function buildWorldToolbar(): void {
  const bar = $('toolbar');
  bar.innerHTML = '';
  const cap = document.createElement('div');
  cap.className = 'tool-caption';
  cap.textContent = 'World';
  bar.appendChild(cap);
  for (const t of WORLD_TOOLS) {
    const b = document.createElement('button');
    b.className = 'tool' + (world.ws.tool === t.id ? ' active' : '');
    b.title = `${t.name} (${t.key})\n${t.hint}`;
    b.appendChild(iconImg(t.icon, 22));
    const key = document.createElement('span');
    key.className = 'key';
    key.textContent = t.key;
    b.appendChild(key);
    b.onclick = () => world.setTool(t.id);
    bar.appendChild(b);
  }
  const spec = WORLD_TOOLS.find((t) => t.id === world.ws.tool);
  if (spec) $('st-hint').textContent = `${spec.name} — ${spec.hint}`;
}

function setMode(m: StudioMode): void {
  if (mode === m) return;
  mode = m;
  const isWorld = m === 'world';
  $('mode-world').classList.toggle('active', isWorld);
  $('mode-zone').classList.toggle('active', !isWorld);
  canvas.classList.toggle('hidden', isWorld);
  worldCanvas.classList.toggle('hidden', !isWorld);
  $('minimap-wrap').classList.toggle('hidden', isWorld);
  $('world-panel').classList.toggle('hidden', !isWorld);
  $('tool-options').classList.toggle('hidden', isWorld);
  $('side-tabs').classList.toggle('hidden', isWorld);
  $('tab-tiles').classList.toggle('hidden', isWorld || state.tab !== 'tiles');
  $('tab-structures').classList.toggle('hidden', isWorld || state.tab !== 'structures');
  $('tab-placements').classList.toggle('hidden', isWorld || state.tab !== 'placements');
  $('validation').classList.add('hidden');
  // Deep links follow the view: ?zone= names the open zone, absent
  // means the world. Refresh lands you where you were.
  const url = new URL(location.href);
  if (isWorld) url.searchParams.delete('zone');
  else url.searchParams.set('zone', state.zone.id);
  window.history.replaceState(null, '', url);
  if (!isWorld && pendingZoneFit) {
    view.fitZone();
    pendingZoneFit = false;
  }
  buildToolbar();
  syncZoneChip();
  updateStatus();
  if (isWorld) {
    world.setTool(world.ws.tool);
    world.syncZoom();
    world.ws.changed();
    // The zone we just left may have changed — its art on the map
    // and the server's zone list both re-read.
    world.view.invalidateZone(state.zone.id);
    void world.refresh();
  } else {
    state.changed();
  }
}

$('mode-world').onclick = () => setMode('world');
$('mode-zone').onclick = () => setMode('zone');

// ------------------------------------------------------------- boot

palette = new PaletteUI($('palette'), state, {
  onPickTile: (t) => {
    state.brushTile = t;
    state.layer = 'ground';
    if (state.tool !== 'paint' && state.tool !== 'line' && state.tool !== 'rect' &&
        state.tool !== 'ellipse' && state.tool !== 'fill' && state.tool !== 'road') {
      state.tool = 'paint';
    }
    palette.noteUse(t);
    state.changed();
  },
  onPickDetail: (d) => {
    state.brushDetail = d;
    state.layer = 'detail';
    if (state.tool === 'select' || state.tool === 'spawn' || state.tool === 'picker') {
      state.tool = 'paint';
    }
    state.changed();
  },
});

buildToolbar();
buildOptions();

async function boot(): Promise<void> {
  // Live pick lists + the shared prefab library, in parallel with the
  // zone list; content-registry fallbacks already stand if offline.
  void fetchRegistry()
    .then((r) => {
      registry = r;
      state.changed();
    })
    .catch(() => {});
  void refreshPrefabs();
  // The world wakes regardless of which view boots on stage.
  void world.boot().then(() => {
    if (mode === 'world') {
      syncZoneChip();
      updateStatus();
    }
  });
  const params = new URLSearchParams(location.search);
  const wanted = params.get('zone');
  try {
    const list = await listMaps();
    setServerStatus('connected');
    const pick =
      (wanted && list.zones.find((z) => z.id === wanted)) ??
      list.zones.find((z) => z.id === 'dawnmead') ??
      list.zones[0];
    if (pick) {
      // A named zone deep-links straight into the zone editor; the
      // bare studio opens on the world — the home screen.
      adoptZone(zoneFromJson(await fetchZone(pick.id)), true, { stay: !wanted });
      if (wanted) toast(`opened '${pick.id}' from server`);
    }
  } catch {
    setServerStatus('offline — local mode (Import/Export only)');
    adoptZone(buildDawnmead(), false, { stay: true });
  }
  if (!params.get('zone')) setMode('world');
  const at = params.get('at');
  if (at) {
    const [x, y] = at.split(',').map(Number);
    if (Number.isFinite(x) && Number.isFinite(y)) world.view.centerOn(x!, y!, 2);
  }
}

void boot();

function frame(nowMs: number): void {
  if (mode === 'world') {
    world.frame();
  } else {
    view.render(nowMs);
    minimapDraw(nowMs);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Dev handle for Playwright audits, same law as the game's dcGame.
Object.assign(window, {
  dcEditor: { state, view, history, validateZone, world, setMode: (m: StudioMode) => setMode(m) },
});
