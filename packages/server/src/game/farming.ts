/**
 * THE TENDED EARTH'S ENGINE — plots, watering, feed and fleece: the crops, bins, troughs, apiaries, livestock and the working benches of the farm.
 * Moved verbatim off GameServer (foundations F4); the class keeps
 * one-line delegators so every caller and test slate reads unchanged.
 */
import { Session } from '../net/session.js';
import { addItem, countItem, hasSpaceFor, removeItem, takeSlot } from './inventory.js';
import { APIARY_FLOWER_RANGE, APIARY_MINUTES, APIARY_STORE_CAP, BOND_CAP, BOND_PRIME, BRUSH_COOLDOWN_MS, BRUSH_XP, CHANNEL_FEED_RANGE, COMPOST_BATCH_WORTH, COMPOST_MINUTES, CROP_BY_SEED, GRADED_PRODUCE, GROWTH_SEEDS, LIVESTOCK, LIVESTOCK_BY_CRATE, LIVESTOCK_CAP, MULCH_FIBRE_COST, PRUNED_BIT, SOIL_ENRICHED, SOIL_RICH, SURFACE_PLANE_ID, TROUGH_FEED_CAP, TROUGH_STOCK_CAP, WORK_BATCH_CAP, WORK_RECIPES, WORK_STATION_TILES, apiaryGrade, bedTileFor, compostWorthOf, feedWorthOf, gradeFor, gradeOf, gradedId, growMs, harvestXp, itemDef, npcDef, stageEndMs, stageForElapsed, tileForStage, wateringsOf, workDone, workOutputId } from '@arx/content';
import { CHUNK_SIZE, EntityId, PoseState, Tile } from '@arx/shared';
import type { CropState, FarmBinState, GameServer, HarvestAction, LivestockComp, LivestockRow, NpcComp, PlayerComp } from './gameServer.js';
import { MILK_TICKS, MIN_GATHER_TICKS } from './tuning.js';

/** THE ONE CARE MIRROR: every session hears a field's facts change. */
export function mirrorPlot(srv: GameServer, state: CropState): void {
  const info = {
    tx: state.tx,
    ty: state.ty,
    w: state.watered,
    soil: state.soil,
    m: state.mulched,
    f: state.framed,
  };
  for (const s of srv.sessions) s.sendJson({ t: 'farm', plots: [info] });
}

export function mirrorBin(srv: GameServer, bin: FarmBinState): void {
  const info = {
    tx: bin.tx,
    ty: bin.ty,
    fill: bin.fill,
    graded: bin.graded,
    readyAt: bin.startedAt === 0 ? 0 : bin.startedAt + COMPOST_MINUTES * 60_000,
  };
  for (const s of srv.sessions) s.sendJson({ t: 'farm', bins: [info] });
}

/** The whole farm's care facts, for a fresh session. */
export function sendFarm(srv: GameServer, session: Session): void {
  const plots = [...srv.crops.values()]
    .filter((c) => c.watered !== 0 || c.soil !== 0 || c.mulched !== 0 || c.framed !== 0)
    .map((c) => ({ tx: c.tx, ty: c.ty, w: c.watered, soil: c.soil, m: c.mulched, f: c.framed }));
  const bins = [...srv.farmBins.values()].map((b) => ({
    tx: b.tx,
    ty: b.ty,
    fill: b.fill,
    graded: b.graded,
    readyAt: b.startedAt === 0 ? 0 : b.startedAt + COMPOST_MINUTES * 60_000,
  }));
  const troughs = [...srv.farmTroughs.values()].map((t) => ({
    tx: t.tx,
    ty: t.ty,
    feed: t.feed,
  }));
  const jobs = [...srv.farmJobs.values()]
    .filter((j) => j.qty > 0)
    .map((j) => ({ tx: j.tx, ty: j.ty, recipe: j.recipe, qty: j.qty, startedAt: j.startedAt, grade: j.grade }));
  const apiaries = [...srv.farmApiaries.values()].map((a) => ({ tx: a.tx, ty: a.ty, since: a.since }));
  if (plots.length > 0 || bins.length > 0 || troughs.length > 0 || jobs.length > 0 || apiaries.length > 0) {
    session.sendJson({ t: 'farm', plots, bins, troughs, jobs, apiaries });
  }
}

/**
 * Apply one watering to a growing crop's CURRENT stage: sets the
 * stage's watered bit and credits 35% of the stage's remainder.
 * Pays no XP itself — hand-watering pays at its call site, the fed
 * channel deliberately never does (the automation law).
 */
export function waterCrop(srv: GameServer, state: CropState, now: number): boolean {
  // The dark bed drinks nothing (shade culture keeps its own law).
  if (state.def.bed === 'log') return false;
  const effective = srv.cropElapsed(state, now);
  const stage = stageForElapsed(state.def, effective);
  if (stage === 2) return false;
  const bit = 1 << stage;
  if (state.watered & bit) return false;
  const stageEnd = stageEndMs(state.def, stage as 0 | 1);
  state.watered |= bit;
  state.boostMs += Math.max(0, Math.round((stageEnd - effective) * 0.35));
  srv.saveCrop(state);
  srv.mirrorPlot(state);
  return true;
}

/**
 * THE FED CHANNEL: is this plot beside a live irrigation channel
 * (adjacent channel tile with a well within its feed range)?
 */
export function irrigatedAt(srv: GameServer, tx: number, ty: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (srv.surface.groundAt(tx + dx, ty + dy) !== Tile.IrrigationChannel) continue;
      if (srv.wellNear(tx + dx, ty + dy, CHANNEL_FEED_RANGE)) return true;
    }
  }
  return false;
}

