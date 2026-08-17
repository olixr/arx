/**
 * THE FANG FINDS ITS VOICE — the companion arts wave (docs/
 * pet-arts-plan.md Phase 4): thirty-six set-pieces on three strata.
 *
 * The school's grammar is TEETH AND HIDE: every word here is an
 * animal's own act — a bite, a shell, a bound, a wing, a coil, a
 * thread — never spellfire, never a sigil. The painted centerpiece
 * says the mechanic; the matter is what a body would truly throw
 * (dust, blood, frost, venom, water, shadow); THE LASTING MARK is
 * what a beast honestly leaves: prints, furrows, stains, shed skin,
 * settled snow, standing pebbles. Sound leaves nothing — the shriek
 * and the clatter end clean, and that refusal is documented at each.
 *
 * Wire dialects this school answers: 'arc' (melee bites and rakes —
 * flurries speak one arc PER BEAT, each with its own seed), 'nova'
 * (pulse waves each speak their own — a three-pull undertow is three
 * invocations composing on laid grains), 'dash' (the corridor, both
 * ends true), 'command' (850 ms, the self words — NO generic painter
 * exists for command: the signature carries the whole read), 'field'
 * (the wire's ticks are the life), and 'blast' (the spit's landing).
 * the_long_furrow answers BOTH 'dash' and 'nova' — hooks branch on
 * c.kind. Cross-wave composition is never stateful: the world keeps
 * what landed (laid grains), and what must hold still across beats
 * derives from posSeed, never the per-cast seed.
 *
 * Binding laws as ever: hard edges only; save/restore hygiene;
 * squash on every ground ellipse; srand determinism; frameDt-gated
 * emission through crossed(); <= ~60 path ops per hook per frame.
 * No centerpiece repeats another file's (the whistle's thread, the
 * laid table, the mantle, the silk cage of the wild web — all
 * standing elsewhere) nor any in this file.
 *
 * ONE-VOICE stands: dust, frost, venom, blood, water, and shadow
 * speak through the MATTER LIBRARY. Silk, feathers, grain, mud,
 * sound, and the warm breath of the howl stay the school's own —
 * unowned matter, hand-painted (the web_snare precedent; forcing
 * fire onto a wolf's breath would make the library lie).
 */

