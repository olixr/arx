import { EntityKind, FENCE_TILES, GARRISON_TILES, HIDDEN_SKILLS, PoseState, ROCK_TILES, TICK_MS, TREE_TILES, Tile, WALL_RUN_TILES, chestInfo, dangerAt, diagWallInfo, diagWallTile, doorInfo, isSkillId, levelForXp, tileDef, treeOfSapling } from '@arx/shared';
import { BUILDABLES, RECIPES, buildableForTile, buildableGround, itemDef, npcDef } from '@arx/content';
import { ClientGame } from './game/clientGame.js';
import { InputManager } from './input/inputManager.js';
import { bindings, type ActionId } from './input/bindings.js';
import { installControlsMenu } from './ui/controlsMenu.js';
import { Renderer } from './render/renderer.js';
import type { SmashKind } from './render/debris.js';
import { ChatUI } from './ui/chat.js';
import { Hotbar } from './ui/hotbar.js';
import { Panels, SKILL_FACE } from './ui/panels.js';
import { showLevelUp } from './ui/levelToast.js';
import { StationPanels, craftStationFace } from './ui/stationPanels.js';
import { CraftHud } from './ui/craftHud.js';
import { BuildTray } from './ui/buildTray.js';
import { UiNav } from './ui/padUI.js';
import { LootPanel } from './ui/lootPanel.js';
import { SocialPanel } from './ui/socialPanel.js';
import { MapScreen } from './ui/map/mapScreen.js';
import { MapOverlay } from './ui/map/mapOverlay.js';
import { WaypointHud } from './ui/waypointHud.js';
import { PartyHud } from './ui/partyHud.js';
import { showDiscovery } from './ui/discoveryBanner.js';
import { QuestLog } from './ui/questLog.js';
import { RepScreen } from './ui/repScreen.js';
import { showRepBanner } from './ui/repBanner.js';
import { ObjectiveTracker } from './ui/objectiveTracker.js';
import { showQuestBanner } from './ui/questBanner.js';
import { RiftgatePanel } from './ui/riftgate.js';
import { showDungeonEntry } from './ui/dungeonBanner.js';
import { Sfx } from './audio/sfx.js';
import { AudioEngine } from './audio/engine.js';
import { TrackPlayer } from './audio/tracks.js';
import { AmbienceSystem } from './audio/ambience.js';
import { VoicePlayer } from './audio/voice.js';
import { AudioMenu } from './ui/audioMenu.js';
import { UNDERGROUND_Y, zoneWeights } from './audio/zones.js';
import { scanFallEar, SILENT_EAR, type FallEar } from './audio/falls.js';
import { setupTouch } from './input/touch.js';
import { dockGlyphUrl, itemIconUrl, uiIconUrl } from './render/icons.js';
import { abilityIconUrl } from './render/abilityIcons.js';
import { fxStyleFor } from './render/abilityFx.js';
import { PORTAL_BURST_COLORS } from './render/portal.js';
import { installChrome } from './ui/chrome.js';
import { dressPanel } from './ui/panel.js';
import { SignHud } from './ui/signs.js';
import { LookCreator } from './ui/lookCreator.js';
import { DialogueCinema } from './ui/dialogueCinema.js';

// Paint the HUD's chrome (the flat chamfered frame) before any panel
// shows — the stylesheet reads it from CSS custom properties.
installChrome();

// Dev audit surface: `?icons` overlays the full icon gallery. The game
// boots underneath untouched; the overlay simply outranks it.
if (new URLSearchParams(location.search).has('icons')) {
  const { showIconGallery } = await import('./editor/iconGallery.js');
  showIconGallery();
}

// Painted UI glyphs — no emoji anywhere in the universe. The dock
// wears the quiet console's monoline sigils; each button carries a
// device-aware shortcut badge read LIVE from the one keymap, so a
// rebind in Controls redraws every badge at once.
const DOCK_BUTTONS = [
  ['btn-inventory', 'pack', 'Pack', 'screenPack'],
  ['btn-skills', 'skills', 'Skills', 'screenSkills'],
  ['btn-arts', 'arts', 'Techniques', 'screenArts'],
  ['btn-craft', 'handiwork', 'Handiwork', 'screenCraft'],
  ['btn-build', 'build', 'Build', 'screenBuild'],
  ['btn-social', 'social', 'Social', 'screenSocial'],
  ['btn-quests', 'quest', 'Journal', 'screenQuests'],
  ['btn-rep', 'rep', 'Standing', 'screenRep'],
  ['btn-map', 'map', 'Map', 'screenMap'],
  ['btn-audio', 'sound', 'Settings', 'screenSettings'],
] as const;

function renderDockBadges(): void {
  for (const [id, , tip, action] of DOCK_BUTTONS) {
    const btn = document.getElementById(id);
    const badge = document.querySelector<HTMLElement>(`#${id} .dock-badge`);
    if (!btn || !badge) continue;
    badge.innerHTML = '';
    const kbKey = bindings.kbBadge(action);
    btn.title = kbKey ? `${tip} (${kbKey})` : tip;
    if (kbKey) {
      const kb = document.createElement('span');
      kb.className = 'kb-glyph small';
      kb.textContent = kbKey;
      badge.appendChild(kb);
    }
    const padG = bindings.padBadge(action);
    if (padG) {
      const pad = document.createElement('span');
      pad.className = `pad-glyph ${padG.cls}`;
      pad.textContent = padG.text;
      badge.appendChild(pad);
    }
  }
}

for (const [id, kind, tip] of [
  ...DOCK_BUTTONS.map(([i, k, t]) => [i, k, t] as const),
  ['touch-attack', 'attack', ''] as const,
]) {
  const btn = document.getElementById(id);
  if (btn) {
    const img = document.createElement('img');
    img.src = dockGlyphUrl(kind, id === 'touch-attack' ? 48 : 30);
    img.draggable = false;
    btn.appendChild(img);
    if (tip) {
      btn.dataset.nav = '';
      btn.dataset.navkey = `dock:${id}`;
      btn.dataset.tipname = tip;
      btn.dataset.acta = 'Open';
      const badge = document.createElement('span');
      badge.className = 'dock-badge';
      btn.appendChild(badge);
    }
  }
}
renderDockBadges();
bindings.onChange(renderDockBadges);

const audioEngine = new AudioEngine();
const sfx = new Sfx(audioEngine);
const music = new TrackPlayer(audioEngine);
const ambience = new AmbienceSystem(audioEngine);
const voice = new VoicePlayer(audioEngine);
const audioMenu = new AudioMenu(audioEngine, music);
window.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
window.addEventListener('keydown', () => sfx.unlock(), { once: true });

const canvas = document.getElementById('game') as HTMLCanvasElement;
const loginOverlay = document.getElementById('login')!;
const loginForm = document.getElementById('login-form') as HTMLFormElement;
const loginUser = document.getElementById('login-user') as HTMLInputElement;
const loginPass = document.getElementById('login-pass') as HTMLInputElement;
const loginCharName = document.getElementById('login-charname') as HTMLInputElement;
const loginInvite = document.getElementById('login-invite') as HTMLInputElement;
const loginSubmit = document.getElementById('login-submit') as HTMLButtonElement;
const loginToggle = document.getElementById('login-toggle') as HTMLButtonElement;
const loginError = document.getElementById('login-error')!;
const loginStatus = document.getElementById('login-status')!;
const hud = document.getElementById('hud')!;
const debugEl = document.getElementById('debug')!;

let registerMode = false;
let authReady = false;

const input = new InputManager(canvas);
const renderer = new Renderer(canvas);

// Player zoom: restore the saved framing, then persist every change.
// 1 = the classic distance; zooming in is the intimate mode (bigger,
// more readable targets), a slight zoom-out widens the field.
const storedZoom = parseFloat(localStorage.getItem('arx.zoom') ?? '');
if (Number.isFinite(storedZoom)) {
  renderer.camera.setZoom(storedZoom);
  renderer.camera.zoom = renderer.camera.targetZoom;
}
const saveZoom = (): void =>
  localStorage.setItem('arx.zoom', renderer.camera.targetZoom.toFixed(3));

// Mouse wheel: smooth, exponential — equal scroll = equal feel at any
// depth. In build mode with a corner piece picked, the wheel turns the
// piece instead (the genre's own grammar); everything else still zooms.
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    if (buildMode && orientRing()) {
      cycleBuildOrient(e.deltaY > 0 ? 1 : -1);
      return;
    }
    renderer.camera.stepZoom(Math.exp(-e.deltaY * 0.0012));
    saveZoom();
  },
  { passive: false },
);

/** Pad zoom presets, cycled by d-pad ◀: Standard → Near → Close → Wide. */
const ZOOM_PRESETS = [1, 1.4, 1.8, 0.87];
function cycleZoom(): void {
  const cur = renderer.camera.targetZoom;
  let next = ZOOM_PRESETS[0]!;
  for (let i = 0; i < ZOOM_PRESETS.length; i++) {
    if (Math.abs(ZOOM_PRESETS[i]! - cur) < 0.01) {
      next = ZOOM_PRESETS[(i + 1) % ZOOM_PRESETS.length]!;
      break;
    }
  }
  renderer.camera.setZoom(next);
  saveZoom();
}

const chat = new ChatUI(
  (text) => {
    // Client-side commands: render preferences never touch the server.
    if (text.trim().toLowerCase() === '/outline') {
      renderer.outlineOn = !renderer.outlineOn;
      localStorage.setItem('arx.outline', renderer.outlineOn ? 'on' : 'off');
      chat.addLine({
        channel: 'system',
        text: renderer.outlineOn ? 'Outlines on.' : 'Outlines off — pure flat.',
      });
      return;
    }
    game.sendChat(text);
  },
  () => !hud.classList.contains('hidden'),
);
renderer.outlineOn = localStorage.getItem('arx.outline') !== 'off';

// Water enhancements: ADDITIVE layers over the base water, so turning
// one off only quiets the surface — nothing else changes. Persisted
// like every other render preference, toggled in the menu's Display
// section for anyone chasing frames.
renderer.reflectionsOn = localStorage.getItem('arx.reflections') !== 'off';
renderer.waterFxFull = localStorage.getItem('arx.waterfx') !== 'basic';
{
  const rows = document.getElementById('display-rows')!;
  const toggle = (label: string, initial: boolean, apply: (on: boolean) => void): void => {
    const row = document.createElement('div');
    row.className = 'audio-row';
    const lab = document.createElement('label');
    lab.textContent = label;
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = initial;
    // The pad walks the display toggles like everything else: Ⓐ flips.
    box.dataset.nav = '';
    box.dataset.navkey = `display:${label}`;
    box.dataset.acta = 'Toggle';
    box.dataset.tipname = label;
    box.addEventListener('change', () => apply(box.checked));
    row.appendChild(lab);
    row.appendChild(box);
    rows.appendChild(row);
  };
  toggle('Water reflections', renderer.reflectionsOn, (on) => {
    renderer.reflectionsOn = on;
    localStorage.setItem('arx.reflections', on ? 'on' : 'off');
  });
  toggle('Water motion', renderer.waterFxFull, (on) => {
    renderer.waterFxFull = on;
    localStorage.setItem('arx.waterfx', on ? 'full' : 'basic');
  });
}
input.setTypingCheck(() => chat.isTyping || looks.open || socialPanel.isTyping || signHud.isTyping);
let buildMode: string | null = null;
/** THE TRUE GHOST's dial: the chosen mass for an orientable corner. */
let buildOrient: 'auto' | 'NE' | 'NW' | 'SE' | 'SW' = 'auto';
/** The drag-run: tiles waiting their turn, drained one action at a time. */
const buildQueue: Array<{ tx: number; ty: number }> = [];
let buildDragging = false;
/** A build/demolish click awaiting the server's answer — correlates the next action-start. */
let sentSite: { tx: number; ty: number; at: number } | null = null;
/** The site the server accepted and is ticking down right now. */
let activeSite: { tx: number; ty: number } | null = null;

const WALL_ORIENTS = ['auto', 'NE', 'NW', 'SE', 'SW'] as const;
const FENCE_ORIENTS = ['auto', 'NE', 'NW'] as const;

/** Which dial a piece owns: 4-stop corners, 2-stop fence rails, or none. */
function orientRing(): readonly ('auto' | 'NE' | 'NW' | 'SE' | 'SW')[] | null {
  const def = buildMode ? BUILDABLES.get(buildMode) : undefined;
  if (!def) return null;
  if (diagWallInfo(def.tile)) return WALL_ORIENTS;
  if (def.tile === Tile.FenceDiagNE) return FENCE_ORIENTS;
  return null;
}

function cycleBuildOrient(step: 1 | -1): void {
  const ring = orientRing();
  if (!ring) return;
  const at = ring.indexOf(buildOrient);
  buildOrient = ring[(at + step + ring.length) % ring.length]!;
  sfx.uiTap();
}

/** The last pieces worked with — the tray's one-click switch row. */
const buildRecents: string[] = [];

