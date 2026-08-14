/**
 * THE HILL COMES DOWN — the ogre arts' receiving-end signatures
 * (docs/ogres-plan.md). Seven arts, one grammar: WEIGHT ARRIVING.
 * Everything the giant-kin do lands, bounces once at most, and then
 * LIES THERE — the lasting marks are the family's whole poetry
 * (a settled millstone, flattened grass, a gnawed bone). Registered
 * centerpieces (grep before naming — no reuse anywhere):
 *   skull_toll     — "the bell under the hill"
 *   ogre_tantrum   — "the ground loses the argument"
 *   millstone_toss — "the wheel comes to rest"
 *   gravel_rake    — "the road thrown back"
 *   hill_bellow    — "the grass lies down"
 *   shaken_stones  — "the hillside lets go"
 *   haunch_gnaw    — "the bone hits the ground"
 *
 * Laws honored: hard edges + save/restore hygiene; ground y-radii
 * squashed; srand determinism (ALL seeded geometry precomputed before
 * any crossing gate consumes rand); frameDt-gated emission; ≤ ~60
 * path ops per hook per frame; ONE VOICE through the matter library.
 */
import { srand } from './abilityFx.js';
import type { AbilitySig, SigCtx } from './fxSignatures.js';
import { dust, smoke, blood, asMatter } from './matter/index.js';

function cl(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** THE LASTING MARK — one settled grain laid at a world point. */
function lay(
  c: SigCtx, wx: number, wy: number, color: string,
  opts: {
    life?: number; size?: number; flicker?: number;
    fade?: string; fadeAt?: number; fade2?: string; fade2At?: number;
  } = {},
): void {
  c.particles.burst(wx, wy, 1, [color], {
    speed: 0.05, life: opts.life ?? 8, size: opts.size ?? 0.055,
    gravity: 0, drag: 4, layer: 'ground', flicker: opts.flicker ?? 0,
    fade: opts.fade, fadeAt: opts.fadeAt,
    fade2: opts.fade2, fade2At: opts.fade2At,
  });
}

/** Crossing-frame gate on the life fraction of a fixed-ms wire. */
function crossed(c: SigCtx, wireMs: number, at: number): boolean {
  const tPrev = c.t - (c.frameDt * 1000) / wireMs;
  return tPrev < at && c.t >= at;
}

// ----------------------------------------------------------- skull_toll
// ground_aoe r1.7, fuse 16 — the overhead greatclub drop.

/**
 * SKULL_TOLL — "the bell under the hill."
 * The club face prints the turf: one deep OVAL socket (a club is not
 * a fist — the mark is long), and out of it a single ring wave rolls
 * like a struck bell's note made visible, once, and gone. Two arc
 * fissures open along the socket's long sides. The lasting mark is
 * the print itself: a club-face bruise in the grass with its two
 * fissure seams, eight seconds of proof the ground rang.
 */
const skull_toll: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    const m = asMatter(c);
    dust.deployments.slam!(m, c.wx, c.wy, { scale: 0.95 });
    dust.deployments.skirt!(m, c.wx, c.wy, { radius: c.radius * 0.85, scale: 0.65 });
    smoke.deployments.billow!(m, c.wx, c.wy, { scale: 0.3 });
  },
  ground(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xa11);
    // Precompute ALL seeded geometry before any gate consumes rand.
    const printA = rand() * Math.PI; // the club face's long axis
    const fisL = [0.55 + rand() * 0.3, 0.5 + rand() * 0.3];
    const fade = 1 - cl((t - 0.82) / 0.18);
    ctx.save();
    ctx.lineCap = 'round';
    // The print: a long club-face socket, dark and certain.
    ctx.globalAlpha = 0.8 * fade;
    ctx.fillStyle = '#241c10';
    ctx.beginPath();
    ctx.ellipse(px, py, sc * 0.66, sc * 0.3 * squash, printA, 0, Math.PI * 2);
    ctx.fill();
    // The bell note: ONE ring wave, rolling out fast and thinning.
    const noteT = cl(t / 0.55);
    if (noteT < 1) {
      ctx.globalAlpha = 0.7 * (1 - noteT);
      ctx.strokeStyle = st.spark;
      ctx.lineWidth = Math.max(1.5, sc * 0.055 * (1 - noteT * 0.6));
      ctx.beginPath();
      ctx.ellipse(px, py, sc * (0.4 + noteT * c.radius * 1.05), sc * (0.4 + noteT * c.radius * 1.05) * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Two arc fissures along the print's long sides.
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = '#241c10';
    ctx.lineWidth = Math.max(2, sc * 0.055);
    for (const sd of [-1, 1] as const) {
      const a = printA + sd * 0.9;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * sc * 0.5, py + Math.sin(a) * sc * 0.5 * squash);
      ctx.lineTo(px + Math.cos(a + sd * 0.5) * sc * (0.5 + fisL[sd === -1 ? 0 : 1]!), py + Math.sin(a + sd * 0.5) * sc * (0.5 + fisL[sd === -1 ? 0 : 1]!) * squash);
      ctx.stroke();
    }
    ctx.restore();
    // The bruise stays: print grains + fissure seams on the long clock.
    if (crossed(c, 700, 0.6)) {
      const layR = srand(c.seed ^ 0xa12);
      for (let k = 0; k < 5; k++) {
        const a = printA + (layR() - 0.5) * 0.8;
        const d = (layR() - 0.5) * 0.9;
        lay(c, c.wx + Math.cos(a) * d, c.wy + Math.sin(a) * d * 0.5, '#3a352c', {
          life: 8 + layR(), size: 0.06 + layR() * 0.02, fade: '#241c10', fadeAt: 0.5,
        });
      }
    }
  },
};

