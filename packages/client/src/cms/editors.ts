import { STATUS_IDS } from '@devcraft/shared';
import {
  ABILITIES,
  RECIPES,
  type LootEntryDef,
  type LootTableDef,
  type NpcActorDef,
  type NpcDef,
} from '@devcraft/content';
import { itemIconUrl } from '../render/icons.js';
import { iconImg } from '../editor/editorIcons.js';
import { markDirty, persistence, setSection, state, toast, zoneAt } from './cms.js';
import { actorBust, creatureCrest } from './portraits.js';
import { entryShare, simulate, type SimAggregate } from './simulate.js';
import {
  bar,
  combobox,
  distribution,
  el,
  featureChip,
  pill,
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
        creatureCrest(draft, 132),
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
      featureChip('strikes inflict', !!draft.attackStatus, 'Melee hits apply a status effect', (on) => {
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

  const build = (): void => {
    const quick = simulate(id, simLevel, 300, draft);
    body.appendChild(
      detailHead(
        null,
        draft.id,
        draft.desc ?? '',
        [
          pill(isPick() ? 'pick — weighted pool' : 'each — independent chances', 'roll mode', 'brass'),
          pill(`${draft.entries.length} entries`, '', 'ink'),
          pill(`≈${quick.evCoins.toFixed(1)} coins/roll`, 'catalog value of an average roll (300-roll observation)', 'brass'),
          pill(`${Math.round((quick.emptyRolls / quick.rolls) * 100)}% empty`, 'rolls that pay nothing', 'ink'),
        ],
        entry.edited,
        entry.authored,
        save,
        () => void persistence.revertLootDef(id).catch((err: Error) => toast(err.message, 4600, 'error')),
      ),
    );

    // Table knobs.
    const knobs = el('div', 'fgrid');
    const descF = el('label', 'ffield wide');
    descF.appendChild(el('span', '', 'description'));
    descF.appendChild(textIn(draft.desc ?? '', (v) => (draft.desc = v || undefined), 'What story does this table pay out?'));
    knobs.appendChild(descF);
    const modeF = el('label', 'ffield');
    modeF.appendChild(el('span', '', 'mode'));
    const modeSeg = el('div', 'seg-row');
    for (const [v, l, tip] of [
      ['each', 'each', 'every entry rolls its own chance independently'],
      ['pick', 'pick', 'weighted draws from one pool'],
    ] as const) {
      const b = el('button', 'opt-btn' + ((draft.mode ?? 'each') === v ? ' active' : ''), l) as HTMLButtonElement;
      b.title = tip;
      b.onclick = () => {
        draft.mode = v === 'pick' ? 'pick' : undefined;
        if (v === 'pick' && !draft.picks) draft.picks = [1, 2];
        markDirty();
        rebuild();
      };
      modeSeg.appendChild(b);
    }
    modeF.appendChild(modeSeg);
    knobs.appendChild(modeF);
    if (isPick()) {
      const picksF = el('label', 'ffield');
      picksF.appendChild(el('span', '', 'draws per roll (min–max)'));
      const pair = el('span', 'pair');
      pair.append(
        numIn(draft.picks?.[0] ?? 1, (v) => (draft.picks = [v, draft.picks?.[1] ?? v])),
        numIn(draft.picks?.[1] ?? 1, (v) => (draft.picks = [draft.picks?.[0] ?? 1, v])),
      );
      picksF.appendChild(pair);
      knobs.appendChild(picksF);
      const nothingF = el('label', 'ffield');
      nothingF.appendChild(el('span', '', 'nothing weight'));
      nothingF.appendChild(numIn(draft.nothingW ?? 0, (v) => (draft.nothingW = v || undefined)));
      nothingF.appendChild(el('span', 'note', 'empty-handed weight in the pool'));
      knobs.appendChild(nothingF);
    }
    body.appendChild(sect('Table', '', knobs));

    // Entries — pickers with live share bars.
    const entries = el('div');
    draft.entries.forEach((e, i) => {
      entries.appendChild(entryRow(draft, e, i, rebuild));
    });
    if (draft.entries.length === 0) {
      entries.appendChild(el('p', 'muted empty', 'No entries — this table pays out nothing.'));
    }
    const addRow = el('div', 'add-row');
    const add = el('button', '', 'Add entry') as HTMLButtonElement;
    add.onclick = () => {
      draft.entries.push(
        isPick() ? { item: 'coins', w: 1, qty: [1, 1] } : ({ item: 'coins', chance: 0.5, qty: [1, 1] } as LootEntryDef),
      );
      markDirty();
      rebuild();
    };
    addRow.appendChild(add);
    entries.appendChild(addRow);
    body.appendChild(
      sect(
        'Entries',
        isPick()
          ? 'The bar is each entry\'s share of the pool (weights over the total, times average draws).'
          : 'The bar is each entry\'s own chance — entries roll independently.',
        entries,
      ),
    );

    // The laboratory.
    const lab = el('div');
    const labRow = el('div', 'add-row');
    labRow.appendChild(el('span', 'note', 'foe level'));
    labRow.appendChild(numIn(simLevel, (v) => (simLevel = v)));
    const roll = el('button', 'primary', 'Roll ×300') as HTMLButtonElement;
    roll.onclick = rebuild;
    labRow.appendChild(roll);
    lab.appendChild(labRow);
    lab.appendChild(simGrid(quick));
    body.appendChild(
      sect('The laboratory', 'Rolls the REAL roller against your unsaved draft — what you see is what a player farms.', lab),
    );

    lootUsedByRows(linkage, id);
  };
  build();
}

function entryRow(
  draft: LootTableDef,
  e: LootEntryDef,
  i: number,
  rebuild: () => void,
): HTMLElement {
  const isPick = draft.mode === 'pick';
  const row = el('div', 'entry-row');
  const kind = e.item !== undefined ? 'item' : e.table !== undefined ? 'table' : 'pool';

  // Icon + share bar column.
  const share = entryShare(draft, i);
  const left = el('div', 'entry-left');
  if (e.item) {
    const img = document.createElement('img');
    img.src = itemIconUrl(e.item, 30);
    img.width = 30;
    img.height = 30;
    left.appendChild(img);
  } else {
    left.appendChild(iconImg(kind === 'table' ? 'prefab' : 'picker', 22));
  }
  const shareBar = el('div', 'share-track');
  const fill = el('div', 'share-fill');
  fill.style.width = `${Math.max(3, share * 100)}%`;
  shareBar.appendChild(fill);
  shareBar.title = `effective share ≈ ${(share * 100).toFixed(1)}%`;
  left.appendChild(shareBar);
  left.appendChild(el('span', 'share-pct', `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`));
  row.appendChild(left);

  // Target picker.
  const target = el('div', 'entry-target');
  const kindSeg = el('div', 'seg-row mini-seg');
  for (const [v, l] of [
    ['item', 'item'],
    ['table', 'table'],
    ['pool', 'heirloom'],
  ] as const) {
    const b = el('button', 'opt-btn' + (kind === v ? ' active' : ''), l) as HTMLButtonElement;
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
  target.appendChild(kindSeg);
  if (kind === 'item') {
    target.appendChild(
      combobox(() => itemOptions(), e.item, (v) => {
        e.item = v;
        markDirty();
        rebuild();
      }),
    );
  } else if (kind === 'table') {
    target.appendChild(
      combobox(() => tableOptions(draft.id), e.table, (v) => {
        e.table = v;
        markDirty();
        rebuild();
      }),
    );
  } else {
    target.appendChild(el('span', 'note', 'a piece from the heirloom pool'));
  }
  row.appendChild(target);

  // Numbers.
  const nums = el('div', 'entry-nums');
  const numField = (label: string, input: HTMLElement): HTMLElement => {
    const f = el('label', 'nfield');
    f.appendChild(el('span', '', label));
    f.appendChild(input);
    return f;
  };
  nums.appendChild(numField('qty', (() => {
    const pair = el('span', 'pair tight');
    pair.append(
      numIn(e.qty?.[0] ?? 1, (v) => (e.qty = [v, e.qty?.[1] ?? v])),
      numIn(e.qty?.[1] ?? e.qty?.[0] ?? 1, (v) => (e.qty = [e.qty?.[0] ?? 1, v])),
    );
    return pair;
  })()));
  if (isPick) {
    nums.appendChild(
      numField('weight', numIn(e.w ?? 1, (v) => {
        e.w = v;
        delete e.chance;
        rebuild();
      })),
    );
  } else {
    nums.appendChild(
      numField('chance', numIn(e.chance ?? 1, (v) => {
        e.chance = v;
        delete e.w;
        rebuild();
      }, 0.01)),
    );
  }
  if (kind === 'table') {
    nums.appendChild(numField('mult', numIn(e.mult ?? 1, (v) => (e.mult = v === 1 ? undefined : v), 0.1)));
  }
  row.appendChild(nums);

  const del = el('button', 'mini danger entry-del') as HTMLButtonElement;
  del.appendChild(iconImg('trash', 13));
  del.title = 'Remove this entry';
  del.onclick = () => {
    draft.entries.splice(i, 1);
    markDirty();
    rebuild();
  };
  row.appendChild(del);
  return row;
}

function lootUsedByRows(root: HTMLElement, tableId: string): void {
  const npcs = state.npcs.filter((n) => n.def.loot.includes(tableId));
  const actors = state.actors.filter((a) => a.def.combat?.loot?.includes(tableId));
  const tables = state.loot.filter((t) => t.def.entries.some((e) => e.table === tableId));
  linkHead(root, 'cluster', 'Dropped by', npcs.length + actors.length);
  if (npcs.length + actors.length === 0) emptyLink(root, 'No creature rolls this table directly.');
  for (const n of npcs) linkRow(root, n.def.name, `lv ${n.def.level}`, () => setSection('npcs', n.def.id));
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

function actorDetail(body: HTMLElement, linkage: HTMLElement, slug: string): void {
  const entry = state.actors.find((a) => a.def.id === slug);
  if (!entry) return;
  const draft: NpcActorDef = JSON.parse(JSON.stringify(entry.def)) as NpcActorDef;

  let jsonBox: HTMLTextAreaElement | null = null;
  const save = (): void => {
    let full: NpcActorDef = draft;
    if (jsonBox && jsonBox.value.trim()) {
      try {
        full = JSON.parse(jsonBox.value) as NpcActorDef;
      } catch (err) {
        toast(`definition JSON: ${(err as Error).message}`, 4200, 'error');
        return;
      }
      // Structured controls win the fields they own.
      full.id = draft.id;
      full.name = draft.name;
      full.title = draft.title;
      full.examine = draft.examine;
      full.disposition = draft.disposition;
      if (draft.protection) full.protection = draft.protection;
      else delete (full as unknown as Record<string, unknown>).protection;
      full.equipment = draft.equipment;
      full.inventory = draft.inventory;
      full.lines = draft.lines;
    }
    void persistence.saveActorDef(full).catch((err: Error) => toast(err.message, 5200, 'error'));
  };
  const rebuild = (): void => {
    body.innerHTML = '';
    linkage.innerHTML = '';
    build();
  };

  const build = (): void => {
    const portrait =
      draft.model.kind === 'humanoid'
        ? actorBust(draft, 132)
        : (() => {
            const base = state.npcs.find((n) => n.def.id === (draft.model as { creature?: string }).creature);
            return base ? creatureCrest(base.def, 132) : null;
          })();
    const pills: HTMLElement[] = [
      pill(draft.disposition, 'how combat treats this actor', draft.disposition === 'hostile' ? 'danger' : 'ink'),
    ];
    if (draft.protection) pill(draft.protection, '', 'brass');
    if (draft.combat) pills.push(pill(`fights at lv ${draft.combat.level}`, '', 'danger'));
    if (draft.dialogue) pills.push(pill('speaks', `dialogue: ${draft.dialogue}`, 'brass'));
    if (draft.shop) pills.push(pill('trades', `shop: ${draft.shop}`, 'brass'));

    body.appendChild(
      detailHead(
        portrait,
        draft.name,
        draft.id,
        pills,
        entry.edited,
        entry.authored,
        save,
        () => void persistence.revertActorDef(slug).catch((err: Error) => toast(err.message, 4600, 'error')),
      ),
    );

    // Identity.
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
      f('examine', textIn(draft.examine ?? '', (v) => (draft.examine = v || undefined)), '', true),
    );
    const dispSeg = el('div', 'seg-row');
    for (const [v, tip] of [
      ['friendly', 'no combat body — beyond harm'],
      ['neutral', 'fightable, never starts it'],
      ['hostile', 'attacks on sight'],
    ] as const) {
      const b = el('button', 'opt-btn' + (draft.disposition === v ? ' active' : ''), v) as HTMLButtonElement;
      b.title = tip;
      b.onclick = () => {
        draft.disposition = v;
        markDirty();
        rebuild();
      };
      dispSeg.appendChild(b);
    }
    identity.appendChild(f('disposition', dispSeg));
    const protSeg = el('div', 'seg-row');
    for (const [v, l, tip] of [
      ['', 'none', 'the disposition alone decides'],
      ['invulnerable', 'invulnerable', '"Immune" ward — still retaliates'],
      ['untargetable', 'untargetable', 'attacks pass through entirely'],
    ] as const) {
      const b = el('button', 'opt-btn' + ((draft.protection ?? '') === v ? ' active' : ''), l) as HTMLButtonElement;
      b.title = tip;
      b.onclick = () => {
        draft.protection = (v || undefined) as NpcActorDef['protection'];
        markDirty();
        rebuild();
      };
      protSeg.appendChild(b);
    }
    identity.appendChild(f('protection', protSeg, 'the safety switch over the disposition'));
    body.appendChild(sect('Identity', '', identity));

    // Wardrobe — slot grid with pickers; the portrait re-renders live.
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
              rebuild();
            },
            '(bare)',
          ),
        );
        grid.appendChild(cell);
      }
      body.appendChild(
        sect('Wardrobe', 'Worn gear renders on the portrait exactly as it will in the world.', grid),
      );
    }

    // Pockets.
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

    // Voice.
    const voice = el('div');
    (draft.lines ?? []).forEach((line, i) => {
      const r = el('div', 'line-row');
      r.appendChild(el('span', 'line-quote', '“'));
      r.appendChild(textIn(line, (v) => (draft.lines![i] = v)));
      const del = el('button', 'mini danger') as HTMLButtonElement;
      del.appendChild(iconImg('trash', 13));
      del.onclick = () => {
        draft.lines!.splice(i, 1);
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
      draft.lines.push('');
      markDirty();
      rebuild();
    };
    voice.appendChild(addLine);
    body.appendChild(sect('Voice', 'Spoken lines rotate on interaction; a bound dialogue tree takes over when present.', voice));

    // Advanced drawer.
    jsonBox = document.createElement('textarea');
    jsonBox.rows = 12;
    jsonBox.style.width = '100%';
    jsonBox.value = JSON.stringify(draft, null, 2);
    jsonBox.oninput = () => markDirty();
    const wrap = el('div');
    wrap.appendChild(jsonBox);
    wrap.appendChild(
      el(
        'p',
        'muted',
        'Look palette, combat stats and loot, dialogue and shop hooks. The structured sections above win where they overlap; the one validator checks every reference on save.',
      ),
    );
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Full definition (advanced)';
    details.appendChild(summary);
    details.appendChild(wrap);
    const detSect = el('div', 'fsect');
    detSect.appendChild(details);
    body.appendChild(detSect);

    // Linkage.
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
  else itemDetail(body, linkage, id);
}
