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
export const BEAR_TOES = [-0.63, -0.22, 0.22, 0.63] as const;
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
export const BEAR_LOOK: BearLook = {
  fur: '#3d332a',
  muzzle: '#a8865f',
  earIn: '#241c16',
  bodyW: 0.27,
  backH: 0.6,
  humpH: 0.12,
  chestH: 0.16,
  headW: 0.34,
  headH: 0.3,
};