/**
 * Work compost into a planted crop's soil. One tier per act: plain
 * compost enriches plain ground; prime compost makes any ground
 * rich. Deterministic, once each — never a repeatable faucet.
 */
export function fertilize(srv: GameServer, eid: EntityId, tx: number, ty: number): void {
  const player = srv.players.get(eid);
  const pos = srv.positions.get(eid);
  if (!player || !pos || player.session === null) return;
  const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });
  if (player.characterId < 0) {
    sys('Guests cannot tend crops. Make an account!');
    return;
  }
  const dx = tx + 0.5 - pos.x;
  const dy = ty + 0.5 - pos.y;
  if (dx * dx + dy * dy > 2.2 * 2.2) return;
  if (srv.refuseFarmingOffSurface(player, pos)) return;
  const state = srv.crops.get(`${tx},${ty}`);
  if (!state) {
    if (srv.surface.groundAt(tx, ty) === Tile.Tilled) {
      sys('Plant first. The soil takes its meal through roots.');
    }
    return;
  }
  if (state.def.bed === 'log') {
    sys('The log asks for shade, nothing more.');
    return;
  }
  const stage = stageForElapsed(state.def, srv.cropElapsed(state, Date.now()));
  if (stage === 2) {
    sys('It has grown all it will. Harvest it.');
    return;
  }
  if (state.soil >= SOIL_RICH) {
    sys('The soil is as rich as it gets.');
    return;
  }
  // Plain compost lifts plain ground; prime compost makes any
  // ground rich outright. The cheaper meal is spent first so a
  // carried prime barrow is never wasted on a half step.
  if (state.soil < SOIL_ENRICHED && removeItem(player.inventory, 'compost', 1) === 1) {
    state.soil = SOIL_ENRICHED;
    sys('You work compost into the soil.');
  } else if (removeItem(player.inventory, 'prime_compost', 1) === 1) {
    state.soil = SOIL_RICH;
    sys('You work prime compost in. The ground turns dark and willing.');
  } else {
    sys(
      state.soil >= SOIL_ENRICHED
        ? 'Only prime compost can better this ground.'
        : 'You need compost in your pack.',
    );
    return;
  }
  // THE PLOT PAYS FOR ITS TIME: tending pays a tenth, same as water.
  srv.grantXp(eid, player, 'farming', Math.ceil(state.def.xp / 10));
  srv.setPose(eid, PoseState.Gather, 20);
  srv.saveCrop(state);
  srv.mirrorPlot(state);
  player.session.sendJson({ t: 'inv', slots: player.inventory });
}

/** Lay a fibre blanket around a growing crop. Once per planting. */
export function mulch(srv: GameServer, eid: EntityId, tx: number, ty: number): void {
  const player = srv.players.get(eid);
  const pos = srv.positions.get(eid);
  if (!player || !pos || player.session === null) return;
  const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });
  if (player.characterId < 0) {
    sys('Guests cannot tend crops. Make an account!');
    return;
  }
  const dx = tx + 0.5 - pos.x;
  const dy = ty + 0.5 - pos.y;
  if (dx * dx + dy * dy > 2.2 * 2.2) return;
  if (srv.refuseFarmingOffSurface(player, pos)) return;
  const state = srv.crops.get(`${tx},${ty}`);
  if (!state) return;
  if (state.def.bed === 'log') {
    sys('The log asks for shade, nothing more.');
    return;
  }
  const stage = stageForElapsed(state.def, srv.cropElapsed(state, Date.now()));
  if (stage === 2) {
    sys('It has grown all it will. Harvest it.');
    return;
  }
  if (state.mulched) {
    sys('A mulch blanket already lies here.');
    return;
  }
  // Count BEFORE removing: removeItem takes what it can, and a
  // short pack must not lose its last strand to a refusal.
  if (countItem(player.inventory, 'plant_fibre') < MULCH_FIBRE_COST) {
    sys('Mulch wants plant fibre. Two strands to a blanket.');
    return;
  }
  removeItem(player.inventory, 'plant_fibre', MULCH_FIBRE_COST);
  state.mulched = 1;
  srv.setPose(eid, PoseState.Gather, 20);
  srv.grantXp(eid, player, 'farming', Math.ceil(state.def.xp / 10));
  srv.saveCrop(state);
  srv.mirrorPlot(state);
  player.session.sendJson({ t: 'inv', slots: player.inventory });
  sys('You lay a fibre blanket around the stems.');
}

/**
 * THE ORCHARD'S KNIFE: cut a recurring crop's deadwood mid-cycle.
 * Costs nothing, pays tending XP, and banks one care point toward
 * the cycle's grade — once per cycle behind its own mask bit.
 */
export function prune(srv: GameServer, eid: EntityId, tx: number, ty: number): void {
  const player = srv.players.get(eid);
  const pos = srv.positions.get(eid);
  if (!player || !pos || player.session === null) return;
  const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });
  if (player.characterId < 0) {
    sys('Guests cannot tend crops. Make an account!');
    return;
  }
  const dx = tx + 0.5 - pos.x;
  const dy = ty + 0.5 - pos.y;
  if (dx * dx + dy * dy > 2.2 * 2.2) return;
  if (srv.refuseFarmingOffSurface(player, pos)) return;
  const state = srv.crops.get(`${tx},${ty}`);
  if (!state || !state.def.recurring) return;
  const stage = stageForElapsed(state.def, srv.cropElapsed(state, Date.now()));
  if (stage === 2) {
    sys('Pick the fruit first. Then the knife.');
    return;
  }
  if (state.watered & PRUNED_BIT) {
    sys('The wood is already clean this season.');
    return;
  }
  state.watered |= PRUNED_BIT;
  srv.grantXp(
    eid,
    player,
    'farming',
    Math.ceil(harvestXp(state.def, state.cycles) / 10),
  );
  srv.setPose(eid, PoseState.Gather, 20);
  srv.saveCrop(state);
  srv.mirrorPlot(state);
  sys('You cut the deadwood away. The tree breathes.');
}

