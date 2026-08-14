import { TILE_DEFS, TILE_SKIP, Tile, doorInfo } from '@arx/shared';
import type { PrefabDef } from '../../maps/prefab.js';
import { DANGER_LAWS } from '../../danger.js';
import { NPCS } from '../../npcs.js';
import type {
  StrongholdBoss,
  StrongholdDef,
  StrongholdKnot,
  StrongholdWard,
} from './types.js';
import {
  KNOT_BAND_MAX,
  KNOT_SPACING,
  STRONGHOLD_BODIES_MAX,
  STRONGHOLD_BODIES_MIN,
  STRONGHOLD_ID_RE,
  STRONGHOLD_MAX_DIM,
  STRONGHOLD_MIN_DIM,
  STRONGHOLD_WARD_AREA_SHARE_MAX,
  STRONGHOLD_WARD_OPEN_FLOOR,
  STRONGHOLD_WARDS_MAX,
  STRONGHOLD_WARDS_MIN,
} from './types.js';

/**
 * THE ONE VALIDATOR — every path a StrongholdDef can enter the game
 * walks through here: authored roster at registry init (throws on bad
 * content), DB docs at boot, Foundry bench submissions. Collects ALL
 * errors (the validatePoiDef dialect).
 *
 * With `refs.prefab` supplied (the layout's geometry), the geometry
 * laws run too:
 *  - THE PULL LAW: knot anchors pairwise ≥ KNOT_SPACING tiles.
 *  - THE OPEN GATE LAW: no shut gate/door tile anywhere in the layout
 *    (a manned gate stands open; hostiles never learn doors, so a
 *    shut leaf would wall the garrison's own ground).
 *  - THE FOUND DOOR: ≥ 1 gate tile (an open door-law tile or a stone
 *    arch) in the walls — the entrance players search for.
 *  - REACHABILITY: from the transparent fringe, a 4-way walk over
 *    non-solid ground must reach every ward, every knot anchor, and
 *    the boss anchor — no chapter may be sealed behind its own walls.
 *  - THE KNOTS ARE THE MUSTER: the layout prefab carries no spawn
 *    markers, portals, or actor spawns; bodies come from the def
 *    alone (the MinorDef precedent, at citadel scale).
 *  - THE CACHE LAW: exactly one boss chest, inside the boss ward;
 *    at most two lesser chests elsewhere (texture is not treasure).
 */

export type ValidateStrongholdResult =
  | { ok: true; def: StrongholdDef; gates: Array<{ x: number; y: number }> }
  | { ok: false; errors: string[] };

const MAX_TIER = DANGER_LAWS.length - 1;
const WARD_KEY_RE = /^[a-z][a-z0-9_]{0,31}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isIntPair(v: unknown): v is [number, number] {
  return (
    Array.isArray(v) && v.length === 2 &&
    Number.isInteger(v[0]) && Number.isInteger(v[1])
  );
}

/** A tile a body can stand on or walk through inside the layout. */
function passable(t: number): boolean {
  if (t === TILE_SKIP) return true;
  const def = TILE_DEFS[t as Tile];
  return def ? !def.solid : false;
}

/** Gate tiles THE FOUND DOOR counts: open door-law leaves + the arch. */
function isGateTile(t: number): boolean {
  if (t === Tile.ArchStone) return true;
  const info = doorInfo(t);
  return info !== null && info.open;
}

/**
 * A gate is a gate only when it PIERCES a wall: solid tiles flank it
 * on both lateral sides. A free-standing shrine arch in a courtyard
 * is scenery, not an entrance.
 */
export function piercesWall(ground: Uint16Array, pw: number, ph: number, x: number, y: number): boolean {
  const solidAt = (sx: number, sy: number): boolean => {
    if (sx < 0 || sy < 0 || sx >= pw || sy >= ph) return false;
    const t = ground[sy * pw + sx]!;
    if (t === TILE_SKIP) return false;
    const def = TILE_DEFS[t as Tile];
    return def ? def.solid : false;
  };
  return (
    (solidAt(x - 1, y) && solidAt(x + 1, y)) ||
    (solidAt(x, y - 1) && solidAt(x, y + 1))
  );
}

