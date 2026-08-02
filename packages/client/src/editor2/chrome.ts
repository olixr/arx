/**
 * THE CHROME — the tool rail, the tool options strip, the zone chip,
 * the validation banner, and the status bar. Pure builders over the
 * command registry and editor state; no document verbs live here.
 */

import { tileDef } from '@arx/shared';
import { STRUCTURE_TEMPLATES } from '@arx/content';
import { iconImg } from '../editor/editorIcons.js';
import type { EditorState, LayerId } from '../editor/state.js';
import type { WorldMode } from '../editor/world/worldMode.js';
import { el, kbd, sliderRow } from '../studio2/kit.js';
import { TOOL_GROUPS, TOOL_SPECS, WORLD_TOOLS, type StudioMode } from './commands.js';
import type { EditorOps } from './ops.js';
import type { Viewport } from './viewport.js';

export interface ChromeDeps {
  state: EditorState;
  view: Viewport;
  ops: EditorOps;
  world: WorldMode;
  getMode: () => StudioMode;
}

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

export class Chrome {
  constructor(private readonly deps: ChromeDeps) {}

  // ------------------------------------------------------- the rail

  buildRail(): void {
    const bar = $('rail');
    bar.innerHTML = '';
    const { state, world, ops } = this.deps;
    if (this.deps.getMode() === 'world') {
      const group = el('div', 'rail-group');
      group.appendChild(el('div', 'rail-caption', 'World'));
      for (const t of WORLD_TOOLS) {
        const b = el('button', 'rail-tool' + (world.ws.tool === t.id ? ' active' : ''));
        b.title = `${t.name} (${t.key})\n${t.hint}`;
        b.setAttribute('aria-label', `${t.name} (${t.key})`);
        b.appendChild(iconImg(t.icon, 21));
        b.appendChild(el('span', 'key', t.key));
        b.onclick = () => world.setTool(t.id);
        group.appendChild(b);
      }
      bar.appendChild(group);
      const spec = WORLD_TOOLS.find((t) => t.id === world.ws.tool);
      if (spec) this.setHint(`${spec.name} — ${spec.hint}`);
      return;
    }
    for (const g of TOOL_GROUPS) {
      const group = el('div', 'rail-group');
      group.appendChild(el('div', 'rail-caption', g.caption));
      for (const t of g.tools) {
        const b = el('button', 'rail-tool' + (state.tool === t.id ? ' active' : ''));
        b.title = `${t.name} (${t.key})\n${t.hint}`;
        b.setAttribute('aria-label', `${t.name} (${t.key})`);
        b.appendChild(iconImg(t.icon, 21));
        b.appendChild(el('span', 'key', t.key));
        b.onclick = () => ops.setTool(t.id);
        group.appendChild(b);
      }
      bar.appendChild(group);
    }
    const spec = TOOL_SPECS.get(state.tool);
    this.setHint(spec ? `${spec.name} — ${spec.hint}` : '');
  }

  // ----------------------------------------------- the options strip

