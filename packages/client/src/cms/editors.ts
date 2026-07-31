import { DEFAULT_LOOK, RARITY_TIERS, STATUS_IDS, type Look, type RarityTier } from '@arx/shared';
import {
  ABILITIES,
  DANGER_LAWS,
  FACTION_BAND_ORDER,
  RECIPES,
  SHOPS,
  actorCombatDef,
  expectedYield,
  prefabFromJson,
  zoneFromJson,
  type FactionBand,
  type FactionDef,
  type FactionsDef,
  type FrontierDef,
  type LootEntryDef,
  type LootTableDef,
  type NpcActorCombatStats,
  type NpcActorDef,
  type NpcDef,
  type PoiDef,
  type PoiGarrisonEntry,
} from '@arx/content';
import { itemIconUrl } from '../render/icons.js';
import { iconImg } from '../editor/editorIcons.js';
import { markDirty, persistence, setSection, state, toast, zoneAt } from './cms.js';
import { dialogueDetail } from './dialogueEditor.js';
import { voiceDetail } from './voiceEditor.js';
import { creatureRender } from './gameRender.js';
import { lookDesigner } from './lookDesigner.js';
import { actorBust, actorFigure } from './portraits.js';
import { entryShare, simulate, type SimAggregate } from './simulate.js';
import { fetchPrefab, stagePoi, surveyFrontier } from './api.js';
import {
  drawPreviewPins,
  prefabLayers,
  renderLayersPreview,
  type PreviewLayers,
} from '../editor/preview.js';
import {
  bar,
  bigSlider,
  combobox,
  distribution,
  el,
  featureChip,
  pill,
  rangePair,
  statSlider,
  statusChips,
  type ComboOption,
} from './widgets.js';

/**
 * The Content Studio editors, rebuilt as a designer's bench: portrait
 * heroes, sliders that show where a number sits in the whole
 * registry, feature chips instead of JSON, searchable icon pickers
 * instead of thousand-row selects, and a loot laboratory that rolls
 * the real roller so drop design is something you WATCH, not compute.
 */

// ------------------------------------------------------ option pools

function itemOptions(slot?: string | null): ComboOption[] {
  return state.items
    .filter((i) => !slot || i.slot === slot)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((i) => ({ id: i.id, label: i.name, sub: i.id, icon: itemIconUrl(i.id, 22) }));
}

