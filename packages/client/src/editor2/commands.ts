/**
 * THE COMMAND REGISTRY — the single source of truth for every verb the
 * studio knows. The tool rail, the keyboard, the ⌘K palette, and the
 * help sheet all read THIS; a verb that exists anywhere else is a bug.
 * (Map Studio v2 plan §3.3 — Phase 1.)
 */

import type { SidebarTab, ToolId } from '../editor/state.js';
import type { WorldTool } from '../editor/world/worldState.js';

export type StudioMode = 'world' | 'zone';

export interface ToolSpec {
  id: ToolId;
  name: string;
  key: string; // display key cap
  code: string; // KeyboardEvent.code
  hint: string;
  icon: string;
  tab?: SidebarTab;
}

export const TOOL_GROUPS: ReadonlyArray<{ caption: string; tools: ToolSpec[] }> = [
  {
    caption: 'Draw',
    tools: [
      { id: 'paint', name: 'Paint', key: 'B', code: 'KeyB', icon: 'paint', hint: 'Drag to paint the active layer · right-drag erases · [ ] size the brush' },
      { id: 'erase', name: 'Erase', key: 'E', code: 'KeyE', icon: 'erase', hint: 'Ground back to grass, detail to none, elevation to flat' },
      { id: 'line', name: 'Line', key: 'L', code: 'KeyL', icon: 'line', hint: 'Drag a straight run · Shift snaps the angle' },
      { id: 'rect', name: 'Rectangle', key: 'R', code: 'KeyR', icon: 'rect', hint: 'Drag a rectangle · Shift squares it · filled/outline in options' },
      { id: 'ellipse', name: 'Ellipse', key: 'O', code: 'KeyO', icon: 'ellipse', hint: 'Drag an ellipse · Shift rounds it · filled/outline in options' },
      { id: 'fill', name: 'Fill', key: 'G', code: 'KeyG', icon: 'fill', hint: 'Flood a connected region on the active layer' },
      { id: 'road', name: 'Road', key: 'T', code: 'KeyT', icon: 'road', hint: 'Click waypoints · Enter or double-click lays the road · Esc abandons' },
    ],
  },
  {
    caption: 'Build',
    tools: [
      { id: 'structure', name: 'Structure', key: 'H', code: 'KeyH', icon: 'structure', hint: 'Stamp a building template · X mirrors it · pick one in the library', tab: 'structures' },
      { id: 'prefab', name: 'Prefab', key: 'F', code: 'KeyF', icon: 'prefab', hint: 'Stamp a saved point of interest — tiles and placements together', tab: 'structures' },
    ],
  },
  {
    caption: 'Place',
    tools: [
      { id: 'portal', name: 'Portal', key: 'U', code: 'KeyU', icon: 'portal', hint: 'Click to plant a portal · drag a marker to move it · right-click removes', tab: 'placements' },
      { id: 'cluster', name: 'NPC cluster', key: 'N', code: 'KeyN', icon: 'cluster', hint: 'Click to plant a respawning mob camp · drag the ring edge to resize', tab: 'placements' },
      { id: 'actor', name: 'Actor', key: 'A', code: 'KeyA', icon: 'actor', hint: 'Click to post a named NPC · bind identity and routine in the inspector', tab: 'placements' },
      { id: 'sign', name: 'Sign', key: 'J', code: 'KeyJ', icon: 'sign', hint: 'Click to raise a board · write its words in the inspector · right-click removes', tab: 'placements' },
      { id: 'spawn', name: 'World spawn', key: 'P', code: 'KeyP', icon: 'spawn', hint: 'Click to set where players arrive in the world', tab: 'placements' },
    ],
  },
  {
    caption: 'Edit',
    tools: [
      { id: 'select', name: 'Select', key: 'M', code: 'KeyM', icon: 'select', hint: 'Drag a marquee · drag inside moves it · Alt-drag copies · Delete clears' },
      { id: 'picker', name: 'Picker', key: 'I', code: 'KeyI', icon: 'picker', hint: 'Click any tile to make it the brush · Alt-click works from any tool' },
    ],
  },
];

