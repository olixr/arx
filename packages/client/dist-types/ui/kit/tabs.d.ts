/**
 * THE TAB RAIL — one look for wings and sections everywhere
 * (The Grand Refit, Phase 2; trigger paging arrives with Phase 3).
 *
 * Iron keys in a row; the standing tab is pressed brass with the
 * screen's accent under it. A tab may wear a pip when something
 * unseen waits behind it. `data-pager` marks the rail as the room's
 * primary pager so LT/RT can step it.
 */
export interface TabDef {
    id: string;
    label: string;
}
export interface TabRail {
    root: HTMLElement;
    setActive(id: string): void;
    setPip(id: string, on: boolean): void;
    /** Step to the neighbor tab — the trigger verbs. */
    step(dir: -1 | 1): void;
}
export declare function tabRail(tabs: TabDef[], onPick: (id: string) => void, navPrefix?: string): TabRail;
//# sourceMappingURL=tabs.d.ts.map