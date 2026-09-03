/**
 * THE SHELF'S FACE — cliff faces and side runs, their memo, and the
 * budget-honest run bakes.
 * Moved verbatim off the Renderer class (foundations F2 wave B); the
 * painters reach the engine through the shared PaintHost slice.
 */
import { ClientGame } from '../game/clientGame.js';
import { BakeLane } from './bakeAdmission.js';
import { ELEV_H } from './elevPick.js';
import { shade } from './rig.js';
import { chamferRect } from './shapes.js';
import { StageBlend } from './stage/stageTypes.js';
import { FALL_LOOKAHEAD, SpillInfo, fallAt, fallRibbonItem, fallSideDressItem, landClipFor, mouthClipFor, pushNorthFallItems, pushSouthFallItems } from './waterfalls.js';
import { CHUNK_SIZE, Tile, hashCoords } from '@arx/shared';
import type { DrawItem } from './renderer.js';
import { stone01 } from './paintVocab.js';
import { projectFace } from './structureFace.js';
import type { CliffRunBake, Renderer } from './renderer.js';
import type { PaintHost } from './paintHost.js';

/** Bake box in tiles around a run's row line: above the crown top
 *  (brow tuck + margin), below the base (AO stroke + scree), and
 *  sideways past the span (tuft overhang, joint lean). Proven by a
 *  fat-margin rig bake, round 8's method. */
const CLIFF_BAKE_NORTH_T = 0.5;

const CLIFF_BAKE_PAD_X_T = 0.35;

const CLIFF_BAKE_SOUTH_T = 0.3;

/** Runs cut every this many tiles — a shelf, not a wall (round
 *  10's law: one piece is never a budget), and the same ledger
 *  covers ~4x the rim. */
const CLIFF_RUN_MAX_SPAN = 12;

/** Contour segments per marching-squares mask, with outward normals.
 *  Endpoints in dual-cell units: T(0,-.5) R(.5,0) B(0,.5) L(-.5,0). */
const FACE_SEGS: Array<Array<{ a: [number, number]; b: [number, number]; n: [number, number] }>> = (() => {
  const T: [number, number] = [0, -0.5];
  const R: [number, number] = [0.5, 0];
  const B: [number, number] = [0, 0.5];
  const L: [number, number] = [-0.5, 0];
  const q = Math.SQRT1_2;
  const seg = (a: [number, number], b: [number, number], n: [number, number]) => ({ a, b, n });
  const table: Array<Array<{ a: [number, number]; b: [number, number]; n: [number, number] }>> = [];
  table[0] = []; table[15] = [];
  table[1] = [seg(T, L, [q, q])];
  table[14] = [seg(T, L, [-q, -q])];
  table[2] = [seg(T, R, [-q, q])];
  table[13] = [seg(T, R, [q, -q])];
  table[4] = [seg(R, B, [-q, -q])];
  table[11] = [seg(R, B, [q, q])];
  table[8] = [seg(L, B, [q, -q])];
  table[7] = [seg(L, B, [-q, q])];
  table[3] = [seg(L, R, [0, 1])];
  table[12] = [seg(L, R, [0, -1])];
  table[9] = [seg(T, B, [1, 0])];
  table[6] = [seg(T, B, [-1, 0])];
  table[5] = [seg(T, R, [q, -q]), seg(B, L, [-q, q])];
  table[10] = [seg(T, L, [-q, -q]), seg(R, B, [q, q])];
  return table;
})();

/**
 * SQUARE-CORNER contour variant, used for dual cells that touch a
 * stair tile. A beveled (diagonal) corner cuts a quarter-tile into
 * the neighbouring column — beside a stair that hangs the corner's
 * curtain over the flight. Square corners hug the tile boundary, so
 * the stair's column stays sacrosanct: walls turn AT its edge, with
 * an edge-on side piece (M = cell center = the shared tile corner).
 */
const SQUARE_SEGS: Array<Array<{ a: [number, number]; b: [number, number]; n: [number, number] }>> = (() => {
  const T: [number, number] = [0, -0.5];
  const R: [number, number] = [0.5, 0];
  const B: [number, number] = [0, 0.5];
  const L: [number, number] = [-0.5, 0];
  const M: [number, number] = [0, 0];
  const seg = (a: [number, number], b: [number, number], n: [number, number]) => ({ a, b, n });
  const t: Array<Array<{ a: [number, number]; b: [number, number]; n: [number, number] }>> = [];
  t[0] = []; t[15] = [];
  t[3] = [seg(L, R, [0, 1])];
  t[12] = [seg(L, R, [0, -1])];
  t[9] = [seg(T, B, [1, 0])];
  t[6] = [seg(T, B, [-1, 0])];
  t[1] = [seg(T, M, [1, 0]), seg(M, L, [0, 1])];
  t[14] = [seg(T, M, [-1, 0]), seg(M, L, [0, -1])];
  t[2] = [seg(T, M, [-1, 0]), seg(M, R, [0, 1])];
  t[13] = [seg(T, M, [1, 0]), seg(M, R, [0, -1])];
  t[4] = [seg(R, M, [0, -1]), seg(M, B, [-1, 0])];
  t[11] = [seg(R, M, [0, 1]), seg(M, B, [1, 0])];
  t[8] = [seg(L, M, [0, -1]), seg(M, B, [1, 0])];
  t[7] = [seg(L, M, [0, 1]), seg(M, B, [-1, 0])];
  t[5] = [...t[1]!, ...t[4]!];
  t[10] = [...t[2]!, ...t[8]!];
  return t;
})();


/** Chunk revs over the padded scan window — the memo's world key. */
export function cliffRevKey(rend: PaintHost, game: ClientGame, b: { minTx: number; maxTx: number; minTy: number; maxTy: number }): string {
  const minCx = Math.floor((b.minTx - 2) / CHUNK_SIZE);
  const maxCx = Math.floor((b.maxTx + 2) / CHUNK_SIZE);
  const minCy = Math.floor((b.minTy - 3) / CHUNK_SIZE);
  const maxCy = Math.floor((b.maxTy + 3) / CHUNK_SIZE);
  let sum = 0;
  let count = 0;
  for (let cy = minCy; cy <= maxCy; cy++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      const data = game.world.get(cx, cy);
      if (!data) continue;
      count++;
      sum += data.rev ?? 0;
    }
  }
  return `${count}:${sum}`;
}

