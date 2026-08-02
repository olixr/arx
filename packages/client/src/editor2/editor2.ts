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
  type NpcActorDef,
  type ZoneDef,
  type ZoneJson,
} from '@arx/content';
import {
  fetchActorDefs,
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
import { tileDef } from '@arx/shared';
import { btn as btnKit, chip as kitChip, confirmDialog, el, kbd, seg, toast } from '../studio2/kit.js';
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
import { GhostWalk } from './ghostWalk.js';
import { installKeys } from './keys.js';
import { Minimap } from './minimap.js';
import { EditorOps } from './ops.js';
import { StagePeople } from './people.js';
import { buildPeoplePanel, invalidatePeopleThumbs } from './peoplePanel.js';
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
/** Full actor defs — DB truth once fetched; the bundle stands in. */
let actorDefs: ReadonlyMap<string, NpcActorDef> = NPC_ACTORS;

const ops = new EditorOps(state, view, history, () => registry);
const shell = new Shell();
const people = new StagePeople(stage, () => state.zone);
const ghost = new GhostWalk(stage, view, people, () => state.zone.origin);

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

/** THE CONFLICT GUARD's baseline: the server copy as we received it. */
let baselineJson: string | null = null;

function adoptZone(zone: ZoneDef, serverBacked: boolean, opts: { stay?: boolean } = {}): void {
  baselineJson = serverBacked ? JSON.stringify(zoneToJson(zone)) : null;
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
    offerDraftRestore(id);
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
  // THE CONFLICT GUARD: if the server copy moved since we opened it,
  // another session saved here — overwriting must be a choice.
  if (baselineJson !== null && !state.zone.id.startsWith('poi:')) {
    try {
      const current = JSON.stringify(await fetchZone(state.zone.id));
      if (current !== baselineJson) {
        const ok = await confirmDialog(
          'The server copy of this zone changed since you opened it — another session saved here. Overwrite their work with yours?',
          { title: 'Zone changed on the server', action: 'Overwrite', danger: true },
        );
        if (!ok) {
          toast('save held — Open the zone again to take the newer copy', 4600);
          return;
        }
      }
    } catch {
      /* the fetch failing falls through to the save's own error */
    }
  }
  try {
    await saveZone(zoneToJson(state.zone));
    state.dirty = false;
    state.serverBacked = true;
    baselineJson = JSON.stringify(zoneToJson(state.zone));
    clearDraft(); // the truth is on the server now
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
  toggleLiving: () => livingChip.click(),
  toggleLens: (id) => {
    view.lenses[id] = !view.lenses[id];
    view.saveLenses();
    buildLensHost();
  },
  setClock: (hours) => clock.set(hours),
  toggleInstrument: (id) => shell.toggleInstrument(id),
  toggleDockPanel: (id) => shell.togglePanel(id),
  zoneProperties: () => zonePropertiesDialog(dialogDeps),
  saveSelectionAsPrefab: () => savePrefabDialog(dialogDeps),
  ghostWalk: () => ghost.toggle(),
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
  ['placements', 'Placements', 'spawn'],
  ['people', 'People', 'actor'],
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
      beginPatrolEdit: (index) => ops.beginPatrolEdit(index),
      clearPatrol: (index) => ops.clearPatrol(index),
    },
    actorDefs,
  };
}

function buildPanels(): void {
  const tabs = $('side-tabs');
  tabs.innerHTML = '';
  for (const [id, label] of TAB_LABELS) {
    const b = el('button', 'lib-tab' + (state.tab === id ? ' active' : ''));
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(state.tab === id));
    b.append(label);
    b.onclick = () => {
      state.tab = id;
      state.changed();
    };
    tabs.appendChild(b);
  }
  if (mode === 'zone') shell.syncLibTabs(state.tab);
  if (state.tab === 'structures') buildStructuresPanel($('tab-structures'), panelDeps());
  if (state.tab === 'placements') buildPlacementsPanel($('tab-placements'), panelDeps());
  if (state.tab === 'people') {
    buildPeoplePanel($('tab-people'), {
      state,
      actorDefs,
      armCluster: (npcId) => {
        state.pendingNpc = npcId;
        state.pendingActor = null;
        ops.setTool('cluster');
        state.tab = 'people'; // stay in the library until something plants
        state.changed();
        toast(`armed ${npcId} — the next click plants the camp`);
      },
      armActor: (slug) => {
        state.pendingActor = slug;
        state.pendingNpc = null;
        ops.setTool('actor');
        state.tab = 'people';
        state.changed();
        toast(`armed ${actorDefs.get(slug)?.name ?? slug} — the next click posts them`);
      },
    });
  }
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
// LIVING MODE — rounds walk in real time; off = the settled hour.
const livingChip = kitChip(
  'Living',
  false,
  (on) => {
    people.living = on;
  },
  'Rounds and drifts walk in real time; off holds the settled hour frame',
);
livingChip.style.alignSelf = 'center';
$('inst-clock-body').appendChild(livingChip);

