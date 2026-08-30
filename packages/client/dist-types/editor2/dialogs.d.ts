/**
 * THE DIALOGS — open browser, new zone, zone properties, save-as-
 * prefab, and help, rebuilt on the v2 kit. Values never ride innerHTML
 * (names go through textContent/value assignment); destructive actions
 * go through confirmDialog, never window.confirm.
 */
import { type ZoneDef } from '@arx/content';
import type { WorldMode } from '../editor/world/worldMode.js';
import { type StudioMode } from './commands.js';
import type { EditorOps } from './ops.js';
export declare function showModal(builder: (body: HTMLElement, close: () => void) => void): void;
/** Recently opened zone ids, newest first (localStorage-backed). */
export declare function recentZones(): string[];
export declare function noteRecentZone(id: string): void;
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
/**
 * THE OPEN BROWSER — everything the world holds, one dialog: towns,
 * the Underworld, every composed frontier site, files, orphans.
 */
export declare function openBrowser(deps: DialogDeps): Promise<void>;
export declare function newZoneDialog(deps: DialogDeps): void;
export declare function zonePropertiesDialog(deps: DialogDeps): void;
export declare function savePrefabDialog(deps: DialogDeps): void;
/** The help sheet is READ from the registry — it can never drift. */
export declare function helpDialog(): void;
//# sourceMappingURL=dialogs.d.ts.map