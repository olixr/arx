/**
 * THE WORKING ROOMS' RENDERERS — stable, build, plant, compost, trough, work, unmake, craft and bank: each screen's render pass, with the shared ledger row and vault cell.
 * Moved verbatim off StationPanels (foundations F5.3); the functions hold the
 * panel through its public surface.
 */
import { farmBins, farmJobs, farmKey, farmTroughs } from '../game/farmCare.js';
import { buildableIconUrl, itemIconUrl, queueItemIcon } from '../render/icons.js';
import { petPortraitUrl } from '../render/petPortrait.js';
import { tabRail } from './kit/tabs.js';
import { bigButton, iconTile, sectionHead } from './panel.js';
import { VAULT_SORTS, orderVault, pileWorth } from './vaultOrder.js';
import { BUILDABLES, BUILD_CATEGORIES, BuildableDef, COMPOST_BATCH_WORTH, COMPOST_PRIME_WORTH, CROP_BY_SEED, GRADED_PRODUCE, GROWTH_SEEDS, RECIPES, RecipeDef, TROUGH_FEED_CAP, WORK_BATCH_CAP, WORK_RECIPES, WorkRecipeDef, aggregateGearStats, canUnmake, compostWorthOf, effectiveReq, enchantDef, feedWorthOf, gradeOf, inscriptionQuality, instanceName, itemDef, npcDef, qualityWord, recipesForStation, unmakingOf, workDone, workRecipesFor } from '@arx/content';
import { EquipSlot, ItemRoll, PET_CAP, SkillXp, Tile, diagWallInfo, levelForXp } from '@arx/shared';
// Back-imports from the host file — the deferred cycle every split
// rides; touched only at render time, long after both initialize.
import { HANDIWORK_FACE, STATION_FACE } from './stationPanels.js';
import type { StationPanels } from './stationPanels.js';

export function renderStable(host: StationPanels): void {
  host.stableList.innerHTML = '';
  const bySlot = new Map(host.lastPets.map((p) => [p.slot, p]));
  for (let slot = 0; slot < PET_CAP; slot++) {
    const card = document.createElement('div');
    card.className = 'stall-card';
    const p = bySlot.get(slot);
    if (!p) {
      card.classList.add('stall-empty');
      const empty = document.createElement('div');
      empty.className = 'stall-empty-note';
      empty.textContent = 'An empty stall. The wild is wide.';
      card.appendChild(empty);
      host.stableList.appendChild(card);
      continue;
    }
    const head = document.createElement('div');
    head.className = 'stall-head';
    const img = document.createElement('img');
    img.className = 'stall-portrait';
    img.src = petPortraitUrl(p.species, 92, p.lookSeed);
    img.draggable = false;
    head.appendChild(img);
    const id = document.createElement('div');
    id.className = 'stall-id';
    const nameEl = document.createElement('div');
    nameEl.className = 'stall-name';
    nameEl.textContent = p.name;
    const kindEl = document.createElement('div');
    kindEl.className = 'stall-kind';
    kindEl.textContent = `${npcDef(p.species)?.name ?? p.species}, level ${p.level}`;
    const stateEl = document.createElement('div');
    stateEl.className = `stall-state stall-state-${p.state}`;
    stateEl.textContent =
      p.state === 'heel'
        ? 'At your heel'
        : p.state === 'trailing'
          ? 'At your heel, catching up'
          : p.state === 'downed'
            ? 'Down in the field'
            : p.state === 'resting'
              ? `Resting. On its feet in ${Math.max(1, p.restSec ?? 0)}s`
              : 'Waiting in its stall';
    id.appendChild(nameEl);
    id.appendChild(kindEl);
    id.appendChild(stateEl);
    head.appendChild(id);
    card.appendChild(head);
    // The health sliver: the same truth the nameplate carries.
    const bar = document.createElement('div');
    bar.className = 'stall-hp';
    const fill = document.createElement('div');
    fill.className = 'stall-hp-fill';
    fill.style.width = `${Math.round((100 * p.hp) / Math.max(1, p.maxHp))}%`;
    bar.appendChild(fill);
    card.appendChild(bar);

    const acts = document.createElement('div');
    acts.className = 'stall-acts';
    const armed = host.releaseArmed === slot;
    if (p.state === 'stabled') {
      acts.appendChild(
        bigButton('Take to heel', `stable:heel:${slot}`, () => {
          host.releaseArmed = null;
          host.onStable('heel', slot);
        }, { acta: 'Heel' }),
      );
    } else if (p.state === 'heel' || p.state === 'trailing') {
      acts.appendChild(
        bigButton('Rest in the stall', `stable:rest:${slot}`, () => {
          host.releaseArmed = null;
          host.onStable('stable', slot);
        }, { acta: 'Rest' }),
      );
    }
    acts.appendChild(
      bigButton('Rename', `stable:rename:${slot}`, () => {
        host.releaseArmed = null;
        host.onStableRename(slot, p.name);
      }, { acta: 'Rename', minor: true }),
    );
    acts.appendChild(
      bigButton(
        armed ? `Release ${p.name}, truly?` : 'Release',
        `stable:release:${slot}`,
        () => {
          if (host.releaseArmed === slot) {
            host.releaseArmed = null;
            host.onStable('release', slot);
          } else {
            host.releaseArmed = slot;
            renderStable(host);
          }
        },
        { acta: armed ? 'Release' : 'Arm', minor: !armed },
      ),
    );
    card.appendChild(acts);
    host.stableList.appendChild(card);
  }
}

/**
 * The Builder's Table on the Workshop anatomy (LEDGER LEFT, WORK
 * RIGHT): blueprints shelved by category with an in-reach sort, and
 * the chosen piece laid out large — costs against the pack, build
 * time, footing in world-words, the dial note for corners, and one
 * Place button. Locked plans stay visible; ambition needs a map.
 */
