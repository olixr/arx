import { Rng, Tile, TILE_SKIP } from '@arx/shared';
import { at, blob, put, scatter, track, type Canvas } from './canvas.js';

/**
 * THE MODULE SHELF (the peopled landmarks) — curated set-pieces the
 * landmark builders compose from. Each module is one legible piece of
 * material culture: a fire the camp gathers round, a drum ring, a
 * cage row, a kerbed barrow. They interplace — the same fire circle
 * seats a goblin moot and a brigand yard — and they are built to be
 * READ BY THE RUNTIME: every module stamps the post-sign furniture
 * (fires, dummies, tents, totems, cages, benches) that the compose
 * scan turns into living posted bodies. Author the furniture and the
 * life follows — that is the whole design.
 *
 * Painting laws carried from the founding landmarks: ground first
 * (the claimed-yard lesson — transparent hearts get swallowed), wear
 * before dressing, and NOTHING on the skip perimeter. Modules take
 * their rng so a builder's stream stays one deterministic ribbon.
 */

/**
 * The gathered fire: a trampled ring, the fire at its heart, the
 * cook's tackle beside it. Seats several posted bodies (the compose
 * scan rings the fire). `big` swaps the campfire for the bonfire —
 * the night anchor no blade puts out.
 */
export const fireCircle = (
  c: Canvas,
  cx: number,
  cy: number,
  rng: Rng,
  opts: { big?: boolean; pot?: boolean; spit?: boolean; rack?: boolean } = {},
): void => {
  blob(c, cx, cy, opts.big ? 4 : 3, Tile.Dirt, rng, 0.08);
  put(c, cx, cy, opts.big ? Tile.Bonfire : Tile.Campfire);
  if (opts.pot) put(c, cx - 2, cy, Tile.CookPot);
  if (opts.spit) put(c, cx + 2, cy, Tile.MeatSpit);
  if (opts.rack) put(c, cx + 1, cy - 2, Tile.MeatRack);
};

/**
 * The feast ground: trestle tables in a run, benches drawn up both
 * sides, the stores at the ends. Benches read as rest posts — the
 * table the muster never leaves.
 */
export const feastTrestles = (
  c: Canvas,
  cx: number,
  cy: number,
  len: number,
  rng: Rng,
  opts: { grog?: boolean } = {},
): void => {
  blob(c, cx, cy, Math.ceil(len / 2) + 2, Tile.Dirt, rng, 0.15);
  const half = Math.floor(len / 2);
  for (let dx = -half; dx <= half; dx++) put(c, cx + dx, cy, Tile.Table);
  for (let dx = -half; dx <= half; dx++) {
    if (rng.chance(0.7)) put(c, cx + dx, cy - 1, Tile.Bench);
    if (rng.chance(0.7)) put(c, cx + dx, cy + 1, Tile.Bench);
  }
  // A warren feast pours from the camp's own tub; anyone else
  // brings a proper barrel to table.
  put(c, cx - half - 2, cy, opts.grog ? Tile.GrogTub : rng.chance(0.5) ? Tile.Barrel : Tile.CrateGoods);
  put(c, cx + half + 2, cy, Tile.MeatRack);
};

/** A processional of totems and standards walking a line. */
export const totemRow = (
  c: Canvas,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  step: number,
  rng: Rng,
): void => {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.floor(dist / step));
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n);
    const y = Math.round(y0 + ((y1 - y0) * i) / n);
    put(c, x, y, i % 2 === 0 ? Tile.SkullTotem : Tile.WarBanner);
    if (rng.chance(0.4)) scatter(c, x, y, 1, 1, [Tile.SkullPile], rng);
  }
};

/**
 * The drum ring: the great hide drums circled round a heart cell.
 * Stamp the fire (or the effigy) at the heart yourself — the ring
 * frames whatever the camp answers to.
 */