/** Enter build mode holding `id` — from the palette or the tray. */
function pickBuildable(id: string): void {
  const firstEntry = buildMode === null;
  buildMode = id;
  buildOrient = 'auto';
  buildQueue.length = 0;
  const at = buildRecents.indexOf(id);
  if (at >= 0) buildRecents.splice(at, 1);
  buildRecents.unshift(id);
  if (buildRecents.length > 6) buildRecents.length = 6;
  stationPanels.closeAll();
  game.ownBuiltRequest();
  if (!firstEntry) return; // switching pieces needs no re-teaching
  const turnable = orientRing() !== null;
  chat.addLine({
    channel: 'system',
    text:
      nav.mode === 'pad'
        ? `Steer the ghost with the right stick — Ⓐ place, ${turnable ? 'Ⓧ turn, ' : ''}Ⓨ demolish, Ⓑ done.`
        : `Click places — hold and drag to lay a run. ${bindings.kbBadge('sit') || 'X'}+click tears down${turnable ? `, the wheel (or ${bindings.kbBadge('buildRotate') || 'Y'}) turns the corner` : ''}. Esc to stop.`,
  });
}

/** Queue a tile for the run (deduped) — the frame pump drains it. */
function enqueueBuild(tx: number, ty: number): void {
  if (buildQueue.some((q) => q.tx === tx && q.ty === ty)) return;
  if (activeSite && activeSite.tx === tx && activeSite.ty === ty) return;
  buildQueue.push({ tx, ty });
}

/**
 * One placement in flight at a time: send the next queued tile when
 * the hands are free. A tile that stopped being placeable since it
 * was painted is skipped without a word — the run flows around it.
 */
function pumpBuildQueue(): void {
  if (!buildMode || game.ownEid === null) return;
  if (game.action) return;
  const now = performance.now();
  if (sentSite && now - sentSite.at < 600) return;
  const def = BUILDABLES.get(buildMode);
  if (!def) return;
  const own = game.predictor.pos;
  while (buildQueue.length > 0) {
    const next = buildQueue.shift()!;
    const dx = next.tx + 0.5 - own.x;
    const dy = next.ty + 0.5 - own.y;
    const d2 = dx * dx + dy * dy;
    const ground = game.world.groundAt(next.tx, next.ty);
    if (
      d2 > 9 ||
      d2 < 0.64 ||
      ground === undefined ||
      !buildableGround(def).includes(ground as Tile)
    ) {
      continue;
    }
    sentSite = { tx: next.tx, ty: next.ty, at: now };
    sfx.uiTap();
    game.buildSend(buildMode, next.tx, next.ty, buildOrient === 'auto' ? undefined : buildOrient);
    return;
  }
}
/** The bank chest tile that asked the server for the vault — anchors the panel. */
let lastBankAnchor: { tx: number; ty: number } | null = null;

/** Interact-prompt verbs by target kind / station type. */
const PROMPT_LABELS: Record<string, string> = {
  node: 'Gather',
  loot: 'Pick up',
  bank: 'Open Bank',
  chest: 'Open Chest',
  shop: 'Browse Wares',
  portal: 'Enter',
  fire: 'Cook',
  furnace: 'Smelt',
  anvil: 'Smith',
  workbench: 'Craft',
  alembic: 'Brew',
  sawhorse: 'Saw',
  plot: 'Plant',
  seat: 'Sit',
  bed: 'Rest',
  sign: 'Read Sign',
};

const buildTray = new BuildTray((id) => pickBuildable(id));

const stationPanels = new StationPanels(
  (recipe, qty) => game.craft(recipe, qty),
  (op, item, qty, gearId) => {
    // Withdrawals thunk out of the chest; deposits cue at their senders.
    if (op === 'withdraw') sfx.stow();
    game.bankSend(op, item, qty, undefined, gearId);
  },
  (op, item, qty, shop) => {
    sfx.coins();
    game.shopSend(op, item, qty, undefined, shop);
  },
  (buildable) => pickBuildable(buildable),
  // The live pack — every maker panel's have/need chips read it.
  () => game.inventory,
);

stationPanels.onPlant = (tx, ty, seed) => {
  sfx.plantSeed();
  game.plantSend(tx, ty, seed);
};

// THE WORK CARD: starting a craft closes the Workshop and this card
// speaks for the batch from above the hotbar — item bar, batch tally,
// and the end ceremony. Stop chip, Esc, and walking all set it down.
const craftHud = new CraftHud(() => game.craftStop());
stationPanels.onCraftStop = () => game.craftStop();
stationPanels.getAction = () => game.action;

/** The sound a pack item makes when USED — equip clasp or a bite. */
function useSlotSound(itemId: string): void {
  const def = itemDef(itemId);
  if (def?.equipSlot) sfx.equipGear();
  else if (def?.heals) sfx.eat();
  else sfx.uiTap();
}

const panels = new Panels(
  (slot) => {
    // Pack clicks are contextual: deposit while banking, sell in a shop,
    // otherwise use/equip/eat.
    const item = game.inventory[slot];
    if (!item) return;
    if (stationPanels.bankOpen) {
      sfx.stow();
      game.bankSend('deposit', item.item, item.qty, slot);
    } else if (stationPanels.shopOpen) {
      sfx.coins();
      game.shopSend('sell', item.item, 1, slot);
    } else {
      useSlotSound(item.item);
      game.useSlot(slot);
    }
  },
  (slot) => {
    sfx.unequipGear();
    game.unequip(slot);
  },
  (ability) => game.sendTechnique(ability),
  (from, to) => {
    sfx.stow();
    game.invMove(from, to);
  },
  (slot) => dropSlot(slot),
  // Explicit verbs from the item context menu — no station guessing.
  (slot, action) => {
    const item = game.inventory[slot];
    if (!item) return;
    if (action === 'drop') dropSlot(slot);
    else if (action === 'deposit') {
      sfx.stow();
      game.bankSend('deposit', item.item, item.qty, slot);
    } else if (action === 'sell') {
      sfx.coins();
      game.shopSend('sell', item.item, 1, slot);
    } else {
      useSlotSound(item.item);
      game.useSlot(slot);
    }
  },
  () => (stationPanels.bankOpen ? 'bank' : stationPanels.shopOpen ? 'shop' : null),
  (): 'kb' | 'pad' => nav.mode,
  (hand) => (hand === 'off' ? game.carryOff : game.carryStyle),
  (style, hand) => game.setCarryStyle(style, hand),
  () => ({ name: game.ownName }),
  () => toggleScreen('arts'),
  (calling, on) => game.sendCalling(calling, on),
);

/** Drop a whole pack slot onto the ground (drag-out / pad Ⓨ). */
function dropSlot(slot: number): void {
  const item = game.inventory[slot];
  if (!item) return;
  sfx.dropThud();
  game.dropSend(slot, item.qty);
}

// Gamepad-first UI navigation: focus ring, action strip, tooltips, and
// the world interact prompt all live here.
const nav = new UiNav(input, {
  onInvMove: (from, to) => game.invMove(from, to),
  onDropToWorld: (slot) => dropSlot(slot),
  onInspect: (el): boolean => panels.showCardFor(el),
  onItemMenu: (el): void => {
    panels.openMenuFor(el);
  },
  closeItemMenu: (): boolean => panels.closeMenu(),
  // Ⓑ closes EVERYTHING Esc closes — the two backstops must agree.
  onCloseAll: () => closeAllUi(),
  onScreenAction: (id) => screenAction(id),
  onCycleScreen: (dir) => cycleScreen(dir),
  packActionLabel: () =>
    stationPanels.bankOpen ? 'Deposit' : stationPanels.shopOpen ? 'Sell' : null,
  onFocusMove: () => sfx.uiTick(),
});

// The Controls table in Settings: every binding shown, every binding
// rebindable, conflicts resolved by stealing (and saying so).
installControlsMenu({
  nav,
  input,
  notice: (text) => chat.addLine({ channel: 'system', text }),
});

// One delegated hover path drives item inspection for the mouse: item
// cells raise the full detail card, everything else the small tooltip.
document.addEventListener('pointerover', (e) => {
  if (nav.mode === 'pad') return; // pad focus owns the card there
  const target = e.target as HTMLElement | null;
  const itemCell = target?.closest?.(
    '[data-invslot][data-filled], [data-equipslot][data-filled], [data-lootitem]',
  );
  if (itemCell && panels.showCardFor(itemCell as HTMLElement)) {
    nav.hideTooltip();
    return;
  }
  panels.hideCard();
  const el = target?.closest?.('[data-tipname]');
  if (el) nav.showTooltipFor(el as HTMLElement);
  else nav.hideTooltip();
});

// ---- the one screen law: ONE screen owns the stage at a time --------
// Opening any screen closes every other; the sole exception is the
// deliberate bank/shop + pack pairing, composed in activateTarget and
// onBank. (Function declarations — hoisted, safe to hand to UiNav.)

function closeAllUi(): void {
  stationPanels.closeAll();
  panels.closeAll();
  lootPanel.close();
  riftgate.close();
  audioMenu.close();
  socialPanel.close();
  mapScreen.close();
  questLog.close();
  repScreen.close();
  signHud.close();
}

function toggleScreen(
  which: 'inv' | 'skills' | 'arts' | 'craft' | 'build' | 'audio' | 'loot' | 'social' | 'map' | 'quests' | 'rep',
): void {
  // A conversation owns the stage: no screen may open over it, from
  // any device — hotkeys, dock clicks, and pad shortcuts all pass
  // through this one gate.
  if (cinema.open) return;
  const wasOpen =
    which === 'inv'
      ? panels.invOpen
      : which === 'skills'
        ? panels.skillsOpen
        : which === 'arts'
          ? panels.artsOpen
          : which === 'craft'
            ? stationPanels.craftOpen
            : which === 'build'
              ? stationPanels.buildOpen
              : which === 'audio'
                ? audioMenu.isOpen
                : which === 'social'
                  ? socialPanel.isOpen
                  : which === 'map'
                    ? mapScreen.isOpen
                    : which === 'quests'
                      ? questLog.isOpen
                      : which === 'rep'
                        ? repScreen.isOpen
                        : lootPanel.isOpen;
  closeAllUi();
  if (wasOpen) return;
  switch (which) {
    case 'inv':
      panels.showInventory();
      break;
    case 'skills':
      panels.showSkills();
      break;
    case 'arts':
      panels.showArts();
      break;
    case 'craft':
      stationPanels.openCraft(null, game.skills, game.knownRecipes);
      break;
    case 'build':
      stationPanels.openBuild(game.skills, buildMode);
      break;
    case 'audio':
      audioMenu.open();
      break;
    case 'social':
      socialPanel.open();
      break;
    case 'map':
      mapScreen.open();
      break;
    case 'quests':
      questLog.open();
      break;
    case 'rep':
      document.getElementById('btn-rep')?.classList.remove('has-new');
      repScreen.open();
      break;
    case 'loot':
      if (game.nearbyLoot(2.4).length > 0) lootPanel.open();
      break;
  }
}

/**
 * The shelf of screens, in bumper order — LB/RB walk it while any
 * screen is open, so every screen is pad-reachable from any other.
 */
const SCREEN_ORDER = [
  'inv',
  'skills',
  'arts',
  'craft',
  'build',
  'social',
  'quests',
  'rep',
  'map',
  'audio',
] as const;

function currentScreen(): (typeof SCREEN_ORDER)[number] | null {
  if (panels.invOpen) return 'inv';
  if (panels.skillsOpen) return 'skills';
  if (panels.artsOpen) return 'arts';
  if (stationPanels.craftOpen) return 'craft';
  if (stationPanels.buildOpen) return 'build';
  if (socialPanel.isOpen) return 'social';
  if (questLog.isOpen) return 'quests';
  if (repScreen.isOpen) return 'rep';
  if (mapScreen.isOpen) return 'map';
  if (audioMenu.isOpen) return 'audio';
  return null;
}

function cycleScreen(dir: -1 | 1): void {
  if (cinema.open) return;
  const cur = currentScreen();
  const idx = cur === null ? (dir === 1 ? -1 : 0) : SCREEN_ORDER.indexOf(cur);
  const next = SCREEN_ORDER[(idx + dir + SCREEN_ORDER.length) % SCREEN_ORDER.length]!;
  if (next === cur) return;
  closeAllUi();
  toggleScreen(next);
}

/** One rebindable screen shortcut fired — keyboard key or pad button. */
function screenAction(id: ActionId): void {
  if (id === 'mapGlass') {
    if (!cinema.open) mapOverlay.toggle();
    return;
  }
  const SCREEN_FOR: Partial<Record<ActionId, Parameters<typeof toggleScreen>[0]>> = {
    screenPack: 'inv',
    screenSkills: 'skills',
    screenArts: 'arts',
    screenCraft: 'craft',
    screenBuild: 'build',
    screenSocial: 'social',
    screenMap: 'map',
    screenQuests: 'quests',
    screenRep: 'rep',
    screenSettings: 'audio',
    screenLoot: 'loot',
  };
  const which = SCREEN_FOR[id];
  if (which) toggleScreen(which);
}

document.getElementById('btn-inventory')!.addEventListener('click', () => toggleScreen('inv'));
document.getElementById('btn-skills')!.addEventListener('click', () => toggleScreen('skills'));
document.getElementById('btn-arts')!.addEventListener('click', () => toggleScreen('arts'));
document.getElementById('btn-craft')!.addEventListener('click', () => toggleScreen('craft'));
document.getElementById('btn-build')!.addEventListener('click', () => toggleScreen('build'));
document.getElementById('btn-audio')!.addEventListener('click', () => toggleScreen('audio'));
document.getElementById('btn-social')!.addEventListener('click', () => toggleScreen('social'));
document.getElementById('btn-map')!.addEventListener('click', () => toggleScreen('map'));
document.getElementById('btn-quests')!.addEventListener('click', () => toggleScreen('quests'));
document.getElementById('btn-rep')!.addEventListener('click', () => toggleScreen('rep'));