import { shade } from './rig.js';
import { burstStarPath, srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { asMatter, blood, dust, frost, shadow, venom, water } from './matter/index.js';

/** Clamp to 0..1. */
function cl(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * THE LASTING MARK — one settled grain laid deliberately at a world
 * point (the ~8-10s tertiary stratum: what the beast leaves behind).
 */
function lay(
  c: SigCtx,
  wx: number,
  wy: number,
  color: string,
  opts: { life?: number; size?: number; flicker?: number; fade?: string; fadeAt?: number } = {},
): void {
  c.particles.burst(wx, wy, 1, [color], {
    speed: 0.05,
    life: opts.life ?? 8,
    size: opts.size ?? 0.05,
    gravity: 0,
    drag: 4,
    layer: 'ground',
    flicker: opts.flicker ?? 0,
    fade: opts.fade,
    fadeAt: opts.fadeAt,
  });
}

/** Crossing-frame gate: fire once as life crosses `at` (wireMs life). */
function crossed(c: SigCtx, wireMs: number, at: number): boolean {
  const tPrev = c.t - (c.frameDt * 1000) / wireMs;
  return tPrev < at && c.t >= at;
}

/**
 * Wave-stable seed: derived from where the wire stands, not which
 * beat it is — pulse waves and flurry beats each carry a fresh
 * bornAt, so anything that must HOLD (a spiral's rotation, a
 * lattice's weave) walks this instead of c.seed.
 */
function posSeed(c: SigCtx, salt: number): number {
  return (Math.floor(c.wx * 8) * 73) ^ (Math.floor(c.wy * 8) * 151) ^ salt;
}

/** One paw print (pad + three toes) on the ground plane. */
function pawPrint(c: SigCtx, px: number, py: number, s: number, color: string, a: number): void {
  const { ctx, squash } = c;
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(px, py, s, s * 1.15 * squash, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  for (const [dx, dy] of [
    [-1.1, -1.2],
    [0, -1.5],
    [1.1, -1.2],
  ] as const) {
    ctx.ellipse(px + dx * s, py + dy * s * squash, s * 0.42, s * 0.5 * squash, 0, 0, Math.PI * 2);
  }
  ctx.fill();
}

// ================================================== THE SKITTERKIN

/**
 * NIP AND DART — "there and already gone."
 * The corridor reads as a STITCH: the going line and the coming-back
 * line offset a half-step, sewn through the mark — one bite-star at
 * the far end where the teeth met, then the return overtakes the
 * going and both vanish from the tail. Two small prints last where
 * the turn was made. Dust kicks at the launch.
 */
const nip_and_dart: AbilitySig = {
  spawn(c) {
    dust.deployments.kick!(asMatter(c), c.wx, c.wy, { scale: 0.3 });
    const nx = -(c.wy2 - c.wy);
    const ny = c.wx2 - c.wx;
    const nl = Math.hypot(nx, ny) || 1;
    lay(c, c.wx2 + (nx / nl) * 0.12, c.wy2 + (ny / nl) * 0.12, shade(c.st.mid, -18), {
      life: 6,
      size: 0.06,
    });
    lay(c, c.wx2 - (nx / nl) * 0.12, c.wy2 - (ny / nl) * 0.12, shade(c.st.mid, -18), {
      life: 6,
      size: 0.06,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const nx = -(py2 - py);
    const ny = px2 - px;
    const nl = Math.hypot(nx, ny) || 1;
    const ox = (nx / nl) * sc * 0.09;
    const oy = (ny / nl) * sc * 0.09;
    ctx.save();
    ctx.lineCap = 'round';
    // The going stitch: dashes marching out, eaten from the tail.
    const out = cl(t / 0.35);
    const eat = cl((t - 0.45) / 0.45);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.4, sc * 0.062);
    for (let k = 0; k < 5; k++) {
      const f0 = k / 5;
      const f1 = f0 + 0.12;
      if (f1 > out || f0 < eat) continue;
      ctx.globalAlpha = 0.85 * fade;
      ctx.beginPath();
      ctx.moveTo(px + (px2 - px) * f0 + ox, py + (py2 - py) * f0 + oy);
      ctx.lineTo(px + (px2 - px) * f1 + ox, py + (py2 - py) * f1 + oy);
      ctx.stroke();
    }
    // The return stitch, offset the other way, a beat behind.
    const back = cl((t - 0.3) / 0.35);
    ctx.strokeStyle = st.core;
    for (let k = 0; k < 5; k++) {
      const f0 = 1 - k / 5 - 0.12;
      const f1 = f0 + 0.12;
      if (1 - f0 > back || f0 < eat) continue;
      ctx.globalAlpha = 0.9 * fade;
      ctx.beginPath();
      ctx.moveTo(px + (px2 - px) * f0 - ox, py + (py2 - py) * f0 - oy);
      ctx.lineTo(px + (px2 - px) * f1 - ox, py + (py2 - py) * f1 - oy);
      ctx.stroke();
    }
    // The bite-star at the turn, brightest as the going arrives.
    if (t > 0.28 && t < 0.6) {
      const k = 1 - Math.abs((t - 0.38) / 0.22);
      ctx.globalAlpha = 0.95 * cl(k);
      ctx.fillStyle = st.core;
      burstStarPath(ctx, px2, py2, sc * 0.24, sc * 0.09, 4, 0.5, c.squash);
      ctx.fill();
      c.glow(c.wx2, c.wy2, 0.5, 0.3 * cl(k));
    }
    ctx.restore();
  },
};

/**
 * PLAGUE GNAW — "the wound goes green."
 * Two tooth-arcs CLOSE and HOLD — the clamp stays set for the whole
 * read while venom beads well up between the teeth and work down.
 * The green deepens where the teeth meet. A worried stain lasts.
 */
const plague_gnaw: AbilitySig = {
  spawn(c) {
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.7;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.7;
    venom.deployments.burst!(asMatter(c), hx, hy, { scale: 0.35 });
    lay(c, hx, hy, '#5c7a2e', { life: 8, size: 0.08, fade: '#3e5220', fadeAt: 0.5 });
    lay(c, hx + 0.14, hy + 0.08, '#5c7a2e', { life: 7, size: 0.06 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const hx = px + Math.cos(c.dir) * c.rPx * 0.7;
    const hy = py + Math.sin(c.dir) * c.rPx * 0.7 * squash;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    const close = cl(t / 0.22);
    ctx.save();
    ctx.lineCap = 'round';
    // The clamp: two tooth-rows swing shut and STAY.
    const gap = (1 - close) * sc * 0.5;
    for (const side of [-1, 1] as const) {
      ctx.globalAlpha = 0.92 * fade;
      ctx.strokeStyle = side < 0 ? st.core : st.mid;
      ctx.lineWidth = Math.max(2.8, sc * 0.075);
      ctx.beginPath();
      ctx.ellipse(
        hx,
        hy + side * gap,
        sc * 0.46,
        sc * 0.24 * squash,
        0,
        side < 0 ? Math.PI * 1.15 : Math.PI * 0.15,
        side < 0 ? Math.PI * 1.85 : Math.PI * 0.85,
      );
      ctx.stroke();
      // Three teeth per row, biting inward.
      ctx.fillStyle = ctx.strokeStyle;
      for (let k = 0; k < 3; k++) {
        const a = -0.5 + k * 0.5;
        const tx = hx + Math.cos(a) * sc * 0.34;
        const ty = hy + side * gap + Math.sin(a) * sc * 0.1 * squash - side * sc * 0.02;
        ctx.beginPath();
        ctx.moveTo(tx - sc * 0.03, ty);
        ctx.lineTo(tx + sc * 0.03, ty);
        ctx.lineTo(tx, ty - side * sc * 0.14);
        ctx.closePath();
        ctx.fill();
      }
    }
    // The green deepening at the meet, once the clamp is set.
    if (close >= 1) {
      const well = cl((t - 0.25) / 0.5);
      ctx.globalAlpha = 0.5 * well * fade;
      ctx.fillStyle = '#5c7a2e';
      ctx.beginPath();
      ctx.ellipse(hx, hy, sc * 0.3 * well, sc * 0.17 * well * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  air(c) {
    // Venom beads well up from the set clamp and drop true.
    if (crossed(c, 500, 0.4) || crossed(c, 500, 0.65)) {
      const hx = c.wx + Math.cos(c.dir) * c.radius * 0.7;
      const hy = c.wy + Math.sin(c.dir) * c.radius * 0.7;
      venom.deployments.drip!(asMatter(c), hx, hy, { scale: 0.4, z: 0.5 });
    }
  },
};

/**
 * THE RAT'S HOUR — the signature: "the gutter is a throne room."
 * Each beat of the flurry is one invocation: a low slash whips
 * around the mark at a wave-stable station (the circling swarm read),
 * and over the mark a small five-point CROWN assembles one point per
 * beat — held by posSeed so the beats build one crown, not four.
 * The last beats leave a crown of green grains on the ground.
 */
const the_rats_hour: AbilitySig = {
  spawn(c) {
    const hash = srand(posSeed(c, 0x5a71));
    const beat = c.seed % 4;
    const a = hash() * Math.PI * 2 + beat * (Math.PI / 2);
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.7;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.7;
    venom.deployments.bead!(asMatter(c), hx + Math.cos(a) * 0.3, hy + Math.sin(a) * 0.2, {
      scale: 0.3,
    });
    // The crown laid grain for THIS beat's point.
    lay(c, hx + Math.cos(a) * 0.34, hy + Math.sin(a) * 0.34 * 0.55, '#8fa050', {
      life: 8,
      size: 0.06,
      fade: '#4a5220',
      fadeAt: 0.55,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const hx = px + Math.cos(c.dir) * c.rPx * 0.7;
    const hy = py + Math.sin(c.dir) * c.rPx * 0.7 * squash;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const beat = c.seed % 4;
    ctx.save();
    ctx.lineCap = 'round';
    // This beat's slash: a low whip through the ankle band, angled
    // by its station so four beats circle the mark.
    const a = beat * (Math.PI / 2) + 0.35;
    const sweep = cl(t / 0.3);
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.6, sc * 0.068);
    ctx.beginPath();
    ctx.ellipse(
      hx,
      hy,
      sc * 0.5,
      sc * 0.3 * squash,
      a,
      Math.PI * 0.15,
      Math.PI * (0.15 + 0.7 * sweep),
    );
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, squash } = c;
    const hx = px + Math.cos(c.dir) * c.rPx * 0.7;
    const hy = py + Math.sin(c.dir) * c.rPx * 0.7 * squash;
    const beat = c.seed % 4;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    // THE CROWN ASSEMBLES: this beat's point and every earlier one
    // (the beats before it are re-drawn — the crown builds).
    const cy = hy - sc * 1.25;
    ctx.fillStyle = st.core;
    for (let k = 0; k <= beat; k++) {
      const kx = hx + (k - 1.5) * sc * 0.19;
      const rise = k === beat ? cl(t / 0.35) : 1;
      ctx.globalAlpha = 0.85 * rise * fade;
      ctx.beginPath();
      ctx.moveTo(kx - sc * 0.075, cy);
      ctx.lineTo(kx + sc * 0.075, cy);
      ctx.lineTo(kx, cy - sc * 0.2 * rise);
      ctx.closePath();
      ctx.fill();
    }
    // The band under the points.
    ctx.globalAlpha = 0.8 * fade;
    ctx.fillStyle = st.mid;
    ctx.fillRect(hx - sc * 0.37, cy, sc * 0.74, Math.max(2.2, sc * 0.065));
    if (beat === 3 && t > 0.4) c.glow(c.wx, c.wy, 0.7, 0.25 * fade);
    ctx.restore();
  },
};

/**
 * ECHO SHRIEK — "the air flinches twice."
 * Each pulse is its own invocation: a fan of hard sound-wedges
 * snaps outward from the maw point, and a half-beat later the world
 * ANSWERS — a second, dimmer wedge-ring returns from the rim,
 * inverted. Sound leaves nothing: no mark is laid, and that refusal
 * is the design (a shriek is over when it is over).
 */
const echo_shriek: AbilitySig = {
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.save();
    ctx.lineCap = 'butt';
    // The cry going out: eight wedges on a growing ring.
    const out = cl(t / 0.45);
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.6, sc * 0.07);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.2;
      const r = rPx * out;
      ctx.globalAlpha = 0.85 * (1 - out * 0.5) * fade;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1, r), a - 0.16, a + 0.16);
      ctx.stroke();
    }
    // THE ANSWER: the rim speaks back, dimmer, coming home.
    const back = cl((t - 0.45) / 0.45);
    if (back > 0) {
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(2.2, sc * 0.055);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + 0.2 + Math.PI / 8;
        const r = rPx * (1 - back * 0.8);
        ctx.globalAlpha = 0.6 * back * fade;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1, r), a - 0.12, a + 0.12);
        ctx.stroke();
      }
    }
    ctx.restore();
    if (crossed(c, 700, 0.02)) c.glow(c.wx, c.wy, c.radius, 0.3);
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    // The maw point: a violet flinch-diamond at cry height, first
    // quarter only — the wedges carry the rest.
    if (t > 0.3) return;
    const k = 1 - t / 0.3;
    ctx.save();
    ctx.globalAlpha = 0.9 * k;
    ctx.fillStyle = st.core;
    const s = sc * 0.14;
    const cy = py - sc * 1.3;
    ctx.beginPath();
    ctx.moveTo(px, cy - s);
    ctx.lineTo(px + s * 0.7, cy);
    ctx.lineTo(px, cy + s);
    ctx.lineTo(px - s * 0.7, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
};

/**
 * THE DARK DESCENT — the signature: "the falling knife."
 * The corridor tilts out of the SKY: a folded-wing blade plunges
 * down the dash line from altitude, three wing-fold afterimages
 * hanging behind it, shadow pouring off the leading edge. The
 * landing throws true blood and leaves a knife-shaped shadow stain
 * lying along the line of arrival.
 */
const the_dark_descent: AbilitySig = {
  spawn(c) {
    shadow.deployments.veil!(asMatter(c), c.wx, c.wy, { scale: 0.4 });
    blood.deployments.spatter!(asMatter(c), c.wx2, c.wy2, { scale: 0.45 });
    // The knife-stain: three grains in a line pointing down the dash.
    const dx = c.wx2 - c.wx;
    const dy = c.wy2 - c.wy;
    const dl = Math.hypot(dx, dy) || 1;
    for (let k = 0; k < 3; k++) {
      lay(c, c.wx2 - (dx / dl) * 0.22 * k, c.wy2 - (dy / dl) * 0.22 * k, '#302846', {
        life: 8,
        size: k === 0 ? 0.08 : 0.055,
        fade: '#1c1830',
        fadeAt: 0.5,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    // The arrival ellipse: the dark spreads from the strike point.
    const k = cl((t - 0.35) / 0.3);
    if (k <= 0) return;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.save();
    ctx.globalAlpha = 0.5 * k * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(px2, py2, sc * 0.5 * k, sc * 0.3 * k * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    const drop = cl(t / 0.35);
    ctx.save();
    ctx.lineCap = 'round';
    // The knife: a folded-wing wedge riding the line down from
    // altitude (the start hangs 2 tiles up), plus three afterimages.
    for (let k = 3; k >= 0; k--) {
      const f = cl(drop - k * 0.14);
      if (f <= 0) continue;
      const bx = px + (px2 - px) * f;
      const by = py - sc * 2 * (1 - f) + (py2 - py) * f;
      const s = sc * (k === 0 ? 0.26 : 0.2);
      ctx.globalAlpha = (k === 0 ? 0.95 : 0.35 - k * 0.07) * fade;
      ctx.fillStyle = k === 0 ? st.mid : st.deep;
      const a = Math.atan2(py2 - by, px2 - bx);
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(a) * s * 1.4, by + Math.sin(a) * s * 1.4);
      ctx.lineTo(bx + Math.cos(a + 2.5) * s, by + Math.sin(a + 2.5) * s);
      ctx.lineTo(bx + Math.cos(a - 2.5) * s, by + Math.sin(a - 2.5) * s);
      ctx.closePath();
      ctx.fill();
    }
    if (drop >= 1 && t < 0.55) {
      const kk = 1 - (t - 0.35) / 0.2;
      ctx.globalAlpha = 0.9 * cl(kk);
      ctx.fillStyle = st.spark;
      burstStarPath(ctx, px2, py2, sc * 0.22, sc * 0.08, 5, 0.55, c.squash);
      ctx.fill();
      c.glow(c.wx2, c.wy2, 0.7, 0.35 * cl(kk));
    }
    ctx.restore();
  },
};

// ================================================== THE SHELLBACKS

/**
 * SET THE SHELL — "it becomes ground."
 * The dome outline settles OVER the body and sinks a visible notch;
 * a skirt of dust breathes out at the rim on the settle beat; four
 * short stake-glints pin the shell's hem. A ring of settled dust
 * grains lasts — ground remembers being stood on.
 */
const set_the_shell: AbilitySig = {
  spawn(c) {
    const hash = srand(posSeed(c, 0x5e11));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + hash() * 0.4;
      lay(c, c.wx + Math.cos(a) * 0.52, c.wy + Math.sin(a) * 0.52 * 0.55, '#6a6252', {
        life: 8,
        size: 0.055,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const settle = cl(t / 0.3);
    ctx.save();
    // The hem ring, pressed into the earth as the shell sinks.
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2.8, sc * 0.078);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.5 * settle, sc * 0.3 * settle * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Four stake-glints pinning the hem.
    ctx.fillStyle = st.spark;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      ctx.globalAlpha = 0.85 * settle * fade;
      const gx = px + Math.cos(a) * sc * 0.5;
      const gy = py + Math.sin(a) * sc * 0.3 * squash;
      ctx.fillRect(gx - sc * 0.025, gy - sc * 0.025, sc * 0.05, sc * 0.05);
    }
    ctx.restore();
    if (crossed(c, 850, 0.3)) {
      dust.deployments.skirt!(asMatter(c), c.wx, c.wy, { scale: 0.45 });
    }
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const settle = cl(t / 0.3);
    // The dome: an arc-shell that descends a notch and holds.
    const drop = sc * 0.18 * settle;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3.2, sc * 0.085);
    ctx.beginPath();
    ctx.ellipse(px, py - sc * 0.6 + drop, sc * 0.62, sc * 0.5, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    // Three plate seams on the dome.
    ctx.lineWidth = Math.max(1.4, sc * 0.032);
    ctx.strokeStyle = st.deep;
    for (const f of [-0.5, 0, 0.5] as const) {
      ctx.globalAlpha = 0.6 * settle * fade;
      ctx.beginPath();
      ctx.moveTo(px + sc * 0.4 * f, py - sc * 0.55 + drop);
      ctx.lineTo(px + sc * 0.52 * f, py - sc * 0.14 + drop);
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * CLATTER CHALLENGE — "the dropped kettle."
 * Two shell-halves CLAP together at center; hard sound-wedges burst
 * out to the true radius — and at the rim each wedge turns into a
 * small inward arrowhead: every eye pulled BACK to the shell (the
 * taunt, said in geometry). Brass sparks bounce true. Sound leaves
 * nothing; the sparks leave two cooling grains only.
 */
const clatter_challenge: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0xc1a7);
    for (let k = 0; k < 5; k++) {
      c.particles.burst(c.wx, c.wy, 1, ['#f4ecc0', '#c9b45e'], {
        speed: 1 + rand() * 1.6,
        life: 0.9,
        size: 0.05,
        dir: rand() * Math.PI * 2,
        spread: 0.4,
        z: 0.5,
        vz: 1.4 + rand() * 1.4,
        zg: 7,
        land: 'bounce',
        bounce: 0.4,
        layer: 'world',
      });
    }
    lay(c, c.wx + 0.2, c.wy + 0.1, '#8a7434', { life: 6, size: 0.055 });
    lay(c, c.wx - 0.24, c.wy - 0.06, '#8a7434', { life: 6, size: 0.055 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const out = cl(t / 0.5);
    ctx.save();
    ctx.lineCap = 'butt';
    // Sound wedges racing out...
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.8, sc * 0.078);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.26;
      ctx.globalAlpha = 0.8 * (1 - out * 0.45) * fade;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1, rPx * out), a - 0.2, a + 0.2);
      ctx.stroke();
    }
    // ...and THE HOOKS: once the wedge arrives, an arrowhead turns
    // back toward the shell at each station.
    if (out > 0.85) {
      ctx.fillStyle = st.core;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.26;
        const hx = px + Math.cos(a) * rPx;
        const hy = py + Math.sin(a) * rPx * squash;
        ctx.globalAlpha = 0.9 * fade;
        ctx.beginPath();
        ctx.moveTo(hx - Math.cos(a) * sc * 0.16, hy - Math.sin(a) * sc * 0.16 * squash);
        ctx.lineTo(hx + Math.cos(a + 2.2) * sc * 0.09, hy + Math.sin(a + 2.2) * sc * 0.09 * squash);
        ctx.lineTo(hx + Math.cos(a - 2.2) * sc * 0.09, hy + Math.sin(a - 2.2) * sc * 0.09 * squash);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    // The clap: two shell-arcs meet at chest height, first third.
    if (t > 0.34) return;
    const meet = cl(t / 0.18);
    const k = t < 0.18 ? 1 : 1 - (t - 0.18) / 0.16;
    const cy = py - sc * 0.7;
    const gap = (1 - meet) * sc * 0.5;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.92 * cl(k);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(3.4, sc * 0.09);
    ctx.beginPath();
    ctx.ellipse(px - gap, cy, sc * 0.26, sc * 0.34, 0, Math.PI * 0.6, Math.PI * 1.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(px + gap, cy, sc * 0.26, sc * 0.34, 0, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();
    if (meet >= 1) {
      ctx.fillStyle = st.spark;
      burstStarPath(ctx, px, cy, sc * 0.2, sc * 0.08, 4, 0.6, 1);
      ctx.fill();
      c.glow(c.wx, c.wy, 0.8, 0.35 * cl(k));
    }
    ctx.restore();
  },
};

/**
 * HORN TOSS — "filed skyward."
 * The horn scoops UP through a rising crescent; a gouge opens where
 * it dug in, and one true chunk of earth is tossed high on the arc
 * to bounce back down. The gouge line lasts.
 */
const horn_toss: AbilitySig = {
  spawn(c) {
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.6;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.6;
    dust.deployments.gouge!(asMatter(c), hx, hy, { scale: 0.5, dir: c.dir });
    const rand = srand(c.seed ^ 0x40a7);
    c.particles.burst(hx, hy, 2, ['#7a8a6a', '#54432c'], {
      speed: 0.5 + rand() * 0.5,
      life: 1.6,
      size: 0.07,
      dir: c.dir,
      spread: 0.5,
      z: 0.2,
      vz: 3 + rand() * 1.2,
      zg: 8,
      land: 'bounce',
      bounce: 0.35,
      layer: 'world',
      shadow: 0.5,
    });
    lay(c, hx, hy, '#3c4632', { life: 8, size: 0.075 });
    lay(c, hx + Math.cos(c.dir) * 0.2, hy + Math.sin(c.dir) * 0.2, '#3c4632', {
      life: 7,
      size: 0.06,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    // The dug line: a short furrow opening along the aim.
    const open = cl(t / 0.3);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(3.0, sc * 0.082);
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(c.dir) * sc * 0.2, py + Math.sin(c.dir) * sc * 0.2 * squash);
    ctx.lineTo(
      px + Math.cos(c.dir) * sc * (0.2 + 0.5 * open),
      py + Math.sin(c.dir) * sc * (0.2 + 0.5 * open) * squash,
    );
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, squash } = c;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    // The horn's rising crescent: sweeps from ground to sky.
    const rise = cl(t / 0.4);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.92 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(3.4, sc * 0.092);
    const hx = px + Math.cos(c.dir) * c.rPx * 0.6;
    const hy = py + Math.sin(c.dir) * c.rPx * 0.6 * squash;
    ctx.beginPath();
    ctx.ellipse(
      hx,
      hy - sc * 0.34,
      sc * 0.48,
      sc * 0.85,
      c.dir,
      Math.PI * 0.5,
      Math.PI * (0.5 + 0.9 * rise),
    );
    ctx.stroke();
    // The tip glint at the top of the sweep.
    if (rise > 0.85 && t < 0.6) {
      ctx.fillStyle = st.spark;
      ctx.globalAlpha = 0.9 * fade;
      burstStarPath(ctx, hx, hy - sc * 1.22, sc * 0.22, sc * 0.085, 4, 0.5, 1);
      ctx.fill();
    }
    ctx.restore();
  },
};

/**
 * TIDE GRIP — "low tide closes."
 * Two caliper claw-arcs close on the pinch point while a thin
 * waterline ring RECEDES toward it (the tide going out around the
 * held thing). Frost blooms at the meet. A rime crescent lasts.
 */
const tide_grip: AbilitySig = {
  spawn(c) {
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.65;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.65;
    frost.deployments.bloom!(asMatter(c), hx, hy, { scale: 0.4 });
    lay(c, hx, hy + 0.08, '#8fd0dc', { life: 8, size: 0.07, fade: '#3d6a74', fadeAt: 0.5 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const hx = px + Math.cos(c.dir) * c.rPx * 0.65;
    const hy = py + Math.sin(c.dir) * c.rPx * 0.65 * squash;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.save();
    // The receding waterline: a ring shrinking onto the pinch.
    const recede = cl(t / 0.55);
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(2.2, sc * 0.055);
    ctx.beginPath();
    ctx.ellipse(
      hx,
      hy,
      sc * (0.55 - 0.4 * recede),
      sc * (0.33 - 0.24 * recede) * squash,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const hx = px + Math.cos(c.dir) * c.rPx * 0.65;
    const hy = py + Math.sin(c.dir) * c.rPx * 0.65 * squash;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const close = cl(t / 0.3);
    const gap = (1 - close) * sc * 0.3;
    ctx.save();
    ctx.lineCap = 'round';
    // The caliper: upper and lower claw-arcs, closing slow and sure.
    ctx.lineWidth = Math.max(3.2, sc * 0.085);
    ctx.globalAlpha = 0.92 * fade;
    ctx.strokeStyle = st.core;
    ctx.beginPath();
    ctx.ellipse(hx, hy - gap - sc * 0.12, sc * 0.4, sc * 0.3, 0.3, Math.PI * 1.05, Math.PI * 1.9);
    ctx.stroke();
    ctx.strokeStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(hx, hy + gap + sc * 0.12, sc * 0.4, sc * 0.3, -0.3, Math.PI * 0.1, Math.PI * 0.95);
    ctx.stroke();
    // The pinch: a cold star exactly when the caliper meets.
    if (close >= 1 && t < 0.55) {
      const k = 1 - (t - 0.3) / 0.25;
      ctx.globalAlpha = 0.9 * cl(k);
      ctx.fillStyle = st.spark;
      burstStarPath(ctx, hx, hy, sc * 0.26, sc * 0.1, 6, 0.5, squash);
      ctx.fill();
      c.glow(c.wx + Math.cos(c.dir) * c.radius * 0.65, c.wy + Math.sin(c.dir) * c.radius * 0.65, 0.5, 0.3 * cl(k));
    }
    ctx.restore();
  },
};

/**
 * THE UNDERTOW — the signature: "the sea remembers you seaward."
 * Three pulls, three invocations: each wave is one dragging crest
 * that spirals INWARD to the crab, scoring a curved furrow behind
 * it. The spiral's rotation is wave-stable (posSeed) so the three
 * pulls braid one whirl instead of three. Cold spray lifts off each
 * crest; the furrows last as a spiral of rime grains.
 */
const the_undertow: AbilitySig = {
  spawn(c) {
    water.deployments.undertow!(asMatter(c), c.wx, c.wy, { scale: 0.55, radius: c.radius });
    const hash = srand(posSeed(c, 0x0417));
    const base = hash() * Math.PI * 2;
    const wave = c.seed % 3;
    // This pull's furrow: four rime grains along its arc.
    for (let k = 0; k < 4; k++) {
      const f = k / 4;
      const a = base + wave * 2.1 + f * 1.6;
      const r = c.radius * (0.85 - f * 0.55);
      lay(c, c.wx + Math.cos(a) * r, c.wy + Math.sin(a) * r * 0.55, '#9ad0dc', {
        life: 8,
        size: 0.045,
        fade: '#3d6a74',
        fadeAt: 0.55,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const hash = srand(posSeed(c, 0x0417));
    const base = hash() * Math.PI * 2;
    const wave = c.seed % 3;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const pull = cl(t / 0.6);
    ctx.save();
    ctx.lineCap = 'round';
    // The crest: a thick arc dragging inward along its spiral arm.
    const a0 = base + wave * 2.1 + pull * 1.6;
    const r = rPx * (0.85 - pull * 0.55);
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3.4, sc * 0.092);
    ctx.beginPath();
    ctx.ellipse(px, py, r, r * squash, 0, a0 - 0.5, a0 + 0.2);
    ctx.stroke();
    // The scored furrow behind the crest, thinner, deeper-toned.
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2.4, sc * 0.062);
    ctx.beginPath();
    ctx.ellipse(px, py, r + sc * 0.08, (r + sc * 0.08) * squash, 0, a0 - 1.3, a0 - 0.5);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    // Cold spray lifts off the crest's shoulder once per pull.
    if (crossed(c, 700, 0.3)) {
      const hash = srand(posSeed(c, 0x0417));
      const base = hash() * Math.PI * 2;
      const wave = c.seed % 3;
      const a = base + wave * 2.1 + 0.8;
      const r = c.radius * 0.6;
      frost.deployments.fog!(asMatter(c), c.wx + Math.cos(a) * r, c.wy + Math.sin(a) * r * 0.55, {
        scale: 0.35,
      });
    }
  },
};

/**
 * THE STANDING STONE — the signature: "an animal becomes geography."
 * A monolith rises over the turtle — a tall tapered slab with one
 * carved eye-ring — planted with a dust slam. Around the radius,
 * eye-hooks turn inward; at the hem, five true pebbles are thrown a
 * hand high and SETTLE into a standing circle that outlives the
 * word by nine seconds. The stone circle IS the lasting mark.
 */
const the_standing_stone: AbilitySig = {
  spawn(c) {
    dust.deployments.slam!(asMatter(c), c.wx, c.wy, { scale: 0.6 });
    const rand = srand(c.seed ^ 0x570e);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.3;
      c.particles.burst(c.wx + Math.cos(a) * 0.55, c.wy + Math.sin(a) * 0.32, 1, ['#8a9282', '#5e6456'], {
        speed: 0.15,
        life: 9,
        size: 0.06,
        dir: a,
        spread: 0.2,
        z: 0.1,
        vz: 1.6 + rand() * 0.8,
        zg: 7,
        land: 'settle',
        layer: 'world',
        shadow: 0.4,
        fade: '#44483e',
        fadeAt: 0.7,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    const out = cl(t / 0.45);
    ctx.save();
    // The rune ring at the true radius, faint — the story is at the
    // rim: inward eye-hooks at six stations.
    ctx.globalAlpha = 0.4 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.4, sc * 0.062);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * out, rPx * out * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (out > 0.85) {
      ctx.fillStyle = st.core;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const hx = px + Math.cos(a) * rPx;
        const hy = py + Math.sin(a) * rPx * squash;
        ctx.globalAlpha = 0.85 * fade;
        ctx.beginPath();
        ctx.moveTo(hx - Math.cos(a) * sc * 0.15, hy - Math.sin(a) * sc * 0.15 * squash);
        ctx.lineTo(hx + Math.cos(a + 2.3) * sc * 0.08, hy + Math.sin(a + 2.3) * sc * 0.08 * squash);
        ctx.lineTo(hx + Math.cos(a - 2.3) * sc * 0.08, hy + Math.sin(a - 2.3) * sc * 0.08 * squash);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    const rise = cl(t / 0.35);
    ctx.save();
    // THE MONOLITH: a tapered slab standing out of the shell, one
    // carved eye-ring near its head. It rises once and holds.
    const h = sc * 1.5 * rise;
    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.moveTo(px - sc * 0.24, py);
    ctx.lineTo(px - sc * 0.16, py - h);
    ctx.lineTo(px + sc * 0.13, py - h);
    ctx.lineTo(px + sc * 0.22, py);
    ctx.closePath();
    ctx.fill();
    // The lit face edge.
    ctx.fillStyle = st.spark;
    ctx.beginPath();
    ctx.moveTo(px - sc * 0.24, py);
    ctx.lineTo(px - sc * 0.16, py - h);
    ctx.lineTo(px - sc * 0.1, py - h);
    ctx.lineTo(px - sc * 0.17, py);
    ctx.closePath();
    ctx.fill();
    // The carved eye.
    if (rise > 0.8) {
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(2.4, sc * 0.062);
      ctx.beginPath();
      ctx.arc(px, py - h * 0.75, sc * 0.09, 0, Math.PI * 2);
      ctx.stroke();
      c.glow(c.wx, c.wy, 0.8, 0.2 * fade);
    }
    ctx.restore();
  },
};

/**
 * RIPTIDE CLAW — "the harbor gate falls."
 * One massive gate-arc descends across the aim — a portcullis of
 * claw drawn falling, not swung — with a cold crack-line splitting
 * the ground where it lands and true water thrown at the foot.
 * The cracks last, rimed.
 */
const riptide_claw: AbilitySig = {
  spawn(c) {
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.6;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.6;
    water.deployments.splash!(asMatter(c), hx, hy, { scale: 0.5 });
    frost.deployments.shatter!(asMatter(c), hx, hy, { scale: 0.45 });
    const rand = srand(c.seed ^ 0x41b7);
    for (let k = 0; k < 3; k++) {
      const a = c.dir + (rand() - 0.5) * 1.6;
      lay(c, hx + Math.cos(a) * 0.24 * (k + 1) * 0.5, hy + Math.sin(a) * 0.14 * (k + 1) * 0.5, '#8fd0dc', {
        life: 8,
        size: 0.065,
        fade: '#22424c',
        fadeAt: 0.5,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const hx = px + Math.cos(c.dir) * c.rPx * 0.6;
    const hy = py + Math.sin(c.dir) * c.rPx * 0.6 * squash;
    const land = cl((t - 0.22) / 0.2);
    if (land <= 0) return;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.save();
    ctx.lineCap = 'round';
    // The crack: three cold jags splitting from the landing seam.
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2.8, sc * 0.075);
    const rand = srand(c.seed ^ 0x41b8);
    for (let k = 0; k < 3; k++) {
      const a = c.dir + (k - 1) * 0.7 + (rand() - 0.5) * 0.3;
      ctx.globalAlpha = 0.8 * land * fade;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      const mx = hx + Math.cos(a) * sc * 0.3 * land;
      const my = hy + Math.sin(a) * sc * 0.3 * land * squash;
      ctx.lineTo(mx, my);
      ctx.lineTo(
        mx + Math.cos(a + 0.5) * sc * 0.2 * land,
        my + Math.sin(a + 0.5) * sc * 0.2 * land * squash,
      );
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const hx = px + Math.cos(c.dir) * c.rPx * 0.6;
    const hy = py + Math.sin(c.dir) * c.rPx * 0.6 * squash;
    // THE GATE: a broad claw-slab falling from above the fight.
    const drop = cl(t / 0.22);
    ctx.save();
    ctx.lineCap = 'round';
    const gy = hy - sc * (1.4 - 1.4 * drop);
    ctx.globalAlpha = 0.92 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(3.8, sc * 0.105);
    ctx.beginPath();
    ctx.ellipse(hx, gy - sc * 0.3, sc * 0.6, sc * 0.7, c.dir, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    // Three teeth hanging off the gate's lower edge.
    ctx.fillStyle = st.mid;
    for (let k = 0; k < 3; k++) {
      const f = (k - 1) * 0.75;
      ctx.globalAlpha = 0.9 * fade;
      ctx.beginPath();
      ctx.moveTo(hx + sc * (f - 0.1), gy + sc * 0.26);
      ctx.lineTo(hx + sc * (f + 0.1), gy + sc * 0.26);
      ctx.lineTo(hx + sc * f, gy + sc * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    if (drop >= 1 && t < 0.45) {
      const k = 1 - (t - 0.22) / 0.23;
      c.glow(c.wx + Math.cos(c.dir) * c.radius * 0.6, c.wy + Math.sin(c.dir) * c.radius * 0.6, 0.7, 0.35 * cl(k));
    }
    ctx.restore();
  },
};

/**
 * THE KING'S PINCER — the signature: "the argument closes."
 * A crown hangs over the meet while the two royal arcs close as one
 * seam; where they meet, a frost seam SHATTERS outward (the vs-chill
 * payoff, said in ice) and true blood follows. The crown's five
 * points last as grains around the seam.
 */
const the_kings_pincer: AbilitySig = {
  spawn(c) {
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.65;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.65;
    frost.deployments.shatter!(asMatter(c), hx, hy, { scale: 0.5 });
    blood.deployments.spray!(asMatter(c), hx, hy, { scale: 0.4, dir: c.dir });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      lay(c, hx + Math.cos(a) * 0.3, hy + Math.sin(a) * 0.3 * 0.55, '#ffd0c0', {
        life: 8,
        size: 0.06,
        fade: '#5e2c20',
        fadeAt: 0.55,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const hx = px + Math.cos(c.dir) * c.rPx * 0.65;
    const hy = py + Math.sin(c.dir) * c.rPx * 0.65 * squash;
    const burst = cl((t - 0.3) / 0.3);
    if (burst <= 0) return;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.save();
    // The shattered seam: six ice shards flung flat from the meet.
    ctx.fillStyle = st.spark;
    const rand = srand(c.seed ^ 0x816c);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.4;
      const r = sc * (0.16 + 0.34 * burst);
      const sx = hx + Math.cos(a) * r;
      const sy = hy + Math.sin(a) * r * squash;
      ctx.globalAlpha = 0.85 * (1 - burst * 0.5) * fade;
      ctx.beginPath();
      ctx.moveTo(sx, sy - sc * 0.07);
      ctx.lineTo(sx + sc * 0.045, sy + sc * 0.045);
      ctx.lineTo(sx - sc * 0.045, sy + sc * 0.045);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const hx = px + Math.cos(c.dir) * c.rPx * 0.65;
    const hy = py + Math.sin(c.dir) * c.rPx * 0.65 * squash;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    const close = cl(t / 0.3);
    ctx.save();
    ctx.lineCap = 'round';
    // The royal arcs closing to one seam.
    const gap = (1 - close) * sc * 0.36;
    ctx.lineWidth = Math.max(3.6, sc * 0.098);
    ctx.globalAlpha = 0.94 * fade;
    ctx.strokeStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(hx - gap, hy - sc * 0.24, sc * 0.44, sc * 0.52, 0.4, Math.PI * 0.55, Math.PI * 1.45);
    ctx.stroke();
    ctx.strokeStyle = shade(st.mid, -18);
    ctx.beginPath();
    ctx.ellipse(hx + gap, hy - sc * 0.24, sc * 0.44, sc * 0.52, -0.4, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
    // THE CROWN over the meet: five points, held whole.
    const cy = hy - sc * 1.35;
    ctx.fillStyle = st.core;
    for (let k = 0; k < 5; k++) {
      const kx = hx + (k - 2) * sc * 0.16;
      ctx.globalAlpha = 0.9 * fade;
      ctx.beginPath();
      ctx.moveTo(kx - sc * 0.07, cy);
      ctx.lineTo(kx + sc * 0.07, cy);
      ctx.lineTo(kx, cy - sc * (k === 2 ? 0.24 : 0.16));
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 0.85 * fade;
    ctx.fillStyle = st.spark;
    ctx.fillRect(hx - sc * 0.34, cy, sc * 0.68, Math.max(2.2, sc * 0.065));
    if (close >= 1 && t < 0.5) c.glow(c.wx, c.wy, 0.8, 0.3 * fade);
    ctx.restore();
  },
};

// ==================================================== THE TUSKERS

/**
 * GORE CHARGE — "a cart with opinions."
 * Twin tusk-rails plow the whole corridor — two parallel gouged
 * lines with earth ridging outward off each — under a rolling dust
 * skirt. At the arrival, a wide V of thrown earth bounces true.
 * The twin furrows last.
 */
const gore_charge: AbilitySig = {
  spawn(c) {
    dust.deployments.billow!(asMatter(c), c.wx, c.wy, { scale: 0.5, dir: Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx) });
    const a = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    const rand = srand(c.seed ^ 0x60be);
    for (let k = 0; k < 4; k++) {
      c.particles.burst(c.wx2, c.wy2, 1, ['#8c6a45', '#54432c'], {
        speed: 0.9 + rand() * 0.9,
        life: 1.4,
        size: 0.06,
        dir: a + (rand() - 0.5) * 1.1,
        spread: 0.3,
        z: 0.25,
        vz: 2 + rand() * 1.6,
        zg: 8,
        land: 'bounce',
        bounce: 0.3,
        layer: 'world',
        shadow: 0.4,
      });
    }
    // The rails' lasting furrows: grains along both lines.
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    for (let k = 0; k < 3; k++) {
      const f = 0.3 + k * 0.3;
      const bx = c.wx + (c.wx2 - c.wx) * f;
      const by = c.wy + (c.wy2 - c.wy) * f;
      lay(c, bx + nx * 0.14, by + ny * 0.14 * 0.55, '#54432c', { life: 8, size: 0.045 });
      lay(c, bx - nx * 0.14, by - ny * 0.14 * 0.55, '#54432c', { life: 8, size: 0.045 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const run = cl(t / 0.3);
    const nx = -(py2 - py);
    const ny = px2 - px;
    const nl = Math.hypot(nx, ny) || 1;
    const ox = (nx / nl) * sc * 0.11;
    const oy = (ny / nl) * sc * 0.11;
    ctx.save();
    ctx.lineCap = 'round';
    // The twin rails, plowed to the run's head.
    for (const s of [-1, 1] as const) {
      ctx.globalAlpha = (s < 0 ? 0.85 : 0.75) * fade;
      ctx.strokeStyle = s < 0 ? st.deep : shade(st.deep, -12);
      ctx.lineWidth = Math.max(3.0, sc * 0.08);
      ctx.beginPath();
      ctx.moveTo(px + ox * s, py + oy * s);
      ctx.lineTo(px + (px2 - px) * run + ox * s, py + (py2 - py) * run + oy * s);
      ctx.stroke();
    }
    // Ridge nicks flicking outward off the rails.
    ctx.lineWidth = Math.max(2.0, sc * 0.05);
    ctx.strokeStyle = st.mid;
    for (let k = 0; k < 4; k++) {
      const f = 0.18 + k * 0.22;
      if (f > run) continue;
      const bx = px + (px2 - px) * f;
      const by = py + (py2 - py) * f;
      ctx.globalAlpha = 0.6 * fade;
      ctx.beginPath();
      ctx.moveTo(bx + ox * 1.1, by + oy * 1.1);
      ctx.lineTo(bx + ox * 2, by + oy * 2);
      ctx.moveTo(bx - ox * 1.1, by - oy * 1.1);
      ctx.lineTo(bx - ox * 2, by - oy * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    // The tusk V at the head of the charge, riding the run.
    const run = cl(t / 0.3);
    if (t > 0.55) return;
    const k = t < 0.3 ? 1 : 1 - (t - 0.3) / 0.25;
    const hx = px + (px2 - px) * run;
    const hy = py + (py2 - py) * run - sc * 0.32;
    const a = Math.atan2(py2 - py, px2 - px);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.92 * cl(k);
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(3.2, sc * 0.085);
    for (const s of [-1, 1] as const) {
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(
        hx + Math.cos(a + s * 2.6) * sc * 0.34,
        hy + Math.sin(a + s * 2.6) * sc * 0.2 - sc * 0.14,
      );
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * TUSK SWEEP — "shin height."
 * The cheap word, honestly cheap: one extra-flat crescent skimming
 * the ground through the arc, three grass-nicks flicked up where it
 * passed. One shallow nick lasts. Two strata only, by design — a
 * one-focus art does not pretend to be a signature.
 */
const tusk_sweep: AbilitySig = {
  spawn(c) {
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.55;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.55;
    dust.deployments.kick!(asMatter(c), hx, hy, { scale: 0.3 });
    lay(c, hx, hy, '#58432c', { life: 6, size: 0.045 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const sweep = cl(t / 0.28);
    ctx.save();
    ctx.lineCap = 'round';
    // The flat crescent: squashed hard — it lives at the shins.
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3.0, sc * 0.08);
    const half = 0.65;
    ctx.beginPath();
    ctx.ellipse(
      px,
      py,
      rPx * 0.95,
      rPx * 0.95 * squash * 0.7,
      0,
      c.dir - half,
      c.dir - half + half * 2 * sweep,
    );
    ctx.stroke();
    // Three nicks flicked up along the swept band.
    ctx.lineWidth = Math.max(2.0, sc * 0.05);
    ctx.strokeStyle = st.spark;
    for (let k = 0; k < 3; k++) {
      const f = 0.25 + k * 0.25;
      if (f > sweep) continue;
      const a = c.dir - half + half * 2 * f;
      const bx = px + Math.cos(a) * rPx * 0.8;
      const by = py + Math.sin(a) * rPx * 0.8 * squash * 0.7;
      ctx.globalAlpha = 0.75 * fade;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + sc * 0.08, by - sc * 0.22);
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * MUD WALLOW — "it stands up newer."
 * The wallow print forms under the boar — a fat ellipse with a
 * rolled rim — while lazy mud gobbets loft and SPLAT true. The
 * cleanse reads upward: dark flecks leave the body and die in the
 * air. The wallow print itself lasts eight seconds.
 */
const mud_wallow: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x3add);
    // Mud gobbets: unowned matter, hand-thrown, splat on landing.
    for (let k = 0; k < 6; k++) {
      c.particles.burst(c.wx, c.wy, 1, ['#8a6f4a', '#5e4a30'], {
        speed: 0.5 + rand() * 0.7,
        life: 1.8,
        size: 0.065,
        dir: rand() * Math.PI * 2,
        spread: 0.4,
        z: 0.3,
        vz: 2 + rand() * 1.4,
        zg: 6,
        land: 'splat',
        layer: 'world',
        shadow: 0.45,
      });
    }
    const hash = srand(posSeed(c, 0x3add));
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + hash() * 0.5;
      lay(c, c.wx + Math.cos(a) * 0.38, c.wy + Math.sin(a) * 0.38 * 0.55, '#5e4a30', {
        life: 8,
        size: 0.055,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    const form = cl(t / 0.3);
    ctx.save();
    // The bath: a dark ellipse with a rolled rim highlight.
    ctx.globalAlpha = 0.55 * form * fade;
    ctx.fillStyle = shade(st.mid, -25);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.52 * form, sc * 0.32 * form * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.7 * form * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.6, sc * 0.068);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.52 * form, sc * 0.32 * form * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    // The cleanse: dark flecks LEAVE the body, rising and dying.
    const rand = srand(c.seed ^ 0x3ade);
    ctx.save();
    ctx.fillStyle = shade(st.deep, -10);
    for (let k = 0; k < 5; k++) {
      const f = cl((t - k * 0.1) / 0.4);
      if (f <= 0 || f >= 1) continue;
      const a = rand() * Math.PI * 2;
      const r = sc * 0.25 * (rand() * 0.6 + 0.4);
      ctx.globalAlpha = (1 - f) * 0.7 * fade;
      ctx.fillRect(
        px + Math.cos(a) * r - sc * 0.02,
        py - sc * (0.5 + f * 0.8),
        sc * 0.045,
        sc * 0.045,
      );
    }
    // One clean glint on the risen boar at the end.
    if (t > 0.65) {
      const k = 1 - Math.abs((t - 0.75) / 0.15);
      ctx.globalAlpha = 0.85 * cl(k);
      ctx.fillStyle = st.spark;
      burstStarPath(ctx, px + sc * 0.18, py - sc * 0.85, sc * 0.1, sc * 0.04, 4, 0.5, 1);
      ctx.fill();
    }
    ctx.restore();
  },
};

/**
 * THE LONG FURROW — the signature: "the field, plowed."
 * Two wires, one story. The DASH is the leap: an arcing shadow-mass
 * crosses overhead with dust pouring off it. The NOVA is the land:
 * ONE LONG FURROW rips forward from the impact — a widening cracked
 * line with turned-earth ridges on both flanks, rocks bouncing out
 * of it — and the furrow LASTS: a nine-second line of dark grains
 * flanked by ridge grains. The field stays plowed.
 */
const the_long_furrow: AbilitySig = {
  spawn(c) {
    if (c.kind === 'dash') {
      dust.deployments.billow!(asMatter(c), c.wx, c.wy, { scale: 0.4 });
      return;
    }
    dust.deployments.slam!(asMatter(c), c.wx, c.wy, { scale: 0.7 });
    const a = c.dir;
    const rand = srand(c.seed ^ 0xf40e);
    for (let k = 0; k < 5; k++) {
      const f = 0.2 + k * 0.2;
      const bx = c.wx + Math.cos(a) * c.radius * f;
      const by = c.wy + Math.sin(a) * c.radius * f * 0.55;
      c.particles.burst(bx, by, 1, ['#8c5a3a', '#442b1a'], {
        speed: 0.4 + rand() * 0.6,
        life: 1.6,
        size: 0.06,
        dir: a + (rand() < 0.5 ? 1.6 : -1.6),
        spread: 0.4,
        z: 0.15,
        vz: 1.8 + rand() * 1.4,
        zg: 8,
        land: 'bounce',
        bounce: 0.3,
        layer: 'world',
        shadow: 0.4,
      });
      // The furrow line + its ridges, laid to last.
      lay(c, bx, by, '#442b1a', { life: 9, size: 0.055 });
      const nx = -Math.sin(a) * 0.16;
      const ny = Math.cos(a) * 0.16 * 0.55;
      lay(c, bx + nx, by + ny, '#6e4a2c', { life: 8, size: 0.04 });
      lay(c, bx - nx, by - ny, '#6e4a2c', { life: 8, size: 0.04 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    if (c.kind === 'dash') return; // the dash is sky business
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    const rip = cl(t / 0.5);
    const a = c.dir;
    ctx.save();
    ctx.lineCap = 'round';
    // THE FURROW: the widening crack, ripped to the rip's head.
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(3.6, sc * 0.1);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(a) * rPx * rip, py + Math.sin(a) * rPx * rip * squash);
    ctx.stroke();
    // The turned ridges: short flicks off both flanks.
    ctx.lineWidth = Math.max(2.4, sc * 0.062);
    ctx.strokeStyle = st.mid;
    for (let k = 0; k < 5; k++) {
      const f = 0.15 + k * 0.18;
      if (f > rip) continue;
      const bx = px + Math.cos(a) * rPx * f;
      const by = py + Math.sin(a) * rPx * f * squash;
      const na = a + Math.PI / 2;
      ctx.globalAlpha = 0.7 * fade;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(na) * sc * 0.09, by + Math.sin(na) * sc * 0.09 * squash);
      ctx.lineTo(bx + Math.cos(na) * sc * 0.24, by + Math.sin(na) * sc * 0.24 * squash);
      ctx.moveTo(bx - Math.cos(na) * sc * 0.09, by - Math.sin(na) * sc * 0.09 * squash);
      ctx.lineTo(bx - Math.cos(na) * sc * 0.24, by - Math.sin(na) * sc * 0.24 * squash);
      ctx.stroke();
    }
    ctx.restore();
    if (crossed(c, 700, 0.04)) c.glow(c.wx, c.wy, c.radius * 0.8, 0.4);
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    if (c.kind !== 'dash') return;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    // The leap: a dark tusked mass arcing overhead, start to end.
    const f = cl(t / 0.6);
    const bx = px + (px2 - px) * f;
    const by = py + (py2 - py) * f - Math.sin(f * Math.PI) * sc * 1.3;
    ctx.save();
    ctx.globalAlpha = 0.85 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(bx, by, sc * 0.32, sc * 0.22, Math.atan2(py2 - py, px2 - px), 0, Math.PI * 2);
    ctx.fill();
    // The tusks leading the mass.
    ctx.strokeStyle = st.spark;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2.6, sc * 0.068);
    const a = Math.atan2(py2 - py, px2 - px);
    for (const s of [-1, 1] as const) {
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(a) * sc * 0.28, by + Math.sin(a) * sc * 0.28);
      ctx.lineTo(bx + Math.cos(a + s * 0.5) * sc * 0.46, by + Math.sin(a + s * 0.5) * sc * 0.46);
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ===================================================== THE CANIDS

/**
 * WORRY THE WOUND — "never a second door."
 * The clamp sets and then WORRIES: the whole jaw yanks aside twice
 * (two crossing beats), each yank dragging a smeared stain a little
 * further. Blood beads pull from the wound line back toward the
 * jaw's root — the drink of the vs-bleed lean. Three offset stains
 * last, telling the worrying.
 */
const worry_the_wound: AbilitySig = {
  spawn(c) {
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.65;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.65;
    blood.deployments.spray!(asMatter(c), hx, hy, { scale: 0.4, dir: c.dir });
    for (let k = 0; k < 3; k++) {
      lay(c, hx + (k - 1) * 0.16, hy + Math.abs(k - 1) * 0.07, '#7a2c1e', {
        life: 8,
        size: k === 1 ? 0.08 : 0.06,
        fade: '#44160e',
        fadeAt: 0.5,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const hx = px + Math.cos(c.dir) * c.rPx * 0.65;
    const hy = py + Math.sin(c.dir) * c.rPx * 0.65 * squash;
    const fade = t < 0.78 ? 1 : (1 - t) / 0.22;
    // The worry: the jaw's whole line yanks left, then right.
    const yank =
      t < 0.3 ? 0 : t < 0.5 ? Math.sin(((t - 0.3) / 0.2) * Math.PI) : t < 0.7 ? -Math.sin(((t - 0.5) / 0.2) * Math.PI) : 0;
    const ox = -Math.sin(c.dir) * sc * 0.14 * yank;
    const oy = Math.cos(c.dir) * sc * 0.14 * yank * squash;
    const close = cl(t / 0.22);
    const gap = (1 - close) * sc * 0.4;
    ctx.save();
    ctx.lineCap = 'round';
    for (const side of [-1, 1] as const) {
      ctx.globalAlpha = 0.92 * fade;
      ctx.strokeStyle = side < 0 ? st.core : st.mid;
      ctx.lineWidth = Math.max(3.0, sc * 0.082);
      ctx.beginPath();
      ctx.ellipse(
        hx + ox,
        hy + oy + side * gap,
        sc * 0.42,
        sc * 0.23 * squash,
        c.dir,
        side < 0 ? Math.PI * 1.1 : Math.PI * 0.1,
        side < 0 ? Math.PI * 1.9 : Math.PI * 0.9,
      );
      ctx.stroke();
    }
    ctx.restore();
    // The drink: beads pulled home on each yank's crest.
    if (crossed(c, 500, 0.4) || crossed(c, 500, 0.6)) {
      blood.deployments.drink!(asMatter(c), c.wx + Math.cos(c.dir) * c.radius * 0.65, c.wy + Math.sin(c.dir) * c.radius * 0.65, { scale: 0.35, x2: c.wx, y2: c.wy });
    }
  },
};

/**
 * HAMSTRING — "where running lives."
 * One precise low bite-line at ankle height — then the mark's own
 * next stride reads WRONG: two step-ghost prints stagger out of the
 * bite, the second dragging into a smear (the slow, said in
 * footwork). A rimed nick lasts.
 */
const hamstring: AbilitySig = {
  spawn(c) {
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.65;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.65;
    frost.deployments.lance!(asMatter(c), hx, hy, { scale: 0.3, dir: c.dir });
    lay(c, hx, hy, '#9ad0e4', { life: 7, size: 0.07, fade: '#3a4c5c', fadeAt: 0.5 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const hx = px + Math.cos(c.dir) * c.rPx * 0.65;
    const hy = py + Math.sin(c.dir) * c.rPx * 0.65 * squash;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.save();
    ctx.lineCap = 'round';
    // The bite-line: one low, hard nick across the running line.
    const cut = cl(t / 0.2);
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2.8, sc * 0.075);
    const na = c.dir + Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(hx - Math.cos(na) * sc * 0.34 * cut, hy - Math.sin(na) * sc * 0.34 * cut * squash);
    ctx.lineTo(hx + Math.cos(na) * sc * 0.34 * cut, hy + Math.sin(na) * sc * 0.34 * cut * squash);
    ctx.stroke();
    // The wrong stride: two ghost prints stumbling past the bite,
    // the second smearing sideways.
    const step1 = cl((t - 0.3) / 0.2);
    const step2 = cl((t - 0.55) / 0.2);
    ctx.fillStyle = st.mid;
    if (step1 > 0) {
      ctx.globalAlpha = 0.55 * step1 * fade;
      ctx.beginPath();
      ctx.ellipse(
        hx + Math.cos(c.dir) * sc * 0.3,
        hy + Math.sin(c.dir) * sc * 0.3 * squash,
        sc * 0.1,
        sc * 0.14 * squash,
        c.dir,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    if (step2 > 0) {
      ctx.globalAlpha = 0.45 * step2 * fade;
      ctx.beginPath();
      ctx.ellipse(
        hx + Math.cos(c.dir) * sc * 0.52 + Math.cos(na) * sc * 0.16 * step2,
        hy + (Math.sin(c.dir) * sc * 0.52 + Math.sin(na) * sc * 0.16 * step2) * squash,
        sc * (0.1 + 0.1 * step2),
        sc * 0.12 * squash,
        c.dir + 0.5 * step2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  },
};

/**
 * THE FIRST HOWL — the signature: "its own blood answers."
 * The muzzle lifts and a breath-column climbs; at its crest it
 * breaks into three ascending song-rings. Then the answer: warm
 * russet motes rain back DOWN the column and settle along the
 * wolf's spine-line — the surge arriving as a mantle of embers
 * that are not fire. A ring of six warm grains lasts at its feet.
 */
const the_first_howl: AbilitySig = {
  spawn(c) {
    const hash = srand(posSeed(c, 0x40e1));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + hash() * 0.4;
      lay(c, c.wx + Math.cos(a) * 0.42, c.wy + Math.sin(a) * 0.42 * 0.55, '#d9925a', {
        life: 8,
        size: 0.06,
        flicker: 0.25,
        fade: '#6e4326',
        fadeAt: 0.6,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    // The gathering ring: closes inward as the howl takes hold.
    const g = cl(t / 0.4);
    ctx.save();
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.4, sc * 0.062);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * (0.7 - 0.3 * g), sc * (0.42 - 0.18 * g) * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.save();
    ctx.lineCap = 'round';
    // The breath-column, climbing.
    const climb = cl(t / 0.3);
    const top = py - sc * (0.9 + 1.3 * climb);
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2.8, sc * 0.075);
    ctx.beginPath();
    ctx.moveTo(px, py - sc * 0.9);
    ctx.lineTo(px, top);
    ctx.stroke();
    // Three song-rings breaking off the crest, ascending.
    for (let k = 0; k < 3; k++) {
      const f = cl((t - 0.25 - k * 0.14) / 0.4);
      if (f <= 0 || f >= 1) continue;
      ctx.globalAlpha = (1 - f) * 0.8 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.4, sc * 0.062);
      ctx.beginPath();
      ctx.ellipse(px, top - sc * f * 0.8, sc * (0.16 + f * 0.42), sc * (0.07 + f * 0.17), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The answer: motes raining back down onto the spine.
    const rand = srand(c.seed ^ 0x40e2);
    ctx.fillStyle = st.spark;
    for (let k = 0; k < 5; k++) {
      const f = cl((t - 0.45 - k * 0.06) / 0.35);
      if (f <= 0 || f >= 1) continue;
      const ox = (rand() - 0.5) * sc * 0.5;
      ctx.globalAlpha = Math.sin(f * Math.PI) * 0.85 * fade;
      ctx.fillRect(px + ox - sc * 0.022, top + (py - sc * 0.55 - top) * f, sc * 0.045, sc * 0.045);
    }
    if (t > 0.5 && t < 0.8) c.glow(c.wx, c.wy, 0.7, 0.25 * fade);
    ctx.restore();
  },
};

/**
 * WINTER'S JAW — "the arc IS a mouth."
 * The whole sweep is a jaw: an upper and a lower row of frost teeth
 * close across the crescent from hinge to tip, meeting in a bitten
 * seam. Cold breath drifts off the closed line. A bitten crescent
 * of rime lasts.
 */
const winters_jaw: AbilitySig = {
  spawn(c) {
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.6;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.6;
    frost.deployments.bloom!(asMatter(c), hx, hy, { scale: 0.5 });
    for (let k = 0; k < 3; k++) {
      const a = c.dir + (k - 1) * 0.45;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.62, c.wy + Math.sin(a) * c.radius * 0.62 * 0.55, '#c8e8f4', {
        life: 8,
        size: 0.065,
        fade: '#48626e',
        fadeAt: 0.55,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const closeF = cl(t / 0.3);
    const half = 0.55;
    ctx.save();
    ctx.lineCap = 'round';
    // Two tooth-rows converging on the crescent line.
    for (const side of [-1, 1] as const) {
      const off = (1 - closeF) * sc * 0.2 * side;
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = side < 0 ? st.core : st.mid;
      ctx.lineWidth = Math.max(3.0, sc * 0.08);
      ctx.beginPath();
      ctx.ellipse(
        px,
        py + off,
        rPx * 0.82,
        rPx * 0.82 * squash,
        0,
        c.dir - half,
        c.dir + half,
      );
      ctx.stroke();
      // Teeth on each row, pointing at the seam.
      ctx.fillStyle = ctx.strokeStyle;
      for (let k = 0; k < 4; k++) {
        const a = c.dir - half + ((k + 0.5) / 4) * half * 2;
        const bx = px + Math.cos(a) * rPx * 0.82;
        const by = py + Math.sin(a) * rPx * 0.82 * squash + off;
        ctx.beginPath();
        ctx.moveTo(bx - sc * 0.055, by);
        ctx.lineTo(bx + sc * 0.055, by);
        ctx.lineTo(bx, by - side * sc * 0.16);
        ctx.closePath();
        ctx.fill();
      }
    }
    // The bitten seam glints once the jaw is shut.
    if (closeF >= 1 && t < 0.6) {
      const k = 1 - (t - 0.3) / 0.3;
      ctx.globalAlpha = 0.8 * cl(k) * fade;
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(2.2, sc * 0.055);
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.82, rPx * 0.82 * squash, 0, c.dir - half, c.dir + half);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    // Cold breath drifting off the shut jaw.
    if (crossed(c, 500, 0.45)) {
      const hx = c.wx + Math.cos(c.dir) * c.radius * 0.6;
      const hy = c.wy + Math.sin(c.dir) * c.radius * 0.6;
      frost.deployments.fog!(asMatter(c), hx, hy, { scale: 0.3 });
    }
  },
};

/**
 * THE COWING SNARL — the signature: "orders, remembered."
 * One great fang-glyph stands at center. From it, suppression
 * wedges press outward and FLATTEN as they travel — arriving at the
 * rim as low, wide bars. Where each bar lands, a small bowed-head
 * arc dips under it: the lesser hearts lowering. Low shadow pools
 * at the snarl's feet; the fang's shadow lasts.
 */
const the_cowing_snarl: AbilitySig = {
  spawn(c) {
    shadow.deployments.bloom!(asMatter(c), c.wx, c.wy, { scale: 0.4 });
    lay(c, c.wx + 0.08, c.wy + 0.14, '#485564', { life: 8, size: 0.08, fade: '#242c38', fadeAt: 0.5 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.78 ? 1 : (1 - t) / 0.22;
    const out = cl(t / 0.5);
    ctx.save();
    ctx.lineCap = 'butt';
    // The suppression wedges: tall near the fang, FLAT at the rim.
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.3;
      const r = rPx * out;
      const tallness = 1 - out * 0.75;
      ctx.globalAlpha = 0.75 * (1 - out * 0.35) * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.8, sc * (0.04 + 0.06 * tallness));
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1, r), a - 0.3 * (1 + out), a + 0.3 * (1 + out));
      ctx.stroke();
    }
    // The bowed heads at the rim: small arcs dipping under.
    if (out > 0.85) {
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2.6, sc * 0.068);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + 0.3;
        const bx = px + Math.cos(a) * (rPx + sc * 0.16);
        const by = py + Math.sin(a) * (rPx + sc * 0.16) * squash;
        ctx.globalAlpha = 0.85 * fade;
        ctx.beginPath();
        ctx.ellipse(bx, by, sc * 0.11, sc * 0.07 * squash, 0, Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const fade = t < 0.78 ? 1 : (1 - t) / 0.22;
    const rise = cl(t / 0.25);
    ctx.save();
    // THE FANG: one great curved canine standing over the snarl.
    ctx.globalAlpha = 0.94 * fade;
    ctx.fillStyle = st.core;
    const h = sc * 0.95 * rise;
    ctx.beginPath();
    ctx.moveTo(px - sc * 0.13, py - sc * 0.7 - h * 0.0);
    ctx.quadraticCurveTo(px - sc * 0.2, py - sc * 0.7 - h * 0.6, px - sc * 0.02, py - sc * 0.7 - h);
    ctx.quadraticCurveTo(px + sc * 0.08, py - sc * 0.7 - h * 0.55, px + sc * 0.13, py - sc * 0.7);
    ctx.closePath();
    ctx.fill();
    // Its shaded root.
    ctx.fillStyle = st.deep;
    ctx.fillRect(px - sc * 0.15, py - sc * 0.74, sc * 0.3, Math.max(2, sc * 0.06));
    if (rise >= 1 && t < 0.5) c.glow(c.wx, c.wy, 0.9, 0.25 * fade);
    ctx.restore();
  },
};

// ======================================================= THE CATS

/**
 * RAKING FLURRY — "four opinions, delivered."
 * Each beat is one rake: three parallel claw-lines slashed through
 * the mark at that beat's own tilt (each paw turns a little
 * further), with true blood on the later beats. The rakes'
 * crossings accumulate on the ground — the world keeps the scar.
 */
const raking_flurry: AbilitySig = {
  spawn(c) {
    const beat = c.seed % 3;
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.65;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.65;
    if (beat > 0) blood.deployments.spatter!(asMatter(c), hx, hy, { scale: 0.3 });
    const tilt = c.dir + (beat - 1) * 0.5;
    for (let k = 0; k < 2; k++) {
      lay(c, hx + Math.cos(tilt) * (k - 0.5) * 0.3, hy + Math.sin(tilt) * (k - 0.5) * 0.3 * 0.55, '#5e2c20', {
        life: 7,
        size: 0.06,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const hx = px + Math.cos(c.dir) * c.rPx * 0.65;
    const hy = py + Math.sin(c.dir) * c.rPx * 0.65 * squash;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const beat = c.seed % 3;
    const tilt = c.dir + (beat - 1) * 0.5 + Math.PI / 2;
    const slash = cl(t / 0.22);
    ctx.save();
    ctx.lineCap = 'round';
    // Three claw-lines, this beat's tilt, drawn tip-to-tail fast.
    for (let k = 0; k < 3; k++) {
      const off = (k - 1) * sc * 0.16;
      const ox = Math.cos(tilt + Math.PI / 2) * off;
      const oy = Math.sin(tilt + Math.PI / 2) * off * squash;
      ctx.globalAlpha = (k === 1 ? 0.95 : 0.8) * fade;
      ctx.strokeStyle = k === 1 ? st.core : st.mid;
      ctx.lineWidth = Math.max(1.8, sc * (k === 1 ? 0.05 : 0.04));
      ctx.beginPath();
      ctx.moveTo(hx - Math.cos(tilt) * sc * 0.45 * slash + ox, hy - Math.sin(tilt) * sc * 0.45 * slash * squash + oy);
      ctx.lineTo(hx + Math.cos(tilt) * sc * 0.45 * slash + ox, hy + Math.sin(tilt) * sc * 0.45 * slash * squash + oy);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, squash } = c;
    // The paw's glint at the top of this beat's swing, briefly.
    if (t > 0.3) return;
    const k = 1 - t / 0.3;
    const hx = px + Math.cos(c.dir) * c.rPx * 0.65;
    const hy = py + Math.sin(c.dir) * c.rPx * 0.65 * squash;
    ctx.save();
    ctx.globalAlpha = 0.85 * k;
    ctx.fillStyle = st.spark;
    burstStarPath(ctx, hx, hy - sc * 0.6, sc * 0.12, sc * 0.05, 3, 0.6, 1);
    ctx.fill();
    ctx.restore();
  },
};

/**
 * THE WINTER STALK — the signature: "three bounds, each colder."
 * The corridor resolves into three hop-arcs drawn in the air, and
 * each landing stamps a TRUE frost paw-print on the ground —
 * small, smaller, largest-last — with a frost bloom on the final
 * landing. The three prints last, fading tail-to-head: the walk
 * you can read back.
 */
const the_winter_stalk: AbilitySig = {
  spawn(c) {
    frost.deployments.bloom!(asMatter(c), c.wx2, c.wy2, { scale: 0.5 });
    const dx = c.wx2 - c.wx;
    const dy = c.wy2 - c.wy;
    for (let k = 1; k <= 3; k++) {
      const f = k / 3;
      lay(c, c.wx + dx * f, c.wy + dy * f, '#c8e8f4', {
        life: 5 + k * 1.5,
        size: k === 3 ? 0.08 : 0.065,
        fade: '#4e6270',
        fadeAt: 0.55,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const fade = t < 0.78 ? 1 : (1 - t) / 0.22;
    ctx.save();
    // The landings: frost prints stamped as each bound arrives.
    for (let k = 1; k <= 3; k++) {
      const at = 0.18 + (k - 1) * 0.24;
      const on = cl((t - at) / 0.12);
      if (on <= 0) continue;
      const f = k / 3;
      const bx = px + (px2 - px) * f;
      const by = py + (py2 - py) * f;
      pawPrint(c, bx, by, sc * (0.05 + k * 0.012) * on, k === 3 ? st.core : st.mid, 0.8 * fade);
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const fade = t < 0.78 ? 1 : (1 - t) / 0.22;
    ctx.save();
    ctx.lineCap = 'round';
    // The three hop-arcs, drawn as the stalk crosses them.
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(2.4, sc * 0.062);
    for (let k = 0; k < 3; k++) {
      const a0 = k / 3;
      const a1 = (k + 1) / 3;
      const seg = cl((t - 0.1 - k * 0.24) / 0.2);
      if (seg <= 0) continue;
      ctx.globalAlpha = 0.8 * Math.min(1, 2 - seg * 1.2) * fade;
      ctx.beginPath();
      const steps = 7;
      for (let s = 0; s <= steps * seg; s++) {
        const f = a0 + ((a1 - a0) * s) / steps;
        const local = (f - a0) / (a1 - a0);
        const bx = px + (px2 - px) * f;
        const by = py + (py2 - py) * f - Math.sin(local * Math.PI) * sc * 0.75;
        if (s === 0) ctx.moveTo(bx, by);
        else ctx.lineTo(bx, by);
      }
      ctx.stroke();
    }
    // The stalker's cold glint riding the current bound.
    const f = cl(t / 0.82);
    if (f < 1) {
      const bx = px + (px2 - px) * f;
      const seg = f * 3 - Math.floor(f * 3);
      const by = py + (py2 - py) * f - Math.sin(seg * Math.PI) * sc * 0.75;
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = st.core;
      burstStarPath(ctx, bx, by, sc * 0.11, sc * 0.045, 4, 0.5, 1);
      ctx.fill();
    }
    ctx.restore();
  },
};

// ======================================================= THE BEAR

/**
 * MAUL — "the whole argument."
 * One immense paw-arc swats THROUGH the crescent — the follow-
 * through keeps going past the mark and dims — while five claw
 * furrows fan from the strike, the center one gushing true. The
 * five-line scar lasts: the bear signs its work.
 */
const maul: AbilitySig = {
  spawn(c) {
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.6;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.6;
    blood.deployments.gush!(asMatter(c), hx, hy, { scale: 0.5, dir: c.dir });
    dust.deployments.kick!(asMatter(c), hx, hy, { scale: 0.4 });
    for (let k = 0; k < 5; k++) {
      const a = c.dir + (k - 2) * 0.28;
      lay(c, hx + Math.cos(a) * 0.3, hy + Math.sin(a) * 0.3 * 0.55, k === 2 ? '#7a2c1e' : '#44311f', {
        life: 8.5,
        size: k === 2 ? 0.085 : 0.065,
        fade: '#2a1a10',
        fadeAt: 0.55,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const hx = px + Math.cos(c.dir) * c.rPx * 0.6;
    const hy = py + Math.sin(c.dir) * c.rPx * 0.6 * squash;
    const open = cl((t - 0.18) / 0.25);
    if (open <= 0) return;
    const fade = t < 0.78 ? 1 : (1 - t) / 0.22;
    ctx.save();
    ctx.lineCap = 'round';
    // The five furrows fanning from the strike.
    for (let k = 0; k < 5; k++) {
      const a = c.dir + (k - 2) * 0.28;
      ctx.globalAlpha = (k === 2 ? 0.95 : 0.75) * fade;
      ctx.strokeStyle = k === 2 ? st.core : st.deep;
      ctx.lineWidth = Math.max(1.8, sc * (k === 2 ? 0.055 : 0.04));
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(
        hx + Math.cos(a) * sc * (0.44 + (k === 2 ? 0.28 : 0.12)) * open,
        hy + Math.sin(a) * sc * (0.44 + (k === 2 ? 0.28 : 0.12)) * open * squash,
      );
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    // The swat: a thick arc that KEEPS GOING — full alpha through
    // the crescent, then the follow-through past it at half.
    const swing = cl(t / 0.3);
    const half = 0.5;
    const a0 = c.dir - half;
    const reachA = a0 + half * 2.6 * swing;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(4.2, sc * 0.12);
    // Main crescent.
    ctx.globalAlpha = 0.92 * fade;
    ctx.beginPath();
    ctx.ellipse(px, py - sc * 0.35, rPx * 0.8, rPx * 0.55 * squash, 0, a0, Math.min(reachA, a0 + half * 2));
    ctx.stroke();
    // The follow-through, dimmer, past the mark.
    if (reachA > a0 + half * 2) {
      ctx.globalAlpha = 0.55 * fade;
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.35, rPx * 0.8, rPx * 0.55 * squash, 0, a0 + half * 2, reachA);
      ctx.stroke();
    }
    // The paw at the swing's head, claws leading.
    if (t < 0.4) {
      const hx2 = px + Math.cos(reachA) * rPx * 0.8;
      const hy2 = py - sc * 0.35 + Math.sin(reachA) * rPx * 0.55 * squash;
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = st.core;
      for (let k = 0; k < 3; k++) {
        const ca = reachA + Math.PI / 2 + (k - 1) * 0.3;
        ctx.beginPath();
        ctx.moveTo(hx2 - Math.cos(ca) * sc * 0.05, hy2 - Math.sin(ca) * sc * 0.05);
        ctx.lineTo(hx2 + Math.cos(ca) * sc * 0.14, hy2 + Math.sin(ca) * sc * 0.14);
        ctx.lineTo(hx2 + Math.cos(ca + 0.35) * sc * 0.05, hy2 + Math.sin(ca + 0.35) * sc * 0.05);
        ctx.closePath();
        ctx.fill();
      }
      c.glow(c.wx + Math.cos(c.dir) * c.radius * 0.6, c.wy + Math.sin(c.dir) * c.radius * 0.6, 0.7, 0.3 * fade);
    }
    ctx.restore();
  },
};

/**
 * THE CHARGE — "a wall, arriving."
 * The corridor fills with a low rolling shoulder-mass — a dark
 * hill moving, not a beast drawn — with dust skirting both flanks
 * and a thrown-back wedge at the arrival. Skid-marks last where it
 * stopped.
 */
const the_charge: AbilitySig = {
  spawn(c) {
    const a = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    dust.deployments.billow!(asMatter(c), c.wx, c.wy, { scale: 0.55, dir: a });
    dust.deployments.slam!(asMatter(c), c.wx2, c.wy2, { scale: 0.5 });
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    for (const s of [-1, 1] as const) {
      lay(c, c.wx2 - Math.cos(a) * 0.3 + nx * 0.12 * s, c.wy2 - Math.sin(a) * 0.3 + ny * 0.12 * s * 0.55, '#52402c', {
        life: 8,
        size: 0.07,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    // The stop: two skid lines driven into the ground at arrival.
    const stop = cl((t - 0.45) / 0.2);
    if (stop <= 0) return;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    const a = Math.atan2(py2 - c.py, px2 - c.px);
    const nx = -Math.sin(a) * sc * 0.12;
    const ny = Math.cos(a) * sc * 0.12 * squash;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(3.2, sc * 0.085);
    for (const s of [-1, 1] as const) {
      ctx.globalAlpha = 0.8 * stop * fade;
      ctx.beginPath();
      ctx.moveTo(px2 - Math.cos(a) * sc * 0.6 * stop + nx * s, py2 - Math.sin(a) * sc * 0.6 * stop * squash + ny * s);
      ctx.lineTo(px2 + nx * s, py2 + ny * s);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const fade = t < 0.65 ? 1 : (1 - t) / 0.35;
    const run = cl(t / 0.45);
    const bx = px + (px2 - px) * run;
    const by = py + (py2 - py) * run;
    const a = Math.atan2(py2 - py, px2 - px);
    ctx.save();
    // THE WALL: a low dark hill-mass rolling down the corridor.
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.ellipse(bx, by - sc * 0.45, sc * 0.62, sc * 0.48, a, Math.PI, Math.PI * 2);
    ctx.fill();
    // Its lit shoulder-line.
    ctx.strokeStyle = st.mid;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(3.0, sc * 0.08);
    ctx.beginPath();
    ctx.ellipse(bx, by - sc * 0.45, sc * 0.62, sc * 0.48, a, Math.PI * 1.1, Math.PI * 1.7);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * STAND TALL — the signature: "the fight reconsiders."
 * The bear's whole height, told as a rising outline-column that
 * plants back down in two deep forepaw prints. While it stands,
 * awe-hooks at the radius turn every eye inward. The prints last
 * nine seconds — where the wall stood is written in the ground.
 */
const stand_tall: AbilitySig = {
  spawn(c) {
    dust.deployments.skirt!(asMatter(c), c.wx, c.wy, { scale: 0.5 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    const out = cl(t / 0.4);
    ctx.save();
    // The awe ring + inward hooks (the taunt's geometry).
    ctx.globalAlpha = 0.4 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.4, sc * 0.062);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * out, rPx * out * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (out > 0.85) {
      ctx.fillStyle = st.core;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + 0.5;
        const hx = px + Math.cos(a) * rPx;
        const hy = py + Math.sin(a) * rPx * squash;
        ctx.globalAlpha = 0.85 * fade;
        ctx.beginPath();
        ctx.moveTo(hx - Math.cos(a) * sc * 0.15, hy - Math.sin(a) * sc * 0.15 * squash);
        ctx.lineTo(hx + Math.cos(a + 2.3) * sc * 0.08, hy + Math.sin(a + 2.3) * sc * 0.08 * squash);
        ctx.lineTo(hx + Math.cos(a - 2.3) * sc * 0.08, hy + Math.sin(a - 2.3) * sc * 0.08 * squash);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    // The plant: two deep prints stamped as the stand comes down.
    if (crossed(c, 700, 0.62)) {
      dust.deployments.slam!(asMatter(c), c.wx, c.wy, { scale: 0.45 });
      lay(c, c.wx - 0.22, c.wy + 0.12, '#3a2f20', { life: 9, size: 0.08 });
      lay(c, c.wx + 0.22, c.wy + 0.12, '#3a2f20', { life: 9, size: 0.08 });
    }
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    // The rise (0..0.5) and the come-down (0.5..0.7).
    const up = t < 0.5 ? cl(t / 0.3) : cl(1 - (t - 0.5) / 0.2);
    if (up <= 0) return;
    const h = sc * 1.7 * up;
    ctx.save();
    ctx.lineCap = 'round';
    // The standing outline: a broad column with a head-hump, drawn
    // as edges only — the bear is a silhouette of intent, not a rig.
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3.4, sc * 0.09);
    ctx.beginPath();
    ctx.moveTo(px - sc * 0.34, py);
    ctx.lineTo(px - sc * 0.28, py - h * 0.8);
    ctx.quadraticCurveTo(px - sc * 0.18, py - h * 1.05, px + sc * 0.04, py - h);
    ctx.quadraticCurveTo(px + sc * 0.22, py - h * 0.95, px + sc * 0.26, py - h * 0.7);
    ctx.lineTo(px + sc * 0.32, py);
    ctx.stroke();
    // The raised forepaw hooks at the crest.
    if (up > 0.9) {
      ctx.fillStyle = st.core;
      ctx.globalAlpha = 0.9 * fade;
      for (const s of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(px + s * sc * 0.3, py - h * 0.75);
        ctx.lineTo(px + s * sc * 0.44, py - h * 0.82);
        ctx.lineTo(px + s * sc * 0.36, py - h * 0.68);
        ctx.closePath();
        ctx.fill();
      }
      c.glow(c.wx, c.wy, 1, 0.3 * fade);
    }
    ctx.restore();
  },
};

// ================================================== THE GREAT OWL

/**
 * TALON STOOP — "silence, with claws on the end."
 * The stoop line comes down from TWO tiles of sky, steepening as it
 * falls; a wing-flare brake snaps open just before the strike;
 * three talon-points stamp the arrival. One downy feather — the
 * school's own matter — spirals down after, seconds late, and
 * settles. The talon points last.
 */
const talon_stoop: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x0431);
    // The late feather: slow fall, side-drift, settles on the world.
    c.particles.burst(c.wx2, c.wy2, 1, ['#f4f0e4'], {
      speed: 0.2 + rand() * 0.2,
      life: 6,
      size: 0.055,
      dir: rand() * Math.PI * 2,
      spread: 0.3,
      z: 1.6,
      vz: -0.2,
      zg: 0.55,
      land: 'settle',
      layer: 'world',
      shadow: 0.25,
    });
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.5;
      lay(c, c.wx2 + Math.cos(a) * 0.12, c.wy2 + Math.sin(a) * 0.12 * 0.55, '#6e6a5e', {
        life: 7,
        size: 0.06,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px2, py2 } = c;
    const land = cl((t - 0.4) / 0.15);
    if (land <= 0) return;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.save();
    // Three talon stamps around the strike point.
    ctx.fillStyle = st.deep;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.5;
      ctx.globalAlpha = 0.85 * land * fade;
      ctx.beginPath();
      ctx.ellipse(
        px2 + Math.cos(a) * sc * 0.12,
        py2 + Math.sin(a) * sc * 0.12 * squash,
        sc * 0.035,
        sc * 0.07,
        a,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const drop = cl(t / 0.4);
    ctx.save();
    ctx.lineCap = 'round';
    // The stoop line: steepening from altitude to the strike.
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.6, sc * 0.068);
    ctx.beginPath();
    const steps = 8;
    for (let s = 0; s <= steps * drop; s++) {
      const f = s / steps;
      const bx = px + (px2 - px) * f;
      const by = py - sc * 2.1 * (1 - f) * (1 - f) + (py2 - py) * f;
      if (s === 0) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);
    }
    ctx.stroke();
    // The brake: a wing-flare V snapping open just before landing.
    if (drop > 0.8 && t < 0.55) {
      const k = 1 - (t - 0.4) / 0.15;
      const a = Math.atan2(py2 - py, px2 - px);
      ctx.globalAlpha = 0.9 * cl(k) * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(3.2, sc * 0.085);
      for (const s of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(px2, py2 - sc * 0.5);
        ctx.quadraticCurveTo(
          px2 + Math.cos(a + s * 2.2) * sc * 0.5,
          py2 - sc * 0.6 + Math.sin(a + s * 2.2) * sc * 0.2,
          px2 + Math.cos(a + s * 2.5) * sc * 0.7,
          py2 - sc * 0.35,
        );
        ctx.stroke();
      }
      c.glow(c.wx2, c.wy2, 0.6, 0.3 * cl(k));
    }
    ctx.restore();
  },
};

/**
 * HUSHING WING — "two slow beats."
 * Each pulse is one wingbeat: a broad soft-edged pressure crescent
 * rolls out low and flat, and the air behind it goes QUIET — a
 * dimmer counter-crescent follows where sound used to be. Frost
 * fog breathes at the wing root. A rime feather-edge lasts.
 */
const hushing_wing: AbilitySig = {
  spawn(c) {
    frost.deployments.fog!(asMatter(c), c.wx, c.wy, { scale: 0.4 });
    const hash = srand(posSeed(c, 0x4059));
    const base = hash() * Math.PI * 2;
    const wave = c.seed % 2;
    for (let k = 0; k < 3; k++) {
      const a = base + wave * Math.PI + (k - 1) * 0.4;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.7, c.wy + Math.sin(a) * c.radius * 0.7 * 0.55, '#d8ecf8', {
        life: 7.5,
        size: 0.045,
        fade: '#405a6e',
        fadeAt: 0.55,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const hash = srand(posSeed(c, 0x4059));
    const base = hash() * Math.PI * 2;
    const wave = c.seed % 2;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const out = cl(t / 0.55);
    const a0 = base + wave * Math.PI;
    ctx.save();
    ctx.lineCap = 'round';
    // The pressure crescent rolling out on this beat's side.
    ctx.globalAlpha = 0.85 * (1 - out * 0.4) * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3.4, sc * 0.092);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * out, rPx * out * squash, 0, a0 - 0.9, a0 + 0.9);
    ctx.stroke();
    // The hush behind it: the dim counter-crescent where sound was.
    const hush = cl((t - 0.2) / 0.5);
    if (hush > 0) {
      ctx.globalAlpha = 0.4 * hush * (1 - out * 0.3) * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2.6, sc * 0.07);
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * out * 0.7, rPx * out * 0.7 * squash, 0, a0 - 0.7, a0 + 0.7);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    // The wing itself: one slow barb-edged arc over the owl, the
    // first half of the beat only.
    if (t > 0.5) return;
    const k = Math.sin((t / 0.5) * Math.PI);
    const hash = srand(posSeed(c, 0x4059));
    const base = hash() * Math.PI * 2;
    const wave = c.seed % 2;
    const flip = wave === 0 ? 1 : -1;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.85 * k;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(3.0, sc * 0.08);
    ctx.beginPath();
    ctx.ellipse(px, py - sc * 1.1, sc * 0.62, sc * 0.3, base * 0 + flip * 0.25, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    // Four barb ticks along its trailing edge.
    ctx.lineWidth = Math.max(2.0, sc * 0.05);
    for (let b = 0; b < 4; b++) {
      const f = 0.15 + b * 0.23;
      const a = Math.PI * (1.05 + 0.9 * f);
      const bx = px + Math.cos(a) * sc * 0.62;
      const by = py - sc * 1.1 + Math.sin(a) * sc * 0.3;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + sc * 0.02, by + sc * 0.12);
      ctx.stroke();
    }
    ctx.restore();
  },
};

/**
 * PREEN — "put right, feather by feather."
 * The wing fans open as ruffled barbs — each line jittered by the
 * cast's own seed — and the read is the ALIGNMENT: barb by barb
 * they comb straight, the disorder visibly leaving. Two loosed
 * feathers drop true and settle. One preened glint closes it.
 */
const preen: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x9433);
    for (let k = 0; k < 2; k++) {
      c.particles.burst(c.wx + (rand() - 0.5) * 0.4, c.wy, 1, ['#f4f0e4', '#e8e0d0'], {
        speed: 0.15,
        life: 5,
        size: 0.05,
        dir: rand() * Math.PI * 2,
        spread: 0.3,
        z: 1 + rand() * 0.4,
        vz: -0.1,
        zg: 0.5,
        land: 'settle',
        layer: 'world',
        shadow: 0.2,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    // A soft self-ring closing under the owl — the working's floor.
    if (t > 0.55) return;
    const k = Math.sin((t / 0.55) * Math.PI);
    ctx.save();
    ctx.globalAlpha = 0.35 * k;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.2, sc * 0.058);
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.5, sc * 0.3 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    const comb = cl(t / 0.6);
    const rand = srand(c.seed ^ 0x9434);
    ctx.save();
    ctx.lineCap = 'round';
    // The fan: seven barbs from ruffled (seed jitter) to combed
    // (their true stations) — disorder leaving, one line at a time.
    const cy = py - sc * 0.9;
    for (let k = 0; k < 7; k++) {
      const trueA = -Math.PI * 0.75 + (k / 6) * Math.PI * 0.5;
      const jitter = (rand() - 0.5) * 0.5;
      // Barbs comb in order: barb k straightens on its own beat.
      const own = cl((comb - k * 0.09) / 0.25);
      const a = trueA + jitter * (1 - own);
      ctx.globalAlpha = (0.55 + 0.4 * own) * fade;
      ctx.strokeStyle = own >= 1 ? st.core : st.mid;
      ctx.lineWidth = Math.max(2.4, sc * 0.062);
      ctx.beginPath();
      ctx.moveTo(px, cy);
      ctx.lineTo(px + Math.cos(a) * sc * 0.62, cy + Math.sin(a) * sc * 0.62);
      ctx.stroke();
    }
    // The preened glint when the last barb seats.
    if (comb > 0.9 && t < 0.9) {
      const k = 1 - Math.abs((t - 0.75) / 0.15);
      ctx.globalAlpha = 0.9 * cl(k);
      ctx.fillStyle = st.spark;
      burstStarPath(ctx, px + sc * 0.4, cy - sc * 0.25, sc * 0.1, sc * 0.04, 4, 0.5, 1);
      ctx.fill();
    }
    ctx.restore();
  },
};

/**
 * THE WHITE HUSH — the signature: "winter files in under the wings."
 * A field the wire's own ticks long: inside the radius ONLY, snow
 * falls — white grains born at altitude that settle and STAY —
 * while the rim wears a feather-edge of barb ticks and the hush
 * reads as inward-pointing sound wedges dying at the edge. When the
 * field ends, the settled snow remains a while: the ground stays
 * white where the wings were.
 */
const the_white_hush: AbilitySig = {
  spawn(c) {
    // The door opens: cold fog under the spread wings, and the first
    // flakes already on their way down.
    frost.deployments.fog!(asMatter(c), c.wx, c.wy, { scale: 0.5 });
    const rand = srand(c.seed ^ 0x50f6);
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * c.radius * 0.8;
      c.particles.burst(c.wx + Math.cos(a) * r, c.wy + Math.sin(a) * r * 0.55, 1, ['#ffffff', '#e8f2fa'], {
        speed: 0.06,
        life: 7,
        size: 0.045,
        gravity: 0,
        z: 1.4 + rand() * 0.8,
        vz: -0.25,
        zg: 0.28,
        land: 'settle',
        layer: 'world',
        shadow: 0.12,
        fade: '#c8dce8',
        fadeAt: 0.6,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const lifeMs = (c.ticks ?? 90) * 50;
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    const open = cl((t * lifeMs) / 400);
    ctx.save();
    // The feather-edge rim: barb ticks around the true radius.
    ctx.globalAlpha = 0.55 * open * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.2, sc * 0.058);
    const hash = srand(posSeed(c, 0x0405));
    const base = hash() * Math.PI;
    for (let k = 0; k < 12; k++) {
      const a = base + (k / 12) * Math.PI * 2;
      const bx = px + Math.cos(a) * rPx * open;
      const by = py + Math.sin(a) * rPx * open * squash;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a + 1.9) * sc * 0.12, by + Math.sin(a + 1.9) * sc * 0.12 * squash);
      ctx.stroke();
    }
    // The hush: four inward wedges, dying as they enter.
    const breathe = (Math.sin(c.now / 900) + 1) / 2;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2.6, sc * 0.068);
    for (let k = 0; k < 4; k++) {
      const a = base + (k / 4) * Math.PI * 2 + Math.PI / 4;
      const r = rPx * (0.85 - breathe * 0.2);
      ctx.globalAlpha = 0.35 * (1 - breathe * 0.5) * open * fade;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1, r), a - 0.18, a + 0.18);
      ctx.stroke();
    }
    ctx.restore();
    // THE SNOW: born on a slow clock for the field's whole life,
    // each flake settling into the world and staying past the end.
    if (c.ticks !== undefined && c.t < 0.85) {
      const beat = Math.floor(c.age / 260);
      const beatPrev = Math.floor((c.age - c.frameDt * 1000) / 260);
      if (beat !== beatPrev) {
        const rand = srand((c.seed ^ 0x50f7) + beat * 97);
        for (let k = 0; k < 2; k++) {
          const a = rand() * Math.PI * 2;
          const r = Math.sqrt(rand()) * c.radius * 0.9;
          c.particles.burst(c.wx + Math.cos(a) * r, c.wy + Math.sin(a) * r * 0.55, 1, ['#ffffff', '#e8f2fa'], {
            speed: 0.06,
            life: 7,
            size: 0.045,
            gravity: 0,
            z: 1.6 + rand() * 0.6,
            vz: -0.25,
            zg: 0.28,
            land: 'settle',
            layer: 'world',
            shadow: 0.12,
            fade: '#c8dce8',
            fadeAt: 0.6,
          });
        }
      }
    }
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    // The wings: both spread once at the field's opening, then gone
    // — the snow is the art; the owl only holds the door.
    const lifeMs = (c.ticks ?? 90) * 50;
    const openMs = t * lifeMs;
    if (openMs > 900) return;
    const k = Math.sin(cl(openMs / 900) * Math.PI);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.9 * k;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(3.4, sc * 0.09);
    for (const s of [-1, 1] as const) {
      ctx.beginPath();
      ctx.moveTo(px, py - sc * 1.15);
      ctx.quadraticCurveTo(
        px + s * sc * 0.7,
        py - sc * 1.55,
        px + s * sc * 1.15,
        py - sc * 1.05,
      );
      ctx.stroke();
    }
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.2 * k);
    ctx.restore();
  },
};

// ===================================================== THE ADDER

/**
 * VENOM SPIT — "the bite, mailed ahead."
 * The landing: a fang-pair stamps the impact — two curved punctures
 * — and the dose beads out of them, welling downhill. The flight
 * belongs to the projectile body; this signature is the delivery
 * made legible. A stain-pair lasts.
 */
const venom_spit: AbilitySig = {
  spawn(c) {
    venom.deployments.burst!(asMatter(c), c.wx, c.wy, { scale: 0.4 });
    lay(c, c.wx - 0.09, c.wy, '#5c7a2e', { life: 8, size: 0.065, fade: '#3e5220', fadeAt: 0.5 });
    lay(c, c.wx + 0.09, c.wy + 0.04, '#5c7a2e', { life: 8, size: 0.065, fade: '#3e5220', fadeAt: 0.5 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const set = cl(t / 0.18);
    ctx.save();
    ctx.lineCap = 'round';
    // The fang-pair: two curved punctures stamped at the landing.
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2.8, sc * 0.075);
    for (const s of [-1, 1] as const) {
      ctx.beginPath();
      ctx.ellipse(px + s * sc * 0.15, py, sc * 0.12, sc * 0.21 * squash, s * 0.4, Math.PI * 0.2, Math.PI * 0.9 * set + Math.PI * 0.2);
      ctx.stroke();
    }
    // The welling: a slow green pool spreading from the punctures.
    const well = cl((t - 0.25) / 0.5);
    if (well > 0) {
      ctx.globalAlpha = 0.45 * well * fade;
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.ellipse(px, py + sc * 0.08, sc * 0.32 * well, sc * 0.18 * well * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (crossed(c, 600, 0.35)) {
      venom.deployments.drip!(asMatter(c), c.wx, c.wy, { scale: 0.3 });
    }
  },
};

/**
 * COILED STRIKE — "the spring, spent."
 * The corridor is the UNWINDING: a coil of three loops at the start
 * straightens into the strike line loop by loop, the head arriving
 * exactly as the last loop lets go. Venom spits at the arrival.
 * The spent coil's S-track lasts faintly.
 */
const coiled_strike: AbilitySig = {
  spawn(c) {
    venom.deployments.spit!(asMatter(c), c.wx2, c.wy2, { scale: 0.4, dir: Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx) });
    const dx = c.wx2 - c.wx;
    const dy = c.wy2 - c.wy;
    for (let k = 0; k < 3; k++) {
      const f = 0.25 + k * 0.25;
      const s = k % 2 === 0 ? 1 : -1;
      lay(c, c.wx + dx * f - dy * 0.08 * s, c.wy + dy * f + dx * 0.08 * s * 0.55, '#6a7a34', {
        life: 7,
        size: 0.055,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, px2, py2 } = c;
    const fade = t < 0.72 ? 1 : (1 - t) / 0.28;
    const unwind = cl(t / 0.4);
    const a = Math.atan2(py2 - py, px2 - px);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3.0, sc * 0.08);
    ctx.globalAlpha = 0.9 * fade;
    // The path: remaining coil at the tail + straight run to the head.
    const loops = 3 * (1 - unwind);
    ctx.beginPath();
    const steps = 14;
    for (let s = 0; s <= steps; s++) {
      const f = s / steps;
      let bx = px + (px2 - px) * f * unwind;
      let by = py + (py2 - py) * f * unwind;
      // What has not unwound yet wraps the tail as diminishing loops.
      const wave = Math.sin(f * Math.PI * 2 * (1 + loops)) * sc * 0.2 * (1 - unwind) * (1 - f * 0.6);
      bx += -Math.sin(a) * wave;
      by += Math.cos(a) * wave * squash;
      if (s === 0) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);
    }
    ctx.stroke();
    // The head: a wedge arriving with the last loop.
    if (unwind > 0.85) {
      const hx = px + (px2 - px) * unwind;
      const hy = py + (py2 - py) * unwind;
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(a) * sc * 0.3, hy + Math.sin(a) * sc * 0.3 * squash);
      ctx.lineTo(hx + Math.cos(a + 2.4) * sc * 0.18, hy + Math.sin(a + 2.4) * sc * 0.18 * squash);
      ctx.lineTo(hx + Math.cos(a - 2.4) * sc * 0.18, hy + Math.sin(a - 2.4) * sc * 0.18 * squash);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },
};

/**
 * SHED SKIN — "the hurt leaves with the old coat."
 * The mechanic IS the mark: a pale S-line of shed-skin grains slides
 * off the adder BACKWARD and lies where it fell for eight seconds,
 * while the fresh body glints new. Sloughed flecks rise and die —
 * the cleanse leaving. Nothing else; the quiet is the point.
 */
const shed_skin: AbilitySig = {
  spawn(c) {
    const hash = srand(posSeed(c, 0x5ded));
    const a0 = hash() * Math.PI * 2;
    // The shed coat: seven grains laid in an S behind the adder.
    for (let k = 0; k < 7; k++) {
      const f = k / 6;
      const wave = Math.sin(f * Math.PI * 2) * 0.16;
      lay(
        c,
        c.wx - Math.cos(a0) * (0.2 + f * 0.7) - Math.sin(a0) * wave,
        c.wy - Math.sin(a0) * (0.2 + f * 0.7) * 0.55 + Math.cos(a0) * wave * 0.55,
        '#c8c8a0',
        { life: 8, size: k === 0 ? 0.075 : 0.06, fade: '#62624a', fadeAt: 0.6 },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    // The slide: the coat's outline slipping backward, briefly told.
    if (t > 0.5) return;
    const k = Math.sin((t / 0.5) * Math.PI);
    const hash = srand(posSeed(c, 0x5ded));
    const a0 = hash() * Math.PI * 2;
    const slide = cl(t / 0.5) * sc * 0.5;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.6 * k;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.8, sc * 0.075);
    ctx.beginPath();
    const steps = 8;
    for (let s = 0; s <= steps; s++) {
      const f = s / steps;
      const wave = Math.sin(f * Math.PI * 2) * sc * 0.14;
      const bx = px - Math.cos(a0) * (slide + f * sc * 0.6) - Math.sin(a0) * wave;
      const by = py - Math.sin(a0) * (slide + f * sc * 0.6) * squash + Math.cos(a0) * wave * squash;
      if (s === 0) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);
    }
    ctx.stroke();
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    const rand = srand(c.seed ^ 0x5dee);
    ctx.save();
    // Sloughed flecks leaving upward, dying as they go.
    ctx.fillStyle = shade(st.mid, -15);
    for (let k = 0; k < 4; k++) {
      const f = cl((t - k * 0.12) / 0.4);
      if (f <= 0 || f >= 1) continue;
      const ox = (rand() - 0.5) * sc * 0.4;
      ctx.globalAlpha = (1 - f) * 0.6 * fade;
      ctx.fillRect(px + ox, py - sc * (0.4 + f * 0.7), sc * 0.04, sc * 0.04);
    }
    // The fresh glint, late.
    if (t > 0.6) {
      const k = 1 - Math.abs((t - 0.72) / 0.16);
      ctx.globalAlpha = 0.9 * cl(k);
      ctx.fillStyle = st.spark;
      burstStarPath(ctx, px + sc * 0.14, py - sc * 0.5, sc * 0.09, sc * 0.038, 4, 0.5, 1);
      ctx.fill();
    }
    ctx.restore();
  },
};

/**
 * THE LONG FANG — the signature: "the second dose finds the marrow."
 * One long fang drives DOWN through the mark from above; from the
 * puncture, three green vein-lines crawl outward along the ground —
 * the dose traveling — while a small pool wells at the base. On a
 * green mark this is the kill-word, and it looks like one. The
 * puncture and its veins last.
 */
const the_long_fang: AbilitySig = {
  spawn(c) {
    const hx = c.wx + Math.cos(c.dir) * c.radius * 0.65;
    const hy = c.wy + Math.sin(c.dir) * c.radius * 0.65;
    venom.deployments.pool!(asMatter(c), hx, hy, { scale: 0.4 });
    lay(c, hx, hy, '#3e5220', { life: 9, size: 0.085 });
    const rand = srand(c.seed ^ 0x10f6);
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      lay(c, hx + Math.cos(a) * 0.3, hy + Math.sin(a) * 0.3 * 0.55, '#5c7a2e', {
        life: 8,
        size: 0.06,
        fade: '#2c3a16',
        fadeAt: 0.6,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const hx = px + Math.cos(c.dir) * c.rPx * 0.65;
    const hy = py + Math.sin(c.dir) * c.rPx * 0.65 * squash;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    const crawl = cl((t - 0.3) / 0.5);
    ctx.save();
    ctx.lineCap = 'round';
    // The veins: three jagged green lines crawling from the puncture.
    if (crawl > 0) {
      const rand = srand(c.seed ^ 0x10f7);
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.4, sc * 0.062);
      for (let k = 0; k < 3; k++) {
        const a = rand() * Math.PI * 2;
        ctx.globalAlpha = 0.85 * fade;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        let vx = hx;
        let vy = hy;
        for (let s = 1; s <= 3; s++) {
          const f = Math.min(1, crawl * 3 - (s - 1));
          if (f <= 0) break;
          const seg = sc * 0.22 * f;
          vx += Math.cos(a + (rand() - 0.5) * 1.1) * seg;
          vy += Math.sin(a + (rand() - 0.5) * 1.1) * seg * squash;
          ctx.lineTo(vx, vy);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const hx = px + Math.cos(c.dir) * c.rPx * 0.65;
    const hy = py + Math.sin(c.dir) * c.rPx * 0.65 * squash;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    // The fang: driven down from above in the first quarter, then
    // held sunk to the root until the veins take over.
    const drive = cl(t / 0.22);
    const held = t < 0.5;
    if (!held && t > 0.6) return;
    ctx.save();
    ctx.globalAlpha = (held ? 0.95 : 0.95 * (1 - (t - 0.5) / 0.1)) * fade;
    ctx.fillStyle = st.core;
    const top = hy - sc * (1.5 - 1.1 * drive);
    const sunk = hy - sc * 0.1;
    ctx.beginPath();
    ctx.moveTo(hx - sc * 0.14, top - sc * 0.4);
    ctx.quadraticCurveTo(hx - sc * 0.19, (top + sunk) / 2, hx, sunk);
    ctx.quadraticCurveTo(hx + sc * 0.13, (top + sunk) / 2, hx + sc * 0.14, top - sc * 0.4);
    ctx.closePath();
    ctx.fill();
    if (drive >= 1 && t < 0.4) {
      c.glow(c.wx + Math.cos(c.dir) * c.radius * 0.65, c.wy + Math.sin(c.dir) * c.radius * 0.65, 0.55, 0.3 * fade);
    }
    ctx.restore();
  },
};

// ==================================================== THE WEAVER

/**
 * PALE SILK — "wearing its own work."
 * Silk is the school's own matter, hand-spun: wrap-lines spiral UP
 * the spider's body, each turn drawn as it lays, and on the last
 * third the whole wrap TIGHTENS (the guard arriving — the lines
 * pull close and brighten). Two anchor threads run to the ground
 * and last as pale grains.
 */
const pale_silk: AbilitySig = {
  spawn(c) {
    lay(c, c.wx - 0.35, c.wy + 0.18, '#f0f0e6', { life: 8, size: 0.065, fade: '#787868', fadeAt: 0.6 });
    lay(c, c.wx + 0.32, c.wy + 0.2, '#f0f0e6', { life: 8, size: 0.065, fade: '#787868', fadeAt: 0.6 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    // The two anchor threads, taut from body to ground.
    const set = cl((t - 0.15) / 0.2);
    if (set <= 0) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.7 * set * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2.0, sc * 0.05);
    for (const s of [-1, 1] as const) {
      ctx.beginPath();
      ctx.moveTo(px + s * sc * 0.12, py - sc * 0.55);
      ctx.lineTo(px + s * sc * 0.34, py + sc * 0.18 * squash);
      ctx.stroke();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    const spin = cl(t / 0.55);
    const tighten = cl((t - 0.6) / 0.25);
    ctx.save();
    ctx.lineCap = 'round';
    // The wrap: five turns climbing the body, laid bottom-up; the
    // tighten pulls every turn inward and brightens it.
    const turns = 5;
    for (let k = 0; k < turns; k++) {
      const done = cl(spin * turns - k);
      if (done <= 0) continue;
      const fy = py - sc * (0.25 + k * 0.22);
      const w = sc * (0.42 - k * 0.045) * (1 - tighten * 0.18);
      ctx.globalAlpha = (0.55 + 0.35 * tighten) * done * fade;
      ctx.strokeStyle = tighten > 0.5 ? st.core : st.mid;
      ctx.lineWidth = Math.max(2.2, sc * 0.055);
      ctx.beginPath();
      ctx.ellipse(px, fy, w, w * 0.32, 0, 0, Math.PI * 2 * done);
      ctx.stroke();
    }
    // The spinneret's working end, riding the current turn.
    if (spin < 1) {
      const k = spin * turns - Math.floor(spin * turns);
      const cy = py - sc * (0.25 + Math.floor(spin * turns) * 0.22);
      const a = k * Math.PI * 2;
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = st.spark;
      ctx.fillRect(px + Math.cos(a) * sc * 0.42 - sc * 0.025, cy + Math.sin(a) * sc * 0.13 - sc * 0.025, sc * 0.05, sc * 0.05);
    }
    if (tighten >= 1 && t < 0.95) c.glow(c.wx, c.wy, 0.6, 0.2 * fade);
    ctx.restore();
  },
};

/**
 * THE VENOM LATTICE — the signature: "every strand knows."
 * A field the wire's ticks long. The weave lays itself in order —
 * six radials first, then two ring-threads walked around them —
 * held wave-stable by posSeed. Green beads run the finished
 * radials INWARD on a slow clock (the strands reporting), and the
 * knots where threads cross keep venom grains that outlast the
 * web. The lattice's story is at its lines; the floor inside stays
 * dim — a web is mostly air.
 */
const the_venom_lattice: AbilitySig = {
  spawn(c) {
    venom.deployments.cloud!(asMatter(c), c.wx, c.wy, { scale: 0.4 });
    const hash = srand(posSeed(c, 0x1a77));
    const base = hash() * Math.PI;
    // The knots: grains at the six crossings of the outer ring.
    for (let k = 0; k < 6; k++) {
      const a = base + (k / 6) * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.72, c.wy + Math.sin(a) * c.radius * 0.72 * 0.55, '#84c95e', {
        life: 9,
        size: 0.065,
        fade: '#3c6428',
        fadeAt: 0.6,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const lifeMs = (c.ticks ?? 90) * 50;
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    const build = cl((t * lifeMs) / 900);
    const hash = srand(posSeed(c, 0x1a77));
    const base = hash() * Math.PI;
    ctx.save();
    ctx.lineCap = 'round';
    // The six radials, laid in order.
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2.2, sc * 0.055);
    for (let k = 0; k < 6; k++) {
      const done = cl(build * 6 - k);
      if (done <= 0) continue;
      const a = base + (k / 6) * Math.PI * 2;
      ctx.globalAlpha = 0.6 * fade;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a) * rPx * done, py + Math.sin(a) * rPx * done * squash);
      ctx.stroke();
    }
    // The two ring-threads, walked after the radials stand.
    const rings = cl((t * lifeMs - 900) / 700);
    ctx.strokeStyle = st.mid;
    for (const rf of [0.44, 0.72] as const) {
      const done = cl(rings * 2 - (rf > 0.5 ? 1 : 0));
      if (done <= 0) continue;
      ctx.globalAlpha = 0.55 * fade;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * rf, rPx * rf * squash, 0, base, base + Math.PI * 2 * done);
      ctx.stroke();
    }
    // The beads: three runners riding finished radials inward on
    // the field's own slow clock.
    if (rings >= 1) {
      ctx.fillStyle = st.core;
      for (let k = 0; k < 3; k++) {
        const lane = (Math.floor(c.now / 1400) + k * 2) % 6;
        const f = 1 - ((c.now / 1400 + k * 0.33) % 1);
        const a = base + (lane / 6) * Math.PI * 2;
        ctx.globalAlpha = 0.9 * fade;
        ctx.beginPath();
        ctx.arc(px + Math.cos(a) * rPx * f * 0.9, py + Math.sin(a) * rPx * f * 0.9 * squash, Math.max(1.5, sc * 0.045), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    if (crossed(c, lifeMs, 0.06)) c.glow(c.wx, c.wy, c.radius * 0.7, 0.25);
  },
  air(c) {
    // A drip from the weave's heart on a lazy clock — the web is
    // fresh and still wet.
    const lifeMs = (c.ticks ?? 90) * 50;
    const beat = Math.floor(c.age / 1100);
    const beatPrev = Math.floor((c.age - c.frameDt * 1000) / 1100);
    if (beat !== beatPrev && c.t < 0.8 && lifeMs > 2000) {
      venom.deployments.drip!(asMatter(c), c.wx, c.wy, { scale: 0.3 });
    }
  },
};

// ============================== THE STONE COURT AT HEEL
// (THE GAZE TAKES THE LEASH): the basilisk family's five workings.
// The grammar holds — every word is the animal's own act: the tail
// writing its circle, the swamp coughed up, the hide quarried, the
// marsh moving in, the look that makes country out of bodies. Stone
// is the school's own unowned matter here (hand-thrown chips and
// grey washes); venom and dust speak through the library.

/**
 * TAIL SWEEP — "half the animal is tail."
 * The centerpiece is THE SWEPT QUARTER: not a ring but a heavy
 * wedge-sector turning around the body like a clock hand — the tail
 * writing its circle — with dust gouged off the leading edge and
 * true pebbles thrown tangent to the swing. The lasting mark is the
 * furrow arc the tail wrote in the dirt.
 */
const tail_sweep: AbilitySig = {
  spawn(c) {
    dust.deployments.kick!(asMatter(c), c.wx, c.wy, { scale: 0.45 });
    const rand = srand(c.seed ^ 0x7a11);
    const base = rand() * Math.PI * 2;
    // Pebbles off the tip, thrown ALONG the swing (tangent), landing.
    for (let k = 0; k < 4; k++) {
      const a = base + k * 1.4;
      const r = c.radius * (0.75 + rand() * 0.2);
      c.particles.burst(c.wx + Math.cos(a) * r, c.wy + Math.sin(a) * r * 0.55, 1, ['#8a8468', '#5c5844'], {
        speed: 0.9,
        life: 1.6,
        size: 0.05,
        dir: a + Math.PI / 2,
        spread: 0.3,
        z: 0.25,
        vz: 1.2 + rand() * 0.8,
        zg: 8,
        land: 'settle',
        layer: 'world',
        shadow: 0.35,
      });
    }
    // The furrow the tail wrote: grains laid down the swept arc.
    for (let k = 0; k < 5; k++) {
      const a = base + (k / 5) * Math.PI * 1.1;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.8, c.wy + Math.sin(a) * c.radius * 0.8 * 0.55, '#57523f', {
        life: 8,
        size: 0.06,
        fade: '#3a372c',
        fadeAt: 0.55,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    const rand = srand(c.seed ^ 0x7a11);
    const base = rand() * Math.PI * 2;
    // The swing covers a three-quarter turn across the fx life.
    const swing = base + cl(t / 0.7) * Math.PI * 1.5;
    ctx.save();
    // THE SWEPT QUARTER: the wedge from the body to the rim, thick
    // at the rim (the tail is heaviest mid-length), trailing a
    // quarter-turn of swept ground behind its leading edge.
    ctx.globalAlpha = 0.5 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.ellipse(px, py, rPx, rPx * squash, 0, swing - 0.9, swing);
    ctx.closePath();
    ctx.fill();
    // The leading edge: the tail itself as a hard bright spoke with
    // a whip-taper (WEIGHT PASS: floors one band up on a short life).
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(3.2, sc * 0.085);
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(swing) * rPx * 0.25, py + Math.sin(swing) * rPx * 0.25 * squash);
    ctx.lineTo(px + Math.cos(swing) * rPx, py + Math.sin(swing) * rPx * squash);
    ctx.stroke();
    // The keel chips riding the spoke: three saw teeth.
    ctx.fillStyle = st.mid;
    for (const f of [0.45, 0.65, 0.85] as const) {
      const hx = px + Math.cos(swing) * rPx * f;
      const hy = py + Math.sin(swing) * rPx * f * squash;
      ctx.beginPath();
      ctx.moveTo(hx - sc * 0.045, hy);
      ctx.lineTo(hx, hy - sc * 0.09 * squash);
      ctx.lineTo(hx + sc * 0.045, hy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // Dust gouges off the leading edge as it comes around.
    if (crossed(c, 680, 0.3) || crossed(c, 680, 0.6)) {
      dust.deployments.gouge!(asMatter(c), c.wx + Math.cos(swing) * c.radius * 0.8, c.wy + Math.sin(swing) * c.radius * 0.8 * 0.55, { scale: 0.4, dir: swing + Math.PI / 2 });
    }
  },
};

/**
 * MIRE SPIT, at heel — "the rope, arriving."
 * The wild spit keeps its verdant flight; the LANDING is the pet
 * word's own: THE CLINGING ROPE — the rot splats into three thick
 * tendrils splayed from the impact, each ending in a swelling bead,
 * unlike the adder's clean fang punctures. Slow bubbles pop in the
 * splat while it lives; rot-flecks outlast it.
 */
const mire_spit: AbilitySig = {
  spawn(c) {
    venom.deployments.burst!(asMatter(c), c.wx, c.wy, { scale: 0.45 });
    const rand = srand(c.seed ^ 0x3e2a);
    const base = rand() * Math.PI * 2;
    for (let k = 0; k < 3; k++) {
      const a = base + (k / 3) * Math.PI * 2 + rand() * 0.4;
      lay(c, c.wx + Math.cos(a) * 0.3, c.wy + Math.sin(a) * 0.3 * 0.55, '#5c6b3e', {
        life: 8,
        size: 0.06,
        fade: '#39432a',
        fadeAt: 0.5,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    const splay = cl(t / 0.22);
    const rand = srand(c.seed ^ 0x3e2a);
    const base = rand() * Math.PI * 2;
    ctx.save();
    ctx.lineCap = 'round';
    // The splat heart.
    ctx.globalAlpha = 0.6 * fade;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.18, sc * 0.12 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // THE CLINGING ROPE: three thick tendrils splaying out, each
    // closing on a bead that swells as the tendril finishes.
    for (let k = 0; k < 3; k++) {
      const a = base + (k / 3) * Math.PI * 2 + 0.3;
      const len = sc * (0.32 + (k % 2) * 0.1) * splay;
      const ex = px + Math.cos(a) * len;
      const ey = py + Math.sin(a) * len * squash;
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(2.6, sc * 0.07 * (1 - 0.4 * splay));
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * sc * 0.1, py + Math.sin(a) * sc * 0.1 * squash);
      ctx.quadraticCurveTo(
        px + Math.cos(a + 0.25) * len * 0.6,
        py + Math.sin(a + 0.25) * len * 0.6 * squash,
        ex,
        ey,
      );
      ctx.stroke();
      // The bead at the tendril's end.
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.arc(ex, ey, Math.max(1.6, sc * 0.05) * (0.5 + 0.5 * splay), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // A bubble pops in the splat while it lives.
    if (crossed(c, 780, 0.45)) {
      venom.deployments.drip!(asMatter(c), c.wx, c.wy, { scale: 0.3 });
    }
  },
};

/**
 * GRAVEN MANTLE — "the hide, quarried."
 * A command word: the signature carries the whole read. Four facet
 * plates rise OUT of the ground around the body on their own beats
 * and LEAN IN to seat against the hide — the opposite motion of
 * every wrap and shell in the school (the silk climbs, the plates
 * arrive). The seat is a dust slam; standing grit outlasts it. The
 * riding stonehide page then holds the aura for its own 15 seconds.
 */
const graven_mantle: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x6b1d);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.6 + rand() * 0.2;
      lay(c, c.wx + Math.cos(a) * 0.5, c.wy + Math.sin(a) * 0.5 * 0.55, '#8a8474', {
        life: 8.5,
        size: 0.06,
        fade: '#48443a',
        fadeAt: 0.6,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.save();
    // The quarry ring: where the plates tore out of the ground —
    // four dark sockets opening as each plate leaves.
    for (let k = 0; k < 4; k++) {
      const open = cl((t * 850 - k * 130) / 160);
      if (open <= 0) continue;
      const a = (k / 4) * Math.PI * 2 + 0.6;
      const hx = px + Math.cos(a) * sc * 0.5;
      const hy = py + Math.sin(a) * sc * 0.5 * squash;
      ctx.globalAlpha = 0.55 * open * fade;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.ellipse(hx, hy, sc * 0.11 * open, sc * 0.07 * open * squash, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // THE SEAT: one grounding thump the moment the last plate locks —
    // the dust answers the stone, never buries it.
    if (crossed(c, 850, 0.85)) {
      dust.deployments.slam!(asMatter(c), c.wx, c.wy, { scale: 0.35 });
    }
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py } = c;
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    ctx.save();
    // THE PLATES ARRIVE: each rises from its socket and leans in to
    // seat against the hide, brightening as it locks.
    for (let k = 0; k < 4; k++) {
      const go = cl((t * 850 - k * 130) / 300);
      if (go <= 0) continue;
      const a = (k / 4) * Math.PI * 2 + 0.6;
      // From the socket (r 0.7, ground) to the seat (r 0.3, hide height).
      const r = sc * (0.7 - 0.4 * go);
      const lift = sc * (0.2 + 0.5 * Math.sin(Math.PI * Math.min(1, go)));
      const hx = px + Math.cos(a) * r;
      const hy = py + Math.sin(a) * r * squash - lift;
      const locked = go >= 1;
      const s = sc * 0.34;
      ctx.globalAlpha = (locked ? 1 : 0.85) * fade;
      ctx.fillStyle = locked ? st.mid : shade(st.mid, -14);
      ctx.beginPath();
      ctx.moveTo(hx - s, hy + s * 0.6);
      ctx.lineTo(hx - s * 0.55, hy - s * 0.8);
      ctx.lineTo(hx + s * 0.55, hy - s);
      ctx.lineTo(hx + s, hy + s * 0.5);
      ctx.closePath();
      ctx.fill();
      // The cut edge in ink so the facet reads against any ground.
      ctx.strokeStyle = st.deep;
      ctx.lineWidth = Math.max(1.8, sc * 0.04);
      ctx.stroke();
      // The seam light on a locked plate, and the seat's brief flash
      // ring so the lock reads as an event, not an arrival.
      if (locked) {
        ctx.strokeStyle = st.spark;
        ctx.lineWidth = Math.max(2.0, sc * 0.045);
        ctx.beginPath();
        ctx.moveTo(hx - s * 0.55, hy - s * 0.8);
        ctx.lineTo(hx + s * 0.55, hy - s);
        ctx.stroke();
        const flash = cl(1 - (t * 850 - (k * 130 + 300)) / 160);
        if (flash > 0 && flash < 1) {
          ctx.globalAlpha = 0.8 * flash * fade;
          ctx.beginPath();
          ctx.ellipse(hx, hy, s * (1.2 + 0.6 * (1 - flash)), s * (0.9 + 0.5 * (1 - flash)), 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
    if (crossed(c, 850, 0.92)) c.glow(c.wx, c.wy, 0.7, 0.3);
  },
};

/**
 * THE DROWNING MIRE — the signature: "the fen moves in."
 * A field the wire's ticks long. The sheet establishes with a
 * creeping shoreline (the marsh ARRIVING, not appearing), then
 * lives: scum lanes turning on the field's own slow clock, rot
 * blisters swelling and popping on posSeed stations, midge motes
 * drifting above the water. Rot stains at the rim outlast it.
 */
const the_drowning_mire: AbilitySig = {
  spawn(c) {
    venom.deployments.cloud!(asMatter(c), c.wx, c.wy, { scale: 0.45 });
    const hash = srand(posSeed(c, 0x5f3d));
    const base = hash() * Math.PI * 2;
    for (let k = 0; k < 5; k++) {
      const a = base + (k / 5) * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.9, c.wy + Math.sin(a) * c.radius * 0.9 * 0.55, '#4a5732', {
        life: 9,
        size: 0.065,
        fade: '#2c3520',
        fadeAt: 0.6,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const lifeMs = (c.ticks ?? 160) * 50;
    const fade = t < 0.85 ? 1 : (1 - t) / 0.15;
    const arrive = cl((t * lifeMs) / 800);
    const hash = srand(posSeed(c, 0x5f3d));
    const base = hash() * Math.PI * 2;
    ctx.save();
    // THE SHEET: dark water with an uneven, creeping shoreline —
    // lobes each arriving at its own pace, walked through curve
    // midpoints so the water's edge never shows a straight chord.
    ctx.globalAlpha = 0.55 * fade;
    ctx.fillStyle = st.deep;
    const N = 24;
    const pts: [number, number][] = [];
    for (let k = 0; k < N; k++) {
      const a = base + (k / N) * Math.PI * 2;
      const wob = 0.88 + 0.12 * Math.sin(a * 3 + base * 3);
      const r = rPx * wob * cl(arrive * 1.3 - (k % 4) * 0.08);
      pts.push([px + Math.cos(a) * r, py + Math.sin(a) * r * squash]);
    }
    ctx.beginPath();
    ctx.moveTo((pts[0]![0] + pts[N - 1]![0]) / 2, (pts[0]![1] + pts[N - 1]![1]) / 2);
    for (let k = 0; k < N; k++) {
      const q = pts[k]!;
      const nx = pts[(k + 1) % N]!;
      ctx.quadraticCurveTo(q[0], q[1], (q[0] + nx[0]) / 2, (q[1] + nx[1]) / 2);
    }
    ctx.closePath();
    ctx.fill();
    // The rot rim: the shoreline itself, brighter — the water's edge
    // is where the marsh is busiest.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2.0, sc * 0.05);
    ctx.stroke();
    // SCUM LANES: two slow arcs turning on the field's own clock.
    if (arrive >= 1) {
      const turn = (c.now / 5200) * Math.PI * 2;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(1.8, sc * 0.04);
      for (const [rf, off] of [[0.45, 0], [0.68, 2.4]] as const) {
        ctx.globalAlpha = 0.35 * fade;
        ctx.beginPath();
        ctx.ellipse(px, py, rPx * rf, rPx * rf * squash, 0, turn + off, turn + off + 1.6);
        ctx.stroke();
      }
      // ROT BLISTERS: three stations swelling on staggered beats,
      // each popping at full and leaving the beat to the next.
      for (let k = 0; k < 3; k++) {
        const beat = (c.now / 1600 + k * 0.33) % 1;
        const a = base + (k / 3) * Math.PI * 2 + 0.8;
        const bx = px + Math.cos(a) * rPx * 0.5;
        const by = py + Math.sin(a) * rPx * 0.5 * squash;
        const swell = beat < 0.8 ? beat / 0.8 : 0;
        if (swell > 0.1) {
          ctx.globalAlpha = 0.75 * swell * fade;
          ctx.strokeStyle = st.core;
          ctx.lineWidth = Math.max(2.0, sc * 0.045);
          ctx.beginPath();
          ctx.ellipse(bx, by, sc * 0.13 * swell, sc * 0.085 * swell * squash, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
    if (crossed(c, lifeMs, 0.05)) c.glow(c.wx, c.wy, c.radius * 0.7, 0.2);
  },
  air(c) {
    // Midges over standing water: one mote drifts up on a lazy beat,
    // and now and then a blister's pop sends a drip the library way.
    const lifeMs = (c.ticks ?? 160) * 50;
    const beat = Math.floor(c.age / 1300);
    const beatPrev = Math.floor((c.age - c.frameDt * 1000) / 1300);
    if (beat !== beatPrev && c.t < 0.8 && lifeMs > 2000) {
      const hash = srand(posSeed(c, 0x5f3d) ^ beat);
      const a = hash() * Math.PI * 2;
      venom.deployments.drip!(asMatter(c), c.wx + Math.cos(a) * c.radius * 0.5, c.wy + Math.sin(a) * c.radius * 0.5 * 0.55, { scale: 0.28 });
    }
  },
};

/**
 * THE GRAVEN GAZE — the signature: "country, where bodies stood."
 * An arc word on the short 300 ms wire, so every stroke sits one
 * weight band up. The centerpiece is THE CONE OF COUNTRY GOING
 * GREY: the stare fans out hard-edged along the facing; inside it
 * the ground greys and cracks ALONG the gaze (never stone_gaze's
 * ring — the wild gaze falls from above, the pet gaze travels), and
 * true chips stand up at the far rim and settle into a little
 * standing field that outlasts the look by nine seconds.
 */
const the_graven_gaze: AbilitySig = {
  spawn(c) {
    const ex = c.wx + Math.cos(c.dir) * c.radius * 0.85;
    const ey = c.wy + Math.sin(c.dir) * c.radius * 0.85 * 0.55;
    dust.deployments.gouge!(asMatter(c), ex, ey, { scale: 0.4, dir: c.dir });
    const rand = srand(c.seed ^ 0x9a2e);
    // The standing field: three chips thrown up at the cone's end,
    // settling upright — the country the look made.
    for (let k = 0; k < 3; k++) {
      const a = c.dir + (k - 1) * 0.3;
      c.particles.burst(
        c.wx + Math.cos(a) * c.radius * (0.7 + rand() * 0.25),
        c.wy + Math.sin(a) * c.radius * (0.7 + rand() * 0.25) * 0.55,
        1,
        ['#b9d18c', '#8a9282'],
        {
          speed: 0.1,
          life: 9,
          size: 0.06,
          z: 0.05,
          vz: 1.4 + rand() * 0.6,
          zg: 7,
          land: 'settle',
          layer: 'world',
          shadow: 0.4,
          fade: '#4c5142',
          fadeAt: 0.65,
        },
      );
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    const reach = cl(t / 0.35);
    const half = 0.32;
    ctx.save();
    // THE CONE: the grey wash the stare lays down, opening to reach.
    ctx.globalAlpha = 0.5 * fade;
    ctx.fillStyle = st.deep;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.ellipse(px, py, rPx * reach, rPx * reach * squash, 0, c.dir - half, c.dir + half);
    ctx.closePath();
    ctx.fill();
    // The cone's hard edges (WEIGHT PASS: floors one band up).
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(3.0, sc * 0.075);
    for (const s of [-1, 1] as const) {
      const a = c.dir + s * half;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a) * rPx * reach, py + Math.sin(a) * rPx * reach * squash);
      ctx.stroke();
    }
    // THE CRACKS RUN WITH THE LOOK: three seams inside the cone,
    // radiating along the gaze with one elbow each.
    if (reach > 0.5) {
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.4, sc * 0.055);
      const rand = srand(c.seed ^ 0x9a2e);
      for (let k = 0; k < 3; k++) {
        const a = c.dir + (k - 1) * 0.18;
        const f1 = 0.35 + rand() * 0.15;
        const f2 = 0.75 + rand() * 0.2;
        const ex1 = px + Math.cos(a) * rPx * f1;
        const ey1 = py + Math.sin(a) * rPx * f1 * squash;
        const elbow = a + (rand() - 0.5) * 0.4;
        ctx.globalAlpha = 0.8 * fade;
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a) * rPx * 0.12, py + Math.sin(a) * rPx * 0.12 * squash);
        ctx.lineTo(ex1, ey1);
        ctx.lineTo(ex1 + Math.cos(elbow) * rPx * (f2 - f1), ey1 + Math.sin(elbow) * rPx * (f2 - f1) * squash);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, px, py } = c;
    // THE UNBLINKING FLASH: a pale fire line at eye height, brief
    // and hard — the moment the lids stop.
    const flash = t < 0.4 ? t / 0.4 : cl((0.7 - t) / 0.3);
    if (flash <= 0) return;
    ctx.save();
    ctx.globalAlpha = 0.9 * flash;
    ctx.strokeStyle = st.spark;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2.8, sc * 0.07);
    const ex = px + Math.cos(c.dir) * sc * 0.3;
    const ey = py + Math.sin(c.dir) * sc * 0.18 - sc * 0.55;
    ctx.beginPath();
    ctx.moveTo(ex - Math.cos(c.dir + Math.PI / 2) * sc * 0.12, ey - Math.sin(c.dir + Math.PI / 2) * sc * 0.07);
    ctx.lineTo(ex + Math.cos(c.dir + Math.PI / 2) * sc * 0.12, ey + Math.sin(c.dir + Math.PI / 2) * sc * 0.07);
    ctx.stroke();
    ctx.restore();
    if (crossed(c, 300, 0.1)) c.glow(c.wx, c.wy, 0.5, 0.35);
  },
};

// ==================================================== THE EXPORT

export const PETARTS_SIGS: Record<string, AbilitySig> = {
  nip_and_dart,
  plague_gnaw,
  the_rats_hour,
  echo_shriek,
  the_dark_descent,
  set_the_shell,
  clatter_challenge,
  horn_toss,
  tide_grip,
  the_undertow,
  the_standing_stone,
  riptide_claw,
  the_kings_pincer,
  gore_charge,
  tusk_sweep,
  mud_wallow,
  the_long_furrow,
  worry_the_wound,
  hamstring,
  the_first_howl,
  winters_jaw,
  the_cowing_snarl,
  raking_flurry,
  the_winter_stalk,
  maul,
  the_charge,
  stand_tall,
  talon_stoop,
  hushing_wing,
  preen,
  the_white_hush,
  venom_spit,
  coiled_strike,
  shed_skin,
  the_long_fang,
  pale_silk,
  the_venom_lattice,
  tail_sweep,
  mire_spit,
  graven_mantle,
  the_drowning_mire,
  the_graven_gaze,
};
