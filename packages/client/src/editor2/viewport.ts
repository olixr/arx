/**
 * THE VIEWPORT — one camera over two views. The TRUE view is the
 * game's own renderer painting the Editor Stage (Phase 2, the default
 * forever); the DRAFT view is the v1 schematic EditorView, kept as an
 * explicit fallback toggle (THE TRUE VIEWPORT LAW: no third dialect).
 * The camera (center + px/tile) is shared, so flipping views never
 * loses your place; every editor decoration — zone frame, grids,
 * selection, previews, ghosts, markers — draws through the renderer's
 * overlay hook with true world transforms (rings squash into
 * perspective-true ellipses).
 */

import { CHUNK_SIZE, TILE_PX, tileDef } from '@arx/shared';
import { EditorView, GHOST_SKIP } from '../editor/render.js';
import { sameRef } from '../editor/placements.js';
import type { EditorState } from '../editor/state.js';
import { toast } from '../studio2/kit.js';
import { EditorStage } from './stage.js';

const TRUE_VIEW_KEY = 'dc2-true-view';
const OUTLINE = '#241a2e';

interface OverlayView {
  w: number;
  h: number;
  scale: number;
  yScale: number;
  toScreen: (wx: number, wy: number) => { x: number; y: number };
  pickWorld: (sx: number, sy: number) => { x: number; y: number };
}

export class Viewport {
  /** The stage paints by default; draft is the explicit fallback. */
  trueView = localStorage.getItem(TRUE_VIEW_KEY) !== 'draft';

  /** Camera truth: zone-LOCAL tile center + horizontal px per tile. */
  centerX = 48;
  centerY = 48;
  pxPerTile = 24;

  // View lenses (chrome toggles read/write these).
  showGrid = false;
  showChunkGrid = false;
  showMarkers = true;
  showElev = false;

  /**
   * The people plane (Phase 3): ghosted out-of-hours clusters, the
   * selected actor's projected routine, patrol paths — composed by
   * the root where people/ops both live, drawn under the markers.
   */
  peopleOverlay:
    | ((h: {
        ctx: CanvasRenderingContext2D;
        sx: (lx: number) => number;
        sy: (ly: number) => number;
        s: number;
        ys: number;
      }) => void)
    | null = null;

  private warnedFallback = false;

  constructor(
    readonly draft: EditorView,
    readonly stage: EditorStage,
    private readonly state: EditorState,
    private readonly draftCanvas: HTMLCanvasElement,
    private readonly stageCanvas: HTMLCanvasElement,
  ) {
    this.stage.renderer.overlayHook = (ctx, v) => this.drawOverlay(ctx, v);
  }

  // ----------------------------------------------------- camera math

  /** Horizontal px/tile; the one zoom number both views share. */
  get scale(): number {
    return this.pxPerTile;
  }

  private get onStage(): boolean {
    return this.trueView && this.stage.healthy;
  }

  private clampScale(v: number): number {
    // The stage's floor is higher: a 4px/tile frame scans too many
    // tiles through the full scene painter; the draft view is cheap.
    const min = this.onStage ? 8 : 2;
    return Math.min(160, Math.max(min, v));
  }

  private activeCanvas(): HTMLCanvasElement {
    return this.onStage ? this.stageCanvas : this.draftCanvas;
  }

  tileAt(clientX: number, clientY: number): { x: number; y: number } {
    const f = this.tileAtFloat(clientX, clientY);
    return { x: Math.floor(f.x), y: Math.floor(f.y) };
  }

  tileAtFloat(clientX: number, clientY: number): { x: number; y: number } {
    const z = this.state.zone;
    if (this.onStage) {
      // ALL screen→world through pickWorld — the standing law; the
      // stage projection lifts elevated ground, and pickWorld solves
      // it back so the cursor lands on the tile under the pixel.
      const rect = this.stageCanvas.getBoundingClientRect();
      const w = this.stage.renderer.pickWorld(clientX - rect.left, clientY - rect.top);
      return { x: w.x - z.origin.x, y: w.y - z.origin.y };
    }
    return this.draft.tileAtFloat(clientX, clientY);
  }

