/**
 * THE PLACE HERALD — the one ceremony that names where you stand.
 *
 * A centered typographic announcement over a soft ink veil: the
 * place's chart sigil, a tracked kicker in the kind's accent, the
 * name large in serif, a hairline rule drawing outward from a center
 * gem, then a story line and a facts row (danger pips, level band,
 * threat word). No ray wheels, no slam, no shine sweep — the premium
 * read is restraint, typography, and timing.
 *
 * A toast, not a screen: pointer-events none, own chrome, never
 * .ui-tray (that class doubles as the input gate). One herald stands
 * at a time — a fresh raising dismisses the last. All motion rides
 * transform/opacity only and gates on body.no-ui-motion like every
 * kit animation.
 *
 * The discovery and dungeon-threshold banners are thin adapters over
 * this builder (discoveryBanner.ts / dungeonBanner.ts). Quest, rep,
 * and level ceremonies keep their own chrome — those are event
 * ceremonies, not place ceremonies.
 */
export interface HeraldFacts {
    /** Danger pips: this many lit of five. Absent = no pips. */
    tier?: number;
    /** Plain notes, spoken in a row with quiet separators. */
    notes: string[];
}
export interface HeraldSpec {
    /** Stage flavor: 'town' | 'poi' | 'dungeon' | 'landmark'. */
    kind: string;
    /** The kind's accent — kicker, rule, gem, and lit pips wear it. */
    accent: string;
    /** The small tracked line above the name. */
    kicker: string;
    name: string;
    /** Chart sigil or key icon, seated small above the kicker. */
    iconUrl?: string;
    /** One plain sentence of what this place is. */
    lore?: string;
    facts?: HeraldFacts;
    holdMs: number;
}
export declare function raiseHerald(spec: HeraldSpec): void;
/**
 * Dev-only (the `?herald` bench): pin the standing show mid-flight —
 * every herald animation pauses at `atMs` and the bow-out timers are
 * lifted, so a choreography frame can be photographed at leisure.
 * Never called by shipped logic.
 */
export declare function freezeHerald(atMs: number): void;
/** Clear any standing herald (a fresh ceremony restarts the show). */
export declare function dismissHerald(): void;
//# sourceMappingURL=herald.d.ts.map