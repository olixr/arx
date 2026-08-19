import type { S2CArenaBoard } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';

/** How long a refused plate wears its ember flash. */
const REFUSE_MS = 420;

/**
 * THE STAKES BOARD (docs/arena-plan.md) — the ringmaster's counter.
 *
 * Server-opened (the shopopen law): the arena dialogue hook's good
 * ending drops the frame and raises this screen with the venue's
 * whole card in hand. Every plate is one match card: name, blurb,
 * the level seal, round pips, the stake in coin — and a rank gate
 * SHOWN, never hidden (the price in rank is part of the intrigue;
 * a locked plate says what it wants). The foot carries the buyer's
 * own ladder: title, rank, and the climb to the next rung.
 *
 * Buying sends one C2S verb and closes the board — the muster
 * ceremony answers from the server (or a refusal speaks overhead).
 * Routes through main.ts's one-screen gate like every other screen.
 *
 * PAD-FIRST (the Grand Refit law, ui/padUI.ts): every plate is a
 * `[data-nav]` stop inside the cards' `[data-region]`, so the ring
 * walks the card list and never bleeds sideways; the board names its
 * own seat on open (THE HERO LANDING — the first plate you could
 * actually buy, never the ✕ chip); and a locked plate stays a STOP
 * rather than a hole in the walk — its rank chip already says what it
 * wants, and Ⓐ on it refuses in place instead of going quiet.
 */
export class ArenaBoard {
  private readonly panel = document.getElementById('arena-board')!;
  private readonly title = document.getElementById('arena-board-title')!;
  private readonly cards = document.getElementById('arena-board-cards')!;
  private readonly ladder = document.getElementById('arena-board-ladder')!;
  private refuseTimer = 0;

  constructor(
    private readonly game: ClientGame,
    private readonly hooks: { requestFocus?: (key: string) => void } = {},
  ) {}

  /** A locked plate's spoken no — color only, in place, no shake. */
  private refuse(plate: HTMLElement): void {
    plate.classList.remove('refused');
    void plate.offsetWidth; // restart the flash on back-to-back presses
    plate.classList.add('refused');
    window.clearTimeout(this.refuseTimer);
    this.refuseTimer = window.setTimeout(
      () => this.cards.querySelectorAll('.refused').forEach((p) => p.classList.remove('refused')),
      REFUSE_MS,
    );
  }

  get isOpen(): boolean {
    return !this.panel.classList.contains('hidden');
  }

  open(b: S2CArenaBoard): void {
    this.title.textContent = b.name;
    this.cards.replaceChildren();
    for (const m of b.matches) {
      const plate = document.createElement('button');
      plate.className = 'arena-card' + (m.locked === true ? ' locked' : '');
      plate.type = 'button';
      // THE PLATE IS A STOP: pad focus walks the cards by key, and the
      // action strip speaks the plate's own verb.
      plate.dataset.nav = '';
      plate.dataset.navkey = `arena:${m.id}`;
      plate.dataset.acta = m.locked === true ? 'Locked' : 'Take the sand';

      const seal = document.createElement('span');
      seal.className = 'arena-card-seal';
      seal.textContent = String(m.level);
      plate.appendChild(seal);

      const body = document.createElement('span');
      body.className = 'arena-card-body';
      const name = document.createElement('span');
      name.className = 'arena-card-name';
      name.textContent = m.name;
      body.appendChild(name);
      if (m.blurb !== undefined) {
        const blurb = document.createElement('span');
        blurb.className = 'arena-card-blurb';
        blurb.textContent = m.blurb;
        body.appendChild(blurb);
      }
      const meta = document.createElement('span');
      meta.className = 'arena-card-meta';
      const pips = document.createElement('span');
      pips.className = 'arena-card-pips';
      for (let i = 0; i < m.rounds; i++) {
        const pip = document.createElement('i');
        pips.appendChild(pip);
      }
      meta.appendChild(pips);
      const fee = document.createElement('span');
      fee.className = 'arena-card-fee';
      fee.textContent = `${m.fee} coins`;
      meta.appendChild(fee);
      if (m.rankReq !== undefined) {
        const gate = document.createElement('span');
        gate.className = 'arena-card-gate';
        gate.textContent = `rank ${m.rankReq}`;
        meta.appendChild(gate);
      }
      body.appendChild(meta);
      plate.appendChild(body);

      if (m.locked !== true) {
        plate.addEventListener('click', () => {
          this.game.arenaQueue(m.id);
          this.close();
        });
      } else {
        plate.setAttribute('aria-disabled', 'true');
        // Never a dead press: the plate flashes its refusal where the
        // ring already stands, and the rank chip beside it says why.
        plate.addEventListener('click', () => this.refuse(plate));
      }
      this.cards.appendChild(plate);
    }

    // The buyer's own standing at the foot of the board.
    this.ladder.replaceChildren();
    const tag = document.createElement('span');
    tag.className = 'arena-ladder-title';
    tag.textContent = b.rank > 0 ? `${b.title} · rank ${b.rank}` : 'Unranked';
    this.ladder.appendChild(tag);
    if (b.xpNext !== undefined) {
      const meter = document.createElement('span');
      meter.className = 'arena-ladder-meter';
      const fill = document.createElement('i');
      // The honest rung: the meter climbs from THIS rank's floor to
      // the next threshold (xpPrev rides the wire; an old server
      // without it degrades to the lifetime fraction).
      const floor = b.xpPrev ?? 0;
      const span = Math.max(1, b.xpNext - floor);
      fill.style.setProperty('--fill', String(Math.max(0, Math.min(1, (b.xp - floor) / span))));
      meter.appendChild(fill);
      this.ladder.appendChild(meter);
      const words = document.createElement('span');
      words.className = 'arena-ladder-next';
      words.textContent = `${b.xp - floor} / ${b.xpNext - floor} marks to the next rung`;
      this.ladder.appendChild(words);
    } else {
      const words = document.createElement('span');
      words.className = 'arena-ladder-next';
      words.textContent = 'The ladder ends here. The crowd knows.';
      this.ladder.appendChild(words);
    }

    this.panel.classList.remove('hidden');

    // THE HERO LANDING: the ring opens on the first plate the buyer
    // could actually take; with every card gated it seats on the top
    // plate anyway, so the walk begins on the work, not on the ✕.
    const seat = b.matches.find((m) => m.locked !== true) ?? b.matches[0];
    if (seat) this.hooks.requestFocus?.(`arena:${seat.id}`);
  }

  close(): void {
    window.clearTimeout(this.refuseTimer);
    this.cards.querySelectorAll('.refused').forEach((p) => p.classList.remove('refused'));
    this.panel.classList.add('hidden');
  }
}
