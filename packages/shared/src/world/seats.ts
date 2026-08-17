import { Tile, WALL_RUN_TILES } from './tiles.js';
import { hashCoords } from '../math/rng.js';

/**
 * THE SEAT REGISTRY — furniture seating derived from the world itself.
 *
 * Chairs, benches, thrones, and beds are plain tiles; nothing about
 * "which way the chair faces" or "where the pillow lies" is authored.
 * The renderer's furniture painters derive all of it from neighbor
 * scans, and a body that sits in the furniture must agree with the
 * paint to the pixel. This module is that agreement: ONE pure
 * derivation both the server (mounting bodies, occupancy) and the
 * client (hip height, paint order, lie axis) read.
 *
 * THE PARITY LAW: every rule here mirrors a painter rule in
 * renderer.ts and must change in lockstep with it —
 *  - chair backrest = the Table/Counter neighbor scan (`case Tile.Chair`),
 *  - bench runs = the east/west Bench probe (`case Tile.Bench`),
 *  - bed head = bed-neighbor-then-wall scan (`case Tile.Bed`),
 *  - throne = always faces the camera (`case Tile.Throne`).
 * Seat heights are the painters' own seat-surface constants (chair
 * s*0.34, bench s*0.36, throne plinth+cushion ~s*0.48, bed deck s*0.3).
 */

/** Anything that can answer "what ground tile is here?". */
export type SeatGround = (tx: number, ty: number) => number | undefined;

export type SeatKind = 'chair' | 'bench' | 'throne' | 'bed' | 'daybed' | 'stool';

/** A mounted body's full brief: where to sit, how high, facing where. */
export interface SeatSpec {
  kind: SeatKind;
  /** Chairs, benches, and thrones seat a body; beds lay one down. */
  pose: 'sit' | 'lie';
  /** World-space anchor for the seated body's ground point. */
  ax: number;
  ay: number;
  /**
   * Facing while seated (radians, +x east, +y south). Benches allow
   * both ±π/2 — this is the default; `pickSeatDir` chooses per body.
   */
  dir: number;
  /** Hip lift above the ground line, tile units — the seat surface. */
  seatH: number;
  /** Bench only: a table fixed the facing — pickSeatDir won't turn it. */
  fixed?: boolean;
  /** Bed only: which way the pillow (and the sleeper's head) points. */
  head?: 'n' | 'e' | 'w';
  /**
   * Bed only: deck length in world units along the lie axis (the
   * renderer fits the sleeper — stretch on long beds, curl on cots).
   */
  span?: number;
  /**
   * Tiles this seat claims while occupied. One tile for chairs and
   * thrones, one PER SITTER for benches (a run seats many), the whole
   * run for beds (one sleeper owns the mattress).
   */
  tiles: Array<{ x: number; y: number }>;
}

const WALLS: ReadonlySet<number> = new Set<number>(WALL_RUN_TILES);

/**
 * Longest bed run the painter merges (RUN_RING_TILES law). Exported
 * for the PARITY LAW: the renderer's bed painter must walk exactly
 * this window or a long run gives sim and paint different beds —
 * different tiles, anchor, span, and sort row for the same sleeper.
 */
export const BED_RUN_CAP = 4;

/** A tile a body can sit or lie in. */
export function isSeatTile(t: number | undefined): boolean {
  return (
    t === Tile.Chair ||
    t === Tile.Bench ||
    t === Tile.Throne ||
    t === Tile.Bed ||
    t === Tile.ElvenDaybed ||
    t === Tile.ElvenChair ||
    t === Tile.ElvenBench ||
    t === Tile.StoneBench ||
    t === Tile.SettleBench ||
    t === Tile.WoodStool
  );
}

/**
 * A table a body sits AT: a chair's backrest turns away from it, a
 * stool's sitter faces it, a bench between it and the camera locks
 * its facing. PARITY: the oak chair painter's backrest scan reads
 * this same family — widen them together or the paint lies.
 * (Stations you stand at — enchanting, war, display — are absent by
 * intent: nobody dines at a war table.)
 */
export function isSitAtTable(t: number | undefined): boolean {
  return t === Tile.Table || t === Tile.Counter || t === Tile.ElvenTable;
}

/** The chair painter's table scan — a backrest turns its seat to the table. */
function chairBack(ground: SeatGround, tx: number, ty: number): 'n' | 's' | 'e' | 'w' {
  const isT = isSitAtTable;
  return isT(ground(tx, ty - 1))
    ? 's'
    : isT(ground(tx, ty + 1))
      ? 'n'
      : isT(ground(tx + 1, ty))
        ? 'w'
        : isT(ground(tx - 1, ty))
          ? 'e'
          : 'n';
}

/** Backrest side → the sitter faces the opposite way. */
function faceAwayFrom(back: 'n' | 's' | 'e' | 'w'): number {
  switch (back) {
    case 'n':
      return Math.PI / 2; // back north, face the camera
    case 's':
      return -Math.PI / 2;
    case 'e':
      return Math.PI; // back east, face west
    case 'w':
      return 0;
  }
}

