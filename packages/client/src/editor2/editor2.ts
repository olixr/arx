/**
 * ARX MAP STUDIO v2 — THE BENCH (composition root). Phase 1 of the
 * WORLD ON THE WORKBENCH epic: the premium chrome — tokens, kit, tool
 * rail, resizable dock, floating instruments, command lens — over the
 * v1 zone viewport and world mode, which carry over intact until the
 * True Viewport lands in Phase 2.
 *
 * This file only composes. The verbs live in ops.ts, the gestures in
 * pointer.ts/keys.ts, the chrome in chrome.ts/shell.ts, the registry
 * in commands.ts, the dialogs in dialogs.ts.
 */

import {
  NPCS,
  NPC_ACTORS,
  ROUTINES,
  buildDawnmead,
  prefabFromJson,
  zoneFromJson,
  zoneToJson,
  type ZoneDef,
  type ZoneJson,
} from '@arx/content';
import {
  fetchPrefab,
  fetchRegistry,
  fetchZone,
  listMaps,
  listPrefabs,
  saveZone,
  deletePrefab,
  type PrefabListEntry,
  type RegistrySnapshot,
} from '../editor/api.js';
import { iconImg } from '../editor/editorIcons.js';
import { History } from '../editor/history.js';
import { PaletteUI } from '../editor/palette.js';
import { buildPlacementsPanel, buildStructuresPanel, type PanelDeps } from '../editor/panels.js';
import { drawPreviewPins, prefabLayers, renderLayersPreview } from '../editor/preview.js';
import { EditorView } from '../editor/render.js';
import { EditorState, newZone as newZoneDef, type SidebarTab } from '../editor/state.js';
import { validateZone } from '../editor/validate.js';
import { WorldMode } from '../editor/world/worldMode.js';
import { confirmDialog, el, kbd, seg, toast } from '../studio2/kit.js';
import { Chrome } from './chrome.js';
import { CommandPalette } from './cmdk.js';
import { buildCommands, type Command, type StudioMode } from './commands.js';
import {
  helpDialog,
  newZoneDialog,
  noteRecentZone,
  openBrowser,
  savePrefabDialog,
  showModal,
  zonePropertiesDialog,
  type DialogDeps,
} from './dialogs.js';
import { ClockInstrument } from './clock.js';
import { installKeys } from './keys.js';
import { Minimap } from './minimap.js';
import { EditorOps } from './ops.js';
import { installPointer } from './pointer.js';
import { Shell } from './shell.js';
import { EditorStage } from './stage.js';
import { Viewport } from './viewport.js';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

// ------------------------------------------------------------- core

// The DOM wakes in zone dress; boot flips to the world home screen.
let mode: StudioMode = 'zone';
let pendingZoneFit = false;

const canvas = $('editor-canvas') as unknown as HTMLCanvasElement;
const stageCanvas = $('stage-canvas') as unknown as HTMLCanvasElement;
const worldCanvas = $('world-canvas') as unknown as HTMLCanvasElement;
const state = new EditorState();
const draftView = new EditorView(canvas, state);
const stage = new EditorStage(stageCanvas, () => state.zone);
const view = new Viewport(draftView, stage, state, canvas, stageCanvas);
const history = new History();

/** Live pick lists — served by the running game, content as fallback. */
let registry: RegistrySnapshot = {
  npcs: [...NPCS.values()].map((d) => ({ id: d.id, name: d.name, level: d.level })),
  actors: [...NPC_ACTORS.values()].map((a) => ({
    id: a.id,
    name: a.name,
    ...(a.title ? { title: a.title } : {}),
  })),
  routines: [...ROUTINES.keys()],
};
let prefabList: PrefabListEntry[] = [];
let prefabsOnline = false;

const ops = new EditorOps(state, view, history, () => registry);
const shell = new Shell();

// ---------------------------------------------------------- world

const world = new WorldMode({
  canvas: worldCanvas,
  panelHost: $('world-panel'),
  toast,
  openZone: (id) => void openZoneById(id),
  newZone: (spec) => {
    const z = newZoneDef(spec.id, spec.name, spec.w, spec.h);
    z.origin = { x: spec.x, y: spec.y };
    adoptZone(z, false);
    toast(`new ${spec.w}×${spec.h} zone '${spec.id}' on its planned ground — Save stands it up live`);
  },
  showModal,
  setHint: (text) => chrome.setHint(text),
  setCoords: (text) => {
    $('st-coords').textContent = text;
  },
  setZoom: (text) => {
    $('st-zoom').textContent = text;
    $('zoom-pct').textContent = text;
  },
  refreshMaps: async () => {
    try {
      const l = await listMaps();
      world.ws.setZones(l.zones);
    } catch {
      /* offline — the next action retries */
    }
  },
});

