/**
 * THE SHELL — the layout mechanics of the bench: the resizable right
 * dock (Tool over Library, both collapsible, widths and heights
 * persisted per user), the floating instruments (minimap, zoom) that
 * drag and snap to canvas corners, and the mode-driven visibility of
 * every panel. No editor semantics live here.
 */

import { el } from '../studio2/kit.js';
import type { StudioMode } from './commands.js';

const DOCK_W_KEY = 'dc2-dock-w';
const TOOL_H_KEY = 'dc2-dock-tool-h';
const COLLAPSED_KEY = 'dc2-dock-collapsed';
const INST_KEY = 'dc2-instruments';

const DOCK_MIN = 280;
const DOCK_MAX = 460;

type Corner = 'tl' | 'tr' | 'bl' | 'br';

interface InstState {
  corners: Record<string, Corner>;
  hidden: string[];
}

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export class Shell {
  private collapsed = readJson<Record<string, boolean>>(COLLAPSED_KEY, {});
  private inst = readJson<InstState>(INST_KEY, {
    corners: { minimap: 'bl', zoom: 'br', clock: 'tr' },
    hidden: [],
  });

  init(): void {
    this.initDockWidth();
    this.initDockSplit();
    this.initCollapse();
    this.initInstruments();
  }

  // ------------------------------------------------------ dock width

  private initDockWidth(): void {
    const saved = Number(localStorage.getItem(DOCK_W_KEY));
    if (saved >= DOCK_MIN && saved <= DOCK_MAX) {
      document.documentElement.style.setProperty('--dock-w', `${saved}px`);
    }
    const grip = $('dock-resize');
    grip.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = $('dock').getBoundingClientRect().width;
      const move = (ev: MouseEvent): void => {
        const w = Math.max(DOCK_MIN, Math.min(DOCK_MAX, startW + (startX - ev.clientX)));
        document.documentElement.style.setProperty('--dock-w', `${w}px`);
      };
      const up = (): void => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        const w = Math.round($('dock').getBoundingClientRect().width);
        localStorage.setItem(DOCK_W_KEY, String(w));
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    });
    grip.addEventListener('dblclick', () => {
      document.documentElement.style.removeProperty('--dock-w');
      localStorage.removeItem(DOCK_W_KEY);
    });
  }

  // ------------------------------------------------------ dock split

  private initDockSplit(): void {
    const savedH = Number(localStorage.getItem(TOOL_H_KEY));
    if (savedH > 60) $('dock-tool').style.height = `${savedH}px`;
    const split = $('dock-split');
    split.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const tool = $('dock-tool');
      const startY = e.clientY;
      const startH = tool.getBoundingClientRect().height;
      tool.classList.add('sized');
      const move = (ev: MouseEvent): void => {
        const dockH = $('dock').getBoundingClientRect().height;
        const h = Math.max(64, Math.min(dockH * 0.7, startH + (ev.clientY - startY)));
        tool.style.height = `${h}px`;
      };
      const up = (): void => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        localStorage.setItem(TOOL_H_KEY, String(Math.round(tool.getBoundingClientRect().height)));
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    });
    split.addEventListener('dblclick', () => {
      const tool = $('dock-tool');
      tool.style.removeProperty('height');
      tool.classList.remove('sized');
      localStorage.removeItem(TOOL_H_KEY);
    });
  }

  // -------------------------------------------------------- collapse

  private initCollapse(): void {
    for (const id of ['tool', 'lib'] as const) {
      if (this.collapsed[id]) $(`dock-${id}`).classList.add('collapsed');
      const head = $(`dock-${id}-head`);
      const chev = el('button', 'dock-chevron');
      chev.title = 'Collapse panel (double-click header)';
      chev.setAttribute('aria-label', 'Collapse panel');
      chev.onclick = () => this.togglePanel(id);
      head.appendChild(chev);
      head.addEventListener('dblclick', (e) => {
        if (e.target instanceof HTMLButtonElement && e.target !== chev) return;
        this.togglePanel(id);
      });
    }
  }

  togglePanel(id: 'tool' | 'lib'): void {
    const panel = $(`dock-${id}`);
    panel.classList.toggle('collapsed');
    this.collapsed[id] = panel.classList.contains('collapsed');
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(this.collapsed));
  }

  // ----------------------------------------------------- instruments

  private initInstruments(): void {
    for (const id of ['minimap', 'zoom', 'clock'] as const) {
      const card = $(`inst-${id}`);
      this.placeInstrument(id, this.inst.corners[id] ?? (id === 'minimap' ? 'bl' : id === 'clock' ? 'tr' : 'br'));
      if (this.inst.hidden.includes(id)) card.classList.add('hidden');
      const grip = card.querySelector<HTMLElement>('.inst-grip');
      if (!grip) continue;
      grip.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const wrap = $('canvas-wrap').getBoundingClientRect();
        const rect = card.getBoundingClientRect();
        const offX = e.clientX - rect.left;
        const offY = e.clientY - rect.top;
        card.classList.add('dragging');
        const move = (ev: MouseEvent): void => {
          const x = ev.clientX - wrap.left - offX;
          const y = ev.clientY - wrap.top - offY;
          card.style.left = `${x}px`;
          card.style.top = `${y}px`;
          card.style.right = 'auto';
          card.style.bottom = 'auto';
        };
        const up = (ev: MouseEvent): void => {
          window.removeEventListener('mousemove', move);
          window.removeEventListener('mouseup', up);
          card.classList.remove('dragging');
          // Snap to the nearest corner — instruments live in corners.
          const cx = ev.clientX - wrap.left;
          const cy = ev.clientY - wrap.top;
          const corner: Corner =
            cy < wrap.height / 2 ? (cx < wrap.width / 2 ? 'tl' : 'tr') : cx < wrap.width / 2 ? 'bl' : 'br';
          this.placeInstrument(id, corner);
          this.inst.corners[id] = corner;
          localStorage.setItem(INST_KEY, JSON.stringify(this.inst));
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
      });
    }
  }

  private placeInstrument(id: string, corner: Corner): void {
    const card = $(`inst-${id}`);
    card.style.left = corner === 'tl' || corner === 'bl' ? 'var(--s3)' : 'auto';
    card.style.right = corner === 'tr' || corner === 'br' ? 'var(--s3)' : 'auto';
    card.style.top = corner === 'tl' || corner === 'tr' ? 'var(--s3)' : 'auto';
    card.style.bottom = corner === 'bl' || corner === 'br' ? 'var(--s3)' : 'auto';
  }

  toggleInstrument(id: 'minimap' | 'zoom' | 'clock'): void {
    const card = $(`inst-${id}`);
    card.classList.toggle('hidden');
    this.inst.hidden = card.classList.contains('hidden')
      ? [...new Set([...this.inst.hidden, id])]
      : this.inst.hidden.filter((x) => x !== id);
    localStorage.setItem(INST_KEY, JSON.stringify(this.inst));
  }

  // ------------------------------------------------- mode visibility

  /** Flip every mode-owned surface. The composition root owns the rest. */
  setModeDom(mode: StudioMode, tab: 'tiles' | 'structures' | 'placements'): void {
    const isWorld = mode === 'world';
    // In zone mode the viewport owns which zone canvas shows (true vs
    // draft); world mode hides both behind the world canvas.
    if (isWorld) {
      $('editor-canvas').classList.add('hidden');
      $('stage-canvas').classList.add('hidden');
    }
    $('world-canvas').classList.toggle('hidden', !isWorld);
    $('inst-minimap').classList.toggle('mode-hidden', isWorld);
    $('inst-clock').classList.toggle('mode-hidden', isWorld);
    $('dock-tool').classList.toggle('hidden', isWorld);
    $('side-tabs').classList.toggle('hidden', isWorld);
    // The world panel opens with its own "The plan" head — the dock
    // header stays generic so the words never stutter.
    $('dock-lib-title').textContent = isWorld ? 'World' : 'Library';
    $('world-panel').classList.toggle('hidden', !isWorld);
    this.syncLibTabs(isWorld ? null : tab);
  }

  syncLibTabs(tab: 'tiles' | 'structures' | 'placements' | null): void {
    $('tab-tiles').classList.toggle('hidden', tab !== 'tiles');
    $('tab-structures').classList.toggle('hidden', tab !== 'structures');
    $('tab-placements').classList.toggle('hidden', tab !== 'placements');
  }
}
