import type { S2CArenaBoard } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';
import { itemIconUrl } from '../render/icons.js';

/** How long a refused plate wears its ember flash. */
const REFUSE_MS = 420;

/**
 * THE STAKES BOARD (docs/arena-plan.md) — the ringmaster's counter.
 *
 * Server-opened (the shopopen law): the arena dialogue hook's good
 * ending drops the frame and raises this screen with the venue's
 * whole card in hand. Every plate is one match card: name, blurb,
 * the level seal worn as a shield, round studs, the stake as coin —
 * and a rank gate SHOWN, never hidden (the price in rank is part of
 * the intrigue; a locked plate says what it wants). The foot carries
 * THE STANDING: the buyer's rank on the brass crest medal, the
 * crowd's name for them, the record in cards, and the climb to the
 * next rung — with the next NAMED rung as the carrot (a title waits,
 * not just a number).
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

      // The level seal is a shield: the card's weight class worn the
      // way a fighter wears one — number struck big, word beneath.
      const seal = document.createElement('span');
      seal.className = 'arena-card-seal';
      const sealNum = document.createElement('span');
      sealNum.className = 'arena-card-seal-num';
      sealNum.textContent = String(m.level);
      const sealWord = document.createElement('span');
      sealWord.className = 'arena-card-seal-word';
      sealWord.textContent = 'level';
      seal.append(sealNum, sealWord);
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
      // The stake wears the purse's own coin — price reads as coin,
      // not as a sentence.
      const fee = document.createElement('span');
      fee.className = 'arena-card-fee';
      const coin = document.createElement('img');
      coin.src = itemIconUrl('coins', 20);
      coin.alt = '';
      coin.draggable = false;
      fee.append(coin, document.createTextNode(String(m.fee)));
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

    // THE STANDING — the buyer's whole story at the board's foot:
    // the crest medal wearing the rank, the crowd's name for them,
    // the record in cards, and the climb to the next rung. The next
    // NAMED rung is the carrot: a title, not just a number.
    this.ladder.replaceChildren();
    this.ladder.classList.toggle('unranked', b.rank <= 0);
    this.ladder.classList.toggle('capped', b.maxRank !== undefined && b.rank >= b.maxRank);

    const medal = document.createElement('span');
    medal.className = 'arena-standing-medal';
    const medalNum = document.createElement('b');
    medalNum.textContent = b.rank > 0 ? String(b.rank) : '—';
    medal.appendChild(medalNum);
    this.ladder.appendChild(medal);

    const body = document.createElement('span');
    body.className = 'arena-standing-body';

    const head = document.createElement('span');
    head.className = 'arena-standing-head';
    const tag = document.createElement('span');
    tag.className = 'arena-standing-title';
    tag.textContent = b.rank > 0 ? b.title : 'Unranked';
    head.appendChild(tag);
    const record = document.createElement('span');
    record.className = 'arena-standing-record';
    record.textContent = [
      b.rank > 0 ? `rank ${b.rank}` : 'the sand waits',
      ...(b.wins !== undefined && b.losses !== undefined
        ? [`${b.wins} won · ${b.losses} lost`]
        : []),
    ].join(' · ');
    head.appendChild(record);
    body.appendChild(head);

    if (b.xpNext !== undefined) {
      const meter = document.createElement('span');
      meter.className = 'arena-standing-meter';
      const fill = document.createElement('i');
      // The honest rung: the meter climbs from THIS rank's floor to
      // the next threshold (xpPrev rides the wire; an old server
      // without it degrades to the lifetime fraction).
      const floor = b.xpPrev ?? 0;
      const span = Math.max(1, b.xpNext - floor);
      fill.style.setProperty('--fill', String(Math.max(0, Math.min(1, (b.xp - floor) / span))));
      meter.appendChild(fill);
      body.appendChild(meter);
      const words = document.createElement('span');
      words.className = 'arena-standing-next';
      words.append(
        document.createTextNode(`${b.xp - floor} / ${b.xpNext - floor} marks to rank ${b.rank + 1}`),
      );
      if (b.nextTitle !== undefined && b.nextTitleRank !== undefined) {
        const name = document.createElement('b');
        name.textContent = b.nextTitle;
        words.append(document.createTextNode(' — '), name);
        words.append(document.createTextNode(` waits at rank ${b.nextTitleRank}`));
      }
      body.appendChild(words);
    } else {
      // The capped ladder: the meter stands full and the words bow.
      const meter = document.createElement('span');
      meter.className = 'arena-standing-meter';
      const fill = document.createElement('i');
      fill.style.setProperty('--fill', '1');
      meter.appendChild(fill);
      body.appendChild(meter);
      const words = document.createElement('span');
      words.className = 'arena-standing-next';
      words.textContent = 'The ladder ends here. The crowd knows.';
      body.appendChild(words);
    }
    this.ladder.appendChild(body);

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
