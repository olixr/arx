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
import { srand, type FxStyle } from './abilityFx.js';
import type { Particles } from './particles.js';
import { fire, frost, dust, shadow, asMatter } from './matter/index.js';
import { MELEE_SIGS } from './fxSigsMelee.js';
import { SNEAK_SIGS } from './fxSigsSneak.js';
import { ARCHERY_SIGS } from './fxSigsArchery.js';
import { ARX_SIGS } from './fxSigsArx.js';
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
];

// ------------------------------------------------------- exemplars

/**
 * FIREBURST — "the kiln cracks open."
 * Molten gobbets comet out and land burning; the crater keeps a
 * white-hot heart threaded by molten seams; a crown of true flame
 * tongues stands over the impact while heat-shimmer slivers climb.
 */
const fireburst: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // The kiln's throw: molten gobbets comet out on REAL arcs and
    // land still burning — they lie in the crater cooling to coals.
    fire.deployments.gobbets!(m, c.wx, c.wy, { scale: 1 });
    // The detonation itself: heart-flash, hot crown, sparks, coals,
    // one soot exhale — the mastered fire voice at full weight.
    fire.deployments.burst!(m, c.wx, c.wy, { scale: 1.05 });
    // The rim ignites where the shock passes: a burning hoop that
    // WRAPS whoever stands inside it, then starves.
    fire.deployments.ring!(m, c.wx, c.wy, {
      radius: c.radius * 0.55, dur: 0.85, scale: 0.75,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x12);
    const fade = 1 - t;
    ctx.save();
    // The white-hot heart, cooling from the edge in.
    if (t < 0.45) {
      const ht = 1 - t / 0.45;
      ctx.globalAlpha = ht * 0.75;
      ctx.fillStyle = st.core;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.3 * ht, rPx * 0.3 * ht * squash, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Molten seams: cracks of fire threading the crater, each on its
    // own cooling clock.
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      const r0 = rPx * (0.12 + rand() * 0.2);
      const r1 = rPx * (0.5 + rand() * 0.45);
      const bend = (rand() - 0.5) * 0.9;
      const heat = Math.max(0, 1 - t / (0.5 + rand() * 0.4));
      if (heat <= 0) continue;
      const pulse = 0.6 + 0.4 * Math.sin(c.now / 150 + k * 2.1);
      ctx.globalAlpha = heat * pulse;
      ctx.strokeStyle = k % 2 === 0 ? st.spark : st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.045 * heat);
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0 * squash);
      const am = a + bend * 0.5;
      ctx.lineTo(px + Math.cos(am) * (r0 + r1) * 0.5, py + Math.sin(am) * (r0 + r1) * 0.5 * squash);
      ctx.lineTo(px + Math.cos(a + bend) * r1, py + Math.sin(a + bend) * r1 * squash);
      ctx.stroke();
    }
    ctx.globalAlpha = fade;
    ctx.restore();
    c.glow(c.wx, c.wy, c.radius * 1.1, 0.5 * fade);
  },
  air(c) {
    const { ctx, st, t, sc, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x13);
    ctx.save();
    // The flame crown: true tongues standing over the impact, each
    // with a hot core wedge, shrinking as the burst spends itself.
    if (t < 0.55) {
      const ft = 1 - t / 0.55;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + rand() * 0.5;
        const bx = px + Math.cos(a) * rPx * (0.2 + rand() * 0.25);
        const h = sc * (0.5 + rand() * 0.55) * ft;
        const w = sc * (0.1 + rand() * 0.07) * (0.8 + 0.2 * Math.sin(c.now / 90 + k * 2.3));
        const lean = Math.sin(c.now / 160 + k * 1.7) * w * 0.6;
        ctx.globalAlpha = 0.9 * ft;
        ctx.fillStyle = k % 2 === 0 ? st.mid : shade(st.mid, 14);
        ctx.beginPath();
        ctx.moveTo(bx - w, py);
        ctx.lineTo(bx + lean, py - h);
        ctx.lineTo(bx + w, py);
        ctx.closePath();
        ctx.fill();
        // The hot core feeds from beneath.
        ctx.fillStyle = st.core;
        ctx.beginPath();
        ctx.moveTo(bx - w * 0.45, py);
        ctx.lineTo(bx + lean * 0.5, py - h * 0.55);
        ctx.lineTo(bx + w * 0.45, py);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Heat shimmer: thin slivers climb and wriggle above the crater.
    if (t < 0.85) {
      const ht = 1 - t / 0.85;
      ctx.globalAlpha = 0.4 * ht;
      ctx.fillStyle = st.core;
      for (let k = 0; k < 6; k++) {
        const bx = px + (rand() - 0.5) * rPx * 1.3;
        const by = py - sc * (0.3 + rand() * 0.9) - (c.age / 1000) * sc * 0.8;
        const wig = Math.sin(c.now / 110 + k * 2.6) * sc * 0.05;
        ctx.fillRect(bx + wig, by, Math.max(1.5, sc * 0.03), sc * 0.16);
      }
    }
    ctx.restore();
  },
};