/** The bed painter's head scan: bed run first, then the wall behind the pillow. */
function bedHead(ground: SeatGround, tx: number, ty: number): 'n' | 'e' | 'w' {
  const isBed = (t: number | undefined): boolean => t === Tile.Bed;
  const isWall = (t: number | undefined): boolean => t !== undefined && WALLS.has(t);
  return isBed(ground(tx, ty - 1)) || isBed(ground(tx, ty + 1)) || isWall(ground(tx, ty - 1))
    ? 'n'
    : isWall(ground(tx + 1, ty))
      ? 'e'
      : isWall(ground(tx - 1, ty))
        ? 'w'
        : 'n';
}

/**
 * The seat under a furniture tile, or null if (tx, ty) isn't seatable.
 * Pure derivation — call it anywhere, sim or render, and get the same
 * answer the painters drew.
 */
export function seatAt(ground: SeatGround, tx: number, ty: number): SeatSpec | null {
  const t = ground(tx, ty);
  switch (t) {
    case Tile.Chair: {
      const back = chairBack(ground, tx, ty);
      return {
        kind: 'chair',
        pose: 'sit',
        ax: tx + 0.5,
        // A touch south of centre so the lifted hips land mid-seat
        // between the painter's two floor lines.
        ay: ty + 0.57,
        dir: faceAwayFrom(back),
        seatH: 0.34,
        tiles: [{ x: tx, y: ty }],
      };
    }
    case Tile.Bench:
    case Tile.ElvenBench:
    case Tile.StoneBench: {
      // Benches have no back — face either long side. A table on one
      // side fixes the facing (a diner looks at the table); otherwise
      // pickSeatDir turns the body to whichever side it walked up
      // from. South (the camera) is the default. The elven bench and
      // the civic stone slab obey the same law with their painters'
      // own constants (elven: baseY +0.3, lift 0.36; stone: the
      // knee-high slab, baseY +0.14, lift 0.30) — both are complete
      // one-tile pieces, armrest to armrest, so no run merging.
      const tableN = isSitAtTable(ground(tx, ty - 1));
      const tableS = isSitAtTable(ground(tx, ty + 1));
      return {
        kind: 'bench',
        pose: 'sit',
        ax: tx + 0.5,
        ay: t === Tile.StoneBench ? ty + 0.5 : ty + 0.66,
        dir: tableN && !tableS ? -Math.PI / 2 : Math.PI / 2,
        fixed: tableN !== tableS,
        seatH: t === Tile.StoneBench ? 0.3 : 0.36,
        tiles: [{ x: tx, y: ty }],
      };
    }
    case Tile.ElvenChair:
      // The fair house's armchair: the painter always draws the back
      // NORTH (no table scan — silverbark casework is placed, not
      // turned), so the sitter always faces the camera. Lift 0.36
      // (seatY = baseY − 0.36s), anchor 0.17 north of the baseY
      // floor line at ty+0.78 — the oak chair's own calibration.
      return {
        kind: 'chair',
        pose: 'sit',
        ax: tx + 0.5,
        ay: ty + 0.61,
        dir: Math.PI / 2,
        seatH: 0.36,
        tiles: [{ x: tx, y: ty }],
      };
    case Tile.SettleBench:
      // The hearth settle: a draft-wall you sit IN — high planked
      // back painted north always, so the facing is the camera's.
      // Kind 'chair' is the truth of the body: back support, chair
      // leg spots, and the head-over-the-crest read when a squatter
      // faces away is impossible by construction (dir is fixed).
      return {
        kind: 'chair',
        pose: 'sit',
        ax: tx + 0.5,
        ay: ty + 0.51,
        dir: Math.PI / 2,
        seatH: 0.34,
        tiles: [{ x: tx, y: ty }],
      };
    case Tile.WoodStool: {
      // The universal seat. Round, backless, three legs — any facing
      // agrees with the paint, so the body takes the chair's law and
      // faces the table it serves (else the camera). The painter
      // hash-deals its seat height (0.30 + (h>>>4 & 3)·0.014, salt 41
      // — objectItem's own seed); the registry mirrors the roll so
      // the hips land on the plank, not hover over it.
      const h = hashCoords(41, tx, ty);
      return {
        kind: 'stool',
        pose: 'sit',
        ax: tx + 0.5,
        ay: ty + 0.52,
        dir: faceAwayFrom(chairBack(ground, tx, ty)),
        seatH: 0.3 + ((h >>> 4) & 3) * 0.014,
        tiles: [{ x: tx, y: ty }],
      };
    }
    case Tile.Throne:
      // Crown furniture always faces the camera — the painter's law.
      return {
        kind: 'throne',
        pose: 'sit',
        ax: tx + 0.5,
        ay: ty + 0.55,
        dir: Math.PI / 2,
        seatH: 0.48,
        tiles: [{ x: tx, y: ty }],
      };
    case Tile.ElvenDaybed:
      // THE FAIR HOUSE NAPS UNCOVERED: one tile, lies east-west, the
      // leaf-green bolster (the pillow) at the WEST end, deck lifted
      // 0.3 like a bed — every constant the daybed painter's own
      // (hw 0.58 → span 1.16; baseY south edge − 0.3s deck). No
      // quilt exists on this piece, so the client's tuck stands
      // down by kind — the sleeper rests ON the silk.
      return {
        kind: 'daybed',
        pose: 'lie',
        ax: tx + 0.5,
        // The daybed's art hangs from the tile's SOUTH edge (baseY),
        // unlike the cot's centre — the anchor rides south so the
        // supine body lands mid-mattress, not on the head rail.
        ay: ty + 0.96,
        dir: Math.PI / 2,
        seatH: 0.3,
        head: 'w',
        span: 1.16,
        tiles: [{ x: tx, y: ty }],
      };
    case Tile.Bed: {
      // An E-W bed run: the full-length side-on bed (orientation
      // priority, PARITY with the painter: N-S run > E-W run > the
      // lone bed's wall scan).
      const isBed = (t2: number | undefined): boolean => t2 === Tile.Bed;
      if (
        !isBed(ground(tx, ty - 1)) &&
        !isBed(ground(tx, ty + 1)) &&
        (isBed(ground(tx + 1, ty)) || isBed(ground(tx - 1, ty)))
      ) {
        const isWall = (t2: number | undefined): boolean => t2 !== undefined && WALLS.has(t2);
        let x0 = tx;
        let x1 = tx;
        while (x0 > tx - BED_RUN_CAP && ground(x0 - 1, ty) === Tile.Bed) x0--;
        while (x1 < x0 + BED_RUN_CAP - 1 && ground(x1 + 1, ty) === Tile.Bed) x1++;
        const head = isWall(ground(x1 + 1, ty)) ? 'e' : isWall(ground(x0 - 1, ty)) ? 'w' : 'e';
        const tiles: Array<{ x: number; y: number }> = [];
        for (let x = x0; x <= x1; x++) tiles.push({ x, y: ty });
        return {
          kind: 'bed',
          pose: 'lie',
          ax: (x0 + x1 + 1) / 2,
          ay: ty + 0.54,
          dir: Math.PI / 2,
          seatH: 0.3,
          head,
          span: x1 - x0 + 0.92,
          tiles,
        };
      }
      const head = bedHead(ground, tx, ty);
      if (head !== 'n') {
        // Side-on cot: one tile, pillow against the east or west wall.
        return {
          kind: 'bed',
          pose: 'lie',
          ax: tx + 0.5,
          ay: ty + 0.54,
          dir: Math.PI / 2,
          seatH: 0.3,
          head,
          span: 0.92,
          tiles: [{ x: tx, y: ty }],
        };
      }
      // North-south bed: walk the run (the painter merges these).
      let y0 = ty;
      let y1 = ty;
      while (y0 > ty - BED_RUN_CAP && ground(tx, y0 - 1) === Tile.Bed) y0--;
      while (y1 < y0 + BED_RUN_CAP - 1 && ground(tx, y1 + 1) === Tile.Bed) y1++;
      const tiles: Array<{ x: number; y: number }> = [];
      for (let y = y0; y <= y1; y++) tiles.push({ x: tx, y });
      // Deck extent per the painter's BODY-SCALE law: pillow at the
      // head tile's north line, deck running a full body-length south
      // (1.62 past a lone tile's centre, 0.75 past a run's foot) —
      // capped at the compact cot when a wall stands at the foot.
      const isWallS = ((): boolean => {
        const t2 = ground(tx, y1 + 1);
        return t2 !== undefined && WALLS.has(t2);
      })();
      const runV = y1 - y0;
      const span = 0.5 + runV + (isWallS ? 0.4 : runV > 0 ? 0.75 : 1.62);
      return {
        kind: 'bed',
        pose: 'lie',
        // Mid-deck, so head and feet share the mattress evenly.
        ax: tx + 0.5,
        // A sleeper lies FACE UP — the supine figure's face points at
        // the camera, whatever way the bed runs.
        ay: (y0 + y1 + 1) / 2 + 0.04,
        dir: Math.PI / 2,
        seatH: 0.3,
        head,
        span,
        tiles,
      };
    }
    default:
      return null;
  }
}

/**
 * The facing a body takes when it mounts `spec` from (fromX, fromY).
 * Only a free-standing bench offers a choice — sit facing the side
 * you came from; a table-fixed bench already chose for you.
 */
export function pickSeatDir(spec: SeatSpec, _fromX: number, fromY: number): number {
  if (spec.kind !== 'bench' || spec.fixed) return spec.dir;
  const cy = spec.tiles[0]!.y + 0.5;
  return fromY < cy ? -Math.PI / 2 : Math.PI / 2;
}
