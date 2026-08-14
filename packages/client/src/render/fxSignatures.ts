/**
 * THE SIGNATURE LAW — per-ability bespoke choreography.
 *
 * The v3 grammar (rings, debris families, motifs) guarantees every
 * ability a coherent face. This registry is the tier above it: a
 * hand-authored set-piece NO OTHER ABILITY SHARES, composed on top
 * of the grammar in the same three strata the renderer already
 * paints. An ability with a signature stops being "a fire nova" and
 * becomes THE fireburst.
 *
 * Three hooks per ability:
 *  - spawn(c):  fires ONCE, the frame the fx arrives — the bespoke
 *               detonation matter (the grammar's debris still runs).
 *  - ground(c): every frame, painted UNDER the y-sorted world —
 *               flat set-pieces bodies stand on.
 *  - air(c):    every frame, painted OVER the scene — standing
 *               flourishes, crowns, shimmer, canopies.
 *
 * Authoring laws (binding):
 *  1. Hard edges only — no blur, no gradients, no shadowBlur.
 *  2. Alpha discipline: save/restore around every hook body.
 *  3. Ground ellipses squash by c.squash; air pieces lift ~0.4·sc.
 *  4. Geometry comes from srand(c.seed ^ salt) — a cast re-renders
 *     identically every frame. Per-frame randomness ONLY through
 *     frameDt-gated emission (the rim-shed pattern).
 *  5. Bounded: ≤ ~60 path ops per hook per frame; emission rates
 *     that respect the particle cap. 120fps is a law.
 *  6. The signature must SAY the mechanic — meaning first.
 *  7. No two signatures share their centerpiece.
 */

import { shade } from './rig.js';
import { srand, burstStarPath, type FxStyle } from './abilityFx.js';
import type { Particles } from './particles.js';
import { fire, frost, dust, shadow, smoke, asMatter } from './matter/index.js';
import { MELEE_SIGS } from './fxSigsMelee.js';
import { SNEAK_SIGS } from './fxSigsSneak.js';
import { ARCHERY_SIGS } from './fxSigsArchery.js';
import { ARX_SIGS } from './fxSigsArx.js';
import { ARX_BREATH_SIGS } from './fxSigsArxBreath.js';
import { ARCHER_SIGS } from './fxSigsArcher.js';
import { ROGUE_SIGS } from './fxSigsRogue.js';
import { BLADE_SIGS } from './fxSigsBlade.js';
import { ARCHMAGE_A_SIGS } from './fxSigsArchmageA.js';
import { ARCHMAGE_B_SIGS } from './fxSigsArchmageB.js';
import { RELIC_SIGS } from './fxSigsRelics.js';
import { SHIELD_SIGS } from './fxSigsShield.js';
import { TWOHAND_SIGS } from './fxSigsTwohand.js';
import { DUALWIELD_SIGS } from './fxSigsDualwield.js';
import { COMBAT_SIGS } from './fxSigsCombat.js';
import { VOICES_SIGS } from './fxSigsVoices.js';
import { FLIGHTS_SIGS } from './fxSigsFlights.js';
import { BEASTCRAFT_SIGS } from './fxSigsBeastcraft.js';
import { FOES_SIGS } from './fxSigsFoes.js';
import { GOLEM_SIGS } from './fxSigsGolems.js';
import { OGRE_SIGS } from './fxSigsOgres.js';

// --------------------------------------------------------------- ctx

export interface SigCtx {
  ctx: CanvasRenderingContext2D;
  st: FxStyle;
  /** The wire kind that carried this cast (nova/blast/arc/dash/…). */
  kind: string;
  /** Life fraction 0..1. */
  t: number;
  /** Age in ms, and the wall clock. */
  age: number;
  now: number;
  /** Stable per-cast seed — walk it with srand(seed ^ salt). */
  seed: number;
  /** Camera scale (px/tile), ground squash, and the frame's dt (s). */
  sc: number;
  squash: number;
  frameDt: number;
  /** The heart: world coords + lift-corrected screen coords. */
  wx: number;
  wy: number;
  px: number;
  py: number;
  /** The far end (dash/bolt/beam); equals the heart otherwise. */
  wx2: number;
  wy2: number;
  px2: number;
  py2: number;
  /** Radius in tiles and pixels; aim angle for arcs (else 0). */
  radius: number;
  rPx: number;
  dir: number;
  /** The wire's `ticks` payload, when the cast carried one (holds, channels). */
  ticks?: number;
  particles: Particles;
  /** Queue an emissive wash at world (x,y), r tiles, strength a. */
  glow(x: number, y: number, r: number, a: number): void;
}

export interface AbilitySig {
  spawn?(c: SigCtx): void;
  ground?(c: SigCtx): void;
  air?(c: SigCtx): void;
}

/**
 * THE ONE-VOICE LAW (FX v5 Phase 3): a signature composes MATTER
 * LIBRARY deployments for its particle matter — it never hand-mixes
 * a material the library owns. The painted centerpiece stays
 * bespoke; the grains come mastered. `asMatter` (matter/types.ts)
 * bridges SigCtx to the library. Call it in `spawn` (once per cast)
 * freely; per-frame hooks should call it only on gated beats.
 *
 * Signatures rebuilt on the matter library so far. Grows wave by
 * wave; the sibling test pins it as append-only bookkeeping until
 * all 226 speak through the library.
 */
