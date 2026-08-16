import type { S2CArenaBoard } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';

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
 */
export class ArenaBoard {
  private readonly panel = document.getElementById('arena-board')!;
  private readonly title = document.getElementById('arena-board-title')!;
  private readonly cards = document.getElementById('arena-board-cards')!;
  private readonly ladder = document.getElementById('arena-board-ladder')!;

  constructor(private readonly game: ClientGame) {}

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
      // Fraction of the way from the LAST rung to the next.
      const span = Math.max(1, b.xpNext - 0);
      fill.style.setProperty('--fill', String(Math.max(0, Math.min(1, b.xp / span))));
      meter.appendChild(fill);
      this.ladder.appendChild(meter);
      const words = document.createElement('span');
      words.className = 'arena-ladder-next';
      words.textContent = `${b.xp} / ${b.xpNext} marks`;
      this.ladder.appendChild(words);
    } else {
      const words = document.createElement('span');
      words.className = 'arena-ladder-next';
      words.textContent = 'The ladder ends here. The crowd knows.';
      this.ladder.appendChild(words);
    }

    this.panel.classList.remove('hidden');
  }

  close(): void {
    this.panel.classList.add('hidden');
  }
}
