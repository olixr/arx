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
    cinema: {
        readonly open: boolean;
    };
    panels: Panels;
    stationPanels: StationPanels;
    lootPanel: {
        readonly isOpen: boolean;
        open(): void;
        close(): void;
    };
    riftgate: {
        close(): void;
    };
    audioMenu: {
        readonly isOpen: boolean;
        open(): void;
        close(): void;
    };
    socialPanel: {
        readonly isOpen: boolean;
        open(): void;
        close(): void;
    };
    mapScreen: {
        readonly isOpen: boolean;
        open(): void;
        close(): void;
    };
    questLog: {
        readonly isOpen: boolean;
        open(): void;
        close(): void;
    };
    repScreen: {
        readonly isOpen: boolean;
        open(): void;
        close(): void;
    };
    keyRingPanel: {
        readonly isOpen: boolean;
        open(): void;
        close(): void;
    };
    beastHall: {
        readonly isOpen: boolean;
        open(g: ClientGame): void;
        close(): void;
    };
    companionsPanel: {
        readonly isOpen: boolean;
        open(g: ClientGame): void;
        close(): void;
    };
    arenaBoard: {
        readonly isOpen: boolean;
        close(): void;
    };
    signHud: {
        close(): void;
    };
    mapOverlay: {
        toggle(): void;
    };
    game: ClientGame;
    /** THE BUILDER'S HAND rides main-side state; read it at open time. */
    buildMode(): string | null;
}
/** THE BENCH CALLS YOU BACK — the reopen delay after a finished batch. */
export declare const BENCH_RETURN_DELAY_MS = 1250;
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
export declare function createScreenRouter(deps: ScreenRouterDeps): ScreenRouter;
//# sourceMappingURL=screenRouter.d.ts.map