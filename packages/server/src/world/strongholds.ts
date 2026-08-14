import {
  DARK_BAND_Y,
  STRONGHOLD_DEFS,
  dangerLaw,
  groundProbeAt,
  strongholdGates,
  territoryLatticeFamily,
  territoryLatticePoint,
  type PrefabDef,
  type StrongholdDef,
  type ZoneDef,
} from '@arx/content';
import {
  TILE_DEFS,
  TILE_SKIP,
  Tile,
  chestInfo,
  closedChestTile,
  dangerAt,
  hashCoords,
  type DangerAnchor,
} from '@arx/shared';
import { intersectsRings, intersectsZones, type ClaimRing, type PoiZoneRect } from './pois.js';

/**
 * THE CAPITAL LAW (docs/strongholds-plan.md Phase 3) — one stronghold
 * per territory country, seated PURELY from the seed at the country's
 * own lattice point (its voronoi heart — the deepest interior the
 * country is guaranteed to have). Any cell can consult the seat with
 * zero ledger coordination: scarce by construction, present by
 * construction, deterministic forever.
 *
 * THE SEAT IS GEOLOGIC: tier reads the STATIC settled anchors, never
 * live havens — a lamp lighting nearby must not un-seat a standing
 * citadel. Countries whose heart sits at tier < 3 keep no capital
 * (settled lands stay settled); countries whose family has no layout
 * on the repository shelf (the kobold) keep camps only.
 *
 * THE RELAXED SITING: a whole-cell footprint can never demand every
 * tile standable (the Phase-0 audit: statistically impossible and
 * ~400k probes). The wall conforms to the land instead — a sampled
 * probe grid tolerates rough ground up to a fraction, and only the
 * GATES demand honest aprons: the doors players search for always
 * open onto walkable earth.
 */

/** The seat stream's salt (beside ST_FOUNDRY 0x501e70). */
export const ST_CAPITAL = 0x501e71;

/** Materialize/decide reach beyond the interest window, in tiles. */
export const CAPITAL_PAD_TILES = 192;

/** Mask reach around a capital's rect (the intersectsZones dialect). */
export const CAPITAL_CLEARANCE = 24;

/** Sampled probe stride over the footprint. */
const PROBE_STRIDE = 4;

/** Fraction of sampled probes allowed to refuse (water/rock pockets). */
const ROUGH_GROUND_MAX = 0.15;

/** Jittered anchor candidates per seat. */
const SEAT_TRIES = 8;

export interface CapitalSeat {
  gx: number;
  gy: number;
  /** Anchor (footprint center), world tiles. */
  x: number;
  y: number;
  rect: { x: number; y: number; w: number; h: number };
  family: string;
  tier: number;
  layoutId: string;
}

export interface SeatCtx {
  anchors: readonly DangerAnchor[];
  zoneRects: readonly PoiZoneRect[];
  claimRings: readonly ClaimRing[];
  layouts: readonly StrongholdDef[];
  prefabs: ReadonlyMap<string, PrefabDef>;
  /**
   * THE ONE ATLAS LAW: the territory field's family roster — the POI
   * def atlas's families, NOT the layout shelf's. The capital must
   * agree with the country under it, and the country is named by the
   * same sorted roster every other reader indexes. A country whose
   * family has no layout (the kobold) lawfully keeps no capital.
   */
  families: readonly string[];
}

/**
 * The capital of the country whose lattice cell is (gx, gy), or null
 * when the country keeps none. Pure: same seed, same answer, forever
 * (claim rings are the one live input — the server invalidates its
 * cache when they change, exactly the ring-cache discipline).
 */
