/**
 * THE HILL SHOULDER — the bear.
 * Split out of rig.ts on the golems.ts template (foundations F3.4);
 * rig.ts re-exports everything here, so every lab, test and painter
 * keeps its old door.
 */
/** THE FOOT KNOWS THE GROUND — foot-frame digit tables. Bear digits:
 *  lateral seats (×foot width) of the four toe lobes across the pad's
 *  leading edge, one claw per digit. Turtle claws: the three-horn fan
 *  of the sprawled forefoot. */
export declare const BEAR_TOES: readonly [-0.63, -0.22, 0.22, 0.63];
/**
 * The black bear: sheer mass — a broad slab with the shoulder hump
 * peaked over the front legs, belly nearly brushing the ground, and a
 * huge low head with round ears and a pale short muzzle. The pounce
 * bares teeth like the wolf, but everything about it is heavier.
 */
export interface BearLook {
    fur: string;
    muzzle: string;
    earIn: string;
    bodyW: number;
    backH: number;
    /** Extra shoulder mass over the front legs. */
    humpH: number;
    chestH: number;
    headW: number;
    headH: number;
}
export declare const BEAR_LOOK: BearLook;
//# sourceMappingURL=rigUrsine.d.ts.map