export const TOOL_SPECS: ReadonlyMap<ToolId, ToolSpec> = new Map(
  TOOL_GROUPS.flatMap((g) => g.tools).map((t) => [t.id, t]),
);

export const TOOL_BY_CODE: ReadonlyMap<string, ToolId> = new Map(
  TOOL_GROUPS.flatMap((g) => g.tools).map((t) => [t.code, t.id]),
);

export interface WorldToolSpec {
  id: WorldTool;
  icon: string;
  name: string;
  key: string;
  hint: string;
}

export const WORLD_TOOLS: ReadonlyArray<WorldToolSpec> = [
  { id: 'select', icon: 'wselect', name: 'Survey', key: 'V', hint: 'Click to inspect · drag to move · drag empty land to pan · double-click a zone to step in' },
  { id: 'route', icon: 'wroute', name: 'Road', key: 'R', hint: 'Click waypoints · Enter or double-click opens the road · the land grades itself under it' },
  { id: 'trail', icon: 'wtrail', name: 'Trail', key: 'T', hint: 'Click waypoints · a bare-dirt hunter’s track — unlit, barely cleared' },
  { id: 'site', icon: 'wsite', name: 'Landmark', key: 'N', hint: 'Pin an authored wild site — a waystation, a den, a lamp' },
  { id: 'anchor', icon: 'wanchor', name: 'Hearth', key: 'A', hint: 'Light a hearth or haven — its ring is the safe ground' },
  { id: 'planned', icon: 'wplanned', name: 'Plan ground', key: 'P', hint: 'Drag out the rect a future town will claim' },
];

// ------------------------------------------------------- the registry

export interface Command {
  id: string;
  title: string;
  group: string;
  /** Display shortcut, key-cap formatted ("⌘S", "B"). */
  keyLabel?: string;
  icon?: string;
  /** Which studio view the command belongs to; absent = both. */
  mode?: StudioMode;
  hint?: string;
  run: () => void;
}

export interface CommandDeps {
  setTool(tool: ToolId): void;
  setWorldTool(tool: WorldTool): void;
  setLayer(layer: 'ground' | 'detail' | 'elev'): void;
  setTab(tab: SidebarTab): void;
  setMode(mode: StudioMode): void;
  newZone(): void;
  open(): void;
  save(): void;
  validate(): void;
  importFile(): void;
  exportFile(): void;
  help(): void;
  undo(): void;
  redo(): void;
  zoomIn(): void;
  zoomOut(): void;
  zoomFit(): void;
  zoomActual(): void;
  toggleView(key: 'showGrid' | 'showChunkGrid' | 'showMarkers' | 'showElev'): void;
  toggleInstrument(id: 'minimap' | 'zoom'): void;
  toggleDockPanel(id: 'tool' | 'lib'): void;
  zoneProperties(): void;
  saveSelectionAsPrefab(): void;
  openContentStudio(): void;
}

