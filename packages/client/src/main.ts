import { EntityKind, HIDDEN_SKILLS, PoseState, ROCK_TILES, TREE_TILES, Tile, chestInfo, dangerAt, doorInfo, isSkillId, tileDef, treeOfSapling } from '@arx/shared';
import { BUILDABLES, buildableGround, itemDef, npcDef } from '@arx/content';
import { ClientGame } from './game/clientGame.js';
import { InputManager } from './input/inputManager.js';
import { Renderer } from './render/renderer.js';
import type { SmashKind } from './render/debris.js';
import { ChatUI } from './ui/chat.js';
import { Hotbar } from './ui/hotbar.js';
import { Panels, SKILL_FACE } from './ui/panels.js';
import { showLevelUp } from './ui/levelToast.js';
import { StationPanels } from './ui/stationPanels.js';
import { UiNav } from './ui/padUI.js';
import { LootPanel } from './ui/lootPanel.js';
import { SocialPanel } from './ui/socialPanel.js';
import { MapScreen } from './ui/map/mapScreen.js';
import { MapOverlay } from './ui/map/mapOverlay.js';
import { WaypointHud } from './ui/waypointHud.js';
import { showDiscovery } from './ui/discoveryBanner.js';
import { RiftgatePanel } from './ui/riftgate.js';
import { showDungeonEntry } from './ui/dungeonBanner.js';
import { Sfx } from './audio/sfx.js';
import { AudioEngine } from './audio/engine.js';
import { TrackPlayer } from './audio/tracks.js';
import { AmbienceSystem } from './audio/ambience.js';
import { AudioMenu } from './ui/audioMenu.js';
import { UNDERGROUND_Y, zoneWeights } from './audio/zones.js';
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
// device-aware shortcut badge (letter or pad glyph).
for (const [id, kind, tip, kbKey, padCls, padLabel] of [
  ['btn-inventory', 'pack', 'Pack', 'I', 'start', '☰'],
  ['btn-skills', 'skills', 'Skills', 'K', 'select', '⧉'],
  ['btn-arts', 'arts', 'Techniques', 'V', '', ''],
  ['btn-craft', 'handiwork', 'Handiwork', 'C', 'ddown', '▼'],
  ['btn-build', 'build', 'Build', 'B', 'dright', '▶'],
  ['btn-social', 'social', 'Social', 'U', '', ''],
  ['btn-map', 'map', 'Map', 'M', '', ''],
  ['btn-audio', 'sound', 'Sound', 'O', '', ''],
  ['touch-attack', 'attack', '', '', '', ''],
] as const) {
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
      const kb = document.createElement('span');
      kb.className = 'kb-glyph small';
      kb.textContent = kbKey;
      badge.appendChild(kb);
      if (padCls) {
        const pad = document.createElement('span');
        pad.className = `pad-glyph ${padCls}`;
        pad.textContent = padLabel;
        badge.appendChild(pad);
      }
      btn.appendChild(badge);
    }
  }
}

const audioEngine = new AudioEngine();
const sfx = new Sfx(audioEngine);
const music = new TrackPlayer(audioEngine);
const ambience = new AmbienceSystem(audioEngine);
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

// Mouse wheel: smooth, exponential — equal scroll = equal feel at any depth.
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
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
  plot: 'Plant',
  bed: 'Claim Home',
  sign: 'Read Sign',
};

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
  (buildable) => {
    buildMode = buildable;
    stationPanels.closeAll();
    chat.addLine({
      channel: 'system',
      text:
        nav.mode === 'pad'
          ? 'Steer the ghost with the right stick — Ⓐ place, Ⓨ demolish, Ⓑ done.'
          : 'Click the ground to place. X+click demolishes. Esc to stop building.',
    });
  },
  // The live pack — every maker panel's have/need chips read it.
  () => game.inventory,
);

stationPanels.onPlant = (tx, ty, seed) => {
  sfx.plantSeed();
  game.plantSend(tx, ty, seed);
};

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
  (style, ability) => game.sendTechnique(style, ability),
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
  onCloseAll: () => {
    stationPanels.closeAll();
    panels.closeAll();
    lootPanel.close();
    riftgate.close();
  },
  onToggleInventory: () => toggleScreen('inv'),
  onToggleSkills: () => toggleScreen('skills'),
  onOpenCraft: () => toggleScreen('craft'),
  onOpenBuild: () => toggleScreen('build'),
  packActionLabel: () =>
    stationPanels.bankOpen ? 'Deposit' : stationPanels.shopOpen ? 'Sell' : null,
  onFocusMove: () => sfx.uiTick(),
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
  signHud.close();
}

function toggleScreen(
  which: 'inv' | 'skills' | 'arts' | 'craft' | 'build' | 'audio' | 'loot' | 'social' | 'map',
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
      stationPanels.openBuild(game.skills);
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
    case 'loot':
      if (game.nearbyLoot(2.4).length > 0) lootPanel.open();
      break;
  }
}

