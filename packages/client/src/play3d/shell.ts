/**
 * THE CHROME ON THE SECOND DOOR (play3d S2) — the DOM pieces that make
 * the live world playable, mounted from the SAME scaffolding index.html
 * carries (play3d.html copies the #login overlay and the #hud block
 * verbatim) and driven by the SAME ui modules: THE DOOR REMEMBERS
 * (loginFlow), ChatUI, Hotbar, the Character case (Panels: pack, worn
 * kit, skills), the dock rail, the Display bench, speech bubbles and
 * the waypoint/party pointers through the ViewAdapter, the net pill
 * and the crossing veil. main.ts owns ~4000 lines of this wiring; the
 * shell forks only what S2 needs and names what it does not mount.
 *
 * Not mounted (S2 ledger): station/bank/shop/build screens, the pad UI
 * ring (UiNav), touch controls, audio, banners and ceremonies, loot
 * panel, dialogue cinema, map, quest journal, social, arena, keys.
 *
 * Local chat commands (never reach the wire): `/3d night|day`,
 * `/3d post`, `/3d ink`, `/3d tilt`, `/3d hud`.
 */
import type { GameEvents } from '../game/clientGame.js';
import type { ClientGame } from '../game/clientGame.js';
import type { InputManager } from '../input/inputManager.js';
import { bindings } from '../input/bindings.js';
import { ChatUI } from '../ui/chat.js';
import { Hotbar } from '../ui/hotbar.js';
import { Panels } from '../ui/panels.js';
import { initDock } from '../ui/dock.js';
import { initLoginFlow, type LoginFlow } from '../ui/loginFlow.js';
import { initDisplaySettings } from '../ui/displaySettings.js';
import { SpeechBubbles } from '../ui/speechBubbles.js';
import { WaypointHud } from '../ui/waypointHud.js';
import { PartyHud } from '../ui/partyHud.js';
import { LookCreator } from '../ui/lookCreator.js';
import { installChrome } from '../ui/chrome.js';
import { installTokens } from '../ui/kit/tokens.js';
import { installScale } from '../ui/kit/scale.js';
import type { ViewAdapter } from '../ui/viewAdapter.js';
import { Vitals } from './vitals.js';

function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`play3d shell: #${id} missing from play3d.html`);
  return e as T;
}

export interface ShellHooks {
  /** A `/3d …` chat command (the word after `/3d`). */
  onLocal: (cmd: string) => void;
  /** THE CROSSING: the body moved planes — drop the world under it. */
  onPlane: () => void;
}

export class Shell {
  readonly chat: ChatUI;
  readonly hotbar: Hotbar;
  readonly panels: Panels;
  readonly looks: LookCreator;
  readonly waypointHud = new WaypointHud();
  readonly partyHud = new PartyHud();
  readonly vitals: Vitals;
  readonly loginFlow: LoginFlow;
  speech: SpeechBubbles | null = null;
  private view: ViewAdapter | null = null;
  private game: ClientGame | null = null;
  private authReady = false;
  private pendingUser: string | null = null;
  private sessionUser: string | null = null;
  private netPill: HTMLElement | null = null;
  private readonly hud = el<HTMLElement>('hud');
  private readonly loginOverlay = el<HTMLElement>('login');
  private readonly loginStatus = el<HTMLElement>('login-status');
  private readonly loginError = el<HTMLElement>('login-error');
  private readonly veil = document.createElement('div');
  private veilHoldUntil = 0;
  private veilWaiting = false;
  private walkoverBox: HTMLInputElement | null = null;