function tableOptions(excludeId?: string): ComboOption[] {
  return state.loot
    .filter((t) => t.def.id !== excludeId)
    .map((t) => ({
      id: t.def.id,
      label: t.def.id,
      sub: `${t.def.entries.length} entries`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function npcOptions(): ComboOption[] {
  return state.npcs
    .slice()
    .sort((a, b) => a.def.level - b.def.level)
    .map((n) => ({ id: n.def.id, label: n.def.name, sub: `lv ${n.def.level}` }));
}

function abilityOptions(): ComboOption[] {
  return [...ABILITIES.values()].map((a) => ({ id: a.id, label: a.name ?? a.id, sub: a.id }));
}

// ------------------------------------------------------ shared frame

function detailHead(
  portrait: HTMLElement | null,
  title: string,
  sub: string,
  pills: HTMLElement[],
  edited: boolean,
  authored: boolean,
  onSave: () => void,
  onRevert: () => void,
): HTMLElement {
  const head = el('div', 'hero');
  if (portrait) {
    const frame = el('div', 'hero-portrait');
    frame.appendChild(portrait);
    head.appendChild(frame);
  }
  const mid = el('div', 'hero-mid');
  const nameRow = el('div', 'hero-name');
  nameRow.appendChild(el('h1', '', title));
  nameRow.appendChild(el('span', 'sub', sub));
  mid.appendChild(nameRow);
  const pillRow = el('div', 'hero-pills');
  for (const p of pills) pillRow.appendChild(p);
  mid.appendChild(pillRow);
  mid.appendChild(originNote(edited, authored));
  head.appendChild(mid);
  const actions = el('div', 'hero-actions');
  const revert = el('button', 'danger', authored ? 'Revert to shipped' : 'Delete') as HTMLButtonElement;
  revert.title = authored
    ? 'Discard database edits; the definition shipped in code returns'
    : 'Remove this tool-created entry entirely';
  revert.disabled = authored && !edited;
  revert.onclick = () => {
    if (window.confirm(`${revert.textContent} '${title}'?`)) onRevert();
  };
  const save = el('button', 'primary', 'Save ▸ Live') as HTMLButtonElement;
  save.title = 'Validate, store in the database, and hot-swap the running world (⌘S)';
  save.onclick = onSave;
  actions.append(revert, save);
  head.appendChild(actions);
  return head;
}

function originNote(edited: boolean, authored: boolean): HTMLElement {
  const p = el('p', 'origin-note');
  p.innerHTML = !authored
    ? 'Created in the studio — <b>tool-owned</b>, no shipped twin.'
    : edited
      ? '<b>Edited</b> — the database version overrides the shipped definition.'
      : 'Matches the shipped definition — edits become database truth and survive reboots.';
  return p;
}

function sect(title: string, subtitle: string, ...children: HTMLElement[]): HTMLElement {
  const box = el('div', 'fsect');
  const h = el('h3', '', title);
  box.appendChild(h);
  if (subtitle) box.appendChild(el('p', 'sect-sub', subtitle));
  for (const c of children) box.appendChild(c);
  return box;
}

function linkHead(root: HTMLElement, icon: string, text: string, count?: number): void {
  const head = el('div', 'panel-head');
  head.appendChild(iconImg(icon, 15));
  head.append(` ${text}`);
  if (count !== undefined) head.appendChild(el('span', 'count', String(count)));
  root.appendChild(head);
}

function linkRow(
  root: HTMLElement,
  label: string,
  meta: string,
  onOpen: (() => void) | null,
  ico?: HTMLElement,
): void {
  const row = document.createElement(onOpen ? 'button' : 'div');
  row.className = 'link-row';
  if (ico) row.appendChild(ico);
  row.appendChild(el('b', '', label));
  row.appendChild(el('span', '', meta));
  if (onOpen) (row as HTMLButtonElement).onclick = onOpen;
  root.appendChild(row);
}

function emptyLink(root: HTMLElement, text: string): void {
  root.appendChild(el('p', 'muted empty', text));
}

function textIn(value: string, onInput: (v: string) => void, placeholder = ''): HTMLInputElement {
  const input = document.createElement('input');
  input.value = value;
  input.placeholder = placeholder;
  input.oninput = () => {
    onInput(input.value);
    markDirty();
  };
  return input;
}

function numIn(value: number, onInput: (v: number) => void, step = 1): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.step = String(step);
  input.value = String(value);
  input.oninput = () => {
    onInput(Number(input.value) || 0);
    markDirty();
  };
  return input;
}

// --------------------------------------------------- sim result grid

function simGrid(agg: SimAggregate): HTMLElement {
  const wrap = el('div');
  const summary = el('div', 'hero-pills');
  summary.appendChild(
    pill(`${agg.rolls} rolls @ lv ${agg.level}`, 'observed by running the real roller', 'ink'),
  );
  summary.appendChild(pill(`≈${agg.evCoins.toFixed(1)} coins/roll`, 'catalog value of the average roll', 'brass'));
  if (agg.emptyRolls > 0) {
    summary.appendChild(
      pill(`${Math.round((agg.emptyRolls / agg.rolls) * 100)}% empty`, 'rolls that paid nothing', 'ink'),
    );
  }
  wrap.appendChild(summary);
  const grid = el('div', 'sim-grid');
  const rows = [...agg.items.entries()].sort((a, b) => b[1].hits - a[1].hits);
  for (const [itemId, rec] of rows) {
    const cell = el('div', 'sim-cell');
    const img = document.createElement('img');
    img.src = itemIconUrl(itemId, 34);
    img.width = 34;
    img.height = 34;
    cell.appendChild(img);
    const name = state.items.find((i) => i.id === itemId)?.name ?? itemId;
    const txt = el('span', 'sim-txt');
    txt.appendChild(el('b', '', name));
    txt.appendChild(
      el(
        'span',
        '',
        `${Math.round((rec.hits / agg.rolls) * 100)}% · ×${(rec.qty / Math.max(1, rec.hits)).toFixed(1)}`,
      ),
    );
    cell.appendChild(txt);
    cell.title = `${name}: dropped in ${rec.hits}/${agg.rolls} rolls, avg qty ${(rec.qty / Math.max(1, rec.hits)).toFixed(2)}`;
    grid.appendChild(cell);
  }
  if (rows.length === 0) wrap.appendChild(el('p', 'muted empty', 'Nothing dropped.'));
  else wrap.appendChild(grid);
  return wrap;
}

// ----------------------------------------------------------- bestiary

export function newNpcDef(id: string): NpcDef {
  return {
    id,
    name: id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    level: 1,
    maxHp: 10,
    damage: 1,
    attackRange: 1,
    attackCooldownTicks: 40,
    aggroRange: 0,
    leashRange: 12,
    speed: 1.6,
    xpReward: 8,
    respawnSec: 60,
    color: '#8a8a95',
    radius: 0.35,
    loot: [],
  };
}

function derivedPills(d: NpcDef): HTMLElement[] {
  const dps = d.damage > 0 ? d.damage / (d.attackCooldownTicks / 20) : 0;
  const pills: HTMLElement[] = [
    pill(`lv ${d.level}`, 'displayed combat level', 'brass'),
    pill(
      d.damage === 0 ? 'harmless' : `${dps.toFixed(1)} dps`,
      'damage ÷ cooldown — sustained output',
      d.damage === 0 ? 'ink' : 'danger',
    ),
    pill(
      d.aggroRange <= 0 ? 'passive' : d.aggroRange >= 8 ? 'bloodthirsty' : 'territorial',
      d.aggroRange <= 0
        ? 'never starts a fight'
        : `attacks on sight within ${d.aggroRange} tiles`,
      'ink',
    ),
  ];
  if (d.ranged) pills.push(pill(`ranged ${d.ranged.range}t`, 'shoots projectiles', 'ink'));
  if (d.pack) pills.push(pill(`pack: ${d.pack}`, 'shares aggro with its pack', 'ink'));
  if (d.craven) pills.push(pill('craven', 'badly hurt, may run to fetch a packmate', 'ink'));
  if (d.special) pills.push(pill(d.special.ability, 'special ability', 'brass'));
  pills.push(
    pill(
      d.speed >= 4.4 ? 'outruns you' : d.speed >= 3.4 ? 'keeps pace' : 'lumbering',
      `${d.speed} tiles/s vs the player's ~4.2 sprint`,
      d.speed >= 4.4 ? 'danger' : 'ink',
    ),
  );
  return pills;
}

function npcDetail(body: HTMLElement, linkage: HTMLElement, id: string): void {
  const entry = state.npcs.find((n) => n.def.id === id);
  if (!entry) return;
  const draft: NpcDef = JSON.parse(JSON.stringify(entry.def)) as NpcDef;

  const save = (): void => {
    void persistence.saveNpcDef(draft).catch((err: Error) => toast(err.message, 5200, 'error'));
  };
  const rebuild = (): void => {
    body.innerHTML = '';
    linkage.innerHTML = '';
    build();
  };

  const dist = {
    hp: distribution(state.npcs.map((n) => n.def.maxHp)),
    dmg: distribution(state.npcs.map((n) => n.def.damage)),
    speed: distribution(state.npcs.map((n) => n.def.speed)),
    xp: distribution(state.npcs.map((n) => n.def.xpReward)),
  };

  const build = (): void => {
    body.appendChild(
      detailHead(
        creatureRender(draft, 132),
        draft.name,
        draft.id,
        derivedPills(draft),
        entry.edited,
        entry.authored,
        save,
        () => void persistence.revertNpcDef(id).catch((err: Error) => toast(err.message, 4600, 'error')),
      ),
    );

    // Identity strip.
    const idRow = el('div', 'fgrid');
    const nameField = el('label', 'ffield');
    nameField.appendChild(el('span', '', 'name'));
    nameField.appendChild(textIn(draft.name, (v) => (draft.name = v)));
    const colorField = el('label', 'ffield');
    colorField.appendChild(el('span', '', 'crest color'));
    const colorIn = document.createElement('input');
    colorIn.type = 'color';
    colorIn.value = draft.color;
    colorIn.style.height = '30px';
    colorIn.onchange = () => {
      draft.color = colorIn.value;
      markDirty();
      rebuild();
    };
    colorField.appendChild(colorIn);
    idRow.append(nameField, colorField);
    body.appendChild(sect('Identity', '', idRow));

    // Combat tuning — sliders with registry context.
    const combat = el('div', 'slider-grid');
    combat.append(
      statSlider({ label: 'level', value: draft.level, min: 1, max: 99, onInput: (v) => { draft.level = v; markDirty(); } }),
      statSlider({ label: 'max hp', value: draft.maxHp, min: 1, max: 400, dist: dist.hp, onInput: (v) => { draft.maxHp = v; markDirty(); } }),
      statSlider({ label: 'damage', value: draft.damage, min: 0, max: 40, dist: dist.dmg, note: '0 = never attacks', onInput: (v) => { draft.damage = v; markDirty(); } }),
      statSlider({ label: 'attack cooldown', value: draft.attackCooldownTicks, min: 10, max: 120, unit: 'ticks', note: '20 ticks = 1s', onInput: (v) => { draft.attackCooldownTicks = v; markDirty(); } }),
      statSlider({ label: 'attack range', value: draft.attackRange, min: 0.5, max: 8, step: 0.1, unit: 'tiles', onInput: (v) => { draft.attackRange = v; markDirty(); } }),
      statSlider({ label: 'speed', value: draft.speed, min: 0.5, max: 6, step: 0.1, unit: 'tiles/s', dist: dist.speed, onInput: (v) => { draft.speed = v; markDirty(); } }),
      statSlider({ label: 'aggro range', value: draft.aggroRange, min: 0, max: 16, unit: 'tiles', note: '0 = passive until struck', onInput: (v) => { draft.aggroRange = v; markDirty(); } }),
      statSlider({ label: 'sight arc', value: draft.sightArc ?? 140, min: 30, max: 360, step: 10, unit: '°', note: '360 = watches all round', onInput: (v) => { draft.sightArc = v; markDirty(); } }),
      statSlider({ label: 'leash range', value: draft.leashRange, min: 4, max: 40, unit: 'tiles', note: 'gives up this far from home', onInput: (v) => { draft.leashRange = v; markDirty(); } }),
      statSlider({ label: 'xp reward', value: draft.xpReward, min: 0, max: 2000, dist: dist.xp, onInput: (v) => { draft.xpReward = v; markDirty(); } }),
      statSlider({ label: 'respawn', value: draft.respawnSec, min: 5, max: 600, unit: 'sec', onInput: (v) => { draft.respawnSec = v; markDirty(); } }),
      statSlider({ label: 'body radius', value: draft.radius, min: 0.1, max: 1, step: 0.05, unit: 'tiles', note: 'collision circle', onInput: (v) => { draft.radius = v; markDirty(); } }),
    );
    body.appendChild(
      sect('Combat tuning', 'The gold tick on each track is the bestiary median — where this creature sits among all 27.', combat),
    );

    // Peer comparison.
    const peers = state.npcs
      .filter((n) => n.def.id !== draft.id)
      .sort((a, b) => Math.abs(a.def.level - draft.level) - Math.abs(b.def.level - draft.level))
      .slice(0, 3);
    const peerBox = el('div');
    const maxHp = Math.max(draft.maxHp, ...peers.map((p) => p.def.maxHp));
    const maxDmg = Math.max(1, draft.damage, ...peers.map((p) => p.def.damage));
    peerBox.appendChild(bar(`${draft.name} hp`, draft.maxHp, maxHp, 'var(--brass)'));
    for (const p of peers) peerBox.appendChild(bar(`${p.def.name} (lv ${p.def.level}) hp`, p.def.maxHp, maxHp, '#5a5370'));
    peerBox.appendChild(el('div', 'peer-gap'));
    peerBox.appendChild(bar(`${draft.name} dmg`, draft.damage, maxDmg, 'var(--danger)'));
    for (const p of peers) peerBox.appendChild(bar(`${p.def.name} dmg`, p.def.damage, maxDmg, '#5a5370'));
    body.appendChild(sect('Against its level peers', 'The three nearest-level creatures in the bestiary.', peerBox));

    // Nature — chips and structured builders, no JSON in sight.
    const nature = el('div', 'nature-box');
    const chipRow = el('div', 'chip-row');
    chipRow.appendChild(
      featureChip('pounce', !!draft.pounce, 'Leaps at its target to close distance', (on) => {
        if (on) draft.pounce = true;
        else delete draft.pounce;
        markDirty();
      }),
    );
    chipRow.appendChild(
      featureChip('ranged', !!draft.ranged, 'Attacks with projectiles from a distance', (on) => {
        if (on) draft.ranged = { range: 5, projectileSpeed: 9 };
        else delete draft.ranged;
        markDirty();
        rebuild();
      }),
    );
    chipRow.appendChild(
      featureChip('special ability', !!draft.special, 'Casts a technique on a cadence', (on) => {
        if (on) draft.special = { ability: abilityOptions()[0]?.id ?? '', everyTicks: 150 };
        else delete draft.special;
        markDirty();
        rebuild();
      }),
    );
    chipRow.appendChild(
      featureChip('splits on death', !!draft.splitInto, 'Bursts into smaller creatures when killed', (on) => {
        if (on) draft.splitInto = { npc: state.npcs[0]?.def.id ?? '', count: 2 };
        else delete draft.splitInto;
        markDirty();
        rebuild();
      }),
    );
    chipRow.appendChild(
      featureChip('strikes inflict', !!draft.attackStatus, 'Weapon hits apply a status effect', (on) => {
        if (on) draft.attackStatus = { status: 'bleed', power: 1, durationTicks: 60 };
        else delete draft.attackStatus;
        markDirty();
        rebuild();
      }),
    );
    chipRow.appendChild(
      featureChip('pack', !!draft.pack, 'Shares aggro with packmates; a struck one rallies the rest', (on) => {
        if (on) draft.pack = draft.id;
        else delete draft.pack;
        markDirty();
        rebuild();
      }),
    );
    chipRow.appendChild(
      featureChip('craven', !!draft.craven, 'Badly hurt, may break off and run to fetch a resting packmate (needs a pack tag)', (on) => {
        if (on) draft.craven = true;
        else delete draft.craven;
        markDirty();
      }),
    );
    nature.appendChild(chipRow);

    const subForms = el('div', 'sub-forms');
    if (draft.ranged) {
      const f = el('div', 'sub-form');
      f.appendChild(el('b', '', 'Ranged'));
      f.appendChild(el('span', 'note', 'range (tiles)'));
      f.appendChild(numIn(draft.ranged.range, (v) => (draft.ranged!.range = v), 0.5));
      f.appendChild(el('span', 'note', 'projectile speed'));
      f.appendChild(numIn(draft.ranged.projectileSpeed, (v) => (draft.ranged!.projectileSpeed = v), 0.5));
      subForms.appendChild(f);
    }
    if (draft.special) {
      const f = el('div', 'sub-form');
      f.appendChild(el('b', '', 'Special'));
      f.appendChild(combobox(abilityOptions, draft.special.ability, (v) => {
        draft.special!.ability = v;
        markDirty();
      }));
      f.appendChild(el('span', 'note', 'every N ticks'));
      f.appendChild(numIn(draft.special.everyTicks, (v) => (draft.special!.everyTicks = v)));
      subForms.appendChild(f);
    }
    if (draft.splitInto) {
      const f = el('div', 'sub-form');
      f.appendChild(el('b', '', 'Splits into'));
      f.appendChild(combobox(npcOptions, draft.splitInto.npc, (v) => {
        draft.splitInto!.npc = v;
        markDirty();
      }));
      f.appendChild(el('span', 'note', 'count'));
      f.appendChild(numIn(draft.splitInto.count, (v) => (draft.splitInto!.count = v)));
      subForms.appendChild(f);
    }
    if (draft.attackStatus) {
      const f = el('div', 'sub-form');
      f.appendChild(el('b', '', 'Strikes inflict'));
      const sel = document.createElement('select');
      for (const s of STATUS_IDS) {
        const o = document.createElement('option');
        o.value = s;
        o.textContent = s;
        if (draft.attackStatus.status === s) o.selected = true;
        sel.appendChild(o);
      }
      sel.onchange = () => {
        draft.attackStatus!.status = sel.value as typeof draft.attackStatus.status;
        markDirty();
      };
      f.appendChild(sel);
      f.appendChild(el('span', 'note', 'power'));
      f.appendChild(numIn(draft.attackStatus.power, (v) => (draft.attackStatus!.power = v)));
      f.appendChild(el('span', 'note', 'duration (ticks)'));
      f.appendChild(numIn(draft.attackStatus.durationTicks, (v) => (draft.attackStatus!.durationTicks = v)));
      subForms.appendChild(f);
    }
    if (draft.pack !== undefined) {
      const f = el('div', 'sub-form');
      f.appendChild(el('b', '', 'Pack name'));
      f.appendChild(textIn(draft.pack, (v) => (draft.pack = v), 'wolfkin'));
      subForms.appendChild(f);
    }
    if (subForms.childElementCount > 0) nature.appendChild(subForms);

    const resistRow = el('div', 'status-line');
    resistRow.appendChild(el('span', 'note', 'resists'));
    resistRow.appendChild(
      statusChips(draft.resist ?? [], (sid, on) => {
        const cur = new Set(draft.resist ?? []);
        if (on) cur.add(sid as (typeof STATUS_IDS)[number]);
        else cur.delete(sid as (typeof STATUS_IDS)[number]);
        draft.resist = cur.size > 0 ? [...cur] : undefined;
        markDirty();
      }),
    );
    const weakRow = el('div', 'status-line');
    weakRow.appendChild(el('span', 'note', 'weak to'));
    weakRow.appendChild(
      statusChips(draft.weak ?? [], (sid, on) => {
        const cur = new Set(draft.weak ?? []);
        if (on) cur.add(sid as (typeof STATUS_IDS)[number]);
        else cur.delete(sid as (typeof STATUS_IDS)[number]);
        draft.weak = cur.size > 0 ? [...cur] : undefined;
        markDirty();
      }),
    );
    nature.append(resistRow, weakRow);
    body.appendChild(
      sect('Nature', 'Toggle a trait to reveal its knobs. Statuses double or halve their element against this creature.', nature),
    );

    // Loot — table cards with icon strips.
    const lootBox = el('div');
    const cards = el('div', 'loot-cards');
    for (const tid of draft.loot) {
      const table = state.loot.find((t) => t.def.id === tid);
      const card = el('div', 'loot-card');
      const head = el('div', 'loot-card-head');
      const open = el('button', 'loot-card-name', tid) as HTMLButtonElement;
      open.title = 'Open this table';
      open.onclick = () => setSection('loot', tid);
      head.appendChild(open);
      const x = el('button', 'mini danger', '×') as HTMLButtonElement;
      x.title = `Stop rolling '${tid}'`;
      x.onclick = () => {
        draft.loot = draft.loot.filter((l) => l !== tid);
        markDirty();
        rebuild();
      };
      head.appendChild(x);
      card.appendChild(head);
      const strip = el('div', 'loot-strip');
      const items = (table?.def.entries ?? []).filter((e) => e.item).slice(0, 7);
      for (const e of items) {
        const img = document.createElement('img');
        img.src = itemIconUrl(e.item!, 24);
        img.width = 24;
        img.height = 24;
        img.title = e.item!;
        strip.appendChild(img);
      }
      if ((table?.def.entries.length ?? 0) > items.length) {
        strip.appendChild(el('span', 'note', `+${(table?.def.entries.length ?? 0) - items.length}`));
      }
      card.appendChild(strip);
      cards.appendChild(card);
    }
    lootBox.appendChild(cards);
    if (draft.loot.length === 0) lootBox.appendChild(el('p', 'muted empty', 'Drops nothing.'));
    const addRow = el('div', 'add-row');
    addRow.appendChild(
      combobox(
        () => tableOptions().filter((o) => !draft.loot.includes(o.id)),
        undefined,
        (v) => {
          draft.loot.push(v);
          markDirty();
          rebuild();
        },
        'attach a loot table…',
      ),
    );
    lootBox.appendChild(addRow);
    body.appendChild(sect('Loot', 'Every kill rolls each attached table at the creature\'s level.', lootBox));

    // ---------------------------------------------------- linkage rail
    npcSiteRows(linkage, id);
    linkHead(linkage, 'prefab', 'A hundred kills would drop');
    if (draft.loot.length === 0) {
      emptyLink(linkage, 'Nothing — attach a loot table.');
    } else {
      const merged: SimAggregate = { rolls: 100, level: draft.level, items: new Map(), evCoins: 0, emptyRolls: 0 };
      for (const tid of draft.loot) {
        const agg = simulate(tid, draft.level, 100);
        for (const [item, rec] of agg.items) {
          const m = merged.items.get(item) ?? { hits: 0, qty: 0 };
          m.hits += rec.hits;
          m.qty += rec.qty;
          merged.items.set(item, m);
        }
        merged.evCoins += agg.evCoins;
      }
      linkage.appendChild(simGrid(merged));
      const again = el('button', 'mini', 'roll again') as HTMLButtonElement;
      again.onclick = rebuild;
      linkage.appendChild(again);
    }
  };
  build();
}

function npcSiteRows(root: HTMLElement, npcId: string): void {
  const sites = state.sites.npcs.filter((s) => s.npc === npcId);
  linkHead(root, 'cluster', 'Spawns in the world', sites.length);
  if (sites.length === 0) {
    emptyLink(root, 'No live spawn slots. Place a cluster in Map Studio to field it.');
    return;
  }
  const byZone = new Map<string, { count: number; zoneId: string | null }>();
  for (const s of sites) {
    const zone = zoneAt(s.x, s.y);
    const key = zone?.id ?? 'wilds';
    const rec = byZone.get(key) ?? { count: 0, zoneId: zone?.id ?? null };
    rec.count++;
    byZone.set(key, rec);
  }
  for (const [key, rec] of byZone) {
    const zone = state.zones.find((z) => z.id === rec.zoneId);
    linkRow(
      root,
      zone?.name ?? (key === 'wilds' ? 'Open world' : key),
      `×${rec.count}`,
      rec.zoneId ? () => window.open(`/editor.html?zone=${rec.zoneId}`, '_blank') : null,
    );
  }
}

// --------------------------------------------------------- loot tables

export function newLootTable(id: string): LootTableDef {
  return { id, desc: '', entries: [] };
}

function lootDetail(body: HTMLElement, linkage: HTMLElement, id: string): void {
  const entry = state.loot.find((t) => t.def.id === id);
  if (!entry) return;
  const draft: LootTableDef = JSON.parse(JSON.stringify(entry.def)) as LootTableDef;
  draft.entries = draft.entries ?? [];
  let simLevel = 10;

  const save = (): void => {
    void persistence.saveLootDef(draft).catch((err: Error) => toast(err.message, 5200, 'error'));
  };
  const rebuild = (): void => {
    body.innerHTML = '';
    linkage.innerHTML = '';
    build();
  };
  const isPick = (): boolean => draft.mode === 'pick';

  // Live-updated share readouts: sliders patch these in place — no
  // rebuild mid-drag, the whole page answers as you pull.
  interface ShareRef {
    idx: number | 'nothing';
    fill: HTMLElement;
    pct: HTMLElement;
    seg?: HTMLElement;
  }
  let shareRefs: ShareRef[] = [];
  let expectedChip: HTMLElement | null = null;
  let gearChip: HTMLElement | null = null;

  const shareOf = (idx: number | 'nothing'): number => {
    if (idx === 'nothing') {
      if (!isPick()) return 0;
      const totalW = draft.entries.reduce((s, x) => s + (x.w ?? 1), 0) + (draft.nothingW ?? 0);
      return totalW > 0 ? (draft.nothingW ?? 0) / totalW : 0;
    }
    return entryShare(draft, idx);
  };

  const updateShares = (): void => {
    for (const ref of shareRefs) {
      const share = shareOf(ref.idx);
      ref.fill.style.width = `${Math.max(2, Math.min(100, share * 100))}%`;
      ref.pct.textContent = `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`;
      if (ref.seg) ref.seg.style.flexGrow = String(Math.max(0.001, share));
    }
    if (expectedChip || gearChip) {
      // The analytic expectation — nested sub-tables included, the same
      // math the flood-law test holds every foe to.
      const tables = new Map<string, LootTableDef>(state.loot.map((t) => [t.def.id, t.def]));
      tables.set(draft.id, draft);
      let y = { stacks: 0, gearStacks: 0 };
      try {
        y = expectedYield(draft.id, tables);
      } catch {
        // a broken draft mid-edit just holds the last good figures
      }
      if (expectedChip) expectedChip.textContent = `≈${y.stacks.toFixed(2)} drops/roll`;
      if (gearChip) {
        gearChip.textContent =
          y.gearStacks >= 0.005 ? `gear 1-in-${Math.round(1 / y.gearStacks)}` : 'no gear';
      }
    }
    markDirty();
  };

  // ------------------------------------------------------ entry card
  const entryCard = (e: LootEntryDef, i: number): HTMLElement => {
    const kind = e.item !== undefined ? 'item' : e.table !== undefined ? 'table' : 'pool';
    const card = el('div', 'ecard');
    card.draggable = true;
    card.dataset.idx = String(i);

    // Drag-to-reorder: the order is the table's authored story.
    card.addEventListener('dragstart', (ev) => {
      ev.dataTransfer?.setData('text/plain', String(i));
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      card.classList.add('drop-here');
    });
    card.addEventListener('dragleave', () => card.classList.remove('drop-here'));
    card.addEventListener('drop', (ev) => {
      ev.preventDefault();
      card.classList.remove('drop-here');
      const from = Number(ev.dataTransfer?.getData('text/plain') ?? -1);
      if (from < 0 || from === i) return;
      const [moved] = draft.entries.splice(from, 1);
      draft.entries.splice(i, 0, moved!);
      markDirty();
      rebuild();
    });

    // --- the face: icon + what drops
    const face = el('div', 'ecard-face');
    const icoBox = el('div', 'ecard-ico');
    if (e.item) {
      const img = document.createElement('img');
      img.src = itemIconUrl(e.item, 44);
      img.width = 44;
      img.height = 44;
      icoBox.appendChild(img);
    } else {
      icoBox.appendChild(iconImg(kind === 'table' ? 'prefab' : 'picker', 30));
    }
    face.appendChild(icoBox);
    const faceCol = el('div', 'ecard-what');
    const kindSeg = el('div', 'seg-row mini-seg');
    for (const [v, l, tip] of [
      ['item', 'item', 'drops a specific item'],
      ['table', 'table', 'rolls another table (composition)'],
      ['pool', 'heirloom', 'a piece from the heirloom gear pool'],
    ] as const) {
      const b = el('button', 'opt-btn' + (kind === v ? ' active' : ''), l) as HTMLButtonElement;
      b.title = tip;
      b.onclick = () => {
        delete e.item;
        delete e.table;
        delete e.pool;
        delete e.mult;
        if (v === 'item') e.item = 'coins';
        else if (v === 'table') e.table = state.loot.find((t) => t.def.id !== draft.id)?.def.id;
        else e.pool = 'heirloom';
        markDirty();
        rebuild();
      };
      kindSeg.appendChild(b);
    }
    faceCol.appendChild(kindSeg);
    if (kind === 'item') {
      faceCol.appendChild(
        combobox(() => itemOptions(), e.item, (v) => {
          e.item = v;
          markDirty();
          rebuild();
        }),
      );
    } else if (kind === 'table') {
      faceCol.appendChild(
        combobox(() => tableOptions(draft.id), e.table, (v) => {
          e.table = v;
          markDirty();
          rebuild();
        }),
      );
    } else {
      faceCol.appendChild(el('p', 'muted', 'Rolled gear from the heirloom pool — rarity rides the table knobs.'));
    }
    face.appendChild(faceCol);
    card.appendChild(face);

    // --- the odds: one big slider, chance or weight by mode
    const odds = el('div', 'ecard-odds');
    if (isPick()) {
      const wMax = Math.max(
        20,
        Math.ceil(
          Math.max(...draft.entries.map((x) => x.w ?? 1), draft.nothingW ?? 0) * 1.3,
        ),
      );
      odds.appendChild(el('span', 'ecard-odds-label', 'weight in the pool'));
      odds.appendChild(
        bigSlider({
          value: e.w ?? 1,
          min: 0,
          max: wMax,
          step: 1,
          format: (v) => `${v}`,
          fine: true,
          hint: 'heavier = drawn more often',
          onInput: (v) => {
            e.w = v;
            delete e.chance;
            updateShares();
          },
        }),
      );
    } else {
      odds.appendChild(el('span', 'ecard-odds-label', 'drop chance'));
      odds.appendChild(
        bigSlider({
          value: Math.round((e.chance ?? 1) * 1000) / 10,
          min: 0.1,
          max: 100,
          step: 0.1,
          format: (v) => `${v}%`,
          fine: true,
          hint: 'this entry rolls on its own, every kill',
          onInput: (v) => {
            e.chance = Math.round(v * 10) / 1000;
            delete e.w;
            updateShares();
          },
        }),
      );
    }
    card.appendChild(odds);

    // --- quantity + mult
    const nums = el('div', 'ecard-nums');
    const qtyF = el('label', 'nfield');
    qtyF.appendChild(el('span', '', 'quantity'));
    qtyF.appendChild(
      rangePair(e.qty?.[0] ?? 1, e.qty?.[1] ?? e.qty?.[0] ?? 1, 1, 999, (lo, hi) => {
        e.qty = [lo, hi];
        markDirty();
      }),
    );
    nums.appendChild(qtyF);
    if (kind === 'table') {
      const multF = el('label', 'nfield');
      multF.appendChild(el('span', '', 'roll it × times'));
      const multIn = document.createElement('input');
      multIn.type = 'number';
      multIn.step = '0.5';
      multIn.min = '0.5';
      multIn.value = String(e.mult ?? 1);
      multIn.oninput = () => {
        const v = Number(multIn.value) || 1;
        e.mult = v === 1 ? undefined : v;
        markDirty();
      };
      multF.appendChild(multIn);
      nums.appendChild(multF);
    }
    card.appendChild(nums);

    // --- actions
    const actions = el('div', 'ecard-actions');
    const dup = el('button', 'mini', '⧉') as HTMLButtonElement;
    dup.title = 'Duplicate this entry';
    dup.onclick = () => {
      draft.entries.splice(i + 1, 0, JSON.parse(JSON.stringify(e)) as LootEntryDef);
      markDirty();
      rebuild();
    };
    const del = el('button', 'mini danger') as HTMLButtonElement;
    del.appendChild(iconImg('trash', 14));
    del.title = 'Remove this entry';
    del.onclick = () => {
      draft.entries.splice(i, 1);
      markDirty();
      rebuild();
    };
    const grip = el('span', 'ecard-grip', '⋮⋮');
    grip.title = 'Drag to reorder';
    actions.append(dup, del, grip);
    card.appendChild(actions);

    // --- the live share strip along the card's foot
    const strip = el('div', 'ecard-strip');
    const fill = el('div', 'ecard-strip-fill');
    strip.appendChild(fill);
    const pct = el('span', 'ecard-strip-pct');
    strip.appendChild(pct);
    strip.title = isPick()
      ? 'effective share of the pool (weight over total, times draws)'
      : 'this entry’s own drop chance';
    card.appendChild(strip);
    shareRefs.push({ idx: i, fill, pct });

    return card;
  };

  // -------------------------------------------------- the build pass
  const build = (): void => {
    shareRefs = [];
    const quick = simulate(id, simLevel, 300, draft);
    expectedChip = pill('…', 'analytic expected stacks per roll, sub-tables included', 'ink');
    gearChip = pill('…', 'analytic odds a roll pays equipment (gear, relic, sigil, heirloom)', 'ink');
    body.appendChild(
      detailHead(
        null,
        draft.id,
        '',
        [
          pill(`${draft.entries.length} entries`, '', 'ink'),
          expectedChip,
          gearChip,
          pill(
            `≈${quick.evCoins.toFixed(1)} coins/roll`,
            'catalog value of an average roll (300-roll observation)',
            'brass',
          ),
          pill(`${Math.round((quick.emptyRolls / quick.rolls) * 100)}% empty`, 'rolls that pay nothing', 'ink'),
        ],
        entry.edited,
        entry.authored,
        save,
        () => void persistence.revertLootDef(id).catch((err: Error) => toast(err.message, 4600, 'error')),
      ),
    );

    // Editable story line right under the name — the description IS
    // the table's purpose; it deserves the top of the page.
    const descIn = document.createElement('input');
    descIn.className = 'desc-line';
    descIn.placeholder = 'What story does this table pay out? (description)';
    descIn.value = draft.desc ?? '';
    descIn.oninput = () => {
      draft.desc = descIn.value || undefined;
      markDirty();
    };
    body.appendChild(descIn);

    // ------------------------------------------------- mode as cards
    const modeRow = el('div', 'mode-cards');
    for (const [v, title, sub] of [
      ['each', 'Each — independent chances', 'Every entry rolls its own percentage on every kill. Bones at 100% and a totem at 4% coexist happily.'],
      ['pick', 'Pick — a weighted pool', 'The table draws N times from one pool; weights set the odds against each other. Classic rare-table shape.'],
    ] as const) {
      const active = (draft.mode ?? 'each') === v;
      const cardB = el('button', 'mode-card' + (active ? ' active' : '')) as HTMLButtonElement;
      cardB.appendChild(el('b', '', title));
      cardB.appendChild(el('span', '', sub));
      cardB.onclick = () => {
        if ((draft.mode ?? 'each') === v) return;
        draft.mode = v === 'pick' ? 'pick' : undefined;
        if (v === 'pick' && !draft.picks) draft.picks = [1, 2];
        markDirty();
        rebuild();
      };
      modeRow.appendChild(cardB);
    }
    body.appendChild(sect('How it rolls', '', modeRow));

    // ---------------------------------------------- calibration knobs
    // Every economy dial lives in the table data — retuning the world
    // is a content edit, never a code change.
    const calib = el('div', 'opt-row calib-row');
    const knob = (label: string, input: HTMLElement): void => {
      calib.appendChild(el('span', 'ecard-odds-label', label));
      calib.appendChild(input);
    };
    const numIn = (
      value: number | undefined,
      min: number | undefined,
      title: string,
      onInput: (v: number | undefined) => void,
    ): HTMLInputElement => {
      const input = document.createElement('input');
      input.type = 'number';
      if (min !== undefined) input.min = String(min);
      input.step = '1';
      input.title = title;
      input.value = value !== undefined ? String(value) : '';
      input.oninput = () => {
        const v = input.value === '' ? undefined : Number(input.value);
        onInput(v !== undefined && Number.isFinite(v) ? v : undefined);
        updateShares();
      };
      return input;
    };
    knob(
      'max drops',
      numIn(draft.maxDrops, 1, 'Hard ceiling on stacks per roll (blank = uncapped). A safety rail — balance with chances and weights.', (v) => {
        draft.maxDrops = v !== undefined && v >= 1 ? Math.floor(v) : undefined;
      }),
    );
    knob(
      'rarity bonus',
      numIn(draft.rarityBonus, undefined, 'Rolls weight rarities as if the source were this many levels higher (negative allowed).', (v) => {
        draft.rarityBonus = v || undefined;
      }),
    );
    const raritySel = document.createElement('select');
    raritySel.title = 'Rolled drops never land below this tier.';
    raritySel.appendChild(new Option('no floor', ''));
    for (const r of RARITY_TIERS) raritySel.appendChild(new Option(r, r));
    raritySel.value = draft.minRarity ?? '';
    raritySel.onchange = () => {
      draft.minRarity = (raritySel.value || undefined) as RarityTier | undefined;
      updateShares();
    };
    knob('rarity floor', raritySel);
    const powerSel = document.createElement('select');
    powerSel.title = 'source: a strong foe re-issues old gear at its own level. native: never promotes.';
    powerSel.appendChild(new Option('source (promotes)', ''));
    powerSel.appendChild(new Option('native (never)', 'native'));
    powerSel.value = draft.power === 'native' ? 'native' : '';
    powerSel.onchange = () => {
      draft.power = powerSel.value === 'native' ? 'native' : undefined;
      updateShares();
    };
    knob('item power', powerSel);
    body.appendChild(
      sect('Calibration', 'The table’s economy dials: payout ceiling, rarity weighting, and power stamping.', calib),
    );

    if (isPick()) {
      const picksRow = el('div', 'opt-row picks-row');
      picksRow.appendChild(el('span', 'ecard-odds-label', 'draws per roll'));
      picksRow.appendChild(
        rangePair(draft.picks?.[0] ?? 1, draft.picks?.[1] ?? 1, 1, 12, (lo, hi) => {
          draft.picks = [lo, hi];
          updateShares();
        }),
      );
      body.appendChild(picksRow);

      // The pool at a glance: one stacked bar, every share visible.
      const dist = el('div', 'pool-bar');
      draft.entries.forEach((e, i) => {
        const seg = el('div', 'pool-seg');
        seg.style.background = `hsl(${(i * 63) % 360} 45% 46%)`;
        seg.title = e.item ?? e.table ?? 'heirloom';
        const ref = shareRefs.find((r) => r.idx === i);
        if (ref) ref.seg = seg;
        else shareRefs.push({ idx: i, fill: el('i'), pct: el('i'), seg });
        dist.appendChild(seg);
      });
      const nothingSeg = el('div', 'pool-seg nothing');
      nothingSeg.title = 'nothing — empty hands';
      dist.appendChild(nothingSeg);
      shareRefs.push({ idx: 'nothing', fill: el('i'), pct: el('i'), seg: nothingSeg });
      body.appendChild(sect('The pool', 'Each band is an entry’s slice of the draw; the dark band is empty hands.', dist));
    }

    // ------------------------------------------------------ entries
    const list = el('div', 'ecard-list');
    draft.entries.forEach((e, i) => list.appendChild(entryCard(e, i)));

    if (isPick()) {
      // Empty hands is part of the pool — it gets a card like anything
      // else, so "how often nothing?" is designed, not computed.
      const ghost = el('div', 'ecard ghost');
      const face = el('div', 'ecard-face');
      const icoBox = el('div', 'ecard-ico ghost-ico');
      icoBox.appendChild(el('span', '', '∅'));
      face.appendChild(icoBox);
      const what = el('div', 'ecard-what');
      what.appendChild(el('b', 'ghost-title', 'Empty hands'));
      what.appendChild(el('p', 'muted', 'The draw that pays nothing — tension in the pool.'));
      face.appendChild(what);
      ghost.appendChild(face);
      const odds = el('div', 'ecard-odds');
      odds.appendChild(el('span', 'ecard-odds-label', 'weight in the pool'));
      const wMax = Math.max(
        20,
        Math.ceil(Math.max(...draft.entries.map((x) => x.w ?? 1), draft.nothingW ?? 0, 1) * 1.3),
      );
      odds.appendChild(
        bigSlider({
          value: draft.nothingW ?? 0,
          min: 0,
          max: wMax,
          step: 1,
          format: (v) => `${v}`,
          fine: true,
          onInput: (v) => {
            draft.nothingW = v || undefined;
            updateShares();
          },
        }),
      );
      ghost.appendChild(odds);
      ghost.appendChild(el('div', 'ecard-nums'));
      ghost.appendChild(el('div', 'ecard-actions'));
      const strip = el('div', 'ecard-strip');
      const fill = el('div', 'ecard-strip-fill nothing');
      strip.appendChild(fill);
      const pct = el('span', 'ecard-strip-pct');
      strip.appendChild(pct);
      ghost.appendChild(strip);
      shareRefs.push({ idx: 'nothing', fill, pct });
      list.appendChild(ghost);
    }

    if (draft.entries.length === 0) {
      list.appendChild(el('p', 'muted empty', 'No entries — this table pays out nothing. Add the first drop below.'));
    }

    // Quick add: pick the thing, get the entry — one gesture.
    const addRow = el('div', 'quick-add');
    addRow.appendChild(el('span', 'ecard-odds-label', 'add a drop'));
    addRow.appendChild(
      combobox(
        () => itemOptions(),
        undefined,
        (v) => {
          draft.entries.push(
            isPick() ? { item: v, w: 5, qty: [1, 1] } : { item: v, chance: 0.25, qty: [1, 1] },
          );
          markDirty();
          rebuild();
        },
        'item…',
      ),
    );
    addRow.appendChild(
      combobox(
        () => tableOptions(draft.id),
        undefined,
        (v) => {
          draft.entries.push(isPick() ? { table: v, w: 3 } : { table: v, chance: 1 });
          markDirty();
          rebuild();
        },
        'sub-table…',
      ),
    );
    const heirloomBtn = el('button', '', '+ heirloom piece') as HTMLButtonElement;
    heirloomBtn.title = 'A rolled gear piece from the heirloom pool';
    heirloomBtn.onclick = () => {
      draft.entries.push(isPick() ? { pool: 'heirloom', w: 1 } : { pool: 'heirloom', chance: 0.05 });
      markDirty();
      rebuild();
    };
    addRow.appendChild(heirloomBtn);
    list.appendChild(addRow);

    body.appendChild(
      sect(
        'Entries',
        isPick()
          ? 'Drag cards to reorder. The foot of each card is its live share of the pool — pull a weight and watch every share answer.'
          : 'Drag cards to reorder. Each card rolls independently at its own chance, every single kill.',
        list,
      ),
    );

    // -------------------------------------------------- the laboratory
    const lab = el('div');
    const labRow = el('div', 'quick-add');
    labRow.appendChild(el('span', 'ecard-odds-label', 'foe level'));
    const lvlIn = document.createElement('input');
    lvlIn.type = 'number';
    lvlIn.min = '1';
    lvlIn.max = '99';
    lvlIn.value = String(simLevel);
    lvlIn.oninput = () => (simLevel = Math.max(1, Number(lvlIn.value) || 1));
    labRow.appendChild(lvlIn);
    const roll = el('button', 'primary', 'Roll ×300') as HTMLButtonElement;
    roll.onclick = rebuild;
    labRow.appendChild(roll);
    lab.appendChild(labRow);
    lab.appendChild(simGrid(quick));
    body.appendChild(
      sect('The laboratory', 'Rolls the REAL roller against your unsaved draft — what you see is what a player farms.', lab),
    );

    updateShares();
    state.dirty = false; // updateShares marks dirty; a fresh build isn't an edit
    lootUsedByRows(linkage, id);
  };
  build();
}

function lootUsedByRows(root: HTMLElement, tableId: string): void {
  const npcs = state.npcs.filter((n) => n.def.loot.includes(tableId));
  const actors = state.actors.filter((a) => a.def.combat?.loot?.includes(tableId));
  const tables = state.loot.filter((t) => t.def.entries.some((e) => e.table === tableId));
  linkHead(root, 'cluster', 'Dropped by', npcs.length + actors.length);
  if (npcs.length + actors.length === 0) emptyLink(root, 'No creature rolls this table directly.');
  for (const n of npcs) {
    const thumb = creatureRender(n.def, 30);
    thumb.style.borderRadius = '5px';
    linkRow(root, n.def.name, `lv ${n.def.level}`, () => setSection('npcs', n.def.id), thumb);
  }
  for (const a of actors) linkRow(root, a.def.name, 'actor', () => setSection('actors', a.def.id));
  if (tables.length > 0) {
    linkHead(root, 'prefab', 'Composed into', tables.length);
    for (const t of tables) linkRow(root, t.def.id, '', () => setSection('loot', t.def.id));
  }
}

// -------------------------------------------------------------- actors

const EQUIP_SLOTS: Array<{ slot: string; label: string }> = [
  { slot: 'head', label: 'head' },
  { slot: 'body', label: 'body' },
  { slot: 'legs', label: 'legs' },
  { slot: 'boots', label: 'boots' },
  { slot: 'gloves', label: 'gloves' },
  { slot: 'weapon', label: 'weapon' },
  { slot: 'offhand', label: 'offhand' },
  { slot: 'cape', label: 'cape' },
];

/** Combat-stat overrides an actor may pin over its derived base. */
const OVERRIDE_STATS: Array<{
  key: keyof NpcActorCombatStats;
  label: string;
  min: number;
  max: number;
  step?: number;
  note?: string;
}> = [
  { key: 'maxHp', label: 'max hp', min: 1, max: 400 },
  { key: 'damage', label: 'damage', min: 1, max: 40 },
  { key: 'attackRange', label: 'attack range', min: 0.5, max: 8, step: 0.5, note: 'tiles' },
  { key: 'attackCooldownTicks', label: 'attack cooldown', min: 10, max: 120, note: 'ticks (20/s)' },
  { key: 'aggroRange', label: 'aggro range', min: 0, max: 16, note: '0 = never starts it' },
  { key: 'leashRange', label: 'leash range', min: 2, max: 40, note: 'tiles from the post' },
  { key: 'speed', label: 'speed', min: 0.5, max: 6, step: 0.1, note: 'tiles/s' },
  { key: 'xpReward', label: 'xp reward', min: 1, max: 2000 },
];

function creatureOptions(): ComboOption[] {
  return state.npcs
    .slice()
    .sort((a, b) => a.def.level - b.def.level)
    .map((n) => ({
      id: n.def.id,
      label: n.def.name,
      sub: `lv ${n.def.level}`,
      icon: creatureRender(n.def, 22).toDataURL(),
    }));
}

function baseNpcOf(draft: NpcActorDef): NpcDef | undefined {
  return draft.model.kind === 'creature'
    ? state.npcs.find((n) => n.def.id === (draft.model as { creature: string }).creature)?.def
    : undefined;
}

/** The stage art: the full standing body, exactly as the world draws it. */
function actorStageArt(draft: NpcActorDef, size: number): HTMLElement {
  const box = el('div', 'stage-art');
  const art =
    draft.model.kind === 'humanoid'
      ? actorFigure(draft, size)
      : (() => {
          const base = baseNpcOf(draft);
          return base ? creatureRender(base, size) : null;
        })();
  if (art) box.appendChild(art);
  else box.appendChild(el('p', 'muted empty', 'no body to render'));
  return box;
}

function actorPills(draft: NpcActorDef): HTMLElement[] {
  const pills: HTMLElement[] = [
    pill(
      draft.disposition,
      'how combat treats this actor',
      draft.disposition === 'hostile' ? 'danger' : draft.disposition === 'friendly' ? 'ok' : 'ink',
    ),
  ];
  if (draft.protection) pills.push(pill(draft.protection, 'the safety switch over the disposition', 'brass'));
  const eff = actorCombatDef(draft);
  if (eff) pills.push(pill(`fights at lv ${draft.combat!.level}`, `${eff.maxHp} hp · ${eff.damage} damage`, 'danger'));
  if (draft.dialogue) pills.push(pill('speaks', `dialogue: ${draft.dialogue}`, 'brass'));
  if (draft.shop) pills.push(pill('trades', `shop: ${draft.shop}`, 'brass'));
  return pills;
}

function actorDetail(body: HTMLElement, linkage: HTMLElement, slug: string): void {
  const entry = state.actors.find((a) => a.def.id === slug);
  if (!entry) return;
  const draft: NpcActorDef = JSON.parse(JSON.stringify(entry.def)) as NpcActorDef;

  // Stashes so flipping the body kind back restores what was there.
  let stashedLook: Look | null = draft.model.kind === 'humanoid' ? null : { ...DEFAULT_LOOK };
  let stashedCreature: string | null = null;

  const save = (): void => {
    void persistence.saveActorDef(draft).catch((err: Error) => toast(err.message, 5200, 'error'));
  };
  const rebuild = (): void => {
    body.innerHTML = '';
    linkage.innerHTML = '';
    build();
  };

  // ------------------------------------------- live stage refresh
  // The look designer and wardrobe patch the renders in place — the
  // page never rebuilds mid-fitting (the live-answer law).
  let stageBox: HTMLElement | null = null;
  let factsBox: HTMLElement | null = null;
  const refreshStage = (): void => {
    if (stageBox) {
      stageBox.innerHTML = '';
      stageBox.appendChild(actorStageArt(draft, 224));
    }
    if (factsBox) {
      factsBox.innerHTML = '';
      buildFacts(factsBox);
    }
    const heroFrame = body.querySelector<HTMLElement>('.hero-portrait');
    if (heroFrame) {
      const bust =
        draft.model.kind === 'humanoid'
          ? actorBust(draft, 132)
          : (() => {
              const base = baseNpcOf(draft);
              return base ? creatureRender(base, 132) : null;
            })();
      if (bust) {
        heroFrame.innerHTML = '';
        heroFrame.appendChild(bust);
      }
    }
  };

  const buildFacts = (box: HTMLElement): void => {
    const fact = (label: string, value: string, hint = ''): void => {
      const row = el('div', 'fact-row');
      row.appendChild(el('span', 'fact-label', label));
      const v = el('b', 'fact-value', value);
      if (hint) v.title = hint;
      row.appendChild(v);
      box.appendChild(row);
    };
    fact(
      'body',
      draft.model.kind === 'humanoid'
        ? 'the player rig'
        : (baseNpcOf(draft)?.name ?? draft.model.creature),
      draft.model.kind === 'humanoid' ? 'renders through the same rig as players' : 'a bestiary body',
    );
    const worn = Object.values(draft.equipment ?? {}).filter(Boolean).length;
    if (draft.model.kind === 'humanoid') fact('wearing', worn === 0 ? 'street clothes' : `${worn} piece${worn === 1 ? '' : 's'}`);
    const eff = actorCombatDef(draft);
    if (eff) {
      const dps = eff.damage > 0 ? eff.damage / (eff.attackCooldownTicks / 20) : 0;
      fact('combat', `lv ${draft.combat!.level} · ${eff.maxHp} hp`, 'derived from the base, overrides applied');
      fact('output', eff.damage === 0 ? 'harmless' : `${eff.damage} dmg · ${dps.toFixed(1)} dps`);
      fact('temper', eff.aggroRange <= 0 ? 'never starts it' : `aggro ${eff.aggroRange} tiles`);
      fact('pays', `${eff.xpReward} xp`, 'on death');
    } else {
      fact('combat', 'beyond reach', 'no combat body is ever built — attacks pass through');
    }
    fact('carries', `${(draft.inventory ?? []).length} item row${(draft.inventory ?? []).length === 1 ? '' : 's'}`);
    if (draft.lines?.length) fact('voice', `${draft.lines.length} line${draft.lines.length === 1 ? '' : 's'}`);
  };

  const build = (): void => {
    const portrait =
      draft.model.kind === 'humanoid'
        ? actorBust(draft, 132)
        : (() => {
            const base = baseNpcOf(draft);
            return base ? creatureRender(base, 132) : null;
          })();

    const head = detailHead(
      portrait,
      draft.name,
      draft.id,
      actorPills(draft),
      entry.edited,
      entry.authored,
      save,
      () => void persistence.revertActorDef(slug).catch((err: Error) => toast(err.message, 4600, 'error')),
    );
    // Duplicate — the fastest way to a family of guards.
    const dup = el('button', '', 'Duplicate') as HTMLButtonElement;
    dup.title = 'Clone this actor under a new slug';
    dup.onclick = () => {
      const id = window.prompt(`New slug for the copy of '${draft.name}':`, `${draft.id}_2`);
      if (!id) return;
      if (!/^[a-z][a-z0-9_]*$/.test(id) || state.actors.some((a) => a.def.id === id)) {
        toast('slug must be unique lowercase [a-z0-9_]', 3600, 'error');
        return;
      }
      const clone = JSON.parse(JSON.stringify(draft)) as NpcActorDef;
      clone.id = id;
      state.actors.push({ def: clone, edited: true, authored: false });
      setSection('actors', id);
      markDirty();
      toast(`'${id}' drafted from '${draft.id}' — Save ▸ Live to keep it`, 3600);
    };
    head.querySelector('.hero-actions')?.prepend(dup);
    body.appendChild(head);

    // ------------------------------------------------- the stage
    const stageWrap = el('div', 'stage-flex');
    stageBox = el('div', 'stage-well');
    stageBox.appendChild(actorStageArt(draft, 224));
    stageWrap.appendChild(stageBox);
    factsBox = el('div', 'fact-col');
    buildFacts(factsBox);
    stageWrap.appendChild(factsBox);
    body.appendChild(
      sect('On the stage', 'The true render — this exact body, ring and all, is what walks the world.', stageWrap),
    );

    // -------------------------------------------------- identity
    const identity = el('div', 'fgrid');
    const f = (label: string, input: HTMLElement, note?: string, wide = false): HTMLElement => {
      const w = el('label', 'ffield' + (wide ? ' wide' : ''));
      w.appendChild(el('span', '', label));
      w.appendChild(input);
      if (note) w.appendChild(el('span', 'note', note));
      return w;
    };
    identity.append(
      f('name', textIn(draft.name, (v) => (draft.name = v))),
      f('title', textIn(draft.title ?? '', (v) => (draft.title = v || undefined)), 'the epithet under the nameplate'),
      f('examine', textIn(draft.examine ?? '', (v) => (draft.examine = v || undefined)), 'what a curious player reads', true),
    );
    body.appendChild(sect('Identity', '', identity));

    // ---------------------------------------------- temperament
    const temper = el('div');
    const dispCards = el('div', 'mode-cards');
    for (const [v, label, blurb] of [
      ['friendly', 'Friendly', 'Beyond harm — no combat body is ever built.'],
      ['neutral', 'Neutral', 'Fightable when combat stats exist; never starts it.'],
      ['hostile', 'Hostile', 'A named enemy — attacks on sight, combat required.'],
    ] as const) {
      const card = el('button', 'mode-card' + (draft.disposition === v ? ' active' : '')) as HTMLButtonElement;
      card.type = 'button';
      card.appendChild(el('b', '', label));
      card.appendChild(el('span', '', blurb));
      card.onclick = () => {
        draft.disposition = v;
        // Keep the def coherent under the validator's laws.
        if (v === 'friendly' && draft.combat) {
          delete draft.combat;
          toast('friendly folk stand beyond combat — the combat block was removed', 3600);
        }
        if (v === 'friendly') delete draft.protection;
        if (v === 'hostile' && !draft.combat) {
          draft.combat = { level: baseNpcOf(draft)?.level ?? 5 };
          toast('hostile requires combat stats — a starter block was added below', 3600);
        }
        if (v === 'hostile' && draft.protection === 'untargetable') delete draft.protection;
        markDirty();
        rebuild();
      };
      dispCards.appendChild(card);
    }
    temper.appendChild(dispCards);

    const protCards = el('div', 'mode-cards prot');
    for (const [v, label, blurb] of [
      ['', 'No ward', 'The disposition alone decides.'],
      ['invulnerable', 'Invulnerable', 'Fights back, but every blow reads "Immune" — you cannot kill the law.'],
      ['untargetable', 'Untargetable', 'Outside combat entirely — attacks pass straight through.'],
    ] as const) {
      const active = (draft.protection ?? '') === v;
      const card = el('button', 'mode-card' + (active ? ' active' : '')) as HTMLButtonElement;
      card.type = 'button';
      const blocked =
        (draft.disposition === 'friendly' && v !== '') ||
        (v === 'invulnerable' && !draft.combat) ||
        (v === 'untargetable' && draft.disposition === 'hostile');
      card.disabled = blocked;
      card.title = blocked
        ? draft.disposition === 'friendly'
          ? 'friendly actors are already beyond combat'
          : v === 'invulnerable'
            ? 'needs a combat block — there is nothing to ward without one'
            : 'an unstrikeable aggressor is incoherent'
        : '';
      card.appendChild(el('b', '', label));
      card.appendChild(el('span', '', blurb));
      card.onclick = () => {
        draft.protection = (v || undefined) as NpcActorDef['protection'];
        markDirty();
        rebuild();
      };
      protCards.appendChild(card);
    }
    temper.appendChild(el('p', 'mirror-label prot-label', 'Protection — the safety switch'));
    temper.appendChild(protCards);
    body.appendChild(
      sect('Temperament', 'How the actor meets the world, and the ward over it.', temper),
    );

    // --------------------------------------------------- the body
    const bodyBox = el('div');
    const kindCards = el('div', 'mode-cards');
    for (const [kind, label, blurb] of [
      ['humanoid', 'A person — the player rig', 'Face, hair, heritage, and a wardrobe of real gear.'],
      ['creature', 'A creature — a bestiary body', 'A named beast wearing any body from the bestiary.'],
    ] as const) {
      const card = el('button', 'mode-card' + (draft.model.kind === kind ? ' active' : '')) as HTMLButtonElement;
      card.type = 'button';
      card.appendChild(el('b', '', label));
      card.appendChild(el('span', '', blurb));
      card.onclick = () => {
        if (draft.model.kind === kind) return;
        if (kind === 'creature') {
          stashedLook = { ...(draft.model as { look: Look }).look };
          const first = stashedCreature ?? state.npcs[0]?.def.id;
          if (!first) return;
          draft.model = { kind: 'creature', creature: first };
          delete draft.equipment;
        } else {
          stashedCreature = (draft.model as { creature: string }).creature;
          draft.model = { kind: 'humanoid', look: { ...(stashedLook ?? DEFAULT_LOOK) } };
        }
        markDirty();
        rebuild();
      };
      kindCards.appendChild(card);
    }
    bodyBox.appendChild(kindCards);

    if (draft.model.kind === 'humanoid') {
      // The Hero's Mirror — every choice repaints the stage live.
      bodyBox.appendChild(
        lookDesigner((draft.model as { look: Look }).look, () => {
          markDirty();
          refreshStage();
        }),
      );
    } else {
      const chosen = (draft.model as { creature: string }).creature;
      const grid = el('div', 'creature-grid');
      for (const n of state.npcs.slice().sort((a, b) => a.def.level - b.def.level)) {
        const tile = el('button', 'creature-tile' + (chosen === n.def.id ? ' active' : '')) as HTMLButtonElement;
        tile.type = 'button';
        const face = el('div', 'creature-face');
        face.appendChild(creatureRender(n.def, 84));
        tile.appendChild(face);
        tile.appendChild(el('b', '', n.def.name));
        tile.appendChild(el('span', '', `lv ${n.def.level}`));
        tile.onclick = () => {
          (draft.model as { creature: string }).creature = n.def.id;
          markDirty();
          rebuild();
        };
        grid.appendChild(tile);
      }
      bodyBox.appendChild(grid);
    }
    body.appendChild(
      sect(
        'The body',
        draft.model.kind === 'humanoid'
          ? 'The Hero’s Mirror — the same choices players get at creation.'
          : 'True in-game renders — pick the body this named soul wears.',
        bodyBox,
      ),
    );

    // --------------------------------------------------- wardrobe
    if (draft.model.kind === 'humanoid') {
      const grid = el('div', 'slot-grid');
      for (const { slot, label } of EQUIP_SLOTS) {
        const cell = el('div', 'slot-cell');
        const current = draft.equipment?.[slot as keyof typeof draft.equipment];
        const icoBox = el('div', 'slot-ico');
        if (current) {
          const img = document.createElement('img');
          img.src = itemIconUrl(current, 34);
          img.width = 34;
          img.height = 34;
          icoBox.appendChild(img);
        } else {
          icoBox.appendChild(el('span', 'note', '—'));
        }
        cell.appendChild(icoBox);
        cell.appendChild(el('span', 'slot-label', label));
        cell.appendChild(
          combobox(
            () => [{ id: '', label: '(bare)' } as ComboOption].concat(itemOptions(slot)),
            current ?? '',
            (v) => {
              draft.equipment ??= {};
              if (v) (draft.equipment as Record<string, string>)[slot] = v;
              else delete (draft.equipment as Record<string, string>)[slot];
              markDirty();
              const img = icoBox.querySelector('img');
              icoBox.innerHTML = '';
              if (v) {
                const next = img ?? document.createElement('img');
                next.src = itemIconUrl(v, 34);
                next.width = 34;
                next.height = 34;
                icoBox.appendChild(next);
              } else {
                icoBox.appendChild(el('span', 'note', '—'));
              }
              refreshStage();
            },
            '(bare)',
          ),
        );
        grid.appendChild(cell);
      }
      body.appendChild(
        sect('Wardrobe', 'Worn gear renders on the stage exactly as it will in the world.', grid),
      );
    }

    // ----------------------------------------------- combat bench
    const bench = el('div');
    if (draft.disposition === 'friendly') {
      bench.appendChild(
        el('p', 'muted empty', 'Friendly folk stand beyond combat’s reach — switch to neutral or hostile to arm them.'),
      );
    } else if (!draft.combat) {
      const ghost = el('div', 'arm-card');
      ghost.appendChild(el('b', '', 'Unarmed'));
      ghost.appendChild(el('span', '', 'No combat block — attacks pass through this actor.'));
      const arm = el('button', 'primary', 'Give combat stats') as HTMLButtonElement;
      arm.onclick = () => {
        draft.combat = { level: baseNpcOf(draft)?.level ?? 5 };
        markDirty();
        rebuild();
      };
      ghost.appendChild(arm);
      bench.appendChild(ghost);
    } else {
      const combat = draft.combat;
      const sliders = el('div', 'slider-grid');
      sliders.appendChild(
        statSlider({
          label: 'combat level',
          value: combat.level,
          min: 1,
          max: 126,
          note: 'the base body is re-issued at this level',
          onInput: (v) => {
            combat.level = v;
            markDirty();
          },
        }),
      );
      sliders.appendChild(
        statSlider({
          label: 'respawn',
          value: combat.respawnSec ?? baseNpcOf(draft)?.respawnSec ?? 60,
          min: 5,
          max: 1200,
          unit: 's',
          note: 'delay before the post refills',
          onInput: (v) => {
            combat.respawnSec = v;
            markDirty();
          },
        }),
      );
      bench.appendChild(sliders);

      const baseField = el('div', 'ffield');
      baseField.appendChild(el('span', '', 'stat chassis'));
      const defaultBase =
        draft.model.kind === 'creature' ? 'its own creature body' : 'the town-guard chassis';
      baseField.appendChild(
        combobox(
          () => [{ id: '', label: `(default — ${defaultBase})` } as ComboOption].concat(creatureOptions()),
          combat.base ?? '',
          (v) => {
            if (v) combat.base = v;
            else delete combat.base;
            markDirty();
            rebuild();
          },
          `(default — ${defaultBase})`,
        ),
      );
      baseField.appendChild(
        el('span', 'note', 'stats derive from this bestiary body scaled to the level; overrides land on top'),
      );
      bench.appendChild(baseField);

      // What actually walks: the derived block, live.
      const eff = actorCombatDef(draft);
      if (eff) {
        const plaques = el('div', 'fact-grid');
        const plaque = (label: string, value: string): void => {
          const p = el('div', 'fact-plaque');
          p.appendChild(el('span', '', label));
          p.appendChild(el('b', '', value));
          plaques.appendChild(p);
        };
        plaque('max hp', String(eff.maxHp));
        plaque('damage', String(eff.damage));
        plaque('dps', eff.damage > 0 ? (eff.damage / (eff.attackCooldownTicks / 20)).toFixed(1) : '0');
        plaque('speed', `${eff.speed}`);
        plaque('aggro', eff.aggroRange <= 0 ? '—' : `${eff.aggroRange}t`);
        plaque('xp', String(eff.xpReward));
        bench.appendChild(el('p', 'mirror-label prot-label', 'What actually walks — derived, overrides applied'));
        bench.appendChild(plaques);
      }

      // Overrides — pin any stat over the derived base.
      const ovWrap = el('div');
      const stats = combat.stats ?? {};
      const activeKeys = OVERRIDE_STATS.filter((s) => stats[s.key] !== undefined);
      if (activeKeys.length > 0) {
        const grid = el('div', 'slider-grid');
        for (const s of activeKeys) {
          const row = el('div', 'ov-row');
          row.appendChild(
            statSlider({
              label: s.label,
              value: stats[s.key]!,
              min: s.min,
              max: s.max,
              step: s.step,
              note: s.note,
              onInput: (v) => {
                combat.stats ??= {};
                combat.stats[s.key] = v;
                markDirty();
              },
            }),
          );
          const clear = el('button', 'mini danger', '✕') as HTMLButtonElement;
          clear.title = 'drop the override — back to derived';
          clear.onclick = () => {
            if (combat.stats) delete combat.stats[s.key];
            if (combat.stats && Object.keys(combat.stats).length === 0) delete combat.stats;
            markDirty();
            rebuild();
          };
          row.appendChild(clear);
          grid.appendChild(row);
        }
        ovWrap.appendChild(grid);
      }
      const remaining = OVERRIDE_STATS.filter((s) => stats[s.key] === undefined);
      if (remaining.length > 0) {
        const addRow = el('div', 'quick-add');
        addRow.appendChild(el('span', 'note', 'pin a stat:'));
        addRow.appendChild(
          combobox(
            () => remaining.map((s) => ({ id: s.key as string, label: s.label, sub: s.note })),
            '',
            (key) => {
              const spec = OVERRIDE_STATS.find((s) => (s.key as string) === key)!;
              const current = actorCombatDef(draft);
              combat.stats ??= {};
              combat.stats[spec.key] = Math.min(
                spec.max,
                Math.max(spec.min, Number(current?.[spec.key] ?? spec.min)),
              );
              markDirty();
              rebuild();
            },
            'override a stat…',
          ),
        );
        ovWrap.appendChild(addRow);
      }
      bench.appendChild(el('p', 'mirror-label prot-label', 'Overrides'));
      bench.appendChild(ovWrap);

      // Death pays: the loot tables this actor rolls.
      const lootBox = el('div');
      const lootRow = el('div', 'chip-row');
      for (const [i, t] of (combat.loot ?? []).entries()) {
        const chip = el('span', 'chip on loot-chip');
        const open = el('button', '', t) as HTMLButtonElement;
        open.onclick = () => setSection('loot', t);
        chip.appendChild(open);
        const x = el('button', 'chip-x', '✕') as HTMLButtonElement;
        x.title = 'remove this table';
        x.onclick = () => {
          combat.loot!.splice(i, 1);
          if (combat.loot!.length === 0) delete combat.loot;
          markDirty();
          rebuild();
        };
        chip.appendChild(x);
        lootRow.appendChild(chip);
      }
      lootBox.appendChild(lootRow);
      const addLoot = el('div', 'quick-add');
      addLoot.appendChild(el('span', 'note', 'add a table:'));
      addLoot.appendChild(
        combobox(
          () => tableOptions().filter((o) => !(combat.loot ?? []).includes(o.id)),
          '',
          (v) => {
            combat.loot ??= [];
            combat.loot.push(v);
            markDirty();
            rebuild();
          },
          'roll another table…',
        ),
      );
      lootBox.appendChild(addLoot);
      bench.appendChild(el('p', 'mirror-label prot-label', 'Death pays'));
      bench.appendChild(lootBox);

      if (draft.disposition !== 'hostile') {
        const disarm = el('button', 'mini danger', 'Remove combat block') as HTMLButtonElement;
        disarm.style.marginTop = '12px';
        disarm.onclick = () => {
          delete draft.combat;
          delete draft.protection;
          markDirty();
          rebuild();
        };
        bench.appendChild(disarm);
      }
    }
    body.appendChild(
      sect('Combat', 'Stats derive from a bestiary chassis scaled to the level; every number below is the real block.', bench),
    );

    // ----------------------------------------------------- pockets
    const inv = el('div');
    (draft.inventory ?? []).forEach((row, i) => {
      const r = el('div', 'inv-row');
      const img = document.createElement('img');
      img.src = itemIconUrl(row.item, 26);
      img.width = 26;
      img.height = 26;
      r.appendChild(img);
      r.appendChild(
        combobox(() => itemOptions(), row.item, (v) => {
          draft.inventory![i]!.item = v;
          markDirty();
          rebuild();
        }),
      );
      r.appendChild(el('span', 'note', '×'));
      r.appendChild(numIn(row.qty ?? 1, (v) => (draft.inventory![i]!.qty = v)));
      const del = el('button', 'mini danger') as HTMLButtonElement;
      del.appendChild(iconImg('trash', 13));
      del.onclick = () => {
        draft.inventory!.splice(i, 1);
        markDirty();
        rebuild();
      };
      r.appendChild(del);
      inv.appendChild(r);
    });
    if ((draft.inventory ?? []).length === 0) inv.appendChild(el('p', 'muted empty', 'Empty pockets.'));
    const addInv = el('button', 'mini', 'Add item') as HTMLButtonElement;
    addInv.onclick = () => {
      draft.inventory ??= [];
      draft.inventory.push({ item: state.items[0]?.id ?? 'coins', qty: 1 });
      markDirty();
      rebuild();
    };
    inv.appendChild(addInv);
    body.appendChild(sect('Pockets', 'Carried goods — what pickpockets and trades see.', inv));

    // ------------------------------------------------------- voice
    const voice = el('div');
    (draft.lines ?? []).forEach((line, i) => {
      const r = el('div', 'line-row');
      r.appendChild(el('span', 'line-quote', '“'));
      r.appendChild(textIn(line, (v) => (draft.lines![i] = v)));
      const del = el('button', 'mini danger') as HTMLButtonElement;
      del.appendChild(iconImg('trash', 13));
      del.onclick = () => {
        draft.lines!.splice(i, 1);
        if (draft.lines!.length === 0) delete draft.lines;
        markDirty();
        rebuild();
      };
      r.appendChild(del);
      voice.appendChild(r);
    });
    if ((draft.lines ?? []).length === 0) {
      voice.appendChild(el('p', 'muted empty', draft.dialogue ? 'Speaks through its dialogue tree.' : 'Silent.'));
    }
    const addLine = el('button', 'mini', 'Add line') as HTMLButtonElement;
    addLine.onclick = () => {
      draft.lines ??= [];
      draft.lines.push('…');
      markDirty();
      rebuild();
    };
    voice.appendChild(addLine);
    body.appendChild(
      sect('Voice', 'Spoken lines rotate on interaction; a bound dialogue tree takes over when present.', voice),
    );

    // ------------------------------------------------------- hooks
    const hooks = el('div', 'fgrid');
    const dlgField = el('div', 'ffield');
    dlgField.appendChild(el('span', '', 'dialogue tree'));
    dlgField.appendChild(
      combobox(
        () =>
          [{ id: '', label: '(none)' } as ComboOption].concat(
            state.dialogues
              .map((d) => ({ id: d.def.id, label: d.def.id, sub: `${d.def.nodes.length} beats` }))
              .sort((a, b) => a.id.localeCompare(b.id)),
          ),
        draft.dialogue ?? '',
        (v) => {
          draft.dialogue = v || undefined;
          markDirty();
          rebuild();
        },
        '(none)',
      ),
    );
    dlgField.appendChild(el('span', 'note', 'reserved hook — trees actually bind from the Dialogues studio'));
    hooks.appendChild(dlgField);
    const shopField = el('div', 'ffield');
    shopField.appendChild(el('span', '', 'shop counter'));
    shopField.appendChild(
      combobox(
        () =>
          [{ id: '', label: '(none)' } as ComboOption].concat(
            [...SHOPS.values()].map((s) => ({ id: s.id, label: s.name, sub: `${s.stock.length} wares` })),
          ),
        draft.shop ?? '',
        (v) => {
          draft.shop = v || undefined;
          markDirty();
          rebuild();
        },
        '(none)',
      ),
    );
    shopField.appendChild(el('span', 'note', 'talking opens these wares'));
    hooks.appendChild(shopField);
    body.appendChild(sect('Hooks', 'What talking to them opens.', hooks));

    // ---------------------------------------------- the JSON drawer
    const jsonBox = document.createElement('textarea');
    jsonBox.rows = 14;
    jsonBox.style.width = '100%';
    jsonBox.value = JSON.stringify(draft, null, 2);
    const apply = el('button', 'mini', 'Apply JSON to the editor') as HTMLButtonElement;
    apply.onclick = () => {
      try {
        const parsed = JSON.parse(jsonBox.value) as NpcActorDef;
        parsed.id = draft.id;
        Object.keys(draft).forEach((k) => delete (draft as unknown as Record<string, unknown>)[k]);
        Object.assign(draft, parsed);
        markDirty();
        rebuild();
        toast('JSON applied — review and Save ▸ Live', 3000);
      } catch (err) {
        toast(`definition JSON: ${(err as Error).message}`, 4200, 'error');
      }
    };
    const wrap = el('div');
    wrap.appendChild(jsonBox);
    wrap.appendChild(apply);
    wrap.appendChild(
      el('p', 'muted', 'The full definition, exactly what saves. Paste a def and apply to load it into the structured editor; the slug stays.'),
    );
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Full definition (advanced)';
    details.appendChild(summary);
    details.appendChild(wrap);
    const detSect = el('div', 'fsect');
    detSect.appendChild(details);
    body.appendChild(detSect);

    // ----------------------------------------------------- linkage
    const posts = state.sites.actors.filter((a) => a.actor === slug);
    linkHead(linkage, 'actor', 'Posted at', posts.length);
    if (posts.length === 0) emptyLink(linkage, 'No posts. Place this actor in Map Studio.');
    for (const p of posts) {
      const zone = zoneAt(p.x, p.y);
      linkRow(
        linkage,
        zone?.name ?? 'Open world',
        `${p.x}, ${p.y}`,
        zone ? () => window.open(`/editor.html?zone=${zone.id}`, '_blank') : null,
      );
    }
    const lootTables = draft.combat?.loot ?? [];
    linkHead(linkage, 'prefab', 'Drops', lootTables.length);
    if (lootTables.length === 0) emptyLink(linkage, 'No combat loot.');
    for (const t of lootTables) linkRow(linkage, t, '', () => setSection('loot', t));
    if (draft.shop) {
      const shop = SHOPS.get(draft.shop);
      linkHead(linkage, 'structure', 'Sells', shop?.stock.length ?? 0);
      linkRow(linkage, shop?.name ?? draft.shop, `${shop?.stock.length ?? '?'} wares`, null);
    }
    if (draft.dialogue) {
      linkHead(linkage, 'actor', 'Speaks');
      linkRow(linkage, draft.dialogue, 'dialogue tree', null);
    }

    // The throat's voice — bank slots filled, and the door to fill them.
    const bank = state.voice?.banks.find(
      (b) => b.owner.kind === 'actor' && b.owner.id === draft.id,
    );
    const slotCount = bank ? Object.keys(bank.slots).length : 0;
    const clipCount = bank
      ? Object.values(bank.slots).reduce((n, entries) => n + (entries?.length ?? 0), 0)
      : 0;
    linkHead(linkage, 'speech', 'Voice', clipCount);
    const voiceBtn = el('button', 'link-row') as HTMLButtonElement;
    voiceBtn.textContent = bank
      ? `${slotCount} slot${slotCount === 1 ? '' : 's'} filled (${Object.keys(bank.slots).join(', ')}) — open the bank`
      : 'silent — give this throat its fallback quips';
    voiceBtn.onclick = () => setSection('voice', 'banks');
    linkage.appendChild(voiceBtn);
  };
  build();
}

// --------------------------------------------------------------- items

function itemDetail(body: HTMLElement, linkage: HTMLElement, id: string): void {
  const item = state.items.find((i) => i.id === id);
  if (!item) return;
  const img = document.createElement('img');
  img.src = itemIconUrl(id, 72);
  img.width = 72;
  img.height = 72;
  img.style.borderRadius = '10px';
  img.style.background = 'var(--panel-2)';
  img.style.padding = '6px';
  body.appendChild(
    detailHead(
      img,
      item.name,
      item.id,
      [
        pill(`${item.value} coins`, 'vendor value', 'brass'),
        pill(item.stackable ? 'stacks' : 'one per slot', '', 'ink'),
        ...(item.slot ? [pill(item.slot, 'equips to', 'ink')] : []),
      ],
      false,
      true,
      () => toast('Items ship with the game build — the catalog is reference.', 3600),
      () => {},
    ),
  );
  // Hide the save/revert actions for reference entries.
  body.querySelector<HTMLElement>('.hero-actions')?.remove();
  if (item.desc) body.appendChild(sect('Description', '', el('p', 'muted', item.desc)));

  const droppedBy = state.loot.filter((t) => t.def.entries.some((e) => e.item === id));
  linkHead(linkage, 'prefab', 'Drops from', droppedBy.length);
  if (droppedBy.length === 0) emptyLink(linkage, 'No loot table pays this out.');
  for (const t of droppedBy) linkRow(linkage, t.def.id, '', () => setSection('loot', t.def.id));
  const madeBy = [...RECIPES.values()].filter((r) => r.output.item === id);
  const usedIn = [...RECIPES.values()].filter((r) => r.inputs.some((i) => i.item === id));
  linkHead(linkage, 'structure', 'Crafted by', madeBy.length);
  if (madeBy.length === 0) emptyLink(linkage, 'No recipe makes it.');
  for (const r of madeBy) linkRow(linkage, r.name, r.skill, null);
  if (usedIn.length > 0) {
    linkHead(linkage, 'structure', 'Ingredient in', usedIn.length);
    for (const r of usedIn) linkRow(linkage, r.name, r.skill, null);
  }
}

// ------------------------------------------------------------ dispatch

// ------------------------------------------------------------- POIs

export function newPoiDef(id: string): PoiDef {
  const pretty = id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    id,
    name: pretty,
    description: '',
    tiers: [1, 3],
    weight: 2,
    prefabs: state.poiPrefabIds.slice(0, 1),
    garrison: [],
  };
}

/** The cue-scatter vocabulary the bench offers (Tile enum NAMES). */
const CUE_TILES: ComboOption[] = [
  { id: 'BonePile', label: 'Bone pile', sub: 'a warning underfoot' },
  { id: 'BannerPole', label: 'Banner pole', sub: 'a claim staked' },
  { id: 'Stump', label: 'Stump', sub: 'felled timber' },
  { id: 'Campfire', label: 'Cold campfire', sub: 'someone stopped here' },
  { id: 'Rock', label: 'Boulder', sub: 'a cairn stone' },
];

function poiPrefabOptions(): ComboOption[] {
  return state.poiPrefabIds
    .slice()
    .sort()
    .map((id) => ({ id, label: id.replace(/^poi_/, '').replace(/_/g, ' '), sub: id }));
}

function poiDetail(body: HTMLElement, linkage: HTMLElement, id: string): void {
  const row = state.pois.find((p) => p.def.id === id);
  if (!row) {
    body.appendChild(el('p', 'muted empty', `No archetype '${id}'.`));
    return;
  }
  const draft: PoiDef = JSON.parse(JSON.stringify(row.def)) as PoiDef;
  const tierLaw = (t: number) => DANGER_LAWS[Math.max(0, Math.min(DANGER_LAWS.length - 1, t))]!;

  const pills = (): HTMLElement[] => [
    pill(`tiers ${draft.tiers[0]}–${draft.tiers[1]}`, 'danger tiers this archetype rolls at'),
    pill(`weight ${draft.weight}`, 'pick weight among tier-eligible archetypes', 'brass'),
    pill(`${draft.prefabs.length} prefab${draft.prefabs.length === 1 ? '' : 's'}`, 'the curated footprint pool'),
    pill(
      `musters lv ${tierLaw(draft.tiers[0]).npcLevel[0]}–${tierLaw(draft.tiers[1]).npcLevel[1]}`,
      'garrison level span across the eligible tiers (DANGER_LAWS)',
    ),
    ...(draft.chestTierBonus !== undefined
      ? [
          pill(
            `chest: ${tierLaw(draft.tiers[1] + draft.chestTierBonus).chest} at best`,
            'strongbox kind at the top tier under the chest law',
            'ok',
          ),
        ]
      : []),
    ...(draft.haven !== undefined
      ? [pill(`haven r${draft.haven.safeR}`, 'a runtime danger anchor — the lamp in the dark', 'ok')]
      : []),
    ...(draft.chestWarded ? [pill('warded chest', 'the lid holds while the garrison stands', 'brass')] : []),
    ...(draft.clearedFlag !== undefined
      ? [pill(`flag: ${draft.clearedFlag}`, 'stamped on whoever fells the last garrison body', 'brass')]
      : []),
    ...(draft.boldness !== undefined
      ? [
          pill(
            `boldness ×${draft.boldness.stages.length}${draft.boldness.satellites ? ' + satellites' : ''}`,
            'climbs rungs when discovered and left unanswered — busier, never deadlier',
            'brass',
          ),
        ]
      : []),
    // Weight-0 archetypes are EVENTS: only a frontier system stands
    // them, each with its own law. The pill names the hand that deals.
    ...(draft.weight === 0
      ? [
          pill(
            'event archetype',
            `weight 0 — never rolls on its own; ${
              {
                raider_squat: 'stood by the covetous dice at a claimed hearth (THE HEARTH WATCH)',
                road_toll: 'forked onto the townward road by an unanswered family (THE CREEP)',
                peddler_rest: "dealt by the renewal path's fortune roll (THE ROAD'S FORTUNE)",
              }[draft.id] ?? 'stood only by authored sites or frontier systems'
            }`,
            'brass',
          ),
        ]
      : []),
    ...(draft.id === 'peddler_rest'
      ? [
          pill(
            'transient — hours, not days',
            'the ember clock is stamped ON ARRIVAL (FRONTIER.peddlerLingerMs); she packs the cart and moves on',
            'ok',
          ),
        ]
      : []),
  ];

  body.appendChild(
    detailHead(
      iconWrap27(iconImg('stamp', 34)),
      draft.name,
      draft.id,
      pills(),
      row.edited,
      row.authored,
      () => void persistence.savePoiDef(draft).catch((err) => toast((err as Error).message, 5000, 'error')),
      () => void persistence.revertPoiDef(draft.id).catch((err) => toast((err as Error).message, 5000, 'error')),
    ),
  );

  // The story line — what this place IS, in the designer's words.
  const desc = textIn(draft.description ?? '', (v) => {
    draft.description = v || undefined;
  }, 'One line of story: what is this place?');
  desc.className = 'desc-line';
  body.appendChild(desc);

  // ------------------------------------------------------- territory
  const nameRow = el('div', 'form-grid2');
  const nameWrap = el('label', 'lbl', 'Name');
  nameWrap.appendChild(textIn(draft.name, (v) => (draft.name = v)));
  nameRow.appendChild(nameWrap);
  const weightWrap = el('label', 'lbl', 'Pick weight');
  weightWrap.appendChild(
    statSlider({
      label: 'weight',
      value: draft.weight,
      min: 0.5,
      max: 10,
      step: 0.5,
      note: 'pick weight among tier-eligible archetypes',
      dist: distribution(state.pois.map((p) => p.def.weight)),
      onInput: (v) => {
        draft.weight = v;
        markDirty();
      },
    }),
  );
  nameRow.appendChild(weightWrap);
  const tiersWrap = el('label', 'lbl', 'Danger tiers (min–max)');
  tiersWrap.appendChild(
    rangePair(draft.tiers[0], draft.tiers[1], 1, DANGER_LAWS.length - 1, (lo, hi) => {
      draft.tiers = [lo, hi];
      markDirty();
      rebuildLaws();
    }),
  );
  nameRow.appendChild(tiersWrap);
  const lawsBox = el('div', 'hero-pills');
  const rebuildLaws = (): void => {
    lawsBox.innerHTML = '';
    for (let t = draft.tiers[0]; t <= draft.tiers[1]; t++) {
      const law = tierLaw(t);
      lawsBox.appendChild(
        pill(
          `tier ${t}: lv ${law.npcLevel[0]}–${law.npcLevel[1]} · ${law.chest} chest · ${Math.round(law.poiChance * 100)}% cells`,
          'what DANGER_LAWS grants at this tier',
        ),
      );
    }
  };
  rebuildLaws();
  body.appendChild(
    sect(
      'Territory',
      'Where this archetype lives and how often the frontier deals it. Every number a tier grants comes from the one law table.',
      nameRow,
      lawsBox,
    ),
  );

  // ----------------------------------------------------- prefab pool
  const poolGrid = el('div', 'poi-pool');
  const rebuildPool = (): void => {
    poolGrid.innerHTML = '';
    for (const [i, pid] of draft.prefabs.entries()) {
      const card = el('div', 'poi-card');
      const stage = el('div', 'poi-card-pic');
      stage.appendChild(el('span', 'muted', '…'));
      card.appendChild(stage);
      void fetchPrefab(pid)
        .then((json) => {
          const def = prefabFromJson(json);
          const layers = prefabLayers(def);
          const canvas = renderLayersPreview(layers, 132);
          drawPreviewPins(
            canvas,
            layers,
            def.spawns.map((s) => ({ dx: s.dx, dy: s.dy, color: '#d96f6f' })),
            132,
          );
          stage.innerHTML = '';
          stage.appendChild(canvas);
          meta.textContent = `${def.width}×${def.height} · ${def.spawns.length} hand-placed`;
        })
        .catch(() => {
          stage.innerHTML = '';
          stage.appendChild(el('span', 'muted', 'missing from the library'));
        });
      card.appendChild(el('b', '', pid));
      const meta = el('span', 'muted', '…');
      card.appendChild(meta);
      const rm = el('button', 'danger sm', 'Remove') as HTMLButtonElement;
      rm.disabled = draft.prefabs.length <= 1;
      rm.title = rm.disabled ? 'A pool needs at least one prefab' : 'Drop this variant from the pool';
      rm.onclick = () => {
        draft.prefabs = draft.prefabs.filter((_, j) => j !== i);
        markDirty();
        rebuildPool();
      };
      card.appendChild(rm);
      poolGrid.appendChild(card);
    }
    const adder = el('div', 'poi-card add');
    adder.appendChild(
      combobox(
        () => poolPrefabChoices(),
        undefined,
        (pid) => {
          draft.prefabs = [...draft.prefabs, pid];
          markDirty();
          rebuildPool();
        },
        'Add a prefab…',
      ),
    );
    adder.appendChild(
      el('p', 'muted', 'Capture new footprints in Map Studio — “Save selection as prefab”. The pool picks per-site by hash.'),
    );
    poolGrid.appendChild(adder);
  };
  const poolPrefabChoices = (): ComboOption[] =>
    poiPrefabOptions().filter((o) => !draft.prefabs.includes(o.id));
  rebuildPool();
  body.appendChild(
    sect(
      'Footprint pool',
      'Hand-authored prefabs this archetype stands on — curated variety, hash-picked per site. Red pins are the prefab’s own hand-placed spawns.',
      poolGrid,
    ),
  );

  // -------------------------------------------------------- garrison
  const garrisonBox = el('div', 'poi-garrison');
  const rebuildGarrison = (): void => {
    garrisonBox.innerHTML = '';
    draft.garrison.forEach((g, gi) => {
      const grow = el('div', 'poi-grow');
      const npcPick = combobox(npcOptions, g.npc, (npc) => {
        patchG(gi, { npc });
      });
      grow.appendChild(npcPick);
      const roleSeg = el('div', 'seg-row mini-seg');
      for (const role of ['holdfast', 'sentry'] as const) {
        const b = el('button', 'opt-btn' + (g.role === role ? ' active' : ''), role) as HTMLButtonElement;
        b.title =
          role === 'holdfast'
            ? 'Lives inside the footprint, clustered at the heart'
            : 'Posted on the approach ring outside — the tell';
        b.onclick = () => patchG(gi, { role, ...(role === 'holdfast' ? { patrol: undefined } : {}) }, true);
        roleSeg.appendChild(b);
      }
      grow.appendChild(roleSeg);
      if (g.role === 'sentry') {
        grow.appendChild(
          featureChip('patrols', g.patrol === true, 'Paces the whole perimeter ring instead of holding one post', (on) =>
            patchG(gi, { patrol: on || undefined }, true),
          ),
        );
      }
      const countWrap = el('label', 'lbl', 'count');
      countWrap.appendChild(
        rangePair(g.count[0], g.count[1], 0, 12, (lo, hi) => patchG(gi, { count: [lo, hi] })),
      );
      grow.appendChild(countWrap);
      const tierWrap = el('label', 'lbl', 'from tier');
      const tierIn = numIn(g.minTier ?? draft.tiers[0], (v) =>
        patchG(gi, { minTier: v <= draft.tiers[0] ? undefined : v }),
      );
      tierIn.min = String(draft.tiers[0]);
      tierIn.max = String(draft.tiers[1]);
      tierWrap.appendChild(tierIn);
      grow.appendChild(tierWrap);
      const offWrap = el('label', 'lbl', '+levels');
      offWrap.appendChild(
        numIn(g.levelOffset ?? 0, (v) => patchG(gi, { levelOffset: v > 0 ? v : undefined })),
      );
      grow.appendChild(offWrap);
      const nameWrap2 = el('label', 'lbl', 'named');
      nameWrap2.appendChild(
        textIn(g.name ?? '', (v) => patchG(gi, { name: v || undefined }), 'champion name…'),
      );
      grow.appendChild(nameWrap2);
      const poolWrap = el('label', 'lbl', 'name pool (comma-sep, count 1–1)');
      const poolIn = textIn(
        (g.names ?? []).join(', '),
        (v) => {
          const names = v.split(',').map((s) => s.trim()).filter(Boolean);
          patchG(gi, { names: names.length > 0 ? names : undefined });
        },
        'Korga Hillbreaker, Old Mawfist…',
      );
      poolIn.title =
        'The site hash crowns ONE stable name per site from this pool — the hill has always been Korga’s. Wins over “named”; needs count [1, 1].';
      poolWrap.appendChild(poolIn);
      grow.appendChild(poolWrap);
      const hoursWrap = el('label', 'lbl', 'hours (empty = always)');
      const hoursPair = el('div', 'pair tight');
      const mkHour = (which: 'from' | 'to'): HTMLInputElement => {
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.step = '0.5';
        inp.min = '0';
        inp.max = '23.5';
        inp.placeholder = which;
        inp.title =
          'Game-clock activity window [0–24); from > to wraps midnight (night = 20.5 → 5.5). ' +
          'Outside it the entry neither spawns nor stays.';
        inp.value = g.hours ? String(g.hours[which]) : '';
        inp.oninput = () => {
          const f = Number(fromIn.value);
          const t = Number(toIn.value);
          if (
            fromIn.value !== '' && toIn.value !== '' &&
            Number.isFinite(f) && Number.isFinite(t) &&
            f >= 0 && f < 24 && t >= 0 && t < 24 && f !== t
          ) {
            patchG(gi, { hours: { from: f, to: t } });
          } else {
            patchG(gi, { hours: undefined });
          }
        };
        return inp;
      };
      const fromIn = mkHour('from');
      const toIn = mkHour('to');
      hoursPair.append(fromIn, toIn);
      hoursWrap.appendChild(hoursPair);
      grow.appendChild(hoursWrap);
      const del = el('button', 'danger sm', '✕') as HTMLButtonElement;
      del.title = 'Remove this muster entry';
      del.onclick = () => {
        draft.garrison = draft.garrison.filter((_, j) => j !== gi);
        markDirty();
        rebuildGarrison();
      };
      grow.appendChild(del);
      garrisonBox.appendChild(grow);
    });
    const add = el('button', 'sm', '+ muster entry') as HTMLButtonElement;
    add.onclick = () => {
      draft.garrison = [
        ...draft.garrison,
        { npc: state.npcs[0]?.def.id ?? 'goblin', count: [1, 2], role: 'holdfast' },
      ];
      markDirty();
      rebuildGarrison();
    };
    garrisonBox.appendChild(add);
  };
  const patchG = (gi: number, patch: Partial<PoiGarrisonEntry>, rebuild = false): void => {
    const next = draft.garrison.slice();
    const merged = { ...next[gi]!, ...patch } as PoiGarrisonEntry & Record<string, unknown>;
    for (const k of Object.keys(merged)) {
      if (merged[k] === undefined) delete merged[k];
    }
    next[gi] = merged;
    draft.garrison = next;
    markDirty();
    // Rebuilding mid-keystroke drops input focus — only structural
    // changes (role/patrol swap the row's chips) re-render the list.
    if (rebuild) rebuildGarrison();
  };
  rebuildGarrison();
  body.appendChild(
    sect(
      'Garrison',
      'The muster recipe. Levels come from the tier band; holdfasts cluster at the heart, sentries take the townward ring — patrollers pace the whole of it.',
      garrisonBox,
    ),
  );

  // ------------------------------------------------ the boldness ladder
  // Phase-2 frontier law: a DISCOVERED, unanswered site climbs rungs on
  // a real-day clock — each rung ADDS muster and dressing (the
  // frequency law: never levels past the base garrison's own ceiling;
  // the validator refuses more). Rungs are cumulative.
  const boldBox = el('div', 'poi-garrison');
  const parseScatter = (v: string): Array<{ tile: string; count: number }> =>
    v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [tile, n] = s.split(':').map((p) => p.trim());
        return { tile: tile ?? '', count: Math.max(1, Number.parseInt(n ?? '1', 10) || 1) };
      })
      .filter((s) => s.tile.length > 0);
  const rebuildBoldness = (): void => {
    boldBox.innerHTML = '';
    const b = draft.boldness;
    if (!b) {
      const arm = el('button', 'sm', '+ give this archetype a boldness ladder') as HTMLButtonElement;
      arm.title =
        'Discovered, unanswered sites climb rungs over real days — busier muster, wider dressing, never a deadlier band.';
      arm.onclick = () => {
        draft.boldness = {
          stages: [
            { garrison: [{ npc: draft.garrison[0]?.npc ?? 'goblin', count: [1, 2], role: 'holdfast' }] },
          ],
        };
        markDirty();
        rebuildBoldness();
      };
      boldBox.appendChild(arm);
      return;
    }
    b.stages.forEach((st, si) => {
      const rung = el('div', 'poi-grow');
      rung.appendChild(el('span', 'lbl', `rung ${si + 1}`));
      const rows = el('div', 'poi-garrison');
      (st.garrison ?? []).forEach((g, gi) => {
        const grow = el('div', 'poi-grow');
        grow.appendChild(combobox(npcOptions, g.npc, (npc) => patchBold(si, gi, { npc })));
        const roleSeg = el('div', 'seg-row mini-seg');
        for (const role of ['holdfast', 'sentry'] as const) {
          const btn = el('button', 'opt-btn' + (g.role === role ? ' active' : ''), role) as HTMLButtonElement;
          btn.onclick = () =>
            patchBold(si, gi, { role, ...(role === 'holdfast' ? { patrol: undefined } : {}) }, true);
          roleSeg.appendChild(btn);
        }
        grow.appendChild(roleSeg);
        if (g.role === 'sentry') {
          grow.appendChild(
            featureChip('patrols', g.patrol === true, 'Paces the perimeter ring', (on) =>
              patchBold(si, gi, { patrol: on || undefined }, true),
            ),
          );
        }
        const countWrap = el('label', 'lbl', 'count');
        countWrap.appendChild(
          rangePair(g.count[0], g.count[1], 0, 12, (lo, hi) => patchBold(si, gi, { count: [lo, hi] })),
        );
        grow.appendChild(countWrap);
        const tierWrap = el('label', 'lbl', 'from tier');
        tierWrap.appendChild(
          numIn(g.minTier ?? draft.tiers[0], (v) =>
            patchBold(si, gi, { minTier: v <= draft.tiers[0] ? undefined : v }),
          ),
        );
        grow.appendChild(tierWrap);
        const offWrap = el('label', 'lbl', '+levels (≤ base cap)');
        offWrap.appendChild(
          numIn(g.levelOffset ?? 0, (v) => patchBold(si, gi, { levelOffset: v > 0 ? v : undefined })),
        );
        grow.appendChild(offWrap);
        const del = el('button', 'danger sm', '✕') as HTMLButtonElement;
        del.onclick = () => {
          mutateStage(si, (s) => ({
            ...s,
            garrison: (s.garrison ?? []).filter((_, j) => j !== gi),
          }));
          rebuildBoldness();
        };
        grow.appendChild(del);
        rows.appendChild(grow);
      });
      const addRow = el('button', 'sm', '+ rung muster') as HTMLButtonElement;
      addRow.onclick = () => {
        mutateStage(si, (s) => ({
          ...s,
          garrison: [
            ...(s.garrison ?? []),
            { npc: draft.garrison[0]?.npc ?? 'goblin', count: [1, 1], role: 'holdfast' as const },
          ],
        }));
        rebuildBoldness();
      };
      rows.appendChild(addRow);
      rung.appendChild(rows);
      const scWrap = el('label', 'lbl', 'extra scatter (Tile:count, …)');
      const scIn = textIn(
        (st.scatter ?? []).map((s) => `${s.tile}:${s.count}`).join(', '),
        (v) => {
          const scatter = parseScatter(v);
          mutateStage(si, (s) => ({
            ...s,
            ...(scatter.length > 0 ? { scatter } : { scatter: undefined }),
          }));
        },
        'BannerPole:1, Crate:2…',
      );
      scWrap.appendChild(scIn);
      rung.appendChild(scWrap);
      const dropRung = el('button', 'danger sm', '✕ rung') as HTMLButtonElement;
      dropRung.onclick = () => {
        const stages = b.stages.filter((_, j) => j !== si);
        draft.boldness = stages.length > 0 ? { ...b, stages } : undefined;
        markDirty();
        rebuildBoldness();
      };
      rung.appendChild(dropRung);
      boldBox.appendChild(rung);
    });
    if (b.stages.length < 3) {
      const addRung = el('button', 'sm', '+ rung') as HTMLButtonElement;
      addRung.onclick = () => {
        draft.boldness = {
          ...b,
          stages: [
            ...b.stages,
            { garrison: [{ npc: draft.garrison[0]?.npc ?? 'goblin', count: [1, 1], role: 'holdfast' as const }] },
          ],
        };
        markDirty();
        rebuildBoldness();
      };
      boldBox.appendChild(addRung);
    }
    boldBox.appendChild(
      featureChip(
        'satellites',
        b.satellites === true,
        'At rung 2+ the core seeds satellite camps townward — the family dies with the core',
        (on) => {
          draft.boldness = { ...b, ...(on ? { satellites: true } : { satellites: undefined }) };
          markDirty();
          rebuildBoldness();
        },
      ),
    );
  };
  const mutateStage = (
    si: number,
    fn: (s: { garrison?: PoiGarrisonEntry[]; scatter?: Array<{ tile: string; count: number }> }) => {
      garrison?: PoiGarrisonEntry[];
      scatter?: Array<{ tile: string; count: number }> | undefined;
    },
  ): void => {
    const b = draft.boldness;
    if (!b) return;
    const stages = b.stages.map((s, j) => {
      if (j !== si) return s;
      const next = fn({
        garrison: (s.garrison ?? []).slice() as PoiGarrisonEntry[],
        scatter: s.scatter ? s.scatter.slice() : undefined,
      });
      const clean: Record<string, unknown> = {};
      if (next.garrison && next.garrison.length > 0) clean.garrison = next.garrison;
      if (next.scatter && next.scatter.length > 0) clean.scatter = next.scatter;
      return clean as typeof s;
    });
    draft.boldness = { ...b, stages };
    markDirty();
  };
  const patchBold = (
    si: number,
    gi: number,
    patch: Partial<PoiGarrisonEntry>,
    rebuild = false,
  ): void => {
    mutateStage(si, (s) => {
      const list = s.garrison ?? [];
      const merged = { ...list[gi]!, ...patch } as PoiGarrisonEntry & Record<string, unknown>;
      for (const k of Object.keys(merged)) {
        if (merged[k] === undefined) delete merged[k];
      }
      list[gi] = merged;
      return { ...s, garrison: list };
    });
    // The no-rebuild-on-keystroke law: only structural chips re-render.
    if (rebuild) rebuildBoldness();
  };
  rebuildBoldness();
  body.appendChild(
    sect(
      'The boldness ladder',
      'What the site ADDS when it stands discovered and unanswered — rungs are cumulative, climbed over real days, and never raise levels past the base garrison’s own ceiling.',
      boldBox,
    ),
  );

  // ------------------------------------------------------- strongbox
  const chestSeg = el('div', 'seg-row mini-seg');
  const chestChoices: Array<{ label: string; v: number | undefined; hint: string }> = [
    { label: 'no chest law', v: undefined, hint: 'chest tiles in the prefab stand exactly as drawn' },
    { label: 'tier law', v: 0, hint: 'chest re-keys to the tier’s own kind' },
    { label: 'law +1', v: 1, hint: 'one kind above the land — a reason to come' },
    { label: 'law +2', v: 2, hint: 'two above — the chest IS the site' },
  ];
  const rebuildChest = (): void => {
    chestSeg.innerHTML = '';
    for (const c of chestChoices) {
      const b = el('button', 'opt-btn' + (draft.chestTierBonus === c.v ? ' active' : ''), c.label) as HTMLButtonElement;
      b.title = c.hint;
      b.onclick = () => {
        draft.chestTierBonus = c.v;
        markDirty();
        rebuildChest();
      };
      chestSeg.appendChild(b);
    }
  };
  rebuildChest();
  const chestExtras = el('div', 'form-grid2');
  const lootWrap = el('label', 'lbl', 'Loot override (empty = the chest kind’s own table)');
  lootWrap.appendChild(
    combobox(
      () => [
        { id: '', label: '— the chest kind’s own table —' },
        ...state.loot.map((t) => ({ id: t.def.id, label: t.def.id, sub: t.def.desc })),
      ],
      draft.chestLoot ?? '',
      (v) => {
        draft.chestLoot = v || undefined;
        markDirty();
      },
      'chest table…',
    ),
  );
  chestExtras.appendChild(lootWrap);
  const wardWrap = el('div', 'lbl');
  wardWrap.appendChild(
    featureChip(
      'warded while the garrison stands',
      draft.chestWarded === true,
      'The lid will not lift while any garrison body of the site lives — the champion’s cache cannot be sneaked out from under him',
      (on) => {
        draft.chestWarded = on || undefined;
        markDirty();
      },
    ),
  );
  chestExtras.appendChild(wardWrap);
  body.appendChild(
    sect(
      'Strongbox law',
      'How the prefab’s chest re-keys against the danger tier — and what it pays. Danger adds its level floor and rarity bonus at open time either way.',
      chestSeg,
      chestExtras,
    ),
  );

  // ------------------------------------------------------------ cues
  const cuesBox = el('div', 'poi-cues');
  const cues = (): NonNullable<PoiDef['cues']> => (draft.cues ??= {});
  const tidyCues = (): void => {
    if (draft.cues && Object.values(draft.cues).every((v) => v === undefined || (Array.isArray(v) && v.length === 0))) {
      draft.cues = undefined;
    }
  };
  const rebuildCues = (): void => {
    cuesBox.innerHTML = '';
    const rowTop = el('div', 'form-grid2');
    const clearWrap = el('label', 'lbl', 'Felled clearing (tiles past the footprint; 0 = none)');
    clearWrap.appendChild(
      statSlider({
        label: 'clearing',
        value: draft.cues?.clearing ?? 0,
        min: 0,
        max: 10,
        step: 1,
        unit: 'tiles',
        note: 'forest this far past the footprint is cut to stumps',
        onInput: (v) => {
          if (v >= 1) cues().clearing = v;
          else if (draft.cues) draft.cues.clearing = undefined;
          tidyCues();
          markDirty();
        },
      }),
    );
    rowTop.appendChild(clearWrap);
    const chipWrap = el('div', 'lbl');
    chipWrap.appendChild(
      featureChip(
        'worn approach path',
        draft.cues?.approachPath === true,
        'A dirt stub worn outward on the townward bearing — the way players come',
        (on) => {
          if (on) cues().approachPath = true;
          else if (draft.cues) draft.cues.approachPath = undefined;
          tidyCues();
          markDirty();
        },
      ),
    );
    rowTop.appendChild(chipWrap);
    cuesBox.appendChild(rowTop);
    const scatterList = el('div');
    (draft.cues?.scatter ?? []).forEach((sc, si) => {
      const srow = el('div', 'poi-grow');
      srow.appendChild(
        combobox(
          () => CUE_TILES,
          sc.tile,
          (tile) => {
            const next = (draft.cues?.scatter ?? []).slice();
            next[si] = { ...next[si]!, tile };
            cues().scatter = next;
            markDirty();
            rebuildCues();
          },
        ),
      );
      const cWrap = el('label', 'lbl', 'count');
      cWrap.appendChild(
        numIn(sc.count, (v) => {
          const next = (draft.cues?.scatter ?? []).slice();
          next[si] = { ...next[si]!, count: Math.max(1, Math.min(8, v)) };
          cues().scatter = next;
          markDirty();
        }),
      );
      srow.appendChild(cWrap);
      const del = el('button', 'danger sm', '✕') as HTMLButtonElement;
      del.onclick = () => {
        const next = (draft.cues?.scatter ?? []).filter((_, j) => j !== si);
        if (next.length > 0) cues().scatter = next;
        else if (draft.cues) draft.cues.scatter = undefined;
        tidyCues();
        markDirty();
        rebuildCues();
      };
      srow.appendChild(del);
      scatterList.appendChild(srow);
    });
    const addScatter = el('button', 'sm', '+ cue scatter') as HTMLButtonElement;
    addScatter.onclick = () => {
      cues().scatter = [...(draft.cues?.scatter ?? []), { tile: 'BonePile', count: 2 }];
      markDirty();
      rebuildCues();
    };
    scatterList.appendChild(addScatter);
    cuesBox.appendChild(scatterList);
  };
  rebuildCues();
  body.appendChild(
    sect(
      'Approach cues',
      'The warning vocabulary stamped OUTSIDE the footprint — a player should read the site before they’re in it. Cues only ever replace natural ground.',
      cuesBox,
    ),
  );

  // ------------------------------------------- the friendly lights
  const lightsBox = el('div', 'poi-cues');
  const actorOptions = (): ComboOption[] =>
    state.actors.map((a) => ({
      id: a.def.id,
      label: a.def.name,
      sub: a.def.title ?? a.def.disposition,
    }));
  const patchA = (
    ai: number,
    patch: Partial<NonNullable<PoiDef['actors']>[number]>,
    rebuild = false,
  ): void => {
    const next = (draft.actors ?? []).slice();
    const merged = { ...next[ai]!, ...patch } as NonNullable<PoiDef['actors']>[number] &
      Record<string, unknown>;
    for (const k of Object.keys(merged)) {
      if (merged[k] === undefined) delete merged[k];
    }
    next[ai] = merged;
    draft.actors = next;
    markDirty();
    if (rebuild) rebuildLights();
  };
  const rebuildLights = (): void => {
    lightsBox.innerHTML = '';
    const topRow = el('div', 'form-grid2');
    const havenWrap = el('div', 'lbl');
    havenWrap.appendChild(
      featureChip(
        'haven — the lamp in the dark',
        draft.haven !== undefined,
        'A materialized site becomes a runtime danger anchor: tier 0 inside safeR, graded relief on the rim. Civilization pushes the field back.',
        (on) => {
          draft.haven = on ? { safeR: 18 } : undefined;
          markDirty();
          rebuildLights();
        },
      ),
    );
    topRow.appendChild(havenWrap);
    if (draft.haven) {
      const rWrap = el('label', 'lbl', 'Lamplight radius (tiles of tier-0 calm)');
      rWrap.appendChild(
        statSlider({
          label: 'safeR',
          value: draft.haven.safeR,
          min: 6,
          max: 40,
          step: 1,
          unit: 'tiles',
          note: 'the relief rim extends ~48 tiles past this edge, then the dark closes in again',
          onInput: (v) => {
            draft.haven = { safeR: v };
            markDirty();
          },
        }),
      );
      topRow.appendChild(rWrap);
    }
    lightsBox.appendChild(topRow);
    (draft.actors ?? []).forEach((a, ai) => {
      const arow = el('div', 'poi-grow');
      const poolLbl = el('label', 'lbl', 'identity pool (comma-sep slugs)');
      const poolIn = textIn(
        a.pool.join(', '),
        (v) => {
          const pool = v.split(',').map((s) => s.trim()).filter(Boolean);
          if (pool.length > 0) patchA(ai, { pool });
        },
        'wayfarer_senna, wayfarer_dray…',
      );
      poolIn.title = 'Actor slugs — the site hash picks ONE identity per entry, stable per site.';
      poolLbl.appendChild(poolIn);
      arow.appendChild(poolLbl);
      const addPick = combobox(
        () => actorOptions().filter((o) => !a.pool.includes(o.id)),
        undefined,
        (slug) => patchA(ai, { pool: [...a.pool, slug] }, true),
        '+ add to pool…',
      );
      arow.appendChild(addPick);
      const postSeg = el('div', 'seg-row mini-seg');
      for (const post of ['hearth', 'watch'] as const) {
        const b = el('button', 'opt-btn' + (a.post === post ? ' active' : ''), post) as HTMLButtonElement;
        b.title =
          post === 'hearth'
            ? 'Stands beside the fire at the heart of the site'
            : 'Posted on the approach ring, facing the townward road';
        b.onclick = () => patchA(ai, { post }, true);
        postSeg.appendChild(b);
      }
      arow.appendChild(postSeg);
      const routineLbl = el('label', 'lbl', 'routine (optional)');
      routineLbl.appendChild(
        textIn(a.routine ?? '', (v) => patchA(ai, { routine: v || undefined }), 'waystation_keeper…'),
      );
      arow.appendChild(routineLbl);
      const del = el('button', 'danger sm', '✕') as HTMLButtonElement;
      del.title = 'Remove this staff entry';
      del.onclick = () => {
        const next = (draft.actors ?? []).filter((_, j) => j !== ai);
        draft.actors = next.length > 0 ? next : undefined;
        markDirty();
        rebuildLights();
      };
      arow.appendChild(del);
      lightsBox.appendChild(arow);
    });
    const addStaff = el('button', 'sm', '+ staff entry') as HTMLButtonElement;
    addStaff.onclick = () => {
      const first = state.actors[0]?.def.id ?? 'wayfarer_senna';
      draft.actors = [...(draft.actors ?? []), { pool: [first], post: 'hearth' }];
      markDirty();
      rebuildLights();
    };
    lightsBox.appendChild(addStaff);
    const flagWrap = el('label', 'lbl', 'Cleared flag (set on the player who fells the last garrison body)');
    flagWrap.appendChild(
      textIn(
        draft.clearedFlag ?? '',
        (v) => {
          draft.clearedFlag = v || undefined;
          markDirty();
        },
        'poi_warcamp_broken…',
      ),
    );
    lightsBox.appendChild(flagWrap);
  };
  rebuildLights();
  body.appendChild(
    sect(
      'The friendly lights',
      'The civilized grammar: staff placed semantically (keeper by the fire, watch on the townward ring), the haven lamp that pushes the danger field back, and the story flag a full clear stamps on the ledger.',
      lightsBox,
    ),
  );

  // ------------------------------------------- the frontier survey
  const surveyBox = el('div');
  const surveyBtn = el('button', 'sm', 'Survey 300 cells') as HTMLButtonElement;
  const runSurvey = async (): Promise<void> => {
    surveyBtn.disabled = true;
    surveyBtn.textContent = 'Surveying…';
    try {
      const stats = await surveyFrontier(draft, 300);
      surveyBox.innerHTML = '';
      const pillsRow = el('div', 'hero-pills');
      pillsRow.appendChild(
        pill(`${stats.sites} sites / ${stats.evaluated} frontier cells`, 'the real scaffold, fresh scan, draft included'),
      );
      const mine = stats.byDef[draft.id]?.count ?? 0;
      pillsRow.appendChild(
        pill(
          `${mine} of them this archetype (${stats.sites > 0 ? Math.round((mine / stats.sites) * 100) : 0}%)`,
          'share of all rolled sites',
          mine > 0 ? 'ok' : 'danger',
        ),
      );
      surveyBox.appendChild(pillsRow);
      const maxCount = Math.max(1, ...Object.values(stats.byDef).map((r) => r.count));
      for (const [did, rec] of Object.entries(stats.byDef).sort((a, b) => b[1].count - a[1].count)) {
        surveyBox.appendChild(
          bar(did === draft.id ? `${did} (this)` : did, rec.count, maxCount, did === draft.id ? '#d9a441' : '#8a94a8', `${rec.count}`),
        );
      }
      const rec = stats.byDef[draft.id];
      if (rec) {
        const tierRow = el('div', 'hero-pills');
        for (const [t, c] of Object.entries(rec.tiers).sort()) {
          tierRow.appendChild(pill(`tier ${t}: ${c}`, 'sites rolled at this tier'));
        }
        for (const [pid, c] of Object.entries(rec.prefabs).sort((a, b) => b[1] - a[1])) {
          tierRow.appendChild(pill(`${pid.replace(/^poi_/, '')}: ${c}`, 'variant frequency', 'brass'));
        }
        surveyBox.appendChild(tierRow);
      }
    } catch (err) {
      surveyBox.innerHTML = '';
      surveyBox.appendChild(el('p', 'muted empty', (err as Error).message));
    }
    surveyBtn.disabled = false;
    surveyBtn.textContent = 'Survey 300 cells';
  };
  surveyBtn.onclick = () => void runSurvey();
  body.appendChild(
    sect(
      'The frontier survey',
      'Observed, not computed: the server runs the REAL cell scaffold over a fresh scan with your unsaved draft riding along.',
      surveyBtn,
      surveyBox,
    ),
  );
  void runSurvey();

  // ------------------------------------------------------ the stage
  const stageBox = el('div', 'poi-stage');
  const stageSeg = el('div', 'seg-row mini-seg');
  let stageTier = draft.tiers[1];
  const rebuildStageSeg = (): void => {
    stageSeg.innerHTML = '';
    for (let t = draft.tiers[0]; t <= draft.tiers[1]; t++) {
      const b = el('button', 'opt-btn' + (t === stageTier ? ' active' : ''), `tier ${t}`) as HTMLButtonElement;
      b.onclick = () => {
        stageTier = t;
        rebuildStageSeg();
        void runStage();
      };
      stageSeg.appendChild(b);
    }
  };
  /** One composed rung painted small — the ladder view's column. */
  const stageColumn = async (stage: number): Promise<HTMLElement> => {
    const col = el('div', 'poi-stage-col');
    const shown = await stagePoi({ draft, tier: stageTier, stage });
    const zone = zoneFromJson(shown.zone);
    const layers: PreviewLayers = {
      width: zone.width,
      height: zone.height,
      ground: zone.ground,
      detail: zone.detail,
      elev: zone.elev,
    };
    const canvas = renderLayersPreview(layers, 190);
    drawPreviewPins(
      canvas,
      layers,
      [
        ...(zone.spawns ?? []).map((s) => ({
          dx: Math.floor(s.x - zone.origin.x),
          dy: Math.floor(s.y - zone.origin.y),
          color: s.patrol ? '#6fb2d9' : '#d96f6f',
        })),
        ...(zone.actorSpawns ?? []).map((a) => ({
          dx: Math.floor(a.x - zone.origin.x),
          dy: Math.floor(a.y - zone.origin.y),
          color: '#7fca6f',
        })),
      ],
      190,
    );
    col.appendChild(canvas);
    const bodies = (zone.spawns ?? []).reduce((n, s) => n + s.count, 0);
    col.appendChild(
      pill(
        `stage ${stage} · ${bodies} bod${bodies === 1 ? 'y' : 'ies'}`,
        stage === 0
          ? 'the base camp, exactly as it first stands'
          : `rung ${stage}: the same base camp bit-for-bit, plus its reinforcements (the frequency law)`,
        stage === 0 ? 'ink' : 'brass',
      ),
    );
    return col;
  };

  const runStage = async (): Promise<void> => {
    stageBox.innerHTML = '';
    stageBox.appendChild(el('p', 'muted', 'Composing a real site…'));
    // THE LADDER VIEW: a boldness-bearing archetype renders every rung
    // side by side — four pure composePoi calls, the base camp visibly
    // identical in each (the prefix-stability law, seen not trusted).
    const rungCount = draft.boldness ? Math.min(3, draft.boldness.stages.length) : 0;
    if (rungCount > 0) {
      try {
        const cols = await Promise.all(
          Array.from({ length: rungCount + 1 }, (_, s) => stageColumn(s)),
        );
        stageBox.innerHTML = '';
        const ladder = el('div', 'poi-stage-ladder');
        for (const col of cols) ladder.appendChild(col);
        stageBox.appendChild(ladder);
        stageBox.appendChild(
          el(
            'p',
            'muted',
            'The boldness ladder at this tier, stage 0 → ' +
              `${rungCount}. Rungs only ever ADD — the base muster never reshuffles. ` +
              'Blue pins patrol; red hold; green are friendly staff.',
          ),
        );
      } catch (err) {
        stageBox.innerHTML = '';
        stageBox.appendChild(el('p', 'muted empty', (err as Error).message));
      }
      return;
    }
    try {
      const shown = await stagePoi({ draft, tier: stageTier });
      const zone = zoneFromJson(shown.zone);
      const layers: PreviewLayers = {
        width: zone.width,
        height: zone.height,
        ground: zone.ground,
        detail: zone.detail,
        elev: zone.elev,
      };
      const canvas = renderLayersPreview(layers, 340);
      const pins = [
        ...(zone.spawns ?? []).map((s) => ({
          dx: Math.floor(s.x - zone.origin.x),
          dy: Math.floor(s.y - zone.origin.y),
          color: s.patrol ? '#6fb2d9' : '#d96f6f',
        })),
        ...(zone.actorSpawns ?? []).map((a) => ({
          dx: Math.floor(a.x - zone.origin.x),
          dy: Math.floor(a.y - zone.origin.y),
          color: '#7fca6f',
        })),
      ];
      drawPreviewPins(canvas, layers, pins, 340);
      stageBox.innerHTML = '';
      stageBox.appendChild(canvas);
      const muster = el('div', 'hero-pills');
      for (const s of zone.spawns ?? []) {
        const base = state.npcs.find((n) => n.def.id === s.npc);
        const hourNote = s.hours ? ` · ${s.hours.from}–${s.hours.to}h` : '';
        const label = `${s.name ?? base?.def.name ?? s.npc} lv ${s.level ?? '?'}${s.count > 1 ? ` ×${s.count}` : ''}${hourNote}`;
        muster.appendChild(
          pill(
            label,
            (s.patrol ? 'patrols the perimeter ring' : 'holds its ground') +
              (s.hours ? ` — keeps hours ${s.hours.from}–${s.hours.to}` : ''),
            s.patrol ? 'brass' : 'ink',
          ),
        );
      }
      for (const a of zone.actorSpawns ?? []) {
        const who = state.actors.find((x) => x.def.id === a.actor);
        muster.appendChild(
          pill(
            `${who?.def.name ?? a.actor}${a.routine ? ` · ${a.routine}` : ''}`,
            'friendly staff — identity, disposition, dialogue, and shop all ride the actor laws',
            'ok',
          ),
        );
      }
      stageBox.appendChild(muster);
      stageBox.appendChild(
        el(
          'p',
          'muted',
          `A real site at cell ${shown.site.cellX},${shown.site.cellY} — ${shown.site.prefabId}, anchor ${shown.site.anchorX},${shown.site.anchorY}. Blue pins patrol; red hold; green are friendly staff.`,
        ),
      );
    } catch (err) {
      stageBox.innerHTML = '';
      stageBox.appendChild(el('p', 'muted empty', (err as Error).message));
    }
  };
  rebuildStageSeg();
  body.appendChild(
    sect(
      'The stage',
      'One honest composed site at a chosen tier — footprint, cues, chest law, muster, and the sentry ring, exactly as the world would stand it up.',
      stageSeg,
      stageBox,
    ),
  );
  void runStage();

  // --------------------------------------------------------- linkage
  const standing = state.zones.filter((z) => z.id.startsWith('poi:') && z.name === draft.name);
  linkHead(linkage, 'stamp', 'Standing sites', standing.length);
  if (standing.length === 0) {
    emptyLink(linkage, 'No materialized sites in the loaded world right now — walk the frontier or /poi here.');
  } else {
    for (const z of standing) {
      linkRow(linkage, z.id, `${z.origin.x},${z.origin.y} · ${z.width}×${z.height}`, () => {
        window.open(`/editor.html?zone=${encodeURIComponent(z.id)}`, '_blank');
      });
    }
  }
  linkHead(linkage, 'cluster', 'Garrison kinds', draft.garrison.length);
  if (draft.garrison.length === 0) emptyLink(linkage, 'No muster entries yet.');
  for (const g of draft.garrison) {
    const base = state.npcs.find((n) => n.def.id === g.npc);
    linkRow(
      linkage,
      base?.def.name ?? g.npc,
      `${g.role}${g.patrol ? ' · patrols' : ''}${g.minTier !== undefined ? ` · tier ${g.minTier}+` : ''}`,
      base ? () => setSection('npcs', g.npc) : null,
      base ? (() => { const c = creatureRender(base.def, 26); c.className = 'ico'; return c; })() : undefined,
    );
  }
  const staffSlugs = [...new Set((draft.actors ?? []).flatMap((a) => [...a.pool]))];
  if (staffSlugs.length > 0) {
    linkHead(linkage, 'person', 'Friendly staff', staffSlugs.length);
    for (const slug of staffSlugs) {
      const who = state.actors.find((x) => x.def.id === slug);
      linkRow(
        linkage,
        who?.def.name ?? slug,
        who?.def.title ?? 'actor',
        who ? () => setSection('actors', slug) : null,
      );
    }
  }
}