export function mirrorJob(srv: GameServer, job: { tx: number; ty: number; recipe: string; qty: number; startedAt: number; grade: number }): void {
  for (const s of srv.sessions) {
    s.sendJson({
      t: 'farm',
      jobs: [{ tx: job.tx, ty: job.ty, recipe: job.recipe, qty: job.qty, startedAt: job.startedAt, grade: job.grade }],
    });
  }
}

export function mirrorApiary(srv: GameServer, tx: number, ty: number, since: number): void {
  for (const s of srv.sessions) s.sendJson({ t: 'farm', apiaries: [{ tx, ty, since }] });
}

/**
 * Load a batch: prove the tile and recipe, gate the level, consume
 * inputs highest-grade-first, and set the clock. Every refusal is
 * spoken; nothing is consumed before the last gate passes.
 */
export function workStart(srv: GameServer, eid: EntityId, tx: number, ty: number, recipeId: string, qty: number): void {
  const player = srv.players.get(eid);
  const pos = srv.positions.get(eid);
  if (!player || !pos || player.session === null) return;
  const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });
  if (player.characterId < 0) {
    sys('Guests cannot work the yard. Make an account!');
    return;
  }
  const dx = tx + 0.5 - pos.x;
  const dy = ty + 0.5 - pos.y;
  if (dx * dx + dy * dy > 2.6 * 2.6) return;
  if (srv.refuseFarmingOffSurface(player, pos)) return;
  const ground = srv.surface.groundAt(tx, ty);
  const station = ground === undefined ? undefined : WORK_STATION_TILES.get(ground as Tile);
  const recipe = WORK_RECIPES.get(recipeId);
  if (!station || !recipe || recipe.station !== station) return;
  const key = `${tx},${ty}`;
  const existing = srv.farmJobs.get(key);
  if (existing && existing.qty > 0) {
    srv.speak(
      player,
      'Still working',
      'The station is already working. Collect first.',
      { x: tx + 0.5, y: ty + 0.5 },
      'note',
    );
    return;
  }
  const level = srv.effectiveLevel(player, recipe.skill);
  if (level < recipe.levelReq) {
    srv.speak(
      player,
      `Needs ${recipe.skill} ${recipe.levelReq}`,
      `You need ${recipe.skill} level ${recipe.levelReq} for ${recipe.name.toLowerCase()}.`,
    );
    return;
  }
  const batch = Math.min(qty, WORK_BATCH_CAP);
  // Count first (nothing spent on a refusal): each input unit may
  // be satisfied by any grade of its family.
  const familyCount = (base: string): number => {
    let n = 0;
    for (const s of player.inventory) {
      if (!s || s.stolen) continue;
      if (gradeOf(s.item).base === base) n += s.qty;
    }
    return n;
  };
  for (const input of recipe.inputs) {
    if (familyCount(input.item) < input.qty * batch) {
      sys(`Short of ${itemDef(input.item)?.name.toLowerCase() ?? input.item} for ${batch}.`);
      return;
    }
  }
  // Consume highest grades first; the batch records its weakest.
  let batchGrade: number | null = null;
  for (const input of recipe.inputs) {
    const gradable = GRADED_PRODUCE.has(input.item);
    for (let u = 0; u < input.qty * batch; u++) {
      let taken = -1;
      for (const g of [2, 1, 0] as const) {
        const id = g === 0 ? input.item : gradedId(input.item, g);
        if (removeItem(player.inventory, id, 1) === 1) {
          taken = g;
          break;
        }
      }
      if (taken === -1) return; // raced; counts said otherwise
      if (gradable) batchGrade = batchGrade === null ? taken : Math.min(batchGrade, taken);
    }
  }
  const job = {
    tx,
    ty,
    recipe: recipeId,
    qty: batch,
    startedAt: Date.now(),
    grade: batchGrade ?? 0,
    owner: player.characterId,
  };
  srv.farmJobs.set(key, job);
  srv.accounts.upsertStationJob(tx, ty, recipeId, batch, job.startedAt, job.grade, job.owner);
  srv.mirrorJob(job);
  // A beat of body at the vessel: the loading read (the client's
  // 'tend' choreography at the station tile).
  srv.setPose(eid, PoseState.Craft, 24);
  player.session.sendJson({ t: 'inv', slots: player.inventory });
  sys(`The ${itemDef(recipe.output.item)?.name.toLowerCase() ?? recipe.output.item} work begins. It runs while you wander.`);
}

/**
 * The interact door for a working station: hand over whatever has
 * matured (owner only), and let the rest keep working.
 */