export const drumRing = (c: Canvas, cx: number, cy: number, r: number, rng: Rng): void => {
  blob(c, cx, cy, r + 2, Tile.Dirt, rng, 0.1);
  const n = 4 + rng.int(0, 2);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.15, 0.15);
    put(c, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.75), Tile.WarDrum);
  }
  // Where drums argue, dice argue louder: half the rings keep a
  // knucklebone pit worn into the ground just east of the beat.
  if (rng.chance(0.5) && at(c, cx + r + 2, cy) === Tile.Dirt) {
    put(c, cx + r + 2, cy, Tile.KnucklePit);
  }
};

/** The cage row: the unlucky kept in a line, a torch to watch them
 *  by — and half the time the keeper's own stock squirming in a
 *  little cage at the row's end (the jailer feeds both). */
export const cageRow = (
  c: Canvas,
  cx: number,
  cy: number,
  n: number,
  rng: Rng,
): void => {
  blob(c, cx, cy, n + 2, Tile.Dirt, rng, 0.2);
  const half = Math.floor((n - 1) / 2);
  for (let i = 0; i < n; i++) put(c, cx + (i - half) * 2, cy, Tile.PrisonCage);
  put(c, cx + (n - half) * 2, cy, Tile.StandingTorch);
  if (rng.chance(0.6)) scatter(c, cx, cy + 1, 2, 2, [Tile.BonePile], rng);
  const kx = cx - (half + 2) * 2 + 2;
  if (rng.chance(0.5) && at(c, kx, cy + 1) === Tile.Dirt) put(c, kx, cy + 1, Tile.CritterCage);
};

/** The watch-knoll: high ground, a torch, a standard, the drill gear. */
export const watchKnoll = (c: Canvas, cx: number, cy: number, rng: Rng): void => {
  blob(c, cx, cy, 4, Tile.Dirt, rng, 0);
  put(c, cx, cy - 1, Tile.StandingTorch);
  put(c, cx + 2, cy + 1, Tile.WarBanner);
  put(c, cx - 2, cy + 1, Tile.SpearRack);
  if (rng.chance(0.5)) put(c, cx, cy + 2, Tile.TargetDummy);
};

/** The beast pens: a broken fence square, nests and gnawed ground. */
export const beastPen = (
  c: Canvas,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  nests: number,
  rng: Rng,
): void => {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (at(c, x, y) === TILE_SKIP || at(c, x, y) === Tile.Grass) put(c, x, y, Tile.Dirt);
    }
  }
  for (let x = x0; x <= x1; x++) {
    if (rng.chance(0.78)) put(c, x, y0, Tile.Fence);
    if (rng.chance(0.78)) put(c, x, y1, Tile.Fence);
  }
  for (let y = y0 + 1; y < y1; y++) {
    if (rng.chance(0.78)) put(c, x0, y, Tile.Fence);
    if (rng.chance(0.78)) put(c, x1, y, Tile.Fence);
  }
  const cx = Math.floor((x0 + x1) / 2);
  const cy = Math.floor((y0 + y1) / 2);
  for (let i = 0; i < nests; i++) {
    put(c, cx + rng.int(-(x1 - x0) / 2 + 1, (x1 - x0) / 2 - 1), cy + rng.int(-1, 1), Tile.BeastNest);
  }
  scatter(c, cx, cy, Math.max(2, (x1 - x0) / 2), 3, [Tile.BonePile], rng);
  // A nested pen holds a PREDATOR — it gets the keeper's iron: the
  // chain stake at the heart, the slopped trough at the rail. A
  // nestless pen is livestock, and livestock get the farmer's feed
  // trough by the farmer's own hand, never ours. Both placements
  // yield to whatever already stands (a nest outranks a stake).
  if (nests > 0) {
    const sx = cx - 1;
    const sy = Math.max(y0 + 1, cy - 1);
    if (at(c, sx, sy) === Tile.Dirt) put(c, sx, sy, Tile.BeastStake);
    const ux = Math.min(x1 - 1, cx + 2);
    if (rng.chance(0.7) && at(c, ux, y1 - 1) === Tile.Dirt) put(c, ux, y1 - 1, Tile.GnawTrough);
  }
};

