/**
 * EDITOR OPS — the document verbs of the zone editor, extracted from
 * the v1 god module. Everything that mutates the zone (brush strokes,
 * shapes, stamps, placements, clipboard, road, undo) lives here as one
 * testable seam; the pointer machine, the keyboard, the rail, and the
 * ⌘K palette are all just hands reaching for these verbs.
 */

import { Detail, Tile, tileDef } from '@arx/shared';
import {
  STRUCTURE_TEMPLATES,
  SURFACE_PLANE_ID,
  flipTemplate,
  templateHeight,
  templateWidth,
  type StructureTemplate,
  type ZoneDef,
} from '@arx/content';
import { History, StrokeRecorder, cloneZone } from '../editor/history.js';
import {
  clusterEdgeAt,
  deletePlacement,
  movePlacement,
  placementAt,
  placementPos,
} from '../editor/placements.js';
import { GHOST_SKIP } from '../editor/render.js';
import type { EditorState, PlacementRef, ToolId } from '../editor/state.js';
import type { Viewport } from './viewport.js';
import {
  ellipseCells,
  floodCells,
  footprint,
  polygonCells,
  rectCells,
  roadCells,
  thickLine,
  wallShellCells,
  type Pt,
} from '../editor/tools.js';
import type { RegistrySnapshot } from '../editor/api.js';
import { toast } from '../studio2/kit.js';
import { TOOL_SPECS } from './commands.js';
import { stairLegalAt } from './laws.js';

export type { Pt };

