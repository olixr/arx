/**
 * THE BREATH SPEAKS — the charge and held-note matter dialects.
 *
 * THE DRAWN BREATH gave arts two commitment grammars: the casted
 * wind-up (run while it draws, plant to quicken it) and the held
 * channel (still, or silent). This registry gives each grammar its
 * MATTER voice, composed from the mastered library per THE ONE-VOICE
 * LAW — no dialect hand-mixes a material the library owns.
 *
 * The wire carries two fx kinds (additive, `messages.ts`):
 *  - `charge`: matter gathering on a winding caster. The server
 *    re-emits it at the LIVE position on an overlapping window (the
 *    tame re-emit law), so a running caster trails the gather; the
 *    wire's contracting `radius` IS the intensity ramp — the reach
 *    tightens exactly as the dodge window closes.
 *  - `note`: a held channel's sustained hum, re-emitted between
 *    pulse beats so long notes never gutter (THE GATE RETIRES: the
 *    library emitter is the one voice; nothing else wisps).
 *
 * Each emission window spawns its deployment ONCE (the renderer's
 * spawn-once flag); the deployment's own attack/sustain/release
 * carries the window, and the next re-emit overlaps the tail.
 *
 * CURATED VOICES: every shipped breath art speaks a hand-picked
 * dialect below, grammar first — the vigil's candle blooms, it does
 * not burn; the archer's note is wind at the feet, never lightning.
 * Unknown breath arts (future waves) fall back to a material derived
 * from their FX face's debris family, so a new casted art is never
 * voiceless while it waits for its curated entry.
 */
import type { DebrisKind, FxStyle } from './abilityFx.js';
import {
  blood,
  dust,
  fire,
  frost,
  radiance,
  shadow,
  smoke,
  storm,
  venom,
  water,
  type MatterCtx,
} from './matter/index.js';

type Voice = (c: MatterCtx, x: number, y: number, o: { radius: number }) => void;

interface BreathDialect {
  /** The winding gather — `radius` is the wire's contracting reach. */
  charge?: Voice;
  /** The held hum — one overlapping window per re-emit. */
  note?: Voice;
}

