import { RARITY_COLORS } from '@arx/shared';
import type { PartyRunWire } from '@arx/shared';
import { itemIconUrl } from '../render/icons.js';
import { iconTile, sectionHead } from './panel.js';
import { fileKeys, orderKeys } from './keyOrder.js';
import { usesPips } from './keyRing.js';
import type { ClientGame } from '../game/clientGame.js';

/**
 * THE RIFTGATE — the gate's question: which key turns?
 *
 * The keys come from THE KEY RING's mirror (game.keyRing), never the
 * pack; every row derives its whole story pure from the roll via
 * dungeonSpecFromRoll (the seed-is-the-dungeon law), so this panel
 * and the server's generator can never disagree about where a key
 * leads. Each row is one dungeon: name, sigil (the trade name), tier,
 * theme, the WORN WARD's pips — and the POWER plaque leading, because
 * "am I strong enough" is the question you actually stand at the gate
 * asking. Choosing a row turns that key and the veil takes you.
 *
 * `live` (from the server) names the run still standing: that key
 * turns FREE (the door is open), and a spent key still answers for
 * exactly as long as its own door stands. Any other spent key shows
 * dark — the gate refuses it and the ring screen tells the story.
 *
 * Opening routes through main.ts's one-screen gate like every other
 * screen; the close chip + banner come from dressPanel there.
 */
export class RiftgatePanel {
  private readonly panel = document.getElementById('riftgate-panel')!;
  private readonly list = document.getElementById('riftgate-list')!;
  private live: { seed: number; tier: string; power: number } | undefined;
  private partyRuns: PartyRunWire[] | undefined;

  constructor(private readonly game: ClientGame) {}

  get isOpen(): boolean {
    return !this.panel.classList.contains('hidden');
  }

  open(live?: { seed: number; tier: string; power: number }, partyRuns?: PartyRunWire[]): void {
    this.live = live;
    this.partyRuns = partyRuns;
    this.render();
    this.panel.classList.remove('hidden');
  }

  close(): void {
    this.panel.classList.add('hidden');
  }

  /** Ring-mirror hook: the shelf repaints when keys land or wear. */
  refresh(): void {
    if (this.isOpen) this.render();
  }

  private render(): void {
    this.list.innerHTML = '';
    let shown = 0;

    // Power leads — the gate is read as "what can I run".
    const keys = orderKeys(fileKeys(this.game.keyRing), 'power');
    for (const k of keys) {
      const openHere = this.live !== undefined && k.spec.seed === this.live.seed;
      const spent = k.usesLeft <= 0 && !openHere;
      const tint = RARITY_COLORS[k.spec.tier];

      const row = document.createElement('div');
      row.className = `rift-row${spent ? ' spent' : ''}${openHere ? ' open-run' : ''}`;
      if (tint) row.style.setProperty('--rift-tint', tint);
      // Ⓐ dispatches a real click on the focused stop, so one wire
      // serves mouse and pad alike. A spent key keeps its stop — the
      // refusal is spoken, never silent.
      row.dataset.nav = '';
      row.dataset.navkey = `rift:${k.id}`;
      row.dataset.acta = spent ? 'Spent' : openHere ? 'Re-enter' : 'Turn key';

      row.appendChild(iconTile(itemIconUrl('dungeon_key', 40), 'sm'));

      const mid = document.createElement('div');
      mid.className = 'rift-mid';
      const name = document.createElement('div');
      name.className = 'rift-name';
      name.textContent = k.spec.name;
      if (tint) name.style.color = tint;
      const sub = document.createElement('div');
      sub.className = 'rift-sub';
      const sigil = document.createElement('span');
      sigil.className = 'rift-sigil';
      sigil.textContent = k.spec.sigil;
      const tierWord = document.createElement('span');
      tierWord.textContent = k.spec.tier;
      if (tint) tierWord.style.color = tint;
      const themeWord = document.createElement('span');
      themeWord.textContent = k.spec.theme;
      sub.append(sigil, ' · ', tierWord, ' · ', themeWord);
      if (openHere) {
        const standing = document.createElement('span');
        standing.className = 'rift-standing';
        standing.textContent = 'run stands open';
        sub.append(' · ', standing);
      }
      mid.append(name, sub, usesPips(k));
      row.appendChild(mid);

      // The headline number, told huge: the level this place expects.
      const power = document.createElement('div');
      power.className = 'rift-power';
      const num = document.createElement('strong');
      num.textContent = String(k.spec.power);
      const lab = document.createElement('span');
      lab.textContent = 'power';
      power.append(num, lab);
      row.appendChild(power);

      row.addEventListener('click', () => {
        if (spent) return; // the server would refuse; the row already says so
        this.game.useKeySend(k.id);
        this.close();
      });
      this.list.appendChild(row);
      shown++;
    }

    // Fellows' live runs — the gates are one network, so any arch can
    // carry you into a run your party holds open.
    if (this.partyRuns && this.partyRuns.length > 0) {
      this.list.appendChild(sectionHead('Party Runs'));
      for (const run of this.partyRuns) {
        // The wire carries tier as plain string; unknown tiers just go untinted.
        const tint = (RARITY_COLORS as Record<string, string | null>)[run.tier] ?? null;
        const row = document.createElement('div');
        row.className = 'rift-row';
        if (tint) row.style.setProperty('--rift-tint', tint);
        row.dataset.nav = '';
        row.dataset.navkey = `rift:join:${run.name}`;
        row.dataset.acta = 'Join';

        const mid = document.createElement('div');
        mid.className = 'rift-mid';
        const name = document.createElement('div');
        name.className = 'rift-name';
        name.textContent = run.dungeon;
        if (tint) name.style.color = tint;
        const sub = document.createElement('div');
        sub.className = 'rift-sub';
        const who = document.createElement('span');
        who.textContent = `${run.name} holds the rift open`;
        const tierWord = document.createElement('span');
        tierWord.textContent = run.tier;
        if (tint) tierWord.style.color = tint;
        sub.append(who, ' · ', tierWord);
        mid.append(name, sub);
        row.appendChild(mid);

        const power = document.createElement('div');
        power.className = 'rift-power';
        const num = document.createElement('strong');
        num.textContent = String(run.power);
        const lab = document.createElement('span');
        lab.textContent = 'power';
        power.append(num, lab);
        row.appendChild(power);

        row.addEventListener('click', () => {
          this.game.partyJoinRun(run.name);
          this.close();
        });
        this.list.appendChild(row);
        shown++;
      }
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
