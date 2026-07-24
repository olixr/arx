import { Detail, Tile, tileDef } from '@devcraft/shared';
import {
  buildBramblewick,
  zoneFromJson,
  zoneToJson,
  type ZoneDef,
  type ZoneJson,
} from '@devcraft/content';
import { deleteZone, fetchZone, listMaps, saveZone, type MapListEntry } from './api.js';
import { History, StrokeRecorder, cloneZone } from './history.js';
import { PaletteUI } from './palette.js';
import { EditorView } from './render.js';
import { EditorState, newZone, type LayerId, type ToolId } from './state.js';
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

/**
 * DevCraft Map Studio — the in-browser zone editor, rebuilt around the
 * live server loop: open any zone the server is running, paint with
 * the real game art, and Save hot-swaps it into the world mid-session.
 * Local import/export still works when the server is down.
 */

const canvas = document.getElementById('editor-canvas') as HTMLCanvasElement;
const state = new EditorState();
const view = new EditorView(canvas, state);
const history = new History();
let palette: PaletteUI;

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

// ----------------------------------------------------------- helpers

const idx = (x: number, y: number): number => y * state.zone.width + x;
const inBounds = (x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < state.zone.width && y < state.zone.height;

function toast(text: string, ms = 2600): void {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
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

/** Structural zone op (resize, origin, markers): full snapshots. */
function zoneOp(label: string, mutate: (z: ZoneDef) => void): void {
  const before = cloneZone(state.zone);
  mutate(state.zone);
  history.push({ kind: 'zone', label, before, after: cloneZone(state.zone) });
  state.dirty = true;
  view.markAllDirty();
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
  | { kind: 'movesel'; from: Pt; cur: Pt; copy: boolean };

let drag: Drag = { kind: 'none' };
let roadPts: Pt[] = [];
let spaceHeld = false;
let pasteArmed = false;

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
    case 'spawn': {
      if (!inBounds(t.x, t.y)) break;
      zoneOp('set spawn', (z) => {
        z.spawn = { x: z.origin.x + t.x + 0.5, y: z.origin.y + t.y + 0.5 };
      });
      toast(`spawn set to ${t.x},${t.y}`);
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

  // Idle hover: brush ghost for the painting tools.
  if (state.tool === 'paint' || state.tool === 'erase') {
    setPreview(footprint(t.x, t.y, state.brushSize, state.brushShape), state.tool === 'erase');
  } else if (state.tool === 'road' && roadPts.length > 0) {
    setPreview(roadCells([...roadPts, t], state.roadWidth), false);
  } else if (drag.kind === 'none' && state.tool !== 'select') {
    view.preview = null;
  }
  if (pasteArmed && state.clip) {
    view.ghost = {
      w: state.clip.w,
      h: state.clip.h,
      ground: state.clip.ground,
      at: { x: t.x - (state.clip.w >> 1), y: t.y - (state.clip.h >> 1) },
    };
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
  KeyP: 'spawn',
};

window.addEventListener('keydown', (e) => {
  const inField =
    document.activeElement instanceof HTMLInputElement ||
    document.activeElement instanceof HTMLTextAreaElement;
  const mod = e.metaKey || e.ctrlKey;

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
    state.tool = tool;
    if (tool !== 'road') {
      roadPts = [];
      view.preview = null;
    }
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
    case 'Escape':
      roadPts = [];
      pasteArmed = false;
      view.ghost = null;
      view.preview = null;
      state.selection = null;
      state.changed();
      break;
    case 'Delete':
    case 'Backspace': {
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
});

window.addEventListener('beforeunload', (e) => {
  if (state.dirty) e.preventDefault();
});

// ----------------------------------------------------------- file io

function adoptZone(zone: ZoneDef, serverBacked: boolean): void {
  state.adopt(zone, { serverBacked });
  history.clear();
  view.markAllDirty();
  view.fitZone();
  syncMetaInputs();
  updateStatus();
}

async function saveToServer(): Promise<void> {
  readMetaInputs();
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
  } catch (err) {
    toast(`save failed: ${(err as Error).message}`, 5000);
    setServerStatus('offline — Export keeps a local copy');
  }
}

function showModal(builder: (body: HTMLElement, close: () => void) => void): void {
  const modal = $('modal') as HTMLDialogElement;
  const body = $('modal-body');
  body.innerHTML = '';
  builder(body, () => modal.close());
  modal.showModal();
}

async function openBrowser(): Promise<void> {
  let list;
  try {
    list = await listMaps();
    setServerStatus('connected');
  } catch (err) {
    toast(`server list failed: ${(err as Error).message}`, 4000);
    setServerStatus('offline — Import a local file instead');
    return;
  }
  showModal((body, close) => {
    const h = document.createElement('h2');
    h.textContent = 'Open zone from server';
    body.appendChild(h);
    const table = document.createElement('table');
    table.className = 'map-table';
    table.innerHTML =
      '<thead><tr><th>zone</th><th>size</th><th>origin</th><th>content</th><th>kind</th><th></th></tr></thead>';
    const tbody = document.createElement('tbody');
    for (const z of list.zones) {
      tbody.appendChild(mapRow(z, close));
    }
    table.appendChild(tbody);
    body.appendChild(table);
    if (list.orphans.length > 0) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = `on disk but not loaded: ${list.orphans.join(', ')}`;
      body.appendChild(p);
    }
  });
}

function mapRow(z: MapListEntry, close: () => void): HTMLTableRowElement {
  const tr = document.createElement('tr');
  const badges = [
    z.builtin ? 'built-in' : '',
    z.hasFile ? 'file' : '',
  ].filter(Boolean).join(' + ');
  tr.innerHTML =
    `<td><b>${z.name}</b> <span class="muted">${z.id}</span></td>` +
    `<td>${z.width}×${z.height}</td>` +
    `<td>${z.origin.x},${z.origin.y}</td>` +
    `<td class="muted">${z.npcSpawns} spawns · ${z.actorSpawns} actors · ${z.portals} portals</td>` +
    `<td>${badges}</td>`;
  const td = document.createElement('td');
  const open = document.createElement('button');
  open.textContent = 'Open';
  open.onclick = async () => {
    try {
      const json = await fetchZone(z.id);
      adoptZone(zoneFromJson(json), true);
      close();
      toast(`opened '${z.id}' from server`);
    } catch (err) {
      toast(`open failed: ${(err as Error).message}`, 4000);
    }
  };
  td.appendChild(open);
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
        close();
        void openBrowser();
      } catch (err) {
        toast(`delete failed: ${(err as Error).message}`, 4000);
      }
    };
    td.appendChild(del);
  }
  tr.appendChild(td);
  return tr;
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
      Bramblewick (0,0–96,96) unless you mean to override it.</p>`;
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

// -------------------------------------------------------- meta panel

function syncMetaInputs(): void {
  const z = state.zone;
  ($('zone-id') as HTMLInputElement).value = z.id;
  ($('zone-name') as HTMLInputElement).value = z.name;
  ($('zone-ox') as HTMLInputElement).value = String(z.origin.x);
  ($('zone-oy') as HTMLInputElement).value = String(z.origin.y);
  ($('zone-w') as HTMLInputElement).value = String(z.width);
  ($('zone-h') as HTMLInputElement).value = String(z.height);
}

function readMetaInputs(): void {
  const z = state.zone;
  const id = ($('zone-id') as HTMLInputElement).value.trim();
  if (id && /^[a-z][a-z0-9_-]*$/.test(id)) z.id = id;
  z.name = ($('zone-name') as HTMLInputElement).value.trim() || z.id;
}

/** Origin moves carry every world-coord marker with the content. */
function applyOrigin(): void {
  const nx = Number(($('zone-ox') as HTMLInputElement).value) || 0;
  const ny = Number(($('zone-oy') as HTMLInputElement).value) || 0;
  const z = state.zone;
  const dx = nx - z.origin.x;
  const dy = ny - z.origin.y;
  if (dx === 0 && dy === 0) return;
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
  toast(`origin → ${nx},${ny} (markers moved with it)`);
}

function applyResize(): void {
  const w = Math.max(8, Math.min(512, Number(($('zone-w') as HTMLInputElement).value) || 0));
  const h = Math.max(8, Math.min(512, Number(($('zone-h') as HTMLInputElement).value) || 0));
  const z = state.zone;
  if (w === z.width && h === z.height) return;
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
  toast(`resized to ${w}×${h}`);
}

// ----------------------------------------------------- toolbar & opts

const TOOLS: Array<{ id: ToolId; label: string; key: string; hint: string }> = [
  { id: 'paint', label: '🖌', key: 'B', hint: 'Paint (B) — drag to paint, right-drag erases' },
  { id: 'erase', label: '⌫', key: 'E', hint: 'Erase (E) — ground→grass, detail→none, elev→0' },
  { id: 'line', label: '╱', key: 'L', hint: 'Line (L) — drag; Shift constrains' },
  { id: 'rect', label: '▭', key: 'R', hint: 'Rectangle (R) — drag; Shift = square' },
  { id: 'ellipse', label: '◯', key: 'O', hint: 'Ellipse (O) — drag; Shift = circle' },
  { id: 'fill', label: '▨', key: 'G', hint: 'Flood fill (G) — click a region' },
  { id: 'road', label: '🛤', key: 'T', hint: 'Road (T) — click waypoints, Enter/dbl-click lays it, Esc cancels' },
  { id: 'select', label: '⬚', key: 'M', hint: 'Select (M) — drag marquee; drag inside moves, Alt-drag copies' },
  { id: 'picker', label: '💧', key: 'I', hint: 'Picker (I) — or Alt-click any time' },
  { id: 'spawn', label: '★', key: 'P', hint: 'Spawn point (P) — click to place the world spawn' },
];

function buildToolbar(): void {
  const bar = $('toolbar');
  bar.innerHTML = '';
  for (const t of TOOLS) {
    const b = document.createElement('button');
    b.className = 'tool' + (state.tool === t.id ? ' active' : '');
    b.title = t.hint;
    b.innerHTML = `<span class="glyph">${t.label}</span><span class="key">${t.key}</span>`;
    b.onclick = () => {
      state.tool = t.id;
      if (t.id !== 'road') roadPts = [];
      state.changed();
    };
    bar.appendChild(b);
  }
}

function buildOptions(): void {
  const root = $('tool-options');
  root.innerHTML = '';

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

// -------------------------------------------------------- status bar

function setServerStatus(text: string): void {
  $('st-server').textContent = text;
}

function updateStatus(): void {
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
  $('st-zone').textContent = `${z.id} ${z.width}×${z.height} @ ${z.origin.x},${z.origin.y}`;
  $('st-zoom').textContent = `${Math.round(view.scale * 100 / 32)}%`;
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
$('btn-save').onclick = () => void saveToServer();
$('btn-validate').onclick = () => {
  readMetaInputs();
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
$('btn-fit').onclick = () => view.fitZone();
$('btn-resize').onclick = () => {
  readMetaInputs();
  applyOrigin();
  applyResize();
  syncMetaInputs();
};
$('btn-export').onclick = () => {
  readMetaInputs();
  const json = JSON.stringify(zoneToJson(state.zone), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${state.zone.id}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`exported ${state.zone.id}.json`);
};
const fileInput = $('file-load') as HTMLInputElement;
$('btn-import').onclick = () => fileInput.click();
fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  try {
    adoptZone(zoneFromJson(JSON.parse(await file.text()) as ZoneJson), false);
    toast(`imported ${file.name}`);
  } catch (err) {
    toast(`import failed: ${(err as Error).message}`, 4000);
  }
  fileInput.value = '';
});
$('btn-help').onclick = () =>
  showModal((body) => {
    body.innerHTML = `
      <h2>Map Studio</h2>
      <p><b>Save</b> writes <code>data/maps/&lt;id&gt;.json</code> on the server and hot-swaps the
      zone into the running world — anyone standing in it sees the change within a tick.</p>
      <ul class="help">
        <li><b>Paint B · Erase E</b> — right-drag always erases; [ ] size the brush</li>
        <li><b>Line L · Rect R · Ellipse O</b> — Shift constrains; filled/outline in options</li>
        <li><b>Fill G</b> — flood the hovered region on the active layer</li>
        <li><b>Road T</b> — click waypoints, Enter lays L-shaped legs at road width</li>
        <li><b>Select M</b> — drag inside to move; Alt-drag copies; ⌘C/⌘X/⌘V, Delete clears</li>
        <li><b>Layers 1/2/3</b> — ground, detail, elevation; Alt-click picks anywhere</li>
        <li><b>Pan</b> space-drag or middle-drag · <b>Zoom</b> wheel · <b>0</b> fits the zone</li>
        <li><b>Elevation</b> — paint levels, add stone-stair tiles on straight rims;
            Save runs the cliff auto-fence and stair/reachability laws</li>
      </ul>`;
  });

state.onChange(() => {
  buildToolbar();
  buildOptions();
  palette?.rebuild();
  updateStatus();
});

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
  const wanted = new URLSearchParams(location.search).get('zone');
  try {
    const list = await listMaps();
    setServerStatus('connected');
    const pick =
      (wanted && list.zones.find((z) => z.id === wanted)) ??
      list.zones.find((z) => z.id === 'bramblewick') ??
      list.zones[0];
    if (pick) {
      adoptZone(zoneFromJson(await fetchZone(pick.id)), true);
      toast(`opened '${pick.id}' from server`);
      return;
    }
  } catch {
    setServerStatus('offline — local mode (Import/Export only)');
  }
  adoptZone(buildBramblewick(), false);
}

void boot();

function frame(nowMs: number): void {
  view.render(nowMs);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Dev handle for Playwright audits, same law as the game's dcGame.
Object.assign(window, { dcEditor: { state, view, history, validateZone } });