export const MATTER_MIGRATED: readonly string[] = [
  'fireburst', 'shockwave', 'frost_nova', 'smoke_bomb', 'envenom',
  // Wave 2a — the melee ladder's earth and blood (steel accents in
  // style colors remain bespoke by design: the library owns MATERIALS,
  // not an ability's own metal).
  'heavy_slam', 'bloodlust', 'earthbreaker', 'rend', 'bull_rush',
  'stagger_stomp', 'headsman_stroke',
  // Wave 2b — the sneak ladder's two true material voices. The rest
  // of the roster is knife-steel and void glints in style colors:
  // lawfully bespoke, and quieter for it (caltrops' iron gained v5
  // bounce physics without joining the library — it is its own iron).
  'feint_double', 'shadowstep',
  // Wave 2c — the archery ladder's earth. Shafts, chips, and
  // fletching stay the archer's own wood and steel; rain_of_arrows
  // and storm_of_shafts gained TRUE z-fall without joining the
  // library (their shafts are theirs).
  'piercing_bolt', 'tumble_shot', 'longshot', 'skyfall_shot',
  // Wave 2d — the arx ladder, the densest material school: storm
  // impacts, true-fall star-stones, the undertow, the frozen rail,
  // the open hand of fire, first light. blink / ward_shell /
  // mirror_image keep their arcane glass and glints bespoke.
  'arc_bolt', 'meteor_shard', 'maelstrom', 'frost_lance',
  'ember_fan', 'stormcall', 'daybreak', 'riftwalker_step',
  // Wave 3a — the blade roster, the widest wave: sixteen of twenty
  // speak the library across seven materials (water, fire, frost,
  // storm, blood, radiance, dust). quicksilver keeps its mercury,
  // reapers_arc its chaff, green_verse its notes, still_air its
  // stillness — no material owns those voices, and the roster reads
  // better for the restraint.
  'sundering_chop', 'thorn_lash', 'riptide', 'cinder_arc',
  'winters_edge', 'red_harvest', 'storm_brand', 'kings_decree',
  'sunburst', 'starfall_strike', 'vow_unbroken', 'drag_under',
  'spoken_light', 'slagfall', 'sky_splits', 'sun_court',
  // Wave 3b — the rogue roster: precision and payment, so restraint
  // led. Seven speak the library (venom, dust, frost, shadow, blood,
  // storm — crimson_tithe and spark_lash honor their standing
  // earmarks for blood.drink and storm.impact). Six stay bespoke:
  // bone and marrow, wrong-way pale fire (the library tells TRUE
  // stories — a deliberate lie stays hand-painted), gold, coins,
  // punctuation, and soul-light own no material.
  'serpents_kiss', 'stinger', 'cold_snap', 'shadow_fang',
  'crimson_tithe', 'spark_lash', 'garden_close',
  // Wave 3c — the archer roster speaks in what each bow DOES to the
  // world, and most of those voices own no material: wind, sound,
  // sap, ghost, gold, star-stuff, and thunder stay bespoke. Five
  // speak the library — and cinder_rain grew fire.rain, TRUE falling
  // fire that plants the coals it promises, volleyed on the same
  // 800ms beat the painted orchard flares to.
  'broadhead', 'verdant_burst', 'howling_loose', 'hoarfrost',
  'cinder_rain',
  // Wave 3d — the archmage roster, fifteen of twenty-one across both
  // halves: the staff asks worlds to speak, and most worlds ARE
  // materials. water.curtain grew for the walking weather-wall;
  // undertow finally speaks the verb it named; galvanic_arc and
  // red_eclipse honor their standing earmarks. Where a sustained
  // library emitter covers old gated wisps, the gates were retired —
  // one voice. Arcane light, bone, void, and world-fabric stay
  // bespoke (arcane_ring, wisp_flare, rune_echo, marrow_pulse,
  // void_rift, realm_rend).
  'hearth_flare', 'undertow', 'stormlash', 'cinderstorm', 'glaciate',
  'galvanic_arc', 'overgrowth', 'grave_chill', 'gloom_burst',
  'venom_lash', 'magma_orb', 'shatterfrost', 'solar_lance',
  'eye_of_the_storm', 'red_eclipse',
  // Wave 3e — the twohand roster, dust's home school: WEIGHT AND
  // AFTERMATH, so the great landings are dust.slam at rising weights
  // (skysunder 1.1, quakefall 1.3, horizon_fall 1.45), the furrows
  // gouge true, avalanche's volleys stamp crossing-fired kicks, the
  // forges stand true plumes, and the school's three colds breathe
  // fog. Thirteen stay bespoke: pure-steel sweeps, wood, gold,
  // brass, bone, fen-light, and the elsewhere-sky.
  'fault_line', 'colossus_stance', 'skysunder', 'avalanche',
  'breaker_charge', 'titans_verdict', 'quakefall', 'giantsfall',
  'mournfield', 'ash_harvest', 'glacier_sunder', 'thunder_fell',
  'white_heat', 'pale_crescent', 'horizon_fall', 'road_opens',
  'winters_hunger', 'open_seam',
  // Wave 3f — dualwield + shield, the restraint wave: TWIN STEEL's
  // only true matter is the blood its knives collect, and MASONRY
  // AND IRON's no-billow law held under audit — one mortar-grit
  // voice, and rampart_break's stone took v5 loft-land-hop physics
  // without joining the library. Twenty of twenty-three stay
  // bespoke, and both schools read sharper for it.
  'heron_step', 'red_ribbons', 'set_the_wall',
  // Wave 3g — the combat roster closes the schools: DUST AND BRASS,
  // so the yard's grit kicks true and the war-red bleeds true where
  // blood is the point (first_blood, no_quarter). Brass, breath,
  // daylight, and milestones stay the veteran's own — no element
  // ever. ALL EIGHT WEAPON-ART ROSTERS NOW SPEAK THE LIBRARY.
  'first_blood', 'shoulder_check', 'loose_iron', 'hold_fast',
  'break_the_line', 'no_quarter',
  // Wave 3h — the Ten Voices and Ten Flights: nine legendary theses
  // speak library matter (moonfall's doc-promised cold fog finally
  // exists; stormskip's touches discharge on their crossing frames;
  // the_anvil takes its impact with nothing round beside it). Eleven
  // stay each legend's own: growth, wind, void, proof, the polite
  // visitor, the briar, bird-light, moon-glass, scent, music, and
  // the star-net.
  'day_breaks', 'moonfall', 'the_molt', 'red_toll', 'crownstorm',
  'stormskip', 'charfall', 'hushfall', 'the_anvil',
  // Wave 3i — the relics, the sigil, and the NPC specials: old
  // machines running on library matter (bramble_burst's hedge bites
  // true blood on its 800ms beat; ground_slam is the four-voice
  // smash at threat weight). The straw twin, the arcane question,
  // and the three champion voices stay bespoke — breath and dread
  // own no material.
  'ember_dash', 'healing_totem', 'snare_trap', 'storm_bell',
  'stone_aegis', 'coil_lance', 'bramble_burst', 'venom_dart',
  'bone_tempest', 'ground_slam',
  // Wave 3j — the keeper's tongue: workings, never blows. One
  // library voice (come_to_heel's doc-promised honest dust-up);
  // strewn_bait's grain took true settle physics without joining.
  // Everything else is the wild's own — forcing fire or venom onto
  // CARE would make the library lie.
  'come_to_heel',
  // Wave 3k — the foes' wave (enemy arts): seven kit voices on
  // library matter — the mark that catches, the standing haze, the
  // opened tomb, the ground that answers, the crypt's cold, the
  // packlord's bite, the bat's nick. web_snare (silk), reaping_sweep
  // (the reaver's own steel), and gnawed_mending (knitting growth)
  // stay bespoke by GRAMMAR REFUSAL — see fxSigsFoes.ts header.
  'cinder_ring', 'miasma_ring', 'grave_mist', 'raise_the_fallen',
  'marrow_chill', 'rending_lunge', 'shrilling_dart',
];

// ------------------------------------------------------- exemplars
//
// THE FOUNDING SEVEN — the first signatures ever authored, refit
// last, to the highest bar of the whole campaign (THE ARMORY
// REMEMBERS, closing wave). These are the faces a new player meets
// in their first hour; every one now lands on all three strata:
// the painted statement, true-altitude matter, and THE LASTING
// MARK lying six to nine seconds after the cast.
//
// Retired whole from the founding era: the kiln's molten seams and
// flame crown, the hoarfrost web lattice, the fixed three-blade
// cylinder, the plain billow canopy, the constant-width second
// moon, the plain stitched needle, and the hexagonal pressure
// front (the cornered wave belongs to draw_iron alone — the shield
// law reclaimed it).