// THE PEOPLE PLANE: ghosts, the selected actor's projected day, and
// patrol rounds (committed + mid-edit) ride over the true frame.
view.peopleOverlay = (h) => {
  people.drawGhosts(h);
  if (state.selected?.kind === 'actor') people.drawRoutineProjection(h, state.selected.index);
  const z = state.zone;
  const drawRound = (pts: ReadonlyArray<{ x: number; y: number }>, editing: boolean): void => {
    if (pts.length === 0) return;
    const { ctx } = h;
    ctx.save();
    ctx.strokeStyle = editing ? 'rgba(216, 179, 106, 0.95)' : 'rgba(216, 179, 106, 0.55)';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = editing ? 2 : 1.5;
    if (!editing) ctx.setLineDash([6, 4]);
    ctx.beginPath();
    pts.forEach((p, i) => {
      const px = h.sx(p.x - z.origin.x + 0.5);
      const py = h.sy(p.y - z.origin.y + 0.5);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    if (pts.length > 2) ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    for (const p of pts) {
      ctx.beginPath();
      ctx.arc(h.sx(p.x - z.origin.x + 0.5), h.sy(p.y - z.origin.y + 0.5), editing ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  if (ops.patrolEdit) {
    drawRound(ops.patrolEdit.points, true);
  } else if (state.selected?.kind === 'cluster') {
    const sp = z.spawns?.[state.selected.index];
    if (sp?.patrol) drawRound(sp.patrol, false);
  }
};

const keys = installKeys({
  ops,
  world,
  cmdk,
  ghost,
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
  setHint: (text) => chrome.setHint(text),
});

shell.init();
buildLensHost();

// ------------------------------------------- the context bar (Ph4)

/**
 * THE VERB COMES TO THE HAND: a floating bar anchored above the live
 * selection with everything a marquee wants — swap, stamp, clipboard,
 * delete. Repositioned each frame from the shared camera.
 */
const ctxbar = $('ctxbar');

function swapDialog(): void {
  const census = ops.selectionTileCensus();
  if (census.length === 0) return;
  showModal((body, close) => {
    body.appendChild(el('h2', undefined, 'Swap tiles in selection'));
    const rows = el('div', 'form-rows');
    const fromSel = el('select');
    for (const c of census) {
      const opt = el('option', undefined, `${tileDefName(c.tile)} — ${c.count} cells`);
      opt.value = String(c.tile);
      fromSel.appendChild(opt);
    }
    const rowFrom = el('label', 'form-row');
    rowFrom.appendChild(el('span', undefined, 'replace'));
    rowFrom.appendChild(fromSel);
    rowFrom.appendChild(el('em', undefined, 'Every cell of this ground tile inside the selection.'));
    rows.appendChild(rowFrom);
    const rowTo = el('div', 'form-row');
    rowTo.appendChild(el('span', undefined, 'with'));
    rowTo.appendChild(el('b', undefined, tileDefName(state.brushTile)));
    rowTo.appendChild(el('em', undefined, 'The current brush tile — pick another in the palette first if this is wrong.'));
    rows.appendChild(rowTo);
    body.appendChild(rows);
    const actions = el('div', 'dialog-actions');
    actions.appendChild(btnKit('Cancel', { onClick: close }));
    actions.appendChild(
      btnKit('Swap', {
        variant: 'primary',
        onClick: () => {
          const n = ops.swapTiles(Number(fromSel.value), state.brushTile);
          toast(n > 0 ? `swapped ${n} cells` : 'nothing matched');
          close();
        },
      }),
    );
    body.appendChild(actions);
  });
}

function buildCtxbar(): void {
  ctxbar.innerHTML = '';
  const r = ops.selRect();
  if (!r || mode !== 'zone') {
    ctxbar.classList.add('hidden');
    return;
  }
  ctxbar.classList.remove('hidden');
  const cells = state.selectionMask ? state.selectionMask.size : (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1);
  ctxbar.appendChild(el('span', 'ctx-dims', `${r.x1 - r.x0 + 1}×${r.y1 - r.y0 + 1} · ${cells}`));
  const verb = (label: string, title: string, run: () => void): void => {
    const b = el('button', 'ghost', label);
    b.title = title;
    b.onclick = run;
    ctxbar.appendChild(b);
  };
  verb('Swap…', 'Replace one ground tile with the brush tile, selection-wide', swapDialog);
  verb('Stamp', 'Save this selection to the prefab library', () => savePrefabDialog(dialogDeps));
  verb('Copy', '⌘C', () => {
    if (ops.copySelection()) toast('copied selection');
  });
  verb('Cut', '⌘X', () => ops.cutSelection());
  verb('Delete', 'Clear the selected cells to meadow', () => {
    ops.clearSelectedCells('delete selection');
    toast('cleared selection');
  });
  verb('✕', 'Deselect (Esc)', () => ops.clearSelection());
}

function positionCtxbar(): void {
  if (ctxbar.classList.contains('hidden')) return;
  const r = ops.selRect();
  if (!r) return;
  const p = view.localToScreen(r.x0, r.y0);
  const wrap = $('canvas-wrap').getBoundingClientRect();
  const bw = ctxbar.offsetWidth;
  ctxbar.style.left = `${Math.max(8, Math.min(wrap.width - bw - 8, p.x))}px`;
  ctxbar.style.top = `${Math.max(8, p.y - 44)}px`;
}

function tileDefName(t: number): string {
  return tileDef(t).name;
}

// ------------------------------------------------- the lenses (Ph5)

function buildLensHost(): void {
  const LENS_META: Array<[keyof typeof view.lenses, string, string]> = [
    ['shelf', 'shelf', 'The draw-order strat: crowns sort on shelf 0'],
    ['interiors', 'rooms', 'The client-derived rooms; warm = hearth-lit; red doors open onto no room'],
    ['reach', 'reach', "The validator's flood from the spawn — stranded cells in red"],
    ['edges', 'edges', 'The border classes worldgen blends the wild toward'],
    ['growth', 'growth', 'Kept vs wild renewal domain'],
    ['factions', 'factions', 'Nearest-hearth claims and the crime-ground roster'],
    ['signs', 'signs', 'Every board and every breach of the words-with-board law'],
  ];
  const host = $('lens-host');
  host.innerHTML = '';
  host.appendChild(el('div', 'panel-head', 'Lenses'));
  const row = el('div', 'opt-row');
  for (const [id, label, tip] of LENS_META) {
    row.appendChild(
      kitChip(label, view.lenses[id], (on) => {
        view.lenses[id] = on;
        view.saveLenses();
      }, tip),
    );
  }
  host.appendChild(row);
}

// ------------------------------------------- the history panel (Ph4)

function buildHistoryPanel(): void {
  const host = $('history-host');
  host.innerHTML = '';
  const entries = history.entries();
  if (entries.length === 0) return;
  const head = el('div', 'panel-head', 'History');
  head.appendChild(el('span', 'count', String(entries.length)));
  host.appendChild(head);
  const list = el('div', 'hist-list');
  const cursor = history.cursor;
  const start = Math.max(0, entries.length - 30);
  // Step 0 — before everything (visible when the tail is shown).
  if (start === 0) {
    const zero = el('button', 'hist-row' + (cursor === 0 ? ' at' : ' undone'), '· opened');
    zero.onclick = () => {
      ops.jumpHistory(0);
      toast('history: before every change');
    };
    list.appendChild(zero);
  }
  entries.slice(start).forEach((e, k) => {
    const i = start + k;
    const applied = i < cursor;
    const row = el(
      'button',
      'hist-row' + (i === cursor - 1 ? ' at' : applied ? '' : ' undone'),
      e.label + (e.cells > 0 ? ` · ${e.cells}` : ''),
    );
    row.title = applied ? 'Click to rewind to just after this change' : 'Click to redo through this change';
    row.onclick = () => {
      ops.jumpHistory(i + 1);
      toast(`history: ${e.label}`);
    };
    list.appendChild(row);
  });
  host.appendChild(list);
  list.scrollTop = list.scrollHeight;
}

// ---------------------------------------------- autosave drafts (Ph4)

const DRAFT_KEY = 'dc2-draft';

function saveDraft(): void {
  if (!state.dirty || mode !== 'zone') return;
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ id: state.zone.id, at: Date.now(), json: zoneToJson(state.zone) }),
    );
  } catch {
    /* quota — a draft is a kindness, never an error */
  }
}

function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}

