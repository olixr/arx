/**
 * THE HUSK AND THE WARD LINE (contested lands, band 8) — picket.ts.
 *
 * TORSTEN'S PICKET (brief §2.3; zone `picket`, its own ZoneBuilder):
 * where the hunters' trail leaves the closed wood and the ground
 * opens east to grass, forty tiles past the dire wolf. The order's
 * forward post on the trail, kept by nobody now: the sergeant is at
 * the fork, the picket is his slate, his bell, his lamps and the
 * graves, and he walks down to it every morning to keep the count
 * true (L2's `torsten_fork`, 06:00 to the slate's west cell). No
 * core, no haven, no body. The trail's bed crosses the rect and stays
 * TILE_SKIP; both shoulders are listed only where a lamp, a mound,
 * the rag or the trodden ground stands.
 *
 * THE ORDER: fells → ground (G1-G4) → props → the sign flush (index).
 *
 * GROUND. G1 a Dirt ellipse under the post, trodden by twenty two
 * years of one man standing. G2 a worn line from the east shoulder to
 * the slate. G3 the graves' row is bare grass (the Company dug in a
 * hurry). G4 GrassTall tufts hashed east of the post where nobody
 * walks. THE FELLS (pins.ts says why): the mounds' row and the south
 * pocket, trees only.
 * SIGN: THE TALLY (one board; the fork's is forty tiles north, dy past
 * the eyeful).
 * LIGHTS: the two lamps from dusk (the shipped LampPost row); nothing
 * else — the first lit thing past the wolves and the last on the
 * trail until the cairns.
 * EMPTY: the west shoulder (closed forest, nothing authored); the
 * grass east of the post beyond x -113; the scuff; everything north
 * of the fourth mound. One man stood here. The picket is exactly as
 * big as one man's standing.
 */
import { Tile } from '@arx/shared';
import type { WardCtx } from './ctx.js';

export function picket(ctx: WardCtx): void {
  const { pins } = ctx;
  ctx.box(-124, -140, -113, -120, 'picket: THE PICKET');

  // THE FELLS FIRST. SENTENCE: the Company dug its row where it dug,
  // and the trunk in the row's line came down.
  ctx.fell(pins.MOUND_ROW_FELL, 'picket: THE MOUNDS\' ROW');
  // SENTENCE: the order felled the last trunks between its post and
  // the trail's climb so the slate reads from the bed and the lamps
  // are seen from below.
  ctx.fell(pins.SOUTH_POCKET_FELL, 'picket: THE SOUTH POCKET');

  // G1 THE TRODDEN GROUND. SENTENCE: twenty two years of one man
  // standing wears a patch the shape of him.
  const w = pins.POST_WEAR;
  ctx.wear.ellipse(w.cx, w.cy, w.rx, w.ry);
  // G2 THE WORN LINE. SENTENCE: off the scuff to the slate and back,
  // every morning, one way of walking it.
  ctx.wear.line(pins.SLATE_LINE);
  // The chalking stand and the bench's stand are trodden whatever the
  // hash says: a body that stands there wears its cell.
  ctx.put(pins.SLATE_STAND[0], pins.SLATE_STAND[1], Tile.Dirt);
  ctx.put(pins.BENCH_STAND[0], pins.BENCH_STAND[1], Tile.Dirt);
  // G4 THE TUFTS. SENTENCE: east of the post nobody walks, and the
  // grass says so.
  const t = pins.TUFTS;
  ctx.wear.tufts(t.cx, t.cy, t.rx, t.ry, t.density);

  // PRIMARY: the two lamps flanking the post on the east shoulder.
  // SENTENCE: the order's two lamps on the trail, lit at dusk by the
  // same clock as every lamp in the world. Nobody trims them. They
  // light anyway, because a Waykeeper lamp has never once lied, and
  // that is the whole of the picket's argument.
  for (const [x, y] of pins.LAMPS) {
    ctx.put(x, y, Tile.LampPost);
    ctx.occluder(x, y);
  }

  // PRIMARY: the slate, facing west to the scuff (the sign flush lays
  // the Signpost and its words; the cell is reserved here so nothing
  // else takes it). SENTENCE: the count in his own chalk. Gnolls
  // eleven, wolves seven, ours three with a line through the three.
  // The most accurate map anyone holds, where the trail can read it.
  const s = pins.SIGN_LEDGER.tally;
  ctx.sign(s.at[0], s.at[1], s.title, s.lines, Tile.Signpost);
  // Torsten's chalking stand, the slate's west cell, registered for
  // the occlusion lint (L2's routine stops here).
  ctx.post(pins.SLATE_STAND[0], pins.SLATE_STAND[1]);

  // SECONDARY: the bell on its post. SENTENCE: rung the night the crew
  // walked past. Nobody came, because nobody was posted to. It is
  // still hung, which is a doctrine.
  ctx.put(pins.BELL[0], pins.BELL[1], Tile.TownBell);

  // SECONDARY: the bench nobody sits on, facing west, one south-east
  // of the slate (pins.ts: the border oak's crown). SENTENCE: stone,
  // because a sergeant does not sit on his watch, and a bench because
  // the order's pattern book has one at every post. Torsten has never
  // sat on it (lint.benchUnused). Its west cell is the cardinal stand.
  ctx.put(pins.BENCH[0], pins.BENCH[1], Tile.StoneBench);
  ctx.post(pins.BENCH_STAND[0], pins.BENCH_STAND[1]);

  // PRIMARY: the four mounds along the east shoulder north of the
  // post, a row hugging the scuff. SENTENCE: Roald and two of his, and
  // the wain's boy. They walked past the south lamp at dusk against
  // the count. The Company buried them, in a row, beside the road
  // they said they were paid for.
  ctx.graves(pins.MOUNDS);

  // SECONDARY: the rag on the ring. SENTENCE: only that the Company
  // buried them. Nothing else. It stands on the tier-2 line, which is
  // the threshold marked with a stake and nothing more (§13.1 law 5).
  ctx.put(pins.RAG[0], pins.RAG[1], Tile.RedRagStake);
}