/** Clamp to 0..1 — every staggered clock below runs on it. */
function cl(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * THE LASTING MARK — one settled grain laid deliberately at a world
 * point (the ~10 s tertiary stratum).
 */
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

/**
 * FIREBURST — "the fire that stands up."
 * The archetype, finally honest: a real detonation's fireball does
 * not sit on the ground — it RISES. The globe of fire lifts off the
 * crater on true height, shrinking and hardening as it climbs a
 * smoke stem, and burns out mid-air in a final ember pop that rains
 * nothing back but soot. What the heat left behind is glass: the
 * crater floor lies vitrified — a glossy dark disc swept by two
 * specular lights with glow still trapped in its bubbles — and its
 * memory is a ring of glassy grains winking for nine seconds around
 * three cooling embers. The first fire a player ever casts, and the
 * one every later fire is measured against.
 */
const fireburst: AbilitySig = {
  spawn(c) {
    if (c.kind !== 'blast') return;
    const m = asMatter(c);
    // The detonation: the mastered fire voice at full weight, plus
    // gobbets cometing out to lie burning in the ring.
    fire.deployments.burst!(m, c.wx, c.wy, { scale: 1.05 });
    fire.deployments.gobbets!(m, c.wx, c.wy, { scale: 0.8 });
    smoke.deployments.billow!(m, c.wx, c.wy, { scale: 0.5 });
    // THE VITRIFIED FLOOR, laid for keeps: a ring of glass grains
    // (two of them winking specular) around three cooling embers.
    const rand = srand(c.seed ^ 0x11a);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.3;
      lay(c, c.wx + Math.cos(a) * c.radius * 0.45, c.wy + Math.sin(a) * c.radius * 0.45,
        '#2a2230', {
          life: 8.5 + rand(), size: 0.06, flicker: k < 2 ? 6 : 0,
          fade: '#1c1622', fadeAt: 0.6,
        });
    }
    for (let k = 0; k < 3; k++) {
      lay(c, c.wx + (rand() - 0.5) * 0.4, c.wy + (rand() - 0.5) * 0.3, '#ff9a44', {
        life: 7.5 + rand(), size: 0.055, flicker: 7,
        fade: '#c43a18', fadeAt: 0.35, fade2: '#241812', fade2At: 0.75,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x11b);
    const fade = 1 - cl((t - 0.8) / 0.2);
    const inK = cl(t / 0.1);
    ctx.save();
    // The scorch: a torn dark disc under everything.
    ctx.globalAlpha = 0.6 * fade * inK;
    ctx.fillStyle = '#241812';
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rr = rPx * 0.85 * (1 + 0.08 * Math.sin(a * 3 + (c.seed % 7)));
      const x = px + Math.cos(a) * rr;
      const y = py + Math.sin(a) * rr * squash;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    // THE GLASS: the vitrified heart — glossy near-black, swept by
    // two specular arcs, with glow trapped in four bubbles that dim
    // as the melt cools.
    const glassK = cl((t - 0.08) / 0.15);
    if (glassK > 0) {
      ctx.globalAlpha = 0.8 * glassK * fade;
      ctx.fillStyle = '#241d2c';
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.5, rPx * 0.5 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      // Specular sweeps: the light finds the gloss.
      const sw = (c.seed % 9) * 0.7;
      ctx.globalAlpha = 0.55 * glassK * fade;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, sc * 0.03);
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.34, rPx * 0.34 * squash, 0, sw, sw + 1.1);
      ctx.stroke();
      ctx.globalAlpha = 0.35 * glassK * fade;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.2, rPx * 0.2 * squash, 0, sw + 2.4, sw + 3.1);
      ctx.stroke();
      // Trapped glow: four bubbles cooling from ember to dark.
      const heat = Math.max(0, 1 - t / 0.7);
      for (let k = 0; k < 4; k++) {
        const a = rand() * Math.PI * 2;
        const rr = Math.sqrt(rand()) * rPx * 0.36;
        const g = Math.max(1.5, sc * (0.028 + rand() * 0.02));
        ctx.globalAlpha = (0.4 + 0.6 * heat) * glassK * fade * (0.6 + 0.4 * Math.sin(c.now / 200 + k * 2.1));
        ctx.fillStyle = heat > 0.4 ? st.spark : st.deep;
        ctx.fillRect(px + Math.cos(a) * rr - g / 2, py + Math.sin(a) * rr * squash - g / 2, g, g);
      }
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 1.1, 0.5 * (1 - t));
  },
  air(c) {
    if (c.kind !== 'blast') return;
    const { ctx, st, t, sc, px, py } = c;
    ctx.save();
    // THE RISEN FIREBALL: the globe lifts off the crater, easing as
    // it climbs, shrinking and hardening — gone in a mid-air pop.
    const u = cl(t / 0.42);
    if (u < 1) {
      const ease = 1 - (1 - u) * (1 - u);
      const gy = py - ease * sc * 1.15;
      const gs = sc * (0.44 - 0.2 * ease);
      // The smoke stem beneath it: soft soot beads climbing after.
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#5a544c';
      for (let k = 0; k < 3; k++) {
        const sy = py - ease * sc * 1.15 * ((k + 0.6) / 3.6);
        const ss = sc * (0.07 + k * 0.02);
        ctx.beginPath();
        ctx.ellipse(px + Math.sin(c.now / 300 + k * 2) * sc * 0.03, sy, ss, ss * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // The globe: deep shell, mid body riding high, white heart.
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.ellipse(px, gy, gs, gs, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.mid;
      ctx.beginPath();
      ctx.ellipse(px - gs * 0.12, gy - gs * 0.18, gs * 0.72, gs * 0.68, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(px - gs * 0.15, gy - gs * 0.25, gs * 0.36, gs * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      // The flame skirt: two tongues dragging under the climb.
      const flick = 1 + 0.25 * Math.sin(c.now / 70);
      ctx.fillStyle = st.mid;
      for (const side of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(px + side * gs * 0.55, gy + gs * 0.55);
        ctx.lineTo(px + side * gs * (0.75 + 0.15 * flick), gy + gs * (1.15 + 0.25 * flick));
        ctx.lineTo(px + side * gs * 0.2, gy + gs * 0.8);
        ctx.closePath();
        ctx.fill();
      }
    }
    // The burnout: one mid-air ember pop at the top of the climb —
    // embers die on the wing, soot drifts on.
    if (crossed(c, 780, 0.42)) {
      c.particles.burst(c.wx, c.wy, 7, [st.core, st.mid, st.spark], {
        speed: 0.9, life: 0.5, size: 0.055, gravity: 0, shape: 'glint',
        z: 1.15, vz: 0.5, zg: 2.2, land: 'die', layer: 'world',
      });
      c.particles.burst(c.wx, c.wy, 3, ['#5a544c'], {
        speed: 0.2, life: 1.6, size: 0.08, gravity: -0.25, drag: 1.5, shape: 'mote',
        z: 1.1, vz: 0.3, zg: 0, layer: 'world',
      });
    }
    ctx.restore();
  },
};

/**
 * FROST_NOVA — "the lake under your feet."
 * The cold does not race outward — it makes the ground someone
 * else's: a frozen pane snaps over the circle, dark water showing
 * through, bubbles trapped mid-rise, and then the pane CRACKS — one
 * main fracture propagating rim-ward in four hard snaps, forking
 * twice, true frost spraying at every new tip. The hoar collar at
 * the rim is the nova's honest edge. When the pane melts back, the
 * crack stays written on the grass in rime for eight seconds: the
 * lake was here, and you were standing on it.
 */
const frost_nova: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    frost.deployments.bloom!(m, c.wx, c.wy, { radius: c.radius * 0.6, scale: 0.85 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x21a);
    const layR = srand(c.seed ^ 0x21b);
    const inK = cl(t / 0.1);
    const fade = 1 - cl((t - 0.78) / 0.22);
    ctx.save();
    // THE PANE: dark water under pale ice, rim collared in hoar.
    ctx.globalAlpha = 0.6 * inK * fade;
    ctx.fillStyle = '#1c2a3c';
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.95, rPx * 0.95 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.25 * inK * fade;
    ctx.fillStyle = st.mid;
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.9, rPx * 0.9 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // The hoar collar: the nova's true edge, chunky and white.
    ctx.globalAlpha = 0.85 * inK * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(2.5, sc * 0.07);
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const rr = rPx * 0.97 * (1 + 0.03 * Math.sin(a * 5 + (c.seed % 8)));
      const x = px + Math.cos(a) * rr;
      const y = py + Math.sin(a) * rr * squash;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    // Trapped bubbles: five white dots caught mid-rise, forever.
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * rPx * 0.7;
      const g = Math.max(1.5, sc * (0.02 + rand() * 0.018));
      ctx.globalAlpha = 0.55 * inK * fade;
      ctx.beginPath();
      ctx.ellipse(px + Math.cos(a) * rr, py + Math.sin(a) * rr * squash, g, g * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // THE CRACK: geometry precomputed whole, revealed in four hard
    // snaps. One main line rim-ward, forking left then right.
    const mainA = rand() * Math.PI * 2;
    const pts: Array<[number, number, number, number]> = [];
    const wpts: Array<[number, number, number, number]> = [];
    let ca = mainA;
    let cr = 0;
    let pxx = px, pyy = py, wxx = c.wx, wyy = c.wy;
    for (let s = 0; s < 4; s++) {
      ca += (rand() - 0.5) * 0.7;
      cr += 0.24;
      const nx = px + Math.cos(ca) * rPx * cr;
      const ny = py + Math.sin(ca) * rPx * cr * squash;
      const nwx = c.wx + Math.cos(ca) * c.radius * cr;
      const nwy = c.wy + Math.sin(ca) * c.radius * cr * squash;
      pts.push([pxx, pyy, nx, ny]);
      wpts.push([wxx, wyy, nwx, nwy]);
      pxx = nx; pyy = ny; wxx = nwx; wyy = nwy;
    }
    // Forks: off segment ends 1 and 2, shorter, veering wide.
    const forks: Array<[number, number, number, number, number]> = [];
    for (const [s, veer] of [[1, 1], [2, -1]] as const) {
      const seg = pts[s]!;
      const fa = Math.atan2((seg[3] - seg[1]) / squash, seg[2] - seg[0]) + veer * (0.7 + rand() * 0.3);
      forks.push([seg[2], seg[3],
        seg[2] + Math.cos(fa) * rPx * 0.3, seg[3] + Math.sin(fa) * rPx * 0.3 * squash, s]);
    }
    const stage = Math.min(3, Math.floor(cl((t - 0.14) / 0.44) * 4));
    const snapT = (s: number) => 0.14 + s * 0.11;
    for (let s = 0; s <= stage; s++) {
      if (t < snapT(s)) break;
      const seg = pts[s]!;
      // Pale under-crack then white core: the pane's depth showing.
      for (const [color, w, alpha] of [
        [st.mid, 0.085, 0.5],
        ['#ffffff', 0.04, 0.95],
      ] as const) {
        ctx.globalAlpha = alpha * fade;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.5, sc * w);
        ctx.beginPath();
        ctx.moveTo(seg[0], seg[1]);
        ctx.lineTo(seg[2], seg[3]);
        for (const f of forks) {
          if (f[4] === s) {
            ctx.moveTo(f[0], f[1]);
            ctx.lineTo(f[2], f[3]);
          }
        }
        ctx.stroke();
      }
      // The snap: true frost sprays at the newest tip, and the new
      // reach of the crack lies down in rime for keeps.
      if (crossed(c, 680, snapT(s))) {
        const wseg = wpts[s]!;
        frost.deployments.shatter!(asMatter(c), wseg[2], wseg[3], { scale: 0.22 });
        for (let g = 1; g <= 2; g++) {
          const gu = g / 2.2;
          lay(c, wseg[0] + (wseg[2] - wseg[0]) * gu, wseg[1] + (wseg[3] - wseg[1]) * gu,
            '#e8f4fa', { life: 7.5 + layR(), size: 0.05, fade: '#8ac4e8', fadeAt: 0.5 });
        }
        if (s === 3) frost.deployments.fog!(asMatter(c), c.wx, c.wy, { radius: c.radius * 0.7, scale: 0.4 });
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x21c);
    const fade = 1 - cl((t - 0.78) / 0.22);
    ctx.save();
    // Three ice stars wink over the pane, one at a time.
    for (let k = 0; k < 3; k++) {
      const tw = Math.sin(c.now / 500 + k * 2.7);
      if (tw < 0.7) continue;
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * rPx * 0.7;
      const x = px + Math.cos(a) * rr;
      const y = py + Math.sin(a) * rr * squash - sc * 0.1;
      const g = Math.max(1.5, sc * 0.03) * ((tw - 0.7) / 0.3);
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - g / 2, y - g * 1.7, g, g * 3.4);
      ctx.fillRect(x - g * 1.7, y - g / 2, g * 3.4, g);
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.9, 0.3 * (1 - t));
  },
};

/**
 * WHIRLWIND — "the cyclone spins up."
 * A pulse art told HONESTLY: each of the three pulses is one blade.
 * A pulse wire swings a single banded crescent at its own height,
 * inhales a sip of the loose ground, and — as it dies — slings its
 * chips wide on true arcs and lays its share of a churned ring. The
 * pulses overlap, so the storm visibly builds: one blade, then two
 * riding different heights, then two, then the last one alone. When
 * the air clears, the ring of scoured earth and the settled chips
 * say three swings happened here — count the grain clusters.
 */
const whirlwind: AbilitySig = {
  spawn(c) {
    const rand = srand(c.seed ^ 0x31);
    // Each pulse inhales a sip of the loose ground into its spin.
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      const rr = c.radius * (0.4 + rand() * 0.5);
      c.particles.burst(c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr * c.squash, 1,
        ['#8a8494', c.st.mid, c.st.deep], {
          speed: 1.6, life: 0.7, size: 0.09, gravity: -3.2, dir: a + Math.PI * 0.55,
          spread: 0.3, shape: 'shard', spin: 12, drag: 0.8,
        });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const layR = srand(c.seed ^ 0x3e);
    const fade = 1 - t;
    ctx.save();
    ctx.lineCap = 'butt';
    // The scoured scar: each pulse cuts at modest alpha — overlapping
    // pulses visibly deepen the churn, honestly.
    ctx.globalAlpha = 0.35 * fade;
    ctx.fillStyle = shade(st.deep, -8);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.95, rPx * 0.95 * squash, 0, 0, Math.PI * 2);
    ctx.ellipse(px, py, rPx * 0.58, rPx * 0.58 * squash, 0, Math.PI * 2, 0, true);
    ctx.fill();
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.05);
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.61, rPx * 0.61 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Scour nicks travelling with the spin, phase-spaced per pulse.
    const spinOff = (c.seed % 11) * 0.6;
    ctx.globalAlpha = 0.7 * fade;
    ctx.strokeStyle = st.spark;
    ctx.lineWidth = Math.max(2, sc * 0.045);
    for (let k = 0; k < 4; k++) {
      const a = c.now / 90 + spinOff + (k / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * (0.72 + (k % 2) * 0.12), rPx * (0.72 + (k % 2) * 0.12) * squash, 0, a, a + 0.22);
      ctx.stroke();
    }
    // THE SLING: as this pulse dies it throws its chips wide — they
    // land and STAY — and lays its share of the churned ring.
    if (crossed(c, 680, 0.85)) {
      c.particles.burst(c.wx, c.wy, 4, ['#a89a58', st.mid, '#8a8494'], {
        speed: 1.6, life: 2.2, size: 0.055, gravity: 0, shape: 'shard', spin: 9,
        z: 0.7, vz: 1.2, zg: 4, land: 'settle', layer: 'world',
      });
      for (let k = 0; k < 3; k++) {
        const a = layR() * Math.PI * 2;
        lay(c, c.wx + Math.cos(a) * c.radius * 0.85, c.wy + Math.sin(a) * c.radius * 0.85 * squash,
          '#4a3c28', { life: 7 + layR(), size: 0.06, fade: '#33291a', fadeAt: 0.5 });
      }
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x3d);
    const fade = t < 0.55 ? 1 : (1 - t) / 0.45;
    const lift = sc * 0.45;
    ctx.save();
    ctx.lineCap = 'butt';
    // THIS PULSE'S BLADE: one banded crescent (deep sleeve, steel,
    // white leading edge) at a height this wire owns — overlapping
    // pulses stack into the visible cyclone.
    const hv = (c.seed >> 4) % 3;
    const a0 = c.now / 75 + hv * 2.1 + (c.seed % 7);
    const rr = rPx * (0.82 - hv * 0.14);
    const lk = lift + sc * 0.2 * hv;
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = shade(st.deep, -6);
    ctx.lineWidth = Math.max(4.5, sc * 0.16);
    ctx.beginPath();
    ctx.ellipse(px, py - lk, rr, rr * squash, 0, a0, a0 + 1.9);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = hv === 1 ? shade(st.mid, 10) : st.mid;
    ctx.lineWidth = Math.max(2.8, sc * 0.11);
    ctx.beginPath();
    ctx.ellipse(px, py - lk, rr, rr * squash, 0, a0 + 0.06, a0 + 1.86);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.8, sc * 0.045);
    ctx.beginPath();
    ctx.ellipse(px, py - lk, rr, rr * squash, 0, a0 + 1.6, a0 + 1.9);
    ctx.stroke();
    // Sparks shed off the blade tip.
    if (Math.random() < c.frameDt * 20 * fade) {
      const tipA = a0 + 1.9;
      c.particles.burst(c.wx + (Math.cos(tipA) * rr) / sc, c.wy + (Math.sin(tipA) * rr * squash) / sc, 1,
        [st.spark, st.core], {
          speed: 2.8, life: 0.3, size: 0.06, gravity: 2.5, dir: tipA + Math.PI / 2,
          spread: 0.4, shape: 'streak',
        });
    }
    // Caught debris rides this pulse's column: three torn quads
    // spiralling upward, tumbling as they climb.
    for (let k = 0; k < 3; k++) {
      const phase = rand() * Math.PI * 2;
      const climb = ((t * (0.7 + rand() * 0.6)) + rand()) % 1;
      const a = phase + c.now / (140 + k * 30);
      const qr = rPx * (0.75 - climb * 0.35);
      const y = py - lift * 0.4 - climb * sc * 0.95;
      const x = px + Math.cos(a) * qr;
      const yy = y + Math.sin(a) * qr * squash * 0.5;
      const spin = c.now / 110 + k * 2.3;
      const g = sc * (0.05 + rand() * 0.035) * (1 - climb * 0.4);
      ctx.globalAlpha = 0.85 * fade * Math.sin(Math.min(1, climb * 1.4) * Math.PI);
      ctx.translate(x, yy);
      ctx.rotate(spin % (Math.PI * 2));
      ctx.fillStyle = shade(st.deep, -4);
      ctx.fillRect(-g, -g * 0.7, g * 2, g * 1.4);
      ctx.fillStyle = k % 2 === 0 ? st.mid : shade(st.deep, 18);
      ctx.fillRect(-g * 0.75, -g * 0.5, g * 1.5, g);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 0.8, 0.25 * fade);
  },
};