  buildOptions(): void {
    const root = $('tool-options');
    root.innerHTML = '';
    const { state, view, ops } = this.deps;

    // Stamp tools carry their own compact option row and no layers.
    if (state.tool === 'structure' || state.tool === 'prefab') {
      const row = el('div', 'opt-row');
      const armed =
        state.tool === 'structure'
          ? STRUCTURE_TEMPLATES.find((t) => t.id === state.armedTemplate)?.meta?.label ?? 'nothing armed'
          : state.armedPrefab?.name ?? 'nothing armed';
      row.appendChild(el('span', 'armed-chip', armed));
      if (state.tool === 'structure') {
        const flipBtn = el('button', 'opt-btn' + (state.stampFlip ? ' active' : ''));
        flipBtn.appendChild(iconImg('flip', 14));
        flipBtn.append(' mirror');
        flipBtn.appendChild(kbd('X'));
        flipBtn.onclick = () => {
          state.stampFlip = !state.stampFlip;
          state.changed();
        };
        row.appendChild(flipBtn);
      }
      root.appendChild(row);
      root.appendChild(
        el(
          'p',
          'muted',
          state.tool === 'structure'
            ? 'Click the map to stamp. Buildings mirror but never rotate — the camera reads south faces.'
            : 'Click the map to stamp tiles and placements together. Stays armed for repeats.',
        ),
      );
      return;
    }

    if (['portal', 'cluster', 'actor', 'sign', 'spawn'].includes(state.tool)) {
      root.appendChild(
        el(
          'p',
          'muted',
          'Click empty ground to place · click a marker to select it · drag to move · right-click removes. Properties live in the Library · Placements panel.',
        ),
      );
      return;
    }

    // The select tool: its four hands, then nothing else.
    if (state.tool === 'select') {
      const modeRow = el('div', 'opt-row');
      for (const [id, label, tip] of [
        ['marquee', 'marquee', 'Drag a box'],
        ['lasso', 'lasso', 'Draw a freehand loop'],
        ['wand', 'wand', 'Click a region — contiguous same tile'],
        ['same', 'same', 'Click a tile — EVERY match in the zone'],
      ] as Array<[typeof state.selectMode, string, string]>) {
        const b = el('button', 'opt-btn' + (state.selectMode === id ? ' active' : ''), label);
        b.title = tip;
        b.onclick = () => {
          state.selectMode = id;
          state.changed();
        };
        modeRow.appendChild(b);
      }
      root.appendChild(modeRow);
      root.appendChild(
        el(
          'p',
          'muted',
          'Drag inside a selection to move it · Alt-drag copies · arrows nudge · Delete clears · ⌘C/X/V travel across zones.',
        ),
      );
      return;
    }

    const layerRow = el('div', 'opt-row');
    for (const [id, label, key] of [
      ['ground', 'Ground', '1'],
      ['detail', 'Detail', '2'],
      ['elev', 'Elevation', '3'],
    ] as Array<[LayerId, string, string]>) {
      const b = el('button', 'opt-btn' + (state.layer === id ? ' active' : ''), label);
      b.appendChild(kbd(key));
      b.onclick = () => {
        state.layer = id;
        state.changed();
      };
      layerRow.appendChild(b);
    }
    root.appendChild(layerRow);

    if (state.layer === 'elev') {
      const row = el('div', 'opt-row');
      row.append('level ');
      for (let lv = -2; lv <= 3; lv++) {
        const b = el('button', 'opt-btn' + (state.elevLevel === lv ? ' active' : ''), String(lv));
        b.onclick = () => {
          state.elevLevel = lv;
          state.changed();
        };
        row.appendChild(b);
      }
      root.appendChild(row);
      root.appendChild(
        el(
          'p',
          'muted',
          'Paint levels, then paint stone stair tiles (Ramp) on a straight high-side edge; Save runs the fence + stair laws.',
        ),
      );
    }

    const brush = sliderRow('brush', 1, 12, state.brushSize, (v) => {
      state.brushSize = v;
      state.changed();
    });
    const brushRow = el('div', 'opt-row');
    brushRow.appendChild(brush.root);
    for (const shape of ['round', 'square'] as const) {
      const b = el('button', 'opt-btn' + (state.brushShape === shape ? ' active' : ''), shape === 'round' ? '●' : '■');
      b.title = `${shape} brush`;
      b.onclick = () => {
        state.brushShape = shape;
        state.changed();
      };
      brushRow.appendChild(b);
    }
    root.appendChild(brushRow);

    // The paint tool's three hands: plain, the clipboard as a nib,
    // and the scatter die for organic dressing.
    if (state.tool === 'paint') {
      const modeRow = el('div', 'opt-row');
      for (const [id, label, tip] of [
        ['normal', 'plain', 'The picked tile, every cell'],
        ['pattern', 'pattern', 'The clipboard tiles as the nib (copy a region first)'],
        ['scatter', 'scatter', 'Each cell rolls the density — organic dressing'],
      ] as Array<[typeof state.brushMode, string, string]>) {
        const b = el('button', 'opt-btn' + (state.brushMode === id ? ' active' : ''), label);
        b.title = tip;
        b.onclick = () => {
          state.brushMode = id;
          state.changed();
        };
        modeRow.appendChild(b);
      }
      root.appendChild(modeRow);
      if (state.brushMode === 'scatter') {
        const dRow = el('div', 'opt-row');
        dRow.appendChild(
          sliderRow('density %', 5, 95, Math.round(state.scatterDensity * 100), (v) => {
            state.scatterDensity = v / 100;
          }).root,
        );
        root.appendChild(dRow);
      }
      if (state.brushMode === 'pattern' && !state.clip) {
        root.appendChild(el('p', 'muted', 'Copy a region first (M, then ⌘C) — the clipboard is the nib.'));
      }
    }

    if (state.tool === 'rect' || state.tool === 'ellipse' || state.tool === 'polygon') {
      const row = el('div', 'opt-row');
      for (const [fill, label] of [
        [true, 'filled'],
        [false, 'outline'],
      ] as Array<[boolean, string]>) {
        const b = el('button', 'opt-btn' + (state.shapeFill === fill ? ' active' : ''), label);
        b.onclick = () => {
          state.shapeFill = fill;
          state.changed();
        };
        row.appendChild(b);
      }
      if (state.tool === 'rect') {
        // THE WALL SHELL: the drag raises a building's bones.
        const w = el('button', 'opt-btn' + (state.rectWalls ? ' active' : ''), 'walls + door');
        w.title = 'Outline in the picked wall tile with a doorway on the south face';
        w.onclick = () => {
          state.rectWalls = !state.rectWalls;
          state.changed();
        };
        row.appendChild(w);
      }
      root.appendChild(row);
      if (state.tool === 'polygon') {
        root.appendChild(el('p', 'muted', 'Click corners · Enter or double-click closes it · right-click removes the last corner.'));
      }
    }

    if (state.tool === 'road') {
      const roadRow = el('div', 'opt-row');
      roadRow.appendChild(
        sliderRow('road width', 1, 7, state.roadWidth, (v) => {
          state.roadWidth = v;
          state.changed();
        }).root,
      );
      root.appendChild(roadRow);
      root.appendChild(el('p', 'muted', 'Roads lay the selected ground tile (pick path, dirt, stone…).'));
    }

    const viewRow = el('div', 'opt-row');
    for (const [key, label] of [
      ['showGrid', 'grid'],
      ['showChunkGrid', 'chunks'],
      ['showMarkers', 'markers'],
      ['showElev', 'elev'],
    ] as Array<['showGrid' | 'showChunkGrid' | 'showMarkers' | 'showElev', string]>) {
      const b = el('button', 'opt-btn' + (view[key] ? ' active' : ''), label);
      b.onclick = () => {
        view[key] = !view[key];
        this.deps.state.changed();
      };
      viewRow.appendChild(b);
    }
    // The draft fallback — the one explicit exit from the true
    // viewport (elev lens draws in draft until the Phase 5 lenses).
    const draftBtn = el('button', 'opt-btn' + (view.trueView ? '' : ' active'), 'draft');
    draftBtn.title = 'Flip to the v1 schematic view (the true viewport is the default)';
    draftBtn.onclick = () => {
      view.toggleDraftView();
      this.deps.state.changed();
    };
    viewRow.appendChild(draftBtn);
    root.appendChild(viewRow);
    void ops;
  }