/** The spoil yard: takes sorted where they were dropped — and, most
 *  raids, the stolen cart they came home on, parked mid-unload. */
export const spoilYard = (c: Canvas, cx: number, cy: number, rng: Rng): void => {
  blob(c, cx, cy, 3, Tile.Dirt, rng, 0.2);
  const props = [Tile.Crate, Tile.Barrel, Tile.PlunderSacks, Tile.CaveRubble];
  scatter(c, cx, cy, 3, 4 + rng.int(0, 2), props, rng);
  if (rng.chance(0.6) && at(c, cx + 2, cy - 1) === Tile.Dirt) put(c, cx + 2, cy - 1, Tile.PlunderCart);
};

/** The drill yard: dummies and racks — the muster keeps its edge. */
export const drillYard = (c: Canvas, cx: number, cy: number, rng: Rng): void => {
  blob(c, cx, cy, 4, Tile.Dirt, rng, 0.1);
  put(c, cx - 2, cy - 1, Tile.TargetDummy);
  put(c, cx + 2, cy - 1, Tile.TargetDummy);
  put(c, cx, cy + 2, Tile.SpearRack);
  if (rng.chance(0.5)) put(c, cx - 3, cy + 2, Tile.WeaponRack);
};

/**
 * A kerbed barrow mound — the founding barrowfield's grammar, shelved
 * so every dead ground buries the same way. Opened barrows spill.
 */
export const kerbMound = (
  c: Canvas,
  mx: number,
  my: number,
  rng: Rng,
  opened: boolean,
): void => {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const edge = Math.abs(dx) === 3 || Math.abs(dy) === 2;
      if (edge) {
        if (opened && dy === 2 && Math.abs(dx) <= 1) put(c, mx + dx, my + dy, Tile.CaveRubble);
        else put(c, mx + dx, my + dy, Tile.Rock);
      } else if (dx === 0 && dy === 0) {
        put(c, mx, my, Tile.BonePile);
      }
    }
  }
  if (opened) scatter(c, mx, my + 4, 3, 2, [Tile.BonePile, Tile.CaveRubble], rng);
};

/** A stone cairn: rough ring, the kept dead at its heart. */
export const cairn = (c: Canvas, cx: number, cy: number, r: number, rng: Rng): void => {
  blob(c, cx, cy, r + 1, Tile.Dirt, rng, 0.25);
  const n = Math.max(6, Math.round(r * 5));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.1, 0.1);
    put(c, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.8), Tile.Rock);
  }
  put(c, cx, cy, rng.chance(0.6) ? Tile.BonePile : Tile.Brazier);
};

/**
 * A trench scar: the ground remembers the war — a worn cut, rubble
 * lips, stakes still bristling where the line held.
 */
export const trenchScar = (
  c: Canvas,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rng: Rng,
): void => {
  track(c, x0, y0, x1, y1, rng);
  track(c, x0, y0 + 1, x1, y1 + 1, rng);
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(2, Math.floor(dist / 4));
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n);
    const y = Math.round(y0 + ((y1 - y0) * i) / n);
    if (rng.chance(0.55)) put(c, x + rng.int(-1, 1), y - 1, Tile.CaveRubble);
    if (rng.chance(0.4)) put(c, x + rng.int(-1, 1), y + 2, Tile.SpikeBarrier);
  }
};

/** Fallen standards along a line — the ranks that never went home. */
export const standardRow = (
  c: Canvas,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  step: number,
  rng: Rng,
): void => {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.floor(dist / step));
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n);
    const y = Math.round(y0 + ((y1 - y0) * i) / n);
    put(c, x, y, Tile.WarBanner);
    if (rng.chance(0.5)) scatter(c, x, y + 1, 1, 1, [Tile.BonePile, Tile.CaveRubble], rng);
  }
};