/**
 * FROST_NOVA — "the hoarfrost web."
 * The shock does not burn outward, it CRYSTALLIZES: a lattice of
 * frost chords grows node by node across the ground while mist
 * banks roll off the rim and glints hang in the frozen air.
 */
const frost_nova: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // The pane breaks at the heart: shards snap out tumbling, LAND,
    // and lie as frost chips while the cold sinks after them.
    frost.deployments.shatter!(m, c.wx, c.wy, { scale: 0.8 });
    // The cold arrives as weather: a slow rim of sinking mist and
    // sparkle rolling outward off the shock.
    frost.deployments.bloom!(m, c.wx, c.wy, {
      radius: c.radius * 0.6, dur: 0.9, scale: 0.9,
    });
    // The frozen air over the web: glints winking in for as long as
    // the web lives — the sustained sparkle the lattice deserves.
    frost.deployments.fog!(m, c.wx, c.wy, {
      radius: c.radius * 0.85, dur: 1.1, scale: 0.7,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x22);
    const reach = Math.min(1, t / 0.55); // the web grows center-out
    const fade = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.save();
    ctx.lineCap = 'butt';
    // Eight spokes, two chord rings: a web whose chords SNAP into
    // place one by one as the frost claims the ground.
    const n = 8;
    const nodes: Array<{ x: number; y: number }> = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + (c.seed % 5) * 0.3;
      const rr = rPx * (0.82 + rand() * 0.18);
      nodes.push({ x: px + Math.cos(a) * rr, y: py + Math.sin(a) * rr * squash });
    }
    for (let k = 0; k < n; k++) {
      const grown = Math.min(1, Math.max(0, reach * 1.5 - (k / n) * 0.5));
      if (grown <= 0) continue;
      const nd = nodes[k]!;
      // Spoke: center to node, drawn to its grown length.
      ctx.globalAlpha = 0.65 * fade * grown;
      ctx.strokeStyle = k % 2 === 0 ? st.mid : st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.035);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + (nd.x - px) * grown, py + (nd.y - py) * grown);
      ctx.stroke();
      // Chord to the next node, only once both ends exist.
      if (grown >= 1) {
        const nx = nodes[(k + 1) % n]!;
        ctx.globalAlpha = 0.5 * fade;
        ctx.strokeStyle = st.core;
        ctx.lineWidth = Math.max(1, sc * 0.022);
        ctx.beginPath();
        ctx.moveTo(nd.x, nd.y);
        // The chord sags toward center — a web, not a polygon.
        ctx.lineTo((nd.x + nx.x) / 2 + (px - (nd.x + nx.x) / 2) * 0.18, (nd.y + nx.y) / 2 + (py - (nd.y + nx.y) / 2) * 0.18);
        ctx.lineTo(nx.x, nx.y);
        ctx.stroke();
        // The node blooms a facet star where the chords meet.
        const tw = 0.6 + 0.4 * Math.sin(c.now / 300 + k * 2.4);
        ctx.globalAlpha = 0.85 * fade * tw;
        ctx.fillStyle = '#ffffff';
        const g = sc * 0.045;
        ctx.fillRect(nd.x - g / 2, nd.y - g * 1.7, g, g * 3.4);
        ctx.fillRect(nd.x - g * 1.7, nd.y - g / 2, g * 3.4, g);
      }
    }
    ctx.restore();
  },
  air(c) {
    // The frozen air remembers — the frost.fog emitter spawned at
    // the shock keeps the glints winking in; here the cold only glows.
    c.glow(c.wx, c.wy, c.radius * 0.9, 0.3 * (1 - c.t));
  },
};

