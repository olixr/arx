import { itemDef, tameDef } from '@arx/content';
import { PET_REST_HOME_MS } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';
import { itemIconUrl } from '../render/icons.js';
import { petPlaquePortraitUrl } from '../render/petPortrait.js';
import { ringGauge, type RingGauge } from './kit/ring.js';

/**
 * THE COMPANION PLAQUE — the friend at your heel, promoted out of the
 * buff-chip tray into a standing piece of the HUD: a crest medallion
 * carrying the animal's painted portrait on its suede bed, a cut-plate
 * nameplate with the level gem, a bold ink-rimmed vigor gauge with a
 * trailing damage ghost, and one state ring that speaks whichever
 * truth matters now — the rest clock draining blue, or the reopened
 * bond breathing gold beside the treat it is asking for.
 *
 * One companion, one plaque (the heel friend, or the nearest resting
 * one). DOM writes land only on change — the perf law of the HUD.
 * Clicking the plaque is still the pat (THE QUIET HEEL).
 */
export class CompanionPlaque {
  private readonly root = document.createElement('button');
  private readonly face = document.createElement('img');
  private readonly nameEl = document.createElement('span');
  private readonly lvlEl = document.createElement('span');
  private readonly hpFill = document.createElement('div');
  private readonly hpGhost = document.createElement('div');
  private readonly stateEl = document.createElement('div');
  private readonly offer = document.createElement('img');
  private readonly ring: RingGauge;
  private key = '';
  /** Last seen hp for the shown slot — the hurt-jolt trigger. */
  private lastSlot = -1;
  private lastHp = 0;

  /** Fires on a press — the pat channel (server range-gates it). */
  onPat: (() => void) | null = null;

  constructor() {
    this.root.id = 'companion-plaque';
    this.root.type = 'button';
    this.root.style.display = 'none';
    this.root.addEventListener('click', () => this.onPat?.());
    // The hurt jolt is a one-shot: the class leaves when the motion does.
    this.root.addEventListener('animationend', (ev) => {
      if ((ev as AnimationEvent).animationName === 'comp-hurt') this.root.classList.remove('hurt');
    });

    // The nameplate card: name and level gem over the vigor gauge over
    // the state word. The medallion overhangs its left edge.
    const card = document.createElement('div');
    card.className = 'comp-card';
    const head = document.createElement('div');
    head.className = 'comp-head';
    this.nameEl.className = 'comp-name';
    this.lvlEl.className = 'comp-lvl';
    head.append(this.nameEl, this.lvlEl);
    const gauge = document.createElement('div');
    gauge.className = 'comp-hp';
    this.hpGhost.className = 'comp-hp-ghost';
    this.hpFill.className = 'comp-hp-fill';
    gauge.append(this.hpGhost, this.hpFill);
    this.stateEl.className = 'comp-state';
    card.append(head, gauge, this.stateEl);

    // The medallion: portrait in the crest, state ring riding the brass.
    const medal = document.createElement('div');
    medal.className = 'comp-medal';
    this.face.className = 'comp-face';
    this.face.draggable = false;
    this.face.alt = '';
    this.ring = ringGauge(0, { track: false });
    this.ring.root.classList.add('comp-ring');
    this.offer.className = 'comp-offer';
    this.offer.draggable = false;
    this.offer.alt = '';
    medal.append(this.face, this.ring.root, this.offer);

    this.root.append(medal, card);
    document.getElementById('hud')!.appendChild(this.root);
  }

  /** Called once per frame — cheap, writes only on change. */
  update(game: ClientGame): void {
    // The plaque's one truth: the walking friend (heel, trailing,
    // downed where it fell) or the nearest resting one.
    const active =
      game.ownPets.find((pp) => pp.state === 'heel' || pp.state === 'trailing' || pp.state === 'downed') ??
      game.ownPets.find((pp) => pp.state === 'resting');
    const bond = active !== undefined && active.state === 'heel' && game.petBondReady(active.slot);
    const key = active
      ? `${active.slot}:${active.species}:${active.name}:${active.level}:${active.state}:${active.hp}:${active.maxHp}:${active.restSec ?? ''}:${bond ? 'B' : ''}`
      : '';
    if (key === this.key) return;
    this.key = key;

    if (!active) {
      this.root.style.display = 'none';
      this.lastSlot = -1;
      return;
    }

    // The hurt jolt: same friend, less blood — one sharp flinch.
    if (active.slot === this.lastSlot && active.hp < this.lastHp) {
      this.root.classList.remove('hurt');
      // Reflow so back-to-back wounds each restart the flinch.
      void this.root.offsetWidth;
      this.root.classList.add('hurt');
    }
    this.lastSlot = active.slot;
    this.lastHp = active.hp;

    this.root.style.display = '';
    this.face.src = petPlaquePortraitUrl(active.species, 96);
    this.nameEl.textContent = active.name;
    this.lvlEl.textContent = String(active.level);

    // Vigor: both gauge layers read --comp-vigor; the fill snaps to
    // the truth and the pale ghost eases after it in CSS — a wound
    // leaves a visible bite mark before it fades.
    const frac = Math.max(0, Math.min(1, active.hp / Math.max(1, active.maxHp)));
    this.root.style.setProperty('--comp-vigor', String(Math.round(frac * 1000) / 1000));
    this.root.dataset['vigor'] = frac <= 0.25 ? 'dire' : frac <= 0.5 ? 'worn' : 'hale';

    // One state class, one state word.
    this.root.classList.toggle('state-downed', active.state === 'downed');
    this.root.classList.toggle('state-resting', active.state === 'resting');
    this.root.classList.toggle('state-trailing', active.state === 'trailing');
    this.root.classList.toggle('bond', bond);
    this.stateEl.textContent =
      active.state === 'downed'
        ? 'Down. Kneel to it.'
        : active.state === 'resting'
          ? `Rests · ${Math.max(1, active.restSec ?? 0)}s`
          : active.state === 'trailing'
            ? 'Catching up'
            : 'At heel';

    // The state ring: a resting friend's clock drains blue around the
    // crest; a reopened bond wears the ring full and breathing gold.
    if (active.state === 'resting') {
      this.ring.root.style.display = '';
      this.ring.root.style.setProperty('--ring-tone', 'var(--blue)');
      this.ring.set(Math.max(0, Math.min(1, (active.restSec ?? 0) / (PET_REST_HOME_MS / 1000))));
    } else if (bond) {
      this.ring.root.style.display = '';
      this.ring.root.style.setProperty('--ring-tone', 'var(--gold-bright)');
      this.ring.set(1);
    } else {
      this.ring.root.style.display = 'none';
    }

    // The offer pip: the very treat the friend is waiting on, held up
    // beside the portrait while the bond moment stands open.
    const lureId = tameDef(active.species)?.lure ?? '';
    if (bond && lureId) {
      this.offer.style.display = '';
      this.offer.src = itemIconUrl(lureId, 34);
    } else {
      this.offer.style.display = 'none';
    }

    const lureName = itemDef(lureId)?.name.toLowerCase();
    this.root.title =
      active.state === 'downed'
        ? `${active.name} is down. Kneel to it before it drags itself home.`
        : active.state === 'resting'
          ? `${active.name} rests at the stalls and will find you when it is well.`
          : bond && lureName
            ? `${active.name} watches your hands. ${lureName.charAt(0).toUpperCase()}${lureName.slice(1)} offered by hand would deepen the bond.`
            : `${active.name}, your companion. Click to give it a pat.`;
    this.root.setAttribute('aria-label', `${active.name}, your companion`);
  }
}