  panBy(dxPx: number, dyPx: number): void {
    this.centerX -= dxPx / this.pxPerTile;
    this.centerY -= dyPx / (this.pxPerTile * (this.onStage ? 0.6 : 1));
  }

  centerOn(lx: number, ly: number): void {
    this.centerX = lx;
    this.centerY = ly;
  }

  zoomAt(clientX: number, clientY: number, factor: number): void {
    const before = this.tileAtFloat(clientX, clientY);
    const next = this.clampScale(this.pxPerTile * factor);
    if (next === this.pxPerTile) return;
    this.pxPerTile = next;
    // Keep the world point under the cursor fixed through the zoom.
    const rect = this.activeCanvas().getBoundingClientRect();
    const dx = clientX - rect.left - rect.width / 2;
    const dy = clientY - rect.top - rect.height / 2;
    this.centerX = before.x - dx / this.pxPerTile;
    this.centerY = before.y - dy / (this.pxPerTile * (this.onStage ? 0.6 : 1));
  }

  fitZone(): void {
    const z = this.state.zone;
    const rect = this.activeCanvas().getBoundingClientRect();
    const w = rect.width || 800;
    const h = rect.height || 600;
    const ys = this.onStage ? 0.6 : 1;
    this.pxPerTile = this.clampScale(Math.min(w / z.width, h / (z.height * ys)) * 0.92);
    this.centerX = z.width / 2;
    this.centerY = z.height / 2;
  }

  /** The visible LOCAL-tile rect (minimap window, culling). */
  visibleLocalRect(): { x0: number; y0: number; x1: number; y1: number } {
    const z = this.state.zone;
    const rect = this.activeCanvas().getBoundingClientRect();
    if (this.onStage) {
      const tl = this.stage.renderer.pickWorld(0, 0);
      const br = this.stage.renderer.pickWorld(rect.width, rect.height);
      return {
        x0: tl.x - z.origin.x,
        y0: tl.y - z.origin.y,
        x1: br.x - z.origin.x,
        y1: br.y - z.origin.y,
      };
    }
    const halfW = rect.width / 2 / this.pxPerTile;
    const halfH = rect.height / 2 / this.pxPerTile;
    return {
      x0: this.centerX - halfW,
      y0: this.centerY - halfH,
      x1: this.centerX + halfW,
      y1: this.centerY + halfH,
    };
  }

  // ---------------------------------------- document-change plumbing

  markDirty(x0: number, y0: number, x1: number, y1: number): void {
    this.draft.markDirty(x0, y0, x1, y1);
    this.stage.invalidateRect(x0, y0, x1, y1);
  }

  markAllDirty(): void {
    this.draft.markAllDirty();
    // Whole-document changes (adopt, resize, origin move, undo swap)
    // re-arm the stage from scratch — chunks regrow under the view.
    this.stage.rebuildAll();
  }

  // Decoration state lives on the draft view (its renderer reads it
  // directly); the stage overlay reads the same fields through these.
  get ghost(): EditorView['ghost'] {
    return this.draft.ghost;
  }

  set ghost(g: EditorView['ghost']) {
    this.draft.ghost = g;
  }

  get preview(): EditorView['preview'] {
    return this.draft.preview;
  }

  set preview(p: EditorView['preview']) {
    this.draft.preview = p;
  }

  get strokeActive(): boolean {
    return this.draft.strokeActive;
  }

  set strokeActive(v: boolean) {
    this.draft.strokeActive = v;
  }

  // ------------------------------------------------------ view flip

  toggleDraftView(): void {
    this.trueView = !this.trueView;
    localStorage.setItem(TRUE_VIEW_KEY, this.trueView ? 'true' : 'draft');
    this.pxPerTile = this.clampScale(this.pxPerTile);
    toast(this.trueView ? 'the true viewport — the game’s own renderer' : 'draft view — the schematic bake');
  }

  // ------------------------------------------------------- the frame

