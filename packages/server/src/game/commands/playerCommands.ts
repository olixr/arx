/**
 * Player-facing slash commands — no dev gate: the lock toggle and the
 * hearth recall. Moved verbatim from gameServer.chat (foundations F4).
 */
import { SURFACE_PLANE_ID, isRiftPlane } from '@arx/content';
import { DoorInfo, doorInfo } from '@arx/shared';
import { HEARTH_CD_MS } from '../tuning.js';
import type { ChatCommand } from './types.js';

/**
 * THE VERB IS THE CLAIM: a player verb owns its line whatever trails
 * it (`/lock the door` reaches /lock), so the unspoken word only ever
 * names a verb nobody holds.
 */
const verbOf = (text: string): string => text.trim().split(/\s+/)[0] ?? '';

// /lock — toggle the lock on the nearest shut door in reach. A
// player feature, not dev-gated: the first rung of the locking
// ladder (keys and ownership arrive with a later epic).
const cmdLock: ChatCommand = {
  name: '/lock',
  claims: (text) => verbOf(text) === '/lock',
  run(srv, eid, player, text) {
    const sys = (t: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
    const pos = srv.positions.get(eid);
    if (!pos) return;
    const cx = Math.floor(pos.x);
    const cy = Math.floor(pos.y);
    let best: { tx: number; ty: number; info: DoorInfo; d: number } | null = null;
    for (let ty = cy - 2; ty <= cy + 2; ty++) {
      for (let tx = cx - 2; tx <= cx + 2; tx++) {
        const g = srv.worldOf(pos.plane).groundAt(tx, ty);
        const info = g === undefined ? null : doorInfo(g);
        if (!info) continue;
        const dx = tx + 0.5 - pos.x;
        const dy = ty + 0.5 - pos.y;
        const d = dx * dx + dy * dy;
        if (d <= 2.2 * 2.2 && (!best || d < best.d)) best = { tx, ty, info, d };
      }
    }
    if (!best) {
      sys('No door within reach.');
      return;
    }
    if (best.info.open) {
      sys(
        best.info.material === 'fence' ||
          best.info.material === 'palisade' ||
          best.info.material === 'hedge'
          ? 'Close the gate before locking it.'
          : 'Close the door before locking it.',
      );
      return;
    }
    const unit = srv.doorUnit(pos.plane, best.tx, best.ty, best.info);
    const key = `${pos.plane}|${unit.ax},${unit.ay}`;
    // THE AUTHORED KEYS: a boot-seeded faction lock is not the
    // player's to work — it wants a pick or a key, not a word.
    if (srv.authoredLockKeys.has(key)) {
      // ...and once picked or keyed open, it is not the player's to
      // set again — the Court's door stays as the Court left it.
      sys(
        srv.doorLocks.has(key)
          ? 'This lock answers to a key you do not carry.'
          : 'This lock was set by another hand — opened, it stays open.',
      );
      return;
    }
    if (srv.doorLocks.delete(key)) sys('The lock clicks open.');
    else {
      srv.doorLocks.add(key);
      sys('The lock snaps shut.');
    }
    return;
  },
};

// /recall (or /home) — the hearth pull: carry the body back to the
// claimed home bed. A player feature, not dev-gated. Out of combat
// only, and the hearth rests ten minutes between recalls.
const cmdRecall: ChatCommand = {
  name: '/recall',
  claims: (text) => verbOf(text) === '/recall' || verbOf(text) === '/home',
  run(srv, eid, player, text) {
    const sys = (t: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
    if (!player.home) {
      sys('You have no home yet — walk up to a bed and interact with it to claim one.');
      return;
    }
    const now = Date.now();
    if (now - player.lastCombatAt < 8000) {
      sys('The hearth cannot reach you in the heat of battle — break away from combat first.');
      return;
    }
    const left = player.hearthAt + HEARTH_CD_MS - now;
    if (left > 0) {
      const mins = Math.floor(left / 60000);
      const secs = Math.ceil((left % 60000) / 1000);
      sys(
        `The hearth still gathers its strength — ready in ${mins > 0 ? `${mins}m ${secs}s` : `${secs}s`}.`,
      );
      return;
    }
    const bedside = srv.homeBedside(player);
    if (!bedside) {
      sys(
        player.home
          ? 'Your bed is walled in — there is no floor beside it to wake on.'
          : 'Your bed is gone — claim another to recall again.',
      );
      return;
    }
    const pos = srv.positions.get(eid);
    const fromInstance = pos !== undefined && isRiftPlane(pos.plane);
    // The hearth is a surface institution — THE CROSSING carries the
    // body home (a bare teleport when already on the surface).
    srv.transferPlane(eid, SURFACE_PLANE_ID, bedside.x, bedside.y);
    // Recalling out of a personal dungeon ends the run, same as
    // walking its exit portal.
    if (fromInstance) srv.teardownDungeon(player.characterId);
    player.hearthAt = now;
    if (player.characterId > 0) srv.accounts.saveHearthAt(player.characterId, now);
    sys('The world folds around you — you are home.');
    return;
  },
};

export const PLAYER_COMMANDS: readonly ChatCommand[] = [cmdLock, cmdRecall];
