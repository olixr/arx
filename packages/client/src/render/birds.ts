/**
 * AMBIENT BIRDS — the sky lends a little life.
 *
 * Purely cosmetic, client-side flocks: a few small birds glide in from
 * off-screen, settle on open ground, and live a seeded loop of pecking,
 * hopping and preening — until anything alive walks close, and the
 * whole flock flushes in a ripple and scatters off the map. No loot, no
 * combat, no server: each client keeps its own birds, the way ambience
 * beds keep their own wind.
 *
 * THE FLUSH LAW: birds fear every body equally. The startle scan runs
 * against ALL nearby players and NPCs — so a grazing stag wandering
 * through a flock flushes it exactly like a sprinting hero. The world
 * startles itself; that's what makes it read as alive.
 *
 * Perf: hard caps (2 flocks, 10 birds), squared-distance threat tests,
 * zero per-frame allocation in steady state, and every painter is a
 * couple dozen path ops on a body smaller than a boot. Grounded birds
 * y-sort with the world; airborne birds ride over it. The brand ring is
 * the debris treatment: one round-joined under-stroke of the silhouette
 * (the surviving outer half IS the dilation) — no offscreen, no cache.
 */

/** Brand ink — the same #241a2e every outlined body wears. */
const INK = '#241a2e';
const SHADOW_INK = '#141020';
/** The camera's pitch squash — flight orients in the world plane and
 *  the view foreshortens it, same as every ground ellipse. */
const YSQ = 0.6;

export type BirdMode = 'flyin' | 'ground' | 'scatter' | 'pass';

export interface BirdSpecies {
  /** Base body tone — muted, sits in the meadow. */
  body: string;
  /** Lit crown/back facet. */
  lit: string;
  /** Folded-wing / flight-feather tone. */
  wing: string;
  /** Breast patch. */
  chest: string;
  /** Beak horn. */
  beak: string;
}

/** Three quiet species — dun sparrow, ash dove, rust finch. */
const SPECIES: readonly BirdSpecies[] = [
  { body: '#7d6c52', lit: '#96835f', wing: '#5e503d', chest: '#a8916b', beak: '#8a6a3a' },
  { body: '#8b8fa0', lit: '#a5a9b8', wing: '#6c7080', chest: '#b4b8c4', beak: '#71563b' },
  { body: '#8a5f48', lit: '#a2765a', wing: '#69463a', chest: '#b57e54', beak: '#5c4630' },
];

type GroundBeat = 'stand' | 'peck' | 'hop' | 'preen';

export interface Bird {
  x: number;
  y: number;
  /** Altitude in tiles; 0 = feet on the turf. */
  alt: number;
  mode: BirdMode;
  species: BirdSpecies;
  /** Screen-mirror facing: 1 = beak right. */
  dir: 1 | -1;
  /** Personal clock offset so no two birds keep the same beat. */
  phase: number;
  /** Wingbeat phase (radians). */
  flap: number;
  /** Landing target while flying in. */
  landX: number;
  landY: number;
  /** Hold before entering the world (staggers the fly-in line). */
  delay: number;
  /** Ground behavior. */
  beat: GroundBeat;
  beatT: number;
  beatDur: number;
  hopFromX: number;
  hopFromY: number;
  hopToX: number;
  hopToY: number;
  /** Scatter: per-bird flush stagger + committed heading + speed. */
  scatterDelay: number;
  headX: number;
  headY: number;
  speed: number;
  /** Seconds alive in scatter (hard despawn backstop). */
  scatterT: number;
  /** World-plane velocity + climb rate, tracked every sim step — the
   *  draw pass orients the body along the TRUE path, not a mirror. */
  vx: number;
  vy: number;
  vAlt: number;
  /** Wings set (gliding) vs beating — the plan view spreads held wings. */
  gliding: boolean;
}

interface Flock {
  spotX: number;
  spotY: number;
  mode: BirdMode;
  birds: Bird[];
  /** Rate-limits idle chips so a flock never chatters. */
  nextChirpAt: number;
}

/**
 * Everything the sim needs from the frame, handed in by the renderer.
 * The object is REUSED across frames (scratch-pool law) — the bird
 * system reads it synchronously inside update() and keeps nothing.
 */
export interface BirdEnv {
  tSec: number;
  /** Visible ground bounds (tiles) — spawn spots land inside these. */
  minTx: number;
  maxTx: number;
  minTy: number;
  maxTy: number;
  /** No new flocks after dark or under the earth; standing flocks leave. */
  night: boolean;
  underground: boolean;
  /** True when (tx,ty) is open natural ground a bird may stand on. */
  groundOk: (tx: number, ty: number) => boolean;
  /** Every body that can startle a bird, positions in world tiles. */
  threats: ReadonlyArray<{ x: number; y: number }>;
  threatCount: number;
}

