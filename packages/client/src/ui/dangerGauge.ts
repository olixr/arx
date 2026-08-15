import { DANGER_LAWS, THREAT_WORDS, dangerLaw } from '@arx/content';

/**
 * THE DANGER GAUGE — the ladder on your wrist.
 *
 * A small smoked-glass chip in the HUD's top-left that always answers
 * the walker's first question: what does the land under my feet deal?
 * A row of diamond pips (the herald's pip dialect, one per DANGER_LAWS
 * rung), the band's threat word in small caps, and the level range it
 * spawns. The chip re-inks only when the tier actually changes, and a
 * change breathes once — a quiet pulse, transform/opacity only, gated
 * on body.no-ui-motion like every kit animation.
 *
 * Smoked-glass tier (the live HUD only whispers): in settled land the
 * chip dims to a murmur; in the deep bands the lit pips carry the
 * band's own ink, the same ramp the chart's danger wash speaks — one
 * ladder, every surface.
 */

/** Rungs shown: DANGER_LAWS rows 1..10 (tier 0 lights nothing). */
const RUNGS = DANGER_LAWS.length - 1;

/**
 * Solid ink per tier for lit pips — the TIER_WASH ramp re-mixed for
 * dark glass: the low bands keep their meadow-to-ember climb, and past
 * the lampless dark the ink goes spectral instead of black, because a
 * pip must GLOW where a map wash may drown.
 */
const TIER_INK = [
  'rgb(110, 190, 130)',
  'rgb(150, 195, 100)',
  'rgb(215, 190, 80)',
  'rgb(230, 140, 60)',
  'rgb(225, 90, 62)',
  'rgb(205, 55, 100)',
  'rgb(165, 70, 205)',
  'rgb(130, 90, 235)',
  'rgb(110, 120, 245)',
  'rgb(175, 185, 255)',
  'rgb(255, 92, 64)',
];

export class DangerGauge {
  private readonly el: HTMLElement;
  private readonly pips: HTMLElement[] = [];
  private readonly word: HTMLElement;
  private readonly band: HTMLElement;
  private shownTier = -2; // never rendered
  private hidden = true;

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'danger-gauge';
    this.el.classList.add('hidden');

    const row = document.createElement('div');
    row.className = 'danger-pips';
    for (let i = 0; i < RUNGS; i++) {
      const pip = document.createElement('span');
      pip.className = 'danger-pip';
      row.appendChild(pip);
      this.pips.push(pip);
    }
    this.el.appendChild(row);

    const line = document.createElement('div');
    line.className = 'danger-line';
    this.word = document.createElement('span');
    this.word.className = 'danger-word';
    this.band = document.createElement('span');
    this.band.className = 'danger-band';
    line.append(this.word, this.band);
    this.el.appendChild(line);

    document.getElementById('hud')!.appendChild(this.el);
  }

  /**
   * Per-frame. `tier` is the danger field at the walker's feet, or
   * null to stand the gauge down (underground, cinema, build mode —
   * the dark and the workbench keep their own chrome).
   */
  update(tier: number | null): void {
    const hide = tier === null;
    if (hide !== this.hidden) {
      this.hidden = hide;
      this.el.classList.toggle('hidden', hide);
    }
    if (hide || tier === this.shownTier) return;
    const first = this.shownTier === -2;
    this.shownTier = tier;

    const ink = TIER_INK[Math.max(0, Math.min(TIER_INK.length - 1, tier))]!;
    this.el.style.setProperty('--danger-ink', ink);
    this.el.classList.toggle('is-settled', tier === 0);
    for (const [i, pip] of this.pips.entries()) {
      if (i < tier) pip.dataset.lit = '1';
      else delete pip.dataset.lit;
    }
    if (tier === 0) {
      this.word.textContent = THREAT_WORDS[0]!;
      this.band.textContent = '';
    } else {
      const [lo, hi] = dangerLaw(tier).npcLevel;
      this.word.textContent =
        THREAT_WORDS[Math.max(0, Math.min(THREAT_WORDS.length - 1, tier))]!;
      this.band.textContent = `Lv ${lo}–${hi}`;
    }
    // The crossing breathes once — never on the first paint of a session.
    if (!first) {
      this.el.classList.remove('is-crossing');
      // Restart the animation even when two crossings land close.
      void this.el.offsetWidth;
      this.el.classList.add('is-crossing');
    }
  }
}