  constructor(
    input: InputManager,
    private readonly hooks: ShellHooks,
  ) {
    installTokens();
    installScale();
    installChrome();
    document.body.classList.toggle('no-ui-motion', localStorage.getItem('arx.uimotion') === 'off');
    initDock();
    this.veil.id = 'crossing-veil';
    document.body.appendChild(this.veil);

    this.chat = new ChatUI(
      (text) => {
        const t = text.trim();
        if (t.toLowerCase().startsWith('/3d')) {
          this.hooks.onLocal(t.slice(3).trim().toLowerCase());
          return;
        }
        this.game?.sendChat(text);
      },
      () => this.game?.ownEid !== null && !this.hud.classList.contains('hidden'),
    );
    this.hotbar = new Hotbar(input);
    this.vitals = new Vitals(this.hud);
    this.looks = new LookCreator((look) => this.game?.setLookSend(look));
    const g = (): ClientGame => {
      if (!this.game) throw new Error('play3d shell: game not attached');
      return this.game;
    };
    this.panels = new Panels(
      (slot) => g().useSlot(slot),
      (slot) => g().unequip(slot),
      (ability, slot) => g().sendTechnique(ability, slot),
      (from, to, merge) => g().invMove(from, to, merge),
      (slot) => {
        const item = g().inventory[slot];
        if (item) g().dropSend(slot, item.qty);
      },
      (slot, action) => {
        const game = g();
        const item = game.inventory[slot];
        if (!item) return;
        if (action === 'drop') game.dropSend(slot, item.qty);
        else if (action === 'stow') game.useSlot(slot, true);
        else if (action === 'offhand') game.useSlot(slot, false, true);
        else if (action === 'stowOffhand') game.useSlot(slot, true, true);
        else game.useSlot(slot);
      },
      () => null,
      () => 'kb',
      (hand) => (hand === 'off' ? g().carryOff : g().carryStyle),
      (style, hand) => g().setCarryStyle(style, hand),
      () => ({ name: this.game?.ownName, look: this.game?.ownLook }),
      () => this.panels.showArts(),
      (calling, on, rank) => g().sendCalling(calling, on, rank),
      () => input.queueSwap(),
    );
    input.setTypingCheck(() => this.chat.isTyping || this.looks.open);

    // THE DOOR REMEMBERS — the same four-view form, same ids.
    this.loginFlow = initLoginFlow({
      els: {
        form: el('login-form'),
        user: el('login-user'),
        pass: el('login-pass'),
        charName: el('login-charname'),
        invite: el('login-invite'),
        submit: el('login-submit'),
        toggle: el('login-toggle'),
        other: el('login-other'),
        error: this.loginError,
        status: this.loginStatus,
        rosterEl: el('login-roster'),
        chosenEl: el('login-chosen'),
      },
      isAuthReady: () => this.authReady,
      submit: (kind, f) => {
        this.pendingUser = f.user || null;
        if (kind === 'register') g().sendRegister(f.user, f.pass, f.name, f.invite);
        else g().sendLogin(f.user, f.pass);
      },
    });

    // The dock rail: the three screens S2 mounts; the rest stay quiet.
    el('btn-inventory').addEventListener('click', () => this.toggleScreen('inv'));
    el('btn-skills').addEventListener('click', () => this.toggleScreen('skills'));
    el('btn-audio').addEventListener('click', () => this.toggleScreen('settings'));
    window.addEventListener('keydown', (e) => {
      if (this.chat.isTyping || this.looks.open || this.game?.ownEid === null) return;
      if (bindings.kbMatches('screenPack', e.code)) this.toggleScreen('inv');
      else if (bindings.kbMatches('screenSkills', e.code)) this.toggleScreen('skills');
      else if (bindings.kbMatches('screenSettings', e.code)) this.toggleScreen('settings');
      else if (e.code === 'Escape') this.closeScreens();
    });
    // Settings: only the Display bench is live on this door.
    el('settings-sec-sound').classList.add('hidden');
    el('settings-sec-controls').classList.add('hidden');
    el('settings-sec-display').classList.remove('hidden');
  }

  /** Bind the game and the view once both exist. */
  attach(game: ClientGame, view: ViewAdapter): void {
    this.game = game;
    this.view = view;
    this.speech = new SpeechBubbles(game, view);
    this.walkoverBox = initDisplaySettings(view, (on) => game.setLootPref(on));
  }

  private get settingsPanel(): HTMLElement {
    return el('audio-panel');
  }

  toggleScreen(which: 'inv' | 'skills' | 'settings'): void {
    const settingsOpen = !this.settingsPanel.classList.contains('hidden');
    if (which === 'settings') {
      this.panels.closeAll();
      this.settingsPanel.classList.toggle('hidden', settingsOpen);
      return;
    }
    this.settingsPanel.classList.add('hidden');
    if (which === 'inv') this.panels.toggleInventory();
    else this.panels.toggleSkills();
  }

  closeScreens(): void {
    this.panels.closeAll();
    this.settingsPanel.classList.add('hidden');
  }

  get screenOpen(): boolean {
    return this.panels.anyOpen || !this.settingsPanel.classList.contains('hidden');
  }

  private setNetPill(text: string | null): void {
    if (text === null) {
      this.netPill?.remove();
      this.netPill = null;
      return;
    }
    if (!this.netPill) {
      this.netPill = document.createElement('div');
      this.netPill.className = 'net-pill';
      document.body.appendChild(this.netPill);
    }
    if (this.netPill.textContent !== text) this.netPill.textContent = text;
  }