/**
 * WHIRLWIND — "the steel cyclone."
 * Three blade crescents orbit at body height, shedding sparks off
 * their tips; the turf below is scoured into a counter-rotating
 * scar while chips and dust ride the column upward.
 */
const whirlwind: AbilitySig = {
  spawn(c) {
    // The column inhales: dust and chips lift INTO the spin.
    const rand = srand(c.seed ^ 0x31);
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      const rr = c.radius * (0.4 + rand() * 0.5);
      c.particles.burst(c.wx + Math.cos(a) * rr, c.wy + Math.sin(a) * rr * c.squash, 1, ['#8a8494', c.st.mid, c.st.deep], {
        speed: 1.6, life: 0.7, size: 0.09, gravity: -3.2, dir: a + Math.PI * 0.55, spread: 0.3, shape: 'shard', spin: 12, drag: 0.8,
      });
    }
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = 1 - t;
    ctx.save();
    // The scoured scar: two counter-rotating dashed grooves.
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = st.deep;
    ctx.lineWidth = Math.max(2, sc * 0.06);
    ctx.setLineDash([sc * 0.16, sc * 0.11]);
    ctx.lineDashOffset = -c.now / 22;
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.88, rPx * 0.88 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.4 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1.5, sc * 0.04);
    ctx.setLineDash([sc * 0.1, sc * 0.14]);
    ctx.lineDashOffset = c.now / 28;
    ctx.beginPath();
    ctx.ellipse(px, py, rPx * 0.62, rPx * 0.62 * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = 1 - t;
    const lift = sc * 0.45;
    ctx.save();
    ctx.lineCap = 'butt';
    // Three blade crescents chase each other around the body, each a
    // steel band with a white leading edge; higher crescents ride
    // smaller radii — a cyclone, not a cylinder.
    for (let k = 0; k < 3; k++) {
      const a0 = c.now / 75 + (k * Math.PI * 2) / 3;
      const rr = rPx * (0.82 - k * 0.16);
      const lk = lift + sc * 0.22 * k;
      ctx.globalAlpha = (0.75 - k * 0.12) * fade;
      ctx.strokeStyle = k === 1 ? shade(st.mid, 10) : st.mid;
      ctx.lineWidth = Math.max(2.5, sc * (0.11 - k * 0.02));
      ctx.beginPath();
      ctx.ellipse(px, py - lk, rr, rr * squash, 0, a0, a0 + 1.9);
      ctx.stroke();
      // The white edge leads the cut.
      ctx.globalAlpha = 0.95 * fade;
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1.5, sc * 0.04);
      ctx.beginPath();
      ctx.ellipse(px, py - lk, rr, rr * squash, 0, a0 + 1.65, a0 + 1.9);
      ctx.stroke();
      // Sparks shed off the blade tip.
      if (Math.random() < c.frameDt * 22 * fade) {
        const tipA = a0 + 1.9;
        c.particles.burst(c.wx + (Math.cos(tipA) * rr) / sc, c.wy + (Math.sin(tipA) * rr * squash) / sc, 1, [st.spark, st.core], {
          speed: 2.8, life: 0.3, size: 0.06, gravity: 2.5, dir: tipA + Math.PI / 2, spread: 0.4, shape: 'streak',
        });
      }
    }
    ctx.restore();
  },
};

