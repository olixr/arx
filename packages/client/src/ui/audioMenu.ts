/**
 * The sound menu — four sliders (master, music, effects, ambience)
 * over the engine's user-volume layer, persisted to localStorage, and
 * a now-playing line for the track player. Volumes multiply the tuned
 * bus mix; 100% is exactly the shipped balance.
 */

import type { AudioEngine, VolumeKind } from '../audio/engine.js';
import type { TrackPlayer } from '../audio/tracks.js';

const STORE_KEY = 'devcraft.audio.v1';

const ROWS: Array<[VolumeKind, string]> = [
  ['master', 'Master'],
  ['music', 'Music'],
  ['sfx', 'Effects'],
  ['ambience', 'Ambience'],
];

/** "night_adventure_2" → "Night Adventure 2". */
function prettyName(name: string | null): string {
  if (!name) return 'Nothing playing — the world has the floor.';
  const title = name
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
  return `Now playing: ${title}`;
}

export class AudioMenu {
  private panel: HTMLElement;
  private nowLine: HTMLElement;
  private nowTimer: number | null = null;

  constructor(
    private engine: AudioEngine,
    private tracks: TrackPlayer,
  ) {
    this.panel = document.getElementById('audio-panel')!;
    const rows = document.getElementById('audio-rows')!;
    this.nowLine = document.getElementById('audio-nowplaying')!;

    // Restore saved volumes before any sound plays.
    let saved: Partial<Record<VolumeKind, number>> = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') as typeof saved;
    } catch {
      saved = {};
    }

    for (const [kind, label] of ROWS) {
      const v = saved[kind];
      if (typeof v === 'number' && Number.isFinite(v)) this.engine.setUserVolume(kind, v);

      const row = document.createElement('div');
      row.className = 'audio-row';
      const lab = document.createElement('label');
      lab.textContent = label;
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '100';
      slider.step = '1';
      slider.value = String(Math.round(this.engine.getUserVolume(kind) * 100));
      // The pad walks the sliders too: focus + Ⓐ nudges right, wrap to 0.
      slider.dataset.nav = '';
      slider.dataset.navkey = `audio:${kind}`;
      slider.dataset.acta = 'Adjust';
      const pct = document.createElement('span');
      pct.className = 'audio-pct';
      pct.textContent = `${slider.value}%`;
      slider.addEventListener('input', () => {
        const val = Number(slider.value) / 100;
        this.engine.setUserVolume(kind, val);
        pct.textContent = `${slider.value}%`;
        this.save();
      });
      row.appendChild(lab);
      row.appendChild(slider);
      row.appendChild(pct);
      rows.appendChild(row);
    }
  }

  private save(): void {
    const out: Partial<Record<VolumeKind, number>> = {};
    for (const [kind] of ROWS) out[kind] = this.engine.getUserVolume(kind);
    localStorage.setItem(STORE_KEY, JSON.stringify(out));
  }

  get isOpen(): boolean {
    return !this.panel.classList.contains('hidden');
  }

  open(): void {
    this.panel.classList.remove('hidden');
    if (this.nowTimer !== null) window.clearInterval(this.nowTimer);
    const refresh = (): void => {
      this.nowLine.textContent = prettyName(this.tracks.current);
    };
    refresh();
    this.nowTimer = window.setInterval(refresh, 1000);
  }

  close(): void {
    this.panel.classList.add('hidden');
    if (this.nowTimer !== null) {
      window.clearInterval(this.nowTimer);
      this.nowTimer = null;
    }
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }
}