export function renderBuild(host: StationPanels): void {
  if (host.showing?.kind !== 'build') return;
  const showing = host.showing;
  const { skills } = showing;
  host.buildList.innerHTML = '';
  host.buildDetail.innerHTML = '';

  const defs = [...BUILDABLES.values()];
  const levelOf = (d: BuildableDef): number => levelForXp(skills[d.skill ?? 'construction'] ?? 0);
  const lockedOf = (d: BuildableDef): boolean => levelOf(d) < d.levelReq;
  if (!showing.sel || !BUILDABLES.has(showing.sel)) {
    const canDo = defs.find((d) => !lockedOf(d) && host.placeable(d) > 0);
    const unlocked = defs.find((d) => !lockedOf(d));
    showing.sel = (canDo ?? unlocked ?? defs[0]!).id;
  }

  host.sortBar(
    host.buildTools,
    'build',
    [
      ['reach', 'In reach'],
      ['level', 'By level'],
      ['az', 'A-Z'],
    ],
    host.buildSort,
    (k) => {
      host.buildSort = k;
      renderBuild(host);
    },
  );
  const reachScore = (d: BuildableDef): number =>
    (lockedOf(d) ? 0 : 2) + (!lockedOf(d) && host.placeable(d) > 0 ? 1 : 0);
  const ordered = (list: BuildableDef[]): BuildableDef[] => {
    const rows = [...list];
    if (host.buildSort === 'az') rows.sort((a, b) => a.name.localeCompare(b.name));
    else if (host.buildSort === 'level')
      rows.sort((a, b) => a.levelReq - b.levelReq || a.name.localeCompare(b.name));
    else
      rows.sort(
        (a, b) =>
          reachScore(b) - reachScore(a) ||
          a.levelReq - b.levelReq ||
          a.name.localeCompare(b.name),
      );
    return rows;
  };

  // The shelves: every category in its fixed order, each sorted
  // the player's way inside.
  const dealtPlans: HTMLElement[] = [];
  for (const cat of BUILD_CATEGORIES) {
    const shelf = defs.filter((d) => d.cat === cat.id);
    if (shelf.length === 0) continue;
    const head = document.createElement('div');
    head.className = 'build-shelf';
    head.textContent = cat.label;
    dealtPlans.push(head);
    for (const def of ordered(shelf)) {
      const locked = lockedOf(def);
      const count = host.placeable(def);
      dealtPlans.push(
        ledgerRow(host, {
          key: `plan:${def.id}`,
          next: '#build-detail',
          iconUrl: buildableIconUrl(def.id, 40) ?? itemIconUrl('log', 40),
          name: def.name,
          note: locked ? `lvl ${def.levelReq}` : count > 0 ? `× ${count}` : 'short',
          noteTone: locked ? 'lock' : count > 0 ? 'ok' : 'short',
          selected: showing.sel === def.id,
          onPick: () => {
            showing.sel = def.id;
            renderBuild(host);
          },
        }),
      );
    }
  }
  host.dealIntoLedger(host.buildList, 'build', dealtPlans, 8);

  // ---- the chosen plan, laid out large
  const def = BUILDABLES.get(showing.sel)!;
  const skill = def.skill ?? 'construction';
  const level = levelOf(def);
  const locked = lockedOf(def);
  const count = host.placeable(def);
  const turnable =
    def.tile !== undefined &&
    (diagWallInfo(def.tile) !== null ||
      def.tile === Tile.FenceDiagNE ||
      def.tile === Tile.HedgeDiagNE);

  const head = document.createElement('div');
  head.className = 'work-head';
  head.appendChild(iconTile(buildableIconUrl(def.id, 64) ?? itemIconUrl('log', 64)));
  const titles = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'work-name';
  name.textContent = def.name;
  const sub = document.createElement('div');
  sub.className = 'work-sub';
  sub.textContent = `${skill} · level ${def.levelReq} · +${def.xp} xp`;
  titles.append(name, sub);
  head.appendChild(titles);
  host.buildDetail.appendChild(head);

  const facts = document.createElement('div');
  facts.className = 'work-facts';
  const fact = (value: string, label: string, tone?: string): void => {
    const f = document.createElement('div');
    f.className = 'work-fact';
    const v = document.createElement('strong');
    v.textContent = value;
    if (tone) v.style.color = tone;
    const l = document.createElement('span');
    l.textContent = label;
    f.append(v, l);
    facts.appendChild(f);
  };
  fact(
    locked ? '·' : `× ${count}`,
    'you can place',
    locked ? undefined : count > 0 ? 'var(--green)' : 'var(--red-soft)',
  );
  fact(`${level}`, `your ${skill}`, locked ? 'var(--red-soft)' : undefined);
  fact(`${(def.ticks / 20).toFixed(1)}s`, 'to raise');
  host.buildDetail.appendChild(facts);

  if (def.materials.length > 0) {
    host.buildDetail.appendChild(sectionHead('Materials'));
    for (const m of def.materials) {
      host.buildDetail.appendChild(host.materialRow(m.item, m.qty));
    }
  }

  host.buildDetail.appendChild(sectionHead('Where it stands'));
  const footing = document.createElement('div');
  footing.className = 'work-result';
  const footLine = document.createElement('div');
  footLine.className = 'work-result-facts';
  footLine.textContent = `Wants ${host.footingWords(def)}.`;
  footing.appendChild(footLine);
  if (turnable) {
    const turnLine = document.createElement('div');
    turnLine.className = 'work-result-flavor';
    turnLine.textContent =
      'A corner piece: it reads its neighbours on its own, or turns under the wheel while you aim.';
    footing.appendChild(turnLine);
  }
  host.buildDetail.appendChild(footing);

  const actions = document.createElement('div');
  actions.className = 'work-actions';
  if (locked) {
    const lockNote = document.createElement('span');
    lockNote.className = 'lock-note';
    lockNote.textContent = `Reach ${skill} ${def.levelReq} to place this`;
    actions.appendChild(lockNote);
  } else {
    const btn = bigButton('Place', `build:${def.id}`, () => host.onPickBuildable(def.id), {
      acta: 'Place',
    });
    if (count === 0 && def.materials.length > 0) btn.disabled = true;
    actions.appendChild(btn);
  }
  host.buildDetail.appendChild(actions);
}

/** One ledger row (Workshop master list). A string `iconUrl` sets
 * the portrait synchronously; a function fills it through the
 * BUDGETED LANE (icons.ts) so a first-open burst never hitches. */
export function ledgerRow(host: StationPanels, opts: {
  key: string;
  iconUrl: string | ((img: HTMLImageElement) => void);
  name: string;
  note: string;
  noteTone?: 'ok' | 'short' | 'lock';
  selected: boolean;
  onPick: () => void;
  /**
   * THE HAND LANDS ON THE WORK: where the pad cursor goes once this
   * row is chosen — the detail pane's own verbs, so a ledger is never
   * a toll booth on the way to the Make button.
   */
  next?: string;
  /**
   * THE MARKED BATCH: a toggle chip riding the row's right edge, its
   * own pad stop, so marking a pile never means walking the detail
   * pane once per piece. Only the unmaking bench deals it.
   */
  mark?: { on: boolean; key: string; toggle: () => void };
}): HTMLElement {
  const row = document.createElement('div');
  row.className =
    'ledger-row' + (opts.selected ? ' selected' : '') + (opts.mark?.on ? ' marked' : '');
  row.dataset.nav = '';
  row.dataset.navkey = opts.key;
  row.dataset.acta = 'View';
  if (opts.next !== undefined) row.dataset.navnext = opts.next;
  const img = document.createElement('img');
  if (typeof opts.iconUrl === 'string') img.src = opts.iconUrl;
  else opts.iconUrl(img);
  img.draggable = false;
  const name = document.createElement('span');
  name.className = 'ledger-name';
  name.textContent = opts.name;
  const note = document.createElement('span');
  note.className = `ledger-note ${opts.noteTone ?? ''}`.trim();
  note.textContent = opts.note;
  row.append(img, name, note);
  if (opts.mark) {
    const chip = document.createElement('button');
    chip.className = 'ledger-mark' + (opts.mark.on ? ' on' : '');
    chip.textContent = '◆';
    chip.title = opts.mark.on ? 'Unmark' : 'Mark for the batch';
    chip.dataset.nav = '';
    chip.dataset.navkey = opts.mark.key;
    chip.dataset.acta = opts.mark.on ? 'Unmark' : 'Mark';
    chip.addEventListener('click', (ev) => {
      ev.stopPropagation(); // the chip marks; only the row selects
      opts.mark!.toggle();
    });
    row.appendChild(chip);
  }
  row.addEventListener('click', opts.onPick);
  return row;
}

export function renderPlant(host: StationPanels): void {
  if (host.showing?.kind !== 'plant') return;
  const showing = host.showing;
  const { tx, ty, skills } = showing;
  host.craftTools.innerHTML = ''; // a seed pouch needs no sorting
  host.craftList.innerHTML = '';
  host.craftDetail.innerHTML = '';
  const level = levelForXp(skills.farming ?? 0);

  // Tally the seed pouches in the pack — the BED decides which
  // pouches answer: spores for a log, annuals for a frame (a tree
  // wants open sky), everything tilled for the open plot.
  const bedTakes = (seed: string): boolean => {
    const crop = CROP_BY_SEED.get(seed);
    if (showing.bed === 'log') return crop?.bed === 'log';
    if (crop?.bed === 'log') return false;
    if (showing.bed === 'frame') return crop !== undefined && crop.recurring === undefined;
    return crop !== undefined || GROWTH_SEEDS.has(seed);
  };
  const held = new Map<string, number>();
  for (const slot of host.getInventory()) {
    if (slot && bedTakes(slot.item)) {
      held.set(slot.item, (held.get(slot.item) ?? 0) + slot.qty);
    }
  }
  if (held.size === 0) {
    const empty = document.createElement('div');
    empty.className = 'make-empty';
    empty.textContent =
      showing.bed === 'log'
        ? 'No spores in your pack. Jorel keeps them, out in the fields.'
        : 'No seeds in your pack. Buy some at the shop, or forage wild herbs.';
    host.craftList.appendChild(empty);
    return;
  }
  const seeds = [...held.keys()];
  if (!showing.sel || !held.has(showing.sel)) showing.sel = seeds[0]!;

  host.dealIntoLedger(
    host.craftList,
    'plant',
    seeds.map((seed) => {
      // THE SOWN LINE: tree and bush seeds share the picker with
      // crops but carry no crop def — the wild owns their clock.
      const crop = CROP_BY_SEED.get(seed);
      const locked = crop !== undefined && level < crop.levelReq;
      return ledgerRow(host, {
        key: `plantrow:${seed}`,
        next: '#craft-detail',
        iconUrl: itemIconUrl(seed, 40),
        name: crop?.name ?? itemDef(seed)?.name ?? seed,
        note: locked ? `lvl ${crop!.levelReq}` : `× ${held.get(seed)!.toLocaleString()}`,
        noteTone: locked ? 'lock' : 'ok',
        selected: showing.sel === seed,
        onPick: () => {
          showing.sel = seed;
          renderPlant(host);
        },
      });
    }),
    8,
  );

  // The chosen seed, laid out large.
  const seed = showing.sel;
  const crop = CROP_BY_SEED.get(seed);
  const sown = GROWTH_SEEDS.has(seed);
  const locked = crop !== undefined && level < crop.levelReq;
  const head = document.createElement('div');
  head.className = 'work-head';
  head.appendChild(iconTile(itemIconUrl(seed, 64)));
  const titles = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'work-name';
  name.textContent = crop?.name ?? itemDef(seed)?.name ?? seed;
  const sub = document.createElement('div');
  sub.className = 'work-sub';
  sub.textContent = crop ? `farming · level ${crop.levelReq}` : 'planting · wild ground';
  titles.append(name, sub);
  head.appendChild(titles);
  host.craftDetail.appendChild(head);

  const facts = document.createElement('div');
  facts.className = 'work-facts';
  const fact = (label: string, value: string): void => {
    const f = document.createElement('div');
    f.className = 'work-fact';
    f.innerHTML = '';
    const v = document.createElement('strong');
    v.textContent = value;
    const l = document.createElement('span');
    l.textContent = label;
    f.append(v, l);
    facts.appendChild(f);
  };
  fact('to grow', crop ? `~${crop.growMinutes} min` : 'the world decides');
  fact('seeds held', held.get(seed)!.toLocaleString());
  host.craftDetail.appendChild(facts);

  host.craftDetail.appendChild(sectionHead(sown ? 'Into wild earth' : 'In the furrow'));
  host.craftDetail.appendChild(host.materialRow(seed, 1));

  const actions = document.createElement('div');
  actions.className = 'work-actions';
  if (locked) {
    const lockNote = document.createElement('span');
    lockNote.className = 'lock-note';
    lockNote.textContent = `Reach farming ${crop!.levelReq} to plant this`;
    actions.appendChild(lockNote);
  } else {
    actions.appendChild(
      bigButton('Plant', `plant:${seed}`, () => {
        host.onPlant?.(tx, ty, seed);
        host.closeAll();
      }),
    );
  }
  host.craftDetail.appendChild(actions);
}