const chrome = new Chrome({ state, view, ops, world, getMode: () => mode });

// ----------------------------------------------------- prefab cards

/** Real-art prefab card previews, rendered lazily off the fetched def. */
const prefabPreviews = new Map<string, HTMLCanvasElement>();
const prefabPreviewPending = new Set<string>();

function prefabPreviewFor(id: string): HTMLCanvasElement | null {
  const hit = prefabPreviews.get(id);
  if (hit) return hit;
  if (!prefabPreviewPending.has(id)) {
    prefabPreviewPending.add(id);
    void fetchPrefab(id)
      .then((json) => {
        const def = prefabFromJson(json);
        const layers = prefabLayers(def);
        const cnv = renderLayersPreview(layers, 150);
        drawPreviewPins(cnv, layers, [
          ...def.spawns.map((s) => ({ dx: s.dx, dy: s.dy, color: '#e06456' })),
          ...def.actorSpawns.map((a) => ({ dx: a.dx, dy: a.dy, color: '#5fc9c4' })),
          ...def.portals.map((p) => ({ dx: p.dx, dy: p.dy, color: '#b48fe8' })),
        ], 150);
        prefabPreviews.set(id, cnv);
        prefabPreviewPending.delete(id);
        state.changed();
      })
      .catch(() => prefabPreviewPending.delete(id));
  }
  return null;
}

async function refreshPrefabs(announce = false): Promise<void> {
  try {
    prefabList = await listPrefabs();
    prefabsOnline = true;
    prefabPreviews.clear();
    prefabPreviewPending.clear();
    if (announce) toast(`prefab library: ${prefabList.length} saved`, 2600, 'success');
  } catch {
    prefabsOnline = false;
  }
  state.changed();
}

// -------------------------------------------------------- file flow

function adoptZone(zone: ZoneDef, serverBacked: boolean, opts: { stay?: boolean } = {}): void {
  state.adopt(zone, { serverBacked });
  history.clear();
  view.markAllDirty();
  if (!opts.stay) setMode('zone');
  view.fitZone();
  if (opts.stay) pendingZoneFit = true;
  chrome.syncZoneChip();
  chrome.updateStatus();
}

async function openZoneById(id: string): Promise<void> {
  try {
    const json = await fetchZone(id);
    adoptZone(zoneFromJson(json), true);
    noteRecentZone(id);
    if (id.startsWith('poi:')) {
      toast('a composed frontier site — look freely; adopt it from the World view to make it yours', 4600);
    } else {
      toast(`opened '${id}'`);
    }
  } catch (err) {
    toast(`open failed: ${(err as Error).message}`, 4000);
  }
}

async function saveToServer(): Promise<void> {
  const v = validateZone(state.zone);
  chrome.showValidation(
    v.ok ? (v.fenceAdded > 0 ? `auto-fence will add ${v.fenceAdded} cliff tiles` : 'zone is valid') : v.error!,
    v.ok,
  );
  if (!v.ok) {
    toast('validation failed — see panel', 4000);
    return;
  }
  if (v.fencedGround) {
    ops.zoneOp('auto-fence', (z) => {
      z.ground.set(v.fencedGround!);
    });
    toast(`auto-fence added ${v.fenceAdded} cliff tiles`);
  }
  try {
    await saveZone(zoneToJson(state.zone));
    state.dirty = false;
    state.serverBacked = true;
    state.changed();
    toast(`saved '${state.zone.id}' — live on the server`, 2600, 'success');
    chrome.setServerStatus(`saved ${new Date().toLocaleTimeString()}`, true);
    world.view.invalidateZone(state.zone.id);
  } catch (err) {
    toast(`save failed: ${(err as Error).message}`, 5000, 'error');
    chrome.setServerStatus('offline — Export keeps a local copy');
  }
}

function doSave(): void {
  if (mode === 'world') void world.save();
  else void saveToServer();
}

function doValidate(): void {
  if (mode === 'world') {
    const res = world.validate();
    chrome.showValidation(res.text, res.ok);
    return;
  }
  const v = validateZone(state.zone);
  chrome.showValidation(
    v.ok
      ? v.fenceAdded > 0
        ? `valid — auto-fence would add ${v.fenceAdded} cliff tiles on save`
        : 'zone is valid'
      : v.error!,
    v.ok,
  );
}

