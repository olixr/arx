/**
 * Authored-zone ground art for the player map, baked from the BUNDLED
 * zone builders — no network, no dev API (which is 403 in prod). Live
 * streamed chunks draw OVER this (they carry the server's edited/built
 * truth), so bundled art only ever fills ground the session hasn't
 * received — a fine cartographic approximation.
 */
export interface ZoneArt {
    canvas: HTMLCanvasElement;
    /**
     * THE WORLDS APART: the plane whose chart this art belongs on.
     * Planes legitimately overlap in coordinates — the Undercroft lies
     * over open surface wilderness — so the drawer must match plane,
     * never just rectangle.
     */
    plane: string;
    x: number;
    y: number;
    w: number;
    h: number;
}
/** All bundled authored zones, baked once on first ask. */
export declare function authoredZoneArt(): ZoneArt[];
//# sourceMappingURL=zoneArt.d.ts.map