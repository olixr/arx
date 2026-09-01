/**
 * THE PANEL'S FACE TABLES (foundations F7 endgame) — the wield words,
 * skill faces and station faces both panel hosts and their split wings
 * read. A leaf on purpose: tables flow downhill, and the last value
 * edges between wing and host die.
 */
/** The when clause's word for each weapon style in hand. */
export declare const WIELD_WORD: Record<string, string>;
/**
 * Every skill's face: an item that embodies the craft, and an accent
 * the card's plaque and meter wear. Pure data — a new skill is a row.
 */
export declare const SKILL_FACE: Record<string, {
    icon: string;
    color: string;
}>;
/** Every crafting station's face: name, icon, accent, and craft verb. */
export declare const STATION_FACE: Record<string, {
    label: string;
    icon: string | null;
    accent: string;
    verb: string;
    hint: string;
}>;
export declare const HANDIWORK_FACE: {
    label: string;
    icon: string | null;
    accent: string;
    verb: string;
    hint: string;
};
//# sourceMappingURL=panelFaces.d.ts.map