  render(nowMs: number): void {
    const onStage = this.onStage;
    if (this.trueView && !this.stage.healthy && !this.warnedFallback) {
      this.warnedFallback = true;
      toast('the true viewport failed — draft view stands in (see console)', 5200, 'error');
    }
    this.stageCanvas.classList.toggle('hidden', !onStage);
    this.draftCanvas.classList.toggle('hidden', onStage);
    const z = this.state.zone;
    if (onStage) {
      this.stage.render(
        z.origin.x + this.centerX,
        z.origin.y + this.centerY,
        this.pxPerTile / (TILE_PX * 1.25),
        nowMs,
      );
      return;
    }
    // Draft: project the shared camera into the v1 view's pan/scale.
    const rect = this.draftCanvas.getBoundingClientRect();
    this.draft.scale = this.pxPerTile;
    this.draft.panX = rect.width / 2 - this.centerX * this.pxPerTile;
    this.draft.panY = rect.height / 2 - this.centerY * this.pxPerTile;
    this.draft.showGrid = this.showGrid;
    this.draft.showChunkGrid = this.showChunkGrid;
    this.draft.showMarkers = this.showMarkers;
    this.draft.showElev = this.showElev;
    this.draft.render(nowMs);
  }

  // ------------------------------------------------- the overlay pass

  /**
   * The editor's plane over the finished true frame. Ports the v1
   * decoration dialect onto the game projection: x scales by `s`,
   * y by `s·yScale`, rings become ellipses. Markers anchor at the
   * ground footprint (matching v1); elevated-tile markers ride the
   * unlifted ground position — the elevation lens proper lands in
   * Phase 5.
   */
  private drawOverlay(ctx: CanvasRenderingContext2D, v: OverlayView): void {
    const z = this.state.zone;
    const s = v.scale;
    const ys = v.yScale;
    const o = v.toScreen(z.origin.x, z.origin.y);
    const sx = (lx: number): number => o.x + lx * s;
    const sy = (ly: number): number => o.y + ly * s * ys;
    const nowMs = performance.now();

    ctx.save();

    // Outside the zone: dim to half-light — the world context stays
    // readable, the authored ground reads as the working surface.
    ctx.beginPath();
    ctx.rect(0, 0, v.w, v.h);
    ctx.rect(sx(0), sy(0), z.width * s, z.height * s * ys);
    ctx.fillStyle = 'rgba(4, 6, 10, 0.42)';
    ctx.fill('evenodd');

    // The zone frame — the world signal wears the field tone.
    ctx.strokeStyle = 'rgba(216, 179, 106, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx(0), sy(0), z.width * s, z.height * s * ys);

    const vis = this.visibleLocalRect();
    const tx0 = Math.max(0, Math.floor(vis.x0));
    const ty0 = Math.max(0, Math.floor(vis.y0));
    const tx1 = Math.min(z.width - 1, Math.ceil(vis.x1));
    const ty1 = Math.min(z.height - 1, Math.ceil(vis.y1) + 8);

    if (this.showGrid && s >= 8) {
      ctx.strokeStyle = 'rgba(233, 236, 243, 0.10)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = tx0; x <= tx1 + 1; x++) {
        ctx.moveTo(sx(x), sy(ty0));
        ctx.lineTo(sx(x), sy(ty1 + 1));
      }
      for (let y = ty0; y <= ty1 + 1; y++) {
        ctx.moveTo(sx(tx0), sy(y));
        ctx.lineTo(sx(tx1 + 1), sy(y));
      }
      ctx.stroke();
    }

    if (this.showChunkGrid) {
      // TRUE chunk lines — world-aligned, the streaming grid itself.
      ctx.strokeStyle = 'rgba(94, 155, 245, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const wx0 = z.origin.x + tx0;
      const wx1 = z.origin.x + tx1 + 1;
      const wy0 = z.origin.y + ty0;
      const wy1 = z.origin.y + ty1 + 1;
      for (let wx = Math.ceil(wx0 / CHUNK_SIZE) * CHUNK_SIZE; wx <= wx1; wx += CHUNK_SIZE) {
        ctx.moveTo(sx(wx - z.origin.x), sy(ty0));
        ctx.lineTo(sx(wx - z.origin.x), sy(ty1 + 1));
      }
      for (let wy = Math.ceil(wy0 / CHUNK_SIZE) * CHUNK_SIZE; wy <= wy1; wy += CHUNK_SIZE) {
        ctx.moveTo(sx(tx0), sy(wy - z.origin.y));
        ctx.lineTo(sx(tx1 + 1), sy(wy - z.origin.y));
      }
      ctx.stroke();
    }

