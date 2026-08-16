import { SURFACE_PLANE_ID, type PlaneId } from './planes.js';

/**
 * THE AUTHORED LOCKS (docs/factions-plan.md Phase 5): doors that boot
 * locked. The server seeds its in-memory doorLocks set from this list
 * (keyed by the door unit's anchor tile), so a restart re-arms every
 * lock. A crouched hand at or above the doc's theft.lockLevel works
 * the latch — witnessed, that's a theft like any other; the honest
 * way in is the townsfolk's trust, not the pick.
 *
 * Coordinates are WORLD TILES of the door tile itself (all current
 * entries are single-tile stone doorways — their own anchors), and
 * every entry DECLARES its plane (THE WORLDS APART) — after the
 * south opened, a y-derivation would misfile a future frontier lock,
 * so the tag is required, never derived.
 */
export const AUTHORED_LOCKS: ReadonlyArray<{ plane: PlaneId; x: number; y: number }> = [
  // The Bank of Amberford's vault room — windowless; coin sleeps in
  // the dark behind Cormund's one inner door. (THE FORD COMES HOME
  // rebuilt the hall; the vault door is local (29,39) of the new
  // 144x144 rect.)
  { plane: SURFACE_PLANE_ID, x: 477, y: -17 },
  // The Bank of Silverfall's vault — double-walled off the working
  // floor, the mountain's coin under the Crown's countersign.
  { plane: SURFACE_PLANE_ID, x: -487, y: -304 },
];
