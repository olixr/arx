import {
  STRUCTURE_TEMPLATES,
  templateWidth,
  templateHeight,
  zoneEdgeProfileOf,
  type NpcActorDef,
  type ZoneDef,
} from '@arx/content';
import { SIGN_MAX_LINE, SIGN_MAX_LINES, SIGN_MAX_TITLE, Tile, sanitizeSignLine } from '@arx/shared';
import { actorBust } from '../cms/portraits.js';
import { hourRing } from '../studio2/kit.js';
import { validateZone } from './validate.js';
import type { PrefabListEntry, RegistrySnapshot } from './api.js';
import { iconImg } from './editorIcons.js';
import { placementLabel, sameRef } from './placements.js';
import { renderLayersPreview, templateLayers } from './preview.js';
import type { EditorState, PlacementRef } from './state.js';

/**
 * The sidebar's Structures and Placements panels. Everything here is
 * pure DOM assembly — the editor supplies the actions, the panels
 * supply the affordances: previews you can read, rows you can focus,
 * and an inspector that edits the selected placement in place.
 */

export interface PanelActions {
  armTemplate(id: string): void;
  armPrefab(id: string): void;
  saveSelectionAsPrefab(): void;
  removePrefab(id: string): void;
  refreshPrefabs(): void;
  selectPlacement(ref: PlacementRef | null): void;
  focusPlacement(ref: PlacementRef): void;
  removePlacement(ref: PlacementRef): void;
  /** Mutate the selected placement inside one undoable operation. */
  editPlacement(ref: PlacementRef, label: string, mutate: (zone: ZoneDef) => void): void;
  /** Phase 3: arm patrol-waypoint editing for a cluster. */
  beginPatrolEdit(index: number): void;
  clearPatrol(index: number): void;
}

export interface PanelDeps {
  state: EditorState;
  registry: RegistrySnapshot;
  prefabs: PrefabListEntry[];
  prefabsOnline: boolean;
  /** Real-art preview for a prefab, or null while it loads. */
  prefabPreview: (id: string) => HTMLCanvasElement | null;
  /** Full actor defs (DB truth when online) — portraits + dressing. */
  actorDefs: ReadonlyMap<string, NpcActorDef>;
  actions: PanelActions;
}

/** A safe true bust — an exotic look must never break the studio. */
function actorBustThumb(def: NpcActorDef, size: number): HTMLCanvasElement | null {
  try {
    const c = actorBust(def, size);
    if (c) c.className = 'insp-bust';
    return c;
  } catch {
    return null;
  }
}

// ------------------------------------------------------ previews

/** Template cards render through the real bake, cached per template. */
const templateThumbs = new Map<string, HTMLCanvasElement>();

function templateThumb(id: string): HTMLCanvasElement | null {
  const hit = templateThumbs.get(id);
  if (hit) return hit;
  const tpl = STRUCTURE_TEMPLATES.find((t) => t.id === id);
  if (!tpl) return null;
  const canvas = renderLayersPreview(templateLayers(tpl), 150);
  templateThumbs.set(id, canvas);
  return canvas;
}

// ------------------------------------------------- structures panel