function doExport(): void {
  const isWorld = mode === 'world';
  if (isWorld && !world.ws.geo) return;
  const json = isWorld
    ? JSON.stringify(world.ws.geo, null, 2)
    : JSON.stringify(zoneToJson(state.zone), null, 2);
  const name = isWorld ? 'geography.json' : `${state.zone.id}.json`;
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`exported ${name}`);
}

const fileInput = $('file-load') as unknown as HTMLInputElement;
fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
    if (mode === 'world' || (Array.isArray(parsed.routes) && Array.isArray(parsed.planned))) {
      world.importDraft(parsed);
      setMode('world');
      toast(`imported ${file.name} as the world plan draft — Save makes it live`);
    } else {
      adoptZone(zoneFromJson(parsed as unknown as ZoneJson), false);
      toast(`imported ${file.name}`);
    }
  } catch (err) {
    toast(`import failed: ${(err as Error).message}`, 4000);
  }
  fileInput.value = '';
});

// ------------------------------------------------------------- zoom

function zoomFromCenter(factor: number): void {
  if (mode === 'world') {
    const rect = worldCanvas.getBoundingClientRect();
    world.view.zoomAt(rect.width / 2, rect.height / 2, factor);
    world.syncZoom();
    return;
  }
  // The wrap's rect — the active zone canvas may be either of the two.
  const rect = $('canvas-wrap').getBoundingClientRect();
  view.zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  chrome.updateStatus();
}

function zoomFit(): void {
  if (mode === 'world') {
    world.view.fitWorld();
    world.syncZoom();
  } else view.fitZone();
}

function zoomActual(): void {
  if (mode === 'world') {
    const rect = worldCanvas.getBoundingClientRect();
    world.view.zoomAt(rect.width / 2, rect.height / 2, 8 / world.view.scale);
    world.syncZoom();
    return;
  }
  const rect = $('canvas-wrap').getBoundingClientRect();
  view.zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 32 / view.scale);
  chrome.updateStatus();
}

// ---------------------------------------------------------- dialogs

const dialogDeps: DialogDeps = {
  ops,
  world,
  getMode: () => mode,
  setMode: (m) => setMode(m),
  adoptZone: (z, sb) => adoptZone(z, sb),
  openZoneById,
  refreshPrefabs: () => refreshPrefabs(),
  setServerStatus: (t, live) => chrome.setServerStatus(t, live),
  syncZoneChip: () => chrome.syncZoneChip(),
};

// --------------------------------------------------------- commands

const commands: Command[] = buildCommands({
  setTool: (t) => ops.setTool(t),
  setWorldTool: (t) => world.setTool(t),
  setLayer: (l) => {
    state.layer = l;
    state.changed();
  },
  setTab: (t) => {
    state.tab = t;
    state.changed();
  },
  setMode: (m) => setMode(m),
  newZone: () => newZoneDialog(dialogDeps),
  open: () => void openBrowser(dialogDeps),
  save: doSave,
  validate: doValidate,
  importFile: () => fileInput.click(),
  exportFile: doExport,
  help: helpDialog,
  undo: () => ops.undoRedo('undo'),
  redo: () => ops.undoRedo('redo'),
  zoomIn: () => zoomFromCenter(1.25),
  zoomOut: () => zoomFromCenter(1 / 1.25),
  zoomFit,
  zoomActual,
  toggleView: (key) => {
    view[key] = !view[key];
    state.changed();
  },
  toggleDraftView: () => {
    view.toggleDraftView();
    state.changed();
  },
  setClock: (hours) => clock.set(hours),
  toggleInstrument: (id) => shell.toggleInstrument(id),
  toggleDockPanel: (id) => shell.togglePanel(id),
  zoneProperties: () => zonePropertiesDialog(dialogDeps),
  saveSelectionAsPrefab: () => savePrefabDialog(dialogDeps),
  openContentStudio: () => {
    window.location.href = '/cms.html';
  },
});

/** Dynamic ⌘K entries: every zone the world holds, by name. */
function zoneCommands(): Command[] {
  return world.ws.zones
    .filter((z) => !z.poi)
    .map((z) => ({
      id: `zone.${z.id}`,
      title: `Open zone: ${z.name}`,
      group: 'Zones',
      run: () => void openZoneById(z.id),
    }));
}

const cmdk = new CommandPalette(() => commands, () => mode, [zoneCommands]);

// ------------------------------------------------------------ panels

const TAB_LABELS: Array<[SidebarTab, string, string]> = [
  ['tiles', 'Tiles', 'paint'],
  ['structures', 'Structures', 'structure'],
  ['placements', 'Placements', 'actor'],
];

