/**
 * THE COMPANY YOU KEEP (docs/companions-plan.md) — the companions'
 * own room, wholly apart from the Beasts hall: no stats, no arts, no
 * stalls, because a companion HAS none of those. One rail of kept
 * friends on the left, THE STANDING for the friend under regard —
 * portrait, its own story, the journey line, and the three verbs
 * (call, send home, part) plus the rename.
 *
 * The room opens anywhere (company is a menu decision, never a pen
 * fixture — the server holds the same law), renders purely off the
 * S2CCompanions mirror, and re-proves nothing: every act rides the
 * wire and the mirror's echo retells the room.
 */

import { COMPANION_CAP, type CompanionInfo } from '@arx/shared';
import { COMPANIONS, NPCS, companionDef, itemDef } from '@arx/content';
import { bigButton } from './panel.js';
import { petPlaquePortraitUrl } from '../render/petPortrait.js';
import { itemIconUrl } from '../render/icons.js';

interface CompanyGame {
  ownCompanions: CompanionInfo[];
}

export class CompanionsPanel {
  private readonly root: HTMLElement;
  private readonly rail: HTMLElement;
  private readonly standing: HTMLElement;

  /** The slot under regard. */
  private selSlot: number | null = null;
  /**
   * THE DELIBERATE GOODBYE: parting is armed on the first press and
   * fires on the second (the stalls' release discipline). Any other
   * act clears the arm.
   */
  private partArmed: number | null = null;

  onOp: ((op: 'heel' | 'home' | 'part', slot: number) => void) | null = null;
  onRename: ((slot: number, current: string) => void) | null = null;

