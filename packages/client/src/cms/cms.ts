import type { LootTableDef, NpcActorDef, NpcDef } from '@devcraft/content';
import { iconImg } from '../editor/editorIcons.js';
import { itemIconUrl } from '../render/icons.js';
import {
  fetchSpawnSites,
  listActors,
  listItems,
  listLoot,
  listNpcs,
  listZoneRects,
  revertActor,
  revertLoot,
  revertNpc,
  saveActor,
  saveLoot,
  saveNpc,
  type Editable,
  type ItemRow,
  type SpawnSites,
  type ZoneRect,
} from './api.js';
import { buildDetail, newLootTable, newNpcDef } from './editors.js';
import { creatureRender } from './gameRender.js';
import { actorBust } from './portraits.js';

/**
 * DevCraft Content Studio — the CMS over the running game's DB-first
 * content: bestiary archetypes, loot tables, and placed-actor
 * identities, with the item catalog as the reference shelf. Every
 * save validates on the server, lands in the database, hot-swaps the
 * live registry, and retires standing bodies so the world plays the
 * new numbers within a tick.
 */

export type Section = 'npcs' | 'loot' | 'actors' | 'items';

export interface CmsState {
  section: Section;
  selectedId: string | null;
  query: string;
  npcs: Array<Editable<NpcDef>>;
  loot: Array<Editable<LootTableDef>>;
  actors: Array<Editable<NpcActorDef>>;
  items: ItemRow[];
  sites: SpawnSites;
  zones: ZoneRect[];
  online: boolean;
  /** Unsaved edits in the open editor. */
  dirty: boolean;
}

export const state: CmsState = {
  section: 'npcs',
  selectedId: null,
  query: '',
  npcs: [],
  loot: [],
  actors: [],
  items: [],
  sites: { npcs: [], actors: [] },
  zones: [],
  online: false,
  dirty: false,
};

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

export function toast(text: string, ms = 2600, kind: 'info' | 'success' | 'error' = 'info'): void {
  const el = $('toast');
  el.textContent = text;
  el.className = `show ${kind}`;
  window.clearTimeout((toast as { t?: number }).t);
  (toast as { t?: number }).t = window.setTimeout(() => el.classList.remove('show'), ms);
}

export function setHint(text: string): void {
  $('st-hint').textContent = text;
}

export function setSaveState(text: string): void {
  $('st-state').textContent = text;
}

// ----------------------------------------------------------- loading

export async function reloadSection(section: Section): Promise<void> {
  try {
    if (section === 'npcs') state.npcs = await listNpcs();
    else if (section === 'loot') state.loot = await listLoot();
    else if (section === 'actors') {
      const res = await listActors();
      state.actors = res.actors;
      for (const err of res.errors) toast(`DB actor invalid: ${err}`, 5000, 'error');
    } else state.items = await listItems();
    state.online = true;
  } catch (err) {
    state.online = false;
    toast((err as Error).message, 4200, 'error');
  }
  renderAll();
}

async function loadEverything(): Promise<void> {
  try {
    const [npcs, loot, actors, items, sites, zones] = await Promise.all([
      listNpcs(),
      listLoot(),
      listActors(),
      listItems(),
      fetchSpawnSites(),
      listZoneRects(),
    ]);
    state.npcs = npcs;
    state.loot = loot;
    state.actors = actors.actors;
    state.items = items;
    state.sites = sites;
    state.zones = zones;
    state.online = true;
    $('server-pill').textContent = 'connected';
    $('server-pill').className = 'pill ok';
  } catch (err) {
    state.online = false;
    $('server-pill').textContent = 'offline';
    $('server-pill').className = 'pill bad';
    toast((err as Error).message, 5000, 'error');
  }
  renderAll();
}

export async function refreshSites(): Promise<void> {
  try {
    state.sites = await fetchSpawnSites();
  } catch {
    /* linkage panel just keeps its last truth */
  }
}

/** Zone whose rect contains a world tile, for "open in Map Studio". */
export function zoneAt(x: number, y: number): ZoneRect | null {
  for (const z of state.zones) {
    if (x >= z.origin.x && y >= z.origin.y && x < z.origin.x + z.width && y < z.origin.y + z.height) {
      return z;
    }
  }
  return null;
}

// ---------------------------------------------------------- sections