/** Paired braziers flanking a processional walk. */
export const brazierWalk = (
  c: Canvas,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  step: number,
  rng: Rng,
): void => {
  track(c, x0, y0, x1, y1, rng);
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.floor(dist / step));
  const vertical = Math.abs(y1 - y0) >= Math.abs(x1 - x0);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n);
    const y = Math.round(y0 + ((y1 - y0) * i) / n);
    if (vertical) {
      put(c, x - 2, y, Tile.Brazier);
      put(c, x + 2, y, Tile.Brazier);
    } else {
      put(c, x, y - 2, Tile.Brazier);
      put(c, x, y + 2, Tile.Brazier);
    }
  }
};

/** Bone-lined run: the ossuary's aisle, stacked against a wall line. */
export const ossuaryRun = (
  c: Canvas,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rng: Rng,
): void => {
  const dist = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= dist; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / Math.max(1, dist));
    const y = Math.round(y0 + ((y1 - y0) * i) / Math.max(1, dist));
    if (rng.chance(0.75) && at(c, x, y) !== TILE_SKIP) {
      put(c, x, y, rng.chance(0.8) ? Tile.BonePile : Tile.SkullPile);
    }
  }
};

// --------------------------------------------------------------------
// THE SKRAL SHELF (docs/skral-decor-plan.md — the drowned villages):
// the brine-folk's material culture, shelved so every waterside
// ground works the same way. FOUND, NEVER FELLED — nothing below was
// sawn, forged, or bought. Same post-sign law as the war shelf:
// shelters sleep their tenants, smokers cook, benches and pools and
// pans are KEPT — author the furniture and the village peoples
// itself.

/**
 * The reed hamlet: shelters round a shared fire, the chimes at one
 * door, the withies where a keeper can reach them — the village's
 * bedroom, wet to the ankles.
 */
export const reedHamlet = (
  c: Canvas,
  cx: number,
  cy: number,
  n: number,
  rng: Rng,
): void => {
  blob(c, cx, cy, 5, Tile.Dirt, rng, 0.15);
  put(c, cx, cy, Tile.Campfire);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.3, 0.3);
    put(c, Math.round(cx + Math.cos(a) * 4), Math.round(cy + Math.sin(a) * 3), Tile.ReedShelter);
  }
  // One door hangs its chimes; the stores sit inside the fire's reach.
  put(c, cx + 2, cy - 2, Tile.TideChimes);
  if (rng.chance(0.7)) put(c, cx - 2, cy + 2, Tile.WithyStore);
};

/**
 * The drying ground: rack rows heavy with the catch, the smoker
 * breathing over them, the day's baskets waiting between.
 */
export const dryingGround = (c: Canvas, cx: number, cy: number, rng: Rng): void => {
  blob(c, cx, cy, 4, Tile.Dirt, rng, 0.12);
  for (const dx of [-3, 0, 3] as const) put(c, cx + dx, cy - 1, Tile.FishRack);
  put(c, cx - 2, cy + 1, Tile.CatchBasket);
  put(c, cx + 2, cy + 1, Tile.SmokeTripod);
  if (rng.chance(0.6)) put(c, cx + 4, cy + 2, Tile.ShellMidden);
};

/** The mending row: the works that never end — nets spread mid-
 *  repair, the shell-carver's slab beside them. */
export const mendingRow = (c: Canvas, cx: number, cy: number, rng: Rng): void => {
  blob(c, cx, cy, 4, Tile.Dirt, rng, 0.15);
  put(c, cx - 2, cy, Tile.MendingBench);
  put(c, cx + 2, cy, Tile.ShellBench);
  put(c, cx - 3, cy - 2, Tile.NetFrame);
  put(c, cx + 1, cy - 2, Tile.NetFrame);
  if (rng.chance(0.7)) put(c, cx + 3, cy + 2, Tile.CatchBasket);
};

/**
 * The salt garth: pans in a worked rank, the withies keeping the
 * season's take — the bank's money, laid out to be tended.
 */