export function renderCompost(host: StationPanels): void {
  if (host.showing?.kind !== 'compost') return;
  const showing = host.showing;
  const { tx, ty } = showing;
  host.craftTools.innerHTML = '';
  host.craftList.innerHTML = '';
  host.craftDetail.innerHTML = '';
  const bin = farmBins.get(farmKey(tx, ty)) ?? { fill: 0, graded: 0, readyAt: 0 };
  const working = bin.readyAt !== 0 && Date.now() < bin.readyAt;
  const ready = bin.readyAt !== 0 && Date.now() >= bin.readyAt;

  // Tally what the pack can feed the heap (honest goods only —
  // stolen slots are refused at the server door and never listed).
  const held = new Map<string, { qty: number; worth: number; graded: number }>();
  for (const slot of host.getInventory()) {
    if (!slot || slot.stolen) continue;
    const worth = compostWorthOf(slot.item, itemDef(slot.item));
    if (!worth) continue;
    const row = held.get(slot.item) ?? { qty: 0, ...worth };
    row.qty += slot.qty;
    held.set(slot.item, row);
  }

  if (working || ready) {
    const note = document.createElement('div');
    note.className = 'make-empty';
    note.textContent = ready
      ? 'The batch is done. Close this and turn the bin out.'
      : `The heap is working. About ${Math.max(1, Math.ceil((bin.readyAt - Date.now()) / 60_000))} min.`;
    host.craftList.appendChild(note);
  } else if (held.size === 0) {
    const empty = document.createElement('div');
    empty.className = 'make-empty';
    empty.textContent = 'Nothing in your pack would feed the heap. Spare produce, seeds, and spoiled cooking all serve.';
    host.craftList.appendChild(empty);
  } else {
    const items = [...held.keys()];
    if (!showing.sel || !held.has(showing.sel)) showing.sel = items[0]!;
    host.dealIntoLedger(
      host.craftList,
      'compost',
      items.map((item) => {
        const row = held.get(item)!;
        return ledgerRow(host, {
          key: `compostrow:${item}`,
          next: '#craft-detail',
          iconUrl: itemIconUrl(item, 40),
          name: itemDef(item)?.name ?? item,
          note: `× ${row.qty.toLocaleString()}`,
          noteTone: 'ok',
          selected: showing.sel === item,
          onPick: () => {
            showing.sel = item;
            renderCompost(host);
          },
        });
      }),
      8,
    );
  }

  // The bin itself, laid out large: the fill meter is the story.
  const head = document.createElement('div');
  head.className = 'work-head';
  head.appendChild(iconTile(itemIconUrl(bin.graded >= COMPOST_PRIME_WORTH ? 'prime_compost' : 'compost', 64)));
  const titles = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'work-name';
  name.textContent = working ? 'The heap works' : ready ? 'Ready to turn out' : 'Feeding the heap';
  const sub = document.createElement('div');
  sub.className = 'work-sub';
  sub.textContent = 'farming · the station works while you wander';
  titles.append(name, sub);
  head.appendChild(titles);
  host.craftDetail.appendChild(head);

  const facts = document.createElement('div');
  facts.className = 'work-facts';
  const fact = (label: string, value: string): void => {
    const f = document.createElement('div');
    f.className = 'work-fact';
    const v = document.createElement('strong');
    v.textContent = value;
    const l = document.createElement('span');
    l.textContent = label;
    f.append(v, l);
    facts.appendChild(f);
  };
  fact('the heap', `${Math.min(bin.fill, COMPOST_BATCH_WORTH)} of ${COMPOST_BATCH_WORTH}`);
  fact('good measures', `${bin.graded} of ${COMPOST_PRIME_WORTH} for prime`);
  host.craftDetail.appendChild(facts);

  if (!working && !ready && showing.sel) {
    const sel = showing.sel;
    const worth = held.get(sel);
    if (worth) {
      host.craftDetail.appendChild(sectionHead('Into the heap'));
      host.craftDetail.appendChild(host.materialRow(sel, 1));
      const actions = document.createElement('div');
      actions.className = 'work-actions';
      actions.appendChild(
        bigButton(worth.worth > 1 ? `Add (+${worth.worth})` : 'Add', `compost:${sel}`, () => {
          // Slot-addressed at send time: the first honest slot
          // holding the chosen item speaks for it.
          const slots = host.getInventory();
          for (let i = 0; i < slots.length; i++) {
            const s = slots[i];
            if (s && s.item === sel && !s.stolen) {
              host.onCompost?.(tx, ty, i);
              return;
            }
          }
        }),
      );
      host.craftDetail.appendChild(actions);
    }
  }
}

