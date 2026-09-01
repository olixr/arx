/**
 * THE ONE SCREEN LAW — one screen owns the stage at a time. Every door
 * (hotkeys, dock clicks, the ring, bumpers) passes through this gate;
 * the sole exception is the deliberate bank/shop + pack pairing,
 * composed by the callers. Moved verbatim from main.ts (foundations
 * F5.1); the dock's click wiring now derives from THE DOCK'S ROSTER.
 */
import type { ActionId } from '../input/bindings.js';
import type { ClientGame } from '../game/clientGame.js';
import { DOCK_BUTTONS } from './dock.js';
import type { Panels } from './panels.js';
import type { StationPanels } from './stationPanels.js';

export interface ScreenRouterDeps {
  cinema: { readonly open: boolean };
  panels: Panels;
  stationPanels: StationPanels;
  lootPanel: { readonly isOpen: boolean; open(): void; close(): void };
  riftgate: { close(): void };
  audioMenu: { readonly isOpen: boolean; open(): void; close(): void };
  socialPanel: { readonly isOpen: boolean; open(): void; close(): void };
  mapScreen: { readonly isOpen: boolean; open(): void; close(): void };
  questLog: { readonly isOpen: boolean; open(): void; close(): void };
  repScreen: { readonly isOpen: boolean; open(): void; close(): void };
  keyRingPanel: { readonly isOpen: boolean; open(): void; close(): void };
  beastHall: { readonly isOpen: boolean; open(g: ClientGame): void; close(): void };
  companionsPanel: { readonly isOpen: boolean; open(g: ClientGame): void; close(): void };
  arenaBoard: { readonly isOpen: boolean; close(): void };
  signHud: { close(): void };
  mapOverlay: { toggle(): void };
  game: ClientGame;
  /** THE BUILDER'S HAND rides main-side state; read it at open time. */
  buildMode(): string | null;
}

/** THE BENCH CALLS YOU BACK — the reopen delay after a finished batch. */
export const BENCH_RETURN_DELAY_MS = 1250;

export type ScreenId = (typeof DOCK_BUTTONS)[number][4] | 'loot';

export interface ScreenRouter {
  closeAll(): void;
  toggle(which: ScreenId): void;
  cycle(dir: -1 | 1): void;
  action(id: ActionId): void;
  syncDock(): void;
  current(): ScreenId | null;
  benchReturn(): StationPanels['craftBench'];
  setBenchReturn(b: StationPanels['craftBench']): void;
}

export function createScreenRouter(deps: ScreenRouterDeps): ScreenRouter {
  const {
    cinema, panels, stationPanels, lootPanel, riftgate, audioMenu, socialPanel,
    mapScreen, questLog, repScreen, keyRingPanel, beastHall, companionsPanel,
    arenaBoard, signHud, mapOverlay, game,
  } = deps;
  let benchReturn: (typeof stationPanels)['craftBench'] = null;

  function closeAllUi(): void {
    benchReturn = null;
    stationPanels.closeAll();
    panels.closeAll();
    lootPanel.close();
    riftgate.close();
    audioMenu.close();
    socialPanel.close();
    mapScreen.close();
    questLog.close();
    repScreen.close();
    keyRingPanel.close();
    beastHall.close();
    companionsPanel.close();
    arenaBoard.close();
    signHud.close();
  }

  function toggleScreen(
    which: 'inv' | 'skills' | 'arts' | 'craft' | 'build' | 'audio' | 'loot' | 'social' | 'map' | 'quests' | 'rep' | 'keys' | 'beasts' | 'companions',
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
                          : which === 'keys'
                            ? keyRingPanel.isOpen
                            : which === 'beasts'
                              ? beastHall.isOpen
                              : which === 'companions'
                                ? companionsPanel.isOpen
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
        stationPanels.openBuild(game.skills, deps.buildMode());
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
      case 'keys':
        keyRingPanel.open();
        break;
      case 'beasts':
        beastHall.open(game);
        break;
      case 'companions':
        companionsPanel.open(game);
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
  /** Derived from the one dock roster — never a second hand-kept list. */
  const SCREEN_ORDER = DOCK_BUTTONS.map(([, , , , which]) => which);

  function currentScreen(): (typeof SCREEN_ORDER)[number] | null {
    if (panels.invOpen) return 'inv';
    if (panels.skillsOpen) return 'skills';
    if (panels.artsOpen) return 'arts';
    if (stationPanels.craftOpen) return 'craft';
    if (stationPanels.buildOpen) return 'build';
    if (socialPanel.isOpen) return 'social';
    if (questLog.isOpen) return 'quests';
    if (repScreen.isOpen) return 'rep';
    if (keyRingPanel.isOpen) return 'keys';
    if (beastHall.isOpen) return 'beasts';
    if (companionsPanel.isOpen) return 'companions';
    if (mapScreen.isOpen) return 'map';
    if (audioMenu.isOpen) return 'audio';
    return null;
  }

  /* THE LIT KEY: the rail marks whichever screen owns the stage.
     Screens open and close down a dozen paths (hotkeys, dock clicks,
     the ring, bumpers, close buttons, walking off a station), so the
     frame loop re-reads the one truth — currentScreen() — and touches
     the DOM only when the answer changes. */
  let litDockKey: (typeof SCREEN_ORDER)[number] | null = null;
  function syncDockActive(): void {
    const cur = currentScreen();
    if (cur === litDockKey) return;
    litDockKey = cur;
    for (let i = 0; i < DOCK_BUTTONS.length; i++) {
      document
        .getElementById(DOCK_BUTTONS[i]![0])
        ?.classList.toggle('active', SCREEN_ORDER[i] === cur);
    }
  }

  function cycleScreen(dir: -1 | 1): void {
    if (cinema.open) return;
    const cur = currentScreen();
    // An anchored room that is NOT on the shelf (store counter, the
    // stalls) never yields to a bumper walk — a stray press must not
    // slam the counter shut mid-trade. The vault answers its bumpers
    // with its own section rail before this is ever asked.
    if (cur === null && (stationPanels.shopOpen || stationPanels.stableOpen || stationPanels.bankOpen)) {
      return;
    }
    // The bench is a counter too: a station-anchored workshop (smithy,
    // stove, enchanting table, the seed furrow) holds its ground even
    // when its list dealt no pager to take the bumpers — an empty seed
    // pouch must not turn LB into "close the furrow, open the skills".
    if (stationPanels.anchorTile !== null) return;
    // The stakes board is a counter too: the ringmaster opened it from
    // the far side of a conversation, and no bumper walk may reach back
    // and slam it — LB/RB step the plates' room, they do not leave it.
    if (arenaBoard.isOpen) return;
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
      screenKeys: 'keys',
      screenBeasts: 'beasts',
      screenCompanions: 'companions',
      screenSettings: 'audio',
      screenLoot: 'loot',
    };
    const which = SCREEN_FOR[id];
    if (which) toggleScreen(which);
  }

  // THE DOCK OBEYS THE SAME GATE: click wiring derives from the roster.
  for (const [id, , , , which] of DOCK_BUTTONS) {
    document.getElementById(id)?.addEventListener('click', () => toggleScreen(which));
  }

  return {
    closeAll: closeAllUi,
    toggle: toggleScreen,
    cycle: cycleScreen,
    action: screenAction,
    syncDock: syncDockActive,
    current: currentScreen,
    benchReturn: () => benchReturn,
    setBenchReturn: (b) => {
      benchReturn = b;
    },
  };
}