function panelDeps(): PanelDeps {
  return {
    state,
    registry,
    prefabs: prefabList,
    prefabsOnline,
    prefabPreview: prefabPreviewFor,
    actions: {
      armTemplate(id) {
        if (!id) {
          ops.disarmStamp();
          return;
        }
        state.armedTemplate = id;
        state.armedPrefab = null;
        state.stampFlip = false;
        ops.setTool('structure');
        toast(`armed ${id} — click the map to stamp · X mirrors · Esc puts it away`);
      },
      armPrefab(id) {
        if (!id) {
          ops.disarmStamp();
          return;
        }
        void (async () => {
          try {
            state.armedPrefab = prefabFromJson(await fetchPrefab(id));
            state.armedTemplate = null;
            ops.setTool('prefab');
            toast(`armed '${state.armedPrefab.name}' — click the map to stamp · Esc puts it away`);
          } catch (err) {
            toast(`prefab load failed: ${(err as Error).message}`, 4000, 'error');
          }
        })();
      },
      saveSelectionAsPrefab() {
        savePrefabDialog(dialogDeps);
      },
      removePrefab(id) {
        void (async () => {
          const ok = await confirmDialog('Every teammate loses it.', {
            title: `Delete prefab '${id}' from the shared library?`,
            action: 'Delete',
            danger: true,
          });
          if (!ok) return;
          try {
            await deletePrefab(id);
            if (state.armedPrefab?.id === id) state.armedPrefab = null;
            await refreshPrefabs();
            toast(`deleted prefab '${id}'`);
          } catch (err) {
            toast(`delete failed: ${(err as Error).message}`, 4000);
          }
        })();
      },
      refreshPrefabs() {
        void refreshPrefabs(true);
      },
      selectPlacement: (ref) => ops.selectPlacement(ref),
      focusPlacement: (ref) => ops.focusPlacement(ref),
      removePlacement: (ref) => ops.removePlacementRef(ref),
      editPlacement(ref, label, mutate) {
        void ref;
        ops.zoneOp(label, mutate, { tiles: false });
      },
    },
  };
}

function buildPanels(): void {
  const tabs = $('side-tabs');
  tabs.innerHTML = '';
  for (const [id, label, icon] of TAB_LABELS) {
    const b = el('button', 'lib-tab' + (state.tab === id ? ' active' : ''));
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(state.tab === id));
    b.appendChild(iconImg(icon, 15));
    b.append(` ${label}`);
    b.onclick = () => {
      state.tab = id;
      state.changed();
    };
    tabs.appendChild(b);
  }
  if (mode === 'zone') shell.syncLibTabs(state.tab);
  if (state.tab === 'structures') buildStructuresPanel($('tab-structures'), panelDeps());
  if (state.tab === 'placements') buildPlacementsPanel($('tab-placements'), panelDeps());
}

// -------------------------------------------------------------- mode

function setMode(m: StudioMode): void {
  if (mode === m) return;
  mode = m;
  const isWorld = m === 'world';
  modeSeg.set(m);
  shell.setModeDom(m, state.tab);
  chrome.hideValidation();
  // Deep links follow the view: ?zone= names the open zone, absent
  // means the world. Refresh lands you where you were.
  const url = new URL(location.href);
  if (isWorld) url.searchParams.delete('zone');
  else url.searchParams.set('zone', state.zone.id);
  window.history.replaceState(null, '', url);
  if (!isWorld && pendingZoneFit) {
    view.fitZone();
    pendingZoneFit = false;
  }
  chrome.buildRail();
  chrome.syncZoneChip();
  chrome.updateStatus();
  if (isWorld) {
    world.setTool(world.ws.tool);
    world.syncZoom();
    world.ws.changed();
    // The zone we just left may have changed — its art on the map
    // and the server's zone list both re-read.
    world.view.invalidateZone(state.zone.id);
    void world.refresh();
  } else {
    // World-mode geography edits re-carve the shared live registries
    // the stage's worldgen reads — returning to the zone re-arms it.
    stage.rebuildAll();
    state.changed();
  }
}

// ------------------------------------------------------------ topbar

const modeSeg = seg(
  [
    { id: 'world' as StudioMode, label: 'World', title: 'The whole plan — zones, roads, landmarks, the frontier (W)' },
    { id: 'zone' as StudioMode, label: 'Zone', title: 'The open zone, tile by tile (Z)' },
  ],
  mode,
  (m) => setMode(m),
);
$('mode-seg-host').appendChild(modeSeg.root);

function topbarButton(id: string, run: () => void): void {
  $(id).addEventListener('click', run);
}

