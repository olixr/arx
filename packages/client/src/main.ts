import { EntityKind, PoseState, ROCK_TILES, Tile, tileDef } from '@devcraft/shared';
import { BUILDABLES, BUILDABLE_GROUND, itemDef, npcDef } from '@devcraft/content';
import { ClientGame } from './game/clientGame.js';
import { InputManager } from './input/inputManager.js';
import { Renderer } from './render/renderer.js';
import { ChatUI } from './ui/chat.js';
import { Hotbar } from './ui/hotbar.js';
import { Panels } from './ui/panels.js';
import { StationPanels } from './ui/stationPanels.js';
import { UiNav } from './ui/padUI.js';
import { Sfx } from './audio/sfx.js';
import { setupTouch } from './input/touch.js';
import { uiIconUrl } from './render/icons.js';
import { installChrome } from './ui/chrome.js';
import { LookCreator } from './ui/lookCreator.js';

// Paint the HUD's chrome (linen weave + ornate frame) before any panel
// shows — the stylesheet reads it from CSS custom properties.
installChrome();

// Painted UI glyphs — no emoji anywhere in the universe. Each dock
// button wears a device-aware shortcut badge (letter or pad glyph).
for (const [id, kind, tip, kbKey, padCls, padLabel] of [
  ['btn-inventory', 'backpack', 'Pack', 'I', 'start', '☰'],
  ['btn-skills', 'scroll', 'Skills', 'K', 'select', '⧉'],
  ['btn-craft', 'hammer', 'Handiwork', 'C', 'ddown', '▼'],
  ['btn-build', 'house', 'Build', 'B', 'dright', '▶'],
  ['touch-attack', 'attack', '', '', '', ''],
] as const) {
  const btn = document.getElementById(id);
  if (btn) {
    const img = document.createElement('img');
    img.src = uiIconUrl(kind, 44);
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

const sfx = new Sfx();
window.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
window.addEventListener('keydown', () => sfx.unlock(), { once: true });

const canvas = document.getElementById('game') as HTMLCanvasElement;
const loginOverlay = document.getElementById('login')!;
const loginForm = document.getElementById('login-form') as HTMLFormElement;
const loginUser = document.getElementById('login-user') as HTMLInputElement;
const loginPass = document.getElementById('login-pass') as HTMLInputElement;
const loginCharName = document.getElementById('login-charname') as HTMLInputElement;
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
const storedZoom = parseFloat(localStorage.getItem('devcraft.zoom') ?? '');
if (Number.isFinite(storedZoom)) {
  renderer.camera.setZoom(storedZoom);
  renderer.camera.zoom = renderer.camera.targetZoom;
}
const saveZoom = (): void =>
  localStorage.setItem('devcraft.zoom', renderer.camera.targetZoom.toFixed(3));

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
      localStorage.setItem('devcraft.outline', renderer.outlineOn ? 'on' : 'off');
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
renderer.outlineOn = localStorage.getItem('devcraft.outline') !== 'off';
input.setTypingCheck(() => chat.isTyping || looks.open);
let buildMode: string | null = null;
/** The bank chest tile that asked the server for the vault — anchors the panel. */
let lastBankAnchor: { tx: number; ty: number } | null = null;

/** Interact-prompt verbs by target kind / station type. */
const PROMPT_LABELS: Record<string, string> = {
  node: 'Gather',
  bank: 'Open Bank',
  shop: 'Browse Wares',
  portal: 'Enter',
  fire: 'Cook',
  furnace: 'Smelt',
  anvil: 'Smith',
  workbench: 'Craft',
};

const stationPanels = new StationPanels(
  (recipe, qty) => game.craft(recipe, qty),
  (op, item, qty) => game.bankSend(op, item, qty),
  (op, item, qty) => game.shopSend(op, item, qty),
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
);

const panels = new Panels(
  (slot) => {
    // Pack clicks are contextual: deposit while banking, sell in a shop,
    // otherwise use/equip/eat.
    const item = game.inventory[slot];
    if (!item) return;
    if (stationPanels.bankOpen) {
      game.bankSend('deposit', item.item, item.qty);
    } else if (stationPanels.shopOpen) {
      game.shopSend('sell', item.item, 1);
    } else {
      game.useSlot(slot);
    }
  },
  (slot) => game.unequip(slot),
  (style, ability) => game.sendTechnique(style, ability),
  (from, to) => game.invMove(from, to),
  (slot) => dropSlot(slot),
  // Explicit verbs from the item context menu — no station guessing.
  (slot, action) => {
    const item = game.inventory[slot];
    if (!item) return;
    if (action === 'drop') dropSlot(slot);
    else if (action === 'deposit') game.bankSend('deposit', item.item, item.qty);
    else if (action === 'sell') game.shopSend('sell', item.item, 1);
    else game.useSlot(slot);
  },
  () => (stationPanels.bankOpen ? 'bank' : stationPanels.shopOpen ? 'shop' : null),
  (): 'kb' | 'pad' => nav.mode,
);

/** Drop a whole pack slot onto the ground (drag-out / pad Ⓨ). */
function dropSlot(slot: number): void {
  const item = game.inventory[slot];
  if (!item) return;
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
  },
  onToggleInventory: () => panels.toggleInventory(),
  onToggleSkills: () => panels.toggleSkills(),
  onOpenCraft: () => stationPanels.openCraft(null, game.skills),
  onOpenBuild: () => stationPanels.openBuild(game.skills),
  packActionLabel: () =>
    stationPanels.bankOpen ? 'Deposit' : stationPanels.shopOpen ? 'Sell' : null,
});

