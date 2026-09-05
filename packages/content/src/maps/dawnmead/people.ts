/**
 * DAWNMEAD UNDER SIEGE (band 6) — people.ts [L6 ROADS + PEOPLE].
 *
 * EVERY BODY AND EVERY SPAWN CLUSTER (brief §5, §6). This is the ONE
 * module that calls b.actor and b.npcSpawn; it runs LAST, after every
 * district has kept its posts and stop tiles open, and only because
 * the seven new routine JSONs are registered (routines/registry.ts).
 *
 * THE POST IS THE ORIGIN: every placement is written from pins.POSTS
 * (the sixteen shipped posts verbatim, the seven new ones from the
 * brief) so a body's tile and its routine's offsets argue with one
 * constant. Beds are pins.BEDS (worldFit proves every lie stop lands
 * on a Bed foot with a walkable cardinal stand). The districts already
 * registered every post through ctx.post for the occlusion lint, and
 * the lint reads actorSpawns besides; nothing is registered twice.
 *
 * The clusters are pins.NPC_CLUSTERS, sums pins.NPC_SUMS: chicken 5,
 * cat 1+1, cow 2, sheep 3+2, rat 3+2+2 (knot 3 on the breach apron,
 * ruling 8), mudcrab 3+2. Steinar is NOT placed this band (J20).
 */
import type { DawnCtx } from './ctx.js';

export function people(ctx: DawnCtx): void {
  const { b, pins } = ctx;
  const P = pins.POSTS;
  const place = (key: keyof typeof P): void => {
    const p = P[key];
    b.actor(p.slug, p.x, p.y, p.dir, p.routine);
  };

  // ================================================================
  // THE SIXTEEN SHIPPED LIVES (posts and routines unchanged; two
  // routines gained one slot each, no waypoint moved).
  // ================================================================
  // Wren keeps the Ring from her step, facing the stones; her chair
  // (91,109), her bed (96,101).
  place('keeper_wren');
  // Halla stands the pell yard's sand facing north up the line; the
  // dusk pell round, then the knoll bench (102,139) 19.5-21 (ruling 4),
  // then the lodge's west bunk.
  place('yardmaster_halla');
  // Rill at the shooting line's east end, facing her marks; the shed
  // bed at night.
  place('fletcher_rill');
  // Varn on the spark pad's stone, facing the ring of pillars; his hut
  // at night.
  place('sparkwright_varn');
  // Alder on the copse road outside his door, facing his stands.
  place('forester_alder');
  // Berrit at the cookpot, facing the table she feeds; her cot at night.
  place('cook_berrit');
  // Ottery at the bench, facing his room; the bed behind the shop.
  place('wright_ottery');
  // Gilly behind the bar aisle, facing her common room; the bed by the
  // bar (the guest beds stay the waker's).
  place('innkeep_gilly');
  // Weir on the pier's end, facing the water; the house at night.
  place('angler_weir');
  // Brammel at the field gate facing his beds; the noon stand inside
  // the Common's west gate facing the crofter through it is the added
  // slot; the farmhouse at night.
  place('farmer_brammel');
  // Sorrel at the rail's head facing west along the stalls; the trough
  // stand (142,84); the farmhouse's fourth bed.
  place('drover_sorrel');
  // Tansy on the lane facing east and Wick on the grass facing west:
  // the twins' game across the green; the farmhouse at night by the
  // east track.
  place('twin_tansy');
  place('twin_wick');
  // The ward rota (ruling Pins 2: four bodies of one def): the day
  // ward on the bridge's west foot facing east, THE HOT BUNK at night.
  place('dawnmead_ward_day');
  // The night ward on the green facing the lane, the middle bunk.
  place('dawnmead_ward_night');
  // The dusk ward on the granary meadow facing the shell, the ruin
  // floor loop (147,166), the east bunk.
  place('dawnmead_ward_dusk');

  // ================================================================
  // THE SEVEN NEW LIVES (brief §5; routines new this band).
  // ================================================================
  // THE FOURTH WARD stands the muster line on the court's dirt facing
  // the proving way, seven to a quarter past nineteen, then walks the
  // spur to the lodge and THE FIFTH BUNK (104,185): the muster ward's
  // bed is the one that is warm at nineteen when the day ward is up.
  place('dawnmead_ward_muster');
  // MARGIT at the tally stall on the green's east verge facing the
  // lane, posting the number so anyone can argue with it; at dusk
  // across the forecourt under Gilly's shingle to Hilde's second bed
  // (ruling 5: Gilly refused the chit, Hilde took it).
  place('charter_margit');
  // HILDE on her own step facing the lane; the bell bench at noon to
  // read the oil slate aloud; her own bed, twenty-two years slept in.
  place('returner_hilde');
  // THE THREE FENSIDE CROFTERS, one pooled def, three placements: A by
  // the row's coals facing the lane he came in on, the visible dusk
  // walk home up the whole lane to the crowded roof's middle bed;
  // B at the borrowed pen's gap facing his two ewes, twice a day round
  // the bend to the Common's west gate and back, the east bed; C on
  // the grass outside the Common's west gate facing the ewes he was
  // not given, pacing while Brammel stands inside it, the west bed.
  place('fenside_crofter_row');
  place('fenside_crofter_pen');
  place('fenside_crofter_gate');
  // LEIF, the in-rect body: the tally stake by the milestone facing
  // the village he counts into, chalk out; the stall front and the
  // bell side at midday; at night the stand between the threshold
  // stones (190.5,112.5) facing east, the road he came in by (J12's
  // fallback: the live audit found the out-of-rect target (199.5,112.5)
  // is worldgen grass in the east edge-wood, a thicket, not the First
  // Lamp; the server walks him back through the gate lamps at six).
  place('waykeeper_leif');

  // ================================================================
  // THE SYLLABUS ANIMALS (pins.NPC_CLUSTERS, each with its why).
  // ================================================================
  // Five hens in the coop; the farm cat in the kitchen strip and the
  // working cat on the granary meadow; Brammel's two cows west of the
  // Common and the crofters' three ewes east of it, two more in the
  // borrowed pen; seven rats, three on the ruin floor by the chest,
  // two on the meadow, two on the breach apron so the fight reads from
  // the road; five mudcrabs on the crab bank's two pools.
  for (const c of pins.NPC_CLUSTERS) b.npcSpawn(c.npc, c.x, c.y, c.r, c.n);
}