function showLoginError(text: string): void {
  loginError.textContent = text;
  loginError.classList.remove('hidden');
  loginStatus.classList.add('hidden');
}

const looks = new LookCreator((look) => {
  game.setLookSend(look);
  chat.addLine({ channel: 'system', text: 'Your look is set. Welcome to the world.' });
});

// The dialogue cinema: server-driven like the vault, cinematic like
// the level ceremony. Its hooks call into `game` lazily — both close
// over the const declared just below.
const cinema = new DialogueCinema(sfx, {
  onAdvance: () => game.dialogueAdvance(),
  onChoose: (idx) => game.dialogueChoose(idx),
  onEnd: () => game.dialogueEnd(),
  onGift: () => input.rumble(0.15, 0.35, 130),
  // Skipping a voiced line fades the clip with the text completion.
  onVoiceSkip: () => voice.stopLine(),
});

const game = new ClientGame(input, {
  onChat: (line) => chat.addLine(line),
  onNeedLook: () => looks.show(),
  // The own-built ledger feeds the overlay: glints + armed preview.
  onOwnBuilt: (keys) => renderer.setOwnBuilt(keys),
  // A build/demolish click the server accepted becomes the active
  // site; any other action-start (gather, craft) discards a stale
  // claim. The site aims the pose and wears the progress ring.
  onActionStart: (ticks, craft) => {
    if (sentSite && performance.now() - sentSite.at < 600) {
      activeSite = { tx: sentSite.tx, ty: sentSite.ty };
      renderer.buildSite = { tx: sentSite.tx, ty: sentSite.ty };
    }
    sentSite = null;
    // A craft start (first item or the next in the batch) beats the
    // work card; the reopened Workshop's busy strip follows along.
    if (craft) {
      const recipe = RECIPES.get(craft.recipe);
      if (recipe) {
        const face = craftStationFace(recipe.station ?? null);
        craftHud.beat({
          name: recipe.name,
          icon: recipe.output.item,
          label: face.label,
          accent: face.accent,
          made: craft.made,
          total: craft.total,
          outQty: recipe.output.qty,
          durationMs: ticks * TICK_MS,
        });
      }
      stationPanels.refreshOpen();
    }
  },
  // Work the world refused mid-swing says why instead of going mute.
  // (The completion thump lives on the tile patch itself — one
  // ceremony for builder and bystander alike, spatial, in onTileChange.)
  onActionEnd: (reason, made) => {
    renderer.buildSite = null;
    // The work card wears the end: done, set down, or run dry. The
    // chime belongs to a finished batch only — `made` rides craft
    // stops alone, so gathers and builds never borrow it.
    craftHud.end(reason, made);
    if (reason === 'done' && made !== undefined && made > 0) sfx.workDone();
    if (made !== undefined) stationPanels.refreshOpen();
    if (!activeSite) return;
    activeSite = null;
    if (reason === 'moved') {
      // Walking off abandons the whole run — a deliberate interrupt.
      buildQueue.length = 0;
      return;
    }
    if (reason === 'done') {
      // The ledger moved — keep the overlay honest.
      if (buildMode) game.ownBuiltRequest();
      return;
    }
    const line =
      reason === 'blocked'
        ? 'The footing changed.'
        : reason === 'occupied'
          ? 'Someone is in the way.'
          : reason === 'materials'
            ? 'Out of materials.'
            : null;
    if (line) chat.addLine({ channel: 'system', text: line });
    if (reason === 'materials') buildQueue.length = 0;
  },
  onStatus: (status, detail) => {
    if (status === 'ingame') {
      loginOverlay.classList.add('hidden');
      hud.classList.remove('hidden');
      if (game.sessionToken) localStorage.setItem('arx.token', game.sessionToken);
      if (!localStorage.getItem('arx.tipsShown')) {
        localStorage.setItem('arx.tipsShown', '1');
        const useKey = bindings.kbBadge('interact') || 'F';
        for (const tip of [
          `Move with WASD. Click or press ${useKey} to chop, mine, fish, and use things. ${bindings.kbBadge('ability1') || 'Q'} and ${bindings.kbBadge('ability2') || 'E'} fire your abilities.`,
          `Press ${bindings.kbBadge('screenPack') || 'I'} for your pack — click a tool or weapon to wield it.`,
          `The villagers of Dawnmead know this land. Talk to them (${useKey}) before you take the lane east.`,
        ]) {
          chat.addLine({ channel: 'system', text: `Tip: ${tip}` });
        }
      }
    } else if (status === 'authRequired') {
      // Stored token was missing/expired — show the login form.
      authReady = true;
      loginOverlay.classList.remove('hidden');
      loginStatus.classList.add('hidden');
      localStorage.removeItem('arx.token');
    } else if (status === 'authErr') {
      authReady = true;
      showLoginError(detail ?? 'authentication failed');
    } else if (status === 'rejected') {
      loginOverlay.classList.remove('hidden');
      showLoginError(detail ?? 'connection rejected');
      localStorage.removeItem('arx.token');
    } else if (status === 'reconnecting') {
      chat.addLine({ channel: 'system', text: 'Connection lost — reconnecting…' });
    } else if (status === 'connecting') {
      loginStatus.textContent = 'Connecting…';
      loginStatus.classList.remove('hidden');
    }
  },
  onInventory: (slots) => {
    panels.renderInventory(slots);
    // Keep the open maker panel's have/need chips honest.
    stationPanels.refreshOpen();
    if (game.action) sfx.collect();
  },
  onSkills: (xp) => panels.renderSkills(xp),
  onEquipment: (equipment) => panels.renderEquipment(equipment),
  onHit: (hit) => {
    if (hit.dmg > 0) {
      // Directional spark cone along the blow, plus a crisp impact ring.
      renderer.particles.burst(
        hit.x,
        hit.y - 0.3,
        hit.crit ? 16 : 9,
        hit.crit ? ['#ffd24a', '#fff3d0', '#e8823d'] : ['#e8573d', '#f4efe4', '#e8a33d'],
        { speed: hit.crit ? 4.5 : 3, life: 0.4, dir: hit.isOwn ? undefined : game.aim, spread: 1.3 },
      );
      renderer.addRing(hit.x, hit.y - 0.3, hit.crit ? '#ffd24a' : '#f4efe4', hit.crit ? 0.6 : 0.4);
      if (!hit.isOwn) renderer.hitstop(hit.crit ? 0.09 : 0.045);
    }
    if (hit.isOwn && hit.dmg > 0) {
      // Taking a hit is body feedback, not world audio — always flat.
      renderer.shake(hit.crit ? 10 : 7);
      renderer.flashHurt();
      sfx.hurt();
      input.rumble(0.6, 0.25, 160);
    } else {
      // A blow landing on someone else sounds from where it lands:
      // your own strikes are at arm's reach (full volume), another
      // player's brawl across the field arrives faint.
      const at = { x: hit.x, y: hit.y };
      if (hit.crit) sfx.spatial(at, 'mid', () => sfx.crit());
      else sfx.spatial(at, 'mid', () => sfx.hit());
      // Haptics/camera only when the blow is plausibly yours (close).
      if (sfx.listenerDist(hit.x, hit.y) < 9) {
        if (hit.crit) {
          renderer.shake(4);
          input.rumble(0.7, 0.45, 170);
        } else if (hit.dmg > 0) {
          input.rumble(0.3, 0.45, 80);
        }
      }
    }
  },
  onImpact: (impact) => {
    // The blow's true direction from the server: a tight spark streak
    // and a skewed crack-flash flying the way the hit landed.
    const dir = Math.atan2(impact.ky, impact.kx);
    renderer.particles.burst(
      impact.x,
      impact.y - 0.3,
      impact.crit ? 10 : 6,
      ['#fff3d0', '#f4efe4'],
      { speed: impact.crit ? 5.5 : 4, life: 0.22, dir, spread: 0.4 },
    );
    renderer.addRing(
      impact.x + impact.kx * 0.2,
      impact.y - 0.3 + impact.ky * 0.2,
      'rgba(255, 243, 208, 0.9)',
      impact.crit ? 0.5 : 0.32,
    );
  },
  onDeath: (death) => {
    const def = npcDef(death.defId);
    const color = def?.color ?? '#c9ccd4';
    renderer.particles.burst(death.x, death.y - 0.2, 22, [color, '#f4efe4', '#8a8494'], {
      speed: 3.6,
      life: 0.7,
      gravity: 5,
    });
    renderer.addRing(death.x, death.y - 0.2, color, 0.8);
    // The kill pop sounds from the body; the camera exclamation point
    // (hitstop, zoom kick, rumble) belongs only to kills at your feet.
    sfx.spatial({ x: death.x, y: death.y }, 'mid', () => sfx.kill());
    if (sfx.listenerDist(death.x, death.y) < 10) {
      renderer.hitstop(0.07);
      renderer.zoomPulse();
      input.rumble(0.8, 0.5, 220);
    }
  },
  onBank: (items, gear) => {
    if (stationPanels.bankOpen) stationPanels.refreshBank(items, gear);
    else {
      closeAllUi();
      stationPanels.openBank(items, lastBankAnchor ?? undefined, gear);
      panels.showInventory();
    }
  },
  onRiftgate: (keySlots, partyRuns) => {
    // A server-driven screen, like the vault: through the one gate.
    closeAllUi();
    riftgate.open(keySlots, partyRuns);
  },
  onDialogueOpen: (o) => {
    // A conversation takes the whole stage: every screen closes, the
    // camera leaves the follow, and the input goes quiet — Space
    // turns pages now, it doesn't swing swords.
    closeAllUi();
    buildMode = null;
    buildOrient = 'auto';
    buildQueue.length = 0;
    buildDragging = false;
    renderer.buildGhost = null;
    cinema.show(o);
    renderer.startDialogueCine(o.eid);
    input.cinemaCapture = true;
    document.body.classList.add('in-dialogue'); // the HUD bows out
    // THE SPOKEN LINE: warm every clip this tree can reach before the
    // first voiced beat lands, and take the live duck dials.
    if (o.voiceDials) voice.setDials(o.voiceDials);
    if (o.prefetch) voice.prefetch(o.prefetch);
  },
  onDialogueNode: (n) => {
    // Voice first, then the paced typewriter — the beat that carries
    // no line silences whatever the previous beat left playing. A
    // quip beat (the throat clearing: greet/ack/farewell) layers a
    // small utterance without ducking or pacing anything.
    if (n.voice?.kind === 'line') {
      voice.playLine(n.voice.url, n.voice.durMs);
    } else {
      voice.stopLine();
      if (n.voice) voice.playQuip(n.voice.url);
    }
    cinema.showNode(n);
  },
  onVoiceQuip: (q) => {
    // A bark's spoken breath — spatial from the speaker's spot.
    voice.playQuip(q.url, { x: q.x, y: q.y });
  },
  onDialogueClose: () => {
    voice.stopLine();
    cinema.close();
    renderer.endDialogueCine();
    input.cinemaCapture = false;
    document.body.classList.remove('in-dialogue');
  },
  onShopOpen: (shop, priceMult) => {
    // A trainer opened their wares — same store screen, their shelf.
    closeAllUi();
    stationPanels.openShop(shop, undefined, priceMult);
    panels.showInventory();
  },
  onSignChanged: (tx, ty) => {
    signHud.onSignChanged(tx, ty);
    // The painted board carries ink only when it HAS words — a freshly
    // written sign must repaint now, not wait out the static ring's
    // 240-frame heal.
    const ground = game.world.groundAt(tx, ty);
    if (ground !== undefined) renderer.invalidateProp(tx, ty, ground as Tile);
  },
  onDungeon: (d) => {
    // A toast, not a screen — it overlays like the level-up card.
    showDungeonEntry(d);
  },
  onDiscovery: (d) => {
    // The riftgate's threshold banner is the dungeon kind's ceremony —
    // the gate still pins itself on the chart silently.
    if (d.kind === 'dungeon') return;
    showDiscovery(d);
    sfx.discovery();
    const pos = game.predictor.pos;
    renderer.addRing(pos.x, pos.y, '#f2c94c', 1.3);
    renderer.zoomPulse(0.035);
    chat.addLine({ channel: 'system', text: `Discovered: ${d.name} — marked on your chart (M).` });
  },
  onQuestEvent: (e) => {
    // The five beats: banner + call + a ring at your feet (completion
    // only) + one honest chat line naming the hotkey. Ceremony fires
    // ONLY here — quiet questupd patches never celebrate.
    showQuestBanner(e.kind, e.name, e.rewards);
    if (e.kind === 'accepted') {
      sfx.questAccepted();
      chat.addLine({ channel: 'system', text: `Quest accepted: ${e.name} — it's in your journal (J).` });
    } else {
      sfx.questComplete();
      const pos = game.predictor.pos;
      renderer.addRing(pos.x, pos.y, '#f2c94c', 1.3);
      input.rumble(0.2, 0.4, 160);
      chat.addLine({ channel: 'system', text: `Quest complete: ${e.name}.` });
    }
  },
  onQuestsChanged: () => {
    questLog.refresh();
    // The dock glint: a quest stands ready to turn in.
    const ready = [...game.quests.values()].some((q) => q.status === 'ready');
    document.getElementById('btn-quests')?.classList.toggle('has-new', ready);
  },
  onRepEvent: (e) => {
    // A band crossing — the ONLY standing ceremony (quiet repupd
    // patches never celebrate; the server already spoke the delta).
    showRepBanner(e.name, e.band, e.rose);
    chat.addLine({
      channel: 'system',
      text: e.rose
        ? `Your name ${e.band === 'neutral' ? 'settles' : 'rises'} with ${e.name} — ${e.band}.`
        : `Your name falls with ${e.name} — ${e.band}.`,
    });
    if (e.rose) sfx.questAccepted();
    else sfx.uiClose();
    document.getElementById('btn-rep')?.classList.add('has-new');
  },
  onRepChanged: () => repScreen.refresh(),
  onSocial: (snap) => socialPanel.onSnapshot(snap),
  onFriendSearch: (results) => socialPanel.onSearchResults(results),
  onFriendEvent: (ev) => {
    // Announce what the receiver should act on or feel; declines and
    // removals pass silently — the ledger simply reflects them.
    if (ev.kind === 'request') {
      chat.addLine({ channel: 'system', text: `${ev.name} wants to be your friend — press U.` });
      sfx.uiOpen();
    } else if (ev.kind === 'accepted') {
      chat.addLine({ channel: 'system', text: `You are now friends with ${ev.name}.` });
      sfx.uiOpen();
    } else if (ev.kind === 'online') {
      chat.addLine({ channel: 'system', text: `${ev.name} has come online.` });
    } else if (ev.kind === 'offline') {
      chat.addLine({ channel: 'system', text: `${ev.name} has gone offline.` });
    }
    socialPanel.notifyEvent();
  },
  onParty: () => socialPanel.onPartySnapshot(),
  onPartyEvent: (ev) => {
    // Announce what the receiver should act on or feel. Presence stays
    // quiet here — the friend ledger already calls those; declines pass
    // silently and the outgoing row simply clears.
    if (ev.kind === 'invite') {
      chat.addLine({ channel: 'system', text: `${ev.name} invites you to their party — press U.` });
      sfx.uiOpen();
    } else if (ev.kind === 'joined') {
      chat.addLine({ channel: 'system', text: `${ev.name} joins the party.` });
      sfx.uiOpen();
    } else if (ev.kind === 'left') {
      chat.addLine({ channel: 'system', text: `${ev.name} leaves the party.` });
    } else if (ev.kind === 'kicked') {
      chat.addLine({ channel: 'system', text: 'You have been removed from the party.' });
    } else if (ev.kind === 'disbanded') {
      chat.addLine({ channel: 'system', text: 'The party has disbanded.' });
    } else if (ev.kind === 'delve') {
      chat.addLine({
        channel: 'system',
        text: `${ev.name} has delved into ${ev.detail ?? 'a dungeon'} — any Riftgate can carry you in.`,
      });
      sfx.uiOpen();
    }
    // Membership may have changed even when the panel is shut — the
    // markers need fresh truth, so refetch unconditionally.
    if (ev.kind !== 'online' && ev.kind !== 'offline' && ev.kind !== 'delve') game.requestParty();
    socialPanel.notifyPartyEvent();
  },
  onXp: (msg) => {
    // NO xp floaty: combat kills feed several skills at once and the
    // drips stacked into unreadable mush over the damage numbers (user
    // verdict). The float channel is COMBAT ONLY — damage in and out,
    // statuses, buffs. Skill progress speaks through the skills hall,
    // and a level-up still gets the full ceremony below.
    if (msg.levelledUp) {
      const own = game.predictor.renderPos();
      const face = SKILL_FACE[msg.skill] ?? { icon: 'bread', color: '#e8b64c' };
      const skillName =
        (isSkillId(msg.skill) ? HIDDEN_SKILLS[msg.skill]?.name : undefined) ?? msg.skill;
      // The full reward ceremony: the renderer stages the world show
      // (pillar, rings, fountain — ~5.6s) while the ceremony card
      // slams in up top with the skill's face and the new level.
      chat.addLine({
        channel: 'system',
        text: `⭐ ${msg.skill} level ${msg.level}! Congratulations!`,
      });
      sfx.levelUp();
      renderer.startLevelCeremony(own.x, own.y, face.color);
      showLevelUp({
        name: skillName,
        level: msg.level,
        icon: face.icon,
        color: face.color,
      });
    }
  },
});

