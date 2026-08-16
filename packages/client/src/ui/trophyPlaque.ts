/**
 * THE CHAMPION'S PLAQUE — the proximity read on a standing victory
 * banner: walk up, and the mark speaks its names.
 *
 * The SignHud plaque's contract, applied whole (speechBubbles copies
 * it too — this is the reference shape for world-anchored DOM):
 * caller owns proximity per frame; this owns fade, dwell, re-arm, and
 * the measure-ONCE-per-paint law (offsetWidth per frame = a forced
 * reflow beside every banner). Pointer-events none — reading is
 * passive and never gates input.
 *
 * The dress is NOT the sign's parchment: a broken camp's mark is a
 * monument, not a notice — smoked ink, a gold rule, the kicker in
 * the standard's accent, the champions' names in roll order.
 */
import type { TrophyWire } from '@arx/shared';

const FADE_MS = 180;
/** Longer than a sign's dwell — names deserve the second read. */
const DWELL_MS = 6400;
/** Show this many names before folding the rest into a count. */
const NAME_ROLL_CAP = 6;

/** "staked moments ago" → "staked 11 min past" — the mark keeps time. */
function ageLine(at: number): string {
  const min = Math.floor((Date.now() - at) / 60_000);
  if (min < 1) return 'staked moments ago';
  if (min === 1) return 'staked a minute past';
  return `staked ${min} min past`;
}

export class TrophyHud {
  private readonly plaque = document.createElement('div');
  private shownKey = '';
  private shownAt = 0;
  private retired = false;
  private plaqueW = 0;
  private plaqueH = 0;
  private lastTransform = '';
  private lastClamped = false;

  constructor() {
    this.plaque.id = 'trophy-plaque';
    this.plaque.className = 'hidden';
    document.body.appendChild(this.plaque);
  }

  /**
   * Per-frame: show the plaque over `t` at screen point (sx, sy), or
   * pass null when no banner is near.
   */
  update(t: TrophyWire | null, sx = 0, sy = 0): void {
    if (!t) {
      if (this.shownKey !== '') {
        this.shownKey = '';
        this.retired = false;
        this.plaque.classList.add('hidden');
      }
      return;
    }
    const key = `${t.id}:${t.by.join('|')}`;
    if (key !== this.shownKey) {
      this.shownKey = key;
      this.shownAt = performance.now();
      this.retired = false;
      this.paint(t);
      this.plaque.classList.remove('hidden');
      this.plaqueW = this.plaque.offsetWidth;
      this.plaqueH = this.plaque.offsetHeight;
      this.lastTransform = '';
    }
    const age = performance.now() - this.shownAt;
    if (!this.retired && age > DWELL_MS) {
      this.retired = true;
      this.plaque.classList.add('bowed');
      this.plaque.style.opacity = '';
    }
    if (!this.retired && age < FADE_MS + 50) {
      this.plaque.style.opacity = String(Math.min(1, age / FADE_MS));
    }
    const w = this.plaqueW;
    const h = this.plaqueH;
    const x = Math.max(w / 2 + 8, Math.min(window.innerWidth - w / 2 - 8, sx));
    const yWanted = sy;
    const y = Math.max(h + 10, Math.min(window.innerHeight - 10, yWanted));
    const clamped = Math.abs(y - yWanted) > 1 || Math.abs(x - sx) > 1;
    if (clamped !== this.lastClamped) {
      this.lastClamped = clamped;
      this.plaque.classList.toggle('clamped', clamped);
    }
    const tf = `translate(calc(${Math.round(x)}px - 50%), calc(${Math.round(y)}px - 100%))`;
    if (tf !== this.lastTransform) {
      this.lastTransform = tf;
      this.plaque.style.transform = tf;
    }
  }

  private paint(t: TrophyWire): void {
    this.plaque.innerHTML = '';
    this.plaque.classList.remove('bowed');
    this.plaque.classList.remove('clamped');
    this.lastClamped = false;

    const kicker = document.createElement('div');
    kicker.className = 'trophy-kicker';
    kicker.textContent = 'cleared';
    this.plaque.appendChild(kicker);

    const name = document.createElement('div');
    name.className = 'trophy-name';
    name.textContent = t.name;
    this.plaque.appendChild(name);

    const rule = document.createElement('div');
    rule.className = 'trophy-rule';
    rule.innerHTML = '<i></i><b></b><i></i>';
    this.plaque.appendChild(rule);

    if (t.by.length === 0) {
      const row = document.createElement('div');
      row.className = 'trophy-line trophy-unsigned';
      row.textContent = 'The deed stands unsigned';
      this.plaque.appendChild(row);
    } else {
      const lead = document.createElement('div');
      lead.className = 'trophy-line trophy-slayer';
      lead.textContent = t.by[0]!;
      this.plaque.appendChild(lead);
      const fellows = t.by.slice(1, 1 + NAME_ROLL_CAP);
      if (fellows.length > 0) {
        const row = document.createElement('div');
        row.className = 'trophy-line';
        row.textContent = `with ${fellows.join(' · ')}`;
        this.plaque.appendChild(row);
      }
      const more = t.by.length - 1 - fellows.length;
      if (more > 0) {
        const row = document.createElement('div');
        row.className = 'trophy-line trophy-more';
        row.textContent = `and ${more} more`;
        this.plaque.appendChild(row);
      }
    }

    const when = document.createElement('div');
    when.className = 'trophy-when';
    when.textContent = ageLine(t.at);
    this.plaque.appendChild(when);

    const tail = document.createElement('div');
    tail.className = 'trophy-tail';
    this.plaque.appendChild(tail);
  }
}
