import type { RepStandingWire } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';
import { dockGlyphUrl } from '../render/icons.js';
import { dressPanel } from './panel.js';
import { ringGauge } from './kit/ring.js';

/**
 * THE STANDING SCREEN — the name you carry, read back (Phase 1 of
 * docs/factions-plan.md). One row per faction: sigil, name, the band
 * it speaks of you in, and the banded meter. Pure presentation of the
 * pushed ledger — bands arrive server-derived (the band law); the
 * client never re-computes thresholds.
 */

/** Band -> ink. Hostile rungs burn ember; earned rungs warm to gold. */
const BAND_INK: Record<string, string> = {
  hunted: '#f0655a',
  outlaw: '#e08a52',
  suspect: '#c8a36a',
  neutral: '#9a8f78',
  known: '#d8c08c',
  trusted: '#e8b64c',
  champion: '#f2c94c',
};

/** The band's one-line meaning, shown under the meter. */
const BAND_WORD: Record<string, string> = {
  hunted: 'They hunt you on sight.',
  outlaw: 'Doors close and steel comes out.',
  suspect: 'Watched, and not warmly.',
  neutral: 'A stranger, no more, no less.',
  known: 'Your name gets a nod.',
  trusted: 'Doors open that stay shut to strangers.',
  champion: 'They tell stories with you in them.',
};

export class RepScreen {
  private readonly panel = document.getElementById('rep-panel')!;
  private readonly body: HTMLElement;
  private renderedVersion = -1;

  constructor(private readonly game: ClientGame) {
    dressPanel(this.panel, {
      icon: dockGlyphUrl('rep', 44),
      hint: 'How the powers of the Dawnlands speak of you — deeds write it, nothing erases it but deeds.',
      onClose: () => this.close(),
    });
    this.body = document.createElement('div');
    this.body.className = 'rep-body';
    this.panel.appendChild(this.body);
  }

  get isOpen(): boolean {
    return !this.panel.classList.contains('hidden');
  }

  open(): void {
    this.panel.classList.remove('hidden');
    // Rebuild only when the ledger moved — the version check replaces
    // the old forced full rebuild on every open. The rows are pure
    // presentation of the pushed standings, so an unmoved version
    // means an already-true page.
    if (this.renderedVersion !== this.game.repVersion) this.render();
  }

  close(): void {
    this.panel.classList.add('hidden');
  }

  /** Quiet-wire hook: repaint only when open and only on change. */
  refresh(): void {
    if (!this.isOpen || this.renderedVersion === this.game.repVersion) return;
    this.render();
  }

  private render(): void {
    this.renderedVersion = this.game.repVersion;
    this.body.innerHTML = '';
    const rows = [...this.game.repStandings.values()];
    if (rows.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'quest-empty';
      empty.textContent = 'The world has no opinion of you yet. It will.';
      this.body.appendChild(empty);
      return;
    }
    for (const s of rows) this.body.appendChild(this.factionRow(s));
  }

  private factionRow(s: RepStandingWire): HTMLElement {
    const row = document.createElement('div');
    row.className = 'rep-row';
    row.dataset.nav = '';
    row.dataset.navkey = `rep:${s.faction}`;
    row.dataset.tipname = s.name;

    const head = document.createElement('div');
    head.className = 'rep-row-head';
    // The crest: the faction's mark ringed by the weight of its
    // opinion, inked in the band's own color (Grand Refit Ph6).
    const ink = BAND_INK[s.band] ?? '#efe3c2';
    const ring = ringGauge(Math.min(1, Math.abs(s.value) / 100), { tone: ink });
    ring.root.classList.add('rep-crest');
    const initials = document.createElement('span');
    initials.className = 'rep-crest-mark';
    // The mark: initials of the WEIGHT-BEARING words (articles walk),
    // so the Rookery and the Red Company never share a crest.
    const words = s.name.split(/\s+/).filter((w) => !/^(the|of|and)$/i.test(w));
    initials.textContent = (
      words.length >= 2 ? words.map((w) => w[0] ?? '').join('') : (words[0] ?? s.name).slice(0, 2)
    )
      .slice(0, 2)
      .toUpperCase();
    initials.style.color = ink;
    ring.center.appendChild(initials);
    head.appendChild(ring.root);
    const titles = document.createElement('span');
    titles.className = 'rep-titles';
    const name = document.createElement('span');
    name.className = 'rep-name';
    name.textContent = s.name;
    const band = document.createElement('span');
    band.className = 'rep-band';
    band.textContent = bandLabel(s.band);
    band.style.color = ink;
    titles.append(name, band);
    head.appendChild(titles);

    // The banded meter: a centered notch, standing filling out from it.
    const meter = document.createElement('div');
    meter.className = 'rep-meter';
    const notch = document.createElement('div');
    notch.className = 'rep-meter-notch';
    const fill = document.createElement('div');
    fill.className = 'rep-meter-fill';
    const frac = Math.min(1, Math.abs(s.value) / 100);
    fill.style.width = `${frac * 50}%`;
    fill.style.background = BAND_INK[s.band] ?? '#9a8f78';
    if (s.value >= 0) fill.style.left = '50%';
    else fill.style.right = '50%';
    meter.append(notch, fill);
    meter.title = `${s.value > 0 ? '+' : ''}${s.value}`;

    const word = document.createElement('div');
    word.className = 'rep-word';
    word.textContent = `${BAND_WORD[s.band] ?? ''} ${priceWord(s.band, this.game.repPrices)}`.trim();

    row.append(head, meter, word);

    // The "lately" line: the most recent move, client-remembered.
    const last = this.game.repLastDelta.get(s.faction);
    if (last && Date.now() - last.at < 12 * 3_600_000) {
      const lately = document.createElement('div');
      lately.className = 'rep-lately';
      lately.textContent = `Lately: ${last.delta > 0 ? '+' : '−'}${Math.abs(last.delta)}`;
      lately.style.color = last.delta > 0 ? '#d8c08c' : '#c8a36a';
      row.appendChild(lately);
    }
    return row;
  }
}

/** 'known' -> 'Known' — the band's display word. */
function bandLabel(band: string): string {
  return band.length === 0 ? band : band[0]!.toUpperCase() + band.slice(1);
}

/**
 * What the band does to this faction's counters — phrased from the
 * LIVE multipliers the server pushed, so the legend never drifts
 * from the coins actually taken.
 */
function priceWord(
  band: string,
  prices: { champion: number; trusted: number; known: number; neutral: number; suspect: number } | null,
): string {
  if (!prices) return '';
  const mult =
    band === 'champion'
      ? prices.champion
      : band === 'trusted'
        ? prices.trusted
        : band === 'known'
          ? prices.known
          : band === 'suspect'
            ? prices.suspect
            : band === 'neutral'
              ? prices.neutral
              : null;
  if (mult === null) return 'Their counters are closed to you.';
  if (mult === 1) return '';
  const pct = Math.round(Math.abs(1 - mult) * 100);
  return mult < 1 ? `Their counters run ${pct}% kind.` : `Their counters run ${pct}% dear.`;
}