// Dev handle: Playwright drives /give and friends through this —
// window.game is stolen by the canvas id, so take a distinct name.
(window as unknown as { dcGame: ClientGame }).dcGame = game;
// Staging handle: the mood/track state, for Playwright verify passes.
(window as unknown as { dcMusic: TrackPlayer }).dcMusic = music;
// Dev/Playwright handle: the renderer beside the game (camera, anims).
(window as unknown as { dcRenderer: Renderer }).dcRenderer = renderer;

// The ground manager: choose from a pile instead of vacuuming it.
const lootPanel = new LootPanel(game);

// The Riftgate's key chooser — opens when the gate answers an interact.
const riftgate = new RiftgatePanel(game);

// The fellowship ledger: nearby players, friends, and requests.
const socialPanel = new SocialPanel(game);
const mapScreen = new MapScreen(game);
const mapOverlay = new MapOverlay(game);
// The chart pans with the left stick while open — UiNav lends it and
// walks the rail chips on the d-pad alone.
nav.claimStick = () => mapScreen.isOpen && nav.mode === 'pad';
const waypointHud = new WaypointHud();
const partyHud = new PartyHud();

// THE JOURNAL and its HUD face: the log screen, and the tracked
// errand's card (tracking is client-local — pure presentation).
const questLog = new QuestLog(game);
const objectiveTracker = new ObjectiveTracker(game, () => questLog.trackedId());

// THE STANDING SCREEN: the name you carry, read back (L).
const repScreen = new RepScreen(game);

// Signage: the approach plaque over every board, and the sheet that
// opens when you stop to read one properly.
const signHud = new SignHud(game);
renderer.signHasText = (tx, ty) => {
  const sign = game.signAt(tx, ty);
  return !!sign && (sign.title !== '' || sign.lines.some((l) => l !== ''));
};

// ---- one anatomy for every panel: icon plaque, title, hint, close ----
const el = (id: string): HTMLElement => document.getElementById(id)!;
dressPanel(el('inventory-panel'), {
  icon: uiIconUrl('backpack', 34),
  hint: 'Drag an item onto the open world to drop it.',
  onClose: () => panels.closeAll(),
});
dressPanel(el('skills-panel'), {
  icon: uiIconUrl('scroll', 34),
  hint: 'Every discipline in one hall — levels, progress, mastery.',
  onClose: () => panels.closeAll(),
});
dressPanel(el('arts-panel'), {
  icon: abilityIconUrl('whirlwind', 34),
  hint: 'Your combat arts, school by school — choose what the R key carries.',
  onClose: () => panels.closeAll(),
});
stationPanels.setCraftDress(
  dressPanel(el('craft-panel'), {
    icon: uiIconUrl('hammer', 34),
    hint: 'Stand at a station for its recipes — Handiwork needs only your hands.',
    onClose: () => stationPanels.closeAll(),
  }),
);
dressPanel(el('build-panel'), {
  icon: uiIconUrl('house', 34),
  hint: 'Pick a blueprint, then choose open ground to raise it.',
  onClose: () => stationPanels.closeAll(),
});
dressPanel(el('bank-panel'), {
  icon: itemIconUrl('coins', 34),
  hint: 'Tap pack items to deposit — choose a socket here to take back.',
  onClose: () => stationPanels.closeAll(),
});
dressPanel(el('shop-panel'), {
  icon: itemIconUrl('flour', 34),
  hint: 'Buy from the shelves — tap your pack items to sell them.',
  onClose: () => stationPanels.closeAll(),
});
dressPanel(el('riftgate-panel'), {
  icon: itemIconUrl('dungeon_key', 34),
  hint: 'Choose a key to turn — the same key always opens the same halls.',
  onClose: () => riftgate.close(),
});
dressPanel(el('sign-panel'), {
  icon: uiIconUrl('signpost', 34),
  hint: 'What the board says — and, on your own, what it will say next.',
  onClose: () => signHud.close(),
});
dressPanel(el('loot-panel'), {
  icon: itemIconUrl('bones', 34),
  hint: 'Everything lying within reach — take what you want.',
  onClose: () => lootPanel.close(),
});
dressPanel(el('audio-panel'), {
  icon: uiIconUrl('bell', 34),
  hint: 'Sound, picture, and controls, dialed to taste — changes stick.',
  onClose: () => audioMenu.close(),
});
dressPanel(el('social-panel'), {
  icon: dockGlyphUrl('social', 34),
  hint: 'See who stands near, ask for friends, and keep your ledger.',
  onClose: () => socialPanel.close(),
});

// Dodge dash feedback: whoosh + a streak of dust kicked out behind.
const hotbar = new Hotbar(input);
hotbar.onReady = () => sfx.abilityReady();
game.onTechniques = () => panels.setTechniques(game.technique, game.earnedArts);
game.onCallings = () => panels.setCallings(game.callings);

// Committing to a cast: sound, hands, and a wind-up ring at the feet.
game.onCastFx = (_slot, ab) => {
  if (ab.shape === 'chain_zap') sfx.chainZap();
  else sfx.art();
  input.rumble(0.35, 0.5, 110);
  const own = game.predictor.renderPos();
  renderer.addRing(own.x, own.y, ab.color, 0.55);
};

// Server combat FX → audio + camera feel, scaled by how close they land
// and by each ability's own punch weight (its visual identity).
game.onFx = (fx) => {
  const own = game.predictor.renderPos();
  const dist = Math.hypot(fx.x - own.x, fx.y - own.y);
  // Every fx sounds from where it lands (THE SPATIAL LAW) — the old
  // hard `dist < N` audio gates are gone; the rolloff curve does the
  // fading and the culling. Camera feel keeps its own close gates.
  const at = { x: fx.x, y: fx.y };
  if (fx.kind === 'rattle') {
    // A locked door refusing: the leaf shudders in its frame and
    // knocks — scenery feedback, no camera punch.
    renderer.addDoorEase(Math.floor(fx.x), Math.floor(fx.y), 'shake');
    sfx.spatial(at, 'near', () => sfx.doorRattle());
    return;
  }
  if (fx.kind === 'horn') {
    // THE RAID HORN: the covetous camp announces itself, far-carrying
    // and placed — you hear which side of the yard it stands on.
    sfx.spatial(at, 'far', () => sfx.warHorn());
    return;
  }
  if (fx.kind === 'demolish') {
    // THE SALVAGE LAW's ceremony: a construction slumping into its own
    // footprint — tones and mass read off the falling tile itself. The
    // patch that erases the piece arrives right behind this fx; the
    // stamp below keeps the follow-up patch from double-celebrating.
    const falling = Number(fx.id ?? '0') as Tile;
    const stone = renderer.demolishBurst(fx.x, fx.y, falling);
    lastDemolishFxAt.set(`${Math.floor(fx.x)},${Math.floor(fx.y)}`, performance.now());
    sfx.spatial(at, 'far', () => sfx.demolishCrash(stone));
    if (dist < 6) renderer.shake(stone ? 3.4 : 2.6);
    if (dist < 2.5) input.rumble(0.32, 0.5, 100);
    return;
  }
  if (fx.kind === 'smash') {
    // A prop taking a blow. radius carries the durability fraction
    // still standing: >0 = a crack (shudder + chips, keep hitting),
    // 0 = the burst — full debris theatre, tile patch right behind.
    const kind = (fx.id ?? 'crate') as SmashKind;
    if (fx.radius > 0) {
      renderer.crackProp(fx.x, fx.y, fx.dir ?? 0, kind);
      sfx.spatial(at, 'near', () => sfx.propCrack());
      if (dist < 2.5) input.rumble(0.18, 0.3, 60);
      return;
    }
    renderer.smashProp(fx.x, fx.y, fx.dir ?? 0, kind);
    sfx.spatial(at, 'far', () => sfx.propSmash(kind === 'barrel'));
    if (dist < 6) renderer.shake(kind === 'table' ? 3.2 : 2.2);
    if (dist < 2.5) input.rumble(0.32, 0.5, 90);
    return;
  }
  const punch = fxStyleFor(fx.id, fx.color).punch;
  if (fx.kind === 'blast') {
    sfx.spatial(at, 'far', () => sfx.blast());
    if (dist < 7) renderer.shake((dist < fx.radius + 0.5 ? 8 : 4) * (0.5 + punch));
  } else if (fx.kind === 'reaction' && fx.text && fx.text !== 'Resist' && !fx.text.startsWith('+')) {
    sfx.spatial(at, 'mid', () => sfx.reaction());
    if (dist < 10) renderer.hitstop(0.055);
    renderer.particles.burst(fx.x, fx.y - 0.3, 18, [fx.color ?? '#f4efe4', '#f4efe4'], {
      speed: 3.2,
      life: 0.5,
    });
  } else if (fx.kind === 'nova') {
    if (dist > 0.9) sfx.spatial(at, 'mid', () => sfx.zap()); // someone else's nova
    if (dist < 7) renderer.shake(5 * (0.4 + punch));
  } else if (fx.kind === 'arc') {
    if (dist > 0.9) sfx.spatial(at, 'near', () => sfx.swing()); // your own cast already sang
  } else if (fx.kind === 'dash') {
    if (dist > 0.9) sfx.spatial(at, 'near', () => sfx.dash());
  } else if (fx.kind === 'bolt') {
    sfx.spatial(at, 'mid', () => sfx.chainZap());
    if (dist < 7) renderer.shake(3.5 * (0.4 + punch));
  } else if (fx.kind === 'beam') {
    sfx.spatial(at, 'mid', () => sfx.beam());
    if (dist < 9) renderer.shake(6 * (0.4 + punch));
  } else if (fx.kind === 'field') {
    sfx.spatial(at, 'mid', () => sfx.ignite());
    if (dist < 7) renderer.shake(3);
  } else if (fx.kind === 'buff') {
    sfx.spatial(at, 'near', () => sfx.empower());
  } else if (fx.kind === 'vanish') {
    // A stealth flip: a soft gray-violet puff where the body was (or
    // reappears) so the interest pop reads as intentional.
    renderer.particles.burst(fx.x, fx.y - 0.5, 9, ['#8a7fae', '#b4aacb', '#5e5678'], {
      speed: 1.2,
      life: 0.7,
      size: 0.12,
      gravity: -1.2,
      drag: 1.4,
      grow: 0.18,
      shape: 'puff',
      fade: '#3c3648',
      wobble: 0.6,
    });
    renderer.particles.burst(fx.x, fx.y - 0.6, 3, ['#b4aacb', '#e8e0f4'], {
      speed: 0.5,
      life: 0.6,
      size: 0.08,
      gravity: -0.4,
      drag: 1.6,
      shape: 'glint',
    });
    renderer.addRing(fx.x, fx.y - 0.3, '#8a7fae', 0.5);
    sfx.spatial(at, 'near', () => sfx.dash());
  }
};