/** After opening a zone: an unsaved draft of it may outrank the disk. */
function offerDraftRestore(id: string): void {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw) as { id: string; at: number; json: ZoneJson };
    if (draft.id !== id) return;
    const when = new Date(draft.at).toLocaleTimeString();
    void confirmDialog(
      `An unsaved draft of '${id}' from ${when} survived (autosave). Restore it over the server copy?`,
      { title: 'Restore unsaved draft?', action: 'Restore draft' },
    ).then((yes) => {
      if (yes) {
        adoptZone(zoneFromJson(draft.json), true);
        state.dirty = true;
        state.changed();
        toast('draft restored — Save ▸ Live when it stands right');
      } else {
        clearDraft();
      }
    });
  } catch {
    clearDraft();
  }
}

window.setInterval(saveDraft, 30_000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveDraft();
});

state.onChange(() => {
  chrome.buildRail();
  chrome.buildOptions();
  palette.rebuild();
  buildPanels();
  chrome.syncZoneChip();
  chrome.updateStatus();
  minimap.dirty = true;
  people.markStale();
  buildCtxbar();
  buildHistoryPanel();
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
  // Full actor defs: the stage dresses bodies with DB truth (CMS
  // edits included); the shipped bundle stands in until they land.
  void fetchActorDefs()
    .then((defs) => {
      actorDefs = defs;
      people.adoptActorDefs(defs);
      invalidatePeopleThumbs();
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
      offerDraftRestore(pick.id);
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
    people.update();
    ghost.update(nowMs);
    view.render(nowMs);
    minimap.draw(nowMs);
    positionCtxbar();
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