    // Brush/shape/road preview cells.
    const preview = this.draft.preview;
    if (preview) {
      ctx.fillStyle = preview.color;
      for (const i of preview.indices) {
        const x = i % z.width;
        const y = Math.floor(i / z.width);
        ctx.fillRect(sx(x), sy(y), s, s * ys);
      }
    }

    // Stamp/paste ghost — flat v1 fidelity (true-render ghosts: Ph4).
    const g = this.draft.ghost;
    if (g) {
      ctx.globalAlpha = 0.68;
      for (let y = 0; y < g.h; y++) {
        for (let x = 0; x < g.w; x++) {
          const t = g.ground[y * g.w + x]!;
          if (t === GHOST_SKIP) continue;
          const lx = g.at.x + x;
          const ly = g.at.y + y;
          if (lx < 0 || ly < 0 || lx >= z.width || ly >= z.height) continue;
          const def = tileDef(t);
          ctx.fillStyle = def.color;
          ctx.fillRect(sx(lx), sy(ly), s, s * ys);
          if (def.raised && def.topColor) {
            ctx.fillStyle = def.topColor;
            ctx.fillRect(sx(lx), sy(ly), s, s * ys * 0.35);
          }
        }
      }
      ctx.globalAlpha = 1;
      for (const pin of g.pins ?? []) {
        const px = sx(g.at.x + pin.dx) + s / 2;
        const py = sy(g.at.y + pin.dy) + (s * ys) / 2;
        ctx.fillStyle = pin.color;
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(3, s * 0.22), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(94, 155, 245, 0.9)';
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(sx(g.at.x), sy(g.at.y), g.w * s, g.h * s * ys);
      ctx.setLineDash([]);
    }

    // Selection marquee + the dims chip.
    const sel = this.state.selection;
    if (sel) {
      const x = sx(Math.min(sel.x0, sel.x1));
      const y = sy(Math.min(sel.y0, sel.y1));
      const w = (Math.abs(sel.x1 - sel.x0) + 1) * s;
      const h = (Math.abs(sel.y1 - sel.y0) + 1) * s * ys;
      ctx.strokeStyle = 'rgba(4, 6, 10, 0.9)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, y, w, h);
      ctx.strokeStyle = '#e9ecf3';
      ctx.lineWidth = 1.25;
      ctx.setLineDash([5, 4]);
      ctx.lineDashOffset = -(nowMs / 40) % 9;
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      const label = `${Math.abs(sel.x1 - sel.x0) + 1} × ${Math.abs(sel.y1 - sel.y0) + 1}`;
      ctx.font = '600 11px ui-monospace, Menlo, monospace';
      const tw = ctx.measureText(label).width;
      const ly2 = y - 20 < 4 ? y + h + 4 : y - 20;
      ctx.fillStyle = 'rgba(4, 6, 10, 0.85)';
      ctx.fillRect(x, ly2, tw + 12, 16);
      ctx.strokeStyle = 'rgba(233, 236, 243, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, ly2 + 0.5, tw + 11, 15);
      ctx.fillStyle = '#e9ecf3';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + 6, ly2 + 8.5);
    }

    this.peopleOverlay?.({ ctx, sx, sy, s, ys });

    if (this.showMarkers) this.drawMarkers(ctx, sx, sy, s, ys);