game.onDodgeFx = (x, y, mx, my) => {
  const back = Math.atan2(-my, -mx);
  renderer.particles.burst(x, y, 10, ['#cfd6c4', '#efe3c2', '#a8b096'], {
    speed: 3.2,
    life: 0.35,
    dir: back,
    spread: 0.8,
    gravity: 2,
  });
  renderer.addRing(x, y, '#efe3c2', 0.35);
  sfx.dash();
  input.rumble(0.15, 0.4, 90);
};

/**
 * Tool belt: starting a gather auto-equips the right tool from the
 * pack (axe for trees, pickaxe for rock, rod for fishing) so the swing
 * you see is the tool doing the work.
 */
function autoEquipTool(): void {
  const own = game.predictor.pos;
  // Serve the NEAREST node — a berry bush beside a tree is hand-work,
  // not an excuse to draw the axe (forage nodes want no tool at all).
  let need: string | null = null;
  let bestD = Infinity;
  for (let ty = Math.floor(own.y) - 2; ty <= Math.floor(own.y) + 2; ty++) {
    for (let tx = Math.floor(own.x) - 2; tx <= Math.floor(own.x) + 2; tx++) {
      const t = game.world.groundAt(tx, ty);
      let kind: string | null = null;
      if (t === Tile.Tree || t === Tile.TreeOak || t === Tile.TreeWillow || t === Tile.TreeYew) kind = 'axe';
      else if (t !== undefined && ROCK_TILES.includes(t)) kind = 'pickaxe';
      else if (t === Tile.FishingSpot) kind = 'rod';
      else if (
        t === Tile.BerryBush || t === Tile.FibrePlant || t === Tile.WildSagewort || t === Tile.WildMoonbell
      ) kind = 'hands';
      if (!kind) continue;
      const d = Math.hypot(tx + 0.5 - own.x, ty + 0.5 - own.y);
      if (d < bestD) {
        bestD = d;
        need = kind;
      }
    }
  }
  if (!need || need === 'hands') return;
  const worn = game.equipment.tool ? itemDef(game.equipment.tool.id)?.tool?.type : undefined;
  if (worn === need) return;
  const idx = game.inventory.findIndex((s) => s !== null && itemDef(s.item)?.tool?.type === need);
  if (idx >= 0) game.useSlot(idx);
}

// Each beat of work lands in the hands: chop knocks, pick clinks,
// anvil rings, and the furnace's hot breath. THE SPATIAL LAW: the
// beat sounds from WHERE it strikes — your own swing rings at full
// volume (you're standing on it), the village smith across the square
// rings faint, and past earshot the clang costs nothing. Haptics are
// the own body's privilege only.
renderer.onGatherImpact = (kind, x, y, isOwn) => {
  sfx.spatial({ x, y }, 'mid', () => {
    if (kind === 'rock') sfx.mineClink();
    else if (kind === 'anvil') sfx.anvilClang();
    else if (kind === 'furnace') sfx.furnaceRoar();
    else if (kind === 'forage') sfx.forage();
    else sfx.chop();
  });
  if (!isOwn) return;
  if (kind === 'rock') input.rumble(0.3, 0.38, 70);
  else if (kind === 'anvil') input.rumble(0.34, 0.42, 80);
  else if (kind === 'furnace') input.rumble(0.12, 0.2, 160);
  else if (kind === 'forage') input.rumble(0.06, 0.14, 45);
  else input.rumble(0.22, 0.32, 60);
};

// A felled body landing is its own beat — the dull thump under the
// kill, heard from where the mass actually hits the ground.
renderer.onCorpseThud = (heavy, x, y) => {
  sfx.spatial({ x, y }, 'near', () => sfx.bodyThud(heavy));
  if (sfx.listenerDist(x, y) < 8) {
    input.rumble(heavy ? 0.2 : 0.1, heavy ? 0.28 : 0.16, heavy ? 90 : 55);
  }
};

// Ambient birds: the flush sounds from where the flock stood — a soft
// ripple of wing puffs — and idle chips ride the same emitter. Both
// spatial (a place in the world), unlike the ambience bed's far chorus.
renderer.birds.onFlutter = (x, y) => sfx.spatial({ x, y }, 'near', () => sfx.birdFlutter());
renderer.birds.onChirp = (x, y) => sfx.spatial({ x, y }, 'near', () => sfx.birdChip());

// Other bodies' combat beats: the renderer's pose-transition edge —
// the same one that restarts the swing animation — voices swings and
// casts for everyone who isn't you, sitting where they stand. Your
// own swings sing through the prediction path below (instant, flat).
renderer.onPoseChange = (key, pose, x, y) => {
  if (key === 'own' || key === game.ownEid) return;
  const at = { x, y };
  if (pose === PoseState.Attack) sfx.spatial(at, 'mid', () => sfx.swingCombo(0));
  else if (pose === PoseState.Attack2) sfx.spatial(at, 'mid', () => sfx.swingCombo(1));
  else if (pose === PoseState.Attack3) sfx.spatial(at, 'mid', () => sfx.swingCombo(2));
  else if (pose === PoseState.Cast) sfx.spatial(at, 'mid', () => sfx.zap());
  else if (pose === PoseState.Loose) sfx.spatial(at, 'mid', () => sfx.snapShot());
};

// Footsteps: every humanoid touchdown asks the ground what it's made
// of. Volume rides the gait (idle shuffles are near-silent), sneaking
// is nearly soundless, and other people's steps arrive quiet, panned
// to their side of you, and only from close by.
function stepMaterial(tx: number, ty: number): 'grass' | 'stone' | 'wood' | 'dirt' | 'sand' | 'cave' | 'wet' {
  const g = game.world.groundAt(tx, ty);
  switch (g) {
    case Tile.Grass:
    case Tile.GrassTall:
    case Tile.CropSprout:
    case Tile.CarrotMid:
    case Tile.CarrotRipe:
    case Tile.SagewortMid:
    case Tile.SagewortRipe:
    case Tile.SunflowerMid:
    case Tile.SunflowerRipe:
    case Tile.WheatMid:
    case Tile.WheatRipe:
      return 'grass';
    case Tile.StoneFloor:
    case Tile.Cliff:
    case Tile.Ramp:
      return 'stone';
    case Tile.WoodFloor:
    case Tile.Bridge:
    case Tile.Dock:
      return 'wood';
    case Tile.Sand:
    case Tile.Snow:
      return 'sand';
    case Tile.CaveFloor:
    case Tile.CaveWall:
      return 'cave';
    case Tile.Water:
    case Tile.WaterDeep:
    case Tile.WaterShallow:
    case Tile.Swamp:
      return 'wet';
    default:
      return 'dirt'; // Path, Dirt, Tilled, and anything unmapped
  }
}
renderer.onFootstep = (x, y, speed, isOwn, sneaking) => {
  const mat = stepMaterial(Math.floor(x), Math.floor(y));
  // Kept soft by default (user: footsteps read too loud) — a step is
  // felt underfoot, not announced. Other feet carry a courtesy cut on
  // top of the spatial rolloff so a crowd never drowns your own gait.
  let vol = 0.035 + 0.09 * Math.min(1, speed / 5);
  if (sneaking) vol *= 0.25;
  if (!isOwn) vol *= 0.5;
  sfx.spatial({ x, y }, 'close', () => sfx.footstep(mat, vol));
};

// A body stepping into or out of shallow water — one honest plunk
// from where it plunged.
renderer.onSplash = (x, y) => {
  sfx.spatial({ x, y }, 'close', () => sfx.splash(0.12));
};

// A felled tree topples away from whoever cut it, groans, and lands
// with a thud you can feel.
let lastDoorSfxAt = 0;
/** Demolish-fx stamps by tile key — the follow-up patch reads this so
 *  a LAYER-LAW floor restore doesn't double-celebrate the collapse. */
const lastDemolishFxAt = new Map<string, number>();

game.onTileChange = (tx, ty, prev, next) => {
  // Loot chests: the tile swap IS the state change — the renderer
  // eases the lid over its hinge, and the box breathes out a puff of
  // whatever it has been keeping (dust, must, or money-light).
  const prevChest = prev === undefined ? null : chestInfo(prev);
  const nextChest = chestInfo(next);
  const tileAt = { x: tx + 0.5, y: ty + 0.5 };
  if (prevChest && nextChest && !prevChest.open && nextChest.open) {
    renderer.addChestEase(tx, ty, 'open');
    sfx.spatial(tileAt, 'near', () => sfx.chestOpen());
    const motes: Record<string, string[]> = {
      wood: ['#c9a76a', '#8a6534', '#e0d4b8'],
      iron: ['#8f96a3', '#5e5560', '#c9c4cf'],
      gilded: ['#ffd06e', '#f2e0a0', '#d9a441'],
      mossy: ['#7fae62', '#a4c98a', '#5c6b46'],
      boss: ['#ff8a3c', '#6e6879', '#e0d6c2'],
    };
    renderer.particles.burst(tx + 0.5, ty + 0.35, 9, motes[nextChest.kind]!, {
      speed: 0.7,
      life: 0.9,
      size: 0.05,
      up: true,
      gravity: 1.4,
      drag: 1.6,
      spread: 2.2,
    });
    return;
  }
  if (prevChest && nextChest && prevChest.open && !nextChest.open) {
    // The respawn queue shutting a forgotten lid — soft, no fanfare.
    renderer.addChestEase(tx, ty, 'close');
    sfx.spatial(tileAt, 'near', () => sfx.chestClose());
    return;
  }
  // Doors: the tile swap IS the state change, same law as chests. A
  // wide run patches every member tile — the ease lands on each (the
  // renderer reads the run anchor's) and the sound debounces to one.
  const prevDoor = prev === undefined ? null : doorInfo(prev);
  const nextDoor = doorInfo(next);
  if (prevDoor && nextDoor && prevDoor.open !== nextDoor.open) {
    renderer.addDoorEase(tx, ty, nextDoor.open ? 'open' : 'close');
    const now = performance.now();
    if (now - lastDoorSfxAt > 80) {
      lastDoorSfxAt = now;
      sfx.spatial(tileAt, 'near', () => {
        if (nextDoor.open) sfx.doorOpen();
        else sfx.doorClose();
      });
    }
    return;
  }
  // A construction landing: the piece arrives under a soft dust knock
  // in its own tones — the shared ceremony, seen and heard by anyone
  // watching the yard, not just the builder. Door toggles returned
  // above; a LAYER-LAW floor restore right after a collapse stays
  // quiet (the demolish fx already carried that moment).
  if (buildableForTile(next) && (performance.now() - (lastDemolishFxAt.get(`${tx},${ty}`) ?? -1e9)) > 400) {
    const td = tileDef(next);
    const base = td.topColor ?? td.color;
    renderer.particles.burst(tx + 0.5, ty + 0.55, 8, [base, td.color, '#c9bda4'], {
      speed: 0.8,
      life: 0.7,
      size: 0.06,
      up: true,
      gravity: 1.8,
      drag: 1.8,
      spread: 2.4,
    });
    sfx.spatial(tileAt, 'near', () => sfx.buildThump());
    return;
  }
  if (prev === Tile.Stump && treeOfSapling(next) !== null) {
    // Regrowth stage 1: a sapling sprouts from the stump under a
    // soft spray of leaves and turned earth.
    renderer.addGrowingTree(tx, ty);
    renderer.particles.burst(tx + 0.5, ty + 0.6, 8, ['#5a9b48', '#6da24f', '#8a6a45'], {
      speed: 0.8,
      life: 0.8,
      size: 0.06,
      up: true,
      gravity: 2.2,
      drag: 1.1,
    });
    return;
  }
  if (prev !== undefined && treeOfSapling(prev) !== null && TREE_TILES.has(next)) {
    // Regrowth stage 2: the sapling stands up into the full tree —
    // renderer eases the scale so nothing pops.
    renderer.addGrowingTree(tx, ty);
    renderer.particles.burst(tx + 0.5, ty + 0.3, 12, ['#5a9b48', '#3f8a3c', '#c9a441'], {
      speed: 1.1,
      life: 1.0,
      size: 0.06,
      up: true,
      gravity: 1.6,
      drag: 1.0,
    });
    return;
  }
  if (prev !== undefined && TREE_TILES.has(prev) && next === Tile.Stump) {
    const own = game.predictor.pos;
    const dir = own.x <= tx + 0.5 ? 1 : -1;
    renderer.addFallingTree(tx, ty, prev, dir);
    // A felled tree is a landmark event — heard far, but from its place.
    sfx.spatial(tileAt, 'far', () => sfx.treeFall());
    // Impact lands at ~720ms of the 3.2s fall timeline.
    window.setTimeout(() => {
      sfx.spatial(tileAt, 'far', () => sfx.treeImpact());
      if (sfx.listenerDist(tileAt.x, tileAt.y) < 7) input.rumble(0.45, 0.3, 150);
    }, 720);
  } else if (
    prev !== undefined &&
    ROCK_TILES.includes(prev) &&
    prev !== Tile.RockDepleted &&
    next === Tile.RockDepleted
  ) {
    // A worked-out node crumbles instead of blinking to its husk.
    renderer.addRockBreak(tx, ty, prev);
    sfx.spatial(tileAt, 'mid', () => sfx.rockCrumble());
    if (sfx.listenerDist(tileAt.x, tileAt.y) < 7) input.rumble(0.35, 0.3, 140);
  } else if (prev === Tile.RockDepleted && ROCK_TILES.includes(next)) {
    // Respawn: the fresh rock surfaces under a small dust puff.
    renderer.particles.burst(tx + 0.5, ty + 0.6, 7, ['#a89880', '#bcae94'], {
      speed: 0.9,
      life: 0.7,
      size: 0.1,
      gravity: 0.4,
      drag: 2.5,
      grow: 0.1,
      spread: 2.6,
    });
  }
};