export function strongholdSeat(
  seed: number,
  gx: number,
  gy: number,
  ctx: SeatCtx,
): CapitalSeat | null {
  const { px, py, hash } = territoryLatticePoint(seed, gx, gy);
  const family = territoryLatticeFamily(hash, ctx.families);
  if (!family) return null;
  const tier = dangerAt(seed, Math.round(px), Math.round(py), ctx.anchors);
  if (tier < 3) return null;
  const pool = ctx.layouts.filter(
    (d) => d.family === family && d.weight > 0 && tier >= d.tiers[0] && tier <= d.tiers[1],
  );
  if (pool.length === 0) return null;
  const base = hashCoords((seed ^ ST_CAPITAL) >>> 0, gx, gy);
  const totalW = pool.reduce((n, d) => n + d.weight, 0);
  let roll = ((hashCoords(base, 0x1a, 0) % 10000) / 10000) * totalW; // epoch 0 — layoutForSeat re-rolls later ages
  let layout = pool[pool.length - 1]!;
  for (const d of pool) {
    if (roll < d.weight) {
      layout = d;
      break;
    }
    roll -= d.weight;
  }
  const prefab = ctx.prefabs.get(layout.prefab);
  if (!prefab) return null;
  const halfW = Math.floor(prefab.width / 2);
  const halfH = Math.floor(prefab.height / 2);
  // THE LONG WAR: the epoch re-deals which layout stands here, so the
  // MASK rect covers the widest walls the family pool could raise —
  // pure and epoch-free, while the standing zone uses its own dims.
  let maskW = prefab.width;
  let maskH = prefab.height;
  for (const d of pool) {
    const pp = ctx.prefabs.get(d.prefab);
    if (!pp) continue;
    if (pp.width > maskW) maskW = pp.width;
    if (pp.height > maskH) maskH = pp.height;
  }
  const gates = strongholdGates(prefab);

  for (let attempt = 0; attempt < SEAT_TRIES; attempt++) {
    const jx = attempt === 0 ? 0 : (hashCoords(base, attempt, 3) % 81) - 40;
    const jy = attempt === 0 ? 0 : (hashCoords(base, attempt, 7) % 81) - 40;
    const ax = Math.round(px) + jx;
    const ay = Math.round(py) + jy;
    const x0 = ax - halfW;
    const y0 = ay - halfH;
    if (y0 + prefab.height >= DARK_BAND_Y - CAPITAL_CLEARANCE) continue;
    if (intersectsZones(x0, y0, prefab.width, prefab.height, ctx.zoneRects, CAPITAL_CLEARANCE)) {
      continue;
    }
    if (intersectsRings(x0, y0, prefab.width, prefab.height, ctx.claimRings)) continue;
    // The sampled grid: the wall conforms to the land, but only so far.
    let probes = 0;
    let rough = 0;
    for (let sy = 0; sy < prefab.height; sy += PROBE_STRIDE) {
      for (let sx = 0; sx < prefab.width; sx += PROBE_STRIDE) {
        probes++;
        const probe = groundProbeAt(seed, x0 + sx, y0 + sy);
        if (probe !== 'grass' && probe !== 'forest') rough++;
      }
    }
    if (rough / probes > ROUGH_GROUND_MAX) continue;
    // THE FOUND DOOR, honored by the land: every gate apron walkable.
    let apronsOk = true;
    for (const g of gates) {
      // Outward = away from the footprint center on the dominant axis.
      const dx = g.x - halfW;
      const dy = g.y - halfH;
      const ox = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0;
      const oy = ox === 0 ? Math.sign(dy) || 1 : 0;
      for (let step = 1; step <= 3 && apronsOk; step++) {
        const probe = groundProbeAt(seed, x0 + g.x + ox * step, y0 + g.y + oy * step);
        if (probe !== 'grass' && probe !== 'forest') apronsOk = false;
      }
      if (!apronsOk) break;
    }
    if (!apronsOk) continue;
    return {
      gx,
      gy,
      x: ax,
      y: ay,
      rect: {
        x: ax - Math.floor(maskW / 2),
        y: ay - Math.floor(maskH / 2),
        w: maskW,
        h: maskH,
      },
      family,
      tier,
      layoutId: layout.id,
    };
  }
  return null; // the country keeps no capital this age — honest scarcity
}

/**
 * The layout the seat deals AT AN EPOCH — epoch 0 is the seat's own
 * layoutId; an epoch turn rolls the family pool again, so returning
 * players find new walls on the old ground (THE LONG WAR).
 */
export function layoutForSeat(
  seed: number,
  seat: CapitalSeat,
  epoch: number,
  layouts: readonly StrongholdDef[],
): StrongholdDef | undefined {
  const pool = layouts.filter(
    (d) =>
      d.family === seat.family && d.weight > 0 && seat.tier >= d.tiers[0] && seat.tier <= d.tiers[1],
  );
  if (pool.length === 0) return undefined;
  const base = hashCoords((seed ^ ST_CAPITAL) >>> 0, seat.gx, seat.gy);
  const totalW = pool.reduce((n, d) => n + d.weight, 0);
  let roll = ((hashCoords(base, 0x1a, epoch) % 10000) / 10000) * totalW;
  let layout = pool[pool.length - 1]!;
  for (const d of pool) {
    if (roll < d.weight) {
      layout = d;
      break;
    }
    roll -= d.weight;
  }
  return layout;
}

