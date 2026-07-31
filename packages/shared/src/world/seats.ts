import { Tile, WALL_RUN_TILES } from './tiles.js';

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

export type SeatKind = 'chair' | 'bench' | 'throne' | 'bed';

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

/** Longest bed run the painter merges (RUN_RING_TILES law). */
const BED_RUN_CAP = 4;

/** A tile a body can sit or lie in. */
export function isSeatTile(t: number | undefined): boolean {
  return t === Tile.Chair || t === Tile.Bench || t === Tile.Throne || t === Tile.Bed;
}

/** The chair painter's table scan — a backrest turns its seat to the table. */
function chairBack(ground: SeatGround, tx: number, ty: number): 'n' | 's' | 'e' | 'w' {
  const isT = (t: number | undefined): boolean => t === Tile.Table || t === Tile.Counter;
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
    case Tile.Bench: {
      // Benches run east-west and have no back — face either long
      // side. A table on one side fixes the facing (a diner looks at
      // the table); otherwise pickSeatDir turns the body to whichever
      // side it walked up from. South (the camera) is the default.
      const isT = (t2: number | undefined): boolean => t2 === Tile.Table || t2 === Tile.Counter;
      const tableN = isT(ground(tx, ty - 1));
      const tableS = isT(ground(tx, ty + 1));
      return {
        kind: 'bench',
        pose: 'sit',
        ax: tx + 0.5,
        ay: ty + 0.66,
        dir: tableN && !tableS ? -Math.PI / 2 : Math.PI / 2,
        fixed: tableN !== tableS,
        seatH: 0.36,
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
