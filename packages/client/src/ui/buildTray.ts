import { itemDef, BUILDABLES, DYES } from '@arx/content';
import { buildableIconUrl, itemIconUrl, DYE_SWATCHES } from '../render/icons.js';
import { needChip } from './panel.js';

/**
 * THE BUILDER'S TRAY — the mode's face. While build mode is on, this
 * strip pins over the world and answers the three questions the old
 * mode never did: what am I placing, can I still afford it, and which
 * way is it turned. A recents row keeps the last few pieces one click
 * away, so switching floor→wall→doorway never means reopening the
 * palette. When the demolish modifier is held it wears the armed
 * color and says so.
 */
export interface BuildTrayState {
  /** Selected buildable id. */
  id: string;
  /** Dial reading for orientable pieces — null hides the line. */
  orient: string | null;
  /** Live material story, pack-side. */
  mats: Array<{ item: string; have: number; need: number }>;
  /** The demolish modifier is held right now. */
  armed: boolean;
  /** Recently used pieces (excluding the current one), most recent first. */
  recents: readonly string[];
  /** THE DYE LAW's dial: chosen index for a dyeable piece, null = not dyeable. */
  dye: number | null;
}

export class BuildTray {
  private readonly el = document.getElementById('build-tray')!;
  private sig = '';

  constructor(
    private readonly onPick: (id: string) => void,
    private readonly onDye: (dye: number) => void,
  ) {}

  hide(): void {
    if (this.sig === '') return;
    this.sig = '';
    this.el.classList.add('hidden');
  }

  /** Frame-safe: rebuilds the DOM only when the state actually moved. */
  update(state: BuildTrayState): void {
    const sig = [
      state.id,
      state.orient ?? '',
      state.armed ? 'A' : '',
      state.mats.map((m) => `${m.item}:${m.have}/${m.need}`).join(','),
      state.recents.join(','),
      state.dye === null ? '' : `d${state.dye}`,
    ].join('|');
    if (sig === this.sig) return;
    this.sig = sig;

    const def = BUILDABLES.get(state.id);
    this.el.innerHTML = '';
    this.el.classList.toggle('armed', state.armed);

    const icon = document.createElement('img');
    icon.className = 'tray-icon';
    icon.src = buildableIconUrl(state.id, 40) ?? itemIconUrl('log', 40);
    icon.draggable = false;
    this.el.appendChild(icon);

    const names = document.createElement('div');
    names.className = 'tray-names';
    const name = document.createElement('div');
    name.className = 'tray-name';
    name.textContent = def?.name ?? state.id;
    names.appendChild(name);
    if (state.armed) {
      const armed = document.createElement('div');
      armed.className = 'tray-armed';
      armed.textContent = 'Tearing down';
      names.appendChild(armed);
    } else if (state.orient) {
      const orient = document.createElement('div');
      orient.className = 'tray-orient';
      orient.textContent = `Turned: ${state.orient}`;
      names.appendChild(orient);
    }
    this.el.appendChild(names);

    const mats = document.createElement('div');
    mats.className = 'tray-mats';
    for (const m of state.mats) {
      mats.appendChild(
        needChip(itemIconUrl(m.item, 24), m.have, m.need, itemDef(m.item)?.name ?? m.item),
      );
    }
    this.el.appendChild(mats);

    // THE DYE LAW's swatch row: ten cloths, the chosen one ringed.
    // One click re-dyes the NEXT placement — the ghost answers live.
    if (state.dye !== null) {
      const dyes = document.createElement('div');
      dyes.className = 'tray-dyes';
      for (let i = 0; i < DYE_SWATCHES.length; i++) {
        const b = document.createElement('button');
        b.className = 'tray-dye' + (i === state.dye ? ' picked' : '');
        b.title = DYES[i]?.name ?? `Dye ${i}`;
        b.style.background = DYE_SWATCHES[i]!;
        b.addEventListener('click', () => this.onDye(i));
        dyes.appendChild(b);
      }
      this.el.appendChild(dyes);
    }

    if (state.recents.length > 0) {
      const recents = document.createElement('div');
      recents.className = 'tray-recents';
      for (const id of state.recents) {
        const rDef = BUILDABLES.get(id);
        if (!rDef) continue;
        const btn = document.createElement('button');
        btn.className = 'tray-recent';
        btn.title = rDef.name;
        const img = document.createElement('img');
        img.src = buildableIconUrl(id, 34) ?? itemIconUrl('log', 34);
        img.draggable = false;
        btn.appendChild(img);
        btn.addEventListener('click', () => this.onPick(id));
        recents.appendChild(btn);
      }
      this.el.appendChild(recents);
    }

    this.el.classList.remove('hidden');
  }
}