function iconWrap27(img: HTMLElement): HTMLElement {
  const wrap = el('div', 'poi-hero-glyph');
  wrap.appendChild(img);
  return wrap;
}

export function buildDetail(body: HTMLElement, linkage: HTMLElement): void {
  body.innerHTML = '';
  linkage.innerHTML = '';
  const id = state.selectedId;
  if (!id) {
    const empty = el('div', 'empty-state');
    const inner = el('div');
    inner.appendChild(
      el('p', 'muted', 'Pick an entry on the left — or create a new one. Every save validates, lands in the database, and goes live in the running world.'),
    );
    empty.appendChild(inner);
    body.appendChild(empty);
    return;
  }
  if (state.section === 'npcs') npcDetail(body, linkage, id);
  else if (state.section === 'loot') lootDetail(body, linkage, id);
  else if (state.section === 'actors') actorDetail(body, linkage, id);
  else if (state.section === 'dialogues') dialogueDetail(body, linkage, id);
  else if (state.section === 'pois') poiDetail(body, linkage, id);
  else if (state.section === 'frontier') frontierDetail(body, linkage);
  else if (state.section === 'factions') factionsDetail(body, linkage);
  else if (state.section === 'voice') voiceDetail(body, linkage, id);
  else itemDetail(body, linkage, id);
}