const MAX_FLOCKS = 2;
const MAX_BIRDS = 10;
/** A body inside this range flushes the flock (tiles). */
const STARTLE_R = 2.4;
const STARTLE_R2 = STARTLE_R * STARTLE_R;
/** New flocks refuse spots with a body within this range. */
const SPAWN_CLEAR = STARTLE_R + 2.2;
/** Tiles beyond the view where scattering birds despawn. */
const GONE_PAD = 7;

export class Birds {
  /** Fired once per flush, at the flock's centroid — wing flutter sfx. */
  onFlutter: ((x: number, y: number) => void) | null = null;
  /** Fired for sparse idle chips from a grounded bird. */
  onChirp: ((x: number, y: number) => void) | null = null;

  private readonly flocks: Flock[] = [];
  private nextTryAt = 0;
  private nextPassAt = 0;

  /** Total live birds (Playwright probes read this via dcRenderer.birds). */
  get count(): number {
    let n = 0;
    for (const f of this.flocks) n += f.birds.length;
    return n;
  }

  /** Live flocks, for dev probes. */
  flockStates(): Array<{ mode: BirdMode; birds: number; x: number; y: number }> {
    return this.flocks.map((f) => ({ mode: f.mode, birds: f.birds.length, x: f.spotX, y: f.spotY }));
  }

  /** Force-spawn a flock near the view center (staging lever). */
  debugSpawn(env: BirdEnv, n = 4): boolean {
    return this.trySpawnFlock(env, n);
  }

  update(dt: number, env: BirdEnv): void {
    const t = env.tSec;
    const grim = env.night || env.underground;

    // Seed new flocks: a patient dice roll, never more than the caps.
    if (!grim && t >= this.nextTryAt) {
      const landed = this.flocks.reduce((n, f) => (f.mode === 'pass' ? n : n + 1), 0);
      if (landed < MAX_FLOCKS && this.count < MAX_BIRDS - 1) {
        this.nextTryAt = t + (this.trySpawnFlock(env) ? 9 + Math.random() * 14 : 2 + Math.random() * 2.5);
      } else {
        this.nextTryAt = t + 3;
      }
    }
    // The lone flyover: one bird crossing high, never landing.
    if (!grim && t >= this.nextPassAt) {
      if (this.nextPassAt > 0 && this.count < MAX_BIRDS) this.spawnPass(env);
      this.nextPassAt = t + 26 + Math.random() * 34;
    }

    for (let fi = this.flocks.length - 1; fi >= 0; fi--) {
      const f = this.flocks[fi]!;
      // Dusk or a descent underground sends every standing flock home.
      if (grim && (f.mode === 'ground' || f.mode === 'flyin')) this.flush(f, null, env);
      if (f.mode === 'ground' || f.mode === 'flyin') this.checkStartle(f, env);

      for (let bi = f.birds.length - 1; bi >= 0; bi--) {
        const b = f.birds[bi]!;
        if (b.delay > 0) {
          b.delay -= dt;
          continue;
        }
        switch (b.mode) {
          case 'flyin':
            this.stepFlyIn(b, dt);
            break;
          case 'ground':
            this.stepGround(b, f, dt, env);
            break;
          case 'pass':
          case 'scatter':
            this.stepAway(b, dt);
            if (this.isGone(b, env)) f.birds.splice(bi, 1);
            break;
        }
      }
      if (f.birds.length === 0) {
        this.flocks.splice(fi, 1);
      } else if (f.mode === 'flyin' && f.birds.every((b) => b.mode === 'ground')) {
        // The whole line is down — the flock keeps honest books.
        f.mode = 'ground';
      }
    }
  }

  // ------------------------------------------------------------ spawn

  private trySpawnFlock(env: BirdEnv, forceN = 0): boolean {
    // A spot inset from the view edge so the landing plays on-screen.
    const tx = Math.round(env.minTx + 5 + Math.random() * Math.max(1, env.maxTx - env.minTx - 10));
    const ty = Math.round(env.minTy + 6 + Math.random() * Math.max(1, env.maxTy - env.minTy - 10));
    // Open ground: the spot and its ring, so a flock never straddles a wall.
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) if (!env.groundOk(tx + dx, ty + dy)) return false;
    // Nobody close enough to spook the arrivals.
    for (let i = 0; i < env.threatCount; i++) {
      const th = env.threats[i]!;
      const ddx = th.x - tx;
      const ddy = th.y - ty;
      if (ddx * ddx + ddy * ddy < SPAWN_CLEAR * SPAWN_CLEAR) return false;
    }