topbarButton('btn-new', () => newZoneDialog(dialogDeps));
topbarButton('btn-open', () => void openBrowser(dialogDeps));
topbarButton('btn-save', doSave);
topbarButton('btn-validate', doValidate);
topbarButton('btn-import', () => fileInput.click());
topbarButton('btn-export', doExport);
topbarButton('btn-help', helpDialog);
topbarButton('btn-cmdk', () => cmdk.open());
topbarButton('zone-chip', () => {
  if (mode === 'world') world.view.fitWorld();
  else zonePropertiesDialog(dialogDeps);
});
$('btn-cmdk').appendChild(kbd('⌘K'));

topbarButton('zoom-in', () => zoomFromCenter(1.25));
topbarButton('zoom-out', () => zoomFromCenter(1 / 1.25));
topbarButton('zoom-fit', zoomFit);
topbarButton('zoom-pct', zoomActual);

// ---------------------------------------------------------- palette

const palette = new PaletteUI($('palette'), state, {
  onPickTile: (t) => {
    state.brushTile = t;
    state.layer = 'ground';
    if (
      state.tool !== 'paint' && state.tool !== 'line' && state.tool !== 'rect' &&
      state.tool !== 'ellipse' && state.tool !== 'fill' && state.tool !== 'road'
    ) {
      state.tool = 'paint';
    }
    palette.noteUse(t);
    state.changed();
  },
  onPickDetail: (d) => {
    state.brushDetail = d;
    state.layer = 'detail';
    if (state.tool === 'select' || state.tool === 'spawn' || state.tool === 'picker') {
      state.tool = 'paint';
    }
    state.changed();
  },
});

// -------------------------------------------------------- wiring up

const minimap = new Minimap(
  $('minimap') as unknown as HTMLCanvasElement,
  state,
  view,
  () => chrome.updateStatus(),
);

const clock = new ClockInstrument($('inst-clock-body'), stage);

const keys = installKeys({
  ops,
  world,
  cmdk,
  getMode: () => mode,
  setMode,
  save: doSave,
  open: () => void openBrowser(dialogDeps),
  zoomFit,
  focusPaletteSearch: () => $('pal-search')?.focus(),
});

installPointer({
  canvases: [canvas, stageCanvas],
  ops,
  isActive: () => mode === 'zone',
  isSpaceHeld: () => keys.isSpaceHeld(),
  updateStatus: () => chrome.updateStatus(),
});

shell.init();

state.onChange(() => {
  chrome.buildRail();
  chrome.buildOptions();
  palette.rebuild();
  buildPanels();
  chrome.syncZoneChip();
  chrome.updateStatus();
  minimap.dirty = true;
});

world.ws.onChange(() => {
  if (mode !== 'world') return;
  chrome.buildRail();
  chrome.syncZoneChip();
  chrome.updateStatus();
});

chrome.buildRail();
chrome.buildOptions();
buildPanels();

// -------------------------------------------------------------- boot

async function boot(): Promise<void> {
  void fetchRegistry()
    .then((r) => {
      registry = r;
      state.changed();
    })
    .catch(() => {});
  void refreshPrefabs();
  void world.boot().then(() => {
    // The stage generates with the server's seed — armed once the
    // world snapshot lands (offline keeps the shipped default).
    stage.setSeed(world.ws.seed);
    if (mode === 'world') {
      chrome.syncZoneChip();
      chrome.updateStatus();
    }
  });
  const params = new URLSearchParams(location.search);
  const wanted = params.get('zone');
  try {
    const list = await listMaps();
    chrome.setServerStatus('connected', true);
    const pick =
      (wanted && list.zones.find((z) => z.id === wanted)) ??
      list.zones.find((z) => z.id === 'dawnmead') ??
      list.zones[0];
    if (pick) {
      adoptZone(zoneFromJson(await fetchZone(pick.id)), true, { stay: !wanted });
      if (wanted) toast(`opened '${pick.id}' from server`);
    }
  } catch {
    chrome.setServerStatus('offline — local mode (Import/Export only)');
    adoptZone(buildDawnmead(), false, { stay: true });
  }
  if (!params.get('zone')) setMode('world');
  const at = params.get('at');
  if (at) {
    const [x, y] = at.split(',').map(Number);
    if (Number.isFinite(x) && Number.isFinite(y)) world.view.centerOn(x!, y!, 2);
  }
}

void boot();

function frame(nowMs: number): void {
  if (mode === 'world') {
    world.frame();
  } else {
    view.render(nowMs);
    minimap.draw(nowMs);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Dev handle for Playwright audits, same law as the game's dcGame.
Object.assign(window, {
  dcEditor: {
    state,
    view,
    stage,
    history,
    validateZone,
    world,
    ops,
    cmdk,
    clock,
    setMode: (m: StudioMode) => setMode(m),
  },
});
