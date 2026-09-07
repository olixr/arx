/**
 * THE STILE VERB and THE SLOW CIRCLE (contested lands, band 9e; plan
 * §11.6 FORTY STONES; band9d/blockout.md §6.5; rulings R-G).
 *
 * Law 1 (THE WORLD IS SHARED): the Course is one wall for everyone.
 * The north gap at the Sett's lip is a CourseStile where a course
 * should stand and does not (the stake man's forty came off the north
 * end). A hand holding a course stone sets one there: the stile
 * becomes a CourseWall for everyone (a tile patch in the running
 * world: setWorldTile persists nothing, layFieldLitter's own law, so
 * a restart reopens the gap, which is benign: the circle restarts),
 * the character's flag `course_gap_set` stamps through the one flag
 * choke (the quest's flag objective credits itself there), and THE
 * SLOW CIRCLE queues the gap to open again in ten minutes for
 * everyone (the ward thread's own regrow shape, inverted: the queue
 * restores a NAMED tile, the stile, over the wall it left). The
 * durable state is the coursemother's count (the errand's
 * completions and `forty_carried`); `course_gap_set` itself is SPENT
 * at the turn-in (THE SPENT ASK, gameServer.questTurnIn), so
 * tomorrow's errand asks for a stone again. The errand is repeatable
 * for every character, which is the bible's own sentence (the carter
 * "is carting the same stone twice in a slow circle").
 *
 * Law 2 (THE ROSTER): only a stile in content's COURSE_GAPS answers
 * the stone. Vorl's stile in the weight-yard and every crossing stile
 * on the Course stay crossings: a stone held at one of them is
 * nothing, and no message says so (a stile is a low place a body
 * walks over). A roster stile with no stone in the pack speaks THE
 * RISEN WORD once: "The gap wants a stone."
 *
 * Law 3 (THE REVERSE, melee.ts smashProp): a CourseWall or a
 * PlumbStone that FALLS to a player's hand (the third blow; a swing
 * that clears a room only chips it) stamps `course_broken` on that
 * character, forever. No deed (the Dolmen have no faction, R-E); no
 * message (a people that never asks does not reproach). Forty Stones'
 * offer forbids it. A set stone that falls AT a roster gap regrows as
 * the gap (the stile), never as a wall: the circle stays a circle.
 *
 * Only a player's interact reaches the set; an NPC has no hand on
 * this door and no stone.
 */
import { COURSE_GAPS, SURFACE_PLANE_ID, type PlaneId } from '@arx/content';
import { Tile } from '@arx/shared';
import type { GameServer, PlayerComp } from './gameServer.js';
import { countItem, removeItem } from './inventory.js';

/** The held token (content items.ts): a kerb stone off the Course. */
export const COURSE_STONE = 'course_stone';
/** Stamped by THE SET; read by Forty Stones' `set` stage; spent at its turn-in. */
export const COURSE_GAP_SET = 'course_gap_set';
/** Stamped by THE REVERSE; read by Forty Stones' offer (forbids). */
export const COURSE_BROKEN = 'course_broken';
/** THE SLOW CIRCLE: the set stone stands ten minutes, the thread's own span. */
export const COURSE_REGROW_MS = 600_000;

/** A roster gap: a surface tile in content's COURSE_GAPS (world tiles). */
export function isCourseGap(plane: PlaneId, tx: number, ty: number): boolean {
  if (plane !== SURFACE_PLANE_ID) return false;
  return COURSE_GAPS.some(([x, y]) => x === tx && y === ty);
}

/**
 * THE SET. Returns true when the tile was a roster stile (the verb's
 * own, answered one way or the other); false when the stile is a
 * crossing and the interact means nothing.
 */
export function setCourseGap(
  srv: GameServer,
  player: PlayerComp,
  plane: PlaneId,
  tx: number,
  ty: number,
  dir: number,
): boolean {
  if (srv.worldOf(plane).groundAt(tx, ty) !== Tile.CourseStile) return false;
  if (!isCourseGap(plane, tx, ty)) return false;
  const at = { x: tx + 0.5, y: ty + 0.5 };
  if (countItem(player.inventory, COURSE_STONE) < 1) {
    srv.speak(player, 'Unset', 'The gap wants a stone.', at);
    return true;
  }
  removeItem(player.inventory, COURSE_STONE, 1);
  player.session?.sendJson({ t: 'inv', slots: player.inventory });
  // Fx FIRST (the smash law): the stone kit's burst at the gap, the
  // set's own debris, before the patch that stands the course up.
  srv.broadcastFx(plane, { t: 'fx', kind: 'smash', x: at.x, y: at.y, radius: 0, dir, id: 'stone' });
  srv.setWorldTile(plane, tx, ty, Tile.CourseWall);
  srv.setPlayerFlag(player, COURSE_GAP_SET);
  srv.respawnQueue.push({
    at: Date.now() + COURSE_REGROW_MS,
    plane,
    tx,
    ty,
    tile: Tile.CourseStile,
    over: Tile.CourseWall,
  });
  return true;
}