export function buildStructuresPanel(root: HTMLElement, deps: PanelDeps): void {
  const { state, actions } = deps;
  root.innerHTML = '';

  const head = document.createElement('div');
  head.className = 'panel-head';
  head.textContent = 'Structure templates';
  root.appendChild(head);
  const note = document.createElement('p');
  note.className = 'muted';
  note.textContent =
    'Pick one, then click the map to stamp it. X mirrors east-west; buildings never rotate (the camera reads south faces).';
  root.appendChild(note);

  const grid = document.createElement('div');
  grid.className = 'card-grid';
  for (const tpl of STRUCTURE_TEMPLATES) {
    const armed = state.tool === 'structure' && state.armedTemplate === tpl.id;
    const card = document.createElement('button');
    card.className = 'card' + (armed ? ' armed' : '');
    card.title = armed
      ? 'Armed — click the map to stamp, click here or press Esc to put it away'
      : `Arm ${tpl.meta?.label ?? tpl.id} for stamping`;
    const pic = document.createElement('div');
    pic.className = 'card-pic';
    const thumb = templateThumb(tpl.id);
    if (thumb) pic.appendChild(thumb);
    card.appendChild(pic);
    const cap = document.createElement('div');
    cap.className = 'card-cap';
    cap.innerHTML = `<b>${tpl.meta?.label ?? tpl.id}</b><span>${templateWidth(tpl)}×${templateHeight(tpl)}</span>`;
    card.appendChild(cap);
    card.onclick = () => (armed ? actions.armTemplate('') : actions.armTemplate(tpl.id));
    grid.appendChild(card);
  }
  root.appendChild(grid);

  // ------------------------------------------------ prefab library
  const phead = document.createElement('div');
  phead.className = 'panel-head';
  phead.textContent = 'Prefab library';
  const refresh = document.createElement('button');
  refresh.className = 'mini';
  refresh.textContent = 'refresh';
  refresh.onclick = () => actions.refreshPrefabs();
  phead.appendChild(refresh);
  root.appendChild(phead);

  const saveRow = document.createElement('div');
  saveRow.className = 'opt-row';
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save selection as prefab';
  saveBtn.disabled = !state.selection;
  saveBtn.title = state.selection
    ? 'Capture the selected tiles and every placement inside them'
    : 'Make a selection first (M) — the prefab captures its tiles and placements';
  saveBtn.onclick = () => actions.saveSelectionAsPrefab();
  saveRow.appendChild(saveBtn);
  root.appendChild(saveRow);

  if (!deps.prefabsOnline) {
    const off = document.createElement('p');
    off.className = 'muted';
    off.textContent = 'Server offline — the shared library needs the game server running.';
    root.appendChild(off);
    return;
  }

  if (deps.prefabs.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'muted empty';
    empty.textContent =
      'No prefabs yet. Select a camp, a shrine, a guard post — anything worth planting twice — and save it here.';
    root.appendChild(empty);
    return;
  }

  // POI footprints file separately — they're the wilderness system's
  // curated pool (data/prefabs/poi_*), edited here, picked by hash out
  // in the frontier.
  const groups: Array<[string, typeof deps.prefabs]> = [
    ['POI footprints', deps.prefabs.filter((p) => p.id.startsWith('poi_'))],
    ['Structures & set pieces', deps.prefabs.filter((p) => !p.id.startsWith('poi_'))],
  ];
  for (const [glabel, gprefabs] of groups) {
    if (gprefabs.length === 0) continue;
    const ghead = document.createElement('div');
    ghead.className = 'panel-head';
    ghead.textContent = glabel;
    root.appendChild(ghead);
    root.appendChild(buildPrefabGrid(gprefabs, state, actions, deps));
  }
}

function buildPrefabGrid(
  prefabs: PrefabListEntry[],
  state: EditorState,
  actions: PanelActions,
  deps: PanelDeps,
): HTMLElement {
  const pgrid = document.createElement('div');
  pgrid.className = 'card-grid';
  for (const p of prefabs) {
    const armed = state.tool === 'prefab' && state.armedPrefab?.id === p.id;
    const card = document.createElement('div');
    card.className = 'card' + (armed ? ' armed' : '');
    const pic = document.createElement('div');
    pic.className = 'card-pic';
    const thumb = deps.prefabPreview(p.id);
    if (thumb) {
      pic.appendChild(thumb);
    } else {
      const loading = document.createElement('span');
      loading.className = 'pic-loading';
      loading.textContent = 'rendering…';
      pic.appendChild(loading);
    }
    card.appendChild(pic);
    const cap = document.createElement('div');
    cap.className = 'card-cap';
    const bits = [
      `${p.width}×${p.height}`,
      p.spawns > 0 ? `${p.spawns} spawn${p.spawns > 1 ? 's' : ''}` : '',
      p.actorSpawns > 0 ? `${p.actorSpawns} actor${p.actorSpawns > 1 ? 's' : ''}` : '',
      p.portals > 0 ? `${p.portals} portal${p.portals > 1 ? 's' : ''}` : '',
    ].filter(Boolean).join(' · ');
    cap.innerHTML = `<b>${p.name}</b><span>${bits}</span>`;
    card.appendChild(cap);
    const row = document.createElement('div');
    row.className = 'card-actions';
    const stamp = document.createElement('button');
    stamp.textContent = armed ? 'Put away' : 'Stamp';
    stamp.title = armed
      ? 'Disarm the stamp (Esc does this too)'
      : 'Arm this prefab, then click the map to plant it';
    stamp.onclick = () => actions.armPrefab(armed ? '' : p.id);
    row.appendChild(stamp);
    const del = document.createElement('button');
    del.className = 'mini danger';
    del.appendChild(iconImg('trash', 14));
    del.title = `Delete '${p.name}' from the shared library`;
    del.onclick = () => actions.removePrefab(p.id);
    row.appendChild(del);
    card.appendChild(row);
    pgrid.appendChild(card);
  }
  return pgrid;
}

