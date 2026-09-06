/**
 * THE ASHLAMP (contested lands, band 7) — shell.ts.
 *
 * THE SHELL (brief §2.1; box (52,93)-(62,97)): the waystation that
 * stopped being a room. Three breaches so nobody can say which way
 * the fire came in. The order's lamp cold in its socket, the one
 * ember that still smokes, the beams where the roof went, the ash
 * out the west door, the Company's stake up the morning after, and
 * the board that says only what it says.
 *
 * GROUND (ground.ts): G1 the floor under ash; G2 the ring; G3 the
 * west breach ellipse and the two worn lines.
 * SIGN: THE ASHLAMP. / Struck. at (61,99), listed (pins.SIGN_LEDGER).
 * CAST HOOKS: none. Nobody lives here.
 * LIGHTS: none warm. The cold socket has no light row (lights.ts
 * knows no LampPostDark); the ember's coals breathe from dusk.
 * EMPTY: the interior beyond the lamp, the ember and the beams; the
 * north rows either side of the shell.
 */
import { Tile } from '@arx/shared';
import type { AshCtx } from './ctx.js';

export function shell(ctx: AshCtx): void {
  const { pins } = ctx;
  ctx.box(52, 93, 62, 97, 'shell: THE ASHLAMP');

  // ================================================================
  // PRIMARY: the shell. SENTENCE: the waystation that stopped being a
  // room; three breaches so nobody can say which way the fire came in.
  // ================================================================
  const s = pins.SHELL;
  const breach = new Set(pins.BREACHES.map(([x, y]) => `${x},${y}`));
  for (let x = s.x0; x <= s.x1; x++) {
    for (const y of [s.y0, s.y1]) {
      if (!breach.has(`${x},${y}`)) ctx.put(x, y, Tile.RuinWallStone);
    }
  }
  for (let y = s.y0 + 1; y <= s.y1 - 1; y++) {
    for (const x of [s.x0, s.x1]) {
      if (!breach.has(`${x},${y}`)) ctx.put(x, y, Tile.RuinWallStone);
    }
  }

  // PRIMARY: the order's lamp, cold in its socket. SENTENCE: the one
  // lamp on the road that never lied is out, and the post stands
  // straight. Leif counts it from the gate: the first of the two he
  // chalks. No light row; E7 strikes the renderer's dead case.
  ctx.put(pins.LAMP[0], pins.LAMP[1], Tile.LampPostDark);
  ctx.occluder(pins.LAMP[0], pins.LAMP[1]);

  // SECONDARY: one ember bed that still smokes, in the ash. SENTENCE:
  // somebody sits in the ruin at night; nobody says who. By day it
  // reads by the ash around its bare pan; at dusk it breathes once
  // (beat 9 as shipped). On the north row beside the fallen beam, two
  // open rows from the south wall whose face hid it (fix pass 1).
  ctx.emberBed(pins.EMBER[0], pins.EMBER[1]);

  // SECONDARY: the charred beams where the roof went. SENTENCE: the
  // roof came down inward, which a torch from outside does and a lamp
  // knocked over also does.
  for (const [x, y] of pins.BEAMS) ctx.put(x, y, Tile.CharredBeam);

  // SECONDARY: the ash heap out the west breach. SENTENCE: what was
  // carried out the door. Somebody shovelled. Somebody meant to come
  // back.
  ctx.put(pins.ASH_HEAP[0], pins.ASH_HEAP[1], Tile.AshHeap);

  // SECONDARY: Brede's stake at the scar, east of the east breach.
  // SENTENCE: the Company nailed its stake up the morning after. What
  // hangs on it is the Company's business; Brede says it is the
  // lamp's glass, whole, and that a torch leaves no glass whole
  // (R12: the proof is his tree, the stake is plain).
  ctx.put(pins.STAKE[0], pins.STAKE[1], Tile.TrophyStake);

  // BOARD: THE ASHLAMP. / Struck. SENTENCE: the sign says only what it
  // says. Listed on the shoulder, facing the bed it names; flushed
  // last so no fill can bury it.
  const sg = pins.SIGN_LEDGER.ashlamp;
  ctx.sign(sg.x, sg.y, sg.title, sg.lines, sg.tile);
}