export const saltGarth = (c: Canvas, cx: number, cy: number, n: number, rng: Rng): void => {
  blob(c, cx, cy, n + 2, Tile.Dirt, rng, 0.1);
  const half = Math.floor((n - 1) / 2);
  for (let i = 0; i < n; i++) put(c, cx + (i - half) * 3, cy, Tile.SaltPan);
  put(c, cx - half * 3, cy + 2, Tile.WithyStore);
  put(c, cx + half * 3, cy + 2, Tile.CatchBasket);
};

/** The kelp garth: the winter larder swaying on its ranked lines. */
export const kelpGarth = (c: Canvas, cx: number, cy: number, rows: number, rng: Rng): void => {
  blob(c, cx, cy, rows + 2, Tile.Dirt, rng, 0.2);
  const half = Math.floor((rows - 1) / 2);
  for (let i = 0; i < rows; i++) {
    put(c, cx + rng.int(-1, 1), cy + (i - half) * 2, Tile.KelpLine);
  }
};

/** The keep row: live larders in a line along the water's edge —
 *  dark water, circling backs, the tally kept. */
export const keepRow = (c: Canvas, x0: number, y0: number, n: number, rng: Rng): void => {
  for (let i = 0; i < n; i++) {
    blob(c, x0 + i * 3, y0, 2, Tile.Dirt, rng, 0.25);
    put(c, x0 + i * 3, y0, Tile.KeepPool);
  }
  if (rng.chance(0.6)) put(c, x0 + n * 3 - 1, y0 + 1, Tile.CatchBasket);
};

/** The rib shrine: the ancestor's crescent over the tide's own
 *  table, the totems keeping its flanks. */
export const ribShrine = (c: Canvas, cx: number, cy: number, rng: Rng): void => {
  blob(c, cx, cy, 4, Tile.Dirt, rng, 0.1);
  put(c, cx, cy - 2, Tile.WhaleRibs);
  put(c, cx - 2, cy, Tile.TideTotem);
  put(c, cx + 2, cy, Tile.TideTotem);
  put(c, cx, cy, Tile.TideAltar);
};

/**
 * The lure way: the shoal's own street lights pacing a walk — the
 * caged deep-jelly, never a torch (the Drowned Charter's road law).
 * Step generous: the night hierarchy keeps its lights scarce.
 */
export const lureWay = (
  c: Canvas,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  step: number,
  rng: Rng,
): void => {
  track(c, x0, y0, x1, y1, rng);
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.floor(dist / step));
  const vertical = Math.abs(y1 - y0) >= Math.abs(x1 - x0);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n);
    const y = Math.round(y0 + ((y1 - y0) * i) / n);
    const side = i % 2 === 0 ? -2 : 2;
    if (vertical) put(c, x + side, y, Tile.LurePole);
    else put(c, x, y + side, Tile.LurePole);
  }
};

/** The tent cluster: hides around a shared yard, the camp's bedroom.
 *  A full cluster usually sleeps one more body than it has tents —
 *  the rag nest at the yard edge is the tentless cousin's bed. */
export const tentCluster = (
  c: Canvas,
  cx: number,
  cy: number,
  tents: number,
  rng: Rng,
  opts: { war?: boolean } = {},
): void => {
  blob(c, cx, cy, 5, Tile.Dirt, rng, 0.2);
  for (let i = 0; i < tents; i++) {
    const a = (i / tents) * Math.PI * 2 + rng.range(-0.4, 0.4);
    const tx = Math.round(cx + Math.cos(a) * 4);
    const ty = Math.round(cy + Math.sin(a) * 3);
    put(c, tx, ty, opts.war && i === 0 ? Tile.TentWar : Tile.TentHide);
  }
  if (tents >= 3 && rng.chance(0.6) && at(c, cx - 2, cy + 2) === Tile.Dirt) {
    put(c, cx - 2, cy + 2, Tile.RagNest);
  }
};