// --------------------------------------------------------- ogre_tantrum
// flurry ×3 — past its patience, everything everywhere.

/**
 * OGRE_TANTRUM — "the ground loses the argument."
 * No aim, all outcome: each pulse of the flurry stamps its own small
 * fist-print into the turf at a seeded scatter angle — by the end
 * the ground around the ogre is a tantrum's ledger, seven prints
 * deep, every one slightly wrong. Dust answers every stamp. The
 * marks fade on the short clock; the lesson doesn't.
 */
const ogre_tantrum: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    dust.deployments.kick!(m, c.wx, c.wy, { radius: 0.5, scale: 0.6 });
  },
  ground(c) {
    const { ctx, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xa21);
    // The whole ledger precomputed: up to 7 prints, angle + reach.
    const pa: number[] = [];
    const pd: number[] = [];
    for (let k = 0; k < 7; k++) {
      pa.push(rand() * Math.PI * 2);
      pd.push(0.35 + rand() * 0.85);
    }
    const shown = Math.min(7, 1 + Math.floor(t * 8));
    const fade = 1 - cl((t - 0.8) / 0.2);
    ctx.save();
    ctx.globalAlpha = 0.7 * fade;
    ctx.fillStyle = '#2c2416';
    for (let k = 0; k < shown; k++) {
      const x = px + Math.cos(pa[k]!) * sc * pd[k]!;
      const y = py + Math.sin(pa[k]!) * sc * pd[k]! * squash;
      ctx.beginPath();
      ctx.ellipse(x, y, sc * 0.16, sc * 0.11 * squash, pa[k]!, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Each new print slams its own dust — gated to the print beats.
    for (let k = 1; k <= 3; k++) {
      if (crossed(c, 900, k * 0.27)) {
        const m = asMatter(c);
        const i = Math.min(6, k * 2);
        dust.deployments.slam!(m, c.wx + Math.cos(pa[i]!) * pd[i]!, c.wy + Math.sin(pa[i]!) * pd[i]! * 0.5, { scale: 0.45 });
      }
    }
  },
};

// ------------------------------------------------------- millstone_toss
// projectile splash 1.4 — a hundredweight of quarried wheel.

/**
 * MILLSTONE_TOSS — "the wheel comes to rest."
 * The wheel lands EDGE-ON and keeps going: it rolls a short seeded
 * arc past the wound — a fat disc with its eye, wobbling upright,
 * dust chasing the rim — slows, leans, and falls FLAT with one last
 * slam. The lasting mark is the wheel itself lying in the grass,
 * eye up, nine seconds — the one piece of loot nobody can carry.
 */
const millstone_toss: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    const m = asMatter(c);
    dust.deployments.slam!(m, c.wx, c.wy, { scale: 0.8 });
    dust.deployments.gouge!(m, c.wx, c.wy, { radius: 0.5, scale: 0.6 });
  },
  air(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xa31);
    const rollA = rand() * Math.PI * 2; // which way it rolls on
    const rollD = 1.1 + rand() * 0.6; // how far before the fall
    // The roll eases out; the fall is the last fifth.
    const rollT = cl(t / 0.8);
    const ease = 1 - (1 - rollT) * (1 - rollT);
    const fallT = cl((t - 0.8) / 0.2);
    const x = px + Math.cos(rollA) * sc * rollD * ease;
    const y = py + Math.sin(rollA) * sc * rollD * ease * squash;
    const R = sc * 0.34;
    ctx.save();
    // Upright and rolling: a disc losing its lean; flat by the end.
    const upright = 1 - fallT;
    const wob = Math.sin(t * 26) * 0.1 * (1 - rollT);
    ctx.translate(x, y - R * upright);
    ctx.rotate(rollA + wob);
    ctx.fillStyle = st.mid;
    ctx.strokeStyle = '#241c10';
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.beginPath();
    ctx.ellipse(0, 0, R, R * (0.24 + 0.76 * fallT), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // The eye, and the lit rim while it stands.
    ctx.fillStyle = '#241c10';
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 0.18, R * 0.18 * (0.24 + 0.76 * fallT), 0, 0, Math.PI * 2);
    ctx.fill();
    if (upright > 0.2) {
      ctx.globalAlpha = upright;
      ctx.fillStyle = st.spark;
      ctx.beginPath();
      ctx.ellipse(0, -R * 0.7, R * 0.5, R * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Dust chases the rim on gated beats; the fall slams once.
    if (crossed(c, 900, 0.3) || crossed(c, 900, 0.55)) {
      dust.deployments.kick!(asMatter(c), c.wx + Math.cos(rollA) * rollD * ease, c.wy + Math.sin(rollA) * rollD * ease * 0.5, { scale: 0.4 });
    }
    if (crossed(c, 900, 0.97)) {
      const m = asMatter(c);
      const fx2 = c.wx + Math.cos(rollA) * rollD;
      const fy2 = c.wy + Math.sin(rollA) * rollD * 0.5;
      dust.deployments.slam!(m, fx2, fy2, { scale: 0.6 });
      // The wheel lies where it fell — the lasting mark is the wheel.
      const layR = srand(c.seed ^ 0xa32);
      lay(c, fx2, fy2, '#8f8672', { life: 9, size: 0.3, fade: '#4c463a', fadeAt: 0.6 });
      lay(c, fx2, fy2, '#241c10', { life: 9, size: 0.09, fadeAt: 0.8 });
      for (let k = 0; k < 3; k++) {
        const a = layR() * Math.PI * 2;
        lay(c, fx2 + Math.cos(a) * 0.3, fy2 + Math.sin(a) * 0.15, '#6e6754', {
          life: 7 + layR(), size: 0.05, fade: '#4e463c', fadeAt: 0.5,
        });
      }
    }
  },
};