// ------------------------------------------------ placements panel

const KIND_META: Record<PlacementRef['kind'], { icon: string; title: string }> = {
  cluster: { icon: 'cluster', title: 'NPC spawn clusters' },
  actor: { icon: 'actor', title: 'Placed actors' },
  portal: { icon: 'portal', title: 'Portals' },
  sign: { icon: 'sign', title: 'Signs' },
  spawn: { icon: 'spawn', title: 'World spawn' },
};

export function buildPlacementsPanel(root: HTMLElement, deps: PanelDeps): void {
  const { state, actions } = deps;
  const zone = state.zone;
  root.innerHTML = '';

  // ------------------------------------------------- the inspector
  if (state.selected) {
    root.appendChild(buildInspector(deps, state.selected));
  } else {
    // THE ZONE CARD — nothing selected, so the zone itself answers.
    root.appendChild(buildZoneCard(deps));
  }

  // Bulk-edit bar: two or more checked clusters share the next set.
  if (state.bulkChecked.size >= 2) {
    root.appendChild(buildBulkBar(deps));
  }

  // ------------------------------------------------- grouped lists
  const groups: Array<{ kind: PlacementRef['kind']; count: number }> = [
    { kind: 'cluster', count: zone.spawns?.length ?? 0 },
    { kind: 'actor', count: zone.actorSpawns?.length ?? 0 },
    { kind: 'portal', count: zone.portals?.length ?? 0 },
    { kind: 'sign', count: zone.signs?.length ?? 0 },
    { kind: 'spawn', count: zone.spawn ? 1 : 0 },
  ];
  for (const g of groups) {
    const head = document.createElement('div');
    head.className = 'panel-head';
    head.appendChild(iconImg(KIND_META[g.kind].icon, 15));
    head.append(` ${KIND_META[g.kind].title}`);
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = String(g.count);
    head.appendChild(count);
    root.appendChild(head);

    if (g.count === 0) {
      const empty = document.createElement('p');
      empty.className = 'muted empty';
      empty.textContent =
        g.kind === 'cluster'
          ? 'None — the cluster tool (N) plants a respawning mob camp.'
          : g.kind === 'actor'
            ? 'None — the actor tool (A) posts a named townsfolk here.'
            : g.kind === 'portal'
              ? 'None — the portal tool (U) links this zone somewhere else.'
              : g.kind === 'sign'
                ? 'None — the sign tool (G) raises a board and writes it.'
                : 'Unset — the spawn tool (P) marks where players arrive.';
      root.appendChild(empty);
      continue;
    }

    const list = document.createElement('div');
    list.className = 'row-list';
    const rows: PlacementRef[] =
      g.kind === 'spawn'
        ? [{ kind: 'spawn', index: 0 }]
        : Array.from({ length: g.count }, (_, i) => ({ kind: g.kind, index: i }));
    for (const ref of rows) {
      list.appendChild(placementRow(deps, ref));
    }
    root.appendChild(list);
  }
}