export function collectCliffFaces(rend: PaintHost, game: ClientGame, items: DrawItem[]): void {
  const b = rend.visibleTileBounds();
  const key = `${b.minTx},${b.maxTx},${b.minTy},${b.maxTy}|${cliffRevKey(rend, game, b)}`;
  let memo = rend.cliffMemo;
  if (!memo || memo.key !== key) {
    memo = buildCliffMemo(rend, game, b, key);
    rend.cliffMemo = memo;
  }
  // Replay in the scan's own order: faces and fall crests in cell
  // order, then the merged side runs — exactly where the live scan
  // emitted them, so every stable-sort tie stays put.
  for (const lv of memo.levels) {
    const f = lv.faces;
    const fr = lv.fruns;
    let ri = 0;
    let runEnd = -1;
    for (let i = 0, o = 0; i < f.length; i += 8, o++) {
      if (ri < fr.length && fr[ri] === o) {
        // THE CLIFF JOINS THE STANDING WORLD: one item per straight
        // run — a cached curtain blit standing where its first
        // member stood. Members were consecutive same-sortY ties,
        // so the stable sort cannot tell the difference.
        items.push(cliffRunItem(rend, game, lv.level, f, fr[ri]!, fr[ri + 1]!, fr[ri + 2]!));
        runEnd = fr[ri + 1]!;
        ri += 3;
      } else if (o > runEnd) {
        const fit = cliffFaceItem(rend, game, f[i]!, f[i + 1]!, f[i + 2]!, f[i + 3]!, f[i + 4]!, lv.level, f[i + 6]!, f[i + 7]!);
        if (rend.stageWorld) {
          // THE WALL LANE reaches the diagonals (part 4): captured-
          // ctx factories reconstruct under the swapped brush inside
          // a face-extent box — Hoargate's unmarked 137/frame class.
          const ax2 = f[i]!;
          const ay2 = f[i + 1]!;
          const bx2 = f[i + 2]!;
          const by2 = f[i + 3]!;
          const k2 = f[i + 4]!;
          const g6 = f[i + 6]!;
          const g7 = f[i + 7]!;
          const lvl = lv.level;
          const sS = rend.camera.scale;
          const pA2 = rend.camera.worldToScreen(Math.min(ax2, bx2), Math.min(ay2, by2), rend.w, rend.h);
          const pB2 = rend.camera.worldToScreen(Math.max(ax2, bx2), Math.max(ay2, by2), rend.w, rend.h);
          fit.pb = {
            x: pA2.x - 1.2 * sS,
            y: pA2.y - (lvl * ELEV_H + 1.9) * sS,
            w: pB2.x - pA2.x + 2.4 * sS,
            h: pB2.y - pA2.y + (lvl * ELEV_H + 1.9 + 1.4) * sS,
          };
          fit.stageRebuild = () =>
            cliffFaceItem(rend, game, ax2, ay2, bx2, by2, k2, lvl, g6, g7).draw!();
        }
        items.push(fit);
      }
      pushSouthFallItems(rend, game, items, f[i]!, f[i + 1]!, f[i + 2]!, f[i + 3]!, f[i + 4]!, f[i + 5]!, lv.level);
    }
    const n = lv.norths;
    for (let i = 0; i < n.length; i += 6) {
      pushNorthFallItems(rend, game, items, n[i]!, n[i + 1]!, n[i + 2]!, n[i + 3]!, n[i + 4]!, n[i + 5]!, lv.level);
    }
    const r = lv.runs;
    for (let i = 0; i < r.length; i += 4) {
      emitCliffSideRun(rend, game, items, lv.level, r[i]!, r[i + 1]!, r[i + 2]!, r[i + 3]!);
    }
  }
}

export function buildCliffMemo(rend: PaintHost, 
  game: ClientGame,
  b: { minTx: number; maxTx: number; minTy: number; maxTy: number },
  key: string,
): NonNullable<Renderer['cliffMemo']> {
  const levels: NonNullable<Renderer['cliffMemo']>['levels'] = [];
  // Boundaries are RELATIVE: every seam between L−1 and L gets faces
  // owned by the ≥L side, whatever the sign — a pit's rim is the same
  // law as a plateau's edge. Scan the visible levels once.
  let visMin = 0;
  let visMax = 0;
  for (let ty = b.minTy; ty <= b.maxTy; ty++) {
    for (let tx = b.minTx; tx <= b.maxTx; tx++) {
      const e = rend.fgElevAt(tx, ty);
      if (e > visMax) visMax = e;
      if (e < visMin) visMin = e;
    }
  }
  for (let level = visMin + 1; level <= visMax; level++) {
    const faces: number[] = [];
    const norths: number[] = [];
    const runsOut: number[] = [];
    // Ramps COUNT as mass here (unlike the crown bake): the contour
    // must not wrap around a stair notch, or mouth-corner cells hang
    // little curtains over the flight.
    const member = (tx: number, ty: number): boolean => rend.fgElevAt(tx, ty) >= level;
    // A ramp owns the opening in ITS OWN level's cliff line — its
    // mouth and top edges belong to the flight drawing. A ramp of a
    // different level is ordinary mass to this contour.
    const owningRamp = (tx: number, ty: number): boolean =>
      rend.fgGroundAt(tx, ty) === Tile.Ramp && rend.fgElevAt(tx, ty) === level;
    // Contour segments span a whole dual cell, but ramp ownership is
    // tile-aligned — HALF a segment can front a flight while the
    // other half fronts solid cliff. Test each half against its own
    // flanking tiles (quarter-offset samples stay inside the right
    // tile) so curtains end exactly at the stair's edge: no curtain
    // overhanging the flight, no hole beside it.
    const halfOwned = (
      hax: number,
      hay: number,
      hbx: number,
      hby: number,
      n: [number, number],
    ): boolean => {
      const qx = (hax + hbx) / 2;
      const qy = (hay + hby) / 2;
      return (
        owningRamp(Math.floor(qx + n[0] * 0.25), Math.floor(qy + n[1] * 0.25)) ||
        owningRamp(Math.floor(qx - n[0] * 0.25), Math.floor(qy - n[1] * 0.25))
      );
    };
    // Pure north-south edges are edge-on to the camera; they render
    // as SIDE pieces of wall thickness. Collected here and merged
    // into unbroken runs first — a lone cell-tall sliver reads as a
    // stray line, one solid piece per run reads as architecture.
    const sideRuns = new Map<string, Array<[number, number]>>();
    for (let j = b.minTy - 2; j <= b.maxTy + 2; j++) {
      for (let i = b.minTx - 1; i <= b.maxTx + 2; i++) {
        const mask =
          (member(i - 1, j - 1) ? 1 : 0) |
          (member(i, j - 1) ? 2 : 0) |
          (member(i, j) ? 4 : 0) |
          (member(i - 1, j) ? 8 : 0);
        // Cells touching a stair turn with SQUARE corners — a bevel
        // here would cut into the flight's column and hang its
        // curtain over the treads. Must match the crown bake's rule.
        const nearStair =
          owningRamp(i - 1, j - 1) || owningRamp(i, j - 1) || owningRamp(i, j) || owningRamp(i - 1, j);
        const segs = (nearStair ? SQUARE_SEGS : FACE_SEGS)[mask]!;
        if (segs.length === 0) continue;
        for (const sg of segs) {
          const ax = i + sg.a[0];
          const ay = j + sg.a[1];
          const bx = i + sg.b[0];
          const by = j + sg.b[1];
          const mx = (ax + bx) / 2;
          const my = (ay + by) / 2;
          const dropA = halfOwned(ax, ay, mx, my, sg.n);
          const dropB = halfOwned(mx, my, bx, by, sg.n);
          if (dropA && dropB) continue;
          // Whole segments stay whole (stable detail hashing); only
          // stair-adjacent segments get clipped to their live half.
          const parts: Array<[number, number, number, number]> =
            !dropA && !dropB
              ? [[ax, ay, bx, by]]
              : dropA
                ? [[mx, my, bx, by]]
                : [[ax, ay, mx, my]];
          for (const [pax, pay, pbx, pby] of parts) {
            if (sg.n[1] > 0.01) {
              faces.push(pax, pay, pbx, pby, sg.n[0], sg.n[1], i, j);
            } else if (Math.abs(sg.n[1]) <= 0.01) {
              const skey = `${sg.n[0] >= 0 ? 1 : 0}|${pax}`;
              let runs = sideRuns.get(skey);
              if (!runs) sideRuns.set(skey, (runs = []));
              runs.push([Math.min(pay, pby), Math.max(pay, pby)]);
            } else {
              // Back faces are invisible — but a NORTH fall still
              // shows its crest, its plume and its far basin.
              norths.push(pax, pay, pbx, pby, sg.n[0], sg.n[1]);
            }
          }
        }
      }
    }
    for (const [skey, spans] of sideRuns) {
      const [sideStr, xStr] = skey.split('|');
      const nx = sideStr === '1' ? 1 : -1;
      const x = Number(xStr);
      spans.sort((p, q) => p[0] - q[0]);
      let [y0, y1] = spans[0]!;
      for (let k = 1; k <= spans.length; k++) {
        const next = spans[k];
        if (next && next[0] <= y1 + 0.001) {
          y1 = Math.max(y1!, next[1]);
        } else {
          runsOut.push(nx, x, y0!, y1!);
          if (next) [y0, y1] = next;
        }
      }
    }
    // THE CLIFF JOINS THE STANDING WORLD: straight south faces
    // chain into bake runs (same row, abutting spans, cut every
    // CLIFF_RUN_MAX_SPAN tiles — a shelf, not a wall). Bevels and
    // diagonals stay per-segment: they are few, and their sort rows
    // differ. Grouped here, once per memo, with a per-run world rev
    // so a terraform re-keys exactly the curtains it touched.
    const fruns: number[] = [];
    const nFaces = faces.length / 8;
    let r0 = -1;
    const runRev = (o0: number, o1: number): number => {
      const rax = faces[o0 * 8]!;
      const rbx = faces[o1 * 8 + 2]!;
      const ray = faces[o0 * 8 + 1]!;
      let rev = 0;
      const cx0 = Math.floor((rax - 1) / CHUNK_SIZE);
      const cx1 = Math.floor((rbx + 1) / CHUNK_SIZE);
      const cy0 = Math.floor((ray - 3) / CHUNK_SIZE);
      const cy1 = Math.floor((ray + 1) / CHUNK_SIZE);
      for (let cy = cy0; cy <= cy1; cy++)
        for (let cx = cx0; cx <= cx1; cx++) rev += game.world.get(cx, cy)?.rev ?? 0;
      return rev;
    };
    const flushRun = (o1: number): void => {
      if (r0 < 0) return;
      fruns.push(r0, o1, runRev(r0, o1));
      r0 = -1;
    };
    for (let o = 0; o < nFaces; o++) {
      const f = o * 8;
      const straight = Math.abs(faces[f + 4]!) <= 0.01 && faces[f + 1] === faces[f + 3];
      if (!straight) {
        flushRun(o - 1);
        continue;
      }
      if (r0 >= 0) {
        const chain =
          faces[f + 1] === faces[r0 * 8 + 1] &&
          faces[f] === faces[(o - 1) * 8 + 2] &&
          faces[f + 2]! - faces[r0 * 8]! <= CLIFF_RUN_MAX_SPAN;
        if (!chain) flushRun(o - 1);
      }
      if (r0 < 0) r0 = o;
    }
    flushRun(nFaces - 1);
    if (faces.length > 0 || norths.length > 0 || runsOut.length > 0)
      levels.push({ level, faces, norths, runs: runsOut, fruns });
  }
  return { key, levels };
}

