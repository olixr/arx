/**
 * THE COMPANION'S HALL (docs/pet-arts-plan.md LAW 8) — the pet menu
 * rebuilt whole as a standing screen on the Proving Hall grammar:
 * gamepad-first, zero scrollable columns, instruments never cards.
 *
 * Five mounts (index.html order: rail → standing|shelf|reading →
 * collars):
 * - THE STALL RAIL: one crest stop per kept companion.
 * - THE STANDING: the hero band — portrait in a vigor ring, serif
 *   name with the faceted level gem, the species' own flavor line,
 *   THE ROPE (bond as a knotted cord), and the fight instruments
 *   measured against a ROSTER envelope at level parity (the bar IS
 *   the comparison — the no-best-in-slot law made visible), with THE
 *   JOURNEY written underneath in the game's voice.
 * - THE REPERTOIRE: the species' shelf as a plate ribbon — focus pips
 *   priced on every plate, the slotted words collared.
 * - THE READING: the focused art told whole — tale, price, pacing,
 *   and the proving-ground diagram for actives / the measured lean
 *   for passives — with the one verb (slot or set down).
 * - THE THREE COLLARS: the loadout sockets and the focus ledger as
 *   brass coins, the next coin's unlock lettered under it.
 *
 * The server computes every rule (PetInfo carries bond/rank/focus/
 * budget); this room re-derives NOTHING — its courtesy checks only
 * choose which refusal to letter before the wire renders the true
 * verdict aloud.
 */

import {
  PET_ART_SLOTS,
  PET_BOND_RANK_NAMES,
  PET_BOND_RANK_XP,
  petBondRank,
  type PetInfo,
} from '@arx/shared';
import {
  NPCS,
  TAMES,
  abilityDef,
  petArtDef,
  petPassiveBundle,
  petStatBlock,
  repertoireFor,
  tameDef,
  type PetArtDef,
} from '@arx/content';
import { bigButton } from './panel.js';
import { ringGauge } from './kit/ring.js';
import { provingGround, type ProvingGround } from './artDiagram.js';
import { petPlaquePortraitUrl } from '../render/petPortrait.js';
import { abilityIconUrl } from '../render/abilityIcons.js';

interface HallGame {
  ownPets: PetInfo[];
}

/** The roster envelope: the strongest base body per instrument at
 *  level parity. bc folds out of the comparison (one keeper, one
 *  hand), so 0 keeps every bar honest for every keeper. */
function rosterEnvelope(level: number): { hp: number; fang: number; hide: number; stride: number } {
  let hp = 1;
  let fang = 1;
  let hide = 1;
  let stride = 1;
  for (const species of TAMES.keys()) {
    const s = petStatBlock(species, level, 0);
    const def = NPCS.get(species);
    if (!s || !def) continue;
    hp = Math.max(hp, s.maxHp);
    fang = Math.max(fang, s.die * s.dmgMult);
    hide = Math.max(hide, s.armor + 4);
    stride = Math.max(stride, def.speed);
  }
  return { hp, fang, hide, stride };
}

export class CompanionHall {
  private readonly root: HTMLElement;
  private readonly rail: HTMLElement;
  private readonly standing: HTMLElement;
  private readonly shelf: HTMLElement;
  private readonly reading: HTMLElement;
  private readonly collars: HTMLElement;
  private readonly ground: ProvingGround;
  private groundMounted = false;

  /** The stall the hall is telling, and the word under the glass. */
  private selSlot: number | null = null;
  private selArt: string | null = null;

  /** THE THREE COLLARS' wire: the whole loadout, re-proven server-side. */
  onArts: ((slot: number, arts: string[]) => void) | null = null;