/** THE ZONE CARD: the document's own inspector when nothing is picked. */
function buildZoneCard(deps: PanelDeps): HTMLElement {
  const { state } = deps;
  const z = state.zone;
  const box = document.createElement('div');
  box.className = 'inspector';

  const head = document.createElement('div');
  head.className = 'insp-head';
  const title = document.createElement('b');
  title.textContent = z.name;
  head.appendChild(title);
  box.appendChild(head);

  const facts = document.createElement('div');
  facts.className = 'wp-facts';
  const pill = (text: string, cls = ''): void => {
    const p = document.createElement('span');
    p.className = `pill ${cls}`;
    p.textContent = text;
    facts.appendChild(p);
  };
  pill(`${z.width}×${z.height}`);
  pill(`@ ${z.origin.x},${z.origin.y}`);
  pill(z.growth === 'wild' ? 'growth: wild' : 'growth: kept', z.growth === 'wild' ? 'green' : 'brass');
  pill(z.spawn ? `spawn ${Math.floor(z.spawn.x)},${Math.floor(z.spawn.y)}` : 'no world spawn');
  box.appendChild(facts);

  // The census: what the zone holds, at a glance.
  const census = document.createElement('p');
  census.className = 'muted';
  census.textContent =
    `${z.spawns?.length ?? 0} clusters · ${z.actorSpawns?.length ?? 0} actors · ` +
    `${z.portals?.length ?? 0} portals · ${z.signs?.length ?? 0} signs`;
  box.appendChild(census);

  // The validator's word, live (cheap enough on click-to-open).
  const v = validateZone(z);
  const verdict = document.createElement('p');
  verdict.className = 'muted';
  verdict.style.color = v.ok ? 'var(--ok)' : 'var(--danger)';
  verdict.textContent = v.ok
    ? v.fenceAdded > 0
      ? `✓ valid — auto-fence adds ${v.fenceAdded} cliff tiles on save`
      : '✓ the zone laws hold'
    : `✕ ${v.error}`;
  box.appendChild(verdict);

  // THE EDGE STRIP: the perimeter the wild grows toward, unrolled.
  const profile = zoneEdgeProfileOf(z);
  if (profile) {
    const EDGE_INK: Record<string, string> = {
      open: '#787e8c',
      water: '#5c9eec',
      sand: '#dec484',
      forest: '#42945c',
      meadow: '#84c470',
      worn: '#be945c',
      stark: '#9696a8',
    };
    const strip = document.createElement('canvas');
    strip.className = 'edge-strip';
    const W = 264;
    const H = 30;
    strip.width = W * 2;
    strip.height = H * 2;
    strip.style.width = `${W}px`;
    strip.style.height = `${H}px`;
    const ctx = strip.getContext('2d')!;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    // Unrolled perimeter: N, then E, S, W as four bands.
    const bands: Array<[string[], number]> = [
      [profile.top as string[], 0],
      [profile.right as string[], 8],
      [(profile.bottom as string[]).slice(), 16],
      [profile.left as string[], 24],
    ];
    const names = ['N', 'E', 'S', 'W'];
    bands.forEach(([classes, y], bi) => {
      const step = (W - 16) / classes.length;
      classes.forEach((c, i) => {
        ctx.fillStyle = EDGE_INK[c] ?? '#787e8c';
        ctx.fillRect(14 + i * step, y, Math.max(1, step - 0.5), 6);
      });
      ctx.fillStyle = 'rgba(233, 236, 243, 0.5)';
      ctx.font = '600 7px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(names[bi]!, 2, y);
    });
    const stripLabel = document.createElement('p');
    stripLabel.className = 'muted';
    stripLabel.textContent = 'The border, as the wild will read it:';
    box.appendChild(stripLabel);
    box.appendChild(strip);
  }

  const discover = document.createElement('p');
  discover.className = 'muted';
  discover.textContent = `Discovery card: "${z.name}" — fires on entering the rect.`;
  box.appendChild(discover);

  const hint = document.createElement('p');
  hint.className = 'muted';
  hint.textContent = 'Select any marker on the map to edit it here; check clusters below to bulk-edit.';
  box.appendChild(hint);
  return box;
}

/** Shared-field editing for every checked cluster, one op per apply. */
function buildBulkBar(deps: PanelDeps): HTMLElement {
  const { state, actions } = deps;
  const checked = [...state.bulkChecked].sort((a, b) => a - b);
  const box = document.createElement('div');
  box.className = 'inspector bulk-bar';
  const head = document.createElement('div');
  head.className = 'insp-head';
  const b = document.createElement('b');
  b.textContent = `${checked.length} clusters checked`;
  head.appendChild(b);
  const clear = document.createElement('button');
  clear.className = 'mini';
  clear.textContent = 'uncheck';
  clear.onclick = () => {
    state.bulkChecked.clear();
    state.changed();
  };
  head.appendChild(clear);
  box.appendChild(head);

  const ring = hourRing(null, (win) =>
    actions.editPlacement({ kind: 'cluster', index: checked[0]! }, `hours × ${checked.length}`, (z) => {
      for (const i of checked) {
        const sp = z.spawns?.[i];
        if (!sp) continue;
        if (win) sp.hours = { ...win };
        else delete sp.hours;
      }
    }),
  );
  box.appendChild(field('hours (all)', ring.root));

  const wing = numInput(0, 0, 32, (v) =>
    actions.editPlacement({ kind: 'cluster', index: checked[0]! }, `wing × ${checked.length}`, (z) => {
      for (const i of checked) {
        const sp = z.spawns?.[i];
        if (!sp) continue;
        if (v > 0) sp.wing = v;
        else delete sp.wing;
      }
    }),
  );
  box.appendChild(field('wing (all)', wing));

  const lvl = numInput(0, 0, 99, (v) =>
    actions.editPlacement({ kind: 'cluster', index: checked[0]! }, `level × ${checked.length}`, (z) => {
      for (const i of checked) {
        const sp = z.spawns?.[i];
        if (!sp) continue;
        if (v > 0) sp.level = v;
        else delete sp.level;
      }
    }),
  );
  box.appendChild(field('level (all)', lvl));
  return box;
}