// Loosing an arrow: instant, local, and scaled by the charge — string
// snap sound, a recoil kick, and a muzzle puff down the aim line.
game.onLoose = (charge, aim) => {
  const own = game.predictor.renderPos();
  if (charge <= 0) sfx.snapShot();
  else sfx.loose(charge);
  renderer.shake(charge <= 0 ? 0.8 : 1.5 + charge * 4);
  renderer.particles.burst(
    own.x + Math.cos(aim) * 0.5,
    own.y - 0.45 + Math.sin(aim) * 0.5,
    Math.round(4 + charge * 6),
    ['#f4efe4', '#c4b590', '#e8b64c'],
    { speed: 3 + charge * 3, life: 0.25, dir: aim, spread: 0.35 },
  );
  input.rumble(0.2 + charge * 0.4, 0.5, 70 + charge * 90);
};

// Dev/test hook: lets automated tests observe live game state.
(window as unknown as Record<string, unknown>).__arx = {
  game,
  renderer,
  audio: { engine: audioEngine, music, ambience, sfx, voice },
};

loginToggle.addEventListener('click', () => {
  registerMode = !registerMode;
  loginCharName.classList.toggle('hidden', !registerMode);
  loginCharName.required = registerMode;
  // The invite field is not marked required — the server decides
  // whether registration is gated (dev servers leave it open).
  loginInvite.classList.toggle('hidden', !registerMode);
  loginSubmit.textContent = registerMode ? 'Create & Enter World' : 'Enter World';
  loginToggle.textContent = registerMode
    ? 'Have an account? Sign in'
    : 'New here? Create an account';
  loginError.classList.add('hidden');
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!authReady) return;
  loginError.classList.add('hidden');
  loginStatus.textContent = registerMode ? 'Creating your adventurer…' : 'Signing in…';
  loginStatus.classList.remove('hidden');
  if (registerMode) {
    game.sendRegister(
      loginUser.value.trim(),
      loginPass.value,
      loginCharName.value.trim(),
      loginInvite.value.trim(),
    );
  } else {
    game.sendLogin(loginUser.value.trim(), loginPass.value);
  }
});

function activateTarget(target: ReturnType<typeof game.findNearbyTarget>): void {
  if (!target) return;
  switch (target.kind) {
    case 'node':
      game.interact(target.tx, target.ty);
      break;
    case 'station':
      // The Workshop tells the whole material story itself — the pack
      // stays closed so the bench gets the room.
      closeAllUi();
      stationPanels.openCraft(target.station, game.skills, game.knownRecipes, target);
      break;
    case 'bank':
      closeAllUi();
      lastBankAnchor = { tx: target.tx, ty: target.ty };
      game.interact(target.tx, target.ty); // server replies with the vault
      break;
    case 'portal': {
      game.interact(target.tx, target.ty);
      sfx.portal();
      // The veil takes you: tumbling riftshards imploding around the
      // mouth plus a flash of streaks — cover for the teleport cut.
      const mx = target.tx + 0.5;
      const my = target.ty + 0.55;
      renderer.particles.burst(mx, my, 18, PORTAL_BURST_COLORS, {
        shape: 'shard',
        spin: 9,
        speed: 3.2,
        life: 0.55,
        size: 0.09,
        gravity: 0,
        drag: 2.4,
        flicker: 0.5,
      });
      renderer.particles.burst(mx, my - 0.4, 10, ['#f1e9ff', '#c9aeff'], {
        shape: 'streak',
        speed: 5,
        life: 0.35,
        size: 0.07,
        gravity: 0,
      });
      break;
    }
    case 'shop':
      closeAllUi();
      stationPanels.openShop('general_store', target);
      panels.showInventory();
      break;
    case 'plot':
      closeAllUi();
      stationPanels.openPlant(target.tx, target.ty, game.inventory, game.skills, target);
      break;
    case 'crop':
      // The server decides: harvest if ripe, water if thirsty, else status.
      game.interact(target.tx, target.ty);
      break;
    case 'chest':
      // The server decides: locked, or a lid swings and loot spills.
      game.interact(target.tx, target.ty);
      break;
    case 'door':
      // The server decides: swing it, refuse it (locked rattle), or
      // hold it open because someone stands in the way.
      game.interact(target.tx, target.ty);
      break;
    case 'seat':
    case 'bed':
      // The server decides: seat the body, lay it down (claiming the
      // bed as home), stand it up, tend the hearth, or refuse an
      // occupied seat and another builder's bed.
      game.interact(target.tx, target.ty);
      break;
    case 'sign':
      // The words are already here (they streamed in with the chunk),
      // so the read opens locally and instantly. The server hears the
      // interact too — it answers only the blank-board case.
      closeAllUi();
      signHud.open(target.tx, target.ty);
      game.interact(target.tx, target.ty);
      break;
    case 'npc':
      game.interactNpc(target.eid);
      break;
    case 'loot':
      // One bag: just take it. A pile: open the ground manager and choose.
      if (game.nearbyLoot(2.4).length > 1) {
        closeAllUi();
        lootPanel.open();
      } else {
        game.pickup(target.eid);
      }
      break;
  }
}

/** The rebindable screen shortcuts the keyboard fires. */
const KB_SCREEN_ACTIONS: readonly ActionId[] = [
  'screenPack',
  'screenSkills',
  'screenArts',
  'screenCraft',
  'screenBuild',
  'screenSocial',
  'screenQuests',
  'screenRep',
  'screenMap',
  'screenSettings',
  'screenLoot',
  'mapGlass',
];

// Panel hotkeys + interact key — all read from the one keymap.
window.addEventListener('keydown', (e) => {
  // The look creator is modal from the FIRST frame: no screen may
  // open under character creation (the same guard the movement layer
  // already runs).
  if (
    chat.isTyping ||
    socialPanel.isTyping ||
    signHud.isTyping ||
    looks.open ||
    game.ownEid === null
  ) {
    return;
  }
  // A running cinematic owns the keyboard: advance, choose, or excuse
  // yourself — no screen may open over a conversation.
  if (cinema.open) {
    cinema.handleKey(e.code);
    return;
  }
  for (const id of KB_SCREEN_ACTIONS) {
    if (bindings.kbMatches(id, e.code)) {
      // Tab (the glass's default) must stop the browser's focus walk.
      e.preventDefault();
      screenAction(id);
    }
  }
  if (e.code === 'Escape') {
    // With nothing open, Esc means the craft itself: set the tools
    // down. With a screen up it keeps its old job and only closes.
    const hadUi =
      document.querySelector('.ui-screen:not(.hidden), .ui-tray:not(.hidden)') !== null ||
      buildMode !== null;
    closeAllUi();
    buildMode = null;
    buildOrient = 'auto';
    buildQueue.length = 0;
    buildDragging = false;
    renderer.buildGhost = null;
    if (!hadUi && game.action?.recipe !== undefined) game.craftStop();
  }
  if (buildMode && bindings.kbMatches('buildRotate', e.code)) cycleBuildOrient(1);
  if (bindings.kbMatches('interact', e.code)) activateTarget(game.findNearbyTarget());
  if (bindings.kbMatches('zoomIn', e.code)) {
    renderer.camera.stepZoom(1.15);
    saveZoom();
  }
  if (bindings.kbMatches('zoomOut', e.code)) {
    renderer.camera.stepZoom(1 / 1.15);
    saveZoom();
  }
});

/**
 * EVERY DOOR HAS A VOICE. One watcher owns all panel open/close cues,
 * keyed on visibility transitions — so the chest creaks whether the
 * bank opened from a click, a key, or the pad, and sighs shut whether
 * you pressed ✕, tapped the world, or simply walked away. Handlers
 * never play these themselves (that would double them).
 */
const panelSeen = {
  bank: false,
  shop: false,
  craft: false,
  build: false,
  loot: false,
  inv: false,
  skills: false,
  arts: false,
  audio: false,
  riftgate: false,
  social: false,
  map: false,
  rep: false,
  sign: false,
};
function panelAudioCues(): void {
  const vis = (id: string): boolean =>
    !document.getElementById(id)!.classList.contains('hidden');
  const cue = (
    key: keyof typeof panelSeen,
    open: boolean,
    onOpen: () => void,
    onClose: () => void,
  ): void => {
    if (open === panelSeen[key]) return;
    panelSeen[key] = open;
    if (open) onOpen();
    else onClose();
  };
  cue('bank', stationPanels.bankOpen, () => sfx.chestOpen(), () => sfx.chestClose());
  cue('shop', stationPanels.shopOpen, () => sfx.shopBell(), () => sfx.uiClose());
  cue('craft', vis('craft-panel'), () => sfx.stationOpen(), () => sfx.uiClose());
  cue('build', vis('build-panel'), () => sfx.parchment(), () => sfx.uiClose());
  cue('loot', vis('loot-panel'), () => sfx.satchel(), () => sfx.uiClose());
  cue('inv', vis('inventory-panel'), () => sfx.satchel(), () => sfx.uiClose());
  cue('skills', vis('skills-panel'), () => sfx.parchment(), () => sfx.uiClose());
  cue('arts', vis('arts-panel'), () => sfx.parchment(), () => sfx.uiClose());
  cue('audio', vis('audio-panel'), () => sfx.uiOpen(), () => sfx.uiClose());
  cue('riftgate', vis('riftgate-panel'), () => sfx.uiOpen(), () => sfx.uiClose());
  cue('social', vis('social-panel'), () => sfx.parchment(), () => sfx.uiClose());
  cue('map', vis('map-panel'), () => sfx.parchment(), () => sfx.uiClose());
  cue('rep', vis('rep-panel'), () => sfx.parchment(), () => sfx.uiClose());
  cue('sign', vis('sign-panel'), () => sfx.parchment(), () => sfx.uiClose());
}

// EVERY CONTROL ANSWERS: one delegated listener gives all buttons the
// same soft tap — mouse clicks and pad Ⓐ presses run the same wire.
// (Hotbar slots are excluded: casts already sing for themselves.)
document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement | null;
  if (
    t?.closest?.(
      '.act-btn, .menu-item, .panel-close, #panel-buttons button, .tech-plate-btn, .tech-link-go, .look-swatch, .look-stepper button, .look-actions button',
    )
  ) {
    sfx.uiTap();
  }
});

// Click an interactable tile within reach to use it; in build mode the
// click places the picked buildable and X+click demolishes — exactly
// what the action strip promises. Demolition lives ONLY in build mode
// now: in open play X is the sit key, and a key must not serve two
// masters.
// The drag-run: while the button stays down in build mode, every new
// tile under the cursor joins the queue. Release ends the painting;
// the queue keeps draining on its own.
canvas.addEventListener('mousemove', (e) => {
  if (!buildDragging || !buildMode || game.ownEid === null) return;
  const w = renderer.pickWorld(e.clientX, e.clientY);
  enqueueBuild(Math.floor(w.x), Math.floor(w.y));
});
window.addEventListener('mouseup', () => {
  buildDragging = false;
});
// Build mode owns the right button (it clears the run) — no menu.
canvas.addEventListener('contextmenu', (e) => {
  if (buildMode) e.preventDefault();
});

