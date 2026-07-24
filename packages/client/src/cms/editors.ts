import { RARITY_TIERS } from '@devcraft/shared';
import { RECIPES, type LootEntryDef, type LootTableDef, type NpcActorDef, type NpcDef } from '@devcraft/content';
import { itemIconUrl } from '../render/icons.js';
import { iconImg } from '../editor/editorIcons.js';
import { markDirty, persistence, select, setSection, state, toast, zoneAt } from './cms.js';

/**
 * The Content Studio detail editors: bestiary stat sheets, loot entry
 * tables, actor identities — plus the linkage rail that answers "who
 * uses this?" for every entry. Forms hold a working copy; Save ships
 * it through the server validator into the DB and the live world.
 */

const $make = (tag: string, cls?: string, text?: string): HTMLElement => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
};

function field(
  label: string,
  input: HTMLElement,
  note?: string,
  wide = false,
): HTMLElement {
  const wrap = $make('label', 'ffield' + (wide ? ' wide' : ''));
  wrap.appendChild($make('span', '', label));
  wrap.appendChild(input);
  if (note) wrap.appendChild($make('span', 'note', note));
  return wrap;
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

function textIn(value: string, onInput: (v: string) => void): HTMLInputElement {
  const input = document.createElement('input');
  input.value = value;
  input.oninput = () => {
    onInput(input.value);
    markDirty();
  };
  return input;
}

function selIn(
  options: Array<{ v: string; l: string }>,
  value: string,
  onChange: (v: string) => void,
): HTMLSelectElement {
  const sel = document.createElement('select');
  for (const o of options) {
    const opt = document.createElement('option');
    opt.value = o.v;
    opt.textContent = o.l;
    if (o.v === value) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.onchange = () => {
    onChange(sel.value);
    markDirty();
  };
  return sel;
}

function sect(title: string, ...children: HTMLElement[]): HTMLElement {
  const box = $make('div', 'fsect');
  box.appendChild($make('h3', '', title));
  for (const c of children) box.appendChild(c);
  return box;
}

function detailHead(
  title: string,
  sub: string,
  edited: boolean,
  authored: boolean,
  onSave: () => void,
  onRevert: () => void,
): HTMLElement {
  const head = $make('div', 'detail-head');
  const h1 = $make('h1', '', title);
  head.appendChild(h1);
  head.appendChild($make('span', 'sub', sub));
  const actions = $make('div', 'actions');
  const revert = document.createElement('button');
  revert.className = 'danger';
  revert.textContent = authored ? 'Revert to shipped' : 'Delete';
  revert.title = authored
    ? 'Discard database edits; the definition shipped in code returns'
    : 'Remove this tool-created entry entirely';
  revert.disabled = authored && !edited;
  revert.onclick = () => {
    if (window.confirm(`${revert.textContent} '${title}'?`)) onRevert();
  };
  const save = document.createElement('button');
  save.className = 'primary';
  save.textContent = 'Save ▸ Live';
  save.title = 'Validate, store in the database, and hot-swap the running world (⌘S)';
  save.onclick = onSave;
  actions.append(revert, save);
  head.appendChild(actions);
  return head;
}

function originNote(edited: boolean, authored: boolean): HTMLElement {
  const p = $make('p', 'origin-note');
  p.innerHTML = !authored
    ? 'Created in the studio — <b>tool-owned</b>, no shipped twin.'
    : edited
      ? '<b>Edited</b> — the database version overrides the shipped definition (re-seeds keep your edit).'
      : 'Matches the shipped definition — edits become database truth and survive reboots.';
  return p;
}

// ------------------------------------------------------------ linkage

function linkHead(root: HTMLElement, icon: string, text: string, count?: number): void {
  const head = $make('div', 'panel-head');
  head.appendChild(iconImg(icon, 15));
  head.append(` ${text}`);
  if (count !== undefined) {
    const c = $make('span', 'count', String(count));
    head.appendChild(c);
  }
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
  row.appendChild($make('b', '', label));
  row.appendChild($make('span', '', meta));
  if (onOpen) (row as HTMLButtonElement).onclick = onOpen;
  root.appendChild(row);
}

function emptyLink(root: HTMLElement, text: string): void {
  root.appendChild($make('p', 'muted empty', text));
}

/** Spawn sites for one bestiary id, grouped by zone. */
function npcSiteRows(root: HTMLElement, npcId: string): void {
  const sites = state.sites.npcs.filter((s) => s.npc === npcId);
  linkHead(root, 'cluster', 'Spawns in the world', sites.length);
  if (sites.length === 0) {
    emptyLink(root, 'No live spawn slots. Place a cluster in Map Studio to field it.');
    return;
  }
  const byZone = new Map<string, { count: number; x: number; y: number; zoneId: string | null }>();
  for (const s of sites) {
    const zone = zoneAt(s.x, s.y);
    const key = zone?.id ?? 'wilds';
    const rec = byZone.get(key) ?? { count: 0, x: s.x, y: s.y, zoneId: zone?.id ?? null };
    rec.count++;
    byZone.set(key, rec);
  }
  for (const [key, rec] of byZone) {
    const zone = state.zones.find((z) => z.id === rec.zoneId);
    linkRow(
      root,
      zone?.name ?? (key === 'wilds' ? 'Open world' : key),
      `×${rec.count}`,
      rec.zoneId
        ? () => {
            window.open(`/editor.html?zone=${rec.zoneId}`, '_blank');
          }
        : null,
    );
  }
}

function lootUsedByRows(root: HTMLElement, tableId: string): void {
  const npcs = state.npcs.filter((n) => n.def.loot.includes(tableId));
  const actors = state.actors.filter((a) => a.def.combat?.loot?.includes(tableId));
  const tables = state.loot.filter((t) => t.def.entries.some((e) => e.table === tableId));
  linkHead(root, 'cluster', 'Dropped by', npcs.length + actors.length);
  if (npcs.length + actors.length === 0) {
    emptyLink(root, 'No creature rolls this table directly.');
  }
  for (const n of npcs) {
    linkRow(root, n.def.name, `lv ${n.def.level}`, () => setSection('npcs', n.def.id));
  }
  for (const a of actors) {
    linkRow(root, a.def.name, 'actor', () => setSection('actors', a.def.id));
  }
  if (tables.length > 0) {
    linkHead(root, 'prefab', 'Composed into', tables.length);
    for (const t of tables) {
      linkRow(root, t.def.id, '', () => setSection('loot', t.def.id));
    }
  }
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

const NPC_EXTRA_FIELDS = [
  'hitHeight', 'special', 'ranged', 'attackStatus', 'resist', 'weak',
  'produce', 'lays', 'splitInto', 'pounce', 'pack', 'sheathePref',
] as const;

function npcDetail(body: HTMLElement, linkage: HTMLElement, id: string): void {
  const entry = state.npcs.find((n) => n.def.id === id);
  if (!entry) return;
  // The working copy — form fields mutate this, Save ships it.
  const draft: NpcDef = JSON.parse(JSON.stringify(entry.def)) as NpcDef;
  const extras: Record<string, unknown> = {};
  for (const f of NPC_EXTRA_FIELDS) {
    const v = (draft as unknown as Record<string, unknown>)[f];
    if (v !== undefined) extras[f] = v;
  }

  let extrasBox: HTMLTextAreaElement | null = null;
  const save = (): void => {
    let mergedExtras: Record<string, unknown> = extras;
    if (extrasBox) {
      try {
        mergedExtras = extrasBox.value.trim() ? (JSON.parse(extrasBox.value) as Record<string, unknown>) : {};
      } catch (err) {
        toast(`behavior JSON: ${(err as Error).message}`, 4200, 'error');
        return;
      }
    }
    const base = { ...draft } as unknown as Record<string, unknown>;
    for (const f of NPC_EXTRA_FIELDS) delete base[f];
    void persistence
      .saveNpcDef({ ...(base as unknown as NpcDef), ...mergedExtras })
      .catch((err: Error) => toast(err.message, 4600, 'error'));
  };

  body.appendChild(
    detailHead(draft.name, draft.id, entry.edited, entry.authored, save, () =>
      void persistence.revertNpcDef(id).catch((err: Error) => toast(err.message, 4600, 'error')),
    ),
  );
  body.appendChild(originNote(entry.edited, entry.authored));

  const colorIn = document.createElement('input');
  colorIn.type = 'color';
  colorIn.value = draft.color;
  colorIn.style.height = '28px';
  colorIn.oninput = () => {
    draft.color = colorIn.value;
    markDirty();
  };
  const identity = $make('div', 'fgrid');
  identity.append(
    field('name', textIn(draft.name, (v) => (draft.name = v))),
    field('map color', colorIn, 'the minimap / placeholder tint'),
    field('body radius', numIn(draft.radius, (v) => (draft.radius = v), 0.05), 'tiles — collision circle'),
  );
  body.appendChild(sect('Identity', identity));

  const combat = $make('div', 'fgrid');
  combat.append(
    field('level', numIn(draft.level, (v) => (draft.level = v)), 'displayed combat level'),
    field('max hp', numIn(draft.maxHp, (v) => (draft.maxHp = v))),
    field('damage', numIn(draft.damage, (v) => (draft.damage = v)), '0 = never attacks'),
    field('attack range', numIn(draft.attackRange, (v) => (draft.attackRange = v), 0.1), 'tiles'),
    field('attack cooldown', numIn(draft.attackCooldownTicks, (v) => (draft.attackCooldownTicks = v)), 'ticks (20/s)'),
    field('aggro range', numIn(draft.aggroRange, (v) => (draft.aggroRange = v)), '0 = passive until hit'),
    field('leash range', numIn(draft.leashRange, (v) => (draft.leashRange = v)), 'tiles from home before giving up'),
    field('speed', numIn(draft.speed, (v) => (draft.speed = v), 0.1), 'tiles/second'),
    field('xp reward', numIn(draft.xpReward, (v) => (draft.xpReward = v))),
    field('respawn', numIn(draft.respawnSec, (v) => (draft.respawnSec = v)), 'seconds'),
  );
  body.appendChild(sect('Combat', combat));

  // Loot linkage — chips + add picker.
  const lootRow = $make('div');
  const rebuildLoot = (): void => {
    lootRow.innerHTML = '';
    const chips = $make('div', 'opt-row');
    for (const t of draft.loot) {
      const chip = document.createElement('button');
      chip.className = 'mini';
      chip.textContent = t;
      chip.title = 'Open this table';
      chip.onclick = () => setSection('loot', t);
      const x = document.createElement('button');
      x.className = 'mini danger';
      x.textContent = '×';
      x.title = `Stop rolling '${t}'`;
      x.onclick = () => {
        draft.loot = draft.loot.filter((l) => l !== t);
        markDirty();
        rebuildLoot();
      };
      const pair = $make('span', 'opt-row');
      pair.style.gap = '2px';
      pair.append(chip, x);
      chips.appendChild(pair);
    }
    if (draft.loot.length === 0) {
      chips.appendChild($make('span', 'muted empty', 'Drops nothing.'));
    }
    lootRow.appendChild(chips);
    const addRow = $make('div', 'add-row');
    const pick = selIn(
      [{ v: '', l: 'add a table…' }].concat(
        state.loot
          .map((t) => t.def.id)
          .filter((tid) => !draft.loot.includes(tid))
          .sort()
          .map((tid) => ({ v: tid, l: tid })),
      ),
      '',
      (v) => {
        if (!v) return;
        draft.loot.push(v);
        rebuildLoot();
      },
    );
    addRow.appendChild(pick);
    lootRow.appendChild(addRow);
  };
  rebuildLoot();
  body.appendChild(
    sect('Loot — every kill rolls each table at the foe\'s level', lootRow),
  );

  // Behavior extras as validated JSON.
  extrasBox = document.createElement('textarea');
  extrasBox.rows = Math.min(14, Math.max(4, JSON.stringify(extras, null, 2).split('\n').length));
  extrasBox.value = Object.keys(extras).length > 0 ? JSON.stringify(extras, null, 2) : '{}';
  extrasBox.oninput = () => markDirty();
  const extrasWrap = $make('div');
  extrasWrap.appendChild(extrasBox);
  extrasBox.style.width = '100%';
  extrasWrap.appendChild(
    $make(
      'p',
      'muted',
      'Optional behavior: special, ranged, attackStatus, resist, weak, splitInto, pounce, pack, produce, lays, hitHeight. The server validates every reference on save.',
    ),
  );
  body.appendChild(sect('Behavior (advanced)', extrasWrap));

  // Linkage rail.
  npcSiteRows(linkage, id);
  linkHead(linkage, 'prefab', 'Rolls these tables', draft.loot.length);
  if (draft.loot.length === 0) emptyLink(linkage, 'No loot tables attached.');
  for (const t of draft.loot) {
    const table = state.loot.find((x) => x.def.id === t);
    linkRow(linkage, t, `${table?.def.entries.length ?? '?'} entries`, () =>
      setSection('loot', t),
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

  const save = (): void => {
    void persistence
      .saveLootDef(draft)
      .catch((err: Error) => toast(err.message, 5200, 'error'));
  };
  body.appendChild(
    detailHead(draft.id, `${draft.entries.length} entries`, entry.edited, entry.authored, save, () =>
      void persistence.revertLootDef(id).catch((err: Error) => toast(err.message, 4600, 'error')),
    ),
  );
  body.appendChild(originNote(entry.edited, entry.authored));

  const isPick = (): boolean => draft.mode === 'pick';
  const header = $make('div', 'fgrid');
  header.append(
    field('description', textIn(draft.desc ?? '', (v) => (draft.desc = v || undefined)), '', true),
    field(
      'mode',
      selIn(
        [
          { v: 'each', l: 'each — every entry rolls its own chance' },
          { v: 'pick', l: 'pick — weighted draws from the pool' },
        ],
        draft.mode ?? 'each',
        (v) => {
          draft.mode = v === 'pick' ? 'pick' : undefined;
          rerender();
        },
      ),
    ),
  );
  if (isPick()) {
    header.append(
      field(
        'picks (min / max)',
        (() => {
          const pair = $make('span', 'pair') as HTMLElement;
          pair.append(
            numIn(draft.picks?.[0] ?? 1, (v) => (draft.picks = [v, draft.picks?.[1] ?? v])),
            numIn(draft.picks?.[1] ?? 1, (v) => (draft.picks = [draft.picks?.[0] ?? 1, v])),
          );
          return pair;
        })(),
        'draws per roll',
      ),
      field('nothing weight', numIn(draft.nothingW ?? 0, (v) => (draft.nothingW = v || undefined)), 'empty-handed weight in the pool'),
    );
  }
  header.append(
    field('rarity bonus', numIn(draft.rarityBonus ?? 0, (v) => (draft.rarityBonus = v || undefined), 0.1), 'shifts gear rarity rolls'),
    field(
      'min rarity',
      selIn(
        [{ v: '', l: 'none' }].concat(RARITY_TIERS.map((r) => ({ v: r, l: r }))),
        draft.minRarity ?? '',
        (v) => (draft.minRarity = (v || undefined) as LootTableDef['minRarity']),
      ),
      'floor for rolled gear',
    ),
  );
  body.appendChild(sect('Table', header));

  // ---------------------------------------------------- entry table
  const entriesWrap = $make('div');
  const rebuildEntries = (): void => {
    entriesWrap.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'etable';
    table.innerHTML = `<thead><tr>
      <th></th><th>drop</th><th>qty min</th><th>qty max</th>
      <th>${isPick() ? 'weight' : 'chance'}</th><th>mult</th><th></th>
    </tr></thead>`;
    const tbody = document.createElement('tbody');
    draft.entries.forEach((e, i) => {
      const tr = document.createElement('tr');
      // Icon cell.
      const icoTd = document.createElement('td');
      if (e.item) {
        const img = document.createElement('img');
        img.className = 'row-ico';
        img.src = itemIconUrl(e.item, 24);
        icoTd.appendChild(img);
      } else {
        icoTd.appendChild(iconImg(e.table ? 'prefab' : 'picker', 18));
      }
      tr.appendChild(icoTd);
      // Target cell: item picker / table picker / heirloom pool.
      const targetTd = document.createElement('td');
      const kind = e.item !== undefined ? 'item' : e.table !== undefined ? 'table' : 'pool';
      const kindSel = selIn(
        [
          { v: 'item', l: 'item' },
          { v: 'table', l: 'table' },
          { v: 'pool', l: 'heirloom pool' },
        ],
        kind,
        (v) => {
          delete e.item;
          delete e.table;
          delete e.pool;
          delete e.mult;
          if (v === 'item') e.item = state.items[0]?.id ?? 'coins';
          else if (v === 'table') e.table = state.loot.find((t) => t.def.id !== draft.id)?.def.id;
          else e.pool = 'heirloom';
          rebuildEntries();
        },
      );
      kindSel.style.width = '84px';
      targetTd.appendChild(kindSel);
      if (kind === 'item') {
        const itemSel = selIn(
          state.items
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((it) => ({ v: it.id, l: it.name })),
          e.item!,
          (v) => {
            e.item = v;
            rebuildEntries();
          },
        );
        itemSel.style.marginTop = '3px';
        targetTd.appendChild(itemSel);
      } else if (kind === 'table') {
        const tableSel = selIn(
          state.loot
            .filter((t) => t.def.id !== draft.id)
            .map((t) => t.def.id)
            .sort()
            .map((tid) => ({ v: tid, l: tid })),
          e.table ?? '',
          (v) => (e.table = v),
        );
        tableSel.style.marginTop = '3px';
        targetTd.appendChild(tableSel);
      }
      tr.appendChild(targetTd);
      // Qty.
      const qLo = document.createElement('td');
      qLo.className = 'num';
      qLo.appendChild(numIn(e.qty?.[0] ?? 1, (v) => (e.qty = [v, e.qty?.[1] ?? v])));
      tr.appendChild(qLo);
      const qHi = document.createElement('td');
      qHi.className = 'num';
      qHi.appendChild(numIn(e.qty?.[1] ?? e.qty?.[0] ?? 1, (v) => (e.qty = [e.qty?.[0] ?? 1, v])));
      tr.appendChild(qHi);
      // Chance / weight.
      const cw = document.createElement('td');
      cw.className = 'num';
      cw.appendChild(
        isPick()
          ? numIn(e.w ?? 1, (v) => {
              e.w = v;
              delete e.chance;
            })
          : numIn(e.chance ?? 1, (v) => {
              e.chance = v;
              delete e.w;
            }, 0.01),
      );
      tr.appendChild(cw);
      // Mult (table refs only).
      const multTd = document.createElement('td');
      multTd.className = 'num';
      if (kind === 'table') multTd.appendChild(numIn(e.mult ?? 1, (v) => (e.mult = v === 1 ? undefined : v), 0.1));
      tr.appendChild(multTd);
      // Remove.
      const act = document.createElement('td');
      act.className = 'act';
      const del = document.createElement('button');
      del.className = 'mini danger';
      del.appendChild(iconImg('trash', 13));
      del.title = 'Remove this entry';
      del.onclick = () => {
        draft.entries.splice(i, 1);
        markDirty();
        rebuildEntries();
      };
      act.appendChild(del);
      tr.appendChild(act);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    entriesWrap.appendChild(table);
    if (draft.entries.length === 0) {
      entriesWrap.appendChild($make('p', 'muted empty', 'No entries — this table pays out nothing.'));
    }
    const addRow = $make('div', 'add-row');
    const add = document.createElement('button');
    add.textContent = 'Add entry';
    add.onclick = () => {
      draft.entries.push(
        isPick() ? { item: 'coins', w: 1, qty: [1, 1] } : ({ item: 'coins', chance: 0.5, qty: [1, 1] } as LootEntryDef),
      );
      markDirty();
      rebuildEntries();
    };
    addRow.appendChild(add);
    entriesWrap.appendChild(addRow);
  };
  const rerender = (): void => {
    markDirty();
    body.innerHTML = '';
    linkage.innerHTML = '';
    lootDetailFromDraft(body, linkage, entry, draft, save);
  };
  rebuildEntries();
  body.appendChild(sect('Entries', entriesWrap));

  lootUsedByRows(linkage, id);
}

/** Re-render helper keeping the working draft across mode switches. */
function lootDetailFromDraft(
  body: HTMLElement,
  linkage: HTMLElement,
  entry: { edited: boolean; authored: boolean },
  draft: LootTableDef,
  save: () => void,
): void {
  // Simplest correct path: stash the draft back over state and rebuild.
  const rec = state.loot.find((t) => t.def.id === draft.id);
  if (rec) rec.def = draft;
  npcOrLootRebuild();
}

let npcOrLootRebuild: () => void = () => {};

// -------------------------------------------------------------- actors

function actorDetail(body: HTMLElement, linkage: HTMLElement, slug: string): void {
  const entry = state.actors.find((a) => a.def.id === slug);
  if (!entry) return;
  const draft: NpcActorDef = JSON.parse(JSON.stringify(entry.def)) as NpcActorDef;

  let jsonBox: HTMLTextAreaElement;
  const save = (): void => {
    let full: NpcActorDef;
    try {
      full = JSON.parse(jsonBox.value) as NpcActorDef;
    } catch (err) {
      toast(`definition JSON: ${(err as Error).message}`, 4200, 'error');
      return;
    }
    // The form fields win over the JSON for the fields they own.
    full.id = draft.id;
    full.name = draft.name;
    full.title = draft.title;
    full.examine = draft.examine;
    full.disposition = draft.disposition;
    if (draft.protection) full.protection = draft.protection;
    else delete (full as unknown as Record<string, unknown>).protection;
    void persistence
      .saveActorDef(full)
      .catch((err: Error) => toast(err.message, 5200, 'error'));
  };

  body.appendChild(
    detailHead(draft.name, draft.id, entry.edited, entry.authored, save, () =>
      void persistence.revertActorDef(slug).catch((err: Error) => toast(err.message, 4600, 'error')),
    ),
  );
  body.appendChild(originNote(entry.edited, entry.authored));

  const identity = $make('div', 'fgrid');
  identity.append(
    field('name', textIn(draft.name, (v) => (draft.name = v))),
    field('title', textIn(draft.title ?? '', (v) => (draft.title = v || undefined)), 'the epithet under the nameplate'),
    field('examine', textIn(draft.examine ?? '', (v) => (draft.examine = v || undefined)), '', true),
    field(
      'disposition',
      selIn(
        [
          { v: 'friendly', l: 'friendly — no combat body, beyond harm' },
          { v: 'neutral', l: 'neutral — fightable, never starts it' },
          { v: 'hostile', l: 'hostile — attacks on sight' },
        ],
        draft.disposition,
        (v) => (draft.disposition = v as NpcActorDef['disposition']),
      ),
    ),
    field(
      'protection',
      selIn(
        [
          { v: '', l: 'none' },
          { v: 'invulnerable', l: 'invulnerable — "Immune", still retaliates' },
          { v: 'untargetable', l: 'untargetable — attacks pass through' },
        ],
        draft.protection ?? '',
        (v) => (draft.protection = (v || undefined) as NpcActorDef['protection']),
      ),
      'the safety switch over the disposition',
    ),
  );
  body.appendChild(sect('Identity', identity));

  jsonBox = document.createElement('textarea');
  jsonBox.rows = 18;
  jsonBox.style.width = '100%';
  jsonBox.value = JSON.stringify(draft, null, 2);
  jsonBox.oninput = () => markDirty();
  const wrap = $make('div');
  wrap.appendChild(jsonBox);
  wrap.appendChild(
    $make(
      'p',
      'muted',
      'The full definition — wardrobe, look, inventory, lines, combat, dialogue and shop hooks. The identity fields above win where they overlap; the one validator checks every reference on save.',
    ),
  );
  body.appendChild(sect('Full definition (advanced)', wrap));

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
  for (const t of lootTables) {
    linkRow(linkage, t, '', () => setSection('loot', t));
  }
  if (draft.dialogue) {
    linkHead(linkage, 'picker', 'Speaks');
    linkRow(linkage, draft.dialogue, 'dialogue', null);
  }
}

// --------------------------------------------------------------- items

function itemDetail(body: HTMLElement, linkage: HTMLElement, id: string): void {
  const item = state.items.find((i) => i.id === id);
  if (!item) return;
  const head = $make('div', 'detail-head');
  const img = document.createElement('img');
  img.src = itemIconUrl(id, 44);
  img.width = 44;
  img.height = 44;
  img.style.borderRadius = '8px';
  head.appendChild(img);
  head.appendChild($make('h1', '', item.name));
  head.appendChild($make('span', 'sub', item.id));
  body.appendChild(head);
  body.appendChild(
    $make(
      'p',
      'origin-note',
      'Items ship with the game build — the catalog is reference. Attach items to the world through loot tables and recipes.',
    ),
  );
  const facts = $make('div', 'fgrid');
  const fact = (label: string, value: string): HTMLElement => {
    const f = $make('div', 'ffield');
    f.appendChild($make('span', '', label));
    f.appendChild($make('b', '', value));
    return f;
  };
  facts.append(
    fact('vendor value', `${item.value} coins`),
    fact('stackable', item.stackable ? 'yes' : 'no'),
    fact('slot', item.slot ?? '—'),
  );
  body.appendChild(sect('Facts', facts));
  if (item.desc) body.appendChild(sect('Description', $make('p', 'muted', item.desc)));

  // Linkage: loot tables + recipes.
  const droppedBy = state.loot.filter((t) => t.def.entries.some((e) => e.item === id));
  linkHead(linkage, 'prefab', 'Drops from', droppedBy.length);
  if (droppedBy.length === 0) emptyLink(linkage, 'No loot table pays this out.');
  for (const t of droppedBy) {
    linkRow(linkage, t.def.id, '', () => setSection('loot', t.def.id));
  }
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
  npcOrLootRebuild = () => buildDetail(body, linkage);
  const id = state.selectedId;
  if (!id) {
    const empty = $make('div', 'empty-state');
    const inner = $make('div');
    inner.appendChild(
      $make('p', 'muted', 'Pick an entry on the left — or create a new one. Every save validates, lands in the database, and goes live in the running world.'),
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