/**
 * SMOKE_BOMB — "the spent shell."
 * One white slit of igniter flash — the only hard light this art
 * will ever allow — then ink in water: a charcoal column climbs and
 * MUSHROOMS flat under an invisible ceiling, its rim curling down
 * in slow rolls while tendrils hunt along the floor. When the dark
 * thins, the receipt remains: the split iron casing of the bomb
 * itself lying at the heart, pin glinting beside it, inside a soot
 * ring — nine seconds of proof of exactly where the night came from.
 */
const smoke_bomb: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // The night blooms: the shadow library's ink masses ARE the
    // charcoal flower; tendrils crawl the floor; the veil hangs on.
    shadow.deployments.bloom!(m, c.wx, c.wy, { scale: 1.15 });
    shadow.deployments.tendrils!(m, c.wx, c.wy, { scale: 0.9 });
    shadow.deployments.veil!(m, c.wx, c.wy, {
      radius: c.radius * 0.75, dur: 1.3, scale: 0.8,
    });
    // THE SPENT SHELL: two split casing halves, the pin, a soot ring.
    const rand = srand(c.seed ^ 0x41a);
    const sa = rand() * Math.PI;
    for (const side of [-1, 1] as const) {
      lay(c, c.wx + Math.cos(sa) * 0.1 * side, c.wy + Math.sin(sa) * 0.08 * side,
        '#2a2431', { life: 9, size: 0.075, fade: '#1c1826', fadeAt: 0.6 });
    }
    lay(c, c.wx + Math.cos(sa + 1.8) * 0.2, c.wy + Math.sin(sa + 1.8) * 0.15,
      '#c9c4b4', { life: 8.5, size: 0.04, flicker: 5, fade: '#8a8478', fadeAt: 0.6 });
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2;
      lay(c, c.wx + Math.cos(a) * (0.3 + rand() * 0.2), c.wy + Math.sin(a) * (0.25 + rand() * 0.15),
        '#221c2e', { life: 7.5 + rand(), size: 0.06, fade: '#16121e', fadeAt: 0.55 });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x42);
    const fade = 1 - t;
    ctx.save();
    // Tendrils creep outward — smoke hunting along the ground, each
    // arm a bent wedge on its own reach clock with a soot bead head.
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      const reach = Math.min(1, (t * 2.2) / (0.6 + rand() * 0.5));
      const len = rPx * (0.7 + rand() * 0.5) * reach;
      const bend = (rand() - 0.5) * 1.1;
      const w = sc * (0.1 + rand() * 0.06) * (1 - reach * 0.4);
      const mx = px + Math.cos(a + bend * 0.5) * len * 0.55;
      const my = py + Math.sin(a + bend * 0.5) * len * 0.55 * squash;
      const ex = px + Math.cos(a + bend) * len;
      const ey = py + Math.sin(a + bend) * len * squash;
      ctx.globalAlpha = 0.4 * fade;
      ctx.fillStyle = k % 2 === 0 ? st.deep : '#221c2e';
      ctx.beginPath();
      ctx.moveTo(px - Math.sin(a) * w, py + Math.cos(a) * w * squash);
      ctx.lineTo(mx - Math.sin(a + bend * 0.5) * w * 0.7, my + Math.cos(a + bend * 0.5) * w * 0.7 * squash);
      ctx.lineTo(ex, ey);
      ctx.lineTo(mx + Math.sin(a + bend * 0.5) * w * 0.7, my - Math.cos(a + bend * 0.5) * w * 0.7 * squash);
      ctx.lineTo(px + Math.sin(a) * w, py - Math.cos(a) * w * squash);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.5 * fade * Math.sin(Math.min(1, reach) * Math.PI);
      ctx.fillStyle = '#221c2e';
      ctx.beginPath();
      ctx.ellipse(ex, ey, w * 0.85, w * 0.6 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x43);
    ctx.save();
    // The igniter: a white star snap with the slit through its heart.
    if (t < 0.07) {
      const ft = 1 - t / 0.07;
      ctx.globalAlpha = 0.85 * ft;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      burstStarPath(ctx, px, py - sc * 0.4, sc * 0.3 * ft + sc * 0.08, sc * 0.07, 5, (c.seed % 6) * 0.5);
      ctx.fill();
      ctx.save();
      ctx.translate(px, py - sc * 0.4);
      ctx.rotate((c.seed % 6) * 0.5);
      ctx.globalAlpha = ft;
      ctx.fillRect(-sc * 0.42 * ft, -Math.max(1.5, sc * 0.035), sc * 0.84 * ft, Math.max(3, sc * 0.07));
      ctx.restore();
    }
    // INK IN WATER: the column climbs first...
    const thin = t < 0.6 ? 1 : (1 - t) / 0.4;
    const colU = cl(t / 0.24);
    if (colU < 1) {
      for (let k = 0; k < 3; k++) {
        const ku = (k + 0.5) / 3;
        if (ku > colU * 1.2) continue;
        const s = sc * (0.16 + k * 0.05);
        const breathe = 1 + 0.1 * Math.sin(c.now / 200 + k * 2);
        ctx.globalAlpha = 0.5 * thin;
        ctx.fillStyle = k % 2 === 0 ? shade(st.deep, -8) : st.deep;
        ctx.beginPath();
        ctx.ellipse(px + Math.sin(k * 2.4) * sc * 0.05, py - sc * 0.15 - ku * sc * 0.7 * colU,
          s * breathe, s * 0.8 * breathe, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // ...then MUSHROOMS: the flat canopy spreads under its ceiling,
    // lobed dark bellies with moon caps, rim curling down in rolls.
    const mush = cl((t - 0.18) / 0.32);
    if (mush > 0) {
      const cy = py - sc * 0.88;
      const crx = rPx * (0.3 + 0.45 * mush);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + rand() * 0.4;
        const breathe = 1 + 0.1 * Math.sin(c.now / 260 + k * 2.2);
        const s = sc * (0.24 + rand() * 0.12) * breathe * mush;
        const bx = px + Math.cos(a) * crx * 0.72;
        const by = cy + Math.sin(a) * crx * 0.26;
        ctx.globalAlpha = (0.42 - k * 0.04) * thin;
        ctx.fillStyle = k % 2 === 0 ? shade(st.deep, -8) : st.deep;
        ctx.beginPath();
        ctx.ellipse(bx, by, s, s * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = (0.3 - k * 0.04) * thin;
        ctx.fillStyle = k % 2 === 0 ? st.mid : shade(st.mid, 10);
        ctx.beginPath();
        ctx.ellipse(bx - s * 0.18, by - s * 0.28, s * 0.6, s * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // The rim curls: four C-rolls turning slowly downward at the
      // canopy's edge — ink rolling under the ceiling it found.
      ctx.strokeStyle = shade(st.deep, 10);
      ctx.lineWidth = Math.max(2, sc * 0.05);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.5 + c.now / 2600;
        const bx = px + Math.cos(a) * crx;
        const by = cy + Math.sin(a) * crx * 0.3;
        const curl = c.now / 900 + k * 1.7;
        ctx.globalAlpha = 0.5 * thin * mush;
        ctx.beginPath();
        ctx.arc(bx, by + sc * 0.06, sc * 0.09, curl, curl + 3.6);
        ctx.stroke();
      }
    }
    // The canopy sheds: soot motes sift off its underside.
    if (Math.random() < c.frameDt * 8 * thin) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.5, c.wy + Math.sin(a) * c.radius * 0.3 * squash - 0.4, 1,
        [st.deep, '#221c2e'], {
          speed: 0.3, life: 0.8, size: 0.08, gravity: 0.6, drag: 1.8, wobble: 0.5,
        });
    }
    ctx.restore();
  },
};