/** Small deterministic hash → [0,1) (the scatter die). */
function hash01(a: number, b: number, c = 0): number {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export interface ClipRegion {
  w: number;
  h: number;
  ground: Uint16Array;
  detail: Uint16Array;
  elev: Int8Array;
  /** Lasso/wand captures: 1 = the cell travels, 0 = a hole. */
  mask?: Uint8Array;
}

export class EditorOps {
  /** Road tool waypoints-in-progress. */
  roadPts: Pt[] = [];
  /** ⌘V armed: next click stamps the clipboard. */
  pasteArmed = false;
  /**
   * PATROL EDITING (Phase 3): while set, canvas clicks append WORLD
   * waypoints to this cluster's patrol; Enter commits, Esc restores.
   */
  patrolEdit: { index: number; points: Array<{ x: number; y: number }> } | null = null;
  /** Polygon tool corners-in-progress (LOCAL tiles). */
  polyPts: Pt[] = [];
  /** Per-stroke die for the scatter brush — same stroke, same holes. */
  private scatterSeed = 1;
  private pendingZoneBefore: ZoneDef | null = null;

  constructor(
    readonly state: EditorState,
    readonly view: Viewport,
    readonly history: History,
    private readonly getRegistry: () => RegistrySnapshot,
  ) {}

  // ------------------------------------------------------- geometry

  idx(x: number, y: number): number {
    return y * this.state.zone.width + x;
  }

  inBounds(x: number, y: number): boolean {
    const z = this.state.zone;
    return x >= 0 && y >= 0 && x < z.width && y < z.height;
  }

  markDirtyCells(pts: Pt[]): void {
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
    if (x0 <= x1) this.view.markDirty(x0, y0, x1, y1);
  }

  // ------------------------------------------------- brush & strokes

  /** Roll a new die for the coming stroke (scatter's hole pattern). */
  newStrokeSeed(): void {
    this.scatterSeed = (Math.random() * 0xffff) | 1;
    this.stairsBlocked = null;
  }

  /** The last stroke's refused-stair reason (one toast at commit). */
  stairsBlocked: string | null = null;

  /** THE STAIR ARMS ONLY ON LEGAL GROUND — the reason, or null. */
  stairReasonAt(x: number, y: number): string | null {
    return stairLegalAt(this.state.zone, x, y);
  }

  applyBrush(rec: StrokeRecorder, x: number, y: number, erase: boolean): void {
    if (!this.inBounds(x, y)) return;
    const s = this.state;
    // THE SCATTER BRUSH: each cell rolls against the density — organic
    // dressing (flowers, tufts, pebbles) without cell-by-cell labor.
    if (!erase && s.brushMode === 'scatter' && s.tool === 'paint') {
      if (hash01(x * 3 + this.scatterSeed, y * 7, this.scatterSeed) > s.scatterDensity) return;
    }
    const i = this.idx(x, y);
    const z = s.zone;
    const c = rec.record(i, z.ground[i]!, z.detail[i]!, z.elev![i]!);
    // THE PATTERN BRUSH: the clipboard is the nib, tiled world-stable —
    // fences, hedgerows, and crop rows paint as fabric, not cells.
    if (!erase && s.brushMode === 'pattern' && s.clip && s.tool === 'paint') {
      const p = s.clip;
      const px = ((x % p.w) + p.w) % p.w;
      const py = ((y % p.h) + p.h) % p.h;
      const pi = py * p.w + px;
      if (p.mask && p.mask[pi] === 0) return;
      const g = p.ground[pi]!;
      if (g === GHOST_SKIP) return;
      c.g1 = g;
      z.ground[i] = g;
      c.d1 = p.detail[pi]!;
      z.detail[i] = c.d1;
      c.e1 = p.elev[pi]!;
      z.elev![i] = c.e1;
      return;
    }
    if (s.layer === 'ground') {
      // THE STAIR ARMS ONLY ON LEGAL GROUND: a Ramp refuses to land
      // where the save-time law would throw — the reason reaches the
      // status bar live and the commit toast once.
      if (!erase && s.brushTile === Tile.Ramp) {
        const why = stairLegalAt(z, x, y);
        if (why !== null) {
          this.stairsBlocked = why;
          return;
        }
      }
      c.g1 = erase ? Tile.Grass : s.brushTile;
      z.ground[i] = c.g1;
    } else if (s.layer === 'detail') {
      c.d1 = erase ? Detail.None : s.brushDetail;
      z.detail[i] = c.d1;
    } else {
      c.e1 = erase ? 0 : Math.max(-2, Math.min(3, s.elevLevel));
      z.elev![i] = c.e1;
    }
  }

  commitStroke(rec: StrokeRecorder, label: string, pts: Pt[]): void {
    if (this.stairsBlocked) {
      toast(`stairs ${this.stairsBlocked}`, 4200, 'error');
      this.stairsBlocked = null;
    }
    const op = rec.finish(label);
    if (!op) return;
    this.history.push(op);
    this.state.dirty = true;
    this.markDirtyCells(pts);
    this.state.changed();
  }

  /** One-shot cell application (fill, shapes, road). */
  applyCellsOp(label: string, pts: Pt[], erase = false): void {
    const rec = new StrokeRecorder();
    for (const p of pts) this.applyBrush(rec, p.x, p.y, erase);
    this.commitStroke(rec, label, pts);
  }

  // ------------------------------------------------------- zone ops

  /**
   * Structural zone op (resize, origin, placements): full snapshots.
   * Placement-only edits pass tiles:false and skip the ground rebake.
   */
  zoneOp(label: string, mutate: (z: ZoneDef) => void, opts?: { tiles?: boolean }): void {
    const before = cloneZone(this.state.zone);
    mutate(this.state.zone);
    this.history.push({ kind: 'zone', label, before, after: cloneZone(this.state.zone) });
    this.state.dirty = true;
    if (opts?.tiles !== false) this.view.markAllDirty();
    this.state.changed();
  }

  beginZoneGesture(): void {
    this.pendingZoneBefore = cloneZone(this.state.zone);
  }

  cancelZoneGesture(): void {
    this.pendingZoneBefore = null;
  }

  endZoneGesture(label: string, opts?: { tiles?: boolean }): void {
    if (!this.pendingZoneBefore) return;
    this.history.push({
      kind: 'zone',
      label,
      before: this.pendingZoneBefore,
      after: cloneZone(this.state.zone),
    });
    this.pendingZoneBefore = null;
    this.state.dirty = true;
    if (opts?.tiles !== false) this.view.markAllDirty();
    this.state.changed();
  }

  /** Jump the history cursor to `target` (the History panel's click). */
  jumpHistory(target: number): void {
    let guard = 400;
    while (this.history.cursor > target && guard-- > 0) {
      const r = this.history.undo(this.state.zone);
      if (!r) break;
      if (r.zone !== this.state.zone) this.state.zone = r.zone;
    }
    while (this.history.cursor < target && guard-- > 0) {
      const r = this.history.redo(this.state.zone);
      if (!r) break;
      if (r.zone !== this.state.zone) this.state.zone = r.zone;
    }
    this.view.markAllDirty();
    this.state.dirty = true;
    this.state.changed();
  }

  undoRedo(dir: 'undo' | 'redo'): void {
    const res = dir === 'undo' ? this.history.undo(this.state.zone) : this.history.redo(this.state.zone);
    if (!res) {
      toast(`nothing to ${dir}`);
      return;
    }
    if (res.zone !== this.state.zone) this.state.zone = res.zone;
    this.view.markAllDirty(); // cell ops know their rect, but cheap & safe
    this.state.dirty = true;
    this.state.changed();
    toast(`${dir}: ${res.label}`);
  }

  // ------------------------------------------------------ the tools

  setTool(tool: ToolId): void {
    this.state.tool = tool;
    if (tool !== 'road') {
      this.roadPts = [];
      this.view.preview = null;
    }
    if (tool !== 'polygon') this.polyPts = [];
    if (tool !== 'structure' && tool !== 'prefab') this.view.ghost = null;
    const spec = TOOL_SPECS.get(tool);
    if (spec?.tab) this.state.tab = spec.tab;
    else if (
      tool === 'paint' || tool === 'fill' || tool === 'line' ||
      tool === 'rect' || tool === 'ellipse' || tool === 'road'
    ) {
      this.state.tab = 'tiles';
    }
    this.state.changed();
  }

  /** Put an armed structure/prefab stamp away without placing it. */
  disarmStamp(quiet = false): boolean {
    if (this.state.armedTemplate === null && this.state.armedPrefab === null) return false;
    this.state.armedTemplate = null;
    this.state.armedPrefab = null;
    this.view.ghost = null;
    this.state.changed();
    if (!quiet) toast('stamp put away');
    return true;
  }

  pickAt(x: number, y: number): void {
    if (!this.inBounds(x, y)) return;
    const i = this.idx(x, y);
    const z = this.state.zone;
    const d = z.detail[i]! as Detail;
    const e = z.elev![i]!;
    if (this.state.layer === 'detail' && d !== Detail.None) {
      this.state.brushDetail = d;
    } else if (this.state.layer === 'elev' && e !== 0) {
      this.state.elevLevel = e;
    } else {
      this.state.brushTile = z.ground[i]! as Tile;
      this.state.layer = 'ground';
    }
    this.state.changed();
    toast(`picked ${tileDef(z.ground[i]!).name}`);
  }

  setPreview(pts: Pt[], erase: boolean, dims?: { x: number; y: number; w: number; h: number }): void {
    const indices = new Set<number>();
    for (const p of pts) if (this.inBounds(p.x, p.y)) indices.add(this.idx(p.x, p.y));
    this.view.preview = {
      indices,
      color: erase
        ? 'rgba(224, 100, 86, 0.35)'
        : this.state.layer === 'ground'
          ? 'rgba(233, 236, 243, 0.30)'
          : 'rgba(140, 210, 240, 0.30)',
      ...(dims ? { dims } : {}),
    };
  }

  shapeCells(d: { anchor: Pt; cur: Pt }, shift: boolean): Pt[] {
    let { x: x1, y: y1 } = d.cur;
    if (shift) {
      const dx = x1 - d.anchor.x;
      const dy = y1 - d.anchor.y;
      const m = Math.max(Math.abs(dx), Math.abs(dy));
      x1 = d.anchor.x + Math.sign(dx || 1) * m;
      y1 = d.anchor.y + Math.sign(dy || 1) * m;
    }
    const s = this.state;
    if (s.tool === 'rect') return rectCells(d.anchor.x, d.anchor.y, x1, y1, s.shapeFill);
    if (s.tool === 'ellipse') return ellipseCells(d.anchor.x, d.anchor.y, x1, y1, s.shapeFill);
    return thickLine(d.anchor.x, d.anchor.y, x1, y1, s.brushSize, s.brushShape);
  }

  brushFootprint(x: number, y: number): Pt[] {
    return footprint(x, y, this.state.brushSize, this.state.brushShape);
  }

  strokeLine(a: Pt, b: Pt): Pt[] {
    return thickLine(a.x, a.y, b.x, b.y, this.state.brushSize, this.state.brushShape);
  }

  floodFrom(x: number, y: number): Pt[] {
    const z = this.state.zone;
    const sample =
      this.state.layer === 'ground'
        ? (i: number): number => z.ground[i]!
        : this.state.layer === 'detail'
          ? (i: number): number => z.detail[i]!
          : (i: number): number => z.elev![i]!;
    return floodCells(x, y, z.width, z.height, sample);
  }

  // ------------------------------------------------------- polygon

  polygonPreviewCells(extra?: Pt): Pt[] {
    const pts = extra ? [...this.polyPts, extra] : this.polyPts;
    if (pts.length < 2) return pts.slice();
    return polygonCells(pts, pts.length >= 3 && this.state.shapeFill);
  }

  commitPolygon(): boolean {
    if (this.polyPts.length < 3) return false;
    const pts = polygonCells(this.polyPts, this.state.shapeFill).filter((p) =>
      this.inBounds(p.x, p.y),
    );
    this.applyCellsOp('polygon', pts);
    this.polyPts = [];
    this.view.preview = null;
    toast(`polygon laid (${pts.length} tiles)`);
    return true;
  }

  /** The lasso loop's filled region (its own path closes it). */
  lassoPreview(path: Pt[]): Pt[] {
    return polygonCells(path, true);
  }

  abandonPolygon(): boolean {
    if (this.polyPts.length === 0) return false;
    this.polyPts = [];
    this.view.preview = null;
    toast('polygon abandoned');
    return true;
  }

  // ----------------------------------------------------- wall shell

  /**
   * THE WALL SHELL (rect tool, walls mode): the outline in the chosen
   * wall tile with a doorway centered on the south face — a building's
   * bones in one drag. The doorway follows the wall's material.
   */
  applyWallShell(anchor: Pt, cur: Pt): void {
    const wall = this.state.brushTile;
    const door = wall === Tile.WallStone ? Tile.DoorwayStone : Tile.DoorwayWood;
    const cells = wallShellCells(anchor.x, anchor.y, cur.x, cur.y, wall, door).filter((c) =>
      this.inBounds(c.x, c.y),
    );
    const rec = new StrokeRecorder();
    const z = this.state.zone;
    const pts: Pt[] = [];
    for (const cell of cells) {
      const i = this.idx(cell.x, cell.y);
      const c = rec.record(i, z.ground[i]!, z.detail[i]!, z.elev![i]!);
      c.g1 = cell.tile;
      z.ground[i] = c.g1;
      pts.push({ x: cell.x, y: cell.y });
    }
    this.commitStroke(rec, 'wall shell', pts);
    toast('wall shell raised — the doorway faces south');
  }

  wallShellPreview(anchor: Pt, cur: Pt): Pt[] {
    return wallShellCells(anchor.x, anchor.y, cur.x, cur.y, 0, 0).map((c) => ({ x: c.x, y: c.y }));
  }

  // ------------------------------------------------- select helpers

  /** Contiguous same-value region under the cursor (the wand). */
  wandCells(x: number, y: number): Pt[] {
    if (!this.inBounds(x, y)) return [];
    return this.floodFrom(x, y);
  }

  /** EVERY cell matching the value under the cursor (select-same). */
  selectSameCells(x: number, y: number): Pt[] {
    if (!this.inBounds(x, y)) return [];
    const z = this.state.zone;
    const layer = this.state.layer;
    const sample =
      layer === 'ground'
        ? (i: number): number => z.ground[i]!
        : layer === 'detail'
          ? (i: number): number => z.detail[i]!
          : (i: number): number => z.elev![i]!;
    const want = sample(this.idx(x, y));
    const out: Pt[] = [];
    for (let ty = 0; ty < z.height; ty++) {
      for (let tx = 0; tx < z.width; tx++) {
        if (sample(ty * z.width + tx) === want) out.push({ x: tx, y: ty });
      }
    }
    return out;
  }

  // ---------------------------------------------------------- road

  roadPreviewCells(extra?: Pt): Pt[] {
    return roadCells(extra ? [...this.roadPts, extra] : this.roadPts, this.state.roadWidth);
  }

  commitRoad(): void {
    const pts = this.roadPreviewCells().filter((p) => this.inBounds(p.x, p.y));
    // Roads paint the active ground brush — Path by default.
    const prevLayer = this.state.layer;
    this.state.layer = 'ground';
    this.applyCellsOp('road', pts);
    this.state.layer = prevLayer;
    this.roadPts = [];
    this.view.preview = null;
    toast(`road laid (${pts.length} tiles)`);
  }

  abandonRoad(): boolean {
    if (this.roadPts.length === 0) return false;
    this.roadPts = [];
    this.view.preview = null;
    toast('road abandoned');
    return true;
  }

  // ----------------------------------------------------- selection

  selRect(): { x0: number; y0: number; x1: number; y1: number } | null {
    const s = this.state.selection;
    if (!s) return null;
    return {
      x0: Math.min(s.x0, s.x1),
      y0: Math.min(s.y0, s.y1),
      x1: Math.max(s.x0, s.x1),
      y1: Math.max(s.y0, s.y1),
    };
  }

  /** Is this LOCAL cell inside the live selection (mask-aware)? */
  inSelection(x: number, y: number): boolean {
    const r = this.selRect();
    if (!r || x < r.x0 || x > r.x1 || y < r.y0 || y > r.y1) return false;
    const mask = this.state.selectionMask;
    return !mask || mask.has(this.idx(x, y));
  }

  /** Every selected LOCAL cell (the rect, refined by the mask). */
  selectionCells(): Pt[] {
    const r = this.selRect();
    if (!r) return [];
    const mask = this.state.selectionMask;
    const out: Pt[] = [];
    for (let y = r.y0; y <= r.y1; y++) {
      for (let x = r.x0; x <= r.x1; x++) {
        if (!this.inBounds(x, y)) continue;
        if (mask && !mask.has(this.idx(x, y))) continue;
        out.push({ x, y });
      }
    }
    return out;
  }

  /** Adopt an arbitrary cell set as the selection (lasso/wand/same). */
  setSelectionFromCells(pts: Pt[]): void {
    const inPts = pts.filter((p) => this.inBounds(p.x, p.y));
    if (inPts.length === 0) {
      this.clearSelection();
      return;
    }
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    const mask = new Set<number>();
    for (const p of inPts) {
      x0 = Math.min(x0, p.x);
      y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x);
      y1 = Math.max(y1, p.y);
      mask.add(this.idx(p.x, p.y));
    }
    this.state.selection = { x0, y0, x1, y1 };
    // A full rect needs no mask — plain marquee semantics downstream.
    const full = (x1 - x0 + 1) * (y1 - y0 + 1) === mask.size;
    this.state.selectionMask = full ? null : mask;
    this.state.changed();
  }

  clearSelection(): void {
    this.state.selection = null;
    this.state.selectionMask = null;
    this.state.changed();
  }

  copySelection(): boolean {
    const r = this.selRect();
    if (!r) return false;
    const w = r.x1 - r.x0 + 1;
    const h = r.y1 - r.y0 + 1;
    const z = this.state.zone;
    const mask = this.state.selectionMask;
    const buf: ClipRegion = {
      w,
      h,
      ground: new Uint16Array(w * h),
      detail: new Uint16Array(w * h),
      elev: new Int8Array(w * h),
      ...(mask ? { mask: new Uint8Array(w * h) } : {}),
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const src = this.idx(r.x0 + x, r.y0 + y);
        const di = y * w + x;
        const inMask = !mask || mask.has(src);
        // Holes carry the skip sentinel so every ghost path draws
        // them transparent; stampBuffer skips them by mask anyway.
        buf.ground[di] = inMask ? z.ground[src]! : GHOST_SKIP;
        buf.detail[di] = inMask ? z.detail[src]! : 0;
        buf.elev[di] = inMask ? z.elev![src]! : 0;
        if (buf.mask) buf.mask[di] = inMask ? 1 : 0;
      }
    }
    this.state.clip = buf;
    return true;
  }

  /** Clear the SELECTED cells (mask-aware) as one op. */
  clearSelectedCells(label: string): void {
    const pts = this.selectionCells();
    if (pts.length === 0) return;
    const rec = new StrokeRecorder();
    const z = this.state.zone;
    for (const p of pts) {
      const i = this.idx(p.x, p.y);
      const c = rec.record(i, z.ground[i]!, z.detail[i]!, z.elev![i]!);
      c.g1 = Tile.Grass;
      c.d1 = Detail.None;
      c.e1 = 0;
      z.ground[i] = c.g1;
      z.detail[i] = c.d1;
      z.elev![i] = c.e1;
    }
    this.commitStroke(rec, label, pts);
  }

  /** Legacy rect clear (delete-selection path keeps its name). */
  clearRegion(r: { x0: number; y0: number; x1: number; y1: number }, label: string): void {
    void r;
    this.clearSelectedCells(label);
  }

  /** Clear the selection's cells into an open recorder (a move's cut). */
  clearRegionInto(
    r: { x0: number; y0: number; x1: number; y1: number },
    rec: StrokeRecorder,
    pts: Pt[],
  ): void {
    void r;
    const z = this.state.zone;
    for (const p of this.selectionCells()) {
      const i = this.idx(p.x, p.y);
      const c = rec.record(i, z.ground[i]!, z.detail[i]!, z.elev![i]!);
      c.g1 = Tile.Grass;
      c.d1 = Detail.None;
      c.e1 = 0;
      z.ground[i] = c.g1;
      z.detail[i] = c.d1;
      z.elev![i] = c.e1;
      pts.push({ x: p.x, y: p.y });
    }
  }

  stampBuffer(buf: ClipRegion, at: Pt, rec: StrokeRecorder, pts: Pt[]): void {
    const z = this.state.zone;
    for (let y = 0; y < buf.h; y++) {
      for (let x = 0; x < buf.w; x++) {
        const bi = y * buf.w + x;
        // Lasso holes stay holes: masked-out cells never land.
        if (buf.mask && buf.mask[bi] === 0) continue;
        const lx = at.x + x;
        const ly = at.y + y;
        if (!this.inBounds(lx, ly)) continue;
        const i = this.idx(lx, ly);
        const c = rec.record(i, z.ground[i]!, z.detail[i]!, z.elev![i]!);
        c.g1 = buf.ground[bi]!;
        c.d1 = buf.detail[bi]!;
        c.e1 = buf.elev[bi]!;
        z.ground[i] = c.g1;
        z.detail[i] = c.d1;
        z.elev![i] = c.e1;
        pts.push({ x: lx, y: ly });
      }
    }
  }

  cutSelection(): void {
    if (this.copySelection()) {
      this.clearSelectedCells('cut selection');
      toast('cut selection');
    }
  }

  /**
   * THE SWAP — replace one ground tile with another inside the
   * selection, one undoable op. The quick "this fence was the wrong
   * wood" verb every marquee wants.
   */
  swapTiles(from: number, to: number): number {
    const pts = this.selectionCells();
    if (pts.length === 0 || from === to) return 0;
    const rec = new StrokeRecorder();
    const z = this.state.zone;
    let n = 0;
    const touched: Pt[] = [];
    for (const p of pts) {
      const i = this.idx(p.x, p.y);
      if (z.ground[i] !== from) continue;
      const c = rec.record(i, z.ground[i]!, z.detail[i]!, z.elev![i]!);
      c.g1 = to;
      z.ground[i] = to;
      touched.push(p);
      n++;
    }
    this.commitStroke(rec, `swap ${tileDef(from).name} → ${tileDef(to).name}`, touched);
    return n;
  }

  /** Ground-tile census of the selection (the swap dialog's menu). */
  selectionTileCensus(): Array<{ tile: number; count: number }> {
    const z = this.state.zone;
    const counts = new Map<number, number>();
    for (const p of this.selectionCells()) {
      const g = z.ground[this.idx(p.x, p.y)]!;
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([tile, count]) => ({ tile, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * THE NUDGE — arrow keys carry the selection's content (and the
   * selection itself) one tile over, one undoable op per press.
   */
  nudgeSelection(dx: number, dy: number): void {
    const r = this.selRect();
    if (!r || !this.copySelection()) return;
    const clip = this.state.clip!;
    const rec = new StrokeRecorder();
    const pts: Pt[] = [];
    this.clearRegionInto(r, rec, pts);
    this.stampBuffer(clip, { x: r.x0 + dx, y: r.y0 + dy }, rec, pts);
    this.commitStroke(rec, 'nudge selection', pts);
    this.state.selection = { x0: r.x0 + dx, y0: r.y0 + dy, x1: r.x1 + dx, y1: r.y1 + dy };
    if (this.state.selectionMask) {
      const w = this.state.zone.width;
      this.state.selectionMask = new Set(
        [...this.state.selectionMask].map((i) => i + dy * w + dx),
      );
    }
    this.state.changed();
  }

  armPaste(): boolean {
    if (!this.state.clip) return false;
    this.pasteArmed = true;
    toast('paste: click to place (Esc cancels)');
    return true;
  }

  cancelPaste(): boolean {
    if (!this.pasteArmed) return false;
    this.pasteArmed = false;
    this.view.ghost = null;
    toast('paste cancelled');
    return true;
  }

  // ---------------------------------------------------- placements

  selectPlacement(ref: PlacementRef | null): void {
    this.state.selected = ref;
    if (ref) this.state.tab = 'placements';
    this.state.changed();
  }

  focusPlacement(ref: PlacementRef): void {
    const pos = placementPos(this.state.zone, ref);
    if (pos) this.view.centerOn(pos.x, pos.y);
  }

  removePlacementRef(ref: PlacementRef): void {
    const label = `remove ${ref.kind}`;
    this.zoneOp(
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
      { tiles: ref.kind === 'portal' || ref.kind === 'sign' },
    );
    this.state.selected = null;
    this.state.changed();
    toast(`${label}d`);
  }

  /** Portal/sign markers carry their entrance tile: moving one swaps tiles. */
  carryPlacementTile(z: ZoneDef, fromW: Pt, toW: Pt): void {
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
    this.view.markDirty(fromW.x - z.origin.x, fromW.y - z.origin.y, fromW.x - z.origin.x, fromW.y - z.origin.y);
    this.view.markDirty(toW.x - z.origin.x, toW.y - z.origin.y, toW.x - z.origin.x, toW.y - z.origin.y);
  }

  /** Create the active placement tool's object at a local tile. */
  createPlacementAt(t: Pt): PlacementRef | null {
    const z = this.state.zone;
    if (!this.inBounds(t.x, t.y)) return null;
    const wx = z.origin.x + t.x;
    const wy = z.origin.y + t.y;
    const registry = this.getRegistry();
    switch (this.state.tool) {
      case 'portal': {
        z.portals ??= [];
        // THE WORLDS APART: a new portal drops you where you already
        // are — the zone's own plane, stated explicitly so the legacy
        // y-treaty never guesses for ground authored after the split.
        z.portals.push({
          x: wx,
          y: wy,
          dest: { x: z.origin.x, y: z.origin.y },
          destPlane: z.plane ?? SURFACE_PLANE_ID,
        });
        const i = t.y * z.width + t.x;
        z.ground[i] = Tile.PortalDown;
        this.view.markDirty(t.x, t.y, t.x, t.y);
        return { kind: 'portal', index: z.portals.length - 1 };
      }
      case 'cluster': {
        z.spawns ??= [];
        // A People-library pick names the next camp's creature.
        const npc = this.state.pendingNpc ?? registry.npcs[0]?.id ?? 'goblin';
        z.spawns.push({ npc, x: wx, y: wy, radius: 4, count: 3 });
        return { kind: 'cluster', index: z.spawns.length - 1 };
      }
      case 'actor': {
        z.actorSpawns ??= [];
        const actor = this.state.pendingActor ?? registry.actors[0]?.id;
        if (!actor) {
          toast('no actors in the registry — is the server running?', 3600);
          return null;
        }
        z.actorSpawns.push({ actor, x: wx, y: wy });
        return { kind: 'actor', index: z.actorSpawns.length - 1 };
      }
      case 'sign': {
        // Board AND words in one act — the tool never makes half the pair.
        z.signs ??= [];
        z.signs.push({ x: wx, y: wy, title: 'NEW SIGN' });
        const i = t.y * z.width + t.x;
        z.ground[i] = Tile.Signpost;
        this.view.markDirty(t.x, t.y, t.x, t.y);
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

  // ------------------------------------------------- patrol editing

  beginPatrolEdit(index: number): void {
    const sp = this.state.zone.spawns?.[index];
    if (!sp) return;
    this.patrolEdit = { index, points: (sp.patrol ?? []).map((p) => ({ ...p })) };
    this.selectPlacement({ kind: 'cluster', index });
    toast('patrol: click waypoints on the map · right-click removes the last · Enter keeps it · Esc abandons', 5200);
    this.state.changed();
  }

  addPatrolPoint(wx: number, wy: number): void {
    if (!this.patrolEdit) return;
    this.patrolEdit.points.push({ x: wx, y: wy });
    this.state.changed();
  }

  removeLastPatrolPoint(): void {
    if (!this.patrolEdit) return;
    this.patrolEdit.points.pop();
    this.state.changed();
  }

  commitPatrolEdit(): boolean {
    const edit = this.patrolEdit;
    if (!edit) return false;
    this.patrolEdit = null;
    this.zoneOp(
      'cluster patrol',
      (z) => {
        const sp = z.spawns?.[edit.index];
        if (!sp) return;
        if (edit.points.length >= 2) sp.patrol = edit.points;
        else delete sp.patrol; // one point is no round — absent stays absent
      },
      { tiles: false },
    );
    toast(edit.points.length >= 2 ? `patrol laid (${edit.points.length} waypoints)` : 'patrol cleared');
    return true;
  }

  cancelPatrolEdit(): boolean {
    if (!this.patrolEdit) return false;
    this.patrolEdit = null;
    this.state.changed();
    toast('patrol abandoned — the old round stands');
    return true;
  }

  clearPatrol(index: number): void {
    this.zoneOp(
      'clear patrol',
      (z) => {
        const sp = z.spawns?.[index];
        if (sp) delete sp.patrol;
      },
      { tiles: false },
    );
    toast('patrol cleared — the camp holds its ring');
  }

  placementHit(fx: number, fy: number): PlacementRef | null {
    return placementAt(this.state.zone, fx, fy);
  }

  /** A placement's current LOCAL tile position. */
  placementLocalPos(ref: PlacementRef): { x: number; y: number } | null {
    return placementPos(this.state.zone, ref);
  }

  clusterEdgeHit(fx: number, fy: number): number | null {
    return clusterEdgeAt(this.state.zone, fx, fy, Math.max(0.35, 8 / this.view.scale));
  }

  movePlacementTo(ref: PlacementRef, lx: number, ly: number): void {
    movePlacement(this.state.zone, ref, lx, ly);
  }

  // -------------------------------------------------------- stamps

  armedTemplateDef(): StructureTemplate | null {
    const tpl = STRUCTURE_TEMPLATES.find((t) => t.id === this.state.armedTemplate) ?? null;
    return tpl && this.state.stampFlip ? flipTemplate(tpl) : tpl;
  }

  templateGhost(t: Pt): void {
    const tpl = this.armedTemplateDef();
    if (!tpl) {
      this.view.ghost = null;
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
    this.view.ghost = {
      w,
      h,
      ground,
      detail,
      key: `tpl:${tpl.id}${this.state.stampFlip ? ':f' : ''}`,
      at: { x: t.x - (w >> 1), y: t.y - (h >> 1) },
    };
  }

  stampTemplateAt(t: Pt): void {
    const tpl = this.armedTemplateDef();
    if (!tpl) {
      toast('pick a structure template first (Library · Structures)');
      return;
    }
    const w = templateWidth(tpl);
    const h = templateHeight(tpl);
    const at = { x: t.x - (w >> 1), y: t.y - (h >> 1) };
    const rec = new StrokeRecorder();
    const pts: Pt[] = [];
    const z = this.state.zone;
    for (let y = 0; y < h; y++) {
      const row = tpl.rows[y]!;
      for (let x = 0; x < w; x++) {
        const cell = row[x] === ' ' ? undefined : tpl.legend[row[x]!];
        if (!cell) continue;
        const lx = at.x + x;
        const ly = at.y + y;
        if (!this.inBounds(lx, ly)) continue;
        const i = this.idx(lx, ly);
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
    this.commitStroke(rec, `stamp ${tpl.meta?.label ?? tpl.id}`, pts);
    toast(`stamped ${tpl.meta?.label ?? tpl.id}${this.state.stampFlip ? ' (mirrored)' : ''}`);
  }

  prefabGhost(t: Pt): void {
    const p = this.state.armedPrefab;
    if (!p) {
      this.view.ghost = null;
      return;
    }
    const pins = [
      ...p.spawns.map((s) => ({ dx: s.dx, dy: s.dy, color: '#e06456' })),
      ...p.actorSpawns.map((a) => ({ dx: a.dx, dy: a.dy, color: '#5fc9c4' })),
      ...p.portals.map((pt) => ({ dx: pt.dx, dy: pt.dy, color: '#b48fe8' })),
    ];
    this.view.ghost = {
      w: p.width,
      h: p.height,
      ground: p.ground,
      detail: p.detail,
      elev: p.elev,
      key: `pf:${p.id}`,
      at: { x: t.x - (p.width >> 1), y: t.y - (p.height >> 1) },
      pins,
    };
  }

  stampPrefabAt(t: Pt): void {
    const p = this.state.armedPrefab;
    if (!p) {
      toast('arm a prefab first (Library · Structures)');
      return;
    }
    const at = { x: t.x - (p.width >> 1), y: t.y - (p.height >> 1) };
    this.zoneOp(`stamp prefab ${p.name}`, (z) => {
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
          // A captured cross-plane door keeps its far side (THE WORLDS
          // APART) — absent falls to the legacy derivation like any
          // untagged portal.
          ...(pt.destPlane ? { destPlane: pt.destPlane } : {}),
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
}