export function renderTrough(host: StationPanels): void {
  if (host.showing?.kind !== 'trough') return;
  const showing = host.showing;
  const { tx, ty } = showing;
  host.craftTools.innerHTML = '';
  host.craftList.innerHTML = '';
  host.craftDetail.innerHTML = '';
  const feed = farmTroughs.get(farmKey(tx, ty))?.feed ?? 0;

  const held = new Map<string, { qty: number; worth: number }>();
  for (const slot of host.getInventory()) {
    if (!slot || slot.stolen) continue;
    const worth = feedWorthOf(slot.item, gradeOf, (base) => GRADED_PRODUCE.has(base));
    if (worth === null) continue;
    const row = held.get(slot.item) ?? { qty: 0, worth };
    row.qty += slot.qty;
    held.set(slot.item, row);
  }

  if (feed >= TROUGH_FEED_CAP) {
    const note = document.createElement('div');
    note.className = 'make-empty';
    note.textContent = 'The manger is heaped full. The herd approves.';
    host.craftList.appendChild(note);
  } else if (held.size === 0) {
    const empty = document.createElement('div');
    empty.className = 'make-empty';
    empty.textContent = 'Nothing in your pack would feed the herd. Barley and spare produce serve.';
    host.craftList.appendChild(empty);
  } else {
    const items = [...held.keys()];
    if (!showing.sel || !held.has(showing.sel)) showing.sel = items[0]!;
    host.dealIntoLedger(
      host.craftList,
      'trough',
      items.map((item) => {
        const row = held.get(item)!;
        return ledgerRow(host, {
          key: `troughrow:${item}`,
          next: '#craft-detail',
          iconUrl: itemIconUrl(item, 40),
          name: itemDef(item)?.name ?? item,
          note: `× ${row.qty.toLocaleString()}`,
          noteTone: 'ok',
          selected: showing.sel === item,
          onPick: () => {
            showing.sel = item;
            renderTrough(host);
          },
        });
      }),
      8,
    );
  }

  const head = document.createElement('div');
  head.className = 'work-head';
  head.appendChild(iconTile(itemIconUrl('barley', 64)));
  const titles = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'work-name';
  name.textContent = feed > 0 ? 'The herd eats well' : 'An empty manger';
  const sub = document.createElement('div');
  sub.className = 'work-sub';
  sub.textContent = 'beastcraft · a fed animal gives its best';
  titles.append(name, sub);
  head.appendChild(titles);
  host.craftDetail.appendChild(head);

  const facts = document.createElement('div');
  facts.className = 'work-facts';
  const fact = (label: string, value: string): void => {
    const f = document.createElement('div');
    f.className = 'work-fact';
    const v = document.createElement('strong');
    v.textContent = value;
    const l = document.createElement('span');
    l.textContent = label;
    f.append(v, l);
    facts.appendChild(f);
  };
  fact('the manger', `${feed} of ${TROUGH_FEED_CAP}`);
  fact('each collect', 'eats one measure');
  host.craftDetail.appendChild(facts);

  if (feed < TROUGH_FEED_CAP && showing.sel) {
    const sel = showing.sel;
    const worth = held.get(sel);
    if (worth) {
      host.craftDetail.appendChild(sectionHead('Into the manger'));
      host.craftDetail.appendChild(host.materialRow(sel, 1));
      const actions = document.createElement('div');
      actions.className = 'work-actions';
      actions.appendChild(
        bigButton(worth.worth > 1 ? `Feed (+${worth.worth})` : 'Feed', `trough:${sel}`, () => {
          const slots = host.getInventory();
          for (let i = 0; i < slots.length; i++) {
            const s = slots[i];
            if (s && s.item === sel && !s.stolen) {
              host.onTrough?.(tx, ty, i);
              return;
            }
          }
        }),
      );
      host.craftDetail.appendChild(actions);
    }
  }
}

export function renderWork(host: StationPanels): void {
  if (host.showing?.kind !== 'work') return;
  const showing = host.showing;
  const { tx, ty, work } = showing;
  host.craftTools.innerHTML = '';
  host.craftList.innerHTML = '';
  host.craftDetail.innerHTML = '';
  const job = farmJobs.get(farmKey(tx, ty));
  const running = job && job.qty > 0 ? WORK_RECIPES.get(job.recipe) : undefined;

  // How many units of a recipe the pack covers (any grade serves).
  const familyCount = (base: string): number => {
    let n = 0;
    for (const s of host.getInventory()) {
      if (s && !s.stolen && gradeOf(s.item).base === base) n += s.qty;
    }
    return n;
  };
  const canLoad = (r: WorkRecipeDef): number => {
    let n = WORK_BATCH_CAP;
    for (const i of r.inputs) n = Math.min(n, Math.floor(familyCount(i.item) / i.qty));
    return n;
  };

  if (running && job) {
    const done = workDone(running, job.startedAt, job.qty, Date.now());
    const note = document.createElement('div');
    note.className = 'make-empty';
    note.textContent =
      done > 0
        ? `${done} measure${done > 1 ? 's' : ''} ready. Close this and collect.`
        : `${running.name} runs: ${job.qty} queued, about ${Math.max(1, Math.ceil((job.startedAt + running.minutes * 60_000 - Date.now()) / 60_000))} min to the next.`;
    host.craftList.appendChild(note);
  } else {
    const recipes = workRecipesFor(work);
    if (!showing.sel || !WORK_RECIPES.has(showing.sel)) showing.sel = recipes[0]?.id ?? null;
    host.dealIntoLedger(
      host.craftList,
      'work',
      recipes.map((r) =>
        ledgerRow(host, {
          key: `workrow:${r.id}`,
          next: '#craft-detail',
          iconUrl: itemIconUrl(r.output.item, 40),
          name: r.name,
          note: canLoad(r) > 0 ? `× ${canLoad(r)}` : `lvl ${r.levelReq}`,
          noteTone: canLoad(r) > 0 ? 'ok' : 'lock',
          selected: showing.sel === r.id,
          onPick: () => {
            showing.sel = r.id;
            renderWork(host);
          },
        }),
      ),
      8,
    );
  }

  const sel = !running && showing.sel ? WORK_RECIPES.get(showing.sel) : running;
  if (!sel) return;
  const head = document.createElement('div');
  head.className = 'work-head';
  head.appendChild(iconTile(itemIconUrl(sel.output.item, 64)));
  const titles = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'work-name';
  name.textContent = sel.name;
  const sub = document.createElement('div');
  sub.className = 'work-sub';
  sub.textContent = `${sel.skill} · level ${sel.levelReq} · ${sel.minutes} min a measure`;
  titles.append(name, sub);
  head.appendChild(titles);
  host.craftDetail.appendChild(head);

  const facts = document.createElement('div');
  facts.className = 'work-facts';
  const fact = (label: string, value: string): void => {
    const f = document.createElement('div');
    f.className = 'work-fact';
    const v = document.createElement('strong');
    v.textContent = value;
    const l = document.createElement('span');
    l.textContent = label;
    f.append(v, l);
    facts.appendChild(f);
  };
  fact('the batch', 'as good as its weakest measure');
  fact('xp at collect', `${sel.xp} a measure`);
  host.craftDetail.appendChild(facts);

  if (!running) {
    host.craftDetail.appendChild(sectionHead('Into the station'));
    for (const input of sel.inputs) host.craftDetail.appendChild(host.materialRow(input.item, input.qty));
    const n = canLoad(sel);
    const actions = document.createElement('div');
    actions.className = 'work-actions';
    for (const qty of [1, 5, WORK_BATCH_CAP]) {
      if (qty > 1 && n < qty) continue;
      const btn = bigButton(qty === 1 ? 'Load 1' : `Load ${qty}`, `work:${sel.id}:${qty}`, () => {
        host.onWork?.(tx, ty, sel.id, qty);
        host.closeAll();
      });
      if (n < 1) btn.disabled = true;
      actions.appendChild(btn);
    }
    host.craftDetail.appendChild(actions);
  }
}

/**
 * THE UNMAKING bench: the pack, filtered to what has Arx in it, and
 * an honest account of what each piece comes apart into.
 *
 * The yield is computed by the SAME pure function the server pays
 * out from, so the preview and the payout can never disagree. On a
 * destructive action that would be the worst bug in the system.
 */