/**
 * One merged side run, emitted per world row with live water-fall
 * probing — the scan's old emitRun closure, verbatim. Falls stay
 * fully live: their clips and race read the world each frame.
 */
export function emitCliffSideRun(rend: PaintHost, 
  game: ClientGame,
  items: DrawItem[],
  level: number,
  nx: number,
  x: number,
  a: number,
  b: number,
): void {
  // One slice per world row: caps land on the run's true ends,
  // while each slice y-sorts independently so props and
  // entities along the wall line draw over their own stretch.
  // Water streaks along the run merge into ONE ribbon + dress
  // pair per streak — the falling sheet's motion needs the
  // whole height, not row-sliced phases.
  let fallR0 = 0;
  let fallInfo: SpillInfo | null = null;
  const flushFall = (rEnd: number): void => {
    if (!fallInfo) return;
    const step = nx >= 0 ? -1 : 1;
    const mouth = mouthClipFor(rend, 
      game,
      level,
      'y',
      fallR0,
      rEnd - 1,
      nx >= 0 ? x - 1 : x,
      step,
    );
    const lc0 = nx >= 0 ? x - 1 : x - FALL_LOOKAHEAD - 4;
    const lc1 = nx >= 0 ? x + FALL_LOOKAHEAD + 4 : x + 1;
    const land = landClipFor(rend, 
      game,
      fallInfo.landElev,
      lc0,
      lc1,
      fallR0 - 3,
      rEnd + 3,
    );
    const apron = mouthClipFor(rend, 
      game,
      fallInfo.landElev,
      'y',
      fallR0,
      rEnd - 1,
      nx >= 0 ? x : x - 1,
      nx >= 0 ? 1 : -1,
    );
    items.push(fallRibbonItem(rend, x, fallR0, rEnd, nx, level, fallInfo, land));
    items.push(
      fallSideDressItem(rend, 
        game,
        x,
        fallR0,
        rEnd,
        nx,
        level,
        fallInfo,
        mouth,
        land,
        apron,
      ),
    );
    fallInfo = null;
  };
  for (let r = Math.floor(a); r < b; r++) {
    const s0 = Math.max(a, r);
    const s1 = Math.min(b, r + 1);
    {
      const sit = cliffSideItem(rend, x, s0, s1, nx, level, a, s0 === a, s1 === b);
      if (rend.stageWorld) {
        const isTop2 = s0 === a;
        const isBot2 = s1 === b;
        const sS = rend.camera.scale;
        const pA2 = rend.camera.worldToScreen(x, s0, rend.w, rend.h);
        const pB2 = rend.camera.worldToScreen(x, s1, rend.w, rend.h);
        sit.pb = {
          x: pA2.x - 0.8 * sS,
          y: pA2.y - (level * ELEV_H + 0.4) * sS,
          w: 1.6 * sS,
          h: pB2.y - pA2.y + (level * ELEV_H + 1.2) * sS,
        };
        sit.stageRebuild = () => cliffSideItem(rend, x, s0, s1, nx, level, a, isTop2, isBot2).draw!();
      }
      items.push(sit);
    }
    const fi = fallAt(rend, game, x, r + 0.5, nx, 0, level);
    if (fi) {
      if (!fallInfo) {
        fallR0 = r;
        fallInfo = fi;
      } else {
        fallInfo = {
          race: Math.min(fallInfo.race, fi.race),
          drop: Math.min(fallInfo.drop, fi.drop),
          landElev: Math.min(fallInfo.landElev, fi.landElev),
        };
      }
    } else {
      flushFall(r);
    }
  }
  flushFall(Math.ceil(b));
}