export function interactWorkStation(srv: GameServer, 
  eid: EntityId,
  player: PlayerComp,
  tx: number,
  ty: number,
  sys: (text: string) => void,
): void {
  const wsPos = srv.positions.get(eid);
  if (!wsPos || srv.refuseFarmingOffSurface(player, wsPos)) return;
  const key = `${tx},${ty}`;
  const job = srv.farmJobs.get(key);
  if (!job || job.qty <= 0) {
    sys('The station stands idle. Load it and let it work.');
    return;
  }
  const recipe = WORK_RECIPES.get(job.recipe);
  if (!recipe) return;
  if (job.owner !== player.characterId) {
    sys('This batch is another hand\'s work.');
    return;
  }
  const now = Date.now();
  const done = workDone(recipe, job.startedAt, job.qty, now);
  if (done <= 0) {
    const mins = Math.max(1, Math.ceil((job.startedAt + recipe.minutes * 60_000 - now) / 60_000));
    sys(`The work goes on. About ${mins} min to the next measure.`);
    return;
  }
  const itemId = workOutputId(recipe, job.grade as 0 | 1 | 2);
  for (let i = 0; i < done * recipe.output.qty; i++) {
    if (addItem(player.inventory, itemId, 1) === 0) {
      srv.spawnDrop(SURFACE_PLANE_ID, itemId, 1, tx + 0.5, ty + 0.5, eid);
    }
  }
  srv.grantXp(eid, player, recipe.skill, recipe.xp * done);
  job.qty -= done;
  job.startedAt += done * recipe.minutes * 60_000;
  if (job.qty <= 0) {
    srv.farmJobs.delete(key);
    srv.accounts.deleteStationJob(tx, ty);
    srv.mirrorJob({ tx, ty, recipe: job.recipe, qty: 0, startedAt: 0, grade: 0 });
  } else {
    srv.accounts.upsertStationJob(tx, ty, job.recipe, job.qty, job.startedAt, job.grade, job.owner);
    srv.mirrorJob(job);
  }
  srv.setPose(eid, PoseState.Craft, 24);
  player.session?.sendJson({ t: 'inv', slots: player.inventory });
  sys(
    `You collect ${done * recipe.output.qty} ${itemDef(itemId)?.name.toLowerCase() ?? itemId}${job.qty > 0 ? `. ${job.qty} still working.` : '. The station rests.'}`,
  );
}

/**
 * THE HIVE: honey and wax on the bees' own clock, graded by the
 * real flowers standing near when you lift the lid.
 */
export function interactApiary(srv: GameServer, 
  eid: EntityId,
  player: PlayerComp,
  tx: number,
  ty: number,
  sys: (text: string) => void,
): void {
  if (player.characterId < 0) return;
  const hivePos = srv.positions.get(eid);
  if (!hivePos || srv.refuseFarmingOffSurface(player, hivePos)) return;
  const built = srv.surface.builtAt(tx, ty);
  if (built && built.owner !== player.characterId) {
    sys('These bees answer another keeper.');
    return;
  }
  const key = `${tx},${ty}`;
  const now = Date.now();
  const hive = srv.farmApiaries.get(key) ?? { tx, ty, since: now };
  if (!srv.farmApiaries.has(key)) {
    // First touch starts the clock (a fresh hive settles in).
    srv.farmApiaries.set(key, hive);
    srv.accounts.upsertFarmApiary(tx, ty, hive.since);
    srv.mirrorApiary(tx, ty, hive.since);
    sys('The bees settle into the new box. Give them time.');
    return;
  }
  const units = Math.min(APIARY_STORE_CAP, Math.floor((now - hive.since) / (APIARY_MINUTES * 60_000)));
  if (units <= 0) {
    const mins = Math.max(1, Math.ceil((hive.since + APIARY_MINUTES * 60_000 - now) / 60_000));
    sys(`The comb is thin yet. About ${mins} min.`);
    return;
  }
  // Count the flowers the bees actually work: flower boxes and the
  // blooming crops (sunflower, moonbell, dawnveil) in the hive's
  // range. World-state only — plant a garden, sweeten the honey.
  let flowers = 0;
  for (let fy = ty - APIARY_FLOWER_RANGE; fy <= ty + APIARY_FLOWER_RANGE; fy++) {
    for (let fx = tx - APIARY_FLOWER_RANGE; fx <= tx + APIARY_FLOWER_RANGE; fx++) {
      const g = srv.surface.groundAt(fx, fy);
      if (
        g === Tile.FlowerBox ||
        g === Tile.SunflowerMid ||
        g === Tile.SunflowerRipe ||
        g === Tile.MoonbellMid ||
        g === Tile.MoonbellRipe ||
        g === Tile.DawnveilMid ||
        g === Tile.DawnveilRipe
      ) {
        flowers++;
      }
    }
  }
  const grade = apiaryGrade(flowers);
  const honeyId = grade > 0 ? gradedId('honey', grade) : 'honey';
  for (let i = 0; i < units; i++) {
    if (addItem(player.inventory, honeyId, 1) === 0) srv.spawnDrop(SURFACE_PLANE_ID, honeyId, 1, tx + 0.5, ty + 0.5, eid);
    if (addItem(player.inventory, 'beeswax', 1) === 0) srv.spawnDrop(SURFACE_PLANE_ID, 'beeswax', 1, tx + 0.5, ty + 0.5, eid);
  }
  srv.grantXp(eid, player, 'farming', 12 * units);
  hive.since = now;
  srv.accounts.upsertFarmApiary(tx, ty, hive.since);
  srv.mirrorApiary(tx, ty, hive.since);
  player.session?.sendJson({ t: 'inv', slots: player.inventory });
  sys(
    grade === 2
      ? 'The comb runs heavy and bright. The garden did srv.'
      : grade === 1
        ? 'Good comb, sweetened by the flowers near.'
        : 'You take fair comb. Bees do better beside a garden.',
  );
}