export function renderUnmake(host: StationPanels, skills: SkillXp): void {
  const inv = host.getInventory();
  const rows: Array<{
    slot: number;
    item: string;
    roll?: ItemRoll;
    stolen?: true;
    /** Set when the piece is on the body rather than in the pack. */
    worn?: EquipSlot;
  }> = [];
  inv.forEach((s, i) => {
    if (s && canUnmake(s.item)) rows.push({ slot: i, item: s.item, roll: s.roll, stolen: s.stolen });
  });
  // Worn pieces that carry a working are listed too, so a player who
  // wants to change a school does not have to guess that the bench
  // only sees their pack. They can be SUNDERED but never unmade: a
  // Destroy button aimed at the armor you are wearing is a footgun,
  // not a feature.
  for (const [wslot, w] of Object.entries(host.getEquipment())) {
    if (w?.roll?.ench || w?.roll?.ench2) {
      rows.push({ slot: -1, item: w.id, roll: w.roll, worn: wslot as EquipSlot });
    }
  }

  // THE MARKS FOLLOW THE PIECES: a mark whose slot emptied, shifted,
  // or turned out hot since it was set is let go — a batch must
  // never break a stranger standing where a marked piece used to.
  for (const [slot, item] of [...host.unmakeMarked]) {
    if (!rows.some((r) => !r.worn && !r.stolen && r.slot === slot && r.item === item)) {
      host.unmakeMarked.delete(slot);
    }
  }
  if (host.unmakeMarked.size === 0) host.unmakeBatchArmed = false;

  if (rows.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'make-empty';
    empty.textContent =
      'Nothing in your pack has Arx to recover. Worn-out armor and weapons come apart here.';
    host.craftList.appendChild(empty);
    return;
  }
  if (
    host.unmakeSel === null ||
    !rows.some((r) => (r.worn ? -1 : r.slot) === host.unmakeSel && r.worn === host.unmakeWorn)
  ) {
    host.unmakeSel = rows[0]!.worn ? -1 : rows[0]!.slot;
    host.unmakeWorn = rows[0]!.worn;
  }

  host.dealIntoLedger(
    host.craftList,
    'unmake',
    rows.map((row) => {
      const result = unmakingOf(row.item, row.roll);
      const dust = result?.yields.find((y) => y.item === 'arcane_dust')?.qty ?? 0;
      const marked = !row.worn && host.unmakeMarked.get(row.slot) === row.item;
      return ledgerRow(host, {
        // `unrow:`, never `unmake:` — the Unmake button owns that key,
        // and two stops sharing a navkey starved the pad's advance:
        // the row's own key matched the target and the cursor never
        // moved (resolveAdvance refuses a target wearing the focus key).
        key: `unrow:${row.worn ?? row.slot}`,
        // THE HAND LANDS ON THE WORK, and on the gentler verb where
        // one exists: worked steel lands on Sunder (the bench's own
        // framing — most players want the working gone, not the
        // piece), bare steel lands on Unmake. A hot piece advances
        // nowhere; its pane is a refusal, not a verb.
        next: row.stolen
          ? undefined
          : row.worn
            ? `key:sunder:ward:${row.worn}`
            : row.roll?.ench || row.roll?.ench2
              ? `key:sunder:ward:${row.slot}`
              : `key:unmake:${row.slot}`,
        iconUrl: itemIconUrl(row.item, 40),
        name: instanceName(row.item, row.roll),
        note: marked
          ? 'marked'
          : row.worn
            ? 'worn'
            : row.stolen
              ? 'hot'
              : row.roll?.deep
                ? 'deepened'
                : enchantDef(row.roll?.ench)
                  ? 'worked'
                  : `${dust} dust`,
        noteTone: row.stolen ? 'lock' : 'ok',
        selected: host.unmakeSel === (row.worn ? -1 : row.slot) && host.unmakeWorn === row.worn,
        onPick: () => {
          host.unmakeSel = row.worn ? -1 : row.slot;
          host.unmakeWorn = row.worn;
          host.unmakeArmed = null;
          renderCraft(host);
        },
        mark:
          row.worn || row.stolen
            ? undefined
            : {
                on: marked,
                key: `mark:${row.slot}`,
                toggle: () => {
                  if (marked) host.unmakeMarked.delete(row.slot);
                  else host.unmakeMarked.set(row.slot, row.item);
                  host.unmakeBatchArmed = false;
                  renderCraft(host);
                },
              },
      });
    }),
    8,
  );

  // THE RECOVERED RIBBON leads the pane: the payout the last
  // breaking proved, shown once the pack shows the pieces gone.
  host.renderBreakRibbon();

  // A piece with nothing bound in and no fine rarity is JUNK — what
  // the one-sweep suggestion may mark by itself. Worked, deepened,
  // rare-or-finer and hot pieces are always the player's own call.
  const junkRows = rows.filter((r) => {
    if (r.worn || r.stolen) return false;
    if (r.roll?.ench || r.roll?.ench2 || r.roll?.deep) return false;
    const rar = r.roll?.rar ?? 'common';
    return rar === 'common' || rar === 'uncommon';
  });
  const markedRows = rows.filter((r) => !r.worn && host.unmakeMarked.get(r.slot) === r.item);
  // NOTHING LIVES BELOW THE FOLD: a standing batch is the ACTIVE
  // work and leads the pane; the mere suggestion of one stays a
  // quiet footer under the picked piece.
  if (markedRows.length > 0) renderUnmakeBatch(host, markedRows, junkRows);

  const picked = rows.find(
    (r) => (r.worn ? -1 : r.slot) === host.unmakeSel && r.worn === host.unmakeWorn,
  )!;
  const result = unmakingOf(picked.item, picked.roll);
  if (!result) return;
  const pickedName = instanceName(picked.item, picked.roll);

  const head = document.createElement('div');
  head.className = 'work-head';
  head.appendChild(iconTile(itemIconUrl(picked.item, 64)));
  const titles = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'work-name';
  name.textContent = pickedName;
  const sub = document.createElement('div');
  sub.className = 'work-sub';
  sub.textContent = `enchanting · +${result.xp} xp`;
  titles.append(name, sub);
  head.appendChild(titles);
  host.craftDetail.appendChild(head);

  const facts = document.createElement('div');
  facts.className = 'work-facts';
  const fact = (value: string, label: string, tone?: string): void => {
    const f = document.createElement('div');
    f.className = 'work-fact';
    const v = document.createElement('strong');
    v.textContent = value;
    if (tone) v.style.color = tone;
    const l = document.createElement('span');
    l.textContent = label;
    f.append(v, l);
    facts.appendChild(f);
  };
  fact(`${levelForXp(skills.enchanting ?? 0)}`, 'your enchanting');
  fact(`+${result.xp}`, 'xp for the work');
  host.craftDetail.appendChild(facts);

  host.craftDetail.appendChild(sectionHead('What comes out'));
  for (const y of result.yields) {
    host.craftDetail.appendChild(host.yieldRow(y.item, y.qty));
  }

  const warn = document.createElement('div');
  warn.className = 'work-result';
  const flavor = document.createElement('div');
  flavor.className = 'work-result-flavor';
  flavor.textContent = picked.stolen
    ? 'This one is stolen. No honest bench will take it apart for you.'
    : 'The piece is destroyed. Whatever is bound into it comes back as dust; the rest is gone.';
  warn.appendChild(flavor);
  host.craftDetail.appendChild(warn);

  // SUNDERING is offered first and framed as the gentler answer: most
  // players opening this bench with an enchanted piece want the
  // working gone, not the piece gone.
  const ward = enchantDef(picked.roll?.ench);
  const art = enchantDef(picked.roll?.ench2);
  if (ward || art) {
    host.craftDetail.appendChild(sectionHead('Or draw a working out'));
    const note = document.createElement('div');
    note.className = 'work-result';
    const nf = document.createElement('div');
    nf.className = 'work-result-flavor';
    nf.textContent = art
      ? 'Sundering strips one working and leaves the piece whole. The opened seat stays open, so a sundered art can be replaced without another sigil.'
      : `Sundering strips the ${ward!.name} and leaves the piece whole. Bare steel takes the next working cleanly; worked steel of another school fights it.`;
    note.appendChild(nf);
    host.craftDetail.appendChild(note);
    const sunderRow = document.createElement('div');
    sunderRow.className = 'work-actions';
    // A deepened piece names its seats, because which one you are
    // about to lose is the only thing that matters here.
    if (ward) {
      sunderRow.appendChild(
        bigButton(
          art ? `Sunder ward (${ward.name})` : 'Sunder',
          `sunder:ward:${picked.worn ?? picked.slot}`,
          () => host.onSunder(picked.slot, picked.worn, 'ward'),
          { minor: true, acta: 'Sunder' },
        ),
      );
    }
    if (art) {
      sunderRow.appendChild(
        bigButton(
          `Sunder art (${art.name})`,
          `sunder:art:${picked.worn ?? picked.slot}`,
          () => host.onSunder(picked.slot, picked.worn, 'art'),
          { minor: true, acta: 'Sunder' },
        ),
      );
    }
    host.craftDetail.appendChild(sunderRow);
  }

  // A worn piece is offered for sundering and nothing else. A Destroy
  // button aimed at the armor you are currently wearing is a footgun.
  // The batch section still renders below it: picking a worn piece
  // must never hide the marked batch's own verbs.
  if (!picked.worn) {
    const actions = document.createElement('div');
    actions.className = 'work-actions';
    if (picked.stolen) {
      const no = bigButton('Cannot unmake', `unmake:${picked.slot}`, () => {}, { minor: true });
      no.disabled = true;
      actions.appendChild(no);
    } else if (host.unmakeArmed === picked.slot) {
      // THE SECOND PRESS NAMES ITS VICTIM. One click between a player
      // and a destroyed legendary is not a bench, it is a trap, and the
      // confirm has to say WHICH piece or it protects nobody.
      actions.append(
        bigButton(`Destroy ${pickedName}`, `unmake:${picked.slot}`, () => {
          host.unmakeArmed = null;
          // The ribbon's receipt: what this breaking should pay, and
          // which slot must empty before it may celebrate.
          host.pendingBreak = {
            checks: [{ index: picked.slot, item: picked.item }],
            yields: result.yields,
            count: 1,
            at: Date.now(),
          };
          host.unmakeMarked.delete(picked.slot);
          host.onUnmake(picked.slot);
        }, { acta: 'Destroy' }),
        bigButton('Keep it', `unmake:cancel`, () => {
          host.unmakeArmed = null;
          renderCraft(host);
        }, { minor: true, acta: 'Cancel' }),
      );
    } else {
      actions.appendChild(
        bigButton('Unmake', `unmake:${picked.slot}`, () => {
          host.unmakeArmed = picked.slot;
          host.unmakeBatchArmed = false;
          renderCraft(host);
        }, { acta: 'Unmake' }),
      );
      const marked = host.unmakeMarked.get(picked.slot) === picked.item;
      actions.appendChild(
        bigButton(
          marked ? 'Unmark' : 'Mark for the batch',
          `markpick:${picked.slot}`,
          () => {
            if (marked) host.unmakeMarked.delete(picked.slot);
            else host.unmakeMarked.set(picked.slot, picked.item);
            host.unmakeBatchArmed = false;
            renderCraft(host);
          },
          { minor: true, acta: marked ? 'Unmark' : 'Mark' },
        ),
      );
    }
    host.craftDetail.appendChild(actions);
  }

  if (markedRows.length === 0) renderUnmakeBatch(host, markedRows, junkRows);
}