// ------------------------------------------------------ the weather

/** A duration read the way a designer thinks: 45s, 12m, 3.5h, 2.1d. */
function humanMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${+(ms / 3_600_000).toFixed(1)}h`;
  return `${+(ms / 86_400_000).toFixed(1)}d`;
}

/**
 * THE WEATHER BENCH (living-frontier Phase 6): every pacing dial of
 * the frontier, editable, with the consequences derived beside the
 * knobs — a designer reads "stage 2 in ~4 days", never "3.5e8 ms".
 * Saves validate through the one validator and steer the very next
 * frontier beat; nothing restarts, nothing reloads.
 */
function frontierDetail(body: HTMLElement, linkage: HTMLElement): void {
  const row = state.frontier;
  if (!row) {
    body.appendChild(el('p', 'muted empty', 'The dial table has not loaded — is the server up?'));
    return;
  }
  const draft: FrontierDef = {
    ...row.def,
    emberLingerMs: [...row.def.emberLingerMs] as [number, number],
    fallowMs: [...row.def.fallowMs] as [number, number],
    renewalRing: [...row.def.renewalRing] as [number, number],
    stageMs: [...row.def.stageMs] as [number, number],
    scatterLingerMs: [...row.def.scatterLingerMs] as [number, number],
    creepMs: [...row.def.creepMs] as [number, number],
    peddlerLingerMs: [...row.def.peddlerLingerMs] as [number, number],
  };

  const pills = (): HTMLElement[] => [
    pill(
      `ember ${humanMs(draft.emberLingerMs[0])}–${humanMs(draft.emberLingerMs[1])}`,
      'how long a broken camp stands as your trophy before it dissolves',
    ),
    pill(
      `stage ${draft.stageMax} in ~${humanMs(draft.stageMs[0] * draft.stageMax)}–${humanMs(draft.stageMs[1] * draft.stageMax)}`,
      'a discovered, unanswered camp at the top of its ladder',
      'brass',
    ),
    pill(
      `calm ${humanMs(draft.calmMs)}`,
      'the relax window every wipe buys the surrounding cells',
      'ok',
    ),
    pill(
      `~1 raid / ${humanMs(draft.raidChance > 0 ? draft.raidRollMs / draft.raidChance : Infinity)}`,
      'expected covetous-dice success cadence per shard (raidRollMs ÷ raidChance)',
      'brass',
    ),
    pill(
      `fortune ~1 in ${draft.peddlerChance > 0 ? Math.round(1 / draft.peddlerChance) : '∞'} credits`,
      'renewal credits that deal a peddler instead of trouble',
      'ok',
    ),
  ];
  const head = detailHead(
    iconWrap27(iconImg('stamp', 34)),
    'The Weather',
    'frontier · world',
    pills(),
    row.edited,
    true,
    () =>
      void persistence
        .saveFrontierDef(draft)
        .catch((err) => toast((err as Error).message, 5000, 'error')),
    () =>
      void persistence
        .revertFrontierDef()
        .catch((err) => toast((err as Error).message, 5000, 'error')),
  );
  body.appendChild(head);
  const refreshPills = (): void => {
    const holder = head.querySelector('.hero-pills');
    if (holder) {
      holder.innerHTML = '';
      for (const p of pills()) holder.appendChild(p);
    }
  };

  /** One dial row: label + hint, a control, and a live readout. */
  const dial = (
    label: string,
    hint: string,
    control: HTMLElement,
    readout: () => string,
  ): HTMLElement => {
    const wrap = el('div', 'frontier-dial');
    const head2 = el('div', 'frontier-dial-head');
    head2.appendChild(el('b', '', label));
    head2.appendChild(el('span', 'muted', hint));
    const out = el('span', 'pill brass', readout());
    const refresh = (): void => {
      out.textContent = readout();
      refreshPills();
    };
    (wrap as HTMLElement & { refreshReadout?: () => void }).refreshReadout = refresh;
    control.addEventListener('input', refresh);
    control.addEventListener('change', refresh);
    wrap.appendChild(head2);
    const rowEl = el('div', 'frontier-dial-row');
    rowEl.appendChild(control);
    rowEl.appendChild(out);
    wrap.appendChild(rowEl);
    return wrap;
  };

  /** A [min,max] ms band edited in a display unit (min/h/d). */
  const bandDial = (
    label: string,
    hint: string,
    key: 'emberLingerMs' | 'fallowMs' | 'stageMs' | 'scatterLingerMs' | 'creepMs' | 'peddlerLingerMs',
    unitMs: number,
    lo: number,
    hi: number,
    readout: () => string,
  ): HTMLElement =>
    dial(
      label,
      hint,
      rangePair(
        +(draft[key][0] / unitMs).toFixed(2),
        +(draft[key][1] / unitMs).toFixed(2),
        lo,
        hi,
        (a, b) => {
          draft[key] = [Math.round(a * unitMs), Math.round(b * unitMs)];
          markDirty();
        },
      ),
      readout,
    );

  /** A scalar dial edited raw (tiles, counts, chances). */
  const numDial = (
    label: string,
    hint: string,
    key: keyof FrontierDef,
    min: number,
    max: number,
    step: number,
    readout: () => string,
    unitMs = 1,
  ): HTMLElement => {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(+((draft[key as keyof FrontierDef] as number) / unitMs).toFixed(2));
    input.className = 'frontier-num';
    input.oninput = () => {
      const v = Number(input.value);
      if (Number.isFinite(v)) {
        (draft as unknown as Record<string, unknown>)[key as string] = Math.round(v * unitMs * 100) / 100;
        markDirty();
      }
    };
    return dial(label, hint, input, readout);
  };

  const MINU = 60_000;
  const HOUR = 3_600_000;
  const DAY = 86_400_000;

  body.appendChild(
    sect(
      'The ember turn',
      'A cleared camp lingers, dissolves with dignity, rests fallow, and the debt stands trouble elsewhere.',
      dial('frontier cadence', 'ticks between passes (20/s)', (() => {
        const i = document.createElement('input');
        i.type = 'number'; i.min = '20'; i.max = '12000'; i.step = '20';
        i.value = String(draft.tickTicks); i.className = 'frontier-num';
        i.oninput = () => { const v = Number(i.value); if (Number.isInteger(v)) { draft.tickTicks = v; markDirty(); } };
        return i;
      })(), () => `a beat every ${humanMs((draft.tickTicks / 20) * 1000)}`),
      bandDial('ember linger', 'the broken trophy stands (minutes)', 'emberLingerMs', MINU, 0.2, 1440,
        () => `dissolves in ${humanMs(draft.emberLingerMs[0])}–${humanMs(draft.emberLingerMs[1])}`),
      bandDial('fallow rest', 'the meadow heals (hours)', 'fallowMs', HOUR, 0.02, 336,
        () => `may host again in ${humanMs(draft.fallowMs[0])}–${humanMs(draft.fallowMs[1])}`),
      numDial('dignity', 'no stand/dissolve within this many tiles of anyone', 'dignityTiles', 8, 256, 1,
        () => `${draft.dignityTiles} tiles — past every screen`),
      dial('renewal ring', 'where the debt stands its next site (tiles from a player)',
        rangePair(draft.renewalRing[0], draft.renewalRing[1], 16, 1024, (a, b) => {
          draft.renewalRing = [a, b]; markDirty();
        }),
        () => `${draft.renewalRing[0]}–${draft.renewalRing[1]} tiles out`),
      numDial('renewal tries', 'candidate points per pass before the credit waits', 'renewalTries', 1, 64, 1,
        () => `${draft.renewalTries} tries`),
    ),
  );
  body.appendChild(
    sect(
      'The boldness ladder',
      'Discovered, unanswered camps grow busier — never deadlier — and spread townward with a destroyable heart.',
      bandDial('stage wait', 'real days per rung, after first discovery', 'stageMs', DAY, 0.001, 30,
        () => `stage ${draft.stageMax} in ~${humanMs(draft.stageMs[0] * draft.stageMax)}–${humanMs(draft.stageMs[1] * draft.stageMax)}`),
      numDial('ladder top', 'the highest rung (bounded escalation)', 'stageMax', 1, 3, 1,
        () => `stages 0–${draft.stageMax}`),
      numDial('satellite rung', 'the rung at which a core may spread', 'satelliteStage', 1, 3, 1,
        () => `spreads at stage ${draft.satelliteStage}+`),
      numDial('satellite cap', 'live satellites per core', 'satelliteMax', 0, 8, 1,
        () => `≤${draft.satelliteMax} per family`),
      bandDial('scatter linger', 'a scattered family fades (minutes)', 'scatterLingerMs', MINU, 0.2, 120,
        () => `${humanMs(draft.scatterLingerMs[0])}–${humanMs(draft.scatterLingerMs[1])}`),
      numDial('regional roof', 'stage-2+ cores per neighborhood', 'regionBoldMax', 1, 16, 1,
        () => `≤${draft.regionBoldMax} bold cores near`),
      numDial('region radius', 'neighborhood size for roofs and calm (cells)', 'regionCells', 1, 8, 1,
        () => `±${draft.regionCells} cells (${(draft.regionCells * 2 + 1) ** 2} cell area)`),
      numDial('relax window', 'quiet every wipe buys nearby (hours)', 'calmMs', 0, 168, 0.5,
        () => `${humanMs(draft.calmMs)} of real quiet`, HOUR),
    ),
  );
  body.appendChild(
    sect(
      'The town feels it',
      "Guards answer from what stands within their watch; a full family in the marches forks the road.",
      numDial('the watch', "how far a speaker's world: answers reach (tiles)", 'watchTiles', 16, 512, 1,
        () => `${draft.watchTiles} tiles of credible knowing`),
      numDial('the marches', 'town reach for tolls, relief, and peddler rumor (tiles)', 'marchTiles', 16, 1024, 1,
        () => `${draft.marchTiles} tiles — word outruns sight`),
      bandDial('creep wait', 'a full family holds this long before the toll forks (days)', 'creepMs', DAY, 0.001, 30,
        () => `forks after ${humanMs(draft.creepMs[0])}–${humanMs(draft.creepMs[1])}`),
    ),
  );
  body.appendChild(
    sect(
      'The hearth watch',
      'Claimed yards exclude the wild; the covetous dice pick ONE attended settler, rarely, mercifully.',
      numDial('base yard', "a claimed hearth's ring before any fence (tiles)", 'claimR', 4, 64, 1,
        () => `${draft.claimR}-tile yard`),
      numDial('claim reach', 'built tiles this far from the bed still grow the ring', 'claimReach', 4, 256, 1,
        () => `flood counted to ${draft.claimReach} tiles`),
      numDial('claim pad', 'padding past the farthest counted tile', 'claimPad', 0, 64, 1,
        () => `+${draft.claimPad} tiles`),
      numDial('raid roll', 'minutes between global dice rolls', 'raidRollMs', 1, 1440, 1,
        () => `a roll every ${humanMs(draft.raidRollMs)}`, MINU),
      numDial('raid chance', 'chance a roll picks anyone at all', 'raidChance', 0, 1, 0.01,
        () => `~1 raid / ${draft.raidChance > 0 ? humanMs(draft.raidRollMs / draft.raidChance) : '∞'} per shard`),
      numDial('raid quiet', 'hours of mercy after a squat is CLEARED', 'raidCooldownMs', 0, 336, 1,
        () => `${humanMs(draft.raidCooldownMs)} of quiet`, HOUR),
      numDial('loss mercy', 'hours of mercy after DYING to your coveter (the shorter stamp)', 'raidLossCooldownMs', 0, 336, 1,
        () => `${humanMs(draft.raidLossCooldownMs)} — losses earn mercy`, HOUR),
      numDial('standoff', 'the squat keeps this far past the ring edge (tiles)', 'raidStandoffTiles', 0, 128, 1,
        () => `${draft.raidStandoffTiles} tiles past the fence`),
    ),
  );
  body.appendChild(
    sect(
      "The road's fortune",
      'Sometimes the spent debt deals a friendly cart instead — road-true, transient, and paid back on departure.',
      numDial('fortune chance', 'renewal credits that deal a peddler instead of trouble', 'peddlerChance', 0, 1, 0.01,
        () => `~1 cart per ${draft.peddlerChance > 0 ? Math.round(1 / draft.peddlerChance) : '∞'} credits`),
      bandDial('cart hours', 'how long she parks before moving on (hours)', 'peddlerLingerMs', HOUR, 0.02, 24,
        () => `parked ${humanMs(draft.peddlerLingerMs[0])}–${humanMs(draft.peddlerLingerMs[1])}`),
    ),
  );
  body.appendChild(
    sect(
      'The herd and the pack',
      'Ambient life comes as knots — packs, herds, sounders — budgeted in bodies by the danger law.',
      numDial('wild budget', 'body budget per player bubble = base × the tier\'s wildDensity', 'wildBudgetBase', 0, 64, 1,
        () => {
          const lo = Math.round(draft.wildBudgetBase * (DANGER_LAWS[1]?.wildDensity ?? 0));
          const hi = Math.round(draft.wildBudgetBase * (DANGER_LAWS[5]?.wildDensity ?? 0));
          return `≈${lo} bodies at tier 1, ≈${hi} in the deep frontier`;
        }),
      numDial('knot probes', 'anchor candidates per pass; the first lawful one deals a whole knot', 'wildKnotProbes', 1, 8, 1,
        () => `${draft.wildKnotProbes} probes per pass`),
    ),
  );

  linkage.appendChild(el('h3', '', 'The clockwork'));
  linkage.appendChild(
    el(
      'p',
      'muted',
      'Every consumer reads these dials at call time — a save steers the very next frontier beat with no restart. ' +
        'The cross-laws hold at save: satellites need a rung to stand on, the marches never narrow past the watch, ' +
        'and a loss always earns the shorter mercy.',
    ),
  );
}

// -------------------------------------------------------- the names

/**
 * THE FACTIONS BENCH (factions Phase 6): the whole political ledger,
 * editable — the roster and its memberships, the band thresholds, the
 * deed values, the two poles, the prices, and the crime dials — with
 * the consequences derived beside the knobs: a designer reads "4
 * assaults = outlaw" and "fine from hunted ≈ 300c", never raw deltas.
 * Saves validate through the one validator and re-draw every loyalty
 * on the very next perception scan; nothing restarts, nothing reloads.
 */
function factionsDetail(body: HTMLElement, linkage: HTMLElement): void {
  const row = state.factions;
  if (!row) {
    body.appendChild(el('p', 'muted empty', 'The ledger has not loaded — is the server up?'));
    return;
  }
  const draft: FactionsDef = JSON.parse(JSON.stringify(row.def)) as FactionsDef;

  // The derived arithmetic, in the designer's language.
  const toOutlaw = (per: number): string =>
    per < 0 ? String(Math.ceil(draft.bands.outlaw / per)) : '∞';
  const fineFrom = (band: number): number =>
    Math.max(0, (draft.fineFloor - band) * draft.finePerPoint);

  const pills = (): HTMLElement[] => [
    pill(
      `${draft.roster.length} names · ${draft.roster.reduce((a, f) => a + f.members.length, 0)} members`,
      'the closed roster and every actor whose ledger it reads',
    ),
    pill(
      `${toOutlaw(draft.deeds.assaultEnforcer)} assaults = outlaw`,
      'blows against the watch, from a clean name to the closed throat',
      'brass',
    ),
    pill(
      `${toOutlaw(draft.deeds.theftWitnessed)} thefts = outlaw`,
      'witnessed lifts, from a clean name — unseen is unswayed',
      'brass',
    ),
    pill(
      draft.deeds.slayMember <= draft.bands.outlaw ? 'one slaying = outlaw' : 'a slaying < outlaw',
      'what a single member kill costs a clean name',
      draft.deeds.slayMember <= draft.bands.outlaw ? 'brass' : 'danger',
    ),
    pill(
      `fine from hunted ≈ ${fineFrom(draft.bands.hunted)}c`,
      'the road back at its most expensive (deficit below the floor × coins per point)',
      'ok',
    ),
    pill(
      `champion pays ×${draft.prices.champion}`,
      'the warmest counter — and the mirror pays them the same warmth selling',
      'ok',
    ),
  ];
  const head = detailHead(
    iconWrap27(iconImg('hall', 34)),
    'The Names',
    'factions · world',
    pills(),
    row.edited,
    true,
    () =>
      void persistence
        .saveFactionsDef(draft)
        .catch((err) => toast((err as Error).message, 5000, 'error')),
    () =>
      void persistence
        .revertFactionsDef()
        .catch((err) => toast((err as Error).message, 5000, 'error')),
  );
  body.appendChild(head);
  const refreshPills = (): void => {
    const holder = head.querySelector('.hero-pills');
    if (holder) {
      holder.innerHTML = '';
      for (const p of pills()) holder.appendChild(p);
    }
  };

  /** One dial row: label + hint, a control, and a live readout. */
  const dial = (
    label: string,
    hint: string,
    control: HTMLElement,
    readout: () => string,
  ): HTMLElement => {
    const wrap = el('div', 'frontier-dial');
    const head2 = el('div', 'frontier-dial-head');
    head2.appendChild(el('b', '', label));
    head2.appendChild(el('span', 'muted', hint));
    const out = el('span', 'pill brass', readout());
    const refresh = (): void => {
      out.textContent = readout();
      refreshPills();
    };
    control.addEventListener('input', refresh);
    control.addEventListener('change', refresh);
    wrap.appendChild(head2);
    const rowEl = el('div', 'frontier-dial-row');
    rowEl.appendChild(control);
    rowEl.appendChild(out);
    wrap.appendChild(rowEl);
    return wrap;
  };

  /** A scalar dial over a get/set closure (the doc nests its groups). */
  const numDial = (
    label: string,
    hint: string,
    get: () => number,
    set: (v: number) => void,
    min: number,
    max: number,
    step: number,
    readout: () => string,
  ): HTMLElement => {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(get());
    input.className = 'frontier-num';
    input.oninput = () => {
      const v = Number(input.value);
      if (Number.isFinite(v)) {
        set(v);
        markDirty();
      }
    };
    return dial(label, hint, input, readout);
  };

  // ------------------------------------------------------ the roster

  /** Actors already claimed by ANY name — one name, one ledger. */
  const claimed = (): Set<string> => {
    const s = new Set<string>();
    for (const f of draft.roster) for (const m of f.members) s.add(m);
    return s;
  };
  const actorOpts = (): ComboOption[] =>
    state.actors.map((a) => ({
      id: a.def.id,
      label: a.def.name,
      sub: a.def.title ?? a.def.disposition,
    }));

  const rosterBox = el('div');
  const rebuildRoster = (): void => {
    rosterBox.innerHTML = '';
    for (const [fi, f] of draft.roster.entries()) {
      const card = el('div', 'faction-card');

      // The head: sigil word, display name, fixed id, retire.
      const headRow = el('div', 'faction-card-head');
      const sigil = textIn(f.sigil, (v) => (f.sigil = v.trim() || f.sigil), 'sigil');
      sigil.classList.add('faction-sigil');
      headRow.appendChild(sigil);
      const name = textIn(f.name, (v) => (f.name = v.trim() || f.name), 'display name');
      name.classList.add('faction-name');
      headRow.appendChild(name);
      headRow.appendChild(el('span', 'muted', f.id));
      const retire = el('button', 'chip-x', '✕') as HTMLButtonElement;
      retire.title = 'retire this name (standing rows keep their history)';
      retire.onclick = () => {
        if (!window.confirm(`Retire '${f.name}' from the roster?`)) return;
        draft.roster.splice(fi, 1);
        for (const key of Object.keys(draft.oppose)) {
          if (key.split('|').includes(f.id)) delete draft.oppose[key];
        }
        draft.theft.fences = draft.theft.fences.filter((x) => x !== f.id);
        if (draft.roadFaction === f.id) {
          toast('the road needs a warden — pick a new road faction before saving', 4200, 'error');
        }
        markDirty();
        rebuildRoster();
        refreshPills();
      };
      headRow.appendChild(retire);
      card.appendChild(headRow);

      const blurb = textIn(f.blurb, (v) => (f.blurb = v), 'one line of what this name buys');
      blurb.classList.add('faction-blurb');
      card.appendChild(blurb);

      // Members — the chip list, one-name-one-ledger enforced at add.
      const memberRow = el('div', 'chip-row');
      const rebuildMembers = (): void => {
        memberRow.innerHTML = '';
        for (const [mi, slug] of f.members.entries()) {
          const chip = el('span', 'chip on');
          const isEnf = f.enforcers.includes(slug);
          const isFine = f.fineActor === slug;
          const open = el('button', '', `${slug}${isEnf ? ' ⚔' : ''}${isFine ? ' ⚖' : ''}`) as HTMLButtonElement;
          open.title = `${isEnf ? 'enforcer — polices this name. ' : ''}${isFine ? 'fine counter — the road back. ' : ''}click to open the actor`;
          open.onclick = () => setSection('actors', slug);
          chip.appendChild(open);
          const x = el('button', 'chip-x', '✕') as HTMLButtonElement;
          x.title = 'remove from the roster';
          x.onclick = () => {
            f.members.splice(mi, 1);
            f.enforcers = f.enforcers.filter((e) => e !== slug);
            if (f.fineActor === slug) delete f.fineActor;
            markDirty();
            rebuildMembers();
            rebuildEnforcers();
            refreshPills();
          };
          chip.appendChild(x);
          memberRow.appendChild(chip);
        }
        const add = el('div', 'quick-add');
        add.appendChild(
          combobox(
            () => actorOpts().filter((o) => !claimed().has(o.id)),
            undefined,
            (slug) => {
              f.members.push(slug);
              markDirty();
              rebuildMembers();
              refreshPills();
            },
            '+ add a member…',
          ),
        );
        memberRow.appendChild(add);
      };
      rebuildMembers();
      card.appendChild(el('p', 'muted faction-label', 'members — actors who read this ledger'));
      card.appendChild(memberRow);

      // Enforcers — a subset of members; ⚔ marks them above.
      const enfRow = el('div', 'chip-row');
      const rebuildEnforcers = (): void => {
        enfRow.innerHTML = '';
        for (const [ei, slug] of f.enforcers.entries()) {
          const chip = el('span', 'chip on');
          chip.appendChild(el('span', '', `⚔ ${slug}`));
          const x = el('button', 'chip-x', '✕') as HTMLButtonElement;
          x.title = 'stand this body down';
          x.onclick = () => {
            f.enforcers.splice(ei, 1);
            markDirty();
            rebuildEnforcers();
            rebuildMembers();
          };
          chip.appendChild(x);
          enfRow.appendChild(chip);
        }
        const add = el('div', 'quick-add');
        add.appendChild(
          combobox(
            () =>
              f.members
                .filter((m) => !f.enforcers.includes(m))
                .map((m) => ({ id: m, label: m, sub: 'member' })),
            undefined,
            (slug) => {
              f.enforcers.push(slug);
              markDirty();
              rebuildEnforcers();
              rebuildMembers();
            },
            '+ arm an enforcer…',
          ),
        );
        enfRow.appendChild(add);
      };
      rebuildEnforcers();
      card.appendChild(
        el('p', 'muted faction-label', 'enforcers — the subset that hunts outlaws on sight'),
      );
      card.appendChild(enfRow);

      // The fine counter, the bestiary prefixes, the refusals.
      const fineRow = el('div', 'quick-add');
      fineRow.appendChild(
        combobox(
          () => f.members.map((m) => ({ id: m, label: m, sub: 'member' })),
          f.fineActor,
          (slug) => {
            f.fineActor = slug;
            markDirty();
            rebuildMembers();
          },
          'fine counter (the road back)…',
        ),
      );
      const clearFine = el('button', 'chip-x', '✕') as HTMLButtonElement;
      clearFine.title = 'no fine counter — this name sells no way back';
      clearFine.onclick = () => {
        delete f.fineActor;
        markDirty();
        rebuildRoster();
      };
      fineRow.appendChild(clearFine);
      card.appendChild(el('p', 'muted faction-label', 'the fine counter — who sells a name back'));
      card.appendChild(fineRow);

      card.appendChild(
        el('p', 'muted faction-label', 'bestiary prefixes — wild bodies that read this ledger'),
      );
      card.appendChild(
        textIn(
          f.npcPrefixes.join(', '),
          (v) => {
            f.npcPrefixes = v
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
          },
          'brigand, …',
        ),
      );

      card.appendChild(
        el('p', 'muted faction-label', 'refusals — the closed throat, one line each'),
      );
      const refusals = document.createElement('textarea');
      refusals.className = 'faction-refusals';
      refusals.rows = Math.max(2, f.refusals.length);
      refusals.value = f.refusals.join('\n');
      refusals.oninput = () => {
        f.refusals = refusals.value
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        markDirty();
      };
      card.appendChild(refusals);

      card.appendChild(
        el(
          'p',
          'muted faction-label',
          f.anchors.length > 0
            ? `holds ground at ${f.anchors.map((a) => `(${a.x}, ${a.y})`).join(' · ')} — nearest-march at deed time`
            : 'holds no ground — a name of roads and shadows',
        ),
      );

      rosterBox.appendChild(card);
    }
    const raise = el('button', 'faction-raise', '+ raise a new name') as HTMLButtonElement;
    raise.onclick = () => {
      const id = window.prompt('New faction id (lowercase, e.g. tide_guild):');
      if (!id) return;
      if (!/^[a-z][a-z0-9_]*$/.test(id) || draft.roster.some((f) => f.id === id)) {
        toast('ids are lowercase [a-z0-9_], and the roster is a closed set', 3600, 'error');
        return;
      }
      draft.roster.push({
        id,
        name: id,
        sigil: 'gate',
        blurb: '',
        members: [],
        enforcers: [],
        npcPrefixes: [],
        anchors: [],
        refusals: [],
      } as FactionDef);
      markDirty();
      rebuildRoster();
      refreshPills();
    };
    rosterBox.appendChild(raise);
  };
  rebuildRoster();

  body.appendChild(
    sect(
      'The roster',
      'Who reads each ledger — members by actor slug, enforcers by trust, and the counter that sells a name back. One name, one ledger: an actor serves a single flag.',
      rosterBox,
    ),
  );

  // ------------------------------------------------------- the bands

  body.appendChild(
    sect(
      'The bands',
      'The seven rungs of a name. Gameplay reads bands, never raw values — move a threshold and the whole world re-bands on the next beat.',
      numDial('hunted', 'at or below, the watch shoots first', () => draft.bands.hunted, (v) => (draft.bands.hunted = v), -100, -1, 1, () => `≤ ${draft.bands.hunted}`),
      numDial('outlaw', 'at or below, throats close and enforcers open', () => draft.bands.outlaw, (v) => (draft.bands.outlaw = v), -100, -1, 1, () => `≤ ${draft.bands.outlaw}`),
      numDial('suspect', 'at or below, counters grow dear and eyes sharpen', () => draft.bands.suspect, (v) => (draft.bands.suspect = v), -100, -1, 1, () => `≤ ${draft.bands.suspect}`),
      numDial('known', 'at or above, the street remembers your face kindly', () => draft.bands.known, (v) => (draft.bands.known = v), 1, 100, 1, () => `≥ ${draft.bands.known}`),
      numDial('trusted', 'at or above, hostile camps hold their fire', () => draft.bands.trusted, (v) => (draft.bands.trusted = v), 1, 100, 1, () => `≥ ${draft.bands.trusted}`),
      numDial('champion', 'the top of the ladder — the best price in the realm', () => draft.bands.champion, (v) => (draft.bands.champion = v), 1, 100, 1, () => `≥ ${draft.bands.champion}`),
    ),
  );

  // ------------------------------------------------------- the deeds

  body.appendChild(
    sect(
      'The deeds',
      'The whole systemic vocabulary — every standing move the world makes on its own is one of these, through the one door.',
      numDial('bounty honored', "the town's thanks for a posted camp broken", () => draft.deeds.bountyHonored, (v) => (draft.deeds.bountyHonored = v), 1, 50, 1, () => `+${draft.deeds.bountyHonored}`),
      numDial('toll broken', "a road toll broken inside a town's marches", () => draft.deeds.tollBroken, (v) => (draft.deeds.tollBroken = v), 1, 50, 1, () => `+${draft.deeds.tollBroken}`),
      numDial('assault on the watch', 'first blow against an enforcer, once per fight', () => draft.deeds.assaultEnforcer, (v) => (draft.deeds.assaultEnforcer = v), -50, -1, 1, () => `${toOutlaw(draft.deeds.assaultEnforcer)} = outlaw`),
      numDial('member slain', 'a faction body killed — the heaviest mark', () => draft.deeds.slayMember, (v) => (draft.deeds.slayMember = v), -100, -1, 1, () => (draft.deeds.slayMember <= draft.bands.outlaw ? 'one = outlaw' : `${toOutlaw(draft.deeds.slayMember)} = outlaw`)),
      numDial('theft witnessed', 'a lift a faction body actually saw — unseen is unswayed', () => draft.deeds.theftWitnessed, (v) => (draft.deeds.theftWitnessed = v), -50, -1, 1, () => `${toOutlaw(draft.deeds.theftWitnessed)} caught = outlaw`),
      numDial('quest cap', 'ceiling on any single authored quest delta', () => draft.deeds.questCap, (v) => (draft.deeds.questCap = v), 1, 50, 1, () => `|Δ| ≤ ${draft.deeds.questCap}`),
      numDial('story cap', 'ceiling on any single dialogue-hook delta', () => draft.deeds.storyCap, (v) => (draft.deeds.storyCap = v), 1, 50, 1, () => `|Δ| ≤ ${draft.deeds.storyCap}`),
    ),
  );

  // ---------------------------------------------------- the two poles

  const opposeBox = el('div');
  const rebuildOppose = (): void => {
    opposeBox.innerHTML = '';
    for (const key of Object.keys(draft.oppose).sort()) {
      const [a, b] = key.split('|');
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0.05';
      input.max = '1';
      input.step = '0.05';
      input.value = String(draft.oppose[key]);
      input.className = 'frontier-num';
      input.oninput = () => {
        const v = Number(input.value);
        if (Number.isFinite(v) && v > 0 && v <= 1) {
          draft.oppose[key] = v;
          markDirty();
        }
      };
      const wrap = dial(
        `${a} ↔ ${b}`,
        'weight of the cross-pay while the border law allows it',
        input,
        () => `a +10 deed pays the other ${Math.round(-10 * draft.oppose[key]!)}`,
      );
      const x = el('button', 'chip-x', '✕') as HTMLButtonElement;
      x.title = 'the poles let go of each other';
      x.onclick = () => {
        delete draft.oppose[key];
        markDirty();
        rebuildOppose();
      };
      wrap.querySelector('.frontier-dial-head')?.appendChild(x);
      opposeBox.appendChild(wrap);
    }
    const absent: ComboOption[] = [];
    for (let i = 0; i < draft.roster.length; i++) {
      for (let j = i + 1; j < draft.roster.length; j++) {
        const key = [draft.roster[i]!.id, draft.roster[j]!.id].sort().join('|');
        if (!(key in draft.oppose)) {
          absent.push({ id: key, label: key.replace('|', ' ↔ '), sub: 'no opposition yet' });
        }
      }
    }
    const add = el('div', 'quick-add');
    add.appendChild(
      combobox(
        () => absent,
        undefined,
        (key) => {
          draft.oppose[key] = 0.25;
          markDirty();
          rebuildOppose();
        },
        '+ set two names against each other…',
      ),
    );
    opposeBox.appendChild(add);
  };
  rebuildOppose();

  body.appendChild(
    sect(
      'The two poles',
      'Systemic deeds with one name cross-pay its enemies — while the border law allows it. Authored deltas never cross; authors state both sides.',
      opposeBox,
    ),
  );

  // ------------------------------------------------------ the prices

  const mirror = (mult: number): string => `sells ×${+(2 - mult).toFixed(2)} (the mirror)`;
  body.appendChild(
    sect(
      'The prices',
      'What a band pays at a faction counter. The mirror law reflects every multiplier around parity on the sell side; outlaw and below never reach a counter.',
      numDial('champion', 'the realm’s best price', () => draft.prices.champion, (v) => (draft.prices.champion = v), 0.5, 2, 0.01, () => mirror(draft.prices.champion)),
      numDial('trusted', 'a friend’s discount', () => draft.prices.trusted, (v) => (draft.prices.trusted = v), 0.5, 2, 0.01, () => mirror(draft.prices.trusted)),
      numDial('known', 'a familiar face', () => draft.prices.known, (v) => (draft.prices.known = v), 0.5, 2, 0.01, () => mirror(draft.prices.known)),
      numDial('neutral', 'the stranger’s price', () => draft.prices.neutral, (v) => (draft.prices.neutral = v), 0.5, 2, 0.01, () => mirror(draft.prices.neutral)),
      numDial('suspect', 'coin from a watched hand costs counting', () => draft.prices.suspect, (v) => (draft.prices.suspect = v), 0.5, 2, 0.01, () => mirror(draft.prices.suspect)),
    ),
  );

  // ------------------------------------------------- the light fingers

  const fencesRow = el('div', 'chip-row');
  const rebuildFences = (): void => {
    fencesRow.innerHTML = '';
    for (const [i, fid] of draft.theft.fences.entries()) {
      const chip = el('span', 'chip on');
      chip.appendChild(el('span', '', fid));
      const x = el('button', 'chip-x', '✕') as HTMLButtonElement;
      x.title = 'this name stops buying stolen goods';
      x.onclick = () => {
        draft.theft.fences.splice(i, 1);
        markDirty();
        rebuildFences();
      };
      chip.appendChild(x);
      fencesRow.appendChild(chip);
    }
    const add = el('div', 'quick-add');
    add.appendChild(
      combobox(
        () =>
          draft.roster
            .filter((f) => !draft.theft.fences.includes(f.id))
            .map((f) => ({ id: f.id, label: f.name, sub: f.id })),
        undefined,
        (fid) => {
          draft.theft.fences.push(fid);
          markDirty();
          rebuildFences();
        },
        '+ whose counters take stolen goods…',
      ),
    );
    fencesRow.appendChild(add);
  };
  rebuildFences();

  body.appendChild(
    sect(
      'The light fingers',
      'The crime dials — the roll, the witnesses, the wary window, the locks, and who buys what honest counters refuse.',
      numDial('theft base', 'success chance at equal sneak and mark level', () => draft.theft.base, (v) => (draft.theft.base = v), 0.01, 0.95, 0.01, () => `${Math.round(draft.theft.base * 100)}% at par`),
      numDial('per level', 'chance moved per point of sneak − mark level', () => draft.theft.perLevel, (v) => (draft.theft.perLevel = v), 0, 0.05, 0.001, () => `+${Math.round(draft.theft.perLevel * 4000) / 40}% per 10 levels`),
      numDial('coin cap', 'coins skimmed per lift, at most — coin is coin, never stolen', () => draft.theft.coinCap, (v) => (draft.theft.coinCap = v), 1, 500, 1, () => `≤ ${draft.theft.coinCap}c a lift`),
      numDial('wary window', 'seconds the mark distrusts the same hand', () => draft.theft.retrySec, (v) => (draft.theft.retrySec = v), 5, 3600, 5, () => humanMs(draft.theft.retrySec * 1000)),
      numDial('witness radius', 'tiles a faction body can witness from, sightline honest', () => draft.theft.witnessRadius, (v) => (draft.theft.witnessRadius = v), 2, 32, 1, () => `${draft.theft.witnessRadius} tiles`),
      numDial('lock level', 'sneak level that works a town lock — no roll, no luck', () => draft.theft.lockLevel, (v) => (draft.theft.lockLevel = v), 1, 99, 1, () => `sneak ${draft.theft.lockLevel}`),
      numDial('the suspect eye', 'enforcers sharpen the sneak factor by this below neutral', () => draft.theft.suspectEye, (v) => (draft.theft.suspectEye = v), 1, 4, 0.1, () => `×${draft.theft.suspectEye} on the crouch`),
      numDial('stolen sell mult', 'what a fence pays, of the honest sell price', () => draft.theft.stolenSellMult, (v) => (draft.theft.stolenSellMult = v), 0.1, 2, 0.05, () => `fence pays ×${draft.theft.stolenSellMult}`),
      dial('the fences', 'roster names whose counters accept stolen goods', fencesRow, () => `${draft.theft.fences.length} fence${draft.theft.fences.length === 1 ? '' : 's'}`),
    ),
  );

  // ---------------------------------------------------- the law's reach

  const peaceSel = document.createElement('select');
  peaceSel.className = 'frontier-num faction-band-select';
  for (const b of FACTION_BAND_ORDER) {
    if (b !== 'known' && b !== 'trusted' && b !== 'champion') continue;
    const o = document.createElement('option');
    o.value = b;
    o.textContent = b;
    if (draft.peaceBand === b) o.selected = true;
    peaceSel.appendChild(o);
  }
  peaceSel.onchange = () => {
    draft.peaceBand = peaceSel.value as FactionBand;
    markDirty();
  };

  const roadRow = el('div', 'quick-add');
  roadRow.appendChild(
    combobox(
      () => draft.roster.map((f) => ({ id: f.id, label: f.name, sub: f.id })),
      draft.roadFaction,
      (fid) => {
        draft.roadFaction = fid;
        markDirty();
      },
      'the road’s wardens…',
    ),
  );

  body.appendChild(
    sect(
      "The law's reach",
      'The enforcement circle, the peace, the price of a way back, and whose ledger the open road credits.',
      numDial('enforcer circle', 'tiles an enforcer opens on an outlaw', () => draft.enforcerAggro, (v) => (draft.enforcerAggro = v), 2, 32, 1, () => `${draft.enforcerAggro} tiles`),
      dial('the peace band', 'a hostile camp holds its fire for a friend at this band', peaceSel, () => `holds fire at ${draft.peaceBand}`),
      numDial('coins per point', 'the fine per point of deficit below the floor', () => draft.finePerPoint, (v) => (draft.finePerPoint = v), 1, 100, 1, () => `fine from hunted ≈ ${fineFrom(draft.bands.hunted)}c`),
      numDial('the fine floor', 'a paid fine restores standing to exactly here', () => draft.fineFloor, (v) => (draft.fineFloor = v), -100, 0, 1, () => `restores to ${draft.fineFloor}`),
      numDial('daily drift', 'standing drifts toward 0 by this each day — ships at 0', () => draft.driftPerDay, (v) => (draft.driftPerDay = v), 0, 10, 1, () => (draft.driftPerDay === 0 ? 'time launders nothing' : `±${draft.driftPerDay}/day`)),
      dial('the road faction', 'beyond every march, deeds credit these wardens', roadRow, () => draft.roadFaction),
    ),
  );

  linkage.appendChild(el('h3', '', 'The one door'));
  linkage.appendChild(
    el(
      'p',
      'muted',
      'Every consumer reads this doc at call time — membership at the perception scan, prices at the counter, bands at every ' +
        'gate. A save re-draws the political map on the very next beat; standing rows keep their history even when a name ' +
        'retires. The validator holds the cross-laws: bands stay ordered, every enforcer is a member, an actor serves one ' +
        'flag, the fine floor lands inside suspect, and the fences name roster ids.',
    ),
  );
  const fines = draft.roster.filter((f) => f.fineActor);
  if (fines.length > 0) {
    linkHead(linkage, 'actor', 'The fine counters', fines.length);
    for (const f of fines) {
      linkRow(linkage, `⚖ ${f.fineActor!}`, f.name, () => setSection('actors', f.fineActor!));
    }
  }
}