/**
 * SMOKE_BOMB — "the night bloom."
 * One white slit of igniter flash, then a charcoal flower: billow
 * lobes roil at body height, tendrils creep along the ground, and
 * the canopy sheds soot as it thins.
 */
const smoke_bomb: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // The night blooms: the shadow library's ink masses ARE the
    // charcoal flower — dense hearts, violet bruise-edge, and the
    // whole canopy swallowing whoever stands in it (world layer).
    shadow.deployments.bloom!(m, c.wx, c.wy, { scale: 1.15 });
    // The dark reaches: tendrils crawl the floor out of the burst.
    shadow.deployments.tendrils!(m, c.wx, c.wy, { scale: 0.9 });
    // And it HANGS — a veil holding the room dark past the bloom.
    shadow.deployments.veil!(m, c.wx, c.wy, {
      radius: c.radius * 0.75, dur: 1.3, scale: 0.8,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x42);
    const fade = 1 - t;
    ctx.save();
    // Tendrils creep outward from the burst — smoke hunting along
    // the ground, each arm a bent wedge on its own reach clock.
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
    }
    ctx.restore();
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const rand = srand(c.seed ^ 0x43);
    ctx.save();
    // The igniter flash: one white slit, gone in a blink.
    if (t < 0.07) {
      const ft = 1 - t / 0.07;
      ctx.globalAlpha = ft;
      ctx.fillStyle = '#ffffff';
      ctx.save();
      ctx.translate(px, py - sc * 0.4);
      ctx.rotate((c.seed % 6) * 0.5);
      ctx.fillRect(-sc * 0.42 * ft, -Math.max(1.5, sc * 0.035), sc * 0.84 * ft, Math.max(3, sc * 0.07));
      ctx.restore();
    }
    // The canopy: billow lobes roil at body height, thinning late —
    // each lobe breathes on its own clock and sags as the smoke dies.
    const thin = t < 0.6 ? 1 : (1 - t) / 0.4;
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      const rr = rPx * (0.2 + rand() * 0.55);
      const breathe = 1 + 0.12 * Math.sin(c.now / 240 + k * 2.2);
      const s = sc * (0.26 + rand() * 0.2) * breathe * (0.7 + t * 0.5);
      const bx = px + Math.cos(a) * rr;
      const by = py - sc * (0.35 + rand() * 0.5) + t * sc * 0.2;
      ctx.globalAlpha = (0.4 - k * 0.05) * thin;
      ctx.fillStyle = k % 2 === 0 ? st.deep : st.mid;
      ctx.beginPath();
      ctx.ellipse(bx, by, s, s * 0.8, Math.sin(c.now / 500 + k) * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // The canopy sheds: soot motes sift off its underside.
    if (Math.random() < c.frameDt * 8 * thin) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.5, c.wy + Math.sin(a) * c.radius * 0.3 * squash - 0.4, 1, [st.deep, '#221c2e'], {
        speed: 0.3, life: 0.8, size: 0.08, gravity: 0.6, drag: 1.8, wobble: 0.5,
      });
    }
    ctx.restore();
  },
};

/**
 * CRESCENT_SWEEP — "the second moon."
 * The full spin hangs a bladed crescent in the air that chases the
 * shockring once around the body and dissolves edge-first, shedding
 * gold chips where it passed. The wound it leaves keeps bleeding:
 * thin red flecks tick off the rim after the blade is gone.
 */
