import {
  STRONGHOLD_DEFS,
  STRONGHOLD_MAX_DIM,
  dangerLaw,
  groundProbeAt,
  shoreProbeAt,
  strongholdGates,
  territoryLatticeFamily,
  territoryLatticePoint,
  type PrefabDef,
  type StrongholdDef,
  type ZoneDef,
  FRONTIER,
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
import { CAPITAL_CLEARANCE, siteScan, type ClaimRing, type PoiZoneRect } from './pois.js';

// The clearance was born here; THE ONE SITING SCAN moved it to
// pois.ts (the import arrow only points one way) — re-exported so
// every historical importer keeps its door.
export { CAPITAL_CLEARANCE };

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

/**
 * Sampled probe stride over the footprint — scaled so a zone-size
 * prefab (Second Charter, up to 184/axis) costs the same probe budget
 * a 120 footprint did at stride 4.
 */
const probeStride = (dim: number): number => Math.max(4, Math.round(dim / 30));

/** Jittered anchor candidates per seat (12 — big walls miss more). */
const SEAT_TRIES = 12;

/** A seat anchor wanders at most this far from its lattice point. */
const SEAT_JITTER = 40;

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
  if (tier < FRONTIER.capitalTierFloor) return null;
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

  // THE NEIGHBOR LAW (Second Charter): zone-scale walls can reach a
  // neighboring country's seat envelope. When two envelopes could
  // collide, the lower lattice hash keeps its seat and the other
  // country lawfully yields — deterministic from the same purity both
  // countries already share, with zero probes spent on the neighbor.
  const stride = probeStride(Math.max(prefab.width, prefab.height));
  const yieldToNeighbor = (rect: { x: number; y: number; w: number; h: number }): boolean => {
    for (let dgy = -1; dgy <= 1; dgy++) {
      for (let dgx = -1; dgx <= 1; dgx++) {
        if (dgx === 0 && dgy === 0) continue;
        const n = territoryLatticePoint(seed, gx + dgx, gy + dgy);
        if (n.hash >= hash) continue; // we outrank them — stand
        const nFamily = territoryLatticeFamily(n.hash, ctx.families);
        if (!nFamily) continue;
        const nPool = ctx.layouts.filter((d) => d.family === nFamily && d.weight > 0);
        if (nPool.length === 0) continue;
        let nw = 0;
        let nh = 0;
        for (const d of nPool) {
          const pp = ctx.prefabs.get(d.prefab);
          if (!pp) continue;
          if (pp.width > nw) nw = pp.width;
          if (pp.height > nh) nh = pp.height;
        }
        if (nw === 0) continue;
        const envX = Math.round(n.px) - SEAT_JITTER - Math.floor(nw / 2);
        const envY = Math.round(n.py) - SEAT_JITTER - Math.floor(nh / 2);
        const envW = nw + SEAT_JITTER * 2;
        const envH = nh + SEAT_JITTER * 2;
        if (
          rect.x < envX + envW + CAPITAL_CLEARANCE &&
          envX - CAPITAL_CLEARANCE < rect.x + rect.w &&
          rect.y < envY + envH + CAPITAL_CLEARANCE &&
          envY - CAPITAL_CLEARANCE < rect.y + rect.h
        ) {
          return true;
        }
      }
    }
    return false;
  };

  for (let attempt = 0; attempt < SEAT_TRIES; attempt++) {
    const jx = attempt === 0 ? 0 : (hashCoords(base, attempt, 3) % (SEAT_JITTER * 2 + 1)) - SEAT_JITTER;
    const jy = attempt === 0 ? 0 : (hashCoords(base, attempt, 7) % (SEAT_JITTER * 2 + 1)) - SEAT_JITTER;
    const ax = Math.round(px) + jx;
    const ay = Math.round(py) + jy;
    const x0 = ax - halfW;
    const y0 = ay - halfH;
    if (
      yieldToNeighbor({
        x: ax - Math.floor(maskW / 2),
        y: ay - Math.floor(maskH / 2),
        w: maskW,
        h: maskH,
      })
    ) {
      continue;
    }
    // THE DROWNED CHARTER: a shore-flagged layout seats only where
    // the country's heart brushes open water — judged from the
    // footprint's own half-span, the same elevation truth every other
    // shore consumer reads. A dry heart keeps no capital this age.
    const shore = layout.shore === true;
    if (shore && !shoreProbeAt(seed, ax, ay, Math.max(halfW, halfH) + 6)) continue;
    // THE ONE SCAN, capital preset: dark band and zones under the
    // capital's own clearance, the band measured from the footprint's
    // FOOT (the integer form this seat always used), the sampled grid
    // at probeStride with the frontier's rough cap. A shore layout
    // counts water and strand as BUILDABLE — the weir-folk build into
    // the shallows (wetExempt) — and the CAP on wet stays here:
    // capped so the capital never simply drowns.
    const verdict = siteScan(
      seed, ax, ay, prefab.width, prefab.height,
      ctx.zoneRects, ctx.claimRings,
      {
        zonePad: CAPITAL_CLEARANCE,
        darkPad: CAPITAL_CLEARANCE,
        darkFrom: 'foot',
        stride,
        tolerance: FRONTIER.capitalRoughMax,
        wetExempt: shore,
      },
    );
    if (!verdict) continue;
    if (shore && verdict.wet / verdict.probes > 0.35) continue; // a third in the shallows, no more
    // THE FOUND DOOR, honored by the land: every gate apron walkable.
    // A shore layout may open WATER GATES (the skral swim out), but
    // at least two doors must still stand on honest earth — the
    // assault always has a dry way in.
    let dryGates = 0;
    for (const g of gates) {
      // Outward = away from the footprint center on the dominant axis.
      const dx = g.x - halfW;
      const dy = g.y - halfH;
      const ox = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0;
      const oy = ox === 0 ? Math.sign(dy) || 1 : 0;
      let apronOk = true;
      for (let step = 1; step <= 3 && apronOk; step++) {
        const probe = groundProbeAt(seed, x0 + g.x + ox * step, y0 + g.y + oy * step);
        if (probe !== 'grass' && probe !== 'forest') apronOk = false;
      }
      if (apronOk) dryGates++;
      else if (!shore) break; // the old law: one wet apron refuses the seat
    }
    if (shore ? dryGates < 2 : dryGates < gates.length) continue;
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
 * THE LEDGER PINS THE SEAT (core-audit debt 2): a capital that has
 * EVER been seated is a historical fact — its anchor and first walls
 * live in the stronghold ledger. Re-deriving the seat live let a
 * hearth claim near the lattice point MOVE or NULL a standing
 * citadel's seat mid-life: the mask vanished from poiForCell (camps
 * dealt inside the walls), a reboot could silently never re-stand it,
 * and a moved seat composed at new ground while the ledger kept the
 * old anchor. This reconstructs the seat from the row by pure
 * derivation — claim rings and ground scans are consulted only at
 * FIRST seating (strongholdSeat). Returns null when the row's layout
 * has left the shelf (the live scan then answers, and the ward-bits
 * law already guards the mismatch).
 */
export function seatFromLedger(
  seed: number,
  gx: number,
  gy: number,
  row: { anchorX: number; anchorY: number; layoutId: string },
  ctx: SeatCtx,
): CapitalSeat | null {
  const layout = ctx.layouts.find((d) => d.id === row.layoutId);
  if (!layout) return null;
  const { hash } = territoryLatticePoint(seed, gx, gy);
  // Roster drift can re-name the country under standing walls — the
  // walls win: the layout's own family is the seat's family.
  const family = territoryLatticeFamily(hash, ctx.families) ?? layout.family;
  const tier = dangerAt(seed, row.anchorX, row.anchorY, ctx.anchors);
  // The mask covers the widest walls the family pool could raise —
  // the same epoch-free envelope strongholdSeat computes.
  let maskW = 0;
  let maskH = 0;
  for (const d of ctx.layouts) {
    if (d.family !== family || d.weight <= 0) continue;
    const pp = ctx.prefabs.get(d.prefab);
    if (!pp) continue;
    if (pp.width > maskW) maskW = pp.width;
    if (pp.height > maskH) maskH = pp.height;
  }
  const own = ctx.prefabs.get(layout.prefab);
  if (own) {
    if (own.width > maskW) maskW = own.width;
    if (own.height > maskH) maskH = own.height;
  }
  if (maskW === 0 || maskH === 0) return null;
  return {
    gx,
    gy,
    x: row.anchorX,
    y: row.anchorY,
    rect: {
      x: row.anchorX - Math.floor(maskW / 2),
      y: row.anchorY - Math.floor(maskH / 2),
      w: maskW,
      h: maskH,
    },
    family,
    tier,
    layoutId: row.layoutId,
  };
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
  // A seat wanders ≤ SEAT_JITTER from its lattice point, plus half
  // the widest layout the shelf can raise, plus the clearance —
  // DERIVED, not remembered: the Second Charter's zone-scale walls
  // broke the old hand-pinned 128.
  const reach = SEAT_JITTER + Math.ceil(STRONGHOLD_MAX_DIM / 2) + CAPITAL_CLEARANCE;
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

  // The caches: the CHIEF'S pays one law up (a capital pays above its
  // tier's camps — gilded at 3, boss at 4+); a CAPTAIN'S cache pays
  // the tier's own law CLAMPED BELOW the boss kind (THE CAPTAIN'S
  // KEY — well earned, always one rung under the summit's prize, or
  // a tier-5 capital would deal four boss chests). The gameServer
  // wires each ward to its keeper.
  const bossCacheKind = dangerLaw(Math.min(seat.tier + 1, 5)).chest;
  const captainCacheKind = dangerLaw(Math.min(seat.tier, 4)).chest;
  for (let i = 0; i < ground.length; i++) {
    const info = chestInfo(ground[i]!);
    if (!info || info.open) continue;
    ground[i] = closedChestTile(info.kind === 'boss' ? bossCacheKind : captainCacheKind);
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
    // THE ROADS ARE WALKED (Third Charter): an authored route deals
    // verbatim (offset to the world, paceability re-proven against
    // the composed ground); the synthetic loop serves the rest.
    const authored = (ward.route ?? [])
      .filter(([lx, ly]) => paceable(lx, ly))
      .map(([lx, ly]) => ({ x: originX + lx, y: originY + ly }));
    const loop = authored.length >= 3 ? authored : ward.patrol ? patrolLoop(ward) : [];
    ward.knots.forEach((knot, ki) => {
      if (knot.minTier !== undefined && seat.tier < knot.minTier) return;
      const span = knot.band[1] - knot.band[0] + 1;
      const count = knot.band[0] + (hashCoords(musterBase, wi * 31 + ki, 0x9e) % span);
      // Boldness thickens the watch: up to `stage` sentry knots gain
      // one body, capped at the PULL LAW's knot ceiling of 3.
      const bolder =
        knot.role === 'sentry' && stage > 0 && sentryBoosts < stage && count < 3 ? 1 : 0;
      if (bolder > 0) sentryBoosts++;
      // THE POST COMES ALIVE (the peopled landmarks): a furniture-
      // anchored knot splits into count-1 bodies seated round its
      // work — each walks to its own paceable spot beside the sign
      // and holds the post's pose. The fiction finally made flesh.
      if (knot.post && knot.postAt && !knot.title) {
        const [fx, fy] = knot.postAt;
        const total = count + bolder;
        const spots: Array<[number, number]> = [];
        for (const [nx, ny] of [
          [knot.at[0], knot.at[1]],
          [fx, fy + 1], [fx + 1, fy], [fx - 1, fy], [fx, fy - 1],
          [fx + 1, fy + 1], [fx - 1, fy + 1], [fx + 1, fy - 1], [fx - 1, fy - 1],
        ] as const) {
          if (spots.length >= total) break;
          if (!paceable(nx, ny)) continue;
          if (spots.some(([sx, sy]) => sx === nx && sy === ny)) continue;
          spots.push([nx, ny]);
        }
        for (let bi = 0; bi < total; bi++) {
          const [sx, sy] = spots[bi] ?? knot.at;
          spawns.push({
            x: originX + sx,
            y: originY + sy,
            npc: knot.npc,
            count: 1,
            radius: 1.2,
            level: rollLevel(wi * 31 + ki, 0xa1, knot.levelOffset ?? 0),
            wing: wi,
            post: {
              kind: knot.post,
              x: originX + sx,
              y: originY + sy,
              dir: Math.atan2(fy - sy, fx - sx),
            },
            ...(knot.hours ? { hours: knot.hours } : {}),
          });
        }
        return;
      }
      spawns.push({
        x: originX + knot.at[0],
        y: originY + knot.at[1],
        npc: knot.npc,
        // THE CAPTAIN LAW: a titled body is ONE body with ONE name.
        count: knot.title ? 1 : count + bolder,
        radius: 2.5,
        level: rollLevel(wi * 31 + ki, 0xa1, knot.levelOffset ?? 0),
        wing: wi,
        ...(knot.title ? { name: knot.title } : {}),
        ...(knot.role === 'sentry' && loop.length > 0 ? { patrol: loop } : {}),
        ...(knot.hours ? { hours: knot.hours } : {}),
      });
    });
  });
  // The chief: crowned once, named forever (the names-pool law).
  const bossName = layout.boss.names[hashCoords(musterBase, 0xb0, 0x55) % layout.boss.names.length]!;
  // THE COURT HOLDS THE CROWN (the delve seat's lesson, finally taught
  // here too): a chief's authored open-ground arenaR outruns his own
  // walled ward — kited out the ward door, the rim guard could never
  // fire. The seat's radius is the ward itself: far corner from the
  // throne plus a hem, so the fight fills the court and ends at it.
  const bossWard = bossWardIdx >= 0 ? layout.wards[bossWardIdx] : undefined;
  const courtR = bossWard
    ? Math.ceil(
        Math.hypot(
          Math.max(
            Math.abs(layout.boss.at[0] - bossWard.rect.x),
            Math.abs(bossWard.rect.x + bossWard.rect.w - layout.boss.at[0]),
          ),
          Math.max(
            Math.abs(layout.boss.at[1] - bossWard.rect.y),
            Math.abs(bossWard.rect.y + bossWard.rect.h - layout.boss.at[1]),
          ),
        ),
      ) + 2
    : undefined;
  spawns.push({
    x: originX + layout.boss.at[0],
    y: originY + layout.boss.at[1],
    npc: layout.boss.npc,
    count: 1,
    radius: 1.5,
    level: law.npcLevel[1] + (layout.boss.levelOffset ?? 0),
    name: bossName,
    ...(courtR !== undefined ? { arenaR: courtR } : {}),
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