function placementRow(deps: PanelDeps, ref: PlacementRef): HTMLElement {
  const { state, actions } = deps;
  const zone = state.zone;
  const row = document.createElement('div');
  row.className = 'p-row' + (sameRef(state.selected, ref) ? ' selected' : '');
  // Bulk checkmarks live on cluster rows only.
  if (ref.kind === 'cluster') {
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'p-check';
    check.checked = state.bulkChecked.has(ref.index);
    check.title = 'Check two or more clusters to edit shared fields at once';
    check.onclick = (e) => {
      e.stopPropagation();
      if (check.checked) state.bulkChecked.add(ref.index);
      else state.bulkChecked.delete(ref.index);
      state.changed();
    };
    row.appendChild(check);
  }
  const name = document.createElement('button');
  name.className = 'p-name';
  const pos =
    ref.kind === 'spawn'
      ? zone.spawn
      : ref.kind === 'portal'
        ? zone.portals?.[ref.index]
        : ref.kind === 'cluster'
          ? zone.spawns?.[ref.index]
          : zone.actorSpawns?.[ref.index];
  name.innerHTML =
    `<b>${placementLabel(zone, ref)}</b>` +
    (pos ? `<span>${Math.floor(pos.x)}, ${Math.floor(pos.y)}</span>` : '');
  name.title = 'Select and center the view on it';
  name.onclick = () => {
    actions.selectPlacement(ref);
    actions.focusPlacement(ref);
  };
  row.appendChild(name);
  const del = document.createElement('button');
  del.className = 'mini danger';
  del.appendChild(iconImg('trash', 14));
  del.title = 'Remove this placement';
  del.onclick = () => actions.removePlacement(ref);
  row.appendChild(del);
  return row;
}

// ---------------------------------------------------- the inspector

function field(label: string, input: HTMLElement): HTMLElement {
  const wrap = document.createElement('label');
  wrap.className = 'insp-field';
  const span = document.createElement('span');
  span.textContent = label;
  wrap.appendChild(span);
  wrap.appendChild(input);
  return wrap;
}

function numInput(value: number, min: number, max: number, onCommit: (v: number) => void): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.min = String(min);
  input.max = String(max);
  input.value = String(value);
  input.onchange = () => {
    const v = Math.max(min, Math.min(max, Number(input.value) || min));
    input.value = String(v);
    onCommit(v);
  };
  return input;
}