/** Stand a kept animal in the world beside its trough. */
export function spawnLivestockEntity(srv: GameServer, row: LivestockRow): EntityId | null {
  const def = npcDef(row.species);
  if (!def || !LIVESTOCK.has(row.species)) return null;
  srv.surface.ensure(Math.floor(row.tx / CHUNK_SIZE), Math.floor(row.ty / CHUNK_SIZE));
  // Scatter the herd on the trough's south apron, dealt by slot so
  // a yard reloads into the same loose arrangement.
  const x = row.tx + 0.5 + ((row.slot % 3) - 1) * 1.2 + ((row.slot * 7) % 5) * 0.1;
  const y = row.ty + 1.6 + Math.floor(row.slot / 3) * 1.1;
  const eid = srv.spawnNpc(def, SURFACE_PLANE_ID, x, y, -1);
  srv.livestock.set(eid, {
    row,
    shornShown: row.species === 'sheep' ? row.nextProduceAt > Date.now() : undefined,
  });
  const npc = srv.npcs.get(eid);
  if (npc) {
    npc.nextProduceAt = row.nextProduceAt;
    // A kept hen lays for the hand, never the ground: the registry
    // pays at the Gather, so the wild lay clock stays dark.
    npc.nextLayAt = 0;
  }
  return eid;
}

/**
 * THE FLEECE TELLS THE TIME — the slow wool clock (~1s beat). A
 * kept sheep's body shows its produce state to every watcher:
 * clipped after the shear, a full cloud once the wool regrows.
 * The shear itself broadcasts at the payout; this sweep carries
 * the regrow (and any dev lever that hurries the clock), speaking
 * on the meta channel only when the state actually flips.
 */
export function tickFleece(srv: GameServer, now: number): void {
  for (const [stockEid, comp] of srv.livestock) {
    if (comp.row.species !== 'sheep') continue;
    const npc = srv.npcs.get(stockEid);
    if (!npc) continue;
    const shorn = npc.nextProduceAt > now;
    if (shorn !== (comp.shornShown ?? false)) {
      comp.shornShown = shorn;
      srv.broadcastMetaUpdate(stockEid);
    }
  }
}

export function mirrorTrough(srv: GameServer, trough: { tx: number; ty: number; feed: number }): void {
  for (const s of srv.sessions) {
    s.sendJson({ t: 'farm', troughs: [{ tx: trough.tx, ty: trough.ty, feed: trough.feed }] });
  }
}

/**
 * Release a crated young at the keeper's own trough — the buy's
 * second half (useItem routes crates here, slot-addressed).
 */
export function releaseLivestock(srv: GameServer, 
  eid: EntityId,
  player: PlayerComp,
  slotIndex: number,
  crateId: string,
): void {
  const sys = (text: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text });
  const ldef = LIVESTOCK_BY_CRATE.get(crateId)!;
  if (player.characterId < 0) {
    sys('Guests cannot keep animals. Make an account!');
    return;
  }
  const pos = srv.positions.get(eid);
  if (!pos) return;
  // The trough within arm's reach that YOU raised is the yard.
  let trough: { tx: number; ty: number } | null = null;
  for (let dy = -2; dy <= 2 && !trough; dy++) {
    for (let dx = -2; dx <= 2 && !trough; dx++) {
      const tx = Math.floor(pos.x) + dx;
      const ty = Math.floor(pos.y) + dy;
      if (srv.surface.groundAt(tx, ty) !== Tile.FeedTrough) continue;
      const built = srv.surface.builtAt(tx, ty);
      if (built && built.owner === player.characterId) trough = { tx, ty };
    }
  }
  if (!trough) {
    sys('Release it at your own feed trough. The yard is the animal\'s home.');
    return;
  }
  const level = srv.effectiveLevel(player, 'beastcraft');
  if (level < ldef.levelReq) {
    srv.speak(
      player,
      `Needs beastcraft ${ldef.levelReq}`,
      `You need beastcraft level ${ldef.levelReq} to keep a ${ldef.name.toLowerCase()}.`,
    );
    return;
  }
  if (srv.livestockCountFor(player.characterId) >= LIVESTOCK_CAP) {
    srv.speak(player, 'Yards full', 'Your yards are full. Lead one away first.');
    return;
  }
  if (srv.livestockAtTrough(trough.tx, trough.ty) >= TROUGH_STOCK_CAP) {
    sys('This trough feeds all it can. Raise another.');
    return;
  }
  // First free slot is the animal's identity forever.
  const used = new Set<number>();
  for (const comp of srv.livestock.values()) {
    if (comp.row.characterId === player.characterId) used.add(comp.row.slot);
  }
  let slot = -1;
  for (let i = 0; i < LIVESTOCK_CAP; i++) {
    if (!used.has(i)) {
      slot = i;
      break;
    }
  }
  if (slot === -1) return;
  if (!takeSlot(player.inventory, slotIndex, 1)) return;
  const row: LivestockRow = {
    characterId: player.characterId,
    slot,
    species: ldef.species,
    name: ldef.name,
    tx: trough.tx,
    ty: trough.ty,
    bond: 0,
    brushedAt: 0,
    nextProduceAt: Date.now() + ldef.produce.cooldownSec * 1000,
    bornAt: Date.now(),
  };
  srv.accounts.saveLivestock(row);
  srv.spawnLivestockEntity(row);
  player.session?.sendJson({ t: 'inv', slots: player.inventory });
  // The naming card opens on the ceremony — the pet card, reused.
  player.session?.sendJson({ t: 'stockname', slot, species: ldef.species });
  sys(`The ${ldef.name.toLowerCase()} steps into your yard and looks around, deciding things.`);
}

/**
 * The whole yard conversation, in one cascade: another keeper's
 * animal offers a word of refusal; the lead walks yours away; a
 * ready udder or fleece opens the collect action (the milking
 * rail, reused whole); an open brush window pays the bond; else
 * the animal tells you how it is doing.
 */