const crescent_sweep: AbilitySig = {
  spawn(c) {
    // The spin plants its heel: a boot-scuff of turf kicked both ways.
    c.particles.burst(c.wx, c.wy, 5, ['#4a4252', '#5a5045'], {
      speed: 1.1, life: 0.8, size: 0.1, gravity: -0.3, drag: 1.9, grow: 0.2, shape: 'puff', ground: true,
    });
  },
  air(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const lift = sc * 0.42;
    ctx.save();
    ctx.lineCap = 'butt';
    // The second moon: one bladed crescent lapping the body exactly
    // once over the life of the ring, fat at the belly, honed at the
    // horn — with a gold identity band under a white edge.
    const a0 = -Math.PI / 2 + t * Math.PI * 2.35;
    const rr = rPx * (0.72 + 0.2 * t);
    const fade = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(3, sc * 0.13);
    ctx.beginPath();
    ctx.ellipse(px, py - lift, rr, rr * squash, 0, a0, a0 + 1.5);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.045);
    ctx.beginPath();
    ctx.ellipse(px, py - lift, rr * 1.04, rr * 1.04 * squash, 0, a0 + 1.1, a0 + 1.5);
    ctx.stroke();
    // The horn sheds gold chips as it cuts.
    if (Math.random() < c.frameDt * 20 * fade) {
      const tip = a0 + 1.5;
      c.particles.burst(c.wx + (Math.cos(tip) * rr) / sc, c.wy + (Math.sin(tip) * rr * squash) / sc, 1, [st.spark, st.mid], {
        speed: 2.2, life: 0.35, size: 0.06, gravity: 3, dir: tip + Math.PI / 2, spread: 0.5, shape: 'shard', spin: 10,
      });
    }
    // The wound remembers: bleed flecks tick off the rim, late.
    if (t > 0.45 && Math.random() < c.frameDt * 9) {
      const a = Math.random() * Math.PI * 2;
      c.particles.burst(c.wx + Math.cos(a) * c.radius * 0.8, c.wy + Math.sin(a) * c.radius * 0.8 * squash, 1, ['#c4372a', '#6a1518'], {
        speed: 0.7, life: 0.45, size: 0.05, gravity: 6, up: true, fade: '#6a1518',
      });
    }
    ctx.restore();
  },
};

/**
 * LUNGE — "the needle."
 * The dash is a single stitched line: chevrons collapse along the
 * flight path toward the arrival, the departure keeps two heel
 * scuffs, and the arrival point bursts THROUGH — a thin push of air
 * continuing past the stop, the blade arriving before the body.
 */