/**
 * Every true entrance of a layout prefab — open door-law leaves and
 * arches that pierce the wall. The validator, the Foundry bench, and
 * THE CAPITAL LAW's gate-apron siting all read this one scan.
 */
export function strongholdGates(p: PrefabDef): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < p.ground.length; i++) {
    const t = p.ground[i]!;
    if (isGateTile(t) && piercesWall(p.ground, p.width, p.height, i % p.width, Math.floor(i / p.width))) {
      out.push({ x: i % p.width, y: Math.floor(i / p.width) });
    }
  }
  return out;
}

export function validateStronghold(
  raw: unknown,
  refs: {
    prefab?: PrefabDef;
    npcIds?: ReadonlySet<string>;
  } = {},
): ValidateStrongholdResult {
  const hasNpc = (id: string) => refs.npcIds?.has(id) ?? NPCS.has(id);
  if (!isRecord(raw)) return { ok: false, errors: ['stronghold def must be an object'] };
  const errors: string[] = [];

  const id = typeof raw.id === 'string' ? raw.id : '';
  if (!STRONGHOLD_ID_RE.test(id)) {
    errors.push(`id '${String(raw.id)}' must match ${STRONGHOLD_ID_RE}`);
  }
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) errors.push('name is empty');
  const description =
    raw.description === undefined
      ? undefined
      : typeof raw.description === 'string'
        ? raw.description
        : (errors.push('description must be a string'), undefined);

  // A capital is a family's seat — family is REQUIRED here.
  const family =
    typeof raw.family === 'string' && /^[a-z][a-z0-9_]*$/.test(raw.family)
      ? raw.family
      : (errors.push('family must be a lowercase slug (a stronghold always belongs to one)'), '');

  // Tiers: deep frontier by law.
  let tiers: [number, number] = [3, MAX_TIER];
  if (!isIntPair(raw.tiers)) {
    errors.push('tiers must be [min, max] integers');
  } else {
    tiers = [raw.tiers[0], raw.tiers[1]];
    if (tiers[0] < 3 || tiers[1] > MAX_TIER || tiers[0] > tiers[1]) {
      errors.push(
        `tiers ${tiers[0]}..${tiers[1]} outside 3..${MAX_TIER} or inverted (a stronghold is deep frontier)`,
      );
    }
  }

  const weight = typeof raw.weight === 'number' ? raw.weight : NaN;
  if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
    errors.push('weight must be a number in [0, 100]');
  }

  let titles: string[] | undefined;
  if (raw.titles !== undefined) {
    if (!Array.isArray(raw.titles) || raw.titles.length === 0) {
      errors.push('titles must be a non-empty name pool (or absent)');
    } else if (raw.titles.some((t) => typeof t !== 'string' || !t.trim())) {
      errors.push('titles entries must be non-empty strings');
    } else {
      titles = raw.titles as string[];
    }
  }

  const prefabId =
    typeof raw.prefab === 'string' && raw.prefab.trim()
      ? raw.prefab
      : (errors.push('prefab must be a prefab id'), '');
  if (refs.prefab && prefabId && refs.prefab.id !== prefabId) {
    errors.push(`refs.prefab '${refs.prefab.id}' does not match def.prefab '${prefabId}'`);
  }

  // ---- Wards + knots (grammar half) ----------------------------------
  const wards: StrongholdWard[] = [];
  const wardKeys = new Set<string>();
  const vetKnot = (g: unknown, at: string): StrongholdKnot | null => {
    if (!isRecord(g)) {
      errors.push(`${at}: must be an object`);
      return null;
    }
    let anchor: [number, number] = [0, 0];
    if (!isIntPair(g.at)) {
      errors.push(`${at}: at must be [x, y] integers`);
    } else {
      anchor = [g.at[0], g.at[1]];
    }
    const npc = typeof g.npc === 'string' ? g.npc : '';
    if (!hasNpc(npc)) errors.push(`${at}: unknown npc '${String(g.npc)}'`);
    let band: [number, number] = [1, 1];
    if (!isIntPair(g.band)) {
      errors.push(`${at}: band must be [min, max] integers`);
    } else {
      band = [g.band[0], g.band[1]];
      if (band[0] < 1 || band[1] < band[0] || band[1] > KNOT_BAND_MAX) {
        errors.push(
          `${at}: band ${band[0]}..${band[1]} invalid (1 ≤ min ≤ max ≤ ${KNOT_BAND_MAX} — THE PULL LAW: a bigger fight is more knots)`,
        );
      }
    }
    const role = g.role === 'holdfast' || g.role === 'sentry' ? g.role : null;
    if (!role) errors.push(`${at}: role must be 'holdfast' or 'sentry'`);
    const minTier =
      g.minTier === undefined
        ? undefined
        : Number.isInteger(g.minTier)
          ? (g.minTier as number)
          : (errors.push(`${at}: minTier must be an integer`), undefined);
    if (minTier !== undefined && (minTier < tiers[0] || minTier > tiers[1])) {
      errors.push(`${at}: minTier ${minTier} outside the layout's tiers ${tiers[0]}..${tiers[1]}`);
    }
    const levelOffset =
      g.levelOffset === undefined
        ? undefined
        : Number.isInteger(g.levelOffset) && (g.levelOffset as number) >= 0 &&
            (g.levelOffset as number) <= 20
          ? (g.levelOffset as number)
          : (errors.push(`${at}: levelOffset must be an integer 0..20`), undefined);
    let hours: { from: number; to: number } | undefined;
    if (g.hours !== undefined) {
      const h = g.hours as Record<string, unknown>;
      const okHour = (v: unknown): v is number =>
        typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 24;
      if (!isRecord(g.hours) || !okHour(h.from) || !okHour(h.to)) {
        errors.push(`${at}: hours must be {from, to} in [0, 24)`);
      } else if (h.from === h.to) {
        errors.push(`${at}: hours from === to (an empty window; omit hours for always-on)`);
      } else {
        hours = { from: h.from, to: h.to };
      }
    }
    // THE POST LAW + THE CAPTAIN LAW (Third Charter).
    const POSTS = ['cook', 'drill', 'rest', 'vigil', 'keeper', 'watch'] as const;
    const post =
      g.post === undefined
        ? undefined
        : (POSTS as readonly string[]).includes(g.post as string)
          ? (g.post as (typeof POSTS)[number])
          : (errors.push(`${at}: post '${String(g.post)}' unknown (${POSTS.join('|')})`), undefined);
    const title =
      g.title === undefined
        ? undefined
        : typeof g.title === 'string' && g.title.trim()
          ? g.title
          : (errors.push(`${at}: title must be a non-empty string (the named-captain law)`), undefined);
    if (!role) return null;
    return {
      at: anchor,
      npc,
      band,
      role,
      ...(minTier !== undefined ? { minTier } : {}),
      ...(levelOffset !== undefined ? { levelOffset } : {}),
      ...(hours !== undefined ? { hours } : {}),
      ...(post !== undefined ? { post } : {}),
      ...(title !== undefined ? { title } : {}),
    };
  };

  if (!Array.isArray(raw.wards)) {
    errors.push('wards must be an array');
  } else {
    for (const [wi, w] of raw.wards.entries()) {
      const at = `wards[${wi}]`;
      if (!isRecord(w)) {
        errors.push(`${at}: must be an object`);
        continue;
      }
      const key = typeof w.key === 'string' ? w.key : '';
      if (!WARD_KEY_RE.test(key)) errors.push(`${at}: key '${String(w.key)}' must match ${WARD_KEY_RE}`);
      else if (wardKeys.has(key)) errors.push(`${at}: duplicate ward key '${key}'`);
      wardKeys.add(key);
      const wname = typeof w.name === 'string' ? w.name.trim() : '';
      if (!wname) errors.push(`${at}: name is empty (the ward-break line needs a place to name)`);
      let rect = { x: 0, y: 0, w: 1, h: 1 };
      if (
        !isRecord(w.rect) ||
        ![w.rect.x, w.rect.y, w.rect.w, w.rect.h].every((v) => Number.isInteger(v))
      ) {
        errors.push(`${at}: rect must be {x, y, w, h} integers`);
      } else {
        rect = {
          x: w.rect.x as number,
          y: w.rect.y as number,
          w: w.rect.w as number,
          h: w.rect.h as number,
        };
        if (rect.w < 3 || rect.h < 3) errors.push(`${at}: rect ${rect.w}x${rect.h} too small (min 3x3)`);
      }
      const knots: StrongholdKnot[] = [];
      if (!Array.isArray(w.knots)) {
        errors.push(`${at}: knots must be an array`);
      } else {
        for (const [ki, k] of w.knots.entries()) {
          const knot = vetKnot(k, `${at}.knots[${ki}]`);
          if (knot) {
            knots.push(knot);
            const [kx, ky] = knot.at;
            if (kx < rect.x || ky < rect.y || kx >= rect.x + rect.w || ky >= rect.y + rect.h) {
              errors.push(`${at}.knots[${ki}]: anchor ${kx},${ky} outside its ward rect`);
            }
          }
        }
      }
      const optional =
        w.optional === undefined
          ? undefined
          : typeof w.optional === 'boolean'
            ? w.optional
            : (errors.push(`${at}: optional must be a boolean`), undefined);
      const patrol =
        w.patrol === undefined
          ? undefined
          : w.patrol === 'wall' || w.patrol === 'lane'
            ? w.patrol
            : (errors.push(`${at}: patrol must be 'wall' or 'lane'`), undefined);
      // THE ROADS ARE WALKED: an authored route is ≥3 waypoints with
      // sane hops; the geometry half (in-prefab, passable) runs with
      // the prefab below.
      let route: Array<[number, number]> | undefined;
      if (w.route !== undefined) {
        if (!Array.isArray(w.route) || w.route.length < 3 || !w.route.every(isIntPair)) {
          errors.push(`${at}: route must be ≥3 [x, y] integer waypoints (or absent)`);
        } else {
          route = (w.route as Array<[number, number]>).map((p) => [p[0], p[1]]);
          for (let i = 1; i < route.length; i++) {
            const dx = route[i]![0] - route[i - 1]![0];
            const dy = route[i]![1] - route[i - 1]![1];
            if (dx * dx + dy * dy > 12 * 12) {
              errors.push(`${at}: route hop ${i} is ${Math.sqrt(dx * dx + dy * dy).toFixed(1)} tiles (≤ 12 — a patrol walks, never teleports)`);
              break;
            }
          }
        }
      }
      wards.push({
        key: WARD_KEY_RE.test(key) ? key : `ward_${wi}`,
        name: wname,
        rect,
        knots,
        ...(optional !== undefined ? { optional } : {}),
        ...(patrol !== undefined ? { patrol } : {}),
        ...(route !== undefined ? { route } : {}),
      });
    }
    if (raw.wards.length < STRONGHOLD_WARDS_MIN || raw.wards.length > STRONGHOLD_WARDS_MAX) {
      errors.push(
        `${raw.wards.length} wards outside ${STRONGHOLD_WARDS_MIN}..${STRONGHOLD_WARDS_MAX}`,
      );
    }
    // Ward rects never overlap — a tile answers to one chapter.
    for (let a = 0; a < wards.length; a++) {
      for (let b = a + 1; b < wards.length; b++) {
        const ra = wards[a]!.rect;
        const rb = wards[b]!.rect;
        const overlap =
          ra.x < rb.x + rb.w && rb.x < ra.x + ra.w && ra.y < rb.y + rb.h && rb.y < ra.y + ra.h;
        if (overlap) {
          errors.push(`wards '${wards[a]!.key}' and '${wards[b]!.key}' overlap`);
        }
      }
    }
  }

  // ---- Boss -----------------------------------------------------------
  let boss: StrongholdBoss = { ward: '', npc: '', names: [], at: [0, 0] };
  if (!isRecord(raw.boss)) {
    errors.push('boss must be an object (a stronghold keeps a last stand)');
  } else {
    const b = raw.boss;
    const ward = typeof b.ward === 'string' ? b.ward : '';
    if (!wardKeys.has(ward)) errors.push(`boss.ward '${String(b.ward)}' is not a ward key`);
    const bnpc = typeof b.npc === 'string' ? b.npc : '';
    if (!hasNpc(bnpc)) errors.push(`boss.npc unknown '${String(b.npc)}'`);
    let names: string[] = [];
    if (!Array.isArray(b.names) || b.names.length === 0) {
      errors.push('boss.names must be a non-empty name pool');
    } else if (b.names.some((n) => typeof n !== 'string' || !n.trim())) {
      errors.push('boss.names entries must be non-empty strings');
    } else {
      names = b.names as string[];
    }
    let bat: [number, number] = [0, 0];
    if (!isIntPair(b.at)) errors.push('boss.at must be [x, y] integers');
    else bat = [b.at[0], b.at[1]];
    const levelOffset =
      b.levelOffset === undefined
        ? undefined
        : Number.isInteger(b.levelOffset) && (b.levelOffset as number) >= 0 &&
            (b.levelOffset as number) <= 20
          ? (b.levelOffset as number)
          : (errors.push('boss.levelOffset must be an integer 0..20'), undefined);
    boss = {
      ward,
      npc: bnpc,
      names,
      at: bat,
      ...(levelOffset !== undefined ? { levelOffset } : {}),
    };
    const bossWard = wards.find((w) => w.key === ward);
    if (bossWard) {
      if (bossWard.optional) errors.push('the boss ward may not be optional (the last stand always stands)');
      if (bossWard.knots.length === 0) {
        errors.push('the boss ward needs at least one knot (a chief keeps an honor guard)');
      }
      const r = bossWard.rect;
      if (boss.at[0] < r.x || boss.at[1] < r.y || boss.at[0] >= r.x + r.w || boss.at[1] >= r.y + r.h) {
        errors.push(`boss.at ${boss.at[0]},${boss.at[1]} outside the boss ward rect`);
      }
    }
  }

  // ---- Cross-ward laws ------------------------------------------------
  // THE PULL LAW: every pair of knot anchors across the whole layout
  // keeps its distance. (The boss anchor is exempt — the chief folds
  // into his honor guard; the last stand is deliberately the biggest.)
  const allKnots: Array<{ at: readonly [number, number]; where: string }> = [];
  for (const w of wards) {
    for (const [ki, k] of w.knots.entries()) allKnots.push({ at: k.at, where: `${w.key}[${ki}]` });
  }
  const minD2 = KNOT_SPACING * KNOT_SPACING;
  for (let a = 0; a < allKnots.length; a++) {
    for (let b = a + 1; b < allKnots.length; b++) {
      const dx = allKnots[a]!.at[0] - allKnots[b]!.at[0];
      const dy = allKnots[a]!.at[1] - allKnots[b]!.at[1];
      if (dx * dx + dy * dy < minD2) {
        errors.push(
          `knots ${allKnots[a]!.where} and ${allKnots[b]!.where} stand ${Math.sqrt(dx * dx + dy * dy).toFixed(1)} tiles apart (THE PULL LAW: ≥ ${KNOT_SPACING})`,
        );
      }
    }
  }

  // Muster envelope, counted in maximum bodies.
  let maxBodies = 1; // the chief
  for (const w of wards) for (const k of w.knots) maxBodies += k.band[1];
  if (maxBodies < STRONGHOLD_BODIES_MIN || maxBodies > STRONGHOLD_BODIES_MAX) {
    errors.push(
      `muster ceiling ${maxBodies} bodies outside ${STRONGHOLD_BODIES_MIN}..${STRONGHOLD_BODIES_MAX}`,
    );
  }

  // ---- Geometry laws (need the prefab) -------------------------------
  const gates: Array<{ x: number; y: number }> = [];
  const p = refs.prefab;
  if (p) {
    const { width: pw, height: ph, ground } = p;
    if (
      pw < STRONGHOLD_MIN_DIM || ph < STRONGHOLD_MIN_DIM ||
      pw > STRONGHOLD_MAX_DIM || ph > STRONGHOLD_MAX_DIM
    ) {
      errors.push(`prefab ${pw}x${ph} outside ${STRONGHOLD_MIN_DIM}..${STRONGHOLD_MAX_DIM}`);
    }
    // ALL-SKIP-PERIMETER (the edge-harmony law, pinned at the source).
    for (let x = 0; x < pw; x++) {
      if (ground[x] !== TILE_SKIP || ground[(ph - 1) * pw + x] !== TILE_SKIP) {
        errors.push('prefab perimeter must be all TILE_SKIP');
        break;
      }
    }
    for (let y = 0; y < ph; y++) {
      if (ground[y * pw] !== TILE_SKIP || ground[y * pw + (pw - 1)] !== TILE_SKIP) {
        errors.push('prefab perimeter must be all TILE_SKIP');
        break;
      }
    }
    // THE KNOTS ARE THE MUSTER.
    if (p.spawns.length > 0) {
      errors.push('layout prefab carries spawn markers (the knots are the muster)');
    }
    if (p.portals.length > 0) errors.push('layout prefab carries portals');
    if (p.actorSpawns.length > 0) errors.push('layout prefab carries actor spawns');
    // THE OPEN GATE LAW + THE FOUND DOOR + THE CACHE LAW.
    let bossChests = 0;
    let lesserChests = 0;
    const bossWard = wards.find((w) => w.key === boss.ward);
    for (let i = 0; i < ground.length; i++) {
      const t = ground[i]!;
      const info = doorInfo(t);
      if (info && !info.open) {
        errors.push(
          `shut ${info.material} door at ${i % pw},${Math.floor(i / pw)} (THE OPEN GATE LAW: a manned gate stands open)`,
        );
      }
      if (isGateTile(t) && piercesWall(ground, pw, ph, i % pw, Math.floor(i / pw))) {
        gates.push({ x: i % pw, y: Math.floor(i / pw) });
      }
      if (t === Tile.ChestBoss) {
        bossChests++;
        const x = i % pw;
        const y = Math.floor(i / pw);
        if (
          bossWard &&
          (x < bossWard.rect.x || y < bossWard.rect.y ||
            x >= bossWard.rect.x + bossWard.rect.w || y >= bossWard.rect.y + bossWard.rect.h)
        ) {
          errors.push(`boss chest at ${x},${y} outside the boss ward (the cache is the last stand's)`);
        }
      } else if (t === Tile.ChestWood || t === Tile.ChestIron) {
        lesserChests++;
      }
    }
    if (bossChests !== 1) errors.push(`${bossChests} boss chests (exactly one — the cache law)`);
    // A zone-scale layout pays exploration in found caches — the cap
    // grows with the ground, texture is still not treasure.
    const lesserCap = Math.min(pw, ph) >= 126 ? 4 : 2;
    if (lesserChests > lesserCap) {
      errors.push(`${lesserChests} lesser chests (≤ ${lesserCap} — texture is not treasure)`);
    }
    if (gates.length === 0) {
      errors.push('no gate tile found (THE FOUND DOOR: players search for an entrance that exists)');
    }
    // ---- THE RAISED GROUND (Phase 2) -------------------------------
    // Height is render-only (the shelf law): collision comes from the
    // Cliff/Ramp fence alone, so a raised layout MUST wear its fence.
    {
      const { elev } = p;
      const elevAt = (x: number, y: number): number =>
        x >= 0 && y >= 0 && x < pw && y < ph && ground[y * pw + x] !== TILE_SKIP
          ? elev[y * pw + x]!
          : 0; // transparent cells keep the meadow's level-0 ground
      let onSkip = 0;
      let nearBorder = 0;
      let unfenced: string | null = null;
      let badRange = 0;
      for (let i = 0; i < elev.length; i++) {
        const e = elev[i]!;
        if (e === 0) continue;
        const x = i % pw;
        const y = Math.floor(i / pw);
        if (e < 0 || e > 3) badRange++;
        if (ground[i] === TILE_SKIP) {
          onSkip++;
          continue;
        }
        if (x < 2 || y < 2 || x >= pw - 2 || y >= ph - 2) nearBorder++;
        // FENCED HEIGHT: any drop to a 4-neighbor puts Cliff or Ramp
        // on the high side — this cell.
        const t = ground[i]!;
        const fenced = t === Tile.Cliff || t === Tile.Ramp;
        if (!fenced) {
          for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) {
            if (elevAt(nx, ny) < e) {
              if (!unfenced) unfenced = `${x},${y}`;
              break;
            }
          }
        }
        // THE SOUTH STAIR: a ramp descends toward the camera, and
        // only toward the camera — landing below, level flanks.
        if (t === Tile.Ramp) {
          const south = y + 1 < ph ? ground[(y + 1) * pw + x]! : TILE_SKIP;
          const ok =
            south !== TILE_SKIP &&
            !TILE_DEFS[south as Tile]!.solid &&
            elevAt(x, y + 1) === e - 1 &&
            elevAt(x, y - 1) === e &&
            elevAt(x - 1, y) === e &&
            elevAt(x + 1, y) === e;
          if (!ok) {
            errors.push(
              `ramp at ${x},${y} must descend SOUTH onto walkable ground with level flanks (the camera-facing stair law)`,
            );
          }
        }
      }
      if (badRange > 0) errors.push(`${badRange} cells with elevation outside 0..3`);
      if (onSkip > 0) {
        errors.push(
          `${onSkip} transparent cells carry elevation (skip cells keep the meadow — raise only opaque ground)`,
        );
      }
      if (nearBorder > 0) {
        errors.push(
          `${nearBorder} raised cells within 2 of the prefab edge (the border-flat law: procgen outside is at an unknown level)`,
        );
      }
      if (unfenced) {
        errors.push(
          `raised ground at ${unfenced} drops to a neighbor without a Cliff or Ramp on the high side (FENCED HEIGHT)`,
        );
      }
    }
    // Ward rects and anchors sit inside the prefab.
    for (const w of wards) {
      const r = w.rect;
      if (r.x < 0 || r.y < 0 || r.x + r.w > pw || r.y + r.h > ph) {
        errors.push(`ward '${w.key}' rect outside the prefab`);
      }
    }
    // THE ROADS ARE WALKED, geometry half: every waypoint stands on
    // walkable ground inside the prefab.
    for (const w of wards) {
      if (!w.route) continue;
      for (const [ri, [rx, ry]] of w.route.entries()) {
        if (rx < 0 || ry < 0 || rx >= pw || ry >= ph) {
          errors.push(`ward '${w.key}' route[${ri}] ${rx},${ry} outside the prefab`);
        } else if (!passable(ground[ry * pw + rx]!)) {
          errors.push(`ward '${w.key}' route[${ri}] ${rx},${ry} stands on solid ground`);
        }
      }
    }
    // THE BREATHING LAW (Second Charter), both halves: a ward is a
    // place you walk THROUGH — most of its ground stays passable…
    for (const w of wards) {
      const r = w.rect;
      let open = 0;
      let total = 0;
      for (let y = Math.max(0, r.y); y < Math.min(ph, r.y + r.h); y++) {
        for (let x = Math.max(0, r.x); x < Math.min(pw, r.x + r.w); x++) {
          total++;
          if (passable(ground[y * pw + x]!)) open++;
        }
      }
      if (total > 0 && open / total < STRONGHOLD_WARD_OPEN_FLOOR) {
        errors.push(
          `ward '${w.key}' is ${Math.round((open / total) * 100)}% walkable (THE BREATHING LAW: ≥ ${Math.round(STRONGHOLD_WARD_OPEN_FLOOR * 100)}% — a ward is walked through, not a stamp)`,
        );
      }
    }
    // …and the stamps never crowd the yard.
    const wardArea = wards.reduce((n, w) => n + w.rect.w * w.rect.h, 0);
    if (wardArea > pw * ph * STRONGHOLD_WARD_AREA_SHARE_MAX) {
      errors.push(
        `ward rects claim ${Math.round((wardArea / (pw * ph)) * 100)}% of the ground (THE BREATHING LAW: ≤ ${Math.round(STRONGHOLD_WARD_AREA_SHARE_MAX * 100)}% — the zone is open country inside walls)`,
      );
    }
    // REACHABILITY: flood from the transparent fringe over passable
    // ground; every chapter must be walkable from outside the walls.
    const reached = new Uint8Array(pw * ph);
    const queue: number[] = [];
    const push = (x: number, y: number) => {
      const i = y * pw + x;
      if (reached[i]) return;
      if (!passable(ground[i]!)) return;
      reached[i] = 1;
      queue.push(i);
    };
    for (let x = 0; x < pw; x++) {
      push(x, 0);
      push(x, ph - 1);
    }
    for (let y = 0; y < ph; y++) {
      push(0, y);
      push(pw - 1, y);
    }
    while (queue.length > 0) {
      const i = queue.pop()!;
      const x = i % pw;
      const y = Math.floor(i / pw);
      if (x > 0) push(x - 1, y);
      if (x < pw - 1) push(x + 1, y);
      if (y > 0) push(x, y - 1);
      if (y < ph - 1) push(x, y + 1);
    }
    const anchorReached = (x: number, y: number): boolean =>
      x >= 0 && y >= 0 && x < pw && y < ph && reached[y * pw + x] === 1;
    for (const w of wards) {
      let any = false;
      for (let y = w.rect.y; y < w.rect.y + w.rect.h && !any; y++) {
        for (let x = w.rect.x; x < w.rect.x + w.rect.w && !any; x++) {
          if (x >= 0 && y >= 0 && x < pw && y < ph && reached[y * pw + x]) any = true;
        }
      }
      if (!any) errors.push(`ward '${w.key}' is unreachable from outside the walls`);
      for (const [ki, k] of w.knots.entries()) {
        if (!anchorReached(k.at[0], k.at[1])) {
          errors.push(`knot ${w.key}[${ki}] anchor ${k.at[0]},${k.at[1]} stands on sealed or solid ground`);
        }
      }
    }
    if (!anchorReached(boss.at[0], boss.at[1])) {
      errors.push(`boss anchor ${boss.at[0]},${boss.at[1]} stands on sealed or solid ground`);
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    def: {
      id,
      name,
      ...(description !== undefined ? { description } : {}),
      family,
      tiers,
      weight,
      ...(titles !== undefined ? { titles } : {}),
      prefab: prefabId,
      wards,
      boss,
    },
    gates,
  };
}