    // Group size leans small: singles and pairs are the common sight.
    const r = Math.random();
    const n = forceN > 0 ? forceN : r < 0.3 ? 1 : r < 0.58 ? 2 : r < 0.8 ? 3 : r < 0.94 ? 4 : 5;
    const species = SPECIES[(Math.random() * SPECIES.length) | 0]!;
    // The whole line glides in from one side of the sky.
    const ang = Math.random() * Math.PI * 2;
    const entryDx = Math.cos(ang);
    const entryDy = Math.sin(ang);
    const spanX = (env.maxTx - env.minTx) / 2 + 5;
    const spanY = (env.maxTy - env.minTy) / 2 + 5;

    const f: Flock = { spotX: tx + 0.5, spotY: ty + 0.5, mode: 'flyin', birds: [], nextChirpAt: 0 };
    for (let i = 0; i < n; i++) {
      const la = Math.random() * Math.PI * 2;
      const lr = n === 1 ? 0 : 0.35 + Math.random() * 1.0;
      const landX = f.spotX + Math.cos(la) * lr;
      const landY = f.spotY + Math.sin(la) * lr * 0.8;
      const b = this.makeBird(species, 'flyin');
      b.landX = landX;
      b.landY = landY;
      b.x = landX + entryDx * spanX + (Math.random() - 0.5) * 3;
      b.y = landY + entryDy * spanY + (Math.random() - 0.5) * 3;
      b.alt = 2.8 + Math.random() * 1.2;
      b.delay = i * (0.22 + Math.random() * 0.2);
      b.dir = landX >= b.x ? 1 : -1;
      f.birds.push(b);
    }
    this.flocks.push(f);
    return true;
  }

  private spawnPass(env: BirdEnv): void {
    const species = SPECIES[(Math.random() * SPECIES.length) | 0]!;
    const cx = (env.minTx + env.maxTx) / 2;
    const cy = (env.minTy + env.maxTy) / 2;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const b = this.makeBird(species, 'pass');
    b.x = cx - dir * ((env.maxTx - env.minTx) / 2 + 5);
    b.y = cy + (Math.random() - 0.5) * (env.maxTy - env.minTy) * 0.7;
    b.alt = 3.4 + Math.random() * 1.4;
    b.dir = dir as 1 | -1;
    b.headX = dir;
    b.headY = (Math.random() - 0.5) * 0.22;
    b.speed = 5.5 + Math.random() * 1.8;
    this.flocks.push({ spotX: b.x, spotY: b.y, mode: 'pass', birds: [b], nextChirpAt: 0 });
  }

  private makeBird(species: BirdSpecies, mode: BirdMode): Bird {
    return {
      x: 0,
      y: 0,
      alt: 0,
      mode,
      species,
      dir: 1,
      phase: Math.random() * Math.PI * 2,
      flap: Math.random() * Math.PI * 2,
      landX: 0,
      landY: 0,
      delay: 0,
      beat: 'stand',
      beatT: 0,
      beatDur: 0.5,
      hopFromX: 0,
      hopFromY: 0,
      hopToX: 0,
      hopToY: 0,
      scatterDelay: 0,
      headX: 0,
      headY: 0,
      speed: 0,
      scatterT: 0,
      vx: 0,
      vy: 0,
      vAlt: 0,
      gliding: false,
    };
  }

  // ------------------------------------------------------------- sim

  private stepFlyIn(b: Bird, dt: number): void {
    const dx = b.landX - b.x;
    const dy = b.landY - b.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.06 && b.alt < 0.05) {
      // Touchdown: a beat of settling, then the ground loop begins.
      b.mode = 'ground';
      b.alt = 0;
      b.x = b.landX;
      b.y = b.landY;
      b.beat = 'stand';
      b.beatT = 0;
      b.beatDur = 0.5 + Math.random() * 0.6;
      return;
    }
    // Speed eases off on approach; altitude tracks remaining distance
    // so the glide path bends down into the spot like a real landing.
    const v = 3.2 + Math.min(1, dist / 6) * 4.2;
    const step = Math.min(dist, v * dt);
    if (dist > 1e-4) {
      b.x += (dx / dist) * step;
      b.y += (dy / dist) * step;
      b.dir = dx >= 0 ? 1 : -1;
      b.vx = (dx / dist) * v;
      b.vy = (dy / dist) * v;
    }
    const oldAlt = b.alt;
    const wantAlt = Math.min(b.alt, dist * 0.32);
    b.alt = Math.max(0, b.alt + (wantAlt - b.alt) * Math.min(1, dt * 5));
    b.vAlt = dt > 0 ? (b.alt - oldAlt) / dt : 0;
    // Flap-and-glide: bursts of wingbeats, then set wings; a fast flare
    // right before the perch.
    const flare = dist < 1.4;
    b.gliding = !flare && Math.sin(b.phase + dist * 0.9) < -0.2;
    b.flap += dt * Math.PI * 2 * (flare ? 13 : b.gliding ? 1.2 : 9);
  }

  private stepGround(b: Bird, f: Flock, dt: number, env: BirdEnv): void {
    b.beatT += dt;
    if (b.beat === 'hop') {
      const u = Math.min(1, b.beatT / b.beatDur);
      b.x = b.hopFromX + (b.hopToX - b.hopFromX) * u;
      b.y = b.hopFromY + (b.hopToY - b.hopFromY) * u;
      b.alt = Math.sin(u * Math.PI) * 0.09;
      if (u >= 1) b.alt = 0;
    }
    if (b.beatT < b.beatDur) return;

    // Next beat — pecking is the flock's main occupation.
    b.beatT = 0;
    const r = Math.random();
    if (r < 0.42) {
      b.beat = 'peck';
      b.beatDur = 0.9 + Math.random() * 0.7;
    } else if (r < 0.62) {
      // Hop a short step, staying loyal to the landing spot.
      const ha = Math.random() * Math.PI * 2;
      const hr = 0.25 + Math.random() * 0.3;
      let nx = b.x + Math.cos(ha) * hr;
      let ny = b.y + Math.sin(ha) * hr * 0.8;
      const backX = f.spotX - b.x;
      const backY = f.spotY - b.y;
      if (backX * backX + backY * backY > 2.6) {
        // Strayed — hop homeward instead.
        const bl = Math.hypot(backX, backY) || 1;
        nx = b.x + (backX / bl) * hr;
        ny = b.y + (backY / bl) * hr;
      }
      if (env.groundOk(Math.floor(nx), Math.floor(ny))) {
        b.beat = 'hop';
        b.beatDur = 0.26;
        b.hopFromX = b.x;
        b.hopFromY = b.y;
        b.hopToX = nx;
        b.hopToY = ny;
        b.dir = nx >= b.x ? 1 : -1;
      } else {
        b.beat = 'stand';
        b.beatDur = 0.6;
        b.dir = b.dir === 1 ? -1 : 1;
      }
    } else if (r < 0.72) {
      b.beat = 'preen';
      b.beatDur = 1.1 + Math.random() * 0.7;
    } else {
      b.beat = 'stand';
      b.beatDur = 0.7 + Math.random() * 1.4;
      if (Math.random() < 0.4) b.dir = b.dir === 1 ? -1 : 1;
    }
    // A sparse chip — one voice per flock, well spaced, never a chorus.
    if (env.tSec >= f.nextChirpAt && Math.random() < 0.22) {
      f.nextChirpAt = env.tSec + 4 + Math.random() * 6;
      this.onChirp?.(b.x, b.y);
    }
  }

  private stepAway(b: Bird, dt: number): void {
    if (b.scatterDelay > 0) {
      b.scatterDelay -= dt;
      return;
    }
    b.scatterT += dt;
    if (b.mode === 'scatter') {
      // Burst off the turf: speed and altitude both climb out.
      b.speed = Math.min(8.5, b.speed + 15 * dt);
      const oldAlt = b.alt;
      b.alt = Math.min(4.6, b.alt + (1.4 + b.alt * 0.7) * dt);
      b.vAlt = dt > 0 ? (b.alt - oldAlt) / dt : 0;
      b.gliding = false;
      b.flap += dt * Math.PI * 2 * 14;
    } else {
      // The flyover holds a steady cruise with lazy flap-and-glide.
      b.gliding = Math.sin(b.phase + b.scatterT * 1.1) < -0.35;
      b.vAlt = 0;
      b.flap += dt * Math.PI * 2 * (b.gliding ? 1.2 : 8);
    }
    b.x += b.headX * b.speed * dt;
    b.y += b.headY * b.speed * dt;
    b.vx = b.headX * b.speed;
    b.vy = b.headY * b.speed;
    b.dir = b.headX >= 0 ? 1 : -1;
  }

  private isGone(b: Bird, env: BirdEnv): boolean {
    if (b.mode === 'scatter' && b.scatterT > 6) return true;
    return (
      b.x < env.minTx - GONE_PAD ||
      b.x > env.maxTx + GONE_PAD ||
      b.y < env.minTy - GONE_PAD ||
      b.y > env.maxTy + GONE_PAD
    );
  }

  // --------------------------------------------------------- startle

  private checkStartle(f: Flock, env: BirdEnv): void {
    // Cheap flock-level reject first, then the per-bird truth.
    let threat: { x: number; y: number } | null = null;
    const pre = (STARTLE_R + 1.8) * (STARTLE_R + 1.8);
    for (let i = 0; i < env.threatCount && !threat; i++) {
      const th = env.threats[i]!;
      const fdx = th.x - f.spotX;
      const fdy = th.y - f.spotY;
      if (fdx * fdx + fdy * fdy > pre) continue;
      for (const b of f.birds) {
        const dx = th.x - b.x;
        const dy = th.y - b.y;
        if (dx * dx + dy * dy < STARTLE_R2) {
          threat = th;
          break;
        }
      }
    }
    if (threat) this.flush(f, threat, env);
  }

  /** The whole flock flushes in a ripple, headings fanned away from the threat. */
  private flush(f: Flock, threat: { x: number; y: number } | null, env: BirdEnv): void {
    if (f.mode === 'scatter' || f.mode === 'pass') return;
    f.mode = 'scatter';
    let cx = 0;
    let cy = 0;
    for (const b of f.birds) {
      cx += b.x;
      cy += b.y;
    }
    cx /= f.birds.length || 1;
    cy /= f.birds.length || 1;
    let i = 0;
    for (const b of f.birds) {
      const away = threat
        ? Math.atan2(b.y - threat.y, b.x - threat.x)
        : Math.random() * Math.PI * 2;
      const a = away + (Math.random() - 0.5) * 1.1;
      b.mode = 'scatter';
      b.headX = Math.cos(a);
      b.headY = Math.sin(a) * 0.8;
      b.speed = 1.6;
      b.scatterT = 0;
      // The ripple: the nearest bird jumps first, neighbors follow.
      b.scatterDelay = Math.max(0, b.delay) + i * 0.05 + Math.random() * 0.06;
      b.delay = 0;
      i++;
    }
    void env;
    this.onFlutter?.(cx, cy);
  }

  // ------------------------------------------------------------ draw

  /** Birds standing in the world — y-sorted with everything else. */
  *grounded(): IterableIterator<Bird> {
    for (const f of this.flocks)
      for (const b of f.birds) {
        if (b.delay > 0) continue;
        if (b.alt <= 0.12 && b.mode !== 'pass') yield b;
      }
  }

  /** Birds on the wing — drawn over the world pass. */
  *airborne(): IterableIterator<Bird> {
    for (const f of this.flocks)
      for (const b of f.birds) {
        if (b.delay > 0) continue;
        if (b.alt > 0.12 || b.mode === 'pass') yield b;
      }
  }

  drawOne(
    ctx: CanvasRenderingContext2D,
    b: Bird,
    worldToScreen: (wx: number, wy: number) => { x: number; y: number },
    scale: number,
    outlined: boolean,
    tSec: number,
    /** B-1c depth thread: per-item depth factor (ds=1 at q=0). */
    depthAt: (wy: number) => number = () => 1,
  ): void {
    const p = worldToScreen(b.x, b.y);
    // B-1c depth thread: foreshorten this billboard by its own depth (ds=1 at q=0)
    const ds = depthAt(b.y);
    // Author space: 100 units = 1 tile, with a nudge up so the body
    // reads at a long stride's distance — still well under the knee.
    const k = (scale / 100) * 1.15 * ds;
    const flying = b.alt > 0.12 || b.mode === 'pass';

    // Contact shadow — flat ellipse on the turf, thinning with height.
    const sa = flying ? Math.max(0.05, 0.16 - b.alt * 0.028) : 0.18;
    ctx.globalAlpha = sa;
    ctx.fillStyle = SHADOW_INK;
    ctx.beginPath();
    const shr = (flying ? Math.max(4.5, 8 - b.alt * 0.9) : 8) * k;
    ctx.ellipse(p.x, p.y, shr, shr * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.save();
    // B-1c depth thread: foreshorten this billboard by its own depth (ds=1 at q=0)
    ctx.translate(p.x, p.y - b.alt * scale * 0.92 * ds);
    // A lighter ring than a full-size body wears: at sparrow scale the
    // standard dilation swallows the fill (the debris tiny-chip clamp).
    // B-1c depth thread: foreshorten this billboard by its own depth (ds=1 at q=0)
    const ring = Math.min(Math.max(1.1, scale * 0.03 * ds), 2.0) / k;
    if (!flying) {
      ctx.scale(b.dir * k, k);
      this.paintGrounded(ctx, b, ring, outlined, tSec);
    } else {
      // THE HEADING LAW: a flying body orients along its TRUE path.
      // Near-lateral flight keeps the side profile, tilted to the
      // screen-space velocity (climb noses up, descent noses down).
      // Steep north/south flight switches to the plan view — the bird
      // seen from the tilted sky: rotate in the WORLD plane, then the
      // camera squash foreshortens it, so a southbound bird comes at
      // you with both wings out instead of sliding sideways-on. The
      // landing flare always plays in profile (it hands off to the
      // grounded bird).
      const flare =
        b.mode === 'flyin' && Math.hypot(b.landX - b.x, b.landY - b.y) < 1.4;
      const steep = !flare && Math.abs(b.vy) > Math.abs(b.vx) * 0.9;
      if (steep) {
        ctx.scale(k, k * YSQ);
        ctx.rotate(Math.atan2(b.vy, b.vx));
        this.paintPlan(ctx, b, ring, outlined);
      } else {
        // Screen-space path: world velocity through the pitch squash,
        // minus the climb (altitude is a screen lift).
        const svx = b.vx;
        const svy = b.vy * YSQ - b.vAlt * 0.92;
        const d = svx !== 0 ? (svx > 0 ? 1 : -1) : b.dir;
        const tilt =
          Math.hypot(svx, svy) > 0.2
            ? Math.max(-0.55, Math.min(0.55, Math.atan2(svy, Math.abs(svx))))
            : 0;
        ctx.scale(d * k, k);
        ctx.rotate(tilt);
        this.paintFlying(ctx, b, ring, outlined);
      }
    }
    ctx.restore();
  }

  /**
   * The grounded bird: one faceted silhouette (body+head+tail+beak),
   * the brand ring under it, then flat tone facets on top. Pecking
   * bows the head cluster down and forward; preening turns it back
   * over the shoulder.
   */
  private paintGrounded(
    ctx: CanvasRenderingContext2D,
    b: Bird,
    ring: number,
    outlined: boolean,
    tSec: number,
  ): void {
    const sp = b.species;
    // Head articulation, driven by the current beat. A peck tips the
    // whole bird forward — beak dives, tail rises — so the pose stays
    // a bird and never folds into a blob.
    let hx = 0;
    let hy = 0;
    let tl = 0;
    if (b.beat === 'peck') {
      // Quick repeated dips — beak to the crumbs and back.
      const bow = Math.max(0, Math.sin(b.beatT * Math.PI * 2 * 2.3 + b.phase)) * 0.9;
      hx = 5 * bow;
      hy = 6 * bow;
      tl = 3.5 * bow;
    } else if (b.beat === 'preen') {
      const turn = Math.min(1, b.beatT * 3) * (b.beatT > b.beatDur - 0.35 ? Math.max(0, (b.beatDur - b.beatT) / 0.35) : 1);
      hx = -5.5 * turn;
      hy = 2.5 * turn;
    } else {
      // Idle: a tiny living bob.
      hy = Math.sin(tSec * 2.1 + b.phase) * 0.7;
    }

    // ONE silhouette path serves the ring and the base fill.
    ctx.beginPath();
    ctx.moveTo(-13, -13 - tl); // tail tip (rises with the peck)
    ctx.lineTo(-9.5, -8 - tl * 0.5);
    ctx.lineTo(-2, -4.6); // belly
    ctx.lineTo(5.5, -6);
    ctx.lineTo(7.8 + hx * 0.4, -10); // breast rise
    // Head cluster (bows with hx/hy).
    ctx.lineTo(8 + hx, -13.5 + hy);
    ctx.lineTo(12.8 + hx * 1.15, -12 + hy * 1.12); // beak tip
    ctx.lineTo(7.8 + hx, -11 + hy);
    ctx.lineTo(7.6 + hx, -13.4 + hy);
    ctx.lineTo(3.6 + hx * 0.8, -17.4 + hy * 0.9); // crown
    ctx.lineTo(-1.5 + hx * 0.5, -16.6 + hy * 0.6);
    ctx.lineTo(-5, -14 - tl * 0.3); // nape into back
    ctx.lineTo(-9.5, -12.6 - tl * 0.7);
    ctx.closePath();
    if (outlined) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = ring * 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.fillStyle = sp.body;
    ctx.fill();

    // Folded wing — one shade wedge lying along the back, small enough
    // that the body tone stays the read.
    ctx.fillStyle = sp.wing;
    ctx.beginPath();
    ctx.moveTo(-8.5, -11.8 - tl * 0.5);
    ctx.lineTo(-1, -12.8);
    ctx.lineTo(1.5, -8.8);
    ctx.lineTo(-6, -7.8);
    ctx.closePath();
    ctx.fill();
    // Lit crown/back facet.
    ctx.fillStyle = sp.lit;
    ctx.beginPath();
    ctx.moveTo(-1.5 + hx * 0.5, -16.6 + hy * 0.6);
    ctx.lineTo(3.6 + hx * 0.8, -17.4 + hy * 0.9);
    ctx.lineTo(1.5 + hx * 0.65, -14.6 + hy * 0.75);
    ctx.closePath();
    ctx.fill();
    // Breast patch.
    ctx.fillStyle = sp.chest;
    ctx.beginPath();
    ctx.moveTo(5.5, -6.2);
    ctx.lineTo(7.6 + hx * 0.4, -9.8);
    ctx.lineTo(3.5, -9.5);
    ctx.lineTo(1, -5.8);
    ctx.closePath();
    ctx.fill();
    // Beak horn over the base fill.
    ctx.fillStyle = sp.beak;
    ctx.beginPath();
    ctx.moveTo(7.8 + hx, -13.2 + hy);
    ctx.lineTo(12.8 + hx * 1.15, -12 + hy * 1.12);
    ctx.lineTo(7.8 + hx, -11.2 + hy);
    ctx.closePath();
    ctx.fill();
    // Eye — one ink fleck.
    ctx.fillStyle = INK;
    ctx.fillRect(4.6 + hx * 0.9, -14.6 + hy * 0.95, 1.5, 1.5);

    // Stick legs; a hop tucks them.
    const tuck = b.beat === 'hop' ? Math.sin(Math.min(1, b.beatT / b.beatDur) * Math.PI) * 3.5 : 0;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-1.5, -6);
    ctx.lineTo(-2.2, -tuck * 0.4);
    ctx.moveTo(2.5, -6);
    ctx.lineTo(3, -tuck * 0.4);
    ctx.stroke();
  }

  /**
   * The flying bird: far wing behind the body, near wing in front,
   * both riding one flap phase. Wings are chamfered slabs pivoting at
   * the shoulder — up-beat sweeps high, down-beat spreads flat.
   */
  private paintFlying(ctx: CanvasRenderingContext2D, b: Bird, ring: number, outlined: boolean): void {
    const sp = b.species;
    const wingA = Math.sin(b.flap) * 1.0 - 0.25;

    const wing = (behind: boolean): void => {
      ctx.save();
      ctx.translate(-1, -12.5);
      ctx.rotate(behind ? -wingA * 0.85 : wingA);
      ctx.scale(1, behind ? -0.82 : 1);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-4.5, -10.5);
      ctx.lineTo(-1, -13.5);
      ctx.lineTo(4.2, -3.5);
      ctx.closePath();
      if (outlined) {
        ctx.strokeStyle = INK;
        ctx.lineWidth = ring * 2;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      ctx.fillStyle = behind ? sp.wing : sp.body;
      ctx.fill();
      // Feather split — one darker trailing facet.
      ctx.fillStyle = behind ? INK + '00' : sp.wing;
      if (!behind) {
        ctx.beginPath();
        ctx.moveTo(-4.5, -10.5);
        ctx.lineTo(-1, -13.5);
        ctx.lineTo(0.6, -8.5);
        ctx.lineTo(-2.8, -7);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };

    wing(true);

    // Body silhouette — level dart with a fanned tail.
    ctx.beginPath();
    ctx.moveTo(9, -12.6); // nose
    ctx.lineTo(13.2, -11.4); // beak tip
    ctx.lineTo(8.8, -10.4);
    ctx.lineTo(6, -9.2); // chest
    ctx.lineTo(0, -8.6); // belly
    ctx.lineTo(-7, -9.4);
    ctx.lineTo(-13.6, -9); // tail lower tip
    ctx.lineTo(-14.8, -12.6); // tail upper tip
    ctx.lineTo(-8.8, -11.8);
    ctx.lineTo(-2, -13.8); // back
    ctx.lineTo(4.8, -14.6); // crown
    ctx.closePath();
    if (outlined) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = ring * 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.fillStyle = sp.body;
    ctx.fill();
    // Tail shade + chest light.
    ctx.fillStyle = sp.wing;
    ctx.beginPath();
    ctx.moveTo(-7, -9.4);
    ctx.lineTo(-13.6, -9);
    ctx.lineTo(-14.8, -12.6);
    ctx.lineTo(-8.8, -11.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = sp.chest;
    ctx.beginPath();
    ctx.moveTo(6, -9.2);
    ctx.lineTo(0, -8.6);
    ctx.lineTo(3, -11);
    ctx.lineTo(7, -11);
    ctx.closePath();
    ctx.fill();
    // Beak + eye.
    ctx.fillStyle = sp.beak;
    ctx.beginPath();
    ctx.moveTo(9, -12.4);
    ctx.lineTo(13.2, -11.4);
    ctx.lineTo(8.8, -10.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.fillRect(6.6, -13.2, 1.4, 1.4);

    wing(false);
  }

  /**
   * The plan view: the bird from the tilted sky, nose along +x, drawn
   * CENTERED on the origin and fully symmetric — the caller rotates it
   * to the world heading and the camera squash foreshortens it, so it
   * serves every compass direction. Wings beat by sweeping span in and
   * out (the flap reads as reach from above); set wings hold wide.
   */
  private paintPlan(ctx: CanvasRenderingContext2D, b: Bird, ring: number, outlined: boolean): void {
    const sp = b.species;
    // Span never fully folds — a collapsed plan wing reads as a dart,
    // not a bird; the beat lives in the outer half of the reach.
    const span = b.gliding ? 1 : 0.5 + 0.5 * Math.abs(Math.sin(b.flap));
    // Tips rake back on the up-beat; a glide holds a steady sweep.
    const sweep = b.gliding ? -1 : Math.sin(b.flap) * 2.2;

    const wing = (side: 1 | -1): void => {
      ctx.beginPath();
      ctx.moveTo(3.5, side * 3);
      ctx.lineTo(1.5 + sweep, side * (4 + 9.5 * span));
      ctx.lineTo(-2.5 + sweep, side * (3.5 + 10.5 * span));
      ctx.lineTo(-4, side * 3.2);
      ctx.closePath();
      if (outlined) {
        ctx.strokeStyle = INK;
        ctx.lineWidth = ring * 2;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      ctx.fillStyle = sp.wing;
      ctx.fill();
      // Lit leading-edge facet.
      ctx.fillStyle = sp.lit;
      ctx.beginPath();
      ctx.moveTo(3.5, side * 3);
      ctx.lineTo(1.5 + sweep, side * (4 + 9.5 * span));
      ctx.lineTo(0.5 + sweep * 0.7, side * (3.6 + 6 * span));
      ctx.closePath();
      ctx.fill();
    };
    wing(1);
    wing(-1);

    // Body dart: head knob to fanned tail, over the wing roots.
    ctx.beginPath();
    ctx.moveTo(13.5, 0); // nose
    ctx.lineTo(9, 2.8);
    ctx.lineTo(4.5, 4);
    ctx.lineTo(-3, 3.4);
    ctx.lineTo(-7, 2.4); // tail base
    ctx.lineTo(-14.5, 4.6); // fan tip
    ctx.lineTo(-11.5, 0); // fan notch
    ctx.lineTo(-14.5, -4.6);
    ctx.lineTo(-7, -2.4);
    ctx.lineTo(-3, -3.4);
    ctx.lineTo(4.5, -4);
    ctx.lineTo(9, -2.8);
    ctx.closePath();
    if (outlined) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = ring * 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.fillStyle = sp.body;
    ctx.fill();
    // Crown light + saddle shade + tail fan shade.
    ctx.fillStyle = sp.lit;
    ctx.beginPath();
    ctx.moveTo(10, 1.8);
    ctx.lineTo(6, 2.6);
    ctx.lineTo(6, -2.6);
    ctx.lineTo(10, -1.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = sp.wing;
    ctx.beginPath();
    ctx.moveTo(-3, 2.6);
    ctx.lineTo(-7, 2);
    ctx.lineTo(-7, -2);
    ctx.lineTo(-3, -2.6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-8.5, 2.2);
    ctx.lineTo(-14.5, 4.6);
    ctx.lineTo(-11.5, 0);
    ctx.lineTo(-14.5, -4.6);
    ctx.lineTo(-8.5, -2.2);
    ctx.closePath();
    ctx.fill();
    // Beak past the nose.
    ctx.fillStyle = sp.beak;
    ctx.beginPath();
    ctx.moveTo(13, 1);
    ctx.lineTo(16, 0);
    ctx.lineTo(13, -1);
    ctx.closePath();
    ctx.fill();
  }
}