/** One contour segment extruded into a face curtain (level -> level-1). */
export function cliffFaceItem(rend: PaintHost, 
  game: ClientGame,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  nx: number,
  level: number,
  ci: number,
  cj: number,
): DrawItem {
  const ctx = rend.ctx;
  const s = rend.camera.scale;
  const topLift = level * ELEV_H * s;
  const baseLift = (level - 1) * ELEV_H * s;
  const h = hashCoords(53 + level, ci, cj);
  // Ensure a runs west of b so shading and details are stable.
  if (ax > bx || (ax === bx && ay > by)) {
    [ax, bx] = [bx, ax];
    [ay, by] = [by, ay];
  }
  const diagonal = Math.abs(nx) > 0.01;
  // Tone by facing: S = base, SE-turn = shaded, SW-turn = sunlit.
  const tone = !diagonal ? 0 : nx > 0 ? -16 : 12;
  // What tops the cliff decides its brow: sod spills over a grassy
  // crown, bare rock keeps a plain undercut. Sampled once from the
  // high side of the segment.
  const hmx = (ax + bx) / 2;
  const hmy = (ay + by) / 2;
  let htx = Math.floor(hmx - nx * 0.4);
  let hty = Math.floor(hmy - 0.4);
  if (game.world.elevAt(htx, hty) < level) htx = Math.floor(hmx);
  // The rim row itself is the Cliff strip — the ground that grows
  // things starts behind it. Step north past the rock band.
  for (let back = 0; back < 2 && game.world.groundAt(htx, hty) === Tile.Cliff; back++) hty--;
  const aboveT = game.world.groundAt(htx, hty);
  const turf = aboveT === Tile.Grass || aboveT === Tile.GrassTall;

  return {
    // DIAGONAL SORT LAW: a bevel's occlusion boundary varies with x,
    // so sorting at its far row lets it paint over a body standing
    // visually IN FRONT of the line but north of the segment's max
    // row (the corner-hug clip). Sort at the NEAR row instead: the
    // pocket north of the line inside the dual cell is cliff mass —
    // nothing can ever stand there at face level — so anything
    // whose feet share the segment's rows is in front by
    // construction and must win. Straight south faces (ay === by)
    // are unchanged by min().
    //
    // THE SHELF LAW settles both historic face contests at once: the
    // face stands on its BASE level (strat level−1), so anything on
    // its own crown (a blade swung over the rim, a climber on the
    // flight beside the wall — shelf `level`) paints over it by
    // shelf, while everything at the base level behind the wall (an
    // ore on the terrace against a higher band — same shelf, smaller
    // raw row) is buried by it. The old fix sorted the face at its
    // visual top in LIFTED space, which let base-level content punch
    // through and forced the object shift that sliced every tree on
    // a plateau.
    strat: level - 1 !== 0 ? level - 1 : undefined,
    sortY: Math.min(ay, by) + 0.001,
    drawShadow:
      level - 1 === 0
        ? () => {
            // Contact shadow: the top edge sits EXACTLY on the base
            // line (the face itself covers any overdraw above it),
            // its skew leaning with the sun as it falls across the
            // ground — clamped so the seam never detaches.
            const A = rend.camera.worldToScreen(ax, ay, rend.w, rend.h);
            const B = rend.camera.worldToScreen(bx, by, rend.w, rend.h);
            const skew = Math.max(-s * 0.6, Math.min(s * 0.6, rend.castOffset(0.5).x));
            const fill = (): void => {
              const c = rend.beginContactFill();
              c.beginPath();
              c.moveTo(A.x, A.y - baseLift - 1);
              c.lineTo(B.x, B.y - baseLift - 1);
              c.lineTo(B.x + skew, B.y - baseLift + s * 0.42);
              c.lineTo(A.x + skew, A.y - baseLift + s * 0.42);
              c.closePath();
              c.fill();
              c.globalAlpha = 1;
            };
            if (rend.stageAssembling) {
              // The seam rides the layer as a bounded scratch strip.
              const x0 = Math.min(A.x, B.x) + Math.min(0, skew) - 1;
              const x1b = Math.max(A.x, B.x) + Math.max(0, skew) + 1;
              const y0 = Math.min(A.y, B.y) - baseLift - 2;
              const y1b = Math.max(A.y, B.y) - baseLift + s * 0.42 + 1;
              rend.stageCastScratch(x0, y0, x1b - x0, y1b - y0, fill);
              return;
            }
            fill();
          }
        : undefined,
    draw: () => {
      // THE STRUCTURE FACE (cliffArt/deck law): project the two world
      // corners, round shared endpoints to whole pixels so adjacent
      // curtains meet without hairlines, and foreshorten each corner by
      // ITS OWN depthScale — the curtain recedes as a true trapezoid (the
      // far corner shorter), not a parallel-shifted band. topLift/baseLift
      // are already scaled by `s`, so they pass as the screen-space lifts.
      // B-3 SPANNING WARP (Epic B): every detail below rides yTop*/yBase*
      // via the interpolators, so warping these four warps the whole face.
      // At q=0 depthScale is exactly 1 → byte-identical.
      const g = projectFace(rend.camera, rend.w, rend.h, ax, ay, bx, by, topLift, baseLift);
      const A = { x: g.ax, y: g.ay };
      const B = { x: g.bx, y: g.by };
      const dsA = g.dsA;
      const dsB = g.dsB;
      const yTopA = g.yTopA - 1.5; // tucked under the crown band
      const yTopB = g.yTopB - 1.5;
      const yBaseA = g.yBotA;
      const yBaseB = g.yBotB;
      // EVERY mark below is keyed to WORLD x, never to segment-local
      // fractions: beds, joints, blocks and tufts continue unbroken
      // across curtain seams and around diagonal turns, and no two
      // stretches of wall repeat. Segment-local detail is what made
      // the old face read as fence posts.
      const wxSpan = bx - ax;
      const n01 = (a: number, sa: number) => stone01(a, sa, level * 31 + 7);
      const vnoise = (wx: number, salt: number, ks: number): number => {
        const t = wx / ks;
        const i = Math.floor(t);
        const f = t - i;
        const u = f * f * (3 - 2 * f);
        return n01(i, salt) * (1 - u) + n01(i + 1, salt) * u;
      };
      const fOf = (wx: number) => (wx - ax) / wxSpan;
      const sxAt = (f: number) => A.x + (B.x - A.x) * f;
      const yTopAt = (f: number) => yTopA + (yTopB - yTopA) * f;
      const yBaseAt = (f: number) => yBaseA + (yBaseB - yBaseA) * f;
      const yAt = (f: number, frac: number) => yTopAt(f) + (yBaseAt(f) - yTopAt(f)) * frac;
      const fine = s >= 26;
      // Rock body: vertical gradient, lit near the brink.
      const grad = ctx.createLinearGradient(0, Math.min(yTopA, yTopB), 0, Math.max(yBaseA, yBaseB));
      grad.addColorStop(0, shade('#746c80', tone));
      grad.addColorStop(0.45, shade('#5e5669', tone));
      grad.addColorStop(1, shade('#453e51', tone));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(A.x, yTopA);
      ctx.lineTo(B.x, yTopB);
      ctx.lineTo(B.x, yBaseB + 0.5);
      ctx.lineTo(A.x, yBaseA + 0.5);
      ctx.closePath();
      ctx.fill();
      // Macro forms first: a slow full-height light/dark drift, so
      // the cliff reads as great masses before any detail lands.
      for (let wx0 = Math.floor(ax * 2) / 2; wx0 < bx; wx0 += 0.5) {
        const x0 = Math.max(ax, wx0);
        const x1 = Math.min(bx, wx0 + 0.5);
        if (x1 - x0 < 0.02) continue;
        const v = vnoise((x0 + x1) / 2, 6, 1.7) - 0.5;
        if (Math.abs(v) < 0.1) continue;
        ctx.fillStyle =
          v > 0
            ? `rgba(236, 232, 240, ${Math.min(0.06, v * 0.16)})`
            : `rgba(26, 20, 36, ${Math.min(0.08, -v * 0.2)})`;
        const f0 = fOf(x0);
        const f1 = fOf(x1);
        ctx.beginPath();
        ctx.moveTo(sxAt(f0), yTopAt(f0));
        ctx.lineTo(sxAt(f1), yTopAt(f1));
        ctx.lineTo(sxAt(f1), yBaseAt(f1) + 0.5);
        ctx.lineTo(sxAt(f0), yBaseAt(f0) + 0.5);
        ctx.closePath();
        ctx.fill();
      }
      // Bedded strata: three seams whose heights BREATHE along the
      // run (value-noise over world x, salted per level). Beds still
      // run unbroken along straight runs AND diagonal turns, but no
      // two stretches of wall band at the same heights — and each
      // seam is a shelf (lit lip above, shadow within), not a stripe.
      const bedBase = [
        0.24 + (n01(9001, 11) - 0.5) * 0.08,
        0.5 + (n01(9002, 11) - 0.5) * 0.08,
        0.76 + (n01(9003, 11) - 0.5) * 0.08,
      ];
      const bedAt = (wx: number, k: number): number => {
        const f = bedBase[k]! + (vnoise(wx, 40 + k * 3, 2.3) - 0.5) * 0.17;
        return Math.min(0.94, Math.max(0.1, f));
      };
      const browAt = (wx: number) => 0.045 + vnoise(wx, 20, 0.7) * 0.05;
      const steps = Math.max(2, Math.ceil(wxSpan * 4));
      // Bed seams draw DASHED — each step-span gated by its own
      // noise — because a real bedding plane surfaces and buries
      // itself; an unbroken line is a mortar course.
      const bedPath = (frac: (wx: number) => number, lift2: number, gateSalt: number): void => {
        ctx.beginPath();
        for (let k2 = 0; k2 < steps; k2++) {
          const f0 = k2 / steps;
          const f1 = (k2 + 1) / steps;
          const wxm = ax + wxSpan * (f0 + f1) * 0.5;
          if (gateSalt >= 0 && vnoise(wxm, gateSalt, 0.9) < 0.28) continue;
          ctx.moveTo(sxAt(f0), yAt(f0, frac(ax + wxSpan * f0)) + lift2);
          ctx.lineTo(sxAt(f1), yAt(f1, frac(ax + wxSpan * f1)) + lift2);
        }
        ctx.stroke();
      };
      // One warm ochre seam per LEVEL (level-keyed, so the accent
      // never pops in or out mid-run at a cell boundary).
      const accent = Math.floor(n01(9010, 13) * 3);
      for (let k = 0; k < 3; k++) {
        const wj = (wx: number) => bedAt(wx, k);
        if (k === accent) {
          ctx.strokeStyle = 'rgba(196, 150, 96, 0.14)';
          ctx.lineWidth = Math.max(2, s * 0.07);
          bedPath(wj, 0, -1);
        }
        // A lit ledge only where the shelf actually surfaces (the
        // accent bed and one hash-picked companion), gated with the
        // seam's own dashes.
        if (k === accent || Math.floor(n01(9011, 13) * 3) === k) {
          ctx.strokeStyle = 'rgba(236, 232, 240, 0.09)';
          ctx.lineWidth = Math.max(1, s * 0.03);
          bedPath(wj, -Math.max(1.5, s * 0.045), 50 + k);
        }
        ctx.strokeStyle = 'rgba(30, 23, 42, 0.32)';
        ctx.lineWidth = Math.max(1.5, s * 0.042);
        bedPath(wj, 0, 50 + k);
      }
      if (fine) {
        // Jointing: each bed band breaks into its own rhythm of
        // blocks — staggered like natural fracture, never a grid.
        // Tints are per-block; joints draw half-open on world x so
        // curtain seams never double them.
        for (let band = 0; band < 4; band++) {
          const topF = (wx: number) => (band === 0 ? browAt(wx) : bedAt(wx, band - 1));
          const botF = (wx: number) => (band === 3 ? 0.975 : bedAt(wx, band));
          const bw = 0.7 + n01(60 + band, 17) * 0.5;
          const off = n01(70 + band, 19) * bw;
          const m1 = Math.floor((bx - off) / bw + 1);
          for (let m = Math.floor((ax - off) / bw); m <= m1; m++) {
            const jx0 = off + m * bw;
            const x0 = Math.max(ax, jx0);
            const x1 = Math.min(bx, jx0 + bw);
            if (x1 - x0 < 0.03) continue;
            const v = n01(m, 80 + band);
            if (v < 0.38 || v > 0.62) {
              // Facet tints carry the low-poly read — strong enough
              // to register as planes, never enough to band. A share
              // of the lit planes lean warm: sun-bleached sediment,
              // not one purple repeated forever.
              ctx.fillStyle =
                v > 0.62
                  ? n01(m, 99 + band) > 0.6
                    ? `rgba(224, 200, 164, ${0.05 + (v - 0.62) * 0.2})`
                    : `rgba(236, 232, 240, ${0.04 + (v - 0.62) * 0.22})`
                  : `rgba(26, 20, 36, ${0.04 + (0.38 - v) * 0.26})`;
              const f0 = fOf(x0);
              const f1 = fOf(x1);
              const fm = (f0 + f1) / 2;
              const xm = (x0 + x1) / 2;
              ctx.beginPath();
              ctx.moveTo(sxAt(f0), yAt(f0, topF(x0)));
              ctx.lineTo(sxAt(fm), yAt(fm, topF(xm)));
              ctx.lineTo(sxAt(f1), yAt(f1, topF(x1)));
              ctx.lineTo(sxAt(f1), yAt(f1, botF(x1)));
              ctx.lineTo(sxAt(fm), yAt(fm, botF(xm)));
              ctx.lineTo(sxAt(f0), yAt(f0, botF(x0)));
              ctx.closePath();
              ctx.fill();
            }
            // Fractures, not mortar: only some block edges carry a
            // joint, it leans, and it rarely spans its whole band.
            if (jx0 > ax + 0.02 && jx0 < bx - 0.02 && n01(m, 95 + band) > 0.45) {
              const fj = fOf(jx0);
              const lean = (n01(m, 90 + band) - 0.5) * s * 0.09;
              const ext = n01(m, 97 + band);
              const t0 = topF(jx0) + 0.015 + (ext < 0.33 ? (botF(jx0) - topF(jx0)) * 0.35 : 0);
              const b0 = botF(jx0) - 0.015 - (ext > 0.66 ? (botF(jx0) - topF(jx0)) * 0.35 : 0);
              ctx.strokeStyle = 'rgba(26, 20, 36, 0.22)';
              ctx.lineWidth = Math.max(1, s * 0.028);
              ctx.beginPath();
              ctx.moveTo(sxAt(fj), yAt(fj, t0));
              ctx.lineTo(sxAt(fj) + lean, yAt(fj, b0));
              ctx.stroke();
            }
          }
        }
        // A long crack on some cells: it crosses a bed with a jog —
        // the one mark masonry can never make.
        if (h % 7 < 3) {
          const kBed = (h >> 3) % 2;
          const wxC = ax + wxSpan * (0.25 + ((h >> 6) % 50) / 100);
          if (wxC > ax + 0.06 && wxC < bx - 0.06) {
            const fC = fOf(wxC);
            const jog = s * (0.05 + ((h >> 10) % 7) / 130) * ((h >> 4) % 2 === 0 ? 1 : -1);
            const yA2 = yAt(fC, bedAt(wxC, kBed) - 0.16);
            const yMid = yAt(fC, bedAt(wxC, kBed));
            const yB2 = yAt(fC, bedAt(wxC, kBed) + 0.19);
            ctx.strokeStyle = 'rgba(22, 16, 32, 0.3)';
            ctx.lineWidth = Math.max(1, s * 0.03);
            ctx.beginPath();
            ctx.moveTo(sxAt(fC), yA2);
            ctx.lineTo(sxAt(fC) + jog * 0.4, yMid);
            ctx.lineTo(sxAt(fC) + jog, yB2);
            ctx.stroke();
          }
        }
        // A protruding nose on some cells: one block shoulders out of
        // the face, sunlit on top, pooling shadow beneath — the
        // strongest depth cue a flat curtain can carry.
        if (h % 5 < 2 && wxSpan > 0.4) {
          const band = 1 + ((h >> 4) % 3);
          const cW = 0.13 + ((h >> 7) % 12) / 100;
          const cX = ax + wxSpan * (0.3 + ((h >> 9) % 40) / 100);
          const x0 = Math.max(ax, cX - cW);
          const x1 = Math.min(bx, cX + cW);
          if (x1 - x0 > 0.12) {
            const tF = (wx: number) => bedAt(wx, band - 1);
            const bF = (wx: number) => (band === 3 ? 0.96 : bedAt(wx, band));
            const f0 = fOf(x0);
            const f1 = fOf(x1);
            const fm = (f0 + f1) / 2;
            const xm = (x0 + x1) / 2;
            ctx.fillStyle = 'rgba(236, 232, 240, 0.09)';
            ctx.beginPath();
            ctx.moveTo(sxAt(f0), yAt(f0, tF(x0)));
            ctx.lineTo(sxAt(f1), yAt(f1, tF(x1)));
            ctx.lineTo(sxAt(f1), yAt(f1, bF(x1)));
            ctx.lineTo(sxAt(f0), yAt(f0, bF(x0)));
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 244, 214, 0.16)';
            ctx.lineWidth = Math.max(1.5, s * 0.04);
            ctx.beginPath();
            ctx.moveTo(sxAt(f0), yAt(f0, tF(x0)));
            ctx.lineTo(sxAt(fm), yAt(fm, tF(xm)));
            ctx.lineTo(sxAt(f1), yAt(f1, tF(x1)));
            ctx.stroke();
            ctx.strokeStyle = 'rgba(18, 12, 26, 0.3)';
            ctx.lineWidth = Math.max(2, s * 0.055);
            ctx.beginPath();
            ctx.moveTo(sxAt(f0), yAt(f0, bF(x0)));
            ctx.lineTo(sxAt(fm), yAt(fm, bF(xm)));
            ctx.lineTo(sxAt(f1), yAt(f1, bF(x1)));
            ctx.stroke();
          }
        }
      }
      // The brow: the dark undercut where the crown overhangs its
      // face, with a ragged lower edge. Turf spills over it when
      // grass tops the cliff; bare rock keeps the plain shadow.
      ctx.fillStyle = 'rgba(26, 19, 36, 0.42)';
      ctx.beginPath();
      ctx.moveTo(A.x, yTopA);
      ctx.lineTo(B.x, yTopB);
      for (let k2 = steps; k2 >= 0; k2--) {
        const f = k2 / steps;
        ctx.lineTo(sxAt(f), yAt(f, browAt(ax + wxSpan * f)));
      }
      ctx.closePath();
      ctx.fill();
      if (turf) {
        ctx.fillStyle = 'rgba(74, 108, 50, 0.62)';
        ctx.beginPath();
        ctx.moveTo(A.x, yTopA);
        ctx.lineTo(B.x, yTopB);
        for (let k2 = steps; k2 >= 0; k2--) {
          const f = k2 / steps;
          ctx.lineTo(sxAt(f), yAt(f, browAt(ax + wxSpan * f) * 0.45));
        }
        ctx.closePath();
        ctx.fill();
        if (fine) {
          // Hanging tufts where the sod overshoots the brink —
          // lattice-keyed on world x, so a tuft never doubles (or
          // vanishes) at a curtain seam.
          const tw = Math.max(2.5, s * 0.075);
          ctx.fillStyle = 'rgba(66, 98, 46, 0.7)';
          for (let i2 = Math.ceil(ax / 0.45); i2 * 0.45 < bx; i2++) {
            if (n01(i2, 33) < 0.45) continue;
            const wxT = i2 * 0.45;
            if (wxT <= ax + 0.02 || wxT >= bx - 0.02) continue;
            const fT = fOf(wxT);
            const yT2 = yAt(fT, browAt(wxT) * 0.45);
            const drop = s * (0.08 + n01(i2, 35) * 0.08);
            ctx.beginPath();
            ctx.moveTo(sxAt(fT) - tw, yT2 - 1);
            ctx.lineTo(sxAt(fT) + tw * 0.6, yT2 - 1);
            ctx.lineTo(sxAt(fT) + (n01(i2, 37) - 0.5) * tw, yT2 + drop);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
      // AO where the face meets the ground.
      ctx.strokeStyle = 'rgba(18, 12, 26, 0.3)';
      ctx.lineWidth = Math.max(2, s * 0.06);
      ctx.beginPath();
      ctx.moveTo(A.x, yBaseA - Math.max(1, s * 0.02));
      ctx.lineTo(B.x, yBaseB - Math.max(1, s * 0.02));
      ctx.stroke();
      // Scree at the foot of straight faces — pit floors included
      // (drawn in-sort, so the sunken floor rows can't erase it).
      if (!diagonal && level - 1 <= 0 && (h & 3) !== 0) {
        for (let k = 0; k < 3; k++) {
          const f = 0.14 + ((h >> (6 + k * 5)) % 70) / 100;
          const px2 = A.x + (B.x - A.x) * f;
          const py2 = yBaseA + (yBaseB - yBaseA) * f;
          const pw = s * (0.05 + ((h >> (k * 4)) % 8) / 110);
          ctx.fillStyle = shade(k % 2 === 0 ? '#6a6375' : '#5b5468', tone);
          ctx.beginPath();
          chamferRect(ctx, px2, py2 - pw * 0.6, pw, pw * 0.7, pw * 0.3);
          ctx.fill();
        }
      }
    },
  };
}

/**
 * One straight rim run as a single DrawItem. Strat, sortY and the
 * contact shadow reproduce cliffFaceItem's own formulas exactly —
 * members of a straight run share ay === by, so min(ay, by) is ay
 * for every member and one item sorts precisely where its members
 * did. The contact quad over the whole span is the union of the
 * members' colinear quads, pixel for pixel.
 */
export function cliffRunItem(rend: PaintHost, 
  game: ClientGame,
  level: number,
  faces: number[],
  o0: number,
  o1: number,
  rev: number,
): DrawItem {
  const ax = faces[o0 * 8]!;
  const ay = faces[o0 * 8 + 1]!;
  const bx = faces[o1 * 8 + 2]!;
  const s = rend.camera.scale;
  const baseLift = (level - 1) * ELEV_H * s;
  return {
    strat: level - 1 !== 0 ? level - 1 : undefined,
    sortY: ay + 0.001,
    drawShadow:
      level - 1 === 0
        ? () => {
            const A = rend.camera.worldToScreen(ax, ay, rend.w, rend.h);
            const B = rend.camera.worldToScreen(bx, ay, rend.w, rend.h);
            const skew = Math.max(-s * 0.6, Math.min(s * 0.6, rend.castOffset(0.5).x));
            const fill = (): void => {
              const c = rend.beginContactFill();
              c.beginPath();
              c.moveTo(A.x, A.y - baseLift - 1);
              c.lineTo(B.x, B.y - baseLift - 1);
              c.lineTo(B.x + skew, B.y - baseLift + s * 0.42);
              c.lineTo(A.x + skew, A.y - baseLift + s * 0.42);
              c.closePath();
              c.fill();
              c.globalAlpha = 1;
            };
            if (rend.stageAssembling) {
              const x0 = Math.min(A.x, B.x) + Math.min(0, skew) - 1;
              const x1b = Math.max(A.x, B.x) + Math.max(0, skew) + 1;
              const y0 = Math.min(A.y, B.y) - baseLift - 2;
              const y1b = Math.max(A.y, B.y) - baseLift + s * 0.42 + 1;
              rend.stageCastScratch(x0, y0, x1b - x0, y1b - y0, fill);
              return;
            }
            fill();
          }
        : undefined,
    draw: () => drawCliffRun(rend, game, level, faces, o0, o1, rev),
    stageSafe: true,
    pb: (() => {
      const ax = faces[o0 * 8]!;
      const ay = faces[o0 * 8 + 1]!;
      const bx2 = faces[o1 * 8 + 2]!;
      const s2 = rend.camera.scale;
      const pA = rend.camera.worldToScreen(ax, ay, rend.w, rend.h);
      const pB = rend.camera.worldToScreen(bx2, ay, rend.w, rend.h);
      const north = (level * ELEV_H + CLIFF_BAKE_NORTH_T) * s2;
      const south = (CLIFF_BAKE_SOUTH_T - (level - 1) * ELEV_H) * s2;
      const padX = CLIFF_BAKE_PAD_X_T * s2;
      return { x: pA.x - padX, y: pA.y - north, w: pB.x - pA.x + padX * 2, h: north + south };
    })(),
  };
}

/**
 * Blit the run's cached curtain; bake it through the shared sprite
 * admission lanes when missing; and when no bake stands (declined,
 * mid-glide, layer off) fall back to the members' own live paint —
 * THE STILL-WORLD BARGAIN: a bake is a cache, never a mode.
 */
export function drawCliffRun(rend: PaintHost, 
  game: ClientGame,
  level: number,
  faces: number[],
  o0: number,
  o1: number,
  rev: number,
): void {
  const ax = faces[o0 * 8]!;
  const ay = faces[o0 * 8 + 1]!;
  const bx = faces[o1 * 8 + 2]!;
  const gridPx = rend.bandGridPx();
  const key = `${level}|${ay}|${ax}|${bx}|${rev}|${gridPx}|${rend.dpr()}`;
  let sp = rend.cliffSprites.get(key);
  const s = rend.camera.scale;
  const cam = rend.camera;
  const pA = cam.worldToScreen(ax, ay, rend.w, rend.h);
  const pB = cam.worldToScreen(bx, ay, rend.w, rend.h);
  const northCss = (level * ELEV_H + CLIFF_BAKE_NORTH_T) * s;
  const southCss = (CLIFF_BAKE_SOUTH_T - (level - 1) * ELEV_H) * s;
  const padXCss = CLIFF_BAKE_PAD_X_T * s;
  const visNow =
    pA.x - padXCss < rend.w && pB.x + padXCss > 0 && pA.y - northCss < rend.h && pA.y + southCss > 0;
  if (!sp && rend.staticLayerOn() && !rend.zoomGliding) {
    const lane = rend.admitSpriteBake(true, visNow);
    if (lane !== BakeLane.None) {
      rend.treeBakeBudget--;
      const t0 = performance.now();
      const fresh = bakeCliffRun(rend, game, level, faces, o0, o1, gridPx);
      const took = performance.now() - t0;
      rend.spriteBakeMsLeft -= took;
      rend.bakeCostEma += (took - rend.bakeCostEma) * 0.2;
      if (lane === BakeLane.Arrival) {
        rend.visSpriteMsLeft -= took;
        rend.visArrivalCount--;
      }
      if (fresh) {
        rend.cliffSprites.set(key, fresh);
        sp = fresh;
      }
    }
  }
  if (sp) {
    sp.used = rend.frameNo;
    // THE EXACT LATTICE PATH (blitBand's mapping): settled zoom on
    // the bake's own grid is a pure translation; stale grids map by
    // the scale ratio — transient softness mid-glide, by design.
    const x0 = cam.snapPx(pA.x);
    const y0 = cam.snapPx(pA.y);
    const k = !rend.zoomGliding && sp.gridPx === gridPx ? 1 / cam.snapDpr : s / sp.gridPx;
    if (rend.stageAssembling) {
      rend.stageWorldItems.push({
        kind: 'quad',
        ...((at) => ({ tex: at.tex, sx: at.ox, sy: at.oy }))(
          rend.stageAtlasTex(sp.canvas, 0, sp),
        ),
        sw: sp.w,
        sh: sp.h,
        dw: sp.w * k,
        dh: sp.h * k,
        m: [1, 0, 0, 1, x0 - sp.padX * k, y0 - sp.padTop * k],
        alpha: rend.stageItemAlpha,
        blend: StageBlend.SourceOver,
      });
      rend.stageWorldStats.quads++;
      return;
    }
    rend.ctx.drawImage(
      sp.canvas,
      0,
      0,
      sp.w,
      sp.h,
      x0 - sp.padX * k,
      y0 - sp.padTop * k,
      sp.w * k,
      sp.h * k,
    );
    return;
  }
  if (visNow) rend.liveStats.cliff++;
  if (rend.stageAssembling) {
    // THE STILL-WORLD BARGAIN through the scratch lane: the member
    // items are constructed INSIDE the closure, under the swapped
    // ctx — the same reconstruction the bakes use (the capture law).
    rend.stagePushPaintRaw(
      pA.x - padXCss,
      pA.y - northCss,
      pB.x - pA.x + padXCss * 2,
      northCss + southCss,
      () => {
        for (let o = o0; o <= o1; o++) {
          const f = o * 8;
          cliffFaceItem(rend, 
            game,
            faces[f]!,
            faces[f + 1]!,
            faces[f + 2]!,
            faces[f + 3]!,
            faces[f + 4]!,
            level,
            faces[f + 6]!,
            faces[f + 7]!,
          ).draw!();
        }
      },
      'cliff',
    );
    return;
  }
  for (let o = o0; o <= o1; o++) {
    const f = o * 8;
    cliffFaceItem(rend, 
      game,
      faces[f]!,
      faces[f + 1]!,
      faces[f + 2]!,
      faces[f + 3]!,
      faces[f + 4]!,
      level,
      faces[f + 6]!,
      faces[f + 7]!,
    ).draw!();
  }
}

/**
 * Bake one run (THE SAME-BRUSH LAW): the ctx, camera, snap lattice
 * and viewport swap to the curtain canvas, and the members' items
 * are constructed AGAIN under the swap and draw themselves — the
 * bake is byte-for-byte the live painter's own work. Anchor pads
 * round to whole device pixels (THE ANCHOR SITS ON THE LATTICE).
 */
export function bakeCliffRun(rend: PaintHost, 
  game: ClientGame,
  level: number,
  faces: number[],
  o0: number,
  o1: number,
  gridPx: number,
): CliffRunBake | null {
  const ax = faces[o0 * 8]!;
  const ay = faces[o0 * 8 + 1]!;
  const bx = faces[o1 * 8 + 2]!;
  const dprB = rend.dpr();
  const cssScale = gridPx / dprB;
  const padXT = CLIFF_BAKE_PAD_X_T;
  const northT = level * ELEV_H + CLIFF_BAKE_NORTH_T;
  const southT = CLIFF_BAKE_SOUTH_T - (level - 1) * ELEV_H;
  const cssW = (bx - ax + padXT * 2) * cssScale;
  const cssH = (northT + southT) * cssScale;
  const W = Math.ceil(cssW * dprB);
  const H = Math.ceil(cssH * dprB);
  if (W <= 0 || W > 8192 || H <= 0 || H > 2048) return null;
  const cam = rend.camera;
  const savedX = cam.x;
  const savedY = cam.y;
  const savedScale = cam.scale;
  const savedSnap = cam.snapDpr;
  const savedW = rend.w;
  const savedH = rend.h;
  const savedCtx = rend.ctx;
  rend.bakeVeilFull = true;
  rend.bakingMask = true;
  try {
    const { canvas, sctx } = rend.acquireSpriteCanvas(undefined, W, H);
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, canvas.width, canvas.height);
    sctx.setTransform(dprB, 0, 0, dprB, 0, 0);
    cam.scale = cssScale;
    cam.snapDpr = dprB;
    rend.w = cssW;
    rend.h = cssH;
    const targetX = padXT * cssScale;
    const targetY = northT * cssScale;
    cam.x = (cssW / 2 - (targetX - ax * cssScale)) / cssScale;
    cam.y = (cssH / 2 - (targetY - ay * cssScale * cam.yScale)) / (cssScale * cam.yScale);
    const anchorCss = cam.worldToScreen(ax, ay, cssW, cssH);
    const anchor = { x: Math.round(anchorCss.x * dprB), y: Math.round(anchorCss.y * dprB) };
    rend.ctx = sctx;
    for (let o = o0; o <= o1; o++) {
      const f = o * 8;
      cliffFaceItem(rend, 
        game,
        faces[f]!,
        faces[f + 1]!,
        faces[f + 2]!,
        faces[f + 3]!,
        faces[f + 4]!,
        level,
        faces[f + 6]!,
        faces[f + 7]!,
      ).draw!();
    }
    return {
      canvas,
      ctx: sctx,
      w: W,
      h: H,
      gridPx,
      dpr: dprB,
      padX: anchor.x,
      padTop: anchor.y,
      used: rend.frameNo,
    };
  } finally {
    cam.x = savedX;
    cam.y = savedY;
    cam.scale = savedScale;
    cam.snapDpr = savedSnap;
    rend.w = savedW;
    rend.h = savedH;
    rend.ctx = savedCtx;
    rend.bakeVeilFull = false;
    rend.bakingMask = false;
  }
}

/**
 * Wall THICKNESS for one row-slice of a north-south rim run (world
 * x, world y s0..s1, flags marking the run's true ends). The plane
 * itself is edge-on to the orthographic camera, so we cheat a strip
 * of the wall's outward flank into view: faces terminate into it and
 * jogged rims read as one continuous mass. Slices partition the
 * run's screen extent exactly (each covers [wts(s0)-topLift,
 * wts(s1)-topLift]; the bottom slice extends to the base), so the
 * flat fill tiles seamlessly. Each slice sorts EARLY — a zero-width
 * plane must lose every overlap contest against rocks, props and
 * entities standing beside it; only the sky above them shows wall.
 * EVERY slice sorts at the RUN's north end (runTop), not its own
 * row: a per-slice sort let a southern slice beat a body standing
 * north of it and crop the blade it swung past the rim (the
 * armory-crop fix) — the strip never honestly occludes anything,
 * so the whole run loses together.
 */
export function cliffSideItem(rend: PaintHost, 
  x: number,
  s0: number,
  s1: number,
  nx: number,
  level: number,
  runTop: number,
  isTop: boolean,
  isBottom: boolean,
): DrawItem {
  const ctx = rend.ctx;
  const s = rend.camera.scale;
  const topLift = level * ELEV_H * s;
  const baseLift = (level - 1) * ELEV_H * s;
  return {
    // Edge-on strips keep their pre-shelf sort: first at their
    // visual top on shelf 0, so everything else near the corner
    // paints over them exactly as it always has. (The strip is a
    // sliver at a crown corner — the shelf law's raw-row order
    // would draw it over the crown surface north of it, turning
    // the sliver into a bar down the plateau top.)
    sortY: runTop - (level * ELEV_H) / rend.camera.yScale,
    drawShadow:
      level - 1 === 0
        ? () => {
            // The shaded (east) flank casts a real contact shadow;
            // the sunlit (west) flank still gets a narrow ambient
            // seam — every wall foot is attached to its ground.
            const A = rend.camera.worldToScreen(x, s0, rend.w, rend.h);
            const B = rend.camera.worldToScreen(x, s1, rend.w, rend.h);
            // Rounded slice bounds tile exactly — an overlap would
            // double-blend the alpha into a visible seam line.
            const ya = Math.round(A.y) - (isTop ? 1 : 0);
            const yb = Math.round(B.y) + (isBottom ? s * 0.2 : 0);
            const wS = nx >= 0 ? Math.max(3, s * 0.24) : Math.max(2, s * 0.09);
            const rx = Math.round(A.x) - (nx >= 0 ? 0 : wS);
            const fill = (): void => {
              const c = rend.beginContactFill();
              c.fillRect(rx, ya, wS, yb - ya);
              c.globalAlpha = 1;
            };
            if (rend.stageAssembling) {
              rend.stageCastScratch(rx - 1, ya - 1, wS + 2, yb - ya + 2, fill);
              return;
            }
            fill();
          }
        : undefined,
    draw: () => {
      const A = rend.camera.worldToScreen(x, s0, rend.w, rend.h);
      const B = rend.camera.worldToScreen(x, s1, rend.w, rend.h);
      const sx = Math.round(A.x);
      const w2 = Math.max(3, s * 0.13);
      const x0 = nx >= 0 ? sx : sx - w2;
      // B-3 spanning warp: the side run's top/bottom foreshorten by their
      // own corner depth (s0 north, s1 south), matching the face it joins.
      const dsA = rend.camera.depthScale(s0);
      const dsB = rend.camera.depthScale(s1);
      const yTop = Math.round(A.y - topLift * dsA) - (isTop ? 1.5 : 0);
      const yBot = isBottom ? B.y - baseLift * dsB : Math.round(B.y - topLift * dsB);
      // Body: the face palette's own mid-tones, pushed into shade —
      // kin to the walls it joins, not a black bar fighting them.
      ctx.fillStyle = nx >= 0 ? '#494259' : '#544d64';
      ctx.fillRect(x0, yTop, w2, yBot - yTop);
      // Coursing ticks at world-anchored heights along the crown
      // line — each slice draws only ticks landing inside its rect.
      ctx.fillStyle = 'rgba(29, 23, 40, 0.3)';
      const tickH = Math.max(1.5, s * 0.035);
      for (let wy = Math.ceil((s0 - 1) * 2) / 2; wy <= s1 + 1; wy += 0.5) {
        const py = rend.camera.worldToScreen(x, wy, rend.w, rend.h).y - topLift * rend.camera.depthScale(wy) + s * 0.4;
        if (py >= yTop + tickH && py < yBot - tickH) ctx.fillRect(x0, py, w2, tickH);
      }
      // Arris on the outward silhouette edge.
      ctx.fillStyle = 'rgba(24, 18, 34, 0.3)';
      ctx.fillRect(nx >= 0 ? x0 + w2 - 1.5 : x0, yTop, 1.5, yBot - yTop);
      // Brink shade at the run's crown end; AO where it meets ground.
      if (isTop) {
        ctx.fillStyle = 'rgba(24, 18, 34, 0.35)';
        ctx.fillRect(x0, yTop, w2, Math.max(2, s * 0.06));
      }
      if (isBottom) {
        ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
        ctx.fillRect(x0, yBot - Math.max(2, s * 0.05), w2, Math.max(2, s * 0.05));
      }
    },
  };
}