canvas.addEventListener('mousedown', (e) => {
  if (game.ownEid === null) return;
  const w = renderer.pickWorld(e.clientX, e.clientY);
  const tx = Math.floor(w.x);
  const ty = Math.floor(w.y);
  if (buildMode) {
    // Right-click abandons the queued run — nothing else.
    if (e.button === 2) {
      buildQueue.length = 0;
      return;
    }
    // The demolish modifier is the SIT binding read live (ONE KEYMAP:
    // rebinding Sit moves the modifier and the strip hint together).
    if (bindings.kb('sit').some((c) => input.isDown(c))) {
      sentSite = { tx, ty, at: performance.now() };
      game.demolishSend(tx, ty);
      return;
    }
    // Click queues the tile; the frame pump sends it the moment the
    // hands are free. Holding the button and dragging paints a run.
    enqueueBuild(tx, ty);
    buildDragging = true;
    return;
  }
  // Clicking the world dismisses any open station panel — the click
  // means "I'm doing something else now". Interacting with another
  // station below simply reopens the right panel.
  if (stationPanels.anyOpen) stationPanels.closeAll();
  // Ground loot outranks the tile under it: clicking a bag (or its
  // label) takes exactly that bag — in reach it goes straight to the
  // pack, out of reach the click is a walk-there-and-take errand. The
  // loot panel survives these clicks (taking IS the conversation) and
  // closes on any other world click.
  const lootHit = renderer.lootHitTest(e.clientX, e.clientY);
  if (lootHit) {
    game.pickupWalk(lootHit.eid);
    return;
  }
  lootPanel.close();
  const pos = game.predictor.pos;
  const dx = tx + 0.5 - pos.x;
  const dy = ty + 0.5 - pos.y;
  if (dx * dx + dy * dy <= 2.2 * 2.2) activateTarget(game.targetAt(tx, ty));
});

// Touch controls (virtual joystick + tap-to-move) on coarse pointers.
setupTouch(input, game, renderer, canvas, (tx, ty) => {
  // A bag on the tapped tile wins over the tile itself — near or far,
  // the tap means "that one": walk there if needed and take it.
  const bag = game.lootAtTile(tx, ty);
  if (bag !== null) {
    game.pickupWalk(bag);
    return true;
  }
  const pos = game.predictor.pos;
  const dx = tx + 0.5 - pos.x;
  const dy = ty + 0.5 - pos.y;
  if (dx * dx + dy * dy > 2.2 * 2.2) return false;
  const target = game.targetAt(tx, ty);
  if (!target) return false;
  activateTarget(target);
  return true;
}, saveZoom);

// Connect immediately; a stored session token skips the login form.
game.connect(localStorage.getItem('arx.token'));

// ---------------------------------------------------------------- loop

let lastFrame = performance.now();
let fpsCounter = 0;
let fps = 0;
let fpsWindowStart = performance.now();
// Riftgate earshot: throttled nearest-portal scan feeding the drone.
// The fall-earshot scan rides the same 2.5 Hz throttle.
let nextPortalScanAt = 0;
let portalNear = 0;
let fallEar: FallEar = SILENT_EAR;

let lastOwnPose = 0;
let padInteractWasDown = false;
/** Character-case dock edge: measured on open/resize, held between. */
let invCaseOpenedAt = 0;
let invCaseLeft = 0;
let invCaseMeasuredW = -1;
let lastDrawT = 0;
let lastSheathed = false;
/** Pad button state last frame — build-mode verbs edge off this. */
let padPrevBtns = new Set<number>();
let lastWalkMode = false;
/**
 * The pad's build cursor: a sticky offset from the player (in tiles),
 * steered by the right stick — deflection direction aims it, deflection
 * depth sets the reach. It keeps its place when the stick is released,
 * so you can walk while the ghost holds position.
 */
let padBuildCur: { dx: number; dy: number } | null = null;

/** Soft aim assist: the nearest live NPC within reach, for pad players. */
function nearestNpcAim(): number | null {
  const own = game.predictor.pos;
  let best: number | null = null;
  let bestD = 6 * 6;
  for (const remote of game.entities.values()) {
    if (remote.meta.kind !== EntityKind.Npc) continue;
    const latest = remote.buffer.latest();
    const x = latest?.x ?? remote.meta.x;
    const y = latest?.y ?? remote.meta.y;
    const dx = x - own.x;
    const dy = y - own.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = Math.atan2(dy, dx);
    }
  }
  return best;
}

