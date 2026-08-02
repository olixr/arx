/**
 * THE CLOCK INSTRUMENT — scrub the world's hour and the whole frame
 * answers: shadows swing, lamplight pools, windows warm (the entire
 * true viewport keys off one daylightAt sample). Presets ride the
 * command registry too, so ⌘K "dusk" lands the golden hour.
 */

import { el } from '../studio2/kit.js';
import type { EditorStage } from './stage.js';

const PRESETS: Array<[string, number]> = [
  ['Dawn', 6],
  ['Noon', 12],
  ['Dusk', 18.5],
  ['Night', 0],
];

export class ClockInstrument {
  private readonly range: HTMLInputElement;
  private readonly readout: HTMLElement;
  private readonly presetBtns: HTMLButtonElement[] = [];

  constructor(host: HTMLElement, private readonly stage: EditorStage) {
    const row = el('div', 'clock-row');
    this.readout = el('output', 'clock-readout', '12:00');
    this.readout.title = 'The world clock — the true viewport lights itself by it';
    row.appendChild(this.readout);
    this.range = el('input');
    this.range.type = 'range';
    this.range.min = '0';
    this.range.max = '24';
    this.range.step = '0.25';
    this.range.value = '12';
    this.range.setAttribute('aria-label', 'World clock hours');
    this.range.oninput = () => this.set(Number(this.range.value));
    const track = el('label', 'k-slider clock-track');
    track.appendChild(this.range);
    row.appendChild(track);
    host.appendChild(row);

    const presets = el('div', 'clock-presets');
    for (const [name, h] of PRESETS) {
      const b = el('button', 'opt-btn', name);
      b.onclick = () => this.set(h);
      this.presetBtns.push(b);
      presets.appendChild(b);
    }
    host.appendChild(presets);
    this.paint();
  }

  set(hours: number): void {
    this.stage.setHours(hours);
    this.paint();
  }

  private paint(): void {
    const h = this.stage.hours;
    this.range.value = String(h);
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    this.readout.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    for (const b of this.presetBtns) {
      const preset = PRESETS.find(([name]) => name === b.textContent)?.[1];
      b.classList.toggle('active', preset !== undefined && Math.abs(preset - h) < 0.01);
    }
  }
}