const lunge: AbilitySig = {
  spawn(c) {
    const ang = Math.atan2(c.wy2 - c.wy, c.wx2 - c.wx);
    // The burst-through: air and steel slivers carry past the stop.
    c.particles.burst(c.wx2, c.wy2 - 0.35, 7, [c.st.core, c.st.mid], {
      speed: 3.4, life: 0.3, size: 0.06, gravity: 1.5, dir: ang, spread: 0.35, shape: 'streak',
    });
    // Heel scuffs at the departure — the ground remembers the push-off.
    c.particles.burst(c.wx, c.wy, 4, ['#4a4252', '#3a3442'], {
      speed: 0.8, life: 0.7, size: 0.1, gravity: -0.3, drag: 2.0, grow: 0.2, dir: ang + Math.PI, spread: 0.5, shape: 'puff', ground: true,
    });
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
    // Chevrons collapse toward the arrival: each arrowhead slides up
    // the line and dies as the next takes its place — the stitch.
    ctx.strokeStyle = st.core;
    ctx.lineWidth = Math.max(1.5, sc * 0.05);
    for (let k = 0; k < 4; k++) {
      const f = Math.min(1, t * 1.8 + k * 0.18);
      if (f >= 1) continue;
      const bx = px + dx * f;
      const by = py + dy * f - lift;
      const s = sc * 0.16 * (1 - f * 0.5);
      ctx.globalAlpha = (1 - f) * 0.9 * fade;
      ctx.beginPath();
      ctx.moveTo(bx - ux * s + nx * s * 0.8, by - uy * s + ny * s * 0.8);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx - ux * s - nx * s * 0.8, by - uy * s - ny * s * 0.8);
      ctx.stroke();
    }
    // The needle itself: one thin full-length line, sharpest early.
    ctx.globalAlpha = 0.7 * fade * fade;
    ctx.strokeStyle = st.mid;
    ctx.lineWidth = Math.max(1, sc * 0.03);
    ctx.beginPath();
    ctx.moveTo(px, py - lift);
    ctx.lineTo(px2, py2 - lift);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * SHOCKWAVE — "the bell of earth."
 * The slam rings the ground like struck bronze: a polygonal pressure
 * front lags the main ring with hammered corner ticks, sod slabs
 * flip along it, and the point of impact keeps a cracked boss —
 * the dent the world took — until the tone dies.
 */
const shockwave: AbilitySig = {
  spawn(c) {
    const m = asMatter(c);
    // THE GROUND SMASH, in full: the shock skirt races flat along
    // the floor, chunk heroes loft and HOP where they land, the
    // billow swallows the strike, and the fines rain back and lie
    // on the dirt — the earth remembers being struck.
    dust.deployments.slam!(m, c.wx, c.wy, { scale: 1.2 });
    // The pressure front's own dust: a rim wave driven outward just
    // behind the painted bell-ring.
    dust.deployments.skirt!(m, c.wx, c.wy, {
      radius: c.radius * 0.45, dur: 0.4, scale: 0.9,
    });
  },
  ground(c) {
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    const fade = 1 - t;
    ctx.save();
    // The pressure front: a hexagonal second ring lagging the round
    // one — bronze under white — with hammered ticks at the corners.
    const lag = Math.max(0, t - 0.12);
    const rr = rPx * Math.sqrt(lag);
    if (rr > 1) {
      ctx.globalAlpha = 0.7 * fade;
      ctx.strokeStyle = st.mid;
      ctx.lineWidth = Math.max(2.5, sc * 0.09 * fade + 1);
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const a = (c.seed % 5) * 0.3 + (k / 6) * Math.PI * 2;
        const x = px + Math.cos(a) * rr;
        const y = py + Math.sin(a) * rr * squash;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = st.core;
      for (let k = 0; k < 6; k++) {
        const a = (c.seed % 5) * 0.3 + (k / 6) * Math.PI * 2;
        const g = sc * 0.05 * fade;
        ctx.fillRect(px + Math.cos(a) * rr - g / 2, py + Math.sin(a) * rr * squash - g * 1.6, g, g * 3.2);
      }
    }
    // The boss: the dent at the point of impact, cooling cracked.
    if (t < 0.6) {
      const bt = 1 - t / 0.6;
      ctx.globalAlpha = bt * 0.8;
      ctx.fillStyle = st.deep;
      ctx.beginPath();
      ctx.ellipse(px, py, rPx * 0.16, rPx * 0.16 * squash, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1, sc * 0.025);
      const rand = srand(c.seed ^ 0x52);
      ctx.globalAlpha = bt * 0.9;
      for (let k = 0; k < 4; k++) {
        const a = rand() * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a) * rPx * 0.1, py + Math.sin(a) * rPx * 0.1 * squash);
        ctx.lineTo(px + Math.cos(a + (rand() - 0.5) * 0.5) * rPx * (0.3 + rand() * 0.2), py + Math.sin(a + (rand() - 0.5) * 0.5) * rPx * (0.3 + rand() * 0.2) * squash);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  air(c) {
    // The tone: two thin air-rings shiver upward off the impact and
    // die — sound made visible, briefly.
    const { ctx, st, t, sc, squash, px, py, rPx } = c;
    if (t > 0.5) return;
    const ft = 1 - t / 0.5;
    ctx.save();
    for (let k = 0; k < 2; k++) {
      const rise = sc * (0.25 + k * 0.22) * (1 - ft);
      ctx.globalAlpha = ft * (0.4 - k * 0.15);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = Math.max(1, sc * 0.03);
      ctx.beginPath();
      ctx.ellipse(px, py - sc * 0.3 - rise, rPx * 0.4 * (1 + k * 0.3), rPx * 0.16 * squash, 0, 0, Math.PI * 2);
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
};