    ctx.restore();
  }

  /** The v1 marker dialect on the true projection. */
  private drawMarkers(
    ctx: CanvasRenderingContext2D,
    sx: (lx: number) => number,
    sy: (ly: number) => number,
    s: number,
    ys: number,
  ): void {
    const z = this.state.zone;
    const state = this.state;
    const label = (text: string, x: number, y: number, color: string): void => {
      if (s < 10) return;
      ctx.font = `600 ${Math.max(10, Math.min(13, s * 0.5))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(4, 6, 10, 0.75)';
      const tw = ctx.measureText(text).width;
      ctx.fillRect(x - tw / 2 - 3, y - 1, tw + 6, 14);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    };
    const halo = (
      kind: 'portal' | 'cluster' | 'actor' | 'sign' | 'spawn',
      index: number,
      lx: number,
      ly: number,
    ): void => {
      const isSel = sameRef(state.selected, { kind, index });
      const hov = sameRef(state.hoverPlacement, { kind, index });
      if (!isSel && !hov) return;
      ctx.strokeStyle = isSel ? '#d8b36a' : 'rgba(216, 179, 106, 0.45)';
      ctx.lineWidth = isSel ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.ellipse(lx, ly, Math.max(7, s * 0.5), Math.max(7, s * 0.5) * ys, 0, 0, Math.PI * 2);
      ctx.stroke();
    };

    (z.spawns ?? []).forEach((sp, i) => {
      const lx = sx(sp.x - z.origin.x + 0.5);
      const ly = sy(sp.y - z.origin.y + 0.5);
      const selected = sameRef(state.selected, { kind: 'cluster', index: i });
      ctx.strokeStyle = selected ? 'rgba(242, 160, 140, 0.9)' : 'rgba(224, 100, 86, 0.55)';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = selected ? 2.2 : 1.5;
      ctx.beginPath();
      // The wander ring on the ground plane — a perspective ellipse.
      ctx.ellipse(lx, ly, Math.max(3, sp.radius * s), Math.max(3, sp.radius * s) * ys, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      halo('cluster', i, lx, ly);
      ctx.fillStyle = '#e06456';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(lx, ly, Math.max(3, s * 0.2), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      label(`${sp.npc} ×${sp.count}`, lx, ly + Math.max(3, sp.radius * s) * ys + 3, '#e79a92');
    });

    (z.actorSpawns ?? []).forEach((a, i) => {
      const lx = sx(a.x - z.origin.x + 0.5);
      const ly = sy(a.y - z.origin.y + 0.5);
      halo('actor', i, lx, ly);
      ctx.fillStyle = '#5fc9c4';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(lx, ly, Math.max(3, s * 0.22), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (a.dir !== undefined) {
        ctx.strokeStyle = '#5fc9c4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(
          lx + Math.cos(a.dir) * Math.max(6, s * 0.45),
          ly + Math.sin(a.dir) * Math.max(6, s * 0.45) * ys,
        );
        ctx.stroke();
      }
      label(a.actor, lx, ly + Math.max(3, s * 0.22) + 2, '#9adfdb');
    });

    (z.portals ?? []).forEach((p, i) => {
      const lx = sx(p.x - z.origin.x + 0.5);
      const ly = sy(p.y - z.origin.y + 0.5);
      halo('portal', i, lx, ly);
      ctx.strokeStyle = '#b48fe8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, ly - s * 0.45 * ys);
      ctx.lineTo(lx + s * 0.32, ly);
      ctx.lineTo(lx, ly + s * 0.45 * ys);
      ctx.lineTo(lx - s * 0.32, ly);
      ctx.closePath();
      ctx.stroke();
      label(p.delve ? 'delve' : `→ ${p.dest?.x},${p.dest?.y}`, lx, ly + s * 0.5 * ys + 2, '#c9aef0');
    });

    (z.signs ?? []).forEach((gz, i) => {
      const lx = sx(gz.x - z.origin.x + 0.5);
      const ly = sy(gz.y - z.origin.y + 0.5);
      halo('sign', i, lx, ly);
      label(gz.title || gz.lines?.[0] || 'blank', lx, ly + s * 0.3 + 3, '#e2cda3');
    });

    if (z.spawn) {
      const lx = sx(z.spawn.x - z.origin.x);
      const ly = sy(z.spawn.y - z.origin.y);
      halo('spawn', 0, lx, ly);
      ctx.fillStyle = '#d8b36a';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lx, ly, Math.max(4, s * 0.3), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      label('spawn', lx, ly + Math.max(4, s * 0.3) + 2, '#d8b36a');
    }
  }
}