/**
 * CRESCENT_SWEEP — "the moon that waxes."
 * The full spin hangs a blade-moon in the air that laps the body
 * exactly once — and runs its PHASES as it hunts: new and thin at
 * the draw, waxing to a full fat belly at the far side of the lap,
 * waning to nothing as it comes home. Gold chips shed off the horn;
 * where the moon rode full, four red droplets land past the rim and
 * stay — the bleed, promised at the exact quarter it was earned.
 * The pivot's twin heel scuffs sit at the caster's feet for seven
 * seconds: the spin had an axis, and you were it.
 */
const crescent_sweep: AbilitySig = {
  spawn(c) {
    // The spin plants its heel: turf kicked, and the scuffs KEEP.
    c.particles.burst(c.wx, c.wy, 5, ['#4a4252', '#5a5045'], {
      speed: 1.1, life: 0.8, size: 0.1, gravity: -0.3, drag: 1.9, grow: 0.2, shape: 'puff', ground: true,
    });
    const rand = srand(c.seed ^ 0x51a);
    for (const side of [-1, 1] as const) {
      lay(c, c.wx + side * (0.12 + rand() * 0.05), c.wy + 0.08 * side,
        '#4a4252', { life: 7, size: 0.05, fade: '#332e3c', fadeAt: 0.55 });
    }
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const lift = sc * 0.42;
    ctx.save();
    ctx.lineCap = 'butt';
    // THE PHASED MOON: one lap, waxing to full at the lap's far side.
    const a0 = -Math.PI / 2 + t * Math.PI * 2.1;
    const rr = rPx * (0.72 + 0.18 * t);
    const phase = Math.sin(cl(t * 1.05) * Math.PI);
    const fade = t < 0.78 ? 1 : (1 - t) / 0.22;
    const arcLen = 0.9 + phase * 0.75;
    // Deep sleeve under, gold body, white honed edge leading.
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = shade(st.deep, -6);
    ctx.lineWidth = Math.max(4, sc * (0.08 + 0.15 * phase));
    ctx.beginPath();
    ctx.ellipse(px, py - lift, rr, rr * squash, 0, a0, a0 + arcLen);
    ctx.stroke();
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3, sc * (0.055 + 0.12 * phase));
    ctx.beginPath();
    ctx.ellipse(px, py - lift, rr, rr * squash, 0, a0 + 0.06, a0 + arcLen - 0.03);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.045);
    ctx.beginPath();
    ctx.ellipse(px, py - lift, rr * 1.04, rr * 1.04 * squash, 0, a0 + arcLen - 0.45, a0 + arcLen);
    ctx.stroke();
    // The horn sheds gold chips as it cuts.
    if (Math.random() < c.frameDt * 20 * fade) {
      const tip = a0 + arcLen;
      c.particles.burst(c.wx + (Math.cos(tip) * rr) / sc, c.wy + (Math.sin(tip) * rr * squash) / sc, 1,
        [st.spark, st.mid], {
          speed: 2.2, life: 0.35, size: 0.06, gravity: 3, dir: tip + Math.PI / 2,
          spread: 0.5, shape: 'shard', spin: 10,
        });
    }
    // THE FULL QUARTER PAYS: where the moon rode full, the bleed
    // lands — four red droplets past the rim, staying.
    if (crossed(c, 680, 0.55)) {
      const rand = srand(c.seed ^ 0x51b);
      for (let k = 0; k < 4; k++) {
        const a = a0 - 0.2 - k * 0.22;
        lay(c, c.wx + Math.cos(a) * c.radius * (0.95 + rand() * 0.25),
          c.wy + Math.sin(a) * c.radius * (0.95 + rand() * 0.25) * squash,
          '#8e2a20', { life: 6.5 + rand(), size: 0.045, fade: '#421410', fadeAt: 0.5 });
      }
    }
    // The wound remembers: bleed flecks tick off the rim, late.
    if (t > 0.45 && Math.random() < c.frameDt * 9) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.8, c.wy + Math.sin(a) * c.radius * 0.8 * squash, 1,
        ['#c4372a', '#6a1518'], {
          speed: 0.7, life: 0.45, size: 0.05, gravity: 6, up: true, fade: '#6a1518',
        });
    }
    ctx.restore();
  },
};