/** The curated table: one voice per shipped breath art. */
export const BREATH_DIALECTS: Record<string, BreathDialect> = {
  // ------------------------------------------- the casted gathers
  // Daybreak: dawn assembles around the caster — the halo brightens
  // and tightens as the reach contracts toward the fire.
  daybreak: {
    charge: (c, x, y, o) => {
      radiance.deployments.halo!(c, x, y, {
        radius: o.radius * 0.8,
        scale: 0.45 + (1.5 - o.radius) * 0.55,
        dur: 0.7,
      });
    },
  },
  // The Full Draw: planted strain — a low skirt of grit shivers off
  // the archer's stance and pulls close as the string comes back.
  full_draw: {
    charge: (c, x, y, o) => {
      dust.deployments.skirt!(c, x, y, {
        radius: Math.max(0.35, o.radius * 0.55),
        scale: 0.55,
        dur: 0.7,
      });
    },
  },
  // The Standing Stone: the old ground stirs — earth breathes up
  // around the caster while the kerb decides to rise.
  standing_stone: {
    charge: (c, x, y, o) => {
      dust.deployments.billow!(c, x, y, {
        radius: o.radius * 0.7,
        scale: 0.45 + (1.5 - o.radius) * 0.4,
        dur: 0.7,
      });
    },
  },

  // -------------- THE BREATH BETWEEN RUNGS — the onehand gathers
  // Ember Edge: fire climbs the edge as the cut is drawn — a small
  // true plume that leans hungrier as the reach tightens.
  ember_edge: {
    charge: (c, x, y, o) => {
      fire.deployments.plume!(c, x, y, {
        scale: 0.4 + (1.5 - o.radius) * 0.45,
        dur: 0.7,
      });
    },
  },
  // Levinstroke: the storm is INVITED — charge converges on the raised
  // blade, tightening exactly as the sky decides.
  levinstroke: {
    charge: (c, x, y, o) => {
      storm.deployments.charge!(c, x, y, {
        radius: o.radius,
        scale: 0.5 + (1.5 - o.radius) * 0.4,
        dur: 0.7,
      });
    },
  },
  // Cold Iron: rime climbs the held iron while the mark waits — the
  // bloom grows as the point drops toward the ground.
  cold_iron: {
    charge: (c, x, y, o) => {
      frost.deployments.bloom!(c, x, y, {
        radius: 0.5,
        scale: 0.4 + (1.5 - o.radius) * 0.45,
        dur: 0.7,
      });
    },
  },
  // First Light: thin shafts of dawn assemble on the planted stance —
  // the doorway is being found before it is opened.
  first_light: {
    charge: (c, x, y, o) => {
      radiance.deployments.shafts!(c, x, y, {
        radius: o.radius * 0.6,
        scale: 0.4 + (1.5 - o.radius) * 0.4,
        dur: 0.7,
      });
    },
  },
  // Gloomfall: the dark gathers ALONG the edge — a veil pulling close,
  // the light going out of the ring first.
  gloomfall: {
    charge: (c, x, y, o) => {
      shadow.deployments.veil!(c, x, y, {
        radius: o.radius * 0.7,
        scale: 0.45 + (1.5 - o.radius) * 0.4,
        dur: 0.8,
      });
    },
  },

  // ---------------- THE BREATH BETWEEN RUNGS — the arx gathers
  // Wickfire: the wick takes — a small true plume climbs the lit
  // hand, briefer and hungrier than Ember Edge's drawn cut.
  wickfire: {
    charge: (c, x, y, o) => {
      fire.deployments.plume!(c, x, y, {
        scale: 0.35 + (1.5 - o.radius) * 0.5,
        dur: 0.6,
      });
    },
  },
  // Windshear: the indraw — loose ground breathes UP around the
  // caster while the whole sky is being borrowed.
  windshear: {
    charge: (c, x, y, o) => {
      dust.deployments.billow!(c, x, y, {
        radius: o.radius * 0.8,
        scale: 0.4 + (1.5 - o.radius) * 0.45,
        dur: 0.7,
      });
    },
  },
  // Geyser: the deep is knocked on — an undertow turns beneath the
  // stance before anything shows above it.
  geyser: {
    charge: (c, x, y, o) => {
      water.deployments.undertow!(c, x, y, {
        radius: o.radius * 0.6,
        scale: 0.45 + (1.5 - o.radius) * 0.4,
        dur: 0.7,
      });
    },
  },
  // Hollowcall: the door is being opened — the dark's own doorway
  // grammar, small and patient, at the caller's hand.
  hollowcall: {
    charge: (c, x, y, o) => {
      shadow.deployments.door!(c, x, y, {
        radius: o.radius * 0.6,
        scale: 0.55 + (1.5 - o.radius) * 0.45,
        dur: 0.8,
      });
    },
  },
  // Moonrise: the silver gathers — a quiet bloom of kept light that
  // fills as the moon agrees to come early.
  moonrise: {
    charge: (c, x, y, o) => {
      radiance.deployments.bloom!(c, x, y, {
        scale: 0.35 + (1.5 - o.radius) * 0.45,
        dur: 0.8,
      });
    },
  },

  // -------------------------------------------- the held notes
  // Maelstrom: the sea churns underfoot for as long as the vortex
  // is held open.
  maelstrom: {
    note: (c, x, y, o) => {
      water.deployments.churn!(c, x, y, { radius: o.radius, scale: 0.7, dur: 1.2 });
    },
  },
  // Storm of Shafts: wind gusts at the planted feet — the sky's work
  // shows at the mark; the archer's note is weather, not lightning.
  storm_of_shafts: {
    note: (c, x, y, o) => {
      dust.deployments.kick!(c, x, y, { radius: o.radius, scale: 0.6, dur: 1.2 });
    },
  },
  // Whirling Ruin: the spin scours a wider ring than the body — a
  // standing skirt of torn ground.
  whirling_ruin: {
    note: (c, x, y, o) => {
      dust.deployments.skirt!(c, x, y, { radius: o.radius + 0.4, scale: 0.8, dur: 1.2 });
    },
  },
  // Winter's Fall: cold pools at the caster while the sky delivers —
  // true frost fog, sinking, patient.
  winters_fall: {
    note: (c, x, y, o) => {
      frost.deployments.fog!(c, x, y, { radius: o.radius, scale: 0.6, dur: 1.3 });
    },
  },
  // Red Thread: the drink — matter streams INTO the spinner on the
  // rim's inward flow for as long as the thread winds.
  red_thread: {
    note: (c, x, y, o) => {
      blood.deployments.drink!(c, x, y, { radius: o.radius + 0.3, scale: 0.8, dur: 1.2 });
    },
  },
  // Vigil: the candle blooms once per window — a quiet pulse of kept
  // light. It mends; it does not burn.
  vigil: {
    note: (c, x, y) => {
      radiance.deployments.bloom!(c, x, y, { scale: 0.35 });
    },
  },
  // Kept Ground: the warded ring hums with standing static — the
  // doorwarden's line, charged and held.
  kept_ground: {
    note: (c, x, y, o) => {
      storm.deployments.static!(c, x, y, { radius: o.radius, scale: 0.5, dur: 1.3 });
    },
  },

  // ---------------- THE BREATH BETWEEN RUNGS — the onehand notes
  // Millwork: the wheel grinds a tight ring of grist at the stance —
  // the blade's reach, torn and turning, for as long as it turns.
  millwork: {
    note: (c, x, y, o) => {
      dust.deployments.skirt!(c, x, y, { radius: o.radius, scale: 0.6, dur: 1.2 });
    },
  },
  // Red Ledger: the account drips — what the point takes runs off the
  // held blade, entry by entry. (Red Thread drinks INWARD; the ledger
  // spills what it has already counted.)
  red_ledger: {
    note: (c, x, y) => {
      blood.deployments.drip!(c, x, y, { scale: 0.6, dur: 1.1 });
    },
  },
  // Frostwork: the pattern claims ground — frost blooms outward from
  // the planted feet, ring by held ring.
  frostwork: {
    note: (c, x, y, o) => {
      frost.deployments.bloom!(c, x, y, { radius: o.radius, scale: 0.6, dur: 1.2 });
    },
  },
  // Live Iron: the circuit discharges around the singer — crackle
  // ticks patrolling the blade's reach while the note holds.
  live_iron: {
    note: (c, x, y, o) => {
      storm.deployments.crackle!(c, x, y, { radius: o.radius * 0.8, scale: 0.6, dur: 1.2 });
    },
  },
  // Noonfall: kept light stands on the singer — thin noon shafts,
  // patient, while the stake takes the hammer.
  noonfall: {
    note: (c, x, y, o) => {
      radiance.deployments.shafts!(c, x, y, { radius: o.radius * 0.7, scale: 0.5, dur: 1.2 });
    },
  },

  // ------------------ THE BREATH BETWEEN RUNGS — the arx notes
  // Rime River: the pour itself — a line of cold leaving the hand for
  // as long as the river is held. The one note that IS its shape.
  rime_river: {
    note: (c, x, y, o) => {
      frost.deployments.lance!(c, x, y, { radius: o.radius, scale: 0.55, dur: 1.2 });
    },
  },
  // Stonerise: the quarry works — the ground near the caller tears
  // and gouges while rows keep answering at the mark.
  stonerise: {
    note: (c, x, y, o) => {
      dust.deployments.gouge!(c, x, y, { radius: o.radius * 0.7, scale: 0.6, dur: 1.2 });
    },
  },
  // Anvil Sky: the cloud keeps charging between hammerfalls — the
  // singer stands inside the forge's own static.
  anvil_sky: {
    note: (c, x, y, o) => {
      storm.deployments.charge!(c, x, y, { radius: o.radius * 0.8, scale: 0.75, dur: 1.2 });
    },
  },
  // Burning Glass: the lens hums — a held halo of narrowed noon
  // standing on the singer while the line does its work.
  burning_glass: {
    note: (c, x, y, o) => {
      radiance.deployments.halo!(c, x, y, { radius: o.radius * 0.8, scale: 0.5, dur: 1.2 });
    },
  },
  // Cometfall: the far sky answers — faint star-fall drifts down
  // around the asker for as long as the asking holds.
  cometfall: {
    note: (c, x, y, o) => {
      radiance.deployments.rain!(c, x, y, { radius: o.radius * 0.8, scale: 0.5, dur: 1.3 });
    },
  },

  // ------------------- THE FOE'S BREATH (enemy arts): the bestiary's
  // wind-ups. Same curation law as the player gathers — every kit
  // entry that winds carries a hand-picked voice, and the voice tells
  // the ELEMENT of what is coming while the pip counts it down.
  // Firebolt: camp-fire climbs the caller's arm — a small true plume.
  goblin_firebolt: {
    charge: (c, x, y) => fire.deployments.plume!(c, x, y, { scale: 0.45, dur: 0.7 }),
  },
  // Cinder Ring: embers POOL at the writing hand before the mark.
  cinder_ring: {
    charge: (c, x, y) => fire.deployments.pool!(c, x, y, { radius: 0.55, scale: 0.5, dur: 0.7 }),
  },
  // Gloom Spittle: the bile rises — a sick green breath gathering.
  gloom_spittle: {
    charge: (c, x, y, o) =>
      venom.deployments.cloud!(c, x, y, { radius: o.radius * 0.5, scale: 0.45, dur: 0.7 }),
  },
  // Miasma Ring: the gloomcaller already DRIPS while the seed forms.
  miasma_ring: {
    charge: (c, x, y) => venom.deployments.drip!(c, x, y, { scale: 0.55, dur: 0.8 }),
  },
  // Bone Volley: dry rattle — bone-dust shivers off the drawn fistful.
  bone_volley: {
    charge: (c, x, y, o) =>
      dust.deployments.skirt!(c, x, y, { radius: o.radius * 0.5, scale: 0.4, dur: 0.7 }),
  },
  // Rattling Volley: same dry family, a lighter shiver.
  rattling_volley: {
    charge: (c, x, y, o) =>
      dust.deployments.skirt!(c, x, y, { radius: o.radius * 0.45, scale: 0.35, dur: 0.7 }),
  },
  // Grave Mist: the tomb-cold leaks EARLY — fog before the field.
  grave_mist: {
    charge: (c, x, y, o) =>
      frost.deployments.fog!(c, x, y, { radius: o.radius * 0.6, scale: 0.5, dur: 0.8 }),
  },
  // Marrow Chill: rime blooms up the planted blade.
  marrow_chill: {
    charge: (c, x, y) => frost.deployments.bloom!(c, x, y, { radius: 0.6, scale: 0.5, dur: 0.7 }),
  },
  // Raise the Fallen: the dark reaches up before the rift tears.
  raise_the_fallen: {
    charge: (c, x, y) => shadow.deployments.tendrils!(c, x, y, { scale: 0.55, dur: 0.9 }),
  },
  // Web Snare: the spinner braces — legs scuffing, silk drawn taut
  // (dust is the honest gather; the silk itself is the signature's).
  web_snare: {
    charge: (c, x, y, o) =>
      dust.deployments.skirt!(c, x, y, { radius: o.radius * 0.45, scale: 0.35, dur: 0.7 }),
  },
  // Reaping Sweep: the set feet GRIND — grit shivers off the stance.
  reaping_sweep: {
    charge: (c, x, y, o) =>
      dust.deployments.skirt!(c, x, y, { radius: o.radius * 0.5, scale: 0.45, dur: 0.7 }),
  },
  // Gnawed Mending: the troll hunkers and the earth stirs around it.
  gnawed_mending: {
    charge: (c, x, y) => dust.deployments.billow!(c, x, y, { radius: 0.6, scale: 0.4, dur: 0.9 }),
  },
  // Rending Lunge: haunches dig in — dirt kicks before the launch.
  rending_lunge: {
    charge: (c, x, y) => dust.deployments.kick!(c, x, y, { scale: 0.45, dur: 0.6 }),
  },
  // THE TIDE'S RAMPART (the giant crab) — the sea announces both.
  // Breakwater Grip: the great claw hangs open and the tide churns
  // around the planted stilts — the harbor drawing breath.
  breakwater_grip: {
    charge: (c, x, y, o) =>
      water.deployments.churn!(c, x, y, { radius: o.radius * 0.5, scale: 0.55, dur: 0.9 }),
  },
  // Brine Jet: the water draws IN before it is thrown — an undertow
  // pulling at the bank around the folding mouthparts.
  brine_jet: {
    charge: (c, x, y, o) =>
      water.deployments.undertow!(c, x, y, { radius: o.radius * 0.45, scale: 0.5, dur: 0.7 }),
  },
  // THE BROTHERHOOD (the wolf crown) — three breaths, one sentence.
  // Hamstring Bite: he drops LOW — a skirt of grit shivers out under
  // the crouch before the cut.
  hamstring_bite: {
    charge: (c, x, y) => dust.deployments.skirt!(c, x, y, { scale: 0.4, dur: 0.5 }),
  },
  // Call the Brotherhood: he sets his feet on ground he trusts and
  // the dusk gathers — the call is coming, and so are they.
  call_the_brotherhood: {
    charge: (c, x, y) => shadow.deployments.bloom!(c, x, y, { scale: 0.5, dur: 0.8 }),
  },
  // Throat Lunge: the haunches coil for the flat return — dirt kicks
  // harder than any first strike; he is coming back THROUGH you.
  throat_lunge: {
    charge: (c, x, y) => dust.deployments.kick!(c, x, y, { scale: 0.55, dur: 0.55 }),
  },
  // Shrilling Dart: dusk gathers on the folded wings.
  shrilling_dart: {
    charge: (c, x, y) => shadow.deployments.bloom!(c, x, y, { scale: 0.35, dur: 0.6 }),
  },
  // Ground Slam (the digmaster's wound reissue): the pick goes UP and
  // the ground already trembles.
  ground_slam: {
    charge: (c, x, y) => dust.deployments.billow!(c, x, y, { radius: 0.7, scale: 0.45, dur: 0.7 }),
  },

  // ------------------- THE EARTH STANDS UP (golem arts): a construct's
  // wind is its material waking up. Rock grinds, iron sparks, fire
  // breathes IN, ice fogs at the feet — the element is legible before
  // the pip half-fills.
  // Hillstone Throw: the shoulder gives — grit gouges off the torn seam.
  hillstone_throw: {
    charge: (c, x, y, o) =>
      dust.deployments.gouge!(c, x, y, { radius: o.radius * 0.55, scale: 0.55, dur: 0.8 }),
  },
  // Quarry Ring: the whole yard trembles UNDER the golem first.
  quarry_ring: {
    charge: (c, x, y, o) =>
      dust.deployments.billow!(c, x, y, { radius: o.radius * 0.75, scale: 0.55, dur: 0.7 }),
  },
  // Anvil Fall: the long lift — grit rains off the rising fists while
  // the stance grinds deeper.
  anvil_fall: {
    charge: (c, x, y, o) =>
      dust.deployments.skirt!(c, x, y, { radius: o.radius * 0.6, scale: 0.6, dur: 0.9 }),
  },
  // Drawn Bolt: the joints hiss — sparks crackle at the leaning shoulder.
  drawn_bolt: {
    charge: (c, x, y) => storm.deployments.crackle!(c, x, y, { radius: 0.5, scale: 0.4, dur: 0.6 }),
  },
  // Slag Gobbet: the fist melts — gobbets gather dripping at the hand.
  slag_gobbet: {
    charge: (c, x, y) => fire.deployments.gobbets!(c, x, y, { scale: 0.4, dur: 0.7 }),
  },
  // Vent Ring: the furnace draws breath — the plume leans INTO the seams.
  vent_ring: {
    charge: (c, x, y) => fire.deployments.plume!(c, x, y, { scale: 0.55, dur: 0.8 }),
  },
  // Crust Burst: the shell overfills — the pool of light spreads under
  // the crust with nowhere left to go.
  crust_burst: {
    charge: (c, x, y, o) =>
      fire.deployments.pool!(c, x, y, { radius: o.radius * 0.6, scale: 0.6, dur: 0.9 }),
  },
  // Calving Volley: the shoulder rimes over before it shears.
  calving_volley: {
    charge: (c, x, y) => frost.deployments.bloom!(c, x, y, { radius: 0.55, scale: 0.5, dur: 0.7 }),
  },
  // Winter's Floor: cold pools at the feet — fog before the pane.
  winters_floor: {
    charge: (c, x, y, o) =>
      frost.deployments.fog!(c, x, y, { radius: o.radius * 0.65, scale: 0.55, dur: 0.8 }),
  },

  // ------------------- THE HILL COMES DOWN (ogre arts): a giant's
  // wind is WEIGHT SHIFTING — the stance is the tell. The feet dig,
  // the ground admits it, and only the meal bleeds instead.
  // Skull Toll: the club goes up, the stance goes DOWN — both heels
  // kick grit as the whole hill leans into the lift.
  skull_toll: {
    charge: (c, x, y, o) =>
      dust.deployments.kick!(c, x, y, { radius: o.radius * 0.6, scale: 0.65, dur: 0.8 }),
  },
  // Tantrum: the drumming starts before the aim does — the ground
  // takes the first blows and everything near it learns.
  ogre_tantrum: {
    charge: (c, x, y, o) =>
      dust.deployments.slam!(c, x, y, { radius: o.radius * 0.5, scale: 0.6, dur: 0.6 }),
  },
  // Millstone Toss: the wheel comes UP through its own settled dust —
  // a hundredweight leaving the ground announces itself.
  millstone_toss: {
    charge: (c, x, y, o) =>
      dust.deployments.billow!(c, x, y, { radius: o.radius * 0.7, scale: 0.6, dur: 0.9 }),
  },
  // Gravel Rake: the hand DRAGS the road — a gouge you can hear.
  gravel_rake: {
    charge: (c, x, y, o) =>
      dust.deployments.gouge!(c, x, y, { radius: o.radius * 0.5, scale: 0.5, dur: 0.7 }),
  },
  // Hill Bellow: the gut fills like a bellows — the breath fogs, the
  // chest swells, and the valley braces.
  hill_bellow: {
    charge: (c, x, y, o) =>
      smoke.deployments.billow!(c, x, y, { radius: o.radius * 0.6, scale: 0.55, dur: 0.9 }),
  },
  // Shaken Stones: the chant stamps — the ground shivers where the
  // verse will land its stones.
  shaken_stones: {
    charge: (c, x, y, o) =>
      dust.deployments.skirt!(c, x, y, { radius: o.radius * 0.7, scale: 0.5, dur: 0.7 }),
  },
  // Haunch Gnaw: supper, loudly — the juice runs while the great jaw
  // works, and the wound forgets itself.
  haunch_gnaw: {
    charge: (c, x, y) => blood.deployments.drip!(c, x, y, { scale: 0.55, dur: 0.9 }),
  },
};

