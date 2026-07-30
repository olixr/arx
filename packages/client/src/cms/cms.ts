import type {
  DialogueDef,
  FactionsDef,
  FrontierDef,
  LootTableDef,
  NpcActorDef,
  NpcDef,
  PoiDef,
  VoiceDoc,
} from '@arx/content';
import { iconImg } from '../editor/editorIcons.js';
import { itemIconUrl } from '../render/icons.js';
import {
  fetchSpawnSites,
  getFactions,
  saveFactions,
  revertFactions,
  getFrontier,
  saveFrontier,
  revertFrontier,
  getVoice,
  saveVoiceDials,
  revertVoiceDials,
  type VoiceLedger,
  listActors,
  listDialogues,
  listItems,
  listLoot,
  listNpcs,
  listPois,
  listZoneRects,
  revertActor,
  revertDialogue,
  revertLoot,
  revertNpc,
  revertPoi,
  saveActor,
  saveDialogue,
  saveLoot,
  saveNpc,
  savePoi,
  type Editable,
  type ItemRow,
  type SpawnSites,
  type ZoneRect,
} from './api.js';
import { openActorWizard } from './actorWizard.js';
import { buildDetail, newLootTable, newNpcDef, newPoiDef } from './editors.js';
import { newDialogueDef } from './dialogueEditor.js';
import { creatureRender } from './gameRender.js';
import { actorBust } from './portraits.js';

/**
 * Arx Content Studio — the CMS over the running game's DB-first
 * content: bestiary archetypes, loot tables, and placed-actor
 * identities, with the item catalog as the reference shelf. Every
 * save validates on the server, lands in the database, hot-swaps the
 * live registry, and retires standing bodies so the world plays the
 * new numbers within a tick.
 */

export type Section =
  | 'npcs'
  | 'loot'
  | 'actors'
  | 'dialogues'
  | 'pois'
  | 'frontier'
  | 'factions'
  | 'voice'
  | 'items';

