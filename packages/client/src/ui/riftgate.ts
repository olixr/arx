import { RARITY_COLORS, dungeonSpecFromRoll } from '@arx/shared';
import { itemDef } from '@arx/content';
import { itemIconUrl } from '../render/icons.js';
import { iconTile } from './panel.js';
import type { ClientGame } from '../game/clientGame.js';

/**
 * THE RIFTGATE — the gate's question: which key turns?
 *
 * The server names the pack slots holding dungeon keys; everything
 * else on each row is read pure from that slot's roll via
 * dungeonSpecFromRoll (the seed-is-the-dungeon law), so this panel
 * and the server's generator can never disagree about where a key
 * leads. Each row is one dungeon: name, sigil (the trade name), tier,
 * theme — and the POWER plaque leading, because "am I strong enough"
 * is the question you actually stand at the gate asking. Choosing a
 * row turns that key and the veil takes you.
 *
 * Opening routes through main.ts's one-screen gate like every other
 * screen; the close chip + banner come from dressPanel there.
 */
export class RiftgatePanel {
  private readonly panel = document.getElementById('riftgate-panel')!;
  private readonly list = document.getElementById('riftgate-list')!;

  constructor(private readonly game: ClientGame) {}

  get isOpen(): boolean {
    return !this.panel.classList.contains('hidden');
  }

  open(keySlots: number[]): void {
    this.render(keySlots);
    this.panel.classList.remove('hidden');
  }

  close(): void {
    this.panel.classList.add('hidden');
  }

  private render(keySlots: number[]): void {
    this.list.innerHTML = '';
    let shown = 0;
    for (const slot of keySlots) {
      const held = this.game.inventory[slot];
      // The pack may have shifted since the server looked — only rows
      // that still read as dungeon keys make the list.
      if (!held || !itemDef(held.item)?.dungeonKey) continue;
      const spec = dungeonSpecFromRoll(held.roll);
      const tint = RARITY_COLORS[spec.tier];

      const row = document.createElement('div');
      row.className = 'rift-row';
      if (tint) row.style.setProperty('--rift-tint', tint);
      // Ⓐ dispatches a real click on the focused stop, so one wire
      // serves mouse and pad alike.
      row.dataset.nav = '';
      row.dataset.navkey = `rift:${slot}`;
      row.dataset.acta = 'Turn key';

      row.appendChild(iconTile(itemIconUrl(held.item, 40), 'sm'));

      const mid = document.createElement('div');
      mid.className = 'rift-mid';
      const name = document.createElement('div');
      name.className = 'rift-name';
      name.textContent = spec.name;
      if (tint) name.style.color = tint;
      const sub = document.createElement('div');
      sub.className = 'rift-sub';
      const sigil = document.createElement('span');
      sigil.className = 'rift-sigil';
      sigil.textContent = spec.sigil;
      const tierWord = document.createElement('span');
      tierWord.textContent = spec.tier;
      if (tint) tierWord.style.color = tint;
      const themeWord = document.createElement('span');
      themeWord.textContent = spec.theme;
      sub.append(sigil, ' · ', tierWord, ' · ', themeWord);
      mid.append(name, sub);
      row.appendChild(mid);

      // The headline number, told huge: the level this place expects.
      const power = document.createElement('div');
      power.className = 'rift-power';
      const num = document.createElement('strong');
      num.textContent = String(spec.power);
      const lab = document.createElement('span');
      lab.textContent = 'power';
      power.append(num, lab);
      row.appendChild(power);

      row.addEventListener('click', () => {
        this.game.useKeySend(slot);
        this.close();
      });
      this.list.appendChild(row);
      shown++;
    }

    if (shown === 0) {
      // No key, no passage — the parchment says so in ink.
      const note = document.createElement('div');
      note.className = 'rift-empty';
      note.textContent =
        'The gate wants a key. The veil holds its shape and waits — somewhere out there, a rift-cut key is humming for this arch.';
      this.list.appendChild(note);
    }
  }
}