export function interactLivestock(srv: GameServer, 
  eid: EntityId,
  player: PlayerComp,
  targetEid: EntityId,
  npc: NpcComp,
  comp: LivestockComp,
  sys: (text: string) => void,
): void {
  const row = comp.row;
  const ldef = LIVESTOCK.get(row.species)!;
  if (row.characterId !== player.characterId) {
    srv.speak(
      player,
      'Not yours',
      `${row.name} belongs to another yard.`,
      srv.positions.get(targetEid) ?? undefined,
    );
    return;
  }
  const now = Date.now();
  if (now >= npc.nextProduceAt) {
    if (!hasSpaceFor(player.inventory, ldef.produce.item)) {
      srv.speak(player, 'Pack full', 'Your pack is full.');
      return;
    }
    const pos = srv.positions.get(eid);
    const npos = srv.positions.get(targetEid);
    if (!pos || !npos) return;
    if (player.action) srv.cancelAction(eid, player);
    const ticks = Math.max(
      MIN_GATHER_TICKS,
      Math.round(MILK_TICKS / srv.gatherSpeedOf(player)),
    );
    player.action = { kind: 'milk', targetEid, ticksLeft: ticks };
    pos.dir = Math.atan2(npos.y - pos.y, npos.x - pos.x);
    npc.holdUntilTick = srv.tickCount + ticks + 20;
    srv.poses.set(eid, PoseState.Milk);
    player.session?.sendJson({ t: 'action', state: 'start', ticks });
    return;
  }
  if (now - row.brushedAt >= BRUSH_COOLDOWN_MS * player.perks.brushRestMult) {
    row.brushedAt = now;
    if (row.bond < BOND_CAP) row.bond += 1;
    srv.accounts.saveLivestock(row);
    srv.grantXp(eid, player, 'beastcraft', BRUSH_XP);
    sys(`You brush ${row.name} down. ${row.bond >= BOND_PRIME ? 'It would follow you anywhere it could.' : 'It leans into the strokes.'}`);
    return;
  }
  // THE LEAD WAITS ITS TURN: it fires only when the animal has
  // nothing else to offer — a keeper carrying one can still milk,
  // shear, and brush their own yard (the harness caught the lead
  // eating the first-ever interact; a farewell must never outrank
  // the living work). Half the crate's worth comes back.
  if (countItem(player.inventory, 'drovers_lead') > 0) {
    removeItem(player.inventory, 'drovers_lead', 1);
    const refund = Math.floor((itemDef(ldef.crateItem)?.value ?? 0) / 2);
    if (refund > 0) addItem(player.inventory, 'coins', refund);
    srv.accounts.deleteLivestock(row.characterId, row.slot);
    srv.livestock.delete(targetEid);
    srv.removeFromChunks(targetEid);
    srv.ecs.destroy(targetEid);
    player.session?.sendJson({ t: 'inv', slots: player.inventory });
    sys(`You lead ${row.name} back to the drover trade. The yard is quieter for it.`);
    return;
  }
  const mins = Math.max(1, Math.ceil((npc.nextProduceAt - now) / 60_000));
  sys(`${row.name} is content. Nothing to ${ldef.produce.verb.toLowerCase()} yet (about ${mins} min).`);
}

/**
 * Feed one pack slot's item into a compost bin. Slot-addressed; the
 * bin, the worth, and the idle state are all re-proved here.
 */
export function compostAdd(srv: GameServer, eid: EntityId, tx: number, ty: number, slot: number): void {
  const player = srv.players.get(eid);
  const pos = srv.positions.get(eid);
  if (!player || !pos || player.session === null) return;
  const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });
  if (player.characterId < 0) {
    sys('Guests cannot use the bin. Make an account!');
    return;
  }
  const dx = tx + 0.5 - pos.x;
  const dy = ty + 0.5 - pos.y;
  if (dx * dx + dy * dy > 2.2 * 2.2) return;
  if (srv.refuseFarmingOffSurface(player, pos)) return;
  if (srv.surface.groundAt(tx, ty) !== Tile.CompostBin) return;
  const key = `${tx},${ty}`;
  const bin = srv.farmBins.get(key) ?? { tx, ty, fill: 0, graded: 0, startedAt: 0 };
  if (bin.startedAt !== 0) {
    sys(
      Date.now() >= bin.startedAt + COMPOST_MINUTES * 60_000
        ? 'The batch is done. Turn the bin out first.'
        : 'The bin is working. Let it be.',
    );
    return;
  }
  const held = player.inventory[slot];
  if (!held) return;
  if (held.stolen) {
    sys('Not with goods that would burn an honest heap.');
    return;
  }
  const worth = compostWorthOf(held.item, itemDef(held.item));
  if (!worth) {
    sys('That has no place in the bin.');
    return;
  }
  takeSlot(player.inventory, slot, 1);
  bin.fill += worth.worth;
  bin.graded += worth.graded;
  if (bin.fill >= COMPOST_BATCH_WORTH - player.perks.compostDiscount) {
    bin.startedAt = Date.now();
    sys('The lid closes. The heap sets to work.');
  }
  srv.farmBins.set(key, bin);
  srv.accounts.upsertFarmBin(tx, ty, bin.fill, bin.graded, bin.startedAt);
  srv.mirrorBin(bin);
  srv.setPose(eid, PoseState.Craft, 24);
  player.session.sendJson({ t: 'inv', slots: player.inventory });
}