  constructor() {
    this.root = document.getElementById('companions-panel')!;
    this.rail = document.getElementById('company-rail')!;
    this.standing = document.getElementById('company-standing')!;
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  open(game: CompanyGame): void {
    this.root.classList.remove('hidden');
    this.partArmed = null;
    if (this.selSlot === null || !game.ownCompanions.some((c) => c.slot === this.selSlot)) {
      this.selSlot = game.ownCompanions[0]?.slot ?? null;
    }
    this.render(game);
  }

  close(): void {
    this.root.classList.add('hidden');
    this.partArmed = null;
  }

  /** The mirror moved (S2CCompanions): retell whatever is on stage. */
  refresh(game: CompanyGame): void {
    if (!this.isOpen) return;
    if (this.selSlot !== null && !game.ownCompanions.some((c) => c.slot === this.selSlot)) {
      this.selSlot = game.ownCompanions[0]?.slot ?? null;
      this.partArmed = null;
    }
    this.render(game);
  }

  private lastGame: CompanyGame = { ownCompanions: [] };

  private render(game: CompanyGame): void {
    this.lastGame = game;
    this.renderRail(game);
    this.renderStanding(game);
  }

  private renderRail(game: CompanyGame): void {
    this.rail.innerHTML = '';
    for (const c of game.ownCompanions) {
      const stop = document.createElement('button');
      stop.className = 'company-stop';
      if (c.slot === this.selSlot) stop.classList.add('active');
      stop.dataset.nav = '';
      stop.dataset.navkey = `company:stop:${c.slot}`;
      stop.dataset.acta = 'Regard';
      const face = document.createElement('img');
      face.className = 'company-stop-face';
      face.src = petPlaquePortraitUrl(c.species, 96, c.lookSeed);
      face.alt = '';
      stop.appendChild(face);
      const text = document.createElement('span');
      text.className = 'company-stop-text';
      const name = document.createElement('span');
      name.className = 'company-stop-name';
      name.textContent = c.name;
      const sub = document.createElement('span');
      sub.className = `company-stop-sub company-state-${c.state}`;
      sub.textContent =
        c.state === 'heel' ? 'Keeping you company' : c.state === 'trailing' ? 'Catching up' : 'Off on its own';
      text.append(name, sub);
      stop.appendChild(text);
      stop.addEventListener('click', () => {
        this.selSlot = c.slot;
        this.partArmed = null;
        this.render(game);
      });
      this.rail.appendChild(stop);
    }
    // The open places: an honest count, told softly.
    for (let i = game.ownCompanions.length; i < COMPANION_CAP; i++) {
      const empty = document.createElement('div');
      empty.className = 'company-stop company-stop-empty';
      empty.textContent = 'An open place by your fire.';
      this.rail.appendChild(empty);
    }
  }

  private renderStanding(game: CompanyGame): void {
    this.standing.innerHTML = '';
    const c = game.ownCompanions.find((x) => x.slot === this.selSlot) ?? null;
    if (!c) {
      const empty = document.createElement('div');
      empty.className = 'company-empty';
      const lede = document.createElement('div');
      lede.className = 'company-empty-lede';
      lede.textContent = 'No friend keeps your company yet.';
      empty.appendChild(lede);
      const how = document.createElement('div');
      how.className = 'company-empty-how';
      how.textContent =
        'Some small hearts ask no gentling and no ladder — only a kind hand and the right morsel, offered where they live.';
      empty.appendChild(how);
      // The invitation, told concretely: each befriendable kind and
      // the morsel it wants (the registry is small on purpose).
      const list = document.createElement('div');
      list.className = 'company-invites';
      for (const def of COMPANIONS.values()) {
        const row = document.createElement('div');
        row.className = 'company-invite';
        const treat = document.createElement('img');
        treat.src = itemIconUrl(def.treat, 40);
        treat.alt = '';
        row.appendChild(treat);
        const word = document.createElement('span');
        const npc = NPCS.get(def.species);
        word.textContent = `The ${npc?.name.toLowerCase() ?? def.species} answers a ${itemDef(def.treat)?.name.toLowerCase() ?? def.treat}.`;
        row.appendChild(word);
        list.appendChild(row);
      }
      empty.appendChild(list);
      this.standing.appendChild(empty);
      return;
    }

    const def = NPCS.get(c.species);
    const cdef = companionDef(c.species);

    // ---- The identity band: portrait well, serif name, its kind.
    const head = document.createElement('div');
    head.className = 'company-head';
    const well = document.createElement('div');
    well.className = 'company-portrait-well';
    const face = document.createElement('img');
    face.src = petPlaquePortraitUrl(c.species, 192, c.lookSeed);
    face.alt = c.name;
    well.appendChild(face);
    head.appendChild(well);
    const names = document.createElement('div');
    names.className = 'company-names';
    const name = document.createElement('div');
    name.className = 'company-name';
    name.textContent = c.name;
    const kind = document.createElement('div');
    kind.className = 'company-kind';
    kind.textContent = def?.name ?? c.species;
    const tale = document.createElement('div');
    tale.className = 'company-tale';
    tale.textContent = cdef?.flavor ?? '';
    names.append(name, kind, tale);
    head.appendChild(names);
    this.standing.appendChild(head);

    // ---- THE JOURNEY, one honest line in the game's voice.
    const journey = document.createElement('div');
    journey.className = 'company-journey';
    if (c.metAt !== undefined) {
      const days = Math.floor((Date.now() - c.metAt) / 86_400_000);
      const when = days <= 0 ? 'today' : days === 1 ? 'a day ago' : `${days.toLocaleString()} days ago`;
      journey.textContent = `It decided you would do, ${when}.`;
    } else {
      journey.textContent = 'It has kept your company since before the ledgers.';
    }
    this.standing.appendChild(journey);

    // ---- The standing word.
    const state = document.createElement('div');
    state.className = `company-standing-state company-state-${c.state}`;
    state.textContent =
      c.state === 'heel'
        ? 'It is with you now, underfoot exactly when least convenient.'
        : c.state === 'trailing'
          ? 'Somewhere behind you, taking its own route.'
          : 'Off on its own affairs. It knows where you live.';
    this.standing.appendChild(state);

    // ---- The verbs.
    const acts = document.createElement('div');
    acts.className = 'company-acts';
    if (c.state === 'home') {
      acts.appendChild(
        bigButton('Call it to you', `company:heel:${c.slot}`, () => {
          this.partArmed = null;
          this.onOp?.('heel', c.slot);
        }),
      );
    } else {
      acts.appendChild(
        bigButton('Send it home', `company:home:${c.slot}`, () => {
          this.partArmed = null;
          this.onOp?.('home', c.slot);
        }),
      );
    }
    acts.appendChild(
      bigButton('Rename', `company:rename:${c.slot}`, () => {
        this.partArmed = null;
        this.onRename?.(c.slot, c.name);
      }, { minor: true }),
    );
    if (this.partArmed === c.slot) {
      acts.appendChild(
        bigButton(`Part with ${c.name}, truly?`, `company:part:${c.slot}`, () => {
          this.partArmed = null;
          this.onOp?.('part', c.slot);
        }, { acta: 'Part ways' }),
      );
    } else {
      acts.appendChild(
        bigButton('Part ways', `company:part:${c.slot}`, () => {
          this.partArmed = c.slot;
          this.render(this.lastGame);
        }, { minor: true }),
      );
    }
    this.standing.appendChild(acts);
  }
}