/**
 * The face-derived fallback: an unknown breath art borrows the idle
 * voice of its debris family's material, at a modest scale. One verb
 * per material, chosen once — the fallback never surprises.
 */
const FALLBACK: Record<DebrisKind, Voice> = {
  ember: (c, x, y) => fire.deployments.plume!(c, x, y, { scale: 0.4, dur: 0.8 }),
  ice: (c, x, y, o) => frost.deployments.fog!(c, x, y, { radius: o.radius, scale: 0.5, dur: 1.0 }),
  spark: (c, x, y, o) =>
    storm.deployments.crackle!(c, x, y, { radius: o.radius * 0.6, scale: 0.5, dur: 0.9 }),
  star: (c, x, y, o) =>
    radiance.deployments.halo!(c, x, y, { radius: o.radius * 0.8, scale: 0.5, dur: 0.9 }),
  shadow: (c, x, y, o) =>
    shadow.deployments.veil!(c, x, y, { radius: o.radius * 0.7, scale: 0.5, dur: 1.0 }),
  blood: (c, x, y) => blood.deployments.drip!(c, x, y, { scale: 0.5, dur: 1.0 }),
  leaf: (c, x, y, o) =>
    venom.deployments.cloud!(c, x, y, { radius: o.radius * 0.6, scale: 0.4, dur: 1.0 }),
  rock: (c, x, y, o) =>
    dust.deployments.skirt!(c, x, y, { radius: o.radius * 0.6, scale: 0.5, dur: 0.9 }),
  bone: (c, x, y, o) =>
    dust.deployments.skirt!(c, x, y, { radius: o.radius * 0.5, scale: 0.4, dur: 0.9 }),
};

/** One door for the renderer: resolve the dialect and speak it. */
export function speakBreath(
  kind: 'charge' | 'note',
  id: string | undefined,
  st: FxStyle,
  c: MatterCtx,
  x: number,
  y: number,
  radius: number,
): void {
  const voice = (id ? BREATH_DIALECTS[id]?.[kind] : undefined) ?? FALLBACK[st.debris];
  voice(c, x, y, { radius });
}