/**
 * Load one pack slot's feed into a trough. Anyone may feed a
 * neighbor's manger (the watering law's generosity); the door
 * proves the tile, the worth, and the cap.
 */
export function troughAdd(srv: GameServer, eid: EntityId, tx: number, ty: number, slot: number): void {
  const player = srv.players.get(eid);
  const pos = srv.positions.get(eid);
  if (!player || !pos || player.session === null) return;
  const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });
  if (player.characterId < 0) {
    sys('Guests cannot tend the yard. Make an account!');
    return;
  }
  const dx = tx + 0.5 - pos.x;
  const dy = ty + 0.5 - pos.y;
  if (dx * dx + dy * dy > 2.2 * 2.2) return;
  if (srv.refuseFarmingOffSurface(player, pos)) return;
  if (srv.surface.groundAt(tx, ty) !== Tile.FeedTrough) return;
  const key = `${tx},${ty}`;
  const trough = srv.farmTroughs.get(key) ?? { tx, ty, feed: 0 };
  if (trough.feed >= TROUGH_FEED_CAP) {
    srv.speak(player, 'Manger full', 'The manger is heaped full.', {
      x: tx + 0.5,
      y: ty + 0.5,
    });
    return;
  }
  const held = player.inventory[slot];
  if (!held) return;
  if (held.stolen) {
    sys('Not with goods that would sour an honest manger.');
    return;
  }
  const worth = feedWorthOf(held.item, gradeOf, (base) => GRADED_PRODUCE.has(base));
  if (worth === null) {
    srv.speak(
      player,
      "Won't eat that",
      'The herd has no use for that.',
      { x: tx + 0.5, y: ty + 0.5 },
      'note',
    );
    return;
  }
  takeSlot(player.inventory, slot, 1);
  trough.feed = Math.min(TROUGH_FEED_CAP, trough.feed + worth);
  srv.farmTroughs.set(key, trough);
  srv.accounts.upsertFarmTrough(tx, ty, trough.feed);
  srv.mirrorTrough(trough);
  srv.setPose(eid, PoseState.Craft, 24);
  player.session.sendJson({ t: 'inv', slots: player.inventory });
  sys('You fill the manger. Somebody noticed immediately.');
}

