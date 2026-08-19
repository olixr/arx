import type { ClientGame } from '../game/clientGame.js';

/**
 * THE ONE CONTROL, ONE TRUTH: is the walk-away on offer? A member may
 * leave before the gates come down, and only then — never a spectator,
 * never mid-card. The HUD chip's visibility and the pad's Ⓨ verb both
 * read THIS function, so the button and the thing you can see can
 * never promise different things.
 */
export function canWalkAway(game: ClientGame): boolean {
  const m = game.arenaMatch;
  return m !== null && m.phase === 'muster' && m.specAt === undefined;
}

/**
 * THE MATCH CARD (docs/arena-plan.md) — the arena HUD while a card
 * holds you: the card's name, one pip per round (past / now), and
 * the phase's own read — the muster and breather clocks as a draining
 * bar, the round's foes-standing count, the victory and wipe beats.
 *
 * The boss banner's laws apply whole: built in code under #hud,
 * pointer-blind (ONE exception: the walk-away chip during muster),
 * change-key DOM writes (the bar alone moves per frame,
 * transform-only), and the card lowers itself when game.arenaMatch
 * goes null.
 *
 * Three clocks the card keeps for itself (the proving pass):
 * - THE WIPE HOLDS ITS BEAT: phase 'wipe' arrives with no 'off' —
 *   the lost frame stands 2.6 s, then the card clears its own state.
 * - THE STANDS SEE THE CARD: spectator-tagged states self-expire
 *   when the fan goes quiet 5 s (a bystander who walks away is owed
 *   nothing).
 * - The muster chip is the ONE control: a member may walk away
 *   before the gates come down (the initiator's stake returns).
 */
export class ArenaHud {
  private readonly root: HTMLElement;
  private readonly head: HTMLElement;
  private readonly pips: HTMLElement;
  private readonly word: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly leave: HTMLButtonElement;
  private key = '';
  private spanMs = 1;
  private phaseSeen = '';
  /** Wired by main.ts: the walk-away verb (C2S arenaleave). */
  onLeave: (() => void) | null = null;

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
    this.leave = document.createElement('button');
    this.leave.type = 'button';
    this.leave.className = 'arena-hud-leave';
    this.leave.textContent = 'Walk away';
    this.leave.addEventListener('click', () => this.onLeave?.());
    this.root.append(this.head, this.pips, this.word, rail, this.leave);
    document.getElementById('hud')?.appendChild(this.root);
  }

  update(game: ClientGame): void {
    const m = game.arenaMatch;
    const now = performance.now();
    // The card's own clocks: the wipe beat and spectator staleness
    // end the state from THIS side (no wire message is owed).
    if (m && ((m.wipeAt !== undefined && now - m.wipeAt > 2600) ||
      (m.specAt !== undefined && now - m.specAt > 5000))) {
      game.arenaMatch = null;
    }
    const live = game.arenaMatch;
    if (!live) {
      if (this.key !== '') {
        this.key = '';
        this.phaseSeen = '';
        this.spanMs = 1;
        this.root.classList.remove('up', 'won', 'lost', 'spec', 'leavable');
      }
      return;
    }
    const remain = live.deadlineAt !== null ? Math.max(0, live.deadlineAt - now) : null;
    // A fresh phase pins the rail's span to its opening read — the
    // bar drains against it (the bar is a feel; the seconds label is
    // the truth).
    if (live.phase !== this.phaseSeen) {
      this.phaseSeen = live.phase;
      this.spanMs = remain ?? 1;
    }
    // The clock fill is the ONE per-frame write, and only while a
    // clock actually runs.
    if (remain !== null) {
      this.bar.style.transform = `scaleX(${Math.min(1, remain / Math.max(1, this.spanMs))})`;
    }
    const spec = live.specAt !== undefined;
    const key =
      `${live.venue}:${live.phase}:${live.round}/${live.rounds}:${live.foes ?? ''}:` +
      `${spec ? 's' : ''}:${remain !== null ? Math.ceil(remain / 1000) : ''}`;
    if (key === this.key) return;
    this.key = key;

    this.root.classList.add('up');
    this.root.classList.toggle('won', live.phase === 'victory');
    this.root.classList.toggle('lost', live.phase === 'wipe');
    this.root.classList.toggle('spec', spec);
    this.head.textContent = live.name ?? '';

    // Round pips, rebuilt only when the shape moves (count is tiny).
    const rounds = live.rounds ?? 0;
    if (this.pips.childElementCount !== rounds) {
      this.pips.replaceChildren();
      for (let i = 0; i < rounds; i++) {
        this.pips.appendChild(document.createElement('i'));
      }
    }
    for (let i = 0; i < this.pips.childElementCount; i++) {
      const pip = this.pips.children[i] as HTMLElement;
      const r = (live.round ?? 1) - 1;
      pip.className = i < r || live.phase === 'victory' ? 'past' : i === r ? 'now' : '';
    }

    const secs = remain !== null ? Math.ceil(remain / 1000) : null;
    this.word.textContent =
      live.phase === 'muster'
        ? spec
          ? `A card is bought. ${secs ?? ''}`
          : `Take the sand. ${secs ?? ''}`
        : live.phase === 'gates'
          ? 'The gates come down.'
          : live.phase === 'breather'
            ? `The far gate stirs. ${secs ?? ''}`
            : live.phase === 'round'
              ? live.foes === 1
                ? 'One stands.'
                : `${live.foes ?? 0} stand.`
              : live.phase === 'victory'
                ? 'The sand is yours.'
                : live.phase === 'wipe'
                  ? 'The sand keeps its due.'
                  : '';
    this.root.classList.toggle('clocked', remain !== null);
    // THE ONE CONTROL: walking away is offered to enrolled members
    // during the muster alone — never to spectators, never mid-card
    // (mid-card the door is the same one it always was: the fight).
    this.root.classList.toggle('leavable', canWalkAway(game));
  }
}