// ---------------------------------------------------------- gravel_rake
// projectile_fan ×3 — a fistful of the road, thrown flat.

/**
 * GRAVEL_RAKE — "the road thrown back."
 * Each pellet's wound is small and mean: a short SKID GOUGE along the
 * flight line (gravel arrives flat, not from above) with two or three
 * embedded stones at its end — the road, returned to sender, seated
 * in the turf for six seconds.
 */
const gravel_rake: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    const m = asMatter(c);
    dust.deployments.gouge!(m, c.wx, c.wy, { radius: 0.4, scale: 0.5 });
  },
  ground(c) {
    if (c.kind !== 'blast') return;
    const { ctx, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xa41);
    const skidA = Math.atan2(c.wy - c.wy2 || 0.01, c.wx - c.wx2 || 0.01) + Math.PI;
    const stoneOff: Array<[number, number]> = [];
    for (let k = 0; k < 3; k++) stoneOff.push([(rand() - 0.5) * 0.3, (rand() - 0.5) * 0.2]);
    const fade = 1 - cl((t - 0.75) / 0.25);
    ctx.save();
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = '#2c2416';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, sc * 0.07);
    ctx.beginPath();
    ctx.moveTo(px - Math.cos(skidA) * sc * 0.55, py - Math.sin(skidA) * sc * 0.55 * squash);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.restore();
    if (crossed(c, 600, 0.5)) {
      for (const [ox, oy] of stoneOff) {
        lay(c, c.wx + ox, c.wy + oy, '#9a8a68', {
          life: 6, size: 0.055, fade: '#54492f', fadeAt: 0.55,
        });
      }
    }
  },
};