/** The full static registry. Dynamic entries (zones) come from providers. */
export function buildCommands(d: CommandDeps): Command[] {
  const cmds: Command[] = [];

  for (const group of TOOL_GROUPS) {
    for (const t of group.tools) {
      cmds.push({
        id: `tool.${t.id}`,
        title: t.name,
        group: 'Tools',
        keyLabel: t.key,
        icon: t.icon,
        mode: 'zone',
        hint: t.hint,
        run: () => d.setTool(t.id),
      });
    }
  }
  for (const t of WORLD_TOOLS) {
    cmds.push({
      id: `wtool.${t.id}`,
      title: t.name,
      group: 'World tools',
      keyLabel: t.key,
      icon: t.icon,
      mode: 'world',
      hint: t.hint,
      run: () => d.setWorldTool(t.id),
    });
  }

  const layer = (id: 'ground' | 'detail' | 'elev', name: string, key: string): Command => ({
    id: `layer.${id}`,
    title: `Layer: ${name}`,
    group: 'Layers',
    keyLabel: key,
    mode: 'zone',
    run: () => d.setLayer(id),
  });
  cmds.push(layer('ground', 'Ground', '1'), layer('detail', 'Detail', '2'), layer('elev', 'Elevation', '3'));

  const tab = (id: SidebarTab, name: string): Command => ({
    id: `tab.${id}`,
    title: `Library: ${name}`,
    group: 'View',
    mode: 'zone',
    run: () => d.setTab(id),
  });
  cmds.push(tab('tiles', 'Tiles'), tab('structures', 'Structures'), tab('placements', 'Placements'));

  cmds.push(
    { id: 'file.new', title: 'New zone…', group: 'File', icon: 'docnew', run: d.newZone },
    { id: 'file.open', title: 'Open…', group: 'File', keyLabel: '⌘O', icon: 'folder', run: d.open },
    { id: 'file.save', title: 'Save to server', group: 'File', keyLabel: '⌘S', icon: 'save', hint: 'Hot-swaps into the running world', run: d.save },
    { id: 'file.validate', title: 'Validate', group: 'File', icon: 'check', hint: 'Run the zone laws without saving', run: d.validate },
    { id: 'file.import', title: 'Import local file…', group: 'File', icon: 'importin', run: d.importFile },
    { id: 'file.export', title: 'Export as JSON', group: 'File', icon: 'exportout', run: d.exportFile },
    { id: 'file.props', title: 'Zone properties…', group: 'File', mode: 'zone', hint: 'Id, name, origin, size, growth', run: d.zoneProperties },
    { id: 'file.prefab', title: 'Save selection as prefab…', group: 'File', mode: 'zone', run: d.saveSelectionAsPrefab },

    { id: 'edit.undo', title: 'Undo', group: 'Edit', keyLabel: '⌘Z', run: d.undo },
    { id: 'edit.redo', title: 'Redo', group: 'Edit', keyLabel: '⇧⌘Z', run: d.redo },

    { id: 'view.zoomin', title: 'Zoom in', group: 'View', run: d.zoomIn },
    { id: 'view.zoomout', title: 'Zoom out', group: 'View', run: d.zoomOut },
    { id: 'view.fit', title: 'Fit in view', group: 'View', keyLabel: '0', run: d.zoomFit },
    { id: 'view.actual', title: 'Zoom to 100%', group: 'View', run: d.zoomActual },
    { id: 'view.grid', title: 'Toggle tile grid', group: 'View', mode: 'zone', run: () => d.toggleView('showGrid') },
    { id: 'view.chunks', title: 'Toggle chunk grid', group: 'View', mode: 'zone', run: () => d.toggleView('showChunkGrid') },
    { id: 'view.markers', title: 'Toggle placement markers', group: 'View', mode: 'zone', run: () => d.toggleView('showMarkers') },
    { id: 'view.elev', title: 'Toggle elevation lens', group: 'View', mode: 'zone', run: () => d.toggleView('showElev') },
    { id: 'view.minimap', title: 'Toggle minimap', group: 'View', run: () => d.toggleInstrument('minimap') },
    { id: 'view.zoomcluster', title: 'Toggle zoom instrument', group: 'View', run: () => d.toggleInstrument('zoom') },
    { id: 'view.dock.tool', title: 'Collapse/expand Tool panel', group: 'View', run: () => d.toggleDockPanel('tool') },
    { id: 'view.dock.lib', title: 'Collapse/expand Library panel', group: 'View', run: () => d.toggleDockPanel('lib') },

    { id: 'go.world', title: 'Go to World view', group: 'Go', keyLabel: 'W', mode: 'zone', icon: 'world', run: () => d.setMode('world') },
    { id: 'go.zone', title: 'Go to Zone view', group: 'Go', keyLabel: 'Z', mode: 'world', run: () => d.setMode('zone') },
    { id: 'go.cms', title: 'Open Content Studio', group: 'Go', hint: 'Bestiary, loot, actors, dialogue', run: d.openContentStudio },
    { id: 'help', title: 'Help — shortcuts and how saves work', group: 'Help', icon: 'help', run: d.help },
  );

  return cmds;
}