function selectInput(
  options: Array<{ value: string; label: string }>,
  current: string,
  onCommit: (v: string) => void,
): HTMLSelectElement {
  const sel = document.createElement('select');
  for (const o of options) {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    if (o.value === current) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.onchange = () => onCommit(sel.value);
  return sel;
}

const DIRS: Array<{ label: string; rad: number }> = [
  { label: 'S', rad: Math.PI / 2 },
  { label: 'SW', rad: (Math.PI * 3) / 4 },
  { label: 'W', rad: Math.PI },
  { label: 'NW', rad: (-Math.PI * 3) / 4 },
  { label: 'N', rad: -Math.PI / 2 },
  { label: 'NE', rad: -Math.PI / 4 },
  { label: 'E', rad: 0 },
  { label: 'SE', rad: Math.PI / 4 },
];

function buildInspector(deps: PanelDeps, ref: PlacementRef): HTMLElement {
  const { state, registry, actions } = deps;
  const zone = state.zone;
  const box = document.createElement('div');
  box.className = 'inspector';

  const head = document.createElement('div');
  head.className = 'insp-head';
  head.appendChild(iconImg(KIND_META[ref.kind].icon, 16));
  const title = document.createElement('b');
  title.textContent = placementLabel(zone, ref);
  head.appendChild(title);
  const focusBtn = document.createElement('button');
  focusBtn.className = 'mini';
  focusBtn.appendChild(iconImg('focus', 14));
  focusBtn.title = 'Center the view on this placement';
  focusBtn.onclick = () => actions.focusPlacement(ref);
  head.appendChild(focusBtn);
  const delBtn = document.createElement('button');
  delBtn.className = 'mini danger';
  delBtn.appendChild(iconImg('trash', 14));
  delBtn.title = 'Remove this placement (Delete)';
  delBtn.onclick = () => actions.removePlacement(ref);
  head.appendChild(delBtn);
  box.appendChild(head);

  const hint = document.createElement('p');
  hint.className = 'muted';
  hint.textContent = 'Drag the marker on the map to move it.';
  box.appendChild(hint);

  if (ref.kind === 'cluster') {
    const sp = zone.spawns?.[ref.index];
    if (!sp) return box;
    const npcOpts = registry.npcs
      .slice()
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
      .map((n) => ({ value: n.id, label: `${n.name}  (lv ${n.level})` }));
    box.appendChild(
      field(
        'creature',
        selectInput(npcOpts, sp.npc, (v) =>
          actions.editPlacement(ref, 'cluster creature', (z) => {
            z.spawns![ref.index]!.npc = v;
          }),
        ),
      ),
    );
    box.appendChild(
      field(
        'count',
        numInput(sp.count, 1, 12, (v) =>
          actions.editPlacement(ref, 'cluster count', (z) => {
            z.spawns![ref.index]!.count = v;
          }),
        ),
      ),
    );
    box.appendChild(
      field(
        'radius',
        numInput(sp.radius, 0, 24, (v) =>
          actions.editPlacement(ref, 'cluster radius', (z) => {
            z.spawns![ref.index]!.radius = v;
          }),
        ),
      ),
    );
    const lvl = numInput(sp.level ?? 0, 0, 99, (v) =>
      actions.editPlacement(ref, 'cluster level', (z) => {
        if (v > 0) z.spawns![ref.index]!.level = v;
        else delete z.spawns![ref.index]!.level;
      }),
    );
    lvl.placeholder = 'authored';
    lvl.title = "0 = the creature's authored level; anything else re-scales the def";
    box.appendChild(field('level override', lvl));
    const nameIn = document.createElement('input');
    nameIn.value = sp.name ?? '';
    nameIn.placeholder = 'authored name';
    nameIn.title = 'Display-name override for scaled variants (e.g. Hold-Warden)';
    nameIn.onchange = () =>
      actions.editPlacement(ref, 'cluster name', (z) => {
        const v = nameIn.value.trim();
        if (v) z.spawns![ref.index]!.name = v;
        else delete z.spawns![ref.index]!.name;
      });
    box.appendChild(field('name override', nameIn));
    // THE HOURS DIAL — when this camp stands (absent = around the clock).
    // Outside the window the stage ghosts the bodies at quarter-light.
    const ring = hourRing(sp.hours ? { ...sp.hours } : null, (win) =>
      actions.editPlacement(ref, 'cluster hours', (z) => {
        if (win) z.spawns![ref.index]!.hours = win;
        else delete z.spawns![ref.index]!.hours;
      }),
    );
    box.appendChild(field('hours', ring.root));

    // THE WING — compound-hold chapter id (the WAR-GROUND law).
    const wingIn = numInput(sp.wing ?? 0, 0, 32, (v) =>
      actions.editPlacement(ref, 'cluster wing', (z) => {
        if (v > 0) z.spawns![ref.index]!.wing = v;
        else delete z.spawns![ref.index]!.wing;
      }),
    );
    wingIn.title = 'Compound-hold wing id — 0 = none; wings fall as their own chapters';
    box.appendChild(field('wing', wingIn));

    // THE PATROL — waypoint loop the idle brain paces (count 1).
    const patrolRow = document.createElement('div');
    patrolRow.className = 'dir-dial';
    const patrolCount = document.createElement('span');
    patrolCount.className = 'muted';
    patrolCount.textContent = sp.patrol ? `${sp.patrol.length} waypoints` : 'none';
    patrolRow.appendChild(patrolCount);
    const editBtn = document.createElement('button');
    editBtn.className = 'opt-btn';
    editBtn.textContent = sp.patrol ? 'redraw' : 'draw';
    editBtn.title = 'Click waypoints on the map · Enter keeps the round · Esc abandons';
    editBtn.onclick = () => actions.beginPatrolEdit(ref.index);
    patrolRow.appendChild(editBtn);
    if (sp.patrol) {
      const clrBtn = document.createElement('button');
      clrBtn.className = 'opt-btn';
      clrBtn.textContent = 'clear';
      clrBtn.onclick = () => actions.clearPatrol(ref.index);
      patrolRow.appendChild(clrBtn);
    }
    box.appendChild(field('patrol', patrolRow));
    if (sp.count > 1 && sp.patrol) {
      const warn = document.createElement('p');
      warn.className = 'muted';
      warn.textContent = 'Patrols walk with count 1 — a larger camp ignores the round.';
      box.appendChild(warn);
    }

    const tip = document.createElement('p');
    tip.className = 'muted';
    tip.textContent = 'Drag the dashed ring edge on the map to resize the wander radius.';
    box.appendChild(tip);
  }

  if (ref.kind === 'actor') {
    const a = zone.actorSpawns?.[ref.index];
    if (!a) return box;
    // The face above the fields — the true bust, the game's own rig.
    const def = deps.actorDefs.get(a.actor);
    if (def) {
      const stageRow = document.createElement('div');
      stageRow.className = 'insp-stage';
      const bust = actorBustThumb(def, 72);
      if (bust) stageRow.appendChild(bust);
      const who = document.createElement('div');
      who.className = 'insp-stage-facts';
      const nm = document.createElement('b');
      nm.textContent = def.name;
      who.appendChild(nm);
      if (def.title) {
        const t = document.createElement('span');
        t.className = 'muted';
        t.textContent = def.title;
        who.appendChild(t);
      }
      const cms = document.createElement('a');
      cms.className = 'studio-link mini-link';
      cms.href = `/cms.html#actors/${a.actor}`;
      cms.textContent = 'Open in Content Studio ↗';
      cms.title = 'Identity, wardrobe, dialogue, and combat live in the CMS';
      who.appendChild(cms);
      stageRow.appendChild(who);
      box.appendChild(stageRow);
    }
    const actorOpts = registry.actors
      .slice()
      .sort((x, y) => x.name.localeCompare(y.name))
      .map((x) => ({ value: x.id, label: x.title ? `${x.name} — ${x.title}` : x.name }));
    box.appendChild(
      field(
        'actor',
        selectInput(actorOpts, a.actor, (v) =>
          actions.editPlacement(ref, 'actor identity', (z) => {
            z.actorSpawns![ref.index]!.actor = v;
          }),
        ),
      ),
    );
    const routineOpts = [{ value: '', label: 'none — holds the post' }].concat(
      registry.routines.sort().map((r) => ({ value: r, label: r })),
    );
    box.appendChild(
      field(
        'routine',
        selectInput(routineOpts, a.routine ?? '', (v) =>
          actions.editPlacement(ref, 'actor routine', (z) => {
            if (v) z.actorSpawns![ref.index]!.routine = v;
            else delete z.actorSpawns![ref.index]!.routine;
          }),
        ),
      ),
    );
    const dirRow = document.createElement('div');
    dirRow.className = 'dir-dial';
    for (const d of DIRS) {
      const b = document.createElement('button');
      b.className =
        'opt-btn' +
        (a.dir !== undefined && Math.abs(a.dir - d.rad) < 0.01 ? ' active' : '');
      b.textContent = d.label;
      b.title = `Face ${d.label}`;
      b.onclick = () =>
        actions.editPlacement(ref, 'actor facing', (z) => {
          z.actorSpawns![ref.index]!.dir = d.rad;
        });
      dirRow.appendChild(b);
    }
    const clr = document.createElement('button');
    clr.className = 'opt-btn' + (a.dir === undefined ? ' active' : '');
    clr.textContent = 'auto';
    clr.title = 'No authored facing (rests facing south)';
    clr.onclick = () =>
      actions.editPlacement(ref, 'actor facing', (z) => {
        delete z.actorSpawns![ref.index]!.dir;
      });
    dirRow.appendChild(clr);
    box.appendChild(field('facing', dirRow));
    const note = document.createElement('p');
    note.className = 'muted';
    note.textContent =
      'Routine steps are offsets from this post — moving the post moves the whole day with it.';
    box.appendChild(note);
  }

  if (ref.kind === 'sign') {
    const g = zone.signs?.[ref.index];
    if (!g) return box;
    // The board's own width is the only length law — the shared caps
    // are what a player will actually be able to read, so the studio
    // enforces exactly them rather than inventing an editor limit.
    const line = (
      label: string,
      value: string,
      max: number,
      commit: (z: ZoneDef, v: string) => void,
    ): void => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = value;
      input.maxLength = max;
      input.spellcheck = false;
      input.onchange = () =>
        actions.editPlacement(ref, 'sign copy', (z) => commit(z, input.value));
      box.appendChild(field(label, input));
    };
    line('heading', g.title, SIGN_MAX_TITLE, (z, v) => {
      z.signs![ref.index]!.title = sanitizeSignLine(v, SIGN_MAX_TITLE);
    });
    for (let i = 0; i < SIGN_MAX_LINES; i++) {
      line(`line ${i + 1}`, g.lines?.[i] ?? '', SIGN_MAX_LINE, (z, v) => {
        const sign = z.signs![ref.index]!;
        const lines = (sign.lines ?? []).slice();
        while (lines.length <= i) lines.push('');
        lines[i] = sanitizeSignLine(v, SIGN_MAX_LINE);
        while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
        // Absent stays absent — the JSON round-trip law.
        if (lines.length > 0) sign.lines = lines;
        else delete sign.lines;
      });
    }
    const kindRow = document.createElement('div');
    kindRow.className = 'dir-dial';
    for (const opt of [
      { tile: Tile.HangingSign, label: 'shingle', tip: 'Hangs off a building and names it' },
      { tile: Tile.Signpost, label: 'post', tip: 'Stands free at a fork or a gate' },
    ]) {
      const b = document.createElement('button');
      const lx = g.x - zone.origin.x;
      const ly = g.y - zone.origin.y;
      const here = zone.ground[ly * zone.width + lx];
      b.className = 'opt-btn' + (here === opt.tile ? ' active' : '');
      b.textContent = opt.label;
      b.title = opt.tip;
      b.onclick = () =>
        actions.editPlacement(ref, 'sign furniture', (z) => {
          const sign = z.signs![ref.index]!;
          const i = (sign.y - z.origin.y) * z.width + (sign.x - z.origin.x);
          z.ground[i] = opt.tile;
        });
      kindRow.appendChild(b);
    }
    box.appendChild(field('board', kindRow));
    // THE BOARD READS BACK: the copy as a plaque, live (the true
    // board itself stands in the viewport).
    const previewBoard = document.createElement('div');
    previewBoard.className = 'sign-preview';
    const pt = document.createElement('b');
    pt.textContent = g.title || '(blank heading)';
    previewBoard.appendChild(pt);
    for (const line of g.lines ?? []) {
      const pl = document.createElement('span');
      pl.textContent = line;
      previewBoard.appendChild(pl);
    }
    box.appendChild(previewBoard);
    const note = document.createElement('p');
    note.className = 'muted';
    note.textContent =
      'The words live with the board: move the marker and the sign tile follows. Blank boards fail the zone build.';
    box.appendChild(note);
  }

  if (ref.kind === 'portal') {
    const p = zone.portals?.[ref.index];
    if (!p) return box;
    const kindSel = selectInput(
      [
        { value: 'dest', label: 'travel — to world coordinates' },
        { value: 'delve', label: 'delve — per-player procedural dungeon' },
      ],
      p.delve ? 'delve' : 'dest',
      (v) =>
        actions.editPlacement(ref, 'portal kind', (z) => {
          const portal = z.portals![ref.index]!;
          if (v === 'delve') {
            portal.delve = true;
            delete portal.dest;
          } else {
            delete portal.delve;
            portal.dest = portal.dest ?? { x: z.origin.x, y: z.origin.y };
          }
        }),
    );
    box.appendChild(field('kind', kindSel));
    if (!p.delve) {
      box.appendChild(
        field(
          'dest x',
          numInput(p.dest?.x ?? 0, -100000, 100000, (v) =>
            actions.editPlacement(ref, 'portal dest', (z) => {
              const portal = z.portals![ref.index]!;
              portal.dest = { x: v, y: portal.dest?.y ?? 0 };
            }),
          ),
        ),
      );
      box.appendChild(
        field(
          'dest y',
          numInput(p.dest?.y ?? 0, -100000, 100000, (v) =>
            actions.editPlacement(ref, 'portal dest', (z) => {
              const portal = z.portals![ref.index]!;
              portal.dest = { x: portal.dest?.x ?? 0, y: v };
            }),
          ),
        ),
      );
    }
    const tileNote = document.createElement('p');
    tileNote.className = 'muted';
    tileNote.textContent =
      'The portal stands on its tile — moving the marker carries the entrance tile with it.';
    box.appendChild(tileNote);
  }

  if (ref.kind === 'spawn' && zone.spawn) {
    const note = document.createElement('p');
    note.className = 'muted';
    note.textContent = `Players arrive at ${zone.spawn.x}, ${zone.spawn.y}. Only the first zone that declares a spawn names the world's arrival point.`;
    box.appendChild(note);
  }

  return box;
}