/**
 * THE MARKED BATCH — the bench's bulk lane. Marked pieces break as
 * ONE working (one send, one payout, one voice line, one moment of
 * light); the section reads the whole account out before the
 * two-press confirm. With nothing marked it offers the one clean
 * sweep: every plain piece with nothing bound in, marked in a single
 * press. Worked, deepened and rare-or-finer steel is never swept —
 * those are the player's own deliberate call, piece by piece.
 */
export function renderUnmakeBatch(host: StationPanels, 
  marked: Array<{ slot: number; item: string; roll?: ItemRoll }>,
  junk: Array<{ slot: number; item: string; roll?: ItemRoll }>,
): void {
  const unmarkedJunk = junk.filter((r) => host.unmakeMarked.get(r.slot) !== r.item);
  if (marked.length === 0 && unmarkedJunk.length < 2) return;

  host.craftDetail.appendChild(
    sectionHead(marked.length > 0 ? 'The marked batch' : 'One clean sweep'),
  );

  const markJunk = (): void => {
    for (const r of unmarkedJunk) host.unmakeMarked.set(r.slot, r.item);
    host.unmakeBatchArmed = false;
    renderCraft(host);
  };
  const junkButton = (): HTMLButtonElement => {
    const btn = bigButton(`Mark the junk (${unmarkedJunk.length})`, 'unmake:junk', markJunk, {
      minor: true,
      acta: 'Mark',
    });
    // The sweep deals a Break button in — land the hand on it.
    btn.dataset.navnext = 'key:unmake:batch';
    return btn;
  };

  if (marked.length === 0) {
    const note = document.createElement('div');
    note.className = 'work-result';
    const flavor = document.createElement('div');
    flavor.className = 'work-result-flavor';
    flavor.textContent = `${unmarkedJunk.length} plain pieces here carry nothing bound in. They could all go in one breaking.`;
    note.appendChild(flavor);
    host.craftDetail.appendChild(note);
    const acts = document.createElement('div');
    acts.className = 'work-actions batch-actions';
    acts.appendChild(junkButton());
    host.craftDetail.appendChild(acts);
    return;
  }

  // The whole account before the confirm: every yield, summed by the
  // same pure function the server pays from — figures that cannot lie.
  const yields: Array<{ item: string; qty: number }> = [];
  let xp = 0;
  for (const r of marked) {
    const out = unmakingOf(r.item, r.roll);
    if (!out) continue;
    xp += out.xp;
    for (const y of out.yields) {
      const line = yields.find((l) => l.item === y.item);
      if (line) line.qty += y.qty;
      else yields.push({ item: y.item, qty: y.qty });
    }
  }

  const names = marked.map((r) => instanceName(r.item, r.roll));
  const said =
    names.length <= 3
      ? names.join(', ')
      : `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;
  const note = document.createElement('div');
  note.className = 'work-result';
  const facts = document.createElement('div');
  facts.className = 'work-result-facts';
  facts.textContent = `${marked.length} ${marked.length === 1 ? 'piece' : 'pieces'} · +${xp} xp`;
  const flavor = document.createElement('div');
  flavor.className = 'work-result-flavor';
  flavor.textContent = `${said}. All of it goes in one breaking; what comes back comes back as one pile.`;
  note.append(facts, flavor);
  host.craftDetail.appendChild(note);
  for (const y of yields) host.craftDetail.appendChild(host.yieldRow(y.item, y.qty));

  const acts = document.createElement('div');
  acts.className = 'work-actions batch-actions';
  const word = marked.length === 1 ? 'piece' : 'pieces';
  if (host.unmakeBatchArmed) {
    // THE SECOND PRESS NAMES ITS VICTIMS — by count here; the names
    // stand written directly above, in the account.
    acts.append(
      bigButton(`Destroy ${marked.length} ${word}`, 'unmake:batch', () => {
        host.unmakeBatchArmed = false;
        host.pendingBreak = {
          checks: marked.map((r) => ({ index: r.slot, item: r.item })),
          yields,
          count: marked.length,
          at: Date.now(),
        };
        const slots = marked.map((r) => r.slot);
        host.unmakeMarked.clear();
        host.onUnmakeMany?.(slots);
      }, { acta: 'Destroy' }),
      bigButton('Keep them', 'unmake:batch:cancel', () => {
        host.unmakeBatchArmed = false;
        renderCraft(host);
      }, { minor: true, acta: 'Cancel' }),
    );
  } else {
    acts.appendChild(
      bigButton(`Break ${marked.length} ${word}`, 'unmake:batch', () => {
        host.unmakeBatchArmed = true;
        host.unmakeArmed = null;
        renderCraft(host);
      }, { acta: 'Break' }),
    );
    if (unmarkedJunk.length > 0) acts.appendChild(junkButton());
    acts.appendChild(
      bigButton('Clear marks', 'unmake:batch:clear', () => {
        host.unmakeMarked.clear();
        host.unmakeBatchArmed = false;
        renderCraft(host);
      }, { minor: true, acta: 'Clear' }),
    );
  }
  host.craftDetail.appendChild(acts);
}

export function renderCraft(host: StationPanels): void {
  if (host.showing?.kind !== 'craft') return;
  const showing = host.showing;
  const { station, skills, known } = showing;
  const face = (station && STATION_FACE[station]) || HANDIWORK_FACE;
  host.craftList.innerHTML = '';
  host.craftDetail.innerHTML = '';
  // THE UNMAKING lives only at the enchanting table, and the bench
  // remembers nothing between visits: a mode that persisted would
  // eventually greet somebody with a wall of their own gear and a
  // Break button, which is not what anyone opens a table for.
  const canUnmakeHere = station === 'enchanting_table';
  if (!canUnmakeHere) host.craftMode = 'make';
  if (canUnmakeHere) {
    host.modeBar();
    if (host.craftMode === 'unmake') {
      renderUnmake(host, skills);
      return;
    }
  }
  // The ledger lists only what this character KNOWS: core recipes
  // plus learned scrolls. What's undiscovered stays a rumor — a
  // count in the footer, never an endless list of futures.
  const all = recipesForStation(station);
  const recipes = all.filter((r) => r.unlock === 'core' || known.has(r.id));
  const undiscovered = all.length - recipes.length;
  const rumor = host.craftRumor(all, known);
  if (recipes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'make-empty';
    empty.textContent = rumor
      ? `You know no recipes for this station yet. ${rumor}`
      : 'Nothing can be made here yet.';
    host.craftList.appendChild(empty);
    return;
  }
  if (!showing.sel || !recipes.some((r) => r.id === showing.sel)) {
    // First choice: the first recipe you can actually make right
    // now; failing that, the first you have the level for.
    const canDo = recipes.find(
      (r) => levelForXp(skills[r.skill] ?? 0) >= r.levelReq && host.makeable(r) > 0,
    );
    const unlocked = recipes.find((r) => levelForXp(skills[r.skill] ?? 0) >= r.levelReq);
    showing.sel = (canDo ?? unlocked ?? recipes[0]!).id;
  }

  // The ledger's order is the player's to choose.
  host.sortBar(
    host.craftTools,
    'craft',
    [
      ['reach', 'In reach'],
      ['level', 'By level'],
      ['az', 'A-Z'],
    ],
    host.craftSort,
    (k) => {
      host.craftSort = k;
      renderCraft(host);
    },
    { keep: station === 'enchanting_table' },
  );
  const reachScore = (r: RecipeDef): number => {
    const unlocked = levelForXp(skills[r.skill] ?? 0) >= r.levelReq;
    return (unlocked ? 2 : 0) + (unlocked && host.makeable(r) > 0 ? 1 : 0);
  };
  const rows = [...recipes];
  if (host.craftSort === 'az') rows.sort((a, b) => a.name.localeCompare(b.name));
  else if (host.craftSort === 'level')
    rows.sort((a, b) => a.levelReq - b.levelReq || a.name.localeCompare(b.name));
  else rows.sort((a, b) => reachScore(b) - reachScore(a));

  const dealt: HTMLElement[] = rows.map((recipe) => {
    const level = levelForXp(skills[recipe.skill] ?? 0);
    const locked = level < recipe.levelReq;
    const count = host.makeable(recipe);
    return ledgerRow(host, {
      key: `recipe:${recipe.id}`,
      // THE HAND LANDS ON THE BATCH: choosing a makeable recipe puts
      // the cursor straight on its biggest make button, so the whole
      // craft is two presses — pick, confirm. Locked or short rows
      // (and a bench already at work, which shows Stop instead) still
      // land on the detail pane's first stop.
      next:
        locked || count === 0 || host.getAction()?.recipe
          ? '#craft-detail'
          : `key:craft:${recipe.id}:${count > 1 ? 'all' : 1}`,
      iconUrl: (img) => queueItemIcon(img, recipe.output.item, 40),
      name: recipe.name,
      note: locked ? `lvl ${recipe.levelReq}` : count > 0 ? `× ${count}` : 'short',
      noteTone: locked ? 'lock' : count > 0 ? 'ok' : 'short',
      selected: showing.sel === recipe.id,
      onPick: () => {
        showing.sel = recipe.id;
        renderCraft(host);
      },
    });
  });
  // The rumor line: how much this station still keeps from you.
  if (undiscovered > 0 && rumor) {
    const hint = document.createElement('div');
    hint.className = 'make-undiscovered';
    hint.textContent = rumor;
    dealt.push(hint);
  }
  host.dealIntoLedger(host.craftList, `craft:${station ?? 'handiwork'}`, dealt, 8);

  // ---- the chosen work, laid out large
  const recipe = recipes.find((r) => r.id === showing.sel)!;
  const level = levelForXp(skills[recipe.skill] ?? 0);
  const locked = level < recipe.levelReq;
  const count = host.makeable(recipe);
  const outIsInscription = itemDef(recipe.output.item)?.enchant !== undefined;

  const head = document.createElement('div');
  head.className = 'work-head';
  const tile = iconTile(itemIconUrl(recipe.output.item, 64));
  if (recipe.output.qty > 1) {
    const q = document.createElement('span');
    q.className = 'out-qty';
    q.textContent = `×${recipe.output.qty}`;
    tile.appendChild(q);
  }
  head.appendChild(tile);
  const titles = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'work-name';
  name.textContent = recipe.name;
  const sub = document.createElement('div');
  sub.className = 'work-sub';
  sub.textContent = `${recipe.skill} · level ${recipe.levelReq} · +${recipe.xp} xp each`;
  titles.append(name, sub);
  head.appendChild(titles);
  host.craftDetail.appendChild(head);

  const facts = document.createElement('div');
  facts.className = 'work-facts';
  const fact = (value: string, label: string, tone?: string): void => {
    const f = document.createElement('div');
    f.className = 'work-fact';
    const v = document.createElement('strong');
    v.textContent = value;
    if (tone) v.style.color = tone;
    const l = document.createElement('span');
    l.textContent = label;
    f.append(v, l);
    facts.appendChild(f);
  };
  fact(locked ? '·' : `× ${count}`, 'you can make', locked ? undefined : count > 0 ? 'var(--green)' : 'var(--red-soft)');
  fact(`${level}`, `your ${recipe.skill}`, locked ? 'var(--red-soft)' : undefined);
  if (recipe.output.qty > 1) fact(`× ${recipe.output.qty}`, 'per make');
  // THE ENCHANTER'S HAND: an inscription carries the mark of the hand
  // that made it, so the bench says what YOUR hand will make before
  // you spend the reagents. Shown without the Calling bonus, which
  // the panel cannot see — so the figure is a floor, never a promise
  // the craft then fails to keep.
  if (!locked && outIsInscription) {
    const q = inscriptionQuality(level, recipe.levelReq);
    fact(`${q}%`, `a ${qualityWord(q)} inscription`, q >= 105 ? 'var(--green)' : undefined);
  }
  host.craftDetail.appendChild(facts);

  host.craftDetail.appendChild(sectionHead('Materials'));
  for (const input of recipe.inputs) {
    host.craftDetail.appendChild(host.materialRow(input.item, input.qty));
  }

  // The result's own story — what you're actually making and why.
  const outDef = itemDef(recipe.output.item);
  if (outDef) {
    const facts: string[] = [];
    if (outDef.heals) facts.push(`Heals ${outDef.heals} HP`);
    if (outDef.weapon) facts.push(`${outDef.weapon.damage} damage`);
    if (outDef.armor) facts.push(`+${outDef.armor} armor`);
    if (outDef.value) facts.push(`worth ${outDef.value.toLocaleString()}c each`);
    if (facts.length > 0 || outDef.desc) {
      host.craftDetail.appendChild(sectionHead('The result'));
      const result = document.createElement('div');
      result.className = 'work-result';
      if (facts.length > 0) {
        const line = document.createElement('div');
        line.className = 'work-result-facts';
        line.textContent = facts.join(' · ');
        result.appendChild(line);
      }
      if (outDef.desc) {
        const flavor = document.createElement('div');
        flavor.className = 'work-result-flavor';
        flavor.textContent = outDef.desc;
        result.appendChild(flavor);
      }
      host.craftDetail.appendChild(result);
    }
  }

  const actions = document.createElement('div');
  actions.className = 'work-actions';
  const running = host.getAction();
  if (running?.recipe) {
    // THE HANDS ARE BUSY. A running batch owns the bench: show its
    // live tally and one Stop — never a second Make button that
    // would silently swallow the rest of the batch.
    const busy = document.createElement('span');
    busy.className = 'work-busy';
    const busyName = RECIPES.get(running.recipe)?.name ?? running.recipe;
    const total = running.total ?? 1;
    const at = Math.min((running.made ?? 0) + 1, total);
    busy.textContent =
      total > 1 ? `At work: ${busyName}, ${at} of ${total}` : `At work: ${busyName}`;
    actions.appendChild(busy);
    actions.appendChild(
      bigButton('Stop', 'craft:stop', () => host.onCraftStop?.(), { acta: 'Stop' }),
    );
  } else if (locked) {
    const lockNote = document.createElement('span');
    lockNote.className = 'lock-note';
    lockNote.textContent = `Reach ${recipe.skill} ${recipe.levelReq} to ${face.verb.toLowerCase()} this`;
    actions.appendChild(lockNote);
  } else {
    // MAKE, THEN WATCH: the buttons hand the moment to the world —
    // the panel closes and the work card takes over. "All" means
    // all the pack can cover, not a fixed number.
    const most = Math.min(count, 1000);
    const quantities = [1];
    if (most > 5) quantities.push(5);
    if (most > 1) quantities.push(most);
    for (const qty of quantities) {
      const label =
        qty === 1 ? `${face.verb} 1` : qty === most ? `${face.verb} all` : `× ${qty}`;
      const btn = bigButton(
        label,
        `craft:${recipe.id}:${qty === most && qty !== 1 ? 'all' : qty}`,
        () => {
          host.onCraft(recipe.id, qty);
          host.closeAll();
        },
        {
          acta: face.verb,
          minor: qty !== 1,
        },
      );
      if (count === 0) btn.disabled = true;
      actions.appendChild(btn);
    }
  }
  host.craftDetail.appendChild(actions);
}

/** One vault socket — goods pile or rolled armory piece. */
export function vaultCell(host: StationPanels, opts: {
  navkey: string;
  acta: string;
  item: string;
  qty?: number;
  roll?: ItemRoll;
  selected?: boolean;
  onPick: () => void;
  /** Where the pad cursor goes once this socket is chosen. */
  next?: string;
}): HTMLElement {
  const cell = document.createElement('div');
  cell.className =
    'inv-slot vault-slot clickable' + (opts.roll ? ` rarity-${opts.roll.rar}` : '');
  if (opts.selected) cell.classList.add('selected');
  cell.dataset.nav = '';
  cell.dataset.navkey = opts.navkey;
  cell.dataset.acta = opts.acta;
  if (opts.next !== undefined) cell.dataset.navnext = opts.next;
  cell.dataset.tipname = opts.roll
    ? instanceName(opts.item, opts.roll)
    : (itemDef(opts.item)?.name ?? opts.item);
  cell.dataset.lootitem = opts.item;
  cell.dataset.lootqty = String(opts.qty ?? 1);
  if (opts.roll) cell.dataset.lootroll = JSON.stringify(opts.roll);
  const img = document.createElement('img');
  img.className = 'inv-item';
  // A full vault is a first-open burst — the sockets fill through
  // the budgeted lane (cached piles still land synchronously).
  queueItemIcon(img, opts.item, 48);
  img.draggable = false;
  cell.appendChild(img);
  if (opts.qty !== undefined && opts.qty > 1) {
    const q = document.createElement('span');
    q.className = 'inv-qty';
    q.textContent = opts.qty > 9999 ? `${Math.floor(opts.qty / 1000)}k` : opts.qty.toLocaleString();
    cell.appendChild(q);
  }
  // THE GATE ON THE SLOT, vault edition: a stored piece the body
  // cannot yet wear is barred in ember with its level seal — the
  // armory reads honestly before a single withdrawal.
  if (itemDef(opts.item)?.equipSlot) {
    const req = effectiveReq(opts.item, opts.roll);
    if (req && levelForXp(host.getSkills()[req.skill] ?? 0) < req.level) {
      cell.classList.add('req-locked');
      const seal = document.createElement('span');
      seal.className = 'req-seal';
      seal.textContent = String(req.level);
      cell.appendChild(seal);
    }
    // THE PACK KNOWS THE HOUSE, vault edition (visible-buildcraft
    // V4): a stored piece whose family the body wears, where
    // wearing it would raise the count, carries the same gold pip
    // as the pack — the armory tells what advances the build.
    const vDef = itemDef(opts.item);
    const set = vDef?.gear?.set;
    if (set && vDef?.equipSlot) {
      const equipment = host.getEquipment();
      const counts = aggregateGearStats(
        equipment as Parameters<typeof aggregateGearStats>[0],
      ).setCounts;
      const count = counts[set] ?? 0;
      const worn = equipment[vDef.equipSlot];
      const wornSet = worn ? itemDef(worn.id)?.gear?.set : undefined;
      if (count >= 1 && count < 5 && wornSet !== set) {
        cell.classList.add('house-callin');
        const pip = document.createElement('span');
        pip.className = 'house-pip';
        pip.textContent = '◆';
        cell.appendChild(pip);
      }
    }
  }
  cell.addEventListener('click', opts.onPick);
  return cell;
}

/**
 * The Vault (Grand Refit Ph5): stored goods dealt onto paged
 * LEAVES of sockets — family tabs shelve them, the armory hangs on
 * its own tab when rolled gear exists, and nothing hides behind a
 * scrollbar. Pick a pile and the counter beneath offers Take 1/5/
 * All. Hover or focus any socket for the full item card.
 */
export function renderBank(host: StationPanels): void {
  host.bankList.innerHTML = '';
  host.bankArmory.innerHTML = '';
  host.bankDetail.innerHTML = '';
  host.bankTools.innerHTML = '';
  host.bankArmory.classList.add('hidden');
  if (host.bankSel && !host.lastBank[host.bankSel]) host.bankSel = null;
  if (host.bankTab === 'armory' && host.lastBankGear.length === 0) host.bankTab = 'all';

  const entries = orderVault(Object.entries(host.lastBank), host.bankSort);

  if (entries.length === 0 && host.lastBankGear.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'make-empty';
    empty.textContent = 'Your vault is empty. Deposit from the pack beside you.';
    host.bankList.appendChild(empty);
    host.bankDetail.classList.add('hidden');
    return;
  }

  // ---- the shelving tabs: families, armory last when it hangs.
  const tabs: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'gear', label: 'Gear' },
    { id: 'food', label: 'Food' },
    { id: 'mats', label: 'Mats' },
  ];
  if (host.lastBankGear.length > 0) tabs.push({ id: 'armory', label: 'Armory' });
  const rail = tabRail(
    tabs,
    (id) => {
      host.bankTab = id as typeof host.bankTab;
      host.leafAt['bank'] = 0;
      renderBank(host);
    },
    'banktab',
  );
  rail.setActive(host.bankTab);
  host.bankTools.appendChild(rail.root);
  if (host.bankTab !== 'armory' && entries.length > 1) {
    host.sortBar(
      host.bankTools,
      'bank',
      [...VAULT_SORTS],
      host.bankSort,
      (k) => {
        host.bankSort = k;
        localStorage.setItem('arx.vaultsort', k);
        renderBank(host);
      },
      // The family tabs already stand in this strip — keep them.
      { keep: true },
    );
  }

  // THE LEDGER LINE: the whole holding said once, plainly — what the
  // vault keeps and what it would fetch, before any tab narrows it.
  {
    const goods = entries.reduce((n, [, q]) => n + q, 0);
    const worth =
      entries.reduce((n, [item, q]) => n + pileWorth(item, q), 0) +
      host.lastBankGear.reduce((n, g) => n + pileWorth(g.item, 1), 0);
    const parts = [
      `${entries.length.toLocaleString()} kinds`,
      `${goods.toLocaleString()} goods`,
    ];
    if (host.lastBankGear.length > 0) {
      parts.push(
        `${host.lastBankGear.length} armory piece${host.lastBankGear.length === 1 ? '' : 's'}`,
      );
    }
    parts.push(`worth ${worth.toLocaleString()} coins`);
    const sum = document.createElement('div');
    sum.className = 'bank-sum';
    sum.textContent = parts.join(' · ');
    host.bankTools.appendChild(sum);
  }

  // ---- the wall, dealt onto leaves: rows of eight sockets.
  const PER_ROW = 8;
  const cells: HTMLElement[] =
    host.bankTab === 'armory'
      ? host.lastBankGear.map((g) =>
          vaultCell(host, {
            navkey: `bankgear:${g.id}`,
            acta: 'Take',
            item: g.item,
            roll: g.roll,
            onPick: () => host.onBank('withdraw', g.item, 1, g.id),
          }),
        )
      : entries
          .filter(([item]) => host.bankTab === 'all' || host.familyOf(item) === host.bankTab)
          .map(([item, qty]) =>
            vaultCell(host, {
              navkey: `bank:${item}`,
              acta: 'Choose',
              next: '#bank-detail',
              item,
              qty,
              selected: host.bankSel === item,
              onPick: () => {
                host.bankSel = item;
                renderBank(host);
              },
            }),
          );
  const rows: HTMLElement[] = [];
  for (let i = 0; i < cells.length; i += PER_ROW) {
    const row = document.createElement('div');
    row.className = 'vault-row';
    row.append(...cells.slice(i, i + PER_ROW));
    rows.push(row);
  }
  host.dealIntoLedger(
    host.bankList,
    'bank',
    rows,
    4,
    host.bankTab === 'armory' ? undefined : 'Nothing shelved here yet.',
  );

  // ---- the counter: the chosen pile's take actions.
  if (host.bankSel) {
    const item = host.bankSel;
    const qty = host.lastBank[item]!;
    const def = itemDef(item);
    host.bankDetail.classList.remove('hidden');
    const face = document.createElement('div');
    face.className = 'counter-face';
    const img = document.createElement('img');
    img.src = itemIconUrl(item, 44);
    img.draggable = false;
    const names = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'counter-name';
    name.textContent = def?.name ?? item;
    const sub = document.createElement('div');
    sub.className = 'counter-sub';
    // The counter tells the pile's worth beside its count — the same
    // honesty as the ledger line above the wall.
    const worth = pileWorth(item, qty);
    sub.textContent =
      worth > 0
        ? `${qty.toLocaleString()} stored · worth ${worth.toLocaleString()} coins`
        : `${qty.toLocaleString()} stored`;
    names.append(name, sub);
    face.append(img, names);
    host.bankDetail.appendChild(face);
    const actions = document.createElement('div');
    actions.className = 'counter-actions';
    for (const [label, n] of [
      ['Take 1', 1],
      ['Take 5', 5],
      ['Take all', qty],
    ] as const) {
      actions.appendChild(
        bigButton(label, `bank:${item}:${label}`, () => host.onBank('withdraw', item, n), {
          acta: 'Withdraw',
          minor: label !== 'Take 1',
        }),
      );
    }
    host.bankDetail.appendChild(actions);
  } else {
    host.bankDetail.classList.add('hidden');
  }
}
