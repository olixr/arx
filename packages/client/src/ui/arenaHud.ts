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
 * THE MATCH CARD (docs/arena-plan.md §11) — the arena HUD while a card
 * holds you, recut at the venue's own grand scale: a winged marquee
 * band carrying the card's name and the round studs, the phase's read
 * as a spoken line, THE COUNT — one great serif numeral that is the
 * muster and breather clocks (and the foes still standing, mid-round)
 * — and the fuse rail, burning from both ends toward the center the
 * way a stage light dies.
 *
 * The boss banner's laws apply whole: built in code under #hud,
 * pointer-blind (ONE exception: the walk-away chip during muster),
 * change-key DOM writes (the fuse alone moves per frame,
 * transform-only; the numeral turns at most once a second, riding the
 * key), and the card lowers itself when game.arenaMatch goes null.
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
/** The round's spoken number ("The second round."), 1-based. */
const ORDINALS = [
  '',
  'first round',
  'second round',
  'third round',
  'fourth round',
  'fifth round',
  'sixth round',
  'seventh round',
];

export class ArenaHud {
  private readonly root: HTMLElement;
  private readonly head: HTMLElement;
  private readonly pips: HTMLElement;
  private readonly word: HTMLElement;
  private readonly count: HTMLElement;
  private readonly countWord: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly leave: HTMLButtonElement;
  private key = '';
  private spanMs = 1;
  private phaseSeen = '';
  private countShown = '';
  private beatSec = -1;
  /** Wired by main.ts: the walk-away verb (C2S arenaleave). */
  onLeave: (() => void) | null = null;
  /**
   * Wired by main.ts: THE COUNT SPEAKS — one beat per closing second
   * of a member's muster/breather clock (never for the stands).
   */
  onCountBeat: ((secs: number) => void) | null = null;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'arena-hud';

    // The marquee: two tapering wings flank the card's name and the
    // round studs — the band that says AN OCCASION HOLDS YOU.
    const marquee = document.createElement('div');
    marquee.className = 'arena-hud-marquee';
    const wingW = document.createElement('i');
    wingW.className = 'arena-hud-wing w';
    const wingE = document.createElement('i');
    wingE.className = 'arena-hud-wing e';
    const core = document.createElement('div');
    core.className = 'arena-hud-core';
    this.head = document.createElement('div');
    this.head.className = 'arena-hud-head';
    this.pips = document.createElement('div');
    this.pips.className = 'arena-hud-pips';
    core.append(this.head, this.pips);
    const shine = document.createElement('i');
    shine.className = 'arena-hud-shine';
    marquee.append(wingW, core, wingE, shine);

    this.word = document.createElement('div');
    this.word.className = 'arena-hud-word';

    // THE COUNT: the one great numeral, with its quiet label beneath.
    const clock = document.createElement('div');
    clock.className = 'arena-hud-clock';
    this.count = document.createElement('div');
    this.count.className = 'arena-hud-count';
    this.countWord = document.createElement('div');
    this.countWord.className = 'arena-hud-count-word';
    clock.append(this.count, this.countWord);

    const rail = document.createElement('div');
    rail.className = 'arena-hud-rail';
    this.bar = document.createElement('div');
    this.bar.className = 'arena-hud-bar';
    const jewelW = document.createElement('i');
    jewelW.className = 'arena-hud-jewel w';
    const jewelE = document.createElement('i');
    jewelE.className = 'arena-hud-jewel e';
    rail.append(this.bar);

    this.leave = document.createElement('button');
    this.leave.type = 'button';
    this.leave.className = 'arena-hud-leave';
    this.leave.textContent = 'Walk away';
    this.leave.addEventListener('click', () => this.onLeave?.());

    const railRow = document.createElement('div');
    railRow.className = 'arena-hud-rail-row';
    railRow.append(jewelW, rail, jewelE);