  constructor() {
    this.root = document.getElementById('companion-panel')!;
    this.rail = document.getElementById('hall-rail')!;
    this.standing = document.getElementById('hall-standing')!;
    this.shelf = document.getElementById('hall-shelf')!;
    this.reading = document.getElementById('hall-reading')!;
    this.collars = document.getElementById('hall-collars')!;
    this.ground = provingGround();
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  open(game: HallGame): void {
    this.root.classList.remove('hidden');
    document.body.classList.add('hall-open');
    if (this.selSlot === null || !game.ownPets.some((p) => p.slot === this.selSlot)) {
      this.selSlot = game.ownPets[0]?.slot ?? null;
      this.selArt = null;
    }
    this.render(game);
  }

  close(): void {
    this.root.classList.add('hidden');
    document.body.classList.remove('hall-open');
    this.ground.show(null);
  }

  /** The mirror moved (S2CPet): retell whatever is on stage. */
  refresh(game: HallGame): void {
    if (!this.isOpen) return;
    if (this.selSlot !== null && !game.ownPets.some((p) => p.slot === this.selSlot)) {
      this.selSlot = game.ownPets[0]?.slot ?? null;
      this.selArt = null;
    }
    this.render(game);
  }

  private pet(game: HallGame): PetInfo | null {
    return game.ownPets.find((p) => p.slot === this.selSlot) ?? null;
  }

  // ---------------------------------------------------------- render

  private render(game: HallGame): void {
    this.lastPets = game.ownPets;
    this.renderRail(game);
    const pet = this.pet(game);
    if (!pet) {
      this.standing.innerHTML = '';
      this.shelf.innerHTML = '';
      this.reading.innerHTML = '';
      this.collars.innerHTML = '';
      const empty = document.createElement('div');
      empty.className = 'hall-empty';
      empty.textContent =
        'No companion yet walks beside you. The wild is wide, and a gentle hand opens it.';
      this.standing.appendChild(empty);
      this.ground.show(null);
      return;
    }
    // A vanished word (loadout changed under us) drops the glass.
    const shelfIds = repertoireFor(pet.species);
    if (this.selArt !== null && !shelfIds.includes(this.selArt)) this.selArt = null;
    if (this.selArt === null) this.selArt = shelfIds[0] ?? null;
    this.renderStanding(pet);
    this.renderShelf(pet);
    this.renderReading(pet);
    this.renderCollars(pet);
  }

  private renderRail(game: HallGame): void {
    this.rail.innerHTML = '';
    for (const p of game.ownPets) {
      const stop = document.createElement('button');
      stop.className = 'hall-stop';
      if (p.slot === this.selSlot) stop.classList.add('active');
      stop.dataset.nav = '';
      stop.dataset.navkey = `hall:stall:${p.slot}`;
      stop.dataset.acta = 'Regard';
      stop.dataset.navnext = '#hall-shelf';
      const ring = ringGauge(p.maxHp > 0 ? p.hp / p.maxHp : 0, { size: '3.4rem' });
      ring.root.classList.add('hall-stop-ring');
      const face = document.createElement('img');
      face.src = petPlaquePortraitUrl(p.species, 96);
      face.alt = '';
      ring.center.appendChild(face);
      stop.appendChild(ring.root);
      const text = document.createElement('span');
      text.className = 'hall-stop-text';
      const name = document.createElement('span');
      name.className = 'hall-stop-name';
      name.textContent = p.name;
      const sub = document.createElement('span');
      sub.className = `hall-stop-sub hall-state-${p.state}`;
      sub.textContent =
        p.state === 'heel'
          ? 'At your heel'
          : p.state === 'trailing'
            ? 'Catching up'
            : p.state === 'downed'
              ? 'Down in the field'
              : p.state === 'resting'
                ? 'Resting'
                : 'At the stalls';
      text.append(name, sub);
      stop.appendChild(text);
      stop.addEventListener('click', () => {
        this.selSlot = p.slot;
        this.selArt = null;
        this.render(game);
      });
      this.rail.appendChild(stop);
    }
    // The pen's own business, only pointed at from here.
    const stalls = document.createElement('span');
    stalls.className = 'hall-stalls-link';
    stalls.textContent = 'Swaps, rests, and release live at a beast pen.';
    this.rail.appendChild(stalls);
  }

  private renderStanding(pet: PetInfo): void {
    this.standing.innerHTML = '';
    const def = NPCS.get(pet.species);
    const tame = tameDef(pet.species);
    const bundle = petPassiveBundle(pet.arts ?? []);

    // ---- The identity band.
    const head = document.createElement('div');
    head.className = 'hall-head';
    const well = document.createElement('div');
    well.className = 'hall-portrait-well';
    const ring = ringGauge(pet.maxHp > 0 ? pet.hp / pet.maxHp : 0, { size: '6.5rem' });
    ring.root.classList.add('hall-portrait-ring');
    const face = document.createElement('img');
    face.src = petPlaquePortraitUrl(pet.species, 192);
    face.alt = pet.name;
    ring.center.appendChild(face);
    well.appendChild(ring.root);
    head.appendChild(well);
    const names = document.createElement('div');
    names.className = 'hall-names';
    const nameRow = document.createElement('div');
    nameRow.className = 'hall-name-row';
    const name = document.createElement('span');
    name.className = 'hall-name';
    name.textContent = pet.name;
    const gem = document.createElement('span');
    gem.className = 'hall-lvl';
    gem.textContent = String(pet.level);
    gem.title = `Level ${pet.level} · ${pet.xp.toLocaleString()} xp`;
    nameRow.append(name, gem);
    const kind = document.createElement('div');
    kind.className = 'hall-kind';
    kind.textContent = def?.name ?? pet.species;
    const tale = document.createElement('div');
    tale.className = 'hall-tale';
    tale.textContent = tame?.flavor ?? '';
    names.append(nameRow, kind, tale);
    head.appendChild(names);
    this.standing.appendChild(head);

    // ---- THE ROPE: the bond as a knotted cord.
    const rank = pet.bondRank ?? petBondRank(pet.bond ?? 0);
    const bond = pet.bond ?? 0;
    const ropeWrap = document.createElement('div');
    ropeWrap.className = 'hall-rope-wrap';
    const ropeHead = document.createElement('div');
    ropeHead.className = 'hall-rope-head';
    const ropeLabel = document.createElement('span');
    ropeLabel.className = 'hall-rope-label';
    ropeLabel.textContent = 'The rope between you';
    const ropeRank = document.createElement('span');
    ropeRank.className = 'hall-rope-rank';
    ropeRank.textContent = PET_BOND_RANK_NAMES[rank] ?? '';
    ropeHead.append(ropeLabel, ropeRank);
    const rope = document.createElement('div');
    rope.className = 'hall-rope';
    const ceiling = PET_BOND_RANK_XP[PET_BOND_RANK_XP.length - 1] ?? 1;
    const fill = document.createElement('div');
    fill.className = 'hall-rope-fill';
    fill.style.width = `${Math.min(100, (bond / ceiling) * 100)}%`;
    rope.appendChild(fill);
    for (let i = 1; i < PET_BOND_RANK_XP.length; i++) {
      const at = PET_BOND_RANK_XP[i] ?? 0;
      const knot = document.createElement('span');
      knot.className = 'hall-knot' + (bond >= at ? ' tied' : '');
      knot.style.left = `${(at / ceiling) * 100}%`;
      knot.title = `${PET_BOND_RANK_NAMES[i]} · ${at.toLocaleString()} bond`;
      rope.appendChild(knot);
    }
    ropeWrap.append(ropeHead, rope);
    const ropeNote = document.createElement('div');
    ropeNote.className = 'hall-rope-note';
    ropeNote.textContent =
      rank >= 4
        ? 'Heartsworn. The rope has no more knots, only years.'
        : `${Math.max(0, (PET_BOND_RANK_XP[rank + 1] ?? 0) - bond).toLocaleString()} bond to the next knot. Meals, hunts, and hard days all braid it.`;
    ropeWrap.appendChild(ropeNote);
    this.standing.appendChild(ropeWrap);

    // ---- The instruments, against the ROSTER envelope.
    const env = rosterEnvelope(pet.level);
    const mine = petStatBlock(pet.species, pet.level, 0, bundle);
    const speed = (def?.speed ?? 3) * (bundle.strideMult ?? 1);
    const rows: Array<[string, number, number, string, string]> = [
      ['Vigor', mine?.maxHp ?? 1, env.hp, `${pet.hp} of ${pet.maxHp}`, 'var(--bond)'],
      [
        'Fang',
        (mine?.die ?? 1) * (mine?.dmgMult ?? 1),
        env.fang,
        `a die of ${mine?.die ?? 1}`,
        '#d98a5a',
      ],
      ['Hide', (mine?.armor ?? 0) + 4, env.hide, `${mine?.armor ?? 0} armor`, '#8a92a0'],
      ['Stride', speed, env.stride, `${speed.toFixed(1)} tiles a breath`, '#8fc7a4'],
    ];
    const measures = document.createElement('div');
    measures.className = 'hall-measures';
    for (const [label, value, max, told, tone] of rows) {
      const m = document.createElement('div');
      m.className = 'hall-measure';
      m.style.setProperty('--m-tone', tone);
      const l = document.createElement('span');
      l.className = 'hall-m-label';
      l.textContent = label;
      const ch = document.createElement('span');
      ch.className = 'hall-m-channel';
      const f = document.createElement('span');
      f.className = 'hall-m-fill';
      f.style.width = `${Math.max(4, Math.min(100, (value / max) * 100))}%`;
      ch.appendChild(f);
      const v = document.createElement('span');
      v.className = 'hall-m-value';
      v.textContent = told;
      m.append(l, ch, v);
      m.title = 'The bar is a comparison: the whole roster at this level, strongest body full.';
      measures.appendChild(m);
    }
    this.standing.appendChild(measures);

    // ---- THE JOURNEY, in the game's voice.
    const journey = document.createElement('div');
    journey.className = 'hall-journey';
    const lines: string[] = [];
    if (pet.tamedAt !== undefined) {
      const days = Math.floor((Date.now() - pet.tamedAt) / 86_400_000);
      const when =
        days <= 0 ? 'today' : days === 1 ? 'a day ago' : `${days.toLocaleString()} days ago`;
      lines.push(
        pet.tamedLevel !== undefined
          ? `Answered your asking at beastcraft ${pet.tamedLevel}, ${when}.`
          : `Answered your asking ${when}.`,
      );
    } else {
      lines.push('It came to you long before the ledgers.');
    }
    const kills = pet.kills ?? 0;
    const downs = pet.downs ?? 0;
    const hunts =
      kills === 0
        ? 'The first hunt together is still ahead.'
        : `${kills.toLocaleString()} ${kills === 1 ? 'hunt' : 'hunts'} shared.`;
    const falls =
      downs === 0
        ? ''
        : ` Fallen ${downs === 1 ? 'once' : `${downs.toLocaleString()} times`}, never left.`;
    lines.push(hunts + falls);
    for (const text of lines) {
      const line = document.createElement('div');
      line.className = 'hall-journey-line';
      line.textContent = text;
      journey.appendChild(line);
    }
    this.standing.appendChild(journey);
  }

  private renderShelf(pet: PetInfo): void {
    this.shelf.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'hall-shelf-head';
    const title = document.createElement('span');
    title.className = 'hall-shelf-title';
    title.textContent = 'The repertoire';
    const sub = document.createElement('span');
    sub.className = 'hall-shelf-sub';
    const ids = repertoireFor(pet.species);
    sub.textContent = `${ids.length} words its kind can hold`;
    head.append(title, sub);
    this.shelf.appendChild(head);
    const track = document.createElement('div');
    track.className = 'hall-track';
    const slotted = new Set(pet.arts ?? []);
    for (const id of ids) {
      const art = petArtDef(id);
      if (!art) continue;
      const plate = document.createElement('button');
      plate.className = 'hall-plate';
      if (id === this.selArt) plate.classList.add('selected');
      if (slotted.has(id)) plate.classList.add('collared');
      if (art.focus === 3) plate.classList.add('signature');
      plate.dataset.nav = '';
      plate.dataset.navkey = `hall:art:${id}`;
      plate.dataset.acta = 'Read';
      const well = document.createElement('span');
      well.className = 'hall-plate-well';
      if (art.kind === 'active') {
        const img = document.createElement('img');
        img.src = abilityIconUrl(art.ability ?? id, 64);
        img.alt = '';
        well.appendChild(img);
      } else {
        // A passive wears its nature, not a spell-plate: the pawprint
        // seal in the art's own place.
        const seal = document.createElement('span');
        seal.className = 'hall-passive-seal';
        well.appendChild(seal);
      }
      const pips = document.createElement('span');
      pips.className = 'hall-pips';
      for (let i = 0; i < art.focus; i++) {
        const pip = document.createElement('span');
        pip.className = 'hall-pip';
        pips.appendChild(pip);
      }
      well.appendChild(pips);
      plate.appendChild(well);
      const name = document.createElement('span');
      name.className = 'hall-plate-name';
      name.textContent = art.name;
      const kind = document.createElement('span');
      kind.className = 'hall-plate-kind';
      kind.textContent = slotted.has(id)
        ? 'Held in mind'
        : art.kind === 'active'
          ? art.focus === 3
            ? 'The signature'
            : 'A working'
          : 'A nature';
      plate.append(name, kind);
      plate.addEventListener('click', () => {
        this.selArt = id;
        this.rerenderPet();
      });
      track.appendChild(plate);
    }
    this.shelf.appendChild(track);
  }

  private renderReading(pet: PetInfo): void {
    this.reading.innerHTML = '';
    const art = this.selArt !== null ? petArtDef(this.selArt) : undefined;
    if (!art) {
      this.mountGround(null);
      return;
    }
    const ab = art.kind === 'active' ? abilityDef(art.ability ?? art.id) : undefined;

    const head = document.createElement('div');
    head.className = 'hall-read-head';
    const well = document.createElement('span');
    well.className = 'hall-read-well';
    if (ab) {
      const img = document.createElement('img');
      img.src = abilityIconUrl(ab.id, 72);
      img.alt = '';
      well.appendChild(img);
    } else {
      const seal = document.createElement('span');
      seal.className = 'hall-passive-seal lg';
      well.appendChild(seal);
    }
    const names = document.createElement('span');
    names.className = 'hall-read-names';
    const nm = document.createElement('span');
    nm.className = 'hall-read-name';
    nm.textContent = art.name;
    const price = document.createElement('span');
    price.className = 'hall-read-price';
    const pips = document.createElement('span');
    pips.className = 'hall-pips read';
    for (let i = 0; i < art.focus; i++) {
      const pip = document.createElement('span');
      pip.className = 'hall-pip';
      pips.appendChild(pip);
    }
    price.append(pips);
    const priceWord = document.createElement('span');
    priceWord.textContent = `${art.focus} focus · ${art.kind === 'active' ? 'a working' : 'a nature, always on'}`;
    price.appendChild(priceWord);
    names.append(nm, price);
    head.append(well, names);
    this.reading.appendChild(head);

    const tale = document.createElement('div');
    tale.className = 'hall-read-tale';
    tale.textContent = art.tale;
    this.reading.appendChild(tale);

    // The pacing chips: rest, breath, band — facts, not prose.
    const chips = document.createElement('div');
    chips.className = 'hall-read-chips';
    const chip = (text: string): void => {
      const c = document.createElement('span');
      c.className = 'hall-chip';
      c.textContent = text;
      chips.appendChild(c);
    };
    if (art.kind === 'active') {
      if (art.cooldownTicks) chip(`rests ${(art.cooldownTicks / 20).toFixed(0)}s`);
      if (art.windupTicks) chip(`draws breath ${(art.windupTicks / 20).toFixed(1)}s`);
      if (art.maxRange) chip(`within ${art.maxRange} tiles`);
      if (art.hpBelow) chip(`only worn under ${Math.round(art.hpBelow * 100)}%`);
      if (ab?.status) chip(`${ab.status.status} ${ab.status.power}`);
      if (ab && ab.damage > 0) chip(`a die of ${ab.damage}`);
      if (ab?.tauntRadius) chip('turns every eye');
      if (ab?.becalmTicks) chip('stills lesser hearts');
      if (ab?.petGuard) chip(`+${ab.petGuard.armor} guard`);
      if (ab?.petHealFrac) chip(`mends ${Math.round(ab.petHealFrac * 100)}%`);
      if (ab?.petCleanse) chip('sheds afflictions');
      if (ab?.petSurge) chip('its blood rises');
    } else if (art.passive) {
      const p = art.passive;
      if (p.armor) chip(`+${p.armor} armor`);
      if (p.maxHpMult) chip(`+${Math.round((p.maxHpMult - 1) * 100)}% vigor`);
      if (p.dmgMult) chip(`+${Math.round((p.dmgMult - 1) * 100)}% fang`);
      if (p.strideMult) chip(`+${Math.round((p.strideMult - 1) * 100)}% stride`);
      if (p.nightStrideMult) chip('quick in the dark');
      if (p.regenMult) chip('mends itself faster');
      if (p.statusLeech) chip('its wounds feed it');
      if (p.firstBlowShrug) chip('the opening blow misses');
      if (p.firstStatusShrug) chip('shrugs the first trick');
      if (p.knockbackImmune) chip('cannot be moved');
      if (p.quietFang) chip('marks never cry for help');
      if (p.deathDefy) chip('refuses its downing blow');
      if (p.woundedArmor) chip('hardens when worn');
      if (p.unhurtArmor) chip('burnishes unstruck');
      if (p.statusDurMult) chip('afflictions run short');
      if (p.bondHealMult) chip('meals mend deeper');
      if (p.openerRange) chip('opens from further');
      if (p.firstStrikeMult) chip('the patient first strike');
      if (p.openerStatus) chip('the opening bite wounds deep');
      if (p.vsStatus) chip(`leans on the ${p.vsStatus.status}`);
      if (p.killsForage) chip('noses supper loose');
      if (p.downedTicksMult) chip('winters, never lingers');
      if (p.nearKeeper) chip('holds fast at your knee');
      if (p.biteStatusPower) chip('a deeper dose');
    }
    this.reading.appendChild(chips);

    // ---- The one verb.
    const slotted = new Set(pet.arts ?? []);
    const isOn = this.selArt !== null && slotted.has(this.selArt);
    const spent = (pet.arts ?? []).reduce((s, id) => s + (petArtDef(id)?.focus ?? 0), 0);
    const budget = pet.focusMax ?? 1;
    const room = budget - spent;
    const slotsFree = (pet.arts ?? []).length < PET_ART_SLOTS;
    const acts = document.createElement('div');
    acts.className = 'hall-read-acts';
    if (isOn) {
      acts.appendChild(
        bigButton('Set the word down', 'hall:unslot', () => this.sendToggle(pet, art, false), {
          minor: true,
        }),
      );
    } else {
      const btn = bigButton('Take it to heart', 'hall:slot', () =>
        this.sendToggle(pet, art, true),
      );
      if (!slotsFree || room < art.focus) {
        btn.setAttribute('disabled', '');
        btn.classList.add('refused');
      }
      acts.appendChild(btn);
      if (!slotsFree) {
        const why = document.createElement('div');
        why.className = 'hall-refusal';
        why.textContent = 'Three collars, no more. Set another word down first.';
        acts.appendChild(why);
      } else if (room < art.focus) {
        const why = document.createElement('div');
        why.className = 'hall-refusal';
        why.textContent = 'It cannot hold so much in mind. Not yet.';
        acts.appendChild(why);
      }
    }
    this.reading.appendChild(acts);

    this.mountGround(ab ?? null);
  }

  private mountGround(ab: Parameters<ProvingGround['show']>[0]): void {
    if (!this.groundMounted) {
      document.getElementById('hall-ground')?.appendChild(this.ground.root);
      this.groundMounted = true;
    }
    this.ground.show(ab);
    document.getElementById('hall-ground')?.classList.toggle('hidden', !ab);
  }

  private renderCollars(pet: PetInfo): void {
    this.collars.innerHTML = '';
    const arts = pet.arts ?? [];
    const spent = arts.reduce((s, id) => s + (petArtDef(id)?.focus ?? 0), 0);
    const budget = pet.focusMax ?? 1;

    const sockets = document.createElement('div');
    sockets.className = 'hall-sockets';
    for (let i = 0; i < PET_ART_SLOTS; i++) {
      const id = arts[i];
      const art = id !== undefined ? petArtDef(id) : undefined;
      const sock = document.createElement('button');
      sock.className = 'hall-socket' + (art ? ' held' : '');
      sock.dataset.nav = '';
      sock.dataset.navkey = `hall:collar:${i}`;
      sock.dataset.acta = art ? 'Set down' : '';
      if (art) {
        const well = document.createElement('span');
        well.className = 'hall-socket-well';
        if (art.kind === 'active') {
          const img = document.createElement('img');
          img.src = abilityIconUrl(art.ability ?? art.id, 48);
          img.alt = '';
          well.appendChild(img);
        } else {
          const seal = document.createElement('span');
          seal.className = 'hall-passive-seal';
          well.appendChild(seal);
        }
        sock.appendChild(well);
        const nm = document.createElement('span');
        nm.className = 'hall-socket-name';
        nm.textContent = art.name;
        sock.appendChild(nm);
        sock.title = 'Set the word down.';
        sock.addEventListener('click', () => this.sendToggle(pet, art, false));
      } else {
        const empty = document.createElement('span');
        empty.className = 'hall-socket-empty';
        empty.textContent = 'An open collar';
        sock.appendChild(empty);
      }
      sockets.appendChild(sock);
    }
    this.collars.appendChild(sockets);

    // ---- The focus ledger: coins spent and coins waiting.
    const ledger = document.createElement('div');
    ledger.className = 'hall-ledger';
    const coins = document.createElement('div');
    coins.className = 'hall-coins';
    for (let i = 0; i < budget; i++) {
      const coin = document.createElement('span');
      coin.className = 'hall-coin' + (i < spent ? ' spent' : '');
      coins.appendChild(coin);
    }
    ledger.appendChild(coins);
    const word = document.createElement('div');
    word.className = 'hall-ledger-word';
    word.textContent = `${spent} of ${budget} focus held in mind`;
    ledger.appendChild(word);
    const next = document.createElement('div');
    next.className = 'hall-ledger-next';
    next.textContent = nextFocusWord(pet);
    ledger.appendChild(next);
    this.collars.appendChild(ledger);
  }

  private lastPets: PetInfo[] = [];

  private rerenderPet(): void {
    // Cheap relight for a selection move — the last mirror retells.
    this.render({ ownPets: this.lastPets });
  }

  private sendToggle(pet: PetInfo, art: PetArtDef, on: boolean): void {
    const arts = [...(pet.arts ?? [])];
    if (on) {
      if (arts.includes(art.id) || arts.length >= PET_ART_SLOTS) return;
      arts.push(art.id);
    } else {
      const at = arts.indexOf(art.id);
      if (at < 0) return;
      arts.splice(at, 1);
    }
    this.onArts?.(pet.slot, arts);
  }
}

/** What the NEXT focus coin waits on, told in the room's voice. */
function nextFocusWord(pet: PetInfo): string {
  const level = pet.level;
  const rank = pet.bondRank ?? 0;
  const byLevel = [20, 40, 60].find((l) => level < l);
  const byBond = [2, 3, 4].find((r) => rank < r);
  const levelWord = byLevel !== undefined ? `its level reaches ${byLevel}` : null;
  const bondWord =
    byBond !== undefined
      ? `you are ${(PET_BOND_RANK_NAMES[byBond] ?? '').toLowerCase()}`
      : null;
  if (levelWord && bondWord) return `The next coin comes when ${levelWord}, or when ${bondWord}.`;
  if (levelWord) return `The next coin comes when ${levelWord}.`;
  if (bondWord) return `The next coin comes when ${bondWord}.`;
  return 'Every coin it will ever hold, it holds.';
}