/** Lattice indices whose seats could reach a tile rect (rect + mask pad). */
export function capitalLatticeRange(
  x: number,
  y: number,
  w: number,
  h: number,
): { gx0: number; gy0: number; gx1: number; gy1: number } {
  const SPAN = 384;
  // A seat wanders ≤ ~40 from its lattice point, plus half a 120
  // footprint, plus the clearance: 40 + 60 + 24 < 128 of padding.
  const reach = 128;
  return {
    gx0: Math.floor((x - reach) / SPAN),
    gy0: Math.floor((y - reach) / SPAN),
    gx1: Math.floor((x + w + reach) / SPAN),
    gy1: Math.floor((y + h + reach) / SPAN),
  };
}

/**
 * Compose a capital into its ZoneDef — the layout stamped verbatim
 * (walls, wards, terraces), the muster dealt from the knots on the
 * seat's own streams. THE WALLS ARE AUTHORED, THE WAR IS DEALT.
 *
 * Phase 3 deals the whole muster (every ward manned, levels from the
 * tier band, the chief crowned from the name pool — stable forever);
 * Phase 4 adds the chapters: ward tags, patrols, optional-ward rolls,
 * and the ward-break ceremony.
 */
export function composeStronghold(
  seed: number,
  seat: CapitalSeat,
  layout: StrongholdDef,
  prefab: PrefabDef,
  epoch = 0,
  stage = 0,
): ZoneDef {
  const { width: w, height: h } = prefab;
  // The zone stands on ITS OWN dims centered at the anchor — the seat
  // rect is the MASK (widest walls the pool could raise), not the zone.
  const originX = seat.x - Math.floor(w / 2);
  const originY = seat.y - Math.floor(h / 2);
  const ground = prefab.ground.slice();
  const detail = prefab.detail.slice();
  const flat = prefab.elev.every((e) => e === 0);
  const law = dangerLaw(seat.tier);
  // The muster folds the EPOCH: same walls, never the same siege —
  // an epoch turn re-deals which optional wards are manned, the knot
  // counts, and the watch (THE WALLS ARE AUTHORED, THE WAR IS DEALT).
  const musterBase = hashCoords(
    hashCoords((seed ^ ST_CAPITAL) >>> 0, seat.x, seat.y),
    epoch,
    0x9c1,
  );

  // The cache: re-keyed one law up (a capital pays above its tier's
  // camps — gilded at 3, boss at 4+), warded by the standing garrison
  // (the gameServer wires the ward to this zone's fighters).
  const cacheKind = dangerLaw(Math.min(seat.tier + 1, 5)).chest;
  for (let i = 0; i < ground.length; i++) {
    const info = chestInfo(ground[i]!);
    if (info && !info.open) ground[i] = closedChestTile(cacheKind);
  }

  const spawns: ZoneDef['spawns'] = [];
  const rollLevel = (streamA: number, streamB: number, offset = 0): number =>
    law.npcLevel[0] +
    (hashCoords(musterBase, streamA, streamB) % (law.npcLevel[1] - law.npcLevel[0] + 1)) +
    offset;
  // A tile a patrol can pace: the composed ground, transparent cells
  // reading as the meadow they will be.
  const paceable = (lx: number, ly: number): boolean => {
    if (lx < 1 || ly < 1 || lx >= w - 1 || ly >= h - 1) return false;
    const t = ground[ly * w + lx]!;
    if (t === TILE_SKIP) return true;
    const def = TILE_DEFS[t as Tile];
    return def ? !def.solid : false;
  };
  // THE PATROL LOOPS: a 'wall' ward walks a ring around its own yard
  // (the gate watch making rounds); a 'lane' ward paces between its
  // yard and the hearth plaza — the moving pull that crosses the knot
  // gaps on a clock (the shipped waypoint machinery does the rest).
  const patrolLoop = (ward: StrongholdDef['wards'][number]): Array<{ x: number; y: number }> => {
    const wcx = ward.rect.x + ward.rect.w / 2;
    const wcy = ward.rect.y + ward.rect.h / 2;
    const pts: Array<{ x: number; y: number }> = [];
    if (ward.patrol === 'wall') {
      const r = Math.max(6, Math.min(ward.rect.w, ward.rect.h) / 2 + 3);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const lx = Math.round(wcx + Math.cos(a) * r);
        const ly = Math.round(wcy + Math.sin(a) * r * 0.8);
        if (paceable(lx, ly)) pts.push({ x: originX + lx, y: originY + ly });
      }
    } else {
      for (const t of [0.2, 0.4, 0.6, 0.8]) {
        const lx = Math.round(wcx + (w / 2 - wcx) * t);
        const ly = Math.round(wcy + (h / 2 - wcy) * t);
        if (paceable(lx, ly)) pts.push({ x: originX + lx, y: originY + ly });
      }
    }
    return pts.length >= 3 ? pts : []; // degrade to the post (the POI law)
  };
  const bossWardIdx = layout.wards.findIndex((wd) => wd.key === layout.boss.ward);
  let sentryBoosts = 0;
  layout.wards.forEach((ward, wi) => {
    // THE WAR IS DEALT: an optional ward rolls manned or empty per
    // epoch — same walls, different watch. The last stand never rolls.
    // THE FREQUENCY LAW at citadel scale: boldness RE-MANS the empty
    // wards (stage 3 mans everything) — busier, never deadlier.
    if (ward.optional && hashCoords(musterBase, wi, 0xd1) % 100 >= 65 + stage * 12) return;
    const loop = ward.patrol ? patrolLoop(ward) : [];
    ward.knots.forEach((knot, ki) => {
      if (knot.minTier !== undefined && seat.tier < knot.minTier) return;
      const span = knot.band[1] - knot.band[0] + 1;
      const count = knot.band[0] + (hashCoords(musterBase, wi * 31 + ki, 0x9e) % span);
      // Boldness thickens the watch: up to `stage` sentry knots gain
      // one body, capped at the PULL LAW's knot ceiling of 3.
      const bolder =
        knot.role === 'sentry' && stage > 0 && sentryBoosts < stage && count < 3 ? 1 : 0;
      if (bolder > 0) sentryBoosts++;
      spawns.push({
        x: originX + knot.at[0],
        y: originY + knot.at[1],
        npc: knot.npc,
        count: count + bolder,
        radius: 2.5,
        level: rollLevel(wi * 31 + ki, 0xa1, knot.levelOffset ?? 0),
        wing: wi,
        ...(knot.role === 'sentry' && loop.length > 0 ? { patrol: loop } : {}),
        ...(knot.hours ? { hours: knot.hours } : {}),
      });
    });
  });
  // The chief: crowned once, named forever (the names-pool law).
  const bossName = layout.boss.names[hashCoords(musterBase, 0xb0, 0x55) % layout.boss.names.length]!;
  spawns.push({
    x: originX + layout.boss.at[0],
    y: originY + layout.boss.at[1],
    npc: layout.boss.npc,
    count: 1,
    radius: 1.5,
    level: law.npcLevel[1] + (layout.boss.levelOffset ?? 0),
    name: bossName,
    ...(bossWardIdx >= 0 ? { wing: bossWardIdx } : {}),
  });

  // THE SEAT'S NAME: the world knows the place by its title, rolled
  // per standing (the epoch folds in — new walls take a new name).
  const title =
    layout.titles && layout.titles.length > 0
      ? layout.titles[hashCoords(musterBase, 0x71e, 0x9) % layout.titles.length]!
      : layout.name;
  return {
    id: `stronghold:${seat.gx},${seat.gy}`,
    name: title,
    origin: { x: originX, y: originY },
    width: w,
    height: h,
    ground,
    detail,
    ...(flat ? {} : { elev: prefab.elev.slice() }),
    growth: 'wild',
    portals: [],
    spawns,
    actorSpawns: [],
    signs: [],
  };
}

/** The world key of a capital's lattice cell. */
export function capitalKey(gx: number, gy: number): string {
  return `${gx},${gy}`;
}

/** True when any capital rect (+ clearance) covers the tile rect. */
export function capitalMasked(
  x: number,
  y: number,
  w: number,
  h: number,
  capitals: readonly { x: number; y: number; w: number; h: number }[],
): boolean {
  for (const c of capitals) {
    if (
      x < c.x + c.w + CAPITAL_CLEARANCE &&
      c.x - CAPITAL_CLEARANCE < x + w &&
      y < c.y + c.h + CAPITAL_CLEARANCE &&
      c.y - CAPITAL_CLEARANCE < y + h
    ) {
      return true;
    }
  }
  return false;
}

/** The live layout roster + registry read, resolved at call time. */
export function strongholdLayouts(): StrongholdDef[] {
  return [...STRONGHOLD_DEFS.values()];
}
