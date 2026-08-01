import { PLAYER_SPEED } from '@arx/shared';

/**
 * Mounts — THE ROAD GROWS SHORT (docs/mounts-plan.md).
 *
 * A mount is a travel stance the player OWNS (a character unlock, never
 * an inventory item) and WEARS (appearance, never a second entity).
 * Everything a mount is allowed to change is in this record; everything
 * it is not allowed to change — combat, gathering, stealth, carry —
 * is enforced by the dismount laws at the server's one movement site.
 */
export interface MountDef {
  id: string;
  /** Display name, the quiet-quartermaster register. */
  name: string;
  /**
   * Ground speed as a multiple of PLAYER_SPEED. THE SADDLE OUTRANKS
   * THE SOLES: this REPLACES the foot stack (max, never product).
   * Hard cap MOUNT_MULT_CAP — the remote-smoothing lane is 12 t/s and
   * wade-release snaps need headroom under it.
   */
  speedMult: number;
  /**
   * Which body the renderer saddles: a BEAST_SPECS-style key resolved
   * client-side. Phase 2 ships 'courser'; the sabercat family later.
   */
  body: string;
  /** Coat/look variant within the body painter (bay, grey, dun...). */
  coat: string;
  /** One concrete sentence in the world's diction (VOICE.md: no dashes). */
  flavor: string;
}

/**
 * The speed law's wall: no mount multiplier above this, ever. At
 * PLAYER_SPEED 5 the cap is 9.5 t/s, under the interpolation layer's
 * SMOOTH_MAX_SPEED of 12 with margin for correction nudges. Raising
 * this means re-arguing the netcode ceiling in a design review, not
 * editing a number.
 */
export const MOUNT_MULT_CAP = 1.9;

export const MOUNTS: readonly MountDef[] = [
  {
    id: 'courser_bay',
    name: 'Dawnlands Courser',
    speedMult: 1.6,
    body: 'courser',
    coat: 'bay',
    flavor: 'A working horse off the Silverfall roads, shod for the long miles between lamps.',
  },
  {
    id: 'courser_grey',
    name: 'Dawnlands Courser',
    speedMult: 1.6,
    body: 'courser',
    coat: 'grey',
    flavor: 'A working horse the color of thaw weather, shod for the long miles between lamps.',
  },
  {
    id: 'courser_dun',
    name: 'Dawnlands Courser',
    speedMult: 1.6,
    body: 'courser',
    coat: 'dun',
    flavor: 'A black legged dun off the Silverfall roads, steady past every waystone.',
  },
  // Phase 5, A HERD OF ONE'S OWN: variety is identity, never power —
  // the ladder stays close (plan law: 1.6 / 1.7 / 1.75, capped 1.9).
  {
    id: 'garron_hoargate',
    name: 'Hoargate Garron',
    speedMult: 1.6,
    body: 'garron',
    coat: 'shag',
    flavor: 'A shaggy mountain pony out of the Hoargate pass, sure footed where coursers balk.',
  },
  // The prestige tier: found, never bought (chest_boss, flat rate per
  // the flood-law). The ladder's top stays under the cap with room.
  {
    id: 'sabercat_night',
    name: 'Night Sabercat',
    speedMult: 1.75,
    body: 'sabercat',
    coat: 'night',
    flavor: 'A deep country cat broken to harness by nobody living, and it remembers that.',
  },
];

const BY_ID = new Map(MOUNTS.map((m) => [m.id, m]));

export function mountDef(id: string): MountDef | undefined {
  return BY_ID.get(id);
}

/** The fastest tiles-per-second any saddle can legally reach. */
export function maxMountSpeed(): number {
  let top = 0;
  for (const m of MOUNTS) top = Math.max(top, m.speedMult * PLAYER_SPEED);
  return top;
}