const SECTIONS: Array<{ id: Section; label: string; icon: string; hint: string }> = [
  {
    id: 'npcs',
    label: 'Bestiary',
    icon: 'cluster',
    hint: 'Creature archetypes — stats, behavior, and the loot they carry. Saves apply to the living world within a tick.',
  },
  {
    id: 'loot',
    label: 'Loot Tables',
    icon: 'prefab',
    hint: 'Drop tables — entries, weights, and composition. The very next kill rolls the new numbers.',
  },
  {
    id: 'actors',
    label: 'Actors',
    icon: 'actor',
    hint: 'Named townsfolk — identity, disposition, wardrobe, and combat. Posted bodies respawn with the edit.',
  },
  {
    id: 'items',
    label: 'Items',
    icon: 'picker',
    hint: 'The item catalog — reference only, with everywhere each item drops and crafts.',
  },
];

export function setSection(section: Section, selectedId: string | null = null): void {
  if (state.dirty && !window.confirm('Discard unsaved changes?')) return;
  state.dirty = false;
  state.section = section;
  state.selectedId = selectedId;
  state.query = '';
  location.hash = selectedId ? `#${section}/${selectedId}` : `#${section}`;
  renderAll();
}

export function select(id: string | null): void {
  if (state.dirty && !window.confirm('Discard unsaved changes?')) return;
  state.dirty = false;
  state.selectedId = id;
  location.hash = id ? `#${state.section}/${id}` : `#${state.section}`;
  renderAll();
}

export function markDirty(): void {
  if (!state.dirty) {
    state.dirty = true;
    setSaveState('unsaved changes');
  }
}

// ---------------------------------------------------------- rendering

function renderRail(): void {
  const rail = $('rail-top');
  rail.innerHTML = '';
  for (const s of SECTIONS) {
    const count =
      s.id === 'npcs'
        ? state.npcs.length
        : s.id === 'loot'
          ? state.loot.length
          : s.id === 'actors'
            ? state.actors.length
            : state.items.length;
    const b = document.createElement('button');
    b.className = 'rail-tab' + (state.section === s.id ? ' active' : '');
    b.appendChild(iconImg(s.icon, 15));
    b.append(` ${s.label} `);
    const c = document.createElement('span');
    c.className = 'count';
    c.textContent = String(count);
    b.appendChild(c);
    b.onclick = () => setSection(s.id);
    rail.appendChild(b);
  }
}

interface ListEntry {
  id: string;
  title: string;
  sub: string;
  badge?: string;
  badgeEdited?: boolean;
  ico?: HTMLElement;
  /** Section header this entry files under (grouped lists). */
  group?: string;
}

/** List thumbs are the REAL body render, ring and all, at coin size. */
function npcIco(def: NpcDef): HTMLElement {
  const canvas = creatureRender(def, 26);
  canvas.className = 'ico';
  return canvas;
}

function actorIco(def: NpcActorDef): HTMLElement | null {
  const bust = actorBust(def, 26);
  if (!bust) return null;
  bust.className = 'ico';
  return bust;
}

function itemIco(id: string): HTMLElement {
  const img = document.createElement('img');
  img.className = 'ico';
  img.src = itemIconUrl(id, 26);
  return img;
}