/**
 * LUNGE — "the thread pulled taut."
 * The dash is a needle and the world is cloth: the flight line BOWS
 * like thread still being pulled, then SNAPS straight at the moment
 * of arrival — a white whip-crack star at the far end, steel
 * slivers carrying through past the stop. Chevrons collapse along
 * the line toward the arrival. What stays is a sewn seam: two heel
 * scuffs at the departure, one white stitch at the midpoint, two
 * red pin-pricks at the arrival — the whole pass, readable on the
 * ground seven seconds after the body has moved on.
 */
const lunge: AbilitySig = {
  spawn(c) {
    const ang = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    // The burst-through: air and steel slivers carry past the stop.
    c.particles.burst(c.wx2, c.wy2 - 0.35, 7, [c.st.core, c.st.mid], {
      speed: 3.4, life: 0.3, size: 0.06, gravity: 1.5, dir: ang, spread: 0.35, shape: 'streak',
    });
    // Heel scuffs at the departure, kicked AND kept.
    c.particles.burst(c.wx, c.wy, 4, ['#4a4252', '#3a3442'], {
      speed: 0.8, life: 0.7, size: 0.1, gravity: -0.3, drag: 2.0, grow: 0.2,
      dir: ang + Math.PI, spread: 0.5, shape: 'puff', ground: true,
    });
    const rand = srand(c.seed ^ 0x61a);
    for (const side of [-1, 1] as const) {
      lay(c, c.wx - Math.cos(ang) * 0.15 + Math.cos(ang + Math.PI / 2) * side * 0.1,
        c.wy - Math.sin(ang) * 0.15 + Math.sin(ang + Math.PI / 2) * side * 0.1,
        '#3a3442', { life: 7 + rand() * 0.5, size: 0.05, fade: '#292432', fadeAt: 0.55 });
    }
    // The seam: one white stitch pair at the midpoint of the pass.
    const mx = (c.wx + c.wx2) / 2;
    const my = (c.wy + c.wy2) / 2;
    for (const u of [-1, 1] as const) {
      lay(c, mx + Math.cos(ang) * 0.08 * u, my + Math.sin(ang) * 0.08 * u,
        '#ffffff', { life: 6, size: 0.035, flicker: 4, fade: '#c9c4b4', fadeAt: 0.5 });
    }
  },
  air(c) {
    const { ctx, st, t, sc, px, py, px2, py2 } = c;
    const lift = sc * 0.42;
    const dx = px2 - px;
    const dy = py2 - py;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const fade = 1 - t;
    ctx.save();
    // THE THREAD: bowed while pulled, snapped dead straight at 0.26.
    const bowT = cl(t / 0.26);
    const sag = Math.sin(bowT * Math.PI) * sc * 0.15;
    ctx.globalAlpha = 0.9 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(2, sc * 0.045);
    ctx.beginPath();
    ctx.moveTo(px, py - lift);
    ctx.quadraticCurveTo((px + px2) / 2 + nx * sag, (py + py2) / 2 - lift + ny * sag, px2, py2 - lift);
    ctx.stroke();
    // Chevrons collapse toward the arrival: the stitch running home.
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.05);
    for (let k = 0; k < 3; k++) {
      const f = Math.min(1, t * 1.8 + k * 0.2);
      if (f >= 1) continue;
      const bowOff = Math.sin(f * Math.PI) * sag;
      const bx = px + dx * f + nx * bowOff;
      const by = py + dy * f - lift + ny * bowOff;
      const s = sc * 0.17 * (1 - f * 0.5);
      ctx.globalAlpha = (1 - f) * 0.9 * fade;
      ctx.beginPath();
      ctx.moveTo(bx - ux * s + nx * s * 0.8, by - uy * s + ny * s * 0.8);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx - ux * s - nx * s * 0.8, by - uy * s - ny * s * 0.8);
      ctx.stroke();
    }
    // THE WHIP-CRACK: the snap arrives as a white star at the far
    // end, gone in a blink — the thread pulled taut.
    const crack = 1 - cl((t - 0.26) / 0.14);
    if (t >= 0.26 && crack > 0) {
      ctx.globalAlpha = 0.95 * crack;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      burstStarPath(ctx, px2, py2 - lift, sc * 0.18 * crack + sc * 0.05, sc * 0.05, 4, (c.seed % 6) * 0.6);
      ctx.fill();
    }
    if (crossed(c, 380, 0.26)) {
      const ang = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
      c.particles.burst(c.wx2, c.wy2 - 0.3, 3, [st.core, '#ffffff'], {
        speed: 2.2, life: 0.25, size: 0.05, gravity: 1, dir: ang, spread: 0.25, shape: 'streak',
      });
      // The arrival keeps its pin-pricks: two red points, staying.
      const rand = srand(c.seed ^ 0x61b);
      for (let k = 0; k < 2; k++) {
        lay(c, c.wx2 + Math.cos(ang) * (0.12 + k * 0.1) + (rand() - 0.5) * 0.06,
          c.wy2 + Math.sin(ang) * (0.12 + k * 0.1),
          '#8e2a20', { life: 6 + rand() * 0.5, size: 0.035, fade: '#421410', fadeAt: 0.5 });
      }
    }
    ctx.restore();
  },
};

