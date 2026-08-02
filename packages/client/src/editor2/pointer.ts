/**
 * THE POINTER MACHINE — every zone-canvas gesture, ported from v1
 * verbatim in behavior: stroke, shape, marquee, move/copy, placement
 * drag, cluster resize, pan, paste, stamps. The machine holds gesture
 * state only; every mutation goes through EditorOps.
 */

import { StrokeRecorder } from '../editor/history.js';
import type { PlacementRef } from '../editor/state.js';
import type { EditorOps, Pt } from './ops.js';

type Drag =
  | { kind: 'none' }
  | { kind: 'pan'; lastX: number; lastY: number }
  | { kind: 'stroke'; rec: StrokeRecorder; erase: boolean; last: Pt; pts: Pt[] }
  | { kind: 'shape'; anchor: Pt; cur: Pt; erase: boolean }
  | { kind: 'marquee'; anchor: Pt; cur: Pt }
  | { kind: 'movesel'; from: Pt; cur: Pt; copy: boolean }
  | { kind: 'placeMove'; ref: PlacementRef; label: string; moved: boolean }
  | { kind: 'clusterSize'; index: number };

const PLACEMENT_TOOLS = new Set(['portal', 'cluster', 'actor', 'sign', 'spawn']);

export interface PointerDeps {
  canvas: HTMLCanvasElement;
  ops: EditorOps;
  isActive: () => boolean; // zone mode on stage?
  isSpaceHeld: () => boolean;
  updateStatus: () => void;
}