function listEntries(): ListEntry[] {
  const q = state.query.trim().toLowerCase();
  const match = (...hay: string[]): boolean =>
    !q || hay.some((h) => h.toLowerCase().includes(q));
  if (state.section === 'npcs') {
    const band = (lv: number): string =>
      lv <= 5 ? 'Meadow (lv 1–5)' : lv <= 12 ? 'Frontier (lv 6–12)' : lv <= 25 ? 'Deepwood (lv 13–25)' : 'Champions (lv 26+)';
    return state.npcs
      .filter((n) => match(n.def.id, n.def.name))
      .sort((a, b) => a.def.level - b.def.level || a.def.name.localeCompare(b.def.name))
      .map((n) => ({
        id: n.def.id,
        title: n.def.name,
        sub: `${n.def.id} · ${n.def.loot.length} loot table${n.def.loot.length === 1 ? '' : 's'}`,
        badge: `lv ${n.def.level}`,
        badgeEdited: n.edited,
        ico: npcIco(n.def),
        group: band(n.def.level),
      }));
  }
  if (state.section === 'loot') {
    const family = (tid: string): string =>
      tid.startsWith('chest_') ? 'Chests' :
      tid.startsWith('champion_') || tid.startsWith('crypt_') || tid.startsWith('dire_') ? 'Champions & crypts' :
      tid.includes('wardrobe') || tid.includes('arms') || tid.includes('armory') ? 'Gear wardrobes' :
      tid.startsWith('recipes_') || tid.includes('heirloom') ? 'Special pools' : 'Creature drops';
    return state.loot
      .filter((t) => match(t.def.id, t.def.desc ?? ''))
      .sort(
        (a, b) =>
          family(a.def.id).localeCompare(family(b.def.id)) || a.def.id.localeCompare(b.def.id),
      )
      .map((t) => ({
        id: t.def.id,
        title: t.def.id,
        sub: t.def.desc ?? `${t.def.mode ?? 'each'} · ${t.def.entries.length} entries`,
        badge: `${t.def.entries.length}`,
        badgeEdited: t.edited,
        group: family(t.def.id),
      }));
  }
  if (state.section === 'actors') {
    const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
    return state.actors
      .filter((a) => match(a.def.id, a.def.name, a.def.title ?? ''))
      .sort((a, b) => a.def.disposition.localeCompare(b.def.disposition) || a.def.name.localeCompare(b.def.name))
      .map((a) => ({
        id: a.def.id,
        title: a.def.name,
        sub: a.def.title ?? a.def.id,
        badge: a.def.disposition,
        badgeEdited: a.edited,
        ico: actorIco(a.def) ?? iconWrap(iconImg('actor', 18)),
        group: cap(a.def.disposition),
      }));
  }
  return state.items
    .filter((i) => match(i.id, i.name))
    .sort(
      (a, b) =>
        Number(!!b.slot) - Number(!!a.slot) || a.name.localeCompare(b.name),
    )
    .map((i) => ({
      id: i.id,
      title: i.name,
      sub: i.slot ? `${i.id} · ${i.slot}` : i.id,
      badge: `${i.value}c`,
      ico: itemIco(i.id),
      group: i.slot ? 'Gear' : 'Goods & materials',
    }));
}

function iconWrap(img: HTMLElement): HTMLElement {
  const el = document.createElement('span');
  el.className = 'ico';
  el.style.display = 'inline-flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.appendChild(img);
  return el;
}

function renderList(): void {
  const rows = $('list-rows');
  rows.innerHTML = '';
  const entries = listEntries();
  if (entries.length === 0) {
    const p = document.createElement('p');
    p.className = 'muted empty';
    p.style.padding = '8px';
    p.textContent = state.query
      ? `Nothing matches '${state.query}'.`
      : 'Nothing here yet — create the first one.';
    rows.appendChild(p);
    return;
  }
  let lastGroup: string | undefined;
  for (const e of entries) {
    if (e.group && e.group !== lastGroup) {
      lastGroup = e.group;
      const head = document.createElement('div');
      head.className = 'list-sect';
      head.textContent = e.group;
      rows.appendChild(head);
    }
    const row = document.createElement('button');
    row.className = 'list-row' + (state.selectedId === e.id ? ' active' : '');
    if (e.ico) row.appendChild(e.ico);
    const txt = document.createElement('span');
    txt.className = 'txt';
    txt.innerHTML = `<b>${e.title}</b><span>${e.sub}</span>`;
    row.appendChild(txt);
    if (e.badge) {
      const badge = document.createElement('span');
      badge.className = 'badge' + (e.badgeEdited ? ' edited' : '');
      badge.textContent = e.badgeEdited ? `${e.badge} · edited` : e.badge;
      badge.title = e.badgeEdited ? 'Diverged from the shipped definition' : '';
      row.appendChild(badge);
    }
    row.onclick = () => select(e.id);
    rows.appendChild(row);
  }
}

export function renderAll(): void {
  renderRail();
  renderList();
  buildDetail($('detail-body'), $('linkage-col'));
  const s = SECTIONS.find((x) => x.id === state.section)!;
  setHint(s.hint);
  $('btn-new-entry').classList.toggle('hidden', state.section === 'items');
  if (!state.dirty) setSaveState(state.online ? 'all changes saved' : 'offline');
}

// ------------------------------------------------------------ wiring

$('list-search').addEventListener('input', () => {
  state.query = ($('list-search') as HTMLInputElement).value;
  renderList();
});

