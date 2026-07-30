/**
 * THE AUTHORED LOCKS (docs/factions-plan.md Phase 5): doors that boot
 * locked. The server seeds its in-memory doorLocks set from this list
 * (keyed by the door unit's anchor tile), so a restart re-arms every
 * lock. A crouched hand at or above the doc's theft.lockLevel works
 * the latch — witnessed, that's a theft like any other; the honest
 * way in is the townsfolk's trust, not the pick.
 *
 * Coordinates are WORLD TILES of the door tile itself (all current
 * entries are single-tile stone doorways — their own anchors).
 */
export const AUTHORED_LOCKS: ReadonlyArray<{ x: number; y: number }> = [
  // The Bank of Amberford's vault room — windowless; coin sleeps in
  // the dark behind Cormund's one inner door.
  { x: 333, y: 12 },
  // The Bank of Silverfall's vault — double-walled off the working
  // floor, the mountain's coin under the Crown's countersign.
  { x: -327, y: -184 },
];
