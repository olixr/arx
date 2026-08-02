/**
 * THE DIALOGS — open browser, new zone, zone properties, save-as-
 * prefab, and help, rebuilt on the v2 kit. Values never ride innerHTML
 * (names go through textContent/value assignment); destructive actions
 * go through confirmDialog, never window.confirm.
 */

import { Tile } from '@arx/shared';
import {
  prefabToJson,
  validatePrefab,
  type PrefabDef,
  type ZoneDef,
} from '@arx/content';
import { deleteZone, listMaps, savePrefab, type MapListEntry } from '../editor/api.js';
import { iconImg } from '../editor/editorIcons.js';
import { newZone } from '../editor/state.js';
import type { WorldMode } from '../editor/world/worldMode.js';
import { btn, confirmDialog, el, kbd, toast } from '../studio2/kit.js';
import { TOOL_GROUPS, WORLD_TOOLS, type StudioMode } from './commands.js';
import type { EditorOps } from './ops.js';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

export function showModal(builder: (body: HTMLElement, close: () => void) => void): void {
  const modal = $('modal') as HTMLDialogElement;
  const body = $('modal-body');
  body.innerHTML = '';
  body.className = '';
  builder(body, () => modal.close());
  modal.showModal();
}

/** Recently opened zone ids, newest first (localStorage-backed). */
export function recentZones(): string[] {
  try {
    return JSON.parse(localStorage.getItem('dc-editor-recent') ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function noteRecentZone(id: string): void {
  const list = [id, ...recentZones().filter((x) => x !== id)].slice(0, 8);
  localStorage.setItem('dc-editor-recent', JSON.stringify(list));
}

export interface DialogDeps {
  ops: EditorOps;
  world: WorldMode;
  getMode: () => StudioMode;
  setMode: (m: StudioMode) => void;
  adoptZone: (zone: ZoneDef, serverBacked: boolean) => void;
  openZoneById: (id: string) => Promise<void>;
  refreshPrefabs: () => Promise<void>;
  setServerStatus: (text: string, live?: boolean) => void;
  syncZoneChip: () => void;
}

// ----------------------------------------------------- open browser

/**
 * THE OPEN BROWSER — everything the world holds, one dialog: towns,
 * the dark band, every composed frontier site, files, orphans.
 */
export async function openBrowser(deps: DialogDeps): Promise<void> {
  const { world } = deps;
  let list;
  try {
    list = await listMaps();
    world.ws.setZones(list.zones);
    deps.setServerStatus('connected', true);
  } catch (err) {
    toast(`server list failed: ${(err as Error).message}`, 4000);
    deps.setServerStatus('offline — Import a local file instead');
    return;
  }
  const cells = world.ws.cells;
  const zones = list.zones;
  const orphans = list.orphans;
  showModal((body, close) => {
    body.className = 'open-browser';
    body.appendChild(el('h2', undefined, 'Open'));
    const search = el('input');
    search.type = 'search';
    search.id = 'ob-search';
    search.placeholder = 'Search zones and frontier sites… (name, id, archetype)';
    body.appendChild(search);
    const listHost = el('div', 'ob-list');
    body.appendChild(listHost);

    const defNameOf = (id: string): string | null => {
      const m = /^poi:(-?\d+),(-?\d+)$/.exec(id);
      if (!m) return null;
      const cell = cells.find((c) => c.cellX === Number(m[1]) && c.cellY === Number(m[2]));
      return cell?.defName ?? null;
    };

    const rebuild = (): void => {
      const q = search.value.trim().toLowerCase();
      listHost.innerHTML = '';
      const match = (z: MapListEntry): boolean =>
        q === '' ||
        z.id.toLowerCase().includes(q) ||
        z.name.toLowerCase().includes(q) ||
        (defNameOf(z.id)?.toLowerCase().includes(q) ?? false);

      const recent = recentZones()
        .map((id) => zones.find((z) => z.id === id))
        .filter((z): z is MapListEntry => z !== undefined && match(z));
      const towns = zones.filter((z) => !z.poi && z.origin.y < 512 && match(z));
      const dark = zones.filter((z) => !z.poi && z.origin.y >= 512 && match(z));
      const standing = new Set(zones.filter((z) => z.poi).map((z) => z.id));
      const dormant: MapListEntry[] = cells
        .filter((c) => c.site && !standing.has(`poi:${c.cellX},${c.cellY}`))
        .map((c) => ({
          id: `poi:${c.cellX},${c.cellY}`,
          name: c.defName ?? c.site!.defId,
          width: 0,
          height: 0,
          origin: { x: c.site!.anchorX, y: c.site!.anchorY },
          spawn: null,
          builtin: false,
          hasFile: false,
          poi: true,
          actorSpawns: 0,
          npcSpawns: 0,
          portals: 0,
          dormant: true,
        }));
      const sites = [...zones.filter((z) => z.poi), ...dormant].filter(match);

      const section = (title: string, entries: MapListEntry[]): void => {
        if (entries.length === 0) return;
        listHost.appendChild(el('div', 'ob-head', `${title} (${entries.length})`));
        for (const z of entries) listHost.appendChild(openRow(deps, z, close, rebuild));
      };
      if (q === '' && recent.length > 0) section('Recent', recent);
      section('Towns & authored zones', towns);
      section('The dark band', dark);
      section('Frontier sites — composed by the scaffold', sites);
      if (orphans.length > 0 && q === '') {
        listHost.appendChild(
          el('p', 'muted', `On disk but not loaded (bad parse?): ${orphans.join(', ')}`),
        );
      }
      if (listHost.childElementCount === 0) {
        listHost.appendChild(el('p', 'muted', 'Nothing matches — the world holds no such place.'));
      }
    };
    search.oninput = rebuild;
    rebuild();
    search.focus();
  });
}

function openRow(
  deps: DialogDeps,
  z: MapListEntry,
  close: () => void,
  rebuildList: () => void,
): HTMLElement {
  const { world } = deps;
  const row = el('div', 'ob-row');
  const pic = el('div', 'ob-pic');
  if (z.dormant) {
    // A thumbnail would force the site to compose server-side —
    // browsing must never change the world. The lamp stands in.
    pic.appendChild(iconImg('wsite', 30));
  } else {
    void world.view.thumbUrl(z.id).then((url) => {
      if (url && row.isConnected) {
        const img = el('img');
        img.src = url;
        pic.appendChild(img);
      }
    });
  }
  row.appendChild(pic);

  const facts = el('div', 'ob-facts');
  const title = el('div', 'ob-title');
  title.appendChild(el('b', undefined, z.name));
  title.appendChild(el('span', 'muted', z.id));
  facts.appendChild(title);
  facts.appendChild(
    el(
      'div',
      'ob-sub muted',
      z.dormant
        ? `anchor @ ${z.origin.x},${z.origin.y} · dormant — composes when opened or approached`
        : `${z.width}×${z.height} @ ${z.origin.x},${z.origin.y} · ` +
            `${z.npcSpawns} spawns · ${z.actorSpawns} actors · ${z.portals} portals`,
    ),
  );
  const badges = el('div', 'ob-badges');
  const badge = (text: string, cls = ''): void => {
    badges.appendChild(el('span', `pill ${cls}`, text));
  };
  if (z.builtin) badge('built-in');
  if (z.hasFile) badge('file', 'brass');
  if (z.poi) badge('frontier site', 'blue');
  if (z.dormant) badge('dormant');
  if (!z.dormant && z.origin.y >= 512) badge('dark band');
  facts.appendChild(badges);
  row.appendChild(facts);

  const actions = el('div', 'ob-actions');
  const open = btn(z.poi ? 'Look' : 'Open', {
    variant: 'primary',
    title: z.poi
      ? 'Open read-only — the scaffold owns composed ground (Adopt to edit)'
      : 'Open in the zone editor',
    onClick: () => {
      close();
      noteRecentZone(z.id);
      void deps.openZoneById(z.id);
    },
  });
  actions.appendChild(open);
  if (z.origin.y < 512) {
    actions.appendChild(
      btn('Map', {
        title: 'Show on the world map',
        onClick: () => {
          close();
          deps.setMode('world');
          world.select({ kind: 'zone', id: z.id });
          world.centerOn({ kind: 'zone', id: z.id });
        },
      }),
    );
  }
  if (z.poi) {
    const m = /^poi:(-?\d+),(-?\d+)$/.exec(z.id);
    if (m) {
      actions.appendChild(
        btn('Adopt…', {
          title: 'Freeze this composed site into an authored zone you own',
          onClick: () => {
            close();
            deps.setMode('world');
            world.adoptCell(Number(m[1]), Number(m[2]));
          },
        }),
      );
    }
  }
  if (z.hasFile) {
    actions.appendChild(
      btn(z.builtin ? 'Revert' : 'Delete', {
        variant: 'danger',
        title: z.builtin
          ? 'Delete the override file; the shipped zone returns live'
          : 'Delete the map file and unload the zone',
        onClick: () => {
          void (async () => {
            const ok = await confirmDialog(
              `This removes data/maps/${z.id}.json${z.builtin ? '; the shipped zone returns live.' : ' and unloads the zone.'}`,
              { title: `${z.builtin ? 'Revert' : 'Delete'} '${z.id}'?`, action: z.builtin ? 'Revert' : 'Delete', danger: true },
            );
            if (!ok) return;
            try {
              await deleteZone(z.id);
              toast(`${z.builtin ? 'reverted' : 'deleted'} '${z.id}'`);
              world.view.invalidateZone(z.id);
              rebuildList();
            } catch (err) {
              toast(`delete failed: ${(err as Error).message}`, 4000);
            }
          })();
        },
      }),
    );
  }
  row.appendChild(actions);
  return row;
}

// --------------------------------------------------------- new zone

export function newZoneDialog(deps: DialogDeps): void {
  showModal((body, close) => {
    body.appendChild(el('h2', undefined, 'New zone'));
    const grid = el('div', 'form-grid');
    const field = (label: string, input: HTMLInputElement): void => {
      const lab = el('label', undefined, label + ' ');
      lab.appendChild(input);
      grid.appendChild(lab);
    };
    const mk = (value: string, type = 'text'): HTMLInputElement => {
      const i = el('input');
      i.type = type;
      i.value = value;
      return i;
    };
    const idIn = mk('myzone');
    idIn.pattern = '[a-z][a-z0-9_-]*';
    const nameIn = mk('My Zone');
    const wIn = mk('96', 'number');
    const hIn = mk('96', 'number');
    const oxIn = mk('0', 'number');
    oxIn.step = '32';
    const oyIn = mk('0', 'number');
    oyIn.step = '32';
    field('id', idIn);
    field('name', nameIn);
    field('width', wIn);
    field('height', hIn);
    field('origin x', oxIn);
    field('origin y', oyIn);
    body.appendChild(grid);
    body.appendChild(
      el(
        'p',
        'muted',
        'Tip: chunk-align the origin (multiples of 32) and keep clear of Dawnmead (-96,16–0,80) unless you mean to override it.',
      ),
    );
    const actions = el('div', 'dialog-actions');
    actions.appendChild(btn('Cancel', { onClick: close }));
    actions.appendChild(
      btn('Create', {
        variant: 'primary',
        onClick: () => {
          const id = idIn.value.trim();
          if (!/^[a-z][a-z0-9_-]*$/.test(id)) {
            toast('id must be lowercase [a-z0-9_-]', 3200, 'error');
            return;
          }
          const z = newZone(
            id,
            nameIn.value.trim() || id,
            Math.max(8, Math.min(512, Number(wIn.value) || 96)),
            Math.max(8, Math.min(512, Number(hIn.value) || 96)),
          );
          z.origin = { x: Number(oxIn.value) || 0, y: Number(oyIn.value) || 0 };
          deps.adoptZone(z, false);
          close();
          toast(`new ${z.width}×${z.height} zone '${z.id}'`);
        },
      }),
    );
    body.appendChild(actions);
  });
}

// --------------------------------------------------- zone properties

export function zonePropertiesDialog(deps: DialogDeps): void {
  const { ops } = deps;
  const state = ops.state;
  const z = state.zone;
  showModal((body, close) => {
    body.appendChild(el('h2', undefined, 'Zone properties'));
    const rows = el('div', 'form-rows');
    const row = (label: string, control: HTMLElement, help: string): void => {
      const lab = el('label', 'form-row');
      lab.appendChild(el('span', undefined, label));
      lab.appendChild(control);
      lab.appendChild(el('em', undefined, help));
      rows.appendChild(lab);
    };
    const idIn = el('input');
    idIn.value = z.id;
    idIn.pattern = '[a-z][a-z0-9_-]*';
    row('id', idIn, 'The save file name and reference key — lowercase, stable once shipped.');
    const nameIn = el('input');
    nameIn.value = z.name;
    row('name', nameIn, 'The display name players and teammates see.');
    const pairO = el('span', 'pair');
    const oxIn = el('input');
    oxIn.type = 'number';
    oxIn.step = '32';
    oxIn.value = String(z.origin.x);
    const oyIn = el('input');
    oyIn.type = 'number';
    oyIn.step = '32';
    oyIn.value = String(z.origin.y);
    pairO.append(oxIn, oyIn);
    row(
      'origin',
      pairO,
      'World tile of the top-left corner. Moving it carries the spawn, portals, and every placement along with the content.',
    );
    const pairS = el('span', 'pair');
    const wIn = el('input');
    wIn.type = 'number';
    wIn.min = '8';
    wIn.max = '512';
    wIn.value = String(z.width);
    const hIn = el('input');
    hIn.type = 'number';
    hIn.min = '8';
    hIn.max = '512';
    hIn.value = String(z.height);
    pairS.append(wIn, hIn);
    row('size', pairS, '8–512 tiles per side. Shrinking crops from the south-east; growth fills with meadow.');
    const growthSel = el('select');
    const optKept = el('option', undefined, 'kept — tended ground, fast in-place respawn');
    optKept.value = 'kept';
    const optWild = el('option', undefined, 'wild — harvests ride the growth ledger');
    optWild.value = 'wild';
    growthSel.append(optKept, optWild);
    growthSel.value = z.growth === 'wild' ? 'wild' : 'kept';
    row(
      'growth',
      growthSel,
      "THE KEPT AND THE WILD (second-growth): which renewal law this zone's owned tiles obey. Towns stay kept; authored wilderness may go wild.",
    );
    body.appendChild(rows);

    const actions = el('div', 'dialog-actions');
    actions.appendChild(btn('Cancel', { onClick: close }));
    actions.appendChild(
      btn('Apply', {
        variant: 'primary',
        onClick: () => {
          const id = idIn.value.trim();
          const name = nameIn.value.trim();
          if (!/^[a-z][a-z0-9_-]*$/.test(id)) {
            toast('id must be lowercase [a-z0-9_-]', 3200, 'error');
            return;
          }
          const nx = Number(oxIn.value) || 0;
          const ny = Number(oyIn.value) || 0;
          const w = Math.max(8, Math.min(512, Number(wIn.value) || z.width));
          const h = Math.max(8, Math.min(512, Number(hIn.value) || z.height));
          const changes: string[] = [];
          if (id !== z.id || name !== (z.name || z.id)) {
            ops.zoneOp(
              'rename zone',
              (zone) => {
                zone.id = id;
                zone.name = name || id;
              },
              { tiles: false },
            );
            changes.push('identity');
          }
          const growthVal = growthSel.value;
          if ((z.growth ?? 'kept') !== growthVal) {
            ops.zoneOp(
              'set growth domain',
              (zone) => {
                zone.growth = growthVal === 'wild' ? 'wild' : undefined;
              },
              { tiles: false },
            );
            changes.push('growth');
          }
          const dx = nx - state.zone.origin.x;
          const dy = ny - state.zone.origin.y;
          if (dx !== 0 || dy !== 0) {
            ops.zoneOp('move origin', (zone) => {
              zone.origin = { x: nx, y: ny };
              if (zone.spawn) {
                zone.spawn.x += dx;
                zone.spawn.y += dy;
              }
              for (const p of zone.portals ?? []) {
                p.x += dx;
                p.y += dy;
              }
              for (const s of zone.spawns ?? []) {
                s.x += dx;
                s.y += dy;
              }
              for (const a of zone.actorSpawns ?? []) {
                a.x += dx;
                a.y += dy;
              }
              for (const g of zone.signs ?? []) {
                g.x += dx;
                g.y += dy;
              }
            });
            changes.push(`origin → ${nx},${ny}`);
          }
          if (w !== state.zone.width || h !== state.zone.height) {
            ops.zoneOp(`resize to ${w}×${h}`, (zone) => {
              const ground = new Uint16Array(w * h).fill(Tile.Grass);
              const detail = new Uint16Array(w * h);
              const elev = new Int8Array(w * h);
              for (let y = 0; y < Math.min(h, zone.height); y++) {
                for (let x = 0; x < Math.min(w, zone.width); x++) {
                  ground[y * w + x] = zone.ground[y * zone.width + x]!;
                  detail[y * w + x] = zone.detail[y * zone.width + x]!;
                  elev[y * w + x] = zone.elev![y * zone.width + x]!;
                }
              }
              zone.width = w;
              zone.height = h;
              zone.ground = ground;
              zone.detail = detail;
              zone.elev = elev;
            });
            state.selection = null;
            changes.push(`resized to ${w}×${h}`);
          }
          deps.syncZoneChip();
          close();
          if (changes.length > 0) toast(changes.join(' · '), 3200, 'success');
        },
      }),
    );
    body.appendChild(actions);
  });
}

// ---------------------------------------------------- prefab capture

export function savePrefabDialog(deps: DialogDeps): void {
  const { ops } = deps;
  const r = ops.selRect();
  if (!r) {
    toast('select the region first (M), then save it as a prefab');
    return;
  }
  showModal((body, close) => {
    const w = r.x1 - r.x0 + 1;
    const h = r.y1 - r.y0 + 1;
    body.appendChild(el('h2', undefined, 'Save selection as prefab'));
    body.appendChild(
      el(
        'p',
        'muted',
        `Captures the ${w}×${h} selection — all three tile layers plus every portal, spawn cluster, and actor standing inside it — into the shared library.`,
      ),
    );
    const grid = el('div', 'form-grid');
    const idIn = el('input');
    idIn.placeholder = 'guard_post';
    idIn.pattern = '[a-z][a-z0-9_-]*';
    const nameIn = el('input');
    nameIn.placeholder = 'Guard Post';
    const labId = el('label', undefined, 'id ');
    labId.appendChild(idIn);
    const labName = el('label', undefined, 'name ');
    labName.appendChild(nameIn);
    grid.append(labId, labName);
    body.appendChild(grid);
    const actions = el('div', 'dialog-actions');
    actions.appendChild(btn('Cancel', { onClick: close }));
    actions.appendChild(
      btn('Save to library', {
        variant: 'primary',
        onClick: () => {
          const id = idIn.value.trim();
          const name = nameIn.value.trim() || id;
          if (!/^[a-z][a-z0-9_-]*$/.test(id)) {
            toast('prefab id must be lowercase [a-z0-9_-]');
            return;
          }
          const z = ops.state.zone;
          const def: PrefabDef = {
            id,
            name,
            width: w,
            height: h,
            ground: new Uint16Array(w * h),
            detail: new Uint16Array(w * h),
            elev: new Int8Array(w * h),
            portals: [],
            spawns: [],
            actorSpawns: [],
          };
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const src = ops.idx(r.x0 + x, r.y0 + y);
              def.ground[y * w + x] = z.ground[src]!;
              def.detail[y * w + x] = z.detail[src]!;
              def.elev[y * w + x] = z.elev![src]!;
            }
          }
          const contains = (wx: number, wy: number): boolean => {
            const lx = wx - z.origin.x;
            const ly = wy - z.origin.y;
            return lx >= r.x0 && lx <= r.x1 && ly >= r.y0 && ly <= r.y1;
          };
          for (const p of z.portals ?? []) {
            if (contains(p.x, p.y)) {
              def.portals.push({
                dx: p.x - z.origin.x - r.x0,
                dy: p.y - z.origin.y - r.y0,
                ...(p.delve ? { delve: true } : {}),
                ...(p.dest ? { dest: { ...p.dest } } : {}),
              });
            }
          }
          for (const s of z.spawns ?? []) {
            if (contains(s.x, s.y)) {
              def.spawns.push({
                dx: s.x - z.origin.x - r.x0,
                dy: s.y - z.origin.y - r.y0,
                npc: s.npc,
                radius: s.radius,
                count: s.count,
                ...(s.level !== undefined ? { level: s.level } : {}),
                ...(s.name !== undefined ? { name: s.name } : {}),
              });
            }
          }
          for (const a of z.actorSpawns ?? []) {
            if (contains(a.x, a.y)) {
              def.actorSpawns.push({
                dx: a.x - z.origin.x - r.x0,
                dy: a.y - z.origin.y - r.y0,
                actor: a.actor,
                ...(a.dir !== undefined ? { dir: a.dir } : {}),
                ...(a.routine !== undefined ? { routine: a.routine } : {}),
              });
            }
          }
          const errors = validatePrefab(def);
          if (errors.length > 0) {
            toast(`prefab invalid: ${errors[0]}`, 4500);
            return;
          }
          void (async () => {
            try {
              await savePrefab(prefabToJson(def));
              await deps.refreshPrefabs();
              const n = def.portals.length + def.spawns.length + def.actorSpawns.length;
              toast(
                `saved '${name}' to the library${n > 0 ? ` (${n} placement${n > 1 ? 's' : ''} captured)` : ''}`,
              );
              close();
            } catch (err) {
              toast(`save failed: ${(err as Error).message}`, 4500);
            }
          })();
        },
      }),
    );
    body.appendChild(actions);
  });
}

// ------------------------------------------------------------- help

/** The help sheet is READ from the registry — it can never drift. */
export function helpDialog(): void {
  showModal((body) => {
    body.appendChild(el('h2', undefined, 'Map Studio'));
    const p = el('p');
    p.appendChild(el('b', undefined, 'The World view'));
    p.append(
      ' is the whole plan on one canvas — every zone, road, landmark, hearth, and frontier site, rendered through the real worldgen. Save there PUTs the geography document. ',
    );
    p.appendChild(el('b', undefined, 'The Zone view'));
    p.append(' edits one zone tile-by-tile; Save writes ');
    p.appendChild(el('code', undefined, 'data/maps/<id>.json'));
    p.append(' and hot-swaps it into the running world.');
    body.appendChild(p);

    const sheet = el('div', 'help-sheet');
    const section = (title: string, rows: Array<[string, string]>): void => {
      sheet.appendChild(el('div', 'panel-head', title));
      for (const [keys, label] of rows) {
        const rowEl = el('div', 'help-row');
        rowEl.appendChild(kbd(keys));
        rowEl.appendChild(el('span', undefined, label));
        sheet.appendChild(rowEl);
      }
    };
    section(
      'Zone tools',
      TOOL_GROUPS.flatMap((g) => g.tools).map((t) => [t.key, `${t.name} — ${t.hint}`]),
    );
    section('World tools', WORLD_TOOLS.map((t) => [t.key, `${t.name} — ${t.hint}`]));
    section('Everywhere', [
      ['⌘K', 'the command lens — search and run every command'],
      ['Q', 'ghost walk — a real body, WASD through true collision'],
      ['↑↓←→', 'nudge the selection one tile (content, rect, and mask together)'],
      ['⌘Z', 'undo · ⇧⌘Z redo'],
      ['⌘S', 'save to the running server'],
      ['⌘O', 'open anything the world holds'],
      ['⌘C', 'copy selection · ⌘X cut · ⌘V arm paste'],
      ['1', 'ground layer · 2 detail · 3 elevation'],
      ['[', 'smaller brush · ] larger'],
      ['0', 'fit in view · wheel zooms · Space or middle-drag pans'],
      ['/', 'focus the tile palette search'],
      ['W', 'world view · Z zone view · double-click a zone to step in'],
      ['esc', 'cancels the most-transient thing first — ghost, patrol, paste, stamp, road, polygon, selection'],
      ['X', 'mirror an armed structure stamp east-west'],
      ['↵', 'closes the open thing — a patrol round, a road, a polygon'],
    ]);
    body.appendChild(
      el(
        'p',
        'muted',
        'Lenses (Tool panel · also in ⌘K): shelf, rooms, reach, edges, growth, factions, signs — each states what it shows and what it found. The elevation lens shows the live fence line while you sculpt; the stair brush arms only on legal ground.',
      ),
    );
    body.appendChild(sheet);
    body.appendChild(
      el(
        'p',
        'muted',
        'Elevation: paint levels, add stone-stair tiles on straight rims; Save runs the cliff auto-fence and stair/reachability laws.',
      ),
    );
  });
}