/**
 * SHOCKWAVE — "the bell of earth."
 * The slam rings the ground like struck bronze — and a bell's note
 * is not one wave but a TONE: three concentric earthen swells pump
 * outward in beats, each a traveling bulge with a dark under-shadow
 * and a lit crest, dying as they reach the rim, where five sod tabs
 * flip and lie with their pale undersides up. The point of impact
 * keeps its cracked boss — the dent the world took — and when the
 * tone dies the dent stays: a four-armed crack star written in dark
 * grains for eight seconds, ringed by the flipped sod. The cornered
 * wave was returned to the shield that owns it; the bell rings round.
 */
const shockwave: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // THE GROUND SMASH, in full: skirt, chunk heroes, billow, fines.
    dust.deployments.slam!(m, c.wx, c.wy, { scale: 1.2 });
    dust.deployments.skirt!(m, c.wx, c.wy, {
      radius: c.radius * 0.45, dur: 0.4, scale: 0.9,
    });
    // THE CRACK STAR, laid for keeps: four arms of dark grains
    // radiating from the boss, plus the dent's own heart.
    const rand = srand(c.seed ^ 0x71a);
    const baseA = rand() * Math.PI * 2;
    for (let k = 0; k < 4; k++) {
      const a = baseA + (k / 4) * Math.PI * 2 + (rand() - 0.5) * 0.3;
      for (let s = 1; s <= 2; s++) {
        lay(c, c.wx + Math.cos(a) * c.radius * 0.14 * s, c.wy + Math.sin(a) * c.radius * 0.14 * s * c.squash,
          '#241c14', { life: 7.5 + rand(), size: 0.05, fade: '#171009', fadeAt: 0.55 });
      }
    }
    lay(c, c.wx, c.wy, '#241c14', { life: 8.5, size: 0.075, fade: '#171009', fadeAt: 0.6 });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = 1 - t;
    ctx.save();
    // THE TONE: three traveling swells, launched in beats, each a
    // bulge — dark under-shadow, lit crest, thin white lip.
    for (let w = 0; w < 3; w++) {
      const u = cl((t - w * 0.16) / 0.5);
      if (u <= 0 || u >= 1) continue;
      const rr = rPx * Math.sqrt(u) * 0.98;
      const die = 1 - u;
      ctx.globalAlpha = 0.6 * die;
      ctx.strokeStyle = '#241c14';
      ctx.lineWidth = Math.max(3, sc * 0.1 * (1 - u * 0.4));
      ctx.beginPath();
      ctx.ellipse(px, py + 1.5, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.85 * die;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(3, sc * 0.08 * (1 - u * 0.4));
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.9 * die;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.2, sc * 0.025);
      ctx.beginPath();
      ctx.ellipse(px, py, rr * 1.03, rr * 1.03 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // THE SOD TABS: when the first swell reaches the rim, five tabs
    // flip — pale undersides up, painted while the wire lives, laid
    // as grains for the eight seconds after.
    const rand = srand(c.seed ^ 0x71b);
    const tabs: Array<[number, number, number]> = [];
    for (let k = 0; k < 5; k++) {
      tabs.push([
        (k / 5) * Math.PI * 2 + rand() * 0.35,
        0.88 + rand() * 0.1,
        0.09 + rand() * 0.03,
      ]);
    }
    if (t >= 0.36) {
      for (const [a, rrF, gF] of tabs) {
        const x = px + Math.cos(a) * rPx * rrF;
        const y = py + Math.sin(a) * rPx * rrF * squash;
        const g = sc * gF;
        ctx.globalAlpha = 0.9 * fade;
        ctx.fillStyle = '#4a3c28';
        ctx.fillRect(x - g, y - g * 0.5, g * 2, g);
        ctx.fillStyle = '#8a7a5c';
        ctx.fillRect(x - g, y - g * 0.5, g * 2, g * 0.4);
      }
    }
    if (crossed(c, 680, 0.36)) {
      for (let k = 0; k < 5; k++) {
        const [a, rrF] = tabs[k]!;
        lay(c, c.wx + Math.cos(a) * c.radius * rrF, c.wy + Math.sin(a) * c.radius * rrF * squash,
          '#8a7a5c', { life: 7.5 + k * 0.2, size: 0.06, fade: '#4a3c28', fadeAt: 0.45 });
      }
    }
    // THE BOSS: the dent at the point of impact, cooling cracked.
    if (t < 0.6) {
      const bt = 1 - t / 0.6;
      ctx.globalAlpha = bt * 0.85;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.16, rPx * 0.16 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      const rand2 = srand(c.seed ^ 0x52);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1, sc * 0.028);
      ctx.globalAlpha = bt * 0.9;
      for (let k = 0; k < 4; k++) {
        const a = rand2() * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a) * rPx * 0.1, py + Math.sin(a) * rPx * 0.1 * squash);
        ctx.lineTo(px + Math.cos(a + (rand2() - 0.5) * 0.5) * rPx * (0.3 + rand2() * 0.2),
          py + Math.sin(a + (rand2() - 0.5) * 0.5) * rPx * (0.3 + rand2() * 0.2) * squash);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    // The tone rises: two thin air-rings shiver upward and die —
    // sound made visible, briefly, wobbling at bell frequency.
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    if (t > 0.5) return;
    const ft = 1 - t / 0.5;
    ctx.save();
    for (let k = 0; k < 2; k++) {
      const rise = sc * (0.25 + k * 0.22) * (1 - ft);
      const shiver = 1 + 0.06 * Math.sin(c.now / 55 + k * 2);
      ctx.globalAlpha = ft * (0.4 - k * 0.15);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1, sc * 0.03);
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.3 - rise, rPx * 0.4 * (1 + k * 0.3) * shiver, rPx * 0.16 * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
};

// -------------------------------------------------------- registry

/**
 * Every ability with a bespoke signature. The grammar keeps abilities
 * without an entry fully dressed — this table is the crown, added
 * wave by wave until the whole roster owns one.
 */
export const SIGNATURES: Record<string, AbilitySig> = {
  fireburst,
  frost_nova,
  whirlwind,
  smoke_bomb,
  crescent_sweep,
  lunge,
  shockwave,
  ...MELEE_SIGS,
  ...SNEAK_SIGS,
  ...ARCHERY_SIGS,
  ...ARX_SIGS,
  ...ARX_BREATH_SIGS,
  ...ARCHER_SIGS,
  ...ROGUE_SIGS,
  ...BLADE_SIGS,
  ...ARCHMAGE_A_SIGS,
  ...ARCHMAGE_B_SIGS,
  ...RELIC_SIGS,
  ...SHIELD_SIGS,
  ...TWOHAND_SIGS,
  ...DUALWIELD_SIGS,
  ...COMBAT_SIGS,
  ...VOICES_SIGS,
  ...FLIGHTS_SIGS,
  ...BEASTCRAFT_SIGS,
  ...FOES_SIGS,
  ...GOLEM_SIGS,
  ...OGRE_SIGS,
};