function frame(now: number): void {
  // Schedule the next frame FIRST: one thrown exception in a render
  // pass must never kill the loop for good (it silently freezes
  // prediction and input — the game looks alive but nothing moves).
  requestAnimationFrame(frame);
  const frameDt = Math.min(0.25, (now - lastFrame) / 1000);
  lastFrame = now;

  // A station panel is a conversation with a place: walking out of
  // reach ends it (the server would refuse its actions anyway).
  if (game.ownEid !== null) {
    const pos = game.predictor.pos;
    stationPanels.enforceAnchor(pos.x, pos.y);
    // The loot panel is the same kind of conversation, with the pile.
    lootPanel.update(pos.x, pos.y);
    // The spatial-audio listener rides the rendered body — every
    // world-born sound measures its distance and pan against this.
    const ear = game.predictor.renderPos();
    sfx.setListener(ear.x, ear.y);
    voice.setListener(ear.x, ear.y);
  }
  panelAudioCues();
  // The station being talked to (open panel) animates its in-use
  // choreography — chest lid open, furnace stoked — via renderer heat.
  renderer.stationFocus = stationPanels.anchorTile;

  // Swing/cast sounds on pose transitions (combo swings pitch up the
  // chain; the finisher also thumps the pad).
  if (game.ownPose !== lastOwnPose) {
    if (game.ownPose === PoseState.Gather) autoEquipTool();
    if (game.ownPose === PoseState.Attack) sfx.swingCombo(0);
    else if (game.ownPose === PoseState.Attack2) sfx.swingCombo(1);
    else if (game.ownPose === PoseState.Attack3) {
      // The finisher beat — a heavy orb for wands, the big swing for steel.
      if (game.currentStyle() === 'magic') sfx.heavyBolt();
      else sfx.swingCombo(2);
      input.rumble(0.55, 0.3, 130);
    } else if (game.ownPose === PoseState.Cast) sfx.zap();
    else if (game.ownPose === PoseState.Sneak) sfx.dash(); // soft cloth rustle into the crouch
    // Dual wield: the off blade's echo cut whooshes on its own beat —
    // a lighter second voice ~0.6 of the swing beat later, matching
    // the rig's one-two choreography.
    const isMeleeSwing =
      game.ownPose === PoseState.Attack ||
      game.ownPose === PoseState.Attack2 ||
      game.ownPose === PoseState.Attack3;
    if (isMeleeSwing && itemDef(game.equipment.offhand?.id ?? '')?.weapon?.style === 'melee') {
      const beatMs = game.ownPose === PoseState.Attack3 ? 400 : 280;
      window.setTimeout(() => sfx.swingCombo(0), Math.round(beatMs * 0.55));
    }
    lastOwnPose = game.ownPose;
  }

  // The sheathe: steel sings leaving the scabbard, slides home with a
  // click. Server-confirmed edge, so the sound lands with the visual.
  if (game.isSheathed !== lastSheathed) {
    if (game.equipment.weapon || itemDef(game.equipment.offhand?.id ?? '')?.weapon) {
      if (game.isSheathed) sfx.weaponStow();
      else sfx.weaponDraw();
    }
    lastSheathed = game.isSheathed;
  }

  // Bow-draw tension: creak when the string starts back, a tight click
  // (plus a pulse in the hands) the moment the draw tops out.
  const drawT = game.ownDrawT;
  if (drawT > 0 && lastDrawT === 0) sfx.bowDraw();
  if (drawT >= 1 && lastDrawT < 1) {
    sfx.fullDrawClick();
    input.rumble(0.1, 0.35, 60);
  }
  lastDrawT = drawT;

  // Gamepad: poll sticks; X button interacts (edge-triggered).
  input.buildCapture = buildMode !== null;
  input.pollGamepad();
  const uiOpen =
    document.querySelector('.ui-screen:not(.hidden), .ui-tray:not(.hidden)') !== null ||
    looks.open;
  // The traveler's glass + the wayfinder ride the live HUD only — any
  // opened screen (the chart included) supersedes them.
  mapOverlay.update(now, uiOpen || cinema.open);
  waypointHud.update(game, renderer, uiOpen || cinema.open || buildMode !== null);
  objectiveTracker.update(uiOpen || cinema.open || buildMode !== null);
  craftHud.duck(uiOpen || cinema.open);
  partyHud.update(game, renderer, uiOpen || cinema.open || buildMode !== null);
  // The character case frames the LIVE you: with the case docked right
  // (and no bank/shop conversation borrowing the pack), the camera
  // slides the world so your character stands centered in the open
  // ground left of it. 0 hands the classic centered follow back.
  let viewShift = 0;
  if (panels.invOpen && !stationPanels.bankOpen && !stationPanels.shopOpen) {
    // getBoundingClientRect forces layout — read it live only while
    // the case may still be sliding in (and after resizes), then hold
    // the measured edge for the rest of the open stretch.
    if (invCaseOpenedAt === 0) invCaseOpenedAt = now;
    if (now - invCaseOpenedAt < 600 || invCaseMeasuredW !== window.innerWidth) {
      invCaseLeft = el('inventory-panel').getBoundingClientRect().left;
      invCaseMeasuredW = window.innerWidth;
    }
    viewShift = Math.max(0, (window.innerWidth - invCaseLeft) / 2);
  } else {
    invCaseOpenedAt = 0;
  }
  renderer.setViewShift(viewShift);
  // Build mode pins the action strip with its verbs — on both devices.
  // The strip is live: the demolish modifier is whatever Sit is bound
  // to, and the Turn verb only appears under an orientable piece.
  if (buildMode) {
    const turnable = orientRing() !== null;
    if (nav.mode === 'pad') {
      const rows: Array<[string, string, string]> = [['pad-glyph a', 'A', 'Place']];
      if (turnable) rows.push(['pad-glyph x', 'X', 'Turn']);
      rows.push(['pad-glyph y', 'Y', 'Demolish'], ['pad-glyph b', 'B', 'Done']);
      nav.showModeStrip(`build:pad:${turnable ? 't' : 'p'}`, rows);
    } else {
      const sitKey = bindings.kbBadge('sit') || 'X';
      const rows: Array<[string, string, string]> = [['kb-glyph', 'Click', 'Place / drag']];
      if (turnable) rows.push(['kb-glyph', 'Wheel', 'Turn']);
      rows.push(['kb-glyph', `${sitKey}+Click`, 'Demolish'], ['kb-glyph', 'Esc', 'Done']);
      nav.showModeStrip(`build:kb:${turnable ? 't' : 'p'}`, rows);
    }
  } else {
    nav.clearModeStrip();
  }
  nav.update(now, uiOpen, buildMode !== null);
  // The chart reads the pad directly while open: stick pans, triggers
  // zoom, Ⓨ works the waypoint — the borrowed-stick half of claimStick.
  if (mapScreen.isOpen) {
    if (nav.mode === 'pad') mapScreen.padUpdate(input.padSnapshot());
    else mapScreen.kbHint();
  }
  // The cinema drives its own pad verbs (Ⓐ/Ⓧ advance, Ⓑ leave,
  // d-pad walks the plates) — same frame cadence as UiNav.
  cinema.tickPad(input.padSnapshot(), now);
  const padInteract = input.padInteractPressed();
  if (padInteract && !padInteractWasDown && game.ownEid !== null && !cinema.open) {
    activateTarget(game.findNearbyTarget());
  }
  padInteractWasDown = padInteract;

  // World interact prompt: a glyph chip floating over whatever the
  // Interact button would use — the console-native "press Ⓧ" read.
  // THE APPROACH READ: the nearest board within reach shows its words
  // on its own, whatever the interact target is — a shingle beside a
  // door must still be readable while the door owns the F key.
  if (game.ownEid !== null && !buildMode && !cinema.open) {
    const near = game.nearestSign();
    if (near) {
      const p = renderer.camera.worldToScreen(
        near.tx + 0.5,
        near.ty + 0.5,
        window.innerWidth,
        window.innerHeight,
      );
      p.y -= renderer.renderLift(near.tx + 0.5, near.ty + 0.5) * renderer.camera.scale;
      signHud.update(near, p.x, p.y - renderer.camera.scale * 1.35);
    } else {
      signHud.update(null);
    }
  } else {
    signHud.update(null);
  }

  if (game.ownEid !== null && !uiOpen && !buildMode && !cinema.open) {
    const target = game.findNearbyTarget();
    if (target) {
      const p = renderer.camera.worldToScreen(target.tx + 0.5, target.ty + 0.5, window.innerWidth, window.innerHeight);
      p.y -= renderer.renderLift(target.tx + 0.5, target.ty + 0.5) * renderer.camera.scale;
      // Is the OWN body mounted on this piece of furniture? Seats are
      // one tile; a bed run answers for its neighbor tile too.
      const onTarget = (t: { tx: number; ty: number }, bed = false): boolean => {
        const own = game.predictor.renderPos();
        if (Math.floor(own.x) !== t.tx) return false;
        return bed ? Math.abs(own.y - (t.ty + 0.5)) < 1.15 : Math.floor(own.y) === t.ty;
      };
      const label =
        target.kind === 'station' ? PROMPT_LABELS[target.station]
        : target.kind === 'npc' ? target.verb
        : target.kind === 'crop' ? (target.mature ? 'Harvest' : 'Tend')
        : target.kind === 'door' ? (target.open ? (target.gate ? 'Close Gate' : 'Close Door') : (target.gate ? 'Open Gate' : 'Open Door'))
        : target.kind === 'sign' ? (target.blank ? 'Write Sign' : target.mine ? 'Read / Write' : 'Read Sign')
        // On the furniture already: the same touch stands you up — or
        // tends the hearth from your own bed (the ward dial).
        : target.kind === 'seat' && game.ownPose === PoseState.Sit && onTarget(target) ? 'Stand'
        : target.kind === 'bed' && game.ownPose === PoseState.Lie && onTarget(target, true) ? 'Tend Hearth'
        : PROMPT_LABELS[target.kind];
      nav.setPrompt({ sx: p.x, sy: p.y - renderer.camera.scale * 1.5, label: label ?? 'Use' });
    } else {
      nav.setPrompt(null);
    }
  } else {
    nav.setPrompt(null);
  }

  // Aim: gamepad right stick wins; with the stick idle, pad players get
  // soft aim-assist onto the nearest monster (falling back to the walk
  // direction); touch aims along the walk; otherwise the mouse cursor.
  if (game.ownEid !== null) {
    if (input.gamepadAim !== null) {
      game.aim = input.gamepadAim;
    } else if (input.padPrimary()) {
      const assist = nearestNpcAim();
      const axes = input.moveAxes();
      if (assist !== null) {
        game.aim = assist;
      } else if (axes.mx !== 0 || axes.my !== 0) {
        game.aim = Math.atan2(axes.my, axes.mx);
      }
    } else {
      const axes = input.moveAxes();
      const own = game.predictor.renderPos();
      // Invert the full camera projection so the world-space aim points
      // exactly at the ground tile under the cursor.
      const cursor = renderer.pickWorld(input.mouseX, input.mouseY);
      const mouseAim = Math.atan2(cursor.y - own.y, cursor.x - own.x);
      // On touch devices the mouse never moves — face the walk direction.
      if (input.touchMoveX !== 0 || input.touchMoveY !== 0) {
        game.aim = Math.atan2(axes.my, axes.mx);
      } else {
        game.aim = mouseAim;
      }
    }
  }

  // Build-mode ghost: rides the mouse tile — or, on pad, the sticky
  // right-stick cursor, with Ⓐ place / Ⓨ demolish / Ⓑ done.
  const padSnap = input.padSnapshot();
  const padBtns = new Set<number>();
  padSnap?.buttons.forEach((b, i) => {
    if (b.pressed) padBtns.add(i);
  });
  const padEdge = (i: number): boolean => padBtns.has(i) && !padPrevBtns.has(i);
  if (buildMode && game.ownEid !== null) {
    const pos = game.predictor.pos;
    let tx: number;
    let ty: number;
    if (input.padPrimary() && padSnap) {
      padBuildCur ??= { dx: Math.cos(game.aim) * 1.6, dy: Math.sin(game.aim) * 1.6 };
      const rx = padSnap.axes[2] ?? 0;
      const ry = padSnap.axes[3] ?? 0;
      const mag = Math.hypot(rx, ry);
      if (mag > 0.3) {
        // Deflection depth maps to reach: a nudge builds at your feet,
        // full tilt reaches the placement rim.
        const r = 0.9 + Math.min(1, (mag - 0.3) / 0.65) * 2;
        padBuildCur.dx = (rx / mag) * r;
        padBuildCur.dy = (ry / mag) * r;
      }
      tx = Math.floor(pos.x + padBuildCur.dx);
      ty = Math.floor(pos.y + padBuildCur.dy);
      // Build grammar on pad (contextual, like the menu dialect):
      // Ⓐ places — held, it paints a run as the cursor moves —
      // Ⓧ turns the piece, Ⓨ demolishes, Ⓑ is done.
      if (padEdge(0)) enqueueBuild(tx, ty);
      else if (padSnap.buttons[0]?.pressed && activeSite) enqueueBuild(tx, ty);
      if (padEdge(2)) cycleBuildOrient(1);
      if (padEdge(3)) {
        sentSite = { tx, ty, at: performance.now() };
        game.demolishSend(tx, ty);
      }
      if (padEdge(1)) {
        buildMode = null;
        buildOrient = 'auto';
        buildQueue.length = 0;
      }
    } else {
      const w = renderer.pickWorld(input.mouseX, input.mouseY);
      tx = Math.floor(w.x);
      ty = Math.floor(w.y);
    }
    const def = buildMode ? BUILDABLES.get(buildMode) : undefined;
    // The armed hand: while the demolish modifier is held, the ghost
    // becomes the wrecking read — your own tile frames red with its
    // salvage named; anything not yours simply never lights.
    const armed =
      nav.mode !== 'pad' && bindings.kb('sit').some((c) => input.isDown(c));
    if (def && armed) {
      const owned = game.ownBuilt.has(`${tx},${ty}`);
      let salvage: string | null = null;
      if (owned) {
        const ground = game.world.groundAt(tx, ty);
        const gDef = ground !== undefined ? buildableForTile(ground as Tile) : undefined;
        if (gDef && gDef.materials.length > 0) {
          salvage = gDef.materials
            .map((m) => `+${Math.ceil(m.qty / 2)} ${(itemDef(m.item)?.name ?? m.item).toLowerCase()}`)
            .join(', ');
        }
      }
      renderer.demolishGhost = owned ? { tx, ty, salvage } : null;
      renderer.buildGhost = null;
    } else {
      renderer.demolishGhost = null;
    }
    if (def && !armed) {
      const ground = game.world.groundAt(tx, ty);
      const dx = tx + 0.5 - pos.x;
      const dy = ty + 0.5 - pos.y;
      const dist2 = dx * dx + dy * dy;

      // Resolve the tile that would actually land — the explicit dial,
      // or the auto-orient read live off the neighbours (the ghost
      // shows what Auto will decide, so the guess is never a surprise).
      const dw = diagWallInfo(def.tile);
      let diag: 'NE' | 'NW' | 'SE' | 'SW' | null = null;
      let landTile: Tile = def.tile;
      if (dw) {
        if (buildOrient !== 'auto') diag = buildOrient;
        else {
          const isWall = (x: number, y: number): boolean => {
            const t = game.world.groundAt(x, y);
            if (t === undefined) return false;
            return dw.material === 'garrison'
              ? GARRISON_TILES.has(t as Tile)
              : WALL_RUN_TILES.includes(t as Tile);
          };
          const n = isWall(tx, ty - 1);
          const ee = isWall(tx + 1, ty);
          const ss = isWall(tx, ty + 1);
          const ww = isWall(tx - 1, ty);
          diag = n && ee ? 'NE' : n && ww ? 'NW' : ss && ee ? 'SE' : ss && ww ? 'SW' : 'NE';
        }
        landTile = diagWallTile(dw.material, diag);
      } else if (def.tile === Tile.FenceDiagNE) {
        if (buildOrient !== 'auto') {
          diag = buildOrient === 'NE' || buildOrient === 'SW' ? 'NE' : 'NW';
        } else {
          const isFence = (x: number, y: number): boolean => {
            const t = game.world.groundAt(x, y);
            return t !== undefined && FENCE_TILES.has(t as Tile);
          };
          diag =
            isFence(tx + 1, ty - 1) || isFence(tx - 1, ty + 1)
              ? 'NE'
              : isFence(tx - 1, ty - 1) || isFence(tx + 1, ty + 1)
                ? 'NW'
                : 'NE';
        }
        landTile = diag === 'NE' ? Tile.FenceDiagNE : Tile.FenceDiagNW;
      }

      // THE GHOST NEVER LIES: the full server gate, mirrored, with the
      // first failing check naming itself in one breath.
      const skill = def.skill ?? 'construction';
      const level = levelForXp(game.skills[skill] ?? 0);
      let reason: string | null = null;
      if (level < def.levelReq) {
        reason = `${skill.charAt(0).toUpperCase()}${skill.slice(1)} ${def.levelReq}`;
      } else if (ground === undefined || !buildableGround(def).includes(ground as Tile)) {
        reason = 'No footing';
      } else if (dist2 > 3 * 3) {
        reason = 'Too far';
      } else if (dist2 < 0.8 * 0.8) {
        reason = 'Too close';
      } else {
        for (const [eid, remote] of game.entities) {
          if (eid === game.ownEid) continue;
          const at = remote.buffer.latest();
          if (at && Math.floor(at.x) === tx && Math.floor(at.y) === ty) {
            reason = "Someone's there";
            break;
          }
        }
        if (!reason) {
          for (const m of def.materials) {
            const have = game.inventory.reduce(
              (n, sl) => n + (sl && sl.item === m.item ? sl.qty : 0),
              0,
            );
            if (have < m.qty) {
              reason = `Needs ${m.qty} ${(itemDef(m.item)?.name ?? m.item).toLowerCase()}`;
              break;
            }
          }
        }
      }

      const landDef = tileDef(landTile);
      const wallish = WALL_RUN_TILES.includes(landTile) || GARRISON_TILES.has(landTile);
      renderer.buildGhost = {
        tx,
        ty,
        valid: reason === null,
        kind: wallish ? 'wall' : landDef.raised === true ? 'prop' : 'flat',
        diag,
        icon: wallish || landDef.raised !== true ? null : def.id,
        color: landDef.color,
        topColor: landDef.topColor ?? landDef.color,
        reason,
        queued: buildQueue,
      };
    } else {
      renderer.buildGhost = null;
    }
    // THE BUILDER'S TRAY: the mode's face, refreshed only when its
    // signature moves (the class diffes internally).
    if (def) {
      buildTray.update({
        id: def.id,
        orient: orientRing() ? (buildOrient === 'auto' ? 'Auto' : buildOrient) : null,
        mats: def.materials.map((m) => ({
          item: m.item,
          have: game.inventory.reduce((n, sl) => n + (sl && sl.item === m.item ? sl.qty : 0), 0),
          need: m.qty,
        })),
        armed,
        recents: buildRecents.filter((r) => r !== def.id).slice(0, 5),
      });
    } else {
      buildTray.hide();
    }
    pumpBuildQueue();
  } else {
    padBuildCur = null;
    renderer.buildGhost = null;
    renderer.demolishGhost = null;
    buildTray.hide();
  }
  // R3 steps the camera (free in gameplay and build mode; in menus
  // the pad belongs to navigation, so uiCapture wins).
  if (!input.uiCapture) {
    for (const btn of bindings.pad('zoomCycle')) {
      if (padEdge(btn)) cycleZoom();
    }
  }
  padPrevBtns = padBtns;

  // Walk latch feedback: one quiet system line per toggle.
  if (input.walkMode !== lastWalkMode) {
    lastWalkMode = input.walkMode;
    const walkKey = bindings.kbBadge('walkToggle') || 'Z';
    chat.addLine({
      channel: 'system',
      text: input.walkMode ? `Walking. (${walkKey} to run)` : `Running. (${walkKey} to walk)`,
    });
  }

  // Loot HUD: hovering names a bag; holding Alt (or the left trigger)
  // names every drop on screen. Proximity labels need no input at all.
  renderer.lootHud = {
    mx: input.mouseX,
    my: input.mouseY,
    mouse: !input.padPrimary(),
    showAll: input.isDown('AltLeft') || input.isDown('AltRight') || padBtns.has(6),
  };
  // A bag (or its label) under the cursor invites the click.
  canvas.style.cursor =
    !buildMode && renderer.lootHitTest(input.mouseX, input.mouseY) ? 'pointer' : '';

  game.update(now);
  renderer.render(game, frameDt);
  hotbar.update(game);

  // The world's voice: zone-weighted music and ambience follow the
  // listener's position and the game clock every frame.
  if (game.ownEid !== null) {
    const own = game.predictor.renderPos();
    const w = zoneWeights(own.x, own.y);
    const hours = game.clockHoursNow();
    // The danger field reaches the ear: same seed, same field, same
    // anchors the server spawns by — havens included, so the music
    // calms exactly where a waystation's lamplight does.
    const dangerTier =
      game.worldSeed !== null && own.y < UNDERGROUND_Y
        ? dangerAt(game.worldSeed, own.x, own.y, game.dangerAnchors)
        : 0;
    music.update(w, hours, dangerTier);
    // The Riftgate's hum: a throttled scan (2.5 Hz, ~440 tile reads)
    // finds the nearest portal in earshot; closeness drives the drone.
    if (now >= nextPortalScanAt) {
      nextPortalScanAt = now + 400;
      const cx = Math.floor(own.x);
      const cy = Math.floor(own.y);
      let best = Infinity;
      for (let dy = -10; dy <= 10; dy++) {
        for (let dx = -10; dx <= 10; dx++) {
          const tl = game.world.groundAt(cx + dx, cy + dy);
          if (tl === Tile.PortalDown || tl === Tile.PortalUp) {
            best = Math.min(best, Math.hypot(cx + dx + 0.5 - own.x, cy + dy + 0.5 - own.y));
          }
        }
      }
      portalNear = best === Infinity ? 0 : Math.max(0, Math.min(1, 1 - best / 9.5));
      // Fall earshot: ask THE SPILL LAW itself where falling water
      // crosses a cliff near the ear (audio/falls.ts) — the voice can
      // only sound where the renderer hangs a curtain.
      fallEar = scanFallEar(
        (tx, ty) => game.world.groundAt(tx, ty),
        (tx, ty) => game.world.elevAt(tx, ty),
        own.x,
        own.y,
      );
    }
    ambience.update(own.x, own.y, w, hours, now / 1000, portalNear, fallEar);
  }

  fpsCounter++;
  if (now - fpsWindowStart > 1000) {
    fps = fpsCounter;
    fpsCounter = 0;
    fpsWindowStart = now;
    debugEl.textContent = [
      `${fps} fps`,
      `${Math.round(game.rttMs)} ms rtt`,
      `tick ${game.serverTick}`,
      `${game.entities.size + (game.ownEid !== null ? 1 : 0)} entities`,
    ].join('\n');
  }
}
requestAnimationFrame(frame);