// ---------------------------------------------------------- hill_bellow
// nova r3.2, knockback 2 — the voice that moves the ground.

/**
 * HILL_BELLOW — "the grass lies down."
 * No fire, no stone: the AIR arrives. A ring of flattened-grass
 * streaks lies down radially — long combed strokes in two greens,
 * rushing outward with the wavefront and STAYING flat — while loose
 * dust and a spittle-fleck or two ride the shout. What lingers is a
 * combed lawn: every blade pointing away from where the voice stood.
 */
const hill_bellow: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'nova') return;
    const m = asMatter(c);
    dust.deployments.billow!(m, c.wx, c.wy, { radius: c.radius * 0.5, scale: 0.6 });
    smoke.deployments.billow!(m, c.wx, c.wy, { scale: 0.3 });
  },
  ground(c) {
    if (c.kind !== 'nova') return;
    const { ctx, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xa51);
    // The comb, precomputed: 14 streaks, angle/reach/green.
    const n = 14;
    const sa: number[] = [];
    const sl: number[] = [];
    const gk: number[] = [];
    for (let k = 0; k < n; k++) {
      sa.push((k / n) * Math.PI * 2 + (rand() - 0.5) * 0.3);
      sl.push(0.55 + rand() * 0.45);
      gk.push(rand());
    }
    const wave = cl(t / 0.5) * c.radius;
    const fade = 1 - cl((t - 0.7) / 0.3);
    ctx.save();
    ctx.lineCap = 'round';
    for (let k = 0; k < n; k++) {
      const a = sa[k]!;
      const from = Math.min(wave, c.radius * 0.35);
      const to = Math.min(wave + sl[k]!, c.radius) * sl[k]!;
      if (to <= from) continue;
      ctx.globalAlpha = 0.55 * fade;
      ctx.strokeStyle = gk[k]! > 0.5 ? '#4e6e3c' : '#3c5830';
      ctx.lineWidth = Math.max(1.5, sc * 0.05);
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * sc * from, py + Math.sin(a) * sc * from * squash);
      ctx.lineTo(px + Math.cos(a) * sc * to, py + Math.sin(a) * sc * to * squash);
      ctx.stroke();
    }
    ctx.restore();
    // The combed lawn stays: streak-end grains laid once at the crest.
    if (crossed(c, 800, 0.55)) {
      const layR = srand(c.seed ^ 0xa52);
      for (let k = 0; k < n; k += 2) {
        const a = sa[k]!;
        const d = Math.min(c.radius * 0.9, sl[k]! * c.radius * 0.8);
        lay(c, c.wx + Math.cos(a) * d, c.wy + Math.sin(a) * d * 0.5, '#4e6e3c', {
          life: 6.5 + layR(), size: 0.06, fade: '#31462a', fadeAt: 0.5,
        });
      }
    }
  },
};

// -------------------------------------------------------- shaken_stones
// ground_aoe r2.2 fuse 18, aim 'lead' — the hillside overhead lets go.

/**
 * SHAKEN_STONES — "the hillside lets go."
 * Three stones arrive from ABOVE on staggered beats — each drops on
 * true altitude with its own small shadow racing up to meet it, hits
 * with a dust slam, and STAYS: a scatter of new field-stones seated
 * where they fell, seven seconds of rearranged landscape.
 */