  private showLoginError(text: string): void {
    this.loginError.textContent = text;
    this.loginError.classList.remove('hidden');
    this.loginStatus.classList.add('hidden');
  }

  /** The GameEvents ClientGame is built with. */
  events(): GameEvents {
    return {
      onChat: (line) => {
        this.chat.addLine(line);
        if (line.eid !== undefined) this.speech?.say(line.eid, line.text);
      },
      onStatus: (status, detail) => this.onStatus(status, detail),
      onInventory: (slots) => this.panels.renderInventory(slots),
      onSkills: (xp) => this.panels.renderSkills(xp),
      onXp: () => {},
      onEquipment: (equipment) => this.panels.renderEquipment(equipment),
      onBank: () => {},
      onHit: () => {},
      onDeath: () => {},
      onNeedLook: () => this.looks.show(),
      onPlane: (p) => {
        this.hooks.onPlane();
        this.speech?.clear();
        this.veil.classList.add('on');
        this.veilHoldUntil = performance.now() + 480;
        this.veilWaiting = true;
        if (p.name && !p.id.startsWith('rift:')) {
          this.chat.addLine({ channel: 'system', text: `You cross into ${p.name}.` });
        }
      },
    };
  }

  private onStatus(status: Parameters<GameEvents['onStatus']>[0], detail?: string): void {
    const game = this.game;
    if (status === 'ingame' && game) {
      this.setNetPill(null);
      this.loginOverlay.classList.add('hidden');
      this.hud.classList.remove('hidden');
      if (game.sessionToken) localStorage.setItem('arx.token', game.sessionToken);
      if (this.pendingUser) {
        this.sessionUser = this.pendingUser;
      } else if (!this.sessionUser) {
        const tokenUser = localStorage.getItem('arx.tokenuser');
        const card = this.loginFlow.rosterCardFor(tokenUser);
        this.sessionUser = card && card.name === game.ownName ? tokenUser : null;
      }
      this.pendingUser = null;
      if (this.sessionUser) {
        localStorage.setItem('arx.tokenuser', this.sessionUser);
        this.loginFlow.remember({ user: this.sessionUser, name: game.ownName, look: game.ownLook, at: Date.now() });
      }
      this.chat.addLine({
        channel: 'system',
        text: 'Immersive door (3D, S2). Click to walk or use things; drag to orbit; wheel to dolly; WASD follows the camera. /3d night|day|post|ink|tilt|hud.',
      });
    } else if (status === 'authRequired') {
      this.authReady = true;
      this.loginOverlay.classList.remove('hidden');
      this.loginStatus.classList.add('hidden');
      localStorage.removeItem('arx.token');
    } else if (status === 'authErr') {
      this.authReady = true;
      this.showLoginError(detail ?? 'authentication failed');
    } else if (status === 'rejected') {
      this.loginOverlay.classList.remove('hidden');
      this.showLoginError(detail ?? 'connection rejected');
      localStorage.removeItem('arx.token');
    } else if (status === 'reconnecting') {
      this.chat.addLine({ channel: 'system', text: 'Connection lost. Reconnecting…' });
      this.setNetPill('Reconnecting…');
    } else if (status === 'connecting') {
      this.loginStatus.textContent = 'Connecting…';
      this.loginStatus.classList.remove('hidden');
    }
  }

  /** Per-frame chrome: the pointers, bubbles, vitals, hotbar, veil, pill. */
  frame(now: number, groundIn: () => boolean): void {
    const game = this.game;
    const view = this.view;
    if (!game || !view) return;
    const hidden = this.screenOpen || this.looks.open;
    this.hotbar.update(game);
    this.vitals.update(game);
    this.waypointHud.update(game, view, hidden);
    this.partyHud.update(game, view, hidden);
    this.speech?.update(now, hidden);
    if (this.walkoverBox && this.walkoverBox.checked !== game.lootAuto) this.walkoverBox.checked = game.lootAuto;
    if (game.connStatus === 'ingame') this.setNetPill(game.wireSilenceMs(now) > 1500 ? 'Connection unstable…' : null);
    if (this.veilWaiting && now >= this.veilHoldUntil && (groundIn() || now >= this.veilHoldUntil + 4000)) {
      this.veilWaiting = false;
      this.veil.classList.remove('on');
    }
  }

  system(text: string): void {
    this.chat.addLine({ channel: 'system', text });
  }
}