export function installPointer(deps: PointerDeps): void {
  const { canvas, ops } = deps;
  const { state, view } = ops;
  let drag: Drag = { kind: 'none' };

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('mousedown', (e) => {
    if (!deps.isActive()) return;
    const t = view.tileAt(e.clientX, e.clientY);
    if (e.button === 1 || deps.isSpaceHeld()) {
      drag = { kind: 'pan', lastX: e.clientX, lastY: e.clientY };
      return;
    }
    if (ops.pasteArmed && state.clip && e.button === 0) {
      const rec = new StrokeRecorder();
      const pts: Pt[] = [];
      ops.stampBuffer(state.clip, { x: t.x - (state.clip.w >> 1), y: t.y - (state.clip.h >> 1) }, rec, pts);
      ops.commitStroke(rec, 'paste', pts);
      ops.pasteArmed = false;
      view.ghost = null;
      return;
    }
    if (e.altKey && e.button === 0) {
      ops.pickAt(t.x, t.y);
      return;
    }
    const erase = e.button === 2;

    switch (state.tool) {
      case 'paint':
      case 'erase': {
        const rec = new StrokeRecorder();
        const pts = ops.brushFootprint(t.x, t.y);
        for (const p of pts) ops.applyBrush(rec, p.x, p.y, erase || state.tool === 'erase');
        ops.markDirtyCells(pts);
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
        if (!ops.inBounds(t.x, t.y)) break;
        const pts = ops.floodFrom(t.x, t.y);
        ops.applyCellsOp('fill', pts, erase);
        break;
      }
      case 'road': {
        if (erase) {
          ops.roadPts = [];
          view.preview = null;
          break;
        }
        ops.roadPts.push(t);
        ops.setPreview(ops.roadPreviewCells(), false);
        break;
      }
      case 'select': {
        const r = ops.selRect();
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
        ops.pickAt(t.x, t.y);
        break;
      case 'structure':
        // Right-click puts the stamp away — the no-surprises exit.
        if (erase) ops.disarmStamp();
        else ops.stampTemplateAt(t);
        break;
      case 'prefab':
        if (erase) ops.disarmStamp();
        else ops.stampPrefabAt(t);
        break;
      case 'portal':
      case 'cluster':
      case 'actor':
      case 'sign':
      case 'spawn': {
        const f = view.tileAtFloat(e.clientX, e.clientY);
        if (erase) {
          // Right-click a marker removes it — the eraser law for pins.
          const hitR = ops.placementHit(f.x, f.y);
          if (hitR) ops.removePlacementRef(hitR);
          break;
        }
        // Ring edge first: resizing a big cluster must beat re-selecting it.
        const edge = ops.clusterEdgeHit(f.x, f.y);
        if (edge !== null) {
          ops.beginZoneGesture();
          ops.selectPlacement({ kind: 'cluster', index: edge });
          drag = { kind: 'clusterSize', index: edge };
          break;
        }
        const hit = ops.placementHit(f.x, f.y);
        if (hit) {
          ops.beginZoneGesture();
          ops.selectPlacement(hit);
          drag = { kind: 'placeMove', ref: hit, label: `move ${hit.kind}`, moved: false };
          break;
        }
        if (!ops.inBounds(t.x, t.y)) break;
        ops.beginZoneGesture();
        const ref = ops.createPlacementAt(t);
        if (!ref) {
          ops.cancelZoneGesture();
          break;
        }
        ops.selectPlacement(ref);
        drag = { kind: 'placeMove', ref, label: `place ${ref.kind}`, moved: true };
        break;
      }
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!deps.isActive()) return;
    const t = view.tileAt(e.clientX, e.clientY);
    state.hover = ops.inBounds(t.x, t.y) ? t : null;
    deps.updateStatus();

    if (drag.kind === 'pan') {
      view.panX += e.clientX - drag.lastX;
      view.panY += e.clientY - drag.lastY;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      return;
    }
    if (drag.kind === 'stroke') {
      const pts = ops.strokeLine(drag.last, t);
      for (const p of pts) ops.applyBrush(drag.rec, p.x, p.y, drag.erase);
      drag.pts.push(...pts);
      ops.markDirtyCells(pts);
      drag.last = t;
      return;
    }
    if (drag.kind === 'shape') {
      drag.cur = t;
      ops.setPreview(ops.shapeCells(drag, e.shiftKey), drag.erase);
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
      const r = ops.selRect()!;
      if (!state.clip || view.ghost === null) {
        ops.copySelection();
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
      if (!ops.inBounds(t.x, t.y)) return;
      const pos = ops.placementLocalPos(drag.ref);
      if (pos && (Math.floor(pos.x) !== t.x || Math.floor(pos.y) !== t.y)) {
        if (drag.ref.kind === 'portal' || drag.ref.kind === 'sign') {
          ops.carryPlacementTile(
            state.zone,
            { x: state.zone.origin.x + Math.floor(pos.x), y: state.zone.origin.y + Math.floor(pos.y) },
            { x: state.zone.origin.x + t.x, y: state.zone.origin.y + t.y },
          );
        }
        ops.movePlacementTo(drag.ref, t.x, t.y);
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
      ops.setPreview(ops.brushFootprint(t.x, t.y), state.tool === 'erase');
    } else if (state.tool === 'road' && ops.roadPts.length > 0) {
      ops.setPreview(ops.roadPreviewCells(t), false);
    } else if (drag.kind === 'none' && state.tool !== 'select') {
      view.preview = null;
    }
    if (state.tool === 'structure') {
      ops.templateGhost(t);
    } else if (state.tool === 'prefab') {
      ops.prefabGhost(t);
    } else if (ops.pasteArmed && state.clip) {
      view.ghost = {
        w: state.clip.w,
        h: state.clip.h,
        ground: state.clip.ground,
        at: { x: t.x - (state.clip.w >> 1), y: t.y - (state.clip.h >> 1) },
      };
    }
    if (PLACEMENT_TOOLS.has(state.tool)) {
      const f = view.tileAtFloat(e.clientX, e.clientY);
      state.hoverPlacement = ops.placementHit(f.x, f.y);
      const edge = ops.clusterEdgeHit(f.x, f.y);
      canvas.style.cursor = state.hoverPlacement ? 'grab' : edge !== null ? 'ew-resize' : 'crosshair';
    } else {
      state.hoverPlacement = null;
      canvas.style.cursor = 'crosshair';
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (!deps.isActive()) {
      drag = { kind: 'none' };
      return;
    }
    if (drag.kind === 'stroke') {
      view.strokeActive = false;
      ops.commitStroke(drag.rec, state.tool === 'erase' || drag.erase ? 'erase' : 'paint', drag.pts);
    } else if (drag.kind === 'shape') {
      const pts = ops.shapeCells(drag, e.shiftKey);
      ops.applyCellsOp(state.tool, pts, drag.erase);
      view.preview = null;
    } else if (drag.kind === 'movesel') {
      const r = ops.selRect()!;
      const dx = drag.cur.x - drag.from.x;
      const dy = drag.cur.y - drag.from.y;
      if ((dx !== 0 || dy !== 0) && state.clip) {
        const rec = new StrokeRecorder();
        const pts: Pt[] = [];
        if (!drag.copy) ops.clearRegionInto(r, rec, pts);
        ops.stampBuffer(state.clip, { x: r.x0 + dx, y: r.y0 + dy }, rec, pts);
        ops.commitStroke(rec, drag.copy ? 'copy selection' : 'move selection', pts);
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
        ops.endZoneGesture(drag.label, { tiles: drag.ref.kind === 'portal' || drag.ref.kind === 'sign' });
      } else {
        ops.cancelZoneGesture();
      }
    } else if (drag.kind === 'clusterSize') {
      ops.endZoneGesture('cluster radius', { tiles: false });
    }
    drag = { kind: 'none' };
  });

  canvas.addEventListener('dblclick', () => {
    if (!deps.isActive()) return;
    if (state.tool === 'road' && ops.roadPts.length >= 2) ops.commitRoad();
  });

  canvas.addEventListener(
    'wheel',
    (e) => {
      if (!deps.isActive()) return;
      e.preventDefault();
      view.zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15);
      deps.updateStatus();
    },
    { passive: false },
  );
}