document.getElementById('btn-inventory')!.addEventListener('click', () => toggleScreen('inv'));
document.getElementById('btn-skills')!.addEventListener('click', () => toggleScreen('skills'));
document.getElementById('btn-arts')!.addEventListener('click', () => toggleScreen('arts'));
document.getElementById('btn-craft')!.addEventListener('click', () => toggleScreen('craft'));
document.getElementById('btn-build')!.addEventListener('click', () => toggleScreen('build'));
document.getElementById('btn-audio')!.addEventListener('click', () => toggleScreen('audio'));
document.getElementById('btn-social')!.addEventListener('click', () => toggleScreen('social'));
document.getElementById('btn-map')!.addEventListener('click', () => toggleScreen('map'));

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
});

const game = new ClientGame(input, {
  onChat: (line) => chat.addLine(line),
  onNeedLook: () => looks.show(),
  onStatus: (status, detail) => {
    if (status === 'ingame') {
      loginOverlay.classList.add('hidden');
      hud.classList.remove('hidden');
      if (game.sessionToken) localStorage.setItem('arx.token', game.sessionToken);
      if (!localStorage.getItem('arx.tipsShown')) {
        localStorage.setItem('arx.tipsShown', '1');
        for (const tip of [
          'Move with WASD. Click or press F to chop, mine, fish, and use things. Q and E fire your abilities.',
          'Press I for your pack — click a tool or weapon to wield it.',
          'The villagers of Dawnmead know this land. Talk to them (F) before you take the lane east.',
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
  onRiftgate: (keySlots) => {
    // A server-driven screen, like the vault: through the one gate.
    closeAllUi();
    riftgate.open(keySlots);
  },
  onDialogueOpen: (o) => {
    // A conversation takes the whole stage: every screen closes, the
    // camera leaves the follow, and the input goes quiet — Space
    // turns pages now, it doesn't swing swords.
    closeAllUi();
    buildMode = null;
    renderer.buildGhost = null;
    cinema.show(o);
    renderer.startDialogueCine(o.eid);
    input.cinemaCapture = true;
    document.body.classList.add('in-dialogue'); // the HUD bows out
  },
  onDialogueNode: (n) => cinema.showNode(n),
  onDialogueClose: () => {
    cinema.close();
    renderer.endDialogueCine();
    input.cinemaCapture = false;
    document.body.classList.remove('in-dialogue');
  },
  onShopOpen: (shop) => {
    // A trainer opened their wares — same store screen, their shelf.
    closeAllUi();
    stationPanels.openShop(shop);
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
const waypointHud = new WaypointHud();

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
  hint: 'Sound and picture, dialed to taste — changes stick.',
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
game.onTechniques = () => panels.setTechniques(game.techniques);

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
    renderer.particles.burst(fx.x, fx.y - 0.5, 14, ['#8a7fae', '#b4aacb', '#5e5678'], {
      speed: 1.4,
      life: 0.55,
      size: 0.1,
      gravity: -1.2,
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
  audio: { engine: audioEngine, music, ambience, sfx },
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
    case 'bed':
      // The server decides: claim it, or refuse another builder's bed.
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

// Panel hotkeys + interact key.
window.addEventListener('keydown', (e) => {
  if (chat.isTyping || socialPanel.isTyping || signHud.isTyping || game.ownEid === null) return;
  // A running cinematic owns the keyboard: advance, choose, or excuse
  // yourself — no screen may open over a conversation.
  if (cinema.open) {
    cinema.handleKey(e.code);
    return;
  }
  if (e.code === 'KeyI') toggleScreen('inv');
  if (e.code === 'KeyK') toggleScreen('skills');
  if (e.code === 'KeyV') toggleScreen('arts');
  if (e.code === 'KeyO') toggleScreen('audio');
  if (e.code === 'KeyC') toggleScreen('craft');
  if (e.code === 'KeyB') toggleScreen('build');
  if (e.code === 'KeyU') toggleScreen('social');
  if (e.code === 'KeyM') toggleScreen('map');
  if (e.code === 'Tab') {
    // The traveler's glass — stop the browser's focus walk cold.
    e.preventDefault();
    mapOverlay.toggle();
  }
  if (e.code === 'Escape') {
    stationPanels.closeAll();
    panels.closeAll();
    lootPanel.close();
    riftgate.close();
    socialPanel.close();
    mapScreen.close();
    signHud.close();
    buildMode = null;
    renderer.buildGhost = null;
  }
  if (e.code === 'KeyF') activateTarget(game.findNearbyTarget());
  // G for "ground": toggle the loot manager over whatever lies in reach.
  if (e.code === 'KeyG') toggleScreen('loot');
  if (e.code === 'Equal' || e.code === 'NumpadAdd') {
    renderer.camera.stepZoom(1.15);
    saveZoom();
  }
  if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
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
// click places the picked buildable; X+click demolishes your work.
canvas.addEventListener('mousedown', (e) => {
  if (game.ownEid === null) return;
  const w = renderer.pickWorld(e.clientX, e.clientY);
  const tx = Math.floor(w.x);
  const ty = Math.floor(w.y);
  if (buildMode) {
    sfx.buildThump();
    game.buildSend(buildMode, tx, ty);
    return;
  }
  // Clicking the world dismisses any open station panel — the click
  // means "I'm doing something else now". Interacting with another
  // station below simply reopens the right panel.
  if (stationPanels.anyOpen) stationPanels.closeAll();
  if (input.isDown('KeyX')) {
    game.demolishSend(tx, ty);
    return;
  }
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
let nextPortalScanAt = 0;
let portalNear = 0;

let lastOwnPose = 0;
let padInteractWasDown = false;
let padSneakWasDown = false;
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
  // The character case frames the LIVE you: with the case docked right
  // (and no bank/shop conversation borrowing the pack), the camera
  // slides the world so your character stands centered in the open
  // ground left of it. 0 hands the classic centered follow back.
  let viewShift = 0;
  if (panels.invOpen && !stationPanels.bankOpen && !stationPanels.shopOpen) {
    const caseRect = el('inventory-panel').getBoundingClientRect();
    viewShift = Math.max(0, (window.innerWidth - caseRect.left) / 2);
  }
  renderer.setViewShift(viewShift);
  // Build mode pins the action strip with its verbs — on both devices.
  if (buildMode) {
    if (nav.mode === 'pad') {
      nav.showModeStrip('build:pad', [
        ['pad-glyph a', 'A', 'Place'],
        ['pad-glyph y', 'Y', 'Demolish'],
        ['pad-glyph b', 'B', 'Done'],
      ]);
    } else {
      nav.showModeStrip('build:kb', [
        ['kb-glyph', 'Click', 'Place'],
        ['kb-glyph', 'X+Click', 'Demolish'],
        ['kb-glyph', 'Esc', 'Done'],
      ]);
    }
  } else {
    nav.clearModeStrip();
  }
  nav.update(now, uiOpen, buildMode !== null);
  // The cinema drives its own pad verbs (Ⓐ/Ⓧ advance, Ⓑ leave,
  // d-pad walks the plates) — same frame cadence as UiNav.
  cinema.tickPad(input.padSnapshot(), now);
  const padInteract = input.padInteractPressed();
  if (padInteract && !padInteractWasDown && game.ownEid !== null && !cinema.open) {
    activateTarget(game.findNearbyTarget());
  }
  padInteractWasDown = padInteract;

  // L3 (left-stick click) toggles the sneak latch on pads.
  const padSneak =
    !input.uiCapture && !cinema.open && (input.padSnapshot()?.buttons[10]?.pressed ?? false);
  if (padSneak && !padSneakWasDown) input.sneakMode = !input.sneakMode;
  padSneakWasDown = padSneak;

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
      const label =
        target.kind === 'station' ? PROMPT_LABELS[target.station]
        : target.kind === 'npc' ? target.verb
        : target.kind === 'crop' ? (target.mature ? 'Harvest' : 'Tend')
        : target.kind === 'door' ? (target.open ? (target.gate ? 'Close Gate' : 'Close Door') : (target.gate ? 'Open Gate' : 'Open Door'))
        : target.kind === 'sign' ? (target.blank ? 'Write Sign' : target.mine ? 'Read / Write' : 'Read Sign')
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
      if (padEdge(0) || padEdge(2)) {
        sfx.buildThump();
        game.buildSend(buildMode, tx, ty);
      }
      if (padEdge(3)) game.demolishSend(tx, ty);
      if (padEdge(1)) buildMode = null;
    } else {
      const w = renderer.pickWorld(input.mouseX, input.mouseY);
      tx = Math.floor(w.x);
      ty = Math.floor(w.y);
    }
    const def = buildMode ? BUILDABLES.get(buildMode) : undefined;
    const ground = game.world.groundAt(tx, ty);
    const dx = tx + 0.5 - pos.x;
    const dy = ty + 0.5 - pos.y;
    const dist2 = dx * dx + dy * dy;
    // Mirror of the server's placement rule: per-buildable ground
    // allowlist, so the ghost goes red exactly where build() refuses.
    const valid =
      def !== undefined &&
      ground !== undefined &&
      buildableGround(def).includes(ground) &&
      dist2 <= 3 * 3 &&
      dist2 >= 0.8 * 0.8;
    renderer.buildGhost = def
      ? { tx, ty, valid, color: tileDef(def.tile).topColor ?? tileDef(def.tile).color }
      : null;
  } else {
    padBuildCur = null;
    renderer.buildGhost = null;
  }
  // d-pad ◀ cycles the camera (free in gameplay and build mode; in
  // menus it navigates, so uiCapture wins).
  if (padEdge(14) && !input.uiCapture) cycleZoom();
  padPrevBtns = padBtns;

  // Walk latch feedback: one quiet system line per toggle.
  if (input.walkMode !== lastWalkMode) {
    lastWalkMode = input.walkMode;
    chat.addLine({
      channel: 'system',
      text: input.walkMode ? 'Walking. (Z to run)' : 'Running. (Z to walk)',
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
    }
    ambience.update(own.x, own.y, w, hours, now / 1000, portalNear);
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