    this.root.append(marquee, this.word, clock, railRow, this.leave);
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
        this.countShown = '';
        this.beatSec = -1;
        this.root.classList.remove('up', 'won', 'lost', 'spec', 'leavable', 'urgent', 'counted', 'turn');
      }
      return;
    }
    const remain = live.deadlineAt !== null ? Math.max(0, live.deadlineAt - now) : null;
    // A fresh phase pins the rail's span to its opening read — the
    // fuse burns against it (the fuse is a feel; the numeral is the
    // truth) — and the marquee answers the turn with one slam.
    if (live.phase !== this.phaseSeen) {
      this.phaseSeen = live.phase;
      this.spanMs = remain ?? 1;
      this.beatSec = -1;
      this.root.classList.remove('turn');
      void this.root.offsetWidth;
      this.root.classList.add('turn');
    }
    // The fuse is the ONE per-frame write, and only while a clock
    // actually runs. It burns from both ends toward the center
    // (transform-origin center; the fill's hot tips ride the scale).
    if (remain !== null) {
      this.bar.style.transform = `scaleX(${Math.min(1, remain / Math.max(1, this.spanMs))})`;
    }
    const spec = live.specAt !== undefined;
    const secs = remain !== null ? Math.ceil(remain / 1000) : null;
    const key =
      `${live.venue}:${live.phase}:${live.round}/${live.rounds}:${live.foes ?? ''}:` +
      `${spec ? 's' : ''}:${secs ?? ''}`;
    if (key === this.key) return;
    this.key = key;

    this.root.classList.add('up');
    this.root.classList.toggle('won', live.phase === 'victory');
    this.root.classList.toggle('lost', live.phase === 'wipe');
    this.root.classList.toggle('spec', spec);
    this.head.textContent = live.name ?? '';

    // Round studs, rebuilt only when the shape moves (count is tiny).
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

    this.word.textContent =
      live.phase === 'muster'
        ? spec
          ? 'A card is bought.'
          : 'Take the sand.'
        : live.phase === 'gates'
          ? 'The gates come down.'
          : live.phase === 'breather'
            ? 'The far gate stirs.'
            : live.phase === 'round'
              // The numeral beneath carries the foes; the word
              // carries the round, so the two never say one thing.
              ? live.round !== undefined && live.round === live.rounds
                ? 'The last round.'
                : `The ${ORDINALS[live.round ?? 0] || 'round'}.`
              : live.phase === 'victory'
                ? 'The sand is yours.'
                : live.phase === 'wipe'
                  ? 'The sand keeps its due.'
                  : '';

    // THE COUNT: the muster and breather clocks own the numeral in
    // gold (turning ember over the last five); mid-round it belongs
    // to the foes still standing, in steel — a countdown of bodies,
    // never dressed as a countdown of time. The grace clocks
    // (victory's chest, the wipe) never claim it: those moments read
    // in words, and only the fuse rail carries their drain.
    const clockCount =
      live.phase === 'muster' || live.phase === 'breather' ? secs : null;
    const foesCount =
      live.phase === 'round' && live.foes !== undefined ? live.foes : null;
    const shown = clockCount ?? foesCount;
    const shownText = shown !== null ? String(shown) : '';
    this.root.classList.toggle('counted', shown !== null);
    this.count.classList.toggle('foes', clockCount === null && foesCount !== null);
    const urgent = clockCount !== null && clockCount <= 5;
    this.root.classList.toggle('urgent', urgent);
    if (shownText !== this.countShown) {
      this.countShown = shownText;
      this.count.textContent = shownText;
      // The numeral's roll restarts only when the value truly turned.
      this.count.classList.remove('tick');
      void this.count.offsetWidth;
      this.count.classList.add('tick');
      if (urgent && !spec && clockCount !== this.beatSec) {
        this.beatSec = clockCount;
        this.onCountBeat?.(clockCount);
      }
    }
    this.countWord.textContent =
      clockCount !== null ? 'seconds' : foesCount !== null ? (foesCount === 1 ? 'foe stands' : 'foes stand') : '';

    this.root.classList.toggle('clocked', remain !== null);
    // THE ONE CONTROL: walking away is offered to enrolled members
    // during the muster alone — never to spectators, never mid-card
    // (mid-card the door is the same one it always was: the fight).
    this.root.classList.toggle('leavable', canWalkAway(game));
  }
}