$('btn-new-entry').onclick = () => {
  const id = window.prompt(
    state.section === 'npcs'
      ? 'New creature id (lowercase, e.g. bog_fiend):'
      : state.section === 'loot'
        ? 'New loot table id (lowercase, e.g. bog_fiend_drops):'
        : 'New actor slug (lowercase, e.g. herbalist_mira):',
  );
  if (!id) return;
  if (!/^[a-z][a-z0-9_]*$/.test(id)) {
    toast('ids are lowercase [a-z0-9_]', 3200, 'error');
    return;
  }
  if (state.section === 'npcs') {
    if (state.npcs.some((n) => n.def.id === id)) {
      toast(`'${id}' already exists`, 3000, 'error');
      return;
    }
    state.npcs.push({ def: newNpcDef(id), edited: true, authored: false });
  } else if (state.section === 'loot') {
    if (state.loot.some((t) => t.def.id === id)) {
      toast(`'${id}' already exists`, 3000, 'error');
      return;
    }
    state.loot.push({ def: newLootTable(id), edited: true, authored: false });
  } else if (state.section === 'actors') {
    toast('Clone an existing actor: open one, change its slug, save.', 4200);
    return;
  }
  select(id);
  markDirty();
  toast(`drafted '${id}' — fill it in and save`, 3200);
};

window.addEventListener('keydown', (e) => {
  const inField =
    document.activeElement instanceof HTMLInputElement ||
    document.activeElement instanceof HTMLTextAreaElement ||
    document.activeElement instanceof HTMLSelectElement;
  if ((e.metaKey || e.ctrlKey) && e.code === 'KeyS') {
    e.preventDefault();
    $('detail-body').querySelector<HTMLButtonElement>('.detail-head .primary')?.click();
    return;
  }
  if (inField) return;
  if (e.code === 'Slash') {
    e.preventDefault();
    $('list-search').focus();
  }
});

window.addEventListener('beforeunload', (e) => {
  if (state.dirty) e.preventDefault();
});

// ------------------------------------------------------------- boot

const hash = location.hash.replace(/^#/, '');
if (hash) {
  const [sect, id] = hash.split('/') as [Section, string?];
  if (['npcs', 'loot', 'actors', 'items'].includes(sect)) {
    state.section = sect;
    state.selectedId = id ?? null;
  }
}
void loadEverything();

// The save/revert helpers editors call — kept here so editors stay pure DOM.
export const persistence = {
  async saveNpcDef(def: NpcDef): Promise<void> {
    await saveNpc(def);
    await reloadSection('npcs');
    await refreshSites();
    state.dirty = false;
    setSaveState('all changes saved');
    toast(`'${def.name}' saved — live in the world`, 3000, 'success');
  },
  async revertNpcDef(id: string): Promise<void> {
    const { outcome } = await revertNpc(id);
    state.dirty = false;
    await reloadSection('npcs');
    if (outcome === 'deleted') state.selectedId = null;
    renderAll();
    toast(outcome === 'reverted' ? 'restored the shipped definition' : 'deleted', 3000, 'success');
  },
  async saveLootDef(def: LootTableDef): Promise<void> {
    await saveLoot(def);
    state.dirty = false;
    await reloadSection('loot');
    setSaveState('all changes saved');
    toast(`'${def.id}' saved — next kill rolls it`, 3000, 'success');
  },
  async revertLootDef(id: string): Promise<void> {
    const { outcome } = await revertLoot(id);
    state.dirty = false;
    await reloadSection('loot');
    if (outcome === 'deleted') state.selectedId = null;
    renderAll();
    toast(outcome === 'reverted' ? 'restored the shipped table' : 'deleted', 3000, 'success');
  },
  async saveActorDef(def: NpcActorDef): Promise<void> {
    await saveActor(def);
    state.dirty = false;
    await reloadSection('actors');
    await refreshSites();
    setSaveState('all changes saved');
    toast(`'${def.name}' saved — the post respawns with it`, 3000, 'success');
  },
  async revertActorDef(slug: string): Promise<void> {
    const { outcome } = await revertActor(slug);
    state.dirty = false;
    await reloadSection('actors');
    if (outcome === 'deleted') state.selectedId = null;
    renderAll();
    toast(outcome === 'reverted' ? 'restored the shipped actor' : 'deleted', 3000, 'success');
  },
};