const shaken_stones: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    dust.deployments.skirt!(asMatter(c), c.wx, c.wy, { radius: c.radius * 0.7, scale: 0.55 });
  },
  air(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, squash, px, py } = c;
    const rand = srand(c.seed ^ 0xa61);
    // Three stones precomputed: offset, size, landing beat.
    const ox: number[] = [];
    const oy: number[] = [];
    const sr: number[] = [];
    const beat: number[] = [];
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * c.radius * 0.7;
      ox.push(Math.cos(a) * d);
      oy.push(Math.sin(a) * d * 0.5);
      sr.push(0.14 + rand() * 0.1);
      beat.push(0.15 + k * 0.22 + rand() * 0.08);
    }
    ctx.save();
    for (let k = 0; k < 3; k++) {
      const dropT = cl((t - (beat[k]! - 0.3)) / 0.3);
      if (dropT <= 0 || t > beat[k]!) continue;
      const x = px + ox[k]! * sc;
      const gy = py + oy[k]! * sc * squash * 2;
      const alt = (1 - dropT) * sc * 2.6;
      // The shadow grows as the stone falls.
      ctx.globalAlpha = 0.35 + 0.35 * dropT;
      ctx.fillStyle = '#241c10';
      ctx.beginPath();
      ctx.ellipse(x, gy, sc * sr[k]! * (0.5 + 0.6 * dropT), sc * sr[k]! * (0.5 + 0.6 * dropT) * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      // The stone, dropping.
      ctx.globalAlpha = 1;
      ctx.fillStyle = st.mid;
      ctx.strokeStyle = '#241c10';
      ctx.lineWidth = Math.max(1, sc * 0.03);
      ctx.beginPath();
      ctx.moveTo(x - sc * sr[k]!, gy - alt);
      ctx.lineTo(x - sc * sr[k]! * 0.3, gy - alt - sc * sr[k]!);
      ctx.lineTo(x + sc * sr[k]! * 0.7, gy - alt - sc * sr[k]! * 0.8);
      ctx.lineTo(x + sc * sr[k]!, gy - alt + sc * sr[k]! * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    // Each landing: one slam, one seated stone (the mark IS the stone).
    for (let k = 0; k < 3; k++) {
      if (crossed(c, 800, beat[k]!)) {
        const m = asMatter(c);
        dust.deployments.slam!(m, c.wx + ox[k]!, c.wy + oy[k]!, { scale: 0.5 });
        lay(c, c.wx + ox[k]!, c.wy + oy[k]!, '#8a8164', {
          life: 7, size: 0.11 + sr[k]! * 0.3, fade: '#4e463c', fadeAt: 0.6,
        });
      }
    }
  },
};

// ----------------------------------------------------------- haunch_gnaw
// self heal — supper, mid-fight.

/**
 * HAUNCH_GNAW — "the bone hits the ground."
 * A MOMENT, not a working: grease-fleck drips while the jaw works,
 * and at the swallow the finished bone drops — one pale gnawed relic
 * with its two knuckle ends, lying in the grease shadow by the great
 * feet for eight seconds. The camp's whole archaeology, live.
 */
const haunch_gnaw: AbilitySig = {
  spawn(c) {
    blood.deployments.drip!(asMatter(c), c.wx, c.wy, { scale: 0.4 });
  },
  ground(c) {
    // The swallow: the bone drops once, and stays.
    if (crossed(c, 500, 0.8)) {
      const layR = srand(c.seed ^ 0xa71);
      const a = layR() * Math.PI * 2;
      const bx = c.wx + Math.cos(a) * 0.45;
      const by = c.wy + Math.sin(a) * 0.25;
      // The grease shadow, then the bone upon it.
      lay(c, bx, by, '#3a3226', { life: 8, size: 0.14, fadeAt: 0.5 });
      lay(c, bx, by, '#cfc4a2', { life: 8, size: 0.1, fade: '#8f8672', fadeAt: 0.65 });
      lay(c, bx - 0.1, by - 0.04, '#cfc4a2', { life: 8, size: 0.055, fade: '#8f8672', fadeAt: 0.65 });
      lay(c, bx + 0.1, by + 0.04, '#cfc4a2', { life: 8, size: 0.055, fade: '#8f8672', fadeAt: 0.65 });
    }
  },
};

export const OGRE_SIGS: Record<string, AbilitySig> = {
  skull_toll,
  ogre_tantrum,
  millstone_toss,
  gravel_rake,
  hill_bellow,
  shaken_stones,
  haunch_gnaw,
};
