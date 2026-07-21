/**
 * The one panel system. Every menu in the game — pack, skills, craft,
 * bank, shop, build, loot, sound, and every dialog still to come — is
 * dressed by `dressPanel`, so they all share one anatomy:
 *
 *   ┌─ head ─────────────────────────────┐
 *   │ [icon plaque]  TITLE        [✕]    │
 *   │ hint — one quiet line of guidance  │
 *   ├─ body (the caller's own content) ──┤
 *
 * Laws:
 * - ONE ANATOMY, MANY FACES. A panel differs by icon, title and body —
 *   never by structure. New UI = new body, everything else is free.
 * - EVERY PANEL TEACHES ITSELF. The hint line states the panel's core
 *   gesture in one sentence; device-specific verbs live in the pad
 *   action strip, so hints stay device-neutral.
 * - PAD-FIRST. The close chip is a `[data-nav]` stop like everything
 *   else; helpers stamp nav keys on whatever they build.
 *
 * The helpers below (`bigButton`, `iconTile`, `needChip`, `meter`) are
 * the shared vocabulary of the redesigned menus — flat vector pieces
 * sized for a couch and a controller.
 */
/** Dress a panel: icon plaque + existing h3 title + hint + close chip. */
export declare function dressPanel(panel: HTMLElement, opts: {
    icon?: string;
    hint?: string;
    onClose?: () => void;
}): {
    setHint: (text: string) => void;
    setIcon: (url: string) => void;
};
/** A primary action button — flat gold, couch-sized, pad-navigable. */
export declare function bigButton(label: string, navkey: string, onClick: () => void, opts?: {
    acta?: string;
    minor?: boolean;
}): HTMLButtonElement;
/** A framed icon well — the standard item/recipe portrait. */
export declare function iconTile(url: string, cls?: string): HTMLElement;
/**
 * A requirement chip: icon + "have/need" count, green when satisfied,
 * ember-red when short — the maker menus' whole material story.
 */
export declare function needChip(iconUrl: string, have: number, need: number, title: string): HTMLElement;
/** A flat progress meter with a hard leading edge. Returns the fill. */
export declare function meter(frac: number, cls?: string): {
    root: HTMLElement;
    fill: HTMLElement;
};
/** A small flat level-requirement badge ("lvl 30 smithing"). */
export declare function levelBadge(level: number, skill: string, met: boolean): HTMLElement;
//# sourceMappingURL=panel.d.ts.map