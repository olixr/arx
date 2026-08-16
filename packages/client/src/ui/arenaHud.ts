import type { ClientGame } from '../game/clientGame.js';

/**
 * THE MATCH CARD (docs/arena-plan.md) — the arena HUD while a card
 * holds you: the card's name, one pip per round (past / now), and
 * the phase's own read — the muster and breather clocks as a draining
 * bar, the round's foes-standing count, the victory and wipe beats.
 *
 * The boss banner's laws apply whole: built in code under #hud,
 * pointer-events none, change-key DOM writes (the bar alone moves
 * per frame, transform-only via a CSS custom property), and the
 * card lowers itself when game.arenaMatch goes null.
 */
export class ArenaHud {
  private readonly root: HTMLElement;
  private readonly head: HTMLElement;
  private readonly pips: HTMLElement;
  private readonly word: HTMLElement;
  private readonly bar: HTMLElement;
  private key = '';

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'arena-hud';
    this.head = document.createElement('div');
    this.head.className = 'arena-hud-head';
    this.pips = document.createElement('div');
    this.pips.className = 'arena-hud-pips';
    this.word = document.createElement('div');
    this.word.className = 'arena-hud-word';
    const rail = document.createElement('div');
    rail.className = 'arena-hud-rail';
    this.bar = document.createElement('div');
    this.bar.className = 'arena-hud-bar';
    rail.appendChild(this.bar);
    this.root.append(this.head, this.pips, this.word, rail);
    document.getElementById('hud')?.appendChild(this.root);
  }

  update(game: ClientGame): void {
    const m = game.arenaMatch;
    if (!m) {
      if (this.key !== '') {
        this.key = '';
        this.root.classList.remove('up', 'won', 'lost');
      }
      return;
    }
    const now = performance.now();
    const remain = m.deadlineAt !== null ? Math.max(0, m.deadlineAt - now) : null;
    // A fresh phase pins the rail's span to its opening read — the
    // bar drains against it (the bar is a feel; the seconds label is
    // the truth).
    if (m.phase !== this.phaseSeen) {
      this.phaseSeen = m.phase;
      this.spanMs = remain ?? 1;
    }
    // The clock fill is the ONE per-frame write, and only while a
    // clock actually runs.
    if (remain !== null) {
      this.bar.style.transform = `scaleX(${Math.min(1, remain / Math.max(1, this.spanMs))})`;
    }
    const key =
      `${m.venue}:${m.phase}:${m.round}/${m.rounds}:${m.foes ?? ''}:` +
      `${remain !== null ? Math.ceil(remain / 1000) : ''}`;
    if (key === this.key) return;
    this.key = key;

    this.root.classList.add('up');
    this.root.classList.toggle('won', m.phase === 'victory');
    this.root.classList.toggle('lost', m.phase === 'wipe');
    this.head.textContent = m.name ?? '';

    // Round pips, rebuilt only when the shape moves (count is tiny).
    const rounds = m.rounds ?? 0;
    if (this.pips.childElementCount !== rounds) {
      this.pips.replaceChildren();
      for (let i = 0; i < rounds; i++) {
        this.pips.appendChild(document.createElement('i'));
      }
    }
    for (let i = 0; i < this.pips.childElementCount; i++) {
      const pip = this.pips.children[i] as HTMLElement;
      const r = (m.round ?? 1) - 1;
      pip.className = i < r || m.phase === 'victory' ? 'past' : i === r ? 'now' : '';
    }

    const secs = remain !== null ? Math.ceil(remain / 1000) : null;
    this.word.textContent =
      m.phase === 'muster'
        ? `Take the sand. ${secs ?? ''}`
        : m.phase === 'gates'
          ? 'The gates come down.'
          : m.phase === 'breather'
            ? `The far gate stirs. ${secs ?? ''}`
            : m.phase === 'round'
              ? m.foes === 1
                ? 'One stands.'
                : `${m.foes ?? '?'} stand.`
              : m.phase === 'victory'
                ? 'The sand is yours.'
                : m.phase === 'wipe'
                  ? 'The sand keeps its due.'
                  : '';
    this.root.classList.toggle('clocked', remain !== null);
  }

  private spanMs = 1;
  private phaseSeen = '';
}
