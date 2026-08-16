import { Rng, hashCoords } from '@arx/shared';
import {
  ARENAS,
  arenaMatchXp,
  arenaRankForXp,
  type ArenaMatchDef,
  type ArenaVenueDef,
  type ArenaWaveEntry,
  type ArenasDef,
} from '@arx/content';

/**
 * THE SAND AND THE ROAR — the pure mind (the bossMind precedent):
 * everything about a match that can be answered without touching the
 * world lives here, slate-testable. The GameServer half is effect
 * glue — spawns, tiles, wires — and stays thin.
 *
 * THE SEED IS THE SOUL: rollMatchPlan is bit-deterministic from
 * (card, seed). The same seed fields the same sand, so a receipt can
 * be re-run and a desk prediction holds on the wire (the crownForge
 * law, extended to the whole card).
 */

// ------------------------------------------------------------ plan

export interface PlannedBody {
  npc: string;
  level: number;
  name?: string;
  /** Set = this body is forged a champion from this soul. */
  crownSeed?: number;
}

export interface PlannedRound {
  title?: string;
  bark?: string;
  bodies: PlannedBody[];
  props: number;
}

export interface MatchPlan {
  rounds: PlannedRound[];
}

function planBodies(
  out: PlannedBody[],
  e: ArenaWaveEntry,
  cardLevel: number,
  rng: Rng,
  soul: () => number,
): void {
  const n = e.count !== undefined ? rng.int(e.count[0], e.count[1]) : 1;
  const level = Math.max(1, cardLevel + (e.levelOffset ?? 0));
  for (let i = 0; i < n; i++) {
    out.push({
      npc: e.npc,
      level,
      ...(e.name !== undefined ? { name: e.name } : {}),
      ...(e.crown === true ? { crownSeed: soul() } : {}),
    });
  }
}

/** Field the whole card from one seed, bit-deterministically. */
export function rollMatchPlan(def: ArenaMatchDef, seed: number): MatchPlan {
  const rounds: PlannedRound[] = [];
  for (let ri = 0; ri < def.rounds.length; ri++) {
    const r = def.rounds[ri]!;
    const rng = new Rng(hashCoords(seed, ri, 0x5a17));
    // Every crown in a round gets its own soul; the naming stream
    // never moves the count stream (the forge's own law).
    let crowns = 0;
    const soul = (): number => hashCoords(seed, ri, 0xc801 + crowns++);
    const bodies: PlannedBody[] = [];
    for (const e of r.entries ?? []) planBodies(bodies, e, def.level, rng, soul);
    if (r.pool !== undefined) {
      // Pick without replacement: a partial Fisher-Yates walk on a
      // copied index list, so authored pool order never biases who
      // stands and the same seed always calls the same names.
      const idx = r.pool.from.map((_, i) => i);
      for (let i = 0; i < Math.min(r.pool.pick, idx.length); i++) {
        const j = rng.int(i, idx.length - 1);
        const t = idx[i]!;
        idx[i] = idx[j]!;
        idx[j] = t;
        planBodies(bodies, r.pool.from[idx[i]!]!, def.level, rng, soul);
      }
    }
    rounds.push({
      ...(r.title !== undefined ? { title: r.title } : {}),
      ...(r.bark !== undefined ? { bark: r.bark } : {}),
      bodies,
      props: r.props ?? 0,
    });
  }
  return { rounds };
}

// ------------------------------------------------------------ ground

/**
 * Is a body on the sand? `pad` widens the ellipse in tiles (the
 * eviction guard uses a small positive pad so nobody camps the rim).
 */
export function inPit(
  pit: { x: number; y: number; rx: number; ry: number },
  x: number,
  y: number,
  pad = 0,
): boolean {
  const dx = (x - pit.x) / (pit.rx + pad);
  const dy = (y - pit.y) / (pit.ry + pad);
  return dx * dx + dy * dy <= 1;
}

/**
 * Deterministic stand spots inside the pit (at 0.75 of its radii so
 * nothing spawns kissing the wall), walkability judged by the caller.
 * Falls back to the pit's heart when the sand is impossibly crowded —
 * a spawn that fails to stand is worse than a snug one.
 */
export function scatterSpots(
  pit: { x: number; y: number; rx: number; ry: number },
  n: number,
  seed: number,
  walkable: (x: number, y: number) => boolean,
): Array<{ x: number; y: number }> {
  const rng = new Rng(hashCoords(seed, 0x57a2, n));
  const spots: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 24 && !placed; attempt++) {
      const a = rng.range(0, Math.PI * 2);
      const r = Math.sqrt(rng.next());
      const x = pit.x + Math.cos(a) * pit.rx * 0.75 * r;
      const y = pit.y + Math.sin(a) * pit.ry * 0.75 * r;
      if (!walkable(x, y)) continue;
      if (spots.some((s) => (s.x - x) ** 2 + (s.y - y) ** 2 < 1.44)) continue;
      spots.push({ x, y });
      placed = true;
    }
    if (!placed) spots.push({ x: pit.x, y: pit.y });
  }
  return spots;
}

// ------------------------------------------------------------ ladder

export interface ArenaBank {
  xp: number;
  rank: number;
  wins: number;
  losses: number;
}

export function freshArenaBank(): ArenaBank {
  return { xp: 0, rank: 0, wins: 0, losses: 0 };
}

/**
 * Bank a card's pay. Rank derives from lifetime xp but NEVER demotes
 * (a retuned curve must not strip a shoulder-worn title) — it climbs
 * to the derived rank when the derived rank is higher, and the climb
 * list carries every rung crossed so each gets its ceremony.
 */
export function bankArenaXp(
  bank: ArenaBank,
  gained: number,
  doc: ArenasDef = ARENAS,
): { climbed: number[] } {
  bank.xp += Math.max(0, Math.round(gained));
  const derived = arenaRankForXp(bank.xp, doc);
  const climbed: number[] = [];
  while (bank.rank < derived) {
    bank.rank++;
    climbed.push(bank.rank);
  }
  return { climbed };
}

/** The card's pay for one member, the fallen at the doc's fraction. */
export function arenaPayFor(
  def: ArenaMatchDef,
  alive: boolean,
  doc: ArenasDef = ARENAS,
): number {
  const full = arenaMatchXp(def);
  return alive ? full : Math.round(full * doc.dials.deathXpFrac);
}

// ------------------------------------------------------------ barks

/**
 * The ringmaster's stock line for a moment, seeded so a given match
 * keeps one voice but different matches vary. Round barks authored on
 * the card outrank the stock pocket (the caller checks first).
 */
export function stockBark(
  pocket: keyof ArenasDef['barks'],
  seed: number,
  beat: number,
  doc: ArenasDef = ARENAS,
): string {
  const lines = doc.barks[pocket];
  if (lines.length === 0) return '';
  return lines[hashCoords(seed, beat, 0xba2c) % lines.length]!;
}

// ------------------------------------------------------------ venue

/** The venue a world position stands in (pad tiles beyond the sand). */
export function venueAt(
  x: number,
  y: number,
  pad = 0,
  doc: ArenasDef = ARENAS,
): ArenaVenueDef | null {
  for (const v of doc.venues) {
    if (inPit(v.pit, x, y, pad)) return v;
  }
  return null;
}