// One delegated hover path drives item inspection for the mouse: item
// cells raise the full detail card, everything else the small tooltip.
document.addEventListener('pointerover', (e) => {
  if (nav.mode === 'pad') return; // pad focus owns the card there
  const target = e.target as HTMLElement | null;
  const itemCell = target?.closest?.('[data-invslot][data-filled], [data-equipslot][data-filled]');
  if (itemCell && panels.showCardFor(itemCell as HTMLElement)) {
    nav.hideTooltip();
    return;
  }
  panels.hideCard();
  const el = target?.closest?.('[data-tipname]');
  if (el) nav.showTooltipFor(el as HTMLElement);
  else nav.hideTooltip();
});

document.getElementById('btn-craft')!.addEventListener('click', () => {
  stationPanels.openCraft(null, game.skills);
});
document.getElementById('btn-build')!.addEventListener('click', () => {
  stationPanels.openBuild(game.skills);
});

function showLoginError(text: string): void {
  loginError.textContent = text;
  loginError.classList.remove('hidden');
  loginStatus.classList.add('hidden');
}

const looks = new LookCreator((look) => {
  game.setLookSend(look);
  chat.addLine({ channel: 'system', text: 'Your look is set. Welcome to the world.' });
});

const game = new ClientGame(input, {
  onChat: (line) => chat.addLine(line),
  onNeedLook: () => looks.show(),
  onStatus: (status, detail) => {
    if (status === 'ingame') {
      loginOverlay.classList.add('hidden');
      hud.classList.remove('hidden');
      if (game.sessionToken) localStorage.setItem('devcraft.token', game.sessionToken);
      if (!localStorage.getItem('devcraft.tipsShown')) {
        localStorage.setItem('devcraft.tipsShown', '1');
        for (const tip of [
          'Move with WASD. Click or press F to chop, mine, fish, and use things. Q and E fire your abilities.',
          'Press I for your pack — click a tool or weapon to wield it.',
          'A cave lurks in the rocks north-east of the plaza. Bring a sword.',
        ]) {
          chat.addLine({ channel: 'system', text: `Tip: ${tip}` });
        }
      }
    } else if (status === 'authRequired') {
      // Stored token was missing/expired — show the login form.
      authReady = true;
      loginOverlay.classList.remove('hidden');
      loginStatus.classList.add('hidden');
      localStorage.removeItem('devcraft.token');
    } else if (status === 'authErr') {
      authReady = true;
      showLoginError(detail ?? 'authentication failed');
    } else if (status === 'rejected') {
      loginOverlay.classList.remove('hidden');
      showLoginError(detail ?? 'connection rejected');
      localStorage.removeItem('devcraft.token');
    } else if (status === 'reconnecting') {
      chat.addLine({ channel: 'system', text: 'Connection lost — reconnecting…' });
    } else if (status === 'connecting') {
      loginStatus.textContent = 'Connecting…';
      loginStatus.classList.remove('hidden');
    }
  },
  onInventory: (slots) => {
    panels.renderInventory(slots);
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
      renderer.shake(hit.crit ? 10 : 7);
      renderer.flashHurt();
      sfx.hurt();
      input.rumble(0.6, 0.25, 160);
    } else if (hit.crit) {
      renderer.shake(4);
      sfx.crit();
      input.rumble(0.7, 0.45, 170);
    } else {
      sfx.hit();
      if (hit.dmg > 0) input.rumble(0.3, 0.45, 80);
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
    renderer.addDeathGhost(death.x, death.y, color, def?.radius ?? 0.3);
    renderer.hitstop(0.07);
    renderer.zoomPulse();
    sfx.kill();
    input.rumble(0.8, 0.5, 220);
  },
  onBank: (items) => {
    if (stationPanels.bankOpen) stationPanels.refreshBank(items);
    else {
      stationPanels.openBank(items, lastBankAnchor ?? undefined);
      panels.showInventory();
    }
  },
  onXp: (msg) => {
    // A quiet golden xp drip above the player's head.
    const own = game.predictor.renderPos();
    game.floaties.push({
      x: own.x + 0.35,
      y: own.y - 1.15,
      text: `+${msg.gained}`,
      color: '#e8b64c',
      bornAt: performance.now(),
      sizeMul: 0.72,
    });
    if (msg.levelledUp) {
      chat.addLine({
        channel: 'system',
        text: `⭐ ${msg.skill} level ${msg.level}! Congratulations!`,
      });
      sfx.levelUp();
      const own = game.predictor.renderPos();
      renderer.particles.burst(own.x, own.y - 0.5, 26, ['#f2c94c', '#e8a33d', '#f4efe4'], {
        speed: 3.5,
        life: 0.9,
        up: true,
        gravity: 4,
      });
    }
  },
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

// Server combat FX → audio + camera feel, scaled by how close they land.
game.onFx = (fx) => {
  const own = game.predictor.renderPos();
  const dist = Math.hypot(fx.x - own.x, fx.y - own.y);
  if (fx.kind === 'blast') {
    sfx.blast();
    if (dist < 7) renderer.shake(dist < fx.radius + 0.5 ? 9 : 5);
  } else if (fx.kind === 'reaction' && fx.text && fx.text !== 'Resist' && !fx.text.startsWith('+')) {
    sfx.reaction();
    renderer.hitstop(0.055);
    renderer.particles.burst(fx.x, fx.y - 0.3, 18, [fx.color ?? '#f4efe4', '#f4efe4'], {
      speed: 3.2,
      life: 0.5,
    });
  } else if (fx.kind === 'nova' && dist > 0.9) {
    // Someone else's nova — a softer report at a distance.
    sfx.zap();
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
  let need: string | null = null;
  for (let ty = Math.floor(own.y) - 2; ty <= Math.floor(own.y) + 2 && !need; ty++) {
    for (let tx = Math.floor(own.x) - 2; tx <= Math.floor(own.x) + 2 && !need; tx++) {
      const t = game.world.groundAt(tx, ty);
      if (t === Tile.Tree || t === Tile.TreeOak) need = 'axe';
      else if (t !== undefined && ROCK_TILES.includes(t)) need = 'pickaxe';
      else if (t === Tile.FishingSpot) need = 'rod';
    }
  }
  if (!need) return;
  const worn = game.equipment.tool ? itemDef(game.equipment.tool)?.tool?.type : undefined;
  if (worn === need) return;
  const idx = game.inventory.findIndex((s) => s !== null && itemDef(s.item)?.tool?.type === need);
  if (idx >= 0) game.useSlot(idx);
}

// Each beat of work lands in the hands: chop knocks, pick clinks,
// anvil rings, and the furnace's hot breath — each with its own rumble.
renderer.onGatherImpact = (kind) => {
  if (kind === 'rock') {
    sfx.mineClink();
    input.rumble(0.3, 0.38, 70);
  } else if (kind === 'anvil') {
    sfx.anvilClang();
    input.rumble(0.34, 0.42, 80);
  } else if (kind === 'furnace') {
    sfx.furnaceRoar();
    input.rumble(0.12, 0.2, 160);
  } else {
    sfx.chop();
    input.rumble(0.22, 0.32, 60);
  }
};

// A felled tree topples away from whoever cut it, groans, and lands
// with a thud you can feel.
game.onTileChange = (tx, ty, prev, next) => {
  if ((prev === Tile.Tree || prev === Tile.TreeOak) && next === Tile.Stump) {
    const own = game.predictor.pos;
    const dir = own.x <= tx + 0.5 ? 1 : -1;
    renderer.addFallingTree(tx, ty, prev === Tile.TreeOak, dir);
    sfx.treeFall();
    // Impact lands at ~720ms of the 3.2s fall timeline.
    window.setTimeout(() => {
      sfx.treeImpact();
      input.rumble(0.45, 0.3, 150);
    }, 720);
  } else if (
    prev !== undefined &&
    ROCK_TILES.includes(prev) &&
    prev !== Tile.RockDepleted &&
    next === Tile.RockDepleted
  ) {
    // A worked-out node crumbles instead of blinking to its husk.
    renderer.addRockBreak(tx, ty, prev);
    sfx.rockCrumble();
    input.rumble(0.35, 0.3, 140);
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
(window as unknown as Record<string, unknown>).__devcraft = { game, renderer };

loginToggle.addEventListener('click', () => {
  registerMode = !registerMode;
  loginCharName.classList.toggle('hidden', !registerMode);
  loginCharName.required = registerMode;
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
    game.sendRegister(loginUser.value.trim(), loginPass.value, loginCharName.value.trim());
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
      stationPanels.openCraft(target.station, game.skills, target);
      panels.showInventory();
      break;
    case 'bank':
      lastBankAnchor = { tx: target.tx, ty: target.ty };
      game.interact(target.tx, target.ty); // server replies with the vault
      break;
    case 'portal':
      game.interact(target.tx, target.ty);
      sfx.portal();
      break;
    case 'shop':
      stationPanels.openShop(target);
      panels.showInventory();
      break;
  }
}

// Panel hotkeys + interact key.
window.addEventListener('keydown', (e) => {
  if (chat.isTyping || game.ownEid === null) return;
  if (e.code === 'KeyI') panels.toggleInventory();
  if (e.code === 'KeyK') panels.toggleSkills();
  if (e.code === 'KeyC') stationPanels.openCraft(null, game.skills);
  if (e.code === 'KeyB') stationPanels.openBuild(game.skills);
  if (e.code === 'Escape') {
    stationPanels.closeAll();
    panels.closeAll();
    buildMode = null;
    renderer.buildGhost = null;
  }
  if (e.code === 'KeyF') activateTarget(game.findNearbyTarget());
  if (e.code === 'Equal' || e.code === 'NumpadAdd') {
    renderer.camera.stepZoom(1.15);
    saveZoom();
  }
  if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
    renderer.camera.stepZoom(1 / 1.15);
    saveZoom();
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
  const pos = game.predictor.pos;
  const dx = tx + 0.5 - pos.x;
  const dy = ty + 0.5 - pos.y;
  if (dx * dx + dy * dy <= 2.2 * 2.2) activateTarget(game.targetAt(tx, ty));
});

// Touch controls (virtual joystick + tap-to-move) on coarse pointers.
setupTouch(input, game, renderer, canvas, (tx, ty) => {
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
game.connect(localStorage.getItem('devcraft.token'));

// ---------------------------------------------------------------- loop

let lastFrame = performance.now();
let fpsCounter = 0;
let fps = 0;
let fpsWindowStart = performance.now();

let lastOwnPose = 0;
let padInteractWasDown = false;
let lastDrawT = 0;
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
  }

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
    lastOwnPose = game.ownPose;
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
    document.querySelector('.side-panel:not(.hidden)') !== null || looks.open;
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
  const padInteract = input.padInteractPressed();
  if (padInteract && !padInteractWasDown && game.ownEid !== null) {
    activateTarget(game.findNearbyTarget());
  }
  padInteractWasDown = padInteract;

  // World interact prompt: a glyph chip floating over whatever the
  // Interact button would use — the console-native "press Ⓧ" read.
  if (game.ownEid !== null && !uiOpen && !buildMode) {
    const target = game.findNearbyTarget();
    if (target) {
      const p = renderer.camera.worldToScreen(target.tx + 0.5, target.ty + 0.5, window.innerWidth, window.innerHeight);
      p.y -= renderer.renderLift(target.tx + 0.5, target.ty + 0.5) * renderer.camera.scale;
      nav.setPrompt({ sx: p.x, sy: p.y - renderer.camera.scale * 1.5, label: PROMPT_LABELS[target.kind === 'station' ? target.station : target.kind] ?? 'Use' });
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
      if (padEdge(0) || padEdge(2)) game.buildSend(buildMode, tx, ty);
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
    const valid =
      ground !== undefined &&
      BUILDABLE_GROUND.includes(ground) &&
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

  game.update(now);
  renderer.render(game, frameDt);
  hotbar.update(game);

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