export interface CmsState {
  section: Section;
  selectedId: string | null;
  query: string;
  npcs: Array<Editable<NpcDef>>;
  loot: Array<Editable<LootTableDef>>;
  actors: Array<Editable<NpcActorDef>>;
  dialogues: Array<Editable<DialogueDef>>;
  pois: Array<Editable<PoiDef>>;
  /** The live POI prefab library's ids (pool pickers + validation). */
  poiPrefabIds: string[];
  /** The living frontier's dial table — a singleton doc (Phase 6). */
  frontier: { def: FrontierDef; edited: boolean } | null;
  /** The faction ledger — a singleton doc (factions Phase 6). */
  factions: { def: FactionsDef; edited: boolean } | null;
  /** The spoken world: clips, banks, dials (voiceover Phase 5). */
  voice: VoiceLedger | null;
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
  dialogues: [],
  pois: [],
  poiPrefabIds: [],
  frontier: null,
  factions: null,
  voice: null,
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
    } else if (section === 'dialogues') {
      const res = await listDialogues();
      state.dialogues = res.dialogues;
      for (const err of res.errors) toast(`DB dialogue invalid: ${err}`, 5000, 'error');
    } else if (section === 'pois') {
      const res = await listPois();
      state.pois = res.pois;
      state.poiPrefabIds = res.prefabIds;
    } else if (section === 'frontier') {
      state.frontier = await getFrontier();
    } else if (section === 'factions') {
      state.factions = await getFactions();
    } else if (section === 'voice') {
      state.voice = await getVoice();
      for (const err of state.voice.errors) toast(`DB voice clip invalid: ${err}`, 5000, 'error');
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
    const [npcs, loot, actors, dialogues, pois, items, sites, zones, frontier, factions, voice] =
      await Promise.all([
        listNpcs(),
        listLoot(),
        listActors(),
        listDialogues(),
        listPois(),
        listItems(),
        fetchSpawnSites(),
        listZoneRects(),
        getFrontier(),
        getFactions(),
        getVoice(),
      ]);
    state.npcs = npcs;
    state.loot = loot;
    state.actors = actors.actors;
    state.dialogues = dialogues.dialogues;
    state.pois = pois.pois;
    state.poiPrefabIds = pois.prefabIds;
    state.items = items;
    state.sites = sites;
    state.zones = zones;
    state.frontier = frontier;
    state.factions = factions;
    state.voice = voice;
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
    id: 'dialogues',
    label: 'Dialogues',
    icon: 'speech',
    hint: 'Conversation trees — beats, branches, gates, and who offers them. Saves go live; the next Talk speaks the edit.',
  },
  {
    id: 'pois',
    label: 'Points of Interest',
    icon: 'stamp',
    hint: 'Wilderness archetypes — prefab pools, tier-scaled garrisons, and approach cues. Standing sites recompose on save.',
  },
  {
    id: 'frontier',
    label: 'Frontier',
    icon: 'stamp',
    hint: "The living frontier's weather — ember, boldness, calm, raids, and fortune. A save steers the very next beat; no restart, no reload.",
  },
  {
    id: 'factions',
    label: 'Factions',
    icon: 'hall',
    hint: 'The name you carry — the roster, the bands, the deed values, the two poles, and the crime dials. A save re-draws every loyalty on the very next scan.',
  },
  {
    id: 'voice',
    label: 'Voice',
    icon: 'speech',
    hint: 'The spoken world — the clip library, each throat’s fallback bank, and the quip dials. An upload speaks on the very next line; no reload, no deploy.',
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
            : s.id === 'dialogues'
              ? state.dialogues.length
              : s.id === 'pois'
                ? state.pois.length
                : s.id === 'frontier'
                  ? (state.frontier ? Object.keys(state.frontier.def).length : 0)
                  : s.id === 'factions'
                    ? (state.factions?.def.roster.length ?? 0)
                    : s.id === 'voice'
                      ? (state.voice?.clips.length ?? 0)
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
  if (def.model.kind === 'creature') {
    const base = state.npcs.find((n) => n.def.id === (def.model as { creature: string }).creature);
    if (!base) return null;
    const canvas = creatureRender(base.def, 26);
    canvas.className = 'ico';
    return canvas;
  }
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
  if (state.section === 'dialogues') {
    const speakerOf = (d: Editable<DialogueDef>): NpcActorDef | null => {
      const bindings = (d.def.bindings ?? []).slice().sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      for (const b of bindings) {
        const actor = state.actors.find((a) => a.def.id === b.target);
        if (actor) return actor.def;
      }
      return null;
    };
    const groupOf = (d: Editable<DialogueDef>, speaker: NpcActorDef | null): string => {
      if (!d.def.bindings || d.def.bindings.length === 0) return 'Unbound trees';
      if (!speaker) return 'Unbound trees';
      const post = state.sites.actors.find((s) => s.actor === speaker.id);
      if (!post) return 'Unposted voices';
      return zoneAt(post.x, post.y)?.name ?? 'The open frontier';
    };
    return state.dialogues
      .filter((d) =>
        match(d.def.id, ...d.def.nodes.map((n) => n.text), ...(d.def.bindings ?? []).map((b) => b.target)),
      )
      .map((d) => {
        const speaker = speakerOf(d);
        const choices = d.def.nodes.reduce((n, node) => n + (node.choices?.length ?? 0), 0);
        return {
          id: d.def.id,
          title: d.def.id,
          sub: `${speaker ? `${speaker.name} · ` : ''}${d.def.nodes.length} beat${d.def.nodes.length === 1 ? '' : 's'}${choices > 0 ? ` · ${choices} choices` : ''}`,
          badge: d.def.once ? 'once' : 'evergreen',
          badgeEdited: d.edited,
          ico: (speaker ? actorIco(speaker) : null) ?? iconWrap(iconImg('speech', 18)),
          group: groupOf(d, speaker),
        };
      })
      .sort(
        (a, b) => a.group!.localeCompare(b.group!) || a.sub.localeCompare(b.sub) || a.id.localeCompare(b.id),
      );
  }
  if (state.section === 'pois') {
    return state.pois
      .filter((p) => match(p.def.id, p.def.name, p.def.description ?? ''))
      .sort((a, b) => a.def.tiers[0] - b.def.tiers[0] || a.def.name.localeCompare(b.def.name))
      .map((p) => ({
        id: p.def.id,
        title: p.def.name,
        sub: `${p.def.prefabs.length} prefab${p.def.prefabs.length === 1 ? '' : 's'} · ${p.def.garrison.length} garrison entr${p.def.garrison.length === 1 ? 'y' : 'ies'}`,
        badge: `tiers ${p.def.tiers[0]}–${p.def.tiers[1]}`,
        badgeEdited: p.edited,
        ico: iconWrap(iconImg('stamp', 18)),
        group: p.def.tiers[0] <= 1 ? 'Near frontier' : p.def.tiers[0] <= 3 ? 'Expedition line' : 'Deep frontier',
      }));
  }
  if (state.section === 'frontier') {
    const f = state.frontier;
    return [
      {
        id: 'world',
        title: 'The Weather',
        sub: f
          ? `${Object.keys(f.def).length} dials — ember, boldness, calm, raids, fortune`
          : 'dial table not loaded',
        badge: f?.edited ? 'edited' : 'authored',
        badgeEdited: f?.edited ?? false,
        ico: iconWrap(iconImg('stamp', 18)),
        group: 'The living frontier',
      },
    ];
  }
  if (state.section === 'factions') {
    const fx = state.factions;
    return [
      {
        id: 'world',
        title: 'The Names',
        sub: fx
          ? `${fx.def.roster.length} factions — bands, deeds, poles, prices, and the crime dials`
          : 'ledger not loaded',
        badge: fx?.edited ? 'edited' : 'authored',
        badgeEdited: fx?.edited ?? false,
        ico: iconWrap(iconImg('hall', 18)),
        group: 'The name you carry',
      },
    ];
  }
  if (state.section === 'voice') {
    const v = state.voice;
    const spokenLines = state.dialogues.reduce(
      (n, d) => n + d.def.nodes.filter((node) => node.voice !== undefined).length,
      0,
    );
    return [
      {
        id: 'library',
        title: 'The Library',
        sub: v ? `${v.clips.length} clip${v.clips.length === 1 ? '' : 's'} — upload, audition, describe` : 'ledger not loaded',
        badge: `${v?.clips.length ?? 0}`,
        ico: iconWrap(iconImg('speech', 18)),
        group: 'The spoken world',
      },
      {
        id: 'banks',
        title: 'The Banks',
        sub: v
          ? `${v.banks.length} throat${v.banks.length === 1 ? '' : 's'} with fallback quips — greet, ack, farewell, bark`
          : 'ledger not loaded',
        badge: `${v?.banks.length ?? 0}`,
        ico: iconWrap(iconImg('actor', 18)),
        group: 'The spoken world',
      },
      {
        id: 'dials',
        title: 'The Dials',
        sub: `quip cadence, duck depths, prefetch and upload caps · ${spokenLines} voiced line${spokenLines === 1 ? '' : 's'} in the trees`,
        badge: v?.dials.edited ? 'edited' : 'authored',
        badgeEdited: v?.dials.edited ?? false,
        ico: iconWrap(iconImg('stamp', 18)),
        group: 'The spoken world',
      },
    ];
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
  $('btn-new-entry').classList.toggle(
    'hidden',
    state.section === 'items' ||
      state.section === 'frontier' ||
      state.section === 'factions' ||
      state.section === 'voice',
  );
  if (!state.dirty) setSaveState(state.online ? 'all changes saved' : 'offline');
}

// ------------------------------------------------------------ wiring

$('list-search').addEventListener('input', () => {
  state.query = ($('list-search') as HTMLInputElement).value;
  renderList();
});

$('btn-new-entry').onclick = () => {
  if (state.section === 'actors') {
    // Actors get the full foundry — identity, then a body: the
    // Hero's Mirror or a bestiary pick, all live-rendered.
    if (state.dirty && !window.confirm('Discard unsaved changes?')) return;
    state.dirty = false;
    openActorWizard();
    return;
  }
  const id = window.prompt(
    state.section === 'npcs'
      ? 'New creature id (lowercase, e.g. bog_fiend):'
      : state.section === 'pois'
        ? 'New archetype id (lowercase, e.g. bandit_watch):'
        : state.section === 'dialogues'
          ? 'New dialogue id (lowercase, e.g. ferryman_toll):'
          : 'New loot table id (lowercase, e.g. bog_fiend_drops):',
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
  } else if (state.section === 'dialogues') {
    if (state.dialogues.some((d) => d.def.id === id)) {
      toast(`'${id}' already exists`, 3000, 'error');
      return;
    }
    state.dialogues.push({ def: newDialogueDef(id), edited: true, authored: false });
  } else if (state.section === 'pois') {
    if (state.pois.some((p) => p.def.id === id)) {
      toast(`'${id}' already exists`, 3000, 'error');
      return;
    }
    state.pois.push({ def: newPoiDef(id), edited: true, authored: false });
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
  if (
    ['npcs', 'loot', 'actors', 'dialogues', 'pois', 'items', 'frontier', 'factions', 'voice'].includes(sect)
  ) {
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
  async savePoiDef(def: PoiDef): Promise<void> {
    await savePoi(def);
    state.dirty = false;
    await reloadSection('pois');
    setSaveState('all changes saved');
    toast(`'${def.name}' saved — standing sites recompose`, 3000, 'success');
  },
  async revertPoiDef(id: string): Promise<void> {
    const { outcome } = await revertPoi(id);
    state.dirty = false;
    await reloadSection('pois');
    if (outcome === 'deleted') state.selectedId = null;
    renderAll();
    toast(outcome === 'reverted' ? 'restored the shipped archetype' : 'deleted', 3000, 'success');
  },
  async saveFrontierDef(def: FrontierDef): Promise<void> {
    await saveFrontier(def);
    state.dirty = false;
    await reloadSection('frontier');
    setSaveState('all changes saved');
    toast('the weather is set — the very next frontier beat obeys', 3000, 'success');
  },
  async revertFrontierDef(): Promise<void> {
    await revertFrontier();
    state.dirty = false;
    await reloadSection('frontier');
    renderAll();
    toast('the shipped weather stands again', 3000, 'success');
  },
  async saveFactionsDef(def: FactionsDef): Promise<void> {
    await saveFactions(def);
    state.dirty = false;
    await reloadSection('factions');
    setSaveState('all changes saved');
    toast('the names are set — the very next scan reads them', 3000, 'success');
  },
  async revertFactionsDef(): Promise<void> {
    await revertFactions();
    state.dirty = false;
    await reloadSection('factions');
    renderAll();
    toast('the shipped roster stands again', 3000, 'success');
  },
  async saveVoiceDialsDef(def: VoiceDoc): Promise<void> {
    await saveVoiceDials(def);
    state.dirty = false;
    await reloadSection('voice');
    setSaveState('all changes saved');
    toast('the dials are set — the very next quip obeys', 3000, 'success');
  },
  async revertVoiceDialsDef(): Promise<void> {
    await revertVoiceDials();
    state.dirty = false;
    await reloadSection('voice');
    renderAll();
    toast('the shipped dials stand again', 3000, 'success');
  },
  async saveDialogueDef(def: DialogueDef): Promise<void> {
    await saveDialogue(def);
    state.dirty = false;
    await reloadSection('dialogues');
    setSaveState('all changes saved');
    toast(`'${def.id}' saved — the next Talk speaks it`, 3000, 'success');
  },
  async revertDialogueDef(id: string): Promise<void> {
    const { outcome } = await revertDialogue(id);
    state.dirty = false;
    await reloadSection('dialogues');
    if (outcome === 'deleted') state.selectedId = null;
    renderAll();
    toast(outcome === 'reverted' ? 'restored the shipped tree' : 'deleted', 3000, 'success');
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