  // ------------------------------------------------------- zone chip

  syncZoneChip(): void {
    const chipEl = $('zone-chip');
    chipEl.innerHTML = '';
    const title = el('b');
    const sub = el('span');
    if (this.deps.getMode() === 'world') {
      const ws = this.deps.world.ws;
      const g = ws.geo;
      title.textContent = 'The Dawnlands';
      if (g) {
        const towns = ws.zones.filter((z) => !z.poi).length;
        const sites = ws.cells.filter((c) => c.site).length;
        sub.textContent =
          `${towns} zones · ${g.routes.length} routes · ${g.sites.length} landmarks · ` +
          `${sites} frontier sites${ws.edited ? ' · edited plan' : ''}`;
      } else {
        sub.textContent = ws.offline ? 'server asleep' : 'waking…';
      }
    } else {
      const z = this.deps.state.zone;
      title.textContent = z.name;
      const readOnly = z.id.startsWith('poi:') ? ' · composed site (adopt to own it)' : '';
      sub.textContent = `${z.id} · ${z.width}×${z.height} @ ${z.origin.x},${z.origin.y}${readOnly}`;
    }
    chipEl.append(title, sub);
  }

  // ------------------------------------------------------ status bar

  setHint(text: string): void {
    $('st-hint').textContent = text;
  }

  setServerStatus(text: string, live = false): void {
    const elx = $('st-server');
    elx.textContent = text;
    elx.classList.toggle('live', live);
  }

  updateStatus(): void {
    const { state, view, world } = this.deps;
    if (this.deps.getMode() === 'world') {
      $('st-tile').textContent = '';
      $('st-shelf').textContent = '';
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
      const i = h.y * z.width + h.x;
      const g = tileDef(z.ground[i]!).name;
      const d = z.detail[i]!;
      $('st-tile').textContent = g + (d ? ` · detail ${d}` : '');
      const e = z.elev![i]!;
      $('st-shelf').textContent = e ? `lvl ${e > 0 ? '+' : ''}${e}` : '';
    } else {
      $('st-tile').textContent = '';
      $('st-shelf').textContent = '';
    }
    const pct = `${Math.round((view.scale * 100) / 32)}%`;
    $('st-zoom').textContent = pct;
    $('zoom-pct').textContent = pct;
    $('dirty-dot').classList.toggle('on', state.dirty);
  }

  showValidation(text: string, ok: boolean): void {
    const panel = $('validation');
    panel.classList.remove('hidden');
    panel.className = ok ? 'ok' : 'bad';
    panel.textContent = (ok ? '✓ ' : '✕ ') + text;
  }

  hideValidation(): void {
    $('validation').classList.add('hidden');
  }
}