/** Plant a seed into a tilled plot (instant; the growing takes time). */
export function plant(srv: GameServer, eid: EntityId, tx: number, ty: number, seed: string): void {
  const player = srv.players.get(eid);
  const pos = srv.positions.get(eid);
  if (!player || !pos || player.session === null) return;
  const sys = (text: string) => player.session!.sendJson({ t: 'chat', channel: 'system', text });

  if (player.characterId < 0) {
    sys('Guests cannot plant crops — make an account!');
    return;
  }
  const dx = tx + 0.5 - pos.x;
  const dy = ty + 0.5 - pos.y;
  if (dx * dx + dy * dy > 2.2 * 2.2) return;
  if (srv.refuseFarmingOffSurface(player, pos)) return;

  srv.surface.ensure(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
  const ground = srv.surface.groundAt(tx, ty);
  const key = `${tx},${ty}`;
  if (srv.crops.has(key)) return; // someone beat you to the plot
  // THE SOWN LINE (second-growth Phase 4): tree and bush seeds skip
  // the crop rows and join the wild's own growth ledger instead.
  const species = GROWTH_SEEDS.get(seed);
  if (species !== undefined) {
    if (ground !== Tile.Tilled) {
      sys('Wild seeds want open tilled earth.');
      return;
    }
    srv.plantWild(eid, player, tx, ty, seed, species, sys);
    return;
  }
  const def = CROP_BY_SEED.get(seed);
  if (!def) return;
  // THE BED LAW (Phase 2): tilled-bed crops take a garden plot or a
  // growing frame; the dark bed's spores take only a laid log.
  if (def.bed === 'log') {
    if (ground !== Tile.MushroomLog) {
      sys('Spores want a laid mushroom log.');
      return;
    }
  } else if (ground !== Tile.Tilled && ground !== Tile.GrowingFrame) {
    srv.speak(player, 'Needs tilled soil', 'Seeds need a tilled garden plot.');
    return;
  }
  if (def.recurring && ground === Tile.GrowingFrame) {
    sys('A tree wants open sky, not a frame.');
    return;
  }
  const level = srv.effectiveLevel(player, 'farming');
  if (level < def.levelReq) {
    srv.speak(
      player,
      `Needs farming ${def.levelReq}`,
      `You need farming level ${def.levelReq} to plant ${def.name.toLowerCase()}.`,
    );
    return;
  }
  if (removeItem(player.inventory, seed, 1) === 0) return;

  const state: CropState = {
    def,
    tx,
    ty,
    plantedAt: Date.now(),
    boostMs: 0,
    watered: 0,
    owner: player.characterId,
    lastStage: 0,
    soil: 0,
    mulched: 0,
    framed: ground === Tile.GrowingFrame ? 1 : 0,
    cycles: 0,
  };
  const sproutTile = tileForStage(def, 0);
  srv.crops.set(key, state);
  srv.surface.registerCropTile(tx, ty, sproutTile);
  srv.saveCrop(state);
  srv.setWorldTile(SURFACE_PLANE_ID, tx, ty, sproutTile);
  if (state.framed) srv.mirrorPlot(state);
  srv.grantXp(eid, player, 'farming', Math.max(1, Math.ceil(def.xp / 4)));
  srv.setPose(eid, PoseState.Gather, 20);
  player.session.sendJson({ t: 'inv', slots: player.inventory });
  sys(`You plant ${def.name.toLowerCase()}. Ready in about ${def.growMinutes} min.`);
}

export function tickHarvest(srv: GameServer, eid: EntityId, player: PlayerComp): void {
  const action = player.action! as HarvestAction;
  const key = `${action.tx},${action.ty}`;
  const state = srv.crops.get(key);
  // Demolished, /grow-raced, or otherwise gone from under us.
  if (!state || srv.surface.groundAt(action.tx, action.ty) !== state.def.matureTile) {
    srv.cancelAction(eid, player, 'gone');
    return;
  }
  if (--action.ticksLeft > 0) return;

  const def = state.def;
  const roll = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
  // Pack overflow spills onto the plot rather than vanishing.
  const giveOrDrop = (item: string, qty: number) => {
    const added = addItem(player.inventory, item, qty);
    if (added < qty) {
      srv.spawnDrop(SURFACE_PLANE_ID, item, qty - added, action.tx + 0.5, action.ty + 0.5, eid);
    }
  };
  // Bounty doubles the basket some seasons; Green Thumb sometimes
  // hands next season back with it.
  let yieldQty = roll(def.yield.min, def.yield.max);
  if (Math.random() < player.perks.doubleHarvestChance) yieldQty *= 2;
  // THE DEEPER SIGIL: the plot answers a yield working the same way
  // the ore seam does.
  yieldQty += srv.bodyMoment(eid, player, 'gather', {
    x: action.tx + 0.5,
    y: action.ty + 0.5,
    style: 'farming',
  });
  // THE CARE FOLD: the grade was earned across the planting's whole
  // life — waterings, soil, mulch, and (orchards) the prune — and
  // is decided here, once, deterministically. A graded harvest is
  // its own item id. The dark bed never grades (no care facts).
  const grade =
    def.bed === 'log'
      ? 0
      : gradeFor(
          wateringsOf(state.watered),
          state.soil,
          state.mulched,
          state.watered & PRUNED_BIT ? 1 : 0,
        );
  giveOrDrop(grade > 0 ? gradedId(def.yield.item, grade) : def.yield.item, yieldQty);
  if (grade > 0) {
    player.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text: grade === 2 ? 'A prime harvest. The care shows.' : 'A fine harvest.',
    });
  }
  // THE ORCHARD SHAPE: a recurring crop stands after the pick. Pay
  // the cycle (first pick pays the whole growth), re-aim the clock
  // into the mid stage, reset the cycle's own care bits (water and
  // prune re-earn; soil and mulch feed the STANDING plant), and let
  // the world see the tree again, fruitless and patient.
  if (def.recurring) {
    // The pruned wood sometimes strikes as a new cutting.
    const cuttings = roll(def.seedReturn.min, def.seedReturn.max);
    if (cuttings > 0) giveOrDrop(def.seedItem, cuttings);
    srv.grantXp(eid, player, 'farming', harvestXp(def, state.cycles));
    state.cycles += 1;
    state.plantedAt = Date.now();
    state.boostMs = growMs(def) - def.recurring.cooldownMinutes * 60_000;
    state.watered = 0;
    state.lastStage = 1;
    srv.crops.set(key, state);
    srv.saveCrop(state);
    srv.surface.registerCropTile(action.tx, action.ty, def.midTile);
    srv.setWorldTile(SURFACE_PLANE_ID, action.tx, action.ty, def.midTile);
    srv.mirrorPlot(state);
    player.session?.sendJson({ t: 'inv', slots: player.inventory });
    srv.cancelAction(eid, player, 'done');
    return;
  }
  let seeds = roll(def.seedReturn.min, def.seedReturn.max);
  if (Math.random() < player.perks.seedRefundChance) seeds += 1;
  if (seeds > 0) giveOrDrop(def.seedItem, seeds);
  srv.grantXp(eid, player, 'farming', def.xp);

  srv.crops.delete(key);
  srv.accounts.deleteCrop(action.tx, action.ty);
  srv.surface.unregisterCropTile(action.tx, action.ty);
  srv.setWorldTile(SURFACE_PLANE_ID, action.tx, action.ty, bedTileFor(def, state.framed === 1));
  // The care mirror lets go of the harvested row.
  for (const s of srv.sessions) {
    s.sendJson({ t: 'farm', remove: [{ tx: action.tx, ty: action.ty }] });
  }
  player.session?.sendJson({ t: 'inv', slots: player.inventory });
  srv.cancelAction(eid, player, 'done');
}

/** Advance planted crops; the slow tick calls this every 2s. */
export function tickCrops(srv: GameServer, now: number): void {
  for (const state of srv.crops.values()) {
    // THE FED CHANNEL: a live irrigation line waters the stage on
    // its own, before the stage math so the credit lands the moment
    // the channel can give it. Pays NO XP — the automation law.
    // The watered-bit gate comes first: a slaked stage never pays
    // for the channel scan again. A framed row is ALWAYS watered
    // (the frame's cloth holds the damp in) — same law, no scan.
    {
      const st = stageForElapsed(state.def, srv.cropElapsed(state, now));
      if (
        st < 2 &&
        !(state.watered & (1 << st)) &&
        (state.framed === 1 || srv.irrigatedAt(state.tx, state.ty))
      ) {
        srv.waterCrop(state, now);
      }
    }
    const stage = stageForElapsed(state.def, srv.cropElapsed(state, now));
    if (stage > state.lastStage) {
      state.lastStage = stage;
      const tile = tileForStage(state.def, stage);
      srv.surface.registerCropTile(state.tx, state.ty, tile);
      srv.setWorldTile(SURFACE_PLANE_ID, state.tx, state.ty, tile);
    }
  }
}
